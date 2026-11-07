---
name: spec-approve
description: "Records the owner's approval of a reviewed spec: the autonomous queue's entry, or the supervised approval line when the profile asks for one. Under the default supervised setting a plan with no open question is already approved."
argument-hint: "<spec folder or slug>"
disable-model-invocation: true
---

# Approve a Spec

The owner's gate-1 decision, recorded as a machine-readable signal. In **autonomous mode** (profile `execution_mode`) an `approved` spec is what `spec-execute-next` picks up, which decouples review from execution - approve a batch of specs now, and the AI works the approved queue later, with no further owner input until the PR. In **supervised mode with profile `approval: explicit`** the approval line is what `spec-execute` requires, so a team with a named approver has one recorded act. With the default `approval: implicit` a supervised plan with no open question is the approval - this skill reports that and changes nothing.

## Steps

1. Resolve the spec (argument, or the most recently created `proposed` spec). Read requirements and plan end-to-end.
2. Pre-checks before recording approval: `spec.mjs status <spec>` (`spec-validate`) reads `proposed` (autonomous) or `planned` (supervised), `spec.mjs check <spec>` prints `check: ok`, and every element has a `Precedents:` line. Surface anything that should block approval - the owner decides, this skill only records the decision. The owner's invocation after reading the plan is the yes, so nothing is asked again (`dev-working-with-people`).
3. Record it. Autonomous: set the spec's frontmatter `status: approved` with the date. Supervised: write `approved: <name> <yyyy-mm-dd> <digest>` as the plan's last line, the digest being `git hash-object` of the requirements file (`spec-discipline`). Change nothing else - approval records a decision, it does not edit spec content.
4. Report (`dev-working-with-people`): the spec is approved; `spec-execute-next` picks it up by value in autonomous mode, or `spec-execute` starts it now.

## Verify

- When this run recorded an approval, `spec.mjs status <spec>` reads `approved`; nothing else in the spec changed.

## Scope / hand-off

- Authoring or changing the spec - `spec-create` (update-mode) or a re-pull via `spec-pull`. Executing - `spec-execute` / `spec-execute-next`. Resolving open questions first - `spec-answer`.

## Constraints
- Approval is the owner's call: the AI never sets `approved` on its own initiative - only when the owner explicitly invokes this skill after reviewing.
- Approve only a spec waiting for approval; re-approving or approving a mid-flight spec is a no-op with a warning.
- An open question blocks approval - route it through `spec-answer` first.
