import { describe, expect, it } from "vitest";
import { makeItem } from "../skills";
import type { Item, MathPart } from "../types";
import { SCIENCE_6_9, SCIENCE_6_9_BANKS } from "./upper";

// Grades 6–9 science. Every computed answer is re-derived here by a different route than the
// generator's (multiply back, enumerate the Punnett square, expand parentheses as text, an
// independently typed periodic table). Banks are checked entry by entry.

const SEEDS = Array.from({ length: 250 }, (_, i) => i * 104729 + 17);
const text = (parts: MathPart[]) => parts.filter((p): p is string => typeof p === "string").join("");
const nums = (s: string) => [...s.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const oneDecimal = (x: number) => near(Math.round(x * 10) / 10, x);
const make = (id: string, level: number, locale: "en" | "es" = "en") => SEEDS.map((seed) => makeItem(id, level, seed, locale));
const num = (it: Item) => (it.answer.kind === "number" ? it.answer.value : NaN);
const label = (it: Item) => (it.answer.kind === "choice" ? it.choices![it.answer.index].label : "");
const skill = (id: string) => SCIENCE_6_9.find((s) => s.id === id)!;

const COMPUTED = ["s.speed", "s.density", "s.atoms", "s.genetics", "s.newton", "s.ph", "s.formula.atoms"];

describe("science 6–9 strand", () => {
  it("has the planned skills in teaching order", () => {
    expect(SCIENCE_6_9.map((s) => [s.id, s.grade, s.levels, s.content])).toEqual([
      ["s.cells", "6", 2, "draft"],
      ["s.variables", "6", 2, "draft"],
      ["s.speed", "6", 2, "computed"],
      ["s.density", "7", 2, "computed"],
      ["s.ecosystems", "7", 1, "draft"],
      ["s.plate.tectonics", "7", 1, "draft"],
      ["s.atoms", "8", 2, "computed"],
      ["s.chem.phys", "8", 1, "draft"],
      ["s.genetics", "8", 2, "computed"],
      ["s.newton", "9", 2, "computed"],
      ["s.newton.laws", "9", 1, "draft"],
      ["s.ph", "9", 1, "computed"],
      ["s.formula.atoms", "9", 2, "computed"],
    ]);
    for (const s of SCIENCE_6_9) expect(s.subject).toBe("science");
  });

  it("gives every item 3 hints, 1–4 steps, plain copy, and the same answer in both languages", () => {
    for (const s of SCIENCE_6_9) {
      for (let level = 1; level <= s.levels; level++) {
        const en = make(s.id, level, "en"), es = make(s.id, level, "es");
        en.forEach((a, i) => {
          const b = es[i];
          const where = `${s.id} L${level} seed ${a.seed}`;
          for (const it of [a, b]) {
            expect(it.hints.length, where).toBe(3);
            expect(it.steps.length, where).toBeGreaterThanOrEqual(1);
            expect(it.steps.length, where).toBeLessThanOrEqual(4);
            const copy = [text(it.prompt), it.say, ...it.hints, ...it.steps, ...(it.choices ?? []).flatMap((c) => [c.label, c.say ?? ""])];
            for (const c of copy) {
              expect(c, `${where} "1" with a plural`).not.toMatch(
                /(?<![\d.])1 (kilograms|newtons|grams|meters|kilometers|miles|centimeters|hours|seconds|minutes|protons|neutrons|electrons|atoms|kilogramos|gramos|metros|kilómetros|millas|centímetros|horas|segundos|minutos|protones|neutrones|electrones|átomos)\b/,
              );
              expect(c, `${where} exclamation`).not.toMatch(/!/);
              expect(c, `${where} emoji`).not.toMatch(/\p{Extended_Pictographic}/u);
            }
            for (const h of it.hints) expect(h.trim(), where).not.toBe("");
            if (it.answer.kind === "number") {
              expect(oneDecimal(it.answer.value), `${where} ${it.answer.value}`).toBe(true);
              for (const h of it.hints) expect(h, `${where} hint gives the answer`).not.toMatch(new RegExp(`=\\s*${it.answer.value}(?![\\d.])[^=×÷+−]*$`));
              if (!Number.isInteger(it.answer.value)) expect(it.keys, where).toContain(".");
            }
          }
          expect(b.answer, where).toEqual(a.answer);
          expect(b.choices?.length, where).toBe(a.choices?.length);
          expect(text(b.prompt), `${where} untranslated`).not.toBe(text(a.prompt));
          if (COMPUTED.includes(s.id)) {
            expect(nums(text(b.prompt)), `${where} numbers differ between languages`).toEqual(nums(text(a.prompt)));
            (a.choices ?? []).forEach((c, j) => expect(nums(b.choices![j].label), where).toEqual(nums(c.label)));
          }
        });
      }
    }
  });
});

describe("question banks", () => {
  const BINARY = new Set(["chemical change|physical change", "cambio físico|cambio químico"]);
  for (const [id, levels] of Object.entries(SCIENCE_6_9_BANKS)) {
    it(`${id}: well-formed entries, at least 12 per level, every one reachable`, () => {
      const s = skill(id);
      expect(s.content).toBe("draft");
      expect(levels.length).toBe(s.levels);
      levels.forEach((bank, i) => {
        const level = i + 1;
        for (const b of [bank.nudge, bank.strategy]) expect(b.en.trim() && b.es.trim(), `${id} L${level} shared hints`).toBeTruthy();
        expect(new Set(bank.items.map((x) => x.q.en)).size, `${id} L${level} distinct EN`).toBeGreaterThanOrEqual(12);
        expect(new Set(bank.items.map((x) => x.q.es)).size, `${id} L${level} distinct ES`).toBe(new Set(bank.items.map((x) => x.q.en)).size);
        expect(new Set(bank.items.map((x) => x.q.en)).size, `${id} L${level} duplicate question`).toBe(bank.items.length);
        for (const x of bank.items) {
          const where = `${id} L${level}: ${x.q.en}`;
          const all = [x.q, x.a, ...x.wrong, x.clue, x.why];
          for (const b of all) {
            expect(b.en.trim(), where).not.toBe("");
            expect(b.es.trim(), where).not.toBe("");
            expect(b.en + b.es, where).not.toMatch(/!/);
          }
          expect(x.q.es, `${where} untranslated`).not.toBe(x.q.en);
          for (const lang of ["en", "es"] as const) {
            const labels = [x.a, ...x.wrong].map((c) => c[lang].toLowerCase());
            expect(new Set(labels).size, `${where} duplicate choices`).toBe(labels.length);
            const binary = labels.length === 2 && BINARY.has([...labels].sort().join("|"));
            expect(labels.length >= 3 || binary, `${where} needs 3+ choices`).toBe(true);
            expect(labels.length, where).toBeLessThanOrEqual(4);
            // Hint 3 points the way but never names the answer.
            expect(x.clue[lang].toLowerCase(), `${where} clue gives the answer`).not.toContain(x.a[lang].toLowerCase());
          }
        }
        // Items come straight from the bank, keyed to the entry's answer, and every entry turns up.
        const seen = new Set<string>();
        for (const it of make(id, level, "en")) {
          const entry = bank.items.find((x) => x.q.en === text(it.prompt));
          expect(entry, `${id} L${level} unknown prompt`).toBeDefined();
          expect(label(it)).toBe(entry!.a.en);
          expect(it.hints[2]).toBe(entry!.clue.en);
          seen.add(entry!.q.en);
        }
        for (const it of make(id, level, "es")) {
          const entry = bank.items.find((x) => x.q.es === text(it.prompt))!;
          expect(label(it)).toBe(entry.a.es);
        }
        expect(seen.size, `${id} L${level} unreachable entries`).toBe(bank.items.length);
      });
    });
  }
});

describe("s.speed", () => {
  it("level 1: the speed times the time gives back the distance", () => {
    for (const it of make("s.speed", 1)) {
      const p = text(it.prompt);
      expect(p).toMatch(/average speed, in/);
      const [d, t] = nums(p);
      expect(near(num(it) * t, d), `${p} → ${num(it)}`).toBe(true);
      expect(it.input).toBe("keypad");
      expect(it.keys).toContain(".");
    }
  });

  it("level 2: distance and time both appear, and each checks back", () => {
    const kinds = new Set<string>();
    for (const it of make("s.speed", 2)) {
      const p = text(it.prompt);
      if (/How far/.test(p)) {
        const [v, t] = nums(p);
        expect(near(num(it) / t, v), `${p} → ${num(it)}`).toBe(true);
        kinds.add("distance");
      } else {
        expect(p).toMatch(/How long/);
        const [d, v] = nums(p);
        expect(near(num(it) * v, d), `${p} → ${num(it)}`).toBe(true);
        kinds.add("time");
      }
    }
    expect(kinds.size).toBe(2);
  });

  it("uses rapidez in Spanish", () => {
    for (const it of [...make("s.speed", 1, "es"), ...make("s.speed", 2, "es")]) expect(text(it.prompt)).toMatch(/rapidez/);
  });
});

describe("s.density", () => {
  it("level 1: density times volume gives back the mass", () => {
    for (const it of make("s.density", 1)) {
      const p = text(it.prompt);
      const [m, v] = nums(p);
      expect(near(num(it) * v, m), `${p} → ${num(it)}`).toBe(true);
      expect(num(it)).toBeGreaterThan(0);
      expect(num(it)).toBeLessThan(10);
    }
  });

  it("level 2: float or sink, decided by comparing mass with volume", () => {
    const shapes = new Set<number>();
    for (const [en, es] of make("s.density", 2).map((it, i) => [it, make("s.density", 2, "es")[i]] as const)) {
      const p = text(en.prompt);
      shapes.add(en.choices!.length);
      if (en.choices!.length === 2) {
        const [m, v] = nums(p);
        expect(m).not.toBe(v);
        expect(label(en), p).toBe(m < v ? "It floats" : "It sinks");
        expect(label(es)).toBe(m < v ? "Flota" : "Se hunde");
      } else {
        const blocks = en.choices!.map((c) => nums(c.label));
        const floaters = blocks.map(([m, v]) => m < v);
        for (const [m, v] of blocks) expect(m).not.toBe(v);
        const target = /floats\?/.test(p);
        expect(floaters.filter((f) => f === target).length, p).toBe(1);
        expect(floaters[en.answer.kind === "choice" ? en.answer.index : -1], p).toBe(target);
      }
    }
    expect([...shapes].sort()).toEqual([2, 3]);
  });
});

// Standard atomic weights (IUPAC), typed here independently of the strand's table.
const PERIODIC: Record<string, [number, number]> = {
  hydrogen: [1, 1.008], helium: [2, 4.0026], lithium: [3, 6.94], beryllium: [4, 9.0122], boron: [5, 10.81],
  carbon: [6, 12.011], nitrogen: [7, 14.007], oxygen: [8, 15.999], fluorine: [9, 18.998], neon: [10, 20.18],
  sodium: [11, 22.99], magnesium: [12, 24.305], aluminum: [13, 26.982], silicon: [14, 28.085], phosphorus: [15, 30.974],
  sulfur: [16, 32.06], chlorine: [17, 35.45], argon: [18, 39.948], potassium: [19, 39.098], calcium: [20, 40.078],
};
const byZ = (z: number) => Object.entries(PERIODIC).find(([, [n]]) => n === z)!;
const named = (p: string) => Object.keys(PERIODIC).find((n) => new RegExp(`\\b${n}\\b`, "i").test(p));

describe("s.atoms", () => {
  it("level 1: protons and electrons equal the atomic number of a neutral atom", () => {
    for (const it of make("s.atoms", 1)) {
      const p = text(it.prompt);
      const name = named(p);
      if (name) {
        const [z] = PERIODIC[name];
        expect(nums(p)[0], p).toBe(z);
        expect(num(it), p).toBe(z);
      } else {
        expect(p).toMatch(/neutral atom has (\d+) electrons?\. What is its atomic number/);
        expect(num(it), p).toBe(nums(p)[0]);
        expect(it.steps.join(" ")).toContain(byZ(num(it))[0]);
      }
    }
  });

  it("level 2: neutrons, mass number and atomic number agree with the rounded standard weights", () => {
    for (const it of make("s.atoms", 2)) {
      const p = text(it.prompt);
      const name = named(p);
      if (/How many neutrons/.test(p)) {
        const [z, w] = PERIODIC[name!];
        expect(nums(p), p).toEqual([z, Math.round(w)]);
        expect(num(it) + z, p).toBe(Math.round(w));
      } else if (/mass number\?/.test(p)) {
        const [pr, n] = nums(p);
        expect(num(it), p).toBe(pr + n);
        expect(Math.round(byZ(pr)[1][1]), p).toBe(num(it));
      } else {
        expect(p).toMatch(/atomic number\?/);
        const [a, n] = nums(p);
        expect(num(it) + n, p).toBe(a);
        expect(Math.round(byZ(num(it))[1][1]), p).toBe(a);
      }
    }
  });
});

describe("s.genetics", () => {
  const parents = (p: string) => [...p.matchAll(/\(([A-Za-z]{2})\)/g)].map((m) => m[1]);
  const boxes = (g1: string, g2: string) => [...g1].flatMap((a) => [...g2].map((b) => a + b));
  const kind = (g: string) => (g[0] !== g[1] ? "het" : g[0] === g[0].toUpperCase() ? "dom" : "rec");

  it("uses the right zygosity word for each parent, in both languages", () => {
    for (const level of [1, 2]) {
      const es = make("s.genetics", level, "es");
      make("s.genetics", level).forEach((it, i) => {
        const p = text(it.prompt), q = text(es[i].prompt);
        for (const g of parents(p)) {
          const en = { het: "heterozygous", dom: "homozygous dominant", rec: "homozygous recessive" }[kind(g)];
          expect(p, p).toMatch(new RegExp(`${en} \\w+ \\(${g}\\)`));
          const sp = { het: "heterocigot[ao]", dom: "homocigot[ao] dominante", rec: "homocigot[ao] recesiv[ao]" }[kind(g)];
          expect(q, q).toMatch(new RegExp(`${sp} \\(${g}\\)`));
        }
        expect(p).toMatch(/the allele for .+ \(([A-Z])\) is dominant over the allele for .+ \(([a-z])\)/);
      });
    }
  });

  it("level 1: percent showing the dominant trait matches the 4 enumerated boxes", () => {
    // With one gene and complete dominance, only 0, 50, 75 or 100 percent can show the dominant trait.
    const seen = new Set<number>();
    for (const it of make("s.genetics", 1)) {
      const p = text(it.prompt);
      const [g1, g2] = parents(p);
      const dominant = boxes(g1, g2).filter((b) => /[A-Z]/.test(b)).length;
      expect(num(it), p).toBe((dominant / 4) * 100);
      expect(p).toMatch(/What percent/);
      expect(it.prompt.at(-1)).toBe(" %");
      seen.add(num(it));
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([0, 50, 75, 100]);
  });

  it("level 2: the keyed genotype counts match the 4 enumerated boxes", () => {
    for (const it of make("s.genetics", 2)) {
      const p = text(it.prompt);
      const [g1, g2] = parents(p);
      const tally: Record<string, number> = {};
      for (const b of boxes(g1, g2)) {
        const key = [...b].sort().join(""); // uppercase sorts first
        tally[key] = (tally[key] ?? 0) + 1;
      }
      const m = /^(\d) (\w\w) : (\d) (\w\w) : (\d) (\w\w)$/.exec(label(it))!;
      expect(m, label(it)).not.toBeNull();
      expect(Number(m[1]) + Number(m[3]) + Number(m[5])).toBe(4);
      for (const [n, g] of [[m[1], m[2]], [m[3], m[4]], [m[5], m[6]]]) expect(Number(n), `${p} ${label(it)}`).toBe(tally[g] ?? 0);
      expect(it.choices!.length).toBe(4);
    }
  });
});

describe("s.newton", () => {
  it("level 1: F = m × a", () => {
    for (const it of make("s.newton", 1)) {
      const p = text(it.prompt);
      expect(p).toMatch(/What is the net force/);
      const [m, a] = nums(p);
      expect(near(num(it), m * a), `${p} → ${num(it)}`).toBe(true);
    }
  });

  it("level 2: the answer multiplied back gives the force", () => {
    const kinds = new Set<string>();
    for (const it of make("s.newton", 2)) {
      const p = text(it.prompt);
      const [f, other] = nums(p);
      expect(near(num(it) * other, f), `${p} → ${num(it)}`).toBe(true);
      kinds.add(/acceleration, in/.test(p) ? "a" : /mass, in/.test(p) ? "m" : "?");
    }
    expect([...kinds].sort()).toEqual(["a", "m"]);
  });
});

describe("s.ph", () => {
  it("classifies against 7 and picks the lower (or higher) pH", () => {
    const shapes = new Set<string>();
    for (const it of make("s.ph", 1)) {
      const p = text(it.prompt);
      if (/Is it acidic, neutral, or basic/.test(p)) {
        const v = Number(/pH of (?:about )?(\d+(?:\.\d+)?)/.exec(p)![1]);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(14);
        expect(label(it), p).toBe(v < 7 ? "Acidic" : v === 7 ? "Neutral" : "Basic");
        shapes.add(label(it));
      } else {
        const [a, b] = nums(p);
        const acid = /more acidic\?/.test(p);
        const want = acid ? Math.min(a, b) : Math.max(a, b);
        expect(nums(label(it)), p).toEqual([want]);
        shapes.add(acid ? "compare-acid" : "compare-base");
      }
    }
    expect([...shapes].sort()).toEqual(["Acidic", "Basic", "Neutral", "compare-acid", "compare-base"]);
  });
});

describe("s.formula.atoms", () => {
  const formula = (p: string) =>
    /is (\S+)\. How many/.exec(p)![1].replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080));
  /** Expand parentheses as text ("Ca(OH)2" → "CaOHOH"), then tally symbol by symbol. */
  const tally = (f: string) => {
    let s = f;
    while (/\(([^()]*)\)(\d+)/.test(s)) s = s.replace(/\(([^()]*)\)(\d+)/, (_, inner: string, k: string) => inner.repeat(Number(k)));
    const out: Record<string, number> = {};
    for (const [, sym, n] of s.matchAll(/([A-Z][a-z]?)(\d*)/g)) out[sym] = (out[sym] ?? 0) + Number(n || 1);
    return out;
  };
  const SYMBOL: Record<string, string> = {
    hydrogen: "H", carbon: "C", nitrogen: "N", oxygen: "O", sodium: "Na", magnesium: "Mg", aluminum: "Al", phosphorus: "P",
    sulfur: "S", chlorine: "Cl", potassium: "K", calcium: "Ca", iron: "Fe", copper: "Cu", zinc: "Zn", barium: "Ba",
  };

  it("checks the expander on known formulas", () => {
    expect(tally("C6H12O6")).toEqual({ C: 6, H: 12, O: 6 });
    expect(tally("Ca(OH)2")).toEqual({ Ca: 1, O: 2, H: 2 });
    expect(tally("(NH4)2SO4")).toEqual({ N: 2, H: 8, S: 1, O: 4 });
    expect(tally("Al2(SO4)3")).toEqual({ Al: 2, S: 3, O: 12 });
  });

  it("level 1: total atoms in the formula", () => {
    for (const it of make("s.formula.atoms", 1)) {
      const p = text(it.prompt);
      const f = formula(p);
      expect(f).not.toMatch(/\(/);
      expect(num(it), p).toBe(Object.values(tally(f)).reduce((a, b) => a + b, 0));
    }
  });

  it("level 2: atoms of one element, parentheses included", () => {
    let inside = 0;
    for (const it of make("s.formula.atoms", 2)) {
      const p = text(it.prompt);
      const f = formula(p);
      expect(f).toMatch(/\(/);
      const sym = SYMBOL[/How many (\w+) atoms/.exec(p)![1]];
      expect(sym, p).toBeDefined();
      expect(num(it), p).toBe(tally(f)[sym]);
      if (new RegExp(`\\([^)]*${sym}(?![a-z])`).test(f)) inside++;
    }
    expect(inside).toBeGreaterThan(SEEDS.length / 2);
  });
});
