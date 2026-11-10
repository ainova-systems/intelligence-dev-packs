# Upfront approvals

What profile `flow_approvals: upfront` changes in `dev-deliver`, and what it leaves alone.

`upfront` takes both gates before the work exists, so each is a standing authorization and not a judgement of a diff: the accept gate authorizes merging once the pull request is accept-ready **and nothing has escalated to the owner**, the release gate authorizes cutting the change once it is merged. An upfront grant is permission not to be asked again; it is never permission to proceed past a caveat, and anything that would have reached the owner mid-run still reaches them. It moves when the owner acts, never whether: a host may stop again at the irreversible command itself, and a grant given earlier does not answer that.

A gate declined upfront withholds the boundary it governs and nothing earlier: each still sits where the boundary table puts it, so a refused accept ends the run at C to D and a refused release after the merge, exactly where `per-gate` would have ended it. Asking sooner never shortens the work that reaches the gate - a declined accept is the owner saying this will not merge itself, not that the change goes unwritten and unreviewed.
