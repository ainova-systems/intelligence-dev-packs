---
name: dev-init
description: "Sets up a repository to follow the core pack after install: project profile, PR labels, PR template, and harness permission rules. Docs substrate is `spec-init`."
---

# Initialize the core pack

One-time per-repo setup so the rest of core runs against pinned answers instead of re-detecting or asking on the first PR. Idempotent: existing artifacts are gap-filled, never overwritten. Does not commit.

## Pre-flight

The core pack must already be installed (its skills present in the project, whether by package or by the plain-copy path in `docs/integration.md`). This skill does not create the Intelligence project or add packages.

A missing `intelligence.yaml` is not a blocker: that is the copy install, and step 1 writes the profile to `intelligence/rules/`. Sync is skipped when there is no manifest. When `intelligence.yaml` is present and `intelligence status --check` fails, repair with the Intelligence CLI (`intelligence init`) first.

Report the host, changing nothing: `node --version`, `git --version`, whether `make` is on PATH, `core.autocrlf`, and on Windows `core.longpaths`, the `LongPathsEnabled` registry value and whether a symbolic link can be made (one in the OS temp directory, then removed). `references/windows-hosts.md` says what each answer breaks.

## Steps

1. **Profile.** Read the core pack's `templates/dev-project-profile.md` as the schema (resolve in order: `.intelligence/packages/@ainova-systems/core/templates/`, else `packs/core/templates/` in this repository, else `intelligence/templates/` after a plain copy). If none of those exist, stop and name them. Fill every key from the repository using the schema's own comments as detection hints; ask once when still ambiguous; leave what cannot be detected for the owner. Write `dev-project-profile.md` to `intelligence/rules/` (create the directory if needed). Never write into `packs/` or `.intelligence/packages/` - those are pack and package content, not a project rules source. An existing profile is gap-filled only - explicit values stay, except `verify_section` in step 3.

2. **Labels.** Create each `ai:*` label `git-workflow` names, via profile `cli` (`gh label create` on GitHub). Skip names that already exist. A forge that cannot create labels is a capability gap in the report, not a workaround.

   **Report every other `ai:*` label the forge already carries, and delete none.** Each is either dead or a second vocabulary, and a second vocabulary fails in the one way nobody can see from either side: the gates read one set of names while the project's own skills write the other, so a pull request ends on a label that is finished to whoever wrote it and invisible to whatever merges - green, reviewed, and outside the queue. Name each extra with what would end it: retire it, or declare it in profile `pr_success_factors`, which is where a factor an external agent, worker or pipeline applies is legitimately declared. The choice is the owner's; the report is what makes it one.

3. **PR template.** Profile `pr_template: none` - skip. A repo template already at `.github/PULL_REQUEST_TEMPLATE.md` or `.github/pull_request_template.md` stays. No repo template - copy the pack default `git-open-pr` ships at `assets/pr-template.md` to `.github/PULL_REQUEST_TEMPLATE.md`. In either case that keeps a template, pin profile `verify_section` to that file's verification heading (`Manual Verification` on the pack default), including when the profile already held a different explicit value.

4. **Harness settings.** Merge the same templates directory's `claude-settings.json` into `.claude/settings.json` additively: keep the project's entries, reporting an `attribution` value that differs from the template's, and add each missing key, list value and hook handler - `deny` for what is never allowed, `ask` for the irreversible acts the owner approves at the command. Profile `secrets_file` turns `Read(.env.local)` into `Read(<its path>)`, or drops it for `none`. Report the harmless commands the rules also deny: `git clean -n`, `git stash list`, `git restore --staged`, a commit message holding ` -n `. Claude Code loads an `AGENTS.md` alongside `.claude/rules/` when no `CLAUDE.md`, `.claude/CLAUDE.md` or `CLAUDE.local.md` exists; then a missing `claudeMdExcludes` is reported, never written, because the Intelligence engine owns that key. `docs/enforcement.md` maps each invariant to its machinery and names what no text rule stops; its other hooks are owner options.

   **The push guard** is the template's `PreToolUse` hook: this skill's `scripts/guard-push.mjs` denies a push to a branch profile `protected_branches` names unless every path it changes matches profile `direct_lane`. A project whose skills render outside `.claude/skills/` points it at that copy. A push-deny rule naming a protected branch, as earlier runs wrote, is reported as superseded for the owner to remove: it also blocks what `direct_lane` allows.

