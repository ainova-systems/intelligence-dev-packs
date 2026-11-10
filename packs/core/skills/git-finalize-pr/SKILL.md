---
name: git-finalize-pr
description: "Drives an open pull request through rounds of fix, verification and review until every success factor holds on one commit, and ends only at an outcome label. Opening it is git-open-pr; recording the outcome is git-complete-pr."
argument-hint: "[pr number]"
---

# Finalize the PR

Orchestrate an open PR to accept-ready: CI green, the PR's own verification steps passed, the diff reviewed - all on the **same** head commit. This skill is the only actor here that pushes; the stages it calls only judge. Runs autonomously across CI rounds; wait reactively, never busy-poll.

## The state this run leaves behind

This skill sets `ai:processing` (`git-workflow`), so the run has one expected final state: that claim gone, replaced by the single outcome label `git-complete-pr` writes and chooses. Three middles read like an ending, and each continues the run instead: a check still running is waited for, sized to the job; a stop rule ends the fix loop and the run carries on into `git-complete-pr`; a stage that cannot run at all - no environment, a capability the forge lacks - is a finding that reaches the owner in the outcome's list. A run that reports progress and waits to be invoked again leaves a claim no later run takes (pre-flight step 4; `references/rationale.md`).

## Pre-flight

1. `git branch --show-current` - abort on the default/integration/protected branch.
2. Resolve the PR: `gh pr list --head <branch> --state open --json number,headRefOid,isDraft --jq '.[0]'`. An explicit argument must match this branch's PR. None - open it with `git-open-pr` first, then retry.
3. Declared factors: profile `pr_success_factors` (default `ai:verified, ai:reviewed`). A factor no stage in this project writes still gates the run - it is simply someone else's to apply.
4. Take the PR (`git-workflow` > autonomous PR labels). An `ai:processing` that is not this run's claim by that rule is never taken: post the `## Finalize - HELD` refusal (`git-pr-labels` > Refusing a claim) and STOP, writing nothing else. Otherwise set `ai:processing` and clear every factor that is not fresh at head.
5. **A draft** is marked ready now, `gh pr ready <pr>`, when profile `draft_ready` is `finalize` (default), since nothing a draft reports is evidence (*CI green*). With `owner` it stays a draft, not this run's to mark: step 2 reads no checks, and once nothing fixable is left the draft is an owner-decision item.

## The round

`HEAD_SHA` is re-read at the top of every round; every probe below filters by it, so runs and reports for older commits are ignored.

**The first pass is round 1, and the budget is read here**, before any of the round's work: a run that has completed profile `max_pr_rounds` rounds begins none; `unlimited` sets no budget. The count belongs to the run and survives a hand-off to `git-complete-pr` and back, each way in incrementing it. A project that needs more raises the key; a run never grants itself one (`references/rationale.md`).

