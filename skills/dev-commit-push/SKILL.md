---
name: dev-commit-push
description: Verify, review, commit, and push pending changes with a clean one-line message. Use when work is ready to be committed and pushed to the current branch.
argument-hint: "[commit message override]"
---

# dev-commit-push

Commit and push the pending work so every commit on the remote is verified, reviewed, and cleanly described.

## Project profile

Resolve `protected_branches`, `typecheck`/`lint`/`test` commands, and `commit_style` from `dev-project-profile.md`; otherwise detect (default branch + `develop` are protected; commands from project manifests).

## Steps

1. **Check the branch.** If on a protected branch, stop and offer `dev-start-feature` first. Never commit directly to protected branches.
2. **Run the gates.** Typecheck and lint always; tests scoped to the changed area at minimum, full suite when the change is risky. A failing gate stops the skill: fix or report, never bypass (`dev-verification-gates`).
3. **Review the diff.** `git status` and `git diff` over everything pending. Remove debug leftovers, accidental files, and unrelated edits. For a large or risky diff, run `dev-review-changes` first.
4. **Stage one logical change.** If the pending work is several unrelated changes, split into separate commits.
5. **Compose the message.** One line, capital first letter, past tense, work-item ID when the project uses them (`dev-commit-conventions`). An explicit argument overrides the generated message.
6. **Commit and push.** `git commit`, then `git push` (with `-u origin <branch>` on first push). Fast-forward only: if the remote moved, integrate per the profile `update_strategy` and re-run the gates before pushing.
7. **Report.** Commit hash, message, branch, and gate results in one short summary.

## Failure modes

- Gates fail: report the failing output and stop. Fixing the failure is its own step, never `--no-verify`.
- Push rejected: never force-push. Integrate the remote changes and retry.
- Nothing staged after review: say so; do not manufacture an empty commit.
