import type { Locale } from "@/lib/types";
import type { Rng } from "../../rng";
import { tr } from "../../text";
import type { ItemBody, MathPart } from "../../types";
import { bi, misses, type Bi } from "./shared";

// s.sci.notation: scientific notation for science measurements. A value is a short mantissa (whole
// hundredths, 1.00 to 9.99) times a power of ten, so the ordinary number is built from digit strings,
// never from floating-point multiplication.
// Level 1: find the exponent of a big or small measurement, or write one out as an ordinary number.
// Level 2: change units with powers of ten (km to m, m to nm, kg to g...) and find the new exponent.

const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "−": "⁻", n: "ⁿ" };
const sup = (e: number | "n") => [...(typeof e === "number" && e < 0 ? `−${-e}` : String(e))].map((c) => SUP[c]).join("");
const minus = (e: number) => (e < 0 ? `−${-e}` : String(e));

/** The mantissa in hundredths (100–999) written without trailing zeros: 384 → "3.84", 250 → "2.5", 300 → "3". */
const mant = (m100: number) => {
  const s = String(m100);
  const frac = s.slice(1).replace(/0+$/, "");
  return frac ? `${s[0]}.${frac}` : s[0];
};
/** The ordinary number for m100/100 × 10^e as text, with US thousands commas: (150, 8) → "150,000,000", (250, −5) → "0.000025". */
export function ordinary(m100: number, e: number) {
  const digits = String(m100).replace(/0+$/, ""); // significant digits
  if (e >= digits.length - 1) return (digits + "0".repeat(e - (digits.length - 1))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (e >= 0) return `${digits.slice(0, e + 1)}.${digits.slice(e + 1)}`;
  return `0.${"0".repeat(-e - 1)}${digits}`;
}
const value = (s: string) => Number(s.replace(/,/g, ""));

type Unit = { s: Bi; w: Bi };
const u = (s: string, en: string, es: string, sEs = s): Unit => ({ s: bi(s, sEs), w: bi(en, es) });
const KM = u("km", "kilometers", "kilómetros"), M = u("m", "meters", "metros"), MM = u("mm", "millimeters", "milímetros");
const UM = u("µm", "micrometers", "micrómetros"), NM = u("nm", "nanometers", "nanómetros"), KG = u("kg", "kilograms", "kilogramos");
const G = u("g", "grams", "gramos"), MG = u("mg", "milligrams", "miligramos"), S = u("s", "seconds", "segundos"), MS = u("ms", "milliseconds", "milisegundos");
const L = u("L", "liters", "litros");

/** A measurement: `m` is the mantissa range in hundredths, `e` the exponent; `to` and `p` give a unit change (× 10^p). */
type Thing = { pre: Bi; post: Bi; u: Unit; m: [number, number]; step: number; e: number; to?: Unit; p?: number };
/** `en` and `es` are [the words before the number, the words after its unit]. */
const t = (en: [string, string], es: [string, string], unit: Unit, m: [number, number], step: number, e: number, to?: Unit, p?: number): Thing => ({
  pre: bi(en[0], es[0]), post: bi(en[1], es[1]), u: unit, m, step, e, to, p,
});
const THINGS: Thing[] = [
  t(["The Moon is about", "from Earth."], ["La Luna está a unos", "de la Tierra."], KM, [384, 384], 1, 5, M, 3),
  t(["Earth is about", "from the Sun."], ["La Tierra está a unos", "del Sol."], KM, [150, 150], 1, 8, M, 3),
  t(["Light travels about", "in one second."], ["La luz recorre unos", "en un segundo."], KM, [300, 300], 1, 5, M, 3),
  t(["A lab culture holds about", "."], ["Un cultivo de laboratorio contiene unas", "."], u("bacteria", "bacteria", "bacterias", "bacterias"), [110, 990], 10, 7),
  t(["A large city uses about", "of water a day."], ["Una ciudad grande usa unos", "de agua al día."], L, [110, 990], 10, 8),
  t(["A national forest has about", "."], ["Un bosque nacional tiene unos", "."], u("trees", "trees", "árboles", "árboles"), [110, 990], 10, 6),
  t(["A pollen grain is about", "wide."], ["Un grano de polen mide unos", "de ancho."], M, [150, 900], 10, -5, UM, 6),
  t(["A bacterium is about", "long."], ["Una bacteria mide unos", "de largo."], M, [100, 500], 10, -6, MM, 3),
  t(["A virus is about", "wide."], ["Un virus mide unos", "de ancho."], M, [200, 900], 10, -8, NM, 9),
  t(["A grain of sand is about", "across."], ["Un grano de arena mide unos", "de diámetro."], M, [100, 900], 10, -4, MM, 3),
  t(["A plant cell is about", "wide."], ["Una célula vegetal mide unos", "de ancho."], M, [100, 900], 10, -5, UM, 6),
  t(["A red blood cell is about", "across."], ["Un glóbulo rojo mide unos", "de diámetro."], M, [800, 800], 1, -6, UM, 6),
  t(["An African elephant has a mass of about", "."], ["Un elefante africano tiene una masa de unos", "."], KG, [400, 650], 10, 3, G, 3),
  t(["A grain of rice has a mass of about", "."], ["Un grano de arroz tiene una masa de unos", "."], G, [200, 300], 10, -2, MG, 3),
  t(["A marathon is about", "long."], ["Un maratón mide unos", "."], M, [420, 420], 1, 4, KM, -3),
  t(["A hummingbird's wing beats once about every", "."], ["El ala de un colibrí aletea, más o menos, una vez cada", "."], S, [150, 250], 10, -2, MS, 3),
  t(["Sunlight takes about", "to reach Earth."], ["La luz del Sol tarda unos", "en llegar a la Tierra."], S, [500, 500], 1, 2, MS, 3),
  t(["A sheet of paper is about", "thick."], ["Una hoja de papel mide unos", "de grosor."], M, [100, 100], 1, -4, MM, 3),
];
export const NOTATION_THINGS = THINGS;

/** "10 to the power of minus 6" / "10 elevado a la menos 6". */
const sayPow = (e: number | "n", locale: Locale) =>
  tr(locale, `10 to the power of ${e === "n" ? "n" : e < 0 ? `minus ${-e}` : e}`, `10 elevado a la ${e === "n" ? "n" : e < 0 ? `menos ${-e}` : e}`);

export function notationItem(r: Rng, level: number, locale: Locale): ItemBody {
  const pool = level === 1 ? THINGS.filter((x) => x.e >= 3 || x.e <= -2) : THINGS.filter((x) => x.to);
  const x = r.pick(pool);
  const m100 = r.int(x.m[0] / x.step, x.m[1] / x.step) * x.step;
  const ms = mant(m100), e = x.e;
  const U = x.u.s[locale], W = x.u.w[locale];
  const pre = x.pre[locale], post = x.post[locale];
  const tail = post === "." ? "." : ` ${post}`;
  const ask = tr(locale, "What is n?", "¿Cuánto vale n?");
  const powerText = `${ms} × 10${sup(e)}`;
  // Writing a number out is kept to exponents from −5 to 7, so it stays a sensible number of digits.
  if (level === 1 && (r.bool(0.6) || e < -5 || e > 7)) {
    // Find n.
    const plain = ordinary(m100, e);
    const prompt: MathPart[] = [`${pre} ${plain} ${U}${tail} ${tr(locale, "In scientific notation, that is", "En notación científica, eso es")} ${ms} × `, { sup: ["10", "n"] }, ` ${U}. ${ask}`];
    const say = `${pre} ${plain} ${W}${tail} ${tr(locale, "In scientific notation, that is", "En notación científica, eso es")} ${ms} ${tr(locale, "times", "por")} ${sayPow("n", locale)} ${W}. ${ask}`;
    const zeros = (plain.replace(/[,.]/g, "").match(/0/g) ?? []).length;
    const digits = plain.replace(/[,.]/g, "").replace(/^0+/, "").length;
    const big = e > 0;
    return {
      prompt,
      say,
      input: "keypad",
      keys: ["-"],
      answer: { kind: "number", value: e },
      wrong: misses(e, [
        [big ? digits : NaN, "counted-all-digits"],
        [big ? zeros : -(zeros - 1), "counted-zeros-only"],
        [-e, "flipped-sign"],
        [e + (big ? 1 : -1), "off-by-one-power"],
      ]),
      hints: [
        tr(locale, `Where does the decimal point go so that ${ms} has one digit before it?`, `¿Dónde va el punto decimal para que ${ms} tenga una cifra antes del punto?`),
        tr(
          locale,
          "Count how many places the decimal point moves to turn the number into the mantissa. A big number gives a positive n; a number smaller than 1 gives a negative n.",
          "Cuenta cuántos lugares se mueve el punto decimal para convertir el número en la mantisa. Un número grande da una n positiva; un número menor que 1 da una n negativa.",
        ),
        big
          ? tr(locale, `In ${plain}, the decimal point sits after the last digit. Move it left until it sits right after the first digit.`, `En ${plain}, el punto decimal está después de la última cifra. Muévelo a la izquierda hasta que quede justo después de la primera cifra.`)
          : tr(locale, `In ${plain}, move the decimal point right until it sits just after the first digit that is not zero.`, `En ${plain}, mueve el punto decimal a la derecha hasta que quede justo después de la primera cifra que no es cero.`),
      ],
      steps: [
        big
          ? tr(locale, `The decimal point moves ${e} places to the left: ${plain} = ${ms} × 10${sup(e)}.`, `El punto decimal se mueve ${e} lugares a la izquierda: ${plain} = ${ms} × 10${sup(e)}.`)
          : tr(locale, `The decimal point moves ${-e} places to the right: ${plain} = ${ms} × 10${sup(e)}.`, `El punto decimal se mueve ${-e} lugares a la derecha: ${plain} = ${ms} × 10${sup(e)}.`),
        `n = ${minus(e)}`,
      ],
      seconds: 30,
    };
  }
  if (level === 1) {
    // Write it out.
    const plain = ordinary(m100, e);
    const want = value(plain);
    const digits = String(m100).replace(/0+$/, "");
    const prompt: MathPart[] = [`${pre} ${ms} × `, { sup: ["10", minus(e)] }, ` ${U}${tail} ${tr(locale, "Write this number as an ordinary number.", "Escribe este número de la forma usual.")}`];
    const say = `${pre} ${ms} ${tr(locale, "times", "por")} ${sayPow(e, locale)} ${W}${tail} ${tr(locale, "Write this number as an ordinary number.", "Escribe este número de la forma usual.")}`;
    const shift = (k: number) => value(ordinary(m100, e + k));
    return {
      prompt,
      say,
      input: "keypad",
      keys: ["."],
      answer: { kind: "number", value: want },
      wrong: misses(want, [
        [e > 0 ? value(digits + "0".repeat(e)) : value(`0.${"0".repeat(-e)}${digits}`), "added-n-zeros"],
        [shift(1), "off-by-one-power"],
        [shift(-1), "off-by-one-power"],
      ]),
      hints: [
        tr(locale, e > 0 ? `Multiplying by 10${sup(e)} moves the decimal point ${e} places. Which way?` : `Multiplying by 10${sup(e)} moves the decimal point ${-e} places. Which way?`, e > 0 ? `Multiplicar por 10${sup(e)} mueve el punto decimal ${e} lugares. ¿Hacia dónde?` : `Multiplicar por 10${sup(e)} mueve el punto decimal ${-e} lugares. ¿Hacia dónde?`),
        tr(locale, "A positive power of ten moves the point right; a negative power moves it left. Fill empty places with zeros.", "Una potencia de diez positiva mueve el punto a la derecha; una negativa lo mueve a la izquierda. Llena los lugares vacíos con ceros."),
        e > 0
          ? tr(locale, `Start with ${ms} and move the point ${e} places to the right.`, `Empieza con ${ms} y mueve el punto ${e} lugares a la derecha.`)
          : tr(locale, `Start with ${ms} and move the point ${-e} places to the left.`, `Empieza con ${ms} y mueve el punto ${-e} lugares a la izquierda.`),
      ],
      steps: [`${powerText} = ${plain}`],
      seconds: 30,
    };
  }
  // Level 2: a unit change multiplies by 10^p, so the exponent goes up by p.
  const to = x.to!, p = x.p!, n = e + p;
  const T = to.s[locale], TW = to.w[locale];
  const prompt: MathPart[] = [`${pre} ${ms} × `, { sup: ["10", minus(e)] }, ` ${U}${tail} ${tr(locale, `In ${to.w.en}, that is`, `En ${to.w.es}, eso es`)} ${ms} × `, { sup: ["10", "n"] }, ` ${T}. ${ask}`];
  const say = `${pre} ${ms} ${tr(locale, "times", "por")} ${sayPow(e, locale)} ${W}${tail} ${tr(locale, `In ${to.w.en}, that is`, `En ${to.w.es}, eso es`)} ${ms} ${tr(locale, "times", "por")} ${sayPow("n", locale)} ${TW}. ${ask}`;
  const factor = p > 0 ? tr(locale, `1 ${U} = 10${sup(p)} ${T}`, `1 ${U} = 10${sup(p)} ${T}`) : tr(locale, `1 ${T} = 10${sup(-p)} ${U}`, `1 ${T} = 10${sup(-p)} ${U}`);
  return {
    prompt,
    say,
    input: "keypad",
    keys: ["-"],
    answer: { kind: "number", value: n },
    wrong: misses(n, [
      [e - p, "shifted-wrong-way"],
      [e, "forgot-to-convert"],
      [n + 1, "off-by-one-power"],
      [n - 1, "off-by-one-power"],
    ]),
    hints: [
      tr(locale, `Is a ${to.w.en.slice(0, -1)} bigger or smaller than a ${x.u.w.en.slice(0, -1)}? Will the number of units grow or shrink?`, `¿Un ${to.w.es.slice(0, -1)} es más grande o más pequeño que un ${x.u.w.es.slice(0, -1)}? ¿La cantidad de unidades crece o disminuye?`),
      tr(locale, "Multiplying by 10 to a power adds that power to the exponent: 10ᵃ × 10ᵇ = 10ᵃ⁺ᵇ.", "Multiplicar por 10 a una potencia suma esa potencia al exponente: 10ᵃ × 10ᵇ = 10ᵃ⁺ᵇ."),
      factor,
    ],
    steps: [
      factor,
      p > 0
        ? `${ms} × 10${sup(e)} ${U} = ${ms} × 10${sup(e)} × 10${sup(p)} ${T}`
        : `${ms} × 10${sup(e)} ${U} = ${ms} × 10${sup(e)} ÷ 10${sup(-p)} ${T}`,
      `${minus(e)} ${p > 0 ? "+" : "−"} ${Math.abs(p)} = ${minus(n)}, n = ${minus(n)}`,
    ],
    seconds: 45,
  };
}
