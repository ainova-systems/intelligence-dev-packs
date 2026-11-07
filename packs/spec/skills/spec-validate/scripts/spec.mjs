#!/usr/bin/env node
// The mechanical side of a spec (spec-discipline), so every state a skill acts on and every plan
// shape a check can decide is decided by this file, never by reading. Run from the repository root:
//
//   spec.mjs status <spec>             one state: requirements | blocked | stale | planned | proposed |
//                                      approved | in-progress | completed | cancelled | superseded by <key>
//   spec.mjs check <spec>              the plan's mechanical problems, one per line; exit 1 when any
//   spec.mjs open-questions <spec>     the open questions by plan number, each with the open questions it
//                                      waits on; exit 1 on a malformed line or a dependency cycle
//   spec.mjs delivered [--base <ref>]  the specs whose work steps the change ticks; the change is everything
//                                      between the merge-base with <ref> (default origin/HEAD) and the
//                                      working tree
//   spec.mjs move-question <spec> <n> --from <file>
//                                      moves open question n under "## Answered questions" as its own line
//                                      plus the `Key: value` lines of the file, `Answer:` and `Changed:` among them
//   spec.mjs replace-section <spec> <heading> --from <file>
//                                      replaces the body of the plan's one "## <heading>" with the file
//
// <spec> is a spec folder, one of its two files, or a key or folder name looked up under profile
// specs_dir. The profile is dev-project-profile.md in a rules source of intelligence.yaml, else in
// intelligence/rules/. It supplies specs_dir, approval, execution_mode, tracker_item_ref and
// spec_checks: a project module whose default export, (spec) => string[], adds the stack's own
// problems to check. spec holds dir, key, requirements and plan.
//
// Exit codes: 0 done; 1 problems found; 2 refused (bad arguments, no such spec, git could not answer).

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PLAN_SECTIONS = ['Requirements coverage', 'Approach', 'Work steps', 'Open questions', 'Answered questions', 'Corrections', 'Review findings'];
const FILLED = new Set(PLAN_SECTIONS.slice(0, 3));
const STEP = /^- \[([ xX])\] (\d+)\.\s+(\S.*)$/;
const CHECKBOX = /^(?:[-*+]|\d+[.)])\s+\[[^\]]?\]/;
const NUMBERED = /^(\d+)\.\s+(\S.*)$/;
const FIELD = /^\s+[-*]\s+([A-Za-z][A-Za-z ]*?):\s*(.*)$/;
const APPROVAL = /^approved: (\S.*) (\d{4}-\d{2}-\d{2}) ([0-9a-f]{40}|[0-9a-f]{64})\s*$/;
const WRITTEN = /^(cancelled|superseded by \S+|proposed|approved|in-progress|completed)\b/;
const PATH = /`([\w.@-]+\/[\w.@/-]*)(\s+\(new\))?`(\s*\(new\))?/g;

const posix = (p) => p.split(sep).join('/');
const isDir = (p) => existsSync(p) && statSync(p).isDirectory();
const firstWords = (line, count = 8) => {
  const words = line.trim().split(/\s+/);
  return words.slice(0, count).join(' ') + (words.length > count ? ' ...' : '');
};

