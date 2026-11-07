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

1. Enumerate the change `dev-verification-gates` defines, against the target branch (an explicit base ref overrides): `git diff --stat --no-renames <merge-base>`, with `<merge-base>` from `git merge-base <base> HEAD`, plus `git ls-files --others --exclude-standard`. Resolve both and confirm the change is non-empty **before any deeper work** - a base that does not resolve or an empty merge-base is a refusal that stops here, cheaply, not halfway through the review. Nothing changed - report and stop.
2. Load the rules that apply to the changed paths (project rules plus pack rules).
3. Read the full diff of step 1 (`git diff --cached` shows which part is staged) AND the surrounding code - a locally clean change can still break a caller or violate a boundary.
4. **Two independent axes when a spec drove the change** - review conventions and review intent separately, and never merge their rankings (a strong result on one axis must not mask a miss on the other):
   - **Standards axis**: the checks in step 5, against rules and sibling code.
   - **Spec axis**: the diff against the spec's requirements - each requirement delivered, partially delivered, or missing; scope creep the spec never asked for; each finding quoting the requirement it maps to. Report the worst finding per axis, not one winner across both.
   Without a spec, run the standards axis alone.
5. Check, grouped by severity:
   - **Critical** (block): correctness bugs; boundary/layering violations; credentials anywhere in the reviewed diff (run `git-scan-secrets`, `diff` scope); weakened gates (skipped tests, suppressions, lowered thresholds); new logic without tests; cross-cutting drift - grep every removed/renamed symbol across the tree.
   - **Warning**: convention violations, oversized files or diffs, duplicated helpers, missing validation at external boundaries.
   - **Suggestion**: naming, comments restating code, extractable helpers.
6. Keep a finding only when it names the concrete case that fails - the input, state or reader for which the change does the wrong thing - and re-reading the code confirms it. In a rule, skill or agent, only a wrong or missing outcome, a contradiction, or a stale reference counts. What an approved plan states, and every finding already in the record the caller names, is settled and not raised again.
7. Report, for the reader `dev-working-with-people` describes:

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

- Never moves its workspace or the refs it resolves against - no switch, commit, fetch or pull (`git-finalize-pr` > Isolation).
- A diff mixing unrelated changes - the first finding is "split it".
