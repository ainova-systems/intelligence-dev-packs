#!/usr/bin/env node
// A stack-neutral gate runner for dev-verification-gates. The project owns the gate table; this
// file owns the change, the order, the stop at the first failure and the report.
//
//   node verify-runner.mjs --gates <table.mjs> [--base <ref>] [--all | --gate <name>] [--dry-run] [--ci]
//
// The change is everything between the merge-base with the base and the working tree: committed,
// staged, unstaged and untracked paths, deletions and both sides of a rename. The base is --base,
// else VERIFY_BASE, else origin/HEAD. Gates run from the repository root.
//
// The table module's default export is an array of gates:
//   name        unique; --gate <name> runs this one alone
//   cost        cheapest first; equal costs keep table order
//   when        (path) => boolean, over repo-relative POSIX paths, deleted ones included
//   command     argv, or (hits, ctx) => argv, where hits are the paths `when` matched and ctx
//               holds base, mergeBase, paths and ci; an empty argv means nothing to check
//   describe    optional, printed when the gate starts
//   needs       optional runtime { name, env, find, missing }, resolved just before the first gate
//               that needs it. The variable `env`, when set, is a command prefix (words split on
//               spaces) the gate runs through. Otherwise find() returns a prefix ([] runs here) or
//               null, and null fails the gate with `missing`. Under --ci find() is not called and a
//               gate whose variable is unset is not run, while the gates after it still run.
//   outputs     optional committed files the command regenerates; a run that changes one fails as
//               out of step, line endings ignored
//   exitMasked  optional, with outputs: a zero exit proves nothing, so the run must rewrite each one
//
// Exit codes: 0 every planned gate ran and passed, or none applies, or --dry-run; 1 a gate failed; 2 refused (the change could
// not be read, or a bad argument, gate or table); 3 only under --ci: the gates that ran passed and
// some were not run for want of a runtime.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { delimiter, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function git(args, cwd) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (res.status === 0) return res.stdout;
  const why = (res.stderr || res.error?.message || '').trim().split('\n')[0];
  throw new Error(why || `git ${args[0]} exited ${res.status}`);
}

export function changedPaths(base, cwd) {
  const mergeBase = git(['merge-base', base, 'HEAD'], cwd).trim();
  if (!mergeBase) throw new Error(`no merge-base between ${base} and HEAD`);
  const tracked = git(['diff', '--name-only', '--no-renames', '--no-ext-diff', '-z', mergeBase, '--'], cwd);
  const untracked = git(['ls-files', '--others', '--exclude-standard', '-z'], cwd);
  return { mergeBase, paths: [...new Set(`${tracked}\0${untracked}`.split('\0').filter(Boolean))].sort() };
}

export function tableProblem(gates) {
  if (!Array.isArray(gates) || !gates.length) return 'the default export is not a non-empty array of gates';
  const seen = new Set();
  for (const [i, g] of gates.entries()) {
    if (typeof g?.name !== 'string' || !g.name) return `gate ${i + 1} has no name`;
    if (seen.has(g.name)) return `${g.name} is named twice`;
    seen.add(g.name);
    if (!Number.isFinite(g.cost)) return `${g.name} has no numeric cost`;
    if (typeof g.when !== 'function') return `${g.name} has no when(path)`;
    if (typeof g.command !== 'function' && !Array.isArray(g.command)) return `${g.name} has no command`;
    if (g.needs && !(g.needs.name && g.needs.env)) return `${g.name} needs a runtime without a name and an env variable`;
    if (g.exitMasked && !g.outputs?.length) return `${g.name} is exitMasked with no outputs to check`;
  }
  return null;
}

export function planGates(gates, paths, { all = false, only = null } = {}) {
  const run = [];
  const skipped = [];
  for (const gate of [...gates].sort((a, b) => a.cost - b.cost)) {
    const hits = paths.filter((p) => gate.when(p));
    if (only ? gate.name === only : all || hits.length) run.push({ gate, hits });
    else skipped.push(gate.name);
  }
  return { run, skipped };
}

// Windows starts a .cmd or .bat shim (npm, npx, many CLIs) only through cmd.exe.
function needsShell(file, cwd) {
  if (process.platform !== 'win32') return false;
  if (extname(file)) return /^\.(cmd|bat)$/i.test(extname(file));
  const exts = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean);
  const dirs = /[\\/]/.test(file) ? [cwd] : [cwd, ...(process.env.PATH || '').split(delimiter).filter(Boolean)];
  for (const dir of dirs) {
    for (const ext of exts) if (existsSync(resolve(dir, file + ext))) return /^\.(cmd|bat)$/i.test(ext);
  }
  return false;
}

function quoteForCmd(arg) {
  if (/^[\w@+=:,./\\-]+$/.test(arg)) return arg;
  return `"${arg.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1')}"`;
}

function execute([file, ...args], cwd) {
  const options = { cwd, stdio: 'inherit' };
  const res = needsShell(file, cwd)
    ? spawnSync([file, ...args].map(quoteForCmd).join(' '), { ...options, shell: true })
    : spawnSync(file, args, options);
  if (res.error) return `${file} did not start (${res.error.code ?? res.error.message})`;
  return res.status === 0 ? null : `exited ${res.status ?? res.signal} (output above)`;
}

function snapshot(cwd, files) {
  return files.map((file) => {
    const p = join(cwd, file);
    if (!existsSync(p)) return { file, text: null, mtime: 0 };
    return { file, text: readFileSync(p).toString('latin1').replace(/\r\n/g, '\n'), mtime: statSync(p).mtimeMs };
  });
}

