import type { Locale } from "@/lib/types";
import { tr } from "../../text";
import { word, type Entry, type Q } from "./core";

// Sight words in four bands. English follows the Dolch lists (pre-primer, primer, first grade, second
// grade). Spanish has no Dolch list: its four bands are common Spanish words from short function words
// (yo, mi, con) to longer ones (siempre, mientras, temprano), chosen by hand, not from a published list.
// Level 1: hear the word, find it among look-alikes (choices are not read aloud). Level 2: the sentence
// is read with a pause; only one look-alike makes sense in it. Words that sound alike (to/two, by/buy,
// tu/tú said aloud) are never offered together where hearing would decide. The written accent that tells
// tu from tú or se from sé is a grade 2–3 lesson, so the pre-primer band never offers that contrast.

/** A look-alike's tag, from how it differs from the word. */
export function lookTag(w: string, d: string): string {
  const plain = (s: string) => s.toLowerCase().normalize("NFD").replace(/ñ/g, "ñ").replace(/\p{Diacritic}/gu, "");
  const [a, b] = [plain(w), plain(d)];
  if (a === b) return "accent-mixup";
  if ([...a].reverse().join("") === b) return "reversed-letters";
  if ([...a].sort().join("") === [...b].sort().join("")) return "mixed-up-letters";
  if (a.slice(0, 2) === b.slice(0, 2)) return "same-start";
  return "look-alike-word";
}

/** [word, three look-alikes] */
type Look = [string, string, string, string];
/** [sentence with ___, key, three look-alikes that do not fit] */
type Fit = [string, string, string, string, string];

// The hints avoid every sight word in the banks (con, cada, tiene, does, first…), so a hint never shows
// a key.
function lookQ(locale: Locale, [w, ...others]: Look): Q {
  return {
    prompt: tr(locale, "Listen. Tap that word.", "Escucha y elige."),
    say: tr(locale, `Find the word: ${w}.`, `Busca la palabra: ${w}.`),
    choices: [word(w), ...others.map((d) => word(d, lookTag(w, d)))],
    hints: [
      tr(locale, "Listen to the word again. Say its starting sound.", "Escucha la palabra otra vez y di su primer sonido."),
      tr(locale, "Look at the start of each word.", "Mira las primeras letras."),
      tr(locale, `It starts with ${w[0]} and has ${w.length} letters.`, `Empieza por la ${w[0]} y lleva ${w.length} letras.`),
    ],
    steps: [tr(locale, `The word is ${w}: ${w.split("").join("-")}.`, `La palabra es ${w}: ${w.split("").join("-")}.`)],
  };
}

function fitQ(locale: Locale, [s, k, ...others]: Fit): Q {
  const fill = (x: string) => s.replace("___", x);
  return {
    prompt: s,
    say: `${s.replace("___", "…")} ${tr(locale, "Which word fits?", "¿Qué palabra va?")}`,
    choices: [word(k), ...others.map((d) => word(d, lookTag(k, d)))],
    hints: [
      tr(locale, "Read the sentence with each word.", "Lee la oración y prueba las palabras."),
      tr(locale, "Think about the meaning of the sentence.", "Piensa qué quiere decir la oración."),
      tr(locale, `“${fill(others[0])}” makes no sense.`, `“${fill(others[0])}” no quiere decir nada.`),
    ],
    steps: [fill(k)],
  };
}

