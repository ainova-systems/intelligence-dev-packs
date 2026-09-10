# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`dev-init` skill.** One-time per-repo setup after the core pack is installed: fill and pin the project profile, create the `ai:*` labels `git-workflow` names, copy the pack PR template when the repo has none, merge the harness deny-list, and resolve the QA environment keys before the first PR asks. Idempotent and it does not commit. The README's copy-paste profile prompt is this skill; `spec-init` now runs it first when the profile is missing. Sync runs after every profile mutation, and a missing `intelligence.yaml` is the documented copy install, not a stop.

### Changed

- **The default PR template now separates context from verification.** `What & why` splits into `Why` (the problem, in plain language a reader who was not in the implementing session can recover) and `What` (the solution, same register); `Changes` stays as the shape of the work without becoming a file list. `How to verify` splits into `Manual Verification` (the executable steps `git-verify-pr` runs) and `Automated Gates` (the tests that cover the change). `Risk & Size` and `Deployment notes` are unchanged. Profile `verify_section` and the skill defaults follow the new heading; a repo whose template still uses the old heading pins `verify_section` to match it.
- **`git-commit-conventions` now states the PR-body audience** the template encodes. `git-open-pr` fills to that audience; `git-review-pr` treats a body that only lists files or restates the diff as a claims finding.

## [0.7.0] - 2026-09-08

The validator checks the contracts instead of only the shapes, and the eight defects it found on its first run are fixed.

### Fixed

- **The profile schema promised behavior nothing implemented.** `auto_open_pr` said a push would open a pull request when none existed, and no artifact had ever read it; `pr_template: none` said the repository's own template could be skipped, and `git-open-pr` filled it regardless. Both are resolved rather than left ambiguous: `pr_template` is now read where the body is composed, and `auto_open_pr` is removed - opening the PR is an explicit step in the documented flow, so a second implicit path to the same thing was a menu option, not a capability. `platform` is removed for the same reason: `cli` already decides everything the skills do with a forge, and two keys describing one fact is the defect this pack keeps fixing.
- **`git-workflow` names the branch-model keys it had only ever described.** `default_branch`, `integration_branch`, `branch_prefixes` and `protected_branches` were used by concept throughout the rule and by name nowhere, so nothing connected the schema to the text that acts on it. The keys are named where the concepts are stated.
- **`git-open-pr` had no `## Constraints` section**, which the artifact contract requires of every skill, and nothing checked. It has one now, carrying invariants rather than a restatement of its steps: one branch one PR for the life of the branch; a verification section is never satisfied by "CI passes", because `git-verify-pr` executes it later against a running change; a Risk level the globs did not produce is never stated, since a measured flag and a guessed one read identically.

### Changed

- **`validate-pack.sh` now checks the contracts, not only the shapes.** Three checks, each targeting a defect class that had gone unnoticed: every skill carries the sections the artifact contract requires; every artifact named in any artifact's text actually exists (renames leave dangling hand-offs that read as working ones); and the profile agrees with the artifacts in both directions - no schema key nothing reads, no key an artifact reads that the schema omits. The eight defects above are what these checks found on their first run.

  Both new lookups fail rather than skip when their own source is missing, and grep calls carry a sentinel file so an empty match cannot make the run read stdin. The first version of this change reproduced the skip-when-missing bug fixed one release earlier - the reason it was caught is that the probes now include the check's own degenerate inputs, not only the fault it was written to detect.

### Added

- **The two writing conventions the validator now depends on are documented** in `CONTRIBUTING.md`: a profile key is referenced in backticks, and an artifact is named in backticks and must resolve. Both held everywhere already, which is exactly why they were never written down - and a gate enforcing an unwritten rule teaches it through failures that name the wrong problem.
- **`ROADMAP.md` gained the two items that are decided but not started**: behavioral evals for the skills, folded into the existing eval-harness entry rather than filed beside it, and sequenced after the label model has been run end to end so the suite pins behavior rather than assumptions; and risk scanning, blocked on deciding whether a scan or the deterministic `pr_risk_globs` match is authoritative, because two risk values for one change will disagree eventually.

