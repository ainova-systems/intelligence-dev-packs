#!/usr/bin/env node
// A Claude Code PreToolUse hook that keeps an agent from pushing to a protected branch, and that
// hands a push carrying a release tag to the owner.
//
//   node guard-push.mjs        reads the hook input JSON on stdin
//
// It acts only on Bash and PowerShell tool calls whose command runs `git push`, including
// `git -C <dir> push`, variable assignments before it, chains with && || ; | and newlines, a
// `cd` earlier in the chain, `sh -c`, `pwsh -Command`, `cmd /c`, `eval`, command substitutions
// and git aliases. Every other call gets no output, so the normal permission flow decides it.
//
// For a push it resolves every branch the push would update: each refspec (`src:dst`,
// `HEAD:main`, `refs/heads/<b>`, `:<b>`), `remote.<name>.push`, and with neither the current
// branch and its push target under `push.default`. A target in profile `protected_branches` (the
// default and integration branches always included) is denied unless every path the push changes
// there matches profile `direct_lane`: the diff from the remote-tracking ref to the pushed commit,
// or the commit's whole tree when that ref does not exist. `--all`, `--mirror`, a pattern refspec
// that can reach a protected branch, and deleting one are denied outright. A push whose targets it
// cannot resolve is denied with the reason; it fails closed for pushes only.
//
// A push that is not denied asks the owner when it carries a tag profile `tag_format` describes
// (X, Y and Z stand for numbers; a `-` or `+` suffix also matches): a refspec naming one,
// `tag <name>`, a tag deletion, `--tags` or a tag pattern while a local tag matches, and under
// `--follow-tags` or `push.followTags` an annotated one on a pushed commit the remote's branches
// lack or on the pushed commit itself.
//
// The profile is read from intelligence/rules/dev-project-profile.md, else the rendered
// .claude/rules/dev-project-profile.md, in the repository the push runs in. Without one the
// schema's defaults apply, except that the default branch is the one `refs/remotes/<remote>/HEAD`
// names and an existing `<remote>/develop` is the integration branch, as git-workflow detects
// them. A deny or an ask is printed as PreToolUse JSON and the exit code is 0
// (code.claude.com/docs/en/hooks, "PreToolUse decision control").

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

class Unresolved extends Error {}

const PREFIX = 'Push guard (dev-init): ';
const MARK = '\u0000';
const PROFILE_FILES = ['intelligence/rules/dev-project-profile.md', '.claude/rules/dev-project-profile.md'];
const DEFAULTS = { default_branch: 'main', integration_branch: 'none', protected_branches: 'main', direct_lane: 'none', tag_format: 'vX.Y.Z' };

// Words that only lead into the command they precede.
const LEAD = new Set(['!', '{', 'then', 'do', 'else', 'elif', 'if', 'while', 'until', 'time', 'coproc', 'exec', 'command', 'builtin', 'nohup', 'noglob']);
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'ash', 'mksh']);
const GIT_FLAGS = new Set(['-p', '--paginate', '-P', '--no-pager', '--no-replace-objects', '--no-lazy-fetch', '--no-optional-locks',
  '--no-advice', '--bare', '--literal-pathspecs', '--glob-pathspecs', '--noglob-pathspecs', '--icase-pathspecs']);
// git looks an alias up only for a name that is not one of its own commands.
const GIT_COMMANDS = new Set(`add am annotate apply archive backfill bisect blame branch bugreport bundle cat-file check-attr
  check-ignore check-mailmap check-ref-format checkout checkout-index cherry cherry-pick citool clean clone column commit
  commit-graph commit-tree config count-objects credential describe diagnose diff diff-files diff-index diff-tree difftool
  fast-export fast-import fetch fetch-pack filter-branch fmt-merge-msg for-each-ref for-each-repo format-patch fsck gc
  get-tar-commit-id grep gui hash-object help hook index-pack init instaweb interpret-trailers lfs log ls-files ls-remote
  ls-tree mailinfo mailsplit maintenance merge merge-base merge-file merge-index merge-tree mergetool mktag mktree
  multi-pack-index mv name-rev notes pack-objects pack-refs patch-id prune prune-packed pull range-diff read-tree rebase
  reflog refs remote repack replace replay request-pull rerere reset restore rev-list rev-parse revert rm send-email
  send-pack shortlog show show-branch show-index show-ref sparse-checkout stage stash status stripspace submodule switch
  symbolic-ref tag unpack-file unpack-objects update-index update-ref update-server-info var verify-commit verify-pack
  verify-tag version whatchanged worktree write-tree`.split(/\s+/));
const CURRENT_BRANCH = /^git (?:branch --show-current|rev-parse --abbrev-ref HEAD|symbolic-ref (?:-q )?--short (?:-q )?HEAD)$/;

let baseEnv = process.env;

// ---- Lexing: statements of words, in bash or PowerShell syntax ---------------------------------

function newWord() {
  return { text: '', dynamic: false, subs: [] };
}

function addSub(word, subs, text, dialect) {
  word.subs.push(subs.length);
  word.text += `${MARK}${subs.length}${MARK}`;
  subs.push({ text, dialect });
}

function readSingle(src, i, pw) {
  let text = '';
  let j = i + 1;
  for (;;) {
    const k = src.indexOf("'", j);
    if (k < 0) throw new Unresolved('a quote is not closed');
    text += src.slice(j, k);
    if (pw && src[k + 1] === "'") {
      text += "'";
      j = k + 2;
      continue;
    }
    return { end: k + 1, text };
  }
}

function readHeredocDelimiter(src, i) {
  while (src[i] === ' ' || src[i] === '\t') i += 1;
  let delim = '';
  while (i < src.length && !/[\s;&|<>()]/.test(src[i])) {
    if (src[i] === "'" || src[i] === '"') {
      const k = src.indexOf(src[i], i + 1);
      if (k < 0) throw new Unresolved('a quote is not closed');
      delim += src.slice(i + 1, k);
      i = k + 1;
    } else if (src[i] === '\\') {
      delim += src[i + 1] ?? '';
      i += 2;
    } else {
      delim += src[i];
      i += 1;
    }
  }
  return { delim, end: i };
}

