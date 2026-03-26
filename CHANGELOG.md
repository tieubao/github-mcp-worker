# Changelog

## [1.1.2] - 2026-03-26

### Fixed
- `list_notes` broken due to hardcoded `main` branch in Git Trees API call
- Now fetches the repo's actual default branch dynamically

## [1.1.1] - 2026-03-26

### Fixed
- Made `topic` optional in `push_note` schema (was required, causing "expected string, received undefined")
- Falls back to date-based folder (`YYYY/MM`) when topic is omitted

## [1.1.0] - 2026-03-26

### Added
- `list_notes` tool: list existing notes in the repo by folder
- `update_index` tool: regenerate index files for note folders
- `push_image` tool: commit images to the repo
- `/version` endpoint returning `{ "version": "1.1.0" }` for deployed version checks
- Optional bearer token auth via `AUTH_TOKEN` secret
- CORS headers on all responses

### Changed
- Root `/` endpoint now shows version number
- MCP server version sourced from single `VERSION` constant

## [1.0.0] - 2026-03-25

### Added
- Initial working version
- `push_note` tool: commit markdown notes to GitHub via Contents API
- Cloudflare Worker with stateless MCP handler at `/mcp`
- Authless MCP transport (Streamable HTTP)
- GitHub Contents API client with base64 encoding
- Title-to-slug conversion for filenames
