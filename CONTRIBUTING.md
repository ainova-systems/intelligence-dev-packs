# Contributing

Contributions are welcome: new skills, rule refinements, fixes to detection logic, better wording.

## The bar for pack content

Every artifact must pass one test: **would this apply unchanged to any repository?**

- No project names, stacks, file paths, or business logic. Stack-specific knowledge belongs in the host project's own intelligence sources, next to the pack.
- Project variability goes through the project profile (`templates/dev-project-profile.md`), never into artifact text. If a new skill needs a project-specific value, add a profile field and a detection fallback.
- Prefer one strong default over a menu of options. The pack encodes an opinionated practice, with the profile as the escape hatch.

## Conventions

- Every rule, agent, and skill name starts with `dev-`.
- Rules: a markdown file in `rules/` with `description:` frontmatter, no `paths:` scoping (pack rules are always-on), at most ~60 lines.
- Agents: a markdown file in `agents/` with `description:`, `tier:` (`heavy` | `standard` | `light`), `access:` (`full` | `readonly`), and optional `skills:` frontmatter. Persona, knowledge sources, and boundaries only; step-by-step procedures belong in skills.
- Skills: a folder in `skills/` whose name matches the `name:` frontmatter of its `SKILL.md`. Self-contained steps, a verification section, and explicit failure modes. Resolve project specifics via the profile resolution order (profile, then detection, then ask once).
- Frontmatter follows the [intelligence-sync conventions](https://github.com/ainova-systems/intelligence-sync) so the pack syncs cleanly to every supported tool.

## Workflow

1. Branch from `main`.
2. Make the change; run `bash scripts/validate-pack.sh`.
3. Update `CHANGELOG.md` under `[Unreleased]` in the same change.
4. Open a PR. Commit messages: one line, capital first letter, past tense, no `Co-Authored-By` or other generated trailers.

## Code of conduct

Be professional and constructive. Disagreements are about content, never people.
