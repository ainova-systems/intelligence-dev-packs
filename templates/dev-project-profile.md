---
description: Project-specific configuration consumed by the intelligence-dev-pack rules and skills
---

# Project Profile (dev pack)

> Copy this file into your project's rules source (for example `intelligence/rules/dev-project-profile.md`),
> fill in the values, and delete the guidance comments. Every `dev-*` skill reads this
> file first; missing values fall back to auto-detection from the repository, then to
> asking once. Keep entries as plain `key: value` lines so both humans and agents parse
> them reliably.

## Branching

- default_branch: main              <!-- main | master | ... -->
- integration_branch: none          <!-- develop | none (trunk-based) -->
- branch_prefixes: feature/, bugfix/, hotfix/
- update_strategy: merge            <!-- merge | rebase -->
- protected_branches: main          <!-- comma-separated; default + integration are always protected -->

## Commits

- commit_style: pack-default        <!-- pack-default = one line, capital first letter, past tense -->
- reference_ids: none               <!-- work-item id pattern to include in subjects, e.g. FR-0xx, PROJ-123; none -->

## Verification

- typecheck: npm run typecheck
- lint: npm run lint
- test: npm test
- coverage_gate: none               <!-- e.g. 90% ; none -->

## Pull requests

- platform: github                  <!-- github | gitlab | bitbucket -->
- cli: gh                           <!-- gh | glab | bitbucket api wrapper -->
- pr_target: auto                   <!-- auto = integration branch when set, else default branch -->

## Releases

- release_flow: tag-on-default      <!-- tag-on-default | gitflow-merge -->
- version_source: changelog         <!-- changelog | tags -->
- tag_format: vX.Y.Z

## Documentation

- decisions_dir: docs/decisions
- plans_dir: docs/plans
