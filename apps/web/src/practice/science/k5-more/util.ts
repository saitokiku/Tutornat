import type { Rng } from "../../rng";
import type { Choice, ItemBody } from "../../types";

// Helpers shared by the computed K–5 science generators.

/** 12345 → "12,345" (US digit grouping, used in both languages for a US family). */
export const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** The key first, then the wrong choices; shuffled, with the key's new index. */
export function choose(r: Rng, key: Choice, wrong: Choice[]): Pick<ItemBody, "choices" | "input" | "answer"> {
  const all = [key, ...wrong];
  const order = r.shuffle(all.map((_, i) => i));
  return { choices: order.map((i) => all[i]), input: "choices", answer: { kind: "choice", index: order.indexOf(0) } };
}

/** Likely wrong typed answers: first tag wins for a value, never the key, never negative. */
export function wrongValues(key: number, cands: [value: number, why: string][]): { value: string; why: string }[] {
  const seen = new Set<number>([key]);
  const out: { value: string; why: string }[] = [];
  for (const [v, why] of cands) {
    if (seen.has(v) || v < 0 || !Number.isInteger(v)) continue;
    seen.add(v);
    out.push({ value: String(v), why });
  }
  return out;
}

/** A number as a choice. */
export const numChoice = (v: number, why?: string): Choice => ({ label: String(v), say: String(v), ...(why ? { why } : {}) });

/** Two different integers in [min, max] at least `gap` apart. */
export function apart(r: Rng, min: number, max: number, gap: number): [number, number] {
  for (;;) {
    const a = r.int(min, max), b = r.int(min, max);
    if (Math.abs(a - b) >= gap) return [a, b];
  }
}

export const NAMES = ["Ana", "Kenji", "Amara", "Diego", "Priya", "Liam", "Fatima", "Mateo", "Mei", "Kwame", "Sofía", "Omar", "Noa", "Ravi", "Lucía", "Jamal", "Hana", "Tomás", "Aisha", "Wei"];
