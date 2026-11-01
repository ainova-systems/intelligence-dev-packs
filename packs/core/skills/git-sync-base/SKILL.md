---
name: git-sync-base
description: "Returns the checkout to the integration branch, fast-forwards it, and removes the local branches and worktrees whose pull request was merged, leaving everything else as it is. The routine reset between tasks."
argument-hint: "[branch-name ...]"
---

# Return to the integration branch

Leave the checkout on a current integration branch (profile `integration_branch`, else the default
branch), with merged local work cleaned away and everything unmerged kept. It never merges, never
closes a pull request and never touches a remote branch.

## Steps

1. **Run the project's command when it has one.** Profile `sync_base_command` replaces steps 2-4:
   run it once with the arguments given, with a generous timeout, and act on the status it reports
   (below). Never rebuild its flow out of ad-hoc git commands, and never delete a branch it retained.
2. **Check the checkout.** Uncommitted work in it is a stop: list the files and let the owner
   commit, stash or discard. Check out the integration branch and `git pull --ff-only`; a diverged
   integration branch goes to profile `conflict_skill` through the owner, never a reset.
3. **Prune.** `git fetch --prune` and `git worktree prune`.
4. **Clean what merged.** For each local branch (all non-protected ones, or only those named),
   delete it with `git branch -D` only when its pull request is `MERGED`, the PR head SHA equals the
   local branch SHA, and the merge commit is an ancestor of the integration branch; record the SHA
   first. A worktree holding such a branch is removed first (profile `worktree_remove`, else
   `git worktree remove`) only when it has no uncommitted changes. Everything else is retained with
   its reason.
5. **Finish** with profile `post_merge` when it is set, and report.

## Status

A `sync_base_command` reports its outcome in a last block, `<NAME>_STATUS=<value>`:

| Status | Meaning | Your move |
|---|---|---|
| `<NAME>_STATUS=ok` | cleanup done and verified | report |
| `<NAME>_STATUS=error` | unexpected failure, or post-run verification failed | surface the detail verbatim and stop |
| `<NAME>_STATUS=dirty-worktree` | uncommitted work in the main checkout; nothing was touched | show the files, ask the owner, re-run |
| `<NAME>_STATUS=prereq-missing` | bad argument or a missing tool | fix a mistyped argument yourself; name the missing tool to the owner |
| `<NAME>_STATUS=git-failed` | a git step failed, usually a diverged integration branch | surface the detail; hand a divergence to `conflict_skill` through the owner |
| any other value | an outcome the command itself documents | surface it verbatim and follow the command's documentation; never treat it as `ok` |

Re-run only after the cause is fixed, and at most once.

## Report

The integration branch and its SHA; each deleted branch with its PR, branch SHA and merge SHA; each
removed worktree; each retained branch with its reason (`no-pr`, `pr-not-merged`, `head-mismatch`,
`merge-not-on-integration`, `worktree-dirty`, `checked-out-elsewhere`) - a retention is a normal
outcome, not a failure.

## Verify

- `git branch --show-current` names the integration branch, it equals its remote, and the report
  lists every deleted branch with its merged pull request and every retained one with its reason.

## Scope / hand-off

- A diverged integration branch goes to profile `conflict_skill` through the owner; merging is
  `git-merge-pr`.

## Constraints

- Never delete a remote branch; name it to the owner instead.
- Never discard uncommitted work, force a checkout, or reset the integration branch.
