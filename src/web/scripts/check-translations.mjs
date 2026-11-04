import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const root = join(import.meta.dirname, '..', 'projects');
const sources = [join(root, 'apiary', 'src', 'app'), join(root, 'apiary-ui', 'src', 'lib')];
const quoted = /'((?:[^'\\]|\\.)*)'/g;

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

function load(file) {
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  new Function('exports', 'require', outputText)(exports, (name) => (name.startsWith('.') ? load(join(file, '..', `${name}.ts`)) : {}));
  return exports;
}

function unescape(text) {
  return text.replace(/\\(.)/g, '$1');
}

function used(text) {
  const keys = [];
  for (const [, inner] of text.matchAll(/\(([^()]*)\)\s*\|\s*t\b/g)) {
    keys.push(...[...inner.matchAll(quoted)].map((m) => m[1]));
  }
  for (const pattern of [/'((?:[^'\\]|\\.)*)'\s*\|\s*t\b/g, /\bt\(\s*'((?:[^'\\]|\\.)*)'/g]) {
    keys.push(...[...text.matchAll(pattern)].map((m) => m[1]));
  }
  for (const [, one, other] of text.matchAll(/plural\([^,]+,\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'/g)) {
    keys.push(one, other);
  }
  return keys.map(unescape);
}

function placeholders(text) {
  return new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
}

const all = sources.flatMap(files);
const catalogFiles = all.filter((f) => f.endsWith('.pt.ts') || f.endsWith('i18n/portuguese.ts'));
const catalog = new Map();
const owners = new Map();
const problems = [];
for (const file of catalogFiles.filter((f) => !f.endsWith('app-messages.pt.ts'))) {
  for (const value of Object.values(load(file))) {
    for (const [key, text] of Object.entries(value)) {
      if (catalog.has(key) && catalog.get(key) !== text) {
        problems.push(`${relative(root, file)}: '${key}' is '${text}' here but '${catalog.get(key)}' in ${owners.get(key)}`);
      }
      catalog.set(key, text);
      owners.set(key, relative(root, file));
    }
  }
}

const seen = new Set();
for (const file of all.filter((f) => /\.(ts|html)$/.test(f) && !catalogFiles.includes(f))) {
  for (const key of used(readFileSync(file, 'utf8'))) {
    seen.add(key);
    if (!catalog.has(key)) {
      problems.push(`${relative(root, file)}: no Portuguese for '${key}'`);
    } else if (!placeholders(catalog.get(key)).isSubsetOf(placeholders(key))) {
      problems.push(`${relative(root, file)}: the Portuguese for '${key}' has a placeholder the English hasn't`);
    }
  }
}

const messagePairs = [
  ['apiary-ui/src/lib/messages/default-messages.ts', 'apiary-ui/src/lib/messages/portuguese-messages.ts'],
  ['apiary/src/app/errors/app-messages.ts', 'apiary/src/app/errors/app-messages.pt.ts'],
];
for (const [english, portuguese] of messagePairs) {
  const [en] = Object.values(load(join(root, english)));
  const [pt] = Object.values(load(join(root, portuguese)));
  for (const code of Object.keys(en).filter((code) => !(code in pt))) {
    problems.push(`${portuguese}: no Portuguese message for '${code}'`);
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Every one of ${seen.size} texts has a Portuguese translation.`);
