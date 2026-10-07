import type { Locale } from "@/lib/types";
import { tr } from "../../text";
import { cap, same, word, type Entry, type Q } from "./core";
import { readQ, TAGS } from "./read";

// Grade 1 reading, part 1: short-vowel words, letter pairs (digraphs), and blends at the start and the
// end of a word. Spanish: sílabas directas (ma, me, mi…), ch / ll / rr, sílabas trabadas (pla, bra…)
// and sílabas inversas or closed syllables (es, an, -tor-).

// ---- e.short.vowels ----
// Level 1: picture → written words that differ in the vowel (V) or a consonant (C).
// Spanish level 1: picture → its first syllable (always consonant + vowel), in writing.
type Read = [string, string, string];
const EN_SHORT: Read[] = [
  ["cat", "🐱", "cot:V cut:V can:C"], ["pig", "🐷", "peg:V pug:V pin:C"], ["dog", "🐶", "dig:V dug:V dot:C"], ["bed", "🛏️", "bad:V bid:V beg:C"],
  ["sun", "☀️", "sin:V sum:C bun:C"], ["map", "🗺️", "mop:V mat:C cap:C"], ["fox", "🦊", "fix:V fax:V box:C"], ["cup", "☕", "cap:V cop:V pup:C"],
  ["net", "🥅", "nut:V not:V pet:C"], ["leg", "🦵", "log:V lag:V peg:C"], ["pin", "📌", "pan:V pen:V pit:C"], ["hat", "🎩", "hot:V hut:V ham:C"],
  ["bag", "👜", "big:V bug:V bat:C"], ["bat", "🦇", "bit:V but:V bag:C"], ["ten", "🔟", "tan:V tin:V hen:C"], ["jet", "✈️", "jot:V jut:V net:C"],
];
/** [word, picture, first syllable, three other syllables] */
type Syl = [string, string, string, string];
const ES_SHORT: Syl[] = [
  ["mano", "✋", "ma", "mo mu na"], ["mono", "🐒", "mo", "ma mi no"], ["pato", "🦆", "pa", "po pe ba"], ["pera", "🍐", "pe", "pa pi be"],
  ["piña", "🍍", "pi", "pa pu bi"], ["sopa", "🍲", "so", "sa su lo"], ["luna", "🌙", "lu", "la lo nu"], ["lobo", "🐺", "lo", "la le ro"],
  ["dado", "🎲", "da", "de du ta"], ["dedo", "☝️", "de", "da di te"], ["nube", "☁️", "nu", "na ne mu"], ["niña", "👧", "ni", "na no mi"],
  ["tomate", "🍅", "to", "ta tu do"], ["taza", "☕", "ta", "to te da"], ["sofá", "🛋️", "so", "sa si fo"], ["foca", "🦭", "fo", "fa fe po"],
];

function enShortQ(locale: Locale, [w, picture, spec]: Read): Q {
  return readQ(locale, w, picture, spec, ["Listen for the middle sound. Find that vowel.", "Escucha la vocal de en medio."]);
}
function esSyllableQ(locale: Locale, [w, picture, syl, others]: Syl): Q {
  const rest = w.slice(syl.length);
  const wrong = others.split(" ").map((d) => word(d, d[0] === syl[0] ? TAGS.V : TAGS.C));
  return {
    prompt: `¿Con qué sílaba empieza? ___${rest}`,
    say: `${cap(w)}. ¿Con qué sílaba empieza?`,
    picture,
    alt: `Imagen: ${w}`,
    choices: [word(syl), ...wrong],
    hints: ["Di la palabra por sílabas.", "La primera sílaba tiene una consonante y una vocal.", `Con ${wrong[0].label} diría ${wrong[0].label}${rest}.`],
    steps: [`${cap(w)} empieza con ${syl}: ${syl}-${rest}.`],
  };
}

