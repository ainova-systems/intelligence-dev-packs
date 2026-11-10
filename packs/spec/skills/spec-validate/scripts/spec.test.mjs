import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkPlan, itemRefPattern, lostLines, manifestSources, moveQuestion, openQuestions, parseProfile,
  replaceSection, specStatus,
} from './spec.mjs';

const SCRIPT = fileURLToPath(new URL('./spec.mjs', import.meta.url));
const DIGEST = 'a'.repeat(40);

const SECTIONS = {
  'Requirements coverage': '| Requirement | Delivered by |\n|---|---|\n| 1 | step 1 |\n| 2 | steps 2-3 |',
  Approach: 'The export module changes. Precedents: `src/export/csv.ts` for the format.',
  'Work steps': [
    '- [ ] 1. Rows export, in `src/export/rows.ts` (new), by `app-developer` - check: the export test passes',
    '- [ ] 2. The endpoint, in `src/export/rows.ts`, by `add-endpoint` - check: a request returns rows',
    '- [ ] 3. The feature page, in `docs/features/export.md`, by `subagent` - check: the page names the export',
  ].join('\n'),
  'Open questions': '',
  'Answered questions': '',
  Corrections: '',
  'Review findings': '',
};

function plan(over = {}, footer = '') {
  const parts = { ...SECTIONS, ...over };
  const body = Object.entries(parts).filter(([, text]) => text !== null).map(([name, text]) => `## ${name}\n\n${text}${text ? '\n' : ''}`).join('\n');
  return `# Export\n\n${body}${footer ? `\n${footer}\n` : ''}`;
}

const LAYER = {
  exists: (path) => ['src/export/csv.ts', 'src/export', 'docs/features/export.md'].includes(path),
  skillExists: (name) => name === 'add-endpoint',
  agentWrites: (name) => name === 'app-developer',
};
const check = (text, extra = {}) => checkPlan({ dir: 'docs/specs/001-export', key: '001', requirements: '1. WHEN ...', plan: text }, { ...LAYER, ...extra });
const ticked = (text) => text.replace(/- \[ \]/g, '- [x]');

test('status follows the files', () => {
  assert.equal(specStatus({ requirements: 'r', plan: null }), 'requirements');
  assert.equal(specStatus({ requirements: 'r', plan: plan({ 'Open questions': '1. Which delimiter?' }) }), 'blocked');
  assert.equal(specStatus({ requirements: 'r', plan: plan() }), 'planned');
  assert.equal(specStatus({ requirements: 'r', plan: plan().replace('- [ ] 1.', '- [x] 1.') }), 'in-progress');
  assert.equal(specStatus({ requirements: 'r', plan: ticked(plan()) }), 'completed');
});

test('status blocks on any line under open questions that is not a numbered question, and on a cycle; an empty section is none', () => {
  for (const open of ['None.', '- Round up?', '1) Round up?']) assert.equal(specStatus({ requirements: 'r', plan: plan({ 'Open questions': open }) }), 'blocked', open);
  const cycle = '1. A?\n   - Depends on: 2\n2. B?\n   - Depends on: 1';
  assert.deepEqual(openQuestions(plan({ 'Open questions': cycle })).circular, [1, 2]);
  const waits = openQuestions(plan({ 'Open questions': '3. A?\n4. B?\n   - Depends on: 3', 'Answered questions': '1. C?\n   - Answer: x\n   - Changed: nothing' }));
  assert.deepEqual(waits.questions.map((q) => [q.number, q.waitsOn]), [[3, []], [4, [3]]]);
  assert.equal(specStatus({ requirements: 'r', plan: plan({ 'Open questions': '' }) }), 'planned');
});

