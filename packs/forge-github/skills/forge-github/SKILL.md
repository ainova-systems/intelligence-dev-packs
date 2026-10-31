---
name: forge-github
description: "The forge contract on GitHub: one script through which the operator pack's phase skills and a project's discovery make every code-host call, answering JSON. Install it with the operator pack on a GitHub-hosted project; it is called through profile forge_cli, not invoked by hand."
---

# Forge on GitHub

`scripts/forge-github.mjs` implements the forge contract
(`operator-contract` > `references/forge-contract.md`) with the `gh` CLI the host is already logged in
with. Phase skills reach it through profile `forge_cli`; a project's discovery script imports its
readers (`readPullRequests`, `readRuns`, `readLabelEvents`, `readUnresolvedThreads`,
`readInlineReviews`, `readConversation`) and CI judgement (`ciFromRuns`, `ciRunsMark`,
`decidingRuns`) as a library, so discovery and the skills read GitHub the same way.

## Setup

1. Set profile `forge_cli` to the script, with the operator configuration in its environment:
   `OPERATOR_CONFIG=<profile operator_config> node <installed pack path>/skills/forge-github/scripts/forge-github.mjs`.
2. The configuration names the processing label (`labels.processing`), the deciding CI workflows
   (`ciWorkflows`) and the author associations that speak for the project (`allowedAuthors`).
3. A library caller passes its own configuration object to the functions that take one
   (`ciFromRuns(runs, config)`, `checks(sha, run, config)`, `notes(number, run, config)`).

## Verify

- `node --test <pack path>/skills/forge-github/scripts/forge-github.test.mjs` passes: every subcommand
  against a stand-in `gh`, every answer checked against the contract shapes.
- `<forge_cli> pr list` on the project answers a JSON array; without `OPERATOR_CONFIG` the script
  exits 2 naming it.

## Scope / hand-off

- The phase skills that call it: the operator pack (`operator-contract` and the phase skills).
- Another code host is another platform pack implementing the same contract; this one serves GitHub only.

## Constraints

- Every `gh` call of the operator layer lives in this script; a skill never writes `gh` itself.
- It never passes `--admin`, never force-pushes and never deletes a branch.
- `--takeover` is honoured only on `claim take` and `pr edit --claim`; whether a run may take over is
  the calling skill's decision under `operator-contract`.
