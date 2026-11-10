# Roadmap

Planned improvements, in intended order. Each entry states the problem it exists to fix, so a future session (or contributor) can pick one up without re-deriving the reasoning. The list evolves; shipped entries move to the CHANGELOG.

## Next candidates

### The red loop - one reference, then `dev-diagnose`, then `dev-add-tests`

**Problem.** An agent's default debugging behavior is to read code and build a theory, then "fix" the theory. Without a reproduction there is no way to tell a real fix from a plausible one, and the fix-didn't-help-fix-again loop burns tokens with no measurable progress. The same gap sits on the other side of the gate: `spec-execute` requires every slice to ship "code plus its test", and nothing in the pack says how a test comes to exist before the code it tests.

**Shape.** Three artifacts, one shared definition, in this order:

1. **A reference defining the *red* loop** - what it means for a loop to go red, and a ranked ladder of ways to build one (failing test, curl against a running service, CLI plus snapshot, headless browser, replaying a captured trace, a throwaway harness, property-based test, bisection), plus tagged debug instrumentation (`[DEBUG-<id>]`) so cleanup is one grep.
2. **`dev-diagnose`** - bug diagnosis behind a hard gate that outranks everything else: before reading code, a reproduction command must exist and have been run at least once, and the phase's completion criterion is the pasted command plus its actual output. After the fix, the same command going green is the proof. This is the pack's artifact-derived-status discipline applied to debugging: "I understand the bug" does not count; the red loop does.
3. **`dev-add-tests`** - the red-green loop for new behavior, pointing at the same reference rather than redefining *red*.

Field use of the same loop in another skill library adds what the reference states from the start. A loop counts only when it is red on the exact reported symptom, deterministic, fast, and runnable with nobody present. A red forced by editing the code is proven by diffing the edit against a pristine copy, because an edit that silently changed nothing passes as a failing test. The reproduction is minimised until every part of it is load-bearing. When no correct seam exists for the regression test, that absence is an architecture finding recorded where profile `defect_log` points, never a test bent to fit. What a loop captures is redacted the way `git-scan-secrets` classifies a credential, not by a definition of its own.

The reference comes first precisely so the pack's strongest new word is defined once. Open at design time: how prescriptive the loop should be - the pack requires one strong default rather than a menu, and this is opinionated enough that the default is an owner call.

### `dev-decision` - decision records for a project on `core` alone

**Problem.** `dev-context-engineering` is a `core` rule, always on, and it requires that "significant decisions get a decision record with explicit status". The only skill that writes one is `spec-decision`, which ships in the `spec` pack. A project that installs `core` alone - the majority case, since `spec` is opt-in - carries the requirement with nothing to execute it, which is the pack's own "a procedure inside a rule has no name a plan can call" failure.

**Shape.** Move the skill to `core` as `dev-decision`, keeping the three-condition gate, the date-naming default and profile `decision_lifecycle`. It lands with a script check over profile `decisions_dir`: names follow `adr_naming`, every "superseded by" has its back-link, a record accepted at the merge-base is neither rewritten nor deleted, and under `log` no record reads `proposed`. One implementation note: the rename is breaking for the spec pack, so it lands with a release that says so.

### `dev-add-ci-gate` - one gate command, provably the same locally and in CI

**Problem.** The profile carries `verify` as "a single gate-runner command as the definition of done", and `dev-verification-gates` states that CI must run exactly what a developer runs. Nothing establishes that. The knob exists; whether the pipeline honours it is left to whoever wrote the pipeline, which is the drift the knob was invented to prevent.

**Shape.** A skill that wires the profile's `verify` command into the project's pipeline and reports what it changed. When `verify` is unset - the common case - it writes a gate table for core's runner (`skills/dev-run-tests/scripts/verify-runner.mjs`) from the profile's `typecheck` / `lint` / `test` keys and records the command, or stops with a named reason; it never writes a pipeline step that runs `none`. A pipeline step runs the runner with `--ci`; a gate whose runtime the step lacks, or that skips itself there, makes the run exit 3, and the owner either provides what the gate needs or accepts that step's exit 3 in the CI file. A gate this skill installs is done only when it was observed passing, then failing on a violation planted for the purpose, then passing again: a gate that never failed is not yet known to check anything.

