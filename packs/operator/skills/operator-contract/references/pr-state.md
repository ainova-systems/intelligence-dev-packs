# Pull request state

The state, factor and report conventions every operator run reads and writes. For operator runs this
page is authoritative. The core pack's `git-workflow` rule states the same vocabulary for its own
skills; a project with core installed has one vocabulary, and a project without core needs only this
page. A replacement for a delegated step (`operator-contract` > Delegated steps) honours it as written.

## State labels

Exactly one at a time, written by the actor doing the work:

| Label | Means | Terminal |
|---|---|---|
| `ai:processing` | a run holds the pull request now (its claim) | no |
| `ai:completed` | the run ended with nothing left for an agent | yes |
| `ai:manual` | the run ended needing an owner decision, named precisely in an outcome comment | yes |
| `ai:failed` | the run ended unable to reach green, naming the blocking failure and what was tried | yes |

A state change is one edit that adds the new label and removes the others. A pull request carrying
no `ai:*` label is human-driven, and every gate skips label checks for it.

A claim is not a lock: a run takes a pull request only while no `ai:processing` stands on it, or
when the claim is its own (`operator-contract` > Holding a pull request). A run that finds another
run's claim takes nothing and records the refusal in one comment.

## Success factors

Additive, each written by the stage that judged it and never by the actor that did the work:

| Label | Written when |
|---|---|
| `ai:reviewed` | the diff passed review against the rules and against what the pull request claims (profile `review_skill`) |
| `ai:verified` | the pull request's declared verification steps were executed against the running change and passed (profile `verify_skill`) |

Profile `pr_success_factors` declares the set a pull request must carry (default: both); a project
may add factors that other agents or pipelines apply.

A factor is a claim about one commit. It counts only while fresh: the report comment that earned it
names the current head, and every other input it judged is unchanged - a verification names the
digest of the steps it executed (profile `operator_discover --steps-digest <n>`). For a factor no
operator stage writes, the label was applied after the head commit landed. A push makes every factor
stale whether or not anyone removed the label; no gate trusts a label without checking freshness.

**Accept-ready** = `ai:completed` plus every declared factor fresh at head.

## Stage reports

Every stage records its verdict as one pull request comment and never edits an earlier one:

```text
## <Stage> - <VERDICT>
head: <sha> [<other inputs the stage judged, e.g. the steps digest>]

<findings>
```

A gate reads a stage's latest report and compares every input it names with the current one. The
review report is `## Code review - CLEAN | PASS-WITH-WARNINGS | BLOCK`, and `ai:reviewed` follows
the first two. The verification report is `## Verification - PASS | FAIL | BLOCKED (...)`, and
`ai:verified` follows `PASS` only; a stage that could not judge says so instead of passing.
