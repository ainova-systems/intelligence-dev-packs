# intelligence-dev-packs

Shared AI-first engineering practices, packaged as portable rules, agents, and skills. Author the workflow once, reuse it in every repository, and let both your team and your AI coding agents read the same source.

Built and maintained by [Ainova Systems](https://www.ainovasystems.com). Extracted from running multiple AI-coded enterprise systems in daily production, where AI writes the majority of the code.

## Packs and domains

Two decoupled ideas (see [`packs/README.md`](packs/README.md)):

- A **pack** is what you install together. A **domain prefix** (`dev-`/`git-`/`spec-`) is the namespace on each artifact.

| Pack | Domains | Scope | Depends on |
|---|---|---|---|
| **core** | `dev-`, `git-` | Universal - engineering discipline, session hygiene, git/PR/release. Install everywhere. | - |
| **spec** | `spec-` | Opt-in - spec-driven development. Not every project adopts it, so it ships separately. | core |

## The owner flow (spec pack)

When a project adopts spec-driven development, the flow runs in one of two execution modes (profile `execution_mode`).

**Supervised (default)** - the developer stays in the loop. Intake pulls a tracker item into a spec (`spec-pull`, read-only against the tracker) or captures a taskless brief (`spec-create`). The plan opens with a requirements-coverage table - every requirement maps to the step that delivers it or to the open question that blocks it - and an open question blocks execution, never planning (`spec-answer` resolves them; `spec-validate` fact-checks the plan against the repo first). Status is read from the artifacts, never written: a plan with no open question is the approval, no approve ceremony. `spec-execute` runs the plan via parallel subagents and **ends with changes left uncommitted on the feature branch** - the developer reviews the diff and runs the git flow (`git-commit-push` -> `git-open-pr` -> `git-merge-pr`) himself.

**Autonomous** - the owner touches the work at three gates, and everything between runs unattended.

| Step | Who | Skill |
|---|---|---|
| 1. State the task | **Owner** | - |
| 2. Spec written (requirements + plan) | AI | `spec-pull` / `spec-create` |
| 3. **Gate 1 - review and approve the spec** | **Owner** | `spec-approve` |
| 4. Implementation: branch, parallel subagents, tests, milestone commits | AI | `spec-execute` |
| 5. PR opened, CI driven to green, review comments handled, outcome label | AI | `git-finalize-pr` |
| 6. **Gate 2 - accept the PR** | **Owner** | - |
| 7. Squash-merge, close the spec, cleanup | AI | `git-merge-pr` -> `spec-close` |

In autonomous mode `spec-approve` fills a queue the owner reviewed once, and `spec-execute-next` drains it - it picks the highest-value `approved` spec (or finishes an in-progress one), drives it to an outcome-labeled PR, closes any merged spec, and resets the workspace. Suitable for scheduled and looped runs. Every autonomous run ends with exactly one outcome label: `ai:ready-to-merge`, `ai:manual`, or `ai:failed`.

In both modes `spec-cancel` retires a dropped or superseded spec with a recorded reason (in supervised mode, the one status the pipeline ever writes), and every transition keeps the docs substrate (feature docs, rules, model, glossary) in sync automatically - nothing is updated by hand.

Before the first spec, `spec-init` is a one-time bootstrap: it scaffolds the in-repo docs substrate (domain model, glossary, rules-as-contracts, feature baselines, decisions, the `specs/` tree) and safely migrates existing documentation into it, drafting from code for owner review. It learns and adopts a project's existing docs structure rather than imposing one.

A project that has not adopted spec-driven development still uses the `core` pack on its own: the git/PR/review/release skills and the engineering-discipline rules work standalone.

## core pack

### `dev-` domain - engineering discipline and session hygiene

| Artifact | Kind | Role |
|---|---|---|
| `dev-skill-first` | rule | Check the skill catalog before improvising a workflow |
| `dev-context-engineering` | rule | Conventions, decisions, and domain knowledge live in the repo |
| `dev-verification-gates` | rule | Typecheck, lint, tests pass before every commit; gates never weakened |
| `dev-rollback-safety` | rule | Reversible migrations, feature flags, expand-contract sequencing |
| `dev-code-reviewer` | agent | Reviews changes for correctness, conventions, tests, security (read-only) |
| `dev-test-engineer` | agent | Test strategy and coverage across all levels |
| `dev-run-tests` | skill | Typecheck, lint, tests with scope detection and failure analysis |
| `dev-review-changes` | skill | Read-only diff review with severity verdict |
| `dev-handoff` | skill | Self-contained continuation prompt for a fresh session |

### `git-` domain - git / PR / release

| Artifact | Kind | Role |
|---|---|---|
| `git-commit-conventions` | rule | Commit message format, push discipline, forbidden trailers |
| `git-workflow` | rule | Branch model, protected branches, feature-branch flow |
| `git-commit-push` | skill | Verified milestone commit and fast-forward push |
| `git-open-pr` | skill | Open a PR for the branch, using the repo template and profile knobs |
| `git-resolve-conflicts` | skill | Semantic conflict resolution, full gates after |
| `git-review-pr-comments` | skill | Triage reviewer feedback: fix, discuss, or decline with reason |
| `git-finalize-pr` | skill | CI to green plus every review comment handled - PR ready to merge |
| `git-merge-pr` | skill | After owner accept: guard-checked squash-merge, base sync, cleanup (owner-invoked only) |
| `git-create-release` | skill | Version, changelog, tag per the project's release flow (owner-invoked only) |
| `git-scan-secrets` | skill | Credential scan over diff, tree, or history |

## spec pack

Domain **`spec-`**. Depends on `core`.

| Artifact | Kind | Role |
|---|---|---|
| `spec-discipline` | rule | When a change needs a spec, and the docs chain |
| `spec-orchestration` | rule | Multi-agent doctrine: consistency, delegation by pointers, outcome labels |
| `spec-architect` | agent | Authors specs, ADRs, module boundaries |
| `spec-docs-writer` | agent | Documentation and decision records in sync with code |
| `spec-init` | skill | One-time bootstrap: scaffold the in-repo docs substrate and migrate existing docs into it, drafting core docs from code |
| `spec-pull` | skill | Pull one tracker item into a spec, read-only, with drift keys; re-pull updates the same spec in place |
| `spec-create` | skill | Taskless intake: grills the owner, keeps the brief verbatim, writes numbered requirements + plan with coverage table and work steps |
| `spec-validate` | skill | Adversarial pre-execution fact-check of the plan against the repo; gaps become open questions |
| `spec-answer` | skill | Resolve a blocked spec's open questions with the developer; answers move with a `Changed:` line |
| `spec-approve` | skill | Autonomous mode: record the owner's gate-1 decision (`status: approved`), entering the queue |
| `spec-execute` | skill | Planned spec executed via parallel subagents; supervised - ends unstaged for developer review, autonomous - to an outcome-labeled PR |
| `spec-continue` | skill | Resume a mid-flight spec: inherited-work drift audit, then execution |
| `spec-execute-next` | skill | Autonomous mode: drain the approved queue - pick the highest-value spec, drive it end-to-end, close merged specs, reset |
| `spec-close` | skill | Post-merge: confirm shipped and docs reconciled, archive per convention |
| `spec-cancel` | skill | Retire a spec (cancelled / superseded) with a recorded reason; reconcile its draft docs |
| `spec-document` | skill | Write/update one docs artifact (feature, rule, glossary, model, architecture) from code |
| `spec-decision` | skill | ADR behind a three-condition gate, date-named by default |
| `spec-audit-docs` | skill | Docs claims audited against code: drift vs violation |

## Quick start (paste prompt)

Paste this into your AI coding agent, working in your project. It sets up the packs via
intelligence-sync remote sources, adapts them to your repo, and reports - without committing.

```
Set up the intelligence-dev-packs shared engineering packs in THIS project, via
intelligence-sync remote sources. Do it safely and report; do not commit or push.

1. PREREQUISITE - intelligence-sync. Find the intelligence umbrella: the directory holding
   `config.yaml` and a `sync/` engine (usually `intelligence/`, but detect it - it may be
   named or capitalized differently). If none exists, this project has no intelligence-sync:
   STOP and tell the owner to install it first from
   https://github.com/ainova-systems/intelligence-sync (paste its README Quick Start prompt),
   then re-run this. Do not proceed without it. If it exists, confirm the engine supports
   remote `git+` sources by grepping `<umbrella>/sync/scripts/lib/common.sh` for
   `resolve_source_dir`; if missing, update the engine first via `<umbrella>/sync/scripts/update.sh`.

2. INSPECT. Read the umbrella `config.yaml`, the project's rules, and any existing
   documentation conventions. Note the branch model, build/test/lint commands, PR platform,
   and any existing rule that overlaps a pack rule.

3. ADD THE PACKS (remote sources - no submodule, no copy). Append to the existing `sources`:
   - core (always - universal git/PR/review/discipline):
     - rules:  "git+https://github.com/ainova-systems/intelligence-dev-packs.git@main#packs/core/rules"
     - agents: "git+https://github.com/ainova-systems/intelligence-dev-packs.git@main#packs/core/agents"
     - skills: "git+https://github.com/ainova-systems/intelligence-dev-packs.git@main#packs/core/skills"
   - spec (ONLY if this project wants spec-driven development AND has no existing docs/spec
     workflow - the spec pack assumes the ai-first-docs tree, docs/specs/ + model.md +
     glossary.md, and would conflict with an existing one): add the same three lines with
     `#packs/spec/...`. If the project already has its own docs/spec approach, SKIP spec and say so.
   Use `@main` for now, or pin to a tag/SHA for reproducibility.

4. GENERATE THE PROFILE so skills adapt without re-scanning each run. Read the schema (raw:
   https://raw.githubusercontent.com/ainova-systems/intelligence-dev-packs/main/packs/core/templates/dev-project-profile.md),
   fill it from this repo (branch model, branch prefixes, typecheck/lint/test commands, PR
   platform and merge method, release flow, and - if spec was added - the docs structure), and
   save it as `<umbrella>/rules/dev-project-profile.md`. Leave any value you can't detect for the owner.

5. FLAG CONFLICTS, don't resolve silently. For each pack rule, report whether the project
   already has a rule that overlaps or contradicts it. The project's own rule wins on conflict -
   recommend keep / drop / scope; the owner decides.

6. SYNC AND REPORT. Run `bash <umbrella>/sync/scripts/sync.sh`. Report: sources added, whether
   spec was included and why, the generated profile values, every rule conflict + recommendation,
   and which pack skills are now available. Do NOT commit or push - the owner reviews first.
```

The manual equivalents (and submodule / global / copy alternatives) are below.

## Install

### Mode A - remote source (recommended)

For an intelligence-sync that supports `git+` remote sources, no submodule or copy is needed: point `intelligence/config.yaml` straight at the packs. The `#subpath` selects the pack and type; the `@ref` pins the version. Add `core` always; add `spec` only for spec-driven projects.

```yaml
sources:
  rules:
    - "intelligence/rules"
    - "git+https://github.com/ainova-systems/intelligence-dev-packs.git@v0.1.0#packs/core/rules"
    - "git+https://github.com/ainova-systems/intelligence-dev-packs.git@v0.1.0#packs/spec/rules"
  agents:
    - "intelligence/agents"
    - "git+https://github.com/ainova-systems/intelligence-dev-packs.git@v0.1.0#packs/core/agents"
    - "git+https://github.com/ainova-systems/intelligence-dev-packs.git@v0.1.0#packs/spec/agents"
  skills:
    - "intelligence/skills"
    - "intelligence/sync/skills"
    - "git+https://github.com/ainova-systems/intelligence-dev-packs.git@v0.1.0#packs/core/skills"
    - "git+https://github.com/ainova-systems/intelligence-dev-packs.git@v0.1.0#packs/spec/skills"
```

Then `bash intelligence/sync/scripts/sync.sh`. The engine shallow-clones each remote spec fresh every run (the same `repo@ref` is cloned once even across the six entries above), reads the `#subpath` directory, and feeds it through the same pipeline as a local source. Pin the `@ref` to a tag or SHA - an unpinned ref tracks the default branch and changes under you; the ref must be slashless (tag, SHA, or slashless branch). A clone failure (offline, bad URL) warns and skips just that source; the rest of the sync still succeeds. URL rules and the full reference are in [docs/INTEGRATION.md](docs/INTEGRATION.md).

### Mode B - git submodule (vendored)

For offline / air-gapped CI or teams that want the packs checked into their tree. Works with intelligence-sync 0.3.1 or later.

```bash
git submodule add https://github.com/ainova-systems/intelligence-dev-packs intelligence/dev-packs
```

```yaml
sources:
  rules:
    - "intelligence/rules"
    - "intelligence/dev-packs/packs/core/rules"
    - "intelligence/dev-packs/packs/spec/rules"
  agents:
    - "intelligence/agents"
    - "intelligence/dev-packs/packs/core/agents"
    - "intelligence/dev-packs/packs/spec/agents"
  skills:
    - "intelligence/skills"
    - "intelligence/sync/skills"
    - "intelligence/dev-packs/packs/core/skills"
    - "intelligence/dev-packs/packs/spec/skills"

submodules:
  - "intelligence/dev-packs"
```

Then `bash intelligence/sync/scripts/sync.sh`. Update with `git submodule update --remote intelligence/dev-packs`.

### Mode C - global skills (Claude Code)

```bash
git clone https://github.com/ainova-systems/intelligence-dev-packs
bash intelligence-dev-packs/scripts/claude-install-global.sh          # every pack
bash intelligence-dev-packs/scripts/claude-install-global.sh core     # core only
```

Installs the skills for your user, available in every project. Without a project profile, skills fall back to auto-detection and ask when a value is ambiguous.

### Mode D - plain copy

```bash
cp -r intelligence-dev-packs/packs/core/rules/*  my-project/intelligence/rules/
cp -r intelligence-dev-packs/packs/core/agents/* my-project/intelligence/agents/
cp -r intelligence-dev-packs/packs/core/skills/* my-project/intelligence/skills/
# add packs/spec/* the same way for spec-driven projects
```

See [docs/INTEGRATION.md](docs/INTEGRATION.md) for the full reference, including uninstall.

## Configure for your project

Nothing is wired up by hand. The only manual step is the `sources:` entries you already added (Mode A/B) plus sync; every skill then adapts to the repo with **zero further config**:

1. **Auto-detect (default).** Skills read the repo - default branch from git, an `origin/develop` as the integration branch, typecheck/lint/test commands from the manifests, PR platform from the remote - and ask once only when something is genuinely ambiguous.
2. **Optional profile, generated for you (not copied).** To pin those answers so nothing is re-detected or re-asked, have your AI agent write the profile once. It saves a filled `dev-project-profile.md` into your rules source, where it rides as an always-on rule the agent reads each task. Paste:

   > Read `packs/core/templates/dev-project-profile.md` from the intelligence-dev-packs source as the schema, inspect this repository, and write a filled-in `dev-project-profile.md` into my intelligence rules source. Change nothing else.

The profile (when present) declares the branch model, verification commands (including an optional single gate-runner via `verify`), PR platform and merge method, release flow, the tracker (`tracker`, `tracker_cli` - read-only, used by `spec-pull`), and the docs structure (`specs_dir`, `features_dir`, `rules_dir`, `decisions_dir`, `spec_grouping`, `execution_mode`, `adr_naming`). The greenfield documentation default follows the ai-first-docs tree: feature docs as the behavior baseline, change specs as `docs/specs/NNN-<slug>/` (`NNN-requirements.md` EARS + `NNN-plan.md` with coverage table and checkboxed work steps), business rules as contracts, date-named ADRs.

Hard invariants (never force-push, never blanket-stage, never bypass gates) can be backed by deterministic machinery rather than prose alone: `packs/core/templates/claude-settings.json` ships the `permissions.deny` set, and [docs/ENFORCEMENT.md](docs/ENFORCEMENT.md) maps each invariant to its mechanism.

## Design principles

1. **Context engineering over prompt engineering.** Output quality is governed by the information environment in the repository, not by prompt tricks.
2. **Maximum context in the repository.** Conventions, decisions, and domain knowledge are durable repo artifacts that humans and agents both read.
3. **Skill-first.** Repeatable work starts from a skill, so output stops depending on who prompted it, and capability compounds with the catalog.
4. **Spec discipline at the right threshold.** Small clear tasks ship directly; boundary-crossing work gets requirements + plan + tasks first.
5. **Consistency over creativity in execution.** The spec is the contract; subagents receive pointers to the same sources, never re-explained instructions.
6. **Verifiability and rollback over trust.** Strict gates catch AI errors before production; reversible changes make the remaining errors cheap.

## Compatibility

- **intelligence-sync**: remote `git+` sources (Mode A) need a build with that feature (it lands after 0.4.2 - check the engine's CHANGELOG for "Remote git sources"); submodule / copy (Modes B-D) work with 0.3.1 or later. The packs also work without the sync engine, consumed directly by Claude Code or any tool that reads `SKILL.md` folders.
- **Tools**: anything intelligence-sync targets (Claude Code, Cursor, GitHub Copilot, Codex, Pi, opencode, AGENTS.md readers), plus direct use.
- **Naming**: every artifact carries a domain prefix (`dev-`/`git-`/`spec-`), so pack content never collides with project artifacts or the reserved `intelligence-` meta-skills.

## Versioning

Semantic versioning, history in [CHANGELOG.md](CHANGELOG.md). Pin the `@ref` (Mode A) or the submodule (Mode B) to a tag for reproducible setups; track `main` for the latest practices. Planned improvements live in [ROADMAP.md](ROADMAP.md).

## Related

- **[intelligence-sync](https://github.com/ainova-systems/intelligence-sync)** - the open-source engine that delivers these packs into every IDE your team uses (Claude Code, Cursor, GitHub Copilot, Codex, and more). intelligence-dev-packs is the shared content. intelligence-sync is how it reaches each tool.

## License

MIT. Copyright 2026 Ainova Systems.

---

Created by **[Dmitrij Zykovic](https://www.linkedin.com/in/dmitrijz/)** - Fractional CTO at [Ainova Systems](https://www.ainovasystems.com).

Helping engineering teams adopt AI-First SDLC and build autonomous AI engineering pipelines.

[LinkedIn](https://www.linkedin.com/in/dmitrijz/) · [Advisory & Consulting](https://www.ainovasystems.com)
