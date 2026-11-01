import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FLAGS, authorRole, checkOperatorConfig, checks, ciFromRuns, claim, comment, createPr, editPr, events, execute, factor, listPrs, merge, normalizePr, notes, prBody, prFiles, readInlineReviews, readPullRequests, readUnresolvedThreads, readyPr, resolveThread, threads, viewPr,
} from './forge-github.mjs';
import { assertShape } from './forge-contract.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'forge-github.mjs');
// The operator configuration every call that needs one reads; the CLI runs below inherit it.
const CONFIG_DIR = mkdtempSync(join(tmpdir(), 'forge-config-'));
process.env.OPERATOR_CONFIG = join(CONFIG_DIR, 'operator.json');
// The pack's example configuration, with the CI workflows these tests read.
const EXAMPLE = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../references/operator-config.example.json'), 'utf8'));
writeFileSync(process.env.OPERATOR_CONFIG, JSON.stringify({ ...EXAMPLE, ciWorkflows: ['build', 'preview'] }));
process.on('exit', () => rmSync(CONFIG_DIR, { recursive: true, force: true }));
const RAW = {
  number: 7, url: 'https://github.com/o/r/pull/7', title: 'T', body: 'B', isDraft: true, state: 'OPEN', headRefName: 'feature/slot-a-x', headRefOid: 'abc1234def',
  baseRefName: 'develop', mergeable: 'CONFLICTING', labels: [{ name: 'ai:processing' }], milestone: { title: 'Development' }, createdAt: '2026-10-30T08:00:00Z', author: { login: 'me' },
};

/** A gh stand-in that records every call and answers by the subcommand it was given. */
function fake(answers = {}) {
  const calls = [];
  const run = (args) => {
    calls.push(args);
    for (const [prefix, answer] of Object.entries(answers)) if (args.join(' ').startsWith(prefix)) return typeof answer === 'function' ? answer(args) : answer;
    return '';
  };
  return { run, calls };
}

test('a pull request is normalized to the contract shape', () => {
  assert.deepEqual(normalizePr(RAW), {
    number: 7, url: RAW.url, title: 'T', body: 'B', draft: true, state: 'open', head: { ref: 'feature/slot-a-x', sha: 'abc1234def' }, base: { ref: 'develop' },
    mergeable: 'conflicting', labels: ['ai:processing'], milestone: 'Development', createdAt: RAW.createdAt, author: 'me',
  });
  assert.equal(normalizePr({ ...RAW, mergeable: 'UNKNOWN', milestone: null }).mergeable, 'unknown');
  assert.equal(normalizePr({ ...RAW, mergeable: 'MERGEABLE' }).mergeable, 'clean');
  const { run, calls } = fake({ 'pr view 7': JSON.stringify(RAW) });
  assert.equal(viewPr(7, run).milestone, 'Development');
  assert.ok(calls[0].includes('--json'));
});

test('checks judge only the deciding workflows, exactly as discovery does', () => {
  const runs = [
    { databaseId: 1, workflowName: 'build', attempt: 1, status: 'completed', conclusion: 'failure', createdAt: '2026-10-30T08:00:00Z', url: 'u1' },
    { databaseId: 2, workflowName: 'build', attempt: 2, status: 'completed', conclusion: 'success', createdAt: '2026-10-30T09:00:00Z', url: 'u2' },
    { databaseId: 3, workflowName: 'preview', attempt: 1, status: 'completed', conclusion: 'skipped', createdAt: '2026-10-30T08:00:00Z', url: 'u3' },
    // A helper workflow a label event cancelled is not a red build.
    { databaseId: 4, workflowName: 'cleanup', attempt: 1, status: 'completed', conclusion: 'cancelled', createdAt: '2026-10-30T09:30:00Z', url: 'u4' },
  ];
  const config = { ciWorkflows: ['build', 'preview'] };
  const read = (list) => fake({ 'run list': JSON.stringify(list) }).run;
  assert.deepEqual(checks('abc1234', read(runs), config), { sha: 'abc1234', state: 'success', runs: [{ name: 'build', state: 'success', url: 'u2' }, { name: 'preview', state: 'success', url: 'u3' }] });
  const fixtures = [
    runs,
    [...runs, { databaseId: 5, workflowName: 'preview', attempt: 1, status: 'in_progress', createdAt: '2026-10-30T10:00:00Z', url: 'u5' }],
    [...runs, { databaseId: 6, workflowName: 'build', attempt: 3, status: 'completed', conclusion: 'timed_out', createdAt: '2026-10-30T10:00:00Z', url: 'u6' }],
    [runs[3]],
  ];
  // The answer skills read and the state discovery keys requests on are one judgement.
  for (const list of fixtures) assert.equal(checks('abc1234', read(list), config).state, ciFromRuns(list, config));
  assert.deepEqual(fixtures.map((list) => ciFromRuns(list, config)), ['success', 'pending', 'failure', 'none']);
  const { run, calls } = fake({ 'run list': JSON.stringify(runs) });
  checks('abc1234', run, config);
  assert.deepEqual(calls[0].slice(0, 4), ['run', 'list', '--commit', 'abc1234']);
  assert.throws(() => checks('not-a-sha', run), /commit sha/);
});

