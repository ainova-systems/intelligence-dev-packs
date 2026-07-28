---
description: Typecheck, lint, and tests pass before every commit; one gate runner when the project has one; gates are never weakened
---

# Verification Gates

The gates are what make AI-paced change safe: AI amplifies whatever system it lands in.

- Typecheck, lint, and tests pass locally before every commit. Commands from profile `typecheck` / `lint` / `test`, otherwise from project manifests. Cheapest gate first; full suite before push.
- **When the profile sets `verify`, that single command is the definition of done**: it reads the diff, decides which gates apply, runs them cheapest-first, and prints what it skipped - nobody picks gates by hand, and CI runs exactly the same command, so local and CI cannot drift. Adding a gate means editing that runner, never the CI file.
- A gate runner treats a failure to answer as a refusal: version control failing to report changed files means STOP, never "nothing changed, all green" - a run that verified nothing must not print success.
- New logic ships with tests in the same change; a bug fix adds a regression test that fails without the fix.
- CI green is a merge precondition, no exceptions.

Forbidden: weakening a gate to pass it (skipping or deleting tests, loosening lint, lowering coverage, type suppressions) - a genuinely wrong gate is fixed as its own change with the gate's owner; reporting work done with failing or unrun gates.
