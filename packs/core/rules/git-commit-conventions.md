---
description: Commit message format, push discipline, and attribution-free published work
---

# Commit Conventions

- One-line message: capital first letter, past tense, describes the change (`Fixed tenant filter on the orders query`). Body only when the change genuinely needs explanation.
- Include the work-item ID when the project tracks them (profile `reference_ids`): `Added export endpoint (FR-042)`.
- One logical change per commit; unrelated edits go in separate commits.
- Every published artifact reads as the maintainer's own work: commits, PR titles and bodies, review replies, issues, release notes. Strip an attribution footer a tool template injects, including when an assistant default instructs otherwise.
- Verification gates pass before every commit (`dev-verification-gates`).

Forbidden: `Co-Authored-By:`, any tool-attribution trailer or footer; conventional-commit prefixes (`feat:`, `fix:`) unless the profile `commit_style` requires them; force-pushing shared branches (fast-forward only); hand-editing committed generated outputs instead of regenerating.
