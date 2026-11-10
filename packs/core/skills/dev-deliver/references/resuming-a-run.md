# Resuming a run

How `dev-deliver`'s pre-flight reads where the work already stands, and the rule for each thing it cannot read.

## Why nothing is stored

Resumption is derived, never stored: git and the pull request hold every answer a state file would, and cannot drift from the work the way a file can. That holds only because every phase, subagents included, leaves its work in the tree, its commits and the pull request as it goes; after an interrupted subagent the ladder is read again, never its outcome assumed.

`git status --porcelain` dirty on a protected branch is a stop. On a feature branch it establishes that uncommitted work exists, never that this run produced it: an instance owns its worktree, so a run that did not dirty the tree itself reports what is uncommitted and asks before Phase B continues into it.

The subject is the argument's task, branch name or PR number, otherwise the current branch. Its identity is the branch **name**, not the branch itself: `git-merge-pr` deletes the local branch on a confirmed merge, and the pull request still carries that name as its head ref afterwards.

## The ladder

After `git fetch`, read from the most advanced signal down. **The first rung that holds is where this run stands**, and nothing below it is consulted.

| The first of these that holds | The run stands at |
|---|---|
| a tag contains the merge commit (`git tag --contains <sha>`) | delivered - report and stop |
| the pull request for that head ref is `MERGED` | Phase D |
| an open pull request for it is accept-ready as `git-workflow` defines it | the accept gate |
| an open pull request for it exists | Phase C |
| the branch is pushed (`git rev-parse HEAD` equals `@{u}`) with commits over its base | Phase B, at `git-open-pr` |
| the branch carries commits over its base (`git log <base>..<branch>`) | Phase B, at its commit and push |
| the branch exists, locally or on the remote | Phase B |
| none of them | Phase A |

The order is not cosmetic. A rung may stop holding - a push clears the factors that made a pull request accept-ready - and that costs nothing, because the run drops to the rung below, which is still ahead of everything that shipped. What must never happen is a probe that stops holding *because the work advanced past it*: `git-merge-pr` deletes the local branch on a confirmed merge, so branch existence read first would send a run resumed after the merge back to Phase A to re-implement what already shipped.

## What the ladder cannot answer

- **The captured intent, before a pull request exists.** Recover it from the PR body when one exists, or from whatever Phase A's owner wrote when it wrote files. Neither - re-run Phase A. An inherited goal nobody can read is a guess, and every gate after it measures against that guess.
- **The approvals.** They do not survive the session that received them; a resumed run asks again at the gate it reaches.
- **Whether the pull request's claim is this run's.** An `ai:processing` on it proves only that some run took it, never which, so the answer is one `git-workflow` makes knowable: the prompt that started this run carries a handoff naming that pull request as held, or a runtime's claims record names this run. Neither - the claim belongs to another run however familiar the branch looks, and Phase C will stop on it rather than take it.

## Why the claim travels in the handoff

`ai:processing` left on a pull request this run did take says an agent holds it right now (`git-workflow`), so a run that stops there tells the owner's triage view and the merge gate the opposite of what is true. It is also the state a resumed run cannot distinguish from a sibling instance working the same branch, which is why the claim travels in the handoff rather than being inferred from the label.
