---
name: spec-execute
description: "Execute an approved spec end-to-end via parallel subagents, from branch to outcome-labeled PR"
argument-hint: "<spec folder or plan file path>"
---

# Execute a Spec

Orchestrate an approved spec to a merge-ready PR. **You delegate; subagents write code.** Your leverage is prompt quality, sibling references, and consistency gates - not hand-writing code. Runs autonomously: the next human touchpoint is the owner's PR review.

## Prime directive - consistency

The spec is the contract. Two sessions executing the same spec must produce convergent output; the mechanism is both reading the same plan phase + the same skill files + the same sibling files, never orchestrator-authored instructions. Speed and creative variants are bugs. Full doctrine: `spec-orchestration` rule.

## Phase A - Deep learning (never skip)

1. Read the spec end-to-end (requirements + plan + tasks), multiple passes. Read the feature doc it changes.
2. Read the project rules and the profile (branch model, verification commands, PR platform).
3. Inventory siblings: for every artefact in the plan, pin the concrete sibling file path. No sibling for an artefact - halt and ask the owner; never improvise a new pattern.
4. Reconcile plan vs reality: stubs already wired, helpers that already exist, rules the plan contradicts (rules win - flag and override the plan).

## Phase B - Branch

1. `git status --porcelain` must be clean; dirty - stop and surface, never sweep foreign work in.
2. `git fetch origin && git switch <base> && git pull --ff-only && git switch -c feature/<spec-slug>` where `<base>` is the integration branch when one exists, else the default branch. One spec = one branch.

## Phase C - Execute (parallel subagents)

1. **Unit of work = a testable slice** (backend entity + endpoints + tests in one shot; a full frontend feature in one shot) - never split by layer.
2. **Parallel by default**: disjoint file sets spawn subagents in one batch; serialize only on real dependencies.
3. **Prompts are pointers, not instructions.** Each prompt: goal (one sentence) + read-first list (rule files, feature-doc section, plan phase, sibling paths with the verbatim line "Start by reading `<sibling>`. Copy its structure verbatim. Adapt only fields / labels / types.") + skills to invoke + scope fence (in/out files). Re-explaining what a skill or sibling already says is the #1 divergence source. Keep prompts under ~60 lines.
4. **Cross-cutting consistency gate before every commit**: grep every removed/renamed symbol across the whole tree (backend, frontend, tests, docs, spec). Subagents see only their scope; only the orchestrator catches cross-layer drift.
5. **Commit at milestones** via `git-commit-push` - one commit = one shippable-for-testing unit. Tick `tasks.md` boxes and update the plan in the same commit as the code that earns them.
6. **Verify per slice** via `dev-run-tests` (scoped); full suite at phase boundaries.
7. **Reactive CI wait**: push freely between tasks; block on CI only at phase boundaries or when the baseline is red.
8. **Top-down reasoning on surprises** (red pipeline, failing test, odd diff): what is happening - what changed since last green - fix or delete per the feature doc - does an existing primitive already cover this. Trivial 1-2 line fixes are yours; larger ones go to a subagent.

## Phase D - Docs reconciliation (before the PR is final)

1. Update the feature doc to the new behavior - it must describe TODAY after this change.
2. Extract what the build paid for: durable business rules into the project's rules area; conventions into intelligence rules; decisions via `spec-add-decision`.
3. Append new lessons to the spec's MUST READ FIRST so the next spec inherits them.
4. `spec-audit-docs` over the touched docs.
5. Close the spec per project convention (follow what shipped specs do: keep the numbered folder, or delete the completed plan file; default keep).

## Phase E - PR finalization

1. Push; open the PR (`gh pr create --base <target> ...`) using the project's own PR template when one exists (`.github/PULL_REQUEST_TEMPLATE.md` or platform equivalent), else the pack default `assets/pr-template.md` (risk & size, what & why, changes, how to verify, deployment notes).
2. Run `git-finalize-pr` - CI to green plus every review comment handled.
3. End with exactly one outcome label: `ai:ready-to-merge` | `ai:manual` (an owner decision is needed - state which) | `ai:failed` (state what blocked and what was tried). Never merge.
4. Report: PR URL, outcome label, anything that needs the owner.

## Verify

- `tasks.md` fully ticked; gates green on the final commit; feature doc matches shipped behavior; the PR carries exactly one `ai:*` label.

## Scope / hand-off

- No spec yet - `spec-create` first (the owner reviews it before this skill runs).
- Resuming a half-done spec - `spec-continue`.
- Merging - `git-merge-pr`, only after owner accept.

## CRITICAL

- Never push to the integration/default branch; never merge; never amend or force-push pushed commits.
- No new patterns without a sibling citation or explicit owner approval.
- Phase A is mandatory - silence there causes most rework.
- Black boxes (DB rows, deploy internals) are out of reach: solve via code analysis or escalate; never probe infra blindly.
