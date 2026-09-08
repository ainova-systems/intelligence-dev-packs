---
name: git-verify-pr
description: "Executes a pull request's own verification steps against the running change and records what was observed. Behavioral QA - CI and the fix rounds are git-finalize-pr."
argument-hint: "[pr number]"
agent: dev-qa-verifier
---

# Verify the PR

Be the manual QA engineer the PR body asks for: run the steps it declares against the change actually running, and record what happened. Green CI is not verification - it proves the code builds and its tests pass, not that the described result occurs. Read-only on the code.

## Pre-flight

1. Resolve the PR and its head: `gh pr list --head <branch> --state open --json number,headRefOid --jq '.[0]'`. Every result below is bound to that SHA and names it.
2. A verification report for this exact SHA already exists - report it and stop; nothing changed to re-verify.

## Steps

1. **Read the steps.** `gh pr view <pr> --json body`, the section profile `verify_section` names (default `How to verify`; the repo template's equivalent heading when it uses another). Missing or empty - stop with `blocked (step)`: the PR body has to declare what "working" means. Never invent acceptance criteria the PR does not state.

   A section may legitimately declare that there is nothing behavioral here - a change whose steps are all commands anyone can run, or one that states why it changes no behavior. Execute what it declares; a change with nothing to exercise needs no environment and is not blocked by lacking one, the same reading `dev-run-tests` gives a docs-only change. What it is not is an empty section: `git-open-pr` refuses to leave one, and that refusal is what keeps "nothing to verify" from becoming a free pass.
2. **Bring the change up.** Profile `qa_env`: `preview` - the per-PR deployment URL from the PR's deployment status; `local` - profile `app_run`, then `app_url`; `auto` (default) - a preview when the PR has one, else local; `none` - the project has already stated that behavior cannot be exercised here. Confirm what came up was built from the head SHA and not from the base - verifying the base is worse than not verifying, because it produces a passing report.

   **Nothing resolves and detection finds nothing** - that is a standing configuration gap, not an event of this PR, so it is resolved the way every other project value is: asked once, recorded in the profile. Two answers are valid and the profile holds both - set `qa_env` plus `app_run` / `app_url` (naming where test accounts come from, never the accounts themselves), or drop `ai:verified` from `pr_success_factors` because this project has nothing to exercise.

   **Who asks depends on where this runs, and the stage does not guess.** Invoked directly by a person, it asks and records. Inside a run it is an isolated subagent with no one to ask, so it returns `blocked (project)` naming both keys and the question travels out with the escalation - `git-finalize-pr` stops retrying it, `git-complete-pr` puts it to the owner. Either way the answer lands in the profile once; an escalation that repeats identically on every PR without saying how to end it is noise.
3. **Execute each step in order, exactly as written**, driving the interface it names with whatever the host provides (browser automation, an HTTP client, the CLI). Record for each: the action taken, the observed result verbatim, and the expected result the step states.
4. **One verdict per step**, and there are four - a bare `blocked` is not one of them, because the two kinds route differently and a generic verdict strands the router:
   - **`pass`** - observed matches expected.
   - **`fail`** - observed contradicts expected.
   - **`blocked (project)`** - no environment at all, from step 2. One standing gap, one profile answer, and it ends for every future PR at once.
   - **`blocked (step)`** - this step alone cannot run: a credential or capability the others did not need, or an expected result stated too vaguely to judge. It belongs to this PR, and it is never grounds to drop the factor project-wide - that would disable verification for everything because one step needed a login.

   Neither blocked kind becomes a `pass` because everything around it passed.
5. **Probe the negative each passing step implies**: empty input, an unauthorized caller, the boundary value it names. The defect the happy path hides is exactly the one the diff does not show.
6. **Record.** Post one PR comment (`gh pr comment`) in the report envelope `git-workflow` defines - each run against a new head is a new entry in the log:

```
## Verification - PASS | FAIL | BLOCKED (PROJECT) | BLOCKED (STEP)
head: <sha> - env: <preview <url> | local | none>

| # | Step | Verdict | Observed |
|---|---|---|---|
| 1 | <the step, as written> | pass | <what actually happened> |

### Failures
- Step 2 - expected <x>, observed <y>. Repro: <the exact actions>. Suspect: `path/file:line`.
```

7. **Label.** Every step `pass` - add `ai:verified`. Otherwise write no label at all and return the failures and blocked steps to the caller: the outcome is `git-complete-pr`'s to write.

## Delegation

One pass by default. Fan out by surface (the UI steps, the API steps, the CLI steps) only when the declared steps exceed what one pass holds or need different host capabilities: each worker gets its slice plus the profile, never the author's account of why the change is right, and its observations come back here to be recorded. A judge that concatenates what workers reported has verified nothing.

## Verify

- One comment naming the head SHA; every declared step carries a verdict and an observed result; `ai:verified` present only when all of them passed.

## Scope / hand-off

- Fixing what this finds, and the rounds - `git-finalize-pr`; the outcome label - `git-complete-pr`; the diff itself - `git-review-pr`.

## Constraints

- Never mark a step passed from reading the code - only from an observed result.
- Never fix what it finds: a QA engineer who patches the build is no longer reporting on it.
- Never widen the steps into a test plan the PR did not declare, and never drop one because it looks unnecessary.
- No credentials in the report or in the profile - test accounts come from the project's documented secret source.
