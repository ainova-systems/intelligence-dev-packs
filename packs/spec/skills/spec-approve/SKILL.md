---
name: spec-approve
description: "Records the owner's approval so a reviewed spec enters the autonomous queue. Autonomous mode only - under supervision a plan with no open question is already approved."
argument-hint: "<spec folder or slug>"
agent: spec-architect
disable-model-invocation: true
---

# Approve a Spec

The owner's gate-1 decision, recorded as a machine-readable signal: an `approved` spec is what `spec-execute-next` picks up. This decouples review from execution - approve a batch of specs now, and the AI works the approved queue later (scheduled or looped), with no further owner input until the PR.

This signal exists only in **autonomous mode** (profile `execution_mode`), where a machine queue needs a durable record of the owner's review. In `supervised` mode the owner is in the loop at execution time, so a plan with no open question is the approval - this skill reports that and changes nothing.

## Steps

1. Resolve the spec (argument, or the most recently created `proposed` spec). Read requirements and plan end-to-end.
2. Pre-checks before recording approval: the spec is `proposed` (not already approved / in-progress / completed / cancelled); the coverage table maps every requirement; the plan cites concrete siblings; no open question stands. Surface anything that should block approval - the owner decides, this skill only records the decision.
3. Set the spec's frontmatter `status: approved` with the date. Change nothing else - approval records a decision, it does not edit spec content.
4. Report: the spec is queued; `spec-execute-next` will pick it up by value, or run `spec-execute` to start it now.

## Verify

- The spec's `status` reads `approved`; nothing else in the spec changed.

## Scope / hand-off

- Authoring or changing the spec - `spec-create` (update-mode) or a re-pull via `spec-pull`. Executing - `spec-execute` / `spec-execute-next`. Resolving open questions first - `spec-answer`.

## CRITICAL

- Approval is the owner's call: the AI never sets `approved` on its own initiative - only when the owner explicitly invokes this skill after reviewing.
- Approve only a `proposed` spec; re-approving or approving a mid-flight spec is a no-op with a warning.
- An open question blocks approval - route it through `spec-answer` first.
