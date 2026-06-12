# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-06-12

### Added

- Seven always-on rules: `dev-commit-conventions`, `dev-git-workflow`, `dev-skill-first`, `dev-context-engineering`, `dev-spec-discipline`, `dev-verification-gates`, `dev-rollback-safety`.
- Four agents: `dev-architect`, `dev-code-reviewer`, `dev-test-engineer`, `dev-docs-writer`.
- Fourteen skills: `dev-start-feature`, `dev-commit-push`, `dev-open-pr`, `dev-resolve-conflicts`, `dev-review-pr-comments`, `dev-review-changes`, `dev-run-tests`, `dev-scan-secrets`, `dev-plan-feature`, `dev-impact-analysis`, `dev-add-decision`, `dev-docs-sync-check`, `dev-generate-handoff`, `dev-create-release`.
- Project profile template (`templates/dev-project-profile.md`) for per-project configuration: branch model, verification commands, PR platform, release flow.
- Global install script for Claude Code user-level skills (`scripts/install-global.sh`).
- Pack validation script and CI workflow (`scripts/validate-pack.sh`).
- Integration guide covering submodule + intelligence-sync, global, and plain-copy install modes (`docs/INTEGRATION.md`).
