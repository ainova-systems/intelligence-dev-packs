import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileLane, decide, findPushes, tagPattern } from './guard-push.mjs';

const GUARD = fileURLToPath(new URL('./guard-push.mjs', import.meta.url));

// A work repository with `main` and `develop` pushed to a bare remote and the current branch
// `feature/x` pushed with its upstream; git sees no configuration but its own.
function fixture(t, profile = { protected_branches: 'main, develop', integration_branch: 'develop', direct_lane: 'none' }) {
  const root = mkdtempSync(join(tmpdir(), 'guard-push-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(root, 'isolated.gitconfig') });
  const remote = join(root, 'remote.git');
  const dir = join(root, 'work');
  const run = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.autocrlf=false', ...args], { cwd, env, encoding: 'utf8' });
  const git = (...args) => run(dir, ...args);
  const write = (file, text) => {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), text);
  };
  mkdirSync(dir);
  run(root, 'init', '-q', '--bare', '-b', 'main', remote);
  git('init', '-q', '-b', 'main');
  git('remote', 'add', 'origin', remote);
  write('src/app.js', 'app\n');
  write('docs/guide.md', 'guide\n');
  git('add', '.');
  git('commit', '-q', '-m', 'base');
  git('push', '-q', '-u', 'origin', 'main');
  git('push', '-q', 'origin', 'main:develop');
  git('tag', 'v1.0');
  git('switch', '-q', '-c', 'feature/x');
  git('push', '-q', '-u', 'origin', 'feature/x');
  const lines = Object.entries({ default_branch: 'main', ...profile }).map(([k, v]) => `- ${k}: ${v}   <!-- note -->`);
  write('intelligence/rules/dev-project-profile.md', `# Project Profile\n\n${lines.join('\n')}\n`);
  // A deny reads as its reason, an ask as `ask: <reason>`, a call let through as null.
  const check = (command, { tool = 'Bash', cwd = dir } = {}) => {
    const result = decide({ tool_name: tool, tool_input: { command }, cwd }, { env });
    return result && (result.decision === 'deny' ? result.reason : `${result.decision}: ${result.reason}`);
  };
  return { root, dir, env, git, write, check, posix: dir.replace(/\\/g, '/') };
}

test('a push to a protected branch is denied in every refspec spelling, and other pushes pass', (t) => {
  const { check } = fixture(t);
  for (const command of [
    'git push origin main', 'git push -u origin main', 'git push origin main --tags', 'git push origin HEAD:main',
    'git push origin feature/x:main', 'git push origin HEAD:refs/heads/main', 'git push origin refs/heads/main',
    'git push origin feature/x:refs/heads/develop', 'git push origin +HEAD:develop', 'git push --porcelain -o ci.skip origin main',
  ]) assert.match(check(command) ?? '', /protected branch `(main|develop)`/, command);
  for (const command of [
    'git push origin feature/x', 'git push -u origin feature/x', 'git push', 'git push origin HEAD', 'git push origin v1.0',
    'git push origin tag v1.0', 'git push --tags', 'git push origin feature/main', 'git push origin main-fix',
    'git push origin feature/x:feature/main', 'git push --dry-run origin main', 'git push -n origin HEAD:main',
  ]) assert.equal(check(command), null, command);
});

test('deleting a protected branch, --all, --mirror and a pattern that reaches one are denied', (t) => {
  const { check } = fixture(t);
  assert.match(check('git push origin :main'), /delete the protected branch `main`/);
  assert.match(check('git push origin --delete develop'), /delete the protected branch `develop`/);
  assert.match(check('git push -d origin main'), /delete/);
  assert.equal(check('git push origin --delete feature/old'), null);
  assert.match(check('git push --all origin'), /`--all` pushes every branch/);
  assert.match(check('git push --mirror origin'), /`--mirror` pushes every branch/);
  assert.match(check("git push origin 'refs/heads/*:refs/heads/*'"), /can update the protected branch/);
  assert.equal(check("git push origin 'refs/heads/feature/*:refs/heads/feature/*'"), null);
  assert.match(check('git push origin :'), /protected branch `main`/);
});