test('with explicit approval only an approval line on the current requirements digest approves, and another digest reads stale', () => {
  const opts = { approval: 'explicit', digest: () => DIGEST };
  assert.equal(specStatus({ requirements: 'r', plan: ticked(plan()) }, opts), 'planned');
  const approved = plan({}, `approved: maintainer 2026-11-07 ${DIGEST}`);
  assert.equal(specStatus({ requirements: 'r', plan: approved }, opts), 'approved');
  assert.equal(specStatus({ requirements: 'r', plan: approved.replace('- [ ] 1.', '- [x] 1.') }, opts), 'in-progress');
  assert.equal(specStatus({ requirements: 'r', plan: approved }, { ...opts, digest: () => 'b'.repeat(40) }), 'stale');
  assert.equal(specStatus({ requirements: 'r', plan: plan({}, 'approved: yes') }, opts), 'planned');
  assert.equal(specStatus({ requirements: 'r', plan: plan({}, `> approved: maintainer 2026-11-07 ${DIGEST}`) }, opts), 'planned');
});

test('in autonomous mode the written queue status gates, and the ticks still decide progress', () => {
  const opts = { mode: 'autonomous' };
  const front = (status) => `---\nstatus: ${status}\n---\n${plan()}`;
  assert.equal(specStatus({ requirements: 'r', plan: plan() }, opts), 'planned');
  assert.equal(specStatus({ requirements: 'r', plan: front('proposed') }, opts), 'proposed');
  assert.equal(specStatus({ requirements: 'r', plan: front('approved 2026-11-07') }, opts), 'approved');
  assert.equal(specStatus({ requirements: 'r', plan: ticked(front('in-progress')) }, opts), 'completed');
});

test('cancelled and superseded are written, and outrank every other state', () => {
  assert.equal(specStatus({ requirements: '---\nstatus: cancelled\n---\nr', plan: plan({ 'Open questions': '1. A?' }) }), 'cancelled');
  assert.equal(specStatus({ requirements: 'r', plan: `---\nstatus: superseded by 014\n---\n${plan()}` }), 'superseded by 014');
});

test('check passes a sound plan', () => {
  assert.deepEqual(check(plan()), []);
});

test('check names a missing, repeated, reordered or empty section', () => {
  const problems = check(plan({ Corrections: null, Approach: '' }).replace('## Review findings', '## Review findings\n\n## Open questions'));
  assert.ok(problems.some((p) => p.startsWith('no "## Corrections" section')));
  assert.ok(problems.includes('no text under "## Approach"'));
  assert.ok(problems.includes('"## Open questions" stands 2 times'));
  const swapped = plan().replace('## Approach', '## Placeholder').replace('## Work steps', '## Approach').replace('## Placeholder', '## Work steps');
  assert.ok(check(swapped).some((p) => p.startsWith('"## Work steps" stands before "## Approach"')));
});

test('check refuses broken gate lines: a checkbox out of shape, an approval line out of place or shape, a status no skill writes', () => {
  const text = `---\nstatus: almost done\n---\n${plan({ 'Work steps': `${SECTIONS['Work steps']}\n- [ ] Tidy up\n1. [x] Done`, Approach: `approved: maintainer 2026-11-07 ${DIGEST}` }, 'approved: maintainer')}`;
  const problems = check(text);
  assert.ok(problems.includes('"## Work steps" holds a checkbox not in the shape "- [ ] N. <step>": - [ ] Tidy up'));
  assert.ok(problems.includes('"## Work steps" holds a checkbox not in the shape "- [ ] N. <step>": 1. [x] Done'));
  assert.ok(problems.some((p) => p.endsWith("is an approval line that is not the plan's last line")));
  assert.ok(problems.includes('the last line "approved: maintainer" does not read "approved: <name> <yyyy-mm-dd> <requirements digest>"'));
  assert.ok(problems.includes('the plan\'s "status: almost done" is not a status a spec skill writes'));
});

test('check wants an executor that is a skill, an agent that can write, or subagent, and a check on every unticked step', () => {
  const steps = [
    '- [ ] 1. A, in `src/export`, by `code-reviewer` - check: x',
    '- [ ] 2. B, in `src/export`, by a developer - check: y',
    '- [ ] 3. C, in `src/export`, by `add-endpoint`',
    '- [x] 4. D, in `src/gone`, by `removed-agent` - check: z',
  ].join('\n');
  const problems = check(plan({ 'Work steps': steps, 'Requirements coverage': '| R | Delivered by |\n|---|---|\n| 1 | steps 1-4 |' }));
  assert.deepEqual(problems, [
    'step 1: `code-reviewer` is neither a skill, an agent that can write, nor `subagent`',
    'step 2: names no executor, written by `<skill or agent>` or by `subagent`',
    'step 3: has no "check: <observable result>"',
  ]);
});

