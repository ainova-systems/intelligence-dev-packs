---
name: git-complete-pr
description: "Answers and resolves every review thread on a pull request, then records exactly one outcome for the run. The fix and review rounds that get it there are git-finalize-pr."
argument-hint: "[pr number]"
---

# Complete the PR

End the run. Two jobs in order: leave no review thread unanswered, then state how the run ended - `ai:completed`, `ai:manual` or `ai:failed`. This is the only skill that writes an outcome, which is why the escalation criteria live here once instead of drifting across every stage that could hit a wall.

## Threads

1. Resolve the PR: `gh pr list --head <branch> --state open --json number --jq '.[0].number'`.
2. Fetch open threads: GraphQL `reviewThreads(first: 100) { nodes { id isResolved comments(first: 1) { nodes { path line body author { login } } } } }` - keep `isResolved == false` (already-resolved threads were handled on a prior run; skipping them is what makes re-running safe); plus `gh pr view <pr> --json reviews,comments` for conversation-level notes.
3. For each thread, read the cited file and line, then VERIFY the claim against the code before trusting it - automated reviewers often cite a rationale that is stale or does not match the project's conventions. Grep for the actual precedent (sibling code, the relevant rule) instead of mirroring the suggestion verbatim.
4. Classify each: **fix** (the reviewer is right, or the change is cheaper than the debate) / **discuss** (a real tradeoff - answer with the reasoning, no code yet) / **decline with reason** (conflicts with a project rule or an accepted ADR - cite it) / **escalate** (needs a decision that is the owner's, not this run's).
5. When fixing a real issue, grep for the same class across the tree and fix the siblings in the same commit - a reviewer flags one instance, not the whole class. If the comment exposes an unclear or wrong *documented* rule, fix the rule in the same change (`dev-context-engineering`). Commit via `git-commit-push`. **That push invalidates every success factor**: set `ai:processing`, clear them, and hand back to `git-finalize-pr` for another round - an outcome is recorded only on a head nobody has moved since the stages judged it.
6. Reply to every handled thread, then resolve it (`resolveReviewThread` by thread id) - the resolved flag is the only state that survives a re-run; a reply without resolve re-appears next run. A reply is a log entry, per `git-commit-conventions`: the commit reference for a fix, the blocking rule for a decline, the tradeoff for a discussion. One or two sentences, no conversational wrapper - the reviewer is reading a record, not a message.
7. Out-of-scope asks: name the follow-up item and link it - do not grow the PR.

## Outcome - exactly one

The labels and their meanings belong to `git-workflow`; what follows is when this skill writes each. Read the current state rather than re-deriving it: CI on head, unresolved thread count, and each declared factor's freshness (profile `pr_success_factors`).

- **`ai:completed`** - CI green on head, zero unresolved threads, every declared factor fresh, no escalation item. It is a claim that nothing is left for an agent.
- **`ai:manual`** - anything needs the owner: an escalated thread, a `blocked (step)` verification, a standing `blocked (project)` gap a non-interactive run could not ask about, a stop rule `git-finalize-pr` hit, a decision the task left open. List each item and the decision it needs, and let a `blocked (project)` item name the two profile keys that end it.
- **`ai:failed`** - CI could not be brought to green. Name the blocking failure, the rounds spent, and what was tried.

A factor the project does not require (absent from `pr_success_factors`) is stated once in the outcome report - behavioral verification is not required in this project - so a reader can tell a recorded decision from a stage that quietly never ran. On the PR those two look identical, and only one of them is fine.

`ai:manual` and `ai:failed` also leave a comment in the report envelope `git-workflow` defines (`## Outcome - MANUAL` / `## Outcome - FAILED`, `head: <sha>`, then one line per item: what it is and what decision it needs). A label says the run stopped; it cannot say what the owner has to decide. `ai:completed` leaves none - the stage reports and the two factor comments already say it.

One `gh pr edit <pr> --add-label <outcome> --remove-label <the other three>` call. Then report: PR URL, outcome, factors present, and the owner's list.

A PR carrying no `ai:*` label is human-driven: drain its threads and write no label.

## Verify

- Zero unanswered threads; every handled thread replied AND resolved; exactly one state label, and it matches what the PR actually shows.

## Scope / hand-off

- Another round of CI, fixes and the judging stages - `git-finalize-pr`; merging - `git-merge-pr` after the owner accepts.

## Constraints

- Never resolve a thread without a reply; never reply without resolving (it re-appears next run).
- Verify a reviewer's claim against the code before accepting it - a confident but wrong bot comment is still wrong.
- Conflicting reviewer asks - surface to both, never silently pick one.
- A blocked step, an open question or a stale factor makes the outcome `ai:manual`. There is no `ai:completed` with a caveat in the report - the label is what the next actor reads, not the prose.
