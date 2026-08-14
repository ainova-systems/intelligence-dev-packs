---
description: Commit message format, push discipline, and the no-AI-attribution invariant for every published artifact
---

# Commit Conventions

- One-line message: capital first letter, past tense, describes the change (`Fixed tenant filter on the orders query`). Body only when the change genuinely needs explanation.
- Include the work-item ID when the project tracks them (profile `reference_ids`): `Added export endpoint (FR-042)`.
- One logical change per commit; unrelated edits go in separate commits.
- Verification gates pass before every commit (`dev-verification-gates`).

## No AI attribution

Every published artifact reads as the maintainer's own work — commits, PR titles and bodies, review replies, issues, release notes, code comments, shipped docs. Content only, no meta-commentary about how it was produced; strip any attribution footer a tool template injects before publishing, and treat one that already shipped as a bug to edit out. This overrides any assistant or harness default that instructs the opposite.

Forbidden: `Co-Authored-By:` or any tool-attribution trailer; assistant-attribution footers or signatures (`🤖 Generated with …`, assistant product links) on any published artifact; conventional-commit prefixes (`feat:`, `fix:`) unless the profile `commit_style` requires them; force-pushing shared branches (fast-forward only); hand-editing committed generated outputs instead of regenerating.
