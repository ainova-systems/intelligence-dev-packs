# core

The universal pack: install in every project where an LLM coding agent works. Self-contained, no dependencies.

Holds two domains:

- **`dev-`** - general engineering discipline and session hygiene: verification gates, rollback safety, skill-first, context engineering, code review, test running, change review, handoff.
- **`git-`** - git / PR / release mechanics: commit, branch flow, conflicts, PR comments, finalize, merge, release, secret scan. Variability (branch model, merge method, commit style) is configured via [`templates/dev-project-profile.md`](templates/dev-project-profile.md), not by forking the pack.

Full contents and the owner flow are in the [repository README](../../README.md).
