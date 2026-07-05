"""Configuration models used by the registry and runtime."""

from pydantic import BaseModel, Field


class AgentConfig(BaseModel):
    id: int
    name: str
    display_name: str
    description: str
    allowed_roles: set[str] = Field(default_factory=set)
    is_active: bool = True


class PromptConfig(BaseModel):
    id: int
    agent_id: int
    prompt_text: str
    is_active: bool = True


class MCPServerConfig(BaseModel):
    id: int
    name: str
    transport: str  # stdio for local process, streamable_http for remote server.
    command: str | None = None
    args: list[str] = Field(default_factory=list)
    endpoint_url: str | None = None
    env: dict[str, str] = Field(default_factory=dict)
    is_active: bool = True


class SkillConfig(BaseModel):
    id: int
    agent_name: str
    name: str
    description: str
    mcp_server_name: str
    tool_name: str
    allowed_roles: set[str] = Field(default_factory=set)
    is_active: bool = True


class ToolSpec(BaseModel):
    # This is the simplified shape the LLM provider uses for tool-calling.
    name: str
    description: str
    input_schema: dict
