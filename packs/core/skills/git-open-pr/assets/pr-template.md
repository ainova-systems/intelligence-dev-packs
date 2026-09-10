<!--
Pack default PR template. Used by git-open-pr when the project has no
.github/PULL_REQUEST_TEMPLATE.md (or platform equivalent). Fill every section;
delete a section only if it is genuinely not applicable.
-->

## Risk & Size
<!-- Keep one value per line; delete the others. -->
- **Risk:** Low / Medium / High
  <!-- Low: docs, isolated/non-prod, easily reverted. Medium: shared logic or several areas. High: DB migrations, auth/permissions, money, infra/deploy, hard to revert. -->
- **Size:** Small / Medium / Large
  <!-- Small: a few lines or files. Medium: several files / one feature. Large: broad or cross-cutting change. -->

## Why
<!-- One paragraph. Why this change exists, in plain language a reader who
     does not remember the task, ticket, or chat can use to recover the
     problem. A few sentences is enough to understand the issue. -->

## What
<!-- A few sentences: the solution this PR applies, in the same plain language
     as Why. What we are doing about that problem - not how the code is wired. -->

## Changes
<!-- The shape of the work: what moved, in which area, and why that is the
     approach. Core explanation only - not a file list, line-level mechanics,
     or a restatement of the diff. -->
-

## Manual Verification
<!-- Concrete steps a reviewer or QA runs to validate the RESULT, not that CI
     passed. UI: which page to open and the observable result. API: the call and
     the expected field/value. This is the section git-verify-pr executes. -->
-

## Automated Gates
<!-- Tests added or updated that cover this change: what they assert, and which
     command runs them. Name existing tests that already cover it when no new
     ones were needed. "None" only when there is no automated coverage. -->
-

## Deployment notes
<!-- Migrations, env/secret changes, rebuilds, redeploys, follow-ups. "None" if not applicable. -->
None
