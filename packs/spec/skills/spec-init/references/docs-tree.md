# Default docs tree (greenfield)

The structure `spec-init` scaffolds when a project has no existing docs structure to adopt. It follows the [ai-first-docs](https://github.com/ainova-systems/ai-first-docs) model; every folder maps to a recognized documentation standard, so nothing here is arbitrary.

```
repo-root/
├── AGENTS.md                 # Layer B: agent entry; thin router into docs/ (owned by the sync engine - do not clobber)
├── README.md                 # human entry to the repository
├── <lint · boundary · CI configs>   # Layer A: executable constraints (separate setup)
├── tests/                    # Layer A: contract, integration, per-module unit tests
└── docs/                     # Layer C + the human-readable sources of Layer B
    ├── README.md             # index: regenerated map of the whole tree
    ├── model.md              # domain aggregate model (source of invariants)
    ├── glossary.md           # ubiquitous language (source of names)
    ├── rules/R-NNN-*.md      # atomic business rules; one rule = one contract test (1:1)
    ├── features/<feature>.md # what a feature does TODAY (behavior baseline) + EARS criteria
    ├── specs/NNN-<feature>/  # change workflow (Spec-Driven Development)
    │   ├── NNN-requirements.md  # acceptance criteria (EARS) + source + provenance; carries the folder number
    │   └── NNN-plan.md          # coverage table, phases, checkboxed work steps, question + correction logs
    ├── decisions/            # ADRs, immutable; date-named yyMMdd-*.md by default (numbered NNNN-*.md via profile)
    ├── architecture/
    │   ├── architecture.md   #   condensed arc42 (one section per heading)
    │   ├── dependency-map.md #   -> compiled into a boundary check (Layer A)
    │   ├── golden-path.md    #   names the reference module
    │   ├── modules/<module>.md
    │   └── diagrams/         #   C4 container/component level
    ├── guides/               # Diataxis (human onboarding): tutorials/ how-to/ reference/ explanation/
    └── _inbox/               # QUARANTINE: unclassified/legacy content (non-authoritative)
```

## The chain: requirements -> feature -> spec -> plan -> code

Each link is found by convention, never by search. Feature docs (`features/`) describe current behavior with durable acceptance criteria. For a specific change, a spec (`specs/NNN-<feature>/`) narrows them to this task (`NNN-requirements.md`, EARS); the plan (`NNN-plan.md`) opens with the requirements-coverage table, points to the aggregates in `model.md`, the decisions in `decisions/`, and the rules in `rules/` it must not break, and carries the checkboxed work steps the agent ticks. Each step produces code plus its test; CI (Layer A) is the gate - a feature is "done" when the plan's work steps are fully ticked and tests are green before merge.

There is no separate `requirements/` folder: durable product requirements live as acceptance criteria in feature docs; one-off requirements live in specs. A full spec is **not** required for every change - only when a change crosses a module/context boundary or is highly iterative (write your threshold in `specs/README.md`).

## Grounding

`decisions/` - MADR 4.0; `guides/` - Diataxis; `architecture/` - arc42 prose + C4 diagrams; `specs/` - Spec-Driven Development; requirements use EARS notation; `AGENTS.md` - the cross-tool open standard, kept as a thin router.

## Adapting to an existing structure

When the project already has docs (e.g. a `Documentation/Features/<Group>/` tree with its own conventions), `spec-init` adopts that structure rather than this one - the folder names differ, the layered intent is the same. Map the project's folders onto the layers (its feature docs = Layer C feature baselines, its decision log = Layer B, its lint/test configs = Layer A) and scaffold only the missing pieces.
