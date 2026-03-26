# github-mcp-worker

A Cloudflare Worker that acts as a remote MCP server for pushing knowledge notes to a GitHub repository. Built to close the iOS gap in a personal knowledge management pipeline.

## Why

Claude on macOS can push files to GitHub via bash. Claude on iOS cannot. This Worker bridges that gap by exposing a `push_note` MCP tool that Claude iOS can call as a cloud connector.

## Setup

```bash
npm install
npx wrangler deploy
npx wrangler secret put GITHUB_PAT    # Your GitHub PAT with repo scope
npx wrangler secret put GITHUB_OWNER  # Your GitHub username
npx wrangler secret put GITHUB_REPO   # Target repo name (e.g., "learned")
```

Then add `https://github-mcp-worker.<subdomain>.workers.dev/mcp` as a custom connector in Claude.ai Settings > Connectors.

## Tools

| Tool | Description |
|------|-------------|
| `push_note` | Push a markdown note with frontmatter to the GitHub repo |

## Local development

```bash
npx wrangler dev
# Test at http://localhost:8787/mcp with MCP Inspector
```
