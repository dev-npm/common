"""Main agent runtime.

This is the heart of the backend.
It performs the same kind of loop that agent frameworks like ADK perform internally:

1. load prompt and tools
2. ask the model what to do next
3. if model requests a tool, execute it
4. feed the tool result back to the model
5. return final answer
"""

from __future__ import annotations

import json
import uuid

from app.llm.providers import LLMProvider
from app.models.chat import ChatRequest, ChatResponse, ToolCallTrace
from app.models.config import SkillConfig, ToolSpec
from app.registry.in_memory import InMemoryRegistry
from app.runtime.mcp_client_manager import MCPClientManager
from app.security.user_context import UserContext


class AgentRuntime:
    def __init__(
        self,
        registry: InMemoryRegistry,
        mcp_client_manager: MCPClientManager,
        llm_provider: LLMProvider,
        max_tool_iterations: int,
    ) -> None:
        self._registry = registry
        self._mcp_client_manager = mcp_client_manager
        self._llm_provider = llm_provider
        self._max_tool_iterations = max_tool_iterations

    async def run(self, request: ChatRequest, user: UserContext) -> ChatResponse:
        """Run a single chat turn.

        This method is where all the layers connect:
        chat request -> agent config -> tool discovery -> LLM -> MCP -> final answer.
        """
        agent = self._registry.get_agent(request.agent_name)
        if not user.has_any_role(agent.allowed_roles):
            raise PermissionError(f"User `{user.user_id}` is not allowed to use agent `{agent.name}`.")

        prompt = self._registry.get_active_prompt(agent.id)
        allowed_skills = self._registry.get_allowed_skills(agent.name, user)
        tool_specs = await self._build_tool_specs(allowed_skills)

        session_id = request.session_id or str(uuid.uuid4())
        tool_traces: list[ToolCallTrace] = []

        # Messages are what the model sees as conversation history.
        messages: list[dict] = [
            {"role": "system", "content": prompt.prompt_text},
            {"role": "user", "content": request.message},
        ]

        for _ in range(self._max_tool_iterations):
            llm_result = await self._llm_provider.get_response(messages=messages, tools=tool_specs)

            # Case 1: the model has enough information and answers directly.
            if not llm_result.tool_calls:
                return ChatResponse(
                    session_id=session_id,
                    agent_name=agent.name,
                    answer=llm_result.content or "",
                    tool_calls=tool_traces,
                )

            # Case 2: the model requests one or more tools.
            for requested_tool in llm_result.tool_calls:
                skill = self._registry.get_skill_for_agent(agent.name, requested_tool.name)
                if not user.has_any_role(skill.allowed_roles):
                    raise PermissionError(
                        f"User `{user.user_id}` is not allowed to use tool `{requested_tool.name}`."
                    )

                tool_result = await self._mcp_client_manager.call_tool(
                    skill=skill,
                    arguments=requested_tool.arguments,
                )

                tool_traces.append(
                    ToolCallTrace(
                        tool_name=requested_tool.name,
                        arguments=requested_tool.arguments,
                        result=tool_result,
                    )
                )

                # Feed the tool result back into the conversation so the model can produce a final answer.
                messages.append(
                    {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": f"call_{len(tool_traces)}",
                                "type": "function",
                                "function": {
                                    "name": requested_tool.name,
                                    "arguments": json.dumps(requested_tool.arguments),
                                },
                            }
                        ],
                    }
                )
                messages.append(
                    {
                        "role": "tool",
                        "name": requested_tool.name,
                        "tool_call_id": f"call_{len(tool_traces)}",
                        "content": json.dumps(tool_result),
                    }
                )

        raise ValueError("Maximum tool-call iterations reached before the model produced a final answer.")

    async def _build_tool_specs(self, skills: list[SkillConfig]) -> list[ToolSpec]:
        """Discover the JSON schema of each allowed tool from its MCP server."""
        specs: list[ToolSpec] = []
        for skill in skills:
            specs.append(await self._mcp_client_manager.get_tool_spec(skill))
        return specs