1. **Head moved, and not by this run** - someone else is on the branch. Clear the factors and restart the round. Twice in a row: stop, and hand to `git-complete-pr` as an owner decision - two actors on one branch is a coordination failure, not a merge conflict.
2. **CI**, read as *CI green* below. A conflict from its trial merge goes to the conflict skill (Scope / hand-off). Queued, in progress, or nothing reported yet - wait, sized to the longest job's typical duration. Still not green with no failure to fix - a required check skipped, cancelled or never reported - queues as an owner-decision item naming that check, or profile `required_checks` when nothing reported at all. A failure on HEAD_SHA, required or not, is traced to its root-cause file:line and queued as a defect (`references/ci-green.md` > Tracing a failure).
3. **`ai:verified` fresh on HEAD_SHA and on the current steps** (its report's steps digest, `git-verify-pr` > Digests)? No - run `git-verify-pr` (Isolation). A pass earns the factor; failures queue as defects; each `blocked` kind is sorted by `references/round-steps.md` > Sorting a verification report, which never retries `blocked (project)` and sends `blocked (workspace)` to no owner.
4. **`ai:reviewed` fresh on HEAD_SHA and on the current body** (its report's body digest, `git-review-pr`)? No - run `git-review-pr` (Isolation). The Critical entries of its Unresolved list queue as defects; warnings and suggestions stay in that record. No verdict at all - a capability the forge lacks - is an owner-decision item never retried round after round, unless the workspace is why (Isolation).
5. **Fixable defects queued?** Fix them all, smallest-correct, top-down (`references/round-steps.md` > Fixing the queued defects). Run the local gates (`dev-run-tests`), then commit the **whole round as one commit** via `git-commit-push` and push. Re-set `ai:processing`, clear the factors, round += 1, back to 1. A body fix is `git-open-pr` rebuilding it and pushes nothing: clear only the factors whose report named the body among its inputs, and re-run those stages. A declared verification step is corrected only as `references/round-steps.md` > Correcting a declared step allows; a step that ran and failed is a code defect.
6. **Nothing fixable left** - in a spec-driven project, each spec the pull request delivers (`spec.mjs delivered --base origin/<target>`, `spec-validate`) that `spec.mjs status` does not read `completed` queues first as an owner-decision item naming its state. Then hand to `git-complete-pr`. If it pushes a fix of its own, control returns here: round += 1, back to 1.

## CI green

The one definition every skill that gates on CI reads. A commit is **CI green** when every required check reports success on it. Skipped, cancelled, neutral, timed out, pending and absent are not green, an empty list is not green, nothing reported on a draft is evidence, and a list the forge will not show is a capability gap (`git-pr-labels` > The forge).

The required set is profile `required_checks` for the branch the commit is headed to: `auto` (default) - that branch's rulesets and protection, or, when they require nothing, every check that reported, at least one; a list of names pins it; `none` - the project runs no CI, every commit counts as green, and the outcome report says so. A head that conflicts with its base runs no checks, so a trial merge settles the conflict first, never the forge's `mergeable` flag. The reads and the trial merge are `references/ci-green.md`.

## Stop rules

Each ends the run through `git-complete-pr` with the reason stated - never by quietly continuing, and never by quietly stopping:

- The same defect signature returns after a fix round: stop fixing it.
- A factor already earned is lost twice in a row: the fixes are fighting each other.
- The round budget (`max_pr_rounds`, default 3) is spent, read as *The round* states, so none is ever judged past it.
- An owner-decision item is queued and nothing fixable remains.

## Isolation

The two judging stages carry their own `access: readonly` agent (`dev-qa-verifier`, `dev-code-reviewer`) and are forked skills (`context: fork`, `background: false`): invoked with the PR number, each runs in its own subagent that sees only the skill and its arguments, and the round has the verdict before it goes on. On a tool that does not fork skills, this run starts that subagent itself, with the skill's agent and the same pointers.

Neither the location a stage judges nor the refs it resolves against move while it runs: no switch, no commit, no fetch, no pull until the round's stages have returned; holding it still is this skill's. A stage that finds its workspace moved writes no factor and says so - the one stage report this skill clears itself, by holding the location still and running the stage again inside the same round. Twice in a row is a second actor on the workspace: step 1's coordination failure, the owner's. A stage that needs room to probe in uses a throwaway repository, never a worktree of the repository under judgement (`references/round-steps.md` > Room to probe). The reasons are `references/rationale.md`.

## Verify

- What it published holds nothing `git-commit-conventions` forbids in a published artifact.
- Every declared factor fresh at HEAD_SHA and CI green there, or the run ended through `git-complete-pr` with a named reason.
- `gh pr view <pr> --json labels` shows one outcome label and no `ai:processing`.

## Scope / hand-off

- Opening the PR - `git-open-pr`; review threads and the outcome - `git-complete-pr`; merging - `git-merge-pr` after the owner accepts.
- A conflict with the base (*CI green*) - the profile `conflict_skill` (default `git-resolve-conflicts`), then back into the round.

## Constraints

- A failure that already exists on the target branch is reported as pre-existing, never "fixed" on this PR.
- One commit per round, never one per defect (`references/rationale.md` > One commit per round).
- Never write a factor label - only the stage that judged it may - and never write an outcome.
- Never merge, even when everything is green: accepting the PR is the owner's gate.
