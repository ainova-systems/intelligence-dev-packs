# spec

The opt-in pack: spec-driven development for projects that adopt it. Not every project migrates to spec-driven, so this ships separately.

Domain **`spec-`** - plan a change as a reviewable spec (requirements / plan / tasks), execute it via parallel subagents to an outcome-labeled PR, reconcile docs, record decisions, audit drift.

**Depends on `core`**: the orchestrators invoke `core`'s git and verification skills (`git-finalize-pr`, `git-merge-pr`, `git-commit-push`, `dev-run-tests`). Install `core` alongside it.

Full contents and the owner flow are in the [repository README](../../README.md).
