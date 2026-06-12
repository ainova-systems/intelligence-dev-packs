---
name: dev-review-changes
description: Read-only review of pending changes against project rules - correctness, conventions, tests, security, hygiene. Use before committing or when asked to review the working tree or a branch diff.
argument-hint: "[base ref to diff against]"
---

# dev-review-changes

Review the pending diff the way a senior reviewer would, before it becomes a commit or a PR. Read-only: findings, never edits.

## Steps

1. **Establish the diff.** Default: uncommitted changes plus commits ahead of the branch's target (resolve the target per `dev-git-workflow`). An explicit base ref argument overrides.
2. **Read the surrounding code, not just the diff.** A change that is locally clean can still break a caller, violate a boundary, or duplicate an existing helper.
3. **Review against the dimensions:**
   - **Correctness**: logic errors, unhandled edge cases and error paths, concurrency hazards.
   - **Conventions**: project rules and pack rules; layering and dependency direction; naming.
   - **Tests**: new logic without tests; bug fix without a regression test; weakened gates (`dev-verification-gates`).
   - **Security**: unvalidated input, secrets in the diff (run `dev-scan-secrets` mentally or explicitly), authorization gaps.
   - **Hygiene**: dead code, debug leftovers, accidental files, oversized diff that should be split.
4. **Verify each finding** before reporting it: re-read the code and confirm the problem is real, not pattern-matched. Drop anything you cannot evidence.
5. **Report.** Findings ordered by severity, each with `file:line`, what is wrong, why it matters (cite the rule or the failure), and a suggested fix. Blocking findings separated from suggestions. If the diff is clean, say so plainly.

## Failure modes

- The diff mixes unrelated changes: the first finding is to split it; review each part on its own merits.
- A finding depends on a project convention you cannot locate: ask instead of inventing a rule.
