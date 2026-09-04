---
name: git-merge-pr
description: "Merges an accepted pull request behind guard checks, then syncs the base branch and cleans up. Owner-invoked only - merge timing is not the model's call."
argument-hint: "[pr number]"
disable-model-invocation: true
---

# Merge the PR

Take an accepted, merge-ready PR across the finish line. Deliberately non-diagnostic: it fixes nothing - if any guard fails it STOPS and names the companion skill. Fail-fast applies to every step: an error, an unexpected state, or `gh` opening an interactive prompt means stop, surface the exact output, act no further.

## Guards (STOP on any failure)

1. `git branch --show-current` - never a protected branch.
2. `git status --short` prints nothing - never merge with uncommitted local work.
3. `git rev-parse HEAD` equals `git rev-parse @{u}` - the reviewed commit must equal local HEAD; unpushed work goes through `git-commit-push` first.
4. Open PR for THIS branch: `gh pr list --head <branch> --state open --json number,headRefName --jq '.[0]'`. An explicit pr-number argument must have `headRefName == <current branch>` - otherwise refuse: never merge a PR that is not the current branch's.
5. CI green on HEAD (latest-SHA filter, same probe as `git-finalize-pr`) - red or pending: hand off to `git-finalize-pr`.
6. Zero unresolved review threads (GraphQL `reviewThreads.isResolved`) - unresolved: hand off to `git-review-pr-comments`.
7. `gh pr view <pr> --json mergeable,mergeStateStatus,reviewDecision` - `CONFLICTING`: the profile `conflict_skill` (default `git-resolve-conflicts`); `BLOCKED` / `BEHIND`: report and stop.

## Steps

1. Merge per profile `merge_method` (default squash): `gh pr merge <pr> --squash` (or `--merge` / `--rebase`). Delete the remote branch per profile `delete_remote_branch` (default: keep - do not pass `--delete-branch`).
2. Confirm it landed: `gh pr view <pr> --json state,mergedAt,mergeCommit` - `state != "MERGED"` means STOP. Record the merge commit SHA.
3. Sync the base: `git switch <base> && git pull --ff-only && git fetch --prune`. Confirm the merge commit is on the base before any local deletion.
4. Delete the local branch per profile `delete_local_branch` (default: true), only after steps 2-3 confirmed the merge. The authoritative "merged" signal is the confirmed PR `state == MERGED`, not git ancestry: a `squash` or `rebase` merge rewrites the commits, so the feature branch is NOT an ancestor of the base and `git branch -d` refuses with "not fully merged". Use `-d` after a `merge`-method merge; use `-D` after `squash` / `rebase` - safe precisely because the merge was confirmed first.
5. **Post-merge hook (optional).** If profile `post_merge` is set, run it now (e.g. regenerate committed generated outputs so the base is not left stale) - on failure STOP and report; never leave the base half-updated.
6. **Spec close (optional, spec-driven projects).** If a spec/plan drove this change, close it now so its status and docs reflect the merge - hand off to `spec-close`. Projects without the spec pack skip this step.
7. Report: merge commit SHA, base state, cleanup done, post-merge hook result (if any), spec closed (if any).

## Verify

- PR state `MERGED`; the base contains the merge commit; local branch gone; clean tree on the base.

## Scope / hand-off

- CI and comments - `git-finalize-pr`; conflicts - the profile `conflict_skill` (default `git-resolve-conflicts`); cutting a release - `git-create-release`.

## Constraints

- Never force, retry blindly, or work around an unexpected `gh` result.
- The only destructive action (local branch delete) runs only after the merge is confirmed landed.
- This skill runs only after the owner's explicit accept.
