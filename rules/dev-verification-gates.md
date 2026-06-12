---
description: Typecheck, lint, and tests pass before every commit; gates are never weakened to get green
---

# Verification Gates

AI amplifies the existing system: with a strong gate it accelerates safely, without one it accelerates defects. The gates are what make AI-paced change reviewable.

## REQUIRED

- The project's typecheck, lint, and test commands pass locally before every commit. Resolve the commands from `dev-project-profile.md` (`typecheck`, `lint`, `test`); otherwise detect from the project manifests (`package.json` scripts, solution files, `Makefile`, `pyproject.toml`).
- Run the cheapest gate first (typecheck), the full suite before push.
- New logic ships with tests in the same change. A bug fix adds a regression test that fails without the fix.
- CI green is a merge precondition. A red pipeline blocks the merge with no exceptions.

## FORBIDDEN

- Weakening a gate to pass it: deleting or skipping failing tests, loosening lint rules, lowering a coverage threshold, adding type suppressions. If a gate is genuinely wrong, raise it with the gate's owner as its own change.
- Marking work done with failing or unrun gates. Report the failure with its output instead.
