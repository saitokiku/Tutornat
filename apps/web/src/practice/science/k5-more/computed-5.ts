import type { Locale } from "@/lib/types";
import type { Rng } from "../../rng";
import { tr } from "../../text";
import type { Choice, ItemBody } from "../../types";
import { cap, choose, fmt, NAMES, wrongValues } from "./util";

// Computed grade 5 science: matter is made of particles too small to see and its mass is conserved
// (5-PS1-1, 5-PS1-2), materials are identified by their properties (5-PS1-3), and the share of
// Earth's water in each reservoir (5-ESS2-2). Amounts are whole grams in realistic ranges: salt
// stays under what water can dissolve, and an open cup loses only the gas baking soda can give off.

const opt = (label: string, why?: string): Choice => ({ label, say: label, ...(why ? { why } : {}) });
const MASS_STRATEGY: [string, string] = [
  "Matter is made of particles too small to see. When things dissolve, melt, mix or react in a closed space, the total mass stays the same.",
  "La materia está hecha de partículas demasiado pequeñas para verse. Al disolverse, derretirse, mezclarse o reaccionar en un espacio cerrado, la masa total no cambia.",
];

export function matterMass(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 3) return identifyMaterial(r, locale);
  const name = r.pick(NAMES);
  const strategy = tr(locale, ...MASS_STRATEGY);
  const kind = level === 1 ? r.pick(["dissolve", "evaporate"] as const) : r.pick(["sealed", "open", "rust"] as const);
  if (kind === "dissolve") {
    const sugar = r.bool();
    const water = 50 * r.int(4, 10);
    // Salt: at most about 30 g per 100 g of water so all of it dissolves; sugar dissolves far more.
    const solute = 5 * r.int(1, sugar ? 12 : Math.min(12, Math.floor((0.3 * water) / 5)));
    const total = water + solute;
    const what = tr(locale, sugar ? "sugar" : "salt", sugar ? "azúcar" : "sal");
    const q = tr(
      locale,
      `${name} stirs ${solute} grams of ${what} into ${water} grams of water. The ${what} disappears from view. What is the mass of the ${what} water, in grams?`,
      `${name} disuelve ${solute} gramos de ${what} en ${water} gramos de agua. ${sugar ? "El azúcar" : "La sal"} desaparece de la vista. ¿Cuál es la masa del agua con ${what}, en gramos?`,
    );
    return {
      prompt: [q],
      say: q,
      input: "keypad",
      answer: { kind: "number", value: total },
      wrong: wrongValues(total, [
        [water, "thinks-dissolved-matter-is-gone"],
        [water - solute, "subtracted-the-dissolved-part"],
      ]),
      hints: [tr(locale, `Is the ${what} really gone, or just too small to see?`, `¿${sugar ? "El azúcar" : "La sal"} de verdad se fue, o solo no se ve?`), strategy, tr(locale, `Start with ${water} grams of water and ${solute} grams of ${what}.`, `Empieza con ${water} gramos de agua y ${solute} gramos de ${what}.`)],
      steps: [
        tr(locale, `The ${what} broke into particles too small to see. They are still in the water.`, `${sugar ? "El azúcar" : "La sal"} se deshizo en partículas que no se ven. Siguen en el agua.`),
        `${water} + ${solute} = ${total}`,
        tr(locale, `The ${what} water has a mass of ${total} grams.`, `El agua con ${what} tiene una masa de ${total} gramos.`),
      ],
      seconds: 40,
    };
  }
  if (kind === "evaporate") {
    const total = 10 * r.int(10, 50);
    const salt = r.int(5, Math.floor(total / 4));
    const water = total - salt;
    const q = tr(
      locale,
      `${name} has ${total} grams of salt water in a dish. All the water evaporates in the sun, and ${salt} grams of salt are left. How many grams of water evaporated?`,
      `${name} tiene ${total} gramos de agua salada en un plato. Toda el agua se evapora al sol y quedan ${salt} gramos de sal. ¿Cuántos gramos de agua se evaporaron?`,
    );
    return {
      prompt: [q],
      say: q,
      input: "keypad",
      answer: { kind: "number", value: water },
      wrong: wrongValues(water, [
        [total + salt, "added-instead-of-subtracting"],
        [total, "thinks-salt-has-no-mass"],
        [salt, "gave-the-salt-not-the-water"],
      ]),
      hints: [tr(locale, "The salt water was salt plus water.", "El agua salada era sal más agua."), strategy, tr(locale, `Salt and water together were ${total} grams.`, `La sal y el agua juntas pesaban ${total} gramos.`)],
      steps: [
        tr(locale, "The water left as water vapor, too small to see. The salt stayed in the dish.", "El agua se fue como vapor, que no se ve. La sal se quedó en el plato."),
        `${total} − ${salt} = ${water}`,
        tr(locale, `${water} grams of water evaporated.`, `Se evaporaron ${water} gramos de agua.`),
      ],
      seconds: 45,
    };
  }
  if (kind === "rust") {
    const wool = r.int(5, 20);
    const jar = 10 * r.int(25, 60);
    const before = jar + wool;
    const q = tr(
      locale,
      `${name} seals ${wool} grams of steel wool in a jar of air. The jar and everything in it have a mass of ${before} grams. A week later the steel wool has rusted. What is the total mass now, in grams?`,
      `${name} sella ${wool} gramos de lana de acero en un frasco con aire. El frasco con todo lo que tiene pesa ${before} gramos. Una semana después, la lana de acero se oxidó. ¿Cuál es la masa total ahora, en gramos?`,
    );
    return {
      prompt: [q],
      say: q,
      input: "keypad",
      answer: { kind: "number", value: before },
      wrong: wrongValues(before, [
        [before - wool, "thinks-changed-matter-disappears"],
        [before + wool, "counted-the-steel-twice"],
      ]),
      hints: [tr(locale, "Could anything get into or out of the sealed jar?", "¿Algo pudo entrar o salir del frasco sellado?"), strategy, tr(locale, "Rust forms from the steel and oxygen already inside the jar.", "El óxido se forma con el acero y el oxígeno que ya estaban en el frasco.")],
      steps: [
        tr(locale, "The jar is sealed, so no matter got in or out.", "El frasco está sellado; no entró ni salió materia."),
        tr(locale, `The total mass is still ${before} grams.`, `La masa total sigue siendo ${before} gramos.`),
      ],
      seconds: 40,
    };
  }
  const vinegar = 10 * r.int(10, 20);
  const soda = r.int(4, 12);
  const start = vinegar + soda;
  if (kind === "sealed") {
    const q = tr(
      locale,
      `In a sealed bag, ${name} mixes ${vinegar} grams of vinegar with ${soda} grams of baking soda. They fizz and make a gas, and the bag puffs up. What is the total mass inside the bag now, in grams?`,
      `En una bolsa sellada, ${name} mezcla ${vinegar} gramos de vinagre con ${soda} gramos de bicarbonato. Burbujean, forman un gas y la bolsa se infla. ¿Cuál es la masa total dentro de la bolsa ahora, en gramos?`,
    );
    return {
      prompt: [q],
      say: q,
      input: "keypad",
      answer: { kind: "number", value: start },
      wrong: wrongValues(start, [
        [vinegar, "left-out-a-reactant"],
        [vinegar - soda, "subtracted-instead-of-adding"],
      ]),
      hints: [tr(locale, "The gas is trapped in the bag. Does gas have mass?", "El gas queda atrapado en la bolsa. ¿El gas tiene masa?"), strategy, tr(locale, `Before mixing: ${vinegar} grams and ${soda} grams.`, `Antes de mezclar: ${vinegar} gramos y ${soda} gramos.`)],
      steps: [
        tr(locale, "The gas is new matter made from the starting matter, and it stays in the bag.", "El gas se forma con la materia del principio y se queda en la bolsa."),
        `${vinegar} + ${soda} = ${start}`,
        tr(locale, `The total mass is still ${start} grams.`, `La masa total sigue siendo ${start} gramos.`),
      ],
      seconds: 45,
    };
  }
  // An open cup: the gas escapes. Baking soda gives off at most about half its mass as gas, and
  // household vinegar limits it to under 4 grams per 100 grams.
  const gasMax = Math.max(1, Math.min(Math.floor(soda * 0.5), Math.floor(vinegar * 0.036)));
  const gas = r.int(1, gasMax);
  const after = start - gas;
  const q = tr(
    locale,
    `In an open cup, ${name} mixes ${vinegar} grams of vinegar with ${soda} grams of baking soda. It fizzes. Afterward, the cup's contents have a mass of ${after} grams. How many grams of gas escaped into the air?`,
    `En un vaso abierto, ${name} mezcla ${vinegar} gramos de vinagre con ${soda} gramos de bicarbonato. Burbujea. Después, lo que hay en el vaso pesa ${after} gramos. ¿Cuántos gramos de gas se escaparon al aire?`,
  );
  return {
    prompt: [q],
    say: q,
    input: "keypad",
    answer: { kind: "number", value: gas },
    wrong: wrongValues(gas, [
      [after, "gave-the-mass-after"],
      [start, "thinks-no-gas-escaped"],
      [0, "thinks-gas-has-no-mass"],
    ]),
    hints: [tr(locale, "The cup is open. Where did the bubbles go?", "El vaso está abierto. ¿Adónde se fueron las burbujas?"), strategy, `${vinegar} + ${soda} = ${start}`],
    steps: [
      tr(locale, `Before: ${start} grams. After: ${after} grams.`, `Antes: ${start} gramos. Después: ${after} gramos.`),
      `${start} − ${after} = ${gas}`,
      tr(locale, `${gas} grams of gas escaped into the air.`, `Se escaparon ${gas} gramos de gas al aire.`),
    ],
    seconds: 50,
  };
}

