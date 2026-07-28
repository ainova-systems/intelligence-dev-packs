---
name: spec-cancel
description: "Cancel or supersede a spec, recording the reason so the decision is preserved"
argument-hint: "<spec folder or slug> [superseded-by <NNN>]"
agent: spec-architect
---

# Cancel a Spec

Retire a spec that will not ship - the owner dropped it, scope changed, or another spec replaces it - without losing why. A cancelled spec is a recorded decision, not a deleted file. In supervised mode `cancelled` is the one status the pipeline ever writes (`spec-discipline`): an abandoned spec looks exactly like one nobody started, and this skill is what tells them apart - never a human editing the frontmatter. A re-pull does not revive a cancelled spec; the source item gets a fresh one, and the folder stays as the record.

## Steps

1. Resolve the spec. Read it enough to state what it was for.
2. Determine reason and mode: `cancelled` (will not be done) or `superseded by NNN` (another spec replaces it). The reason is required.
3. If an open branch / PR exists for the spec, note it - the owner decides whether to close the PR; this skill does not delete pushed work.
4. Set `status: cancelled` (or `status: superseded by NNN`, with both linked) plus a one-line reason and the date in the spec's front page.
5. Reconcile any draft docs the spec left behind (via `spec-document`): a stubbed feature doc or an inferred rule that describes behavior which never shipped is removed or clearly marked not-shipped - never leave orphan docs implying a change that did not land.
6. Archive per project convention - default: keep the folder with the cancelled status. Never silently delete; the record of "we decided not to" is itself valuable.
7. Report: spec retired, reason, supersede link, docs reconciled, any open PR left for the owner.

## Verify

- `status` reads cancelled or superseded; the reason is recorded; a supersede chain links both ways; no pushed work was deleted.

## Scope / hand-off

- Replacing it with a new plan - `spec-create` (the superseder); link it. A reversible decision worth a durable record beyond the spec - `spec-decision`.

## CRITICAL

- A reason is mandatory; never cancel silently.
- Never delete the spec file or pushed work to "cancel" - record the status; the decision must survive.
