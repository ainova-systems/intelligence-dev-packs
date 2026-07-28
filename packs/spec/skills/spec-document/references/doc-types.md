# Docs-substrate artifact types

The template per artifact type `spec-document` writes. All follow one rule: **business language, not implementation** - anything that breaks when a class is renamed or a field is added is the wrong content. Draft from code, mark `confirmed` / `inferred`, owner approves.

Two gates before any artifact is written:

- **No consumer, no doc.** Name the skill, gate, or recurring human read that will consume the artifact. A document with no consumer and no gate rots from the day it is written - a name map duplicating identifiers that already answer by their own key (a tracker answers by title, a schema by alias) is the classic offender.
- **Derived beats authored.** When an artifact is derivable from the schema, the types, or the code, generate it and regenerate it in the change that moves the source - a derived doc cannot drift. Hand-author only what no generator can know: intent, rationale, business language.

## feature -> `features/<feature>.md`

What the feature does TODAY (the behavior baseline), with durable EARS acceptance criteria. Sections (adapt to the project's existing feature-doc shape):

- **Overview** - what it is, who uses it, where it sits in the business process.
- **Roles & actors** - business roles, not technical principals.
- **Domain model** - the business terms this feature uses and how they relate (no field lists, no types).
- **Lifecycle & statuses** - statuses, transitions, who moves them (a state diagram where it helps).
- **Business rules** - numbered invariants in business language.
- **Permissions** - action x role table; business actions, no permission-constant names.
- **User scenarios** - golden path + important edge cases.
- **Integrations** - how it touches other features at the business-event level.
- **EARS acceptance criteria** - `WHEN <event> THE SYSTEM SHALL <response>`, durable.
- **Open questions / known limitations** - with status badges.

Must NOT contain: code, class / method / table / column / endpoint names, field types, FK / EF / CQRS detail.

## rule -> `rules/R-NNN-<slug>.md`

One atomic, numbered, testable business rule, paired 1:1 with a contract test. The rule states the invariant in business language plus the basis; the test enforces it. Example: `R-014 - A WorkAct cannot be completed while it has unsigned visits.`

## glossary -> a term in `glossary.md`

One precise meaning per term, relations to other terms, client / context-specific meanings separated. `- **Term** - one-sentence business definition; how it relates to other terms.` One concept, one name, no synonyms. The consumer gate applies with force here: a glossary that is only a name map between systems (design name to task title to code identifier) is a third registry that drifts - skip it and let each system answer by its own key.

## model -> `model.md`

The domain aggregate model and its invariants - the source of names and constraints. Aggregates, the entities inside them, and the invariants each aggregate guarantees. Updated from code; marks confirmed / inferred. Where the stack can export its schema, prefer generating this file from the export in the same change that moves the schema (the derived-beats-authored gate) - and state honest absences as facts ("no aggregate carries listable content yet") rather than filling the shape.

## architecture -> `architecture/<...>`

- `architecture.md` - condensed arc42, one section per heading.
- `dependency-map.md` - the allowed dependencies between modules; a human-readable source that compiles into a boundary check.
- `golden-path.md` - names the reference module to copy.
- `modules/<module>.md` - per-module shape.
- `diagrams/` - C4 container / component level only; low-level diagrams add little for an agent that already reads code.

## Status badges (where the project uses them)

`DONE` (shipped) · `PENDING` (scoped, not started) · `PARTIAL` · `TO BE VALIDATED` (scope / rule in doubt) · `OBSOLETE` / `NOT NEEDED` (deliberately dropped). Use next to the header and on individual rules / scenarios that are not yet stable.
