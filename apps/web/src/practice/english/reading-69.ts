import type { Locale } from "@/lib/types";
import type { Rng } from "../rng";
import { tr } from "../text";
import type { Choice, ItemBody, Skill } from "../types";
import { type Ask, PASSAGES, type Passage, type Question, type Structure, type Tag } from "./passages-69";

// Grades 6–9 reading comprehension: central idea and summary, inference from evidence, word choice
// (figurative and connotative meaning, tone), text structure, theme, the author's point of view,
// comparing two texts, and judging an argument. Every item is one question about one original passage
// (english/passages-69.ts), shown in full above the question. Hand-written, so content is "draft".
// A seed picks the passage and question before anything else, so it lands on the same question in
// English and Spanish. Level 1 uses the grades 6–7 passages, level 2 the grades 8–9 passages.

type Bi<T> = { en: T; es: T };
const lang = <T>(locale: Locale, b: Bi<T>): T => (locale === "es" ? b.es : b.en);
/** Quotes a phrase; dialogue already inside it drops to single marks, so the marks never double up. */
const q = (s: string) => `“${s.replace(/“/g, "‘").replace(/”/g, "’")}”`;

export type Focus = "central" | "infer" | "words" | "structure" | "theme" | "pov" | "argument" | "compare";
export const focusOf = (ask: Ask) => ask.slice(0, ask.indexOf(".")) as Focus;

export const STRUCTURES: Structure[] = ["chronological", "compare-contrast", "cause-effect", "problem-solution"];
export const STRUCTURE_LABELS: Bi<string[]> = {
  en: ["Chronological order", "Compare and contrast", "Cause and effect", "Problem and solution"],
  es: ["Orden cronológico", "Comparación y contraste", "Causa y efecto", "Problema y solución"],
};

