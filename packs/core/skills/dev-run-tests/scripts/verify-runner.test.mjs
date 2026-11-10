import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { changedPaths } from './verify-runner.mjs';

const RUNNER = fileURLToPath(new URL('./verify-runner.mjs', import.meta.url));

// Each test gets a repository on branch `base` with one commit, then a `work` branch, and git
// sees no configuration but its own, so the developer's settings cannot change what it reports.
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'verify-runner-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, 'repo');
  mkdirSync(dir);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(GIT_|VERIFY_)/i.test(key)));
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(root, 'isolated.gitconfig') });
  const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.autocrlf=false', ...args], { cwd: dir, env, encoding: 'utf8' });
  const write = (file, text) => writeFileSync(join(dir, file), text);
  for (const file of ['deleted.txt', 'old.txt', 'staged-delete.txt', 'edited.txt', 'kept.txt']) write(file, `${file}\n`);
  git('init', '-q', '-b', 'base');
  git('add', '.');
  git('commit', '-q', '-m', 'base');
  git('switch', '-q', '-c', 'work');
  const table = (source) => {
    const file = join(root, `gates-${Math.random().toString(36).slice(2)}.mjs`);
    writeFileSync(file, `const NODE = ${JSON.stringify(process.execPath)};\nexport default ${source};\n`);
    return file;
  };
  const verify = (gates, args = [], extra = {}) => {
    // Windows spells PATH as Path; drop the old spelling so the new value is the only one.
    const kept = Object.entries(env).filter(([key]) => !Object.keys(extra).some((k) => k.toUpperCase() === key.toUpperCase()));
    const res = spawnSync(process.execPath, [RUNNER, '--gates', gates, '--base', 'base', ...args], { cwd: dir, env: { ...Object.fromEntries(kept), ...extra }, encoding: 'utf8' });
    return { code: res.status, out: res.stdout, err: res.stderr };
  };
  return { root, dir, env, git, write, table, verify };
}

test('the change holds committed, staged, unstaged and untracked paths, deletions and both sides of a rename', (t) => {
  const { dir, env, git, write } = fixture(t);
  git('rm', '-q', 'deleted.txt');
  git('mv', 'old.txt', 'new.txt');
  git('commit', '-q', '-m', 'delete and rename');
  git('rm', '-q', 'staged-delete.txt');
  write('staged-new.txt', 'x\n');
  git('add', 'staged-new.txt');
  write('edited.txt', 'edited\n');
  write('untracked.txt', 'x\n');
  const saved = { ...process.env };
  t.after(() => Object.assign(process.env, saved));
  for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key];
  Object.assign(process.env, env);
  assert.deepEqual(changedPaths('base', dir).paths, ['deleted.txt', 'edited.txt', 'new.txt', 'old.txt', 'staged-delete.txt', 'staged-new.txt', 'untracked.txt']);
});

test('gates run cheapest first, the first failure stops the run, and the report names what was not reached and not run', (t) => {
  const { write, table, verify } = fixture(t);
  write('kept.txt', 'changed\n');
  const gates = table(`[
    { name: 'late', cost: 3, when: () => true, command: [NODE, '-e', ''] },
    { name: 'breaks', cost: 2, when: () => true, command: [NODE, '-e', 'process.exit(1)'] },
    { name: 'cheap', cost: 1, when: () => true, command: [NODE, '-e', ''] },
    { name: 'unrelated', cost: 0, when: (p) => p.endsWith('.sql'), command: [NODE, '-e', ''] },
  ]`);
  const res = verify(gates);
  assert.equal(res.code, 1);
  assert.match(res.out, /plan: cheap, breaks, late\n {2}not run: unrelated\n/);
  assert.ok(res.out.indexOf('== cheap') < res.out.indexOf('== breaks'));
  assert.doesNotMatch(res.out, /== late/);
  assert.match(res.err, /verify: FAIL at breaks - exited 1/);
  assert.match(res.err, /not reached: late; not run: unrelated/);
});

test('an unknown gate, an unknown argument and a base that does not resolve are refused, with no verdict', (t) => {
  const { table, verify } = fixture(t);
  const gates = table(`[{ name: 'one', cost: 1, when: () => true, command: [NODE, '-e', ''] }]`);
  for (const [args, message] of [[['--gate', 'two'], /unknown gate two; gates are one/], [['--fast'], /unknown argument --fast/], [['--base', 'nowhere'], /cannot read the change against nowhere/]]) {
    const res = verify(gates, args);
    assert.equal(res.code, 2, args.join(' '));
    assert.match(res.err, message);
    assert.doesNotMatch(res.out, /PASS/);
  }
});