### Decomposing a brief into an approvable batch

**Problem.** Autonomous mode's stated value is that the owner approves a batch of specs now and the machine works the queue later. Nothing in the pack produces a batch: `spec-pull` is one item, `spec-create` is one change. The queue is filled one owner-authored task at a time - the exact bottleneck the mode exists to remove.

**Shape.** A skill that turns one large brief or epic into several specs with declared blocking edges, so `spec-approve` has a batch to review in one sitting and `spec-execute-next` a real queue to drain. A downstream layer runs a version of it, and its shape answers both questions this entry left open. The output is one decomposition plan in the repository, approved once as a whole: each item one pull request, marked spec or direct by the project's own threshold, with a goal, a scope and a done-when at the brief's level and nothing below it. An existing item that already covers part of the work becomes an edge instead of a new item. Only after the approval are the items created - spec folders, or tracker items that `spec-pull` takes one at a time later. A blocking edge is one `Blocked by:` line per item, which `spec.mjs` reads and `spec-execute-next`'s ordering uses to skip an item whose blocker has not merged; a tracker's native dependency is mirrored only where the tracker has one.

**What blocks it.** The spec-folder variant, nothing. The tracker variant needs a `tracker_writes` kind for creating items and a tracker command that honours `dev-external-writes`.

### Rejected decisions and known defects - one registry

**Problem.** The pack records what to build (specs) and why an architecture was chosen (ADRs), but nowhere records what was deliberately **not** done, or what is known broken and deliberately not being fixed. The same idea re-enters intake every quarter and the arguments against it are reconstructed from scratch; the same known defect gets re-reported as new. Agents planning adjacent work cannot see that a neighboring option was already weighed and refused.

**Shape.** One registry covering both, since both answer the same question at intake - "has this already been decided?". One file per **concept**, not per ticket: the load-bearing reasons and an accumulating "asked again on" list. Intake (`spec-pull` / `spec-create`) checks it before planning - a match is a ready answer instead of a fresh deliberation. Two constraints to settle at design time: only deliberate non-decisions enter (an implemented feature recorded here would poison the check with false rejections), and the intake skills must be its named consumers so it does not become a third drifting registry. Settled as a folder, one file per concept - the decision, its durable reason and the "asked again on" list - which a community skill library now runs at scale. Intake matches by concept, not keyword, and the owner confirms a match. A deferral ("not now") is not a rejection and stays out. A defect waiting to be fixed is not a non-decision either: it stays where profile `defect_log` points, and only a defect deliberately left unfixed enters here, so the to-fix queue and the registry never hold the same claim. The folder's path is a profile key with a detection fallback, and `dev-deliver`'s interview is a third named reader, as the intake of a project on `core` alone.

### Per-step HITL/AFK marking

**Problem.** `execution_mode` is a session-level switch: the whole project is either `supervised` or `autonomous`. The real granularity is the work step. Inside one spec, some steps are safely unattended (write the migration, run the suite) and some cannot proceed without a human (confirm a data shape, pick between two readings of a requirement). A session-level mode forces a bad trade: supervised parks a human next to mechanical steps; autonomous lets the agent answer its own questions - which defeats the reason the question existed.

**Shape.** Each work step carries a marker: **AFK** (runs unattended; research and mechanical steps default here) or **HITL** (the run parks and puts the question in the three-part shape; decision forks default here). `spec-execute` reads the marker instead of a global mode: AFK steps run in batches without stopping, a HITL step ends the batch with the question. "Wait for the human" then falls out of the nature of the step, not out of a setting. `execution_mode` stays as the default for unmarked steps, so existing plans keep working.

`dev-deliver` settled the *outer* granularity - a run pauses at a phase boundary, and a question raised inside a phase ends that phase rather than parking inside it - which leaves this entry exactly the inner one: which work step within an execution phase may run unattended. The two compose without a second pause model: a HITL step ends the implement phase carrying its question to the boundary, where the owner already is.

