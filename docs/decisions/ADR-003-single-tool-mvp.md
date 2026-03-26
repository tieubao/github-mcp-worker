# ADR-003: Single tool MVP (push_note only)

## Status: accepted

## Context
The handoff doc proposed three tools: push_note, list_notes, update_index. Building all three delays the iOS validation that is the whole point of this project.

## Decision
Ship with push_note only. list_notes and update_index are Phase 3.

## Alternatives considered
- **All three tools at once**: More complete but delays validation. The risk is that the custom connector flow or iOS MCP support has an issue we only discover after building everything.
- **push_note + list_notes**: list_notes is nice but you can browse notes on GitHub.com or via GitHub mobile app. It does not close the iOS gap.

## Consequences
- Fastest path to validating the full iOS pipeline (Claude iOS -> Worker -> GitHub).
- Notes are browsable via GitHub web/mobile. No in-Claude listing until Phase 3.
- README index can be solved with a GitHub Action triggered on push, not a Worker tool.
