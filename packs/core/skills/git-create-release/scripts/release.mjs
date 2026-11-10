#!/usr/bin/env node
// `git-create-release` steps 7-8: tags a commit already on the release target, pushes the tag and
// publishes the release object. The cut - version, changelog, landing it - is the skill's earlier
// steps; this script only publishes what landed. Node, git and gh only, with no shell, so it runs
// the same on Linux, macOS and Windows.
//
//   node release.mjs [X.Y.Z | tag] [--tag <tag>] [--version X.Y.Z] [--commit <sha>] [--branch <name>]
//                    [--artifact github-release|github-release-draft|tag-only]
//                    [--notes changelog-section|generated|none] [--notes-file <path>] [--dry-run]
//
// X.Y.Z      a bare version, released as tag `vX.Y.Z` (profile `tag_format` default); with no
//            argument, the newest `## [X.Y.Z]` section of CHANGELOG.md at the commit.
// tag        anything else is the tag itself, for another `tag_format`; `--tag` names one that
//            looks like a bare version, such as `1.2.3` under `tag_format: X.Y.Z`.
// --version  the changelog section to read; default: the `X.Y.Z[-pre]` the tag ends with.
// --branch   the release target (profile `default_branch`); default: origin's HEAD branch.
// --commit   default: the target's tip on origin; it must be reachable from it.
// --artifact profile `release_artifact`; --notes profile `release_notes`; --notes-file is a body
//            the skill assembled (`changelog: assembled`).
//
// It stops before tagging when the commit is not on the target, the changelog section the notes
// need is missing, the tag names another commit, or a check run or commit status on the commit
// failed; it waits while checks run. A skipped or neutral check passes. A version with a
// pre-release suffix (`-rc.1`) is published as a prerelease. Run again after a partial failure, it
// pushes the tag it made and creates the release still missing.
//
// Exit codes: 0 released (or, with --dry-run, would release); 1 stopped, with the reason.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const FAILED = new Set(['failure', 'startup_failure', 'cancelled', 'timed_out', 'stale', 'action_required']);
const ARTIFACTS = ['github-release', 'github-release-draft', 'tag-only'];
const NOTES = ['changelog-section', 'generated', 'none'];
const VERSION = /(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/;
const WAIT_MS = 15_000;
const WAIT_ROUNDS = 60;

// The sections of a Keep a Changelog file, newest first: version, body, and its headline - the
// first paragraph before any `###` heading. `## [X.Y.Z] - date` and `## [X.Y.Z]` both count.
export function sections(changelog) {
  const out = [];
  let current = null;
  for (const line of changelog.replace(/\r\n/g, '\n').split('\n')) {
    const head = line.match(/^## \[(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\]/);
    if (head || /^## /.test(line)) {
      if (current) out.push(current);
      current = head ? { version: head[1], lines: [] } : null;
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) out.push(current);
  return out.map(({ version, lines }) => {
    const body = lines.join('\n').trim();
    const first = (body.split(/\n\s*\n/)[0] ?? '').trim();
    return { version, body, headline: first.startsWith('#') || first.startsWith('-') ? '' : first.replace(/\s+/g, ' ') };
  });
}

// The release title: the tag, and the headline without its closing period.
export function title(tag, headline) {
  if (!headline) return tag;
  return `${tag} - ${headline.replace(/\.$/, '').trim()}`;
}

// Check runs and commit statuses of one commit sorted into the ones that failed and the ones
// still running; a status context's `state` is `success`, `pending`, `failure` or `error`.
export function sortChecks(runs, statuses = []) {
  const failed = [];
  const running = [];
  for (const run of runs) {
    if (run.status !== 'completed') running.push(run.name);
    else if (FAILED.has(String(run.conclusion).toLowerCase())) failed.push(`${run.name} (${run.conclusion})`);
  }
  for (const status of statuses) {
    if (status.state === 'pending') running.push(status.context);
    else if (status.state === 'failure' || status.state === 'error') failed.push(`${status.context} (${status.state})`);
  }
  return { failed, running };
}

// The commit a tag names in `git ls-remote --tags` output: the peeled `^{}` line of an annotated
// tag, else the tag's own line; empty when the remote has no such tag.
export function remoteTagCommit(lsRemote, tag) {
  const refs = new Map(lsRemote.split('\n').filter(Boolean).map((line) => line.split(/\s+/).reverse()));
  return refs.get(`refs/tags/${tag}^{}`) ?? refs.get(`refs/tags/${tag}`) ?? '';
}

// One JSON value per non-empty line, as `gh api --paginate --jq` prints them across pages.
export function jsonLines(text) {
  return text.split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line));
}

const stop = (reason) => {
  throw new Error(reason);
};

export function parseArgs(argv) {
  const opts = { tag: null, version: null, commit: null, branch: null, artifact: 'github-release', notes: 'changelog-section', notesFile: null, dryRun: false };
  const value = (i, flag) => {
    const v = argv[i];
    if (!v || v.startsWith('--')) stop(`${flag} needs a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--commit') opts.commit = value(++i, arg);
    else if (arg === '--branch') opts.branch = value(++i, arg);
    else if (arg === '--version') opts.version = value(++i, arg).replace(/^v/, '');
    else if (arg === '--tag') {
      if (opts.tag) stop(`a second tag: ${argv[i + 1]}`);
      opts.tag = value(++i, arg);
    }
    else if (arg === '--notes-file') opts.notesFile = value(++i, arg);
    else if (arg === '--artifact') {
      opts.artifact = value(++i, arg);
      if (!ARTIFACTS.includes(opts.artifact)) stop(`--artifact is one of ${ARTIFACTS.join(', ')}`);
    } else if (arg === '--notes') {
      opts.notes = value(++i, arg);
      if (!NOTES.includes(opts.notes)) stop(`--notes is one of ${NOTES.join(', ')}`);
    } else if (arg.startsWith('--')) stop(`unknown argument: ${arg}`);
    else if (opts.tag) stop(`a second tag: ${arg}`);
    else if (/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(arg)) {
      opts.tag = `v${arg}`;
      opts.version ??= arg;
    } else opts.tag = arg;
  }
  return opts;
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

async function main(argv) {
  const opts = parseArgs(argv);
  if (opts.notesFile && !existsSync(opts.notesFile)) stop(`--notes-file ${opts.notesFile} does not exist`);

  const branch = opts.branch ?? git('symbolic-ref', '--short', 'refs/remotes/origin/HEAD').out.replace(/^origin\//, '');
  git('fetch', '--quiet', 'origin', branch, '--tags');
  const commit = git('rev-parse', `${opts.commit ?? `origin/${branch}`}^{commit}`).out;
  if (run('git', ['merge-base', '--is-ancestor', commit, `origin/${branch}`], { allowFail: true }).code !== 0) {
    stop(`${commit.slice(0, 7)} is not on origin/${branch}`);
  }

  const changelog = run('git', ['show', `${commit}:CHANGELOG.md`], { allowFail: true });
  const all = changelog.code === 0 ? sections(changelog.out) : [];
  const version = opts.version ?? opts.tag?.match(VERSION)?.[1] ?? (opts.tag ? null : all[0]?.version);
  if (!opts.tag && !version) stop(`name the tag: CHANGELOG.md at ${commit.slice(0, 7)} has no ## [X.Y.Z] section to take it from`);
  const tag = opts.tag ?? `v${version}`;
  const section = version ? all.find((s) => s.version === version) : null;
  if (opts.artifact !== 'tag-only' && !opts.notesFile && opts.notes === 'changelog-section') {
    if (!section) stop(`CHANGELOG.md at ${commit.slice(0, 7)} has no ## [${version ?? 'X.Y.Z'}] section for the notes; pass --notes-file or --notes`);
    if (!section.body) stop(`the [${version}] section is empty`);
  }
  const headline = section?.headline ?? '';
  const prerelease = Boolean(version && version.includes('-'));

  // A tag from an earlier run is resumed only when it names this commit.
  const localTag = git('tag', '--list', tag).out ? git('rev-parse', `${tag}^{commit}`).out : '';
  const remoteTag = remoteTagCommit(git('ls-remote', '--tags', 'origin').out, tag);
  if (localTag && localTag !== commit) stop(`${tag} already exists locally on ${localTag.slice(0, 7)}, not ${commit.slice(0, 7)}`);
  if (remoteTag && remoteTag !== commit) stop(`${tag} already exists on origin on ${remoteTag.slice(0, 7)}, not ${commit.slice(0, 7)}`);
  if (remoteTag && opts.artifact === 'tag-only') stop(`${tag} is already pushed`);
  if (remoteTag) {
    const released = run('gh', ['release', 'view', tag, '--json', 'url', '--jq', '.url'], { allowFail: true });
    if (released.code === 0) stop(`${tag} is already released: ${released.out}`);
  }

  const repo = run('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']).out;
  // Every page, one JSON object per line, so a failure past the first page is still read.
  const pages = (path, jq) => jsonLines(run('gh', ['api', '--paginate', `repos/${repo}/commits/${commit}/${path}?per_page=100`, '--jq', jq]).out);
  for (let round = 0; ; round++) {
    const runs = pages('check-runs', '.check_runs[] | {name, status, conclusion}');
    const statuses = pages('status', '.statuses[] | {context, state}');
    const { failed, running } = sortChecks(runs, statuses);
    if (failed.length) stop(`checks failed on ${commit.slice(0, 7)}: ${failed.join(', ')}`);
    if (!running.length) break;
    if (round >= WAIT_ROUNDS) stop(`checks still running on ${commit.slice(0, 7)}: ${running.join(', ')}`);
    console.log(`waiting for ${running.join(', ')}`);
    await new Promise((r) => setTimeout(r, WAIT_MS));
  }

  const releaseTitle = title(tag, headline);
  const kind = opts.artifact === 'tag-only' ? 'tag only' : `${opts.artifact}${prerelease ? ', prerelease' : ''}`;
  console.log(`release ${tag} at ${commit.slice(0, 7)} on ${branch} (${kind}): ${releaseTitle}`);
  if (opts.dryRun) {
    console.log('dry run: nothing tagged, pushed or published');
    return;
  }

  if (!localTag && !remoteTag) git('tag', '-a', tag, commit, '-m', headline ? `${version ?? tag} - ${headline}` : tag);
  if (!remoteTag) git('push', 'origin', `refs/tags/${tag}`);
  if (opts.artifact === 'tag-only') {
    console.log(`released ${tag} (tag only)`);
    return;
  }

  const dir = mkdtempSync(join(tmpdir(), 'release-'));
  try {
    const args = ['release', 'create', tag, '--verify-tag', '--title', releaseTitle];
    if (opts.notesFile) args.push('--notes-file', opts.notesFile);
    else if (opts.notes === 'generated') args.push('--generate-notes');
    else if (opts.notes === 'none') args.push('--notes', '');
    else {
      const notes = join(dir, 'notes.md');
      writeFileSync(notes, `${section.body}\n`);
      args.push('--notes-file', notes);
    }
    if (opts.artifact === 'github-release-draft') args.push('--draft');
    if (prerelease) args.push('--prerelease');
    console.log(`released ${run('gh', args).out}`);
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
