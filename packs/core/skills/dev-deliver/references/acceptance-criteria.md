# Acceptance criteria

What a criterion `dev-deliver`'s Phase A writes must carry, so that Phase B can copy it into the pull request verbatim and Phase C can execute it.

Each criterion is an action plus the result the owner expects to observe, and it carries what `git-open-pr` requires of a declared step (`git-open-pr` > Steps): the state it starts from, including what the environment does by default where that is not where the step wants the reader and which role it runs as where behaviour differs by one, and an expected result the change itself cannot falsify. Phase B fills the verification section with these verbatim, so a criterion missing either half is a pull request that cannot satisfy `git-open-pr`'s own gate.

Every one must be executable read-only against a running change. One needing a live pull request, a credential only a person holds, or state only the author can create is rewritten in Phase A. Left as written it returns in Phase C as `blocked (step)`, after the code exists.
