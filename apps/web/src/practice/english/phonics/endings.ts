import { cap, voiced, word, type Entry, type Q } from "./core";

// Grade 1 endings. English: the three sounds of -ed (listening), spelling with -ed, and adding -ing.
// Spanish: the matching endings of Spanish verbs, the participio (-ado, -ido: cantado, comido, and
// irregular ones like escrito, roto, hecho) and the gerundio (-ando, -iendo: cantando, comiendo, with
// leyendo, durmiendo, pidiendo). Worked examples in hints (frito, midiendo, creyendo) are verbs outside
// the banks, so a hint never shows the answer.

const tags = (map: Record<string, string>) => (spec: string) =>
  spec.split(" ").map((s) => {
    const [label, code] = s.split(":");
    if (!map[code]) throw new Error(`Unknown tag code in "${s}"`);
    return word(label, map[code]);
  });

// ---- e.ending.ed ----
// Level 1 (listening). English: [target, key with the same -ed sound, two words with the other sounds].
// The tag names the sound of the wrong word: t (jumped), d (played), or an extra syllable (painted).
const ED_SOUND: Record<string, string> = { t: "ed-as-t", d: "ed-as-d", id: "ed-as-extra-syllable" };
type EdHear = [string, string, string, string, string, string];
const EN_ED_HEAR: EdHear[] = [
  ["jumped", "hopped", "played", "d", "painted", "id"], ["kissed", "washed", "cleaned", "d", "planted", "id"], ["cooked", "helped", "rained", "d", "wanted", "id"],
  ["laughed", "walked", "smiled", "d", "needed", "id"], ["pushed", "fixed", "called", "d", "landed", "id"], ["played", "cleaned", "jumped", "t", "melted", "id"],
  ["hugged", "filled", "kissed", "t", "added", "id"], ["opened", "rolled", "cooked", "t", "shouted", "id"], ["climbed", "yelled", "pushed", "t", "counted", "id"],
  ["snowed", "cried", "baked", "t", "waited", "id"], ["painted", "planted", "hopped", "t", "rained", "d"], ["wanted", "needed", "washed", "t", "smiled", "d"],
  ["landed", "melted", "missed", "t", "called", "d"], ["added", "shouted", "looked", "t", "hugged", "d"], ["counted", "waited", "stopped", "t", "opened", "d"],
  ["floated", "mended", "picked", "t", "rolled", "d"],
];
// Spanish: [target, key with the same participle ending, a participle with the other ending, the gerund].
type EsHear = [string, string, string, string];
const ES_ED_HEAR: EsHear[] = [
  ["cantado", "saltado", "comido", "cantando"], ["comido", "bebido", "bailado", "comiendo"], ["bailado", "nadado", "vivido", "bailando"],
  ["vivido", "subido", "pintado", "viviendo"], ["jugado", "lavado", "corrido", "jugando"], ["corrido", "dormido", "jugado", "corriendo"],
  ["pintado", "cocinado", "salido", "pintando"], ["salido", "leído", "nadado", "saliendo"], ["nadado", "cantado", "bebido", "nadando"],
  ["bebido", "comido", "lavado", "bebiendo"], ["lavado", "jugado", "dormido", "lavando"], ["dormido", "vivido", "cocinado", "durmiendo"],
  ["cocinado", "pintado", "subido", "cocinando"], ["subido", "corrido", "saltado", "subiendo"], ["saltado", "bailado", "leído", "saltando"],
  ["leído", "salido", "cantado", "leyendo"],
];