/** What each misconception means, said to the learner when a hint rules a choice out. */
export const TAG_TEXT: Record<Tag, Bi<string>> = {
  "not-in-text": { en: "The passage never says or suggests this.", es: "El texto nunca dice ni sugiere esto." },
  "contradicts-text": { en: "It points the wrong way; the passage shows the opposite.", es: "Va en la dirección equivocada; el texto muestra lo contrario." },
  "too-narrow": { en: "It is true, but it covers only one detail, not the whole.", es: "Es cierto, pero solo cubre un detalle, no el conjunto." },
  "too-broad": { en: "It is too general; the passage is about something more specific.", es: "Es demasiado general; el texto trata de algo más específico." },
  "adds-opinion": { en: "It adds a judgment, and an objective summary leaves opinions out.", es: "Agrega una opinión, y un resumen objetivo no incluye opiniones." },
  "misses-key-point": { en: "It lists small details and leaves out what matters most.", es: "Menciona detalles menores y deja fuera lo más importante." },
  overgeneralizes: { en: "It turns one case into a rule about always or everyone.", es: "Convierte un solo caso en una regla sobre siempre o todos." },
  "wrong-character": { en: "That is about a different character, not the one the question asks about.", es: "Eso trata de otro personaje, no del que menciona la pregunta." },
  "off-point-evidence": { en: "It is about the same topic, but it does not prove this point.", es: "Trata del mismo tema, pero no prueba esta idea." },
  "too-literal": { en: "It reads the words literally; here they carry a figurative meaning.", es: "Lee las palabras al pie de la letra; aquí tienen un sentido figurado." },
  "ignores-connotation": { en: "It misses the feeling the words carry; they are not neutral here.", es: "No capta el sentimiento que llevan las palabras; aquí no son neutras." },
  "opposite-tone": { en: "The words create nearly the opposite attitude.", es: "Las palabras crean casi la actitud contraria." },
  "topic-not-tone": { en: "That describes the subject, not the writer's attitude toward it.", es: "Eso describe el tema, no la actitud de quien escribe hacia él." },
  "wrong-context-meaning": { en: "The words can mean that elsewhere, but not in this sentence.", es: "Las palabras pueden significar eso en otro lugar, pero no en esta oración." },
  "misread-as-chronological": { en: "Time words appear, but the passage is not mainly a sequence of events.", es: "Aparecen palabras de tiempo, pero el texto no es principalmente una secuencia de hechos." },
  "misread-as-compare-contrast": { en: "Two things are mentioned, but the passage does not mainly compare them.", es: "Se mencionan dos cosas, pero el texto no se dedica a compararlas." },
  "misread-as-cause-effect": { en: "Causes appear, but the passage is organized around something else.", es: "Aparecen causas, pero el texto se organiza alrededor de otra cosa." },
  "misread-as-problem-solution": { en: "A difficulty appears, but the passage does not mainly present ways to fix it.", es: "Aparece una dificultad, pero el texto no se dedica a presentar maneras de resolverla." },
  "wrong-section-role": { en: "That is the job of a different part of the passage.", es: "Esa es la función de otra parte del texto." },
  "topic-not-theme": { en: "It names a topic. A theme is a full message about life.", es: "Solo nombra el asunto. El mensaje es una idea completa sobre la vida." },
  "plot-not-theme": { en: "It retells what happens instead of stating the message.", es: "Cuenta lo que pasa en lugar de decir el mensaje." },
  "misses-the-change": { en: "That detail comes from before the change, so it does not show it.", es: "Ese detalle es de antes del cambio, así que no lo muestra." },
  "confuses-speaker-author": { en: "That is a view the author describes or answers, not the author's own.", es: "Es una postura que el autor describe o responde, no la suya." },
  "misses-author-stance": { en: "It misses where the author actually stands.", es: "No capta la postura real del autor." },
  "overstates-view": { en: "It makes the view more extreme than what the author says.", es: "Exagera la postura; el autor no llega a decir eso." },
  "wrong-purpose": { en: "That is not what this part is trying to do.", es: "Ese no es el propósito de esta parte." },
  "evidence-not-claim": { en: "That sentence is evidence that backs up the point, not the point itself.", es: "Esa oración es evidencia que respalda la idea, no la idea misma." },
  "counterclaim-not-claim": { en: "That sentence gives the other side's view, not the author's claim.", es: "Esa oración presenta la postura contraria, no la afirmación del autor." },
  "anecdote-as-proof": { en: "One person's story is not enough to prove a general claim.", es: "La historia de una sola persona no basta para probar una afirmación general." },
  "opinion-as-evidence": { en: "It is an opinion, so it cannot serve as proof.", es: "Es una opinión, así que no sirve como prueba." },
  "misjudges-relevance": { en: "That evidence does connect to the claim.", es: "Esa evidencia sí tiene relación con la afirmación." },
  "not-a-flaw": { en: "That is not a weakness; the argument handles it.", es: "Eso no es una debilidad; el argumento lo resuelve." },
  "swaps-texts": { en: "It switches what the two texts say.", es: "Intercambia lo que dice cada texto." },
  "one-text-only": { en: "Only one of the texts says this.", es: "Solo uno de los textos dice esto." },
  "same-not-different": { en: "The texts do not agree on this point.", es: "Los textos no coinciden en este punto." },
};

