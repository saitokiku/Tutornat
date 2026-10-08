import type { Locale } from "@/lib/types";
import { tr } from "../../text";
import { cap, altFor, both, pic, same, voiced, word, type Entry, type Q } from "./core";

// Putting sounds together and taking them apart: blend a start and an ending (K), swap one sound (K),
// and count every sound in a word (grade 1). English blends an onset with a rime that is itself a word
// ("at", "ice", "oat"), so the browser can say every part; the onset is named through a word ("the first
// sound of house"). Spanish blends syllables (ga… to), which Spanish speech says as written.

// ---- e.blend.onset ----
// Level 1: [anchor word, rime, key, picture, another start + the same rime ("wrong-start"), picture,
// the same start + another ending ("wrong-end"), picture].
type EnBlend = [string, string, string, string, string, string, string, string];
const EN_BLEND: EnBlend[] = [
  ["house", "at", "hat", "🎩", "bat", "🦇", "hen", "🐔"], ["cow", "up", "cup", "☕", "pup", "🐶", "cat", "🐱"],
  ["bed", "ox", "box", "📦", "fox", "🦊", "bus", "🚌"], ["moon", "ice", "mice", "🐭", "dice", "🎲", "milk", "🥛"],
  ["game", "oat", "goat", "🐐", "boat", "⛵", "gift", "🎁"], ["bee", "all", "ball", "⚽", "wall", "🧱", "bed", "🛏️"],
  ["rain", "ice", "rice", "🍚", "mice", "🐭", "ring", "💍"], ["man", "eat", "meat", "🥩", "seat", "💺", "moon", "🌙"],
  ["vest", "an", "van", "🚐", "can", "🥫", "volcano", "🌋"], ["cat", "oat", "coat", "🧥", "goat", "🐐", "cup", "☕"],
  ["dog", "ice", "dice", "🎲", "rice", "🍚", "duck", "🦆"], ["pig", "an", "pan", "🍳", "can", "🥫", "pear", "🍐"],
  ["bus", "oat", "boat", "⛵", "coat", "🧥", "bell", "🔔"], ["fish", "ox", "fox", "🦊", "box", "📦", "fork", "🍴"],
  ["car", "an", "can", "🥫", "van", "🚐", "cat", "🐱"], ["web", "all", "wall", "🧱", "ball", "⚽", "watch", "⌚"],
];
// Spanish: [first syllable, second syllable, key, picture, another first syllable ("wrong-start"),
// picture, the same first syllable with another ending ("wrong-end"), picture].
const ES_BLEND: EnBlend[] = [
  ["ga", "to", "gato", "🐱", "pato", "🦆", "gallo", "🐓"], ["ma", "no", "mano", "✋", "pino", "🌲", "mapa", "🗺️"],
  ["bo", "ta", "bota", "👢", "gota", "💧", "boca", "👄"], ["ro", "sa", "rosa", "🌹", "casa", "🏠", "ropa", "👕"],
  ["va", "ca", "vaca", "🐮", "foca", "🦭", "vaso", "🥛"], ["so", "pa", "sopa", "🍲", "ropa", "👕", "sofá", "🛋️"],
  ["pe", "ra", "pera", "🍐", "escalera", "🪜", "pepino", "🥒"], ["ra", "na", "rana", "🐸", "lana", "🧶", "ratón", "🐭"],
  ["ca", "ma", "cama", "🛏️", "llama", "🦙", "casa", "🏠"], ["fo", "ca", "foca", "🦭", "boca", "👄", "fogata", "🔥"],
  ["pi", "ña", "piña", "🍍", "niña", "👧", "pila", "🔋"], ["de", "do", "dedo", "☝️", "dado", "🎲", "detective", "🕵️"],
  ["lu", "na", "luna", "🌙", "aceituna", "🫒", "lupa", "🔍"], ["to", "ro", "toro", "🐂", "loro", "🦜", "tomate", "🍅"],
  ["ma", "pa", "mapa", "🗺️", "papa", "🥔", "mano", "✋"], ["pa", "to", "pato", "🦆", "gato", "🐱", "pájaro", "🐦"],
];

function enBlendQ([anchor, rime, k, kp, start, sp, end, ep]: EnBlend): Q {
  const ask = `Start with the first sound of ${anchor}. Then add ${rime}.`;
  return {
    prompt: ask,
    say: `${ask} What word do you get?`,
    choices: [pic(k, kp), pic(start, sp, "wrong-start"), pic(end, ep, "wrong-end")],
    hints: [
      `Say ${anchor}. Keep only its first sound.`,
      `Say that sound, then ${rime}, fast.`,
      `${cap(start)} ends with ${rime}, but starts with another sound.`,
    ],
    steps: [`The first sound of ${anchor} plus ${rime} makes ${k}.`],
  };
}

