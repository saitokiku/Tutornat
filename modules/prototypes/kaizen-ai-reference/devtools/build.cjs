// Bundles src/entry.jsx with the snapshot's real components via esbuild.
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const WEB = '/Users/man/education-product-discovery/snapshots/Kaizen-AI/web';
const DEV = __dirname;
const SRC = path.resolve(DEV, '../src');
const OUT = path.resolve(DEV, '../dist');
fs.mkdirSync(OUT, { recursive: true });
function withExt(p) {
  for (const c of [p, p + '.js', p + '.jsx', path.join(p, 'index.js')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  throw new Error('cannot resolve ' + p);
}
const alias = {
  name: 'snapshot-alias',
  setup(b) {
    b.onResolve({ filter: /^@\// }, (a) => ({ path: withExt(path.join(WEB, a.path.slice(2))) }));
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: path.join(SRC, 'stubs/next-link.jsx') }));
  },
};
esbuild.build({
  entryPoints: [path.join(SRC, 'entry.jsx')],
  bundle: true,
  outfile: path.join(OUT, 'reference.js'),
  format: 'iife',
  platform: 'browser',
  jsx: 'automatic',
  loader: { '.js': 'jsx' },
  define: { 'process.env.NODE_ENV': '"production"' },
  nodePaths: [path.join(DEV, 'node_modules')],
  absWorkingDir: DEV,
  logLevel: 'info',
  plugins: [alias],
  metafile: true,
}).then((r) => {
  const inputs = Object.keys(r.metafile.inputs).filter((k) => !k.includes('node_modules'));
  fs.writeFileSync(path.join(OUT, 'bundled-sources.txt'), inputs.sort().join('\n') + '\n');
  console.log('bundled snapshot/src files:\n' + inputs.sort().join('\n'));
}).catch((e) => { console.error(e); process.exit(1); });
