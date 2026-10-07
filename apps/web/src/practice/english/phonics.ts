import type { Skill } from "../types";
import { BLEND_ONSET, SEGMENT_SOUNDS, SOUND_SWAP } from "./phonics/blend";
import type { Entry } from "./phonics/core";
import { skill } from "./phonics/core";
import { FINAL_SOUND, FIRST_SOUND, LETTER_NAMES } from "./phonics/letters";
import { SIGHT_GRADE1, SIGHT_GRADE2, SIGHT_PREPRIMER, SIGHT_PRIMER } from "./phonics/sight";
import { MIDDLE_VOWEL, WORD_FAMILIES } from "./phonics/sounds";

// K–2 phonics in teaching order: letters, sounds heard in words, blending and swapping, then reading
// patterns. A pre-reader can do every listening level by hearing the read-aloud line and looking at the
// pictures; reading starts only where reading is the skill. The Spanish side of each id teaches the
// matching Spanish skill (vocales, sílabas, ch / ll / rr, h muda, qu / gu / gü…). Banks live in
// ./phonics/, one file per group of skills.

export type { Entry, Q } from "./phonics/core";

/** Every bank, by skill id and level (index 0 = level 1). Exported for the content tests. */
export const PHONICS_BANKS: Record<string, Entry[][]> = {
  "e.letter.names": LETTER_NAMES,
  "e.first.sound": FIRST_SOUND,
  "e.final.sound": FINAL_SOUND,
  "e.middle.vowel": MIDDLE_VOWEL,
  "e.word.families": WORD_FAMILIES,
  "e.blend.onset": BLEND_ONSET,
  "e.sound.swap": SOUND_SWAP,
  "e.sight.preprimer": SIGHT_PREPRIMER,
  "e.sight.primer": SIGHT_PRIMER,
  "e.segment.sounds": SEGMENT_SOUNDS,
  "e.sight.grade1": SIGHT_GRADE1,
  "e.sight.grade2": SIGHT_GRADE2,
};

const bank = (id: string) => PHONICS_BANKS[id];

export const ENGLISH_PHONICS: Skill[] = [
  // Kindergarten
  skill({ id: "e.letter.names", grade: "K", title: { en: "Letter names", es: "Nombres de las letras" }, standard: "RF.K.1d", prereqs: [] }, bank("e.letter.names"), [6, 6]),
  skill({ id: "e.first.sound", grade: "K", title: { en: "First sounds", es: "Sonido inicial" }, standard: "RF.K.2d", prereqs: [] }, bank("e.first.sound"), [10]),
  skill({ id: "e.final.sound", grade: "K", title: { en: "Last sounds", es: "Sonido final" }, standard: "RF.K.2d", prereqs: ["e.first.sound"] }, bank("e.final.sound"), [10]),
  skill({ id: "e.middle.vowel", grade: "K", title: { en: "Middle vowel sounds", es: "Las vocales" }, standard: "RF.K.2d", prereqs: ["e.final.sound"] }, bank("e.middle.vowel"), [10, 8]),
  skill({ id: "e.word.families", grade: "K", title: { en: "Word families", es: "Familias de palabras" }, standard: "RF.K.2a", prereqs: ["e.rhyme"] }, bank("e.word.families"), [12, 12]),
  skill({ id: "e.blend.onset", grade: "K", title: { en: "Blend a word", es: "Juntar sílabas" }, standard: "RF.K.2c", prereqs: ["e.word.families"] }, bank("e.blend.onset"), [12, 10]),
  skill({ id: "e.sound.swap", grade: "K", title: { en: "Change a sound", es: "Cambiar un sonido" }, standard: "RF.K.2e", prereqs: ["e.blend.onset"] }, bank("e.sound.swap"), [15, 12]),
  skill({ id: "e.sight.preprimer", grade: "K", title: { en: "Sight words: pre-primer", es: "Palabras frecuentes 1" }, standard: "RF.K.3c", prereqs: ["e.sight.words"] }, bank("e.sight.preprimer"), [6, 15]),
  skill({ id: "e.sight.primer", grade: "K", title: { en: "Sight words: primer", es: "Palabras frecuentes 2" }, standard: "RF.K.3c", prereqs: ["e.sight.preprimer"] }, bank("e.sight.primer"), [6, 15]),
  // Grade 1
  skill({ id: "e.segment.sounds", grade: "1", title: { en: "Count the sounds", es: "Contar los sonidos" }, standard: "RF.1.2d", prereqs: ["e.sound.swap"] }, bank("e.segment.sounds"), [12]),
  skill({ id: "e.sight.grade1", grade: "1", title: { en: "Sight words: grade 1", es: "Palabras frecuentes 3" }, standard: "RF.1.3g", prereqs: ["e.sight.primer"] }, bank("e.sight.grade1"), [6, 15]),
  // Grade 2
  skill({ id: "e.sight.grade2", grade: "2", title: { en: "Sight words: grade 2", es: "Palabras frecuentes 4" }, standard: "RF.2.3f", prereqs: ["e.sight.grade1"] }, bank("e.sight.grade2"), [6, 15]),
];
