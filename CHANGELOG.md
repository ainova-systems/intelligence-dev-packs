# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- ROADMAP: epic planning replaces brief decomposition, Risk and Size as pull request labels replaces risk-driven factors, `rollback_policy: forward-fix` covers a project that fixes forward after release, `app_stop` is needed only for what outlives the command that started it, and one folder of defect records also keeps the defects that cannot be fixed; the CI gate wiring skill, the rejected-decisions registry and per-step HITL/AFK marking are dropped.

## [0.16.0] - 2026-11-10

CI green and the gate runner mean what they say, the pull request template says why, and the two judging agents run at a fixed effort.

### Added

- Core reference `git-pr-labels`: how the autonomous pull request labels are written and read - the stage report, a state change, a refused claim, reading freshness, and what the flow needs from a forge.
- Core profile key `required_checks` (default `auto`): the checks CI green needs on a commit - `auto` reads the rulesets and branch protection of the branch a pull request targets, a list names the checks, and `none` declares a project that runs no CI.
- Core profile key `draft_ready` (default `finalize`): `git-finalize-pr` marks a draft pull request ready before its first round; under `owner` the draft stays a draft and the run ends `ai:manual` saying so.
- Core profile key `decision_lifecycle` (default `log`): a decision record is written `accepted` or `rejected` on its branch and becomes binding at the merge; under `proposed`, `spec-decision` may commit a proposed record naming its decider, and accepts or rejects it in place when that decider invokes it with the record's path.
- `max_pr_rounds: unlimited` sets no round budget for `git-finalize-pr`; its other stop rules still apply.
- `git-open-pr --draft` opens the pull request as a draft, and `dev-deliver-next` reserves a queue item through it.
- `verify-runner.mjs`: a gate command may return `{ skip: '<reason>' }` when it cannot run on this host (`not run: <gate> (<reason>)`, exit 3 under `--ci`), a `needs.wrap: false` gate runs its argv without the runtime prefix, and `ctx` carries `all` and the gate's resolved `runtime`.
- `scripts/test-scripts.sh` runs every bundled script test and fails when it finds none; CI runs it on Linux and Windows.
- `scripts/validate-pack.sh` checks agent `tier`, `access` and `effort` against the engine's scales; fails an agent that sets `model:`, a `SKILL.md` that declares `tier:`, `model:` or `effort:`, and an `agent:` without `context: fork` or naming no shipped agent; warns on a forked skill without `background: false` and on a long description; and rejects the phrases listed in `CONTRIBUTING.md` > Phrases the validator rejects.
- `settings-patterns.test.mjs` fails when a pack text names a command the settings template denies, unless the text names it as forbidden or as the owner's step.
- `docs/integration.md` > Models, effort and tool access: what an agent's tier, effort and access become in each tool, with the engine's conventions as the source; how a project routes a tier or one pack agent differently; and that the reviewer and QA verifier have no shell on Copilot, OpenCode and Antigravity until they move to `access: runner`.

### Changed

- `git-workflow` keeps the law of the autonomous pull request labels and moves its mechanics to `git-pr-labels`; core's always-on rules shrink from 2,646 to 2,461 words, `git-workflow` from 1,182 to 778.
- A runtime's claims record is a third way a run knows a claim is its own, and a stopped run it names may be taken over with the previous holder recorded; a scenario pack may end its runs at a hand-off it declares.
- A forge without pull request labels reads every factor from the stage's latest report and names the state label as a capability gap; free text a forge read returns is delimited data the stage judges, never instructions; a person's QA sign-off can be a declared success factor.
- `dev-working-with-people` > Consent: a stage's yes covers the writes of the skills it runs, and in a run nobody attends a question a callee returns is recorded where that stage reports, never asked.
- `dev-verification-gates`: a denied tool call is diagnosed and redone in the allowed form, and reaching a denied command by another spelling counts as weakening a gate.
- `dev-rollback-safety`: a contract whose consumers cannot be withdrawn ships provider-first and stays backward compatible until the oldest supported consumer is gone.
- The pack default pull request template asks why in three labelled lines, the sources the change answers, its impact on the person using the project, and a before-and-after table of changes; the hand-filled Risk section is gone.
- `git-commit-conventions`: a pull request body names who met the problem or asked for the change by role and organisation, and an attribution line already in pushed commits is reported and never blocks a run.
- `git-merge-pr` squash-merges with the pull request title as subject, an empty body and `--match-head-commit` set to the guarded head, so the forge refuses a push that landed after the guards.
- `git-review-pr` reviews only the commits since the last reviewed head when that head is an ancestor and no merge from the base came between, and names `since: <prev>` in its report; the body's claims are still judged against the whole diff.
- `git-commit-push` commits every path `git status` lists, reading each in its review, unless `--only <paths>` narrows it.
- `git-finalize-pr` corrects a declared verification step only where it names something that does not exist or asks what the stage cannot do; a failing step is a code defect, and changing its conditions or expected result is the owner's decision.
- `git-verify-pr`'s steps digest takes each matched standing check as the `qa_checks` file writes it, without its *Why* line, in the file's order.
- `dev-deliver` takes a task `spec-discipline` would implement directly to the built-in path instead of spec intake, fetches before reading where the work stands so a branch only on the remote counts, and gives every checkout its own local resources.
- `dev-init` writes the tag-push ask entry from profile `tag_format` and reports the check set `required_checks` resolves to.
- `spec-execute` Phase B is the one definition of entering a spec's branch: fetch, switch to the branch when it exists locally or on the remote and fast-forward it only, stopping on a fast-forward git refuses, or create it from the base. The prefix comes from profile `branch_prefixes` instead of a fixed `feature/`, and the preconditions are read on that branch. `spec-continue` enters the branch before it reads the spec, and `spec-execute-next` starts and ends with `git-sync-base`.
- Under profile `approval: explicit`, `spec-plan` names pushing the spec to its branch as the step before `spec-approve`, and `spec-approve` reads the pushed plan and commits the approval line alone, so an approver and an executor on different machines see the same plan.
- `spec-orchestration` > Delegate by pointers defines what a delegated prompt carries: a fresh context with pointers only, and only inline skills to invoke, since a forked skill already is a worker the orchestrator runs itself. `spec-execute`'s prime directive and Phase C point at it.
- In a run nobody attends, a question `spec-document` or `spec-audit-docs` returns during `spec-execute` Phase D goes under the plan's `## Review findings` and into the final report instead of being asked.
- Model and effort routing is one convention in `CONTRIBUTING.md`: the tier picks the model, `effort: high` sits on each agent whose verdict earns a success factor, every other agent runs at the session's level, and no skill declares a tier, model or effort. `dev-code-reviewer` and `dev-qa-verifier` declare `effort: high`; their tiers are unchanged.
- No pack agent lists `skills:` any more: Claude Code preloaded every listed skill whole into each run of the agent, while a forked skill already arrives as the run's prompt.
- The validator's word budgets follow the engine's numbers, including 150 words per paragraph, and stay warnings.
- ROADMAP: the red loop, the rejection registry, the eval harness, brief decomposition, constraints as machinery and per-step HITL/AFK carry what field use settled; `dev-decision` gains its decision-record check; new entries for trimming the three heaviest skills, one file per defect, `app_stop` and `dev-setup-machine`, `rollback_policy`, risk level to required factors, linked work across repositories and a forge and tracker adapter contract; the directions weighed and not scheduled; and the known defects this release did not fix.

