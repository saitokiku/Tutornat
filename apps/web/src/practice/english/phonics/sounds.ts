import type { Locale } from "@/lib/types";
import { tr } from "../../text";
import { cap, altFor, EN_VOWEL_SAY, ES_VOWEL_SAY, pic, same, voiced, word, type Entry, type Q } from "./core";
import { NAME_IT_ALT } from "./read";

// Kindergarten sound work: the middle vowel, rhyme families, blending a start and an ending, and
// swapping one sound. Level 1 of each is listening (picture choices, every word spoken). Level 2 asks
// for a little reading or letter work. Spanish works in syllables, the unit Spanish classrooms blend.

// ---- e.middle.vowel ----
// Level 1: [target, picture, key, picture, near miss, picture, other, picture, "c" when the near miss
// keeps the target's consonants and changes only the vowel ("matched-consonants"), else "v"].
type Mid = [string, string, string, string, string, string, string, string, "c" | "v"];
const EN_MID: Mid[] = [
  ["bag", "👜", "cat", "🐱", "bug", "🐛", "pen", "🖊️", "c"], ["bug", "🐛", "sun", "☀️", "bag", "👜", "pig", "🐷", "c"],
  ["pan", "🍳", "hat", "🎩", "pen", "🖊️", "dog", "🐶", "c"], ["pen", "🖊️", "bed", "🛏️", "pin", "📌", "sun", "☀️", "c"],
  ["pin", "📌", "pig", "🐷", "pan", "🍳", "bus", "🚌", "c"], ["log", "🪵", "fox", "🦊", "leg", "🦵", "cat", "🐱", "c"],
  ["leg", "🦵", "web", "🕸️", "log", "🪵", "pig", "🐷", "c"], ["net", "🥅", "hen", "🐔", "nut", "🥜", "box", "📦", "c"],
  ["nut", "🥜", "bus", "🚌", "net", "🥅", "map", "🗺️", "c"], ["cup", "☕", "duck", "🦆", "cap", "🧢", "fox", "🦊", "c"],
  ["cap", "🧢", "van", "🚐", "cup", "☕", "leg", "🦵", "c"], ["six", "6️⃣", "pig", "🐷", "sax", "🎷", "sun", "☀️", "c"],
  ["hat", "🎩", "map", "🗺️", "hot", "🥵", "bed", "🛏️", "c"], ["bed", "🛏️", "ten", "🔟", "fox", "🦊", "pig", "🐷", "v"],
  ["dog", "🐶", "sock", "🧦", "duck", "🦆", "hat", "🎩", "v"], ["bus", "🚌", "cup", "☕", "bed", "🛏️", "six", "6️⃣", "v"],
];
// Spanish: words with one vowel throughout (oso, casa, bebé, bici), matched by their vowels. A "c" near
// miss keeps the target's consonants as heard, not only as written (boca is not bici: /k/ is not /s/).
const ES_MID: Mid[] = [
  ["mono", "🐒", "loro", "🦜", "mano", "✋", "casa", "🏠", "c"], ["papa", "🥔", "rana", "🐸", "dedo", "☝️", "oso", "🐻", "v"],
  ["lana", "🧶", "vaca", "🐮", "luna", "🌙", "lobo", "🐺", "c"], ["bata", "🥼", "cama", "🛏️", "bota", "👢", "toro", "🐂", "c"],
  ["casa", "🏠", "mapa", "🗺️", "pez", "🐟", "oso", "🐻", "v"], ["oso", "🐻", "globo", "🎈", "uva", "🍇", "rana", "🐸", "v"],
  ["bebé", "👶", "leche", "🥛", "mono", "🐒", "casa", "🏠", "v"], ["leche", "🥛", "bebé", "👶", "lobo", "🐺", "cama", "🛏️", "v"],
  ["bici", "🚲", "kiwi", "🥝", "beso", "💋", "lana", "🧶", "v"], ["kiwi", "🥝", "bici", "🚲", "cama", "🛏️", "toro", "🐂", "v"],
  ["loro", "🦜", "pollo", "🐔", "luna", "🌙", "casa", "🏠", "v"], ["toro", "🐂", "mono", "🐒", "taza", "☕", "bebé", "👶", "v"],
  ["vaca", "🐮", "llama", "🦙", "boca", "👄", "kiwi", "🥝", "v"], ["rana", "🐸", "cama", "🛏️", "rosa", "🌹", "bebé", "👶", "v"],
  ["coco", "🥥", "ojo", "👁️", "cama", "🛏️", "uva", "🍇", "v"], ["globo", "🎈", "coco", "🥥", "llama", "🦙", "bici", "🚲", "v"],
];