/** The first two hints for each kind of question: a nudge toward the key idea, then the strategy. */
const HINTS: Record<Ask | "structure.overall", Bi<[string, string]>> = {
  "central.idea": {
    en: ["What point does the whole passage keep returning to, from start to finish?", "Rule out choices that cover only one detail or go beyond the passage. The central idea is supported by most of the paragraphs."],
    es: ["¿A qué idea vuelve todo el texto, de principio a fin?", "Descarta las opciones que cubren un solo detalle o van más allá del texto. La idea central está apoyada por la mayoría de los párrafos."],
  },
  "central.summary": {
    en: ["A summary tells the most important events or ideas in a few sentences, without opinions.", "Rule out any choice that adds a judgment, gets a fact wrong, or lists small details and skips the main point."],
    es: ["Un resumen cuenta los hechos o las ideas más importantes en pocas oraciones, sin opiniones.", "Descarta las opciones que agregan un juicio, cambian un hecho o mencionan detalles menores y se saltan lo principal."],
  },
  "infer.what": {
    en: ["The answer is not stated directly. What do the clues add up to?", "Find the lines about this moment, then pick the choice those lines support best. A good inference has proof in the text."],
    es: ["La respuesta no está dicha directamente. ¿A qué conclusión llevan las pistas?", "Busca las líneas sobre ese momento y elige la opción que mejor apoyan. Una buena inferencia tiene pruebas en el texto."],
  },
  "infer.support": {
    en: ["Which sentence would you point to if someone asked, “How do you know?”", "Test each choice: does it show the idea itself, or only mention the same topic?"],
    es: ["¿Qué oración señalarías si alguien te preguntara: “¿Cómo lo sabes?”?", "Pon a prueba cada opción: ¿muestra la idea misma, o solo menciona el mismo tema?"],
  },
  "words.figurative": {
    en: ["Read the whole sentence around the phrase. Is it meant literally?", "Picture what the phrase describes, then ask what it tells you about the person, place, or idea in this passage."],
    es: ["Lee toda la oración alrededor de la frase. ¿Se dice al pie de la letra?", "Imagina lo que describe la frase y pregúntate qué te dice sobre la persona, el lugar o la idea de este texto."],
  },
  "words.connotation": {
    en: ["Words with similar dictionary meanings can carry different feelings.", "Ask whether the word feels positive, negative, or neutral here, and why the writer chose it over a plainer word."],
    es: ["Palabras con significados parecidos en el diccionario pueden llevar sentimientos distintos.", "Pregúntate si la palabra se siente positiva, negativa o neutra aquí, y por qué quien escribe la eligió en lugar de una más sencilla."],
  },
  "words.tone": {
    en: ["Tone is the writer's attitude toward the subject. Which words carry feeling?", "Find two or three strong words or phrases, decide what attitude they share, and match it to a choice."],
    es: ["El tono es la actitud de quien escribe hacia el tema. ¿Qué palabras llevan sentimiento?", "Busca dos o tres palabras o frases fuertes, decide qué actitud comparten y relaciónala con una opción."],
  },
  "structure.overall": {
    en: ["Think about how the whole passage is put together, not just one paragraph.", "Look for signal words: dates and “then” for time order, “both” and “unlike” for comparisons, “because” and “as a result” for causes, “fix” and “answer” for solutions."],
    es: ["Piensa en cómo está armado todo el texto, no solo un párrafo.", "Busca palabras clave: fechas y “luego” para el orden en el tiempo, “ambos” y “a diferencia de” para comparar, “porque” y “como resultado” para las causas, “resolver” y “respuesta” para las soluciones."],
  },
  "structure.section": {
    en: ["What would the passage lose if this part were cut?", "Look at what comes right before and after this part. Decide whether it introduces, explains, gives an example, shows a change, or concludes."],
    es: ["¿Qué perdería el texto si se quitara esta parte?", "Fíjate en lo que viene justo antes y después. Decide si esta parte introduce, explica, da un ejemplo, muestra un cambio o concluye."],
  },
  "theme.statement": {
    en: ["What does the main character or speaker learn or come to understand?", "A theme is a message about life that the whole text supports, ending included. Test each choice against the ending: does the main character's change back it up, or only one scene, or someone else's view?"],
    es: ["¿Qué aprende o llega a comprender el personaje principal o la voz poética?", "El mensaje es una idea sobre la vida que todo el texto apoya, también el final. Compara cada opción con el final: ¿la respalda el cambio del personaje principal, o solo una escena, o lo que piensa otra persona?"],
  },
  "theme.develop": {
    en: ["Themes grow through what characters do, say, and feel, especially when they change.", "Find the moment that most clearly carries the message, and rule out details from before the change or about someone else."],
    es: ["El mensaje se desarrolla con lo que los personajes hacen, dicen y sienten, sobre todo cuando cambian.", "Busca el momento que más claramente lleva el mensaje y descarta detalles de antes del cambio o sobre otra persona."],
  },
  "pov.view": {
    en: ["Where does the author stand on the subject?", "Look at the claims the author makes and the words with strong feeling. Rule out views the author only describes in order to answer them."],
    es: ["¿Qué postura tiene el autor sobre el tema?", "Fíjate en lo que afirma el autor y en las palabras con mucha carga. Descarta las posturas que el autor solo describe para responderlas."],
  },
  "pov.purpose": {
    en: ["Why did the author write this part?", "Decide whether the part informs, persuades, explains, or answers another view, and check that the choice fits what it actually says."],
    es: ["¿Para qué escribió el autor esta parte?", "Decide si esta parte informa, convence, explica o responde a otra postura, y revisa que la opción coincida con lo que de verdad dice."],
  },
  "pov.response": {
    en: ["Does the author mention people who disagree?", "Find where the author brings up the other side, then see what the author does with it: accepts part of it, rejects it, or answers it with evidence."],
    es: ["¿El autor menciona a quienes no están de acuerdo?", "Busca dónde el autor presenta la otra postura y fíjate qué hace con ella: acepta una parte, la rechaza o la responde con evidencia."],
  },
  "pov.reveal": {
    en: ["Which words show the author's attitude, not just facts?", "Rule out sentences that only report information, and any that state a view the author does not hold."],
    es: ["¿Qué palabras muestran la actitud del autor, y no solo datos?", "Descarta las oraciones que solo informan y las que expresan una postura que el autor no tiene."],
  },
  "argument.claim": {
    en: ["The claim is the main point the author wants you to accept.", "Rule out sentences that give facts or examples, and the sentence that states the other side."],
    es: ["La afirmación es la idea principal que el autor quiere que aceptes.", "Descarta las oraciones que dan datos o ejemplos, y la que presenta la postura contraria."],
  },
  "argument.evidence": {
    en: ["Good evidence is relevant to the claim and strong enough to support it.", "For each choice, ask: is it a fact or an opinion? Is it about this claim? Is it one story, or something wider?"],
    es: ["La buena evidencia tiene relación con la afirmación y es lo bastante fuerte para apoyarla.", "Para cada opción, pregúntate: ¿es un dato o una opinión? ¿Trata de esta afirmación? ¿Es una sola historia o algo más amplio?"],
  },
  "argument.reasoning": {
    en: ["Does the conclusion really follow from the evidence?", "Look for leaps: one example treated as proof, a cause assumed from timing, or evidence about something else."],
    es: ["¿La conclusión de verdad se desprende de la evidencia?", "Busca saltos: un solo ejemplo tomado como prueba, una causa supuesta solo porque algo pasó después, o evidencia sobre otra cosa."],
  },
  "compare.differ": {
    en: ["Find what each text says about the same point.", "Note a few words for Text 1 and for Text 2, then pick the choice that matches both and does not mix them up."],
    es: ["Busca lo que dice cada texto sobre el mismo punto.", "Anota unas palabras para el texto 1 y para el texto 2, y luego elige la opción que coincide con ambos sin confundirlos."],
  },
  "compare.agree": {
    en: ["Is there anything both writers would accept?", "Check that the choice appears in both texts. Rule out points that only one text makes."],
    es: ["¿Hay algo que aceptarían los dos autores?", "Revisa que la opción aparezca en los dos textos. Descarta las ideas que solo plantea uno."],
  },
  "compare.approach": {
    en: ["Look at how each writer informs or persuades, not only at what they think.", "Notice what kind of support each text uses: numbers, personal stories, expert views, or descriptions."],
    es: ["Fíjate en cómo informa o convence cada autor, no solo en lo que piensa.", "Observa qué tipo de apoyo usa cada texto: números, historias personales, opiniones de expertos o descripciones."],
  },
};

