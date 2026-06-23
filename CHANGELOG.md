# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`git-open-pr` skill.** Opens a PR for the current branch against its target, closing the gap between `git-commit-push` (commit + push only) and `git-finalize-pr` (drives an existing PR) for projects without the spec pack's Phase E. Idempotent (never opens a second PR), targets profile `pr_target`, fills the repo's `.github/PULL_REQUEST_TEMPLATE.md` when present, honors `artifact_language`, and prepends a deterministic Risk/Size line when `pr_risk_size: on`.
- **Autonomous outcome labels are now defined in `core`.** `git-workflow` documents `ai:ready-to-merge` / `ai:manual` / `ai:failed` as the single shared convention, so `git-finalize-pr` no longer relies on a spec-pack rule for their meaning.
- **New profile knobs** in `dev-project-profile.md`: `artifact_language`, `auto_open_pr`, `pr_template`, `pr_risk_size`, `pr_size_thresholds`, `pr_risk_globs`, `delete_local_branch`, `delete_remote_branch`, `post_merge`.

### Changed

- **`git-merge-pr` honors per-project cleanup and a post-merge hook.** Local/remote branch deletion follow profile `delete_local_branch` / `delete_remote_branch`, and an optional profile `post_merge` command runs after a confirmed merge (e.g. to regenerate committed generated outputs so the base is never left stale).
- **`git-review-pr-comments` verifies before trusting.** Reviewer claims (especially from bots) are checked against sibling code and rules before acceptance; a real fix also fixes the same class across the tree and corrects any wrong documented rule in the same change; every handled thread is replied to AND resolved so re-runs skip it.
- **`git-create-release` is now policy-driven across the full release matrix.**

### Fixed

- **`git-merge-pr` local-branch deletion after a squash/rebase merge.** The skill previously prescribed `git branch -d` only, which always refuses after a squash or rebase merge ("not fully merged") because the feature branch is not an ancestor of the base. It now keys deletion on the confirmed PR `state == MERGED` and uses `-D` for squash/rebase (and `-d` for merge-commit merges), so cleanup actually completes. Instead of assuming one flow, the skill reads the project profile's `## Releases` keys and adapts: `release_flow` (trunk `tag-on-default` vs `gitflow-merge`), `changelog` (`continuous` vs `assembled`), `release_cut` (`direct` | `release-pr` | `automated`), `release_artifact` (`tag-only` | `github-release` | `github-release-draft`), `release_notes` (`changelog-section` | `generated` | `none`), and `tagger` (`maintainer` | `ci`). Best-practice defaults — continuous changelog, release-PR cut, full GitHub Release, maintainer tag — apply when a key is unset. It lands the release change-set through a `release/x.y.z` PR on protected branches (never a direct push), tags the merge commit and pushes the *tag* (which branch protection does not block), and creates the platform release object via `gh release create`. The `core` profile template documents every key.

## [0.1.0] - 2026-06-19

Initial release.

### Added

- **Packs and domains.** Content is organized into adoption-based packs under `packs/`, with domain-prefixed artifacts (`dev-` / `git-` / `spec-`). Pack (what you install together) and domain prefix (the artifact namespace) are decoupled, so a pack may hold several domains and re-grouping never forces a rename.
- **core pack** (`packs/core/`) - universal engineering discipline and version control; install everywhere, no dependencies:
  - Rules: `dev-skill-first`, `dev-context-engineering`, `dev-verification-gates`, `dev-rollback-safety`, `git-commit-conventions`, `git-workflow`.
  - Agents: `dev-code-reviewer` (read-only), `dev-test-engineer`.
  - Skills: `dev-run-tests`, `dev-review-changes`, `dev-handoff`, `git-commit-push`, `git-resolve-conflicts`, `git-review-pr-comments`, `git-finalize-pr`, `git-merge-pr`, `git-create-release`, `git-scan-secrets`.
  - Project profile template `templates/dev-project-profile.md` (branch model, verification commands, PR platform and merge method, release flow, docs structure).
- **spec pack** (`packs/spec/`) - opt-in spec-driven development; depends on core:
  - Rules: `spec-discipline`, `spec-orchestration` (multi-agent doctrine + the spec status model).
  - Agents: `spec-architect`, `spec-docs-writer`.
  - Skills: the machine-tracked spec lifecycle, where the owner touches only three gates (task, spec review, PR accept): `spec-init` (bootstrap the in-repo docs substrate and migrate existing docs), `spec-create` (create or update a spec), `spec-approve` (gate-1 decision into the autonomous queue), `spec-execute` / `spec-continue` / `spec-execute-next` (run to an outcome-labeled PR), `spec-close` (post-merge finalize), `spec-cancel` (retire with a recorded reason), `spec-document` (write/update a docs artifact), `spec-decision` (numbered ADR), `spec-audit-docs` (docs-vs-code drift). A `status` field (`proposed -> approved -> in-progress -> completed`, plus `cancelled` / `superseded`) tracks each spec; status and docs stay in sync automatically at every transition.
- **Project adaptation.** Every skill resolves project specifics in a fixed order - learn from the project, then the `dev-project-profile.md` profile, then ask once - so one set of packs serves `main`-only, `master`-only, and `master` + `develop` repos without editing any artifact. Greenfield docs follow the ai-first-docs tree; grounded in the Ainova Systems AI-First readiness methodology.
- **Four install modes**: remote `git+` sources via intelligence-sync (recommended, zero-footprint), git submodule, global Claude Code skills (`scripts/claude-install-global.sh`), and plain copy. Documented in `docs/INTEGRATION.md`.
- **Tooling**: `scripts/validate-pack.sh` (validates every pack against the known domain-prefix set) plus a CI workflow.

### Compatibility

- Remote `git+` sources need an intelligence-sync build with that feature (lands after 0.4.2); submodule and copy modes work with 0.3.1 or later. The packs also work without the sync engine, consumed directly by any tool that reads `SKILL.md` folders.