test('check accepts paths a plan creates, git refs, scoped package names and paths inside a created folder, and flags the rest', () => {
  const steps = [
    '- [ ] 1. A, in `src/new-area/` (new) and `src/other.ts (new)`, by `subagent` - check: x',
    '- [ ] 2. B, in `src/new-area/one.ts`, `src/other.ts`, `origin/main`, `upstream/dev`, `refs/heads/x` and `@scope/pkg`, by `subagent` - check: y',
    '- [ ] 3. C, in `.intelligence/packages/@scope/pkg/skills/none` and `src/<area>/file.ts`, by `subagent` - check: z',
    '- [x] 4. D, in `src/removed.ts`, by `subagent` - check: w',
  ].join('\n');
  const problems = check(plan({ 'Work steps': steps, 'Requirements coverage': '| R | Steps |\n|---|---|\n| 1 | steps 1, 2, 3 and 4 |', Approach: 'See `src/missing.ts`.' }), { remotes: ['origin', 'upstream'] });
  assert.deepEqual(problems, [
    '"## Approach" cites src/missing.ts, which does not exist; a path the plan creates is cited `src/missing.ts` (new)',
    'step 3: cites .intelligence/packages/@scope/pkg/skills/none, which does not exist; a path the plan creates is cited `.intelligence/packages/@scope/pkg/skills/none` (new)',
  ]);
});

test('check resolves every coverage cell, a requirement moved to another tracker item included', () => {
  const coverage = '| # | Requirement | Delivered by |\n|---|---|---|\n| 1 | rows | step 1 |\n| 2 | totals | step 9 |\n| 3 | paging | |\n| 4 | sort | question 7 |\n| 5 | csv | moved to PROJ-12. |\n| 6 | xml | moved to #12 |\n| 1 | again | step 1 |';
  const problems = check(plan({ 'Requirements coverage': coverage }), { itemRef: itemRefPattern('PROJ-123') });
  assert.deepEqual(problems, [
    'requirement 2: step 9 is not under "## Work steps"',
    'requirement 3: its coverage names no step, question or "moved to <item ref>"',
    'requirement 4: question 7 is under neither "## Open questions" nor "## Answered questions"',
    'requirement 6: "moved to #12" is not a tracker item reference in the profile\'s tracker_item_ref form',
    'requirement 1 has two coverage rows',
  ]);
  assert.ok(itemRefPattern('auto').test('#12') && itemRefPattern('url').test('https://tracker.example/i/12') && !itemRefPattern('#123').test('PROJ-1'));
});

test('check names duplicate numbers, dependency cycles, a dependency on no question, and an answered question without Answer or Changed', () => {
  const problems = check(plan({
    'Work steps': `${SECTIONS['Work steps']}\n- [ ] 3. Again, in \`src/export\`, by \`subagent\` - check: x`,
    'Open questions': '1. A?\n   - Depends on: 2\n2. B?\n   - Depends on: 1, 8\nNone.',
    'Answered questions': '2. Old?\n   - Answer: yes\n3. Other?\n   - Changed: step 1\n- loose line',
  }));
  for (const expected of [
    'step 3 is numbered twice',
    '"## Open questions" holds a line that is not a numbered question or one of its nested lines: None.; no questions is an empty section',
    '"## Answered questions" holds a line that is not a numbered question or one of its nested lines: - loose line',
    'question 2 is numbered 2 times; a question keeps one number for the life of the plan',
    'the "Depends on:" lines of questions 1, 2 form a cycle',
    'question 2 depends on question 8, which the plan does not hold',
    'answered question 2 has no "Changed:" line',
    'answered question 3 has no "Answer:" line',
  ]) assert.ok(problems.includes(expected), expected);
});

test('lostLines passes a plan that only gained lines, or that no commit holds', () => {
  const before = plan({ 'Work steps': '- [x] 1. A, by `subagent` - check: x', 'Answered questions': '1. Q?\n   - Answer: yes\n   - Changed: step 1', Corrections: '- step 1 used the wrong field (auto)' });
  const after = before.replace('check: x', 'check: x\n  - note: also covers paging').replace('Answer: yes', 'Answer: yes, with paging').replace('(auto)', '(auto)\n- step 2 renamed the column (dev)');
  assert.deepEqual(lostLines(before, after), []);
  assert.deepEqual(lostLines(null, after), []);
});

