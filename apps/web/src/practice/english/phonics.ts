import type { Skill } from "../types";
import { BLEND_ONSET, SEGMENT_SOUNDS, SOUND_SWAP } from "./phonics/blend";
import type { Entry } from "./phonics/core";
import { skill } from "./phonics/core";
import { ENDING_ED, ENDING_ING } from "./phonics/endings";
import { SHORT_VOWELS } from "./phonics/grade1a";
import { BLENDS_FINAL, BLENDS_INITIAL, DIGRAPHS } from "./phonics/grade1b";
import { SILENT_E, VOWEL_TEAMS } from "./phonics/grade1c";
import { DIPHTHONGS, R_CONTROLLED, SILENT_LETTERS, SOFT_C_G } from "./phonics/grade2a";
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
  "e.short.vowels": SHORT_VOWELS,
  "e.digraphs": DIGRAPHS,
  "e.blends.initial": BLENDS_INITIAL,
  "e.blends.final": BLENDS_FINAL,
  "e.silent.e": SILENT_E,
  "e.vowel.teams": VOWEL_TEAMS,
  "e.ending.ed": ENDING_ED,
  "e.ending.ing": ENDING_ING,
  "e.sight.grade1": SIGHT_GRADE1,
  "e.r.controlled": R_CONTROLLED,
  "e.diphthongs": DIPHTHONGS,
  "e.soft.c.g": SOFT_C_G,
  "e.silent.letters": SILENT_LETTERS,
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
  skill({ id: "e.short.vowels", grade: "1", title: { en: "Short vowel words", es: "Sílabas directas" }, standard: "RF.1.3b", prereqs: ["e.cvc.words", "e.middle.vowel"] }, bank("e.short.vowels"), [10, 8]),
  skill({ id: "e.digraphs", grade: "1", title: { en: "Letter pairs: sh, ch, th", es: "Pares de letras: ch, ll, rr" }, standard: "RF.1.3a", prereqs: ["e.short.vowels"] }, bank("e.digraphs"), [10, 12]),
  skill({ id: "e.blends.initial", grade: "1", title: { en: "Blends at the start", es: "Sílabas trabadas" }, standard: "RF.1.2b", prereqs: ["e.short.vowels"] }, bank("e.blends.initial"), [10, 12]),
  skill({ id: "e.blends.final", grade: "1", title: { en: "Blends at the end", es: "Sílabas inversas" }, standard: "RF.1.3b", prereqs: ["e.blends.initial"] }, bank("e.blends.final"), [10, 12]),
  skill({ id: "e.silent.e", grade: "1", title: { en: "Silent e", es: "La h muda" }, standard: "RF.1.3c", prereqs: ["e.short.vowels"] }, bank("e.silent.e"), [10, 15]),
  skill({ id: "e.vowel.teams", grade: "1", title: { en: "Vowel teams", es: "Diptongos" }, standard: "RF.1.3c", prereqs: ["e.silent.e"] }, bank("e.vowel.teams"), [10, 10]),
  skill({ id: "e.ending.ed", grade: "1", title: { en: "Endings: -ed", es: "Terminaciones: -ado, -ido" }, standard: "RF.1.3f", prereqs: ["e.short.vowels"] }, bank("e.ending.ed"), [10, 12]),
  skill({ id: "e.ending.ing", grade: "1", title: { en: "Endings: -ing", es: "Terminaciones: -ando, -iendo" }, standard: "RF.1.3f", prereqs: ["e.ending.ed"] }, bank("e.ending.ing"), [10, 12]),
  skill({ id: "e.sight.grade1", grade: "1", title: { en: "Sight words: grade 1", es: "Palabras frecuentes 3" }, standard: "RF.1.3g", prereqs: ["e.sight.primer"] }, bank("e.sight.grade1"), [6, 15]),
  // Grade 2
  skill({ id: "e.r.controlled", grade: "2", title: { en: "Vowels with r", es: "La r suave y la r fuerte" }, standard: "RF.2.3", prereqs: ["e.vowel.teams"] }, bank("e.r.controlled"), [10, 12]),
  skill({ id: "e.diphthongs", grade: "2", title: { en: "Diphthongs: oi, oy, ou, ow", es: "Diptongos con i y con y" }, standard: "RF.2.3b", prereqs: ["e.vowel.teams"] }, bank("e.diphthongs"), [10, 10]),
  skill({ id: "e.soft.c.g", grade: "2", title: { en: "Soft c and soft g", es: "La c y la g con e, i" }, standard: "RF.2.3e", prereqs: ["e.short.vowels"] }, bank("e.soft.c.g"), [12, 10]),
  skill({ id: "e.silent.letters", grade: "2", title: { en: "Silent letters", es: "La u que no suena" }, standard: "RF.2.3e", prereqs: ["e.digraphs"] }, bank("e.silent.letters"), [10]),
  skill({ id: "e.sight.grade2", grade: "2", title: { en: "Sight words: grade 2", es: "Palabras frecuentes 4" }, standard: "RF.2.3f", prereqs: ["e.sight.grade1"] }, bank("e.sight.grade2"), [6, 15]),
];