function skipHeredocs(src, i, pending) {
  for (const doc of pending) {
    for (;;) {
      if (i >= src.length) return src.length;
      const nl = src.indexOf('\n', i);
      const line = src.slice(i, nl < 0 ? src.length : nl).replace(/\r$/, '');
      i = nl < 0 ? src.length : nl + 1;
      if ((doc.dash ? line.replace(/^\t+/, '') : line) === doc.delim) break;
    }
  }
  pending.length = 0;
  return i;
}

// Index of the `)` that closes a `$(` or `@(` whose body starts at i.
function findClose(src, i, pw) {
  let depth = 1;
  const pending = [];
  while (i < src.length) {
    const c = src[i];
    if ((!pw && c === '\\') || (pw && c === '`')) {
      i += 2;
    } else if (c === "'") {
      i = readSingle(src, i, pw).end;
    } else if (c === '"') {
      i = skipDouble(src, i + 1, pw);
    } else if (!pw && c === '`') {
      i = findBacktick(src, i + 1) + 1;
    } else if (c === '#' && (i === 0 || /\s/.test(src[i - 1]))) {
      while (i < src.length && src[i] !== '\n') i += 1;
    } else if (!pw && c === '<' && src[i + 1] === '<' && src[i + 2] !== '<') {
      const dash = src[i + 2] === '-';
      const { delim, end } = readHeredocDelimiter(src, i + (dash ? 3 : 2));
      pending.push({ delim, dash });
      i = end;
    } else if (c === '\n' && pending.length) {
      i = skipHeredocs(src, i + 1, pending);
    } else {
      if (c === '(') depth += 1;
      if (c === ')' && (depth -= 1) === 0) return i;
      i += 1;
    }
  }
  throw new Unresolved('a command substitution is not closed');
}

function skipDouble(src, i, pw) {
  while (i < src.length) {
    const c = src[i];
    if ((!pw && c === '\\') || (pw && c === '`')) i += 2;
    else if (c === '"' && pw && src[i + 1] === '"') i += 2;
    else if (c === '"') return i + 1;
    else if (c === '$' && src[i + 1] === '(') i = findClose(src, i + 2, pw) + 1;
    else if (!pw && c === '`') i = findBacktick(src, i + 1) + 1;
    else i += 1;
  }
  throw new Unresolved('a quote is not closed');
}

function findBacktick(src, i) {
  while (i < src.length) {
    if (src[i] === '\\') i += 2;
    else if (src[i] === '`') return i;
    else i += 1;
  }
  throw new Unresolved('a backtick substitution is not closed');
}

