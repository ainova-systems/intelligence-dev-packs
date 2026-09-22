---
name: git-finalize-pr
description: "Drives an open pull request through rounds of fix, verification and review until every success factor holds on one commit, and ends only at an outcome label. Opening it is git-open-pr; recording the outcome is git-complete-pr."
argument-hint: "[pr number]"
---

# Finalize the PR

Orchestrate an open PR to accept-ready: CI green, the PR's own verification steps passed, the diff reviewed - all on the **same** head commit. This skill is the only actor here that pushes; the stages it calls only judge. It writes no outcome and never merges. Runs autonomously across CI rounds; wait reactively, never busy-poll.

## The state this run leaves behind

`ai:processing` says an agent holds this pull request right now (`git-workflow`), and this skill is what puts it there. So the run has one expected final state: that claim gone, replaced by the single outcome label `git-complete-pr` wrote. Which outcome it is belongs to `git-complete-pr`, which holds the escalation criteria once instead of every stage that hits a wall deciding for itself.

Three middles read like an ending, and each continues the run instead:

- **A check still running.** Waiting is a step of the round, sized to the job.
- **A stop rule.** Each below ends the fix loop; the run carries on into `git-complete-pr` and ends there.
- **A stage that cannot run at all** - no environment for it, a capability the forge lacks. That is a finding, and it reaches the owner in the outcome's list rather than as a run that went quiet.

A run that reports progress and waits to be invoked again leaves the pull request claimed by an agent that is no longer working on it, which is the one state no later reader can tell from a live one - the owner's triage view and the merge gate both read it as work in flight. No later run repairs that: pre-flight step 4 stops on a claim this run did not write rather than taking it (`git-workflow`), so the cost of ending here lands on whoever has to clear it by hand.

## Pre-flight

1. `git branch --show-current` - abort on the default/integration/protected branch.
2. Resolve the PR: `gh pr list --head <branch> --state open --json number,headRefOid --jq '.[0]'`. An explicit argument must match this branch's PR. None - open it with `git-open-pr` first, then retry.
3. Declared factors: profile `pr_success_factors` (default `ai:verified, ai:reviewed`). A factor no stage in this project writes still gates the run - it is simply someone else's to apply.
4. Take the PR (`git-workflow` > autonomous PR labels). An `ai:processing` this run neither wrote nor was handed by a handoff is another run's claim and is never taken: post one `## Finalize - HELD` comment (`head: <sha>`, what this run was asked to do, and that it took nothing), then STOP. No label, no factor cleared, no stage run - none of them are this run's to write, and the comment is what turns the refusal into something the owner can see. Otherwise set `ai:processing` and clear every factor that is not fresh at head.

## The round

`HEAD_SHA` is re-read at the top of every round; every probe below filters by it, so runs and reports for older commits are ignored.

**The first pass is round 1, and the budget is read here** - before any of the round's work, so a run that has completed profile `max_pr_rounds` of them begins none, and no round is ever judged after the budget ran out. The count belongs to the run rather than to either skill, so it survives a hand-off to `git-complete-pr` and back; each way in increments it where that happens, never on the strength of a sentence in another section. A project that needs more raises the key; a run never grants itself one, the judgement being the thing a budget exists to bound.

