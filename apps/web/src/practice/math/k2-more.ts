import type { Locale, Visual } from "@/lib/types";
import type { Rng } from "../rng";
import { tr } from "../text";
import type { Choice, ItemBody, MathPart, Skill } from "../types";

// K–2 math to 1.0 depth: counting to 100, numbers to 20 and 1000, shapes, story problems, fact
// drills, measuring, time, money, data and equal shares. Pre-readers get pictures, read-aloud lines
// and pictured choices; counters can be marked while counting; the clock, number line and fraction
// bar are answered by doing. Every wrong choice and every likely wrong typed answer names the
// mistake it shows. All arithmetic is on small integers, so a key cannot drift.

const blank: MathPart = { blank: true };
export type Pair = readonly [en: string, es: string];
const t2 = (locale: Locale, p: Pair) => tr(locale, p[0], p[1]);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** A likely wrong answer and the misconception it shows. */
type Tag = readonly [value: number | string, why: string];

/** Likely wrong typed or tapped answers: never the key, never repeated, never negative or fractional. */
function misses(key: number | string, tags: readonly (Tag | null)[]) {
  const out: { value: string; why: string }[] = [];
  for (const tag of tags) {
    if (!tag) continue;
    const [v, why] = tag;
    const value = String(v);
    if (value === String(key) || (typeof v === "number" && (v < 0 || !Number.isInteger(v))) || out.some((w) => w.value === value)) continue;
    out.push({ value, why });
  }
  return out;
}

/** The key and its tagged distractors, shuffled. A distractor that repeats a label is dropped. */
function choose(r: Rng, key: Choice, wrong: readonly Choice[]): Pick<ItemBody, "choices" | "input" | "answer"> {
  const list: Choice[] = [key];
  for (const c of wrong) if (!list.some((x) => x.label === c.label)) list.push(c);
  const choices = r.shuffle(list);
  return { choices, input: "choices", answer: { kind: "choice", index: choices.indexOf(key) } };
}

/**
 * A number key with up to three tagged wrong numbers; near misses fill any gap. A near miss that is
 * already on screen (`shown`) is left out: picking it is a different mistake than miscounting.
 */
function numberChoices(r: Rng, key: number, tags: readonly (Tag | null)[], max = 1000, shown: readonly number[] = []) {
  const wrong: Choice[] = [];
  const add = (v: number, why: string) => {
    if (wrong.length >= 3 || !Number.isInteger(v) || v < 0 || v > max || v === key || wrong.some((c) => c.label === String(v))) return;
    wrong.push({ label: String(v), say: String(v), why });
  };
  for (const tag of tags) if (tag) add(Number(tag[0]), tag[1]);
  for (const d of [1, -1, 2, -2, 3]) if (!shown.includes(key + d)) add(key + d, Math.abs(d) === 1 ? "off-by-one" : "miscounted");
  return choose(r, { label: String(key), say: String(key) }, wrong);
}

export const NAMES = [
  "Ava", "Mateo", "Priya", "Kenji", "Amara", "Diego", "Sofia", "Malik", "Lin", "Omar", "Grace", "Luis", "Aisha", "Noah", "Mei",
  "Carlos", "Zara", "Kofi", "Hana", "Ravi", "Elena", "Jamal", "Yuki", "Fatima", "Nia", "Tariq", "Sami", "Lucia", "Arjun", "Maya",
];
/** Two different names. */
function twoNames(r: Rng): [string, string] {
  const n = r.pick(NAMES);
  let m = r.pick(NAMES);
  while (m === n) m = r.pick(NAMES);
  return [n, m];
}

// Number names, 0–999. US English without "and"; Spanish with its irregular hundreds.
const EN_SMALL = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const ES_SMALL = [
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince",
  "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco",
  "veintiséis", "veintisiete", "veintiocho", "veintinueve",
];
const ES_TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const ES_HUNDREDS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];
function enWords(n: number): string {
  if (n < 20) return EN_SMALL[n];
  if (n < 100) return EN_TENS[Math.floor(n / 10)] + (n % 10 ? `-${EN_SMALL[n % 10]}` : "");
  const rest = n % 100;
  return `${EN_SMALL[Math.floor(n / 100)]} hundred${rest ? ` ${enWords(rest)}` : ""}`;
}
function esWords(n: number): string {
  if (n < 30) return ES_SMALL[n];
  if (n < 100) return ES_TENS[Math.floor(n / 10)] + (n % 10 ? ` y ${ES_SMALL[n % 10]}` : "");
  if (n === 100) return "cien";
  const rest = n % 100;
  return ES_HUNDREDS[Math.floor(n / 100)] + (rest ? ` ${esWords(rest)}` : "");
}
const words = (n: number, locale: Locale) => (locale === "es" ? esWords(n) : enWords(n));

const PLACE_W = {
  hundred: [["hundred", "hundreds"], ["centena", "centenas"]],
  ten: [["ten", "tens"], ["decena", "decenas"]],
  one: [["one", "ones"], ["unidad", "unidades"]],
} as const;
/** "1 ten", "3 tens", "1 decena", "3 decenas". */
function many(n: number, w: keyof typeof PLACE_W, locale: Locale) {
  const [en, es] = PLACE_W[w];
  const k = n === 1 ? 0 : 1;
  return `${n} ${tr(locale, en[k], es[k])}`;
}
/** "3 hundreds, 0 tens and 6 ones". */
const place = (h: number, t: number, o: number, locale: Locale) => `${many(h, "hundred", locale)}, ${many(t, "ten", locale)} ${tr(locale, "and", "y")} ${many(o, "one", locale)}`;
const tensOnes = (t: number, o: number, locale: Locale) => `${many(t, "ten", locale)} ${tr(locale, "and", "y")} ${many(o, "one", locale)}`;

/** A story with numbers in order of appearance, so a test can read them back. */
export type Story = {
  kind: string;
  pic: string;
  /** What the picture shows, for the alt text. */
  what: Pair;
  en: (x: readonly number[], n: string, m: string) => string;
  es: (x: readonly number[], n: string, m: string) => string;
};

// Kindergarten stories: add to / put together, or take from. Both numbers are at least 2.
export const STORY_10: readonly Story[] = [
  { kind: "add", pic: "🦆", what: ["Ducks", "Patos"], en: ([a, b], n) => `${n} sees ${a} ducks. Then ${b} more ducks come. How many ducks now?`, es: ([a, b], n) => `${n} ve ${a} patos. Luego llegan ${b} patos más. ¿Cuántos patos hay ahora?` },
  { kind: "add", pic: "🐸", what: ["Frogs", "Ranas"], en: ([a, b]) => `${a} frogs sit on a log. Then ${b} more hop on. How many frogs now?`, es: ([a, b]) => `Hay ${a} ranas en un tronco. Luego suben ${b} ranas más. ¿Cuántas ranas hay ahora?` },
  { kind: "add", pic: "⚽", what: ["Soccer balls", "Balones"], en: ([a, b], n) => `${n} has ${a} soccer balls. ${n} gets ${b} more. How many balls now?`, es: ([a, b], n) => `${n} tiene ${a} balones. Le dan ${b} balones más. ¿Cuántos balones tiene ahora?` },
  { kind: "add", pic: "🥁", what: ["A drum", "Un tambor"], en: ([a, b]) => `${a} kids play drums. Then ${b} more kids join. How many kids play now?`, es: ([a, b]) => `${a} niños tocan el tambor. Luego se unen ${b} niños más. ¿Cuántos niños tocan ahora?` },
  { kind: "add", pic: "⭐", what: ["A star", "Una estrella"], en: ([a, b], n) => `${n} sees ${a} stars. Then ${n} sees ${b} more. How many stars in all?`, es: ([a, b], n) => `${n} ve ${a} estrellas. Luego ve ${b} estrellas más. ¿Cuántas estrellas ve en total?` },
  { kind: "add", pic: "🍪", what: ["Cookies", "Galletas"], en: ([a, b], n) => `${n} bakes ${a} cookies. Then ${n} bakes ${b} more. How many cookies now?`, es: ([a, b], n) => `${n} hornea ${a} galletas. Luego hornea ${b} galletas más. ¿Cuántas galletas hay ahora?` },
  { kind: "add", pic: "🖍️", what: ["Crayons", "Crayones"], en: ([a, b], n) => `${n} has ${a} red crayons and ${b} blue crayons. How many crayons?`, es: ([a, b], n) => `${n} tiene ${a} crayones rojos y ${b} crayones azules. ¿Cuántos crayones tiene?` },
  { kind: "add", pic: "🧩", what: ["A puzzle piece", "Una pieza de rompecabezas"], en: ([a, b], n) => `${n} finds ${a} puzzle pieces. Then ${n} finds ${b} more. How many pieces now?`, es: ([a, b], n) => `${n} encuentra ${a} piezas de rompecabezas. Luego encuentra ${b} más. ¿Cuántas piezas tiene ahora?` },
  { kind: "add", pic: "🍎", what: ["Apples", "Manzanas"], en: ([a, b], n) => `${n} picks ${a} apples. Then ${n} picks ${b} more. How many apples now?`, es: ([a, b], n) => `${n} recoge ${a} manzanas. Luego recoge ${b} manzanas más. ¿Cuántas manzanas tiene ahora?` },
  { kind: "add", pic: "🐟", what: ["Fish", "Peces"], en: ([a, b]) => `${a} fish swim in a tank. Then ${b} more fish go in. How many fish now?`, es: ([a, b]) => `Hay ${a} peces en una pecera. Luego ponen ${b} peces más. ¿Cuántos peces hay ahora?` },
  { kind: "take", pic: "🎈", what: ["Balloons", "Globos"], en: ([a, b], n) => `${n} has ${a} balloons. Then ${b} float away. How many are left?`, es: ([a, b], n) => `${n} tiene ${a} globos. Luego se van volando ${b} globos. ¿Cuántos globos le quedan?` },
  { kind: "take", pic: "🐦", what: ["Birds", "Pájaros"], en: ([a, b]) => `${a} birds sit in a tree. Then ${b} fly away. How many are left?`, es: ([a, b]) => `Hay ${a} pájaros en un árbol. Luego se van volando ${b}. ¿Cuántos pájaros quedan?` },
  { kind: "take", pic: "🍪", what: ["Cookies", "Galletas"], en: ([a, b], n) => `${n} has ${a} cookies. ${n} eats ${b} of them. How many are left?`, es: ([a, b], n) => `${n} tiene ${a} galletas. Se come ${b} galletas. ¿Cuántas galletas le quedan?` },
  { kind: "take", pic: "🚀", what: ["Rockets", "Cohetes"], en: ([a, b]) => `${a} rockets are ready. Then ${b} blast off. How many are still here?`, es: ([a, b]) => `Hay ${a} cohetes listos. Luego despegan ${b} cohetes. ¿Cuántos cohetes quedan?` },
  { kind: "take", pic: "🏀", what: ["Basketballs", "Pelotas de básquetbol"], en: ([a, b], n) => `${n} has ${a} basketballs. ${n} gives ${b} to friends. How many are left?`, es: ([a, b], n) => `${n} tiene ${a} pelotas de básquetbol. Les regala ${b} a sus amigos. ¿Cuántas pelotas le quedan?` },
  { kind: "take", pic: "🐞", what: ["Ladybugs", "Mariquitas"], en: ([a, b]) => `${a} ladybugs sit on a leaf. Then ${b} fly away. How many are left?`, es: ([a, b]) => `Hay ${a} mariquitas en una hoja. Luego se van volando ${b}. ¿Cuántas mariquitas quedan?` },
  { kind: "take", pic: "🖌️", what: ["Paintbrushes", "Pinceles"], en: ([a, b], n) => `${n} has ${a} paintbrushes out. ${n} puts ${b} away. How many are still out?`, es: ([a, b], n) => `${n} tiene ${a} pinceles afuera. Guarda ${b} pinceles. ¿Cuántos pinceles quedan afuera?` },
  { kind: "take", pic: "🥞", what: ["Pancakes", "Panqueques"], en: ([a, b], n) => `There are ${a} pancakes on a plate. ${n} eats ${b}. How many are left?`, es: ([a, b], n) => `Hay ${a} panqueques en un plato. ${n} se come ${b}. ¿Cuántos panqueques quedan?` },
  { kind: "take", pic: "🙈", what: ["Hide-and-seek", "Las escondidas"], en: ([a, b]) => `${a} kids play hide-and-seek. Then ${b} go home. How many still play?`, es: ([a, b]) => `${a} niños juegan a las escondidas. Luego se van ${b} a su casa. ¿Cuántos siguen jugando?` },
  { kind: "take", pic: "🎤", what: ["A microphone", "Un micrófono"], en: ([a, b]) => `${a} kids sing on a stage. Then ${b} sit down. How many still sing?`, es: ([a, b]) => `${a} niños cantan en un escenario. Luego se sientan ${b}. ¿Cuántos siguen cantando?` },
];

// Grade 1 stories with three addends, each at least 2.
export const STORY_THREE: readonly Story[] = [
  { kind: "three", pic: "🐠", what: ["Fish", "Peces"], en: ([a, b, c], n) => `${n} sees ${a} red, ${b} blue and ${c} yellow fish. How many fish?`, es: ([a, b, c], n) => `${n} ve ${a} peces rojos, ${b} azules y ${c} amarillos. ¿Cuántos peces ve?` },
  { kind: "three", pic: "⚽", what: ["A soccer ball", "Un balón de fútbol"], en: ([a, b, c], n) => `${n} scores ${a} goals, then ${b}, then ${c}. How many goals in all?`, es: ([a, b, c], n) => `${n} anota ${a} goles, luego ${b} y luego ${c}. ¿Cuántos goles anota en total?` },
  { kind: "three", pic: "🎵", what: ["Music notes", "Notas musicales"], en: ([a, b, c]) => `A band plays ${a} songs, then ${b}, then ${c}. How many songs?`, es: ([a, b, c]) => `Una banda toca ${a} canciones, luego ${b} y luego ${c}. ¿Cuántas canciones toca?` },
  { kind: "three", pic: "🚀", what: ["A rocket", "Un cohete"], en: ([a, b, c], n) => `${n} counts ${a} stars, ${b} planets and ${c} moons. How many in all?`, es: ([a, b, c], n) => `${n} cuenta ${a} estrellas, ${b} planetas y ${c} lunas. ¿Cuántos son en total?` },
  { kind: "three", pic: "🍓", what: ["Strawberries", "Fresas"], en: ([a, b, c]) => `A bowl has ${a} strawberries, ${b} grapes and ${c} cherries. How many fruits?`, es: ([a, b, c]) => `Un tazón tiene ${a} fresas, ${b} uvas y ${c} cerezas. ¿Cuántas frutas hay?` },
  { kind: "three", pic: "🎨", what: ["A paint palette", "Una paleta de pintura"], en: ([a, b, c], n) => `${n} paints ${a} suns, ${b} trees and ${c} flowers. How many pictures?`, es: ([a, b, c], n) => `${n} pinta ${a} soles, ${b} árboles y ${c} flores. ¿Cuántos dibujos pinta?` },
  { kind: "three", pic: "🐶", what: ["A dog", "Un perro"], en: ([a, b, c]) => `A shelter has ${a} dogs, ${b} cats and ${c} rabbits. How many pets?`, es: ([a, b, c]) => `Un refugio tiene ${a} perros, ${b} gatos y ${c} conejos. ¿Cuántas mascotas hay?` },
  { kind: "three", pic: "📚", what: ["Books", "Libros"], en: ([a, b, c], n) => `${n} reads ${a} books, then ${b}, then ${c}. How many books?`, es: ([a, b, c], n) => `${n} lee ${a} libros, luego ${b} y luego ${c}. ¿Cuántos libros lee?` },
  { kind: "three", pic: "🏀", what: ["A basketball", "Un balón de básquetbol"], en: ([a, b, c], n) => `${n} makes ${a} baskets, then ${b}, then ${c}. How many baskets?`, es: ([a, b, c], n) => `${n} encesta ${a} veces, luego ${b} y luego ${c}. ¿Cuántas veces encesta?` },
  { kind: "three", pic: "🐚", what: ["A shell", "Una concha"], en: ([a, b, c], n) => `${n} finds ${a} shells, ${b} rocks and ${c} sticks. How many things?`, es: ([a, b, c], n) => `${n} encuentra ${a} conchas, ${b} piedras y ${c} palitos. ¿Cuántas cosas encuentra?` },
];

// Grade 2 stories within 100. The kind names the situation; x lists the numbers in the order they appear.
export const STORY_100: readonly Story[] = [
  { kind: "add-to", pic: "🎮", what: ["A video game", "Un videojuego"], en: ([a, b], n) => `${n} has ${a} points in a game. ${n} wins ${b} more points. How many points now?`, es: ([a, b], n) => `${n} tiene ${a} puntos en un juego. Gana ${b} puntos más. ¿Cuántos puntos tiene ahora?` },
  { kind: "add-to", pic: "🐔", what: ["A chicken", "Una gallina"], en: ([a, b]) => `A farm has ${a} chickens. The farm gets ${b} more. How many chickens now?`, es: ([a, b]) => `Una granja tiene ${a} gallinas. Llegan ${b} gallinas más. ¿Cuántas gallinas hay ahora?` },
  { kind: "add-to", pic: "📚", what: ["Books", "Libros"], en: ([a, b]) => `The library has ${a} new books. It gets ${b} more. How many new books now?`, es: ([a, b]) => `La biblioteca tiene ${a} libros nuevos. Recibe ${b} más. ¿Cuántos libros nuevos tiene ahora?` },
  { kind: "put-together", pic: "🎵", what: ["Music notes", "Notas musicales"], en: ([a, b]) => `A choir has ${a} girls and ${b} boys. How many singers in all?`, es: ([a, b]) => `Un coro tiene ${a} niñas y ${b} niños. ¿Cuántos cantantes hay en total?` },
  { kind: "put-together", pic: "📿", what: ["Beads", "Cuentas"], en: ([a, b], n) => `${n} has ${a} red beads and ${b} blue beads. How many beads in all?`, es: ([a, b], n) => `${n} tiene ${a} cuentas rojas y ${b} cuentas azules. ¿Cuántas cuentas tiene en total?` },
  { kind: "put-together", pic: "🍪", what: ["Cookies", "Galletas"], en: ([a, b]) => `A baker makes ${a} cookies and ${b} muffins. How many treats in all?`, es: ([a, b]) => `Un panadero hace ${a} galletas y ${b} pastelitos. ¿Cuántos postres hace en total?` },
  { kind: "take-from", pic: "🚀", what: ["A rocket", "Un cohete"], en: ([a, b], n) => `${n} has ${a} space stickers. ${n} gives ${b} to friends. How many are left?`, es: ([a, b], n) => `${n} tiene ${a} calcomanías del espacio. Les regala ${b} a sus amigos. ¿Cuántas le quedan?` },
  { kind: "take-from", pic: "🐦", what: ["A bird", "Un pájaro"], en: ([a, b]) => `There are ${a} birds at the lake. Then ${b} fly away. How many are left?`, es: ([a, b]) => `Hay ${a} pájaros en el lago. Luego se van volando ${b}. ¿Cuántos pájaros quedan?` },
  { kind: "take-from", pic: "⚽", what: ["A soccer ball", "Un balón de fútbol"], en: ([a, b]) => `A coach sets out ${a} cones. Then ${b} are put away. How many are still out?`, es: ([a, b]) => `Una entrenadora pone ${a} conos. Luego guarda ${b}. ¿Cuántos conos quedan afuera?` },
  { kind: "change-add", pic: "🐚", what: ["A shell", "Una concha"], en: ([a, c], n) => `${n} had ${a} shells. ${n} found some more. Now ${n} has ${c}. How many did ${n} find?`, es: ([a, c], n) => `${n} tenía ${a} conchas. Encontró algunas más. Ahora tiene ${c}. ¿Cuántas encontró?` },
  { kind: "change-add", pic: "🎸", what: ["A guitar", "Una guitarra"], en: ([a, c]) => `A band knows ${a} songs. It learns some new ones. Now it knows ${c}. How many new songs?`, es: ([a, c]) => `Una banda sabe ${a} canciones. Aprende algunas nuevas. Ahora sabe ${c}. ¿Cuántas canciones nuevas aprendió?` },
  { kind: "change-take", pic: "🧁", what: ["A cupcake", "Un pastelito"], en: ([a, c]) => `A bake sale had ${a} cupcakes. Some were sold. Now ${c} are left. How many were sold?`, es: ([a, c]) => `En una venta había ${a} pastelitos. Vendieron algunos. Ahora quedan ${c}. ¿Cuántos vendieron?` },
  { kind: "change-take", pic: "🎈", what: ["Balloons", "Globos"], en: ([a, c], n) => `${n} had ${a} balloons for a party. Some popped. Now ${c} are left. How many popped?`, es: ([a, c], n) => `${n} tenía ${a} globos para una fiesta. Algunos se reventaron. Ahora quedan ${c}. ¿Cuántos se reventaron?` },
  { kind: "start-add", pic: "🃏", what: ["A card", "Una tarjeta"], en: ([b, c], n) => `${n} had some cards. Then ${n} got ${b} more. Now ${n} has ${c}. How many cards did ${n} have at first?`, es: ([b, c], n) => `${n} tenía algunas tarjetas. Luego le dieron ${b} más. Ahora tiene ${c}. ¿Cuántas tarjetas tenía al principio?` },
  { kind: "start-add", pic: "🐟", what: ["A fish", "Un pez"], en: ([b, c]) => `Some fish were in a pond. Then ${b} more were added. Now there are ${c}. How many were there at first?`, es: ([b, c]) => `Había algunos peces en un estanque. Luego agregaron ${b} más. Ahora hay ${c}. ¿Cuántos había al principio?` },
  { kind: "compare", pic: "📖", what: ["A book", "Un libro"], en: ([a, b], n, m) => `${n} read ${a} pages. ${m} read ${b} pages. How many more pages did ${n} read?`, es: ([a, b], n, m) => `${n} leyó ${a} páginas. ${m} leyó ${b} páginas. ¿Cuántas páginas más leyó ${n}?` },
  { kind: "compare", pic: "🏃", what: ["A runner", "Una persona corriendo"], en: ([a, b], n, m) => `${n} ran ${a} laps this month. ${m} ran ${b} laps. How many more laps did ${n} run?`, es: ([a, b], n, m) => `${n} corrió ${a} vueltas este mes. ${m} corrió ${b} vueltas. ¿Cuántas vueltas más corrió ${n}?` },
  // Lengths given in the same unit (2.MD.B.5): unit words in full, so a read-aloud says "inches", not "in".
  { kind: "compare", pic: "🎀", what: ["A ribbon", "Una cinta"], en: ([a, b]) => `A red ribbon is ${a} inches long. A blue ribbon is ${b} inches long. How many inches longer is the red ribbon?`, es: ([a, b]) => `Una cinta roja mide ${a} pulgadas. Una cinta azul mide ${b} pulgadas. ¿Cuántas pulgadas más larga es la cinta roja?` },
  { kind: "compare", pic: "🔗", what: ["A chain", "Una cadena"], en: ([a, b], n, m) => `${n}'s paper chain is ${a} centimeters long. ${m}'s is ${b} centimeters long. How many centimeters longer is ${n}'s chain?`, es: ([a, b], n, m) => `La cadena de papel de ${n} mide ${a} centímetros. La de ${m} mide ${b} centímetros. ¿Cuántos centímetros más larga es la cadena de ${n}?` },
  { kind: "fewer", pic: "🌻", what: ["A sunflower", "Un girasol"], en: ([a, d], n, m) => `${n} planted ${a} seeds. ${m} planted ${d} fewer. How many seeds did ${m} plant?`, es: ([a, d], n, m) => `${n} sembró ${a} semillas. ${m} sembró ${d} menos. ¿Cuántas semillas sembró ${m}?` },
  { kind: "fewer", pic: "🚀", what: ["A rocket", "Un cohete"], en: ([a, d]) => `A big rocket kit has ${a} parts. A small kit has ${d} fewer parts. How many parts are in the small kit?`, es: ([a, d]) => `Un kit grande de cohete tiene ${a} piezas. Un kit pequeño tiene ${d} piezas menos. ¿Cuántas piezas tiene el kit pequeño?` },
  { kind: "more", pic: "🖍️", what: ["Crayons", "Crayones"], en: ([a, d], n, m) => `${n} has ${a} crayons. ${m} has ${d} more than ${n}. How many crayons does ${m} have?`, es: ([a, d], n, m) => `${n} tiene ${a} crayones. ${m} tiene ${d} más que ${n}. ¿Cuántos crayones tiene ${m}?` },
  { kind: "more", pic: "🐧", what: ["A penguin", "Un pingüino"], en: ([a, d]) => `The zoo has ${a} penguins. It has ${d} more parrots than penguins. How many parrots does it have?`, es: ([a, d]) => `El zoológico tiene ${a} pingüinos. Tiene ${d} loros más que pingüinos. ¿Cuántos loros tiene?` },
  { kind: "add-take", pic: "🚌", what: ["A bus", "Un autobús"], en: ([a, b, c]) => `A bus has ${a} riders. At a stop, ${b} get on and ${c} get off. How many riders now?`, es: ([a, b, c]) => `Un autobús lleva ${a} pasajeros. En una parada suben ${b} y bajan ${c}. ¿Cuántos pasajeros hay ahora?` },
  { kind: "add-take", pic: "🎮", what: ["A video game", "Un videojuego"], en: ([a, b, c], n) => `${n} has ${a} points. ${n} wins ${b} points, then loses ${c}. How many points now?`, es: ([a, b, c], n) => `${n} tiene ${a} puntos. Gana ${b} puntos y luego pierde ${c}. ¿Cuántos puntos tiene ahora?` },
  { kind: "take-add", pic: "📚", what: ["Books", "Libros"], en: ([a, b, c]) => `The class library has ${a} books. Kids borrow ${b}. Then ${c} come back. How many books are there now?`, es: ([a, b, c]) => `La biblioteca del salón tiene ${a} libros. Los niños se llevan ${b}. Luego devuelven ${c}. ¿Cuántos libros hay ahora?` },
  { kind: "take-add", pic: "🐑", what: ["A sheep", "Una oveja"], en: ([a, b, c]) => `There are ${a} sheep in a field. Then ${b} go into the barn. Later ${c} come back out. How many are in the field now?`, es: ([a, b, c]) => `Hay ${a} ovejas en el campo. Luego entran ${b} al granero. Más tarde salen ${c}. ¿Cuántas ovejas hay en el campo ahora?` },
  { kind: "take-take", pic: "🍪", what: ["Cookies", "Galletas"], en: ([a, b, c], n) => `${n} baked ${a} cookies. ${n} gave away ${b}, then ${c} more. How many are left?`, es: ([a, b, c], n) => `${n} horneó ${a} galletas. Regaló ${b} y luego ${c} más. ¿Cuántas galletas le quedan?` },
  { kind: "take-take", pic: "🖍️", what: ["Markers", "Marcadores"], en: ([a, b, c], n, m) => `An art box has ${a} markers. ${n} takes out ${b}, and ${m} takes out ${c}. How many are still in the box?`, es: ([a, b, c], n, m) => `Una caja de arte tiene ${a} marcadores. ${n} saca ${b} y ${m} saca ${c}. ¿Cuántos quedan en la caja?` },
  { kind: "goal", pic: "🥫", what: ["A can of food", "Una lata de comida"], en: ([a, b, c]) => `The class got ${a} cans Monday and ${b} cans Tuesday. The goal is ${c} cans. How many more cans do they need?`, es: ([a, b, c]) => `La clase juntó ${a} latas el lunes y ${b} el martes. La meta es ${c} latas. ¿Cuántas latas más necesitan?` },
  { kind: "goal", pic: "🏃", what: ["A runner", "Una persona corriendo"], en: ([a, b, c], n) => `${n} ran ${a} laps Monday and ${b} laps Tuesday. The goal is ${c} laps. How many more laps does ${n} need?`, es: ([a, b, c], n) => `${n} corrió ${a} vueltas el lunes y ${b} el martes. Su meta es ${c} vueltas. ¿Cuántas vueltas más le faltan?` },
];