function midQ(locale: Locale, [t, tp, k, kp, near, np, other, op, kind]: Mid): Q {
  const T = cap(t);
  const ask = tr(locale, `Which one has the same middle sound as ${t}?`, `¿Cuál tiene las mismas vocales que ${t}?`);
  return {
    prompt: ask,
    say: `${T}. ${ask}`,
    picture: tp,
    alt: altFor(locale, t),
    choices: [pic(k, kp), pic(near, np, kind === "c" ? "matched-consonants" : "different-vowel"), pic(other, op, "different-vowel")],
    hints: [
      tr(locale, "The middle sound is the vowel.", "Las vocales son a, e, i, o, u."),
      tr(locale, `Say ${t} slowly. Stretch the middle part.`, `Di ${t} despacio y escucha sus vocales.`),
      kind === "c"
        ? tr(locale, `${cap(near)} has ${t}'s outside sounds, but a new middle.`, `${cap(near)} tiene las consonantes de ${t}, pero otras vocales.`)
        : tr(locale, `${cap(near)} has a different middle sound.`, `${cap(near)} no tiene las mismas vocales que ${t}.`),
    ],
    steps: [tr(locale, `${T} and ${k} have the same middle sound.`, `${T} y ${k} tienen las mismas vocales.`)],
  };
}

// Level 2: the word with its vowel missing, and the picture. [word, picture, three other vowels]. In
// Spanish the first vowel is missing.
type Gap = [string, string, string];
const EN_GAP: Gap[] = [
  ["cat", "🐱", "eiu"], ["bed", "🛏️", "aio"], ["pig", "🐷", "eau"], ["dog", "🐶", "aue"], ["sun", "☀️", "oai"], ["map", "🗺️", "oeu"],
  ["web", "🕸️", "iao"], ["pin", "📌", "eau"], ["fox", "🦊", "aui"], ["bus", "🚌", "aoi"], ["hat", "🎩", "oiu"], ["leg", "🦵", "aiu"],
  ["six", "6️⃣", "aeo"], ["box", "📦", "aiu"], ["cup", "☕", "aoe"], ["ten", "🔟", "aio"],
];
const ES_GAP: Gap[] = [
  ["gato", "🐱", "eio"], ["vaca", "🐮", "oue"], ["pato", "🦆", "ieu"], ["pez", "🐟", "aio"], ["dedo", "☝️", "aio"], ["leche", "🥛", "aiu"],
  ["piña", "🍍", "eau"], ["silla", "🪑", "eao"], ["pila", "🔋", "aeo"], ["sol", "☀️", "aeu"], ["mono", "🐒", "aei"], ["bota", "👢", "aeu"],
  ["foca", "🦭", "aei"], ["luna", "🌙", "aoe"], ["nube", "☁️", "aoi"], ["lupa", "🔍", "oae"],
];

function gapQ(locale: Locale, [w, picture, others]: Gap): Q {
  const at = w.search(/[aeiou]/);
  const v = w[at];
  const shown = `${w.slice(0, at)}___${w.slice(at + 1)}`;
  const says = locale === "es" ? ES_VOWEL_SAY : EN_VOWEL_SAY;
  return {
    prompt: tr(locale, `Which vowel is missing? ${shown}`, `¿Qué vocal falta? ${shown}`),
    say: tr(locale, `${cap(w)}. Which vowel is missing?`, `${cap(w)}. ¿Qué vocal falta?`),
    picture,
    alt: altFor(locale, w),
    choices: [v, ...others].map((l, i) => voiced(l, says[l], i ? "wrong-vowel" : undefined)),
    hints: [
      tr(locale, "Say the word slowly. Listen to the middle.", "Di la palabra despacio. Escucha la primera vocal."),
      tr(locale, "Tap each vowel to hear its sound.", "Toca cada vocal para oír su sonido."),
      tr(locale, `It is not ${others[0]}.`, `No es la ${others[0]}.`),
    ],
    steps: [tr(locale, `${w.split("").join("-")} says ${w}.`, `${w} se escribe así: ${w.split("").join("-")}.`), tr(locale, `The missing vowel is ${v}.`, `Falta la vocal ${v}.`)],
  };
}

export const MIDDLE_VOWEL: Entry[][] = [same(EN_MID, ES_MID, midQ), same(EN_GAP, ES_GAP, gapQ)];

