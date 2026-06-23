---
name: git-create-release
description: "Cut a release: version, changelog, tag, and release object — policy-driven across trunk/gitflow and tag-only/full"
argument-hint: "[version, e.g. 1.4.0]"
---

# Create a Release

A release reproducible from its tag, with an honest changelog. Releases are outward-facing — publishing (the tag push, or the release object) is the confirmation gate. This skill is **policy-driven**: it reads the project profile and adapts across trunk vs gitflow, direct vs PR vs automated cuts, and tag-only vs full releases. When a key is unset, fall back to the best-practice default below, then auto-detect, then ask once.

## Policy — `dev-project-profile.md` › `## Releases`

- `release_flow` — `tag-on-default` (trunk: cut and tag the default branch) | `gitflow-merge` (merge `develop` → `master`, tag the merge commit). Detect: an existing `develop` branch ⇒ `gitflow-merge`.
- `changelog` — `continuous` *(default)*: every PR already appended its line under `## [Unreleased]`; the release only promotes it. `assembled`: the section is written at release time.
- `release_cut` — how the release commit lands: `direct` | `release-pr` *(default)* | `automated`.
- `release_artifact` — what to publish beyond the tag: `tag-only` | `github-release` *(default)* | `github-release-draft`.
- `release_notes` — release body: `changelog-section` *(default)* | `generated` | `none`.
- `tagger` — `maintainer` *(default)*: a person tags locally and pushes the tag. `ci`: an Action tags on merge; nobody pushes the default branch by hand.
- `version_source` (where the version is bumped, e.g. `package.json` / `changelog`) and `tag_format` (default `vX.Y.Z`).

State the resolved policy in one line before acting.

## Steps

1. **Pre-flight.** Source branch current (`git pull --ff-only`), `git status --porcelain` clean, CI green on HEAD. Red → STOP — that is `git-finalize-pr` territory.
2. **Version.** An explicit argument wins; else derive from commits since `git describe --tags --abbrev=0` — breaking ⇒ major, features ⇒ minor, fixes ⇒ patch (SemVer). Ambiguous → propose and ask.
3. **Changelog + manifest.** `continuous` → promote `## [Unreleased]` into `## [X.Y.Z] — <date>` (an empty `[Unreleased]` ⇒ STOP: nothing to ship). `assembled` → write the section now, entries grouped Added / Changed / Fixed / Breaking. Bump the version in `version_source`. Treat the changelog promotion + version bump as one "release" change-set.
4. **Land the release change-set** on the release target — the default branch for `tag-on-default`, or `master` (after merging `develop`) for `gitflow-merge` — per `release_cut`:
   - `direct` → commit straight to the target. **Only** when the target is unprotected; if it is protected, STOP and use `release-pr`.
   - `release-pr` → commit on a `release/x.y.z` branch, open a PR to the target, get **CI green**, merge per `merge_method`. No direct push — branch protection is satisfied. (`gitflow-merge`: the `develop` → `master` merge IS this PR.)
   - `automated` → defer to the release bot (e.g. release-please): make its open release PR reflect this version, get it green and merged; the bot lands the commit, sets the tag, and creates the release. Skip steps 5–6.
5. **Tag** the release commit (the *merge* commit for `release-pr` / `gitflow-merge`) — annotated, per `tag_format`, message = version plus the changelog headline.
   - `tagger: maintainer` → `git tag -a <tag> <commit>`; **confirm with the owner**, then `git push origin <tag>` — push the *tag*, not a branch. A protected default branch does **not** block a tag push; locking tags is a separate `refs/tags/v*` ruleset.
   - `tagger: ci` → do not tag locally; the merge triggers the CI tagger — verify it ran.
6. **Publish the release object** per `release_artifact`:
   - `tag-only` → done; the tag is the release.
   - `github-release` / `github-release-draft` → `gh release create <tag> --verify-tag --title "<tag> — <headline>"` with the body from `release_notes` (`changelog-section` → `--notes-file <the [X.Y.Z] section>`; `generated` → `--generate-notes`; `none` → `--notes ""`); add `--draft` for the draft variant and `--prerelease` only when the version carries a pre-release suffix (e.g. `-rc.1`). Non-GitHub platforms use their own CLI (`glab release create`, …).
7. **Watch** the deploy/release pipeline to completion when one exists. Report the tag, the changelog section, the release-object URL (if any), and the pipeline outcome.

## Verify

- `git describe --tags` on the release commit prints the new tag; the changelog section matches the shipped diff; CI/deploy is green; any release object is visible at its URL (Latest, or Draft pending publish).

## Scope / hand-off

- Getting the release PR green and merged — `git-finalize-pr` / `git-merge-pr`.
- Keeping `## [Unreleased]` filled per feature PR — that is the `continuous` changelog habit (done at commit time / `git-commit-push`), not this skill.

## CRITICAL

- Never release around a red pipeline; never retag or force-move a published tag.
- A pipeline failure after the tag ships as a NEW patch release, never a rewrite of the failed one.
- `release-pr` and `automated` exist so a protected default branch is never pushed directly. `release_cut: direct` is only for an unprotected target.
