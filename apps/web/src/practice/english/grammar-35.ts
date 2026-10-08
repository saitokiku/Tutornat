import type { Locale } from "@/lib/types";
import type { Rng } from "../rng";
import { tr } from "../text";
import type { Choice, ItemBody, MathPart, Skill } from "../types";

// Grades 3–5 grammar, usage and vocabulary. Every bank is hand-written (content "draft") except
// dictionary order, whose key is computed. Each slot has an English and a Spanish question; the Spanish one
// teaches the matching Spanish skill with Spanish words (tilde, concordancia, raya de diálogo, ¿?, ñ in
// alphabetical order, apócope…), not a translation of an English spelling rule. A seed picks the slot
// before anything else, so it lands on the same slot in both languages. Every wrong choice carries a
// misconception tag (`why`), reused across the items of a skill.

export type Bi<T> = { en: T; es: T };
const lang = <T>(locale: Locale, b: Bi<T>): T => (locale === "es" ? b.es : b.en);

/** A wrong choice and the misconception it shows. */
export type Wrong = [label: string, why: string];
/**
 * One question in one language. `show` is the sentence or words shown ("___" marks the blank, "" for none);
 * `clue` is hint 3 (this item's first step, never the answer); `why` is the worked explanation. `base` is
 * the word or rule the key comes from (a singular noun, a base verb, a relation…); only the tests read it,
 * to re-derive the key by a separate rule.
 */
export type G = [show: string, key: string, wrong: Wrong[], clue: string, why: string, base?: string];
/** A question answered with one of a fixed set of labels (tense names, sentence kinds…), which stay in place. */
export type L = [show: string, label: number, clue: string, why: string, base?: string];

type Common = { ask: Bi<string>; hints: Bi<[string, string]>; seconds: number };
export type PickLevel = Common & { bank: Bi<G>[] };
/** `tags[i]` names label i; choosing label i for label k is tagged "<tags[i]>-for-<tags[k]>". */
export type LabelLevel = Common & { labels: Bi<string[]>; tags: string[]; bank: Bi<L>[] };
export type Level = PickLevel | LabelLevel;
export const isLabel = (l: Level): l is LabelLevel => "labels" in l;

/** Pairs the English and Spanish lists slot by slot. */
function pair<T>(en: T[], es: T[]): Bi<T>[] {
  if (en.length !== es.length) throw new Error(`English has ${en.length} items, Spanish ${es.length}`);
  return en.map((e, i) => ({ en: e, es: es[i] }));
}
const bi = <T>(en: T, es: T): Bi<T> => ({ en, es });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "___" becomes the answer blank. */
function blanked(s: string): MathPart[] {
  const [before, after] = s.split("___");
  return [...(before ? [before] : []), { blank: true }, ...(after ? [after] : [])];
}
const fill = (s: string, word: string) => cap(s.replace("___", word));
const sayBlank = (locale: Locale, s: string) => s.replace("___", tr(locale, "blank", "espacio en blanco"));