/** A question in a pool: an authored one, or (no question) the passage's overall-structure question. */
export type Entry = { passage: Passage; question?: Question };

const FOCI: Focus[] = ["central", "infer", "words", "structure", "theme", "pov", "argument", "compare"];

/** Each skill's questions by level, in passage order, so a seed always lands on the same one. */
export const POOLS = Object.fromEntries(
  FOCI.map((focus) => [
    focus,
    ([1, 2] as const).map((level) =>
      PASSAGES.filter((p) => p.level === level).flatMap((passage): Entry[] => [
        ...(focus === "structure" && passage.structure ? [{ passage }] : []),
        ...passage.qs.filter((question) => focusOf(question.ask) === focus).map((question) => ({ passage, question })),
      ]),
    ),
  ]),
) as Record<Focus, Entry[][]>;

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** The passage as shown (titles, the imagined-document note, paragraphs) and as read aloud. */
export function render(passage: Passage, locale: Locale) {
  const texts = lang(locale, passage);
  const note = passage.note && lang(locale, passage.note);
  const paired = texts.length > 1;
  const blocks = [
    ...(paired && note ? [note] : []),
    ...texts.flatMap((t, i) => [paired ? `${tr(locale, "Text", "Texto")} ${i + 1}: ${t.title}` : t.title, ...(!paired && note ? [note] : []), ...t.paras]),
  ];
  return {
    shown: blocks.join("\n\n"),
    spoken: blocks.map((b) => b.replace(/\n/g, " ")).join(" "),
    words: texts.reduce((n, t) => n + t.paras.reduce((m, p) => m + words(p), 0), 0),
  };
}

