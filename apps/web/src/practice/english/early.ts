import type { Locale } from "@/lib/types";
import type { Rng } from "../rng";
import { tr } from "../text";
import type { Choice, ItemBody, MathPart, Skill } from "../types";

// K–4 English. Every skill is a hand-written bank (content "draft"), written separately in English and
// Spanish. The Spanish entry teaches the same skill in Spanish (Spanish words, Spanish spelling rules),
// so the two are often different questions in the same slot. K items work without reading: a picture,
// a read-aloud line, and a spoken label on every choice.

/** One question in one language. `choices[0]` is the key; the generator shuffles. */
export type Q = { prompt: string; say: string; picture?: string; alt?: string; choices: Choice[]; hints: string[]; steps: string[] };
export type Entry = Record<Locale, Q>;

/** Pairs the English and Spanish lists slot by slot, so a seed picks the same slot in both. */
function both<T, U>(en: T[], es: U[], buildEn: (d: T) => Q, buildEs: (d: U) => Q): Entry[] {
  if (en.length !== es.length) throw new Error(`English has ${en.length} items, Spanish ${es.length}`);
  return en.map((d, i) => ({ en: buildEn(d), es: buildEs(es[i]) }));
}
/** Same data shape in both languages, one builder that takes the locale. */
const same = <T>(en: T[], es: T[], build: (locale: Locale, d: T) => Q) => both(en, es, (d) => build("en", d), (d) => build("es", d));

/** "___" in a prompt becomes the answer blank. */
const toParts = (s: string): MathPart[] => s.split("___").flatMap((p, i): MathPart[] => (i ? [{ blank: true }, p] : [p])).filter((p) => p !== "");
/** A sentence with a blank, as read aloud: a pause where the blank is. */
const spoken = (s: string) => s.replace("___", "…");
const fill = (s: string, word: string) => s.replace("___", word);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const altFor = (locale: Locale, w: string) => tr(locale, `${/^[aeiou]/.test(w) ? "An" : "A"} ${w}`, `Imagen: ${w}`);

function fromBank(bank: Entry[][], seconds: number[]): Skill["generate"] {
  return (r: Rng, level: number, locale: Locale): ItemBody => {
    const q = r.pick(bank[level - 1])[locale];
    const order = r.shuffle(q.choices.map((_, i) => i));
    return {
      prompt: toParts(q.prompt),
      say: q.say,
      ...(q.picture ? { picture: q.picture, alt: q.alt } : {}),
      choices: order.map((i) => q.choices[i]),
      input: "choices",
      answer: { kind: "choice", index: order.indexOf(0) },
      hints: q.hints,
      steps: q.steps,
      seconds: seconds[Math.min(level, seconds.length) - 1],
    };
  };
}

// ---- Letter sounds (K) ----
// English choices say the letter's sound. Spanish choices say the letter's name ("eme", "pe"), which is
// how Spanish classrooms ask ("¿con qué letra empieza?") and which carries the sound for every letter
// used here. Letters that share a sound (c/k, s/z, b/v, g/j) are never offered against each other.
const EN_SOUND: Record<string, string> = {
  b: "buh", d: "duh", f: "fff", g: "guh", h: "huh", j: "juh", k: "kuh", l: "lll", m: "mmm", n: "nnn", p: "puh", r: "rrr",
  s: "sss", t: "tuh", v: "vvv", w: "wuh", y: "yuh", z: "zzz",
  a: "a, as in at", e: "e, as in end", i: "i, as in it", o: "o, as in on", u: "u, as in up",
};
const ES_NAME: Record<string, string> = {
  a: "a", b: "be", d: "de", e: "e", f: "efe", g: "ge", i: "i", j: "jota", k: "ka", l: "ele", m: "eme", n: "ene", o: "o",
  p: "pe", r: "erre", s: "ese", t: "te", u: "u", v: "ve", y: "ye", z: "zeta",
};

/** [word, picture, first letter, three other letters] */
type LetterPic = [string, string, string, string];
const EN_LETTERS: LetterPic[][] = [
  [
    ["ball", "⚽", "b", "dpm"], ["bus", "🚌", "b", "dps"], ["moon", "🌙", "m", "nbl"], ["monkey", "🐒", "m", "ntf"],
    ["sun", "☀️", "s", "ftm"], ["sock", "🧦", "s", "fdn"], ["tooth", "🦷", "t", "dpl"], ["tiger", "🐯", "t", "dfr"],
    ["pig", "🐷", "p", "bdt"], ["pizza", "🍕", "p", "bts"], ["dog", "🐶", "d", "bpt"], ["duck", "🦆", "d", "btm"],
    ["fish", "🐟", "f", "stp"], ["fox", "🦊", "f", "sbn"], ["nose", "👃", "n", "mlr"], ["lion", "🦁", "l", "rnd"],
    ["leaf", "🍃", "l", "rtf"], ["ring", "💍", "r", "lnb"], ["rocket", "🚀", "r", "lmt"],
  ],
  [
    ["apple", "🍎", "a", "euo"], ["ant", "🐜", "a", "eiu"], ["egg", "🥚", "e", "aiu"], ["elephant", "🐘", "e", "aio"],
    ["octopus", "🐙", "o", "aue"], ["umbrella", "☂️", "u", "aoi"], ["horse", "🐴", "h", "frb"], ["hat", "🎩", "h", "fmb"],
    ["goat", "🐐", "g", "kdb"], ["web", "🕸️", "w", "vmr"], ["watch", "⌚", "w", "vry"], ["van", "🚐", "v", "fbw"],
    ["violin", "🎻", "v", "fwb"], ["zebra", "🦓", "z", "sjd"], ["key", "🔑", "k", "gth"],
  ],
];
const ES_LETTERS: LetterPic[][] = [
  [
    ["pelota", "⚽", "p", "btd"], ["perro", "🐶", "p", "bmt"], ["ballena", "🐋", "b", "pdm"], ["mano", "✋", "m", "npl"],
    ["mono", "🐒", "m", "nbt"], ["luna", "🌙", "l", "nrd"], ["león", "🦁", "l", "ndm"], ["sol", "☀️", "s", "flt"],
    ["silla", "🪑", "s", "fmn"], ["tomate", "🍅", "t", "dpm"], ["tortuga", "🐢", "t", "dpl"], ["dado", "🎲", "d", "btp"],
    ["delfín", "🐬", "d", "btl"], ["fuego", "🔥", "f", "spt"], ["fresa", "🍓", "f", "spt"], ["nariz", "👃", "n", "mld"],
    ["nube", "☁️", "n", "mlb"], ["ratón", "🐭", "r", "lnd"], ["rana", "🐸", "r", "lnm"],
  ],
  [
    ["abeja", "🐝", "a", "eou"], ["árbol", "🌳", "a", "oei"], ["avión", "✈️", "a", "eou"], ["elefante", "🐘", "e", "aio"],
    ["estrella", "⭐", "e", "aiu"], ["isla", "🏝️", "i", "eau"], ["imán", "🧲", "i", "euo"], ["oso", "🐻", "o", "uae"],
    ["ojo", "👁️", "o", "uai"], ["oveja", "🐑", "o", "uae"], ["uva", "🍇", "u", "oae"], ["jirafa", "🦒", "j", "lty"],
    ["zapato", "👞", "z", "tdp"], ["vaca", "🐮", "v", "pfm"], ["kiwi", "🥝", "k", "gtp"],
  ],
];

function letterQ(locale: Locale, [word, picture, letter, others]: LetterPic): Q {
  const W = cap(word);
  const sound = (l: string) => (locale === "es" ? ES_NAME[l] : EN_SOUND[l]);
  return {
    prompt: tr(locale, `What sound does ${word} start with?`, `¿Con qué sonido empieza ${word}?`),
    say: tr(locale, `${W}. Which letter does ${word} start with?`, `${W}. ¿Con qué letra empieza ${word}?`),
    picture,
    alt: altFor(locale, word),
    choices: [letter, ...others].map((l) => ({ label: l, say: sound(l) })),
    hints: [
      tr(locale, `Say "${word}" slowly.`, `Di "${word}" despacio.`),
      tr(locale, "Listen for the first sound only. Then listen to each letter's sound.", "Escucha solo el primer sonido. Luego escucha cada letra."),
      "aeiou".includes(letter)
        ? tr(locale, `${W} starts with a vowel sound. Which vowel matches?`, `${W} empieza con una vocal. ¿Cuál vocal suena al principio?`)
        : tr(locale, `${W} without its first sound is "${word.slice(1)}". What sound is missing?`, `${W} sin su primer sonido es "${word.slice(1)}". ¿Qué sonido falta?`),
    ],
    steps: [tr(locale, `${W} starts with the letter ${letter}.`, `${W} empieza con la letra ${letter}.`)],
  };
}

// ---- Rhyme (K) ----
/** [word, picture, rhyme, picture, other, picture, other, picture, shared ending] */
type RhymeSet = [string, string, string, string, string, string, string, string, string];
const EN_RHYMES: RhymeSet[] = [
  ["cat", "🐱", "hat", "🎩", "dog", "🐶", "sun", "☀️", "at"],
  ["dog", "🐶", "frog", "🐸", "cat", "🐱", "bee", "🐝", "og"],
  ["bee", "🐝", "tree", "🌳", "fish", "🐟", "cake", "🎂", "ee"],
  ["moon", "🌙", "spoon", "🥄", "star", "⭐", "sock", "🧦", "oon"],
  ["star", "⭐", "car", "🚗", "moon", "🌙", "bed", "🛏️", "ar"],
  ["cake", "🎂", "snake", "🐍", "bus", "🚌", "pig", "🐷", "ake"],
  ["goat", "🐐", "boat", "⛵", "fish", "🐟", "sun", "☀️", "oat"],
  ["bear", "🐻", "pear", "🍐", "fox", "🦊", "bell", "🔔", "ear"],
  ["fox", "🦊", "box", "📦", "cat", "🐱", "sun", "☀️", "ox"],
  ["bell", "🔔", "shell", "🐚", "dog", "🐶", "cake", "🎂", "ell"],
  ["house", "🏠", "mouse", "🐭", "car", "🚗", "bee", "🐝", "ouse"],
  ["bed", "🛏️", "sled", "🛷", "bus", "🚌", "moon", "🌙", "ed"],
  ["clock", "⏰", "sock", "🧦", "hat", "🎩", "tree", "🌳", "ock"],
  ["duck", "🦆", "truck", "🚚", "fish", "🐟", "star", "⭐", "uck"],
  ["nose", "👃", "rose", "🌹", "cat", "🐱", "boat", "⛵", "ose"],
];
const ES_RHYMES: RhymeSet[] = [
  ["gato", "🐱", "pato", "🦆", "luna", "🌙", "pez", "🐟", "ato"],
  ["sol", "☀️", "caracol", "🐌", "gato", "🐱", "luna", "🌙", "ol"],
  ["ratón", "🐭", "jabón", "🧼", "pato", "🦆", "sol", "☀️", "ón"],
  ["corazón", "❤️", "avión", "✈️", "casa", "🏠", "luna", "🌙", "ón"],
  ["león", "🦁", "camión", "🚚", "perro", "🐶", "flor", "🌸", "ón"],
  ["flor", "🌸", "tambor", "🥁", "gato", "🐱", "pez", "🐟", "or"],
  ["rana", "🐸", "manzana", "🍎", "sol", "☀️", "tren", "🚆", "ana"],
  ["fresa", "🍓", "princesa", "👸", "gato", "🐱", "perro", "🐶", "esa"],
  ["zapato", "👞", "gato", "🐱", "flor", "🌸", "luna", "🌙", "ato"],
  ["pelota", "⚽", "bota", "👢", "sol", "☀️", "tren", "🚆", "ota"],
  ["cama", "🛏️", "llama", "🦙", "pez", "🐟", "oso", "🐻", "ama"],
  ["mano", "✋", "gusano", "🐛", "perro", "🐶", "sol", "☀️", "ano"],
  ["abeja", "🐝", "oveja", "🐑", "sol", "☀️", "gato", "🐱", "eja"],
  ["piña", "🍍", "niña", "👧", "pez", "🐟", "tren", "🚆", "iña"],
  ["helado", "🍦", "dado", "🎲", "luna", "🌙", "flor", "🌸", "ado"],
];

function rhymeQ(locale: Locale, [t, tp, w, wp, a, ap, b, bp, end]: RhymeSet): Q {
  const T = cap(t);
  const ask = tr(locale, `Which one rhymes with ${t}?`, `¿Cuál rima con ${t}?`);
  return {
    prompt: ask,
    say: ask,
    picture: tp,
    alt: altFor(locale, t),
    choices: [[w, wp], [a, ap], [b, bp]].map(([label, picture]) => ({ label, say: label, picture })),
    hints: [
      tr(locale, "Rhyming words sound the same at the end.", "Las palabras que riman suenan igual al final."),
      tr(locale, `Say ${t}, then each word. Listen to how they end.`, `Di ${t} y luego cada palabra. Escucha cómo terminan.`),
      tr(locale, `${T} ends with "-${end}". Which word ends the same way?`, `${T} termina en "-${end}". ¿Cuál termina igual?`),
    ],
    steps: [tr(locale, `${T} and ${w} both end with "-${end}".`, `${T} y ${w} terminan en "-${end}".`), tr(locale, `${cap(w)} rhymes with ${t}.`, `${cap(w)} rima con ${t}.`)],
  };
}

