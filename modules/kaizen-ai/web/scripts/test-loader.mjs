// Module-resolution hook so node:test can import app code that uses the
// Next.js "@/…" path alias (jsconfig.json maps @/* → web/*).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    let p = path.join(webRoot, specifier.slice(2));
    if (!fs.existsSync(p)) {
      for (const ext of ['.js', '.mjs', '.jsx', '/index.js']) {
        if (fs.existsSync(p + ext)) { p += ext; break; }
      }
    }
    return nextResolve(pathToFileURL(p).href, context);
  }
  return nextResolve(specifier, context);
}
