---
name: spec-close
description: "After merge, mark a spec completed and archive it per the project convention"
argument-hint: "<spec folder or slug>"
agent: spec-architect
---

# Close a Spec

Post-merge bookkeeping: mark a shipped spec `completed` and retire it, so the queue and the docs reflect reality. Runs after the owner accepts and `git-merge-pr` lands the change. `spec-execute-next` invokes this in its reset for merged specs; it also runs standalone.

## Steps

1. Resolve the spec. Confirm it actually shipped: its PR is `MERGED` (`gh pr view <pr> --json state,mergedAt`) and `tasks.md` is fully ticked. Not merged or tasks unticked - STOP and report; it is not done.
2. Ensure the docs reconciliation landed in the merged change (`spec-execute` Phase D): the feature doc reflects the new behavior, durable rules and decisions were extracted. If anything is missing, **apply it now** (via `spec-document`) - the feature doc is the durable record, the spec is not; never close on stale docs.
3. Set `status: completed` with the date.
4. Archive per the project convention (learn from shipped specs): keep the numbered folder (default), move to `specs/_archive/`, or delete the plan file if the project deletes shipped plans. Never lose the record silently.
5. Report: spec closed, where it was archived, the feature doc(s) it updated.

## Verify

- `status: completed`; PR merged and tasks ticked confirmed; the durable feature doc carries the shipped behavior.

## Scope / hand-off

- Merging the PR - `git-merge-pr` (owner accept first). Resuming an unfinished spec - `spec-continue`.

## CRITICAL

- Never mark completed without a merged PR and fully-ticked tasks - that is the definition of done.
- The feature doc, not the spec, is the durable record; closing confirms the behavior moved there.
