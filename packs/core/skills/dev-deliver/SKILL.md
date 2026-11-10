---
name: dev-deliver
description: "Runs one task from the owner's first sentence to a released change through whichever skills the project ships for each phase, pausing only at phase boundaries. Executing an already-planned spec, and stopping at the pull request, is spec-execute."
argument-hint: "<task description, or a branch / PR to resume>"
---

# Deliver a Change

One invocation, one task, from what the owner said to a released change. **You orchestrate; the phases do the work.** Four phases - interview, implement, review, release - and the owner is interrupted only between them.

## Prime directive - the owner's expectation is the contract

Phase A captures what the owner expects to observe, and those criteria bind the whole run: they fill the pull request's verification section verbatim, `git-verify-pr` executes them against the running change, and the run is delivered only when each was observed passing on the commit that shipped. Criteria written after the code describe what got built, not what was asked.

## Whose skill runs each phase

Each phase's owner resolves as anything in the pack does: **profile, then installed catalog, then the built-in behavior here.** A project that ships a skill for a phase has that skill run it (`dev-skill-first`); profile `flow_intake` and `flow_implement` pin the answer where detection would guess. With the spec pack installed, a task without a spec that `spec-discipline`'s threshold would implement directly takes the built-in interview and Phase B, not spec intake. Review and release are the pack's own, policy-driven from the profile.

## Pre-flight - read where the work already stands

Resumption is derived from git and the pull request, never stored: every phase, subagents included, leaves its work in the tree, commits and pull request as it goes; after an interrupted subagent the ladder is read again. A dirty tree on a protected branch is a stop; on a feature branch, uncommitted work this run did not produce is reported and the owner asked before Phase B continues into it.

Resolve the subject - the argument's task, branch name or PR number, otherwise the current branch - and keep its branch **name** as the identity. Then `git fetch` and read the ladder in `references/resuming-a-run.md`, most advanced signal first: **the first rung that holds is where this run stands**, nothing below it consulted. That page also rules on what the ladder cannot answer - the intent before a pull request exists, the approvals, and whether the pull request's claim is this run's.

## Phase boundaries - the only pauses

The run pauses only before Phase A for uncommitted work it did not produce; after Phase A or B for a question the phase left the owner; at the owner's **Accept** of the pull request, between C and D, on which `git-merge-pr` runs; and at the owner's **Release** authorization, in D, on which `git-create-release` runs.

Profile `flow_approvals` decides *when* the two gates are asked - `per-gate` (default) at the boundary each governs, `upfront` both at the end of Phase A - never *whether*; what an `upfront` grant authorizes, and what not, is `references/upfront-approvals.md`. A run with nobody to ask ends at the gate it reached and reports what it needs; a declined release gate ends it after the merge with the reason recorded.

## How the run ends

Each of the five endings in `references/run-endings.md` is stated to the owner with what it leaves them. Past Phase C each leaves exactly one outcome label and no `ai:processing`, except a pull request another run holds, whose label is left exactly as found.

## Phase A - Interview (main session)

It talks to the owner, so it is never a subagent; a forked intake skill (`spec-pull`, `spec-plan`) ends with its questions, and they are asked here.

1. Read the profile, the rules and the area the task touches first; a question the repository answers is never asked.
2. The phase's owner runs it until nothing about the goal is open. Nothing installed covers it - interview here, dependencies first, each question per `dev-working-with-people`.
3. **Exit condition**: the goal in one sentence, what the owner will see when it is done, and what is out of scope - all three stated without hedging.
4. **The acceptance criteria** are the phase's product: each an action plus the result the owner expects to observe, carrying what `references/acceptance-criteria.md` requires - one not executable read-only against a running change is rewritten now.
5. `flow_approvals: upfront` - take both gates now.

## Phase B - Implement (one subagent)

Its own context: it is the run's largest, and nothing after it should remember why the code was written.

1. **The phase's owner does the work**, and keeps whatever part of the git lifecycle it performs - its branch, commits, pull request. That is never assumed: **re-read the ladder when it returns**; it says what is left, and the owner's branch becomes this run's identity.
2. Everything the ladder still leaves unmet, this phase does: branch per `git-workflow` with its slug from the task, one subagent implementing against the criteria and the scope fence alone, `git-commit-push` at the milestone, then `git-open-pr`.
3. You supply the Phase A criteria verbatim for the verification section; whoever wrote the code does not author them.
4. A question that cannot be answered from the repository comes back unanswered and ends the phase.

## Phase C - Review (one subagent)

Its own context, so the rounds' CI logs, fixes and stage reports stay out of the owner's session; the judging stages fork their own (`git-finalize-pr` > Isolation).

1. `git-finalize-pr`, then `git-complete-pr`; the rounds, factors and outcome are theirs, never re-decided here. When pre-flight established the claim as this run's, the prompt says so, or `git-finalize-pr` refuses the very pull request the phase was spawned to finish.
2. The phase ends at exactly one outcome label, unless another run holds the pull request (*How the run ends*). `ai:manual` or `ai:failed` ends the run there, reporting the owner's list - there is no merge on a caveat.
3. Accept-ready reaches the accept gate.

## Phase D - Release (main session)

1. `git-create-release` runs on the release gate.
2. Its own owner gate - the pending-step checklist, the tag confirmation - is about facts discovered at release time, so an upfront release approval never answers it; reaching it is not a stall.
3. Closing report: the goal as captured, each acceptance criterion against its observed result, the pull request, the merge commit and the tag.

## Parallel tasks

A run works in the checkout it was invoked in, and one task never makes a worktree. A task whose branch is occupied never enters that worktree; profile `worktree_policy` decides whether it gets its own, made, removed and run as `references/parallel-tasks.md` describes.

A worktree is its own instance - its own branch, pull request and ladder position. Instances share only you and the owner's attention, so the gates serialize, one question at a time naming its instance. Every worktree a run needs, including one a stage needs, is yours to create and remove; a stage works where it was told and never makes its own judging location. The throwaway repository a stage probes in is not one of these and is the stage's own (`git-finalize-pr` > Isolation).

## Verify

- Every Phase A criterion meets `references/acceptance-criteria.md` before Phase B copies it, appears in the merged pull request's verification section, and carries a `pass` in the report that earned `ai:verified` at the merged head; the closing report maps each to its observed result and names any never observed.
- Re-reading the pre-flight ladder at the end reports the phase the run reached.
- Every instance that took its pull request ends with one outcome label on it and no `ai:processing`; one refused the claim ends with its `Finalize - HELD` comment and no label of its own.

## Scope / hand-off

- A planned spec executed to a pull request and no further - `spec-execute`; intake and planning on the spec substrate - `spec-pull` or `spec-create`, then `spec-plan`.
- Conflicts - profile `conflict_skill`. Continuing after a session ends - `dev-handoff` writes the prompt, and this skill's pre-flight recovers the rest.

## Constraints

- The acceptance criteria are authored in Phase A and by nobody else; one appearing later is a changed contract and goes back to the owner.
- Both gates are the owner's words in this run - never inferred from a label, a green pipeline, or an earlier session.
- A phase the project already ships a skill for is handed to that skill; this run finishes what that skill left and never redoes what it did.
- One instance, one branch, one pull request - and never more than one worktree, only when profile `worktree_policy` gives it one.
- Resumption never re-enters a phase the forge already shows as past.
- A question inside a phase ends that phase; it never pauses inside one.
- Subagent prompts are pointers - the phase's goal, what to read, which skills to invoke, the scope fence, and any claim this run holds on the pull request. A judging stage never receives this run's reasoning about the code; a claim is not reasoning but the fact the phase needs to act on its own pull request.
