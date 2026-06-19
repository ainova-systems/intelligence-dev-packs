---
description: Project-specific configuration consumed by the intelligence-dev-packs rules and skills
---

# Project Profile (schema)

> This is the **schema**, not a file to copy by hand. The profile is optional: skills
> auto-detect from the repository and ask once when ambiguous. To pin the answers, an AI
> agent fills this from the repo and saves it as `dev-project-profile.md` in a rules source,
> where it becomes an always-on rule. Skills resolve each value in order: this profile, then
> auto-detection, then asking once. Keep entries as plain `key: value` lines so both humans
> and agents parse them reliably.

## Branching

- default_branch: main              <!-- main | master | ... -->
- integration_branch: none          <!-- develop | none (trunk-based) -->
- branch_prefixes: feature/, bugfix/, hotfix/
- update_strategy: merge            <!-- merge | rebase -->
- protected_branches: main          <!-- comma-separated; default + integration are always protected -->

## Commits

- commit_style: pack-default        <!-- pack-default = one line, capital first letter, past tense -->
- reference_ids: none               <!-- work-item id pattern for subjects, e.g. FR-0xx, PROJ-123; none -->

## Verification

- typecheck: npm run typecheck
- lint: npm run lint
- test: npm test
- coverage_gate: none               <!-- e.g. 90% ; none -->

## Pull requests

- platform: github                  <!-- github | gitlab | bitbucket -->
- cli: gh                           <!-- gh | glab | bitbucket api wrapper -->
- pr_target: auto                   <!-- auto = integration branch when set, else default branch -->
- merge_method: squash              <!-- squash | merge | rebase -->

## Releases

- release_flow: tag-on-default      <!-- tag-on-default | gitflow-merge -->
- version_source: changelog         <!-- changelog | tags -->
- tag_format: vX.Y.Z

## Documentation

- specs_dir: docs/specs             <!-- change specs: NNN-<slug>/ with requirements/plan/tasks -->
- spec_grouping: flat               <!-- flat | quarterly (docs/specs/<yyyy>-Q<n>/NNN-<slug>/) -->
- features_dir: docs/features      <!-- behavior-baseline feature docs -->
- rules_dir: docs/rules             <!-- business rules as contracts -->
- decisions_dir: docs/decisions     <!-- numbered ADRs -->
