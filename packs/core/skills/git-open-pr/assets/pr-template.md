<!--
Pack default PR template. Used by git-open-pr when the project has no
.github/PULL_REQUEST_TEMPLATE.md (or platform equivalent). Fill every section;
delete a section only if it is genuinely not applicable. Each comment sets that
section's ceiling. The body is public: git-commit-conventions says what it may
contain.
-->

## Risk & Size
<!-- Keep one value per line; delete the others. -->
- **Risk:** Low / Medium / High
  <!-- Low: docs, isolated/non-prod, easily reverted. Medium: shared logic or several areas. High: DB migrations, auth/permissions, money, infra/deploy, hard to revert. -->
- **Size:** Small / Medium / Large
  <!-- Small: a few lines or files. Medium: several files / one feature. Large: broad or cross-cutting change. -->

## Why
<!-- One or two sentences: the problem this change answers, readable without the
     task, ticket or chat. -->

## What
<!-- One or two sentences: what the change does about it. -->

## Changes
<!-- Up to five short bullets: what moved and in which area. Not a file list or
     a restatement of the diff. -->
-

## Manual Verification
<!-- Steps that validate the RESULT, not that CI passed; git-verify-pr executes
     them. Each names its starting state (the environment's default included,
     when the step needs another; the role, where behaviour differs by one) and
     an expected result the change cannot falsify - the filter whose
     output must be empty, not a count. A step needing a branch or a commit
     makes them in a throwaway repository. -->
-

## Automated Gates
<!-- One line per test file or suite: what it asserts and the command that runs
     it. "None" only when there is no automated coverage. -->
-

## Deployment notes
<!-- Migrations, env/secret changes, rebuilds, redeploys, follow-ups. "None" if not applicable. -->
None
