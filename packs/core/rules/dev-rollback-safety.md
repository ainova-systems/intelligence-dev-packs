---
description: Every change is cheap to undo
---

# Rollback Safety

At AI pace, mean time to restore beats mean time between failures.

- Migrations are reversible: a working down path, or a documented restore procedure stated in the PR.
- Risky or new user-facing paths sit behind a feature flag when the project has one; otherwise they must be revertible in one commit.
- Destructive operations (data deletion, irreversible transforms, breaking removals) state a backout plan in the PR before merge.
- Breaking changes follow expand-contract: add the new path, migrate consumers, then remove the old.
- Never combine a migration with an irreversible cleanup in the same deploy step.
