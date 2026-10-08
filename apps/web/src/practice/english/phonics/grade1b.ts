import type { Locale } from "@/lib/types";
import type { Entry, Q } from "./core";
import { gapQ, readQ } from "./read";

// Grade 1 reading, part 2: letter pairs (digraphs) and blends. Level 1 fills the missing letters in a
// pictured word; level 2 reads written words and picks the one that names the picture.
// Codes: P another letter pair, S one letter where a pair belongs, B another blend, D a letter dropped,
// X two letters swapped, V another vowel, C another consonant, Y a sound-alike spelling (ll / y).

/** [word, picture, word with ___, missing letters, wrong fills] */
type Gap = [string, string, string, string, string];
/** [word, picture, wrong words] */
type Read = [string, string, string];

const gaps = (en: Gap[], es: Gap[], strategy: [string, string]): Entry[] =>
  en.map((d, i) => ({ en: gapOf("en", d, strategy), es: gapOf("es", es[i], strategy) }));
const gapOf = (locale: Locale, [w, picture, shown, key, spec]: Gap, strategy: [string, string]): Q => gapQ(locale, w, picture, shown, key, spec, strategy);
const reads = (en: Read[], es: Read[], strategy: [string, string]): Entry[] =>
  en.map(([w, p, s], i) => ({ en: readQ("en", w, p, s, strategy), es: readQ("es", es[i][0], es[i][1], es[i][2], strategy) }));

// ---- e.digraphs: sh ch th wh ck | ch ll rr ----
// The word is spoken, so no English fill may sound like it: w for wh (wale) and k or c for ck (duk) are
// never offered. Spanish y for ll (yave) does sound the same, so those items ask for the right spelling.
const EN_DG_GAP: Gap[] = [
  ["ship", "🚢", "___ip", "sh", "ch:P th:P s:S"], ["shoe", "👞", "___oe", "sh", "ch:P th:P s:S"], ["sheep", "🐑", "___eep", "sh", "ch:P th:P s:S"],
  ["shark", "🦈", "___ark", "sh", "ch:P th:P s:S"], ["chair", "🪑", "___air", "ch", "sh:P th:P c:S"], ["cheese", "🧀", "___eese", "ch", "sh:P th:P c:S"],
  ["cherry", "🍒", "___erry", "ch", "th:P sh:P c:S"], ["thumb", "👍", "___umb", "th", "sh:P ch:P t:S"], ["three", "3️⃣", "___ree", "th", "sh:P ch:P t:S"],
  ["whale", "🐋", "___ale", "wh", "th:P sh:P h:S"], ["fish", "🐟", "fi___", "sh", "ch:P th:P s:S"], ["tooth", "🦷", "too___", "th", "sh:P ch:P t:S"],
  ["bath", "🛁", "ba___", "th", "sh:P ch:P t:S"], ["peach", "🍑", "pea___", "ch", "sh:P th:P c:S"], ["duck", "🦆", "du___", "ck", "ch:P sh:P t:S"],
  ["sock", "🧦", "so___", "ck", "ch:P sh:P t:S"],
];
const ES_DG_GAP: Gap[] = [
  ["chocolate", "🍫", "___ocolate", "ch", "c:S ll:P"], ["chile", "🌶️", "___ile", "ch", "c:S ll:P"], ["leche", "🥛", "le___e", "ch", "c:S ll:P"],
  ["coche", "🚗", "co___e", "ch", "c:S ll:P"], ["ocho", "8️⃣", "o___o", "ch", "c:S ll:P"], ["llave", "🔑", "___ave", "ll", "l:S y:Y ch:P"],
  ["lluvia", "🌧️", "___uvia", "ll", "l:S y:Y ch:P"], ["pollo", "🐔", "po___o", "ll", "l:S y:Y rr:P"], ["silla", "🪑", "si___a", "ll", "l:S y:Y ch:P"],
  ["caballo", "🐴", "caba___o", "ll", "l:S y:Y rr:P"], ["perro", "🐶", "pe___o", "rr", "r:S ll:P"], ["carro", "🚗", "ca___o", "rr", "r:S ll:P"],
  ["torre", "🗼", "to___e", "rr", "r:S ll:P"], ["gorra", "🧢", "go___a", "rr", "r:S ll:P"], ["zorro", "🦊", "zo___o", "rr", "r:S ll:P"],
  ["tierra", "🌍", "tie___a", "rr", "r:S ll:P"],
];
const EN_DG_READ: Read[] = [
  ["ship", "🚢", "chip:P sip:S shop:V"], ["shell", "🐚", "sell:S shall:V"], ["chick", "🐤", "thick:P sick:S check:V"], ["cheese", "🧀", "geese:S chase:V"],
  ["whale", "🐋", "shale:P tale:S while:V"], ["bath", "🛁", "bash:P bat:S both:V"], ["fish", "🐟", "fit:S fix:S"], ["sock", "🧦", "song:P sod:S sack:V"],
  ["clock", "⏰", "cloth:P clog:S click:V"], ["chair", "🪑", "hair:S fair:S"], ["sheep", "🐑", "cheep:P seep:S shop:V"], ["shoe", "👞", "hoe:S toe:S"],
  ["peach", "🍑", "peak:S pear:S"], ["cherry", "🍒", "ferry:S merry:S"], ["shark", "🦈", "park:S bark:S"], ["three", "3️⃣", "tree:S free:S"],
];
const ES_DG_READ: Read[] = [
  ["perro", "🐶", "pero:S pelo:S"], ["carro", "🚗", "caro:S callo:P"], ["cerro", "⛰️", "cero:S cebo:S"], ["llave", "🔑", "lave:S nave:S"],
  ["pollo", "🐔", "polo:S pozo:S"], ["gallo", "🐓", "gacho:P gajo:S"], ["leche", "🥛", "leve:S lecho:V"], ["coche", "🚗", "corre:P cose:S"],
  ["ocho", "8️⃣", "ojo:S oso:S"], ["llama", "🦙", "lama:S cama:S"], ["hacha", "🪓", "hada:S haya:S"], ["torre", "🗼", "tose:S tome:S"],
  ["caballo", "🐴", "cabello:V caballa:V"], ["olla", "🍲", "ola:S oca:S"], ["ducha", "🚿", "duda:S dicha:V"], ["gorra", "🧢", "goma:S gota:S"],
];
export const DIGRAPHS: Entry[][] = [
  gaps(EN_DG_GAP, ES_DG_GAP, ["Two letters can work together to make one sound.", "Algunas letras van en pareja: ch, ll, rr."]),
  reads(EN_DG_READ, ES_DG_READ, ["Look for two letters that make one sound.", "Busca dos letras que hacen un solo sonido."]),
];

