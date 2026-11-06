---
description: When a task needs a written plan before code, and how a spec lives - files, status, questions, resources
---

# Spec Discipline

A spec makes AI output reviewable: review becomes output-versus-standard instead of reconstructing intent from a diff. Apply it where it pays:

- **Implement directly**: small, clear, single-module, no contract changes.
- **Spec first**: multi-module, contract or API change, new feature, migration risk. Intake is `spec-pull` when a tracker item exists or could be made (it carries provenance and drift keys), `spec-create` for a change no tracker item covers; either way `spec-plan` writes the plan before execution.
- A boundary-crossing change always gets a written contract - every unwritten boundary is an implied contract someone will break.
- No spec ceremony bigger than the change, and a plan is never proof of correctness - the gates decide.

## One change, two files, one key

A spec is a folder `NNN-<slug>/` holding `NNN-requirements.md` (WHAT: EARS acceptance criteria, source, provenance) and `NNN-plan.md` (HOW: coverage, approach, checkboxed work steps). `NNN` is the folder's key (profile `spec_folder`): the next free number, or with `date-id` the creation date plus the tracker item id, `<yyMMdd>-<item id>` (the date alone when no item covers the change), which parallel branches cannot collide on. Both files carry the key, so ten open specs never produce ten identical editor tabs. **One item, one spec, for the life of the item**: when the source moves, a re-pull updates the spec in place; a revision never spawns a second folder - git already holds every past version.

A committed plan holds only what stays true after the commit: no uncommitted-file lists, branch distances, tool versions, line numbers or drifting counts.

## Status follows artifacts

Status is read from what exists, never written as a second answer to a question the files already answer, and `spec.mjs status` (`spec-validate`) is its one reader: requirements only = `requirements`; an open question standing, or any line under `## Open questions` that is not one = `blocked`; plan present, no open question = `planned`; work steps partially ticked = `in-progress`; all ticked = `completed`. One state cannot be read from artifacts - an abandoned spec looks exactly like one nobody started - so `cancelled` is written, with reason and date, and only by `spec-cancel`. Autonomous mode adds one more written signal, the owner's queue decision (`spec-approve`); see `spec-orchestration`.

With profile `approval: explicit`, a supervised plan also needs the line `spec-approve` writes as the plan's last line, `approved: <name> <yyyy-mm-dd> <digest>`, the digest being `git hash-object` of the requirements file. While that digest matches, the plan reads `approved`; once the requirements move it reads `stale` until `spec-plan` replans, which removes the line.

## Questions

- **An open question blocks execution, never planning.** The plan is written and the question lives in it; `spec-execute` refuses while one stands and names each.
- **A question is a fact or a decision.** A fact (a path, a sibling, a command, an executor, what the code does) is found by the agent in the tracker, the docs and the code; one the plan got wrong is a `[plan error]` that `spec-plan` fixes. A decision has more than one defensible answer that nothing in the repository settles and no sensible default covers, and only decisions reach a person.
- **A decision has the three-part shape**: options (`Context:` with the precedents checked, `Suggested:` with what it changes and its evidence, each `Other option:`), `Keep it open:`, and `Your answer:`, plus `Depends on: <n>` when its suggestion rests on another answer. Its number names it for the life of the plan. Decisions are asked one at a time, each once its dependencies are answered, as `dev-working-with-people` asks a question.
- **An answered question is its one line plus `Answer:` and `Changed:`**; the evidence stays in git history, and `spec-answer` can correct an answer later.
- A requirement no step can deliver becomes an open question, never a line in "Risks" - the plan's coverage table enforces this.

## Resources

A spec resolves every resource it requires and stores none: evidence (a render, a screenshot) goes to a gitignored scratch dir; a product asset (an icon, a font, a static file the build ships) enters the product tree via a work step; content goes to the system that owns it, named as a field. An asset merely mentioned is an asset nobody is bringing.

## The docs chain

Feature docs (behavior today) link to a spec (this change) link to code, found by convention not search. At execution end the spec folds back into updated feature docs, durable rules, and decision records (`spec-execute` Phase D, `spec-decision`, `spec-audit-docs`).
