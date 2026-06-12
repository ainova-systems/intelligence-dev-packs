---
name: dev-plan-feature
description: Produce an implementation plan for non-trivial work - contract, ordered steps with verification, risks, rollback, AI-pace effort. Use before implementing anything that crosses the spec threshold.
argument-hint: "<feature description or ticket>"
---

# dev-plan-feature

Turn intent into a reviewable plan per `dev-spec-discipline`: the lightweight form is contract, plan, then code. The plan is what makes the AI-built diff reviewable against a standard.

## Steps

1. **Check the threshold.** If the task is small, clear, and single-module, say a plan is overhead and offer to implement directly.
2. **Restate the goal** in two or three sentences: outcome, constraints, what is explicitly out of scope. Ambiguous requirements stop here; ask the open questions as one batched set.
3. **Explore the code.** Read the modules the change touches; identify existing patterns to follow, helpers to reuse, and the decision records that bind the design.
4. **Write the contract.** What changes at every boundary the work crosses: API shapes, events, schemas, module interfaces. Mark each as compatible or breaking; breaking entries get expand-contract sequencing (`dev-rollback-safety`).
5. **Write the plan.** Ordered steps, each small enough to verify on its own, each ending with its verification (which gate, which test, which manual check). Note steps that can run in parallel without conflicting.
6. **State risks and rollback.** What can go wrong, how it is detected, how it is undone.
7. **Estimate at AI pace.** Agent execution time in minutes and hours per step; human decision and review time listed separately. No human-pace padding.
8. **Persist.** Save to the project's plans location (profile `plans_dir`, default `docs/plans/`, name `<yyyy-mm-dd>-<slug>.md`) unless the user wants it inline.

## Failure modes

- The plan reveals two projects in one request: present the split and recommend an order before planning further.
- A required decision has no ADR and contradicting precedents exist in the code: surface the conflict; propose `dev-add-decision` as step zero.