// ---- e.word.families ----
// Level 1 (listening): [family, three members said aloud, key, picture, near miss with the same vowel
// but another ending ("same-vowel-only"), picture, other ("different-family"), picture].
type Fam = [string, string, string, string, string, string, string, string, string, string];
const EN_FAM: Fam[] = [
  ["at", "cat", "hat", "bat", "rat", "🐀", "cap", "🧢", "pig", "🐷"], ["ig", "wig", "dig", "big", "pig", "🐷", "pin", "📌", "dog", "🐶"],
  ["op", "top", "hop", "mop", "stop", "🛑", "sock", "🧦", "cat", "🐱"], ["og", "dog", "log", "jog", "frog", "🐸", "fox", "🦊", "bus", "🚌"],
  ["un", "fun", "run", "bun", "sun", "☀️", "bus", "🚌", "hat", "🎩"], ["en", "pen", "ten", "men", "hen", "🐔", "bed", "🛏️", "fox", "🦊"],
  ["ug", "hug", "rug", "mug", "bug", "🐛", "duck", "🦆", "pin", "📌"], ["et", "net", "wet", "pet", "jet", "✈️", "web", "🕸️", "sun", "☀️"],
  ["in", "fin", "win", "tin", "pin", "📌", "pig", "🐷", "bus", "🚌"], ["ed", "bed", "red", "fed", "sled", "🛷", "hen", "🐔", "cat", "🐱"],
  ["ock", "lock", "rock", "dock", "sock", "🧦", "dog", "🐶", "bee", "🐝"], ["ake", "bake", "lake", "make", "cake", "🎂", "rain", "🌧️", "fish", "🐟"],
  ["ing", "king", "sing", "wing", "ring", "💍", "pig", "🐷", "car", "🚗"], ["ell", "bell", "well", "tell", "shell", "🐚", "bed", "🛏️", "moon", "🌙"],
  ["an", "can", "fan", "man", "van", "🚐", "cat", "🐱", "dog", "🐶"], ["ap", "cap", "nap", "tap", "map", "🗺️", "man", "👨", "bed", "🛏️"],
];
const ES_FAM: Fam[] = [
  ["ón", "ratón", "jabón", "camión", "león", "🦁", "sol", "☀️", "casa", "🏠"], ["ato", "gato", "pato", "zapato", "plato", "🍽️", "sapo", "🐸", "luna", "🌙"],
  ["ela", "vela", "tela", "escuela", "abuela", "👵", "fresa", "🍓", "sol", "☀️"], ["ana", "rana", "manzana", "ventana", "campana", "🔔", "casa", "🏠", "pez", "🐟"],
  ["illa", "silla", "tortilla", "mantequilla", "ardilla", "🐿️", "piña", "🍍", "sol", "☀️"], ["eta", "maleta", "camiseta", "trompeta", "galleta", "🍪", "pera", "🍐", "gato", "🐱"],
  ["ero", "sombrero", "dinero", "granero", "vaquero", "🤠", "queso", "🧀", "luna", "🌙"], ["ino", "pepino", "camino", "molino", "pingüino", "🐧", "niño", "👦", "sol", "☀️"],
  ["osa", "rosa", "cosa", "hermosa", "mariposa", "🦋", "boca", "👄", "pez", "🐟"], ["or", "tambor", "color", "calor", "flor", "🌸", "sol", "☀️", "casa", "🏠"],
  ["ía", "tía", "día", "policía", "sandía", "🍉", "piña", "🍍", "sol", "☀️"], ["ena", "cena", "arena", "sirena", "ballena", "🐋", "pera", "🍐", "gato", "🐱"],
  ["ota", "pelota", "bota", "nota", "gota", "💧", "sopa", "🍲", "luna", "🌙"], ["ito", "gatito", "perrito", "palito", "mosquito", "🦟", "libro", "📖", "casa", "🏠"],
  ["ama", "cama", "rama", "dama", "llama", "🦙", "casa", "🏠", "pez", "🐟"], ["una", "cuna", "aceituna", "vacuna", "luna", "🌙", "uva", "🍇", "sol", "☀️"],
];

function famQ(locale: Locale, [fam, m1, m2, m3, k, kp, near, np, other, op]: Fam): Q {
  return {
    prompt: tr(locale, `Which one is in the -${fam} family?`, `¿Cuál es de la familia -${fam}?`),
    say: tr(locale, `${cap(m1)}, ${m2}, ${m3}. Which one rhymes with them?`, `${cap(m1)}, ${m2}, ${m3}. ¿Cuál rima con ellas?`),
    choices: [pic(k, kp), pic(near, np, "same-vowel-only"), pic(other, op, "different-family")],
    hints: [
      tr(locale, "Words in a family end the same way.", "Las palabras de una familia terminan igual."),
      tr(locale, `Say ${m1}, then each picture word.`, `Di ${m1} y luego cada palabra.`),
      tr(locale, `${cap(near)} has the same vowel, but ends differently.`, `${cap(near)} tiene las mismas vocales, pero no termina igual.`),
    ],
    steps: [
      tr(locale, `${cap(k)} ends like ${m1}, ${m2}, and ${m3}.`, `${cap(k)} termina como ${m1}, ${m2} y ${m3}.`),
      tr(locale, `${cap(k)} is in the -${fam} family.`, `${cap(k)} es de la familia -${fam}.`),
    ],
  };
}

