# Verification log (proof of done)

This repo adopts the dwarves-kit proof-of-done gate. This file is the opt-in marker: its
presence engages the kit ship-gate on `git push` / `gh pr create`.

"Done" for a load-bearing (behavioral or stateful) change is a recorded proof at
`docs/verification/<slug>.md` with three parts: a green run (Command + Exit + output
excerpt), a negative control (the check goes RED when the work is reverted), and
reproducibility. Inert changes (docs, cosmetic) are exempt.

For the artifact a given work-type owes, run:
  bash ~/.claude/dwarves-kit/lib/proof-gate.sh contract "<your task>"

Escape hatches (never silent): record `[UNAVAILABLE: <reason>]` when a flow cannot run
here, or `bash ~/.claude/dwarves-kit/lib/proof-ledger.sh override <slug> "<reason>"` (audited).

Full discipline: dwarves-kit docs/verification/README.md.