function body(locale: Locale, lv: Level, show: string, choices: Choice[], index: number, clue: string, why: string, key: string): ItemBody {
  const ask = lang(locale, lv.ask);
  const blank = show.includes("___");
  const prompt: MathPart[] = !show ? [ask] : blank ? [`${ask}\n\n`, ...blanked(show)] : [`${show}\n\n${ask}`];
  // Read aloud as one line: a shown word list or label line ends with a pause before the question.
  const said = /[.?:”"]$/.test(show) ? show : `${show}.`;
  const say = (!show ? ask : blank ? `${ask} ${sayBlank(locale, show)}` : `${said} ${ask}`).replace(/\s*\n+\s*/g, " ");
  const last = blank ? fill(show, key) : tr(locale, `Answer: ${key}`, `Respuesta: ${key}`);
  const [h1, h2] = lang(locale, lv.hints);
  return { prompt, say, choices, input: "choices", answer: { kind: "choice", index }, hints: [h1, h2, clue], steps: [why, last], seconds: lv.seconds };
}

/** Builds items from a skill's levels: pick the slot, then shuffle the choices (labels stay in place). */
function fromLevels(levels: Level[]): Skill["generate"] {
  return (r: Rng, level: number, locale: Locale): ItemBody => {
    const lv = levels[level - 1];
    if (isLabel(lv)) {
      const [show, label, clue, why] = lang(locale, r.pick(lv.bank));
      const names = lang(locale, lv.labels);
      const choices = names.map((n, i): Choice => (i === label ? { label: n } : { label: n, why: `${lv.tags[i]}-for-${lv.tags[label]}` }));
      return body(locale, lv, show, choices, label, clue, why, names[label]);
    }
    const [show, key, wrong, clue, why] = lang(locale, r.pick(lv.bank));
    const choices = r.shuffle<Choice>([{ label: key }, ...wrong.map(([label, w]) => ({ label, why: w }))]);
    return body(locale, lv, show, choices, choices.findIndex((c) => c.label === key), clue, why, key);
  };
}

// ---------------------------------------------------------------------------------------------------
// e.abstract.nouns (3) — level 1: pick the abstract noun from four words; level 2: find it in a sentence.
// Wrong choices are concrete nouns, or the adjective or verb the abstract noun comes from.

/** [abstract noun, related word, its kind, two concrete nouns with an article] */
type Abs = [string, string, "adj" | "verb", string, string];
const EN_ABS: Abs[] = [
  ["bravery", "brave", "adj", "a helmet", "a ladder"], ["friendship", "friendly", "adj", "a sandwich", "a bicycle"],
  ["kindness", "kind", "adj", "a blanket", "a puppy"], ["joy", "joyful", "adj", "a balloon", "a cookie"],
  ["honesty", "honest", "adj", "a pencil", "a teacher"], ["freedom", "free", "adj", "a bird", "a cage"],
  ["fear", "afraid", "adj", "a spider", "a flashlight"], ["knowledge", "know", "verb", "a library", "a computer"],
  ["curiosity", "curious", "adj", "a kitten", "a telescope"], ["pride", "proud", "adj", "a trophy", "a medal"],
  ["childhood", "grow", "verb", "a toy", "a swing"], ["loyalty", "loyal", "adj", "a dog", "a collar"],
  ["sadness", "sad", "adj", "a tissue", "a raincoat"], ["choice", "choose", "verb", "a menu", "an apple"],
  ["hope", "hopeful", "adj", "a seed", "a flowerpot"], ["peace", "peaceful", "adj", "a pillow", "a river"],
];
const ES_ABS: Abs[] = [
  ["valentía", "valiente", "adj", "un casco", "una escalera"], ["amistad", "amistoso", "adj", "un sándwich", "una bicicleta"],
  ["bondad", "bondadoso", "adj", "una manta", "un perrito"], ["alegría", "alegre", "adj", "un globo", "una galleta"],
  ["honestidad", "honesto", "adj", "un lápiz", "una maestra"], ["libertad", "libre", "adj", "un pájaro", "una jaula"],
  ["miedo", "miedoso", "adj", "una araña", "una linterna"], ["conocimiento", "conocer", "verb", "una biblioteca", "una computadora"],
  ["curiosidad", "curioso", "adj", "un gatito", "un telescopio"], ["orgullo", "orgulloso", "adj", "un trofeo", "una medalla"],
  ["infancia", "crecer", "verb", "un juguete", "un columpio"], ["lealtad", "leal", "adj", "un perro", "un collar"],
  ["tristeza", "triste", "adj", "un pañuelo", "un impermeable"], ["paciencia", "esperar", "verb", "un reloj", "una silla"],
  ["esperanza", "esperanzado", "adj", "una semilla", "una maceta"], ["justicia", "justo", "adj", "una balanza", "una mesa"],
];
const bare = (s: string) => s.replace(/^(an?|un|una) /, "");

function absQ(locale: Locale, [key, rel, kind, c1, c2]: Abs): G {
  const relTag = kind === "adj" ? "adjective-not-noun" : "verb-not-noun";
  return [
    "",
    key,
    [[rel, relTag], [bare(c1), "concrete-noun"], [bare(c2), "concrete-noun"]],
    tr(
      locale,
      `Start with "${bare(c1)}": can you see or touch ${c1}? Now ask the same of the other words, and check that each one is a noun.`,
      `Empieza con "${bare(c1)}": ¿se puede ver o tocar ${c1}? Haz la misma pregunta con las demás palabras y revisa que cada una sea un sustantivo.`,
    ),
    tr(locale, `"${key}" names something you cannot see, hear, touch, taste, or smell.`, `"${key}" nombra algo que no se puede ver, oír, tocar, probar ni oler.`),
  ];
}

/** [sentence, abstract noun, concrete nouns from the sentence, verbs or adjectives from the sentence] */
type AbsIn = [string, string, string[], [string, "adj" | "verb"][]];
const EN_ABS_IN: AbsIn[] = [
  ["Mia felt great joy when her kitten came home.", "joy", ["kitten"], [["felt", "verb"], ["great", "adj"]]],
  ["The firefighter showed courage during the storm.", "courage", ["firefighter", "storm"], [["showed", "verb"]]],
  ["Leo told the truth about the broken vase.", "truth", ["vase"], [["broken", "adj"], ["told", "verb"]]],
  ["Grandpa has a lot of wisdom about gardens.", "wisdom", ["Grandpa", "gardens"], [["has", "verb"]]],
  ["Curiosity led the puppy under the fence.", "Curiosity", ["puppy", "fence"], [["led", "verb"]]],
  ["Ana's kindness made the new student smile.", "kindness", ["student"], [["new", "adj"], ["smile", "verb"]]],
  ["We cheered with pride for our soccer team.", "pride", ["team"], [["cheered", "verb"]]],
  ["The dark hallway filled Sam with fear.", "fear", ["hallway"], [["dark", "adj"], ["filled", "verb"]]],
  ["Their friendship began on the school bus.", "friendship", ["bus"], [["began", "verb"]]],
  ["The museum guide shared her knowledge of fossils.", "knowledge", ["guide", "fossils"], [["shared", "verb"]]],
  ["Jada waited for the train with patience.", "patience", ["train", "Jada"], [["waited", "verb"]]],
  ["The hikers felt relief at the top of the hill.", "relief", ["hikers", "hill"], [["felt", "verb"]]],
  ["Kai showed great skill on the piano.", "skill", ["piano"], [["showed", "verb"], ["great", "adj"]]],
  ["Our town celebrated its freedom with a parade.", "freedom", ["town", "parade"], [["celebrated", "verb"]]],
  ["Honesty is important to my family.", "Honesty", ["family"], [["important", "adj"]]],
];
const ES_ABS_IN: AbsIn[] = [
  ["Mía sintió mucha alegría cuando su gatita volvió.", "alegría", ["gatita"], [["sintió", "verb"], ["volvió", "verb"]]],
  ["El bombero mostró valentía durante la tormenta.", "valentía", ["bombero", "tormenta"], [["mostró", "verb"]]],
  ["Leo dijo la verdad sobre el florero roto.", "verdad", ["florero"], [["roto", "adj"], ["dijo", "verb"]]],
  ["Mi abuelo tiene mucha sabiduría sobre los jardines.", "sabiduría", ["abuelo", "jardines"], [["tiene", "verb"]]],
  ["La curiosidad llevó al cachorro bajo la cerca.", "curiosidad", ["cachorro", "cerca"], [["llevó", "verb"]]],
  ["La bondad de Ana hizo sonreír al estudiante nuevo.", "bondad", ["estudiante"], [["nuevo", "adj"], ["sonreír", "verb"]]],
  ["Aplaudimos con orgullo a nuestro equipo de fútbol.", "orgullo", ["equipo"], [["Aplaudimos", "verb"]]],
  ["El pasillo oscuro le dio miedo a Sam.", "miedo", ["pasillo"], [["oscuro", "adj"], ["dio", "verb"]]],
  ["Su amistad empezó en el autobús escolar.", "amistad", ["autobús"], [["empezó", "verb"]]],
  ["La guía del museo compartió su conocimiento de los fósiles.", "conocimiento", ["guía", "fósiles"], [["compartió", "verb"]]],
  ["Jada esperó el tren con paciencia.", "paciencia", ["tren", "Jada"], [["esperó", "verb"]]],
  ["Los excursionistas sintieron alivio en la cima del cerro.", "alivio", ["excursionistas", "cerro"], [["sintieron", "verb"]]],
  ["Kai tiene mucha habilidad con el piano.", "habilidad", ["piano"], [["tiene", "verb"]]],
  ["El pueblo celebró su libertad con un desfile.", "libertad", ["pueblo", "desfile"], [["celebró", "verb"]]],
  ["La honestidad es importante para mi familia.", "honestidad", ["familia"], [["importante", "adj"]]],
];

function absInQ(locale: Locale, [s, key, things, others]: AbsIn): G {
  const wrong: Wrong[] = [...things.map((t): Wrong => [t, "concrete-noun"]), ...others.map(([w, k]): Wrong => [w, k === "adj" ? "adjective-not-noun" : "verb-not-noun"])].slice(0, 3);
  // Hint 3 models the test on one word only, so it never rules out every wrong choice.
  const [t] = things;
  return [
    `“${s}”`,
    key,
    wrong,
    tr(
      locale,
      `Start with "${t}": can you see or touch what it names? Now ask the same of the other words, and check that each one is a noun.`,
      `Empieza con "${t}": ¿se puede ver o tocar lo que nombra? Haz la misma pregunta con las demás palabras y revisa que cada una sea un sustantivo.`,
    ),
    tr(locale, `"${key}" names something you cannot see, hear, touch, taste, or smell.`, `"${key}" nombra algo que no se puede ver, oír, tocar, probar ni oler.`),
  ];
}

const ABSTRACT: Level[] = [
  {
    ask: bi("Which word is an abstract noun?", "¿Cuál es un sustantivo abstracto?"),
    hints: bi(
      ["An abstract noun names an idea, a feeling, or a quality.", "Ask of each word: can I see it, hear it, or touch it? Is it a noun at all?"],
      ["Un sustantivo abstracto nombra una idea, un sentimiento o una cualidad.", "Pregúntate de cada palabra: ¿la puedo ver, oír o tocar? ¿Es un sustantivo?"],
    ),
    seconds: 12,
    bank: pair(EN_ABS.map((d) => absQ("en", d)), ES_ABS.map((d) => absQ("es", d))),
  },
  {
    ask: bi("Which word in the sentence is an abstract noun?", "¿Qué palabra de la oración es un sustantivo abstracto?"),
    hints: bi(
      ["An abstract noun names an idea, a feeling, or a quality.", "Find the nouns first. Then ask which one you cannot see, hear, or touch."],
      ["Un sustantivo abstracto nombra una idea, un sentimiento o una cualidad.", "Busca primero los sustantivos. Luego pregúntate cuál no se puede ver, oír ni tocar."],
    ),
    seconds: 20,
    bank: pair(EN_ABS_IN.map((d) => absInQ("en", d)), ES_ABS_IN.map((d) => absInQ("es", d))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.irregular.plurals (3) — English: level 1 irregular nouns (mice, oxen, sheep), level 2 spelling changes
// (-y, -o, -f). Spanish: level 1 z → ces and the tilde that comes or goes (lápices, camiones, jóvenes),
// level 2 words ending in -s or -y (los lunes, los meses, los reyes).

/** [sentence, singular, plural, wrong plurals with tags, clue] */
type Pl = [string, string, string, Wrong[], string];
const plQ = ([s, one, many, wrong, clue]: Pl): G => [s, many, wrong, clue, `One ${one}, two ${many}.`, one];
const plQes = ([s, one, many, wrong, clue, art]: [...Pl, string]): G => [s, many, wrong, clue, `${cap(art)} ${one}, ${/^(una|la)$/.test(art) ? "las" : "los"} ${many}.`, one];

const EN_PL1: Pl[] = [
  ["Three ___ ran into the barn.", "mouse", "mice", [["mouses", "added-s-to-irregular"], ["mices", "doubled-plural"], ["mouse", "singular-for-plural"]], "Mouse does not add -s. Its vowel sound changes."],
  ["The dentist cleaned all my ___.", "tooth", "teeth", [["tooths", "added-s-to-irregular"], ["teeths", "doubled-plural"], ["tooth", "singular-for-plural"]], "Tooth changes its vowel sound for more than one, like foot."],
  ["Two ___ swam across the pond.", "goose", "geese", [["gooses", "added-s-to-irregular"], ["geeses", "doubled-plural"], ["goose", "singular-for-plural"]], "Goose changes its vowel sound, like tooth."],
  ["My ___ are cold after playing in the snow.", "foot", "feet", [["foots", "added-s-to-irregular"], ["feets", "doubled-plural"]], "Foot changes its vowel sound. It does not add -s."],
  ["The farmer hitched two ___ to the cart.", "ox", "oxen", [["oxes", "added-s-to-irregular"], ["oxens", "doubled-plural"]], "Ox is a very old word. Think of how child makes its plural."],
  ["All the ___ on the team wore green.", "child", "children", [["childs", "added-s-to-irregular"], ["childrens", "doubled-plural"], ["child", "singular-for-plural"]], "Child does not add -s. Say \"one child, many\" and finish it out loud."],
  ["Five ___ grazed on the hill.", "sheep", "sheep", [["sheeps", "added-s-to-unchanging"], ["sheepes", "added-s-to-unchanging"]], "Think of one sheep, then a whole field of them. Does the word change?"],
  ["We saw three ___ at the edge of the forest.", "deer", "deer", [["deers", "added-s-to-unchanging"], ["deeres", "added-s-to-unchanging"]], "Think of one deer, then a whole herd. Does the word change for more than one?"],
  ["Two ___ helped carry the piano.", "man", "men", [["mans", "added-s-to-irregular"], ["mens", "doubled-plural"], ["man", "singular-for-plural"]], "Man changes its vowel for more than one."],
  ["The ___ in my family love to cook.", "woman", "women", [["womans", "added-s-to-irregular"], ["womens", "doubled-plural"]], "Woman changes like man: only the vowel in the last part changes."],
  ["We spotted two ___ near the lake.", "moose", "moose", [["mooses", "added-s-to-unchanging"], ["meese", "vowel-change-by-analogy"]], "Moose came into English from a Native American language, not from the old word family of goose. Does moose change for more than one?"],
  ["Roll both ___ and add the numbers.", "die", "dice", [["dies", "added-s-to-irregular"], ["dices", "doubled-plural"]], "A die is the little cube with dots. Its plural is a different word, the one used in board games."],
  ["The ___ lined up for lunch.", "child", "children", [["childs", "added-s-to-irregular"], ["childrens", "doubled-plural"]], "Child does not add -s. Say \"one child, many\" and finish it out loud."],
  ["Those two ___ are best friends.", "woman", "women", [["womans", "added-s-to-irregular"], ["womens", "doubled-plural"], ["woman", "singular-for-plural"]], "Woman changes like man: only the vowel in the last part changes."],
];
const ES_PL1: [...Pl, string][] = [
  ["En el estuche hay tres ___.", "lápiz", "lápices", [["lápizes", "kept-z"], ["lápiz", "singular-for-plural"]], "Lápiz termina en z. Antes de -es, la z cambia de letra.", "un"],
  ["En la pecera nadan cinco ___.", "pez", "peces", [["pezes", "kept-z"], ["pezs", "added-s-after-consonant"]], "Pez termina en z. Antes de -es, la z cambia de letra.", "un"],
  ["Prendimos todas las ___ de la casa.", "luz", "luces", [["luzes", "kept-z"], ["luzs", "added-s-after-consonant"]], "Luz termina en z. Antes de -es, la z cambia de letra.", "una"],
  ["Los ___ cargaban arena.", "camión", "camiones", [["camiónes", "kept-accent"], ["camions", "added-s-after-consonant"]], "Camión lleva tilde por ser aguda en -n. Con -es, la sílaba fuerte ya no es la última.", "un"],
  ["En el granero viven muchos ___.", "ratón", "ratones", [["ratónes", "kept-accent"], ["ratons", "added-s-after-consonant"]], "Ratón lleva tilde por ser aguda en -n. Con -es, ¿sigue siendo aguda?", "un"],
  ["Los ___ jugaron fútbol en el parque.", "joven", "jóvenes", [["jovenes", "forgot-new-accent"], ["jóvens", "added-s-after-consonant"]], "Joven es llana. Con -es, la sílaba fuerte queda tercera desde el final.", "un"],
  ["Esta semana tuve dos ___.", "examen", "exámenes", [["examenes", "forgot-new-accent"], ["exámens", "added-s-after-consonant"]], "Examen es llana. Con -es, la sílaba fuerte queda tercera desde el final.", "un"],
  ["En el zoológico vimos tres ___.", "león", "leones", [["leónes", "kept-accent"], ["leons", "added-s-after-consonant"]], "León lleva tilde por ser aguda en -n. Con -es, ¿sigue siendo aguda?", "un"],
  ["Las ___ del coro sonaban muy bonito.", "voz", "voces", [["vozes", "kept-z"], ["vozs", "added-s-after-consonant"]], "Voz termina en z. Antes de -es, la z cambia de letra.", "una"],
  ["Los payasos tenían ___ rojas.", "nariz", "narices", [["narizes", "kept-z"], ["narizs", "added-s-after-consonant"]], "Nariz termina en z. Antes de -es, la z cambia de letra.", "una"],
  ["Los ___ salieron a tiempo.", "avión", "aviones", [["aviónes", "kept-accent"], ["avions", "added-s-after-consonant"]], "Avión lleva tilde por ser aguda en -n. Con -es, ¿sigue siendo aguda?", "un"],
  ["El libro tiene muchas ___.", "imagen", "imágenes", [["imagenes", "forgot-new-accent"], ["imágens", "added-s-after-consonant"]], "Imagen es llana. Con -es, la sílaba fuerte queda tercera desde el final.", "una"],
  ["En la tierra del jardín encontramos ___.", "lombriz", "lombrices", [["lombrizes", "kept-z"], ["lombriz", "singular-for-plural"]], "Lombriz termina en z. Antes de -es, la z cambia de letra.", "una"],
  ["Cantamos dos ___ en la clase de música.", "canción", "canciones", [["canciónes", "kept-accent"], ["cancions", "added-s-after-consonant"]], "Canción lleva tilde por ser aguda en -n. Con -es, ¿sigue siendo aguda?", "una"],
];

const EN_PL2: Pl[] = [
  ["The bakery sold six ___ of bread.", "loaf", "loaves", [["loafs", "kept-f"], ["loafes", "kept-f"]], "Loaf ends in f, like leaf and half."],
  ["We picked a basket of ___.", "berry", "berries", [["berrys", "kept-y-after-consonant"], ["berryes", "kept-y-after-consonant"]], "Berry ends in a consonant and y."],
  ["The ___ played tag in the yard.", "puppy", "puppies", [["puppys", "kept-y-after-consonant"], ["puppyes", "kept-y-after-consonant"]], "Puppy ends in a consonant and y."],
  ["Leo keeps all his ___ in a big box.", "toy", "toys", [["toies", "changed-y-after-vowel"], ["toyes", "added-es-after-y"]], "Toy ends in a vowel and y."],
  ["We need two ___ for the soup.", "potato", "potatoes", [["potatos", "forgot-es-after-o"], ["potato", "singular-for-plural"]], "Potato ends in o, like tomato. These two add -es."],
  ["The band has two ___ on the stage.", "piano", "pianos", [["pianoes", "added-es-after-o"], ["piano", "singular-for-plural"]], "Piano ends in o, but it is a short form of a longer word. Music words like this add only -s."],
  ["We cut the apple into two ___.", "half", "halves", [["halfs", "kept-f"], ["halfes", "kept-f"]], "Half ends in f, like leaf."],
  ["The ___ howled at the moon.", "wolf", "wolves", [["wolfs", "kept-f"], ["wolfes", "kept-f"]], "Wolf ends in f, like half."],
  ["The cows and their ___ rested in the shade.", "calf", "calves", [["calfs", "kept-f"], ["calfes", "kept-f"]], "Calf ends in f, like half."],
  ["Seabirds nest on the ___ by the ocean.", "cliff", "cliffs", [["clives", "changed-f-to-v"], ["cliffes", "added-es-after-f"]], "Cliff ends in ff. Words that end in ff just add -s."],
  ["There are many big ___ in our state.", "city", "cities", [["citys", "kept-y-after-consonant"], ["cityes", "kept-y-after-consonant"]], "City ends in a consonant and y."],
  ["Our class watched two ___ about volcanoes.", "video", "videos", [["videoes", "added-es-after-o"], ["video", "singular-for-plural"]], "Video ends in a vowel and o. It just adds -s."],
  ["The ___ swung from branch to branch.", "monkey", "monkeys", [["monkies", "changed-y-after-vowel"], ["monkeyes", "added-es-after-y"]], "Monkey ends in a vowel and y."],
  ["Mom grew ripe ___ in the garden.", "tomato", "tomatoes", [["tomatos", "forgot-es-after-o"], ["tomato", "singular-for-plural"]], "Tomato ends in o, like potato. These two add -es."],
];
const ES_PL2: [...Pl, string][] = [
  ["Los ___ tengo clase de natación.", "lunes", "lunes", [["luneses", "added-es-to-llana-s"], ["lune", "dropped-final-s"]], "Lunes es llana y termina en s.", "el"],
  ["En mayo celebramos dos ___: el mío y el de mi hermano.", "cumpleaños", "cumpleaños", [["cumpleañoses", "added-es-to-llana-s"], ["cumpleaño", "dropped-final-s"]], "Cumpleaños es llana y termina en s.", "el"],
  ["Abrimos los ___ porque empezó a llover.", "paraguas", "paraguas", [["paraguases", "added-es-to-llana-s"], ["paragua", "dropped-final-s"]], "Paraguas es llana y termina en s.", "el"],
  ["El año tiene doce ___.", "mes", "meses", [["mes", "kept-aguda-s-unchanged"], ["mess", "added-s-after-consonant"]], "Mes tiene una sola sílaba y termina en s.", "el"],
  ["En nuestro viaje visitamos tres ___.", "país", "países", [["país", "kept-aguda-s-unchanged"], ["paises", "dropped-needed-accent"]], "País es aguda y termina en s. Su í se pronuncia aparte de la a.", "el"],
  ["Los ___ escolares llegan a las siete.", "autobús", "autobuses", [["autobúses", "kept-accent"], ["autobús", "kept-aguda-s-unchanged"]], "Autobús es aguda y termina en s. Con -es, ¿sigue siendo aguda?", "el"],
  ["En el cuento había dos ___ muy sabios.", "rey", "reyes", [["reys", "added-s-after-y"], ["reis", "changed-y-to-i"]], "Rey termina en y después de una vocal.", "el"],
  ["Los ___ tiraban del arado.", "buey", "bueyes", [["bueys", "added-s-after-y"], ["bueis", "changed-y-to-i"]], "Buey termina en y después de una vocal, como rey.", "el"],
  ["Las ___ protegen a los animales del parque.", "ley", "leyes", [["leys", "added-s-after-y"], ["leis", "changed-y-to-i"]], "Ley termina en y después de una vocal, como rey.", "la"],
  ["Compré dos ___ para la clase de dibujo.", "sacapuntas", "sacapuntas", [["sacapuntases", "added-es-to-llana-s"], ["sacapunta", "dropped-final-s"]], "Sacapuntas es llana y termina en s.", "el"],
  ["Los ___ son mis días favoritos.", "viernes", "viernes", [["vierneses", "added-es-to-llana-s"], ["vierne", "dropped-final-s"]], "Viernes es llana y termina en s, como lunes.", "el"],
  ["En la cocina hay dos ___.", "abrelatas", "abrelatas", [["abrelatases", "added-es-to-llana-s"], ["abrelata", "dropped-final-s"]], "Abrelatas es llana y termina en s.", "el"],
  ["En la clase de geometría usamos dos ___.", "compás", "compases", [["compáses", "kept-accent"], ["compás", "kept-aguda-s-unchanged"]], "Compás es aguda y termina en s. Con -es, ¿sigue siendo aguda?", "el"],
  ["Los ___ pueden causar resfriados.", "virus", "virus", [["viruses", "added-es-to-llana-s"], ["viru", "dropped-final-s"]], "Virus es llana y termina en s.", "el"],
];

const IRREGULAR_PLURALS: Level[] = [
  {
    ask: bi("Choose the plural that completes the sentence.", "Elige el plural que completa la oración."),
    hints: bi(
      ["Read the whole sentence. How many are there?", "Some nouns do not just add -s. They change inside, or they stay the same."],
      ["Lee toda la oración. ¿Cuántos hay?", "Si la palabra termina en z, la z cambia antes de -es. Al agregar -es, la tilde puede quitarse o aparecer."],
    ),
    seconds: 15,
    bank: pair(EN_PL1.map(plQ), ES_PL1.map(plQes)),
  },
  {
    ask: bi("Choose the plural that completes the sentence.", "Elige el plural que completa la oración."),
    hints: bi(
      ["Look at how the word ends: a consonant and y, a vowel and y, o, or f.", "Consonant + y: change y to i and add -es. Vowel + y: add -s. Some words in f change f to v and add -es."],
      ["Mira cómo termina la palabra y dónde está su sílaba fuerte.", "Si termina en s y es llana, no cambia. Si es aguda o tiene una sola sílaba, se agrega -es. Si termina en y, se agrega -es."],
    ),
    seconds: 15,
    bank: pair(EN_PL2.map(plQ), ES_PL2.map(plQes)),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.possessives (3) — English apostrophes: level 1 one owner ('s), level 2 more than one owner (s' and
// children's). Spanish has no apostrophe: the possessive agrees with the thing owned, not the owner
// (sus libros, su perro), and has no tilde (mí and tú are other words); level 2 nuestro/a/os/as.

/** [sentence, owner as written in the key, wrong forms, clue] */
type Own = [string, string, Wrong[], string];
const ownQ = ([s, owner, wrong, clue]: Own): G => {
  const plural = owner.endsWith("s");
  const key = plural ? `${owner}'` : `${owner}'s`;
  const why = plural
    ? `The owners are ${owner}. That already ends in s, so add only an apostrophe.`
    : /^(children|women|men|mice|geese)$/.test(owner)
      ? `${cap(owner)} is plural but does not end in s, so add an apostrophe and s.`
      : `Add an apostrophe and s to ${owner} to show that one owner has it.`;
  return [s, key, wrong, clue, why, owner];
};
// Each sentence fixes the number of owners itself (each, one, a, she, its…), so the plural possessive is
// really wrong and not just less likely.
const EN_OWN1: Own[] = [
  ["Each ___ backpack has a name tag.", "student", [["students", "missing-apostrophe"], ["students'", "plural-for-singular"]], "Each backpack belongs to one student."],
  ["A robin built a nest. The ___ nest was high in the oak tree.", "robin", [["robins", "missing-apostrophe"], ["robins'", "plural-for-singular"]], "The nest belongs to one robin."],
  ["We played catch in ___ yard.", "Maya", [["Mayas", "missing-apostrophe"], ["Mayas'", "plural-for-singular"]], "The yard belongs to Maya."],
  ["The ___ whistle was very loud when she blew it.", "coach", [["coaches", "missing-apostrophe"], ["coaches'", "plural-for-singular"]], "The whistle belongs to one coach."],
  ["Our ___ voice is calm when she reads to us.", "teacher", [["teachers", "missing-apostrophe"], ["teachers'", "plural-for-singular"]], "The voice belongs to one teacher."],
  ["My turtle hides in its shell. The ___ shell is hard.", "turtle", [["turtles", "missing-apostrophe"], ["turtles'", "plural-for-singular"]], "The shell belongs to one turtle."],
  ["I borrowed ___ bike for the race.", "Omar", [["Omars", "missing-apostrophe"], ["Omars'", "plural-for-singular"]], "The bike belongs to Omar."],
  ["One ___ leaves turned orange before all the others.", "tree", [["trees", "missing-apostrophe"], ["trees'", "plural-for-singular"]], "The leaves belong to one tree."],
  ["My ___ guitar is old, but he still plays it every day.", "uncle", [["uncles", "missing-apostrophe"], ["uncles'", "plural-for-singular"]], "The guitar belongs to one uncle."],
  ["Our zoo has one lion. The ___ roar echoed across the zoo.", "lion", [["lions", "missing-apostrophe"], ["lions'", "plural-for-singular"]], "The roar belongs to one lion."],
  ["The ___ crib is next to the window, and she naps there every day.", "baby", [["babies", "missing-apostrophe"], ["babies'", "plural-for-singular"]], "The crib belongs to one baby."],
  ["A truck rumbled past. The ___ engine was loud.", "truck", [["trucks", "missing-apostrophe"], ["trucks'", "plural-for-singular"]], "The engine belongs to one truck."],
  ["We read ___ poem in class.", "Kenji", [["Kenjis", "missing-apostrophe"], ["Kenjis'", "plural-for-singular"]], "The poem belongs to Kenji."],
  ["The ___ front door is red, and its windows are white.", "house", [["houses", "missing-apostrophe"], ["houses'", "plural-for-singular"]], "The front door belongs to one house."],
];
const EN_OWN2: Own[] = [
  ["The two ___ bowls are empty.", "dogs", [["dog's", "singular-for-plural"], ["dogs's", "added-s-after-plural-s"]], "More than one dog owns the bowls. The plural is dogs."],
  ["All the ___ coats hang in the hall.", "students", [["student's", "singular-for-plural"], ["students's", "added-s-after-plural-s"]], "The coats belong to all the students, more than one."],
  ["The ___ playground is behind the school.", "children", [["childrens'", "apostrophe-after-irregular-plural"], ["childrens", "missing-apostrophe"]], "The playground belongs to the children. Children does not end in s."],
  ["My three ___ bikes are in the garage.", "brothers", [["brother's", "singular-for-plural"], ["brothers's", "added-s-after-plural-s"]], "The bikes belong to three brothers. The plural is brothers."],
  ["The ___ team won the relay race.", "women", [["womens'", "apostrophe-after-irregular-plural"], ["womens", "missing-apostrophe"]], "The team belongs to the women. Women does not end in s."],
  ["All the ___ nests were on the cliff.", "birds", [["bird's", "singular-for-plural"], ["birds's", "added-s-after-plural-s"]], "The nests belong to all the birds, more than one."],
  ["We heard the ___ squeaks in the attic.", "mice", [["mices'", "apostrophe-after-irregular-plural"], ["mices", "missing-apostrophe"]], "The squeaks belong to the mice. Mice does not end in s."],
  ["The ___ locker room is downstairs.", "men", [["mens'", "apostrophe-after-irregular-plural"], ["mens", "missing-apostrophe"]], "The locker room belongs to the men. Men does not end in s."],
  ["Both ___ trunks were long.", "elephants", [["elephant's", "singular-for-plural"], ["elephants's", "added-s-after-plural-s"]], "The trunks belong to both elephants. The plural is elephants."],
  ["The ___ feathers were gray and white.", "geese", [["geeses'", "apostrophe-after-irregular-plural"], ["geeses", "missing-apostrophe"]], "The feathers belong to the geese. Geese does not end in s."],
  ["The two ___ fans cheered loudly.", "teams", [["team's", "singular-for-plural"], ["teams's", "added-s-after-plural-s"]], "The fans belong to two teams. The plural is teams."],
  ["The two ___ room has bunk beds.", "twins", [["twin's", "singular-for-plural"], ["twins's", "added-s-after-plural-s"]], "The room belongs to two twins. The plural is twins."],
  ["All three ___ hats blew away.", "girls", [["girl's", "singular-for-plural"], ["girls's", "added-s-after-plural-s"]], "The hats belong to three girls. The plural is girls."],
  ["The two ___ tracks were in the snow.", "wolves", [["wolf's", "singular-for-plural"], ["wolfs'", "plural-spelling-slip"]], "The tracks belong to two wolves. The plural of wolf is wolves."],
];

/** Spanish: [sentence, key, wrong forms, clue, worked line, the thing owned] */
const ES_OWN1: G[] = [
  ["Ana guardó ___ libros en la mochila.", "sus", [["su", "singular-for-plural-thing"], ["suyos", "long-form-before-noun"]], "Lo que Ana guardó son libros: más de uno.", "Sus va con libros porque son varios.", "libros"],
  ["Yo lavé ___ tenis nuevos.", "mis", [["mi", "singular-for-plural-thing"], ["míos", "long-form-before-noun"]], "Los tenis son un par: más de uno.", "Mis va con tenis porque son varios.", "tenis"],
  ["¿Trajiste ___ cuaderno?", "tu", [["tú", "pronoun-tilde-on-possessive"], ["tus", "plural-for-singular-thing"]], "Es un solo cuaderno, y es de la persona a quien le hablas.", "Tu, sin tilde, dice de quién es. Tú, con tilde, es la persona.", "cuaderno"],
  ["Mis primos trajeron ___ perro.", "su", [["sus", "agreed-with-owner"], ["suyo", "long-form-before-noun"]], "Los primos son varios, pero ¿cuántos perros trajeron?", "Su va con perro porque es uno solo, aunque los dueños sean varios.", "perro"],
  ["___ abuela hace pan los domingos.", "Mi", [["Mí", "pronoun-tilde-on-possessive"], ["Mis", "plural-for-singular-thing"]], "Es una sola abuela, y es de quien habla.", "Mi, sin tilde, va antes de un sustantivo: mi abuela. Mí, con tilde, va solo: es para mí.", "abuela"],
  ["Tú olvidaste ___ llaves.", "tus", [["tu", "singular-for-plural-thing"], ["tuyas", "long-form-before-noun"]], "Las llaves son varias.", "Tus va con llaves porque son varias.", "llaves"],
  ["Los niños dejaron ___ mochilas en el salón.", "sus", [["su", "singular-for-plural-thing"], ["suyas", "long-form-before-noun"]], "Las mochilas son varias.", "Sus va con mochilas porque son varias.", "mochilas"],
  ["Leo perdió ___ gorra en el parque.", "su", [["sus", "plural-for-singular-thing"], ["suya", "long-form-before-noun"]], "Leo perdió una sola gorra.", "Su va con gorra porque es una sola.", "gorra"],
  ["Ya terminé ___ tarea.", "mi", [["mí", "pronoun-tilde-on-possessive"], ["mis", "plural-for-singular-thing"]], "Es una sola tarea, y es de quien habla.", "Mi, sin tilde, dice de quién es la tarea.", "tarea"],
  ["Hijo, ¿dónde dejaste ___ zapatos?", "tus", [["tu", "singular-for-plural-thing"], ["tús", "pronoun-tilde-on-possessive"]], "Los zapatos son varios, y son del hijo a quien le hablan.", "Tus va con zapatos porque son varios. Nunca lleva tilde.", "zapatos"],
  ["Mi abuelo me prestó ___ bicicleta.", "su", [["sus", "plural-for-singular-thing"], ["suya", "long-form-before-noun"]], "Es una sola bicicleta.", "Su va con bicicleta porque es una sola.", "bicicleta"],
  ["Ellas pintaron ___ casa de azul.", "su", [["sus", "agreed-with-owner"], ["suya", "long-form-before-noun"]], "Ellas son varias, pero ¿cuántas casas pintaron?", "Su va con casa porque es una sola, aunque las dueñas sean varias.", "casa"],
  ["Por fin tengo ___ propia habitación.", "mi", [["mí", "pronoun-tilde-on-possessive"], ["mis", "plural-for-singular-thing"]], "Es una sola habitación, y es de quien habla.", "Mi, sin tilde, dice de quién es la habitación.", "habitación"],
  ["Tú y ___ hermana se parecen mucho.", "tu", [["tú", "pronoun-tilde-on-possessive"], ["tus", "plural-for-singular-thing"]], "Es una sola hermana, y es de la persona a quien le hablas.", "Tu, sin tilde, dice de quién es la hermana.", "hermana"],
];
const ES_OWN2: G[] = [
  ["Este es ___ salón de clases.", "nuestro", [["nuestra", "wrong-gender"], ["nuestros", "wrong-number"]], "Salón es masculino y es uno solo.", "Nuestro concuerda con salón: masculino y singular.", "salón"],
  ["___ maestra se llama Laura.", "Nuestra", [["Nuestro", "wrong-gender"], ["Nuestras", "wrong-number"]], "Maestra es femenino y es una sola.", "Nuestra concuerda con maestra: femenino y singular.", "maestra"],
  ["Limpiamos ___ cuartos el sábado.", "nuestros", [["nuestro", "wrong-number"], ["nuestras", "wrong-gender"]], "Cuartos es masculino y son varios.", "Nuestros concuerda con cuartos: masculino y plural.", "cuartos"],
  ["Regamos ___ plantas cada mañana.", "nuestras", [["nuestros", "wrong-gender"], ["nuestra", "wrong-number"]], "Plantas es femenino y son varias.", "Nuestras concuerda con plantas: femenino y plural.", "plantas"],
  ["___ perro duerme en el patio.", "Nuestro", [["Nuestra", "wrong-gender"], ["Nuestros", "wrong-number"]], "Perro es masculino y es uno solo.", "Nuestro concuerda con perro: masculino y singular.", "perro"],
  ["En verano visitamos a ___ abuelos.", "nuestros", [["nuestras", "wrong-gender"], ["nuestro", "wrong-number"]], "Abuelos es masculino y son varios.", "Nuestros concuerda con abuelos: masculino y plural.", "abuelos"],
  ["___ escuela tiene un huerto.", "Nuestra", [["Nuestro", "wrong-gender"], ["Nuestras", "wrong-number"]], "Escuela es femenino y es una sola.", "Nuestra concuerda con escuela: femenino y singular.", "escuela"],
  ["Pintamos ___ casa de verde.", "nuestra", [["nuestro", "wrong-gender"], ["nuestras", "wrong-number"]], "Casa es femenino y es una sola.", "Nuestra concuerda con casa: femenino y singular.", "casa"],
  ["___ vecinos tienen un gato.", "Nuestros", [["Nuestro", "wrong-number"], ["Nuestras", "wrong-gender"]], "Vecinos es masculino y son varios.", "Nuestros concuerda con vecinos: masculino y plural.", "vecinos"],
  ["Guardamos ___ juguetes en una caja.", "nuestros", [["nuestras", "wrong-gender"], ["nuestro", "wrong-number"]], "Juguetes es masculino y son varios.", "Nuestros concuerda con juguetes: masculino y plural.", "juguetes"],
  ["___ ciudad tiene un río muy largo.", "Nuestra", [["Nuestro", "wrong-gender"], ["Nuestras", "wrong-number"]], "Ciudad es femenino y es una sola.", "Nuestra concuerda con ciudad: femenino y singular.", "ciudad"],
  ["Llevamos ___ mochilas al paseo.", "nuestras", [["nuestros", "wrong-gender"], ["nuestra", "wrong-number"]], "Mochilas es femenino y son varias.", "Nuestras concuerda con mochilas: femenino y plural.", "mochilas"],
  ["___ equipo ganó el partido.", "Nuestro", [["Nuestra", "wrong-gender"], ["Nuestros", "wrong-number"]], "Equipo es masculino y es uno solo.", "Nuestro concuerda con equipo: masculino y singular.", "equipo"],
  ["Mi hermana y yo compartimos ___ bicicletas.", "nuestras", [["nuestros", "wrong-gender"], ["nuestra", "wrong-number"]], "Bicicletas es femenino y son varias.", "Nuestras concuerda con bicicletas: femenino y plural.", "bicicletas"],
];

const POSSESSIVES: Level[] = [
  {
    ask: bi("Which word shows who owns something?", "¿Qué palabra completa la oración?"),
    hints: bi(
      ["Who owns the thing? Is there one owner or more than one?", "One owner: add an apostrophe and s, as in the cat's bowl."],
      ["En español no se usa apóstrofo. El posesivo concuerda con la cosa que se tiene, no con el dueño.", "Una cosa: mi, tu, su. Varias cosas: mis, tus, sus. Estas palabras nunca llevan tilde."],
    ),
    seconds: 15,
    bank: pair(EN_OWN1.map(ownQ), ES_OWN1),
  },
  {
    ask: bi("Which word shows who owns something?", "¿Qué palabra completa la oración?"),
    hints: bi(
      ["Who owns the thing? Is there one owner or more than one?", "Write the plural first. If it ends in s, add only an apostrophe. If it does not, add an apostrophe and s."],
      ["Fíjate en la cosa que se tiene: ¿es masculina o femenina? ¿Es una o son varias?", "Nuestro, nuestra, nuestros y nuestras concuerdan con la cosa, no con quienes la tienen."],
    ),
    seconds: 15,
    bank: pair(EN_OWN2.map(ownQ), ES_OWN2),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.verb.tenses (3) — level 1: name the tense of a sentence; level 2: choose the verb for a time word.
// Spanish uses presente, pretérito and futuro simple, and avoids forms like "jugamos" that are both
// present and past.

const TENSE_LABELS = bi(["Past", "Present", "Future"], ["Pasado", "Presente", "Futuro"]);
const TENSES = ["past", "present", "future"];
/** [sentence, tense index, the verb in it] */
type Tensed = [string, number, string];
const tenseQ = (locale: Locale) => ([s, t, v]: Tensed): L => [
  `“${s}”`,
  t,
  tr(locale, `The verb is "${v}". When does that action happen?`, `El verbo es "${v}". ¿Cuándo pasa esa acción?`),
  [
    tr(locale, `"${v}" tells about something that already happened.`, `"${v}" cuenta algo que ya pasó.`),
    tr(locale, `"${v}" tells about something that happens now or happens often.`, `"${v}" cuenta algo que pasa ahora o que pasa seguido.`),
    tr(locale, `"${v}" tells about something that will happen later.`, `"${v}" cuenta algo que va a pasar después.`),
  ][t],
  v,
];
const EN_TENSE: Tensed[] = [
  ["Maya painted a picture of the ocean.", 0, "painted"], ["Our class will visit the science museum.", 2, "will visit"],
  ["The baby sleeps in the afternoon.", 1, "sleeps"], ["Dad baked bread on Sunday.", 0, "baked"],
  ["I will feed the fish after school.", 2, "will feed"], ["The bus stops at the corner.", 1, "stops"],
  ["Leo wrote a letter to his grandma.", 0, "wrote"], ["My brother plays soccer every Saturday.", 1, "plays"],
  ["The tomatoes will grow in the sun.", 2, "will grow"], ["Ana swam in the lake last summer.", 0, "swam"],
  ["My cat chases the red ball.", 1, "chases"], ["It will rain all day tomorrow.", 2, "will rain"],
  ["The band played a new song.", 0, "played"], ["Kenji reads before bed.", 1, "reads"],
  ["We will plant seeds next week.", 2, "will plant"], ["The children ate lunch outside.", 0, "ate"],
];
const ES_TENSE: Tensed[] = [
  ["Maya pintó un dibujo del mar.", 0, "pintó"], ["Nuestra clase visitará el museo de ciencias.", 2, "visitará"],
  ["El bebé duerme en la tarde.", 1, "duerme"], ["Papá horneó pan el domingo.", 0, "horneó"],
  ["Yo alimentaré a los peces después de la escuela.", 2, "alimentaré"], ["El autobús se detiene en la esquina.", 1, "se detiene"],
  ["Leo escribió una carta a su abuela.", 0, "escribió"], ["Mi hermano juega fútbol todos los sábados.", 1, "juega"],
  ["Los tomates crecerán con el sol.", 2, "crecerán"], ["Ana nadó en el lago el verano pasado.", 0, "nadó"],
  ["Mi gato persigue la pelota roja.", 1, "persigue"], ["Mañana lloverá todo el día.", 2, "lloverá"],
  ["La banda tocó una canción nueva.", 0, "tocó"], ["Kenji lee antes de dormir.", 1, "lee"],
  ["La próxima semana sembraremos semillas.", 2, "sembraremos"], ["Los niños comieron afuera.", 0, "comieron"],
];

/** [sentence, time words, base verb (Spanish: infinitive|person), key, past, present, future] */
type TimeFill = [string, string, string, number, string, string, string];
// With a future time word the present can be right too ("Tomorrow the train leaves at six"; Spanish "Mañana
// salgo para Lima" is the RAE's presente prospectivo), so a future item never offers the present. It offers a
// misbuilt future instead: will + the past form, or the Spanish future without its tilde (cruzaran is another
// tense). A present item names a second present verb in the same sentence, so a past or a future form there
// would break the tense of the sentence ("Every morning Kai eats breakfast and walked his dog").
const timeQ = (locale: Locale) => ([s, cue, base, t, ...forms]: TimeFill): G => [
  s,
  forms[t],
  forms.flatMap((f, i): Wrong[] =>
    i === t ? [] : i === 1 && t === 2 ? [locale === "en" ? [`will ${forms[0]}`, "will-with-past-form"] : [forms[2].replace(/á(n?)$/, "a$1"), "dropped-future-tilde"]] : [[f, `${TENSES[i]}-for-${TENSES[t]}`]],
  ),
  tr(locale, `"${cue}" is the time clue.`, `"${cue}" es la pista de tiempo.`),
  tr(
    locale,
    `"${cue}" ${["means it already happened, so use the past tense", "means it happens again and again, so use the present tense, like the other verb", "means it has not happened yet, so use the future tense: will + the base verb"][t]}.`,
    `"${cue}" ${["dice que ya pasó, así que va en pasado", "dice que pasa seguido, así que va en presente, como el otro verbo", "dice que todavía no pasa, así que va en futuro, con tilde al final"][t]}.`,
  ),
  base,
];
const EN_TIME: TimeFill[] = [
  ["Yesterday Ana ___ to the library.", "Yesterday", "walk", 0, "walked", "walks", "will walk"],
  ["Tomorrow my cousins ___ the old bridge.", "Tomorrow", "cross", 2, "crossed", "cross", "will cross"],
  ["Every morning Kai eats breakfast and ___ his dog.", "Every morning", "walk", 1, "walked", "walks", "will walk"],
  ["Last night our dog ___ at the moon.", "Last night", "bark", 0, "barked", "barks", "will bark"],
  ["Next summer my family ___ to the beach.", "Next summer", "drive", 2, "drove", "drives", "will drive"],
  ["My grandma reads a book and ___ tea every afternoon.", "every afternoon", "drink", 1, "drank", "drinks", "will drink"],
  ["Last week Omar ___ a model rocket.", "Last week", "build", 0, "built", "builds", "will build"],
  ["Later today Mia ___ her room.", "Later today", "clean", 2, "cleaned", "cleans", "will clean"],
  ["Two days ago it ___ all night.", "Two days ago", "snow", 0, "snowed", "snows", "will snow"],
  ["Each spring the tulips grow tall and ___ in our yard.", "Each spring", "bloom", 1, "bloomed", "bloom", "will bloom"],
  ["In two weeks our class ___ a play.", "In two weeks", "perform", 2, "performed", "performs", "will perform"],
  ["Yesterday Grandpa ___ a fish.", "Yesterday", "catch", 0, "caught", "catches", "will catch"],
  ["Tomorrow Mom ___ pancakes.", "Tomorrow", "make", 2, "made", "makes", "will make"],
  ["On Saturdays Leila ___ the piano and then plays outside.", "On Saturdays", "practice", 1, "practiced", "practices", "will practice"],
  ["Last month the twins ___ eight.", "Last month", "turn", 0, "turned", "turn", "will turn"],
  ["Every night my brother sits on my bed and ___ me a story.", "Every night", "tell", 1, "told", "tells", "will tell"],
];
const ES_TIME: TimeFill[] = [
  ["Ayer Ana ___ a la biblioteca.", "Ayer", "caminar|él", 0, "caminó", "camina", "caminará"],
  ["Mañana mis primos ___ el puente viejo.", "Mañana", "cruzar|ellos", 2, "cruzaron", "cruzan", "cruzarán"],
  ["Todas las mañanas Kai desayuna y ___ a su perro.", "Todas las mañanas", "pasear|él", 1, "paseó", "pasea", "paseará"],
  ["Anoche nuestro perro le ___ a la luna.", "Anoche", "ladrar|él", 0, "ladró", "ladra", "ladrará"],
  ["El próximo verano mi familia ___ a la playa.", "El próximo verano", "viajar|él", 2, "viajó", "viaja", "viajará"],
  ["Mi abuela lee un libro y ___ té todas las tardes.", "todas las tardes", "tomar|él", 1, "tomó", "toma", "tomará"],
  ["La semana pasada Omar ___ un cohete de juguete.", "La semana pasada", "construir|él", 0, "construyó", "construye", "construirá"],
  ["Más tarde Mía ___ su cuarto.", "Más tarde", "limpiar|él", 2, "limpió", "limpia", "limpiará"],
  ["Hace dos días ___ toda la noche.", "Hace dos días", "nevar|él", 0, "nevó", "nieva", "nevará"],
  ["Cada primavera los tulipanes crecen y ___ en el jardín.", "Cada primavera", "florecer|ellos", 1, "florecieron", "florecen", "florecerán"],
  ["En dos semanas nuestra clase ___ una obra de teatro.", "En dos semanas", "presentar|él", 2, "presentó", "presenta", "presentará"],
  ["Ayer el abuelo ___ un pez.", "Ayer", "pescar|él", 0, "pescó", "pesca", "pescará"],
  ["Mañana mamá ___ panqueques.", "Mañana", "preparar|él", 2, "preparó", "prepara", "preparará"],
  ["Los sábados Leila ___ el piano y luego sale a jugar.", "Los sábados", "practicar|él", 1, "practicó", "practica", "practicará"],
  ["El mes pasado los gemelos ___ ocho años.", "El mes pasado", "cumplir|ellos", 0, "cumplieron", "cumplen", "cumplirán"],
  ["Todas las noches mi hermano se sienta en mi cama y me ___ un cuento.", "Todas las noches", "contar|él", 1, "contó", "cuenta", "contará"],
];

const VERB_TENSES: Level[] = [
  {
    ask: bi("Is this sentence in the past, present, or future?", "¿Esta oración está en pasado, presente o futuro?"),
    hints: bi(
      ["Find the verb. When does the action happen?", "Past: it already happened (often -ed). Present: it happens now or often. Future: it will happen (will + verb)."],
      ["Busca el verbo. ¿Cuándo pasa la acción?", "Pasado: ya pasó (caminó, comió). Presente: pasa ahora o seguido (camina). Futuro: va a pasar (caminará)."],
    ),
    seconds: 10,
    labels: TENSE_LABELS,
    tags: TENSES,
    bank: pair(EN_TENSE.map(tenseQ("en")), ES_TENSE.map(tenseQ("es"))),
  },
  {
    ask: bi("Choose the verb that fits the time.", "Elige el verbo que va con el tiempo."),
    hints: bi(
      ["Find the words that tell when.", "Already happened: past. Happens again and again: present. Has not happened yet: will + the base verb (will jump, not will jumped)."],
      ["Busca las palabras que dicen cuándo.", "Ya pasó: pasado. Pasa seguido: presente. Todavía no pasa: futuro, que lleva tilde al final (saltará, saltarán)."],
    ),
    seconds: 15,
    bank: pair(EN_TIME.map(timeQ("en")), ES_TIME.map(timeQ("es"))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.comparatives (3) — level 1: comparative and superlative adjectives (-er/-est, more/most; Spanish más
// … que, el más …, agreeing with the noun); level 2: irregular forms and adverbs (better, worst, more
// carefully; mejor, peor, mayor, menor).

/** [sentence, base word, key, wrong forms, clue] */
type Cmp = [string, string, string, Wrong[], string];
const cmpQ = (locale: Locale, steps: (base: string, key: string, two: boolean) => string) => ([s, base, key, wrong, clue]: Cmp): G => [
  s,
  key,
  wrong,
  clue,
  steps(base, key, locale === "en" ? / than /.test(s) : / que /.test(s) && !/ que he /.test(s)),
  base,
];
const enCmpWhy = (base: string, key: string, two: boolean) =>
  `${two ? "Two things are compared" : "One is compared with all the others"}, so ${base} becomes ${key}.`;
const esCmpWhy = (base: string, key: string, two: boolean) =>
  two ? `Se comparan dos, así que se usa ${key} que.` : `Se compara con todos los demás, así que se usa el superlativo: ${key}.`;

const EN_CMP1: Cmp[] = [
  ["A blue whale is ___ than a dolphin.", "big", "bigger", [["biggest", "superlative-for-comparative"], ["more big", "more-with-short-word"], ["biger", "forgot-to-double"]], "The sentence compares two animals: a blue whale and a dolphin."],
  ["Leo is the ___ player on our team.", "tall", "tallest", [["taller", "comparative-for-superlative"], ["most tall", "more-with-short-word"]], "Leo is compared with every player on the team."],
  ["My kitten is ___ than my dog.", "small", "smaller", [["smallest", "superlative-for-comparative"], ["more small", "more-with-short-word"]], "The sentence compares two pets: a kitten and a dog."],
  ["This is the ___ day of the whole summer.", "hot", "hottest", [["hotter", "comparative-for-superlative"], ["hotest", "forgot-to-double"], ["most hot", "more-with-short-word"]], "This day is compared with every other day of the summer."],
  ["A cheetah is ___ than a horse.", "fast", "faster", [["fastest", "superlative-for-comparative"], ["more fast", "more-with-short-word"]], "The sentence compares two animals: a cheetah and a horse."],
  ["Today is ___ than yesterday.", "sunny", "sunnier", [["sunnyer", "kept-y"], ["sunniest", "superlative-for-comparative"]], "Two days are compared. Sunny ends in a consonant and y."],
  ["That was the ___ movie I have ever seen.", "funny", "funniest", [["funnier", "comparative-for-superlative"], ["funnyest", "kept-y"]], "That movie is compared with every movie I have seen. Funny ends in a consonant and y."],
  ["A giraffe is ___ than an elephant.", "tall", "taller", [["tallest", "superlative-for-comparative"], ["more tall", "more-with-short-word"]], "The sentence compares two animals: a giraffe and an elephant."],
  ["This puzzle is ___ than the last one.", "difficult", "more difficult", [["difficulter", "er-on-long-word"], ["most difficult", "superlative-for-comparative"]], "Two puzzles are compared. Difficult is a long word: dif-fi-cult."],
  ["Sofia told the ___ story of all.", "exciting", "most exciting", [["excitingest", "er-on-long-word"], ["more exciting", "comparative-for-superlative"]], "Her story is compared with all the others. Exciting is a long word: ex-cit-ing."],
  ["The rose is the ___ flower in the garden.", "beautiful", "most beautiful", [["beautifulest", "er-on-long-word"], ["more beautiful", "comparative-for-superlative"]], "The rose is compared with every flower in the garden. Beautiful is a long word."],
  ["My backpack is ___ than yours.", "heavy", "heavier", [["heavyer", "kept-y"], ["heaviest", "superlative-for-comparative"]], "Two backpacks are compared. Heavy ends in a consonant and y."],
  ["January is the ___ month of the year in our town.", "cold", "coldest", [["colder", "comparative-for-superlative"], ["most cold", "more-with-short-word"]], "January is compared with all twelve months."],
  ["A sloth is ___ than a rabbit.", "slow", "slower", [["slowest", "superlative-for-comparative"], ["more slow", "more-with-short-word"]], "The sentence compares two animals: a sloth and a rabbit."],
  ["This rock is the ___ one in my collection.", "smooth", "smoothest", [["smoother", "comparative-for-superlative"], ["most smooth", "more-with-short-word"]], "This rock is compared with every rock in the collection."],
  ["That was the ___ quiz of the year.", "easy", "easiest", [["easier", "comparative-for-superlative"], ["easyest", "kept-y"]], "That quiz is compared with every quiz of the year. Easy ends in a consonant and y."],
];
const ES_CMP1: Cmp[] = [
  ["La ballena azul es ___ que el delfín.", "grande", "más grande", [["la más grande", "superlative-for-comparative"], ["grandísima", "absolute-superlative-for-comparison"]], "Se comparan dos animales: la ballena azul y el delfín."],
  ["El Everest es la montaña ___ del mundo.", "alta", "más alta", [["altísima", "absolute-superlative-for-comparison"], ["más alto", "agreement-slip"]], "El Everest se compara con todas las montañas. Montaña es femenino."],
  ["Mi gatito es ___ que mi perro.", "pequeño", "más pequeño", [["el más pequeño", "superlative-for-comparative"], ["más pequeña", "agreement-slip"]], "Se comparan dos mascotas: el gatito y el perro."],
  ["Hoy es el día ___ de todo el verano.", "caluroso", "más caluroso", [["más calurosa", "agreement-slip"], ["calurosísimo", "absolute-superlative-for-comparison"]], "Este día se compara con todos los días del verano. Día es masculino."],
  ["El guepardo es ___ que el caballo.", "rápido", "más rápido", [["el más rápido", "superlative-for-comparative"], ["rapidísimo", "absolute-superlative-for-comparison"]], "Se comparan dos animales: el guepardo y el caballo."],
  ["Esta película es ___ que la otra.", "divertida", "más divertida", [["más divertido", "agreement-slip"], ["la más divertida", "superlative-for-comparative"]], "Se comparan dos películas. Película es femenino."],
  ["Esa fue la película ___ que he visto.", "graciosa", "más graciosa", [["más gracioso", "agreement-slip"], ["graciosísima", "absolute-superlative-for-comparison"]], "Esa película se compara con todas las que he visto. Película es femenino."],
  ["La jirafa es ___ que el elefante.", "alta", "más alta", [["la más alta", "superlative-for-comparative"], ["más alto", "agreement-slip"]], "Se comparan dos animales: la jirafa y el elefante."],
  ["Este rompecabezas es ___ que el anterior.", "difícil", "más difícil", [["el más difícil", "superlative-for-comparative"], ["dificilísimo", "absolute-superlative-for-comparison"]], "Se comparan dos rompecabezas: este y el anterior."],
  ["Sofía contó el cuento ___ de todos.", "emocionante", "más emocionante", [["emocionantísimo", "absolute-superlative-for-comparison"], ["más emocionantes", "agreement-slip"]], "Su cuento se compara con todos los demás. Cuento es singular."],
  ["La rosa es la flor ___ del jardín.", "bonita", "más bonita", [["bonitísima", "absolute-superlative-for-comparison"], ["más bonito", "agreement-slip"]], "La rosa se compara con todas las flores del jardín. Flor es femenino."],
  ["Mi mochila es ___ que la tuya.", "pesada", "más pesada", [["más pesado", "agreement-slip"], ["la más pesada", "superlative-for-comparative"]], "Se comparan dos mochilas. Mochila es femenino."],
  ["Enero es el mes ___ del año en nuestro pueblo.", "frío", "más frío", [["friísimo", "absolute-superlative-for-comparison"], ["más fría", "agreement-slip"]], "Enero se compara con los doce meses. Mes es masculino."],
  ["El perezoso es ___ que el conejo.", "lento", "más lento", [["el más lento", "superlative-for-comparative"], ["lentísimo", "absolute-superlative-for-comparison"]], "Se comparan dos animales: el perezoso y el conejo."],
  ["Esta piedra es la ___ de mi colección.", "lisa", "más lisa", [["lisísima", "absolute-superlative-for-comparison"], ["más liso", "agreement-slip"]], "Esta piedra se compara con todas las de la colección. Piedra es femenino."],
  ["Ese fue el examen ___ del año.", "fácil", "más fácil", [["facilísimo", "absolute-superlative-for-comparison"], ["más fáciles", "agreement-slip"]], "Ese examen se compara con todos los del año. Examen es singular."],
];

const EN_CMP2: Cmp[] = [
  ["Ana sings ___ than her brother.", "well", "better", [["gooder", "regular-ending-on-irregular"], ["more well", "more-with-irregular"], ["best", "superlative-for-comparative"]], "Two singers are compared, and the word is well."],
  ["This is the ___ pizza in town.", "good", "best", [["better", "comparative-for-superlative"], ["goodest", "regular-ending-on-irregular"]], "This pizza is compared with every pizza in town, and the word is good."],
  ["My cold is ___ today than yesterday.", "bad", "worse", [["badder", "regular-ending-on-irregular"], ["worst", "superlative-for-comparative"]], "Two days are compared, and the word is bad."],
  ["That was the ___ storm of the year.", "bad", "worst", [["worse", "comparative-for-superlative"], ["baddest", "regular-ending-on-irregular"]], "That storm is compared with every storm of the year, and the word is bad."],
  ["The turtle moved ___ than the snail.", "quickly", "more quickly", [["quicklier", "er-on-ly-adverb"], ["most quickly", "superlative-for-comparative"]], "Two animals are compared. Quickly ends in -ly."],
  ["Leo spoke the ___ of all the students.", "softly", "most softly", [["softliest", "er-on-ly-adverb"], ["more softly", "comparative-for-superlative"]], "Leo is compared with all the students. Softly ends in -ly."],
  ["Our team played ___ than the other team.", "well", "better", [["more well", "more-with-irregular"], ["gooder", "regular-ending-on-irregular"]], "Two teams are compared, and the word is well."],
  ["Kai folded the clothes ___ than his sister.", "carefully", "more carefully", [["carefullier", "er-on-ly-adverb"], ["most carefully", "superlative-for-comparative"]], "Two people are compared. Carefully ends in -ly."],
  ["Of all the bakers, Grandma makes the ___ bread.", "good", "best", [["better", "comparative-for-superlative"], ["goodest", "regular-ending-on-irregular"]], "Grandma is compared with all the bakers, and the word is good."],
  ["The rain fell ___ on Tuesday than on Monday.", "heavily", "more heavily", [["heavilier", "er-on-ly-adverb"], ["most heavily", "superlative-for-comparative"]], "Two days are compared. Heavily ends in -ly."],
  ["Mia does ___ in math than in spelling.", "well", "better", [["more well", "more-with-irregular"], ["best", "superlative-for-comparative"]], "Two subjects are compared, and the word is well."],
  ["The kitten purred the ___ of all.", "loudly", "most loudly", [["loudliest", "er-on-ly-adverb"], ["more loudly", "comparative-for-superlative"]], "The kitten is compared with all the others. Loudly ends in -ly."],
  ["I feel ___ today than I did on Monday.", "bad", "worse", [["badder", "regular-ending-on-irregular"], ["more bad", "more-with-irregular"]], "Two days are compared, and the word is bad."],
  ["Ben drew the circle ___ than I did.", "neatly", "more neatly", [["neatlier", "er-on-ly-adverb"], ["most neatly", "superlative-for-comparative"]], "Two people are compared. Neatly ends in -ly."],
  ["This is the ___ book I have ever read.", "good", "best", [["bestest", "doubled-comparison"], ["better", "comparative-for-superlative"]], "This book is compared with every book I have read, and the word is good."],
  ["The second song was ___ than the first.", "good", "better", [["gooder", "regular-ending-on-irregular"], ["more better", "doubled-comparison"]], "Two songs are compared, and the word is good."],
];
const ES_CMP2: Cmp[] = [
  ["Ana canta ___ que su hermano.", "bien", "mejor", [["más bien", "mas-bien-for-mejor"], ["más mejor", "doubled-comparison"]], "Se comparan dos personas que cantan, y la palabra es bien."],
  ["Esta es la ___ pizza de la ciudad.", "buena", "mejor", [["más buena", "mas-bueno-for-mejor"], ["más mejor", "doubled-comparison"]], "Esta pizza se compara con todas las de la ciudad, y la palabra es buena."],
  ["Hoy mi resfriado está ___ que ayer.", "malo", "peor", [["más malo", "mas-malo-for-peor"], ["más peor", "doubled-comparison"]], "Se comparan dos días, y la palabra es malo."],
  ["Esa fue la ___ tormenta del año.", "mala", "peor", [["más mala", "mas-malo-for-peor"], ["más peor", "doubled-comparison"]], "Esa tormenta se compara con todas las del año, y la palabra es mala."],
  ["Mi hermana tiene diez años y yo tengo ocho. Ella es ___ que yo.", "grande|edad", "mayor", [["más mayor", "doubled-comparison"], ["menor", "reversed-comparison"]], "Se comparan dos edades: diez años y ocho años."],
  ["Leo tiene seis años y su primo tiene nueve. Leo es ___ que su primo.", "pequeño|edad", "menor", [["mayor", "reversed-comparison"], ["más menor", "doubled-comparison"]], "Se comparan dos edades: seis años y nueve años."],
  ["Nuestro equipo jugó ___ que el otro equipo.", "bien", "mejor", [["más bien", "mas-bien-for-mejor"], ["más bueno", "mas-bueno-for-mejor"]], "Se comparan dos equipos, y la palabra es bien."],
  ["De todos los panaderos, mi abuela hace el ___ pan.", "bueno", "mejor", [["más bueno", "mas-bueno-for-mejor"], ["más mejor", "doubled-comparison"]], "Se compara a la abuela con todos los panaderos, y la palabra es bueno."],
  ["Mía saca ___ notas en matemáticas que en ortografía.", "buenas|plural", "mejores", [["mejor", "number-agreement-slip"], ["más buenas", "mas-bueno-for-mejor"]], "Se comparan dos materias. Notas es plural."],
  ["Tengo más fiebre que el lunes. Hoy me siento ___ que el lunes.", "mal", "peor", [["mejor", "reversed-comparison"], ["más peor", "doubled-comparison"]], "Hoy hay más fiebre que el lunes, y la palabra es mal."],
  ["Este es el ___ libro que he leído.", "bueno", "mejor", [["más bueno", "mas-bueno-for-mejor"], ["más mejor", "doubled-comparison"]], "Este libro se compara con todos los que he leído, y la palabra es bueno."],
  ["La segunda canción fue ___ que la primera.", "buena", "mejor", [["más mejor", "doubled-comparison"], ["más buena", "mas-bueno-for-mejor"]], "Se comparan dos canciones, y la palabra es buena."],
  ["En mi familia, nadie tiene más años que mi abuelo. Es el ___ de la familia.", "grande|edad", "mayor", [["más mayor", "doubled-comparison"], ["menor", "reversed-comparison"]], "Se compara la edad del abuelo con la de todos los demás de la familia."],
  ["Sofía tiene cinco años, y sus hermanas tienen ocho y diez. Es la ___ de las tres.", "pequeña|edad", "menor", [["más menor", "doubled-comparison"], ["mayor", "reversed-comparison"]], "Compara cinco años con ocho y con diez."],
  ["Las fresas de este mercado son ___ que las del otro.", "buenas|plural", "mejores", [["mejor", "number-agreement-slip"], ["más mejores", "doubled-comparison"]], "Se comparan dos mercados. Fresas es plural."],
  ["Este pastel me salió ___ que el de la semana pasada.", "bien", "mejor", [["más bien", "mas-bien-for-mejor"], ["más mejor", "doubled-comparison"]], "Se comparan dos pasteles, y la palabra es bien."],
];

const COMPARATIVES: Level[] = [
  {
    ask: bi("Choose the word that completes the sentence.", "Elige las palabras que completan la oración."),
    hints: bi(
      ["Is the sentence comparing two things, or one thing with all the others?", "Two things: add -er or use more. One with all the others: add -est or use most. Long words take more and most."],
      ["¿La oración compara dos cosas, o una con todas las demás?", "Dos cosas: más + adjetivo + que. Una entre todas: el o la + más + adjetivo. El adjetivo concuerda con el sustantivo."],
    ),
    seconds: 15,
    bank: pair(EN_CMP1.map(cmpQ("en", enCmpWhy)), ES_CMP1.map(cmpQ("es", esCmpWhy))),
  },
  {
    ask: bi("Choose the word that completes the sentence.", "Elige la palabra que completa la oración."),
    hints: bi(
      ["Is the sentence comparing two, or one with all the others? Then look at the word that changes.", "Good, well, and bad have their own comparing words: they never take -er, -est, more, or most. Adverbs made from a describing word + -ly (gently, brightly) use more and most."],
      ["¿La oración compara dos cosas, o una con todas las demás? Luego mira la palabra que cambia.", "Bueno, bien, malo y mal tienen su propia palabra para comparar, y la edad también. Esas palabras ya comparan solas: nunca llevan más antes."],
    ),
    seconds: 15,
    bank: pair(
      EN_CMP2.map(cmpQ("en", (base, key, two) => `${two ? "Two are compared" : "One is compared with all the others"}. ${cap(base)} becomes ${key}.`)),
      ES_CMP2.map(cmpQ("es", (base, key) => (base.includes("edad") ? `Para comparar edades se usa ${key}.` : `${cap(base.split("|")[0])} cambia a ${key} para comparar.`))),
    ),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.conjunctions (3) — level 1: coordinating (and, but, or, so; y/e, o/u, pero, así que); level 2:
// subordinating (because, although, if, when, until, unless; porque, aunque, si, cuando, hasta que).
// Each item names the link it needs (`base`); every wrong choice makes a different link that does not fit.

/** The link each conjunction makes. */
export const LINK: Record<string, string> = {
  and: "addition", but: "contrast", or: "choice", so: "result",
  because: "cause", although: "concession", if: "condition", when: "time", until: "until", unless: "negative-condition", before: "before",
  y: "addition", e: "addition", pero: "contrast", o: "choice", u: "choice", "así que": "result",
  porque: "cause", aunque: "concession", si: "condition", cuando: "time", "hasta que": "until",
};
const LINK_SAYS: Bi<Record<string, string>> = {
  en: {
    addition: "adds one more idea of the same kind", contrast: "shows that the second idea is different from what you expect", choice: "gives a choice",
    result: "tells what happened because of the first idea", cause: "gives the reason", concession: "shows that something happened even with the other idea against it",
    condition: "tells what has to be true first", time: "tells the moment something happens", until: "tells how long, up to a certain moment", "negative-condition": "means if not", before: "tells what comes first in time",
  },
  es: {
    addition: "suma una idea del mismo tipo", contrast: "muestra que la segunda idea es distinta de lo que se espera", choice: "da a elegir",
    result: "dice lo que pasó a causa de la primera idea", cause: "da la razón", concession: "muestra que algo pasó a pesar de la otra idea",
    condition: "dice lo que tiene que pasar primero", time: "dice en qué momento pasa algo", until: "dice en qué momento algo deja de pasar",
  },
};
const linkTag = (wrong: string, key: string) => `${LINK[wrong.toLowerCase()]}-word-for-${LINK[key.toLowerCase()]}`;

/** [sentence, key, wrong choices (a string gets its tag from the links), clue] */
type Conj = [string, string, (string | Wrong)[], string];
const conjQ = (locale: Locale) => ([s, key, wrong, clue]: Conj): G => {
  const k = key.toLowerCase();
  const sound = k === "e" ? "La siguiente palabra empieza con sonido i, así que y cambia a e." : k === "u" ? "La siguiente palabra empieza con sonido o, así que o cambia a u." : "";
  return [
    s,
    key,
    wrong.map((w): Wrong => (typeof w === "string" ? [w, linkTag(w, key)] : w)),
    clue,
    `${sound ? `${sound} ` : ""}"${k}" ${lang(locale, LINK_SAYS)[LINK[k]]}.`,
    LINK[k],
  ];
};

const EN_CONJ1: Conj[] = [
  ["I wanted to play outside, ___ it was raining.", "but", ["so", "or"], "Rain is not what you want when you plan to play outside."],
  ["Do you want milk ___ juice with lunch?", "or", ["but", "so"], "You get to pick one drink."],
  ["The puppy was hungry, ___ Leo filled its bowl.", "so", ["or", "but"], "Leo filled the bowl because the puppy was hungry."],
  ["We bought apples ___ bananas at the market.", "and", ["but", "so"], "We bought both kinds of fruit."],
  ["The soup was hot, ___ Ana blew on it.", "so", ["or", "but"], "Ana blew on the soup because it was hot."],
  ["Kai is small, ___ he is very strong.", "but", ["so", "or"], "Small people are not always expected to be strong."],
  ["You can ride your bike ___ walk to school.", "or", ["but", "so"], "You pick one way to get to school."],
  ["My sister plays the drums ___ the piano.", "and", ["but", "so"], "She plays both instruments."],
  ["The store was closed, ___ we went home.", "so", ["or", "but"], "We went home because the store was closed."],
  ["The lemon looked sweet, ___ it tasted sour.", "but", ["so", "or"], "The taste was different from what the lemon looked like."],
  ["Should we paint the fence blue ___ green?", "or", ["but", "so"], "We will pick one color."],
  ["The baby was tired, ___ she took a nap.", "so", ["or", "but"], "She took a nap because she was tired."],
  ["Omar likes math ___ science.", "and", ["but", "so"], "Omar likes both subjects."],
  ["The test was hard, ___ Jada finished it on time.", "but", ["so", "or"], "A hard test usually takes longer."],
  ["Grandpa grows tomatoes ___ peppers in his garden.", "and", ["but", "so"], "He grows both plants."],
  ["We can play a board game ___ read a book.", "or", ["but", "so"], "We will pick one thing to do."],
];
const ES_CONJ1: Conj[] = [
  ["Quería jugar afuera, ___ estaba lloviendo.", "pero", ["así que", "o"], "La lluvia no es lo que quieres cuando piensas jugar afuera."],
  ["¿Quieres leche ___ jugo?", "o", ["pero", "así que"], "Puedes elegir una sola bebida."],
  ["El perrito tenía hambre, ___ Leo le llenó el plato.", "así que", ["o", "pero"], "Leo le llenó el plato porque tenía hambre."],
  ["Compramos manzanas ___ plátanos.", "y", ["pero", "así que"], "Compramos las dos frutas."],
  ["Ana ___ Isabel son primas.", "e", [["y", "y-before-i-sound"], "o"], "Las dos son primas. Fíjate en el sonido con que empieza Isabel."],
  ["Kai es pequeño, ___ es muy fuerte.", "pero", ["así que", "o"], "No siempre se espera que alguien pequeño sea muy fuerte."],
  ["Necesito siete ___ ocho hojas.", "u", [["o", "o-before-o-sound"], "y"], "Es un número o el otro. Fíjate en el sonido con que empieza ocho."],
  ["Mi hermana toca la batería ___ el piano.", "y", ["pero", "así que"], "Ella toca los dos instrumentos."],
  ["La tienda estaba cerrada, ___ volvimos a casa.", "así que", ["o", "pero"], "Volvimos a casa porque la tienda estaba cerrada."],
  ["El limón parecía dulce, ___ estaba ácido.", "pero", ["así que", "o"], "El sabor fue distinto de lo que parecía."],
  ["¿Pintamos la cerca de azul ___ de verde?", "o", ["pero", "así que"], "Vamos a elegir un solo color."],
  ["Trajimos agujas ___ hilo para coser.", "e", [["y", "y-before-i-sound"], ["u", "u-for-e"]], "Trajimos las dos cosas. Fíjate en el sonido con que empieza hilo: la h no suena."],
  ["Omar estudia matemáticas ___ ciencias.", "y", ["pero", "así que"], "Omar estudia las dos materias."],
  ["¿Llegarás hoy ___ mañana?", "o", [["u", "u-before-other-sound"], "pero"], "Hay que elegir entre hoy y mañana. Mañana empieza con sonido m."],
  ["El examen fue difícil, ___ Jada lo terminó a tiempo.", "pero", ["así que", "o"], "Un examen difícil casi siempre toma más tiempo."],
  ["¿Prefieres una pera ___ otra manzana?", "u", [["o", "o-before-o-sound"], ["e", "e-for-u"]], "Es una fruta o la otra. Fíjate en el sonido con que empieza otra."],
];

const EN_CONJ2: Conj[] = [
  ["We stayed inside ___ it was storming.", "because", ["although", "unless"], "The storm is the reason we stayed inside."],
  ["___ it was cold, Mia wore shorts.", "Although", ["Because", "Until"], "Shorts are a surprise on a cold day."],
  ["Brush your teeth ___ you go to bed.", "before", ["although", "unless"], "Brushing comes first, then bed."],
  ["We will go to the beach ___ it is sunny tomorrow.", "if", ["although", "until"], "The beach trip depends on the weather."],
  ["Leo waited at the bus stop ___ the bus came.", "until", ["because", "although"], "Leo stopped waiting at the moment the bus arrived."],
  ["The crowd cheered ___ the team scored a goal.", "when", ["although", "unless"], "The cheering happened at the same moment as the goal."],
  ["I could not sleep ___ the dog was barking.", "because", ["although", "unless"], "The barking is the reason I could not sleep."],
  ["___ she was tired, Grandma finished the quilt.", "Although", ["Because", "Until"], "Being tired usually makes people stop, but Grandma kept going."],
  ["The plants will dry up ___ we water them.", "unless", ["because", "when"], "The plants dry up if we do not water them."],
  ["Kai smiled ___ he opened the gift.", "when", ["although", "unless"], "The smile happened at the moment he opened the gift."],
  ["Stay in your seat ___ the bus stops.", "until", ["because", "although"], "You can stand up at the moment the bus stops."],
  ["Ana ran fast ___ she did not want to miss the bus.", "because", ["although", "until"], "Not wanting to miss the bus is the reason she ran."],
  ["___ the movie was long, we enjoyed every minute.", "Although", ["Because", "Until"], "Long movies can be boring, but this one was not."],
  ["You will get wet ___ you take an umbrella.", "unless", ["because", "when"], "You stay dry only if you take an umbrella."],
  ["The kitten hid under the bed ___ it was scared.", "because", ["although", "until"], "Being scared is the reason the kitten hid."],
  ["We can have a picnic ___ it does not rain.", "if", ["although", "until"], "The picnic depends on the weather."],
];
const ES_CONJ2: Conj[] = [
  ["Nos quedamos adentro ___ había tormenta.", "porque", ["aunque", "si"], "La tormenta es la razón por la que nos quedamos adentro."],
  ["___ hacía frío, Mía se puso shorts.", "Aunque", ["Porque", "Hasta que"], "Los shorts son una sorpresa en un día frío."],
  ["Leo esperó en la parada ___ llegó el autobús.", "hasta que", ["porque", "aunque"], "Leo dejó de esperar en el momento en que llegó el autobús."],
  ["La gente aplaudió ___ el equipo metió un gol.", "cuando", ["aunque", "si"], "El aplauso fue en el mismo momento que el gol."],
  ["No pude dormir ___ el perro ladraba.", "porque", ["aunque", "si"], "Los ladridos son la razón por la que no pude dormir."],
  ["___ estaba cansada, la abuela terminó la colcha.", "Aunque", ["Porque", "Si"], "El cansancio hace que la gente pare, pero la abuela siguió."],
  ["Iremos a la playa ___ hace sol mañana.", "si", ["aunque", "hasta que"], "El paseo depende del clima."],
  ["Kai sonrió ___ abrió el regalo.", "cuando", ["aunque", "si"], "La sonrisa fue en el momento en que abrió el regalo."],
  ["Quédate sentado ___ el autobús se detenga.", "hasta que", ["porque", "si"], "Puedes pararte en el momento en que el autobús se detenga."],
  ["Ana corrió rápido ___ no quería perder el autobús.", "porque", ["aunque", "hasta que"], "No querer perder el autobús es la razón por la que corrió."],
  ["___ la película era larga, la disfrutamos.", "Aunque", ["Porque", "Si"], "Una película larga puede aburrir, pero esta no."],
  ["El gatito se escondió ___ tenía miedo.", "porque", ["aunque", "hasta que"], "El miedo es la razón por la que se escondió."],
  ["Podemos hacer un pícnic ___ no llueve.", "si", ["aunque", "hasta que"], "El pícnic depende del clima."],
  ["Las plantas se secan ___ no las regamos.", "si", ["aunque", "hasta que"], "Que se sequen depende de que no las reguemos."],
  ["Mi papá silba ___ cocina.", "cuando", ["aunque", "hasta que"], "Silba en los mismos momentos en que cocina."],
  ["Nos pusimos la chamarra ___ hacía frío.", "porque", ["aunque", "hasta que"], "El frío es la razón por la que nos la pusimos."],
];

const CONJUNCTIONS: Level[] = [
  {
    ask: bi("Which conjunction completes the sentence?", "¿Qué conjunción completa la oración?"),
    hints: bi(
      ["How do the two parts of the sentence connect?", "and adds, but shows a difference, or gives a choice, so tells a result."],
      ["¿Cómo se unen las dos partes de la oración?", "y suma, pero muestra una diferencia, o da a elegir, así que dice un resultado. Antes de sonido i, y cambia a e. Antes de sonido o, o cambia a u."],
    ),
    seconds: 15,
    bank: pair(EN_CONJ1.map(conjQ("en")), ES_CONJ1.map(conjQ("es"))),
  },
  {
    ask: bi("Which conjunction completes the sentence?", "¿Qué conjunción completa la oración?"),
    hints: bi(
      ["How does one part of the sentence depend on the other?", "because gives a reason, although shows a surprise, if and unless set a condition, when tells the time, until tells how long, and before tells what comes first."],
      ["¿Cómo depende una parte de la oración de la otra?", "porque da la razón, aunque muestra una sorpresa, si pone una condición, cuando dice el momento, hasta que dice hasta cuándo."],
    ),
    seconds: 18,
    bank: pair(EN_CONJ2.map(conjQ("en")), ES_CONJ2.map(conjQ("es"))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.suffixes (3) — English -ful, -less, -ly: level 1 what the word means, level 2 the word that fits.
// Spanish -oso, -ero, -ito (level 1) and -mente, built on the feminine form and keeping its tilde
// (rápidamente, fácilmente), with -oso, -ero, -ito in sentences (level 2).

/** [word, base, suffix] */
type Suf = [string, string, "ful" | "less"];
const sufQ = ([word, base, suffix]: Suf): G => {
  const full = `full of ${base}`, without = `without ${base}`;
  const key = suffix === "ful" ? full : without;
  return [
    `“${word}”`,
    key,
    [[suffix === "ful" ? without : full, suffix === "ful" ? "less-for-ful" : "ful-for-less"], [`${base} again`, "prefix-meaning"], [`in ${/^[aeiou]/.test(word) ? "an" : "a"} ${word} way`, "ly-for-adjective"]],
    `${cap(word)} is ${base} + -${suffix}.`,
    `-${suffix} means ${suffix === "ful" ? "full of" : "without"}, so ${word} means ${key}.`,
    `${base}|${suffix}`,
  ];
};
const EN_SUF1: Suf[] = [
  ["careful", "care", "ful"], ["careless", "care", "less"], ["hopeful", "hope", "ful"], ["hopeless", "hope", "less"],
  ["fearless", "fear", "less"], ["fearful", "fear", "ful"], ["painful", "pain", "ful"], ["painless", "pain", "less"],
  ["joyful", "joy", "ful"], ["thoughtful", "thought", "ful"], ["helpful", "help", "ful"], ["harmless", "harm", "less"],
  ["endless", "end", "less"], ["colorful", "color", "ful"], ["restful", "rest", "ful"], ["sleepless", "sleep", "less"],
];
/** Spanish: [word, base, suffix family, suffix as written, meaning, wrong meanings with tags] */
type EsSuf = [string, string, "oso" | "ero" | "ito", string, string, Wrong[]];
const ES_SUF1: EsSuf[] = [
  ["cariñoso", "cariño", "oso", "oso", "con mucho cariño", [["sin cariño", "opposite-meaning"], ["un cariño pequeño", "ito-for-oso"]]],
  ["lluvioso", "lluvia", "oso", "oso", "con mucha lluvia", [["sin lluvia", "opposite-meaning"], ["una lluvia pequeña", "ito-for-oso"]]],
  ["ruidoso", "ruido", "oso", "oso", "que hace mucho ruido", [["que no hace ruido", "opposite-meaning"], ["un ruido pequeño", "ito-for-oso"]]],
  ["montañoso", "montaña", "oso", "oso", "con muchas montañas", [["sin montañas", "opposite-meaning"], ["una montaña pequeña", "ito-for-oso"]]],
  ["arenoso", "arena", "oso", "oso", "con mucha arena", [["sin arena", "opposite-meaning"], ["un poco de arena", "ito-for-oso"]]],
  ["zapatero", "zapato", "ero", "ero", "persona que hace o arregla zapatos", [["con muchos zapatos", "oso-for-ero"], ["un zapato pequeño", "ito-for-ero"]]],
  ["panadero", "pan", "ero", "ero", "persona que hace pan", [["con mucho pan", "oso-for-ero"], ["un pan pequeño", "ito-for-ero"]]],
  ["cartero", "carta", "ero", "ero", "persona que reparte cartas", [["con muchas cartas", "oso-for-ero"], ["una carta pequeña", "ito-for-ero"]]],
  ["jardinero", "jardín", "ero", "ero", "persona que cuida jardines", [["con muchos jardines", "oso-for-ero"], ["un jardín pequeño", "ito-for-ero"]]],
  ["granjero", "granja", "ero", "ero", "persona que trabaja en una granja", [["con muchas granjas", "oso-for-ero"], ["una granja pequeña", "ito-for-ero"]]],
  ["cocinero", "cocina", "ero", "ero", "persona que cocina", [["con muchas cocinas", "oso-for-ero"], ["una cocina pequeña", "ito-for-ero"]]],
  ["casita", "casa", "ito", "ita", "casa pequeña", [["casa muy grande", "big-for-small"], ["con muchas casas", "oso-for-ito"]]],
  ["perrito", "perro", "ito", "ito", "perro pequeño", [["perro muy grande", "big-for-small"], ["con muchos perros", "oso-for-ito"]]],
  ["mesita", "mesa", "ito", "ita", "mesa pequeña", [["mesa muy grande", "big-for-small"], ["con muchas mesas", "oso-for-ito"]]],
  ["arbolito", "árbol", "ito", "ito", "árbol pequeño", [["árbol muy grande", "big-for-small"], ["con muchos árboles", "oso-for-ito"]]],
  ["librito", "libro", "ito", "ito", "libro pequeño", [["libro muy grande", "big-for-small"], ["con muchos libros", "oso-for-ito"]]],
];
const esSufQ = ([word, base, family, suffix, key, wrong]: EsSuf): G => {
  const means = { oso: "-oso quiere decir que tiene mucho de algo", ero: "-ero nombra a la persona que trabaja con algo", ito: "-ito o -ita quiere decir pequeño" }[family];
  return [`“${word}”`, key, wrong, `${cap(word)} es ${base} + -${suffix}.`, `${cap(means)}, así que ${word} quiere decir: ${key}.`, `${base}|${suffix}`];
};

/** [sentence, key, base|suffix, wrong forms, clue] */
type SufIn = [string, string, string, Wrong[], string];
const sufInQ = (locale: Locale) => ([s, key, base, wrong, clue]: SufIn): G => [
  s,
  key,
  wrong,
  clue,
  tr(locale, `${cap(key)} is ${base.replace("|", " + -")}, and it fits the meaning of the sentence.`, `${cap(key)} es ${base.replace("|", " + -")}, y va con el sentido de la oración.`),
  base,
];
const EN_SUF2: SufIn[] = [
  ["Be ___ when you carry the glass vase.", "careful", "care|ful", [["careless", "opposite-suffix"], ["carefully", "ly-for-adjective"]], "The blank describes you, and glass can break."],
  ["Leo was ___ that his team would win.", "hopeful", "hope|ful", [["hopeless", "opposite-suffix"], ["hopefully", "ly-for-adjective"]], "Leo expected good things for his team."],
  ["The turtle walked ___ across the sand.", "slowly", "slow|ly", [["slow", "adjective-for-adverb"], ["slowful", "wrong-suffix"]], "The blank tells how the turtle walked."],
  ["The ___ kitten hid under the bed during the storm.", "fearful", "fear|ful", [["fearless", "opposite-suffix"], ["fearfully", "ly-for-adjective"]], "The kitten hid. Was it full of fear or without fear?"],
  ["Thank you for being so ___ today.", "helpful", "help|ful", [["helpless", "opposite-suffix"], ["helpfully", "ly-for-adjective"]], "You are thanking someone who gave help."],
  ["Mia closed the door ___ so the baby would not wake up.", "quietly", "quiet|ly", [["quiet", "adjective-for-adverb"], ["quietful", "wrong-suffix"]], "The blank tells how Mia closed the door."],
  ["The nurse said the shot would be ___, and it did not hurt at all.", "painless", "pain|less", [["painful", "opposite-suffix"], ["painlessly", "ly-for-adjective"]], "It did not hurt at all."],
  ["The garden was ___ with red, yellow, and purple flowers.", "colorful", "color|ful", [["colorless", "opposite-suffix"], ["colorfully", "ly-for-adjective"]], "The garden had many colors."],
  ["The little garden snake is ___; it cannot hurt you.", "harmless", "harm|less", [["harmful", "opposite-suffix"], ["harmlessly", "ly-for-adjective"]], "It cannot hurt you."],
  ["Ana smiled ___ at the new student.", "kindly", "kind|ly", [["kind", "adjective-for-adverb"], ["kindful", "wrong-suffix"]], "The blank tells how Ana smiled."],
  ["The puppy was ___ and chased its tail all day.", "playful", "play|ful", [["playfully", "ly-for-adjective"], ["playless", "wrong-suffix"]], "The blank describes the puppy, which liked to play."],
  ["After the long trip, we were ___ to be home.", "thankful", "thank|ful", [["thankless", "opposite-suffix"], ["thankfully", "ly-for-adjective"]], "The blank describes how we felt about being home."],
  ["Kai ___ fixed the broken toy.", "carefully", "careful|ly", [["careful", "adjective-for-adverb"], ["careless", "opposite-suffix"]], "The blank tells how Kai fixed the toy."],
  ["The sky was clear and ___ last night.", "cloudless", "cloud|less", [["cloudy", "opposite-meaning"], ["cloudlessly", "ly-for-adjective"]], "A clear sky has no clouds."],
  ["The baby slept ___ through the night.", "peacefully", "peaceful|ly", [["peaceful", "adjective-for-adverb"], ["peaceless", "wrong-suffix"]], "The blank tells how the baby slept."],
  ["The old flashlight was ___ because it had no batteries.", "useless", "use|less", [["useful", "opposite-suffix"], ["uselessly", "ly-for-adjective"]], "Without batteries, the flashlight could not be used."],
];
const ES_SUF2: SufIn[] = [
  ["La tortuga caminó ___ por la arena.", "lentamente", "lenta|mente", [["lentomente", "masculine-base-for-mente"], ["lentitud", "wrong-suffix"]], "La palabra dice cómo caminó. Empieza con la forma femenina: lenta."],
  ["Mía cerró la puerta ___ para no despertar al bebé.", "silenciosamente", "silenciosa|mente", [["silenciosomente", "masculine-base-for-mente"], ["silencio", "wrong-suffix"]], "La palabra dice cómo cerró la puerta. Empieza con la forma femenina: silenciosa."],
  ["Kenji contestó la pregunta ___.", "rápidamente", "rápida|mente", [["rapidamente", "dropped-accent-in-mente"], ["rápidomente", "masculine-base-for-mente"]], "La palabra dice cómo contestó. Rápida lleva tilde."],
  ["El bebé durmió ___ toda la noche.", "tranquilamente", "tranquila|mente", [["tranquilomente", "masculine-base-for-mente"], ["tranquilidad", "wrong-suffix"]], "La palabra dice cómo durmió. Empieza con la forma femenina: tranquila."],
  ["Resolví el problema ___.", "fácilmente", "fácil|mente", [["facilmente", "dropped-accent-in-mente"], ["facilidad", "wrong-suffix"]], "La palabra dice cómo lo resolví. Fácil lleva tilde."],
  ["Ana saludó ___ al estudiante nuevo.", "amablemente", "amable|mente", [["amablamente", "changed-ending-before-mente"], ["amabilidad", "wrong-suffix"]], "La palabra dice cómo saludó. Amable es igual en masculino y femenino."],
  ["Kai arregló el juguete ___.", "cuidadosamente", "cuidadosa|mente", [["cuidadosomente", "masculine-base-for-mente"], ["cuidado", "wrong-suffix"]], "La palabra dice cómo lo arregló. Empieza con la forma femenina: cuidadosa."],
  ["Lena habló ___ con la directora.", "cortésmente", "cortés|mente", [["cortesmente", "dropped-accent-in-mente"], ["cortesía", "wrong-suffix"]], "La palabra dice cómo habló. Cortés lleva tilde."],
  ["El día estaba ___ y gris.", "lluvioso", "lluvia|oso", [["lluviosamente", "mente-for-adjective"], ["lluviero", "wrong-suffix"]], "La palabra describe el día, que tenía mucha lluvia."],
  ["El perro del vecino es muy ___: ladra todo el día.", "ruidoso", "ruido|oso", [["ruidosamente", "mente-for-adjective"], ["ruidero", "wrong-suffix"]], "La palabra describe al perro, que hace mucho ruido."],
  ["Mi abuela es muy ___: siempre nos abraza.", "cariñosa", "cariño|osa", [["cariñosamente", "mente-for-adjective"], ["cariñera", "wrong-suffix"]], "La palabra describe a la abuela, que da mucho cariño."],
  ["El ___ nos trajo una carta.", "cartero", "carta|ero", [["cartita", "ito-for-ero"], ["cartoso", "oso-for-ero"]], "Es la persona que reparte las cartas."],
  ["El ___ hace pan muy temprano.", "panadero", "pan|ero", [["panecito", "ito-for-ero"], ["panoso", "oso-for-ero"]], "Es la persona que hace el pan."],
  ["Construimos una ___ para el pájaro.", "casita", "casa|ita", [["casero", "ero-for-ito"], ["casota", "big-for-small"]], "Es una casa pequeña, a la medida de un pájaro."],
  ["El ___ cuida las flores del parque.", "jardinero", "jardín|ero", [["jardincito", "ito-for-ero"], ["jardinoso", "oso-for-ero"]], "Es la persona que cuida el jardín."],
  ["La playa del norte es muy ___.", "arenosa", "arena|osa", [["arenosamente", "mente-for-adjective"], ["arenera", "wrong-suffix"]], "La palabra describe la playa, que tiene mucha arena."],
];

const SUFFIXES: Level[] = [
  {
    ask: bi("What does this word mean?", "¿Qué quiere decir esta palabra?"),
    hints: bi(
      ["Find the base word and the suffix at the end.", "-ful means full of. -less means without. -ly means in a certain way."],
      ["Busca la palabra base y el sufijo del final.", "-oso: que tiene mucho de algo. -ero: la persona que trabaja con algo. -ito: pequeño."],
    ),
    seconds: 12,
    bank: pair(EN_SUF1.map(sufQ), ES_SUF1.map(esSufQ)),
  },
  {
    ask: bi("Which word completes the sentence?", "¿Qué palabra completa la oración?"),
    hints: bi(
      ["Does the blank describe a thing, or tell how something is done?", "Describing a thing: -ful or -less. Telling how: -ly. Then check that the meaning fits."],
      ["¿La palabra describe algo, o dice cómo se hace algo?", "Para decir cómo se hace algo: forma femenina + -mente, y se conserva la tilde (tímida, tímidamente). Para describir: -oso, -ero o -ito."],
    ),
    seconds: 15,
    bank: pair(EN_SUF2.map(sufInQ("en")), ES_SUF2.map(sufInQ("es"))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.dictionary.order (3) — computed. Level 1: which of four words comes first in ABC order; level 2: which
// word belongs between two guide words. Order is letter by letter; accents do not count; in Spanish, ñ is
// its own letter after n, and ch and ll are sorted as two letters (c + h, l + l), as dictionaries do now.

const ALPHABET: Bi<string> = { en: "abcdefghijklmnopqrstuvwxyz", es: "abcdefghijklmnñopqrstuvwxyz" };
const PLAIN: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u" };
const letters = (w: string) => [...w.toLowerCase()].map((c) => PLAIN[c] ?? c);
/** Negative when a comes before b in dictionary order. */
export function dictCompare(locale: Locale, a: string, b: string) {
  const [x, y, abc] = [letters(a), letters(b), lang(locale, ALPHABET)];
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return abc.indexOf(x[i]) - abc.indexOf(y[i]);
  return x.length - y.length;
}

/** Word pools by starting letters. No word in a pool starts with another whole word from it. */
export const DICT_WORDS: Bi<string[][]> = {
  en: [
    ["ball", "band", "bark", "beach", "bean", "bear", "bell", "bench", "berry", "bird", "blanket", "boat", "book", "bread", "brick", "bus", "button"],
    ["cake", "camel", "candle", "card", "carrot", "castle", "chair", "chalk", "cheese", "chicken", "circle", "city", "clock", "cloud", "coat", "comet", "corn", "cow", "crab", "cup"],
    ["sail", "salad", "sand", "seed", "shell", "ship", "shoe", "sky", "sled", "snail", "snow", "soap", "sock", "soup", "spoon", "star", "sun", "swan", "swing"],
    ["magnet", "map", "marble", "melon", "milk", "mitten", "moon", "moose", "mouse", "mud", "music"],
    ["paint", "panda", "paper", "parrot", "peach", "pear", "pencil", "piano", "pickle", "pillow", "plant", "plum", "pond", "puppy", "purple"],
    ["table", "taco", "tent", "tiger", "toast", "tomato", "tooth", "towel", "train", "tree", "truck", "tulip", "turtle"],
  ],
  es: [
    ["cama", "camino", "cana", "canción", "caña", "casa", "cebolla", "chile", "chocolate", "cielo", "cine", "ciudad", "clavo", "cometa", "conejo", "cuchara", "cuento"],
    ["lago", "lámpara", "lápiz", "leche", "león", "libro", "limón", "llama", "llave", "lluvia", "lobo", "luna"],
    ["nada", "naranja", "nariz", "nido", "nieve", "niño", "noche", "nube", "nuez", "ñandú", "ñu"],
    ["pájaro", "pan", "papel", "pato", "pelota", "pera", "perro", "pez", "piña", "pino", "playa", "pluma", "pollo", "puente", "puerta"],
    ["maleta", "mano", "manzana", "mapa", "mar", "mesa", "miel", "mochila", "mono", "moño", "mundo", "música"],
    ["sal", "sandía", "sapo", "semilla", "silla", "sol", "sopa", "suelo", "sueño"],
  ],
};
const ORDINAL = bi(["first", "second", "third", "fourth", "fifth", "sixth"], ["primera", "segunda", "tercera", "cuarta", "quinta", "sexta"]);
/** The first position where the words do not all share a letter. */
const firstSplit = (ws: string[]) => {
  const ls = ws.map(letters);
  let i = 0;
  while (ls.every((l) => l[i] !== undefined && l[i] === ls[0][i])) i++;
  return i;
};

/** Why someone would put `wrong` before `key`: the place where the two words part ways. */
function orderTag(locale: Locale, key: string, wrong: string) {
  const [k, w] = [letters(key), letters(wrong)];
  let i = 0;
  while (k[i] === w[i]) i++;
  if (locale === "es" && ((k[i] === "n" && w[i] === "ñ") || (k[i] === "ñ" && w[i] === "n"))) return "n-and-enye-order";
  if (locale === "es" && i > 0 && ((k[i - 1] === "c" && k[i] === "h") || (k[i - 1] === "l" && k[i] === "l"))) return "ch-ll-as-one-letter";
  return ["first-letter-order", "second-letter-order", "third-letter-order"][Math.min(i, 2)];
}

function dictionaryOrder(r: Rng, level: number, locale: Locale): ItemBody {
  const pools = lang(locale, DICT_WORDS);
  const pool = [...r.pick(pools)].sort((a, b) => dictCompare(locale, a, b));
  const quote = (w: string) => `"${w}"`;
  if (level === 1) {
    const words = r.shuffle(pool).slice(0, 4);
    const sorted = [...words].sort((a, b) => dictCompare(locale, a, b));
    const key = sorted[0];
    const at = firstSplit(words);
    const choices = words.map((w): Choice => (w === key ? { label: w } : { label: w, why: orderTag(locale, key, w) }));
    const shown = words.map((w) => `${w}: ${letters(w)[at]}`).join(", ");
    const ask = tr(locale, "Which word comes first in ABC order?", "¿Qué palabra va primero en orden alfabético?");
    return {
      prompt: [ask],
      say: ask,
      choices,
      input: "choices",
      answer: { kind: "choice", index: words.indexOf(key) },
      hints: [
        tr(locale, "Look at the first letter of each word. If it is the same, look at the next letter.", "Mira la primera letra de cada palabra. Si es la misma, mira la siguiente."),
        tr(
          locale,
          "Go letter by letter until the words are different. The word whose letter comes first in the alphabet goes first.",
          "Compara letra por letra hasta que las palabras sean distintas. Va primero la que tiene la letra que aparece antes en el abecedario. La ñ va después de la n, y las tildes no cuentan.",
        ),
        tr(locale, `Compare the ${lang(locale, ORDINAL)[at]} letters: ${shown}.`, `Compara la ${lang(locale, ORDINAL)[at]} letra: ${shown}.`),
      ],
      steps: [tr(locale, `In ABC order: ${sorted.join(", ")}.`, `En orden alfabético: ${sorted.join(", ")}.`), tr(locale, `${quote(key)} comes first.`, `${quote(key)} va primero.`)],
      seconds: 20,
    };
  }
  const at = r.shuffle(pool.map((_, i) => i)).slice(0, 5).sort((a, b) => a - b);
  const [before, g1, key, g2, after] = at.map((i) => pool[i]);
  const show = tr(locale, `The guide words on a dictionary page are ${quote(g1)} and ${quote(g2)}.`, `Las palabras guía de una página del diccionario son ${quote(g1)} y ${quote(g2)}.`);
  const ask = tr(locale, "Which word belongs on that page?", "¿Qué palabra está en esa página?");
  const choices = r.shuffle<Choice>([{ label: key }, { label: before, why: "before-first-guide-word" }, { label: after, why: "after-last-guide-word" }]);
  return {
    prompt: [`${show}\n\n${ask}`],
    say: `${show} ${ask}`,
    choices,
    input: "choices",
    answer: { kind: "choice", index: choices.findIndex((c) => c.label === key) },
    hints: [
      tr(locale, "Guide words show the first and the last word on the page.", "Las palabras guía son la primera y la última palabra de la página."),
      tr(locale, "A word on the page comes after the first guide word and before the second one in ABC order.", "Una palabra de esa página va después de la primera palabra guía y antes de la segunda en orden alfabético."),
      tr(locale, `Compare each choice with ${quote(g1)} first. Does it come after it?`, `Compara primero cada opción con ${quote(g1)}. ¿Va después?`),
    ],
    steps: [
      tr(locale, `${quote(before)} comes before ${quote(g1)}, and ${quote(after)} comes after ${quote(g2)}.`, `${quote(before)} va antes de ${quote(g1)}, y ${quote(after)} va después de ${quote(g2)}.`),
      tr(locale, `${quote(key)} is between ${quote(g1)} and ${quote(g2)}.`, `${quote(key)} está entre ${quote(g1)} y ${quote(g2)}.`),
    ],
    seconds: 25,
  };
}

// ---------------------------------------------------------------------------------------------------
// e.titles.letters (3) — level 1: capitals in titles (English: every important word; Spanish: only the
// first word and names). Level 2: English commas in addresses; Spanish commas between a city and its
// state or country, and the colon (not a comma) after a letter's greeting.

const SMALL_EN = new Set(["a", "an", "the", "and", "but", "or", "of", "in", "on", "at", "to", "for"]);
const SMALL_ES = new Set(["el", "la", "los", "las", "un", "una", "y", "e", "o", "u", "de", "del", "a", "al", "en", "para", "por", "con", "que", "bajo"]);
const capWord = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const lowWord = (w: string) => w.charAt(0).toLowerCase() + w.slice(1);
const titleQ = (locale: Locale) => (title: string): G => {
  const ws = title.split(" ");
  const small = locale === "en" ? SMALL_EN : SMALL_ES;
  const every = ws.map(capWord).join(" ");
  const englishStyle = ws.map((w, i) => (i === 0 || i === ws.length - 1 || !small.has(w.toLowerCase()) ? capWord(w) : lowWord(w))).join(" ");
  const firstOnly = [capWord(ws[0]), ...ws.slice(1).map(lowWord)].join(" ");
  const allLow = ws.map(lowWord).join(" ");
  const wrong: Wrong[] =
    locale === "en"
      ? [[firstOnly, "only-first-word-capitalized"], [every, "capitalized-small-words"], [[lowWord(ws[0]), ...ws.slice(1)].join(" "), "lowercase-first-word"]]
      : [[englishStyle, "english-title-case"], [every, "capitalized-every-word"], [allLow, "lowercase-first-word"]];
  const smallHere = ws.slice(1, -1).filter((w) => small.has(w.toLowerCase()));
  return [
    "",
    title,
    wrong,
    tr(locale, `The small ${smallHere.length > 1 ? "words here are" : "word here is"} ${smallHere.map((w) => `"${w}"`).join(" and ")}.`, `La primera palabra es "${ws[0]}". Las demás no son nombres propios.`),
    tr(
      locale,
      "Capitalize the first word, the last word, and every important word. Short words like a, the, and, of, in, on, to, and for stay small unless they come first or last.",
      "En español, un título lleva mayúscula solo en la primera palabra y en los nombres propios.",
    ),
  ];
};
const EN_TITLES = [
  "The Boy and the Moon", "A Trip to the Ocean", "The Secret of the Blue Door", "How to Train a Puppy", "Lost in the Snow", "Night of the Fireflies",
  "A Home for a Hermit Crab", "The Girl Who Danced in the Rain", "Songs of the Sea", "A Garden on the Roof", "The Fox and the Hen", "Dinner at the Zoo",
  "Kites in the Wind", "Tacos for Breakfast", "A Robot in My Class", "Under the Big Tree",
];
const ES_TITLES = [
  "El niño y la luna", "Un viaje al mar", "El secreto de la puerta azul", "Cómo cuidar a un perrito", "Perdidos en la nieve", "La noche de las luciérnagas",
  "Una casa para el cangrejo", "La niña que bailaba bajo la lluvia", "Canciones del mar", "Un jardín en el techo", "El zorro y la gallina", "Cena en el zoológico",
  "Arriba y lejos", "Tacos para el desayuno", "Un robot en mi salón", "Bajo el árbol grande",
];

/** English: a city and state at the end of a sentence, or a one-line street address with a ZIP code. */
type Place = { sentence: string; city: string; state: string } | { street: string; city: string; state: string; zip: string };
function addressQ(p: Place): G {
  if ("sentence" in p) {
    const [subject, rest] = p.sentence.split(/ (?=live|grew|is|flew|moved)/);
    const key = `${p.sentence} ${p.city}, ${p.state}.`;
    return [
      "",
      key,
      [[`${p.sentence} ${p.city} ${p.state}.`, "missing-city-state-comma"], [`${subject}, ${rest} ${p.city} ${p.state}.`, "comma-in-wrong-place"]],
      `The city is ${p.city}, and the state is ${p.state}.`,
      "Put a comma between the city and the state.",
      `${p.city}|${p.state}`,
    ];
  }
  const [num, ...name] = p.street.split(" ");
  const key = `${p.street}, ${p.city}, ${p.state} ${p.zip}`;
  return [
    "",
    key,
    [
      [`${p.street} ${p.city} ${p.state} ${p.zip}`, "missing-address-commas"],
      [`${p.street}, ${p.city}, ${p.state}, ${p.zip}`, "comma-before-zip"],
      [`${num}, ${name.join(" ")}, ${p.city}, ${p.state} ${p.zip}`, "comma-after-house-number"],
    ],
    `The street is ${p.street}, the city is ${p.city}, the state is ${p.state}, and the ZIP code is ${p.zip}.`,
    "Put a comma after the street and another between the city and the state. No comma goes before the ZIP code.",
    `${p.city}|${p.state}`,
  ];
}
const EN_PLACES: Place[] = [
  { sentence: "Our cousins live in", city: "Tulsa", state: "Oklahoma" },
  { street: "1420 Pine Street", city: "Dayton", state: "Ohio", zip: "45402" },
  { sentence: "Grandpa grew up in", city: "Santa Fe", state: "New Mexico" },
  { street: "88 Lake Road", city: "Duluth", state: "Minnesota", zip: "55802" },
  { sentence: "My pen pal lives in", city: "Juneau", state: "Alaska" },
  { street: "305 Maple Avenue", city: "Austin", state: "Texas", zip: "78701" },
  { sentence: "The state fair is in", city: "Boise", state: "Idaho" },
  { street: "12 Harbor Lane", city: "Portland", state: "Maine", zip: "04101" },
  { sentence: "Our soccer team flew to", city: "Orlando", state: "Florida" },
  { street: "640 Elm Court", city: "Fresno", state: "California", zip: "93721" },
  { sentence: "Aunt Rosa moved to", city: "Tucson", state: "Arizona" },
  { street: "77 River Drive", city: "Savannah", state: "Georgia", zip: "31401" },
  { sentence: "The science museum is in", city: "Chicago", state: "Illinois" },
  { street: "2 Hill Street", city: "Burlington", state: "Vermont", zip: "05401" },
];

/** Spanish: a city and its state or country in a sentence, or the greeting of a letter. */
type EsPlace = { sentence: string; city: string; region: string } | { greeting: string };
function esAddressQ(p: EsPlace): G {
  if ("greeting" in p) {
    const [first, ...rest] = p.greeting.split(" ");
    return [
      "",
      `${p.greeting}:`,
      [[`${p.greeting},`, "comma-after-greeting"], [`${first}, ${rest.join(" ")}:`, "comma-inside-greeting"]],
      "Es el saludo con que empieza una carta.",
      "Después del saludo de una carta van dos puntos, no coma.",
      "saludo",
    ];
  }
  const [subject, rest] = p.sentence.split(/ (?=viv|nac|vis|est|es |fue|se mud)/);
  return [
    "",
    `${p.sentence} ${p.city}, ${p.region}.`,
    [[`${p.sentence} ${p.city} ${p.region}.`, "missing-city-state-comma"], [`${subject}, ${rest} ${p.city} ${p.region}.`, "comma-between-subject-and-verb"]],
    `La ciudad es ${p.city}, y ${p.region} es el lugar más grande donde está.`,
    "Pon coma entre la ciudad y el estado o el país. Nunca pongas coma entre el sujeto y el verbo.",
    `${p.city}|${p.region}`,
  ];
}
const ES_PLACES: EsPlace[] = [
  { sentence: "Mis abuelos viven en", city: "Mérida", region: "Yucatán" },
  { greeting: "Querida abuela" },
  { sentence: "Mi papá nació en", city: "Cali", region: "Colombia" },
  { greeting: "Querido tío Pablo" },
  { sentence: "Mi prima vive en", city: "Ponce", region: "Puerto Rico" },
  { greeting: "Estimada maestra Ruiz" },
  { sentence: "Este verano mi familia visitó", city: "Cusco", region: "Perú" },
  { greeting: "Queridos papá y mamá" },
  { sentence: "La feria del libro es en", city: "Monterrey", region: "Nuevo León" },
  { greeting: "Querida Lucía" },
  { sentence: "Mis tíos se mudaron a", city: "Valparaíso", region: "Chile" },
  { greeting: "Estimado señor Gómez" },
  { sentence: "El museo de ciencias está en", city: "Guadalajara", region: "Jalisco" },
  { greeting: "Querido amigo" },
];

const TITLES_LETTERS: Level[] = [
  {
    ask: bi("Which book title is written correctly?", "¿Qué título de libro está bien escrito?"),
    hints: bi(
      ["Look at which words start with a capital letter.", "In a title, capitalize the first word, the last word, and every important word. Small words like the, and, of, in, and to stay small in the middle."],
      ["Fíjate en qué palabras empiezan con mayúscula.", "En español, un título lleva mayúscula en la primera palabra y en los nombres propios. Las demás palabras van con minúscula."],
    ),
    seconds: 20,
    bank: pair(EN_TITLES.map(titleQ("en")), ES_TITLES.map(titleQ("es"))),
  },
  {
    ask: bi("Which one is written correctly?", "¿Cuál está bien escrito?"),
    hints: bi(
      ["Find the city and the state.", "Put a comma between the city and the state. In a street address, put a comma after the street too. No comma before the ZIP code."],
      ["Busca la ciudad y el estado o país, o el saludo de la carta.", "Va coma entre la ciudad y el estado o el país. Después del saludo de una carta van dos puntos."],
    ),
    seconds: 20,
    bank: pair(EN_PLACES.map(addressQ), ES_PLACES.map(esAddressQ)),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.relative.words (4) — level 1 relative pronouns (who, which, whose; que, quien/quienes, cuyo/a/os/as),
// level 2 relative adverbs (where, when, why; donde, cuando). "that" is never offered: it can replace who
// or which in many sentences. Spanish "que" and "quien" never compete where both are correct.

/** [sentence, key, wrong choices with tags, clue, what the word points back to] */
type Rel = [string, string, Wrong[], string, string];
const relQ = (locale: Locale, says: Record<string, string>) => ([s, key, wrong, clue, base]: Rel): G => [s, key, wrong, clue, `"${key}" ${says[base]}.`, base];
const REL_SAYS = bi<Record<string, string>>(
  {
    person: "points back to a person", thing: "points back to a thing, after a comma", owner: "shows who or what something belongs to",
    place: "points back to a place", time: "points back to a time", reason: "points back to a reason",
  },
  {
    person: "se refiere a una persona y aquí no lleva coma antes", people: "se refiere a varias personas después de una preposición",
    "one-person": "se refiere a una sola persona después de una coma o una preposición", thing: "se refiere a una cosa",
    owner: "dice de quién es algo y concuerda con lo que se tiene", place: "se refiere a un lugar", time: "se refiere a un momento",
  },
);
const EN_REL1: Rel[] = [
  ["The girl ___ won the race is my cousin.", "who", [["which", "thing-word-for-person"], ["whose", "owner-word-misused"]], "The word points back to the girl, a person.", "person"],
  ["Our car, ___ is ten years old, still runs well.", "which", [["who", "person-word-for-thing"], ["whose", "owner-word-misused"]], "The word points back to the car, a thing.", "thing"],
  ["I met a boy ___ sister plays the violin.", "whose", [["who's", "contraction-for-whose"], ["who", "missing-ownership"]], "The sister belongs to the boy.", "owner"],
  ["The teacher ___ helped me is Mr. Diaz.", "who", [["which", "thing-word-for-person"], ["whose", "owner-word-misused"]], "The word points back to the teacher, a person.", "person"],
  ["My bike, ___ has a flat tire, is in the garage.", "which", [["who", "person-word-for-thing"], ["whose", "owner-word-misused"]], "The word points back to the bike, a thing.", "thing"],
  ["That is the woman ___ dog won the show.", "whose", [["who's", "contraction-for-whose"], ["which", "thing-word-for-person"]], "The dog belongs to the woman.", "owner"],
  ["The students ___ finished early read books.", "who", [["which", "thing-word-for-person"], ["whose", "owner-word-misused"]], "The word points back to the students, people.", "person"],
  ["This book, ___ I read last summer, is about space.", "which", [["who", "person-word-for-thing"], ["whose", "owner-word-misused"]], "The word points back to the book, a thing.", "thing"],
  ["We thanked the firefighter ___ rescued the cat.", "who", [["which", "thing-word-for-person"], ["whose", "owner-word-misused"]], "The word points back to the firefighter, a person.", "person"],
  ["Lena has a friend ___ family lives in Peru.", "whose", [["who's", "contraction-for-whose"], ["who", "missing-ownership"]], "The family belongs to the friend.", "owner"],
  ["The museum, ___ opened last year, has a dinosaur room.", "which", [["who", "person-word-for-thing"], ["whose", "owner-word-misused"]], "The word points back to the museum, a place or thing.", "thing"],
  ["Kai is the player ___ scored the goal.", "who", [["which", "thing-word-for-person"], ["whose", "owner-word-misused"]], "The word points back to the player, a person.", "person"],
  ["The tree ___ leaves turned red is a maple.", "whose", [["who's", "contraction-for-whose"], ["which", "missing-ownership"]], "The leaves belong to the tree.", "owner"],
  ["My grandma, ___ is a nurse, works at night.", "who", [["which", "thing-word-for-person"], ["whose", "owner-word-misused"]], "The word points back to my grandma, a person.", "person"],
];
const ES_REL1: Rel[] = [
  ["La niña ___ ganó la carrera es mi prima.", "que", [["quien", "quien-without-comma-or-preposition"], ["cuya", "owner-word-misused"]], "La palabra se refiere a la niña, y no hay coma ni preposición antes.", "person"],
  ["Los amigos con ___ jugué ayer viven cerca.", "quienes", [["quien", "number-agreement-slip"], ["cuyos", "owner-word-misused"]], "La palabra va después de con y se refiere a los amigos: varias personas.", "people"],
  ["Conocí a un niño ___ hermana toca el violín.", "cuya", [["cuyo", "cuyo-agrees-with-owner"], ["que su", "que-su-for-cuyo"]], "La hermana es del niño. Hermana es femenino.", "owner"],
  ["El maestro ___ me ayudó se llama Diego.", "que", [["quien", "quien-without-comma-or-preposition"], ["cuyo", "owner-word-misused"]], "La palabra se refiere al maestro, y no hay coma ni preposición antes.", "person"],
  ["Mi bicicleta, ___ tiene una llanta ponchada, está en el garaje.", "que", [["quien", "person-word-for-thing"], ["cuya", "owner-word-misused"]], "La palabra se refiere a la bicicleta, una cosa.", "thing"],
  ["Esa es la señora ___ perro ganó el concurso.", "cuyo", [["cuya", "cuyo-agrees-with-owner"], ["que su", "que-su-for-cuyo"]], "El perro es de la señora. Perro es masculino.", "owner"],
  ["La persona a ___ le escribí me contestó.", "quien", [["quienes", "number-agreement-slip"], ["cuya", "owner-word-misused"]], "La palabra va después de a y se refiere a una sola persona.", "one-person"],
  ["Este libro, ___ leí el verano pasado, trata del espacio.", "que", [["quien", "person-word-for-thing"], ["cuyo", "owner-word-misused"]], "La palabra se refiere al libro, una cosa.", "thing"],
  ["Le dimos las gracias al bombero ___ rescató al gato.", "que", [["quien", "quien-without-comma-or-preposition"], ["cuyo", "owner-word-misused"]], "La palabra se refiere al bombero, y no hay coma ni preposición antes.", "person"],
  ["Lena tiene una amiga ___ familia vive en Perú.", "cuya", [["cuyo", "cuyo-agrees-with-owner"], ["que su", "que-su-for-cuyo"]], "La familia es de la amiga. Familia es femenino.", "owner"],
  ["Las vecinas con ___ hablé son muy amables.", "quienes", [["quien", "number-agreement-slip"], ["cuyas", "owner-word-misused"]], "La palabra va después de con y se refiere a las vecinas: varias personas.", "people"],
  ["Kai es el jugador ___ metió el gol.", "que", [["quien", "quien-without-comma-or-preposition"], ["cuyo", "owner-word-misused"]], "La palabra se refiere al jugador, y no hay coma ni preposición antes.", "person"],
  ["El árbol ___ hojas se pusieron rojas es un arce.", "cuyas", [["cuyo", "cuyo-agrees-with-owner"], ["que sus", "que-su-for-cuyo"]], "Las hojas son del árbol. Hojas es femenino y plural.", "owner"],
  ["Mi abuela, ___ es enfermera, trabaja de noche.", "quien", [["quienes", "number-agreement-slip"], ["cuya", "owner-word-misused"]], "La palabra va después de una coma y se refiere a una sola persona.", "one-person"],
];
const EN_REL2: Rel[] = [
  ["This is the park ___ we play soccer.", "where", [["when", "time-word-for-place"], ["which", "which-without-preposition"]], "The word points back to the park.", "place"],
  ["I remember the day ___ it snowed in April.", "when", [["where", "place-word-for-time"], ["which", "which-without-preposition"]], "The word points back to the day.", "time"],
  ["Tell me the reason ___ you are late.", "why", [["where", "place-word-for-reason"], ["when", "time-word-for-reason"]], "The word points back to the reason.", "reason"],
  ["The kitchen is the room ___ we eat breakfast.", "where", [["when", "time-word-for-place"], ["who", "person-word-for-place"]], "The word points back to the room.", "place"],
  ["Summer is the season ___ the pool opens.", "when", [["where", "place-word-for-time"], ["which", "which-without-preposition"]], "The word points back to the season.", "time"],
  ["Nobody knows the reason ___ the bus was late.", "why", [["when", "time-word-for-reason"], ["where", "place-word-for-reason"]], "The word points back to the reason.", "reason"],
  ["We visited the town ___ Grandpa was born.", "where", [["when", "time-word-for-place"], ["which", "which-without-preposition"]], "The word points back to the town.", "place"],
  ["Saturday is the day ___ we clean the house.", "when", [["where", "place-word-for-time"], ["who", "person-word-for-time"]], "The word points back to the day.", "time"],
  ["That is the reason ___ I wear a helmet.", "why", [["where", "place-word-for-reason"], ["which", "which-without-preposition"]], "The word points back to the reason.", "reason"],
  ["The library is a place ___ you can borrow books.", "where", [["when", "time-word-for-place"], ["who", "person-word-for-place"]], "The word points back to the place.", "place"],
  ["Do you remember the time ___ we saw a rainbow?", "when", [["where", "place-word-for-time"], ["which", "which-without-preposition"]], "The word points back to the time.", "time"],
  ["The beach is the spot ___ the turtles lay their eggs.", "where", [["when", "time-word-for-place"], ["which", "which-without-preposition"]], "The word points back to the spot.", "place"],
  ["I know the reason ___ the plant dried up.", "why", [["where", "place-word-for-reason"], ["when", "time-word-for-reason"]], "The word points back to the reason.", "reason"],
  ["Noon is the time ___ we eat lunch.", "when", [["where", "place-word-for-time"], ["which", "which-without-preposition"]], "The word points back to the time.", "time"],
];
const ES_REL2: Rel[] = [
  ["Este es el parque ___ jugamos fútbol.", "donde", [["cuando", "time-word-for-place"], ["que", "que-without-preposition"]], "La palabra se refiere al parque, un lugar.", "place"],
  ["Por la noche, ___ todos duermen, la casa está en silencio.", "cuando", [["donde", "place-word-for-time"], ["que", "que-without-preposition"]], "La palabra se refiere a la noche, un momento.", "time"],
  ["La cocina es el lugar ___ desayunamos.", "donde", [["cuando", "time-word-for-place"], ["quien", "person-word-for-place"]], "La palabra se refiere a la cocina, un lugar.", "place"],
  ["Visitamos el pueblo ___ nació mi abuelo.", "donde", [["cuando", "time-word-for-place"], ["que", "que-without-preposition"]], "La palabra se refiere al pueblo, un lugar.", "place"],
  ["El sábado, ___ no hay clases, limpiamos la casa.", "cuando", [["donde", "place-word-for-time"], ["quien", "person-word-for-time"]], "La palabra se refiere al sábado, un momento.", "time"],
  ["La biblioteca es un lugar ___ puedes pedir libros.", "donde", [["cuando", "time-word-for-place"], ["quien", "person-word-for-place"]], "La palabra se refiere a la biblioteca, un lugar.", "place"],
  ["Ayer, ___ salió el arcoíris, todos corrimos a verlo.", "cuando", [["donde", "place-word-for-time"], ["que", "que-without-preposition"]], "La palabra se refiere a ayer, un momento.", "time"],
  ["La playa es el sitio ___ las tortugas ponen sus huevos.", "donde", [["cuando", "time-word-for-place"], ["que", "que-without-preposition"]], "La palabra se refiere a la playa, un lugar.", "place"],
  ["Al mediodía, ___ suena la campana, comemos.", "cuando", [["donde", "place-word-for-time"], ["quien", "person-word-for-time"]], "La palabra se refiere al mediodía, un momento.", "time"],
  ["Esta es la casa ___ vivíamos antes.", "donde", [["cuando", "time-word-for-place"], ["que", "que-without-preposition"]], "La palabra se refiere a la casa, un lugar.", "place"],
  ["En vacaciones, ___ tenemos más tiempo, leemos mucho.", "cuando", [["donde", "place-word-for-time"], ["quien", "person-word-for-time"]], "La palabra se refiere a las vacaciones, un momento.", "time"],
  ["El gimnasio es el salón ___ practicamos baile.", "donde", [["cuando", "time-word-for-place"], ["que", "que-without-preposition"]], "La palabra se refiere al gimnasio, un lugar.", "place"],
  ["Por la mañana, ___ sale el sol, los gallos cantan.", "cuando", [["donde", "place-word-for-time"], ["que", "que-without-preposition"]], "La palabra se refiere a la mañana, un momento.", "time"],
  ["Encontré la caja ___ guardas tus canicas.", "donde", [["cuando", "time-word-for-place"], ["quien", "person-word-for-place"]], "La palabra se refiere a la caja, el lugar en que se guardan las canicas.", "place"],
];

const RELATIVE_WORDS: Level[] = [
  {
    ask: bi("Which word completes the sentence?", "¿Qué palabra completa la oración?"),
    hints: bi(
      ["What does the missing word point back to: a person, a thing, or an owner?", "who is for people, which is for things, and whose shows that something belongs to someone."],
      ["¿A qué se refiere la palabra que falta: a una persona, a una cosa, o a un dueño?", "que sirve para personas y cosas. quien y quienes, solo para personas, van después de una coma o de una preposición. cuyo, cuya, cuyos y cuyas concuerdan con lo que se tiene."],
    ),
    seconds: 18,
    bank: pair(EN_REL1.map(relQ("en", REL_SAYS.en)), ES_REL1.map(relQ("es", REL_SAYS.es))),
  },
  {
    ask: bi("Which word completes the sentence?", "¿Qué palabra completa la oración?"),
    hints: bi(
      ["What does the missing word point back to: a place, a time, or a reason?", "where is for places, when is for times, and why is for reasons."],
      ["¿A qué se refiere la palabra que falta: a un lugar o a un momento?", "donde se refiere a un lugar. cuando se refiere a un momento."],
    ),
    seconds: 15,
    bank: pair(EN_REL2.map(relQ("en", REL_SAYS.en)), ES_REL2.map(relQ("es", REL_SAYS.es))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.progressive.tenses (4) — am/is/are, was/were, will be + -ing; Spanish estar + gerundio (estoy
// leyendo, estaba durmiendo, estaré mirando), including the irregular gerunds.

/** [sentence, key, wrong forms, clue, verb|tense|subject] */
type Prog = [string, string, Wrong[], string, string];
const PROG_TENSE = bi<Record<string, string>>({ present: "present", past: "past", future: "future" }, { present: "presente", past: "pasado", future: "futuro" });
const progQ = (locale: Locale) => ([s, key, wrong, clue, base]: Prog): G => {
  const [, tense] = base.split("|");
  return [
    s,
    key,
    wrong,
    clue,
    tr(
      locale,
      `The action is still going on in the ${PROG_TENSE.en[tense]}, so use ${tense === "future" ? "will be" : "the right form of be"} with the -ing verb.`,
      `La acción está en curso en ${PROG_TENSE.es[tense]}, así que se usa estar en ${PROG_TENSE.es[tense]} con el gerundio.`,
    ),
    base,
  ];
};
const EN_PROG: Prog[] = [
  ["Right now the baby ___ in her crib.", "is sleeping", [["are sleeping", "aux-disagrees-with-subject"], ["was sleeping", "past-for-present"]], "\"Right now\" tells when. The baby is one person.", "sleep|present|one"],
  ["Look, the kids ___ in the pool.", "are swimming", [["is swimming", "aux-disagrees-with-subject"], ["are swiming", "missed-double-consonant"]], "It is happening now, and the kids are more than one.", "swim|present|many"],
  ["At eight o'clock last night, I ___ a book.", "was reading", [["were reading", "aux-disagrees-with-subject"], ["am reading", "present-for-past"]], "\"Last night\" tells when, and the subject is I.", "read|past|I"],
  ["This time tomorrow, we ___ to the lake.", "will be driving", [["will be driveing", "kept-silent-e"], ["were driving", "past-for-future"]], "\"This time tomorrow\" tells when.", "drive|future|many"],
  ["Shh, Grandpa ___ a nap.", "is taking", [["is takeing", "kept-silent-e"], ["are taking", "aux-disagrees-with-subject"]], "It is happening now. Take ends in a silent e.", "take|present|one"],
  ["When the phone rang, Mom ___ dinner.", "was cooking", [["were cooking", "aux-disagrees-with-subject"], ["is cooking", "present-for-past"]], "The phone rang in the past, and Mom is one person.", "cook|past|one"],
  ["Right now my cousins ___ a sandcastle.", "are building", [["is building", "aux-disagrees-with-subject"], ["were building", "past-for-present"]], "\"Right now\" tells when. My cousins are more than one.", "build|present|many"],
  ["At noon tomorrow, Kai ___ in the school play.", "will be acting", [["was acting", "past-for-future"], ["will be act", "missing-ing"]], "\"Tomorrow\" tells when.", "act|future|one"],
  ["When the storm started, we ___ soccer.", "were playing", [["was playing", "aux-disagrees-with-subject"], ["are playing", "present-for-past"]], "The storm started in the past, and \"we\" means more than one person.", "play|past|many"],
  ["Listen, the birds ___ outside.", "are singing", [["is singing", "aux-disagrees-with-subject"], ["were singing", "past-for-present"]], "It is happening now, and the birds are more than one.", "sing|present|many"],
  ["Yesterday at three, Ana ___ her bike.", "was riding", [["was rideing", "kept-silent-e"], ["were riding", "aux-disagrees-with-subject"]], "\"Yesterday\" tells when. Ride ends in a silent e.", "ride|past|one"],
  ["Tonight at nine, I ___ the stars with Dad.", "will be watching", [["will watching", "missing-be"], ["was watching", "past-for-future"]], "\"Tonight at nine\" has not happened yet.", "watch|future|I"],
  ["The dog ___ its tail right now.", "is wagging", [["is waging", "missed-double-consonant"], ["are wagging", "aux-disagrees-with-subject"]], "It is happening now. Wag has one short vowel and ends in one consonant.", "wag|present|one"],
  ["When I called, my friends ___ lunch.", "were eating", [["was eating", "aux-disagrees-with-subject"], ["are eating", "present-for-past"]], "I called in the past, and my friends are more than one.", "eat|past|many"],
  ["Next Saturday at noon, we ___ a picnic in the park.", "will be having", [["will be haveing", "kept-silent-e"], ["were having", "past-for-future"]], "\"Next Saturday\" has not happened yet.", "have|future|many"],
  ["Right now I ___ my homework.", "am doing", [["is doing", "aux-disagrees-with-subject"], ["was doing", "past-for-present"]], "\"Right now\" tells when, and the subject is I.", "do|present|I"],
];
const ES_PROG: Prog[] = [
  ["Ahora mismo la bebé ___ en su cuna.", "está durmiendo", [["está dormiendo", "regular-gerund-for-irregular"], ["están durmiendo", "aux-disagrees-with-subject"]], "\"Ahora mismo\" dice cuándo. Dormir cambia la o en el gerundio.", "dormir|present|ella"],
  ["Mira, los niños ___ en la alberca.", "están nadando", [["está nadando", "aux-disagrees-with-subject"], ["estaban nadando", "past-for-present"]], "Pasa ahora, y los niños son varios.", "nadar|present|ellos"],
  ["Anoche a las ocho, yo ___ un libro.", "estaba leyendo", [["estaba leiendo", "regular-gerund-for-irregular"], ["estoy leyendo", "present-for-past"]], "\"Anoche\" dice cuándo. Leer tiene un gerundio especial.", "leer|past|yo"],
  ["Mañana a esta hora, nosotros ___ hacia el lago.", "estaremos manejando", [["estábamos manejando", "past-for-future"], ["estaremos manejiendo", "wrong-gerund-ending"]], "\"Mañana a esta hora\" todavía no pasa.", "manejar|future|nosotros"],
  ["Silencio, el abuelo ___ en el sillón.", "está descansando", [["están descansando", "aux-disagrees-with-subject"], ["está descansiendo", "wrong-gerund-ending"]], "Pasa ahora, y el abuelo es una sola persona.", "descansar|present|él"],
  ["Cuando sonó el teléfono, mamá ___ la cena.", "estaba preparando", [["estaban preparando", "aux-disagrees-with-subject"], ["está preparando", "present-for-past"]], "El teléfono sonó en el pasado, y mamá es una sola persona.", "preparar|past|ella"],
  ["Ahora mismo mis primos ___ un castillo de arena.", "están construyendo", [["están construiendo", "regular-gerund-for-irregular"], ["está construyendo", "aux-disagrees-with-subject"]], "\"Ahora mismo\" dice cuándo. Construir lleva y en el gerundio.", "construir|present|ellos"],
  ["Mañana a mediodía, Kai ___ en la obra de la escuela.", "estará actuando", [["estaba actuando", "past-for-future"], ["estarán actuando", "aux-disagrees-with-subject"]], "\"Mañana\" dice cuándo, y Kai es una sola persona.", "actuar|future|él"],
  ["Cuando empezó la tormenta, nosotros ___ fútbol.", "estábamos jugando", [["estaban jugando", "aux-disagrees-with-subject"], ["estamos jugando", "present-for-past"]], "La tormenta empezó en el pasado, y el sujeto es nosotros.", "jugar|past|nosotros"],
  ["Escucha, los pájaros ___ afuera.", "están cantando", [["está cantando", "aux-disagrees-with-subject"], ["estaban cantando", "past-for-present"]], "Pasa ahora, y los pájaros son varios.", "cantar|present|ellos"],
  ["Ayer a las tres, Ana ___ en bicicleta.", "estaba andando", [["estaban andando", "aux-disagrees-with-subject"], ["está andando", "present-for-past"]], "\"Ayer\" dice cuándo, y Ana es una sola persona.", "andar|past|ella"],
  ["Esta noche a las nueve, yo ___ las estrellas con papá.", "estaré mirando", [["estaba mirando", "past-for-future"], ["estará mirando", "aux-disagrees-with-subject"]], "\"Esta noche a las nueve\" todavía no pasa, y el sujeto es yo.", "mirar|future|yo"],
  ["El perro ___ la cola ahora mismo.", "está moviendo", [["está moviando", "wrong-gerund-ending"], ["están moviendo", "aux-disagrees-with-subject"]], "Pasa ahora. Mover termina en -er.", "mover|present|él"],
  ["Cuando llamé, mis amigos ___ el almuerzo.", "estaban comiendo", [["estaba comiendo", "aux-disagrees-with-subject"], ["están comiendo", "present-for-past"]], "Llamé en el pasado, y mis amigos son varios.", "comer|past|ellos"],
  ["En este momento la maestra nos ___ un cuento.", "está leyendo", [["está leiendo", "regular-gerund-for-irregular"], ["estaba leyendo", "past-for-present"]], "\"En este momento\" dice cuándo. Leer tiene un gerundio especial.", "leer|present|ella"],
  ["Ahora mismo yo ___ la tarea.", "estoy haciendo", [["está haciendo", "aux-disagrees-with-subject"], ["estoy haciando", "wrong-gerund-ending"]], "\"Ahora mismo\" dice cuándo, y el sujeto es yo.", "hacer|present|yo"],
];

const PROGRESSIVE: Level[] = [
  {
    ask: bi("Choose the verb that completes the sentence.", "Elige el verbo que completa la oración."),
    hints: bi(
      ["The action is in the middle of happening. When: now, in the past, or later?", "Now: am, is, or are + -ing. Past: was or were + -ing. Later: will be + -ing. Match is and was with one, are and were with more than one."],
      ["La acción está en curso. ¿Cuándo: ahora, en el pasado, o después?", "Ahora: estoy, está, estamos, están + gerundio. Pasado: estaba, estábamos, estaban + gerundio. Después: estaré, estará, estaremos, estarán + gerundio. El gerundio termina en -ando o -iendo, y en -yendo cuando la raíz del verbo termina en vocal (oír, oyendo)."],
    ),
    seconds: 15,
    bank: pair(EN_PROG.map(progQ("en")), ES_PROG.map(progQ("es"))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.modal.verbs (4) — what a helping verb tells: able to, allowed to, has to, or might happen. Each
// sentence's context leaves one meaning (can is "able to" in "Kai can juggle", "allowed to" in "You can
// have one cookie").

const MODAL_LABELS = bi(["Able to", "Allowed to", "Has to", "Might happen"], ["Es capaz", "Tiene permiso", "Es obligatorio", "Es posible"]);
const MODAL_TAGS = ["ability", "permission", "necessity", "possibility"];
/** [sentence, meaning index, the helping verb] */
type Modal = [string, number, string];
const modalQ = (locale: Locale) => ([s, m, verb]: Modal): L => [
  `“${s}”\n\n${tr(locale, "Helping verb", "Palabra clave")}: ${verb}`,
  m,
  tr(locale, `The helping verb is "${verb}". Read the rest of the sentence: what does it tell you?`, `La palabra clave es "${verb}". Lee el resto de la oración: ¿qué te dice?`),
  tr(
    locale,
    [`Here "${verb}" tells what someone is able to do.`, `Here "${verb}" tells what someone is allowed to do.`, `Here "${verb}" tells what has to happen.`, `Here "${verb}" tells what may or may not happen.`][m],
    [`Aquí "${verb}" dice lo que alguien es capaz de hacer.`, `Aquí "${verb}" dice lo que alguien tiene permiso de hacer.`, `Aquí "${verb}" dice lo que se tiene que hacer.`, `Aquí "${verb}" dice algo que puede pasar o no.`][m],
  ),
  verb,
];
const EN_MODAL: Modal[] = [
  ["Kai can juggle three balls.", 0, "can"], ["You may leave the table when you finish.", 1, "may"], ["Everyone must wear a seat belt in the car.", 2, "must"],
  ["It might snow tonight.", 3, "might"], ["My baby sister can walk now.", 0, "can"], ["You can have one cookie after dinner.", 1, "can"],
  ["Visitors must sign in at the front desk.", 2, "must"], ["The game may be canceled if it rains.", 3, "may"], ["Leila could read before she started school.", 0, "could"],
  ["Students may use a calculator on this test.", 1, "may"], ["We must turn off the lights when we leave.", 2, "must"], ["Grandpa might visit us next week.", 3, "might"],
  ["Penguins can swim, but they cannot fly.", 0, "can"], ["Can I go to Omar's house after school, Mom?", 1, "can"], ["All players have to bring water to practice.", 2, "have to"],
  ["The package could arrive tomorrow.", 3, "could"],
];
const ES_MODAL: Modal[] = [
  ["Kai puede hacer malabares con tres pelotas.", 0, "puede"], ["Pueden levantarse de la mesa cuando terminen.", 1, "pueden"], ["Todos tienen que usar el cinturón de seguridad.", 2, "tienen que"],
  ["Puede que nieve esta noche.", 3, "puede que"], ["Mi hermanita ya puede caminar.", 0, "puede"], ["Puedes comer una galleta después de la cena.", 1, "puedes"],
  ["Los visitantes deben firmar en la entrada.", 2, "deben"], ["El partido podría cancelarse si llueve.", 3, "podría"], ["Leila sabía leer antes de entrar a la escuela.", 0, "sabía"],
  ["En este examen pueden usar la calculadora.", 1, "pueden"], ["Hay que apagar las luces al salir.", 2, "hay que"], ["Puede que el abuelo nos visite la próxima semana.", 3, "puede que"],
  ["Los pingüinos saben nadar, pero no pueden volar.", 0, "saben"], ["Mamá, ¿puedo ir a casa de Omar después de clases?", 1, "puedo"], ["Todos los jugadores deben traer agua al entrenamiento.", 2, "deben"],
  ["El paquete podría llegar mañana.", 3, "podría"],
];

const MODALS: Level[] = [
  {
    ask: bi("What does the helping verb tell?", "¿Qué indica la palabra clave?"),
    hints: bi(
      ["Find the helping verb. Then read the rest of the sentence for clues.", "can means able to or allowed to. could can mean was able to, or that something might happen. may can mean allowed to or might happen. must and have to mean has to. might means it might happen."],
      ["Mira la palabra clave y el verbo que la acompaña. Luego lee el resto de la oración.", "poder puede indicar habilidad, permiso o posibilidad. saber + verbo indica habilidad. tener que, deber y hay que indican obligación. puede que y podría indican posibilidad."],
    ),
    seconds: 15,
    labels: MODAL_LABELS,
    tags: MODAL_TAGS,
    bank: pair(EN_MODAL.map(modalQ("en")), ES_MODAL.map(modalQ("es"))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.adjective.order (4) — English: opinion, size, age, color, origin, material (a small red bag, a lovely
// old Spanish guitar). Shape and "feel" words are left out because style guides order them differently.
// Spanish: the short form before a noun (un buen día, el tercer piso, una gran ciudad) and color or
// nationality after the noun, in lowercase and agreeing (una camiseta roja, un cuento japonés).

/** [sentence, key, wrong orders with tags, clue, the adjectives' kinds (Spanish: the worked line)] */
type Order = [string, string, Wrong[], string, string];
const orderQ = (locale: Locale) => ([s, key, wrong, clue, base]: Order): G =>
  locale === "en" ? [s, key, wrong, clue, `The order is ${base.split("|").join(", then ")}: ${key}.`, base] : [s, key, wrong, clue, base];
const EN_ORDER: Order[] = [
  ["Leo carried a ___ bag.", "small red", [["red small", "color-too-early"], ["small, red", "comma-between-different-kinds"]], "Small tells size. Red tells color.", "size|color"],
  ["We sat on a ___ bench.", "long wooden", [["wooden long", "material-too-early"], ["long, wooden", "comma-between-different-kinds"]], "Long tells size. Wooden tells what it is made of.", "size|material"],
  ["Grandma has a ___ cat.", "lovely old", [["old lovely", "age-too-early"], ["lovely, old", "comma-between-different-kinds"]], "Lovely is what someone thinks. Old tells age.", "opinion|age"],
  ["Ana wore a ___ scarf.", "blue cotton", [["cotton blue", "material-too-early"], ["blue, cotton", "comma-between-different-kinds"]], "Blue tells color. Cotton tells what it is made of.", "color|material"],
  ["There is a ___ house on our street.", "big old", [["old big", "age-too-early"], ["big, old", "comma-between-different-kinds"]], "Big tells size. Old tells age.", "size|age"],
  ["Dad cooked soup in a ___ pot.", "large metal", [["metal large", "material-too-early"], ["large, metal", "comma-between-different-kinds"]], "Large tells size. Metal tells what it is made of.", "size|material"],
  ["We found a ___ coin in the sand.", "tiny gold", [["gold tiny", "material-too-early"], ["tiny, gold", "comma-between-different-kinds"]], "Tiny tells size. Gold tells what it is made of.", "size|material"],
  ["Kai drew a ___ dragon.", "scary green", [["green scary", "color-too-early"], ["scary, green", "comma-between-different-kinds"]], "Scary is what someone thinks. Green tells color.", "opinion|color"],
  ["She bought a ___ rug.", "beautiful Mexican", [["Mexican beautiful", "origin-too-early"], ["beautiful, Mexican", "comma-between-different-kinds"]], "Beautiful is what someone thinks. Mexican tells where it is from.", "opinion|origin"],
  ["Grandma keeps her ___ vase on a shelf.", "old Chinese", [["Chinese old", "origin-too-early"], ["old, Chinese", "comma-between-different-kinds"]], "Old tells age. Chinese tells where it is from.", "age|origin"],
  ["We rode in a ___ boat.", "big old red", [["red big old", "color-too-early"], ["old red big", "age-too-early"]], "Big tells size, old tells age, and red tells color.", "size|age|color"],
  ["Mia plays a ___ guitar.", "beautiful old Spanish", [["Spanish beautiful old", "origin-too-early"], ["old beautiful Spanish", "age-too-early"]], "Beautiful is an opinion, old tells age, and Spanish tells where it is from.", "opinion|age|origin"],
  ["The baby played with a ___ ball.", "small yellow rubber", [["rubber small yellow", "material-too-early"], ["yellow small rubber", "color-too-early"]], "Small tells size, yellow tells color, and rubber tells what it is made of.", "size|color|material"],
  ["Omar wore his ___ boots.", "new brown leather", [["leather new brown", "material-too-early"], ["brown new leather", "color-too-early"]], "New tells age, brown tells color, and leather tells what they are made of.", "age|color|material"],
  ["We ate at a ___ restaurant.", "lovely little Italian", [["Italian lovely little", "origin-too-early"], ["little lovely Italian", "size-too-early"]], "Lovely is an opinion, little tells size, and Italian tells where it is from.", "opinion|size|origin"],
  ["Grandpa gave me a ___ watch.", "nice old silver", [["silver nice old", "material-too-early"], ["old nice silver", "age-too-early"]], "Nice is an opinion, old tells age, and silver tells what it is made of.", "opinion|age|material"],
];
const ES_ORDER: Order[] = [
  ["Hoy es un ___ día.", "buen", [["bueno", "full-form-before-noun"], ["buena", "agreement-slip"]], "La palabra va antes de día, un sustantivo masculino singular.", "Bueno se acorta a buen antes de un sustantivo masculino singular."],
  ["Vivimos en el ___ piso.", "tercer", [["tercero", "full-form-before-noun"], ["tercera", "agreement-slip"]], "La palabra va antes de piso, un sustantivo masculino singular.", "Tercero se acorta a tercer antes de un sustantivo masculino singular."],
  ["Ayer hizo ___ tiempo.", "mal", [["malo", "full-form-before-noun"], ["mala", "agreement-slip"]], "La palabra va antes de tiempo, un sustantivo masculino singular.", "Malo se acorta a mal antes de un sustantivo masculino singular."],
  ["Mi equipo llegó en ___ lugar.", "primer", [["primero", "full-form-before-noun"], ["primera", "agreement-slip"]], "La palabra va antes de lugar, un sustantivo masculino singular.", "Primero se acorta a primer antes de un sustantivo masculino singular."],
  ["Monterrey es una ___ ciudad.", "gran", [["grande", "full-form-before-noun"], ["grandes", "agreement-slip"]], "La palabra va antes de ciudad, un sustantivo singular.", "Grande se acorta a gran antes de cualquier sustantivo singular, masculino o femenino."],
  ["No tengo ___ libro de dragones.", "ningún", [["ninguno", "full-form-before-noun"], ["ninguna", "agreement-slip"]], "La palabra va antes de libro, un sustantivo masculino singular.", "Ninguno se acorta a ningún antes de un sustantivo masculino singular."],
  ["¿Tienes ___ lápiz rojo?", "algún", [["alguno", "full-form-before-noun"], ["alguna", "agreement-slip"]], "La palabra va antes de lápiz, un sustantivo masculino singular.", "Alguno se acorta a algún antes de un sustantivo masculino singular."],
  ["Este perro es muy ___.", "bueno", [["buen", "short-form-not-before-noun"], ["buena", "agreement-slip"]], "La palabra no va antes de un sustantivo: va al final, después de es muy.", "Buen solo se usa justo antes del sustantivo. Aquí va la forma completa."],
  ["Mi hermano llegó ___ a la meta.", "primero", [["primer", "short-form-not-before-noun"], ["primera", "agreement-slip"]], "La palabra no va antes de un sustantivo: dice cómo llegó mi hermano.", "Primer solo se usa justo antes del sustantivo. Aquí va la forma completa."],
  ["Tengo una ___ idea.", "buena", [["buen", "short-form-before-feminine"], ["bueno", "agreement-slip"]], "Idea es femenino.", "Buen solo va antes de sustantivos masculinos. Con idea va buena."],
  ["La ___ puerta está a la izquierda.", "primera", [["primer", "short-form-before-feminine"], ["primero", "agreement-slip"]], "Puerta es femenino.", "Primer solo va antes de sustantivos masculinos. Con puerta va primera."],
  ["Para la fiesta compré una ___.", "camiseta roja", [["roja camiseta", "adjective-before-noun"], ["camiseta rojo", "agreement-slip"]], "Roja dice el color, y camiseta es femenino.", "El color va después del sustantivo y concuerda con él: camiseta roja."],
  ["En el museo vimos un ___ muy antiguo.", "jarrón mexicano", [["mexicano jarrón", "adjective-before-noun"], ["jarrón Mexicano", "capitalized-nationality"]], "Mexicano dice de dónde es.", "La nacionalidad va después del sustantivo y con minúscula: jarrón mexicano."],
  ["Mi tía tiene dos ___.", "gatos negros", [["negros gatos", "adjective-before-noun"], ["gatos negro", "agreement-slip"]], "Negros dice el color, y gatos es plural.", "El color va después del sustantivo y concuerda con él: gatos negros."],
  ["Leímos un ___ en clase.", "cuento japonés", [["cuento Japonés", "capitalized-nationality"], ["cuento japonesa", "agreement-slip"]], "Japonés dice de dónde es, y cuento es masculino.", "La nacionalidad va con minúscula y concuerda con el sustantivo: cuento japonés."],
  ["Mi abuela tejió una ___ para mí.", "bufanda azul", [["azul bufanda", "adjective-before-noun"], ["bufanda azules", "agreement-slip"]], "Azul dice el color, y bufanda es singular.", "El color va después del sustantivo y concuerda con él: bufanda azul."],
];

const ADJECTIVE_ORDER: Level[] = [
  {
    ask: bi("Choose the words that complete the sentence.", "Elige lo que completa la oración."),
    hints: bi(
      ["What does each describing word tell: an opinion, size, age, color, where it is from, or what it is made of?", "English puts them in this order: opinion, size, age, color, where it is from, what it is made of. Then the noun."],
      ["¿La palabra va antes o después del sustantivo? ¿Es masculino o femenino, singular o plural?", "Algunos adjetivos pierden la -o final justo antes de un sustantivo masculino singular, como uno, que pasa a un. Grande se acorta antes de cualquier sustantivo singular. Si no va justo antes del sustantivo, lleva la forma completa. Los colores y las nacionalidades van después del sustantivo y con minúscula."],
    ),
    seconds: 15,
    bank: pair(EN_ORDER.map(orderQ("en")), ES_ORDER.map(orderQ("es"))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.prepositional.phrases (4) — level 1: find the preposition (each sentence has exactly one); level 2:
// find the whole prepositional phrase. Spanish uses simple prepositions only, not "debajo de" or "cerca de".

/** [sentence, key, other words from the sentence with tags, clue] */
type Prep = [string, string, Wrong[], string];
const prepQ = (locale: Locale, phrase: boolean) => ([s, key, wrong, clue]: Prep): G => [
  `“${s}”`,
  key,
  wrong,
  clue,
  phrase
    ? tr(locale, `"${key}" starts with a preposition and ends with the noun it connects.`, `"${key}" empieza con una preposición y llega hasta el sustantivo que une, con las palabras que lo describen.`)
    : tr(locale, `"${key}" connects a noun to the rest of the sentence.`, `"${key}" une un sustantivo con el resto de la oración.`),
];
// Level 1 clues ask what the sentence tells (where, when, how) without pointing at a spot in it.
const EN_PREP1: Prep[] = [
  ["The cat slept under the table.", "under", [["cat", "noun-not-preposition"], ["slept", "verb-not-preposition"]], "Where did the cat sleep? Look for the word that tells the position."],
  ["We walked across the bridge.", "across", [["walked", "verb-not-preposition"], ["bridge", "noun-not-preposition"]], "Where did we walk? Look for the word that tells the path."],
  ["Mia put her shoes beside the door.", "beside", [["shoes", "noun-not-preposition"], ["put", "verb-not-preposition"]], "Where did Mia put her shoes? Look for the word that tells the position."],
  ["The bird flew over the house.", "over", [["bird", "noun-not-preposition"], ["flew", "verb-not-preposition"]], "Where did the bird fly? Look for the word that tells the path."],
  ["Leo hid behind the big tree.", "behind", [["hid", "verb-not-preposition"], ["big", "adjective-not-preposition"]], "Where did Leo hide? Look for the word that tells the position."],
  ["The ball rolled into the street.", "into", [["rolled", "verb-not-preposition"], ["ball", "noun-not-preposition"]], "Where did the ball roll? Look for the word that tells the direction."],
  ["My grandma lives near the beach.", "near", [["lives", "verb-not-preposition"], ["beach", "noun-not-preposition"]], "Where does Grandma live? Look for the word that tells the position."],
  ["We ate lunch after the game.", "after", [["ate", "verb-not-preposition"], ["lunch", "noun-not-preposition"]], "When did we eat? Look for the word that tells the time."],
  ["The keys are inside the drawer.", "inside", [["keys", "noun-not-preposition"], ["are", "verb-not-preposition"]], "Where are the keys? Look for the word that tells the position."],
  ["Ana sat between her two friends.", "between", [["sat", "verb-not-preposition"], ["friends", "noun-not-preposition"]], "Where did Ana sit? Look for the word that tells the position."],
  ["The frog jumped onto the rock.", "onto", [["jumped", "verb-not-preposition"], ["frog", "noun-not-preposition"]], "Where did the frog jump? Look for the word that tells the direction."],
  ["The plane flew above the clouds.", "above", [["plane", "noun-not-preposition"], ["flew", "verb-not-preposition"]], "Where did the plane fly? Look for the word that tells the position."],
  ["Kai found his sock beneath the bed.", "beneath", [["found", "verb-not-preposition"], ["sock", "noun-not-preposition"]], "Where did Kai find his sock? Look for the word that tells the position."],
  ["The children ran around the park.", "around", [["ran", "verb-not-preposition"], ["children", "noun-not-preposition"]], "Where did the children run? Look for the word that tells the path."],
];
const ES_PREP1: Prep[] = [
  ["El gato durmió bajo la mesa.", "bajo", [["gato", "noun-not-preposition"], ["durmió", "verb-not-preposition"]], "¿Dónde durmió el gato? Busca la palabra que dice la posición."],
  ["Caminamos hacia el puente.", "hacia", [["Caminamos", "verb-not-preposition"], ["puente", "noun-not-preposition"]], "¿Adónde caminamos? Busca la palabra que dice la dirección."],
  ["Mía guardó los zapatos en el clóset.", "en", [["guardó", "verb-not-preposition"], ["zapatos", "noun-not-preposition"]], "¿Dónde guardó Mía los zapatos? Busca la palabra que dice el lugar."],
  ["El pájaro voló sobre la casa.", "sobre", [["pájaro", "noun-not-preposition"], ["voló", "verb-not-preposition"]], "¿Por dónde voló el pájaro? Busca la palabra que dice la posición."],
  ["Leo vino con su perro.", "con", [["vino", "verb-not-preposition"], ["perro", "noun-not-preposition"]], "¿Vino Leo solo? Busca la palabra que dice quién lo acompañó."],
  ["La pelota rodó hasta la calle.", "hasta", [["rodó", "verb-not-preposition"], ["pelota", "noun-not-preposition"]], "¿Dónde terminó la pelota? Busca la palabra que dice el final del camino."],
  ["Mi abuela viene desde Puebla.", "desde", [["viene", "verb-not-preposition"], ["abuela", "noun-not-preposition"]], "¿De dónde viene la abuela? Busca la palabra que dice el punto de partida."],
  ["Jugamos durante el recreo.", "durante", [["Jugamos", "verb-not-preposition"], ["recreo", "noun-not-preposition"]], "¿Cuándo jugamos? Busca la palabra que dice el momento."],
  ["Salí sin mi paraguas.", "sin", [["Salí", "verb-not-preposition"], ["paraguas", "noun-not-preposition"]], "¿Cómo salí? Busca la palabra que dice que algo faltaba."],
  ["Ana se sentó entre sus dos amigas.", "entre", [["sentó", "verb-not-preposition"], ["amigas", "noun-not-preposition"]], "¿Dónde se sentó Ana? Busca la palabra que dice la posición."],
  ["Le di un regalo a mi hermana.", "a", [["regalo", "noun-not-preposition"], ["di", "verb-not-preposition"]], "¿Quién recibió el regalo? Busca la palabra que dice quién lo recibió."],
  ["El avión pasó por la ciudad.", "por", [["avión", "noun-not-preposition"], ["pasó", "verb-not-preposition"]], "¿Qué lugar cruzó el avión? Busca la palabra que dice el camino."],
  ["Este regalo es para mi mamá.", "para", [["regalo", "noun-not-preposition"], ["es", "verb-not-preposition"]], "¿Quién va a recibir el regalo? Busca la palabra que dice a quién está destinado."],
  ["El tren salió de la estación.", "de", [["tren", "noun-not-preposition"], ["salió", "verb-not-preposition"]], "¿Qué lugar dejó el tren? Busca la palabra que dice el lugar que quedó atrás."],
];

const EN_PREP2: Prep[] = [
  ["The puppy slept under the warm blanket.", "under the warm blanket", [["The puppy slept", "subject-and-verb"], ["under the warm", "stopped-before-object"]], "Find the preposition first: under. Where does its group of words end?"],
  ["After school, we played tag.", "After school", [["we played tag", "subject-and-verb"], ["played tag", "verb-and-object"]], "Find the preposition first: After."],
  ["Kai put the book on the top shelf.", "on the top shelf", [["put the book", "verb-and-object"], ["the top shelf", "missing-preposition"]], "Find the preposition first: on. Where does its group of words end?"],
  ["The girl with the red hat is my sister.", "with the red hat", [["The girl", "subject-only"], ["is my sister", "verb-and-object"]], "Find the preposition first: with."],
  ["Mom drove us to the library.", "to the library", [["drove us", "verb-and-object"], ["the library", "missing-preposition"]], "Find the preposition first: to."],
  ["The ducks swam across the pond.", "across the pond", [["The ducks swam", "subject-and-verb"], ["across the", "stopped-before-object"]], "Find the preposition first: across. Where does its group of words end?"],
  ["During the storm, the lights went out.", "During the storm", [["the lights went out", "subject-and-verb"], ["the storm", "missing-preposition"]], "Find the preposition first: During."],
  ["Ana found a shell near the water.", "near the water", [["found a shell", "verb-and-object"], ["near the", "stopped-before-object"]], "Find the preposition first: near. Where does its group of words end?"],
  ["The box of crayons fell.", "of crayons", [["The box", "subject-only"], ["crayons fell", "missing-preposition"]], "Find the preposition that comes right after box."],
  ["We waited for the bus.", "for the bus", [["We waited", "subject-and-verb"], ["the bus", "missing-preposition"]], "Find the preposition first: for."],
  ["The kite flew above the trees.", "above the trees", [["The kite flew", "subject-and-verb"], ["above the", "stopped-before-object"]], "Find the preposition first: above. Where does its group of words end?"],
  ["Leo ran around the track.", "around the track", [["Leo ran", "subject-and-verb"], ["the track", "missing-preposition"]], "Find the preposition first: around."],
  ["A squirrel ran along the fence.", "along the fence", [["A squirrel ran", "subject-and-verb"], ["along the", "stopped-before-object"]], "Find the preposition first: along. Where does its group of words end?"],
  ["Grandpa sat beside the fire.", "beside the fire", [["Grandpa sat", "subject-and-verb"], ["the fire", "missing-preposition"]], "Find the preposition first: beside."],
];
const ES_PREP2: Prep[] = [
  ["El perrito durmió bajo la manta tibia.", "bajo la manta tibia", [["El perrito durmió", "subject-and-verb"], ["bajo la", "stopped-before-object"]], "Busca primero la preposición: bajo. ¿Dónde termina su grupo de palabras?"],
  ["Kai puso el libro en el estante.", "en el estante", [["puso el libro", "verb-and-object"], ["el estante", "missing-preposition"]], "Busca primero la preposición: en."],
  ["La niña del sombrero rojo es mi hermana.", "del sombrero rojo", [["La niña", "subject-only"], ["es mi hermana", "verb-and-object"]], "Busca primero la preposición: del, que es de + el."],
  ["Mamá nos llevó a la biblioteca.", "a la biblioteca", [["nos llevó", "verb-and-object"], ["la biblioteca", "missing-preposition"]], "Busca primero la preposición: a."],
  ["Los patos nadaron hacia la orilla.", "hacia la orilla", [["Los patos nadaron", "subject-and-verb"], ["hacia la", "stopped-before-object"]], "Busca primero la preposición: hacia. ¿Dónde termina su grupo de palabras?"],
  ["Durante la tormenta, se fue la luz.", "Durante la tormenta", [["se fue la luz", "subject-and-verb"], ["la tormenta", "missing-preposition"]], "Busca primero la preposición: Durante."],
  ["Ana encontró una concha en la arena.", "en la arena", [["encontró una concha", "verb-and-object"], ["en la", "stopped-before-object"]], "Busca primero la preposición: en. ¿Dónde termina su grupo de palabras?"],
  ["La caja de crayones se cayó.", "de crayones", [["La caja", "subject-only"], ["se cayó", "verb-only"]], "Busca la preposición que va justo después de caja."],
  ["Esperamos el autobús con mi abuelo.", "con mi abuelo", [["Esperamos el autobús", "verb-and-object"], ["mi abuelo", "missing-preposition"]], "Busca primero la preposición: con."],
  ["El papalote voló sobre los árboles.", "sobre los árboles", [["El papalote voló", "subject-and-verb"], ["sobre los", "stopped-before-object"]], "Busca primero la preposición: sobre. ¿Dónde termina su grupo de palabras?"],
  ["Leo corrió por la pista.", "por la pista", [["Leo corrió", "subject-and-verb"], ["la pista", "missing-preposition"]], "Busca primero la preposición: por."],
  ["Una ardilla corrió hasta la cerca.", "hasta la cerca", [["Una ardilla corrió", "subject-and-verb"], ["hasta la", "stopped-before-object"]], "Busca primero la preposición: hasta. ¿Dónde termina su grupo de palabras?"],
  ["El abuelo leyó sin sus lentes.", "sin sus lentes", [["El abuelo leyó", "subject-and-verb"], ["sus lentes", "missing-preposition"]], "Busca primero la preposición: sin."],
  ["Mi tía trabaja desde las ocho.", "desde las ocho", [["Mi tía trabaja", "subject-and-verb"], ["las ocho", "missing-preposition"]], "Busca primero la preposición: desde."],
];

const PREPOSITIONS: Level[] = [
  {
    ask: bi("Which word is the preposition?", "¿Qué palabra es la preposición?"),
    hints: bi(
      ["A preposition shows where, when, or how something is, compared with a noun.", "A preposition comes right before a noun and links it to the rest of the sentence, as in toward the door, against the wall, or through the rain. Nouns and action words do not do that job."],
      ["Una preposición es la palabra que une un sustantivo y la oración; dice dónde, cuándo o cómo.", "Siempre la sigue un sustantivo: ante la puerta, contra la pared, tras la lluvia. Los sustantivos y los verbos no hacen ese trabajo."],
    ),
    seconds: 15,
    bank: pair(EN_PREP1.map(prepQ("en", false)), ES_PREP1.map(prepQ("es", false))),
  },
  {
    ask: bi("Which group of words is the prepositional phrase?", "¿Qué grupo de palabras es la frase con preposición?"),
    hints: bi(
      ["A prepositional phrase starts with a preposition and ends with a noun.", "Find the preposition, then keep going until you reach the noun it points to."],
      ["Una frase con preposición empieza con una preposición y llega hasta un sustantivo, con las palabras que lo describen.", "Busca la preposición y sigue hasta el sustantivo que la completa. Si después del sustantivo hay una palabra que lo describe, también va en la frase."],
    ),
    seconds: 20,
    bank: pair(EN_PREP2.map(prepQ("en", true)), ES_PREP2.map(prepQ("es", true))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.fragments.runons (4) — level 1: complete sentence, fragment, or run-on; level 2: the best fix for a
// run-on. Spanish uses only run-ons with no mark at all (a comma between two short sentences is sometimes
// accepted in Spanish), and its fixes put no comma before y.

const SENTENCE_LABELS = bi(["Complete sentence", "Fragment", "Run-on"], ["Oración completa", "Oración incompleta", "Oraciones pegadas"]);
/** [text, kind, clue] */
type Kind = [string, number, string];
const kindQ = (locale: Locale) => ([s, k, clue]: Kind): L => [
  `“${s}”`,
  k,
  clue,
  tr(
    locale,
    ["It has a subject and a verb and makes one whole thought.", "It is missing a subject, a verb, or the rest of the thought, so it cannot stand alone.", "Two complete thoughts are pushed together with no end mark or joining word."][k],
    ["Tiene sujeto y verbo y expresa una idea completa.", "Le falta el verbo o el resto de la idea, así que no puede ir sola.", "Hay dos ideas completas pegadas sin punto ni palabra que las una."][k],
  ),
];
const EN_KINDS: Kind[] = [
  ["The dog barked at the mail carrier.", 0, "Who? The dog. What did it do? Barked. Is anything else needed?"],
  ["Because it was raining.", 1, "Because it was raining … what happened? Ask whether the thought is finished."],
  ["I like pizza my brother likes tacos.", 2, "Find each subject and its verb: I like, my brother likes."],
  ["The tall girl with the red backpack.", 1, "Who is it about? The tall girl. What did she do? Look for a verb."],
  ["My sister and I baked bread.", 0, "Who? My sister and I. What did they do? Baked bread."],
  ["The bell rang we went to lunch.", 2, "Find each subject and its verb: the bell rang, we went."],
  ["Running down the hall.", 1, "Who is running? Look for a subject."],
  ["Owls hunt at night.", 0, "Who? Owls. What do they do? Hunt."],
  ["It was cold I wore my coat.", 2, "Find each subject and its verb: it was, I wore."],
  ["After the movie ended.", 1, "After the movie ended … what happened? Ask whether the thought is finished."],
  ["The wind blew the leaves away.", 0, "What? The wind. What did it do? Blew the leaves away."],
  ["Maya plays soccer she is the goalie.", 2, "Find each subject and its verb: Maya plays, she is."],
  ["Under the old bridge.", 1, "Who or what is under the bridge? Look for a subject and a verb."],
  ["After lunch, we read quietly.", 0, "Who? We. What did we do? Read."],
  ["The bus was late we walked to school.", 2, "Find each subject and its verb: the bus was, we walked."],
  ["Leo found a shell he gave it to his mom.", 2, "Find each subject and its verb: Leo found, he gave."],
];
const ES_KINDS: Kind[] = [
  ["El perro le ladró al cartero.", 0, "¿Quién? El perro. ¿Qué hizo? Ladró. ¿Falta algo?"],
  ["Porque estaba lloviendo.", 1, "Porque estaba lloviendo… ¿qué pasó? Pregúntate si la idea está terminada."],
  ["Me gusta la pizza a mi hermano le gustan los tacos.", 2, "Busca cada verbo con su idea: me gusta la pizza, a mi hermano le gustan los tacos."],
  ["La niña alta de la mochila roja.", 1, "¿De quién habla? De la niña alta. ¿Qué hizo? Busca un verbo."],
  ["Mi hermana y yo hicimos pan.", 0, "¿Quiénes? Mi hermana y yo. ¿Qué hicimos? Hicimos pan."],
  ["Sonó la campana fuimos a almorzar.", 2, "Busca cada verbo con su idea: sonó la campana, fuimos a almorzar."],
  ["Corriendo por el pasillo.", 1, "¿Quién corre? Busca un verbo que diga quién lo hace."],
  ["Los búhos cazan de noche.", 0, "¿Quiénes? Los búhos. ¿Qué hacen? Cazan."],
  ["Hacía frío me puse el abrigo.", 2, "Busca cada verbo con su idea: hacía frío, me puse el abrigo."],
  ["Cuando terminó la película.", 1, "Cuando terminó la película… ¿qué pasó? Pregúntate si la idea está terminada."],
  ["El viento se llevó las hojas.", 0, "¿Qué? El viento. ¿Qué hizo? Se llevó las hojas."],
  ["Maya juega fútbol es la portera.", 2, "Busca cada verbo con su idea: Maya juega fútbol, es la portera."],
  ["Debajo del puente viejo.", 1, "¿Quién o qué está debajo del puente? Busca un verbo."],
  ["Después del almuerzo, leímos en silencio.", 0, "¿Quiénes? Nosotros. ¿Qué hicimos? Leímos."],
  ["El autobús llegó tarde caminamos a la escuela.", 2, "Busca cada verbo con su idea: el autobús llegó tarde, caminamos a la escuela."],
  ["Leo encontró una concha se la dio a su mamá.", 2, "Busca cada verbo con su idea: Leo encontró una concha, se la dio a su mamá."],
];

/** [first thought, second thought, how to join them: "." or a conjunction] */
type RunOn = [string, string, string];
/** The first two words, or only the first when there are just two. */
const twoWords = (s: string) => s.split(" ").slice(0, s.split(" ").length > 2 ? 2 : 1).join(" ");
function runOnQ(locale: Locale) {
  return ([a, b, join]: RunOn): G => {
    const fused = `${a} ${b}.`;
    const key = join === "." ? `${a}. ${cap(b)}.` : locale === "es" && join === "y" ? `${a} y ${b}.` : `${a}, ${join} ${b}.`;
    const early = `${twoWords(a)}. ${cap(a.slice(twoWords(a).length + 1))} ${b}.`;
    const wrong: Wrong[] =
      locale === "en"
        ? [[`${a}, ${b}.`, "comma-splice"], [early, "period-in-wrong-place"]]
        : [[early, "period-in-wrong-place"], [`${a} ${twoWords(b)}, ${b.slice(twoWords(b).length + 1)}.`, "comma-in-wrong-place"]];
    return [
      `“${fused}”`,
      key,
      wrong,
      tr(locale, `The first thought is "${a}." The second is "${b}."`, `La primera idea es "${a}". La segunda es "${b}".`),
      join === "."
        ? tr(locale, "End the first thought with a period and start the second with a capital letter.", "Termina la primera idea con punto y empieza la segunda con mayúscula.")
        : tr(locale, `Join the two thoughts with a comma and "${join}".`, join === "y" ? `Une las dos ideas con "y", sin coma antes.` : `Une las dos ideas con una coma y "${join}".`),
    ];
  };
}
const EN_RUNONS: RunOn[] = [
  ["I like pizza", "my brother likes tacos", "but"], ["The bell rang", "we went to lunch", "."], ["It was cold", "I wore my coat", "so"],
  ["Maya plays soccer", "she is the goalie", "."], ["The bus was late", "we walked to school", "so"], ["Leo found a shell", "he gave it to his mom", "and"],
  ["The movie ended", "everyone clapped", "and"], ["My cat is gray", "her name is Smoke", "."], ["We wanted to swim", "the pool was closed", "but"],
  ["Kai finished his homework", "he went outside to play", "so"], ["The sun came out", "the snow began to melt", "and"], ["Ana loves to draw", "she wants to be an artist", "."],
  ["The baby was sleepy", "she took a long nap", "so"], ["It rained all day", "we played board games", "so"],
];
const ES_RUNONS: RunOn[] = [
  ["Me gusta la pizza", "a mi hermano le gustan los tacos", "pero"], ["Sonó la campana", "fuimos a almorzar", "y"], ["Hacía mucho frío", "me puse el abrigo", "así que"],
  ["Maya juega fútbol", "es la portera del equipo", "."], ["El autobús llegó tarde", "caminamos a la escuela", "así que"], ["Leo encontró una concha", "se la dio a su mamá", "y"],
  ["Terminó la película", "todos aplaudieron muy fuerte", "y"], ["Mi gata es gris", "se llama Humo", "."], ["Queríamos nadar", "la alberca estaba cerrada", "pero"],
  ["Kai terminó la tarea", "salió a jugar", "así que"], ["Salió el sol", "la nieve empezó a derretirse", "y"], ["A Ana le encanta dibujar", "quiere ser artista", "."],
  ["La bebé tenía sueño", "durmió una siesta larga", "así que"], ["Llovió todo el día", "jugamos juegos de mesa", "así que"],
];

const FRAGMENTS: Level[] = [
  {
    ask: bi("Is this a complete sentence, a fragment, or a run-on?", "¿Es una oración completa, una oración incompleta u oraciones pegadas?"),
    hints: bi(
      ["Does it tell who or what, and what they did? Is it one thought or two?", "A complete sentence has a subject and a verb and one whole thought. A fragment is missing part. A run-on joins two sentences with no end mark or joining word."],
      ["¿Dice quién y qué hizo? ¿Es una idea o son dos?", "Una oración completa tiene verbo y una idea completa. A una incompleta le falta algo. En las pegadas hay dos ideas sin punto ni palabra que las una."],
    ),
    seconds: 15,
    labels: SENTENCE_LABELS,
    tags: ["complete", "fragment", "run-on"],
    bank: pair(EN_KINDS.map(kindQ("en")), ES_KINDS.map(kindQ("es"))),
  },
  {
    ask: bi("Which is the best way to fix this run-on?", "¿Cuál es la mejor forma de corregir estas oraciones pegadas?"),
    hints: bi(
      ["Find where the first complete thought ends.", "Fix a run-on with a period and a capital letter, or with a comma and a joining word like and, but, or so. A comma alone is not enough."],
      ["Busca dónde termina la primera idea completa.", "Se corrige con punto y mayúscula, o con una palabra que una las ideas, como y, pero o así que."],
    ),
    seconds: 25,
    bank: pair(EN_RUNONS.map(runOnQ("en")), ES_RUNONS.map(runOnQ("es"))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.dialogue.punctuation (4) — English quotation marks: level 1 speaker after the words (“I am hungry,”
// said Leo.), level 2 speaker first (Leo said, “I am hungry.”). Spanish uses the raya: level 1
// —Tengo hambre —dijo Leo. (with ¿ ? for questions), level 2 the narrator in the middle:
// —Tengo hambre —dijo Leo—. ¿Comemos ya?

/** [words spoken, speech verb, speaker, is it a question] */
type Said = [string, string, string, boolean?];
function saidAfterQ([words, verb, who, ask]: Said): G {
  const tail = `${verb} ${who}.`;
  const key = `“${words}${ask ? "?" : ","}” ${tail}`;
  const wrong: Wrong[] = ask
    ? [[`“${words}?,” ${tail}`, "comma-after-question-mark"], [`“${words}”? ${tail}`, "mark-outside-quotes"], [`${words}? ${tail}`, "missing-quotation-marks"]]
    : [[`“${words}”, ${tail}`, "comma-outside-quotes"], [`“${words}.” ${tail}`, "period-before-speaker-tag"], [`${words}, ${tail}`, "missing-quotation-marks"]];
  return [
    "",
    key,
    wrong,
    `First come ${who}'s exact words. Then come the words ${verb} ${who}.`,
    ask
      ? "Quotation marks go around the exact words. The question mark goes inside the closing quotation mark, with no comma."
      : "Quotation marks go around the exact words. A comma, not a period, goes inside the closing quotation mark when the speaker comes next.",
  ];
}
function saidBeforeQ([words, verb, who, ask]: Said): G {
  const end = ask ? "?" : ".";
  const key = `${who} ${verb}, “${words}${end}”`;
  return [
    "",
    key,
    [
      [`${who} ${verb} “${words}${end}”`, "missing-comma-before-quote"],
      [`${who} ${verb}, “${words.charAt(0).toLowerCase()}${words.slice(1)}${end}”`, "lowercase-quote-start"],
      [`${who} ${verb}, “${words}”${end}`, "mark-outside-quotes"],
    ],
    `The speaker comes first: ${who} ${verb}. Then come the exact words.`,
    "Put a comma after the speaker part. The quote starts with a capital letter, and its end mark goes inside the closing quotation mark.",
  ];
}
function rayaQ([words, verb, who, ask]: Said): G {
  const said = ask ? `¿${words}?` : words;
  const key = `—${said} —${verb} ${who}.`;
  const wrong: Wrong[] = ask
    ? [[`—${words}? —${verb} ${who}.`, "missing-opening-question-mark"], [`—${said} —${cap(verb)} ${who}.`, "capital-after-raya"], [`${said} —${verb} ${who}.`, "missing-opening-raya"]]
    : [[`${said} —${verb} ${who}.`, "missing-opening-raya"], [`—${said}— ${verb} ${who}.`, "raya-attached-to-speech"], [`—${said} —${cap(verb)} ${who}.`, "capital-after-raya"]];
  return [
    "",
    key,
    wrong,
    `Primero va lo que dice ${who}. Después va ${verb} ${who}.`,
    ask
      ? "La raya abre lo que dice el personaje. Las preguntas llevan ¿ al principio y ? al final. Después, otra raya pegada a dijo o preguntó, con minúscula."
      : "La raya abre lo que dice el personaje. Otra raya, pegada a la palabra que sigue, introduce al narrador, que empieza con minúscula.",
  ];
}
/** [first words, speech verb, speaker, the next sentence the speaker says] */
type Interrupted = [string, string, string, string];
function rayaMidQ([first, verb, who, next]: Interrupted): G {
  const key = `—${first} —${verb} ${who}—. ${next}`;
  return [
    "",
    key,
    [
      [`—${first} —${verb} ${who}. ${next}`, "missing-closing-raya"],
      [`—${first}. —${verb} ${who}—. ${next}`, "period-before-narrator"],
      [`—${first} —${verb} ${who}.— ${next}`, "period-before-closing-raya"],
    ],
    `El narrador interrumpe en medio: ${verb} ${who}. Después el personaje sigue hablando.`,
    "La parte del narrador va entre dos rayas. El punto de la primera oración va después de la segunda raya, y luego sigue lo que dice el personaje.",
  ];
}
const EN_SAID1: Said[] = [
  ["I am hungry", "said", "Leo"], ["Can we go to the park", "asked", "Mia", true], ["The bus is here", "said", "Dad"], ["Where is my hat", "asked", "Kai", true],
  ["Please close the door", "said", "Coach Diaz"], ["I found a frog", "said", "Ana"], ["What time is it", "asked", "Omar", true], ["It is my turn", "said", "Jada"],
  ["Look at the rainbow", "said", "Grandma"], ["Do you want to play", "asked", "Sofia", true], ["We won the game", "said", "Ben"], ["Is it snowing", "asked", "Lena", true],
  ["My tooth is loose", "said", "Raj"], ["Who took my pencil", "asked", "Yuki", true],
];
const ES_SAID1: Said[] = [
  ["Tengo hambre", "dijo", "Leo"], ["Podemos ir al parque", "preguntó", "Mía", true], ["Ya llegó el autobús", "dijo", "papá"], ["Dónde está mi gorra", "preguntó", "Kai", true],
  ["Cierren la puerta, por favor", "dijo", "la maestra"], ["Encontré una rana", "dijo", "Ana"], ["Qué hora es", "preguntó", "Omar", true], ["Es mi turno", "dijo", "Jada"],
  ["Miren el arcoíris", "dijo", "la abuela"], ["Quieres jugar", "preguntó", "Sofía", true], ["Ganamos el partido", "dijo", "Beto"], ["Está nevando", "preguntó", "Lena", true],
  ["Se me mueve un diente", "dijo", "Raj"], ["Quién tomó mi lápiz", "preguntó", "Yuki", true],
];
const EN_SAID2: Said[] = [
  ["Dinner is ready", "said", "Grandpa"], ["Can I help", "asked", "Mia", true], ["I lost my glove", "said", "Leo"], ["Is the store open", "asked", "Kai", true],
  ["The cookies smell good", "said", "Ana"], ["Where are we going", "asked", "Omar", true], ["Line up by the fence", "said", "Coach Diaz"], ["May I read this book", "asked", "Jada", true],
  ["It is time for bed", "said", "Mom"], ["Did you see the moon", "asked", "Sofia", true], ["My kite is stuck in the tree", "said", "Ben"], ["How many eggs do we need", "asked", "Lena", true],
  ["The puppy is asleep", "said", "Raj"], ["Why is the sky blue", "asked", "Yuki", true],
];
const ES_SAID2: Interrupted[] = [
  ["Tengo hambre", "dijo", "Leo", "¿Comemos ya?"], ["Ya terminé la tarea", "dijo", "Mía", "¿Puedo salir a jugar?"], ["Está lloviendo", "avisó", "papá", "Lleven paraguas."],
  ["Me encanta este libro", "dijo", "Kai", "Lo voy a leer otra vez."], ["Hace frío", "dijo", "la abuela", "Pónganse los abrigos."], ["Encontré una concha", "dijo", "Ana", "Es enorme."],
  ["Ganamos", "dijo", "Beto", "Fue un partido difícil."], ["Llegamos temprano", "dijo", "Omar", "¿Esperamos aquí?"], ["No encuentro mi lápiz", "dijo", "Yuki", "¿Me prestas uno?"],
  ["La sopa está lista", "anunció", "mamá", "Vengan a la mesa."], ["Mira esa nube", "dijo", "Lena", "Parece un dragón."], ["Se acabó el recreo", "dijo", "la maestra", "Formen una fila."],
  ["El perrito tiene sed", "dijo", "Raj", "Voy por agua."], ["Ya es tarde", "dijo", "Sofía", "Mañana seguimos."],
];

const DIALOGUE: Level[] = [
  {
    ask: bi("Which line of dialogue is punctuated correctly?", "¿Qué línea de diálogo está bien puntuada?"),
    hints: bi(
      ["Find the exact words the person says.", "Put quotation marks around the exact words. A comma or question mark goes inside the closing quotation mark before said or asked."],
      ["Busca las palabras exactas que dice el personaje.", "En español, el diálogo empieza con raya (—). El narrador va después de otra raya y empieza con minúscula."],
    ),
    seconds: 25,
    bank: pair(EN_SAID1.map(saidAfterQ), ES_SAID1.map(rayaQ)),
  },
  {
    ask: bi("Which line of dialogue is punctuated correctly?", "¿Qué línea de diálogo está bien puntuada?"),
    hints: bi(
      ["Who speaks, and what are the exact words?", "When the speaker comes first, put a comma before the opening quotation mark. The quote starts with a capital, and its end mark goes inside."],
      ["¿Dónde interrumpe el narrador lo que dice el personaje?", "Si el narrador interrumpe, su parte va entre dos rayas. El punto va después de la segunda raya."],
    ),
    seconds: 25,
    bank: pair(EN_SAID2.map(saidBeforeQ), ES_SAID2.map(rayaMidQ)),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.greek.latin.roots (4) — level 1: what a root means (tele far, port carry, rupt break…); level 2: what
// a whole word means from its parts. Spanish uses the same roots in Spanish words (teléfono, transportar,
// interrumpir). Wrong meanings belong to other roots, never to one with the same meaning.

/** [word, root, meaning, wrong meanings with the root they belong to] */
type Root = [string, string, string, [string, string][]];
const rootQ = (locale: Locale) => ([word, root, means, wrong]: Root): G => [
  `“${word}”`,
  means,
  wrong.map(([m, other]): Wrong => [m, `meaning-of-${other}`]),
  tr(locale, `The root in ${word} is ${root}. Think of another word with ${root} in it.`, `La raíz de ${word} es ${root}. Piensa en otra palabra que la tenga.`),
  tr(locale, `The root ${root} means "${means}."`, `La raíz ${root} significa "${means}".`),
  root,
];
const EN_ROOT1: Root[] = [
  ["telescope", "tele", "far", [["small", "micro"], ["life", "bio"]]],
  ["photograph", "photo", "light", [["sound", "phon"], ["earth", "geo"]]],
  ["autograph", "graph", "write", [["hear", "aud"], ["carry", "port"]]],
  ["transport", "port", "carry", [["break", "rupt"], ["see", "vis"]]],
  ["audience", "aud", "hear", [["build", "struct"], ["heat", "therm"]]],
  ["visible", "vis", "see", [["carry", "port"], ["say", "dict"]]],
  ["dictionary", "dict", "say", [["far", "tele"], ["measure", "meter"]]],
  ["interrupt", "rupt", "break", [["write", "graph"], ["life", "bio"]]],
  ["construct", "struct", "build", [["hear", "aud"], ["light", "photo"]]],
  ["spectator", "spect", "look", [["break", "rupt"], ["sound", "phon"]]],
  ["thermometer", "therm", "heat", [["carry", "port"], ["say", "dict"]]],
  ["biology", "bio", "life", [["earth", "geo"], ["far", "tele"]]],
  ["geography", "geo", "earth", [["life", "bio"], ["light", "photo"]]],
  ["microphone", "phon", "sound", [["see", "vis"], ["build", "struct"]]],
  ["manuscript", "script", "write", [["break", "rupt"], ["measure", "meter"]]],
  ["pedestrian", "ped", "foot", [["heat", "therm"], ["hear", "aud"]]],
];
const ES_ROOT1: Root[] = [
  ["telescopio", "tele", "lejos", [["pequeño", "micro"], ["vida", "bio"]]],
  ["fotografía", "foto", "luz", [["sonido", "fono"], ["tierra", "geo"]]],
  ["autógrafo", "grafo", "escribir", [["oír", "aud"], ["llevar", "port"]]],
  ["transportar", "port", "llevar", [["romper", "rupt"], ["ver", "vis"]]],
  ["auditorio", "aud", "oír", [["construir", "struct"], ["calor", "term"]]],
  ["visible", "vis", "ver", [["llevar", "port"], ["decir", "dic"]]],
  ["diccionario", "dic", "decir", [["lejos", "tele"], ["medir", "metro"]]],
  ["interrumpir", "rump", "romper", [["escribir", "grafo"], ["vida", "bio"]]],
  ["estructura", "struct", "construir", [["oír", "aud"], ["luz", "foto"]]],
  ["espectador", "spect", "mirar", [["romper", "rupt"], ["sonido", "fono"]]],
  ["termómetro", "termo", "calor", [["llevar", "port"], ["decir", "dic"]]],
  ["biología", "bio", "vida", [["tierra", "geo"], ["lejos", "tele"]]],
  ["geografía", "geo", "tierra", [["vida", "bio"], ["luz", "foto"]]],
  ["micrófono", "fono", "sonido", [["ver", "vis"], ["construir", "struct"]]],
  ["manuscrito", "scrit", "escribir", [["romper", "rupt"], ["medir", "metro"]]],
  ["pedal", "ped", "pie", [["calor", "term"], ["oír", "aud"]]],
];

/** [word, its parts, meaning, wrong meanings with tags] */
type RootWord = [string, string, string, Wrong[]];
const rootWordQ = (locale: Locale) => ([word, parts, means, wrong]: RootWord): G => [
  `“${word}”`,
  means,
  wrong,
  tr(locale, `${cap(word)} is made of ${parts}.`, `${cap(word)} se forma con ${parts}.`),
  tr(locale, `Put the parts together: ${word} means ${means}.`, `Junta las partes: ${word} quiere decir ${means}.`),
  parts,
];
const EN_ROOT2: RootWord[] = [
  ["telephone", "tele (far) + phone (sound)", "a tool that carries sound from far away", [["a picture made with light", "confused-root"], ["a tool for seeing tiny things", "confused-root"]]],
  ["microscope", "micro (small) + scope (look)", "a tool for looking at very small things", [["a tool for hearing far sounds", "confused-root"], ["a tool for measuring heat", "confused-root"]]],
  ["biography", "bio (life) + graph (write)", "the written story of a person's life", [["the study of the earth", "confused-root"], ["a photo of a person", "confused-root"]]],
  ["geology", "geo (earth) + logy (study of)", "the study of the earth and its rocks", [["the study of living things", "confused-root"], ["a map of the stars", "confused-root"]]],
  ["portable", "port (carry) + able (can be)", "easy to carry", [["easy to break", "confused-root"], ["easy to see", "confused-root"]]],
  ["audible", "aud (hear) + ible (can be)", "loud enough to be heard", [["clear enough to be seen", "confused-root"], ["light enough to carry", "confused-root"]]],
  ["thermometer", "therm (heat) + meter (measure)", "a tool that measures heat", [["a tool that measures distance", "confused-root"], ["a tool that makes sounds louder", "confused-root"]]],
  ["autograph", "auto (self) + graph (write)", "a name a person writes with their own hand", [["a picture you take of yourself", "confused-root"], ["a car that drives by itself", "confused-root"]]],
  ["predict", "pre (before) + dict (say)", "to say what will happen before it happens", [["to say something again", "confused-prefix"], ["to write a list of words", "confused-root"]]],
  ["inspect", "in (into) + spect (look)", "to look at something closely", [["to build something inside", "confused-root"], ["to carry something in", "confused-root"]]],
  ["export", "ex (out) + port (carry)", "to carry or send goods out of a country", [["to bring goods into a country", "confused-prefix"], ["to break goods apart", "confused-root"]]],
  ["telescope", "tele (far) + scope (look)", "a tool for looking at things far away", [["a tool for hearing far away", "confused-root"], ["a tool for looking at tiny things", "confused-root"]]],
  ["construction", "con (together) + struct (build)", "the work of building something", [["the work of breaking something", "confused-root"], ["a story that someone writes", "confused-root"]]],
  ["eruption", "e (out) + rupt (break)", "a bursting out, like a volcano breaking open", [["a quick look", "confused-root"], ["a loud song", "confused-root"]]],
];
const ES_ROOT2: RootWord[] = [
  ["teléfono", "tele (lejos) + fono (sonido)", "aparato que lleva el sonido de lejos", [["dibujo hecho con luz", "confused-root"], ["aparato para ver cosas diminutas", "confused-root"]]],
  ["microscopio", "micro (pequeño) + scopio (mirar)", "instrumento para mirar cosas muy pequeñas", [["instrumento para oír sonidos lejanos", "confused-root"], ["instrumento para medir el calor", "confused-root"]]],
  ["biografía", "bio (vida) + grafía (escritura)", "historia escrita de la vida de una persona", [["estudio de la tierra", "confused-root"], ["foto de una persona", "confused-root"]]],
  ["geología", "geo (tierra) + logía (estudio)", "estudio de la tierra y sus rocas", [["estudio de los seres vivos", "confused-root"], ["mapa de las estrellas", "confused-root"]]],
  ["portátil", "port (llevar) + -átil (que puede)", "que se puede llevar fácilmente", [["que se puede romper fácilmente", "confused-root"], ["que se puede ver fácilmente", "confused-root"]]],
  ["audible", "aud (oír) + -ible (que puede)", "que se puede oír", [["que se puede ver", "confused-root"], ["que se puede llevar", "confused-root"]]],
  ["termómetro", "termo (calor) + metro (medida)", "instrumento que mide el calor", [["instrumento que mide la distancia", "confused-root"], ["aparato que hace más fuerte el sonido", "confused-root"]]],
  ["autógrafo", "auto (uno mismo) + grafo (escribir)", "firma escrita por la misma persona", [["foto que te tomas tú mismo", "confused-root"], ["carro que se maneja solo", "confused-root"]]],
  ["predecir", "pre (antes) + decir", "decir lo que va a pasar antes de que pase", [["decir algo otra vez", "confused-prefix"], ["escribir una lista de palabras", "confused-root"]]],
  ["inspeccionar", "in (hacia dentro) + spect (mirar)", "mirar algo con mucha atención", [["construir algo por dentro", "confused-root"], ["llevar algo adentro", "confused-root"]]],
  ["exportar", "ex (fuera) + port (llevar)", "llevar o mandar productos fuera del país", [["traer productos al país", "confused-prefix"], ["romper productos", "confused-root"]]],
  ["telescopio", "tele (lejos) + scopio (mirar)", "instrumento para mirar cosas lejanas", [["aparato para oír de lejos", "confused-root"], ["instrumento para mirar cosas diminutas", "confused-root"]]],
  ["construcción", "con (junto) + struct (construir)", "el trabajo de construir algo", [["el trabajo de romper algo", "confused-root"], ["una historia que alguien escribe", "confused-root"]]],
  ["erupción", "e (fuera) + rupt (romper)", "salida de algo que rompe hacia fuera, como la lava de un volcán", [["una mirada rápida", "confused-root"], ["una canción fuerte", "confused-root"]]],
];

const ROOTS: Level[] = [
  {
    ask: bi("What does the root of this word mean?", "¿Qué significa la raíz de esta palabra?"),
    hints: bi(
      ["A root is the main part of a word. Many English roots come from Greek or Latin.", "Think of other words with the same root: telephone and television both have tele."],
      ["La raíz es la parte principal de una palabra. Muchas vienen del griego o del latín.", "Piensa en otras palabras con la misma raíz: teléfono y televisión tienen tele."],
    ),
    seconds: 15,
    bank: pair(EN_ROOT1.map(rootQ("en")), ES_ROOT1.map(rootQ("es"))),
  },
  {
    ask: bi("What does this word mean?", "¿Qué quiere decir esta palabra?"),
    hints: bi(
      ["Split the word into its parts.", "Find the meaning of each part, then put the meanings together."],
      ["Separa la palabra en sus partes.", "Busca el significado de cada parte y luego júntalos."],
    ),
    seconds: 20,
    bank: pair(EN_ROOT2.map(rootWordQ("en")), ES_ROOT2.map(rootWordQ("es"))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.idioms.proverbs (4) — level 1: idioms (under the weather; estar en las nubes); level 2: proverbs and
// sayings (Look before you leap; Más vale prevenir que lamentar). None repeats an item of e.figurative.
// Wrong choices: the literal reading, the opposite meaning, or a meaning that does not fit the situation.

/** [sentence, meaning, wrong meanings with tags, clue] */
type Saying = [string, string, Wrong[], string];
const sayingQ = (locale: Locale) => ([s, means, wrong, clue]: Saying): G => [
  `“${s}”`,
  means,
  wrong,
  clue,
  tr(locale, `People use these words to mean something else. Here they mean: ${means}`, `La gente usa estas palabras con otro sentido. Aquí quieren decir: ${means}`),
];
const EN_IDIOMS: Saying[] = [
  ["Ben is feeling under the weather today.", "Ben feels a little sick.", [["Ben is standing out in the rain.", "literal-reading"], ["Ben feels very happy.", "opposite-meaning"]], "Nobody stands under weather. Think of how you feel with a cold."],
  ["Please don't spill the beans about the surprise party.", "Please don't tell the secret.", [["Please don't drop the food.", "literal-reading"], ["Please don't be late to the party.", "wrong-situation"]], "A surprise party is a secret. What would ruin it?"],
  ["I have to hit the books tonight.", "I have to study.", [["I have to knock books off a shelf.", "literal-reading"], ["I have to go to bed early.", "wrong-situation"]], "Nobody really hits books. What do students do with books at night?"],
  ["Mia was on cloud nine after the show.", "Mia was very happy.", [["Mia was flying in a plane.", "literal-reading"], ["Mia was very tired.", "wrong-situation"]], "Being up in the clouds feels light and great."],
  ["Leo got cold feet before his speech.", "Leo got nervous and wanted to back out.", [["Leo's feet were cold.", "literal-reading"], ["Leo was excited to begin.", "opposite-meaning"]], "Think about how some people feel right before they speak in front of a crowd."],
  ["We go to the beach once in a blue moon.", "We go to the beach very rarely.", [["We go to the beach only at night.", "literal-reading"], ["We go to the beach every weekend.", "opposite-meaning"]], "A blue moon is something that hardly ever happens."],
  ["Can you lend me a hand with these boxes?", "Can you help me?", [["Can you give me your hand to keep?", "literal-reading"], ["Can you count the boxes?", "wrong-situation"]], "Boxes are heavy. What would a person want from a friend?"],
  ["Ana and her sister see eye to eye on most things.", "They agree on most things.", [["They stare at each other a lot.", "literal-reading"], ["They argue about everything.", "opposite-meaning"]], "Seeing the same way means thinking the same way."],
  ["Kai bit off more than he could chew with three projects.", "Kai took on more than he could handle.", [["Kai ate too much food.", "literal-reading"], ["Kai finished his projects early.", "opposite-meaning"]], "Three projects at once is a lot of work."],
  ["Please keep an eye on your little brother.", "Please watch him carefully.", [["Please hold your eye next to him.", "literal-reading"], ["Please teach him a new game.", "wrong-situation"]], "What does an older brother or sister do while a little brother plays?"],
  ["We made our offer, so the ball is in your court.", "Now it is your turn to decide.", [["The ball is on the tennis court.", "literal-reading"], ["You lost the game.", "wrong-situation"]], "In a game, when the ball is on your side, it is your move."],
  ["Jada told a joke to break the ice.", "Jada helped everyone relax and start talking.", [["Jada cracked the ice on a pond.", "literal-reading"], ["Jada ended the party.", "opposite-meaning"]], "At the start, the new group felt stiff and quiet, like ice."],
  ["It's late, so it's time to hit the hay.", "It is time to go to bed.", [["It is time to feed the horses.", "literal-reading"], ["It is time to wake up.", "opposite-meaning"]], "Long ago, some beds were stuffed with hay."],
  ["My brother is in hot water for breaking the vase.", "He is in trouble.", [["He is taking a hot bath.", "literal-reading"], ["He is being thanked.", "opposite-meaning"]], "He broke a vase. How would his parents feel?"],
];
const ES_IDIOMS: Saying[] = [
  ["Ana está en las nubes hoy.", "Ana está distraída.", [["Ana está viajando en avión.", "literal-reading"], ["Ana está muy atenta.", "opposite-meaning"]], "Nadie vive en las nubes. Piensa en alguien que no pone atención."],
  ["Leo metió la pata en la fiesta.", "Leo cometió un error.", [["Leo puso el pie en un charco.", "literal-reading"], ["Leo bailó muy bien.", "wrong-situation"]], "Meter la pata es algo que nadie quiere hacer en una fiesta."],
  ["¿Me echas una mano con estas cajas?", "¿Me ayudas con las cajas?", [["¿Me lanzas tu mano?", "literal-reading"], ["¿Me cuentas las cajas?", "wrong-situation"]], "Las cajas pesan. ¿Qué querría alguien de un amigo?"],
  ["Mi abuela no tiene pelos en la lengua.", "Dice lo que piensa sin rodeos.", [["No tiene pelos en la boca.", "literal-reading"], ["Casi nunca habla.", "opposite-meaning"]], "Nada le estorba a su lengua para hablar."],
  ["En la clase de arte, Kai está como pez en el agua.", "Kai se siente muy cómodo.", [["Kai está nadando.", "literal-reading"], ["Kai está muy nervioso.", "opposite-meaning"]], "Un pez en el agua está en su lugar favorito."],
  ["Diste en el clavo con tu respuesta.", "Acertaste.", [["Golpeaste un clavo con un martillo.", "literal-reading"], ["Te equivocaste.", "opposite-meaning"]], "Pegarle justo al clavo es hacerlo exacto."],
  ["Mi hermano habla hasta por los codos.", "Habla muchísimo.", [["Habla moviendo los brazos.", "literal-reading"], ["Casi no habla.", "opposite-meaning"]], "Los codos no hablan. Si hasta los codos hablaran, ¿cuánto hablaría esa persona?"],
  ["Si quieres ganar, tienes que ponerte las pilas.", "Tienes que esforzarte y estar atento.", [["Tienes que cambiarle las pilas a un juguete.", "literal-reading"], ["Tienes que descansar.", "opposite-meaning"]], "Las pilas dan energía."],
  ["Después de tres intentos, Omar no tiró la toalla.", "Omar no se rindió.", [["Omar no lanzó la toalla al piso.", "literal-reading"], ["Omar dejó de intentarlo.", "opposite-meaning"]], "Omar lo intentó tres veces. ¿Siguió o se detuvo?"],
  ["Para cruzar el río, hay que andar con pies de plomo.", "Hay que ir con mucho cuidado.", [["Hay que usar zapatos pesados.", "literal-reading"], ["Hay que correr rápido.", "opposite-meaning"]], "Con pies muy pesados, cada paso es lento y pensado."],
  ["No le busques tres pies al gato.", "No compliques las cosas.", [["No cuentes las patas del gato.", "literal-reading"], ["Cuida bien a tu gato.", "wrong-situation"]], "Buscar algo que no está ahí solo complica todo."],
  ["Sofía y Lena son uña y carne.", "Son muy amigas y siempre están juntas.", [["Se cortan las uñas juntas.", "literal-reading"], ["No se llevan bien.", "opposite-meaning"]], "La uña y la carne del dedo siempre están pegadas."],
  ["Lo voy a consultar con la almohada.", "Lo voy a pensar antes de decidir.", [["Le voy a preguntar a mi almohada.", "literal-reading"], ["Voy a decidir ahora mismo.", "opposite-meaning"]], "La almohada es para dormir. ¿Qué cambia después de una noche?"],
  ["Cuando vio el regalo, Mía se quedó con la boca abierta.", "Mía se sorprendió mucho.", [["Mía bostezó de sueño.", "wrong-situation"], ["A Mía no le importó.", "opposite-meaning"]], "Piensa en la cara de alguien que ve algo increíble."],
];
const EN_PROVERBS: Saying[] = [
  ["Don't count your chickens before they hatch.", "Don't plan on something good until it really happens.", [["Count your chickens every morning.", "literal-reading"], ["Always expect things to go your way.", "opposite-meaning"]], "An egg might not hatch. What could go wrong if you count it as a chicken?"],
  ["The early bird catches the worm.", "People who start early get the best chances.", [["Birds eat worms in the morning.", "literal-reading"], ["It is better to sleep late.", "opposite-meaning"]], "The first one there gets the prize."],
  ["Look before you leap.", "Think before you act.", [["Always look down when you jump.", "literal-reading"], ["Act fast without waiting.", "opposite-meaning"]], "Leaping is a big jump. What should come first?"],
  ["Actions speak louder than words.", "What you do shows more than what you say.", [["Loud people get noticed first.", "literal-reading"], ["Saying sorry is always enough.", "opposite-meaning"]], "Compare promising to help with really helping."],
  ["Practice makes perfect.", "Doing something again and again makes you better at it.", [["Only perfect people practice.", "wrong-situation"], ["Practice does not help.", "opposite-meaning"]], "Think about how you got better at riding a bike."],
  ["Don't judge a book by its cover.", "Don't decide what something is like just from how it looks.", [["Never buy a book with a plain cover.", "literal-reading"], ["First looks always tell the truth.", "opposite-meaning"]], "A plain cover can hide a great story."],
  ["Two heads are better than one.", "Two people working together can solve a problem better.", [["Animals with two heads are smarter.", "literal-reading"], ["It is best to work alone.", "opposite-meaning"]], "Think of two friends working on a puzzle."],
  ["Slow and steady wins the race.", "Keeping at it, bit by bit, gets the job done.", [["The slowest runner always wins.", "literal-reading"], ["Rushing is the best way to finish.", "opposite-meaning"]], "Remember the story of the tortoise and the hare."],
  ["Where there's a will, there's a way.", "If you really want to do something, you can find a way.", [["Every road goes somewhere.", "literal-reading"], ["Some things can never be done.", "opposite-meaning"]], "A will here means wanting something very much."],
  ["Better safe than sorry.", "It is wiser to be careful than to take a risk.", [["Saying sorry keeps you safe.", "literal-reading"], ["Taking chances is always best.", "opposite-meaning"]], "Think about wearing a helmet even on a short ride."],
  ["Many hands make light work.", "A job is easier when many people help.", [["Hands are not heavy.", "literal-reading"], ["Big jobs are best done alone.", "opposite-meaning"]], "Light here means easy, not bright."],
  ["Every cloud has a silver lining.", "Something good can come out of a bad time.", [["Clouds are made of silver.", "literal-reading"], ["Bad days only get worse.", "opposite-meaning"]], "Even a gray cloud can shine at its edges."],
  ["Honesty is the best policy.", "Telling the truth is the best choice.", [["Rules must always be written down.", "wrong-situation"], ["A small lie is sometimes better.", "opposite-meaning"]], "Honesty means telling the truth."],
  ["A stitch in time saves nine.", "Fixing a small problem now saves bigger work later.", [["Sewing is faster than other jobs.", "literal-reading"], ["Wait until a problem is big before you fix it.", "opposite-meaning"]], "One stitch on a small hole now, or nine stitches on a big hole later."],
];
const ES_PROVERBS: Saying[] = [
  ["Más vale prevenir que lamentar.", "Es mejor tener cuidado antes que arrepentirse después.", [["Lamentarse ayuda a prevenir.", "wrong-situation"], ["Es mejor arriesgarse siempre.", "opposite-meaning"]], "Piensa en ponerte el casco aunque el paseo sea corto."],
  ["No hay mal que por bien no venga.", "De algo malo puede salir algo bueno.", [["Todo lo malo es bueno.", "literal-reading"], ["Las cosas malas solo empeoran.", "opposite-meaning"]], "Piensa en un día lluvioso que terminó con un arcoíris."],
  ["Perro que ladra no muerde.", "Quien amenaza mucho casi nunca hace daño.", [["Los perros que ladran no tienen dientes.", "literal-reading"], ["Hay que tenerle miedo a quien grita.", "opposite-meaning"]], "Piensa en alguien que hace mucho ruido pero no hace nada."],
  ["Más vale pájaro en mano que cien volando.", "Es mejor algo seguro que mucho que no es seguro.", [["Es mejor tener pájaros como mascota.", "literal-reading"], ["Es mejor arriesgar lo que tienes por algo más grande.", "opposite-meaning"]], "El pájaro en la mano ya es tuyo. Los que vuelan, no."],
  ["Poco a poco se va lejos.", "Avanzando paso a paso se llega a la meta.", [["Hay que caminar despacio para no cansarse.", "literal-reading"], ["Solo los más rápidos llegan lejos.", "opposite-meaning"]], "Recuerda la carrera de la tortuga y la liebre."],
  ["No por mucho madrugar amanece más temprano.", "Apurarse no hace que las cosas pasen antes.", [["El sol sale cuando uno se levanta.", "literal-reading"], ["Quien se apura siempre consigue todo antes.", "opposite-meaning"]], "Aunque te levantes a las cuatro, el sol sale a su hora."],
  ["La práctica hace al maestro.", "Practicar mucho te hace muy bueno en algo.", [["Los maestros practican en la escuela.", "literal-reading"], ["Practicar no sirve de nada.", "opposite-meaning"]], "Maestro aquí quiere decir alguien que hace algo muy bien."],
  ["Del dicho al hecho hay mucho trecho.", "Decir algo es más fácil que hacerlo.", [["Hay un camino largo entre dos pueblos.", "literal-reading"], ["Lo que se dice siempre se cumple.", "opposite-meaning"]], "Compara prometer que vas a ayudar con ayudar de verdad."],
  ["Al mal tiempo, buena cara.", "Ante los problemas, hay que tener buena actitud.", [["Cuando llueve, hay que lavarse la cara.", "literal-reading"], ["Cuando algo sale mal, hay que enojarse.", "opposite-meaning"]], "El mal tiempo aquí es cualquier problema."],
  ["Dime con quién andas y te diré quién eres.", "Tus amigos dicen mucho de cómo eres.", [["Siempre hay que avisar con quién vas a salir.", "literal-reading"], ["Los amigos no dicen nada de ti.", "opposite-meaning"]], "Piensa en lo que tienen en común los buenos amigos."],
  ["A caballo regalado no se le mira el diente.", "Si te regalan algo, no le busques defectos.", [["Hay que revisar los dientes de los caballos.", "literal-reading"], ["Hay que quejarse de los regalos.", "opposite-meaning"]], "Antes, la gente miraba los dientes de un caballo para saber si estaba sano."],
  ["Ojos que no ven, corazón que no siente.", "Lo que no sabes no te preocupa.", [["Si cierras los ojos, no sientes nada.", "literal-reading"], ["Lo que no ves te preocupa más.", "opposite-meaning"]], "Piensa en algo malo que pasó y de lo que nadie te contó."],
  ["Querer es poder.", "Si de verdad quieres algo, puedes lograrlo.", [["Querer a alguien te da poderes.", "literal-reading"], ["Desear algo no sirve de nada.", "opposite-meaning"]], "Querer aquí es desear algo con muchas ganas."],
  ["El que busca, encuentra.", "Si te esfuerzas en buscar, consigues lo que quieres.", [["Las cosas siempre se pierden.", "wrong-situation"], ["Buscar es perder el tiempo.", "opposite-meaning"]], "Piensa en un lápiz perdido que apareció cuando revisaste toda la mochila."],
];

const IDIOMS: Level[] = [
  {
    ask: bi("What does the idiom mean?", "¿Qué quiere decir la expresión?"),
    hints: bi(
      ["An idiom does not mean exactly what its words say.", "Picture the words. Then think about when people really say this."],
      ["Una expresión como esta no quiere decir exactamente lo que dicen sus palabras.", "Imagina las palabras. Luego piensa en cuándo la gente la dice de verdad."],
    ),
    seconds: 20,
    bank: pair(EN_IDIOMS.map(sayingQ("en")), ES_IDIOMS.map(sayingQ("es"))),
  },
  {
    ask: bi("What does the proverb mean?", "¿Qué quiere decir el refrán?"),
    hints: bi(
      ["A proverb is a short, old saying that gives advice.", "Think about the picture in the saying. What lesson does it teach about everyday life?"],
      ["Un refrán es un dicho corto y antiguo que da un consejo.", "Piensa en la imagen del refrán. ¿Qué enseña sobre la vida diaria?"],
    ),
    seconds: 25,
    bank: pair(EN_PROVERBS.map(sayingQ("en")), ES_PROVERBS.map(sayingQ("es"))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.conj.prep.interj (5) — level 1: is the word a conjunction, a preposition, or an interjection?
// Level 2: words that can be either (after lunch / after we ate; hasta la noche / hasta que llegues).

const POS_LABELS = bi(["Conjunction", "Preposition", "Interjection"], ["Conjunción", "Preposición", "Interjección"]);
/** [sentence, the word, part of speech, what comes right after it] */
type Pos = [string, string, number, string];
/** Level 1 points at what the word does; level 2 at what follows it, a noun or a whole idea. */
const posClue = (locale: Locale, level: number, word: string, pos: number, next: string) =>
  !next
    ? tr(locale, `"${word}" stands apart at the start, followed by a comma.`, `"${word}" va solo al principio, seguido de una coma.`)
    : level === 2
      ? tr(locale, `Look at what comes right after "${word}": "${next}".`, `Mira lo que viene justo después de "${word}": "${next}".`)
      : pos === 0
        ? tr(locale, `What does "${word}" connect? Look at the words before it and after it.`, `¿Qué une "${word}"? Mira las palabras de antes y de después.`)
        : tr(locale, `"${word}" comes right before "${next}". What does it tell about "${next}"?`, `"${word}" va justo antes de "${next}". ¿Qué dice de "${next}"?`);
const posQ = (locale: Locale, level: number) => ([s, word, pos, next]: Pos): L => [
  `“${s}”\n\n${tr(locale, "Word", "Palabra")}: ${word}`,
  pos,
  posClue(locale, level, word, pos, next),
  tr(
    locale,
    [`"${word}" joins two words or two ideas.`, `"${word}" connects a noun to the rest of the sentence.`, `"${word}" shows a feeling and stands apart from the sentence.`][pos],
    [`"${word}" une palabras o ideas.`, `"${word}" une un sustantivo con el resto de la oración.`, `"${word}" expresa un sentimiento y va aparte del resto de la oración.`][pos],
  ),
  word.toLowerCase(),
];
const EN_POS1: Pos[] = [
  ["I like apples and pears.", "and", 0, "pears"], ["The cat hid under the porch.", "under", 1, "the porch"], ["Oh, I forgot my lunch.", "Oh", 2, ""],
  ["It was sunny but cold.", "but", 0, "cold"], ["Leo went with his dad.", "with", 1, "his dad"], ["Wow, that tower is tall.", "Wow", 2, ""],
  ["Do you want soup or salad?", "or", 0, "salad"], ["We slept during the storm.", "during", 1, "the storm"], ["Ouch, I bumped my knee.", "Ouch", 2, ""],
  ["We stayed home because it rained.", "because", 0, "it rained"], ["The duck swam across the lake.", "across", 1, "the lake"], ["Hey, wait for me.", "Hey", 2, ""],
  ["I was tired, so I rested.", "so", 0, "I rested"], ["This gift is for you.", "for", 1, "you"], ["Oops, I spilled the milk.", "Oops", 2, ""],
  ["Well, let's get started.", "Well", 2, ""],
];
const ES_POS1: Pos[] = [
  ["Me gustan las manzanas y las peras.", "y", 0, "las peras"], ["El gato se escondió bajo el porche.", "bajo", 1, "el porche"], ["Oh, olvidé mi almuerzo.", "Oh", 2, ""],
  ["Hacía sol, pero hacía frío.", "pero", 0, "hacía frío"], ["Leo fue con su papá.", "con", 1, "su papá"], ["Vaya, llegaste temprano.", "Vaya", 2, ""],
  ["¿Quieres sopa o ensalada?", "o", 0, "ensalada"], ["Dormimos durante la tormenta.", "durante", 1, "la tormenta"], ["Ay, me golpeé la rodilla.", "Ay", 2, ""],
  ["Nos quedamos en casa porque llovía.", "porque", 0, "llovía"], ["El pato nadó hacia la orilla.", "hacia", 1, "la orilla"], ["Oye, espérame.", "Oye", 2, ""],
  ["Salimos aunque hacía frío.", "aunque", 0, "hacía frío"], ["Este regalo es para ti.", "para", 1, "ti"], ["Uy, se me cayó la leche.", "Uy", 2, ""],
  ["Bueno, vamos a empezar.", "Bueno", 2, ""],
];
const EN_POS2: Pos[] = [
  ["We played outside after lunch.", "after", 1, "lunch"], ["We played outside after we ate lunch.", "after", 0, "we ate lunch"],
  ["Wash your hands before dinner.", "before", 1, "dinner"], ["Wash your hands before you eat.", "before", 0, "you eat"],
  ["I have lived here since May.", "since", 1, "May"], ["I have been happy since you came.", "since", 0, "you came"],
  ["Wait here until noon.", "until", 1, "noon"], ["Wait here until the bell rings.", "until", 0, "the bell rings"],
  ["Everyone came but Leo.", "but", 1, "Leo"], ["I wanted to come, but I was sick.", "but", 0, "I was sick"],
  ["Well, I think we should go.", "Well", 2, ""], ["After the game, we got pizza.", "After", 1, "the game"],
  ["Before it got dark, we went home.", "Before", 0, "it got dark"], ["Oh, the bus is here.", "Oh", 2, ""],
  ["The dog slept until morning.", "until", 1, "morning"], ["Since it was raining, we stayed in.", "Since", 0, "it was raining"],
];
const ES_POS2: Pos[] = [
  ["Jugamos afuera después de la comida.", "después de", 1, "la comida"], ["Jugamos afuera después de que comimos.", "después de que", 0, "comimos"],
  ["Lávate las manos antes de la cena.", "antes de", 1, "la cena"], ["Lávate las manos antes de que comamos.", "antes de que", 0, "comamos"],
  ["Vivo aquí desde mayo.", "desde", 1, "mayo"], ["Estoy feliz desde que llegaste.", "desde que", 0, "llegaste"],
  ["Espera aquí hasta el mediodía.", "hasta", 1, "el mediodía"], ["Espera aquí hasta que suene la campana.", "hasta que", 0, "suene la campana"],
  ["Quería ir, pero estaba enfermo.", "pero", 0, "estaba enfermo"], ["Bueno, creo que ya nos vamos.", "Bueno", 2, ""],
  ["Después de la clase, comimos pizza.", "Después de", 1, "la clase"], ["Antes de que oscureciera, volvimos a casa.", "Antes de que", 0, "oscureciera"],
  ["Oh, ya llegó el autobús.", "Oh", 2, ""], ["El perro durmió hasta la mañana.", "hasta", 1, "la mañana"],
  ["Como llovía, nos quedamos adentro.", "Como", 0, "llovía"], ["Ay, se me olvidó la tarea.", "Ay", 2, ""],
];

const CONJ_PREP_INTERJ: Level[] = [
  {
    ask: bi("What part of speech is the word?", "¿Qué clase de palabra es?"),
    hints: bi(
      ["Does the word join ideas, connect a noun to the sentence, or show a feeling?", "Conjunctions join (and, but, because). Prepositions come before a noun (under, with, for). Interjections show feeling and stand apart (oh, wow, ouch)."],
      ["¿La palabra une ideas, une un sustantivo con la oración, o expresa un sentimiento?", "Las conjunciones unen (y, pero, porque). Las preposiciones van antes de un sustantivo (bajo, con, para). Las interjecciones expresan un sentimiento y van aparte (ay, oh, uy)."],
    ),
    seconds: 15,
    labels: POS_LABELS,
    tags: ["conjunction", "preposition", "interjection"],
    bank: pair(EN_POS1.map(posQ("en", 1)), ES_POS1.map(posQ("es", 1))),
  },
  {
    ask: bi("What part of speech is the word in this sentence?", "¿Qué clase de palabra es en esta oración?"),
    hints: bi(
      ["Some words can be a preposition or a conjunction. Look at what comes after the word.", "A noun after it: preposition (after lunch). A whole idea with its own verb after it: conjunction (after we ate)."],
      ["Algunas palabras cambian de clase. Mira lo que viene después.", "Si sigue un sustantivo, es preposición (hasta la noche). Si sigue un verbo con su idea, es conjunción (hasta que llegues)."],
    ),
    seconds: 18,
    labels: POS_LABELS,
    tags: ["conjunction", "preposition", "interjection"],
    bank: pair(EN_POS2.map(posQ("en", 2)), ES_POS2.map(posQ("es", 2))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.perfect.tenses (5) — level 1: present perfect (has written, have seen; ha escrito, hemos visto) with
// irregular participles; level 2: past perfect and future perfect from the time words (had left, will have
// finished; había salido, habrá terminado).

/** [sentence, key, wrong forms, clue, verb|subject] */
type Perf = [string, string, Wrong[], string, string];
const perfQ = (locale: Locale) => ([s, key, wrong, clue, base]: Perf): G => [
  s,
  key,
  wrong,
  clue,
  tr(locale, `Use the helper and the past participle of ${base.split("|")[0]}: ${key}.`, `Se usa haber y el participio de ${base.split("|")[0]}: ${key}.`),
  base,
];
const EN_PERF1: Perf[] = [
  ["Maya ___ three letters to her pen pal.", "has written", [["has wrote", "past-for-participle"], ["have written", "aux-disagrees-with-subject"]], "Maya is one person. Write is irregular.", "write|Maya"],
  ["We ___ this movie twice.", "have seen", [["have saw", "past-for-participle"], ["has seen", "aux-disagrees-with-subject"]], "The subject is we. See is irregular.", "see|we"],
  ["The children ___ all the cookies.", "have eaten", [["have ate", "past-for-participle"], ["has eaten", "aux-disagrees-with-subject"]], "The children are more than one. Eat is irregular.", "eat|children"],
  ["Leo ___ on a plane twice.", "has flown", [["has flew", "past-for-participle"], ["have flown", "aux-disagrees-with-subject"]], "Leo is one person. Fly is irregular.", "fly|Leo"],
  ["I ___ my homework already.", "have done", [["have did", "past-for-participle"], ["has done", "aux-disagrees-with-subject"]], "The subject is I. Do is irregular.", "do|I"],
  ["The bell ___ already.", "has rung", [["has rang", "past-for-participle"], ["have rung", "aux-disagrees-with-subject"]], "The bell is one thing. Ring is irregular.", "ring|bell"],
  ["My sisters ___ in this lake many times.", "have swum", [["have swam", "past-for-participle"], ["has swum", "aux-disagrees-with-subject"]], "My sisters are more than one. Swim is irregular.", "swim|sisters"],
  ["Grandpa ___ that story before.", "has told", [["has telled", "regularized-irregular"], ["have told", "aux-disagrees-with-subject"]], "Grandpa is one person. Tell is irregular.", "tell|Grandpa"],
  ["You ___ a lot this year.", "have grown", [["have grew", "past-for-participle"], ["has grown", "aux-disagrees-with-subject"]], "The subject is you. Grow is irregular.", "grow|you"],
  ["Kai ___ his favorite pencil.", "has lost", [["has losed", "regularized-irregular"], ["have lost", "aux-disagrees-with-subject"]], "Kai is one person. Lose is irregular.", "lose|Kai"],
  ["The players ___ all their water.", "have drunk", [["have drank", "past-for-participle"], ["has drunk", "aux-disagrees-with-subject"]], "The players are more than one. Drink is irregular.", "drink|players"],
  ["Someone ___ the window.", "has broken", [["has broke", "past-for-participle"], ["have broken", "aux-disagrees-with-subject"]], "Someone means one person. Break is irregular.", "break|someone"],
  ["We ___ a new song for the concert.", "have learned", [["have learn", "missing-participle-ending"], ["has learned", "aux-disagrees-with-subject"]], "The subject is we. Learn is regular.", "learn|we"],
  ["Ana ___ the class pet all week.", "has fed", [["has feeded", "regularized-irregular"], ["have fed", "aux-disagrees-with-subject"]], "Ana is one person. Feed is irregular.", "feed|Ana"],
  ["The sun ___ already.", "has set", [["has setted", "regularized-irregular"], ["have set", "aux-disagrees-with-subject"]], "The sun is one thing. Set is irregular.", "set|sun"],
  ["My parents ___ a new car.", "have chosen", [["have chose", "past-for-participle"], ["has chosen", "aux-disagrees-with-subject"]], "My parents are more than one. Choose is irregular.", "choose|parents"],
];
const ES_PERF1: Perf[] = [
  ["Maya ___ tres cartas a su amiga.", "ha escrito", [["ha escribido", "regular-participle-for-irregular"], ["han escrito", "aux-disagrees-with-subject"]], "Maya es una sola persona. Escribir tiene un participio especial.", "escribir|ella"],
  ["Nosotros ___ esta película dos veces.", "hemos visto", [["hemos veído", "regular-participle-for-irregular"], ["han visto", "aux-disagrees-with-subject"]], "El sujeto es nosotros. Ver tiene un participio especial.", "ver|nosotros"],
  ["Los niños ___ todas las galletas.", "han comido", [["ha comido", "aux-disagrees-with-subject"], ["han comiendo", "gerund-for-participle"]], "Los niños son varios. Comer es regular.", "comer|ellos"],
  ["Leo ___ en avión dos veces.", "ha volado", [["ha volando", "gerund-for-participle"], ["he volado", "aux-disagrees-with-subject"]], "Leo es una sola persona. Volar es regular.", "volar|él"],
  ["Yo ya ___ la tarea.", "he hecho", [["he hacido", "regular-participle-for-irregular"], ["ha hecho", "aux-disagrees-with-subject"]], "El sujeto es yo. Hacer tiene un participio especial.", "hacer|yo"],
  ["La campana ya ___.", "ha sonado", [["ha sonando", "gerund-for-participle"], ["han sonado", "aux-disagrees-with-subject"]], "La campana es una sola. Sonar es regular.", "sonar|ella"],
  ["Mis hermanas ___ la ventana.", "han abierto", [["han abrido", "regular-participle-for-irregular"], ["ha abierto", "aux-disagrees-with-subject"]], "Mis hermanas son varias. Abrir tiene un participio especial.", "abrir|ellas"],
  ["El abuelo nos ___ ese cuento antes.", "ha contado", [["ha contando", "gerund-for-participle"], ["han contado", "aux-disagrees-with-subject"]], "El abuelo es una sola persona. Contar es regular.", "contar|él"],
  ["Tú ___ mucho este año.", "has crecido", [["ha crecido", "aux-disagrees-with-subject"], ["has creciendo", "gerund-for-participle"]], "El sujeto es tú. Crecer es regular.", "crecer|tú"],
  ["Kai ___ su lápiz favorito.", "ha perdido", [["ha perdiendo", "gerund-for-participle"], ["han perdido", "aux-disagrees-with-subject"]], "Kai es una sola persona. Perder es regular.", "perder|él"],
  ["Alguien ___ el florero.", "ha roto", [["ha rompido", "regular-participle-for-irregular"], ["han roto", "aux-disagrees-with-subject"]], "Alguien es una sola persona. Romper tiene un participio especial.", "romper|él"],
  ["Nosotros ___ los platos en la mesa.", "hemos puesto", [["hemos ponido", "regular-participle-for-irregular"], ["han puesto", "aux-disagrees-with-subject"]], "El sujeto es nosotros. Poner tiene un participio especial.", "poner|nosotros"],
  ["Ana ___ de su viaje.", "ha vuelto", [["ha volvido", "regular-participle-for-irregular"], ["han vuelto", "aux-disagrees-with-subject"]], "Ana es una sola persona. Volver tiene un participio especial.", "volver|ella"],
  ["¿Quién ___ eso?", "ha dicho", [["ha decido", "regular-participle-for-irregular"], ["han dicho", "aux-disagrees-with-subject"]], "Quién pregunta por una sola persona. Decir tiene un participio especial.", "decir|él"],
  ["Nosotros ya ___ el problema.", "hemos resuelto", [["hemos resolvido", "regular-participle-for-irregular"], ["ha resuelto", "aux-disagrees-with-subject"]], "El sujeto es nosotros. Resolver tiene un participio especial.", "resolver|nosotros"],
  ["Los vecinos ___ el patio de flores.", "han cubierto", [["han cubrido", "regular-participle-for-irregular"], ["ha cubierto", "aux-disagrees-with-subject"]], "Los vecinos son varios. Cubrir tiene un participio especial.", "cubrir|ellos"],
];
const EN_PERF2: Perf[] = [
  ["By the time we arrived, the movie ___.", "had started", [["has started", "present-perfect-for-past-perfect"], ["will have started", "future-perfect-for-past-perfect"]], "\"By the time we arrived\" points to a moment in the past.", "start|movie"],
  ["By next June, Mia ___ all fifty books.", "will have read", [["had read", "past-perfect-for-future-perfect"], ["has read", "present-perfect-for-future-perfect"]], "\"By next June\" points to a moment in the future.", "read|Mia"],
  ["When I got to the bus stop, the bus ___.", "had left", [["has left", "present-perfect-for-past-perfect"], ["will have left", "future-perfect-for-past-perfect"]], "\"When I got to the bus stop\" points to a moment in the past.", "leave|bus"],
  ["By the end of the day, we ___ ten miles.", "will have walked", [["had walked", "past-perfect-for-future-perfect"], ["have walked", "present-perfect-for-future-perfect"]], "\"By the end of the day\" points to a moment that has not come yet.", "walk|we"],
  ["Leo was tired because he ___ all day.", "had worked", [["has worked", "present-perfect-for-past-perfect"], ["will have worked", "future-perfect-for-past-perfect"]], "\"Leo was tired\" is in the past, and the work came before that.", "work|Leo"],
  ["By Friday, the plants ___ two inches.", "will have grown", [["had grown", "past-perfect-for-future-perfect"], ["have grown", "present-perfect-for-future-perfect"]], "\"By Friday\" points to a moment in the future.", "grow|plants"],
  ["The ground was wet because it ___ all night.", "had rained", [["has rained", "present-perfect-for-past-perfect"], ["will have rained", "future-perfect-for-past-perfect"]], "\"The ground was wet\" is in the past, and the rain came before that.", "rain|it"],
  ["By the time Mom gets home, I ___ the dishes.", "will have washed", [["had washed", "past-perfect-for-future-perfect"], ["have washed", "present-perfect-for-future-perfect"]], "\"By the time Mom gets home\" points to a moment that has not come yet.", "wash|I"],
  ["Ana knew the answer because she ___ the chapter.", "had studied", [["has studied", "present-perfect-for-past-perfect"], ["will have studied", "future-perfect-for-past-perfect"]], "\"Ana knew\" is in the past, and the studying came before that.", "study|Ana"],
  ["By next year, my brother ___ to drive.", "will have learned", [["had learned", "past-perfect-for-future-perfect"], ["has learned", "present-perfect-for-future-perfect"]], "\"By next year\" points to a moment in the future.", "learn|brother"],
  ["Before the storm hit, we ___ the windows.", "had closed", [["have closed", "present-perfect-for-past-perfect"], ["will have closed", "future-perfect-for-past-perfect"]], "\"Before the storm hit\" points to a moment in the past.", "close|we"],
  ["By noon tomorrow, the snow ___.", "will have melted", [["had melted", "past-perfect-for-future-perfect"], ["has melted", "present-perfect-for-future-perfect"]], "\"By noon tomorrow\" points to a moment in the future.", "melt|snow"],
  ["The kitten was hungry because nobody ___ it.", "had fed", [["has fed", "present-perfect-for-past-perfect"], ["will have fed", "future-perfect-for-past-perfect"]], "\"The kitten was hungry\" is in the past, and the feeding should have come before.", "feed|nobody"],
  ["By the end of the month, Kai ___ his model ship.", "will have finished", [["had finished", "past-perfect-for-future-perfect"], ["has finished", "present-perfect-for-future-perfect"]], "\"By the end of the month\" points to a moment that has not come yet.", "finish|Kai"],
];
const ES_PERF2: Perf[] = [
  ["Cuando llegamos, la película ya ___.", "había empezado", [["ha empezado", "present-perfect-for-past-perfect"], ["habrá empezado", "future-perfect-for-past-perfect"]], "\"Cuando llegamos\" es un momento del pasado.", "empezar|ella"],
  ["Para junio, Mía ___ los cincuenta libros.", "habrá leído", [["había leído", "past-perfect-for-future-perfect"], ["ha leído", "present-perfect-for-future-perfect"]], "\"Para junio\" es un momento del futuro.", "leer|ella"],
  ["Cuando llegué a la parada, el autobús ya ___.", "había salido", [["ha salido", "present-perfect-for-past-perfect"], ["habrá salido", "future-perfect-for-past-perfect"]], "\"Cuando llegué a la parada\" es un momento del pasado.", "salir|él"],
  ["Al final del día, nosotros ___ diez kilómetros.", "habremos caminado", [["habíamos caminado", "past-perfect-for-future-perfect"], ["hemos caminado", "present-perfect-for-future-perfect"]], "\"Al final del día\" es un momento que todavía no llega.", "caminar|nosotros"],
  ["Leo estaba cansado porque ___ todo el día.", "había trabajado", [["ha trabajado", "present-perfect-for-past-perfect"], ["habrá trabajado", "future-perfect-for-past-perfect"]], "\"Leo estaba cansado\" es pasado, y el trabajo pasó antes.", "trabajar|él"],
  ["Para el viernes, las plantas ___ cinco centímetros.", "habrán crecido", [["habían crecido", "past-perfect-for-future-perfect"], ["han crecido", "present-perfect-for-future-perfect"]], "\"Para el viernes\" es un momento del futuro.", "crecer|ellas"],
  ["El piso estaba mojado porque ___ toda la noche.", "había llovido", [["ha llovido", "present-perfect-for-past-perfect"], ["habrá llovido", "future-perfect-for-past-perfect"]], "\"El piso estaba mojado\" es pasado, y la lluvia pasó antes.", "llover|él"],
  ["Cuando mamá llegue a casa, yo ya ___ los platos.", "habré lavado", [["había lavado", "past-perfect-for-future-perfect"], ["he lavado", "present-perfect-for-future-perfect"]], "\"Cuando mamá llegue a casa\" es un momento que todavía no llega.", "lavar|yo"],
  ["Ana sabía la respuesta porque ___ el capítulo.", "había estudiado", [["ha estudiado", "present-perfect-for-past-perfect"], ["habrá estudiado", "future-perfect-for-past-perfect"]], "\"Ana sabía\" es pasado, y el estudio pasó antes.", "estudiar|ella"],
  ["El próximo año, mi hermano ya ___ a manejar.", "habrá aprendido", [["había aprendido", "past-perfect-for-future-perfect"], ["ha aprendido", "present-perfect-for-future-perfect"]], "\"El próximo año\" es un momento del futuro.", "aprender|él"],
  ["Antes de la tormenta, nosotros ___ las ventanas.", "habíamos cerrado", [["hemos cerrado", "present-perfect-for-past-perfect"], ["habremos cerrado", "future-perfect-for-past-perfect"]], "\"Antes de la tormenta\" señala un momento del pasado.", "cerrar|nosotros"],
  ["Mañana al mediodía, el sol ya ___ la nieve.", "habrá derretido", [["había derretido", "past-perfect-for-future-perfect"], ["ha derretido", "present-perfect-for-future-perfect"]], "\"Mañana al mediodía\" es un momento del futuro.", "derretir|él"],
  ["El gatito tenía hambre porque nadie le ___ de comer.", "había dado", [["ha dado", "present-perfect-for-past-perfect"], ["habrá dado", "future-perfect-for-past-perfect"]], "\"El gatito tenía hambre\" es pasado, y la comida tenía que llegar antes.", "dar|él"],
  ["A fin de mes, Kai ___ su barco de juguete.", "habrá terminado", [["había terminado", "past-perfect-for-future-perfect"], ["ha terminado", "present-perfect-for-future-perfect"]], "\"A fin de mes\" es un momento que todavía no llega.", "terminar|él"],
];

const PERFECT_TENSES: Level[] = [
  {
    ask: bi("Choose the verb that completes the sentence.", "Elige el verbo que completa la oración."),
    hints: bi(
      ["This tense uses has or have plus a past participle (has eaten, have walked).", "Use has with he, she, it, or one person or thing. Use have with I, you, we, they, or more than one. Many verbs have a special participle: written, seen, eaten."],
      ["Este tiempo usa haber más un participio (ha comido, hemos caminado).", "he, has, ha, hemos, han van según quién hace la acción. Algunos participios son especiales: escrito, visto, hecho, roto, puesto, vuelto, dicho, abierto."],
    ),
    seconds: 15,
    bank: pair(EN_PERF1.map(perfQ("en")), ES_PERF1.map(perfQ("es"))),
  },
  {
    ask: bi("Choose the verb that completes the sentence.", "Elige el verbo que completa la oración."),
    hints: bi(
      ["Find the time words. Is the moment in the past or in the future?", "Finished before a past moment: had + participle. Finished before a future moment: will have + participle."],
      ["Busca las palabras de tiempo. ¿El momento es pasado o futuro?", "Terminado antes de un momento pasado: había + participio. Terminado antes de un momento futuro: habrá + participio."],
    ),
    seconds: 20,
    bank: pair(EN_PERF2.map(perfQ("en")), ES_PERF2.map(perfQ("es"))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.tense.shifts (5) — level 1: choose the verb that keeps the tense of the story; level 2: find the verb
// that shifts. Spanish stories never use nosotros forms like "comemos" or "construimos", which are the
// same in present and past for some verbs.

/** [sentence, key, wrong forms, time words, the story's tense] */
type Steady = [string, string, Wrong[], string, "past" | "present"];
const steadyQ = (locale: Locale) => ([s, key, wrong, cue, tense]: Steady): G => [
  s,
  key,
  wrong,
  tr(locale, `"${cue}" sets the time, and the first verb matches it.`, `"${cue}" marca el tiempo, y el primer verbo va con él.`),
  tr(locale, `The sentence is in the ${tense} tense, so the second verb stays in the ${tense} too.`, `La oración está en ${tense === "past" ? "pasado" : "presente"}, así que el segundo verbo también.`),
  tense,
];
const EN_STEADY: Steady[] = [
  ["Yesterday Ana walked to the park and ___ a heron.", "saw", [["sees", "present-in-past-story"], ["will see", "future-in-past-story"]], "Yesterday", "past"],
  ["Every morning Kai wakes up early and ___ his dog.", "feeds", [["fed", "past-in-present-story"], ["will feed", "future-in-present-story"]], "Every morning", "present"],
  ["Last summer we visited Grandma, and she ___ us how to fish.", "taught", [["teaches", "present-in-past-story"], ["will teach", "future-in-past-story"]], "Last summer", "past"],
  ["Every year Mia opens her birthday box and ___ a new book inside.", "finds", [["found", "past-in-present-story"], ["will find", "future-in-present-story"]], "Every year", "present"],
  ["Last night the storm knocked down a tree, and the next morning Dad ___ it into logs.", "cut", [["cuts", "present-in-past-story"], ["will cut", "future-in-past-story"]], "Last night", "past"],
  ["Each spring our class plants seeds and ___ them every day.", "waters", [["watered", "past-in-present-story"], ["will water", "future-in-present-story"]], "Each spring", "present"],
  ["Yesterday, when the bell rang, the students ___ to the gym.", "hurried", [["hurry", "present-in-past-story"], ["will hurry", "future-in-past-story"]], "Yesterday", "past"],
  ["Every night Leo reads a chapter and then ___ off the light.", "turns", [["turned", "past-in-present-story"], ["will turn", "future-in-present-story"]], "Every night", "present"],
  ["Last week the river flooded and ___ the road.", "covered", [["covers", "present-in-past-story"], ["will cover", "future-in-past-story"]], "Last week", "past"],
  ["Every day after school, Jada practices the piano and ___ new songs.", "learns", [["learned", "past-in-present-story"], ["will learn", "future-in-present-story"]], "Every day", "present"],
  ["Yesterday the cat climbed the fence and ___ onto the roof.", "jumped", [["jumps", "present-in-past-story"], ["will jump", "future-in-past-story"]], "Yesterday", "past"],
  ["On Saturdays Grandpa makes pancakes and ___ them with fruit.", "tops", [["topped", "past-in-present-story"], ["will top", "future-in-present-story"]], "On Saturdays", "present"],
  ["Two years ago Omar moved to Ohio and ___ at a new school.", "started", [["starts", "present-in-past-story"], ["will start", "future-in-past-story"]], "Two years ago", "past"],
  ["Every winter the lake freezes and people ___ on it.", "skate", [["skated", "past-in-present-story"], ["will skate", "future-in-present-story"]], "Every winter", "present"],
];
const ES_STEADY: Steady[] = [
  ["Ayer Ana caminó al parque y ___ una garza.", "vio", [["ve", "present-in-past-story"], ["verá", "future-in-past-story"]], "Ayer", "past"],
  ["Todas las mañanas Kai se levanta temprano y ___ a su perro.", "alimenta", [["alimentó", "past-in-present-story"], ["alimentará", "future-in-present-story"]], "Todas las mañanas", "present"],
  ["El verano pasado visitamos a la abuela y ella nos ___ a pescar.", "enseñó", [["enseña", "present-in-past-story"], ["enseñará", "future-in-past-story"]], "El verano pasado", "past"],
  ["Cada año Mía abre su caja de cumpleaños y ___ un libro nuevo adentro.", "encuentra", [["encontró", "past-in-present-story"], ["encontrará", "future-in-present-story"]], "Cada año", "present"],
  ["Anoche la tormenta tumbó un árbol, y a la mañana siguiente papá lo ___ en pedazos.", "cortó", [["corta", "present-in-past-story"], ["cortará", "future-in-past-story"]], "Anoche", "past"],
  ["Cada primavera la maestra siembra semillas y las ___ todos los días.", "riega", [["regó", "past-in-present-story"], ["regará", "future-in-present-story"]], "Cada primavera", "present"],
  ["Ayer, cuando sonó la campana, los estudiantes ___ al gimnasio.", "corrieron", [["corren", "present-in-past-story"], ["correrán", "future-in-past-story"]], "Ayer", "past"],
  ["Todas las noches Leo lee un capítulo y luego ___ la luz.", "apaga", [["apagó", "past-in-present-story"], ["apagará", "future-in-present-story"]], "Todas las noches", "present"],
  ["La semana pasada el río se desbordó y ___ el camino.", "cubrió", [["cubre", "present-in-past-story"], ["cubrirá", "future-in-past-story"]], "La semana pasada", "past"],
  ["Todos los días después de clases, Jada practica piano y ___ canciones nuevas.", "aprende", [["aprendió", "past-in-present-story"], ["aprenderá", "future-in-present-story"]], "Todos los días", "present"],
  ["Ayer el gato trepó la cerca y ___ al techo.", "saltó", [["salta", "present-in-past-story"], ["saltará", "future-in-past-story"]], "Ayer", "past"],
  ["Los sábados el abuelo hace panqueques y los ___ con fruta.", "sirve", [["sirvió", "past-in-present-story"], ["servirá", "future-in-present-story"]], "Los sábados", "present"],
  ["Hace dos años Omar se mudó a Ohio y ___ en una escuela nueva.", "empezó", [["empieza", "present-in-past-story"], ["empezará", "future-in-past-story"]], "Hace dos años", "past"],
  ["Cada invierno el lago se congela y la gente ___ sobre el hielo.", "patina", [["patinó", "past-in-present-story"], ["patinará", "future-in-present-story"]], "Cada invierno", "present"],
];

/** [short story, its three verbs in order, index of the verb that shifts, time words, the fixed verb] */
type Shift = [string, [string, string, string], number, string, string];
const shiftQ = (locale: Locale) => ([story, verbs, k, cue, fix]: Shift): G => {
  const others = verbs.filter((_, i) => i !== k);
  return [
    `“${story}”`,
    verbs[k],
    others.map((v): Wrong => [v, "consistent-verb-chosen"]),
    tr(
      locale,
      `"${cue}" sets the time. Check each verb against it: does it tell about something that happens again and again, or something that already happened?`,
      `"${cue}" marca el tiempo. Revisa cada verbo con esa pista: ¿cuenta algo que pasa una y otra vez, o algo que ya pasó?`,
    ),
    tr(locale, `"${verbs[k]}" switches tenses. It should be "${fix}".`, `"${verbs[k]}" cambia de tiempo. Debería ser "${fix}".`),
    fix,
  ];
};
const EN_SHIFT: Shift[] = [
  ["Last Saturday we went to the zoo. We saw the lions, and then we eat lunch by the pond.", ["went", "saw", "eat"], 2, "Last Saturday", "ate"],
  ["Every day Mia rides her bike to school. She locks it by the gate and walked inside.", ["rides", "locks", "walked"], 2, "Every day", "walks"],
  ["Yesterday Leo baked bread. He mixed the dough, and it rises for an hour.", ["baked", "mixed", "rises"], 2, "Yesterday", "rose"],
  ["Each night the owl wakes up. It flies over the field and hunted for mice.", ["wakes", "flies", "hunted"], 2, "Each night", "hunts"],
  ["Last winter it snowed a lot. We built a snow fort and drink hot cocoa.", ["snowed", "built", "drink"], 2, "Last winter", "drank"],
  ["On Fridays our class plays games. We pick teams and cheered for each other.", ["plays", "pick", "cheered"], 2, "On Fridays", "cheer"],
  ["Last week Ana lost her tooth. She placed it under her pillow and finds a coin the next morning.", ["lost", "placed", "finds"], 2, "Last week", "found"],
  ["Every spring the birds return. They build nests and laid eggs.", ["return", "build", "laid"], 2, "Every spring", "lay"],
  ["Yesterday the bus broke down. The driver called for help, and we wait for an hour.", ["broke", "called", "wait"], 2, "Yesterday", "waited"],
  ["Kai always eats breakfast first. Then he brushed his teeth and grabs his backpack.", ["eats", "brushed", "grabs"], 1, "always", "brushes"],
  ["Last night the power went out. We lit candles and play cards.", ["went", "lit", "play"], 2, "Last night", "played"],
  ["Every summer my family camps by the lake. We fish in the morning and swam in the afternoon.", ["camps", "fish", "swam"], 2, "Every summer", "swim"],
  ["Two days ago Omar found a turtle. He carried it to the pond and watches it swim away.", ["found", "carried", "watches"], 2, "Two days ago", "watched"],
  ["Each morning the baker opens the shop. She sells bread and made coffee for the customers.", ["opens", "sells", "made"], 2, "Each morning", "makes"],
];
const ES_SHIFT: Shift[] = [
  ["El sábado pasado Ana fue al zoológico. Vio los leones y luego come junto al estanque.", ["fue", "Vio", "come"], 2, "El sábado pasado", "comió"],
  ["Todos los días Mía va en bicicleta a la escuela. La amarra junto a la reja y entró al salón.", ["va", "amarra", "entró"], 2, "Todos los días", "entra"],
  ["Ayer Leo horneó pan. Mezcló la masa y la deja reposar una hora.", ["horneó", "Mezcló", "deja"], 2, "Ayer", "dejó"],
  ["Cada noche el búho despierta. Vuela sobre el campo y cazó ratones.", ["despierta", "Vuela", "cazó"], 2, "Cada noche", "caza"],
  ["El invierno pasado nevó mucho. Mi hermano hizo un fuerte de nieve y toma chocolate caliente.", ["nevó", "hizo", "toma"], 2, "El invierno pasado", "tomó"],
  ["Los viernes la maestra organiza juegos. Forma equipos y aplaudió a todos.", ["organiza", "Forma", "aplaudió"], 2, "Los viernes", "aplaude"],
  ["La semana pasada a Ana se le cayó un diente. Lo puso bajo la almohada y encuentra una moneda al día siguiente.", ["cayó", "puso", "encuentra"], 2, "La semana pasada", "encontró"],
  ["Cada primavera los pájaros regresan. Hacen nidos y pusieron huevos.", ["regresan", "Hacen", "pusieron"], 2, "Cada primavera", "ponen"],
  ["Ayer se descompuso el autobús. El chofer pidió ayuda y la gente espera una hora.", ["descompuso", "pidió", "espera"], 2, "Ayer", "esperó"],
  ["Kai siempre desayuna primero. Luego se lavó los dientes y toma su mochila.", ["desayuna", "lavó", "toma"], 1, "siempre", "lava"],
  ["Anoche se fue la luz. Papá prendió velas y mamá saca las cartas.", ["fue", "prendió", "saca"], 2, "Anoche", "sacó"],
  ["Cada verano mi familia acampa junto al lago. Mi papá pesca en la mañana y nadó en la tarde.", ["acampa", "pesca", "nadó"], 2, "Cada verano", "nada"],
  ["Hace dos días Omar encontró una tortuga. La llevó al estanque y la mira nadar.", ["encontró", "llevó", "mira"], 2, "Hace dos días", "miró"],
  ["Cada mañana la panadera abre la tienda. Vende pan y preparó café para los clientes.", ["abre", "Vende", "preparó"], 2, "Cada mañana", "prepara"],
];

const TENSE_SHIFTS: Level[] = [
  {
    ask: bi("Choose the verb that keeps the same tense.", "Elige el verbo que mantiene el mismo tiempo."),
    hints: bi(
      ["Find the time words and the first verb. When does the story happen?", "Keep every verb in the same tense unless the time really changes."],
      ["Busca las palabras de tiempo y el primer verbo. ¿Cuándo pasa la historia?", "Mantén todos los verbos en el mismo tiempo, a menos que el tiempo cambie de verdad."],
    ),
    seconds: 15,
    bank: pair(EN_STEADY.map(steadyQ("en")), ES_STEADY.map(steadyQ("es"))),
  },
  {
    ask: bi("Which verb does not match the tense of the others?", "¿Qué verbo no va en el mismo tiempo que los demás?"),
    hints: bi(
      ["Find the time words first. Is the story in the past, or does it happen again and again?", "Check each verb: does it tell about the past or the present? One of them does not match."],
      ["Busca primero las palabras de tiempo. ¿La historia pasó, o se repite?", "Revisa cada verbo: ¿está en pasado o en presente? Uno no va con los demás."],
    ),
    seconds: 25,
    bank: pair(EN_SHIFT.map(shiftQ("en")), ES_SHIFT.map(shiftQ("es"))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.correlative.conjunctions (5) — pairs that work together: either/or, neither/nor, both/and, not only/but
// also, whether/or; Spanish ni/ni, o/o, tanto/como, no solo/sino (también), never "no solo … pero".

/** [sentence, key, wrong second halves with tags, the first half of the pair] */
type Pair = [string, string, Wrong[], string];
const pairQ = (locale: Locale) => ([s, key, wrong, first]: Pair): G => [
  s,
  key,
  wrong,
  tr(locale, `The first half of the pair is "${first}". Which word always goes with it?`, `La primera parte de la pareja es "${first}". ¿Qué palabra va siempre con ella?`),
  tr(locale, `"${first}" goes with "${key}".`, `"${first}" va con "${key}".`),
  first.toLowerCase(),
];
const EN_PAIRS: Pair[] = [
  ["Neither the cat ___ the dog came inside.", "nor", [["or", "or-with-neither"], ["and", "and-with-neither"]], "Neither"],
  ["Either we walk ___ we take the bus.", "or", [["nor", "nor-with-either"], ["but", "but-with-either"]], "Either"],
  ["Both Ana ___ Leo play the drums.", "and", [["or", "or-with-both"], ["nor", "nor-with-both"]], "Both"],
  ["Not only did we win, ___ we also set a record.", "but", [["and", "and-with-not-only"], ["or", "or-with-not-only"]], "Not only"],
  ["You can have either soup ___ salad.", "or", [["nor", "nor-with-either"], ["and", "and-with-either"]], "either"],
  ["Neither my mom ___ my dad likes spicy food.", "nor", [["or", "or-with-neither"], ["and", "and-with-neither"]], "Neither"],
  ["We will play the game whether it rains ___ shines.", "or", [["nor", "nor-with-whether"], ["and", "and-with-whether"]], "whether"],
  ["Both the teacher ___ the students laughed.", "and", [["or", "or-with-both"], ["but", "but-with-both"]], "Both"],
  ["Kai is not only fast ___ also strong.", "but", [["and", "and-with-not-only"], ["or", "or-with-not-only"]], "not only"],
  ["Either Mia ___ Jada will feed the fish.", "or", [["nor", "nor-with-either"], ["and", "and-with-either"]], "Either"],
  ["The museum is open neither on Monday ___ on Tuesday.", "nor", [["or", "or-with-neither"], ["and", "and-with-neither"]], "neither"],
  ["Both apples ___ pears grow on trees.", "and", [["or", "or-with-both"], ["nor", "nor-with-both"]], "Both"],
  ["Not only the kids ___ also the parents danced.", "but", [["and", "and-with-not-only"], ["or", "or-with-not-only"]], "Not only"],
  ["I can't decide whether to read ___ draw.", "or", [["nor", "nor-with-whether"], ["and", "and-with-whether"]], "whether"],
  ["Either the red cup ___ the blue cup is fine.", "or", [["nor", "nor-with-either"], ["and", "and-with-either"]], "Either"],
  ["Neither the map ___ the phone helped us find the trail.", "nor", [["or", "or-with-neither"], ["and", "and-with-neither"]], "Neither"],
];
const ES_PAIRS: Pair[] = [
  ["Ni el gato ___ el perro entraron a la casa.", "ni", [["o", "o-with-ni"], ["y", "y-with-ni"]], "Ni"],
  ["O caminamos ___ tomamos el autobús.", "o", [["ni", "ni-with-o"], ["pero", "pero-with-o"]], "O"],
  ["Tanto Ana ___ Leo tocan la batería.", "como", [["y", "y-with-tanto"], ["que", "que-with-tanto"]], "Tanto"],
  ["No solo ganamos, ___ también rompimos el récord.", "sino que", [["pero", "pero-for-sino"], ["y", "y-with-no-solo"]], "No solo"],
  ["Puedes tomar o sopa ___ ensalada.", "o", [["ni", "ni-with-o"], ["y", "y-with-o"]], "o"],
  ["Ni mi mamá ___ mi papá comen picante.", "ni", [["o", "o-with-ni"], ["y", "y-with-ni"]], "Ni"],
  ["Tanto los maestros ___ los alumnos se rieron.", "como", [["y", "y-with-tanto"], ["que", "que-with-tanto"]], "Tanto"],
  ["Kai no solo es rápido, ___ también fuerte.", "sino", [["pero", "pero-for-sino"], ["y", "y-with-no-solo"]], "no solo"],
  ["O Mía ___ Jada les darán de comer a los peces.", "o", [["ni", "ni-with-o"], ["y", "y-with-o"]], "O"],
  ["El museo no abre ni el lunes ___ el martes.", "ni", [["o", "o-with-ni"], ["y", "y-with-ni"]], "ni"],
  ["Tanto las manzanas ___ las peras crecen en árboles.", "como", [["y", "y-with-tanto"], ["que", "que-with-tanto"]], "Tanto"],
  ["No solo bailaron los niños, ___ también los papás.", "sino", [["pero", "pero-for-sino"], ["y", "y-with-no-solo"]], "No solo"],
  ["Ya sea el vaso rojo ___ el azul, cualquiera está bien.", "o", [["ni", "ni-with-o"], ["y", "y-with-o"]], "Ya sea"],
  ["Ni el mapa ___ el teléfono nos ayudaron a encontrar el sendero.", "ni", [["o", "o-with-ni"], ["y", "y-with-ni"]], "Ni"],
  ["Sea de día ___ de noche, el faro alumbra el mar.", "o", [["ni", "ni-with-o"], ["y", "y-with-o"]], "Sea"],
  ["Tanto mi abuela ___ mi tía cocinan muy rico.", "como", [["y", "y-with-tanto"], ["que", "que-with-tanto"]], "Tanto"],
];

const CORRELATIVES: Level[] = [
  {
    ask: bi("Which word completes the pair?", "¿Qué palabra completa la pareja?"),
    hints: bi(
      ["Some conjunctions come in pairs. Find the first half of the pair.", "either goes with or, neither with nor, both with and, not only with but also, and whether with or."],
      ["Algunas conjunciones van en pareja. Busca la primera parte.", "ni va con ni, o con o, tanto con como, y no solo con sino o sino que. Después de no solo nunca va pero."],
    ),
    seconds: 15,
    bank: pair(EN_PAIRS.map(pairQ("en")), ES_PAIRS.map(pairQ("es"))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.intro.commas (5) — level 1: the comma after an opening word, phrase, or clause; level 2: commas for
// the name of the person spoken to, yes and no, and a question tag. A missing comma is offered as the
// error only after an opening clause in English or a connector (however, sin embargo); after a short phrase
// (in the morning, por la mañana) style guides allow leaving it out, so those items test where the comma
// goes and the comma that must never split the subject from its verb.

/** [opener, the rest of the sentence, whether a missing comma is wrong for this opener: a clause or a connector, not a short phrase] */
type Opener = [string, string, boolean?];
const openerQ = (locale: Locale) => ([open, rest, needs]: Opener): G => {
  const [r1, ...rr] = rest.split(" ");
  const [o1, ...oo] = open.split(" ");
  const wrong: Wrong[] = [];
  if (needs) wrong.push([`${open} ${rest}`, "missing-intro-comma"]);
  if (oo.length) wrong.push([`${o1}, ${oo.join(" ")} ${rest}`, "comma-inside-opener"]);
  wrong.push([`${open} ${r1}, ${rr.join(" ")}`, "comma-splits-main-sentence"]);
  return [
    "",
    `${open}, ${rest}`,
    wrong,
    tr(locale, `The opener is "${open}." The main sentence starts after it.`, `La parte que abre la oración es "${open}". La oración principal empieza después.`),
    tr(locale, "Put the comma right after the opening word, phrase, or clause, never inside the main sentence.", "La coma va justo después de la parte que abre la oración, nunca dentro de la oración principal."),
    open,
  ];
};
const EN_OPENERS: Opener[] = [
  ["When the bell rang", "we lined up for lunch.", true], ["After the long hike", "the scouts rested by the stream."], ["However", "the game was canceled.", true],
  ["Because it was raining", "the picnic moved inside.", true], ["In the morning", "Grandpa walks his dog."], ["If you finish early", "you may read a book.", true],
  ["When the timer beeps", "take the cookies out of the oven.", true], ["Although the test was hard", "Mia did well.", true], ["During the storm", "the lights flickered."],
  ["After we finished dinner", "we played a board game.", true], ["While Dad cooked dinner", "Omar set the table.", true], ["Before the concert started", "the band tuned their instruments.", true],
  ["As the sun went down", "the sky turned orange.", true], ["Since the store was closed", "we went to the park instead.", true],
];
const ES_OPENERS: Opener[] = [
  ["Cuando sonó la campana", "los niños hicieron fila."], ["Después de la larga caminata", "los exploradores descansaron junto al arroyo."], ["Sin embargo", "el partido se canceló.", true],
  ["Como estaba lloviendo", "el pícnic se hizo adentro."], ["Por la mañana", "el abuelo pasea a su perro."], ["Si terminas temprano", "puedes leer un libro."],
  ["Por último", "mezcla la harina con el azúcar.", true], ["Aunque el examen era difícil", "Mía sacó buena nota."], ["Durante la tormenta", "las luces parpadearon."],
  ["Por lo tanto", "nos quedamos en casa.", true], ["Mientras papá cocinaba", "Omar puso la mesa."], ["Antes de que empezara el concierto", "la banda afinó los instrumentos."],
  ["Cuando se puso el sol", "el cielo se volvió naranja."], ["Como la tienda estaba cerrada", "fuimos al parque."],
];

/** A name spoken to, a yes or no, or a question tag, and where it sits. */
type Aside =
  | { at: "first"; word: string; rest: string; yes?: boolean }
  | { at: "end"; before: string; word: string; end: string }
  | { at: "mid"; before: string; word: string; after: string }
  | { at: "tag"; statement: string; tag: string };
const asideQ = (locale: Locale) => (a: Aside): G => {
  const split = (s: string) => {
    const [w, ...ws] = s.split(" ");
    return [w, ws.join(" ")];
  };
  let key: string, wrong: Wrong[], part: string;
  if (a.at === "first") {
    const [r1, rr] = split(a.rest);
    key = `${a.word}, ${a.rest}`;
    wrong = [[`${a.word} ${a.rest}`, a.yes ? "missing-comma-after-yes-no" : "missing-address-comma"], [`${a.word} ${r1}, ${rr}`, "comma-in-wrong-place"]];
    part = a.word;
  } else if (a.at === "end") {
    const [b1, br] = split(a.before);
    key = `${a.before}, ${a.word}${a.end}`;
    wrong = [[`${a.before} ${a.word}${a.end}`, "missing-address-comma"], [`${b1}, ${br} ${a.word}${a.end}`, "comma-in-wrong-place"]];
    part = a.word;
  } else if (a.at === "mid") {
    key = `${a.before}, ${a.word}, ${a.after}`;
    wrong = [[`${a.before} ${a.word} ${a.after}`, "missing-address-comma"], [`${a.before}, ${a.word} ${a.after}`, "missing-second-comma"]];
    part = a.word;
  } else {
    const [s1, sr] = split(a.statement);
    const tag = locale === "en" ? `${a.tag}?` : `¿${a.tag}?`;
    key = `${a.statement}, ${tag}`;
    wrong = [[`${a.statement} ${tag}`, "missing-comma-before-tag"], [`${s1}, ${sr} ${tag}`, "comma-in-wrong-place"]];
    part = tag;
  }
  return [
    "",
    key,
    wrong,
    tr(locale, `The part to set off is "${part}".`, `La parte que hay que separar es "${part}".`),
    tr(
      locale,
      "Use commas to set off the name of the person you are talking to, yes or no at the start, and a short question tag at the end.",
      "Se separa con coma el nombre de la persona a quien le hablas, el sí o el no al principio, y la pregunta corta del final.",
    ),
    part,
  ];
};
const EN_ASIDES: Aside[] = [
  { at: "first", word: "Leo", rest: "please pass the salt." }, { at: "end", before: "Is that you", word: "Maya", end: "?" },
  { at: "first", word: "Yes", rest: "I finished my homework.", yes: true }, { at: "tag", statement: "You like tacos", tag: "don't you" },
  { at: "mid", before: "Thank you", word: "Grandma", after: "for the gift." }, { at: "first", word: "Class", rest: "please open your books." },
  { at: "first", word: "No", rest: "the store is closed today.", yes: true }, { at: "tag", statement: "The bus is late", tag: "isn't it" },
  { at: "end", before: "Can you help me", word: "Dad", end: "?" }, { at: "first", word: "Yes", rest: "we can go to the park.", yes: true },
  { at: "mid", before: "I think", word: "Ana", after: "that you are right." }, { at: "tag", statement: "We can go swimming", tag: "can't we" },
  { at: "first", word: "Omar", rest: "your turn is next." }, { at: "end", before: "Where are you going", word: "Kenji", end: "?" },
];
const ES_ASIDES: Aside[] = [
  { at: "first", word: "Leo", rest: "pásame la sal." }, { at: "end", before: "¿Eres tú", word: "Maya", end: "?" },
  { at: "first", word: "Sí", rest: "ya terminé la tarea.", yes: true }, { at: "tag", statement: "Te gustan los tacos", tag: "verdad" },
  { at: "mid", before: "Gracias", word: "abuela", after: "por el regalo." }, { at: "first", word: "Niños", rest: "abran sus libros." },
  { at: "first", word: "No", rest: "la tienda está cerrada hoy.", yes: true }, { at: "tag", statement: "El autobús viene tarde", tag: "no" },
  { at: "end", before: "¿Me ayudas", word: "papá", end: "?" }, { at: "first", word: "Sí", rest: "podemos ir al parque.", yes: true },
  { at: "mid", before: "Creo", word: "Ana", after: "que tienes razón." }, { at: "tag", statement: "Podemos ir a nadar", tag: "verdad" },
  { at: "first", word: "Omar", rest: "ahora te toca a ti." }, { at: "end", before: "¿A dónde vas", word: "Kenji", end: "?" },
];

const INTRO_COMMAS: Level[] = [
  {
    ask: bi("Which sentence uses the comma correctly?", "¿Qué oración usa bien la coma?"),
    hints: bi(
      ["Find the word, phrase, or clause that opens the sentence, before the main part.", "Put a comma after the opener. Never put the comma between the subject and its verb."],
      ["Busca la palabra o frase que abre la oración, antes de la parte principal.", "La coma va al final de esa parte. Nunca se pone coma entre el sujeto y su verbo."],
    ),
    seconds: 20,
    bank: pair(EN_OPENERS.map(openerQ("en")), ES_OPENERS.map(openerQ("es"))),
  },
  {
    ask: bi("Which sentence uses commas correctly?", "¿Qué oración usa bien las comas?"),
    hints: bi(
      ["Is someone being spoken to by name? Does the sentence start with yes or no, or end with a short question?", "Set off the name, the yes or no, or the question tag with a comma. A name in the middle needs a comma on each side."],
      ["¿Se le habla a alguien por su nombre? ¿Empieza con sí o no, o termina con una pregunta corta?", "Separa con coma el nombre, el sí o el no, o la pregunta corta. Si el nombre va en medio, lleva coma antes y después."],
    ),
    seconds: 20,
    bank: pair(EN_ASIDES.map(asideQ("en")), ES_ASIDES.map(asideQ("es"))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.titles.of.works (5) — level 1: does this title go in quotation marks or in italics (underlined by
// hand)? Long, whole works take italics; short works and parts take quotation marks. Spanish follows
// the RAE and Fundéu: cursiva for books, films, magazines, newspapers, series, albums and plays; comillas
// for poems, stories, songs, articles, chapters and episodes. Level 2: which of two titles takes quotes.

/** "a poem", "an article"; Spanish "un poema", "una canción". */
const aKind = (locale: Locale, kind: string) =>
  locale === "en" ? `${/^[aeiou]/.test(kind) ? "an" : "a"} ${kind}` : `${/^(canción|revista|serie|película)$/.test(kind) ? "una" : "un"} ${kind}`;
const WORK_LABELS = bi(["Quotation marks", "Italics or underline"], ["Comillas", "Cursiva"]);
/** [the work, as it is introduced ("A poem called"), its title, 0 = quotation marks, 1 = italics] */
type Work = [string, string, string, number];
const workQ = (locale: Locale) => ([kind, intro, title, mark]: Work): L => [
  `${intro} ${title}`,
  mark,
  mark
    ? tr(locale, `${cap(aKind("en", kind))} stands on its own as one whole work.`, `${cap(intro.split(" ").slice(0, -1).join(" "))} es una obra completa por sí sola.`)
    : tr(locale, `${cap(aKind("en", kind))} is usually one piece inside something bigger.`, `${cap(intro.split(" ").slice(0, -1).join(" "))} suele ser una pieza dentro de algo más grande.`),
  mark
    ? tr(locale, `${cap(aKind("en", kind))} is a long, whole work, so its title goes in italics, or is underlined by hand.`, `${cap(intro.split(" ").slice(0, -1).join(" "))} es una obra completa, así que su título va en cursiva.`)
    : tr(locale, `${cap(aKind("en", kind))} is a short work or part of a bigger one, so its title goes in quotation marks.`, `${cap(intro.split(" ").slice(0, -1).join(" "))} es una obra corta o parte de otra más grande, así que su título va entre comillas.`),
  kind,
];
const EN_WORKS: Work[] = [
  ["book", "A book called", "The Lost Lighthouse", 1], ["poem", "A poem called", "Night Lights", 0], ["song", "A song called", "Sunny Day Parade", 0],
  ["movie", "A movie called", "Ocean Friends", 1], ["magazine", "A magazine called", "Young Explorers", 1], ["article", "A magazine article called", "How Bees Make Honey", 0],
  ["chapter", "A chapter called", "The Secret Door", 0], ["newspaper", "A newspaper called", "The Riverside Times", 1], ["short story", "A short story called", "The Brave Little Kite", 0],
  ["TV series", "A TV series called", "Space Kids", 1], ["album", "A music album called", "Songs for the Road", 1], ["episode", "A TV episode called", "The Missing Map", 0],
  ["play", "A play called", "The Wizard of the Woods", 1], ["poem", "A poem called", "Autumn Leaves", 0], ["book", "A book called", "Max Saves the Day", 1],
  ["article", "A newspaper article called", "Ten Facts About Owls", 0],
];
const ES_WORKS: Work[] = [
  ["libro", "Un libro llamado", "El faro perdido", 1], ["poema", "Un poema llamado", "Luces de noche", 0], ["canción", "Una canción llamada", "Desfile de sol", 0],
  ["película", "Una película llamada", "Amigos del océano", 1], ["revista", "Una revista llamada", "Jóvenes Exploradores", 1], ["artículo", "Un artículo de revista llamado", "Cómo hacen miel las abejas", 0],
  ["capítulo", "Un capítulo llamado", "La puerta secreta", 0], ["periódico", "Un periódico llamado", "La Gaceta del Río", 1], ["cuento", "Un cuento llamado", "La cometa valiente", 0],
  ["serie", "Una serie de televisión llamada", "Niños del espacio", 1], ["disco", "Un disco de música llamado", "Canciones para el camino", 1], ["episodio", "Un episodio llamado", "El mapa perdido", 0],
  ["obra de teatro", "Una obra de teatro llamada", "El mago del bosque", 1], ["poema", "Un poema llamado", "Hojas de otoño", 0], ["libro", "Un libro llamado", "Max salva el día", 1],
  ["artículo", "Un artículo de periódico llamado", "Diez datos sobre los búhos", 0],
];

/** [sentence, the short work's title, the long work's title, short kind|long kind] */
type TwoWorks = [string, string, string, string];
const twoWorksQ = (locale: Locale) => ([s, short, long, kinds]: TwoWorks): G => {
  const [sk, lk] = kinds.split("|");
  return [
    `“${s}”`,
    short,
    [[long, "long-work-in-quotes"], [tr(locale, "Both titles", "Los dos títulos"), "both-in-quotes"]],
    tr(locale, `One title names ${aKind(locale, sk)} and the other names ${aKind(locale, lk)}. Which one is the short piece?`, `Un título es de ${aKind(locale, sk)} y el otro de ${aKind(locale, lk)}. ¿Cuál es la pieza corta?`),
    tr(locale, `${short} is the ${sk}, a short piece, so it goes in quotation marks. ${long} is the ${lk}, so it goes in italics.`, `${short} es ${aKind(locale, sk)}, una pieza corta: va entre comillas. ${long} es ${aKind(locale, lk)}: va en cursiva.`),
    kinds,
  ];
};
const EN_TWO: TwoWorks[] = [
  ["Mia read the article Saving Sea Turtles in the magazine Ocean Kids.", "Saving Sea Turtles", "Ocean Kids", "article|magazine"],
  ["Our class sang Morning Bells, a song from the album Happy Tunes.", "Morning Bells", "Happy Tunes", "song|album"],
  ["Leo's favorite chapter of the book The Big Storm is Thunder Night.", "Thunder Night", "The Big Storm", "chapter|book"],
  ["The poem Winter Window is in the book Poems for Every Season.", "Winter Window", "Poems for Every Season", "poem|book"],
  ["Last night's episode of the TV series Planet Pals was called The Lost Moon.", "The Lost Moon", "Planet Pals", "episode|TV series"],
  ["Grandpa read the story The Clever Fox from the book Old Tales.", "The Clever Fox", "Old Tales", "story|book"],
  ["The newspaper City Times printed an article called New Park Opens.", "New Park Opens", "City Times", "article|newspaper"],
  ["Jada's favorite song on the album Summer Sounds is Beach Day.", "Beach Day", "Summer Sounds", "song|album"],
  ["In the magazine Science Now, I read the article How Volcanoes Work.", "How Volcanoes Work", "Science Now", "article|magazine"],
  ["The first chapter of the book Dragon School is called The Egg.", "The Egg", "Dragon School", "chapter|book"],
  ["We watched the movie River Run and learned its song Paddle On.", "Paddle On", "River Run", "song|movie"],
  ["The book Night Animals has a chapter called Owls at Work.", "Owls at Work", "Night Animals", "chapter|book"],
  ["Ana read the short story The Paper Crane in the magazine Story Time.", "The Paper Crane", "Story Time", "story|magazine"],
  ["The TV series Kitchen Kids had an episode named Pancake Party.", "Pancake Party", "Kitchen Kids", "episode|TV series"],
];
const ES_TWO: TwoWorks[] = [
  ["Mía leyó el artículo Salvemos a las tortugas en la revista Niños del Mar.", "Salvemos a las tortugas", "Niños del Mar", "artículo|revista"],
  ["Cantamos Campanas de la mañana, una canción del disco Melodías felices.", "Campanas de la mañana", "Melodías felices", "canción|disco"],
  ["El capítulo favorito de Leo en el libro La gran tormenta es Noche de truenos.", "Noche de truenos", "La gran tormenta", "capítulo|libro"],
  ["El poema Ventana de invierno está en el libro Poemas para cada estación.", "Ventana de invierno", "Poemas para cada estación", "poema|libro"],
  ["El episodio de anoche de la serie Amigos del planeta se llamaba La luna perdida.", "La luna perdida", "Amigos del planeta", "episodio|serie"],
  ["El abuelo leyó el cuento El zorro astuto del libro Cuentos de antes.", "El zorro astuto", "Cuentos de antes", "cuento|libro"],
  ["El periódico Diario de la Ciudad publicó un artículo llamado Abre el parque nuevo.", "Abre el parque nuevo", "Diario de la Ciudad", "artículo|periódico"],
  ["La canción favorita de Jada del disco Sonidos de verano es Día de playa.", "Día de playa", "Sonidos de verano", "canción|disco"],
  ["En la revista Ciencia Hoy leí el artículo Cómo funcionan los volcanes.", "Cómo funcionan los volcanes", "Ciencia Hoy", "artículo|revista"],
  ["El primer capítulo del libro Escuela de dragones se llama El huevo.", "El huevo", "Escuela de dragones", "capítulo|libro"],
  ["Vimos la película Río abajo y aprendimos su canción Rema.", "Rema", "Río abajo", "canción|película"],
  ["El libro Animales nocturnos tiene un capítulo llamado Búhos en acción.", "Búhos en acción", "Animales nocturnos", "capítulo|libro"],
  ["Ana leyó el cuento La grulla de papel en la revista Hora del Cuento.", "La grulla de papel", "Hora del Cuento", "cuento|revista"],
  ["La serie Niños en la cocina tuvo un episodio llamado Fiesta de panqueques.", "Fiesta de panqueques", "Niños en la cocina", "episodio|serie"],
];

const TITLES_OF_WORKS: Level[] = [
  {
    ask: bi("How should this title be written?", "¿Cómo se escribe este título?"),
    hints: bi(
      ["Is the work long and whole, or short and often part of something bigger?", "Books, movies, magazines, newspapers, TV series, albums, and plays: italics (underline by hand). Poems, songs, short stories, articles, chapters, and episodes: quotation marks."],
      ["¿Es una obra larga y completa, o una pieza corta que suele ser parte de algo más grande?", "Libros, películas, revistas, periódicos, series, discos y obras de teatro: cursiva. Poemas, canciones, cuentos, artículos, capítulos y episodios: comillas."],
    ),
    seconds: 12,
    labels: WORK_LABELS,
    tags: ["quotation-marks", "italics"],
    bank: pair(EN_WORKS.map(workQ("en")), ES_WORKS.map(workQ("es"))),
  },
  {
    ask: bi("Which title goes in quotation marks?", "¿Qué título va entre comillas?"),
    hints: bi(
      ["Find the two titles and what kind of work each one is.", "The short piece, or the part of a bigger work, goes in quotation marks. The whole, long work goes in italics."],
      ["Busca los dos títulos y qué tipo de obra es cada uno.", "La pieza corta, o la parte de una obra mayor, va entre comillas. La obra completa va en cursiva."],
    ),
    seconds: 25,
    bank: pair(EN_TWO.map(twoWorksQ("en")), ES_TWO.map(twoWorksQ("es"))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.greek.latin.affixes (5) — level 1: number and place prefixes (bi-, tri-, semi-, multi-, sub-, inter-,
// trans-, anti-, auto-, post-, mono-); level 2: suffixes (-able/-ible, -logy, -ist, -tion, -ous; Spanish
// -ble, -logía, -ista, -ción, -oso). Wrong meanings belong to other affixes.

/** [word, affix, meaning, wrong meanings with the affix they belong to] */
type Affix = [string, string, string, [string, string][]];
const affixQ = (locale: Locale, suffix: boolean) => ([word, affix, means, wrong]: Affix): G => [
  `“${word}”`,
  means,
  wrong.map(([m, other]): Wrong => [m, `meaning-of-${other.normalize("NFD").replace(/\p{Diacritic}/gu, "")}`]),
  suffix
    ? tr(locale, `The suffix in ${word} is -${affix}.`, `El sufijo de ${word} es -${affix}.`)
    : tr(locale, `The prefix in ${word} is ${affix}-.`, `El prefijo de ${word} es ${affix}-.`),
  suffix
    ? tr(locale, `With the suffix -${affix}, ${word} means "${means}."`, `Con el sufijo -${affix}, ${word} quiere decir "${means}".`)
    : tr(locale, `The prefix ${affix}- means "${means}."`, `El prefijo ${affix}- significa "${means}".`),
  affix,
];
const EN_PREFIX: Affix[] = [
  ["bicycle", "bi", "two", [["three", "tri"], ["half", "semi"]]],
  ["triangle", "tri", "three", [["two", "bi"], ["many", "multi"]]],
  ["semicircle", "semi", "half", [["under", "sub"], ["many", "multi"]]],
  ["multicolored", "multi", "many", [["one", "mono"], ["half", "semi"]]],
  ["submarine", "sub", "under", [["across", "trans"], ["against", "anti"]]],
  ["international", "inter", "between", [["under", "sub"], ["after", "post"]]],
  ["transatlantic", "trans", "across", [["between", "inter"], ["self", "auto"]]],
  ["antifreeze", "anti", "against", [["after", "post"], ["two", "bi"]]],
  ["autobiography", "auto", "self", [["many", "multi"], ["across", "trans"]]],
  ["postgame", "post", "after", [["against", "anti"], ["three", "tri"]]],
  ["monorail", "mono", "one", [["many", "multi"], ["between", "inter"]]],
  ["subway", "sub", "under", [["self", "auto"], ["half", "semi"]]],
  ["tricycle", "tri", "three", [["one", "mono"], ["two", "bi"]]],
  ["interstate", "inter", "between", [["under", "sub"], ["one", "mono"]]],
  ["semifinal", "semi", "half", [["after", "post"], ["against", "anti"]]],
  ["postscript", "post", "after", [["between", "inter"], ["self", "auto"]]],
];
const ES_PREFIX: Affix[] = [
  ["bicicleta", "bi", "dos", [["tres", "tri"], ["medio", "semi"]]],
  ["triángulo", "tri", "tres", [["dos", "bi"], ["muchos", "multi"]]],
  ["semicírculo", "semi", "medio", [["debajo", "sub"], ["muchos", "multi"]]],
  ["multicolor", "multi", "muchos", [["uno", "mono"], ["medio", "semi"]]],
  ["submarino", "sub", "debajo", [["al otro lado", "trans"], ["contra", "anti"]]],
  ["internacional", "inter", "entre", [["debajo", "sub"], ["después", "pos"]]],
  ["transatlántico", "trans", "al otro lado", [["entre", "inter"], ["uno mismo", "auto"]]],
  ["anticongelante", "anti", "contra", [["después", "pos"], ["dos", "bi"]]],
  ["autobiografía", "auto", "uno mismo", [["muchos", "multi"], ["al otro lado", "trans"]]],
  ["posponer", "pos", "después", [["contra", "anti"], ["tres", "tri"]]],
  ["monorriel", "mono", "uno", [["muchos", "multi"], ["entre", "inter"]]],
  ["subterráneo", "sub", "debajo", [["uno mismo", "auto"], ["medio", "semi"]]],
  ["triciclo", "tri", "tres", [["uno", "mono"], ["dos", "bi"]]],
  ["intercambiar", "inter", "entre", [["debajo", "sub"], ["uno", "mono"]]],
  ["semifinal", "semi", "medio", [["después", "pos"], ["contra", "anti"]]],
  ["posdata", "pos", "después", [["entre", "inter"], ["uno mismo", "auto"]]],
];
const EN_SUFFIX: Affix[] = [
  ["readable", "able", "can be read", [["a person who reads", "ist"], ["the study of reading", "logy"]]],
  ["zoology", "logy", "the study of animals", [["a person who keeps animals", "ist"], ["full of animals", "ous"]]],
  ["artist", "ist", "a person who makes art", [["full of art", "ous"], ["the study of art", "logy"]]],
  ["celebration", "tion", "the act of celebrating", [["a person who celebrates", "ist"], ["can be celebrated", "able"]]],
  ["dangerous", "ous", "full of danger", [["the study of danger", "logy"], ["a person who causes danger", "ist"]]],
  ["flexible", "ible", "can be bent", [["the act of bending", "tion"], ["a person who bends things", "ist"]]],
  ["geology", "logy", "the study of the earth and its rocks", [["full of rocks", "ous"], ["can be dug", "able"]]],
  ["pianist", "ist", "a person who plays the piano", [["the study of pianos", "logy"], ["can be played", "able"]]],
  ["invention", "tion", "something that was invented", [["a person who invents", "ist"], ["can be invented", "able"]]],
  ["mountainous", "ous", "full of mountains", [["the study of mountains", "logy"], ["a person who climbs mountains", "ist"]]],
  ["washable", "able", "can be washed", [["the act of washing", "tion"], ["a person who washes", "ist"]]],
  ["cyclist", "ist", "a person who rides a bicycle", [["can be ridden", "able"], ["the study of bicycles", "logy"]]],
  ["pollution", "tion", "the result of polluting", [["a person who pollutes", "ist"], ["full of dirt", "ous"]]],
  ["visible", "ible", "can be seen", [["the act of seeing", "tion"], ["a person who sees", "ist"]]],
];
const ES_SUFFIX: Affix[] = [
  ["lavable", "ble", "se puede lavar", [["persona que lava", "ista"], ["estudio del lavado", "logía"]]],
  ["zoología", "logía", "estudio de los animales", [["persona que cuida animales", "ista"], ["lleno de animales", "oso"]]],
  ["artista", "ista", "persona que hace arte", [["lleno de arte", "oso"], ["estudio del arte", "logía"]]],
  ["celebración", "ción", "acción de celebrar", [["persona que celebra", "ista"], ["se puede celebrar", "ble"]]],
  ["peligroso", "oso", "lleno de peligro", [["estudio del peligro", "logía"], ["persona que causa peligro", "ista"]]],
  ["flexible", "ble", "se puede doblar", [["acción de doblar", "ción"], ["persona que dobla cosas", "ista"]]],
  ["geología", "logía", "estudio de la tierra y sus rocas", [["lleno de rocas", "oso"], ["se puede excavar", "ble"]]],
  ["pianista", "ista", "persona que toca el piano", [["estudio de los pianos", "logía"], ["se puede tocar", "ble"]]],
  ["invención", "ción", "acción y resultado de inventar", [["persona que inventa", "ista"], ["se puede inventar", "ble"]]],
  ["montañoso", "oso", "lleno de montañas", [["estudio de las montañas", "logía"], ["persona que escala montañas", "ista"]]],
  ["comestible", "ble", "se puede comer", [["acción de comer", "ción"], ["persona que come", "ista"]]],
  ["ciclista", "ista", "persona que anda en bicicleta", [["se puede andar", "ble"], ["estudio de las bicicletas", "logía"]]],
  ["contaminación", "ción", "acción y resultado de contaminar", [["persona que contamina", "ista"], ["lleno de suciedad", "oso"]]],
  ["visible", "ble", "se puede ver", [["acción de ver", "ción"], ["persona que ve", "ista"]]],
];

const AFFIXES: Level[] = [
  {
    ask: bi("What does the prefix of this word mean?", "¿Qué significa el prefijo de esta palabra?"),
    hints: bi(
      ["A prefix comes at the start of a word. Many come from Greek or Latin.", "Think of other words with the same prefix: bicycle and binoculars both have bi-."],
      ["El prefijo va al principio de la palabra. Muchos vienen del griego o del latín.", "Piensa en otras palabras con el mismo prefijo: bicicleta y bilingüe tienen bi-."],
    ),
    seconds: 15,
    bank: pair(EN_PREFIX.map(affixQ("en", false)), ES_PREFIX.map(affixQ("es", false))),
  },
  {
    ask: bi("What does this word mean?", "¿Qué quiere decir esta palabra?"),
    hints: bi(
      ["Find the base word and the suffix at the end.", "-able and -ible mean can be. -logy means the study of. -ist means a person who. -tion means the act or result of. -ous means full of."],
      ["Busca la palabra base y el sufijo del final.", "-ble: que se puede. -logía: estudio de. -ista: persona que. -ción: acción o resultado de. -oso: lleno de."],
    ),
    seconds: 15,
    bank: pair(EN_SUFFIX.map(affixQ("en", true)), ES_SUFFIX.map(affixQ("es", true))),
  },
];

// ---------------------------------------------------------------------------------------------------
// e.analogies (5) — level 1: analogies (hot is to cold as up is to …) across opposites, synonyms, parts,
// young animals, tools, homes, workplaces, groups and sounds; level 2: homographs, one spelling with two
// meanings (bark, bank; banco, vela), read from the sentence.

const RELATION: Bi<Record<string, string>> = {
  en: {
    antonym: "they are opposites", synonym: "they mean almost the same thing", part: "the first is a part of the second", young: "the first is a baby animal and the second is the grown-up",
    tool: "the first is a tool and the second is what you do with it", home: "the second is the first animal's home", work: "the second is where the first works",
    group: "the first belongs to the group named by the second", sound: "the second is the sound the first makes",
  },
  es: {
    antonym: "son opuestas", synonym: "significan casi lo mismo", part: "la primera es parte de la segunda", young: "la primera es la cría y la segunda es el animal adulto",
    tool: "la primera es una herramienta y la segunda es lo que se hace con ella", home: "la segunda es la casa del animal", work: "la segunda es donde trabaja la primera",
    group: "la primera pertenece al grupo que nombra la segunda", sound: "la segunda es el sonido que hace la primera",
  },
};
/** [a, b, c, key, wrong words with tags, relation] */
type Analogy = [string, string, string, string, Wrong[], string];
const analogyQ = (locale: Locale) => ([a, b, c, key, wrong, rel]: Analogy): G => [
  tr(locale, `${cap(a)} is to ${b} as ${c} is to ___.`, `${cap(a)} es a ${b} como ${c} es a ___.`),
  key,
  wrong,
  tr(locale, `How are "${a}" and "${b}" related? Make a sentence: ${lang(locale, RELATION)[rel]}.`, `¿Cómo se relacionan "${a}" y "${b}"? Di una oración: ${lang(locale, RELATION)[rel]}.`),
  tr(locale, `"${c}" and "${key}" are related the same way: ${lang(locale, RELATION)[rel]}.`, `"${c}" y "${key}" se relacionan igual: ${lang(locale, RELATION)[rel]}.`),
  rel,
];
const EN_ANALOGIES: Analogy[] = [
  ["hot", "cold", "up", "down", [["high", "synonym-not-antonym"], ["sky", "related-word-wrong-relation"]], "antonym"],
  ["big", "large", "small", "tiny", [["huge", "antonym-not-synonym"], ["ant", "related-word-wrong-relation"]], "synonym"],
  ["finger", "hand", "toe", "foot", [["nail", "part-not-whole"], ["shoe", "related-word-wrong-relation"]], "part"],
  ["puppy", "dog", "kitten", "cat", [["mouse", "related-word-wrong-relation"], ["yarn", "related-word-wrong-relation"]], "young"],
  ["pen", "write", "scissors", "cut", [["paper", "related-word-wrong-relation"], ["sharp", "describes-not-use"]], "tool"],
  ["bird", "nest", "bee", "hive", [["honey", "related-word-wrong-relation"], ["flower", "related-word-wrong-relation"]], "home"],
  ["happy", "sad", "full", "empty", [["stuffed", "synonym-not-antonym"], ["plate", "related-word-wrong-relation"]], "antonym"],
  ["page", "book", "petal", "flower", [["stem", "part-not-whole"], ["garden", "related-word-wrong-relation"]], "part"],
  ["calf", "cow", "chick", "hen", [["egg", "related-word-wrong-relation"], ["duckling", "young-not-adult"]], "young"],
  ["doctor", "hospital", "teacher", "school", [["student", "related-word-wrong-relation"], ["lesson", "related-word-wrong-relation"]], "work"],
  ["apple", "fruit", "carrot", "vegetable", [["orange", "related-word-wrong-relation"], ["rabbit", "related-word-wrong-relation"]], "group"],
  ["quick", "fast", "quiet", "silent", [["loud", "antonym-not-synonym"], ["library", "related-word-wrong-relation"]], "synonym"],
  ["broom", "sweep", "shovel", "dig", [["dirt", "related-word-wrong-relation"], ["garden", "related-word-wrong-relation"]], "tool"],
  ["wheel", "car", "wing", "airplane", [["feather", "related-word-wrong-relation"], ["fly", "action-not-whole"]], "part"],
  ["day", "night", "winter", "summer", [["snow", "related-word-wrong-relation"], ["cold", "related-word-wrong-relation"]], "antonym"],
  ["cow", "moo", "dog", "bark", [["bone", "related-word-wrong-relation"], ["puppy", "related-word-wrong-relation"]], "sound"],
];
const ES_ANALOGIES: Analogy[] = [
  ["caliente", "frío", "arriba", "abajo", [["alto", "synonym-not-antonym"], ["cielo", "related-word-wrong-relation"]], "antonym"],
  ["grande", "enorme", "pequeño", "diminuto", [["gigante", "antonym-not-synonym"], ["hormiga", "related-word-wrong-relation"]], "synonym"],
  ["página", "libro", "pétalo", "flor", [["tallo", "part-not-whole"], ["jardín", "related-word-wrong-relation"]], "part"],
  ["cachorro", "perro", "gatito", "gato", [["ratón", "related-word-wrong-relation"], ["estambre", "related-word-wrong-relation"]], "young"],
  ["lápiz", "escribir", "tijeras", "cortar", [["papel", "related-word-wrong-relation"], ["filosas", "describes-not-use"]], "tool"],
  ["pájaro", "nido", "abeja", "colmena", [["miel", "related-word-wrong-relation"], ["flor", "related-word-wrong-relation"]], "home"],
  ["feliz", "triste", "lleno", "vacío", [["repleto", "synonym-not-antonym"], ["plato", "related-word-wrong-relation"]], "antonym"],
  ["hoja", "árbol", "pluma", "pájaro", [["nido", "related-word-wrong-relation"], ["volar", "action-not-whole"]], "part"],
  ["becerro", "vaca", "pollito", "gallina", [["huevo", "related-word-wrong-relation"], ["patito", "young-not-adult"]], "young"],
  ["médico", "hospital", "maestro", "escuela", [["alumno", "related-word-wrong-relation"], ["lección", "related-word-wrong-relation"]], "work"],
  ["manzana", "fruta", "zanahoria", "verdura", [["naranja", "related-word-wrong-relation"], ["conejo", "related-word-wrong-relation"]], "group"],
  ["rápido", "veloz", "callado", "silencioso", [["ruidoso", "antonym-not-synonym"], ["biblioteca", "related-word-wrong-relation"]], "synonym"],
  ["escoba", "barrer", "pala", "cavar", [["tierra", "related-word-wrong-relation"], ["jardín", "related-word-wrong-relation"]], "tool"],
  ["rueda", "carro", "ala", "avión", [["pluma", "related-word-wrong-relation"], ["volar", "action-not-whole"]], "part"],
  ["día", "noche", "invierno", "verano", [["nieve", "related-word-wrong-relation"], ["frío", "related-word-wrong-relation"]], "antonym"],
  ["vaca", "mugir", "perro", "ladrar", [["hueso", "related-word-wrong-relation"], ["cachorro", "related-word-wrong-relation"]], "sound"],
];

const lowFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** [sentence, the word, the meaning here, its other meaning, an unrelated meaning] */
type Homograph = [string, string, string, string, string];
const homographQ = (locale: Locale) => ([s, word, means, other, unrelated]: Homograph): G => [
  `“${s}”\n\n${tr(locale, "Word", "Palabra")}: ${word}`,
  means,
  [[other, "other-meaning-of-word"], [unrelated, "unrelated-meaning"]],
  tr(locale, `"${word}" can mean more than one thing. Which meaning makes sense with the other words here?`, `"${word}" puede significar más de una cosa. ¿Qué significado tiene sentido con las demás palabras?`),
  tr(locale, `Here "${word}" means ${lowFirst(means)}. In another sentence it could mean ${lowFirst(other)}.`, `Aquí "${word}" quiere decir ${lowFirst(means)}. En otra oración podría ser ${lowFirst(other)}.`),
  word,
];
const EN_HOMOGRAPHS: Homograph[] = [
  ["The dog's bark woke the baby.", "bark", "The sound a dog makes", "The outer layer of a tree", "A kind of fruit"],
  ["We had a picnic on the bank of the river.", "bank", "The land along the side of a river", "A place that keeps money", "A kind of bird"],
  ["A bat flew out of the dark cave.", "bat", "A flying animal", "A club used to hit a ball", "A kind of hat"],
  ["The box was light enough for Kai to lift.", "light", "Not heavy", "Brightness that lets you see", "Very old"],
  ["Our soccer match starts at noon.", "match", "A game", "A small stick that makes a flame", "A kind of shoe"],
  ["Dad will park the car near the store.", "park", "Leave a car in a spot", "A green place to play", "Wash and dry"],
  ["Grandma's ring has a blue stone in it.", "ring", "Jewelry worn on a finger", "The sound a bell makes", "A kind of plant"],
  ["Mom will rock the baby to sleep.", "rock", "Move gently back and forth", "A stone", "Sing loudly"],
  ["The spring in the old chair squeaked.", "spring", "A coil of metal that bounces back", "The season after winter", "A small pond"],
  ["The elephant lifted the log with its trunk.", "trunk", "An elephant's long nose", "A large box for storing things", "A kind of road"],
  ["The pitcher threw the ball very fast.", "pitcher", "The player who throws the ball", "A jug for pouring drinks", "A painter"],
  ["Leo used a saw to cut the board.", "saw", "A tool with a toothed blade for cutting", "Looked at something, in the past", "A kind of nail"],
  ["The waves crashed on the beach.", "waves", "Moving ridges of water", "Hand movements that say hello", "Strong winds"],
  ["It is only fair that everyone gets a turn.", "fair", "Equal and right for everyone", "A fun event with rides and games", "Very fast"],
];
const ES_HOMOGRAPHS: Homograph[] = [
  ["El banco del parque estaba mojado.", "banco", "Un asiento largo", "Un lugar donde se guarda dinero", "Un tipo de árbol"],
  ["La vela se apagó con el viento.", "vela", "Una barra de cera que da luz", "La tela que mueve un barco", "Un pastel"],
  ["El gato duerme en el sillón.", "gato", "Un animal que maúlla", "Una herramienta para levantar un carro", "Un tipo de zapato"],
  ["Me comí una lima muy jugosa.", "lima", "Una fruta verde", "Una herramienta para limar las uñas", "Un tipo de flor"],
  ["La planta de mi cuarto necesita agua.", "planta", "Un ser vivo con hojas", "Un piso de un edificio", "Una mesa"],
  ["La llama comía pasto en la montaña.", "llama", "Un animal de los Andes", "El fuego que sale de una vela", "Una canción"],
  ["El perro movía la cola muy contento.", "cola", "La parte de atrás del cuerpo de un animal", "Una fila de personas que esperan", "Un juguete"],
  ["Mi abuela me mandó una carta.", "carta", "Un mensaje escrito", "Una tarjeta de un juego de naipes", "Un mapa"],
  ["La sierra cortó la madera.", "sierra", "Una herramienta para cortar", "Una cadena de montañas", "Un río"],
  ["Me río cuando veo esa película.", "río", "Una forma del verbo reír", "Una corriente de agua", "Una forma del verbo correr"],
  ["Mi hermana nada muy rápido.", "nada", "Una forma del verbo nadar", "Ninguna cosa", "Una forma del verbo caminar"],
  ["Se me mojó una bota en el charco.", "bota", "Un zapato que también cubre parte de la pierna", "Una forma del verbo botar, como cuando la pelota bota", "Un sombrero"],
  ["Sobre la mesa hay una copa de agua.", "copa", "Un vaso con pie", "La parte de arriba de un árbol", "Una cuchara"],
  ["Cierra la llave del agua.", "llave", "La pieza que abre o cierra el paso del agua", "Lo que abre una cerradura", "Un vaso"],
];

const ANALOGIES: Level[] = [
  {
    ask: bi("Which word completes the analogy?", "¿Qué palabra completa la analogía?"),
    hints: bi(
      ["Look at the first pair of words. How are they related?", "Say the relationship in a sentence, then use the same sentence for the second pair."],
      ["Mira el primer par de palabras. ¿Cómo se relacionan?", "Di la relación en una oración y usa la misma oración con el segundo par."],
    ),
    seconds: 20,
    bank: pair(EN_ANALOGIES.map(analogyQ("en")), ES_ANALOGIES.map(analogyQ("es"))),
  },
  {
    ask: bi("What does the word mean in this sentence?", "¿Qué quiere decir la palabra en esta oración?"),
    hints: bi(
      ["Some words are spelled the same but have different meanings.", "Read the whole sentence. Try each meaning in place of the word and keep the one that makes sense."],
      ["Algunas palabras se escriben igual pero significan cosas distintas.", "Lee toda la oración. Prueba cada significado en lugar de la palabra y quédate con el que tiene sentido."],
    ),
    seconds: 20,
    bank: pair(EN_HOMOGRAPHS.map(homographQ("en")), ES_HOMOGRAPHS.map(homographQ("es"))),
  },
];

// ---------------------------------------------------------------------------------------------------

/** Every hand-written level, by skill id (dictionary order is computed and has none). Exported for the tests. */
export const GRAMMAR_3_5_LEVELS: Record<string, Level[]> = {
  "e.abstract.nouns": ABSTRACT,
  "e.irregular.plurals": IRREGULAR_PLURALS,
  "e.possessives": POSSESSIVES,
  "e.verb.tenses": VERB_TENSES,
  "e.comparatives": COMPARATIVES,
  "e.conjunctions": CONJUNCTIONS,
  "e.suffixes": SUFFIXES,
  "e.titles.letters": TITLES_LETTERS,
  "e.relative.words": RELATIVE_WORDS,
  "e.progressive.tenses": PROGRESSIVE,
  "e.modal.verbs": MODALS,
  "e.adjective.order": ADJECTIVE_ORDER,
  "e.prepositional.phrases": PREPOSITIONS,
  "e.fragments.runons": FRAGMENTS,
  "e.dialogue.punctuation": DIALOGUE,
  "e.greek.latin.roots": ROOTS,
  "e.idioms.proverbs": IDIOMS,
  "e.conj.prep.interj": CONJ_PREP_INTERJ,
  "e.perfect.tenses": PERFECT_TENSES,
  "e.tense.shifts": TENSE_SHIFTS,
  "e.correlative.conjunctions": CORRELATIVES,
  "e.intro.commas": INTRO_COMMAS,
  "e.titles.of.works": TITLES_OF_WORKS,
  "e.greek.latin.affixes": AFFIXES,
  "e.analogies": ANALOGIES,
};

type Meta = Pick<Skill, "id" | "grade" | "title" | "standard" | "prereqs">;
const drafted = (meta: Meta): Skill => {
  const levels = GRAMMAR_3_5_LEVELS[meta.id];
  return { ...meta, subject: "english", content: "draft", levels: levels.length, generate: fromLevels(levels) };
};
const t = (en: string, es: string) => ({ en, es });

export const ENGLISH_GRAMMAR_3_5: Skill[] = [
  drafted({ id: "e.abstract.nouns", grade: "3", title: t("Abstract nouns", "Sustantivos abstractos"), standard: "L.3.1c", prereqs: ["e.nouns.verbs"] }),
  drafted({ id: "e.irregular.plurals", grade: "3", title: t("Tricky plurals", "Plurales especiales"), standard: "L.3.1b", prereqs: ["e.plurals"] }),
  drafted({ id: "e.possessives", grade: "3", title: t("Possessives", "Posesivos"), standard: "L.3.2d", prereqs: ["e.irregular.plurals"] }),
  drafted({ id: "e.verb.tenses", grade: "3", title: t("Past, present, and future", "Pasado, presente y futuro"), standard: "L.3.1e", prereqs: ["e.past.tense"] }),
  drafted({ id: "e.comparatives", grade: "3", title: t("Comparatives and superlatives", "Comparativos y superlativos"), standard: "L.3.1g", prereqs: ["e.adjectives"] }),
  drafted({ id: "e.conjunctions", grade: "3", title: t("Conjunctions", "Conjunciones"), standard: "L.3.1h", prereqs: ["e.nouns.verbs"] }),
  drafted({ id: "e.suffixes", grade: "3", title: t("Suffixes", "Sufijos"), standard: "L.3.4b", prereqs: ["e.prefixes"] }),
  {
    id: "e.dictionary.order",
    subject: "english",
    grade: "3",
    title: t("Dictionary order", "Orden alfabético"),
    standard: "L.3.2g",
    prereqs: ["e.sight.words"],
    content: "computed",
    levels: 2,
    generate: dictionaryOrder,
  },
  drafted({ id: "e.titles.letters", grade: "3", title: t("Titles and addresses", "Títulos, lugares y cartas"), standard: "L.3.2", prereqs: ["e.capitals"] }),
  drafted({ id: "e.relative.words", grade: "4", title: t("Relative pronouns and adverbs", "Pronombres y adverbios relativos"), standard: "L.4.1a", prereqs: ["e.conjunctions"] }),
  drafted({ id: "e.progressive.tenses", grade: "4", title: t("Progressive verb tenses", "Estar con gerundio"), standard: "L.4.1b", prereqs: ["e.verb.tenses"] }),
  drafted({ id: "e.modal.verbs", grade: "4", title: t("Helping verbs can, may, must", "Poder, deber y tener que"), standard: "L.4.1c", prereqs: ["e.verb.tenses"] }),
  drafted({ id: "e.adjective.order", grade: "4", title: t("Order of adjectives", "Lugar y forma del adjetivo"), standard: "L.4.1d", prereqs: ["e.comparatives"] }),
  drafted({ id: "e.prepositional.phrases", grade: "4", title: t("Prepositional phrases", "Preposiciones"), standard: "L.4.1e", prereqs: ["e.nouns.verbs"] }),
  drafted({ id: "e.fragments.runons", grade: "4", title: t("Fragments and run-ons", "Oraciones completas"), standard: "L.4.1f", prereqs: ["e.conjunctions"] }),
  drafted({ id: "e.dialogue.punctuation", grade: "4", title: t("Punctuating dialogue", "La raya en el diálogo"), standard: "L.4.2b", prereqs: ["e.commas"] }),
  drafted({ id: "e.greek.latin.roots", grade: "4", title: t("Greek and Latin roots", "Raíces griegas y latinas"), standard: "L.4.4b", prereqs: ["e.suffixes"] }),
  drafted({ id: "e.idioms.proverbs", grade: "4", title: t("Idioms and proverbs", "Modismos y refranes"), standard: "L.4.5b", prereqs: ["e.figurative"] }),
  drafted({ id: "e.conj.prep.interj", grade: "5", title: t("Conjunctions, prepositions, interjections", "Conjunciones, preposiciones e interjecciones"), standard: "L.5.1a", prereqs: ["e.prepositional.phrases", "e.conjunctions"] }),
  drafted({ id: "e.perfect.tenses", grade: "5", title: t("Perfect verb tenses", "Tiempos compuestos"), standard: "L.5.1b", prereqs: ["e.progressive.tenses"] }),
  drafted({ id: "e.tense.shifts", grade: "5", title: t("Keeping tenses steady", "Tiempos verbales coherentes"), standard: "L.5.1d", prereqs: ["e.verb.tenses"] }),
  drafted({ id: "e.correlative.conjunctions", grade: "5", title: t("Correlative conjunctions", "Conjunciones correlativas"), standard: "L.5.1e", prereqs: ["e.conj.prep.interj"] }),
  drafted({ id: "e.intro.commas", grade: "5", title: t("Commas for openers and names", "Comas de inicio y vocativos"), standard: "L.5.2", prereqs: ["e.commas"] }),
  drafted({ id: "e.titles.of.works", grade: "5", title: t("Titles of works", "Títulos de obras"), standard: "L.5.2d", prereqs: ["e.titles.letters"] }),
  drafted({ id: "e.greek.latin.affixes", grade: "5", title: t("Greek and Latin affixes", "Prefijos y sufijos griegos y latinos"), standard: "L.5.4b", prereqs: ["e.greek.latin.roots"] }),
  drafted({ id: "e.analogies", grade: "5", title: t("Analogies and homographs", "Analogías y homógrafos"), standard: "L.5.5c", prereqs: ["e.synonyms"] }),
];
