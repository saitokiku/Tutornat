import type { Locale } from "@/lib/types";
import { tr } from "../../text";
import { cap, pic, voiced, word, type Entry, type Q } from "./core";

// Grade 2 word study: compound words, splitting two-syllable words, and syllable types. Spanish:
// palabras compuestas (girasol, paraguas, abrelatas), separar en sílabas (li-bro, a-vión, san-dí-a),
// and la sílaba tónica with agudas, llanas y esdrújulas.

const coded = (map: Record<string, string>, spec: string) =>
  spec.split(" ").map((s) => {
    const [label, code] = s.split(":");
    if (!map[code]) throw new Error(`Unknown tag code in "${s}"`);
    return [label, map[code]] as const;
  });

// ---- e.compound.words ----
// Level 1: two words heard, the compound they make. English choices are pictures; Spanish choices are
// spoken words. Codes: F the wrong first word, L the wrong last word, O one part only, R the parts
// reversed, J joined without the spelling change (para + aguas = paraguas, not paraaguas).
const COMPOUND = { F: "wrong-first-word", L: "wrong-last-word", O: "one-part-only", R: "reversed-parts", J: "no-spelling-change", G: "kept-accent" };
/** [first, second, key, picture, wrong ones as "word=emoji:CODE"] */
type EnJoin = [string, string, string, string, string];
const EN_JOIN: EnJoin[] = [
  ["sun", "flower", "sunflower", "🌻", "sunglasses=🕶️:L flower=🌸:O"], ["rain", "bow", "rainbow", "🌈", "raincoat=🧥:L bow=🎀:O"],
  ["snow", "man", "snowman", "⛄", "snowflake=❄️:L man=👨:O"], ["butter", "fly", "butterfly", "🦋", "butter=🧈:O fly=🪰:O"],
  ["cup", "cake", "cupcake", "🧁", "pancake=🥞:F cup=☕:O"], ["pan", "cake", "pancake", "🥞", "cupcake=🧁:F cake=🎂:O"],
  ["foot", "ball", "football", "🏈", "basketball=🏀:F foot=🦶:O"], ["basket", "ball", "basketball", "🏀", "football=🏈:F basket=🧺:O"],
  ["tooth", "brush", "toothbrush", "🪥", "paintbrush=🖌️:F tooth=🦷:O"], ["sun", "glasses", "sunglasses", "🕶️", "sunflower=🌻:L glasses=👓:O"],
  ["snow", "flake", "snowflake", "❄️", "snowman=⛄:L snow=🌨️:O"], ["straw", "berry", "strawberry", "🍓", "blueberry=🫐:F straw=🥤:O"],
  ["blue", "berry", "blueberry", "🫐", "strawberry=🍓:F blue=🔵:O"], ["water", "melon", "watermelon", "🍉", "water=💧:O melon=🍈:O"],
  ["cow", "boy", "cowboy", "🤠", "cow=🐮:O boy=👦:O"], ["mail", "box", "mailbox", "📫", "toolbox=🧰:F box=📦:O"],
];
/** [first, second, key, wrong ones as "word:CODE"] */
type EsJoin = [string, string, string, string];
const ES_JOIN: EsJoin[] = [
  ["gira", "sol", "girasol", "solgira:R parasol:F"], ["para", "sol", "parasol", "solpara:R paraguas:L"], ["para", "aguas", "paraguas", "paraaguas:J parasol:L"],
  ["tela", "araña", "telaraña", "telaaraña:J araña:O"], ["rompe", "cabezas", "rompecabezas", "cabezasrompe:R rompeolas:L"], ["rasca", "cielos", "rascacielos", "cielosrasca:R cielo:O"],
  ["arco", "iris", "arcoíris", "irisarco:R arco:O"], ["alta", "voz", "altavoz", "vozalta:R alto:O"], ["pelo", "rojo", "pelirrojo", "pelorojo:J rojopelo:R"],
  ["medio", "día", "mediodía", "díamedio:R medio:O"], ["media", "noche", "medianoche", "nochemedia:R noche:O"], ["cumple", "años", "cumpleaños", "añoscumple:R años:O"],
  ["hierba", "buena", "hierbabuena", "buenahierba:R hierba:O"], ["porta", "folio", "portafolio", "folioporta:R portarretrato:L"], ["video", "juego", "videojuego", "juegovideo:R juego:O"],
  ["balón", "cesto", "baloncesto", "balóncesto:G cestobalón:R"],
];

const JOIN_MISS: Record<string, [string, string]> = {
  "wrong-last-word": ["has a different last word.", "tiene otra segunda palabra."],
  "wrong-first-word": ["has a different first word.", "tiene otra primera palabra."],
  "one-part-only": ["is only one of the two words.", "es solo una de las dos palabras."],
  "reversed-parts": ["has the parts the wrong way around.", "tiene las partes al revés."],
  "no-spelling-change": ["joins the parts without the spelling change.", "junta las partes sin el cambio de letras."],
  "kept-accent": ["keeps an accent mark the new word does not need.", "deja una tilde que ya no va."],
};

function joinQ(locale: Locale, a: string, b: string, key: string, choices: Q["choices"]): Q {
  const first = choices[1];
  const [en, es] = JOIN_MISS[first.why!];
  return {
    prompt: `${a} + ${b} = ___`,
    say: tr(locale, `Put ${a} and ${b} together. What word do you get?`, `Junta ${a} y ${b}. ¿Qué palabra se forma?`),
    choices,
    hints: [
      tr(locale, "A compound word is two small words joined.", "Una palabra compuesta junta dos palabras."),
      tr(locale, `Say ${a}, then say ${b} right after.`, `Di ${a} y luego ${b}, sin parar.`),
      tr(locale, `${cap(first.label)} ${en}`, `${cap(first.label)} ${es}`),
    ],
    steps: [`${a} + ${b} = ${key}`],
  };
}
const enJoinQ = ([a, b, key, p, spec]: EnJoin): Q =>
  joinQ("en", a, b, key, [
    pic(key, p),
    ...spec.split(" ").map((s) => {
      const [wp, code] = s.split(":");
      const [w, emoji] = wp.split("=");
      return pic(w, emoji, COMPOUND[code as keyof typeof COMPOUND]);
    }),
  ]);
