---
name: dev-execute-next
description: "Autonomously pick the highest-value ready spec, drive it to an outcome-labeled PR, reset the workspace"
argument-hint: "[focus hint, e.g. 'frontend only']"
---

# Execute Next Best Task

Orchestrator-of-orchestrators: select ONE ready item, delegate the whole execution to `dev-execute-spec` / `dev-continue-spec` (their rules apply verbatim - this skill adds only selection and cleanup), then reset the workspace. Designed for autonomous and scheduled runs.

## Steps

1. **Preflight.** `git status --porcelain` clean (dirty - halt and surface; never sweep foreign work into a task). `git switch <base> && git pull && git fetch --prune`.
2. **Inventory.**
   - Candidates: approved specs in the project's spec area (profile `specs_dir`; else detect), plus any explicit backlog the project keeps. Skip idea-collection notes without a concrete ticket-sized item.
   - In-flight work: `gh pr list --state open --json number,title,headRefName,labels,updatedAt`; per-PR file scope via `gh pr view <n> --json files --jq '.files[].path'`.
3. **Select ONE.**
   - Value order: explicit priority marker - mid-flight spec with no open PR (finishing beats starting) - unblocks queued work - smaller effort at equal value. A focus-hint argument narrows the pool, never overrides the conflict gate.
   - Conflict gate, skip the candidate if: it already has an open PR (`ai:manual` / `ai:failed` PRs need the owner, not a re-run); its file scope overlaps any open PR's files; it needs a decision the spec leaves open (that is `ai:manual` before even starting).
   - Interactive session - confirm the choice plus runner-up in one question. Autonomous run - proceed. No eligible candidate - report per-candidate skip reasons and stop (skip step 5's sync, still end clean).
4. **Execute until outcome.** Mid-flight spec - `dev-continue-spec`; otherwise `dev-execute-spec`. Run until the PR carries exactly one `ai:*` label. Never merge.
5. **Reset (runs regardless of outcome).** `git switch <base> && git pull && git fetch --prune`; re-sync intelligence outputs when the project uses intelligence-sync (`bash <umbrella>/sync/scripts/sync.sh`). Report: task picked + why; PR URL + outcome label; what needs the owner; runner-up for the next run.

## Verify

- Exactly one task progressed to an outcome label; workspace back on a clean, current base.

## Scope / hand-off

- All execution rules - `dev-execute-spec`; the merge - `dev-merge-pr` after owner accept.

## CRITICAL

- ONE task per invocation; the next starts only after reset and fresh context.
- The conflict gate is non-negotiable - when in doubt about overlap, pick the next candidate.
- Never block other agents' open PRs.
