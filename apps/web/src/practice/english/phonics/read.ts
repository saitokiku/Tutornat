import type { Locale } from "@/lib/types";
import { tr } from "../../text";
import { altFor, cap, word, type Q } from "./core";

// Shared item shapes for the reading skills (grade 1 on). Choices here are written and never read aloud:
// decoding them is the skill. A wrong choice is written "label:CODE"; the code names the misconception.

export const TAGS: Record<string, string> = {
  D: "dropped-letter",
  S: "single-letter",
  P: "wrong-digraph",
  B: "wrong-blend",
  X: "swapped-letters",
  V: "wrong-vowel",
  C: "wrong-consonant",
  Y: "sound-alike-spelling",
  E: "dropped-silent-letter",
  A: "added-silent-letter",
  J: "h-as-j",
  T: "wrong-team",
  R: "wrong-r-vowel",
  K: "hard-for-soft",
  F: "soft-for-hard",
  M: "wrong-ending",
  W: "doubled-letter",
  N: "missing-dieresis",
  O: "added-dieresis",
  q: "k-sound-for-s",
  s: "s-sound-for-k",
  g: "g-sound-for-j",
  j: "j-sound-for-g",
  G: "missing-accent",
  Z: "split-wrong",
};

/** "chip:P sip:S" → choices with tags. A trailing ~ ("rr:W~") marks a fill that sounds the same as the key. */
export const wrongs = (spec: string) =>
  spec.split(" ").map((s) => {
    const [label, code] = s.replace(/~$/, "").split(":");
    if (!TAGS[code]) throw new Error(`Unknown tag code in "${s}"`);
    return word(label, TAGS[code]);
  });

/** What hint 3 says about the first wrong choice, by its tag. */
const MISS: Record<string, [string, string]> = {
  "dropped-letter": ["is missing a letter.", "A {w} le falta una letra."],
  "single-letter": ["uses one letter where two belong.", "usa una letra donde van dos."],
  "wrong-digraph": ["uses a different letter pair.", "usa otro par de letras."],
  "wrong-blend": ["has a different blend of letters.", "tiene otra mezcla de consonantes."],
  "swapped-letters": ["has two letters swapped.", "tiene dos letras cambiadas de lugar."],
  "wrong-vowel": ["has a different vowel.", "tiene otra vocal."],
  "wrong-consonant": ["has a different consonant.", "tiene otra consonante."],
  "sound-alike-spelling": ["sounds right, but is not spelled that way.", "suena igual, pero no se escribe así."],
  "dropped-silent-letter": ["is missing a letter you do not hear.", "A {w} le falta una letra que no suena."],
  "added-silent-letter": ["has an extra silent letter.", "lleva una letra muda de más."],
  "h-as-j": ["uses j where the silent h belongs.", "usa j, pero la h no suena."],
  "wrong-team": ["uses a different vowel team.", "usa otro par de vocales."],
  "wrong-r-vowel": ["has a different vowel before the r.", "tiene otra vocal antes de la r."],
  "hard-for-soft": ["has a hard sound where a soft one belongs.", "tiene el sonido fuerte donde va el suave."],
  "soft-for-hard": ["has a soft sound where a hard one belongs.", "tiene el sonido suave donde va el fuerte."],
  "wrong-ending": ["has a different ending.", "tiene otra terminación."],
  "doubled-letter": ["doubles a letter that should be single.", "tiene una letra doble que va sencilla."],
  "missing-dieresis": ["needs two dots over the u.", "necesita los dos puntos sobre la u."],
  "added-dieresis": ["has two dots it does not need.", "lleva diéresis, pero la u no suena."],
  "k-sound-for-s": ["would sound like k.", "sonaría como en casa."],
  "s-sound-for-k": ["would sound like s.", "sonaría como en sol."],
  "g-sound-for-j": ["would sound like the g in goat.", "sonaría como en gato."],
  "j-sound-for-g": ["would sound like j.", "sonaría como en jirafa."],
  "missing-accent": ["is missing its accent mark.", "no lleva la tilde que necesita."],
  "split-wrong": ["is split in the wrong place.", "está separada en un lugar equivocado."],
};
/** Hint 3 about a wrong choice. A Spanish text with {w} places the word itself ("A pato le falta…"). */
export const missHint = (locale: Locale, label: string, why: string) => {
  const [en, es] = MISS[why];
  return tr(locale, `${cap(label)} ${en}`, es.includes("{w}") ? es.replace("{w}", label) : `${cap(label)} ${es}`);
};

