import type { Locale } from "@/lib/types";

// Numbers the way a teacher says them, in English and Spanish, so no digit or symbol is ever left
// for a voice to guess at (ElevenLabs Flash does not normalize numbers, and browser voices each do it
// their own way). Pure: speakable() calls sayNumbers() on each written word after its math signs are
// words, and echo matching folds what the recognizer wrote through the same speller.
//
// Rules (live tutor spec §2.8): cardinals to 999,999,999 (English without "and"); Spanish "un/una"
// before a noun; negatives; thousands and decimal separators by language; fractions as ordinals up
// to twentieths (and hundredths, thousandths), "over" otherwise; mixed numbers; times; money;
// percent; ordinals; roots and powers; units; phone numbers digit by digit.

export type Gender = "m" | "f";
/** How a Spanish number ending in one is said: alone ("veintiuno"), before a masculine noun ("veintiún"), before a feminine one ("veintiuna"). English ignores it. */
export type NumForm = "alone" | Gender;

export const MAX_CARDINAL = 999_999_999;

const EN_ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function enCardinal(n: number): string {
  if (n < 20) return EN_ONES[n];
  if (n < 100) return EN_TENS[Math.floor(n / 10)] + (n % 10 ? `-${EN_ONES[n % 10]}` : "");
  if (n < 1000) return `${EN_ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${enCardinal(n % 100)}` : ""}`;
  if (n < 1e6) return `${enCardinal(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${enCardinal(n % 1000)}` : ""}`;
  return `${enCardinal(Math.floor(n / 1e6))} million${n % 1e6 ? ` ${enCardinal(n % 1e6)}` : ""}`;
}

const ES_UNITS = (
  "cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciséis diecisiete dieciocho diecinueve " +
  "veinte veintiuno veintidós veintitrés veinticuatro veinticinco veintiséis veintisiete veintiocho veintinueve"
).split(" ");
const ES_TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const ES_HUNDREDS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

function esUnder100(n: number, form: NumForm): string {
  const s = n < 30 ? ES_UNITS[n] : ES_TENS[Math.floor(n / 10)] + (n % 10 ? ` y ${ES_UNITS[n % 10]}` : "");
  if (n % 10 !== 1 || n === 11 || form === "alone") return s;
  return s.replace(/uno$/, form === "f" ? "una" : n === 21 ? "ún" : "un");
}

function esUnder1000(n: number, form: NumForm): string {
  if (n < 100) return esUnder100(n, form);
  if (n === 100) return "cien";
  const hundreds = form === "f" && n >= 200 ? ES_HUNDREDS[Math.floor(n / 100)].replace(/os$/, "as") : ES_HUNDREDS[Math.floor(n / 100)];
  return n % 100 ? `${hundreds} ${esUnder100(n % 100, form)}` : hundreds;
}

function esCardinal(n: number, form: NumForm): string {
  if (n < 1000) return esUnder1000(n, form);
  if (n < 1e6) {
    const k = Math.floor(n / 1000);
    const head = k === 1 ? "mil" : `${esUnder1000(k, form === "f" ? "f" : "m")} mil`;
    return n % 1000 ? `${head} ${esUnder1000(n % 1000, form)}` : head;
  }
  const m = Math.floor(n / 1e6);
  const head = m === 1 ? "un millón" : `${esCardinal(m, "m")} millones`;
  return n % 1e6 ? `${head} ${esCardinal(n % 1e6, form)}` : head;
}

const DIGIT = { en: EN_ONES.slice(0, 10), es: ES_UNITS.slice(0, 10) } as const;

/** Digits one by one: "988" → "nine eight eight". */
export const digitWords = (digits: string, locale: Locale) =>
  [...digits]
    .filter((c) => /\d/.test(c))
    .map((c) => DIGIT[locale][Number(c)])
    .join(" ");

/** A whole number in words. Negative numbers say "negative"/"menos"; past 999,999,999 the digits are read one by one. */
export function cardinal(n: number, locale: Locale, form: NumForm = "alone"): string {
  if (!Number.isFinite(n)) return "";
  if (n < 0) return `${locale === "es" ? "menos" : "negative"} ${cardinal(-n, locale, form)}`;
  const whole = Math.floor(n);
  if (whole > MAX_CARDINAL) return digitWords(String(whole), locale);
  return locale === "es" ? esCardinal(whole, form) : enCardinal(whole);
}

const EN_ORD: Record<string, string> = { one: "first", two: "second", three: "third", five: "fifth", eight: "eighth", nine: "ninth", twelve: "twelfth" };
const ES_ORD = [
  "", "primero", "segundo", "tercero", "cuarto", "quinto", "sexto", "séptimo", "octavo", "noveno", "décimo", "undécimo", "duodécimo",
  "decimotercero", "decimocuarto", "decimoquinto", "decimosexto", "decimoséptimo", "decimoctavo", "decimonoveno", "vigésimo",
];

/**
 * An ordinal in words: "first", "twenty-first"; Spanish "primero / primera / primer" to 20, then the
 * cardinal (as Spanish speakers say "el piso veintiuno"). `apocope`: before a masculine noun ("primer", "tercer").
 */
export function ordinal(n: number, locale: Locale, gender: Gender = "m", apocope = false): string {
  if (locale === "es") {
    if (n < 1 || n > 20) return cardinal(n, "es", gender === "f" ? "f" : "alone");
    const w = ES_ORD[n];
    if (gender === "f") return w.replace(/o$/, "a");
    return apocope ? w.replace(/(primer|tercer)o$/, "$1") : w;
  }
  const c = cardinal(n, "en");
  const m = /^(.*?)([a-z]+)$/.exec(c)!;
  const last = m[2];
  return m[1] + (EN_ORD[last] ?? (last.endsWith("y") ? `${last.slice(0, -1)}ieth` : `${last}th`));
}

const ES_DENOM: Record<number, string> = { 2: "medio", 3: "tercio", 4: "cuarto", 5: "quinto", 6: "sexto", 7: "séptimo", 8: "octavo", 9: "noveno", 10: "décimo", 100: "centésimo", 1000: "milésimo" };

/** Denominators said as a fraction word (fourths, sixteenths, hundredths); others are "five over twenty-three". */
export const namedDenominator = (d: number) => (d >= 2 && d <= 20) || d === 100 || d === 1000;

function denominator(d: number, plural: boolean, locale: Locale): string {
  if (locale === "es") {
    const w = ES_DENOM[d] ?? `${ES_UNITS[d].normalize("NFD").replace(/\p{M}/gu, "")}avo`;
    return plural ? `${w}s` : w;
  }
  if (d === 2) return plural ? "halves" : "half";
  const w = ordinal(d, "en").replace(/^one /, ""); // "hundredths", not "one hundredths"
  return plural ? `${w}s` : w;
}

/**
 * A fraction in words: "one fourth", "five sixteenths", "five over twenty-three"; Spanish "un cuarto",
 * "cinco dieciseisavos", "cinco sobre veintitrés". `mixed`: after a whole number ("two and a half",
 * "dos y medio"). Null for a zero denominator.
 */
export function fractionWords(n: number, d: number, locale: Locale, { mixed = false } = {}): string | null {
  if (!Number.isInteger(n) || !Number.isInteger(d) || d <= 0 || n < 0) return null;
  if (d === 1 || !namedDenominator(d)) return `${cardinal(n, locale, "m")} ${locale === "es" ? "sobre" : "over"} ${cardinal(d, locale)}`;
  const plural = n !== 1;
  if (locale === "es") {
    if (mixed && n === 1 && d === 2) return "medio";
    return `${n === 1 ? "un" : cardinal(n, "es", "m")} ${denominator(d, plural, "es")}`;
  }
  if (mixed && n === 1 && d === 2) return "a half";
  return `${cardinal(n, "en")} ${denominator(d, plural, "en")}`;
}

// ---- written numbers ("1,250", "3.75", "1.250", "3,5")

const NUM = {
  en: String.raw`\d{1,3}(?:,\d{3})+(?!\d)(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+`,
  es: String.raw`\d{1,3}(?:\.\d{3})+(?!\d)(?:,\d+)?|\d{1,3}(?:,\d{3})+(?!\d)(?:\.\d+)?|\d+(?:[.,]\d+)?|[.,]\d+`,
};

/** The value of a written number, by the language's separators (Spanish: a "." or "," before exactly three digits groups thousands). */
export function readLiteral(lit: string, locale: Locale): { int: string; frac: string; sep: "." | "," | null } | null {
  if (!new RegExp(`^(?:${NUM[locale]})$`).test(lit)) return null;
  if (locale === "en") {
    const [int, frac = ""] = lit.replace(/,/g, "").split(".");
    return { int, frac, sep: frac || lit.includes(".") ? "." : null };
  }
  if (/^\d{1,3}(?:([.,])\d{3})(?:\1\d{3})*$/.test(lit)) return { int: lit.replace(/[.,]/g, ""), frac: "", sep: null };
  if (/^\d{1,3}(?:\.\d{3})+,\d+$/.test(lit)) {
    const [int, frac] = lit.split(",");
    return { int: int.replace(/\./g, ""), frac, sep: "," };
  }
  if (/^\d{1,3}(?:,\d{3})+\.\d+$/.test(lit)) {
    const [int, frac] = lit.split(".");
    return { int: int.replace(/,/g, ""), frac, sep: "." };
  }
  const m = /^(\d*)([.,])?(\d*)$/.exec(lit)!;
  return { int: m[1], frac: m[3], sep: (m[2] as "." | "," | undefined) ?? null };
}

/** A written number in words; null if `lit` isn't one. */
export function numberWords(lit: string, locale: Locale, form: NumForm = "alone"): string | null {
  const r = readLiteral(lit, locale);
  if (!r) return null;
  const int = r.int ? cardinal(Number(r.int), locale, r.frac ? "alone" : form) : "";
  if (!r.frac) return int || null;
  if (locale === "es") {
    const point = r.sep === "," ? "coma" : "punto";
    const frac = r.frac.length <= 2 && r.frac[0] !== "0" ? cardinal(Number(r.frac), "es") : digitWords(r.frac, "es");
    return [int, point, frac].filter(Boolean).join(" ");
  }
  return [int, "point", digitWords(r.frac, "en")].filter(Boolean).join(" ");
}

const valueOf = (lit: string, locale: Locale) => {
  const r = readLiteral(lit, locale);
  return r ? Number(`${r.int || "0"}.${r.frac || "0"}`) : NaN;
};

// ---- Spanish gender before a noun

const NOT_NOUNS = new Set(
  "y o u e es son de del a al en con que más menos por entre sobre para no sí si se lo la las los el un una le les mi tu su ni ya hay está están era fue va van".split(" "),
);
const MASC_A = new Set("día días mapa mapas problema problemas planeta planetas programa programas idioma idiomas tema temas sistema sistemas sofá sofás clima poema poemas".split(" "));
const FEM_O = new Set("mano manos foto fotos radio moto motos".split(" "));

/** The form of a Spanish number before `next` (the word after it): "f" before a feminine noun, "m" before another noun, "alone" otherwise. */
export function formBefore(next: string | undefined, locale: Locale): NumForm {
  if (locale !== "es" || !next) return "alone";
  const w = next.toLowerCase().replace(/[^\p{L}]+$/u, "");
  if (!/^\p{L}{2,}$/u.test(w) || NOT_NOUNS.has(w)) return "alone";
  if (FEM_O.has(w)) return "f";
  if (MASC_A.has(w)) return "m";
  return /(a|as|ión|iones|dad|dades)$/.test(w) ? "f" : "m";
}

// ---- units

type Unit = { en: [string, string]; es: [string, string]; esGender?: Gender };
const UNITS: Record<string, Unit> = {
  mm: { en: ["millimeter", "millimeters"], es: ["milímetro", "milímetros"] },
  cm: { en: ["centimeter", "centimeters"], es: ["centímetro", "centímetros"] },
  m: { en: ["meter", "meters"], es: ["metro", "metros"] },
  km: { en: ["kilometer", "kilometers"], es: ["kilómetro", "kilómetros"] },
  mg: { en: ["milligram", "milligrams"], es: ["miligramo", "miligramos"] },
  g: { en: ["gram", "grams"], es: ["gramo", "gramos"] },
  kg: { en: ["kilogram", "kilograms"], es: ["kilogramo", "kilogramos"] },
  ml: { en: ["milliliter", "milliliters"], es: ["mililitro", "mililitros"] },
  l: { en: ["liter", "liters"], es: ["litro", "litros"] },
  in: { en: ["inch", "inches"], es: ["pulgada", "pulgadas"], esGender: "f" },
  ft: { en: ["foot", "feet"], es: ["pie", "pies"] },
  yd: { en: ["yard", "yards"], es: ["yarda", "yardas"], esGender: "f" },
  mi: { en: ["mile", "miles"], es: ["milla", "millas"], esGender: "f" },
  lb: { en: ["pound", "pounds"], es: ["libra", "libras"], esGender: "f" },
  lbs: { en: ["pound", "pounds"], es: ["libra", "libras"], esGender: "f" },
  oz: { en: ["ounce", "ounces"], es: ["onza", "onzas"], esGender: "f" },
};
const UNIT_KEY = (abbr: string) => (abbr === "L" || abbr === "mL" || abbr === "ml" ? abbr.toLowerCase() : abbr);

/** "cm" → "centimeters" (or "centimeter" when `one`); "cm²" → "square centimeters". Null for anything that isn't a unit. */
export function unitWords(abbr: string, locale: Locale, one: boolean): { words: string; gender: Gender } | null {
  const m = /^(mm|cm|m|km|mg|g|kg|mL|ml|L|in|ft|yd|mi|lbs?|oz)(²|³|\^2|\^3)?$/.exec(abbr);
  if (!m) return null;
  const u = UNITS[UNIT_KEY(m[1])];
  if (!u) return null;
  const word = u[locale][one ? 0 : 1];
  const power = m[2] === "²" || m[2] === "^2" ? 2 : m[2] ? 3 : 0;
  const gender = u.esGender ?? "m";
  if (!power) return { words: word, gender };
  if (locale === "es") {
    const adj = power === 2 ? "cuadrado" : "cúbico";
    return { words: `${word} ${gender === "f" ? adj.replace(/o$/, "a") : adj}${one ? "" : "s"}`, gender };
  }
  return { words: `${power === 2 ? "square" : "cubic"} ${word}`, gender };
}

// ---- dates (a guard decides; this only says them)

const MONTHS = {
  en: "January February March April May June July August September October November December".split(" "),
  es: "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split(" "),
};

/** A written date "10/12" as words: English month first ("October twelfth"), Spanish day first ("diez de diciembre"). Null if it isn't a date. */
export function dateWords(a: number, b: number, locale: Locale): string | null {
  const [month, day] = locale === "es" ? [b, a] : [a, b];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (locale === "es") return `${day === 1 ? "primero" : cardinal(day, "es")} de ${MONTHS.es[month - 1]}`;
  return `${MONTHS.en[month - 1]} ${ordinal(day, "en")}`;
}

// ---- times

/** "3:30" → "three thirty" / "tres y media"; null when it isn't a clock time. `bare`: am/pm follows (no "o'clock"). */
export function timeWords(h: number, min: number, locale: Locale, bare = false): string | null {
  if (h > 24 || min > 59) return null;
  if (locale === "es") {
    const hour = cardinal(h === 0 ? 12 : h, "es", "f");
    if (min === 0) return bare ? hour : `${hour} en punto`;
    if (min === 15) return `${hour} y cuarto`;
    if (min === 30) return `${hour} y media`;
    return `${hour} y ${cardinal(min, "es")}`;
  }
  const hour = cardinal(h === 0 ? 12 : h, "en");
  if (min === 0) return bare ? hour : `${hour} o'clock`;
  return `${hour} ${min < 10 ? `oh ${EN_ONES[min]}` : cardinal(min, "en")}`;
}

// ---- money

/** "$2.50" → "two dollars and fifty cents"; "$0.75" → "seventy-five cents". */
export function moneyWords(dollars: number, cents: number, locale: Locale): string {
  const es = locale === "es";
  const d = dollars ? `${cardinal(dollars, locale, "m")} ${dollars === 1 ? (es ? "dólar" : "dollar") : es ? "dólares" : "dollars"}` : "";
  const c = cents ? `${cardinal(cents, locale, "m")} ${cents === 1 ? (es ? "centavo" : "cent") : es ? "centavos" : "cents"}` : "";
  if (d && c) return `${d} ${es ? "con" : "and"} ${c}`;
  return d || c || `${cardinal(0, locale)} ${es ? "dólares" : "dollars"}`;
}

// ---- the speller for one written word

export type NumberContext = {
  /** The written word before and after this one (for "2 1/2", "1 manzana", "5 cm"). */
  prev?: string;
  next?: string;
  /** This word is the fraction of a mixed number ("1/2" in "2 1/2"). */
  mixed?: boolean;
  /** This word is the whole part of a mixed number ("2" in "2 1/2"). */
  wholeOfMixed?: boolean;
  /** The sentence gives a phone number or a hotline ("call or text 988"): digits one by one. */
  phone?: boolean;
  /** A small fraction here is a date ("due 10/12"). */
  date?: boolean;
};

const SUPER: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-" };
const ES_LETTER: Record<string, string> = { x: "equis", y: "ye", z: "zeta", n: "ene", m: "eme" };

/** A letter standing for a number ("x", "n"), the way the language says it. */
export const letterWord = (l: string, locale: Locale) => (locale === "es" ? (ES_LETTER[l.toLowerCase()] ?? l) : l);

const W = {
  en: { neg: "negative", pct: "percent", deg: ["degree", "degrees"], F: "Fahrenheit", C: "Celsius", root: "the square root of", cube: "the cube root of", sq: "squared", cu: "cubed", pow: "to the power of", to: "to", and: "and", pi: "pi", pm: "plus or minus" },
  es: { neg: "menos", pct: "por ciento", deg: ["grado", "grados"], F: "Fahrenheit", C: "Celsius", root: "la raíz cuadrada de", cube: "la raíz cúbica de", sq: "al cuadrado", cu: "al cubo", pow: "elevado a", to: "a", and: "y", pi: "pi", pm: "más o menos" },
} as const;

/**
 * Every number in one written word (after its math signs became words: "3 times 4") said in words,
 * so nothing is left as digits or %, $, √. Returns the spoken form; may contain spaces.
 */
export function sayNumbers(word: string, locale: Locale, ctx: NumberContext = {}): string {
  const w = W[locale];
  let s = word.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => (m === "²" || m === "³" ? m : `^${[...m].map((c) => SUPER[c]).join("")}`));
  if (!/[\d%$√∛π±¢^²³°]/.test(s)) return s;
  const lit = NUM[locale];
  const say = (x: string, form: NumForm = "alone") => numberWords(x, locale, form) ?? digitWords(x, locale);

  // Phone numbers and hotlines: digit by digit, groups apart.
  if (ctx.phone || /^\(?\d{3}\)?[-.]\d{3}-\d{4}\b|^1-\d{3}-\d{3}-\d{4}\b/.test(s))
    s = s.replace(/\d+(?:-\d+)+|\d{3,}/g, (m) => m.split("-").map((g) => digitWords(g, locale)).join(", "));

  // Money: $2.50, $1,250, 75¢
  s = s.replace(new RegExp(String.raw`\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?(?!\d)`, "g"), (_, d: string, c?: string) =>
    moneyWords(Number(d.replace(/,/g, "")), c ? Number(c.padEnd(2, "0")) : 0, locale),
  );
  s = s.replace(/(\d+)¢/g, (_, c: string) => moneyWords(0, Number(c), locale));

  // Clock times and ratios: 3:30, 3:4
  const bare = /^(a\.?m\.?|p\.?m\.?)$/i.test(ctx.next ?? "");
  s = s.replace(/(?<![\d.,:])(\d{1,2}):(\d{2})(?![\d:])/g, (m, h: string, min: string) => timeWords(Number(h), Number(min), locale, bare) ?? m);
  s = s.replace(/(?<![\d.,:])(\d+):(\d+)(?![\d:])/g, (_, a: string, b: string) => `${cardinal(Number(a), locale)} ${w.to} ${cardinal(Number(b), locale)}`);

  // Percent
  s = s.replace(new RegExp(String.raw`(?<![\d.,])([−-]?)(${lit})\s?%`, "g"), (_, sign: string, x: string) => `${sign ? `${w.neg} ` : ""}${say(x)} ${w.pct}`);
  if (s === "%") return w.pct;

  // Ordinals: 2nd, 21st; 1.º, 1.ª, 1er, 2do, 3ra
  if (locale === "en") s = s.replace(/(?<![\d.,])(\d+)(st|nd|rd|th)\b/gi, (_, n: string) => ordinal(Number(n), "en"));
  else
    s = s.replace(/(?<![\d.,])(\d+)\.?(º|ª|er|ro|ra|do|da|to|ta|mo|ma|vo|va|no|na)(?![\p{L}])/gu, (_, n: string, suf: string) =>
      ordinal(Number(n), "es", /[ªa]$/.test(suf) ? "f" : "m", suf === "er" || (suf === "º" && formBefore(ctx.next, "es") === "m")),
    );

  // Degrees: 90°, 72°F, -5 °C
  s = s.replace(new RegExp(String.raw`(?<![\d.,])([−-]?)(${lit})\s?°\s?([FC])?(?![\p{L}])`, "gu"), (_, sign: string, x: string, scale?: string) => {
    const one = valueOf(x, locale) === 1 && !sign;
    return [sign ? w.neg : "", say(x), w.deg[one ? 0 : 1], scale ? w[scale as "F" | "C"] : ""].filter(Boolean).join(" ");
  });
  s = s.replace(/^°([FC])$/, (_, scale: "F" | "C") => `${w.deg[1]} ${w[scale]}`);

  // Units written onto the number: 5cm, 2.5kg, 12cm²
  s = s.replace(new RegExp(String.raw`(?<![\d.,])(${lit})(mm|cm|km|mg|kg|mL|ml|ft|in|yd|mi|lbs?|oz)(²|³|\^2|\^3)?(?![\p{L}\d])`, "gu"), (_, x: string, u: string, p = "") => {
    const one = valueOf(x, locale) === 1;
    const unit = unitWords(u + p, locale, one)!;
    return `${say(x, one ? unit.gender : "alone")} ${unit.words}`;
  });

  // Roots, pi, plus-or-minus
  s = s.replace(/√\s?\(/g, `${w.root} (`).replace(/∛\s?\(/g, `${w.cube} (`);
  s = s.replace(new RegExp(String.raw`([√∛])\s?(${lit}|[a-zA-Z])`, "g"), (_, r: string, x: string) => `${r === "√" ? w.root : w.cube} ${/\d/.test(x) ? say(x) : letterWord(x, locale)}`);
  s = s.replace(/π/g, ` ${w.pi} `).replace(/±/g, ` ${w.pm} `);

  // Powers: x^2, 10^-3, 2^n, 5²
  s = s.replace(/(^|[^\p{L}])([a-zA-Z])(?=\^|[²³])/gu, (_, a: string, l: string) => `${a}${letterWord(l, locale)} `);
  s = s.replace(/\^\(?([−-]?\d+|[a-zA-Z])\)?|([²³])/g, (_, p?: string, sup?: string) => {
    const e = sup ? (sup === "²" ? "2" : "3") : p!;
    if (e === "2") return ` ${w.sq}`;
    if (e === "3") return ` ${w.cu}`;
    return ` ${w.pow} ${/\d/.test(e) ? cardinal(Number(e.replace("−", "-")), locale) : letterWord(e, locale)}`;
  });

  // Dates and fractions: 10/12 (a date by the guard), 3/4, -2/3, 5/23
  s = s.replace(/(?<![\d.,/])([−-]?)(\d{1,6})\/(\d{1,6})(?![\d/])/g, (m, sign: string, a: string, b: string) => {
    const [n, d] = [Number(a), Number(b)];
    if (ctx.date && !sign) {
      const date = dateWords(n, d, locale);
      if (date) return date;
    }
    const f = fractionWords(n, d, locale, { mixed: !!ctx.mixed && !sign });
    return f ? `${sign ? `${w.neg} ` : ""}${f}` : m;
  });

  // A number next to a letter that stands for one: 3x → three x, 2n → dos ene
  s = s.replace(new RegExp(String.raw`(${lit})([a-zA-Z])(?![\p{L}])`, "gu"), (_, x: string, l: string) => `${x} ${letterWord(l, locale)}`);

  // Negative numbers: a sign before a digit at the start, or after a space or "("
  s = s.replace(new RegExp(String.raw`(^|[\s(])[−-](?=(?:${lit}))`, "g"), `$1${w.neg} `);

  // Ranges: 3–5, 3-5 (a hyphen that is not minus: math signs are already words)
  s = s.replace(new RegExp(String.raw`(${lit})[–-](?=${lit})`, "g"), `$1 ${w.to} `);

  // What's left: plain numbers. Only the last one in the word takes the noun's gender ("1 manzana").
  const matches = [...s.matchAll(new RegExp(lit, "g"))];
  if (matches.length) {
    let out = "";
    let at = 0;
    matches.forEach((m, k) => {
      const last = k === matches.length - 1 && m.index + m[0].length === s.replace(/[^\p{L}\p{N}]+$/u, "").length;
      const form = last ? (ctx.wholeOfMixed ? "alone" : formBefore(ctx.next, locale)) : "alone";
      out += s.slice(at, m.index) + say(m[0], form);
      at = m.index + m[0].length;
    });
    s = out + s.slice(at);
  }
  if (ctx.wholeOfMixed) s = `${s.replace(/[^\p{L}\p{N}]+$/u, "")} ${w.and}`;
  // Leftover digits (a code like "4a5"): one by one.
  s = s.replace(/\d+/g, (d) => ` ${digitWords(d, locale)} `);
  return s
    .replace(/([,;])(?=\p{L})/gu, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Characters that must never reach a voice: digits and the symbols numbers come with. */
export const UNSPOKEN = /[0-9%$√→|]/;

/** In development, says so when text bound for a voice still has a digit or symbol in it. */
export function assertSpoken(text: string, where: string) {
  if (process.env.NODE_ENV === "production" || !UNSPOKEN.test(text)) return;
  console.warn(`voice: unspoken characters reached ${where}: ${JSON.stringify(text)}`);
}
