---
name: operator-merge
description: "Merge one owner-accepted pull request only while its checks, factors and business gates still hold on the accepted head. Runs as the runtime's merge operation, or by hand."
argument-hint: "[PR number when run by hand; the runtime passes $OPERATOR_INPUT]"
---

# Operator merge

Merge applies the owner's acceptance to one verified head; it is the `merge` operation of
`operator.yaml`. Load the `operator-contract` skill first.

| Contract | |
|---|---|
| Trigger | `owner:accepted` on a `humanReview` or `mergeQueue` PR |
| Work | validate the acceptance and the live evidence; profile `merge_skill` (default `git-merge-pr`); profile `sync_base_skill` (default `git-sync-base`) |
| Evidence | confirmed merge commit SHA and PR URL |
| Next | merged → `done`; stale or blocked → one marked refusal comment, `noop` |

## Steps

1. **Re-check the PR.** Require OPEN, `humanReview` or `mergeQueue`, and `owner:accepted`. A moved
   `input.head`, changed milestone, `owner:onhold`, or another run's `ai:processing` (a HELD report, `operator-contract`) ends `noop`.
   Rejection, cancellation, a requested revalidation or a send-back label (`operator_config`
   `sendBack`) blocks the merge.
2. **Check out the accepted head** in a clean slot; local HEAD, upstream and the live PR head must
   agree. Slot work ahead of or diverged from that head is set aside on a local leftover branch first
   (`operator-contract` > The slot stays with its pull request), never pushed through
   profile `commit_skill`: the merge takes only the accepted head. Read the live body and files (profile `forge_cli pr view <n>` and `pr files <n>`), every
   stage report, owner comment and review (`forge_cli notes <n>`), and every unresolved thread
   (`forge_cli threads <n> --unresolved`).
3. **Validate the evidence.** Require `ai:completed`, the acceptance label, and every factor profile
   `pr_success_factors` declares fresh (`operator-contract` > `references/pr-state.md`: verification's steps digest, review's body
   digest and any QA invalidation included). Every
   required check green on this head, no unresolved thread, no outstanding change request, and
   profile `merge_skill`'s guards. Discovery's input and an aggregate status do not prove a required check
   passed; unreadable, missing, cancelled or pending evidence cannot pass, and a token that cannot
   read a check never leads to a new login or a bypass.
4. **Validate the business gates** profile `merge_gates` names, against the diff, the plan and the
   deployment notes, with their stated owner-acceptance exceptions; `owner:accepted` alone does not
   accept a listed manual step. Confirm no newer owner input awaits triage. Where QA serves the PR,
   read its tickets (profile `qa_feedback`): an open ticket created or changed after the last verification report,
   or a read that fails, refuses the merge. This is the last read before the merge.
5. **Hand the PR to the merger.** No `ai:processing` claim: profile `merge_skill` requires `ai:completed`
   as the state, and the runtime runs one operation per PR at a time. Move `humanReview` to `mergeQueue`
   when needed, re-read acceptance, head, milestone and claims, then invoke profile `merge_skill`
   with `owner:accepted` as the owner's standing authorization. Record its confirmed merge SHA;
   a command that exited zero is not a confirmation. Profile `merge_skill` deletes the local branch, so the
   slot then returns with profile `sync_base_skill` unscoped; then delete the local
   `operator/leftover/*` branches the PR's notes name (`operator-contract`).
6. **Report a refusal.** Stale evidence or an unmet gate → one comment naming exactly what is stale
   and which stage must refresh it, ending with the note marker, then `noop`. Reuse an identical
   standing refusal instead of repeating it. A command or cleanup failure is `failed` with its
   error, never a stale-evidence verdict.

## Run by hand

`/operator-merge <n>` on an owner-accepted PR; outside the pipeline, profile `merge_skill` is the
owner's own merge.

## Verify

- The pull request reads merged with the merge commit this run recorded, and the slot is back on the
  integration branch; a refusal left exactly one marked comment naming what blocked it.

## Scope / hand-off

- The merge itself is profile `merge_skill`; the reset is profile `sync_base_skill`; anything that changed after
  the acceptance goes back to `operator-verify`.

## Constraints

- Never write `owner:*`, use `--admin`, relax protection, force-push or delete a remote branch.
- No new review, implementation or thread fixes here. The acceptance authorizes this merge only;
  releases are a separate flow.
