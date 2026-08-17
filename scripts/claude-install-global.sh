#!/usr/bin/env bash
# Install pack skills as Claude Code user-level (global) skills.
# Copies every skills/<prefix>-* folder of the selected pack(s) into the user
# skills directory, replacing previously installed versions of the same skills.
# Project-level rules and agents are not installed globally; see docs/integration.md.
#
# Usage:
#   bash scripts/claude-install-global.sh             # every pack (core + spec + ...)
#   bash scripts/claude-install-global.sh core        # named packs only
#   bash scripts/claude-install-global.sh all         # every pack (explicit)
# Override target: CLAUDE_SKILLS_DIR=/path/to/skills bash scripts/claude-install-global.sh

set -euo pipefail

PACK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKS_DIR="$PACK_ROOT/packs"
TARGET="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"

[ -d "$PACKS_DIR" ] || { echo "ERROR: packs/ not found at $PACK_ROOT - run from a full checkout." >&2; exit 1; }

# Resolve which packs to install. No args or `all` => every pack.
if [ "$#" -eq 0 ] || [ "$1" = "all" ]; then
    PACKS=()
    for d in "$PACKS_DIR"/*/; do
        [ -d "$d" ] && PACKS+=("$(basename "$d")")
    done
else
    PACKS=("$@")
fi

mkdir -p "$TARGET"

installed=0
for pack in "${PACKS[@]}"; do
    src="$PACKS_DIR/$pack/skills"
    if [ ! -d "$src" ]; then
        echo "WARN: pack '$pack' has no skills/ ($src), skipped." >&2
        continue
    fi
    for skill_dir in "$src"/*/; do
        [ -d "$skill_dir" ] || continue
        name="$(basename "$skill_dir")"
        if [ ! -f "$skill_dir/SKILL.md" ]; then
            echo "WARN: [$pack] $name has no SKILL.md, skipped." >&2
            continue
        fi
        rm -rf "${TARGET:?}/$name"
        cp -r "$skill_dir" "$TARGET/$name"
        echo "installed: [$pack] $name"
        installed=$((installed + 1))
    done
done

echo ""
echo "Done: $installed skills installed to $TARGET"
echo "Uninstall: remove the installed skill folders from $TARGET"
