import type { Locale } from "@/lib/types";
import type { Answer, Choice, ItemBody } from "./types";

// A spoken answer, as the pad would have taken it (live tutor spec §2.5). Recognizers write "Three
// fourths.", "It's twelve.", "doce" or "half past three"; the checker (./answer check) reads digits.
// This turns what a learner said into the response the pad would have produced — "3/4", "12", "3:30",
// a choice's index — and the code checker decides, as for a typed answer. Pure; English and Spanish.
//
// It reads: number words to a billion ("a hundred", "one hundred and five", "mil doscientos"),
// negatives ("negative / minus two", "menos dos"), decimals ("three point five", "tres coma cinco"),
// fractions ("three fourths / quarters / over four", "tres cuartos", "un medio"), mixed numbers
// ("two and a half", "dos y medio"), times ("half past three", "quarter to four", "las tres y
// media", "cuarto para las cuatro"), choices ("the second one", "B", "la segunda", the label's
// words), sets, pairs and remainders. Lead-ins go ("I think it's", "is it", "creo que es", "son"), a
// self-correction keeps the last answer ("ten, no, twelve" → 12), units go ("twelve centimeters").
// Anything it can't read with confidence is null: then the tutor asks again and never says "wrong".

export type SpokenReading = {
  /** What the pad would have sent to check(): text for typed answers, the index for a choice. */
  response: string | number;
  /** How to show it back big: "7", "3/4", "3:30", the choice's label. */
  reading: string;
  /** "sure": a complete answer said plainly. "unsure": hedged ("maybe", a rising "?"). */
  certainty: "sure" | "unsure";
};

/** Skills a spoken answer can't show: spelling and reading words, capitals, homophones, contractions, commas. */
const TYPE_IT = new Set(["e.cvc.words", "e.capitals", "e.homophones", "e.contractions", "e.commas"]);

/** Can this item be answered out loud? Not spelling-like skills (a recognizer spells for the child) and not algebra expressions. */
export function voiceAnswerable(skillId: string, item: Pick<ItemBody, "answer" | "input">): boolean {
  return !TYPE_IT.has(skillId) && item.answer.kind !== "expr" && item.input !== "expr";
}

