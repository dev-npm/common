"""Request and response models for the chat API."""

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    # The UI sends the selected agent and user question in this shape.
    agent_name: str = Field(default="jira_assistant")
    message: str
    session_id: str | None = None


class ToolCallTrace(BaseModel):
    # Helpful for debugging. The UI can show which tool was used.
    tool_name: str
    arguments: dict
    result: dict


class ChatResponse(BaseModel):
    session_id: str
    agent_name: str
    answer: str
    tool_calls: list[ToolCallTrace] = Field(default_factory=list)


class AgentListItem(BaseModel):
    # Used by GET /api/agents to fill the Angular dropdown.
    name: str
    display_name: str
    description: str