// Identify a material from test results (5-PS1-3). Each result is a fixed property of the material.
// An item reports, in a random order, only the tests needed to rule out both wrong choices (plus,
// sometimes, one more), so the same key comes with different evidence from seed to seed.
type Material = {
  en: string;
  es: string;
  theEs: string;
  /** How it looks, as a sentence about "it" (the mystery solid). */
  look: [string, string];
  magnet: boolean;
  conducts: boolean;
  dissolves: boolean;
  /** Dissolved: does the water then conduct? Not dissolved: does it float? */
  water: boolean;
};
const MATERIALS: Material[] = [
  { en: "Iron", es: "Hierro", theEs: "el hierro", look: ["It is a shiny gray metal.", "Es un metal gris y brillante."], magnet: true, conducts: true, dissolves: false, water: false },
  { en: "Aluminum", es: "Aluminio", theEs: "el aluminio", look: ["It is a shiny silver metal.", "Es un metal plateado y brillante."], magnet: false, conducts: true, dissolves: false, water: false },
  { en: "Copper", es: "Cobre", theEs: "el cobre", look: ["It is a shiny reddish-brown metal.", "Es un metal café rojizo y brillante."], magnet: false, conducts: true, dissolves: false, water: false },
  { en: "Salt", es: "Sal", theEs: "la sal", look: ["It is made of small white crystals.", "Está formado por cristalitos blancos."], magnet: false, conducts: false, dissolves: true, water: true },
  { en: "Sugar", es: "Azúcar", theEs: "el azúcar", look: ["It is made of small white crystals.", "Está formado por cristalitos blancos."], magnet: false, conducts: false, dissolves: true, water: false },
  { en: "Baking soda", es: "Bicarbonato", theEs: "el bicarbonato", look: ["It is a fine white powder.", "Es un polvo blanco y fino."], magnet: false, conducts: false, dissolves: true, water: true },
  { en: "Chalk", es: "Tiza", theEs: "la tiza", look: ["It is white and leaves dusty marks when you rub it.", "Es blanco y deja marcas de polvo al frotarlo."], magnet: false, conducts: false, dissolves: false, water: false },
  { en: "Wax", es: "Cera", theEs: "la cera", look: ["It is white, smooth and a little slippery.", "Es blanco, liso y un poco resbaladizo."], magnet: false, conducts: false, dissolves: false, water: true },
  { en: "Wood", es: "Madera", theEs: "la madera", look: ["It is light brown, with thin stripes.", "Es café claro, con rayitas delgadas."], magnet: false, conducts: false, dissolves: false, water: true },
  { en: "Glass", es: "Vidrio", theEs: "el vidrio", look: ["It is clear and hard.", "Es transparente y duro."], magnet: false, conducts: false, dissolves: false, water: false },
  { en: "Sand", es: "Arena", theEs: "la arena", look: ["It is made of tiny tan grains.", "Está formado por granitos de color café claro."], magnet: false, conducts: false, dissolves: false, water: false },
];

