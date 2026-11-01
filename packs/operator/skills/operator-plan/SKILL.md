---
name: operator-plan
description: "Capture the acceptance criteria and write the implementation plan for one queued pull request, then hand it to the `development` milestone. Runs as the runtime's plan operation, or by hand."
argument-hint: "[PR number when run by hand; the runtime passes $OPERATOR_INPUT]"
---

# Operator plan

Plan captures the intended result before any implementation; it is the `plan` operation of
`operator.yaml`. Load the `operator-contract` skill first.

| Contract | |
|---|---|
| Trigger | A PR in the queue milestone, including a resumed planning question |
| Work | Profile `capture_skill` (default `dev-deliver` Phase A); the plan on the queue item, or profile `flow_plan` for feature-sized work; the PR's verification section; profile `commit_skill` (default `git-commit-push`) |
| Evidence | plan commit SHA, queue item path and PR URL |
| Next | complete → development milestone, `implement`; open question → `needs-input`, resume `plan` |

## Steps

1. **Re-check the PR.** Require OPEN and the queue milestone. A head different from `input.head`,
   another milestone, `owner:onhold`, or another run's `ai:processing` ends `noop`.
2. **Claim and check out** the PR branch at its live head. Read the linked queue item, its feature
   documentation and any plan commits; reuse a completed capture on retry. The intake reservation is
   not a planning commit.
3. **Capture the outcome.** Run only profile `capture_skill` against the item and the repository,
   answering from them what they already settle. Capture the business goal, observable acceptance
   criteria and scope exclusions. Address every recorded rejection reason. Validate the proposed
   patterns against shipped siblings and the project rules.
4. **Write the plan** on the queue item: capture, decisions, deviations and testable slices, each
   naming its files, siblings, skills, integration points and verification. Feature-sized work gets
   its plan from profile `flow_plan`, linked from the item and the PR, never a second plan beside
   it. A real open question goes to the owner (`resume: plan`); commit settled planning first and
   keep the milestone.
5. **Publish the acceptance contract.** Fill the PR body's verification section (profile
   `verify_section`) with the captured criteria verbatim, one observable step per criterion
   (`git-open-pr` sets the same rule when core is installed). Edit the live body, keeping every
   other section and block intact. Commit and push the plan through
   profile `commit_skill`; an identical capture already published is reused, never committed empty.
6. **Hand off.** All in-scope questions settled → re-check live state, then one call moves the PR
   to the development milestone and drops `ai:processing`. Result `done` with the hand-off request
   (`operator-contract`).

## Run by hand

`/operator-plan <n>`; it ends naming `/operator-implement <n>`.

## Verify

- The plan commit is on the pull request's head, the verification section is filled, and the pull
  request sits in the development milestone with no claim left on it.

## Scope / hand-off

- Implementation rounds are `operator-implement`; a feature-sized plan is profile `flow_plan`.

## Constraints

- No implementation, judging stage, merge or release. The capture runs without continuing into
  the rest of the delivery (core's `dev-deliver` when installed).
- In-scope unresolved behaviour is an owner question, never a deferred enhancement.
