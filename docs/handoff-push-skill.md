# Handoff: Add `push_skill` tool to GitHub MCP Worker

## Context

The `dwarvesf/claude-skills` repo contains shared Claude Code skills as SKILL.md files. Currently, getting a skill from Claude.ai to this repo requires manual copy-paste or zip download. We want to automate this with a new MCP tool.

## What exists today

### GitHub MCP Worker (Cloudflare Worker)
- Already has `push_note` tool that commits markdown files to a knowledge repo
- Uses GitHub API to create/update files via commits
- Structure: `{topic}/{slug}.md` with frontmatter

### claude-skills repo (`dwarvesf/claude-skills`)
- Skills live at `skills/<skill-name>/SKILL.md`
- Each SKILL.md has YAML frontmatter (`name`, `description`) + markdown body
- No build system, pure markdown

### Existing `skill-export` skill (runs on Claude.ai)
- Reads skills from `/mnt/skills/user/<name>/SKILL.md`
- Classifies content as SAFE/SENSITIVE/BORDERLINE (checks for Notion IDs, API keys, company data)
- Currently outputs a zip file for manual download

## What to build

### New tool: `push_skill`

Add a new MCP tool to the GitHub MCP Worker that commits skill files to `dwarvesf/claude-skills`.

#### Tool schema

```json
{
  "name": "push_skill",
  "description": "Push a SKILL.md file to the dwarvesf/claude-skills repo. Creates or updates skills/<name>/SKILL.md.",
  "parameters": {
    "name": {
      "type": "string",
      "description": "Skill name (kebab-case). Used as folder name: skills/<name>/SKILL.md",
      "pattern": "^[a-z0-9-]+$"
    },
    "content": {
      "type": "string",
      "description": "Full SKILL.md content including YAML frontmatter and markdown body"
    },
    "message": {
      "type": "string",
      "description": "Optional commit message. Defaults to 'add <name> skill' or 'update <name> skill'"
    }
  },
  "required": ["name", "content"]
}
```

#### Behavior

1. Validate `name` is kebab-case
2. Validate `content` starts with `---` (has YAML frontmatter)
3. Commit to `dwarvesf/claude-skills` at path `skills/{name}/SKILL.md`
4. Use commit message: provided `message` or auto-generate based on whether file exists (add vs update)
5. Return: `{ "path": "skills/<name>/SKILL.md", "sha": "<commit-sha>", "url": "<commit-url>" }`

#### Config needed

- `SKILLS_REPO`: `dwarvesf/claude-skills` (env var or hardcoded)
- `SKILLS_BRANCH`: `master`
- Reuse the existing GitHub token (needs write access to `dwarvesf/claude-skills`)

### Implementation hints

The `push_note` tool already does 90% of what's needed. The differences:
- Different target repo (skills repo vs knowledge repo)
- Different path pattern (`skills/<name>/SKILL.md` vs `<topic>/<slug>.md`)
- No frontmatter transformation needed (content is passed as-is)
- Simpler: no tags, no source field, no date-based fallback folders

Simplest approach: copy the `push_note` handler, change the repo target and path logic.

## End-to-end flow after this is built

```
Claude.ai                          GitHub                         Local
─────────                          ──────                         ─────
User: /skill-sync
  │
  ├─ Read /mnt/skills/user/
  ├─ Security classify each skill
  ├─ For each SAFE skill:
  │    push_skill(name, content) ──► Commit to
  │         via MCP Worker            dwarvesf/claude-skills ──► git pull
  │                                   skills/<name>/SKILL.md
  └─ Report results
```

## Phase 2 (not now)

- `list_skills` tool to read current skills from the repo (for diff/sync logic)
- `delete_skill` tool for cleanup
- Batch sync with conflict detection
- A `skill-sync` skill for Claude.ai that wraps the classification + push flow

## Testing

1. Call `push_skill` with a test skill name and dummy content
2. Verify the commit appears in `dwarvesf/claude-skills` at the right path
3. Verify updating an existing skill creates a new commit (not a new file)
4. Verify kebab-case and frontmatter validation reject bad input