// Lines, the fenced ones, the "## " headings outside fences and frontmatter, and the footer: the
// approval line when the plan's last non-blank line starts with `approved:`. It belongs to no section.
export function layout(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  const fence = [];
  let open = false;
  for (const line of lines) {
    const marker = /^\s*(```|~~~)/.test(line);
    fence.push(open || marker);
    if (marker) open = !open;
  }
  const fmEnd = lines[0] === '---' ? lines.indexOf('---', 1) : -1;
  const headings = [];
  lines.forEach((line, i) => {
    const m = i > fmEnd && !fence[i] && line.match(/^## (.+?)\s*$/);
    if (m) headings.push({ name: m[1], at: i });
  });
  let last = lines.length - 1;
  while (last >= 0 && !lines[last].trim()) last -= 1;
  const footer = last > fmEnd && !fence[last] && /^approved:/.test(lines[last]) ? last : -1;
  return { lines, fence, headings, footer, fmEnd, eol: /\r\n/.test(text ?? '') ? '\r\n' : '\n' };
}

function bodyRange(doc, heading) {
  const i = doc.headings.findIndex((h) => h.name === heading);
  if (i < 0) return null;
  const start = doc.headings[i].at + 1;
  let end = doc.headings[i + 1]?.at ?? doc.lines.length;
  if (doc.footer >= start && doc.footer < end) end = doc.footer;
  return { start, end };
}

export function section(text, heading) {
  const doc = layout(text);
  const range = bodyRange(doc, heading);
  return range ? doc.lines.slice(range.start, range.end) : null;
}

export function frontmatter(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  const out = {};
  if (lines[0] !== '---') return out;
  for (const line of lines.slice(1, lines.indexOf('---', 1))) {
    const m = line.match(/^([\w-]+):\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

// Work steps in the `- [ ] N. <step>` shape, each with its nested lines. Prose and phase headings
// between them are allowed; a checkbox in any other shape is `malformed`.
export function workSteps(plan) {
  const steps = [];
  const malformed = [];
  let current = null;
  for (const raw of section(plan, 'Work steps') ?? []) {
    const line = raw.trimEnd();
    if (!line) continue;
    const m = line.match(STEP);
    if (m) steps.push((current = { number: Number(m[2]), ticked: m[1] !== ' ', block: [line] }));
    else if (/^\s/.test(line)) current?.block.push(line);
    else {
      current = null;
      if (CHECKBOX.test(line)) malformed.push(line.trim());
    }
  }
  return { steps, malformed };
}

// Numbered questions, each with its nested lines and `- Key: value` fields (keys lower-cased). Any
// other line that is not blank or nested is `malformed`: an empty section is the only "no questions".
function questionList(lines) {
  const questions = [];
  const malformed = [];
  let current = null;
  for (const raw of lines ?? []) {
    const line = raw.trimEnd();
    if (!line) continue;
    const m = line.match(NUMBERED);
    if (m) questions.push((current = { number: Number(m[1]), text: m[2], block: [line], fields: {} }));
    else if (/^\s/.test(line) && current) {
      current.block.push(line);
      const field = line.match(FIELD);
      if (field) current.fields[field[1].toLowerCase()] = field[2].trim();
    } else {
      current = null;
      malformed.push(line.trim());
    }
  }
  return { questions, malformed };
}

// `waitsOn` is the part of a question's `Depends on:` that is still open; `circular` lists the
// questions that can never come off the wait list.
export function openQuestions(plan) {
  const { questions, malformed } = questionList(section(plan, 'Open questions'));
  const open = new Set(questions.map((q) => q.number));
  for (const q of questions) {
    q.dependsOn = (q.fields['depends on']?.match(/\d+/g) ?? []).map(Number);
    q.waitsOn = q.dependsOn.filter((n) => open.has(n));
  }
  const waiting = new Map(questions.map((q) => [q.number, q.waitsOn]));
  for (let freed = true; freed; ) {
    freed = false;
    for (const [n, on] of waiting) {
      if (on.every((d) => !waiting.has(d))) {
        waiting.delete(n);
        freed = true;
      }
    }
  }
  return { questions, malformed, circular: [...waiting.keys()] };
}

export function approvalLine(plan) {
  const doc = layout(plan);
  if (doc.footer < 0) return null;
  const line = doc.lines[doc.footer];
  const m = line.match(APPROVAL);
  return m ? { line, name: m[1], date: m[2], digest: m[3] } : { line, broken: true };
}

function written(spec) {
  const value = frontmatter(spec.plan).status ?? frontmatter(spec.requirements).status ?? '';
  return value.match(WRITTEN)?.[1] ?? null;
}

// `digest` returns the requirements file's current digest (git hash-object); it is asked only when
// the plan carries an approval line.
export function specStatus(spec, { approval = 'implicit', mode = 'supervised', digest = () => null } = {}) {
  const kind = written(spec);
  if (/^(cancelled|superseded)/.test(kind ?? '')) return kind;
  if (!spec.plan) return 'requirements';
  const line = approvalLine(spec.plan);
  const current = line?.digest && spec.requirements != null ? digest() : null;
  if (current && current !== line.digest) return 'stale';
  const open = openQuestions(spec.plan);
  if (open.questions.length || open.malformed.length || open.circular.length) return 'blocked';
  const autonomous = mode === 'autonomous';
  const explicit = !autonomous && approval === 'explicit';
  if (autonomous && !['approved', 'in-progress', 'completed'].includes(kind)) return kind === 'proposed' ? 'proposed' : 'planned';
  if (explicit && !current) return 'planned';
  const { steps } = workSteps(spec.plan);
  const done = steps.filter((s) => s.ticked).length;
  if (steps.length && done === steps.length) return 'completed';
  if (done) return 'in-progress';
  return autonomous || explicit ? 'approved' : 'planned';
}

// A tracker item reference in the form profile tracker_item_ref names: #123, PROJ-123, url, or auto
// for any of the three.
export function itemRefPattern(ref = 'auto') {
  const forms = { hash: '#\\d+', key: '[A-Z][A-Z0-9]*-\\d+', url: 'https?://\\S+' };
  const value = String(ref).trim();
  const form = value === 'url' ? forms.url : /^#\d+$/.test(value) ? forms.hash : /^[A-Za-z][A-Za-z0-9]*-\d+$/.test(value) ? forms.key : Object.values(forms).join('|');
  return new RegExp(`^(?:${form})$`);
}

export function sectionProblems(plan) {
  const problems = [];
  const { headings } = layout(plan);
  let last = null;
  for (const name of PLAN_SECTIONS) {
    const found = headings.filter((h) => h.name === name);
    if (!found.length) {
      problems.push(`no "## ${name}" section; a plan keeps ${PLAN_SECTIONS.map((s) => `"## ${s}"`).join(', ')}, in this order`);
      continue;
    }
    if (found.length > 1) problems.push(`"## ${name}" stands ${found.length} times`);
    if (last && found[0].at < last.at) problems.push(`"## ${name}" stands before "## ${last.name}"; keep the order spec-plan writes`);
    else last = { at: found[0].at, name };
    if (FILLED.has(name) && !section(plan, name).some((l) => l.trim())) problems.push(`no text under "## ${name}"`);
  }
  return problems;
}

function coverageRows(lines) {
  const rows = [];
  let column = -1;
  let header = true;
  for (const raw of lines ?? []) {
    const line = raw.trim();
    if (!line.startsWith('|')) {
      header = true;
      continue;
    }
    const cells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    if (header) {
      const named = cells.map((c, i) => (/deliver|cover|step|question/i.test(c) ? i : -1)).filter((i) => i > 0);
      column = named.at(-1) ?? cells.length - 1;
      header = false;
      continue;
    }
    rows.push({ requirement: cells[0], cell: cells[column] ?? '' });
  }
  return rows;
}

function coverageRefs(cell) {
  const refs = [];
  for (const m of cell.matchAll(/\b(steps?|questions?)\s+(\d+(?:\s*(?:,|and|or|-|to)\s*\d+)*)/gi)) {
    const kind = m[1].toLowerCase().startsWith('step') ? 'step' : 'question';
    for (const part of m[2].split(/\s*(?:,|and|or)\s*/)) {
      const [from, to = from] = part.split(/\s*(?:-|to)\s*/).map(Number);
      for (let n = from; n <= to && n - from < 100; n += 1) refs.push({ kind, n });
    }
  }
  return refs;
}

// `exists(path)` takes a repo-relative path; `skillExists(name)` and `agentWrites(name)` answer for
// the layer; `remotes` are the git remote names, whose refs a plan may quote.
export function checkPlan(spec, { exists, skillExists, agentWrites, remotes = ['origin'], itemRef = itemRefPattern() }) {
  const { plan } = spec;
  const problems = [];
  if (spec.requirements == null) problems.push(`no ${spec.key}-requirements.md beside the plan`);
  if (spec.dir && !spec.dir.split('/').at(-1).startsWith(`${spec.key}-`)) problems.push(`the folder ${spec.dir} does not start with its files' key ${spec.key}`);
  problems.push(...sectionProblems(plan));

  const doc = layout(plan);
  doc.lines.forEach((line, i) => {
    if (i > doc.fmEnd && i !== doc.footer && !doc.fence[i] && /^approved:/.test(line)) problems.push(`"${firstWords(line)}" is an approval line that is not the plan's last line`);
  });
  if (approvalLine(plan)?.broken) problems.push(`the last line "${firstWords(doc.lines[doc.footer])}" does not read "approved: <name> <yyyy-mm-dd> <requirements digest>"`);
  for (const [file, text] of [['plan', plan], ['requirements', spec.requirements]]) {
    const value = frontmatter(text).status;
    if (value && !WRITTEN.test(value)) problems.push(`the ${file}'s "status: ${value}" is not a status a spec skill writes`);
  }

  const { steps, malformed } = workSteps(plan);
  for (const line of malformed) problems.push(`"## Work steps" holds a checkbox not in the shape "- [ ] N. <step>": ${line}`);
  const created = [];
  for (const block of [section(plan, 'Approach'), ...steps.map((s) => s.block)]) {
    for (const m of (block ?? []).join('\n').matchAll(PATH)) if (m[2] || m[3]) created.push(m[1].replace(/\/$/, ''));
  }
  const resolves = (path) => path.startsWith('@') || path.startsWith('refs/') || remotes.includes(path.split('/')[0])
    || created.some((c) => path === c || path.startsWith(`${c}/`)) || exists(path);
  const cited = (lines) => [...(lines ?? []).join('\n').matchAll(PATH)].filter((m) => !m[2] && !m[3]).map((m) => m[1].replace(/\/$/, ''));
  for (const path of cited(section(plan, 'Approach'))) if (!resolves(path)) problems.push(`"## Approach" cites ${path}, which does not exist; a path the plan creates is cited \`${path}\` (new)`);
  const numbers = new Set();
  for (const step of steps) {
    const id = step.number;
    if (numbers.has(id)) problems.push(`step ${id} is numbered twice`);
    numbers.add(id);
    // A ticked step is history: what it named may have moved since, so it is not checked.
    if (step.ticked) continue;
    const text = step.block.join(' ');
    const executor = [...text.split(/\s-\s*check:/)[0].matchAll(/\bby `([^`]+)`/g)].at(-1)?.[1];
    if (!executor) problems.push(`step ${id}: names no executor, written by \`<skill or agent>\` or by \`subagent\``);
    else if (executor !== 'subagent' && !skillExists(executor) && !agentWrites(executor)) problems.push(`step ${id}: \`${executor}\` is neither a skill, an agent that can write, nor \`subagent\``);
    if (!/\bcheck:\s*\S/.test(text)) problems.push(`step ${id}: has no "check: <observable result>"`);
    for (const path of cited(step.block)) if (!resolves(path)) problems.push(`step ${id}: cites ${path}, which does not exist; a path the plan creates is cited \`${path}\` (new)`);
  }

  const open = openQuestions(plan);
  const answered = questionList(section(plan, 'Answered questions'));
  for (const line of open.malformed) problems.push(`"## Open questions" holds a line that is not a numbered question or one of its nested lines: ${line}; no questions is an empty section`);
  for (const line of answered.malformed) problems.push(`"## Answered questions" holds a line that is not a numbered question or one of its nested lines: ${line}`);
  const count = new Map();
  for (const q of [...open.questions, ...answered.questions]) count.set(q.number, (count.get(q.number) ?? 0) + 1);
  for (const [n, c] of count) if (c > 1) problems.push(`question ${n} is numbered ${c} times; a question keeps one number for the life of the plan`);
  if (open.circular.length) problems.push(`the "Depends on:" lines of questions ${open.circular.join(', ')} form a cycle`);
  for (const q of open.questions) for (const d of q.dependsOn) if (!count.has(d)) problems.push(`question ${q.number} depends on question ${d}, which the plan does not hold`);
  for (const q of answered.questions) {
    for (const key of ['Answer', 'Changed']) if (!q.fields[key.toLowerCase()]) problems.push(`answered question ${q.number} has no "${key}:" line`);
  }

  const seen = new Set();
  for (const { requirement, cell } of coverageRows(section(plan, 'Requirements coverage'))) {
    if (!requirement) {
      problems.push('a "## Requirements coverage" row names no requirement');
      continue;
    }
    if (seen.has(requirement.toLowerCase())) problems.push(`requirement ${requirement} has two coverage rows`);
    seen.add(requirement.toLowerCase());
    const refs = coverageRefs(cell);
    const moved = [...cell.matchAll(/\bmoved to\s+`?([^\s`]+)/gi)].map((m) => m[1].replace(/[.,;:)]+$/, ''));
    if (!refs.length && !moved.length) problems.push(`requirement ${requirement}: its coverage names no step, question or "moved to <item ref>"`);
    for (const { kind, n } of refs) {
      if (kind === 'step' && !numbers.has(n)) problems.push(`requirement ${requirement}: step ${n} is not under "## Work steps"`);
      if (kind === 'question' && !count.has(n)) problems.push(`requirement ${requirement}: question ${n} is under neither "## Open questions" nor "## Answered questions"`);
    }
    for (const ref of moved) if (!itemRef.test(ref)) problems.push(`requirement ${requirement}: "moved to ${ref}" is not a tracker item reference in the profile's tracker_item_ref form`);
  }
  return problems;
}

