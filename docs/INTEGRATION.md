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
| A. Remote source | intelligence-sync with `git+` support; zero-footprint, config-only | A few config entries |
| B. Git submodule | Offline / air-gapped CI; vendored-in-tree | One submodule + config entries |
| C. Global skills (Claude Code) | Individuals who want the skills everywhere | None |
| D. Plain copy | Projects that want to own and adapt the content | Copied files, fully yours |

## Mode A - remote source

The newest intelligence-sync resolves a source entry of the form:

```
git+<url>[@<ref>][#<subpath>]
```

into a clone, and reads the rules / agents / skills from `<subpath>` inside it. Point each source type at the matching directory of each pack:

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

Then `bash intelligence/sync/scripts/sync.sh`. Drop the three `spec` lines for a project that has not adopted spec-driven development.

### URL rules (important)

- **Scheme is required**: `https://`, `http://`, `ssh://`, `git://`, or `file://`. RCE-capable transports (`ext::`, `fd::`) are rejected - the engine warns and skips.
- **`#<subpath>`** is everything after the first `#` - the directory inside the clone holding that source type (`packs/core/rules`).
- **`@<ref>`** is the segment after the last `@` in the post-scheme portion, accepted only if it contains **no `/`**. Pin with a **tag, SHA, or slashless branch**. A branch name containing `/` (e.g. `feature/x`) cannot be expressed via `@` - use a tag or SHA. Userinfo URLs work: in `ssh://git@host/owner/repo@v0.1.0#packs/core/rules` the ref is `v0.1.0`, not the `git@` userinfo.
- **Pinning is recommended.** An unpinned URL tracks the default branch and changes under you.

### Update

Bump the `@ref` to a newer tag and re-sync. Read the pack `CHANGELOG.md` between versions for renamed or removed artifacts.

## Mode B - git submodule

For offline / air-gapped CI or vendored-in-tree setups. Works with intelligence-sync 0.3.1 or later.

```bash
git submodule add https://github.com/ainova-systems/intelligence-dev-packs intelligence/dev-packs
cd intelligence/dev-packs && git checkout v0.1.0 && cd -   # pin
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

## The project profile

Every skill resolves project specifics in a fixed order:

1. **Learn from the project** - the existing structure and the closest shipped sibling artifact are the template.
2. **Profile**: a rule file named `dev-project-profile.md` in the project's rules sources. Template: [`packs/core/templates/dev-project-profile.md`](../packs/core/templates/dev-project-profile.md).
3. **Ask once**, then suggest persisting the answer into the profile.

This is what makes one set of packs serve a `main`-only trunk repo, a `master`-only repo, and a `master` + `develop` gitflow repo without editing any artifact.

## Naming and collision guarantees

- Every artifact carries a domain prefix (`dev-`/`git-`/`spec-`). Project artifacts keep their own names; the reserved `intelligence-` prefix stays owned by the sync engine's meta-skills.
- The packs never reference project internals; project rules may freely reference pack artifacts by name.
- To override a pack rule, add a project rule that states the exception and takes precedence by being more specific. Do not edit the packs in place.

## Compatibility matrix

| Consumer | Modes | Notes |
|---|---|---|
| intelligence-sync with `git+` | A, B, D | Remote sources; all adapters |
| intelligence-sync 0.3.1+ | B, D | Submodule / copy source paths |
| Claude Code directly | C, D | Mode C for skills; Mode D into `.claude/` for rules and agents |
| Any AGENTS.md reader | A, B, D | Via the intelligence-sync `agents` target |
| Other SKILL.md-compatible tools | A, B, C, D | Skills follow the open SKILL.md folder convention |
