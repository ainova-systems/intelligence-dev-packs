---
name: dev-deliver-next
description: "Picks the next non-conflicting item from the project's work queue - or the next N, each in its own worktree - and runs dev-deliver on it, then returns the checkout to the integration branch. The session counterpart of operator-intake."
argument-hint: "[count, default 1] [--pick to choose among the ranked candidates]"
---

# Deliver the next queue item

`dev-deliver` starts from the owner's sentence; this skill starts from the project's work queue and
hands each item it takes to `dev-deliver` as that sentence. It ranks nothing itself: the order, what
is eligible, and when related items ship together are profile `flow_queue`'s.

## Steps

1. **Start clean.** Run `git-sync-base`. A dirty tree or a checkout that cannot return to the
   integration branch is a stop: report what holds it, never discard work to proceed.
2. **Read the queue** on the freshly fetched integration branch, in the order `flow_queue` defines,
   with its eligibility rules. Never rerank what it orders. Items `flow_queue` says ship together
   (the same page, record or feature) are one task.
3. **Apply the conflict gate.** Skip a candidate already represented by an open pull request,
   including a manual or failed attempt; one whose files or feature overlap an open PR's - the same
   aggregate, UI feature folder, shared migration, translation or route; and one waiting on a
   decision or on work not yet shipped. A different filename does not prove independence: read the
   likely scope.
4. **Choose.** Take the top `count` eligible tasks, each disjoint from the others by the same gate.
   With `--pick`, show the ranked candidates with their skip reasons and let the owner choose. Nothing
   eligible → report every candidate's skip reason and stop: the queue needs an owner decision round,
   not a guess.
5. **Reserve each before working on it.** Other sessions and the orchestrated pipeline pick from the
   same queue, and they see only what a forge shows. Run the conflict gate again on the live open
   pull requests: an item an open pull request now represents is skipped, reported, and replaced by
   the next eligible one. Then create the item's branch from the freshly fetched integration branch,
   with the profile's prefix (the bugfix prefix for a defect), push one empty reservation commit (`Took <item title> into delivery`) and open it as a draft
   pull request through `git-open-pr`, naming the item and stating that implementation has not
   started. The draft is the reservation: work kept only in a local checkout is invisible to every
   other picker.
6. **Deliver each.** Run `dev-deliver` with the item's path as the task, on its reserved branch and
   pull request. With more than one task, each runs as a parallel instance (`dev-deliver` > Parallel tasks; profile
   `worktree_policy`, `worktree_create`, `worktree_remove`). Whatever the item itself instructs for
   its own lifecycle - a status to push when work starts, a field to set in the change that resolves
   it - is part of its task.
7. **Return.** Each instance ends where `dev-deliver` ends it - the accept gate, or an outcome label
   when nobody is there to ask. Then run `git-sync-base` and report per task: the item, the pull
   request, its outcome label and what the owner has to do next.

## Verify

- Each task taken has a draft pull request created before any work on it, and the report names each
  task's outcome label; the checkout ends on the integration branch.

## Scope / hand-off

- Each task runs through `dev-deliver`; the reset is `git-sync-base`; the same pick phase by phase
  under the runtime is `operator-intake`.

## Constraints

- Never take an item an open pull request represents, and never two overlapping items at once.
- Never work on an item before its draft pull request exists.
- The queue is read, not edited, except where `flow_queue` says an item records that work started.
- Never merge; merging is `git-merge-pr` on the owner's accept.
