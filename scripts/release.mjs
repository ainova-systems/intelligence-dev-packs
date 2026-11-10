#!/usr/bin/env node
// Publishes a release whose changelog section has already landed on main: checks the commit,
// tags it `vX.Y.Z` (annotated, message `X.Y.Z - <headline>`), pushes the tag and creates the
// GitHub release from the section. Cutting the section is the release pull request's job
// (CONTRIBUTING.md > Releases); this script does the steps after it merged.
//
//   node scripts/release.mjs [X.Y.Z] [--commit <sha>] [--dry-run]
//
// The version defaults to the newest `## [X.Y.Z]` section in CHANGELOG.md at the commit, and the
// commit to origin/main. It stops before tagging when the checkout is not a clean main equal to
// origin/main, the section is missing or empty, the tag already exists, or a check on the commit
// failed; it waits while checks are still running. A skipped or neutral check passes.
//
// Exit codes: 0 released (or, with --dry-run, would release); 1 stopped, with the reason.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const FAILED = new Set(['failure', 'startup_failure', 'cancelled', 'timed_out', 'stale', 'action_required']);
const WAIT_MS = 15_000;
const WAIT_ROUNDS = 60;

// The sections of a Keep a Changelog file, newest first: version, body, and its headline - the
// first paragraph before any `###` heading.
export function sections(changelog) {
  const out = [];
  const lines = changelog.replace(/\r\n/g, '\n').split('\n');
  let current = null;
  for (const line of lines) {
    const head = line.match(/^## \[(\d+\.\d+\.\d+)\]/);
    if (head || /^## /.test(line)) {
      if (current) out.push(current);
      current = head ? { version: head[1], lines: [] } : null;
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) out.push(current);
  return out.map(({ version, lines: body }) => {
    const text = body.join('\n').trim();
    const headline = (text.split(/\n\s*\n/)[0] ?? '').trim();
    return { version, body: text, headline: headline.startsWith('#') ? '' : headline.replace(/\s+/g, ' ') };
  });
}

// The release title: the tag and the headline's first clause, without its closing period.
export function title(version, headline) {
  const clause = headline.split(/,| and /)[0].replace(/\.$/, '').trim();
  return `v${version} - ${clause}`;
}

// Check runs of one commit sorted into the ones that failed and the ones still running.
export function sortChecks(runs) {
  const failed = [];
  const running = [];
  for (const run of runs) {
    if (run.status !== 'completed') running.push(run.name);
    else if (FAILED.has(String(run.conclusion).toLowerCase())) failed.push(`${run.name} (${run.conclusion})`);
  }
  return { failed, running };
}

function run(cmd, args, { allowFail = false } = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  if (res.error) throw new Error(`${cmd} could not run: ${res.error.message}`);
  if (res.status !== 0 && !allowFail) {
    throw new Error(`${cmd} ${args.join(' ')} exited ${res.status}\n${(res.stderr || res.stdout).trim()}`);
  }
  return { code: res.status, out: res.stdout.trim() };
}

const git = (...args) => run('git', args);
const stop = (reason) => {
  throw new Error(reason);
};

function parseArgs(argv) {
  const opts = { version: null, commit: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--commit') opts.commit = argv[++i] ?? stop('--commit needs a sha');
    else if (/^v?\d+\.\d+\.\d+$/.test(arg)) opts.version = arg.replace(/^v/, '');
    else stop(`unknown argument: ${arg}`);
  }
  return opts;
}

async function main(argv) {
  const opts = parseArgs(argv);

  if (git('branch', '--show-current').out !== 'main') stop('run it from main');
  if (git('status', '--porcelain').out) stop('the checkout has uncommitted changes');
  git('fetch', '--quiet', 'origin', 'main', '--tags');
  if (git('rev-parse', 'HEAD').out !== git('rev-parse', 'origin/main').out) stop('main is not equal to origin/main; pull first');

  const commit = git('rev-parse', opts.commit ?? 'origin/main').out;
  if (run('git', ['merge-base', '--is-ancestor', commit, 'origin/main'], { allowFail: true }).code !== 0) {
    stop(`${commit} is not on origin/main`);
  }

  const all = sections(git('show', `${commit}:CHANGELOG.md`).out);
  const section = opts.version ? all.find((s) => s.version === opts.version) : all[0];
  if (!section) stop(`CHANGELOG.md at ${commit.slice(0, 7)} has no ## [${opts.version ?? 'X.Y.Z'}] section`);
  if (!section.body) stop(`the [${section.version}] section is empty`);
  if (!section.headline) stop(`the [${section.version}] section has no one-line headline under its heading`);
  const tag = `v${section.version}`;

  if (git('tag', '--list', tag).out) stop(`${tag} already exists locally`);
  if (git('ls-remote', '--tags', 'origin', `refs/tags/${tag}`).out) stop(`${tag} already exists on origin`);

  const repo = run('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']).out;
  for (let round = 0; ; round++) {
    const runs = JSON.parse(
      run('gh', ['api', `repos/${repo}/commits/${commit}/check-runs`, '--paginate', '--jq', '[.check_runs[] | {name, status, conclusion}]']).out ||
        '[]',
    );
    const { failed, running } = sortChecks(runs);
    if (failed.length) stop(`checks failed on ${commit.slice(0, 7)}: ${failed.join(', ')}`);
    if (!running.length) break;
    if (round >= WAIT_ROUNDS) stop(`checks still running on ${commit.slice(0, 7)}: ${running.join(', ')}`);
    console.log(`waiting for ${running.join(', ')}`);
    await new Promise((r) => setTimeout(r, WAIT_MS));
  }

  const message = `${section.version} - ${section.headline}`;
  const releaseTitle = title(section.version, section.headline);
  console.log(`release ${tag} at ${commit.slice(0, 7)}: ${releaseTitle}`);
  if (opts.dryRun) {
    console.log('dry run: nothing tagged, pushed or published');
    return;
  }

  const dir = mkdtempSync(join(tmpdir(), 'release-'));
  try {
    const notes = join(dir, 'notes.md');
    writeFileSync(notes, `${section.body}\n`);
    git('tag', '-a', tag, commit, '-m', message);
    git('push', 'origin', `refs/tags/${tag}`);
    const url = run('gh', ['release', 'create', tag, '--verify-tag', '--title', releaseTitle, '--notes-file', notes]).out;
    console.log(`released ${url}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`release: STOP - ${err.message}`);
    process.exit(1);
  });
}