## [0.6.1] - 2026-09-08

The rule against restating a definition is now enforced, and the flow says which forge it actually speaks.

### Fixed

- **One source per convention is now enforced, not only stated.** `dev-context-engineering` already carried the rule, and three consecutive changes broke it anyway - each one extended a definition in one place and left a restatement of it somewhere else: who writes `ai:processing`, the verdict vocabulary an agent may return, and what the report envelope's second line carries. The rule now names the failure mode (restating instead of citing, and the copy nobody updated being the one that executes), says what to do when inlining a vocabulary is unavoidable - name its definition site - and requires extending a definition to include every place that restates it, in the same change. `validate-pack.sh` gained the mechanical half for the one vocabulary that is greppable: an `ai:*` label used anywhere in the packs but not defined in `git-workflow` now fails the build - as does the definition site going missing while labels are still in use, because a gate that quietly disappears when its source is moved is the same unenforced rule in a new costume.
- **The pull-request flow said `gh` and meant it, while the profile promised otherwise.** `platform` and `cli` offered GitLab and Bitbucket, but only `git-open-pr` ever read `cli` - the five skills that drive, judge, complete and merge a PR were GitHub-only with no fallback, and the four added in 0.5.0 widened a gap that already existed in `git-merge-pr`. `git-workflow` now states once that the commands throughout are the GitHub reference shapes, that another forge resolves them through `cli`, and that the flow's real requirement is a short list of capabilities - find a branch's open PR, read its checks for one commit, read and write its labels, read its review threads and their resolved flag, comment on it. A forge missing one of those is named as a capability gap rather than worked around, because a factor nobody can check is not a factor. No `glab` or Bitbucket command syntax is invented here: an unverified command in a skill is worse than an honest capability list.

## [0.6.0] - 2026-09-08

A project can state what every change to an area must pass, and a verification factor is bound to the steps it actually executed.

### Added

- **Standing QA checks (`qa_checks`)** - a project can declare what must hold for any change touching an area, whatever that change says about itself, and `git-verify-pr` adds every entry whose glob the pull request touched as a step of its own. The report marks each step's source, so a reader can tell what the PR asked for from what the project always asks for. New profile key (`auto` resolves `docs/qa-checks.md` when it exists) plus the schema at `templates/dev-qa-checks.md`.

  The boundary is the point of the feature: standing checks are **additional**, never a substitute. A pull request that declares nothing is still blocked, because a change unwilling to say what working means for itself is not made verifiable by the project's list - and `git-verify-pr` still never invents acceptance criteria for a change. Per-feature acceptance criteria stay in the feature docs, where one source stays in sync with the code and `spec-audit-docs` checks it; a second copy in a QA file would only drift.

  The schema carries its own bar, because a file like this is where dead rules accumulate: an entry earns its place only if a defect that actually shipped would have been caught by it, and the file is expected to *shrink* as checks that can be automated move into the test suite. A check nothing executes is the least reliable kind of rule.

  The context cost decided the shape. The profile is inlined into every task, so it holds only a pointer; the checks themselves live in a file the verifier opens at the one moment it needs them - the same split `specs_dir`, `features_dir`, `decisions_dir` and `handoff_dir` already use.

### Fixed

- **A success factor is bound to what the stage judged, not to the commit alone.** `git-verify-pr` executes the steps the pull request declares, and those can be rewritten without the head moving - so `ai:verified` could stand over steps it never ran, with the freshness check unable to see it; standing checks widen the same input further. The report now names a digest of what it executed next to the head SHA, `git-workflow`'s envelope describes that second line, and `git-merge-pr`'s guard compares every input a report names rather than the SHA alone. Found by running the loop on this change: a report passed while two of its own declared steps had been rewritten under it.

## [0.5.1] - 2026-09-08

A project with no way to run its own software now gets asked once instead of escalated forever.

### Fixed

