import type { Locale } from "@/lib/types";
import type { Rng } from "../../rng";
import { tr } from "../../text";
import type { ItemBody } from "../../types";
import { bi, cap, dec, misses, NAMES, r2, type Bi } from "./shared";

// Computed physics: kinetic and potential energy (s.energy.ke.pe), wave speed (s.wave.speed), Ohm's law
// and series circuits (s.ohms.law), momentum and its conservation (s.momentum). Quantities are whole
// numbers of tenths or hundredths chosen so the answer comes out exact, then written with dec().

type Q = { n: number; k: number }; // n × 10^-k
const show = (q: Q) => dec(q.n, q.k);
const val = (q: Q) => q.n / 10 ** q.k;
/** A unit: symbol on screen, and words read aloud [one, many]. */
type Unit = { s: Bi; w: [Bi, Bi] };
const unit = (s: string, en: [string, string], es: [string, string], sEs = s): Unit => ({ s: bi(s, sEs), w: [bi(en[0], es[0]), bi(en[1], es[1])] });
const KG = unit("kg", ["kilogram", "kilograms"], ["kilogramo", "kilogramos"]);
const MPS = unit("m/s", ["meter per second", "meters per second"], ["metro por segundo", "metros por segundo"]);
const M = unit("m", ["meter", "meters"], ["metro", "metros"]);
const J = unit("J", ["joule", "joules"], ["joule", "joules"]);
const HZ = unit("Hz", ["hertz", "hertz"], ["hertz", "hertz"]);
const V = unit("V", ["volt", "volts"], ["voltio", "voltios"]);
const A = unit("A", ["amp", "amps"], ["amperio", "amperios"]);
const OHM = unit("Ω", ["ohm", "ohms"], ["ohmio", "ohmios"]);
const KGMS = unit("kg·m/s", ["kilogram meter per second", "kilogram meters per second"], ["kilogramo metro por segundo", "kilogramos metro por segundo"]);
/** "2.5 m/s" on screen, "2.5 meters per second" aloud ("1 meter", not "1 meters"). */
const qt = (q: Q, u: Unit, locale: Locale, spoken: boolean) => `${show(q)} ${(spoken ? u.w[val(q) === 1 ? 0 : 1] : u.s)[locale]}`;
/** Build the screen and spoken versions of a sentence together. */
const both = (f: (spoken: boolean) => string) => ({ prompt: [f(false)], say: f(true) });
const q1 = (n: number): Q => ({ n, k: 1 });
const q0 = (n: number): Q => ({ n, k: 0 });

// ── s.energy.ke.pe ──────────────────────────────────────────────────────────────────────────────

/** Moving things: mass in tenths of a kilogram (range and step) and speed in whole m/s. */
type Mover = { what: Bi; m10: [number, number]; step: number; v: [number, number] };
const MOVERS: Mover[] = [
  { what: bi("a soccer ball", "un balón de fútbol"), m10: [4, 4], step: 1, v: [5, 25] },
  { what: bi("a bowling ball", "una bola de boliche"), m10: [50, 70], step: 10, v: [2, 8] },
  { what: bi("a cyclist and her bike", "una ciclista con su bicicleta"), m10: [600, 900], step: 50, v: [3, 12] },
  { what: bi("a skateboarder", "un patinador"), m10: [400, 600], step: 50, v: [2, 8] },
  { what: bi("a running dog", "un perro que corre"), m10: [150, 350], step: 50, v: [3, 10] },
  { what: bi("a shopping cart", "un carrito de supermercado"), m10: [150, 300], step: 50, v: [1, 3] },
  { what: bi("a car", "un auto"), m10: [10000, 16000], step: 1000, v: [5, 25] },
];
/** Things lifted or about to fall: mass in tenths of a kilogram and height in whole meters. */
type Lift = { what: Bi; the: Bi; where: Bi; from?: Bi; m10: [number, number]; step: number; h: [number, number] };
const LIFTS: Lift[] = [
  { what: bi("a backpack", "una mochila"), the: bi("the backpack", "la mochila"), where: bi("on a shelf", "en un estante"), from: bi("from a shelf", "desde un estante"), m10: [20, 80], step: 10, h: [1, 2] },
  { what: bi("a hiker", "una excursionista"), the: bi("the hiker", "la excursionista"), where: bi("at the top of a hill", "en la cima de una colina"), m10: [500, 800], step: 50, h: [20, 90] },
  { what: bi("a roller coaster car with riders", "un carro de montaña rusa con pasajeros"), the: bi("the car", "el carro"), where: bi("at the top of the first hill", "en la cima de la primera subida"), m10: [4000, 8000], step: 500, h: [20, 60] },
  { what: bi("a rock", "una roca"), the: bi("the rock", "la roca"), where: bi("at the edge of a cliff", "al borde de un acantilado"), from: bi("from the edge of a cliff", "desde el borde de un acantilado"), m10: [50, 200], step: 10, h: [10, 40] },
  { what: bi("an apple", "una manzana"), the: bi("the apple", "la manzana"), where: bi("on a branch", "en una rama"), from: bi("from a branch", "desde una rama"), m10: [2, 3], step: 1, h: [2, 6] },
  { what: bi("a flowerpot", "una maceta"), the: bi("the flowerpot", "la maceta"), where: bi("on a windowsill", "en el borde de una ventana"), m10: [10, 40], step: 5, h: [3, 9] },
];

