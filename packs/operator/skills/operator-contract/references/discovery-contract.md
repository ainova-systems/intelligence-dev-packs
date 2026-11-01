# The discovery contract

Discovery decides which operation each pull request and queue waits for. It is the project's own
command, profile `operator_discover`: the phase skills call it for the four answers below, and the
runtime runs it on a timer as the workflow's discovery operation. It reads the code host only
through profile `forge_cli` and its settings from `operator_config` (`operator-config.md`).

## Calls the skills make

| Call | Answer (stdout) |
|---|---|
| `--standalone` | Plain text, one line per subject: `pr-<n>: /operator-<operation> <n>`, `#<n> waits: <reason>`, or `waits: <reason>` for the queues; `nothing to do` when empty. Reads only; no runtime needed |
| `--request <n>` | JSON, either `{ "next": [request] }` - the request discovery makes for pull request `<n>` now - or `{ "skip": "<reason>" }` when it waits. Reads only |
| `--steps-digest <n>` | One line: the steps digest of pull request `<n>`'s body, or `none` |
| `--owner-input <n>` | JSON `{ "report": null \| { id, createdAt, url, title }, "input": [{ id, kind: comment\|review, createdAt, url, body, inline? }] }` |

Run with none of these flags, discovery is the runtime's operation: it writes the contract result
(`operator-contract` > The result) with `next` holding every request, and delivers owner answers
to open waits with `operator trigger`.

## The request

`{ "operation": "<operation>", "subject": "pr-<n>" | "queue" | "clarify-queue", "key": "<key>", "input": { "pr": <n>, "head": "<sha>", "ci": "<state>", "milestone": "<title>", ... } }`

The key names the state the request answers - normally `<operation>:<head>` plus whatever else
changes the answer (CI state, the steps digest, owner input, an owner-label change) - so a repeated
pass for an unchanged state is one job. A skill's hand-off ends with the same request
(`operator-contract` > The result).

## The steps digest

1. Take the pull request body and remove any block the project's CI rewrites inside it (the
   implementation names its markers).
2. Find the line that is exactly `## <verifySection>`; no such line → the digest is `none`.
3. Take the lines after it up to the next line starting `## `, or the end; join them with `\n` and
   trim surrounding whitespace.
4. The digest is the first 12 hexadecimal characters of the SHA-256 of that text (UTF-8).

A passing verification records it in its report's `head:` line and in its note
(`<!-- operator:verified <digest> -->`); an edited step changes it and asks for verification again.

## Owner input

- **Stage report:** a comment or review whose trimmed body starts `## <Stage> - <VERDICT>` with
  `head: <sha>` on the next non-empty line (`pr-state.md` > Stage reports). The latest one is the
  cutoff.
- **Owner input** is a comment or review after the cutoff (all of them when there is no report)
  whose author association is in `allowedAuthors`, that is not a stage report and that contains
  none of `pipelineMarkers`. A review counts only when commented or requesting changes; an empty
  commented review counts by its inline comments, and a change request without a body counts as it
  stands.
