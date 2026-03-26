# GitHub MCP Worker - Knowledge Capture Pipeline

## What this is

A Cloudflare Worker that acts as a remote MCP server, exposing tools (`push_note`, `list_notes`, `update_index`) that commit markdown files to a GitHub repo via the GitHub Contents API. The repo is an Obsidian vault organized by topic. Images are handled externally (uploaded to R2 by the knowledge capture skill). This closes the iOS gap in Han's PKM pipeline: Claude iOS can only use cloud MCP servers, and this Worker is that cloud MCP server.

## Problem it solves

Claude macOS has `bash_tool` and can push to GitHub directly via curl or git. Claude iOS has none of that. It can only call cloud MCP servers. This Worker bridges that gap by accepting MCP tool calls and translating them into GitHub API commits.

## Tech stack

- **Runtime**: Cloudflare Workers (already in daily use, CF Developer Platform connector active)
- **MCP SDK**: `@modelcontextprotocol/sdk` (latest, >= 1.26.0)
- **MCP transport**: `createMcpHandler` from `@cloudflare/agents` (Streamable HTTP, stateless)
- **Auth**: Authless (no OAuth needed - this is a personal server pushing to Han's own repo with a stored PAT)
- **Language**: TypeScript
- **Build**: Wrangler

## Architecture decisions

See `docs/decisions/` for full ADRs. Key choices:

1. **Authless MCP + GitHub PAT as Worker secret** (not OAuth). This is a single-user personal tool, not a multi-tenant service. PAT stored via `wrangler secret put GITHUB_PAT`.
2. **`createMcpHandler` (stateless)** over `McpAgent` (stateful). No session state needed. Each tool call is independent.
3. **Streamable HTTP** transport at `/mcp` endpoint. SSE is deprecated. Claude.ai custom connectors support Streamable HTTP.
4. **Four tools**: `push_note`, `list_notes`, `update_index`, `push_image`.
5. **Optional bearer token auth** via `AUTH_TOKEN` secret for abuse prevention.

## Repo structure

```
github-mcp-worker/
  CLAUDE.md                      # You are here
  README.md                      # Human-readable overview
  package.json                   # Dependencies
  tsconfig.json                  # TypeScript config
  wrangler.jsonc                 # Cloudflare Worker config
  .gitignore
  .env.example                   # Required secrets documentation
  src/
    index.ts                     # Worker entry point + MCP handler + auth + CORS
    tools/
      push-note.ts               # push_note tool implementation
      list-notes.ts              # list_notes tool implementation
      update-index.ts            # update_index tool implementation
    lib/
      github.ts                  # GitHub Contents API client
      slug.ts                    # Title to slug conversion
  docs/
    session_state.md             # Current project state
    tasks.md                     # Prioritized backlog
    decisions/
      ADR-001-authless-mcp.md
      ADR-002-stateless-handler.md
      ADR-003-single-tool-mvp.md
    references/
      ios-pkm-pipeline-handoff.md
```

## Build / test / run commands

```bash
# Install dependencies
npm install

# Local dev
npx wrangler dev

# Test with MCP Inspector
# Open http://localhost:5173 and connect to http://localhost:8787/mcp

# Deploy
npx wrangler deploy

# Set GitHub PAT secret (one-time after first deploy)
npx wrangler secret put GITHUB_PAT
# Paste your GitHub PAT with repo scope

# Set target repo (one-time)
npx wrangler secret put GITHUB_REPO
# Value: han/learned (or whatever repo name)

# Set GitHub username
npx wrangler secret put GITHUB_OWNER
# Value: your GitHub username

# Optional: Set auth token for abuse prevention
npx wrangler secret put AUTH_TOKEN
# Value: any random string (e.g., generate with `openssl rand -hex 32`)
```

## Environment variables / secrets

| Name | Type | Description |
|------|------|-------------|
| `GITHUB_PAT` | secret | GitHub Personal Access Token with `repo` scope |
| `GITHUB_OWNER` | secret | GitHub username (repo owner) |
| `GITHUB_REPO` | secret | Repository name (e.g., `learned`) |
| `AUTH_TOKEN` | secret (optional) | Bearer token for request auth. When set, all requests must include `Authorization: Bearer <token>` |

## Code conventions

- No default exports except the Worker entry point (`export default`)
- All tool handlers are standalone functions in `src/tools/`
- GitHub API interactions isolated in `src/lib/github.ts`
- Error messages must be user-friendly (they show up in Claude's response)
- No `// TODO` stubs. Every function is implemented or not present.
- Prefer explicit types over `any`

## Alternative starting point

If the current scaffold has issues with `createMcpHandler` types or imports,
consider starting from Cloudflare's official authless MCP template instead:

```bash
npm create cloudflare@latest -- github-mcp-worker --template=cloudflare/ai/demos/remote-mcp-authless
```

Then bolt on our `push_note` tool (`src/tools/push-note.ts`) and GitHub API
client (`src/lib/github.ts`) onto their known-working transport plumbing.
The business logic is the same either way.

## Build-time warnings

1. The `createMcpHandler` API from `@cloudflare/agents` is evolving fast. The
   `init` callback signature may differ from what's written. Check the installed
   package types and adjust.
2. The MCP SDK bundles zod internally, but depending on version you may need
   `zod` as a direct dependency. If `tsc` complains, `npm install zod`.
3. The `btoa(unescape(encodeURIComponent(content)))` pattern in `github.ts`
   handles UTF-8 for GitHub's base64 requirement. If Vietnamese text breaks,
   inspect that line.

## Known constraints

- Claude.ai custom connectors strip trailing slashes from URLs. The Worker must handle both `/mcp` and `/mcp/`.
- MCP SDK >= 1.26.0 requires new server instances per request (CVE fix). Do NOT declare McpServer in global scope.
- GitHub Contents API has a 100MB file size limit (not a concern for markdown notes)
- GitHub Contents API requires base64-encoded content
- Rate limit: 5,000 requests/hour for authenticated GitHub API calls

## Testing strategy

1. **Local**: `wrangler dev` + MCP Inspector at the `/mcp` endpoint
2. **Integration**: Deploy to workers.dev, add as custom connector in Claude.ai web, verify tool appears
3. **iOS validation**: Open Claude iOS, confirm the connector is available and `push_note` executes

## After deploy: Claude.ai setup

1. Go to Settings > Connectors > Add custom connector
2. URL: `https://github-mcp-worker.<your-subdomain>.workers.dev/mcp`
3. No OAuth needed (authless)
4. Connect, verify `push_note` tool appears
5. Test from iOS