test('a bare push resolves the current branch and push.default', (t) => {
  const { check, git } = fixture(t);
  git('switch', '-q', 'main');
  assert.match(check('git push'), /protected branch `main`/);
  assert.match(check('git push origin HEAD'), /protected branch `main`/);
  git('switch', '-q', '-c', 'feature/y', '--track', 'origin/main');
  assert.equal(check('git push'), null, 'simple pushes to the same name and refuses a differently named upstream');
  git('config', 'push.default', 'upstream');
  assert.match(check('git push'), /protected branch `main`/);
  git('config', 'push.default', 'nothing');
  assert.equal(check('git push'), null);
  git('config', 'push.default', 'simple');
  git('config', 'remote.origin.push', 'HEAD:refs/heads/develop');
  assert.match(check('git push'), /protected branch `develop`/);
  git('config', '--unset', 'remote.origin.push');
  git('switch', '-q', '--detach');
  assert.match(check('git push'), /cannot tell which branches.*HEAD is detached/);
});

test('the guard follows the directory, the chain, wrappers, substitutions and aliases', (t) => {
  const { check, git, root, posix } = fixture(t);
  const elsewhere = { cwd: root };
  assert.match(check(`git -C ${posix} push origin main`, elsewhere), /protected branch `main`/);
  assert.match(check(`cd ${posix} && git push origin main`, elsewhere), /protected branch `main`/);
  assert.equal(check(`cd ${posix} && git push origin feature/x`, elsewhere), null);
  assert.match(check('FOO=1 git push origin main'), /protected/);
  assert.match(check('env FOO=1 git push origin main'), /protected/);
  assert.match(check('git status && git push origin main'), /protected/);
  assert.match(check('git status; git push origin main 2>&1 | tail -3'), /protected/);
  assert.match(check("sh -c 'git push origin main'"), /protected/);
  assert.match(check('bash -lc "git fetch && git push origin develop"'), /protected/);
  assert.match(check('echo $(git push origin main)'), /protected/);
  assert.equal(check('git push -u origin "$(git branch --show-current)"'), null);
  git('switch', '-q', 'main');
  assert.match(check('git push -u origin "$(git branch --show-current)"'), /protected branch `main`/);
  git('switch', '-q', 'feature/x');
  git('config', 'alias.pm', 'push origin main');
  assert.match(check('git pm'), /protected branch `main`/);
  git('config', 'alias.ship', '!git push origin develop');
  assert.match(check('git ship'), /protected branch `develop`/);
  assert.match(check('git push origin $BRANCH'), /cannot tell which branches/);
  assert.match(check('"$GIT" push origin main'), /cannot tell which branches/);
  for (const command of [
    'git commit -m "git push origin main later"', 'echo git push origin main', 'git log --oneline # git push origin main',
    "git commit -F - <<'EOF'\nFixed (it\ngit push origin main\nEOF", 'git status', 'ls -la', 'git -C',
  ]) assert.equal(check(command), null, command);
});

test('PowerShell commands are read in PowerShell syntax', (t) => {
  const { check, posix, root } = fixture(t);
  const ps = { tool: 'PowerShell' };
  assert.match(check('git push origin main', ps), /protected branch `main`/);
  assert.match(check('& git push origin develop 2>&1 | Out-String', ps), /protected branch `develop`/);
  assert.match(check(`Set-Location '${posix}'; git push origin main`, { ...ps, cwd: root }), /protected/);
  assert.equal(check(`Set-Location -Path '${posix}'; git push origin feature/x`, { ...ps, cwd: root }), null);
  assert.match(check('pwsh -NoProfile -Command "git push origin main"'), /protected/);
  const encoded = Buffer.from('git push origin main', 'utf16le').toString('base64');
  assert.match(check(`powershell -NoProfile -EncodedCommand ${encoded}`), /protected/);
  assert.equal(check("git commit -m 'it''s git push origin main'", ps), null);
});