function enEdHearQ([t, k, a, aSound, b, bSound]: EdHear): Q {
  const T = cap(t);
  return {
    prompt: `Which word ends with the same sound as ${t}?`,
    say: `${T}. Which word ends with the same sound?`,
    choices: [voiced(k, k), voiced(a, a, ED_SOUND[aSound]), voiced(b, b, ED_SOUND[bSound])],
    hints: ["Say each word. Listen to the very end.", "The ending -ed can sound like t, d, or id.", `${cap(a)} ends with a different sound.`],
    steps: [`${T} and ${k} end with the same sound.`],
  };
}
function esEdHearQ([t, k, other, gerund]: EsHear): Q {
  const T = cap(t);
  return {
    prompt: `¿Cuál termina igual que ${t}?`,
    say: `${T}. ¿Cuál termina igual que ${t}?`,
    choices: [voiced(k, k), voiced(other, other, "other-participle-ending"), voiced(gerund, gerund, "gerund-ending")],
    hints: [
      "Di cada palabra. Escucha el final.",
      "Unas palabras terminan en -ado, otras en -ido, otras en -ando o -iendo.",
      `${cap(gerund)} termina en -ndo, no como ${t}.`,
    ],
    steps: [`${T} y ${k} terminan igual.`],
  };
}

// Level 2 (spelling). English: base + ed. Spanish: the participle after "he". Codes: N not doubled,
// W doubled wrongly, P spelled by sound, K kept a silent e, Y kept a y, I changed a y wrongly,
// D a letter dropped | O -ado on an -er/-ir verb, U -ido on an -ar verb, R an irregular verb made
// regular, G the gerund.
const EN_ED_TAG = tags({ N: "did-not-double", W: "doubled-wrongly", P: "spelled-by-sound", K: "kept-silent-e", Y: "kept-y", I: "changed-y-wrongly", D: "dropped-letter" });
const ES_ED_TAG = tags({ O: "ado-for-ido", U: "ido-for-ado", R: "regular-for-irregular", G: "gerund-for-participle" });
type Spell = [string, string, string];
const EN_ED_SPELL: Spell[] = [
  ["hop", "hopped", "hoped:N hopt:P"], ["stop", "stopped", "stoped:N stopt:P"], ["bake", "baked", "bakeed:K bakt:P"], ["cry", "cried", "cryed:Y crid:P"],
  ["jump", "jumped", "jumpped:W jumpt:P"], ["play", "played", "plaied:I playd:P"], ["smile", "smiled", "smileed:K smild:P"], ["plant", "planted", "plantted:W plantid:P"],
  ["clap", "clapped", "claped:N clapt:P"], ["hug", "hugged", "huged:N hugd:P"], ["wash", "washed", "washhed:W washt:P"], ["wave", "waved", "waveed:K wavd:P"],
  ["try", "tried", "tryed:Y trid:P"], ["kiss", "kissed", "kised:D kist:P"], ["rain", "rained", "rainned:W raind:P"], ["skip", "skipped", "skiped:N skipt:P"],
];
const ES_ED_SPELL: Spell[] = [
  ["cantar", "cantado", "cantido:U cantando:G"], ["comer", "comido", "comado:O comiendo:G"], ["vivir", "vivido", "vivado:O viviendo:G"],
  ["jugar", "jugado", "jugido:U jugando:G"], ["escribir", "escrito", "escribido:R escribiendo:G"], ["abrir", "abierto", "abrido:R abriendo:G"],
  ["romper", "roto", "rompido:R rompiendo:G"], ["poner", "puesto", "ponido:R poniendo:G"], ["hacer", "hecho", "hacido:R haciendo:G"],
  ["ver", "visto", "vido:R viendo:G"], ["decir", "dicho", "decido:R diciendo:G"], ["volver", "vuelto", "volvido:R volviendo:G"],
  ["bailar", "bailado", "bailido:U bailando:G"], ["beber", "bebido", "bebado:O bebiendo:G"], ["salir", "salido", "salado:O saliendo:G"],
  ["cubrir", "cubierto", "cubrido:R cubriendo:G"],
];

