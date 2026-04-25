# HiMarket API Contracts

## Agent Workspace API

`agent-workspace.yaml` is the OpenAPI 3.1 single source of truth for the Agent Workspace product. Backend controllers and frontend generated types should consume this file instead of duplicating request or response shapes.

Validate the contract from the `himarket` repository root:

```bash
npx -y @apidevtools/swagger-cli@4 validate docs/api/agent-workspace.yaml
```

Regenerate TypeScript types for frontend consumers:

```bash
npx -y openapi-typescript docs/api/agent-workspace.yaml -o himarket-web/himarket-frontend/src/types/agent-workspace.ts
```

Endpoint groups:

- Workspaces: create, list, update, delete, fetch, and activate the current user's Agent Workspace.
- Rooms: create, list, update, delete, and fetch rooms scoped to a workspace.
- Room Config: read and update a room's model, team template, bindings, and permissions.
- Bindings: list active room bindings, bind Skill/MCP/Model products, and delete bindings.
- Tasks: start async chat/task runs, list summaries, fetch full runs, and stream task events over SSE.
- Team Templates: list available team templates and fetch full manager and worker profile references.
