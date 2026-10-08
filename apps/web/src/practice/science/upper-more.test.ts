import { describe, expect, it } from "vitest";
import { check, parseNumber } from "../answer";
import { makeItem } from "../skills";
import type { Item, MathPart } from "../types";
import { SCIENCE_6_9_MORE, SCIENCE_6_9_MORE_BANKS } from "./upper-more";
import { MOON_EVENTS, moonOptions, PHASES } from "./upper-more/moon";

// Grades 6–9 science, second strand. Every computed key is re-derived here by a different route than
// the generator's: an orbit model for the Moon, multiplying back, re-reading the numbers out of the
// prompt text, counting atoms symbol by symbol, brute-force searches. Banks are checked entry by entry.

const SEEDS = Array.from({ length: 250 }, (_, i) => i * 104729 + 17);
const text = (parts: MathPart[]) => parts.map((p) => (typeof p === "string" ? p : "sup" in p ? `${p.sup[0]}^${p.sup[1]}` : "")).join("");
const nums = (s: string) => [...s.replace(/(\d),(?=\d{3})/g, "$1").matchAll(/−?\d+(?:\.\d+)?/g)].map((m) => Number(m[0].replace("−", "-")));
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const make = (id: string, level: number, locale: "en" | "es" = "en") => SEEDS.map((seed) => makeItem(id, level, seed, locale));
const num = (it: Item) => (it.answer.kind === "number" ? it.answer.value : NaN);
const label = (it: Item) => (it.answer.kind === "choice" ? it.choices![it.answer.index].label : "");
const skill = (id: string) => SCIENCE_6_9_MORE.find((s) => s.id === id)!;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COMPUTED = SCIENCE_6_9_MORE.filter((s) => s.content === "computed").map((s) => s.id);

describe("science 6–9 second strand", () => {
  it("has the planned skills in teaching order", () => {
    expect(SCIENCE_6_9_MORE.map((s) => [s.id, s.grade, s.levels, s.content])).toEqual([
      ["s.organelles", "6", 2, "draft"],
      ["s.body.systems", "6", 2, "draft"],
      ["s.air.masses", "6", 1, "draft"],
      ["s.rock.cycle", "6", 1, "draft"],
      ["s.heat.transfer", "6", 1, "draft"],
      ["s.design.criteria", "6", 1, "draft"],
      ["s.moon.phase", "6", 2, "computed"],
      ["s.graph.rates", "7", 2, "computed"],
      ["s.photo.resp", "7", 2, "draft"],
      ["s.mixtures", "7", 1, "draft"],
      ["s.reaction.signs", "7", 1, "draft"],
      ["s.resources", "7", 1, "draft"],
      ["s.population.growth", "7", 2, "computed"],
      ["s.energy.ke.pe", "7", 2, "computed"],
      ["s.sci.notation", "8", 2, "computed"],
      ["s.natural.selection", "8", 1, "draft"],
      ["s.fossil.evidence", "8", 1, "draft"],
      ["s.geologic.time", "8", 1, "draft"],
      ["s.gravity.orbits", "8", 1, "draft"],
      ["s.climate.impact", "8", 1, "draft"],
      ["s.wave.speed", "8", 2, "computed"],
      ["s.waves.info", "8", 1, "draft"],
      ["s.periodic.trends", "9", 1, "draft"],
      ["s.bonding", "9", 1, "draft"],
      ["s.balance.equations", "9", 2, "computed"],
      ["s.percent.composition", "9", 2, "computed"],
      ["s.momentum", "9", 2, "computed"],
      ["s.ohms.law", "9", 2, "computed"],
      ["s.half.life", "9", 2, "computed"],
      ["s.nuclear", "9", 1, "draft"],
      ["s.dna.protein", "9", 1, "draft"],
      ["s.carrying.capacity", "9", 1, "draft"],
      ["s.earth.energy", "9", 1, "draft"],
      ["s.claim.evidence", "9", 1, "draft"],
    ]);
    for (const s of SCIENCE_6_9_MORE) {
      expect(s.subject).toBe("science");
      expect(s.id).toMatch(/^s\.[a-z]+(\.[a-z]+)*$/);
      expect(s.standard, s.id).toMatch(/^(MS|HS)-(LS|PS|ESS|ETS)\d-\d$|^\d\.[A-Z]+\.[A-Z]\.\d$|^HS[A-Z]-[A-Z]+\.[A-Z]\.\d$|^RST\.9-10\.\d$/);
    }
  });
});

