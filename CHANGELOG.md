# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Split content into two adoption-based packs with domain prefixes: `core` (`dev-` discipline + `git-` vcs, install everywhere) and `spec` (`spec-`, opt-in spec-driven development, depends on core). Pack (adoption unit) and domain prefix (namespace) are decoupled, so a pack may hold several domains and re-grouping never forces a rename.
- Renamed artifacts to domain prefixes: git/PR/release skills to `git-*` (`git-commit-push`, `git-finalize-pr`, `git-merge-pr`, `git-create-release`, `git-scan-secrets`, …); spec-driven skills to `spec-*` (`spec-create`, `spec-execute`, `spec-execute-next`, `spec-add-decision`, `spec-audit-docs`, …); discipline/session skills stay `dev-*` (`dev-handoff`, `dev-run-tests`, `dev-review-changes`). Rules and agents follow the same scheme.
- Restructured the repo under `packs/<name>/`; consumers select packs by subpath. Source paths are now `packs/{core,spec}/{rules,agents,skills}`.
- `validate-pack.sh` validates artifacts against a known domain-prefix set (multi-domain packs allowed); `claude-install-global.sh` installs every pack by default, or named packs.
- Renamed the repository to `intelligence-dev-packs`.

### Added

- Completed the spec lifecycle, machine-tracked and AI-driven end to end (owner touches only the three gates). New skills: `spec-approve` (gate-1 decision -> `approved` queue), `spec-close` (post-merge -> `completed` + archive), `spec-cancel` (retire cancelled/superseded with a recorded reason), `spec-document` (write/update one docs artifact - feature, rule, glossary, model, architecture). A `status` field (`proposed -> approved -> in-progress -> completed`, plus `cancelled`/`superseded`) tracks each spec; the model and the auto-sync invariant are documented in the `spec-orchestration` rule.
- Wired the transitions: `spec-create` writes `status: proposed` and gained update-mode (re-scope an existing spec); `spec-execute` sets `in-progress` and reconciles model/glossary in Phase D; `spec-execute-next` drains the `approved` queue (primary) plus in-progress-no-PR and closes merged specs on reset; `git-merge-pr` hands off to `spec-close` (optional, spec-driven projects). Docs and status stay in sync automatically on create, execute, close, cancel, and merge - never by hand.
- `spec-init` skill: one-time bootstrap that scaffolds the in-repo docs substrate (Layer C knowledge base + Layer B rules-as-contracts, decision log, dependency map) and safely migrates existing documentation into it (quarantine to `_inbox/`, reclassify one-by-one, nothing deleted), drafting core docs from code for owner review. Learns and adopts an existing docs structure rather than imposing one. Grounded in the Ainova Systems AI-First readiness methodology and the ai-first-docs tree.
- Documented the remote `git+<url>[@<ref>][#<subpath>]` source mode as the recommended install method (no submodule), including the URL scheme and slashless-ref rules.

## [0.1.0] - 2026-06-12

### Added

- Eight always-on rules: `dev-orchestration` (multi-agent execution doctrine), `dev-commit-conventions`, `dev-git-workflow`, `dev-skill-first`, `dev-context-engineering`, `dev-spec-discipline`, `dev-verification-gates`, `dev-rollback-safety`.
- Four agents: `dev-architect`, `dev-code-reviewer`, `dev-test-engineer`, `dev-docs-writer`.
- Six orchestrator skills implementing the three-gate owner flow (task, spec review, PR accept): `dev-create-spec` (with a checkpointed grill interview), `dev-execute-spec` (parallel subagents, docs reconciliation, outcome labels, bundled default PR template), `dev-continue-spec`, `dev-execute-next`, `dev-finalize-pr`, `dev-merge-pr`.
- Ten building-block skills: `dev-commit-push`, `dev-review-pr-comments`, `dev-resolve-conflicts`, `dev-run-tests`, `dev-review-changes`, `dev-scan-secrets`, `dev-handoff`, `dev-add-decision`, `dev-audit-docs`, `dev-create-release`.
- Project profile template (`templates/dev-project-profile.md`): branch model, verification commands, PR platform and merge method, release flow, docs structure (specs/features/rules/decisions, spec grouping).
- Global install script for Claude Code user-level skills (`scripts/claude-install-global.sh`).
- Pack validation script and CI workflow (`scripts/validate-pack.sh`).
- Integration guide covering submodule + intelligence-sync, global, and plain-copy install modes (`docs/INTEGRATION.md`).
