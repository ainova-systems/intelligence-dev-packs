---
name: dev-review-pr-comments
description: "Triage PR review comments: fix, discuss, or decline with reason - every thread answered"
argument-hint: "[pr number]"
---

# Handle PR Review Comments

Drain reviewer feedback: every thread ends with a fix commit or a reasoned reply. Silence is never a response.

## Steps

1. Resolve the PR for the current branch: `gh pr list --head <branch> --state open --json number --jq '.[0].number'`.
2. Fetch open threads: GraphQL `reviewThreads(first: 100) { nodes { id isResolved comments(first: 1) { nodes { path line body author { login } } } } }` - keep `isResolved == false`; plus `gh pr view <pr> --json reviews,comments` for conversation-level notes.
3. Classify each: **fix** (reviewer is right, or the change is cheaper than the debate) / **discuss** (real tradeoff - answer with the reasoning, no code yet) / **decline with reason** (conflicts with a project rule or an accepted ADR - cite it).
4. Apply fixes grouped into logical commits via `dev-commit-push` (gates run before push).
5. Reply to every thread: the commit reference for fixes, the reasoning for discuss/decline. Match the reviewer's tone; keep replies short.
6. Out-of-scope asks: agree in the reply, file a follow-up item, link it - do not grow the PR.
7. Report counts per category plus anything needing an owner decision.

## Verify

- Zero unanswered threads; every fix commit pushed; gates green.

## Scope / hand-off

- CI babysitting and the outcome label - `dev-finalize-pr`; merging - `dev-merge-pr`.

## CRITICAL

- Never resolve a thread without a reply.
- Conflicting reviewer asks - surface to both, never silently pick one.
