# Enforcement - turning prose invariants into machinery

A rule or a skill is context, not configuration: an instruction like "never force-push" in a rule file is a request the model almost always honors, never a guarantee. Anthropic documents this explicitly for Claude Code - to block an action regardless of what the model decides, use a `PreToolUse` hook or a `permissions.deny` entry. This page maps the pack's hard invariants to the mechanism that actually enforces each, so a host project can install the machinery next to the prose.

This layer is also the part of an install that survives a model change: settings and hooks consume zero instruction tokens and behave identically on every model.

## The mapping

| Pack invariant (prose home) | Mechanism | How |
|---|---|---|
| Never force-push (`git-commit-push`, `git-workflow`) | `permissions.deny` | `Bash(git push --force:*)`, `Bash(git push -f:*)` |
| Never blanket-stage (`git-commit-push`: no `git add -A`) | `permissions.deny` | `Bash(git add -A:*)`, `Bash(git add --all:*)` |
| Never bypass gates (`dev-verification-gates`: no `--no-verify`) | `permissions.deny` | `Bash(git commit --no-verify:*)`, `Bash(git commit -n:*)` |
| No `Co-Authored-By:` / tool trailers (`git-commit-conventions`) | `PreToolUse` hook | Match `Bash`, grep the command string for `Co-Authored-By`; exit non-zero to block |
| Never commit to a protected branch (`git-commit-push` guard) | `PreToolUse` hook | Match `Bash` on `git commit`; compare `git branch --show-current` against the profile's protected branches |
| Secrets never committed (`git-scan-secrets` inside the commit flow) | `PreToolUse` hook | Run the scan over staged files before `git commit`; block on a live match |
| Merge/release timing is the owner's (`git-merge-pr`, `git-create-release`) | `permissions.ask` | `Bash(gh pr merge:*)`, `Bash(gh release create:*)`, `Bash(git push origin v*)` - the prompt lands on the irreversible command itself, after the guards have run |
| Everything else (review verdicts, spec doctrine, delegation rules) | Prose | Judgment calls; no deterministic rule can decide them |

## Installing

1. **`dev-init` merges the permission rules.** It merges the core pack's `templates/claude-settings.json` into the host project's `.claude/settings.json`, additively across every `permissions` list it carries - `deny` for what is never allowed, `ask` for the irreversible acts the owner approves at the command; the project's existing entries in either list are kept. The file is at `.intelligence/packages/@ainova-systems/core/templates/claude-settings.json` after a package install, `packs/core/templates/claude-settings.json` in this repository, or `intelligence/templates/claude-settings.json` after a plain copy. Doing the same merge by hand is identical.
2. Add the hook entries the project wants under `hooks.PreToolUse`. A minimal trailer-blocker, inline:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
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
- **The gate sits on the act, not on the invocation.** `git-merge-pr` and `git-create-release` used to carry `disable-model-invocation: true`, which blocked the wrong boundary: it stopped an orchestrating skill from reaching them at all, so `dev-deliver` could not finish its own last two phases, while the merge itself was gated only by the owner having typed a command earlier. The `ask` rules move the prompt to `gh pr merge`, `gh release create` and the tag push, which is both later and better informed - by then `git-merge-pr`'s guards have confirmed CI green, `ai:completed` with every factor fresh, zero unresolved threads and no conflict, so the owner approves a merge that is already known to be merge-ready rather than a command that may turn out not to be.
- **`ask` is defeated by a mode the owner chose.** `permissions.defaultMode: bypassPermissions`, and an auto-mode allow broad enough to cover these commands, skip the prompt; `disable-model-invocation` would have held there. That is a deliberate opt-out of every prompt, not a gap this page can close - but a project that runs in bypass mode should know the merge gate is prose for it.
- **A rule that never matches looks exactly like a gate.** `gh pr merge` and `gh release create` are stable shapes, but `Bash(git push origin v*)` assumes the profile's `tag_format` starts with `v`, and another forge's commands (`glab mr merge`) are not in the template at all - the same reference-implementation caveat the skills carry for `gh`. A project on a different tag format or forge adds its own entries; `git-create-release` step 7 still asks before pushing a tag regardless.
- **The gate holds on one tool.** `permissions.ask` is Claude Code's field, as `disable-model-invocation` was. On Cursor, Copilot, Codex, Pi and opencode, nothing in the settings file applies, and the gate is prose there rather than machinery. A project running those tools either relies on that tool's own permission layer where one exists, or does not install the two skills for it - and either way the owner should know which of the two situations they are in.
- **This page's layer is an agent's behaviour, not a repository's permissions.** Every mechanism here constrains what an agent does on this machine. Who may push to a branch, what a ruleset locks, who may delete a tag - that is repository configuration, and a settings file is no substitute for it: a permission rule does not stop a person, and a branch nothing stops pushes to is one whose owner decided that. Reaching into that layer from here would manufacture a sense of protection rather than provide one. `dev-init` reports where what the profile claims and what the forge enforces disagree; what to do about it is the owner's.
- Other tools (Cursor, Copilot, Codex) have their own or no enforcement layers; this page's mechanisms are Claude Code's. The prose invariants still travel to every tool the engine renders.
