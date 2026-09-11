---
name: dev-deliver
description: "Runs one task from the owner's first sentence to a released change through whichever skills the project ships for each phase, pausing only at phase boundaries. Executing an already-planned spec, and stopping at the pull request, is spec-execute."
argument-hint: "<task description, or a branch / PR to resume>"
---

# Deliver a Change

One invocation, one task, from what the owner said to a released change. **You orchestrate; the phases do the work.** Four phases - interview, implement, review, release - and the owner is interrupted only between them.

## Prime directive - the owner's expectation is the contract

Phase A captures what the owner expects to observe. Those criteria are yours for the whole run: they fill the pull request's verification section verbatim, `git-verify-pr` executes them later against the running change, and the run is delivered only when each was observed passing on the commit that shipped. Criteria written after the code describe what got built rather than what was asked for - that is the failure this directive exists to prevent.

## Whose skill runs each phase

Every phase resolves its owner the way the pack resolves anything else: **profile, then the installed catalog, then the built-in behavior here.** A project that already ships a skill for a phase has that skill run it (`dev-skill-first`) - the spec pack's `spec-create` / `spec-plan` and `spec-execute` are one such project, not the shape this skill assumes. Profile `flow_intake` and `flow_implement` pin the answer where detection would guess. Review and release are the pack's own throughout, each already policy-driven from the profile.

## Pre-flight - read where the work already stands

Resumption is derived, never stored: git and the pull request hold every answer a state file would, and cannot drift from the work the way a file can. `git status --porcelain` dirty on a feature branch means Phase B is mid-flight; dirty on a protected branch is a stop - never sweep foreign work in.

Resolve the subject - the argument's task, branch name or PR number, otherwise the current branch - and keep the branch **name** as the identity rather than the branch itself: `git-merge-pr` deletes the local branch on a confirmed merge, and the pull request still carries that name as its head ref afterwards.

Then read the ladder from the most advanced signal down. **The first rung that holds is where this run stands**, and nothing below it is consulted. The order is not cosmetic: a probe that can revert to false once the work advances is never read before one that cannot, or a run resumed after the merge sees a missing branch, restarts at Phase A, and re-implements what already shipped.

| The first of these that holds | The run stands at |
|---|---|
| a tag contains the merge commit (`git tag --contains <sha>`) | delivered - report and stop |
| the pull request for that head ref is `MERGED` | Phase D |
| an open pull request for it is accept-ready as `git-workflow` defines it | the accept gate |
| an open pull request for it exists | Phase C |
| the branch is pushed (`git rev-parse HEAD` equals `@{u}`) with commits over its base | Phase B, at `git-open-pr` |
| the branch carries commits over its base (`git log <base>..<branch>`) | Phase B, at its commit and push |
| the branch exists | Phase B |
| none of them | Phase A |

Two things the ladder cannot answer, each with one rule:

- **The captured intent, before a pull request exists.** Recover it from the PR body when one exists, or from whatever Phase A's owner wrote when it wrote files. Neither - re-run Phase A. An inherited goal nobody can read is a guess, and every gate after it measures against that guess.
- **The approvals.** They do not survive the session that received them; a resumed run asks again at the gate it reaches.

## Phase boundaries - the only pauses

| Boundary | What happens there |
|---|---|
| A to B | nothing, unless the interview left the owner a question |
| B to C | nothing, unless Phase B returned a question it could not answer from the repository |
| C to D | **Accept** - the owner accepts the pull request, then `git-merge-pr` |
| D | **Release** - the owner authorizes cutting this change, then `git-create-release` |

Profile `flow_approvals` decides *when* the two gates are asked - `per-gate` (default) at the boundary each governs, `upfront` both at the end of Phase A - never *whether*. An approval this run did not receive from the owner does not exist - a run with nobody to ask ends at the gate it reached and reports what it needs. A declined release gate ends the run after the merge with the reason recorded.

## Phase A - Interview (main session)

It talks to the owner, so it stays where the owner is; it is never a subagent.

