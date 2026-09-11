---
description: Commit message format, PR body audience, push discipline, and attribution-free published work
---

# Commit Conventions

- One-line message: capital first letter, past tense, describes the change (`Fixed tenant filter on the orders query`). Body only when the change genuinely needs explanation.
- Include the work-item ID when the project tracks them (profile `reference_ids`): `Added export endpoint (FR-042)`.
- One logical change per commit; unrelated edits go in separate commits.
- A pull request body is written for a reviewer who was not in the implementing session. After reading it they recover why the change exists, what the solution is, the shape of the work, how to confirm the result by hand, and which automated tests cover it. The pack default that `git-open-pr` fills is the suggested sectioning when the repo has no template; a project template's headings win, and the same audience maps onto them. That reader skims: each section answers its own question in the fewest sentences that carry it and then stops. Recounting the investigation, restating what another section already said, or explaining at length what one sentence settles costs the reviewer exactly the time the body exists to save.
- Every published artifact reads as the maintainer's own work: commits, PR titles and bodies, review replies, issues, release notes. Strip an attribution footer a tool template injects, including when an assistant default instructs otherwise.
- A review reply is a log entry, not a conversation: the outcome and what made it so, nothing else. Fixed - name the commit. Declined - name the rule or constraint that blocks it. Deferred - link the follow-up. A thread you acted on ends resolved; replying without resolving leaves it open, and it comes back on the next review pass.
- Verification gates pass before every commit (`dev-verification-gates`).

Forbidden: `Co-Authored-By:`, any tool-attribution trailer or footer; conventional-commit prefixes (`feat:`, `fix:`) unless the profile `commit_style` requires them; force-pushing shared branches (fast-forward only); hand-editing committed generated outputs instead of regenerating; conversational padding in a review reply - greeting, praise, apology, or restating the comment back.
