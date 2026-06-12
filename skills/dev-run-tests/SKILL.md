---
name: dev-run-tests
description: Run the project's verification gates - typecheck, lint, tests - with the right scope and analyze failures. Use to verify changes or investigate a failing suite.
argument-hint: "[scope: changed|full|<path or filter>]"
---

# dev-run-tests

Run the verification gates in the cheapest-first order and turn failures into actionable findings.

## Project profile

Resolve `typecheck`, `lint`, `test`, and `coverage_gate` commands from `dev-project-profile.md`. Otherwise detect from the repo: `package.json` scripts, solution or project files (`dotnet test`), `pyproject.toml`/`pytest`, `go.mod` (`go test ./...`), `Makefile` targets. Confirm detected commands in one line before the first run.

## Steps

1. **Typecheck first.** It is the cheapest gate and fails fastest.
2. **Lint second.**
3. **Tests, scoped right.** Default scope: tests covering the changed area (map changed files to their test projects or directories). Run the full suite when the change is risky, touches shared code, or before a push or release. An explicit scope argument overrides.
4. **Analyze failures.** For each failure: the failing assertion or error, the relevant output (trimmed to the signal), and whether the cause is the production change, the test, or the environment. Propose the fix.
5. **Re-run after fixes** until green, with the same scope discipline.
6. **Report.** Commands run, pass and fail counts, coverage versus the gate when one is set, and the failure analysis. Never summarize a red run as "mostly passing".

## Failure modes

- Flaky failure (passes on rerun): report it as flaky with the evidence; never silently retry into green and move on.
- Suite cannot run (missing dependency, env var, service): report the missing precondition and how to satisfy it; do not stub the environment to force a pass.
- No tests exist for the changed area: say so explicitly; that gap is a finding, not a green light.
