---
description: Project-specific configuration consumed by the intelligence-dev-packs rules and skills
---

# Project Profile (schema)

> This is the **schema**, not a file to copy by hand. The profile is optional: skills
> auto-detect from the repository and ask once when ambiguous. To pin the answers,
> `dev-init` fills this from the repo and saves it as `dev-project-profile.md` in a
> rules source, where it becomes an always-on rule. Skills resolve each value in the one fixed order:
> **this profile, then auto-detection, then asking once and recording the answer here.**
> Keep entries as plain `key: value` lines so both humans and agents parse them reliably.

## Branching

- default_branch: main              <!-- main | master | ... -->
- integration_branch: none          <!-- develop | none (trunk-based) -->
- branch_prefixes: feature/, bugfix/, hotfix/
- update_strategy: merge            <!-- merge | rebase -->
- conflict_skill: git-resolve-conflicts   <!-- the skill the git flows hand conflicts to; a project with its own layered conflict skill names it here -->
- protected_branches: main          <!-- comma-separated; default + integration are always protected -->

## Commits

- commit_style: pack-default        <!-- pack-default = one line, capital first letter, past tense -->
- reference_ids: none               <!-- work-item id pattern for subjects, e.g. FR-0xx, PROJ-123; none -->
- artifact_language: repo-default   <!-- language for commit / PR / code-comment text, e.g. english; repo-default = match the repository -->

## Verification

- typecheck: npm run typecheck
- lint: npm run lint
- test: npm test
- verify: none                      <!-- single gate-runner command (reads the diff, picks gates); when set, the local flow and CI run exactly this and the keys above are its internals -->
- coverage_gate: none               <!-- e.g. 90% ; none -->
- verify_section: Manual Verification     <!-- PR body heading whose steps git-verify-pr executes; match the repo's PR template -->
- qa_env: auto                      <!-- where git-verify-pr runs those steps: auto (preview when the PR has one, else local) | preview | local | none (nothing here can be exercised - pair it with dropping ai:verified from pr_success_factors, or every PR escalates) -->
- app_run: none                     <!-- command that brings the app up for manual verification, e.g. npm run dev; none = detect -->
- app_url: none                     <!-- base URL once it is up, e.g. http://localhost:3000 -->
- code_review_skill: auto           <!-- reviewer git-review-pr invokes: auto = the host's own code-review skill when it ships one, else dev-review-changes | <skill name> -->
- qa_checks: auto                   <!-- standing checks git-verify-pr adds for the areas a PR touched (schema: templates/dev-qa-checks.md): auto = docs/qa-checks.md when it exists | <repo-relative file> | none -->

## Workspace

- handoff_dir: auto                  <!-- where dev-handoff saves its out-of-tree copy. auto = an existing gitignored scratch dir in the repo (e.g. .scratch/, tmp/), else the OS temp dir | <repo-relative path> | os-temp -->

## Delivery flow

> Read by `dev-deliver`, which carries one task from interview to released change.
> Its four phases resolve their owner in the pack's usual order - these keys, then the
> installed skill catalog, then its own built-in behavior.

- flow_intake: auto                  <!-- the skill dev-deliver's interview phase hands to: auto = the project's own intake skill when one is installed (spec-create then spec-plan with the spec pack), else the built-in interview | <skill name> -->
- flow_implement: auto               <!-- the skill dev-deliver's implement phase hands to: auto = the project's own execution skill when one is installed (spec-execute with the spec pack), else one subagent working to the phase's criteria | <skill name> -->
- flow_approvals: per-gate           <!-- WHEN the owner's two gates are taken, never whether: per-gate (each asked at the boundary it governs) | upfront (both asked once at the end of the interview) -->
- worktree_root: auto                <!-- where a parallel task's git worktree is created: auto = a sibling directory of the repository root | <path> -->

## Pull requests

