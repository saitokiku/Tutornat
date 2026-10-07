import type { Locale } from "@/lib/types";
import type { Rng } from "../../rng";
import { tr } from "../../text";
import type { ItemBody, MathPart } from "../../types";
import { bi, dec, misses, r2, type Bi } from "./shared";

// Computed chemistry: half-life with whole numbers of half-lives (s.half.life), balancing simple
// equations (s.balance.equations), and formula mass and percent composition (s.percent.composition).

// ── Formulas ────────────────────────────────────────────────────────────────────────────────────

const SUB = "₀₁₂₃₄₅₆₇₈₉";
/** "C6H12O6" → "C₆H₁₂O₆". */
const pretty = (f: string) => f.replace(/\d/g, (d) => SUB[Number(d)]);
/** Read aloud letter by letter: "H2O" → "H 2 O", "NaCl" → "N a C l", "Ca(OH)2" → "C a, O H in parentheses, 2". */
function sayFormula(f: string, locale: Locale) {
  return f
    .replace(/\(([^)]*)\)(\d+)/g, (_, g: string, k: string) => `, ${g} ${tr(locale, "in parentheses", "entre paréntesis")}, ${k}`)
    .replace(/([A-Z][a-z]?)/g, (sym: string) => ` ${[...sym].join(" ")} `)
    .replace(/(\d+)/g, " $1 ")
    .replace(/\s+/g, " ")
    .replace(/ ,/g, ",")
    .trim();
}
/** Atoms of each element in one formula unit, parentheses included. */
function atoms(f: string): Map<string, number> {
  const out = new Map<string, number>();
  const add = (s: string, k: number) => {
    for (const [, sym, n] of s.matchAll(/([A-Z][a-z]?)(\d*)/g)) out.set(sym, (out.get(sym) ?? 0) + k * Number(n || 1));
  };
  add(f.replace(/\(([^)]*)\)(\d+)/g, ""), 1);
  for (const [, inner, k] of f.matchAll(/\(([^)]*)\)(\d+)/g)) add(inner, Number(k));
  return out;
}

// ── s.half.life ─────────────────────────────────────────────────────────────────────────────────

/** A radioactive isotope: half-life in tenths of a unit; `real` isotopes say "about". */
type Isotope = { name: Bi; t10: number; u: Bi; real: boolean; mass: Bi };
const iso = (en: string, es: string, t10: number, u: Bi, real: boolean, mass = bi("mg", "mg")): Isotope => ({ name: bi(en, es), t10, u, real, mass });
const YEARS = bi("years", "años"), DAYS = bi("days", "días"), HOURS = bi("hours", "horas");
const ISOTOPES: Isotope[] = [
  iso("iodine-131", "yodo-131", 80, DAYS, true),
  iso("technetium-99m", "tecnecio-99m", 60, HOURS, true),
  iso("phosphorus-32", "fósforo-32", 140, DAYS, true),
  iso("radon-222", "radón-222", 38, DAYS, true),
  iso("isotope X", "el isótopo X", 50, YEARS, false, bi("g", "g")),
  iso("isotope Q", "el isótopo Q", 120, HOURS, false, bi("g", "g")),
  iso("isotope Z", "el isótopo Z", 300, YEARS, false, bi("g", "g")),
];
const STARTS = [80, 96, 160, 192, 240, 320, 400, 480, 640, 800, 960, 1600];
const C14 = 5730;

