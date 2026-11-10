// Runs scripts/validate-pack.sh on a copy of the repository with one artifact pushed over a word
// budget, so a budget that stopped failing the run is caught here and not in the next review.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function copyRepository(t) {
  const dir = mkdtempSync(join(tmpdir(), 'validate-pack-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const entry of ['packs', 'scripts', 'index.yaml', 'CONTRIBUTING.md']) {
    cpSync(join(ROOT, entry), join(dir, entry), { recursive: true });
  }
  return dir;
}

function validate(dir) {
  const res = spawnSync('bash', [join(dir, 'scripts', 'validate-pack.sh')], { cwd: dir, encoding: 'utf8' });
  return { code: res.status, out: `${res.stdout}${res.stderr}` };
}

test('a paragraph over the word budget fails the run and names the file', (t) => {
  const dir = copyRepository(t);
  const skill = 'packs/core/skills/git-scan-secrets/SKILL.md';
  appendFileSync(join(dir, skill), `\n\n${Array(151).fill('word').join(' ')}\n`);
  const res = validate(dir);
  assert.notEqual(res.code, 0, res.out);
  assert.match(res.out, /FAIL: packs\/core\/skills\/git-scan-secrets\/SKILL\.md:\d+ has a 151-word paragraph \(budget 150\)/);
});