// Level 2 (reading): the picture and the family; [family, picture, key, same family but another start
// ("wrong-first-letter"), same start but another ending ("wrong-ending"), same consonants but another
// vowel ("wrong-vowel")]. Choices are not read aloud.
type FamRead = [string, string, string, string, string, string];
const EN_FAM_READ: FamRead[] = [
  ["at", "🦇", "bat", "cat", "bag", "bit"], ["ig", "🐷", "pig", "wig", "pin", "peg"], ["og", "🪵", "log", "dog", "lot", "leg"],
  ["at", "🎩", "hat", "mat", "ham", "hit"], ["en", "🖊️", "pen", "ten", "pet", "pin"], ["ug", "🐛", "bug", "rug", "bus", "bag"],
  ["et", "🥅", "net", "wet", "neck", "nut"], ["in", "📌", "pin", "fin", "pig", "pan"], ["ed", "🛏️", "bed", "red", "beg", "bud"],
  ["ock", "🧦", "sock", "lock", "song", "sack"], ["an", "👨", "man", "can", "map", "men"], ["ap", "🗺️", "map", "cap", "mat", "mop"],
  ["at", "🐀", "rat", "hat", "rag", "rot"], ["ox", "🦊", "fox", "box", "fog", "fix"], ["ing", "💍", "ring", "king", "rink", "rang"],
  ["ell", "🔔", "bell", "well", "belt", "ball"],
];
const ES_FAM_READ: FamRead[] = [
  ["ato", "🐱", "gato", "pato", "gallo", "gota"], ["ano", "✋", "mano", "grano", "mapa", "mono"], ["ota", "👢", "bota", "gota", "boca", "bata"],
  ["una", "🌙", "luna", "cuna", "lupa", "lana"], ["ela", "🕯️", "vela", "tela", "vaca", "velo"], ["osa", "🌹", "rosa", "cosa", "ropa", "risa"],
  ["eso", "🧀", "queso", "beso", "queja", "quiso"], ["oca", "👄", "boca", "foca", "bota", "beca"], ["ama", "🛏️", "cama", "rama", "casa", "coma"],
  ["ollo", "🐔", "pollo", "rollo", "polvo", "pillo"], ["ilo", "🧵", "hilo", "kilo", "hijo", "halo"], ["iña", "🍍", "piña", "niña", "pila", "peña"],
  ["eta", "🧳", "maleta", "paleta", "malla", "muleta"], ["opa", "🍲", "sopa", "ropa", "sola", "sapo"], ["era", "🍐", "pera", "cera", "pena", "pura"],
  ["ado", "🎲", "dado", "lado", "dama", "dedo"],
];

function famReadQ(locale: Locale, [fam, picture, k, first, end, vowel]: FamRead): Q {
  return {
    prompt: tr(locale, `Which -${fam} word is this?`, `¿Qué palabra de la familia -${fam} es esta?`),
    say: tr(locale, "Read each word. Which one names the picture?", "Lee cada palabra. ¿Cuál va con el dibujo?"),
    picture,
    alt: tr(locale, ...NAME_IT_ALT),
    choices: [word(k), word(first, "wrong-first-letter"), word(end, "wrong-ending"), word(vowel, "wrong-vowel")],
    hints: [
      tr(locale, "Look at the end of each word first.", "Mira primero cómo termina cada palabra."),
      tr(locale, "Cross out words that end differently. Then read the start.", "Tacha las que terminan distinto. Luego lee el principio."),
      tr(locale, `${cap(end)} does not end with ${fam}.`, `${cap(end)} no termina en -${fam}.`),
    ],
    steps: [tr(locale, `${cap(k)} ends with ${fam} and names the picture.`, `${cap(k)} termina en -${fam} y va con el dibujo.`)],
  };
}

export const WORD_FAMILIES: Entry[][] = [same(EN_FAM, ES_FAM, famQ), same(EN_FAM_READ, ES_FAM_READ, famReadQ)];
