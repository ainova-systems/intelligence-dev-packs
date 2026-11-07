# Enforcement - turning prose invariants into machinery

A rule or a skill is context, not configuration: an instruction like "never force-push" in a rule file is a request the model almost always honors, never a guarantee. Anthropic documents this explicitly for Claude Code - to block an action regardless of what the model decides, use a `PreToolUse` hook or a `permissions.deny` entry. This page maps the pack's hard invariants to the mechanism that actually enforces each, so a host project can install the machinery next to the prose.

This layer is also the part of an install that survives a model change: settings and hooks consume zero instruction tokens and behave identically on every model.

## The mapping

| Pack invariant (prose home) | Mechanism | How |
|---|---|---|
| Never force-push (`git-commit-push`, `git-workflow`) | `permissions.deny` | `Bash(git push *--force*)`, `Bash(git push -f*)`, `Bash(git push * -f*)`, `Bash(git push * +*)` - the flag or the `+` refspec anywhere in the command |
| Never blanket-stage (`git-commit-push`: no `git add -A`) | `permissions.deny` | `Bash(git add -A *)`, `Bash(git add --all *)`, `Bash(git add . *)` |
| Never bypass gates (`dev-verification-gates`: no `--no-verify`) | `permissions.deny` | `Bash(git commit *--no-verify*)`, `Bash(git commit -n*)`, `Bash(git commit * -n)`, `Bash(git commit * -n *)` - the flag before or after the message |
| Never discard uncommitted work (`git-sync-base`, `spec-continue`) | `permissions.deny` | `Bash(git reset *--hard*)`, `Bash(git clean *)`, `Bash(git checkout -- *)`, `Bash(git checkout * -- *)`, `Bash(git restore *)`, `Bash(git stash *)` |
| Never push to a protected branch (`git-workflow`), except the paths profile `direct_lane` names | `PreToolUse` hook | `dev-init`'s `scripts/guard-push.mjs` on `Bash\|PowerShell`. It resolves every branch a `git push` would update - each refspec, `remote.<name>.push`, and `push.default` for the current branch - through `git -C`, a `cd` earlier in the chain, `sh -c`, `pwsh -Command`, command substitutions and git aliases, and denies a branch profile `protected_branches` names unless every path the push changes there matches `direct_lane` (the diff from the remote-tracking ref, or the whole tree when there is none). `--all`, `--mirror`, deleting a protected branch and a push it cannot resolve are denied. Each handler carries `if: Bash(*push*)` or `if: PowerShell(*push*)`, so `node` starts only for a command whose text names `push` |
| Developer credentials stay out of the session (profile `secrets_file`) | `permissions.deny` | `Read(.env.local)`, or the profile's path; it also covers `cat`, `head`, `tail` and `sed` on that file, while a script that opens the file itself still reads it |
| No tool attribution on commits or pull requests (`git-commit-conventions`) | `attribution` | `commit: ""`, `pr: ""` and `sessionUrl: false` - the empty strings alone still let a cloud or Remote Control session append its session link |
| No `Co-Authored-By:` written by the model itself (`git-commit-conventions`) | `PreToolUse` hook | Match `Bash\|PowerShell`, grep the command string for `Co-Authored-By`; exit 2 to block (exit 1 lets the call through) |
| Never commit to a protected branch (`git-commit-push` guard) | `PreToolUse` hook | Match `Bash\|PowerShell` on `git commit`; compare `git branch --show-current` against the profile's protected branches |
| Secrets never committed (`git-scan-secrets` inside the commit flow) | `PreToolUse` hook | Run the scan over staged files before `git commit`; block on a live match |
| Merge/release timing is the owner's (`git-merge-pr`, `git-create-release`) | `permissions.ask` | `Bash(gh pr merge:*)`, `Bash(gh release create:*)`, `Bash(git push origin v*)` - the prompt lands on the irreversible command itself, after the guards have run |
| Everything else (review verdicts, spec doctrine, delegation rules) | Prose | Judgment calls; no deterministic rule can decide them |

## Installing

