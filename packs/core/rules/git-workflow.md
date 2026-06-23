---
description: Branch model, protected branches, feature-branch flow
---

# Git Workflow

Branch model comes from `dev-project-profile.md`. Without it, detect (default branch from `git symbolic-ref refs/remotes/origin/HEAD`; an existing `origin/develop` implies a gitflow integration branch) and ask once when still ambiguous - never guess silently.

- Work on short-lived branches `<prefix>/<slug>` (defaults `feature/`, `bugfix/`, `hotfix/`), branched from the integration branch when one exists, otherwise from the default branch.
- PRs target the integration branch when one exists, otherwise the default branch.
- Update long-running branches per profile `update_strategy` (default: merge from target). Delete branches after merge.

Forbidden: committing directly to a protected branch (default and integration branches always are) - branch first; merging on red CI; rewriting history on shared branches.

## Autonomous outcome labels

A run with no human in the loop between task and PR ends by labeling its PR with exactly one outcome, so a human triages at a glance and merge gating can key off it:

- `ai:ready-to-merge` - CI green, every review thread answered, mergeable; awaiting the owner's accept.
- `ai:manual` - needs an owner decision; state precisely what.
- `ai:failed` - could not reach green; state the blocking failure and what was tried.

Autonomous runs never merge themselves. The labels must exist in the repository (create once, e.g. `gh label create`). A human-driven PR may skip them.
