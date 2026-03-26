# ADR-001: Authless MCP server

## Status: accepted

## Context
Remote MCP servers can use OAuth to authenticate users, or run without auth. The Cloudflare Agents SDK supports both patterns. Claude.ai custom connectors support both authless and OAuth-based servers.

## Decision
Use authless MCP. The GitHub PAT is stored as a Cloudflare Worker secret, not exposed to the MCP client. The Worker trusts all incoming MCP requests.

## Alternatives considered
- **OAuth via GitHub**: The GitHub remote MCP server uses Copilot-specific OAuth that is incompatible with Claude.ai (issue #549). Building our own GitHub OAuth flow adds weeks of work for no benefit on a single-user tool.
- **API key in header**: Could add a static bearer token, but adds friction on the Claude.ai connector setup (custom headers require advanced settings). Can add later in Phase 2 if the Worker URL leaks.
- **Cloudflare Access (Zero Trust)**: Heavyweight for a personal tool. Would require Access policy setup and token management.

## Consequences
- Anyone who discovers the Worker URL can push notes to the repo. Acceptable risk for a personal tool on an obscure workers.dev subdomain.
- If abuse occurs, add a static bearer token check in Phase 2 (low effort).
- No user identity in commits. All commits are from the PAT owner.
