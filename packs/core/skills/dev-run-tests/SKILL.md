---
name: dev-run-tests
description: "Run typecheck, lint, and tests with the right scope; analyze failures"
argument-hint: "[scope: changed|full|<path>]"
agent: dev-test-engineer
---

# Run the Gates

Cheapest-first verification with scope detection. Invoke per task slice, at phase boundaries, and before push.

## Steps

1. Resolve commands: profile `typecheck` / `lint` / `test`; else detect (`package.json` scripts, `*.sln` - `dotnet test`, `pyproject.toml` - pytest, `go.mod` - `go test ./...`, `Makefile` targets). Confirm detected commands in one line on the first run.
2. Detect scope: `git status --porcelain` + `git diff --name-only` - map changed files to their test areas. Docs/markdown-only change - report "no tests to run" and stop. An explicit argument overrides.
3. Typecheck first - it fails fastest. On error: report the file and the first error, STOP.
4. Lint second. On error: report the finding, STOP.
5. Tests: scoped by default; full suite when shared code changed, at phase boundaries, and before push. Enforce the profile `coverage_gate` when set.
6. On failure: failing test name, the assertion, trimmed relevant output; classify the cause (production change / the test itself / environment); propose the fix. Re-run after fixes with the same scope discipline.
7. Report per area: pass/fail counts, duration, coverage vs the gate.

## Verify

- All gates green for the declared scope, or a precise failure analysis delivered - never "mostly passing".

## Scope / hand-off

- Fixing production code - the executing skill/subagent; CI-level failures - `git-finalize-pr`.

## CRITICAL

- Never modify tests, configs, or thresholds to make a failing gate pass.
- A flaky test (passes on rerun) is reported as flaky with evidence; never silently retried into green.
- Missing env/dependency - report the precondition; never stub the environment to force a pass.
