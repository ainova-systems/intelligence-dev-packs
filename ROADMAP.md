# Roadmap

Planned improvements, in intended order. Each entry states the problem it exists to fix, so a future session (or contributor) can pick one up without re-deriving the reasoning. The list evolves; shipped entries move to the CHANGELOG.

## 0.5.0 candidates

### The red loop - one reference, then `dev-diagnose`, then `dev-add-tests`

**Problem.** An agent's default debugging behavior is to read code and build a theory, then "fix" the theory. Without a reproduction there is no way to tell a real fix from a plausible one, and the fix-didn't-help-fix-again loop burns tokens with no measurable progress. The same gap sits on the other side of the gate: `spec-execute` requires every slice to ship "code plus its test", and nothing in the pack says how a test comes to exist before the code it tests.

**Shape.** Three artifacts, one shared definition, in this order:

1. **A reference defining the *red* loop** - what it means for a loop to go red, and a ranked ladder of ways to build one (failing test, curl against a running service, CLI plus snapshot, headless browser, replaying a captured trace, a throwaway harness, property-based test, bisection), plus tagged debug instrumentation (`[DEBUG-<id>]`) so cleanup is one grep.
2. **`dev-diagnose`** - bug diagnosis behind a hard gate that outranks everything else: before reading code, a reproduction command must exist and have been run at least once, and the phase's completion criterion is the pasted command plus its actual output. After the fix, the same command going green is the proof. This is the pack's artifact-derived-status discipline applied to debugging: "I understand the bug" does not count; the red loop does.
3. **`dev-add-tests`** - the red-green loop for new behavior, pointing at the same reference rather than redefining *red*.

The reference comes first precisely so the pack's strongest new word is defined once. Open at design time: how prescriptive the loop should be - the pack requires one strong default rather than a menu, and this is opinionated enough that the default is an owner call.

### `dev-decision` - decision records for a project on `core` alone

**Problem.** `dev-context-engineering` is a `core` rule, always on, and it requires that "significant decisions get a decision record with explicit status". The only skill that writes one is `spec-decision`, which ships in the `spec` pack. A project that installs `core` alone - the majority case, since `spec` is opt-in - carries the requirement with nothing to execute it, which is the pack's own "a procedure inside a rule has no name a plan can call" failure.

**Shape.** Move the skill to `core` as `dev-decision`, keeping the three-condition gate and the date-naming default. Two implementation notes: the skill currently binds `agent: spec-docs-writer`, an agent that does not exist in a `core`-only install, so the binding has to go or be replaced; and the rename is breaking for the spec pack, so it lands with a release that says so.

### `dev-add-ci-gate` - one gate command, provably the same locally and in CI

**Problem.** The profile carries `verify` as "a single gate-runner command as the definition of done", and `dev-verification-gates` states that CI must run exactly what a developer runs. Nothing establishes that. The knob exists; whether the pipeline honours it is left to whoever wrote the pipeline, which is the drift the knob was invented to prevent.

**Shape.** A skill that wires the profile's `verify` command into the project's pipeline and reports what it changed. When `verify` is unset - the common case - it composes one from the profile's `typecheck` / `lint` / `test` keys and records it, or stops with a named reason; it never writes a pipeline step that runs `none`.

### Decomposing a brief into an approvable batch

**Problem.** Autonomous mode's stated value is that the owner approves a batch of specs now and the machine works the queue later. Nothing in the pack produces a batch: `spec-pull` is one item, `spec-create` is one change. The queue is filled one owner-authored task at a time - the exact bottleneck the mode exists to remove.

**Shape.** A skill that turns one large brief or epic into several specs with declared blocking edges, so `spec-approve` has a batch to review in one sitting and `spec-execute-next` a real queue to drain. Two design decisions come before any build: whether the output is N spec folders written straight away or a proposed decomposition the owner converts one at a time, and how blocking edges are expressed so `spec-execute-next`'s existing value ordering can read them.

### The change-flow map

**Problem.** After install, nothing in the host project states the order in which its skills are meant to be used. The flow tables live in this repository's README, which no install path delivers - the package store holds each pack's own subtree, not the repository root.

**Shape.** A skill that generates one numbered walk - work item → spec → implementation → review → acceptance → merge - each step naming the skill that performs it, written against what is *actually installed* in that project rather than against a static list. Two constraints, both load-bearing: it is generated and regenerated, never hand-maintained (a map maintained by hand is the second place the chains are written, and the two drift), and it names its consumer, or it fails the pack's own no-consumer-no-doc gate.

### Rejected decisions and known defects - one registry

**Problem.** The pack records what to build (specs) and why an architecture was chosen (ADRs), but nowhere records what was deliberately **not** done, or what is known broken and deliberately not being fixed. The same idea re-enters intake every quarter and the arguments against it are reconstructed from scratch; the same known defect gets re-reported as new. Agents planning adjacent work cannot see that a neighboring option was already weighed and refused.