function readDollar(src, i, word, subs, pw) {
  const next = src[i + 1];
  if (next === '(') {
    const close = findClose(src, i + 2, pw);
    if (!pw && src[i + 2] === '(') {
      word.dynamic = true;
      word.text += src.slice(i, close + 1);
    } else {
      addSub(word, subs, src.slice(i + 2, close), pw ? 'pwsh' : 'bash');
    }
    return close + 1;
  }
  if (next === '{') {
    const close = src.indexOf('}', i + 2);
    if (close < 0) throw new Unresolved('a variable is not closed');
    word.dynamic = true;
    word.text += src.slice(i, close + 1);
    return close + 1;
  }
  const name = (pw ? /^[A-Za-z_]\w*(?::[A-Za-z_]\w*)?/ : /^[A-Za-z_]\w*/).exec(src.slice(i + 1));
  if (name) {
    word.dynamic = true;
    word.text += `$${name[0]}`;
    return i + 1 + name[0].length;
  }
  if (next && (pw ? /[?^$_]/ : /[@*#?$!0-9-]/).test(next)) {
    word.dynamic = true;
    word.text += `$${next}`;
    return i + 2;
  }
  word.text += '$';
  return i + 1;
}

function readDouble(src, i, word, subs, pw) {
  while (i < src.length) {
    const c = src[i];
    if (!pw && c === '\\') {
      const n = src[i + 1];
      if (n === '\n') i += 2;
      else if (n !== undefined && '$`"\\'.includes(n)) {
        word.text += n;
        i += 2;
      } else {
        word.text += c;
        i += 1;
      }
    } else if (pw && c === '`') {
      word.text += src[i + 1] ?? '';
      i += 2;
    } else if (c === '"' && pw && src[i + 1] === '"') {
      word.text += '"';
      i += 2;
    } else if (c === '"') {
      return i + 1;
    } else if (c === '$') {
      i = readDollar(src, i, word, subs, pw);
    } else if (!pw && c === '`') {
      const close = findBacktick(src, i + 1);
      addSub(word, subs, src.slice(i + 1, close), 'bash');
      i = close + 1;
    } else {
      word.text += c;
      i += 1;
    }
  }
  throw new Unresolved('a quote is not closed');
}

// Splits a script into statements of words. A word's `subs` are the command substitutions inside
// it, whose text is in `subs`; a `dynamic` word holds an expansion nobody can read here.
export function lex(src, dialect, subs = []) {
  const pw = dialect === 'pwsh';
  const statements = [];
  const pending = [];
  let words = [];
  let word = null;
  let skip = false;
  let start = 0;
  let i = 0;
  const begin = () => {
    if (!word) word = newWord();
    return word;
  };
  const endWord = () => {
    if (!word) return;
    if (skip) skip = false;
    else words.push(word);
    word = null;
  };
  const endStatement = (width) => {
    endWord();
    if (words.length) statements.push({ words, raw: src.slice(start, i) });
    words = [];
    skip = false;
    i += width;
    start = i;
  };
  const redirect = () => {
    if (word && /^(\d+|\*)$/.test(word.text) && !word.dynamic && !word.subs.length) word = null;
    else endWord();
    let op = '';
    if (src[i] === '&') {
      op = '&';
      i += 1;
    }
    op += src[i];
    i += 1;
    if (!pw && op === '<' && src[i] === '<') {
      i += 1;
      if (src[i] === '<') {
        i += 1;
        skip = true;
        return;
      }
      const dash = src[i] === '-';
      const { delim, end } = readHeredocDelimiter(src, i + (dash ? 1 : 0));
      pending.push({ delim, dash });
      i = end;
      return;
    }
    if (src[i] === '>' || (!pw && src[i] === '|')) i += 1;
    if (src[i] === '&') {
      i += 1;
      if (/[0-9-]/.test(src[i] ?? '')) {
        while (/[0-9-]/.test(src[i] ?? '')) i += 1;
        return;
      }
    }
    skip = true;
  };
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v') {
      endWord();
      i += 1;
    } else if (c === '\n') {
      endStatement(1);
      if (pending.length) {
        i = skipHeredocs(src, i, pending);
        start = i;
      }
    } else if (c === '#' && !word) {
      if (pw && src[i - 1] === '<') {
        const end = src.indexOf('#>', i);
        i = end < 0 ? src.length : end + 2;
      } else {
        while (i < src.length && src[i] !== '\n') i += 1;
      }
    } else if (pw && c === '<' && src[i + 1] === '#' && !word) {
      const end = src.indexOf('#>', i);
      i = end < 0 ? src.length : end + 2;
    } else if (!pw && c === '\\') {
      if (src[i + 1] === '\n') i += 2;
      else {
        begin().text += src[i + 1] ?? '';
        i += 2;
      }
    } else if (pw && c === '`') {
      if (src[i + 1] === '\n' || (src[i + 1] === '\r' && src[i + 2] === '\n')) i += src[i + 1] === '\r' ? 3 : 2;
      else {
        begin().text += src[i + 1] ?? '';
        i += 2;
      }
    } else if (pw && c === '@' && (src[i + 1] === "'" || src[i + 1] === '"') && /^[ \t]*\r?\n/.test(src.slice(i + 2))) {
      const quote = src[i + 1];
      const body = src.indexOf('\n', i) + 1;
      const close = src.slice(body).search(new RegExp(`(^|\\n)${quote}@`));
      if (close < 0) throw new Unresolved('a here-string is not closed');
      const text = src.slice(body, body + close).replace(/\r$/, '');
      const w = begin();
      w.text += text;
      if (quote === '"' && text.includes('$')) w.dynamic = true;
      i = body + close + (src[body + close] === '\n' ? 3 : 2);
    } else if (pw && c === '@' && src[i + 1] === '(') {
      const close = findClose(src, i + 2, pw);
      addSub(begin(), subs, src.slice(i + 2, close), 'pwsh');
      i = close + 1;
    } else if (c === "'") {
      const { end, text } = readSingle(src, i, pw);
      begin().text += text;
      i = end;
    } else if (c === '"') {
      i = readDouble(src, i + 1, begin(), subs, pw);
    } else if (!pw && c === '`') {
      const close = findBacktick(src, i + 1);
      addSub(begin(), subs, src.slice(i + 1, close), 'bash');
      i = close + 1;
    } else if (c === '$') {
      i = readDollar(src, i, begin(), subs, pw);
    } else if (c === ';') {
      endStatement(src[i + 1] === ';' ? 2 : 1);
    } else if (c === '&') {
      if (src[i + 1] === '&') endStatement(2);
      else if (!pw && src[i + 1] === '>') redirect();
      else if (pw && !word && !words.length) {
        i += 1;
        start = i;
      } else endStatement(1);
    } else if (c === '|') {
      endStatement(src[i + 1] === '|' || (!pw && src[i + 1] === '&') ? 2 : 1);
    } else if (c === '(' || c === ')' || (pw && (c === '{' || c === '}'))) {
      endStatement(1);
    } else if (c === '<' || c === '>') {
      redirect();
    } else {
      begin().text += c;
      i += 1;
    }
  }
  endStatement(0);
  return statements;
}

// ---- Analysis: which statements run `git push`, where, and with what ----------------------------

const literal = (w) => (w && !w.dynamic && !w.subs.length ? w.text : null);

