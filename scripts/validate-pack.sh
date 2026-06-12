#!/usr/bin/env bash
# Validate pack structure and conventions:
# - every rules/*.md and agents/*.md has frontmatter with a description
# - every skills/*/ folder has SKILL.md with name + description frontmatter
# - skill folder name matches its frontmatter name
# - every artifact name carries the dev- prefix
# Zero dependencies: bash + grep only.

set -euo pipefail

PACK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
errors=0

fail() {
    echo "FAIL: $1" >&2
    errors=$((errors + 1))
}

has_frontmatter_key() {
    # $1 file, $2 key — key must appear between the opening and closing --- lines
    awk -v key="$2" '
        NR == 1 && $0 != "---" { exit 1 }
        NR > 1 && $0 == "---" { exit found ? 0 : 1 }
        $0 ~ "^" key ":" { found = 1 }
    ' "$1"
}

# --- rules ---
for f in "$PACK_ROOT"/rules/*.md; do
    [ -e "$f" ] || { fail "rules/ is empty"; break; }
    base="$(basename "$f" .md)"
    case "$base" in dev-*) ;; *) fail "rule '$base' missing dev- prefix" ;; esac
    has_frontmatter_key "$f" "description" || fail "rule '$base' missing description frontmatter"
done

# --- agents ---
for f in "$PACK_ROOT"/agents/*.md; do
    [ -e "$f" ] || { fail "agents/ is empty"; break; }
    base="$(basename "$f" .md)"
    case "$base" in dev-*) ;; *) fail "agent '$base' missing dev- prefix" ;; esac
    has_frontmatter_key "$f" "description" || fail "agent '$base' missing description frontmatter"
    has_frontmatter_key "$f" "tier" || fail "agent '$base' missing tier frontmatter"
    has_frontmatter_key "$f" "access" || fail "agent '$base' missing access frontmatter"
done

# --- skills ---
for d in "$PACK_ROOT"/skills/*/; do
    [ -d "$d" ] || { fail "skills/ is empty"; break; }
    name="$(basename "$d")"
    case "$name" in dev-*) ;; *) fail "skill folder '$name' missing dev- prefix" ;; esac
    if [ ! -f "$d/SKILL.md" ]; then
        fail "skill '$name' missing SKILL.md"
        continue
    fi
    has_frontmatter_key "$d/SKILL.md" "name" || fail "skill '$name' missing name frontmatter"
    has_frontmatter_key "$d/SKILL.md" "description" || fail "skill '$name' missing description frontmatter"
    fm_name="$(grep -m1 '^name:' "$d/SKILL.md" | sed 's/^name:[[:space:]]*//' | tr -d '"' || true)"
    [ "$fm_name" = "$name" ] || fail "skill '$name' frontmatter name is '$fm_name' (must match folder)"
done

# --- template ---
[ -f "$PACK_ROOT/templates/dev-project-profile.md" ] || fail "templates/dev-project-profile.md missing"

if [ "$errors" -gt 0 ]; then
    echo ""
    echo "$errors problem(s) found." >&2
    exit 1
fi

echo "OK: pack structure valid."