/** Every item of a skill, both languages, every level: the problems found, as readable lines (empty when all is well). */
function problems(id: string, levels: number) {
  const out: string[] = [];
  const bad = (ok: boolean, msg: string) => {
    if (!ok && out.length < 20) out.push(msg);
  };
  const PLURAL_AFTER_1 =
    /(?<![\d.,])1 (kilogram meters|kilograms|meters|seconds|grams|joules|ohms|amps|volts|hours|days|years|minutes|atoms|kilogramos|metros|segundos|gramos|julios|ohmios|amperios|voltios|horas|días|años|minutos|átomos)\b/;
  // Spanish agreement slips that generated templates can make: a masculine word with "horas", a
  // feminine one with "días" or "años", and plural adjectives that assume a pair of boys.
  const ES_AGREEMENT = /¿Cuántos (horas|semanas)\b|¿Cuántas (días|años|minutos|segundos)\b|\ba los \d+ (h|horas)\b|están quietos/;
  for (let level = 1; level <= levels; level++) {
    const en = make(id, level, "en"), es = make(id, level, "es");
    en.forEach((a, i) => {
      const b = es[i];
      const where = `${id} L${level} seed ${a.seed}`;
      for (const it of [a, b]) {
        bad(it.hints.length === 3, `${where}: ${it.hints.length} hints`);
        bad(it.steps.length >= 1 && it.steps.length <= 4, `${where}: ${it.steps.length} steps`);
        const copy = [text(it.prompt), it.say, ...it.hints, ...it.steps, ...(it.choices ?? []).flatMap((c) => [c.label, c.say ?? ""])];
        for (const c of copy) {
          bad(!PLURAL_AFTER_1.test(c), `${where}: "1" with a plural in "${c}"`);
          if (it === b) bad(!ES_AGREEMENT.test(c), `${where}: Spanish agreement in "${c}"`);
          bad(!/!/.test(c), `${where}: exclamation in "${c}"`);
          bad(!/\p{Extended_Pictographic}/u.test(c), `${where}: emoji in "${c}"`);
          bad(!/undefined|NaN/.test(c), `${where}: undefined in "${c}"`);
        }
        for (const h of it.hints) bad(h.trim() !== "", `${where}: empty hint`);
        if (it.input === "choices") {
          const keyed = it.answer.kind === "choice" ? it.answer.index : -1;
          it.choices!.forEach((c, j) => {
            if (j === keyed) bad(c.why === undefined, `${where}: the key has a why`);
            else bad(KEBAB.test(c.why ?? ""), `${where}: untagged wrong choice "${c.label}"`);
          });
        } else {
          bad((it.wrong?.length ?? 0) > 0, `${where}: typed answer lists no likely mistakes`);
          for (const w of it.wrong ?? []) {
            bad(KEBAB.test(w.why), `${where}: tag "${w.why}"`);
            bad(parseNumber(w.value) !== null, `${where}: wrong value ${w.value} cannot be typed`);
            bad(!check(it.answer, w.value).correct, `${where}: wrong value ${w.value} checks as right`);
          }
          if (it.answer.kind === "number") {
            bad(Number.isInteger(it.answer.value) || !!it.keys?.includes("."), `${where}: decimal key without "."`);
            bad(it.answer.value >= 0 || !!it.keys?.includes("-"), `${where}: negative key without "-"`);
          }
        }
      }
      bad(JSON.stringify(b.answer) === JSON.stringify(a.answer), `${where}: answers differ between languages`);
      bad(JSON.stringify(b.wrong) === JSON.stringify(a.wrong), `${where}: wrong values differ between languages`);
      bad(JSON.stringify(b.choices?.map((c) => c.why)) === JSON.stringify(a.choices?.map((c) => c.why)), `${where}: choice tags differ between languages`);
      bad(text(b.prompt) !== text(a.prompt), `${where}: untranslated prompt`);
      if (COMPUTED.includes(id)) bad(JSON.stringify(nums(text(b.prompt))) === JSON.stringify(nums(text(a.prompt))), `${where}: numbers differ between languages`);
    });
  }
  return out;
}

describe.each(SCIENCE_6_9_MORE.map((s) => [s.id, s.levels] as const))("%s", (id, levels) => {
  it("gives every item 3 hints, 1–4 steps, plain copy, tagged mistakes, and the same answer in both languages", { timeout: 30_000 }, () => {
    expect(problems(id, levels)).toEqual([]);
  });
});