function gitOutput(dir, env, args) {
  const res = spawnSync('git', args, {
    cwd: dir,
    env: { ...baseEnv, ...env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' },
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    windowsHide: true,
  });
  return res.status === 0 ? res.stdout : null;
}

// A substitution that only prints the current branch is the one expansion worth reading.
function wordValue(w, subs, ctx) {
  if (w.dynamic) return null;
  let text = w.text;
  for (const index of w.subs) {
    const inner = subs[index].text.trim().replace(/\s+/g, ' ');
    if (!CURRENT_BRANCH.test(inner) || ctx.cwd == null) return null;
    const out = gitOutput(ctx.cwd, ctx.env, inner.split(' ').slice(1));
    if (out == null) return null;
    text = text.replace(`${MARK}${index}${MARK}`, out.trim());
  }
  return text;
}

function toNative(path) {
  const drive = process.platform === 'win32' && /^\/([a-zA-Z])(\/.*)?$/.exec(path);
  return drive ? `${drive[1].toUpperCase()}:${drive[2] ?? '/'}` : path;
}

function moveTo(base, target) {
  if (target == null) return null;
  let path = target;
  if (path === '~' || path.startsWith('~/')) path = join(homedir(), path.slice(1));
  path = toNative(path);
  if (isAbsolute(path)) return resolve(path);
  return base == null ? null : resolve(base, path);
}

function commandName(value) {
  if (value == null) return null;
  return value.replace(/\\/g, '/').split('/').pop().toLowerCase().replace(/\.(exe|cmd|bat|com)$/, '');
}

const shellQuote = (s) => `'${s.replace(/'/g, `'\\''`)}'`;

function analyzeScript(text, dialect, ctx, out, depth) {
  if (depth > 8) {
    if (/push/i.test(text)) out.unresolved.push('the command nests too deep to read');
    return;
  }
  const subs = [];
  let statements;
  try {
    statements = lex(text, dialect, subs);
  } catch (err) {
    if (/\bgit\b[\s\S]*\bpush\b/i.test(text)) out.unresolved.push(err instanceof Unresolved ? err.message : 'the command cannot be read');
    return;
  }
  for (const statement of statements) analyzeStatement(statement, dialect, subs, ctx, out, depth);
}

function analyzeStatement(statement, dialect, subs, ctx, out, depth) {
  for (const w of statement.words) {
    for (const index of w.subs) analyzeScript(subs[index].text, subs[index].dialect, { cwd: ctx.cwd, env: { ...ctx.env } }, out, depth + 1);
  }
  const pw = dialect === 'pwsh';
  if (pw) {
    const env = /^\s*\$env:([A-Za-z_]\w*)\s*=\s*(?:'([^']*)'|"([^"$`]*)"|([^\s'"$`]+))\s*$/i.exec(statement.raw);
    if (env) {
      ctx.env[env[1]] = env[2] ?? env[3] ?? env[4];
      return;
    }
    if (/^\s*\$env:[A-Za-z_]\w*\s*=/i.test(statement.raw)) {
      ctx.env[/^\s*\$env:([A-Za-z_]\w*)/i.exec(statement.raw)[1]] = null;
      return;
    }
  }
  const value = (w) => wordValue(w, subs, ctx);
  const local = {};
  let cwd = ctx.cwd;
  let ws = statement.words;
  const nested = (script, lang) => {
    if (script == null) {
      if (ws.some((w) => /push/i.test(w.text))) out.unresolved.push('a script it runs comes from a variable');
      return;
    }
    analyzeScript(script, lang, { cwd, env: { ...ctx.env, ...local } }, out, depth + 1);
  };
  const rest = (from) => {
    const values = ws.slice(from).map(value);
    return values.includes(null) ? null : values.join(' ');
  };
  for (;;) {
    while (ws.length && LEAD.has(literal(ws[0]))) ws = ws.slice(1);
    while (ws.length && literal(ws.at(-1)) === '}') ws = ws.slice(0, -1);
    while (!pw && ws.length && /^[A-Za-z_]\w*=/.test(ws[0].text)) {
      const key = ws[0].text.slice(0, ws[0].text.indexOf('='));
      const v = value(ws[0]);
      local[key] = v == null ? null : v.slice(key.length + 1);
      ws = ws.slice(1);
    }
    if (!ws.length) return;
    const name = commandName(value(ws[0]));
    const args = ws.slice(1).map(literal);
    if (name === 'env') {
      let i = 1;
      while (i < ws.length) {
        const t = literal(ws[i]);
        if (t == null) break;
        if (['-i', '-', '--ignore-environment', '-0', '--null', '-v', '--debug'].includes(t)) i += 1;
        else if (t === '-u' || t === '--unset') i += 2;
        else if (t.startsWith('--unset=')) i += 1;
        else if (t === '-C' || t === '--chdir') {
          cwd = moveTo(cwd, value(ws[i + 1] ?? newWord()));
          i += 2;
        } else if (t.startsWith('--chdir=')) {
          cwd = moveTo(cwd, t.slice(8));
          i += 1;
        } else if (t === '-S' || t === '--split-string') {
          const script = ws[i + 1] ? value(ws[i + 1]) : null;
          const tail = rest(i + 2);
          return nested(script == null || tail == null ? null : `${script} ${tail}`, 'bash');
        } else if (/^[A-Za-z_]\w*=/.test(t)) {
          local[t.slice(0, t.indexOf('='))] = t.slice(t.indexOf('=') + 1);
          i += 1;
        } else break;
      }
      ws = ws.slice(i);
      continue;
    }
    if (name === 'sudo' || name === 'doas') {
      let i = 1;
      while (i < ws.length && literal(ws[i])?.startsWith('-')) i += ['-u', '-g', '-h', '-p', '-C', '-D', '-r', '-t', '-U'].includes(literal(ws[i])) ? 2 : 1;
      ws = ws.slice(i);
      continue;
    }
    if (name === 'nice' || name === 'timeout' || name === 'stdbuf') {
      let i = 1;
      while (i < ws.length && literal(ws[i])?.startsWith('-')) i += ['-n', '-s', '-k', '-i', '-o', '-e'].includes(literal(ws[i])) ? 2 : 1;
      if (name === 'timeout') i += 1;
      ws = ws.slice(i);
      continue;
    }
    if (SHELLS.has(name)) {
      const flag = args.findIndex((t) => t != null && /^-[A-Za-z]*c[A-Za-z]*$/.test(t));
      if (flag >= 0 && ws[flag + 2]) nested(value(ws[flag + 2]), 'bash');
      return;
    }
    if (name === 'pwsh' || name === 'powershell') {
      for (let i = 1; i < ws.length; i += 1) {
        const t = literal(ws[i]);
        if (t == null) return nested(null);
        const opt = t.toLowerCase().replace(/^--?/, '');
        if (!t.startsWith('-') || (opt && 'command'.startsWith(opt))) return nested(rest(t.startsWith('-') ? i + 1 : i), 'pwsh');
        if (opt === 'ec' || (opt.startsWith('e') && 'encodedcommand'.startsWith(opt))) {
          const encoded = ws[i + 1] ? value(ws[i + 1]) : null;
          return nested(encoded == null ? null : Buffer.from(encoded, 'base64').toString('utf16le'), 'pwsh');
        }
        if (opt === 'f' || 'file'.startsWith(opt)) return;
        if (/^(ex|ep|executionpolicy|wd|workingdirectory|configurationname|of|outputformat|if|inputformat|w|windowstyle|settingsfile|custompipename)$/.test(opt)) i += 1;
      }
      return;
    }
    if (name === 'cmd') {
      const at = args.findIndex((t) => t != null && /^\/[ck]$/i.test(t));
      if (at >= 0) nested(rest(at + 2), 'bash');
      return;
    }
    if (name === 'eval') return nested(rest(1), 'bash');
    if (name === 'invoke-expression' || name === 'iex') return nested(rest(literal(ws[1])?.toLowerCase() === '-command' ? 2 : 1), 'pwsh');
    if (['cd', 'chdir', 'pushd', 'set-location', 'sl', 'push-location'].includes(name)) {
      const target = ws.slice(1).find((w) => !literal(w)?.startsWith('-') || literal(w) === '-');
      if (!target) ctx.cwd = pw ? null : homedir();
      else if (literal(target) === '-') ctx.cwd = null;
      else ctx.cwd = moveTo(ctx.cwd, value(target));
      return;
    }
    if (name === 'popd' || name === 'pop-location') {
      ctx.cwd = null;
      return;
    }
    if (!pw && name === 'export') {
      for (const w of ws.slice(1)) {
        const t = w.text;
        if (/^[A-Za-z_]\w*=/.test(t)) {
          const v = value(w);
          ctx.env[t.slice(0, t.indexOf('='))] = v == null ? null : v.slice(t.indexOf('=') + 1);
        }
      }
      return;
    }
    if (name === 'git') return analyzeGit(ws.slice(1).map(value), { ...ctx.env, ...local }, cwd, out, depth);
    if (name == null && ws.slice(1).some((w) => literal(w) === 'push')) out.unresolved.push('the program it runs comes from a variable');
    return;
  }
}

function analyzeGit(args, env, cwd, out, depth, globals = []) {
  let dir = cwd;
  let i = 0;
  const pushLater = (from) => args.slice(from).some((a) => a === 'push');
  while (i < args.length) {
    const t = args[i];
    if (t == null) {
      if (pushLater(i + 1)) out.unresolved.push('a git option comes from a variable');
      return;
    }
    if (t === '-C' || t === '-c' || /^--(git-dir|work-tree|namespace|super-prefix|attr-source|config-env)$/.test(t)) {
      const v = args[i + 1];
      if (v == null) {
        if (pushLater(i + 2)) out.unresolved.push(`the value of git \`${t}\` comes from a variable`);
        return;
      }
      if (t === '-C') dir = moveTo(dir, v);
      else globals.push(...(t === '-c' ? [t, v] : [`${t}=${v}`]));
      i += 2;
    } else if (/^--(git-dir|work-tree|namespace|super-prefix|attr-source|config-env)=/.test(t) || GIT_FLAGS.has(t)) {
      globals.push(t);
      i += 1;
    } else if (t.startsWith('-')) {
      return;
    } else break;
  }
  if (i >= args.length) return;
  const sub = args[i];
  if (sub === 'push') {
    out.pushes.push({ dir, env, globals, args: args.slice(i + 1) });
    return;
  }
  if (GIT_COMMANDS.has(sub) || dir == null) return;
  const alias = gitOutput(dir, env, [...globals, 'config', '--get', `alias.${sub}`]);
  if (alias == null) return;
  const tail = args.slice(i + 1);
  if (depth > 6 || tail.includes(null)) {
    out.unresolved.push(`the git alias \`${sub}\` cannot be expanded`);
    return;
  }
  const expansion = alias.trim();
  if (expansion.startsWith('!')) {
    analyzeScript(`${expansion.slice(1)} ${tail.map(shellQuote).join(' ')}`, 'bash', { cwd: dir, env: { ...env } }, out, depth + 1);
    return;
  }
  let words;
  try {
    words = (lex(expansion, 'bash')[0]?.words ?? []).map(literal);
  } catch {
    words = [null];
  }
  analyzeGit([...words, ...tail], env, dir, out, depth + 1, [...globals]);
}