// Numbered items under a heading, each with its nested lines, keyed by number.
function blocks(lines, head) {
  const out = new Map();
  let current = null;
  for (const raw of lines ?? []) {
    const line = raw.trimEnd();
    if (!line) continue;
    const n = line.match(head)?.[1];
    if (n) out.set(Number(n), (current = [line]));
    else if (/^\s/.test(line) && current) current.push(line);
    else current = null;
  }
  return out;
}

// What the plan's last commit holds as history, kept word for word: a ticked step with its nested
// lines, an answered question (its `Answer:` and `Changed:` may be corrected) and every line of
// "## Corrections". Each may only gain lines. `committed` is null when no commit holds the plan.
export function lostLines(committed, plan) {
  if (!committed) return [];
  const problems = [];
  const parts = [
    { heading: 'Work steps', head: /^- \[[ xX]\] (\d+)\./, name: 'ticked step', kept: (b) => /^- \[[xX]\]/.test(b[0]), line: () => true },
    { heading: 'Answered questions', head: /^(\d+)\.\s/, name: 'answered question', kept: () => true, line: (l) => !/^\s+[-*]\s+(Answer|Changed):/.test(l) },
  ];
  for (const { heading, head, name, kept, line } of parts) {
    const now = blocks(section(plan, heading), head);
    for (const [n, block] of blocks(section(committed, heading), head)) {
      if (!kept(block)) continue;
      const current = new Set(now.get(n) ?? []);
      const lost = current.size ? block.filter((l) => line(l) && !current.has(l)) : [block[0]];
      for (const l of lost) problems.push(`${name} ${n} lost "${firstWords(l)}" since the plan's last commit; it keeps its lines word for word and only gains lines`);
    }
  }
  const corrections = new Set((section(plan, 'Corrections') ?? []).map((l) => l.trimEnd()));
  for (const l of section(committed, 'Corrections') ?? []) {
    if (l.trim() && !corrections.has(l.trimEnd())) problems.push(`"## Corrections" lost "${firstWords(l)}" since the plan's last commit; it only gains lines`);
  }
  return problems;
}