export function energyItem(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) {
    const o = r.pick(MOVERS);
    const m10 = r.int(o.m10[0] / o.step, o.m10[1] / o.step) * o.step;
    let v = r.int(o.v[0], o.v[1]);
    if ((m10 * v * v) % 2) v = v < o.v[1] ? v + 1 : v - 1; // keep ½ m v² a whole number of tenths
    const ke = q1((m10 * v * v) / 2);
    const m = q1(m10), sp = q0(v);
    const text = both((s) =>
      tr(
        locale,
        `${cap(o.what.en)} with a mass of ${qt(m, KG, locale, s)} moves at ${qt(sp, MPS, locale, s)}. What is the kinetic energy, in ${s ? "joules" : "J"}?`,
        `${cap(o.what.es)} con una masa de ${qt(m, KG, locale, s)} se mueve a ${qt(sp, MPS, locale, s)}. ¿Cuál es su energía cinética, en ${s ? "joules" : "J"}?`,
      ),
    );
    return {
      ...text,
      input: "keypad",
      keys: ["."],
      answer: { kind: "number", value: val(ke) },
      wrong: misses(val(ke), [
        [(m10 * v * v) / 10, "forgot-half"],
        [(m10 * v) / 20, "forgot-to-square"],
        [((m10 / 10) * v) ** 2 / 2, "squared-the-product"],
      ]),
      hints: [
        tr(locale, "Kinetic energy depends on mass and on speed. Which one is squared?", "La energía cinética depende de la masa y de la rapidez. ¿Cuál se eleva al cuadrado?"),
        tr(locale, "KE = ½ × m × v². Square the speed first, then multiply by the mass and take half.", "EC = ½ × m × v². Primero eleva la rapidez al cuadrado, luego multiplica por la masa y saca la mitad."),
        tr(locale, `v² = ${v} × ${v} = ${v * v}`, `v² = ${v} × ${v} = ${v * v}`),
      ],
      steps: [`v² = ${v} × ${v} = ${v * v}`, `KE = ½ × ${show(m)} × ${v * v} = ${show(ke)}`, `${show(ke)} J`].map((s) => (locale === "es" ? s.replace("KE", "EC") : s)),
      seconds: 40,
    };
  }
  const o = r.pick(LIFTS);
  const m10 = r.int(o.m10[0] / o.step, o.m10[1] / o.step) * o.step;
  const h = r.int(o.h[0], o.h[1]);
  const pe: Q = { n: 98 * m10 * h, k: 2 }; // 9.8 × (m10 / 10) × h, in hundredths of a joule
  const m = q1(m10), H = q0(h);
  const kind = r.pick(o.from ? (["pe", "fall", "fall", "height"] as const) : (["pe", "pe", "height"] as const));
  const g = tr(locale, "Use g = 9.8 N/kg.", "Usa g = 9.8 N/kg.");
  const gSaid = tr(locale, "Use g equals 9.8 newtons per kilogram.", "Usa g igual a 9.8 newtons por kilogramo.");
  const text = both((s) => {
    const W = cap(o.what[locale]), where = o.where[locale], G = s ? gSaid : g, Ju = s ? "joules" : "J";
    if (kind === "pe")
      return tr(locale, `${W} with a mass of ${qt(m, KG, locale, s)} is ${where}, ${qt(H, M, locale, s)} above the ground. What is the gravitational potential energy, in ${Ju}? ${G}`, `${W} con una masa de ${qt(m, KG, locale, s)} está ${where}, a ${qt(H, M, locale, s)} sobre el suelo. ¿Cuál es su energía potencial gravitatoria, en ${Ju}? ${G}`);
    if (kind === "fall")
      return tr(locale, `${W} with a mass of ${qt(m, KG, locale, s)} falls ${o.from!.en}, ${qt(H, M, locale, s)} above the ground. Ignoring air resistance, how much kinetic energy does it have just before it lands, in ${Ju}? ${G}`, `${W} con una masa de ${qt(m, KG, locale, s)} cae ${o.from!.es}, a ${qt(H, M, locale, s)} sobre el suelo. Sin contar la resistencia del aire, ¿cuánta energía cinética tiene justo antes de llegar al suelo, en ${Ju}? ${G}`);
    return tr(locale, `${W} with a mass of ${qt(m, KG, locale, s)} is ${where}. Its gravitational potential energy is ${qt(pe, J, locale, s)}. How high above the ground is ${o.the.en}, in ${s ? "meters" : "m"}? ${G}`, `${W} con una masa de ${qt(m, KG, locale, s)} está ${where}. Su energía potencial gravitatoria es de ${qt(pe, J, locale, s)}. ¿A qué altura sobre el suelo está ${o.the.es}, en ${s ? "metros" : "m"}? ${G}`);
  });
  const mgh = `9.8 × ${show(m)} × ${h}`;
  if (kind === "height")
    return {
      ...text,
      input: "keypad",
      keys: ["."],
      answer: { kind: "number", value: h },
      wrong: misses(h, [
        [(98 * h) / 10, "forgot-g"],
        [(m10 * h) / 10, "forgot-mass"],
        [(98 * h) / 100, "used-g-10"],
      ]),
      hints: [
        tr(locale, "Potential energy is mass times g times height. Which of these do you know?", "La energía potencial es masa por g por altura. ¿Cuáles conoces?"),
        tr(locale, "PE = m × g × h, so h = PE ÷ (m × g).", "EP = m × g × h, así que h = EP ÷ (m × g)."),
        tr(locale, `m × g = ${show(m)} × 9.8 = ${dec(98 * m10, 2)}`, `m × g = ${show(m)} × 9.8 = ${dec(98 * m10, 2)}`),
      ],
      steps: [`m × g = ${show(m)} × 9.8 = ${dec(98 * m10, 2)}`, `h = ${show(pe)} ÷ ${dec(98 * m10, 2)} = ${h}`, `${h} m`],
      seconds: 50,
    };
  return {
    ...text,
    input: "keypad",
    keys: ["."],
    answer: { kind: "number", value: val(pe) },
    wrong: misses(val(pe), [
      [(m10 / 10) * h, "forgot-g"],
      [m10 * h, "used-g-10"],
      [val(pe) / 2, "halved-like-kinetic"],
      [(98 * m10) / 100, "forgot-height"],
    ]),
    hints: [
      kind === "fall"
        ? tr(locale, "As it falls, its potential energy turns into kinetic energy. How much potential energy did it start with?", "Al caer, su energía potencial se convierte en energía cinética. ¿Cuánta energía potencial tenía al principio?")
        : tr(locale, "Potential energy depends on mass, g, and height above the ground.", "La energía potencial depende de la masa, de g y de la altura sobre el suelo."),
      tr(locale, "PE = m × g × h. Multiply all three.", "EP = m × g × h. Multiplica los tres."),
      tr(locale, `m × g = ${show(m)} × 9.8 = ${dec(98 * m10, 2)}`, `m × g = ${show(m)} × 9.8 = ${dec(98 * m10, 2)}`),
    ],
    steps: [
      ...(kind === "fall" ? [tr(locale, "Ignoring air resistance, all of the potential energy becomes kinetic energy.", "Sin contar la resistencia del aire, toda la energía potencial se convierte en energía cinética.")] : []),
      `${tr(locale, "PE", "EP")} = ${mgh} = ${show(pe)}`,
      `${show(pe)} J`,
    ],
    seconds: 50,
  };
}

