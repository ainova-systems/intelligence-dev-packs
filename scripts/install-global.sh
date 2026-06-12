#!/usr/bin/env bash
# Install the pack skills as Claude Code user-level (global) skills.
# Copies every skills/dev-* folder into the user skills directory, replacing
# previously installed versions of the same skills. Project-level rules and
# agents are not installed globally; see docs/INTEGRATION.md Mode A or C.
#
# Usage: bash scripts/install-global.sh
# Override target: CLAUDE_SKILLS_DIR=/path/to/skills bash scripts/install-global.sh

set -euo pipefail

PACK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"

if [ ! -d "$PACK_ROOT/skills" ]; then
    echo "ERROR: skills/ not found at $PACK_ROOT - run from a full pack checkout." >&2
    exit 1
fi

mkdir -p "$TARGET"

installed=0
for skill_dir in "$PACK_ROOT"/skills/dev-*/; do
    [ -d "$skill_dir" ] || continue
    name="$(basename "$skill_dir")"
    if [ ! -f "$skill_dir/SKILL.md" ]; then
        echo "WARN: $name has no SKILL.md, skipped." >&2
        continue
    fi
    rm -rf "${TARGET:?}/$name"
    cp -r "$skill_dir" "$TARGET/$name"
    echo "installed: $name"
    installed=$((installed + 1))
done

echo ""
echo "Done: $installed skills installed to $TARGET"
echo "Uninstall: remove the dev-* folders from $TARGET"
