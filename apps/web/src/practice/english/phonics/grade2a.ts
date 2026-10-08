import type { Locale } from "@/lib/types";
import { tr } from "../../text";
import { cap, pic, type Entry, type Q } from "./core";
import { gapQ, readQ, sentenceQ, SPELLED, TAGS } from "./read";

// Grade 2 reading: vowels with r, diphthongs, soft c and g, and silent letters. Spanish: la r suave y
// la r fuerte (pero, perro; rata), diptongos con i / y (rey, reina; auto), c y g con e, i (cereza,
// casa; gente, gato), and the silent u of que, qui, gue, gui with the dieresis of pingüino.
// Codes: R another vowel before r, Y a spelling that sounds the same, T another vowel team, D a letter
// dropped, S one letter where two belong, W a letter doubled, X letters swapped, V another vowel,
// C another consonant, P another letter pair, M another ending, E a silent letter dropped,
// N a missing dieresis, O a dieresis not needed, K hard sound for soft; Spanish q/s/g/j name the sound
// the wrong spelling or picture would have.

type Gap = [string, string, string, string, string];
type Read = [string, string, string];
/** Level 1 gaps, slot by slot; each language's strategy hint may depend on the item. */
const gapPairs = (en: Gap[], es: Gap[], enRule: (d: Gap) => [string, string], esRule: (d: Gap) => [string, string]): Entry[] =>
  en.map((d, i) => ({ en: gapQ("en", ...d, enRule(d)), es: gapQ("es", ...es[i], esRule(es[i])) }));

