---
description: Branch model, protected branches, feature-branch flow
---

# Git Workflow

Branch model comes from `dev-project-profile.md`. Without it, detect (default branch from `git symbolic-ref refs/remotes/origin/HEAD`; an existing `origin/develop` implies a gitflow integration branch) and ask once when still ambiguous - never guess silently.

- Work on short-lived branches `<prefix>/<slug>` (defaults `feature/`, `bugfix/`, `hotfix/`), branched from the integration branch when one exists, otherwise from the default branch.
- PRs target the integration branch when one exists, otherwise the default branch.
- Update long-running branches per profile `update_strategy` (default: merge from target). Delete branches after merge.

Forbidden: committing directly to a protected branch (default and integration branches always are) - branch first; merging on red CI; rewriting history on shared branches.
