# Packs

Each pack is a self-contained bundle of `rules/`, `agents/`, `skills/`, and an optional `templates/` folder. A consuming project opts into one or more packs.

| Pack | Scope | Prefix |
|---|---|---|
| **base** (default) | The universal AI-first engineering workflow: spec-driven orchestration, reviews, gates, release. Stack-independent. | `dev-` |

`base` is the default pack: installed by `scripts/install-global.sh` with no arguments, and the pack most projects point their config at.

## Selecting a pack

- **Remote source** (intelligence-sync `git+` support): the URL `#subpath` selects the pack and type, e.g. `...#packs/base/rules`.
- **Submodule / copy**: point `sources:` at `…/packs/<name>/{rules,agents,skills}`.
- **Global install**: `bash scripts/install-global.sh <pack> [pack...]` (default `base`; `all` for every pack).

## Adding a pack

1. Create `packs/<name>/` with `rules/`, `agents/`, `skills/` (and `templates/` if it ships a profile).
2. Pick one prefix for the pack (`dev-`, `react-`, `sec-`, …); every artifact name in the pack starts with it. `validate-pack.sh` derives the prefix per pack and enforces it.
3. Add a one-line row to this table and to the root README.
4. `bash scripts/validate-pack.sh` must pass.

Keep packs orthogonal: universal practice belongs in `base`. A new pack exists only when its content is genuinely specific to a stack, framework, or concern that does not apply everywhere.
