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
  E: "dropped-silent-e",
  A: "added-silent-e",
  T: "wrong-team",
  R: "wrong-r-vowel",
  K: "hard-for-soft",
  F: "soft-for-hard",
  U: "missing-silent-letter",
  H: "missing-h",
  M: "wrong-ending",
  G: "missing-accent",
  Z: "split-wrong",
};

/** "chip:P sip:S" → choices with tags. */
export const wrongs = (spec: string) =>
  spec.split(" ").map((s) => {
    const [label, code] = s.split(":");
    if (!TAGS[code]) throw new Error(`Unknown tag code in "${s}"`);
    return word(label, TAGS[code]);
  });

/** What hint 3 says about the first wrong choice, by its tag. */
const MISS: Record<string, [string, string]> = {
  "dropped-letter": ["is missing a sound.", "le falta un sonido."],
  "single-letter": ["uses one letter where two belong.", "usa una letra donde van dos."],
  "wrong-digraph": ["uses a different letter pair.", "usa otro par de letras."],
  "wrong-blend": ["has a different blend of letters.", "tiene otra mezcla de consonantes."],
  "swapped-letters": ["has two letters swapped.", "tiene dos letras cambiadas de lugar."],
  "wrong-vowel": ["has a different vowel.", "tiene otra vocal."],
  "wrong-consonant": ["has a different consonant.", "tiene otra consonante."],
  "sound-alike-spelling": ["sounds right, but is not spelled that way.", "suena igual, pero no se escribe así."],
  "dropped-silent-e": ["has no silent e, so the vowel is short.", "no lleva la letra que no suena."],
  "added-silent-e": ["has a silent e, so the vowel is long.", "lleva una letra de más."],
  "wrong-team": ["uses a different vowel team.", "usa otro par de vocales."],
  "wrong-r-vowel": ["has a different vowel before the r.", "tiene otra r."],
  "hard-for-soft": ["has a hard sound where a soft one belongs.", "tiene el sonido fuerte donde va el suave."],
  "soft-for-hard": ["has a soft sound where a hard one belongs.", "tiene el sonido suave donde va el fuerte."],
  "missing-silent-letter": ["is missing a letter you do not hear.", "le falta una letra que no se oye."],
  "missing-h": ["is missing a letter you do not hear.", "le falta la h, que no suena."],
  "wrong-ending": ["has a different ending.", "tiene otra terminación."],
  "missing-accent": ["is missing its accent mark.", "no lleva la tilde que necesita."],
  "split-wrong": ["is split in the wrong place.", "está separada en un lugar equivocado."],
};
export const missHint = (locale: Locale, label: string, why: string) => {
  const [en, es] = MISS[why];
  return tr(locale, `${cap(label)} ${en}`, `${cap(label)} ${es}`);
};

/** Picture shown, written words to choose from: "Which word names the picture?" */
export function readQ(locale: Locale, w: string, picture: string, spec: string, strategy: [string, string]): Q {
  const others = wrongs(spec);
  return {
    prompt: tr(locale, "Which word names the picture?", "¿Qué palabra va con el dibujo?"),
    say: tr(locale, "Read each word. Which one names the picture?", "Lee cada palabra. ¿Cuál va con el dibujo?"),
    picture,
    alt: altFor(locale, w),
    choices: [word(w), ...others],
    hints: [tr(locale, "Say the picture's name slowly.", "Di despacio el nombre del dibujo."), tr(locale, ...strategy), missHint(locale, others[0].label, others[0].why!)],
    steps: [tr(locale, `${cap(w)} names the picture.`, `${cap(w)} va con el dibujo.`)],
  };
}

/**
 * Picture shown and the word with a gap ("___ip"); written letter choices fill it. `shown` has ___ where
 * `key` goes. The spoken line says the whole word.
 */
export function gapQ(locale: Locale, w: string, picture: string, shown: string, key: string, spec: string, strategy: [string, string], unit: "letters" | "syllable" = "letters"): Q {
  const others = wrongs(spec);
  const ask = unit === "letters" ? tr(locale, "Which letters are missing?", "¿Qué letras faltan?") : tr(locale, "Which part is missing?", "¿Qué sílaba falta?");
  return {
    prompt: `${ask} ${shown}`,
    say: `${cap(w)}. ${ask}`,
    picture,
    alt: altFor(locale, w),
    choices: [word(key), ...others],
    hints: [
      tr(locale, "Say the word slowly.", "Di la palabra despacio."),
      tr(locale, ...strategy),
      tr(locale, `With ${others[0].label}, it would say ${shown.replace("___", others[0].label)}.`, `Con ${others[0].label} diría ${shown.replace("___", others[0].label)}.`),
    ],
    steps: [tr(locale, `The missing part is ${key}: ${w}.`, `Falta ${key}: ${w}.`)],
  };
}
