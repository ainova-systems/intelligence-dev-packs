---
name: operator-implement
description: "Run one Development round for a pull request through the project's implementation skill, then hand the pushed head to review, or a complete, reviewed, green head to `verification`. Runs as the runtime's implement operation, or by hand."
argument-hint: "[PR number when run by hand; the runtime passes $OPERATOR_INPUT]"
---

# Operator implement

The Development phase's wrapper, the `implement` operation of `operator.yaml`. The work itself is
profile `flow_implement` (core's `dev-deliver` runs the same skill for its Phase B); this skill owns when a
round runs, the claim, the hand-off to review and the move to `verification`. Load the
`operator-contract` skill first.

| Contract | |
|---|---|
| Trigger | A PR in the development milestone with implementation, CI, review, verification or owner work pending; a PR in any later milestone that conflicts with the integration branch |
| Work | one `flow_implement` round ending at profile `commit_skill` (default `git-commit-push`); profile `threads_skill` (default: the Threads procedure of `git-complete-pr`) for review threads |
| Evidence | pushed head SHA and PR URL |
| Next | pushed or unreviewed → `review`; complete, reviewed and green → `verification`, `verify`; CI pending → `noop` |

## Steps

1. **Re-check the PR.** Require OPEN and the development milestone, or `input.reason: conflict` with
   the live PR still conflicting with the integration branch (profile `forge_cli pr view <n>`: `mergeable` reads `conflicting`), in
   any later milestone. A moved `input.head`, `owner:onhold`, or another run's `ai:processing` (a HELD report, `operator-contract`) ends
   `noop` (a stopped run's claim is taken over, `operator-contract`); rejected and cancelled attempts
   belong to intake.
2. **Claim the PR in its slot.** A conflicting PR from a later milestone moves back to the
   development milestone in the claim edit, removing an obsolete `ai:completed`: the merged head is
   reviewed and verified again on its way back. The slot is normally already on the PR branch at the
   live head (`operator-contract`); check it out there when it is not. A slot on another branch with
   uncommitted work ends `failed` naming it. Read CI from the head's checks
   (profile `forge_cli checks <head>`, the latest attempt of each workflow), the latest `## Code review` and
   `## Verification` reports (profile `forge_cli notes <n>`), owner input newer than the last stage
   report (profile `operator_discover --owner-input <n>`) and every unresolved review thread
   (profile `forge_cli threads <n> --unresolved`).
3. **Name the pending work.** Any of: no implementation commits yet (the reservation and the plan
   commit do not count); CI red at the head; actionable findings in the latest `## Code review`
   report at the head; a fix verification sent back (`input.evidence`: a failing `## Verification`
   report, an owner comment or a QA ticket); owner input newer than the last stage report;
   unresolved review threads; plan slices not yet shipped; a conflict with the integration branch.
   The plan is on the queue item (or profile `flow_plan`'s file); a pull request without a queue item
   keeps it in its body's `## Plan` section, and a handed-off one plans only the remaining work from
   its current head, whose existing commits count as implementation.
   A verification step sent back as defective is corrected only where it names or describes
   something that does not exist. A step whose declared conditions - viewport, role, data, default
   state - show the promised behaviour missing reports a code defect: fix the code. Moving the step to
   conditions where it passes rewrites the expectation to fit the failure, which only the owner may
   decide, as a question with `resume: implement`.
4. **Run one round.** Run `flow_implement` on this PR, naming the pending work; the round ends at one
   profile `commit_skill`, with no pre-commit review pass and no CI wait, which belong to this phase.
   Reply to and resolve review threads through profile `threads_skill`. An owner
   decision is a question with `resume: implement`.
   Bring the integration branch in first (profile `update_strategy`, conflicts through profile
   `conflict_skill`) when the round will push anyway or the PR conflicts with it; never merge it
   in only because it moved, which restarts CI and the review with nothing else to judge.
   A check that reverts the fix to watch a test go red runs in a throwaway worktree at the same head,
   detached so it leaves no branch behind (`git worktree add --detach`, then `git worktree remove`),
   never in the slot: a run that stops midway must not leave the slot's tree half reverted.
5. **Hand the head to review** after a push, or when no review at the head is fresh for the current
   body (`operator-contract` > `references/pr-state.md`). When profile `pr_risk_size` is on, first
   recompute the body's Risk/Size line from the head's diff by profile `open_pr_skill`'s (default
   `git-open-pr`) rules (edit the live body, every other part intact), so the body the review judges
   is the one that moves on. The review judges the slot itself, read-only: leave it clean at the
   head (`git status --porcelain` empty, HEAD equal to the live head) and write the live PR body
   beside the checkout, profile `forge_cli pr body <n> > <slot-root>.review/pr-<n>-<head>.body.md`.
   Release the claim and end `done` with `next: review`, subject `pr-<n>`, input
   `{ pr, head, checkout: <slot root, absolute>, body: <absolute path> }`, and key `review:<head>:oe-<id>`,
   where `<id>` is the latest `owner:*` label event on the PR (profile `forge_cli events <n>`,
   `none` when there is none): a review that a
   pause interrupted is then asked for again. When this round pushed nothing because the review
   standing at the head judged an older body, the key ends `:b-<body digest>` (profile
   `operator_discover --body-digest <n>`), so each body version is reviewed once. When no report
   stands at the head because an earlier review's could not be posted, the key ends `:retry-<run.jobId>`,
   because the plain key names the finished review and would match it instead of reviewing again.
   The runtime keeps the review in this slot.
6. **Move a finished head on.** Nothing pending, the plan complete (documentation finalization
   included, as the project's rules require), a `## Code review` report at the head with no
   Critical, the review factor fresh when `pr_success_factors` declares it, and CI green → one call
   moves the PR to the verification milestone, drops `ai:processing`, and replaces the title intake
   reserved with what the change does (the project's one-line commit style - core's `git-commit-conventions` when installed - since the
   squash publishes it); the body stays as the review judged it (step 5). Then the
   hand-off request (`operator-contract`). CI still running → release the claim, `noop` naming it.
7. **Leave the slot on the PR branch** at the head this run pushed (`operator-contract`); keep the
   body file for the review.

## Run by hand

`/operator-implement <n>`. Step 5 then runs profile `review_skill` (default `git-review-pr`) itself, through profile `judge_runner`,
instead of handing the head to the runtime, and posts its report, label and body note as
`operator-review` step 3 does; repeat until step 6 moves the PR on.

## Verify

- After a round the pushed head is the pull request's head and the result asks for `review` at it.
- A move to verification happens only with a review report at the head with no Critical finding,
  every declared factor fresh and CI green on that head.

## Scope / hand-off

- Review is the runtime's `review` job, posted by `operator-review`; verification is
  `operator-verify`; the work itself is profile `flow_implement`.

## Constraints

- In the runtime the review is the `review` job, posted by `operator-review`: never a reviewer of
  this session's own, and no stand-in when its engine is unavailable.
- Fix forward; never revert or rewrite pushed work. Never award a factor, merge, or promote a draft.