test('with direct_lane set, a push to a protected branch passes only when every changed path matches', (t) => {
  const { check, git, write } = fixture(t, { protected_branches: 'main, develop, queue', integration_branch: 'develop', direct_lane: 'docs/**, *.md' });
  git('switch', '-q', 'develop');
  write('docs/queue/item.md', 'item\n');
  git('add', 'docs/queue/item.md');
  git('commit', '-q', '-m', 'queue item');
  assert.equal(check('git push origin develop'), null);
  write('src/app.js', 'changed\n');
  git('add', 'src/app.js');
  git('commit', '-q', '-m', 'code');
  assert.match(check('git push origin develop'), /outside profile `direct_lane` \(`src\/app\.js`\)/);
  git('reset', '-q', '--hard', 'HEAD~1');
  assert.match(check('git push origin HEAD:queue'), /outside profile `direct_lane`/, 'a branch the remote lacks is judged on the whole tree');
  assert.match(check('git push origin :develop'), /delete the protected branch `develop`/);
});

test('without a profile the default branch comes from the remote HEAD and an existing develop is the integration branch, and other tools are ignored', (t) => {
  const { check, dir, git } = fixture(t);
  rmSync(join(dir, 'intelligence'), { recursive: true, force: true });
  assert.match(check('git push origin main'), /protected branch `main`/);
  assert.match(check('git push origin develop'), /protected branch `develop`/);
  git('update-ref', '-d', 'refs/remotes/origin/develop');
  assert.equal(check('git push origin develop'), null);
  git('push', '-q', 'origin', 'main:trunk');
  assert.equal(check('git push origin trunk'), null);
  git('symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/trunk');
  assert.match(check('git push origin trunk'), /protected branch `trunk`/);
  assert.match(check('git push origin main'), /protected branch `main`/, "the schema's protected_branches default still holds");
  assert.equal(decide({ tool_name: 'Write', tool_input: { file_path: 'x', content: 'git push origin main' } }), null);
  assert.equal(decide({ tool_name: 'Bash', tool_input: {} }), null);
});

test('a push that carries a tag profile tag_format describes asks the owner, in every spelling, and a deny still wins', (t) => {
  const { check, git } = fixture(t);
  git('tag', '-a', 'v1.2.0', '-m', 'release');
  git('tag', 'v1.3.0-rc.1');
  for (const command of [
    'git push origin v1.2.0', 'git push origin tag v1.2.0', 'git push origin refs/tags/v1.2.0', 'git push origin HEAD:refs/tags/v1.4.0',
    'git push origin v1.3.0-rc.1', 'git push --tags', 'git push origin "refs/tags/*:refs/tags/*"', 'git push origin --delete v1.2.0',
    'git push origin :refs/tags/v1.2.0', 'git push --follow-tags origin feature/x',
  ]) assert.match(check(command) ?? '', /^ask: .*`v1\.[234]\.0(-rc\.1)?`.*profile `tag_format` \(`vX\.Y\.Z`\)/, command);
  assert.match(check('git push --tags'), /`v1\.2\.0`, `v1\.3\.0-rc\.1`/);
  assert.match(check('git push origin main v1.2.0'), /^Push guard \(dev-init\): this push would update the protected branch `main`/);
  assert.match(check('git push origin v1.2.0', { tool: 'PowerShell' }), /^ask: /);
  for (const command of ['git push origin v1.0', 'git push origin tag v1.0', 'git push origin feature/x', 'git push --dry-run origin v1.2.0']) {
    assert.equal(check(command), null, command);
  }
  git('commit', '-q', '--allow-empty', '-m', 'after the release');
  assert.equal(check('git push --follow-tags origin feature/x'), null, 'a tag on a commit the remote already has and the push does not end on');
  git('tag', '-a', 'v1.5.0', '-m', 'release');
  assert.match(check('git push --follow-tags origin feature/x'), /^ask: .*`v1\.5\.0`/);
  git('config', 'push.followTags', 'true');
  assert.match(check('git push'), /^ask: .*`v1\.5\.0`/);
  assert.equal(check('git push --no-follow-tags'), null);
});