// Grade 2 equal rows (at most 5 rows of at most 5).
export const ROW_STORIES: readonly Story[] = [
  { kind: "rows", pic: "🪑", what: ["A chair", "Una silla"], en: ([r, c]) => `There are ${r} rows of chairs. Each row has ${c} chairs. How many chairs?`, es: ([r, c]) => `Hay ${r} filas de sillas. Cada fila tiene ${c} sillas. ¿Cuántas sillas hay?` },
  { kind: "rows", pic: "🧁", what: ["A muffin", "Un pastelito"], en: ([r, c]) => `A pan has ${r} rows of muffins. Each row has ${c}. How many muffins?`, es: ([r, c]) => `Un molde tiene ${r} filas de pastelitos. Cada fila tiene ${c}. ¿Cuántos pastelitos hay?` },
  { kind: "rows", pic: "🌱", what: ["A plant", "Una planta"], en: ([r, c]) => `A garden has ${r} rows of plants. Each row has ${c} plants. How many plants?`, es: ([r, c]) => `Un huerto tiene ${r} hileras de plantas. Cada hilera tiene ${c} plantas. ¿Cuántas plantas hay?` },
  { kind: "rows", pic: "⭐", what: ["A star", "Una estrella"], en: ([r, c]) => `A poster has ${r} rows of stars. Each row has ${c} stars. How many stars?`, es: ([r, c]) => `Un póster tiene ${r} filas de estrellas. Cada fila tiene ${c} estrellas. ¿Cuántas estrellas hay?` },
  { kind: "rows", pic: "🍪", what: ["Cookies", "Galletas"], en: ([r, c]) => `A tray has ${r} rows of cookies. Each row has ${c}. How many cookies?`, es: ([r, c]) => `Una bandeja tiene ${r} filas de galletas. Cada fila tiene ${c}. ¿Cuántas galletas hay?` },
  { kind: "rows", pic: "🎺", what: ["A trumpet", "Una trompeta"], en: ([r, c]) => `The band stands in ${r} rows. Each row has ${c} players. How many players?`, es: ([r, c]) => `La banda se forma en ${r} filas. Cada fila tiene ${c} músicos. ¿Cuántos músicos hay?` },
  { kind: "rows", pic: "🏢", what: ["A building", "Un edificio"], en: ([r, c]) => `A building has ${r} rows of windows. Each row has ${c}. How many windows?`, es: ([r, c]) => `Un edificio tiene ${r} filas de ventanas. Cada fila tiene ${c}. ¿Cuántas ventanas hay?` },
  { kind: "rows", pic: "🥚", what: ["An egg", "Un huevo"], en: ([r, c]) => `A box has ${r} rows of eggs. Each row has ${c}. How many eggs?`, es: ([r, c]) => `Una caja tiene ${r} filas de huevos. Cada fila tiene ${c}. ¿Cuántos huevos hay?` },
];

function storyText(s: Story, x: readonly number[], n: string, m: string, locale: Locale) {
  return tr(locale, s.en(x, n, m), s.es(x, n, m));
}

// ---- Shapes (a hand-written bank: draft until a teacher reviews it) ----

export type BankChoice = { t: Pair; pic?: string; why?: string };
export type ShapeEntry = {
  q: Pair;
  pic?: string;
  alt?: Pair;
  /** The first choice is the key; the others carry the misconception they show. Shuffled per seed. */
  a: readonly BankChoice[];
  /** Hint 1 (a nudge) and hint 3 (the first step). Hint 2 comes from the level. */
  h: readonly [Pair, Pair];
  s: readonly Pair[];
};
export type ShapeLevel = { strat: Pair; seconds: number; items: readonly ShapeEntry[] };
const ch = (en: string, es: string, why?: string, pic?: string): BankChoice => ({ t: [en, es], ...(why ? { why } : {}), ...(pic ? { pic } : {}) });
const TRI = (why?: string, pic?: string) => ch("Triangle", "Triángulo", why, pic);
const SQU = (why?: string, pic?: string) => ch("Square", "Cuadrado", why, pic);
const CIR = (why?: string, pic?: string) => ch("Circle", "Círculo", why, pic);
const REC = (why?: string, pic?: string) => ch("Rectangle", "Rectángulo", why, pic);
const SPH = (why?: string, pic?: string) => ch("Sphere", "Esfera", why, pic);
const CUB = (why?: string, pic?: string) => ch("Cube", "Cubo", why, pic);
const CYL = (why?: string, pic?: string) => ch("Cylinder", "Cilindro", why, pic);
const CON = (why?: string, pic?: string) => ch("Cone", "Cono", why, pic);
const NAMES_MIX = "mixed-up-shape-names";
const SOLID_MIX = "mixed-up-solid-names";
const FLAT_SOLID = "mixed-up-flat-and-solid";
const RED: Pair = ["A red shape", "Una figura roja"];
const GREEN: Pair = ["A green shape", "Una figura verde"];
const BLUE: Pair = ["A blue shape", "Una figura azul"];
const BILL: Pair = ["A dollar bill", "Un billete de dólar"];
const BALL: Pair = ["A soccer ball", "Un balón de fútbol"];
const DIE: Pair = ["A game die", "Un dado de juego"];
const CAN: Pair = ["A can of food", "Una lata de comida"];
const WHAT_SHAPE: Pair = ["What shape is this?", "¿Qué figura es esta?"];
const SIDES_Q: Pair = ["How many sides does this shape have?", "¿Cuántos lados tiene esta figura?"];
const CORNERS_Q: Pair = ["How many corners does this shape have?", "¿Cuántas esquinas tiene esta figura?"];
const TOUCH_SIDES: Pair = ["Touch each side as you count.", "Toca cada lado mientras cuentas."];
const CORNER_IS: Pair = ["A corner is where two sides meet.", "Una esquina es donde se juntan dos lados."];
const CYL_STEP: Pair = ["Two flat circles and a curved side: a cylinder.", "Dos círculos planos y un lado curvo: un cilindro."];
const CUBE_STEP: Pair = ["6 square faces: a cube.", "6 caras cuadradas: un cubo."];

export const SHAPES: readonly ShapeLevel[] = [
  {
    strat: ["Look at the sides and the corners.", "Mira los lados y las esquinas."],
    seconds: 8,
    items: [
      { q: WHAT_SHAPE, pic: "🔺", alt: RED, a: [TRI(), SQU(NAMES_MIX), CIR(NAMES_MIX)], h: [["Count the sides.", "Cuenta los lados."], ["It has 3 straight sides.", "Tiene 3 lados rectos."]], s: [["3 sides and 3 corners make a triangle.", "3 lados y 3 esquinas forman un triángulo."]] },
      { q: WHAT_SHAPE, pic: "🟩", alt: GREEN, a: [SQU(), TRI(NAMES_MIX), CIR(NAMES_MIX)], h: [["Count the sides.", "Cuenta los lados."], ["It has 4 sides, all the same length.", "Tiene 4 lados, todos del mismo largo."]], s: [["4 equal sides and 4 square corners make a square.", "4 lados iguales y 4 esquinas rectas forman un cuadrado."]] },
      { q: WHAT_SHAPE, pic: "🔵", alt: BLUE, a: [CIR(), SQU(NAMES_MIX), TRI(NAMES_MIX)], h: [["Look for corners.", "Busca esquinas."], ["It is round. It has no corners.", "Es redonda. No tiene esquinas."]], s: [["Round with no corners: a circle.", "Redonda y sin esquinas: un círculo."]] },
      { q: SIDES_Q, pic: "🔺", alt: RED, a: [ch("3", "3"), ch("4", "4", "miscounted-sides"), ch("5", "5", "miscounted-sides")], h: [TOUCH_SIDES, ["Start at the top corner and go around.", "Empieza en la esquina de arriba y da la vuelta."]], s: [["This triangle has 3 sides.", "Este triángulo tiene 3 lados."]] },
      { q: CORNERS_Q, pic: "🟩", alt: GREEN, a: [ch("4", "4"), ch("3", "3", "miscounted-corners"), ch("5", "5", "miscounted-corners")], h: [CORNER_IS, ["Start at one corner and go around.", "Empieza en una esquina y da la vuelta."]], s: [["This square has 4 corners.", "Este cuadrado tiene 4 esquinas."]] },
      { q: ["How many corners does a circle have?", "¿Cuántas esquinas tiene un círculo?"], pic: "🔵", alt: BLUE, a: [ch("0", "0"), ch("1", "1", "thought-a-circle-has-corners"), ch("4", "4", "thought-a-circle-has-corners")], h: [["Run your finger around the edge.", "Pasa el dedo por el borde."], ["A corner is where two straight sides meet.", "Una esquina es donde se juntan dos lados rectos."]], s: [["A circle is round. It has 0 corners.", "Un círculo es redondo. Tiene 0 esquinas."]] },
      { q: ["What shape is a dollar bill?", "¿Qué forma tiene un billete de dólar?"], pic: "💵", alt: BILL, a: [REC(), CIR(NAMES_MIX), TRI(NAMES_MIX)], h: [["Count its sides and corners.", "Cuenta sus lados y esquinas."], ["It has 4 sides. Two are long and two are short.", "Tiene 4 lados. Dos son largos y dos son cortos."]], s: [["It has 4 sides and 4 square corners.", "Tiene 4 lados y 4 esquinas rectas."], ["Two long sides and two short sides: a rectangle.", "Dos lados largos y dos cortos: un rectángulo."]] },
      { q: ["What shape is this door?", "¿Qué forma tiene esta puerta?"], pic: "🚪", alt: ["A door", "Una puerta"], a: [REC(), TRI(NAMES_MIX), CIR(NAMES_MIX)], h: [["Count its sides.", "Cuenta sus lados."], ["It has 4 sides and 4 square corners.", "Tiene 4 lados y 4 esquinas rectas."]], s: [["Two long sides and two short sides: a rectangle.", "Dos lados largos y dos cortos: un rectángulo."]] },
      { q: ["What shape is this cookie?", "¿Qué forma tiene esta galleta?"], pic: "🍪", alt: ["A cookie", "Una galleta"], a: [CIR(), SQU(NAMES_MIX), TRI(NAMES_MIX)], h: [["Does it have any corners?", "¿Tiene esquinas?"], ["It is round all the way around.", "Es redonda por todos lados."]], s: [["Round with no corners: a circle.", "Redonda y sin esquinas: un círculo."]] },
      { q: ["Which shape has 3 sides?", "¿Qué figura tiene 3 lados?"], a: [TRI(undefined, "🔺"), SQU("miscounted-sides", "🟩"), CIR(NAMES_MIX, "🔵")], h: [["Count the sides of each shape.", "Cuenta los lados de cada figura."], ["A circle has no straight sides.", "Un círculo no tiene lados rectos."]], s: [["A triangle has 3 sides.", "Un triángulo tiene 3 lados."]] },
      { q: ["Which shape has no corners?", "¿Qué figura no tiene esquinas?"], a: [CIR(undefined, "🔵"), TRI("missed-the-corners", "🔺"), SQU("missed-the-corners", "🟩")], h: [["Look for a pointy corner on each shape.", "Busca una esquina en cada figura."], ["A triangle has 3 corners.", "Un triángulo tiene 3 esquinas."]], s: [["A circle is round. It has no corners.", "Un círculo es redondo. No tiene esquinas."]] },
      { q: ["Which shape has 4 equal sides?", "¿Qué figura tiene 4 lados iguales?"], a: [SQU(undefined, "🟩"), TRI("miscounted-sides", "🔺"), CIR(NAMES_MIX, "🔵")], h: [["Count the sides of each shape.", "Cuenta los lados de cada figura."], ["A triangle has 3 sides.", "Un triángulo tiene 3 lados."]], s: [["A square has 4 sides, all the same length.", "Un cuadrado tiene 4 lados del mismo largo."]] },
      { q: ["Is this shape a triangle?", "¿Esta figura es un triángulo?"], pic: "🔻", alt: ["A red shape pointing down", "Una figura roja que apunta hacia abajo"], a: [ch("Yes", "Sí"), ch("No", "No", "turning-changes-the-shape")], h: [["It is upside down. Count its sides.", "Está al revés. Cuenta sus lados."], ["It has 3 sides and 3 corners.", "Tiene 3 lados y 3 esquinas."]], s: [["3 sides and 3 corners: a triangle.", "3 lados y 3 esquinas: un triángulo."], ["Turning a shape does not change its name.", "Girar una figura no cambia su nombre."]] },
      { q: CORNERS_Q, pic: "🔺", alt: RED, a: [ch("3", "3"), ch("4", "4", "miscounted-corners"), ch("2", "2", "miscounted-corners")], h: [CORNER_IS, ["Start at the top corner and go around.", "Empieza en la esquina de arriba y da la vuelta."]], s: [["This triangle has 3 corners.", "Este triángulo tiene 3 esquinas."]] },
      { q: SIDES_Q, pic: "🟩", alt: GREEN, a: [ch("4", "4"), ch("3", "3", "miscounted-sides"), ch("5", "5", "miscounted-sides")], h: [TOUCH_SIDES, ["Start at the top side and go around.", "Empieza por el lado de arriba y da la vuelta."]], s: [["This square has 4 sides.", "Este cuadrado tiene 4 lados."]] },
      { q: ["How many corners does a dollar bill have?", "¿Cuántas esquinas tiene un billete de dólar?"], pic: "💵", alt: BILL, a: [ch("4", "4"), ch("2", "2", "miscounted-corners"), ch("6", "6", "miscounted-corners")], h: [CORNER_IS, ["Count the corners on the top first.", "Cuenta primero las esquinas de arriba."]], s: [["A dollar bill is a rectangle. It has 4 corners.", "Un billete de dólar es un rectángulo. Tiene 4 esquinas."]] },
    ],
  },
  {
    strat: ["Think about flat faces, round parts and points.", "Piensa en caras planas, partes redondas y puntas."],
    seconds: 10,
    items: [
      { q: ["What shape is this ball?", "¿Qué forma tiene este balón?"], pic: "⚽", alt: BALL, a: [SPH(), CIR(FLAT_SOLID), CUB(SOLID_MIX)], h: [["Is it flat, or can you hold it?", "¿Es plano o lo puedes sostener?"], ["A circle is flat. A ball is round all over.", "Un círculo es plano. Un balón es redondo por todos lados."]], s: [["Round all over and solid: a sphere.", "Redondo por todos lados y sólido: una esfera."]] },
      { q: ["What shape is this die?", "¿Qué forma tiene este dado?"], pic: "🎲", alt: DIE, a: [CUB(), SQU(FLAT_SOLID), CYL(SOLID_MIX)], h: [["Look at its flat faces.", "Mira sus caras planas."], ["Each face is a square, and it is solid.", "Cada cara es un cuadrado, y es sólido."]], s: [CUBE_STEP] },
      { q: ["What shape is this can?", "¿Qué forma tiene esta lata?"], pic: "🥫", alt: CAN, a: [CYL(), CON(SOLID_MIX), CIR(FLAT_SOLID)], h: [["Look at the top and the bottom.", "Mira la parte de arriba y la de abajo."], ["The top and bottom are flat circles.", "Arriba y abajo tiene círculos planos."]], s: [CYL_STEP] },
      { q: ["What shape is the part you hold?", "¿Qué forma tiene la parte que sostienes?"], pic: "🍦", alt: ["Soft ice cream", "Un helado suave"], a: [CON(), CYL(SOLID_MIX), TRI(FLAT_SOLID)], h: [["Look at the bottom. Where does it end?", "Mira la parte de abajo. ¿Dónde termina?"], ["It has a round top and comes to one point.", "Arriba es redonda y abajo termina en una punta."]], s: [["A round flat face and one point: a cone.", "Una cara plana redonda y una punta: un cono."]] },
      { q: ["What shape is Earth?", "¿Qué forma tiene la Tierra?"], pic: "🌍", alt: ["Planet Earth", "El planeta Tierra"], a: [SPH(), CIR(FLAT_SOLID), CUB(SOLID_MIX)], h: [["Earth is round. Is it flat?", "La Tierra es redonda. ¿Es plana?"], ["A circle is flat. Earth is round all over.", "Un círculo es plano. La Tierra es redonda por todos lados."]], s: [["Round all over: a sphere.", "Redonda por todos lados: una esfera."]] },
      { q: ["What shape is this piece of ice?", "¿Qué forma tiene este trozo de hielo?"], pic: "🧊", alt: ["A piece of ice", "Un trozo de hielo"], a: [CUB(), SPH(SOLID_MIX), SQU(FLAT_SOLID)], h: [["Look at its faces.", "Mira sus caras."], ["Each flat face is a square.", "Cada cara plana es un cuadrado."]], s: [CUBE_STEP] },
      { q: ["What shape is this drum?", "¿Qué forma tiene este tambor?"], pic: "🥁", alt: ["A drum", "Un tambor"], a: [CYL(), SPH(SOLID_MIX), CUB(SOLID_MIX)], h: [["Look at the top and the side.", "Mira la parte de arriba y el costado."], ["The top is a flat circle. The side is curved.", "Arriba tiene un círculo plano. El costado es curvo."]], s: [CYL_STEP] },
      { q: ["What shape is this roll of paper?", "¿Qué forma tiene este rollo de papel?"], pic: "🧻", alt: ["A roll of paper", "Un rollo de papel"], a: [CYL(), CON(SOLID_MIX), REC(FLAT_SOLID)], h: [["Look at its ends.", "Mira sus extremos."], ["Each end is a flat circle.", "Cada extremo es un círculo plano."]], s: [CYL_STEP] },
      { q: ["Is a square flat or solid?", "¿Un cuadrado es plano o sólido?"], pic: "🟩", alt: ["A green square", "Un cuadrado verde"], a: [ch("Flat", "Plano"), ch("Solid", "Sólido", FLAT_SOLID)], h: [["Could you hold it like a block?", "¿Lo podrías sostener como un bloque?"], ["A square is drawn on paper.", "Un cuadrado se dibuja en un papel."]], s: [["A square lies on paper. It is flat.", "Un cuadrado está en el papel. Es plano."]] },
      { q: ["Is a ball flat or solid?", "¿Un balón es plano o sólido?"], pic: "⚽", alt: BALL, a: [ch("Solid", "Sólido"), ch("Flat", "Plano", FLAT_SOLID)], h: [["Can you hold it in your hands?", "¿Lo puedes sostener en las manos?"], ["A ball is round all over. It is not a drawing.", "Un balón es redondo por todos lados. No es un dibujo."]], s: [["A ball is solid. It is a sphere.", "Un balón es sólido. Es una esfera."]] },
      { q: ["What shape is each flat face of this die?", "¿Qué forma tiene cada cara plana de este dado?"], pic: "🎲", alt: DIE, a: [SQU(), CIR("mixed-up-face-shapes"), TRI("mixed-up-face-shapes")], h: [["Look at one flat face.", "Mira una cara plana."], ["Count the sides of one face.", "Cuenta los lados de una cara."]], s: [["Each face has 4 equal sides: a square.", "Cada cara tiene 4 lados iguales: un cuadrado."]] },
      { q: ["What shape is the flat top of this can?", "¿Qué forma tiene la tapa plana de esta lata?"], pic: "🥫", alt: CAN, a: [CIR(), SQU("mixed-up-face-shapes"), CYL(FLAT_SOLID)], h: [["Look only at the top.", "Mira solo la tapa."], ["The top is round and flat.", "La tapa es redonda y plana."]], s: [["The top is a circle.", "La tapa es un círculo."]] },
      { q: ["Which shape can roll and also stack?", "¿Qué forma puede rodar y también apilarse?"], a: [CYL(undefined, "🥫"), SPH("thought-a-sphere-stacks", "⚽"), CUB("thought-a-cube-rolls", "🎲")], h: [["Which can roll? Which can stack?", "¿Cuál puede rodar? ¿Cuál se puede apilar?"], ["A ball rolls, but it does not stack.", "Un balón rueda, pero no se apila."]], s: [["A cylinder rolls on its side.", "Un cilindro rueda de lado."], ["It stacks on its flat ends.", "Se apila sobre sus extremos planos."]] },
      { q: ["Which shape has no flat faces?", "¿Qué forma no tiene caras planas?"], a: [SPH(undefined, "⚽"), CUB("missed-the-flat-faces", "🎲"), CYL("missed-the-flat-faces", "🥫")], h: [["Look for a flat part on each one.", "Busca una parte plana en cada una."], ["A die has flat faces.", "Un dado tiene caras planas."]], s: [["A sphere is round all over.", "Una esfera es redonda por todos lados."], ["It has no flat faces.", "No tiene caras planas."]] },
      { q: ["Which shape comes to a point?", "¿Qué forma termina en punta?"], a: [CON(undefined, "🍦"), CYL(SOLID_MIX, "🥫"), SPH(SOLID_MIX, "⚽")], h: [["Look at the end of each shape.", "Mira el extremo de cada forma."], ["A ball is round. It has no point.", "Un balón es redondo. No tiene punta."]], s: [["A cone has one flat circle and one point.", "Un cono tiene un círculo plano y una punta."]] },
    ],
  },
];

function fromShapes(r: Rng, level: ShapeLevel, locale: Locale): ItemBody {
  const e = r.pick(level.items);
  const order = r.shuffle(e.a.map((_, i) => i));
  const choices: Choice[] = order.map((i) => {
    const c = e.a[i];
    const label = t2(locale, c.t);
    return { label, say: label, ...(c.pic ? { picture: c.pic } : {}), ...(c.why ? { why: c.why } : {}) };
  });
  const text = t2(locale, e.q);
  return {
    prompt: [text],
    say: text,
    ...(e.pic && e.alt ? { picture: e.pic, alt: t2(locale, e.alt) } : {}),
    choices,
    input: "choices",
    answer: { kind: "choice", index: order.indexOf(0) },
    hints: [t2(locale, e.h[0]), t2(locale, level.strat), t2(locale, e.h[1])],
    steps: e.s.map((p) => t2(locale, p)),
    seconds: level.seconds,
  };
}

// ---- Measuring ----

type Thing = { pic: string; en: string; es: string; f: boolean; inch: [number, number]; cm: [number, number] };
const THINGS: readonly Thing[] = [
  { pic: "✏️", en: "pencil", es: "lápiz", f: false, inch: [4, 7], cm: [10, 15] },
  { pic: "🖍️", en: "crayon", es: "crayón", f: false, inch: [3, 4], cm: [8, 10] },
  { pic: "🥄", en: "spoon", es: "cuchara", f: true, inch: [5, 7], cm: [12, 15] },
  { pic: "🔑", en: "key", es: "llave", f: true, inch: [2, 3], cm: [5, 7] },
  { pic: "🥕", en: "carrot", es: "zanahoria", f: true, inch: [5, 8], cm: [12, 15] },
  { pic: "🖌️", en: "paintbrush", es: "pincel", f: false, inch: [6, 9], cm: [13, 15] },
  { pic: "🐛", en: "caterpillar", es: "oruga", f: true, inch: [1, 2], cm: [3, 5] },
  { pic: "🍌", en: "banana", es: "plátano", f: false, inch: [6, 8], cm: [13, 15] },
  { pic: "🎀", en: "ribbon", es: "cinta", f: true, inch: [3, 10], cm: [5, 15] },
  { pic: "🧦", en: "sock", es: "calcetín", f: false, inch: [6, 9], cm: [13, 15] },
  { pic: "📘", en: "book", es: "libro", f: false, inch: [8, 11], cm: [13, 15] },
];
const el = (t: Thing) => (t.f ? "la" : "el");
const un = (t: Thing) => (t.f ? "una" : "un");
/** Things long enough to line cubes along (1-inch cubes, so a cube count is the inch length). */
const CUBE_THINGS = THINGS.filter((t) => t.inch[1] >= 4);
/** Two different things, the first always the longer one in real life (its shortest beats the other's longest). */
function longerPair(r: Rng): [Thing, Thing] {
  const pairs = THINGS.flatMap((a) => THINGS.filter((b) => a.inch[0] > b.inch[1]).map((b) => [a, b] as [Thing, Thing]));
  return r.pick(pairs);
}
/** Sentences name units in full ("12 inches") so a read-aloud never says "12 in"; the short form sits only after the answer box. */
type Unit = { abbr: Pair; one: Pair; many: Pair; max: number; key: "inch" | "cm"; f: boolean };
const INCH: Unit = { abbr: ["in.", "pulg."], one: ["inch", "pulgada"], many: ["inches", "pulgadas"], max: 12, key: "inch", f: true };
const CM: Unit = { abbr: ["cm", "cm"], one: ["centimeter", "centímetro"], many: ["centimeters", "centímetros"], max: 15, key: "cm", f: false };
const unitWord = (u: Unit, n: number, locale: Locale) => t2(locale, n === 1 ? u.one : u.many);