5. **QA environment.** Resolve profile `qa_env` / `app_run` / `app_url` now, per `git-verify-pr`, so the first pull request is not the first time the question appears.

6. **Protection - reported, never applied.** Read what the forge enforces for the branches the profile names and compare it with what the profile claims: on GitHub `gh api repos/{owner}/{repo}/branches/<branch> --jq '.protected'`, elsewhere the equivalent through profile `cli`. Report each mismatch with the command that would close it - a branch `protected_branches` names that the forge does not protect; `release_cut: direct` against a protected target, which `git-create-release` refuses when it lands the change-set; `release_cut: direct` against an unprotected one, which is legal and worth saying once. Repository settings belong to the owner, so this step changes none of them, and a forge that cannot report protection is a capability gap in the report rather than an assumption.

7. **Line endings - written when absent, reported when present.** Generated output is written LF on every platform, so a checkout that converts text to CRLF shows every regenerated file as a whole-file diff. Detect with `git check-attr eol -- <one path per tracked text extension, the generated output among them>`: anything but `lf` is the gap - `unspecified` leaves `core.autocrlf` deciding per machine, an explicit `crlf` decides wrongly. No `.gitattributes` at the repository root - write one carrying `* text=auto eol=lf`. It converts nothing already on disk: files stay as they are until re-checked out (`git rm --cached -r . && git reset --hard`), which discards uncommitted work and so is the owner's step on a clean tree. `git add --renormalize .` is no substitute: it leaves the working tree as it was and stages every tracked modification, the blanket staging `git-commit-push` forbids. One already there - leave it alone and say whether it already pins those paths, or report the gap with the line that closes it and why appending fails: the last matching pattern wins, so a catch-all at the end overrides every rule above it, and which of those was deliberate is the owner's call.

8. **Sync.** When `intelligence.yaml` is present, `intelligence sync` once after steps 1, 3, and 5 have all finished, then `intelligence status --check`. Either command failing is a stop, not a report. No manifest - skip; the profile file is the source. A CLI on PATH without a manifest is still the copy install - do not sync.

9. **Overlap.** List every project rule that overlaps or contradicts a package rule. Project wins; recommend keep / drop / scope. Do not edit project rules.

10. **Report.** The host facts from pre-flight; profile values filled vs left; labels created, and every other `ai:*` label with what would end it; template copied or skipped; settings merged, with the accepted false positives, any superseded push-deny rule and any `attribution` or `claudeMdExcludes` item; protection mismatches and what each would take to close; the line-endings outcome; the overlap list; the owner's remaining items. If the spec pack is installed, the next step is `spec-init`. Do not commit or push.

## Verify

- The host facts are reported; a `dev-project-profile.md` exists in `intelligence/rules/`; every `ai:*` label `git-workflow` names exists on the forge or the report names the capability gap; every other `ai:*` label on the forge is listed with what would end it; the PR template outcome is stated (copied / left / skipped); `verify_section` matches the template heading in play when a template is in play; `.claude/settings.json` contains the template's `attribution`, `deny`, `ask` and `hooks` entries when that file was in play, and every push-deny rule naming a protected branch is reported as superseded; every branch the profile names has its protection state reported against what the profile claims, or the report names the capability gap; the line-endings outcome is stated (attributes file written / gap reported with the line that closes it / already pinned); when `intelligence.yaml` was present, `intelligence status --check` passed after the sync.

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
