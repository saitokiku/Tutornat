// Deterministic shuffles for widgets that are about order: the same lesson always opens the same way
// (no Math.random in render), and never already in a right order.

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const same = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Positions 0..n-1 in a stable scrambled order. `avoid` lists orders it must not land on (the right
 * answer); when the scramble hits one it turns the list until it doesn't (possible whenever n > 1 and
 * fewer than n orders are avoided).
 */
export function scramble(keys: readonly string[], avoid: readonly (readonly number[])[] = [keys.map((_, i) => i)]): number[] {
  let order = keys.map((k, i) => ({ i, h: hash(`${k}#${i}`) })).sort((a, b) => a.h - b.h || a.i - b.i).map((x) => x.i);
  for (let turn = 0; turn < keys.length && avoid.some((a) => same(a, order)); turn++) order = [...order.slice(1), order[0]];
  if (avoid.some((a) => same(a, order)) && order.length > 1) order = [order[1], order[0], ...order.slice(2)];
  return order;
}

/** Number with a true minus sign, the way a learner reads it. */
export const signed = (n: number) => String(n).replace("-", "−");
