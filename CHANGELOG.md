# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-06-12

### Added

- Eight always-on rules: `dev-orchestration` (multi-agent execution doctrine), `dev-commit-conventions`, `dev-git-workflow`, `dev-skill-first`, `dev-context-engineering`, `dev-spec-discipline`, `dev-verification-gates`, `dev-rollback-safety`.
- Four agents: `dev-architect`, `dev-code-reviewer`, `dev-test-engineer`, `dev-docs-writer`.
- Six orchestrator skills implementing the three-gate owner flow (task, spec review, PR accept): `dev-create-spec` (with a checkpointed grill interview), `dev-execute-spec` (parallel subagents, docs reconciliation, outcome labels, bundled default PR template), `dev-continue-spec`, `dev-execute-next`, `dev-finalize-pr`, `dev-merge-pr`.
- Ten building-block skills: `dev-commit-push`, `dev-review-pr-comments`, `dev-resolve-conflicts`, `dev-run-tests`, `dev-review-changes`, `dev-scan-secrets`, `dev-handoff`, `dev-add-decision`, `dev-docs-sync-check`, `dev-create-release`.
- Project profile template (`templates/dev-project-profile.md`): branch model, verification commands, PR platform and merge method, release flow, docs structure (specs/features/rules/decisions, spec grouping).
- Global install script for Claude Code user-level skills (`scripts/install-global.sh`).
- Pack validation script and CI workflow (`scripts/validate-pack.sh`).
- Integration guide covering submodule + intelligence-sync, global, and plain-copy install modes (`docs/INTEGRATION.md`).
