// Checks the template's Bash deny rules and dev-init's protected-branch push forms against a
// SIMULATION of the matcher Claude Code documents (code.claude.com/docs/en/permissions: "Wildcard
// patterns", "Compound commands", "Wrappers"). It shows what each rule shape matches under the
// documented semantics, not what a given Claude Code release does. Not simulated: the stripped
// process wrappers, commands nested in subshells or substitutions, and redirections.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const templates = join(here, '..', '..', '..', 'templates');
const settings = JSON.parse(readFileSync(join(templates, 'claude-settings.json'), 'utf8'));
const profile = readFileSync(join(templates, 'dev-project-profile.md'), 'utf8');
const skill = readFileSync(join(here, '..', 'SKILL.md'), 'utf8');

// `*` matches any text, spaces included; everything else is literal and the whole command must
// match. A trailing ` *` (or its equivalent `:*`) that is the rule's only wildcard also matches
// the bare command.
function ruleMatches(pattern, command) {
  let p = pattern.endsWith(':*') ? `${pattern.slice(0, -2)} *` : pattern;
  const bareToo = p.endsWith(' *') && p.indexOf('*') === p.length - 1;
  if (bareToo) p = p.slice(0, -2);
  const body = p.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\S]*');
  return new RegExp(`^${body}${bareToo ? '(?: [\\s\\S]*)?' : ''}$`).test(command);
}

// Splits on && || ; | |& & and newlines outside quotes, then drops leading variable assignments,
// which a deny rule matches past.
function subcommands(command) {
  const parts = [];
  let current = '';
  let quote = null;
  for (let i = 0; i < command.length; i += 1) {
    const c = command[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (';\n|&'.includes(c) && !(c === '&' && (command[i - 1] === '>' || command[i + 1] === '>'))) {
      parts.push(current);
      current = '';
      continue;
    }
    current += c;
  }
  parts.push(current);
  return parts.map((s) => s.trim().replace(/^(?:[A-Za-z_]\w*=\S*\s+)+/, '')).filter(Boolean);
}

const bashRules = (rules) => rules.filter((r) => r.startsWith('Bash(')).map((r) => r.slice(5, -1));
const denied = (rules, command) => subcommands(command).some((sub) => rules.some((r) => ruleMatches(r, sub)));
const templateDeny = bashRules(settings.permissions.deny);
const pushForms = [...skill.matchAll(/`Bash\((git push [^`]*<branch>[^`]*)\)`/g)].map((m) => m[1]);
const protectedDeny = (branch) => pushForms.map((f) => f.replaceAll('<branch>', branch));

test('the simulation reproduces the documented examples', () => {
  const rows = [
    ['npm run build', 'npm run build', true], ['npm run build', 'npm run build --watch', false],
    ['npm run *', 'npm run test --watch', true], ['npm run *', 'npm run', true], ['npm run *', 'npm install', false],
    ['git log * main', 'git log --oneline main', true], ['git log * main', 'git log main', false],
    ['* --version', 'node --version', true], ['* --version', 'node -v', false],
    ['ls *', 'ls', true], ['ls *', 'lsof', false], ['ls*', 'lsof', true], ['ls:*', 'ls -la', true],
    ['* --help *', 'npm --help x', true], ['* --help *', 'npm --help', false],
  ];
  for (const [rule, command, expected] of rows) assert.equal(ruleMatches(rule, command), expected, `${rule} vs ${command}`);
  assert.equal(denied(['rm *'], 'FOO=bar rm -rf tmp/'), true);
  assert.equal(denied(['git clean *'], 'cd sub && git clean -f'), true);
});

test('the template denies every spelling of a forbidden command', () => {
  for (const command of [
    'git push --force origin feature/x', 'git push origin feature/x --force', 'git push --force-with-lease=origin/x origin x',
    'git push -f origin x', 'git push -fu origin x', 'git push origin x -f', 'git push origin +x',
    'git commit --no-verify -m "x"', 'git commit -m "x" --no-verify', 'git commit -n -m "x"', 'git commit -nm "x"', 'git commit -m "x" -n',
    'git add -A', 'git add --all src', 'git add .',
    'git reset --hard', 'git reset HEAD~1 --hard', 'git clean -fd', 'git clean -d -f',
    'git checkout -- src/a.js', 'git checkout HEAD -- src/a.js', 'git restore src/a.js', 'git stash', 'git stash push -m "x"',
    'git status && git push --force origin x', 'FOO=1 git clean -xfd',
  ]) assert.equal(denied(templateDeny, command), true, command);
});

test('the template lets ordinary work through', () => {
  for (const command of [
    'git push origin feature/x', 'git push -u origin feature/x', 'git push --follow-tags origin feature/x', 'git push origin v1.2.0',
    'git commit -m "Fixed the tenant filter"', 'git commit -F .tmp/message.txt', 'git commit --amend --no-edit',
    'git add src/a.js', 'git add .gitattributes', 'git add ./src/a.js', 'git reset HEAD src/a.js',
    'git checkout -b feature/x', 'git checkout feature/x', 'git status', 'git diff --cached 2>&1',
  ]) assert.equal(denied(templateDeny, command), false, command);
});

test('the harmless denials dev-init reports are the ones the rules make', () => {
  for (const command of ['git clean -n', 'git stash list', 'git restore --staged src/a.js', 'git commit -m "Handle the -n flag"']) {
    assert.equal(denied(templateDeny, command), true, command);
  }
  for (const named of ['`git clean -n`', '`git stash list`', '`git restore --staged`']) assert.ok(skill.includes(named), named);
});

test('the protected-branch forms deny every refspec that lands on the branch', () => {
  assert.equal(pushForms.length, 8);
  const rules = protectedDeny('main');
  for (const command of [
    'git push origin main', 'git push -u origin main', 'git push origin main --tags', 'git push origin HEAD:main',
    'git push origin feature/x:main', 'git push origin HEAD:refs/heads/main', 'git push origin refs/heads/main',
    'git push origin feature/x:refs/heads/main --no-verify', 'git push origin :main', 'git push origin --delete main',
  ]) assert.equal(denied(rules, command), true, command);
  for (const command of [
    'git push origin feature/main', 'git push origin main-fix', 'git push origin feature/x:feature/main', 'git push origin v1.2.0',
    // No text rule sees the branch here; the forge's protection is the boundary.
    'git push',
  ]) assert.equal(denied(rules, command), false, command);
});

test('the template sets attribution off and denies reading the default secrets file', () => {
  assert.deepEqual(settings.attribution, { commit: '', pr: '', sessionUrl: false });
  const secretsFile = profile.match(/^- secrets_file: (\S+)/m)?.[1];
  assert.ok(secretsFile, 'secrets_file is in the profile schema');
  assert.ok(settings.permissions.deny.includes(`Read(${secretsFile})`), `Read(${secretsFile}) is denied`);
});
