# Packs

Two ideas that are deliberately **decoupled**:

- **Pack** (`packs/<name>/`) is an *adoption unit* - what you install and version together.
- **Domain prefix** (`dev-` / `git-` / `spec-`) is a *namespace* on each artifact - what keeps names clear and collision-free in the flattened tool output.

A pack may hold more than one domain, and a domain stays stable even if packs are re-grouped later. That decoupling is what keeps the layout changeable: artifacts are identified by their domain prefix, not by which pack folder they currently sit in.

| Pack | Domains | Scope | Depends on |
|---|---|---|---|
| **core** | `dev-`, `git-` | Universal - engineering discipline, session hygiene, git/PR/release. Install everywhere. | - |
| **spec** | `spec-` | Opt-in - spec-driven development (plan, execute, docs). | core |

## Catalog

### core - `dev-` domain (engineering discipline and session hygiene)

| Artifact | Kind | Role |
|---|---|---|
| `dev-skill-first` | rule | Check the skill catalog before improvising a workflow |
| `dev-context-engineering` | rule | Conventions, decisions, and domain knowledge live in the repo |
| `dev-verification-gates` | rule | Typecheck, lint, tests pass before every commit; gates never weakened |
| `dev-rollback-safety` | rule | Reversible migrations, feature flags, expand-contract sequencing |
| `dev-code-reviewer` | agent | Reviews changes for correctness, conventions, tests, security (read-only) |
| `dev-test-engineer` | agent | Test strategy and coverage across all levels |
| `dev-run-tests` | skill | Typecheck, lint, tests with scope detection and failure analysis |
| `dev-review-changes` | skill | Read-only diff review with severity verdict |
| `dev-handoff` | skill | Self-contained continuation prompt for a fresh session |

### core - `git-` domain (git / PR / release)

| Artifact | Kind | Role |
|---|---|---|
| `git-commit-conventions` | rule | Commit message format, push discipline, forbidden trailers |
| `git-workflow` | rule | Branch model, protected branches, feature-branch flow |
| `git-commit-push` | skill | Verified milestone commit and fast-forward push |
| `git-open-pr` | skill | Open a PR for the branch, using the repo template and profile knobs |
| `git-resolve-conflicts` | skill | Semantic conflict resolution, full gates after |
| `git-review-pr-comments` | skill | Triage reviewer feedback: fix, discuss, or decline with reason |
| `git-finalize-pr` | skill | CI to green plus every review comment handled - PR ready to merge |
| `git-merge-pr` | skill | After owner accept: guard-checked squash-merge, base sync, cleanup (owner-invoked only) |
| `git-create-release` | skill | Pending-step review, owner gate, version, changelog, tag per the project's release flow (owner-invoked only) |
| `git-scan-secrets` | skill | Credential scan over diff, tree, or history |

### spec - `spec-` domain (depends on core)

| Artifact | Kind | Role |
|---|---|---|
| `spec-discipline` | rule | When a change needs a spec, and the docs chain |
| `spec-orchestration` | rule | Multi-agent doctrine: consistency, delegation by pointers, outcome labels |
| `spec-architect` | agent | Authors specs, ADRs, module boundaries |
| `spec-docs-writer` | agent | Documentation and decision records in sync with code |
| `spec-init` | skill | One-time bootstrap: scaffold the in-repo docs substrate and migrate existing docs into it, drafting core docs from code |
| `spec-pull` | skill | Pull one tracker item into a spec, read-only, with drift keys; re-pull updates the same spec in place |
| `spec-create` | skill | Manual intake when no tracker item covers the change: grills the owner, keeps the brief verbatim, writes numbered requirements |
| `spec-plan` | skill | Writes the plan from existing requirements: coverage table, sibling citations, phases, checkboxed work steps |
| `spec-validate` | skill | Adversarial pre-execution fact-check of the plan against the repo; gaps become open questions |
| `spec-answer` | skill | Resolve a blocked spec's open questions with the developer; answers move with a `Changed:` line |
| `spec-approve` | skill | Autonomous mode: record the owner's gate-1 decision (`status: approved`), entering the queue |
| `spec-execute` | skill | Planned spec executed via parallel subagents; supervised - ends unstaged for developer review, autonomous - to an outcome-labeled PR |
| `spec-continue` | skill | Resume a mid-flight spec: inherited-work drift audit, then execution |
| `spec-execute-next` | skill | Autonomous mode: drain the approved queue - pick the highest-value spec, drive it end-to-end, close merged specs, reset |
| `spec-close` | skill | Post-merge: confirm shipped and docs reconciled, archive per convention |
| `spec-cancel` | skill | Retire a spec (cancelled / superseded) with a recorded reason; reconcile its draft docs |
| `spec-document` | skill | Write/update one docs artifact (feature, rule, glossary, model, architecture) from code |
| `spec-decision` | skill | ADR behind a three-condition gate, date-named by default |
| `spec-audit-docs` | skill | Docs claims audited against code: drift vs violation |

## Selecting a pack

- **Declared pack** (intelligence-sync 0.10.0+): declare the repo once under `packs:` and reference the subpath by name, e.g. `"@intelligence-dev-packs/packs/core/rules"` (+ `.../packs/spec/rules` to add spec). See the root [README](../README.md#how-it-lands-in-your-repository).
- **Submodule / copy**: point `sources:` at `…/packs/<name>/{rules,agents,skills}`.
- **Global install**: `bash scripts/claude-install-global.sh` installs every pack; `… core` installs only core.

## Adding a pack or a domain

- **New domain inside an existing pack**: add the prefix to `KNOWN_PREFIXES` in `scripts/validate-pack.sh`, then name artifacts `<prefix>-...`.
- **New pack** (a genuinely separate adoption unit, e.g. a stack pack `react`): create `packs/<name>/` with `rules/`, `agents/`, `skills/`, add a row to this table and the root README, and ensure `bash scripts/validate-pack.sh` passes.

Keep packs by adoption boundary, not by concern: split only when someone would genuinely install one without the other.
