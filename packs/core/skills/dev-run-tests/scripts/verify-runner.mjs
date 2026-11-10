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
//   command     argv, or (hits, ctx) => argv or { skip: '<reason>' }, where hits are the paths
//               `when` matched. ctx holds base, mergeBase, paths, ci, all (true under --all) and,
//               for a gate with `needs`, runtime: the prefix that runtime resolved to ([] when it
//               runs here). An empty argv means nothing to check: the gate prints
//               `<name>: nothing to check` and is listed as not run, never as passed. { skip }
//               means the gate cannot run here, such as on another host or without an input: it
//               prints `not run: <name> (<reason>)`, and the gates after it still run. A command
//               function that throws fails the gate with its message.
//   describe    optional, printed when the gate starts
//   needs       optional runtime { name, env, find, missing, wrap }, resolved just before the first
//               gate that needs it. The variable `env`, when set, is a command prefix (words split on
//               spaces). Otherwise find() returns a prefix ([] runs here) or null, and null fails the
//               gate with `missing`. Under --ci find() is not called and a gate whose variable is
//               unset is not run, while the gates after it still run. The argv runs through the
//               prefix, unless wrap is false: then it runs as it is, for a script that calls the
//               runtime itself through ctx.runtime.
//   outputs     optional committed files the command regenerates; a run that changes one fails as
//               out of step, line endings ignored
//   exitMasked  optional, with outputs: a zero exit proves nothing, so the run must rewrite each one
//
// The last line is the verdict. PASS needs a gate that ran a command and passed; a run in which no
// gate did says NOTHING CHECKED, and one that no gate applies to says so.
//
// Exit codes:
//   0  no gate failed: each planned gate passed, had nothing to check or, outside --ci, skipped
//      itself, and under --ci at least one gate ran a command; also when no gate applies, and
//      under --dry-run
//   1  a gate failed
//   2  refused: the change could not be read, or a bad argument, gate or table
//   3  only under --ci: no gate failed and some were not run, for want of a runtime or because they
//      skipped themselves, or no gate ran a command at all (NOTHING CHECKED); the CI step either
//      provides what they need or accepts exit 3

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
    if (g.needs && g.needs.wrap !== undefined && typeof g.needs.wrap !== 'boolean') return `${g.name} has a needs.wrap that is not true or false`;
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

  const ctx = { base, mergeBase: change.mergeBase, paths: change.paths, ci, all: Boolean(opts['--all']) };
  const runtimes = new Map();
  const ran = [];
  const noRuntime = [];
  const selfSkipped = [];
  const nothingToCheck = [];
  for (const [i, { gate, hits }] of run.entries()) {
    const fail = (why) => {
      console.error(`\nverify: FAIL at ${gate.name} - ${why}`);
      console.error(`  not reached: ${list(run.slice(i + 1).map((r) => r.gate.name))}; not run: ${list([...noRuntime, ...selfSkipped, ...nothingToCheck, ...skipped])}`);
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
    let command;
    try {
      command = typeof gate.command === 'function' ? await gate.command(hits, gate.needs ? { ...ctx, runtime: prefix } : ctx) : gate.command;
    } catch (error) {
      return fail(error?.message ?? String(error));
    }
    const skip = !Array.isArray(command) && typeof command?.skip === 'string' ? command.skip.trim() : '';
    if (skip) {
      selfSkipped.push(`${gate.name} (${skip})`);
      console.log(`not run: ${gate.name} (${skip})`);
      continue;
    }
    if (!Array.isArray(command)) return fail('its command function returned neither an argv array nor { skip: <reason> }');
    if (!command.length) {
      nothingToCheck.push(`${gate.name} (nothing to check)`);
      console.log(`${gate.name}: nothing to check`);
      continue;
    }
    const before = snapshot(top, gate.outputs ?? []);
    const argv = gate.needs?.wrap === false ? command : [...prefix, ...command];
    const failure = execute(argv, top) ?? outputsProblem(gate, before, snapshot(top, gate.outputs ?? []));
    if (failure) return fail(failure);
    ran.push(gate.name);
    console.log(`${gate.name}: ok`);
  }
  if (ci && (noRuntime.length || selfSkipped.length)) {
    console.log(`\nverify: INCOMPLETE - passed: ${list(ran)}; not run for want of a runtime: ${list(noRuntime)}; skipped: ${list(selfSkipped)}; not run: ${list([...nothingToCheck, ...skipped])}`);
    return 3;
  }
  const notRun = [...selfSkipped, ...nothingToCheck, ...skipped];
  if (!run.length) console.log(`\nverify: no gate applies to this change; not run: ${list(skipped)}`);
  else if (!ran.length) {
    console.log(`\nverify: NOTHING CHECKED (not run: ${list(notRun)})`);
    if (ci) return 3;
  } else console.log(`\nverify: PASS (${list(ran)}; not run: ${list(notRun)})`);
  return 0;
}

const entry = (() => {
  try {
    return pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return null;
  }
})();
// Ends with an explicit exit once stdout and stderr have drained: Node on Windows can crash at a
// natural exit after a wsl.exe child under a Git Bash pipe (core's dev-init/references/
// windows-hosts.md), and every child here ran synchronously, so no other work is pending.
if (entry === import.meta.url) {
  const code = await main(process.argv.slice(2));
  process.exitCode = code;
  await Promise.all([process.stdout, process.stderr].map((stream) => new Promise((done) => stream.write('', done))));
  process.exit(code);
}
