import type { Locale } from "@/lib/types";
import type { Rng } from "../rng";
import { tr } from "../text";
import type { Choice, ItemBody, PassageBlock, ReadingText, Skill } from "../types";
import { PAIRS, PASSAGES, type Passage, type Question, type SkillKey, type Two } from "./passages-35";

// Grades 3–5 reading comprehension. Every item is one original passage (or a pair on one topic) from
// passages-35 and one question about it, so the learner reads a whole text before answering. The
// passage goes in the item's `passage`, set as reading matter above the question; the prompt is only
// the question. A
// skill's level is the text band: level 1 reads like the grade 2–3 band, level 2 like the grade 4–5
// band. The entry is picked before anything else, so a seed lands on the same passage, question and
// choice order in both languages. Hand-written, so content is "draft" until a teacher reviews it.

const lang = (locale: Locale, t: Two) => (locale === "es" ? t[1] : t[0]);

/**
 * Quotes text inside learner copy; a quote that already opens with “ is left as it is. Quotation marks
 * inside the quoted text become single ones, so “In the ‘Try it’ steps” never nests “ inside “.
 */
const q = (s: string) => (s.startsWith("“") ? s : `“${s.replace(/“/g, "‘").replace(/”/g, "’")}”`);
/** Quotes a choice in the middle of a sentence, without its final period. */
const qs = (s: string) => q(s.replace(/[.]$/, ""));

/** What each misconception tag means; the worked solution uses it to explain the most tempting wrong choice. */
export const TAGS: Record<string, Two> = {
  "not-in-text": ["is not in the text.", "no aparece en el texto."],
  "outside-knowledge": ["may be true, but this text does not say it.", "puede ser cierto, pero este texto no lo dice."],
  "wrong-detail": ["is in the text, but it does not answer this question.", "está en el texto, pero no responde esta pregunta."],
  "opposite-of-text": ["says the opposite of what the text says.", "dice lo contrario de lo que dice el texto."],
  "wrong-character": ["is about someone else in the text.", "habla de otro personaje o de otra cosa del texto."],
  "wrong-order": ["happens at a different time in the text.", "pasa en otro momento del texto."],
  "effect-not-cause": ["is a result, not the reason.", "es un resultado, no la causa."],
  "cause-not-effect": ["is the reason, not the result.", "es la causa, no el resultado."],
  "trait-not-shown": ["is not shown by what the character says or does.", "no se ve en lo que el personaje dice o hace."],
  "opposite-trait": ["is the opposite of how the character acts.", "es lo contrario de cómo actúa el personaje."],
  "wrong-motive": ["is not the reason the text gives.", "no es la razón que da el texto."],
  "plot-summary": ["tells what happens, not the lesson.", "cuenta lo que pasa, no la lección."],
  "too-narrow": ["is about one small part, not the whole text.", "trata de una parte pequeña, no de todo el texto."],
  "unsupported-lesson": ["is a lesson, but this text does not teach it.", "es una lección, pero este texto no la enseña."],
  "one-paragraph-only": ["is the idea of only one part, not of the whole text.", "es la idea de una sola parte, no de todo el texto."],
  "too-broad": ["is too general; it could be about many texts.", "es demasiado general; podría ser de muchos textos."],
  "supports-other-point": ["is a detail, but it supports a different point.", "es un detalle, pero apoya otra idea."],
  "first-third-mixup": ["mixes up first person and third person.", "confunde la primera persona con la tercera."],
  "dialogue-as-narrator": ["mixes up the characters who talk inside quotation marks with the narrator.", "confunde a los personajes que hablan entre comillas con quien narra."],
  "swapped-views": ["switches what each one thinks or wants.", "cambia lo que piensa o quiere cada quien."],
  "no-narrator-clue": ["does not show who is telling the story.", "no muestra quién cuenta la historia."],
  "wrong-section": ["goes with a different part of the text.", "corresponde a otra parte del texto."],
  "wrong-feature": ["is the job of a different text feature.", "es la función de otra parte del texto."],
  "other-meaning": ["is another meaning, but not the one used here.", "es otro significado, pero no el que se usa aquí."],
  "took-literally": ["reads the words literally; the writer means something else.", "toma las palabras al pie de la letra; quien escribe quiere decir otra cosa."],
  "opposite-meaning": ["means the opposite.", "significa lo contrario."],
  "ignored-context": ["does not fit the sentences around the words.", "no encaja con las oraciones que rodean las palabras."],
  "only-text-1": ["is only in Text 1.", "solo está en el texto 1."],
  "only-text-2": ["is only in Text 2.", "solo está en el texto 2."],
  "in-both-texts": ["is in both texts.", "está en los dos textos."],
  "mixed-up-texts": ["switches what the two texts do.", "confunde lo que hace cada texto."],
};

