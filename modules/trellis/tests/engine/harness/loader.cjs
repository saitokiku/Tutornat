// Offline module loader for the engine closure: transpiles this repository's
// TypeScript in memory with the pinned toolchain and records a SHA-256 of every
// source file it loads. Never writes to disk. Resolves `@/` to the repo root and
// refuses to load anything under legacy/ (the read-only reference snapshots live there).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const TOOLCHAIN = execFileSync('sh', [path.join(__dirname, 'toolchain.sh')], { encoding: 'utf8' }).trim();
const ts = require(path.join(TOOLCHAIN, 'typescript'));

const loaded = new Map();
const hashes = {};

function resolveFile(p) {
  for (const f of [p, p + '.ts', p + '.tsx', p + '.js', p + '.json', path.join(p, 'index.ts')]) {
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  throw new Error('Cannot resolve source: ' + p);
}

function load(spec) {
  const f = resolveFile(spec.startsWith('@/') ? path.join(ROOT, spec.slice(2)) : spec);
  const rel = path.relative(ROOT, f);
  if (rel.startsWith('..') || rel.startsWith('legacy') || rel.startsWith('reference-implementations')) {
    throw new Error('Refusing to load outside the product closure: ' + rel);
  }
  if (loaded.has(f)) return loaded.get(f).exports;
  const source = fs.readFileSync(f, 'utf8');
  hashes[rel] = crypto.createHash('sha256').update(source).digest('hex');
  const mod = { exports: {} };
  loaded.set(f, mod);
  if (f.endsWith('.json')) return (mod.exports = JSON.parse(source));
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: f,
  }).outputText;
  const req = (s) =>
    s.startsWith('@/') ? load(s) : s.startsWith('.') ? load(path.resolve(path.dirname(f), s)) : require(s);
  vm.runInThisContext('(function(require,module,exports,__filename,__dirname){\n' + js + '\n})', {
    filename: f,
  })(req, mod, mod.exports, f, path.dirname(f));
  return mod.exports;
}

module.exports = { ROOT, TOOLCHAIN, load, hashes, typescriptVersion: ts.version };