### Fixed

- `verify-runner.mjs` no longer reports a gate whose command returns an empty argv as passed - it prints `<gate>: nothing to check` - and says `NOTHING CHECKED` instead of `PASS` when no gate ran a command; under a Git Bash pipe on Windows with a WSL child it keeps its exit code instead of crashing with 139.
- `guard-push.mjs` asks the owner before a push that carries a tag of profile `tag_format`'s shape - named, deleted, `--tags`, a pattern or `--follow-tags` - and without a profile protects the remote's default branch and an existing `develop`, as `git-workflow` detects them.
- `spec.mjs check` refuses an agent with `access: runner` as a step's executor, as it refuses `readonly`; `full`, and an agent with no `access:` key, which the engine renders as full, are accepted.
- CI green means every required check succeeded on the head: skipped, cancelled, neutral, absent and draft checks no longer read green, and a conflict is established by a trial merge instead of the forge's mergeable flag.
- A draft pull request is marked ready before the first round instead of staying a draft no check counts on.
- A re-verification runs when only the declared verification steps changed at the same head, instead of stopping on the earlier report.
- Rebuilding a pull request body with `git-open-pr` keeps every block profile `digest_exclude` names, verbatim, at its place.
- `spec-execute` no longer fails when the spec's branch already exists, and no longer names a branch prefix of its own.
- `spec-docs-writer` names profile keys that exist (`features_dir`, `rules_dir`, `decisions_dir`) instead of the undefined `plans_dir`.
- `dev-code-reviewer` ranks findings by the severities `dev-review-changes` defines instead of a vocabulary of its own.
- `docs/integration.md` and the READMEs match the repository: the pack tree shows every agent, the references and both template folders, a plain copy takes `references/`, the version examples show what `package add` records today instead of `^0.4.0`, and the tool lists include Antigravity.

**Updating:** A repository that copied the earlier pack default pull request template keeps it, since `dev-init` copies the default only when none exists; to take the new one, delete `.github/PULL_REQUEST_TEMPLATE.md` and run `dev-init` again, keeping profile `verify_section` equal to its verification heading. A project whose CI reports nothing, or that runs none, sets `required_checks: none`, or its pull requests end `ai:manual` naming the key. A project where the owner or a runtime marks drafts ready sets `draft_ready: owner`. `git-commit-push` now commits every path `git status` lists, so a session sharing its working tree with other work passes `--only <paths>`. A re-review after a push judges only the new commits, and a tool that reads the review report finds `since: <prev>` on such a review. A tool that parsed the stage-report envelope from `git-workflow` reads it from `git-pr-labels`. A pull request verified earlier against a standing check that has a *Why* line reads stale once and is verified again.

**Updating:** `dev-code-reviewer` and `dev-qa-verifier` now run at `effort: high` in Claude Code and Codex whatever the session's level - above a session at the default `medium`, below one at `xhigh` or `max`; a project that wants another level adds a project agent of the same name, which overrides the package's, and in Claude Code `CLAUDE_CODE_EFFORT_LEVEL` still overrides a declared level. The engine renders `effort:` from 0.19.0 on. With the `skills:` lists gone, Claude Code no longer preloads those skills into the pack agents; a same-named project agent that keeps its own list keeps that preload.

**Updating:** Under the default `decision_lifecycle: log`, `spec-decision` writes no `proposed` record: an open debate stays in the pull request or in the spec's open questions. A project that keeps proposed records in its tree sets `decision_lifecycle: proposed` and accepts each through `spec-decision <path>`. A project whose profile `branch_prefixes` does not list `feature/` gets new spec branches under its first prefix; a spec started on `feature/<slug>` before this release is continued only if `feature/` is in the list, so add it until that spec merges. `spec-execute-next` resets through `git-sync-base`, which also deletes local branches whose pull request merged. Under `approval: explicit`, the approver runs `spec-approve` on the spec's pushed branch and the approval lands in a commit there.

