# The discovery contract

Discovery decides which operation each pull request and each queue waits for. It is the project's
own command, profile `operator_discover`; this page is what it must decide, so a project can write
its own. It reads the code host only through profile `forge_cli`, its settings from
`operator_config` (`operator-config.md`), and the runtime's state and jobs. The result it writes,
and `operator trigger` that delivers an answer, are the runtime's operation contract
(`@ainova-systems/operator` README).

## Calls

| Call | Answer (stdout) |
|---|---|
| (none) | The runtime's discovery operation: a contract result whose `next` holds every request below; owner answers to open waits are delivered with `operator trigger` |
| `--standalone` | Text, one line per subject: `pr-<n>: /operator-<operation> <n>`, `#<n> waits: <reason>`, or `waits: <reason>`; `nothing to do` when empty. Reads only |
| `--request <n>` | JSON `{ "next": [request] }` for pull request `<n>` now, or `{ "skip": "<reason>" }`. Reads only |
| `--steps-digest <n>` | One line: the steps digest of pull request `<n>`, or `none` |
| `--owner-input <n>` | JSON `{ "report": null \| { id, createdAt, url, title }, "input": [{ id, kind: comment\|review, createdAt, url, body, inline? }] }` |

A request is `{ operation, subject: pr-<n> | queue | clarify-queue, key, member: <slot>, input }`.
The key is `<route>:<head>` followed by every value that changes the answer (CI state and run
attempts, QA state, the latest owner input id, the steps digest, the latest owner-label change,
`stale-<job>`), so an unchanged state asks once and a changed one asks again. The development route
also carries the id of the latest stage report (`none` when there is none) - the same report
`--owner-input` returns as its cutoff, of any stage, `HELD` included: the runtime keeps one job per key,
so without it a review or verification handing a head back to implementation on unchanged CI and
owner input would repeat the key of the run before it and be dropped. Each new report asks once; an
implementation run that finds nothing left after a route back ends `noop`.

## Routing a pull request

The first row that matches decides. Labels are roles (`operator_config` `labels`); milestones are
roles (`operator_config` `milestones`). A pull request a queued or running job, or an open wait,
already covers is skipped.

| # | When | Operation | Key route |
|---|---|---|---|
| 1 | not in a pipeline milestone; `onhold`; `processing` (unless stale, below); `handoff` without `cancelled` or `rejected` (intake adopts it, Queues) | skip | - |
| 2a | `cancelled` or `rejected`, in a delivery slot | `intake` | `close:<label>:<head>` |
| 2b | `cancelled` or `rejected`, in a clarification slot | `clarify`, `step: close` | `close:<label>:<head>` |
| 3 | conflicts with the integration branch, past `queue` | `implement`, `reason: conflict` | `conflict:<head>` |
| 4 | carries a `sendBack` label, past `queue`, and is that label's oldest takeable PR | the label's operation, `reason: sendback`, `label` | `sendback:<label>:<head>` |
| 5 | `revalidate`, not a draft in `verification` | `verify` | `revalidate:<head>:…` |
| 6 | in `humanReview`/`mergeQueue` and the steps digest differs from the last passing verification's | `verify` | `steps:<head>:s-<digest>` |
| 7 | in `humanReview`/`mergeQueue` and the head is not the one the last verification judged | `verify` | `moved:<head>` |
| 8 | owner QA feedback (owner input or a QA ticket) newer than the last stage report, in `humanReview`/`mergeQueue` | `verify` | `feedback:<head>:…` |
| 9 | `accepted`, in `humanReview`/`mergeQueue` | `merge` | `merge:<head>:…` |
| 10 | `queue` | `plan` | `plan:<head>:<owner input>` |
| 11 | `development`; skip while CI runs after a `CLEAN` review of this head with no newer owner input and no unresolved thread | `implement` | `implement:<head>:<ci>:<owner input>:<latest stage report id>` |
| 12 | `verification`, draft: only the oldest draft, only while fewer than `readyLimit` PRs are ready | `verify` (it promotes) | `admit:<head>:<ready count>` |
| 13 | `verification`, ready: skip while CI runs and QA does not serve this head yet | `verify` | `verify:<head>:<ci>:qa-<state>:…` |
| 14 | `humanReview` or `mergeQueue` otherwise | skip (waiting for the owner) | - |

A pull request in a clarification slot routes instead: `clarification` → `clarify` (step
`clarify`); owner input after its last report → `clarify` (`revise`); a `## Clarification - READY`
report at the head or `accepted`, with CI decided → `clarify` (step `merge`).

Not discovery's: `review` is requested by `operator-implement`'s result; `review-verdict` by the
review job's result (the manifest chains it); an owner answer resumes the asking operation.

## Queues

