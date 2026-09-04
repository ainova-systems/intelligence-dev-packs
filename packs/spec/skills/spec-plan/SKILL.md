---
name: spec-plan
description: "Writes the plan for a spec whose requirements already exist - coverage table, phases, checkboxed work steps. Both intakes hand off here."
argument-hint: "<spec folder or slug>"
agent: spec-architect
---

# Plan a Spec

Turn requirements into a plan a cold-context session can execute without re-discovering the project. The requirements say *what and why*; the plan says *how*, in the repository's own terms - which sibling to copy, which rule to re-read, and what to run to know a step is done.

Every intake ends here: `spec-pull` for a tracker item, `spec-create` for a change no tracker item covers. Both write `NNN-requirements.md` and hand over; this skill writes `NNN-plan.md` beside it. A plan already present means re-planning - re-read it, apply the delta, and keep the ticked work steps that still hold.

An open question does not stop this skill: **a question blocks execution, never planning** (`spec-discipline`). The plan is written with the question standing in it.

## Steps

1. **Read before writing** - the plan's quality is set here, not in the prose:
   - `NNN-requirements.md` end-to-end, including its captured source and decision log.
   - The feature doc for the touched area, the project rules the change might contradict (rules win - flag the conflict now, never plan around it), and the decision records.
   - The closest **shipped** sibling spec, end-to-end: it is the structural template. No sibling and no profile - use the default and say so out loud.
2. **Write `NNN-plan.md`** into the spec folder, carrying the folder's number. Sections, in order:
   - **`## Requirements coverage`** - the first section, always. A table mapping every requirement to the step that delivers it or to the open question that blocks it, and to nothing else. A requirement no step can deliver becomes an open question, never a line in "Risks" - a plan that cannot name an executor for a requirement drops it, and this table is what makes that impossible to miss.
   - **MUST READ FIRST** - lessons from the closest shipped sibling build: one line each, a concrete mistake plus the sibling path that fixes it. Keep it narrow; a long generic list is ignored.
   - **Sibling-checking checklist** - boxes the implementer ticks before writing any file: sibling identified by path, sibling re-read end-to-end, relevant rules re-read, matching skill identified, cross-cutting registrations confirmed.
   - **Phases** - each phase names the sibling path(s), the skill(s) to invoke, the rule file(s) to re-read, impact notes (dependents found by grep or types, breaking surface, expand-contract sequencing when a contract changes), and a testable acceptance criterion - never "build X".
   - **`## Work steps`** - the checkbox list (`- [ ]`) the executor ticks; each step is one testable slice producing code plus its test, and each names the skill or approach that executes it. Progress ticked here is what makes execution resumable.
   - **`## Open questions`** / **`## Answered questions`** - questions inherited from intake plus any this planning surfaced; an answer physically moves the item between them with a `Changed:` line.
   - **`## Corrections`** and **`## Review findings`** - both empty at plan time; execution fills them (`spec-orchestration`).

   A plan is a shape, not a quota: a section with nothing to say says nothing, and a sentence equally true in every other plan belongs to a rule, not to a plan.
3. **Sequence a tree-wide change honestly.** When the blast radius spans hundreds of call sites (a rename, a signature change), do not force one testable slice: sequence expand -> migrate in batches -> contract, each batch its own step blocked by the expand step, so the gates stay green between batches.
4. **Cross-link.** Phases point to the feature doc's business rules; requirements point to the feature-doc section. A docs-substrate artifact the plan needs and that is missing or stale is created now via `spec-document`, marked inferred - never left inconsistent for a human to fix. A decision that crystallised while planning and passes the three-condition gate goes to `spec-decision`.
5. **Report** the plan path, the coverage table's verdict (every requirement mapped, or which are blocked), and the open questions leading. State what happens next: `spec-validate` to fact-check the plan against the repository, `spec-answer` for any question it raises or inherits, `spec-execute` when none stand.

   In `autonomous` mode, write `status: proposed` here - the plan is what `spec-approve` gates on (it checks the coverage table and the sibling citations), so a requirements-only spec has nothing to approve. Supervised mode writes nothing: a plan with no open question is already the approval (`spec-discipline`).

## Verify

- The plan file carries the folder's number and sits beside its requirements file; the coverage table maps every requirement to a step or an open question with nothing orphaned in either direction; every phase cites at least one concrete sibling path and a testable criterion; every work step names the skill or approach that executes it.

## Scope / hand-off

- Requirements do not exist yet - `spec-pull` (tracker item) or `spec-create` (no tracker item).
- Fact-checking the written plan against the tree - `spec-validate`. Resolving open questions - `spec-answer`.
- Code, branches, PRs - out of scope: `spec-execute` owns execution.

## Constraints
- Never invent structure: the closest shipped sibling spec is the template.
- Never start implementation here, even the "obvious" parts - a plan that begins editing code has stopped being reviewable.
- Never resolve an open question by choosing for the human: it stays in the plan, and `spec-answer` closes it.
