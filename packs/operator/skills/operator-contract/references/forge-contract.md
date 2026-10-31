# The forge contract

Every code-host call a phase skill or a discovery script makes goes through one command, profile
`forge_cli`, which names the installed platform pack's script (`forge-github` today). A platform
pack implements every subcommand below and answers JSON in exactly these shapes; a subcommand the
platform cannot serve fails with a named capability gap, never an emulation.

## Subcommands

| Subcommand | Answer |
|---|---|
| `pr list` | `[pr]`, the open pull requests |
| `pr view <n>` | `pr` |
| `pr create --base <b> --head <h> --title <t> --body-file <f> [--draft]` | `pr` |
| `pr ready <n>` | `pr` |
| `pr edit <n> [--claim [--takeover]] [--milestone <m>] [--add-label <l>]... [--remove-label <l>]...` | `pr`; a phase hand-off, or a claim with a milestone move, is one edit |
| `pr body <n>` | the body as plain text |
| `pr files <n>` | `{ pr, files: [path] }` |
| `checks <sha>` | `{ sha, state: none\|pending\|success\|failure, runs: [{ name, state, url }] }`, judged on the deciding workflows only |
| `threads <n> [--unresolved]` | `[{ id, resolved, path, line, comments: [{ author, body, createdAt }] }]` |
| `threads --resolve <id> --body <text>` | `{ id, resolved: true, changed }`; replies once, then resolves |
| `claim take\|release <n> [--takeover]` | `{ pr, claimed, changed }`, or `{ pr, claimed: false, held: true }` when take finds the claim already standing |
| `factor set\|clear <n> --name <f>` | `{ pr, factor, set }`; the claim is never a factor |
| `comment <n> --body-file <f>` | `{ pr, url }` |
| `notes <n>` | `[{ id, kind: comment\|review, author, authorRole: owner\|member\|other, state?, body, inline?, createdAt, url }]`, oldest first |
| `merge <n> --method squash\|merge\|rebase` | `{ pr, state, mergeCommit }` |
| `events <n>` | `[{ id, event: labeled\|unlabeled, label, createdAt }]` |

`pr` = `{ number, url, title, body, draft, state: open|merged|closed, head: { ref, sha }, base: { ref },
mergeable: clean|conflicting|unknown, labels, milestone, createdAt, author }`.

`--takeover` is the one way past a standing claim, and a skill uses it only where `operator-contract`
lets a run take over its own earlier claim or a stale one.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | done; the answer is on stdout |
| 2 | usage: unknown subcommand, a missing or empty option value, no operator configuration |
| 3 | held: the claim already stands and this call did not take it |
| 1 | the platform failed; its message is on stderr |

## Configuration

The script reads the operator configuration from `OPERATOR_CONFIG` (the file profile
`operator_config` names): the processing label, `ciWorkflows` (the workflows whose runs decide a
commit) and `allowedAuthors` (the author associations that speak for the project). A project sets the
variable in its `forge_cli` value.

## Contract test

`scripts/forge-contract.mjs` exports `assertShape(kind, value)` for every answer shape above. A
platform pack's own tests run its subcommands against a stand-in for the platform and pass each
answer through it, so every implementation is held to the same shapes.
