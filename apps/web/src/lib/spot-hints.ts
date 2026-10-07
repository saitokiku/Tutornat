import type { Item, MathPart } from "@/practice/types";

// Demo-tutor pointing, pure. Given a practice item and a rung of its vetted hint ladder, which part of
// the item is that hint about? Only answered when it can be read off the hint's words and the item's
// structure without guessing ("the bottom number" + exactly one given fraction; "now the tens" + a
// column sum). Otherwise null — the demo tutor then just says the hint. Ids follow docs/spotlight.md.
//
// Honesty: these rules only ever name parts of what is given (the prompt, the picture) or the empty
// slot the answer goes in. They never name a choice, and answerSpots lists what must never be lit.

type Rule = (item: Item, hint: string) => string | null;

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Place = "ones" | "tens" | "hundreds" | "thousands";
const PLACE: Record<string, Place> = {
  ones: "ones", unidades: "ones",
  tens: "tens", decenas: "tens",
  hundreds: "hundreds", centenas: "hundreds",
  thousands: "thousands", millares: "thousands",
};
const PLACE_WORD = "ones|tens|hundreds|thousands|unidades|decenas|centenas|millares";

/** The place a hint is working in: a leading "Tens:", a "now / start at / first the …", or the only place it names. */
function placeOf(h: string): Place | null {
  const lead = h.match(new RegExp(`^(${PLACE_WORD})\\s*:`));
  const focus = h.match(new RegExp(`\\b(?:now|start (?:at|with)|first|ahora|empieza (?:por|con)|primero)\\s+(?:the\\s+|las\\s+|los\\s+)?(${PLACE_WORD})\\b`));
  const named = [...new Set([...h.matchAll(new RegExp(`\\b(${PLACE_WORD})\\b`, "g"))].map((m) => PLACE[m[1]]))];
  const word = lead?.[1] ?? focus?.[1];
  if (word) return PLACE[word];
  return named.length === 1 ? named[0] : null;
}

const ORDER: Place[] = ["ones", "tens", "hundreds", "thousands"];

const TOP = /\b(top|tops|numerator|numerators|arriba|numerador|numeradores)\b/;
const BOTTOM = /\b(bottom|bottoms|denominator|denominators|abajo|denominador|denominadores)\b/;
const BOTH = /\b(both|ambas|ambos|las dos|los dos)\b/;
const side = (h: string): "top" | "bottom" | "whole" | null => {
  const t = TOP.test(h), b = BOTTOM.test(h);
  return t && b ? "whole" : t ? "top" : b ? "bottom" : null;
};

type Frac = { frac: [number | string, number | string] };
const isFrac = (p: MathPart): p is Frac => typeof p === "object" && "frac" in p;
const unknown = (v: number | string) => typeof v === "string" && v.trim() === "?";

const RULES: Rule[] = [
  // Clock hands: the hint says which hand to read.
  (item, h) => {
    if (item.visual?.kind !== "clock") return null;
    if (/\b(short hand|hour hand)\b|manecilla corta/.test(h)) return "visual.clock.hour";
    if (/\b(long hand|minute hand)\b|manecilla larga/.test(h)) return "visual.clock.minute";
    return null;
  },
  // Place value: the column (or block group) the hint is working in, if the picture has it.
  (item, h) => {
    const v = item.visual;
    if (v?.kind !== "column" && v?.kind !== "base-ten") return null;
    const place = placeOf(h);
    if (!place) return null;
    if (v.kind === "column") {
      const digits = Math.max(String(v.top).length, String(v.bottom).length);
      return ORDER.indexOf(place) < digits ? `visual.column.${place}` : null;
    }
    const count = { ones: v.ones, tens: v.tens, hundreds: v.hundreds ?? 0, thousands: 0 }[place];
    return count > 0 ? `visual.baseten.${place}` : null;
  },
  // The dot on a number line ("count the jumps from 0 to the dot").
  (item, h) => (item.visual?.kind === "number-line" && item.visual.marker !== undefined && /\bdot\b|\bpunto\b(?! decimal)/.test(h) ? "visual.numberline.marker" : null),
  // "The bottom number is 6" when the answer is a fraction typed into the pad: the slot it goes in.
  (item, h) => {
    if (item.input !== "fraction" || item.prompt.some((p) => isFrac(p) && !unknown(p.frac[0]) && !unknown(p.frac[1]))) return null;
    const s = side(h);
    return s === "top" || s === "bottom" ? `practice.pad.fraction.${s}` : null;
  },
  // A given fraction's top or bottom number, when exactly one fraction in the prompt can be meant.
  (item, h) => {
    const s = side(h);
    if (!s || BOTH.test(h)) return null;
    const given = item.prompt
      .map((p, i) => [p, i] as const)
      .filter(([p]) => isFrac(p) && (s === "whole" ? !p.frac.some(unknown) : !unknown(p.frac[s === "top" ? 0 : 1])));
    if (given.length !== 1) return null;
    const i = given[0][1];
    return s === "whole" ? `practice.prompt.part.${i}` : `practice.prompt.part.${i}.${s}`;
  },
  // "The exponent 2 tells…" with one power in the prompt.
  (item, h) => {
    if (!/\b(exponent|exponente)\b/.test(h)) return null;
    const powers = item.prompt.map((p, i) => [p, i] as const).filter(([p]) => typeof p === "object" && "sup" in p);
    return powers.length === 1 ? `practice.prompt.part.${powers[0][1]}.exp` : null;
  },
  // Ten-frame: the empty boxes still to fill.
  (item, h) => {
    const v = item.visual;
    return v?.kind === "ten-frame" && v.filled < (v.frames ?? 1) * 10 && /empty box|casillas? vacias?/.test(h) ? "visual.tenframe.empty" : null;
  },
  // Counters: the top row.
  (item, h) => (item.visual?.kind === "dots" && /top row|fila de arriba/.test(h) ? "visual.dots.row.0" : null),
  // The whole picture, when the hint is about its parts.
  (item, h) => (item.visual?.kind === "fraction" && /equal parts|partes iguales|shaded|sombread|\bbar\b|\bbarra\b/.test(h) ? "visual.fraction" : null),
  (item, h) => (item.visual?.kind === "number-line" && /equal parts|partes iguales|jumps|saltos|number line|recta numerica/.test(h) ? "visual.numberline" : null),
];

/**
 * The spot id a vetted hint is about, for the demo tutor to light beside the hint, or null.
 * `rung` is the hint's index in item.hints (0 = the first, smallest hint).
 */
export function hintSpot(item: Item, rung: number): string | null {
  const hint = item.hints[rung];
  if (!hint) return null;
  const h = fold(hint);
  for (const rule of RULES) {
    const id = rule(item, h);
    if (id) return id;
  }
  return null;
}

/**
 * Targets that would give the answer away for this item: the correct choice, the answer's tick on a
 * number-line pad. The practice screen passes these to guardSpots while the item is up.
 */
export function answerSpots(item: Item): string[] {
  const out: string[] = [];
  const a = item.answer;
  if (a.kind === "choice") out.push(`practice.choice.${a.index}`);
  if (item.pad?.kind === "number-line") {
    const value = a.kind === "number" ? a.value : a.kind === "fraction" ? a.n / a.d : null;
    if (value !== null) out.push(`practice.pad.numberline.tick.${Math.round((value - item.pad.min) / item.pad.step)}`);
  }
  return out;
}