// ---- Time ----

const hh = (h: number, m: number) => `${h}:${String(m).padStart(2, "0")}`;
/** "las 4" / "la 1": Spanish uses the singular for one o'clock. */
const las = (h: number) => (h === 1 ? "la" : "las");

type Event = { t: string; en: string; es: string; pm: boolean; when: Pair };
export const EVENTS: readonly Event[] = [
  { t: "7:15", en: "You eat breakfast at 7:15.", es: "Desayunas a las 7:15.", pm: false, when: ["Breakfast is in the morning.", "El desayuno es en la mañana."] },
  { t: "8:05", en: "School starts at 8:05.", es: "La escuela empieza a las 8:05.", pm: false, when: ["School starts in the morning.", "La escuela empieza en la mañana."] },
  { t: "10:45", en: "Morning recess is at 10:45.", es: "El recreo de la mañana es a las 10:45.", pm: false, when: ["Morning recess is before noon.", "El recreo de la mañana es antes del mediodía."] },
  { t: "12:20", en: "You eat lunch at 12:20.", es: "Almuerzas a las 12:20.", pm: true, when: ["Lunch at 12:20 is just after noon.", "El almuerzo a las 12:20 es justo después del mediodía."] },
  { t: "3:10", en: "School ends at 3:10.", es: "La escuela termina a las 3:10.", pm: true, when: ["School ends in the afternoon.", "La escuela termina en la tarde."] },
  { t: "4:25", en: "Soccer practice after school is at 4:25.", es: "La práctica de fútbol después de clases es a las 4:25.", pm: true, when: ["After school is in the afternoon.", "Después de clases es en la tarde."] },
  { t: "6:35", en: "You eat dinner at 6:35.", es: "Cenas a las 6:35.", pm: true, when: ["Dinner is in the evening.", "La cena es en la noche."] },
  { t: "8:40", en: "You go to bed at 8:40.", es: "Te acuestas a las 8:40.", pm: true, when: ["Bedtime is at night.", "La hora de dormir es en la noche."] },
  { t: "6:50", en: "You wake up at 6:50.", es: "Te despiertas a las 6:50.", pm: false, when: ["You wake up in the morning.", "Te despiertas en la mañana."] },
  { t: "6:15", en: "The sun rises at 6:15.", es: "El sol sale a las 6:15.", pm: false, when: ["The sun rises in the morning.", "El sol sale en la mañana."] },
  { t: "7:45", en: "The sun sets at 7:45.", es: "El sol se pone a las 7:45.", pm: true, when: ["The sun sets in the evening.", "El sol se pone en la tarde."] },
  { t: "1:30", en: "Story time after lunch is at 1:30.", es: "La hora del cuento después del almuerzo es a la 1:30.", pm: true, when: ["After lunch is in the afternoon.", "Después del almuerzo es en la tarde."] },
  { t: "7:25", en: "The school bus comes at 7:25.", es: "El autobús escolar pasa a las 7:25.", pm: false, when: ["The bus comes before school.", "El autobús pasa antes de la escuela."] },
  { t: "8:15", en: "A bedtime story starts at 8:15.", es: "El cuento antes de dormir empieza a las 8:15.", pm: true, when: ["Bedtime stories are at night.", "Los cuentos antes de dormir son en la noche."] },
];

// ---- Money ----

type Coin = { v: number; en: Pair; es: Pair; said: Pair };
const QUARTER: Coin = { v: 25, en: ["quarter", "quarters"], es: ["moneda de 25¢", "monedas de 25¢"], said: ["moneda de 25 centavos", "monedas de 25 centavos"] };
const DIME: Coin = { v: 10, en: ["dime", "dimes"], es: ["moneda de 10¢", "monedas de 10¢"], said: ["moneda de 10 centavos", "monedas de 10 centavos"] };
const NICKEL: Coin = { v: 5, en: ["nickel", "nickels"], es: ["moneda de 5¢", "monedas de 5¢"], said: ["moneda de 5 centavos", "monedas de 5 centavos"] };
const PENNY: Coin = { v: 1, en: ["penny", "pennies"], es: ["moneda de 1¢", "monedas de 1¢"], said: ["moneda de 1 centavo", "monedas de 1 centavo"] };
const COINS = [QUARTER, DIME, NICKEL, PENNY];
type Purse = [Coin, number][];
const join = (items: string[], locale: Locale) => (items.length === 1 ? items[0] : `${items.slice(0, -1).join(", ")} ${tr(locale, "and", "y")} ${items[items.length - 1]}`);
/** "2 quarters, 1 dime and 3 pennies"; spoken Spanish spells out "centavos". */
function purseText(p: Purse, locale: Locale, spoken = false) {
  return join(
    p.map(([c, n]) => `${n} ${locale === "es" ? (spoken ? c.said : c.es)[n === 1 ? 0 : 1] : c.en[n === 1 ? 0 : 1]}`),
    locale,
  );
}
/** Spanish lists coins by value: "estas monedas: 2 de 25¢, 1 de 10¢ y 3 de 1¢". */
const coinsEs = (p: Purse, spoken = false) =>
  `estas monedas: ${join(p.map(([c, n]) => `${n} de ${spoken ? `${c.v} ${c.v === 1 ? "centavo" : "centavos"}` : `${c.v}¢`}`), "es")}`;
const purseValue = (p: Purse) => p.reduce((s, [c, n]) => s + c.v * n, 0);
/** What a purse is worth to a child who thinks a nickel is 10¢ and a dime 5¢. */
const swappedValue = (p: Purse) => p.reduce((s, [c, n]) => s + (c === DIME ? NICKEL.v : c === NICKEL ? DIME.v : c.v) * n, 0);
const purseCount = (p: Purse) => p.reduce((s, [, n]) => s + n, 0);
/** Coin types in order of value, with any type that has no coins left out. */
const tidy = (p: Purse): Purse => COINS.map((c) => [c, p.filter(([x]) => x === c).reduce((s, [, n]) => s + n, 0)] as [Coin, number]).filter(([, n]) => n > 0);

/** "one $10 bill and 3 $1 bills"; spoken: "one 10-dollar bill and 3 one-dollar bills", so a voice reads it naturally. */
function billText(bills: [number, number][], locale: Locale, spoken = false) {
  const value = (v: number) => (locale === "es" ? (spoken ? `${v} ${v === 1 ? "dólar" : "dólares"}` : `$${v}`) : spoken ? `${v === 1 ? "one" : v}-dollar` : `$${v}`);
  return join(
    bills.map(([v, n]) =>
      locale === "es" ? (n === 1 ? `un billete de ${value(v)}` : `${n} billetes de ${value(v)}`) : n === 1 ? `one ${value(v)} bill` : `${n} ${value(v)} bills`,
    ),
    locale,
  );
}

// ---- Data ----

type Theme3 = { title: Pair; cats: readonly [Pair, Pair, Pair]; icons?: readonly [string, string, string] };
const THEMES3: readonly Theme3[] = [
  { title: ["Kids voted for a favorite pet.", "Los niños votaron por su mascota favorita."], cats: [["cats", "gatos"], ["dogs", "perros"], ["fish", "peces"]], icons: ["🐱", "🐶", "🐟"] },
  { title: ["Kids voted for a favorite fruit.", "Los niños votaron por su fruta favorita."], cats: [["apples", "manzanas"], ["bananas", "plátanos"], ["grapes", "uvas"]], icons: ["🍎", "🍌", "🍇"] },
  { title: ["Kids voted for a favorite sport.", "Los niños votaron por su deporte favorito."], cats: [["soccer", "fútbol"], ["swimming", "natación"], ["basketball", "básquetbol"]], icons: ["⚽", "🏊", "🏀"] },
  { title: ["Kids voted for an instrument to play.", "Los niños votaron por un instrumento para tocar."], cats: [["drums", "tambor"], ["piano", "piano"], ["guitar", "guitarra"]], icons: ["🥁", "🎹", "🎸"] },
  { title: ["Kids voted for a planet to visit.", "Los niños votaron por un planeta para visitar."], cats: [["Mars", "Marte"], ["Saturn", "Saturno"], ["Jupiter", "Júpiter"]] },
  { title: ["Kids voted for a paint color.", "Los niños votaron por un color de pintura."], cats: [["red", "rojo"], ["blue", "azul"], ["green", "verde"]], icons: ["🟥", "🟦", "🟩"] },
  { title: ["Kids voted for a rainy-day game.", "Los niños votaron por un juego para un día de lluvia."], cats: [["puzzles", "rompecabezas"], ["blocks", "bloques"], ["cards", "cartas"]], icons: ["🧩", "🧱", "🃏"] },
  { title: ["Kids voted for a snack.", "Los niños votaron por una merienda."], cats: [["popcorn", "palomitas"], ["yogurt", "yogur"], ["crackers", "galletas saladas"]] },
];
type Theme4 = { title: Pair; unit: Pair; cats: readonly [Pair, Pair, Pair, Pair] };
const THEMES4: readonly Theme4[] = [
  { title: ["Favorite fruit votes", "Votos por la fruta favorita"], unit: ["votes", "votos"], cats: [["apples", "manzanas"], ["pears", "peras"], ["grapes", "uvas"], ["plums", "ciruelas"]] },
  { title: ["Favorite pet votes", "Votos por la mascota favorita"], unit: ["votes", "votos"], cats: [["cats", "gatos"], ["dogs", "perros"], ["fish", "peces"], ["birds", "pájaros"]] },
  { title: ["Team points", "Puntos por equipo"], unit: ["points", "puntos"], cats: [["Red", "Rojo"], ["Blue", "Azul"], ["Green", "Verde"], ["Gold", "Dorado"]] },
  { title: ["Planet to visit votes", "Votos por el planeta para visitar"], unit: ["votes", "votos"], cats: [["Mars", "Marte"], ["Jupiter", "Júpiter"], ["Saturn", "Saturno"], ["Venus", "Venus"]] },
  { title: ["Instrument to learn votes", "Votos por el instrumento para aprender"], unit: ["votes", "votos"], cats: [["drums", "tambor"], ["piano", "piano"], ["guitar", "guitarra"], ["violin", "violín"]] },
  { title: ["Favorite color votes", "Votos por el color favorito"], unit: ["votes", "votos"], cats: [["red", "rojo"], ["blue", "azul"], ["green", "verde"], ["yellow", "amarillo"]] },
  { title: ["Recess game votes", "Votos por el juego del recreo"], unit: ["votes", "votos"], cats: [["soccer", "fútbol"], ["jump rope", "saltar la cuerda"], ["basketball", "básquetbol"], ["chess", "ajedrez"]] },
  { title: ["Favorite snack votes", "Votos por la merienda favorita"], unit: ["votes", "votos"], cats: [["popcorn", "palomitas"], ["fruit", "fruta"], ["yogurt", "yogur"], ["crackers", "galletas saladas"]] },
];

// ---- Equal shares ----

type Share = { sg: Pair; pl: Pair; one: Pair; f: boolean };
const SHARE: Record<2 | 3 | 4, Share> = {
  2: { sg: ["half", "mitad"], pl: ["halves", "mitades"], one: ["one half", "una mitad"], f: true },
  3: { sg: ["third", "tercio"], pl: ["thirds", "tercios"], one: ["one third", "un tercio"], f: false },
  4: { sg: ["fourth", "cuarto"], pl: ["fourths", "cuartos"], one: ["one fourth", "un cuarto"], f: false },
};
/** "one third", "2 thirds", "both halves", "all 4 quarters"; Spanish "un tercio", "2 tercios", "las 2 mitades". */
function shareWords(k: number, d: 2 | 3 | 4, locale: Locale, quarter = false) {
  const sh = SHARE[d];
  if (locale === "es") return k === 1 ? sh.one[1] : k === d ? `${sh.f ? "las" : "los"} ${d} ${sh.pl[1]}` : `${k} ${sh.pl[1]}`;
  const pl = quarter ? "quarters" : sh.pl[0];
  if (k === 1) return quarter ? "one quarter" : sh.one[0];
  return k === d ? (d === 2 ? "both halves" : `all ${d} ${pl}`) : `${k} ${pl}`;
}
/** The plural share name: "fourths" (or "quarters"), "cuartos". */
const sharePl = (d: 2 | 3 | 4, locale: Locale, quarter = false) => tr(locale, quarter ? "quarters" : SHARE[d].pl[0], SHARE[d].pl[1]);

/** Long, flat wholes the fraction bar stands for. `f`: feminine in Spanish. */
type Whole = { en: string; es: string; pl: Pair; f: boolean; pic?: string };
export const WHOLES: readonly Whole[] = [
  { en: "bar", es: "barra", pl: ["bars", "barras"], f: true },
  { en: "chocolate bar", es: "barra de chocolate", pl: ["chocolate bars", "barras de chocolate"], f: true, pic: "🍫" },
  { en: "ribbon", es: "cinta", pl: ["ribbons", "cintas"], f: true, pic: "🎀" },
  { en: "loaf of bread", es: "pan", pl: ["loaves of bread", "panes"], f: false, pic: "🥖" },
  { en: "waffle", es: "wafle", pl: ["waffles", "wafles"], f: false, pic: "🧇" },
  { en: "sandwich", es: "sándwich", pl: ["sandwiches", "sándwiches"], f: false, pic: "🥪" },
  { en: "log", es: "tronco", pl: ["logs", "troncos"], f: false, pic: "🪵" },
  { en: "sheet of paper", es: "hoja de papel", pl: ["sheets of paper", "hojas de papel"], f: true, pic: "📄" },
];
/** "the waffle" / "el wafle". */
const theWhole = (w: Whole, locale: Locale) => tr(locale, `the ${w.en}`, `${w.f ? "la" : "el"} ${w.es}`);
/** "the whole waffle" / "todo el wafle". */
const allOf = (w: Whole, locale: Locale) => tr(locale, `the whole ${w.en}`, `${w.f ? "toda la" : "todo el"} ${w.es}`);
/** Alt text for a shaded bar standing for a whole: what is drawn, never the share's name. */
function barAlt(w: Whole, d: number | null, shaded: number, locale: Locale) {
  const cut = d === null ? tr(locale, "cut into equal parts", "dividida en partes iguales") : tr(locale, `cut into ${d} equal parts`, `dividida en ${d} partes iguales`);
  const bar = w.pic ? tr(locale, `A ${w.en}, and a bar ${cut}.`, `${w.f ? "Una" : "Un"} ${w.es} y una barra ${cut}.`) : tr(locale, `A bar ${cut}.`, `Una barra ${cut}.`);
  const sh =
    shaded === 0
      ? ""
      : shaded === 1
        ? tr(locale, " 1 part is shaded.", " 1 parte está coloreada.")
        : tr(locale, ` ${shaded} parts are shaded.`, ` ${shaded} partes están coloreadas.`);
  return bar + sh;
}

type Ctx = { pic: string; what: Pair; f: boolean; split: Pair; use: Pair };
const SHARE_CTX: readonly Ctx[] = [
  { pic: "🥪", what: ["sandwich", "sándwich"], f: false, split: ["cuts", "corta"], use: ["eats 1 part", "Se come 1 parte"] },
  { pic: "🍕", what: ["pizza", "pizza"], f: true, split: ["cuts", "corta"], use: ["eats 1 part", "Se come 1 parte"] },
  { pic: "🎂", what: ["cake", "pastel"], f: false, split: ["cuts", "corta"], use: ["eats 1 part", "Se come 1 parte"] },
  { pic: "🌱", what: ["garden", "huerto"], f: false, split: ["splits", "divide"], use: ["plants beans in 1 part", "Siembra frijoles en 1 parte"] },
  { pic: "🎀", what: ["ribbon", "cinta"], f: true, split: ["cuts", "corta"], use: ["uses 1 part", "Usa 1 parte"] },
  { pic: "🍫", what: ["chocolate bar", "barra de chocolate"], f: true, split: ["breaks", "divide"], use: ["eats 1 part", "Se come 1 parte"] },
];

/** A count of the same addend: "4 + 4 + 4". */
const repeat = (k: number, v: number) => Array<number>(k).fill(v).join(" + ");
const plusWords = (s: string, locale: Locale) => s.replace(/ \+ /g, tr(locale, " plus ", " más "));
const dots = (groups: number[], crossed = 0): Visual => (crossed ? { kind: "dots", groups, crossed } : { kind: "dots", groups });

/**
 * Tens-first first step and worked lines for p ± q (q at least 10 and not a whole ten), else one line.
 * When the answer is exactly q's tens (67 − 37 = 30), "67 − 30 = 37" would show the answer and the
 * story's own numbers, so the hint counts up instead.
 */
function tensFirst(p: number, op: "+" | "−", q: number, locale: Locale) {
  const res = op === "+" ? p + q : p - q;
  const qt = q - (q % 10), qo = q % 10;
  const mid = op === "+" ? p + qt : p - qt;
  const up = tr(locale, `Count up from ${q} to ${p}.`, `Cuenta desde ${q} hasta ${p}.`);
  if (qt > 0 && qo > 0) return { hint: op === "−" && res === qt ? up : `${p} ${op} ${qt} = ${mid}`, steps: [`${p} ${op} ${qt} = ${mid}`, `${mid} ${op} ${qo} = ${res}`] };
  if (qt > 0) return { hint: tr(locale, `${q} is ${many(qt / 10, "ten", "en")}.`, `${q} son ${many(qt / 10, "ten", "es")}.`), steps: [`${p} ${op} ${q} = ${res}`] };
  return {
    hint: op === "+" ? tr(locale, `Start at ${p} and count on ${q}.`, `Empieza en ${p} y cuenta ${q} hacia adelante.`) : tr(locale, `Start at ${p} and count back ${q}.`, `Empieza en ${p} y cuenta ${q} hacia atrás.`),
    steps: [`${p} ${op} ${q} = ${res}`],
  };
}

