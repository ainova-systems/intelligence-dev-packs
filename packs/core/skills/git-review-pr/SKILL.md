---
name: git-review-pr
description: "Reviews an open pull request's diff against the project rules and against what the PR claims about itself, and records the verdict on the PR. Answering other people's review threads is git-complete-pr."
argument-hint: "[pr number]"
agent: dev-code-reviewer
---

# Review the PR

An independent read of the whole diff from a context that never watched it being written. Read-only: findings only, never edits.

## Pre-flight

1. Resolve the PR, its base and its head: `gh pr view <pr> --json number,baseRefName,headRefOid`. Every finding is bound to that SHA.
2. A review report for this exact SHA already exists - report it and stop.

## Steps

1. **Run the review** over `git diff <base>...HEAD` - the PR's whole diff, not the working tree. The reviewer comes from profile `code_review_skill`: `auto` (default) uses the host's own code-review skill when it ships one, else `dev-review-changes`. Its checks and severity ladder are the review; this skill adds the axis below and the recording.
2. **The claims axis** - what a pre-commit review could not check, because the PR did not exist yet:
   - every behavior the PR body claims has code in the diff that delivers it;
   - nothing in the diff contradicts a step a verification report recorded as passed;
   - the diff contains nothing the body never mentions - undeclared scope is a finding, not a bonus;
   - the deployment-notes section (profile `release_review`) names every migration, environment or secret change the diff actually contains. An unnamed one is Critical: `git-create-release` reads that section, so what is missing there is missing from the release checklist.

   Each finding cites `file:line` plus the body line it contradicts.
3. **Verify every finding** by re-reading the code; drop what cannot be evidenced. A finding that restates a rule without a line of the diff is not a finding.
4. **Record.** One PR comment (`gh pr comment`), never an inline review thread - findings posted as threads come back through `git-complete-pr`, and the run starts reviewing itself in a circle:

```
## Code review - CLEAN | PASS-WITH-WARNINGS | BLOCK
head: <sha> - base: <base> - files N, +A/-D

### Critical
- `path/file.ts:42` - <what> - <the rule or PR-body line it breaks>
### Warning
### Suggestion
```

5. **Label.** No Critical finding stands - add `ai:reviewed`. Any Critical - write no label and return the findings; the outcome is `git-complete-pr`'s to write.

## Delegation

One pass by default. Fan out by review dimension only when the diff exceeds what one pass holds: each worker gets its dimension and its slice plus the rules, never the author's account of why the change is right - a worker that inherits the rationale confirms it. Step 3 still applies to everything that comes back: a finding this skill cannot evidence itself is dropped, not forwarded.

## Verify

- One comment naming the head SHA; every finding carries `file:line` plus evidence; a verdict is stated; `ai:reviewed` present only when no Critical finding stands.

## Scope / hand-off

- Fixing findings, and the rounds - `git-finalize-pr`; other people's review threads - `git-complete-pr`; behavior against the PR's own steps - `git-verify-pr`.

## Constraints

- Read-only: never edits, stages, commits or pushes.
- Only Critical blocks the factor. Promoting warnings to blockers makes the factor unearnable and the ladder meaningless.
- A diff mixing unrelated changes - the first finding is "split it".
- One issue comment per run; never inline review comments.