type Test = "look" | "magnet" | "conducts" | "water";
/** Does test `t` give the same result for both materials? */
const same = (t: Test, a: Material, b: Material) =>
  t === "look" ? a.look[0] === b.look[0] : t === "water" ? a.dissolves === b.dissolves && a.water === b.water : a[t] === b[t];
/** The misconception behind picking `m` when test `t` rules it out. */
function ignored(t: Test, key: Material, m: Material): string {
  if (t === "look") return "ignored-how-it-looks";
  if (t === "magnet") return "ignored-magnet-test";
  if (t === "conducts") return "ignored-conductivity-test";
  if (key.dissolves !== m.dissolves) return "ignored-dissolving-test";
  return key.dissolves ? "ignored-solution-test" : "ignored-floating-test";
}

function identifyMaterial(r: Rng, locale: Locale): ItemBody {
  const key = r.pick(MATERIALS);
  const others = r.shuffle(MATERIALS.filter((m) => m !== key)).slice(0, 2);
  // Take tests in a random order, keeping each one that rules out a choice not yet ruled out, until
  // both wrong choices are out (every two materials differ in some test). Looks alone never decide
  // it: a measured property is always reported. Sometimes one more test is added.
  const order = r.shuffle<Test>(["look", "magnet", "conducts", "water"]);
  const tests: Test[] = [];
  const out = (m: Material) => tests.some((t) => !same(t, key, m));
  for (const t of order) if (others.some((m) => !out(m) && !same(t, key, m))) tests.push(t);
  const add = (t: Test | undefined) => {
    if (t) tests.splice(r.int(0, tests.length), 0, t);
  };
  if (tests.every((t) => t === "look")) add(order.find((t) => t !== "look"));
  if (r.bool()) add(order.find((t) => !tests.includes(t)));
  const result = (t: Test) => {
    if (t === "look") return tr(locale, ...key.look);
    if (t === "magnet") return key.magnet ? tr(locale, "A magnet pulls it.", "Un imán lo atrae.") : tr(locale, "A magnet does not pull it.", "Un imán no lo atrae.");
    if (t === "conducts") return key.conducts ? tr(locale, "It conducts electricity.", "Conduce la electricidad.") : tr(locale, "It does not conduct electricity.", "No conduce la electricidad.");
    if (key.dissolves)
      return key.water
        ? tr(locale, "It dissolves in water, and then the water conducts electricity.", "Se disuelve en agua, y luego el agua conduce la electricidad.")
        : tr(locale, "It dissolves in water, but the water still does not conduct electricity.", "Se disuelve en agua, pero el agua sigue sin conducir la electricidad.");
    return key.water ? tr(locale, "It does not dissolve in water, and it floats.", "No se disuelve en agua, y flota.") : tr(locale, "It does not dissolve in water, and it sinks.", "No se disuelve en agua, y se hunde.");
  };
  const q = [tr(locale, "A mystery solid is tested in class.", "En clase se prueba un sólido misterioso."), ...tests.map(result), tr(locale, "Which material is it most likely to be?", "¿Qué material es, probablemente?")].join(" ");
  const label = (m: Material) => tr(locale, m.en, m.es);
  /** The first reported test that rules `m` out. */
  const ruledBy = (m: Material) => tests.find((t) => !same(t, key, m))!;
  // Hint 3 rules out one wrong choice with that test, saying what that material would do.
  const [d] = others;
  const by = ruledBy(d);
  const dEn = d.en.toLowerCase(), dEs = d.es.toLowerCase(), DEs = cap(d.theEs);
  const ruleOut =
    by === "look"
      ? tr(locale, `${d.en} does not look like this, so it is not ${dEn}.`, `${DEs} no se ve así, así que no es ${dEs}.`)
      : by === "magnet"
        ? d.magnet
          ? tr(locale, `A magnet pulls ${dEn}, so it is not ${dEn}.`, `Un imán atrae ${d.theEs}, así que no es ${dEs}.`)
          : tr(locale, `A magnet does not pull ${dEn}, so it is not ${dEn}.`, `Un imán no atrae ${d.theEs}, así que no es ${dEs}.`)
        : by === "conducts"
          ? tr(locale, `${d.en} ${d.conducts ? "conducts" : "does not conduct"} electricity, so it is not ${dEn}.`, `${DEs} ${d.conducts ? "conduce" : "no conduce"} la electricidad, así que no es ${dEs}.`)
          : key.dissolves !== d.dissolves
            ? tr(locale, `${d.en} ${d.dissolves ? "dissolves" : "does not dissolve"} in water, so it is not ${dEn}.`, `${DEs} ${d.dissolves ? "se disuelve" : "no se disuelve"} en agua, así que no es ${dEs}.`)
            : d.dissolves
              ? tr(locale, `${d.en} water ${d.water ? "conducts" : "does not conduct"} electricity, so it is not ${dEn}.`, `El agua con ${dEs} ${d.water ? "conduce" : "no conduce"} la electricidad, así que no es ${dEs}.`)
              : tr(locale, `${d.en} ${d.water ? "floats" : "sinks"} in water, so it is not ${dEn}.`, `${DEs} ${d.water ? "flota" : "se hunde"} en el agua, así que no es ${dEs}.`);
  return {
    prompt: [q],
    say: q,
    ...choose(r, opt(label(key)), others.map((m) => opt(label(m), ignored(ruledBy(m), key, m)))),
    hints: [
      tr(locale, "Check each choice against every test result.", "Compara cada opción con cada resultado."),
      tr(locale, "Each material has its own set of properties. The right one matches every result.", "Cada material tiene sus propias propiedades. El correcto coincide con todos los resultados."),
      ruleOut,
    ],
    steps: [tr(locale, `Only ${key.en.toLowerCase()} matches every result.`, `Solo ${key.theEs} coincide con todos los resultados.`), tr(locale, `It is most likely ${key.en.toLowerCase()}.`, `Lo más probable es que sea ${key.es.toLowerCase()}.`)],
    seconds: 50,
  };
}

