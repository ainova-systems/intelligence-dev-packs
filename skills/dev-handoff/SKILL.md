---
name: dev-handoff
description: "Compact the session into a self-contained continuation prompt for a fresh agent session"
argument-hint: "[what the next session will focus on]"
---

# Handoff

Produce a portable prompt a fresh session (any tool, any machine) pastes to continue exactly where this one stands. The output is a prompt, not a summary. An argument describing the next session's focus tailors the content.

## Steps

1. Verify state with commands, never from memory: `git branch --show-current`, `git log --oneline -5`, `git status --porcelain`, gate results actually observed this session.
2. Capture: the task in the owner's framing plus agreed scope; the spec path and current task position; done-and-verified vs in-progress, with the exact next action.
3. Capture decisions with one-line rationale, including rejected approaches so they are not retried.
4. Reference, don't duplicate: content already in artifacts (spec, ADRs, commits, PR description) is cited by path or URL, never copied in.
5. Add a **suggested skills** section: the skills the next session should invoke (usually `dev-continue-spec`, plus whatever the stated focus needs).
6. Redact secrets and personal data - the handoff may travel between machines and tools.
7. Write the prompt: repo-relative paths only, no "as we discussed"; ordered next steps starting with the immediate action; the verification commands the next session runs FIRST to confirm state.
8. Output in full; save a copy outside version control (OS temp dir or the project's ignored scratch dir).

## Verify

- A cold reader could run the verification commands and continue without asking anything this session already answered.

## Scope / hand-off

- Resuming spec execution - `dev-continue-spec` (the handoff names it in suggested skills).

## CRITICAL

- Unverified facts (did it commit? did tests pass?) are checked with a command now, never handed off as guesses.
- Trim to what the repo cannot re-derive: decisions and intent first, mechanics last.