test('threads are read on every page, filtered to unresolved on request, and resolved with a reply', () => {
  const node = (id, resolved) => JSON.stringify({ id, isResolved: resolved, path: 'a.ts', line: 3, comments: { nodes: [{ author: { login: 'r' }, body: 'fix', createdAt: 't' }] } });
  const { run, calls } = fake({ 'api graphql --paginate': `${node('T1', false)}\n${node('T2', true)}\n` });
  assert.deepEqual(threads(7, {}, run).map((thread) => [thread.id, thread.resolved]), [['T1', false], ['T2', true]]);
  assert.deepEqual(threads(7, { unresolved: true }, run).map((thread) => thread.id), ['T1']);
  assert.deepEqual(threads(7, {}, run)[0].comments, [{ author: 'r', body: 'fix', createdAt: 't' }]);
  assert.ok(calls[0].some((arg) => arg.includes('$endCursor') && arg.includes('pageInfo')));
  const write = fake();
  assert.deepEqual(resolveThread('T1', 'Fixed in abc1234.', write.run), { id: 'T1', resolved: true, changed: true });
  assert.equal(write.calls.length, 3);
  assert.ok(write.calls[1].some((arg) => arg.includes('addPullRequestReviewThreadReply')));
  assert.ok(write.calls[2].some((arg) => arg.includes('resolveReviewThread')));
  // A retry finds the thread resolved and posts no second reply.
  const again = fake({ 'api graphql -f query=query': 'true\n' });
  assert.deepEqual(resolveThread('T1', 'Fixed in abc1234.', again.run), { id: 'T1', resolved: true, changed: false });
  assert.equal(again.calls.length, 1);
  assert.throws(() => resolveThread('T1', ' ', write.run), /--body/);
});

test('a claim is the processing label: take refuses one already standing as held, release drops it', () => {
  const held = fake({ 'pr view 7': JSON.stringify(RAW) });
  assert.deepEqual(claim('take', 7, held.run), { pr: 7, claimed: false, held: true });
  assert.equal(held.calls.some((args) => args[1] === 'edit'), false);
  assert.deepEqual(claim('release', 7, held.run), { pr: 7, claimed: false, changed: true });
  assert.deepEqual(held.calls.at(-1), ['pr', 'edit', '7', '--remove-label', 'ai:processing']);
  const free = fake({ 'pr view 7': JSON.stringify({ ...RAW, labels: [] }) });
  assert.deepEqual(claim('take', 7, free.run), { pr: 7, claimed: true, changed: true });
  assert.deepEqual(free.calls.at(-1), ['pr', 'edit', '7', '--add-label', 'ai:processing']);
  assert.deepEqual(claim('release', 7, free.run), { pr: 7, claimed: false, changed: false });
  assert.throws(() => claim('steal', 7, free.run), /take or release/);
});

