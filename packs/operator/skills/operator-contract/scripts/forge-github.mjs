#!/usr/bin/env node
// The forge contract on GitHub: every code-host call the operator layer makes - discovery and the
// operator-* skills - goes through this one script, which the skills reach through profile
// `forge_cli` (references/forge-contract.md). Every answer is JSON.
//
// Contract subcommands, normalized:
//   pr list                       [pr]       open pull requests
//   pr view <n>                   pr
//   pr create --base <b> --head <h> --title <t> --body-file <f> [--draft]   pr
//   pr ready <n>                  pr
//   pr draft <n>                  pr         back to draft: QA capacity goes only to the drafts admission promotes
//   branch rename <n> --to <name> pr         renames the head branch; the open pull request follows it.
//                                 A head on a fork is refused (exit 2): the pipeline cannot push to it
//   checks <sha>                  { sha, state: none|pending|success|failure, runs: [{ name, state, url }] }
//                                 the deciding workflows only (operator_config ciWorkflows), as discovery judges them
//   threads <n> [--unresolved] [--resolve <id> --body <text>]
//                                 [{ id, resolved, path, line, comments: [{ author, body, createdAt }] }]
//   claim take|release <n> [--takeover]
//                                 { pr, claimed, changed } - or { pr, claimed: false, held: true } with exit 3
//                                 when take finds the processing label (operator_config) already standing;
//                                 --takeover takes a claim the contract lets this run take over, past that check
//   factor set|clear <n> --name <f>   { pr, factor, set }
//   comment <n> --body-file <f>   { pr, url }
//   notes <n>                     [{ id, kind: comment|review, author, authorRole: owner|member|other, state,
//                                    body, inline, createdAt, url }] in time order; an empty commented review
//                                    carries its inline comments' bodies, as discovery reads them
//   merge <n> --method squash|merge|rebase   { pr, state, mergeCommit }
//
//   pr = { number, url, title, body, draft, state: open|merged|closed, head: { ref, sha },
//          base: { ref }, mergeable: clean|conflicting|unknown, labels, milestone, createdAt, author }
//
// Extensions the operator skills and discovery need beyond the core contract, part of it here:
//   pr edit <n> [--claim [--takeover]] [--milestone <title>] [--title <t>] [--body-file <f>]
//               [--add-label <l>]... [--remove-label <l>]...
//                                 pr         a phase hand-off, or a claim with a milestone move, is one edit,
//                                 title and body included; --claim adds the processing label after the check
//                                 `claim take` makes, answering { pr, claimed: false, held: true } (exit 3)
//                                 instead of editing anything
//   A missing or empty option value, one that is itself a flag of this script, or a flag the subcommand
//   does not read is a usage error (exit 2).
//   pr body <n>                   the body as plain text, for a file the review reads
//   pr files <n>                  { pr, files: [path] }   the conflict gate and the merge gates read them
//   events <n>                    [{ id, event: labeled|unlabeled, label, createdAt }]
//
// Configuration: OPERATOR_CONFIG names the operator configuration file (profile `operator_config`);
// it supplies the processing label, the deciding CI workflows (`ciWorkflows`) and the author
// associations allowed to speak for the project (`allowedAuthors`); references/operator-config.md
// is its schema, and a file missing a required key is refused (exit 2). A platform's implementation
// is named `forge-<platform>`, so a tool watching for claims can recognize it by name.
//
// Imported as a library, the discovery readers below return GitHub's own shapes for discovery:
// GitHub's own field names (number, isDraft, isCrossRepository, milestone.title, labels[].name, headRefOid, comments,
// reviews, mergeable), workflow runs, label events and an unresolved-thread count.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** A command line this script cannot act on: exit 2, nothing done. */
export class UsageError extends Error {}

const configs = new Map();

/**
 * The operator configuration at `path` (default OPERATOR_CONFIG), read once per path. A library
 * caller that already holds its configuration passes it to the functions that take one instead.
 */
