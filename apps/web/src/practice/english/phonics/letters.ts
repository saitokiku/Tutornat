import type { Locale } from "@/lib/types";
import { tr } from "../../text";
import { cap, altFor, pic, same, word, type Entry, type Q } from "./core";

// Kindergarten: letter names (capital and small), then the first and last sound of a spoken word.
// Letter items are not read aloud choice by choice: hearing each letter would turn finding a shape into
// matching names. Sound items are pure listening: every choice is a picture with its word spoken.

// ---- e.letter.names ----
// Tags: "look-alike-letter" (a similar shape), "mirror-letter" (a reversal or flip: b d p q, n u, m w).
const TAG: Record<string, string> = { L: "look-alike-letter", M: "mirror-letter" };

/** [capital, Spanish name ("" in English), a word that starts with it, three other letters, their tags as L/M] */
type Letter = [string, string, string, string, string];

// Level 1: hear a letter name, find the capital.
const EN_CAPS: Letter[] = [
  ["M", "", "moon", "NWH", "LML"], ["W", "", "web", "MVN", "MLL"], ["E", "", "egg", "FBL", "LLL"], ["P", "", "pig", "RBF", "LLL"],
  ["B", "", "bus", "DPR", "LLL"], ["O", "", "octopus", "QCD", "LLL"], ["K", "", "kite", "XRY", "LLL"], ["T", "", "tiger", "IFJ", "LLL"],
  ["H", "", "hat", "AKN", "LLL"], ["G", "", "goat", "COQ", "LLL"], ["N", "", "nose", "MZH", "LLL"], ["U", "", "umbrella", "VJC", "LLL"],
  ["S", "", "sun", "ZCG", "LLL"], ["F", "", "fish", "EPT", "LLL"], ["Y", "", "yellow", "VXT", "LLL"], ["D", "", "duck", "BOP", "LLL"],
];
const ES_CAPS: Letter[] = [
  ["M", "eme", "mano", "NWH", "LML"], ["Ñ", "eñe", "ñandú", "NMH", "LLL"], ["E", "e", "elefante", "FBL", "LLL"], ["P", "pe", "pato", "RBF", "LLL"],
  ["B", "be", "bota", "DPR", "LLL"], ["O", "o", "oso", "QCD", "LLL"], ["L", "ele", "luna", "JTI", "LLL"], ["T", "te", "tomate", "IFJ", "LLL"],
  ["H", "hache", "helado", "AKN", "LLL"], ["G", "ge", "gato", "COQ", "LLL"], ["N", "ene", "nube", "MZH", "LLL"], ["U", "u", "uva", "VJC", "LLL"],
  ["S", "ese", "sol", "ZCG", "LLL"], ["F", "efe", "foca", "EPT", "LLL"], ["R", "erre", "rana", "PBK", "LLL"], ["D", "de", "dedo", "BOP", "LLL"],
];
// Level 2: see a capital, find its small partner.
const EN_SMALL: Letter[] = [
  ["B", "", "bus", "dph", "MML"], ["D", "", "dog", "bqa", "MML"], ["P", "", "pig", "qbd", "MMM"], ["Q", "", "queen", "pgd", "MLM"],
  ["N", "", "nest", "umh", "MLL"], ["U", "", "up", "nvy", "MLL"], ["M", "", "map", "wnr", "MLL"], ["G", "", "goat", "qjy", "LLL"],
  ["E", "", "egg", "cao", "LLL"], ["H", "", "hat", "nkb", "LLL"], ["T", "", "top", "fli", "LLL"], ["A", "", "ant", "oed", "LLL"],
  ["R", "", "red", "nvc", "LLL"], ["L", "", "leg", "ijt", "LLL"], ["Y", "", "yes", "vgj", "LLL"], ["F", "", "fan", "tjl", "LLL"],
];
const ES_SMALL: Letter[] = [
  ["B", "be", "bota", "dph", "MML"], ["D", "de", "dedo", "bqa", "MML"], ["P", "pe", "pato", "qbd", "MMM"], ["Q", "cu", "queso", "pgd", "MLM"],
  ["N", "ene", "nube", "umh", "MLL"], ["U", "u", "uva", "nvy", "MLL"], ["M", "eme", "mano", "wnr", "MLL"], ["G", "ge", "gato", "qjy", "LLL"],
  ["E", "e", "elefante", "cao", "LLL"], ["H", "hache", "helado", "nkb", "LLL"], ["T", "te", "tomate", "fli", "LLL"], ["A", "a", "abeja", "oed", "LLL"],
  ["R", "erre", "ratón", "nvc", "LLL"], ["L", "ele", "luna", "ijt", "LLL"], ["Ñ", "eñe", "ñandú", "nmh", "LLL"], ["F", "efe", "foca", "tjl", "LLL"],
];

