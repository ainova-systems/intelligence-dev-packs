---
name: dev-review-changes
description: "Read-only review of pending changes against project rules, with a severity verdict"
argument-hint: "[base ref]"
agent: dev-code-reviewer
allowed-tools: Read, Grep, Glob, Bash
---

# Review Pending Changes

Read-only review before commit or PR - findings only, never edits.

## Steps

1. Enumerate: `git status --porcelain`, `git diff --stat`. Diff = uncommitted changes plus commits ahead of the target branch (an explicit base ref overrides). Nothing changed - report and stop.
2. Load the rules that apply to the changed paths (project rules plus pack rules).
3. Read the full diffs (`git diff`, `git diff --cached`) AND the surrounding code - a locally clean change can still break a caller or violate a boundary.
4. Check, grouped by severity:
   - **Critical** (block): correctness bugs; boundary/layering violations; secrets staged (`git-scan-secrets` patterns); weakened gates (skipped tests, suppressions, lowered thresholds); new logic without tests; cross-cutting drift - grep every removed/renamed symbol across the tree.
   - **Warning**: convention violations, oversized files or diffs, duplicated helpers, missing validation at external boundaries.
   - **Suggestion**: naming, comments restating code, extractable helpers.
5. Verify each finding by re-reading the code - drop anything you cannot evidence.
6. Report:

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

## CRITICAL

- Read-only: never edit, stage, or commit.
- A diff mixing unrelated changes - the first finding is "split it".