/** Hint 2: the strategy for the skill. */
const STRATEGY: Record<SkillKey, Two> = {
  details: ["Find the sentence that answers the question. The right choice says the same thing, often in other words.", "Busca la oración que responde la pregunta. La opción correcta dice lo mismo, muchas veces con otras palabras."],
  sequence: ["Look for time words like “first,” “then,” and “after,” and for cause words like “because” and “so.”", "Busca palabras de tiempo como “primero”, “luego” y “después”, y palabras de causa como “porque” y “por eso”."],
  character: ["What a character says, does, and thinks shows what they are like and why they act.", "Lo que un personaje dice, hace y piensa muestra cómo es y por qué actúa."],
  features: ["Each part of an article has a job: the title names the topic, headings name the sections, and boxes, lists, and glossaries add or organize facts.", "Cada parte de un artículo tiene una función: el título nombra el tema, los subtítulos nombran las secciones, y los recuadros, las listas y los glosarios agregan u ordenan datos."],
  mainidea: ["The main idea is what the whole text is mostly about. A supporting detail is a fact that explains or proves one point.", "La idea principal es de lo que trata casi todo el texto. Un detalle de apoyo es un dato que explica o prueba una idea."],
  theme: ["A theme is a lesson about life, not a summary of what happens. Ask what the characters or the speaker learn or show.", "El tema es una lección sobre la vida, no un resumen de lo que pasa. Pregúntate qué aprenden o muestran los personajes o quien habla."],
  pov: ["A first-person narrator is part of the story and says “I” and “my.” A third-person narrator is outside the story and says “he,” “she,” and “they.”", "Un narrador en primera persona es parte de la historia y dice “yo” y “mi”. Un narrador en tercera persona está fuera de la historia y usa “él”, “ella” y “ellos”."],
  words: ["Reread the sentences around the word or phrase. Try each choice in its place and keep the one that makes sense.", "Vuelve a leer las oraciones alrededor de la palabra o frase. Prueba cada opción en su lugar y quédate con la que tenga sentido."],
  compare: ["Check each choice against Text 1, then against Text 2. Keep the one that matches what the question asks.", "Compara cada opción con el texto 1 y luego con el texto 2. Quédate con la que responde a lo que pide la pregunta."],
};

/** Hint 2 for a point-of-view question about a poem: the speaker, not a story's narrator. */
const SPEAKER: Two = [
  "The speaker is the voice of a poem. Look for who says “I,” “my,” or “we,” and for clues about where that voice is and who is around it.",
  "Quien habla es la voz del poema. Busca quién dice “yo”, “mi” o “nosotros”, y pistas sobre dónde está esa voz y quién la rodea.",
];

// ---------------------------------------------------------------------------------------------------
// Where the evidence sits, for hint 2: a stanza in a poem, a paragraph in a story, a section or a box
// in an article.

