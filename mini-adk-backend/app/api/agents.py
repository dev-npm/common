"""Agent listing endpoint.

The Angular dropdown calls GET /api/agents to know which assistants are available.
"""

from fastapi import APIRouter, Depends, Request

from app.api.chat import get_registry
from app.models.chat import AgentListItem
from app.registry.in_memory import InMemoryRegistry
from app.security.user_context import UserContext, get_user_context

router = APIRouter(tags=["agents"])


@router.get("/agents", response_model=list[AgentListItem])
async def list_agents(
    request: Request,
    user: UserContext = Depends(get_user_context),
    registry: InMemoryRegistry = Depends(get_registry),
) -> list[AgentListItem]:
    """Return only the agents visible to the current user.

    The backend remains the source of truth. Even if the UI hides agents,
    the backend still controls access.
    """
    return registry.list_agents_for_user(user)
