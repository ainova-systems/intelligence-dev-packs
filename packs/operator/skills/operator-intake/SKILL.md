---
name: operator-intake
description: "Take the next non-conflicting item from the project's work queue into the development pipeline, or close an owner-rejected or cancelled attempt and maintain its queue item. Runs as the runtime's intake operation, or by hand."
argument-hint: "[nothing to take the next item, or a rejected or cancelled PR number, when run by hand]"
---

# Operator intake

Intake owns selection and queue maintenance; it is the `intake` operation of `operator.yaml`. Load
the `operator-contract` skill first: input, result, claim and markers follow it.

| Contract | |
|---|---|
| Trigger | Subject `queue` with capacity, or `pr-<n>` carrying `owner:rejected` / `owner:cancelled` |
| Work | Select one queue item and open its pull request; close abandoned attempts through `git-complete-pr` |
| Evidence | PR URL and queue item path; for maintenance, outcome comment URL and queue commit SHA |
| Next | selected → `plan`; queue maintenance → `done`; no eligible item → `noop` |

## Steps

1. **Read the live state.** Work in the runtime's current checkout; `<slot>` is `input.member`, or
   the checkout's own name when run by hand. Read `operator_config`. For `pr-<n>`, re-read the PR first: compare head and milestone with
   the input, require OPEN, and check owner labels and claims. A moved head, changed milestone,
   `owner:onhold`, or another run's `ai:processing` ends `noop` with its reason. Cancellation
   outranks rejection; without either label, `noop`. Require a clean slot; preserve foreign work.
2. **Read the queue.** For `queue`, run `git-sync-base`, then re-read all open PRs, their queue
   references and changed files (profile `forge_cli pr list` and `pr files <n>`). Check that `<slot>` is free: no open PR in a pipeline milestone has a branch naming it
   (`operator_config` `slots` lists the slots; a PR holds its slot from intake until it merges or
   closes). Read candidates on the freshly fetched integration branch,
   in the order profile `flow_queue` defines, with its eligibility rules; never rerank what it
   orders. When `operator_config` sets `quotas`, count the open pipeline PRs per source from their
   linked queue items and skip every candidate of a source already at its limit. A pull request a clarification slot holds
   (`operator_config` `clarifySlots`) is not delivery and counts against no quota.
3. **Apply the conflict gate.** Skip a candidate already represented by any open PR, including
   manual or failed attempts. Skip overlap with any open PR's files or feature: the same aggregate,
   UI feature folder, shared migration, translation or route. Skip items waiting on a decision or
   on work not yet shipped. Read the likely implementation scope; a different filename does not
   prove independence. Nothing pickable → put every candidate's skip reason in the result message
   and end `noop`. Every candidate needing the owner → the contract's "intake itself cannot choose".
4. **Open the selected attempt.** Re-check that the slot is free, quotas and overlap immediately before branching.
   Create `<prefix><slot>-<slug>` (profile `branch_prefixes`: the bugfix prefix for a defect) from
   the freshly fetched integration branch with `git checkout --no-track -b`, and verify HEAD equals
   it before the first commit. Make exactly one reservation commit,
   `git commit --allow-empty -m "Took <item title> into the development pipeline"`, and push with
   `-u origin <branch>`. On retry, recover the existing branch and PR; never duplicate them.
   Call `git-open-pr` with the PR opened as a draft whenever `operator_config` sets `readyLimit`,
   whatever count the project's own opening policy reads: QA capacity goes only to drafts
   `operator-verify` admits oldest-first, never to an empty reservation. Link the queue item, take
   verification steps from it (plan refines them), state that implementation has not started, and
   claim no passing gates. Re-read the new PR,
   claim it under the contract, then one edit sets the queue milestone and removes
   `ai:processing`. The slot stays on the new branch: the PR holds it now. Result `done` with the
   hand-off request (`operator-contract`).
5. **Record the queue change first.** For a PR subject, claim it. Read the linked item and the
   owner's reason; recover a deleted item from history. A missing reason is an owner question with
   `resume: intake`, never an invented reason. On the integration branch, through the profile's
   direct lane for queue documents, record with `git-commit-push`:
   - rejected: the reason and the failed PR on the item, which stays eligible; every recorded
     reason binds the next plan;
   - cancelled: the item leaves the queue the way `flow_queue` says items leave it.
   The queue change lands before the PR closes, because a closed PR is never taken again: a retry
   finds the record already there and goes straight to step 6.
6. **Then close the attempt.** Check out its head. Call `git-complete-pr` to record `ai:failed`
   naming the owner's reason. Close the PR without deleting its remote branch, confirm CLOSED,
   record the local and remote SHAs, and run `git-sync-base` for the branch. A closed attempt's local
   slot branch is deleted once its commits are confirmed on the remote; result `done`, no next.

## Run by hand

`/operator-intake` takes the next item; `/operator-intake <n>` closes a rejected or cancelled
attempt. To deliver the next item in one session instead of phase by phase, run `/dev-deliver-next`.

## Verify

- A selection left one draft pull request naming the queue item, in the queue milestone, opened from
  the freshly fetched integration branch, and the result names `plan`.
- Queue maintenance left the outcome comment on the closed pull request and the queue item's commit
  on the integration branch.

## Scope / hand-off

- The plan is `operator-plan`; a closed attempt's outcome comes from `git-complete-pr`.
- The same pick in one session, without the runtime, is `dev-deliver-next`.

## Constraints

- One item and one PR per queue run. No implementation, merge or release here.
- Never write `owner:*` or delete a remote branch.