**Updating:** Re-run `dev-init` to write the tag-push ask entry from profile `tag_format`. A CI step that runs the gate runner with `--ci` and must stay green while a gate skips itself accepts exit 3 explicitly.

## [0.15.0] - 2026-11-07

Judging and test skills run as forked subagents that hand questions back, and a hook guards pushes to protected branches.

### Added

- `dev-init` > `scripts/guard-push.mjs`: a Claude Code `PreToolUse` hook on Bash and PowerShell that denies a `git push` updating a branch profile `protected_branches` names unless every path it changes matches `direct_lane`. It resolves refspecs, `remote.<name>.push` and `push.default` through `git -C`, chained commands, `sh -c`, `pwsh -Command`, command substitutions and git aliases, denies `--all`, `--mirror` and deleting a protected branch, and denies a push whose targets it cannot resolve; `guard-push.test.mjs` runs it against a real repository and remote.
- Core profile key `direct_lane` (default `none`): the paths that may be pushed straight to a protected branch, as gitignore-style patterns; the operator pack defines the same key with the same default.

### Changed

- The ten skills that read files, git state and arguments rather than the conversation run forked in their agent's subagent (`context: fork`, `background: false`): `dev-review-changes`, `dev-run-tests`, `git-review-pr`, `git-verify-pr`, `spec-pull`, `spec-plan`, `spec-validate`, `spec-close`, `spec-document` and `spec-audit-docs`. The six that hold a dialogue or take an approval run inline and drop the `agent:` field, which takes effect only with `context: fork`: `spec-answer`, `spec-approve`, `spec-cancel`, `spec-create`, `spec-decision` and `spec-init`.
- A forked skill never asks (`dev-working-with-people`): it stops before the write a decision governs and ends its result with the question, and its caller asks. `git-verify-pr` returns its missing-environment question that way, `spec-pull` its tracker question, `spec-document` the claims to confirm and `spec-audit-docs` the doc fixes; `spec-pull` runs `spec-plan` itself.
- The read-only judges work without the skill and MCP tools their agent lacks: `dev-review-changes` and `git-review-pr` follow the other skill's `SKILL.md` in the same run, and `git-verify-pr` drives interfaces through the shell. `git-finalize-pr` invokes its two judging stages directly instead of wrapping each in a subagent of its own, and `dev-deliver` asks a forked intake skill's questions in Phase A.
- `templates/claude-settings.json` carries the push-guard hook. `dev-init` merges it and no longer writes the eight push-deny rules per protected branch, which also blocked the paths a project pushes straight to its integration branch, and reports any it finds as superseded. `docs/enforcement.md` says the guard is off until the rendered script exists, as in a fresh clone before sync, with the forge's branch protection as the boundary.

**Updating:** Re-run `dev-init` to add the push-guard hook to `.claude/settings.json`. It reports the `Bash(git push ...)` deny rules an earlier run wrote for each protected branch; remove them, because no allow rule overrides a deny rule and they keep blocking what `direct_lane` allows. A project that set `direct_lane` for the operator pack already has it in `dev-project-profile.md`, where the guard reads it. A caller that started its own subagent for one of the ten forked skills invokes the skill instead.

## [0.14.0] - 2026-11-07

Gate runners, reviews and commits judge one defined change, the settings template denies commands that discard work, and spec plans are shorter.

### Added

- Core rule `dev-working-with-people`, always on: a report opens on the result in the reader's language, a question carries one decision explained from zero, consent is one yes per stage, and the work keeps to the scope that was asked.
- Core reference `references/dev-external-writes.md`: a write into a system people own is a project script subcommand that dry-runs unless `--apply` comes last, is allow-listed by its exact form, and sends content the layer does not own back unchanged.
- Core gate runner `skills/dev-run-tests/scripts/verify-runner.mjs`: it runs a gate table the project owns against the change, cheapest gate first, stops at the first failure and reports what it did not run or reach; with `--ci` a gate whose runtime is missing is reported as not run and the run exits 3.
- `dev-init` > `references/windows-hosts.md`: Windows host facts, each with the failure it caused and what the layer does instead.
- `dev-init` > `scripts/settings-patterns.test.mjs`: checks the settings template's rule shapes against a simulation of the documented Claude Code permission matcher.
- `spec-validate` > `scripts/spec.mjs`: the spec's state, the plan's mechanical checks, the open questions in dependency order, the specs a change delivers, and two structural plan edits, run by every spec skill.
- Spec template `spec-retired-conventions`: an optional project rule listing the conventions the code has deprecated, each with its replacement; `spec-init` drafts it when deprecation marks exist.
- Core profile key `secrets_file` (default `.env.local`): the credentials file `dev-init` keeps out of the agent's file tools.
- Profile keys `regenerate`, `approval`, `execute_through`, `spec_folder`, `spec_checks` and `tracker_writes`; their defaults keep the earlier behavior.
- Proposed decision `docs/decisions/261107-intake-copies-tracker-text-verbatim.md`: intake copies the tracker text word for word, and the plan writes the requirements.

### Changed