export function delivers(before, after) {
  const ticked = (plan) => new Set(workSteps(plan).steps.filter((s) => s.ticked).map((s) => s.number));
  const was = ticked(before ?? '');
  return [...ticked(after)].some((n) => !was.has(n));
}

// Lines back to text in the file's own line ending, its final newline kept.
function edited(doc, lines) {
  const text = lines.join(doc.eol);
  return doc.lines.at(-1) === '' && !text.endsWith(doc.eol) ? text + doc.eol : text;
}

// The answer file holds `Key: value` lines (a leading "- " is allowed), `Answer:` and `Changed:` among
// them; they replace the question's nested lines.
export function moveQuestion(plan, number, answer) {
  const doc = layout(plan);
  const open = bodyRange(doc, 'Open questions');
  const done = bodyRange(doc, 'Answered questions');
  if (!open || !done) throw new Error('the plan has no "## Open questions" or no "## Answered questions"');
  const fields = String(answer).split(/\r?\n/).map((l) => l.trim().replace(/^[-*]\s+/, '')).filter(Boolean);
  const bad = fields.find((l) => !/^[A-Za-z][A-Za-z ]*:\s*\S/.test(l));
  if (bad) throw new Error(`the answer file holds "${firstWords(bad)}", which is not a "Key: value" line`);
  for (const key of ['Answer', 'Changed']) if (!fields.some((l) => l.startsWith(`${key}:`))) throw new Error(`the answer file has no "${key}:" line`);
  if (blocks(doc.lines.slice(done.start, done.end), /^(\d+)\.\s/).has(number)) throw new Error(`question ${number} is already under "## Answered questions"`);
  let start = -1;
  let end = -1;
  for (let i = open.start; i < open.end; i += 1) {
    const line = doc.lines[i];
    if (start < 0) {
      if (line.match(NUMBERED)?.[1] === String(number)) start = i;
      continue;
    }
    if (line.trim() && !/^\s/.test(line)) break;
    if (line.trim()) end = i;
  }
  if (start < 0) throw new Error(`question ${number} is not under "## Open questions"`);
  end = Math.max(end, start);
  const indent = doc.lines.slice(start + 1, end + 1).find((l) => l.trim())?.match(/^\s+/)?.[0] ?? '   ';
  const entry = [doc.lines[start].trimEnd(), ...fields.map((f) => `${indent}- ${f}`)];
  let last = done.end - 1;
  while (last >= done.start && !doc.lines[last].trim()) last -= 1;
  // An empty section gets the entry between blank lines; otherwise it follows the last answered one.
  const insert = last >= done.start
    ? { at: last + 1, remove: 0, add: entry }
    : { at: done.start, remove: done.end - done.start, add: ['', ...entry, ''] };
  const lines = [...doc.lines];
  let cut = end - start + 1;
  if (!lines[end + 1]?.trim() && !lines[start - 1]?.trim()) cut += 1;
  for (const e of [insert, { at: start, remove: cut, add: [] }].sort((a, b) => b.at - a.at)) lines.splice(e.at, e.remove, ...e.add);
  return edited(doc, lines);
}