export function halfLifeItem(r: Rng, level: number, locale: Locale): ItemBody {
  const halves = (n: number) => tr(locale, n === 1 ? "1 half-life" : `${n} half-lives`, n === 1 ? "1 vida media" : `${n} vidas medias`);
  if (level === 1 || r.bool(0.4)) {
    const s = r.pick(ISOTOPES);
    const n = r.int(level === 1 ? 1 : 2, 4);
    const A = r.pick(STARTS);
    const left = A / 2 ** n;
    const T = dec(s.t10), t = dec(s.t10 * n), U = s.u[locale], g = s.mass[locale];
    const about = s.real ? tr(locale, "about ", "unos ") : "";
    const deEs = s.name.es.startsWith("el ") ? `del ${s.name.es.slice(3)}` : `de ${s.name.es}`;
    const head = tr(locale, `A sample contains ${dec(A, 0)} ${g} of ${s.name.en}, which has a half-life of ${about}${T} ${U}.`, `Una muestra contiene ${dec(A, 0)} ${g} ${deEs}, que tiene una vida media de ${about}${T} ${U}.`);
    if (level === 1 || r.bool(0.5)) {
      const q = `${head} ${tr(locale, `How many ${g === "g" ? "grams" : "milligrams"} are left after ${t} ${U}?`, `¿Cuántos ${g === "g" ? "gramos" : "miligramos"} quedan después de ${t} ${U}?`)}`;
      const chain = [A];
      for (let i = 0; i < n; i++) chain.push(chain[i] / 2);
      return {
        prompt: [q],
        say: q,
        input: "keypad",
        keys: ["."],
        answer: { kind: "number", value: left },
        wrong: misses(left, [
          [A / 2 ** (n - 1), "one-half-life-too-few"],
          [A / 2 ** (n + 1), "one-half-life-too-many"],
          [r2(A / n), "divided-by-number-of-half-lives"],
          [n > 1 ? 0 : NaN, "thinks-it-all-decays"],
        ]),
        hints: [
          tr(locale, `How many half-lives fit into ${t} ${U}?`, `¿Cuántas vidas medias caben en ${t} ${U}?`),
          tr(locale, "After each half-life, half of what is left remains. Halve the amount once for every half-life.", "Después de cada vida media queda la mitad de lo que había. Divide la cantidad entre 2 una vez por cada vida media."),
          tr(locale, `${t} ÷ ${T} = ${n}, so that is ${halves(n)}.`, `${t} ÷ ${T} = ${n}, así que son ${halves(n)}.`),
        ],
        steps: [`${t} ÷ ${T} = ${n}: ${halves(n)}`, chain.map((x) => dec(x * 100, 2)).join(" → "), `${dec(left * 100, 2)} ${g}`],
        seconds: 45,
      };
    }
    // How long until only `left` remains?
    const q = `${head} ${tr(locale, `How many ${U} until only ${dec(left * 100, 2)} ${g} is left?`, `¿Cuántos ${U} pasan hasta que solo quedan ${dec(left * 100, 2)} ${g}?`)}`;
    const key = (s.t10 * n) / 10;
    return {
      prompt: [q],
      say: q,
      input: "keypad",
      keys: ["."],
      answer: { kind: "number", value: key },
      wrong: misses(key, [
        [n, "gave-half-lives-not-time"],
        [(s.t10 * (n - 1)) / 10, "one-half-life-too-few"],
        [(s.t10 * (n + 1)) / 10, "one-half-life-too-many"],
        [(s.t10 * 2 ** n) / 10, "multiplied-by-the-ratio"],
      ]),
      hints: [
        tr(locale, `How many times must you halve ${dec(A, 0)} to reach ${dec(left * 100, 2)}?`, `¿Cuántas veces debes dividir ${dec(A, 0)} entre 2 para llegar a ${dec(left * 100, 2)}?`),
        tr(locale, "Count the halvings; each one takes one half-life.", "Cuenta las veces que se divide entre 2; cada una tarda una vida media."),
        `${dec(A, 0)} → ${dec(A * 50, 2)}`,
      ],
      steps: [
        [A, ...Array.from({ length: n }, (_, i) => A / 2 ** (i + 1))].map((x) => dec(x * 100, 2)).join(" → "),
        tr(locale, `That is ${halves(n)}: ${n} × ${T} = ${dec(s.t10 * n)} ${U}`, `Son ${halves(n)}: ${n} × ${T} = ${dec(s.t10 * n)} ${U}`),
      ],
      seconds: 50,
    };
  }
  // Carbon-14: fraction left after a time, or age from the fraction left.
  const n = r.int(1, 4);
  const age = dec(C14 * n * 10);
  if (r.bool()) {
    const q = tr(
      locale,
      `Carbon-14 has a half-life of about 5,730 years. What fraction of the carbon-14 in a piece of wood is left after ${age} years?`,
      `El carbono-14 tiene una vida media de unos 5,730 años. ¿Qué fracción del carbono-14 de un trozo de madera queda después de ${age} años?`,
    );
    const d = 2 ** n;
    return {
      prompt: [q],
      say: q,
      input: "fraction",
      answer: { kind: "fraction", n: 1, d },
      wrong: [
        ...(n > 1 ? [{ value: `1/${n}`, why: "one-over-half-lives" }] : []),
        ...(n > 1 ? [{ value: `1/${2 * n}`, why: "one-over-twice-half-lives" }] : []),
        { value: `1/${d * 2}`, why: "one-half-life-too-many" },
        ...(n > 1 ? [{ value: `1/${d / 2}`, why: "one-half-life-too-few" }] : []),
      ].filter((w, i, all) => w.value !== `1/${d}` && all.findIndex((x) => x.value === w.value) === i),
      hints: [
        tr(locale, `How many half-lives is ${age} years?`, `¿Cuántas vidas medias son ${age} años?`),
        tr(locale, "Each half-life halves what is left: 1/2, then 1/4, then 1/8, and so on.", "Cada vida media deja la mitad de lo que había: 1/2, luego 1/4, luego 1/8, y así."),
        tr(locale, `${age} ÷ 5,730 = ${n}, so that is ${halves(n)}.`, `${age} ÷ 5,730 = ${n}, así que son ${halves(n)}.`),
      ],
      steps: [
        `${age} ÷ 5,730 = ${n}: ${halves(n)}`,
        Array.from({ length: n }, (_, i) => `1/${2 ** (i + 1)}`).join(" → "),
      ],
      seconds: 45,
    };
  }
  const frac: MathPart = { frac: [1, 2 ** n] };
  const q = (spoken: boolean): MathPart[] => [
    tr(locale, "Carbon-14 has a half-life of about 5,730 years. A piece of old wood has ", "El carbono-14 tiene una vida media de unos 5,730 años. Un trozo de madera antigua tiene "),
    spoken ? tr(locale, n === 1 ? "one half" : `one ${["", "", "fourth", "eighth", "sixteenth"][n]}`, n === 1 ? "la mitad" : `un ${["", "", "cuarto", "octavo", "dieciseisavo"][n]}`) : frac,
    tr(locale, " of the carbon-14 it had when the tree was alive. About how many years old is it?", " del carbono-14 que tenía cuando el árbol estaba vivo. ¿Aproximadamente cuántos años tiene?"),
  ];
  const key = C14 * n;
  return {
    prompt: q(false),
    say: (q(true) as string[]).join(""),
    input: "keypad",
    answer: { kind: "number", value: key },
    wrong: misses(key, [
      [C14 * 2 ** n, "multiplied-by-denominator"],
      [C14 * (n + 1), "one-half-life-too-many"],
      [n > 1 ? C14 * (n - 1) : NaN, "one-half-life-too-few"],
      [C14 / 2 ** n, "divided-the-half-life"],
    ]),
    hints: [
      tr(locale, `How many times do you halve 1 to get 1/${2 ** n}?`, `¿Cuántas veces divides 1 entre 2 para llegar a 1/${2 ** n}?`),
      tr(locale, "Each halving takes one half-life. Multiply the number of half-lives by 5,730 years.", "Cada vez que se divide entre 2 pasa una vida media. Multiplica el número de vidas medias por 5,730 años."),
      `1 → ${Array.from({ length: n }, (_, i) => `1/${2 ** (i + 1)}`).join(" → ")}`,
    ],
    steps: [
      tr(locale, `1/${2 ** n} means ${halves(n)}.`, `1/${2 ** n} significa ${halves(n)}.`),
      `${n} × 5,730 = ${dec(key, 0)}`,
      tr(locale, `About ${dec(key, 0)} years`, `Unos ${dec(key, 0)} años`),
    ],
    seconds: 45,
  };
}