// ---- e.blends.initial: bl, st, tr… | sílabas trabadas: pla, bra, tre… ----
const EN_BL_GAP: Gap[] = [
  ["frog", "🐸", "___og", "fr", "cr:B f:D dr:B"], ["crab", "🦀", "___ab", "cr", "cl:B c:D gr:B"], ["drum", "🥁", "___um", "dr", "tr:B d:D br:B"],
  ["tree", "🌳", "___ee", "tr", "dr:B t:D fr:B"], ["star", "⭐", "___ar", "st", "sp:B s:D sk:B"], ["snake", "🐍", "___ake", "sn", "sm:B s:D st:B"],
  ["spoon", "🥄", "___oon", "sp", "st:B s:D sw:B"], ["flag", "🚩", "___ag", "fl", "fr:B f:D bl:B"], ["plane", "✈️", "___ane", "pl", "bl:B p:D pr:B"],
  ["clock", "⏰", "___ock", "cl", "cr:B c:D bl:B"], ["globe", "🌐", "___obe", "gl", "gr:B g:D bl:B"], ["bread", "🍞", "___ead", "br", "bl:B b:D dr:B"],
  ["grapes", "🍇", "___apes", "gr", "gl:B g:D cr:B"], ["swan", "🦢", "___an", "sw", "sn:B s:D st:B"], ["sled", "🛷", "___ed", "sl", "sn:B s:D fl:B"],
  ["skunk", "🦨", "___unk", "sk", "sp:B s:D st:B"],
];
const ES_BL_GAP: Gap[] = [
  ["plato", "🍽️", "___to", "pla", "pa:D bla:B pal:X"], ["flor", "🌸", "___r", "flo", "fo:D fro:B fol:X"], ["tren", "🚆", "___n", "tre", "te:D dre:B ter:X"],
  ["libro", "📖", "li___", "bro", "bo:D blo:B bor:X"], ["globo", "🎈", "___bo", "glo", "go:D gro:B gol:X"], ["fresa", "🍓", "___sa", "fre", "fe:D fle:B fer:X"],
  ["tigre", "🐯", "ti___", "gre", "ge:D gle:B ger:X"], ["cabra", "🐐", "ca___", "bra", "ba:D bla:B bar:X"], ["princesa", "👸", "___ncesa", "pri", "pi:D pli:B pir:X"],
  ["dragón", "🐉", "___gón", "dra", "da:D gra:B dar:X"], ["grillo", "🦗", "___llo", "gri", "gi:D gli:B gir:X"], ["bloque", "🧱", "___que", "blo", "bo:D bro:B bol:X"],
  ["trompeta", "🎺", "___mpeta", "tro", "to:D dro:B tor:X"], ["crayón", "🖍️", "___yón", "cra", "ca:D cla:B car:X"], ["trigo", "🌾", "___go", "tri", "ti:D dri:B tir:X"],
  ["pluma", "🪶", "___ma", "plu", "pu:D blu:B pul:X"],
];
const EN_BL_READ: Read[] = [
  ["crab", "🦀", "cab:D grab:B crib:V"], ["sled", "🛷", "led:D sped:B slid:V"], ["snake", "🐍", "sake:D stake:B"], ["star", "⭐", "tar:D spar:B stir:V"],
  ["spoon", "🥄", "soon:D spin:V"], ["clock", "⏰", "lock:D crock:B click:V"], ["bread", "🍞", "bead:D dread:B breed:V"], ["grapes", "🍇", "drapes:B gripes:V"],
  ["tree", "🌳", "tee:D free:B"], ["plane", "✈️", "pane:D lane:D"], ["frame", "🖼️", "fame:D flame:B"], ["glove", "🧤", "love:D clove:B"],
  ["skate", "⛸️", "state:B slate:B"], ["plug", "🔌", "pug:D slug:B"], ["snail", "🐌", "sail:D nail:D"], ["crown", "👑", "clown:B brown:B"],
];
const ES_BL_READ: Read[] = [
  ["plato", "🍽️", "pato:D palto:X blato:B"], ["globo", "🎈", "lobo:D golbo:X grobo:B"], ["tren", "🚆", "ten:D tern:X dren:B"], ["cabra", "🐐", "cobra:V carba:X cabla:B"],
  ["libro", "📖", "libre:V lirbo:X liblo:B"], ["grillo", "🦗", "brillo:B gillo:D"], ["brazo", "💪", "bazo:D barzo:X blazo:B"], ["pluma", "🪶", "puma:D pulma:X pruma:B"],
  ["fresa", "🍓", "fesa:D fersa:X flesa:B"], ["flor", "🌸", "for:D fror:B"], ["tigre", "🐯", "tige:D tirge:X"], ["dragón", "🐉", "dagón:D dargón:X"],
  ["trompeta", "🎺", "tompeta:D tormpeta:X"], ["crayón", "🖍️", "cayón:D caryón:X"], ["princesa", "👸", "pincesa:D plincesa:B"], ["trigo", "🌾", "tigo:D tirgo:X"],
];
export const BLENDS_INITIAL: Entry[][] = [
  gaps(EN_BL_GAP, ES_BL_GAP, ["Two consonants together: say both sounds.", "Dos consonantes juntas: suenan las dos."]),
  reads(EN_BL_READ, ES_BL_READ, ["Read both letters of the blend, then the rest.", "Lee las dos consonantes juntas y luego el resto."]),
];

