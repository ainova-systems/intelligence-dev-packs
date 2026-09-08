# QA standing checks (schema)

> Optional. The project profile's `qa_checks` points here; `git-verify-pr` reads it after the steps a
> pull request declares and adds every entry whose area the PR touched. Entries are **additional**
> steps, never a substitute for the ones the PR states - a change still has to declare what "working"
> means for itself.
>
> This file answers one question the PR body and the feature docs cannot: **what must hold for any
> change touching this area, whatever the change says about itself.** Per-feature acceptance criteria
> do not belong here - they live in the feature docs, where a single source stays in sync with the
> code and `spec-audit-docs` checks it.

## The bar for an entry

An entry earns its place only if a defect that actually shipped would have been caught by it. A check
added because one session tripped over something once is the recency trap: the next run walks around
a pothole that is not there, and every run pays for it.

**This file should shrink.** A check that can be automated belongs in the test suite, not here -
`dev-verification-gates` and the profile's `verify` key are where an executable check lives. What
stays is what genuinely needs a person or an agent to observe: a behavior no assertion captures well,
a boundary that only shows up against a running system. Prose that nothing executes and nobody checks
is the least reliable form of a rule.

## Entries

Each entry is an area glob, the check, and the reason it exists. The reason is not decoration: it is
what lets a future reader decide the entry has stopped earning its place.

- **`<glob>`** - <the check, as an action with an observable expected result>
  - *Why*: <the failure this catches, ideally the one that shipped>

### Example shape

- **`**/auth/**`, `**/*Permission*`** - call one changed endpoint as an unauthenticated caller and as a
  caller lacking the required role; both are rejected, and the rejection does not leak whether the
  resource exists.
  - *Why*: authorization is enforced per call site, so a change that adds a call site can bypass it
    while every existing test stays green.

- **`**/migrations/**`** - run the migration against a copy of production-shaped data, then run the
  previous release's code against the migrated schema.
  - *Why*: a migration that only passes forward strands a rollback, and rollback is the one path never
    exercised until it is needed.