| Subject | When | Request |
|---|---|---|
| `queue` | a free delivery slot and an open pull request carrying `labels.handoff`, in any milestone, without `processing`, `onhold`, `cancelled` or `rejected`, whose head is not on a fork and which no job or wait covers | `intake`, `input: { handoff: <n>, head }` for the oldest such pull request by creation, `member` the slot its branch names when no other pull request holds it, else the first free slot; key `handoff:<n>:<head>:<member>:e-<id of the label's latest labeled event>`, so a label the owner applies again asks again. Ahead of every queue item; `quotas` do not count it |
| `queue` | a free delivery slot (`slots` none of whose open PRs' branches names it) and at least one queue item eligible under profile `flow_queue` | `intake`, `member` the first free slot, key `intake:<fingerprint of the candidates, open PRs and quotas>` |
| `clarify-queue` | a free clarification slot (`clarifySlots`) and at least one item waiting on an owner decision | `clarify`, step `select`, `candidates`: the top `clarifyCandidates` ranked items, key `clarify-queue:<fingerprint>` |

The label means the hand-over is done: nobody pushes to the old branch name after it, because the
adoption may rename the branch and the pull request follows the rename. A pull request already in a
pipeline milestone, Merge Queue included, is adopted on purpose and returns to `queue`; its factors
are left to the freshness rules (`pr-state.md`). The adopting run removes `labels.handoff` in the edit
that claims it and moves it to `queue`, so from then on it is an ordinary queue pull request, stale
claim recovery included. It is converted to a draft only when `readyLimit` is set. A cancelled or
rejected pull request carrying the label takes its close route instead.

Clarification candidates rank by: the queue item field `clarifyFirst: true` first, then the
`flow_queue` folder order, then the item's priority, then how many items wait on it.

## Send-back order

Per `sendBack` label, discovery sends back one pull request at a time: the oldest by creation that
its operation can take now. One it cannot take (paused, closing, held by a live claim, without a
slot) does not hold the younger ones back and reports its own reason. One whose operation already
failed at this head waits for a new head, or for the owner to enqueue it again.

## Stale claims

A `processing` label is stale when the runtime's `claims` record for the pull request names a job
that is neither queued nor running (`operator jobs`), and the label was not applied after the record
was written. Discovery then routes the pull request as if unclaimed, adds `stale-<job>` to the key,
and sets `input.staleClaim` to that job; the skill takes the claim over (`operator-contract` >
Holding a pull request). A claim without a record is someone else's and is never stale.

## QA readiness

`verify` needs a QA deployment serving the head: discovery reads it through profile `qa_status` and
puts it in `input.qa` (`passed`, `pending`, `failed`, `none`), and asks for rows 12-13 only as above.

## The input

| Field | Type | Set by | Read by |
|---|---|---|---|
| `pr` | number | discovery, every PR request | every phase skill |
| `head` | sha | discovery; a hand-off `next` | every phase skill |
| `ci` | `none\|pending\|success\|failure` | discovery: the latest attempt of each `ciWorkflows` run for the head; any failed or cancelled -> `failure`, else any queued or running -> `pending`, else all succeeded -> `success`; no run -> `none` | implement, verify, merge, clarify |
| `qa` | QA state | discovery | verify |
| `milestone` | title | discovery | every phase skill |
| `handoff` | number | discovery, a hand-off adoption (Queues) | intake |
| `reason` | `conflict` \| `sendback` | discovery, rows 3-4 | implement, the send-back operation |
| `label` | label name | discovery, row 4 | the send-back operation |
| `staleClaim` | job id | discovery, stale claims | every phase skill (takeover) |
| `step` | `select\|clarify\|revise\|close\|merge` | discovery, clarification | clarify |
| `candidates` | `[path]` | discovery, `clarify-queue` | clarify |
| `evidence` | URL | `operator-verify`'s route back to development | implement |
| `checkout` | absolute path | `operator-implement`'s `review` request | the review job, review-verdict |
| `body` | absolute path | `operator-implement`'s `review` request: the PR body for the review to read | review-verdict (removes it) |
| `output` | absolute path | the review job: the findings file | review-verdict |
| `question`, `reply` | id, URL | the runtime, resuming a wait | the asking skill |
| `member` | slot name | the runtime, from the request's `member` (discovery sets it there, not in `input`) | intake, clarify, every slot-bound skill |

## The steps digest

1. From the pull request body remove every block `operator_config` `digestExclude` names: each
   `start` through the next `end`, both markers included, every occurrence, scanning left to right
   and resuming after each removed `end`; a `start` with no `end` after it removes nothing. A status
   block CI rewrites inside the body would otherwise change the digest after every CI run.
2. Find the line that is exactly `## <profile verify_section>`; none → the digest is `none`.
3. Take the lines after it up to the next line starting `## `, or the end; join with `\n`; trim.
4. The digest is the first 12 hexadecimal characters of that text's SHA-256 (UTF-8).

## Owner input

- **Stage report:** a comment or review whose trimmed body starts `## <Stage> - <VERDICT>` with
  `head: <sha>` on the next non-empty line (`pr-state.md`). The latest is the cutoff.
- **Owner input:** a comment or review after the cutoff (all, without a report) whose author
  association is in `allowedAuthors`, that is not a stage report and contains none of
  `pipelineMarkers`. A review counts only when commented or requesting changes; an empty commented
  review counts by its inline comments; a change request without a body counts as it stands.
