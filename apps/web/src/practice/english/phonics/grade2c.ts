import type { Locale } from "@/lib/types";
import { tr } from "../../text";
import { altFor, cap, word, type Entry, type Q } from "./core";

// Grade 2 syllables. English: where a two-syllable word splits (rab-bit, ti-ger, cab-in, ta-ble) and the
// six syllable types. Spanish: separar en sílabas (pe-lo-ta, li-bro, a-vión, san-dí-a) and the stressed
// syllable with agudas, llanas y esdrújulas. English splits follow the dictionary (Merriam-Webster).

// ---- e.syllable.split ----
// Codes: E split too early, L split too late, C a closed first part where it is open (tig-er),
// O an open first part where it is closed (ca-bin), M two syllables joined, P ch / ll / rr split,
// B a blend split (lib-ro), D a diphthong split (a-vi-ón), H a hiatus joined (san-día).
const SPLIT: Record<string, [string, string, string]> = {
  E: ["split-too-early", "splits too early.", "separa demasiado pronto."],
  L: ["split-too-late", "splits too late.", "pega una consonante a la sílaba de antes."],
  C: ["closed-for-open", "closes the first part, making its vowel short.", ""],
  O: ["open-for-closed", "leaves the first part open, making its vowel long.", ""],
  M: ["missed-a-syllable", "joins two syllables.", "junta dos sílabas en una."],
  P: ["split-letter-pair", "splits a letter pair.", "separa ch, ll o rr, que van juntas."],
  B: ["split-blend", "splits a blend.", "separa dos consonantes que van juntas, como br o tr."],
  D: ["split-diphthong", "splits two vowels said together.", "separa un diptongo, que se dice en un solo golpe."],
  H: ["joined-hiatus", "joins two vowels said apart.", "junta dos vocales que se dicen en golpes distintos."],
};
/** [word, picture or "", the right split, wrong splits as "split:CODE"] */
type Split = [string, string, string, string];
const EN_SPLIT: Split[][] = [
  [
    ["rabbit", "🐇", "rab-bit", "ra-bbit:E rabb-it:L"], ["napkin", "", "nap-kin", "na-pkin:E napk-in:L"], ["basket", "🧺", "bas-ket", "ba-sket:E bask-et:L"],
    ["kitten", "🐱", "kit-ten", "ki-tten:E kitt-en:L"], ["mitten", "🧤", "mit-ten", "mi-tten:E mitt-en:L"], ["puppet", "", "pup-pet", "pu-ppet:E pupp-et:L"],
    ["sunset", "🌇", "sun-set", "su-nset:E suns-et:L"], ["muffin", "", "muf-fin", "mu-ffin:E muff-in:L"], ["picnic", "", "pic-nic", "pi-cnic:E picn-ic:L"],
    ["helmet", "", "hel-met", "he-lmet:E helm-et:L"], ["tablet", "", "tab-let", "ta-blet:E tabl-et:L"], ["insect", "🐞", "in-sect", "i-nsect:E ins-ect:L"],
    ["pencil", "✏️", "pen-cil", "pe-ncil:E penc-il:L"], ["magnet", "🧲", "mag-net", "ma-gnet:E magn-et:L"], ["dentist", "", "den-tist", "de-ntist:E dent-ist:L"],
    ["button", "", "but-ton", "bu-tton:E butt-on:L"],
  ],
  [
    ["tiger", "🐯", "ti-ger", "tig-er:C tige-r:L"], ["robot", "🤖", "ro-bot", "rob-ot:C robo-t:L"], ["paper", "📄", "pa-per", "pap-er:C pape-r:L"],
    ["music", "🎵", "mu-sic", "mus-ic:C musi-c:L"], ["baby", "👶", "ba-by", "bab-y:C b-aby:E"], ["spider", "🕷️", "spi-der", "spid-er:C sp-ider:E"],
    ["zero", "0️⃣", "ze-ro", "zer-o:C z-ero:E"], ["bacon", "🥓", "ba-con", "bac-on:C baco-n:L"], ["cabin", "", "cab-in", "ca-bin:O cabi-n:L"],
    ["lemon", "🍋", "lem-on", "le-mon:O lemo-n:L"], ["wagon", "", "wag-on", "wa-gon:O wago-n:L"], ["seven", "7️⃣", "sev-en", "se-ven:O seve-n:L"],
    ["camel", "🐫", "cam-el", "ca-mel:O came-l:L"], ["table", "", "ta-ble", "tab-le:C tabl-e:L"], ["candle", "🕯️", "can-dle", "cand-le:L ca-ndle:E"],
    ["puzzle", "🧩", "puz-zle", "puzz-le:L pu-zzle:E"],
  ],
];
const ES_SPLIT: Split[][] = [
  [
    ["pelota", "⚽", "pe-lo-ta", "pel-o-ta:L pelo-ta:M"], ["camisa", "👕", "ca-mi-sa", "cam-i-sa:L cami-sa:M"], ["tomate", "🍅", "to-ma-te", "tom-a-te:L toma-te:M"],
    ["zapato", "👞", "za-pa-to", "zap-a-to:L zapa-to:M"], ["paloma", "🕊️", "pa-lo-ma", "pal-o-ma:L palo-ma:M"], ["gusano", "🐛", "gu-sa-no", "gus-a-no:L gusa-no:M"],
    ["conejo", "🐰", "co-ne-jo", "con-e-jo:L cone-jo:M"], ["pepino", "🥒", "pe-pi-no", "pep-i-no:L pepi-no:M"], ["maleta", "🧳", "ma-le-ta", "mal-e-ta:L male-ta:M"],
    ["lechuga", "🥬", "le-chu-ga", "lec-hu-ga:P lechu-ga:M"], ["muñeca", "🪆", "mu-ñe-ca", "muñ-e-ca:L muñe-ca:M"], ["caballo", "🐴", "ca-ba-llo", "ca-bal-lo:P caba-llo:M"],
    ["cometa", "🪁", "co-me-ta", "com-e-ta:L come-ta:M"], ["helado", "🍦", "he-la-do", "hel-a-do:L hela-do:M"], ["cuchara", "🥄", "cu-cha-ra", "cuc-ha-ra:P cucha-ra:M"],
    ["banana", "🍌", "ba-na-na", "ban-a-na:L bana-na:M"],
  ],
  [
    ["libro", "📖", "li-bro", "lib-ro:B libr-o:L"], ["cuaderno", "📓", "cua-der-no", "cu-a-der-no:D cuad-er-no:L"], ["estrella", "⭐", "es-tre-lla", "est-re-lla:B es-trel-la:P"],
    ["avión", "✈️", "a-vión", "a-vi-ón:D av-ión:L"], ["camión", "🚚", "ca-mión", "ca-mi-ón:D cam-ión:L"], ["puerta", "🚪", "puer-ta", "pu-er-ta:D pue-rta:E"],
    ["tigre", "🐯", "ti-gre", "tig-re:B tigr-e:L"], ["abrazo", "🤗", "a-bra-zo", "ab-ra-zo:B a-braz-o:L"], ["bicicleta", "🚲", "bi-ci-cle-ta", "bi-cic-le-ta:B bi-ci-cleta:M"],
    ["ventana", "🪟", "ven-ta-na", "ve-nta-na:E vent-a-na:L"], ["canción", "🎵", "can-ción", "can-ci-ón:D ca-nción:E"], ["dientes", "🦷", "dien-tes", "di-en-tes:D dient-es:L"],
    ["sandía", "🍉", "san-dí-a", "san-día:H sa-ndí-a:E"], ["río", "🏞️", "rí-o", "río:H r-ío:E"], ["país", "🗺️", "pa-ís", "país:H paí-s:L"],
    ["hormiga", "🐜", "hor-mi-ga", "ho-rmi-ga:E horm-i-ga:L"],
  ],
];