/** Where a quote sits in the passage, e.g. "paragraph 3", "stanza 2", "Text 2, paragraph 1". */
export function locate(passage: Passage, quote: string, locale: Locale, article: boolean): string {
  const texts = lang(locale, passage);
  const t = texts.findIndex((x) => x.paras.some((p) => p.includes(quote)));
  const p = texts[t].paras.findIndex((x) => x.includes(quote));
  // A poem's stanzas hold line breaks, also when the poem is one of a pair.
  const unit = texts[t].paras.some((x) => x.includes("\n")) ? tr(locale, "stanza", "estrofa") : tr(locale, "paragraph", "párrafo");
  const where = texts.length > 1 ? `${tr(locale, "Text", "texto")} ${t + 1}, ${unit} ${p + 1}` : `${unit} ${p + 1}`;
  // "el texto 2, …", "el párrafo 3", but "la estrofa 3".
  if (article) return locale === "es" ? `${texts.length === 1 && unit === "estrofa" ? "la" : "el"} ${where}` : where;
  return where.charAt(0).toUpperCase() + where.slice(1);
}

const inPassage = (passage: Passage, locale: Locale, s: string) => lang(locale, passage).some((t) => t.paras.some((p) => p.includes(s)));

/** Words of five letters or more, accents and case folded: enough to tell content from "the", "que". */
const bigWords = (s: string) => new Set(s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().match(/\p{L}{5,}/gu) ?? []);
/** The share of a choice's words that a text repeats. */
function repeats(choice: string, text: string) {
  const mine = bigWords(choice);
  const there = bigWords(text);
  return mine.size ? [...mine].filter((w) => there.has(w)).length / mine.size : 0;
}

/** A quote that ends a sentence: the period goes inside the marks in English and after them in Spanish. */
function qEnd(locale: Locale, s: string) {
  const t = s.replace(/[,;:]$/, "");
  return locale === "es" ? `${q(t.replace(/\.$/, ""))}.` : q(/[.?!]”?$/.test(t) ? t : `${t}.`);
}
/** A quote in the middle of a sentence, without its own final punctuation. */
const qMid = (s: string) => q(s.replace(/[.,;:]$/, ""));

function structureItem(passage: Passage, locale: Locale, shown: string, spoken: string, seconds: number): ItemBody {
  const { kind } = passage.structure!;
  const [signals, explain] = lang(locale, passage.structure!);
  const index = STRUCTURES.indexOf(kind);
  const labels = lang(locale, STRUCTURE_LABELS);
  const ask = tr(locale, "How is the passage mainly organized?", "¿Cómo está organizado principalmente el texto?");
  const [h1, h2] = lang(locale, HINTS["structure.overall"]);
  return {
    prompt: [`${shown}\n\n${ask}`],
    say: `${spoken} ${ask}`,
    // Category answers keep one fixed order so the buttons stay put.
    choices: labels.map((label, i): Choice => (i === index ? { label } : { label, why: `misread-as-${STRUCTURES[i]}` })),
    input: "choices",
    answer: { kind: "choice", index },
    hints: [h1, h2, tr(locale, `Notice these words in the passage: ${signals.map(q).join(", ")}.`, `Fíjate en estas palabras del texto: ${signals.map(q).join(", ")}.`)],
    steps: [explain, `${tr(locale, "Answer", "Respuesta")}: ${labels[index]}`],
    seconds,
  };
}

