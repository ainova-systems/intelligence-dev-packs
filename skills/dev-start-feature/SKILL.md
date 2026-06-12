---
name: dev-start-feature
description: Start a new work branch from the correct base branch, with the project's branch naming. Use when beginning any feature, bugfix, or hotfix.
argument-hint: "<short description or ticket id> [feature|bugfix|hotfix]"
---

# dev-start-feature

Create a correctly named, up-to-date work branch so all subsequent work follows the project's branch model.

## Project profile

Resolve from `dev-project-profile.md` in the project rules: `default_branch`, `integration_branch`, `branch_prefixes`. If absent, detect: default branch via `git symbolic-ref refs/remotes/origin/HEAD --short`; an existing `origin/develop` implies it is the integration branch. Ask once for anything still ambiguous.

## Steps

1. **Resolve the base branch.** Features and bugfixes branch from the integration branch when one exists, otherwise from the default branch. Hotfixes branch from the default branch unless the profile says otherwise.
2. **Check the worktree.** If there are uncommitted changes, stop and ask: stash them, bring them to the new branch, or abort. Never discard silently.
3. **Update the base.** `git fetch origin` and verify the local base branch is at `origin/<base>`; fast-forward it if behind.
4. **Name the branch.** `<prefix>/<slug>`: prefix from the argument kind (default `feature/`), slug as a short kebab-case summary of the argument; include the ticket ID when one is given (`feature/fr-042-export-endpoint`).
5. **Create and switch.** `git switch -c <name> <base>`. Confirm in one line: branch name, base, and base commit.

## Failure modes

- Branch name already exists: propose switching to it instead of recreating.
- Detached HEAD or in-progress merge/rebase: report the state and stop; do not branch from a mid-operation state.
