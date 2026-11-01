# Pull request state

The state, factor and report conventions every operator run reads and writes.

**Authority.** For operator runs, and for every skill a profile key delegates a step to
(`operator-contract` > Delegated steps), this page wins. The core pack's `git-workflow` rule states
the same vocabulary for core's own skills; where the two ever differ, an operator run follows this
page. A project without core needs only this page.

Label names here are roles with their default names; `operator_config` `labels` sets the actual
names (`operator-config.md`). The success-factor labels are named in profile `pr_success_factors`.

## State labels

Exactly one at a time, written by the actor doing the work:

| Role (default name) | Means | Terminal |
|---|---|---|
| `processing` (`ai:processing`) | a run holds the pull request now (its claim) | no |
| `ai:completed` | the run ended with nothing left for an agent | yes |
| `ai:manual` | the run ended needing an owner decision, named in an outcome report | yes |
| `ai:failed` | the run ended unable to reach green, naming the blocking failure and what was tried | yes |

- A state change is one edit that adds the new label and removes the others.
- A run that pushes holds the claim while it pushes: `ai:processing` stands before the push.
- A run ends in one of two ways, never with its claim left behind: a **terminal label** (the
  outcome step), or a **handoff** - one edit that moves the pull request to the next milestone and
  removes `ai:processing`; no state label plus milestone X means waiting for phase X.
- A pull request carrying no `ai:*` label is human-driven, and every gate skips label checks for it.

**Claims.** A claim is not a lock: a run takes a pull request only while no `ai:processing` stands
on it, or when the claim is its own. A run that finds another run's claim takes nothing and posts
one refusal report: `## <Stage> - HELD`, `head: <sha>`, what it was asked to do and that it took
nothing. **Operator extension:** a claim whose runtime job has stopped may be taken over as
`operator-contract` > Holding a pull request describes; core has no takeover.

## Success factors

Additive, each written by the stage that judged it and never by the actor that did the work:

| Label | Written when |
|---|---|
| `ai:reviewed` | the diff passed review against the rules and against what the pull request claims (profile `review_skill`) |
| `ai:verified` | the pull request's declared verification steps were executed against the running change and passed (profile `verify_skill`) |

Profile `pr_success_factors` declares the set a pull request must carry (default: both); a project
may add factors that other agents or pipelines apply.

A factor is a claim about one commit. It counts only while fresh: the report that earned it names
the current head, and every other input it judged is unchanged - a verification names the digest of
the steps it executed (`discovery-contract.md` > The steps digest). For a factor no operator stage
writes, the label was applied after the head commit landed. A push makes every factor stale whether
or not anyone removed the label; no gate trusts a label without checking freshness.

**Accept-ready** = `ai:completed` plus every declared factor fresh at head.

## Stage reports

Every stage records its verdict as one pull request comment and never edits an earlier one:

```text
## <Stage> - <VERDICT>
head: <sha> [<other inputs the stage judged, e.g. the steps digest>]

<findings>
```

A gate reads a stage's latest report and compares every input it names with the current one.

| Report | Verdicts | Label |
|---|---|---|
| `## Code review - …` | `CLEAN`, `PASS-WITH-WARNINGS`, `BLOCK` | `ai:reviewed` on the first two |
| `## Verification - …` | `PASS`, `FAIL`, `BLOCKED (...)` | `ai:verified` on `PASS` only |
| `## Outcome - …` | `MANUAL`, `FAILED` | written with `ai:manual` / `ai:failed`, one line per decision or failure |
| `## <Stage> - HELD` | - | none; the refusal above |

A stage that could not judge says so instead of passing.
