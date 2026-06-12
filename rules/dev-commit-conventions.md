---
description: Commit message format and push discipline for human and AI authors
---

# Commit Conventions

## REQUIRED

- One-line commit message: capital first letter, past tense, describes the change. Examples: `Added retry logic to the upload client`, `Fixed tenant filter on the orders query`.
- A body is added only when the change genuinely needs explanation (breaking change, non-obvious tradeoff). One blank line between subject and body.
- When the project tracks work items (see `reference_ids` in the project profile), include the ID in the subject: `Added export endpoint (FR-042)`.
- Each commit is one logical change. Unrelated edits go in separate commits.
- Verification gates pass before every commit (see `dev-verification-gates`).

## FORBIDDEN

- `Co-Authored-By:` or any other generated-by / tool-attribution trailer.
- Conventional-commit prefixes (`feat:`, `fix:`, `chore:`) unless the project profile sets `commit_style` to require them.
- Force-pushing shared branches. Push fast-forward only; if the remote moved, integrate first.
- Hand-editing generated outputs and committing them as source. Regenerate via the owning tool.

## Profile overrides

`dev-project-profile.md` keys: `commit_style`, `reference_ids`. Absent profile means the defaults above apply.
