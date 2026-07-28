---
name: spec-continue
description: "Resumes an in-progress spec: audits inherited work for drift against the spec's target shape, then continues execution from the first unticked work step"
argument-hint: "<spec folder or plan file path>"
---

# Continue a Spec

Resume a spec started in another session. **Read `spec-execute` first - all its phases and CRITICAL rules apply verbatim**; this skill adds only the resume protocol. The resume failure mode is always the same: inherited code drifts from the spec, and new work gets stacked on the drift.

## Resume protocol

1. Read the spec end-to-end; find where work actually paused - from the last ticked work step and last commit, not from the top.
2. Rebuild repo state: `git status`, `git log --oneline -20`, `git branch --show-current`, `gh pr list --head <branch>`.
3. Triage uncommitted working-tree changes not made by this session: diff each file against the spec's target shape, not against the last commit. Aligned - absorb and say so. Divergent - present an A-vs-B choice (revert to spec shape vs fix in place); never silently absorb, never `git restore` someone's work without approval. Stage selectively (`git add <file>`), never `git add -A` on resume. In `supervised` mode an uncommitted tree is the expected end state of the previous run, not foreign work - check the ticked steps before treating it as drift.
4. Drain unacked PR feedback first (when a PR exists): `gh pr checks <pr>` + `gh pr view <pr> --json reviews,comments`, then `git-review-pr-comments`. Red lights before new work.
5. Reconcile the plan's `## Work steps` vs reality: tick what shipped; a `[x]` whose gate does not re-run dry is a regression to investigate, and the investigation lands in `## Corrections`.
6. Audit the inherited last commit for cross-cutting drift: removed symbol still called elsewhere; migration landed but consumers stale; hand-rolled component where a shared one exists; pattern invented where a sibling covers it. Any hit - the next work is a **rescope to the spec**, not a continuation.
7. Re-read the plan's MUST READ FIRST preamble and `## Open questions` (a standing question stops the run, same as `spec-execute`); then continue per `spec-execute` Phase C verbatim.

## Verify

- Inherited work reconciled (absorbed, rescoped, or surfaced); PR feedback drained; next work step identified from the plan.

## Scope / hand-off

- Fresh execution - `spec-execute`; spec authoring - `spec-pull` / `spec-create`; open questions - `spec-answer`.

## CRITICAL

- Never assume the spec reflects reality - re-sync with the repo first.
- Never delete or rewrite pushed work: fix-commit forward.
- Branch behind its base - ask merge or rebase; never silently diverge.
- "Reconcile with the spec's target shape" ranks above "tick the next checkbox".
