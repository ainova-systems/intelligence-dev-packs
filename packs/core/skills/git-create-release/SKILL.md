---
name: git-create-release
description: "Cuts a release - pending-step review, version, changelog, tag, release object - per the project's release policy. Owner-invoked only; release timing is not the model's call."
argument-hint: "[version, e.g. 1.4.0]"
disable-model-invocation: true
---

# Create a Release

A release reproducible from its tag, with an honest changelog and nothing left half-applied. Releases are outward-facing - publishing (the tag push, or the release object) is the confirmation gate. This skill is **policy-driven**: it reads the project profile and adapts across trunk vs gitflow, direct vs release-branch vs automated cuts, and tag-only vs full releases. When a key is unset, fall back to the best-practice default below, then auto-detect, then ask once.

The pipeline ships the code. It does not perform the steps merged PRs left for a human - configuration to import into an externally-hosted system, a secret to register, a hand-deployed stack, a one-off backfill. Each merge records such a step and moves on; nothing re-reads them, so they surface after the release, in production, as behavior that did not change. Step 2 is where they are collected and closed.

## Policy - `dev-project-profile.md` › `## Releases`

- `release_flow` - `tag-on-default` (trunk: cut and tag the default branch) | `gitflow-merge` (merge `develop` → `master`, tag the merge commit). Detect: an existing `develop` branch ⇒ `gitflow-merge`.
- `release_cut` - **the mode**, i.e. how the release change-set lands: `direct` | `release-pr` *(default)* | `automated`.
- `release_review` - where merged PRs declare steps no pipeline performs: `pr-section: <heading>` *(default `pr-section: Deployment notes` when the PR template carries such a section)* | `none` (commits and the diff are then the only sources).
- `manual_apply_globs` - paths whose changes a human applies outside the pipeline: externally-hosted automation/workflow definitions, hand-deployed stacks, secret/env inventories. Default `none`.
- `drift_check` - read-only command reporting divergence between the repository and the live system (an infrastructure plan/diff, an export comparison). Default `none`.
- `changelog` - `continuous` *(default)*: every PR already appended its line under `## [Unreleased]`; the release only promotes it. `assembled`: the section is written at release time.
- `release_docs` - documents the release change-set updates besides the changelog (version matrix, upgrade notes). Default `none`.
- `release_artifact` - what to publish beyond the tag: `tag-only` | `github-release` *(default)* | `github-release-draft`.
- `release_notes` - release body: `changelog-section` *(default)* | `generated` | `none`.
- `tagger` - `maintainer` *(default)*: a person tags locally and pushes the tag. `ci`: an Action tags on merge; nobody pushes the default branch by hand.
- `version_source` (where the version is bumped, e.g. `package.json` / `changelog`) and `tag_format` (default `vX.Y.Z`).

State the resolved policy in one line before acting.

## Steps

1. **Pre-flight.** Source branch current (`git pull --ff-only`), `git status --porcelain` clean, CI green on HEAD. Red → STOP - that is `git-finalize-pr` territory. Establish the window: `<last tag>..<source>`, where the last tag is `git describe --tags --abbrev=0` and the source is the branch being released. For `gitflow-merge`, confirm the release target holds nothing the source lacks (`git log <source>..<target> --oneline` empty) - a hotfix tagged straight onto the target and never merged back is otherwise re-shipped as a regression.
2. **Pending-release review.** Read the window four ways and produce one checklist:
   - **PRs**: `git log --oneline <window>` and the PR numbers its subjects carry; read each PR's `release_review` section. Anything other than "none" is a pending step. A PR merged under an outcome label meaning *a human still has to act* (`git-workflow` › autonomous outcome labels) contributes its steps too - accepted at merge time is not applied.
   - **Diff**: `git diff --name-only <window>` classified against `manual_apply_globs`. Every match is a step with a named target system, whatever its PR said.
   - **Schema/config changes** that a deploy applies on its own (migrations run at startup, self-applying stack files): list them for awareness, and check each is reversible or carries a restore procedure (`dev-rollback-safety`).
   - **Evidence**: run `drift_check` when set. It answers what is *actually* unapplied right now, which no PR body can.

   The checklist names, per step: what, where it came from (PR or path), which system it lands in, and who applies it. An empty checklist is a valid outcome - state that it was checked, not that there was nothing to check.
