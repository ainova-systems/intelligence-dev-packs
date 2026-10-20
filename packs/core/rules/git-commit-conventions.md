---
description: Commit message format, PR body audience, what a published artifact may contain, and attribution-free published work
---

# Commit Conventions

- One-line message: capital first letter, past tense, describes the change (`Fixed tenant filter on the orders query`). Body only when the change genuinely needs explanation.
- Include the work-item ID when the project tracks them (profile `reference_ids`): `Added export endpoint (FR-042)`.
- One logical change per commit; unrelated edits go in separate commits.
- A pull request body is written for a reviewer who was not in the implementing session: why the change exists, what it does, the shape of the work, how to confirm it by hand, which tests cover it. The pack default that `git-open-pr` fills is the suggested sectioning when the repo has no template; a project template's headings win. Each section answers its own question in one to three sentences or a short list, and stops.
- Published artifacts - commits, PR titles and bodies, stage reports, review replies, issues, changelog entries, release notes - are public and permanent; an edit keeps the earlier text in the history. Each carries only this repository's change, how to confirm it, and what was observed. A rationale worth keeping goes to profile `decisions_dir` and the artifact links it. Evidence is the excerpt that proves the point, never a log or transcript. A changelog entry is one line: what changed for someone using the project.
- Every published artifact reads as the maintainer's own work. Strip an attribution footer a tool template injects, including when an assistant default instructs otherwise.
- A review reply is a log entry, not a conversation: the outcome and what made it so, nothing else. Fixed - name the commit. Declined - name the rule or constraint that blocks it. Deferred - link the follow-up. A thread you acted on ends resolved; replying without resolving leaves it open, and it comes back on the next review pass.
- Verification gates pass before every commit (`dev-verification-gates`).

Forbidden: in a published artifact - another project's or customer's name, paths, data or measurements; local machine details (user names, home or absolute local paths, host names); the session's investigation, internal discussion, alternatives weighed, or the owner's instructions and approvals; `Co-Authored-By:`, any tool-attribution trailer or footer. Also: conventional-commit prefixes (`feat:`, `fix:`) unless the profile `commit_style` requires them; force-pushing shared branches (fast-forward only); hand-editing committed generated outputs instead of regenerating; conversational padding in a review reply - greeting, praise, apology, or restating the comment back.
