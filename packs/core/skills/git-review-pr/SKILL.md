---
name: git-review-pr
description: "Reviews an open pull request's diff against the project rules and against what the PR claims about itself, and records the verdict on the PR. Answering other people's review threads is git-complete-pr."
argument-hint: "[pr number]"
agent: dev-code-reviewer
context: fork
background: false
---

# Review the PR

An independent read of the whole diff from a context that never watched it being written; it runs forked, so that holds whoever invokes it. Read-only: findings only, never edits.

## Pre-flight

1. Resolve the PR, its base, its head and its body: `gh pr view <pr> --json number,baseRefName,headRefOid,body`. Every finding is bound to that SHA and that body.
2. A review report for this exact SHA and body digest (step 4) already exists - report it and stop.
3. The record: the Unresolved and Resolved lists of this PR's latest review report (`gh pr view <pr> --json comments`), empty when there is none.

## Steps

1. **Run the review** over `git diff <base>...HEAD` - the PR's whole diff, not the working tree. The reviewer comes from profile `code_review_skill`: `auto` (default) uses the host's own code-review skill when it ships one, else `dev-review-changes`. Its checks and severity ladder are the review; this skill adds the axis below and the recording. This run follows the reviewer's `SKILL.md` itself, because a forked run on its read-only agent has no skill tool; a reviewer whose steps need a tool this run lacks, such as a subagent or an MCP server, is named in the report and `dev-review-changes` reviews instead.
2. **The claims axis** - what a pre-commit review could not check, because the PR did not exist yet:
   - why the change exists and what the solution is are recoverable from the body without the implementing session (`git-commit-conventions`); a body that only lists files or restates the diff is a finding, evidenced by the body heading that failed;
   - every behavior the PR body claims has code in the diff that delivers it;
   - nothing in the diff contradicts a step a verification report recorded as passed;
   - the diff contains nothing the body never mentions - undeclared scope is a finding, not a bonus;
   - the deployment-notes section (profile `release_review`) names every migration, environment or secret change the diff actually contains. An unnamed one is Critical: `git-create-release` reads that section, so what is missing there is missing from the release checklist.

   Each finding cites `file:line` plus the body line it contradicts, except a body-audience finding, which cites the heading.
3. **Hold every finding to the bar of `dev-review-changes` step 6**, whichever reviewer produced it, with the record as the findings already considered; drop what fails it.
4. **Record.** One PR comment (`gh pr comment`) in the report envelope `git-workflow` defines - never an inline review thread, because findings posted as threads come back through `git-complete-pr` and the run starts reviewing itself in a circle. Name the head SHA **and** the body digest of the body it judged (`git-verify-pr` > Digests): the claims axis judged the body, which can be edited without the head moving, and a review of the old claims is not a review of the new ones.

   The comment carries the record forward, so the latest report is the PR's one record of findings: an Unresolved entry this head no longer shows moves to Resolved with this head, one the owner settled on the PR moves there with his reason, and the rest stay Unresolved beside this run's new findings. Only a review moves an entry to Resolved, so a fix no review has read stays Unresolved whatever a commit or a reply says.

```
## Code review - CLEAN | PASS-WITH-WARNINGS | BLOCK
head: <sha> - base: <base> - body: <digest> - files N, +A/-D

### Unresolved
- Critical - `path/file.ts:42` - <the case that fails> - <the rule or PR-body line it breaks>
- Warning - ...
### Resolved
- Warning - `path/file.ts:10` - <the case> - resolved at <sha> | settled: <the owner's reason>
```

   The verdict is BLOCK with a Critical in Unresolved, PASS-WITH-WARNINGS with a Warning there, else CLEAN.
5. **Label.** No Critical stands in Unresolved - add `ai:reviewed`. Any Critical - write no label and return the findings; the outcome is `git-complete-pr`'s to write.

## Delegation

One pass by default. A forked run on the read-only agent cannot start subagents, so it reads a diff larger than one pass holds in slices itself. A run that can fans out by review dimension only when the diff exceeds what one pass holds: each worker gets its dimension and its slice plus the rules, never the author's account of why the change is right - a worker that inherits the rationale confirms it. Step 3 still applies to everything that comes back: a finding this skill cannot evidence itself is dropped, not forwarded.

## Verify

- What it published holds nothing `git-commit-conventions` forbids in a published artifact.
- One comment naming the head SHA and the body digest; every finding carries `file:line` plus evidence, or a body heading for a body-audience finding; every entry of the previous record appears in one of the two lists; a verdict is stated; `ai:reviewed` present only when no Critical stands in Unresolved.

## Scope / hand-off

- Fixing findings, and the rounds - `git-finalize-pr`; other people's review threads - `git-complete-pr`; behavior against the PR's own steps - `git-verify-pr`.

## Constraints

- Read-only: never edits, stages, commits or pushes.
- Only Critical blocks the factor. Promoting warnings to blockers makes the factor unearnable and the ladder meaningless.
- A diff mixing unrelated changes - the first finding is "split it".
- Judge the location you were given and never make your own. Never move it or the refs it resolves against - no switch, commit, fetch or pull. If it is not at the head under judgement, or it moves mid-run, write no factor and report that instead - a verdict drawn from a workspace nobody could pin must not end up looking green (`git-finalize-pr` > Isolation).