const others = ([, , , letters, tags]: Letter) => [...letters].map((l, i) => word(l, TAG[tags[i]]));

function capitalQ(locale: Locale, d: Letter): Q {
  const [C, name, anchor, letters] = d;
  const said = locale === "es" ? name : C;
  return {
    prompt: tr(locale, "Listen. Tap the letter.", "Escucha y toca la letra."),
    say: tr(locale, `Find the capital letter ${C}.`, `Busca la letra mayúscula ${name}.`),
    choices: [word(C), ...others(d)],
    hints: [
      tr(locale, "Listen to the letter name again.", "Escucha otra vez el nombre de la letra."),
      tr(locale, "Look at the shape of each letter.", "Mira la forma de cada letra."),
      tr(locale, `${letters[0]} looks close, but it is not ${said}.`, `La ${letters[0]} se parece, pero no es la ${said}.`),
    ],
    steps: [tr(locale, `This is ${C}. ${C} is for ${anchor}.`, `Esta es la ${name}: ${C}, como en ${anchor}.`)],
  };
}

function smallQ(locale: Locale, d: Letter): Q {
  const [C, name, anchor, letters, tags] = d;
  const c = C.toLowerCase();
  const said = locale === "es" ? name : C;
  const first = letters[0];
  return {
    prompt: tr(locale, `Which small letter goes with ${C}?`, `¿Qué minúscula va con la ${C}?`),
    say: tr(locale, `Find the small letter that goes with capital ${C}.`, `Busca la minúscula de la ${name} mayúscula.`),
    choices: [word(c), ...others(d)],
    hints: [
      tr(locale, "Every capital letter has a small partner.", "Cada mayúscula tiene su minúscula."),
      tr(locale, "Some small letters look different from their capital.", "Algunas minúsculas no se parecen a su mayúscula."),
      tags[0] === "M"
        ? tr(locale, `${first} is turned the wrong way for ${said}.`, `La ${first} está volteada; no es la ${said}.`)
        : tr(locale, `${first} looks close, but it is not ${said}.`, `La ${first} se parece, pero no es la ${said}.`),
    ],
    steps: [tr(locale, `${C} and ${c} are the same letter, as in ${anchor}.`, `${C} y ${c} son la misma letra, como en ${anchor}.`)],
  };
}

export const LETTER_NAMES: Entry[][] = [same(EN_CAPS, ES_CAPS, capitalQ), same(EN_SMALL, ES_SMALL, smallQ)];

// ---- e.first.sound and e.final.sound ----
// [target, picture, key, picture, near miss, picture, other, picture]. First sound: the near miss rhymes
// with the target ("matched-ending"). Final sound: the near miss starts like the target
// ("matched-first-sound"). The key never shares the target's other end by accident.
type Sound = [string, string, string, string, string, string, string, string];

