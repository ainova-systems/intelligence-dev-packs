---
name: git-commit-push
description: "Verify, review, and push pending work as one milestone commit"
argument-hint: "[commit message override]"
---

# Commit and Push

Land the pending work as one verified, cleanly described commit. Invoke at milestones - one commit = one shippable-for-testing unit.

## Steps

1. `git branch --show-current` - on a protected branch (default/integration), STOP; work happens on feature branches (the orchestrators create them in Phase B).
2. Run the gates: typecheck + lint always, tests scoped to the change (`dev-run-tests`). Failure - fix or report, never bypass.
3. Review the diff: `git status --porcelain` + `git diff`. Drop debug leftovers and accidental files. Stage selectively with `git add <paths>` - never blanket `git add -A` (it sweeps secrets and parallel-session work).
4. One logical change per commit; unrelated edits split into separate commits. Tick the spec's `tasks.md` boxes in the same commit as the code that earns them.
5. Message: one line, capital first letter, past tense, work-item id when the project uses them (`Added export endpoint (FR-042)`). An explicit argument overrides.
6. `git commit`, then `git push` (`-u origin <branch>` on first push). Remote moved - integrate per profile `update_strategy`, re-run gates, push again. Never force-push.

## Verify

- `git log --oneline -1` shows the message; `git status` reports up to date with origin; gates were green on the pushed tree.

## Scope / hand-off

- PR creation and CI babysitting - `spec-execute` Phase E / `git-finalize-pr`.

## CRITICAL

- No `Co-Authored-By:` or tool trailers; no `feat:`-style prefixes unless the profile `commit_style` requires them.
- Never weaken a gate to commit (`dev-verification-gates`); never `--no-verify`.