test('a hand-off edits milestone and labels in one call; factors, comments and merges map to one gh call each', () => {
  const edit = fake({ 'pr view 7': JSON.stringify(RAW) });
  editPr(7, { milestone: 'Verification', add: ['x'], remove: ['ai:processing'] }, edit.run);
  assert.deepEqual(edit.calls[0], ['pr', 'edit', '7', '--milestone', 'Verification', '--add-label', 'x', '--remove-label', 'ai:processing']);
  assert.throws(() => editPr(7, {}, edit.run), /needs --claim, --milestone/);
  const set = fake();
  assert.deepEqual(factor('set', 7, 'ai:reviewed', set.run), { pr: 7, factor: 'ai:reviewed', set: true });
  assert.deepEqual(set.calls[0], ['pr', 'edit', '7', '--add-label', 'ai:reviewed']);
  // The claim label is never a factor: setting it there would claim around the session gate.
  assert.throws(() => factor('set', 7, 'ai:processing', set.run), /is the claim, not a factor/);
  assert.equal(set.calls.length, 1);
  const posted = fake({ 'pr comment 7': 'https://github.com/o/r/pull/7#issuecomment-1\n' });
  assert.deepEqual(comment(7, '/tmp/body.md', posted.run), { pr: 7, url: 'https://github.com/o/r/pull/7#issuecomment-1' });
  const merged = fake({ 'pr view 7': JSON.stringify({ state: 'MERGED', mergeCommit: { oid: 'm1' } }) });
  assert.deepEqual(merge(7, 'squash', merged.run), { pr: 7, state: 'merged', mergeCommit: 'm1' });
  assert.deepEqual(merged.calls[0], ['pr', 'merge', '7', '--squash']);
  assert.equal(merged.calls[0].includes('--admin'), false);
  assert.throws(() => merge(7, 'force', merged.run), /--method/);
});

test('the body and the label events read the same fields discovery does', () => {
  const body = fake({ 'pr view 7': JSON.stringify({ body: 'steps' }) });
  assert.equal(prBody(7, body.run), 'steps');
  const raw = [{ id: 9, event: 'labeled', created_at: 't', label: { name: 'owner:accepted' } }].map((event) => JSON.stringify(event)).join('\n');
  const listed = fake({ 'api --paginate': raw });
  assert.deepEqual(events(7, listed.run), [{ id: 9, event: 'labeled', label: 'owner:accepted', createdAt: 't' }]);
});

test('the command line refuses an unknown subcommand and a missing number', () => {
  assert.throws(() => execute(['nope']), /usage: forge-github/);
  assert.throws(() => execute(['pr', 'view', 'x'], fake().run), /pull request number is required/);
  const cli = spawnSync('node', [SCRIPT, 'nope'], { encoding: 'utf8' });
  // A command line the script cannot act on is a usage error: exit 2, apart from a gh failure (1).
  assert.equal(cli.status, 2);
  assert.match(cli.stderr, /usage: forge-github/);
});

test('empty inline reviews get their comment bodies from one query per PR', () => {
  const calls = [];
  const run = (args) => {
    calls.push(args);
    return [JSON.stringify({ id: 'r1', bodies: ['Fixed.\n<!-- operator:note -->'] }), JSON.stringify({ id: 'r2', bodies: ['Rename it.'] })].join('\n');
  };
  const prs = [
    { number: 1, reviews: [{ id: 'r1', body: '', state: 'COMMENTED' }, { id: 'r2', body: ' ', state: 'COMMENTED' }, { id: 'r3', body: 'Text', state: 'COMMENTED' }, { id: 'r4', body: '', state: 'APPROVED' }] },
    { number: 2, reviews: [{ id: 'r5', body: 'Looks fine', state: 'COMMENTED' }] },
  ];
  readInlineReviews(prs, run);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].filter((arg) => arg.startsWith('ids[]=')), ['ids[]=r1', 'ids[]=r2']);
  assert.deepEqual(prs[0].reviews.map((review) => review.inline), [['Fixed.\n<!-- operator:note -->'], ['Rename it.'], undefined, undefined]);
});