// ---- e.blends.final: -nd, -st, -mp… | sílabas inversas y cerradas: is, an, -tor- ----
const EN_FB_GAP: Gap[] = [
  ["hand", "✋", "ha___", "nd", "n:D d:D nt:B"], ["tent", "⛺", "te___", "nt", "n:D t:D nd:B"], ["camp", "🏕️", "ca___", "mp", "m:D p:D np:B"],
  ["milk", "🥛", "mi___", "lk", "l:D k:D nk:B"], ["ant", "🐜", "a___", "nt", "n:D t:D nd:B"], ["skunk", "🦨", "sku___", "nk", "n:D k:D ng:B"],
  ["gift", "🎁", "gi___", "ft", "f:D t:D st:B"], ["vest", "🦺", "ve___", "st", "s:D t:D sk:B"], ["mask", "🎭", "ma___", "sk", "s:D k:D st:B"],
  ["wind", "🌬️", "wi___", "nd", "n:D d:D nt:B"], ["plant", "🪴", "pla___", "nt", "n:D t:D nd:B"], ["drink", "🥤", "dri___", "nk", "n:D k:D ng:B"],
  ["fist", "✊", "fi___", "st", "s:D t:D sk:B"], ["golf", "⛳", "go___", "lf", "l:D f:D lt:B"], ["bank", "🏦", "ba___", "nk", "n:D k:D ng:B"],
  ["wolf", "🐺", "wo___", "lf", "l:D f:D lt:B"],
];
const ES_FB_GAP: Gap[] = [
  ["isla", "🏝️", "___la", "is", "i:D si:X in:C"], ["ancla", "⚓", "___cla", "an", "a:D na:X al:C"], ["escoba", "🧹", "___coba", "es", "e:D se:X en:C"],
  ["estrella", "⭐", "___trella", "es", "e:D se:X el:C"], ["insecto", "🐛", "___secto", "in", "i:D ni:X is:C"], ["antena", "📡", "___tena", "an", "a:D na:X al:C"],
  ["enchufe", "🔌", "___chufe", "en", "e:D ne:X es:C"], ["ensalada", "🥗", "___salada", "en", "e:D ne:X el:C"], ["espejo", "🪞", "___pejo", "es", "e:D se:X en:C"],
  ["ardilla", "🐿️", "___dilla", "ar", "a:D ra:X al:C"], ["escalera", "🪜", "___calera", "es", "e:D se:X el:C"], ["invierno", "❄️", "___vierno", "in", "i:D ni:X im:C"],
  ["astronauta", "🧑‍🚀", "___tronauta", "as", "a:D sa:X an:C"], ["elfo", "🧝", "___fo", "el", "e:D le:X en:C"], ["arcoíris", "🌈", "___coíris", "ar", "a:D ra:X al:C"],
  ["hormiga", "🐜", "h___miga", "or", "o:D ro:X ol:C"],
];
const EN_FB_READ: Read[] = [
  ["hand", "✋", "had:D hard:B hind:V"], ["tent", "⛺", "ten:D tend:B tint:V"], ["milk", "🥛", "mink:B mild:B"], ["gift", "🎁", "gilt:B gist:B"],
  ["vest", "🦺", "vet:D vent:B vast:V"], ["mask", "🎭", "mast:B musk:V"], ["plant", "🪴", "plan:D plank:B"], ["fist", "✊", "fit:D fast:V"],
  ["bank", "🏦", "ban:D band:B bunk:V"], ["wind", "🌬️", "win:D wild:B wand:V"], ["golf", "⛳", "gold:B gulf:V"], ["ant", "🐜", "an:D and:B"],
  ["paint", "🎨", "pain:D pant:V"], ["cold", "🥶", "cod:D colt:B"], ["pump", "⛽", "pup:D pulp:B"], ["wink", "😉", "win:D wing:B"],
];
const ES_FB_READ: Read[] = [
  ["isla", "🏝️", "sila:X ila:D"], ["ancla", "⚓", "acla:D nacla:X"], ["escoba", "🧹", "ecoba:D secoba:X"], ["espejo", "🪞", "epejo:D sepejo:X"],
  ["insecto", "🐛", "isecto:D nisecto:X"], ["antena", "📡", "atena:D natena:X"], ["ardilla", "🐿️", "adilla:D radilla:X"], ["árbol", "🌳", "ábol:D rábol:X"],
  ["pastel", "🎂", "patel:D pantel:C"], ["cesta", "🧺", "ceta:D cetsa:X"], ["mosca", "🪰", "moca:D monca:C"], ["sartén", "🍳", "satén:D sratén:X"],
  ["tortuga", "🐢", "totuga:D trotuga:X"], ["cerdo", "🐷", "cedo:D celdo:C"], ["puerta", "🚪", "pueta:D pureta:X"], ["carta", "✉️", "cata:D crata:X"],
];
export const BLENDS_FINAL: Entry[][] = [
  gaps(EN_FB_GAP, ES_FB_GAP, ["Listen for two sounds at the end.", "Escucha: una vocal y luego una consonante."]),
  reads(EN_FB_READ, ES_FB_READ, ["Read to the very end of each word.", "Busca la sílaba que termina en consonante."]),
];
