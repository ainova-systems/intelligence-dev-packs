---
name: git-scan-secrets
description: "Scan diff, tree, or branch history for committed credentials"
argument-hint: "[scope: diff|tree|history]"
allowed-tools: Read, Grep, Glob, Bash
---

# Scan for Secrets

Find credentials before they reach a remote; anything already pushed is an incident, not a cleanup. Default scope: the pending diff plus commits ahead of the target branch.

## Steps

1. Build the file set: `git diff --name-only` + `git diff --cached --name-only` (+ `git log -p <target>..HEAD` for branch commits; `history` scope walks `git log -p --all -- <paths>`).
2. Grep the patterns: `-----BEGIN`, `AKIA[0-9A-Z]{16}`, `sk-`, `ghp_`, `xox[bp]-`, `AIza`, `eyJ[A-Za-z0-9_-]+\.` (JWT), `(password|secret|token|api[_-]?key)\s*[:=]\s*['"][^'"]+`, connection strings with embedded credentials, `.env`-style files not covered by `.gitignore`.
3. Classify each hit: **live secret** (critical) / **test or placeholder** (downgrade only with evidence it is fake) / **template reference** (`${VAR}`, vault path - not a finding).
4. Report: `file:line` (or commit SHA for history hits), credential type, classification reasoning, redacted value.
5. Live secret not yet pushed - remove it from the commit and move the value to the environment or secret store. Already pushed - **rotate first** (it is compromised regardless of history), then purge per the platform procedure and add the path to `.gitignore`.

## Verify

- Every hit classified with evidence; zero live secrets remain in the outgoing diff.

## Scope / hand-off

- Invoked by `dev-review-changes` and the orchestrators pre-push; rotation itself belongs to the owner's secret store.

## CRITICAL

- Rotation precedes any history rewrite - always.
- Never print a discovered live secret in full.
- Verify before flagging: a report full of false positives trains people to ignore it.