function splitQ(locale: Locale, level: number, [w, picture, key, spec]: Split): Q {
  const wrong = spec.split(" ").map((s) => s.split(":"));
  const [, en, es] = SPLIT[wrong[0][1]];
  return {
    prompt: tr(locale, `How does ${w} split into syllables?`, `¿Cómo se separa ${w} en sílabas?`),
    say: tr(locale, `${cap(w)}. Which way splits it into syllables?`, `${cap(w)}. ¿Cómo se separa en sílabas?`),
    ...(picture ? { picture, alt: altFor(locale, w) } : {}),
    choices: [word(key), ...wrong.map(([label, code]) => word(label, SPLIT[code][0]))],
    hints: [
      tr(locale, "Clap the word. Each clap is a syllable.", "Aplaude la palabra. Cada palmada es una sílaba."),
      level === 1
        ? tr(locale, "Between two consonants, split them: rab-bit.", "Una consonante entre vocales va con la vocal que sigue: pe-lo-ta.")
        : tr(locale, "Long first vowel: split after it. Short: after the consonant.", "No se separan bl, br, tr, ch, ll, rr ni diptongos como io o ue."),
      tr(locale, `${cap(wrong[0][0])} ${en}`, `${cap(wrong[0][0])} ${es}`),
    ],
    steps: [tr(locale, `${cap(w)}: ${key}`, `${cap(w)}: ${key}`)],
  };
}

