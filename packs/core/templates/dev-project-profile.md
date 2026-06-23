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
- artifact_language: repo-default   <!-- language for commit / PR / code-comment text, e.g. english; repo-default = match the repository -->

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
- auto_open_pr: true                <!-- open a PR on first push when none exists (git-open-pr); false = open manually -->
- pr_template: auto                 <!-- auto = use .github/PULL_REQUEST_TEMPLATE.md if present | none -->
- pr_risk_size: off                 <!-- off | on (git-open-pr prepends a deterministic Risk/Size line) -->
- pr_size_thresholds: small <= 5 files & 50 lines; large >= 20 files or 400 lines; else medium
- pr_risk_globs: none               <!-- e.g. high: **/Migrations/**, **/*Permission*; medium: src/shared/**; low: **/*.md ; none = skip Risk -->
- delete_local_branch: true         <!-- delete the local branch after a confirmed merge -->
- delete_remote_branch: false       <!-- pass --delete-branch on merge -->
- post_merge: none                  <!-- command git-merge-pr runs after a confirmed merge, e.g. to regenerate committed generated outputs; none -->

## Releases

- release_flow: tag-on-default      <!-- tag-on-default (trunk: tag default branch) | gitflow-merge (merge develop→master, tag the merge) -->
- changelog: continuous             <!-- continuous (every PR appends ## [Unreleased]) | assembled (written at release) -->
- release_cut: release-pr           <!-- direct (unprotected target only) | release-pr (release branch → PR → merge) | automated (release-please bot) -->
- release_artifact: github-release  <!-- tag-only | github-release | github-release-draft -->
- release_notes: changelog-section  <!-- changelog-section | generated | none -->
- tagger: maintainer                <!-- maintainer (local tag + push origin vX.Y.Z) | ci (Action tags on merge) -->
- version_source: changelog         <!-- changelog | tags | package.json | <manifest> -->
- tag_format: vX.Y.Z

## Documentation

- specs_dir: docs/specs             <!-- change specs: NNN-<slug>/ with requirements/plan/tasks -->
- spec_grouping: flat               <!-- flat | quarterly (docs/specs/<yyyy>-Q<n>/NNN-<slug>/) -->
- features_dir: docs/features      <!-- behavior-baseline feature docs -->
- rules_dir: docs/rules             <!-- business rules as contracts -->
- decisions_dir: docs/decisions     <!-- numbered ADRs -->
