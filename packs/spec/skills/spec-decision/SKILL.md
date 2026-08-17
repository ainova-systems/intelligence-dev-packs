---
name: spec-decision
description: "Records an architecture decision behind a three-condition gate. A standing law belongs in its rule, behavior in the feature doc - not here."
argument-hint: "<decision summary>"
agent: spec-docs-writer
---

# Add a Decision Record

One decision = one file with explicit status, so readers learn why instead of guessing. Invoke when a significant decision is made or superseded.

The ADR is not the default record: a standing law belongs in the rule that owns it, a component's behavior in its component or feature doc. An ADR is for a structural choice across components with real alternatives - and a gate another skill can bypass by scheduling an "add ADR" step is decorative, so apply the gate here even when a plan requested the record.

## Steps

1. **Apply the ADR gate.** Record only when all three hold: hard to reverse (changing your mind later costs something real), surprising without context (a future reader would ask "why?"), and the result of a real trade-off (genuine alternatives existed). Any one missing - say so and skip the ADR; route the content to the owning rule or doc instead.
2. Resolve the directory and naming: an existing ADR folder wins (follow its numbering and format); else profile `decisions_dir` + `adr_naming`; else create `docs/decisions/`. Default naming is **date-based kebab-case** (`yyMMdd-<slug>.md`): two branches that each add "the next" numbered ADR collide on the number, and closing a numbering gap renames a file every rule that cites it - a date does neither. `adr_naming: numbered` keeps the MADR `NNNN-<slug>.md` scheme for projects that prefer it.
3. Superseding? The old ADR gets `Superseded by <name>`, both link to each other; never rewrite an accepted ADR's substance - append-only, a dead decision is superseded, never deleted.
4. Write the sections: Title (the decision as a statement), Status (`proposed | accepted | superseded by <name>` plus date), Context (the forces - readable in two years), Decision (active voice), Consequences (honest, costs included), Alternatives (each with the one reason it lost).
5. Link the ADR from the docs or rules it affects.
6. Report the path plus a one-line summary.

## Verify

- The file exists with a clear Status line; a superseded chain links both ways; the naming matches the folder's existing convention.

## Scope / hand-off

- Updating prose in feature/architecture docs - `spec-audit-docs` / the docs flow.

## CRITICAL

- Still an open debate - record as `proposed` and name the decider; an ADR is not a way to win an argument.
- Vague consequences ("cleaner architecture") - replace with the concrete obligation or saving, or omit.
- When in doubt about the gate, do not write the ADR.
