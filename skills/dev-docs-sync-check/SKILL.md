---
name: dev-docs-sync-check
description: "Verify documentation claims against the code; report drift vs violation"
argument-hint: "[doc path or directory]"
agent: dev-docs-writer
allowed-tools: Read, Grep, Glob, Bash
---

# Docs Sync Check

Docs that contradict code are worse than none - readers and agents act on them. Read-only by default.

## Steps

1. Scope: the argument; else the primary docs (README, the docs tree, rules, feature docs, spec claims).
2. Extract verifiable present-tense claims: commands, paths, endpoints, config keys, versions, architecture statements ("X calls Y", "all writes go through Z").
3. Verify each against the repo: the command exists in the manifest? the path exists? the route matches the definitions? the boundary holds in the imports?
4. Classify each mismatch: **drift** (code moved on - fix the doc) / **violation** (the doc states the rule, the code broke it - fix the code or escalate; never silently rewrite the rule to match the violation) / **ambiguous** (owner call).
5. Report ordered by reader impact (broken setup instructions first): doc location, the claim, the actual state with evidence, classification, suggested fix.
6. Fix doc-side findings on request; code-side fixes go through the normal flow.

## Verify

- Every reported claim has evidence on both sides (doc line + repo state).

## Scope / hand-off

- Post-execution doc updates - `dev-execute-spec` Phase D; decisions - `dev-add-decision`.

## CRITICAL

- Intentions and roadmap lines are not checkable claims - skip them.
- Generated docs - report drift against the generator's input; regenerate, never hand-edit the output.
