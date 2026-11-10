---
description: Branch model, protected branches, feature-branch flow
---

# Git Workflow

Branch model comes from `dev-project-profile.md` - `default_branch`, `integration_branch`, `branch_prefixes`, `protected_branches`. Without it, detect (default branch from `git symbolic-ref refs/remotes/origin/HEAD`; an existing `origin/develop` implies a gitflow integration branch) and ask once when still ambiguous - never guess silently.

- Work on short-lived branches `<prefix>/<slug>` (`branch_prefixes`, defaults `feature/`, `bugfix/`, `hotfix/`), branched from `integration_branch` when one is set, otherwise from `default_branch`.
- PRs target the integration branch when one exists, otherwise the default branch.
- Update long-running branches per profile `update_strategy` (default: merge from target). Delete branches after merge.

Forbidden: committing directly to a protected branch (`protected_branches`; the default and integration branches always are) - branch first; merging before CI is green (`git-finalize-pr` > CI green); rewriting history on shared branches.

## Autonomous PR labels

A run with no human in the loop between task and PR labels its PR, so a human triages at a glance and merge gating can key off it. Two kinds, never interchangeable, and each label has exactly one writer. A human-driven PR carries no `ai:*` label at all, and every gate skips label checks for it. How the labels are written and read - the stage report, a state change, a refusal, freshness, the forge - is `git-pr-labels` (core's `references/git-pr-labels.md`).

**State** - exactly one at a time, written by the actor doing the work:

- `ai:processing` - an agent holds the PR right now. Written by whichever skill pushes: `git-finalize-pr` on entry and after each round's commit, `git-complete-pr` when a fix for a review thread pushes.
- `ai:completed` - the run ended with nothing left for an agent (`git-complete-pr`).
- `ai:manual` - the run ended needing an owner decision; name precisely what (`git-complete-pr`).
- `ai:failed` - the run ended unable to reach green; name the blocking failure and what was tried (`git-complete-pr`).

The last three are terminal and `ai:processing` is not, so a run is over when it is gone: a PR left on it by a run that has stopped reads exactly like one an agent is still working. Every run therefore ends at a terminal label - or, where a scenario pack declares one, at a hand-off that removes the claim in the same edit; that pack's state page is authoritative for its own runs.

**It is a claim, not a lock**: no expiry, no atomic takeover. A run takes a pull request only when no `ai:processing` stands on it, or when the claim is its own, which is one of three knowable things: the run took it itself; a handoff handed the claim over in writing (`dev-handoff` names the held pull request); or a runtime's claims record names this run - or names a run that runtime reports neither queued nor running, a claim this run may then take over, recording the previous holder. Anyone else's claim stops the run where it stands: it takes nothing, clears no factor, runs no stage, writes no outcome, and records its refusal on the PR. Without a claims record, a claim no run is behind means a run died; the owner clears it, or hands it to a run through a handoff.

**Success factors** - additive, each written by the stage that judged it and never by the actor that did the work:

- `ai:verified` - the PR's own verification steps were executed against the running change and passed (`git-verify-pr`).
- `ai:reviewed` - the diff passed review against the rules and against what the PR claims (`git-review-pr`).

Profile `pr_success_factors` declares the set a PR must carry (default: both). A project adds factors that external agents, workers, pipelines or people apply - a security scan, a performance budget, a design or QA sign-off - and the gates that read it - `git-finalize-pr`'s rounds and `git-merge-pr`'s guard - cover them unchanged.

**A factor is a claim about one commit, not about the PR.** It counts only while *fresh*: the stage report that earned it names the current head, and every other input it judged is unchanged - the declared verification steps, and the body whose claims a review judged, can be edited without moving the head. A factor this pack does not write is fresh when it was applied after the head commit landed. A review of only the commits since an earlier reviewed head - that head an ancestor, no merge from the base between them - carries the earlier verdict forward to the new head. A push invalidates every factor whether or not anyone removed it; no gate trusts a label without checking freshness, and a stale factor means one thing only: that stage must run again.

Accept-ready = `ai:completed` plus every declared factor fresh at head. Autonomous runs never merge themselves.
