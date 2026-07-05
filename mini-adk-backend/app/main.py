"""FastAPI application entry point.

This file wires the whole backend together.
Think of it as the front door of the Python application.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.agents import router as agents_router
from app.api.chat import router as chat_router


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Mini ADK FastAPI MCP",
        version="0.3.0",
        description=(
            "Custom ADK-like agent runtime with dynamic prompts, skills, "
            "permissions, and MCP tools."
        ),
    )

    # Allow the Angular dev server to call the backend during local development.
    # In production, lock this down to your real frontend domain.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:4200",
            "http://127.0.0.1:4200",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health() -> dict[str, str]:
        """Simple health endpoint for load balancers and quick checks."""
        return {"status": "ok"}

    # Group all API routes under /api.
    app.include_router(agents_router, prefix="/api")
    app.include_router(chat_router, prefix="/api")
    return app


app = create_app()