// ---- e.r.controlled ----
// English ar and or each say their own sound, so those gaps are heard. Er, ir and ur say the same sound,
// so bird, turtle or tiger asks for the right spelling (the Y fills).
const EN_R_GAP: Gap[] = [
  ["car", "🚗", "c___", "ar", "or:R a:D er:R"], ["star", "⭐", "st___", "ar", "or:R a:D ir:R"], ["shark", "🦈", "sh___k", "ar", "or:R a:D ur:R"],
  ["arm", "💪", "___m", "ar", "or:R a:D er:R"], ["corn", "🌽", "c___n", "or", "ar:R o:D ur:R"], ["fork", "🍴", "f___k", "or", "ar:R o:D ir:R"],
  ["horse", "🐴", "h___se", "or", "ar:R o:D ur:R"], ["storm", "⛈️", "st___m", "or", "ar:R o:D er:R"], ["bird", "🐦", "b___d", "ir", "ur:Y er:Y i:D"],
  ["girl", "👧", "g___l", "ir", "ur:Y er:Y i:D"], ["shirt", "👕", "sh___t", "ir", "ur:Y er:Y i:D"], ["turtle", "🐢", "t___tle", "ur", "ir:Y er:Y u:D"],
  ["purse", "👛", "p___se", "ur", "ir:Y er:Y u:D"], ["burger", "🍔", "b___ger", "ur", "ir:Y er:Y u:D"], ["tiger", "🐯", "tig___", "er", "ir:Y ur:Y e:D"],
  ["spider", "🕷️", "spid___", "er", "ir:Y ur:Y e:D"],
];
// Spanish: one r at the start of a word sounds strong (rata); between vowels r is soft (pera) and rr strong (perro).
// At the start or before a consonant, rr would sound just like r ("rratón", "cerrdo"), so those gaps ask for
// the right spelling (~), and cerdo's hint 2 says rr is never written before a consonant.
const ES_R_GAP: Gap[] = [
  ["ratón", "🐭", "___atón", "r", "rr:W~ l:C"], ["rana", "🐸", "___ana", "r", "rr:W~ l:C"], ["rosa", "🌹", "___osa", "r", "rr:W~ l:C"],
  ["regalo", "🎁", "___egalo", "r", "rr:W~ l:C"], ["reloj", "⌚", "___eloj", "r", "rr:W~ l:C"], ["rata", "🐀", "___ata", "r", "rr:W~ l:C"],
  ["perro", "🐶", "pe___o", "rr", "r:S l:S"], ["guitarra", "🎸", "guita___a", "rr", "r:S l:S"], ["pera", "🍐", "pe___a", "r", "rr:W l:C"],
  ["loro", "🦜", "lo___o", "r", "rr:W l:C"], ["toro", "🐂", "to___o", "r", "rr:W l:C"], ["cara", "🙂", "ca___a", "r", "rr:W l:C"],
  ["jirafa", "🦒", "ji___afa", "r", "rr:W l:C"], ["arroz", "🍚", "a___oz", "rr", "r:S l:S"], ["cerdo", "🐷", "ce___do", "r", "rr:W~ l:C"],
  ["barril", "🛢️", "ba___il", "rr", "r:S l:S"],
];
const EN_R_READ: Read[] = [
  ["card", "🃏", "cord:R curd:R"], ["park", "🏞️", "pork:R perk:R"], ["star", "⭐", "stir:R tar:D"], ["fork", "🍴", "fark:R fok:D"],
  ["corn", "🌽", "carn:R con:D"], ["horse", "🐴", "harse:R hose:D"], ["shark", "🦈", "shirk:R sharp:C"], ["arm", "💪", "orm:R am:D"],
  ["bird", "🐦", "bard:R bid:D"], ["girl", "👧", "gorl:R gil:D"], ["shirt", "👕", "short:R skirt:C"], ["turtle", "🐢", "tortle:R tutle:D"],
  ["purse", "👛", "parse:R nurse:C"], ["burger", "🍔", "barger:R buger:D"], ["tiger", "🐯", "tigar:R tige:D"], ["spider", "🕷️", "spidor:R spide:D"],
];
const ES_R_FIT: [string, string, string][] = [
  ["El ___ ladra.", "perro", "pero:S parro:V"], ["Quiero ir, ___ llueve.", "pero", "perro:W pelo:C"], ["Mi papá maneja el ___.", "carro", "caro:S callo:P"],
  ["Ese juguete es muy ___.", "caro", "carro:W cara:V"], ["Subimos al ___ a ver el paisaje.", "cerro", "cero:S cerdo:C"], ["Cinco menos cinco es ___.", "cero", "cerro:W celo:C"],
  ["Yo ___ en el parque.", "corro", "coro:S corra:M"], ["El ___ habla mucho.", "loro", "lorro:W lodo:C"], ["Este regalo es ___ ti.", "para", "parra:W pala:C"],
  ["La ___ da uvas.", "parra", "para:S barra:C"], ["___ vamos a comer.", "Ahora", "Ahorra:W Ahola:C"], ["Mi papá ___ dinero.", "ahorra", "ahora:S ahorro:M"],
  ["El perro quiere ___ su hueso.", "enterrar", "enterar:S enterras:M"], ["Sirve el agua de la ___.", "jarra", "jara:S jarro:M"], ["La ___ es muy alta.", "torre", "tore:S tose:S"],
  ["La ___ come queso.", "rata", "rrata:W lata:C"],
];
const R_SAME: [string, string] = ["Er, ir, and ur often sound the same. Think how the word looks.", ""];
const R_SOUND: [string, string] = ["The r changes the vowel sound: jar, for.", ""];
const ES_R_RULE: [string, string] = ["", "Al principio, r suena fuerte. Entre vocales, rr suena fuerte."];
const ES_R_BEFORE: [string, string] = ["", "Antes de otra consonante se escribe una sola r: verde."];
/** Cerdo's r comes before a consonant, where rr is never written. */
const esRRule = (d: Gap): [string, string] => (/^[^aeiouáéíóú]/.test(d[2].split("___")[1]) ? ES_R_BEFORE : ES_R_RULE);
export const R_CONTROLLED: Entry[][] = [
  gapPairs(EN_R_GAP, ES_R_GAP, (d) => (["er", "ir", "ur"].includes(d[3]) ? R_SAME : R_SOUND), esRRule),
  EN_R_READ.map(([w, p, s], i) => ({
    en: readQ("en", w, p, s, ["Look at the vowel right before the r.", ""]),
    es: sentenceQ("es", ES_R_FIT[i][0], ES_R_FIT[i][1], ES_R_FIT[i][2], ["", "Entre vocales, r suena suave y rr suena fuerte: pera, perra."]),
  })),
];

