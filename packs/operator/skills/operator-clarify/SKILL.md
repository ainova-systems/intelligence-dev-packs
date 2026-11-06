---
name: operator-clarify
description: "Take the most important queue item waiting on an owner decision, plan its answer, settle it with the owner one question at a time in a documentation pull request, and merge it once every question is answered. Runs as the runtime's clarify operation, or by hand."
argument-hint: "[nothing to select the next item, or a clarification PR number, when run by hand]"
---

# Operator clarify

Clarification turns a queue item that waits on an owner decision into one that is ready to deliver;
it is the `clarify` operation of `operator.yaml`, and runs only in the clarification slots
(`operator_config` `clarifySlots`). Load the `operator-contract` skill first: input, result, claims,
questions and markers follow it. The pull request changes documents only and carries no success
factors: the owner's answers are its review, and the owner does not read it again before it merges.

| Contract | |
|---|---|
| Trigger | `input.step`: `select` (subject `clarify-queue`, a free clarification slot, ranked `candidates`); `clarify` (the clarification milestone, or owner input after the last report); `close` (`owner:rejected` / `owner:cancelled`); `merge` (a `## Clarification - READY` report at the head, or `owner:accepted`) |
| Work | Select one item and open its draft pull request; plan the answer from the repository; ask the owner one question at a time; record each answer in the documents |
| Evidence | PR URL, item path, commit SHAs, the `## Clarification` report URL; merge SHA |
| Next | questions settled → `mergeQueue`, no next (discovery asks for `merge` once CI decides); open question → `needs-input`, resume `clarify`; merged or closed → `done` |

## Select (`step: select`)

1. **Read the live state.** `<slot>` is `input.member`, or the checkout's own name when run by
   hand. Require a clean slot no open pipeline PR holds (its branch names the slot), then run
   profile `sync_base_skill` (default `git-sync-base`).
2. **Pick one item.** Re-read each of `input.candidates` (by hand: profile `operator_discover
   --standalone` lists none, so rank the queue's items waiting on a decision the way profile
   `flow_queue` orders them) on the freshly fetched integration branch. Drop one no longer waiting
   on a decision or already named by an open PR (profile `forge_cli pr list`). Discovery ranked them by the owner's
   `clarifyFirst`, folder, priority and dependents; choose the one whose settled answer gives the
   business the most today, by profile `clarify_priority`, keeping discovery's order on a tie. An
   item flagged `clarifyFirst` is taken first whatever today's priority says. Nothing left → `noop`
   naming why.
3. **Open the attempt.** Create `<clarify_branch_prefix><slot>-clarify-<slug>` (profile
   `clarify_branch_prefix`) from the freshly fetched integration branch with `git checkout --no-track -b`, verify HEAD equals it, then do
   step 4's planning before the first commit, so the pull request opens with substance. Push with
   `-u origin <branch>` and call profile `open_pr_skill` (default `git-open-pr`) as a draft with this skill's `assets/pr-template.md`
   as the template, never the implementation one: a clarification PR declares no verification steps
   or automated gates, only Task, Approach and Open questions, so a reader is into the problem in
   seconds. Say in Task which candidates were weighed and why this one. Claim the new PR, set the
   clarification milestone, and go on with Clarify in this run.

## Clarify (`step: clarify`)

4. **Plan by yourself first.** Re-check the PR (contract), claim it, check out its live head, reconciling the slot
   first (`operator-contract` > The slot stays with its pull request); a PR
   in `humanReview` or `mergeQueue` moves back to the clarification milestone in the claim edit. Verify the item's
   claims against the shipped code and the feature documentation; settle from the repository
   everything it already answers. Write the proposed resolution on the item - what changes, the
   options weighed, the recommendation and why - and update the feature document it concerns.
   Commit through profile `commit_skill` (default `git-commit-push`). A resumed run first records the owner's answer (contract),
   writes it into the item and the feature document, and commits that. Keep the PR body's Approach
   and Open questions current with every commit (`Decided: <answer>` on an answered question), written
   back with profile `forge_cli pr edit <n> --body-file <file>`.
5. **Ask what only the owner can decide, one question at a time.** Each question names its context
   in a few lines, two to four options and the recommended one (contract, *Asking the owner*;
   `resume: clarify`). A business change - a consumer dropped, a rule widened, a settled decision
   reversed - is always asked, never assumed. Owner input after the last report that is not an
   answer is applied the same way, and asked about only where it leaves something open.
6. **Settle it.** When nothing is open: set the item ready the way profile `flow_queue` marks it -
   its status, the cleared decision blockers, the verified date - and the body's Open questions to
   `None` with every answer kept, commit and push. Post the report `## Clarification - READY`,
   `head: <sha>`, then each decision in one line and the documents changed. One edit moves the PR to
   `mergeQueue` and drops `ai:processing`. Result `done`, no next: discovery asks for `merge` once CI
   on that head decides, and owner input before then asks for `clarify` again.

## Close (`step: close`)

7. Claim it. Record the outcome on the item on the integration branch, through the profile's direct
   lane for queue documents: rejected → the owner's reason, the item stays waiting and the next
   attempt starts from that reason; cancelled → the reason and `clarifySkip: true`, so it is not
   offered again. A missing reason is an owner question (`resume: clarify`). Then post one note
   naming the outcome, close the PR without deleting its remote branch, drop the claim, and run
   profile `sync_base_skill` for the branch.

## Merge (`step: merge`)

8. **Validate.** Require OPEN, `humanReview` or `mergeQueue`, a last `## Clarification - READY`
   report naming the live head (or `owner:accepted`), no owner input after it, and no `owner:onhold`,
   rejection or cancellation. Every changed path is within the profile's direct lane for documentation and queue
   documents: anything else refuses the merge with one note. Every required check green on this
   head, no unresolved thread, no standing change request.
9. **Merge.** Take no claim; the PR carries no `ai:*` label, so profile `merge_skill` (default `git-merge-pr`) judges it on checks,
   threads and its guards. Check out the head, move it to `mergeQueue`, profile `forge_cli pr ready <n>`, then
   invoke profile `merge_skill`: the owner's answers recorded in the READY report are the authorization, as
   the owner set for clarification pull requests (or `owner:accepted`). Record its confirmed merge
   SHA and run profile `sync_base_skill`. Stale evidence → one note naming it, `noop`.

## Run by hand

`/operator-clarify` selects the next item; `/operator-clarify <n>` continues, closes or merges a
clarification PR by its state.

## Verify

- A settled item reads ready with every decision recorded in the item and its feature document, and
  a `## Clarification - READY` report names the pull request's head.
- A merge leaves the documentation pull request merged and the slot back on the integration branch.

## Scope / hand-off

- Delivery of the settled item is `operator-intake` on a later pick; the merge itself is
  profile `merge_skill`.

## Constraints

- One item and one PR per run; documents only - no code, migration or workflow change.
- Never write `owner:*` beyond the question label, use `--admin` or delete a remote branch.
- Never mark an item ready while a decision on it is open, and never answer a question for the owner.
