---
name: dev-open-pr
description: Open a pull request with a complete description and watch CI to green. Use when a branch is ready for review.
argument-hint: "[pr title override]"
---

# dev-open-pr

Open a pull request that a reviewer can approve without asking questions, and stay with it until CI is green.

## Project profile

Resolve `pr_target` (integration branch when one exists, otherwise default), `platform`, and `cli` (`gh` for GitHub by default) from `dev-project-profile.md`; otherwise detect from the remote URL.

## Steps

1. **Pre-flight.** Branch is pushed and current with its target; local gates pass (`dev-verification-gates`). Push first if needed via `dev-commit-push`.
2. **Resolve the target branch** per the profile and `dev-git-workflow`.
3. **Compose the PR.**
   - Title: same style as a commit subject, work-item ID included when the project uses them.
   - Body: what changed and why (2-5 sentences); how it was verified (gates run, manual checks); breaking changes and the migration path, or `None`; rollback note for risky changes (`dev-rollback-safety`).
4. **Create it** with the platform CLI (`gh pr create --base <target> ...` or the project's equivalent).
5. **Watch CI.** Poll until checks finish. On failure: fetch the failing log, fix the cause on the branch, push, and re-watch. Repeat until green or until the failure needs a human decision; then report it precisely.
6. **Report.** PR URL, target branch, CI status.

## Failure modes

- No platform CLI available or unauthenticated: output the prepared title and body so the user can create the PR manually, and say which command would have been run.
- CI failure caused by the target branch itself (red before the PR): report it as a pre-existing failure instead of "fixing" unrelated code on this branch.
