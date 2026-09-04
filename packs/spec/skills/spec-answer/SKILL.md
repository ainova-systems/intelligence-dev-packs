---
name: spec-answer
description: "Resolves a blocked spec's open questions with the developer and records what each answer changed. Questions owned by someone outside the session stay open."
argument-hint: "<spec folder or slug>"
agent: spec-architect
---

# Answer a Spec's Open Questions

Close the questions that block execution, one at a time, with the human who can decide. An answered question physically moves from `## Open questions` to `## Answered questions` - the sections are the status, so nothing else needs updating.

## Steps

1. Read the spec; list every open question with its owner.
2. For each question the present human can decide: present it in the three-part shape (`spec-discipline`) - the most defensible sourced answer, the explicit "keep it open" option, and room for their own answer. Assist; never decide for them.
3. **On explicit approval only**, move the question into `## Answered questions` with a `Changed:` line naming what the answer altered (a requirement, a step, a data shape). "Keep it open" is a valid outcome and the question stays.
4. When an answer changes structure, adjust the affected **unticked** work steps and the coverage table in the same edit; ticked steps are history and stay. A change that alters a requirement is drift - route it back through the intake (`spec-pull` re-pull, or an update via `spec-create`), then re-plan with `spec-plan`.
5. A question owned by someone not in the session stays open and is called out in the report - the developer relays it; the agent never posts it to a tracker.
6. Report: answered / still open / relayed, and whether the spec is now unblocked.

## Verify

- Every answered question sits in `## Answered questions` with a `Changed:` line; the coverage table still maps every requirement; remaining open questions each name their owner.

## Scope / hand-off

- New facts contradicting the plan - `spec-validate`. Execution once unblocked - `spec-execute`.

## Constraints
- An answer is recorded only on the human's explicit approval - silence is not a yes.
- Never write answers back to the tracker; the spec is the record, the developer is the channel.