export const MATH_K_2_MORE: Skill[] = [
  // ======================= Kindergarten =======================
  {
    id: "m.count.100",
    subject: "math",
    grade: "K",
    title: { en: "Count to 100 by ones and tens", es: "Contar hasta 100 de uno en uno y de diez en diez" },
    standard: "K.CC.A.1",
    prereqs: ["m.next.number"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const tens = level === 1 || (level === 3 && r.bool(0.3));
      let seq: number[], at: number;
      if (tens) {
        // From 0 to 100 by tens, with the blank anywhere after the first number.
        const first = r.int(0, 7);
        seq = [0, 1, 2, 3].map((k) => (first + k) * 10);
        at = r.int(1, 3);
      } else if (level === 2) {
        const ten = r.int(2, 10) * 10;
        // K counts to 100, so the run stops at 100.
        at = r.int(Math.max(1, ten - 97), 3);
        seq = [0, 1, 2, 3].map((k) => ten - at + k);
      } else {
        const start = r.int(1, 97);
        seq = [0, 1, 2, 3].map((k) => start + k);
        at = r.int(1, 3);
      }
      const key = seq[at], prev = seq[at - 1];
      const crossing = !tens && key % 10 === 0;
      const rev = Number(String(key).split("").reverse().join(""));
      const tags: (Tag | null)[] = tens
        ? [[prev + 1, "counted-by-ones"], [key + 10, "skipped-a-ten"], key >= 30 && key <= 90 ? [key / 10 + 10, "teen-for-tens"] : null, [prev, "repeated-last-number"]]
        : crossing
          ? [[key - 10, "went-back-to-the-ten"], [key + 10, "skipped-a-ten"], [key + 1, "skipped-a-number"], [prev, "repeated-last-number"]]
          : [[key + 1, "skipped-a-number"], key >= 10 && rev !== key ? [rev, "reversed-digits"] : [key + 10, "wrong-tens-digit"], [prev, "repeated-last-number"]];
      const instr = tens ? tr(locale, "Count by tens.", "Cuenta de diez en diez.") : tr(locale, "Count by ones.", "Cuenta de uno en uno.");
      const before = `${seq.slice(0, at).join(", ")}, `;
      const after = at < 3 ? `, ${seq.slice(at + 1).join(", ")}` : "";
      const heard = seq.map((v, k) => (k === at ? tr(locale, "blank", "espacio") : String(v))).join(", ");
      return {
        prompt: [`${instr} ${before}`, blank, ...(after ? [after] : [])],
        say: `${instr} ${heard}. ${tr(locale, "What number goes in the blank?", "¿Qué número va en el espacio?")}`,
        ...numberChoices(r, key, tags, 100, seq),
        hints: tens
          ? [
              tr(locale, "Each number is 10 more than the one before.", "Cada número es 10 más que el anterior."),
              tr(locale, "Count by tens out loud, starting at 10.", "Cuenta de diez en diez en voz alta, desde el 10."),
              tr(locale, `${prev} and 10 more.`, `${prev} y 10 más.`),
            ]
          : [
              tr(locale, "Say the numbers out loud.", "Di los números en voz alta."),
              crossing
                ? tr(locale, "After 9 ones, the tens go up by one.", "Después de 9 unidades, las decenas aumentan en uno.")
                : tr(locale, "Each number is 1 more than the one before.", "Cada número es 1 más que el anterior."),
              tr(locale, `${prev} and 1 more.`, `${prev} y 1 más.`),
            ],
        steps: [seq.join(", "), tr(locale, `The missing number is ${key}.`, `El número que falta es ${key}.`)],
        seconds: 6,
      };
    },
  },
  {
    id: "m.write.20",
    subject: "math",
    grade: "K",
    title: { en: "Write numbers 0 to 20", es: "Escribir números del 0 al 20" },
    standard: "K.CC.A.3",
    prereqs: ["m.count.20"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      if (level === 3) {
        const n = r.int(0, 20);
        const w = words(n, locale);
        const teen = n >= 11 && n <= 19;
        const rev = (n % 10) * 10 + Math.floor(n / 10);
        return {
          prompt: [tr(locale, `Write the number ${w}.`, `Escribe el número ${w}.`)],
          say: tr(locale, `Write the number ${w}.`, `Escribe el número ${w}.`),
          input: "keypad",
          answer: { kind: "number", value: n },
          wrong: misses(
            n,
            teen
              ? [[Number(`10${n - 10}`), "wrote-ten-and-ones-apart"], rev !== n ? [rev, "reversed-digits"] : null, n >= 13 ? [(n - 10) * 10, "teen-for-tens"] : null]
              : n === 20
                ? [[2, "dropped-the-zero"], [12, "teen-for-tens"]]
                : n === 10
                  ? [[1, "dropped-the-zero"], [11, "off-by-one"]]
                  : [[n + 1, "off-by-one"], [n - 1, "off-by-one"]],
          ),
          hints: [
            tr(locale, "Say the number out loud.", "Di el número en voz alta."),
            teen
              ? tr(locale, "Numbers from 11 to 19 are 10 and some more.", "Los números del 11 al 19 son 10 y algunos más.")
              : n === 20
                ? tr(locale, "Twenty is two tens.", "Veinte son dos decenas.")
                : n === 0
                  ? tr(locale, "Zero means none at all.", "Cero quiere decir nada.")
                  : tr(locale, "Count up to it on your fingers.", "Cuenta con los dedos hasta llegar a él."),
            teen
              ? tr(locale, `${cap(w)} is 10 and ${n - 10}.`, `${cap(w)} es 10 y ${n - 10}.`)
              : n === 20
                ? tr(locale, "Write the tens digit first.", "Escribe primero la cifra de las decenas.")
                : n === 0
                  ? tr(locale, "Zero is the number for no dots at all.", "Cero es el número para ningún punto.")
                  : tr(locale, "Hold up one finger for each number you say.", "Levanta un dedo por cada número que dices."),
          ],
          steps: [tr(locale, `${cap(w)} is written ${n}.`, `${cap(w)} se escribe ${n}.`)],
          seconds: 6,
        };
      }
      const n = level === 1 ? (r.bool(0.1) ? 0 : r.int(1, 10)) : r.int(11, 20);
      const two = n > 10;
      // Counters in ten-frames, or (for 1 and up) loose dots in rows of five.
      const asDots = n > 0 && r.bool(0.4);
      const rev = (n % 10) * 10 + Math.floor(n / 10);
      const write = tr(locale, `We write ${n}.`, `Escribimos ${n}.`);
      const count =
        n === 0
          ? [tr(locale, "There are no counters.", "No hay fichas."), write]
          : n === 1
            ? [asDots ? tr(locale, "There is 1 dot.", "Hay 1 punto.") : tr(locale, "There is 1 counter.", "Hay 1 ficha."), write]
            : [asDots ? tr(locale, `There are ${n} dots.`, `Hay ${n} puntos.`) : tr(locale, `There are ${n} counters.`, `Hay ${n} fichas.`), write];
      const rows = Math.floor(n / 5), rest = n % 5;
      const ask = asDots ? tr(locale, "How many dots? Write the number.", "¿Cuántos puntos hay? Escribe el número.") : tr(locale, "How many counters? Write the number.", "¿Cuántas fichas hay? Escribe el número.");
      const twoDigit: Tag[] = [n < 20 ? [Number(`10${n - 10}`), "wrote-ten-and-ones-apart"] : [2, "dropped-the-zero"], ...(rev !== n && n < 20 ? [[rev, "reversed-digits"] as Tag] : [])];
      const near: Tag[] = [[n + 1, "counted-one-twice"], [n - 1, "skipped-one"]];
      // Empty boxes exist only in a frame that is not full.
      const empty: Tag[] = asDots ? [] : two ? (n < 20 ? [[30 - n, "counted-empty-boxes"]] : []) : n < 10 ? [[10 - n, "counted-empty-boxes"]] : [];
      const look = asDots
        ? {
            visual: dots([n]),
            alt: tr(locale, "Dots in rows of five", "Puntos en filas de cinco"),
            hints: two
              ? [
                  tr(locale, "Each full row has 5 dots.", "Cada fila llena tiene 5 puntos."),
                  tr(locale, "Count the full rows by fives. Then count on.", "Cuenta las filas llenas de cinco en cinco. Luego sigue contando."),
                  tr(locale, "The first two rows make 10.", "Las dos primeras filas son 10."),
                ]
              : [
                  tr(locale, "Touch each dot once as you count.", "Toca cada punto una vez mientras cuentas."),
                  n > 5 ? tr(locale, "Count the top row, then the next row.", "Cuenta la fila de arriba y luego la siguiente.") : tr(locale, "There is only one row. Count it.", "Hay una sola fila. Cuéntala."),
                  n > 5 ? tr(locale, "The top row is full: 5. Count on from 5.", "La fila de arriba está llena: 5. Sigue contando desde 5.") : tr(locale, "Start at the left: 1, 2…", "Empieza por la izquierda: 1, 2…"),
                ],
            steps: two
              ? [
                  tr(locale, `${rows} rows of 5 make ${rows * 5}.`, `${rows} filas de 5 son ${rows * 5}.`),
                  ...(rest ? [tr(locale, `${rows * 5} and ${rest} more make ${n}.`, `${rows * 5} y ${rest} más son ${n}.`)] : []),
                  write,
                ]
              : count,
          }
        : {
            visual: two ? ({ kind: "ten-frame", filled: n, frames: 2 } as const) : ({ kind: "ten-frame", filled: n } as const),
            alt: two ? tr(locale, "Two ten-frames with counters", "Dos marcos de diez con fichas") : tr(locale, "A ten-frame. Some boxes may have counters.", "Un marco de diez. Algunas casillas pueden tener fichas."),
            hints: two
              ? [
                  tr(locale, "Look at the first frame. Is it full?", "Mira el primer marco. ¿Está lleno?"),
                  tr(locale, "A full frame is 10. Count on from 10.", "Un marco lleno es 10. Sigue contando desde 10."),
                  tr(locale, `The second frame has ${n - 10}.`, `El segundo marco tiene ${n - 10}.`),
                ]
              : [
                  tr(locale, "Touch each counter once as you count.", "Toca cada ficha una vez mientras cuentas."),
                  tr(locale, "Count the top row, then the bottom row.", "Cuenta la fila de arriba y luego la de abajo."),
                  n > 5
                    ? tr(locale, "The top row is full: 5. Count on from 5.", "La fila de arriba está llena: 5. Sigue contando desde 5.")
                    : tr(locale, "The bottom row is empty. Count the top row.", "La fila de abajo está vacía. Cuenta la fila de arriba."),
                ],
            steps: two ? [tr(locale, `10 and ${n - 10} more make ${n}.`, `10 y ${n - 10} más son ${n}.`), write] : count,
          };
      return {
        prompt: [ask],
        say: ask,
        ...look,
        markable: true,
        input: "keypad",
        answer: { kind: "number", value: n },
        wrong: misses(n, two ? [...twoDigit, ...near, ...empty] : [...near, ...empty]),
        seconds: two ? 10 : 8,
      };
    },
  },
  {
    id: "m.compare.groups",
    subject: "math",
    grade: "K",
    title: { en: "More, fewer or the same", es: "Más, menos o igual" },
    standard: "K.CC.C.6",
    prereqs: ["m.compare.10"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const more = level === 1 ? true : level === 2 ? false : r.bool();
      const a = r.int(1, 10);
      let b = a;
      if (!r.bool(level === 3 ? 0.25 : 0.15)) while (b === a) b = level === 3 ? Math.min(10, Math.max(1, a + r.pick([-1, 1]))) : r.int(1, 10);
      const same = a === b;
      const leftWins = more ? a > b : a < b;
      const index = same ? 2 : leftWins ? 0 : 1;
      const side = more ? "picked-fewer-for-more" : "picked-more-for-fewer";
      const base: Choice[] = [
        { label: tr(locale, "Left", "Izquierda"), say: tr(locale, "The group on the left", "El grupo de la izquierda"), picture: "⬅️" },
        { label: tr(locale, "Right", "Derecha"), say: tr(locale, "The group on the right", "El grupo de la derecha"), picture: "➡️" },
        { label: tr(locale, "Same", "Iguales"), say: tr(locale, "They are the same", "Son iguales"), picture: "⚖️" },
      ];
      const choices = base.map((c, i) => (i === index ? c : { ...c, why: same ? "missed-equal-groups" : i === 2 ? "said-same-when-different" : side }));
      const big = Math.max(a, b), small = Math.min(a, b);
      const winner = leftWins ? tr(locale, "left", "izquierda") : tr(locale, "right", "derecha");
      const ask = more ? tr(locale, "Which group has more dots?", "¿Qué grupo tiene más puntos?") : tr(locale, "Which group has fewer dots?", "¿Qué grupo tiene menos puntos?");
      return {
        prompt: [`${ask} ${tr(locale, "Or are they the same?", "¿O son iguales?")}`],
        say: `${ask} ${tr(locale, "Or are they the same?", "¿O son iguales?")}`,
        // Not markable on purpose: tap-to-mark counters wrap groups onto new lines on a phone, and this
        // question needs the two groups side by side. The plain picture always keeps them in one row.
        visual: dots([a, b]),
        alt: tr(locale, "Two groups of dots, one on the left and one on the right", "Dos grupos de puntos, uno a la izquierda y otro a la derecha"),
        choices,
        input: "choices",
        answer: { kind: "choice", index },
        hints: [
          tr(locale, "Count each group.", "Cuenta cada grupo."),
          tr(locale, "Match dots one to one. Which group has extras?", "Empareja los puntos de uno en uno. ¿A qué grupo le sobran?"),
          tr(locale, `The left group has ${a}.`, `El grupo de la izquierda tiene ${a}.`),
        ],
        steps: same
          ? [tr(locale, `Left: ${a}. Right: ${b}.`, `Izquierda: ${a}. Derecha: ${b}.`), tr(locale, `${a} and ${b} are the same.`, `${a} y ${b} son iguales.`)]
          : [
              tr(locale, `Left: ${a}. Right: ${b}.`, `Izquierda: ${a}. Derecha: ${b}.`),
              more ? tr(locale, `${big} is more than ${small}.`, `${big} es mayor que ${small}.`) : tr(locale, `${small} is less than ${big}.`, `${small} es menor que ${big}.`),
              more ? tr(locale, `The ${winner} group has more.`, `El grupo de la ${winner} tiene más.`) : tr(locale, `The ${winner} group has fewer.`, `El grupo de la ${winner} tiene menos.`),
            ],
        seconds: 10,
      };
    },
  },
  {
    id: "m.teen.numbers",
    subject: "math",
    grade: "K",
    title: { en: "Teen numbers: ten and some ones", es: "Del 11 al 19: diez y algunas unidades" },
    standard: "K.NBT.A.1",
    prereqs: ["m.count.20", "m.write.20"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const k = r.int(1, 9), n = 10 + k;
      const askOnes = level === 1 || (level === 3 && r.bool());
      const pictured = level < 3;
      // The ten and the ones as two ten-frames, or as a group of 10 dots and a group of the ones.
      const frames = pictured && r.bool();
      const onesWord = tr(locale, k === 1 ? "1 one" : `${k} ones`, k === 1 ? "1 unidad" : `${k} unidades`);
      const choices = askOnes
        ? numberChoices(r, k, [[n, "gave-the-whole-number"], [1, "named-the-tens-digit"], [10, "gave-the-ten"]], 20)
        : numberChoices(r, n, [[Number(`10${k}`), "wrote-ten-and-ones-apart"], [k * 10 + 1, "reversed-digits"]], 200);
      const prompt: MathPart[] = pictured
        ? [askOnes ? tr(locale, `${n} is 10 and how many more?`, `¿${n} es 10 y cuántos más?`) : tr(locale, `10 and ${k} more make what number?`, `¿Qué número forman 10 y ${k} más?`)]
        : askOnes
          ? [`${n} = 10 + `, blank]
          : [`10 + ${k} = `, blank];
      return {
        prompt,
        say: askOnes ? (pictured ? tr(locale, `${n} is 10 and how many more?`, `¿${n} es 10 y cuántos más?`) : tr(locale, `${n} is 10 plus what?`, `¿${n} es 10 más cuánto?`)) : pictured ? tr(locale, `10 and ${k} more make what number?`, `¿Qué número forman 10 y ${k} más?`) : tr(locale, `10 plus ${k}`, `10 más ${k}`),
        ...(pictured
          ? frames
            ? { visual: { kind: "ten-frame" as const, filled: n, frames: 2 as const }, alt: tr(locale, "Two ten-frames with counters", "Dos marcos de diez con fichas"), markable: true }
            : { visual: dots([10, k]), alt: tr(locale, "A group of 10 dots and another group of dots", "Un grupo de 10 puntos y otro grupo de puntos"), markable: true }
          : {}),
        ...choices,
        hints: askOnes
          ? [
              pictured
                ? frames
                  ? tr(locale, "A full ten-frame is 10.", "Un marco de diez lleno es 10.")
                  : tr(locale, "The first group has 10 dots.", "El primer grupo tiene 10 puntos.")
                : tr(locale, `${n} is between 10 and 20.`, `${n} está entre 10 y 20.`),
              tr(locale, "The ones are what comes after the 10.", "Las unidades son lo que viene después del 10."),
              tr(locale, `Count on from 10 to ${n}. How many counts?`, `Cuenta desde 10 hasta ${n}. ¿Cuántos contaste?`),
            ]
          : [tr(locale, "Start at 10.", "Empieza en 10."), tr(locale, `Count on ${k} from 10.`, `Cuenta ${k} más desde 10.`), tr(locale, `The ones digit will be ${k}.`, `La cifra de las unidades será ${k}.`)],
        steps: askOnes
          ? [`${n} = 10 + ${k}`, tr(locale, `${n} is 10 and ${k} more.`, `${n} es 10 y ${k} más.`)]
          : [`10 + ${k} = ${n}`, tr(locale, `1 ten and ${onesWord} make ${n}.`, `1 decena y ${onesWord} forman ${n}.`)],
        seconds: 8,
      };
    },
  },
  {
    id: "m.decompose.10",
    subject: "math",
    grade: "K",
    title: { en: "Break apart numbers to 10", es: "Separar números hasta 10" },
    standard: "K.OA.A.3",
    prereqs: ["m.add.5"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      if (level === 1) {
        const n = r.int(3, 10), a = r.int(1, n - 1), b = n - a;
        return {
          prompt: [`${n} = ${a} + `, blank],
          say: tr(locale, `${n} is ${a} and how many more?`, `¿${n} es ${a} y cuántos más?`),
          visual: dots([a, b]),
          alt: tr(locale, "Two groups of dots", "Dos grupos de puntos"),
          markable: true,
          ...numberChoices(r, b, [[n, "gave-the-total"], [a, "repeated-the-first-part"]], 10),
          hints: [
            a === 1
              ? tr(locale, `${n} dots in all. 1 is in the first group.`, `${n} puntos en total. 1 está en el primer grupo.`)
              : tr(locale, `${n} dots in all. ${a} are in the first group.`, `${n} puntos en total. ${a} están en el primer grupo.`),
            tr(locale, `Count on from ${a} until you reach ${n}.`, `Cuenta desde ${a} hasta llegar a ${n}.`),
            tr(locale, `Say ${a}. Then count on: ${a + 1}, …`, `Di ${a}. Luego sigue contando: ${a + 1}, …`),
          ],
          steps: [`${a} + ${b} = ${n}`, tr(locale, `So ${n} = ${a} + ${b}.`, `Entonces, ${n} = ${a} + ${b}.`)],
          seconds: 8,
        };
      }
      const n = r.int(4, 10), a = r.int(1, n - 1), b = n - a;
      const pair = (x: number, y: number, why?: string): Choice => ({ label: `${x} + ${y}`, say: tr(locale, `${x} and ${y}`, `${x} y ${y}`), ...(why ? { why } : {}) });
      const cands: [number, number, string][] = [[a, b + 1, "sum-too-big"], b > 1 ? [a, b - 1, "sum-too-small"] : [a - 1, b, "sum-too-small"], [n, 1, "used-the-total-as-a-part"], [a + 1, b + 1, "sum-too-big"], [a + 1, b, "sum-too-big"]];
      // "1 + 10" and "10 + 1" are the same pair to a child who knows order does not matter: keep one.
      const pairKey = (x: number, y: number) => [x, y].sort((p, q) => p - q).join("+");
      const used = new Set([pairKey(a, b)]);
      const wrong = cands
        .filter(([x, y]) => {
          if (x < 1 || y < 1 || used.has(pairKey(x, y))) return false;
          used.add(pairKey(x, y));
          return true;
        })
        .slice(0, 3);
      const [wx, wy] = wrong[0];
      return {
        prompt: [tr(locale, `Which two numbers make ${n}?`, `¿Qué dos números forman ${n}?`)],
        say: tr(locale, `Which two numbers make ${n}?`, `¿Qué dos números forman ${n}?`),
        visual: dots([n]),
        alt: tr(locale, "A group of dots in rows of five", "Un grupo de puntos en filas de cinco"),
        markable: true,
        ...choose(r, pair(a, b), wrong.map(([x, y, why]) => pair(x, y, why))),
        hints: [
          tr(locale, `Split the ${n} dots into two groups.`, `Separa los ${n} puntos en dos grupos.`),
          tr(locale, `Add each pair. Find the one that makes ${n}.`, `Suma cada pareja. Busca la que forma ${n}.`),
          tr(locale, `${wx} + ${wy} = ${wx + wy}, not ${n}.`, `${wx} + ${wy} = ${wx + wy}, no ${n}.`),
        ],
        steps: [`${a} + ${b} = ${n}`],
        seconds: 12,
      };
    },
  },
  {
    id: "m.story.10",
    subject: "math",
    grade: "K",
    title: { en: "Add and take away stories to 10", es: "Problemas de sumar y quitar hasta 10" },
    standard: "K.OA.A.2",
    prereqs: ["m.add.5", "m.sub.5"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const add = level === 1 || (level === 3 && r.bool());
      const story = r.pick(STORY_10.filter((s) => s.kind === (add ? "add" : "take")));
      const a = add ? r.int(2, 8) : r.int(4, 10);
      const b = add ? r.int(2, 10 - a) : r.int(2, a - 1);
      const name = r.pick(NAMES);
      const text = storyText(story, [a, b], name, name, locale);
      const key = add ? a + b : a - b;
      const pictured = level < 3;
      const what = t2(locale, story.what);
      return {
        prompt: [text],
        say: text,
        picture: story.pic,
        ...(pictured ? { visual: add ? dots([a, b]) : dots([a], b), markable: true } : {}),
        alt: pictured
          ? add
            ? tr(locale, `${what}. Dots show the story.`, `${what}. Los puntos muestran el cuento.`)
            : tr(locale, `${what}. Dots show the story; some are crossed out.`, `${what}. Los puntos muestran el cuento; algunos están tachados.`)
          : what,
        ...numberChoices(
          r,
          key,
          add
            ? [[a - b, "subtracted-instead-of-added"], [Math.max(a, b), "counted-one-group"], [key + 1, "counted-one-twice"]]
            : // Without the picture there is nothing crossed out to count: giving the part taken is its own slip.
              [[a + b, "added-instead-of-subtracted"], [b, pictured ? "counted-crossed-out" : "gave-the-part-taken"], [a, "did-not-take-away"]],
          20,
        ),
        hints: [
          tr(locale, "Are groups joining, or are some going away?", "¿Se juntan grupos o se van algunos?"),
          add ? tr(locale, "Put the two groups together.", "Junta los dos grupos.") : tr(locale, `Start with ${a}. Take ${b} away.`, `Empieza con ${a}. Quita ${b}.`),
          add ? tr(locale, `Start at ${a}. Count on ${b} more.`, `Empieza en ${a}. Cuenta ${b} más.`) : tr(locale, `Count back ${b} from ${a}.`, `Cuenta ${b} hacia atrás desde ${a}.`),
        ],
        steps: add ? [tr(locale, "Joining groups means add.", "Juntar grupos es sumar."), `${a} + ${b} = ${key}`] : [tr(locale, "Taking away means subtract.", "Quitar es restar."), `${a} − ${b} = ${key}`],
        seconds: 45,
      };
    },
  },
  {
    id: "m.shapes.name",
    subject: "math",
    grade: "K",
    title: { en: "Flat and solid shapes", es: "Figuras planas y cuerpos sólidos" },
    standard: "K.G.B.4",
    prereqs: [],
    content: "draft",
    levels: 2,
    generate(r, level, locale) {
      return fromShapes(r, SHAPES[level - 1], locale);
    },
  },

  // ======================= Grade 1 =======================
  {
    id: "m.add.three",
    subject: "math",
    grade: "1",
    title: { en: "Add three numbers", es: "Sumar tres números" },
    standard: "1.OA.A.2",
    prereqs: ["m.add.20"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      let x: number[];
      let story: Story | undefined;
      let name = "";
      if (level === 1) {
        const a = r.int(1, 5), b = r.int(1, 5);
        x = [a, b, r.int(1, Math.min(5, 12 - a - b))];
      } else if (level === 2) {
        if (r.bool(0.7)) {
          const p = r.int(1, 9);
          x = r.shuffle([p, 10 - p, r.int(1, 9)]);
        } else {
          const d = r.int(2, 6);
          x = r.shuffle([d, d, r.int(1, Math.min(9, 20 - 2 * d))]);
        }
      } else {
        const a = r.int(2, 8), b = r.int(2, Math.min(9, 16 - a));
        x = [a, b, r.int(2, Math.min(9, 20 - a - b))];
        story = r.pick(STORY_THREE);
        name = r.pick(NAMES);
      }
      const sum = x[0] + x[1] + x[2];
      const pairs: [number, number][] = [[0, 1], [0, 2], [1, 2]];
      const ten = pairs.find(([i, j]) => x[i] + x[j] === 10);
      const dbl = pairs.find(([i, j]) => x[i] === x[j]);
      const [i, j] = ten ?? dbl ?? [0, 1];
      const k = 3 - i - j;
      const first = x[i] + x[j];
      const text = story ? storyText(story, x, name, name, locale) : "";
      return {
        prompt: story ? [text] : [`${x[0]} + ${x[1]} + ${x[2]} = `, blank],
        say: story ? text : tr(locale, `${x[0]} plus ${x[1]} plus ${x[2]}`, `${x[0]} más ${x[1]} más ${x[2]}`),
        ...(level === 1 ? { visual: dots(x), alt: tr(locale, "Three groups of dots", "Tres grupos de puntos"), markable: true } : {}),
        ...(story ? { picture: story.pic, alt: t2(locale, story.what) } : {}),
        input: "keypad",
        answer: { kind: "number", value: sum },
        wrong: misses(sum, [[x[0] + x[1], "added-only-two"], [x[1] + x[2], "added-only-two"], [x[0] + x[2], "added-only-two"], [sum + 1, "off-by-one"], [sum - 1, "off-by-one"]]),
        hints: [
          story ? tr(locale, "Find the three numbers in the story.", "Busca los tres números del problema.") : tr(locale, "Which two numbers are easy to add first?", "¿Qué dos números son fáciles de sumar primero?"),
          ten
            ? tr(locale, "Make a 10 first. Then add the last number.", "Forma primero un 10. Luego suma el último número.")
            : dbl
              ? tr(locale, "Add the double first. Then add the last number.", "Suma primero el doble. Luego suma el último número.")
              : tr(locale, "Add the first two. Then add the last number.", "Suma los dos primeros. Luego suma el último número."),
          `${x[i]} + ${x[j]} = ${first}`,
        ],
        steps: [`${x[i]} + ${x[j]} = ${first}`, `${first} + ${x[k]} = ${sum}`],
        seconds: level === 3 ? 45 : level === 2 ? 15 : 12,
      };
    },
  },
  {
    id: "m.addsub.20",
    subject: "math",
    grade: "1",
    title: { en: "Add and subtract within 20: speed drill", es: "Sumar y restar hasta 20: práctica rápida" },
    standard: "1.OA.C.6",
    prereqs: ["m.add.20", "m.sub.20"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const cross = level === 2 || (level === 3 && r.bool());
      const plus = r.bool();
      let a: number, b: number;
      if (plus) {
        a = cross ? r.int(2, 9) : r.int(1, 9);
        b = cross ? r.int(11 - a, 9) : r.int(1, 10 - a);
      } else {
        a = cross ? r.int(11, 18) : r.int(2, 10);
        b = cross ? r.int(a - 9, 9) : r.int(1, a - 1);
      }
      const key = plus ? a + b : a - b;
      const big = Math.max(a, b), small = Math.min(a, b);
      let hints: string[], steps: string[], wrong: (Tag | null)[];
      if (plus && !cross) {
        hints = [
          tr(locale, "Start with the bigger number.", "Empieza con el número más grande."),
          tr(locale, `Count on ${small} from ${big}.`, `Cuenta ${small} más desde ${big}.`),
          small === 1 ? tr(locale, `1 more than ${big}.`, `1 más que ${big}.`) : `${big}… ${big + 1}…`,
        ];
        steps = [`${a} + ${b} = ${key}`];
        wrong = [a >= b ? [a - b, "subtracted-instead-of-added"] : null, [key + 1, "off-by-one"], [key - 1, "off-by-one"]];
      } else if (plus) {
        const toTen = 10 - big, left = small - toTen;
        hints = [
          tr(locale, "Make a 10 first.", "Forma primero un 10."),
          tr(locale, `${big} needs ${toTen} more to make 10.`, `A ${big} le faltan ${toTen} para 10.`),
          tr(locale, `${big} + ${toTen} = 10. Then add ${left} more.`, `${big} + ${toTen} = 10. Luego suma ${left} más.`),
        ];
        steps = [`${big} + ${toTen} = 10`, `10 + ${left} = ${key}`];
        wrong = [[key - 10, "dropped-the-ten"], [big - small, "subtracted-instead-of-added"], [key + 1, "off-by-one"]];
      } else if (!cross) {
        hints = [
          tr(locale, `Think: ${b} plus what makes ${a}?`, `Piensa: ¿${b} más cuánto hacen ${a}?`),
          tr(locale, `Count up from ${b} to ${a}.`, `Cuenta desde ${b} hasta ${a}.`),
          `${b}… ${b + 1}…`,
        ];
        steps = [`${b} + ${key} = ${a}`, `${a} − ${b} = ${key}`];
        wrong = [[a + b, "added-instead-of-subtracted"], [key + 1, "off-by-one"], [key - 1, "off-by-one"]];
      } else {
        const ones = a - 10, more = b - ones;
        hints = [
          tr(locale, "Go down to 10 first.", "Baja primero hasta 10."),
          tr(locale, `Take away ${ones} to get to 10.`, `Quita ${ones} para llegar a 10.`),
          tr(locale, `${a} − ${ones} = 10. Then take away ${more} more.`, `${a} − ${ones} = 10. Luego quita ${more} más.`),
        ];
        steps = [`${a} − ${ones} = 10`, `10 − ${more} = ${key}`];
        wrong = [[10 + (b - ones), "subtracted-smaller-from-larger"], [a + b, "added-instead-of-subtracted"], [key + 1, "off-by-one"]];
      }
      return {
        prompt: [`${a} ${plus ? "+" : "−"} ${b} = `, blank],
        say: plus ? tr(locale, `${a} plus ${b}`, `${a} más ${b}`) : tr(locale, `${a} minus ${b}`, `${a} menos ${b}`),
        input: "keypad",
        answer: { kind: "number", value: key },
        wrong: misses(key, wrong),
        hints,
        steps,
        seconds: level === 1 ? 4 : level === 2 ? 6 : 5,
      };
    },
  },
  {
    id: "m.mental.100",
    subject: "math",
    grade: "1",
    title: { en: "Mental math to 100: tens and ones", es: "Cálculo mental hasta 100: decenas y unidades" },
    standard: "1.NBT.C.4",
    prereqs: ["m.place.tens", "m.add.20"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      if (level === 1) {
        const more = r.bool();
        const t = more ? r.int(1, 8) : r.int(2, 9), o = r.int(0, 9), n = t * 10 + o;
        const key = more ? n + 10 : n - 10;
        const text = more ? tr(locale, `What number is 10 more than ${n}?`, `¿Qué número es 10 más que ${n}?`) : tr(locale, `What number is 10 less than ${n}?`, `¿Qué número es 10 menos que ${n}?`);
        return {
          prompt: [text],
          say: text,
          visual: { kind: "base-ten", tens: t, ones: o },
          alt: tr(locale, `${n} in blocks: ${tensOnes(t, o, "en")}`, `${n} en bloques: ${tensOnes(t, o, "es")}`),
          input: "keypad",
          answer: { kind: "number", value: key },
          wrong: misses(key, more ? [[n + 1, "added-one-not-ten"], [n - 10, "went-the-wrong-way"]] : [[n - 1, "took-one-not-ten"], [n + 10, "went-the-wrong-way"]]),
          hints: [
            tr(locale, "Only the tens change.", "Solo cambian las decenas."),
            more ? tr(locale, "Add one ten. The ones stay the same.", "Suma una decena. Las unidades no cambian.") : tr(locale, "Take away one ten. The ones stay the same.", "Quita una decena. Las unidades no cambian."),
            tr(locale, `${n} has ${many(t, "ten", "en")}.`, `${n} tiene ${many(t, "ten", "es")}.`),
          ],
          steps: [
            tr(locale, `The tens digit goes from ${t} to ${more ? t + 1 : t - 1}.`, `La cifra de las decenas pasa de ${t} a ${more ? t + 1 : t - 1}.`),
            more ? `${n} + 10 = ${key}` : `${n} − 10 = ${key}`,
          ],
          seconds: 6,
        };
      }
      if (level === 2) {
        if (r.bool()) {
          const t = r.int(1, 8), o = r.int(0, 9), k = r.int(1, 9 - t), n = t * 10 + o, key = n + k * 10;
          return {
            prompt: [`${n} + ${k * 10} = `, blank],
            say: tr(locale, `${n} plus ${k * 10}`, `${n} más ${k * 10}`),
            visual: { kind: "base-ten", tens: t, ones: o },
            alt: tr(locale, `${n} in blocks: ${tensOnes(t, o, "en")}`, `${n} en bloques: ${tensOnes(t, o, "es")}`),
            input: "keypad",
            answer: { kind: "number", value: key },
            wrong: misses(key, [[n + k, "added-to-the-ones"], [(t + k) * 10, "dropped-the-ones"], [key + 10, "off-by-a-ten"], [key - 10, "off-by-a-ten"]]),
            hints: [
              tr(locale, `${k * 10} is ${many(k, "ten", "en")}.`, `${k * 10} son ${many(k, "ten", "es")}.`),
              tr(locale, "Add the tens. The ones stay the same.", "Suma las decenas. Las unidades no cambian."),
              tr(locale, `${many(t, "ten", "en")} + ${many(k, "ten", "en")} = ${many(t + k, "ten", "en")}.`, `${many(t, "ten", "es")} + ${many(k, "ten", "es")} = ${many(t + k, "ten", "es")}.`),
            ],
            steps: [tr(locale, `${many(t, "ten", "en")} + ${many(k, "ten", "en")} = ${many(t + k, "ten", "en")}`, `${many(t, "ten", "es")} + ${many(k, "ten", "es")} = ${many(t + k, "ten", "es")}`), `${n} + ${k * 10} = ${key}`],
            seconds: 8,
          };
        }
        const a = r.int(2, 9), b = r.int(1, a - 1), key = (a - b) * 10;
        return {
          prompt: [`${a * 10} − ${b * 10} = `, blank],
          say: tr(locale, `${a * 10} minus ${b * 10}`, `${a * 10} menos ${b * 10}`),
          visual: { kind: "base-ten", tens: a, ones: 0 },
          alt: tr(locale, `${a * 10} in blocks: ${many(a, "ten", "en")}`, `${a * 10} en bloques: ${many(a, "ten", "es")}`),
          input: "keypad",
          answer: { kind: "number", value: key },
          wrong: misses(key, [[a * 10 - b, "took-ones-not-tens"], [a - b, "dropped-the-zero"], [(a + b) * 10, "added-instead-of-subtracted"]]),
          hints: [
            tr(locale, `${a * 10} is ${many(a, "ten", "en")}. ${b * 10} is ${many(b, "ten", "en")}.`, `${a * 10} son ${many(a, "ten", "es")}. ${b * 10} son ${many(b, "ten", "es")}.`),
            tr(locale, "Take away tens from tens.", "Quita decenas de decenas."),
            tr(locale, `${many(a, "ten", "en")} − ${many(b, "ten", "en")} = ${many(a - b, "ten", "en")}.`, `${many(a, "ten", "es")} − ${many(b, "ten", "es")} = ${many(a - b, "ten", "es")}.`),
          ],
          steps: [tr(locale, `${many(a, "ten", "en")} − ${many(b, "ten", "en")} = ${many(a - b, "ten", "en")}`, `${many(a, "ten", "es")} − ${many(b, "ten", "es")} = ${many(a - b, "ten", "es")}`), `${a * 10} − ${b * 10} = ${key}`],
          seconds: 8,
        };
      }
      const newTen = r.bool();
      const t = r.int(1, 8);
      const o = newTen ? r.int(1, 9) : r.int(0, 8);
      const d = newTen ? r.int(10 - o, 9) : r.int(1, 9 - o);
      const n = t * 10 + o, key = n + d, ones = o + d;
      return {
        prompt: [`${n} + ${d} = `, blank],
        say: tr(locale, `${n} plus ${d}`, `${n} más ${d}`),
        input: "keypad",
        answer: { kind: "number", value: key },
        wrong: misses(key, newTen ? [[t * 10 + ones - 10, "forgot-the-new-ten"], [Number(`${t}${ones}`), "wrote-the-ones-sum-as-digits"], [(t + d) * 10 + o, "added-to-the-tens"]] : [[(t + d) * 10 + o, "added-to-the-tens"], [key + 1, "off-by-one"], [key - 1, "off-by-one"]]),
        hints: newTen
          ? [
              tr(locale, "Add the ones first.", "Suma primero las unidades."),
              tr(locale, `${o} + ${d} is 10 or more. That makes a new ten.`, `${o} + ${d} es 10 o más. Eso forma una decena nueva.`),
              `${o} + ${d} = ${ones}`,
            ]
          : [tr(locale, "Add the ones first.", "Suma primero las unidades."), tr(locale, "The tens stay the same.", "Las decenas no cambian."), `${o} + ${d} = ${ones}`],
        steps: newTen
          ? [
              `${o} + ${d} = ${ones}`,
              tr(locale, `That is 1 ten and ${many(ones - 10, "one", "en")}.`, `Eso es 1 decena y ${many(ones - 10, "one", "es")}.`),
              tr(locale, `${many(t, "ten", "en")} + 1 ten = ${many(t + 1, "ten", "en")}.`, `${many(t, "ten", "es")} + 1 decena = ${many(t + 1, "ten", "es")}.`),
              `${n} + ${d} = ${key}`,
            ]
          : [`${o} + ${d} = ${ones}`, `${n} + ${d} = ${key}`],
        seconds: 12,
      };
    },
  },
  {
    id: "m.measure.units",
    subject: "math",
    grade: "1",
    title: { en: "Measure length with units", es: "Medir la longitud con unidades" },
    standard: "1.MD.A.2",
    prereqs: ["m.count.20"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      if (level === 1) {
        const o = r.pick(THINGS), n = r.int(4, 12);
        return {
          prompt: [tr(locale, `How many cubes long is the ${o.en}?`, `¿Cuántos cubos mide ${el(o)} ${o.es}?`)],
          say: tr(locale, `How many cubes long is the ${o.en}?`, `¿Cuántos cubos mide ${el(o)} ${o.es}?`),
          picture: o.pic,
          visual: { kind: "array", rows: 1, cols: n },
          alt: tr(locale, `A ${o.en} with cubes lined up along it, end to end`, `${cap(un(o))} ${o.es} con cubos en fila a lo largo, uno junto a otro`),
          markable: true,
          input: "keypad",
          answer: { kind: "number", value: n },
          wrong: misses(n, [[n - 1, "counted-the-gaps"], [n + 1, "miscounted-units"]]),
          hints: [
            tr(locale, "Each cube is one unit long.", "Cada cubo mide una unidad."),
            tr(locale, "Count the cubes from one end to the other.", "Cuenta los cubos de un extremo al otro."),
            tr(locale, "Touch each cube as you count: 1, 2, 3…", "Toca cada cubo mientras cuentas: 1, 2, 3…"),
          ],
          steps: [tr(locale, `There are ${n} cubes from end to end.`, `Hay ${n} cubos de un extremo al otro.`), tr(locale, `The ${o.en} is ${n} cubes long.`, `${cap(el(o))} ${o.es} mide ${n} cubos.`)],
          seconds: 12,
        };
      }
      if (level === 2) {
        const A = r.pick(THINGS);
        let B = r.pick(THINGS);
        while (B === A) B = r.pick(THINGS);
        const a = r.int(6, 15), b = r.int(2, a - 2), d = a - b;
        const longer = r.bool();
        const ask = longer
          ? tr(locale, `How many cubes longer is the ${A.en}?`, `¿Cuántos cubos más ${A.f ? "larga" : "largo"} es ${el(A)} ${A.es}?`)
          : tr(locale, `How many cubes shorter is the ${B.en}?`, `¿Cuántos cubos más ${B.f ? "corta" : "corto"} es ${el(B)} ${B.es}?`);
        const text = tr(locale, `The ${A.en} is ${a} cubes long. The ${B.en} is ${b} cubes long. ${ask}`, `${cap(el(A))} ${A.es} mide ${a} cubos. ${cap(el(B))} ${B.es} mide ${b} cubos. ${ask}`);
        return {
          prompt: [text],
          say: text,
          picture: A.pic,
          alt: tr(locale, `A ${A.en} and a ${B.en}`, `${cap(un(A))} ${A.es} y ${un(B)} ${B.es}`),
          input: "keypad",
          answer: { kind: "number", value: d },
          wrong: misses(d, [[a + b, "added-instead-of-compared"], [a, "gave-a-length"], [b, "gave-a-length"]]),
          hints: [
            tr(locale, "Which is longer? By how much?", "¿Cuál es más largo? ¿Por cuánto?"),
            tr(locale, `Count up from ${b} to ${a}.`, `Cuenta desde ${b} hasta ${a}.`),
            `${b} + ? = ${a}`,
          ],
          steps: [
            `${a} − ${b} = ${d}`,
            longer
              ? tr(locale, `The ${A.en} is ${d} cubes longer.`, `${cap(el(A))} ${A.es} es ${d} cubos más ${A.f ? "larga" : "largo"}.`)
              : tr(locale, `The ${B.en} is ${d} cubes shorter.`, `${cap(el(B))} ${B.es} es ${d} cubos más ${B.f ? "corta" : "corto"}.`),
          ],
          seconds: 30,
        };
      }
      const name = r.pick(NAMES), o = r.pick(THINGS);
      const way = r.pick(["gaps", "overlap", "good"] as const);
      const how = {
        gaps: tr(locale, `${name} leaves gaps between the clips.`, `${name} deja espacios entre los clips.`),
        overlap: tr(locale, "The clips overlap each other.", "Los clips quedan superpuestos."),
        good: tr(locale, `${name} lines them up end to end, with no gaps.`, `${name} los pone uno junto al otro, sin espacios.`),
      }[way];
      const text = `${tr(locale, `${name} measures a ${o.en} with paper clips.`, `${name} mide ${un(o)} ${o.es} con clips.`)} ${how} ${tr(locale, "Is the count too big, too small, or just right?", "¿La medida sale muy grande, muy pequeña o correcta?")}`;
      const BIG: Choice = { label: tr(locale, "Too big", "Muy grande"), say: tr(locale, "Too big", "Muy grande") };
      const SMALL: Choice = { label: tr(locale, "Too small", "Muy pequeña"), say: tr(locale, "Too small", "Muy pequeña") };
      const RIGHT: Choice = { label: tr(locale, "Just right", "Correcta"), say: tr(locale, "Just right", "Correcta") };
      const pick =
        way === "gaps"
          ? choose(r, SMALL, [{ ...BIG, why: "gaps-make-it-longer" }, { ...RIGHT, why: "gaps-do-not-matter" }])
          : way === "overlap"
            ? choose(r, BIG, [{ ...SMALL, why: "overlaps-make-it-shorter" }, { ...RIGHT, why: "overlaps-do-not-matter" }])
            : choose(r, RIGHT, [{ ...BIG, why: "doubted-a-good-measure" }, { ...SMALL, why: "doubted-a-good-measure" }]);
      const strat = tr(locale, "Units must touch, with no gaps and no overlaps.", "Las unidades deben tocarse, sin espacios ni superposiciones.");
      return {
        prompt: [text],
        say: text,
        picture: "📎",
        alt: tr(locale, "Paper clips", "Clips"),
        ...pick,
        hints:
          way === "gaps"
            ? [tr(locale, "Look at the spaces between the clips.", "Mira los espacios entre los clips."), strat, tr(locale, "With gaps, fewer clips reach the end.", "Con espacios, se usan menos clips para llegar al final.")]
            : way === "overlap"
              ? [tr(locale, "Look where the clips sit on top of each other.", "Mira dónde un clip queda sobre otro."), strat, tr(locale, "With overlaps, more clips are needed to reach the end.", "Si se superponen, se necesitan más clips para llegar al final.")]
              : [tr(locale, "Are there gaps or overlaps?", "¿Hay espacios o clips superpuestos?"), strat, tr(locale, "Check each clip touches the next one.", "Revisa que cada clip toque al siguiente.")],
        steps:
          way === "gaps"
            ? [tr(locale, "Gaps leave parts with no clip.", "Los espacios dejan partes sin clip."), tr(locale, "Fewer clips get counted, so the count is too small.", "Se cuentan menos clips, así que la medida sale muy pequeña.")]
            : way === "overlap"
              ? [tr(locale, "Overlaps cover the same part twice.", "Al superponerse, cubren la misma parte dos veces."), tr(locale, "More clips get counted, so the count is too big.", "Se cuentan más clips, así que la medida sale muy grande.")]
              : [tr(locale, "No gaps and no overlaps.", "Sin espacios y sin clips superpuestos."), tr(locale, "The count is just right.", "La medida es correcta.")],
        seconds: 20,
      };
    },
  },
  {
    id: "m.time.set",
    subject: "math",
    grade: "1",
    title: { en: "Set the clock: hour and half hour", es: "Poner el reloj: horas y medias horas" },
    standard: "1.MD.B.3",
    prereqs: ["m.time.clock"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const h = r.int(1, 12);
      const half = level === 2 || (level === 3 && r.bool());
      const digital = level < 3 && r.bool();
      const time = hh(h, half ? 30 : 0);
      const next = (h % 12) + 1;
      const en = digital ? time : half ? `half past ${h}` : `${h} o'clock`;
      const es = digital ? `${las(h)} ${time}` : `${las(h)} ${h} ${half ? "y media" : "en punto"}`;
      return {
        prompt: [tr(locale, `Show ${en} on the clock.`, `Marca ${es} en el reloj.`)],
        say: tr(locale, `Show ${half ? `half past ${h}` : `${h} o'clock`} on the clock.`, `Marca ${las(h)} ${h} ${half ? "y media" : "en punto"} en el reloj.`),
        input: "clock",
        pad: { kind: "clock", stepMinutes: 30 },
        answer: { kind: "text", accept: [time] },
        wrong: misses(time, half ? [[hh(next, 30), "used-the-next-hour"], [hh(h, 0), "put-the-long-hand-on-12"]] : [[hh(h, 30), "put-the-long-hand-on-6"], h === 6 ? ["12:30", "swapped-the-hands"] : null]),
        hints: [
          tr(locale, "The short hand shows the hour. The long hand shows the minutes.", "La manecilla corta marca la hora. La larga marca los minutos."),
          half ? tr(locale, "For half past, the long hand points to 6.", "Para y media, la manecilla larga apunta al 6.") : tr(locale, "For o'clock, the long hand points to 12.", "Para en punto, la manecilla larga apunta al 12."),
          half ? tr(locale, `Put the short hand halfway between ${h} and ${next}.`, `Pon la manecilla corta a la mitad entre el ${h} y el ${next}.`) : tr(locale, `Put the short hand on ${h}.`, `Pon la manecilla corta en el ${h}.`),
        ],
        steps: half
          ? [tr(locale, `Short hand halfway between ${h} and ${next}.`, `Manecilla corta a la mitad entre el ${h} y el ${next}.`), tr(locale, "Long hand on 6.", "Manecilla larga en el 6."), time]
          : [tr(locale, `Short hand on ${h}.`, `Manecilla corta en el ${h}.`), tr(locale, "Long hand on 12.", "Manecilla larga en el 12."), time],
        seconds: 15,
      };
    },
  },
  {
    id: "m.data.picture",
    subject: "math",
    grade: "1",
    title: { en: "Picture graphs: count and compare", es: "Pictogramas: contar y comparar" },
    standard: "1.MD.C.4",
    prereqs: ["m.count.20", "m.sub.10"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const theme = r.pick(THEMES3);
      const c = [r.int(2, 5), r.int(2, 5), r.int(2, 5)];
      const q = level === 1 ? r.pick(["count", "most", "fewest"] as const) : level === 2 ? r.pick(["more", "fewer"] as const) : r.pick(["total", "total", "more"] as const);
      const unique = (v: number) => c.filter((x) => x === v).length === 1;
      if (q === "most") while (!unique(Math.max(...c))) c[r.int(0, 2)] = r.int(2, 5);
      if (q === "fewest") while (!unique(Math.min(...c))) c[r.int(0, 2)] = r.int(2, 5);
      if (q === "more" || q === "fewer") while (new Set(c).size === 1) c[r.int(0, 2)] = r.int(2, 5);
      const names = theme.cats.map((p) => t2(locale, p));
      const total = c[0] + c[1] + c[2];
      const legend = tr(locale, `Each dot is one vote. Left to right: ${names.join(", ")}.`, `Cada punto es un voto. De izquierda a derecha: ${names.join(", ")}.`);
      const counts = names.map((nm, i) => `${cap(nm)}: ${c[i]}.`).join(" ");
      const pairsBig: [number, number][] = [];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (c[i] > c[j]) pairsBig.push([i, j]);
      const [xi, yi] = q === "more" || q === "fewer" ? r.pick(pairsBig) : [r.int(0, 2), 0];
      const X = names[xi], Y = names[yi];
      const question = {
        count: tr(locale, `How many kids picked ${X}?`, `¿Cuántos niños eligieron ${X}?`),
        most: tr(locale, "Which got the most votes?", "¿Cuál tuvo más votos?"),
        fewest: tr(locale, "Which got the fewest votes?", "¿Cuál tuvo menos votos?"),
        more: tr(locale, `How many more kids picked ${X} than ${Y}?`, `¿Cuántos niños más eligieron ${X} que ${Y}?`),
        fewer: tr(locale, `How many fewer kids picked ${Y} than ${X}?`, `¿Cuántos niños menos eligieron ${Y} que ${X}?`),
        total: tr(locale, "How many kids voted in all?", "¿Cuántos niños votaron en total?"),
      }[q];
      const text = `${t2(locale, theme.title)} ${legend} ${question}`;
      const body = {
        prompt: [text],
        say: text,
        visual: dots(c),
        alt: q === "count" ? tr(locale, "Three groups of dots, one group for each choice", "Tres grupos de puntos, uno para cada opción") : tr(locale, `Dots for each choice. ${counts}`, `Puntos para cada opción. ${counts}`),
        markable: true,
        seconds: level === 1 ? 15 : level === 2 ? 20 : 25,
      };
      if (q === "most" || q === "fewest") {
        const want = q === "most" ? c.indexOf(Math.max(...c)) : c.indexOf(Math.min(...c));
        const max = Math.max(...c), min = Math.min(...c);
        const opts: Choice[] = names.map((nm, i) => ({ label: cap(nm), say: cap(nm), ...(theme.icons ? { picture: theme.icons[i] } : {}) }));
        const wrong = opts
          .filter((_, i) => i !== want)
          .map((o) => {
            const v = c[names.findIndex((nm) => cap(nm) === o.label)];
            return { ...o, why: q === "most" ? (v === min ? "picked-the-fewest" : "picked-a-smaller-group") : v === max ? "picked-the-most" : "picked-a-bigger-group" };
          });
        return {
          ...body,
          ...choose(r, opts[want], wrong),
          hints: [
            tr(locale, "Count each group.", "Cuenta cada grupo."),
            q === "most" ? tr(locale, "The biggest count has the most votes.", "El número mayor tiene más votos.") : tr(locale, "The smallest count has the fewest votes.", "El número menor tiene menos votos."),
            `${cap(names[0])}: ${c[0]}.`,
          ],
          steps: [counts, q === "most" ? tr(locale, `${cap(names[want])} got the most votes.`, `${cap(names[want])} tuvo más votos.`) : tr(locale, `${cap(names[want])} got the fewest votes.`, `${cap(names[want])} tuvo menos votos.`)],
        };
      }
      if (q === "count") {
        const v = c[xi];
        return {
          ...body,
          input: "keypad",
          answer: { kind: "number", value: v },
          wrong: misses(v, [[v + 1, "miscounted"], [v - 1, "miscounted"]]),
          hints: [
            tr(locale, `Find the group for ${X}.`, `Busca el grupo de ${X}.`),
            tr(locale, "Touch each dot in that group once.", "Toca cada punto de ese grupo una vez."),
            tr(locale, `It is group number ${xi + 1} from the left.`, `Es el grupo número ${xi + 1} desde la izquierda.`),
          ],
          steps: [tr(locale, `The ${X} group has ${v} dots.`, `El grupo de ${X} tiene ${v} puntos.`), tr(locale, `${v} kids picked ${X}.`, `${v} niños eligieron ${X}.`)],
        };
      }
      if (q === "total") {
        return {
          ...body,
          input: "keypad",
          answer: { kind: "number", value: total },
          wrong: misses(total, [[total - Math.min(...c), "left-out-a-group"], [total + 1, "off-by-one"], [total - 1, "off-by-one"]]),
          hints: [tr(locale, "Count every dot.", "Cuenta todos los puntos."), tr(locale, "Add the three groups.", "Suma los tres grupos."), `${c[0]} + ${c[1]} = ${c[0] + c[1]}`],
          steps: [`${c[0]} + ${c[1]} + ${c[2]} = ${total}`],
        };
      }
      const d = c[xi] - c[yi];
      return {
        ...body,
        input: "keypad",
        answer: { kind: "number", value: d },
        wrong: misses(d, [[c[xi], "gave-one-count"], [c[xi] + c[yi], "added-instead-of-compared"], [d + 1, "off-by-one"]]),
        hints: [
          tr(locale, `Count the ${X} group and the ${Y} group.`, `Cuenta el grupo de ${X} y el de ${Y}.`),
          tr(locale, "Subtract the smaller count from the bigger one.", "Resta el número menor del mayor."),
          `${cap(X)}: ${c[xi]}.`,
        ],
        steps: [`${cap(X)}: ${c[xi]}. ${cap(Y)}: ${c[yi]}.`, `${c[xi]} − ${c[yi]} = ${d}`],
      };
    },
  },
  {
    id: "m.shares.halves",
    subject: "math",
    grade: "1",
    title: { en: "Halves and fourths", es: "Mitades y cuartos" },
    standard: "1.G.A.3",
    prereqs: ["m.shapes.name"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      if (level === 3) {
        const kind = r.pick(["name", "compare", "count"] as const);
        const HALF: Choice = { label: tr(locale, "One half", "Una mitad"), say: tr(locale, "One half", "Una mitad") };
        const FOURTH: Choice = { label: tr(locale, "One fourth", "Un cuarto"), say: tr(locale, "One fourth", "Un cuarto") };
        if (kind === "name") {
          const d = r.pick([2, 4] as const), whole = r.bool(0.2);
          const WHOLE: Choice = { label: tr(locale, "The whole bar", "Toda la barra"), say: tr(locale, "The whole bar", "Toda la barra") };
          const key = whole ? WHOLE : d === 2 ? HALF : FOURTH;
          const wrong = whole
            ? [{ ...HALF, why: "named-one-share-for-whole" }, { ...FOURTH, why: "named-one-share-for-whole" }]
            : [{ ...(d === 2 ? FOURTH : HALF), why: "mixed-up-halves-and-fourths" }, { ...WHOLE, why: "named-the-whole" }];
          const shaded = whole ? d : 1;
          return {
            prompt: [tr(locale, "What part of the bar is shaded?", "¿Qué parte de la barra está coloreada?")],
            say: tr(locale, "What part of the bar is shaded?", "¿Qué parte de la barra está coloreada?"),
            visual: { kind: "fraction", parts: d, shaded },
            alt: tr(locale, `A bar cut into ${d} equal parts. ${shaded} ${shaded === 1 ? "part is" : "parts are"} shaded.`, `Una barra dividida en ${d} partes iguales. ${shaded} ${shaded === 1 ? "parte está coloreada" : "partes están coloreadas"}.`),
            ...choose(r, key, wrong),
            hints: [
              tr(locale, "Count the equal parts.", "Cuenta las partes iguales."),
              tr(locale, "2 equal parts are halves. 4 equal parts are fourths.", "2 partes iguales son mitades. 4 partes iguales son cuartos."),
              tr(locale, `The bar has ${d} equal parts.`, `La barra tiene ${d} partes iguales.`),
            ],
            steps: whole
              ? [tr(locale, `All ${d} parts are shaded.`, `Las ${d} partes están coloreadas.`), tr(locale, "The whole bar is shaded.", "Toda la barra está coloreada.")]
              : [tr(locale, `1 of ${d} equal parts is shaded.`, `1 de ${d} partes iguales está coloreada.`), tr(locale, `That is ${t2("en", SHARE[d].one)}.`, `Eso es ${t2("es", SHARE[d].one)}.`)],
            seconds: 10,
          };
        }
        if (kind === "compare") {
          const bigger = r.bool();
          const SAME: Choice = { label: tr(locale, "They are the same", "Son iguales"), say: tr(locale, "They are the same", "Son iguales") };
          const text = tr(
            locale,
            `Two bars are the same size. One is cut into halves. One is cut into fourths. Which share is ${bigger ? "bigger" : "smaller"}?`,
            `Dos barras son del mismo tamaño. Una se divide en mitades. La otra se divide en cuartos. ¿Qué parte es más ${bigger ? "grande" : "pequeña"}?`,
          );
          return {
            prompt: [text],
            say: text,
            ...choose(r, bigger ? HALF : FOURTH, [{ ...(bigger ? FOURTH : HALF), why: bigger ? "more-parts-means-bigger" : "fewer-parts-means-smaller" }, { ...SAME, why: "thinks-all-shares-are-equal" }]),
            hints: [
              tr(locale, "Picture the two bars side by side.", "Imagina las dos barras una al lado de la otra."),
              tr(locale, "More equal parts means smaller parts.", "Más partes iguales quiere decir partes más pequeñas."),
              tr(locale, "A half is 1 of 2 parts. A fourth is 1 of 4.", "Una mitad es 1 de 2 partes. Un cuarto es 1 de 4."),
            ],
            steps: [
              tr(locale, "Cutting into 4 makes smaller parts than cutting into 2.", "Dividir en 4 da partes más pequeñas que dividir en 2."),
              bigger ? tr(locale, "One half is bigger.", "Una mitad es más grande.") : tr(locale, "One fourth is smaller.", "Un cuarto es más pequeño."),
            ],
            seconds: 15,
          };
        }
        const d = r.pick([2, 4] as const);
        const text = d === 2 ? tr(locale, "How many halves make the whole bar?", "¿Cuántas mitades forman la barra entera?") : tr(locale, "How many fourths make the whole bar?", "¿Cuántos cuartos forman la barra entera?");
        return {
          prompt: [text],
          say: text,
          visual: { kind: "fraction", parts: d, shaded: 0 },
          alt: tr(locale, "A bar cut into equal parts", "Una barra dividida en partes iguales"),
          ...numberChoices(r, d, [[1, "named-one-share"], [d === 2 ? 4 : 2, "mixed-up-halves-and-fourths"]], 4),
          hints: [
            tr(locale, "Count the equal parts.", "Cuenta las partes iguales."),
            tr(locale, "The whole is all the equal parts together.", "El entero son todas las partes iguales juntas."),
            tr(locale, "Touch each part as you count.", "Toca cada parte mientras cuentas."),
          ],
          steps: [d === 2 ? tr(locale, "2 halves make the whole bar.", "2 mitades forman la barra entera.") : tr(locale, "4 fourths make the whole bar.", "4 cuartos forman la barra entera.")],
          seconds: 10,
        };
      }
      const d = r.pick([2, 4] as const);
      const quarter = d === 4 && r.bool(0.3);
      const whole = r.bool(0.25);
      const oneEn = d === 2 ? "one half" : quarter ? "one quarter" : "one fourth";
      const oneEs = d === 2 ? "una mitad" : "un cuarto";
      const plEn = d === 2 ? "halves" : quarter ? "quarters" : "fourths";
      const plEs = d === 2 ? "mitades" : "cuartos";
      const shadeEn = whole ? (d === 2 ? "both halves" : `all 4 ${plEn}`) : oneEn;
      const shadeEs = whole ? (d === 2 ? "las 2 mitades" : "los 4 cuartos") : oneEs;
      const text =
        level === 1
          ? whole
            ? tr(locale, `The bar has ${d} equal parts. Shade the whole bar.`, `La barra tiene ${d} partes iguales. Colorea toda la barra.`)
            : tr(locale, `The bar has ${d} equal parts. Shade ${oneEn}.`, `La barra tiene ${d} partes iguales. Colorea ${oneEs}.`)
          : tr(locale, `Cut the bar into ${plEn}. Shade ${shadeEn}.`, `Divide la barra en ${plEs}. Colorea ${shadeEs}.`);
      const wrong: (Tag | null)[] = whole
        ? [[`1/${d}`, "shaded-one-share-not-whole"], d === 4 ? ["3/4", "missed-a-share"] : null]
        : level === 1
          ? d === 4
            ? [["2/4", "shaded-too-many"], ["4/4", "shaded-the-whole"], ["3/4", "shaded-all-but-one"]]
            : [["2/2", "shaded-the-whole"]]
          : d === 4
              ? [["1/2", "made-halves-not-fourths"], ["1/3", "made-thirds"], ["4/4", "shaded-the-whole"]]
              : [["1/4", "made-fourths-not-halves"], ["1/3", "made-thirds"], ["2/2", "shaded-the-whole"]];
      return {
        prompt: [text],
        say: text,
        input: "fraction-bar",
        pad: level === 1 ? { kind: "fraction-bar", parts: d, maxParts: 4 } : { kind: "fraction-bar", maxParts: 4 },
        answer: { kind: "fraction", n: whole ? d : 1, d },
        wrong: misses(whole ? `${d}/${d}` : `1/${d}`, wrong),
        hints:
          level === 1
            ? [
                tr(locale, "Equal parts are the same size.", "Las partes iguales son del mismo tamaño."),
                tr(locale, `${d} equal parts make the whole bar.`, `${d} partes iguales forman la barra entera.`),
                whole
                  ? tr(locale, "Shade the parts one at a time.", "Colorea las partes una por una.")
                  : tr(locale, `${cap(oneEn)} is 1 of the ${d} equal parts.`, `${cap(oneEs)} es 1 de las ${d} partes iguales.`),
              ]
            : [
                tr(locale, `${cap(plEn)} means ${d} equal parts.`, `${cap(plEs)} quiere decir ${d} partes iguales.`),
                tr(locale, `First make ${d} equal parts. Then shade.`, `Primero haz ${d} partes iguales. Luego colorea.`),
                tr(locale, `Choose ${d} parts for the bar.`, `Elige ${d} partes para la barra.`),
              ],
        steps: whole
          ? [tr(locale, `The bar has ${d} equal parts.`, `La barra tiene ${d} partes iguales.`), tr(locale, `Shade all ${d}: the whole bar.`, `Colorea las ${d}: toda la barra.`)]
          : [tr(locale, `The bar has ${d} equal parts.`, `La barra tiene ${d} partes iguales.`), tr(locale, `Shade 1 part: ${oneEn}.`, `Colorea 1 parte: ${oneEs}.`)],
        seconds: level === 1 ? 10 : 15,
      };
    },
  },

  // ======================= Grade 2 =======================
  {
    id: "m.story.100",
    subject: "math",
    grade: "2",
    title: { en: "Word problems within 100", es: "Problemas hasta 100" },
    standard: "2.OA.A.1",
    prereqs: ["m.add.2digit", "m.sub.2digit"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const kind = r.pick(level === 1 ? ["add-to", "put-together", "take-from"] : level === 2 ? ["change-add", "change-take", "start-add", "compare", "fewer", "more"] : ["add-take", "take-add", "take-take", "goal"]);
      const story = r.pick(STORY_100.filter((s) => s.kind === kind));
      const [n, m] = twoNames(r);
      // ops: the worked steps, left to right; x: the numbers as the story shows them.
      let x: number[], ops: [number, "+" | "−", number][];
      switch (kind) {
        case "add-to":
        case "put-together": {
          const a = r.int(12, 75), b = r.int(11, 99 - a);
          x = [a, b];
          ops = [[a, "+", b]];
          break;
        }
        case "take-from":
        case "compare": {
          const a = r.int(30, 99), b = r.int(11, a - 5);
          x = [a, b];
          ops = [[a, "−", b]];
          break;
        }
        case "change-add": {
          const a = r.int(15, 70), d = r.int(11, 99 - a);
          x = [a, a + d];
          ops = [[a + d, "−", a]];
          break;
        }
        case "change-take": {
          const a = r.int(40, 99), d = r.int(11, a - 10);
          x = [a, a - d];
          ops = [[a, "−", a - d]];
          break;
        }
        case "start-add": {
          const s = r.int(15, 70), b = r.int(11, 99 - s);
          x = [b, s + b];
          ops = [[s + b, "−", b]];
          break;
        }
        case "fewer": {
          const a = r.int(30, 99), d = r.int(5, a - 10);
          x = [a, d];
          ops = [[a, "−", d]];
          break;
        }
        case "more": {
          const a = r.int(15, 70), d = r.int(5, 99 - a);
          x = [a, d];
          ops = [[a, "+", d]];
          break;
        }
        case "add-take": {
          const a = r.int(20, 60), b = r.int(10, Math.min(39, 99 - a)), c = r.int(5, Math.min(60, a + b - 5));
          x = [a, b, c];
          ops = [[a, "+", b], [a + b, "−", c]];
          break;
        }
        case "take-add": {
          const a = r.int(30, 80), b = r.int(5, a - 10), c = r.int(5, Math.min(40, 99 - (a - b)));
          x = [a, b, c];
          ops = [[a, "−", b], [a - b, "+", c]];
          break;
        }
        case "take-take": {
          const a = r.int(40, 99), b = r.int(5, 30), c = r.int(5, Math.min(30, a - b - 5));
          x = [a, b, c];
          ops = [[a, "−", b], [a - b, "−", c]];
          break;
        }
        default: {
          const a = r.int(10, 40), b = r.int(10, 40), c = r.int(a + b + 5, 100);
          x = [a, b, c];
          ops = [[a, "+", b], [c, "−", a + b]];
        }
      }
      const res = ([p, op, q]: [number, "+" | "−", number]) => (op === "+" ? p + q : p - q);
      const key = res(ops[ops.length - 1]);
      const text = storyText(story, x, n, m, locale);
      let hints: string[], steps: string[], wrong: (Tag | null)[];
      if (ops.length === 1) {
        const [p, op, q] = ops[0];
        const tf = tensFirst(p, op, q, locale);
        const nudge: Record<string, [string, string]> = {
          "add-to": [tr(locale, "Is something added or taken away?", "¿Se agrega algo o se quita algo?"), tr(locale, "More are added, so add.", "Se agregan más, así que suma.")],
          "put-together": [tr(locale, "Two groups make one group.", "Dos grupos forman un grupo."), tr(locale, "Put the groups together: add.", "Junta los grupos: suma.")],
          "take-from": [tr(locale, "Is something added or taken away?", "¿Se agrega algo o se quita algo?"), tr(locale, "Some are taken away, so subtract.", "Se quitan algunos, así que resta.")],
          "change-add": [tr(locale, "You know the start and the end.", "Sabes cuántos había al inicio y al final."), tr(locale, `Think: ${x[0]} + ? = ${x[1]}. Subtract to find it.`, `Piensa: ${x[0]} + ? = ${x[1]}. Resta para encontrarlo.`)],
          "change-take": [tr(locale, "You know the start and the end.", "Sabes cuántos había al inicio y al final."), tr(locale, `Think: ${x[0]} − ? = ${x[1]}. Subtract to find it.`, `Piensa: ${x[0]} − ? = ${x[1]}. Resta para encontrarlo.`)],
          "start-add": [tr(locale, "The start is missing.", "Falta el número del inicio."), tr(locale, `Think: ? + ${x[0]} = ${x[1]}. Subtract to find it.`, `Piensa: ? + ${x[0]} = ${x[1]}. Resta para encontrarlo.`)],
          compare: [tr(locale, "Compare the two amounts.", "Compara las dos cantidades."), tr(locale, "Find the difference: subtract.", "Busca la diferencia: resta.")],
          fewer: [tr(locale, `Fewer means less than ${x[0]}.`, `Menos quiere decir menos que ${x[0]}.`), tr(locale, `Subtract ${x[1]} from ${x[0]}.`, `Resta ${x[1]} a ${x[0]}.`)],
          more: [tr(locale, `More means more than ${x[0]}.`, `Más quiere decir más que ${x[0]}.`), tr(locale, `Add ${x[1]} to ${x[0]}.`, `Suma ${x[1]} a ${x[0]}.`)],
        };
        hints = [...nudge[kind], tf.hint];
        steps = tf.steps;
        const borrow = op === "−" && p % 10 < q % 10;
        wrong =
          op === "+"
            ? [[Math.abs(p - q), "subtracted-instead-of-added"], (p % 10) + (q % 10) >= 10 ? [key - 10, "forgot-to-carry"] : null, [key + 10, "added-an-extra-ten"]]
            : [
                [p + q, kind === "change-add" || kind === "start-add" ? "added-because-of-more" : "added-instead-of-subtracted"],
                borrow ? [(Math.floor(p / 10) - Math.floor(q / 10)) * 10 + ((q % 10) - (p % 10)), "subtracted-smaller-digit"] : null,
                borrow ? [key + 10, "forgot-to-trade-a-ten"] : [key + 10, "off-by-a-ten"],
              ];
      } else {
        const [a, b, c] = x;
        const first = res(ops[0]);
        const plan: Record<string, string> = {
          "add-take": tr(locale, `First add ${b}. Then subtract ${c}.`, `Primero suma ${b}. Luego resta ${c}.`),
          "take-add": tr(locale, `First subtract ${b}. Then add ${c}.`, `Primero resta ${b}. Luego suma ${c}.`),
          "take-take": tr(locale, `Subtract ${b}. Then subtract ${c}.`, `Resta ${b}. Luego resta ${c}.`),
          goal: tr(locale, `Add ${a} and ${b}. Then find how far that is from ${c}.`, `Suma ${a} y ${b}. Luego busca cuánto falta para ${c}.`),
        };
        hints = [tr(locale, "There are two steps. Do one at a time.", "Hay dos pasos. Hazlos uno por uno."), plan[kind], `${ops[0][0]} ${ops[0][1]} ${ops[0][2]} = ${first}`];
        steps = ops.map((o) => `${o[0]} ${o[1]} ${o[2]} = ${res(o)}`);
        wrong =
          kind === "add-take"
            ? [[a + b, "did-only-one-step"], [a + b + c, "added-all-the-numbers"]]
            : kind === "take-add"
              ? [[a - b, "did-only-one-step"], [a - b - c, "used-the-wrong-operation"], [a + b + c, "added-all-the-numbers"]]
              : kind === "take-take"
                ? [[a - b, "did-only-one-step"], [a - b + c, "used-the-wrong-operation"]]
                : [[a + b, "did-only-one-step"], [c - a, "left-out-a-number"], [a + b + c, "added-all-the-numbers"]];
      }
      return {
        prompt: [text],
        say: text,
        picture: story.pic,
        alt: t2(locale, story.what),
        input: "keypad",
        answer: { kind: "number", value: key },
        wrong: misses(key, wrong),
        hints,
        steps,
        seconds: level === 1 ? 45 : level === 2 ? 60 : 90,
      };
    },
  },
  {
    id: "m.place.1000",
    subject: "math",
    grade: "2",
    title: { en: "Hundreds, tens and ones", es: "Centenas, decenas y unidades" },
    standard: "2.NBT.A.1",
    prereqs: ["m.place.tens"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      if (level === 1) {
        const h = r.int(1, 4), t = r.int(0, 7), o = r.int(0, 9), n = h * 100 + t * 10 + o;
        return {
          prompt: [tr(locale, "What number do the blocks show?", "¿Qué número muestran los bloques?")],
          say: tr(locale, "What number do the blocks show?", "¿Qué número muestran los bloques?"),
          visual: { kind: "base-ten", hundreds: h, tens: t, ones: o },
          alt: tr(locale, "Base-ten blocks: flats of 100, rods of 10 and cubes of 1", "Bloques de base diez: placas de 100, barras de 10 y cubos de 1"),
          input: "keypad",
          answer: { kind: "number", value: n },
          wrong: misses(n, [[h + t + o, "counted-blocks-not-values"], t === 0 ? [h * 10 + o, "dropped-the-zero"] : null, o === 0 ? [h * 10 + t, "dropped-the-zero"] : null, t !== o ? [h * 100 + o * 10 + t, "swapped-tens-and-ones"] : null]),
          hints: [
            tr(locale, "Each flat is 100. Each rod is 10. Each cube is 1.", "Cada placa es 100. Cada barra es 10. Cada cubo es 1."),
            tr(locale, "Count the hundreds, then the tens, then the ones.", "Cuenta las centenas, luego las decenas y luego las unidades."),
            h === 1 ? tr(locale, "1 flat makes 100.", "1 placa es 100.") : tr(locale, `${h} flats make ${h * 100}.`, `${h} placas son ${h * 100}.`),
          ],
          steps: [`${cap(place(h, t, o, locale))}.`, `${h * 100} + ${t * 10} + ${o} = ${n}`],
          seconds: 12,
        };
      }
      if (level === 2) {
        if (r.bool()) {
          const h = r.int(1, 9), t = r.bool(0.2) ? 0 : r.int(0, 9), o = r.bool(0.2) ? 0 : r.int(0, 9), n = h * 100 + t * 10 + o;
          let parts = [h * 100, t * 10, o].filter((v) => v > 0);
          const shuffled = r.bool(0.4);
          if (shuffled) parts = r.shuffle(parts);
          const leading = Number(parts.map((p) => String(p)[0]).join(""));
          return {
            prompt: [`${parts.join(" + ")} = `, blank],
            say: plusWords(parts.join(" + "), locale),
            input: "keypad",
            answer: { kind: "number", value: n },
            wrong: misses(n, [[Number(parts.join("")), "wrote-the-parts-side-by-side"], t === 0 || o === 0 ? [leading, "dropped-the-zero"] : null, shuffled ? [leading, "kept-the-shown-order"] : null]),
            hints: [
              tr(locale, "Each part is hundreds, tens or ones.", "Cada parte son centenas, decenas o unidades."),
              tr(locale, "Put each digit in its place.", "Pon cada cifra en su lugar."),
              tr(locale, `The hundreds digit is ${h}.`, `La cifra de las centenas es ${h}.`),
            ],
            steps: [`${cap(place(h, t, o, locale))}.`, `${parts.join(" + ")} = ${n}`],
            seconds: 10,
          };
        }
        const h = r.int(1, 9);
        let t = r.int(0, 9);
        while (t === h) t = r.int(0, 9);
        let o = r.int(0, 9);
        while (o === h || o === t) o = r.int(0, 9);
        const n = h * 100 + t * 10 + o;
        const digits = [h, t, o];
        const pos = r.pick([0, 1, 2].filter((p) => digits[p] !== 0));
        const dg = digits[pos], value = dg * [100, 10, 1][pos];
        const placeName = [tr(locale, "hundreds", "las centenas"), tr(locale, "tens", "las decenas"), tr(locale, "ones", "las unidades")][pos];
        const w = (["hundred", "ten", "one"] as const)[pos];
        const opts = [dg * 100, dg * 10, dg].filter((v) => v !== value);
        return {
          prompt: [tr(locale, `What is the value of the ${dg} in ${n}?`, `¿Cuál es el valor del ${dg} en ${n}?`)],
          say: tr(locale, `What is the value of the ${dg} in ${n}?`, `¿Cuál es el valor del ${dg} en ${n}?`),
          ...choose(r, { label: String(value), say: String(value) }, opts.map((v) => ({ label: String(v), say: String(v), why: v === dg ? "gave-the-digit" : "wrong-place" }))),
          hints: [
            tr(locale, `Find the place of the ${dg}.`, `Busca el lugar del ${dg}.`),
            tr(locale, "Ones are worth 1, tens 10, hundreds 100.", "Las unidades valen 1, las decenas 10 y las centenas 100."),
            tr(locale, `The ${dg} is in the ${placeName} place.`, `El ${dg} está en el lugar de ${placeName}.`),
          ],
          steps: [tr(locale, `The ${dg} is in the ${placeName} place.`, `El ${dg} está en el lugar de ${placeName}.`), tr(locale, `${many(dg, w, "en")} is ${value}.`, `${many(dg, w, "es")} ${dg === 1 ? "es" : "son"} ${value}.`)],
          seconds: 10,
        };
      }
      const h = r.int(1, 9);
      let t: number, o: number;
      if (r.bool()) {
        if (r.bool()) {
          t = 0;
          o = r.int(1, 9);
        } else {
          t = r.int(1, 9);
          o = 0;
        }
      } else {
        t = r.int(1, 9);
        o = r.int(1, 9);
      }
      const n = h * 100 + t * 10 + o, rest = t * 10 + o;
      if (r.bool()) {
        const w = words(n, locale);
        return {
          prompt: [tr(locale, `Write the number ${w}.`, `Escribe el número ${w}.`)],
          say: tr(locale, `Write the number ${w}.`, `Escribe el número ${w}.`),
          input: "keypad",
          answer: { kind: "number", value: n },
          wrong: misses(n, [[Number(`${h * 100}${rest}`), "wrote-each-part"], t === 0 ? [h * 10 + o, "dropped-the-zero"] : null, rest >= 13 && rest <= 19 ? [h * 100 + (rest - 10) * 10, "teen-for-tens"] : null, o === 0 && t >= 2 ? [h * 100 + 10 + t, "teen-for-tens"] : null]),
          hints: [
            tr(locale, "Say the number in parts: hundreds, then the rest.", "Di el número por partes: centenas y luego el resto."),
            t === 0 ? tr(locale, "No tens? Write 0 in the tens place.", "¿No hay decenas? Escribe 0 en el lugar de las decenas.") : tr(locale, "Write one digit each for hundreds, tens and ones.", "Escribe una cifra para centenas, decenas y unidades."),
            tr(locale, `${cap(enWords(h * 100))} is ${h * 100}.`, `${cap(esWords(h * 100))} es ${h * 100}.`),
          ],
          steps: [`${cap(place(h, t, o, locale))}.`, tr(locale, `We write ${n}.`, `Se escribe ${n}.`)],
          seconds: 12,
        };
      }
      const wrongs: [number, string][] = [];
      if (t !== o) wrongs.push([h * 100 + o * 10 + t, "swapped-tens-and-ones"]);
      if (rest >= 13 && rest <= 19) wrongs.push([h * 100 + (rest - 10) * 10, "teen-for-tens"]);
      if (o === 0 && t >= 2) wrongs.push([h * 100 + 10 + t, "teen-for-tens"]);
      wrongs.push([n + 100 <= 999 ? n + 100 : n - 100, "wrong-hundreds"]);
      const firstWord = tr(locale, `${EN_SMALL[h]} hundred`, ES_HUNDREDS[h]);
      return {
        prompt: [tr(locale, `Which words name ${n}?`, `¿Qué palabras nombran el ${n}?`)],
        say: tr(locale, `Which words name ${n}?`, `¿Qué palabras nombran el ${n}?`),
        ...choose(
          r,
          { label: words(n, locale), say: words(n, locale) },
          wrongs.slice(0, 3).map(([v, why]) => ({ label: words(v, locale), say: words(v, locale), why })),
        ),
        hints: [
          tr(locale, "Read the hundreds first.", "Lee primero las centenas."),
          tr(locale, "Then read the last two digits as one number.", "Luego lee las dos últimas cifras como un número."),
          tr(locale, `${n} starts with ${firstWord}.`, `${n} empieza con ${firstWord}.`),
        ],
        steps: [`${cap(place(h, t, o, locale))}.`, words(n, locale)],
        seconds: 12,
      };
    },
  },
  {
    id: "m.compare.1000",
    subject: "math",
    grade: "2",
    title: { en: "Compare three-digit numbers", es: "Comparar números de tres cifras" },
    standard: "2.NBT.A.4",
    prereqs: ["m.compare.100", "m.place.1000"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      let a: number, b: number, mode: "h" | "t" | "o" | "expanded" | "digits";
      if (level === 1) {
        a = r.int(100, 999);
        b = r.int(100, 999);
        while (Math.floor(b / 100) === Math.floor(a / 100)) b = r.int(100, 999);
        mode = "h";
      } else if (level === 2) {
        const h = r.int(1, 9);
        a = h * 100 + r.int(0, 99);
        b = h * 100 + r.int(0, 99);
        while (Math.floor(b / 10) === Math.floor(a / 10)) b = h * 100 + r.int(0, 99);
        mode = "t";
      } else {
        const k = r.int(0, 2);
        if (k === 0) {
          const base = r.int(10, 99) * 10;
          a = base + r.int(0, 9);
          b = r.bool(0.25) ? a : base + r.int(0, 9);
          mode = "o";
        } else if (k === 1) {
          a = r.int(101, 999);
          while ([Math.floor(a / 100), Math.floor(a / 10) % 10, a % 10].filter((d) => d > 0).length < 2) a = r.int(101, 999);
          b = r.bool(0.3) ? a : Math.floor(a / 100) * 100 + r.int(0, 99);
          mode = "expanded";
        } else {
          const [x, y, z] = r.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          a = x * 100 + y * 10 + z;
          b = r.bool() ? z * 100 + y * 10 + x : y * 100 + x * 10 + z;
          mode = "digits";
        }
      }
      const left = mode === "expanded" ? [Math.floor(a / 100) * 100, (Math.floor(a / 10) % 10) * 10, a % 10].filter((v) => v > 0).join(" + ") : String(a);
      const cmp = (p: number, q: number) => (p < q ? 0 : p > q ? 1 : 2);
      const want = cmp(a, b);
      const onesFirst = cmp(a % 10, b % 10);
      const sorted = (v: number) => String(v).split("").sort().join("");
      const sameDigits = sorted(a) === sorted(b);
      const SYM = ["<", ">", "="];
      const says = [tr(locale, "is less than", "es menor que"), tr(locale, "is greater than", "es mayor que"), tr(locale, "is equal to", "es igual a")];
      const choices: Choice[] = SYM.map((label, i) => {
        if (i === want) return { label, say: says[i] };
        if (want === 2) return { label, say: says[i], why: "missed-equal-numbers" };
        if (i === 2) return { label, say: says[i], why: sameDigits ? "same-digits-means-equal" : "said-equal-when-different" };
        return { label, say: says[i], why: onesFirst === i ? "compared-ones-first" : "flipped-the-symbol" };
      });
      const [ha, hb] = [Math.floor(a / 100), Math.floor(b / 100)];
      const [ta, tb] = [Math.floor(a / 10) % 10, Math.floor(b / 10) % 10];
      const [oa, ob] = [a % 10, b % 10];
      const moreLess = (p: number, q: number) => (p > q ? tr(locale, "more", "más") : tr(locale, "less", "menos"));
      const hundredsLine = tr(locale, `${a} has ${many(ha, "hundred", "en")}. ${b} has ${hb}.`, `${a} tiene ${many(ha, "hundred", "es")}. ${b} tiene ${hb}.`);
      const final = `${left} ${SYM[want]} ${b}`;
      let hints: string[], steps: string[];
      if (mode === "h" || mode === "digits") {
        hints = [
          mode === "digits" ? tr(locale, "The digits are the same, but in other places.", "Las cifras son las mismas, pero en otros lugares.") : tr(locale, "Look at the hundreds first.", "Mira primero las centenas."),
          tr(locale, "More hundreds means a greater number.", "Más centenas quiere decir un número mayor."),
          hundredsLine,
        ];
        steps = [tr(locale, `${many(ha, "hundred", "en")} is ${moreLess(ha, hb)} than ${many(hb, "hundred", "en")}.`, `${many(ha, "hundred", "es")} ${ha === 1 ? "es" : "son"} ${moreLess(ha, hb)} que ${many(hb, "hundred", "es")}.`), final];
      } else if (mode === "t") {
        hints = [
          tr(locale, "Look at the hundreds first.", "Mira primero las centenas."),
          tr(locale, "The hundreds match, so compare the tens.", "Las centenas son iguales, así que compara las decenas."),
          tr(locale, `${a} has ${many(ta, "ten", "en")}. ${b} has ${tb}.`, `${a} tiene ${many(ta, "ten", "es")}. ${b} tiene ${tb}.`),
        ];
        steps = [tr(locale, `Same hundreds. ${many(ta, "ten", "en")} is ${moreLess(ta, tb)} than ${many(tb, "ten", "en")}.`, `Mismas centenas. ${many(ta, "ten", "es")} ${ta === 1 ? "es" : "son"} ${moreLess(ta, tb)} que ${many(tb, "ten", "es")}.`), final];
      } else if (mode === "o") {
        hints = [
          tr(locale, "Look at the hundreds first.", "Mira primero las centenas."),
          tr(locale, "Hundreds and tens match, so compare the ones.", "Las centenas y las decenas son iguales, así que compara las unidades."),
          tr(locale, `${a} has ${many(oa, "one", "en")}. ${b} has ${ob}.`, `${a} tiene ${many(oa, "one", "es")}. ${b} tiene ${ob}.`),
        ];
        steps = [
          oa === ob
            ? tr(locale, "Same hundreds, tens and ones.", "Mismas centenas, decenas y unidades.")
            : tr(locale, `Same hundreds and tens. ${many(oa, "one", "en")} is ${moreLess(oa, ob)} than ${many(ob, "one", "en")}.`, `Mismas centenas y decenas. ${many(oa, "one", "es")} ${oa === 1 ? "es" : "son"} ${moreLess(oa, ob)} que ${many(ob, "one", "es")}.`),
          final,
        ];
      } else {
        hints = [
          tr(locale, "Write the left side as one number.", "Escribe el lado izquierdo como un solo número."),
          tr(locale, "Then compare hundreds, tens and ones.", "Luego compara centenas, decenas y unidades."),
          `${left}: ${place(ha, ta, oa, locale)}.`,
        ];
        steps = want === 2 ? [tr(locale, `Both sides are ${a}.`, `Los dos lados son ${a}.`), final] : [`${left} = ${a}`, final];
      }
      return {
        prompt: [`${left} `, blank, ` ${b}`],
        say: tr(locale, `Compare ${plusWords(left, "en")} and ${b}.`, `Compara ${plusWords(left, "es")} y ${b}.`),
        choices,
        input: "choices",
        answer: { kind: "choice", index: want },
        hints,
        steps,
        seconds: 8,
      };
    },
  },
  {
    id: "m.odd.even",
    subject: "math",
    grade: "2",
    title: { en: "Odd and even", es: "Pares e impares" },
    standard: "2.OA.C.3",
    prereqs: ["m.skip.count"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const EVEN: Choice = { label: tr(locale, "Even", "Par"), say: tr(locale, "Even", "Par") };
      const ODD: Choice = { label: tr(locale, "Odd", "Impar"), say: tr(locale, "Odd", "Impar") };
      const misleads = (v: number) => (v % 10 === 0 ? "thought-zero-is-odd" : v >= 10 && Math.floor(v / 10) % 2 !== v % 2 ? "looked-at-the-tens-digit" : null);
      if (level === 3) {
        if (r.bool()) {
          const k = r.int(2, 10), n = 2 * k;
          const pair = (x: number, y: number, why?: string): Choice => ({ label: `${x} + ${y}`, say: tr(locale, `${x} plus ${y}`, `${x} más ${y}`), ...(why ? { why } : {}) });
          return {
            prompt: [tr(locale, `${n} is even. Which double makes ${n}?`, `${n} es par. ¿Qué doble forma ${n}?`)],
            say: tr(locale, `${n} is even. Which double makes ${n}?`, `${n} es par. ¿Qué doble forma ${n}?`),
            ...choose(r, pair(k, k), [pair(k - 1, k + 1, "not-a-double"), pair(k + 1, k + 1, "double-off-by-one"), pair(n, n, "doubled-the-number")]),
            hints: [
              tr(locale, "A double adds a number to itself.", "Un doble suma un número consigo mismo."),
              tr(locale, `Split ${n} into two equal parts.`, `Separa ${n} en dos partes iguales.`),
              tr(locale, `${k - 1} + ${k + 1} = ${n}, but those are not equal.`, `${k - 1} + ${k + 1} = ${n}, pero no son iguales.`),
            ],
            steps: [`${k} + ${k} = ${n}`],
            seconds: 10,
          };
        }
        const wantEven = r.bool();
        const pool = Array.from({ length: 18 }, (_, i) => i + 3);
        const key = r.pick(pool.filter((v) => (v % 2 === 0) === wantEven));
        const others = r.shuffle(pool.filter((v) => (v % 2 === 0) !== wantEven)).slice(0, 2);
        const text = wantEven ? tr(locale, "Which number is even?", "¿Qué número es par?") : tr(locale, "Which number is odd?", "¿Qué número es impar?");
        return {
          prompt: [text],
          say: text,
          ...choose(r, { label: String(key), say: String(key) }, others.map((v) => ({ label: String(v), say: String(v), why: misleads(v) ?? "mixed-up-odd-and-even" }))),
          hints: [
            tr(locale, "Look at the ones digit of each number.", "Mira la cifra de las unidades de cada número."),
            tr(locale, "Even numbers end in 0, 2, 4, 6 or 8.", "Los números pares terminan en 0, 2, 4, 6 u 8."),
            tr(locale, `${others[0]} ends in ${others[0] % 10}.`, `${others[0]} termina en ${others[0] % 10}.`),
          ],
          steps: [tr(locale, `${key} ends in ${key % 10}.`, `${key} termina en ${key % 10}.`), wantEven ? tr(locale, `${key} is even.`, `${key} es par.`) : tr(locale, `${key} is odd.`, `${key} es impar.`)],
          seconds: 10,
        };
      }
      const n = level === 1 ? r.int(4, 20) : r.int(3, 20);
      const even = n % 2 === 0;
      const k = Math.floor(n / 2);
      const pick = choose(r, even ? EVEN : ODD, [{ ...(even ? ODD : EVEN), why: misleads(n) ?? (even ? "miscounted-pairs" : "missed-the-leftover") }]);
      const verdict = even ? tr(locale, `${n} is even.`, `${n} es par.`) : tr(locale, `${n} is odd.`, `${n} es impar.`);
      if (level === 1)
        return {
          prompt: [tr(locale, "Is the number of dots even or odd?", "¿El número de puntos es par o impar?")],
          say: tr(locale, "Is the number of dots even or odd?", "¿El número de puntos es par o impar?"),
          visual: dots([n]),
          alt: tr(locale, "A group of dots in rows of five", "Un grupo de puntos en filas de cinco"),
          markable: true,
          ...pick,
          hints: [
            tr(locale, "Pair up the dots, two at a time.", "Junta los puntos de dos en dos."),
            tr(locale, "If one dot has no partner, the number is odd.", "Si un punto queda sin pareja, el número es impar."),
            tr(locale, "Count by twos: 2, 4, 6…", "Cuenta de dos en dos: 2, 4, 6…"),
          ],
          steps: [
            even ? tr(locale, `${n} dots make ${k} pairs, with none left over.`, `${n} puntos forman ${k} parejas y no sobra ninguno.`) : tr(locale, `${n} dots make ${k} pairs and 1 left over.`, `${n} puntos forman ${k} parejas y sobra 1.`),
            verdict,
          ],
          seconds: 15,
        };
      return {
        prompt: [tr(locale, `Is ${n} even or odd?`, `¿${n} es par o impar?`)],
        say: tr(locale, `Is ${n} even or odd?`, `¿${n} es par o impar?`),
        ...pick,
        hints: [
          tr(locale, "Look at the ones digit.", "Mira la cifra de las unidades."),
          tr(locale, "Ones of 0, 2, 4, 6 or 8 mean even.", "Si las unidades son 0, 2, 4, 6 u 8, es par."),
          tr(locale, `The ones digit of ${n} is ${n % 10}.`, `La cifra de las unidades de ${n} es ${n % 10}.`),
        ],
        steps: even
          ? [`${n} = ${k} + ${k}`, tr(locale, `${n} is a double, so it is even.`, `${n} es un doble, así que es par.`)]
          : [`${n} = ${k} + ${k} + 1`, tr(locale, `One is left over, so ${n} is odd.`, `Sobra uno, así que ${n} es impar.`)],
        seconds: 5,
      };
    },
  },
  {
    id: "m.array.add",
    subject: "math",
    grade: "2",
    title: { en: "Arrays and repeated addition", es: "Arreglos y suma repetida" },
    standard: "2.OA.C.4",
    prereqs: ["m.skip.count", "m.add.three"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const rows = r.int(2, 5);
      let cols = r.int(2, 5);
      while (rows === 2 && cols === 2) cols = r.int(2, 5);
      const total = rows * cols;
      const third = rows > 2 ? `${cols} + ${cols} = ${2 * cols}` : tr(locale, `Each row has ${cols}.`, `Cada fila tiene ${cols}.`);
      const wrong = misses(total, [[rows + cols, "added-rows-and-columns"], [total - cols, "missed-a-row"], [total + cols, "counted-a-row-twice"]]);
      const pic = { visual: { kind: "array" as const, rows, cols }, alt: tr(locale, "Dots in equal rows", "Puntos en filas iguales"), markable: true };
      if (level === 1)
        return {
          prompt: [tr(locale, "How many dots in all?", "¿Cuántos puntos hay en total?")],
          say: tr(locale, "How many dots in all?", "¿Cuántos puntos hay en total?"),
          ...pic,
          input: "keypad",
          answer: { kind: "number", value: total },
          wrong,
          hints: [tr(locale, "How many dots are in one row?", "¿Cuántos puntos hay en una fila?"), tr(locale, "Add that number once for each row.", "Suma ese número una vez por cada fila."), third],
          steps: [tr(locale, `${rows} rows of ${cols}.`, `${rows} filas de ${cols}.`), `${repeat(rows, cols)} = ${total}`],
          seconds: 15,
        };
      if (level === 2) {
        const sum = (k: number, v: number, why?: string): Choice => ({ label: repeat(k, v), say: plusWords(repeat(k, v), locale), ...(why ? { why } : {}) });
        return {
          prompt: [tr(locale, "Which addition matches the rows?", "¿Qué suma corresponde a las filas?")],
          say: tr(locale, "Which addition matches the rows?", "¿Qué suma corresponde a las filas?"),
          ...pic,
          ...choose(r, sum(rows, cols), [
            { label: `${cols} + ${rows}`, say: plusWords(`${cols} + ${rows}`, locale), why: "added-rows-and-columns" },
            rows > 2 ? sum(rows - 1, cols, "missed-a-row") : sum(rows, cols + 1, "miscounted-a-row"),
            sum(rows + 1, cols, "added-an-extra-row"),
          ]),
          hints: [
            tr(locale, "Count the dots in one row.", "Cuenta los puntos de una fila."),
            tr(locale, "Add that number once for each row.", "Suma ese número una vez por cada fila."),
            tr(locale, `There are ${rows} rows of ${cols}.`, `Hay ${rows} filas de ${cols}.`),
          ],
          steps: [tr(locale, `${rows} rows, ${cols} in each row.`, `${rows} filas, ${cols} en cada fila.`), `${repeat(rows, cols)} = ${total}`],
          seconds: 15,
        };
      }
      const story = r.pick(ROW_STORIES);
      const text = storyText(story, [rows, cols], "", "", locale);
      return {
        prompt: [text],
        say: text,
        picture: story.pic,
        alt: t2(locale, story.what),
        input: "keypad",
        answer: { kind: "number", value: total },
        wrong,
        hints: [tr(locale, "How many rows? How many in each row?", "¿Cuántas filas hay? ¿Cuántos hay en cada fila?"), tr(locale, `Add ${cols} once for each row.`, `Suma ${cols} una vez por cada fila.`), third],
        steps: [`${repeat(rows, cols)} = ${total}`],
        seconds: 40,
      };
    },
  },
  {
    id: "m.numberline.100",
    subject: "math",
    grade: "2",
    title: { en: "Jumps on a number line to 100", es: "Saltos en la recta numérica hasta 100" },
    standard: "2.MD.B.6",
    prereqs: ["m.mental.100"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      if (level === 3 && r.bool()) {
        const fwd = r.bool(), k = r.int(2, 4);
        const s = fwd ? r.int(0, 10 - k) * 10 : r.int(k, 10) * 10;
        const step = fwd ? 10 : -10;
        const land = s + step * k;
        const path = Array.from({ length: k + 1 }, (_, i) => s + step * i);
        const text = tr(locale, `Start at ${s}. Jump ${fwd ? "forward" : "back"} 10, ${k} times. Tap where you land.`, `Empieza en ${s}. Salta 10 hacia ${fwd ? "adelante" : "atrás"}, ${k} veces. Toca donde caes.`);
        return {
          prompt: [text],
          say: text,
          visual: { kind: "number-line", min: 0, max: 100, marks: Array.from({ length: 11 }, (_, i) => i * 10), marker: s },
          alt: tr(locale, `A number line from 0 to 100 by tens, with a dot at ${s}`, `Una recta numérica del 0 al 100 de diez en diez, con un punto en el ${s}`),
          input: "number-line",
          pad: { kind: "number-line", min: 0, max: 100, step: 10 },
          answer: { kind: "number", value: land },
          wrong: misses(land, [[land - step, "miscounted-jumps"], [land + step, "miscounted-jumps"], [s - step * k, "jumped-the-wrong-way"]]).filter((w) => Number(w.value) <= 100),
          hints: [
            tr(locale, "Each jump is 10.", "Cada salto es de 10."),
            tr(locale, `Make ${k} jumps of 10, ${fwd ? "forward" : "back"}.`, `Da ${k} saltos de 10 hacia ${fwd ? "adelante" : "atrás"}.`),
            tr(locale, `The first jump lands on ${s + step}.`, `El primer salto cae en el ${s + step}.`),
          ],
          steps: [path.join(", "), tr(locale, `You land on ${land}.`, `Caes en el ${land}.`)],
          seconds: 15,
        };
      }
      const back = level === 2 || (level === 3 && r.bool());
      let s: number, j: number;
      if (level === 3) {
        j = r.pick([10, 20]);
        s = (back ? r.int(3, 9) : r.int(1, 7)) * 10 + r.int(1, 9);
      } else if (!back) {
        const cross = r.bool(0.7);
        const o = cross ? r.int(2, 9) : r.int(0, 7);
        j = cross ? r.int(Math.max(2, 10 - o), 9) : r.int(2, 9 - o);
        s = r.int(1, 8) * 10 + o;
      } else {
        const cross = r.bool(0.7);
        const o = cross ? r.int(0, 7) : r.int(2, 9);
        j = cross ? r.int(Math.max(2, o + 1), 9) : r.int(2, o);
        s = r.int(2, 9) * 10 + o;
      }
      const land = back ? s - j : s + j;
      const width = level === 3 ? 30 : 20;
      let lo = Math.floor(Math.min(s, land) / 10) * 10, hi = lo + width;
      if (hi > 100) {
        hi = 100;
        lo = hi - width;
      }
      const op = back ? "−" : "+";
      const o = s % 10;
      const crossFwd = !back && j < 10 && o > 0 && o + j > 10;
      const crossBack = back && j < 10 && o > 0 && j > o;
      const text = tr(locale, `Start at ${s}. Jump ${back ? "back" : "forward"} ${j}. Tap where you land.`, `Empieza en ${s}. Salta ${j} hacia ${back ? "atrás" : "adelante"}. Toca donde caes.`);
      let third: string, steps: string[];
      if (crossFwd) {
        const a = 10 - o, ten = s + a;
        third = tr(locale, `${s} + ${a} = ${ten}. Then ${j - a} more.`, `${s} + ${a} = ${ten}. Luego ${j - a} más.`);
        steps = [`${s} + ${a} = ${ten}`, `${ten} + ${j - a} = ${land}`];
      } else if (crossBack) {
        const ten = s - o;
        third = tr(locale, `${s} − ${o} = ${ten}. Then ${j - o} more.`, `${s} − ${o} = ${ten}. Luego ${j - o} más.`);
        steps = [`${s} − ${o} = ${ten}`, `${ten} − ${j - o} = ${land}`];
      } else if (j === 10) {
        third = tr(locale, `The ones digit stays ${o}.`, `La cifra de las unidades sigue siendo ${o}.`);
        steps = [`${s} ${op} ${j} = ${land}`];
      } else if (j === 20) {
        third = tr(locale, `The first jump of 10 lands on ${back ? s - 10 : s + 10}.`, `El primer salto de 10 cae en el ${back ? s - 10 : s + 10}.`);
        steps = [`${s} ${op} 10 = ${back ? s - 10 : s + 10}`, `${back ? s - 10 : s + 10} ${op} 10 = ${land}`];
      } else {
        third = tr(locale, `The first jump lands on ${back ? s - 1 : s + 1}.`, `El primer salto cae en el ${back ? s - 1 : s + 1}.`);
        steps = [`${s} ${op} ${j} = ${land}`];
      }
      const wrongTags: Tag[] =
        j >= 10
          ? [[j === 10 ? (back ? land - 10 : land + 10) : back ? land + 10 : land - 10, "miscounted-jumps"], [back ? s + j : s - j, "jumped-the-wrong-way"], [back ? s - j / 10 : s + j / 10, "jumped-ones-not-tens"]]
          : back
            ? [[land + 1, "counted-the-start"], [land - 1, "jumped-one-too-many"], [s + j, "jumped-the-wrong-way"]]
            : [[land - 1, "counted-the-start"], [land + 1, "jumped-one-too-many"], [s - j, "jumped-the-wrong-way"]];
      return {
        prompt: [text],
        say: text,
        visual: { kind: "number-line", min: lo, max: hi, marks: Array.from({ length: width / 5 + 1 }, (_, i) => lo + i * 5), denominator: 1, marker: s },
        alt: tr(locale, `A number line from ${lo} to ${hi}, with a dot at ${s}`, `Una recta numérica del ${lo} al ${hi}, con un punto en el ${s}`),
        input: "number-line",
        pad: { kind: "number-line", min: lo, max: hi, step: 1 },
        answer: { kind: "number", value: land },
        wrong: misses(land, wrongTags).filter((w) => Number(w.value) >= lo && Number(w.value) <= hi),
        hints: [
          j >= 10 ? tr(locale, "A jump of 10 changes only the tens.", "Un salto de 10 cambia solo las decenas.") : tr(locale, "Each tick is 1.", "Cada marca es 1."),
          j >= 10
            ? tr(locale, `Jump ${j === 10 ? "one ten" : "two tens"}, ${back ? "back" : "forward"}.`, `Salta ${j === 10 ? "una decena" : "dos decenas"} hacia ${back ? "atrás" : "adelante"}.`)
            : tr(locale, `Make ${j} jumps of 1, ${back ? "back" : "forward"}.`, `Da ${j} saltos de 1 hacia ${back ? "atrás" : "adelante"}.`),
          third,
        ],
        steps,
        seconds: 15,
      };
    },
  },
  {
    id: "m.money.count",
    subject: "math",
    grade: "2",
    title: { en: "Count money: coins and bills", es: "Contar dinero: monedas y billetes" },
    standard: "2.MD.C.8",
    prereqs: ["m.skip.count", "m.add.2digit"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      if (level === 3 && r.bool()) {
        const types = r.shuffle([20, 10, 5, 1]).slice(0, 2).sort((p, q) => q - p);
        const max: Record<number, number> = { 20: 2, 10: 3, 5: 3, 1: 9 };
        const bills: [number, number][] = types.map((v) => [v, r.int(1, max[v])]);
        const total = bills.reduce((s, [v, n]) => s + v * n, 0);
        const text = `${tr(locale, `You have ${billText(bills, "en")}.`, `Tienes ${billText(bills, "es")}.`)} ${tr(locale, "How many dollars in all?", "¿Cuántos dólares tienes en total?")}`;
        const subs = bills.map(([v, n]) => v * n);
        const [bv, bn] = bills[0];
        return {
          prompt: [`${text} $`, blank],
          say: `${tr(locale, `You have ${billText(bills, "en", true)}.`, `Tienes ${billText(bills, "es", true)}.`)} ${tr(locale, "How many dollars in all?", "¿Cuántos dólares tienes en total?")}`,
          picture: "💵",
          alt: tr(locale, "Dollar bills", "Billetes de dólar"),
          input: "keypad",
          answer: { kind: "number", value: total },
          wrong: misses(total, [[bills.reduce((s, [, n]) => s + n, 0), "counted-bills-not-value"], [types.reduce((s, v) => s + v, 0), "ignored-how-many-bills"]]),
          hints: [
            tr(locale, "Start with the bill worth the most.", "Empieza con el billete que vale más."),
            tr(locale, `Count on: by ${types.join(", then by ")}.`, `Cuenta ${join(types.map((v) => `de ${v} en ${v}`), "es")}.`),
            bn === 1 ? tr(locale, `One $${bv} bill is $${bv}.`, `Un billete de $${bv} es $${bv}.`) : tr(locale, `${bn} $${bv} bills make $${bv * bn}.`, `${bn} billetes de $${bv} son $${bv * bn}.`),
          ],
          steps: [subs.length > 1 ? `${subs.join(" + ")} = ${total}` : String(total), tr(locale, `You have $${total}.`, `Tienes $${total}.`)],
          seconds: 30,
        };
      }
      if (level === 3) {
        const pairs = [[QUARTER, DIME], [QUARTER, NICKEL], [QUARTER, PENNY], [DIME, NICKEL], [DIME, PENNY], [NICKEL, PENNY]] as const;
        const [c1, c2] = r.pick(pairs);
        const top: Record<number, number> = { 25: 3, 10: 4, 5: 3, 1: 4 };
        const purse: Purse = [[c1, r.int(1, top[c1.v])], [c2, r.int(1, top[c2.v])]];
        const target = purseValue(purse);
        const small = purse[1][0];
        const more: Purse = tidy([...purse, [small, 1]]);
        const fewer: Purse = purse[0][1] >= 2 ? tidy([[purse[0][0], purse[0][1] - 1], purse[1]]) : tidy([purse[0], [purse[1][0], purse[1][1] - 1]]);
        const swapFrom = purse.find(([c]) => c === DIME) ? DIME : purse.find(([c]) => c === NICKEL) ? NICKEL : null;
        const swapped: Purse | null = swapFrom ? tidy([...purse.map(([c, n]) => [c, c === swapFrom ? n - 1 : n] as [Coin, number]), [swapFrom === DIME ? NICKEL : DIME, 1]]) : null;
        const opt = (p: Purse, why?: string): Choice => ({ label: purseText(p, locale), say: purseText(p, locale, true), ...(why ? { why } : {}) });
        const wrongs = [swapped ? opt(swapped, "swapped-nickel-and-dime") : null, opt(more, "counted-one-too-many"), fewer.length ? opt(fewer, "counted-one-too-few") : null].filter((c): c is Choice => c !== null);
        const check = swapped ?? more;
        return {
          prompt: [tr(locale, `Which coins make ${target}¢?`, `¿Qué monedas forman ${target}¢?`)],
          say: tr(locale, `Which coins make ${target} cents?`, `¿Qué monedas forman ${target} centavos?`),
          picture: "💰",
          alt: tr(locale, "Coins", "Monedas"),
          ...choose(r, opt(purse), wrongs),
          hints: [
            tr(locale, "Find the value of each set.", "Busca cuánto vale cada grupo."),
            tr(locale, "Count on from the coin worth the most.", "Cuenta desde la moneda que vale más."),
            tr(locale, `Check: ${purseText(check, "en")}. That is ${purseValue(check)}¢.`, `Revisa: ${purseText(check, "es")}. Eso es ${purseValue(check)}¢.`),
          ],
          steps: [`${cap(purseText(purse, locale))}.`, `${purse.map(([c, n]) => c.v * n).join(" + ")} = ${target}`, tr(locale, `They make ${target}¢.`, `Forman ${target}¢.`)],
          seconds: 30,
        };
      }
      let purse: Purse;
      if (level === 1) {
        const kinds = r.bool() ? [DIME, NICKEL, PENNY] : r.shuffle([DIME, NICKEL, PENNY]).slice(0, 2);
        const top: Record<number, number> = { 10: 5, 5: 3, 1: 9 };
        purse = tidy(kinds.map((c) => [c, r.int(1, top[c.v])] as [Coin, number]));
      } else {
        const others = r.shuffle([DIME, NICKEL, PENNY]).slice(0, r.int(1, 2));
        const top: Record<number, number> = { 10: 2, 5: 2, 1: 9 };
        purse = tidy([[QUARTER, r.int(1, others.length === 2 ? 2 : 3)], ...others.map((c) => [c, r.int(1, top[c.v])] as [Coin, number])]);
      }
      const shown = level === 2 && r.bool(0.3) ? r.shuffle(purse) : purse;
      const total = purseValue(purse);
      const dimes = purse.find(([c]) => c === DIME)?.[1] ?? 0, nickels = purse.find(([c]) => c === NICKEL)?.[1] ?? 0, pennies = purse.find(([c]) => c === PENNY)?.[1] ?? 0;
      const ask = tr(locale, "How many cents in all?", "¿Cuántos centavos tienes en total?");
      const [bc, bn] = purse[0];
      const subs = purse.map(([c, n]) => c.v * n);
      const name = (c: Coin, n: number) => (locale === "es" ? c.es : c.en)[n === 1 ? 0 : 1];
      return {
        prompt: [`${tr(locale, `You have ${purseText(shown, "en")}.`, `Tienes ${coinsEs(shown)}.`)} ${ask} `, blank, "¢"],
        say: `${tr(locale, `You have ${purseText(shown, "en")}.`, `Tienes ${coinsEs(shown, true)}.`)} ${ask}`,
        picture: "💰",
        alt: tr(locale, "Coins", "Monedas"),
        input: "keypad",
        answer: { kind: "number", value: total },
        wrong: misses(total, [[purseCount(purse), "counted-coins-not-value"], dimes + nickels > 0 ? [total - 5 * dimes + 5 * nickels, "swapped-nickel-and-dime"] : null, pennies > 0 && purse.length > 1 ? [total - pennies, "left-out-the-pennies"] : null]),
        hints: [
          tr(locale, `Start with the coin worth the most. A ${bc.en[0]} is ${bc.v}¢.`, `Empieza con las monedas que valen más: ${bc.es[1]}.`),
          tr(locale, `Count on: by ${purse.map(([c]) => c.v).join(", then by ")}.`, `Cuenta ${join(purse.map(([c]) => `de ${c.v} en ${c.v}`), "es")}.`),
          bn === 1 ? tr(locale, `1 ${bc.en[0]} is ${bc.v}¢.`, `1 ${bc.es[0]} es ${bc.v}¢.`) : tr(locale, `${bn} ${bc.en[1]} make ${bc.v * bn}¢.`, `${bn} ${bc.es[1]} son ${bc.v * bn}¢.`),
        ],
        steps: [purse.map(([c, n]) => `${n} ${name(c, n)}: ${c.v * n}¢`).join(". ") + ".", `${subs.join(" + ")} = ${total}`, tr(locale, `You have ${total}¢.`, `Tienes ${total}¢.`)],
        seconds: level === 1 ? 25 : 30,
      };
    },
  },
  {
    id: "m.time.5min",
    subject: "math",
    grade: "2",
    title: { en: "Set the clock to 5 minutes; a.m. and p.m.", es: "Poner el reloj de 5 en 5 minutos; a. m. y p. m." },
    standard: "2.MD.C.7",
    prereqs: ["m.time.set", "m.skip.count"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      if (level === 3) {
        const ev = r.pick(EVENTS);
        const AM: Choice = { label: tr(locale, "a.m.", "a. m."), say: tr(locale, "a.m.", "a. m.") };
        const PM: Choice = { label: tr(locale, "p.m.", "p. m."), say: tr(locale, "p.m.", "p. m.") };
        const why = ev.t.startsWith("12:") ? "thought-noon-is-am" : "mixed-up-am-and-pm";
        const key = ev.pm ? PM : AM;
        const text = `${tr(locale, ev.en, ev.es)} ${tr(locale, "Is it a.m. or p.m.?", "¿Es a. m. o p. m.?")}`;
        return {
          prompt: [text],
          say: text,
          ...choose(r, key, [{ ...(ev.pm ? AM : PM), why }]),
          hints: [
            tr(locale, "Is it morning, afternoon or night?", "¿Es en la mañana, en la tarde o en la noche?"),
            tr(locale, "a.m. is from midnight to noon. p.m. is from noon to midnight.", "a. m. va de la medianoche al mediodía. p. m. va del mediodía a la medianoche."),
            t2(locale, ev.when),
          ],
          steps: [t2(locale, ev.when), `${ev.t} ${key.label}`],
          seconds: 8,
        };
      }
      const h = r.int(1, 12);
      const m = level === 1 ? r.pick([5, 10, 15, 20, 25, 35, 40, 45, 50, 55]) : r.pick([5, 10, 15, 20, 25, 30]);
      const time = hh(h, m);
      const next = (h % 12) + 1;
      const enWords = m === 15 ? `quarter past ${h}` : m === 30 ? `half past ${h}` : `${m} minutes after ${h}`;
      const esWords = `${las(h)} ${h} y ${m === 15 ? "cuarto" : m === 30 ? "media" : m}`;
      const text = level === 1 ? tr(locale, `Show ${time} on the clock.`, `Marca ${las(h)} ${time} en el reloj.`) : tr(locale, `Show ${enWords} on the clock.`, `Marca ${esWords} en el reloj.`);
      return {
        prompt: [text],
        say: level === 1 ? tr(locale, `Show ${h} ${m === 5 ? "oh 5" : m} on the clock.`, `Marca ${las(h)} ${h} y ${m} en el reloj.`) : text,
        input: "clock",
        pad: { kind: "clock", stepMinutes: 5 },
        answer: { kind: "text", accept: [time] },
        wrong: misses(time, [m >= 30 ? [hh(next, m), "used-the-next-hour"] : null, m === 5 || m === 10 ? [hh(h, m * 5), "pointed-at-the-minute-number"] : null, [hh(m / 5, (h * 5) % 60), "swapped-the-hands"]]),
        hints: [
          tr(locale, "The short hand shows the hour. The long hand shows the minutes.", "La manecilla corta marca la hora. La larga marca los minutos."),
          tr(locale, "For the long hand, each number is 5 minutes.", "Para la manecilla larga, cada número vale 5 minutos."),
          tr(locale, `For ${m} minutes, the long hand points to ${m / 5}.`, `Para ${m} minutos, la manecilla larga apunta al ${m / 5}.`),
        ],
        steps: [
          tr(locale, `Long hand on ${m / 5}: ${m} minutes.`, `Manecilla larga en el ${m / 5}: ${m} minutos.`),
          tr(locale, `Short hand between ${h} and ${next}.`, `Manecilla corta entre el ${h} y el ${next}.`),
          time,
        ],
        seconds: 15,
      };
    },
  },
  {
    id: "m.measure.ruler",
    subject: "math",
    grade: "2",
    title: { en: "Measure in inches and centimeters", es: "Medir en pulgadas y centímetros" },
    standard: "2.MD.A.1",
    prereqs: ["m.measure.units"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      if (level === 3) {
        if (r.bool()) {
          const u = r.bool() ? INCH : CM;
          const thing = r.pick([["ribbon", "cinta"], ["string", "cuerda"], ["paper strip", "tira de papel"]] as const);
          const colors = r.shuffle([["red", "roja"], ["blue", "azul"], ["green", "verde"], ["yellow", "amarilla"]] as const);
          const [c1, c2] = colors;
          const A = r.int(10, 40), B = r.int(5, A - 3), d = A - B;
          const ab = t2(locale, u.abbr);
          const text = tr(
            locale,
            `A ${c1[0]} ${thing[0]} is ${A} ${ab} long. A ${c2[0]} ${thing[0]} is ${B} ${ab} long. How much longer is the ${c1[0]} ${thing[0]}?`,
            `Una ${thing[1]} ${c1[1]} mide ${A} ${ab}. Una ${thing[1]} ${c2[1]} mide ${B} ${ab}. ¿Cuánto más larga es la ${thing[1]} ${c1[1]}?`,
          );
          const tf = tensFirst(A, "−", B, locale);
          return {
            prompt: [`${text} `, blank, ` ${ab}`],
            say: text,
            picture: "📏",
            alt: tr(locale, "A ruler", "Una regla"),
            input: "keypad",
            answer: { kind: "number", value: d },
            wrong: misses(d, [[A + B, "added-instead-of-compared"], [A, "gave-a-length"], [B, "gave-a-length"]]),
            hints: [tr(locale, "Which is longer? By how much?", "¿Cuál es más larga? ¿Por cuánto?"), tr(locale, "Subtract the shorter length from the longer one.", "Resta la medida más corta de la más larga."), tf.hint],
            steps: tf.steps,
            seconds: 30,
          };
        }
        const [n, m] = twoNames(r);
        const o = r.pick(THINGS);
        const cmFirst = r.bool();
        const [inchName, cmName] = cmFirst ? [m, n] : [n, m];
        const text = cmFirst
          ? tr(locale, `${n} measures a ${o.en} in centimeters. ${m} measures it in inches. Who gets the bigger number?`, `${n} mide ${un(o)} ${o.es} en centímetros. ${m} ${o.f ? "la" : "lo"} mide en pulgadas. ¿Quién obtiene el número más grande?`)
          : tr(locale, `${n} measures a ${o.en} in inches. ${m} measures it in centimeters. Who gets the bigger number?`, `${n} mide ${un(o)} ${o.es} en pulgadas. ${m} ${o.f ? "la" : "lo"} mide en centímetros. ¿Quién obtiene el número más grande?`);
        const same = tr(locale, "Both get the same number", "Los dos obtienen el mismo número");
        return {
          prompt: [text],
          say: text,
          picture: o.pic,
          alt: tr(locale, `A ${o.en}`, `${cap(un(o))} ${o.es}`),
          ...choose(r, { label: cmName, say: cmName }, [{ label: inchName, say: inchName, why: "bigger-unit-bigger-number" }, { label: same, say: same, why: "unit-size-does-not-matter" }]),
          hints: [
            tr(locale, "Which unit is longer: an inch or a centimeter?", "¿Qué unidad es más larga: una pulgada o un centímetro?"),
            tr(locale, "Think: which unit fits along it more times?", "Piensa: ¿qué unidad cabe más veces a lo largo?"),
            tr(locale, "An inch is longer than a centimeter.", "Una pulgada es más larga que un centímetro."),
          ],
          steps: [
            tr(locale, "A centimeter is shorter than an inch.", "Un centímetro es más corto que una pulgada."),
            tr(locale, "More centimeters fit, so that number is bigger.", "Caben más centímetros, así que ese número es mayor."),
            tr(locale, `${cmName} gets the bigger number.`, `${cmName} obtiene el número más grande.`),
          ],
          seconds: 30,
        };
      }
      const u = r.bool() ? INCH : CM;
      const o = r.pick(THINGS);
      const [lo, hi] = o[u.key];
      const len = r.int(lo, level === 1 ? hi : Math.min(hi, u.max - 1));
      const s = level === 1 ? 0 : r.int(1, Math.min(3, u.max - len));
      const end = s + len;
      const ab = t2(locale, u.abbr);
      const text = tr(locale, `The ${o.en} starts at ${s}. It ends at the dot. How long is it?`, `${cap(el(o))} ${o.es} empieza en ${s}. Termina en el punto. ¿Cuánto mide?`);
      return {
        prompt: [`${text} `, blank, ` ${ab}`],
        say: text,
        picture: o.pic,
        visual: { kind: "number-line", min: 0, max: u.max, marks: Array.from({ length: u.max + 1 }, (_, i) => i), marker: end },
        alt: tr(locale, `A ruler from 0 to ${u.max} ${t2("en", u.many)}. A ${o.en} lies on it and ends at a dot.`, `Una regla del 0 al ${u.max} en ${t2("es", u.many)}. ${cap(un(o))} ${o.es} está encima y termina en un punto.`),
        input: "keypad",
        answer: { kind: "number", value: len },
        wrong: misses(len, level === 1 ? [[len + 1, "counted-the-marks"], [len - 1, "miscounted"]] : [[end, "read-the-end-number"], [len + 1, "counted-the-marks"]]),
        hints:
          level === 1
            ? [
                tr(locale, "The ruler starts at 0.", "La regla empieza en 0."),
                tr(locale, "Count spaces from 0 to the dot, not marks.", "Cuenta los espacios del 0 al punto, no las marcas."),
                tr(locale, `Each space is 1 ${t2("en", u.one)}.`, `Cada espacio es 1 ${t2("es", u.one)}.`),
              ]
            : [
                tr(locale, `The ${o.en} does not start at 0.`, `${cap(el(o))} ${o.es} no empieza en 0.`),
                tr(locale, "Subtract the start from the end.", "Resta el inicio del final."),
                tr(locale, `The dot is at ${end}.`, `El punto está en el ${end}.`),
              ],
        steps:
          level === 1
            ? [tr(locale, `The dot is at ${len}.`, `El punto está en el ${len}.`), tr(locale, `The ${o.en} is ${len} ${unitWord(u, len, "en")} long.`, `${cap(el(o))} ${o.es} mide ${len} ${unitWord(u, len, "es")}.`)]
            : [`${end} − ${s} = ${len}`, tr(locale, `The ${o.en} is ${len} ${unitWord(u, len, "en")} long.`, `${cap(el(o))} ${o.es} mide ${len} ${unitWord(u, len, "es")}.`)],
        seconds: level === 1 ? 10 : 20,
      };
    },
  },
  {
    id: "m.data.chart",
    subject: "math",
    grade: "2",
    title: { en: "Solve problems with data", es: "Resolver problemas con datos" },
    standard: "2.MD.D.10",
    prereqs: ["m.data.picture", "m.sub.2digit"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const theme = r.pick(THEMES4);
      const c = [r.int(3, 20), r.int(3, 20), r.int(3, 20), r.int(3, 20)];
      const q = level === 1 ? r.pick(["more", "pair"] as const) : level === 2 ? r.pick(["fewer", "all"] as const) : r.pick(["together", "not"] as const);
      const [xi, yi, zi] = r.shuffle([0, 1, 2, 3]);
      if (q === "more" || q === "fewer") while (c[xi] === c[yi]) c[yi] = r.int(3, 20);
      if (q === "together") while (c[xi] + c[yi] <= c[zi]) c[zi] = r.int(3, 20);
      // "more"/"fewer" compare the bigger of the two named counts with the smaller.
      const [bi, si] = c[xi] > c[yi] ? [xi, yi] : [yi, xi];
      const names = theme.cats.map((p) => t2(locale, p));
      const unit = t2(locale, theme.unit);
      const total = c[0] + c[1] + c[2] + c[3];
      const B = names[bi], S = names[si], X = names[xi], Y = names[yi], Z = names[zi];
      const question = {
        more: tr(locale, `How many more ${unit} for ${B} than for ${S}?`, `¿Cuántos ${unit} más hay para ${B} que para ${S}?`),
        fewer: tr(locale, `How many fewer ${unit} for ${S} than for ${B}?`, `¿Cuántos ${unit} menos hay para ${S} que para ${B}?`),
        pair: tr(locale, `How many ${unit} for ${X} and ${Y} together?`, `¿Cuántos ${unit} hay para ${X} y ${Y} juntos?`),
        all: tr(locale, `How many ${unit} in all?`, `¿Cuántos ${unit} hay en total?`),
        together: tr(locale, `${cap(X)} and ${Y} together: how many more ${unit} than ${Z}?`, `${cap(X)} y ${Y} juntos: ¿cuántos ${unit} más que ${Z}?`),
        not: tr(locale, `How many ${unit} were not for ${X}?`, `¿Cuántos ${unit} no fueron para ${X}?`),
      }[q];
      const chart = [t2(locale, theme.title), ...names.map((nm, i) => `${cap(nm)}: ${c[i]}`)].join("\n");
      const heard = `${t2(locale, theme.title)}. ${names.map((nm, i) => `${cap(nm)} ${c[i]}`).join(", ")}. ${question}`;
      const sum4 = `${c[0]} + ${c[1]} + ${c[2]} + ${c[3]}`;
      let key: number, wrong: (Tag | null)[], hints: string[], steps: string[];
      const find = (p: string, q2: string) => tr(locale, `Find ${p} and ${q2} in the chart.`, `Busca ${p} y ${q2} en la tabla.`);
      if (q === "more" || q === "fewer") {
        key = c[bi] - c[si];
        wrong = [[c[bi] + c[si], "added-instead-of-compared"], [c[bi], "gave-one-count"], [c[si], "gave-one-count"]];
        hints = [find(B, S), tr(locale, "To compare, subtract the smaller from the bigger.", "Para comparar, resta el menor del mayor."), `${cap(B)}: ${c[bi]}. ${cap(S)}: ${c[si]}.`];
        steps = [`${c[bi]} − ${c[si]} = ${key}`];
      } else if (q === "pair") {
        key = c[xi] + c[yi];
        wrong = [[Math.abs(c[xi] - c[yi]), "subtracted-instead-of-added"], [c[xi], "gave-one-count"], [c[yi], "gave-one-count"]];
        hints = [find(X, Y), tr(locale, "Together means add.", "Juntos quiere decir sumar."), `${cap(X)}: ${c[xi]}. ${cap(Y)}: ${c[yi]}.`];
        steps = [`${c[xi]} + ${c[yi]} = ${key}`];
      } else if (q === "all") {
        key = total;
        wrong = [[total - Math.min(...c), "left-out-a-group"], [total - Math.max(...c), "left-out-a-group"]];
        hints = [tr(locale, "Use every row of the chart.", "Usa todas las filas de la tabla."), tr(locale, "Add all four numbers.", "Suma los cuatro números."), `${c[0]} + ${c[1]} = ${c[0] + c[1]}`];
        steps = [`${sum4} = ${total}`];
      } else if (q === "together") {
        key = c[xi] + c[yi] - c[zi];
        wrong = [[c[xi] + c[yi], "did-only-one-step"], [c[xi] + c[yi] + c[zi], "added-all-three"], [Math.abs(c[xi] - c[zi]), "left-out-a-number"]];
        hints = [tr(locale, "This takes two steps.", "Esto lleva dos pasos."), tr(locale, `Add ${X} and ${Y}. Then compare with ${Z}.`, `Suma ${X} y ${Y}. Luego compara con ${Z}.`), `${c[xi]} + ${c[yi]} = ${c[xi] + c[yi]}`];
        steps = [`${c[xi]} + ${c[yi]} = ${c[xi] + c[yi]}`, `${c[xi] + c[yi]} − ${c[zi]} = ${key}`];
      } else {
        key = total - c[xi];
        wrong = [[total, "did-only-one-step"], [c[xi], "gave-one-count"]];
        hints = [tr(locale, "This takes two steps.", "Esto lleva dos pasos."), tr(locale, `Find the total. Then take away ${X}.`, `Busca el total. Luego quita ${X}.`), `${sum4} = ${total}`];
        steps = [`${sum4} = ${total}`, `${total} − ${c[xi]} = ${key}`];
      }
      return {
        prompt: [`${chart}\n${question}`],
        say: heard,
        input: "keypad",
        answer: { kind: "number", value: key },
        wrong: misses(key, wrong),
        hints,
        steps,
        seconds: level === 1 ? 30 : level === 2 ? 40 : 60,
      };
    },
  },
  {
    id: "m.shares.thirds",
    subject: "math",
    grade: "2",
    title: { en: "Halves, thirds and fourths", es: "Mitades, tercios y cuartos" },
    standard: "2.G.A.3",
    prereqs: ["m.shares.halves"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const D = [2, 3, 4] as const;
      const one = (d: 2 | 3 | 4, why?: string): Choice => ({ label: cap(t2(locale, SHARE[d].one)), say: cap(t2(locale, SHARE[d].one)), ...(why ? { why } : {}) });
      if (level === 1) {
        const d = r.pick([2, 3, 3, 4] as const);
        const sh = SHARE[d];
        // Some items shade the whole bar: two halves, three thirds, four fourths.
        const whole = r.bool(0.3);
        const allEn = d === 2 ? "both halves" : `all ${d} ${sh.pl[0]}`;
        const allEs = `${sh.f ? "las" : "los"} ${d} ${sh.pl[1]}`;
        const text = tr(locale, `Cut the bar into ${sh.pl[0]}. Shade ${whole ? allEn : sh.one[0]}.`, `Divide la barra en ${sh.pl[1]}. Colorea ${whole ? allEs : sh.one[1]}.`);
        return {
          prompt: [text],
          say: text,
          input: "fraction-bar",
          pad: { kind: "fraction-bar", maxParts: 4 },
          answer: { kind: "fraction", n: whole ? d : 1, d },
          wrong: whole
            ? misses(`${d}/${d}`, [[`1/${d}`, "shaded-one-share-not-whole"], [`${d - 1}/${d}`, "missed-a-share"]])
            : misses(`1/${d}`, [...D.filter((x) => x !== d).map((x): Tag => [`1/${x}`, `made-${SHARE[x].pl[0]}-not-${sh.pl[0]}`]), [`${d}/${d}`, "shaded-the-whole"]]),
          hints: [
            tr(locale, `${cap(sh.pl[0])} means ${d} equal parts.`, `${cap(sh.pl[1])} quiere decir ${d} partes iguales.`),
            whole ? tr(locale, `Make ${d} equal parts, then shade every part.`, `Haz ${d} partes iguales y colorea todas.`) : tr(locale, `Make ${d} equal parts, then shade one.`, `Haz ${d} partes iguales y colorea una.`),
            tr(locale, `Choose ${d} parts for the bar.`, `Elige ${d} partes para la barra.`),
          ],
          steps: [
            tr(locale, `The bar has ${d} equal parts.`, `La barra tiene ${d} partes iguales.`),
            whole ? tr(locale, `${d} ${sh.pl[0]} make the whole bar.`, `${d} ${sh.pl[1]} forman la barra entera.`) : tr(locale, `1 part is ${sh.one[0]}.`, `1 parte es ${sh.one[1]}.`),
          ],
          seconds: 15,
        };
      }
      if (level === 2) {
        const d = r.pick(D);
        const sh = SHARE[d];
        const pic = {
          visual: { kind: "fraction" as const, parts: d, shaded: 1 },
          alt: tr(locale, `A bar cut into ${d} equal parts. 1 part is shaded.`, `Una barra dividida en ${d} partes iguales. 1 parte está coloreada.`),
        };
        if (r.bool()) {
          const lab = (k: number, why?: string): Choice => {
            const label = `${k} ${k === 1 ? t2(locale, sh.sg) : t2(locale, sh.pl)}`;
            return { label, say: label, ...(why ? { why } : {}) };
          };
          const shadedSay = tr(locale, `${cap(sh.one[0])} is shaded.`, `${cap(sh.one[1])} está ${sh.f ? "coloreada" : "coloreado"}.`);
          const ask = tr(locale, `How many ${sh.pl[0]} make the whole bar?`, `¿${sh.f ? "Cuántas" : "Cuántos"} ${sh.pl[1]} forman la barra entera?`);
          return {
            prompt: [`${shadedSay} ${ask}`],
            say: `${shadedSay} ${ask}`,
            ...pic,
            ...choose(r, lab(d), [lab(1, "named-one-share-for-whole"), d === 2 ? lab(3, "counted-too-many-shares") : lab(d - 1, "counted-only-the-unshaded")]),
            hints: [
              tr(locale, "Count all the equal parts, shaded or not.", "Cuenta todas las partes iguales, coloreadas o no."),
              tr(locale, `The whole is all the ${sh.pl[0]} together.`, `El entero son ${sh.f ? "todas las" : "todos los"} ${sh.pl[1]} ${sh.f ? "juntas" : "juntos"}.`),
              tr(locale, "Touch each part as you count.", "Toca cada parte mientras cuentas."),
            ],
            steps: [tr(locale, `The bar has ${d} equal parts.`, `La barra tiene ${d} partes iguales.`), tr(locale, `${d} ${sh.pl[0]} make the whole bar.`, `${d} ${sh.pl[1]} forman la barra entera.`)],
            seconds: 10,
          };
        }
        return {
          prompt: [tr(locale, "What part of the bar is shaded?", "¿Qué parte de la barra está coloreada?")],
          say: tr(locale, "What part of the bar is shaded?", "¿Qué parte de la barra está coloreada?"),
          ...pic,
          ...choose(r, one(d), D.filter((x) => x !== d).map((x) => one(x, x === d - 1 ? "named-by-the-unshaded-parts" : "mixed-up-share-names"))),
          hints: [
            tr(locale, "Count the equal parts.", "Cuenta las partes iguales."),
            tr(locale, "2 parts: halves. 3 parts: thirds. 4 parts: fourths.", "2 partes: mitades. 3 partes: tercios. 4 partes: cuartos."),
            tr(locale, `The bar has ${d} equal parts.`, `La barra tiene ${d} partes iguales.`),
          ],
          steps: [tr(locale, `1 of ${d} equal parts is shaded.`, `1 de ${d} partes iguales está coloreada.`), tr(locale, `That is ${sh.one[0]}.`, `Eso es ${sh.one[1]}.`)],
          seconds: 10,
        };
      }
      if (r.bool(0.6)) {
        const [d1, d2] = r.pick([[2, 3], [2, 4], [3, 4]] as const);
        const bigger = r.bool();
        const s1 = SHARE[d1], s2 = SHARE[d2];
        const same = tr(locale, "They are the same", "Son iguales");
        const text = tr(
          locale,
          `Two bars are the same size. One is cut into ${s1.pl[0]}. One is cut into ${s2.pl[0]}. Which share is ${bigger ? "bigger" : "smaller"}?`,
          `Dos barras son del mismo tamaño. Una se divide en ${s1.pl[1]}. La otra se divide en ${s2.pl[1]}. ¿Qué parte es más ${bigger ? "grande" : "pequeña"}?`,
        );
        const winner = bigger ? s1 : s2;
        return {
          prompt: [text],
          say: text,
          ...choose(r, one(bigger ? d1 : d2), [one(bigger ? d2 : d1, bigger ? "more-parts-means-bigger" : "fewer-parts-means-smaller"), { label: same, say: same, why: "thinks-all-shares-are-equal" }]),
          hints: [
            tr(locale, "Picture the two bars side by side.", "Imagina las dos barras una al lado de la otra."),
            tr(locale, "More equal parts means smaller parts.", "Más partes iguales quiere decir partes más pequeñas."),
            tr(locale, `${cap(s1.one[0])} is 1 of ${d1} parts. ${cap(s2.one[0])} is 1 of ${d2}.`, `${cap(s1.one[1])} es 1 de ${d1} partes. ${cap(s2.one[1])} es 1 de ${d2}.`),
          ],
          steps: [
            tr(locale, `Cutting into ${d2} makes smaller parts than cutting into ${d1}.`, `Dividir en ${d2} da partes más pequeñas que dividir en ${d1}.`),
            bigger
              ? tr(locale, `${cap(winner.one[0])} is bigger.`, `${cap(winner.one[1])} es más grande.`)
              : tr(locale, `${cap(winner.one[0])} is smaller.`, `${cap(winner.one[1])} es más ${winner.f ? "pequeña" : "pequeño"}.`),
          ],
          seconds: 15,
        };
      }
      const d = r.pick(D);
      const ctx = r.pick(SHARE_CTX);
      const n = r.pick(NAMES);
      const art = ctx.f ? "una" : "un";
      const del = ctx.f ? "de la" : "del";
      const text = tr(
        locale,
        `${n} ${ctx.split[0]} a ${ctx.what[0]} into ${d} equal parts. ${n} ${ctx.use[0]}. What part of the ${ctx.what[0]} is that?`,
        `${n} ${ctx.split[1]} ${art} ${ctx.what[1]} en ${d} partes iguales. ${ctx.use[1]}. ¿Qué parte ${del} ${ctx.what[1]} es?`,
      );
      return {
        prompt: [text],
        say: text,
        picture: ctx.pic,
        alt: tr(locale, `A ${ctx.what[0]}`, `${cap(art)} ${ctx.what[1]}`),
        ...choose(r, one(d), D.filter((x) => x !== d).map((x) => one(x, "mixed-up-share-names"))),
        hints: [
          tr(locale, "How many equal parts are there?", "¿Cuántas partes iguales hay?"),
          tr(locale, "2 parts: halves. 3 parts: thirds. 4 parts: fourths.", "2 partes: mitades. 3 partes: tercios. 4 partes: cuartos."),
          tr(locale, `There are ${d} equal parts.`, `Hay ${d} partes iguales.`),
        ],
        steps: [tr(locale, `1 of ${d} equal parts.`, `1 de ${d} partes iguales.`), tr(locale, `That is ${SHARE[d].one[0]}.`, `Eso es ${SHARE[d].one[1]}.`)],
        seconds: 20,
      };
    },
  },
];