function enEdSpellQ([base, key, spec]: Spell): Q {
  const others = EN_ED_TAG(spec);
  return {
    prompt: `${base} + ed = ___`,
    say: `Add e d to ${base}. Which spelling is right?`,
    choices: [word(key), ...others],
    hints: [
      "Look at how the base word ends.",
      "Silent e: add only d. Consonant and y: change y to i. Short vowel and one consonant: double it.",
      `${cap(others[0].label)} is not how ${base} adds -ed.`,
    ],
    steps: [`${base} + ed = ${key}`],
  };
}
function esEdSpellQ([inf, key, spec]: Spell): Q {
  const others = ES_ED_TAG(spec);
  return {
    prompt: `Yo he ___. (${inf})`,
    say: `Yo he … ¿Qué palabra va? El verbo es ${inf}.`,
    choices: [word(key), ...others],
    hints: [
      "Después de he va una palabra que termina en -ado o -ido, o una irregular.",
      inf.endsWith("ar") ? "Los verbos en -ar terminan en -ado." : "Los verbos en -er o -ir terminan en -ido, pero algunos cambian: de freír, frito.",
      // Not "does not go after he": salado does (he salado, from salar). It is only not a form of salir.
      `Con ${inf} no se dice ${others[0].label}.`,
    ],
    steps: [`Yo he ${key}.`],
  };
}

export const ENDING_ED: Entry[][] = [
  EN_ED_HEAR.map((d, i) => ({ en: enEdHearQ(d), es: esEdHearQ(ES_ED_HEAR[i]) })),
  EN_ED_SPELL.map((d, i) => ({ en: enEdSpellQ(d), es: esEdSpellQ(ES_ED_SPELL[i]) })),
];

// ---- e.ending.ing ----
// Level 1: words that just add the ending. Level 2: words that change first (run → running, make →
// making | dormir → durmiendo, leer → leyendo). The Spanish sentence answers "¿Qué estás haciendo?",
// which takes the gerundio: "Estoy dormido" is good Spanish for a state, but it does not say what you
// are doing, so the participle choice is plainly wrong there. Codes: N not doubled, K kept a silent e, W doubled
// wrongly, G dropped the g, D a letter dropped, I changed a y | E the wrong ending (-iendo on -ar,
// -ando on -er/-ir), P the participle, S no stem change, Y i kept where y belongs.
const EN_ING_TAG = tags({ N: "did-not-double", K: "kept-silent-e", W: "doubled-wrongly", G: "dropped-g", D: "dropped-letter", I: "changed-y-wrongly" });
const ES_ING_TAG = tags({ E: "wrong-ending", P: "participle-for-gerund", S: "no-stem-change", Y: "i-for-y" });
const EN_ING: Spell[][] = [
  [
    ["jump", "jumping", "jumpping:W jumpin:G"], ["sing", "singing", "singging:W singin:G"], ["read", "reading", "readding:W readin:G"],
    ["play", "playing", "plaing:D playin:G"], ["eat", "eating", "eatting:W eatin:G"], ["sleep", "sleeping", "sleepping:W sleepin:G"],
    ["look", "looking", "lookking:W lookin:G"], ["help", "helping", "helpping:W helpin:G"], ["walk", "walking", "walkking:W walkin:G"],
    ["fly", "flying", "fliing:I flyin:G"], ["cook", "cooking", "cookking:W cookin:G"], ["rain", "raining", "rainning:W rainin:G"],
    ["paint", "painting", "paintting:W paintin:G"], ["talk", "talking", "talkking:W talkin:G"], ["kick", "kicking", "kickking:W kickin:G"],
    ["draw", "drawing", "drawwing:W drawin:G"],
  ],
  [
    ["run", "running", "runing:N runnin:G"], ["sit", "sitting", "siting:N sittin:G"], ["swim", "swimming", "swiming:N swimmin:G"],
    ["hop", "hopping", "hoping:N hoppin:G"], ["make", "making", "makeing:K makking:W"], ["ride", "riding", "rideing:K ridding:W"],
    ["bake", "baking", "bakeing:K bakking:W"], ["smile", "smiling", "smileing:K smilling:W"], ["dig", "digging", "diging:N diggin:G"],
    ["skate", "skating", "skateing:K skatting:W"], ["shop", "shopping", "shoping:N shoppin:G"], ["write", "writing", "writeing:K writting:W"],
    ["cut", "cutting", "cuting:N cuttin:G"], ["dance", "dancing", "danceing:K dancin:G"], ["clap", "clapping", "claping:N clappin:G"],
    ["hike", "hiking", "hikeing:K hikking:W"],
  ],
];
const ES_ING: Spell[][] = [
  [
    ["cantar", "cantando", "cantiendo:E cantado:P"], ["comer", "comiendo", "comando:E comido:P"], ["bailar", "bailando", "bailiendo:E bailado:P"],
    ["escribir", "escribiendo", "escribando:E escrito:P"], ["jugar", "jugando", "jugiendo:E jugado:P"], ["correr", "corriendo", "corrando:E corrido:P"],
    ["nadar", "nadando", "nadiendo:E nadado:P"], ["beber", "bebiendo", "bebando:E bebido:P"], ["saltar", "saltando", "saltiendo:E saltado:P"],
    ["subir", "subiendo", "subando:E subido:P"], ["pintar", "pintando", "pintiendo:E pintado:P"], ["aprender", "aprendiendo", "aprendando:E aprendido:P"],
    ["cocinar", "cocinando", "cociniendo:E cocinado:P"], ["barrer", "barriendo", "barrando:E barrido:P"], ["lavar", "lavando", "laviendo:E lavado:P"],
    ["abrir", "abriendo", "abrando:E abierto:P"],
  ],
  [
    ["dormir", "durmiendo", "dormiendo:S dormido:P"], ["pedir", "pidiendo", "pediendo:S pedido:P"], ["decir", "diciendo", "deciendo:S dicho:P"],
    ["venir", "viniendo", "veniendo:S venido:P"], ["leer", "leyendo", "leiendo:Y leído:P"], ["oír", "oyendo", "oiendo:Y oído:P"],
    ["caer", "cayendo", "caiendo:Y caído:P"], ["traer", "trayendo", "traiendo:Y traído:P"], ["construir", "construyendo", "construiendo:Y construido:P"],
    ["ir", "yendo", "iendo:Y ido:P"], ["sentir", "sintiendo", "sentiendo:S sentido:P"], ["servir", "sirviendo", "serviendo:S servido:P"],
    ["seguir", "siguiendo", "seguiendo:S seguido:P"], ["elegir", "eligiendo", "elegiendo:S elegido:P"], ["reír", "riendo", "reiendo:S reído:P"],
    ["repetir", "repitiendo", "repetiendo:S repetido:P"],
  ],
];

