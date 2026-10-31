# Forge on GitHub

The platform pack that implements the operator pack's forge contract on GitHub, through the `gh` CLI.

| Skill | What it is |
|---|---|
| `forge-github` | `scripts/forge-github.mjs`: the forge contract's subcommands and the readers a discovery script imports |

A project on GitHub installs it with the operator pack and points profile `forge_cli` at the script
(`forge-github` > Setup). Another code host gets its own pack (`forge-<platform>`) implementing the
same contract, checked by the same contract test.
