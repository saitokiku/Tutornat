/**
 * Copies the on-device voice-activity-detection assets into `public/vad/` so
 * the session screen loads them from this origin (no third-party loads in a
 * learner's session: `lib/tutor/voice/vad.ts`, `VAD_ASSET_PATH`).
 *
 * Runs before `next dev` and `next build`. The files come from two
 * dependencies already in `package.json`: `@ricky0123/vad-web` (the Silero
 * v5 model and its audio worklet) and `onnxruntime-web` (the single-thread
 * WebAssembly runtime the worklet loads). Nothing is generated; the copy is
 * idempotent and `public/vad/` is git-ignored.
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'vad');

const FILES = [
  ['@ricky0123/vad-web/dist', 'silero_vad_v5.onnx'],
  ['@ricky0123/vad-web/dist', 'silero_vad_legacy.onnx'],
  ['@ricky0123/vad-web/dist', 'vad.worklet.bundle.min.js'],
  ['onnxruntime-web/dist', 'ort-wasm-simd-threaded.mjs'],
  ['onnxruntime-web/dist', 'ort-wasm-simd-threaded.wasm'],
];

mkdirSync(out, { recursive: true });
let copied = 0;
let missing = 0;
for (const [pkgDir, file] of FILES) {
  const from = join(root, 'node_modules', pkgDir, file);
  const to = join(out, file);
  if (!existsSync(from)) {
    missing += 1;
    console.warn(`[vad-assets] missing ${pkgDir}/${file}; the energy detector will be used`);
    continue;
  }
  if (existsSync(to) && statSync(to).size === statSync(from).size) continue;
  copyFileSync(from, to);
  copied += 1;
}
console.log(
  `[vad-assets] ${FILES.length - missing} of ${FILES.length} assets in public/vad (${copied} copied)`,
);