function enIngQ(level: number) {
  return ([base, key, spec]: Spell): Q => {
    const others = EN_ING_TAG(spec);
    return {
      prompt: `${base} + ing = ___`,
      say: `Add i n g to ${base}. Which spelling is right?`,
      choices: [word(key), ...others],
      hints: [
        "Look at how the base word ends.",
        level === 1 ? "Most words just add -ing. Nothing else changes." : "Silent e: drop it. Short vowel and one consonant: double it.",
        `${cap(others[0].label)} is not how ${base} adds -ing.`,
      ],
      steps: [`${base} + ing = ${key}`],
    };
  };
}
function esIngQ(level: number) {
  return ([inf, key, spec]: Spell): Q => {
    const others = ES_ING_TAG(spec);
    return {
      prompt: `¿Qué estás haciendo? Estoy ___. (${inf})`,
      say: `¿Qué estás haciendo? Estoy … ¿Qué palabra va? El verbo es ${inf}.`,
      choices: [word(key), ...others],
      hints: [
        "Para decir lo que haces ahora, usa una palabra que termina en -ando o -iendo.",
        level === 1 ? "Los verbos en -ar terminan en -ando. Los verbos en -er o -ir, en -iendo." : "Algunos verbos cambian una letra: medir, midiendo; creer, creyendo.",
        `${cap(others[0].label)} no va después de estoy.`,
      ],
      steps: [`Estoy ${key}.`],
    };
  };
}

export const ENDING_ING: Entry[][] = [0, 1].map((i) => EN_ING[i].map((d, j) => ({ en: enIngQ(i + 1)(d), es: esIngQ(i + 1)(ES_ING[i][j]) })));
