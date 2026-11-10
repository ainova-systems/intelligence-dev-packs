#!/usr/bin/env bash
# Runs every script test the packs bundle (packs/**/*.test.mjs, tracked or new) with Node's test
# runner - the command CI runs on Linux and on Windows. Finding no test file fails the run: a gate
# that checked nothing must not read as green.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
files=()
while IFS= read -r file; do
    files+=("$file")
done < <(git ls-files --cached --others --exclude-standard -- 'packs/*.test.mjs')
if [ "${#files[@]}" -eq 0 ]; then
    echo "FAIL: no *.test.mjs file under packs/" >&2
    exit 1
fi
node --test "${files[@]}"
