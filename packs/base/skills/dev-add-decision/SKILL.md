---
name: dev-add-decision
description: "Record a numbered ADR with context, decision, consequences, status"
argument-hint: "<decision summary>"
agent: dev-docs-writer
---

# Add a Decision Record

One decision = one numbered file with explicit status, so readers learn why instead of guessing. Invoke when a significant decision is made or superseded.

## Steps

1. **Apply the ADR gate.** Record only when all three hold: hard to reverse (changing your mind later costs something real), surprising without context (a future reader would ask "why?"), and the result of a real trade-off (genuine alternatives existed). Any one missing - say so and skip the ADR.
2. Resolve the directory: an existing ADR folder wins (follow its numbering and format); else profile `decisions_dir`; else create `docs/decisions/` (`NNNN-<kebab-slug>.md`, MADR-style).
3. Superseding? The old ADR gets `Superseded by NNNN`, both link to each other; never rewrite an accepted ADR's substance.
4. Next number from the existing files; write the sections: Title (the decision as a statement), Status (`proposed | accepted | superseded by NNNN` plus date), Context (the forces - readable in two years), Decision (active voice), Consequences (honest, costs included), Alternatives (each with the one reason it lost).
5. Link the ADR from the docs or rules it affects.
6. Report the path plus a one-line summary.

## Verify

- The file exists with a clear Status line; a superseded chain links both ways.

## Scope / hand-off

- Updating prose in feature/architecture docs - `dev-audit-docs` / the docs flow.

## CRITICAL

- Still an open debate - record as `proposed` and name the decider; an ADR is not a way to win an argument.
- Vague consequences ("cleaner architecture") - replace with the concrete obligation or saving, or omit.