// ── s.wave.speed ────────────────────────────────────────────────────────────────────────────────

/** Level 1 waves: frequency in tenths of a hertz and wavelength in tenths of a meter, as ranges or fixed pairs. */
type Wave = { what: Bi; f10: [number, number]; fs: number; l10: [number, number]; pairs?: [number, number][] };
const WAVES: Wave[] = [
  { what: bi("A wave travels along a rope.", "Una onda viaja por una cuerda."), f10: [10, 50], fs: 10, l10: [5, 30] },
  { what: bi("Ripples cross a wave tank.", "Unas ondas cruzan un tanque de olas."), f10: [10, 40], fs: 10, l10: [2, 8] },
  { what: bi("A wave moves along a stretched spring toy.", "Una onda avanza por un resorte de juguete estirado."), f10: [10, 40], fs: 10, l10: [4, 15] },
  { what: bi("Ocean waves roll toward a pier.", "Olas del mar avanzan hacia un muelle."), f10: [0, 0], fs: 1, l10: [0, 0], pairs: [[4, 100], [3, 160], [3, 200], [2, 300], [2, 400], [2, 500]] },
  { what: bi("A wave runs along a guitar string.", "Una onda recorre una cuerda de guitarra."), f10: [1000, 2000], fs: 100, l10: [12, 14] },
];
/** Level 2: a known speed, with frequencies chosen so the wavelength (in hundredths of a meter) comes out exact. */
type Medium = { what: Bi; v: number; fs: number[] };
const MEDIA: Medium[] = [
  { what: bi("Sound travels through air at about 340 m/s.", "El sonido viaja por el aire a unos 340 m/s."), v: 340, fs: [85, 136, 170, 200, 425, 680, 850, 1360, 1700] },
  { what: bi("Sound travels through water at about 1,500 m/s.", "El sonido viaja por el agua a unos 1,500 m/s."), v: 1500, fs: [150, 300, 500, 600, 750, 1000, 3000] },
  { what: bi("Radio waves travel at about 300,000,000 m/s.", "Las ondas de radio viajan a unos 300,000,000 m/s."), v: 300_000_000, fs: [600_000, 1_000_000, 1_500_000, 100_000_000] },
];