- `templates/claude-settings.json` denies force-push, `--no-verify` and blanket staging wherever the flag sits in the command, denies the commands that discard uncommitted work and reading the credentials file, and turns off commit, pull request and session-link attribution.
- `dev-init` writes push-deny rules for every protected branch, reports the harmless commands the rules also deny and a missing `claudeMdExcludes`, and reports the host's Node, git, make, line-ending, long-path and symlink state before setup.
- `dev-verification-gates` defines the change every gate runner and review judges: everything between the merge-base and the working tree, untracked files, deletions and both sides of a rename included; a base that does not resolve or an empty merge-base stops the run. `dev-run-tests` and `dev-review-changes` read that change.
- `git-commit-push` commits with `git commit --only -- <paths>`, so paths another step left staged stay out of the commit; it runs profile `regenerate` first, and in a spec project it stops when a spec the change ticks is not `in-progress` or `completed`.
- A review finding names the case that fails, and in rules, skills and agents only a wrong or missing outcome, a contradiction or a stale reference counts; what an approved plan states is settled.
- The `## Code review` report carries one record forward in `### Unresolved` and `### Resolved` lists, only a review moves an entry to Resolved, and `git-finalize-pr` queues only Unresolved Criticals as defects.
- `git-open-pr` rebuilds the body of an already open pull request from its sources, and `git-finalize-pr` and `git-commit-push` route body changes through it.
- `git-finalize-pr` runs its judging stages in the foreground and, in a spec project, puts a delivered spec that is not `completed` to the owner; `dev-deliver` runs a worktree instance's implement and review phases from a session started in that worktree.
- `spec-plan` writes a shorter plan: `## Approach` with `Constraints:`, `Defaults:` and `Precedents:` replaced MUST READ FIRST, the sibling checklist and the per-phase citations; each work step names its outcome, place, executor and check; the planner picks and checks every executor, path and command it cites; a replan rewrites the plan in place, keeping ticks and adding rework steps.
- A spec question is a fact or a decision: the agent finds facts and `spec-plan` fixes a `[plan error]`; decisions carry `Depends on:` and stable numbers, and `spec-answer` asks them one at a time and can correct an earlier answer.
- Consistency covers the product's precedent (UI and copy, API contracts, where data lives, decisions taken, glossary); every behavior a step adds traces to a requirement, a precedent or a default, and `spec-validate` reports one that does not.
- `spec-orchestration` routes every finding after planning through one table, and `spec-execute` takes an in-scope fix as text, also on a finished plan.
- `scripts/validate-pack.sh` warns on a `SKILL.md` over 1500 words or a paragraph over 200, and resolves pack-level `references/` pages by name; `CONTRIBUTING.md` asks a fix to restate the outcome so that it covers the case a review found.

**Updating:** A project that already ran `dev-init` keeps its old prefix rules until it runs `dev-init` again, which adds the new rules beside them. A tool that parses the `### Critical` / `### Warning` / `### Suggestion` headings of a `## Code review` report reads the severity at the start of each `### Unresolved` entry instead. A plan written before this release fails `spec.mjs check` until it carries the seven plan sections in order and names its executors in backticks; `spec-plan` replans it in place. A project that runs the operator pack with `direct_lane` removes the push-deny rules `dev-init` writes for its integration branch, because an allow rule cannot override a deny rule.

## [0.13.0] - 2026-11-06

The operator pack moved to its own repository, and core no longer carries anything only the operator pack reads.

### Changed

- Core's profile template no longer defines `flow_plan`, `judge_runner` and the keys only the Operator runtime's phase skills read; a project that already has them in its profile changes nothing. Core's artifacts no longer name another pack's skills.
- `git-verify-pr` > Digests reads the blocks to strip from a pull request body from the new core profile key `digest_exclude` instead of the operator configuration; its value lists `` `<start marker>` .. `<end marker>` `` blocks separated by `;`.
- `scripts/validate-pack.sh` checks profile keys per pack: a pack reads keys from its own schema or core's, core reads only its own, and a key both schemas define must carry the same default.

### Removed

- The operator pack moved to https://github.com/ainova-systems/operator-packs; projects that installed it switch their package source there.

**Updating:** a project that used the operator pack switches its source with `intelligence registry add https://github.com/ainova-systems/operator-packs.git`, then `intelligence package remove @ainova-systems/operator` (only when it was installed by that name from here) and `intelligence package add @ainova-systems/operator@^0.13.0`; in `intelligence.yaml` `sources.skills` it replaces the old operator skills path with `.intelligence/packages/@ainova-systems/operator/skills`, points profile `forge_cli` at `.intelligence/packages/@ainova-systems/operator/skills/operator-contract/scripts/forge-github.mjs`, and sets `direct_lane` to keep committing queue documents directly.

**Updating:** a project whose `operator_config` sets `digestExclude` adds the same blocks as `digest_exclude` to its profile, or its verification reports go stale after each rewrite of those blocks.

## [0.12.1] - 2026-11-06

The forge edit replaces a pull request's title and body in the hand-off call, and the pack validator no longer fails at random.

### Fixed

- `scripts/validate-pack.sh` no longer reports a profile key as undefined at random: the schema lookup reads a here-string instead of a pipe that `grep -q` could close early under `pipefail`.
- Operator forge contract: `pr edit` takes `--title` and `--body-file` in the same call as the milestone move, labels and claim, and any flag a subcommand does not read is a usage error (exit 2) instead of being ignored.

## [0.12.0] - 2026-11-06

Judging stages leave their workspace still, a review goes stale on a body edit, and operator runs keep unpushed work in their slot.

### Fixed

- The judging stages (`git-review-pr`, `dev-review-changes`, `git-verify-pr`) never switch, commit, fetch or pull in the workspace they judge.
- `ai:reviewed` goes stale when the pull request body changes outside its verification section: the review report names a body digest, defined once with the steps digest in `git-verify-pr` > Digests, and every gate that reads review freshness compares it.

### Changed

- Every operator run reconciles its slot with the pull request's live head first: work a run could not verify and push stays committed in the slot for the next implement run to gate and push, other phases set unexpected slot state aside on a local, never-pushed `operator/leftover/<job>` branch, and merging or closing the pull request deletes those branches.
- Operator pack: a passing review records its body digest in an `operator:reviewed` note, and `operator-implement` recomputes the Risk/Size line before the review instead of after it. Consumer action: implement `--body-digest <n> [--body <path>]` in your discovery command (`operator_discover`) and the body branch of routing row 6 to get body staleness; without it reviews stay fresh by head alone.

