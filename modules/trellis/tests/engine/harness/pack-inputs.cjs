// Criterion 0: what `npm pack` ships. `packDryRun()` runs the dry run offline (no
// registry access, no scripts, a throwaway cache) and returns the packed paths.
// `packAndUnpack()` (r3, review item 1) produces the real archive into a temp
// directory and unpacks it there, so the harness can run typecheck and the suite
// inside the unpacked tree — the archive itself is the test, not its file list.
// `node tests/engine/harness/pack-inputs.cjs [--list]` prints the dry-run summary
// (and the full path list) for the committed evidence.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const tmpBase = () => process.env.TMPDIR || os.tmpdir();

function npmPack(extraArgs) {
  const cache = fs.mkdtempSync(path.join(tmpBase(), 'kaizenedu-pack-cache-'));
  try {
    const stdout = execFileSync(
      'npm',
      ['pack', '--json', '--ignore-scripts', '--offline', '--cache', cache, ...extraArgs],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return JSON.parse(stdout)[0];
  } finally {
    fs.rmSync(cache, { recursive: true, force: true });
  }
}

function summarize(pkg) {
  const paths = pkg.files.map((f) => f.path).sort();
  const byPrefix = {};
  for (const p of paths) {
    const key = p.includes('/') ? p.slice(0, p.indexOf('/') + 1) : '(root)';
    byPrefix[key] = (byPrefix[key] || 0) + 1;
  }
  return { name: pkg.name, version: pkg.version, entryCount: pkg.entryCount, total: paths.length, byPrefix, paths };
}

function packDryRun() {
  return summarize(npmPack(['--dry-run']));
}

/**
 * Packs for real into a fresh temp directory and unpacks the tarball there.
 * Returns the summary plus `dir` (the unpacked package root, no git metadata)
 * and `tarball`. The caller removes `tmp` when done.
 */
function packAndUnpack() {
  const tmp = fs.mkdtempSync(path.join(tmpBase(), 'kaizenedu-pack-'));
  const pkg = npmPack(['--pack-destination', tmp]);
  const tarball = path.join(tmp, pkg.filename);
  // Refuse links and parent-relative members before unpacking (the reviewer's own check).
  const members = execFileSync('tar', ['-tzvf', tarball], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const unsafe = members.filter((m) => /^[lh]/.test(m) || m.includes('..'));
  if (unsafe.length) throw new Error('unsafe tarball members: ' + unsafe.join(', '));
  execFileSync('tar', ['-xzf', tarball, '-C', tmp], { stdio: 'ignore' });
  return { ...summarize(pkg), tmp, tarball, dir: path.join(tmp, 'package') };
}

module.exports = { packDryRun, packAndUnpack };

if (require.main === module) {
  const result = packDryRun();
  const { paths, ...summary } = result;
  console.log(JSON.stringify(summary));
  if (process.argv.includes('--list')) for (const p of paths) console.log(p);
}