/**
 * Asks for the correct spelling of the pictured word, when a misspelling would sound the same. It names the
 * picture, so a wrong choice that is another real word (to for two, pasa for pausa) is plainly wrong.
 */
export const SPELLED: [string, string] = ["Which word names the picture, spelled right?", "¿Cuál es el nombre del dibujo, bien escrito?"];

/**
 * The screen-reader text for a picture whose name is the answer. Naming it would read the key aloud, so it
 * says only what the picture is for.
 */
export const NAME_IT_ALT: [string, string] = ["A picture to name", "Un dibujo para nombrar"];

/** Picture shown, written words to choose from: "Which word names the picture?" (or `ask`). */
export function readQ(locale: Locale, w: string, picture: string, spec: string, strategy: [string, string], ask?: [string, string]): Q {
  const others = wrongs(spec);
  const question = ask ? tr(locale, ...ask) : tr(locale, "Which word names the picture?", "¿Qué palabra va con el dibujo?");
  return {
    prompt: question,
    say: ask ? `${tr(locale, "Read each word.", "Lee cada palabra.")} ${question}` : tr(locale, "Read each word. Which one names the picture?", "Lee cada palabra. ¿Cuál va con el dibujo?"),
    picture,
    alt: tr(locale, ...NAME_IT_ALT),
    choices: [word(w), ...others],
    hints: [tr(locale, "Say the picture's name slowly.", "Di despacio el nombre del dibujo."), tr(locale, ...strategy), missHint(locale, others[0].label, others[0].why!)],
    steps: [tr(locale, `${cap(w)} names the picture.`, `${cap(w)} va con el dibujo.`)],
  };
}

/**
 * Picture shown and the word with a gap ("___ip"); written letter choices fill it. `shown` has ___ where
 * `key` goes. The spoken line says the whole word. When a wrong fill sounds the same as the key (a "Y"
 * spelling, or one marked "~"), hearing the word cannot decide, so the item asks for the right spelling
 * and hint 3 says that fill sounds the same; otherwise hint 3 says what the first wrong fill would sound like.
 */
export function gapQ(locale: Locale, w: string, picture: string, shown: string, key: string, spec: string, strategy: [string, string]): Q {
  const others = wrongs(spec);
  const same = spec.split(" ").map((s) => /:Y$|~$/.test(s));
  const ask = same.includes(true) ? tr(locale, "Which letters spell it right?", "¿Con qué letras se escribe bien?") : tr(locale, "Which letters are missing?", "¿Qué letras faltan?");
  const first = others[0].label;
  return {
    prompt: `${ask} ${shown}`,
    say: `${cap(w)}. ${ask}`,
    picture,
    alt: altFor(locale, w),
    choices: [word(key), ...others],
    hints: [
      tr(locale, "Say the word slowly.", "Di la palabra despacio."),
      tr(locale, ...strategy),
      same[0]
        ? tr(locale, `With ${first}, it sounds the same but is spelled wrong.`, `Con ${first} suena igual, pero está mal escrita.`)
        : tr(locale, `With ${first}, it would say ${shown.replace("___", first)}.`, `Con ${first} diría ${shown.replace("___", first)}.`),
    ],
    steps: [tr(locale, `The missing part is ${key}: ${w}.`, `Falta ${key}: ${w}.`)],
  };
}

/** A sentence with ___, read aloud with a pause; written choices, only one fits. */
export function sentenceQ(locale: Locale, s: string, key: string, spec: string, strategy: [string, string]): Q {
  const others = wrongs(spec);
  const fill = (x: string) => s.replace("___", x);
  return {
    prompt: s,
    say: `${s.replace("___", "…")} ${tr(locale, "Which word fits?", "¿Qué palabra va?")}`,
    choices: [word(key), ...others],
    hints: [
      tr(locale, "Read the sentence with each word.", "Lee la oración con cada palabra."),
      tr(locale, ...strategy),
      tr(locale, `“${fill(others[0].label)}” does not make sense.`, `“${fill(others[0].label)}” no está bien.`),
    ],
    steps: [fill(key)],
  };
}
