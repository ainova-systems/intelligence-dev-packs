---
description: When a task needs a written plan before code
---

# Spec Discipline

A spec makes AI output reviewable: review becomes output-versus-standard instead of reconstructing intent from a diff. Apply it where it pays:

- **Implement directly**: small, clear, single-module, no contract changes.
- **Plan first** (`dev-plan-feature`): multi-module, contract or API change, new feature, migration risk. Lightweight form: contract (what changes at the boundaries) + plan (ordered steps, each with its verification) + code.
- A boundary-crossing change always gets a written contract - every unwritten boundary is an implied contract someone will break.
- Ambiguity gets batched questions, never guesses. Effort is estimated at AI pace; human decision and review time listed separately.
- No spec ceremony bigger than the change, and a plan is never proof of correctness - the gates decide.
