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

**Shape.** Move the skill to `core` as `dev-decision`, keeping the three-condition gate, the date-naming default and profile `decision_lifecycle`. The rename is breaking for the spec pack, so it lands with a release that says so.

### Epic planning - one approved plan that cuts an epic into specs

**Problem.** An initiative too large for one pull request has to be cut into pieces before any spec is planned, and nothing in the pack does the cut: `spec-pull` takes one item, `spec-create` one change. The owner splits the epic by hand, decides which piece waits for which, and approves each spec on its own.

**Shape.** A `spec` skill one level above a spec, which a downstream layer runs today. The epic gets a folder of its own holding its intent, pulled verbatim from the tracker, and the plan written beside it on the epic's branch; running the skill again replans. The plan lists the tasks, each one item one person picks up and one pull request delivers, marked spec or direct by the project's `spec-discipline` threshold, with a `depends on:` edge to an earlier task or to an existing item it builds on. A task the epic already has stays as a ticked line linked to its item, and work another item already covers becomes an edge, never a second task. Each task carries a draft at the epic's level - goal, scope in and out, done when - and nothing a spec plans. An epic whose title is generic and whose tasks are unrelated is a bucket, and the skill asks before planning it. The plan is done only when no task in it can be split into two independent ones; a task that can goes back into the cut. A fresh reviewer validates it, the owner approves it once as a whole, and only then are the tasks created: after a summary, a dry run and one yes, as tracker items that `spec-pull` takes one at a time, or as spec folders where the project has no tracker. `spec.mjs` reads the edges, and `spec-execute-next` skips a task whose blocker has not merged.

**What blocks it.** The tracker path needs a `tracker_writes` kind for creating items and a tracker command that honours `dev-external-writes` (Tracker write kinds, below); the spec-folder path, nothing.

### One file per defect, with a record template

**Problem.** Profile `defect_log` names the tracker, the roadmap, the specs area or a single file, but gives no record shape and no folder mode. A single file kept by several sessions loses its statuses and drifts in format; two downstream layers independently settled on one dated file per defect, and one of them wrote about forty in a week.

**Shape.** `defect_log: <dir>/`, a trailing slash meaning one file per defect, and a core template `dev-defect-record`: frontmatter for status, area, where it was found, what blocks it and when it was last verified; sections Symptom (what was observed, no interpretation), Reproduction (with its precondition) and Done when (the regression test that fails without the fix); a production verdict where the project has a deployed environment. The fixing change deletes the file, and its pull request links it. A defect that exists and cannot be fixed stays in the same folder as `status: wontfix` with its reason, so the next session sees it instead of reporting it again; a second registry would hold the same claim twice. The folder is never always-on: planning and intake read the records whose `area:` or paths match the change, the titles first and a whole record only on a match, so the context carries the few that bear on the work and not the log.

**What blocks it.** Nothing; the open question is whether the folder becomes the default where `tracker_writes` lets nothing write to the tracker (Known defects in the packs, below).

### `app_stop` and `dev-setup-machine`

**Problem.** The profile has `app_run` and `app_url` but no way to stop what verification started, so a run leaves ports, devices or containers behind. The next round then finds the old build still answering on `app_url` - a `docker compose up -d` that reports everything up to date rebuilds nothing - and verifies a commit that is no longer the head, and parallel checkouts fight over one port. A new machine's setup - tool versions, credentials, the commit identity - is improvised per project. Two downstream layers built the same setup and run contract independently, on different stacks.

**Shape.** `git-verify-pr` stops what it started: a process it spawned it ends itself, with no key. Profile `app_stop`, the pair of `app_run`, is for what outlives the command that started it - detached containers, emulators, background services - and the stage runs it before bringing the change up and again when it is done. One core skill, `dev-setup-machine`: a read-only inventory taken from the sources CI uses, one approval list showing size, place, environment variables and admin rights per row, secrets typed by the person into profile `secrets_file` and never passed through the agent, and proof by `app_run` plus one observation. Each checkout owns its runtime - ports, devices, test identities - and a shared daemon stops only when no other checkout uses it. Stack bodies (emulators, containers) stay in project layers or stack packs.

**What blocks it.** Nothing; `app_stop` is the first slice, the skill the second.

### `rollback_policy` - a declared forward-fix mode

**Problem.** `dev-rollback-safety` assumes a failure is restored by reverting: down migrations, a backout plan, a flag to switch off. A project that restores by shipping the fix - before release, and after it too - keeps none of that, and has to override an always-on rule in a long paragraph that every such project writes again.

**Shape.** Profile `rollback_policy: reversible | forward-fix`, default `reversible`, which changes nothing. One sentence in `dev-rollback-safety`: under `forward-fix` a migration needs no down path, a pull request states how a failure would be fixed forward instead of a backout plan, and a replaced path inside the project is removed in the same change. Two things hold under either value, because no forward fix brings them back: data a change deletes or transforms irreversibly has a stated restore, and a contract whose consumers cannot be withdrawn stays backward compatible. `git-create-release` and `spec-plan`'s Approach read the key. No general lifecycle key, which would become a second mode switch other rules key off.

**What blocks it.** Nothing.

### Risk and Size as pull request labels

