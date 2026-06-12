---
name: dev-resolve-conflicts
description: Resolve merge or rebase conflicts by understanding both sides, then re-verify. Use when git reports conflicts during merge, rebase, or PR update.
---

# dev-resolve-conflicts

Resolve conflicts semantically: the result must preserve the intent of both branches, not just pick a side.

## Project profile

Resolve `update_strategy` (merge or rebase) from `dev-project-profile.md`; default is merge from the target branch.

## Steps

1. **Identify the operation.** `git status` shows whether this is a merge, rebase, or cherry-pick, and which files conflict.
2. **Understand both sides before editing.** For each conflicted file: read the full conflict, then check what each branch was doing there (`git log --oneline <ours>..<theirs> -- <file>` and the reverse). The goal of each side matters more than its text.
3. **Resolve semantically.** Combine the intents. When both sides changed the same logic for different reasons, both reasons must survive. When the sides are genuinely incompatible, stop and present the two intents with a recommendation; that decision belongs to the owner.
4. **Check the non-conflicting overlap.** Conflicts mark only textual collisions. When both branches touched the same feature, verify the merged behavior, not just the marked files.
5. **Re-run the gates.** Full typecheck, lint, and tests after resolution (`dev-verification-gates`). A clean merge that fails tests is not resolved.
6. **Complete the operation.** Standard merge commit message (or continue the rebase). Push fast-forward; never force-push a shared branch.

## Failure modes

- Conflict in generated files: regenerate via the owning tool instead of hand-merging the output.
- Conflict in lockfiles: resolve the manifest first, then regenerate the lockfile with the package manager.
- The same conflict keeps recurring: propose updating the branch more frequently or splitting the long-running branch.
