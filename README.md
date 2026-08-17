# intelligence-dev-packs

Shared AI-first engineering practices, packaged as portable rules, agents, and skills. Author the workflow once, reuse it in every repository, and let both your team and your AI coding agents read the same source.

Built and maintained by [Ainova Systems](https://www.ainovasystems.com). Extracted from running multiple AI-coded enterprise systems in daily production, where AI writes the majority of the code.

## Quick start

Paste this into your AI coding agent, working in the project you want to set up:

```
Set up the intelligence-dev-packs shared engineering packs in THIS repository.

1. ENGINE. Find the intelligence umbrella - the folder holding `config.yaml` and a `sync/`
   engine (usually `intelligence/`, but detect it: it may be renamed or capitalized
   differently). If there is none, install intelligence-sync first by following
   https://raw.githubusercontent.com/ainova-systems/intelligence-sync/main/intelligence/sync/INIT.md
   then continue here.

2. ASK ME which packs to add, and wait for the answer:
   - core (default) - engineering discipline, session hygiene, git / PR / review / release.
   - core + spec - adds the spec-driven lifecycle (intake, plan, execute, docs). Only for a
     project that wants it and has no spec workflow of its own.

3. DECLARE THE PACK once in the umbrella `config.yaml`, mirrored into the repo:

   packs:
     intelligence-dev-packs:
       url: https://github.com/ainova-systems/intelligence-dev-packs.git
       ref: main
       mirror: "<umbrella>/external/intelligence-dev-packs"

   Then reference it from `sources:` - for each pack I chose, add
   "@intelligence-dev-packs/packs/<pack>/rules", "…/agents" and "…/skills" to the matching
   section, keeping my own project sources first.

4. PROFILE. Read `packs/core/templates/dev-project-profile.md` from the mirror as the schema,
   fill it from this repository (branch model, verification commands, PR platform and merge
   method, release flow, tracker, and - if spec was added - the docs structure), and save it as
   `<umbrella>/rules/dev-project-profile.md`. Leave anything you cannot detect for me.

5. SYNC AND REPORT. Run `bash <umbrella>/sync/scripts/sync.sh`. Report: which packs were added,
   the profile values you filled and the ones you left, and every project rule that overlaps or
   contradicts a pack rule - mine wins, recommend keep / drop / scope. Do not commit or push.
```

It works whether or not the project already has intelligence-sync, and leaves everything staged for your review.

## What you get

| Pack | Install when | Contents |
|---|---|---|
| **core** (`dev-`, `git-`) | Always - it is universal | 6 always-on rules (skill-first, context engineering, verification gates, rollback safety, commit conventions, git workflow), 2 agents (code reviewer, test engineer), 11 skills: tests, diff review, handoff, commit+push, open PR, drive PR to green, review comments, resolve conflicts, merge, release, secret scan |
| **spec** (`spec-`) | Opt-in, depends on core | The spec-driven lifecycle: 2 rules (spec discipline, multi-agent orchestration), 2 agents (architect, docs writer), 14 skills from tracker intake through plan, adversarial validation, execution, and docs upkeep |

Artifact-by-artifact catalog: [`packs/README.md`](packs/README.md).

## How it lands in your repository

One declaration, referenced by name - this is a real `config.yaml` from a project using the packs:

```yaml
packs:
  intelligence-dev-packs:
    url: https://github.com/ainova-systems/intelligence-dev-packs.git
    ref: main                                              # pin to a tag or SHA for reproducibility
    mirror: intelligence/external/intelligence-dev-packs   # committed copy - the default

sources:
  rules:
    - "intelligence/rules"
    - "@intelligence-dev-packs/packs/core/rules"
    - "intelligence/sync/rules"
  agents:
    - "intelligence/agents"
    - "@intelligence-dev-packs/packs/core/agents"
    - "intelligence/sync/agents"
  skills:
    - "intelligence/skills"
    - "intelligence/sync/skills"
    - "@intelligence-dev-packs/packs/core/skills"
```

Then `bash intelligence/sync/scripts/sync.sh`.

- **Mirrored into your repo by default.** `mirror:` materializes the pack at that path and you commit it, so bumping `ref:` reads as an ordinary diff instead of a shifted generated output. Only the referenced subpaths are copied - the pack's README, CI, and tests never enter your tree. Drop the line and the pack stays transient (cloned per run, nothing committed).
- **Adding spec** is three more entries: `@intelligence-dev-packs/packs/spec/{rules,agents,skills}`.
- **Other modes** - git submodule, global Claude Code skills (`scripts/claude-install-global.sh`), plain copy - are in [docs/integration.md](docs/integration.md), along with uninstall.

## Configure for your project

Nothing is wired by hand. Skills read the repository - default branch from git, an `origin/develop` as the integration branch, typecheck/lint/test commands from the manifests, PR platform from the remote - and ask once only when something is genuinely ambiguous.

To pin those answers so nothing is re-detected or re-asked, have your agent generate a profile once (step 4 of the Quick start does this). It declares the branch model, verification commands (including an optional single gate-runner via `verify`), PR platform and merge method, release flow, the tracker, and the docs structure. It is generated and filled from your repo - never copied or hand-edited - and rides as an always-on rule.

Hard invariants (never force-push, never blanket-stage, never bypass gates) can be backed by machinery rather than prose: `packs/core/templates/claude-settings.json` ships the `permissions.deny` set, and [docs/enforcement.md](docs/enforcement.md) maps each invariant to its mechanism.

## The spec lifecycle (spec pack only)

A project without the spec pack still uses `core` standalone - the git/PR/review/release skills and the discipline rules work on their own.

With it, the flow runs in one of two execution modes (profile `execution_mode`):

**Supervised (default)** - the developer stays in the loop. Intake pulls a tracker item into a spec (`spec-pull`, read-only against the tracker) or captures a taskless brief (`spec-create`). The plan opens with a requirements-coverage table - every requirement maps to the step that delivers it or to the open question that blocks it - and an open question blocks execution, never planning (`spec-answer` resolves them; `spec-validate` fact-checks the plan against the repo first). Status is read from the artifacts, never written: a plan with no open question is the approval. `spec-execute` runs the plan via parallel subagents and ends with changes **uncommitted** on the feature branch, for the developer to review and ship with the git skills.

**Autonomous** - the owner touches the work at three gates; everything between runs unattended.

| Step | Who | Skill |
|---|---|---|
| 1. State the task | **Owner** | - |
| 2. Spec written (requirements + plan) | AI | `spec-pull` / `spec-create` |
| 3. **Gate 1 - review and approve the spec** | **Owner** | `spec-approve` |
| 4. Implementation: branch, parallel subagents, tests, milestone commits | AI | `spec-execute` |
| 5. PR opened, CI driven to green, review comments handled, outcome label | AI | `git-finalize-pr` |
| 6. **Gate 2 - accept the PR** | **Owner** | - |
| 7. Squash-merge, close the spec, cleanup | AI | `git-merge-pr` -> `spec-close` |

`spec-execute-next` drains the approved queue for scheduled or looped runs, and every autonomous run ends with exactly one outcome label: `ai:ready-to-merge`, `ai:manual`, or `ai:failed`. `spec-cancel` retires a dropped or superseded spec with a recorded reason. Before the first spec, `spec-init` scaffolds the in-repo docs substrate and migrates existing documentation into it, adopting a project's structure rather than imposing one.

## Design principles

1. **Context engineering over prompt engineering.** Output quality is governed by the information environment in the repository, not by prompt tricks.
2. **Maximum context in the repository.** Conventions, decisions, and domain knowledge are durable repo artifacts that humans and agents both read.
3. **Skill-first.** Repeatable work starts from a skill, so output stops depending on who prompted it, and capability compounds with the catalog.
4. **Spec discipline at the right threshold.** Small clear tasks ship directly; boundary-crossing work gets requirements and a plan first.
5. **Consistency over creativity in execution.** The spec is the contract; subagents receive pointers to the same sources, never re-explained instructions.
6. **Verifiability and rollback over trust.** Strict gates catch AI errors before production; reversible changes make the remaining errors cheap.

## Compatibility

- **intelligence-sync**: declared `packs:` (the Quick start) need 0.10.0 or later; older engines can still reference a pack inline as `git+<url>@<ref>#<subpath>` per source entry. Submodule and copy modes work with 0.3.1 or later. The packs also work without the sync engine, consumed directly by Claude Code or any tool that reads `SKILL.md` folders.
- **Tools**: anything intelligence-sync targets (Claude Code, Cursor, GitHub Copilot, Codex, Pi, opencode, AGENTS.md readers), plus direct use.
- **Naming**: every artifact carries a domain prefix (`dev-`/`git-`/`spec-`), so pack content never collides with project artifacts or the reserved `intelligence-` meta-skills.

## Versioning

Semantic versioning, history in [CHANGELOG.md](CHANGELOG.md). Pin `ref:` to a tag for reproducible setups; track `main` for the latest practices. Planned improvements live in [ROADMAP.md](ROADMAP.md).

## Related

- **[intelligence-sync](https://github.com/ainova-systems/intelligence-sync)** - the open-source engine that delivers these packs into every IDE your team uses (Claude Code, Cursor, GitHub Copilot, Codex, and more). intelligence-dev-packs is the shared content; intelligence-sync is how it reaches each tool.

## License

MIT. Copyright 2026 Ainova Systems.

---

Created by **[Dmitrij Zykovic](https://www.linkedin.com/in/dmitrijz/)** - Fractional CTO at [Ainova Systems](https://www.ainovasystems.com).

Helping engineering teams adopt AI-First SDLC and build autonomous AI engineering pipelines.

[LinkedIn](https://www.linkedin.com/in/dmitrijz/) · [Advisory & Consulting](https://www.ainovasystems.com)