Field evidence favours deferring over stopping. In a downstream layer, a scope change raised inside an unattended run is recorded as a numbered draft for the developer instead of asked; the run continues only with the steps the draft does not touch, and the drafts reach the developer in the end-of-run report. That let execution run from one yes to the pull request. A HITL step whose answer is missing can take the same route: the steps that do not depend on it run, and the question waits at the boundary.

Sequenced last: it extends the plan contract and `spec-execute` that 0.2.0 introduced, and the interface deserves a release of real use before it grows.

### Trimming the three heaviest skills, then budgets as failures

**Problem.** `dev-deliver`, `git-verify-pr` and `git-finalize-pr` are over the skill word budget, one paragraph is over its own, and the validator only warns, so a fix round can grow a file further with nothing to stop it. Field use shows exactly that: across eight review rounds on a downstream layer, fixers pushed files past their caps unnoticed.

**Shape.** Trim the three in a change of their own, moving procedure into each skill's `references/` and keeping in place every named section another artifact cites; in the change that makes the tree pass, turn the budget warnings into failures. The limits are the ones `scripts/validate-pack.sh` cites from the engine.

**What blocks it.** Only sequence: a release that adds to these skills cannot also trim them without mixing two changes.

### One file per defect, with a record template

**Problem.** Profile `defect_log` names the tracker, the roadmap, the specs area or a single file, but gives no record shape and no folder mode. A single file kept by several sessions loses its statuses and drifts in format; two downstream layers independently settled on one dated file per defect, and one of them wrote about forty in a week.

**Shape.** `defect_log: <dir>/`, a trailing slash meaning one file per defect, and a core template `dev-defect-record`: frontmatter for status, area, where it was found, what blocks it and when it was last verified; sections Symptom (what was observed, no interpretation), Reproduction (with its precondition) and Done when (the regression test that fails without the fix); a production verdict where the project has a deployed environment. The fixing change deletes the file, and its pull request links it. The registry of deliberate non-decisions above builds on the same record and stays a separate place.

**What blocks it.** Nothing; the open question is whether the folder becomes the default where `tracker_writes` lets nothing write to the tracker (Known defects in the packs, below).

### `app_stop` and `dev-setup-machine`

**Problem.** The profile has `app_run` and `app_url` but no way to stop what verification started, so a run leaves ports, devices or containers behind for the next checkout; and a new machine's setup - tool versions, credentials, the commit identity - is improvised per project. Two downstream layers built the same setup and run contract independently, on different stacks.

**Shape.** Profile `app_stop`, the pair of `app_run`, which `git-verify-pr` runs to stop what it started. One core skill, `dev-setup-machine`: a read-only inventory taken from the sources CI uses, one approval list showing size, place, environment variables and admin rights per row, secrets typed by the person into profile `secrets_file` and never passed through the agent, and proof by `app_run` plus one observation. Each checkout owns its runtime - ports, devices, test identities - and a shared daemon stops only when no other checkout uses it. Stack bodies (emulators, containers) stay in project layers or stack packs.

**What blocks it.** Nothing; `app_stop` is the first slice, the skill the second.

### `rollback_policy` - a declared forward-fix mode

**Problem.** `dev-rollback-safety` assumes a product with users on it. A pre-production project that never reverts, keeps no down migrations and removes a replaced mechanism in the same change has to override an always-on rule in a long paragraph, and every pre-production project writes the same one.

**Shape.** Profile `rollback_policy: reversible | forward-fix`, default `reversible`, which changes nothing. One sentence in `dev-rollback-safety`: under `forward-fix` - no live users and no external consumers - a pull request states no backout plan, expand-contract is not required, and a replaced path is removed in the same change. `git-create-release` and `spec-plan`'s Approach read the key. No general lifecycle key, which would become a second mode switch other rules key off.

**What blocks it.** Nothing.

### Risk level to required factors

