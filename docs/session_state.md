# Session State

## POSITION

Phase: **scaffolding** (ready for implementation validation)

All code files are written with real implementations (no stubs). The project needs:
1. `npm install` to pull dependencies
2. `wrangler dev` to test locally with MCP Inspector
3. `wrangler deploy` + secrets to go live
4. Add as custom connector in Claude.ai to validate iOS flow

Key decisions made:
- Authless MCP (no OAuth complexity for a personal tool)
- `createMcpHandler` stateless pattern (not McpAgent)
- Single tool MVP (`push_note` only)
- GitHub PAT as Worker secret
- Streamable HTTP transport at `/mcp`

## CONTEXT

- This Worker closes the iOS gap in Han's PKM pipeline
- Claude iOS can only use cloud MCP servers (no bash, no URL schemes)
- Claude.ai custom connectors support authless remote MCP servers
- Connectors added on web automatically appear on iOS
- The GitHub remote MCP server (api.githubcopilot.com/mcp) does NOT work with Claude.ai due to OAuth incompatibility (open issue #549)
- Han already has experience deploying CF Workers (Capacities MCP worker, assets upload worker)
- The `@cloudflare/agents` package provides `createMcpHandler` which handles Streamable HTTP transport

Rejected approaches:
- GitHub official remote MCP: OAuth flow incompatible with Claude.ai custom connectors
- Notion MCP as primary: Would split notes between GitHub (macOS) and Notion (iOS)
- McpAgent (stateful): Overkill for stateless file push operations

## INTENT

Build priority:
1. Validate the Worker compiles and runs locally
2. Test with MCP Inspector that `push_note` works
3. Deploy to workers.dev
4. Set secrets (GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO)
5. Add as custom connector in Claude.ai
6. Test from Claude iOS app

Open questions:
- Does `createMcpHandler` `init` callback receive `env` correctly? (Verify at runtime)
- Does Claude.ai properly discover tools from an authless Streamable HTTP server? (Deploy and test)
- The `zod` import in tools: does the MCP SDK re-export it or do we need the zod package directly? (Check at build time)

Blockers: None. All code is written. Next step is `npm install && npx wrangler dev`.
