---
name: git-finalize-pr
description: "Drives an open pull request through rounds of fix, verification and review until every success factor holds on one commit. Opening it is git-open-pr; recording the outcome is git-complete-pr."
argument-hint: "[pr number]"
---

# Finalize the PR

Orchestrate an open PR to accept-ready: CI green, the PR's own verification steps passed, the diff reviewed - all on the **same** head commit. This skill is the only actor here that pushes; the stages it calls only judge. It writes no outcome and never merges. Runs autonomously across CI rounds; wait reactively, never busy-poll.

## Pre-flight

1. `git branch --show-current` - abort on the default/integration/protected branch.
2. Resolve the PR: `gh pr list --head <branch> --state open --json number,headRefOid --jq '.[0]'`. An explicit argument must match this branch's PR. None - open it with `git-open-pr` first, then retry.
3. Declared factors: profile `pr_success_factors` (default `ai:verified, ai:reviewed`). A factor no stage in this project writes still gates the run - it is simply someone else's to apply.
4. Take the PR: set `ai:processing`, and clear every factor that is not fresh at head (`git-workflow` > autonomous PR labels).

## The round

`HEAD_SHA` is re-read at the top of every round; every probe below filters by it, so runs and reports for older commits are ignored.

1. **Head moved, and not by this run** - someone else is on the branch. Clear the factors and restart the round. Twice in a row: stop, hand to `git-complete-pr` as an owner decision - two actors on one branch is not a merge conflict, it is a coordination failure.
2. **CI.** `gh pr checks <pr>` plus `gh run list --branch <branch> --limit 8 --json databaseId,headSha,name,status,conclusion`. `in_progress` / `queued` - wait, sized to the longest job's typical duration. `failure` on HEAD_SHA - drill in: the failed step via `gh run view <run_id> --json jobs --jq '.jobs[] | select(.conclusion == "failure")'`, the log via `gh run view --job <job_id> --log` (fallback `gh api repos/{owner}/{repo}/actions/jobs/<job_id>/logs` while sibling jobs still run). Find the root-cause file:line, read it and the surrounding code, queue the defect.
3. **`ai:verified` fresh on HEAD_SHA?** No - run `git-verify-pr` in an isolated subagent. A pass earns the factor; failures queue as defects; a `blocked` step queues as an owner-decision item.
4. **`ai:reviewed` fresh on HEAD_SHA?** No - run `git-review-pr` in an isolated subagent. Critical findings queue as defects; warnings and suggestions do not.
5. **Fixable defects queued?** Fix them all, smallest-correct, top-down (what happened - what changed since last green - fix or delete per the feature doc - is there an existing primitive?). Run the local gates (`dev-run-tests`), then commit the **whole round as one commit** via `git-commit-push` and push. Re-set `ai:processing`, clear the factors, round += 1, back to 1.
6. **Nothing fixable left** - hand to `git-complete-pr`. If it pushes a fix of its own, control returns here for another round.

## Stop rules

Each ends the run through `git-complete-pr` with the reason stated - never by quietly continuing, and never by quietly stopping:

- The same defect signature returns after a fix round: stop fixing it.
- A factor already earned is lost twice in a row: the fixes are fighting each other.
- Rounds exceed profile `max_pr_rounds` (default 3).
- An owner-decision item is queued and nothing fixable remains.

## Isolation

The two judging stages carry their own agent (`dev-qa-verifier`, `dev-code-reviewer`), both `access: readonly` - a judge that can edit the code can make its own verdict come true. They run as subagents with their own context, given pointers only - PR number, head SHA, "read the PR body, the diff, the rules" - and never this run's reasoning about why the code is right. A judge that inherits the author's rationale confirms it instead of testing it.

## Verify

- Every declared factor fresh at HEAD_SHA and CI green there, or the run ended through `git-complete-pr` with a named reason.

## Scope / hand-off

- Opening the PR - `git-open-pr`; review threads and the outcome - `git-complete-pr`; merging - `git-merge-pr` after the owner accepts.
- `mergeable: CONFLICTING` - the profile `conflict_skill` (default `git-resolve-conflicts`), then back into the round.

## Constraints

- A failure that already exists on the target branch is reported as pre-existing, never "fixed" on this PR.
- One commit per round: fixing per defect makes every stage re-run per defect, and the cost becomes fixes x stages instead of rounds x stages.
- Never write a factor label - only the stage that judged it may - and never write an outcome.
- Never merge, even when everything is green.