**Problem.** `git-open-pr` computes a Risk value from profile `pr_risk_globs`, and nothing reads it: a high-risk change needs the same success factors as a typo fix, so a team that wants one more check on risky changes - a security scan, a human QA sign-off - writes its own merge rule.

**Shape.** An additive key beside `pr_success_factors` naming the factors a high-risk change needs as well, so the default stays one set. The gates compute Risk themselves from the head diff and never parse it from the editable body, which moves the computation out of `git-open-pr`'s prose into a small script both call. A review axis (architecture, security) is an extra factor, never a reviewer mode.

**What blocks it.** It changes the factor contract the merge guard and every gate downstream read, so it waits for a project with a non-pack factor to require; and Risk scanning, below, must first settle which Risk value is authoritative.

## Committed, unscheduled

### Constraints as machinery

**Problem.** Architecture is the one dimension the packs cover as judgment only. Rollback safety, boundary findings in review and expand-contract sequencing in plans all depend on an agent noticing; nothing establishes or checks dependency rules, module boundaries and contract placement in the host repository. It is the `docs/enforcement.md` argument - a prose invariant is a request - applied to architecture, where it currently has no answer at all.

**Shape.** Undecided, and larger than anything else on this list. The candidate direction is a skill that derives the project's real dependency graph, proposes the boundary rules it already obeys, and lands them as an executable check (lint rule, import boundary config, contract test) rather than as a paragraph. A community skill library now runs a three-part version: a periodic survey scoped to the hot spots of recent history, each chosen candidate routed into a spec or the defect log; per-stack setup skills that turn the boundaries into an executable check; and, for any check a skill installs, the completion criterion `dev-add-ci-gate` states - observed passing, then failing on a planted violation, then passing again. The per-stack setup skills belong in stack packs and wire into profile `verify`, never into `core`. Needs its own design pass before it can be scheduled.

### Eval harness for pack content

**Problem.** `validate-pack.sh` checks structure only. Whether an artifact still earns its place is a judgment call made by whoever happens to read it, and the pack grows monotonically because nothing ever proves a skill is now redundant - which is a live risk when a model generation ships and behavior that once needed instructing becomes default.

**Shape.** Each skill records what it exists to fix and a task that proves it; on a model release the tasks re-run, and a skill whose tasks pass without it is a retirement candidate. Converts "is this artifact stale" from a judgment call into a scheduled check. Promoted from "under consideration" because it is the only mechanism that can shrink the pack; still unscheduled because the task corpus is the expensive half.

The same harness answers a second question the validator cannot: whether following a skill produces the result it promises. The cases worth pinning are the ones whose failure is silent - a pull request whose verification section is empty must end `blocked (step)` and must not earn `ai:verified`; a factor whose report names an older head must be refused by the merge guard; a run that hits the round limit must escalate rather than continue. Sequenced deliberately after the label model has been executed end to end at least once: a suite written before the real failure modes are known pins the assumptions instead of the behavior, and assumptions that are wrong become assumptions that are enforced. Which harness is answered by one already running in a project that consumes these packs, with a case for `dev-review-changes` among its own. It has two tiers. The deterministic tier costs nothing and gates CI: it grades what scripts and checks compute, with no model. The live tier runs locally: each case runs the skill headless in an isolated worktree, several samples against a pass-rate threshold, on a pinned model, graded against ground truth a person wrote. `claude plugin eval` can drive the live tier without making the deterministic tier depend on any host.

A stage 0 comes before either corpus: a probe of checkable facts per skill, asked with and without the skill on the target models, ranks the candidates for shortening. Contract facts - formats, orderings, thresholds, file names - are expected to remain. Among the first live cases is the effort level of the two judging agents (`dev-code-reviewer`, `dev-qa-verifier`), which follows vendor guidance until a case measures it.

### Risk scanning - blocked on a decision, not on work

**Problem.** A skill that scans a change and labels it `risk:low|medium|high` has been proposed. `git-open-pr` already computes a Risk value deterministically from `pr_risk_globs` and writes it into the pull request body.

