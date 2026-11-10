# How a run ends

The five endings of a `dev-deliver` run, each stated to the owner (`dev-working-with-people`) rather than left to be read out of silence, and what each leaves them with.

| Ending | What the owner is left with |
|---|---|
| delivered | the closing report - the tag, the merge commit, each criterion against what was observed for it |
| a gate the owner did not give | the gate named, and the pull request carrying the outcome label Phase C wrote |
| Phase C reached `ai:manual` or `ai:failed` | that outcome's list of what the owner has to decide or what blocked it |
| a phase raised a question | the question, and which phase it ended |
| the pull request was already another run's | the `Finalize - HELD` comment naming what this run wanted, and the holder's claim untouched |

Past Phase C every one of them leaves the pull request carrying exactly one outcome label and no `ai:processing` - except the last, which leaves the holder's label exactly as it found it, that pull request never having been this run's to end. Why a run never stops on `ai:processing` is `references/resuming-a-run.md` > Why the claim travels in the handoff.
