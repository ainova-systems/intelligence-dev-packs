# Parallel tasks

How `dev-deliver` gives a parallel task a worktree, what each checkout owns, and where an instance's phases run.

## When a task gets one

One task never makes a worktree at all: a second directory is a cost the owner pays in attention, and nothing buys one for a run that already has somewhere to work. A task arriving while the branch it needs is occupied is the one with nowhere, and it never enters the occupied worktree. Whether it gets its own is profile `worktree_policy`; `always` is the setting for a project that routinely runs parallel tasks in batches.

## Making and removing one

Making one is `git worktree add <root>/<slug> -b <prefix>/<slug> <base>`, `<root>` from profile `worktree_root`; removing it is `git worktree remove`, once `git-merge-pr` confirms the merge landed. A repository where git alone does not leave a directory ready to work in - dependencies to install, env files to link, generated tool files to render - says so in `worktree_create` and `worktree_remove`, and those commands replace both: where a project states how its worktrees are made, that is how they are made.

Every checkout - a worktree a run made or a clone a developer made - owns its local resources: ports, devices, daemons, test identities and env files, derived from its own directory. A project script acts on its own checkout's resources only and never stops what another checkout started; `worktree_create` and `worktree_remove` set up and tear down exactly those.

## Where an instance's phases run

An instance's Phase A stays with the owner in the main session, and its B and C phases are run by a session started in the worktree's own directory. Claude Code loads project skills from the directory a session starts in, and in a worktree with no rendered skills of its own it loads the main checkout's, so work driven from anywhere else is checked against a layer that branch does not carry.
