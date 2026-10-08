import { altFor, cap, pic, voiced, word, type Entry, type Q } from "./core";

// e.y.vowel (grade 1): y as a vowel. English: at the end of a one-syllable word y says long i (fly);
// at the end of a longer word it says long e (baby); at the start it is a consonant (yarn). Spanish:
// at the end of a word y sounds like the vowel i (rey, hoy, muy); before a vowel it is a consonant
// (yate, playa), and inside a word the vowel sound is written i (reina, aire).

// Level 1 (listening). English: [target, picture, key, picture, wrong, picture, code, other, picture];
// codes: I y says long i, E y says long e. The other wrong word starts with consonant y.
type EnHear = [string, string, string, string, string, string, "I" | "E", string, string];
const EN_HEAR: EnHear[] = [
  ["fly", "🪰", "cry", "😢", "baby", "👶", "E", "yo-yo", "🪀"], ["cry", "😢", "fly", "🪰", "puppy", "🐶", "E", "yarn", "🧶"],
  ["sky", "🌌", "butterfly", "🦋", "bunny", "🐰", "E", "yawn", "🥱"], ["butterfly", "🦋", "fly", "🪰", "candy", "🍬", "E", "yellow", "💛"],
  ["baby", "👶", "puppy", "🐶", "fly", "🪰", "I", "yo-yo", "🪀"], ["puppy", "🐶", "bunny", "🐰", "cry", "😢", "I", "yarn", "🧶"],
  ["bunny", "🐰", "candy", "🍬", "sky", "🌌", "I", "yawn", "🥱"], ["candy", "🍬", "pony", "🐴", "butterfly", "🦋", "I", "yellow", "💛"],
  ["pony", "🐴", "kitty", "🐱", "fly", "🪰", "I", "yo-yo", "🪀"], ["happy", "😀", "teddy", "🧸", "cry", "😢", "I", "yarn", "🧶"],
  ["kitty", "🐱", "cherry", "🍒", "sky", "🌌", "I", "yawn", "🥱"], ["teddy", "🧸", "daisy", "🌼", "butterfly", "🦋", "I", "yellow", "💛"],
  ["cherry", "🍒", "money", "💰", "fly", "🪰", "I", "yo-yo", "🪀"], ["daisy", "🌼", "baby", "👶", "cry", "😢", "I", "yarn", "🧶"],
  ["money", "💰", "happy", "😀", "sky", "🌌", "I", "yawn", "🥱"], ["sky", "🌌", "cry", "😢", "kitty", "🐱", "E", "yellow", "💛"],
];
const YSOUND = { I: "y-as-long-i", E: "y-as-long-e" };
function enHearQ([t, tp, k, kp, w, wp, code, c, cp]: EnHear): Q {
  const T = cap(t);
  return {
    prompt: `Which word ends like ${t}?`,
    say: `${T}. Which word ends with the same sound?`,
    picture: tp,
    alt: altFor("en", t),
    choices: [pic(k, kp), pic(w, wp, YSOUND[code]), pic(c, cp, "y-as-consonant")],
    hints: [
      "Listen to the sound the y makes at the end.",
      "In fly, y says i. In baby, y says e.",
      `${cap(w)} ends with a different y sound.`,
    ],
    steps: [`${T} and ${k} end with the same y sound.`],
  };
}

// Spanish: [word, how its y sounds: V vowel i, C consonant].
const ES_SAY = { V: "como la vocal i", C: "como en yoyó", S: "no suena" };
const ES_HEAR: [string, "V" | "C"][] = [
  ["rey", "V"], ["hoy", "V"], ["muy", "V"], ["ley", "V"], ["voy", "V"], ["soy", "V"], ["buey", "V"], ["estoy", "V"],
  ["yoyó", "C"], ["yate", "C"], ["yema", "C"], ["playa", "C"], ["mayo", "C"], ["payaso", "C"], ["rayo", "C"], ["yogur", "C"],
];
function esHearQ([w, kind]: [string, "V" | "C"]): Q {
  const other = kind === "V" ? "C" : "V";
  return {
    prompt: `¿Cómo suena la y en ${w}?`,
    say: `${cap(w)}. ¿Cómo suena la y?`,
    choices: [
      voiced(ES_SAY[kind], ES_SAY[kind]),
      voiced(ES_SAY[other], ES_SAY[other], kind === "V" ? "y-as-consonant" : "y-as-vowel"),
      voiced(ES_SAY.S, ES_SAY.S, "y-as-silent"),
    ],
    hints: [
      "Di la palabra despacio.",
      "Al final de la palabra, la y suena como la vocal i. Antes de una vocal, como en yoyó.",
      kind === "V" ? `En ${w}, la y está al final.` : `En ${w}, después de la y viene una vocal.`,
    ],
    steps: [`En ${w}, la y suena ${ES_SAY[kind]}.`],
  };
}