function esBlendQ([s1, s2, k, kp, start, sp, end, ep]: EnBlend): Q {
  const ask = `Junta las sílabas: ${s1}… ${s2}.`;
  return {
    prompt: ask,
    say: `${ask} ¿Qué palabra es?`,
    choices: [pic(k, kp), pic(start, sp, "wrong-start"), pic(end, ep, "wrong-end")],
    hints: [
      "Di las dos partes, una después de la otra.",
      "Ahora dilas más rápido, sin parar en medio.",
      `${cap(start)} termina con ${s2}, pero no empieza con ${s1}.`,
    ],
    steps: [`${s1} + ${s2} = ${k}`],
  };
}

// Level 2 (reading): the two written parts. [start, ending, the same with another vowel ("wrong-vowel"),
// another start with the same ending ("wrong-start")]; the ending alone is offered too ("dropped-start").
type ReadBlend = [string, string, string, string];
const EN_BLEND_READ: ReadBlend[] = [
  ["h", "at", "hot", "bat"], ["d", "og", "dig", "bog"], ["b", "ed", "bad", "red"], ["p", "ig", "peg", "big"],
  ["c", "up", "cap", "pup"], ["m", "op", "map", "top"], ["f", "in", "fan", "pin"], ["n", "ut", "net", "hut"],
  ["j", "et", "jot", "wet"], ["r", "ug", "rag", "bug"], ["l", "ip", "lap", "hip"], ["t", "en", "tan", "hen"],
  ["w", "ig", "wag", "dig"], ["t", "op", "tip", "hop"], ["z", "ip", "zap", "hip"], ["f", "ox", "fix", "box"],
];
const ES_BLEND_READ: ReadBlend[] = [
  ["ma", "no", "mono", "pino"], ["ca", "sa", "cosa", "mesa"], ["lu", "na", "lana", "cuna"], ["bo", "ta", "bata", "gota"],
  ["pe", "ra", "para", "cera"], ["ra", "ta", "ruta", "lata"], ["de", "do", "dado", "lado"], ["co", "ma", "cama", "loma"],
  ["pi", "so", "paso", "beso"], ["pa", "to", "pito", "gato"], ["li", "ma", "loma", "rama"], ["bo", "ca", "beca", "foca"],
  ["me", "sa", "misa", "rosa"], ["ro", "ca", "rica", "vaca"], ["pa", "la", "pila", "sala"], ["mu", "la", "mala", "cola"],
];

function readBlendQ(locale: Locale, [a, b, vowel, start]: ReadBlend): Q {
  const k = a + b;
  return {
    prompt: `${a} + ${b}`,
    say: tr(locale, "Blend the two parts. Which word do they make?", "Junta las dos partes. ¿Qué palabra se forma?"),
    choices: [word(k), word(b, "dropped-start"), word(vowel, "wrong-vowel"), word(start, "wrong-start")],
    hints: [
      tr(locale, "Read the first part, then the second part.", "Lee la primera parte y luego la segunda."),
      tr(locale, "Say them together without stopping.", "Júntalas sin parar en medio."),
      tr(locale, `${cap(start)} ends with ${b}, but starts with another letter.`, `${cap(start)} termina con ${b}, pero no empieza con ${a}.`),
    ],
    steps: [`${a} + ${b} = ${k}`],
  };
}

export const BLEND_ONSET: Entry[][] = [both(EN_BLEND, ES_BLEND, enBlendQ, esBlendQ), same(EN_BLEND_READ, ES_BLEND_READ, readBlendQ)];