export function operatorConfig(path = process.env.OPERATOR_CONFIG) {
  if (!path) throw new UsageError('OPERATOR_CONFIG must name the operator configuration file (profile operator_config)');
  const absolute = resolve(path);
  if (!configs.has(absolute)) configs.set(absolute, checkOperatorConfig(JSON.parse(readFileSync(absolute, 'utf8')), absolute));
  return configs.get(absolute);
}

const REQUIRED_ROLES = {
  milestones: ['queue', 'development', 'verification', 'humanReview', 'mergeQueue'],
  labels: ['processing', 'accepted', 'onhold', 'revalidate', 'rejected', 'cancelled', 'question'],
};

/** The configuration as given, or a usage error naming the first required key it lacks (references/operator-config.md). */
export function checkOperatorConfig(config, source = 'operator configuration') {
  const missing = (key) => { throw new UsageError(`${source}: missing required key ${key} (references/operator-config.md)`); };
  for (const [group, roles] of Object.entries(REQUIRED_ROLES)) {
    for (const role of roles) if (typeof config?.[group]?.[role] !== 'string' || config[group][role] === '') missing(`${group}.${role}`);
  }
  if ((config.clarifySlots ?? []).length > 0 && !config.milestones.clarification) missing('milestones.clarification');
  for (const key of ['allowedAuthors', 'slots']) if (!Array.isArray(config[key]) || config[key].length === 0) missing(key);
  return config;
}

/** The one place this layer starts `gh`; every reader and command takes a runner so tests inject one. */
export function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

const PR_FIELDS = 'number,url,title,body,isDraft,state,headRefName,headRefOid,baseRefName,mergeable,labels,milestone,createdAt,author';
const MERGEABLE = { MERGEABLE: 'clean', CONFLICTING: 'conflicting' };

/** A pull request in the contract's shape, from `gh pr view/list --json` fields. */
export function normalizePr(raw) {
  return {
    number: raw.number,
    url: raw.url,
    title: raw.title,
    body: raw.body ?? '',
    draft: Boolean(raw.isDraft),
    state: String(raw.state ?? '').toLowerCase(),
    head: { ref: raw.headRefName, sha: raw.headRefOid },
    base: { ref: raw.baseRefName },
    mergeable: MERGEABLE[raw.mergeable] ?? 'unknown',
    labels: (raw.labels ?? []).map((label) => label.name),
    milestone: raw.milestone?.title ?? null,
    createdAt: raw.createdAt,
    author: raw.author?.login ?? null,
  };
}

export function listPrs(run = gh) {
  return JSON.parse(run(['pr', 'list', '--state', 'open', '--limit', '200', '--json', PR_FIELDS])).map(normalizePr);
}

export function viewPr(number, run = gh) {
  return normalizePr(JSON.parse(run(['pr', 'view', String(number), '--json', PR_FIELDS])));
}

export function createPr({ base, head, title, bodyFile, draft = false }, run = gh) {
  if (!base || !head || !title || !bodyFile) throw new UsageError('pr create needs --base, --head, --title and --body-file');
  const url = run(['pr', 'create', '--base', base, '--head', head, '--title', title, '--body-file', bodyFile, ...(draft ? ['--draft'] : [])]).trim().split('\n').at(-1);
  const number = Number(/\/pull\/(\d+)/.exec(url)?.[1]);
  if (!Number.isInteger(number)) throw new Error(`gh pr create printed no pull request URL: ${url}`);
  return viewPr(number, run);
}

export function readyPr(number, run = gh) {
  run(['pr', 'ready', String(number)]);
  return viewPr(number, run);
}

export function draftPr(number, run = gh) {
  run(['pr', 'ready', String(number), '--undo']);
  return viewPr(number, run);
}

/**
 * Renames a pull request's head branch on the platform, so an adopted pull request's branch names the
 * slot it lives in; the open pull request follows the rename. A retry finds the branch renamed and
 * changes nothing. A head on a fork is refused: the pipeline cannot push to it.
 */