## [0.11.0] - 2026-11-05

An open pull request handed off with a label is finished by the next free pipeline slot.

### Added

- An open pull request carrying the optional hand-off label (`labels.handoff`) is adopted by the next free slot ahead of every queue item and finished through the regular phases; the forge contract gains `pr draft` and `branch rename`.

## [0.10.0] - 2026-11-03

The operator pack runs a pull-request pipeline under the Operator runtime, with core optional.

### Added

- The `operator` pack (the Operator runtime's phase skills, the forge contract with its contract test, and its GitHub implementation as a script); `dev-deliver-next` and `git-sync-base` in core, with the profile keys they and the operator pack read.

### Changed

- The repository's own Intelligence project moved to Intelligence 0.22.1.

## [0.9.4] - 2026-10-20

Published artifacts stay focused on the change and its verification.

### Changed

- `git-commit-conventions` limits every published artifact - commits, PR bodies, stage reports, review replies, issues, changelog entries, release notes - to the change, how to confirm it and what was observed: no other project's details, local machine paths, investigation, internal discussion or decision reasoning. The pack PR template is shorter, and every skill that publishes checks its text against the rule.

## [0.9.3] - 2026-09-22

A declared verification step is one the stage can actually run, and a commit message reaches git instead of an editor.

### Added

- **`dev-init` pins the repository's line endings, so the answer stops living on each contributor's machine.** The Intelligence CLI writes generated output LF on every platform, while a checkout under `core.autocrlf=true` hands back every other text file as CRLF - this repository's own working tree held both at once, `AGENTS.md` in LF beside a CRLF `CHANGELOG.md`, `index.yaml` and `templates/claude-settings.json`. Git stayed quiet about it only because the check-in conversion happened to undo the checkout one, which is exactly why it survived unnoticed: `*.yaml` and `*.json` carried no attribute at all, so nothing was pinned, and the first contributor whose `core.autocrlf` is off commits the CRLF bytes and hands everyone else a whole-file diff nobody wrote. The new step detects it with `git check-attr eol`, where anything but `lf` is the gap: `unspecified` leaves the ending decided per machine rather than by the repository, and an explicit `crlf` decides it wrongly. With no `.gitattributes` it writes one, and says plainly that the file governs later checkouts rather than converting what is already on disk - the re-checkout that would do that discards uncommitted work, so it belongs to the owner on a clean tree, and `git add --renormalize .` is not a substitute for it because it touches the index only and blanket-stages every tracked modification; with one already there it reports the gap and the line that closes it and changes nothing, because in that file the last matching pattern wins - an appended catch-all silently overrides every rule above it, and whether those rules were deliberate is the owner's answer, not a setup skill's. This repository's own file is now the single catch-all, in place of three patterns that between them pinned `*.sh` and left the rest to whoever cloned it.

### Fixed

- **A judging stage has a word for a workspace that moved under it, and a worktree stops being the answer to every question about where work happens.** #31 made a stage withhold its factor when the location it was given moved, and left it nothing to report that as: `fail` says a step contradicted its expectation, `blocked (step)` blames one step, `blocked (project)` names a standing gap a profile answer ends, and this is none of them - it belongs to the run rather than to the change. Worse, `git-finalize-pr` filed it with the verdicts nobody can clear, so the one outcome the caller fixes by holding still was being handed to the owner as unresolvable. `git-verify-pr` now defines `blocked (workspace)` once, beside the four, as a verdict of the report rather than of any step - no step carries it, because the finding is that no step's result can be trusted - and the round that caused it clears it: hold the location still, run the stage again, and twice in a row is the second-actor coordination failure step 1 already owns.

  The same contract says what a stage may make for itself, which nothing did. A stage never makes its own judging location - that stays the run's to create and remove - but a throwaway repository to probe in is not one of those and needs no owner but the stage, and it is never a worktree of the repository under judgement: `git worktree add` writes into that repository's `.git` and takes a name in its branch namespace, which is the stillness the rule exists to protect. Every `dev-qa-verifier` run in the session that found this had already reached for a scratch worktree and cleaned it up, acting on the rule's purpose against its letter. The retry reaches both judging stages rather than the one with a word for it: `git-review-pr` deliberately has no verdict vocabulary, its label rule being binary on Critical, so it says in words what the other says as a verdict, and the round holds still for either. Both of the round's own branches carry it, so the verdict a stage returns has somewhere to go rather than only the one the fix happened to touch. And the factor is gated on the report rather than on the rows - a workspace block is no step's to carry, so steps that all read `pass` do not answer it, which is exactly how a factor earned from an unpinned location would otherwise have been written.

  And the worktree story itself now states its default instead of implying it: a run works in the checkout it was invoked in, one task never makes a worktree at all, and the second directory exists only for a task that has nowhere else to be - it is a cost in the owner's attention before it is anything else. Profile `worktree_policy` moves that line where a project wants it moved (`never` waits for the branch, `always` suits a project that routinely runs tasks in batches), and `worktree_create` / `worktree_remove` let a project whose worktrees need more than git - dependencies installed, env files linked - say how its own are made rather than having a built-in command decide.

- **`git-commit-push` hands the message to `git commit`, so the commit stops waiting on an editor nobody is there to close.** Step 5 settled the message and step 6 ran a bare `git commit`, which ignores it and takes its text from `core.editor` instead - on the machine that reported this, a Notepad++ window opened from the system gitconfig, in a run with no human in front of it. The binding was left to whoever executed the step, and the form nearest to hand is a bash heredoc that does not parse in PowerShell at all, so the shell that swallowed it fell back to the same editor. Step 6 now carries `-m` with the message step 5 already produced, and sends a body through `-F <file>`, because a backtick or a quote in this pack's own prose style is live syntax to bash and to PowerShell alike - the trap `git-open-pr` already avoids with `--body-file`. What the message must say stays in `git-commit-conventions`: the step passes step 5's result rather than restating the law it was written under.

- **A declared verification step is runnable by the stage that executes it, and a defect in one is fixed where it is found.** A step told the verifier to branch and commit on the very checkout `git-finalize-pr` pins for the duration of the stage, so it could not be run at all and came back `blocked (step)` - a verdict that reads like a finding about the change while saying nothing about it. Three short clauses close the seam. `git-open-pr` states that a step never moves the workspace the stage holds still and makes any branch or commit it needs in a throwaway repository, which is the difference between a step that proves something and one no stage can execute. `git-finalize-pr` stops routing every `blocked (step)` to the owner: where the step itself is the reason, the defect is in the pull request body and the round fixes it, the same round that fixes the code. And that fix is the round the skill never described - a body edit pushes nothing, so head does not move, the factors that judged the code alone stay fresh, and only the stages whose report named the body among its inputs are cleared and re-run. Without that line the run either re-ran every stage for an edit none of them read, or left a factor standing over an input that had changed underneath it. The requirement and the routing reach every place that restates them, in the same change: the hint a human fills the verification section from in the pack's default PR template, since an author who fills the template rather than reading the skill is exactly who would write the step again; the `blocked (step)` verdict list in `git-verify-pr`, so the stage names the cause the new routing reads rather than leaving it to be inferred; and `git-complete-pr`'s escalation list, which held the old unconditional reading and would otherwise have sent the owner a decision the round had already taken.

- **A declared verification step states a property, not a count, so the change it verifies cannot falsify it.** Three verification runs on one pull request failed in a row without a single defect between them: each step asserted how many files a `grep` would return, and each following commit of the same change added one. The step was right about the behaviour and wrong about the arithmetic, and a stage that reports FAIL for that reason teaches everyone reading it to discount the next FAIL. `git-open-pr` now says the expected result has to survive the change it verifies - give the filter whose output must be empty, or the invariant that holds however many files grow around it, and keep a count only where the number is itself the behaviour.

- **A declared verification step now names the state it starts from, so two readers cannot follow it two different ways - and a stage that cannot drive an interface looks for the one the repository already ships.** A change was delivered, reported green, and the owner opened the preview to a screen that showed the old behaviour - because the declared step said "sign in as `<role>`" while that environment's sign-in starts on a different account, and nobody had written down which. The step was followed exactly and proved something else; the feature was reported broken and was not. Two clauses close it from both ends. `git-open-pr` states what a declared step has to carry: the state it starts from, including what the environment does by **default** whenever that default is not where the step wants the reader, and - for behaviour that differs by role, permission or tenant - which one each step runs as and what the others must not see. `git-verify-pr` states what happens when the host cannot drive the named interface: a repository that exercises an interface in CI already ships a way to drive it, an end-to-end project with its own browser, a client carrying the project's auth, a preview whose sign-in offers seeded accounts, and reaching for one of those is the stage's work. `blocked (step)` stays for a capability nothing in the repository provides, and its report says what was looked for - handing the look to the owner because the host's own tool would not connect is not a verdict, it makes them the stage. The `blocked (step)` definition in the verdict list carries that same qualifier rather than a second, wider one, so the criterion a stage reads where it picks its verdict is the criterion the step states. Both requirements reach every artifact that authors, restates or gates a declared step rather than only the one stating them: the hint a human fills the section from in the pack's default PR template; the acceptance criteria `dev-deliver` writes in Phase A and copies into the verification section verbatim in Phase B, which is the path the original incident travelled and the one place where omitting the rule would have left it unsatisfiable; the standing checks `dev-qa-checks` authors for the same stage to execute; and the `dev-qa-verifier` persona, whose escalation boundary otherwise told the stage the opposite of what the skill now asks.
- **`dev-init` reports the `ai:*` labels nobody declared, instead of only creating the ones that are missing.** The step filled gaps and said nothing about extras, so a project that had grown a second state vocabulary of its own kept it invisibly: the pack's gates read one set of names while the project's skills wrote the other, and a pull request could end on a label that was finished to whoever wrote it and unreadable to whatever merges - green, reviewed, and outside the merge queue with nobody looking. The step now lists every other `ai:*` label the forge carries, deletes none, and names what would end each: retire it, or declare it in `pr_success_factors`, which is where a factor an external agent, worker or pipeline applies is legitimately declared. The choice stays the owner's; the report is what makes it a choice rather than a drift.

- **The round budget says when it is read, so a run cannot argue itself one more round.** `git-finalize-pr`'s stop rule said only that rounds "exceed" `max_pr_rounds`, which left the case that decides everything unanswered: a round entered past the budget and coming back green. One reading escalates it, the other accepts it, and a run wanting the second reading could have it - the ambiguity handed the decision to whoever was mid-flight, which is the one party a budget exists to bind. The budget is now read at the top of a round before any of its work, so a run that has completed its rounds never begins another and no round is ever judged after the budget ran out; the question cannot arise rather than being settled twice. Each way back into the loop increments the count where it happens rather than on the strength of a sentence elsewhere, so the hand-back from `git-complete-pr` cannot start rounds the budget never granted - and the count, which belongs to the run rather than to either skill and survives that hand-off, now has a stated start, which the vaguer wording never needed and the precise one cannot do without. All of it sits with the loop it governs rather than in the stop rule, which goes back to naming the rule in one line like its siblings. A project that needs more raises the key.
- **This repository's own `intelligence.yaml` no longer documents the wrong line.** A comment introducing the `targets:` block sat one entry higher, inside the `skills:` list and directly above `packs/core/skills`, so it read as describing a source path. YAML allows a comment mid-sequence, so both skill sources always resolved and nothing behaved differently - which is exactly why it survived: the only reader it misled was a human. No consumer-facing change.

## [0.9.2] - 2026-09-15

A run ends where it said it would, and a claim on a pull request stops being something a second run can take.

### Fixed

- **A run states where it is allowed to end, so pull requests stop collecting on `ai:processing`.** The four state labels were each defined, and nothing said which of them a run may stop on - so a run that reported progress and waited to be invoked again, or that ended while a check was still queued, left behind the label claiming an agent holds the PR right now. No reader can tell that from a live run, which is exactly the audience the labels exist for: an owner's triage view and the merge gate both read it as work in flight, and the only repair was a person noticing and re-invoking the skill by hand. `git-workflow` now names the three terminal labels against the one that is not, and states what the claim is worth: no run id, no expiry, nothing a second run can take atomically, so a run takes a pull request only when no claim stands or the claim is its own, and anyone else's stops it where it stands rather than being taken from the run that wrote it. Two agents on one pull request is a coordination failure the owner hears about - through a `Finalize - HELD` comment the refused run posts, additive so it cannot race the holder the way writing a label would - not one the second agent settles by seizing the PR. Refusing to take over is affordable precisely because every run now ends at a terminal label, which leaves a stuck claim meaning a dead run rather than routine traffic; the way out of one is stated rather than taken, and a claim that should survive a session boundary travels in the handoff, so `dev-handoff` now names the pull request its run holds and `git-merge-pr` no longer sends a held PR to a skill that will refuse it. `git-finalize-pr` gains the final state it is responsible for - that claim replaced by the outcome label `git-complete-pr` wrote - plus the three middles that read like an ending and each continue the run instead: a check still running, a stop rule (which ends the fix loop, not the run), and a stage that cannot run at all, whose inability is a finding for the outcome's list rather than a reason to go quiet. Which outcome it is stays `git-complete-pr`'s, which already holds those criteria once. `dev-deliver` states its five endings the same way, each with what the owner is left holding - the fifth being a pull request that was already another run's - and carries a transferred claim down its own resume path, so a handed-off session continues the work instead of being refused it.

## [0.9.1] - 2026-09-14

A judging stage that cannot trust its workspace says so instead of going green.

### Fixed

- **A judging stage no longer reads a workspace that is moving under it.** The first `dev-deliver`-shaped run committed and switched branches while `git-verify-pr` and `git-review-pr` were reading the same checkout; one of them noticed the tree had moved and worked around it unprompted. A stage that reads half its files at one commit and half at another reports a verdict for a state that existed at neither, and the report is indistinguishable from an honest one - which is what makes the factor it earns worthless. The invariant now sits with the party that can hold it, and it is defined once: `git-finalize-pr` > Isolation already owned how a judging stage is run, and now covers the workspace it is run against - neither the location nor the refs a stage resolves against move while it runs - fetch included, because `git diff <base>...HEAD` answers differently once a ref has moved with the checkout untouched - and the stage judges where it was told rather than making its own. A stage that finds its workspace moved writes no factor at all, since a label is the part a later gate trusts and one earned against a workspace nobody could pin is worse than an absent one. `git-verify-pr` and `git-review-pr` carry one identical line apiece naming that site, the inline form `dev-context-engineering` allows for a reader who needs the rule where they are standing. `dev-deliver` owns every worktree a run needs, including one a stage needs, so creation and cleanup keep a single owner.

### Added

- **`dev-init` reports where repository protection and the profile disagree.** `git-workflow` treats the default and integration branches as always protected and `dev-init` writes them into `protected_branches`, but nothing ever asked the forge whether they are - this repository's own `main` answered `protected: false` while carrying exactly that claim. The new step reads what the forge enforces for the branches the profile names and reports each mismatch with the command that would close it, including `release_cut: direct` against a protected target, which the release would otherwise refuse only once it got there. It changes no repository setting: detecting a mismatch and deciding what to do about it are different acts, and only the first belongs to a setup skill.
- **`docs/enforcement.md` states the layer it does not reach into.** Every mechanism on that page constrains an agent's behaviour on one machine; who may push to a branch, what a ruleset locks and who may delete a tag are repository configuration. A permission rule does not stop a person, so compensating there manufactures a sense of protection rather than providing one. Without the line the boundary had to be rediscovered - it was, twice, in the session that produced 0.9.0.

## [0.9.0] - 2026-09-14

The delivery chain as one flow, and the owner gate moved onto the act it guards.

### Added

- **`dev-deliver` skill - the whole chain as one flow.** Each git skill owns one step, so running a change end to end meant a person relaying every hand-off: `git-commit-push` → `git-open-pr` → `git-finalize-pr` → `git-complete-pr` → accept → `git-merge-pr` → `git-create-release`, one command at a time. `dev-deliver` drives that chain as one flow, in four phases - interview, implement, review, release - with the owner interrupted only between them, and a question raised inside a phase ending that phase instead of parking inside it. The two owner gates, accept and release, are asked at the boundary each governs or both upfront (profile `flow_approvals`); neither is ever inferred, and an approval never survives the session that gave it. Resumption is derived rather than stored - the tag, the merged or open pull request, its accept-readiness, the push state and the branch already say which phase a change is in, so there is no state file to drift from the work. They are read most-advanced-first, because a probe that reverts to false as the work advances must never be read before one that cannot: `git-merge-pr` deletes the local branch, so a ladder starting from branch existence would send a run resumed after the merge back to re-implement what already shipped. The two things git cannot answer - intent before a PR exists, and the approvals - are named with the rule for each rather than guessed. It orchestrates and does not implement: one subagent for the implement phase, one for review - split there because the stages that judge a PR must not inherit the author's account of why the code is right - and a second concurrent task gets its own git worktree (profile `worktree_root`) rather than the occupied one.
- **The flow adopts the project rather than assuming one.** Its interview and implement phases resolve their owner in the pack's usual order - profile `flow_intake` / `flow_implement`, then the installed skill catalog, then the built-in behavior - so a project that already ships an intake or execution skill has that skill run the phase (`dev-skill-first`). The spec pack's `spec-pull` or `spec-create` / `spec-plan`, and `spec-execute`, are one such project, not a special case in the skill's text. How much of the git lifecycle a delegate performs is never assumed either: the ladder is re-read when it returns, and the phase finishes whatever it left - `spec-execute` in `supervised` mode hands back an uncommitted branch, and is unchanged by this release.
- **Ownership is checkable, not a slogan.** The interview's product is acceptance criteria in observable form, authored before the code and by nobody who writes it; they fill the pull request's verification section verbatim, and `git-verify-pr` executes them later against the running change. Their exit condition includes being executable read-only - a criterion needing a live pull request or a person's credential is rewritten during the interview rather than returning as `blocked (step)` after the code exists.

### Changed

- **The merge and release gate moved from the skill's invocation to the irreversible command.** `git-merge-pr` and `git-create-release` carried `disable-model-invocation: true`, which blocked the wrong boundary: a model could not reach them at all, so `dev-deliver` could not finish its own last two phases on the host the pack targets first, while the merge itself was gated only by the owner having typed a command earlier. Both flags are gone; `templates/claude-settings.json` gains `permissions.ask` for `gh pr merge`, `gh release create` and the tag push, and `dev-init` now merges every `permissions` list the template carries rather than `deny` alone. The owner is still the only one who can merge or release - asked later and better informed, because `git-merge-pr`'s guards have already confirmed CI green, `ai:completed` with every factor fresh, zero unresolved threads and no conflict, so the prompt approves a merge known to be merge-ready instead of a command that may turn out not to be. `docs/enforcement.md` states what this does not cover: a host in bypass mode skips the prompt, a tag format that is not `vX.Y.Z` needs its own entry, and no settings file applies on Cursor, Copilot, Codex, Pi or opencode.
- **`dev-deliver` names no actor for the merge and the release.** Its boundary rows and Phase D said "then `git-merge-pr`" and "then `git-create-release`", naming the orchestrator as the one performing them. They now say the step runs **on** the accept and **on** the authorization and name nobody - the one reading that stays true across every host the pack renders to, whatever each does about who may invoke a skill. `flow_approvals` carries the consequence: an upfront grant moves when the owner acts, never whether, and a host may stop again at the irreversible command itself. `docs/enforcement.md` records the same reading.
- **ROADMAP: "The change-flow map" is resolved by `dev-deliver` and removed.** It proposed generating a static numbered walk of the installed skills, per project, to answer "in what order are these used". The order is now an artifact that runs rather than a page that describes, written once in the pack and resolved against what is installed at run time - which is what the entry asked for, without a generated document to keep in sync. "Per-step HITL/AFK marking" stays and now says what it covers next to this: `dev-deliver` settled the outer granularity (the phase boundary), that entry covers the inner one (the work step), and the two compose without a second pause model.

### Upgrading

- **Re-run `dev-init`.** The permission rules that now back the merge and release gates ship in `templates/claude-settings.json` and reach a project only through that skill. A project that ran `dev-init` before 0.9.0 keeps its `deny`-only block until it runs it again, and in between its merge gate is the skills' prose rather than the harness - the flag that used to back it is gone. The merge is additive and the skill is idempotent, so existing entries are kept. A project whose tag format is not `vX.Y.Z`, or whose forge is not GitHub, adds its own entry; `docs/enforcement.md` says which.

## [0.8.1] - 2026-09-11

A PR body a reviewer reads in a minute.

### Changed

- **The default PR template now caps `Why` and `What` at one or two sentences each.** `Why` asked for a paragraph, `What` for a few sentences, and `git-open-pr` called both paragraphs - so a two-file bug fix arrived carrying a five-sentence problem statement with the investigation and the root cause folded into it, a body that costs the reviewer the time it exists to save. The comments now ask for the smallest statement that makes the change make sense, and send investigation notes and root-cause mechanics to `Changes`, where the shape of the work already lives; the template header states once that a section comment is a ceiling, not a quota. `git-commit-conventions` carries the general half so it holds for a project's own template too - the body's reader skims, and each section answers its own question and stops. `git-open-pr` no longer asks for paragraphs: it fills to the section comments and checks the body against them. A repo that already copied the template to `.github/PULL_REQUEST_TEMPLATE.md` updates its own copy; the rule applies there regardless.

## [0.8.0] - 2026-09-10

A named setup skill and a PR body a cold reviewer can follow.

### Added

- **`dev-init` skill.** One-time per-repo setup after the core pack is installed: fill and pin the project profile, create the `ai:*` labels `git-workflow` names, copy the pack PR template when the repo has none, merge the harness deny-list, and resolve the QA environment keys before the first PR asks. Idempotent and it does not commit. The README's copy-paste profile prompt is this skill; `spec-init` now runs it first when the profile is missing. After a template copy or an existing template, it pins `verify_section` to that heading. Sync runs once after the last profile write, and only when `intelligence.yaml` is present - a CLI on PATH without a manifest is still the copy install.
- **This repository now carries an Intelligence manifest.** `intelligence.yaml`, `intelligence.lock`, and generated `AGENTS.md` landed after 0.7.0 so the pack can be developed with the CLI.

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