// ── s.balance.equations ─────────────────────────────────────────────────────────────────────────

/** A balanced equation with the smallest whole-number coefficients: [coefficient, formula] on each side. */
type Side = [number, string][];
const eq = (left: Side, right: Side) => ({ left, right });
const EQUATIONS = [
  eq([[2, "H2"], [1, "O2"]], [[2, "H2O"]]),
  eq([[1, "N2"], [3, "H2"]], [[2, "NH3"]]),
  eq([[2, "Na"], [1, "Cl2"]], [[2, "NaCl"]]),
  eq([[2, "Mg"], [1, "O2"]], [[2, "MgO"]]),
  eq([[4, "Al"], [3, "O2"]], [[2, "Al2O3"]]),
  eq([[1, "CH4"], [2, "O2"]], [[1, "CO2"], [2, "H2O"]]),
  eq([[2, "H2O2"]], [[2, "H2O"], [1, "O2"]]),
  eq([[4, "Fe"], [3, "O2"]], [[2, "Fe2O3"]]),
  eq([[2, "KClO3"]], [[2, "KCl"], [3, "O2"]]),
  eq([[1, "C3H8"], [5, "O2"]], [[3, "CO2"], [4, "H2O"]]),
  eq([[2, "Na"], [2, "H2O"]], [[2, "NaOH"], [1, "H2"]]),
  eq([[1, "Zn"], [2, "HCl"]], [[1, "ZnCl2"], [1, "H2"]]),
  eq([[2, "Cu"], [1, "O2"]], [[2, "CuO"]]),
  eq([[6, "CO2"], [6, "H2O"]], [[1, "C6H12O6"], [6, "O2"]]),
  eq([[1, "C6H12O6"], [6, "O2"]], [[6, "CO2"], [6, "H2O"]]),
  eq([[2, "C2H6"], [7, "O2"]], [[4, "CO2"], [6, "H2O"]]),
  eq([[1, "N2"], [1, "O2"]], [[2, "NO"]]),
  eq([[2, "SO2"], [1, "O2"]], [[2, "SO3"]]),
  eq([[2, "Al"], [3, "Cl2"]], [[2, "AlCl3"]]),
  eq([[2, "HgO"]], [[2, "Hg"], [1, "O2"]]),
  eq([[1, "Ca"], [2, "H2O"]], [[1, "Ca(OH)2"], [1, "H2"]]),
  eq([[1, "Mg"], [2, "HCl"]], [[1, "MgCl2"], [1, "H2"]]),
  eq([[1, "CaCO3"], [2, "HCl"]], [[1, "CaCl2"], [1, "H2O"], [1, "CO2"]]),
  eq([[2, "NaHCO3"]], [[1, "Na2CO3"], [1, "H2O"], [1, "CO2"]]),
  eq([[1, "Fe2O3"], [3, "CO"]], [[2, "Fe"], [3, "CO2"]]),
  eq([[1, "P4"], [5, "O2"]], [[1, "P4O10"]]),
  eq([[1, "C2H5OH"], [3, "O2"]], [[2, "CO2"], [3, "H2O"]]),
  eq([[2, "NO"], [1, "O2"]], [[2, "NO2"]]),
];

