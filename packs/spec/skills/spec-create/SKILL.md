---
name: spec-create
description: "Turns a stated task or captured brief into a spec's requirements when no tracker item covers it, then hands to spec-plan. Tracker intake is spec-pull."
argument-hint: "<task description, brief, or feature name>"
agent: spec-architect
---

# Create a Spec

The manual intake, for a change no tracker item covers: something settled in a conversation, a decision from a call, a defect found in passing. Ambiguous scope triggers a grill - a relentless, checkpointed interview. When a tracker item exists or could be made, `spec-pull` is the intake instead - it carries provenance and drift keys this path cannot, so say that out loud before proceeding.

It produces `NNN-requirements.md` and hands to `spec-plan`, which writes the plan beside it - the same second half `spec-pull` hands to, so the chain reads identically whichever intake ran.

This skill both **creates** a new spec and **updates** an existing one (re-scope when requirements change): in update-mode, re-read the current requirements, apply the delta, and keep a one-line history note.

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
4. **Cross-link.** Requirements point to the feature-doc section they narrow. Open business questions stay in the feature doc; the spec tracks only this change. Decisions that crystallised during the grill and pass the ADR gate go to `spec-decision`.
5. **Hand to `spec-plan`.** Quality pass first: no class names or code in requirements, criteria testable, every grill answer persisted in the file rather than left in the conversation. Then state the requirements path plus a short summary, leading with any open questions, and continue into `spec-plan` - the requirements alone are not executable, and `spec-execute` refuses without a plan.

## Verify

- The spec folder holds `NNN-requirements.md` carrying the folder's number; every criterion is testable and traceable to the captured source; open questions use the three-part shape; the run ends by naming `spec-plan` as the next step.

## Scope / hand-off

- Intake from a tracker item - `spec-pull`. Writing the plan - `spec-plan`. Plan fact-checking - `spec-validate`. Resolving open questions - `spec-answer`.
- Code, branches, PRs - out of scope: `spec-execute` owns execution.
- Decisions made while grilling - `spec-decision`.

## CRITICAL

- A spec is required only past the threshold (multi-module, contract change, migration risk, new feature). For a small clear task, say so and offer direct execution.
- Never invent structure: the closest shipped sibling spec is the template. No sibling and no profile - use the default and say so.
- Never start implementation in this skill, even the "obvious" parts.