// ---- Syllables (K) ----
/** [word split into syllables, number of claps, picture] */
type Claps = [string, number, string];
const EN_CLAPS: Claps[] = [
  ["but-ter-fly", 3, "🦋"], ["ba-na-na", 3, "🍌"], ["dog", 1, "🐶"], ["ap-ple", 2, "🍎"], ["el-e-phant", 3, "🐘"],
  ["ti-ger", 2, "🐯"], ["sun", 1, "☀️"], ["piz-za", 2, "🍕"], ["cat-er-pil-lar", 4, "🐛"], ["wa-ter-mel-on", 4, "🍉"],
  ["mon-key", 2, "🐒"], ["hel-i-cop-ter", 4, "🚁"], ["fish", 1, "🐟"], ["rock-et", 2, "🚀"], ["to-ma-to", 3, "🍅"],
  ["pine-ap-ple", 3, "🍍"], ["av-o-ca-do", 4, "🥑"], ["cat", 1, "🐱"], ["kan-ga-roo", 3, "🦘"], ["pen-guin", 2, "🐧"],
];
const ES_CLAPS: Claps[] = [
  ["ma-ri-po-sa", 4, "🦋"], ["sol", 1, "☀️"], ["ga-to", 2, "🐱"], ["pe-lo-ta", 3, "⚽"], ["e-le-fan-te", 4, "🐘"],
  ["pez", 1, "🐟"], ["lu-na", 2, "🌙"], ["tor-tu-ga", 3, "🐢"], ["man-za-na", 3, "🍎"], ["plá-ta-no", 3, "🍌"],
  ["flor", 1, "🌸"], ["tren", 1, "🚆"], ["mo-no", 2, "🐒"], ["san-dí-a", 3, "🍉"], ["ca-mión", 2, "🚚"],
  ["ji-ra-fa", 3, "🦒"], ["co-co-dri-lo", 4, "🐊"], ["a-gua-ca-te", 4, "🥑"], ["pan", 1, "🍞"], ["o-so", 2, "🐻"],
];

function syllableQ(locale: Locale, [split, claps, picture]: Claps): Q {
  const parts = split.split("-");
  const word = parts.join("");
  const clapWord = (n: number) => (n === 1 ? tr(locale, "1 clap", "1 palmada") : tr(locale, `${n} claps`, `${n} palmadas`));
  const ask = tr(locale, `How many claps in ${word}?`, `¿Cuántas palmadas tiene ${word}?`);
  return {
    prompt: ask,
    say: ask,
    picture,
    alt: altFor(locale, word),
    choices: [claps, ...[1, 2, 3, 4].filter((n) => n !== claps)].map((n) => ({ label: String(n), say: clapWord(n), picture: "👏".repeat(n) })),
    hints: [
      tr(locale, `Say "${word}" and clap for each part.`, `Di "${word}" y da una palmada por cada parte.`),
      tr(locale, "Put your hand under your chin and say the word. Each time your chin drops is one clap.", "Pon la mano bajo la barbilla y di la palabra. Cada vez que baja la barbilla es una palmada."),
      tr(locale, `The first clap is "${parts[0]}". Is any part left?`, `La primera palmada es "${parts[0]}". ¿Queda alguna parte?`),
    ],
    steps: [`${cap(word)}: ${parts.join(" - ")}`, tr(locale, `${cap(word)} has ${clapWord(claps)}.`, `${cap(word)} tiene ${clapWord(claps)}.`)],
  };
}

// ---- Sight words (K) ----
// The item says the word; the learner finds it among look-alikes. Choices are not read aloud on
// purpose: hearing each choice would turn word recognition into sound matching. No homophones
// (see/sea, to/two, más/mas) appear together.
/** [word, three look-alikes] */
type Look = [string, string, string, string];
const EN_SIGHT: Look[][] = [
  [
    ["the", "then", "them", "she"], ["and", "an", "end", "hand"], ["is", "it", "in", "his"], ["you", "your", "yes", "our"],
    ["said", "sad", "sand", "paid"], ["was", "saw", "has", "wax"], ["have", "has", "hive", "gave"], ["they", "then", "the", "them"],
    ["can", "cat", "man", "car"], ["go", "to", "so", "got"], ["like", "lake", "lick", "bike"], ["my", "me", "may", "by"],
    ["we", "me", "wet", "he"], ["here", "her", "there", "hen"], ["come", "came", "cone", "some"], ["look", "book", "lock", "took"],
    ["play", "plan", "pay", "day"], ["up", "us", "cup", "pup"],
  ],
  [
    ["after", "often", "alter", "later"], ["again", "against", "agent", "gain"], ["could", "cold", "cloud", "would"],
    ["every", "very", "ever", "even"], ["from", "form", "farm", "frog"], ["give", "live", "gave", "given"],
    ["going", "doing", "gone", "goes"], ["once", "ounce", "one", "ones"], ["over", "ever", "oven", "open"],
    ["when", "then", "men", "where"], ["were", "where", "wire", "here"], ["walk", "wall", "talk", "work"],
    ["think", "thing", "thank", "thick"], ["them", "then", "the", "they"], ["how", "now", "who", "hot"],
    ["of", "off", "if", "on"], ["put", "but", "pat", "pot"], ["stop", "step", "spot", "top"],
  ],
];
const ES_SIGHT: Look[][] = [
  [
    ["el", "le", "en", "al"], ["la", "al", "le", "las"], ["las", "los", "la", "sal"], ["es", "se", "en", "el"],
    ["que", "queso", "quien", "quema"], ["en", "el", "un", "es"], ["un", "en", "su", "uno"], ["de", "del", "el", "da"],
    ["los", "las", "sol", "lo"], ["mi", "me", "ni", "si"], ["no", "ni", "lo", "nos"], ["con", "son", "como", "cono"],
    ["por", "pon", "par", "pez"], ["su", "tu", "sur", "se"], ["yo", "ya", "lo", "oye"], ["una", "uno", "unas", "uña"],
    ["me", "mi", "le", "mes"], ["le", "la", "el", "de"],
  ],
  [
    ["para", "pera", "parar", "pala"], ["pero", "perro", "pera", "para"], ["como", "coma", "cono", "comer"],
    ["cuando", "cuanto", "cuadro", "canto"], ["también", "tambor", "tampoco", "tiempo"], ["este", "esta", "ese", "estos"],
    ["esta", "este", "esa", "estas"], ["todo", "toda", "lodo", "modo"], ["bien", "buen", "cien", "tiene"],
    ["aquí", "aquel", "así", "aquella"], ["entre", "entra", "entero", "otra"], ["sobre", "sobra", "siempre", "sombra"],
    ["fue", "fui", "fuego", "que"], ["dijo", "hijo", "dije", "dio"], ["algo", "alto", "alga", "largo"],
    ["nada", "nade", "nado", "cada"], ["mucho", "mucha", "muchos", "ancho"], ["dice", "dije", "doce", "hice"],
  ],
];

function sightQ(locale: Locale, look: Look): Q {
  const w = look[0];
  // The shortest start that, with the length, leaves this word alone (never the whole word).
  let k = 1;
  while (k < w.length - 1 && look.filter((c) => c.length === w.length && c.startsWith(w.slice(0, k))).length > 1) k++;
  return {
    // The prompt uses no word from either list, so it never shows the answer.
    prompt: tr(locale, "Listen. Tap that word.", "Escucha y elige."),
    say: tr(locale, `Find the word: ${w}.`, `Busca la palabra: ${w}.`),
    choices: look.map((label) => ({ label })),
    hints: [
      tr(locale, "Listen to the word again. What sound does it start with?", "Escucha la palabra otra vez. ¿Con qué sonido empieza?"),
      tr(locale, "Look at the first letters of each word.", "Mira las primeras letras de cada palabra."),
      tr(locale, `It starts with "${w.slice(0, k)}" and has ${w.length} letters.`, `Empieza con "${w.slice(0, k)}" y tiene ${w.length} letras.`),
    ],
    steps: [tr(locale, `The word is "${w}": ${w.split("").join("-")}.`, `La palabra es "${w}": ${w.split("").join("-")}.`)],
  };
}

// ---- Short words (grade 1): CVC in English, CV(CV) in Spanish ----
/** [word, picture, three close spellings] */
type Spell = [string, string, string, string, string];
const EN_CVC: Spell[] = [
  ["cat", "🐱", "cot", "cut", "hat"], ["dog", "🐶", "dig", "dot", "log"], ["sun", "☀️", "run", "sat", "sum"],
  ["pig", "🐷", "peg", "big", "pin"], ["bus", "🚌", "bug", "but", "bat"], ["hat", "🎩", "hot", "cat", "ham"],
  ["bed", "🛏️", "bad", "bid", "red"], ["fox", "🦊", "box", "fix", "fog"], ["bug", "🐛", "bag", "big", "rug"],
  ["map", "🗺️", "mop", "cap", "man"], ["web", "🕸️", "wet", "wed", "wig"], ["box", "📦", "fox", "bat", "bus"],
  ["pen", "🖊️", "pin", "pan", "hen"], ["van", "🚐", "fan", "man", "vet"], ["bat", "🦇", "bet", "but", "cat"],
  ["rat", "🐀", "rot", "rug", "mat"], ["leg", "🦵", "log", "lag", "peg"],
];
const ES_CVC: Spell[] = [
  ["casa", "🏠", "cosa", "masa", "cama"], ["sol", "☀️", "sal", "col", "son"], ["luna", "🌙", "lana", "cuna", "lupa"],
  ["gato", "🐱", "pato", "gota", "rato"], ["pato", "🦆", "gato", "palo", "pata"], ["mano", "✋", "mono", "malo", "mapa"],
  ["mono", "🐒", "mano", "moño", "mona"], ["dado", "🎲", "dedo", "lado", "nado"], ["vaca", "🐮", "vaso", "saca", "cara"],
  ["rana", "🐸", "lana", "rama", "ropa"], ["bota", "👢", "bata", "boca", "gota"], ["nube", "☁️", "nudo", "nave", "sube"],
  ["pera", "🍐", "pero", "pena", "para"], ["uva", "🍇", "ave", "una", "uña"], ["oso", "🐻", "ojo", "eso", "asa"],
  ["cama", "🛏️", "casa", "coma", "rama"], ["boca", "👄", "bota", "foca", "poca"],
];

function spellQ(locale: Locale, [w, picture, ...others]: Spell): Q {
  return {
    prompt: tr(locale, "Which word matches the picture?", "¿Qué palabra va con el dibujo?"),
    say: tr(locale, `${cap(w)}. Which word says ${w}?`, `${cap(w)}. ¿Qué palabra dice ${w}?`),
    picture,
    alt: altFor(locale, w),
    choices: [w, ...others].map((label) => ({ label })),
    hints: [
      tr(locale, "Point to each letter and say its sound.", "Señala cada letra y di su sonido."),
      tr(locale, "Blend the sounds together and listen for the word.", "Junta los sonidos y escucha qué palabra se forma."),
      tr(locale, `${cap(w)} starts with "${w[0]}". Now check the other letters.`, `${cap(w)} empieza con "${w[0]}". Ahora revisa las otras letras.`),
    ],
    steps: [tr(locale, `${w.split("").join("-")} says "${w}".`, `${w.split("").join("-")} dice "${w}".`)],
  };
}

// ---- Capitals and end marks (grade 1) ----
// Wrong versions are made from the correct sentence: small first letter, no end mark, then the rule this
// sentence tests (a small "i", a question with a period; in Spanish a missing ¿ or ¡, a capital "Yo"
// mid-sentence, a capital day of the week).
const EN_CAPS = [
  "I see a red bird.", "My dog likes to run.", "Can you help me?", "Sam and I went to the park.", "The sun is hot today.",
  "Where is my hat?", "Mia has a big kite.", "We play in the snow.", "Do you like apples?", "Ben and I read a book.",
  "The cat sat on the mat.", "Is it time for lunch?", "Lily gave me a cookie.", "Today I can ride my bike.",
];
const ES_CAPS = [
  "Veo un pájaro rojo.", "Mi perro corre mucho.", "¿Me puedes ayudar?", "Sam y yo fuimos al parque.", "El sol está muy fuerte hoy.",
  "¿Dónde está mi gorra?", "Lucía tiene una pelota grande.", "Jugamos en la nieve.", "¿Te gustan las manzanas?", "¡Qué rico huele el pan!",
  "El gato está en la cama.", "Hoy es lunes.", "Ben y yo leemos un libro.", "¡Mira la luna!",
];

function capsQ(locale: Locale, s: string): Q {
  const i = s.search(/\p{L}/u);
  const wrong = [s.slice(0, i) + s[i].toLowerCase() + s.slice(i + 1), s.slice(0, -1)];
  const question = s.endsWith("?"), exclaim = s.endsWith("!");
  let rule: string;
  if (locale === "en") {
    if (s.includes(" I ")) {
      wrong.push(s.replace(" I ", " i "));
      rule = "I is always a capital letter, even mid-sentence.";
    } else if (question) {
      wrong.push(s.replace("?", "."));
      rule = "It asks something, so it needs a question mark.";
    } else rule = "Cross out any sentence that starts with a small letter. Then check the end.";
  } else if (question || exclaim) {
    wrong.push(s.slice(1));
    rule = question ? "Es una pregunta: lleva ¿ al principio y ? al final." : "Es una exclamación: lleva ¡ al principio y ! al final.";
  } else if (s.includes(" yo ")) {
    wrong.push(s.replace(" yo ", " Yo "));
    rule = "En español, yo va con minúscula en medio de la oración.";
  } else if (s.includes("lunes")) {
    wrong.push(s.replace("lunes", "Lunes"));
    rule = "En español, los días de la semana van con minúscula.";
  } else rule = "Tacha la oración que empieza con minúscula. Luego revisa el final.";
  const ask = tr(locale, "Which sentence is written correctly?", "¿Qué oración está bien escrita?");
  return {
    prompt: ask,
    say: ask,
    choices: [s, ...wrong].map((label) => ({ label })),
    hints: [
      tr(locale, "Check the first letter and the end of each sentence.", "Revisa la primera letra y el final de cada oración."),
      tr(locale, "A sentence starts with a capital letter. It ends with a period, question mark, or exclamation mark.", "Una oración empieza con mayúscula y termina con punto. Las preguntas llevan ¿ y ?, y las exclamaciones ¡ y !"),
      rule,
    ],
    steps: [tr(locale, "Capital letter first, the right mark at the end.", "Empieza con mayúscula y tiene los signos correctos."), tr(locale, `Correct: ${s}`, `Correcta: ${s}`)],
  };
}

