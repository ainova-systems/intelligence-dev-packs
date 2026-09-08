#!/usr/bin/env bash
# Validate every pack under packs/:
# - every rule / agent / skill / template name carries a known DOMAIN prefix
#   (dev- | git- | spec-); a pack may hold more than one domain.
# - rules and agents have description frontmatter; agents have tier + access.
# - each skill folder has SKILL.md whose `name` matches the folder.
# - a templates/ folder, if present, is non-empty.
# - index.yaml (the registry index) and the packs on disk agree, in both
#   directions: every pack is installable by name, every declared path exists.
# - every ai:* label used anywhere is defined in the rule that owns the vocabulary.
# - every skill has the sections the artifact contract requires.
# - every artifact an artifact names actually exists.
# - the project profile and the artifacts agree: no schema key nothing reads,
#   no key an artifact reads that the schema does not define.
# Zero dependencies: bash + awk + grep.

set -euo pipefail

PACK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKS_DIR="$PACK_ROOT/packs"

# Known domain prefixes. Add a row here when a new domain (e.g. react-, sec-) is introduced.
KNOWN_PREFIXES="dev- git- spec-"

errors=0
fail() { echo "FAIL: $1" >&2; errors=$((errors + 1)); }

has_known_prefix() {
    local name="$1"
    for p in $KNOWN_PREFIXES; do
        case "$name" in "$p"*) return 0 ;; esac
    done
    return 1
}