const isHeading = (block: string) => !/[.?!:;”…)]$/.test(block) && block.split(/\s+/).length <= 8;
/** "Fast fact: …", "Did you know? …", "Try it:\n…" — a labeled box, unless it sits right under a heading. */
const boxLabel = (block: string) => /^(¿?\p{L}[\p{L}' ]{1,24}?)[:?…]+\s/u.exec(block)?.[1];

/** The part of a text that holds `ev`, as words that follow "look at": "stanza 2", "the section “Steps”". */
function spot(p: Passage, locale: Locale, ev: string): string {
  const blocks = locale === "es" ? p.es : p.en;
  const i = blocks.findIndex((b) => b.includes(ev));
  if (i < 0) return "";
  if (p.kind === "poem") return tr(locale, `stanza ${i + 1}`, `la estrofa ${i + 1}`);
  if (p.kind === "info") {
    const label = boxLabel(blocks[i]);
    if (label && i > 0 && !isHeading(blocks[i - 1])) return tr(locale, `the part that begins ${q(label)}`, `la parte que empieza con ${q(label)}`);
    for (let h = i; h >= 0; h--) if (isHeading(blocks[h])) return tr(locale, `the section ${q(blocks[h])}`, `la sección ${q(blocks[h])}`);
  }
  const n = blocks.slice(0, i + 1).filter((b) => !isHeading(b)).length;
  return tr(locale, `paragraph ${n}`, `el párrafo ${n}`);
}

// ---------------------------------------------------------------------------------------------------
// The pools: every question of a skill, by band. About half the stories (whoTells) also get the
// narrator question, built from the passage's point of view, so it stays a small share of its skill.

type Entry = { p: Passage; b?: Passage; q: Question } | { p: Passage; narrator: true };

const BY_ID = new Map(PASSAGES.map((p) => [p.id, p]));
const KEYS: SkillKey[] = ["details", "sequence", "character", "features", "mainidea", "theme", "pov", "words", "compare"];

/** Every entry of each skill, by level (band). Exported so the tests can check that each level is big enough. */
export const READING_POOLS = Object.fromEntries(KEYS.map((k) => [k, [[], []]])) as unknown as Record<SkillKey, [Entry[], Entry[]]>;
for (const p of PASSAGES) {
  for (const question of p.qs) READING_POOLS[question.skill][p.band - 1].push({ p, q: question });
  if (p.pov && p.whoTells) READING_POOLS.pov[p.band - 1].push({ p, narrator: true });
}
for (const pair of PAIRS) {
  const [a, b] = [BY_ID.get(pair.a)!, BY_ID.get(pair.b)!];
  for (const question of pair.qs) READING_POOLS.compare[a.band - 1].push({ p: a, b, q: question });
}

/** The narrator choices: each point of view's label and why it is right, plus a choice that is never right. */
const NARRATOR: Record<"first" | "third", [label: Two, why: Two]> = {
  first: [
    ["A character in the story, who tells it as “I”", "Un personaje de la historia, que la cuenta como “yo”"],
    ["The narrator uses “I” for their own actions outside the quotation marks, so a character is telling the story.", "El narrador habla de sí mismo en primera persona fuera de las comillas, así que un personaje cuenta la historia."],
  ],
  third: [
    ["A narrator outside the story, who tells about others", "Un narrador fuera de la historia, que cuenta lo que hacen otros"],
    ["The narrator uses names and “he” or “she,” and never says “I” outside the quotation marks, so the narrator is outside the story.", "El narrador usa nombres y “él” o “ella”, y nunca dice “yo” fuera de las comillas, así que está fuera de la historia."],
  ],
};
const TAKING_TURNS: Two = ["Two characters who take turns telling it", "Dos personajes que se turnan para contarla"];

/** A passage as the learner sees it. In an article: headings, and boxes set apart from the body (a labeled box, or a glossary or timeline of "term: meaning" lines). */
function reading(p: Passage, locale: Locale, label?: string): ReadingText {
  const bs = locale === "es" ? p.es : p.en;
  const blocks = bs.map((text, i): PassageBlock => {
    if (p.kind !== "info") return { text };
    if (isHeading(text)) return { text, kind: "heading" };
    const box = (boxLabel(text) && i > 0 && !isHeading(bs[i - 1])) || text.split("\n").every((line) => /^[^:\n]{1,40}: \S/.test(line));
    return box ? { text, kind: "box" } : { text };
  });
  return { title: lang(locale, p.title), ...(label ? { label } : {}), blocks };
}

const words = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
/** Reading time at about 130 words a minute, plus time to answer. */
const pace = (texts: ReadingText[]) => Math.round(20 + (words(texts.flatMap((t) => [t.title, ...t.blocks.map((b) => b.text)]).join(" ")) * 60) / 130);

function build(r: Rng, e: Entry, locale: Locale): ItemBody {
  if ("narrator" in e) {
    const pov = e.p.pov!;
    const ask = tr(locale, "Who is telling this story?", "¿Quién cuenta esta historia?");
    const key: Choice = { label: lang(locale, NARRATOR[pov][0]) };
    const choices = r.shuffle([
      key,
      { label: lang(locale, NARRATOR[pov === "first" ? "third" : "first"][0]), why: "first-third-mixup" },
      { label: lang(locale, TAKING_TURNS), why: "dialogue-as-narrator" },
    ]);
    const index = choices.indexOf(key);
    const passage = [reading(e.p, locale)];
    return {
      prompt: [ask],
      say: ask,
      passage,
      choices,
      input: "choices",
      answer: { kind: "choice", index },
      hints: [
        tr(locale, "Look at the words the narrator uses outside the quotation marks.", "Fíjate en las palabras que usa el narrador fuera de las comillas."),
        lang(locale, STRATEGY.pov),
        tr(locale, `Reread: ${q(lang(locale, e.p.povEv!))}`, `Vuelve a leer: ${q(lang(locale, e.p.povEv!))}`),
      ],
      steps: [
        tr(locale, `The text says: ${q(lang(locale, e.p.povEv!))}`, `El texto dice: ${q(lang(locale, e.p.povEv!))}`),
        lang(locale, NARRATOR[pov][1]),
        tr(locale, `Answer: ${key.label}`, `Respuesta: ${key.label}`),
      ],
      seconds: pace(passage),
    };
  }

  const { p, b, q: question } = e;
  const ask = lang(locale, question.q);
  const passage = b ? [reading(p, locale, tr(locale, "Text 1", "Texto 1")), reading(b, locale, tr(locale, "Text 2", "Texto 2"))] : [reading(p, locale)];
  const options: Choice[] = [
    { label: lang(locale, question.right) },
    ...question.wrong.map(([en, es, why, esWhy]) => ({ label: locale === "es" ? es : en, why: locale === "es" ? (esWhy ?? why) : why })),
  ];
  const choices = r.shuffle(options);
  const right = options[0].label;
  const ev = lang(locale, question.ev);
  const ev2 = question.ev2 ? lang(locale, question.ev2) : "";
  // Hint 2: the question's own strategy when it has one (every text-feature question does), the
  // speaker strategy for a poem, or the skill's; then where to look, except for text features, where
  // the place is often the answer. A pair names the part of each text.
  const strategy = lang(locale, question.how ?? (question.skill === "pov" && p.kind === "poem" ? SPEAKER : STRATEGY[question.skill]));
  const where =
    question.skill === "features"
      ? ""
      : b
        ? tr(locale, `In Text 1, look at ${spot(p, locale, ev)}. In Text 2, look at ${spot(b, locale, ev2)}.`, `En el texto 1, mira ${spot(p, locale, ev)}. En el texto 2, mira ${spot(b, locale, ev2)}.`)
        : tr(locale, `Look at ${spot(p, locale, ev)}.`, `Mira ${spot(p, locale, ev)}.`);
  const tempting = question.wrong[0];
  const why = locale === "es" ? (tempting[3] ?? tempting[2]) : tempting[2];
  const evidence = b
    ? [tr(locale, `Text 1 says: ${q(ev)}`, `El texto 1 dice: ${q(ev)}`), tr(locale, `Text 2 says: ${q(ev2)}`, `El texto 2 dice: ${q(ev2)}`)]
    : [tr(locale, `The text says: ${q(ev)}`, `El texto dice: ${q(ev)}`)];
  return {
    prompt: [ask],
    say: ask,
    passage,
    choices,
    input: "choices",
    answer: { kind: "choice", index: choices.indexOf(options[0]) },
    hints: [
      lang(locale, question.clue),
      `${strategy}${where ? ` ${where}` : ""}`,
      b
        ? tr(locale, `Reread these lines. Text 1: ${q(ev)} Text 2: ${q(ev2)}`, `Vuelve a leer estas líneas. Texto 1: ${q(ev)} Texto 2: ${q(ev2)}`)
        : tr(locale, `Reread: ${q(ev)}`, `Vuelve a leer: ${q(ev)}`),
    ],
    steps: [...evidence, `${qs(locale === "es" ? tempting[1] : tempting[0])} ${lang(locale, TAGS[why])}`, tr(locale, `Answer: ${right}`, `Respuesta: ${right}`)],
    seconds: pace(passage),
  };
}

const generator = (key: SkillKey) => (r: Rng, level: number, locale: Locale) => build(r, r.pick(READING_POOLS[key][level - 1]), locale);

export const ENGLISH_READING_3_5: Skill[] = [
  {
    id: "e.key.details",
    subject: "english",
    grade: "3",
    title: { en: "Key details in a text", es: "Detalles clave de un texto" },
    standard: "RL.3.1",
    prereqs: ["e.sight.words"],
    content: "draft",
    levels: 2,
    generate: generator("details"),
  },
  {
    id: "e.sequence.cause",
    subject: "english",
    grade: "3",
    title: { en: "Sequence, cause and effect", es: "Secuencia, causa y efecto" },
    standard: "RI.3.3",
    prereqs: ["e.key.details"],
    content: "draft",
    levels: 2,
    generate: generator("sequence"),
  },
  {
    id: "e.character.traits",
    subject: "english",
    grade: "3",
    title: { en: "Characters: traits and motives", es: "Personajes: cómo son y por qué actúan" },
    standard: "RL.3.3",
    prereqs: ["e.key.details", "e.adjectives"],
    content: "draft",
    levels: 2,
    generate: generator("character"),
  },
  {
    id: "e.text.features",
    subject: "english",
    grade: "3",
    title: { en: "Text features", es: "Partes de un texto informativo" },
    standard: "RI.3.5",
    prereqs: ["e.key.details"],
    content: "draft",
    levels: 2,
    generate: generator("features"),
  },
  {
    id: "e.supporting.details",
    subject: "english",
    grade: "4",
    title: { en: "Main idea and supporting details", es: "Idea principal y detalles de apoyo" },
    standard: "RI.4.2",
    prereqs: ["e.text.features"],
    content: "draft",
    levels: 2,
    generate: generator("mainidea"),
  },
  {
    id: "e.story.theme",
    subject: "english",
    grade: "4",
    title: { en: "Theme of a story or poem", es: "El tema de un cuento o poema" },
    standard: "RL.4.2",
    prereqs: ["e.character.traits"],
    content: "draft",
    levels: 2,
    generate: generator("theme"),
  },
  {
    id: "e.point.of.view",
    subject: "english",
    grade: "4",
    title: { en: "Narrator and point of view", es: "Narrador y punto de vista" },
    standard: "RL.4.6",
    prereqs: ["e.character.traits"],
    content: "draft",
    levels: 2,
    generate: generator("pov"),
  },
  {
    id: "e.passage.words",
    subject: "english",
    grade: "4",
    title: { en: "Words and phrases in a text", es: "Palabras y frases en un texto" },
    standard: "RL.4.4",
    prereqs: ["e.key.details", "e.synonyms"],
    content: "draft",
    levels: 2,
    generate: generator("words"),
  },
  {
    id: "e.compare.texts",
    subject: "english",
    grade: "5",
    title: { en: "Compare two texts on a topic", es: "Comparar dos textos sobre un tema" },
    standard: "RI.5.9",
    prereqs: ["e.supporting.details", "e.main.idea"],
    content: "draft",
    levels: 2,
    generate: generator("compare"),
  },
];