**What has to be settled first.** Two risk values for one change will disagree eventually, and whichever is read second wins by accident. Which one is authoritative - the deterministic glob match or the scan - decides whether the scan replaces that computation, feeds it, or is refused. Building either before that answer produces a second source for one claim, which is the defect this repository has had to fix three times. The pack's default pull request template no longer carries a hand-filled Risk section, so today the only Risk value is the glob match, written only under profile `pr_risk_size: on`.

### Linked work across repositories

**Problem.** A feature often needs a provider change in one repository and a consumer change in another, and nothing links the halves. The consumer can merge against a contract the provider renamed days earlier, and tracker numbers do not say which halves belong together.

**Shape.** A profile key listing the linked repositories, default none. A plan carries one `Linked:` line naming the other repository's item and pull request; a file in the other repository is cited at a commit and read through the forge, never edited; the provider's pull request merges first, and the consumer's ends at `ai:manual` naming what it waits for, the merge guard refusing while the linked provider is open. The `dev-rollback-safety` sentence on consumers that cannot be withdrawn is the law it rests on.

**What blocks it.** One linked change run end to end with the convention in a project layer first, so the pack encodes what held rather than what was designed.

### A forge and tracker adapter contract

**Problem.** Every forge step is written as a `gh` command and every tracker read assumes the forge's own tracker. Profile `cli` and `tracker_cli` exist, but no contract says what another forge's or tracker's command must answer, so a project on another forge hand-builds an adapter and re-derives the same quirks: markup that renders differently, token scopes, a forge with no pull request labels.

**Shape.** A read contract beside `dev-external-writes`: the subcommands the flow needs - the open pull request for a branch, its checks for one commit, its labels where the forge has them, its review threads and their resolved flag, a comment; a tracker item with its comments, parent and dependencies - each answering in one JSON shape and held to one contract test. Implementations for particular forges and trackers live in stack packs or the operator pack's forge contract, never in `core`.

**What blocks it.** A second project on the same forge or tracker. One project is one data point, so the Bitbucket and Asana adapters stay out until then.

## Recorded, not scheduled

Directions the field raised that this repository has weighed and deliberately not scheduled, each with what would move it.

