---
description: Branch model, protected branches, feature-branch flow
---

# Git Workflow

Branch model comes from `dev-project-profile.md` - `default_branch`, `integration_branch`, `branch_prefixes`, `protected_branches`. Without it, detect (default branch from `git symbolic-ref refs/remotes/origin/HEAD`; an existing `origin/develop` implies a gitflow integration branch) and ask once when still ambiguous - never guess silently.

- Work on short-lived branches `<prefix>/<slug>` (`branch_prefixes`, defaults `feature/`, `bugfix/`, `hotfix/`), branched from `integration_branch` when one is set, otherwise from `default_branch`.
- PRs target the integration branch when one exists, otherwise the default branch.
- Update long-running branches per profile `update_strategy` (default: merge from target). Delete branches after merge.

Forbidden: committing directly to a protected branch (`protected_branches`; the default and integration branches always are) - branch first; merging on red CI; rewriting history on shared branches.

## Autonomous PR labels

A run with no human in the loop between task and PR labels its PR, so a human triages at a glance and merge gating can key off it. Two kinds, never interchangeable, and each label has exactly one writer.

**State** - exactly one at a time, written by the actor doing the work:

- `ai:processing` - an agent holds the PR right now. Written by whichever skill pushes: `git-finalize-pr` on entry and after each round's commit, `git-complete-pr` when a fix for a review thread pushes.
- `ai:completed` - the run ended with nothing left for an agent (`git-complete-pr`).
- `ai:manual` - the run ended needing an owner decision; name precisely what (`git-complete-pr`).
- `ai:failed` - the run ended unable to reach green; name the blocking failure and what was tried (`git-complete-pr`).

The last three are terminal and `ai:processing` is not, so a run is over when it is gone: a PR left on it by a run that has stopped reads exactly like one an agent is still working, and both triage and merge gating believe that.

**It is a claim, not a lock**, and nothing about it makes one: no run id, no expiry, no way for a second run to take it atomically. So a run cannot tell a claim it did not write from a live one, and does not guess - it takes a pull request only when no `ai:processing` stands on it, or when the claim is its own. Its own means one of two things, and both are knowable rather than felt: the run took the PR itself, or a handoff handed the claim over in writing (`dev-handoff` names the held pull request), which is what makes a resumed session the same run continuing instead of a second actor. Anyone else's claim stops it where it stands: no factors cleared, no stage run, no outcome written, none of those being its to write for a PR it does not hold.

**A refusal is recorded, not just returned.** The stopped run posts one comment in the envelope below saying it found the PR held and took nothing - additive, so it cannot race the holder the way writing a label would - and that comment is the whole of the owner's signal that two actors wanted one pull request. Without it the refusal is visible only to whoever invoked the losing run, which on a PR that nobody is watching is the same as silence.

That restriction is affordable only because every run ends at a terminal label. A pull request still claimed with no run behind it therefore means a run died rather than a run working, and the way out is stated rather than taken: the owner clears the claim, or hands it to a run through a handoff. Rare enough that no takeover rule has to serve it, and never so rare that nobody wrote down how it ends.

**Success factors** - additive, each written by the stage that judged it and never by the actor that did the work:

- `ai:verified` - the PR's own verification steps were executed against the running change and passed (`git-verify-pr`).
- `ai:reviewed` - the diff passed review against the rules and against what the PR claims (`git-review-pr`).

Profile `pr_success_factors` declares the set a PR must carry (default: both). A project adds factors that external agents, workers or pipelines apply - a security scan, a performance budget, a design sign-off - and the gates that read it - `git-finalize-pr`'s rounds and `git-merge-pr`'s guard - cover them unchanged.

**A factor is a claim about one commit, not about the PR.** It counts only while *fresh*: the report comment that earned it names the current head SHA, or - for a factor this pack does not write - the label was applied after the head commit landed. A stage judging something other than the code alone is fresh only while *that* input is unchanged too, and says so in its report: the pull request's declared verification steps can be edited without moving the head, and a factor earned against the old steps is not a claim about the new ones. A push therefore invalidates every factor whether or not anyone removed it. Clearing them is housekeeping the pusher does so the PR does not read as green; correctness never depends on it, because no gate trusts a label without checking freshness. A stale factor means one thing only: that stage must run again.

**Every stage records its verdict as one PR comment and never edits an earlier one** - the comments are the log a later reader replays. First line `## <Stage> - <VERDICT>`; second line starts `head: <sha>`, the commit that was judged, followed by whatever else the stage judged (a stage that executes the PR's declared steps names their digest there too); the stage's own findings follow. That second line is what makes a factor checkable at all: a gate reads the stage's latest comment and compares every input it names against the current one.

Accept-ready = `ai:completed` plus every declared factor fresh at head. Autonomous runs never merge themselves.

**The commands in these skills are the GitHub (`gh`) shapes - the reference implementation, not the requirement.** On another forge, resolve each through profile `cli`; what the flow actually needs is a small set of capabilities: find the open PR for a branch, read its checks for one commit, read and write its labels, read its review threads and their resolved flag, and comment on it. A forge that cannot do one of them is named as a capability gap in the report - never worked around silently, and never faked, because a factor nobody can check is not a factor. The same rule applies to the label mechanics below.

The labels must exist in the repository. `dev-init` creates them; otherwise create once via profile `cli` (`gh label create` on GitHub). State labels are mutually exclusive, so a state change is one `gh pr edit <pr> --add-label <new> --remove-label <the others>` call, never an add now and a removal a later step can skip. A human-driven PR carries no `ai:*` label at all, and every gate skips label checks for it.