- **`git-verify-pr` asks once and records, instead of blocking every PR.** A project with no preview deployment and no local run resolved to "every behavioral step is blocked", which became `ai:manual` on every pull request, identically, with no remedy named and no hint that opting out was even possible. The skill was skipping the third leg of the profile's own resolution order - profile, then detection, then **ask once and record the answer** - so a standing configuration gap was being reported as an event of each PR. Both valid answers now write to the profile: configure `qa_env` plus `app_run` / `app_url`, or drop `ai:verified` from `pr_success_factors` because the project has nothing to exercise. Who puts the question depends on where the stage runs, and it does not guess: invoked directly by a person it asks and records; inside a run it is an isolated subagent with no one to ask, so it returns `blocked (project)` naming both keys and the question travels out with the escalation. Either way the answer lands in the profile once, and the escalation carries its own end.
- **Two kinds of blocked, told apart.** `blocked (project)` is the standing gap above - one profile answer ends it for every future PR, and the orchestrator never retries it round after round, since no round can resolve it. `blocked (step)` is one step short of a credential or capability and belongs to that pull request alone. Collapsing them let a one-off missing login look like grounds to disable verification project-wide.
- **A change with nothing behavioral to verify is no longer stuck.** A verification section may declare that its steps are all commands anyone can run, or state why the change alters no behavior; that needs no environment, the same reading `dev-run-tests` gives a docs-only change. An *empty* section is still blocked - `git-open-pr` refuses to leave one, which is what stops "nothing to verify" from becoming a free pass.
- **A factor the project does not require is stated once in the outcome**, so a recorded decision is distinguishable from a stage that quietly never ran. On the pull request those two look identical, and only one of them is fine.

### Changed

- **Three dated prompting patterns removed** after auditing the pack's instruction surface against current model behavior. `spec-execute` capped subagent prompts at "~60 lines" - a numeric ceiling tuned against older models' padding, sitting next to guidance that already said the same thing qualitatively, and able to starve a prompt that genuinely needs more pointers. `git-verify-pr` and `dev-qa-verifier` asked for "one negative per passing step", where the count reads as a cap on a judgment call. `git-finalize-pr`'s "never merge" was the one prohibition in the set carrying no reason; it now carries it, because a rule whose reason is missing is the first one a reader talks themselves out of.

## [0.5.0] - 2026-09-08

A pull request now has to prove it works, not just that it is green - and every claim is bound to the commit that earned it.

### Added

- **`git-verify-pr` skill** - the behavioral QA stage. It executes the steps the PR body itself declares (profile `verify_section`, default `How to verify`) against the change actually running, brings that change up per profile `qa_env` / `app_run` / `app_url`, and posts one report comment naming the head SHA with a verdict and an observed result per step. A step it cannot execute is `blocked` and never silently becomes a pass; a step the PR never declared is never invented. Earns `ai:verified`. Green CI proves the code builds and its tests pass - it says nothing about the described result occurring.
- **`git-review-pr` skill** - review of the PR's whole diff (`git diff <base>...HEAD`) from a context that never watched it being written, delegating the standards axis to profile `code_review_skill` (`auto`: the host's own code-review skill when it ships one, else `dev-review-changes`) and adding the axis a pre-commit review cannot have: the PR's own claims. Undeclared scope, a behavior the body promises but the diff does not deliver, and a migration or secret change missing from the deployment-notes section (which `git-create-release` reads) are findings. Earns `ai:reviewed`.
- **`git-complete-pr` skill** - the single writer of a run's outcome. It drains the review threads (absorbing what `git-review-pr-comments` did) and then records exactly one of `ai:completed` / `ai:manual` / `ai:failed`. Escalation criteria live here once instead of in every stage that can hit a wall, which is what stops three copies of them from drifting.
- **Success factors on a PR** - `ai:verified` and `ai:reviewed` are additive labels earned on top of the outcome, and profile `pr_success_factors` declares the set a PR must carry. The list is open: a project adds factors that external agents, workers or pipelines apply (a security scan, a performance budget, a design sign-off) and every gate covers them unchanged.
- **`dev-qa-verifier` agent** (`access: readonly`) - the persona `git-verify-pr` runs as. Read-only is the point, not a detail: a verifier that can edit the code can make its own verdict come true, and `ai:verified` is what the merge gate trusts. `dev-test-engineer` could not take the role because it authors tests and needs `access: full`; a tool allowlist could not either, because the host capabilities a verifier needs (browser, HTTP client) cannot be enumerated portably.
- **New profile knobs**: `verify_section`, `qa_env`, `app_run`, `app_url`, `code_review_skill`, `pr_success_factors`, `max_pr_rounds`.

