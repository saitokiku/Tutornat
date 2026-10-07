// Freshness guard for THIRD_PARTY_NOTICES.md (audit 2026-08-18, still-open
// list). The notices file was regenerated in wave 2 — which fixed the
// instance, not the class: nothing stopped the next `npm i` from moving a
// version and leaving the legal artifact quietly describing a tree we no
// longer ship. Generation is a chore someone remembers; this is the part that
// does not depend on remembering.
//
// WHAT IT ASSERTS (and why each one, not just "diff the file"):
//   1. Every direct dependency and devDependency in package.json has a
//      full-license block. That section is the compliance-relevant half — the
//      verbatim texts — so a dep added without regenerating is the failure
//      that matters most.
//   2. No block survives for a package package.json no longer declares.
//      Reproducing the license of something we removed is its own inaccuracy.
//   3. Each block names the version actually installed — or, with no tree to
//      read, one that satisfies the range package.json declares — and carries a
//      license identifier the generator could resolve (never UNKNOWN: that is a
//      question for a human, not a row in a table).
//   4. No entry — block or table row — names a version that is not installed.
//   5. The header's package count matches the rows underneath it.
//
// WHY IT DOESN'T FAIL SPURIOUSLY: it never compares the lockfile, a hash of
// it, or a timestamp. A lockfile that churns without moving any version it
// records (integrity rewrites, registry rewrites, a different npm) changes
// nothing this file looks at. Check 4 is skipped for a package name that is
// not installed at all, because the tree legitimately differs by platform
// (`@img/sharp-*`, `@esbuild/*`): a row for a package this machine never
// installs is not evidence of rot. And if node_modules is absent entirely the
// installed-tree checks are SKIPPED and said so out loud, rather than passing
// silently or failing a checkout that simply hasn't installed yet — the
// package.json checks still run, because they need nothing but the repo.
//
// Run:  node scripts/checkNotices.mjs   (from web/), or `npm run notices:check`.
// Fix:  npm run notices

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Semver range checking, in the small: package.json here uses `^`, `~` and
// exact pins. Anything else (a URL, a tag, `*`) is treated as "no opinion" —
// this guard is about staleness, and inventing an answer for a range form we
// don't parse would be a false failure.
function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(v).trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
function lt(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}
function satisfies(range, version) {
  const raw = String(range || '').trim();
  const ver = parseVersion(version);
  if (!ver) return true;
  const op = raw.startsWith('^') ? '^' : raw.startsWith('~') ? '~' : '';
  const base = parseVersion(op ? raw.slice(1) : raw);
  if (!base) return true;                       // unparseable range: no opinion
  if (!op) return raw === String(version).trim();
  if (lt(ver, base)) return false;
  // ^: the leftmost non-zero component is what's held. ~: minor is held.
  let ceiling;
  if (op === '~') ceiling = [base[0], base[1] + 1, 0];
  else if (base[0] !== 0) ceiling = [base[0] + 1, 0, 0];
  else if (base[1] !== 0) ceiling = [0, base[1] + 1, 0];
  else ceiling = [0, 0, base[2] + 1];
  return lt(ver, ceiling);
}

// Every version of every package physically present in node_modules, keyed by
// name (a package can legitimately appear at two versions in a nested tree).
function installedVersions(nodeModules) {
  const found = new Map();
  const add = (name, version) => {
    if (!found.has(name)) found.set(name, new Set());
    found.get(name).add(version);
  };
  const scan = (base) => {
    let entries;
    try { entries = fs.readdirSync(base); } catch { return; }
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const dir = path.join(base, entry);
      if (entry.startsWith('@')) { scan(dir); continue; }
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
        if (meta.name && meta.version) add(meta.name, meta.version);
      } catch { /* not a package dir; the generator ignores these too */ }
      const nested = path.join(dir, 'node_modules');
      if (fs.existsSync(nested)) scan(nested);
    }
  };
  scan(nodeModules);
  return found;
}

/**
 * Audit THIRD_PARTY_NOTICES.md against package.json and, when it is there,
 * the installed tree. Returns problems as prose lines — the caller decides
 * whether that is a failed test or a non-zero exit.
 *
 * @param {{root?: string}} [opts] root defaults to web/
 * @returns {{problems: string[], sawInstalledTree: boolean,
 *            counts: {direct: number, blocks: number, rows: number}}}
 */
