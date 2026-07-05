# Mini ADK: FastAPI + MCP + Angular Chat UI

This project is a small custom Python agent framework inspired by Google ADK, but built from scratch with FastAPI and the MCP Python SDK.

It gives you:
- FastAPI backend
- Dynamic agent dropdown support
- Dynamic prompts and skills
- MCP tool discovery and execution
- Mock LLM provider for learning and local testing
- Angular standalone chat UI that calls the backend

## Architecture

```text
Angular Chat UI
      |
      v
GET /api/agents  -> fills dropdown
POST /api/chat   -> sends message + selected agent
      |
      v
FastAPI AI Gateway
      |
      v
Agent Runtime
      |
      +--> Prompt Registry
      +--> Skill Registry
      +--> Permission Check
      +--> MCP Client Manager
               |
               +--> Demo MCP Server / future Jira MCP server
```

## Run backend

```bash
cd /workspace
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload --port 8000
```

## Test backend

Get agents:

```bash
curl http://localhost:8000/api/agents \
  -H "X-User-Id: saif" \
  -H "X-Roles: Viewer"
```

Send chat:

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-User-Id: saif" \
  -H "X-Roles: Viewer" \
  -d '{"agent_name":"jira_assistant","message":"Get recent Jira linked items for DE-123"}'
```

## Run Angular UI

```bash
cd /workspace/frontend
npm install
npm start
```

Angular will run on port 4200 and call the FastAPI backend on port 8000.
