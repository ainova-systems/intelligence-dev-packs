# core

The universal pack: install in every project where an LLM coding agent works. Self-contained, no dependencies.

Holds two domains:

- **`dev-`** - general engineering discipline and session hygiene: verification gates, rollback safety, skill-first, context engineering, working with people (with the `references/dev-external-writes.md` mechanism), code review, test running, change review, handoff, delivering one task or the next queue item end to end, and one-time repo setup (`dev-init`).
- **`git-`** - git / PR / release mechanics: commit, branch flow (with the `references/git-pr-labels.md` label mechanics), open PR, conflicts, finalize, verify and review the PR, complete it, merge, release, secret scan, return to the integration branch. Variability (branch model, merge method, commit style, PR template / risk-size, post-merge hook) is configured via [`templates/dev-project-profile.md`](templates/dev-project-profile.md), not by forking the pack.

Full contents and the owner flow are in the [repository README](../../README.md).
