---
name: operator-intake
description: "Take the next non-conflicting item from the project's work queue into the development pipeline, adopt a pull request handed to the pipeline, or close an owner-rejected or cancelled attempt and maintain its queue item. Runs as the runtime's intake operation, or by hand."
argument-hint: "[nothing to take the next item, or a handed-off, rejected or cancelled PR number, when run by hand]"
---

# Operator intake

Intake owns selection and queue maintenance; it is the `intake` operation of `operator.yaml`. Load
the `operator-contract` skill first: input, result, claim and markers follow it.

| Contract | |
|---|---|
| Trigger | Subject `queue` with capacity (with `input.handoff` for a handed-off pull request), or `pr-<n>` carrying `owner:rejected` / `owner:cancelled` |
| Work | Select one queue item and open its pull request, or adopt the handed-off one into the slot; close abandoned attempts through profile `outcome_skill` (default `git-complete-pr`) |
| Evidence | PR URL and queue item path; for an adoption, the PR URL; for maintenance, outcome comment URL and queue commit SHA |
| Next | selected or adopted → `plan`; queue maintenance → `done`; no eligible item → `noop` |

## Steps

1. **Read the live state.** Work in the runtime's current checkout; `<slot>` is `input.member`, or
   the checkout's own name when run by hand. Read `operator_config`. For `pr-<n>`, re-read the PR first: compare head and milestone with
   the input, require OPEN, and check owner labels and claims. A moved head, changed milestone,
   `owner:onhold`, or another run's `ai:processing` (a HELD report, `operator-contract`) ends `noop` with its reason. Cancellation
   outranks rejection; without either label, `noop`. Require a clean slot; preserve foreign work.
   With `input.handoff`, adopt that pull request instead (step 7).
2. **Read the queue.** For `queue`, run profile `sync_base_skill` (default `git-sync-base`), then re-read all open PRs, their queue
   references and changed files (profile `forge_cli pr list` and `pr files <n>`). Check that `<slot>` is free: no open PR in a pipeline milestone has a branch naming it
   (`operator_config` `slots` lists the slots; a PR holds its slot from intake until it merges or
   closes). Read candidates on the freshly fetched integration branch,
   in the order profile `flow_queue` defines, with its eligibility rules; never rerank what it
   orders. When `operator_config` sets `quotas`, count the open pipeline PRs per source from their
   linked queue items and skip every candidate of a source already at its limit. A pull request a clarification slot holds
   (`operator_config` `clarifySlots`) is not delivery and counts against no quota.
3. **Apply the conflict gate.** Skip a candidate already represented by any open PR, including
   manual or failed attempts. Skip overlap with any open PR's files or feature: the same shared
   module, schema or route. Skip items waiting on a decision or
   on work not yet shipped. Read the likely implementation scope; a different filename does not
   prove independence. Nothing pickable → put every candidate's skip reason in the result message
   and end `noop`. Every candidate needing the owner → the contract's "intake itself cannot choose".
4. **Open the selected attempt.** Re-check that the slot is free, quotas and overlap immediately before branching.
   Create `<prefix><slot>-<slug>` (profile `branch_prefixes`: the bugfix prefix for a defect) from
   the freshly fetched integration branch with `git checkout --no-track -b`, and verify HEAD equals
   it before the first commit. Make exactly one reservation commit,
   `git commit --allow-empty -m "Took <item title> into the development pipeline"`, and push with
   `-u origin <branch>`. On retry, recover the existing branch and PR; never duplicate them.
   Call profile `open_pr_skill` (default `git-open-pr`) with the PR opened as a draft whenever `operator_config` sets `readyLimit`,
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
   direct lane for queue documents, record with profile `commit_skill` (default `git-commit-push`):
   - rejected: the reason and the failed PR on the item, which stays eligible; every recorded
     reason binds the next plan;
   - cancelled: the item leaves the queue the way `flow_queue` says items leave it.
   The queue change lands before the PR closes, because a closed PR is never taken again: a retry
   finds the record already there and goes straight to step 6.
