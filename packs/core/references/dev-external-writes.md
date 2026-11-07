# External writes

How a project's layer writes into a system people own and edit by hand: a tracker item, a comment, a created task, a design file, a published page. `dev-working-with-people` sets the consent a write needs; this page makes each write exactly the one that consent covered. The pull request writes of the git skills and the operator pack's forge contract keep their own contracts.

## One subcommand per write

- Every such write is a subcommand of a project script, and skills make no raw API call. A write that no subcommand serves gets one before the skill that needs it ships.
- Without `--apply` a subcommand is a dry run: it prints exactly what it would send, created names included, and writes nothing. `--apply` comes last, so the write differs from the dry run the person saw by that one word.
- The host's permission allow-list names exactly those apply forms. In Claude Code that is one `permissions.allow` entry per subcommand in `.claude/settings.json`, such as `Bash(node scripts/tracker.mjs comment * --apply)`. Claude Code matches everything before the first `*` as written, so the subcommand stays before it and the entry admits only that subcommand's write.

## The payload

- The script checks the payload before it sends and refuses, writing nothing, any content kind the layer does not write, such as a comment of a kind the script does not name or a description section the layer does not own.
- A write changes only the sections the layer owns. Everything else is copied from the system's native format (its rich text or HTML) and sent back unchanged, since a round trip through markdown can drop images, mentions and formatting. After the write the script reads the item back in that native format and compares the part it did not own; a target whose sections cannot be cut out exactly is refused with nothing written.
- A created item is named with the prefix pattern most of its siblings share, and the dry run shows that name before the yes.

## Output

Every subcommand prints JSON, or text between named start and end markers, so an agent that reads two outputs in one turn cannot take one for part of the other.
