#!/usr/bin/env bash
# Validate every pack under packs/:
# - every rule / agent / skill / template name carries a known DOMAIN prefix
#   (dev- | git- | spec-); a pack may hold more than one domain.
# - rules and agents have description frontmatter; agents have tier + access, and the two and an
#   optional effort sit on the engine's scale; an agent sets no model (its tier routes it).
# - routing: a skill sets no tier, model or effort; `agent:` comes with `context: fork` and names
#   an agent some pack defines; a forked skill without `background: false` is a warning. A
#   description stays under the tools' limit.
# - no pack file carries a phrase CONTRIBUTING.md > Phrases the validator rejects lists.
# - each skill folder has SKILL.md whose `name` matches the folder.
# - a templates/ folder, if present, is non-empty.
# - index.yaml (the registry index) and the packs on disk agree, in both
#   directions: every pack is installable by name, every declared path exists.
# - every ai:* label a pack uses is defined in the page that owns that pack's vocabulary.
# - every skill has the sections the artifact contract requires.
# - every artifact an artifact names actually exists; a pack-level references/ page counts.
# - each pack's profile schema and its artifacts agree: no schema key nothing reads,
#   no key an artifact reads that neither its pack's schema nor core's defines.
# - word budgets: a SKILL.md, reference, rule or agent over its budget, or a paragraph, list item
#   or table row over PARAGRAPH_WORD_BUDGET, is a warning, as is a description over
#   DESCRIPTION_TARGET_CHARS; warnings do not fail the run.
# A pack with its own schema (templates/<prefix>-project-profile.md) stands alone: its checks
# read only its own folder, plus core's schema and artifacts when core is present.
# Zero dependencies: bash + awk + grep.

set -euo pipefail

PACK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKS_DIR="$PACK_ROOT/packs"

# Known domain prefixes. Add a row here when a new domain (e.g. react-, sec-) is introduced.
KNOWN_PREFIXES="dev- git- spec-"

# The Intelligence engine's scales and limits, restated here only to check them. Their definition
# is the engine's packages/sync/references/conventions.md (Tier, Effort and Access mappings, the
# skill field limits, Description budget, and the size limits under Skill body and resources);
# change a value here when the engine changes it there.
TIERS="frontier heavy standard light"
ACCESS_LEVELS="full readonly"
EFFORT_LEVELS="low medium high xhigh max ultra"
DESCRIPTION_MAX_CHARS=1024      # the tools reject a longer description
DESCRIPTION_TARGET_CHARS=250    # a sibling-distinguishing description stays within this
SKILL_WORD_BUDGET=1500
REFERENCE_WORD_BUDGET=3000
RULE_WORD_BUDGET=2000
AGENT_WORD_BUDGET=500
PARAGRAPH_WORD_BUDGET=150       # a paragraph, a list item or a table row

errors=0
fail() { echo "FAIL: $1" >&2; errors=$((errors + 1)); }
warnings=0
warn() { echo "WARN: $1"; warnings=$((warnings + 1)); }

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
# defined once and only cited elsewhere - core's git-workflow rule. A label an artifact
# uses but its definition site never names is a second definition site - the failure mode
# that recurred three times before this check existed.
label_rule_for() {
    echo "$PACKS_DIR/core/rules/git-workflow.md"
}
for pack_dir in "$PACKS_DIR"/*/; do
    [ -d "$pack_dir" ] || continue
    pack="$(basename "$pack_dir")"
    label_rule="$(label_rule_for "$pack_dir")"
    # grep exits 1 on no match, and `set -euo pipefail` would kill the script mid-run
    # before any check could report: an empty result is an answer here, not a failure.
    used_labels="$(grep -rho 'ai:[a-z][a-z-]*' "$pack_dir" | sort -u || true)"
    [ -n "$used_labels" ] || continue
    if [ -f "$label_rule" ]; then
        defined_labels="$(grep -o 'ai:[a-z][a-z-]*' "$label_rule" | sort -u || true)"
        for label in $used_labels; do
            grep -qx "$label" <<< "$defined_labels" \
                || fail "[$pack] label '$label' is used but not defined in ${label_rule#"$PACK_ROOT"/}"
        done
    else
        # A missing definition site must fail, not skip: a gate that disappears when
        # its source is moved is the unenforced rule this check exists to prevent.
        fail "[$pack] ai:* labels are used but the page that defines them is missing at ${label_rule#"$PACK_ROOT"/}"
    fi
done

# Every artifact an artifact names must exist. Renaming or removing one otherwise
# leaves a dangling reference that reads as a working hand-off. A name in a domain no pack
# here holds is an optional artifact of a pack that is not in this repository, so it is
# not checked.
present_domains="$(find "$PACKS_DIR"/*/rules "$PACKS_DIR"/*/agents "$PACKS_DIR"/*/skills "$PACKS_DIR"/*/templates \
    "$PACKS_DIR"/*/references -mindepth 1 -maxdepth 1 2>/dev/null | sed 's|.*/||' | grep -oE '^[a-z]+-' | sort -u || true)"