// ---- e.sight.preprimer ----
const EN_PP_LOOK: Look[] = [
  ["away", "always", "way", "awake"], ["big", "bag", "dig", "pig"], ["blue", "blow", "glue", "blur"], ["down", "own", "town", "dawn"],
  ["find", "fine", "kind", "fond"], ["funny", "fun", "bunny", "sunny"], ["help", "hello", "held", "yelp"], ["jump", "just", "lump", "bump"],
  ["little", "litter", "lit", "title"], ["make", "made", "take", "mask"], ["not", "net", "nut", "ton"], ["three", "there", "tree", "throw"],
  ["where", "were", "here", "when"], ["yellow", "yell", "fellow", "hello"], ["run", "ran", "rub", "bun"], ["play", "plan", "pay", "clay"],
];
const ES_PP_LOOK: Look[] = [
  ["mamá", "mapa", "masa", "cama"], ["papá", "pala", "pato", "sapo"], ["yo", "ya", "lo", "ojo"], ["mi", "me", "ni", "si"],
  ["tu", "te", "su", "tos"], ["en", "el", "un", "es"], ["de", "del", "da", "te"], ["con", "son", "col", "cono"],
  ["sí", "se", "su", "sin"], ["una", "uno", "uña", "luna"], ["los", "sol", "las", "lo"], ["al", "la", "el", "ala"],
  ["es", "se", "ese", "en"], ["nos", "son", "no", "dos"], ["voy", "doy", "soy", "hoy"], ["le", "el", "la", "lo"],
];
const EN_PP_FIT: Fit[] = [
  ["Can you ___ me?", "help", "hello", "held", "hop"], ["The cat is ___.", "little", "title", "lift", "kettle"],
  ["I can ___ the ball.", "find", "fine", "kind", "fond"], ["We ___ to the park.", "go", "so", "no", "on"],
  ["Look at the ___ sky.", "blue", "glue", "blow", "blur"], ["The frog can ___ high.", "jump", "just", "lump", "bump"],
  ["I have ___ dog.", "one", "on", "own", "gone"], ["Where is my ___ hat?", "red", "rod", "rid", "bed"],
  ["I see ___ birds.", "three", "there", "tree", "throw"], ["Mom will ___ a cake.", "make", "made", "lake", "mile"],
  ["The ball went ___ the hill.", "down", "town", "dawn", "own"], ["___ is my cat?", "Where", "Were", "Wire", "Whale"],
  ["It is ___ hot today.", "not", "net", "nut", "ton"], ["We ran ___ from the bee.", "away", "always", "awake", "way"],
  ["My dog can ___ fast.", "run", "ran", "rug", "urn"], ["The sun is ___.", "yellow", "yell", "fellow", "hello"],
];
const ES_PP_FIT: Fit[] = [
  ["___ tengo un perro.", "Yo", "Lo", "Ojo", "Oso"], ["Mi gato ___ negro.", "es", "se", "en", "el"],
  ["Voy ___ mi abuela.", "con", "son", "col", "cono"], ["La casa ___ mi tía.", "de", "del", "te", "le"],
  ["Tengo ___ manzana roja.", "una", "uno", "uña", "luna"], ["Me gusta ___ sol.", "el", "le", "en", "al"],
  ["___ niños juegan.", "Los", "Sol", "Las", "Lo"], ["Vamos ___ parque.", "al", "la", "el", "ala"],
  ["Yo ___ a la escuela.", "voy", "doy", "soy", "hoy"], ["¿Quieres jugar? ___, quiero.", "Sí", "Se", "Su", "Sin"],
  ["Este es ___ libro.", "mi", "me", "ni", "si"], ["¿Dónde está ___ mochila?", "tu", "te", "tos", "ti"],
  ["Ellos ___ mis primos.", "son", "nos", "sol", "sin"], ["Mi perro ___ llama Toby.", "se", "es", "sol", "su"],
  ["No tengo ___ lápiz.", "un", "en", "uno", "una"], ["Mi mamá me ___ un beso.", "da", "de", "la", "dan"],
];