// ---- Plurals (grade 1) ----
// Level 1: -s / -es. Level 2: English irregulars; Spanish z → ces and accent changes (lápiz → lápices,
// camión → camiones, joven → jóvenes) plus words that do not change (el lunes, los lunes).
/** [one, many, two wrong forms, rule, picture (or "")] */
type EnPlural = [string, string, string, string, "s" | "es" | "vowel" | "en" | "same" | "f", string];
const EN_PLURALS: EnPlural[][] = [
  [
    ["cat", "cats", "cates", "cat", "s", "🐱"], ["dog", "dogs", "doges", "dog", "s", "🐶"], ["fox", "foxes", "foxs", "fox", "es", "🦊"],
    ["box", "boxes", "boxs", "box", "es", "📦"], ["bus", "buses", "buss", "bus", "es", "🚌"], ["dish", "dishes", "dishs", "dish", "es", ""],
    ["brush", "brushes", "brushs", "brush", "es", ""], ["watch", "watches", "watchs", "watch", "es", "⌚"], ["bench", "benches", "benchs", "bench", "es", ""],
    ["hat", "hats", "hates", "hat", "s", "🎩"], ["ball", "balls", "balles", "ball", "s", "⚽"], ["bug", "bugs", "buges", "bug", "s", "🐛"],
    ["lunch", "lunches", "lunchs", "lunch", "es", ""],
  ],
  [
    ["child", "children", "childs", "childes", "en", "🧒"], ["mouse", "mice", "mouses", "mices", "vowel", "🐭"], ["foot", "feet", "foots", "feets", "vowel", "🦶"],
    ["tooth", "teeth", "tooths", "teeths", "vowel", "🦷"], ["man", "men", "mans", "mens", "vowel", "👨"], ["woman", "women", "womans", "womens", "vowel", "👩"],
    ["goose", "geese", "gooses", "geeses", "vowel", ""], ["sheep", "sheep", "sheeps", "sheepes", "same", "🐑"], ["deer", "deer", "deers", "deeres", "same", "🦌"],
    ["leaf", "leaves", "leafs", "leafes", "f", "🍃"], ["wolf", "wolves", "wolfs", "wolfes", "f", "🐺"], ["knife", "knives", "knifes", "knifs", "f", ""],
    ["shelf", "shelves", "shelfs", "shelfes", "f", ""],
  ],
];
/** [un/una, one, many, two wrong forms, rule, picture (or "")] */
type EsPlural = ["un" | "una", string, string, string, string, "s" | "es" | "z" | "on" | "gain" | "bus" | "same", string];
const ES_PLURALS: EsPlural[][] = [
  [
    ["un", "gato", "gatos", "gatoes", "gato", "s", "🐱"], ["una", "flor", "flores", "flors", "flor", "es", "🌸"], ["un", "sol", "soles", "sols", "sol", "es", "☀️"],
    ["un", "árbol", "árboles", "árbols", "árbol", "es", "🌳"], ["un", "reloj", "relojes", "relojs", "reloj", "es", "⌚"], ["una", "mano", "manos", "manoes", "mano", "s", "✋"],
    ["un", "papel", "papeles", "papels", "papel", "es", ""], ["un", "mar", "mares", "mars", "mar", "es", ""], ["un", "tren", "trenes", "trens", "tren", "es", "🚆"],
    ["un", "libro", "libros", "libroes", "libro", "s", "📖"], ["una", "mesa", "mesas", "mesaes", "mesa", "s", ""], ["un", "color", "colores", "colors", "color", "es", ""],
    ["un", "pan", "panes", "pans", "pan", "es", "🍞"],
  ],
  [
    ["un", "lápiz", "lápices", "lápizes", "lápiz", "z", "✏️"], ["un", "pez", "peces", "pezes", "pezs", "z", "🐟"], ["una", "luz", "luces", "luzes", "luzs", "z", "💡"],
    ["una", "nariz", "narices", "narizes", "narizs", "z", "👃"], ["una", "voz", "voces", "vozes", "vozs", "z", ""], ["un", "camión", "camiones", "camiónes", "camions", "on", "🚚"],
    ["un", "ratón", "ratones", "ratónes", "ratons", "on", "🐭"], ["un", "león", "leones", "leónes", "leons", "on", "🦁"], ["un", "corazón", "corazones", "corazónes", "corazons", "on", "❤️"],
    ["un", "avión", "aviones", "aviónes", "avions", "on", "✈️"], ["un", "joven", "jóvenes", "jovenes", "jóvens", "gain", ""], ["un", "autobús", "autobuses", "autobúses", "autobuss", "bus", "🚌"],
    ["un", "lunes", "lunes", "luneses", "lune", "same", ""],
  ],
];

function enPluralQ([one, many, w1, w2, rule, picture]: EnPlural): Q {
  const One = cap(one);
  const ending = /(ch|sh)$/.test(one) ? one.slice(-2) : one.slice(-1);
  const third: Record<EnPlural[4], string> = {
    s: `${One} ends in ${ending}. That is not s, x, z, ch or sh.`,
    es: `${One} ends in ${ending}.`,
    vowel: `The vowel sound in the middle of ${one} changes.`,
    en: `${One} does not add -s. Its plural ends in -en.`,
    same: `Think of a whole group of ${one} in a field. Does the word change?`,
    f: `${One} ends with an f sound. The f changes to v.`,
  };
  const how: Record<EnPlural[4], string> = {
    s: `Add -s to ${one}.`,
    es: `${One} ends in ${ending}, so add -es.`,
    vowel: `${One} changes inside instead of adding -s.`,
    en: `${One} does not add -s.`,
    same: `${One} stays the same for more than one.`,
    f: "The f becomes v, then add -es or -s.",
  };
  const regular = rule === "s" || rule === "es";
  return {
    prompt: `One ${one}, two ___.`,
    say: `One ${one}, two … Which word fits?`,
    ...(picture ? { picture, alt: altFor("en", one) } : {}),
    choices: [many, w1, w2].map((label) => ({ label })),
    hints: [
      regular ? "Two means more than one." : "This word does not just add -s.",
      regular ? "Most words add -s. After s, x, z, ch or sh, add -es." : "Say each one out loud: one foot, two feet. Some words change inside, and some stay the same.",
      third[rule],
    ],
    steps: [how[rule], `One ${one}, two ${many}.`],
  };
}

function esPluralQ([art, one, many, w1, w2, rule, picture]: EsPlural): Q {
  const One = cap(one);
  const Un = cap(art);
  const last = one.slice(-1);
  const third: Record<EsPlural[5], string> = {
    s: `${One} termina en la vocal ${last}.`,
    es: `${One} termina en la consonante ${last}.`,
    z: `${One} termina en z.`,
    on: `${One} termina en -ón. Al agregar -es, ¿sigue necesitando acento?`,
    gain: `${One} termina en n. Al agregar -es, la sílaba fuerte queda más lejos del final.`,
    bus: `${One} termina en s con acento. Al agregar -es, ¿sigue necesitando acento?`,
    same: `${One} termina en s y su sílaba fuerte no es la última.`,
  };
  const how: Record<EsPlural[5], string> = {
    s: `${One} termina en vocal: se agrega -s.`,
    es: `${One} termina en consonante: se agrega -es.`,
    z: `La z cambia a c y se agrega -es.`,
    on: "Se agrega -es y se quita el acento.",
    gain: "Se agrega -es y ahora lleva acento.",
    bus: "Se agrega -es y se quita el acento.",
    same: `${One} no cambia en plural.`,
  };
  const regular = rule === "s" || rule === "es";
  return {
    prompt: `${Un} ${one}, dos ___.`,
    say: `${Un} ${one}, dos … ¿Qué palabra va?`,
    ...(picture ? { picture, alt: altFor("es", one) } : {}),
    choices: [many, w1, w2].map((label) => ({ label })),
    hints: [
      regular ? "Dos quiere decir más de uno." : "Mira cómo termina la palabra.",
      regular ? "Si la palabra termina en vocal, se agrega -s. Si termina en consonante, se agrega -es." : "Para el plural se agrega -s o -es. A veces cambia una letra o el acento.",
      third[rule],
    ],
    steps: [how[rule], `${Un} ${one}, dos ${many}.`],
  };
}

// ---- Nouns and verbs (grade 2) ----
// Level 1 uses only words that cannot be both (no "run", "jump", "book"; in Spanish no "canto", "juego",
// "camino"): infinitives and clear nouns. Level 2 finds the word in a sentence.
/** [kind, answer, three others, Spanish article for a noun answer] */
type WordKind = ["verb" | "noun", string, string, string, string, ("un" | "una")?];
const EN_KINDS: WordKind[] = [
  ["verb", "sing", "tree", "apple", "happy"], ["verb", "eat", "window", "lion", "tall"], ["verb", "write", "banana", "kitten", "soft"],
  ["verb", "give", "river", "lamp", "big"], ["verb", "bring", "cookie", "puppy", "funny"], ["verb", "grow", "car", "sister", "tiny"],
  ["verb", "speak", "carrot", "desk", "loud"], ["verb", "choose", "pillow", "ocean", "sleepy"], ["noun", "apple", "eat", "sing", "happy"],
  ["noun", "kitten", "write", "give", "tall"], ["noun", "river", "bring", "speak", "soft"], ["noun", "lamp", "grow", "sit", "funny"],
  ["noun", "zebra", "eat", "choose", "big"], ["noun", "teacher", "sing", "forget", "loud"], ["noun", "banana", "sit", "write", "tiny"],
  ["noun", "window", "give", "grow", "sleepy"],
];
const ES_KINDS: WordKind[] = [
  ["verb", "cantar", "árbol", "manzana", "feliz"], ["verb", "comer", "ventana", "león", "bonito"], ["verb", "escribir", "plátano", "gatito", "suave"],
  ["verb", "dar", "río", "lámpara", "grande"], ["verb", "traer", "galleta", "perrito", "gracioso"], ["verb", "crecer", "carro", "hermana", "pequeño"],
  ["verb", "hablar", "zanahoria", "escritorio", "ruidoso"], ["verb", "elegir", "almohada", "océano", "contento"], ["noun", "manzana", "comer", "cantar", "feliz", "una"],
  ["noun", "gatito", "escribir", "dar", "bonito", "un"], ["noun", "río", "traer", "hablar", "suave", "un"], ["noun", "lámpara", "crecer", "leer", "gracioso", "una"],
  ["noun", "cebra", "comer", "elegir", "grande", "una"], ["noun", "maestra", "cantar", "nadar", "ruidoso", "una"], ["noun", "plátano", "leer", "escribir", "pequeño", "un"],
  ["noun", "ventana", "dar", "crecer", "contento", "una"],
];

function kindQ(locale: Locale, [kind, a, o1, o2, o3, art]: WordKind): Q {
  const verb = kind === "verb";
  const ask = verb
    ? tr(locale, "Which word is an action word?", "¿Qué palabra es una acción?")
    : tr(locale, "Which word names a person, place, or thing?", "¿Qué palabra nombra una persona, un lugar o una cosa?");
  return {
    prompt: ask,
    say: ask,
    choices: [a, o1, o2, o3].map((label) => ({ label })),
    hints: verb
      ? [
          tr(locale, "An action word tells what someone does.", "Una acción dice lo que alguien hace."),
          tr(locale, `Try each word after "I can": I can ___. Does it make sense?`, `Prueba cada palabra después de "Yo puedo": Yo puedo ___. ¿Tiene sentido?`),
          tr(locale, `"I can ${o1}" makes no sense. ${cap(o1)} is not an action.`, `"Yo puedo ${o1}" no tiene sentido, así que ${o1} no es una acción.`),
        ]
      : [
          tr(locale, "A noun names a person, place, or thing.", "Un sustantivo nombra una persona, un lugar o una cosa."),
          tr(locale, `Try each word after "the": the ___. Does it make sense?`, `Prueba cada palabra después de "un" o "una". ¿Tiene sentido?`),
          tr(locale, `"The ${o1}" makes no sense. ${cap(o1)} is not a noun.`, `"Un ${o1}" no tiene sentido, así que ${o1} no es un sustantivo.`),
        ],
    steps: verb
      ? [tr(locale, `"I can ${a}" makes sense.`, `"Yo puedo ${a}" tiene sentido.`), tr(locale, `${cap(a)} is the action word.`, `${cap(a)} es la acción.`)]
      : [tr(locale, `"The ${a}" makes sense.`, `"${cap(art ?? "un")} ${a}" tiene sentido.`), tr(locale, `${cap(a)} names a person, place, or thing.`, `${cap(a)} nombra una persona, un lugar o una cosa.`)],
  };
}