export function waveItem(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) {
    const w = r.pick(WAVES);
    const [f10, l10] = w.pairs ? r.pick(w.pairs) : [r.int(w.f10[0] / w.fs, w.f10[1] / w.fs) * w.fs, r.int(w.l10[0], w.l10[1])];
    const f = q1(f10), l = q1(l10), v: Q = { n: f10 * l10, k: 2 };
    const text = both((s) =>
      tr(
        locale,
        `${w.what.en} The frequency is ${qt(f, HZ, locale, s)} and the wavelength is ${qt(l, M, locale, s)}. What is the wave speed, in ${s ? "meters per second" : "m/s"}?`,
        `${w.what.es} La frecuencia es de ${qt(f, HZ, locale, s)} y la longitud de onda es de ${qt(l, M, locale, s)}. ¿Cuál es la rapidez de la onda, en ${s ? "metros por segundo" : "m/s"}?`,
      ),
    );
    return {
      ...text,
      input: "keypad",
      keys: ["."],
      answer: { kind: "number", value: val(v) },
      wrong: misses(val(v), [
        [r2(f10 / l10), "divided-instead-of-multiplied"],
        [r2(l10 / f10), "divided-wrong-way"],
        [(f10 + l10) / 10, "added-instead-of-multiplied"],
      ]),
      hints: [
        tr(locale, `Each second, ${show(f)} waves pass a point, and each one is ${show(l)} m long. How far does the wave move in a second?`, `Cada segundo pasan ${show(f)} ondas por un punto, y cada una mide ${show(l)} m. ¿Cuánto avanza la onda en un segundo?`),
        tr(locale, "Wave speed = frequency × wavelength (v = f × λ).", "Rapidez de la onda = frecuencia × longitud de onda (v = f × λ)."),
        `v = ${show(f)} × ${show(l)}`,
      ],
      steps: [`v = f × λ`, `v = ${show(f)} × ${show(l)} = ${show(v)}`, `${show(v)} m/s`],
      seconds: 35,
    };
  }
  const md = r.pick(MEDIA);
  const f = r.pick(md.fs);
  const l100 = (md.v * 100) / f; // exact by the choice of frequencies
  const lam: Q = { n: l100, k: 2 }, F = q0(f), Vq = q0(md.v);
  const findF = r.bool(0.4);
  const text = both((s) => {
    const what = s ? md.what[locale].replace("m/s", tr(locale, "meters per second", "metros por segundo")) : md.what[locale];
    return findF
      ? tr(locale, `${what} A wave has a wavelength of ${qt(lam, M, locale, s)}. What is its frequency, in ${s ? "hertz" : "Hz"}?`, `${what} Una onda tiene una longitud de onda de ${qt(lam, M, locale, s)}. ¿Cuál es su frecuencia, en ${s ? "hertz" : "Hz"}?`)
      : tr(locale, `${what} A wave has a frequency of ${qt(F, HZ, locale, s)}. What is its wavelength, in ${s ? "meters" : "m"}?`, `${what} Una onda tiene una frecuencia de ${qt(F, HZ, locale, s)}. ¿Cuál es su longitud de onda, en ${s ? "metros" : "m"}?`);
  });
  const key = findF ? f : val(lam);
  return {
    ...text,
    input: "keypad",
    keys: ["."],
    answer: { kind: "number", value: key },
    wrong: misses(key, findF ? [[md.v * val(lam), "multiplied-instead-of-divided"], [r2(val(lam) / md.v), "divided-wrong-way"]] : [[md.v * f, "multiplied-instead-of-divided"], [r2(f / md.v), "divided-wrong-way"]]),
    hints: [
      tr(locale, "Which two of speed, frequency, and wavelength do you know?", "¿Cuáles dos de rapidez, frecuencia y longitud de onda conoces?"),
      findF
        ? tr(locale, "v = f × λ, so f = v ÷ λ.", "v = f × λ, así que f = v ÷ λ.")
        : tr(locale, "v = f × λ, so λ = v ÷ f.", "v = f × λ, así que λ = v ÷ f."),
      findF ? `f = ${show(Vq)} ÷ ${show(lam)}` : `λ = ${show(Vq)} ÷ ${show(F)}`,
    ],
    steps: findF
      ? [`f = v ÷ λ`, `f = ${show(Vq)} ÷ ${show(lam)} = ${show(F)}`, `${show(F)} Hz`]
      : [`λ = v ÷ f`, `λ = ${show(Vq)} ÷ ${show(F)} = ${show(lam)}`, `${show(lam)} m`],
    seconds: 40,
  };
}

// ── s.ohms.law ──────────────────────────────────────────────────────────────────────────────────

const PARTS: Bi[] = [bi("a lamp", "una lámpara"), bi("a small motor", "un motor pequeño"), bi("a buzzer", "un zumbador"), bi("a resistor", "un resistor"), bi("a heating coil", "una bobina calefactora")];
const BATTERIES = [15, 30, 45, 60, 90, 120, 240]; // tenths of a volt
const RES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 40, 50, 60];

