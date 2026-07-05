"""Chat API endpoint.

The Angular UI will call POST /api/chat with the selected agent and the user message.
This file does very little business logic itself. It delegates all work to AgentRuntime.
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.settings import Settings, get_settings
from app.llm.providers import build_llm_provider
from app.models.chat import ChatRequest, ChatResponse
from app.registry.in_memory import InMemoryRegistry
from app.runtime.agent_runtime import AgentRuntime
from app.runtime.mcp_client_manager import MCPClientManager
from app.security.user_context import UserContext, get_user_context

router = APIRouter(tags=["chat"])


def get_registry(request: Request) -> InMemoryRegistry:
    """Create the registry once and reuse it for future requests.

    Today this is an in-memory config store.
    Later you can replace it with a DB-backed registry.
    """
    if not hasattr(request.app.state, "registry"):
        request.app.state.registry = InMemoryRegistry()
    return request.app.state.registry


def get_runtime(request: Request, registry: InMemoryRegistry = Depends(get_registry)) -> AgentRuntime:
    """Build the agent runtime lazily on first request.

    This pattern keeps the startup simple for a learning project.
    In larger apps you may move this to startup/lifespan hooks.
    """
    if not hasattr(request.app.state, "agent_runtime"):
        settings: Settings = get_settings()
        request.app.state.agent_runtime = AgentRuntime(
            registry=registry,
            mcp_client_manager=MCPClientManager(registry=registry),
            llm_provider=build_llm_provider(settings),
            max_tool_iterations=settings.max_tool_iterations,
        )
    return request.app.state.agent_runtime


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    user: UserContext = Depends(get_user_context),
    runtime: AgentRuntime = Depends(get_runtime),
) -> ChatResponse:
    """Main chat endpoint called by the UI.

    Flow:
    1. UI sends message + selected agent.
    2. FastAPI builds UserContext from headers.
    3. AgentRuntime loads prompt/tools and runs the LLM loop.
    4. Final answer is returned to the UI.
    """
    try:
        return await runtime.run(request=payload, user=user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
