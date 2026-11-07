# Intake copies the tracker text verbatim, and the plan writes the requirements

Status: proposed, 2026-11-07. Decider: the maintainer.

## Context

`spec-pull` synthesizes: it reads a tracker item and writes EARS requirements, a decision log and open questions into `NNN-requirements.md`. On one team's rollout, a pull step built this way wrote outcomes the item never stated, folded in a linked item, described images, and listed gaps the agent noticed itself as questions for planning. Every retelling by a model was an interpretation, made at the step that was meant to copy. `spec-create` already keeps its source verbatim under `## Source as captured`, so the two intakes differ exactly where they should agree.

The second force is the validator. `spec-validate` writes every gap it finds as an open question. On the same rollout, plans came back with findings that the repository decided on its own (a moved path, an executor that could not write the file, a check that needed a later step), and the developer was asked all of them. The spec pack now marks such a finding `[plan error]` and `spec-answer` hands it to `spec-plan`, but the developer still runs that round trip by hand.

## Decision

1. `spec-pull` copies the tracker item word for word into a source section of the requirements file: the description and every comment, with author and date, plus the drift keys it records today. It writes no requirement, no decision log and no question.
2. `spec-plan` writes the numbered requirements into the plan, each naming its source: the description, a comment by date and author, an attachment, or the title when the description is empty. The coverage table maps these requirements. `spec-create` keeps its captured source and follows the same split.
3. `spec-validate` returns each finding the repository decides to `spec-plan`, which fixes it and records it as answered. After at most two rounds, a finding still open becomes a decision. Only decisions reach the developer.

## Consequences

- The requirements file becomes a pure copy, so a re-pull diff shows exactly what moved in the tracker, and the item's author can check a requirement against their own words.
- The plan gains a requirements section, and every skill that reads requirements (`spec-validate`, `spec-answer`, `spec-approve`, `spec-execute`) reads them from the plan.
- Specs written in the current shape need a one-time migration, or the skills read both shapes for one release.
- `spec-validate` stays read-only on code, but a planning run now includes up to two validation rounds, which costs time on every plan.

## Alternatives

- **Keep synthesis in `spec-pull`.** Lost because the interpretation happens before anyone can see it, and a requirement the item never stated reads as if it came from the item.
- **A pull script per tracker.** Gives an exact copy without a model, but the pack ships no tracker adapter, and the verbatim rule does not depend on one.
- **Let `spec-validate` edit the plan.** Lost because a critic that also rewrites is an author with a second hat, which `spec-validate` forbids.
- **Unlimited validation rounds.** Lost because nothing bounds a run whose rounds keep finding new gaps.
