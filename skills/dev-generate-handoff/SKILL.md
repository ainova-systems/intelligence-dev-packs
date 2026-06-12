---
name: dev-generate-handoff
description: Generate a self-contained continuation prompt so work resumes in a fresh session without loss. Use when context is filling up, switching machines or tools, or pausing multi-session work.
---

# dev-generate-handoff

Produce a portable prompt that lets a fresh session (any tool, any machine, another person's agent) continue the work exactly where it stands. The output is a prompt to paste, not a summary of the conversation.

## Steps

1. **Capture the task**: the original goal in the user's framing, the agreed scope, and the constraints that were established along the way.
2. **Capture the state**:
   - Branch name and its target, latest commit, uncommitted changes (list the files and what is in them).
   - What is done and verified (which gates ran, with what result).
   - What is in progress, and the exact next action it was heading toward.
3. **Capture the decisions**: every choice made during the work with its one-line rationale, including rejected approaches so the next session does not retry them.
4. **Capture the open items**: unanswered questions, known risks, anything deferred.
5. **Write the handoff** as a single self-contained prompt:
   - Explicit repo-relative paths; no "the file we discussed", no references to this conversation.
   - Ordered next steps, starting with the very next action.
   - The verification commands the next session should run first to confirm the state.
6. **Deliver**: output the prompt in full, and on request also save it to a scratch location outside version control.

## Failure modes

- A fact you are not sure survived the session (was it committed? did the test pass?): verify with a command now rather than handing off a guess.
- Handoff longer than the work remaining: trim to what the next session genuinely cannot re-derive from the repo - decisions and intent first, mechanics last.