/** [sentence, kind, answer, other words from the sentence, third hint] */
type InSentence = [string, "verb" | "noun", string, string[], string];
const EN_IN_SENTENCE: InSentence[] = [
  ["The frog jumps into the pond.", "verb", "jumps", ["frog", "pond"], "The sentence is about the frog. What does the frog do?"],
  ["My sister reads a funny book.", "verb", "reads", ["sister", "book", "funny"], "The sentence is about my sister. What does she do?"],
  ["The baby sleeps in her crib.", "verb", "sleeps", ["baby", "crib"], "The sentence is about the baby. What does the baby do?"],
  ["Dad cooks eggs for breakfast.", "verb", "cooks", ["Dad", "eggs", "breakfast"], "The sentence is about Dad. What does Dad do?"],
  ["Birds sing in the tall tree.", "verb", "sing", ["Birds", "tree", "tall"], "The sentence is about birds. What do the birds do?"],
  ["Our class planted seeds today.", "verb", "planted", ["class", "seeds", "today"], "The sentence is about our class. What did the class do?"],
  ["The happy kitten sleeps quietly.", "noun", "kitten", ["happy", "sleeps", "quietly"], `"Sleeps" is an action and "happy" tells what kind. Who sleeps?`],
  ["A tiny bird sings loudly.", "noun", "bird", ["tiny", "sings", "loudly"], `"Sings" is an action. Who sings?`],
  ["The big truck drives slowly.", "noun", "truck", ["big", "drives", "slowly"], `"Drives" is an action. What drives?`],
  ["Two brown horses run fast.", "noun", "horses", ["brown", "run", "fast"], `"Run" is an action here. What runs?`],
  ["The cold wind blows hard.", "noun", "wind", ["cold", "blows", "hard"], `"Blows" is an action. What blows?`],
  ["Grandma bakes warm bread.", "verb", "bakes", ["Grandma", "warm", "bread"], "The sentence is about Grandma. What does she do?"],
  ["The children swim in the lake.", "verb", "swim", ["children", "lake"], "The sentence is about the children. What do they do?"],
  ["A red ball rolled away.", "noun", "ball", ["red", "rolled", "away"], `"Rolled" is an action. What rolled?`],
  ["Ana writes a long letter.", "verb", "writes", ["Ana", "long", "letter"], "The sentence is about Ana. What does Ana do?"],
];
const ES_IN_SENTENCE: InSentence[] = [
  ["La rana salta al estanque.", "verb", "salta", ["rana", "estanque"], "La oración habla de la rana. ¿Qué hace la rana?"],
  ["Mi hermana lee un libro divertido.", "verb", "lee", ["hermana", "libro", "divertido"], "La oración habla de mi hermana. ¿Qué hace ella?"],
  ["El bebé duerme en su cuna.", "verb", "duerme", ["bebé", "cuna"], "La oración habla del bebé. ¿Qué hace el bebé?"],
  ["Papá prepara huevos para el desayuno.", "verb", "prepara", ["Papá", "huevos", "desayuno"], "La oración habla de papá. ¿Qué hace papá?"],
  ["Los pájaros cantan en el árbol alto.", "verb", "cantan", ["pájaros", "árbol", "alto"], "La oración habla de los pájaros. ¿Qué hacen?"],
  ["Nuestra clase sembró semillas hoy.", "verb", "sembró", ["clase", "semillas", "hoy"], "La oración habla de nuestra clase. ¿Qué hizo la clase?"],
  ["El gatito feliz duerme tranquilo.", "noun", "gatito", ["feliz", "duerme", "tranquilo"], `"Duerme" es una acción y "feliz" dice cómo es. ¿Quién duerme?`],
  ["Un pájaro pequeño canta fuerte.", "noun", "pájaro", ["pequeño", "canta", "fuerte"], `"Canta" es una acción. ¿Quién canta?`],
  ["El camión grande avanza despacio.", "noun", "camión", ["grande", "avanza", "despacio"], `"Avanza" es una acción. ¿Qué avanza?`],
  ["Dos caballos blancos corren rápido.", "noun", "caballos", ["blancos", "corren", "rápido"], `"Corren" es una acción. ¿Quiénes corren?`],
  ["Mi hermanito se ríe mucho.", "noun", "hermanito", ["ríe", "mucho"], `"Ríe" es una acción. ¿Quién se ríe?`],
  ["El viento frío sopla fuerte.", "noun", "viento", ["frío", "sopla", "fuerte"], `"Sopla" es una acción. ¿Qué sopla?`],
  ["La abuela hornea pan caliente.", "verb", "hornea", ["abuela", "pan", "caliente"], "La oración habla de la abuela. ¿Qué hace ella?"],
  ["Los niños nadan en el lago.", "verb", "nadan", ["niños", "lago"], "La oración habla de los niños. ¿Qué hacen?"],
  ["Una pelota roja rodó lejos.", "noun", "pelota", ["roja", "rodó", "lejos"], `"Rodó" es una acción. ¿Qué rodó?`],
];

function inSentenceQ(locale: Locale, [s, kind, a, others, third]: InSentence): Q {
  const verb = kind === "verb";
  const ask = verb ? tr(locale, "Which word is the verb?", "¿Qué palabra es el verbo?") : tr(locale, "Which word is the noun?", "¿Qué palabra es el sustantivo?");
  return {
    prompt: `“${s}” ${ask}`,
    say: `${s} ${ask}`,
    choices: [a, ...others].map((label) => ({ label })),
    hints: [
      verb
        ? tr(locale, "A verb is what someone or something does.", "Un verbo es lo que alguien o algo hace.")
        : tr(locale, "A noun names a person, place, or thing.", "Un sustantivo nombra una persona, un lugar o una cosa."),
      verb
        ? tr(locale, "Find who the sentence is about. Then ask: what do they do?", "Busca de quién habla la oración. Luego pregunta: ¿qué hace?")
        : tr(locale, "Ask: who or what is this sentence about?", "Pregunta: ¿de quién o de qué habla la oración?"),
      third,
    ],
    steps: verb
      ? [tr(locale, `"${a}" tells what happens.`, `"${a}" dice lo que pasa.`), tr(locale, `The verb is "${a}".`, `El verbo es "${a}".`)]
      : [tr(locale, `"${a}" names who or what the sentence is about.`, `"${a}" nombra de quién o de qué habla la oración.`), tr(locale, `The noun is "${a}".`, `El sustantivo es "${a}".`)],
  };
}

// ---- Past tense (grade 2) ----
// English level 1: regular -ed with its spelling rules; level 2: irregular verbs. Spanish level 1:
// regular pretérito (-é/-ó, -í/-ió); level 2: irregular pretérito (fui, hice, tuve, dije…).
// Distractors never include another past form that could also fit (no imperfect in Spanish).
type EdRule = "ed" | "d" | "double" | "y" | "vy";
/** [sentence, time words, base verb, rule, past, three wrong forms] */
type EnPast = [string, string, string, EdRule | "irregular", string, string, string, string];
const EN_PAST: EnPast[][] = [
  [
    ["Yesterday I ___ to the park.", "Yesterday", "walk", "ed", "walked", "walk", "walks", "walking"],
    ["Last night we ___ a movie.", "Last night", "watch", "ed", "watched", "watch", "watches", "watching"],
    ["Yesterday Mom ___ a cake.", "Yesterday", "bake", "d", "baked", "bakeed", "bakes", "bake"],
    ["Yesterday the bunny ___ over a log.", "Yesterday", "hop", "double", "hopped", "hoped", "hops", "hop"],
    ["Last night the baby ___ a lot.", "Last night", "cry", "y", "cried", "cryed", "cries", "cry"],
    ["This morning I ___ my teeth.", "This morning", "brush", "ed", "brushed", "brush", "brushes", "brushing"],
    ["Yesterday we ___ in the rain.", "Yesterday", "play", "vy", "played", "plaied", "plays", "play"],
    ["Last summer Ana ___ her grandma.", "Last summer", "visit", "ed", "visited", "visit", "visits", "visitted"],
    ["Yesterday the dog ___ a cat.", "Yesterday", "chase", "d", "chased", "chaseed", "chases", "chase"],
    ["Last night it ___ for hours.", "Last night", "rain", "ed", "rained", "rain", "rains", "rainned"],
    ["Yesterday the bus ___ at my house.", "Yesterday", "stop", "double", "stopped", "stoped", "stops", "stop"],
    ["Yesterday Leo ___ the door.", "Yesterday", "open", "ed", "opened", "open", "opens", "openned"],
    ["Last week Dad ___ the car.", "Last week", "wash", "ed", "washed", "wash", "washes", "washing"],
    ["Yesterday the frog ___ into the pond.", "Yesterday", "jump", "ed", "jumped", "jump", "jumps", "jumpped"],
    ["Last week the kids ___ for the bus.", "Last week", "wait", "ed", "waited", "wait", "waits", "waitted"],
    ["Last night Kai ___ the dishes.", "Last night", "dry", "y", "dried", "dryed", "dries", "dry"],
  ],
  [
    ["Yesterday I ___ to the park.", "Yesterday", "go", "irregular", "went", "goed", "go", "goes"],
    ["Last week Sam ___ in a race.", "Last week", "run", "irregular", "ran", "runned", "run", "runs"],
    ["Last night we ___ the moon.", "Last night", "see", "irregular", "saw", "seed", "see", "sees"],
    ["This morning I ___ two eggs.", "This morning", "eat", "irregular", "ate", "eated", "eat", "eats"],
    ["Yesterday Grandpa ___ to visit.", "Yesterday", "come", "irregular", "came", "comed", "come", "comes"],
    ["Last night Mia ___ a song.", "Last night", "sing", "irregular", "sang", "singed", "sing", "sings"],
    ["Last summer we ___ in the lake.", "Last summer", "swim", "irregular", "swam", "swimmed", "swim", "swims"],
    ["Yesterday I ___ a letter.", "Yesterday", "write", "irregular", "wrote", "writed", "write", "writes"],
    ["Last week Dad ___ us to the zoo.", "Last week", "take", "irregular", "took", "taked", "take", "takes"],
    ["Yesterday Ana ___ me a hug.", "Yesterday", "give", "irregular", "gave", "gived", "give", "gives"],
    ["Last night Mom ___ soup.", "Last night", "make", "irregular", "made", "maked", "make", "makes"],
    ["Yesterday the cat ___ on my lap.", "Yesterday", "sit", "irregular", "sat", "sitted", "sit", "sits"],
    ["Last night I ___ for ten hours.", "Last night", "sleep", "irregular", "slept", "sleeped", "sleep", "sleeps"],
    ["Yesterday Kai ___ a lost puppy.", "Yesterday", "find", "irregular", "found", "finded", "find", "finds"],
    ["Last week a bird ___ into our yard.", "Last week", "fly", "irregular", "flew", "flied", "fly", "flies"],
    ["Yesterday I ___ my bike to school.", "Yesterday", "ride", "irregular", "rode", "rided", "ride", "rides"],
  ],
];

function enPastQ([s, cue, base, rule, past, w1, w2, w3]: EnPast): Q {
  const Base = cap(base);
  const third: Record<EnPast[3], string> = {
    ed: `Start with ${base} and add -ed. Nothing else changes.`,
    d: `${Base} already ends in e, so add only -d.`,
    double: `${Base} has one short vowel and ends in one consonant. Double the last letter, then add -ed.`,
    y: `${Base} ends in a consonant and y. Change the y to i, then add -ed.`,
    vy: `${Base} ends in a vowel and y. Keep the y and add -ed.`,
    irregular: `${Base} does not add -ed. Think: today I ${base}, yesterday I …`,
  };
  return {
    prompt: s,
    say: `${spoken(s)} Which word fits?`,
    choices: [past, w1, w2, w3].map((label) => ({ label })),
    hints: [
      `"${cue}" means it already happened.`,
      rule === "irregular" ? "Some action words do not add -ed. They change in their own way." : "To tell about the past, most action words add -ed.",
      third[rule],
    ],
    steps: [rule === "irregular" ? `The past of ${base} is ${past}, not ${w1}.` : `${base} → ${past}`, fill(s, past)],
  };
}

/** [sentence, time words, infinitive, who does it, past, three wrong forms] */
type EsPast = [string, string, string, string, string, string, string, string];
const ES_PAST: EsPast[][] = [
  [
    ["Ayer yo ___ al parque.", "Ayer", "caminar", "yo", "caminé", "camino", "caminaré", "caminó"],
    ["Anoche mi papá ___ una película.", "Anoche", "mirar", "mi papá", "miró", "mira", "mirará", "miré"],
    ["Ayer mi mamá ___ un pastel.", "Ayer", "preparar", "mi mamá", "preparó", "prepara", "preparará", "preparé"],
    ["Ayer el perro ___ por el patio.", "Ayer", "correr", "el perro", "corrió", "corre", "correrá", "corrí"],
    ["Esta mañana yo ___ leche.", "Esta mañana", "tomar", "yo", "tomé", "tomo", "tomaré", "tomó"],
    ["Ayer Ana ___ en la fiesta.", "Ayer", "bailar", "Ana", "bailó", "baila", "bailará", "bailé"],
    ["El verano pasado yo ___ a mi abuela.", "El verano pasado", "visitar", "yo", "visité", "visito", "visitaré", "visitó"],
    ["Ayer yo ___ mi cuarto.", "Ayer", "limpiar", "yo", "limpié", "limpio", "limpiaré", "limpió"],
    ["Anoche Leo ___ la puerta.", "Anoche", "abrir", "Leo", "abrió", "abre", "abrirá", "abrí"],
    ["Ayer yo ___ un cuento.", "Ayer", "leer", "yo", "leí", "leo", "leeré", "leyó"],
    ["La semana pasada mi tío ___ un dibujo.", "La semana pasada", "pintar", "mi tío", "pintó", "pinta", "pintará", "pinté"],
    ["Ayer la rana ___ al estanque.", "Ayer", "saltar", "la rana", "saltó", "salta", "saltará", "salté"],
    ["Ayer yo ___ el autobús.", "Ayer", "esperar", "yo", "esperé", "espero", "esperaré", "esperó"],
    ["Anoche yo ___ arroz con pollo.", "Anoche", "comer", "yo", "comí", "como", "comeré", "comió"],
    ["Ayer mi hermano ___ una carta.", "Ayer", "escribir", "mi hermano", "escribió", "escribe", "escribirá", "escribí"],
    ["Ayer mi abuelo ___ en el sillón.", "Ayer", "descansar", "mi abuelo", "descansó", "descansa", "descansará", "descansé"],
  ],
  [
    ["Ayer yo ___ al parque.", "Ayer", "ir", "yo", "fui", "fue", "voy", "iré"],
    ["Anoche yo ___ la luna.", "Anoche", "ver", "yo", "vi", "vio", "veo", "veré"],
    ["Ayer yo ___ la tarea.", "Ayer", "hacer", "yo", "hice", "hací", "hago", "hizo"],
    ["Ayer mi papá ___ un pastel.", "Ayer", "hacer", "mi papá", "hizo", "hació", "hace", "hice"],
    ["La semana pasada yo ___ fiebre.", "La semana pasada", "tener", "yo", "tuve", "tení", "tengo", "tuvo"],
    ["Ayer mi mamá ___ que sí.", "Ayer", "decir", "mi mamá", "dijo", "dició", "dice", "dije"],
    ["Ayer yo ___ la mesa.", "Ayer", "poner", "yo", "puse", "poní", "pongo", "puso"],
    ["Ayer mis primos ___ a visitarnos.", "Ayer", "venir", "mis primos", "vinieron", "venieron", "vienen", "vino"],
    ["Ayer yo ___ en casa todo el día.", "Ayer", "estar", "yo", "estuve", "estoy", "estaré", "estuvo"],
    ["Ayer yo le ___ un abrazo a mi tía.", "Ayer", "dar", "yo", "di", "daré", "doy", "dio"],
    ["Ayer yo ___ mi juguete favorito.", "Ayer", "traer", "yo", "traje", "traí", "traigo", "trajo"],
    ["Ayer Sofía no ___ venir.", "Ayer", "poder", "Sofía", "pudo", "podió", "puede", "pude"],
    ["Anoche el bebé ___ muy bien.", "Anoche", "dormir", "el bebé", "durmió", "dormió", "duerme", "dormí"],
    ["Ayer mi hermana ___ al cine.", "Ayer", "ir", "mi hermana", "fue", "fui", "va", "irá"],
    ["Ayer yo ___ la verdad.", "Ayer", "decir", "yo", "dije", "decí", "digo", "dijo"],
    ["Ayer yo ___ ayudar.", "Ayer", "querer", "yo", "quise", "querí", "quiero", "quiso"],
  ],
];

