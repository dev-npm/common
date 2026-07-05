"""LLM provider abstraction.

Why this file exists:
- AgentRuntime should not care whether the model is mock, OpenAI, Azure OpenAI, etc.
- It only asks for the next model response.
"""

from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from openai import AsyncOpenAI

from app.core.settings import Settings
from app.models.config import ToolSpec


@dataclass
class LLMToolCall:
    name: str
    arguments: dict[str, Any]


@dataclass
class LLMResult:
    content: str | None = None
    tool_calls: list[LLMToolCall] = field(default_factory=list)


class LLMProvider(ABC):
    @abstractmethod
    async def get_response(self, messages: list[dict], tools: list[ToolSpec]) -> LLMResult:
        raise NotImplementedError


class MockLLMProvider(LLMProvider):
    """A deterministic provider for learning and local testing.

    It uses very simple rules:
    - If the user message looks like Jira linked-items request, it asks for the Jira tool.
    - If the user message asks to add numbers, it asks for demo_add.
    - If a tool result already exists in messages, it turns that into a human-readable answer.
    """

    async def get_response(self, messages: list[dict], tools: list[ToolSpec]) -> LLMResult:
        # If there is already a tool message, create a final answer from that data.
        for message in reversed(messages):
            if message["role"] == "tool":
                tool_name = message.get("name", "tool")
                try:
                    payload = json.loads(message["content"])
                except json.JSONDecodeError:
                    payload = {"raw": message["content"]}
                return LLMResult(content=self._summarize_tool_result(tool_name, payload))

        # Otherwise inspect the latest user message.
        user_message = next(m["content"] for m in reversed(messages) if m["role"] == "user")
        lower = user_message.lower()
        available_names = {tool.name for tool in tools}

        if "recent jira linked items" in lower or ("jira" in lower and "linked" in lower):
            if "get_recent_jira_linked_items" in available_names:
                issue_key_match = re.search(r"([A-Z]{2,10}-\d+)", user_message)
                issue_key = issue_key_match.group(1) if issue_key_match else "DE-123"
                return LLMResult(
                    tool_calls=[LLMToolCall(name="get_recent_jira_linked_items", arguments={"issue_key": issue_key})]
                )

        if "add" in lower and "demo_add" in available_names:
            numbers = [int(value) for value in re.findall(r"\d+", user_message)]
            if len(numbers) >= 2:
                return LLMResult(tool_calls=[LLMToolCall(name="demo_add", arguments={"a": numbers[0], "b": numbers[1]})])

        if "echo" in lower and "demo_echo" in available_names:
            return LLMResult(tool_calls=[LLMToolCall(name="demo_echo", arguments={"text": user_message})])

        return LLMResult(
            content=(
                "Mock provider response: I did not need a tool for this message. "
                "Try asking for recent Jira linked items for DE-123."
            )
        )

    def _summarize_tool_result(self, tool_name: str, payload: dict[str, Any]) -> str:
        if tool_name == "get_recent_jira_linked_items":
            issue_key = payload.get("issue_key", "unknown issue")
            linked_items = payload.get("linked_items", [])
            if not linked_items:
                return f"No recent linked items were found for {issue_key}."

            lines = [f"{issue_key} has {len(linked_items)} recent linked item(s):"]
            for item in linked_items:
                lines.append(
                    f"- {item['key']} ({item['relationship']}), status {item['status']}, updated {item['updated']}"
                )
            return "\n".join(lines)

        if tool_name == "demo_add":
            return f"The sum is {payload.get('sum')}."

        if tool_name == "demo_echo":
            return f"Echo result: {payload.get('echo', '')}"

        return json.dumps(payload)


class OpenAICompatibleProvider(LLMProvider):
    """Real model provider using the OpenAI Python SDK.

    This starter uses the Responses API style through chat completions tool-calling semantics.
    For learning, keep llm_provider=mock until the rest of the system is understood.
    """

    def __init__(self, api_key: str, model: str) -> None:
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def get_response(self, messages: list[dict], tools: list[ToolSpec]) -> LLMResult:
        openai_tools = [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.input_schema,
                },
            }
            for tool in tools
        ]

        response = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            tools=openai_tools or None,
            tool_choice="auto" if openai_tools else None,
        )

        message = response.choices[0].message
        if message.tool_calls:
            tool_calls = []
            for tool_call in message.tool_calls:
                arguments = json.loads(tool_call.function.arguments or "{}")
                tool_calls.append(LLMToolCall(name=tool_call.function.name, arguments=arguments))
            return LLMResult(tool_calls=tool_calls)

        return LLMResult(content=message.content or "")


def build_llm_provider(settings: Settings) -> LLMProvider:
    """Factory that decides which provider implementation to use."""
    if settings.llm_provider == "openai":
        if not settings.openai_api_key:
            raise ValueError("MINI_ADK_OPENAI_API_KEY is required when llm_provider=openai")
        return OpenAICompatibleProvider(api_key=settings.openai_api_key, model=settings.openai_model)
    return MockLLMProvider()