/** The equation as text, with `hole` (side, index) shown as a blank or every coefficient hidden. */
function eqParts(e: (typeof EQUATIONS)[number], hole: [0 | 1, number] | "all" | null, spoken: boolean, locale: Locale): MathPart[] {
  const out: MathPart[] = [];
  const plus = spoken ? ` ${tr(locale, "plus", "más")} ` : " + ";
  const arrow = spoken ? ` ${tr(locale, "yields", "produce")} ` : " → ";
  const blank = spoken ? tr(locale, "blank", "espacio") : null;
  ([e.left, e.right] as const).forEach((side, si) => {
    if (si === 1) out.push(arrow);
    side.forEach(([c, f], i) => {
      if (i > 0) out.push(plus);
      const isHole = hole === "all" || (hole !== null && hole[0] === si && hole[1] === i);
      const F = spoken ? sayFormula(f, locale) : pretty(f);
      if (isHole) {
        if (hole === "all") out.push(spoken ? `${blank} ${F}` : `__ ${F}`);
        else if (blank) out.push(`${blank} ${F}`);
        else out.push({ blank: true }, ` ${F}`);
      } else out.push(c === 1 ? F : `${c} ${F}`);
    });
  });
  return out;
}
const flat = (parts: MathPart[]) => parts.map((p) => (typeof p === "string" ? p : "")).join("");

