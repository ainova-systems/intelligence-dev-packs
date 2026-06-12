---
name: dev-review-pr-comments
description: Process pull request review comments - classify, fix, reply, and re-request review. Use when a PR has reviewer feedback to address.
argument-hint: "[pr number or url]"
---

# dev-review-pr-comments

Work through reviewer feedback so every comment gets a fix or an explicit, reasoned answer. Silence is never a response.

## Project profile

Resolve `platform` and `cli` from `dev-project-profile.md`; otherwise detect from the remote URL (`gh` for GitHub).

## Steps

1. **Fetch all comments** for the PR (review comments and conversation comments), including resolved state. Identify which are still open.
2. **Classify each open comment:**
   - **Fix**: the reviewer is right, or the cost of the change is lower than the cost of the debate.
   - **Discuss**: a real tradeoff where the reviewer may lack context; answer with the reasoning, do not change code yet.
   - **Decline with reason**: the suggestion conflicts with a project rule or an accepted decision record; cite it.
3. **Apply the fixes** grouped into logical commits per `dev-commit-conventions`, gates re-run before push (`dev-verification-gates`).
4. **Reply to every comment**: what was changed (with the commit reference), or the reasoning for discuss/decline. Match the reviewer's tone; keep replies short.
5. **Re-request review** once all comments have a response and CI is green.
6. **Report**: counts per category and anything left open for a human decision.

## Failure modes

- A comment requires a scope change beyond this PR: agree in the reply, create a follow-up work item, and link it instead of growing the PR.
- Conflicting comments from two reviewers: surface the conflict explicitly to both rather than silently picking one.