export function renameBranch(number, to, run = gh) {
  if (!to) throw new UsageError('branch rename needs --to');
  const head = JSON.parse(run(['pr', 'view', String(number), '--json', 'headRefName,isCrossRepository,state']));
  if (head.isCrossRepository) throw new UsageError(`pull request ${number} has its head on a fork: its branch cannot be renamed or pushed to`);
  if (String(head.state ?? '').toUpperCase() !== 'OPEN') throw new UsageError(`pull request ${number} is not open`);
  if (head.headRefName !== to) {
    const branch = head.headRefName.split('/').map(encodeURIComponent).join('/');
    run(['api', '-X', 'POST', `repos/{owner}/{repo}/branches/${branch}/rename`, '-f', `new_name=${to}`]);
  }
  return viewPr(number, run);
}

/**
 * One edit, so a hand-off moves the milestone, drops the claim and replaces the title or body together
 * or not at all; with --claim, the held check comes first and a held pull request is left untouched.
 */
export function editPr(number, { milestone, title, bodyFile, add = [], remove = [], claim: take = false, takeover = false } = {}, run = gh) {
  const processing = operatorConfig().labels.processing;
  if (add.includes(processing)) throw new UsageError(`${processing} is the claim: use pr edit --claim or claim take`);
  if (takeover && !take) throw new UsageError('--takeover goes with --claim');
  const standing = take && viewPr(number, run).labels.includes(processing);
  // A label already standing is another run's claim unless the contract lets this run take it over.
  if (standing && !takeover) return { pr: number, claimed: false, held: true };
  if (take && !standing) add = [...add, processing];
  const args = ['pr', 'edit', String(number)];
  if (milestone) args.push('--milestone', milestone);
  if (title) args.push('--title', title);
  if (bodyFile) args.push('--body-file', bodyFile);
  for (const label of add) args.push('--add-label', label);
  for (const label of remove) args.push('--remove-label', label);
  if (args.length === 3 && standing) return { pr: number, claimed: true, changed: false, takenOver: true };
  if (args.length === 3) throw new UsageError('pr edit needs --claim, --milestone, --title, --body-file, --add-label or --remove-label');
  run(args);
  return viewPr(number, run);
}

export function prFiles(number, run = gh) {
  return { pr: number, files: (JSON.parse(run(['pr', 'view', String(number), '--json', 'files'])).files ?? []).map((file) => file.path) };
}

export function prBody(number, run = gh) {
  return JSON.parse(run(['pr', 'view', String(number), '--json', 'body'])).body ?? '';
}

const FAILED_RUN = new Set(['failure', 'cancelled', 'timed_out', 'startup_failure', 'action_required']);

/** The deciding workflows' latest runs, one per workflow (only `ciWorkflows` when the config names them). */
export function decidingRuns(runs, config) {
  const deciding = config.ciWorkflows ? runs.filter((run) => config.ciWorkflows.includes(run.workflowName)) : runs;
  const latest = new Map();
  for (const run of deciding) {
    const seen = latest.get(run.workflowName);
    if (!seen || Date.parse(run.createdAt) >= Date.parse(seen.createdAt)) latest.set(run.workflowName, run);
  }
  return [...latest.values()];
}

/** Which runs, at which attempt, decide CI now: a re-run changes it while the state may repeat. */
export function ciRunsMark(runs, config = operatorConfig()) {
  const ids = decidingRuns(runs, config).map((run) => `${run.databaseId ?? run.workflowName}.${run.attempt ?? 1}`).sort();
  return ids.length === 0 ? 'none' : createHash('sha256').update(ids.join(',')).digest('hex').slice(0, 8);
}

/**
 * The head's CI state from its workflow runs, the latest attempt of each workflow. The host's token
 * cannot read check runs, but it reads Actions runs, and they cover every workflow, including the
 * required checks.
 */
export function ciFromRuns(runs, config = operatorConfig()) {
  // Only the workflows carrying the required checks decide; a helper workflow a label event cancelled
  // is not a red build.
  const outcomes = decidingRuns(runs, config);
  if (outcomes.length === 0) return 'none';
  // A workflow that already failed decides it: implementation starts on the fix instead of waiting for
  // the slowest suite, whose run for this head the fix's push supersedes anyway.
  if (outcomes.some((run) => run.status === 'completed' && FAILED_RUN.has(run.conclusion))) return 'failure';
  if (outcomes.some((run) => run.status !== 'completed')) return 'pending';
  return 'success';
}