// Exported for the tests: every `git push` the command runs, and why any of them cannot be read.
export function findPushes(command, dialect, cwd) {
  const out = { pushes: [], unresolved: [] };
  analyzeScript(command, dialect, { cwd, env: {} }, out, 0);
  return out;
}

// ---- Evaluation: the branches a push updates, against the profile ------------------------------

function parsePushArgs(args) {
  if (args.includes(null)) throw new Unresolved('a push argument comes from a variable or a command it cannot read');
  const p = { repo: null, refspecs: [], all: false, mirror: false, tags: false, followTags: null, dryRun: false, del: false };
  const positional = [];
  let options = true;
  for (let i = 0; i < args.length; i += 1) {
    const t = args[i];
    if (!options || !t.startsWith('-') || t === '-') {
      positional.push(t);
    } else if (t === '--') {
      options = false;
    } else if (t.startsWith('--')) {
      const eq = t.indexOf('=');
      const name = eq < 0 ? t : t.slice(0, eq);
      if (name === '--all' || name === '--branches') p.all = true;
      else if (name === '--mirror') p.mirror = true;
      else if (name === '--tags') p.tags = true;
      else if (name === '--follow-tags') p.followTags = true;
      else if (name === '--no-follow-tags') p.followTags = false;
      else if (name === '--dry-run') p.dryRun = true;
      else if (name === '--delete') p.del = true;
      else if (name === '--repo') {
        p.repo = eq < 0 ? args[i + 1] : t.slice(eq + 1);
        if (eq < 0) i += 1;
      } else if (eq < 0 && ['--push-option', '--receive-pack', '--exec'].includes(name)) i += 1;
    } else {
      for (let k = 1; k < t.length; k += 1) {
        if (t[k] === 'n') p.dryRun = true;
        else if (t[k] === 'd') p.del = true;
        else if (t[k] === 'o') {
          if (k === t.length - 1) i += 1;
          break;
        }
      }
    }
  }
  if (positional.length) p.repo = positional[0];
  for (let i = 1; i < positional.length; i += 1) {
    if (positional[i] === 'tag' && i + 1 < positional.length) {
      i += 1;
      p.refspecs.push(`refs/tags/${positional[i]}`);
    } else p.refspecs.push(positional[i]);
  }
  return p;
}

