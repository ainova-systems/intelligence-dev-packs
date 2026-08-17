# Integration Guide

How to attach intelligence-dev-packs to a project, configure it, keep it updated, and remove it.

## Packs and domains

Content is organized into **packs** (adoption units) under `packs/`, and each artifact carries a **domain prefix** (namespace). The two are decoupled - a pack may hold more than one domain.

```
packs/
├── core/            # universal - install everywhere
│   ├── rules/       #   dev-* (discipline) + git-* (vcs)
│   ├── agents/      #   dev-code-reviewer, dev-test-engineer
│   ├── skills/      #   dev-* + git-*
│   └── templates/   #   dev-project-profile.md
└── spec/            # opt-in - spec-driven development (depends on core)
    ├── rules/       #   spec-*
    ├── agents/      #   spec-architect, spec-docs-writer
    └── skills/      #   spec-*
```

Every consumption method points at `packs/<name>/{rules,agents,skills}`. Always take `core`; add `spec` only for spec-driven projects.

## Choosing a mode

| Mode | Best for | Project footprint |
|---|---|---|
| A. Declared pack | The default - intelligence-sync 0.10.0+; one declaration, mirrored into your tree | A `packs:` block plus the mirrored directory |
| B. Git submodule | Offline / air-gapped CI; vendored-in-tree | One submodule + config entries |
| C. Global skills (Claude Code) | Individuals who want the skills everywhere | None |
| D. Plain copy | Projects that want to own and adapt the content | Copied files, fully yours |

## Mode A - declared pack (recommended)

Declare the repository **once** under `packs:`, then reference its subpaths by name from as many `sources:` sections as need them. The url and the pin live in one place, so rules and skills can never drift onto different refs:

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
    - "@intelligence-dev-packs/packs/spec/rules"
    - "intelligence/sync/rules"
  agents:
    - "intelligence/agents"
    - "@intelligence-dev-packs/packs/core/agents"
    - "@intelligence-dev-packs/packs/spec/agents"
    - "intelligence/sync/agents"
  skills:
    - "intelligence/skills"
    - "intelligence/sync/skills"
    - "@intelligence-dev-packs/packs/core/skills"
    - "@intelligence-dev-packs/packs/spec/skills"
```

Then `bash intelligence/sync/scripts/sync.sh`. Drop the three `spec` lines for a project that has not adopted spec-driven development.

### Reference rules

- **Format** `@<pack>[/<subpath>]`. `<pack>` is a key under `packs:` - a handle, never a path component, so it must contain no `/`. The subpath is the directory inside the pack repo (`packs/core/rules`); omit it to use the repo root.
- **An undeclared pack fails the run** (exit 1, naming it). Unlike a missing local path, which only warns - the config claims to know that name, so a typo must not silently drop a whole rule set.
- **`mirror:` materializes the pack** at that path for you to commit, which is what turns a pin bump into a readable diff. Only referenced subpaths are copied, so the pack's README, CI, and tests never enter your tree. Omit the line and the pack is transient - cloned per run, gone at the end.
- **Pinning is recommended.** An unpinned `ref:` tracks the default branch and changes under you. `ref:` takes any branch name, including one containing `/`.

### Update

Bump `ref:` to a newer tag and re-sync; with a mirror, review the resulting diff. Read the pack `CHANGELOG.md` between versions for renamed or removed artifacts.

### Older engines (inline, anonymous pack)

Before 0.10.0 a source entry carried the whole spec inline - `git+<url>[@<ref>][#<subpath>]`, repeated per section. It still resolves, but the pack has no name and no mirror: always transient, and the url plus ref are duplicated in every entry.

## Mode B - git submodule

For offline / air-gapped CI or vendored-in-tree setups. Works with intelligence-sync 0.3.1 or later.

```bash
git submodule add https://github.com/ainova-systems/intelligence-dev-packs intelligence/dev-packs
cd intelligence/dev-packs && git checkout v0.2.0 && cd -   # pin
git add intelligence/dev-packs
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

The `submodules:` entry keeps the sync engine's unsynced-directory warning quiet for the pack path. Then `bash intelligence/sync/scripts/sync.sh`.

Update: `git submodule update --remote intelligence/dev-packs` (or check out a newer tag), then re-sync. Clone note for teammates / CI: `git clone --recurse-submodules`, or `git submodule update --init` after a plain clone.

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

## The project profile (optional)

Skills work with no profile: they auto-detect the branch model from git and the commands from the project manifests, and ask once when something is genuinely ambiguous. That alone makes one set of packs serve a `main`-only trunk repo, a `master`-only repo, and a `master` + `develop` gitflow repo without editing any artifact.

To pin those answers (so nothing is re-detected or re-asked), have your AI agent generate the profile once - it inspects the repo and writes a filled `dev-project-profile.md` (schema: [`packs/core/templates/dev-project-profile.md`](../packs/core/templates/dev-project-profile.md)) into a rules source, where it then rides as an always-on rule. The user never copies or hand-edits it; auto-detection is the fallback for any project that has none.

## Naming and collision guarantees

- Every artifact carries a domain prefix (`dev-`/`git-`/`spec-`). Project artifacts keep their own names; the reserved `intelligence-` prefix stays owned by the sync engine's meta-skills.
- The packs never reference project internals; project rules may freely reference pack artifacts by name.
- To override a pack rule, add a project rule that states the exception and takes precedence by being more specific. Do not edit the packs in place.

## Compatibility matrix

| Consumer | Modes | Notes |
|---|---|---|
| intelligence-sync 0.10.0+ | A, B, D | Declared `packs:` with optional `mirror:`; all adapters |
| intelligence-sync 0.3.1+ | B, D | Submodule / copy source paths; inline `git+` for a transient remote |
| Claude Code directly | C, D | Mode C for skills; Mode D into `.claude/` for rules and agents |
| Any AGENTS.md reader | A, B, D | Via the intelligence-sync `agents` target |
| Other SKILL.md-compatible tools | A, B, C, D | Skills follow the open SKILL.md folder convention |
