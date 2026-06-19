# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