1. Read first: the profile, the rules, the area the task touches. A question the repository answers is answered there, never asked.
2. The phase's owner per the resolution above runs it, and this step ends when nothing about the goal is still open. Nothing installed covers the phase - interview here, one question at a time, dependencies first.
3. **Exit condition**: the goal in one sentence, what the owner will see when it is done, and what is out of scope - all three stated without hedging.
4. **The acceptance criteria** are the phase's product: each an action plus the result the owner expects to observe. Every one must be executable read-only against a running change; one needing a live pull request, a credential only a person holds, or state only the author can create is rewritten now. Left as written it returns in Phase C as `blocked (step)`, after the code exists.
5. `flow_approvals: upfront` - take both gates now.

## Phase B - Implement (one subagent)

Its own context because it is the largest one of the run, and because nothing after it should remember why the code was written.

1. Branch per `git-workflow`, its slug from the task.
2. The phase's owner per the resolution above does the work, continued from wherever it leaves off - re-read the ladder when it returns to see which rung that is. Nothing installed covers the phase - the subagent implements against the criteria and the scope fence, and nothing else.
3. `git-commit-push` at the milestone, then `git-open-pr` with the verification section filled with the Phase A criteria verbatim. You supply them; whoever wrote the code does not author them.
4. A question the subagent cannot answer from the repository comes back unanswered and ends the phase.

## Phase C - Review (one subagent)

Its own context because the stages that judge this pull request must not inherit the author's account of why the code is right - `git-finalize-pr` > Isolation - and a phase that begins by reading the PR and the diff holds that isolation for free.

1. `git-finalize-pr`, then `git-complete-pr`. The rounds, the factors and the outcome belong to them; nothing here re-decides any of it.
2. The phase ends at exactly one outcome label. `ai:manual` or `ai:failed` ends the run there, reporting the owner's list - there is no merge on a caveat.
3. Accept-ready reaches the accept gate.

## Phase D - Release (main session)

1. `git-create-release` after the release gate.
2. Its own owner gate - the pending-step checklist, the tag confirmation - is about facts discovered at release time, so an upfront release approval never answers it. Reaching it is the skill working, not a run that stalled.
3. Closing report: the goal as captured, each acceptance criterion against the result observed for it, the pull request, the merge commit, and the tag.

## Parallel tasks

A second task arriving while a branch is occupied never enters that worktree. `git worktree add <root>/<slug> -b <prefix>/<slug> <base>`, where `<root>` is profile `worktree_root` (default `auto` - a sibling directory of the repository root), and it becomes its own instance: its own branch, pull request and position on the ladder, its Phase A still here with the owner, its B and C subagents working in that directory. Instances share only you and the owner's attention, so the gates serialize - one question at a time, each naming its instance. Remove the worktree once `git-merge-pr` confirms the merge landed.

## Verify

- Every Phase A criterion appears in the merged pull request's verification section and carries a `pass` in the report that earned `ai:verified` at the merged head; the closing report maps each criterion to the result observed for it and names any that never reached an observation.
- Re-reading the pre-flight ladder at the end reports the phase the run actually reached.

## Scope / hand-off

- A planned spec executed to a pull request and no further - `spec-execute`; intake and planning on the spec substrate - `spec-create`, `spec-plan`.
- Each phase's work belongs to the skill that owns it: `git-commit-push`, `git-open-pr`, `git-finalize-pr`, `git-complete-pr`, `git-merge-pr`, `git-create-release`, plus whatever the project ships for intake and implementation.
- Conflicts - profile `conflict_skill`. Continuing after a session ends - `dev-handoff` writes the prompt, and this skill's pre-flight recovers the rest.

## Constraints

- The acceptance criteria are authored in Phase A and by nobody else; one appearing later is a changed contract and goes back to the owner.
- Both gates are the owner's words in this run - never inferred from a label, a green pipeline, or an earlier session.
- A phase the project already ships a skill for is handed to that skill, never re-implemented here.
- One instance, one branch, one worktree, one pull request.
- Resumption never re-enters a phase the forge already shows as past.
- A question inside a phase ends that phase; it never pauses inside one.
- Subagent prompts are pointers - the phase's goal, what to read, which skills to invoke, the scope fence. A judging stage never receives this run's reasoning about the code.
