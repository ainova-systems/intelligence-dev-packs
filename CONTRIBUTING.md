# Contributing

Contributions are welcome: new skills, rule refinements, fixes to detection logic, better wording, new packs.

## Repository layout

Content lives in packs under `packs/<name>/` (`rules/`, `agents/`, `skills/`, optional `templates/` and `references/`). A **pack** is an adoption unit (`core` is universal, `spec` is opt-in); a **domain prefix** (`dev-`/`git-`/`spec-`) is a namespace on each artifact. The two are decoupled - a pack may hold several domains. Root holds the OSS furniture: README, LICENSE, CHANGELOG, `docs/`, `scripts/`, `.github/`.

## The bar for pack content

Every artifact must pass one test: **would this apply unchanged to any repository in the pack's scope?** For `core`, that means any repository at all; for `spec`, any spec-driven project.

- No project names, stacks, file paths, or business logic. Stack-specific knowledge belongs either in a dedicated pack or in the host project's own intelligence sources.
- Project variability goes through the project profile (core's `templates/dev-project-profile.md`; a pack with keys of its own keeps them in its `templates/<prefix>-project-profile.md`), never into artifact text. If a new skill needs a project-specific value, add a profile field and a detection fallback.
- Prefer one strong default over a menu of options. The pack encodes an opinionated practice, with the profile as the escape hatch.

## Conventions

- Every rule, agent, and skill name starts with a known domain prefix (`dev-`/`git-`/`spec-`). The validator checks each artifact against that set; introduce a new domain by adding its prefix to `KNOWN_PREFIXES` in `scripts/validate-pack.sh`.
- Rules: a markdown file in `rules/` with `description:` frontmatter. Pack rules ship without `paths:` scoping (a host project cannot predict its own paths from here), so every rule is always-on - keep them compact, they are inlined into every agent's context on every task. A host project may add `paths:` when it vendors a rule that only matters on one surface.
- Agents: a markdown file in `agents/` with `description:`, `tier:` and `access:` (`full` | `readonly`) frontmatter, plus `effort:` where the routing below calls for one. Persona, knowledge sources, and boundaries only; procedures belong in skills. An agent lists no `skills:`: Claude Code preloads every listed skill whole into each run of the agent, while a forked skill already arrives as the run's prompt and an inline skill never runs inside the agent.
- **Model and effort are routed on agents, never on skills.** `tier:` picks the model by failure mode: `heavy` where the output is judgment no gate checks, `standard` where a hard gate catches the error (the engine also has `frontier` and `light`; what each tier becomes in each tool is its [Tier mappings](https://github.com/ainova-systems/intelligence/blob/main/packages/sync/references/conventions.md#tier-mappings)). An agent sets no `model:` of its own; the tier is the routing field. `effort:` is written on an agent whose verdict earns a success factor (`git-workflow`), and there it is `high`, so a merge gate's evidence does not vary with the session that invoked the stage; every other agent leaves it out and runs at the session's level until an eval shows a better one (ROADMAP > Eval harness for pack content). A forked skill runs at its agent's tier and effort, and no skill declares `tier:`, `model:` or `effort:`: inline, the last two would change the session's own for the rest of the turn, and a model switch also drops the prompt cache. `scripts/validate-pack.sh` fails a tier, access or effort outside the engine's scales and each of these misplacements.
- Skills: a folder in `skills/` whose name matches the `name:` frontmatter of its `SKILL.md`. Self-contained steps, a `Verify` section, a `Scope / hand-off` section, and a `Constraints` section for true invariants. Resolve project specifics via the profile resolution order (profile, then detection, then ask once and record). A skill whose side effect is irreversible and outward-facing (merge, release) gates the **act**, not its own invocation: the command goes in `templates/claude-settings.json` under `permissions.ask`, so the owner is prompted at that command with the skill's guards already satisfied. A script the skill bundles that makes the act itself, with its guards inside - `git-create-release`'s release script, `scripts/release.mjs` - goes under `permissions.allow` instead and runs on the skill's owner gate. Blocking the invocation instead breaks any skill that orchestrates it and gates nothing the guards had not already checked.
- A skill whose inputs are files, git state and its arguments, that asks nothing mid-run and whose work is heavy reading, judging or test output, runs forked: `context: fork` beside its `agent:`, which names an agent a pack ships, and `background: false`, because its caller uses the result in the same turn (the validator warns where it is missing). `agent:` takes effect only with `context: fork`, and the validator fails it without one, so a skill whose input is the conversation, or whose job is a dialogue or an approval, runs inline and names no agent. A forked skill on a `readonly` agent has Read, Grep, Glob and Bash only - no skill tool, no subagents, no MCP tools - so its steps read another skill's `SKILL.md` instead of invoking it, and it never asks: it ends its result with the question for its caller (`dev-working-with-people`).
- Pack references: a markdown page in `references/` that skills and rules point to for detail they need only sometimes, such as `dev-external-writes`. The engine renders only rules, agents and skills, so a host reads the page from the package store, as it reads `templates/`. A page cited by name carries a domain prefix, and the validator resolves it like any artifact.
- References are written in backticks, and the validator depends on it - it has no other way to tell a reference from prose. A profile key appears as `` `qa_env` `` or `` `qa_env: auto` ``, and as ``profile `qa_env` `` when naming the lookup; written bare, it reads to the checker as a key nothing uses and fails with a message that names the wrong problem. An artifact is named the same way (`` `git-verify-pr` ``), and every such name must resolve to a real rule, agent, skill, template or reference - which is what turns a rename into a build failure instead of a dangling hand-off that reads like a working one.
- Frontmatter follows the [Intelligence engine conventions](https://github.com/ainova-systems/intelligence) so the pack renders cleanly to every supported tool.

## Writing for current models

- **Do not instruct what the model already does.** No instruction to check, re-verify or review its own answer - current models self-verify by default, and the instruction compounds with the behavior at token cost with no quality gain. A `Verify` section survives because it runs a real command or checks an observable artifact; a self-critique loop does not.
- **Descriptions are the selection surface**: third person, key use case first, exclusion clause second, mechanics last. A missing description makes an artifact invisible.
- **Write to the model intersection.** No delegation encouragement (the delegation axis inverts between model families); no instruction to show or reproduce reasoning; state each artifact's scope explicitly rather than relying on generalization.
- **Delete no-op lines.** A sentence instructing what the model does by default is pure cost; whether a line is a no-op is settled by running the skill without it, not by debate. Hunt sentence by sentence and delete whole sentences rather than trimming words.
- **Write the outcome, not a clause per review finding.** A fix restates the outcome so that it covers the case a review found. A clause added for each edge case collides with the next one, and the review rounds stop converging. Delete or merge before adding: every artifact stays within the size limits the [Intelligence engine conventions](https://github.com/ainova-systems/intelligence) set per artifact and per paragraph, which `scripts/validate-pack.sh` checks with the same numbers and reports each offender as a warning, never a failure. Detail that does not fit moves into the skill's `references/`, and every section another artifact cites stays in place.
- **Prompt the positive.** A prohibition drags the forbidden behavior into context; state the target behavior instead, and keep prohibitions for the few true invariants in `Constraints`.
- **A prose prohibition is a request, not a guarantee.** Every hard NEVER in a rule or skill should have a deterministic backstop where one is possible - see `docs/enforcement.md` for the mapping.

### Phrases the validator rejects

`scripts/validate-pack.sh` fails a pack file that carries one of these, in any letter case, outside backticks. This list is their only definition; a phrase is added here, never in the script.

- `double-check your answer`
- `re-verify before responding`
- `review your own output`
- `use proactively`

## Adding a domain or a pack

- **New domain** in an existing pack: add its prefix to `KNOWN_PREFIXES` in `scripts/validate-pack.sh`, then name artifacts `<prefix>-...`.
- **New pack** (a separate adoption unit, e.g. a stack pack `react`): create `packs/<name>/` with `rules/`, `agents/`, `skills/` (and `templates/` if it ships a profile: its own keys go in `templates/<prefix>-project-profile.md`, and the validator lets it read core's keys while core never reads its); add a row to `packs/README.md` and the root README; declare it in `index.yaml` so it is installable by name. `bash scripts/validate-pack.sh` must pass - it validates every pack, and fails a pack the registry index does not declare.

Split by adoption boundary, not by concern: a new pack is justified only when someone would genuinely install it without the rest.

## Workflow

1. Branch from `main`.
2. Make the change; run `bash scripts/validate-pack.sh` and `bash scripts/test-scripts.sh`, the two commands CI runs.
3. Update `CHANGELOG.md` under `[Unreleased]` in the same change.
4. Open a PR. Commit messages: one line, capital first letter, past tense, no `Co-Authored-By` or other generated trailers.

## Releases

Cut by the maintainer, from `main`, tagged `vX.Y.Z`. Every PR fills `[Unreleased]`, so a release mostly promotes it - but the section is first reconciled against `git log <last-tag>..HEAD`, so nothing that shipped is missing from it.

1. Promote `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`, keeping the one-line headline under the heading. SemVer; pre-1.0, breaking changes bump the minor.
2. Land the promotion on `main` through a `release/X.Y.Z` pull request.
3. `node packs/core/skills/git-create-release/scripts/release.mjs` - the script `git-create-release` ships - tags the merged cut annotated (`vX.Y.Z`, message `X.Y.Z - <headline>`), pushes the tag and creates the GitHub release from the section. `--commit <sha>` releases an earlier commit on `main`, `--dry-run` shows the plan. `.claude/settings.json` allows the repository's and the packs' scripts, so a session runs it without a prompt.

## Code of conduct

Be professional and constructive. Disagreements are about content, never people.
