---
description: Conventions, decisions, and domain knowledge live in the repository as first-class artifacts
---

# Context Engineering

The repository is the shared information environment that both the team and its AI agents read. Output quality is governed by this context, so intent is pushed into the repo instead of living in chats, tickets, or heads.

## REQUIRED

- Conventions are codified as rules in the intelligence sources. When a convention changes, the rule changes in the same commit as the code that changes it.
- Significant decisions are recorded as decision records with an explicit status (use `dev-add-decision`). An agent reads *why* a thing is the way it is instead of guessing.
- Domain knowledge worth keeping (business rules, glossary terms, flow descriptions) lives in-repo, numbered and referenceable, so it can be cited and tested.
- Documentation that drifts from code is a defect. Fix the doc or the code in the same change; verify periodically with `dev-docs-sync-check`.

## FORBIDDEN

- Explaining a convention in a PR comment or chat without persisting it where agents read it.
- Duplicating the same convention in several places. One source; others reference it.