test('a generator that exits 0 without writing fails, one that changes its output fails as out of step, and one in step passes', (t) => {
  const { dir, git, write, table, verify } = fixture(t);
  write('gen.txt', 'old\n');
  git('add', 'gen.txt');
  git('commit', '-q', '-m', 'generated file');
  const age = () => utimesSync(join(dir, 'gen.txt'), new Date(2000, 0, 1), new Date(2000, 0, 1));
  const generator = (script) => table(`[{ name: 'gen', cost: 1, when: () => false, outputs: ['gen.txt'], exitMasked: true, command: [NODE, '-e', ${JSON.stringify(script)}] }]`);

  age();
  const silent = verify(generator(''), ['--gate', 'gen']);
  assert.equal(silent.code, 1);
  assert.match(silent.err, /exited 0 without writing gen\.txt/);

  age();
  const moved = verify(generator("require('fs').writeFileSync('gen.txt', 'new\\n')"), ['--gate', 'gen']);
  assert.equal(moved.code, 1);
  assert.match(moved.err, /regenerated gen\.txt, which were out of step/);

  age();
  const inStep = verify(generator("require('fs').writeFileSync('gen.txt', 'new\\r\\n')"), ['--gate', 'gen']);
  assert.equal(inStep.code, 0, inStep.err);
  assert.match(inStep.out, /verify: PASS \(gen;/);
});

test('a runtime is looked for just before its gate, its variable wins, and --ci reports a gate without one as not run', (t) => {
  const { write, table, verify } = fixture(t);
  write('kept.txt', 'changed\n');
  const gates = table(`[
    { name: 'cheap', cost: 1, when: () => true, command: [NODE, '-e', ''] },
    { name: 'tool', cost: 2, when: () => true, command: ['-e', 'console.log("through the prefix")'],
      needs: { name: 'the tool', env: 'VERIFY_TOOL_CMD', find: () => { console.log('find asked'); return null; }, missing: 'start the tool' } },
    { name: 'after', cost: 3, when: () => true, command: [NODE, '-e', ''] },
  ]`);

  const missing = verify(gates);
  assert.equal(missing.code, 1);
  assert.ok(missing.out.indexOf('cheap: ok') < missing.out.indexOf('find asked'));
  assert.match(missing.err, /FAIL at tool - needs the tool: start the tool\n {2}not reached: after/);

  const given = verify(gates, [], { VERIFY_TOOL_CMD: 'node' });
  assert.equal(given.code, 0, given.err);
  assert.match(given.out, /the tool runs through node\n/);
  assert.match(given.out, /through the prefix/);
  assert.doesNotMatch(given.out, /find asked/);

  const ci = verify(gates, ['--ci']);
  assert.equal(ci.code, 3);
  assert.doesNotMatch(ci.out, /find asked/);
  assert.match(ci.out, /after: ok/);
  assert.match(ci.out, /INCOMPLETE - passed: cheap, after; not run for want of a runtime: tool \(set VERIFY_TOOL_CMD\)/);
});

test('a .cmd shim on Windows runs through cmd.exe with its arguments intact', { skip: process.platform !== 'win32' }, (t) => {
  const { root, write, table, verify } = fixture(t);
  write('kept.txt', 'changed\n');
  const bin = join(root, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'echo-arg.cmd'), '@echo [%~1]\r\n');
  const gates = table(`[{ name: 'shim', cost: 1, when: () => true, command: ['echo-arg', 'two words'] }]`);
  const res = verify(gates, [], { PATH: `${bin}${delimiter}${process.env.PATH}` });
  assert.equal(res.code, 0, res.err);
  assert.match(res.out, /\[two words\]/);
});

