---
name: spec-create
description: "Plan a change as a reviewable spec: grill the owner, then write requirements, plan, tasks - the review gate before execution"
argument-hint: "<task description, ticket, or feature name>"
agent: spec-architect
---

# Create a Spec

Turn a task into a spec a cold-context session can execute without re-discovering conventions. Ambiguous scope triggers a grill - a relentless, checkpointed interview. The output is the owner's gate 1 review artifact; execution is owned by `spec-execute`.

This skill both **creates** a new spec and **updates** an existing one (re-scope when requirements change): in update-mode, re-read the current spec, apply the delta, keep a one-line history note, and reset `status: proposed` for re-approval.

## Resolve the docs structure (learn, then profile, then default)

1. Learn from the project: locate the existing spec/plan area (`docs/specs/`, `Documentation/Todo/`, or equivalent) and read the most recent shipped spec end-to-end - it is the structural template.
2. Profile pins it when ambiguous: `specs_dir`, `features_dir`, `spec_grouping` (`flat` | `quarterly`) in `dev-project-profile.md`.
3. Greenfield default: `docs/specs/NNN-<slug>/` with `requirements.md` + `plan.md` + `tasks.md` (the ai-first-docs tree); `quarterly` grouping nests as `docs/specs/<yyyy>-Q<n>/NNN-<slug>/`.

If the project has no docs substrate yet (no `model.md` / `glossary.md` / `features/` / `specs/`), run `spec-init` first to scaffold it - this skill writes one change spec into an existing structure, it does not bootstrap the whole tree.

## Steps

1. **Deep learning first.** Read the feature doc for the touched area (`features_dir`), the project rules, the decision records, and the closest shipped sibling spec end-to-end. Note rules the request might contradict - rules win; flag conflicts now.
2. **Grill the owner (when scope is ambiguous).** Interview relentlessly until shared understanding - one question at a time, each with a recommended answer inferred from the code and docs so the owner can confirm, correct, or redirect. Walk the decision tree dependencies-first. Grill rules:
   - A question the codebase or docs can answer is answered there, never asked.
   - Sharpen fuzzy terms against the project's glossary/domain model ("you said account - the Customer or the User?"); surface code-vs-statement contradictions immediately.
   - Stress-test domain relationships with concrete edge-case scenarios that force precise boundaries.
   - **Checkpoint after every answer** into the spec draft files - the spec, not the conversation, is the source of truth; never hold answers only in memory.
   - Unanswerable item - flag it with its owner in the spec's open questions and move on; don't stall.
   - Clear, small scope - skip the grill and say so.
3. **Write `requirements.md`.** Acceptance criteria in EARS form (`WHEN <event> THE SYSTEM SHALL <response>`), narrowed to this change. Durable behavior stays in the feature doc; this file holds only the delta.
4. **Write `plan.md`** - two non-negotiable preambles, then phases:
   - **MUST READ FIRST** - lessons learned from the closest shipped sibling build: one line each, a concrete mistake plus the sibling path that fixes it. Source from the predecessor PR / git log. Keep it narrow; a long generic list is ignored.
   - **Sibling-checking checklist** - boxes the implementer ticks before writing any file: sibling identified by path, sibling re-read end-to-end, relevant rules re-read, matching skill identified, cross-cutting registrations confirmed.
   - **Phases**: each phase lists the sibling path(s), the skill(s) to invoke, the rule file(s) to re-read, impact notes (dependents found by grep/types, breaking surface, expand-contract sequencing when a contract changes), and a testable acceptance criterion - never "build X".
5. **Write `tasks.md`.** Checkbox list (`- [ ]`) the executor ticks; each task = one testable slice producing code plus its test.
6. **Cross-link.** Plan phases point to feature-doc business rules; requirements point to the feature-doc section. Open business questions stay in the feature doc; the spec tracks only this change's todos. Decisions that crystallised during the grill and pass the ADR gate go to `spec-decision`.
7. **Apply necessary docs updates automatically.** If the spec needs a docs-substrate artifact that is missing or stale to be coherent (a feature-doc stub for a new feature, a glossary term, a model touch), create or update it now via `spec-document` (drafted, marked inferred) - never leave the substrate inconsistent for a human to fix.
8. **Set status, quality gate, then hand to the owner.** Write `status: proposed` in the spec's front page (`requirements.md` frontmatter, or the project's spec-index convention). Re-read against the project's documentation rules: no class names or code in requirements, every phase cites a sibling, preambles present, criteria testable. Present the spec paths plus a 5-line summary. STOP - execution starts only after the owner approves via `spec-approve`.

## Verify

- The spec folder contains all three files; every plan phase cites at least one concrete sibling path; a cold executor could start with zero questions; every grill answer is persisted in the spec, not only in conversation.

## Scope / hand-off

- Code, branches, PRs - out of scope: `spec-execute` owns execution after approval.
- Decisions made while planning - `spec-decision`.

## CRITICAL

- A spec is required only past the threshold (multi-module, contract change, migration risk, new feature). For a small clear task, say so and offer direct execution.
- Never invent structure: the closest shipped sibling spec is the template. No sibling and no profile - use the default and say so.
- Never start implementation in this skill, even the "obvious" parts.
