---
description: When a task needs a written plan before code, and when it does not
---

# Spec Discipline

A spec is the input that makes AI output reviewable: review becomes output-versus-standard instead of reconstructing intent from a diff. Apply it where it pays, nowhere else.

## The threshold

- **Implement directly**: small task, clear intent, single module, no contract changes. A spec here only restates the diff and adds review load.
- **Plan first** (`dev-plan-feature`): the change touches several modules, alters a contract or API shape, introduces a new feature, or carries migration risk. Produce the lightweight form: **contract** (what changes at the boundaries), **plan** (ordered steps, each with its verification), then code.
- **Always write the contract** when a change crosses a service or module boundary. Every unwritten boundary is an implied contract someone will break.

## REQUIRED

- State assumptions explicitly in the plan; ask batched questions when requirements are ambiguous instead of guessing.
- Estimate effort at AI pace (minutes and hours of agent execution), with human decision and review time listed separately.

## FORBIDDEN

- Heavy per-task spec ceremony (multi-page documents for one-line fixes). Overhead must never exceed the change.
- Treating a plan as proof of correctness. The verification gates decide, never the document.