const EN_FIRST: Sound[] = [
  ["cat", "🐱", "cow", "🐮", "hat", "🎩", "sun", "☀️"], ["bee", "🐝", "bus", "🚌", "tree", "🌳", "moon", "🌙"],
  ["dog", "🐶", "duck", "🦆", "frog", "🐸", "sun", "☀️"], ["moon", "🌙", "mouse", "🐭", "spoon", "🥄", "fish", "🐟"],
  ["goat", "🐐", "gift", "🎁", "boat", "⛵", "pig", "🐷"], ["pear", "🍐", "pizza", "🍕", "bear", "🐻", "sock", "🧦"],
  ["bell", "🔔", "bus", "🚌", "shell", "🐚", "moon", "🌙"], ["fox", "🦊", "fish", "🐟", "box", "📦", "cake", "🎂"],
  ["cake", "🎂", "car", "🚗", "snake", "🐍", "bed", "🛏️"], ["rose", "🌹", "ring", "💍", "nose", "👃", "bee", "🐝"],
  ["house", "🏠", "hat", "🎩", "mouse", "🐭", "ring", "💍"], ["boat", "⛵", "bell", "🔔", "goat", "🐐", "fish", "🐟"],
  ["lock", "🔒", "leaf", "🍃", "sock", "🧦", "pig", "🐷"], ["mouse", "🐭", "milk", "🥛", "house", "🏠", "cat", "🐱"],
  ["bed", "🛏️", "ball", "⚽", "sled", "🛷", "fox", "🦊"], ["sock", "🧦", "sun", "☀️", "clock", "⏰", "dog", "🐶"],
];
const ES_FIRST: Sound[] = [
  ["gato", "🐱", "gallina", "🐔", "pato", "🦆", "sol", "☀️"], ["sol", "☀️", "silla", "🪑", "caracol", "🐌", "luna", "🌙"],
  ["mano", "✋", "mariposa", "🦋", "gusano", "🐛", "pez", "🐟"], ["luna", "🌙", "lápiz", "✏️", "aceituna", "🫒", "gato", "🐱"],
  ["rana", "🐸", "ratón", "🐭", "manzana", "🍎", "sol", "☀️"], ["pato", "🦆", "perro", "🐶", "gato", "🐱", "luna", "🌙"],
  ["bota", "👢", "ballena", "🐋", "pelota", "⚽", "sol", "☀️"], ["dado", "🎲", "delfín", "🐬", "helado", "🍦", "mano", "✋"],
  ["foca", "🦭", "fuego", "🔥", "boca", "👄", "luna", "🌙"], ["pera", "🍐", "piña", "🍍", "escalera", "🪜", "sol", "☀️"],
  ["cama", "🛏️", "camión", "🚚", "llama", "🦙", "sol", "☀️"], ["ratón", "🐭", "rana", "🐸", "jabón", "🧼", "luna", "🌙"],
  ["león", "🦁", "lobo", "🐺", "camión", "🚚", "pato", "🦆"], ["tortuga", "🐢", "taza", "☕", "oruga", "🐛", "sol", "☀️"],
  ["vela", "🕯️", "vaca", "🐮", "abuela", "👵", "pato", "🦆"], ["sopa", "🍲", "sandía", "🍉", "ropa", "👕", "gato", "🐱"],
];

function firstQ(locale: Locale, [t, tp, k, kp, near, np, other, op]: Sound): Q {
  const T = cap(t);
  return {
    prompt: tr(locale, `Which one starts like ${t}?`, `¿Cuál empieza como ${t}?`),
    say: tr(locale, `${T}. Which one starts with the same sound as ${t}?`, `${T}. ¿Cuál empieza con el mismo sonido que ${t}?`),
    picture: tp,
    alt: altFor(locale, t),
    choices: [pic(k, kp), pic(near, np, "matched-ending"), pic(other, op, "different-first-sound")],
    hints: [
      tr(locale, "Say each word. Listen to the very first sound.", "Di cada palabra. Escucha el primer sonido."),
      tr(locale, `Say ${t} slowly. Then say each word slowly.`, `Di ${t} despacio. Luego di cada palabra despacio.`),
      tr(locale, `${cap(near)} ends like ${t}, but starts differently.`, `${cap(near)} termina como ${t}, pero empieza distinto.`),
    ],
    steps: [tr(locale, `${T} and ${k} start with the same sound.`, `${T} y ${k} empiezan con el mismo sonido.`)],
  };
}