- cli: gh                           <!-- gh | glab | bitbucket api wrapper -->
- pr_target: auto                   <!-- auto = integration branch when set, else default branch -->
- merge_method: squash              <!-- squash | merge | rebase -->
- pr_template: auto                 <!-- auto = use .github/PULL_REQUEST_TEMPLATE.md if present | none -->
- pr_risk_size: off                 <!-- off | on (git-open-pr prepends a deterministic Risk/Size line) -->
- pr_size_thresholds: small <= 5 files & 50 lines; large >= 20 files or 400 lines; else medium
- pr_risk_globs: none               <!-- e.g. high: **/Migrations/**, **/*Permission*; medium: src/shared/**; low: **/*.md ; none = skip Risk -->
- pr_success_factors: ai:verified, ai:reviewed   <!-- factors a PR must carry fresh at head besides ai:completed, written as the label names themselves; the pack writes the first two, add any that an external agent, worker or pipeline applies; none = state label only -->
- max_pr_rounds: 3                  <!-- fix/verify/review rounds git-finalize-pr may spend before escalating to ai:manual -->
- delete_local_branch: true         <!-- delete the local branch after a confirmed merge -->
- delete_remote_branch: false       <!-- pass --delete-branch on merge -->
- post_merge: none                  <!-- command git-merge-pr runs after a confirmed merge, e.g. to regenerate committed generated outputs; none -->

## Releases

> **How a release runs** (`git-create-release`): review what the window since the last tag left
> for a human → owner gate → version → release change-set (changelog, version, release docs) →
> land it per the **mode** → tag → publish → close the accepted post-release steps. The keys below
> drive each phase; `release_cut` is the mode.
>
> **The mode decides where the release is reviewed.** `release-pr` puts the release change-set on
> a `release/x.y.z` branch and reviews it in a PR - the branch is where everything the release
> changes about itself is updated and read before it ships, and its PR body carries the pending-step
> checklist. `direct` commits to an unprotected target with no review surface. `automated` hands
> both to a release bot.

- release_flow: tag-on-default      <!-- tag-on-default (trunk: tag default branch) | gitflow-merge (merge develop→master, tag the merge) -->
- release_cut: release-pr           <!-- THE MODE: direct (unprotected target only) | release-pr (release branch → PR → merge) | automated (release-please bot) -->
- release_review: pr-section: Deployment notes   <!-- where merged PRs declare steps no pipeline performs; pr-section: <heading> | none -->
- manual_apply_globs: none          <!-- paths a human applies outside the pipeline, e.g. externally-hosted automation definitions, hand-deployed stacks, secret inventories; none -->
- drift_check: none                 <!-- read-only command reporting repository-vs-live divergence (infra plan/diff); none -->
- changelog: continuous             <!-- continuous (every PR appends ## [Unreleased]) | assembled (written at release) -->
- release_docs: none                <!-- docs the release change-set updates besides the changelog, e.g. version matrix, upgrade notes; none -->
- release_artifact: github-release  <!-- tag-only | github-release | github-release-draft -->
- release_notes: changelog-section  <!-- changelog-section | generated | none -->
- tagger: maintainer                <!-- maintainer (local tag + push origin vX.Y.Z) | ci (Action tags on merge) -->
- version_source: changelog         <!-- changelog | tags | package.json | <manifest> -->
- tag_format: vX.Y.Z

## Documentation

- specs_dir: docs/specs             <!-- change specs: NNN-<slug>/ with NNN-requirements.md + NNN-plan.md -->
- spec_grouping: flat               <!-- flat | quarterly (docs/specs/<yyyy>-Q<n>/NNN-<slug>/) -->
- execution_mode: supervised        <!-- supervised (execution ends unstaged; developer runs the git flow) | autonomous (approve queue, milestone commits, outcome-labeled PR) -->
- features_dir: docs/features      <!-- behavior-baseline feature docs -->
- rules_dir: docs/rules             <!-- business rules as contracts -->
- decisions_dir: docs/decisions     <!-- ADRs -->
- adr_naming: date                  <!-- date (yyMMdd-<slug>.md, collision-free across branches) | numbered (NNNN-<slug>.md, MADR) ; an existing ADR folder's convention always wins -->
- defect_log: auto                  <!-- where a defect found but not fixed in the same change is recorded (dev-context-engineering): auto = the tracker unless `tracker` is none, in which case ask once | tracker | roadmap | specs (a finding under specs_dir) | <repo-relative file, e.g. docs/known-issues.md> -->

## Tracker

- tracker: auto                     <!-- auto = the forge's own tracker detected from the git remote (github | gitlab | azure-boards) | jira | asana | mcp | none -->
- tracker_cli: auto                 <!-- auto = matches the forge (gh | glab | az) | <command> ; used read-only by spec-pull -->
- tracker_item_ref: auto            <!-- how items are referenced: #123 | PROJ-123 | url | auto -->
