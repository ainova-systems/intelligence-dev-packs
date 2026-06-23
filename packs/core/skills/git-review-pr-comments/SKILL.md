---
name: git-review-pr-comments
description: "Triage PR review comments: fix, discuss, or decline with reason - every thread answered"
argument-hint: "[pr number]"
---

# Handle PR Review Comments

Drain reviewer feedback: every thread ends with a fix commit or a reasoned reply. Silence is never a response.

## Steps

1. Resolve the PR for the current branch: `gh pr list --head <branch> --state open --json number --jq '.[0].number'`.
2. Fetch open threads: GraphQL `reviewThreads(first: 100) { nodes { id isResolved comments(first: 1) { nodes { path line body author { login } } } } }` - keep `isResolved == false` (already-resolved threads were handled on a prior run; skipping them is what makes re-running safe); plus `gh pr view <pr> --json reviews,comments` for conversation-level notes.
3. For each thread, read the cited file and line, then VERIFY the claim against the code before trusting it - automated reviewers (bots) often cite a rationale that is stale or does not match the project's conventions. Grep for the actual precedent (sibling code, the relevant rule) instead of mirroring the suggestion verbatim.
4. Classify each: **fix** (reviewer is right, or the change is cheaper than the debate) / **discuss** (real tradeoff - answer with the reasoning, no code yet) / **decline with reason** (conflicts with a project rule or an accepted ADR - cite it).
5. When fixing a real issue, grep for the same class of issue across the tree and fix the siblings in the same commit - a reviewer flags one instance, not the whole class. If the comment exposes an unclear or wrong *documented* rule, fix the rule in the same change (`dev-context-engineering`). Apply fixes grouped into logical commits via `git-commit-push` (gates run before push).
6. Reply to every handled thread, then mark it resolved (`resolveReviewThread` mutation by thread id) - the resolved flag is the only state that survives a re-run; a reply without resolve re-appears next run. Reply content: the commit reference for fixes, the reasoning for discuss/decline. Match the reviewer's tone; keep replies short.
7. Out-of-scope asks: agree in the reply, file a follow-up item, link it - do not grow the PR.
8. Report counts per category plus anything needing an owner decision.

## Verify

- Zero unanswered threads; every handled thread replied AND resolved; every fix commit pushed; gates green.

## Scope / hand-off

- CI babysitting and the outcome label - `git-finalize-pr`; merging - `git-merge-pr`.

## CRITICAL

- Never resolve a thread without a reply; never reply without resolving (it re-appears next run).
- Verify a reviewer's claim against the code before accepting it - a confident but wrong bot comment is still wrong.
- Conflicting reviewer asks - surface to both, never silently pick one.
