# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **The secret scan is now wired into the commit flow it claimed to be part of.** `git-scan-secrets` advertised "invoked by `dev-review-changes` and the orchestrators pre-push" while nothing invoked it - `dev-review-changes` cited its patterns and no orchestrator named it at all, so the guarantee was prose. `git-commit-push` step 3 now runs it in `diff` scope - a live credential in what is about to be committed stops the commit, one elsewhere in the pending diff is reported without blocking - and the review skill's Critical check runs the scan instead of borrowing its regexes.
- **Two completion bounds graded something the agent cannot observe.** `dev-handoff` verified that "a cold reader could continue" - a counterfactual about a person; it now requires every state claim to cite a command run this session, plus a printed, git-ignored save path. `spec-audit-docs` verified only the claims it chose to report, so a run extracting one claim passed; the bound is now that every claim extracted in step 2 carries a classification (step 4 gained `verified` so the two agree), with two-sided evidence required for the non-verified ones.

### Changed

- **Autonomous outcome labels are defined once.** `git-workflow` holds the meanings; `git-finalize-pr` and `spec-execute` restated them in full and now cite the set. Three copies of a definition drift; one does not.
- **`docs/enforcement.md` states the owner gate's portability limit.** `disable-model-invocation` is Claude Code's field - the engine passes it through and every other target ignores what it does not understand - so on Cursor, Copilot, Codex, Pi and opencode the merge and release gates are prose, not machinery. The page maps its other limits honestly and was silent on this one.
- **`dev-skill-first` stops promising a catalog no install path delivers.** It instructed the agent to "check the skill catalog"; no install mode places one in the host project (a mirrored pack copies only the referenced subpaths). The rule now points at the skills actually installed, which is what the agent can see.
- **Every skill description now follows one shape.** They ranged from 62 to 329 characters and mixed imperative labels with full paragraphs; they are now 109-169 characters in one shape: a third-person lead clause naming what the skill does and when to reach for it, followed by a short boundary clause wherever a sibling is genuinely confusable. The four pull-request skills each name the neighbor they are not (`git-commit-push` stops at the push, `git-open-pr` hands to `git-finalize-pr`, `git-finalize-pr` names both sides, `git-merge-pr` states the owner gate). A description is the entire basis on which a tool picks a skill, and a long one gets re-summarized on the way in - a compact one arrives as written. Spelling across the packs is American throughout.

## [0.3.0] - 2026-08-17

Adoption became a single prompt: the README stopped reading as a manual, the install instructions caught up with the engine that actually ships, and the release process is written down instead of being reconstructed each time.

### Added

- **Release process in `CONTRIBUTING.md`** - four steps for cutting a version from `main`, including the rule that `## [Unreleased]` is reconciled against the commits since the last tag before it is promoted.
- **`ROADMAP.md`** - planned improvements with the problem each exists to fix: a `dev-diagnose` skill behind a reproduction gate, a rejected-decisions registry, per-step HITL/AFK marking, distribution beyond the sync engine (mechanism deliberately left open), and an eval harness for pack content.

### Changed

- **The README leads with one Quick start prompt instead of reading as a manual.** It opened with spec-pack doctrine and a full artifact catalog before the reader could install anything, then explained installation three times over (paste prompt, four install modes, a configure section). One prompt now does the whole setup: installs intelligence-sync when the project has none, asks which packs to add (core, or core + spec), declares the pack, generates the profile, and syncs. The artifact-by-artifact catalog moved to `packs/README.md`; the install modes stay in `docs/integration.md`.
- **Setup instructions match the current engine.** A pack is declared once under `packs:` and referenced by name (`@intelligence-dev-packs/packs/core/rules`) instead of six repeated `git+…#subpath` source lines, and **`mirror:` is documented as the default** - the pack is materialized into the project's own tree and committed, so bumping the pin reads as an ordinary diff. Compatibility notes now name the version that matters: declared packs need intelligence-sync 0.10.0 or later.
- **`docs/` filenames are lowercase**: `docs/INTEGRATION.md` -> `docs/integration.md`, `docs/ENFORCEMENT.md` -> `docs/enforcement.md`. Only the root OSS furniture (`README`, `LICENSE`, `CHANGELOG`, `CONTRIBUTING`, `ROADMAP`) keeps the capitalized form the platform recognizes. External links to the old paths need updating.
- **`git-commit-conventions` covers AI attribution on every published artifact, not only commit trailers.** A harness-injected footer in a PR body passed the trailer-only ban, in production use. The rule now states the target positively and overrides the assistant default that injects one.

## [0.2.0] - 2026-07-28

The spec pack absorbed doctrine proven in production use; the core pack gained a deterministic enforcement layer and authoring guidance for the current model generation.

### Breaking (spec pack)

