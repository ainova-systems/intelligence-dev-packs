---
name: spec-pull
description: "Pulls one tracker item into a spec, read-only against the tracker, and updates that same spec in place on every re-run. With no tracker item, spec-create is the path."
argument-hint: "<item reference: #123, PROJ-123, or URL>"
agent: spec-architect
---

# Pull a Spec from the Tracker

The start of dev work when a tracker item exists: the item is the source and the spec is its projection, so the verb is *pull*. One tracker item becomes `NNN-requirements.md`; **one item, one spec, for the life of the item** - re-run this skill whenever the item moves, and it updates the spec in place. A revision never spawns a second folder.

Read-only by design: this skill never writes to the tracker - the board is the backlog, the repository is the record. A question the item cannot answer goes into the spec's `## Open questions`, and a question the item's author owns is relayed by the developer, never posted by the agent.

## Resolve the tracker (profile, then detect, then ask once, then STOP)

1. **Profile** `## Tracker`: `tracker`, `tracker_cli`, `tracker_item_ref` in `dev-project-profile.md`.
2. **Detect the forge's own tracker** from the git remote: GitHub remote -> `gh issue view <n> --json title,body,comments,url`; GitLab -> `glab issue view <n>`; Azure DevOps -> `az boards work-item show --id <n>`. The forge tracker needs no new dependency - the PR skills already require the same CLI.
3. **A connected MCP server** that can read the item is an accepted channel; name which server was used.
4. **Ask once** and record the answer in the profile.
5. **STOP** when nothing resolves or `tracker: none`: name exactly what is missing ("no tracker in the profile, remote is not a known forge, no tracker MCP server connected") and point to `spec-create` as the taskless path. Never scrape, never guess, never half-pull.

A channel that reads the body but not the comments degrades loudly: pull what is readable and record in the decision log that comments were not read and why.

## Steps

1. **Read the item completely**: title, body, every comment. A requirement arrives in a comment as often as in the description.
2. **Resolve the spec folder.** An existing spec for this item (matched on the item id in frontmatter) is updated in place; otherwise create the next `NNN-<slug>/` per `spec-discipline`.
3. **Synthesize, don't paste.** Write `NNN-requirements.md` with EARS acceptance criteria narrowed to this change. A **decision log** names the source of every requirement that did not come from the body, and states out loud how many comments carried none.
4. **Record provenance and drift keys** in the frontmatter: `tracker_item_id`, `tracker_item_url`, `item_body_digest`, `item_comments_digest` (digests of the pulled text, so a later re-pull can tell what moved). Do not record a modification timestamp as a key - too many tracker events move it without changing content.
5. **Gaps become questions, never dead-ends.** Every ambiguity goes to `## Open questions` in the `spec-discipline` question shape, with suggested answers; an undecided item goes under an explicit "Open for planning" marker. This skill never refuses a pullable item.
6. **On re-pull**, diff the new digests against the recorded ones, apply the delta to the requirements, and note in one line what moved. A cancelled spec is never revived by a re-pull - the item gets a fresh spec, and the cancelled folder stays as the record.
7. Report: spec path, requirement count, decision-log summary, open questions. Planning is next - `spec-create` update-mode is not needed; hand to the plan step of the flow.

## Verify

- The spec carries the item id, URL, and both digests; every requirement traces to the body, a named comment, or a recorded owner answer; open questions use the three-part shape; nothing was written to the tracker.

## Scope / hand-off

- No tracker item and none can be made - `spec-create` (it keeps the brief verbatim; the cost is no drift keys and no re-pull).
- Writing the plan - the flow continues with the plan authoring and `spec-validate` / `spec-answer`; execution - `spec-execute`.

## CRITICAL

- Read-only against the tracker: no comments, no status changes, no label writes - creating or updating tracker items is outside this skill.
- No channel, no pull: stop with the named reason rather than reconstructing an item from memory or a paste. A pasted item is `spec-create`'s job, with its cost said out loud.
- One item, one spec, for the life of the item; re-pull updates in place.
