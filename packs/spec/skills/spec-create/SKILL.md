---
name: spec-create
description: "Turns a stated task or brief into a reviewable spec - numbered requirements plus a plan with work steps. Intake from a tracker item is spec-pull."
argument-hint: "<task description, brief, or feature name>"
agent: spec-architect
---

# Create a Spec

Turn a task into a spec a cold-context session can execute without re-discovering conventions. Ambiguous scope triggers a grill - a relentless, checkpointed interview. This is the intake for a change no tracker item covers: something settled in a conversation, a decision from a call, a defect found in passing. When a tracker item exists or could be made, `spec-pull` is the intake - it carries provenance and drift keys this path cannot, so say that out loud before proceeding.

This skill both **creates** a new spec and **updates** an existing one (re-scope when requirements change): in update-mode, re-read the current spec, apply the delta, and keep a one-line history note.

## Resolve the docs structure (profile, then learn, then default)

1. Profile pins it: `specs_dir`, `features_dir`, `spec_grouping` (`flat` | `quarterly`) in `dev-project-profile.md`.
2. Else learn from the project: locate the existing spec/plan area and read the most recent shipped spec end-to-end - it is the structural template.
3. Greenfield default: `docs/specs/NNN-<slug>/` with `NNN-requirements.md` + `NNN-plan.md` - both files carry the folder's number (`spec-discipline`); `quarterly` grouping nests as `docs/specs/<yyyy>-Q<n>/NNN-<slug>/`.

If the project has no docs substrate yet (no `model.md` / `features/` / `specs/`), run `spec-init` first to scaffold it - this skill writes one change spec into an existing structure, it does not bootstrap the whole tree.

## Steps

1. **Deep learning first.** Read the feature doc for the touched area (`features_dir`), the project rules, the decision records, and the closest shipped sibling spec end-to-end. Note rules the request might contradict - rules win; flag conflicts now.
2. **Grill the owner (when scope is ambiguous).** Interview relentlessly until shared understanding - one question at a time, in the `spec-discipline` question shape: sourced options with a recommended answer inferred from code and docs, an explicit "keep it open", and room for the owner's own answer. Walk the decision tree dependencies-first. Grill rules:
   - A question the codebase or docs can answer is answered there, never asked.
   - Sharpen fuzzy terms against the project's glossary/domain model; surface code-vs-statement contradictions immediately.
   - Stress-test domain relationships with concrete edge-case scenarios that force precise boundaries.
   - **Checkpoint after every answer** into the spec draft files - the spec, not the conversation, is the source of truth.
   - Unanswerable item - record it under `## Open questions` with its owner and move on; don't stall.
   - Clear, small scope - skip the grill and say so.
3. **Write `NNN-requirements.md`.** Acceptance criteria in EARS form (`WHEN <event> THE SYSTEM SHALL <response>`), narrowed to this change. Durable behavior stays in the feature doc; this file holds only the delta. **Keep the source verbatim under `## Source as captured`**: a board task can be re-read, a chat cannot, and a summary there is a spec whose requirements can never be traced back.
4. **Write `NNN-plan.md`.** Sections, in order:
   - **`## Requirements coverage`** - the first section, always. A table mapping every requirement to the step that delivers it or to the open question that blocks it, and to nothing else. A requirement no step can deliver becomes an open question, never a line in "Risks" - a plan that cannot name an executor for a requirement drops the requirement, and this table is what makes that impossible to miss.
   - **MUST READ FIRST** - lessons learned from the closest shipped sibling build: one line each, a concrete mistake plus the sibling path that fixes it. Keep it narrow; a long generic list is ignored.
   - **Sibling-checking checklist** - boxes the implementer ticks before writing any file: sibling identified by path, sibling re-read end-to-end, relevant rules re-read, matching skill identified, cross-cutting registrations confirmed.
   - **Phases** - each phase lists the sibling path(s), the skill(s) to invoke, the rule file(s) to re-read, impact notes (dependents found by grep/types, breaking surface, expand-contract sequencing when a contract changes), and a testable acceptance criterion - never "build X". When the blast radius spans the whole tree (a rename, a signature change with hundreds of call sites), do not force one testable slice: sequence expand -> migrate in batches -> contract, each batch its own step blocked by the expand step, so gates stay green between batches.
   - **`## Work steps`** - the checkbox list (`- [ ]`) the executor ticks; each step = one testable slice producing code plus its test, and each names the skill or approach that executes it. Progress ticked here is what makes execution resumable.
   - **`## Open questions`** / **`## Answered questions`** - an answer physically moves the item from the first to the second, with a `Changed:` line naming what it altered.
   - **`## Corrections`** and **`## Review findings`** - both empty at plan time; execution fills them (`spec-orchestration`).
   A plan is a shape, not a quota: a section with nothing to say says nothing, and a sentence equally true in every other plan belongs to a rule, not to a plan.
5. **Cross-link.** Plan phases point to feature-doc business rules; requirements point to the feature-doc section. Open business questions stay in the feature doc; the spec tracks only this change. Decisions that crystallised during the grill and pass the ADR gate go to `spec-decision`.
6. **Apply necessary docs updates automatically.** If the spec needs a docs-substrate artifact that is missing or stale to be coherent, create or update it now via `spec-document` (drafted, marked inferred) - never leave the substrate inconsistent for a human to fix.
7. **Hand to the owner.** Quality pass: no class names or code in requirements, every phase cites a sibling, the coverage table maps everything, criteria testable. Present the spec paths plus a 5-line summary, leading with any open questions. In `supervised` mode the plan's presence with no open question is the approval - execution can start. In `autonomous` mode write `status: proposed`; execution starts only after the owner runs `spec-approve`.

## Verify

- The spec folder contains both numbered files; the coverage table maps every requirement; every plan phase cites at least one concrete sibling path; a cold executor could start with zero questions or the open questions are recorded; every grill answer is persisted in the spec, not only in conversation.

## Scope / hand-off

- Intake from a tracker item - `spec-pull`. Plan fact-checking before execution - `spec-validate`. Resolving open questions - `spec-answer`.
- Code, branches, PRs - out of scope: `spec-execute` owns execution.
- Decisions made while planning - `spec-decision`.

## CRITICAL

- A spec is required only past the threshold (multi-module, contract change, migration risk, new feature). For a small clear task, say so and offer direct execution.
- Never invent structure: the closest shipped sibling spec is the template. No sibling and no profile - use the default and say so.
- Never start implementation in this skill, even the "obvious" parts.
