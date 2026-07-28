---
description: Multi-agent execution doctrine - execution modes, consistency, delegation by pointers, outcome labels
---

# Orchestration

How a planned spec is executed. Spec content, files, status, and questions belong to `spec-discipline`; this rule owns only the run.

- **Two execution modes** (profile `execution_mode`). `supervised` (default): plan presence with no open question is the approval - no approve ceremony - and execution ends with changes left uncommitted on the feature branch; the developer reviews the diff and runs the git flow. `autonomous`: the owner fills a queue via `spec-approve`, `spec-execute-next` drains it; execution commits at milestones and ends at an outcome-labeled PR.
- **Consistency first.** The spec is the contract; matching the spec, the rules, and existing siblings outranks speed and cleverness. Rules win over plans - flag and override.
- **Delegate by pointers.** Subagent prompts pass references (the plan phase, rule files, sibling paths: "read this sibling, copy its structure verbatim"), never re-explained instructions - re-explaining is the #1 source of cross-session divergence.
- **One subagent = one testable slice**, never a layer. Parallel by default when file sets are disjoint.
- **No new patterns without a concrete sibling citation** or explicit owner approval. No sibling - halt and ask.
- **Cross-cutting gate before every commit**: grep removed/renamed symbols across the whole tree; only the orchestrator sees across subagent scopes.
- **A step is ticked only when a re-run of its gate comes back dry.** Within-scope rework goes to the plan's `## Corrections` log; a beyond-scope observation goes to `## Review findings` for the developer. The split axis is who closes the item, so nothing is double-counted.
- **Outcome labels (autonomous).** A run ends with exactly one: `ai:ready-to-merge` | `ai:manual` | `ai:failed`. Autonomous runs never merge.
- **Conflict gate.** Never start work whose file scope overlaps an open PR; one task = one branch = one PR.
