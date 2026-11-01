// The forge contract's answer shapes (references/forge-contract.md), as checks an implementation's tests
// apply to every answer its subcommands give. Each check throws naming the first field that differs.

const isString = (value) => typeof value === 'string';
const isNullableString = (value) => value === null || typeof value === 'string';
const oneOf = (...values) => (value) => values.includes(value);

function check(kind, value, fields) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${kind}: expected an object, got ${JSON.stringify(value)}`);
  for (const [field, valid] of Object.entries(fields)) {
    const optional = field.endsWith('?');
    const name = optional ? field.slice(0, -1) : field;
    if (optional && value[name] === undefined) continue;
    if (!valid(value[name])) throw new Error(`${kind}.${name}: unexpected ${JSON.stringify(value[name])}`);
  }
}

const listOf = (kind, item) => (value) => {
  if (!Array.isArray(value)) throw new Error(`${kind}: expected an array`);
  value.forEach((entry, index) => item(`${kind}[${index}]`, entry));
  return true;
};

const SHAPES = {
  pr: (kind, value) => check(kind, value, {
    number: Number.isInteger, url: isString, title: isString, body: isString, draft: (v) => typeof v === 'boolean',
    state: oneOf('open', 'merged', 'closed'), head: (v) => isString(v?.ref) && isString(v?.sha), base: (v) => isString(v?.ref),
    mergeable: oneOf('clean', 'conflicting', 'unknown'), labels: (v) => Array.isArray(v) && v.every(isString),
    milestone: isNullableString, createdAt: isString, author: isNullableString,
  }),
  checks: (kind, value) => check(kind, value, {
    sha: isString, state: oneOf('none', 'pending', 'success', 'failure'),
    runs: listOf(`${kind}.runs`, (k, run) => check(k, run, { name: isString, state: isString, url: isNullableString })),
  }),
  thread: (kind, value) => check(kind, value, {
    id: isString, resolved: (v) => typeof v === 'boolean', path: isNullableString, line: (v) => v === null || Number.isInteger(v),
    comments: listOf(`${kind}.comments`, (k, c) => check(k, c, { author: isNullableString, body: isString, createdAt: isString })),
  }),
  note: (kind, value) => check(kind, value, {
    id: isString, kind: oneOf('comment', 'review'), author: isNullableString, authorRole: oneOf('owner', 'member', 'other'),
    'state?': isString, body: isString, 'inline?': (v) => Array.isArray(v) && v.every(isString), createdAt: isString, url: isNullableString,
  }),
  claim: (kind, value) => check(kind, value, {
    pr: Number.isInteger, claimed: (v) => typeof v === 'boolean', 'changed?': (v) => typeof v === 'boolean',
    'held?': (v) => v === true, 'takenOver?': (v) => v === true,
  }),
  factor: (kind, value) => check(kind, value, { pr: Number.isInteger, factor: isString, set: (v) => typeof v === 'boolean' }),
  comment: (kind, value) => check(kind, value, { pr: Number.isInteger, url: isNullableString }),
  merge: (kind, value) => check(kind, value, { pr: Number.isInteger, state: isString, mergeCommit: isNullableString }),
  files: (kind, value) => check(kind, value, { pr: Number.isInteger, files: (v) => Array.isArray(v) && v.every(isString) }),
  event: (kind, value) => check(kind, value, { id: (v) => isString(v) || Number.isInteger(v), event: oneOf('labeled', 'unlabeled'), label: isString, createdAt: isString }),
};

/** Throws unless `value` has the contract's shape for `kind` (pr, checks, thread, note, claim, factor, comment, merge, files, event). */
export function assertShape(kind, value) {
  const shape = SHAPES[kind];
  if (!shape) throw new Error(`no contract shape named ${kind}`);
  shape(kind, value);
  return value;
}

export const SHAPE_KINDS = Object.keys(SHAPES);