/** One deciding run's state in the contract, by the same conclusion classes `ciFromRuns` uses. */
function runState(run) {
  if (run.status !== 'completed') return 'pending';
  return FAILED_RUN.has(run.conclusion) ? 'failure' : 'success';
}

/**
 * The checks that decide a commit: the deciding workflows (`operator_config` `ciWorkflows`), the latest
 * attempt of each, judged exactly as discovery judges them. `none` while no deciding workflow has run.
 */
export function checks(sha, run = gh, config = operatorConfig()) {
  if (!/^[0-9a-f]{7,40}$/.test(sha ?? '')) throw new UsageError(`checks needs a commit sha (got ${sha})`);
  const runs = JSON.parse(run(['run', 'list', '--commit', sha, '--limit', '100', '--json', 'databaseId,attempt,workflowName,status,conclusion,createdAt,url']));
  return { sha, state: ciFromRuns(runs, config), runs: decidingRuns(runs, config).map((entry) => ({ name: entry.workflowName, state: runState(entry), url: entry.url })) };
}

const THREADS_QUERY = 'query($owner:String!,$name:String!,$number:Int!,$endCursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100,after:$endCursor){nodes{id isResolved path line comments(first:100){nodes{author{login} body createdAt}}} pageInfo{hasNextPage endCursor}}}}}';

/** Review threads on one PR, every page. */
export function threads(number, { unresolved = false } = {}, run = gh) {
  const output = run(['api', 'graphql', '--paginate', '-F', 'owner={owner}', '-F', 'name={repo}', '-F', `number=${number}`, '-f', `query=${THREADS_QUERY}`,
    '--jq', '.data.repository.pullRequest.reviewThreads.nodes[] | @json']);
  return output.split('\n').filter(Boolean).map((line) => JSON.parse(line)).map((node) => ({
    id: node.id,
    resolved: node.isResolved,
    path: node.path,
    line: node.line,
    comments: (node.comments?.nodes ?? []).map((comment) => ({ author: comment.author?.login ?? null, body: comment.body, createdAt: comment.createdAt })),
  })).filter((thread) => !unresolved || !thread.resolved);
}

/** Replies to a review thread and resolves it: a reply without the resolve comes back on the next pass. */
export function resolveThread(id, body, run = gh) {
  if (!id || !body?.trim()) throw new UsageError('--resolve needs a thread id and --body');
  // A retry after the reply landed finds the thread resolved and adds no second reply.
  const resolved = run(['api', 'graphql', '-f', 'query=query($id:ID!){node(id:$id){... on PullRequestReviewThread{isResolved}}}', '-f', `id=${id}`, '--jq', '.data.node.isResolved']).trim();
  if (resolved === 'true') return { id, resolved: true, changed: false };
  run(['api', 'graphql', '-f', 'query=mutation($id:ID!,$body:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$id,body:$body}){comment{id}}}', '-f', `id=${id}`, '-f', `body=${body}`]);
  run(['api', 'graphql', '-f', 'query=mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{id isResolved}}}', '-f', `id=${id}`]);
  return { id, resolved: true, changed: true };
}

/** The processing label is the claim on GitHub; `changed` says whether this call moved it. */
export function claim(action, number, run = gh, { takeover = false } = {}) {
  if (takeover && action !== 'take') throw new UsageError('--takeover goes with claim take');
  const label = operatorConfig().labels.processing;
  const before = viewPr(number, run).labels.includes(label);
  if (action === 'take') {
    // A label already standing is a claim this call did not take: the skill decides whether it may
    // take it over (operator-contract), never this script.
    if (before && takeover) return { pr: number, claimed: true, changed: false, takenOver: true };
    if (before) return { pr: number, claimed: false, held: true };
    run(['pr', 'edit', String(number), '--add-label', label]);
    return { pr: number, claimed: true, changed: true };
  }
  if (action === 'release') {
    if (before) run(['pr', 'edit', String(number), '--remove-label', label]);
    return { pr: number, claimed: false, changed: before };
  }
  throw new UsageError(`claim expects take or release (got ${action})`);
}