const esJoinQ = ([a, b, key, spec]: EsJoin): Q => joinQ("es", a, b, key, [voiced(key, key), ...coded(COMPOUND, spec).map(([w, why]) => voiced(w, w, why))]);

// Level 2: what a compound means. The last word names the thing; the first tells which kind. English
// compounds are noun + noun; Spanish ones are verb + noun (abrelatas: abre + latas).
/** [compound, first part, second part, meaning, reversed meaning] */
type Mean = [string, string, string, string, string];
const EN_MEAN: Mean[] = [
  ["doghouse", "dog", "house", "a house for a dog", "a dog that lives in a house"], ["houseboat", "house", "boat", "a boat people live on", "a house where boats are kept"],
  ["boathouse", "boat", "house", "a house where boats are kept", "a boat people live on"], ["fishbowl", "fish", "bowl", "a bowl for a fish", "a fish shaped like a bowl"],
  ["bookshelf", "book", "shelf", "a shelf for books", "a book about shelves"], ["raincoat", "rain", "coat", "a coat for the rain", "rain that falls on a coat"],
  ["toothbrush", "tooth", "brush", "a brush for teeth", "a tooth used as a brush"], ["snowman", "snow", "man", "a man made of snow", "snow that falls on a man"],
  ["teacup", "tea", "cup", "a cup for tea", "tea in the shape of a cup"], ["handbag", "hand", "bag", "a bag you carry in your hand", "a hand that holds a bag"],
  ["birdhouse", "bird", "house", "a little house for birds", "a bird that lives in a house"], ["bedroom", "bed", "room", "a room with a bed", "a bed as big as a room"],
  ["lunchbox", "lunch", "box", "a box to carry lunch", "lunch shaped like a box"], ["mailbox", "mail", "box", "a box for mail", "mail that comes in a box"],
  ["goldfish", "gold", "fish", "a fish with a gold color", "gold shaped like a fish"], ["seashell", "sea", "shell", "a shell from the sea", "a sea full of shells"],
];
const ES_MEAN: Mean[] = [
  ["sacapuntas", "saca", "puntas", "algo para sacar punta a los lápices", "una punta que saca cosas"], ["abrelatas", "abre", "latas", "algo para abrir latas", "una lata que se abre sola"],
  ["lavaplatos", "lava", "platos", "algo para lavar platos", "un plato para lavar"], ["paraguas", "para", "aguas", "algo que para el agua de la lluvia", "un agua que se para"],
  ["cortaúñas", "corta", "uñas", "algo para cortar las uñas", "una uña que corta"], ["cuentagotas", "cuenta", "gotas", "algo para contar gotas", "una gota que cuenta"],
  ["espantapájaros", "espanta", "pájaros", "algo que espanta a los pájaros", "un pájaro que espanta"], ["guardarropa", "guarda", "ropa", "un lugar para guardar la ropa", "ropa que guarda cosas"],
  ["cascanueces", "casca", "nueces", "algo para cascar nueces", "una nuez que casca"], ["quitamanchas", "quita", "manchas", "algo para quitar manchas", "una mancha que quita cosas"],
  ["salvavidas", "salva", "vidas", "algo que salva vidas en el agua", "una vida que salva"], ["pisapapeles", "pisa", "papeles", "algo que pisa los papeles para que no se vuelen", "un papel que pisa"],
  ["tocadiscos", "toca", "discos", "un aparato para tocar discos", "un disco que toca música"], ["portalápices", "porta", "lápices", "algo para llevar lápices", "un lápiz que lleva cosas"],
  ["lavamanos", "lava", "manos", "un lugar para lavarse las manos", "una mano que lava"], ["girasol", "gira", "sol", "una flor que gira hacia el sol", "un sol que gira"],
];

function meanQ(locale: Locale, [w, a, b, meaning, reversed]: Mean): Q {
  // The "one part" miss names only the word that does not say what the thing is.
  const part = locale === "en" ? a : ({ papeles: "papel", nueces: "nuez", "lápices": "lápiz" } as Record<string, string>)[b] ?? b.replace(/s$/, "");
  const one = tr(locale, `a kind of ${a}`, `un tipo de ${part}`);
  return {
    prompt: tr(locale, `What is a ${w}?`, `¿Qué es un ${w}?`),
    say: tr(locale, `What is a ${w}?`, `¿Qué es un ${w}?`),
    choices: [word(meaning), word(reversed, "reversed-meaning"), word(one, "one-part-only")],
    hints: [
      tr(locale, "Find the two small words.", "Busca las dos palabras que la forman."),
      tr(locale, "The last word names the thing. The first tells which kind.", "La primera palabra dice qué hace. La segunda, sobre qué lo hace."),
      tr(locale, `A ${w} is a kind of ${b}.`, `Un ${w} hace algo con ${b}.`),
    ],
    steps: [tr(locale, `${a} + ${b}: ${meaning}.`, `${a} + ${b}: ${meaning}.`)],
  };
}

export const COMPOUND_WORDS: Entry[][] = [
  EN_JOIN.map((d, i) => ({ en: enJoinQ(d), es: esJoinQ(ES_JOIN[i]) })),
  EN_MEAN.map((d, i) => ({ en: meanQ("en", d), es: meanQ("es", ES_MEAN[i]) })),
];