test('tag_format decides which tags are release tags, and none turns the ask off', (t) => {
  const { check, git } = fixture(t, { protected_branches: 'main', tag_format: 'release-X.Y' });
  git('tag', 'release-2.1');
  git('tag', 'v1.2.0');
  assert.match(check('git push origin release-2.1'), /^ask: .*`release-2\.1`/);
  assert.equal(check('git push origin v1.2.0'), null);
  const off = fixture(t, { protected_branches: 'main', tag_format: 'none' });
  off.git('tag', 'v1.2.0');
  assert.equal(off.check('git push origin v1.2.0'), null);
  assert.equal(off.check('git push --tags'), null);
});

test('tagPattern reads X, Y and Z as numbers and allows a pre-release or build suffix', () => {
  assert.equal(tagPattern('vX.Y.Z').test('v10.0.3'), true);
  assert.equal(tagPattern('vX.Y.Z').test('v1.2.0-rc.1'), true);
  assert.equal(tagPattern('vX.Y.Z').test('v1.2.0+build.5'), true);
  assert.equal(tagPattern('vX.Y.Z').test('v1.2'), false);
  assert.equal(tagPattern('vX.Y.Z').test('xv1.2.0'), false);
  assert.equal(tagPattern('X.Y.Z').test('1.2.3'), true);
  assert.equal(tagPattern('none'), null);
  assert.equal(tagPattern(''), null);
});

test('direct_lane matches gitignore-style patterns', () => {
  const lane = compileLane('docs/**, *.md, /queue/, !docs/private/**, \\!bang.txt');
  for (const path of ['docs/a/b.txt', 'README.md', 'src/x/notes.md', 'queue/item.json', '!bang.txt']) assert.equal(lane.matches(path), true, path);
  for (const path of ['src/app.js', 'docs/private/key.txt', 'sub/queue/item.json', 'queue']) assert.equal(lane.matches(path), false, path);
  assert.equal(compileLane('**/fixtures').matches('fixtures/a.json'), true);
  assert.equal(compileLane('**/fixtures').matches('test/fixtures/a.json'), true);
  assert.equal(compileLane('docs/*.md').matches('docs/a/b.md'), false);
  assert.equal(compileLane('none').empty, true);
  assert.equal(compileLane('none').matches('anything'), false);
});

test('the parser finds every push and nothing else', () => {
  const args = (command, dialect = 'bash') => findPushes(command, dialect, process.cwd()).pushes.map((p) => p.args.join(' '));
  assert.deepEqual(args('git status && git push -u origin x; git push origin y\ngit push'), ['-u origin x', 'origin y', '']);
  assert.deepEqual(args('A=1 B=2 git --no-pager -c push.default=current push'), ['']);
  assert.deepEqual(args('git commit -m "$(cat <<\'EOF\'\nmessage git push origin main\nEOF\n)" && git push'), ['']);
  assert.deepEqual(args("$env:X = '1'; git push origin x", 'pwsh'), ['origin x']);
  assert.deepEqual(args('git log | grep push'), []);
});

test('the hook prints a PreToolUse deny on stdout and nothing for a command it lets through', (t) => {
  const { dir, env, git } = fixture(t);
  const hook = (input) => spawnSync(process.execPath, [GUARD], { input, env, encoding: 'utf8' });
  const denied = hook(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git push origin main' }, cwd: dir }));
  assert.equal(denied.status, 0);
  const out = JSON.parse(denied.stdout).hookSpecificOutput;
  assert.equal(out.hookEventName, 'PreToolUse');
  assert.equal(out.permissionDecision, 'deny');
  assert.match(out.permissionDecisionReason, /protected branch `main`/);
  const passed = hook(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git push origin feature/x' }, cwd: dir }));
  assert.equal(passed.status, 0);
  assert.equal(passed.stdout, '');
  git('tag', 'v1.2.0');
  const asked = hook(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git push origin v1.2.0' }, cwd: dir }));
  assert.equal(asked.status, 0);
  assert.equal(JSON.parse(asked.stdout).hookSpecificOutput.permissionDecision, 'ask');
  const garbage = hook('not json');
  assert.equal(garbage.status, 0);
  assert.equal(garbage.stdout, '');
});
