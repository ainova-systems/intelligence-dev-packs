---
description: Every change is cheap to undo - reversible migrations, flags on risky paths, backout plans
---

# Rollback Safety

At AI pace, mean time to restore matters more than mean time between failures. Changes are shaped so the inevitable mistake is cheap.

## REQUIRED

- Database and data migrations are reversible: a working down path, or a documented restore procedure when a down path is impossible. State which one in the PR.
- Risky or new user-facing paths go behind a feature flag when the project has a flag system; otherwise they ship in a way that can be disabled or reverted in one commit.
- Destructive operations (data deletion, irreversible transforms, breaking API removals) state a backout plan in the PR before they merge.
- Breaking changes follow expand-contract sequencing: add the new path, migrate consumers, then remove the old path (see `dev-impact-analysis`).

## FORBIDDEN

- A migration and an irreversible data cleanup in the same deploy step.
- Removing an API or contract consumers still depend on without the migration sequence.
