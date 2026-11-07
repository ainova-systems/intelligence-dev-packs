---
name: spec-validate
description: "Fact-checks a planned spec against the repository before execution and turns each gap into an open question that may re-block. Read-only on code."
argument-hint: "<spec folder or slug>"
agent: spec-architect
context: fork
background: false
---

# Validate a Plan

The pre-execution critic, read as a fresh reader with nothing to defend. A plan is written from what the author believed; this skill re-checks what the repository actually says, because the cheapest place to catch a wrong plan fact is before a subagent builds on it. Recommended between planning and execution; mandatory when the plan is older than the branch it will run on.

## The spec script

`scripts/spec.mjs` in this skill decides every mechanical fact about a spec, so no skill decides one by reading. `status` prints the one state, read from the files and profile `approval` and `execution_mode`. `check` lists what is wrong with the plan: a section missing or out of order; an approval line, a written `status:`, a step or a question line out of shape; an executor that does not exist or cannot write; a cited path that does not resolve; a coverage cell that names nothing real; a repeated number or a dependency cycle; a line lost since the plan's last commit; and what the project's own module, profile `spec_checks`, adds. `open-questions`, `delivered`, `move-question` and `replace-section` are the rest. Every spec skill runs it from the repository root as `node <spec pack>/skills/spec-validate/scripts/spec.mjs <command>`, `<spec pack>` being `.intelligence/packages/@ainova-systems/spec` after a package install; its header gives the usage.

## Steps

1. **Read the spec cold**: requirements and plan end-to-end, no prior context assumed. Then run `spec.mjs check <spec>`; each problem it prints is a `[plan error]` (step 4).
2. **Re-check every plan fact against the tree**:
   - Open every cited sibling and precedent path - does it exist, does it show what the plan claims, and is it current rather than retired?
   - Re-run the reuse and impact checks the plan's approach rests on (grep the named symbols, confirm the dependents list).
   - Confirm every named rule and command resolves, and that each step's executor covers the files it touches; `check` has confirmed only that it exists and can write.
   - Where the plan states a behavior of the current system, verify it in code, not in docs.
3. **Re-derive the coverage both ways**: every requirement maps to a step or an open question; every step traces back to a requirement or is named setup/infrastructure. Every behavior a step adds traces to a requirement, a `Precedents:` line or a `Defaults:` line. An orphan in either direction, and an untraced behavior, is a finding.
4. **Each gap becomes a new `## Open questions` entry** in the three-part shape (`spec-discipline`), which may move the spec back to `blocked`. A gap the repository decides - a wrong path or executor, a check that needs a later step, a behavior a precedent or requirement settles - starts with `[plan error]` and states the fix its evidence decides; the rest are decisions. Never fix the plan silently: `spec-plan` fixes a plan error, and the developer decides the rest through `spec-answer`.
5. **Report** (`dev-working-with-people`): executable with the evidence, or blocked with the questions listed. A clean pass states what was re-checked, not just "looks good".

## Verify

- `spec.mjs check` ran and each problem it printed is a `[plan error]`; every cited sibling and precedent was opened; the coverage was re-derived in both directions; every finding is a question in the spec, not a note in the chat.

## Scope / hand-off

- Plan errors and re-planning after structural answers - `spec-plan`. Decisions - `spec-answer`. Execution - `spec-execute`.

## Constraints
- Read-only on code and docs; the only writes are the spec's question sections.
- A finding never edits the plan directly - a critic who also rewrites is an author with a second hat.