**Shape.** One registry covering both, since both answer the same question at intake - "has this already been decided?". One file per **concept**, not per ticket: the load-bearing reasons and an accumulating "asked again on" list. Intake (`spec-pull` / `spec-create`) checks it before planning - a match is a ready answer instead of a fresh deliberation. Two constraints to settle at design time: only deliberate non-decisions enter (an implemented feature recorded here would poison the check with false rejections), and the intake skills must be its named consumers so it does not become a third drifting registry. Whether it lives as a folder or as ADRs with a `rejected` status is the open design question.

### Per-step HITL/AFK marking

**Problem.** `execution_mode` is a session-level switch: the whole project is either `supervised` or `autonomous`. The real granularity is the work step. Inside one spec, some steps are safely unattended (write the migration, run the suite) and some cannot proceed without a human (confirm a data shape, pick between two readings of a requirement). A session-level mode forces a bad trade: supervised parks a human next to mechanical steps; autonomous lets the agent answer its own questions - which defeats the reason the question existed.

**Shape.** Each work step carries a marker: **AFK** (runs unattended; research and mechanical steps default here) or **HITL** (the run parks and puts the question in the three-part shape; decision forks default here). `spec-execute` reads the marker instead of a global mode: AFK steps run in batches without stopping, a HITL step ends the batch with the question. "Wait for the human" then falls out of the nature of the step, not out of a setting. `execution_mode` stays as the default for unmarked steps, so existing plans keep working.

Sequenced last: it extends the plan contract and `spec-execute` that 0.2.0 introduced, and the interface deserves a release of real use before it grows.

## Committed, unscheduled

### Constraints as machinery

**Problem.** Architecture is the one dimension the packs cover as judgment only. Rollback safety, boundary findings in review and expand-contract sequencing in plans all depend on an agent noticing; nothing establishes or checks dependency rules, module boundaries and contract placement in the host repository. It is the `docs/enforcement.md` argument - a prose invariant is a request - applied to architecture, where it currently has no answer at all.

**Shape.** Undecided, and larger than anything else on this list. The candidate direction is a skill that derives the project's real dependency graph, proposes the boundary rules it already obeys, and lands them as an executable check (lint rule, import boundary config, contract test) rather than as a paragraph. Needs its own design pass before it can be scheduled.

### Eval harness for pack content

**Problem.** `validate-pack.sh` checks structure only. Whether an artifact still earns its place is a judgment call made by whoever happens to read it, and the pack grows monotonically because nothing ever proves a skill is now redundant - which is a live risk when a model generation ships and behavior that once needed instructing becomes default.

**Shape.** Each skill records what it exists to fix and a task that proves it; on a model release the tasks re-run, and a skill whose tasks pass without it is a retirement candidate. Converts "is this artifact stale" from a judgment call into a scheduled check. Promoted from "under consideration" because it is the only mechanism that can shrink the pack; still unscheduled because the task corpus is the expensive half.

## Distribution - resolved, with one supplementary channel still open

**The mechanism question is answered.** The packs ship as versioned Intelligence Packages, installed with the [Intelligence CLI](https://github.com/ainova-systems/intelligence) from a registry this repository publishes as `index.yaml`. That meets what this entry required of any candidate - one source tree with no forked content, the sync path still working for teams that had it, and a version the installer can pin - and it clears the constraint that decided the question: **rules travel**, which no plugin format offered.

The condition this entry attached to whichever mechanism won - that `validate-pack.sh` gain the manifest-versus-folders check in the same change that introduces a manifest - was missed by one PR: the index landed first, the check followed. It is in place before the release that first ships the index, and it fails in both directions (a pack absent from the index, an index entry pointing nowhere).

**Still open: a plugin-format channel** for people who want the skills in one repository without adopting a CLI. [Agent Plugins 1.0.0](https://agent-plugins.org/) is vendor-neutral (`plugin.json`, `skills/<name>/SKILL.md`, MCP in `mcp.json`) but defines *exactly* skills and MCP servers - agents, hooks and rules are outside v1, and it says nothing about distribution. Claude Code's own plugin layout reaches further (`agents/`, `hooks/hooks.json`, `settings.json`) with marketplaces as the delivery path, at the cost of being one client. Either is supplementary rather than a replacement, since the CLI remains the only channel that carries always-on rules.

Two things to settle before building one: whether the plugin manifest is generated from the pack folders or hand-maintained - generated, or it becomes a second place the inventory is written and the two drift - and whether the enforcement layer ships with it, because a mechanism that can deliver `hooks` and `settings.json` turns `docs/enforcement.md` from instructions into an install.

**Unblocked by the above: a `dev-init` setup skill.** It was held because a skill was itself one of the candidate mechanisms, so building it would have prejudged the open question. The question is settled, so the entry now stands on its own merits, and has to answer one thing first: what per-repo setup actually remains once `intelligence init` and the profile prompt have run, and whether that residue is large enough to earn a skill.
