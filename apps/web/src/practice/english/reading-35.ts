import type { Locale } from "@/lib/types";
import type { Rng } from "../rng";
import { tr } from "../text";
import type { Choice, ItemBody, Skill } from "../types";
import { PAIRS, PASSAGES, type Passage, type Question, type SkillKey, type Two } from "./passages-35";

// Grades 3–5 reading comprehension. Every item is one original passage (or a pair on one topic) from
// passages-35.ts and one question about it, so the learner reads a whole text before answering. A
// skill's level is the text band: level 1 reads like the grade 2–3 band, level 2 like the grade 4–5
// band. The entry is picked before anything else, so a seed lands on the same passage, question and
// choice order in both languages. Hand-written, so content is "draft" until a teacher reviews it.

const lang = (locale: Locale, t: Two) => (locale === "es" ? t[1] : t[0]);

/** Quotes text inside learner copy; a quote that already opens with “ is left as it is. */
const q = (s: string) => (s.startsWith("“") ? s : `“${s}”`);
/** Quotes a choice in the middle of a sentence, without its final period. */
const qs = (s: string) => q(s.replace(/[.]$/, ""));

/** Joins the parts of a prompt; the renderer keeps the line breaks, so they show as paragraphs. */
const para = (...lines: string[]) => lines.join("\n\n");

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
  sequence: ["Look for time words like first, then, and after, and for cause words like because and so.", "Busca palabras de tiempo como primero, luego y después, y palabras de causa como porque y por eso."],
  character: ["What a character says, does, and thinks shows what they are like and why they act.", "Lo que un personaje dice, hace y piensa muestra cómo es y por qué actúa."],
  features: ["Each part of an article has a job: the title names the topic, headings name the sections, and boxes, lists, and glossaries add or organize facts.", "Cada parte de un artículo tiene una función: el título nombra el tema, los subtítulos nombran las secciones, y los recuadros, las listas y los glosarios agregan u ordenan datos."],
  mainidea: ["The main idea is what the whole text is mostly about. A supporting detail is a fact that explains or proves one point.", "La idea principal es de lo que trata casi todo el texto. Un detalle de apoyo es un dato que explica o prueba una idea."],
  theme: ["A theme is a lesson about life, not a summary of what happens. Ask what the characters or the speaker learn or show.", "El tema es una lección sobre la vida, no un resumen de lo que pasa. Pregúntate qué aprenden o muestran los personajes o quien habla."],
  pov: ["A first-person narrator is part of the story and says I and my. A third-person narrator is outside the story and says he, she, and they.", "Un narrador en primera persona es parte de la historia y dice yo y mi. Un narrador en tercera persona está fuera de la historia y habla de él, ella y ellos."],
  words: ["Reread the sentences around the word or phrase. Try each choice in its place and keep the one that makes sense.", "Vuelve a leer las oraciones alrededor de la palabra o frase. Prueba cada opción en su lugar y quédate con la que tenga sentido."],
  compare: ["Check each choice against Text 1, then against Text 2. Keep the one that matches what the question asks.", "Compara cada opción con el texto 1 y luego con el texto 2. Quédate con la que responde a lo que pide la pregunta."],
};

// ---------------------------------------------------------------------------------------------------
// Where the evidence sits, for hint 2: a stanza in a poem, a paragraph in a story, a section or a box
// in an article.