export function replaceSection(plan, heading, body) {
  const name = String(heading).replace(/^#+\s*/, '').trim();
  const doc = layout(plan);
  const found = doc.headings.filter((h) => h.name === name).length;
  if (found !== 1) throw new Error(found ? `"## ${name}" stands ${found} times; fix the plan first` : `the plan has no "## ${name}"`);
  const lines = String(body).split(/\r?\n/);
  while (lines.length && !lines.at(-1).trim()) lines.pop();
  while (lines.length && !lines[0].trim()) lines.shift();
  const inner = layout(lines.join('\n'));
  const bad = lines.find((l, i) => !inner.fence[i] && /^(#{1,2} |approved:)/.test(l));
  if (bad) throw new Error(`the new body holds "${firstWords(bad)}"; a section body holds no "#" or "##" heading and no approval line`);
  const { start, end } = bodyRange(doc, name);
  const tail = doc.lines.slice(end);
  const next = end < doc.lines.length && tail.some((l) => l.trim()) ? [''] : [];
  return edited(doc, [...doc.lines.slice(0, start), '', ...lines, ...(lines.length ? next : []), ...tail]);
}

// --- the repository: the layer's sources, the profile, git, the spec folder ---

export function manifestSources(text) {
  const out = { rules: [], agents: [], skills: [] };
  let inSources = false;
  let kind = null;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '');
    if (!line.trim()) continue;
    if (/^\S/.test(line)) {
      inSources = /^sources:\s*$/.test(line);
      kind = null;
      continue;
    }
    if (!inSources) continue;
    const key = line.match(/^\s+(\w+):\s*$/);
    if (key) kind = key[1] in out ? key[1] : null;
    const item = line.match(/^\s+-\s+["']?([^"']+?)["']?\s*$/);
    if (item && kind) out[kind].push(item[1]);
  }
  return out;
}

// Source directories per kind, in the engine's override order: packages first, then the manifest's
// entries, then intelligence/<kind>. A later directory overrides an artifact of the same name.
export function layerRoots(root) {
  const manifest = join(root, 'intelligence.yaml');
  const sources = existsSync(manifest) ? manifestSources(readFileSync(manifest, 'utf8')) : { rules: [], agents: [], skills: [] };
  const store = join(root, '.intelligence', 'packages');
  const packages = [];
  if (isDir(store)) {
    for (const scope of readdirSync(store)) {
      const path = join(store, scope);
      if (!isDir(path) || scope.startsWith('.')) continue;
      if (!scope.startsWith('@')) packages.push(path);
      else for (const name of readdirSync(path)) if (isDir(join(path, name))) packages.push(join(path, name));
    }
  }
  // `@scope/name/<dir>` is a store path; an `<alias>:<dir>` names one, and the store is read whole.
  const entry = (e) => (e.includes(':') ? null : /^@[^/]+\/[^/]+\//.test(e) ? join(store, ...e.split('/')) : join(root, e));
  const roots = (kind) => [...new Set([...packages.map((p) => join(p, kind)), ...sources[kind].map(entry).filter(Boolean), join(root, 'intelligence', kind)])];
  return { rules: roots('rules'), agents: roots('agents'), skills: roots('skills') };
}

export function parseProfile(text) {
  const out = {};
  for (const line of String(text).replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)) {
    const m = line.match(/^- ([a-z_]+):\s*(.*?)\s*$/);
    if (m && !(m[1] in out)) out[m[1]] = m[2];
  }
  return out;
}

function readProfile(roots) {
  const path = roots.rules.map((r) => join(r, 'dev-project-profile.md')).findLast(existsSync);
  return path ? parseProfile(readFileSync(path, 'utf8')) : {};
}

function git(root, args) {
  const res = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (res.status === 0) return res.stdout;
  const why = (res.stderr || res.error?.message || '').trim().split('\n')[0];
  throw new Error(`git ${args[0]} failed${why ? `: ${why}` : ''}`);
}

// The file at <rev>, or null when <rev> does not hold it. An unborn HEAD holds nothing.
function atRevision(root, rev, path) {
  if (spawnSync('git', ['rev-parse', '--verify', '-q', `${rev}^{commit}`], { cwd: root }).status !== 0) {
    git(root, ['rev-parse', '--git-dir']);
    return null;
  }
  if (spawnSync('git', ['cat-file', '-e', `${rev}:./${path}`], { cwd: root }).status !== 0) return null;
  return git(root, ['show', `${rev}:./${path}`]);
}

export function resolveSpec(root, arg, specsDir = 'docs/specs') {
  const abs = resolve(root, arg);
  let dir;
  if (existsSync(abs)) dir = isDir(abs) ? abs : dirname(abs);
  else {
    const found = [];
    const look = (d) => {
      if (!isDir(d)) return;
      for (const name of readdirSync(d)) {
        const path = join(d, name);
        if (!isDir(path)) continue;
        if (name === arg || name.startsWith(`${arg}-`)) found.push(path);
        else if (/^\d{4}-Q[1-4]$/.test(name)) look(path);
      }
    };
    look(join(root, specsDir));
    if (found.length !== 1) throw new Error(found.length ? `${arg} names ${found.length} spec folders: ${found.map((f) => posix(relative(root, f))).join(', ')}` : `no spec ${arg} under ${specsDir}`);
    [dir] = found;
  }
  const rel = posix(relative(root, dir));
  const files = readdirSync(dir);
  const of = (suffix) => files.filter((f) => f.endsWith(suffix)).map((f) => f.slice(0, -suffix.length));
  const keys = [...of('-requirements.md'), ...of('-plan.md')];
  if (!keys.length) throw new Error(`no spec files in ${rel}`);
  if (new Set(keys).size > 1 || keys.length > 2) throw new Error(`${rel} holds spec files of more than one key: ${[...new Set(keys)].join(', ')}`);
  const key = keys[0];
  const read = (suffix) => (existsSync(join(dir, `${key}-${suffix}.md`)) ? readFileSync(join(dir, `${key}-${suffix}.md`), 'utf8') : null);
  return { dir: rel, key, requirements: read('requirements'), plan: read('plan'), requirementsPath: `${rel}/${key}-requirements.md`, planPath: `${rel}/${key}-plan.md` };
}

function options(args) {
  const out = { positional: [] };
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i].match(/^--(from|base)$/)?.[1];
    if (flag) {
      if (args[i + 1] === undefined) throw new Error(`--${flag} needs a value`);
      out[flag] = args[(i += 1)];
    } else if (args[i].startsWith('--')) throw new Error(`unknown option ${args[i]}`);
    else out.positional.push(args[i]);
  }
  return out;
}

