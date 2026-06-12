---
name: dev-impact-analysis
description: Map the blast radius of a proposed change - all dependents, breaking vs compatible, migration sequencing. Use before breaking changes, contract changes, or large refactors.
argument-hint: "<change description, symbol, or contract>"
---

# dev-impact-analysis

Enumerate everything a proposed change touches before anyone implements it, so breaking work is sequenced instead of discovered in production.

## Steps

1. **Pin down what changes.** The exact symbols, endpoints, schemas, events, or config keys being modified or removed.
2. **Find every dependent.**
   - In-repo: references via search and the type system; tests that encode the current behavior; generated clients.
   - Cross-boundary: consumers of the API or events (other services, mobile and web clients, third-party integrations, scheduled jobs). The repo cannot list these; check contracts, API docs, and ask about consumers you cannot see.
   - Data: stored rows, queued messages, and caches that embed the old shape and outlive the deploy.
3. **Classify each dependent**: unaffected, compatible (works through the transition), or breaking (needs migration before or with the change).
4. **Sequence the migration** for the breaking set, expand-contract by default (`dev-rollback-safety`): add the new path, migrate consumers in dependency order, then remove the old path. Each phase independently deployable and reversible.
5. **Report.** The dependent inventory with classification and evidence (`file:line`, contract reference), the migration sequence, the risks that remain, and the dependents that could not be verified from the repo - named explicitly as unknowns, never assumed safe.

## Failure modes

- Dynamic usage (reflection, string-built queries, dynamic dispatch) that search cannot prove: flag the possibility instead of declaring zero usages.
- The analysis shows the change is bigger than the requester assumed: that is the finding; report it before any implementation starts.
