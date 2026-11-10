# Integration Guide

How to attach intelligence-dev-packs to a project, configure it, keep it updated, and remove it.

## Packs, packages, and domains

Content is organized into **packs** (adoption units) under `packs/`, and each artifact carries a **domain prefix** (namespace). The two are decoupled - a pack may hold more than one domain. Each pack is published as an **Intelligence Package** under its own name:

```
packs/
├── core/            # @ainova-systems/core - universal, install everywhere
│   ├── rules/       #   dev-* (discipline) + git-* (vcs)
│   ├── agents/      #   dev-* personas
│   ├── skills/      #   dev-* + git-*, each with the scripts/, references/ or assets/ it needs
│   ├── references/  #   dev-external-writes, git-pr-labels: detail rules and skills need only sometimes
│   └── templates/   #   the profile schema, the QA-checks schema, the Claude Code settings
└── spec/            # @ainova-systems/spec - opt-in, depends on core
    ├── rules/       #   spec-*
    ├── agents/      #   spec-* personas
    ├── skills/      #   spec-* (spec-validate carries scripts/spec.mjs)
    └── templates/   #   spec-retired-conventions.md
```

A package's top-level `rules/`, `agents/` and `skills/` directories are what the engine wires into the matching manifest sources; `templates/` and `references/` ride along in the store for an agent to read. Every artifact by name: [`packs/README.md`](../packs/README.md). Always take `core`; add `spec` only for spec-driven projects.

## Choosing a mode

| Mode | Best for | Project footprint |
|---|---|---|
| A. Registry package | The default - names resolve through a trusted registry, versions from git tags | `registries:` + `packages:` in `intelligence.yaml`, plus the lock |
| B. Explicit source | One-off installs, forks, or pinning a branch without trusting a registry | `packages:` in `intelligence.yaml`, plus the lock |
| C. Global skills (Claude Code) | Individuals who want the skills everywhere | None |
| D. Plain copy | Projects that want to own and adapt the content | Copied files, fully yours |