// ---- e.sight.primer ----
const EN_PR_LOOK: Look[] = [
  ["black", "block", "back", "lack"], ["brown", "crown", "brow", "blown"], ["came", "come", "cake", "game"], ["did", "dad", "bid", "kid"],
  ["good", "food", "goat", "gold"], ["into", "onto", "inch", "tint"], ["must", "most", "mist", "just"], ["now", "won", "new", "cow"],
  ["please", "place", "plate", "peas"], ["pretty", "petty", "party", "pity"], ["ride", "side", "rid", "red"], ["saw", "was", "sat", "raw"],
  ["soon", "moon", "son", "spoon"], ["under", "thunder", "order", "wonder"], ["want", "went", "wand", "what"], ["white", "while", "whale", "write"],
];
const ES_PR_LOOK: Look[] = [
  ["pero", "perro", "pera", "para"], ["para", "pera", "parar", "pala"], ["como", "coma", "cono", "comer"], ["todo", "toda", "lodo", "modo"],
  ["bien", "buen", "cien", "ven"], ["día", "dio", "tía", "mía"], ["fue", "fui", "que", "fuego"], ["dijo", "hijo", "dije", "dio"],
  ["aquí", "aquel", "así", "quise"], ["ahora", "hora", "ahorro", "aroma"], ["vamos", "vemos", "ramos", "vasos"], ["tiene", "tienen", "viene", "diente"],
  ["quiero", "quiere", "cuero", "quiso"], ["puedo", "puede", "pudo", "miedo"], ["grande", "granja", "grano", "gran"], ["niño", "niña", "nido", "mono"],
];
const EN_PR_FIT: Fit[] = [
  ["We ___ going home.", "are", "ear", "era", "arm"], ["I ___ lunch at noon.", "ate", "tea", "late", "gate"],
  ["Do you want to ___ my friend?", "be", "by", "bed", "he"], ["Dad got a ___ car.", "new", "now", "net", "few"],
  ["Let's go ___ to play.", "out", "our", "cut", "oat"], ["___ is my sister.", "She", "Shoe", "Shed", "See"],
  ["Look at ___ big truck.", "that", "than", "hat", "chat"], ["Is ___ a dog in the yard?", "there", "three", "where", "here"],
  ["My friends said ___ can come.", "they", "then", "them", "the"], ["I like ___ book.", "this", "thin", "these", "thus"],
  ["Can I come ___?", "too", "top", "toe", "tool"], ["She sings very ___.", "well", "wall", "will", "sell"],
  ["Yesterday we ___ to the zoo.", "went", "want", "wet", "tent"], ["___ is your name?", "What", "Wheat", "Want", "Wait"],
  ["___ is at the door?", "Who", "How", "Why", "Two"], ["We ___ go to the beach.", "will", "well", "wall", "mill"],
];
const ES_PR_FIT: Fit[] = [
  ["Quiero jugar, ___ está lloviendo.", "pero", "perro", "pera", "para"], ["Este regalo es ___ ti.", "para", "pera", "parar", "pala"],
  ["Corre ___ un conejo.", "como", "coma", "cono", "comer"], ["Me comí ___ el pastel.", "todo", "toda", "lodo", "modo"],
  ["Hoy me siento ___.", "bien", "buen", "cien", "ven"], ["Hoy es un ___ bonito.", "día", "dio", "tía", "mía"],
  ["Ayer ___ al parque con mi papá.", "fui", "que", "fuego", "fuente"], ["Mi mamá ___ que sí.", "dijo", "hijo", "dije", "dio"],
  ["Ven ___, por favor.", "aquí", "aquel", "quiso", "quise"], ["___ es hora de dormir.", "Ahora", "Hora", "Ahorro", "Aroma"],
  ["___ a la playa mañana.", "Vamos", "Vemos", "Ramos", "Vasos"], ["Mi hermano ___ seis años.", "tiene", "tienen", "viene", "diente"],
  ["Yo ___ un helado.", "quiero", "quiere", "cuero", "quiso"], ["Yo ___ saltar muy alto.", "puedo", "puede", "pudo", "miedo"],
  ["El elefante es muy ___.", "grande", "granja", "grano", "gran"], ["El ___ juega con su pelota.", "niño", "niña", "nido", "niños"],
];