function outputsProblem(gate, before, after) {
  if (gate.exitMasked) {
    const unwritten = after.filter((a, i) => a.text === null || !(a.mtime > before[i].mtime)).map((a) => a.file);
    if (unwritten.length) return `exited 0 without writing ${unwritten.join(', ')}, and its exit code proves nothing; run it and read its output`;
  }
  const moved = after.filter((a, i) => a.text !== before[i].text).map((a) => a.file);
  return moved.length ? `regenerated ${moved.join(', ')}, which were out of step with their sources; review and stage them` : null;
}

async function findRuntime(need, ci) {
  const custom = process.env[need.env]?.trim();
  if (custom) return custom.split(/\s+/);
  if (ci || !need.find) return null;
  const prefix = await need.find();
  return Array.isArray(prefix) ? prefix : null;
}

const list = (names) => names.join(', ') || 'none';
const refuse = (message) => {
  console.error(`verify: ${message}`);
  return 2;
};

export async function main(argv) {
  if (Number(process.versions.node.split('.')[0]) < 22) return refuse(`Node.js 22 or newer is required (this is ${process.versions.node})`);
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (['--gates', '--base', '--gate'].includes(arg)) {
      if (argv[i + 1] === undefined || argv[i + 1].startsWith('--')) return refuse(`${arg} needs a value`);
      opts[arg] = argv[(i += 1)];
    } else if (['--all', '--dry-run', '--ci'].includes(arg)) opts[arg] = true;
    else return refuse(`unknown argument ${arg}`);
  }
  if (!opts['--gates']) return refuse('name the project\'s gate table with --gates <file>');
  let gates;
  try {
    gates = (await import(pathToFileURL(resolve(opts['--gates'])).href)).default;
  } catch (error) {
    return refuse(`cannot load the gate table ${opts['--gates']} (${error.message.split('\n')[0]})`);
  }
  const problem = tableProblem(gates);
  if (problem) return refuse(`gate table ${opts['--gates']}: ${problem}`);
  const only = opts['--gate'] ?? null;
  if (only && !gates.some((g) => g.name === only)) return refuse(`unknown gate ${only}; gates are ${list(gates.map((g) => g.name))}`);

  const base = opts['--base'] ?? (process.env.VERIFY_BASE || 'origin/HEAD');
  let top;
  let change;
  try {
    top = git(['rev-parse', '--show-toplevel'], process.cwd()).trim();
    change = changedPaths(base, top);
  } catch (error) {
    return refuse(`cannot read the change against ${base} (${error.message}); fetch the base with its history, or pass --base`);
  }
  const ci = Boolean(opts['--ci']);
  const { run, skipped } = planGates(gates, change.paths, { all: Boolean(opts['--all']), only });
  console.log(`verify: ${change.paths.length} changed paths against ${base}`);
  console.log(`  plan: ${list(run.map((r) => r.gate.name))}`);
  console.log(`  not run: ${list(skipped)}`);
  if (opts['--dry-run']) return 0;

  const ctx = { base, mergeBase: change.mergeBase, paths: change.paths, ci };
  const runtimes = new Map();
  const ran = [];
  const noRuntime = [];
  for (const [i, { gate, hits }] of run.entries()) {
    const fail = (why) => {
      console.error(`\nverify: FAIL at ${gate.name} - ${why}`);
      console.error(`  not reached: ${list(run.slice(i + 1).map((r) => r.gate.name))}; not run: ${list([...noRuntime, ...skipped])}`);
      return 1;
    };
    let prefix = [];
    if (gate.needs) {
      const { name, env, missing } = gate.needs;
      if (!runtimes.has(name)) {
        runtimes.set(name, await findRuntime(gate.needs, ci));
        if (runtimes.get(name)) console.log(`\n${name} runs ${runtimes.get(name).length ? `through ${runtimes.get(name).join(' ')}` : 'here'}`);
      }
      prefix = runtimes.get(name);
      if (!prefix && ci) {
        noRuntime.push(`${gate.name} (set ${env})`);
        console.log(`\n== ${gate.name}: not run, no ${name} (set ${env})`);
        continue;
      }
      if (!prefix) return fail(`needs ${name}: ${missing ?? `set ${env} to a command prefix that provides it`}`);
    }
    console.log(`\n== ${gate.name}${gate.describe ? `: ${gate.describe}` : ''}`);
    const command = typeof gate.command === 'function' ? await gate.command(hits, ctx) : gate.command;
    if (!Array.isArray(command)) return fail('its command function returned no argv array');
    if (command.length) {
      const before = snapshot(top, gate.outputs ?? []);
      const failure = execute([...prefix, ...command], top) ?? outputsProblem(gate, before, snapshot(top, gate.outputs ?? []));
      if (failure) return fail(failure);
    }
    ran.push(gate.name);
    console.log(`${gate.name}: ok`);
  }
  if (noRuntime.length) {
    console.log(`\nverify: INCOMPLETE - passed: ${list(ran)}; not run for want of a runtime: ${noRuntime.join(', ')}; not run: ${list(skipped)}`);
    return 3;
  }
  if (!run.length) console.log(`\nverify: no gate applies to this change; not run: ${list(skipped)}`);
  else console.log(`\nverify: PASS (${list(ran)}; not run: ${list(skipped)})`);
  return 0;
}

const entry = (() => {
  try {
    return pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return null;
  }
})();
if (entry === import.meta.url) process.exitCode = await main(process.argv.slice(2));