export function balanceItem(r: Rng, level: number, locale: Locale): ItemBody {
  const e = r.pick(EQUATIONS);
  const all: [0 | 1, number][] = [...e.left.map((_, i) => [0, i] as [0, number]), ...e.right.map((_, i) => [1, i] as [1, number])];
  // Prefer a coefficient larger than 1; a hidden 1 now and then teaches that 1 is left unwritten.
  const big = all.filter(([s, i]) => (s ? e.right : e.left)[i][0] > 1);
  const [si, idx] = r.pick(big.length && r.bool(0.85) ? big : all);
  const [k, f] = (si ? e.right : e.left)[idx];
  const mine = si ? e.right : e.left, other = si ? e.left : e.right;
  // The element to balance on: one that appears in no other substance on this side, when possible.
  const syms = [...atoms(f).keys()];
  const lonely = syms.filter((x) => mine.every(([, g], j) => j === idx || !atoms(g).has(x)));
  const el = (lonely.length ? lonely : syms).sort((a, b) => (atoms(f).get(b) ?? 0) - (atoms(f).get(a) ?? 0))[0];
  const sub = atoms(f).get(el)!;
  const count = (side: Side) => side.reduce((s, [c, g]) => s + c * (atoms(g).get(el) ?? 0), 0);
  const otherTotal = count(other), sameRest = count(mine) - k * sub;
  const sideName = (s: 0 | 1) => (s ? tr(locale, "right", "derecha") : tr(locale, "left", "izquierda"));
  const elems = [...new Set([...e.left, ...e.right].flatMap(([, g]) => [...atoms(g).keys()]))];
  const check = elems.map((x) => `${x}: ${e.left.reduce((s, [c, g]) => s + c * (atoms(g).get(x) ?? 0), 0)} = ${e.right.reduce((s, [c, g]) => s + c * (atoms(g).get(x) ?? 0), 0)}`).join(", ");
  const F = pretty(f);
  const ones = (side: Side) => side.reduce((s, [, g]) => s + (atoms(g).get(el) ?? 0), 0);
  const ignored = (ones(other) - (ones(mine) - sub)) / sub;
  const wrong = misses(k, [
    [otherTotal, "wrote-atom-count"],
    [Number.isInteger(ignored) && ignored > 0 ? ignored : NaN, "ignored-other-coefficients"],
    [level === 2 ? 2 * k : NaN, "not-smallest-numbers"],
    [k + 1, "off-by-one"],
    [k > 1 ? k - 1 : NaN, "off-by-one"],
  ]).slice(0, 4);
  const lead =
    level === 1
      ? tr(locale, "Balance the equation. What number goes in the blank?", "Balancea la ecuación. ¿Qué número va en el espacio?")
      : tr(locale, `Balance the equation with the smallest whole numbers. What number goes in front of ${F}?`, `Balancea la ecuación con los números enteros más pequeños. ¿Qué número va delante de ${F}?`);
  const leadSaid =
    level === 1
      ? lead
      : tr(locale, `Balance the equation with the smallest whole numbers. What number goes in front of ${sayFormula(f, locale)}?`, `Balancea la ecuación con los números enteros más pequeños. ¿Qué número va delante de ${sayFormula(f, locale)}?`);
  const hole = level === 1 ? ([si, idx] as [0 | 1, number]) : "all";
  return {
    prompt: [lead, "\n", ...eqParts(e, hole, false, locale)],
    say: `${leadSaid} ${flat(eqParts(e, hole, true, locale))}`,
    input: "keypad",
    answer: { kind: "number", value: k },
    wrong,
    hints: [
      tr(locale, `Count the ${el} atoms on each side. They must be equal.`, `Cuenta los átomos de ${el} en cada lado. Deben ser iguales.`),
      tr(locale, "Change only the coefficients in front of formulas, never the small numbers inside them. A coefficient multiplies every atom in its formula.", "Cambia solo los coeficientes delante de las fórmulas, nunca los números pequeños dentro de ellas. Un coeficiente multiplica cada átomo de su fórmula."),
      level === 1
        ? tr(locale, `The ${sideName(si ? 0 : 1)} side has ${otherTotal} ${el} atoms. Each ${F} has ${sub}.`, `A la ${sideName(si ? 0 : 1)} hay ${otherTotal} átomos de ${el}. Cada ${F} tiene ${sub}.`)
        : tr(locale, `Start with an element that appears in only one substance on each side, such as ${el}. Each ${F} has ${sub} ${el} ${sub === 1 ? "atom" : "atoms"}.`, `Empieza con un elemento que aparece en una sola sustancia de cada lado, como ${el}. Cada ${F} tiene ${sub} ${sub === 1 ? "átomo" : "átomos"} de ${el}.`),
    ],
    steps: [
      ...(level === 2 ? [flat(eqParts(e, null, false, locale))] : []),
      tr(
        locale,
        `${el}: ${otherTotal} on the ${sideName(si ? 0 : 1)}${sameRest ? `, ${sameRest} already on the ${sideName(si)}` : ""}. ${otherTotal - sameRest} ÷ ${sub} = ${k}`,
        `${el}: ${otherTotal} a la ${sideName(si ? 0 : 1)}${sameRest ? `, ${sameRest} ya a la ${sideName(si)}` : ""}. ${otherTotal - sameRest} ÷ ${sub} = ${k}`,
      ),
      tr(locale, `Check every element: ${check}`, `Comprueba cada elemento: ${check}`),
      tr(locale, `Answer: ${k}`, `Respuesta: ${k}`),
    ],
    seconds: level === 1 ? 45 : 75,
  };
}