test('unresolved review threads are counted across every page', () => {
  let args = null;
  // gh --paginate prints one line per unresolved thread of every page.
  const run = (given) => { args = given; return '1\n1\n1\n'; };
  assert.equal(readUnresolvedThreads(7, run), 3);
  assert.ok(args.includes('--paginate'));
  assert.ok(args.some((arg) => arg.includes('$endCursor') && arg.includes('pageInfo')));
  assert.equal(readUnresolvedThreads(7, () => ''), 0);
});

test('listing, creating and readying a pull request answer it in the contract shape', () => {
  const { run, calls } = fake({ 'pr list': JSON.stringify([RAW]), 'pr view 7': JSON.stringify(RAW), 'pr create': 'Creating...\nhttps://github.com/o/r/pull/7\n' });
  assert.deepEqual(listPrs(run).map((pr) => pr.head.sha), ['abc1234def']);
  assert.deepEqual(calls[0].slice(0, 4), ['pr', 'list', '--state', 'open']);
  assert.equal(createPr({ base: 'develop', head: 'feature/slot-a-x', title: 'T', bodyFile: 'b.md', draft: true }, run).number, 7);
  assert.deepEqual(calls.find((args) => args[1] === 'create'), ['pr', 'create', '--base', 'develop', '--head', 'feature/slot-a-x', '--title', 'T', '--body-file', 'b.md', '--draft']);
  assert.throws(() => createPr({ base: 'develop' }, run), /needs --base, --head, --title and --body-file/);
  assert.equal(readyPr(7, run).draft, true);
  assert.ok(calls.some((args) => args.join(' ') === 'pr ready 7'));
  const files = fake({ 'pr view 7': JSON.stringify({ files: [{ path: 'a.ts' }, { path: 'b.md' }] }) });
  assert.deepEqual(prFiles(7, files.run), { pr: 7, files: ['a.ts', 'b.md'] });
});

test('notes carry the conversation in time order, author roles and inline review bodies', () => {
  const conversation = {
    number: 7,
    comments: [{ id: 'c2', author: { login: 'owner' }, authorAssociation: 'OWNER', body: 'Rename it.', createdAt: '2026-10-30T09:00:00Z', url: 'u-c2' }],
    reviews: [
      { id: 'r1', author: { login: 'bot' }, authorAssociation: 'NONE', body: 'x', state: 'COMMENTED', submittedAt: '2026-10-30T08:00:00Z' },
      { id: 'r3', author: { login: 'dev' }, authorAssociation: 'COLLABORATOR', body: '', state: 'COMMENTED', submittedAt: '2026-10-30T10:00:00Z' },
    ],
  };
  const { run } = fake({ 'pr view 7': JSON.stringify(conversation), 'api graphql': JSON.stringify({ id: 'r3', bodies: ['Inline remark.'] }) });
  const listed = notes(7, run);
  assert.deepEqual(listed.map((note) => [note.id, note.kind, note.authorRole]), [['r1', 'review', 'other'], ['c2', 'comment', 'owner'], ['r3', 'review', 'member']]);
  assert.equal(listed[0].state, 'commented');
  assert.deepEqual(listed[2].inline, ['Inline remark.']);
  assert.equal('state' in listed[1], false);
});

test('the command line dispatches every subcommand to its function', () => {
  const answers = { 'pr list': JSON.stringify([RAW]), 'pr view 7': JSON.stringify({ ...RAW, files: [{ path: 'a.ts' }], comments: [], reviews: [], state: 'MERGED', mergeCommit: { oid: 'm' } }), 'run list': '[]', 'api graphql': '', 'api --paginate': '', 'pr comment 7': 'https://github.com/o/r/pull/7#issuecomment-1' };
  const run = fake(answers).run;
  assert.equal(execute(['pr', 'list'], run).length, 1);
  assert.equal(execute(['pr', 'view', '7'], run).number, 7);
  assert.equal(execute(['pr', 'ready', '7'], run).number, 7);
  assert.equal(execute(['pr', 'edit', '7', '--milestone', 'Verification'], run).number, 7);
  assert.equal(typeof execute(['pr', 'body', '7'], run).text, 'string');
  assert.deepEqual(execute(['pr', 'files', '7'], run).files, ['a.ts']);
  assert.equal(execute(['checks', 'abc1234'], run).state, 'none');
  assert.deepEqual(execute(['threads', '7'], run), []);
  assert.equal(execute(['claim', 'take', '7'], run).held, true);
  assert.equal(execute(['factor', 'clear', '7', '--name', 'ai:reviewed'], run).set, false);
  assert.equal(execute(['comment', '7', '--body-file', 'b.md'], run).url, 'https://github.com/o/r/pull/7#issuecomment-1');
  assert.deepEqual(execute(['notes', '7'], run), []);
  assert.deepEqual(execute(['events', '7'], run), []);
  assert.equal(execute(['merge', '7', '--method', 'squash'], run).state, 'merged');
});