Modes A and B need the [Intelligence CLI](https://github.com/ainova-systems/intelligence) (`npm install -g @ainova-systems/intelligence`; Node.js 18+, git, bash, awk).

## Mode A - registry package (recommended)

Trust the registry once, then install either package by name:

```bash
intelligence init --targets claude              # claude, cursor, copilot, codex, pi, opencode, antigravity
intelligence registry add https://github.com/ainova-systems/intelligence-dev-packs.git
intelligence package add @ainova-systems/core
intelligence package add @ainova-systems/spec   # spec-driven projects only
```

The result in `intelligence.yaml`:

```yaml
registries:
  - "https://github.com/ainova-systems/intelligence-dev-packs.git"

packages:
  "@ainova-systems/core":
    version: "^0.17.0"          # what package add records: ^ and the newest tag
  "@ainova-systems/spec":
    version: "^0.17.0"
```

### How resolution works

- **A registry is the only resolver for a name.** There is no built-in catalog and no name-to-repository guessing, so a name nobody explicitly trusted can never turn into an install from a guessed URL. `registry add` verifies the repository publishes an `index.yaml` at its root - this repository's maps both package names to their `packs/<name>` subpath.
- **Registries are an ordered trust list**; the first one declaring a name wins.
- **Versions are stable git tags** (`x.y.z`, optionally `v`-prefixed). A range (`^0.17.0`, `~0.17.0`, an exact version, or `latest`) selects the highest matching stable tag; prerelease tags are invisible to ranges, and GitHub Releases are not consulted.
- **Intent and resolution live in different files.** The manifest holds only the requested range or `ref:`; `intelligence.lock` holds the resolved URL, subpath, tag and commit SHA. Restoration after a fresh clone reads the lock alone - it never re-resolves or silently picks a newer tag.
- **Package content is not vendored.** It lands in the gitignored store at `.intelligence/packages/@ainova-systems/<name>/`, and each enabled adapter renders it into that tool's own files.
- **Package sources precede project sources**, so a same-named artifact in your own `intelligence/rules|agents|skills` overrides package content deliberately.

### Update

```bash
intelligence update --preview          # what would change: CLI, project, packages
intelligence update @ainova-systems/core --apply
```

Read this repository's [CHANGELOG.md](../CHANGELOG.md) between versions for renamed or removed artifacts.

## Mode B - explicit source, no registry

Any package can be installed straight from a git source, with no registry involved:

```text
intelligence package add github:org/repo[#path]
intelligence package add git+<url>[@ref][#path]
```

For **this** repository there is a catch worth knowing: `github:org/repo` derives the package name from the repository, and a project may hold only one version of a name - so installing both packs this way would collide on `@ainova-systems/intelligence-dev-packs`. Name each one explicitly:

```bash
intelligence package add github:ainova-systems/intelligence-dev-packs#packs/core --name @ainova-systems/core
intelligence package add github:ainova-systems/intelligence-dev-packs#packs/spec --name @ainova-systems/spec
```

Use `git+<url>@<ref>` to pin a branch or commit instead of a version range. That is the mode's real purpose: a registry package must be versioned, while an explicit source may deliberately track a ref.

## Mode C - global skills (Claude Code)

```bash
git clone https://github.com/ainova-systems/intelligence-dev-packs
bash intelligence-dev-packs/scripts/claude-install-global.sh          # every pack
bash intelligence-dev-packs/scripts/claude-install-global.sh core     # core only
```

The script copies each selected pack's `skills/*` folders into `~/.claude/skills/` (override with `CLAUDE_SKILLS_DIR`). Re-run after pulling a new version; it replaces installed skills in place.

Notes:
- Global mode installs skills only. Rules and agents are project-level; add them per project via Mode A / B / D.
- Without a project profile, skills auto-detect the branch model and commands from the repository and ask when ambiguous.

Uninstall: delete the installed skill folders from `~/.claude/skills/`.

## Mode D - plain copy

```bash
cp -r intelligence-dev-packs/packs/core/rules/*      my-project/intelligence/rules/
cp -r intelligence-dev-packs/packs/core/agents/*     my-project/intelligence/agents/
cp -r intelligence-dev-packs/packs/core/skills/*     my-project/intelligence/skills/
cp -r intelligence-dev-packs/packs/core/templates    my-project/intelligence/templates
cp -r intelligence-dev-packs/packs/core/references   my-project/intelligence/references
# add packs/spec/* the same way for spec-driven projects
```

The copy is yours: adapt the text, drop what does not apply. The cost is that updates become a manual diff. Keep the domain prefixes for a clean upgrade path back to Mode A/B later.

## Migrating from intelligence-sync

The vendored intelligence-sync engine is archived at v0.10.4 and replaced by the CLI. A project still on it - a `config.yaml` plus a `sync/` directory, with the packs declared under `packs:` and referenced as `@intelligence-dev-packs/packs/<pack>/rules` - converts in place:

```bash
npm install -g @ainova-systems/intelligence
cd your-project
intelligence init --preview      # inspect the conversion, write nothing
intelligence init --apply
```

Conversion preserves project-owned sources and replaces the vendored engine content: `config.yaml` becomes `intelligence.yaml` plus a committed `intelligence.lock`. Afterwards, re-add the packs as packages (Mode A) so they are versioned and locked rather than mirrored, and delete the old mirror directory.

Review and commit the resulting diff. In CI, an alignment that has not been applied locally is refused rather than hidden inside generated output.

## The project profile (optional)

Skills work with no profile: they auto-detect the branch model from git and the commands from the project manifests, and ask once when something is genuinely ambiguous. That alone makes one set of packs serve a `main`-only trunk repo, a `master`-only repo, and a `master` + `develop` gitflow repo without editing any artifact.

To pin those answers (so nothing is re-detected or re-asked), run `dev-init`. It reads this pack's `templates/dev-project-profile.md` as the schema (in this repository: [`packs/core/templates/dev-project-profile.md`](../packs/core/templates/dev-project-profile.md)), inspects the repo, and writes a filled `dev-project-profile.md` into a rules source, where it then rides as an always-on rule. The user never copies or hand-edits it; auto-detection is the fallback for any project that has none.

## Models, effort and tool access

The packs name no model. Each agent declares a `tier:`, and an `effort:` where the routing convention in [CONTRIBUTING.md](../CONTRIBUTING.md) calls for one; the engine turns both, and `access:`, into each tool's own fields. Its conventions are the source for what every value becomes: [Tier mappings](https://github.com/ainova-systems/intelligence/blob/main/packages/sync/references/conventions.md#tier-mappings), [Effort mappings](https://github.com/ainova-systems/intelligence/blob/main/packages/sync/references/conventions.md#effort-mappings), [Access mappings](https://github.com/ainova-systems/intelligence/blob/main/packages/sync/references/conventions.md#access-mappings).

- **A different model for a tier.** Set `models.<tool>.<tier>` in `intelligence.yaml`, for example `models.claude.light: <model id>`. It applies to every agent of that tier in the project, package agents included - there is no per-agent override - and sync reports it whenever it differs from the engine's default. To route one pack agent differently, add a project agent with the same name: project sources override package content.
- **Effort reaches Claude Code and Codex.** Copilot, Cursor, OpenCode, Antigravity and Pi keep their own setting. An agent without `effort:` runs at the level of the session that started it, and in Claude Code the `CLAUDE_CODE_EFFORT_LEVEL` environment variable overrides a declared level. The engine renders `effort:` from version 0.19.0.
- **Forked skills.** A skill with `context: fork` runs in Claude Code as a subagent of its `agent:`, at that agent's tier and effort. A tool that does not fork skills runs it in the calling session, at the session's own model and effort.
- **Read-only agents that run commands.** `dev-code-reviewer` and `dev-qa-verifier` are `access: readonly` but need a shell: the reviewer reads the change with git, and the verifier runs the declared steps. An `access: readonly` agent has no shell in Copilot, OpenCode and Antigravity, so the pack's reviewer and QA verifier cannot run commands there. They move to `access: runner` in the pack release that requires the CLI version shipping engine [decision 0026](https://github.com/ainova-systems/intelligence/blob/main/decisions/0026-one-access-vocabulary-across-tools.md). Claude Code and Codex keep their shell today, so until that release run `git-review-pr` and `git-verify-pr` from one of those two.

## Naming and collision guarantees

- Every artifact carries a domain prefix (`dev-`/`git-`/`spec-`). Project artifacts keep their own names; the reserved `intelligence-` prefix stays owned by the engine's meta-skills.
- The packs never reference project internals; project rules may freely reference pack artifacts by name.
- To override a pack rule, add a project rule that states the exception and takes precedence by being more specific. Do not edit the packs in place.

## Uninstall

```bash
intelligence package remove @ainova-systems/spec
intelligence package remove @ainova-systems/core
intelligence registry remove https://github.com/ainova-systems/intelligence-dev-packs.git
```

Modes C and D are removed by deleting the copied folders.

## Compatibility matrix

| Consumer | Modes | Notes |
|---|---|---|
| Intelligence CLI | A, B, C, D | Registry or explicit source; renders every enabled adapter |
| Claude Code directly | C, D | Mode C for skills; Mode D into `.claude/` for rules and agents |
| Any AGENTS.md reader | A, B, D | Via the engine's `agents` target |
| Other SKILL.md-compatible tools | A, B, C, D | Skills follow the open SKILL.md folder convention |
| intelligence-sync (archived, v0.10.4) | - | Convert with `intelligence init --preview` / `--apply` |
