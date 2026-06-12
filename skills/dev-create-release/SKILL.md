---
name: dev-create-release
description: Cut a release - resolve the next version, update the changelog, tag, and follow the project's release flow. Use when the integration branch (or main) is ready to ship.
argument-hint: "[version override, e.g. 1.4.0]"
---

# dev-create-release

Produce a release that is reproducible from its tag and honest in its changelog. Releases are outward-facing: confirm before anything is pushed.

## Project profile

Resolve `flow` (`tag-on-default` or `gitflow-merge`), `version_source`, `tag_format`, and branch names from `dev-project-profile.md`; otherwise detect (a `develop` branch implies gitflow-merge) and confirm the flow in one line before acting.

## Steps

1. **Pre-flight.** The release source branch is current, CI is green, and the working tree is clean. A red pipeline stops the release; never ship around it.
2. **Determine the version.** Explicit argument wins. Otherwise derive from the changes since the last tag: breaking changes bump major, features minor, fixes patch. When the history is ambiguous, propose a version and ask.
3. **Update the changelog.** Move `[Unreleased]` content into a new `[X.Y.Z] - <date>` section; write entries as user-visible changes, grouped Added / Changed / Fixed / Breaking. An empty release section is a signal to stop and ask what is actually being shipped.
4. **Execute the flow:**
   - **tag-on-default**: commit the changelog on the default branch (via the normal PR flow when the branch is protected), then tag.
   - **gitflow-merge**: merge the integration branch into the default branch, then tag the merge commit.
5. **Tag** with the profile format (default `vX.Y.Z`), annotated, message = version plus the changelog headline.
6. **Confirm, then push** the branch and the tag explicitly. Pushing a tag publishes the release and typically triggers deploy pipelines; this is the confirmation gate.
7. **Watch the release pipeline** to completion when one exists, and report the outcome with the tag name and changelog section.

## Failure modes

- Version already tagged: stop and report; never retag or force-move a published tag.
- Release pipeline fails after the tag: report precisely; the fix ships as a new patch release, not as a rewrite of the failed one.