export function ohmsItem(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) {
    const combos = BATTERIES.flatMap((v10) => RES.filter((R) => v10 % R === 0 && v10 / R <= 50).map((R) => [v10, R] as const));
    const [v10, R] = r.pick(combos);
    const i10 = v10 / R;
    const part = r.pick(PARTS)[locale];
    const ask = r.pick(["I", "R", "V"] as const);
    const Vq = q1(v10), Iq = q1(i10), Rq = q0(R);
    const text = both((s) => {
      if (ask === "I") return tr(locale, `A battery of ${qt(Vq, V, locale, s)} is connected to ${part} with a resistance of ${qt(Rq, OHM, locale, s)}. What current flows, in ${s ? "amps" : "A"}?`, `Una batería de ${qt(Vq, V, locale, s)} se conecta a ${part} con una resistencia de ${qt(Rq, OHM, locale, s)}. ¿Qué corriente circula, en ${s ? "amperios" : "A"}?`);
      if (ask === "R") return tr(locale, `A battery of ${qt(Vq, V, locale, s)} pushes a current of ${qt(Iq, A, locale, s)} through ${part}. What is its resistance, in ${s ? "ohms" : "Ω"}?`, `Una batería de ${qt(Vq, V, locale, s)} hace circular una corriente de ${qt(Iq, A, locale, s)} por ${part}. ¿Cuál es su resistencia, en ${s ? "ohmios" : "Ω"}?`);
      return tr(locale, `A current of ${qt(Iq, A, locale, s)} flows through ${part} with a resistance of ${qt(Rq, OHM, locale, s)}. What is the voltage across it, in ${s ? "volts" : "V"}?`, `Una corriente de ${qt(Iq, A, locale, s)} circula por ${part} con una resistencia de ${qt(Rq, OHM, locale, s)}. ¿Cuál es el voltaje entre sus extremos, en ${s ? "voltios" : "V"}?`);
    });
    const key = ask === "I" ? val(Iq) : ask === "R" ? R : val(Vq);
    const solved = ask === "I" ? "I = V ÷ R" : ask === "R" ? "R = V ÷ I" : "V = I × R";
    const work = ask === "I" ? `I = ${show(Vq)} ÷ ${R} = ${show(Iq)}` : ask === "R" ? `R = ${show(Vq)} ÷ ${show(Iq)} = ${R}` : `V = ${show(Iq)} × ${R} = ${show(Vq)}`;
    const u = ask === "I" ? "A" : ask === "R" ? "Ω" : "V";
    return {
      ...text,
      input: "keypad",
      keys: ["."],
      answer: { kind: "number", value: key },
      wrong: misses(
        key,
        ask === "I"
          ? [[val(Vq) * R, "multiplied-instead-of-divided"], [r2((R * 10) / v10), "divided-wrong-way"]]
          : ask === "R"
            ? [[val(Vq) * val(Iq), "multiplied-instead-of-divided"], [r2(i10 / v10), "divided-wrong-way"]]
            : [[r2(i10 / 10 / R), "divided-instead-of-multiplied"], [r2((R * 10) / i10), "divided-wrong-way"]],
      ),
      hints: [
        tr(locale, "Ohm's law links voltage (V), current (I), and resistance (R). Which two do you know?", "La ley de Ohm relaciona el voltaje (V), la corriente (I) y la resistencia (R). ¿Cuáles dos conoces?"),
        ask === "V"
          ? tr(locale, "V = I × R: multiply the current by the resistance.", "V = I × R: multiplica la corriente por la resistencia.")
          : tr(locale, `V = I × R, so ${solved}.`, `V = I × R, así que ${solved}.`),
        work.split(" = ").slice(0, 2).join(" = "),
      ],
      steps: ["V = I × R", work, `${show(ask === "I" ? Iq : ask === "R" ? Rq : Vq)} ${u}`],
      seconds: 35,
    };
  }
  // Series circuits: the resistances add, then one current flows through every part.
  const parts = r.int(2, 3);
  let Rs: number[], i10: number;
  for (;;) {
    Rs = Array.from({ length: parts }, () => r.int(1, 12) * (r.bool(0.3) ? 5 : 1));
    const total = Rs.reduce((a, b) => a + b, 0);
    const options = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30].filter((i) => (i * total) % 5 === 0 && i * total <= 480);
    if (options.length) {
      i10 = r.pick(options);
      break;
    }
  }
  const total = Rs.reduce((a, b) => a + b, 0);
  const v10 = i10 * total;
  const ask = r.pick(["total", "current", "current", "drop"] as const);
  const Vq = q1(v10), Iq = q1(i10);
  const list = (s: boolean) => {
    const items = Rs.map((x) => qt(q0(x), OHM, locale, s));
    return items.length === 2 ? items.join(tr(locale, " and ", " y ")) : `${items.slice(0, -1).join(", ")}${tr(locale, ", and ", " y ")}${items.at(-1)}`;
  };
  const text = both((s) => {
    const head = tr(locale, `Resistors of ${list(s)} are connected in series to a power supply of ${qt(Vq, V, locale, s)}.`, `Resistores de ${list(s)} están conectados en serie a una fuente de ${qt(Vq, V, locale, s)}.`);
    if (ask === "total") return `${head} ${tr(locale, `What is the total resistance, in ${s ? "ohms" : "Ω"}?`, `¿Cuál es la resistencia total, en ${s ? "ohmios" : "Ω"}?`)}`;
    if (ask === "current") return `${head} ${tr(locale, `What current flows, in ${s ? "amps" : "A"}?`, `¿Qué corriente circula, en ${s ? "amperios" : "A"}?`)}`;
    return `${head} ${tr(locale, `What is the voltage across the resistor of ${qt(q0(Rs[0]), OHM, locale, s)}, in ${s ? "volts" : "V"}?`, `¿Cuál es el voltaje en el resistor de ${qt(q0(Rs[0]), OHM, locale, s)}, en ${s ? "voltios" : "V"}?`)}`;
  });
  const sum = `${Rs.join(" + ")} = ${total}`;
  const drop10 = i10 * Rs[0];
  const key = ask === "total" ? total : ask === "current" ? val(Iq) : val(q1(drop10));
  const product = Rs.reduce((a, b) => a * b, 1);
  return {
    ...text,
    input: "keypad",
    keys: ["."],
    answer: { kind: "number", value: key },
    wrong: misses(
      key,
      ask === "total"
        ? [[product, "multiplied-resistances"], [r2(total / parts), "averaged-resistances"], [Math.max(...Rs), "used-one-resistor"]]
        : ask === "current"
          ? [[r2(v10 / 10 / Rs[0]), "used-one-resistor"], [val(Vq) * total, "multiplied-instead-of-divided"], [r2(v10 / 10 / product), "multiplied-resistances"]]
          : [[val(Vq), "used-total-voltage"], [r2(v10 / 10 / parts), "split-voltage-evenly"], [val(Iq), "gave-the-current"]],
    ),
    hints: [
      tr(locale, "In a series circuit there is only one path, so the same current flows through every resistor.", "En un circuito en serie hay un solo camino, así que la misma corriente pasa por cada resistor."),
      ask === "total"
        ? tr(locale, "In series, the total resistance is the sum of the resistances.", "En serie, la resistencia total es la suma de las resistencias.")
        : ask === "current"
          ? tr(locale, "Add the resistances to get the total, then use I = V ÷ R.", "Suma las resistencias para obtener el total y luego usa I = V ÷ R.")
          : tr(locale, "Find the current with the total resistance, then use V = I × R for that one resistor.", "Encuentra la corriente con la resistencia total y luego usa V = I × R para ese resistor."),
      tr(locale, `Total resistance: ${Rs.join(" + ")} Ω`, `Resistencia total: ${Rs.join(" + ")} Ω`),
    ],
    steps: [
      tr(locale, `Total resistance: ${sum} Ω`, `Resistencia total: ${sum} Ω`),
      ...(ask === "total" ? [] : [`I = ${show(Vq)} ÷ ${total} = ${show(Iq)} A`]),
      ...(ask === "drop" ? [`V = ${show(Iq)} × ${Rs[0]} = ${dec(drop10)} V`] : []),
    ],
    seconds: ask === "total" ? 30 : 55,
  };
}

