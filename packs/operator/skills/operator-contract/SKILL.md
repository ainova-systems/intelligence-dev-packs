---
name: operator-contract
description: "The run contract every operator-* skill follows: input, result, claims, owner labels and questions, comment markers, judging stages, and running by hand. Load it before running any operator-* skill."
---

# Operator contract

Every `operator-*` skill runs as one operation of the operator runtime (`@ainova-systems/operator`,
the project's `operator.yaml`), or by hand from a session (below). This page is how a skill reads its
job, holds a pull request, asks the owner, and ends. Milestone and label names, and the slot limits,
are the project's `operator_config` file (profile; its schema is `references/operator-config.md`).
Every code-host call - reading a pull request, its checks or threads, claiming it, moving it,
commenting, merging - goes through profile `forge_cli`, never a platform CLI written into a skill (the subcommands, answers and exit codes are
`references/forge-contract.md`). The
conversation (stage reports, comments, reviews) is `forge_cli notes <n>`; the owner's input is what
profile `operator_discover --owner-input <n>` lists - discovery's own filter, newer than the last stage
report (`references/discovery-contract.md`) - so a skill and discovery never disagree on what the owner said. The state labels, success
factors, their freshness and the stage report envelope are `references/pr-state.md`.

## Delegated steps

A phase skill owns when a pull request moves and who holds it; the work of each step is a skill the
profile names, so a project with its own equivalents points the key at them. Unset (or `none`),
each key is the core pack's skill. Every replacement honours `references/pr-state.md` and posts
only through profile `forge_cli`.

| Profile key | Default (core) | Input | Posts, writes | A replacement must |
|---|---|---|---|---|
| `flow_intake` | `auto`: the project's intake skill, else `dev-deliver`'s Phase A interview | the queue item and the repository | nothing on the PR | capture the business goal, observable acceptance criteria and scope exclusions, answering from the item what it settles, and nothing further |
| `commit_skill` | `git-commit-push` | the slot's pending work | a commit on the branch; no label | run the project's gates, commit the work as one change and push it |
| `open_pr_skill` | `git-open-pr` | the pushed branch, its target, the title and body, draft or ready | the pull request; no label | open one pull request filling the project's template and its verification section with one observable step per criterion, prepend the Risk/Size line when profile `pr_risk_size` is on (and recompute it on request from the final diff), and open it as a draft when asked |
| `review_skill` | `git-review-pr` | the pull request at one head | one `## Code review - <VERDICT>` report; `ai:reviewed` | judge the diff against the rules and what the pull request claims; write the label only on `CLEAN` or `PASS-WITH-WARNINGS` |
| `verify_skill` | `git-verify-pr` | the pull request at one head and its declared steps | one `## Verification - <VERDICT>` report naming the head and the steps digest; `ai:verified` | execute every declared step against the running change; write the label only on `PASS` |
| `threads_skill` | the Threads procedure of `git-complete-pr` | the unresolved review threads | one reply per thread, ending with the note marker; no label | answer each thread with its outcome (fixed: the commit; declined: the rule; deferred: the follow-up) and resolve it |
| `outcome_skill` | `git-complete-pr` | the pull request and the outcome the phase reached | `ai:completed`, `ai:manual` or `ai:failed`, removing `ai:processing` in the same edit; a `## Outcome - MANUAL` / `## Outcome - FAILED` report with its `head:` line for the last two | write exactly one terminal label |
| `merge_skill` | `git-merge-pr` | an accept-ready pull request | the merge; no label | refuse unless every required check is green on it, no review thread is unresolved, the pull request is mergeable, the state label is `ai:completed` (or there is no `ai:*` label) and every declared factor is fresh at head; then merge by profile `merge_method`, confirm the pull request reads merged and report the merge commit |
| `sync_base_skill` | `git-sync-base` | the slot, optionally one branch | nothing on the PR | return the slot to the integration branch, fast-forward it, and remove only local branches whose pull request merged (or the named closed one) |

Profile `flow_implement` is the implementation itself: `auto` resolves as core does (the project's
own execution skill when one is installed, else one subagent working to the plan's slices); a skill
name runs that skill.

## The input

The prompt names the input file and the result path; the same paths are in `$OPERATOR_INPUT` and
`$OPERATOR_RESULT`. The input holds:

- `run` — `id`, `jobId`, `workflow`, `operation`, `attempt`;
- `member` — the slot the run works in: the one the pull request's branch names, or a free one
  for intake and clarification (absent when run by hand: the checkout's own name gives it);
- `subject` — `pr-<n>`, `queue` for intake, or `clarify-queue` for selecting an item to clarify;
- `input` — pointers only: `pr`, `head`, `ci`, `milestone`; a review gets `checkout` (the slot it
  judges) and `body` (a file holding the PR body), and its verdict also `output` (the findings file);
  a fix sent back by verification gets `evidence`; a resumed question gets `question` and `reply` (a
  comment URL). Every field, its type and its producer: `references/discovery-contract.md` > The input;
- `trigger` — what started the job (`kind` is `timer`, `next`, `resume` or `manual`).

**The input is a pointer, never the state.** Re-read the live pull request
(profile `forge_cli pr view <n>`) before writing anything.
A head that moved, a milestone that changed or a pull request that closed ends the run `noop` with
the reason: discovery asks again for the new state.

## The result

End by writing exactly one JSON file at the result path:

```json
{
  "contract": 1,
  "status": "done",
  "evidence": ["https://github.com/<repo>/pull/<n>#issuecomment-<id>"],
  "next": [{ "operation": "review", "subject": "pr-<n>", "key": "review:<head>", "input": { "pr": 0, "head": "<sha>" } }],
  "message": "one line for the job log"
}
```

| `status` | When | Also carries |
|---|---|---|
| `done` | the work happened | `evidence`: stage comment URL, commit SHA, PR URL |
| `noop` | nothing to do now: the state had already moved, the owner paused it, or what the run needs has not happened yet (CI, a QA deployment, a QA slot); discovery asks again when that state changes | `message` with the reason |
| `needs-input` | an owner question was asked (below) | `wait` |
| `failed` | the work could not be done; an engine that is unavailable is `retryable: true`, and the manifest's `retries` bring the run back | `failure: { "reason", "retryable" }` |

- Exit 0 without a valid result file is a failure; a result is never skipped.
- The runtime's `waiting` status is a wait for a named trigger and needs a `wait`; these skills use
  only its owner-question form, `needs-input`.
- `next` asks the runtime for the following operation. Give every request a `key`, normally
  `<operation>:<head>`, so the same request from a repeated run is one job.
- **A hand-off asks for what discovery would ask.** After the edit that hands the pull request on,
  run profile `operator_discover --request <n>`: it prints `{"next": [...]}`, the request discovery
  makes for that pull request now, or `{"skip": "<reason>"}`. End with that `next`, or with none on a
  skip - discovery asks once that state changes. Its next pass asks the same key, so the two are one
  job and no phase runs twice for one state. A skill keeps its own key only for what discovery never
  asks: a review, a route back to development carrying evidence, an answered question.
- Evidence is a link or a SHA a reader can open, never pasted log text.

## Milestones

A pull request's milestone names the phase that may take it. Skills name the milestones by
their role in `operator_config` `milestones` - `queue`, `development`, `verification`,
`humanReview`, `mergeQueue`, and `clarification` for a clarification slot's pull request - and read the project's title for each role there before comparing or
setting one; a title is never written into a skill. A conflict with the integration branch returns a
pull request in any later milestone to `development`; a `sendBack` label from `operator_config`
sends it to the operation named there, which returns it to `development`.

## Holding a pull request

- A skill takes a pull request only in its own milestone and only while no `ai:processing` stands
  on it (`references/pr-state.md`). It adds `ai:processing` before its first write (profile `forge_cli claim take <n>`). A **claim
  edit** - the claim together with a milestone move or a label removal - is one profile
  `forge_cli pr edit <n> --claim [--milestone "<title>"] [--remove-label <l>]`, never a hand-added
  `ai:processing`. Either answers `held` (exit 3) when the label already stood: another run's claim,
  taken over only as the bullets below allow, otherwise the run stops. `operator-merge` and
  `operator-clarify`'s merge step are the exceptions: profile `merge_skill` reads the state label, so a
  merge takes no claim.
- **One claim per shell call.** A chain that claims two pull requests can lose the record of the
  first when the second fails.
- **A runtime run records its claim.** Right after adding `ai:processing`, write
  `{"job": "<run.jobId>", "attempt": <run.attempt>, "operation": "<run.operation>", "at": "<UTC now, ISO 8601>"}`
  with `operator state put claims pr-<n>`; after every edit that removes `ai:processing`, run
  `operator state delete claims pr-<n>`. A run by hand records nothing.
- **Another run's claim** is an `ai:processing` this run did not write, except two that are this
  run's to take over: the `claims` record names this run's own `jobId` (an earlier attempt of this
  job), or `input.staleClaim` names the job the record holds and `operator jobs --status running --json`
  lists no such job (discovery found a stopped run's claim). To take one over: take it with
  profile `forge_cli claim take <n> --takeover` (or `pr edit <n> --claim --takeover ...` when the step
  moves the milestone in the same edit), record the claim as this run's - its `claims` record adds
  `"takeover": {"from": "<the previous holder's job>"}` - and go on from the work the stopped run
  kept in the slot (*The slot stays with its pull request*). `--takeover` is used nowhere else. A run recognises a claim as its own only through its
  `claims` record or `input.staleClaim`; a handoff note (core's `dev-handoff`) is not recognised.
  **Any other claim stops the run where it stands:** it posts one `## <Stage> - HELD` report
  (`references/pr-state.md` > Claims; `<Stage>` is the skill's phase), takes and changes nothing
  else, and ends `noop`. Every skill's re-check step that meets another run's claim does this.
- **A handoff ends the run.** Moving to the next phase is one call:
  profile `forge_cli pr edit <n> --milestone "<next milestone's title>" --remove-label ai:processing`. No state label plus
  milestone X means: waiting for phase X's operation.
- Any other end removes `ai:processing` in the same call that writes the terminal label, through
  profile `outcome_skill` where the phase says so. A run never ends with its claim left behind.
- **Owner labels are re-read before every write, and between the steps of a long round.**
  `owner:onhold`, `owner:rejected` or `owner:cancelled` appearing stops the run where it stands:
  push nothing more (work in hand stays in the slot, committed: below), drop `ai:processing`,
  result `noop` - a closed attempt belongs to
  intake, which keeps what the run pushed. Skills read `owner:*` and never write it, the `question` label (*Asking the owner*) excepted.
- **The slot stays with its pull request.** A pull request lives in the slot its branch names
  (`<prefix><slot>-<slug>`) from intake until it merges or closes: every run of it works there,
  the review included, and leaves the slot on the PR branch, so the next run and the owner find the
  task where it stands. A run that pushed leaves it at that head with nothing uncommitted.
- **Work a run could not verify and push stays in the slot.** Gates interrupted, the run failed or
  was stopped: the work is committed on the PR branch and not pushed, and a `failed` result's
  `failure.reason` says it is kept in the slot as local commits ahead of the remote head (a commit
  that itself fails leaves the changes uncommitted, named the same way). Nothing pushes it to
  another branch. The next run in the slot - a retry of the job, or a takeover of a stale claim -
  continues from there: it inspects those commits and changes, runs the gates, and pushes them
  with its round.
- **Only state a run cannot continue is set aside**, such as a broken mid-merge: `git switch -c
  operator/leftover/<run.jobId>` (`manual-<UTC timestamp, yyyymmddHHMMSS>` by hand), commit
  everything as `Kept the work a pipeline run could not continue`, switch back to the PR branch,
  reset it to its remote head, and post one note naming that branch. A leftover branch is local and
  never pushed.
- **Only the end of the pull request frees the slot.** After a confirmed merge it returns to the
  integration branch with profile `sync_base_skill` unscoped (profile `merge_skill` has deleted the
  branch), after a closed attempt scoped to its branch; and the run that merges or closes the pull
  request deletes (`git branch -D`) every local `operator/leftover/*` branch the pull request's
  notes name.

## Owner labels

Every `owner:*` and `ai:processing` name in these skills stands for its role in `operator_config`
`labels` - `accepted`, `onhold`, `revalidate`, `rejected`, `cancelled`, `processing` - and is shown
with its default title; read the configured title for the role before comparing or writing one.

| Label | Means | Taken by |
|---|---|---|
| `owner:accepted` | merge this head | `operator-merge` |
| `owner:onhold` | pause; every operation ends `noop` while it stands | nobody |
| `owner:revalidate` | verify again, even on an unchanged head | `operator-verify` |
| `owner:rejected` | close this attempt; the item stays in the queue with the reason | `operator-intake` |
| `owner:cancelled` | close this attempt and drop the item from the queue | `operator-intake` |

Cancellation outranks rejection. A run whose owner label disappears mid-run re-reads and follows
the label that stands.

## Asking the owner

1. Post one PR comment: the exact question, the options, and on its last line
   `<!-- operator:question <run.id>:<n> -->` (`n` counts the run's questions from 1), followed by the
   note marker.
2. In one edit drop `ai:processing` and add the `question` label (`operator_config` `labels`,
   default `owner:question`), so the owner sees at a glance which pull requests wait on them; then
   end `needs-input` with
   `"wait": { "on": "answer", "subject": "pr-<n>", "key": "<run.id>:<n>", "resume": "<this operation>", "input": { "pr": <n>, "head": "<head now>", "milestone": "<milestone now>" } }`,
   with the head as it stands after any push this run made: the resumed run gets that `input`, not
   the original one. No process waits, and the slot stays with the pull request.
3. Discovery resumes the operation when the owner replies. The resumed run gets the wait's
   `input` plus `question` and `reply`: read that comment, check it answers *that* question for the
   current head, and record the answer with `operator state put answers pr-<n>.<question> < answer.json`
   before acting on it. The claim edit removes the `question` label (the owner may also remove it).
   A run that asks again sets it again. A reply is never a general permission: "yes" to a planning question does not
   merge.

When intake itself cannot choose because every candidate needs the owner, it asks nowhere on a
PR: it records each exact question on its queue item, the way profile `flow_queue` marks an item as
waiting for a decision, and ends `noop` naming them.

## Marking the pipeline's own comments

A host token may act as the owner, so a comment's author cannot tell the owner from an agent.
Discovery therefore reads every unmarked comment from an owner account as owner input, and new
input starts the phase operation again.

- Stage reports keep the envelope `references/pr-state.md` states (`## <Stage> - <VERDICT>`, then `head: <sha>`).
- Comments CI posts carry the project's markers (`operator_config` `pipelineMarkers`).
- Every other comment a skill posts ends with `<!-- operator:note -->`, a reply in a review thread
  included: its review has no body of its own, so discovery reads the thread comment. A passing
  verification's note also carries `<!-- operator:verified <digest> -->` (`operator-verify`).

## Judging stages

Profiles `review_skill` and `verify_skill` run where profile `judge_runner` says: `none` (or unset) runs
them in this session; a skill name runs them through that skill in another engine,
read-only, and the operator skill posts the report unchanged and writes the factor its verdict earns.
An engine that is unavailable ends the run `failed` with `retryable: true`; nothing stands in for it.

The runtime's review job writes its findings file (`input.output`) as JSON:

| Field | Type |
|---|---|
| `head` | the sha it judged |
| `verdict` | `CLEAN` \| `PASS-WITH-WARNINGS` \| `BLOCK` |
| `findings` | `[{ severity: critical\|major\|minor, file, line (0 = whole file), rule, sibling, summary }]` (`rule`, `sibling` may be empty) |
| `report` | the complete `## Code review - <VERDICT>` comment, posted unchanged |

## State

`operator state` and `operator jobs` exist only under the runtime; a run by hand uses neither.
`operator state get|put|list|delete <collection> <key>` reads and writes project state under the
runtime's namespace: run claims (`claims`, keyed `pr-<n>`) and recorded answers (`answers`). `jobs`, `waits`,
`threads`, `deliveries` and `tabs` belong to the runtime and are read-only.

## Run by hand

Every `operator-*` skill also runs from a session without the runtime: neither `operator` nor herdr
is needed. Profile `operator_discover` with `--standalone` says what each pipeline PR waits for; run
that skill (`/operator-plan <n>`).

- The argument names the subject: a PR number, or none for intake's queue. Without
  `$OPERATOR_INPUT` the skill reads the live state it re-reads anyway.
- It takes the same steps, writes no result file, and ends by naming the skill that comes next -
  the `next` it would have requested.
- A question is asked the same way, with `manual-<UTC timestamp, yyyymmddHHMMSS>` as the run id in
  its marker, and no wait is written. Answer on the PR and run the skill again: it finds the owner's
  reply after that marker, and records the answer it acts on in one note comment
  (`Answer to <question id>: <decision>`, ending with the note marker) instead of `operator state`.
- Where a step hands work to the runtime, the skill names what to run instead: the review is
  profile `review_skill` through profile `judge_runner`.

## Verify

- A finished run left exactly one result file in the contract's shape, and no claim of its own on a
  pull request it handed off or finished.
- A question left one marked comment and a wait the answer can resume.

## Scope / hand-off

- The phase skills (`operator-intake`, `operator-plan`, `operator-implement`, `operator-review`,
  `operator-verify`, `operator-merge`, `operator-clarify`) load this contract first; the code
  host is reached only through profile `forge_cli` (on GitHub, this skill's `scripts/forge-github.mjs`).

## Constraints

- A run never takes a pull request another run holds, except the takeover this contract allows.
- A run pushes no branch but its pull request's; an `operator/leftover/*` branch stays local.
- A run never writes an `owner:*` label other than the question label, and never awards itself a factor.
