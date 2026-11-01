# Operator configuration

Profile `operator_config` names one JSON file. The phase skills, the forge script
(`scripts/forge-github.mjs`, through `OPERATOR_CONFIG`) and the project's discovery read it.
A complete example: `operator-config.example.json`.

## Required

The forge script refuses a file without these, naming the missing key (exit 2).

| Key | Shape | Meaning |
|---|---|---|
| `milestones` | `{ queue, development, verification, humanReview, mergeQueue }`, each a milestone title | The milestone for each phase role; `clarification` too when `clarifySlots` is set |
| `labels` | `{ processing, accepted, onhold, revalidate, rejected, cancelled, question }`, each a label name | The label for each role; the defaults below are the names the skills show |
| `allowedAuthors` | array of author associations (on GitHub `OWNER`, `MEMBER`, `COLLABORATOR`) | Who may speak for the project: their unmarked comments are owner input; `OWNER` reads as the owner, the rest as members |
| `slots` | non-empty array of slot names | The agent slots delivery runs in; a pull request's branch names its slot |

Default label names: `processing` `ai:processing`, `accepted` `owner:accepted`, `onhold`
`owner:onhold`, `revalidate` `owner:revalidate`, `rejected` `owner:rejected`, `cancelled`
`owner:cancelled`, `question` `owner:question`.

## Optional

| Key | Default | Meaning |
|---|---|---|
| `clarifySlots` | `[]` (no clarification) | Slots that only clarify queue items waiting on an owner decision; requires `milestones.clarification` |
| `clarifyCandidates` | `5` | How many ranked clarification candidates discovery offers |
| `readyLimit` | unset (no QA admission: pull requests open ready) | How many ready pull requests may hold a QA environment at once; intake then opens drafts and `operator-verify` promotes the oldest |
| `quotas` | `{}` | Open pipeline pull requests allowed per queue source, `{ "<source>": <n> }` |
| `ciWorkflows` | every workflow run on the head | The workflow names whose runs decide CI for a head |
| `questionMarker` | `operator:question` | The marker an owner question carries (`operator-contract` > Asking the owner) |
| `pipelineMarkers` | `["<!-- operator:"]` | Substrings that mark a comment as the pipeline's own, never owner input; add the markers your CI comments carry, and keep `<!-- operator:` |
| `sendBack` | `[]` | `[{ "label": "<label>", "operation": "<project-operation>" }]`: a label an automated check sets sends the pull request to that operation, one at a time per label, oldest first (`discovery-contract.md`); the merge waits while it stands. See below |
| `digestExclude` | `[]` | `[{ "start": "<marker>", "end": "<marker>" }]`: blocks removed from the pull request body, markers included, before the steps digest is computed (`discovery-contract.md` > The steps digest); list any block your CI rewrites in the body |
| `workflow` | `development` | The runtime workflow name in `operator.yaml` that discovery triggers |

The verification heading is profile `verify_section`, not a key here.

## A send-back operation

`sendBack` names an operation the project defines in `operator.yaml`, with a skill of its own. It
follows `operator-contract` like a phase skill:

| Step | Must |
|---|---|
| Take | re-check that the pull request still carries `input.label` at `input.head`; claim it (`forge_cli claim take`, or the takeover for `input.staleClaim`) |
| Work | do the work the label stands for in the pull request's slot, and push |
| Hand back | in one edit: move to `development` and remove `processing` and every factor the push made stale; the label stays for the check that set it to clear on the new head |
| End | the contract result: `done` with the pushed SHA as evidence; `failed` when the work cannot be done, leaving no claim behind |
