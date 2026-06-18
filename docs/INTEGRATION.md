# Integration Guide

How to attach intelligence-dev-packs to a project, configure it, keep it updated, and remove it.

## Pack layout

Content lives under `packs/<name>/`, each a self-contained bundle:

```
packs/base/
├── rules/        # always-on conventions (dev-*)
├── agents/       # role personas (dev-*)
├── skills/       # procedures (dev-*)
└── templates/    # dev-project-profile.md
```

`base` is the default pack. Every consumption method points at `packs/<name>/{rules,agents,skills}`.

## Choosing a mode

| Mode | Best for | Project footprint |
|---|---|---|
| A. Remote source | intelligence-sync with `git+` support; zero-footprint, config-only | Three config entries |
| B. Git submodule | Offline / air-gapped CI; vendored-in-tree | One submodule + config entries |
| C. Global skills (Claude Code) | Individuals who want the skills everywhere | None |
| D. Plain copy | Projects that want to own and adapt the content | Copied files, fully yours |

## Mode A - remote source

The newest intelligence-sync resolves a source entry of the form:

```
git+<url>[@<ref>][#<subpath>]
```

into a clone, and reads the rules / agents / skills from `<subpath>` inside it. Point each source type at the matching directory of the pack:

```yaml
sources:
  rules:
    - "intelligence/rules"
    - "git+https://github.com/ainova-systems/intelligence-dev-packs@v0.1.0#packs/base/rules"
  agents:
    - "intelligence/agents"
    - "git+https://github.com/ainova-systems/intelligence-dev-packs@v0.1.0#packs/base/agents"
  skills:
    - "intelligence/skills"
    - "intelligence/sync/skills"
    - "git+https://github.com/ainova-systems/intelligence-dev-packs@v0.1.0#packs/base/skills"
```

Then `bash intelligence/sync/scripts/sync.sh`.

### URL rules (important)

- **Scheme is required**: `https://`, `http://`, `ssh://`, `git://`, or `file://`. RCE-capable transports (`ext::`, `fd::`) are rejected - the engine warns and skips.
- **`#<subpath>`** is everything after the first `#` - the directory inside the clone holding that source type (`packs/base/rules`).
- **`@<ref>`** is the segment after the last `@` in the post-scheme portion, accepted only if it contains **no `/`**. So pin with a **tag, SHA, or slashless branch**. A branch name containing `/` (e.g. `feature/x`) cannot be expressed via `@` - use a tag or SHA. Userinfo URLs work: in `ssh://git@host/owner/repo@v0.1.0#packs/base/rules` the ref is `v0.1.0`, not the `git@` userinfo.
- **Pinning is recommended.** An unpinned URL tracks the default branch and changes under you; a tag or SHA is reproducible.

### Selecting a different pack

Change the subpath: `#packs/<name>/rules`. Combine packs by listing several remote entries.

### Update

Bump the `@ref` to a newer tag and re-sync. Read the pack `CHANGELOG.md` between versions for renamed or removed artifacts.

## Mode B - git submodule

For offline / air-gapped CI or vendored-in-tree setups. Works with intelligence-sync 0.3.1 or later.

```bash
git submodule add https://github.com/ainova-systems/intelligence-dev-packs intelligence/dev-pack
cd intelligence/dev-pack && git checkout v0.1.0 && cd -   # pin
git add intelligence/dev-pack
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

The `submodules:` entry keeps the sync engine's unsynced-directory warning quiet for the pack path. Then `bash intelligence/sync/scripts/sync.sh`.

Update: `git submodule update --remote intelligence/dev-pack` (or check out a newer tag), then re-sync. Clone note for teammates / CI: `git clone --recurse-submodules`, or `git submodule update --init` after a plain clone.

## Mode C - global skills (Claude Code)

```bash
git clone https://github.com/ainova-systems/intelligence-dev-packs
bash intelligence-dev-packs/scripts/install-global.sh        # base pack
bash intelligence-dev-packs/scripts/install-global.sh all    # every pack
```

The script copies each selected pack's `skills/*` folders into `~/.claude/skills/` (override with `CLAUDE_SKILLS_DIR`). Re-run after pulling a new version; it replaces installed skills in place.

Notes:
- Global mode installs skills only. Rules and agents are project-level; add them per project via Mode A / B / D.
- Without a project profile, skills auto-detect the branch model and commands from the repository and ask when ambiguous.

Uninstall: delete the installed skill folders from `~/.claude/skills/`.

## Mode D - plain copy

```bash
cp -r intelligence-dev-packs/packs/base/rules/*  my-project/intelligence/rules/
cp -r intelligence-dev-packs/packs/base/agents/* my-project/intelligence/agents/
cp -r intelligence-dev-packs/packs/base/skills/* my-project/intelligence/skills/
```

The copy is yours: adapt the text, drop what does not apply. The cost is that updates become a manual diff. Keep the `dev-` prefix for a clean upgrade path back to Mode A/B later.

## The project profile

Every skill resolves project specifics in a fixed order:

1. **Learn from the project** - the existing structure and the closest shipped sibling artifact are the template.
2. **Profile**: a rule file named `dev-project-profile.md` in the project's rules sources. Template: [`packs/base/templates/dev-project-profile.md`](../packs/base/templates/dev-project-profile.md).
3. **Ask once**, then suggest persisting the answer into the profile.

This is what makes one pack serve a `main`-only trunk repo, a `master`-only repo, and a `master` + `develop` gitflow repo without editing any artifact.

## Naming and collision guarantees

- Every artifact in a pack starts with that pack's prefix (`dev-` for base). Project artifacts keep their own names; the reserved `intelligence-` prefix stays owned by the sync engine's meta-skills.
- The pack never references project internals; project rules may freely reference pack rules and skills by name.
- To override a pack rule, add a project rule that states the exception and takes precedence by being more specific. Do not edit the pack in place.

## Compatibility matrix

| Consumer | Modes | Notes |
|---|---|---|
| intelligence-sync with `git+` | A, B, D | Remote sources; all adapters |
| intelligence-sync 0.3.1+ | B, D | Submodule / copy source paths |
| Claude Code directly | C, D | Mode C for skills; Mode D into `.claude/` for rules and agents |
| Any AGENTS.md reader | A, B, D | Via the intelligence-sync `agents` target |
| Other SKILL.md-compatible tools | A, B, C, D | Skills follow the open SKILL.md folder convention |