function esPastQ(irregular: boolean) {
  return ([s, cue, inf, who, past, w1, w2, w3]: EsPast): Q => ({
    prompt: s,
    say: `${spoken(s)} ¿Qué palabra va?`,
    choices: [past, w1, w2, w3].map((label) => ({ label })),
    hints: [
      `"${cue}" dice que ya pasó.`,
      irregular
        ? "Algunos verbos no siguen la regla de -é o -í. Cambian a su manera."
        : "En pasado, con yo: -ar cambia a -é, y -er o -ir cambian a -í. Con él o ella: -ó o -ió.",
      irregular ? `${cap(inf)} es irregular, y quien lo hace es ${who}.` : `${cap(inf)} termina en -${inf.slice(-2)}, y quien lo hace es ${who}.`,
    ],
    steps: [irregular ? `El pasado de ${inf} con ${who} es ${past}.` : `${inf} → ${past}`, fill(s, past)],
  });
}

// ---- Contractions (grade 2): English apostrophes; Spanish al and del ----
/** [two words, contraction, three wrong spellings, the letters the apostrophe replaces] */
type Contraction = [string, string, string, string, string, string];
const EN_CONTRACTIONS: Contraction[] = [
  ["do not", "don't", "dont", "do'nt", "doesn't", "o"], ["cannot", "can't", "cant", "ca'nt", "won't", "no"],
  ["is not", "isn't", "isnt", "is'nt", "aren't", "o"], ["I am", "I'm", "Im", "I'am", "I'll", "a"],
  ["it is", "it's", "its", "it'is", "it'll", "i"], ["we are", "we're", "were", "we'are", "we'll", "a"],
  ["you are", "you're", "your", "you'are", "you'll", "a"], ["they are", "they're", "theyre", "their", "they'll", "a"],
  ["did not", "didn't", "didnt", "did'nt", "don't", "o"], ["was not", "wasn't", "wasnt", "was'nt", "weren't", "o"],
  ["I will", "I'll", "Ill", "I'wil", "I'm", "wi"], ["she is", "she's", "shes", "she'is", "she'll", "i"],
  ["let us", "let's", "lets", "le'ts", "let'us", "u"], ["does not", "doesn't", "doesnt", "does'nt", "don't", "o"],
  ["have not", "haven't", "havent", "have'nt", "hasn't", "o"], ["are not", "aren't", "arent", "are'nt", "isn't", "o"],
];

function enContractionQ([full, short, w1, w2, w3, gone]: Contraction): Q {
  return {
    prompt: `Which is the short way to write "${full}"?`,
    say: `Which is the short way to write ${full}?`,
    choices: [short, w1, w2, w3].map((label) => ({ label })),
    hints: [
      "A contraction joins two words into one shorter word.",
      "An apostrophe (') takes the place of missing letters.",
      `In "${full}", ${gone.length > 1 ? "the letters" : "the letter"} "${gone}" ${gone.length > 1 ? "are" : "is"} left out.`,
    ],
    steps: [`The apostrophe takes the place of "${gone}".`, `${full} = ${short}`],
  };
}

/** [sentence, "a" or "de", the masculine noun after the blank] */
type Contracta = [string, "a" | "de", string];
const ES_CONTRACTIONS: Contracta[] = [
  ["Vamos ___ parque.", "a", "parque"], ["La llave ___ carro es azul.", "de", "carro"], ["Le di agua ___ perro.", "a", "perro"],
  ["Salimos ___ cine a las seis.", "de", "cine"], ["Me subí ___ árbol.", "a", "árbol"], ["El color ___ cielo es azul.", "de", "cielo"],
  ["Mi mamá llamó ___ doctor.", "a", "doctor"], ["Bajamos ___ autobús.", "de", "autobús"], ["Voy ___ mercado con papá.", "a", "mercado"],
  ["La puerta ___ salón está abierta.", "de", "salón"], ["Le escribí ___ maestro.", "a", "maestro"], ["El nido ___ pájaro tiene huevos.", "de", "pájaro"],
  ["Fuimos ___ zoológico.", "a", "zoológico"], ["Regresé ___ parque muy cansado.", "de", "parque"], ["Le pregunté ___ cartero.", "a", "cartero"],
  ["Saqué la ropa ___ cajón.", "de", "cajón"],
];

function esContractionQ([s, prep, noun]: Contracta): Q {
  const word = prep === "a" ? "al" : "del";
  const wrong = prep === "a" ? ["a el", "del", "a la"] : ["de el", "al", "de la"];
  return {
    prompt: `Completa: ${s}`,
    say: `${spoken(s)} ¿Qué va en el espacio?`,
    choices: [word, ...wrong].map((label) => ({ label })),
    hints: [
      `¿Se dice "el ${noun}" o "la ${noun}"?`,
      "a + el se juntan en al. de + el se juntan en del.",
      `Aquí van juntas "${prep}" y "el ${noun}".`,
    ],
    steps: [`${prep} + el = ${word}`, fill(s, word)],
  };
}

// ---- Adjectives (grade 3) ----
// Each sentence has exactly one describing word, and the choices are words from that sentence.
/** [sentence, adjective, the noun it describes, other words from the sentence] */
type Describe = [string, string, string, string[]];
const EN_ADJECTIVES: Describe[] = [
  ["The tiny bird sang.", "tiny", "the bird", ["bird", "sang"]],
  ["We ate a juicy peach.", "juicy", "the peach", ["ate", "peach"]],
  ["My brother has curly hair.", "curly", "the hair", ["brother", "has", "hair"]],
  ["The old bridge creaked.", "old", "the bridge", ["bridge", "creaked"]],
  ["Lena wore a purple scarf.", "purple", "the scarf", ["Lena", "wore", "scarf"]],
  ["A gentle wind blew.", "gentle", "the wind", ["wind", "blew"]],
  ["The soup smells delicious.", "delicious", "the soup", ["soup", "smells"]],
  ["He found a shiny coin.", "shiny", "the coin", ["found", "coin"]],
  ["The library is quiet.", "quiet", "the library", ["library", "is"]],
  ["The brave firefighter climbed the ladder.", "brave", "the firefighter", ["firefighter", "climbed", "ladder"]],
  ["Our garden has a tall sunflower.", "tall", "the sunflower", ["garden", "has", "sunflower"]],
  ["The puppy was sleepy.", "sleepy", "the puppy", ["puppy", "was"]],
  ["Dad made a huge sandwich.", "huge", "the sandwich", ["Dad", "made", "sandwich"]],
  ["The lemonade tasted sweet.", "sweet", "the lemonade", ["lemonade", "tasted"]],
  ["A friendly neighbor waved.", "friendly", "the neighbor", ["neighbor", "waved"]],
  ["The heavy box fell.", "heavy", "the box", ["box", "fell"]],
];
const ES_ADJECTIVES: Describe[] = [
  ["El pájaro pequeño cantó.", "pequeño", "el pájaro", ["pájaro", "cantó"]],
  ["Comimos un durazno jugoso.", "jugoso", "el durazno", ["Comimos", "durazno"]],
  ["Mi hermano tiene el pelo rizado.", "rizado", "el pelo", ["hermano", "tiene", "pelo"]],
  ["El puente viejo crujió.", "viejo", "el puente", ["puente", "crujió"]],
  ["Lena usó una bufanda morada.", "morada", "la bufanda", ["Lena", "usó", "bufanda"]],
  ["Sopló un viento suave.", "suave", "el viento", ["Sopló", "viento"]],
  ["La sopa huele deliciosa.", "deliciosa", "la sopa", ["sopa", "huele"]],
  ["Él encontró una moneda brillante.", "brillante", "la moneda", ["encontró", "moneda"]],
  ["La biblioteca está tranquila.", "tranquila", "la biblioteca", ["biblioteca", "está"]],
  ["El bombero valiente subió la escalera.", "valiente", "el bombero", ["bombero", "subió", "escalera"]],
  ["Nuestro jardín tiene un girasol alto.", "alto", "el girasol", ["jardín", "tiene", "girasol"]],
  ["El perrito estaba dormido.", "dormido", "el perrito", ["perrito", "estaba"]],
  ["Papá hizo un sándwich enorme.", "enorme", "el sándwich", ["Papá", "hizo", "sándwich"]],
  ["La limonada sabe dulce.", "dulce", "la limonada", ["limonada", "sabe"]],
  ["Una vecina amable nos saludó.", "amable", "la vecina", ["vecina", "saludó"]],
  ["La caja pesada se cayó.", "pesada", "la caja", ["caja", "cayó"]],
];

function adjectiveQ(locale: Locale, [s, adj, noun, others]: Describe): Q {
  const ask = tr(locale, "Which word is the adjective?", "¿Qué palabra es el adjetivo?");
  return {
    prompt: `“${s}” ${ask}`,
    say: `${s} ${ask}`,
    choices: [adj, ...others].map((label) => ({ label })),
    hints: [
      tr(locale, "An adjective describes a noun: what kind, what color, what size.", "Un adjetivo describe a un sustantivo: cómo es, de qué color, de qué tamaño."),
      tr(locale, "Find the noun first. Then find the word that tells about it.", "Busca primero el sustantivo. Luego busca la palabra que dice cómo es."),
      tr(locale, `What is ${noun} like?`, `¿Cómo es ${noun}?`),
    ],
    steps: [tr(locale, `"${adj}" tells what ${noun} is like.`, `"${adj}" dice cómo es ${noun}.`), tr(locale, `The adjective is "${adj}".`, `El adjetivo es "${adj}".`)],
  };
}

