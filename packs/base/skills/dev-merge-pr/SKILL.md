---
name: dev-merge-pr
description: "After owner accept: guard-checked squash-merge of the current branch's PR, base sync and branch cleanup"
argument-hint: "[pr number]"
---

# Merge the PR

Take an accepted, merge-ready PR across the finish line. Deliberately non-diagnostic: it fixes nothing - if any guard fails it STOPS and names the companion skill. Fail-fast applies to every step: an error, an unexpected state, or `gh` opening an interactive prompt means stop, surface the exact output, act no further.

## Guards (STOP on any failure)

1. `git branch --show-current` - never a protected branch.
2. `git status --short` prints nothing - never merge with uncommitted local work.
3. `git rev-parse HEAD` equals `git rev-parse @{u}` - the reviewed commit must equal local HEAD; unpushed work goes through `dev-commit-push` first.
4. Open PR for THIS branch: `gh pr list --head <branch> --state open --json number,headRefName --jq '.[0]'`. An explicit pr-number argument must have `headRefName == <current branch>` - otherwise refuse: never merge a PR that is not the current branch's.
5. CI green on HEAD (latest-SHA filter, same probe as `dev-finalize-pr`) - red or pending: hand off to `dev-finalize-pr`.
6. Zero unresolved review threads (GraphQL `reviewThreads.isResolved`) - unresolved: hand off to `dev-review-pr-comments`.
7. `gh pr view <pr> --json mergeable,mergeStateStatus,reviewDecision` - `CONFLICTING`: `dev-resolve-conflicts`; `BLOCKED` / `BEHIND`: report and stop.

## Steps

1. Merge per profile `merge_method` (default squash): `gh pr merge <pr> --squash`. Remote-branch deletion per profile (default: keep).
2. Confirm it landed: `gh pr view <pr> --json state,mergedAt,mergeCommit` - `state != "MERGED"` means STOP. Record the merge commit SHA.
3. Sync the base: `git switch <base> && git pull --ff-only && git fetch --prune`.
4. Delete the local branch only after confirming the merge commit is on the base: `git branch -d <branch>` (`-d`, never `-D`).
5. Report: merge commit SHA, base state, cleanup done.

## Verify

- PR state `MERGED`; the base contains the merge commit; local branch gone; clean tree on the base.

## Scope / hand-off

- CI and comments - `dev-finalize-pr`; conflicts - `dev-resolve-conflicts`; cutting a release - `dev-create-release`.

## CRITICAL

- Never force, retry blindly, or work around an unexpected `gh` result.
- The only destructive action (local branch delete) runs only after the merge is confirmed landed.
- This skill runs only after the owner's explicit accept.