1. **Head moved, and not by this run** - someone else is on the branch. Clear the factors and restart the round. Twice in a row: stop, hand to `git-complete-pr` as an owner decision - two actors on one branch is not a merge conflict, it is a coordination failure.
2. **CI.** `gh pr checks <pr>` plus `gh run list --branch <branch> --limit 8 --json databaseId,headSha,name,status,conclusion`. `in_progress` / `queued` - wait, sized to the longest job's typical duration. `failure` on HEAD_SHA - drill in: the failed step via `gh run view <run_id> --json jobs --jq '.jobs[] | select(.conclusion == "failure")'`, the log via `gh run view --job <job_id> --log` (fallback `gh api repos/{owner}/{repo}/actions/jobs/<job_id>/logs` while sibling jobs still run). Find the root-cause file:line, read it and the surrounding code, queue the defect.
3. **`ai:verified` fresh on HEAD_SHA?** No - run `git-verify-pr` in an isolated subagent. A pass earns the factor; failures queue as defects; `blocked (step)` queues as an owner-decision item for this PR - unless the step itself is why, in which case it is a body defect and goes to step 5. `blocked (project)` queues as one too, but as a standing configuration gap - never retry it round after round, because nothing a round does can resolve it.
4. **`ai:reviewed` fresh on HEAD_SHA?** No - run `git-review-pr` in an isolated subagent. Critical findings queue as defects; warnings and suggestions do not. A stage that returns no verdict at all - a capability the forge lacks, a workspace it could not pin - queues as an owner-decision item, as step 3's blocked kinds do, and like `blocked (project)` it is never retried round after round: an absent verdict is not a slow one, and a round that re-runs it changes nothing about why it could not answer.
5. **Fixable defects queued?** Fix them all, smallest-correct, top-down (what happened - what changed since last green - fix or delete per the feature doc - is there an existing primitive?). Run the local gates (`dev-run-tests`), then commit the **whole round as one commit** via `git-commit-push` and push. Re-set `ai:processing`, clear the factors, round += 1, back to 1. A fix to the PR body alone pushes nothing: head stays put, so clear only the factors whose report named the body among its inputs, and re-run those stages.
6. **Nothing fixable left** - hand to `git-complete-pr`. If it pushes a fix of its own, control returns here: round += 1, back to 1.

## Stop rules

Each ends the run through `git-complete-pr` with the reason stated - never by quietly continuing, and never by quietly stopping:

- The same defect signature returns after a fix round: stop fixing it.
- A factor already earned is lost twice in a row: the fixes are fighting each other.
- The round budget (`max_pr_rounds`, default 3) is spent - counted and read as *The round* states, so none is ever judged past it.
- An owner-decision item is queued and nothing fixable remains.

## Isolation

The two judging stages carry their own agent (`dev-qa-verifier`, `dev-code-reviewer`), both `access: readonly` - a judge that can edit the code can make its own verdict come true. They run as subagents with their own context, given pointers only - PR number, head SHA, "read the PR body, the diff, the rules" - and never this run's reasoning about why the code is right. A judge that inherits the author's rationale confirms it instead of testing it.

Isolation covers the workspace too. A stage judges the location it is given, and neither that location nor the refs it resolves against move while it runs: no switch, no commit, no fetch, no pull until the round's stages have returned. Fetch is on that list because a stage resolves its base by name - `git diff <base>...HEAD` answers differently once the ref has moved, with the checkout untouched. Holding it still is this skill's, because it is the only actor here that pushes. A stage that made its own location instead would multiply workspaces nobody owns and leave their cleanup to whichever run crashes last; a stage that read a moving tree would report a verdict for a state that existed at no commit, and that report reads exactly like an honest one. Which is why a stage that finds its workspace moved writes no factor at all: the label is the part a later gate trusts, and one earned against a workspace nobody could pin is worse than an absent one.

## Verify

- Every declared factor fresh at HEAD_SHA and CI green there, or the run ended through `git-complete-pr` with a named reason.
- `gh pr view <pr> --json labels` shows one outcome label and no `ai:processing`.

## Scope / hand-off

- Opening the PR - `git-open-pr`; review threads and the outcome - `git-complete-pr`; merging - `git-merge-pr` after the owner accepts.
- `mergeable: CONFLICTING` - the profile `conflict_skill` (default `git-resolve-conflicts`), then back into the round.

## Constraints

- A failure that already exists on the target branch is reported as pre-existing, never "fixed" on this PR.
- One commit per round: fixing per defect makes every stage re-run per defect, and the cost becomes fixes x stages instead of rounds x stages.
- Never write a factor label - only the stage that judged it may - and never write an outcome.
- Never merge, even when everything is green - accepting the PR is the owner's gate, and a run that both does the work and approves it has no gate at all.
