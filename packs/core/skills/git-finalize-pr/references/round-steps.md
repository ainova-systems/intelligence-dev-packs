# The round's steps in detail

The detail that `git-finalize-pr` > The round and `git-finalize-pr` > Isolation point to: how a round sorts what its judging stages return, how it fixes what they queued, and the room a stage may make for itself. Each step cites its section at the point where it applies.

## Sorting a verification report

Step 3 sorts each verdict `git-verify-pr` returns:

- `pass` earns `ai:verified`; failures queue as defects.
- `blocked (step)` queues as an owner-decision item for this pull request - unless the report names the step itself as the cause, in which case it is a body defect and goes to step 5.
- `blocked (project)` queues as an owner-decision item too, but as a standing configuration gap - never retried round after round.
- `blocked (workspace)` is this run's own failure and reaches no owner: `git-finalize-pr` > Isolation holds the location still and runs the stage again inside this round.

## Fixing the queued defects

Step 5 fixes every queued defect smallest-correct and top-down: what happened - what changed since last green - fix or delete per the feature doc - is there an existing primitive?

## Correcting a declared step

A declared verification step is corrected only where it names something that does not exist, or asks for what the stage cannot do - a branch or a commit on the workspace it holds still. A step that ran and failed is a code defect: fix the code. Changing a step's conditions - role, viewport, data, default state - or its expected result rewrites the expectation to fit the failure, and is an owner-decision item.

## Room to probe

A stage that needs room to probe in makes a throwaway repository elsewhere, never a worktree of the repository under judgement, whose `.git` and branch namespace `git worktree add` would write into. It holds no branch of the work and is gone within the stage, so it is not a worktree a run owns (`dev-deliver` > Parallel tasks).
