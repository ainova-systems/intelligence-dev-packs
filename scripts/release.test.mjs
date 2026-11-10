import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, remoteTagCommit, sections, sortChecks, title } from './release.mjs';

const CHANGELOG = `# Changelog

Intro.

## [Unreleased]

## [0.2.0] - 2026-11-10

A skipped check is green again, and word budgets warn.

### Fixed

- One fix.

## [0.1.0] - 2026-11-01

### Added

- First.
`;

test('sections reads each version newest first with its body and headline, and skips Unreleased', () => {
  const all = sections(CHANGELOG);
  assert.deepEqual(all.map((s) => s.version), ['0.2.0', '0.1.0']);
  assert.equal(all[0].headline, 'A skipped check is green again, and word budgets warn.');
  assert.match(all[0].body, /### Fixed\n\n- One fix\./);
  assert.equal(all[1].headline, '', 'a section that opens on a heading has no headline');
});

test('sections reads a file with Windows line endings the same way', () => {
  assert.deepEqual(sections(CHANGELOG.replace(/\n/g, '\r\n')), sections(CHANGELOG));
});

test('title is the tag and the headline up to its first clause, without the closing period', () => {
  assert.equal(title('0.2.0', 'A skipped check is green again, and word budgets warn.'), 'v0.2.0 - A skipped check is green again');
  assert.equal(title('0.2.1', 'A workflow that failed to start no longer reads as green.'), 'v0.2.1 - A workflow that failed to start no longer reads as green');
});

test('sortChecks fails on a failed, cancelled or never-started run, waits on a running one, and passes a skipped one', () => {
  const { failed, running } = sortChecks([
    { name: 'ok', status: 'completed', conclusion: 'success' },
    { name: 'skip', status: 'completed', conclusion: 'skipped' },
    { name: 'neutral', status: 'completed', conclusion: 'neutral' },
    { name: 'broke', status: 'completed', conclusion: 'failure' },
    { name: 'start', status: 'completed', conclusion: 'startup_failure' },
    { name: 'stop', status: 'completed', conclusion: 'cancelled' },
    { name: 'busy', status: 'in_progress', conclusion: null },
  ]);
  assert.deepEqual(failed, ['broke (failure)', 'start (startup_failure)', 'stop (cancelled)']);
  assert.deepEqual(running, ['busy']);
  assert.deepEqual(sortChecks([{ name: 'skip', status: 'completed', conclusion: 'skipped' }]), { failed: [], running: [] });
  assert.deepEqual(sortChecks([]), { failed: [], running: [] });
});

test('sortChecks reads commit statuses too: failure and error fail, pending waits, success passes', () => {
  const { failed, running } = sortChecks([], [
    { context: 'ok', state: 'success' },
    { context: 'red', state: 'failure' },
    { context: 'broken', state: 'error' },
    { context: 'later', state: 'pending' },
  ]);
  assert.deepEqual(failed, ['red (failure)', 'broken (error)']);
  assert.deepEqual(running, ['later']);
});

test('remoteTagCommit takes the peeled commit of an annotated tag, the tag line of a lightweight one, and nothing for a missing tag', () => {
  const out = ['aaa\trefs/tags/v1.0.0', 'bbb\trefs/tags/v1.0.0^{}', 'ccc\trefs/tags/v1.0.1', 'ddd\trefs/tags/v1.0.10^{}'].join('\n');
  assert.equal(remoteTagCommit(out, 'v1.0.0'), 'bbb');
  assert.equal(remoteTagCommit(out, 'v1.0.1'), 'ccc');
  assert.equal(remoteTagCommit(out, 'v2.0.0'), '');
  assert.equal(remoteTagCommit('', 'v1.0.0'), '');
});

test('parseArgs reads a version, --commit with its sha and --dry-run, and refuses a missing sha or an unknown argument', () => {
  assert.deepEqual(parseArgs(['v1.2.3', '--commit', 'abc123', '--dry-run']), { version: '1.2.3', commit: 'abc123', dryRun: true });
  assert.deepEqual(parseArgs([]), { version: null, commit: null, dryRun: false });
  assert.throws(() => parseArgs(['--commit', '--dry-run']), /--commit needs a sha/);
  assert.throws(() => parseArgs(['--commit']), /--commit needs a sha/);
  assert.throws(() => parseArgs(['--force']), /unknown argument: --force/);
});
