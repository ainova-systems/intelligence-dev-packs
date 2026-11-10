---
name: spec-execute
description: "Executes a planned spec through parallel subagents, one testable slice each, gates re-run until dry, and takes an in-scope fix in the developer's words, also on a finished plan. Refuses while any question on the spec stays open."
argument-hint: "<spec folder or plan file path> [a fix in your own words]"
---

# Execute a Spec

Orchestrate a planned spec to done. **You delegate; subagents write code.** Your leverage is prompt quality, sibling references, and consistency gates - not hand-writing code.

**Given a fix in the developer's words**, the run is for that fix (`spec-orchestration` > Where a finding goes): an in-scope fix becomes a new unticked work step, or a `## Corrections` line when it reworks a ticked one, and runs through Phase C even on a finished plan; text that changes scope or arrives after the merge stops and takes its route there.

## Prime directive - consistency

The spec is the contract. Two sessions executing the same spec must produce convergent output, through the pointers `spec-orchestration` > Delegate by pointers defines, never orchestrator-authored instructions. Speed and creative variants are bugs.

## Preconditions (refuse, don't work around)

Checked on the spec's branch, entered first (Phase B, steps 1-3).

- **The spec is ready for its mode**: `spec.mjs status <spec>` (`spec-validate`) reads `approved` or `in-progress`, or `planned` in supervised mode with the default `approval: implicit`, or `completed` when a fix is given; and `spec.mjs check <spec>` prints `check: ok`. `blocked` stops the whole run, the refusal naming each question `spec.mjs open-questions` lists, and `spec-answer` is the path; `stale` goes to `spec-plan`; any other `planned`, and `proposed`, go to `spec-approve`. An ambiguity that can be resolved is not a question; it is unfinished work.
- Clean tree (`git status --porcelain`), apart from the spec's own files and, in supervised mode, the uncommitted work of its ticked steps; anything else dirty - stop and surface, never sweep foreign work in.

## Phase A - Deep learning (never skip)

1. Read the spec end-to-end (requirements + plan), multiple passes. Read the feature doc it changes.
2. Read the project rules and the profile (branch model, verification commands, PR platform, `execution_mode`).
3. Inventory precedents: for every element in the plan, pin the concrete path its `Precedents:` line names. An element with no line, or a `none` no answered decision covers, is a plan error - halt and name `spec-plan`; never improvise a new pattern.
4. Reconcile plan vs reality: stubs already wired, helpers that already exist, rules the plan contradicts (rules win - flag and override).

## Phase B - Enter the spec's branch

The one definition of entering a spec's branch; other spec skills run steps 1-3 as written here. The branch is `<prefix><spec-slug>`, `<prefix>` being the profile `branch_prefixes` entry an existing branch for the spec carries, else the first; `<base>` is the integration branch when one is set, else the default branch. One spec = one branch.

1. `git fetch origin`. On another branch, uncommitted work other than the spec's own files stops here, naming the files.
2. **The branch exists**, locally or as `origin/<branch>`: `git switch <branch>`, then `git merge --ff-only origin/<branch>` when the remote has it. A fast-forward git refuses stops the run, naming both tips; never reset, rebase or merge past it.
3. **It exists nowhere**: `git switch <base> && git merge --ff-only origin/<base> && git switch -c <branch>`. A skill that only reads or approves the spec stops here instead: the spec was never pushed.
4. `autonomous` mode only: set the spec's `status: in-progress` (the queue reads written status; in `supervised` mode status is read from the ticked steps and nothing is written).

## Phase C - Execute (parallel subagents)