artifact_refs="$(grep -rhoE '`(dev|git|spec)-[a-z-]+`' "$PACKS_DIR" | tr -d '`' | sort -u || true)"
for ref in $artifact_refs; do
    grep -qx "${ref%%-*}-" <<< "$present_domains" || continue
    found=""
    for pack_dir in "$PACKS_DIR"/*/; do
        [ -d "$pack_dir$(printf 'skills/%s' "$ref")" ] && found=1
        [ -f "$pack_dir$(printf 'rules/%s.md' "$ref")" ] && found=1
        [ -f "$pack_dir$(printf 'agents/%s.md' "$ref")" ] && found=1
        [ -f "$pack_dir$(printf 'templates/%s.md' "$ref")" ] && found=1
        [ -f "$pack_dir$(printf 'references/%s.md' "$ref")" ] && found=1
    done
    [ -n "$found" ] || fail "artifact '$ref' is named in packs/ but no rule, agent, skill, template or reference by that name exists"
done

# The profile is a contract in both directions. A key nothing reads promises behavior
# that does not exist; a key an artifact reads but no schema defines cannot be set.
# Each pack checks against its own schema plus core's: a pack may read core's keys, core
# may read only its own. A pack without a schema builds on core's, so its reads also keep
# core's keys alive; a pack with its own schema stands alone and restates each core key it
# reads, with core's default, so it runs without core.
CORE_SCHEMA="$PACKS_DIR/core/templates/dev-project-profile.md"
schema_keys_of() {
    [ -f "$1" ] || return 0
    grep -oE '^- [a-z_]+:' "$1" | sed 's/^- //;s/:$//' | sort -u || true
}
schema_default() {
    awk -v key="$2" 'index($0, "- " key ":") == 1 {
        v = substr($0, length(key) + 4); sub(/<!--.*/, "", v); gsub(/^[ \t]+|[ \t]+$/, "", v); print v; exit
    }' "$1"
}
core_keys="$(schema_keys_of "$CORE_SCHEMA")"
core_readers=""
for pack_dir in "$PACKS_DIR"/*/; do
    [ -d "$pack_dir" ] || continue
    pack="$(basename "$pack_dir")"
    schema="$(find "$pack_dir" -path '*/templates/*-project-profile.md' | head -n 1 || true)"
    # An artifact references a key in backticks, as `key` or `key: value`.
    files="$(find "$pack_dir" -type f -name '*.md' ! -path "$schema" || true)"
    [ -n "$schema" ] || core_readers="$core_readers $files"
    [ "$pack" = core ] && core_readers="$core_readers $files"
    own_keys="$(schema_keys_of "$schema")"
    allowed="$own_keys"
    [ "$pack" = core ] || allowed="$(printf '%s\n%s\n' "$own_keys" "$core_keys" | sort -u)"
    read_keys="$(grep -rhoE 'profile `[a-z_]+' $files /dev/null | sed 's/profile `//' | sort -u || true)"
    for key in $read_keys; do
        grep -qx "$key" <<< "$allowed" \
            || fail "[$pack] profile key '$key' is read but defined in neither its pack's schema nor core's"
    done
    [ -n "$schema" ] && [ "$pack" != core ] || continue
    for key in $own_keys; do
        grep -qhE "\`$key[\`:]" $files /dev/null \
            || fail "[$pack] profile key '$key' is defined in $(basename "$schema") but no artifact of the pack reads it"
        if grep -qx "$key" <<< "$core_keys"; then
            [ "$(schema_default "$schema" "$key")" = "$(schema_default "$CORE_SCHEMA" "$key")" ] \
                || fail "[$pack] profile key '$key' has a different default in $(basename "$schema") than in core's schema"
        fi
    done
done
if [ -f "$CORE_SCHEMA" ]; then
    for key in $core_keys; do
        grep -qhE "\`$key[\`:]" $core_readers /dev/null \
            || fail "[core] profile key '$key' is defined in the schema but no artifact of core or of a pack building on it reads it"
    done
elif [ -d "$PACKS_DIR/core" ]; then
    # Same rule as the label gate: a check that skips when its source is gone is a
    # check that disappears silently, which is what it exists to prevent.
    fail "[core] the profile schema is missing at packs/core/templates/dev-project-profile.md"
fi

# Routing (CONTRIBUTING.md > Conventions): a value off the engine's scale renders as if it were
# absent, an agent is routed by its tier and not by a model, `agent:` without `context: fork`
# selects nothing, and a skill's `tier:`, `model:` or `effort:` either duplicates its agent's or,
# inline, switches the whole session for the rest of the turn. One awk pass reads the frontmatter
# of every agent and skill and prints FAIL or WARN lines, since a process per file is slow on
# some hosts.
agent_names="$(find "$PACKS_DIR"/*/agents -maxdepth 1 -name '*.md' 2>/dev/null | sed 's|.*/||; s|\.md$||' | sort -u | tr '\n' ' ' || true)"
routing_report="$(cd "$PACK_ROOT" && find packs -type f \( -path 'packs/*/agents/*.md' -o -path 'packs/*/skills/*/SKILL.md' \) | sort \
    | xargs awk -v tiers="$TIERS" -v access="$ACCESS_LEVELS" -v efforts="$EFFORT_LEVELS" -v agents="$agent_names" \
        -v dmax="$DESCRIPTION_MAX_CHARS" -v dtarget="$DESCRIPTION_TARGET_CHARS" '
        function scale(list, arr,   n, i, parts) { n = split(list, parts, " "); for (i = 1; i <= n; i++) arr[parts[i]] = 1 }
        function check(f,   parts, what, forked, k, key) {
            split(f, parts, "/")
            if (parts[3] == "agents") { what = "[" parts[2] "] agent '\''" substr(parts[4], 1, length(parts[4]) - 3) "'\''" }
            else { what = "[" parts[2] "] skill '\''" parts[4] "'\''" }
            if (("description" in V) && V["description"] !~ /^[|>]/) {
                if (length(V["description"]) > dmax) print "FAIL\t" what " has a " length(V["description"]) "-character description; the tools reject one over " dmax
                else if (length(V["description"]) > dtarget) print "WARN\t" what " has a " length(V["description"]) "-character description (target " dtarget ")"
            }
            if (parts[3] == "agents") {
                if (("tier" in V) && !(V["tier"] in TIER)) print "FAIL\t" what " has tier '\''" V["tier"] "'\'', not one of: " tiers
                if (("access" in V) && !(V["access"] in ACCESS)) print "FAIL\t" what " has access '\''" V["access"] "'\'', not one of: " access
                if (("effort" in V) && !(V["effort"] in EFFORT)) print "FAIL\t" what " has effort '\''" V["effort"] "'\'', not one of: " efforts
                if ("model" in V) print "FAIL\t" what " sets model; use tier"
                return
            }
            for (k = 1; k <= 3; k++) {
                key = (k == 1 ? "tier" : k == 2 ? "model" : "effort")
                if (key in V) print "FAIL\t" what " declares " key ", which a skill never sets: a forked skill runs at its agent'\''s tier and effort, and an inline one would switch the session'\''s for the rest of the turn"
            }
            forked = (("context" in V) && V["context"] == "fork")
            if (("agent" in V) && !forked) print "FAIL\t" what " names agent '\''" V["agent"] "'\'' without context: fork, so the agent is never used"
            if (forked && ("agent" in V) && !(V["agent"] in AGENT)) print "FAIL\t" what " runs on agent '\''" V["agent"] "'\'', which no pack here defines"
            if (forked && !(("background" in V) && V["background"] == "false")) print "WARN\t" what " runs forked without background: false, so its caller may go on before the result arrives"
        }
        BEGIN { scale(tiers, TIER); scale(access, ACCESS); scale(efforts, EFFORT); scale(agents, AGENT) }
        FNR == 1 {
            if (file != "") check(file)
            file = FILENAME; split("", V); fm = ($0 == "---"); next
        }
        fm && $0 == "---" { fm = 0; next }
        fm && match($0, /^[a-z][a-z-]*:/) {
            key = substr($0, 1, RLENGTH - 1); value = substr($0, RLENGTH + 1)
            gsub(/^[ \t]+|[ \t]+$/, "", value)
            if (value ~ /^".*"$/) value = substr(value, 2, length(value) - 2)
            if (!(key in V)) V[key] = value
        }
        END { if (file != "") check(file) }
    ' || true)"