// ---- e.diphthongs: oi oy ou ow | diptongos ai ei au eu, with y at the end (rey, buey) ----
// English level 1 is heard, so oy is never offered for oi (or oi for oy), nor ow for ou (or ou for ow):
// those pairs sound alike. Spanish ei / ey and ai / ay sound alike too, so those gaps ask for the spelling.
const EN_DI_GAP: Gap[] = [
  ["coin", "🪙", "c___n", "oi", "ai:T o:D ou:T"], ["boy", "👦", "b___", "oy", "ay:T o:D ow:T"], ["toy", "🧸", "t___", "oy", "ay:T o:D ow:T"],
  ["oil", "🛢️", "___l", "oi", "ai:T o:D ow:T"], ["point", "👉", "p___nt", "oi", "ai:T o:D ou:T"], ["cow", "🐮", "c___", "ow", "ay:T o:D oy:T"],
  ["owl", "🦉", "___l", "ow", "ai:T o:D oi:T"], ["crown", "👑", "cr___n", "ow", "ai:T o:D oi:T"], ["clown", "🤡", "cl___n", "ow", "ea:T o:D oi:T"],
  ["flower", "🌸", "fl___er", "ow", "oy:T o:D oi:T"], ["house", "🏠", "h___se", "ou", "oi:T o:D oa:T"], ["mouse", "🐭", "m___se", "ou", "oi:T o:D oa:T"],
  ["cloud", "☁️", "cl___d", "ou", "oi:T o:D ee:T"], ["mouth", "👄", "m___th", "ou", "oi:T o:D ee:T"], ["couch", "🛋️", "c___ch", "ou", "oi:T o:D oa:T"],
  ["oyster", "🦪", "___ster", "oy", "ai:T o:D ou:T"],
];
const ES_DI_GAP: Gap[] = [
  ["rey", "👑", "r___", "ey", "ei:Y e:D ay:T"], ["buey", "🐂", "bu___", "ey", "ei:Y e:D oy:T"], ["ley", "⚖️", "l___", "ey", "ei:Y e:D ay:T"],
  ["naipe", "🃏", "n___pe", "ai", "ay:Y a:D au:T"], ["reina", "👸", "r___na", "ei", "ey:Y e:D ai:T"], ["seis", "6️⃣", "s___s", "ei", "ey:Y e:D ai:T"],
  ["auto", "🚗", "___to", "au", "ua:X a:D eu:T"], ["pausa", "⏸️", "p___sa", "au", "ua:X a:D ai:T"], ["baile", "💃", "b___le", "ai", "ay:Y a:D au:T"],
  ["euro", "💶", "___ro", "eu", "ue:X e:D au:T"], ["caimán", "🐊", "c___mán", "ai", "ay:Y a:D au:T"], ["bailarina", "🩰", "b___larina", "ai", "ay:Y a:D au:T"],
  ["paisaje", "🏞️", "p___saje", "ai", "ay:Y a:D au:T"], ["dinosaurio", "🦕", "dinos___rio", "au", "ua:X a:D ai:T"], ["astronauta", "🧑‍🚀", "astron___ta", "au", "ua:X a:D ai:T"],
  ["aplauso", "👏", "apl___so", "au", "ua:X a:D ai:T"],
];
const EN_DI_READ: Read[] = [
  ["coin", "🪙", "con:D coil:C"], ["boy", "👦", "bay:T bow:T"], ["toy", "🧸", "tow:T to:D"], ["oil", "🛢️", "owl:T awl:T"],
  ["point", "👉", "pint:D paint:T"], ["cow", "🐮", "coy:T caw:T"], ["owl", "🦉", "oil:T awl:T"], ["crown", "👑", "crow:D croon:T"],
  ["clown", "🤡", "crown:C clon:D"], ["flower", "🌸", "lower:D slower:C"], ["house", "🏠", "hose:D mouse:C"], ["mouse", "🐭", "moose:T muse:D"],
  ["cloud", "☁️", "clod:D loud:D"], ["mouth", "👄", "moth:D south:C"], ["couch", "🛋️", "coach:T pouch:C"], ["noise", "🔊", "nose:D poise:C"],
];
const ES_DI_READ: Read[] = [
  ["rey", "👑", "rei:Y re:D"], ["buey", "🐂", "buei:Y bue:D"], ["ley", "⚖️", "lei:Y le:D"], ["reina", "👸", "reyna:Y rena:D"],
  ["seis", "6️⃣", "seys:Y ses:D"], ["auto", "🚗", "uato:X ato:D"], ["baile", "💃", "bayle:Y bale:D"], ["euro", "💶", "uero:X ero:D"],
  ["caimán", "🐊", "caymán:Y camán:D"], ["naipe", "🃏", "naype:Y nape:D"], ["pausa", "⏸️", "puasa:X pasa:D"], ["bailarina", "🩰", "baylarina:Y balarina:D"],
  ["paisaje", "🏞️", "paysaje:Y pasaje:D"], ["dinosaurio", "🦕", "dinosuario:X dinosario:D"], ["astronauta", "🧑‍🚀", "astronuata:X astronata:D"], ["aplauso", "👏", "apluaso:X aplaso:D"],
];
// The Spanish i / y rule: y only for a weak i that ends the word after another vowel (hay, but casi, fui,
// leí). The examples are not words in the banks. Words with au or eu get their own hint.
const ES_IY: [string, string] = ["", "La i débil al final, después de otra vocal, se escribe y: hay. En medio se escribe i: peine."];
const esDiRule = (iy: boolean, eu: [string, string]): [string, string] => (iy ? ES_IY : eu);
const EN_DI_RULE: [string, string] = ["Oi and oy say the sound in joy. Ou and ow say the sound in now.", ""];
export const DIPHTHONGS: Entry[][] = [
  gapPairs(EN_DI_GAP, ES_DI_GAP, () => EN_DI_RULE, (d) => esDiRule(/[iy]/.test(d[3]), ["", "Escucha bien: ¿qué vocal suena primero?"])),
  EN_DI_READ.map(([w, p, s], i) => ({
    en: readQ("en", w, p, s, ["Look for the two vowels that glide together.", ""]),
    es: readQ("es", ES_DI_READ[i][0], ES_DI_READ[i][1], ES_DI_READ[i][2], esDiRule(/:Y/.test(ES_DI_READ[i][2]), ["", "Fíjate en el orden de las dos vocales."]), SPELLED),
  })),
];