describe("question banks", () => {
  it("are read aloud without notation: no arrows or subscripts in the question or the choices", () => {
    for (const [id, levels] of Object.entries(SCIENCE_6_9_MORE_BANKS))
      levels.forEach((_, i) => {
        for (const locale of ["en", "es"] as const)
          for (const it of make(id, i + 1, locale)) for (const s of [it.say, ...it.choices!.map((c) => c.say ?? c.label)]) expect(s, `${id}: ${s}`).not.toMatch(/[→₀-₉]/);
      });
    const one = makeItem("s.mixtures", 1, SEEDS.find((seed) => text(makeItem("s.mixtures", 1, seed, "en").prompt) === "Which of these is a compound?")!, "en");
    expect(one.choices!.find((c) => c.label === "Water (H₂O)")!.say).toBe("Water (H 2 O)");
  });

  for (const [id, levels] of Object.entries(SCIENCE_6_9_MORE_BANKS)) {
    it(`${id}: well-formed, tagged entries, at least 12 per level, every one reachable`, () => {
      const s = skill(id);
      expect(s.content).toBe("draft");
      expect(levels.length).toBe(s.levels);
      levels.forEach((bank, i) => {
        const level = i + 1;
        for (const b of [bank.nudge, bank.strategy]) expect(b.en.trim() && b.es.trim(), `${id} L${level} shared hints`).toBeTruthy();
        expect(new Set(bank.items.map((x) => x.q.en)).size, `${id} L${level} distinct EN`).toBeGreaterThanOrEqual(12);
        expect(new Set(bank.items.map((x) => x.q.es)).size, `${id} L${level} distinct ES`).toBe(bank.items.length);
        expect(new Set(bank.items.map((x) => x.q.en)).size, `${id} L${level} duplicate question`).toBe(bank.items.length);
        for (const x of bank.items) {
          const where = `${id} L${level}: ${x.q.en}`;
          for (const b of [x.q, x.a, ...x.wrong.map((w) => w.c), x.clue, x.explain]) {
            expect(b.en.trim(), where).not.toBe("");
            expect(b.es.trim(), where).not.toBe("");
            expect(b.en + b.es, where).not.toMatch(/!/);
          }
          for (const w of x.wrong) expect(w.why, where).toMatch(KEBAB);
          expect(x.q.es, `${where} untranslated`).not.toBe(x.q.en);
          for (const lang of ["en", "es"] as const) {
            const labels = [x.a, ...x.wrong.map((w) => w.c)].map((c) => c[lang].toLowerCase());
            expect(new Set(labels).size, `${where} duplicate choices`).toBe(labels.length);
            expect(labels.length, `${where} needs 3+ choices`).toBeGreaterThanOrEqual(3);
            expect(labels.length, where).toBeLessThanOrEqual(4);
            // Hint 3 points the way but never names the answer.
            expect(x.clue[lang].toLowerCase(), `${where} clue gives the answer`).not.toContain(x.a[lang].toLowerCase());
            if (lang === "es") expect(x.q.es, `${where} Spanish question marks`).not.toMatch(/^[^¿]*\?/);
          }
        }
        const seen = new Set<string>();
        for (const it of make(id, level, "en")) {
          const entry = bank.items.find((x) => x.q.en === text(it.prompt));
          expect(entry, `${id} L${level} unknown prompt`).toBeDefined();
          expect(label(it)).toBe(entry!.a.en);
          expect(it.hints[2]).toBe(entry!.clue.en);
          for (const c of it.choices!) if (c.label !== entry!.a.en) expect(c.why).toBe(entry!.wrong.find((w) => w.c.en === c.label)!.why);
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

describe("question banks: no shortcuts", () => {
  // A learner who always picks the longest (or shortest) choice should not do better than chance.
  it("the key is strictly the longest choice in at most 35% of a level's entries, and strictly the shortest in at most 40%", () => {
    const out: string[] = [];
    for (const [id, levels] of Object.entries(SCIENCE_6_9_MORE_BANKS))
      levels.forEach((bank, i) => {
        for (const lang of ["en", "es"] as const) {
          const n = bank.items.length;
          const longest = bank.items.filter((x) => x.wrong.every((w) => x.a[lang].length > w.c[lang].length)).length;
          const shortest = bank.items.filter((x) => x.wrong.every((w) => x.a[lang].length < w.c[lang].length)).length;
          if (longest > 0.35 * n) out.push(`${id} L${i + 1} ${lang}: the key is the longest choice in ${longest} of ${n}`);
          if (shortest > 0.4 * n) out.push(`${id} L${i + 1} ${lang}: the key is the shortest choice in ${shortest} of ${n}`);
        }
      });
    expect(out).toEqual([]);
  });

  // Hints 1 and 2 are shared by every entry of a level, so they must not hold any entry's answer:
  // its one content word, or 75% of its several, not counting words the question already shows.
  const STOP = new Set([
    "that", "this", "with", "from", "into", "they", "them", "their", "than", "then", "what", "which", "when", "where", "does", "have", "more", "most",
    "only", "each", "other", "some", "about", "over", "para", "como", "entre", "sobre", "cada", "pero", "porque", "desde", "hasta", "este", "esta",
    "estos", "estas", "unos", "unas", "solo", "todo", "toda", "todos", "todas", "otro", "otra", "otros", "otras", "mas", "muy",
  ]);
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const stem = (w: string) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w);
  const words = (s: string) => new Set(norm(s).split(" ").filter((w) => w.length >= 4 && !STOP.has(w)).map(stem));
  const givesAway = (hint: string, q: string, answer: string) => {
    const asked = words(q), said = words(hint);
    const key = [...words(answer)].filter((w) => !asked.has(w));
    return key.length > 0 && key.filter((w) => said.has(w)).length / key.length >= 0.75;
  };

  it("hints 1 and 2 never give away an entry's answer", () => {
    expect(givesAway("Follow a protein: ribosomes build it, the Golgi apparatus packs it.", "Which organelle builds proteins?", "Ribosome")).toBe(true);
    expect(givesAway("Name the job first, then find the part that does it.", "Which organelle builds proteins?", "Ribosome")).toBe(false);
    const out: string[] = [];
    for (const [id, levels] of Object.entries(SCIENCE_6_9_MORE_BANKS))
      levels.forEach((bank, i) => {
        for (const x of bank.items)
          for (const lang of ["en", "es"] as const)
            for (const [which, h] of [["hint 1", bank.nudge], ["hint 2", bank.strategy]] as const)
              if (givesAway(h[lang], x.q[lang], x.a[lang])) out.push(`${id} L${i + 1} ${lang} ${which} gives "${x.a[lang]}"`);
      });
    expect(out).toEqual([]);
  });
});

// ── The Moon ────────────────────────────────────────────────────────────────────────────────────

/** Sun–Moon elongation in degrees (0 new, 90 first quarter, 180 full, 270 last quarter), from the
 *  low-precision lunar and solar series of the Astronomical Almanac: good to well under a degree. */
function elongation(t: number) {
  const T = (t / 86_400_000 + 2440587.5 - 2451545.0) / 36525;
  const s = (deg: number) => Math.sin((deg * Math.PI) / 180);
  const moon =
    218.32 + 481267.881 * T + 6.29 * s(135.0 + 477198.87 * T) - 1.27 * s(259.3 - 413335.36 * T) + 0.66 * s(235.7 + 890534.22 * T) +
    0.21 * s(269.9 + 954397.74 * T) - 0.19 * s(357.5 + 35999.05 * T) - 0.11 * s(186.5 + 966404.03 * T);
  const g = 357.528 + 35999.05 * T;
  const sun = 280.46 + 36000.77 * T + 1.915 * s(g) + 0.02 * s(2 * g);
  return (((moon - sun) % 360) + 360) % 360;
}
const trueBin = (t: number) => Math.round(elongation(t) / 45) % 8;
const H = 3_600_000, DAY = 24 * H;
const ANGLE: Record<string, number> = { new: 0, first: 90, full: 180, last: 270 };
const offBy = (deg: number, target: number) => ((deg - target + 540) % 360) - 180;
const MONTH: Record<string, number> = { January: 0, February: 1, March: 2, April: 3, May: 4, June: 5, July: 6, August: 7, September: 8, October: 9, November: 10, December: 11 };

// Published phase times (UT) from the US Naval Observatory's tables, typed here independently.
const USNO: [number, number, number, number, number, string][] = [
  [2025, 3, 6, 16, 31, "first"], [2025, 3, 22, 11, 29, "last"], [2025, 5, 4, 13, 52, "first"], [2025, 6, 18, 19, 19, "last"],
  [2025, 8, 9, 7, 55, "full"], [2025, 10, 7, 3, 47, "full"], [2025, 11, 20, 6, 47, "new"], [2026, 3, 11, 9, 38, "last"],
  [2026, 6, 21, 21, 55, "first"], [2026, 8, 28, 4, 18, "full"], [2027, 3, 8, 9, 29, "new"], [2027, 12, 20, 9, 11, "last"],
];
const NAME: Record<string, string> = { new: "New moon", first: "First quarter", full: "Full moon", last: "Last quarter" };

describe("s.moon.phase", () => {
  it("the orbit model reproduces the published phase times to within an hour", () => {
    for (const [y, mo, d, h, mi, ph] of USNO) {
      const deg = offBy(elongation(Date.UTC(y, mo - 1, d, h, mi)), ANGLE[ph]);
      expect(Math.abs(deg) / 12.19, `${y}-${mo}-${d} ${ph}`).toBeLessThan(1 / 24);
    }
  });

  it("counting from the latest reference with 29.53 days gives the published phase on 12 dates", () => {
    for (const [y, mo, d, , , ph] of USNO) {
      const t = Date.UTC(y, mo - 1, d);
      const refs = MOON_EVENTS.map(([ry, rm, rd, k]) => [Date.UTC(ry, rm - 1, rd), k] as const).filter(([rt]) => rt < t);
      const [rt, kind] = refs[refs.length - 1];
      const days = Math.round((t - rt) / DAY);
      const age = ((kind === "full" ? 29.53 / 2 : 0) + days) % 29.53;
      const phase = Math.round(age / (29.53 / 8)) % 8;
      expect(PHASES[phase].name.en, `${y}-${mo}-${d}`).toBe(NAME[ph]);
    }
  });

  it("every reference new or full moon really happens on its date, between 10:00 and 24:00 UT", () => {
    for (const [y, mo, d, kind] of MOON_EVENTS) {
      const t0 = Date.UTC(y, mo - 1, d);
      // The elongation passes the phase angle between 10:00 and midnight UT, so the date is the same in every US zone.
      expect(offBy(elongation(t0 + 10 * H), ANGLE[kind]), `${y}-${mo}-${d} ${kind}`).toBeLessThan(0);
      expect(offBy(elongation(t0 + 24 * H), ANGLE[kind]), `${y}-${mo}-${d} ${kind}`).toBeGreaterThan(0);
    }
    expect(new Set(MOON_EVENTS.map(([y, mo, d]) => `${y}-${mo}-${d}`)).size).toBe(MOON_EVENTS.length);
  });

  it("every day count either level can ask about matches the real Moon", () => {
    for (const level of [1, 2]) {
      const options = moonOptions(level);
      expect(new Set(options.map((o) => o.p)).size, `L${level} phases`).toBe(level === 1 ? 7 : 8);
      for (const { ev, n, p } of options) {
        const [y, mo, d] = MOON_EVENTS[ev];
        const t1 = Date.UTC(y, mo - 1, d) + n * DAY;
        const where = `L${level} ${y}-${mo}-${d} + ${n}`;
        // Midday across the US (18:00 UT) is in the keyed phase; at the ends of the US day it is at most one eighth away.
        expect(trueBin(t1 + 18 * H), where).toBe(p);
        for (const at of [4, 34]) {
          const b = trueBin(t1 + at * H);
          expect(Math.min((b - p + 8) % 8, (p - b + 8) % 8), where).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("items: the dates in the prompt, counted on the calendar, give the keyed phase in both languages", () => {
    const re = /^There is a (new|full) moon on (\w+) (\d+), (\d+)\. About what phase is the Moon in on (\w+) (\d+), (\d+)\?$/;
    for (const level of [1, 2]) {
      const es = make("s.moon.phase", level, "es");
      const seen = new Set<string>();
      make("s.moon.phase", level).forEach((it, i) => {
        const p = text(it.prompt);
        const m = re.exec(p)!;
        expect(m, p).not.toBeNull();
        const t0 = Date.UTC(Number(m[4]), MONTH[m[2]], Number(m[3])), t1 = Date.UTC(Number(m[7]), MONTH[m[5]], Number(m[6]));
        const n = (t1 - t0) / DAY;
        expect(n).toBeGreaterThanOrEqual(level === 1 ? 2 : 31);
        expect(n).toBeLessThanOrEqual(level === 1 ? 27 : 60);
        expect(MOON_EVENTS.some(([y, mo, d, k]) => Date.UTC(y, mo - 1, d) === t0 && k === m[1]), p).toBe(true);
        const want = trueBin(t1 + 18 * H);
        expect(label(it), p).toBe(PHASES[want].name.en);
        expect(label(es[i]), p).toBe(PHASES[want].name.es);
        expect(it.steps.join(" "), p).toContain(`${n} days`);
        expect(it.choices!.every((c) => c.picture), p).toBe(true);
        seen.add(label(it));
      });
      expect(seen.size, `L${level} variety`).toBe(level === 1 ? 7 : 8);
    }
  });
});

// ── Rates, populations, notation ────────────────────────────────────────────────────────────────

/** Every number in the prompt after a label such as "Count:" up to the end of that line. */
const row = (p: string, labelRe: RegExp) => nums(p.split("\n").find((l) => labelRe.test(l))!.replace(/^[^:]*:/, ""));

describe("s.graph.rates", () => {
  it("level 1: every step of the table changes by the keyed rate times the time step", () => {
    for (const it of make("s.graph.rates", 1)) {
      const p = text(it.prompt);
      const xs = row(p, /^(Time|Tiempo) \(/), ys = row(p, /^(?!Time|Tiempo).*\(.*\): /);
      expect(xs.length, p).toBe(4);
      expect(ys.length, p).toBe(4);
      for (let i = 1; i < 4; i++) expect(near(Math.abs(ys[i] - ys[i - 1]), num(it) * (xs[i] - xs[i - 1])), `${p} → ${num(it)}`).toBe(true);
      expect(num(it)).toBeGreaterThan(0);
    }
  });

  it("level 2: the graph's points sit on gridlines and every segment has the keyed slope", () => {
    for (const it of make("s.graph.rates", 2)) {
      const v = it.visual!;
      expect(v.kind).toBe("line-graph");
      if (v.kind !== "line-graph") continue;
      const maxY = Math.max(...v.points.map(([, y]) => y)), maxX = Math.max(...v.points.map(([x]) => x));
      const grid = Math.ceil(maxY / 6); // the renderer's y gridline spacing
      expect(maxX).toBeLessThanOrEqual(10);
      for (const [x, y] of v.points) {
        expect(Number.isInteger(x) && y % grid === 0, `${JSON.stringify(v.points)}`).toBe(true);
        expect(it.alt, "alt lists the points").toContain(`(${x}, ${y})`);
      }
      for (let i = 1; i < v.points.length; i++) {
        const [[x0, y0], [x1, y1]] = [v.points[i - 1], v.points[i]];
        expect(near(Math.abs(y1 - y0), num(it) * (x1 - x0)), JSON.stringify(v.points)).toBe(true);
      }
    }
  });
});

describe("s.graph.rates realism", () => {
  it("a runner keeps a steady pace a student can hold: at most 6 m/s", () => {
    let seen = 0;
    for (const level of [1, 2])
      for (const it of make("s.graph.rates", level))
        if (/runs at a steady pace/.test(text(it.prompt))) {
          expect(num(it), text(it.prompt)).toBeLessThanOrEqual(6);
          seen++;
        }
    expect(seen).toBeGreaterThan(0);
  });
});

describe("s.population.growth", () => {
  it("level 1: the table doubles each period, and doubling on from the first count reaches the key", () => {
    for (const it of make("s.population.growth", 1)) {
      const p = text(it.prompt);
      const times = row(p, /^Time/), counts = row(p, /^Count/);
      expect(counts[1]).toBe(2 * counts[0]);
      expect(counts[2]).toBe(2 * counts[1]);
      const target = Number(/after (\d+)/.exec(p)![1]);
      let n = counts[0];
      for (let t = 0; t < target; t += times[1]) n *= 2;
      expect(num(it), p).toBe(n);
    }
  });

  it("level 2: the end count minus the start equals births − deaths + in − out; percents multiply back", () => {
    const kinds = new Set<string>();
    for (const it of make("s.population.growth", 2)) {
      const p = text(it.prompt);
      if (/at the end of the year/.test(p)) {
        const [start, born, died, ...moved] = nums(p);
        const [moveIn, moveOut] = moved.length ? moved : [0, 0];
        expect(num(it) - start, p).toBe(born - died + moveIn - moveOut);
        kinds.add("count");
      } else {
        const [start, born, died] = nums(p);
        expect(near((num(it) * start) / 100, born - died), p).toBe(true);
        kinds.add(num(it) < 0 ? "decline" : "growth");
      }
    }
    expect([...kinds].sort()).toEqual(["count", "decline", "growth"]);
  });
});

// Meters (or grams, or seconds) in one of each unit, typed independently.
const UNIT: Record<string, number> = { km: 1e3, m: 1, mm: 1e-3, "µm": 1e-6, nm: 1e-9, kg: 1e3, g: 1, mg: 1e-3, s: 1, ms: 1e-3 };

describe("s.sci.notation", () => {
  const sups = (it: Item) => it.prompt.filter((x): x is { sup: [string, string] } => typeof x === "object" && "sup" in x).map((x) => x.sup[1]);
  it("level 1: the mantissa times ten to the key is the ordinary number, and written-out keys match", () => {
    const kinds = new Set<string>();
    for (const it of make("s.sci.notation", 1)) {
      const p = text(it.prompt);
      if (/What is n\?/.test(p)) {
        const plain = /about (?:every )?([\d,.]+) /.exec(p)![1].replace(/,/g, "");
        const mantissa = Number(/that is ([\d.]+) ×/.exec(p)![1]);
        expect(mantissa >= 1 && mantissa < 10, p).toBe(true);
        expect(Math.abs(mantissa * 10 ** num(it) - Number(plain)) / Number(plain), p).toBeLessThan(1e-12);
        kinds.add(num(it) > 0 ? "big" : "small");
      } else {
        const mantissa = Number(/about (?:every )?([\d.]+) ×/.exec(p)![1]);
        const e = Number(sups(it)[0].replace("−", "-"));
        expect(Math.abs(num(it) / 10 ** e - mantissa), p).toBeLessThan(1e-9);
        // The typed form has the mantissa's digits after the right number of leading or trailing zeros.
        expect(String(num(it)).replace(/[.]/g, "").replace(/^0+/, "").replace(/0+$/, ""), p).toBe(String(mantissa).replace(".", ""));
        kinds.add("write");
      }
    }
    expect([...kinds].sort()).toEqual(["big", "small", "write"]);
  });

  it("level 2: a unit change moves the exponent by the ratio of the units", () => {
    for (const it of make("s.sci.notation", 2)) {
      const p = text(it.prompt);
      const [e] = sups(it).map((s) => Number(s.replace("−", "-")));
      const from = /10\^[−\d]+ ([^\s.]+)/.exec(p)![1], to = /10\^n ([^\s.]+)/.exec(p)![1];
      expect(UNIT[from] && UNIT[to], p).toBeTruthy();
      expect(num(it), p).toBe(e + Math.round(Math.log10(UNIT[from] / UNIT[to])));
    }
  });
});

// ── Energy, waves, circuits, momentum ───────────────────────────────────────────────────────────

describe("s.energy.ke.pe", () => {
  it("level 1: twice the kinetic energy divided by the speed squared gives back the mass", () => {
    for (const it of make("s.energy.ke.pe", 1)) {
      const p = text(it.prompt);
      const [m, v] = nums(p);
      expect(near((2 * num(it)) / (v * v), m), `${p} → ${num(it)}`).toBe(true);
    }
  });

  it("level 2: the energy divided by mass and height is g = 9.8, or the height times m g gives the energy", () => {
    const kinds = new Set<string>();
    for (const it of make("s.energy.ke.pe", 2)) {
      const p = text(it.prompt);
      expect(p).toMatch(/Use g = 9\.8 N\/kg\./);
      if (/How high/.test(p)) {
        const [m, pe] = nums(p);
        expect(near(9.8 * m * num(it), pe), p).toBe(true);
        kinds.add("height");
      } else {
        const [m, h] = nums(p);
        expect(near(num(it) / (m * h), 9.8), `${p} → ${num(it)}`).toBe(true);
        kinds.add(/kinetic/.test(p) ? "fall" : "pe");
      }
    }
    expect([...kinds].sort()).toEqual(["fall", "height", "pe"]);
  });
});

describe("s.energy.ke.pe hints", () => {
  it("hint 3 is a first step, never the answer itself", () => {
    for (const level of [1, 2]) for (const it of make("s.energy.ke.pe", level)) expect(nums(it.hints[2]).at(-1), text(it.prompt)).not.toBe(num(it));
  });
});

describe("s.wave.speed", () => {
  it("level 1: the speed divided by the frequency gives back the wavelength", () => {
    for (const it of make("s.wave.speed", 1)) {
      const p = text(it.prompt);
      const [f, l] = nums(p);
      expect(near(num(it) / f, l), `${p} → ${num(it)}`).toBe(true);
    }
  });

  it("level 1: ocean waves are no faster than deep water allows, and ripple-tank waves are a few centimeters long", () => {
    const kinds = new Set<string>();
    for (const it of make("s.wave.speed", 1)) {
      const p = text(it.prompt);
      const [f, l] = nums(p);
      if (/Ocean waves/.test(p)) {
        // Deep-water waves of frequency f are λ = g ÷ (2π f²) long; near a pier they are shorter still.
        expect(l, p).toBeLessThanOrEqual(9.8 / (2 * Math.PI * f * f));
        kinds.add("ocean");
      }
      if (/ripple tank/.test(p)) {
        expect(l >= 0.01 && l <= 0.05, p).toBe(true);
        kinds.add("ripple");
      }
    }
    expect([...kinds].sort()).toEqual(["ocean", "ripple"]);
  });

  it("level 2: frequency times wavelength gives back the stated speed of the medium", () => {
    const kinds = new Set<string>();
    for (const it of make("s.wave.speed", 2)) {
      const p = text(it.prompt);
      const [v, given] = nums(p);
      expect([340, 1500, 300_000_000], p).toContain(v);
      expect(near(num(it) * given, v), `${p} → ${num(it)}`).toBe(true);
      kinds.add(/wavelength, in/.test(p) ? "wavelength" : "frequency");
    }
    expect(kinds.size).toBe(2);
  });
});

describe("s.ohms.law", () => {
  it("level 1: V = I × R holds when the key is put back", () => {
    const kinds = new Set<string>();
    for (const it of make("s.ohms.law", 1)) {
      const p = text(it.prompt);
      const [a, b] = nums(p);
      if (/What current/.test(p)) expect(near(num(it) * b, a), p).toBe(true);
      else if (/resistance, in/.test(p)) expect(near(num(it) * b, a), p).toBe(true);
      else expect(near(num(it), a * b), p).toBe(true);
      kinds.add(/What current/.test(p) ? "I" : /resistance, in/.test(p) ? "R" : "V");
    }
    expect([...kinds].sort()).toEqual(["I", "R", "V"]);
  });

  it("level 2: series resistances add, one current flows, and each resistor gets its share of the voltage", () => {
    const kinds = new Set<string>();
    for (const it of make("s.ohms.law", 2)) {
      const p = text(it.prompt);
      const rs = [...p.matchAll(/(\d+) Ω/g)].map((m) => Number(m[1]));
      const v = Number(/supply of ([\d.]+) V/.exec(p)![1]);
      const resistors = /across the resistor/.test(p) ? rs.slice(0, -1) : rs;
      const total = resistors.reduce((s, x) => s + x, 0);
      if (/total resistance/.test(p)) expect(num(it), p).toBe(total);
      else if (/What current/.test(p)) expect(near(num(it) * total, v), p).toBe(true);
      else expect(near(num(it), (v * resistors[0]) / total), p).toBe(true); // voltage divider
      kinds.add(/total resistance/.test(p) ? "total" : /What current/.test(p) ? "current" : "drop");
    }
    expect([...kinds].sort()).toEqual(["current", "drop", "total"]);
  });
});

describe("s.momentum", () => {
  it("level 1: momentum divided by mass gives the speed", () => {
    for (const it of make("s.momentum", 1)) {
      const p = text(it.prompt);
      const [m, other] = nums(p);
      if (/How fast/.test(p)) expect(near(num(it) * m, other), p).toBe(true);
      else expect(near(num(it) / m, other), p).toBe(true);
    }
  });

  it("level 1: every mass, speed and momentum is above zero, and a 1 is read with a singular unit", () => {
    for (let seed = 0; seed < 4000; seed++)
      for (const locale of ["en", "es"] as const) {
        const it = makeItem("s.momentum", 1, seed, locale);
        const p = text(it.prompt);
        for (const x of nums(p)) expect(x, p).toBeGreaterThan(0);
        expect(num(it), p).toBeGreaterThan(0);
        expect(it.say, p).not.toMatch(/(?<![\d.,])1 (kilogram meters|kilogramos metro|meters per second|metros por segundo|kilograms|kilogramos)\b/);
      }
  });

  it("level 2: total momentum is the same before and after", () => {
    const kinds = new Set<string>();
    for (const it of make("s.momentum", 2)) {
      const p = text(it.prompt);
      if (/push off/.test(p)) {
        const [ma, mb, vb] = nums(p);
        expect(near(ma * num(it), mb * vb), p).toBe(true);
        kinds.add("push");
      } else {
        const [m1, v1, m2] = nums(p);
        expect(near((m1 + m2) * num(it), m1 * v1), p).toBe(true);
        expect(num(it)).toBeLessThan(v1);
        kinds.add("stick");
      }
    }
    expect([...kinds].sort()).toEqual(["push", "stick"]);
  });
});

// ── Chemistry ───────────────────────────────────────────────────────────────────────────────────

/** Atoms in a formula, by expanding parentheses as text ("Ca(OH)2" → "CaOHOH") and reading symbol by symbol. */
const tally = (f: string) => {
  let s = f.replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080));
  while (/\(([^()]*)\)(\d+)/.test(s)) s = s.replace(/\(([^()]*)\)(\d+)/, (_, inner: string, k: string) => inner.repeat(Number(k)));
  const out: Record<string, number> = {};
  for (const [, sym, n] of s.matchAll(/([A-Z][a-z]?)(\d*)/g)) out[sym] = (out[sym] ?? 0) + Number(n || 1);
  return out;
};
/** The equation line of a prompt, with the answer blank written as "?". */
const equationLine = (it: Item) =>
  it.prompt
    .map((p) => (typeof p === "string" ? p : "blank" in p ? "?" : ""))
    .join("")
    .split("\n")[1];
/** "2 H₂ + ? O₂ → 2 H₂O" → [[[2, "H₂"], [null, "O₂"]], [[2, "H₂O"]]]; "?" and "__" are unknown coefficients. */
const parseEq = (line: string) =>
  line.split(" → ").map((side) =>
    side.split(" + ").map((term) => {
      const m = /^(?:(\d+|\?|__) )?(\S+)$/.exec(term.trim())!;
      return [m[1] === undefined ? 1 : /\d/.test(m[1]) ? Number(m[1]) : null, m[2]] as [number | null, string];
    }),
  );
const balanced = (sides: [number, string][][]) => {
  const count = (side: [number, string][]) => {
    const out: Record<string, number> = {};
    for (const [c, f] of side) for (const [x, n] of Object.entries(tally(f))) out[x] = (out[x] ?? 0) + c * n;
    return out;
  };
  const [l, r] = sides.map(count);
  return Object.keys({ ...l, ...r }).every((x) => l[x] === r[x]);
};
const gcdAll = (xs: number[]) => xs.reduce((a, b) => { while (b) [a, b] = [b, a % b]; return a; });
/** Smallest whole-number coefficients that balance the formulas, by brute force (cached per equation). */
const SMALLEST = new Map<string, number[]>();
function smallest(formulas: string[][]) {
  const key = formulas.map((s) => s.join("+")).join("=");
  if (SMALLEST.has(key)) return SMALLEST.get(key)!;
  // Each substance as a vector of atom counts, negative on the right, so a balance sums to zero.
  const species = formulas.flatMap((side, si) => side.map((f) => [tally(f), si ? -1 : 1] as const));
  const els = [...new Set(species.flatMap(([t]) => Object.keys(t)))];
  const vec = species.map(([t, sign]) => els.map((x) => sign * (t[x] ?? 0)));
  const n = vec.length;
  let best: number[] | null = null;
  const cs = new Array(n).fill(1);
  for (;;) {
    const zero = els.every((_, k) => vec.reduce((sum, v, j) => sum + cs[j] * v[k], 0) === 0);
    if (zero && gcdAll(cs) === 1 && (!best || cs.reduce((a, b) => a + b) < best.reduce((a, b) => a + b))) best = [...cs];
    let j = 0;
    while (j < n && cs[j] === 9) cs[j++] = 1;
    if (j === n) break;
    cs[j]++;
  }
  SMALLEST.set(key, best!);
  return best!;
}

describe("s.balance.equations", () => {
  it("level 1: putting the key in the blank balances every element", () => {
    for (const it of make("s.balance.equations", 1)) {
      const line = equationLine(it);
      const sides = parseEq(line);
      expect(sides.flat().filter(([c]) => c === null).length, line).toBe(1);
      const filled = sides.map((s) => s.map(([c, f]) => [c ?? num(it), f] as [number, string]));
      expect(balanced(filled), `${line} → ${num(it)}`).toBe(true);
    }
  });

  it("level 2: the key is the coefficient in the smallest whole-number balance, found by brute force", { timeout: 30_000 }, () => {
    for (const it of make("s.balance.equations", 2)) {
      const p = text(it.prompt);
      const sides = parseEq(equationLine(it));
      expect(sides.flat().every(([c]) => c === null), p).toBe(true);
      const formulas = sides.map((s) => s.map(([, f]) => f));
      const coefs = smallest(formulas);
      const asked = /in front of (\S+)\?/.exec(p)![1];
      expect(num(it), p).toBe(coefs[formulas.flat().indexOf(asked)]);
    }
  });
});

describe("s.balance.equations hints", () => {
  const per = (side: [number | null, string][], x: string) => side.reduce((s, [c, f]) => s + (c === null ? 0 : c * (tally(f)[x] ?? 0)), 0);

  it("level 1: hint 3's atom counts, recounted from the equation, lead to the key", () => {
    const re = /^The (left|right) side has (\d+) (\w+) atoms?(?:; (\d+) (?:is|are) already in .+ on the (?:left|right), so (\S+) must supply (\d+))?\.(?: Each (\S+) has (\d+)\.)?$/;
    let shared = 0;
    for (const it of make("s.balance.equations", 1)) {
      const sides = parseEq(equationLine(it));
      const hs = sides.findIndex((side) => side.some(([c]) => c === null));
      const F = sides[hs].find(([c]) => c === null)![1];
      const m = re.exec(it.hints[2]);
      expect(m, it.hints[2]).not.toBeNull();
      const [, otherName, N, X, S, F1, M, F2, n] = m!;
      expect(otherName, it.hints[2]).toBe(hs ? "left" : "right");
      expect(Number(N), it.hints[2]).toBe(per(sides[1 - hs], X));
      const rest = per(sides[hs], X); // the blank's own term counts 0
      expect(Number(S ?? 0), it.hints[2]).toBe(rest);
      if (S) {
        expect(F1).toBe(F);
        expect(Number(M), it.hints[2]).toBe(Number(N) - rest);
        shared++;
      }
      if (n) {
        expect(F2).toBe(F);
        expect(Number(n)).toBe(tally(F)[X]);
      } else expect(F, it.hints[2]).toBe(X);
      expect(num(it) * tally(F)[X], it.hints[2]).toBe(Number(N) - rest);
    }
    expect(shared, "some hints account for atoms already on the blank's side").toBeGreaterThan(0);
  });

  it("level 2: hint 3 only calls an element a starting point when it is in one substance on each side", () => {
    const one = /^(\w+) appears in only one substance on each side, so start with it\.(?: Each (\S+) has (\d+) (\w+) atoms?\.)?$/;
    const many = /^Start with (.+), which appears? in only one substance on each side\. Leave (\w+) for last, because it appears in more than one substance on a side\.$/;
    for (const it of make("s.balance.equations", 2)) {
      const sides = parseEq(equationLine(it));
      const single = (x: string) => sides.every((side) => side.filter(([, f]) => tally(f)[x]).length === 1);
      const h = it.hints[2];
      const a = one.exec(h), b = many.exec(h);
      expect(a ?? b, h).toBeTruthy();
      if (a) {
        expect(single(a[1]), h).toBe(true);
        if (a[2]) expect(tally(a[2])[a[4]], h).toBe(Number(a[3]));
      } else {
        for (const x of b![1].split(/, | and /)) expect(single(x), h).toBe(true);
        expect(single(b![2]), h).toBe(false);
      }
    }
  });
});

// Standard atomic weights (IUPAC), typed here independently: the masses in the prompts may be rounded, never wrong.
const WEIGHT: Record<string, number> = { H: 1.008, C: 12.011, N: 14.007, O: 15.999, Na: 22.99, Mg: 24.305, Al: 26.982, S: 32.06, Cl: 35.45, K: 39.098, Ca: 40.078, Fe: 55.845, Cu: 63.546 };

describe("s.percent.composition", () => {
  const read = (p: string) => {
    const f = /, (\S+), (?:in atomic|is )/.exec(p)![1];
    const masses = Object.fromEntries([...p.matchAll(/([A-Z][a-z]?) = (\d+(?:\.\d+)?)/g)].map((m) => [m[1], Number(m[2])]));
    return { f, masses, atoms: tally(f) };
  };
  it("level 1: the formula mass is the sum over the atoms, and the given masses round the real ones", () => {
    for (const it of make("s.percent.composition", 1)) {
      const p = text(it.prompt);
      const { masses, atoms } = read(p);
      expect(Object.keys(masses).sort(), p).toEqual(Object.keys(atoms).sort());
      for (const [x, m] of Object.entries(masses)) expect(Math.abs(m - WEIGHT[x]), `${p} ${x}`).toBeLessThanOrEqual(0.5);
      expect(near(num(it), Object.entries(atoms).reduce((s, [x, n]) => s + masses[x] * n, 0)), p).toBe(true);
    }
  });

  it("level 2: the percent times the formula mass gives the element's share of the mass", () => {
    for (const it of make("s.percent.composition", 2)) {
      const p = text(it.prompt);
      const { masses, atoms } = read(p);
      const el = /\(([A-Z][a-z]?)\)\?/.exec(p)![1];
      const total = Object.entries(atoms).reduce((s, [x, n]) => s + masses[x] * n, 0);
      expect(near((num(it) * total) / 100, masses[el] * atoms[el]), `${p} → ${num(it)}`).toBe(true);
    }
  });
});

describe("s.half.life", () => {
  it("amounts, times, and carbon-14 fractions and ages agree with halving step by step", () => {
    const kinds = new Set<string>();
    for (const level of [1, 2])
      for (const it of make("s.half.life", level)) {
        const p = text(it.prompt);
        if (/How many (grams|milligrams) are left/.test(p)) {
          const [A, T, t] = nums(p.replace(/-\d+/, ""));
          let left = A;
          for (let done = 0; done < t - 1e-9; done += T) left /= 2;
          expect(near(num(it), left), p).toBe(true);
          kinds.add("left");
        } else if (/until only/.test(p)) {
          const [A, T, R] = nums(p.replace(/-\d+/, ""));
          let n = 0;
          for (let x = A; x > R; x /= 2) n++;
          expect(near(num(it), n * T), p).toBe(true);
          kinds.add("time");
        } else if (/What fraction/.test(p)) {
          const age = nums(p).at(-1)!;
          const n = age / 5730;
          expect(Number.isInteger(n), p).toBe(true);
          expect(it.answer).toEqual({ kind: "fraction", n: 1, d: 2 ** n });
          kinds.add("fraction");
        } else {
          const frac = it.prompt.find((x): x is { frac: [number, number] } => typeof x === "object" && "frac" in x)!.frac;
          expect(frac[0]).toBe(1);
          expect(num(it), p).toBe(5730 * Math.log2(frac[1]));
          kinds.add("age");
        }
      }
    expect([...kinds].sort()).toEqual(["age", "fraction", "left", "time"]);
  });
});