export function factor(action, number, name, run = gh) {
  if (!name) throw new UsageError('factor needs --name');
  if (action !== 'set' && action !== 'clear') throw new UsageError(`factor expects set or clear (got ${action})`);
  if (name === operatorConfig().labels.processing) throw new UsageError(`${name} is the claim, not a factor: use claim take|release`);
  run(['pr', 'edit', String(number), action === 'set' ? '--add-label' : '--remove-label', name]);
  return { pr: number, factor: name, set: action === 'set' };
}

export function comment(number, bodyFile, run = gh) {
  if (!bodyFile) throw new UsageError('comment needs --body-file');
  const url = run(['pr', 'comment', String(number), '--body-file', bodyFile]).trim().split('\n').at(-1);
  return { pr: number, url };
}

/** Merges by the named method; never `--admin`, never deletes the branch (the profile keeps remote branches). */
export function merge(number, method, run = gh) {
  if (!['squash', 'merge', 'rebase'].includes(method)) throw new UsageError(`merge expects --method squash, merge or rebase (got ${method})`);
  run(['pr', 'merge', String(number), `--${method}`]);
  const after = JSON.parse(run(['pr', 'view', String(number), '--json', 'state,mergeCommit']));
  return { pr: number, state: String(after.state ?? '').toLowerCase(), mergeCommit: after.mergeCommit?.oid ?? null };
}

