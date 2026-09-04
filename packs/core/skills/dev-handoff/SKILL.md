---
name: dev-handoff
description: "Writes a self-contained prompt a fresh session pastes to continue this work, for when context runs short or a session ends."
argument-hint: "[what the next session will focus on]"
---

# Handoff

Produce a portable prompt a fresh session (any tool, any machine) pastes to continue exactly where this one stands. The output is a prompt, not a summary. An argument describing the next session's focus tailors the content.

## Steps

1. Verify state with commands, never from memory: `git branch --show-current`, `git log --oneline -5`, `git status --porcelain`, gate results actually observed this session.
2. Capture: the task in the owner's framing plus agreed scope; the spec path and current task position; done-and-verified vs in-progress, with the exact next action.
3. Capture decisions with one-line rationale, including rejected approaches so they are not retried.
4. Reference, don't duplicate: content already in artifacts (spec, ADRs, commits, PR description) is cited by path or URL, never copied in.
5. Add a **suggested skills** section: the skills the next session should invoke (the project's resume skill when it has one, plus whatever the stated focus needs).
6. Redact secrets and personal data - the handoff may travel between machines and tools.
7. Write the prompt: repo-relative paths only, no "as we discussed"; ordered next steps starting with the immediate action; the verification commands the next session runs FIRST to confirm state.
8. Output the prompt in full, then save a copy outside version control. Resolve where, in order: profile `handoff_dir` when set; else `auto` - an in-repo scratch dir that `git check-ignore -q <path>` confirms is ignored (reuse an existing one such as `.scratch/`, `.tmp/`, or `tmp/`); else the OS temp dir. Prefer an in-repo gitignored dir over OS temp so it is easy to find from the project. Name the file deterministically (e.g. `handoff-<branch>.md`) and print its full path.

## Verify

- Every state claim in the prompt (branch, commits, gate results, task position) cites a command run this session; the saved copy's path is printed and `git check-ignore -q` passes on it when it sits in the repo.

## Scope / hand-off

- Resuming the work - the project's resume skill when it has one, named in the handoff's suggested skills (`spec-continue` in spec-driven projects). Projects without such a skill resume from the prompt itself.

## Constraints

- Unverified facts (did it commit? did tests pass?) are checked with a command now, never handed off as guesses.
- Trim to what the repo cannot re-derive: decisions and intent first, mechanics last.
- The saved copy lands on a gitignored or out-of-tree path - confirm with `git check-ignore -q` before writing in-repo; it must never appear in `git status`.
