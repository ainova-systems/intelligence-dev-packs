---
name: git-open-pr
description: "Opens a pull request for the current branch against its target, filling the repo's template. Driving it to green afterwards is git-finalize-pr."
argument-hint: "[title override]"
---

# Open a PR

Turn a pushed feature branch into a reviewable PR. Idempotent: if a PR already exists for the branch, report it and stop - never open a second.

## Steps

1. `git branch --show-current` - on a protected branch (default/integration), STOP; a PR is opened FROM a feature branch.
2. Confirm the branch is pushed and current: `git rev-parse HEAD` equals `git rev-parse @{u}` - unpushed work goes through `git-commit-push` first.
3. Existing-PR check: `gh pr list --head <branch> --state open --json number,url --jq '.[0]'`. Non-empty - report the URL and STOP (nothing to open).
4. Resolve the target from profile `pr_target` (default `auto` - the integration branch when one exists, else the default branch).
5. Title: an explicit argument wins; else the latest commit subject (`git log -1 --pretty=%s`). Honor profile `artifact_language` for title and body when set (e.g. write them in English even when the working language differs).
6. Body: if the repo has a PR template (`.github/PULL_REQUEST_TEMPLATE.md` or `.github/pull_request_template.md`), fill ITS sections honestly - real content per section, "None" where one genuinely does not apply; never leave the template's hint comments. No template - a concise default: what & why, the changes, and how to verify (the concrete steps or call a reviewer runs, plus the gates already run). When profile `pr_risk_size: on`, prepend the deterministic Risk/Size line (below).
7. Open it: `gh pr create --base <target> --title <title> --body-file <file>` (`--body-file` avoids shell-quoting traps). On non-GitHub platforms use the profile `cli` (`glab mr create`, ...).
8. Report the PR URL and number.

## Risk & Size (only when profile `pr_risk_size: on`)

Compute both mechanically so the same diff always yields the same flags:

- **Size** from `git diff <target>...HEAD --shortstat`: thresholds from profile `pr_size_thresholds` (default `small <= 5 files & 50 lines; large >= 20 files or 400 lines; else medium`).
- **Risk** = the highest-matching category from profile `pr_risk_globs` (path globs mapped to high / medium / low). No profile globs - skip Risk rather than guess.

State one value each, e.g. `Risk: low | Size: small`.

## Verify

- Exactly one open PR for the branch; it targets the resolved base; the body has real content (no template hint comments left).

## Scope / hand-off

- Committing/pushing first - `git-commit-push`; driving the opened PR to green and draining comments - `git-finalize-pr`; merging - `git-merge-pr`.

## CRITICAL

- Idempotent: never open a second PR when one is already open for the branch.
- Never open a PR from a protected branch, or from a branch with unpushed commits.
