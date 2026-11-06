---
description: Multi-agent execution doctrine - execution modes, consistency with the product, delegation by pointers, where a finding goes, outcome labels
---

# Orchestration

How a planned spec is executed. Spec content, files, status, and questions belong to `spec-discipline`; this rule owns only the run.

- **Two execution modes** (profile `execution_mode`). `supervised` (default): plan presence with no open question is the approval - no approve ceremony - and execution ends with changes left uncommitted on the feature branch; the developer reviews the diff and runs the git flow. Profile `approval` and `execute_through` change both ends (`spec-execute`). `autonomous`: the owner fills a queue via `spec-approve`, `spec-execute-next` drains it; execution commits at milestones and ends at an outcome-labeled PR.
- **Consistency first.** The spec is the contract; matching the spec, the rules, and the product's precedent outranks speed and cleverness. Precedent is how the product already does the same thing: its UI and copy, API contracts, where it keeps data, decisions taken, glossary. A retired precedent (deprecated, or replaced by a current convention or decision) is never copied; a project may list them in the shape of `spec-retired-conventions`. Rules win over plans - flag and override.
- **Delegate by pointers.** Subagent prompts pass references (the plan step, every rule file the step depends on by name, precedent paths: "read this sibling, copy its structure verbatim"), never re-explained instructions - re-explaining is the #1 source of cross-session divergence.
- **One subagent = one testable slice**, never a layer. Parallel by default when file sets are disjoint.
- **No new pattern without a cited precedent.** An element the product has no precedent for is a decision the plan puts to the developer, never one an executor makes.
- **Cross-cutting gate before every commit**: grep removed/renamed symbols across the whole tree; only the orchestrator sees across subagent scopes.
- **A step is ticked only when a re-run of its gate comes back dry.**
- **PR labels (autonomous).** A run ends at a labeled PR: exactly one outcome (`ai:completed` | `ai:manual` | `ai:failed`) plus the success factors it earned, each fresh at the head commit - meanings and writers in `git-workflow`. Autonomous runs never merge.
- **Conflict gate.** Never start work whose file scope overlaps an open PR; one task = one branch = one PR.

## Where a finding goes

| A finding after planning | goes to |
|---|---|
| A comment on the open pull request | `git-finalize-pr`, in its next round |
| Any other fix inside the spec's scope, finished plans included | `spec-execute <spec> <text>` |
| A change of scope | the intake again, then `spec-plan` replans in place |
| Outside the spec's scope, before merge | `## Review findings`, for the developer |
| Work after the merge | a new task draft for the developer, or a record where profile `defect_log` points |

With profile `tracker_writes: scope-notes`, a scope change is also posted to the tracker item as one short note, on the developer's yes to its exact text (`dev-working-with-people`, `dev-external-writes`), and the next `spec-pull` reads it as scope. The default `none` writes nothing to the tracker.
