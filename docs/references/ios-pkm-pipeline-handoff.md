---
title: iOS PKM Pipeline Handoff
date: 2026-03-26
type: handoff
from_session: SDD Research + PKM Pipeline Design
---

# iOS PKM Pipeline Handoff

## Goal
Build a cross-platform knowledge capture pipeline that works from Claude iOS app. The macOS path (bash_tool + GitHub API curl, or git push) is solved. The iOS path is the open problem.

## Context from this session

### The PKM target decision
We evaluated five PKM targets for pushing captured learnings from Claude sessions:

| Target | macOS | iOS | Verdict |
|--------|-------|-----|---------|
| Capacities (X-Callback URL) | Works | No (can't open URL schemes from Claude iOS) | Current path, macOS only |
| Capacities MCP | Dead (write endpoints return 404/400) | Dead | Abandoned |
| Notion MCP | Works (confirmed write in this session) | Works (cloud MCP, available on iOS) | Viable fallback |
| Telegram Bot API | Works (curl) | No (local MCP only, no bash on iOS) | Good for macOS, not iOS |
| GitHub repo | Works (bash git or curl GitHub API) | Partial (see below) | Best overall, iOS gap |

**Winner: GitHub repo** for these reasons:
- Pure markdown files, version history via git
- Searchable via GitHub code search
- Shareable via repo link or GitHub Pages
- Publishable (GitHub Pages = free knowledge base site)
- Structured folders for organization
- Already in daily workflow

### The iOS gap
The Claude iOS app cannot:
- Run bash commands (no bash_tool)
- Open URL schemes in other apps (iOS sandbox)
- Connect local MCP servers (only cloud MCPs)

The Claude iOS app CAN:
- Use cloud MCP servers (Notion, Gmail, Google Calendar are confirmed working)
- The GitHub Integration connector exists in Claude settings BUT it's read-only (attach files from repo, sync codebase as context). No write/push tools.

### GitHub remote MCP server (investigated in follow-up session)
- GitHub's official remote MCP at `https://api.githubcopilot.com/mcp/` has `push_files` and `create_or_update_file` tools
- BUT it does NOT work with Claude.ai custom connectors due to OAuth incompatibility
- Open issue #549 on github/github-mcp-server confirms this
- The OAuth flow GitHub uses (Copilot-specific OAuth app) doesn't match Claude.ai's custom connector expectations

### Solution: Cloudflare Worker as GitHub MCP proxy
- Build a Cloudflare Worker that wraps GitHub Contents API as a cloud MCP server
- Authless (no OAuth needed for single-user personal tool)
- GitHub PAT stored as Worker secret
- Streamable HTTP transport at /mcp endpoint
- Add as custom connector in Claude.ai Settings > Connectors
- Connectors added on web automatically appear on iOS

### Repo structure for learned notes (proposed)
```
han/learned/
  README.md
  2026/
    03/
      2026-03-26-sdd-framework-landscape.md
      2026-03-26-autoresearch-karpathy-loop.md
    04/
      ...
```

### What NOT to carry forward
- Capacities MCP is dead for writes. Don't try to debug it.
- The GitHub Integration connector in Claude settings is read-only. Don't waste time trying to write through it.
- Local Telegram MCP servers won't help on iOS. Only cloud MCPs work from Claude iOS app.
- GitHub official remote MCP server won't work with Claude.ai custom connectors (OAuth incompatibility).
