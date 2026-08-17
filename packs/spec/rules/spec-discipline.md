---
description: When a task needs a written plan before code, and how a spec lives - files, status, questions, resources
---

# Spec Discipline

A spec makes AI output reviewable: review becomes output-versus-standard instead of reconstructing intent from a diff. Apply it where it pays:

- **Implement directly**: small, clear, single-module, no contract changes.
- **Spec first**: multi-module, contract or API change, new feature, migration risk. Intake is `spec-pull` when a tracker item exists or could be made (it carries provenance and drift keys), `spec-create` for a change no tracker item covers; either way `spec-plan` writes the plan before execution.
- A boundary-crossing change always gets a written contract - every unwritten boundary is an implied contract someone will break.
- No spec ceremony bigger than the change, and a plan is never proof of correctness - the gates decide.

## One change, two files, one number

A spec is a folder `NNN-<slug>/` holding `NNN-requirements.md` (WHAT: EARS acceptance criteria, source, provenance) and `NNN-plan.md` (HOW: coverage, phases, checkboxed work steps). Both files carry the folder's number, so ten open specs never produce ten identical editor tabs. **One item, one spec, for the life of the item**: when the source moves, a re-pull updates the spec in place; a revision never spawns a second folder - git already holds every past version.

## Status follows artifacts

Status is read from what exists, never written as a second answer to a question the files already answer: requirements only = `requirements`; an open question standing = `blocked`; plan present, no open question = `planned`; work steps partially ticked = `in-progress`; all ticked = `completed`. One state cannot be read from artifacts - an abandoned spec looks exactly like one nobody started - so `cancelled` is written, with reason and date, and only by `spec-cancel`. Autonomous mode adds one more written signal, the owner's queue decision (`spec-approve`); see `spec-orchestration`.

## Questions

- **An open question blocks execution, never planning.** The plan is written and the question lives in it; `spec-execute` refuses while one stands and names each.
- **Every question put to a human has one shape**: sourced options (the most defensible answer the evidence supports, with the evidence named), an explicit "keep it open", and room for their own answer. A menu that quietly became the only choice is a decision the model took and dressed as a question.
- A requirement no step can deliver becomes an open question, never a line in "Risks" - the plan's coverage table enforces this.

## Resources

A spec resolves every resource it requires and stores none: evidence (a render, a screenshot) goes to a gitignored scratch dir; a product asset (an icon, a font, a static file the build ships) enters the product tree via a work step; content goes to the system that owns it, named as a field. An asset merely mentioned is an asset nobody is bringing.

## The docs chain

Feature docs (behavior today) link to a spec (this change) link to code, found by convention not search. At execution end the spec folds back into updated feature docs, durable rules, and decision records (`spec-execute` Phase D, `spec-decision`, `spec-audit-docs`).
