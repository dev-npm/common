"""In-memory registry.

This file acts like a fake database so the learning flow stays simple.
Later you can replace the hard-coded dictionaries with PostgreSQL queries.
"""

from app.models.chat import AgentListItem
from app.models.config import AgentConfig, MCPServerConfig, PromptConfig, SkillConfig
from app.security.user_context import UserContext


class InMemoryRegistry:
    """Starter registry. Replace with PostgreSQL later without changing runtime code."""

    def __init__(self) -> None:
        # Which agents exist in the system.
        self._agents = {
            "jira_assistant": AgentConfig(
                id=1,
                name="jira_assistant",
                display_name="Jira Assistant",
                description="Ask Jira-related questions and use Jira-style tools.",
                allowed_roles={"Viewer", "Admin", "Planner"},
            ),
            "db_assistant": AgentConfig(
                id=2,
                name="db_assistant",
                display_name="DB Assistant",
                description="Ask database questions and use simple DB-style demo tools.",
                allowed_roles={"Admin", "Writer"},
            ),
        }

        # Each agent has an active prompt.
        self._prompts = {
            1: PromptConfig(
                id=1,
                agent_id=1,
                prompt_text=(
                    "You are an internal Jira assistant. Use tools only when needed. "
                    "If tool output is present, summarize it clearly for the user."
                ),
            ),
            2: PromptConfig(
                id=2,
                agent_id=2,
                prompt_text=(
                    "You are an internal database assistant. Use tools only when needed. "
                    "Explain results in a concise and structured way."
                ),
            ),
        }

        # MCP server config tells the client manager how to start or connect to the server.
        self._mcp_servers = {
            "demo_tools": MCPServerConfig(
                id=1,
                name="demo_tools",
                transport="stdio",
                command="python",
                args=["-m", "mcp_servers.demo_server"],
            )
        }

        # Skills map an agent to a concrete MCP tool.
        self._skills = [
            SkillConfig(
                id=1,
                agent_name="jira_assistant",
                name="get_recent_jira_linked_items",
                description="Get recently updated linked Jira items and comments for an issue key.",
                mcp_server_name="demo_tools",
                tool_name="get_recent_jira_linked_items",
                allowed_roles={"Viewer", "Admin", "Planner"},
            ),
            SkillConfig(
                id=2,
                agent_name="jira_assistant",
                name="demo_echo",
                description="Echo text back to the caller.",
                mcp_server_name="demo_tools",
                tool_name="demo_echo",
                allowed_roles={"Viewer", "Admin", "Planner"},
            ),
            SkillConfig(
                id=3,
                agent_name="db_assistant",
                name="demo_add",
                description="Add two integers.",
                mcp_server_name="demo_tools",
                tool_name="demo_add",
                allowed_roles={"Admin", "Writer"},
            ),
        ]

    def get_agent(self, agent_name: str) -> AgentConfig:
        agent = self._agents.get(agent_name)
        if not agent or not agent.is_active:
            raise ValueError(f"Agent `{agent_name}` was not found or is inactive.")
        return agent

    def get_active_prompt(self, agent_id: int) -> PromptConfig:
        prompt = self._prompts.get(agent_id)
        if not prompt or not prompt.is_active:
            raise ValueError(f"No active prompt found for agent_id={agent_id}.")
        return prompt

    def get_mcp_server(self, server_name: str) -> MCPServerConfig:
        server = self._mcp_servers.get(server_name)
        if not server or not server.is_active:
            raise ValueError(f"MCP server `{server_name}` was not found or is inactive.")
        return server

    def list_agents_for_user(self, user: UserContext) -> list[AgentListItem]:
        visible_agents: list[AgentListItem] = []
        for agent in self._agents.values():
            if not agent.is_active:
                continue
            if user.has_any_role(agent.allowed_roles):
                visible_agents.append(
                    AgentListItem(
                        name=agent.name,
                        display_name=agent.display_name,
                        description=agent.description,
                    )
                )
        return visible_agents

    def get_allowed_skills(self, agent_name: str, user: UserContext) -> list[SkillConfig]:
        # Only return tools that are both assigned to this agent and allowed for the current user.
        return [
            skill
            for skill in self._skills
            if skill.agent_name == agent_name and skill.is_active and user.has_any_role(skill.allowed_roles)
        ]

    def get_skill_for_agent(self, agent_name: str, tool_name: str) -> SkillConfig:
        for skill in self._skills:
            if skill.agent_name == agent_name and skill.tool_name == tool_name and skill.is_active:
                return skill
        raise ValueError(f"Tool `{tool_name}` is not configured for agent `{agent_name}`.")