- **Design, UX, support-feedback and delivery-metrics packs.** *Problem:* projects built design-system sync, rendered-UI review, end-user feedback loops and delivery metrics on their own. *Shape:* separate packs by adoption boundary, never in `core`. *What blocks it:* each is stack- or product-specific today; a second independent adopter of the same shape.
- **A pre-commit review stage.** *Problem:* a fixer cannot contest a Critical it shows unreachable without the owner. *Shape:* one more disposition in the review record (`unreachable` with its evidence), not a new stage. *What blocks it:* the review-record changes of this release need a release of use first.
- **Separate review lenses.** *Problem:* consistency with precedents and owed docs are judged only inside one review. *Shape:* two bullets on the existing spec axis of `dev-review-changes`, not four forked lenses. *What blocks it:* one strong default; a lens split costs a reviewer run per round.
- **Tracker write kinds.** *Problem:* `tracker_writes` knows only `scope-notes`. *Shape:* a list of kinds, each owned by one stage (questions, links, items, description). *What blocks it:* the adapter contract above.
- **A Contracts list in the plan.** *Problem:* a step that adds an interface states its contract nowhere checkable. *Shape:* one `Contracts:` list in the plan's Approach that steps cite and `spec-validate` checks. *What blocks it:* plans were shortened in 0.14.0; it needs evidence that it pays for its lines.
- **Evidence upload for verification.** *Problem:* screenshots have no store a report can link. *Shape:* an optional profile command that uploads images and prints a block to paste. *What blocks it:* one project and a hosted store; a second project first.
- **Interview questions in rounds.** *Problem:* asking one decision per message is slow when several are independent. *Shape:* every currently answerable decision in one round, a yes accepting each recommendation. *What blocks it:* it conflicts with `dev-working-with-people`'s one decision per message; an owner call.
- **Effort on inline skills.** *Problem:* a skill run inline cannot ask for a reasoning effort of its own. *Shape:* none today: an inline `effort:` changes the session's for the rest of the turn. *What blocks it:* a harness that scopes effort to a skill.
- **Stacked pull requests.** Not pursued in the packs: `git-workflow`'s branch from the integration branch is the default for every repository, and a project that needs stacked branches carries the exception in its own layer.
- **The reviewer's tier.** *Problem:* the routing convention in `CONTRIBUTING.md` puts `heavy` where the output is judgment no gate checks, and `dev-code-reviewer`'s verdict is the judgment `ai:reviewed` records and the merge guard trusts, with nothing re-checking it before the owner's accept; it runs on `standard`. *Shape:* `tier: heavy` on the reviewer. *What blocks it:* every review round, up to profile `max_pr_rounds`, would run on the heavier model, which is the owner's cost call; an eval case measuring review quality per tier would inform it.
- **A named worker agent for `dev-deliver`'s implement phase.** *Problem:* the phase's subagent runs on whatever the session spawns, with no tier or access of its own. *Shape:* one core agent the phase names, routed like the others. *What blocks it:* which tier the implementation work needs is a guess until an eval case measures it.
- **`spec-pull` finding a spec already planned on another branch.** *Problem:* intake looks for an existing spec only in the checked-out tree, so an item already planned on another branch gets a second folder. *Shape:* `spec-pull` searches local and remote branches for the item's spec before creating one. *What blocks it:* where a spec lives before execution is still open (Known defects in the packs, below).
- **`spec-answer` under explicit approval.** *Problem:* a structural answer removes the approval line under profile `approval: explicit`, and the changed plan then has to reach the approver's machine, which nothing says. *Shape:* the answer is committed and pushed on the spec's branch, as `spec-approve` commits its line. *What blocks it:* a release of use of the explicit-approval path first.
- **A forked judge started from inside a subagent.** *Problem:* `dev-deliver` runs `git-finalize-pr` inside a phase subagent, which starts the forked judging skills, and whether such a judge still runs isolated there is unverified. *Shape:* one experiment in a scratch repository before any text changes. *What blocks it:* nothing but running it.
- **Pack-level `references/` outside the rendered tools.** *Problem:* the engine renders rules, agents and skills only, so `git-pr-labels` and `dev-external-writes` are reachable only at the installed package path, and a plain copy or a global skills install carries them only when copied by hand. *Shape:* the engine renders a package's references, or the pages move into the skills that cite them. *What blocks it:* an engine change.

## Known defects in the packs

Defects found in the pack text and not fixed in the release that found them, each kept here until a change fixes it (`dev-context-engineering`).

### The continuous changelog has no executor

**Problem.** With profile `changelog: continuous`, `git-create-release` assumes every pull request already appended its line under `## [Unreleased]` "at commit time / `git-commit-push`", and `git-commit-push` never touches the changelog. Nothing writes the line, so a release promotes an empty or hand-written section.

**Shape.** One stage owns the line - `git-open-pr`, which already writes the body the line summarises, or `git-commit-push` - and `git-create-release` names that stage.

**What blocks it.** Choosing the stage.

### Spec writes after planning have no place to land on the protected base

**Problem.** `git-merge-pr` switches to the base and then hands to `spec-close`, which writes `status: completed` in autonomous mode and may update docs, with nothing able to commit them there, so the next run finds a dirty base. The same holds before execution: in autonomous mode `spec-approve` writes `status: approved` into a spec `spec-execute-next` reads from the base, while that skill's preflight halts on the uncommitted write.

**Shape.** A spec's post-planning writes land in a commit that reaches the base: the spec's own pull request before merge where the state is known then, or profile `direct_lane` for the spec area.

**What blocks it.** The owner's choice of where a spec lives before execution and after merge.

### `defect_log: auto` has no writer

**Problem.** `auto` means the tracker unless `tracker` is none, but `tracker_writes` defaults to `none` and no skill writes a defect record to a tracker, so the default destination of every recorded defect is one nothing can write.

**Shape.** The default resolves to a place the pack can write; one file per defect (above) is the candidate.

**What blocks it.** One file per defect.

### Skills do not follow the Windows host note on credential prompts

