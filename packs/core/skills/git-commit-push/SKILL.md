---
name: git-commit-push
description: "Commits pending work as one verified milestone and pushes it. Stops at the push - opening the pull request is git-open-pr."
argument-hint: "[--only <paths>] [commit message override]"
---

# Commit and Push

Land the pending work as one verified, cleanly described commit. Invoke at milestones - one commit = one shippable-for-testing unit.

## Steps

1. `git branch --show-current` - on a protected branch (default/integration), or on a detached HEAD (a linked worktree waits detached at the integration branch), STOP; work happens on feature branches.
2. When profile `regenerate` is set, run it first, so the committed generated outputs land in the commit that changes their sources. Then run the gates: typecheck + lint always, tests scoped to the change (`dev-run-tests`). Failure - fix or report it (`dev-working-with-people`), never bypass.
3. Review the diff: the commit carries every path `git status --porcelain` lists, whoever made it - a handoff makes that the normal case - unless `--only <paths>` narrows it. Read each one: `git diff` for a tracked path, the file itself for a new one. Drop debug leftovers, accidental files and anything belonging to another change. Name the paths this commit carries - both sides of a rename, and the files `regenerate` rewrote - and `git add` only the new ones among them, by name; never blanket `git add -A` (it sweeps in secrets and the paths this review dropped). Then run `git-scan-secrets` (`diff` scope): a live credential in what you are about to commit stops the commit until the value moves to the environment or secret store; one found elsewhere in the pending diff is reported, not swallowed, and does not block this commit.
4. One logical change per commit; unrelated edits split into separate commits. In spec-driven projects, tick the plan's `## Work steps` boxes in the same commit as the code that earns them, and each spec whose steps the change ticks (`spec.mjs delivered --base origin/<target>`, `spec-validate`) must read `in-progress` or `completed` from `spec.mjs status`. Any other state stops the commit and names where it goes: `stale` to `spec-plan`, `blocked` to `spec-answer`, `planned` or `proposed` to `spec-approve`.
5. Message: one line, capital first letter, past tense, work-item id when the project uses them (`Added export endpoint (FR-042)`). An explicit argument overrides.
6. `git commit --only -m "<the step-5 message>" -- <the step-3 paths>`, then `git push` (`-u origin <branch>` on first push; from a detached HEAD a project allows to commit, `git push origin HEAD:<branch>`). It commits those paths alone and leaves anything else staged, such as another step's rename, out of this commit; git refuses a path it does not know yet, so step 3 adds the new ones first. The message travels as an argument: a bare `git commit` opens the configured editor and the run stops there until a human closes the window. A body, or any message carrying a backtick or a quote, goes in a file and commits with `-F <file>` - that punctuation is live syntax to bash and to PowerShell alike. Remote moved - integrate per profile `update_strategy`, re-run gates, push again. Never force-push.

## Verify

- What it published holds nothing `git-commit-conventions` forbids in a published artifact.
- `git log --oneline -1` shows the message; `git status` reports up to date with origin - from a detached HEAD, `HEAD` equals the `origin/<branch>` it was pushed to; gates were green on the pushed tree.
- `git show --name-only --no-renames --format= HEAD` lists exactly the step-3 paths; with `regenerate` set, running it again leaves `git status --porcelain` unchanged.

## Scope / hand-off

- Opening the PR, or rebuilding the body of the one already open after this push - `git-open-pr`; the CI / verify / review rounds - `git-finalize-pr`; the outcome - `git-complete-pr` (or `spec-execute` Phase E in spec projects).

## Constraints

- Never weaken a gate to commit (`dev-verification-gates`); never `--no-verify`.
