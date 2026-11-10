# Why git-finalize-pr holds what it holds

The skill states the rules; this page keeps the reasons, so the steps stay short and a reader who wants the why still finds it.

## Ending only at an outcome label

A run that reports progress and waits to be invoked again leaves the pull request claimed by an agent that is no longer working on it, which is the one state no later reader can tell from a live one - the owner's triage view and the merge gate both read it as work in flight. No later run repairs that: pre-flight step 4 stops on a claim this run did not write rather than taking it (`git-workflow`), so the cost of ending there lands on whoever has to clear it by hand.

## The round budget

A run never grants itself another round because the judgement whether one more would help is the thing a budget exists to bound. The count belongs to the run rather than to either skill so that a hand-off to `git-complete-pr` and back cannot reset it.

## Judging apart, and never merging

A judge that inherits the author's rationale confirms it instead of testing it, which is why each judging stage runs forked and sees only its arguments. A run that both does the work and approves it has no gate at all, which is why accepting the pull request stays the owner's.

## Holding the workspace still

Fetch is on the list of moves a round makes only after its stages return, because a stage resolves its base by name - `git diff <base>...HEAD` answers differently once the ref has moved, with the checkout untouched. A stage that made its own location instead would multiply workspaces nobody owns and leave their cleanup to whichever run crashes last; a stage that read a moving tree would report a verdict for a state that existed at no commit, and that report reads exactly like an honest one.

That is why a stage that finds its workspace moved writes no factor at all: the label is the part a later gate trusts, and one earned against a workspace nobody could pin is worse than an absent one. `git-review-pr` reports it in words rather than with a verdict, because its label rule is binary on Critical and needs no verdict vocabulary.
