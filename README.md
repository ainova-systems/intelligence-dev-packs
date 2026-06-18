# intelligence-dev-packs

Shared AI-first engineering practices, packaged as portable rules, agents, and skills. Author the workflow once, reuse it in every repository, and let both your team and your AI coding agents read the same source.

Built and maintained by [Ainova Systems](https://www.ainovasystems.com). Extracted from running multiple production AI-coded systems, including a 571k-line enterprise codebase where AI writes the majority of the code.

## Packs and domains

Two decoupled ideas (see [`packs/README.md`](packs/README.md)):

- A **pack** is what you install together. A **domain prefix** (`dev-`/`git-`/`spec-`) is the namespace on each artifact.

| Pack | Domains | Scope | Depends on |
|---|---|---|---|
| **core** | `dev-`, `git-` | Universal - engineering discipline, session hygiene, git/PR/release. Install everywhere. | - |
| **spec** | `spec-` | Opt-in - spec-driven development. Not every project adopts it, so it ships separately. | core |

## The owner flow (spec pack)

When a project adopts spec-driven development, the owner touches the work at three gates, and everything between runs autonomously with reviews, checks, and fallbacks built in.

| Step | Who | Skill |
|---|---|---|
| 1. State the task | **Owner** | - |
| 2. Spec written (requirements, plan, tasks) | AI | `spec-create` |
| 3. **Gate 1 - review the spec** | **Owner** | - |
| 4. Implementation: branch, parallel subagents, tests, milestone commits | AI | `spec-execute` |
| 5. PR opened, CI driven to green, review comments handled, outcome label | AI | `git-finalize-pr` |
| 6. **Gate 2 - accept the PR** | **Owner** | - |
| 7. Squash-merge, base sync, cleanup | AI | `git-merge-pr` |

Fully autonomous mode: `spec-execute-next` picks the highest-value ready spec from the backlog, drives it to an outcome-labeled PR, and resets the workspace - suitable for scheduled and looped runs. Every autonomous run ends with exactly one outcome label: `ai:ready-to-merge`, `ai:manual`, or `ai:failed`.

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
| `git-resolve-conflicts` | skill | Semantic conflict resolution, full gates after |
| `git-review-pr-comments` | skill | Triage reviewer feedback: fix, discuss, or decline with reason |
| `git-finalize-pr` | skill | CI to green plus every review comment handled - PR ready to merge |
| `git-merge-pr` | skill | After owner accept: guard-checked squash-merge, base sync, cleanup |
| `git-create-release` | skill | Version, changelog, tag per the project's release flow |
| `git-scan-secrets` | skill | Credential scan over diff, tree, or history |

## spec pack

Domain **`spec-`**. Depends on `core`.

| Artifact | Kind | Role |
|---|---|---|
| `spec-discipline` | rule | When a change needs a spec, and the docs chain |
| `spec-orchestration` | rule | Multi-agent doctrine: consistency, delegation by pointers, outcome labels |
| `spec-architect` | agent | Authors specs, ADRs, module boundaries |
| `spec-docs-writer` | agent | Documentation and decision records in sync with code |
| `spec-create` | skill | Task to spec: grills the owner on ambiguity, writes requirements + plan + tasks |
| `spec-execute` | skill | Approved spec to PR: parallel subagents, consistency gates, docs reconciliation |
| `spec-continue` | skill | Resume a mid-flight spec: inherited-work drift audit, then execution |
| `spec-execute-next` | skill | Pick the highest-value ready spec, drive it end-to-end, reset the workspace |
| `spec-add-decision` | skill | Numbered ADR behind a three-condition gate |
| `spec-audit-docs` | skill | Docs claims audited against code: drift vs violation |

## Install

### Mode A - remote source (recommended)

For an intelligence-sync that supports `git+` remote sources, no submodule or copy is needed: point `intelligence/config.yaml` straight at the packs. The `#subpath` selects the pack and type; the `@ref` pins the version. Add `core` always; add `spec` only for spec-driven projects.

```yaml
sources:
  rules:
    - "intelligence/rules"
    - "git+https://github.com/ainova-systems/intelligence-dev-packs@v0.1.0#packs/core/rules"
    - "git+https://github.com/ainova-systems/intelligence-dev-packs@v0.1.0#packs/spec/rules"
  agents:
    - "intelligence/agents"
    - "git+https://github.com/ainova-systems/intelligence-dev-packs@v0.1.0#packs/core/agents"
    - "git+https://github.com/ainova-systems/intelligence-dev-packs@v0.1.0#packs/spec/agents"
  skills:
    - "intelligence/skills"
    - "intelligence/sync/skills"
    - "git+https://github.com/ainova-systems/intelligence-dev-packs@v0.1.0#packs/core/skills"
    - "git+https://github.com/ainova-systems/intelligence-dev-packs@v0.1.0#packs/spec/skills"
```

Then `bash intelligence/sync/scripts/sync.sh`. Pin the `@ref` to a tag or SHA (it must be slashless). URL rules and the full reference are in [docs/INTEGRATION.md](docs/INTEGRATION.md).

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
bash intelligence-dev-packs/scripts/install-global.sh          # every pack
bash intelligence-dev-packs/scripts/install-global.sh core     # core only
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

Copy the profile template into your project's rules source and fill it in:

```bash
cp intelligence/dev-packs/packs/core/templates/dev-project-profile.md intelligence/rules/dev-project-profile.md
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

- **intelligence-sync**: remote `git+` sources (Mode A) need a build that supports them; submodule / copy (Modes B-D) work with 0.3.1 or later. The packs also work without the sync engine, consumed directly by Claude Code or any tool that reads `SKILL.md` folders.
- **Tools**: anything intelligence-sync targets (Claude Code, Cursor, GitHub Copilot, Codex, Pi, opencode, AGENTS.md readers), plus direct use.
- **Naming**: every artifact carries a domain prefix (`dev-`/`git-`/`spec-`), so pack content never collides with project artifacts or the reserved `intelligence-` meta-skills.

## Versioning

Semantic versioning, history in [CHANGELOG.md](CHANGELOG.md). Pin the `@ref` (Mode A) or the submodule (Mode B) to a tag for reproducible setups; track `main` for the latest practices.

## License

MIT. Copyright 2026 Ainova Systems.

Created by [Dmitrij Zykovic](https://www.linkedin.com/in/dmitrijz/), Fractional CTO at Ainova Systems.
