#!/usr/bin/env bash
# Validate every pack under packs/:
# - each pack derives one prefix (from its first skill, else rule, else agent)
# - every rule / agent / skill / template name carries that prefix
# - rules and agents have description frontmatter; agents have tier + access
# - each skill folder has SKILL.md whose `name` matches the folder
# - a templates/ folder, if present, is non-empty
# Zero dependencies: bash + awk + grep.

set -euo pipefail

PACK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKS_DIR="$PACK_ROOT/packs"
errors=0

fail() { echo "FAIL: $1" >&2; errors=$((errors + 1)); }

has_frontmatter_key() {
    # $1 file, $2 key — key must appear between the opening and closing --- lines
    awk -v key="$2" '
        NR == 1 && $0 != "---" { exit 1 }
        NR > 1 && $0 == "---" { exit found ? 0 : 1 }
        $0 ~ "^" key ":" { found = 1 }
    ' "$1"
}

[ -d "$PACKS_DIR" ] || { echo "FAIL: packs/ directory not found at $PACK_ROOT" >&2; exit 1; }

pack_count=0
for pack_dir in "$PACKS_DIR"/*/; do
    [ -d "$pack_dir" ] || continue
    pack="$(basename "$pack_dir")"
    pack_count=$((pack_count + 1))

    # Derive the pack prefix from the first skill, else rule, else agent.
    prefix=""
    for probe in skills rules agents; do
        for p in "$pack_dir$probe"/*; do
            [ -e "$p" ] || continue
            n="$(basename "$p" .md)"
            prefix="${n%%-*}-"
            break
        done
        [ -n "$prefix" ] && break
    done
    if [ -z "$prefix" ]; then
        fail "[$pack] no rules/agents/skills to derive a prefix from"
        continue
    fi
    echo "pack '$pack' — prefix '$prefix'"

    for f in "$pack_dir"rules/*.md; do
        [ -e "$f" ] || break
        base="$(basename "$f" .md)"
        case "$base" in "$prefix"*) ;; *) fail "[$pack] rule '$base' missing '$prefix' prefix" ;; esac
        has_frontmatter_key "$f" "description" || fail "[$pack] rule '$base' missing description frontmatter"
    done

    for f in "$pack_dir"agents/*.md; do
        [ -e "$f" ] || break
        base="$(basename "$f" .md)"
        case "$base" in "$prefix"*) ;; *) fail "[$pack] agent '$base' missing '$prefix' prefix" ;; esac
        has_frontmatter_key "$f" "description" || fail "[$pack] agent '$base' missing description frontmatter"
        has_frontmatter_key "$f" "tier" || fail "[$pack] agent '$base' missing tier frontmatter"
        has_frontmatter_key "$f" "access" || fail "[$pack] agent '$base' missing access frontmatter"
    done

    for d in "$pack_dir"skills/*/; do
        [ -d "$d" ] || break
        name="$(basename "$d")"
        case "$name" in "$prefix"*) ;; *) fail "[$pack] skill folder '$name' missing '$prefix' prefix" ;; esac
        if [ ! -f "$d/SKILL.md" ]; then
            fail "[$pack] skill '$name' missing SKILL.md"
            continue
        fi
        has_frontmatter_key "$d/SKILL.md" "name" || fail "[$pack] skill '$name' missing name frontmatter"
        has_frontmatter_key "$d/SKILL.md" "description" || fail "[$pack] skill '$name' missing description frontmatter"
        fm_name="$(grep -m1 '^name:' "$d/SKILL.md" | sed 's/^name:[[:space:]]*//' | tr -d '"' || true)"
        [ "$fm_name" = "$name" ] || fail "[$pack] skill '$name' frontmatter name is '$fm_name' (must match folder)"
    done

    if [ -d "$pack_dir"templates ]; then
        tcount=$(find "$pack_dir"templates -maxdepth 1 -name '*.md' | wc -l)
        [ "$tcount" -gt 0 ] || fail "[$pack] templates/ exists but contains no .md files"
    fi
done

[ "$pack_count" -gt 0 ] || fail "no packs found under packs/"

if [ "$errors" -gt 0 ]; then
    echo "" >&2
    echo "$errors problem(s) found." >&2
    exit 1
fi

echo ""
echo "OK: $pack_count pack(s) valid."
