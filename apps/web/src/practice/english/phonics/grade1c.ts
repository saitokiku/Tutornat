import type { Entry } from "./core";
import { gapQ, readQ, sentenceQ, SPELLED } from "./read";

// Grade 1 reading, part 3: silent e and vowel teams. Spanish: la h muda (the silent letter of Spanish)
// and diptongos (ue, ie, ua, ia, io). Codes: E a silent letter dropped, A a silent letter added,
// J a j written for the silent h, Y a spelling that sounds the same, T another vowel team,
// D a letter dropped, X two letters swapped, V another vowel, C another consonant.

type Read = [string, string, string];
type Fit = [string, string, string];
type Gap = [string, string, string, string, string];

// ---- e.silent.e: a_e, i_e, o_e, u_e | la h muda ----
// Level 1. English: the picture's word against the same word with or without a silent e. Spanish:
// spelling, since "elado" sounds just like "helado".
const EN_SE_READ: Read[] = [
  ["kite", "🪁", "kit:E bite:C"], ["pine", "🌲", "pin:E pane:V"], ["pin", "📌", "pine:A pan:V"], ["cube", "🧊", "cub:E cute:C"],
  ["can", "🥫", "cane:A cap:C"], ["note", "🎵", "not:E nose:C"], ["plane", "✈️", "plan:E plate:C"], ["globe", "🌐", "glob:E lobe:D"],
  ["tube", "🧪", "tub:E tune:C"], ["tub", "🛁", "tube:A tab:V"], ["bone", "🦴", "bon:E cone:C"], ["rose", "🌹", "ros:E nose:C"],
  ["cake", "🎂", "cak:E bake:C"], ["five", "5️⃣", "fiv:E dive:C"], ["nine", "9️⃣", "nin:E line:C"], ["game", "🎮", "gam:E gate:C"],
];
const ES_SE_READ: Read[] = [
  ["helado", "🍦", "elado:E jelado:J"], ["huevo", "🥚", "uevo:E güevo:Y"], ["hoja", "🍃", "oja:E joja:J"], ["hormiga", "🐜", "ormiga:E jormiga:J"],
  ["hilo", "🧵", "ilo:E jilo:J"], ["hueso", "🦴", "ueso:E güeso:Y"], ["hongo", "🍄", "ongo:E jongo:J"], ["hielo", "🧊", "ielo:E yelo:Y"],
  ["hacha", "🪓", "acha:E jacha:J"], ["hada", "🧚", "ada:E jada:J"], ["helicóptero", "🚁", "elicóptero:E jelicóptero:J"], ["hipopótamo", "🦛", "ipopótamo:E jipopótamo:J"],
  ["hamburguesa", "🍔", "amburguesa:E jamburguesa:J"], ["hospital", "🏥", "ospital:E jospital:J"], ["hotel", "🏨", "otel:E jotel:J"], ["búho", "🦉", "búo:E bujo:J"],
];
// Level 2: a sentence; only one spelling fits. English pairs a word with its silent-e partner; Spanish
// pairs words that sound alike with and without h (ola, hola; hay, ay, ahí; echa, hecha; asta, hasta).
const EN_SE_FIT: Fit[] = [
  ["We ___ bikes to school.", "ride", "rid:E red:V"], ["My dog likes to ___ my shoes.", "bite", "bit:E but:V"], ["I ___ that you can come.", "hope", "hop:E hip:V"],
  ["The ___ is in the sky.", "plane", "plan:E plate:C"], ["An ice ___ is cold.", "cube", "cub:E cute:C"], ["The baby bear is a ___.", "cub", "cube:A cab:V"],
  ["I wear a ___ on my head.", "cap", "cape:A cup:V"], ["We hiked past a tall ___ tree.", "pine", "pin:E pan:V"], ["Use a ___ to hold the paper.", "pin", "pine:A pan:V"],
  ["I ___ the cake into slices.", "cut", "cute:A cat:V"], ["The puppy is so ___.", "cute", "cut:E cube:C"], ["Write a ___ to Grandma.", "note", "not:E net:V"],
  ["Yesterday we ___ to the lake.", "rode", "rod:E red:V"], ["Use ___ to close the box.", "tape", "tap:E top:V"], ["The water comes out of the ___.", "tap", "tape:A tab:C"],
  ["An elephant is ___.", "huge", "hug:E hog:V"],
];
const ES_SE_FIT: Fit[] = [
  ["Mira la ___ del mar.", "ola", "hola:A ala:V"], ["___, ¿cómo estás?", "Hola", "Ola:E Hora:C"], ["___ un gato en el patio.", "Hay", "Ay:E Ahí:Y"],
  ["___, me duele el pie.", "Ay", "Hay:A Ahí:Y"], ["Tu mochila está ___.", "ahí", "hay:Y ay:Y"], ["Mi mamá ___ la basura al bote.", "echa", "hecha:A echo:V"],
  ["La tarea ya está ___.", "hecha", "echa:E hecho:V"], ["Voy a ___ la tarea.", "hacer", "acer:E haser:Y"], ["Hoy ___ mucho calor.", "hace", "ace:E hase:Y"],
  ["Caminamos ___ el parque.", "hasta", "asta:E basta:C"], ["La bandera está en el ___.", "asta", "hasta:A esta:V"], ["Me gusta el ___ del pan.", "olor", "holor:A olar:V"],
  ["Mi ___ tiene cinco años.", "hermano", "ermano:E jermano:J"], ["Tengo mucha ___.", "hambre", "ambre:E jambre:J"], ["Abre los ___.", "ojos", "hojos:A ajos:V"],
  ["Tomo un vaso de ___.", "agua", "hagua:A aguas:M"],
];