### Changed

- **`git-finalize-pr` is now an orchestrator, not a two-loop babysitter.** It runs rounds - CI to green, `git-verify-pr`, `git-review-pr`, then all fixes of the round in one commit - until every declared factor holds on the *same* head commit, and hands to `git-complete-pr` for the threads and the outcome. Batching per round keeps the cost at rounds x stages instead of fixes x stages. It is the only actor that pushes, and it writes no outcome and no factor: the actor doing the work owns the state, the stage that judges owns its factor.
- **Bounded runs.** Explicit stop rules end a run through `git-complete-pr` with a named reason instead of spinning: the same defect returning after a fix round, a factor lost twice in a row (the fixes are fighting each other), `max_pr_rounds` exceeded, or an owner-decision item with nothing fixable left. Someone else pushing to the branch restarts the round once and escalates the second time.
- **A factor is a claim about one commit, not about the PR.** It counts only while *fresh* - its report comment names the current head SHA, or, for a factor the pack does not write, the label was applied after the head commit landed. A push therefore invalidates every factor whether or not anyone removed it; clearing them is housekeeping, and no gate trusts a label without checking freshness. This is what makes the model survive a human push, a crashed run, or a force-push.
- **`dev-code-reviewer` now covers pull requests too** - it carries `git-review-pr` alongside `dev-review-changes` and gained a seventh review dimension, *claims*: the diff against what the PR says about itself. The persona was already the right one (independent, read-only, evidence first), so the PR stage extends it instead of duplicating it.
- **Both judging stages carry an agent, so isolation is a contract rather than a request.** `git-verify-pr` runs as `dev-qa-verifier` and `git-review-pr` as `dev-code-reviewer`; each may fan out to workers when the diff or the step list exceeds one pass, but only by pointers and never with the author's account of why the change is right - a worker that inherits the rationale confirms it. Whatever comes back is re-evidenced by the stage before it is recorded.
- **One report envelope for every judging stage**, defined once in `git-workflow`: first line `## <Stage> - <VERDICT>`, second line `head: <sha>`, findings in the stage's own shape, one comment per run and never an edit of an earlier one. It is not a style rule - the freshness check reads that SHA line, so a gate can only work if its location is contractual. `ai:manual` and `ai:failed` leave a comment in the same envelope naming what the owner must decide; a label alone cannot say that.
- **`git-merge-pr` gained a label guard**: state must be `ai:completed` and every declared factor must be present *and fresh at HEAD*. A stale factor is refused by name - it is the dangerous case, because the label reads green while nothing has judged that commit. A PR carrying no `ai:*` label is human-driven and skips the guard entirely.
- **The outcome label `ai:ready-to-merge` is now `ai:completed`**, and `ai:processing` joins the state set for "an agent holds this PR right now". States are mutually exclusive and change in one `gh pr edit --add-label ... --remove-label ...` call, so they cannot accumulate.
- **The default PR template moved from the `spec` pack to `core`** (`git-open-pr/assets/pr-template.md`), and `git-open-pr` now fills it when the repo has none. `git-verify-pr` is a `core` skill that executes the template's verification section, so leaving the template in `spec` meant a `core`-only install could never earn `ai:verified`. `spec-execute` Phase E opens its PR through `git-open-pr` instead of calling `gh pr create` itself.