// ---- Homophones (grade 3) ----
// Words that sound alike. A third choice is a common misspelling (youre, its') so every item has three.
/** [sentence, answer, two wrong choices, third hint] */
type SoundAlike = [string, string, string, string, string];
const HOMOPHONE_RULE: Record<string, string> = {
  two: "Two is the number 2. Too means also or very. To goes before a place or an action.",
  there: "There tells where. Their means it belongs to them. They're means they are.",
  your: "Your means it belongs to you. You're means you are.",
  its: "Its means it belongs to it. It's means it is.",
  whose: "Whose asks who owns something. Who's means who is.",
  hay: "Hay quiere decir que existe algo. Ahí es un lugar. Ay es una queja o un susto.",
  ha: "A va antes de un lugar o una persona. Ha es del verbo haber (ha comido). Ah muestra que entiendes o te sorprendes.",
  haber: "A ver es para mirar o probar. Haber es un verbo (puede haber). Aver no existe.",
  porque: "Porque da una razón. Por qué hace una pregunta. El porqué es el motivo.",
  vaya: "Vaya es del verbo ir. Valla es una cerca. Baya es una fruta pequeña.",
  hecho: "Hecho es del verbo hacer. Echo y echó son del verbo echar.",
  tuvo: "Tuvo es del verbo tener. Tubo es un objeto largo y hueco.",
};
/** Which rule each answer belongs to, and what the answer itself means (for the worked step). */
const HOMOPHONE_MEANS: Record<string, [string, string]> = {
  two: ["two", "Two is the number 2."], to: ["two", "To goes before a place or an action."], too: ["two", "Too means also or very."],
  there: ["there", "There tells where."], their: ["there", "Their means it belongs to them."], "they're": ["there", "They're means they are."],
  your: ["your", "Your means it belongs to you."], "you're": ["your", "You're means you are."],
  its: ["its", "Its means it belongs to it."], "it's": ["its", "It's means it is."],
  whose: ["whose", "Whose asks who owns something."], "who's": ["whose", "Who's means who is."],
  hay: ["hay", "Hay quiere decir que existe algo."], ahí: ["hay", "Ahí dice un lugar."], ay: ["hay", "Ay es una queja o un susto."],
  a: ["ha", "A va antes de un lugar o una persona."], ha: ["ha", "Ha es del verbo haber."], ah: ["ha", "Ah muestra que entiendes o te sorprendes."],
  "a ver": ["haber", "A ver es para mirar o probar."], haber: ["haber", "Haber es un verbo."],
  porque: ["porque", "Porque da una razón."], "por qué": ["porque", "Por qué hace una pregunta."], porqué: ["porque", "El porqué es el motivo."],
  vaya: ["vaya", "Vaya es del verbo ir."], valla: ["vaya", "Valla es una cerca."], baya: ["vaya", "Baya es una fruta pequeña."],
  hecho: ["hecho", "Hecho es del verbo hacer."], echo: ["hecho", "Echo es del verbo echar: yo echo."], echó: ["hecho", "Echó es del verbo echar, en pasado."],
  tuvo: ["tuvo", "Tuvo es del verbo tener."], tubo: ["tuvo", "Tubo es un objeto largo y hueco."],
};
const EN_HOMOPHONES: SoundAlike[][] = [
  [
    ["I have ___ cats.", "two", "to", "too", "The blank tells how many cats."],
    ["We walked ___ the store.", "to", "two", "too", "The blank comes before a place: the store."],
    ["Can I come ___?", "too", "to", "two", "Try the word also in the blank."],
    ["This soup is ___ hot.", "too", "to", "two", "Try the word very in the blank."],
    ["She is ___ years old.", "two", "to", "too", "The blank tells how many years."],
    ["Give the ball ___ me.", "to", "two", "too", "The blank shows where the ball goes."],
    ["Put the box over ___.", "there", "their", "they're", "The blank tells where to put the box."],
    ["The kids lost ___ hats.", "their", "there", "they're", "The hats belong to the kids."],
    ["___ going to the beach.", "They're", "There", "Their", "Try They are in the blank."],
    ["Is ___ any milk left?", "there", "their", "they're", "Try they are and their in the blank. Neither makes sense."],
    ["My friends love ___ new puppy.", "their", "there", "they're", "The puppy belongs to my friends."],
    ["I think ___ late again.", "they're", "there", "their", "Try they are in the blank."],
    ["___ are six eggs in the box.", "There", "Their", "They're", "Try They are and Their in the blank. Neither makes sense."],
    ["Ana ate ___ apples.", "two", "to", "too", "The blank tells how many apples."],
  ],
  [
    ["Is this ___ coat?", "your", "you're", "youre", "The coat belongs to you."],
    ["___ my best friend.", "You're", "Your", "Youre", "Try You are in the blank."],
    ["I like ___ drawing.", "your", "you're", "youre", "The drawing belongs to you."],
    ["Tell me when ___ ready.", "you're", "your", "youre", "Try you are in the blank."],
    ["The dog wagged ___ tail.", "its", "it's", "its'", "The tail belongs to the dog."],
    ["___ raining outside.", "It's", "Its", "Its'", "Try It is in the blank."],
    ["The tree lost ___ leaves.", "its", "it's", "its'", "The leaves belong to the tree."],
    ["I think ___ time for bed.", "it's", "its", "its'", "Try it is in the blank."],
    ["___ backpack is this?", "Whose", "Who's", "Whos", "The question asks who owns the backpack."],
    ["___ coming to the party?", "Who's", "Whose", "Whos", "Try Who is in the blank."],
    ["I know ___ turn it is.", "whose", "who's", "whos", "The turn belongs to someone. Try who is: it does not fit."],
    ["Do you know ___ at the door?", "who's", "whose", "whos", "Try who is in the blank."],
    ["Wash ___ hands before lunch.", "your", "you're", "youre", "The hands belong to you."],
    ["The bird fed ___ babies.", "its", "it's", "its'", "The babies belong to the bird."],
  ],
];
const ES_HOMOPHONES: SoundAlike[][] = [
  [
    ["___ un gato en el techo.", "Hay", "Ahí", "Ay", "La oración dice que existe un gato en el techo."],
    ["Deja la mochila ___.", "ahí", "hay", "ay", "La palabra dice dónde dejar la mochila."],
    ["¡___, qué frío!", "Ay", "Hay", "Ahí", "Es algo que dices de repente cuando sientes frío."],
    ["En la mesa ___ tres platos.", "hay", "ahí", "ay", "La oración dice que existen tres platos."],
    ["Mi perro está ___, junto a la puerta.", "ahí", "hay", "ay", "La palabra dice dónde está el perro."],
    ["¿___ leche para el desayuno?", "Hay", "Ahí", "Ay", "La pregunta es si existe leche."],
    ["¡___, me duele la mano!", "Ay", "Hay", "Ahí", "Es una queja de dolor."],
    ["Mi hermano ___ comido mucho.", "ha", "a", "ah", "Va antes de comido, como en he comido."],
    ["Voy ___ la escuela en autobús.", "a", "ha", "ah", "Va antes de un lugar: la escuela."],
    ["___, ya entiendo la tarea.", "Ah", "A", "Ha", "Es lo que dices cuando por fin entiendes algo."],
    ["Mamá ___ llegado temprano.", "ha", "a", "ah", "Va antes de llegado, como en he llegado."],
    ["Le di un regalo ___ mi abuela.", "a", "ha", "ah", "Va antes de una persona: mi abuela."],
    ["___, ¿eras tú quien llamó?", "Ah", "A", "Ha", "Es lo que dices cuando te sorprendes."],
    ["Mi gato ___ dormido todo el día.", "ha", "a", "ah", "Va antes de dormido, como en he dormido."],
  ],
  [
    ["Vamos ___ qué hay en la caja.", "a ver", "haber", "aver", "Aquí quieres mirar qué hay en la caja."],
    ["Puede ___ lluvia mañana.", "haber", "a ver", "aver", "Va después de puede, como un verbo: puede llover."],
    ["___ si encuentras tu lápiz.", "A ver", "Haber", "Aver", "Aquí quieres probar si lo encuentras."],
    ["No vine ___ estaba enfermo.", "porque", "por qué", "porqué", "Aquí se da una razón."],
    ["¿___ llora el bebé?", "Por qué", "Porque", "Porqué", "Es una pregunta."],
    ["No sé el ___ de su enojo.", "porqué", "porque", "por qué", "Va después de el: es una cosa, el motivo."],
    ["¡Que te ___ bien en el viaje!", "vaya", "valla", "baya", "Piensa en el verbo ir: ¿cómo te va?"],
    ["Saltó la ___ del jardín.", "valla", "vaya", "baya", "Es algo que se puede saltar alrededor del jardín."],
    ["El pájaro comió una ___ roja.", "baya", "vaya", "valla", "Es algo que un pájaro puede comer."],
    ["Ya he ___ la tarea.", "hecho", "echo", "echó", "Va después de he: es del verbo hacer."],
    ["Yo ___ agua a las plantas.", "echo", "hecho", "echó", "Es del verbo echar, y quien lo hace ahora soy yo."],
    ["Ayer mi papá ___ sal a la sopa.", "echó", "echo", "hecho", "Es del verbo echar, y pasó ayer."],
    ["Mi tío ___ un perro de niño.", "tuvo", "tubo", "tuve", "Es del verbo tener, y quien lo tuvo es mi tío."],
    ["El agua sale por un ___.", "tubo", "tuvo", "tuve", "Es un objeto por donde pasa el agua."],
  ],
];

function homophoneQ(locale: Locale, [s, a, w1, w2, third]: SoundAlike): Q {
  const [rule, means] = HOMOPHONE_MEANS[a.toLowerCase()];
  return {
    prompt: s,
    say: `${spoken(s)} ${tr(locale, "Which word fits?", "¿Qué palabra va?")}`,
    choices: [a, w1, w2].map((label) => ({ label })),
    hints: [tr(locale, "These words sound the same but mean different things.", "Estas palabras suenan igual pero significan cosas distintas."), HOMOPHONE_RULE[rule], third],
    steps: [means, fill(s, a)],
  };
}

// ---- Prefixes (grade 3) ----
/** [word, prefix, what the prefix means here, meaning of the word, three wrong meanings] */
type Prefixed = [string, string, string, string, string, string, string];
const EN_PREFIXES: Prefixed[] = [
  ["reread", "re", "means again", "read again", "not read", "read before", "read wrongly"],
  ["unhappy", "un", "means not", "not happy", "happy again", "happy before", "very happy"],
  ["preheat", "pre", "means before", "heat before", "heat again", "not heat", "heat wrongly"],
  ["dislike", "dis", "means not", "not like", "like again", "like before", "like a lot"],
  ["misspell", "mis", "means wrongly", "spell wrongly", "spell again", "not spell", "spell before"],
  ["retell", "re", "means again", "tell again", "tell wrongly", "not tell", "tell before"],
  ["unlock", "un", "can mean undo", "open the lock", "lock again", "lock before", "lock wrongly"],
  ["preview", "pre", "means before", "see before", "see again", "not see", "see wrongly"],
  ["disagree", "dis", "means not", "not agree", "agree again", "agree before", "agree wrongly"],
  ["misplace", "mis", "means wrongly", "put in the wrong place", "place again", "place before", "not place"],
  ["unkind", "un", "means not", "not kind", "kind again", "very kind", "kind before"],
  ["rebuild", "re", "means again", "build again", "build before", "not build", "build wrongly"],
  ["dishonest", "dis", "means not", "not honest", "honest again", "very honest", "honest before"],
  ["misread", "mis", "means wrongly", "read wrongly", "read again", "read before", "not read"],
  ["unsafe", "un", "means not", "not safe", "safe again", "very safe", "safe before"],
];
const ES_PREFIXES: Prefixed[] = [
  ["releer", "re", "quiere decir otra vez", "volver a leer", "no leer", "leer antes", "leer mucho"],
  ["infeliz", "in", "quiere decir no", "no feliz", "feliz otra vez", "feliz antes", "muy feliz"],
  ["precalentar", "pre", "quiere decir antes", "calentar antes", "calentar otra vez", "no calentar", "calentar mucho"],
  ["desconocido", "des", "quiere decir no", "no conocido", "conocido otra vez", "conocido antes", "muy conocido"],
  ["rehacer", "re", "quiere decir otra vez", "volver a hacer", "no hacer", "hacer antes", "hacer mal"],
  ["desatar", "des", "quiere decir lo contrario", "soltar lo que está atado", "atar otra vez", "atar antes", "atar fuerte"],
  ["prehistoria", "pre", "quiere decir antes", "el tiempo antes de la historia escrita", "una historia repetida", "una historia falsa", "una historia muy larga"],
  ["incómodo", "in", "quiere decir no", "no cómodo", "cómodo otra vez", "cómodo antes", "muy cómodo"],
  ["reescribir", "re", "quiere decir otra vez", "volver a escribir", "no escribir", "escribir antes", "escribir mal"],
  ["desordenado", "des", "quiere decir no", "no ordenado", "ordenado otra vez", "ordenado antes", "muy ordenado"],
  ["inseguro", "in", "quiere decir no", "no seguro", "seguro otra vez", "seguro antes", "muy seguro"],
  ["prever", "pre", "quiere decir antes", "ver antes", "ver otra vez", "no ver", "ver mal"],
  ["desaparecer", "des", "quiere decir lo contrario", "dejar de verse", "aparecer otra vez", "aparecer antes", "aparecer mucho"],
  ["reaparecer", "re", "quiere decir otra vez", "aparecer otra vez", "no aparecer", "aparecer antes", "dejar de verse"],
  ["imposible", "im", "es in- antes de p y quiere decir no", "no posible", "posible otra vez", "posible antes", "muy posible"],
];

function prefixQ(locale: Locale, [word, pre, means, a, w1, w2, w3]: Prefixed): Q {
  const Word = cap(word);
  return {
    prompt: tr(locale, `What does "${word}" mean?`, `¿Qué quiere decir "${word}"?`),
    say: tr(locale, `What does ${word} mean?`, `¿Qué quiere decir ${word}?`),
    choices: [a, w1, w2, w3].map((label) => ({ label })),
    hints: [
      tr(locale, "Look at the first part of the word.", "Mira la primera parte de la palabra."),
      tr(
        locale,
        "un- and dis- mean not. re- means again. pre- means before. mis- means wrongly.",
        "des- e in- quieren decir no o lo contrario. re- quiere decir otra vez. pre- quiere decir antes.",
      ),
      tr(locale, `${Word} is ${pre}- + ${word.slice(pre.length)}.`, `${Word} es ${pre}- + ${word.slice(pre.length)}.`),
    ],
    steps: [`${pre}- ${means}.`, tr(locale, `${Word} means ${a}.`, `${Word} quiere decir ${a}.`)],
  };
}

// ---- Synonyms (level 1) and antonyms (level 2), grade 3 ----
/** [word, answer, three others] */
type Pairing = [string, string, string, string, string];
const EN_SYNONYMS: Pairing[][] = [
  [
    ["big", "large", "small", "loud", "soft"], ["happy", "glad", "sad", "tired", "angry"], ["fast", "quick", "slow", "late", "quiet"],
    ["begin", "start", "finish", "wait", "stop"], ["tired", "sleepy", "awake", "hungry", "busy"], ["small", "tiny", "huge", "round", "heavy"],
    ["smart", "clever", "foolish", "lazy", "rude"], ["shout", "yell", "whisper", "sing", "listen"], ["scared", "afraid", "brave", "calm", "proud"],
    ["pretty", "beautiful", "ugly", "messy", "loud"], ["angry", "mad", "calm", "kind", "glad"], ["quiet", "silent", "loud", "busy", "bright"],
    ["jump", "leap", "sit", "crawl", "fall"], ["easy", "simple", "hard", "long", "strange"], ["rock", "stone", "stick", "leaf", "sand"],
    ["sick", "ill", "well", "strong", "hungry"],
  ],
  [
    ["hot", "cold", "warm", "wet", "sunny"], ["early", "late", "soon", "first", "quick"], ["full", "empty", "heavy", "big", "round"],
    ["above", "below", "over", "near", "beside"], ["win", "lose", "play", "try", "cheer"], ["loud", "quiet", "noisy", "high", "fast"],
    ["brave", "scared", "bold", "strong", "proud"], ["ancient", "modern", "old", "broken", "huge"], ["remember", "forget", "recall", "learn", "think"],
    ["narrow", "wide", "thin", "long", "small"], ["smooth", "rough", "soft", "flat", "shiny"], ["arrive", "leave", "come", "reach", "wait"],
    ["polite", "rude", "kind", "nice", "shy"], ["always", "never", "often", "sometimes", "usually"], ["deep", "shallow", "low", "wet", "dark"],
    ["generous", "selfish", "kind", "giving", "rich"],
  ],
];
const ES_SYNONYMS: Pairing[][] = [
  [
    ["grande", "enorme", "pequeño", "ruidoso", "suave"], ["feliz", "contento", "triste", "cansado", "enojado"], ["rápido", "veloz", "lento", "tarde", "callado"],
    ["empezar", "comenzar", "terminar", "esperar", "parar"], ["bonito", "lindo", "feo", "sucio", "ruidoso"], ["pequeño", "diminuto", "enorme", "redondo", "pesado"],
    ["gritar", "chillar", "susurrar", "cantar", "escuchar"], ["miedo", "temor", "valor", "calma", "orgullo"], ["enojado", "molesto", "tranquilo", "amable", "alegre"],
    ["silencioso", "callado", "ruidoso", "ocupado", "brillante"], ["saltar", "brincar", "sentarse", "gatear", "caer"], ["fácil", "sencillo", "difícil", "largo", "extraño"],
    ["piedra", "roca", "palo", "hoja", "arena"], ["cansado", "agotado", "despierto", "hambriento", "ocupado"], ["regresar", "volver", "salir", "quedarse", "correr"],
    ["mirar", "observar", "oír", "dormir", "oler"],
  ],
  [
    ["caliente", "frío", "tibio", "mojado", "soleado"], ["temprano", "tarde", "pronto", "primero", "rápido"], ["lleno", "vacío", "pesado", "grande", "redondo"],
    ["arriba", "abajo", "encima", "cerca", "al lado"], ["ganar", "perder", "jugar", "intentar", "aplaudir"], ["ruidoso", "silencioso", "escandaloso", "alto", "rápido"],
    ["valiente", "miedoso", "atrevido", "fuerte", "orgulloso"], ["antiguo", "moderno", "viejo", "roto", "enorme"], ["recordar", "olvidar", "acordarse", "aprender", "pensar"],
    ["angosto", "ancho", "delgado", "largo", "pequeño"], ["liso", "áspero", "suave", "plano", "brillante"], ["llegar", "irse", "venir", "alcanzar", "esperar"],
    ["amable", "grosero", "bueno", "simpático", "tímido"], ["siempre", "nunca", "a menudo", "a veces", "casi siempre"], ["subir", "bajar", "trepar", "saltar", "correr"],
    ["generoso", "egoísta", "amable", "dadivoso", "rico"],
  ],
];