// ── s.momentum ──────────────────────────────────────────────────────────────────────────────────

/** Things that move: mass in tenths of a kilogram (range, step) and speed in tenths of m/s. */
type Body = { what: Bi; the: Bi; m10: [number, number]; step: number; v10: [number, number] };
const BODIES: Body[] = [
  { what: bi("an ice skater", "una patinadora"), the: bi("the skater", "la patinadora"), m10: [400, 700], step: 50, v10: [20, 60] },
  { what: bi("a soccer ball", "un balón de fútbol"), the: bi("the ball", "el balón"), m10: [4, 4], step: 1, v10: [100, 250] },
  { what: bi("a bowling ball", "una bola de boliche"), the: bi("the ball", "la bola"), m10: [50, 70], step: 10, v10: [20, 80] },
  { what: bi("a football player", "un jugador de fútbol americano"), the: bi("the player", "el jugador"), m10: [900, 1100], step: 50, v10: [30, 80] },
  { what: bi("a lab cart", "un carrito de laboratorio"), the: bi("the cart", "el carrito"), m10: [10, 50], step: 5, v10: [5, 30] },
  { what: bi("a car", "un auto"), the: bi("the car", "el auto"), m10: [10000, 15000], step: 1000, v10: [100, 250] },
];
/** A moving object meets one at rest and they stick. Masses are whole numbers times `unit` kg; `vmax` caps the first speed. */
type Crash = { a: Bi; verb: Bi; b: Bi; join: Bi; m1: [number, number]; m2: [number, number]; unit: number; vmax: number };
const CRASH: Crash[] = [
  { a: bi("A lab cart", "Un carrito de laboratorio"), verb: bi("rolls into", "choca con"), b: bi("a second cart", "un segundo carrito"), join: bi("They latch together.", "Quedan enganchados."), m1: [1, 6], m2: [1, 6], unit: 1, vmax: 4 },
  { a: bi("A train car", "Un vagón de tren"), verb: bi("rolls into", "choca suavemente con"), b: bi("a parked train car", "un vagón estacionado"), join: bi("They couple and roll on together.", "Se acoplan y siguen rodando juntos."), m1: [2, 8], m2: [2, 8], unit: 10000, vmax: 3 },
  { a: bi("A ball of clay", "Una bola de plastilina"), verb: bi("hits", "choca con"), b: bi("a block on ice", "un bloque sobre hielo"), join: bi("The clay sticks to the block.", "La plastilina se pega al bloque."), m1: [1, 4], m2: [2, 10], unit: 1, vmax: 10 },
];

