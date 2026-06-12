---
description: When a task needs a written plan before code
---

# Spec Discipline

A spec makes AI output reviewable: review becomes output-versus-standard instead of reconstructing intent from a diff. Apply it where it pays:

- **Implement directly**: small, clear, single-module, no contract changes.
- **Spec first** (`dev-create-spec`): multi-module, contract or API change, new feature, migration risk. Lightweight form: requirements (EARS acceptance criteria) + plan (phases with sibling citations and verification) + tasks - then code.
- A boundary-crossing change always gets a written contract - every unwritten boundary is an implied contract someone will break.
- Ambiguity gets batched questions, never guesses. Effort is estimated at AI pace; human decision and review time listed separately.
- No spec ceremony bigger than the change, and a plan is never proof of correctness - the gates decide.