const isHeading = (block: string) => !/[.?!:;”…)]$/.test(block) && block.split(/\s+/).length <= 8;
/** "Fast fact: …", "Did you know? …", "Try it:\n…" — a labeled box, unless it sits right under a heading. */
const boxLabel = (block: string) => /^(¿?\p{L}[\p{L}' ]{1,24}?)[:?…]+\s/u.exec(block)?.[1];

function locate(p: Passage, locale: Locale, ev: string): string {
  const blocks = locale === "es" ? p.es : p.en;
  const i = blocks.findIndex((b) => b.includes(ev));
  if (i < 0) return "";
  if (p.kind === "poem") return tr(locale, `It is in stanza ${i + 1}.`, `Está en la estrofa ${i + 1}.`);
  if (p.kind === "info") {
    const label = boxLabel(blocks[i]);
    if (label && i > 0 && !isHeading(blocks[i - 1])) return tr(locale, `Look at the part that begins ${q(label)}.`, `Mira la parte que empieza con ${q(label)}.`);
    for (let h = i; h >= 0; h--) if (isHeading(blocks[h])) return tr(locale, `Look in the section ${q(blocks[h])}.`, `Busca en la sección ${q(blocks[h])}.`);
  }
  const n = blocks.slice(0, i + 1).filter((b) => !isHeading(b)).length;
  return tr(locale, `It is in paragraph ${n}.`, `Está en el párrafo ${n}.`);
}

// ---------------------------------------------------------------------------------------------------
// The pools: every question of a skill, by band. Stories also get the narrator question, built from
// the passage's point of view.

type Entry = { p: Passage; b?: Passage; q: Question } | { p: Passage; narrator: true };

const BY_ID = new Map(PASSAGES.map((p) => [p.id, p]));
const KEYS: SkillKey[] = ["details", "sequence", "character", "features", "mainidea", "theme", "pov", "words", "compare"];

/** Every entry of each skill, by level (band). Exported so the tests can check that each level is big enough. */
export const READING_POOLS = Object.fromEntries(KEYS.map((k) => [k, [[], []]])) as unknown as Record<SkillKey, [Entry[], Entry[]]>;
for (const p of PASSAGES) {
  for (const question of p.qs) READING_POOLS[question.skill][p.band - 1].push({ p, q: question });
  if (p.pov) READING_POOLS.pov[p.band - 1].push({ p, narrator: true });
}
for (const pair of PAIRS) {
  const [a, b] = [BY_ID.get(pair.a)!, BY_ID.get(pair.b)!];
  for (const question of pair.qs) READING_POOLS.compare[a.band - 1].push({ p: a, b, q: question });
}

const NARRATOR: Record<"first" | "third", [label: Two, why: Two]> = {
  first: [
    ["A character in the story, who tells it as “I”", "Un personaje de la historia, que la cuenta como “yo”"],
    ["The narrator uses “I” for their own actions outside the quotation marks, so a character is telling the story.", "El narrador habla de sí mismo en primera persona fuera de las comillas, así que un personaje cuenta la historia."],
  ],
  third: [
    ["A narrator outside the story, who tells about others", "Un narrador fuera de la historia, que cuenta lo que hacen otros"],
    ["The narrator uses names and he or she, and never says “I” outside the quotation marks, so the narrator is outside the story.", "El narrador usa nombres y él o ella, y nunca dice “yo” fuera de las comillas, así que está fuera de la historia."],
  ],
};

const words = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const show = (p: Passage, locale: Locale) => [lang(locale, p.title), ...(locale === "es" ? p.es : p.en)];
/** Reading time at about 130 words a minute, plus time to answer. */
const pace = (texts: string[]) => Math.round(20 + (words(texts.join(" ")) * 60) / 130);

function build(r: Rng, e: Entry, locale: Locale): ItemBody {
  if ("narrator" in e) {
    const pov = e.p.pov!;
    const ask = tr(locale, "Who is telling this story?", "¿Quién cuenta esta historia?");
    const labels = (["first", "third"] as const).map((k): Choice => ({ label: lang(locale, NARRATOR[k][0]), ...(k === pov ? {} : { why: "first-third-mixup" }) }));
    const index = pov === "first" ? 0 : 1;
    const text = show(e.p, locale);
    return {
      prompt: [para(...text, ask)],
      say: ask,
      choices: labels,
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
        tr(locale, `Answer: ${labels[index].label}`, `Respuesta: ${labels[index].label}`),
      ],
      seconds: pace(text),
    };
  }

  const { p, b, q: question } = e;
  const ask = lang(locale, question.q);
  const text = b
    ? [tr(locale, `Text 1: ${lang(locale, p.title)}`, `Texto 1: ${lang(locale, p.title)}`), ...show(p, locale).slice(1), tr(locale, `Text 2: ${lang(locale, b.title)}`, `Texto 2: ${lang(locale, b.title)}`), ...show(b, locale).slice(1)]
    : show(p, locale);
  const options: Choice[] = [
    { label: lang(locale, question.right) },
    ...question.wrong.map(([en, es, why]) => ({ label: locale === "es" ? es : en, why })),
  ];
  const choices = r.shuffle(options);
  const right = options[0].label;
  const ev = lang(locale, question.ev);
  const ev2 = question.ev2 ? lang(locale, question.ev2) : "";
  const where = question.skill === "features" || question.skill === "compare" ? "" : locate(p, locale, ev);
  const [tempting, why] = [question.wrong[0], question.wrong[0][2]];
  const evidence = b
    ? [tr(locale, `Text 1 says: ${q(ev)}`, `El texto 1 dice: ${q(ev)}`), tr(locale, `Text 2 says: ${q(ev2)}`, `El texto 2 dice: ${q(ev2)}`)]
    : [tr(locale, `The text says: ${q(ev)}`, `El texto dice: ${q(ev)}`)];
  return {
    prompt: [para(...text, ask)],
    say: ask,
    choices,
    input: "choices",
    answer: { kind: "choice", index: choices.indexOf(options[0]) },
    hints: [
      lang(locale, question.clue),
      [lang(locale, STRATEGY[question.skill]), where].filter(Boolean).join(" "),
      b
        ? tr(locale, `Reread these lines. Text 1: ${q(ev)} Text 2: ${q(ev2)}`, `Vuelve a leer estas líneas. Texto 1: ${q(ev)} Texto 2: ${q(ev2)}`)
        : tr(locale, `Reread: ${q(ev)}`, `Vuelve a leer: ${q(ev)}`),
    ],
    steps: [...evidence, `${qs(locale === "es" ? tempting[1] : tempting[0])} ${lang(locale, TAGS[why])}`, tr(locale, `Answer: ${right}`, `Respuesta: ${right}`)],
    seconds: pace(text),
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