// Level 2 (reading). English: the word is shown, not spoken; which sound does its y make? Spanish:
// the word is spoken; which spelling is right (rey, not rei; reina, not reyna).
const EN_KINDS = { i: "i, as in my", e: "e, as in me", y: "y, as in yes" };
const EN_TAG = { i: "long-i", e: "long-e", y: "consonant" };
const EN_READ: [string, "i" | "e" | "y"][] = [
  ["by", "i"], ["my", "i"], ["why", "i"], ["shy", "i"], ["try", "i"], ["dry", "i"], ["sky", "i"], ["happy", "e"],
  ["funny", "e"], ["silly", "e"], ["sunny", "e"], ["windy", "e"], ["lucky", "e"], ["tiny", "e"], ["yes", "y"], ["yard", "y"],
];
function enReadQ([w, kind]: [string, "i" | "e" | "y"]): Q {
  const others = (["i", "e", "y"] as const).filter((k) => k !== kind);
  return {
    prompt: `What sound does the y make in ${w}?`,
    say: "Read the word. What sound does its y make?",
    choices: [voiced(EN_KINDS[kind], EN_KINDS[kind]), ...others.map((k) => voiced(EN_KINDS[k], EN_KINDS[k], `${EN_TAG[kind]}-as-${EN_TAG[k]}`))],
    hints: [
      "Look at where the y is.",
      "Start: y as in yes. End of a short word: i. End of a longer word: e.",
      kind === "y" ? `In ${w}, y comes first.` : `In ${w}, y ends a ${kind === "i" ? "one-syllable" : "longer"} word.`,
    ],
    steps: [`The y in ${w} says ${EN_KINDS[kind]}.`],
  };
}

/** [word, wrong spellings as "word:CODE"]; I i for y, J y for i, L ll for y, D a letter dropped, E the silent h dropped. */
const ES_READ: [string, string][] = [
  ["rey", "rei:I re:D"], ["hoy", "hoi:I oy:E"], ["muy", "mui:I mu:D"], ["ley", "lei:I le:D"], ["buey", "buei:I bue:D"], ["voy", "voi:I vo:D"],
  ["estoy", "estoi:I esto:D"], ["soy", "soi:I so:D"], ["reina", "reyna:J rena:D"], ["aire", "ayre:J are:D"], ["oigo", "oygo:J ogo:D"], ["playa", "plaia:I plalla:L"],
  ["payaso", "paiaso:I pallaso:L"], ["rayo", "raio:I rallo:L"], ["mayo", "maio:I mallo:L"], ["doy", "doi:I do:D"],
];
const ES_TAG: Record<string, string> = { I: "i-for-y", J: "y-for-i", L: "ll-for-y", D: "dropped-letter", E: "dropped-silent-letter" };
function esReadQ([w, spec]: [string, string]): Q {
  const wrong = spec.split(" ").map((s) => s.split(":"));
  const where = /y$/.test(w)
    ? `${cap(w)} termina con el sonido de i.`
    : w.includes("y")
      ? `En ${w}, después de la y viene una vocal: suena como en yoyó.`
      : `En ${w}, el sonido de i está dentro de la palabra.`;
  return {
    prompt: "¿Cuál está bien escrita?",
    say: `${cap(w)}. ¿Cuál está bien escrita?`,
    choices: [word(w), ...wrong.map(([label, code]) => word(label, ES_TAG[code]))],
    hints: [
      "Todas suenan casi igual. Mira la i y la y.",
      "El sonido de i al final se escribe y: rey. Dentro, se escribe i: reina.",
      where,
    ],
    steps: [`Se escribe ${w}.`],
  };
}

export const Y_VOWEL: Entry[][] = [
  EN_HEAR.map((d, i) => ({ en: enHearQ(d), es: esHearQ(ES_HEAR[i]) })),
  EN_READ.map((d, i) => ({ en: enReadQ(d), es: esReadQ(ES_READ[i]) })),
];
