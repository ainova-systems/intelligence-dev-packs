---
name: dev-init
description: "Sets up a repository to follow the core pack after install: project profile, PR labels, PR template, and harness deny-list. Docs substrate is `spec-init`."
---

# Initialize the core pack

One-time per-repo setup so the rest of core runs against pinned answers instead of re-detecting or asking on the first PR. Idempotent: existing artifacts are gap-filled, never overwritten. Does not commit.

## Pre-flight

The core pack must already be installed (its skills present in the project, whether by package or by the plain-copy path in `docs/integration.md`). This skill does not create the Intelligence project or add packages.

A missing `intelligence.yaml` is not a blocker: that is the copy install, and step 1 already writes the profile to `intelligence/rules/`. `intelligence sync` is skipped when the CLI is absent. When `intelligence.yaml` is present and `intelligence status --check` fails, repair with the Intelligence CLI (`intelligence init`) first.

## Steps

1. **Profile.** Read this pack's `templates/dev-project-profile.md` as the schema. Fill every key from the repository using the schema's own comments as detection hints; ask once when still ambiguous; leave what cannot be detected for the owner. Write `dev-project-profile.md` to the project's own rules source (the `sources.rules` path in `intelligence.yaml` that is not under `.intelligence/packages/`; without a manifest, `intelligence/rules/`). An existing profile is gap-filled only - explicit values stay.

2. **Labels.** Create each `ai:*` label `git-workflow` names, via profile `cli` (`gh label create` on GitHub). Skip names that already exist. A forge that cannot create labels is a capability gap in the report, not a workaround.

3. **PR template.** Profile `pr_template: none` - skip. A repo template already at `.github/PULL_REQUEST_TEMPLATE.md` or `.github/pull_request_template.md` stays; if its verification heading is not the profile `verify_section`, pin `verify_section` to that heading. No repo template - copy the pack default `git-open-pr` ships at `assets/pr-template.md` to `.github/PULL_REQUEST_TEMPLATE.md`.

4. **Harness deny-list.** Merge this pack's `templates/claude-settings.json` into `.claude/settings.json` additively: keep the project's entries, add missing `permissions.deny` values. The mapping of invariants to machinery is `docs/enforcement.md`; further hooks on that page are owner options, not this step.

5. **QA environment.** Resolve profile `qa_env` / `app_run` / `app_url` now, per `git-verify-pr`, so the first pull request is not the first time the question appears.

6. **Sync.** When the CLI is present, `intelligence sync` after every profile mutation above, then `intelligence status --check`. Either command failing is a stop, not a report. No CLI - skip; the profile file is the source.

7. **Overlap.** List every project rule that overlaps or contradicts a package rule. Project wins; recommend keep / drop / scope. Do not edit project rules.

8. **Report.** Profile values filled vs left; labels created; template copied or skipped; deny-list merged; the overlap list; the owner's remaining items. If the spec pack is installed, the next step is `spec-init`. Do not commit or push.

## Verify

- A `dev-project-profile.md` exists in a project rules source; every `ai:*` label `git-workflow` names exists on the forge or the report names the capability gap; the PR template outcome is stated (copied / left / skipped); `.claude/settings.json` contains the template's deny entries when that file was in play; when the CLI was present, `intelligence status --check` passed after the sync.

## Scope / hand-off

- CLI project creation and package install - the Intelligence CLI (`intelligence init`, `intelligence package add`).
- Docs substrate - `spec-init`.
- Wiring profile `verify` into CI - not this skill.

## Constraints

- Never overwrite a filled profile value, an existing PR template, or an existing settings entry.
- Never commit or push.
- Never recreate `spec-init`'s work.
- Never report completion after a profile mutation without a successful sync when the CLI is present.