while IFS="$(printf '\t')" read -r level message; do
    case "$level" in
        FAIL) fail "$message" ;;
        WARN) warn "$message" ;;
    esac
done <<< "$routing_report"

# Phrases that instruct what a current model already does (CONTRIBUTING.md > Writing for current
# models). The list is read from CONTRIBUTING.md, its only definition; a phrase inside backticks is
# a quotation and passes. A missing list fails rather than skipping, like the label check above.
CONTRIBUTING_FILE="$PACK_ROOT/CONTRIBUTING.md"
PHRASES_HEADING="### Phrases the validator rejects"
phrases=""
if [ -f "$CONTRIBUTING_FILE" ]; then
    phrases="$(awk -v heading="$PHRASES_HEADING" '
        $0 == heading { on = 1; next }
        on && /^#/ { exit }
        on && match($0, /^- `[^`]+`/) { print tolower(substr($0, 4, RLENGTH - 4)) }
    ' "$CONTRIBUTING_FILE")"
fi
if [ -z "$phrases" ]; then
    fail "CONTRIBUTING.md has no '$PHRASES_HEADING' list of backticked phrases, which the phrase check reads"
else
    phrase_report="$(cd "$PACK_ROOT" && find packs -type f -name '*.md' | sort | PHRASES="$phrases" xargs awk '
        BEGIN { n = split(ENVIRON["PHRASES"], P, "\n") }
        {
            line = tolower($0); gsub(/`[^`]*`/, "", line)
            for (i = 1; i <= n; i++) if (P[i] != "" && index(line, P[i])) print FILENAME ":" FNR " carries \"" P[i] "\""
        }
    ' || true)"
    while IFS= read -r line; do
        if [ -n "$line" ]; then fail "$line, a phrase CONTRIBUTING.md > Phrases the validator rejects lists"; fi
    done <<< "$phrase_report"