// ---- e.sound.swap ----
// Level 1 (listening). English: [word, picture, clue word whose first sound replaces the first sound,
// key, picture, a word with another new sound ("wrong-new-sound"), picture]. The word itself is offered
// too ("kept-old-sound").
type EnSwap = [string, string, string, string, string, string, string];
const EN_SWAP: EnSwap[] = [
  ["cat", "🐱", "house", "hat", "🎩", "rat", "🐀"], ["bat", "🦇", "rain", "rat", "🐀", "cat", "🐱"], ["pan", "🍳", "vest", "van", "🚐", "can", "🥫"],
  ["dog", "🐶", "lamp", "log", "🪵", "fog", "🌫️"], ["mice", "🐭", "rain", "rice", "🍚", "dice", "🎲"], ["goat", "🐐", "cat", "coat", "🧥", "boat", "⛵"],
  ["meat", "🥩", "sun", "seat", "💺", "feet", "🦶"], ["sock", "🧦", "rain", "rock", "🪨", "lock", "🔒"], ["hen", "🐔", "pig", "pen", "🖊️", "ten", "🔟"],
  ["bear", "🐻", "pig", "pear", "🍐", "chair", "🪑"], ["boat", "⛵", "goose", "goat", "🐐", "coat", "🧥"], ["map", "🗺️", "cow", "cap", "🧢", "tap", "🚰"],
];
// Spanish: [word, picture, syllable to change, new syllable, key, picture, another new syllable, picture].
type EsSwap = [string, string, string, string, string, string, string, string];
const ES_SWAP: EsSwap[] = [
  ["gato", "🐱", "ga", "pa", "pato", "🦆", "moto", "🏍️"], ["casa", "🏠", "ca", "ro", "rosa", "🌹", "fresa", "🍓"],
  ["luna", "🌙", "lu", "ra", "rana", "🐸", "lana", "🧶"], ["vaca", "🐮", "va", "fo", "foca", "🦭", "boca", "👄"],
  ["bota", "👢", "bo", "go", "gota", "💧", "rata", "🐀"], ["mano", "✋", "ma", "pi", "pino", "🌲", "mono", "🐒"],
  ["cama", "🛏️", "ca", "lla", "llama", "🦙", "pluma", "🪶"], ["sopa", "🍲", "so", "ro", "ropa", "👕", "lupa", "🔍"],
  ["piña", "🍍", "pi", "ni", "niña", "👧", "uña", "💅"], ["gallo", "🐓", "ga", "po", "pollo", "🐔", "caballo", "🐴"],
  ["caja", "📦", "ca", "ho", "hoja", "🍃", "abeja", "🐝"], ["plato", "🍽️", "pla", "pa", "pato", "🦆", "gato", "🐱"],
];

function enSwapQ([w, wp, clue, k, kp, other, op]: EnSwap): Q {
  const W = cap(w);
  const ask = `${W}. Change its first sound to the start of ${clue}.`;
  return {
    prompt: ask,
    say: `${ask} What is the new word?`,
    picture: wp,
    alt: altFor("en", w),
    choices: [pic(k, kp), pic(w, wp, "kept-old-sound"), pic(other, op, "wrong-new-sound")],
    hints: [
      `Say ${clue}. Listen to its first sound.`,
      `Keep the rest of ${w} the same.`,
      `${cap(other)} does not start like ${clue}.`,
    ],
    steps: [`${W} with the first sound of ${clue} is ${k}.`],
  };
}

function esSwapQ([w, wp, old, neu, k, kp, other, op]: EsSwap): Q {
  const W = cap(w);
  const ask = `${W}. Cambia ${old} por ${neu}.`;
  return {
    prompt: ask,
    say: `${ask} ¿Qué palabra es?`,
    picture: wp,
    alt: altFor("es", w),
    choices: [pic(k, kp), pic(w, wp, "kept-old-sound"), pic(other, op, "wrong-new-sound")],
    hints: [
      `Di ${w} por sílabas. Busca ${old}.`,
      `Pon ${neu} en lugar de ${old}. Lo demás queda igual.`,
      `${cap(other)} cambió ${old}, pero no por ${neu}.`,
    ],
    steps: [`${W} con ${neu} en lugar de ${old} es ${k}.`],
  };
}

// Level 2 (reading): change one written letter. [word, letter to change, new letter, key, a word made
// with another letter ("wrong-new-letter")]; the word itself is offered too ("kept-old-letter").
type Swap = [string, string, string, string, string];
const EN_SWAP_READ: Swap[] = [
  ["cat", "c", "h", "hat", "bat"], ["pig", "p", "w", "wig", "big"], ["sun", "s", "r", "run", "bun"], ["dog", "d", "l", "log", "fog"],
  ["bed", "d", "g", "beg", "bet"], ["cap", "p", "t", "cat", "can"], ["hop", "p", "t", "hot", "hog"], ["web", "b", "t", "wet", "wed"],
  ["hat", "a", "i", "hit", "hut"], ["pin", "i", "a", "pan", "pen"], ["bag", "a", "u", "bug", "big"], ["top", "o", "i", "tip", "tap"],
  ["net", "e", "u", "nut", "not"], ["log", "o", "e", "leg", "lag"], ["man", "m", "f", "fan", "can"], ["rug", "r", "b", "bug", "hug"],
];
const ES_SWAP_READ: Swap[] = [
  ["gato", "g", "p", "pato", "rato"], ["casa", "c", "m", "masa", "pasa"], ["luna", "l", "c", "cuna", "duna"], ["sopa", "s", "r", "ropa", "copa"],
  ["vaso", "v", "p", "paso", "caso"], ["mesa", "e", "i", "misa", "musa"], ["rana", "r", "l", "lana", "cana"], ["dedo", "e", "a", "dado", "dudo"],
  ["pera", "e", "u", "pura", "para"], ["bota", "b", "g", "gota", "nota"], ["pala", "l", "t", "pata", "pasa"], ["foca", "f", "b", "boca", "roca"],
  ["pino", "p", "v", "vino", "fino"], ["malo", "m", "p", "palo", "halo"], ["dama", "d", "c", "cama", "rama"], ["loma", "l", "c", "coma", "goma"],
];