function itemFor({ passage, question }: Entry, r: Rng, level: number, locale: Locale): ItemBody {
  const { shown, spoken, words: count } = render(passage, locale);
  // Reading the passage at about 210 words a minute, then answering.
  const seconds = Math.round(count / 3.5) + (level === 1 ? 30 : 45);
  if (!question) return structureItem(passage, locale, shown, spoken, seconds);
  const [ask, right, wrong, evidence, explain] = lang(locale, question);
  const options: Choice[] = [{ label: right }, ...wrong.map((label, i): Choice => ({ label, why: question.tags[i] }))];
  const choices = r.shuffle(options);
  const [h1, h2] = lang(locale, HINTS[question.ask]);
  const ruleOut = `${tr(locale, "Rule out", "Descarta")} ${qEnd(locale, wrong[0])} ${lang(locale, TAG_TEXT[question.tags[0]])}`;
  // When the choices are quotes from the passage, pointing at the evidence would hand over the key; so
  // it would when the key mostly restates the evidence and no wrong choice comes as close to it.
  const quoted = inPassage(passage, locale, right);
  const near = repeats(right, evidence.join(" "));
  const restated = near >= 0.4 && wrong.every((w) => repeats(w, evidence.join(" ")) < near);
  const and = tr(locale, " and ", " y ");
  const last = evidence.length - 1;
  const reread = `${tr(locale, "Reread", "Vuelve a leer")} ${evidence.map((e, i) => `${locate(passage, e, locale, true)}: ${i === last ? qEnd(locale, e) : qMid(e)}`).join(and)}`;
  const cited = evidence.map((e) => `${locate(passage, e, locale, false)}: ${qEnd(locale, e)}`).join(" ");
  return {
    prompt: [`${shown}\n\n${ask}`],
    say: `${spoken} ${ask}`,
    choices,
    input: "choices",
    answer: { kind: "choice", index: choices.indexOf(options[0]) },
    hints: [h1, h2, quoted || restated ? ruleOut : reread],
    steps: [quoted ? ruleOut : cited, explain, `${tr(locale, "Answer", "Respuesta")}: ${right}`],
    seconds,
  };
}

function reading(focus: Focus, meta: Omit<Skill, "subject" | "levels" | "content" | "generate">): Skill {
  return {
    ...meta,
    subject: "english",
    levels: 2,
    content: "draft",
    generate: (r, level, locale) => itemFor(r.pick(POOLS[focus][level - 1]), r, level, locale),
  };
}

export const ENGLISH_READING_6_9: Skill[] = [
  reading("central", {
    id: "e.central.summary",
    grade: "6",
    title: { en: "Central idea and summary", es: "Idea central y resumen" },
    standard: "RI.6.2",
    prereqs: ["e.main.idea"],
  }),
  reading("infer", {
    id: "e.inference.evidence",
    grade: "6",
    title: { en: "Inferences backed by the text", es: "Inferencias con evidencia del texto" },
    standard: "RL.6.1",
    prereqs: ["e.main.idea"],
  }),
  reading("words", {
    id: "e.word.choice",
    grade: "6",
    title: { en: "Word choice and tone", es: "Elección de palabras y tono" },
    standard: "RL.6.4",
    prereqs: ["e.figurative", "e.context.clues"],
  }),
  reading("structure", {
    id: "e.text.structure",
    grade: "7",
    title: { en: "Text structure", es: "Estructura del texto" },
    standard: "RI.7.5",
    prereqs: ["e.central.summary"],
  }),
  reading("theme", {
    id: "e.theme.development",
    grade: "7",
    title: { en: "Theme and how it develops", es: "El mensaje y cómo se desarrolla" },
    standard: "RL.7.2",
    prereqs: ["e.central.summary", "e.inference.evidence"],
  }),
  reading("pov", {
    id: "e.author.pov",
    grade: "8",
    title: { en: "Author's point of view", es: "El punto de vista del autor" },
    standard: "RI.8.6",
    prereqs: ["e.inference.evidence", "e.word.choice"],
  }),
  reading("compare", {
    id: "e.paired.texts",
    grade: "8",
    title: { en: "Compare two texts", es: "Comparar dos textos" },
    standard: "RI.8.9",
    prereqs: ["e.author.pov"],
  }),
  reading("argument", {
    id: "e.argument.evaluate",
    grade: "9",
    title: { en: "Evaluate an argument", es: "Evaluar un argumento" },
    standard: "RI.9-10.8",
    prereqs: ["e.claim.evidence", "e.fallacies"],
  }),
];