// ── s.percent.composition ───────────────────────────────────────────────────────────────────────

/** Rounded atomic masses, as given in the prompt. */
const MASS: Record<string, number> = { H: 1, C: 12, N: 14, O: 16, Na: 23, Mg: 24, Al: 27, S: 32, Cl: 35.5, K: 39, Ca: 40, Fe: 56, Cu: 64 };
const NAMED: [string, Bi][] = [
  ["H2O", bi("water", "agua")], ["CO2", bi("carbon dioxide", "dióxido de carbono")], ["NH3", bi("ammonia", "amoníaco")], ["CH4", bi("methane", "metano")],
  ["NaCl", bi("sodium chloride (table salt)", "cloruro de sodio (sal de mesa)")], ["MgO", bi("magnesium oxide", "óxido de magnesio")], ["CaCO3", bi("calcium carbonate", "carbonato de calcio")],
  ["C6H12O6", bi("glucose", "glucosa")], ["H2SO4", bi("sulfuric acid", "ácido sulfúrico")], ["NaOH", bi("sodium hydroxide", "hidróxido de sodio")],
  ["Fe2O3", bi("iron oxide", "óxido de hierro")], ["Al2O3", bi("aluminum oxide", "óxido de aluminio")], ["CuSO4", bi("copper sulfate", "sulfato de cobre")],
  ["Ca(OH)2", bi("calcium hydroxide", "hidróxido de calcio")], ["NH4NO3", bi("ammonium nitrate", "nitrato de amonio")], ["C2H6", bi("ethane", "etano")],
  ["SO3", bi("sulfur trioxide", "trióxido de azufre")], ["SO2", bi("sulfur dioxide", "dióxido de azufre")], ["CuO", bi("copper oxide", "óxido de cobre")],
  ["Mg(OH)2", bi("magnesium hydroxide", "hidróxido de magnesio")], ["KCl", bi("potassium chloride", "cloruro de potasio")],
];
/** "del agua", "del metano", but "de la glucosa". */
const deName = (es: string) => (es === "glucosa" ? "de la glucosa" : `del ${es}`);
const ELEMENT: Record<string, Bi> = {
  H: bi("hydrogen", "hidrógeno"), C: bi("carbon", "carbono"), N: bi("nitrogen", "nitrógeno"), O: bi("oxygen", "oxígeno"), Na: bi("sodium", "sodio"),
  Mg: bi("magnesium", "magnesio"), Al: bi("aluminum", "aluminio"), S: bi("sulfur", "azufre"), Cl: bi("chlorine", "cloro"), K: bi("potassium", "potasio"),
  Ca: bi("calcium", "calcio"), Fe: bi("iron", "hierro"), Cu: bi("copper", "cobre"),
};
const fmass = (f: string) => [...atoms(f)].reduce((s, [x, n]) => s + MASS[x] * n, 0);
/** Percents by mass that come out to whole tenths: [formula, element]. */
const PERCENTS = NAMED.flatMap(([f]) => [...atoms(f).keys()].filter((x) => Number.isInteger((1000 * MASS[x] * atoms(f).get(x)!) / fmass(f))).map((x) => [f, x] as const));

