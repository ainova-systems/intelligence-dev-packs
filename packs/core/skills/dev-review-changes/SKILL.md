---
name: dev-review-changes
description: "Reviews pending changes against the project's rules and reports findings with a severity verdict. Read-only - never edits, stages, or commits."
argument-hint: "[base ref]"
agent: dev-code-reviewer
allowed-tools: Read, Grep, Glob, Bash
---

# Review Pending Changes

Read-only review before commit or PR - findings only, never edits.

## Steps

1. Enumerate: `git status --porcelain`, `git diff --stat`. Diff = uncommitted changes plus commits ahead of the target branch (an explicit base ref overrides). Resolve the base ref and confirm the diff is non-empty **before any deeper work** - a bad ref or an empty diff fails here, cheaply, not halfway through the review. Nothing changed - report and stop.
2. Load the rules that apply to the changed paths (project rules plus pack rules).
3. Read the full diffs (`git diff`, `git diff --cached`) AND the surrounding code - a locally clean change can still break a caller or violate a boundary.
4. **Two independent axes when a spec drove the change** - review conventions and review intent separately, and never merge their rankings (a strong result on one axis must not mask a miss on the other):
   - **Standards axis**: the checks in step 5, against rules and sibling code.
   - **Spec axis**: the diff against the spec's requirements - each requirement delivered, partially delivered, or missing; scope creep the spec never asked for; each finding quoting the requirement it maps to. Report the worst finding per axis, not one winner across both.
   Without a spec, run the standards axis alone.
5. Check, grouped by severity:
   - **Critical** (block): correctness bugs; boundary/layering violations; credentials anywhere in the reviewed diff (run `git-scan-secrets`, `diff` scope); weakened gates (skipped tests, suppressions, lowered thresholds); new logic without tests; cross-cutting drift - grep every removed/renamed symbol across the tree.
   - **Warning**: convention violations, oversized files or diffs, duplicated helpers, missing validation at external boundaries.
   - **Suggestion**: naming, comments restating code, extractable helpers.
6. Verify each finding by re-reading the code - drop anything you cannot evidence.
7. Report:

```
## Critical
- `path/file.ts:42` - <what> - <why / rule>
## Warning
...
## Suggestion
...
## Summary
- files: N, +A/-D; critical: N, warning: N, suggestion: N
- verdict: BLOCK | PASS-WITH-WARNINGS | CLEAN
```

## Verify

- Every finding carries `file:line` plus evidence; a verdict is stated.

## Scope / hand-off

- Fixing - the author/orchestrator; committing - `git-commit-push` (a BLOCK verdict means fix first).

## Constraints

- A diff mixing unrelated changes - the first finding is "split it".
