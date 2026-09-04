---
name: git-finalize-pr
description: "Drives an open pull request to merge-ready - CI green, every review thread answered, one outcome label. Opening it is git-open-pr; merging is git-merge-pr."
argument-hint: "[pr number]"
---

# Finalize the PR

Take a freshly pushed PR through fix/push iterations until CI is green AND every review comment is answered - merge-ready for the owner's accept. Runs autonomously across CI rounds; wait reactively, never busy-poll.

## Pre-flight

1. `git branch --show-current` - abort on the default/integration/protected branch.
2. Resolve the PR: `gh pr list --head <branch> --state open --json number --jq '.[0].number'`. An explicit argument must match this branch's PR. None - open it with `git-open-pr` first, then retry.
3. Latest commit: `git rev-parse HEAD`. Every check below filters runs by `headSha == HEAD`; stale runs for older commits are ignored.

## Loop 1 - CI to green

1. Probe: `gh pr checks <pr>` plus `gh run list --branch <branch> --limit 8 --json databaseId,headSha,name,status,conclusion`.
2. Decide:
   - all latest-SHA workflows `success` - proceed to Loop 2;
   - any `in_progress` / `queued` - wait, sized to the longest job's typical duration;
   - any latest-SHA `failure` - drill in.
3. Drill in: failed step via `gh run view <run_id> --json jobs --jq '.jobs[] | select(.conclusion == "failure")'`; log via `gh run view --job <job_id> --log` (fallback `gh api repos/{owner}/{repo}/actions/jobs/<job_id>/logs` while sibling jobs still run). Find the root-cause file:line; read it and the surrounding code.
4. Fix smallest-correct, top-down (what happened - what changed since last green - fix or delete per the feature doc - existing primitive?). Run the relevant local gates (`dev-run-tests`) before pushing. Batch multi-file fixes into one commit so concurrency cancels prior runs cleanly.
5. Push, repeat from 1.

## Loop 2 - comments drained

1. Fetch unresolved threads: GraphQL `reviewThreads(first: 100) { nodes { id isResolved comments(first: 1) { nodes { path line body author { login } } } } }`; plus `gh pr view <pr> --json reviews,comments`.
2. Process via `git-review-pr-comments`: fix / discuss / decline-with-reason; reply to every thread.
3. New pushes restart Loop 1; repeat until green AND drained.

## Outcome

Exactly one label from the outcome set `git-workflow` defines - `ai:ready-to-merge` | `ai:manual` | `ai:failed` - then report: PR URL, the label, and what needs the owner.

## Verify

- `gh pr checks <pr>` all green on HEAD; zero unresolved threads; exactly one `ai:*` label on the PR.

## Scope / hand-off

- Merging - `git-merge-pr` after the owner accepts.
- `mergeable: CONFLICTING` - the profile `conflict_skill` (default `git-resolve-conflicts`), then back into Loop 1.

## Constraints

- A failure that already exists on the target branch is reported as pre-existing, never "fixed" on this PR.
- Never merge from this skill, even when everything is green.