const EN_FINAL: Sound[] = [
  ["cat", "🐱", "boot", "👢", "cow", "🐮", "fish", "🐟"], ["bus", "🚌", "dress", "👗", "bed", "🛏️", "dog", "🐶"],
  ["dog", "🐶", "pig", "🐷", "duck", "🦆", "sun", "☀️"], ["sun", "☀️", "moon", "🌙", "sock", "🧦", "cat", "🐱"],
  ["bed", "🛏️", "bird", "🐦", "bell", "🔔", "cat", "🐱"], ["web", "🕸️", "crab", "🦀", "watch", "⌚", "dog", "🐶"],
  ["leaf", "🍃", "elf", "🧝", "lock", "🔒", "pig", "🐷"], ["bell", "🔔", "girl", "👧", "bed", "🛏️", "cat", "🐱"],
  ["duck", "🦆", "book", "📖", "dog", "🐶", "sun", "☀️"], ["drum", "🥁", "broom", "🧹", "dress", "👗", "cat", "🐱"],
  ["cup", "☕", "map", "🗺️", "cake", "🎂", "sun", "☀️"], ["pen", "🖊️", "lion", "🦁", "pig", "🐷", "cat", "🐱"],
  ["goat", "🐐", "kite", "🪁", "game", "🎮", "sun", "☀️"], ["milk", "🥛", "rock", "🪨", "map", "🗺️", "fish", "🐟"],
  ["car", "🚗", "deer", "🦌", "cake", "🎂", "pig", "🐷"], ["frog", "🐸", "egg", "🥚", "fish", "🐟", "sun", "☀️"],
];
const ES_FINAL: Sound[] = [
  ["sol", "☀️", "papel", "📄", "silla", "🪑", "pato", "🦆"], ["pan", "🍞", "tren", "🚆", "pato", "🦆", "sol", "☀️"],
  ["flor", "🌸", "mar", "🌊", "foca", "🦭", "pan", "🍞"], ["pez", "🐟", "lápiz", "✏️", "pera", "🍐", "sol", "☀️"],
  ["gato", "🐱", "perro", "🐶", "gallina", "🐔", "luna", "🌙"], ["luna", "🌙", "casa", "🏠", "león", "🦁", "sol", "☀️"],
  ["nube", "☁️", "leche", "🥛", "nariz", "👃", "gato", "🐱"], ["ratón", "🐭", "pan", "🍞", "rana", "🐸", "sol", "☀️"],
  ["mano", "✋", "oso", "🐻", "manzana", "🍎", "luna", "🌙"], ["piña", "🍍", "vaca", "🐮", "perro", "🐶", "sol", "☀️"],
  ["árbol", "🌳", "pastel", "🎂", "abeja", "🐝", "pan", "🍞"], ["camión", "🚚", "tren", "🚆", "casa", "🏠", "sol", "☀️"],
  ["uva", "🍇", "piña", "🍍", "unicornio", "🦄", "sol", "☀️"], ["leche", "🥛", "nube", "☁️", "león", "🦁", "gato", "🐱"],
  ["dedo", "☝️", "gato", "🐱", "diente", "🦷", "luna", "🌙"], ["nariz", "👃", "pez", "🐟", "nube", "☁️", "sol", "☀️"],
];

function finalQ(locale: Locale, [t, tp, k, kp, near, np, other, op]: Sound): Q {
  const T = cap(t);
  return {
    prompt: tr(locale, `Which one ends like ${t}?`, `¿Cuál termina como ${t}?`),
    say: tr(locale, `${T}. Which one ends with the same sound as ${t}?`, `${T}. ¿Cuál termina con el mismo sonido que ${t}?`),
    picture: tp,
    alt: altFor(locale, t),
    choices: [pic(k, kp), pic(near, np, "matched-first-sound"), pic(other, op, "different-last-sound")],
    hints: [
      tr(locale, "Say each word. Listen to the very last sound.", "Di cada palabra. Escucha el último sonido."),
      tr(locale, "Starting the same does not count. Listen to the end.", "Empezar igual no cuenta. Escucha el final."),
      tr(locale, `${cap(near)} starts like ${t}, but ends differently.`, `${cap(near)} empieza como ${t}, pero termina distinto.`),
    ],
    steps: [tr(locale, `${T} and ${k} end with the same sound.`, `${T} y ${k} terminan con el mismo sonido.`)],
  };
}

export const FIRST_SOUND: Entry[][] = [same(EN_FIRST, ES_FIRST, firstQ)];
export const FINAL_SOUND: Entry[][] = [same(EN_FINAL, ES_FINAL, finalQ)];