/** An issue's label events, read through gh's own jq (no jq binary needed). */
export function readLabelEvents(number, run = gh) {
  return run(['api', '--paginate', `repos/{owner}/{repo}/issues/${number}/events?per_page=100`, '--jq', '.[] | select(.event == "labeled" or .event == "unlabeled") | {id, event, created_at, label: {name: .label.name}} | @json'])
    .split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

/** Label events in the contract's shape. */
export function events(number, run = gh) {
  return readLabelEvents(number, run).map((event) => ({ id: event.id, event: event.event, label: event.label?.name ?? null, createdAt: event.created_at }));
}

// Discovery readers: GitHub's own shapes, for a discovery implementation.

/**
 * The list returns at most the first 100 comments and reviews of each pull request, so a long PR would
 * read as if its newest reports never happened; a PR at that cap has its whole conversation read again.
 */
export const LIST_CONVERSATION_CAP = 100;

export function readPullRequests(run = gh) {
  const prs = JSON.parse(run(['pr', 'list', '--state', 'open', '--limit', '200', '--json', 'number,isDraft,isCrossRepository,milestone,labels,headRefOid,headRefName,createdAt,body,comments,reviews,mergeable']));
  for (const pr of prs) {
    if ((pr.comments ?? []).length < LIST_CONVERSATION_CAP && (pr.reviews ?? []).length < LIST_CONVERSATION_CAP) continue;
    const full = JSON.parse(run(['pr', 'view', String(pr.number), '--json', 'comments,reviews']));
    pr.comments = full.comments ?? [];
    pr.reviews = full.reviews ?? [];
  }
  return prs;
}

/** Workflow runs on one commit; Actions keeps every attempt, discovery's `ciFromRuns` takes the latest. */
export function readRuns(head, run = gh) {
  return JSON.parse(run(['run', 'list', '--commit', head, '--limit', '100', '--json', 'databaseId,attempt,workflowName,status,conclusion,createdAt']));
}

/** Unresolved review threads on one PR, every page: a merge refuses while any stands, so resolving one asks again. */
export function readUnresolvedThreads(number, run = gh) {
  const query = 'query($owner:String!,$name:String!,$number:Int!,$endCursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100,after:$endCursor){nodes{isResolved} pageInfo{hasNextPage endCursor}}}}}';
  const output = run(['api', 'graphql', '--paginate', '-F', 'owner={owner}', '-F', 'name={repo}', '-F', `number=${number}`, '-f', `query=${query}`,
    '--jq', '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | 1']);
  return output.split('\n').filter(Boolean).length;
}

/**
 * An inline review keeps its text on its comments, so its own body is empty whoever wrote it - a
 * pipeline reply in a review thread arrives as one. Each empty commented review gets its comments'
 * bodies as `inline`, one query per PR that has any, for discovery's owner-input filter to judge like
 * other text.
 */
export function readInlineReviews(prs, run = gh) {
  const query = 'query($ids:[ID!]!){nodes(ids:$ids){... on PullRequestReview{id comments(first:100){nodes{body}}}}}';
  for (const pr of prs) {
    const empty = (pr.reviews ?? []).filter((review) => review.state === 'COMMENTED' && (review.body ?? '').trim() === '');
    for (let start = 0; start < empty.length; start += 100) {
      const chunk = empty.slice(start, start + 100);
      const output = run(['api', 'graphql', '-f', `query=${query}`, ...chunk.flatMap((review) => ['-f', `ids[]=${review.id}`]),
        '--jq', '.data.nodes[] | {id, bodies: [.comments.nodes[].body]}']);
      const bodies = new Map(output.split('\n').filter(Boolean).map((line) => JSON.parse(line)).map((node) => [node.id, node.bodies]));
      for (const review of chunk) review.inline = bodies.get(review.id) ?? [];
    }
  }
  return prs;
}

/** One PR's conversation in the shape discovery reads: comments, and reviews with their inline bodies. */
export function readConversation(number, run = gh) {
  const pr = JSON.parse(run(['pr', 'view', String(number), '--json', 'number,comments,reviews']));
  return readInlineReviews([pr], run)[0];
}

/** The owner, then the other accounts operator_config allows to speak for the project, then everyone else. */
export function authorRole(association, config = operatorConfig()) {
  if (!config.allowedAuthors.includes(association)) return 'other';
  return association === 'OWNER' ? 'owner' : 'member';
}

/** The conversation in the contract's shape, oldest first. */
export function notes(number, run = gh, config = operatorConfig()) {
  const pr = readConversation(number, run);
  const items = [
    ...(pr.comments ?? []).map((item) => ({ ...item, kind: 'comment', time: item.createdAt })),
    ...(pr.reviews ?? []).map((item) => ({ ...item, kind: 'review', time: item.submittedAt ?? item.createdAt })),
  ].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  return items.map((item) => ({
    id: item.id,
    kind: item.kind,
    author: item.author?.login ?? null,
    authorRole: authorRole(item.authorAssociation, config),
    ...(item.kind === 'review' ? { state: String(item.state ?? '').toLowerCase() } : {}),
    body: item.body ?? '',
    ...(item.inline ? { inline: item.inline } : {}),
    createdAt: item.time,
    url: item.url ?? null,
  }));
}

/** The options that take a value; every other flag is a switch. */
const VALUE_FLAGS = new Set(['--milestone', '--add-label', '--remove-label', '--base', '--head', '--title', '--body-file', '--resolve', '--body', '--name', '--method', '--to']);

/** The flags each subcommand reads; any other flag is a usage error, never silently ignored. */
export const SUBCOMMAND_FLAGS = {
  'pr create': ['--base', '--head', '--title', '--body-file', '--draft'],
  'pr edit': ['--claim', '--takeover', '--milestone', '--title', '--body-file', '--add-label', '--remove-label'],
  'branch rename': ['--to'],
  threads: ['--unresolved', '--resolve', '--body'],
  claim: ['--takeover'],
  factor: ['--name'],
  comment: ['--body-file'],
  merge: ['--method'],
};

/** Every flag of this script: a missing value is never taken for another option. */
export const FLAGS = new Set(Object.values(SUBCOMMAND_FLAGS).flat());

/** Refuses a flag `subcommand` does not read; the value after an option is skipped, whatever it looks like. */
function onlyFlags(args, subcommand) {
  const allowed = SUBCOMMAND_FLAGS[subcommand] ?? [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('-')) continue;
    if (!allowed.includes(arg)) throw new UsageError(`${subcommand} does not take ${arg}`);
    if (VALUE_FLAGS.has(arg)) index += 1;
  }
}

