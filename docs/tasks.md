# Task Backlog

## Phase 1: Foundation (current)
- [ ] npm install and verify build -- no type errors
- [ ] wrangler dev and test with MCP Inspector -- verify push_note appears
- [ ] Create target GitHub repo (han/learned) if not exists -- with README
- [ ] wrangler deploy -- get live URL
- [ ] Set secrets via wrangler secret put -- GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO
- [ ] Add as custom connector in Claude.ai -- Settings > Connectors > Add custom connector
- [ ] Verify push_note works end-to-end from Claude web
- [ ] Verify push_note works from Claude iOS app

## Phase 2: Hardening
- [ ] Add request validation (reject empty content, sanitize title)
- [ ] Add rate limiting or basic auth token header to prevent abuse
- [ ] Handle GitHub API rate limit errors gracefully (return retry-after info)
- [ ] Add CORS headers if needed for MCP Inspector testing

## Phase 3: Enhancements
- [ ] list_notes tool -- list recent notes from repo via GitHub Trees API
- [ ] update_index tool -- rebuild README.md with note index via GitHub API
- [ ] Support image attachments (base64 image in tool input, commit to assets/)

## Parking Lot (discussed but deferred)
- Notion MCP dual-write -- deferred because it splits the knowledge base
- GitHub Actions for auto-index -- could replace update_index tool, evaluate after Phase 1
- Capacities dual-write from Worker -- X-Callback URL only works on macOS, not from Workers
- OAuth/multi-user support -- not needed, this is a personal tool