1. **`dev-init` merges the settings.** It merges the core pack's `templates/claude-settings.json` into the host project's `.claude/settings.json`, additively across `attribution`, every `permissions` list it carries - `deny` for what is never allowed, `ask` for the irreversible acts the owner approves at the command - and the push guard's `hooks.PreToolUse` handler; the project's existing entries are kept. It reports the harmless commands the rules also deny, and any push-deny rule an earlier version wrote for a protected branch as superseded by the guard. The file is at `.intelligence/packages/@ainova-systems/core/templates/claude-settings.json` after a package install, `packs/core/templates/claude-settings.json` in this repository, or `intelligence/templates/claude-settings.json` after a plain copy. Doing the same merge by hand is identical.
2. Add the hook entries the project wants under `hooks.PreToolUse`. A minimal trailer-blocker, inline:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|PowerShell",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.command' | grep -q 'Co-Authored-By' && { echo 'Blocked: no co-author trailers (git-commit-conventions)' >&2; exit 2; } || exit 0"
          }
        ]
      }
    ]
  }
}
```

3. Keep the prose rule after the mechanism exists - the rule carries the why and covers the surfaces the mechanism cannot see - but never state the same boundary in two prose places: one instruction, one home; the mechanism is the enforcement, the rule is the context.

## Limits, stated honestly

- A `PreToolUse` hook blocks the tool call it matches; it cannot police file content written by other tools - pair it with the verification gates for that.
- A Stop hook is overridden after repeated consecutive blocks, and hook filters fail open. For an absolute ban, use `permissions.deny` - permission rules are enforced by the client regardless of what the model decides.
- **A `Bash` rule matches the text Claude writes, not the program.** Claude Code checks every part of a compound command against `deny`, but `git -C . push --force` and `sh -c '...'` pass every rule here (Claude Code docs, Configure permissions, "What a Bash rule doesn't match"). The forms that match a flag anywhere in the command buy their coverage with a few harmless denials, which `dev-init` reports; the forge's branch protection stays the boundary. `packs/core/skills/dev-init/scripts/settings-patterns.test.mjs` checks the rule shapes against a simulation of the documented matcher, not against Claude Code itself.
- **On Windows the template's rules are `Bash` rules, and a `Bash` rule does not restrict the PowerShell tool.** With Git Bash installed, Claude Code turns PowerShell off for a session whose settings hold a scoped `Bash` deny rule, unless `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` or a `PowerShell(...)` rule is set; without Git Bash, PowerShell is on. Wherever PowerShell runs, each deny rule needs a `PowerShell(...)` twin to hold there. The push guard matches `Bash|PowerShell` and reads PowerShell syntax, so it holds on both.
- **Protected branches are a hook's, because a deny rule cannot make an exception.** Rules are evaluated deny first, so no allow rule overrides a deny rule, and a matching deny rule blocks a call whatever a hook returns (Configure permissions, "Manage permissions" and "Precedence among rules, hooks, and mods"). A push-deny rule for a branch therefore also blocked the documents a project pushes straight to it. The guard decides per push instead, and its deny holds over allow rules as well. It reads the command the way a shell would, so `git -C`, chains and `sh -c` do not get past it; a push run from a script file, or by a program other than git, does. `packs/core/skills/dev-init/scripts/guard-push.test.mjs` runs it against a real repository and remote.
- **The guard sees only a command that names `push`.** The `if` filter keeps every other shell call free of a `node` start (about 200 ms each), so a push whose text hides the word, such as a git alias `git p` or a PowerShell `-EncodedCommand`, never reaches the guard. Forge branch protection stays the boundary.
- **The guard is off until its script exists.** The hook runs `node` on the copy rendered into `.claude/skills/dev-init/scripts/`, which the engine generates and git ignores. In a fresh clone before `intelligence sync`, in a worktree whose skills were never rendered, or on a host without `node` on `PATH`, the hook cannot start. Claude Code treats that as a non-blocking error: the transcript shows a `PreToolUse` hook error notice and the command runs (Hooks reference, "Other exit codes"). `onFailure: "block"` would block every shell command instead, `intelligence sync` included, so the template leaves it unset. The settings file, its rules and hooks alike, also loads only from the `.claude/` of the directory the session starts in (Configure permissions, "Where output styles, hooks, and local settings load from"). The forge's branch protection stays the boundary.
- **The gate sits on the act, not on the invocation.** `git-merge-pr` and `git-create-release` used to carry `disable-model-invocation: true`, which blocked the wrong boundary: it stopped an orchestrating skill from reaching them at all, so `dev-deliver` could not finish its own last two phases, while the merge itself was gated only by the owner having typed a command earlier. The `ask` rules move the prompt to `gh pr merge`, `gh release create` and the tag push, which is both later and better informed - by then `git-merge-pr`'s guards have confirmed CI green, `ai:completed` with every factor fresh, zero unresolved threads and no conflict, so the owner approves a merge that is already known to be merge-ready rather than a command that may turn out not to be.
- **`ask` is defeated by a mode the owner chose.** `permissions.defaultMode: bypassPermissions`, and an auto-mode allow broad enough to cover these commands, skip the prompt; `disable-model-invocation` would have held there. That is a deliberate opt-out of every prompt, not a gap this page can close - but a project that runs in bypass mode should know the merge gate is prose for it.
- **A rule that never matches looks exactly like a gate.** `gh pr merge` and `gh release create` are stable shapes, but `Bash(git push origin v*)` assumes the profile's `tag_format` starts with `v`, and another forge's commands (`glab mr merge`) are not in the template at all - the same reference-implementation caveat the skills carry for `gh`. A project on a different tag format or forge adds its own entries; `git-create-release` step 7 still asks before pushing a tag regardless.
- **The gate holds on one tool.** `permissions.ask` is Claude Code's field, as `disable-model-invocation` was. On Cursor, Copilot, Codex, Pi and opencode, nothing in the settings file applies, and the gate is prose there rather than machinery. A project running those tools either relies on that tool's own permission layer where one exists, or does not install the two skills for it - and either way the owner should know which of the two situations they are in.
- **This page's layer is an agent's behaviour, not a repository's permissions.** Every mechanism here constrains what an agent does on this machine. Who may push to a branch, what a ruleset locks, who may delete a tag - that is repository configuration, and a settings file is no substitute for it: a permission rule does not stop a person, and a branch nothing stops pushes to is one whose owner decided that. Reaching into that layer from here would manufacture a sense of protection rather than provide one. `dev-init` reports where what the profile claims and what the forge enforces disagree; what to do about it is the owner's.
- Other tools (Cursor, Copilot, Codex) have their own or no enforcement layers; this page's mechanisms are Claude Code's. The prose invariants still travel to every tool the engine renders.
