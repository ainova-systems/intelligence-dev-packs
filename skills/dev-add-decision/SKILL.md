---
name: dev-add-decision
description: Record an architecture decision record (ADR) with context, decision, consequences, and status. Use when a significant technical decision is made or an old one is superseded.
argument-hint: "<decision summary>"
---

# dev-add-decision

Persist a decision so future readers (human or agent) learn *why*, instead of guessing from the code. One decision, one file, explicit status.

## Project profile

Resolve `decisions_dir` from `dev-project-profile.md` (default `docs/decisions/`). Follow the numbering and naming already present in that directory; default `NNNN-<kebab-slug>.md` with a zero-padded sequence.

## Steps

1. **Check for an existing record.** If this decision updates or reverses an earlier ADR, the old one gets `Superseded by NNNN` and the new one links back. Never edit an accepted ADR's substance.
2. **Determine the next number** from the existing files.
3. **Write the record:**
   - **Title**: the decision as a statement (`0007 - Store tenant data in one database with tenant_id isolation`).
   - **Status**: `proposed` | `accepted` | `superseded by NNNN`, plus the date.
   - **Context**: the forces that made a decision necessary - requirements, constraints, what was failing. Written so it still makes sense in two years.
   - **Decision**: what was decided, stated actively.
   - **Consequences**: what becomes easier, what becomes harder, what new obligations appear. Honest, including the costs.
   - **Alternatives considered**: each with the one reason it lost.
4. **Link it** from the docs or rules that the decision affects, so it is discoverable from where people actually read.
5. **Report** the file path and a one-line summary.

## Failure modes

- The "decision" is still an open debate: record it as `proposed` and name the decider; an ADR is not a way to win an argument.
- Vague consequences ("cleaner architecture"): replace with the concrete obligation or saving, or omit.
