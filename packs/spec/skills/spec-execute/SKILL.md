---
name: spec-execute
description: "Executes a planned spec via parallel subagents - one testable slice per subagent, gates re-run until dry. Supervised mode ends with unstaged changes for the developer's review; autonomous mode commits at milestones and ends at an outcome-labeled PR."
argument-hint: "<spec folder or plan file path>"
---

# Execute a Spec

Orchestrate a planned spec to done. **You delegate; subagents write code.** Your leverage is prompt quality, sibling references, and consistency gates - not hand-writing code.

## Prime directive - consistency

The spec is the contract. Two sessions executing the same spec must produce convergent output; the mechanism is both reading the same plan phase + the same skill files + the same sibling files, never orchestrator-authored instructions. Speed and creative variants are bugs. Full doctrine: `spec-orchestration` rule.

## Preconditions (refuse, don't work around)

- **No open question stands.** Read the plan's `## Open questions`; one standing question stops the whole run and the refusal names each - `spec-answer` is the path. An ambiguity that can be resolved is not a question; it is unfinished work.
- The spec is approved for its mode: `supervised` - plan present, coverage complete; `autonomous` - `status: approved` via `spec-approve`.
- Clean tree (`git status --porcelain`); dirty - stop and surface, never sweep foreign work in.

## Phase A - Deep learning (never skip)

1. Read the spec end-to-end (requirements + plan), multiple passes. Read the feature doc it changes.
2. Read the project rules and the profile (branch model, verification commands, PR platform, `execution_mode`).
3. Inventory siblings: for every artefact in the plan, pin the concrete sibling file path. No sibling for an artefact - halt and ask the owner; never improvise a new pattern.
4. Reconcile plan vs reality: stubs already wired, helpers that already exist, rules the plan contradicts (rules win - flag and override).

## Phase B - Branch

1. `git fetch origin && git switch <base> && git pull --ff-only && git switch -c feature/<spec-slug>` where `<base>` is the integration branch when one exists, else the default branch. One spec = one branch.
2. `autonomous` mode only: set the spec's `status: in-progress` (the queue reads written status; in `supervised` mode status is read from the ticked steps and nothing is written).

## Phase C - Execute (parallel subagents)

1. **Unit of work = a testable slice** (backend entity + endpoints + tests in one shot; a full frontend feature in one shot) - never split by layer.
2. **Parallel by default**: disjoint file sets spawn subagents in one batch; serialize only on real dependencies.
3. **Prompts are pointers, not instructions.** Each prompt: goal (one sentence) + read-first list (rule files, feature-doc section, plan phase, sibling paths with the verbatim line "Start by reading `<sibling>`. Copy its structure verbatim. Adapt only fields / labels / types.") + skills to invoke + scope fence (in/out files). Re-explaining what a skill or sibling already says is the #1 divergence source. Keep prompts under ~60 lines.
4. **Cross-cutting consistency gate before every commit point**: grep every removed/renamed symbol across the whole tree (backend, frontend, tests, docs, spec). Subagents see only their scope; only the orchestrator catches cross-layer drift.
5. **Verify per slice** via `dev-run-tests` (scoped); full suite at phase boundaries. **A work step is ticked only when a re-run of its gate comes back dry.** Each within-scope rework is one line in the plan's `## Corrections` - what was wrong, what was done, its source (`auto` from a gate, `dev` from a review comment naming an in-scope defect), and the root cause. A beyond-scope observation goes to `## Review findings` for the developer; a comment that changes a requirement is drift and goes back through the intake.
6. **Tick `## Work steps` boxes in the plan** as slices land - ticked progress is what makes execution resumable.
7. **Milestones, by mode.** `autonomous`: commit at milestones via `git-commit-push` - one commit = one shippable-for-testing unit; reactive CI wait (push freely between tasks; block on CI only at phase boundaries or when the baseline is red). `supervised`: no commits - work accumulates on the branch for the developer's review.
8. **Top-down reasoning on surprises** (red pipeline, failing test, odd diff): what is happening - what changed since last green - fix or delete per the feature doc - does an existing primitive already cover this. Trivial 1-2 line fixes are yours; larger ones go to a subagent.

## Phase D - Docs reconciliation

Apply every needed doc update automatically (via `spec-document` conventions) so the substrate matches the shipped behavior - never leave it stale or for a human.

1. Update the feature doc to the new behavior - it must describe TODAY after this change; fold the spec's one-off requirements into the feature doc's durable EARS criteria.
2. Reconcile the model and glossary when aggregates or terms changed; extract durable business rules into the project's rules area; conventions into intelligence rules; decisions via `spec-decision`.
3. Append new lessons to the spec's MUST READ FIRST so the next spec inherits them.
4. `spec-audit-docs` over the touched docs.

## Phase E - Hand-off, by mode

**`supervised`** (default): STOP here. Changes stay **uncommitted on the feature branch** - no commit, no push, no PR. Report: work steps ticked, gates green, `## Corrections` summary, `## Review findings` for the developer, and the diff stat. The developer reviews the diff by hand and runs the git flow (`git-commit-push` -> `git-open-pr`) himself.

**`autonomous`**:

1. Push; open the PR (`gh pr create --base <target> ...`) using the project's own PR template when one exists, else the pack default `assets/pr-template.md`.
2. Run `git-finalize-pr` - CI to green plus every review comment handled.
3. End with exactly one outcome label from `git-workflow`'s set (`ai:ready-to-merge` | `ai:manual` | `ai:failed`). Never merge.
4. Report: PR URL, outcome label, anything that needs the owner. Final close (`spec-close`) runs after the owner accepts and the PR merges, not here.

## Verify

- Plan `## Work steps` fully ticked with every tick's gate re-run dry; feature doc matches shipped behavior; supervised - unstaged diff reported to the developer; autonomous - the PR carries exactly one `ai:*` label.

## Scope / hand-off

- No spec yet - `spec-pull` / `spec-create` first. Plan not yet fact-checked - `spec-validate`. Open questions - `spec-answer`.
- Resuming a half-done spec - `spec-continue`.
- Merging - `git-merge-pr`, only after owner accept.

## CRITICAL

- Refuse to start while any open question stands; name each.
- Never push to the integration/default branch; never merge; never amend or force-push pushed commits.
- No new patterns without a sibling citation or explicit owner approval.
- Phase A is mandatory - silence there causes most rework.
- Black boxes (DB rows, deploy internals) are out of reach: solve via code analysis or escalate; never probe infra blindly.
