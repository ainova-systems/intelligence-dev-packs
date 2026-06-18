# Packs

Two ideas that are deliberately **decoupled**:

- **Pack** (`packs/<name>/`) is an *adoption unit* - what you install and version together.
- **Domain prefix** (`dev-` / `git-` / `spec-`) is a *namespace* on each artifact - what keeps names clear and collision-free in the flattened tool output.

A pack may hold more than one domain, and a domain stays stable even if packs are re-grouped later. That decoupling is what keeps the layout changeable: artifacts are identified by their domain prefix, not by which pack folder they currently sit in.

| Pack | Domains | Scope | Depends on |
|---|---|---|---|
| **core** | `dev-`, `git-` | Universal - engineering discipline, session hygiene, git/PR/release. Install everywhere. | - |
| **spec** | `spec-` | Opt-in - spec-driven development (plan, execute, docs). | core |

## Selecting a pack

- **Remote source** (intelligence-sync `git+` support): the URL `#subpath` selects the pack, e.g. `...#packs/core/rules` (+ `...#packs/spec/rules` to add spec).
- **Submodule / copy**: point `sources:` at `…/packs/<name>/{rules,agents,skills}`.
- **Global install**: `bash scripts/install-global.sh` installs every pack; `… core` installs only core.

## Adding a pack or a domain

- **New domain inside an existing pack**: add the prefix to `KNOWN_PREFIXES` in `scripts/validate-pack.sh`, then name artifacts `<prefix>-...`.
- **New pack** (a genuinely separate adoption unit, e.g. a stack pack `react`): create `packs/<name>/` with `rules/`, `agents/`, `skills/`, add a row to this table and the root README, and ensure `bash scripts/validate-pack.sh` passes.

Keep packs by adoption boundary, not by concern: split only when someone would genuinely install one without the other.
