---
name: git-verify-pr
description: "Executes a pull request's own verification steps against the running change and records what was observed. Behavioral QA - CI and the fix rounds are git-finalize-pr."
argument-hint: "[pr number]"
agent: dev-qa-verifier
context: fork
background: false
---

# Verify the PR

Be the manual QA engineer the PR body asks for: run the steps it declares against the change actually running, and record what happened. Green CI is not verification - it proves the code builds and its tests pass, not that the described result occurs. Read-only on the code.

## Pre-flight

1. Resolve the PR and its head: `gh pr list --head <branch> --state open --json number,headRefOid --jq '.[0]'`. Every result below is bound to that SHA and names it.
2. A report naming this SHA and the current steps digest (*Digests*) already exists - report it and stop.

## Steps

1. **Read the steps.** `gh pr view <pr> --json body`, the section profile `verify_section` names (default `Manual Verification`; the repo template's equivalent heading when it uses another). Missing or empty - stop with `blocked (step)`: the PR body has to declare what "working" means. Never invent acceptance criteria the PR does not state. A section that declares nothing behavioral - only commands anyone can run, or why it changes no behavior - is executed as declared and needs no environment (`references/steps-and-environment.md` > Nothing behavioral).

   **Standing checks.** Every profile `qa_checks` entry whose glob matches the PR's files is a step of its own, alongside the declared ones. They are additional and never make a PR that declared nothing verifiable; no file or no match adds nothing and blocks nothing (`references/steps-and-environment.md` > Standing checks).
2. **Bring the change up** where profile `qa_env` says (`references/steps-and-environment.md` > Environment), and confirm it was built from the head SHA and not from the base. Nothing resolves and detection finds nothing - a standing configuration gap: return `blocked (project)` naming `qa_env` and `pr_success_factors`, with a recommendation, and never ask; the valid answers and who puts the question are `references/steps-and-environment.md` > A project with no environment.
3. **Execute each step in order, exactly as written**, driving the interface it names through this run's shell (the CLI, an HTTP client, a browser the repository's own tooling drives); a forked run on its read-only agent has no MCP tools. Record for each: the action taken, the observed result verbatim, and the expected result the step states. A capability this host lacks is replaced from what the repository already ships before it is escalated (`references/steps-and-environment.md` > Missing capabilities).
4. **One verdict per step**, and there are four - a bare `blocked` is not one of them, because the two kinds route differently:
   - **`pass`** - observed matches expected.
   - **`fail`** - observed contradicts expected.
   - **`blocked (project)`** - no environment at all, from step 2. One standing gap, one profile answer, and it ends for every future PR at once.
   - **`blocked (step)`** - this step alone cannot run: a credential the others did not need, a capability nothing in the repository provides once step 3's search came back empty (the report says what was looked for), or an expected result stated too vaguely to judge. Where the step itself is the cause - it asks for a branch or a commit on the workspace this stage holds still - the report says so, because that is the one kind the PR body can fix. It belongs to this PR, and it is never grounds to drop the factor project-wide - that would disable verification for everything because one step needed a login.

   Neither blocked kind becomes a `pass` because everything around it passed. A fifth belongs to the report rather than to any step: **`blocked (workspace)`** - the location this stage was given moved under it, so no step's result can be trusted. It is the only verdict its caller can clear, by holding the location still and running the stage again (`git-finalize-pr` > Isolation).
5. **Probe the negative each passing step implies**: empty input, an unauthorized caller, the boundary value it names. The defect the happy path hides is exactly the one the diff does not show.
6. **Record.** Post one PR comment (`gh pr comment`) in the stage report `git-pr-labels` defines, a new entry each run, naming the head SHA **and** the steps digest of what was executed (*Digests*), in the shape of `references/comment-template.md`.
7. **Label.** Every step `pass` and no `blocked (workspace)` on the report - add `ai:verified`. Otherwise write no label at all and return the failures, the blocked steps and any workspace block to the caller: the outcome is `git-complete-pr`'s to write.

## Digests

The one definition of a digest of a pull request's text, for this stage, `git-review-pr` and every gate that compares one:

1. Remove every block profile `digest_exclude` names. Its value lists blocks separated by `;`, each a start marker and an end marker in backticks, exactly as they appear in the body (so a marker cannot contain a backtick), joined by `..` - for a status block CI rewrites: ``digest_exclude: `<!-- ci-status:start -->` .. `<!-- ci-status:end -->` ``; `none` removes nothing. Remove each start marker through the next end marker, both included, every occurrence, scanning left to right and resuming after each removed end; a start with no end after it removes nothing. A status block CI rewrites in the body would otherwise change the digest on every run.
2. Take the text named below as lines, join them with `\n`, and trim it.
3. The digest is the first 12 hexadecimal characters of that text's SHA-256 (UTF-8).

The verification section runs from the line that is exactly `## <profile verify_section>` to the line before the next line starting `## `, or the end. No such line: the steps digest is `none`, and the body digest covers the whole body.

- **Steps digest** (this stage): the lines of the verification section after its heading, then each matched standing check's lines as the `qa_checks` file writes them - from its glob line to the line before its *Why* line, so the reason stays out - in the file's order.
- **Body digest** (`git-review-pr`): the whole body without the verification section, heading included. The steps digest already covers it, so a box checked there does not send the diff back to review.

## Delegation

One pass. A forked run on the read-only agent cannot start subagents and runs every step itself; a run that can fans out by surface (the UI steps, the API steps, the CLI steps) only when the declared steps exceed what one pass holds or need different host capabilities: each worker gets its slice plus the profile, never the author's account of why the change is right, and its observations come back here to be recorded. A judge that concatenates what workers reported has verified nothing.

## Verify

- What it published holds nothing `git-commit-conventions` forbids in a published artifact.
- One comment naming the head SHA and the steps digest; every step - declared and standing alike - carries its source, a verdict and an observed result, and every `blocked (step)` reached for a missing capability says what was looked for; `ai:verified` present only when all of them passed and the report carries no `blocked (workspace)`.

## Scope / hand-off

- Fixing what this finds, and the rounds - `git-finalize-pr`; the outcome label - `git-complete-pr`; the diff itself - `git-review-pr`.

## Constraints

- Never mark a step passed from reading the code - only from an observed result.
- Never fix what it finds: a QA engineer who patches the build is no longer reporting on it.
- Never widen the steps into a test plan the PR did not declare. The only additions are the project's standing checks, written in advance per area, and they never fill in for steps the PR failed to declare. Never drop a step because it looks unnecessary.
- Judge the location you were given and never make your own to judge in; a throwaway repository to probe in is not one. Never move it or the refs it resolves against - no switch, commit, fetch or pull. If it is not at the head under judgement, or it moves mid-run, write no factor and report `blocked (workspace)` (`git-finalize-pr` > Isolation).
- No credentials in the report or in the profile - test accounts come from the project's documented secret source.