fi

# Text grows a clause per review finding until nobody reads it whole; the budget makes that
# growth visible. Several skills are over it today, so an offender warns instead of failing.
# A paragraph is a run of prose lines; a list item starts a new one and a table row is one of its
# own, while headings and fenced blocks belong to none. A file's total counts everything below
# its frontmatter. One awk pass over every file, since a process per file is slow on some hosts.
budget_report="$(cd "$PACK_ROOT" && find packs -type f -name '*.md' \( -path '*/rules/*' -o -path '*/agents/*' \
    -o -path '*/skills/*' -o -path '*/templates/*' -o -path '*/references/*' \) | sort \
    | xargs awk -v skill_max="$SKILL_WORD_BUDGET" -v ref_max="$REFERENCE_WORD_BUDGET" -v rule_max="$RULE_WORD_BUDGET" \
        -v agent_max="$AGENT_WORD_BUDGET" -v para_max="$PARAGRAPH_WORD_BUDGET" '
        function flush() {
            if (n > para_max) print file ":" start " has a " n "-word paragraph (budget " para_max ")"
            n = 0
        }
        function over(max) { if (total > max) print file " is " total " words (budget " max ")" }
        function close_file() {
            flush()
            if (file ~ /\/skills\/[^\/]+\/SKILL\.md$/) over(skill_max)
            else if (file ~ /\/references\/[^\/]+\.md$/) over(ref_max)
            else if (file ~ /^packs\/[^\/]+\/rules\/[^\/]+\.md$/) over(rule_max)
            else if (file ~ /^packs\/[^\/]+\/agents\/[^\/]+\.md$/) over(agent_max)
        }
        FNR == 1 {
            if (file != "") close_file()
            file = FILENAME; total = 0; fm = 0; fence = 0
            if ($0 == "---") { fm = 1; next }
        }
        fm { if ($0 == "---") fm = 0; next }
        { total += NF }
        /^[[:space:]]*(```|~~~)/ { flush(); fence = !fence; next }
        fence { next }
        /^[[:space:]]*\|/ { flush(); start = FNR; n = NF; flush(); next }
        /^[[:space:]]*$/ || /^[[:space:]]*#/ { flush(); next }
        /^[[:space:]]*([-*+]|[0-9]+[.)])[[:space:]]/ { flush() }
        { if (n == 0) start = FNR; n += NF }
        END { if (file != "") close_file() }
    ' || true)"
while IFS= read -r line; do
    if [ -n "$line" ]; then warn "$line"; fi
done <<< "$budget_report"

if [ "$errors" -gt 0 ]; then
    echo "" >&2
    echo "$errors problem(s) found." >&2
    exit 1
fi

echo ""
if [ "$warnings" -gt 0 ]; then
    echo "OK: $pack_count pack(s) valid, $warnings warning(s)."
else
    echo "OK: $pack_count pack(s) valid."
fi