**Problem.** Risk and Size are what an owner reads first to judge how much review and acceptance a change needs, and the next step is a policy on them: a low-risk change of small or medium size is accepted on the agent's review, everything else is marked for a person. Today they exist only as a line `git-open-pr` writes into the body under `pr_risk_size: on`, so a pipeline or an operator workflow that filters on them has to parse editable prose, and nothing reads them at all.

**Shape.** `git-open-pr` computes both deterministically - Risk from `pr_risk_globs`, Size from the diff - in a small script, and writes them as labels (`risk:low|medium|high`, `size:small|medium|large`) that pipelines and operator workflows filter on. A gate that acts on them - an acceptance policy, extra factors for a high-risk change - recomputes from the head diff through the same script and never trusts the label, since anyone with triage access can change one.

**What has to be settled first.** Label only, or label plus the body line, and then the check that keeps the two equal; that a push changes the diff, so the labels are recomputed on every new head like any factor's freshness; the label names and the size thresholds; and which value is authoritative against a scan (Risk scanning, below) - the deterministic computation, or a scan feeding it. Proper planning, not a slice.

## Committed, unscheduled

### Constraints as machinery

**Problem.** Architecture is the one dimension the packs cover as judgment only. Rollback safety, boundary findings in review and expand-contract sequencing in plans all depend on an agent noticing; nothing establishes or checks dependency rules, module boundaries and contract placement in the host repository. It is the `docs/enforcement.md` argument - a prose invariant is a request - applied to architecture, where it currently has no answer at all.

**Shape.** Undecided, and larger than anything else on this list. The candidate direction is a skill that derives the project's real dependency graph, proposes the boundary rules it already obeys, and lands them as an executable check (lint rule, import boundary config, contract test) rather than as a paragraph. A community skill library now runs a three-part version: a periodic survey scoped to the hot spots of recent history, each chosen candidate routed into a spec or the defect log; per-stack setup skills that turn the boundaries into an executable check; and, for any check a skill installs, one completion criterion: observed passing, then failing on a violation planted for the purpose, then passing again, since a check that never failed is not yet known to check anything. The per-stack setup skills belong in stack packs and wire into profile `verify`, never into `core`. Needs its own design pass before it can be scheduled.

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
- **Tracker write kinds.** *Problem:* `tracker_writes` knows only `scope-notes`. *Shape:* a list of kinds, each owned by one stage (questions, links, items, description). *What blocks it:* the adapter contract above; epic planning's tracker path waits on the `items` kind.
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

**What blocks it.** Nothing but the work; both pickers already reset through `git-sync-base`.

### The review verdict is derived twice

**Problem.** `CLEAN`, `PASS-WITH-WARNINGS` and `BLOCK` are derived from finding counts in `dev-review-changes` and from the Unresolved list in `git-review-pr`, and neither names the other as the definition.

**Shape.** One definition site, the other citing it.

**What blocks it.** Nothing but the work.

### The push guard cannot detect the branches behind a remote given as a URL

**Problem.** Without a profile, `guard-push.mjs` reads the default and integration branches from the pushed remote's tracking refs. A push that names a URL no configured remote carries has no such refs, so the guard falls back to `main` and lets a push to any other default branch through.

**Shape.** When the pushed remote is not a configured one, detect through `origin`, with a test for a repository whose default branch is not `main`.

**What blocks it.** Nothing but the work.

### This repository's own decision record is still proposed

`docs/decisions/261107-intake-copies-tracker-text-verbatim.md` reads `proposed` and is contradicted by `spec-pull` as it ships; accepting or rejecting it is the owner's, through `spec-decision`.

## Distribution - resolved, with one supplementary channel still open

**The mechanism question is answered.** The packs ship as versioned Intelligence Packages, installed with the [Intelligence CLI](https://github.com/ainova-systems/intelligence) from a registry this repository publishes as `index.yaml`. That meets what this entry required of any candidate - one source tree with no forked content, the sync path still working for teams that had it, and a version the installer can pin - and it clears the constraint that decided the question: **rules travel**, which no plugin format offered.

The condition this entry attached to whichever mechanism won - that `validate-pack.sh` gain the manifest-versus-folders check in the same change that introduces a manifest - was missed by one PR: the index landed first, the check followed. It is in place before the release that first ships the index, and it fails in both directions (a pack absent from the index, an index entry pointing nowhere).

**Still open: a plugin-format channel** for people who want the skills in one repository without adopting a CLI. [Agent Plugins 1.0.0](https://agent-plugins.org/) is vendor-neutral (`plugin.json`, `skills/<name>/SKILL.md`, MCP in `mcp.json`) but defines *exactly* skills and MCP servers - agents, hooks and rules are outside v1, and it says nothing about distribution. Claude Code's own plugin layout reaches further (`agents/`, `hooks/hooks.json`, `settings.json`) with marketplaces as the delivery path, at the cost of being one client. Either is supplementary rather than a replacement, since the CLI remains the only channel that carries always-on rules.

Two things to settle before building one: whether the plugin manifest is generated from the pack folders or hand-maintained - generated, or it becomes a second place the inventory is written and the two drift - and whether the enforcement layer ships with it, because a mechanism that can deliver `hooks` and `settings.json` turns `docs/enforcement.md` from instructions into an install.
