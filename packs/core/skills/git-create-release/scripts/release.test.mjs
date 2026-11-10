import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jsonLines, parseArgs, remoteTagCommit, sections, sortChecks, title } from './release.mjs';

test('jsonLines reads one object per line across pages, either line ending, and nothing from empty output', () => {
  const out = '{"name":"a","status":"completed","conclusion":"success"}\r\n\n{"name":"b","status":"completed","conclusion":"failure"}\n';
  assert.deepEqual(jsonLines(out).map((r) => r.name), ['a', 'b']);
  assert.deepEqual(sortChecks(jsonLines(out)).failed, ['b (failure)']);
  assert.deepEqual(jsonLines(''), []);
});

const CHANGELOG = `# Changelog

Intro.

## [Unreleased]

## [0.2.0] - 2026-11-10

A skipped check is green again, and word budgets warn.

### Fixed

- One fix.

## [0.2.0-rc.1]

- A pre-release with no headline.

## [0.1.0] - 2026-11-01

### Added

- First.
`;

test('sections reads each version newest first with its body and headline, with or without a date, and skips Unreleased', () => {
  const all = sections(CHANGELOG);
  assert.deepEqual(all.map((s) => s.version), ['0.2.0', '0.2.0-rc.1', '0.1.0']);
  assert.equal(all[0].headline, 'A skipped check is green again, and word budgets warn.');
  assert.match(all[0].body, /### Fixed\n\n- One fix\./);
  assert.equal(all[1].headline, '', 'a section that opens on a list item has no headline');
  assert.equal(all[2].headline, '', 'a section that opens on a heading has no headline');
});

test('sections reads a file with Windows line endings the same way', () => {
  assert.deepEqual(sections(CHANGELOG.replace(/\n/g, '\r\n')), sections(CHANGELOG));
});

test('title is the tag and the whole headline without its closing period, or the tag alone without a headline', () => {
  assert.equal(title('v0.2.0', 'A skipped check is green again, and word budgets warn.'), 'v0.2.0 - A skipped check is green again, and word budgets warn');
  assert.equal(title('v0.18.0', '`git-create-release` tags and publishes a release.'), 'v0.18.0 - `git-create-release` tags and publishes a release');
  assert.equal(title('v0.2.1', 'A workflow that failed to start no longer reads as green.'), 'v0.2.1 - A workflow that failed to start no longer reads as green');
  assert.equal(title('release-42', ''), 'release-42');
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

test('parseArgs reads the tag and every option, with the profile defaults when they are absent', () => {
  assert.deepEqual(parseArgs([]), {
    tag: null, version: null, commit: null, branch: null, artifact: 'github-release', notes: 'changelog-section', notesFile: null, dryRun: false,
  });
  assert.deepEqual(
    parseArgs(['release-42', '--version', 'v1.2.3', '--commit', 'abc', '--branch', 'master', '--artifact', 'tag-only', '--notes', 'none', '--notes-file', 'n.md', '--dry-run']),
    { tag: 'release-42', version: '1.2.3', commit: 'abc', branch: 'master', artifact: 'tag-only', notes: 'none', notesFile: 'n.md', dryRun: true },
  );
});

test('parseArgs reads a bare version as tag vX.Y.Z and its changelog section, and --tag as the tag itself', () => {
  assert.deepEqual([parseArgs(['0.18.0']).tag, parseArgs(['0.18.0']).version], ['v0.18.0', '0.18.0']);
  assert.deepEqual([parseArgs(['2.0.0-rc.1']).tag, parseArgs(['2.0.0-rc.1']).version], ['v2.0.0-rc.1', '2.0.0-rc.1']);
  assert.equal(parseArgs(['v0.18.0']).tag, 'v0.18.0');
  assert.equal(parseArgs(['--tag', '1.2.3']).tag, '1.2.3');
  assert.equal(parseArgs(['0.18.0', '--version', '0.18.1']).version, '0.18.1');
});

test('parseArgs refuses a missing value, a value outside its profile set, an unknown flag and a second tag', () => {
  assert.throws(() => parseArgs(['--commit', '--dry-run']), /--commit needs a value/);
  assert.throws(() => parseArgs(['--commit']), /--commit needs a value/);
  assert.throws(() => parseArgs(['--artifact', 'zip-archive']), /--artifact is one of/);
  assert.throws(() => parseArgs(['--notes', 'commit-log']), /--notes is one of/);
  assert.throws(() => parseArgs(['--force']), /unknown argument: --force/);
  assert.throws(() => parseArgs(['v1.0.0', 'v1.0.1']), /a second tag: v1.0.1/);
  assert.throws(() => parseArgs(['0.18.0', '--tag', 'x']), /a second tag: x/);
});