// ---- e.soft.c.g ----
// Level 1: read a word (not spoken), then pick the picture that starts with the same sound. The wrong
// picture has the other sound of that letter; the third starts with something else. Every key follows the
// rule hint 2 states (a hard g key starts with ga, go or gu, never gi). Spanish c with e, i is the s of
// Latin America (seseo); hint 2 says so.
/** [word to read, key word, picture, word with the other sound, picture, its code, other word, picture] */
type Soft = [string, string, string, string, string, string, string, string];
const EN_SOFT: Soft[] = [
  ["city", "sun", "☀️", "cat", "🐱", "K", "fish", "🐟"], ["circle", "sock", "🧦", "cow", "🐮", "K", "moon", "🌙"], ["cent", "seal", "🦭", "car", "🚗", "K", "bed", "🛏️"],
  ["cereal", "saw", "🪚", "cake", "🎂", "K", "dog", "🐶"], ["cup", "kite", "🪁", "sun", "☀️", "F", "moon", "🌙"], ["cat", "key", "🔑", "seal", "🦭", "F", "bed", "🛏️"],
  ["gem", "jet", "✈️", "goat", "🐐", "K", "sun", "☀️"], ["giant", "jeans", "👖", "gift", "🎁", "K", "moon", "🌙"], ["giraffe", "juice", "🧃", "game", "🎮", "K", "fish", "🐟"],
  ["goat", "guitar", "🎸", "jet", "✈️", "F", "sun", "☀️"], ["gum", "gorilla", "🦍", "jeans", "👖", "F", "cat", "🐱"], ["cell", "sea", "🌊", "cow", "🐮", "K", "dog", "🐶"],
  ["coat", "cake", "🎂", "sock", "🧦", "F", "moon", "🌙"], ["germ", "juice", "🧃", "goat", "🐐", "K", "bed", "🛏️"], ["gold", "game", "🎮", "jet", "✈️", "F", "sun", "☀️"],
  ["candy", "kite", "🪁", "seal", "🦭", "F", "fish", "🐟"],
];
const ES_SOFT: Soft[] = [
  ["cereza", "sol", "☀️", "casa", "🏠", "q", "luna", "🌙"], ["cine", "silla", "🪑", "coco", "🥥", "q", "mano", "✋"], ["cebolla", "sopa", "🍲", "cama", "🛏️", "q", "dedo", "☝️"],
  ["ciruela", "sandía", "🍉", "conejo", "🐰", "q", "nube", "☁️"], ["casa", "queso", "🧀", "sol", "☀️", "s", "luna", "🌙"], ["cuna", "kiwi", "🥝", "silla", "🪑", "s", "mano", "✋"],
  ["gente", "jirafa", "🦒", "gato", "🐱", "g", "sol", "☀️"], ["gigante", "jugo", "🧃", "gallina", "🐔", "g", "mano", "✋"], ["girasol", "jabón", "🧼", "gusano", "🐛", "g", "luna", "🌙"],
  ["genio", "jirafa", "🦒", "gorra", "🧢", "g", "pez", "🐟"], ["gato", "guitarra", "🎸", "jirafa", "🦒", "j", "sol", "☀️"], ["gota", "gusano", "🐛", "jugo", "🧃", "j", "mano", "✋"],
  ["gorro", "gallina", "🐔", "jabón", "🧼", "j", "luna", "🌙"], ["coche", "queso", "🧀", "cebra", "🦓", "s", "luna", "🌙"], ["cielo", "sirena", "🧜‍♀️", "casa", "🏠", "q", "mano", "✋"],
  ["cocina", "cuchara", "🥄", "cerdo", "🐷", "s", "nube", "☁️"],
];

