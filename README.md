# intelligence-dev-packs

Shared AI-first engineering practices, packaged as portable rules, agents, and skills. Author the workflow once, reuse it in every repository, and let both your team and your AI coding agents read the same source.

Built and maintained by [Ainova Systems](https://www.ainovasystems.com). Extracted from running multiple AI-coded enterprise systems in daily production, where AI writes the majority of the code.

## Quick start

The packs ship as [Intelligence Packages](https://github.com/ainova-systems/intelligence), installed with the Intelligence CLI. Needs Node.js 18+, git, bash and awk.

```bash
npm install -g @ainova-systems/intelligence

cd your-project
intelligence init --targets claude              # claude, cursor, copilot, codex, pi, opencode
intelligence registry add https://github.com/ainova-systems/intelligence-dev-packs.git
intelligence package add @ainova-systems/core   # add @ainova-systems/spec for spec-driven projects
```

`init` writes `intelligence.yaml` and `intelligence.lock` - both committed - and renders each enabled tool's native files. `registry add` is what makes this repository's package names resolvable: names resolve only through registries the project has explicitly trusted, so nothing installs from a guessed URL. `package add` records the name and pins the resolved tag and commit in the lock.

Then run **`dev-init`** so the agent pins the project profile, creates the `ai:*` labels, copies the pack PR template when the repo has none, and merges the harness deny-list. It reports what it filled, what it left, and any project rule that overlaps a package rule. It does not commit. If the spec pack is installed, `spec-init` is the next step.

## What you get

| Pack | Install when | Contents |
|---|---|---|
| **core** (`dev-`, `git-`)<br>`@ainova-systems/core` | Always - it is universal | 6 always-on rules (skill-first, context engineering, verification gates, rollback safety, commit conventions, git workflow), 3 agents (code reviewer, QA verifier, test engineer), 15 skills: init, deliver a task end to end, tests, diff review, handoff, commit+push, open PR, drive the PR rounds, verify the PR's own steps, review the PR diff, complete the PR, resolve conflicts, merge, release, secret scan |
| **spec** (`spec-`)<br>`@ainova-systems/spec` | Opt-in, depends on core | The spec-driven lifecycle: 2 rules (spec discipline, multi-agent orchestration), 2 agents (architect, docs writer), 15 skills from tracker intake through plan, adversarial validation, execution, and docs upkeep |

Artifact-by-artifact catalog: [`packs/README.md`](packs/README.md).

## How it lands in your repository

Two blocks in `intelligence.yaml` - the trusted registry, and the packages themselves:

```yaml
registries:
  - "https://github.com/ainova-systems/intelligence-dev-packs.git"

packages:
  "@ainova-systems/core":
    version: "^0.4.0"
  "@ainova-systems/spec":       # spec-driven projects only
    version: "^0.4.0"
```

- **The manifest records intent, the lock records the resolution.** A package entry carries only the requested `version:` range (or a deliberate `ref:` pin); the resolved repository URL, subpath, tag and commit SHA live in the committed `intelligence.lock`. After a fresh clone, `intelligence sync` restores exactly that commit without consulting a registry.
- **Versions are this repository's git tags.** A range like `^0.4.0` matches stable `x.y.z` tags; prerelease tags are invisible to ranges. Read [CHANGELOG.md](CHANGELOG.md) between versions for renamed or removed artifacts.
- **Package content is not vendored into your tree.** It lands in the gitignored store at `.intelligence/packages/@ainova-systems/<name>/`, and the CLI renders it into each tool's own files.
- **Your artifacts win.** Package sources precede project sources, so a same-named artifact in `intelligence/rules|agents|skills` deliberately overrides package content.
- **Other modes** - global Claude Code skills (`scripts/claude-install-global.sh`), plain copy, and installing straight from the repository without a registry - are in [docs/integration.md](docs/integration.md), along with uninstall and the migration from intelligence-sync.

## Configure for your project

Nothing is wired by hand. Skills read the repository - default branch from git, an `origin/develop` as the integration branch, typecheck/lint/test commands from the manifests, PR platform from the remote - and ask once only when something is genuinely ambiguous.

To pin those answers so nothing is re-detected or re-asked, run `dev-init`. It declares the branch model, verification commands (including an optional single gate-runner via `verify`), PR platform and merge method, release flow, the tracker, and the docs structure. It is generated and filled from your repo - never copied or hand-edited - and rides as an always-on rule.

Hard invariants (never force-push, never blanket-stage, never bypass gates) can be backed by machinery rather than prose: `dev-init` merges the pack's `templates/claude-settings.json` into the project's `.claude/settings.json`, and [docs/enforcement.md](docs/enforcement.md) maps each invariant to its mechanism.

## One task, one command

The pack's git skills each own one step, and driving the chain by hand means relaying every hand-off. **`dev-deliver`** is the chain as one invocation: it interviews until the goal and the expected result are explicit, implements, drives the pull request to accept-ready, and - after the owner accepts - merges and cuts the release.

- **Four phases** - interview, implement, review, release - and the owner is interrupted only between them. A question raised inside a phase ends that phase rather than parking inside it.
- **Two owner gates**, accept and release, asked at the boundary each governs or both upfront (profile `flow_approvals`). Neither is ever inferred.
- **Resumable from anywhere**, with no state file: branch, commits, pull request, its labels and their freshness, and the tag already say which phase a change is in.
- **It adopts the project's flow.** Each phase resolves its owner from the profile, then from the installed catalog, then falls back to its own behavior - a project that ships its own intake or execution skill (the spec pack's `spec-create` / `spec-execute`, or your own) has that skill run the phase.
- **The interview's acceptance criteria become the PR's verification section**, which `git-verify-pr` later executes against the running change - so "done" means the owner's expectation was observed, not that CI was green.

## The spec lifecycle (spec pack only)

A project without the spec pack still uses `core` standalone - the git/PR/review/release skills and the discipline rules work on their own.

With it, the flow runs in one of two execution modes (profile `execution_mode`):

**Supervised (default)** - the developer stays in the loop. Intake pulls a tracker item into requirements (`spec-pull`, read-only against the tracker) or captures a taskless brief (`spec-create`), and `spec-plan` writes the plan beside them - the same second half whichever intake ran. The plan opens with a requirements-coverage table - every requirement maps to the step that delivers it or to the open question that blocks it - and an open question blocks execution, never planning (`spec-validate` fact-checks the plan against the repo and may raise more; `spec-answer` then resolves them). Status is read from the artifacts, never written: a plan with no open question is the approval. `spec-execute` runs the plan via parallel subagents and ends with changes **uncommitted** on the feature branch, for the developer to review and ship with the git skills.

**Autonomous** - the owner touches the work at three gates; everything between runs unattended.

| Step | Who | Skill |
|---|---|---|
| 1. State the task | **Owner** | - |
| 2. Spec written (requirements + plan) | AI | `spec-pull` / `spec-create`, then `spec-plan` |
| 3. **Gate 1 - review and approve the spec** | **Owner** | `spec-approve` |
| 4. Implementation: branch, parallel subagents, tests, milestone commits | AI | `spec-execute` |
| 5. PR opened | AI | `git-open-pr` |
| 6. Rounds until every success factor holds on one commit: CI green, steps verified, diff reviewed | AI | `git-finalize-pr` -> `git-verify-pr` / `git-review-pr` |
| 7. Threads resolved, one outcome recorded | AI | `git-complete-pr` |
| 8. **Gate 2 - accept the PR** | **Owner** | - |
| 9. Squash-merge, close the spec, cleanup | AI | `git-merge-pr` -> `spec-close` |

`spec-execute-next` drains the approved queue for scheduled or looped runs, and every autonomous run ends at a labeled PR: one outcome (`ai:completed`, `ai:manual`, `ai:failed`) plus the success factors it earned (`ai:verified`, `ai:reviewed`), each valid only for the commit that earned it, so a push invalidates them and `git-merge-pr` refuses a stale one. `spec-cancel` retires a dropped or superseded spec with a recorded reason. Before the first spec, `dev-init` then `spec-init` scaffold the core setup and the in-repo docs substrate, adopting a project's structure rather than imposing one.

## Design principles

1. **Context engineering over prompt engineering.** Output quality is governed by the information environment in the repository, not by prompt tricks.
2. **Maximum context in the repository.** Conventions, decisions, and domain knowledge are durable repo artifacts that humans and agents both read.
3. **Skill-first.** Repeatable work starts from a skill, so output stops depending on who prompted it, and capability compounds with the catalog.
4. **Spec discipline at the right threshold.** Small clear tasks ship directly; boundary-crossing work gets requirements and a plan first.
5. **Consistency over creativity in execution.** The spec is the contract; subagents receive pointers to the same sources, never re-explained instructions.
6. **Verifiability and rollback over trust.** Strict gates catch AI errors before production; reversible changes make the remaining errors cheap.

## Compatibility

- **Intelligence CLI**: the packages install with the current CLI (`npm install -g @ainova-systems/intelligence`). `registry add` requires a registry repository to publish an `index.yaml` at its root; this repository does, mapping `@ainova-systems/core` and `@ainova-systems/spec` to their subpaths.
- **Migrating from intelligence-sync**: that engine is archived at v0.10.4 and replaced by the CLI. Convert an existing project with `intelligence init --preview`, review, then `intelligence init --apply` - it preserves project-owned sources and replaces the vendored engine.
- **Tools**: Claude Code, Cursor, GitHub Copilot, Codex, Pi, OpenCode, and AGENTS.md readers. The packs also work with no engine at all, consumed directly by any tool that reads `SKILL.md` folders.
- **Naming**: every artifact carries a domain prefix (`dev-`/`git-`/`spec-`), so package content never collides with project artifacts or the reserved `intelligence-` meta-skills.

## Versioning

Semantic versioning, history in [CHANGELOG.md](CHANGELOG.md). Pin `ref:` to a tag for reproducible setups; track `main` for the latest practices. Planned improvements live in [ROADMAP.md](ROADMAP.md).

## Related

- **[Intelligence](https://github.com/ainova-systems/intelligence)** - the open-source CLI that versions, distributes and renders these packages into every IDE your team uses (Claude Code, Cursor, GitHub Copilot, Codex, Pi, OpenCode). intelligence-dev-packs is the shared content; Intelligence is how it reaches each tool.

## License

MIT. Copyright 2026 Ainova Systems.

---

Created by **[Dmitrij Zykovic](https://www.linkedin.com/in/dmitrijz/)** - Fractional CTO at [Ainova Systems](https://www.ainovasystems.com).

Helping engineering teams adopt AI-First SDLC and build autonomous AI engineering pipelines.

[LinkedIn](https://www.linkedin.com/in/dmitrijz/) · [Advisory & Consulting](https://www.ainovasystems.com)
