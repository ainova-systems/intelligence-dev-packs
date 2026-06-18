# intelligence-dev-pack

Shared AI-first engineering practices, packaged as portable rules, agents, and skills. Author the workflow once, reuse it in every repository, and let both your team and your AI coding agents read the same source.

Built and maintained by [Ainova Systems](https://www.ainovasystems.com). Extracted from running multiple production AI-coded systems, including a 571k-line enterprise codebase where AI writes the majority of the code.

## Packs

Content is organized into **packs** under [`packs/`](packs/). A consuming project opts into the packs it wants.

| Pack | Scope | Prefix |
|---|---|---|
| **base** (default) | The universal AI-first engineering workflow below. Stack-independent. | `dev-` |

`base` is the default; future packs (stack- or concern-specific) sit beside it and are selected explicitly. See [`packs/README.md`](packs/README.md).

## The owner flow (base pack)

The base pack is built around one operating model: the owner touches the work at three gates, and everything between runs autonomously with reviews, checks, and fallbacks built in.

| Step | Who | Skill |
|---|---|---|
| 1. State the task | **Owner** | - |
| 2. Spec written (requirements, plan, tasks) | AI | `dev-create-spec` |
| 3. **Gate 1 - review the spec** | **Owner** | - |
| 4. Implementation: branch, parallel subagents, tests, milestone commits | AI | `dev-execute-spec` |
| 5. PR opened, CI driven to green, review comments handled, outcome label | AI | `dev-finalize-pr` |
| 6. **Gate 2 - accept the PR** | **Owner** | - |
| 7. Squash-merge, base sync, cleanup | AI | `dev-merge-pr` |

Fully autonomous mode: `dev-execute-next` picks the highest-value ready spec from the backlog, drives it to an outcome-labeled PR, and resets the workspace - suitable for scheduled and looped runs. Every autonomous run ends with exactly one outcome label: `ai:ready-to-merge`, `ai:manual`, or `ai:failed`.

## What's inside the base pack

### Rules (`packs/base/rules/`) - always-on conventions

| Rule | Governs |
|---|---|
| `dev-orchestration` | Multi-agent doctrine: consistency first, delegation by pointers, outcome labels, conflict gate |
| `dev-commit-conventions` | Commit message format, push discipline, forbidden trailers |
| `dev-git-workflow` | Branch model, protected branches, feature-branch flow |
| `dev-skill-first` | Check the skill catalog before improvising a workflow |
| `dev-context-engineering` | Conventions, decisions, and the docs chain live in the repo |
| `dev-spec-discipline` | When a change needs a spec, and when it does not |
| `dev-verification-gates` | Typecheck, lint, tests pass before every commit; gates never weakened |
| `dev-rollback-safety` | Reversible migrations, feature flags, expand-contract sequencing |

### Agents (`packs/base/agents/`)

| Agent | Role | Access |
|---|---|---|
| `dev-architect` | Specs, ADRs, module boundaries | full |
| `dev-code-reviewer` | Reviews changes for correctness, conventions, tests, security | read-only |
| `dev-test-engineer` | Test strategy and coverage across all levels | full |
| `dev-docs-writer` | Documentation and decision records in sync with code | full |

### Skills (`packs/base/skills/`)

**Orchestrators** - the owner-facing interface:

| Skill | Responsibility |
|---|---|
| `dev-create-spec` | Task to spec: grills the owner on ambiguity (checkpointed interview), writes EARS requirements + plan with sibling citations + tasks |
| `dev-execute-spec` | Approved spec to PR: parallel subagents, consistency gates, docs reconciliation, outcome label |
| `dev-continue-spec` | Resume a mid-flight spec: inherited-work drift audit first, then execution |
| `dev-execute-next` | Pick the highest-value ready item, drive it end-to-end, reset the workspace |
| `dev-finalize-pr` | CI to green plus every review comment handled - PR ready to merge |
| `dev-merge-pr` | After owner accept: guard-checked squash-merge, base sync, cleanup |

**Building blocks** - invoked by the orchestrators (and directly when useful):

| Skill | Responsibility |
|---|---|
| `dev-commit-push` | Verified milestone commit and fast-forward push |
| `dev-review-pr-comments` | Triage reviewer feedback: fix, discuss, or decline with reason |
| `dev-resolve-conflicts` | Semantic conflict resolution, full gates after |
| `dev-run-tests` | Typecheck, lint, tests with scope detection and failure analysis |
| `dev-review-changes` | Read-only diff review with severity verdict |
| `dev-scan-secrets` | Credential scan over diff, tree, or history |
| `dev-handoff` | Self-contained continuation prompt for a fresh session |
| `dev-add-decision` | Numbered ADR behind a three-condition gate |
| `dev-docs-sync-check` | Docs claims verified against code: drift vs violation |
| `dev-create-release` | Version, changelog, tag per the project's release flow |

## Install

### Mode A - remote source (recommended)

For an intelligence-sync that supports `git+` remote sources, no submodule or copy is needed: point `intelligence/config.yaml` straight at the pack. The `#subpath` selects the pack and type; the `@ref` pins the version.

```yaml
sources:
  rules:
    - "intelligence/rules"
    - "git+https://github.com/ainova-systems/intelligence-dev-pack@v0.1.0#packs/base/rules"
  agents:
    - "intelligence/agents"
    - "git+https://github.com/ainova-systems/intelligence-dev-pack@v0.1.0#packs/base/agents"
  skills:
    - "intelligence/skills"
    - "intelligence/sync/skills"
    - "git+https://github.com/ainova-systems/intelligence-dev-pack@v0.1.0#packs/base/skills"
```

Then `bash intelligence/sync/scripts/sync.sh`. Pin to a tag or SHA (the `@ref` must be slashless - use a tag, SHA, or slashless branch). Update by bumping the `@ref`. URL rules and the full reference are in [docs/INTEGRATION.md](docs/INTEGRATION.md).

### Mode B - git submodule (vendored)

For offline / air-gapped CI or teams that want the pack checked into their tree. Works with intelligence-sync 0.3.1 or later.

```bash
git submodule add https://github.com/ainova-systems/intelligence-dev-pack intelligence/dev-pack
```

```yaml
sources:
  rules:
    - "intelligence/rules"
    - "intelligence/dev-pack/packs/base/rules"
  agents:
    - "intelligence/agents"
    - "intelligence/dev-pack/packs/base/agents"
  skills:
    - "intelligence/skills"
    - "intelligence/sync/skills"
    - "intelligence/dev-pack/packs/base/skills"

submodules:
  - "intelligence/dev-pack"
```

Then `bash intelligence/sync/scripts/sync.sh`. Update with `git submodule update --remote intelligence/dev-pack`.

### Mode C - global skills (Claude Code)

```bash
git clone https://github.com/ainova-systems/intelligence-dev-pack
bash intelligence-dev-pack/scripts/install-global.sh        # base pack
```

Installs the pack skills for your user, available in every project. `install-global.sh <pack> [pack...]` selects packs (`all` for every pack). Without a project profile, skills fall back to auto-detection and ask when a value is ambiguous.

### Mode D - plain copy

```bash
cp -r intelligence-dev-pack/packs/base/rules/*  my-project/intelligence/rules/
cp -r intelligence-dev-pack/packs/base/agents/* my-project/intelligence/agents/
cp -r intelligence-dev-pack/packs/base/skills/* my-project/intelligence/skills/
```

See [docs/INTEGRATION.md](docs/INTEGRATION.md) for the full reference, including uninstall.

## Configure for your project

Copy the profile template into your project's rules source and fill it in:

```bash
cp intelligence/dev-pack/packs/base/templates/dev-project-profile.md intelligence/rules/dev-project-profile.md
```

The profile declares the branch model (`main`, `master`, or `master` + `develop`), verification commands, PR platform and merge method, release flow, and the docs structure (`specs_dir`, `features_dir`, `rules_dir`, `decisions_dir`, `spec_grouping`).

Every skill resolves project specifics in a fixed order:

1. **Learn from the project** - the existing structure and the closest shipped sibling artifact are the template; nothing is hardcoded in skill text.
2. **The profile** pins values when detection is ambiguous.
3. **Ask once**, then suggest persisting the answer into the profile.

The greenfield default for documentation follows the ai-first-docs tree: feature docs as the behavior baseline, change specs as `docs/specs/NNN-<slug>/` with `requirements.md` (EARS), `plan.md`, and `tasks.md`, business rules as contracts, numbered ADRs.

## Design principles

1. **Context engineering over prompt engineering.** Output quality is governed by the information environment in the repository, not by prompt tricks.
2. **Maximum context in the repository.** Conventions, decisions, and domain knowledge are durable repo artifacts that humans and agents both read.
3. **Skill-first.** Repeatable work starts from a skill, so output stops depending on who prompted it, and capability compounds with the catalog.
4. **Spec discipline at the right threshold.** Small clear tasks ship directly; boundary-crossing work gets requirements + plan + tasks first.
5. **Consistency over creativity in execution.** The spec is the contract; subagents receive pointers to the same sources, never re-explained instructions.
6. **Verifiability and rollback over trust.** Strict gates catch AI errors before production; reversible changes make the remaining errors cheap.

## Compatibility

- **intelligence-sync**: remote `git+` sources (Mode A) need a build that supports them; submodule / copy (Modes B-D) work with 0.3.1 or later. The pack also works without the sync engine, consumed directly by Claude Code or any tool that reads `SKILL.md` folders.
- **Tools**: anything intelligence-sync targets (Claude Code, Cursor, GitHub Copilot, Codex, Pi, opencode, AGENTS.md readers), plus direct use.
- **Naming**: every artifact in a pack carries that pack's prefix (`dev-` for base), so pack content never collides with project artifacts or the reserved `intelligence-` meta-skills.

## Versioning

Semantic versioning, history in [CHANGELOG.md](CHANGELOG.md). Pin the `@ref` (Mode A) or the submodule (Mode B) to a tag for reproducible setups; track `main` for the latest practices.

## License

MIT. Copyright 2026 Ainova Systems.

Created by [Dmitrij Zykovic](https://www.linkedin.com/in/dmitrijz/), Fractional CTO at Ainova Systems.