function readConfig(git) {
  const entries = new Map();
  for (const entry of (git(['config', '--list', '-z']) ?? '').split('\0')) {
    if (!entry) continue;
    const nl = entry.indexOf('\n');
    const key = nl < 0 ? entry : entry.slice(0, nl);
    if (!entries.has(key)) entries.set(key, []);
    entries.get(key).push(nl < 0 ? '' : entry.slice(nl + 1));
  }
  return { get: (key) => entries.get(key)?.at(-1) ?? null, all: (key) => entries.get(key) ?? [], keys: () => [...entries.keys()] };
}

export function readProfile(top) {
  for (const rel of PROFILE_FILES) {
    const file = join(top, rel);
    if (!existsSync(file)) continue;
    const values = { ...DEFAULTS };
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = /^- ([a-z_]+):(.*)$/.exec(line);
      if (m) values[m[1]] = m[2].replace(/<!--.*$/, '').replace(/`/g, '').trim();
    }
    return values;
  }
  return null;
}

// With no profile, the branches git-workflow detects: the default from the remote's HEAD, and
// `develop` as the integration branch when the remote has one.
function detectedProfile(git, remote) {
  const head = git(['symbolic-ref', '-q', `refs/remotes/${remote}/HEAD`])?.trim();
  const prefix = `refs/remotes/${remote}/`;
  const develop = git(['rev-parse', '--verify', '-q', `${prefix}develop`]);
  return {
    ...DEFAULTS,
    default_branch: head?.startsWith(prefix) ? head.slice(prefix.length) : DEFAULTS.default_branch,
    integration_branch: develop ? 'develop' : 'none',
  };
}

// Profile `tag_format`: X, Y and Z each stand for a number, everything else is literal, and a
// pre-release or build suffix (`-rc.1`, `+build.5`) also matches. `none` or empty matches nothing.
export function tagPattern(format) {
  const f = String(format ?? '').trim();
  if (!f || f === 'none') return null;
  const body = [...f].map((c) => (/[XYZ]/.test(c) ? '\\d+' : escapeRegExp(c))).join('');
  return new RegExp(`^${body}(?:[-+][0-9A-Za-z.+-]*)?$`);
}

function protectedBranches(profile) {
  const names = `${profile.protected_branches},${profile.default_branch},${profile.integration_branch}`.split(',');
  return new Set(names.map((s) => s.trim()).filter((s) => s && s !== 'none'));
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function globBody(p) {
  let out = '';
  let i = 0;
  while (i < p.length) {
    if (p.startsWith('**/', i) && (i === 0 || p[i - 1] === '/')) {
      out += '(?:.*/)?';
      i += 3;
    } else if (p.startsWith('/**', i) && i + 3 === p.length) {
      out += '/.*';
      i += 3;
    } else if (p === '**') {
      return '.*';
    } else if (p[i] === '*') {
      out += '[^/]*';
      while (p[i] === '*') i += 1;
    } else if (p[i] === '?') {
      out += '[^/]';
      i += 1;
    } else if (p[i] === '[' && p.indexOf(']', i + 2) > 0) {
      const close = p.indexOf(']', i + 2);
      const set = p.slice(i + 1, close);
      out += `[${set[0] === '!' ? `^${set.slice(1)}` : set}]`.replace(/\\/g, '\\\\');
      i = close + 1;
    } else if (p[i] === '\\' && i + 1 < p.length) {
      out += escapeRegExp(p[i + 1]);
      i += 2;
    } else {
      out += escapeRegExp(p[i]);
      i += 1;
    }
  }
  return out;
}

// Profile `direct_lane`: gitignore-style patterns, comma-separated, no brace expansion, `**/`
// also matching the root, the last matching pattern deciding; `none` matches nothing.
export function compileLane(value) {
  const rules = [];
  for (const raw of String(value ?? 'none').split(',')) {
    let p = raw.trim();
    if (!p || p === 'none') continue;
    const negate = p.startsWith('!');
    if (negate || p.startsWith('\\!') || p.startsWith('\\#')) p = p.slice(1);
    const dirOnly = p.endsWith('/');
    p = p.replace(/\/+$/, '');
    const anchored = p.includes('/');
    p = p.replace(/^\//, '');
    if (!p) continue;
    rules.push({ negate, dirOnly, re: new RegExp(`^${anchored ? '' : '(?:.*/)?'}${globBody(p)}$`) });
  }
  return {
    empty: rules.length === 0,
    matches(path) {
      const parts = path.split('/');
      let state = false;
      for (const rule of rules) {
        for (let k = parts.length; k >= 1; k -= 1) {
          if (k === parts.length && rule.dirOnly) continue;
          if (rule.re.test(parts.slice(0, k).join('/'))) {
            state = !rule.negate;
            break;
          }
        }
      }
      return state;
    },
  };
}

const deny = (reason) => ({ decision: 'deny', reason });

function evaluatePush(push) {
  const { dir, env, globals } = push;
  if (dir == null) throw new Unresolved('it cannot tell which directory the push runs in');
  if (Object.entries(env).some(([key, v]) => v == null && /^GIT_/i.test(key))) throw new Unresolved('a GIT_ variable comes from a variable');
  let isDir = false;
  try {
    isDir = statSync(dir).isDirectory();
  } catch {}
  if (!isDir) throw new Unresolved(`the push runs in ${dir}, which does not exist`);
  const p = parsePushArgs(push.args);
  if (p.dryRun) return null;
  if (p.all || p.mirror) return deny(`\`${p.all ? '--all' : '--mirror'}\` pushes every branch, the protected ones included. Push one named branch instead.`);
  const git = (args) => gitOutput(dir, env, [...globals, ...args]);
  const top = git(['rev-parse', '--show-toplevel']);
  if (top == null) throw new Unresolved('it does not run inside a git work tree');
  const cfg = readConfig(git);
  const head = git(['symbolic-ref', '-q', '--short', 'HEAD']);
  const current = head ? head.trim() : null;
  const remoteArg = p.repo ?? (current && cfg.get(`branch.${current}.pushremote`)) ?? cfg.get('remote.pushdefault')
    ?? (current && cfg.get(`branch.${current}.remote`)) ?? 'origin';
  let remote = cfg.get(`remote.${remoteArg}.url`) != null ? remoteArg : null;
  for (const key of remote ? [] : cfg.keys()) {
    const m = /^remote\.(.+)\.(url|pushurl)$/.exec(key);
    if (m && cfg.all(key).includes(remoteArg)) remote = m[1];
  }
  const profile = readProfile(top.trim()) ?? detectedProfile(git, remote ?? remoteArg);
  const guarded = protectedBranches(profile);
  const lane = compileLane(profile.direct_lane);
  const mirror = remote ? cfg.get(`remote.${remote}.mirror`) : null;
  if (!p.refspecs.length && !p.tags && mirror != null && /^(|true|yes|on|1)$/i.test(mirror)) {
    return deny(`\`${remote}\` is configured as a mirror, so a push to it updates every branch, the protected ones included.`);
  }
  const pushConfig = remote ? cfg.all(`remote.${remote}.push`) : [];

  const branchNames = (ref) => {
    if (ref === 'HEAD' || ref === '@') throw new Unresolved('`HEAD` as the destination names no branch it can read');
    if (ref.startsWith('refs/heads/')) return [ref.slice(11)];
    if (ref.startsWith('refs/')) return [];
    return ref.startsWith('heads/') ? [ref.slice(6), ref] : [ref];
  };
  const qualified = (ref) => (ref.startsWith('refs/') ? ref : `refs/heads/${ref}`);
  const mapped = (src) => {
    const full = qualified(src);
    const names = [];
    for (const spec of pushConfig) {
      const s = spec.replace(/^\+/, '');
      const colon = s.indexOf(':');
      if (colon < 0) continue;
      const from = qualified(s.slice(0, colon));
      const to = s.slice(colon + 1);
      if (!from.includes('*')) {
        if (from === full) names.push(...branchNames(to));
        continue;
      }
      const [a, b] = from.split('*');
      if (full.length >= a.length + b.length && full.startsWith(a) && full.endsWith(b)) names.push(...branchNames(to.replace('*', full.slice(a.length, full.length - b.length))));
    }
    return names;
  };
  const localBranches = () => (git(['for-each-ref', '--format=%(refname)', 'refs/heads/']) ?? '').split('\n').filter(Boolean)
    .map((ref) => ({ names: [ref.slice(11)], src: ref, raw: ref }));
  const expand = (raw, del) => {
    let rs = raw.startsWith('+') ? raw.slice(1) : raw;
    if (rs.startsWith('^')) return [];
    if (rs === '' || rs === ':') return localBranches();
    if (del) return [{ names: branchNames(rs), deletion: true, raw }];
    const colon = rs.indexOf(':');
    const src = colon < 0 ? rs : rs.slice(0, colon);
    const dst = colon < 0 ? '' : rs.slice(colon + 1);
    if (src === '') return [{ names: branchNames(dst), deletion: true, raw }];
    const pattern = dst || src;
    if (pattern.includes('*')) return [{ pattern: qualified(pattern), raw }];
    if (dst) return [{ names: branchNames(dst), src, raw }];
    if (src === 'HEAD' || src === '@') {
      if (!current) throw new Unresolved('HEAD is detached, so `HEAD` names no branch');
      return [{ names: [current, ...mapped(current)], src: 'HEAD', raw }];
    }
    return [{ names: [...branchNames(src), ...mapped(src)], src, raw }];
  };
  const byPushDefault = (mode) => {
    if (mode === 'nothing') return [];
    if (mode === 'matching') return localBranches();
    if (!current) throw new Unresolved('HEAD is detached, so a push without a refspec has no branch to name');
    const merge = cfg.get(`branch.${current}.merge`)?.replace(/^refs\/heads\//, '') ?? null;
    if (mode === 'upstream' || mode === 'tracking') {
      if (!merge) throw new Unresolved(`\`${current}\` has no upstream branch`);
      return [{ names: [merge], src: 'HEAD', raw: 'HEAD' }];
    }
    // `current` and `simple` push to the branch's own name; `simple` refuses an upstream of another name.
    return [{ names: [current], src: 'HEAD', raw: 'HEAD' }];
  };

  let updates;
  if (p.refspecs.length) updates = p.refspecs.flatMap((rs) => expand(rs, p.del));
  else if (p.tags) updates = [];
  else if (pushConfig.length) updates = pushConfig.flatMap((rs) => expand(rs, false));
  else updates = byPushDefault((cfg.get('push.default') ?? 'simple').toLowerCase());

  for (const u of updates) {
    if (u.pattern) {
      const [a, b] = u.pattern.split('*');
      const hit = [...guarded].find((name) => {
        const ref = `refs/heads/${name}`;
        return ref.length >= a.length + b.length && ref.startsWith(a) && ref.endsWith(b);
      });
      if (hit) return deny(`the refspec \`${u.raw}\` can update the protected branch \`${hit}\`. Name the branches it should push instead.`);
      continue;
    }
    const hit = u.names.find((name) => guarded.has(name));
    if (!hit) continue;
    if (u.deletion) return deny(`this push would delete the protected branch \`${hit}\`.`);
    if (lane.empty) {
      return deny(`this push would update the protected branch \`${hit}\`, and profile \`direct_lane\` is none, so no path may be pushed there directly. Push a feature branch and open a pull request instead.`);
    }
    const commit = git(['rev-parse', '--verify', '-q', `${u.src}^{commit}`])?.trim();
    if (!commit) throw new Unresolved(`\`${u.src}\` does not name a commit`);
    const tracking = remote ? git(['rev-parse', '--verify', '-q', `refs/remotes/${remote}/${hit}`])?.trim() : null;
    const listed = tracking
      ? git(['diff', '--name-only', '--no-renames', '-z', tracking, commit, '--'])
      : git(['ls-tree', '-r', '--name-only', '-z', commit]);
    if (listed == null) throw new Unresolved('git could not list the paths it changes');
    const outside = listed.split('\0').filter(Boolean).filter((path) => !lane.matches(path));
    if (outside.length) {
      const shown = outside.slice(0, 5).map((path) => `\`${path}\``).join(', ');
      return deny(`this push would update the protected branch \`${hit}\` with ${outside.length} path(s) outside profile \`direct_lane\` (${shown}${outside.length > 5 ? ', ...' : ''}). Push a feature branch and open a pull request instead.`);
    }
  }

  const release = releaseTags({ p, git, cfg, remote, updates, pattern: tagPattern(profile.tag_format) });
  if (!release.length) return null;
  const named = release.map((name) => `\`${name}\``).join(', ');
  return { decision: 'ask', reason: `this push carries ${named}, which profile \`tag_format\` (\`${profile.tag_format}\`) marks as a release tag; pushing one is the owner's step (\`git-create-release\`).` };
}

// The tags matching profile `tag_format` that the push would create, move or delete on the remote.
function releaseTags({ p, git, cfg, remote, updates, pattern }) {
  if (!pattern) return [];
  const local = (git(['for-each-ref', '--format=%(refname:strip=2)%09%(objecttype)%09%(*objectname)', 'refs/tags/']) ?? '')
    .split('\n').filter(Boolean).map((line) => {
      const [name, type, peeled] = line.split('\t');
      return { name, annotated: type === 'tag', peeled };
    });
  const found = new Set();
  const add = (name) => {
    if (name && pattern.test(name)) found.add(name);
  };
  const everyLocal = () => local.forEach((t) => add(t.name));
  const asTag = (ref) => {
    if (ref.startsWith('refs/tags/')) return ref.slice(10);
    if (ref.startsWith('refs/') || !local.some((t) => t.name === ref)) return null;
    return git(['rev-parse', '--verify', '-q', `refs/heads/${ref}`]) == null ? ref : null;
  };
  if (p.tags) everyLocal();
  for (const raw of p.refspecs) {
    const rs = raw.replace(/^\+/, '');
    const colon = rs.indexOf(':');
    const src = colon < 0 ? rs : rs.slice(0, colon);
    const dst = colon < 0 ? '' : rs.slice(colon + 1);
    const target = dst || src;
    if (target.includes('*')) {
      if (target.startsWith('refs/tags/')) everyLocal();
    } else if (p.del || !src) {
      add(target.replace(/^refs\/tags\//, ''));
    } else if (dst) {
      add(dst.startsWith('refs/tags/') ? dst.slice(10) : asTag(src) && dst);
    } else {
      add(asTag(src));
    }
  }
  const follow = p.followTags ?? /^(true|yes|on|1)$/i.test(cfg.get('push.followtags') ?? '');
  if (follow) {
    for (const u of updates) {
      if (!u.src || u.deletion) continue;
      const commit = git(['rev-parse', '--verify', '-q', `${u.src}^{commit}`])?.trim();
      if (!commit) continue;
      const fresh = new Set((git(['rev-list', commit, '--not', remote ? `--remotes=${remote}` : '--remotes']) ?? '').split('\n').filter(Boolean));
      fresh.add(commit);
      for (const t of local) if (t.annotated && fresh.has(t.peeled)) add(t.name);
    }
  }
  return [...found].sort();
}

// The decision for a call - { decision: 'deny' | 'ask', reason } - or null to let it through.
// A deny anywhere in the command wins over an ask.
export function decide(input, options = {}) {
  baseEnv = options.env ?? process.env;
  if (!input || (input.tool_name !== 'Bash' && input.tool_name !== 'PowerShell')) return null;
  const command = input.tool_input?.command;
  if (typeof command !== 'string' || !/git|-e\w*\s+[A-Za-z0-9+/=]{16,}/i.test(command)) return null;
  const dialect = input.tool_name === 'PowerShell' ? 'pwsh' : 'bash';
  const unresolved = (why) => deny(`${PREFIX}it cannot tell which branches this push updates: ${why}. Name the remote and the branch, as in \`git push origin <branch>\`.`);
  let found;
  try {
    found = findPushes(command, dialect, toNative(input.cwd || process.cwd()));
  } catch (err) {
    return /\bgit\b[\s\S]*\bpush\b/i.test(command) ? unresolved(`the guard failed (${err.message})`) : null;
  }
  if (found.unresolved.length) return unresolved(found.unresolved[0]);
  let ask = null;
  for (const push of found.pushes) {
    try {
      const result = evaluatePush(push);
      if (result?.decision === 'deny') return { decision: 'deny', reason: `${PREFIX}${result.reason}` };
      if (result && !ask) ask = { decision: 'ask', reason: `${PREFIX}${result.reason}` };
    } catch (err) {
      return unresolved(err instanceof Unresolved ? err.message : `the guard failed (${err.message})`);
    }
  }
  return ask;
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return;
  }
  const result = decide(input);
  if (result) {
    process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: result.decision, permissionDecisionReason: result.reason } })}\n`);
  }
}

if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) main();
