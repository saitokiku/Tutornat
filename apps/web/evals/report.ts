import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Reports go to evals/out/ (ignored by git: the repo's .gitignore already ignores every out/ folder):
// <suite>.json with everything, <suite>.md to read, and one line per run in history.jsonl so tuning
// can be compared across runs.

const OUT = fileURLToPath(new URL("./out/", import.meta.url));

export function writeReport(suite: string, data: { summary: Record<string, unknown> } & Record<string, unknown>, markdown: string) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}${suite}.json`, `${JSON.stringify(data, null, 2)}\n`);
  writeFileSync(`${OUT}${suite}.md`, markdown);
  appendFileSync(`${OUT}history.jsonl`, `${JSON.stringify({ suite, at: new Date().toISOString(), ...data.summary })}\n`);
  return OUT;
}

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

export const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
export const usd = (x: number) => `$${x.toFixed(x < 0.01 ? 5 : 4)}`;
export const ms = (x: number | null) => (x === null ? "–" : `${Math.round(x)} ms`);