- **`tasks.md` is gone** - the checkboxed `## Work steps` live inside the plan, so progress ticked into the plan is what makes execution resumable, and one file fewer can drift.
- **Spec files carry the folder's number**: `NNN-requirements.md` + `NNN-plan.md` (ten open specs no longer produce ten identical editor tabs).
- **Status follows artifacts** in the new default `execution_mode: supervised`: nothing writes `proposed` / `in-progress` / `completed`; only `cancelled` is written, by `spec-cancel`. The written-status queue (`spec-approve` -> `approved`) remains as `execution_mode: autonomous`.
- **ADRs are date-named by default** (`yyMMdd-<slug>.md`; profile `adr_naming: numbered` keeps MADR numbering): parallel branches collide on "the next number", never on a date. An existing ADR folder's convention always wins.

### Added

- **`spec-pull` skill** - tracker intake: pulls one issue / ticket / work item into a spec, read-only against the tracker (the board is the backlog, the repository is the record). Synthesises body + comments with a decision log, records drift keys (`item_body_digest`, `item_comments_digest`), and updates the same spec in place on every re-pull: one item, one spec, for the life of the item. Resolves the tracker profile-first (new `## Tracker` profile section), detects the forge's own tracker from the git remote (`gh` / `glab` / `az` - no new dependency), accepts a connected MCP server, and stops with a named reason when nothing resolves - `spec-create` is the taskless path and says what the shortcut costs (no drift keys, no re-pull).
- **`spec-validate` skill** - the adversarial pre-execution critic: re-opens every cited sibling, re-runs the reuse and impact checks, re-derives the requirements coverage both ways, and turns each gap into an open question that may re-block. Read-only on code; a critic who also rewrites is an author with a second hat.
- **`spec-answer` skill** - resolves a blocked spec's open questions with the developer: three-part question shape, answers physically move to `## Answered questions` with a `Changed:` line on explicit approval, unticked steps adjust when structure changes, and questions owned by absent people stay open.
- **The plan opens with `## Requirements coverage`** - every requirement maps to the step that delivers it or to the open question that blocks it, and to nothing else. A plan that cannot name an executor for a requirement silently demotes it into "Risks"; the table makes that impossible.
- **Execution correction logs**: `## Corrections` (within-scope rework: what was wrong, what was done, source `auto`/`dev`, root cause) and `## Review findings` (beyond-scope observations for the developer) - split by who closes the item, so nothing is double-counted. A step is ticked only when a re-run of its gate comes back dry.
- **`execution_mode` profile knob**: `supervised` (default - execution ends with changes uncommitted on the feature branch; the developer reviews the diff and runs the git flow) | `autonomous` (approve queue, milestone commits, outcome-labeled PR).
- **Enforcement layer** (`docs/enforcement.md` + `packs/core/templates/claude-settings.json`): a prose NEVER is a request, not a guarantee - the pack's hard invariants (no force-push, no blanket-stage, no `--no-verify`, no co-author trailers, no secrets in commits) now map to `permissions.deny` entries and `PreToolUse` hooks a host project installs next to the rules. This layer consumes zero instruction tokens and survives model changes.
- **Two docs gates** in `spec-document` doc-types: *no consumer, no doc* (a document nothing reads rots from day one - a name-map glossary is the classic offender) and *derived beats authored* (an artifact derivable from schema or code is generated in the change that moves its source, so it cannot drift).
- **`verify` profile knob** - a single gate-runner command as the definition of done: it reads the diff, picks gates cheapest-first, prints what it skipped, and CI runs exactly the same command so local and CI cannot drift. `dev-verification-gates` carries the doctrine, including: a runner that cannot read the diff refuses rather than printing success.
- **`git-open-pr` skill.** Opens a PR for the current branch against its target, closing the gap between `git-commit-push` (commit + push only) and `git-finalize-pr` (drives an existing PR) for projects without the spec pack's Phase E. Idempotent (never opens a second PR), targets profile `pr_target`, fills the repo's `.github/PULL_REQUEST_TEMPLATE.md` when present, honors `artifact_language`, and prepends a deterministic Risk/Size line when `pr_risk_size: on`.
- **Autonomous outcome labels are now defined in `core`.** `git-workflow` documents `ai:ready-to-merge` / `ai:manual` / `ai:failed` as the single shared convention, so `git-finalize-pr` no longer relies on a spec-pack rule for their meaning.
- **New profile knobs** in `dev-project-profile.md`: `artifact_language`, `auto_open_pr`, `pr_template`, `pr_risk_size`, `pr_size_thresholds`, `pr_risk_globs`, `delete_local_branch`, `delete_remote_branch`, `post_merge`.
- **New `handoff_dir` profile knob** (new `## Workspace` section) pins where `dev-handoff` saves its out-of-tree copy.

### Changed

