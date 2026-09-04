# Integration Guide

How to attach intelligence-dev-packs to a project, configure it, keep it updated, and remove it.

## Packs, packages, and domains

Content is organized into **packs** (adoption units) under `packs/`, and each artifact carries a **domain prefix** (namespace). The two are decoupled - a pack may hold more than one domain. Each pack is published as an **Intelligence Package** under its own name:

```
packs/
├── core/            # @ainova-systems/core - universal, install everywhere
│   ├── rules/       #   dev-* (discipline) + git-* (vcs)
│   ├── agents/      #   dev-code-reviewer, dev-test-engineer
│   ├── skills/      #   dev-* + git-*
│   └── templates/   #   dev-project-profile.md, claude-settings.json
└── spec/            # @ainova-systems/spec - opt-in, depends on core
    ├── rules/       #   spec-*
    ├── agents/      #   spec-architect, spec-docs-writer
    └── skills/      #   spec-*
```

A package's top-level `rules/`, `agents/` and `skills/` directories are what the engine wires into the matching manifest sources; `templates/` rides along in the store for an agent to read. Always take `core`; add `spec` only for spec-driven projects.

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
intelligence init --targets claude              # claude, cursor, copilot, codex, pi, opencode
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
    version: "^0.4.0"
  "@ainova-systems/spec":
    version: "^0.4.0"
```

### How resolution works

- **A registry is the only resolver for a name.** There is no built-in catalog and no name-to-repository guessing, so a name nobody explicitly trusted can never turn into an install from a guessed URL. `registry add` verifies the repository publishes an `index.yaml` at its root - this repository's maps both package names to their `packs/<name>` subpath.
- **Registries are an ordered trust list**; the first one declaring a name wins.
- **Versions are stable git tags** (`x.y.z`, optionally `v`-prefixed). A range (`^0.4.0`, `~0.4.0`, an exact version, or `latest`) selects the highest matching stable tag; prerelease tags are invisible to ranges, and GitHub Releases are not consulted.
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
cp -r intelligence-dev-packs/packs/core/rules/*  my-project/intelligence/rules/
cp -r intelligence-dev-packs/packs/core/agents/* my-project/intelligence/agents/
cp -r intelligence-dev-packs/packs/core/skills/* my-project/intelligence/skills/
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

To pin those answers (so nothing is re-detected or re-asked), have your AI agent generate the profile once. It reads `.intelligence/packages/@ainova-systems/core/templates/dev-project-profile.md` as the schema (in this repository: [`packs/core/templates/dev-project-profile.md`](../packs/core/templates/dev-project-profile.md)), inspects the repo, and writes a filled `dev-project-profile.md` into a rules source, where it then rides as an always-on rule. The user never copies or hand-edits it; auto-detection is the fallback for any project that has none.

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