// ── Earth's water (grade 5) ──────────────────────────────────────────────────────────────────
// About 97 of every 100 parts of Earth's water is salt water and about 3 is fresh (USGS: 2.5% fresh).
// Of the fresh water, about 69 parts in 100 are ice and glaciers, 30 are groundwater and 1 is
// everywhere else: lakes, rivers, soil, air and living things (USGS: 68.7, 30.1, 1.2).

type Holder = { one: [string, string]; many: [string, string] };
const HOLDERS: Holder[] = [
  { one: ["bucket", "cubeta"], many: ["buckets", "cubetas"] },
  { one: ["jug", "jarra"], many: ["jugs", "jarras"] },
  { one: ["bottle", "botella"], many: ["bottles", "botellas"] },
  { one: ["cup", "taza"], many: ["cups", "tazas"] },
];
const FRESH_PARTS: { share: number; en: string; es: string }[] = [
  { share: 69, en: "frozen in ice and glaciers", es: "congeladas en hielo y glaciares" },
  { share: 30, en: "underground, as groundwater", es: "bajo el suelo, como agua subterránea" },
  { share: 1, en: "in lakes, rivers, soil, air and living things", es: "en lagos, ríos, suelo, aire y seres vivos" },
];

export function earthWater(r: Rng, level: number, locale: Locale): ItemBody {
  const h = r.pick(HOLDERS);
  const many = tr(locale, ...h.many);
  if (level === 1) {
    const total = 100 * r.int(1, 10);
    const askFresh = r.bool();
    const fresh = (3 * total) / 100, salt = (97 * total) / 100;
    const key = askFresh ? fresh : salt;
    const q = tr(
      locale,
      `Imagine all of Earth's water poured into ${fmt(total)} ${many}. About 97 out of every 100 would be salt water, mostly from the oceans. The rest would be fresh water. About how many ${many} would be ${askFresh ? "fresh water" : "salt water"}?`,
      `Imagina toda el agua de la Tierra en ${fmt(total)} ${many}. Unas 97 de cada 100 serían de agua salada, casi toda de los océanos. Las demás serían de agua dulce. ¿Cuántas ${many} serían de agua ${askFresh ? "dulce" : "salada"}, más o menos?`,
    );
    return {
      prompt: [q],
      say: q,
      input: "keypad",
      answer: { kind: "number", value: key },
      wrong: wrongValues(key, askFresh
        ? [[salt, "found-salt-not-fresh"], [total - 97, "subtracted-from-the-total"], [3, "used-one-hundred-not-the-total"]]
        : [[fresh, "found-fresh-not-salt"], [total - 3, "subtracted-from-the-total"], [97, "used-one-hundred-not-the-total"]]),
      hints: [
        askFresh ? tr(locale, "If 97 of every 100 are salt water, how many of every 100 are fresh?", "Si 97 de cada 100 son de agua salada, ¿cuántas de cada 100 son de agua dulce?") : tr(locale, "How many groups of 100 are there?", "¿Cuántos grupos de 100 hay?"),
        tr(locale, "Find how many groups of 100 there are. Multiply by the number out of each 100.", "Busca cuántos grupos de 100 hay. Multiplica por la cantidad de cada 100."),
        `${fmt(total)} ÷ 100 = ${total / 100}`,
      ],
      steps: [
        tr(locale, `${fmt(total)} ${many} make ${total / 100} groups of 100.`, `${fmt(total)} ${many} son ${total / 100} grupos de 100.`),
        `${askFresh ? 3 : 97} × ${total / 100} = ${fmt(key)}`,
        tr(locale, `About ${fmt(key)} ${many} would be ${askFresh ? "fresh water" : "salt water"}.`, `Unas ${fmt(key)} ${many} serían de agua ${askFresh ? "dulce" : "salada"}.`),
      ],
      seconds: 50,
    };
  }
  const ask = r.int(0, 2);
  const [a, b] = [0, 1, 2].filter((i) => i !== ask);
  if (level === 2) {
    const fresh = 100 * r.int(1, 5);
    const part = (i: number) => (FRESH_PARTS[i].share * fresh) / 100;
    const key = part(ask);
    const desc = (i: number) => tr(locale, FRESH_PARTS[i].en, FRESH_PARTS[i].es);
    // Only the smallest share can come out as 1, and its place words stay the same for one.
    const unasEs = (n: number) => (n === 1 ? "Más o menos 1 estaría" : `Unas ${fmt(n)} estarían`);
    const q = tr(
      locale,
      `Imagine all of Earth's fresh water in ${fmt(fresh)} ${many}. About ${fmt(part(a))} would be ${desc(a)}. About ${fmt(part(b))} would be ${desc(b)}. The rest would be ${desc(ask)}. How many ${many} is that?`,
      `Imagina toda el agua dulce de la Tierra en ${fmt(fresh)} ${many}. ${unasEs(part(a))} ${desc(a)}. ${unasEs(part(b))} ${desc(b)}. ${key === 1 ? "La que queda estaría" : "Las demás estarían"} ${desc(ask)}. ¿Cuántas ${many} son?`,
    );
    return {
      prompt: [q],
      say: q,
      input: "keypad",
      answer: { kind: "number", value: key },
      wrong: wrongValues(key, [
        [part(a) + part(b), "added-the-parts-given"],
        [fresh - part(a), "subtracted-only-one-part"],
        [fresh - part(b), "subtracted-only-one-part"],
      ]),
      hints: [
        tr(locale, "All the parts together make the whole amount of fresh water.", "Todas las partes juntas forman el total de agua dulce."),
        tr(locale, "Add the parts you know. Subtract that sum from the total.", "Suma las partes que conoces. Resta esa suma del total."),
        `${fmt(part(a))} + ${fmt(part(b))} = ${fmt(part(a) + part(b))}`,
      ],
      steps: [`${fmt(part(a))} + ${fmt(part(b))} = ${fmt(part(a) + part(b))}`, `${fmt(fresh)} − ${fmt(part(a) + part(b))} = ${fmt(key)}`, key === 1 ? tr(locale, `About 1 ${h.one[0]}.`, `Más o menos 1 ${h.one[1]}.`) : tr(locale, `About ${fmt(key)} ${many}.`, `Unas ${fmt(key)} ${many}.`)],
      seconds: 60,
    };
  }
  // Two steps: total → fresh → one part of the fresh water. Totals are multiples of 10,000 so every
  // step is a whole number.
  const total = 10000 * r.int(1, 5);
  const fresh = (3 * total) / 100;
  const share = FRESH_PARTS[ask].share;
  const key = (share * fresh) / 100;
  const q = tr(
    locale,
    `Imagine all of Earth's water as ${fmt(total)} drops. About 3 out of every 100 drops are fresh water. Of the fresh water, about ${share} out of every 100 drops ${share === 1 ? "is" : "are"} ${FRESH_PARTS[ask].en}. About how many drops is that?`,
    `Imagina toda el agua de la Tierra como ${fmt(total)} gotas. Unas 3 de cada 100 gotas son de agua dulce. Del agua dulce, ${share === 1 ? "1 de cada 100 gotas está" : `unas ${share} de cada 100 gotas están`} ${FRESH_PARTS[ask].es}. ¿Cuántas gotas son, más o menos?`,
  );
  return {
    prompt: [q],
    say: q,
    input: "keypad",
    answer: { kind: "number", value: key },
    wrong: wrongValues(key, [
      [fresh, "stopped-after-one-step"],
      [(share * total) / 100, "skipped-the-fresh-water-step"],
      [(3 * total) / 100 - key, "found-the-rest-of-the-fresh-water"],
    ]),
    hints: [
      tr(locale, "First find the fresh water. Then find part of it.", "Primero busca el agua dulce. Luego busca una parte de ella."),
      tr(locale, "Out of every 100 means divide by 100, then multiply.", "De cada 100 quiere decir dividir entre 100 y luego multiplicar."),
      `${fmt(total)} ÷ 100 × 3 = ${fmt(fresh)}`,
    ],
    steps: [
      tr(locale, `Fresh water: ${fmt(total)} ÷ 100 × 3 = ${fmt(fresh)} drops.`, `Agua dulce: ${fmt(total)} ÷ 100 × 3 = ${fmt(fresh)} gotas.`),
      `${fmt(fresh)} ÷ 100 × ${share} = ${fmt(key)}`,
      tr(locale, `About ${fmt(key)} drops.`, `Unas ${fmt(key)} gotas.`),
    ],
    seconds: 75,
  };
}