// ---- e.sight.grade1 ----
const EN_G1_LOOK: Look[] = [
  ["any", "many", "an", "and"], ["ask", "ash", "task", "asks"], ["fly", "fry", "flu", "sly"], ["her", "here", "hen", "hero"],
  ["him", "hum", "hem", "ham"], ["just", "jest", "must", "gust"], ["know", "now", "knew", "snow"], ["let", "lot", "bet", "lit"],
  ["live", "love", "five", "lime"], ["may", "way", "my", "mat"], ["old", "odd", "cold", "sold"], ["open", "oven", "opal", "pen"],
  ["round", "sound", "around", "ground"], ["some", "same", "come", "sore"], ["thank", "think", "tank", "thick"], ["take", "bake", "talk", "tack"],
];
const ES_G1_LOOK: Look[] = [
  ["también", "tambor", "tampoco", "tiempo"], ["porque", "parque", "portón", "poquito"], ["siempre", "simple", "siete", "sobre"], ["después", "despacio", "desde", "deportes"],
  ["antes", "antena", "entre", "ante"], ["mucho", "mucha", "muchos", "ancho"], ["nunca", "nuca", "nube", "nuera"], ["otro", "otra", "oro", "toro"],
  ["mismo", "misma", "mimo", "mito"], ["entonces", "entonar", "entender", "entero"], ["hasta", "pasta", "basta", "hacha"], ["desde", "deseo", "sede", "verde"],
  ["cada", "nada", "cama", "capa"], ["dentro", "centro", "entro", "diente"], ["luego", "fuego", "juego", "lugar"], ["noche", "coche", "ocho", "leche"],
];
const EN_G1_FIT: Fit[] = [
  ["I ate ___ apple.", "an", "and", "on", "in"], ["Can I ___ you a question?", "ask", "ash", "task", "asks"],
  ["The book is ___ the door.", "by", "bay", "boy", "be"], ["Yesterday I ___ a cold.", "had", "has", "hand", "hat"],
  ["Sam ___ a new bike.", "has", "his", "hat", "gas"], ["Ben lost ___ hat.", "his", "hiss", "him", "hip"],
  ["First we eat, ___ we play.", "then", "than", "them", "ten"], ["Please ___ the door.", "open", "oven", "often", "opal"],
  ["A ball is ___ like a circle.", "round", "rain", "rang", "road"], ["Can I have ___ juice?", "some", "same", "come", "sore"],
  ["Please ___ your coat.", "take", "talk", "tale", "lake"], ["I want to ___ you for the gift.", "thank", "think", "tank", "thick"],
  ["Birds can ___ in the sky.", "fly", "fry", "flu", "fit"], ["Do you ___ my name?", "know", "now", "knee", "snow"],
  ["My dog is ten years ___.", "old", "odd", "oil", "sold"], ["___ me help you.", "Let", "Lot", "Lit", "Get"],
];
const ES_G1_FIT: Fit[] = [
  ["Mi hermano ___ viene.", "también", "tambor", "tiempo", "tomate"], ["Me pongo el abrigo ___ hace frío.", "porque", "parque", "portón", "poquito"],
  ["Mi abuela ___ me lee un cuento.", "siempre", "simple", "siete", "sobre"], ["Primero comemos y ___ jugamos.", "después", "desde", "deportes", "despierta"],
  ["Lávate las manos ___ de comer.", "antes", "antena", "entre", "ante"], ["Te quiero ___.", "mucho", "mucha", "muchos", "ancho"],
  ["Mi gato ___ come brócoli.", "nunca", "nuca", "nube", "nuera"], ["Quiero ___ vaso de agua.", "otro", "otra", "oro", "toro"],
  ["Tenemos el ___ color de ojos.", "mismo", "misma", "mimo", "mito"], ["Se apagó la luz y ___ grité.", "entonces", "entonar", "entender", "entero"],
  ["Caminamos ___ la esquina.", "hasta", "pasta", "basta", "hacha"], ["Vivo aquí ___ el año pasado.", "desde", "deseo", "sede", "verde"],
  ["Me lavo los dientes ___ noche.", "cada", "nada", "cama", "capa"], ["El gato está ___ de la caja.", "dentro", "centro", "entro", "diente"],
  ["Primero comemos, ___ vamos al parque.", "luego", "fuego", "juego", "lugar"], ["La luna sale de ___.", "noche", "coche", "ocho", "leche"],
];