export function momentumItem(r: Rng, level: number, locale: Locale): ItemBody {
  const kgms = (s: boolean) => (s ? KGMS.w[1][locale] : KGMS.s[locale]);
  if (level === 1) {
    const b = r.pick(BODIES);
    const m10 = r.int(b.m10[0] / b.step, b.m10[1] / b.step) * b.step;
    // Keep the momentum to tenths: a speed with tenths goes with a whole-kilogram mass.
    let v10 = r.int(b.v10[0], b.v10[1]);
    if (m10 % 10 && v10 % 10) v10 -= v10 % 10;
    const p: Q = { n: m10 * v10, k: 2 }, m = q1(m10), v = q1(v10);
    const findV = r.bool(0.35) && m10 % 10 === 0;
    const text = both((s) =>
      findV
        ? tr(locale, `${cap(b.what.en)} has a mass of ${qt(m, KG, locale, s)} and a momentum of ${show(p)} ${kgms(s)}. How fast is ${b.the.en} moving, in ${s ? "meters per second" : "m/s"}?`, `${cap(b.what.es)} tiene una masa de ${qt(m, KG, locale, s)} y una cantidad de movimiento de ${show(p)} ${kgms(s)}. ¿Qué tan rápido se mueve ${b.the.es}, en ${s ? "metros por segundo" : "m/s"}?`)
        : tr(locale, `${cap(b.what.en)} with a mass of ${qt(m, KG, locale, s)} moves at ${qt(v, MPS, locale, s)}. What is the momentum, in ${kgms(s)}?`, `${cap(b.what.es)} con una masa de ${qt(m, KG, locale, s)} se mueve a ${qt(v, MPS, locale, s)}. ¿Cuál es su cantidad de movimiento, en ${kgms(s)}?`),
    );
    const key = findV ? val(v) : val(p);
    return {
      ...text,
      input: "keypad",
      keys: ["."],
      answer: { kind: "number", value: key },
      wrong: misses(
        key,
        findV
          ? [[val(p) * val(m), "multiplied-instead-of-divided"], [r2(val(m) / val(p)), "divided-wrong-way"]]
          : [[(m10 + v10) / 10, "added-instead-of-multiplied"], [r2(m10 / v10), "divided-instead-of-multiplied"], [(m10 * v10 * v10) / 2000, "used-kinetic-energy"]],
      ),
      hints: [
        tr(locale, "Momentum is mass in motion: it grows with both mass and velocity.", "La cantidad de movimiento es masa en movimiento: crece con la masa y con la velocidad."),
        findV ? tr(locale, "p = m × v, so v = p ÷ m.", "p = m × v, así que v = p ÷ m.") : tr(locale, "p = m × v. Multiply the mass by the velocity.", "p = m × v. Multiplica la masa por la velocidad."),
        findV ? `v = ${show(p)} ÷ ${show(m)}` : `p = ${show(m)} × ${show(v)}`,
      ],
      steps: findV ? [`v = p ÷ m`, `v = ${show(p)} ÷ ${show(m)} = ${show(v)}`, `${show(v)} m/s`] : [`p = m × v`, `p = ${show(m)} × ${show(v)} = ${show(p)}`, `${show(p)} kg·m/s`],
      seconds: 35,
    };
  }
  if (r.bool(0.55)) {
    // A moving object hits one at rest and they stick: m1 × v1 = (m1 + m2) × v.
    const c = r.pick(CRASH);
    let m1 = 0, m2 = 0, vf10 = 0;
    for (;;) {
      m1 = r.int(c.m1[0], c.m1[1]) * c.unit;
      m2 = r.int(c.m2[0], c.m2[1]) * c.unit;
      const ok = Array.from({ length: 40 }, (_, i) => i + 2).filter((x) => ((m1 + m2) * x) % m1 === 0 && ((m1 + m2) * x) / m1 <= c.vmax * 10);
      if (ok.length) {
        vf10 = r.pick(ok);
        break;
      }
    }
    const v110 = ((m1 + m2) * vf10) / m1;
    const M1 = q0(m1), M2 = q0(m2), V1 = q1(v110), VF = q1(vf10);
    const text = both((s) =>
      tr(
        locale,
        `${c.a.en} with a mass of ${qt(M1, KG, locale, s)} moves at ${qt(V1, MPS, locale, s)} and ${c.verb.en} ${c.b.en} with a mass of ${qt(M2, KG, locale, s)} that is not moving. ${c.join.en} How fast do they move together, in ${s ? "meters per second" : "m/s"}?`,
        `${c.a.es} con una masa de ${qt(M1, KG, locale, s)} se mueve a ${qt(V1, MPS, locale, s)} y ${c.verb.es} ${c.b.es} con una masa de ${qt(M2, KG, locale, s)} que está quieto. ${c.join.es} ¿Qué tan rápido se mueven juntos, en ${s ? "metros por segundo" : "m/s"}?`,
      ),
    );
    const p1: Q = { n: m1 * v110, k: 1 };
    return {
      ...text,
      input: "keypad",
      keys: ["."],
      answer: { kind: "number", value: val(VF) },
      wrong: misses(val(VF), [
        [val(V1), "forgot-combined-mass"],
        [r2((m1 * v110) / m2 / 10), "used-other-mass"],
        [v110 / 20, "averaged-velocities"],
      ]),
      hints: [
        tr(locale, "The total momentum before the collision equals the total momentum after it.", "La cantidad de movimiento total antes del choque es igual a la total después."),
        tr(locale, "Before: only the moving object has momentum. After: both masses move together, so divide by the total mass.", "Antes: solo el objeto en movimiento tiene cantidad de movimiento. Después: las dos masas se mueven juntas, así que divide entre la masa total."),
        tr(locale, `Momentum before: ${show(M1)} × ${show(V1)} = ${show(p1)} kg·m/s`, `Cantidad de movimiento antes: ${show(M1)} × ${show(V1)} = ${show(p1)} kg·m/s`),
      ],
      steps: [
        tr(locale, `Before: ${show(M1)} × ${show(V1)} = ${show(p1)} kg·m/s`, `Antes: ${show(M1)} × ${show(V1)} = ${show(p1)} kg·m/s`),
        tr(locale, `Total mass after: ${show(M1)} + ${show(M2)} = ${show(q0(m1 + m2))} kg`, `Masa total después: ${show(M1)} + ${show(M2)} = ${show(q0(m1 + m2))} kg`),
        `v = ${show(p1)} ÷ ${show(q0(m1 + m2))} = ${show(VF)} m/s`,
      ],
      seconds: 70,
    };
  }
  // Two skaters at rest push apart: their momenta are equal and opposite.
  const a = r.pick(NAMES);
  const b = r.pick(NAMES.filter((n) => n !== a));
  let ma = 0, mb = 0, vb10 = 0;
  for (;;) {
    ma = r.int(8, 16) * 5;
    mb = r.int(8, 16) * 5;
    if (ma === mb) continue;
    const ok = Array.from({ length: 30 }, (_, i) => i + 5).filter((x) => (mb * x) % ma === 0);
    if (ok.length) {
      vb10 = r.pick(ok);
      break;
    }
  }
  const va10 = (mb * vb10) / ma;
  const MA = q0(ma), MB = q0(mb), VB = q1(vb10), VA = q1(va10);
  const text = both((s) =>
    tr(
      locale,
      `${a} (${qt(MA, KG, locale, s)}) and ${b} (${qt(MB, KG, locale, s)}) stand still on ice skates, then push off each other. ${b} glides away at ${qt(VB, MPS, locale, s)}. How fast does ${a} glide the other way, in ${s ? "meters per second" : "m/s"}?`,
      `${a} (${qt(MA, KG, locale, s)}) y ${b} (${qt(MB, KG, locale, s)}) están quietos sobre patines de hielo y se empujan. ${b} se desliza a ${qt(VB, MPS, locale, s)}. ¿Qué tan rápido se desliza ${a} en sentido contrario, en ${s ? "metros por segundo" : "m/s"}?`,
    ),
  );
  const pb: Q = { n: mb * vb10, k: 1 };
  return {
    ...text,
    input: "keypad",
    keys: ["."],
    answer: { kind: "number", value: val(VA) },
    wrong: misses(val(VA), [
      [val(VB), "assumed-equal-speeds"],
      [r2((ma * vb10) / mb / 10), "swapped-masses"],
      [0, "thinks-momentum-lost"],
    ]),
    hints: [
      tr(locale, "Before the push, the total momentum is zero. What must it be after?", "Antes del empujón, la cantidad de movimiento total es cero. ¿Cuánto debe ser después?"),
      tr(locale, `So ${a}'s momentum equals ${b}'s momentum, in the opposite direction: m × v is the same for both.`, `Así que la cantidad de movimiento de ${a} es igual a la de ${b}, en sentido contrario: m × v es igual para los dos.`),
      tr(locale, `${b}'s momentum: ${mb} × ${show(VB)} = ${show(pb)} kg·m/s`, `Cantidad de movimiento de ${b}: ${mb} × ${show(VB)} = ${show(pb)} kg·m/s`),
    ],
    steps: [
      tr(locale, `${b}: ${mb} × ${show(VB)} = ${show(pb)} kg·m/s`, `${b}: ${mb} × ${show(VB)} = ${show(pb)} kg·m/s`),
      `v = ${show(pb)} ÷ ${ma} = ${show(VA)} m/s`,
    ],
    seconds: 60,
  };
}
