---
name: git-finalize-pr
description: "Drives an open pull request through rounds of fix, verification and review until every success factor holds on one commit, and ends only at an outcome label. Opening it is git-open-pr; recording the outcome is git-complete-pr."
argument-hint: "[pr number]"
---

# Finalize the PR

Orchestrate an open PR to accept-ready: CI green, the PR's own verification steps passed, the diff reviewed - all on the **same** head commit. This skill is the only actor here that pushes; the stages it calls only judge. It writes no outcome and never merges. Runs autonomously across CI rounds; wait reactively, never busy-poll.

## The state this run leaves behind

`ai:processing` says an agent holds this pull request right now (`git-workflow`), and this skill puts it there. So the run has one expected final state: that claim gone, replaced by the single outcome label `git-complete-pr` writes - which one is `git-complete-pr`'s, where the escalation criteria live once.

Three middles read like an ending, and each continues the run instead:

- **A check still running.** Waiting is a step of the round, sized to the job.
- **A stop rule.** Each below ends the fix loop; the run carries on into `git-complete-pr` and ends there.
- **A stage that cannot run at all** - no environment, a capability the forge lacks - is a finding that reaches the owner in the outcome's list.

A run that reports progress and waits to be invoked again leaves a claim no later run takes (pre-flight step 4); `references/rationale.md` says why.

## Pre-flight

1. `git branch --show-current` - abort on the default/integration/protected branch.
2. Resolve the PR: `gh pr list --head <branch> --state open --json number,headRefOid,isDraft --jq '.[0]'`. An explicit argument must match this branch's PR. None - open it with `git-open-pr` first, then retry.
3. Declared factors: profile `pr_success_factors` (default `ai:verified, ai:reviewed`). A factor no stage in this project writes still gates the run - it is simply someone else's to apply.
4. Take the PR (`git-workflow` > autonomous PR labels). An `ai:processing` that is not this run's claim by that rule is never taken: post the `## Finalize - HELD` refusal (`git-pr-labels` > Refusing a claim) and STOP, writing nothing else. Otherwise set `ai:processing` and clear every factor that is not fresh at head.
5. **A draft** is marked ready now, `gh pr ready <pr>`, when profile `draft_ready` is `finalize` (default), since nothing a draft reports is evidence (*CI green*). With `owner` it stays a draft, not this run's to mark: step 2 reads no checks, and once nothing fixable is left the draft is an owner-decision item.

## The round

`HEAD_SHA` is re-read at the top of every round; every probe below filters by it, so runs and reports for older commits are ignored.

**The first pass is round 1, and the budget is read here** - before any of the round's work, so a run that has completed profile `max_pr_rounds` of them begins none, and no round is ever judged after the budget ran out; `unlimited` sets no budget. The count belongs to the run, not to either skill: it survives a hand-off to `git-complete-pr` and back, each way in incrementing it. A project that needs more raises the key; a run never grants itself one.