// ---- words

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function tokens(text: string): string[] {
  return fold(text)
    .replace(/['’]/g, "") // it's → its, o'clock → oclock
    .replace(/(\d),(\d{3})(?!\d)/g, "$1$2") // 1,200
    .replace(/[“”"«»¿¡!;]/g, " ")
    .replace(/(\d)\s*\/\s*(\d)/g, "$1/$2")
    .replace(/-(?=\p{L})/gu, " ") // twenty-one
    .replace(/([.,?])(?=\s|$)/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

const EN_UNITS: Record<string, number> = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const EN_TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const ES_UNITS: Record<string, number> = {
  cero: 0, uno: 1, un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13,
  catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintiun: 21, veintiuna: 21,
  veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
};
const ES_TENS: Record<string, number> = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
const ES_HUNDREDS: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400, quinientos: 500,
  quinientas: 500, seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};

type Num = { value: number; next: number; digits?: boolean };

const DIGITS = /^-?\d+(?:\.\d+)?$/;

/** A whole number from tokens[i]: words ("one hundred and five", "doscientos treinta y uno") or digits. */
function cardinal(t: string[], i: number, locale: Locale): Num | null {
  if (DIGITS.test(t[i] ?? "") && !t[i].includes(".")) return { value: Number(t[i]), next: i + 1, digits: true };
  let total = 0;
  let group = 0;
  let any = false;
  let j = i;
  const en = locale === "en";
  for (; j < t.length; j++) {
    const w = t[j];
    if (en) {
      if (w in EN_UNITS && !(w === "oh" && !any)) {
        if (any && group % 100 !== 0 && !(group % 10 === 0 && group % 100 >= 20 && EN_UNITS[w] < 10)) break;
        group += EN_UNITS[w];
      } else if (w in EN_TENS) {
        if (any && group % 100 !== 0) break;
        group += EN_TENS[w];
      } else if (w === "hundred") group = (group || 1) * 100;
      else if (w === "thousand" || w === "million") {
        total += (group || 1) * (w === "thousand" ? 1000 : 1e6);
        group = 0;
      }
      else if (w === "a" && /^(hundred|thousand|million)$/.test(t[j + 1] ?? "")) group = group || 0;
      else if (w === "and" && any && /^(hundred|thousand)$/.test(t[j - 1] ?? "") && (t[j + 1] ?? "") in { ...EN_UNITS, ...EN_TENS }) continue;
      else break;
    } else {
      if (w in ES_HUNDREDS) {
        if (any && group % 1000 !== 0) break;
        group += ES_HUNDREDS[w];
      } else if (w in ES_TENS) {
        if (any && group % 100 !== 0) break;
        group += ES_TENS[w];
        if (t[j + 1] === "y" && (t[j + 2] ?? "") in ES_UNITS && ES_UNITS[t[j + 2]] < 10) {
          group += ES_UNITS[t[j + 2]];
          j += 2;
        }
      } else if (w in ES_UNITS) {
        if (any && group % 100 !== 0) break;
        group += ES_UNITS[w];
      } else if (w === "mil" || w === "millon" || w === "millones") {
        total += (group || 1) * (w === "mil" ? 1000 : 1e6);
        group = 0;
      } else break;
    }
    any = true;
  }
  return any ? { value: total + group, next: j } : null;
}

const EN_ORDINAL: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13,
  fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20, hundredth: 100, thousandth: 1000,
};
const ES_DENOM: Record<string, number> = { medio: 2, media: 2, tercio: 3, cuarto: 4, quinto: 5, sexto: 6, septimo: 7, octavo: 8, noveno: 9, decimo: 10, centesimo: 100, milesimo: 1000, undecimo: 11, duodecimo: 12 };

/** A fraction's denominator word ("fourths", "quarters", "halves"; "cuartos", "medios", "dieciseisavos"). */
function denominator(w: string | undefined, locale: Locale): number | null {
  if (!w) return null;
  if (locale === "en") {
    if (/^(half|halves)$/.test(w)) return 2;
    if (/^quarters?$/.test(w)) return 4;
    const base = w.replace(/s$/, "");
    if (base in EN_ORDINAL && EN_ORDINAL[base] >= 3) return EN_ORDINAL[base];
    return null;
  }
  const base = w.replace(/s$/, "");
  if (base in ES_DENOM) return ES_DENOM[base];
  // "onceavos", "dieciseisavos", "veinteavos": the cardinal and -avo.
  const avo = /^(.+)avo$/.exec(base);
  const n = avo ? ES_UNITS[avo[1]] : undefined;
  return n != null && n >= 11 ? n : null;
}

type Quantity = { n: number; d: number; mixedWhole?: number; text: string; next: number };

const NEG = new Set(["negative", "minus", "menos"]);

/** One quantity from tokens[i]: a whole number, a decimal, a fraction or a mixed number, maybe negative. */
function quantity(t: string[], i: number, locale: Locale): Quantity | null {
  let j = i;
  let sign = 1;
  if (NEG.has(t[j])) {
    sign = -1;
    j++;
  }
  const w = t[j];
  if (!w) return null;
  // Digits as written: 12, -3, 3.5, 3,5 (Spanish), 3/4
  const frac = /^(-?\d+)\/(\d+)$/.exec(w);
  if (frac) return { n: sign * Number(frac[1]), d: Number(frac[2]), text: `${sign < 0 ? "-" : ""}${frac[1]}/${frac[2]}`, next: j + 1 };
  if (/^-?\d+[.,]\d+$/.test(w) && (locale === "es" || w.includes("."))) {
    const v = sign * Number(w.replace(",", "."));
    return { n: v, d: 1, text: String(v), next: j + 1 };
  }
  // "a half", "a third", "a quarter", "half"
  const aDen = w === "a" ? denominator(t[j + 1], locale) : null;
  if (aDen) return { n: sign, d: aDen, text: `${sign < 0 ? "-" : ""}1/${aDen}`, next: j + 2 };
  if (w === "half" || w === "medio" || w === "media") return { n: sign, d: 2, text: `${sign < 0 ? "-" : ""}1/2`, next: j + 1 };
  const c = cardinal(t, j, locale);
  if (!c) return null;
  j = c.next;
  // Decimals: "three point five", "tres coma setenta y cinco"
  if (/^(point|punto|coma)$/.test(t[j] ?? "")) {
    let digits = "";
    let k = j + 1;
    if (locale === "es" && t[k] !== "cero") {
      const after = cardinal(t, k, locale);
      if (after && after.value < 100) {
        digits = String(after.value);
        k = after.next;
      }
    }
    if (!digits)
      for (; k < t.length; k++) {
        const d = (locale === "en" ? EN_UNITS : ES_UNITS)[t[k]];
        if (/^\d$/.test(t[k])) digits += t[k];
        else if (d != null && d < 10 && t[k] !== "oh") digits += d;
        else break;
      }
    if (!digits) return null;
    const v = sign * Number(`${c.value}.${digits}`);
    return { n: v, d: 1, text: String(v), next: k };
  }
  // Fractions: "three fourths", "tres cuartos", "three over four", "tres sobre cuatro"
  const den = denominator(t[j], locale);
  if (den) return { n: sign * c.value, d: den, text: `${sign < 0 ? "-" : ""}${c.value}/${den}`, next: j + 1 };
  if (/^(over|sobre)$/.test(t[j] ?? "") || (t[j] === "out" && t[j + 1] === "of")) {
    const d = cardinal(t, j + (t[j] === "out" ? 2 : 1), locale);
    if (!d || d.value === 0) return null;
    return { n: sign * c.value, d: d.value, text: `${sign < 0 ? "-" : ""}${c.value}/${d.value}`, next: d.next };
  }
  // Mixed numbers: "two and a half", "two and three fourths", "dos y medio", "dos enteros y tres cuartos"
  let k = j;
  if (locale === "es" && /^enteros?$/.test(t[k] ?? "")) k++;
  if ((t[k] === "and" || t[k] === "y") && sign > 0) {
    const part = quantity(t, k + 1, locale);
    if (part && part.d > 1 && part.n > 0 && part.n < part.d && part.mixedWhole == null) return { n: c.value * part.d + part.n, d: part.d, mixedWhole: c.value, text: `${c.value} ${part.n}/${part.d}`, next: part.next };
  }
  return { n: sign * c.value, d: 1, text: String(sign * c.value), next: j };
}

// ---- what comes around the answer

const LEAD_INS: Record<Locale, string[]> = {
  en: ["i think it is", "i think its", "i think that its", "i think the answer is", "i think", "the answer is", "my answer is", "it is", "its", "is it", "is", "maybe", "um", "uh", "hmm", "so", "well", "ok", "okay", "i got", "i said", "equals", "it equals", "that is", "thats", "the"],
  es: ["creo que es", "creo que son", "creo que", "pienso que es", "pienso que", "la respuesta es", "mi respuesta es", "es", "son", "seria", "serian", "a lo mejor", "quizas", "tal vez", "este", "eh", "pues", "bueno", "da", "me da", "el", "la", "los", "las"],
};
const HEDGES = /\b(maybe|i guess|probably|quizas|tal vez|a lo mejor)\b/;
// "ten, no, twelve", "ten I mean twelve", "diez no doce", "diez digo doce", "ten wait twelve"
const CORRECTION = /\b(?:no|i mean|i meant|wait|actually|sorry|oops|digo|perdon|o sea|mejor dicho|espera)\b/;

function stripLeadIns(t: string[], locale: Locale): string[] {
  const out = [...t];
  for (let changed = true; changed && out.length; ) {
    changed = false;
    for (const lead of LEAD_INS[locale]) {
      const w = lead.split(" ");
      if (out.length > w.length && w.every((x, k) => out[k] === x.replace(/'/g, ""))) {
        out.splice(0, w.length);
        changed = true;
        break;
      }
    }
  }
  return out;
}

/** The part after the last self-correction, when what follows it still reads as an answer. */
function lastAnswer(text: string): string {
  const parts = fold(text).split(new RegExp(`[,.]?\\s*${CORRECTION.source}[,.]?\\s*`));
  const tail = parts[parts.length - 1]?.trim();
  return parts.length > 1 && tail ? tail : text;
}

const UNIT_WORDS = new Set(
  "centimeters centimeter cm meters meter m kilometers km inches inch feet foot yards miles grams gram kilograms kg pounds liters milliliters degrees degree units unit square cubic apples dots things ones tens hundreds blocks cookies people minutes hours days pieces parts slices dollars dollar centimetros centimetro metros metro kilometros pulgadas pies gramos kilogramos libras litros grados unidades cuadrados cubicos manzanas puntos cosas personas minutos horas dias piezas partes dolares pesos de".split(
    " ",
  ),
);

/** Exactly one quantity, with only lead-ins before it and unit words after it; null otherwise. */
function onlyQuantity(text: string, locale: Locale): Quantity | null {
  const t = stripLeadIns(tokens(lastAnswer(text)), locale);
  const q = quantity(t, 0, locale);
  if (!q) return null;
  const rest = t.slice(q.next).filter((w) => !UNIT_WORDS.has(w));
  return rest.length ? null : q;
}

// ---- times

const EN_HOUR = (w: string | undefined) => (w == null ? null : (cardinal([w], 0, "en")?.value ?? null));

function timeOf(text: string, locale: Locale): { h: number; m: number } | null {
  const t = stripLeadIns(tokens(lastAnswer(text)), locale).filter((w) => !/^(oclock|am|pm|exactly|las|la)$/.test(w));
  const s = t.join(" ");
  const digits = /^(\d{1,2}):(\d{2})$/.exec(t[0] ?? "");
  if (digits && t.length === 1) return { h: Number(digits[1]), m: Number(digits[2]) };
  const ok = (h: number | null, m: number) => (h != null && h >= 1 && h <= 12 && m >= 0 && m < 60 ? { h, m } : null);
  if (locale === "en") {
    let m: RegExpExecArray | null;
    if ((m = /^half past (\S+)$/.exec(s))) return ok(EN_HOUR(m[1]), 30);
    if ((m = /^(?:a )?quarter past (\S+)$/.exec(s))) return ok(EN_HOUR(m[1]), 15);
    if ((m = /^(?:a )?quarter (?:to|till|of) (\S+)$/.exec(s))) {
      const h = EN_HOUR(m[1]);
      return ok(h == null ? null : h === 1 ? 12 : h - 1, 45);
    }
    const c = cardinal(t, 0, "en");
    if (!c || c.value < 1 || c.value > 12) return null;
    const rest = t.slice(c.next);
    if (!rest.length || (rest.length === 1 && rest[0] === "oclock")) return ok(c.value, 0);
    if (rest[0] === "oh" && rest.length === 2) return ok(c.value, EN_UNITS[rest[1]] ?? -1);
    const min = cardinal(rest, 0, "en");
    return min && min.next === rest.length && min.value >= 10 ? ok(c.value, min.value) : null;
  }
  // Spanish: "tres y media", "tres y cuarto", "cuatro menos cuarto", "cuarto para las cuatro", "tres en punto", "tres y cinco", "tres treinta"
  let m: RegExpExecArray | null;
  if ((m = /^(?:un )?cuarto para (?:las |la )?(.+)$/.exec(s))) {
    const h = cardinal(m[1].split(" "), 0, "es")?.value ?? null;
    return ok(h == null ? null : h === 1 ? 12 : h - 1, 45);
  }
  const c = cardinal(t, 0, "es");
  if (!c || c.value < 1 || c.value > 12) return null;
  const rest = t.slice(c.next).join(" ");
  if (!rest || rest === "en punto") return ok(c.value, 0);
  if (rest === "y media") return ok(c.value, 30);
  if (rest === "y cuarto") return ok(c.value, 15);
  if (rest === "menos cuarto") return ok(c.value === 1 ? 12 : c.value - 1, 45);
  const min = /^(?:y )?(.+)$/.exec(rest);
  const mm = min ? cardinal(min[1].split(" "), 0, "es") : null;
  return mm && mm.next === min![1].split(" ").length ? ok(c.value, mm.value) : null;
}

const timeText = ({ h, m }: { h: number; m: number }) => `${h}:${String(m).padStart(2, "0")}`;

// ---- choices

const EN_POSITION: Record<string, number> = { first: 0, second: 1, third: 2, fourth: 3, fifth: 4 };
const ES_POSITION: Record<string, number> = { primera: 0, primero: 0, primer: 0, segunda: 1, segundo: 1, tercera: 2, tercero: 2, tercer: 2, cuarta: 3, cuarto: 3, quinta: 4, quinto: 4 };
const SYMBOL_WORDS: Record<string, string[]> = {
  "<": ["less than", "is less than", "smaller than", "menor que", "es menor que", "less", "menor"],
  ">": ["greater than", "is greater than", "bigger than", "more than", "mayor que", "es mayor que", "greater", "mayor"],
  "=": ["equal", "equals", "equal to", "is equal to", "the same", "igual", "es igual", "igual a", "son iguales", "iguales"],
};
const words = (s: string) => tokens(s).join(" ");

function choiceOf(text: string, choices: Choice[], locale: Locale): number | null {
  const said = words(lastAnswer(text));
  const t = stripLeadIns(tokens(lastAnswer(text)), locale);
  const core = t.join(" ");
  // Position: "the second one", "la segunda", "the last one"
  const pos = /^(?:the |la |el )?(\S+)(?: one| option| choice| answer| opcion)?$/.exec(core);
  if (pos) {
    const p = pos[1] === "last" || pos[1] === "ultima" || pos[1] === "ultimo" ? choices.length - 1 : (locale === "en" ? EN_POSITION : ES_POSITION)[pos[1]];
    const isLabel = choices.some((c) => words(c.label) === core);
    if (p != null && p < choices.length && !isLabel) return p;
  }
  // A letter: "B", "letter b", "option b", "la b"
  const letter = /^(?:letter |option |opcion |la |el )?([a-e])$/.exec(core);
  if (letter && !choices.some((c) => words(c.label) === letter[1])) {
    const i = letter[1].charCodeAt(0) - 97;
    if (i < choices.length) return i;
  }
  // The label itself, its spoken form, a number, a time or a sign said in words.
  const matches = new Set<number>();
  const q = onlyQuantity(text, locale);
  const tm = timeOf(text, locale);
  choices.forEach((c, i) => {
    const label = words(c.label);
    const forms = [label, c.say ? words(c.say) : "", ...(SYMBOL_WORDS[c.label.trim()] ?? [])].filter(Boolean);
    if (forms.some((f) => core === f || said === f)) matches.add(i);
    const cq = quantity(tokens(c.label), 0, locale);
    if (q && cq && cq.next === tokens(c.label).length && q.n * cq.d === cq.n * q.d) matches.add(i);
    const ct = /^(\d{1,2}):(\d{2})$/.exec(c.label.trim());
    if (tm && ct && tm.h === Number(ct[1]) && tm.m === Number(ct[2])) matches.add(i);
  });
  if (matches.size === 1) return [...matches][0];
  if (matches.size > 1) return null;
  // A label said inside a sentence ("I think it's the sun"): exactly one label's words, as whole words.
  const inside = choices.map((c, i) => [i, words(c.label)] as const).filter(([, l]) => l.length > 1 && new RegExp(`(^| )${l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`).test(core));
  return inside.length === 1 ? inside[0][0] : null;
}

// ---- the reading

const certainty = (text: string): SpokenReading["certainty"] => (HEDGES.test(fold(text)) || /\?\s*$/.test(text.trim()) ? "unsure" : "sure");

const numberText = (q: Quantity) => (q.d === 1 ? String(q.n) : q.mixedWhole != null ? q.text : `${q.n}/${q.d}`);

/**
 * What the learner said as the answer to `item`, or null when it can't be read with confidence (then
 * ask again; never call it wrong). The response goes to check() like a typed one.
 */
export function readSpoken(transcript: string, item: Pick<ItemBody, "answer" | "choices" | "input">, locale: Locale): SpokenReading | null {
  const text = transcript.trim();
  if (!text) return null;
  const a: Answer = item.answer;
  const sure = certainty(text);
  switch (a.kind) {
    case "choice": {
      const i = item.choices ? choiceOf(text, item.choices, locale) : null;
      return i == null ? null : { response: i, reading: item.choices![i].label, certainty: sure };
    }
    case "number": {
      const q = onlyQuantity(text, locale);
      if (!q) return null;
      const v = q.n / q.d;
      return { response: q.d === 1 ? String(q.n) : numberText(q), reading: q.d === 1 ? String(v) : numberText(q), certainty: sure };
    }
    case "fraction": {
      const q = onlyQuantity(text, locale);
      return q ? { response: numberText(q), reading: numberText(q), certainty: sure } : null;
    }
    case "text": {
      if (a.accept.some((x) => x.includes(":"))) {
        const tm = timeOf(text, locale);
        return tm ? { response: timeText(tm), reading: timeText(tm), certainty: sure } : null;
      }
      const q = onlyQuantity(text, locale);
      if (q?.mixedWhole != null) return { response: q.text, reading: q.text, certainty: sure };
      return null;
    }
    case "remainder": {
      const t = stripLeadIns(tokens(lastAnswer(text)), locale);
      const qn = cardinal(t, 0, locale);
      if (!qn) return null;
      const rest = t.slice(qn.next);
      if (!rest.length) return { response: String(qn.value), reading: String(qn.value), certainty: sure };
      if (!/^(r|remainder|rem|resto|residuo|y|and|with|con)$/.test(rest[0])) return null;
      const skip = /^(remainder|resto|residuo)$/.test(rest[1] ?? "") ? 2 : 1;
      const r = cardinal(rest, skip, locale);
      if (!r || r.next !== rest.length) return null;
      return { response: `${qn.value} R ${r.value}`, reading: `${qn.value} R ${r.value}`, certainty: sure };
    }
    case "set":
    case "pair": {
      const t = stripLeadIns(tokens(lastAnswer(text)), locale).filter((w) => !/^(x|y|equis|ye|is|es|equals|igual|a|and|y|or|o|comma|the)$/.test(w));
      const vals: string[] = [];
      for (let i = 0; i < t.length; ) {
        const q = quantity(t, i, locale);
        if (!q || q.d !== 1) return null;
        vals.push(String(q.n));
        i = q.next;
      }
      if (!vals.length) return null;
      if (a.kind === "pair") return vals.length === 2 ? { response: `(${vals[0]}, ${vals[1]})`, reading: `(${vals[0]}, ${vals[1]})`, certainty: sure } : null;
      return { response: vals.join(", "), reading: vals.join(", "), certainty: sure };
    }
    case "expr":
      return null;
  }
}
