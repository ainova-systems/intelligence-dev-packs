---
name: dev-run-tests
description: "Runs typecheck, lint and tests scoped to what changed, then analyses the failures. The gate every commit passes first."
argument-hint: "[scope: changed|full|<path>]"
agent: dev-test-engineer
context: fork
background: false
---

# Run the Gates

Cheapest-first verification with scope detection. Invoke per task slice, at phase boundaries, and before push. It runs forked, so the test output stays out of the caller's context and only the analysis comes back.

## Steps

1. Resolve commands: profile `verify` set - run exactly that single gate-runner command and report its verdict as printed: the gates that passed, those with nothing to check, and those not run, each with its reason. A `NOTHING CHECKED` or `INCOMPLETE` verdict is never reported as green; core's runner defines its verdicts and exit codes in the header of `scripts/verify-runner.mjs`. The remaining steps are its internals and this skill adds only the failure analysis. Else profile `typecheck` / `lint` / `test`; else detect (`package.json` scripts, `*.sln` - `dotnet test`, `pyproject.toml` - pytest, `go.mod` - `go test ./...`, `Makefile` targets). Name detected commands in one line of the report on the first run.
2. Detect scope: the change `dev-verification-gates` defines, against the target branch - map changed files to their test areas. Docs/markdown-only change - report "no tests to run" and stop. An explicit argument overrides.
3. Typecheck first - it fails fastest. On error: report the file and the first error, STOP.
4. Lint second. On error: report the finding, STOP.
5. Tests: scoped by default; full suite when shared code changed, at phase boundaries, and before push. Enforce the profile `coverage_gate` when set.
6. On failure: failing test name, the assertion, trimmed relevant output; classify the cause (production change / the test itself / environment); propose the fix. The caller fixes and runs this skill again, with the same scope discipline.
7. Report per area: pass/fail counts, duration, coverage vs the gate.

## Verify

- All gates green for the declared scope, or a precise failure analysis delivered - never "mostly passing", and never a run that checked nothing or left a gate not run reported as green.

## Scope / hand-off

- Fixing production code - the executing skill/subagent; CI-level failures - `git-finalize-pr`.

## Constraints

- A flaky test (passes on rerun) is reported as flaky with evidence; never silently retried into green.
- Missing env/dependency - report the precondition; never stub the environment to force a pass.