1. **Unit of work = a testable slice** (backend entity + endpoints + tests in one shot; a full frontend feature in one shot) - never split by layer.
2. **Parallel by default**: disjoint file sets spawn subagents in one batch; serialize only on real dependencies.
3. **Prompts are pointers, not instructions** (`spec-orchestration` > Delegate by pointers). Each prompt: goal (one sentence) + read-first list (every rule file the step depends on, by name; the feature-doc section; the plan step; precedent paths with the verbatim line "Start by reading `<sibling>`. Copy its structure verbatim. Adapt only fields / labels / types.") + the inline skills to invoke + scope fence (in/out files). A prompt that grew long is usually one that started explaining.
4. **Cross-cutting consistency gate before every commit point**: grep every removed/renamed symbol across the whole tree (backend, frontend, tests, docs, spec). Subagents see only their scope; only the orchestrator catches cross-layer drift.
5. **Verify per slice** via `dev-run-tests` (scoped); full suite at phase boundaries. **A work step is ticked only when a re-run of its gate comes back dry.** Each within-scope rework is one line in the plan's `## Corrections` - what was wrong, what was done, its source (`auto` from a gate, `dev` from a review comment naming an in-scope defect), and the root cause. Anything else takes its route in `spec-orchestration` > Where a finding goes.
6. **Tick `## Work steps` boxes in the plan** as slices land - ticked progress is what makes execution resumable.
7. **Milestones, by mode.** `autonomous`, or `supervised` with profile `execute_through: pr`: commit at milestones via `git-commit-push` - one commit = one shippable-for-testing unit, carrying the ticks its code earns, so the tree is clean when the tail starts; reactive CI wait (push freely between tasks; block on CI only at phase boundaries or when the baseline is red). `supervised` with the default `execute_through: none`: no commits - work accumulates on the branch for the developer's review.
8. **Top-down reasoning on surprises** (red pipeline, failing test, odd diff): what is happening - what changed since last green - fix or delete per the feature doc - does an existing primitive already cover this. Trivial 1-2 line fixes are yours; larger ones go to a subagent.

## Phase D - Docs reconciliation

Apply every needed doc update automatically (via `spec-document` conventions) so the substrate matches the shipped behavior - never leave it stale or for a human. A question `spec-document` or `spec-audit-docs` returns is asked when the developer is present; in a run nobody attends it goes under `## Review findings` and into Phase E's report, unasked (`dev-working-with-people` > Consent), its claim left `inferred`.

1. Update the feature doc to the new behavior - it must describe TODAY after this change; fold the spec's one-off requirements into the feature doc's durable EARS criteria.
2. Reconcile the model and glossary when aggregates or terms changed; extract durable business rules into the project's rules area; conventions into intelligence rules; decisions via `spec-decision`.
3. Add new lessons to the plan's `Constraints:` so the next spec that copies it inherits them.
4. `spec-audit-docs` over the touched docs.

## Phase E - Hand-off, by mode

**`supervised`** with the default `execute_through: none`: STOP here. Changes stay **uncommitted on the feature branch** - no commit, no push, no PR. Report (`dev-working-with-people`): work steps ticked, gates green, `## Corrections` summary, `## Review findings` for the developer, and the diff stat. The developer reviews the diff by hand and runs the git flow (`git-commit-push` -> `git-open-pr`) himself.

**`autonomous`**, or **`supervised`** with `execute_through: pr`, where the developer's go-ahead to this skill is the one yes for the commits, the PR and finalize:

1. Commit Phase D's doc and plan updates via `git-commit-push`, so finalize never meets a dirty plan. Push, then open the PR via `git-open-pr` - it resolves the target, fills the project's own template when one exists, else the pack default, and refuses to leave the verification section empty.
2. Run `git-finalize-pr` - it drives the rounds until CI is green and every success factor the project declares holds on one head commit (`git-verify-pr`, `git-review-pr`), then hands to `git-complete-pr` for the threads and the one outcome. A stage that fails sends the PR back into a round; it never ends "green but unverified".
3. Report (`dev-working-with-people`): PR URL, outcome label, the factors present, anything that needs the owner. Never merge. Final close (`spec-close`) runs after the owner accepts and the PR merges, not here.

## Verify

- `spec.mjs status <spec>` reads `completed`, every tick's gate re-run dry; feature doc matches shipped behavior; supervised with `execute_through: none` - unstaged diff reported to the developer; otherwise - the PR carries an outcome label plus every declared success factor, fresh at head.

## Scope / hand-off

- No spec yet - `spec-pull` / `spec-create` first. Requirements but no plan - `spec-plan`. Plan not yet fact-checked - `spec-validate`. Open questions - `spec-answer`.
- Resuming a half-done spec - `spec-continue`.
- Merging - `git-merge-pr`, only after owner accept.

## Constraints
- Refuse to start while any open question stands; name each.
- Never push to the integration/default branch; never merge; never amend or force-push pushed commits.
- No new pattern without a `Precedents:` line or an answered decision.
- Phase A is mandatory - silence there causes most rework.
- Black boxes (DB rows, deploy internals) are out of reach: solve via code analysis or escalate; never probe infra blindly.
