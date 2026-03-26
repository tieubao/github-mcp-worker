# ADR-002: Stateless createMcpHandler

## Status: accepted

## Context
Cloudflare Agents SDK offers two patterns for MCP servers:
1. `McpAgent` (Durable Object per session, stateful, supports elicitation)
2. `createMcpHandler` (stateless Worker, new server per request)

## Decision
Use `createMcpHandler`. Each `push_note` call is independent. No session state, no multi-step workflows, no elicitation needed.

## Alternatives considered
- **McpAgent**: Gives per-session Durable Object storage and elicitation support. Overkill here. Adds complexity (DO bindings in wrangler.jsonc, session management) with zero benefit for a fire-and-forget file push tool.

## Consequences
- Simplest possible deployment: one Worker, no Durable Objects, no KV.
- Per MCP SDK >= 1.26.0 (CVE fix), server instances must be created per request. The `init` callback in `createMcpHandler` handles this correctly.
- If future tools need multi-step workflows (e.g., "draft note, review, then push"), migrate to McpAgent at that point.
