# Reading the steps and bringing the change up

`git-verify-pr` states the rules in its Steps; this page holds the detail of steps 1 to 3, read at the point each one applies.

## Nothing behavioral

A section may legitimately declare that there is nothing behavioral here - a change whose steps are all commands anyone can run, or one that states why it changes no behavior. Execute what it declares; a change with nothing to exercise needs no environment and is not blocked by lacking one, the same reading `dev-run-tests` gives a docs-only change. What it is not is an empty section: `git-open-pr` refuses to leave one, and that refusal is what keeps "nothing to verify" from becoming a free pass.

## Standing checks

Profile `qa_checks` (`auto` - `docs/qa-checks.md` when it exists) points at the project's area-keyed checks: what must hold for any change touching an area, whatever the change says about itself. Match its globs against the PR's files (`gh pr view <pr> --json files --jq '.files[].path'`) and take every matching entry as a step of its own, alongside the declared ones.

They are **additional**: a PR that declared nothing is still blocked at step 1, because a change unwilling to say what working means for itself is not made verifiable by the project's standing list. No file, or no glob matches - nothing is added, and that is not a blocker.

## Environment

Profile `qa_env`:

- `preview` - the per-PR deployment URL from the PR's deployment status.
- `local` - profile `app_run`, then `app_url`.
- `auto` (default) - a preview when the PR has one, else local.
- `none` - the project has already stated that behavior cannot be exercised here.

Whatever came up is confirmed built from the head SHA and not from the base - verifying the base is worse than not verifying, because it produces a passing report.

## A project with no environment

Nothing resolves and detection finds nothing - that is a standing configuration gap, not an event of this PR, so it is resolved the way every other project value is: asked once, recorded in the profile. Two answers are valid and the profile holds both - set `qa_env` plus `app_run` / `app_url` (naming where test accounts come from, never the accounts themselves), or drop `ai:verified` from `pr_success_factors` because this project has nothing to exercise.

The stage itself never asks (`dev-working-with-people`): it returns `blocked (project)` naming both keys, with its recommendation, and its caller puts the question - a person's session asks and records it, `git-finalize-pr` stops retrying it and `git-complete-pr` puts it to the owner. Either way the answer lands in the profile once; an escalation that repeats identically on every PR without saying how to end it is noise.

## Missing capabilities

A capability this host lacks is replaced before it is escalated. A repository that exercises an interface in CI already ships a way to drive it - an end-to-end project with its own browser, a client with the project's auth, a preview whose sign-in offers seeded accounts - and reaching for one of those is this stage's work. The `blocked (step)` of step 4 is reached for a capability only once that search comes back empty, and its report says what was looked for. Handing the look to the owner because the host's own tool would not connect is not a verdict.