test('a gate whose command has nothing to check is reported so and listed under not run, never among the passed', (t) => {
  const { write, table, verify } = fixture(t);
  write('kept.txt', 'changed\n');
  const res = verify(table(`[
    { name: 'cheap', cost: 1, when: () => true, command: [NODE, '-e', ''] },
    { name: 'empty', cost: 2, when: () => true, command: () => [] },
    { name: 'after', cost: 3, when: () => true, command: [NODE, '-e', ''] },
  ]`));
  assert.equal(res.code, 0, res.err);
  assert.match(res.out, /\nempty: nothing to check\n/);
  assert.doesNotMatch(res.out, /empty: ok/);
  assert.match(res.out, /verify: PASS \(cheap, after; not run: empty \(nothing to check\)\)/);

  const only = verify(table(`[{ name: 'empty', cost: 1, when: () => true, command: () => [] }]`));
  assert.equal(only.code, 0, only.err);
  assert.match(only.out, /verify: NOTHING CHECKED \(not run: empty \(nothing to check\)\)/);
  assert.doesNotMatch(only.out, /PASS/);

  const onlyCi = verify(table(`[{ name: 'empty', cost: 1, when: () => true, command: () => [] }]`), ['--ci']);
  assert.equal(onlyCi.code, 0, onlyCi.err);
  assert.match(onlyCi.out, /verify: NOTHING CHECKED \(not run: empty \(nothing to check\)\)/);

  const failing = verify(table(`[
    { name: 'empty', cost: 1, when: () => true, command: () => [] },
    { name: 'breaks', cost: 2, when: () => true, command: [NODE, '-e', 'process.exit(1)'] },
  ]`));
  assert.equal(failing.code, 1);
  assert.match(failing.err, /FAIL at breaks - exited 1 \(output above\)\n {2}not reached: none; not run: empty \(nothing to check\)/);

  const ci = verify(table(`[
    { name: 'empty', cost: 1, when: () => true, command: () => [] },
    { name: 'tool', cost: 2, when: () => true, command: [NODE, '-e', ''], needs: { name: 'the tool', env: 'VERIFY_TOOL_CMD' } },
  ]`), ['--ci']);
  assert.equal(ci.code, 3);
  assert.match(ci.out, /INCOMPLETE - passed: none; not run for want of a runtime: tool \(set VERIFY_TOOL_CMD\); skipped: none; not run: empty \(nothing to check\)/);
});

test('a gate that skips itself is reported as not run with its reason, the gates after it still run, and --ci exits 3', (t) => {
  const { write, table, verify } = fixture(t);
  write('kept.txt', 'changed\n');
  const gates = table(`[
    { name: 'cheap', cost: 1, when: () => true, command: [NODE, '-e', ''] },
    { name: 'golden', cost: 2, when: () => true, command: (hits, ctx) => ({ skip: \`reference host macos, \${ctx.ci ? 'in ci' : 'here'}\` }) },
    { name: 'after', cost: 3, when: () => true, command: [NODE, '-e', ''] },
  ]`);
  const local = verify(gates);
  assert.equal(local.code, 0, local.err);
  assert.match(local.out, /\nnot run: golden \(reference host macos, here\)\n/);
  assert.match(local.out, /after: ok/);
  assert.match(local.out, /verify: PASS \(cheap, after; not run: golden \(reference host macos, here\)\)/);

  const ci = verify(gates, ['--ci']);
  assert.equal(ci.code, 3);
  assert.match(ci.out, /INCOMPLETE - passed: cheap, after; not run for want of a runtime: none; skipped: golden \(reference host macos, in ci\); not run: none/);

  const only = verify(table(`[{ name: 'golden', cost: 1, when: () => true, command: () => ({ skip: 'reference host macos' }) }]`));
  assert.equal(only.code, 0, only.err);
  assert.match(only.out, /verify: NOTHING CHECKED \(not run: golden \(reference host macos\)\)/);

  const thrown = verify(table(`[
    { name: 'golden', cost: 1, when: () => true, command: () => { throw new Error('cannot tell the host'); } },
    { name: 'after', cost: 2, when: () => true, command: [NODE, '-e', ''] },
  ]`));
  assert.equal(thrown.code, 1);
  assert.match(thrown.err, /FAIL at golden - cannot tell the host\n {2}not reached: after/);

  const blank = verify(table(`[{ name: 'golden', cost: 1, when: () => true, command: () => ({ skip: ' ' }) }]`));
  assert.equal(blank.code, 1);
  assert.match(blank.err, /FAIL at golden - its command function returned neither an argv array nor \{ skip: <reason> \}/);
});

