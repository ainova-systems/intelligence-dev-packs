# Integration Guide

How to attach intelligence-dev-pack to a project, configure it, keep it updated, and remove it.

## Choosing a mode

| Mode | Best for | Project footprint |
|---|---|---|
| A. Submodule + intelligence-sync | Teams already running [intelligence-sync](https://github.com/ainova-systems/intelligence-sync); multi-tool setups | One submodule + three config lines |
| B. Global skills (Claude Code) | Individuals who want the skills everywhere without touching project repos | None |
| C. Plain copy | Projects that want to own and adapt the content | Copied files, fully yours |

Modes compose: a team can run Mode A in shared repos while individuals use Mode B for repos that have no intelligence setup yet.

## Mode A - submodule + intelligence-sync

Requires intelligence-sync 0.3.1 or later (the path-list `sources:` schema).

1. Add the submodule (any path works; `intelligence/dev-pack` keeps everything under one roof):

   ```bash
   git submodule add https://github.com/ainova-systems/intelligence-dev-pack intelligence/dev-pack
   ```

   Pin to a tag for reproducible setups:

   ```bash
   cd intelligence/dev-pack && git checkout v0.1.0 && cd -
   git add intelligence/dev-pack
   ```

2. Register the pack paths in `intelligence/config.yaml`:

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

   The `submodules:` entry keeps the sync engine's unsynced-directory warning quiet for the pack path.

3. Sync:

   ```bash
   bash intelligence/sync/scripts/sync.sh
   ```

   Pack rules are always-on, so the `agents` adapter inlines them into `AGENTS.md` and the Claude adapter copies them into `.claude/rules/`; skills and agents land in each enabled tool's native location.

4. Update later:

   ```bash
   git submodule update --remote intelligence/dev-pack   # or checkout a newer tag
   bash intelligence/sync/scripts/sync.sh
   ```

   Read the pack `CHANGELOG.md` between versions; renamed or removed artifacts are listed there.

Clone note for teammates and CI: `git clone --recurse-submodules`, or `git submodule update --init` after a plain clone.

## Mode B - global skills (Claude Code)

```bash
git clone https://github.com/ainova-systems/intelligence-dev-pack
bash intelligence-dev-pack/scripts/install-global.sh
```

The script copies every `skills/dev-*` folder into `~/.claude/skills/` (override the target with `CLAUDE_SKILLS_DIR`). Re-run it after pulling a new pack version; it replaces previously installed `dev-*` skills in place.

Notes:

- Global mode installs skills only. Rules and agents are project-level concepts; add them per project via Mode A or C.
- Without a project profile, skills auto-detect the branch model and commands from the repository and ask when ambiguous. Adding `dev-project-profile.md` to any project removes the questions there.

Uninstall: delete the `dev-*` folders from `~/.claude/skills/`.

## Mode C - plain copy

```bash
cp -r intelligence-dev-pack/rules/*  my-project/intelligence/rules/
cp -r intelligence-dev-pack/agents/* my-project/intelligence/agents/
cp -r intelligence-dev-pack/skills/* my-project/intelligence/skills/
```

The copy is yours: adapt the text, drop what does not apply, rename if needed. The cost is that pack updates become a manual diff. Keep the `dev-` prefix if you want a clean upgrade path back to Mode A later.

## The project profile

Every skill resolves project specifics in a fixed order:

1. **Profile**: a rule file named `dev-project-profile.md` anywhere in the project's rules sources. Template: [`templates/dev-project-profile.md`](../templates/dev-project-profile.md).
2. **Detection**: default branch from `git symbolic-ref refs/remotes/origin/HEAD`; an existing `origin/develop` implies gitflow; verification commands from project manifests (`package.json`, solution files, `Makefile`, `pyproject.toml`, `go.mod`); PR platform from the remote URL.
3. **Ask once**: anything still ambiguous is asked in the session, with a suggestion to persist the answer into the profile.

This is what makes one pack serve a `main`-only trunk repo, a `master`-only repo, and a `master` + `develop` gitflow repo without editing any artifact.

## Naming and collision guarantees

- Every pack artifact starts with `dev-`. Project artifacts keep their own names; the reserved `intelligence-` prefix stays owned by the sync engine's meta-skills.
- The pack never references project internals; project rules may freely reference pack rules and skills by name.
- If a project needs to override a pack rule, add a project rule that states the exception explicitly and takes precedence by being more specific. Do not edit the submodule in place.

## Compatibility matrix

| Consumer | Works | Notes |
|---|---|---|
| intelligence-sync >= 0.3.1 | yes | Source paths as shown above; all adapters (Claude, Cursor, Copilot, Codex, Pi, opencode, AGENTS.md) |
| Claude Code directly | yes | Mode B for skills; Mode C into `.claude/` for rules and agents |
| Any AGENTS.md reader | yes | Via the intelligence-sync `agents` target |
| Other SKILL.md-compatible tools | yes | Skills follow the open SKILL.md folder convention |