3. **Owner gate.** Every checklist item is either done now, or explicitly accepted by the owner as a named post-release step (correct when the step depends on the release being deployed first). Anything unanswered → STOP: no landing, no tag. This gate is the reason the skill runs before a release rather than after one.
4. **Version.** An explicit argument wins; else derive from the window - breaking ⇒ major, features ⇒ minor, fixes ⇒ patch (SemVer), or the project's own scheme per `tag_format`. Ambiguous → propose and ask.
5. **Release change-set.** `changelog: continuous` → promote `## [Unreleased]` into `## [X.Y.Z] - <date>`, reconciled against the window so nothing that shipped is missing; `assembled` → write the section now, grouped Added / Changed / Fixed / Breaking. An empty section after reconciliation ⇒ STOP: nothing to ship. Bump `version_source`, update `release_docs`, and carry the step-2 checklist as the change-set's own summary. Changelog + version + release docs are one change-set.
6. **Land the release change-set** on the release target - the default branch for `tag-on-default`, or `master` (after merging `develop`) for `gitflow-merge` - per the `release_cut` mode:
   - `direct` → commit straight to the target. **Only** when the target is unprotected; if it is protected, STOP and use `release-pr`.
   - `release-pr` → commit on a `release/x.y.z` branch, open a PR to the target, get **CI green**, merge per `merge_method`. The branch is the review surface for everything the release changes about itself - changelog, version, release docs - and its PR body carries the step-2 checklist, so the pending steps are reviewed with the release rather than recalled from chat. No direct push - branch protection is satisfied. (`gitflow-merge`: the `develop` → `master` merge IS this PR.)
   - `automated` → defer to the release bot (e.g. release-please): make its open release PR reflect this version, get it green and merged; the bot lands the commit, sets the tag, and creates the release. Skip steps 7–8.
   - When landing this change-set itself triggers a deployment (a pre-production environment that tracks the release target), watch that deployment to green **before** tagging - it is the rehearsal for the tag, on the same commit.
7. **Tag** the release commit (the *merge* commit for `release-pr` / `gitflow-merge`) - annotated, per `tag_format`, message = version plus the changelog headline.
   - `tagger: maintainer` → `git tag -a <tag> <commit>`; **confirm with the owner**, then `git push origin <tag>` - push the *tag*, not a branch. A protected default branch does **not** block a tag push; locking tags is a separate `refs/tags/v*` ruleset.
   - `tagger: ci` → do not tag locally; the merge triggers the CI tagger - verify it ran.
8. **Publish the release object** per `release_artifact`:
   - `tag-only` → done; the tag is the release.
   - `github-release` / `github-release-draft` → `gh release create <tag> --verify-tag --title "<tag> - <headline>"` with the body from `release_notes` (`changelog-section` → `--notes-file <the [X.Y.Z] section>`; `generated` → `--generate-notes`; `none` → `--notes ""`); add `--draft` for the draft variant and `--prerelease` only when the version carries a pre-release suffix (e.g. `-rc.1`). Non-GitHub platforms use their own CLI (`glab release create`, …).
9. **Watch** the deploy/release pipeline to completion when one exists.
10. **Close out.** Re-present the post-release steps the owner accepted in step 3 and confirm each is applied; re-run `drift_check` where it covers one. Report the tag, the changelog section, the release-object URL (if any), the pipeline outcome, and the checklist with every item closed.

## Verify

- `git describe --tags` on the release commit prints the new tag; the changelog section matches the shipped diff; CI/deploy is green; any release object is visible at its URL (Latest, or Draft pending publish); every step-2 item is marked done or accepted-and-applied.

## Scope / hand-off

- Getting the release PR green and merged - `git-finalize-pr` / `git-merge-pr`.
- Keeping `## [Unreleased]` filled per feature PR - that is the `continuous` changelog habit (done at commit time / `git-commit-push`), not this skill.
- Declaring a manual step in the first place - the merging PR's `release_review` section; this skill only collects what is already written there and reads the diff for what is not.

## CRITICAL

- Never tag with an unreviewed window or an unanswered pending step - a release that ships code while its manual steps stay undone leaves the live system running old behavior with nothing recording that it does.
- Never release around a red pipeline; never retag or force-move a published tag.
- A pipeline failure after the tag ships as a NEW patch release, never a rewrite of the failed one.
- `release-pr` and `automated` exist so a protected default branch is never pushed directly. `release_cut: direct` is only for an unprotected target.
