# Task Backlog

## Phase 1: Foundation
- [x] npm install and verify build -- no type errors
- [ ] wrangler dev and test with MCP Inspector -- verify all tools appear
- [ ] Create target GitHub repo (han/learned) if not exists -- with README
- [ ] wrangler deploy -- get live URL
- [ ] Set secrets via wrangler secret put -- GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO, AUTH_TOKEN
- [ ] Add as custom connector in Claude.ai -- Settings > Connectors > Add custom connector
- [ ] Verify push_note works end-to-end from Claude web
- [ ] Verify push_note works from Claude iOS app

## Phase 2: Hardening (implemented)
- [x] Add request validation (reject empty content, sanitize title, trim whitespace)
- [x] Add bearer token auth header (`AUTH_TOKEN` secret, optional)
- [x] Handle GitHub API rate limit errors gracefully (return retry-after info)
- [x] Add CORS headers for MCP Inspector and cross-origin testing

## Phase 3: Enhancements (implemented)
- [x] list_notes tool -- list notes by topic via GitHub Trees API
- [x] update_index tool -- rebuild README.md with auto-generated topic index
- [x] Redesign path structure for Obsidian vault (topic-based: {topic}/{slug}.md)
- [x] Remove push_image (images go to R2 externally)

## Parking Lot (discussed but deferred)
- Notion MCP dual-write -- deferred because it splits the knowledge base
- GitHub Actions for auto-index -- could replace update_index tool, evaluate after Phase 1
- Capacities dual-write from Worker -- X-Callback URL only works on macOS, not from Workers
- OAuth/multi-user support -- not needed, this is a personal tool