export const SILENT_E: Entry[][] = [
  EN_SE_READ.map(([w, p, s], i) => ({
    en: readQ("en", w, p, s, ["A silent e makes the vowel say its name.", ""]),
    es: readQ("es", ES_SE_READ[i][0], ES_SE_READ[i][1], ES_SE_READ[i][2], ["", "La h no suena, pero se escribe."], SPELLED),
  })),
  EN_SE_FIT.map(([s, k, spec], i) => ({
    en: sentenceQ("en", s, k, spec, ["Silent e changes the vowel: hop, hope.", ""]),
    es: sentenceQ("es", ES_SE_FIT[i][0], ES_SE_FIT[i][1], ES_SE_FIT[i][2], ["", "Suenan igual, pero con h o sin h dicen cosas distintas."]),
  })),
];

// ---- e.vowel.teams: ai ay ee ea oa ow | diptongos ue ie ua ia io ----
const EN_VT_GAP: Gap[] = [
  ["rain", "🌧️", "r___n", "ai", "ay:T a:D ee:T"], ["snail", "🐌", "sn___l", "ai", "ay:T a:D ee:T"], ["train", "🚆", "tr___n", "ai", "ay:T a:D oa:T"],
  ["crayon", "🖍️", "cr___on", "ay", "ai:T a:D ee:T"], ["bee", "🐝", "b___", "ee", "ea:T e:D ay:T"], ["tree", "🌳", "tr___", "ee", "ea:T e:D ai:T"],
  ["feet", "🦶", "f___t", "ee", "ea:T e:D oa:T"], ["sheep", "🐑", "sh___p", "ee", "ea:T e:D ai:T"], ["leaf", "🍃", "l___f", "ea", "ee:T e:D ai:T"],
  ["seal", "🦭", "s___l", "ea", "ee:T e:D oa:T"], ["peach", "🍑", "p___ch", "ea", "ee:T e:D oa:T"], ["boat", "⛵", "b___t", "oa", "ow:T o:D ai:T"],
  ["goat", "🐐", "g___t", "oa", "ow:T o:D ee:T"], ["soap", "🧼", "s___p", "oa", "ow:T o:D ea:T"], ["snow", "❄️", "sn___", "ow", "oa:T o:D ee:T"],
  ["bowl", "🥣", "b___l", "ow", "oa:T o:D ee:T"],
];
const ES_VT_GAP: Gap[] = [
  ["puerta", "🚪", "p___rta", "ue", "eu:X e:D ua:T"], ["fuego", "🔥", "f___go", "ue", "eu:X e:D ui:T"], ["huevo", "🥚", "h___vo", "ue", "eu:X e:D ua:T"],
  ["hueso", "🦴", "h___so", "ue", "eu:X e:D ua:T"], ["nuez", "🌰", "n___z", "ue", "eu:X e:D ie:T"], ["tierra", "🌍", "t___rra", "ie", "ei:X e:D ue:T"],
  ["diente", "🦷", "d___nte", "ie", "ei:X e:D ue:T"], ["pie", "🦶", "p___", "ie", "ei:X e:D ia:T"], ["nieve", "❄️", "n___ve", "ie", "ei:X e:D ue:T"],
  ["siete", "7️⃣", "s___te", "ie", "ei:X e:D ue:T"], ["agua", "💧", "ag___", "ua", "au:X a:D ue:T"], ["guante", "🧤", "g___nte", "ua", "au:X a:D ue:T"],
  ["cuatro", "4️⃣", "c___tro", "ua", "au:X a:D ue:T"], ["paraguas", "☂️", "parag___s", "ua", "au:X a:D ue:T"], ["piano", "🎹", "p___no", "ia", "ai:X a:D io:T"],
  ["radio", "📻", "rad___", "io", "oi:X o:D ia:T"],
];
const EN_VT_READ: Read[] = [
  ["rain", "🌧️", "ran:D rail:C"], ["train", "🚆", "tran:D trail:C"], ["snail", "🐌", "snal:D sail:D"], ["tree", "🌳", "tre:D free:C"],
  ["sheep", "🐑", "shep:D ship:V"], ["feet", "🦶", "fet:D foot:V"], ["bee", "🐝", "be:D bay:T"], ["leaf", "🍃", "lef:D loaf:T"],
  ["seal", "🦭", "sel:D sail:T"], ["peach", "🍑", "pech:D pouch:T"], ["boat", "⛵", "bot:D beat:T"], ["goat", "🐐", "got:D gait:T"],
  ["soap", "🧼", "sop:D seep:T"], ["snow", "❄️", "sno:D show:C"], ["bowl", "🥣", "bol:D boil:T"], ["road", "🛣️", "rod:D read:T"],
];
const ES_VT_READ: Read[] = [
  ["puerta", "🚪", "perta:D peurta:X"], ["fuego", "🔥", "fego:D feugo:X"], ["huevo", "🥚", "hevo:D heuvo:X"], ["nieve", "❄️", "neve:D neive:X"],
  ["diente", "🦷", "dente:D deinte:X"], ["tierra", "🌍", "terra:D teirra:X"], ["pie", "🦶", "pe:D pei:X"], ["siete", "7️⃣", "sete:D seite:X"],
  ["agua", "💧", "aga:D auga:X"], ["guante", "🧤", "gante:D gaunte:X"], ["cuatro", "4️⃣", "catro:D cautro:X"], ["piano", "🎹", "pano:D paino:X"],
  ["radio", "📻", "rado:D radoi:X"], ["hueso", "🦴", "heso:D heuso:X"], ["nuez", "🌰", "nez:D neuz:X"], ["paraguas", "☂️", "paragas:D paragaus:X"],
];

const VT_GAP: [string, string] = ["Two vowels can team up to make one sound.", "Dos vocales juntas se dicen en un solo golpe de voz."];
const VT_READ: [string, string] = ["Look for two vowels side by side.", "Busca dos vocales juntas."];
export const VOWEL_TEAMS: Entry[][] = [
  EN_VT_GAP.map(([w, p, sh, k, s], i) => {
    const e = ES_VT_GAP[i];
    return { en: gapQ("en", w, p, sh, k, s, VT_GAP), es: gapQ("es", e[0], e[1], e[2], e[3], e[4], VT_GAP) };
  }),
  EN_VT_READ.map(([w, p, s], i) => ({ en: readQ("en", w, p, s, VT_READ), es: readQ("es", ES_VT_READ[i][0], ES_VT_READ[i][1], ES_VT_READ[i][2], VT_READ) })),
];