export function percentItem(r: Rng, level: number, locale: Locale): ItemBody {
  const pickF = level === 1 ? r.pick(NAMED)[0] : r.pick(PERCENTS)[0];
  const [f, name] = NAMED.find(([g]) => g === pickF)!;
  const counts = [...atoms(f)];
  const given = counts.map(([x]) => `${x} = ${MASS[x]}`).join(", ");
  const total = fmass(f);
  const F = pretty(f);
  const sum = counts.map(([x, n]) => (n === 1 ? `${MASS[x]}` : `${n} × ${MASS[x]}`)).join(" + ");
  if (level === 1) {
    const q = tr(locale, `What is the formula mass of ${name.en}, ${F}, in atomic mass units? Use these atomic masses: ${given}.`, `¿Cuál es la masa fórmula ${deName(name.es)}, ${F}, en unidades de masa atómica? Usa estas masas atómicas: ${given}.`);
    const qSaid = tr(locale, `What is the formula mass of ${name.en}, ${sayFormula(f, locale)}, in atomic mass units? Use these atomic masses: ${given.replace(/=/g, "equals")}.`, `¿Cuál es la masa fórmula ${deName(name.es)}, ${sayFormula(f, locale)}, en unidades de masa atómica? Usa estas masas atómicas: ${given.replace(/=/g, "igual a")}.`);
    const once = counts.reduce((s, [x]) => s + MASS[x], 0);
    const noParen = fmass(f.replace(/\(([^)]*)\)\d+/g, "$1"));
    return {
      prompt: [q],
      say: qSaid,
      input: "keypad",
      keys: ["."],
      answer: { kind: "number", value: total },
      wrong: misses(total, [
        [once, "forgot-subscripts"],
        [counts.reduce((s, [, n]) => s + n, 0), "counted-atoms-not-mass"],
        [f.includes("(") ? noParen : NaN, "ignored-parentheses"],
      ]),
      hints: [
        tr(locale, `How many atoms of each element are in one ${F}?`, `¿Cuántos átomos de cada elemento hay en una unidad de ${F}?`),
        tr(locale, "Multiply each element's atomic mass by its number of atoms, then add.", "Multiplica la masa atómica de cada elemento por su número de átomos y luego suma."),
        tr(locale, `Atoms: ${counts.map(([x, n]) => `${x} ${n}`).join(", ")}`, `Átomos: ${counts.map(([x, n]) => `${x} ${n}`).join(", ")}`),
      ],
      steps: [tr(locale, `Atoms: ${counts.map(([x, n]) => `${x} ${n}`).join(", ")}`, `Átomos: ${counts.map(([x, n]) => `${x} ${n}`).join(", ")}`), `${sum} = ${total}`, `${total} u`],
      seconds: 45,
    };
  }
  const options = PERCENTS.filter(([g]) => g === f).map(([, x]) => x);
  const el = r.pick(options);
  const n = atoms(f).get(el)!;
  const part = MASS[el] * n;
  const pct10 = (1000 * part) / total;
  const E = ELEMENT[el];
  const q = tr(locale, `What percent of the mass of ${name.en}, ${F}, is ${E.en} (${el})? Use these atomic masses: ${given}.`, `¿Qué porcentaje de la masa ${deName(name.es)}, ${F}, es ${E.es} (${el})? Usa estas masas atómicas: ${given}.`);
  const qSaid = tr(locale, `What percent of the mass of ${name.en}, ${sayFormula(f, locale)}, is ${E.en}? Use these atomic masses: ${given.replace(/=/g, "equals")}.`, `¿Qué porcentaje de la masa ${deName(name.es)}, ${sayFormula(f, locale)}, es ${E.es}? Usa estas masas atómicas: ${given.replace(/=/g, "igual a")}.`);
  return {
    prompt: [q, " ", { blank: true }, " %"],
    say: qSaid,
    input: "keypad",
    keys: ["."],
    answer: { kind: "number", value: pct10 / 10 },
    wrong: misses(pct10 / 10, [
      [n > 1 ? r2((100 * MASS[el]) / total) : NaN, "forgot-subscript"],
      [counts.length === 2 ? 100 - pct10 / 10 : NaN, "found-the-other-element"],
      [pct10 / 1000, "forgot-to-multiply-by-100"],
      [r2((100 * n) / counts.reduce((s, [, c]) => s + c, 0)), "used-atom-count"],
    ]),
    hints: [
      tr(locale, `What is the mass of all the ${el} in one ${F}, and what is the whole formula mass?`, `¿Cuál es la masa de todo el ${el} en una unidad de ${F} y cuál es la masa fórmula completa?`),
      tr(locale, "Percent = mass of the element ÷ formula mass × 100.", "Porcentaje = masa del elemento ÷ masa fórmula × 100."),
      tr(locale, `Formula mass: ${sum} = ${total}`, `Masa fórmula: ${sum} = ${total}`),
    ],
    steps: [
      tr(locale, `Formula mass: ${sum} = ${total}`, `Masa fórmula: ${sum} = ${total}`),
      tr(locale, `${el}: ${n === 1 ? MASS[el] : `${n} × ${MASS[el]} = ${part}`}`, `${el}: ${n === 1 ? MASS[el] : `${n} × ${MASS[el]} = ${part}`}`),
      `${part} ÷ ${total} × 100 = ${dec(pct10)} %`,
    ],
    seconds: 60,
  };
}
