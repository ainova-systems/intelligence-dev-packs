---
name: spec-plan
description: "Writes the plan for a spec whose requirements already exist - coverage, approach, and checkboxed steps that each name an outcome, a place, an executor and a check - and replans it in place when scope changes. Both intakes hand off here."
argument-hint: "<spec folder or slug>"
agent: spec-architect
---

# Plan a Spec

Turn requirements into a plan a cold-context session can execute without re-discovering the project. The requirements say *what and why*; the plan says what to achieve, where, by whom, and how to check it, in the repository's own terms, and leaves the implementation to the executor.

Every intake ends here: `spec-pull` for a tracker item, `spec-create` for a change no tracker item covers. Both write `NNN-requirements.md` and hand over; this skill writes `NNN-plan.md` beside it. An open question does not stop this skill: **a question blocks execution, never planning** (`spec-discipline`).

## Steps

1. **Read before writing** - the plan's quality is set here, not in the prose:
   - `NNN-requirements.md` end-to-end, including its captured source and decision log.
   - The feature doc for the touched area, the project rules the change might contradict (rules win - flag the conflict now, never plan around it), and the decision records.
   - The closest **shipped** sibling spec: it shows how this project fills the sections below, and its lessons become `Constraints:`. No sibling - say so out loud.
2. **Find the precedents** (`spec-orchestration` > Consistency first): for every element the change shows, stores, logs, names or exposes (a screen, a label, a message, an API field, a table, a config key, a term), where the product already does it, by path, and how. A retired precedent is marked not followed, with the current practice; an element with no precedent anywhere is a decision, with where you looked.
3. **Write `NNN-plan.md`** beside the requirements, carrying the folder's key. Sections, in order:
   - **`## Requirements coverage`** - the first section, always. A table mapping every requirement to the steps that deliver it (`step N`), the open question that blocks it (`question N`), or `moved to <item ref>` in the profile `tracker_item_ref` form when an answer moved it to another tracker item, and to nothing else. A requirement no step can deliver becomes an open question, never a line in "Risks".
   - **`## Approach`** - which modules change and why there, impact (dependents found by grep or types, breaking surface, expand-contract sequencing when a contract changes), and what stays out of scope. Then three lists, one line per item: `Constraints:`, each a fact or trap the executor needs that the code does not show at a glance, the sibling spec's lessons included; `Defaults:`, each choice taken with its reason, which the developer may change; `Precedents:`, each element of step 2 with where the product does it and the step that follows it, or `none`.
   - **`## Work steps`** - ``- [ ] N. <outcome>, in <where>, by `<executor>` - check: <observable result>``, one testable slice each, tests beside the code they cover, ordered so no check depends on a later step. A large change groups its steps under phase headings, each with an acceptance criterion. Every behavior a step adds comes from a requirement, a `Precedents:` line or a `Defaults:` line. Commit, pull request and finalize are never steps: they are `spec-execute`'s tail.
   - **`## Open questions`** / **`## Answered questions`** - in the shape `spec-discipline` gives; no questions is an empty section. An inherited question the repository settles is answered here, its source named.
   - **`## Corrections`** and **`## Review findings`** - both empty at plan time; execution fills them (`spec-execute` Phase C).

   The plan's size follows the change's: a section with nothing to say says nothing, and a sentence equally true in every other plan belongs to a rule. It holds only what stays true after its commit (`spec-discipline`).
4. **Pick every executor yourself**; it is never a question. A skill when one covers the work, else the agent whose files the step touches, else a general subagent (`subagent`) working from the step's pointers, which also covers steps outside product code (docs, configuration, the instruction layer). When a role that will repeat has no agent, or a capability has no skill, an earlier step adds it.
5. **Check what you cite**: open every path, sibling and rule the plan names; confirm each executor covers what its step touches; run `--help` or a dry run of every command it gives. A path the plan creates is cited as `<path>` (new). Then run `spec.mjs check <spec>` (`spec-validate`), which confirms the sections, the step shape, that every executor exists and can write, and that every cited path resolves. Fix what does not hold before anyone reads the plan.
6. **Sequence a tree-wide change honestly.** When the blast radius spans hundreds of call sites (a rename, a signature change), do not force one testable slice: sequence expand -> migrate in batches -> contract, each batch its own step blocked by the expand step, so the gates stay green between batches.
7. **Cross-link.** Steps point to the feature doc's business rules; requirements point to the feature-doc section. A docs-substrate artifact the plan needs and that is missing or stale is created now via `spec-document`, marked inferred - never left inconsistent for a human to fix. A decision that crystallised while planning and passes the three-condition gate goes to `spec-decision`.
8. **Replan in place** when a plan exists, to the current scope. Ticked steps keep their marks word for word; a done step the change undoes gets a new unticked rework step; unticked steps follow the change; questions keep their numbers; each open `[plan error]` is fixed as its evidence decides and answered `fixed by the planner`. A scope change removes the approval line (profile `approval: explicit`). Edit the plan by exact text, or a whole section with `spec.mjs replace-section`.
9. **Report** (`dev-working-with-people`): the plan path, its `spec.mjs status`, what it delivers, the defaults taken, the coverage verdict, and the open decisions. Then what happens next: `spec-validate` to fact-check the plan against the repository, each `[plan error]` it writes coming back here; `spec-answer` for the decisions; `spec-approve` when profile `approval: explicit` asks for it; `spec-execute` when none stand.

   In `autonomous` mode, write `status: proposed` here - the plan is what `spec-approve` gates on (it checks the coverage table and the precedents), so a requirements-only spec has nothing to approve. Supervised mode with the default `approval: implicit` writes nothing: a plan with no open question is already the approval (`spec-discipline`).

## Verify

- `spec.mjs check <spec>` prints `check: ok`; the coverage table maps every requirement with nothing orphaned in either direction; every element of the change has a `Precedents:` line.

## Scope / hand-off

- Requirements do not exist yet - `spec-pull` (tracker item) or `spec-create` (no tracker item).
- Fact-checking the written plan against the tree - `spec-validate`. Resolving decisions - `spec-answer`.
- Code, branches, PRs - out of scope: `spec-execute` owns execution.

## Constraints
- Never invent structure: the sections are step 3's, and the closest shipped sibling spec shows how to fill them.
- Never start implementation here, even the "obvious" parts - a plan that begins editing code has stopped being reviewable.
- Never resolve a decision by choosing for the human: it stays in the plan, and `spec-answer` closes it.
