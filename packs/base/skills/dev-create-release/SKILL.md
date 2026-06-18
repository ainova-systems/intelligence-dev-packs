---
name: dev-create-release
description: "Cut a release: version, changelog, tag, per the project's release flow"
argument-hint: "[version, e.g. 1.4.0]"
---

# Create a Release

A release reproducible from its tag, with an honest changelog. Releases are outward-facing: pushing the tag is the confirmation gate.

## Steps

1. Resolve the flow: profile `release_flow` (`tag-on-default` | `gitflow-merge`) and `tag_format`; else detect (a `develop` branch implies gitflow-merge) and confirm in one line.
2. Pre-flight: source branch current (`git pull --ff-only`), `git status --porcelain` clean, CI green on HEAD. Red - STOP; that is `dev-finalize-pr` territory.
3. Version: an explicit argument wins; else derive from `git log $(git describe --tags --abbrev=0)..HEAD --oneline` - breaking changes bump major, features minor, fixes patch. Ambiguous - propose and ask.
4. Changelog: move `[Unreleased]` into `[X.Y.Z] - <date>`; entries as user-visible changes grouped Added / Changed / Fixed / Breaking. An empty section - STOP and ask what is actually being shipped.
5. Execute the flow: `tag-on-default` - changelog commit (via the normal PR flow when the branch is protected), then tag; `gitflow-merge` - merge the integration branch into the default branch, tag the merge commit.
6. Tag annotated per `tag_format` (default `vX.Y.Z`), message = version plus the changelog headline.
7. **Confirm with the owner, then** push the branch and the tag explicitly - the tag push publishes the release and usually triggers deploy pipelines.
8. Watch the release pipeline to completion when one exists; report the tag, the changelog section, and the pipeline outcome.

## Verify

- `git describe --tags` on the release commit prints the new tag; the changelog section matches the shipped diff; the release pipeline is green.

## Scope / hand-off

- Getting branches green and merged - `dev-finalize-pr` / `dev-merge-pr`.

## CRITICAL

- Never release around a red pipeline; never retag or force-move a published tag.
- A release-pipeline failure after the tag ships as a new patch release, never as a rewrite of the failed one.