// Level 2: read a word, tap its picture. Picture choices speak their names; the word is not spoken.
/** [word, picture, two other words with pictures, as "word:emoji"] */
type FindPic = [string, string, string];
const EN_FIND: FindPic[] = [
  ["pin", "📌", "pan:🍳 pen:🖊️"], ["pan", "🍳", "pin:📌 pen:🖊️"], ["pen", "🖊️", "pan:🍳 pin:📌"], ["bag", "👜", "bug:🐛 bat:🦇"],
  ["bug", "🐛", "bag:👜 bus:🚌"], ["hat", "🎩", "hot:🥵 hut:🛖"], ["hut", "🛖", "hat:🎩 nut:🥜"], ["hot", "🥵", "hat:🎩 pot:🍲"],
  ["log", "🪵", "leg:🦵 dog:🐶"], ["cap", "🧢", "cup:☕ cat:🐱"], ["cup", "☕", "cap:🧢 pup:🐶"], ["net", "🥅", "nut:🥜 jet:✈️"],
  ["nut", "🥜", "net:🥅 hut:🛖"], ["bat", "🦇", "bag:👜 hat:🎩"], ["fox", "🦊", "box:📦 fog:🌫️"], ["can", "🥫", "cat:🐱 pan:🍳"],
];
const ES_FIND: FindPic[] = [
  ["mano", "✋", "mono:🐒 mapa:🗺️"], ["mono", "🐒", "mano:✋ moño:🎀"], ["casa", "🏠", "cama:🛏️ taza:☕"], ["cama", "🛏️", "casa:🏠 llama:🦙"],
  ["bota", "👢", "bata:🥼 boca:👄"], ["boca", "👄", "bota:👢 foca:🦭"], ["luna", "🌙", "lana:🧶 lupa:🔍"], ["lana", "🧶", "luna:🌙 rana:🐸"],
  ["dado", "🎲", "dedo:☝️ dardo:🎯"], ["loro", "🦜", "toro:🐂 lobo:🐺"], ["toro", "🐂", "loro:🦜 lobo:🐺"], ["sopa", "🍲", "ropa:👕 copa:🏆"],
  ["oso", "🐻", "ojo:👁️ ocho:8️⃣"], ["uva", "🍇", "uña:💅 ave:🐦"], ["sol", "☀️", "col:🥬 sal:🧂"], ["foca", "🦭", "boca:👄 vaca:🐮"],
];

/** Same letters except the vowels: the miss is a vowel; otherwise a consonant. */
const vowelOnly = (a: string, b: string) => a.length === b.length && a.replace(/[aeiouáéíóú]/g, "") === b.replace(/[aeiouáéíóú]/g, "");

function findQ(locale: Locale, [w, picture, spec]: FindPic): Q {
  const others = spec.split(" ").map((s) => s.split(":"));
  const pic = (label: string, say: string, why?: string) => ({ label, say, ...(why ? { why } : {}) });
  const [d1] = others[0];
  return {
    prompt: tr(locale, `Find the picture: ${w}`, `Busca el dibujo: ${w}`),
    say: tr(locale, "Read the word. Tap its picture.", "Lee la palabra. Toca su dibujo."),
    choices: [pic(picture, w), ...others.map(([d, emoji]) => pic(emoji, d, vowelOnly(d, w) ? TAGS.V : TAGS.C))],
    hints: [
      tr(locale, "Read the word one sound at a time.", "Lee la palabra sonido por sonido."),
      tr(locale, "Tap each picture to hear its name.", "Toca cada dibujo para oír su nombre."),
      vowelOnly(d1, w)
        ? tr(locale, `${cap(d1)} has a different vowel sound.`, `${cap(d1)} tiene otra vocal.`)
        : tr(locale, `${cap(d1)} has a different consonant.`, `${cap(d1)} tiene otra consonante.`),
    ],
    steps: [tr(locale, `${w.split("").join("-")} says ${w}.`, `${w.split("").join("-")} dice ${w}.`), `${w}: ${picture}`],
  };
}

export const SHORT_VOWELS: Entry[][] = [
  EN_SHORT.map((d, i) => ({ en: enShortQ("en", d), es: esSyllableQ("es", ES_SHORT[i]) })),
  same(EN_FIND, ES_FIND, findQ),
];