function softQ(locale: Locale, [w, k, kp, near, np, code, other, op]: Soft): Q {
  const letter = w[0];
  return {
    prompt: tr(locale, `Read: ${w}. Which picture starts with the same sound?`, `Lee: ${w}. ¿Qué dibujo empieza con el mismo sonido?`),
    say: tr(locale, "Read the word. Which picture starts with the same sound?", "Lee la palabra. ¿Qué dibujo empieza con el mismo sonido?"),
    choices: [pic(k, kp), pic(near, np, TAGS[code]), pic(other, op, "different-sound")],
    hints: [
      tr(locale, `Look at the letter after the ${letter}.`, `Mira la letra que va después de la ${letter}.`),
      letter === "c"
        ? tr(locale, "Before e, i, or y, c says s. Before a, o, u, it says k.", "En América, con e, i, la c suena como en sapo. Con a, o, u, como en cola.")
        : tr(locale, "Before e, i, or y, g often says j. Before a, o, u, it says g.", "Con e, i, la g suena como en jamón. Con a, o, u, como en goma."),
      tr(locale, `${cap(near)} starts with the other sound of ${letter}.`, `${cap(near)} empieza con el otro sonido de la ${letter}.`),
    ],
    steps: [tr(locale, `The ${letter} in ${w} sounds like the start of ${k}.`, `La ${letter} de ${w} suena como el principio de ${k}.`)],
  };
}

const EN_SOFT_READ: Read[] = [
  ["city", "🏙️", "sity:Y kity:K"], ["circle", "⭕", "sircle:Y kircle:K"], ["face", "😀", "fase:Y fake:K"], ["pencil", "✏️", "pensil:Y penkil:K"],
  ["cereal", "🥣", "sereal:Y kereal:K"], ["circus", "🎪", "sircus:Y kircus:K"], ["dancer", "💃", "danser:Y danker:K"], ["giraffe", "🦒", "jiraffe:Y guiraffe:K"],
  ["gem", "💎", "jem:Y guem:K"], ["page", "📄", "paje:Y pag:D"], ["orange", "🍊", "oranje:Y orang:D"], ["bridge", "🌉", "brije:Y bride:D"],
  ["badge", "📛", "baje:Y bage:D"], ["ice", "🧊", "ise:Y ike:K"], ["race", "🏁", "rase:Y rake:K"], ["germ", "🦠", "jerm:Y guerm:K"],
];
const ES_SOFT_READ: Read[] = [
  ["cereza", "🍒", "sereza:Y zereza:Y"], ["cebolla", "🧅", "sebolla:Y zebolla:Y"], ["cebra", "🦓", "sebra:Y cevra:Y"], ["cine", "🎬", "sine:Y zine:Y"],
  ["dulce", "🍬", "dulse:Y dulze:Y"], ["bicicleta", "🚲", "bisicleta:Y bikicleta:q"], ["gente", "👥", "jente:Y guente:g"], ["jirafa", "🦒", "girafa:Y guirafa:g"],
  ["girasol", "🌻", "jirasol:Y guirasol:g"], ["genio", "🧞", "jenio:Y guenio:g"], ["imagen", "🖼️", "imajen:Y imaguen:g"], ["página", "📄", "pájina:Y páguina:g"],
  ["tijeras", "✂️", "tigeras:Y tijeas:D"], ["coche", "🚗", "koche:Y soche:s"], ["queso", "🧀", "keso:Y ceso:s"], ["guitarra", "🎸", "gitarra:j guitara:S"],
];
/** Spanish hint 2 for the spelling level, by the sound the word's tricky letter makes. */
const esSoftRule = (k: string): [string, string] =>
  /gu[ei]/.test(k)
    ? ["", "En gue y gui la u no suena: la g suena como en goma."]
    : /[gj]/.test(k)
      ? ["", "Ge y gi suenan como j. Ese sonido también se escribe con j: ja, je, ji, jo, ju."]
      : ["", "En América, ce y ci suenan como s. Ca, co, cu, que y qui suenan como k."];
