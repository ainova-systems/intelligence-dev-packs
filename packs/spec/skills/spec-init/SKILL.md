---
name: spec-init
description: "Scaffolds the in-repo docs substrate for spec-driven work and migrates existing documentation into it. Runs once, before the first spec."
argument-hint: "[docs root, e.g. docs | Documentation]"
agent: spec-architect
---

# Initialize the Spec-Driven Docs Substrate

Stand up the repository's shared knowledge base - the layer both humans and agents read - so the rest of the spec pack (`spec-create`, `spec-execute`) has somewhere to write. Safe and additive: nothing is deleted, drafts are inferred-until-confirmed, the owner approves before anything is authoritative.

## Resolve the target structure (learn, then profile, then default) - never impose

1. **Learn from the project first.** If the repo already has a docs structure (`docs/`, `Documentation/`, a docs rule, sibling feature docs), **adopt it** - search first, read two sibling docs, mimic don't invent. A mature existing structure wins over the default; do not restructure what already works.
2. **Profile** pins paths when ambiguous: `specs_dir`, `features_dir`, `rules_dir`, `decisions_dir`, `spec_grouping`.
3. **Greenfield default** = the ai-first-docs tree (see `references/docs-tree.md`): `docs/` with `model.md`, `glossary.md`, `rules/R-NNN-*.md`, `features/<feature>.md`, `specs/NNN-<feature>/{NNN-requirements,NNN-plan}.md`, `decisions/` (date-named `yyMMdd-*.md` by default), `architecture/`, `guides/`, `_inbox/`.

## The layered model (what this skill owns)

Ordered by how strongly each constrains an agent: an agent follows an executable check more reliably than prose.

- **Layer A - executable constraints** (lint/boundary/contract-test configs, `tests/`): the strongest. **Out of scope here** - set up separately.
- **Layer B - machine-readable rules & architecture knowledge** (rules-as-contracts `rules/R-NNN`, dependency map, decision log). **spec-init scaffolds these docs**; the agent entry router (`AGENTS.md`) stays owned by the sync engine - this skill only ensures it points at the docs tree, never clobbers it.
- **Layer C - shared knowledge base** (model, glossary, feature docs, specs, architecture, guides). **spec-init scaffolds and seeds this.**

## Steps

1. **Inventory** existing documentation: every `*.md`, wiki export, diagram, scattered note. Classify each as model / glossary / feature-behavior / flow / decision / architecture / guide / unclassified.
2. **Scaffold** the resolved tree - create only what is missing (folders + a `docs/README.md` index). Never overwrite an existing doc.
3. **Migrate safely - quarantine first.** Move all pre-existing, unclassified, or legacy content into `_inbox/` (the quarantine) so only the new structure reads as authoritative, then **reclassify one item at a time** with owner review: "how X works" notes -> `features/`, flow diagrams -> `architecture/diagrams/`, decisions -> `decisions/`. **Nothing is deleted**; reclassification is one-by-one, never bulk-auto.
4. **Draft the core docs from code**, marked `confirmed` / `inferred`: the domain model (`model.md`) and glossary (`glossary.md`) from types and field names; feature behavior baselines (`features/`) from the code's actual behavior today + EARS acceptance criteria; the dependency map from real imports; candidate numbered business rules (`rules/R-NNN`) the code already enforces. Apply the two `doc-types.md` gates before drafting each: name the consumer (a doc with no consumer and no gate rots from day one - skip the glossary when nothing will read it), and prefer generation where the stack can export its source (derived beats authored).
5. **Apply the naming principle.** Everything under the docs root is lowercase `kebab-case`; specs use zero-padded `NNN-` prefixes, ADRs are date-named by default (`yyMMdd-`, profile `adr_naming`); one concept, one name, no synonyms. The only uppercase files are `AGENTS.md` and `README.md` at the root (external standards require those names).
6. **Owner gate.** Present the scaffolded tree, the `_inbox/` contents pending reclassification, and the drafted docs. **Nothing is authoritative until the owner confirms** each draft; everything stays `inferred` until then.

## Verify

- The resolved tree exists; the index lists it; every pre-existing file is either reclassified or sitting in `_inbox/` (none lost); each drafted doc is marked confirmed/inferred; `AGENTS.md` was not overwritten.

## Scope / hand-off

- Creating a change spec inside the scaffolded `specs/` - `spec-create`.
- Layer-A executable constraints (lint, boundary, contract tests) - out of scope; separate setup.
- Keeping docs in sync with code afterwards - `spec-audit-docs`.

## Constraints
- Never delete or overwrite existing documentation - quarantine to `_inbox/`, reclassify one-by-one, owner-reviewed.
- Never impose the default tree over a working project structure - learn and adopt first.
- Honest caveat to state in the output: this pins down only what is already structured in code. Business rules living in config, database rows, or runtime-registered extensions are invisible to static drafting - flag them for functional tests or gradual move-into-code; never fabricate a rule the code does not show.
