---
name: git-resolve-conflicts
description: "Resolves merge or rebase conflicts by what each side intended, never by picking a hunk, then re-runs the full gates."
---

# Resolve Conflicts

The result must preserve the intent of both sides, never just pick one. Invoke when git reports conflicts or a PR shows `CONFLICTING`.

## Steps

1. `git status` - identify the operation (merge/rebase/cherry-pick) and the conflicted files.
2. For each file: read the whole conflict, then both sides' intent - `git log --oneline <ours>..<theirs> -- <file>` and the reverse. Goals matter more than text.
3. Resolve by combining intents. Genuinely incompatible - STOP and present both intents with a recommendation; that call is the owner's.
4. Generated files - regenerate with the owning tool, never hand-merge output. Lockfiles - resolve the manifest, regenerate the lockfile with the package manager.
5. Check the unmarked overlap: when both branches touched the same feature, verify the merged behavior, not only the conflict-marked files.
6. Re-run the full gates (`dev-run-tests`) - a clean merge that fails tests is not resolved.
7. Complete the operation (standard merge message, or `git rebase --continue`) and push fast-forward.

## Verify

- `git grep -n '<<<<<<<'` returns nothing; gates green; behavior from both branches survives.

## Scope / hand-off

- Merge vs rebase policy - profile `update_strategy`; the PR loop - `git-finalize-pr`.

## Constraints

- Never resolve by discarding one side wholesale; never force-push the result to a shared branch.
