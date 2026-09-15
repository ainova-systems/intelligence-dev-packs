---
name: dev-init
description: "Sets up a repository to follow the core pack after install: project profile, PR labels, PR template, and harness permission rules. Docs substrate is `spec-init`."
---

# Initialize the core pack

One-time per-repo setup so the rest of core runs against pinned answers instead of re-detecting or asking on the first PR. Idempotent: existing artifacts are gap-filled, never overwritten. Does not commit.

## Pre-flight

The core pack must already be installed (its skills present in the project, whether by package or by the plain-copy path in `docs/integration.md`). This skill does not create the Intelligence project or add packages.

A missing `intelligence.yaml` is not a blocker: that is the copy install, and step 1 writes the profile to `intelligence/rules/`. Sync is skipped when there is no manifest. When `intelligence.yaml` is present and `intelligence status --check` fails, repair with the Intelligence CLI (`intelligence init`) first.

## Steps

1. **Profile.** Read the core pack's `templates/dev-project-profile.md` as the schema (resolve in order: `.intelligence/packages/@ainova-systems/core/templates/`, else `packs/core/templates/` in this repository, else `intelligence/templates/` after a plain copy). If none of those exist, stop and name them. Fill every key from the repository using the schema's own comments as detection hints; ask once when still ambiguous; leave what cannot be detected for the owner. Write `dev-project-profile.md` to `intelligence/rules/` (create the directory if needed). Never write into `packs/` or `.intelligence/packages/` - those are pack and package content, not a project rules source. An existing profile is gap-filled only - explicit values stay, except `verify_section` in step 3.

2. **Labels.** Create each `ai:*` label `git-workflow` names, via profile `cli` (`gh label create` on GitHub). Skip names that already exist. A forge that cannot create labels is a capability gap in the report, not a workaround.

3. **PR template.** Profile `pr_template: none` - skip. A repo template already at `.github/PULL_REQUEST_TEMPLATE.md` or `.github/pull_request_template.md` stays. No repo template - copy the pack default `git-open-pr` ships at `assets/pr-template.md` to `.github/PULL_REQUEST_TEMPLATE.md`. In either case that keeps a template, pin profile `verify_section` to that file's verification heading (`Manual Verification` on the pack default), including when the profile already held a different explicit value.

4. **Harness permission rules.** Merge the same templates directory's `claude-settings.json` into `.claude/settings.json` additively: keep the project's entries, add missing values under every `permissions` list it carries - `deny` for what is never allowed, `ask` for the irreversible acts the owner approves at the command. The mapping of invariants to machinery is `docs/enforcement.md`; further hooks on that page are owner options, not this step.

5. **QA environment.** Resolve profile `qa_env` / `app_run` / `app_url` now, per `git-verify-pr`, so the first pull request is not the first time the question appears.

6. **Protection - reported, never applied.** Read what the forge enforces for the branches the profile names and compare it with what the profile claims: on GitHub `gh api repos/{owner}/{repo}/branches/<branch> --jq '.protected'`, elsewhere the equivalent through profile `cli`. Report each mismatch with the command that would close it - a branch `protected_branches` names that the forge does not protect; `release_cut: direct` against a protected target, which `git-create-release` refuses when it lands the change-set; `release_cut: direct` against an unprotected one, which is legal and worth saying once. Repository settings belong to the owner, so this step changes none of them, and a forge that cannot report protection is a capability gap in the report rather than an assumption.

7. **Line endings - written when absent, reported when present.** Generated output is written LF on every platform, so a checkout that converts text to CRLF puts two endings in one working tree, and every regenerated file reads as a whole-file diff on any machine that is not converting them back. Detect with `git check-attr eol -- <one path per tracked text extension, the generated output among them>`: anything but `lf` is the gap - `unspecified` leaves `core.autocrlf` deciding it per machine, and an explicit `crlf` decides it wrongly. No `.gitattributes` at the repository root - write one carrying `* text=auto eol=lf`. That governs what a checkout writes from then on and converts nothing already on disk, so the files a contributor already has stay as they are until they re-check them out (`git rm --cached -r . && git reset --hard`) - which discards uncommitted work, making it the owner's step on a clean tree and never this one's. `git add --renormalize .` does not stand in for it: it re-cleans the index while the working tree stays exactly as it was, and it stages every tracked modification in the repository, which is the blanket staging `git-commit-push` forbids. One already there - leave the file alone and say which of the two it is: already pinning those paths, which is worth saying once; or a gap, reported with the line that closes it and with the reason it cannot simply be appended - the last matching pattern wins, so a catch-all added at the end silently overrides every rule above it, and which of those was deliberate is the owner's call.

8. **Sync.** When `intelligence.yaml` is present, `intelligence sync` once after steps 1, 3, and 5 have all finished, then `intelligence status --check`. Either command failing is a stop, not a report. No manifest - skip; the profile file is the source. A CLI on PATH without a manifest is still the copy install - do not sync.

9. **Overlap.** List every project rule that overlaps or contradicts a package rule. Project wins; recommend keep / drop / scope. Do not edit project rules.

10. **Report.** Profile values filled vs left; labels created; template copied or skipped; permission rules merged; protection mismatches and what each would take to close; the line-endings outcome; the overlap list; the owner's remaining items. If the spec pack is installed, the next step is `spec-init`. Do not commit or push.

## Verify

- A `dev-project-profile.md` exists in `intelligence/rules/`; every `ai:*` label `git-workflow` names exists on the forge or the report names the capability gap; the PR template outcome is stated (copied / left / skipped); `verify_section` matches the template heading in play when a template is in play; `.claude/settings.json` contains the template's `deny` and `ask` entries when that file was in play; every branch the profile names has its protection state reported against what the profile claims, or the report names the capability gap; the line-endings outcome is stated (attributes file written / gap reported with the line that closes it / already pinned); when `intelligence.yaml` was present, `intelligence status --check` passed after the sync.

## Scope / hand-off

- CLI project creation and package install - the Intelligence CLI (`intelligence init`, `intelligence package add`).
- Docs substrate - `spec-init`.
- Wiring profile `verify` into CI - not this skill.

## Constraints

- Never overwrite a filled profile value, an existing PR template, an existing `.gitattributes`, or an existing settings entry, except `verify_section` when aligning it to the PR template heading in play.
- Report what the forge enforces; never change a repository setting. Detecting a mismatch and deciding what to do about it are different acts, and only the first is this skill's.
- Never commit or push.
- Never recreate `spec-init`'s work.
- Never report completion after a profile mutation without a successful sync when `intelligence.yaml` is present.
- Never sync between profile writes; once, after the last of steps 1, 3, and 5.