test('the CLI prints a body as plain text and answers a held claim with exit 3', () => {
  const bin = mkdtempSync(join(tmpdir(), 'forge-gh-'));
  // A stand-in gh on PATH: every view answers the same pull request, held by the processing label.
  writeFileSync(join(bin, 'gh'), `#!/bin/sh\nprintf '%s' '${JSON.stringify({ ...RAW, body: 'Plain body text' })}'\n`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  try {
    const body = spawnSync('node', [SCRIPT, 'pr', 'body', '7'], { encoding: 'utf8', env });
    assert.equal(body.status, 0, body.stderr);
    assert.equal(body.stdout, 'Plain body text');
    const take = spawnSync('node', [SCRIPT, 'claim', 'take', '7'], { encoding: 'utf8', env });
    assert.equal(take.status, 3);
    assert.deepEqual(JSON.parse(take.stdout), { pr: 7, claimed: false, held: true });
  } finally {
    rmSync(bin, { recursive: true, force: true });
  }
});

test('a claim edit takes the label with the milestone move in one call, or answers held and edits nothing', () => {
  const free = fake({ 'pr view 7': JSON.stringify({ ...RAW, labels: [] }) });
  editPr(7, { claim: true, milestone: 'Verification', remove: ['ai:completed'] }, free.run);
  assert.deepEqual(free.calls.filter((args) => args[1] === 'edit'), [['pr', 'edit', '7', '--milestone', 'Verification', '--add-label', 'ai:processing', '--remove-label', 'ai:completed']]);
  const held = fake({ 'pr view 7': JSON.stringify(RAW) });
  assert.deepEqual(editPr(7, { claim: true, milestone: 'Verification' }, held.run), { pr: 7, claimed: false, held: true });
  assert.equal(held.calls.some((args) => args[1] === 'edit'), false);
  // The claim label is only ever added through the held check.
  assert.throws(() => editPr(7, { add: ['ai:processing'] }, free.run), /is the claim: use pr edit --claim/);
});

test('author roles follow operator_config allowedAuthors, the list discovery reads', () => {
  const config = { allowedAuthors: ['OWNER', 'MEMBER'] };
  assert.deepEqual(['OWNER', 'MEMBER', 'COLLABORATOR', 'NONE'].map((association) => authorRole(association, config)), ['owner', 'member', 'other', 'other']);
  assert.deepEqual(['OWNER', 'MEMBER', 'COLLABORATOR', 'CONTRIBUTOR'].map((association) => authorRole(association)), ['owner', 'member', 'member', 'other']);
  const { run } = fake({ 'pr view 7': JSON.stringify({ number: 7, comments: [{ id: 'c1', authorAssociation: 'COLLABORATOR', body: 'x', createdAt: 't' }], reviews: [] }) });
  assert.equal(notes(7, run, config)[0].authorRole, 'other');
});

test('an option without a real value is a usage error, never a silent default', () => {
  const run = fake({ 'api graphql': '' }).run;
  assert.throws(() => execute(['threads', '7', '--resolve'], run), /--resolve needs a value/);
  assert.throws(() => execute(['threads', '7', '--resolve', ''], run), /--resolve needs a value/);
  assert.throws(() => execute(['threads', '7', '--resolve', '--body', 'x'], run), /--resolve needs a value/);
  assert.throws(() => execute(['pr', 'edit', '7', '--milestone'], run), /--milestone needs a value/);
  assert.throws(() => execute(['comment', '7', '--body-file', '--draft'], run), /--body-file needs a value/);
  assert.throws(() => execute(['merge', '7', '--method'], run), /--method needs a value/);
  const cli = spawnSync('node', [SCRIPT, 'threads', '7', '--resolve'], { encoding: 'utf8' });
  assert.equal(cli.status, 2);
  assert.match(cli.stderr, /--resolve needs a value/);
});

test('a takeover takes a standing claim the contract allows, and only with --claim', () => {
  const held = fake({ 'pr view 7': JSON.stringify(RAW) });
  assert.deepEqual(claim('take', 7, held.run, { takeover: true }), { pr: 7, claimed: true, changed: false, takenOver: true });
  editPr(7, { claim: true, takeover: true, milestone: 'Development', remove: ['ai:completed'] }, held.run);
  // The label already stands, so the edit moves the milestone and adds nothing.
  assert.deepEqual(held.calls.filter((args) => args[1] === 'edit'), [['pr', 'edit', '7', '--milestone', 'Development', '--remove-label', 'ai:completed']]);
  assert.deepEqual(editPr(7, { claim: true, takeover: true }, held.run), { pr: 7, claimed: true, changed: false, takenOver: true });
  assert.throws(() => editPr(7, { takeover: true, milestone: 'Development' }, held.run), /--takeover goes with --claim/);
  assert.equal(execute(['claim', 'take', '7', '--takeover'], held.run).takenOver, true);
});

test('a value that merely starts with dashes is a value; only a flag of this script is missing one', () => {
  const posted = fake({ 'pr comment 7': 'https://github.com/o/r/pull/7#issuecomment-1' });
  assert.equal(execute(['comment', '7', '--body-file', '--draft.md'], posted.run).pr, 7);
  const edit = fake({ 'pr view 7': JSON.stringify(RAW) });
  execute(['pr', 'edit', '7', '--milestone', '-- later'], edit.run);
  assert.deepEqual(edit.calls[0], ['pr', 'edit', '7', '--milestone', '-- later']);
  assert.throws(() => execute(['pr', 'edit', '7', '--milestone', '--remove-label', 'x'], edit.run), /--milestone needs a value/);
});

test('only claim take accepts --takeover', () => {
  const run = fake({ 'pr view 7': JSON.stringify(RAW) }).run;
  assert.throws(() => claim('release', 7, run, { takeover: true }), /--takeover goes with claim take/);
  assert.throws(() => execute(['claim', 'release', '7', '--takeover'], run), /--takeover goes with claim take/);
});

test('every option the command line reads is a known flag, so a missing value is never taken for another option', () => {
  const source = readFileSync(SCRIPT, 'utf8');
  const body = source.slice(source.indexOf('export function execute('));
  const used = new Set([...body.matchAll(/(?:option|options)\(args, '(--[a-z-]+)'\)|args\.includes\('(--[a-z-]+)'\)/g)].map((match) => match[1] ?? match[2]));
  assert.ok(used.size >= 10, `found only ${[...used].join(', ')}`);
  assert.deepEqual([...used].filter((flag) => !FLAGS.has(flag)), []);
});

test('every answer holds the forge contract shape the operator pack checks', () => {
  const thread = JSON.stringify({ id: 'T1', isResolved: false, path: 'a.ts', line: 3, comments: { nodes: [{ author: { login: 'r' }, body: 'fix', createdAt: 't' }] } });
  const conversation = { number: 7, comments: [{ id: 'c1', author: { login: 'o' }, authorAssociation: 'OWNER', body: 'x', createdAt: 't', url: 'u' }], reviews: [] };
  const answers = {
    'pr list': JSON.stringify([RAW]),
    'pr view 7 --json number,comments,reviews': JSON.stringify(conversation),
    'pr view 7 --json files': JSON.stringify({ files: [{ path: 'a.ts' }] }),
    'pr view 7 --json state,mergeCommit': JSON.stringify({ state: 'MERGED', mergeCommit: { oid: 'm' } }),
    'pr view 7': JSON.stringify(RAW),
    'run list': JSON.stringify([{ databaseId: 1, workflowName: 'build', attempt: 1, status: 'completed', conclusion: 'success', createdAt: 't', url: 'u' }]),
    'api graphql --paginate': `${thread}\n`,
    'api --paginate': JSON.stringify({ id: 9, event: 'labeled', created_at: 't', label: { name: 'l' } }),
    'pr comment 7': 'https://github.com/o/r/pull/7#issuecomment-1',
  };
  const run = fake(answers).run;
  for (const pr of execute(['pr', 'list'], run)) assertShape('pr', pr);
  assertShape('pr', execute(['pr', 'view', '7'], run));
  assertShape('files', execute(['pr', 'files', '7'], run));
  assertShape('checks', execute(['checks', 'abc1234'], run));
  for (const item of execute(['threads', '7'], run)) assertShape('thread', item);
  for (const item of execute(['notes', '7'], run)) assertShape('note', item);
  for (const item of execute(['events', '7'], run)) assertShape('event', item);
  assertShape('claim', execute(['claim', 'take', '7'], run));
  assertShape('factor', execute(['factor', 'set', '7', '--name', 'ai:reviewed'], run));
  assertShape('comment', execute(['comment', '7', '--body-file', 'b.md'], run));
  assertShape('merge', execute(['merge', '7', '--method', 'squash'], run));
});

test('without an operator configuration the script refuses with a usage error', () => {
  const env = { ...process.env };
  delete env.OPERATOR_CONFIG;
  const cli = spawnSync('node', [SCRIPT, 'claim', 'take', '7'], { encoding: 'utf8', env });
  assert.equal(cli.status, 2);
  assert.match(cli.stderr, /OPERATOR_CONFIG/);
});

test('the example configuration is complete, and a missing required key is refused by name', () => {
  assert.equal(checkOperatorConfig(EXAMPLE), EXAMPLE);
  const without = (mutate) => { const copy = structuredClone(EXAMPLE); mutate(copy); return copy; };
  assert.throws(() => checkOperatorConfig(without((c) => delete c.labels.processing)), /missing required key labels\.processing/);
  assert.throws(() => checkOperatorConfig(without((c) => delete c.milestones.mergeQueue)), /missing required key milestones\.mergeQueue/);
  assert.throws(() => checkOperatorConfig(without((c) => delete c.milestones.clarification)), /missing required key milestones\.clarification/);
  assert.throws(() => checkOperatorConfig(without((c) => { c.slots = []; })), /missing required key slots/);
  const path = join(CONFIG_DIR, 'incomplete.json');
  writeFileSync(path, JSON.stringify(without((c) => delete c.allowedAuthors)));
  const cli = spawnSync('node', [SCRIPT, 'claim', 'take', '7'], { encoding: 'utf8', env: { ...process.env, OPERATOR_CONFIG: path } });
  assert.equal(cli.status, 2);
  assert.match(cli.stderr, /missing required key allowedAuthors/);
});

test('a pull request at the list cap has its whole conversation read, others keep the list answer', () => {
  const at = (n) => Array.from({ length: n }, (_, i) => ({ body: `c${i}`, createdAt: `2026-10-30T08:${String(i % 60).padStart(2, '0')}:00Z` }));
  const { run, calls } = fake({
    'pr list': JSON.stringify([{ number: 7, comments: at(100), reviews: [] }, { number: 8, comments: at(3), reviews: [] }]),
    'pr view 7': JSON.stringify({ comments: at(106), reviews: [{ body: 'r' }] }),
  });
  const prs = readPullRequests(run);
  assert.equal(prs[0].comments.length, 106);
  assert.equal(prs[0].reviews.length, 1);
  assert.equal(prs[1].comments.length, 3);
  assert.deepEqual(calls.filter((args) => args[1] === 'view').map((args) => args[2]), ['7']);
});
