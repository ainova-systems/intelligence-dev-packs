<!--
Pack default PR template. Used by spec-execute Phase E when the project has no
.github/PULL_REQUEST_TEMPLATE.md (or platform equivalent). Fill every section;
delete a section only if it is genuinely not applicable.
-->

## Risk & Size
<!-- Keep one value per line; delete the others. -->
- **Risk:** Low / Medium / High
  <!-- Low: docs, isolated/non-prod, easily reverted. Medium: shared logic or several areas. High: DB migrations, auth/permissions, money, infra/deploy, hard to revert. -->
- **Size:** Small / Medium / Large
  <!-- Small: a few lines or files. Medium: several files / one feature. Large: broad or cross-cutting change. -->

## What & why
<!-- One or two sentences: the problem this PR solves and why it is needed. -->

## Changes
<!-- Bullet list of the concrete changes, grouped by file or area where helpful. -->
-

## How to verify
<!-- Concrete steps a reviewer/QA runs to validate the RESULT, not just that CI passed.
     UI: which page to open and the observable result. API: the call and the expected field/value.
     Then list the gates you ran (build / lint / unit / integration / e2e). Screenshots if useful. -->
-

## Deployment notes
<!-- Migrations, env/secret changes, rebuilds, redeploys, follow-ups. "None" if not applicable. -->
None
