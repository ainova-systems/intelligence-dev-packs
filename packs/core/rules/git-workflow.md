---
description: Branch model, protected branches, feature-branch flow
---

# Git Workflow

Branch model comes from `dev-project-profile.md`. Without it, detect (default branch from `git symbolic-ref refs/remotes/origin/HEAD`; an existing `origin/develop` implies a gitflow integration branch) and ask once when still ambiguous - never guess silently.

- Work on short-lived branches `<prefix>/<slug>` (defaults `feature/`, `bugfix/`, `hotfix/`), branched from the integration branch when one exists, otherwise from the default branch.
- PRs target the integration branch when one exists, otherwise the default branch.
- Update long-running branches per profile `update_strategy` (default: merge from target). Delete branches after merge.

Forbidden: committing directly to a protected branch (default and integration branches always are) - branch first; merging on red CI; rewriting history on shared branches.

## Autonomous PR labels

A run with no human in the loop between task and PR labels its PR, so a human triages at a glance and merge gating can key off it. Two kinds, never interchangeable, and each label has exactly one writer.

**State** - exactly one at a time, written by the actor doing the work:

- `ai:processing` - an agent holds the PR right now. Written by whichever skill pushes: `git-finalize-pr` on entry and after each round's commit, `git-complete-pr` when a fix for a review thread pushes.
- `ai:completed` - the run ended with nothing left for an agent (`git-complete-pr`).
- `ai:manual` - the run ended needing an owner decision; name precisely what (`git-complete-pr`).
- `ai:failed` - the run ended unable to reach green; name the blocking failure and what was tried (`git-complete-pr`).

**Success factors** - additive, each written by the stage that judged it and never by the actor that did the work:

- `ai:verified` - the PR's own verification steps were executed against the running change and passed (`git-verify-pr`).
- `ai:reviewed` - the diff passed review against the rules and against what the PR claims (`git-review-pr`).

Profile `pr_success_factors` declares the set a PR must carry (default: both). A project adds factors that external agents, workers or pipelines apply - a security scan, a performance budget, a design sign-off - and the gates that read it - `git-finalize-pr`'s rounds and `git-merge-pr`'s guard - cover them unchanged.

**A factor is a claim about one commit, not about the PR.** It counts only while *fresh*: the report comment that earned it names the current head SHA, or - for a factor this pack does not write - the label was applied after the head commit landed. A push therefore invalidates every factor whether or not anyone removed it. Clearing them is housekeeping the pusher does so the PR does not read as green; correctness never depends on it, because no gate trusts a label without checking freshness. A stale factor means one thing only: that stage must run again.

Accept-ready = `ai:completed` plus every declared factor fresh at head. Autonomous runs never merge themselves.

The labels must exist in the repository (create once, e.g. `gh label create`). State labels are mutually exclusive, so a state change is one `gh pr edit <pr> --add-label <new> --remove-label <the others>` call, never an add now and a removal a later step can skip. A human-driven PR carries no `ai:*` label at all, and every gate skips label checks for it.