const USAGE = 'usage: spec.mjs status|check|open-questions <spec> | delivered [--base <ref>] | move-question <spec> <n> --from <file> | replace-section <spec> <heading> --from <file>';

export async function main(argv, root = process.cwd()) {
  const [command, ...rest] = argv;
  const opts = options(rest);
  const roots = layerRoots(root);
  const profile = readProfile(roots);
  const specsDir = profile.specs_dir || 'docs/specs';
  if (command === 'delivered') {
    const base = opts.base ?? 'origin/HEAD';
    const mergeBase = git(root, ['merge-base', base, 'HEAD']).trim();
    if (!mergeBase) throw new Error(`no merge-base between ${base} and HEAD`);
    const changed = git(root, ['diff', '--name-status', '-z', '-M', '--relative', mergeBase, '--', specsDir]).split('\0');
    const pairs = [];
    for (let i = 0; i < changed.length - 1; ) {
      const code = changed[i];
      if (/^[RC]/.test(code)) pairs.push([changed[i + 1], changed[i + 2]]);
      else if (code !== 'D') pairs.push([changed[i + 1], changed[i + 1]]);
      i += /^[RC]/.test(code) ? 3 : 2;
    }
    for (const path of git(root, ['ls-files', '--others', '--exclude-standard', '-z', '--', specsDir]).split('\0').filter(Boolean)) pairs.push([null, path]);
    const keys = new Set();
    for (const [before, after] of pairs) {
      if (!after.endsWith('-plan.md') || !existsSync(join(root, after))) continue;
      if (delivers(before && atRevision(root, mergeBase, before), readFileSync(join(root, after), 'utf8'))) keys.add(posix(dirname(after)));
    }
    for (const key of [...keys].sort()) console.log(key);
    return 0;
  }
  const [arg, ...more] = opts.positional;
  if (!arg || !['status', 'check', 'open-questions', 'move-question', 'replace-section'].includes(command)) throw new Error(USAGE);
  const spec = resolveSpec(root, arg, specsDir);
  if (command === 'status') {
    const digest = () => git(root, ['hash-object', '--', spec.requirementsPath]).trim();
    console.log(specStatus(spec, { approval: profile.approval, mode: profile.execution_mode, digest }));
    return 0;
  }
  if (!spec.plan) throw new Error(`no plan in ${spec.dir}; spec-plan writes it`);
  if (command === 'open-questions') {
    const { questions, malformed, circular } = openQuestions(spec.plan);
    for (const q of questions) console.log(`${q.number}. ${q.text}${q.waitsOn.length ? ` (waits on ${q.waitsOn.join(', ')})` : ''}`);
    console.log(`${questions.length} open`);
    for (const line of malformed) console.error(`spec: not a numbered question or one of its nested lines: ${line}`);
    if (circular.length) console.error(`spec: the "Depends on:" lines of questions ${circular.join(', ')} form a cycle`);
    return malformed.length || circular.length ? 1 : 0;
  }
  if (command === 'move-question' || command === 'replace-section') {
    if (!more[0] || !opts.from) throw new Error(USAGE);
    const input = readFileSync(resolve(root, opts.from), 'utf8');
    const number = Number(more[0]);
    if (command === 'move-question' && !(Number.isInteger(number) && number > 0)) throw new Error(`${more[0]} is not a question number`);
    const plan = command === 'move-question' ? moveQuestion(spec.plan, number, input) : replaceSection(spec.plan, more.join(' '), input);
    writeFileSync(join(root, spec.planPath), plan);
    console.log(command === 'move-question' ? `question ${number} moved under "## Answered questions" in ${spec.planPath}` : `"## ${more.join(' ').replace(/^#+\s*/, '')}" replaced in ${spec.planPath}`);
    return 0;
  }
  const lookup = (kind, file) => roots[kind].map((r) => join(r, file)).findLast(existsSync);
  // Outside a repository git refuses here, since the lost-line check needs the last commit.
  const remotes = ['origin', ...git(root, ['remote']).split(/\r?\n/).filter(Boolean)];
  const problems = [
    ...checkPlan(spec, {
      exists: (path) => existsSync(join(root, path)),
      skillExists: (name) => Boolean(lookup('skills', join(name, 'SKILL.md'))),
      agentWrites: (name) => {
        const path = lookup('agents', `${name}.md`);
        return Boolean(path) && frontmatter(readFileSync(path, 'utf8')).access !== 'readonly';
      },
      remotes,
      itemRef: itemRefPattern(profile.tracker_item_ref),
    }),
    ...lostLines(atRevision(root, 'HEAD', spec.planPath), spec.plan),
  ];
  if (profile.spec_checks && profile.spec_checks !== 'none') {
    const checks = (await import(pathToFileURL(resolve(root, profile.spec_checks)).href)).default;
    if (typeof checks !== 'function') throw new Error(`${profile.spec_checks} has no default export function`);
    const extra = await checks({ dir: spec.dir, key: spec.key, requirements: spec.requirements, plan: spec.plan });
    if (!Array.isArray(extra)) throw new Error(`${profile.spec_checks} returned no array of problems`);
    problems.push(...extra);
  }
  for (const p of problems) console.log(`- ${p}`);
  console.log(problems.length ? `${problems.length} problem(s)` : 'check: ok');
  return problems.length ? 1 : 0;
}

const entry = (() => {
  try {
    return pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return null;
  }
})();
if (entry === import.meta.url) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (err) {
    console.error(`spec: ${err.message}`);
    process.exitCode = 2;
  }
}
