---
name: spec-answer
description: "Resolves a blocked spec's open decisions with the developer, one at a time, records what each answer changed, and corrects an earlier answer on request. Questions owned by someone outside the session stay open."
argument-hint: "<spec folder or slug> [question number to correct]"
agent: spec-architect
---

# Answer a Spec's Open Questions

Close the decisions that block execution, one at a time, with the human who can decide. An answered question physically moves from `## Open questions` to `## Answered questions` - the sections are the status, so nothing else needs updating.

## Steps

1. Read the spec; list every open question with its owner. A `[plan error]`, or any question the repository settles, goes back to `spec-plan`, which fixes it: only decisions are asked (`spec-discipline`).
2. Ask each decision the present human can decide **one at a time**, in plan-number order among those `spec.mjs open-questions <spec>` (`spec-validate`) does not mark `(waits on ...)`, explained from its fields as `dev-working-with-people` asks a question. A question that waited is shown with its suggestion re-checked against the answers it waited on. Assist; never decide for them.
3. **On explicit approval only**, move the question with `spec.mjs move-question <spec> <n> --from <file>`, the file holding its `Answer:` and `Changed:` lines (the requirement, step or data shape the answer altered). "Keep it open" is a valid outcome: the question stays, and so do those that depend on it.
4. When an answer changes structure, adjust the affected **unticked** work steps and the coverage table in the same edit, and remove an approval line (profile `approval: explicit`); ticked steps are history and stay. A change that alters a requirement is drift - route it back through the intake (`spec-pull` re-pull, or an update via `spec-create`), then re-plan with `spec-plan`.
5. **Correct an answer** when the human names its number: rewrite its `Answer:` and `Changed:` and the steps it changed, as step 4 does.
6. A question owned by someone not in the session stays open and is called out in the report - the developer relays it; the agent never posts it to a tracker.
7. Report (`dev-working-with-people`): answered / still open / relayed, and the spec's `spec.mjs status`; with profile `approval: explicit`, a `planned` spec goes to `spec-approve` next.

## Verify

- `spec.mjs check <spec>` prints no problem, so every answered question is its one line with `Answer:` and `Changed:` and every coverage cell resolves; remaining open questions each name their owner.

## Scope / hand-off

- Plan errors and new facts contradicting the plan - `spec-plan`, `spec-validate`. Approval under `approval: explicit` - `spec-approve`. Execution once unblocked - `spec-execute`.

## Constraints
- An answer is recorded only on the human's explicit approval - silence is not a yes.
- Never write answers back to the tracker; the spec is the record, the developer is the channel.
