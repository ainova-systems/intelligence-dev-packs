---
name: git-commit-push
description: "Commits pending work as one verified milestone and pushes it. Stops at the push - opening the pull request is git-open-pr."
argument-hint: "[commit message override]"
---

# Commit and Push

Land the pending work as one verified, cleanly described commit. Invoke at milestones - one commit = one shippable-for-testing unit.

## Steps

1. `git branch --show-current` - on a protected branch (default/integration), STOP; work happens on feature branches.
2. Run the gates: typecheck + lint always, tests scoped to the change (`dev-run-tests`). Failure - fix or report, never bypass.
3. Review the diff: `git status --porcelain` + `git diff`. Drop debug leftovers and accidental files. Stage selectively with `git add <paths>` - never blanket `git add -A` (it sweeps secrets and parallel-session work). Then run `git-scan-secrets` (`diff` scope): a live credential in what you are about to commit stops the commit until the value moves to the environment or secret store; one found elsewhere in the pending diff is reported, not swallowed, and does not block this commit.
4. One logical change per commit; unrelated edits split into separate commits. In spec-driven projects, tick the plan's `## Work steps` boxes in the same commit as the code that earns them.
5. Message: one line, capital first letter, past tense, work-item id when the project uses them (`Added export endpoint (FR-042)`). An explicit argument overrides.
6. `git commit`, then `git push` (`-u origin <branch>` on first push). Remote moved - integrate per profile `update_strategy`, re-run gates, push again. Never force-push.

## Verify

- `git log --oneline -1` shows the message; `git status` reports up to date with origin; gates were green on the pushed tree.

## Scope / hand-off

- Opening the PR - `git-open-pr`; CI babysitting and the outcome label - `git-finalize-pr` (or `spec-execute` Phase E in spec projects).

## Constraints

- Never weaken a gate to commit (`dev-verification-gates`); never `--no-verify`.
