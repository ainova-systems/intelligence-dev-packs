---
name: operator-verify
description: "Admit the oldest waiting draft to QA, verify its current head and triage owner feedback, then hand the pull request to Human Review or back to Development. Runs as the runtime's verify operation, or by hand."
argument-hint: "[PR number when run by hand; the runtime passes $OPERATOR_INPUT]"
---

# Operator verify

Verification observes the promised behaviour on the running change; it is the `verify` operation
of `operator.yaml`. Load the `operator-contract` skill first.

| Contract | |
|---|---|
| Trigger | the verification milestone; new owner input, a QA ticket, or verification steps edited since the last verification on `humanReview` or `mergeQueue`; or `owner:revalidate` |
| Work | oldest-first QA admission; profile `verify_skill` (default `git-verify-pr`) through profile `judge_runner`; feedback triage; profile `outcome_skill` (default `git-complete-pr`) |
| Evidence | verification report at the head with the current steps digest; completion labels and PR URL |
| Next | fix → `development`, `implement`; passed → `humanReview`; QA, CI or a QA slot pending → `noop` |

## Steps

1. **Re-check the PR.** A moved `input.head`, a changed milestone, a closed PR, `owner:onhold`, or
   another run's `ai:processing` ends `noop`. Require the verification milestone, new owner input, edited
   verification steps or a head no verification report stands at (a push the pipeline did not make,
   such as a merge of the integration branch) on `humanReview` or `mergeQueue`, or a current `owner:revalidate`. Rejected and cancelled attempts go
   to intake.
2. **Claim and check out** the live head. Input, edited steps or a moved head on `humanReview` or `mergeQueue`, or revalidation
   from another milestone, moves the PR back to `verification` in the claim edit, removing an obsolete
   `ai:completed`; this is continued verification, not a hand-off.
3. **Triage input.** Read owner input (profile `operator_discover --owner-input <n>`) and every
   unresolved thread (profile `forge_cli threads <n> --unresolved`). Once QA serves the head (step 6), read its tickets with profile
   `qa_feedback` and reproduce what they report against the declared criteria; a reader that fails
   is not an empty list. Reply through profile `threads_skill` (default: the Threads procedure of `git-complete-pr`); fixes belong to
   implementation. An owner question goes out with `resume: verify`.
4. **Route required fixes.** A code defect, red CI needing a fix, an actionable review finding or a
   defective verification step → record the evidence, then one call moves the PR to the
   development milestone and drops `ai:processing`. Result `done`, request `implement`, key
   `implement-after-verify:<head>:<evidence-id>`, input
   `{ pr, head, milestone, evidence: "<URL of the report, comment or ticket>" }`, the evidence id
   being that report's, comment's or ticket's own. A ticket routed to a fix moves to in progress
   through profile `qa_feedback_status` first, so its submitter sees it taken. Never rewrite an
   expectation to make an observed failure pass.
5. **Admit a draft to QA, oldest first.** Only a draft takes this step, and only when
   `operator_config` sets `readyLimit`; a ready PR goes straight to step 6. Re-read all open PRs
   (profile `forge_cli pr list`) and count the non-drafts. Below the limit, the oldest eligible draft in `verification` by `createdAt` is
   marked ready (profile `forge_cli pr ready <n>`) after its labels, head and the count are re-checked. Promote only
   this run's PR when it is that oldest one; otherwise release the claim and end `noop` naming the PR
   ahead of it. A full pool also ends `noop`; discovery asks again when a slot opens.
6. **Verify the head** when `pr_success_factors` declares the verification factor; otherwise go to
   step 7. Steps that need no environment run now. For a step that needs the running
   change, read profile `qa_status` for this head: require a ready deployment serving it, otherwise
   release the claim and end `noop` naming what it waits for. Use the address it reports, never a
   constructed one. Finish step 3's ticket checks now; a required fix takes step 4 first.
   On `owner:revalidate`, remove `ai:verified` and run profile `verify_skill` again even when a same-head
   report stands; prior evidence is also invalid after the deployment was reset or the steps digest
   changed. Run profile `verify_skill` through profile `judge_runner`, post the report unchanged, and write
   `ai:verified` only when its verdict passes. After a pass, post one note recording the steps it
   verified - `Verified steps: <digest>`, then `<!-- operator:verified <digest> -->` before the note
   marker, the digest from profile `operator_discover --steps-digest <n>` - so discovery asks again
   when the steps are edited later. Close every open ticket this head is verified to fix, before the
   report is posted: profile `qa_feedback_status` completed, with one line in the submitter's
   language saying what changed for them - no PR, path or code names. A ticket the head does not
   fix stays open and is routed by step 4; one that reports no defect is an owner question, never
   closed by the pipeline. Hold the checkout, refs and deployment still while it judges. Its engine unavailable → release the claim and end `failed`, `retryable: true`.
7. **Complete or yield.** Re-read owner input, the freshness of every factor profile
   `pr_success_factors` declares, and CI at the same head. New
   input is triaged first. A missing or stale review returns to `development` through step 4, so
   implementation requests one. CI pending → release the claim, `noop`. Every criterion passed, every
   declared factor fresh, CI green, no unresolved thread and no owner decision → profile `outcome_skill` writes
   `ai:completed`, then the PR moves to `humanReview`. Result `done`, no next.

## Run by hand

`/operator-verify <n>`; it ends at `humanReview`, or naming `/operator-implement <n>` for a fix.

## Verify

- A passing run leaves a verification report at the head naming the current steps digest,
  `ai:verified` and `ai:completed` fresh at that head, and the pull request in Human Review.
- A routed fix leaves the evidence it names and the pull request in the development milestone.

## Scope / hand-off

- Fixes are `operator-implement`; the verification procedure is profile `verify_skill` through profile
  `judge_runner`; the outcome is profile `outcome_skill`; the merge is `operator-merge`.

## Constraints

- No source edits, commits, merge or release. A factor is written only from its stage's verdict.
- Never treat the pipeline's own replies as new owner requests.
