---
description: Branch model, protected branches, and feature-branch flow
---

# Git Workflow

## Branch model resolution

Resolve the model in this order; never guess silently:

1. `dev-project-profile.md` in the project rules (keys: `default_branch`, `integration_branch`, `branch_prefixes`, `protected_branches`, `update_strategy`).
2. Detection: default branch from `git symbolic-ref refs/remotes/origin/HEAD`; an existing `origin/develop` branch implies a gitflow-style integration branch.
3. Ask once, then suggest persisting the answer into the profile.

## REQUIRED

- All work happens on short-lived branches: `<prefix>/<slug>` (defaults: `feature/`, `bugfix/`, `hotfix/`). Branch from the integration branch when one exists, otherwise from the default branch.
- Pull requests target the integration branch when one exists, otherwise the default branch. Hotfixes follow the project profile.
- Keep a long-running branch current using the profile `update_strategy` (default: merge from its target branch).
- Delete branches after merge.

## FORBIDDEN

- Committing directly to a protected branch (default and integration branches are always protected). If asked to commit while on one, create a feature branch first (`dev-start-feature`).
- Merging with a red CI pipeline.
- Rewriting history on any shared branch.