### Removed

- **`git-review-pr-comments`** - absorbed into `git-complete-pr`. A thread that cannot be closed *is* the escalation that decides the outcome, so splitting the two put the same criteria in two places; the merge also removes the name collision with `git-review-pr`.

## [0.4.2] - 2026-09-07

Every found defect is recorded: the rule states the invariant, and the profile says where the record goes.

### Added

- **A defect you found never stops at "noticed".** `dev-context-engineering` now requires it to be fixed in the change that found it, or recorded before that change ships. Judging it out of scope stays legitimate; leaving no trace does not — a commit message or a PR body records one review, not the defect, and nothing reads them again.
- **Profile key `defect_log` says where that record goes.** The rule states the invariant and nothing else, because the destination is not universal: a tracker issue, a roadmap entry, a finding under `specs_dir`, or a plain file such as `docs/known-issues.md` are all right answers in different projects. `auto` resolves to the tracker unless `tracker` is none, and asks once when it is.

## [0.4.1] - 2026-09-07

Review replies are log entries: the outcome and what made it so, nothing else, and a thread you acted on ends resolved.

### Changed

- **A review reply is a log entry, not a conversation.** `git-review-pr-comments` told the replier to match the reviewer's tone, which invites a paragraph of prose where a reviewer wants one fact: what happened and what made it so. `git-commit-conventions` now states the shape — commit reference for a fix, blocking rule for a decline, follow-up link for a deferral — and forbids the padding around it. The rule carries it because a reply is often written ad hoc, outside the skill that would otherwise have said so.
- **A thread you acted on ends resolved.** The pairing was a skill constraint only, so it reached nobody who replied without invoking the skill. It is now also in the always-on rule, with the consequence stated as it actually behaves: the thread stays open and returns on the next review pass.

## [0.4.0] - 2026-09-04

Installation moved to the Intelligence CLI: the packs install by name from a registry this repository publishes, the spec chain gained the planning stage both intakes were missing, and the release cut now stops on the manual steps a release window left behind.

### Breaking (spec pack)

- **`spec-create` writes requirements only; the plan is `spec-plan`'s.** It used to write both files, which made it the only route to a plan and left tracker intake with nowhere to go. Projects that call `spec-create` and expect a plan now get requirements plus a hand-off; the plan arrives one skill later.

### Added