test('lostLines names each line a ticked step, an answered question or a correction lost', () => {
  const before = plan({ 'Work steps': '- [x] 1. A, by `subagent` - check: x\n  - note: keep\n- [x] 2. B, by `subagent` - check: y', 'Answered questions': '1. Q?\n   - Context: the old screen\n   - Answer: yes\n   - Changed: step 1', Corrections: '- step 1 used the wrong field (auto)' });
  const after = plan({ 'Work steps': '- [ ] 1. A, by `subagent` - check: x\n  - note: keep', 'Answered questions': '1. Q?\n   - Answer: no\n   - Changed: nothing', Corrections: '' });
  assert.deepEqual(lostLines(before, after).map((p) => p.split(' since')[0]), [
    'ticked step 1 lost "- [x] 1. A, by `subagent` - check: ..."',
    'ticked step 2 lost "- [x] 2. B, by `subagent` - check: ..."',
    'answered question 1 lost "- Context: the old screen"',
    '"## Corrections" lost "- step 1 used the wrong field (auto)"',
  ]);
});

test('move-question moves the question by structure, even when a line quotes a heading', () => {
  const open = '1. Which delimiter? The plan says ## Answered questions somewhere\n   - Suggested: comma\n   - Your answer:\n\n2. Header row?\n   - Suggested: yes';
  const moved = moveQuestion(plan({ 'Open questions': open }).replace(/\n/g, '\r\n'), 1, '- Answer: comma\nChanged: step 1\n');
  assert.ok(!/[^\r]\n/.test(moved), 'keeps CRLF');
  const text = moved.replace(/\r\n/g, '\n');
  assert.match(text, /## Open questions\n\n2\. Header row\?\n {3}- Suggested: yes\n\n## Answered questions\n\n1\. Which delimiter\? The plan says ## Answered questions somewhere\n {3}- Answer: comma\n {3}- Changed: step 1\n\n## Corrections/);
  const again = moveQuestion(text, 2, 'Answer: yes\nChanged: nothing');
  assert.match(again, /## Open questions\n\n## Answered questions\n\n1\. Which[^\n]*\n {3}- Answer: comma\n {3}- Changed: step 1\n2\. Header row\?\n {3}- Answer: yes\n {3}- Changed: nothing\n\n## Corrections/);
  assert.deepEqual(check(again), []);
});

test('move-question refuses an answer without Answer or Changed, a line that is not a field, and a question that is not open', () => {
  const text = plan({ 'Open questions': '1. A?', 'Answered questions': '2. B?\n   - Answer: x\n   - Changed: y' });
  assert.throws(() => moveQuestion(text, 1, 'Answer: yes'), /no "Changed:" line/);
  assert.throws(() => moveQuestion(text, 1, 'Answer: yes\nChanged: x\nsee the thread'), /not a "Key: value" line/);
  assert.throws(() => moveQuestion(text, 3, 'Answer: yes\nChanged: x'), /question 3 is not under "## Open questions"/);
  assert.throws(() => moveQuestion(text.replace('1. A?', '2. A?'), 2, 'Answer: yes\nChanged: x'), /already under "## Answered questions"/);
});

test('replace-section replaces exactly one section, keeps the approval line, and refuses a body that adds a heading or an approval', () => {
  const footer = `approved: maintainer 2026-11-07 ${DIGEST}`;
  const text = plan({ Approach: 'Keep `src/export/csv.ts`. Then ## Work steps follow.', 'Review findings': '- one' }, footer);
  const replaced = replaceSection(text, 'Approach', '\nUse `src/export/csv.ts` as the precedent.\n\n');
  assert.match(replaced, /## Approach\n\nUse `src\/export\/csv\.ts` as the precedent\.\n\n## Work steps\n\n- \[ \] 1\./);
  const last = replaceSection(text, '## Review findings', '- two');
  assert.ok(last.endsWith(`## Review findings\n\n- two\n\n${footer}\n`));
  assert.throws(() => replaceSection(text, 'Approach', 'x\n## Work steps'), /no "#" or "##" heading and no approval line/);
  assert.throws(() => replaceSection(text, 'Approach', `approved: maintainer 2026-11-07 ${DIGEST}`), /no approval line/);
  assert.throws(() => replaceSection(text, 'Risks', 'x'), /has no "## Risks"/);
  assert.throws(() => replaceSection(`${text}\n## Approach\n`, 'Approach', 'x'), /stands 2 times/);
});

test('the layer sources and the profile are read from their files', () => {
  const manifest = 'project:\n  name: "x"\nsources:\n  rules:\n    - "intelligence/rules"  # own\n  skills:\n    - ".intelligence/packages/@a/core/skills"\n    - "@a/spec/skills"\n    - core:skills\ntargets:\n  claude: { enabled: true }\n';
  assert.deepEqual(manifestSources(manifest), { rules: ['intelligence/rules'], agents: [], skills: ['.intelligence/packages/@a/core/skills', '@a/spec/skills', 'core:skills'] });
  assert.deepEqual(parseProfile('## Docs\n\n- specs_dir: doc/specs   <!-- where -->\n- approval: explicit\n'), { specs_dir: 'doc/specs', approval: 'explicit' });
});

test('the script sets an exit code and never calls process.exit', () => {
  assert.doesNotMatch(readFileSync(SCRIPT, 'utf8'), /process\.exit\(/);
});

// A repository whose git sees no configuration but its own, with one spec, a profile and a layer.
function repo(t, profile = '') {
  const root = mkdtempSync(join(tmpdir(), 'spec-script-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, 'repo');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(root, 'isolated.gitconfig') });
  const write = (file, text) => {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), text);
  };
  const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.autocrlf=false', ...args], { cwd: dir, env, encoding: 'utf8' });
  const spec = (...args) => {
    const res = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, env, encoding: 'utf8' });
    return { code: res.status, out: res.stdout, err: res.stderr };
  };
  write('intelligence/rules/dev-project-profile.md', `# Profile\n\n- specs_dir: doc/specs\n${profile}`);
  write('intelligence/skills/add-endpoint/SKILL.md', '---\nname: add-endpoint\n---\n');
  write('.intelligence/packages/@vendor/pack/agents/app-developer.md', '---\naccess: full\n---\n');
  write('intelligence/agents/code-reviewer.md', '---\naccess: readonly\n---\n');
  write('src/export/csv.ts', 'x\n');
  write('docs/features/export.md', 'x\n');
  write('doc/specs/001-export/001-requirements.md', '1. WHEN a user exports THE SYSTEM SHALL write rows\n');
  write('doc/specs/001-export/001-plan.md', plan());
  git('init', '-q', '-b', 'main');
  git('add', '.');
  git('commit', '-q', '-m', 'base');
  return { dir, git, write, spec };
}

test('the command line reads the profile: explicit approval holds on the current digest and reads stale once the requirements move', (t) => {
  const { git, write, spec } = repo(t, '- approval: explicit\n');
  assert.deepEqual(spec('status', '001'), { code: 0, out: 'planned\n', err: '' });
  const digest = git('hash-object', '--', 'doc/specs/001-export/001-requirements.md').trim();
  write('doc/specs/001-export/001-plan.md', plan({}, `approved: maintainer 2026-11-07 ${digest}`));
  assert.equal(spec('status', 'doc/specs/001-export').out, 'approved\n');
  write('doc/specs/001-export/001-requirements.md', '1. WHEN a user exports THE SYSTEM SHALL write rows and totals\n');
  assert.equal(spec('status', 'doc/specs/001-export/001-plan.md').out, 'stale\n');
});

test('check finds executors in the project and the package store and compares the plan with its last commit', (t) => {
  const { git, write, spec } = repo(t);
  assert.deepEqual(spec('check', '001'), { code: 0, out: 'check: ok\n', err: '' });
  write('doc/specs/001-export/001-plan.md', ticked(plan()));
  git('commit', '-q', '-am', 'ticked');
  write('doc/specs/001-export/001-plan.md', plan({ 'Work steps': ticked(SECTIONS['Work steps']).replace('- [x] 3.', '- [ ] 3.').replace('`subagent`', '`code-reviewer`') }));
  const res = spec('check', '001');
  assert.equal(res.code, 1);
  assert.match(res.out, /ticked step 3 lost "- \[x\] 3\. The feature page/);
  assert.match(res.out, /step 3: `code-reviewer` is neither a skill, an agent that can write, nor `subagent`/);
});

test('a readonly or runner agent never executes a step, while a full agent and one with no access, which the engine renders as full, do', (t) => {
  const { write, spec } = repo(t);
  write('intelligence/agents/qa-runner.md', '---\naccess: runner\n---\n');
  write('intelligence/agents/unstated.md', '---\nname: unstated\n---\n');
  const by = (executor) => plan({ 'Work steps': SECTIONS['Work steps'].replace('`app-developer`', `\`${executor}\``) });
  for (const executor of ['code-reviewer', 'qa-runner']) {
    write('doc/specs/001-export/001-plan.md', by(executor));
    const res = spec('check', '001');
    assert.equal(res.code, 1, executor);
    assert.match(res.out, new RegExp(`step 1: \`${executor}\` is neither a skill, an agent that can write, nor \`subagent\``), executor);
  }
  for (const executor of ['app-developer', 'unstated']) {
    write('doc/specs/001-export/001-plan.md', by(executor));
    assert.deepEqual(spec('check', '001'), { code: 0, out: 'check: ok\n', err: '' }, executor);
  }
});

test('delivered lists the specs whose steps the change ticks, untracked plans included, and refuses a base git cannot find', (t) => {
  const { write, spec } = repo(t);
  write('doc/specs/001-export/001-plan.md', `${plan()}\nA note.\n`);
  write('doc/specs/002-import/002-plan.md', ticked(plan()));
  assert.deepEqual(spec('delivered', '--base', 'main'), { code: 0, out: 'doc/specs/002-import\n', err: '' });
  write('doc/specs/001-export/001-plan.md', plan().replace('- [ ] 2.', '- [x] 2.'));
  assert.equal(spec('delivered', '--base', 'main').out, 'doc/specs/001-export\ndoc/specs/002-import\n');
  const missing = spec('delivered', '--base', 'origin/nowhere');
  assert.equal(missing.code, 2);
  assert.match(missing.err, /^spec: git merge-base failed/);
});

test('a project module named by spec_checks adds its problems', (t) => {
  const { write, spec } = repo(t, '- spec_checks: tools/spec-checks.mjs\n');
  write('tools/spec-checks.mjs', 'export default (spec) => (spec.plan.includes("rows.ts") ? [`${spec.key}: the stack check ran`] : []);\n');
  assert.deepEqual(spec('check', '001'), { code: 1, out: '- 001: the stack check ran\n1 problem(s)\n', err: '' });
});

test('move-question and replace-section write the plan; an unknown spec or command is refused', (t) => {
  const { dir, write, spec } = repo(t);
  write('doc/specs/001-export/001-plan.md', plan({ 'Open questions': '1. Delimiter?\n   - Suggested: comma' }));
  assert.equal(spec('open-questions', '001').out, '1. Delimiter?\n1 open\n');
  write('answer.md', 'Answer: comma\nChanged: step 1\n');
  assert.equal(spec('move-question', '001', '1', '--from', 'answer.md').code, 0);
  assert.equal(spec('status', '001').out, 'planned\n');
  write('approach.md', 'The export module changes, after `src/export/csv.ts`.\n');
  assert.equal(spec('replace-section', '001', 'Approach', '--from', 'approach.md').code, 0);
  assert.match(readFileSync(join(dir, 'doc/specs/001-export/001-plan.md'), 'utf8'), /## Approach\n\nThe export module changes, after `src\/export\/csv\.ts`\.\n\n## Work steps/);
  assert.equal(spec('check', '001').out, 'check: ok\n');
  const unknown = spec('status', '009');
  assert.deepEqual([unknown.code, unknown.err], [2, 'spec: no spec 009 under doc/specs\n']);
  assert.equal(spec('approve', '001').code, 2);
});
