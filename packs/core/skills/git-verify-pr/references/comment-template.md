# The verification comment

The shape of the one PR comment `git-verify-pr` posts at step 6, inside the stage report `git-pr-labels` defines. Each run is a new entry in the log.

The second line names the head SHA **and** the steps digest of what was executed (`git-verify-pr` > Digests). The code is not this stage's only input: a PR body can be edited and a standing check added without the head moving, and a factor earned against the old steps is not a claim about the new ones.

```
## Verification - PASS | FAIL | BLOCKED (PROJECT) | BLOCKED (STEP) | BLOCKED (WORKSPACE)
head: <sha> - steps: <digest> - env: <preview <url> | local | none>

| # | Step | Source | Verdict | Observed |
|---|---|---|---|---|
| 1 | <the step, as written> | PR | pass | <what actually happened> |
| 2 | <the standing check> | qa_checks | pass | <what actually happened> |

### Failures
- Step 2 - expected <x>, observed <y>. Repro: <the exact actions>. Suspect: `path/file:line`.
```
