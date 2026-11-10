<!--
Pack default PR template. Used by git-open-pr when the project has no
.github/PULL_REQUEST_TEMPLATE.md (or platform equivalent). The reader has no
context and little time: they get the reason and the effect in under a minute.
Fill every section and replace every hint comment; write "None" where a
section genuinely does not apply. Each comment sets that section's ceiling.
The body is public: git-commit-conventions sets its register and what it may
contain.
-->

## Why
<!-- Prove the change is needed: a reader who never saw the task must agree.
     One or two sentences per line, and no solution here.
     Who and where: who met this, by role and organisation and never by a
       person's name, and where - the part of the product, process or pipeline,
       and the environment. Work nobody reported names who needs it.
     What triggered it: what they did, and what happened instead of what they
       expected.
     Why it must change: what is lost, or stays blocked, if nothing changes.
       "It is a defect" and "the ticket asks for it" are not reasons. -->
- **Who and where:**
- **What triggered it:**
- **Why it must change:**

## Sources
<!-- One line per record this change answers, fully or partly (say "partly"),
     so the original opens in one click: the tracker items and work-item ids it
     answers, and the defect records it closes. "None" when no record stands
     behind it. -->
None

## Impact
<!-- What a person using the project will notice, in one to three sentences,
     not how it is built. New or changed behaviour: what they now see or do
     differently, and where. A fix: "No flow change.", then what now works as
     it was meant to. Nothing visible (tooling, pipeline, internals): "No
     user-visible change.", then who notices instead. -->

## Changes
<!-- One row per thing that behaves differently, most visible first. Target is
     the feature, command, endpoint or pipeline step in the reader's words, not
     a file or class. Before and After are one short sentence each ("did not
     exist" is fine). Not a file list or a restatement of the diff;
     documentation updates share one row. -->
| Target | Before | After |
|---|---|---|
|  |  |  |

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