1. **Head moved, and not by this run** - someone else is on the branch. Clear the factors and restart the round. Twice in a row: stop, and hand to `git-complete-pr` as an owner decision - two actors on one branch is a coordination failure, not a merge conflict.
2. **CI**, read as *CI green* below. A conflict from its trial merge goes to profile `conflict_skill` (default `git-resolve-conflicts`), then back into the round. Queued, in progress, or nothing reported yet - wait, sized to the longest job's typical duration. Still not green with no failure to fix - a required check skipped, cancelled or never reported - queues as an owner-decision item naming that check, or profile `required_checks` when nothing reported at all. A failure on HEAD_SHA, required or not - drill in: its run from `gh run list --commit <HEAD_SHA> --json databaseId,name,conclusion`, the failed step via `gh run view <run_id> --json jobs --jq '.jobs[] | select(.conclusion == "failure")'`, the log via `gh run view --job <job_id> --log` (fallback `gh api repos/{owner}/{repo}/actions/jobs/<job_id>/logs` while sibling jobs still run). Find the root-cause file:line, read it and the surrounding code, queue the defect.
3. **`ai:verified` fresh on HEAD_SHA and on the current steps** (its report's steps digest, `git-verify-pr` > Digests)? No - run `git-verify-pr` (Isolation). A pass earns the factor; failures queue as defects; `blocked (step)` queues as an owner-decision item for this PR - unless the report names the step itself as the cause, in which case it is a body defect and goes to step 5. `blocked (project)` queues as one too, but as a standing configuration gap - never retry it round after round. `blocked (workspace)` is this run's own failure and reaches no owner: Isolation holds the location still and runs the stage again inside this round.
4. **`ai:reviewed` fresh on HEAD_SHA and on the current body** (its report's body digest, `git-review-pr`)? No - run `git-review-pr` (Isolation). The Critical entries of its Unresolved list queue as defects; warnings and suggestions do not, and stay in that record. A stage that returns no verdict at all - a capability the forge lacks - queues as an owner-decision item and, like `blocked (project)`, is never retried round after round, since a re-run changes nothing about why it could not answer - unless the workspace is why, which Isolation holds still and re-runs inside this round.
5. **Fixable defects queued?** Fix them all, smallest-correct, top-down (what happened - what changed since last green - fix or delete per the feature doc - is there an existing primitive?). Run the local gates (`dev-run-tests`), then commit the **whole round as one commit** via `git-commit-push` and push. Re-set `ai:processing`, clear the factors, round += 1, back to 1. A fix to the PR body is `git-open-pr` rebuilding it, and alone it pushes nothing: head stays put, so clear only the factors whose report named the body among its inputs, and re-run those stages.

   A declared verification step is corrected only where it names something that does not exist, or asks for what the stage cannot do (a branch or a commit on the workspace it holds still). A step that ran and failed is a code defect: fix the code. Changing a step's conditions - role, viewport, data, default state - or its expected result rewrites the expectation to fit the failure, and is an owner-decision item.
6. **Nothing fixable left** - in a spec-driven project, each spec the pull request delivers (`spec.mjs delivered --base origin/<target>`, `spec-validate`) that `spec.mjs status` does not read `completed` queues first as an owner-decision item naming its state. Then hand to `git-complete-pr`. If it pushes a fix of its own, control returns here: round += 1, back to 1.

## CI green

The one definition every skill that gates on CI reads. A commit is **CI green** when every required check reports success on it. Skipped, cancelled, neutral, timed out, pending and absent are not green, an empty list is not green, nothing reported on a draft is evidence, and a list the forge will not show is a capability gap (`git-pr-labels` > The forge).

The required set is profile `required_checks` for the branch the commit is headed to: `auto` (default) - that branch's rulesets and protection, or, when they require nothing, every check that reported, at least one; a list of names pins it; `none` - the project runs no CI, every commit counts as green, and the outcome report says so. A head that conflicts with its base runs no checks, so a trial merge settles the conflict first, never the forge's `mergeable` flag. The reads and the trial merge are `references/ci-green.md`.

## Stop rules

Each ends the run through `git-complete-pr` with the reason stated - never by quietly continuing, and never by quietly stopping:

- The same defect signature returns after a fix round: stop fixing it.
- A factor already earned is lost twice in a row: the fixes are fighting each other.
- The round budget (`max_pr_rounds`, default 3) is spent - counted and read as *The round* states, so none is ever judged past it.
- An owner-decision item is queued and nothing fixable remains.

## Isolation

The two judging stages carry their own agent (`dev-qa-verifier`, `dev-code-reviewer`), both `access: readonly` - a judge that can edit the code can make its own verdict come true. Both are forked skills (`context: fork`, `background: false`): invoked with the PR number, each runs in its own subagent that sees the skill and its arguments and never this run's reasoning about why the code is right, and the round has the verdict before it goes on. On a tool that does not fork skills, this run starts that subagent itself, with the skill's agent and the same pointers.

Isolation covers the workspace too. A stage judges the location it is given, and neither that location nor the refs it resolves against move while it runs: no switch, no commit, no fetch, no pull until the round's stages have returned; holding it still is this skill's. A stage that finds its workspace moved writes no factor at all and says so - `git-verify-pr` with the verdict `blocked (workspace)`, `git-review-pr` in words - and that is the one stage report this skill clears itself: hold the location still and run the stage again inside the same round, because the failure is this run's and no round of fixes addresses it. Twice in a row is a second actor on the workspace, which is step 1's coordination failure and the owner's. The reasons are `references/rationale.md`.

A stage that needs room to probe in makes a throwaway repository elsewhere, never a worktree of the repository under judgement, whose `.git` and branch namespace `git worktree add` would write into. It holds no branch of the work and is gone within the stage, so it is not a worktree a run owns (`dev-deliver` > Parallel tasks).

## Verify

- What it published holds nothing `git-commit-conventions` forbids in a published artifact.
- Every declared factor fresh at HEAD_SHA and CI green there, or the run ended through `git-complete-pr` with a named reason.
- `gh pr view <pr> --json labels` shows one outcome label and no `ai:processing`.

## Scope / hand-off

- Opening the PR - `git-open-pr`; review threads and the outcome - `git-complete-pr`; merging - `git-merge-pr` after the owner accepts.
- A conflict with the base (*CI green*) - the profile `conflict_skill` (default `git-resolve-conflicts`), then back into the round.

## Constraints

- A failure that already exists on the target branch is reported as pre-existing, never "fixed" on this PR.
- One commit per round: fixing per defect makes every stage re-run per defect, and the cost becomes fixes x stages instead of rounds x stages.
- Never write a factor label - only the stage that judged it may - and never write an outcome.
- Never merge, even when everything is green: accepting the PR is the owner's gate.
