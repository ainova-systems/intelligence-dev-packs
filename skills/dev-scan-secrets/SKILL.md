---
name: dev-scan-secrets
description: Scan the diff, working tree, and branch history for committed credentials and report exposure with severity. Use before pushing, during reviews, or on suspicion of a leak.
argument-hint: "[scope: diff|tree|history]"
---

# dev-scan-secrets

Find credentials before they reach a remote, and treat anything already pushed as an incident, not a cleanup.

## Steps

1. **Pick the scope.** Default: the pending diff plus commits ahead of the branch target. `tree` scans tracked files; `history` additionally walks the branch's commit history for secrets added then removed.
2. **Scan for the patterns:** private keys (`-----BEGIN`), cloud and API key shapes (`AKIA`, `sk-`, `ghp_`, `xox`, `AIza`, JWT-looking blobs), connection strings with passwords, `password=`/`secret=`/`token=` assignments with literal values, and `.env`-style files that are not in `.gitignore`.
3. **Classify each hit:**
   - **Live secret** (real credential, plausibly valid): critical.
   - **Test or placeholder value**: verify it is genuinely fake (documented dummy, obviously synthetic); downgrade only with evidence.
   - **Template reference** (`${VAR}`, vault paths): not a finding.
4. **Report** each finding with `file:line` (or commit hash for history hits), the credential type, and the classification reasoning.
5. **For a live secret already committed:**
   - Not yet pushed: remove it from the commit (amend or rewrite the local history) and move the value to the environment or secret store.
   - Already pushed: **rotation first** - the secret is compromised regardless of any history rewrite. Then purge it from history per the platform's procedure and add the path to `.gitignore`.

## Failure modes

- High-entropy strings that are hashes, IDs, or fixtures: verify before flagging; a report full of false positives trains people to ignore it.
- Never print a discovered live secret back in full; reference its location and a redacted form.
