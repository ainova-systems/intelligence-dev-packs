# Roadmap

What this repository intends to build next, and why. Items leave this file by shipping or by
being dropped with a reason - a roadmap that only grows records intentions, not plans.

## Behavioral evals for the skills

**Problem.** `validate-pack.sh` checks that artifacts are well-formed, internally consistent, and
that their contracts agree with each other. Nothing checks that following a skill produces the
result it promises. Every defect found so far was found by reading the artifacts or by running the
flow by hand; both are effective and neither is repeatable.

**Shape.** Fixture repositories plus assertions on what a skill actually did, run in CI the way
`validate-pack.sh` is. The cases worth pinning are the ones where the outcome is observable and the
failure is silent - a pull request whose verification section is empty must end `blocked (step)` and
must not earn `ai:verified`; a factor whose report names an older head must be refused by the merge
guard; a run that hits the round limit must escalate rather than continue.

**Sequencing.** Deliberately after the label model has been executed end to end at least once. An
eval suite written before the real failure modes are known pins the assumptions instead of the
behavior, and assumptions that are wrong become assumptions that are enforced.

**Open question.** Which harness. `claude plugin eval` is the first-party option and is designed for
exactly this; whether the pack should depend on one host's tooling, or on something the packs can be
exercised by anywhere, is undecided and worth deciding before the first suite is written.

## Risk scanning

**Problem.** A skill that scans a change and labels it `risk:low|medium|high` has been proposed.
`git-open-pr` already computes a Risk value deterministically from `pr_risk_globs` and writes it
into the pull request body.

**Blocked on a decision, not on work.** Two risk values for one change will disagree eventually, and
whichever is read second wins by accident. Which one is authoritative - the deterministic glob match
or the scan - has to be settled first; building either before that answer produces the defect this
pack has already had to fix three times, a second source for one claim.
