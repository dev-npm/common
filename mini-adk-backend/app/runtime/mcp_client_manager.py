"""MCP client manager.

This class is responsible for talking to MCP servers.
It does not make product decisions. It only:
- opens a connection
- lists tools
- calls a tool
- normalizes the result
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from app.models.config import SkillConfig, ToolSpec
from app.registry.in_memory import InMemoryRegistry


class MCPClientManager:
    def __init__(self, registry: InMemoryRegistry) -> None:
        self._registry = registry

    async def get_tool_spec(self, skill: SkillConfig) -> ToolSpec:
        """Ask the MCP server for the selected tool's JSON schema."""
        async with self._session(skill) as session:
            tools_result = await session.list_tools()
            for tool in tools_result.tools:
                if tool.name == skill.tool_name:
                    input_schema = getattr(tool, "inputSchema", None) or getattr(tool, "input_schema", None)
                    return ToolSpec(
                        name=tool.name,
                        description=tool.description or skill.description,
                        input_schema=input_schema or {"type": "object", "properties": {}},
                    )
        raise ValueError(f"MCP tool `{skill.tool_name}` was not found on server `{skill.mcp_server_name}`.")

    async def call_tool(self, skill: SkillConfig, arguments: dict[str, Any]) -> dict[str, Any]:
        """Execute one tool on one MCP server."""
        async with self._session(skill) as session:
            result = await session.call_tool(skill.tool_name, arguments=arguments)
            return self._normalize_tool_result(result)

    @asynccontextmanager
    async def _session(self, skill: SkillConfig) -> AsyncIterator[Any]:
        """Open a short-lived MCP session.

        For a starter project, per-call sessions keep the code simple.
        Later you can pool or cache long-lived sessions.
        """
        server = self._registry.get_mcp_server(skill.mcp_server_name)

        if server.transport != "stdio":
            raise ValueError(f"Only stdio transport is implemented in this starter. Got `{server.transport}`.")

        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client

        params = StdioServerParameters(
            command=server.command or "python",
            args=server.args,
            env=server.env or None,
        )

        async with stdio_client(params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                yield session

    def _normalize_tool_result(self, result: Any) -> dict[str, Any]:
        """Convert MCP response content into a plain Python dictionary.

        MCP tool results often come back as content blocks.
        This method simplifies them for the rest of the app.
        """
        if hasattr(result, "content"):
            content = result.content
            if isinstance(content, list):
                texts: list[str] = []
                for item in content:
                    text_value = getattr(item, "text", None)
                    if text_value is not None:
                        texts.append(text_value)
                if len(texts) == 1:
                    import json

                    try:
                        return json.loads(texts[0])
                    except json.JSONDecodeError:
                        return {"text": texts[0]}
                return {"content": texts}
        if isinstance(result, dict):
            return result
        return {"raw": str(result)}