has_frontmatter_key() {
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
    echo "pack '$pack'"

    for f in "$pack_dir"rules/*.md; do
        [ -e "$f" ] || break
        base="$(basename "$f" .md)"
        has_known_prefix "$base" || fail "[$pack] rule '$base' has no known domain prefix ($KNOWN_PREFIXES)"
        has_frontmatter_key "$f" "description" || fail "[$pack] rule '$base' missing description frontmatter"
    done

    for f in "$pack_dir"agents/*.md; do
        [ -e "$f" ] || break
        base="$(basename "$f" .md)"
        has_known_prefix "$base" || fail "[$pack] agent '$base' has no known domain prefix ($KNOWN_PREFIXES)"
        has_frontmatter_key "$f" "description" || fail "[$pack] agent '$base' missing description frontmatter"
        has_frontmatter_key "$f" "tier" || fail "[$pack] agent '$base' missing tier frontmatter"
        has_frontmatter_key "$f" "access" || fail "[$pack] agent '$base' missing access frontmatter"
    done

    for d in "$pack_dir"skills/*/; do
        [ -d "$d" ] || break
        name="$(basename "$d")"
        has_known_prefix "$name" || fail "[$pack] skill folder '$name' has no known domain prefix ($KNOWN_PREFIXES)"
        if [ ! -f "$d/SKILL.md" ]; then
            fail "[$pack] skill '$name' missing SKILL.md"
            continue
        fi
        has_frontmatter_key "$d/SKILL.md" "name" || fail "[$pack] skill '$name' missing name frontmatter"
        # A skill without these is not self-contained: nothing states when it is done,
        # where it hands off, or which of its rules are invariants rather than defaults.
        for section in "## Verify" "## Scope / hand-off" "## Constraints"; do
            grep -q "^$section" "$d/SKILL.md" \
                || fail "[$pack] skill '$name' missing section '$section'"
        done
        has_frontmatter_key "$d/SKILL.md" "description" || fail "[$pack] skill '$name' missing description frontmatter"
        fm_name="$(grep -m1 '^name:' "$d/SKILL.md" | sed 's/^name:[[:space:]]*//' | tr -d '"' || true)"
        [ "$fm_name" = "$name" ] || fail "[$pack] skill '$name' frontmatter name is '$fm_name' (must match folder)"
    done

    if [ -d "$pack_dir"templates ]; then
        tcount=$(find "$pack_dir"templates -maxdepth 1 -name '*.md' | wc -l)
        [ "$tcount" -gt 0 ] || fail "[$pack] templates/ exists but contains no .md files"
    fi
done

# The registry index maps package names to subpaths of this repository. The two
# can disagree silently: a pack present on disk but absent from the index ships
# to nobody, and an index entry pointing nowhere fails only at install time.
INDEX_FILE="$PACK_ROOT/index.yaml"
if [ -f "$INDEX_FILE" ]; then
    index_pairs="$(awk '
        /^packages:/ { in_pkgs = 1; next }
        in_pkgs && /^[^ 	]/ { in_pkgs = 0 }
        in_pkgs && /^  [^ 	]/ {
            if (name != "") print name "	" path
            name = $1; gsub(/"/, "", name); sub(/:$/, "", name); path = ""
            next
        }
        in_pkgs && $1 == "path:" { path = $2; gsub(/"/, "", path) }
        END { if (name != "") print name "	" path }
    ' "$INDEX_FILE")"

    declared_paths=""
    while IFS="$(printf '	')" read -r pkg path; do
        [ -n "$pkg" ] || continue
        if [ -z "$path" ]; then
            fail "[index.yaml] package '$pkg' declares no path"
            continue
        fi
        [ -d "$PACK_ROOT/$path" ] || fail "[index.yaml] package '$pkg' points at '$path', which does not exist"
        declared_paths="$declared_paths $path"
    done <<< "$index_pairs"

    for pack_dir in "$PACKS_DIR"/*/; do
        [ -d "$pack_dir" ] || continue
        pack="$(basename "$pack_dir")"
        case " $declared_paths " in
            *" packs/$pack "*) ;;
            *) fail "[index.yaml] pack '$pack' is not declared - it cannot be installed by name" ;;
        esac
    done
fi

[ "$pack_count" -gt 0 ] || fail "no packs found under packs/"

# One source per convention (dev-context-engineering): the ai:* label vocabulary is
# defined in git-workflow and only cited elsewhere. A label an artifact uses but the
# rule never defines is a second definition site - the failure mode that recurred
# three times before this check existed.
LABEL_RULE="$PACKS_DIR/core/rules/git-workflow.md"
# grep exits 1 on no match, and `set -euo pipefail` would kill the script mid-run
# before any check could report: an empty result is an answer here, not a failure.
used_labels="$(grep -rho 'ai:[a-z][a-z-]*' "$PACKS_DIR" | sort -u || true)"
if [ -n "$used_labels" ]; then
    if [ -f "$LABEL_RULE" ]; then
        defined_labels="$(grep -o 'ai:[a-z][a-z-]*' "$LABEL_RULE" | sort -u || true)"
        for label in $used_labels; do
            grep -qx "$label" <<< "$defined_labels" \
                || fail "label '$label' is used in packs/ but not defined in packs/core/rules/git-workflow.md"
        done
    else
        # A missing definition site must fail, not skip: a gate that disappears when
        # its source is moved is the unenforced rule this check exists to prevent.
        fail "ai:* labels are used in packs/ but the rule that defines them is missing at packs/core/rules/git-workflow.md"
    fi
fi

# Every artifact an artifact names must exist. Renaming or removing one otherwise
# leaves a dangling reference that reads as a working hand-off.
artifact_refs="$(grep -rhoE '`(dev|git|spec)-[a-z-]+`' "$PACKS_DIR" | tr -d '`' | sort -u || true)"
for ref in $artifact_refs; do
    found=""
    for pack_dir in "$PACKS_DIR"/*/; do
        [ -d "$pack_dir$(printf 'skills/%s' "$ref")" ] && found=1
        [ -f "$pack_dir$(printf 'rules/%s.md' "$ref")" ] && found=1
        [ -f "$pack_dir$(printf 'agents/%s.md' "$ref")" ] && found=1
        [ -f "$pack_dir$(printf 'templates/%s.md' "$ref")" ] && found=1
    done
    [ -n "$found" ] || fail "artifact '$ref' is named in packs/ but no rule, agent, skill or template by that name exists"
done

# The profile is a contract in both directions. A key nothing reads promises behavior
# that does not exist; a key an artifact reads but the schema omits cannot be set.
PROFILE="$PACKS_DIR/core/templates/dev-project-profile.md"
# An artifact references a key in backticks, as `key` or `key: value`.
artifact_files="$(grep -rl '' --include='*.md' "$PACKS_DIR" | grep -v "$PROFILE" || true)"
read_keys="$(grep -rhoE 'profile `[a-z_]+' $artifact_files /dev/null | sed 's/profile `//' | sort -u || true)"
if [ ! -f "$PROFILE" ]; then
    # Same rule as the label gate: a check that skips when its source is gone is a
    # check that disappears silently, which is what it exists to prevent.
    [ -z "$read_keys" ] \
        || fail "artifacts read profile keys but the schema is missing at packs/core/templates/dev-project-profile.md"
else
    schema_keys="$(grep -oE '^- [a-z_]+:' "$PROFILE" | sed 's/^- //;s/:$//' | sort -u || true)"
    for key in $schema_keys; do
        grep -qhE "\`$key[\`:]" $artifact_files /dev/null \
            || fail "profile key '$key' is defined in the schema but no artifact reads it"
    done
    for key in $read_keys; do
        printf '%s\n' "$schema_keys" | grep -qx "$key" \
            || fail "profile key '$key' is read by an artifact but the schema does not define it"
    done
fi

if [ "$errors" -gt 0 ]; then
    echo "" >&2
    echo "$errors problem(s) found." >&2
    exit 1
fi

echo ""
echo "OK: $pack_count pack(s) valid."
