# Line endings

What `dev-init` step 7 checks, and why each answer is what it is.

Generated output is written LF on every platform, so a checkout that converts text to CRLF shows every regenerated file as a whole-file diff. In `git check-attr eol` output, `unspecified` leaves `core.autocrlf` deciding per machine, and an explicit `crlf` decides wrongly; only `lf` closes the gap.

A new `.gitattributes` converts nothing already on disk: files stay as they are until re-checked out (`git rm --cached -r . && git reset --hard`), which discards uncommitted work and so is the owner's step on a clean tree. `git add --renormalize .` is no substitute: it leaves the working tree as it was and stages every tracked modification, the blanket staging `git-commit-push` forbids.

An existing `.gitattributes` is never appended to: the last matching pattern wins, so a catch-all at the end overrides every rule above it, and which of those rules was deliberate is the owner's call.