/** The value after `name`; an option given without a real value is a usage error, never a silent default. */
function valueAt(args, index, name) {
  const value = args[index + 1];
  // A body like `-- done` is a value; only another of this script's flags means the value is missing.
  if (value === undefined || value.trim() === '' || FLAGS.has(value)) throw new UsageError(`${name} needs a value`);
  return value;
}

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? valueAt(args, index, name) : undefined;
}

function options(args, name) {
  return args.flatMap((arg, index) => (arg === name ? [valueAt(args, index, name)] : []));
}

function number(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new UsageError(`a pull request number is required (got ${value})`);
  return parsed;
}

const SUBCOMMANDS = new Set(['pr list', 'pr view', 'pr create', 'pr ready', 'pr draft', 'pr edit', 'pr body', 'pr files', 'branch rename', 'checks', 'threads', 'claim', 'factor', 'comment', 'notes', 'merge', 'events']);

const USAGE = 'usage: forge-github.mjs pr list|view <n>|create ...|ready <n>|draft <n>|edit <n> [--claim] [--milestone <m>] [--title <t>] [--body-file <f>] ...|body <n>|files <n> | branch rename <n> --to <name> | checks <sha> | threads <n> [--unresolved] [--resolve <id> --body <text>] | claim take|release <n> | factor set|clear <n> --name <f> | comment <n> --body-file <f> | notes <n> | merge <n> --method <m> | events <n>';

/** Runs one subcommand and returns what it prints: JSON, or plain text for `pr body`. */
export function execute(args, run = gh) {
  const [command, action, target] = args;
  const subcommand = command === 'pr' || command === 'branch' ? `${command} ${action}` : command;
  if (SUBCOMMANDS.has(subcommand)) onlyFlags(args, subcommand);
  if (command === 'pr') {
    if (action === 'list') return listPrs(run);
    if (action === 'view') return viewPr(number(target), run);
    if (action === 'create') return createPr({ base: option(args, '--base'), head: option(args, '--head'), title: option(args, '--title'), bodyFile: option(args, '--body-file'), draft: args.includes('--draft') }, run);
    if (action === 'ready') return readyPr(number(target), run);
    if (action === 'draft') return draftPr(number(target), run);
    if (action === 'edit') return editPr(number(target), { milestone: option(args, '--milestone'), title: option(args, '--title'), bodyFile: option(args, '--body-file'), add: options(args, '--add-label'), remove: options(args, '--remove-label'), claim: args.includes('--claim'), takeover: args.includes('--takeover') }, run);
    if (action === 'body') return { text: prBody(number(target), run) };
    if (action === 'files') return prFiles(number(target), run);
  }
  if (command === 'branch' && action === 'rename') return renameBranch(number(target), option(args, '--to'), run);
  if (command === 'checks') return checks(action, run);
  if (command === 'threads') {
    if (args.includes('--resolve')) return resolveThread(option(args, '--resolve'), option(args, '--body'), run);
    return threads(number(action), { unresolved: args.includes('--unresolved') }, run);
  }
  if (command === 'claim') return claim(action, number(target), run, { takeover: args.includes('--takeover') });
  if (command === 'factor') return factor(action, number(target), option(args, '--name'), run);
  if (command === 'comment') return comment(number(action), option(args, '--body-file'), run);
  if (command === 'merge') return merge(number(action), option(args, '--method'), run);
  if (command === 'events') return events(number(action), run);
  if (command === 'notes') return notes(number(action), run);
  throw new UsageError(USAGE);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const result = execute(process.argv.slice(2));
    process.stdout.write(result && typeof result.text === 'string' && process.argv[2] === 'pr' && process.argv[3] === 'body' ? result.text : `${JSON.stringify(result, null, 2)}\n`);
    if (result?.held) process.exitCode = 3;
  } catch (error) {
    process.stderr.write(`forge-github: ${String(error.stderr || error.message).trim()}\n`);
    process.exitCode = error instanceof UsageError ? 2 : 1;
  }
}
