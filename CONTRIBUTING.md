# Contributing

Contributions are welcome: new skills, rule refinements, fixes to detection logic, better wording, new packs.

## Repository layout

Content lives in packs under `packs/<name>/` (`rules/`, `agents/`, `skills/`, optional `templates/`). A **pack** is an adoption unit (`core` is universal, `spec` is opt-in); a **domain prefix** (`dev-`/`git-`/`spec-`) is a namespace on each artifact. The two are decoupled - a pack may hold several domains. Root holds the OSS furniture: README, LICENSE, CHANGELOG, `docs/`, `scripts/`, `.github/`.

## The bar for pack content

Every artifact must pass one test: **would this apply unchanged to any repository in the pack's scope?** For `core`, that means any repository at all; for `spec`, any spec-driven project.

- No project names, stacks, file paths, or business logic. Stack-specific knowledge belongs either in a dedicated pack or in the host project's own intelligence sources.
- Project variability goes through the project profile (`templates/dev-project-profile.md`), never into artifact text. If a new skill needs a project-specific value, add a profile field and a detection fallback.
- Prefer one strong default over a menu of options. The pack encodes an opinionated practice, with the profile as the escape hatch.

## Conventions

- Every rule, agent, and skill name starts with a known domain prefix (`dev-`/`git-`/`spec-`). The validator checks each artifact against that set; introduce a new domain by adding its prefix to `KNOWN_PREFIXES` in `scripts/validate-pack.sh`.
- Rules: a markdown file in `rules/` with `description:` frontmatter, no `paths:` scoping (pack rules are always-on). Keep them compact - they are inlined into every agent's context on every task.
- Agents: a markdown file in `agents/` with `description:`, `tier:` (`heavy` | `standard` | `light`), `access:` (`full` | `readonly`), optional `skills:` frontmatter. Persona, knowledge sources, and boundaries only; procedures belong in skills.
- Skills: a folder in `skills/` whose name matches the `name:` frontmatter of its `SKILL.md`. Self-contained steps, a `Verify` section, a `Scope / hand-off` section, and a `CRITICAL` section for true invariants. Resolve project specifics via the profile resolution order (learn, profile, ask once).
- Frontmatter follows the [intelligence-sync conventions](https://github.com/ainova-systems/intelligence-sync) so the pack syncs cleanly to every supported tool.

## Adding a domain or a pack

- **New domain** in an existing pack: add its prefix to `KNOWN_PREFIXES` in `scripts/validate-pack.sh`, then name artifacts `<prefix>-...`.
- **New pack** (a separate adoption unit, e.g. a stack pack `react`): create `packs/<name>/` with `rules/`, `agents/`, `skills/` (and `templates/` if it ships a profile); add a row to `packs/README.md` and the root README. `bash scripts/validate-pack.sh` must pass (it validates every pack).

Split by adoption boundary, not by concern: a new pack is justified only when someone would genuinely install it without the rest.

## Workflow

1. Branch from `main`.
2. Make the change; run `bash scripts/validate-pack.sh`.
3. Update `CHANGELOG.md` under `[Unreleased]` in the same change.
4. Open a PR. Commit messages: one line, capital first letter, past tense, no `Co-Authored-By` or other generated trailers.

## Code of conduct

Be professional and constructive. Disagreements are about content, never people.
