---
description: Conventions, decisions, and domain knowledge live in the repo as first-class artifacts
---

# Context Engineering

The repository is the shared information environment for the team and its agents; intent lives in the repo, never only in chats, tickets, or heads.

- A convention change updates its rule in the same commit as the code that changes it.
- Significant decisions get a decision record with explicit status, so readers learn why instead of guessing.
- Domain knowledge worth keeping (business rules, glossary, flows) is in-repo, numbered, referenceable.
- Documentation that drifts from code is a defect: fix it in the same change.
- One source per convention; everything else references it.