function synonymQ(opposite: boolean) {
  return (locale: Locale, [w, a, o1, o2, o3]: Pairing): Q => {
    const ask = opposite
      ? tr(locale, `Which word means the opposite of "${w}"?`, `¿Qué palabra significa lo contrario de "${w}"?`)
      : tr(locale, `Which word means almost the same as "${w}"?`, `¿Qué palabra significa casi lo mismo que "${w}"?`);
    return {
      prompt: ask,
      say: ask.replace(/"/g, ""),
      choices: [a, o1, o2, o3].map((label) => ({ label })),
      hints: opposite
        ? [
            tr(locale, "An antonym means the opposite.", "Un antónimo significa lo contrario."),
            tr(locale, `Think about "${w}". Now think of its opposite.`, `Piensa en "${w}". Ahora piensa en lo contrario.`),
            tr(locale, `Cross out "${o1}": it is not the opposite of "${w}".`, `Tacha "${o1}": no es lo contrario de "${w}".`),
          ]
        : [
            tr(locale, "A synonym means almost the same thing.", "Un sinónimo significa casi lo mismo."),
            tr(locale, `Put each word in a sentence in place of "${w}". Does the meaning stay the same?`, `Pon cada palabra en lugar de "${w}" en una oración. ¿Se entiende lo mismo?`),
            tr(locale, `"${o1}" means something very different from "${w}". Cross it out.`, `"${o1}" significa algo muy distinto de "${w}". Táchala.`),
          ],
      steps: [
        opposite
          ? tr(locale, `"${a}" is the opposite of "${w}".`, `"${a}" es lo contrario de "${w}".`)
          : tr(locale, `"${a}" and "${w}" mean almost the same thing.`, `"${a}" y "${w}" significan casi lo mismo.`),
      ],
    };
  };
}

// ---- Subject-verb agreement (grade 4) ----
/** [sentence, subject, how many / which person, answer, two wrong forms] */
type Agree = [string, string, string, string, string, string];
const EN_AGREE: Agree[] = [
  ["The dogs ___ loudly.", "The dogs", "many", "bark", "barks", "barking"],
  ["My sister ___ to school.", "My sister", "one", "walks", "walk", "walking"],
  ["The birds ___ every morning.", "The birds", "many", "sing", "sings", "singing"],
  ["He ___ milk every day.", "He", "one", "drinks", "drink", "drinking"],
  ["The children ___ outside after lunch.", "The children", "many", "play", "plays", "playing"],
  ["Our teacher ___ funny stories.", "Our teacher", "one", "tells", "tell", "telling"],
  ["The bus ___ at the corner.", "The bus", "one", "stops", "stop", "stopping"],
  ["My friends ___ the ball hard.", "My friends", "many", "kick", "kicks", "kicking"],
  ["The cat ___ on the windowsill.", "The cat", "one", "sleeps", "sleep", "sleeping"],
  ["Maya and Leo ___ together.", "Maya and Leo", "many", "read", "reads", "reading"],
  ["The flowers ___ in spring.", "The flowers", "many", "bloom", "blooms", "blooming"],
  ["That boy ___ very fast.", "That boy", "one", "runs", "run", "running"],
  ["The baby ___ when she is hungry.", "The baby", "one", "cries", "cry", "crys"],
  ["Each student ___ a lunch box.", "Each student", "one", "has", "have", "haves"],
  ["The puppies ___ their tails.", "The puppies", "many", "wag", "wags", "wagging"],
  ["She ___ her homework after dinner.", "She", "one", "does", "do", "doing"],
];
const ES_AGREE: Agree[] = [
  ["Los perros ___ muy fuerte.", "Los perros", "más de uno", "ladran", "ladra", "ladro"],
  ["Mi hermana ___ a la escuela.", "Mi hermana", "una sola persona", "camina", "caminan", "camino"],
  ["Los pájaros ___ en la mañana.", "Los pájaros", "más de uno", "cantan", "canta", "canto"],
  ["Él ___ leche todos los días.", "Él", "una sola persona", "toma", "toman", "tomo"],
  ["Los niños ___ afuera.", "Los niños", "más de uno", "juegan", "juega", "jugamos"],
  ["Nuestra maestra ___ cuentos divertidos.", "Nuestra maestra", "una sola persona", "cuenta", "cuentan", "cuento"],
  ["El autobús ___ en la esquina.", "El autobús", "uno solo", "para", "paran", "paro"],
  ["Mis amigos ___ la pelota.", "Mis amigos", "más de uno", "patean", "patea", "pateo"],
  ["El gato ___ en la ventana.", "El gato", "uno solo", "duerme", "duermen", "duermo"],
  ["Maya y Leo ___ juntos.", "Maya y Leo", "más de uno", "leen", "lee", "leemos"],
  ["Las flores ___ en primavera.", "Las flores", "más de una", "florecen", "florece", "florezco"],
  ["Ese niño ___ muy rápido.", "Ese niño", "uno solo", "corre", "corren", "corro"],
  ["Tú ___ muy bonito.", "Tú", "la persona a quien le hablas", "cantas", "canta", "cantan"],
  ["Yo ___ un perro.", "Yo", "quien habla", "tengo", "tiene", "tienen"],
  ["Nosotros ___ en el parque.", "Nosotros", "yo y otras personas", "jugamos", "juegan", "juega"],
  ["Cada estudiante ___ su lonchera.", "Cada estudiante", "uno solo", "trae", "traen", "traigo"],
];

function enAgreeQ([s, who, n, a, w1, w2]: Agree): Q {
  const many = n === "many";
  return {
    prompt: s,
    say: `${spoken(s)} Which word fits?`,
    choices: [a, w1, w2].map((label) => ({ label })),
    hints: [
      "Who is doing the action: one, or more than one?",
      "One: the frog hops. More than one: the frogs hop.",
      many ? `"${who}" is more than one.` : `"${who}" is just one.`,
    ],
    steps: [many ? `"${who}" is more than one, so the verb has no -s.` : `"${who}" is one, so the verb ends in -s.`, fill(s, a)],
  };
}

function esAgreeQ([s, who, n, a, w1, w2]: Agree): Q {
  return {
    prompt: s,
    say: `${spoken(s)} ¿Qué palabra va?`,
    choices: [a, w1, w2].map((label) => ({ label })),
    hints: ["¿Quién hace la acción?", "El verbo cambia según quién lo hace: el niño come, los niños comen.", `"${who}" es ${n}.`],
    steps: [`"${who}" es ${n}, así que el verbo es "${a}".`, fill(s, a)],
  };
}

// ---- Commas (grade 4) ----
// Spanish follows Spanish rules: no comma before "y" in a list, a comma before "pero", dates without
// commas (so the date item is a letter heading: place, date).
/** [rule, correct sentence, wrong versions, third hint] */
type Commas = [string, string, string[], string];
const COMMA_RULE: Record<string, string> = {
  list: "In a list of three or more, put a comma after each item except the last.",
  date: "In a date, put a comma between the day and the year.",
  weekday: "In a date, put a comma after the day of the week.",
  intro: "Put a comma after a word or phrase that starts the sentence.",
  join: "When and, but, or so joins two sentences, put a comma before it.",
  lista: "En una lista, pon coma entre las cosas, pero no antes de la y.",
  inicio: "Pon coma después de una palabra o frase que empieza la oración.",
  pero: "Pon coma antes de pero cuando une dos ideas.",
  nombre: "Pon coma después del nombre de la persona a quien le hablas.",
  fecha: "En el encabezado de una carta, pon coma entre el lugar y la fecha.",
};
const EN_COMMAS: Commas[] = [
  ["list", "I bought apples, pears, and grapes.", ["I bought apples pears and grapes.", "I bought, apples, pears, and grapes.", "I bought apples, pears and, grapes."], "The list has three things: apples, pears, grapes."],
  ["date", "We moved on June 4, 2023.", ["We moved on June, 4 2023.", "We moved on June 4 2023.", "We moved, on June 4, 2023."], "The day is 4 and the year is 2023. What goes between them?"],
  ["intro", "Yes, I can come to the party.", ["Yes I can come to the party.", "Yes I, can come to the party."], "The sentence starts with the word Yes."],
  ["join", "It rained all day, and we stayed inside.", ["It rained all day and, we stayed inside.", "It rained, all day and we stayed inside."], `Two sentences are joined: "It rained all day" and "we stayed inside."`],
  ["intro", "After lunch, we went to the library.", ["After, lunch we went to the library.", "After lunch we, went to the library."], `"After lunch" is the starting phrase.`],
  ["list", "Bring a pencil, a ruler, and a notebook.", ["Bring a pencil a ruler and a notebook.", "Bring, a pencil, a ruler, and a notebook."], "The list has three things: a pencil, a ruler, a notebook."],
  ["date", "My sister was born on May 10, 2016.", ["My sister was born on May, 10 2016.", "My sister was born on May 10 2016."], "The day is 10 and the year is 2016. What goes between them?"],
  ["join", "Sam likes soccer, but Ana likes chess.", ["Sam likes soccer but, Ana likes chess.", "Sam, likes soccer but Ana likes chess."], `Two sentences are joined: "Sam likes soccer" and "Ana likes chess."`],
  ["intro", "Well, that was a long walk.", ["Well that was, a long walk.", "Well that, was a long walk."], "The sentence starts with the word Well."],
  ["list", "We saw lions, tigers, and bears.", ["We saw lions tigers and bears.", "We saw, lions tigers and bears.", "We saw lions, tigers, and, bears."], "The list has three things: lions, tigers, bears."],
  ["weekday", "School starts on Monday, August 26.", ["School starts on Monday August 26.", "School starts, on Monday August 26."], "Monday is the day of the week. August 26 is the date."],
  ["join", "The bell rang, and the students lined up.", ["The bell rang and, the students lined up.", "The bell, rang and the students lined up."], `Two sentences are joined: "The bell rang" and "the students lined up."`],
  ["intro", "First, mix the flour and the eggs.", ["First mix the flour, and the eggs.", "First mix, the flour and the eggs."], `"First" is the starting word.`],
  ["date", "On July 4, 1776, the Declaration of Independence was signed.", ["On July, 4 1776 the Declaration of Independence was signed.", "On July 4 1776 the Declaration of Independence was signed."], "The day is 4 and the year is 1776. A comma also comes after the year."],
];
const ES_COMMAS: Commas[] = [
  ["lista", "Compré manzanas, peras y uvas.", ["Compré manzanas, peras, y uvas.", "Compré manzanas peras y uvas.", "Compré, manzanas, peras y uvas."], "La lista es manzanas, peras y uvas. ¿Va coma antes de la y?"],
  ["inicio", "Sí, puedo ir a la fiesta.", ["Sí puedo, ir a la fiesta.", "Sí puedo ir a la fiesta."], "La oración empieza con la palabra Sí."],
  ["pero", "Sam juega fútbol, pero Ana juega ajedrez.", ["Sam juega fútbol pero, Ana juega ajedrez.", "Sam, juega fútbol pero Ana juega ajedrez."], "Busca la palabra pero."],
  ["inicio", "Después del almuerzo, fuimos a la biblioteca.", ["Después, del almuerzo fuimos a la biblioteca.", "Después del almuerzo fuimos, a la biblioteca."], `"Después del almuerzo" es la frase de inicio.`],
  ["nombre", "Ana, ven a comer.", ["Ana ven, a comer.", "Ana ven a comer."], "Le hablas a Ana."],
  ["lista", "Trae un lápiz, una regla y un cuaderno.", ["Trae un lápiz, una regla, y un cuaderno.", "Trae, un lápiz una regla y un cuaderno."], "La lista es un lápiz, una regla y un cuaderno. ¿Va coma antes de la y?"],
  ["fecha", "Houston, 4 de junio de 2023", ["Houston 4, de junio de 2023", "Houston, 4, de junio, de 2023"], "Primero va el lugar, Houston. Luego va la fecha."],
  ["inicio", "Primero, mezcla la harina y los huevos.", ["Primero mezcla, la harina y los huevos.", "Primero mezcla la harina, y los huevos."], `"Primero" es la palabra de inicio.`],
  ["lista", "Vimos leones, tigres y osos.", ["Vimos leones, tigres, y osos.", "Vimos leones tigres y osos."], "La lista es leones, tigres y osos. ¿Va coma antes de la y?"],
  ["pero", "Quería salir, pero estaba lloviendo.", ["Quería salir pero, estaba lloviendo.", "Quería, salir pero estaba lloviendo."], "Busca la palabra pero."],
  ["inicio", "Bueno, fue una caminata larga.", ["Bueno fue, una caminata larga.", "Bueno fue una caminata larga."], "La oración empieza con la palabra Bueno."],
  ["nombre", "Mamá, ¿me ayudas?", ["Mamá ¿me ayudas?", "Mamá, ¿me, ayudas?"], "Le hablas a mamá."],
  ["lista", "Mi perro es grande, peludo y juguetón.", ["Mi perro es grande, peludo, y juguetón.", "Mi perro, es grande peludo y juguetón."], "La lista es grande, peludo y juguetón. ¿Va coma antes de la y?"],
  ["inicio", "No, no quiero más sopa.", ["No no quiero más sopa.", "No, no quiero, más sopa."], "La oración empieza con la palabra No."],
];

function commaQ(locale: Locale, [rule, s, wrong, third]: Commas): Q {
  const ask = tr(locale, "Which sentence uses commas correctly?", "¿Qué oración usa bien las comas?");
  return {
    prompt: ask,
    say: ask,
    choices: [s, ...wrong].map((label) => ({ label })),
    hints: [tr(locale, "Read each sentence aloud. A comma marks a short pause.", "Lee cada oración en voz alta. La coma marca una pausa corta."), COMMA_RULE[rule], third],
    steps: [COMMA_RULE[rule], tr(locale, `Correct: ${s}`, `Correcta: ${s}`)],
  };
}

// ---- Figurative language (grade 4) ----
// Half the items sort a sentence (simile, metaphor, literal); half ask what an idiom or saying means.
/** [sentence, "simile" | "metaphor" | "literal", third hint] or [saying, meaning, three wrong meanings, third hint] */
type Figure = [string, "simile" | "metaphor" | "literal", string] | [string, string, string, string, string, string];
const EN_FIGURES: Figure[] = [
  ["Her smile was as bright as the sun.", "simile", "Look for the word as."],
  ["The classroom was a zoo.", "metaphor", "The classroom is not really a zoo. Is there a like or as?"],
  ["The dog ran across the yard.", "literal", "Could this really happen just as it is written?"],
  ["He swims like a fish.", "simile", "Look for the word like."],
  ["My brother is a couch potato.", "metaphor", "He is not really a potato. Is there a like or as?"],
  ["The snow was a white blanket on the hill.", "metaphor", "The snow is not really a blanket. Is there a like or as?"],
  ["The baby slept in her crib.", "literal", "Could this really happen just as it is written?"],
  ["The cat's fur was as soft as silk.", "simile", "Look for the word as."],
  ["It's raining cats and dogs.", "It is raining very hard.", "Animals are falling from the sky.", "It is a little cloudy.", "Pets are playing in the rain.", "No animals are falling. Think about the weather."],
  ["That test was a piece of cake.", "It was very easy.", "It was about baking.", "It was very hard.", "It was very short.", "There was no cake. Think about how easy eating cake is."],
  ["Break a leg in your show.", "Good luck.", "Be careful not to fall.", "Hurt yourself.", "Dance as hard as you can.", "Nobody wants a broken leg. People say this before a show."],
  ["I'm all ears.", "I am listening closely.", "I have big ears.", "I can't hear you.", "I am very tired.", "Ears are for hearing. What is the person ready to do?"],
  ["Hold your horses.", "Wait and be patient.", "Grab a horse.", "Hurry up.", "Ride carefully.", "There are no horses. People say this when someone rushes."],
  ["That bike costs an arm and a leg.", "It costs a lot of money.", "It hurts to ride.", "It is free.", "It is cheap.", "No one pays with an arm. Think about the price."],
  ["She has a heart of gold.", "She is very kind.", "She is very rich.", "She is sick.", "She is very strong.", "Her heart is not made of gold. Gold is precious. What is precious about a person?"],
  ["Let's call it a day.", "Let's stop working for now.", "Let's name the day.", "Let's start early.", "Let's phone a friend.", "People say this at the end of work time."],
];
const ES_FIGURES: Figure[] = [
  ["Su sonrisa era brillante como el sol.", "simile", "Busca la palabra como."],
  ["El salón era un zoológico.", "metaphor", "El salón no es un zoológico de verdad. ¿Aparece la palabra como?"],
  ["El perro corrió por el patio.", "literal", "¿Esto puede pasar tal cual está escrito?"],
  ["Mi hermano nada como un pez.", "simile", "Busca la palabra como."],
  ["Tus ojos son dos luceros.", "metaphor", "Los ojos no son luceros de verdad. ¿Aparece la palabra como?"],
  ["La nieve era una manta blanca sobre la colina.", "metaphor", "La nieve no es una manta de verdad. ¿Aparece la palabra como?"],
  ["El bebé durmió en su cuna.", "literal", "¿Esto puede pasar tal cual está escrito?"],
  ["Su pelo era suave como la seda.", "simile", "Busca la palabra como."],
  ["Está lloviendo a cántaros.", "Está lloviendo muy fuerte.", "Caen jarras del cielo.", "Está un poco nublado.", "Hay charcos pequeños.", "No caen cántaros de verdad. Piensa en cuánta agua cabe en un cántaro."],
  ["El examen fue pan comido.", "Fue muy fácil.", "Trataba de comida.", "Fue muy difícil.", "Fue muy corto.", "No había pan en el examen. Piensa en lo fácil que es comer pan."],
  ["Más vale tarde que nunca.", "Es mejor hacer algo tarde que no hacerlo.", "Siempre hay que llegar tarde.", "Nunca llegues tarde.", "La noche es mejor que el día.", "Compara dos cosas: tarde y nunca. ¿Cuál es mejor?"],
  ["Soy todo oídos.", "Te escucho con atención.", "Tengo orejas grandes.", "No te oigo.", "Estoy muy cansado.", "Los oídos sirven para escuchar. ¿Qué está lista para hacer la persona?"],
  ["Esa bici cuesta un ojo de la cara.", "Cuesta muchísimo dinero.", "Duele mucho usarla.", "Es gratis.", "Es barata.", "Nadie paga con un ojo. Piensa en el precio."],
  ["Mi abuela tiene un corazón de oro.", "Es muy bondadosa.", "Es muy rica.", "Está enferma.", "Es muy fuerte.", "Su corazón no es de oro. El oro vale mucho. ¿Qué vale mucho en una persona?"],
  ["Camarón que se duerme se lo lleva la corriente.", "Si te distraes, pierdes tu oportunidad.", "Los camarones duermen en el río.", "Hay que dormir mucho.", "El agua del río es peligrosa.", "Piensa en qué le pasa a alguien que no pone atención."],
  ["En boca cerrada no entran moscas.", "A veces es mejor no hablar.", "Las moscas entran a la boca.", "Hay que comer con la boca cerrada.", "Hay muchas moscas en verano.", "Habla de cuándo conviene quedarse callado."],
];

function figureQ(locale: Locale, f: Figure): Q {
  if (f.length === 3) {
    const [s, kind, third] = f;
    const names = { simile: tr(locale, "Simile", "Símil"), metaphor: tr(locale, "Metaphor", "Metáfora"), literal: tr(locale, "Literal", "Literal") };
    const ask = tr(locale, "Is this a simile, a metaphor, or literal?", "¿Es un símil, una metáfora o lenguaje literal?");
    const why = {
      simile: [tr(locale, "It compares two things using like or as.", "Compara dos cosas con la palabra como."), tr(locale, "It is a simile.", "Es un símil.")],
      metaphor: [tr(locale, "It says one thing is another thing.", "Dice que una cosa es otra."), tr(locale, "It is a metaphor.", "Es una metáfora.")],
      literal: [tr(locale, "It means exactly what it says.", "Dice exactamente lo que pasa."), tr(locale, "It is literal.", "Es lenguaje literal.")],
    };
    return {
      prompt: `“${s}” ${ask}`,
      say: `${s} ${ask}`,
      choices: [kind, ...(["simile", "metaphor", "literal"] as const).filter((k) => k !== kind)].map((k) => ({ label: names[k] })),
      hints: [
        tr(locale, "Does the sentence say exactly what happens, or compare two things?", "¿La oración dice exactamente lo que pasa, o compara dos cosas?"),
        tr(
          locale,
          "A simile compares with like or as. A metaphor says one thing is another. Literal means exactly what it says.",
          "Un símil compara con la palabra como. Una metáfora dice que una cosa es otra. Lo literal dice exactamente lo que pasa.",
        ),
        third,
      ],
      steps: why[kind],
    };
  }
  const [s, a, w1, w2, w3, third] = f;
  const bare = s.replace(/\.$/, "");
  return {
    prompt: tr(locale, `What does “${bare}” mean?`, `¿Qué quiere decir “${bare}”?`),
    say: tr(locale, `What does this mean? ${s}`, `¿Qué quiere decir esto? ${s}`),
    choices: [a, w1, w2, w3].map((label) => ({ label })),
    hints: [
      tr(locale, "This saying does not mean exactly what the words say.", "Este dicho no quiere decir exactamente lo que dicen las palabras."),
      tr(locale, "Think about when people say it.", "Piensa en cuándo lo dice la gente."),
      third,
    ],
    steps: [tr(locale, `“${bare}” means: ${a}`, `“${bare}” quiere decir: ${a}`)],
  };
}

/** Every bank, by skill id and level (index 0 = level 1). Exported for the content tests. */
export const ENGLISH_K_4_BANKS: Record<string, Entry[][]> = {
  "e.letter.sounds": [0, 1].map((i) => same(EN_LETTERS[i], ES_LETTERS[i], letterQ)),
  "e.rhyme": [same(EN_RHYMES, ES_RHYMES, rhymeQ)],
  "e.syllables": [same(EN_CLAPS, ES_CLAPS, syllableQ)],
  "e.sight.words": [0, 1].map((i) => same(EN_SIGHT[i], ES_SIGHT[i], sightQ)),
  "e.cvc.words": [same(EN_CVC, ES_CVC, spellQ)],
  "e.capitals": [same(EN_CAPS, ES_CAPS, capsQ)],
  "e.plurals": [0, 1].map((i) => both(EN_PLURALS[i], ES_PLURALS[i], enPluralQ, esPluralQ)),
  "e.nouns.verbs": [same(EN_KINDS, ES_KINDS, kindQ), same(EN_IN_SENTENCE, ES_IN_SENTENCE, inSentenceQ)],
  "e.past.tense": [0, 1].map((i) => both(EN_PAST[i], ES_PAST[i], enPastQ, esPastQ(i === 1))),
  "e.contractions": [both(EN_CONTRACTIONS, ES_CONTRACTIONS, enContractionQ, esContractionQ)],
  "e.adjectives": [same(EN_ADJECTIVES, ES_ADJECTIVES, adjectiveQ)],
  "e.homophones": [0, 1].map((i) => same(EN_HOMOPHONES[i], ES_HOMOPHONES[i], homophoneQ)),
  "e.prefixes": [same(EN_PREFIXES, ES_PREFIXES, prefixQ)],
  "e.synonyms": [0, 1].map((i) => same(EN_SYNONYMS[i], ES_SYNONYMS[i], synonymQ(i === 1))),
  "e.subject.verb": [both(EN_AGREE, ES_AGREE, enAgreeQ, esAgreeQ)],
  "e.commas": [same(EN_COMMAS, ES_COMMAS, commaQ)],
  "e.figurative": [same(EN_FIGURES, ES_FIGURES, figureQ)],
};

type Meta = Omit<Skill, "subject" | "content" | "levels" | "generate">;
const skill = (meta: Meta, seconds: number[]): Skill => {
  const bank = ENGLISH_K_4_BANKS[meta.id];
  return { ...meta, subject: "english", content: "draft", levels: bank.length, generate: fromBank(bank, seconds) };
};

export const ENGLISH_K_4: Skill[] = [
  skill({ id: "e.letter.sounds", grade: "K", title: { en: "Letter sounds", es: "Sonidos de las letras" }, standard: "RF.K.3a", prereqs: [] }, [8]),
  skill({ id: "e.rhyme", grade: "K", title: { en: "Rhyming words", es: "Palabras que riman" }, standard: "RF.K.2a", prereqs: [] }, [10]),
  skill({ id: "e.syllables", grade: "K", title: { en: "Clap the syllables", es: "Aplaude las sílabas" }, standard: "RF.K.2b", prereqs: [] }, [12]),
  skill({ id: "e.sight.words", grade: "K", title: { en: "Sight words", es: "Palabras frecuentes" }, standard: "RF.K.3c", prereqs: ["e.letter.sounds"] }, [6]),
  skill({ id: "e.cvc.words", grade: "1", title: { en: "Read short words", es: "Leer palabras cortas" }, standard: "RF.1.3b", prereqs: ["e.letter.sounds"] }, [8]),
  skill({ id: "e.capitals", grade: "1", title: { en: "Capitals and end marks", es: "Mayúsculas y signos" }, standard: "L.1.2", prereqs: ["e.sight.words"] }, [20]),
  skill({ id: "e.plurals", grade: "1", title: { en: "Plurals", es: "El plural" }, standard: "L.1.1c", prereqs: ["e.cvc.words"] }, [10, 12]),
  skill({ id: "e.nouns.verbs", grade: "2", title: { en: "Nouns and verbs", es: "Sustantivos y verbos" }, standard: "L.2.1", prereqs: ["e.plurals"] }, [10, 20]),
  skill({ id: "e.past.tense", grade: "2", title: { en: "Past tense verbs", es: "Verbos en pasado" }, standard: "L.2.1d", prereqs: ["e.nouns.verbs"] }, [15, 15]),
  skill({ id: "e.contractions", grade: "2", title: { en: "Contractions", es: "Contracciones: al y del" }, standard: "L.2.2c", prereqs: ["e.capitals"] }, [10]),
  skill({ id: "e.adjectives", grade: "3", title: { en: "Adjectives", es: "Adjetivos" }, standard: "L.3.1a", prereqs: ["e.nouns.verbs"] }, [20]),
  skill({ id: "e.homophones", grade: "3", title: { en: "Homophones", es: "Homófonos" }, standard: "L.4.1g", prereqs: ["e.contractions"] }, [15, 15]),
  skill({ id: "e.prefixes", grade: "3", title: { en: "Prefixes", es: "Prefijos" }, standard: "L.3.4b", prereqs: ["e.adjectives"] }, [15]),
  skill({ id: "e.synonyms", grade: "3", title: { en: "Synonyms and antonyms", es: "Sinónimos y antónimos" }, standard: "L.4.5c", prereqs: ["e.adjectives"] }, [10, 10]),
  skill({ id: "e.subject.verb", grade: "4", title: { en: "Subject-verb agreement", es: "Concordancia sujeto-verbo" }, standard: "L.3.1f", prereqs: ["e.nouns.verbs"] }, [15]),
  skill({ id: "e.commas", grade: "4", title: { en: "Commas", es: "Las comas" }, standard: "L.4.2", prereqs: ["e.capitals"] }, [30]),
  skill({ id: "e.figurative", grade: "4", title: { en: "Figurative language", es: "Lenguaje figurado" }, standard: "L.5.5a", prereqs: ["e.synonyms"] }, [25]),
];
