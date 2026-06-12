---
description: Multi-agent execution doctrine - consistency, delegation by pointers, outcome labels
---

# Orchestration

Owner gates: task, then spec review, then PR accept. Everything between runs autonomously under these rules.

- **Consistency first.** The approved spec is the contract; matching the spec, the rules, and existing siblings outranks speed and cleverness. Rules win over plans - flag and override.
- **Delegate by pointers.** Subagent prompts pass references (the plan phase, rule files, sibling paths: "read this sibling, copy its structure verbatim"), never re-explained instructions - re-explaining is the #1 source of cross-session divergence.
- **One subagent = one testable slice**, never a layer. Parallel by default when file sets are disjoint.
- **No new patterns without a concrete sibling citation** or explicit owner approval. No sibling - halt and ask.
- **Cross-cutting gate before every commit**: grep removed/renamed symbols across the whole tree; only the orchestrator sees across subagent scopes.
- **Outcome labels.** An autonomous run ends with exactly one: `ai:ready-to-merge` | `ai:manual` | `ai:failed`. Autonomous runs never merge.
- **Conflict gate.** Never start work whose file scope overlaps an open PR; one task = one branch = one PR.
