# Reading CI green

How `git-finalize-pr` > CI green is read on GitHub; on another forge, resolve each read through profile `cli`.

## The checks of one commit

A pull request's head and checks come from one call, so both belong to the same commit: `gh pr view <pr> --json headRefOid,isDraft,statusCheckRollup`. A `headRefOid` other than the head being judged means the head moved (`git-finalize-pr` > The round, step 1). A commit without a pull request - the head of a branch being released - reads `gh api repos/{owner}/{repo}/commits/<sha>/check-runs` and `gh api repos/{owner}/{repo}/commits/<sha>/status`.

A check run failed when it is `COMPLETED` with `conclusion` `FAILURE`, `CANCELLED`, `TIMED_OUT` or `ACTION_REQUIRED`, and a status context when its `state` is `FAILURE` or `ERROR`; `SUCCESS`, `SKIPPED` and `NEUTRAL` passed. A check is matched by name - a check run's `name`, a status context's `context` - and the latest entry for each name counts.

A token that cannot read check runs (a fine-grained token has no Checks permission) gets an error on a pull request that has checks and `no checks reported` on one that has none, so the error, not an empty list, is the capability gap. The runs and statuses it can still read are `gh run list --commit <sha> --json name,status,conclusion` and `gh api repos/{owner}/{repo}/commits/<sha>/status`.

## The trial merge

`git fetch origin <base>`, then `git merge-tree --write-tree origin/<base> <sha>` (git 2.38 or later). It writes only objects - no ref, index or working tree moves. Exit 0 with a single tree id is no conflict; exit 1 with a `CONFLICT` line is a conflict; anything else, an exit 1 that names no conflict included (a ref git cannot resolve), is a stop. `git-finalize-pr` runs it at step 2, before the round's stages start, because its fetch moves a ref a stage resolves its base by.

## Tracing a failure

`git-finalize-pr` > The round, step 2, drills into every failure on the head being judged, required or not. Its run comes from `gh run list --commit <HEAD_SHA> --json databaseId,name,conclusion`, the failed step from `gh run view <run_id> --json jobs --jq '.jobs[] | select(.conclusion == "failure")'`, and the log from `gh run view --job <job_id> --log` - or `gh api repos/{owner}/{repo}/actions/jobs/<job_id>/logs` while sibling jobs still run. Find the root-cause file:line, read it and the surrounding code, and queue the defect.
