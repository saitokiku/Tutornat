#!/usr/bin/env node
/**
 * Invariant (e), bundle half: no client bundle contains a provider key.
 *
 * Scans every file under .next/static (the only output Next.js serves to the
 * browser) for the VALUE of each secret-looking environment variable that is
 * set in the current process, plus the literal marker "canary-8d1f0a7c". Run
 * after `pnpm build` with canary values in the environment (see
 * .github/workflows/invariants.yml).
 *
 * Exit codes: 0 clean · 1 a secret value was found · 2 no build to scan.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SECRET_NAME = /(API_KEY|SECRET|TOKEN|PASSWORD|ACCESS_KEY|DATABASE_URL|CANARY)/;
const MARKER = 'canary-8d1f0a7c';
const staticRoot = join(process.cwd(), '.next', 'static');

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

let files;
try {
  if (!statSync(staticRoot).isDirectory()) throw new Error('not a directory');
  files = walk(staticRoot, []);
} catch {
  console.error(
    `audit-client-bundle: ${relative(process.cwd(), staticRoot)} not found. Run pnpm build first.`,
  );
  process.exit(2);
}

const secrets = Object.entries(process.env)
  .filter(
    ([name, value]) =>
      SECRET_NAME.test(name) && !name.startsWith('NEXT_PUBLIC_') && value && value.length >= 8,
  )
  .map(([name, value]) => ({ name, value }));
secrets.push({ name: '(literal marker)', value: MARKER });

const findings = [];
for (const file of files) {
  const text = readFileSync(file, 'latin1');
  for (const secret of secrets) {
    if (text.includes(secret.value)) {
      findings.push({ file: relative(process.cwd(), file), name: secret.name });
    }
  }
}

console.log(
  `audit-client-bundle: scanned ${files.length} files under .next/static for ${secrets.length} secret values`,
);
if (findings.length > 0) {
  for (const finding of findings) console.error(`  LEAK ${finding.name} in ${finding.file}`);
  process.exit(1);
}
console.log('audit-client-bundle: clean');
