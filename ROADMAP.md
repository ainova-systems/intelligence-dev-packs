# Roadmap

Planned improvements, in intended order. Each entry states the problem it exists to fix, so a future session (or contributor) can pick one up without re-deriving the reasoning. The list evolves; shipped entries move to the CHANGELOG.

## 0.3.0 candidates

### `dev-diagnose` - bug diagnosis behind a reproduction gate

**Problem.** An agent's default debugging behavior is to read code and build a theory, then "fix" the theory. Without a reproduction there is no way to tell a real fix from a plausible one, and the fix-didn't-help-fix-again loop burns tokens with no measurable progress.

**Shape.** A core-pack skill whose first phase is a hard gate that outranks everything else: before reading code, a **reproduction command must exist and have been run at least once** - the phase's completion criterion is the pasted command plus its actual output, and the command must be able to go red (shows the bug), deterministic, fast, and runnable by the agent alone. After the fix, the same command going green is the proof. This is the pack's artifact-derived-status discipline applied to debugging: "I understand the bug" does not count; the red loop does.

Ships with a reference file: a ranked ladder of ways to build the loop (failing test, curl against a running service, CLI plus snapshot, headless browser, replaying a captured trace, a throwaway harness, property-based test, bisection), plus tagged debug instrumentation (`[DEBUG-<id>]`) so cleanup is one grep.

### Rejected-decisions registry

**Problem.** The pack records what to build (specs) and why an architecture was chosen (ADRs), but nowhere records what was deliberately **not** done. The same idea re-enters intake every quarter - a new developer, a new agent session, or the owner three months later proposes it again, and the arguments against are reconstructed from scratch. Agents planning adjacent work cannot see that a neighboring option was already weighed and refused.

**Shape.** One file per rejected **concept** (not per ticket): a short design note with the load-bearing reasons and an accumulating "asked again on" list. Intake (`spec-pull` / `spec-create`) checks it before planning - a match is a ready answer instead of a new deliberation cycle. Two constraints to settle at design time: only rejected ideas enter (an already-implemented feature recorded here would poison the dedup check with false rejections), and the mechanism must not become a third drifting registry - it has to pass the pack's own no-consumer-no-doc gate, so the intake skills are its named consumers. Whether it lives as a folder (`docs/out-of-scope/`) or as ADRs with a `rejected` status is the open design question.

### Per-step HITL/AFK marking

**Problem.** `execution_mode` is currently a session-level switch: the whole project is either `supervised` or `autonomous`. The real granularity is the work step. Inside one spec, some steps are safely unattended (write the migration, run the suite) and some cannot proceed without a human (confirm a data shape, pick between two readings of a requirement). A session-level mode forces a bad trade: supervised parks a human next to mechanical steps; autonomous lets the agent answer its own questions - which defeats the reason the question existed.

**Shape.** Each work step in the plan carries a marker: **AFK** (away-from-keyboard - runs unattended; research and mechanical steps default here) or **HITL** (human-in-the-loop - the run parks and puts the question in the three-part shape; decision forks default here). `spec-execute` reads the marker instead of a global mode: AFK steps run in batches without stopping, a HITL step ends the batch with the question. "Wait for the human" then falls out of the nature of the step, not out of a setting. `execution_mode` stays as the default for unmarked steps, so existing plans keep working.

Sequenced last of the three: it extends the plan contract and `spec-execute` that 0.2.0 just introduced, and the interface deserves one release of real use before it grows.

## Under consideration

- **Eval harness for pack content.** `validate-pack.sh` checks structure only. The bar worth reaching: each skill records what it exists to fix and a task that proves it; on a model release the tasks re-run, and a skill whose tasks pass without it is a retirement candidate. Converts "is this artifact stale" from a judgment call into a scheduled check.