export const SYLLABLE_SPLIT: Entry[][] = [0, 1].map((i) => EN_SPLIT[i].map((d, j) => ({ en: splitQ("en", i + 1, d), es: splitQ("es", i + 1, ES_SPLIT[i][j]) })));

// ---- e.syllable.types ----
// English: the six types, three per level. Spanish: the stressed syllable (level 1), then aguda, llana
// or esdrújula (level 2). Tags name the mix-up, e.g. "open-as-closed" or "llana-as-aguda".
const kebab = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, "-");
const EN_KINDS = [["closed", "open", "silent e"], ["vowel team", "r-controlled", "consonant-le"]];
const EN_SEEN: Record<string, string> = {
  closed: "a consonant follows the vowel.",
  open: "the vowel is at the end.",
  "silent e": "the last e is silent.",
  "vowel team": "two vowels sit together.",
  "r-controlled": "an r follows the vowel.",
  "consonant-le": "a consonant comes before le.",
};
/** [syllable, the word it comes from ("" when it is the whole word), its type] */
type Kind = [string, string, string];
const EN_TYPES: Kind[][] = [
  [
    ["cat", "", "closed"], ["go", "", "open"], ["cake", "", "silent e"], ["hi", "", "open"], ["sun", "", "closed"], ["me", "", "open"],
    ["bike", "", "silent e"], ["hop", "", "closed"], ["she", "", "open"], ["home", "", "silent e"], ["fish", "", "closed"], ["no", "", "open"],
    ["cute", "", "silent e"], ["nest", "", "closed"], ["we", "", "open"], ["time", "", "silent e"],
  ],
  [
    ["rain", "", "vowel team"], ["boat", "", "vowel team"], ["feet", "", "vowel team"], ["team", "", "vowel team"], ["coat", "", "vowel team"], ["car", "", "r-controlled"],
    ["corn", "", "r-controlled"], ["bird", "", "r-controlled"], ["fur", "", "r-controlled"], ["star", "", "r-controlled"], ["ble", "table", "consonant-le"], ["tle", "turtle", "consonant-le"],
    ["ple", "apple", "consonant-le"], ["dle", "candle", "consonant-le"], ["gle", "jungle", "consonant-le"], ["zle", "puzzle", "consonant-le"],
  ],
];

function enTypeQ(level: number, [s, from, kind]: Kind): Q {
  const shown = from ? `“${s}” in ${from}` : s;
  const others = EN_KINDS[level - 1].filter((k) => k !== kind);
  return {
    prompt: `What kind of syllable is ${shown}?`,
    say: from ? `The last part of ${from}. What kind of syllable is it?` : `${cap(s)}. What kind of syllable is it?`,
    choices: [word(kind), ...others.map((k) => word(k, `${kebab(kind)}-as-${kebab(k)}`))],
    hints: [
      "Look at the vowels and what comes after them.",
      level === 1
        ? "Closed ends in a consonant. Open ends in a vowel. Silent e ends in e."
        : "Vowel team: two vowels. R-controlled: vowel then r. Consonant-le: ends in le.",
      `In ${from ? s : `“${s}”`}, ${EN_SEEN[kind]}`,
    ],
    steps: [`${s}: ${kind}`],
  };
}

