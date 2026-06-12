---
name: dev-docs-sync-check
description: Verify documentation claims against the actual code and report drift. Use periodically, after large changes, or when docs feel stale.
argument-hint: "[doc path or directory to check]"
---

# dev-docs-sync-check

Documentation that contradicts the code is worse than no documentation: readers and agents act on it. Find the drift and report it with evidence.

## Steps

1. **Pick the scope.** The argument names a doc or directory; default is the project's primary docs (README, docs directory, rules, agent and skill definitions, decision records' factual claims).
2. **Extract verifiable claims** from each document: commands and scripts, file paths, API endpoints and shapes, config keys and defaults, version numbers, architecture statements ("X calls Y", "all writes go through Z").
3. **Verify each claim against the repo.** Does the command exist in the manifest? Does the path exist? Does the endpoint match the route definitions? Does the stated boundary hold in the imports?
4. **Classify each mismatch:**
   - **Drift**: code moved on, doc describes the past. The usual case; fix the doc.
   - **Violation**: doc states the intended rule, code broke it. Fix the code or escalate; do not silently rewrite the rule to match the violation.
   - **Ambiguous**: cannot determine which side is right; needs the owner.
5. **Report.** Each finding: doc location, the claim, the actual state with evidence, classification, suggested fix. Order by reader impact (setup instructions that fail come first).
6. **Fix on request.** Apply the doc-side fixes when asked; code-side fixes go through the normal workflow with their own review.

## Failure modes

- Claims that are intentions or roadmap, not statements of the present: skip them; only present-tense claims are checkable.
- Generated docs: report drift against the generator's input, and regenerate rather than hand-edit the output.
