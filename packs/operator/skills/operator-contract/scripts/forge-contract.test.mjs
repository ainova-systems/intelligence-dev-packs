import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHAPE_KINDS, assertShape } from './forge-contract.mjs';

const PR = { number: 7, url: 'u', title: 't', body: '', draft: false, state: 'open', head: { ref: 'b', sha: 'abc' }, base: { ref: 'main' }, mergeable: 'clean', labels: [], milestone: null, createdAt: 'x', author: 'a' };

test('every answer shape accepts a conforming answer', () => {
  const samples = {
    pr: PR,
    checks: { sha: 'abc', state: 'success', runs: [{ name: 'build', state: 'success', url: 'u' }] },
    thread: { id: 't', resolved: false, path: 'a.js', line: 3, comments: [{ author: 'a', body: 'b', createdAt: 'x' }] },
    note: { id: 'n', kind: 'review', author: 'a', authorRole: 'owner', state: 'commented', body: '', inline: ['x'], createdAt: 'x', url: null },
    claim: { pr: 7, claimed: false, held: true },
    factor: { pr: 7, factor: 'ai:reviewed', set: true },
    comment: { pr: 7, url: 'u' },
    merge: { pr: 7, state: 'merged', mergeCommit: 'abc' },
    files: { pr: 7, files: ['a.js'] },
    event: { id: 1, event: 'labeled', label: 'l', createdAt: 'x' },
  };
  assert.deepEqual(Object.keys(samples).sort(), [...SHAPE_KINDS].sort());
  for (const [kind, value] of Object.entries(samples)) assert.equal(assertShape(kind, value), value);
});

test('a field outside the contract fails naming it', () => {
  assert.throws(() => assertShape('pr', { ...PR, mergeable: 'MERGEABLE' }), /pr\.mergeable/);
  assert.throws(() => assertShape('pr', { ...PR, state: 'OPEN' }), /pr\.state/);
  assert.throws(() => assertShape('checks', { sha: 'a', state: 'green', runs: [] }), /checks\.state/);
  assert.throws(() => assertShape('note', { id: 'n', kind: 'comment', author: 'a', authorRole: 'OWNER', body: '', createdAt: 'x', url: null }), /note\.authorRole/);
  assert.throws(() => assertShape('claim', { pr: 7, claimed: false, held: false }), /claim\.held/);
  assert.throws(() => assertShape('nope', {}), /no contract shape/);
});
