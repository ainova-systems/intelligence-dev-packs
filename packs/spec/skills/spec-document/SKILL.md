---
name: spec-document
description: "Writes or updates one documentation artifact - feature, rule, glossary, model, or architecture - from what the code actually does."
argument-hint: "<type: feature|rule|glossary|model|architecture> <name/topic>"
agent: spec-docs-writer
---

# Write a Docs Artifact

Maintain the knowledge substrate: add or correct a feature baseline, record a numbered business rule, add a glossary term, update the domain model, or refresh the architecture map. Drafts from code, marked confirmed/inferred; the owner approves. This is the engine the spec lifecycle uses to keep docs in sync (`spec-create`/`spec-close`/`spec-cancel`/`spec-execute` Phase D call into these conventions); it also runs standalone for ad-hoc doc maintenance.

## Resolve location and template

Learn from the project (read two sibling docs in the target folder; mimic, don't invent) -> profile (`features_dir` / `rules_dir` / `decisions_dir` / ...) -> ai-first-docs default. The type sets the template (`references/doc-types.md`):

- **feature** -> `features/<feature>.md`: what it does TODAY + EARS criteria; business language, no code / types / class-names.
- **rule** -> `rules/R-NNN-<slug>.md`: one atomic, numbered, testable business rule, paired 1:1 with a contract test.
- **glossary** -> a term in `glossary.md`: one precise meaning, relations to other terms.
- **model** -> `model.md`: domain aggregates and invariants.
- **architecture** -> `architecture/<...>`: condensed arc42 / dependency-map / golden-path, container/component level.

## Steps

1. **Search first.** A doc for this topic may exist - update it in place, never fork a parallel doc. One concept, one canonical doc.
2. **Read two siblings** to match structure and tone.
3. **Draft from code as ground truth**; mark each claim `confirmed` / `inferred`. Never state intent the code does not show - business rules in config, database rows, or runtime extensions are invisible to static drafting; flag them, don't fabricate.
4. **Naming**: kebab-case, `R-NNN` / `NNNN-` zero-padded, one concept one name.
5. **Owner gate**: present the draft; it stays `inferred` until the owner confirms.

## Verify

- One canonical doc per concept; the type template followed; every claim confirmed or marked inferred; cross-references resolve.

## Scope / hand-off

- A code change (not just docs) - `spec-create`. Decisions - `spec-decision`. Drift detection - `spec-audit-docs`.

## Constraints
- Never fork a parallel doc - update the canonical one.
- Never fabricate a rule or behavior the code does not show; mark `inferred` and flag config / DB / runtime intent for functional tests.
