# intelligence-dev-pack

Shared AI-first engineering practices, packaged as portable rules, agents, and skills. Author the workflow once, reuse it in every repository, and let both your team and your AI coding agents read the same source.

Built and maintained by [Ainova Systems](https://www.ainovasystems.com). Extracted from running multiple production AI-coded systems, including a 571k-line enterprise codebase where AI writes the majority of the code.

## Why

Every project re-derives the same engineering workflow: how to branch, how to commit, what to verify before pushing, when to write a plan, how to record decisions. Teams keep it as tribal knowledge; AI coding agents re-invent it every session. This pack codifies that workflow once, as artifacts every AI coding tool can consume:

- **Rules** are the standing conventions agents follow on every task (commit style, verification gates, spec thresholds).
- **Agents** are role personas with clear boundaries (architect, code reviewer, test engineer, docs writer).
- **Skills** are step-by-step procedures for the repeatable operations (start a feature, commit and push, open a PR, plan a feature, cut a release).

All artifacts are project-independent. Project specifics (branch model, test commands, release flow) come from a small per-project profile, so the same pack runs on a `main`-only repo and a `master` + `develop` gitflow repo without edits.

## What's inside

### Rules (`rules/`)

| Rule | Governs |
|---|---|
| `dev-commit-conventions` | Commit message format, push discipline, forbidden trailers |
| `dev-git-workflow` | Branch model, protected branches, feature-branch flow |
| `dev-skill-first` | Check the skill catalog before improvising a workflow |
| `dev-context-engineering` | Conventions, decisions, and domain knowledge live in the repo |
| `dev-spec-discipline` | When a task needs a written plan, and when it does not |
| `dev-verification-gates` | Typecheck, lint, and tests pass before every commit; gates are never weakened |
| `dev-rollback-safety` | Reversible migrations, feature flags, backout plans |

### Agents (`agents/`)

| Agent | Role | Access |
|---|---|---|
| `dev-architect` | Specs, ADRs, module boundaries, implementation plans | full |
| `dev-code-reviewer` | Reviews changes for correctness, conventions, tests, security | read-only |
| `dev-test-engineer` | Test strategy and coverage across unit, integration, e2e | full |
| `dev-docs-writer` | Keeps documentation and decision records in sync with code | full |

### Skills (`skills/`)

| Group | Skills |
|---|---|
| Git and PR | `dev-start-feature`, `dev-commit-push`, `dev-open-pr`, `dev-resolve-conflicts`, `dev-review-pr-comments` |
| Quality | `dev-review-changes`, `dev-run-tests`, `dev-scan-secrets` |
| Planning | `dev-plan-feature`, `dev-impact-analysis` |
| Documentation | `dev-add-decision`, `dev-docs-sync-check` |
| Session and release | `dev-generate-handoff`, `dev-create-release` |

## Install

### Mode A - git submodule + intelligence-sync (recommended)

Works with [intelligence-sync](https://github.com/ainova-systems/intelligence-sync) 0.3.1 or later. The pack content is plugged in as additional source paths; the sync engine projects it to every enabled tool (Claude Code, Cursor, Copilot, Codex, opencode, AGENTS.md).

```bash
git submodule add https://github.com/ainova-systems/intelligence-dev-pack intelligence/dev-pack
```

Add the pack paths to `intelligence/config.yaml`:

```yaml
sources:
  rules:
    - "intelligence/rules"
    - "intelligence/dev-pack/rules"
  agents:
    - "intelligence/agents"
    - "intelligence/dev-pack/agents"
  skills:
    - "intelligence/skills"
    - "intelligence/sync/skills"
    - "intelligence/dev-pack/skills"

submodules:
  - "intelligence/dev-pack"
```

Then sync:

```bash
bash intelligence/sync/scripts/sync.sh
```

Update to the latest pack version later:

```bash
git submodule update --remote intelligence/dev-pack
bash intelligence/sync/scripts/sync.sh
```

### Mode B - global skills (Claude Code)

Installs the skills for your user, available in every project without touching the project repo:

```bash
git clone https://github.com/ainova-systems/intelligence-dev-pack
bash intelligence-dev-pack/scripts/install-global.sh
```

Globally installed skills have no project profile to read, so they fall back to auto-detection and ask when a value is ambiguous.

### Mode C - plain copy

No tooling required. Copy the folders into your existing intelligence sources (or straight into `.claude/`) and adapt freely:

```bash
cp -r intelligence-dev-pack/rules/*  my-project/intelligence/rules/
cp -r intelligence-dev-pack/agents/* my-project/intelligence/agents/
cp -r intelligence-dev-pack/skills/* my-project/intelligence/skills/
```

See [docs/INTEGRATION.md](docs/INTEGRATION.md) for the full reference, including uninstall.

## Configure for your project

Copy the profile template into your project's rules source and fill it in:

```bash
cp intelligence/dev-pack/templates/dev-project-profile.md intelligence/rules/dev-project-profile.md
```

The profile declares the branch model (`main`, `master`, or `master` + `develop`), branch prefixes, verification commands, PR platform, and release flow. Every skill resolves project specifics in this order:

1. The `dev-project-profile.md` rule in the project.
2. Auto-detection from the repository (default branch from git, `develop` branch presence, test commands from manifests).
3. Ask once, then suggest persisting the answer into the profile.

A missing profile is never an error; it just means more detection and an occasional question.

## Design principles

The pack encodes one thesis: AI-first development is re-architecting the information environment the team and its agents share, so AI can write a large share of the code at speed without drift.

1. **Context engineering over prompt engineering.** Output quality is governed by the information environment in the repository, not by prompt tricks.
2. **Maximum context in the repository.** Conventions, decisions, and domain knowledge are durable repo artifacts that humans and agents both read. Context written once pays back across the whole backlog.
3. **Skill-first.** Repeatable work starts from a skill, so the output stops depending on who prompted it, and the team's capability compounds as the catalog grows.
4. **Spec discipline at the right threshold.** Small clear tasks ship directly; boundary-crossing or multi-module work gets a short contract + plan first. Ceremony where it pays, nowhere else.
5. **Verifiability and rollback over trust.** Strict gates catch AI errors before production; reversible changes make the remaining errors cheap.

## Compatibility

- **intelligence-sync**: 0.3.1 or later (path-list `sources:` schema). The pack also works without the sync engine, consumed directly by Claude Code or any tool that reads `SKILL.md` folders.
- **Tools**: anything intelligence-sync targets (Claude Code, Cursor, GitHub Copilot, Codex, Pi, opencode, AGENTS.md readers), plus direct use.
- **Naming**: every artifact carries the `dev-` prefix, so pack content never collides with project artifacts or with the reserved `intelligence-` meta-skills.

## Versioning

Semantic versioning, history in [CHANGELOG.md](CHANGELOG.md). Pin the submodule to a tag for reproducible setups; track `main` for the latest practices.

## License

MIT. Copyright 2026 Ainova Systems.

Created by [Dmitrij Zykovic](https://www.linkedin.com/in/dmitrijz/), Fractional CTO at Ainova Systems.
