"""Demo MCP server.

This is a separate process that exposes tools over MCP.
Your FastAPI backend does not import these functions directly.
It starts this process and talks to it via the MCP protocol.
"""

import json

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Demo Internal MCP Tools")


@mcp.tool()
def demo_echo(text: str) -> str:
    """Echo text back to the caller."""
    return json.dumps({"echo": text})


@mcp.tool()
def demo_add(a: int, b: int) -> str:
    """Add two integers."""
    return json.dumps({"a": a, "b": b, "sum": a + b})


@mcp.tool()
def get_recent_jira_linked_items(issue_key: str, hours: int = 72) -> str:
    """Get recently updated linked Jira items and comments for an issue key.

    This is fake demo data for learning.
    Later you can replace this body with real Jira REST calls.
    """
    return json.dumps(
        {
            "issue_key": issue_key,
            "window_hours": hours,
            "linked_items": [
                {
                    "key": "DE-456",
                    "relationship": "blocks",
                    "status": "In Progress",
                    "updated": "2026-07-05T09:30:00-07:00",
                    "recent_comments": [
                        "API contract reviewed.",
                        "Waiting on DB permission confirmation.",
                    ],
                },
                {
                    "key": "DE-789",
                    "relationship": "relates to",
                    "status": "Done",
                    "updated": "2026-07-04T16:10:00-07:00",
                    "recent_comments": [
                        "Testing completed.",
                        "Deployment notes added.",
                    ],
                },
            ],
        }
    )


if __name__ == "__main__":
    mcp.run()