export function auditNotices({ root = WEB_ROOT } = {}) {
  const problems = [];
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const noticesPath = path.join(root, 'THIRD_PARTY_NOTICES.md');
  if (!fs.existsSync(noticesPath)) {
    return {
      problems: ['THIRD_PARTY_NOTICES.md is missing. Generate it: npm run notices'],
      sawInstalledTree: false,
      counts: { direct: 0, blocks: 0, rows: 0 },
    };
  }
  const notices = fs.readFileSync(noticesPath, 'utf8');

  const declared = new Map([
    ...Object.entries(pkg.dependencies || {}),
    ...Object.entries(pkg.devDependencies || {}),
  ]);

  // "### name@version — LICENSE" — the full-text section.
  const blocks = new Map();
  for (const m of notices.matchAll(/^### (\S+)@([^@\s]+) — (.+)$/gm)) {
    blocks.set(m[1], { version: m[2], license: m[3].trim() });
  }

  // "| name | version | license |" under the all-packages heading (the two
  // header rows of that table are dropped by requiring a version-shaped cell).
  const tableStart = notices.indexOf('## All installed packages');
  const rows = [];
  if (tableStart === -1) {
    problems.push('THIRD_PARTY_NOTICES.md has no "## All installed packages" table — regenerate: npm run notices');
  } else {
    for (const m of notices.slice(tableStart).matchAll(/^\| (\S+) \| (\d[^\s|]*) \| (.*?) \|$/gm)) {
      rows.push({ name: m[1], version: m[2], license: m[3].trim() });
    }
  }
  const rowVersions = new Map();
  for (const r of rows) {
    if (!rowVersions.has(r.name)) rowVersions.set(r.name, new Set());
    rowVersions.get(r.name).add(r.version);
  }

  // The installed tree, when there is one. It is the authority on what we ship:
  // an `overrides` entry can legitimately pin a dependency outside the range
  // package.json declares, so where the tree is readable it decides, and the
  // declared range is only consulted when there is nothing installed to ask.
  const nodeModules = path.join(root, 'node_modules');
  const sawInstalledTree = fs.existsSync(nodeModules);
  const installed = sawInstalledTree ? installedVersions(nodeModules) : new Map();

  // 1–3: the direct dependencies, which is where the license texts live.
  for (const [name, range] of declared) {
    const block = blocks.get(name);
    if (!block) {
      problems.push(`${name} is a direct dependency with no license block in THIRD_PARTY_NOTICES.md (added without regenerating?) — npm run notices`);
      continue;
    }
    const live = installed.get(name);
    if (live) {
      if (!live.has(block.version)) {
        problems.push(`${name}: notices document ${block.version}, ${[...live].join(', ')} installed — npm run notices`);
      }
    } else if (!satisfies(range, block.version)) {
      problems.push(`${name}: notices document ${block.version}, package.json declares ${range} — the notices predate the bump; npm run notices`);
    }
    if (!block.license || /^(UNKNOWN|SEE LICENSE FILE)$/i.test(block.license)) {
      problems.push(`${name}: notices record its license as "${block.license}". A direct dependency whose license the generator cannot resolve is a question for a human, not a row in a table — read the package and record what it is.`);
    }
    if (rows.length && !rowVersions.has(name)) {
      problems.push(`${name} has a license block but no row in the all-packages table — the file was hand-edited; regenerate it: npm run notices`);
    }
  }

  // 2 (the other direction): texts left behind by a removed dependency.
  for (const name of blocks.keys()) {
    if (!declared.has(name)) {
      problems.push(`${name} has a full license block but is no longer a dependency in package.json — npm run notices`);
    }
  }

  // 5: the header count is the file's own claim about itself.
  const claimed = /## License summary \((\d+) installed packages\)/.exec(notices);
  if (claimed && rows.length && Number(claimed[1]) !== rows.length) {
    problems.push(`the notices header claims ${claimed[1]} installed packages but the table lists ${rows.length} — regenerate: npm run notices`);
  }

  // 4: no table row may name a version that is not installed. Skipped wholesale
  // when there is no tree to compare against, and skipped per-package for a
  // name this platform does not install at all — `@img/sharp-*` and friends are
  // absent by design on a machine that isn't their target, and a row for one of
  // them is not evidence of rot.
  if (sawInstalledTree) {
    const stale = [];
    for (const [name, versions] of rowVersions) {
      const live = installed.get(name);
      if (!live) continue;
      for (const v of versions) {
        if (!live.has(v)) stale.push(`${name}@${v} (installed: ${[...live].join(', ')})`);
      }
    }
    if (stale.length) {
      problems.push(`the notices name ${stale.length} version(s) that are not installed — npm run notices — ${stale.slice(0, 8).join('; ')}${stale.length > 8 ? '; …' : ''}`);
    }
  }

  return {
    problems,
    sawInstalledTree,
    counts: { direct: declared.size, blocks: blocks.size, rows: rows.length },
  };
}

// CLI: same audit, human output, non-zero exit so it can gate anything.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { problems, sawInstalledTree, counts } = auditNotices();
  if (!sawInstalledTree) {
    console.log('node_modules not present — checked THIRD_PARTY_NOTICES.md against package.json only.');
  }
  if (problems.length === 0) {
    console.log(`THIRD_PARTY_NOTICES.md is current — ${counts.direct} direct dependencies, ${counts.rows} packages listed.`);
  } else {
    console.error(`THIRD_PARTY_NOTICES.md is stale (${problems.length}):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
  }
}