6. **Then close the attempt.** Check out its head. Call profile `outcome_skill` to record `ai:failed`
   naming the owner's reason. Close the PR without deleting its remote branch, confirm CLOSED,
   record the local and remote SHAs, and run profile `sync_base_skill` for the branch. The slot's local
   PR branch is deleted even with unpushed commits - the owner ended the attempt; the report names
   the dropped local SHA - together with the local `operator/leftover/*` branches the PR's notes
   name (`operator-contract`), so the slot is free. Result `done`, no next.
7. **Adopt a handed-off pull request.** The owner put `operator_config` `labels.handoff` on an open
   pull request so the pipeline finishes it: work a manual session already clarified, or an attempt
   another agent left short of its requirements. The adoption keeps every commit and decision it
   carries and changes no code; plan revises its scope from what the pull request already settles.
   The label means the hand-over is done: nobody pushes to the old branch name after it.
   - Re-read it (profile `forge_cli pr view <n>`): require OPEN, `input.head`, the hand-off label,
     and none of `owner:onhold`, `owner:cancelled`, `owner:rejected`; anything else ends `noop` with
     the reason. It may sit in any milestone, Merge Queue included: the owner handed it back on
     purpose, and it returns to the queue milestone; its factors are left to the freshness rules.
     Quotas and the conflict gate do not apply, because the owner chose it. Check the slot is still
     free of other pull requests.
   - Rename first, while nothing else has changed: when its branch does not name `<slot>`,
     `forge_cli branch rename <n> --to <prefix><slot>-<slug>` (the branch's own prefix when it is one
     of profile `branch_prefixes`, else the feature prefix; the slug is its old last segment without a
     slot segment). The rename is idempotent; a failure (a fork head, missing rights) ends the run
     `failed` with nothing else changed, and the owner hands it over again. Re-read the pull request
     and require the head unchanged.
   - Then one claim edit makes it an ordinary queue pull request: `forge_cli pr edit <n> --claim
     --milestone "<queue title>" --remove-label <hand-off label>`, also removing any terminal state
     label an earlier run left and `labels.accepted` (the owner handed it back, so no acceptance
     stands); held (exit 3) is the contract's HELD report. From here a failure leaves a claimed queue
     pull request that stale-claim recovery takes over.
   - Fetch and check out the branch in the slot, tracking its remote, and require HEAD to equal the
     pull request's head.
   - Only when `operator_config` sets `readyLimit` and the pull request is ready,
     `forge_cli pr draft <n>`: QA capacity comes only from `operator-verify`'s admission.
   - Release the claim (`forge_cli claim release <n>`). Result `done` with the hand-off request
     (`operator-contract`).

## Run by hand

`/operator-intake` takes the next item; `/operator-intake <n>` adopts a pull request carrying the
hand-off label, or closes a rejected or cancelled attempt. To deliver the next item in one session instead of phase by phase, run `/dev-deliver-next` (core, when installed).

## Verify

- A selection left one draft pull request naming the queue item, in the queue milestone, opened from
  the freshly fetched integration branch, and the result names `plan`.
- Queue maintenance left the outcome comment on the closed pull request and the queue item's commit
  on the integration branch.
- An adoption left the pull request in the queue milestone, without the hand-off label or a claim,
  its branch naming the slot, and draft whenever `readyLimit` is set.

## Scope / hand-off

- The plan is `operator-plan`; a closed attempt's outcome comes from profile `outcome_skill`.
- The same pick in one session, without the runtime, is `dev-deliver-next` (core, when installed).

## Constraints

- One item and one PR per queue run. No implementation, merge or release here.
- Never write `owner:*` or delete a remote branch; removing the hand-off label of the pull request
  being adopted is this skill's, and a rename is not a deletion.