- **A registry index (`index.yaml`) makes the packs installable by name.** The two packs are subdirectories of one repository, so their package names cannot be resolved by convention. The index maps `@ainova-systems/core` and `@ainova-systems/spec` to their subpaths, and a project that trusts this repository as a registry installs either by name, pinned to a version resolved from the git tags. It matters more than a convenience: without a registry both packs derive the same repository-based name and collide, so a registry-free install has to name each one explicitly.
- **`git-create-release` reviews what the release window left for a human, and gates on it.** A release cut went straight from pre-flight to version: it promoted a changelog and pushed a tag, while the steps merged PRs had recorded for a person - configuration to import into an externally-hosted system, a secret to register, a hand-deployed stack, a one-off backfill - were read by nobody. Each merge wrote its note and moved on, so the pipeline shipped the code and the live system kept its old behavior, with nothing at release time recording that it did. Two new steps bracket the cut: a **pending-release review** that reads the window four ways (each PR's declared steps, the diff against `manual_apply_globs`, self-applying schema changes for rollback awareness, and a `drift_check` command that reports what is actually unapplied), and an **owner gate** where every item is done now or explicitly accepted as a named post-release step - unanswered means no tag. A closing step confirms the accepted ones were applied. Four profile keys drive it: `release_review`, `manual_apply_globs`, `drift_check`, `release_docs`.

- **`spec-plan` skill - the plan-authoring stage now has a skill.** Intake wrote `NNN-requirements.md` and handed off to "the plan authoring step", a stage nothing owned: the only writer of `NNN-plan.md` was `spec-create`, which `spec-pull` explicitly ruled out, while `spec-execute` refuses to run without a plan. Tracker intake therefore could not reach execution. `spec-plan` writes the plan from existing requirements - coverage table, MUST READ FIRST, sibling checklist, phases, checkboxed work steps - so both intakes share one chain: `spec-pull` | `spec-create` -> `spec-plan` -> `spec-validate` -> `spec-execute`. Re-planning after a structural answer routes here too, and a plan already present is re-planned in place with ticked steps preserved.

### Fixed

- **`spec-execute-next` no longer hardcodes one engine's sync script.** Its reset step ran a named engine's vendored shell path - both a project-specific value in artifact text, which the pack bar forbids, and a command that engine no longer ships. The step now re-renders generated intelligence outputs with whatever command the project's engine documents, and skips when it has none.
- **`git-scan-secrets` names the callers it actually has.** Its hand-off line still read "invoked by `dev-review-changes` and the orchestrators pre-push"; no orchestrator invokes it, and the line survived the change that wired the scan in. The two real callers are named instead: `dev-review-changes`' Critical check and `git-commit-push` step 3, both in `diff` scope.
- **The root README counted 14 spec skills.** `spec-plan` made it 15.
- **The pack agents now register.** `dev-code-reviewer`, `dev-test-engineer`, `spec-architect` and `spec-docs-writer` carried no `name:` in their frontmatter, so Claude Code never listed them as subagents and the skills bound to them (`dev-review-changes`, `dev-run-tests`, the spec skills) ran without their agent. Each agent now names itself.
- **Core no longer points at spec skills it cannot assume.** `dev-handoff` suggested `spec-continue`, `git-commit-push` referred to "Phase B" of the spec orchestrator and `dev-code-reviewer` cited spec discipline and ADRs unconditionally, while the pack README says core has no dependency on spec. Those references are now conditional on the spec pack (or the profile `decisions_dir`) being present.
- **Autonomous mode's `status: proposed` is written once, by `spec-plan`.** `spec-create` wrote it at intake and `spec-pull` wrote nothing, so a tracker-sourced spec never entered the approval queue. The status now lands where the thing being approved exists: `spec-approve` gates on the plan's coverage table and sibling citations, so a requirements-only spec has nothing to approve. One writer, both intakes covered.
- **The supervised-flow description had validation and answering the wrong way round.** The README implied questions were resolved before the plan was fact-checked; validation runs first and can itself raise questions.
- **The secret scan is now wired into the commit flow it claimed to be part of.** `git-scan-secrets` advertised "invoked by `dev-review-changes` and the orchestrators pre-push" while nothing invoked it - `dev-review-changes` cited its patterns and no orchestrator named it at all, so the guarantee was prose. `git-commit-push` step 3 now runs it in `diff` scope - a live credential in what is about to be committed stops the commit, one elsewhere in the pending diff is reported without blocking - and the review skill's Critical check runs the scan instead of borrowing its regexes.
- **Two completion bounds graded something the agent cannot observe.** `dev-handoff` verified that "a cold reader could continue" - a counterfactual about a person; it now requires every state claim to cite a command run this session, plus a printed, git-ignored save path. `spec-audit-docs` verified only the claims it chose to report, so a run extracting one claim passed; the bound is now that every claim extracted in step 2 carries a classification (step 4 gained `verified` so the two agree), with two-sided evidence required for the non-verified ones.

### Changed

- **Installation is documented against the Intelligence CLI; intelligence-sync is now the legacy path.** That engine is archived at v0.10.4, so the README Quick start, `docs/integration.md`, `packs/README.md`, `CONTRIBUTING.md` and `docs/enforcement.md` all described a superseded mechanism - a `config.yaml` with `packs:`/`mirror:` blocks, synced by a vendored shell script. The Quick start is now four commands plus one profile prompt; the integration guide's modes are registry package, explicit source, global skills and plain copy, and it gained a migration section for projects still on the old engine. Three differences are worth knowing when upgrading: package content is no longer mirrored into the tree but lives in a gitignored store, the requested range and its resolution are split between `intelligence.yaml` and a committed `intelligence.lock`, and versions come from this repository's git tags rather than a branch ref.
- **`## CRITICAL` became `## Constraints` in every skill.** When every skill ends with a section marked critical the marker stops carrying information and the register bleeds into the output; the section keeps its invariants and drops the items that only restated a step above or an always-on rule (the commit-trailer ban, the idempotency guards, the never-weaken-a-gate line).
- **Conflicts hand off through the profile.** `git-finalize-pr` and `git-merge-pr` read a new profile key `conflict_skill` (default `git-resolve-conflicts`), so a project that layers its own resolution rules on top names that skill once instead of diverging at each hand-off; `git-finalize-pr` also drops its project-specific CI-round duration.
- **`dev-code-reviewer` reviews sibling drift** - a new artifact that departs from its closest shipped sibling is a finding with the sibling path cited.
- **The packs README says what `templates/claude-settings.json` is for**: copy it into the project's committed `.claude/settings.json` so the prose bans (force-push, blanket stage, `--no-verify`) are denied by the harness too.
- **The profile's `## Releases` section explains the flow and names the mode.** It was a bare key list, so `release_cut` read as one setting among eight rather than as the decision it is: where the release gets reviewed. The section now opens with the phase order a release runs through and states that `release-pr` is what gives the release change-set a review surface - a `release/x.y.z` branch where the changelog, the version, and any release docs are updated and read before they ship, with the pending-step checklist as its PR body - while `direct` has none and `automated` delegates both.

- **Autonomous outcome labels are defined once.** `git-workflow` holds the meanings; `git-finalize-pr` and `spec-execute` restated them in full and now cite the set. Three copies of a definition drift; one does not.
- **`docs/enforcement.md` states the owner gate's portability limit.** `disable-model-invocation` is Claude Code's field - the engine passes it through and every other target ignores what it does not understand - so on Cursor, Copilot, Codex, Pi and opencode the merge and release gates are prose, not machinery. The page maps its other limits honestly and was silent on this one.
- **`dev-skill-first` stops promising a catalog no install path delivers.** It instructed the agent to "check the skill catalog"; no install mode places one in the host project (a mirrored pack copies only the referenced subpaths). The rule now points at the skills actually installed, which is what the agent can see.
- **Every skill description now follows one shape.** They ranged from 62 to 329 characters and mixed imperative labels with full paragraphs; they are now 109-169 characters in one shape: a third-person lead clause naming what the skill does and when to reach for it, followed by a short boundary clause wherever a sibling is genuinely confusable. The four pull-request skills each name the neighbor they are not (`git-commit-push` stops at the push, `git-open-pr` hands to `git-finalize-pr`, `git-finalize-pr` names both sides, `git-merge-pr` states the owner gate). A description is the entire basis on which a tool picks a skill, and a long one gets re-summarized on the way in - a compact one arrives as written. Spelling across the packs is American throughout.
- **`ROADMAP.md` is scoped to 0.5.0, and Distribution is resolved.** The heading still read "0.3.0 candidates" after 0.3.0 shipped without any of them; it now names the release the listed entries are actually candidates for, and each entry states what it has to answer before it can be built. New entries: the red-loop package (one shared definition, then `dev-diagnose`, then `dev-add-tests`), `dev-decision` (a `core` rule requires decision records and only the `spec` pack can write one), `dev-add-ci-gate`, brief-to-batch decomposition, and the generated change-flow map. The rejected-decisions registry now also covers known defects - both answer "has this already been decided?" at intake. Constraints-as-machinery and the eval harness moved to a committed-but-unscheduled section. **Distribution is answered**: the packs ship as versioned Intelligence Packages installed by the CLI, the only candidate that carried always-on rules; a supplementary plugin-format channel stays open, and `dev-init` is unblocked now that the mechanism is settled. The condition that entry set - that a manifest and the pack folders be validated against each other in the same change that introduces a manifest - was missed by one PR and is now met before the index ships in a release.

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
