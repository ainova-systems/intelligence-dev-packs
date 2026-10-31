---
name: operator-review
description: "Post a finished runtime review of one pull request head as its git-review-pr report, write ai:reviewed when it passes, then hand the PR back to implementation. Runs as the runtime's review-verdict operation."
argument-hint: "(runtime only; by hand run git-review-pr instead)"
---

# Operator review verdict

The runtime runs `git-review-pr`'s procedure every round, read-only and in another engine, so it
cannot post; this run records its verdict without judging again. It is the `review-verdict`
operation of `operator.yaml`. Load the `operator-contract` skill first.

| Contract | |
|---|---|
| Trigger | The runtime's `review` job finished; `input.output` is its findings file at `input.head`, `input.checkout` the PR's slot it judged |
| Work | post the report unchanged; `ai:reviewed` when no Critical stands |
| Evidence | the `## Code review - …` comment at `head:` |
| Next | `implement` as discovery asks it: on findings, owner input or decided CI, never while CI runs after a clean review; it acts on findings or hands a complete, reviewed, green head to `verification` |

## Steps

1. **Re-check the head.** The PR must be open, in the development milestone, without
   `owner:onhold` or another run's `ai:processing`, and its head must equal `input.head` and the
   findings file's `head`. Anything else ends `noop`: a moved head has its own review coming.
2. **Claim the PR in its slot**, which stands on the PR branch at that head.
3. **Record.** The findings file holds `verdict`, `findings` and `report`, the complete
   `## Code review - …` comment of `git-review-pr`'s step 4. Post `report` unchanged; then, as
   `git-review-pr`'s step 5, add `ai:reviewed` when the verdict is `CLEAN` or `PASS-WITH-WARNINGS`
   and no finding is `critical`. A report naming another head, or outside the envelope, ends
   `failed`.
4. **Hand back to implementation** whatever the verdict: drop `ai:processing` and end `done` with
   the hand-off request (`operator-contract`). Discovery asks implementation for a head with
   findings, owner input or CI that has decided, and for nothing while CI still runs after a clean
   review. Only implementation knows whether every planned slice has shipped, so it owns the move
   to `verification`.
5. **Remove the body file** (`input.body`) once the report is posted or the run ends `noop`; the slot
   stays on the PR branch (`operator-contract`).

## Run by hand

Nothing to post without a runtime review: run `git-review-pr` through profile `judge_runner`, then
`/operator-implement <n>`.

## Verify

- The `## Code review` comment names the head it judged, and `ai:reviewed` stands only when no
  Critical finding does.

## Scope / hand-off

- Fixes and the move to verification belong to `operator-implement`; the review procedure itself
  is `git-review-pr`.

## Constraints

- One review comment per head: a report for this head already standing ends the run `noop`.
- No judgement of its own and no fixes here; fixes are `operator-implement`'s.
