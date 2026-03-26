# Session State

## POSITION

Phase: **Phase 2 & 3 complete** (ready for build validation and deploy)

All code files are written with real implementations (no stubs). The project has:
- **3 MCP tools**: `push_note`, `list_notes`, `update_index`
- **Obsidian-native vault structure**: `{topic}/{slug}.md` (e.g. `mcp/streamable-http-transport.md`)
- **Images handled externally**: uploaded to R2 by knowledge capture skill, not this worker
- **Input validation**: whitespace trimming, title length cap, empty content rejection
- **Auth**: optional bearer token via `AUTH_TOKEN` secret
- **Rate limiting**: GitHub API rate limit detection with retry-after info
- **CORS**: full preflight support for MCP Inspector

Next steps:
1. `npm install` to pull dependencies
2. `npx wrangler dev` to test locally with MCP Inspector
3. `npx wrangler deploy` + secrets to go live
4. Add as custom connector in Claude.ai to validate iOS flow

## CONTEXT

- This Worker closes the iOS gap in Han's PKM pipeline
- Claude iOS can only use cloud MCP servers (no bash, no URL schemes)
- Claude.ai custom connectors support authless remote MCP servers
- Connectors added on web automatically appear on iOS
- The repo IS the Obsidian vault (topic-based folder structure)
- Images (png/svg) go to R2 via separate knowledge capture skill, not this worker
- Markdown files reference R2 URLs for images

Key decisions made:
- Authless MCP (no OAuth complexity for a personal tool)
- Optional bearer token for abuse prevention (AUTH_TOKEN secret)
- `createMcpHandler` stateless pattern (not McpAgent)
- Three tools: push_note, list_notes, update_index
- Topic-based paths: `{topic}/{slug}.md` for Obsidian compatibility
- GitHub PAT as Worker secret
- Streamable HTTP transport at `/mcp`

## TOOLS

| Tool | Description |
|------|-------------|
| `push_note` | Push a markdown note with frontmatter to `{topic}/{slug}.md` |
| `list_notes` | List notes from the repo, optionally filtered by topic |
| `update_index` | Rebuild README.md with an auto-generated index grouped by topic |

## INTENT

Build priority:
1. Validate the Worker compiles and runs locally
2. Test with MCP Inspector that all 3 tools work
3. Deploy to workers.dev
4. Set secrets (GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO, optionally AUTH_TOKEN)
5. Add as custom connector in Claude.ai
6. Test from Claude iOS app

Blockers: None. All code is written. Next step is `npm install && npx wrangler dev`.