/** Spanish words split into syllables, as written (with any accent mark). */
const ES_STRESS: string[] = [
  "pe-lo-ta", "za-pa-to", "ven-ta-na", "to-ma-te", "ca-mi-sa", "he-la-do", "sá-ba-do", "mú-si-ca",
  "pá-ja-ro", "plá-ta-no", "co-ra-zón", "ja-ba-lí", "co-li-brí", "au-to-bús", "cá-ma-ra", "brú-ju-la",
];
/** [word split into syllables, index of the stressed syllable counted from the end (0 = last)] */
const ES_KINDS: [string, number][] = [
  ["co-ra-zón", 0], ["re-loj", 0], ["pa-pel", 0], ["ra-tón", 0], ["ciu-dad", 0], ["pe-lo-ta", 1], ["ár-bol", 1], ["lá-piz", 1],
  ["me-sa", 1], ["fá-cil", 1], ["sá-ba-do", 2], ["mú-si-ca", 2], ["pá-ja-ro", 2], ["te-lé-fo-no", 2], ["mur-cié-la-go", 2], ["cá-ma-ra", 2],
];
const POSITION = ["stress-on-first", "stress-on-middle", "stress-on-last"];
const ruleHint = (w: string) =>
  /[áéíóú]/.test(w)
    ? "La tilde marca la sílaba fuerte."
    : /[aeiouns]$/.test(w)
      ? "Sin tilde y terminada en vocal, n o s: la fuerte es la penúltima."
      : "Sin tilde y terminada en otra consonante: la fuerte es la última.";

function esStressQ(split: string, at: number): Q {
  const parts = split.split("-");
  const w = parts.join("");
  const key = parts[at];
  return {
    prompt: `¿Cuál es la sílaba fuerte de ${w}?`,
    say: `${cap(w)}. ¿Qué sílaba suena más fuerte?`,
    choices: [word(key), ...parts.map((p, i) => [p, i] as const).filter(([, i]) => i !== at).map(([p, i]) => word(p, POSITION[i]))],
    hints: ["Di la palabra despacio, como si llamaras a alguien.", "La sílaba fuerte suena un poco más alto y más largo.", ruleHint(w)],
    steps: [split, `La sílaba fuerte es ${key}.`],
  };
}
const ES_NAMES = ["aguda", "llana", "esdrújula"];
function esKindQ([split, fromEnd]: [string, number]): Q {
  const parts = split.split("-");
  const w = parts.join("");
  const strong = parts[parts.length - 1 - fromEnd];
  const kind = ES_NAMES[fromEnd];
  return {
    prompt: `${cap(w)}: ¿aguda, llana o esdrújula?`,
    say: `${cap(w)}. ¿Es aguda, llana o esdrújula?`,
    choices: [word(kind), ...ES_NAMES.filter((k) => k !== kind).map((k) => word(k, `${kebab(kind)}-as-${kebab(k)}`))],
    hints: ["Primero busca la sílaba fuerte.", "Aguda: la última. Llana: la penúltima. Esdrújula: la antepenúltima.", `La sílaba fuerte de ${w} es ${strong}.`],
    steps: [`${split}: la fuerte es ${strong}.`, `${cap(w)} es ${kind}.`],
  };
}

/** The stressed syllable by the Spanish accent rules: the one with a tilde, else by the last letter. */
const stressAt = (parts: string[]) => {
  const marked = parts.findIndex((p) => /[áéíóú]/.test(p));
  if (marked >= 0) return marked;
  return /[aeiouns]$/.test(parts.join("")) ? parts.length - 2 : parts.length - 1;
};

export const SYLLABLE_TYPES: Entry[][] = [
  EN_TYPES[0].map((d, i) => ({ en: enTypeQ(1, d), es: esStressQ(ES_STRESS[i], stressAt(ES_STRESS[i].split("-"))) })),
  EN_TYPES[1].map((d, i) => ({ en: enTypeQ(2, d), es: esKindQ(ES_KINDS[i]) })),
];
