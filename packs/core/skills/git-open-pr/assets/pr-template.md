<!--
Pack default PR template. Used by git-open-pr when the project has no
.github/PULL_REQUEST_TEMPLATE.md (or platform equivalent). Fill every section;
delete a section only if it is genuinely not applicable. Each section's comment
sets that section's ceiling - a change that needs less says less.
-->

## Risk & Size
<!-- Keep one value per line; delete the others. -->
- **Risk:** Low / Medium / High
  <!-- Low: docs, isolated/non-prod, easily reverted. Medium: shared logic or several areas. High: DB migrations, auth/permissions, money, infra/deploy, hard to revert. -->
- **Size:** Small / Medium / Large
  <!-- Small: a few lines or files. Medium: several files / one feature. Large: broad or cross-cutting change. -->

## Why
<!-- One or two sentences: the problem or request this change answers, in plain
     language a reader who does not remember the task, ticket, or chat can
     recover it from. The smallest statement that makes the change make sense -
     investigation notes and root-cause mechanics belong in Changes. -->

## What
<!-- One or two sentences: what this change does about that problem, in the same
     plain language as Why. Not how the code is wired - that is Changes. -->

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
