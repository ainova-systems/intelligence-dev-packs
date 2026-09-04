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
- Rules: a markdown file in `rules/` with `description:` frontmatter. Pack rules ship without `paths:` scoping (a host project cannot predict its own paths from here), so every rule is always-on - keep them compact, they are inlined into every agent's context on every task. A host project may add `paths:` when it vendors a rule that only matters on one surface.
- Agents: a markdown file in `agents/` with `description:`, `tier:` (`heavy` | `standard` | `light`), `access:` (`full` | `readonly`), optional `skills:` frontmatter. Persona, knowledge sources, and boundaries only; procedures belong in skills. Pick `tier` by failure mode: `heavy` where the output is judgment no gate checks, `standard` where a hard gate catches the error.
- Skills: a folder in `skills/` whose name matches the `name:` frontmatter of its `SKILL.md`. Self-contained steps, a `Verify` section, a `Scope / hand-off` section, and a `Constraints` section for true invariants. Resolve project specifics via the profile resolution order (profile, then detection, then ask once and record). Skills with side effects whose timing the owner controls (merge, release) carry `disable-model-invocation: true`.
- Frontmatter follows the [intelligence-sync conventions](https://github.com/ainova-systems/intelligence-sync) so the pack syncs cleanly to every supported tool.

## Writing for current models

- **Do not instruct what the model already does.** No "double-check your answer", "re-verify before responding", "review your own output" - current models self-verify by default, and the instruction compounds with the behavior at token cost with no quality gain. A `Verify` section survives because it runs a real command or checks an observable artifact; a self-critique loop does not.
- **Descriptions are the selection surface**: third person, key use case first, exclusion clause second, mechanics last. A missing description makes an artifact invisible.
- **Write to the model intersection.** No "use proactively" or delegation encouragement (the delegation axis inverts between model families); no instruction to show or reproduce reasoning; state each artifact's scope explicitly rather than relying on generalization.
- **Delete no-op lines.** A sentence instructing what the model does by default is pure cost; whether a line is a no-op is settled by running the skill without it, not by debate. Hunt sentence by sentence and delete whole sentences rather than trimming words.
- **Prompt the positive.** A prohibition drags the forbidden behavior into context; state the target behavior instead, and keep prohibitions for the few true invariants in `Constraints`.
- **A prose prohibition is a request, not a guarantee.** Every hard NEVER in a rule or skill should have a deterministic backstop where one is possible - see `docs/enforcement.md` for the mapping.

## Adding a domain or a pack

- **New domain** in an existing pack: add its prefix to `KNOWN_PREFIXES` in `scripts/validate-pack.sh`, then name artifacts `<prefix>-...`.
- **New pack** (a separate adoption unit, e.g. a stack pack `react`): create `packs/<name>/` with `rules/`, `agents/`, `skills/` (and `templates/` if it ships a profile); add a row to `packs/README.md` and the root README. `bash scripts/validate-pack.sh` must pass (it validates every pack).

Split by adoption boundary, not by concern: a new pack is justified only when someone would genuinely install it without the rest.

## Workflow

1. Branch from `main`.
2. Make the change; run `bash scripts/validate-pack.sh`.
3. Update `CHANGELOG.md` under `[Unreleased]` in the same change.
4. Open a PR. Commit messages: one line, capital first letter, past tense, no `Co-Authored-By` or other generated trailers.

## Releases

Cut by the maintainer, from `main`, tagged `vX.Y.Z`. Every PR fills `[Unreleased]`, so a release mostly promotes it - but the section is first reconciled against `git log <last-tag>..HEAD`, so nothing that shipped is missing from it.

1. Promote `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`, keeping the one-line headline under the heading. SemVer; pre-1.0, breaking changes bump the minor.
2. Commit the promotion to `main`.
3. Tag it annotated (`vX.Y.Z`, message `X.Y.Z - <headline>`) and push the tag.
4. `gh release create vX.Y.Z --verify-tag --notes-file <the new section>`.

## Code of conduct

Be professional and constructive. Disagreements are about content, never people.
