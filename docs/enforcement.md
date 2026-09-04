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
| Merge/release timing is the owner's (`git-merge-pr`, `git-create-release`) | `disable-model-invocation: true` | Already set in the skills' frontmatter - **Claude Code only**, see Limits |
| Everything else (review verdicts, spec doctrine, delegation rules) | Prose | Judgment calls; no deterministic rule can decide them |

## Installing

1. Merge `packs/core/templates/claude-settings.json` into the host project's `.claude/settings.json` (`permissions.deny` is additive - keep the project's existing entries).
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
- **The owner gate holds on one tool.** `disable-model-invocation` is Claude Code's field: the engine passes it through untouched and every other target ignores what it does not understand. On Cursor, Copilot, Codex, Pi and opencode, `git-merge-pr` and `git-create-release` are model-reachable, and the gate is prose there rather than machinery. A project running those tools either relies on that tool's own permission layer where one exists, or does not install the two skills for it - and either way the owner should know which of the two situations they are in.
- Other tools (Cursor, Copilot, Codex) have their own or no enforcement layers; this page's mechanisms are Claude Code's. The prose invariants still travel to every tool the engine renders.