function swapReadQ(locale: Locale, [w, old, neu, k, other]: Swap): Q {
  const ask = tr(locale, `Change the ${old} in ${w} to ${neu}.`, `Cambia la ${old} de ${w} por ${neu}.`);
  return {
    prompt: ask,
    say: `${ask} ${tr(locale, "Which word do you get?", "¿Qué palabra se forma?")}`,
    choices: [word(k), word(w, "kept-old-letter"), word(other, "wrong-new-letter")],
    hints: [
      tr(locale, `Find the ${old} in ${w}.`, `Busca la ${old} en ${w}.`),
      tr(locale, "Swap only that letter. Keep the others.", "Cambia solo esa letra. Las demás quedan igual."),
      tr(locale, `${cap(other)} does not use the letter ${neu}.`, `${cap(other)} no usa la letra ${neu}.`),
    ],
    steps: [`${w} → ${k}`, tr(locale, `With ${neu} in place of ${old}, it says ${k}.`, `Con ${neu} en lugar de ${old}, dice ${k}.`)],
  };
}

export const SOUND_SWAP: Entry[][] = [both(EN_SWAP, ES_SWAP, enSwapQ, esSwapQ), same(EN_SWAP_READ, ES_SWAP_READ, swapReadQ)];

// ---- e.segment.sounds (grade 1) ----
// [the word split into its sounds, picture]. Choices are 2–5 sounds. A wrong count equal to the number
// of letters is "counted-letters" (sh, ck, ee, ch, ll, rr, qu and a silent e or h are one sound or none);
// otherwise "missed-a-sound" or "added-a-sound".
type Seg = [string, string];
const EN_SEG: Seg[] = [
  ["b-ee", "🐝"], ["c-ow", "🐮"], ["sh-oe", "👞"], ["e-gg", "🥚"], ["c-a-t", "🐱"], ["f-i-sh", "🐟"], ["d-u-ck", "🦆"], ["sh-i-p", "🚢"],
  ["m-oo-n", "🌙"], ["c-a-ke", "🎂"], ["sh-ee-p", "🐑"], ["t-r-ee", "🌳"], ["f-r-o-g", "🐸"], ["h-a-n-d", "✋"], ["t-r-ai-n", "🚆"], ["p-l-a-n-t", "🪴"],
];
const ES_SEG: Seg[] = [
  ["t-é", "🍵"], ["s-o-l", "☀️"], ["p-a-n", "🍞"], ["o-s-o", "🐻"], ["u-v-a", "🍇"], ["ho-j-a", "🍃"], ["l-u-z", "💡"], ["c-a-s-a", "🏠"],
  ["p-a-t-o", "🦆"], ["t-r-e-n", "🚆"], ["f-l-o-r", "🌸"], ["l-e-ch-e", "🥛"], ["qu-e-s-o", "🧀"], ["p-e-rr-o", "🐶"], ["ll-a-v-e", "🔑"], ["p-l-a-t-o", "🍽️"],
];

function segQ(locale: Locale, [split, picture]: Seg): Q {
  const parts = split.split("-");
  const w = parts.join("");
  const n = parts.length;
  const W = cap(w);
  const sounds = (k: number) => tr(locale, `${k} sounds`, `${k} sonidos`);
  const tag = (k: number) => (k === w.length ? "counted-letters" : k < n ? "missed-a-sound" : "added-a-sound");
  const silentH = w.startsWith("h");
  return {
    prompt: tr(locale, `How many sounds in ${w}?`, `¿Cuántos sonidos tiene ${w}?`),
    say: tr(locale, `${W}. How many sounds do you hear in ${w}?`, `${W}. ¿Cuántos sonidos oyes en ${w}?`),
    picture,
    alt: altFor(locale, w),
    choices: [n, ...[2, 3, 4, 5].filter((k) => k !== n)].map((k) => voiced(String(k), sounds(k), k === n ? undefined : tag(k))),
    hints: [
      tr(locale, "Say the word very slowly.", "Di la palabra muy despacio."),
      tr(locale, "Hold up a finger for each sound you hear.", "Levanta un dedo por cada sonido que oyes."),
      silentH
        ? `La h no suena. El primer sonido se escribe ${parts[0].replace("h", "")}.`
        : tr(locale, `The first sound is spelled ${parts[0]}. Count from there.`, `El primer sonido se escribe ${parts[0]}. Sigue contando.`),
    ],
    steps: [parts.join(" - "), tr(locale, `${W} has ${n} sounds.`, `${W} tiene ${n} sonidos.`)],
  };
}

export const SEGMENT_SOUNDS: Entry[][] = [same(EN_SEG, ES_SEG, segQ)];
