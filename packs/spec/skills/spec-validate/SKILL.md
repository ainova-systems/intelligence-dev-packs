---
name: spec-validate
description: "Fact-checks a planned spec against the repository before execution and turns each gap into an open question that may re-block. Read-only on code."
argument-hint: "<spec folder or slug>"
agent: spec-architect
---

# Validate a Plan

The pre-execution critic, read as a fresh reader with nothing to defend. A plan is written from what the author believed; this skill re-checks what the repository actually says, because the cheapest place to catch a wrong plan fact is before a subagent builds on it. Recommended between planning and execution; mandatory when the plan is older than the branch it will run on.

## Steps

1. **Read the spec cold**: requirements and plan end-to-end, no prior context assumed.
2. **Re-check every plan fact against the tree**:
   - Open every cited sibling path - does it exist, and does it show the pattern the plan claims?
   - Re-run the reuse and impact checks the plan's phases rest on (grep the named symbols, confirm the dependents list).
   - Confirm every named skill, rule, and command resolves (a work step naming a skill that does not exist is a dropped requirement waiting to happen).
   - Where the plan states a behavior of the current system, verify it in code, not in docs.
3. **Re-derive the coverage both ways**: every requirement maps to a step or an open question; every step traces back to a requirement or is named setup/infrastructure. An orphan in either direction is a finding.
4. **Each gap becomes a new `## Open questions` entry** in the three-part shape (`spec-discipline`), which may move the spec back to `blocked`. Never fix the plan silently - the author or the developer decides through `spec-answer`.
5. **Report**: executable with the evidence, or blocked with the questions listed. A clean pass states what was re-checked, not just "looks good".

## Verify

- Every cited sibling was opened; the coverage was re-derived in both directions; every finding is a question in the spec, not a note in the chat.

## Scope / hand-off

- Resolving the questions - `spec-answer`. Re-planning after structural answers - `spec-plan`. Execution - `spec-execute`.

## Constraints
- Read-only on code and docs; the only writes are the spec's question sections.
- A finding never edits the plan directly - a critic who also rewrites is an author with a second hat.
