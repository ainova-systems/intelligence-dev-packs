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
- direct_lane: none                 <!-- the paths that may be pushed straight to a protected branch, as gitignore-style patterns, comma-separated, no brace expansion, **/ also matching the root: dev-init's push guard lets a push to a protected branch through only when every path it changes matches; none = no path matches -->

## Commits

- commit_style: pack-default        <!-- pack-default = one line, capital first letter, past tense -->
- reference_ids: none               <!-- work-item id pattern for subjects, e.g. FR-0xx, PROJ-123; none -->
- artifact_language: repo-default   <!-- language for commit / PR / code-comment text, e.g. english; repo-default = match the repository -->
- regenerate: none                  <!-- command that rewrites the committed generated outputs from their sources, e.g. intelligence sync for AGENTS.md; git-commit-push runs it before the gates so those files land in the commit that changes their sources; none -->

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
- digest_exclude: none               <!-- blocks another writer owns in a pull request body (a CI status table, a bot's summary): git-open-pr carries them over verbatim when it rebuilds a body, and every digest removes them first. Each block a backticked start marker, `..`, a backticked end marker, blocks separated by `;` - format and example in git-verify-pr > Digests; any other tool that computes these digests for the same pull requests must strip the same blocks; none = nothing removed -->

## Workspace

- handoff_dir: auto                  <!-- where dev-handoff saves its out-of-tree copy. auto = an existing gitignored scratch dir in the repo (e.g. .scratch/, tmp/), else the OS temp dir | <repo-relative path> | os-temp -->
- secrets_file: .env.local           <!-- the gitignored file holding each developer's own tool credentials; dev-init denies the agent's file tools reading it, while the project's scripts still load it | <repo-relative path> | none -->

## Delivery flow

> Read by `dev-deliver`, which carries one task from interview to released change.
> Its four phases resolve their owner in the pack's usual order - these keys, then the
> installed skill catalog, then its own built-in behavior.

- flow_intake: auto                  <!-- the skill dev-deliver's interview phase hands to: auto = the project's own intake skill when one is installed, which with the spec pack means spec-pull when the task names a tracker item and spec-create then spec-plan when it does not, except for a task spec-discipline would implement directly; else the built-in interview | <skill name> -->
- flow_implement: auto               <!-- the skill dev-deliver's implement phase hands to: auto = the project's own execution skill when one is installed (spec-execute with the spec pack, except for a task spec-discipline would implement directly), else one subagent working to the phase's criteria | <skill name> -->
- flow_approvals: per-gate           <!-- WHEN the owner's two gates are taken, never whether: per-gate (each asked at the boundary it governs) | upfront (both asked once at the end of the interview) -->
- worktree_policy: auto              <!-- when a parallel task gets its own git worktree: auto = only when the branch it needs is already occupied | never = it waits for the occupied branch instead | always = every parallel task gets one -->
- worktree_root: auto                <!-- where a parallel task's git worktree is created: auto = a sibling directory of the repository root | <path> -->
- worktree_create: none              <!-- command that creates a ready-to-work worktree, given its path and branch, in place of the plain git worktree add - e.g. one that also installs dependencies or links env files; none -->
- worktree_remove: none              <!-- command that removes one, given its path, in place of the plain git worktree remove - e.g. one that also tears down what the create command set up; none -->
- flow_queue: none                   <!-- where the work queue's pick order, eligibility, grouping and leave-the-queue rules are written, read by dev-deliver-next; none = dev-deliver-next asks for a task -->
- to_base_command: none            <!-- a project command that performs git-to-base's steps and reports <NAME>_STATUS; none = the skill's own git steps -->

## Pull requests

- cli: gh                           <!-- gh | glab | bitbucket api wrapper -->
- pr_target: auto                   <!-- auto = integration branch when set, else default branch -->
- merge_method: squash              <!-- squash | merge | rebase -->
- pr_template: auto                 <!-- auto = use .github/PULL_REQUEST_TEMPLATE.md if present | none -->
- pr_risk_size: off                 <!-- off | on (git-open-pr prepends a deterministic Risk/Size line) -->
- pr_size_thresholds: small <= 5 files & 50 lines; large >= 20 files or 400 lines; else medium
- pr_risk_globs: none               <!-- e.g. high: **/Migrations/**, **/*Permission*; medium: src/shared/**; low: **/*.md ; none = skip Risk -->
- pr_success_factors: ai:verified, ai:reviewed   <!-- factors a PR must carry fresh at head besides ai:completed, written as the label names themselves; the pack writes the first two, add any that an external agent, worker or pipeline applies; none = state label only -->
- max_pr_rounds: 3                  <!-- fix/verify/review rounds git-finalize-pr may spend before escalating to ai:manual; unlimited = no round budget, the other stop rules still apply -->
- required_checks: auto             <!-- the checks CI green needs on a commit (git-finalize-pr > CI green): auto = the rulesets and branch protection of the branch it is headed to, every reported check when they require none | <comma-separated check names> | none = the project runs no CI, and the outcome report says so -->
- draft_ready: finalize             <!-- who marks a draft pull request ready for review: finalize = git-finalize-pr, before its first round | owner = not this run - the owner, or a runtime that owns readiness, marks it; the run then ends ai:manual saying so -->
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
- tag_format: vX.Y.Z               <!-- X, Y and Z stand for numbers; a -rc.1 or +build suffix also matches. dev-init's push guard asks before a push that carries a tag of this shape -->

## Documentation

- specs_dir: docs/specs             <!-- change specs: NNN-<slug>/ with NNN-requirements.md + NNN-plan.md -->
- spec_grouping: flat               <!-- flat | quarterly (docs/specs/<yyyy>-Q<n>/NNN-<slug>/) -->
- execution_mode: supervised        <!-- supervised (execution ends unstaged; developer runs the git flow) | autonomous (approve queue, milestone commits, outcome-labeled PR) -->
- approval: implicit                <!-- supervised mode: implicit (a plan with no open question is the approval) | explicit (spec-approve writes an approval line bound to the requirements digest; a replan removes it) -->
- execute_through: none             <!-- supervised mode: none (execution ends uncommitted) | pr (the go-ahead to spec-execute also covers the commits, the pull request and git-finalize-pr) -->
- spec_folder: number               <!-- the key NNN a spec folder and its files start with: number (the next free number) | date-id (<yyMMdd>-<tracker item id>, collision-free across branches) -->
- spec_checks: none                 <!-- a project module whose default export, (spec) => string[], adds the stack's own problems to spec.mjs check (spec-validate); spec holds dir, key, requirements and plan; none -->
- features_dir: docs/features      <!-- behavior-baseline feature docs -->
- rules_dir: docs/rules             <!-- business rules as contracts -->
- decisions_dir: docs/decisions     <!-- ADRs -->
- adr_naming: date                  <!-- date (yyMMdd-<slug>.md, collision-free across branches) | numbered (NNNN-<slug>.md, MADR) ; an existing ADR folder's convention always wins -->
- decision_lifecycle: log          <!-- how a decision record becomes binding: log = a record is written as accepted or rejected on its branch - the pull request proposes it and the merge accepts it, so the tree holds no proposed record | proposed = a record may be committed as proposed, naming who decides, and spec-decision accepts or rejects it in place later -->
- defect_log: auto                  <!-- where a defect found but not fixed in the same change is recorded (dev-context-engineering): auto = the tracker unless `tracker` is none, in which case ask once | tracker | roadmap | specs (a finding under specs_dir) | <repo-relative file, e.g. docs/known-issues.md> -->

## Tracker

- tracker: auto                     <!-- auto = the forge's own tracker detected from the git remote (github | gitlab | azure-boards) | jira | asana | mcp | none -->
- tracker_cli: auto                 <!-- auto = matches the forge (gh | glab | az) | <command> ; used read-only by spec-pull -->
- tracker_item_ref: auto            <!-- how items are referenced: #123 | PROJ-123 | url | auto -->
- tracker_writes: none              <!-- what the spec flow may write to the tracker: none | scope-notes (a scope change posted as one short note on the item, on the developer's yes to its exact text) -->