export const SOFT_C_G: Entry[][] = [
  EN_SOFT.map((d, i) => ({ en: softQ("en", d), es: softQ("es", ES_SOFT[i]) })),
  EN_SOFT_READ.map(([w, p, s], i) => ({
    en: readQ("en", w, p, s, ["Soft c sounds like s; soft g sounds like j.", ""], SPELLED),
    es: readQ("es", ES_SOFT_READ[i][0], ES_SOFT_READ[i][1], ES_SOFT_READ[i][2], esSoftRule(ES_SOFT_READ[i][0]), SPELLED),
  })),
];

// ---- e.silent.letters: kn wr mb gh… | la u que no suena (que, qui, gue, gui) y la diéresis ----
const EN_SL: Read[] = [
  ["knot", "🪢", "not:E knit:V"], ["write", "✍️", "rite:E wrate:V"], ["wrench", "🔧", "rench:E wrinch:V"], ["thumb", "👍", "thum:E thump:C"],
  ["climb", "🧗", "clim:E clamb:V"], ["sign", "🪧", "sine:Y sing:X"], ["lamb", "🐑", "lam:E limb:V"], ["castle", "🏰", "casle:E cassle:Y"],
  ["ghost", "👻", "gost:E gohst:X"], ["island", "🏝️", "iland:E ilsand:X"], ["scissors", "✂️", "sissors:E scisors:D"], ["rhino", "🦏", "rino:E rhyno:Y"],
  ["two", "2️⃣", "to:E tow:X"], ["eight", "8️⃣", "ate:Y eihgt:X"], ["walk", "🚶", "wak:E wolk:V"],
];
const ES_SL: Read[] = [
  ["queso", "🧀", "keso:Y qeso:E"], ["guitarra", "🎸", "gitarra:E guitara:S"], ["juguete", "🧸", "jugete:E juquete:C"], ["mosquito", "🦟", "moskito:Y mosqito:E"],
  ["paquete", "📦", "pakete:Y paqete:E"], ["raqueta", "🏸", "raketa:Y raqeta:E"], ["esquí", "⛷️", "eskí:Y esqí:E"], ["águila", "🦅", "ágila:E águla:D"],
  ["hamburguesa", "🍔", "hamburgesa:E amburguesa:E"], ["pingüino", "🐧", "pinguino:N pingino:D"], ["parque", "🏞️", "parke:Y parqe:E"], ["etiqueta", "🏷️", "etiketa:Y etiqeta:E"],
  ["guiño", "😉", "giño:E güiño:O"], ["mantequilla", "🧈", "mantekilla:Y manteqilla:E"], ["chaqueta", "🧥", "chaketa:Y chaqeta:E"],
];
export const SILENT_LETTERS: Entry[][] = [
  EN_SL.map(([w, p, s], i) => ({
    en: readQ("en", w, p, s, ["Some words keep a letter you do not hear: knee, comb.", ""], SPELLED),
    es: readQ("es", ES_SL[i][0], ES_SL[i][1], ES_SL[i][2], ["", "En que, qui, gue, gui la u no suena. En güe, güi sí suena."], SPELLED),
  })),
];