**Problem.** `dev-init`'s Windows host note says every git command that reaches a remote runs with `GIT_TERMINAL_PROMPT=0`, so it fails instead of waiting on a prompt nobody sees; only the push guard does. Every skill's `git fetch`, `git pull` and `git push` can still wait forever.

**Shape.** Either the remote git commands the skills name carry the variable, or the note narrows its claim to the bundled scripts and `dev-init` reports a host where git would prompt.

**What blocks it.** Choosing between the two.

### Two queue pickers disagree

**Problem.** `dev-deliver-next` reserves an item with a draft pull request before working on it and gates conflicts by files and feature; `spec-execute-next` reserves nothing and gates by files alone. Two pickers on one queue can take the same item.

**Shape.** One reservation and one conflict gate, defined once and cited by both.

**What blocks it.** Nothing but the work; both pickers already reset through `git-to-base`.

### The review verdict is derived twice

**Problem.** `CLEAN`, `PASS-WITH-WARNINGS` and `BLOCK` are derived from finding counts in `dev-review-changes` and from the Unresolved list in `git-review-pr`, and neither names the other as the definition.

**Shape.** One definition site, the other citing it.

**What blocks it.** Nothing but the work.

### The push guard cannot detect the branches behind a remote given as a URL

**Problem.** Without a profile, `guard-push.mjs` reads the default and integration branches from the pushed remote's tracking refs. A push that names a URL no configured remote carries has no such refs, so the guard falls back to `main` and lets a push to any other default branch through.

**Shape.** When the pushed remote is not a configured one, detect through `origin`, with a test for a repository whose default branch is not `main`.

**What blocks it.** Nothing but the work.

### `git-review-pr` cites "step 4" for the body digest, and two steps carry that number

**Problem.** `git-review-pr` Pre-flight step 2 points at the body digest as "(step 4)". Pre-flight now has its own step 4, the reviewed head, while the digest is defined in Steps step 4, so a forked reviewer can follow the wrong one.

**Shape.** The reference names its section, `Steps` step 4, or the digest's definition site in `git-verify-pr` > Digests.

**What blocks it.** Nothing but the work.

### This repository's own decision record is still proposed

`docs/decisions/261107-intake-copies-tracker-text-verbatim.md` reads `proposed` and is contradicted by `spec-pull` as it ships; accepting or rejecting it is the owner's, through `spec-decision`.

## Distribution - resolved, with one supplementary channel still open

**The mechanism question is answered.** The packs ship as versioned Intelligence Packages, installed with the [Intelligence CLI](https://github.com/ainova-systems/intelligence) from a registry this repository publishes as `index.yaml`. That meets what this entry required of any candidate - one source tree with no forked content, the sync path still working for teams that had it, and a version the installer can pin - and it clears the constraint that decided the question: **rules travel**, which no plugin format offered.

The condition this entry attached to whichever mechanism won - that `validate-pack.sh` gain the manifest-versus-folders check in the same change that introduces a manifest - was missed by one PR: the index landed first, the check followed. It is in place before the release that first ships the index, and it fails in both directions (a pack absent from the index, an index entry pointing nowhere).

**Still open: a plugin-format channel** for people who want the skills in one repository without adopting a CLI. [Agent Plugins 1.0.0](https://agent-plugins.org/) is vendor-neutral (`plugin.json`, `skills/<name>/SKILL.md`, MCP in `mcp.json`) but defines *exactly* skills and MCP servers - agents, hooks and rules are outside v1, and it says nothing about distribution. Claude Code's own plugin layout reaches further (`agents/`, `hooks/hooks.json`, `settings.json`) with marketplaces as the delivery path, at the cost of being one client. Either is supplementary rather than a replacement, since the CLI remains the only channel that carries always-on rules.

Two things to settle before building one: whether the plugin manifest is generated from the pack folders or hand-maintained - generated, or it becomes a second place the inventory is written and the two drift - and whether the enforcement layer ships with it, because a mechanism that can deliver `hooks` and `settings.json` turns `docs/enforcement.md` from instructions into an install.
