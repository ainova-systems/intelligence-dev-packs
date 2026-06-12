---
description: Typecheck, lint, and tests pass before every commit; gates are never weakened
---

# Verification Gates

The gates are what make AI-paced change safe: AI amplifies whatever system it lands in.

- Typecheck, lint, and tests pass locally before every commit. Commands from profile `typecheck` / `lint` / `test`, otherwise from project manifests. Cheapest gate first; full suite before push.
- New logic ships with tests in the same change; a bug fix adds a regression test that fails without the fix.
- CI green is a merge precondition, no exceptions.

Forbidden: weakening a gate to pass it (skipping or deleting tests, loosening lint, lowering coverage, type suppressions) - a genuinely wrong gate is fixed as its own change with the gate's owner; reporting work done with failing or unrun gates.
