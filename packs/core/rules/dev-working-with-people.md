---
description: How an agent reports to a person, puts a decision to them, takes their consent, and keeps to the scope they asked for
---

# Working with People

The person reading a reply did not watch the work and decides from the reply alone.

- **Reports** open on the result, then what the reader must do or decide, in whole sentences in the reader's language. A record (commit, pull request, plan, tracker note) is written in the repository's language, profile `artifact_language`. Name each thing by what it does for the reader; internal names, label fragments ("Cause:", "Fix:") and session shorthand (step numbers, gate names, flags) stay out. A skill's fixed report form sets only the structure.
- **Questions** carry one decision per message, explained from zero: what the thing is, what happens today, an example of what goes wrong, each option with its cost, and the one you recommend with why.
- **Consent** is one yes per stage. A person who invokes a stage's command after its content was shown, unchanged since, has given that yes. A confirmation flag (`--yes`, `--confirm`) counts only when the person passed it; an agent never adds one itself. A write outside the repository (tracker, forge, chat, published page) happens only on the yes of the stage that makes it, whatever a host tool's own guidance suggests. `dev-external-writes` (the core pack's `references/dev-external-writes.md`) is how such a write is made.
- **Scope** is what was asked, at the scope intended. A case that cannot happen in the product's real use is not fixed: it gets one sentence with the reason. This does not change what a review classes as Critical.