test('a gate whose runtime has wrap: false runs its command without the prefix, and ctx.runtime carries the prefix', (t) => {
  const { write, table, verify } = fixture(t);
  write('kept.txt', 'changed\n');
  const gates = table(`[
    { name: 'script', cost: 1, when: () => true,
      needs: { name: 'the tool', env: 'VERIFY_TOOL_CMD', wrap: false, find: () => null, missing: 'start the tool' },
      command: (hits, ctx) => [NODE, '-e', 'console.log("runtime is " + process.argv[1])', JSON.stringify(ctx.runtime)] },
  ]`);
  const given = verify(gates, [], { VERIFY_TOOL_CMD: 'wsl.exe -e env' });
  assert.equal(given.code, 0, given.err);
  assert.match(given.out, /the tool runs through wsl\.exe -e env\n/);
  assert.match(given.out, /runtime is \["wsl\.exe","-e","env"\]\n/);

  const wrapped = verify(table(`[{ name: 'wrapped', cost: 1, when: () => true, needs: { name: 'the tool', env: 'VERIFY_TOOL_CMD' },
    command: (hits, ctx) => ['-e', \`console.log("wrapped by " + \${JSON.stringify(ctx.runtime.join(' '))})\`] }]`), [], { VERIFY_TOOL_CMD: 'node' });
  assert.equal(wrapped.code, 0, wrapped.err);
  assert.match(wrapped.out, /wrapped by node\n/);

  const missing = verify(gates);
  assert.equal(missing.code, 1);
  assert.match(missing.err, /FAIL at script - needs the tool: start the tool/);

  const ci = verify(gates, ['--ci']);
  assert.equal(ci.code, 3);
  assert.match(ci.out, /not run for want of a runtime: script \(set VERIFY_TOOL_CMD\)/);

  const bad = verify(table(`[{ name: 'odd', cost: 1, when: () => true, command: [NODE, '-e', ''], needs: { name: 'x', env: 'X', wrap: 'no' } }]`));
  assert.equal(bad.code, 2);
  assert.match(bad.err, /odd has a needs\.wrap that is not true or false/);
});

test('ctx carries all, true only under --all', (t) => {
  const { table, verify } = fixture(t);
  const gates = table(`[{ name: 'one', cost: 1, when: () => false, command: (hits, ctx) => [NODE, '-e', \`console.log("all=" + \${ctx.all})\`] }]`);
  assert.match(verify(gates, ['--all']).out, /all=true/);
  assert.match(verify(gates, ['--gate', 'one']).out, /all=false/);
});

test('the verdict and the exit code reach a pipe whole, because the run exits only once its output has drained', (t) => {
  const { write, table, verify } = fixture(t);
  write('kept.txt', 'changed\n');
  const big = `{ name: 'big', cost: 1, when: () => true, command: [NODE, '-e', 'process.stdout.write("x".repeat(200000) + "\\\\n")'] }`;
  const pass = verify(table(`[${big}]`));
  assert.equal(pass.code, 0, pass.err);
  assert.match(pass.out, /\nverify: PASS \(big; not run: none\)\n$/);
  const fail = verify(table(`[${big}, { name: 'breaks', cost: 2, when: () => true, command: [NODE, '-e', 'process.exit(1)'] }]`));
  assert.equal(fail.code, 1);
  assert.match(fail.err, /not reached: none; not run: none\n$/);
  assert.match(readFileSync(RUNNER, 'utf8'), /stream\.write\('', done\)[\s\S]*process\.exit\(code\)/);
});

// The crash needs Windows, a working WSL and a pipe Git Bash made; elsewhere the test is skipped.
function gitBashWithWsl() {
  if (process.platform !== 'win32') return null;
  if (spawnSync('wsl.exe', ['-e', 'true'], { timeout: 30000 }).status !== 0) return null;
  const exec = spawnSync('git', ['--exec-path'], { encoding: 'utf8' }).stdout?.trim();
  const bash = exec ? resolve(exec, '..', '..', '..', 'bin', 'bash.exe') : null;
  return bash && existsSync(bash) ? bash : null;
}
const BASH_WITH_WSL = gitBashWithWsl();

test('under a Git Bash pipe, after a wsl.exe gate, the run exits with its own code', { skip: !BASH_WITH_WSL }, (t) => {
  const { dir, env, write, table } = fixture(t);
  write('kept.txt', 'changed\n');
  const bash = BASH_WITH_WSL;
  const q = (s) => `'${s.split('\\').join('/')}'`;
  const piped = (gates) => spawnSync(bash, ['-c', `${q(process.execPath)} ${q(RUNNER)} --gates ${q(gates)} --base base | cat; exit \${PIPESTATUS[0]}`], { cwd: dir, env, encoding: 'utf8' });
  const gates = `{ name: 'echo', cost: 1, when: () => true, command: [NODE, '-e', 'console.log("x".repeat(2000))'] },
    { name: 'wsl', cost: 2, when: () => true, command: ['wsl.exe', '-e', 'echo', 'from wsl'] }`;
  assert.equal(piped(table(`[${gates}]`)).status, 0);
  assert.equal(piped(table(`[${gates}, { name: 'breaks', cost: 3, when: () => true, command: [NODE, '-e', 'process.exit(1)'] }]`)).status, 1);
});
