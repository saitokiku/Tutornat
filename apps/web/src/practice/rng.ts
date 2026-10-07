// Seeded randomness so an item is a pure function of (skill, level, seed): the same seed always
// rebuilds the same problem, which is what lets a sheet store seeds instead of whole items.

export type Rng = {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(list: readonly T[]) => T;
  shuffle: <T>(list: readonly T[]) => T[];
  bool: (p?: number) => boolean;
};

export function rng(seed: number): Rng {
  let a = seed >>> 0 || 0x9e3779b9;
  // mulberry32
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    pick: (list) => list[int(0, list.length - 1)],
    shuffle: (list) => {
      const out = [...list];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    bool: (p = 0.5) => next() < p,
  };
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
export const lcm = (a: number, b: number) => Math.abs(a * b) / gcd(a, b);