// ---- e.sight.grade2 ----
const EN_G2_LOOK: Look[] = [
  ["always", "away", "allows", "hallways"], ["around", "round", "ground", "aground"], ["because", "become", "cause", "became"], ["before", "below", "behind", "become"],
  ["both", "bath", "booth", "moth"], ["does", "goes", "dose", "doe"], ["first", "fist", "frost", "thirst"], ["found", "fond", "round", "sound"],
  ["green", "grin", "greet", "queen"], ["many", "may", "money", "mane"], ["pull", "pal", "poll", "full"], ["sleep", "slip", "steep", "sheep"],
  ["these", "those", "theme", "cheese"], ["which", "whip", "wish", "rich"], ["would", "could", "world", "wild"], ["wash", "wish", "cash", "was"],
];
const ES_G2_LOOK: Look[] = [
  ["alguien", "alguno", "algún", "algodón"], ["nadie", "nada", "nadar", "madre"], ["todavía", "todo", "tranvía", "tonada"], ["mientras", "mientes", "muestras", "menta"],
  ["cerca", "cerco", "cerdo", "cereza"], ["lejos", "lentes", "conejos", "viejos"], ["pronto", "punto", "propio", "prado"], ["temprano", "templado", "tiempo", "trapo"],
  ["arriba", "arroba", "arriero", "ardilla"], ["abajo", "abeja", "ajo", "baja"], ["juntos", "junto", "puntos", "jugos"], ["primero", "primera", "primo", "plomero"],
  ["siguiente", "siguen", "sigue", "sirviente"], ["durante", "durazno", "duro", "dulce"], ["tarde", "tarta", "tardes", "arde"], ["último", "últimos", "íntimo", "óptimo"],
];
const EN_G2_FIT: Fit[] = [
  ["I ___ brush my teeth at night.", "always", "away", "allows", "ally"], ["Put on a coat ___ it is cold.", "because", "become", "became", "beside"],
  ["Wash your hands ___ you eat.", "before", "become", "beside", "behind"], ["I like ___ cats and dogs.", "both", "bath", "booth", "moth"],
  ["It is ___ outside today.", "cold", "could", "told", "cod"], ["She ___ not like peas.", "does", "goes", "dose", "doe"],
  ["The cheetah runs ___.", "fast", "fist", "feast", "cast"], ["I have ___ fingers on one hand.", "five", "fire", "hive", "dive"],
  ["I ___ my lost shoe.", "found", "fond", "round", "sound"], ["Grass is ___.", "green", "grin", "greet", "queen"],
  ["Please ___ the door open.", "pull", "pal", "poll", "full"], ["Birds like to ___ songs.", "sing", "sting", "song", "sang"],
  ["It is time to ___ now.", "sleep", "sheep", "slept", "sleepy"], ["Can you ___ me a story?", "tell", "tall", "tail", "bell"],
  ["I ___ soap to wash.", "use", "us", "sue", "fuse"], ["Kim can ___ the dishes.", "wash", "wish", "was", "cash"],
];
const ES_G2_FIT: Fit[] = [
  ["¿Hay ___ en la puerta?", "alguien", "algún", "alegre", "álgebra"], ["No vino ___ a la fiesta.", "nadie", "nadar", "nadando", "madera"],
  ["Mi hermanito ___ no sabe leer.", "todavía", "todo", "todas", "tranvía"], ["Canto ___ me baño.", "mientras", "mientes", "muestras", "menta"],
  ["La escuela está ___ de mi casa.", "cerca", "cerco", "cerdo", "cereza"], ["La luna está muy ___.", "lejos", "lentes", "conejos", "viejos"],
  ["Llegaremos muy ___.", "pronto", "punto", "propio", "prado"], ["Me levanto ___ para ir a la escuela.", "temprano", "templado", "tiempo", "trapo"],
  ["El pájaro vuela ___ del árbol.", "arriba", "arroba", "arriero", "ardilla"], ["El sótano está ___.", "abajo", "abeja", "ajo", "baja"],
  ["Mis amigos y yo jugamos ___.", "juntos", "junto", "puntos", "jugos"], ["___ me lavo las manos.", "Primero", "Primera", "Primo", "Plomero"],
  ["Mañana es el día ___.", "siguiente", "siguen", "sigue", "sirviente"], ["Dormí ___ todo el viaje.", "durante", "durazno", "dulce", "dura"],
  ["Llegamos ___ a la fiesta.", "tarde", "tarta", "tardes", "arde"], ["Me comí el ___ pedazo de pizza.", "último", "últimos", "íntimo", "ultimar"],
];

const band = (look: [Look[], Look[]], fit: [Fit[], Fit[]]): Entry[][] => [
  look[0].map((d, i) => ({ en: lookQ("en", d), es: lookQ("es", look[1][i]) })),
  fit[0].map((d, i) => ({ en: fitQ("en", d), es: fitQ("es", fit[1][i]) })),
];

export const SIGHT_PREPRIMER = band([EN_PP_LOOK, ES_PP_LOOK], [EN_PP_FIT, ES_PP_FIT]);
export const SIGHT_PRIMER = band([EN_PR_LOOK, ES_PR_LOOK], [EN_PR_FIT, ES_PR_FIT]);
export const SIGHT_GRADE1 = band([EN_G1_LOOK, ES_G1_LOOK], [EN_G1_FIT, ES_G1_FIT]);
export const SIGHT_GRADE2 = band([EN_G2_LOOK, ES_G2_LOOK], [EN_G2_FIT, ES_G2_FIT]);