- **`spec-discipline` now owns how a spec lives** (files, artifact-derived status, question shape, resource classes: evidence to scratch, assets via a work step, content to its owning system - an asset merely mentioned is an asset nobody is bringing), and **`spec-orchestration` was deduplicated to the orchestrator's own half** - it had restated discipline laws into every session's context.
- **`spec-execute` refuses while any open question stands** and names each - an ambiguity that can be resolved is not a question; it is unfinished work.
- **`spec-approve` is autonomous-mode machinery**; in supervised mode a plan with no open question is already the approval, and the skill says so and stops.
- **`spec-decision` carries the routing law**: the ADR is not the default record - a standing law goes to the rule that owns it, behavior to the feature doc; an ADR is only for a structural choice across components with real alternatives, and the gate applies even when a plan scheduled the step.
- **`dev-skill-first` gained two laws**: an artifact a procedure tells a human to hand-edit is a skill that was never written; a procedure inside a rule has no name a plan can call, so the plan drops the requirement.
- **`dev-review-changes` reviews on two independent axes** when a spec drove the change - standards (rules, siblings) and spec intent (each requirement delivered / partial / missing, scope creep, each finding quoting its requirement) - and never merges their rankings, so a strong result on one axis cannot mask a miss on the other. The base ref and a non-empty diff are confirmed before any deeper work, so a bad ref fails cheaply.
- **Plans handle tree-wide blast radius honestly** (`spec-create` phases): a change with hundreds of call sites is sequenced expand -> migrate in batches -> contract instead of being forced into one testable slice, so gates stay green between batches.
- **`git-merge-pr` and `git-create-release` are owner-invoked only** (`disable-model-invocation: true`) - merge and release timing is not the model's decision.
- **Authoring guidance for current models** (CONTRIBUTING): do not instruct what the model already does (self-verification, re-checking); descriptions are the selection surface (third person, use case first, exclusion clause second); write to the model intersection (no "use proactively", no reasoning-echo); every hard NEVER points at its deterministic backstop.
- **Profile resolution order stated once**: profile, then auto-detection, then ask once and record - the template, CONTRIBUTING, and the skills now agree.
- **`git-merge-pr` honors per-project cleanup and a post-merge hook.** Local/remote branch deletion follow profile `delete_local_branch` / `delete_remote_branch`, and an optional profile `post_merge` command runs after a confirmed merge (e.g. to regenerate committed generated outputs so the base is never left stale).
- **`git-review-pr-comments` verifies before trusting.** Reviewer claims (especially from bots) are checked against sibling code and rules before acceptance; a real fix also fixes the same class across the tree and corrects any wrong documented rule in the same change; every handled thread is replied to AND resolved so re-runs skip it.
- **`git-create-release` is now policy-driven across the full release matrix.** Instead of assuming one flow, the skill reads the project profile's `## Releases` keys and adapts: `release_flow` (trunk `tag-on-default` vs `gitflow-merge`), `changelog` (`continuous` vs `assembled`), `release_cut` (`direct` | `release-pr` | `automated`), `release_artifact` (`tag-only` | `github-release` | `github-release-draft`), `release_notes` (`changelog-section` | `generated` | `none`), and `tagger` (`maintainer` | `ci`). Best-practice defaults - continuous changelog, release-PR cut, full GitHub Release, maintainer tag - apply when a key is unset. It lands the release change-set through a `release/x.y.z` PR on protected branches (never a direct push), tags the merge commit and pushes the *tag* (which branch protection does not block), and creates the platform release object via `gh release create`. The `core` profile template documents every key.
- **`dev-handoff` resolves its save location deterministically.** Instead of an arbitrary OS temp path, it now resolves in order - profile `handoff_dir`, else an in-repo gitignored scratch dir (confirmed with `git check-ignore`), else the OS temp dir - preferring an easy-to-find in-repo location and never writing an un-ignored file that would show up in `git status`.

### Fixed

- **`git-merge-pr` local-branch deletion after a squash/rebase merge.** The skill previously prescribed `git branch -d` only, which always refuses after a squash or rebase merge ("not fully merged") because the feature branch is not an ancestor of the base. It now keys deletion on the confirmed PR `state == MERGED` and uses `-D` for squash/rebase (and `-d` for merge-commit merges), so cleanup actually completes.
- **Em dashes removed from authored pack content** (`git-create-release`, the install script) - the pack's own hyphen convention now holds everywhere.

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
- **Four install modes**: remote `git+` sources via intelligence-sync (recommended, zero-footprint), git submodule, global Claude Code skills (`scripts/claude-install-global.sh`), and plain copy. Documented in `docs/integration.md`.
- **Tooling**: `scripts/validate-pack.sh` (validates every pack against the known domain-prefix set) plus a CI workflow.

### Compatibility

- Remote `git+` sources need an intelligence-sync build with that feature (lands after 0.4.2); submodule and copy modes work with 0.3.1 or later. The packs also work without the sync engine, consumed directly by any tool that reads `SKILL.md` folders.
