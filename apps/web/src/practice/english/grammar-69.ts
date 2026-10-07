import type { Locale } from "@/lib/types";
import type { Rng } from "../rng";
import { tr } from "../text";
import type { Choice, ItemBody, MathPart, Skill } from "../types";

// Grades 6–9 grammar, usage, vocabulary and rhetoric: pronouns, punctuation for asides and pauses,
// confusable words, roots, connotation, phrases and clauses, modifiers, verbals and moods, parallel
// structure, tone, audience, counterclaims, bias, evidence and MLA citations. Every item comes from a
// hand-written bank (draft: not yet reviewed by a teacher). Each entry has an English and a Spanish
// version. The Spanish one teaches the Spanish-language skill with Spanish examples (concordancia,
// "mismo" and "consigo", especificativas and explicativas, raya, dequeísmo, modos verbales,
// subordinadas…), not a translation of an English-only rule. The entry is picked before anything else,
// so a seed lands on the same entry in both languages.
//
// Every wrong choice carries a kebab-case misconception tag (`why`), reused across its skill, so a miss
// becomes a diagnosis in the learner model.

export type Bi<T> = { en: T; es: T };
const lang = <T>(locale: Locale, b: Bi<T>): T => (locale === "es" ? b.es : b.en);

/** Quotes a word or sentence inside learner copy. */
const q = (s: string) => `“${s}”`;
/** Joins the parts of a prompt; a renderer that keeps line breaks shows them as paragraphs. */
const para = (...lines: string[]) => lines.join("\n\n");

/** A wrong choice and the misconception it shows. */
export type W = [label: string, why: string];

/**
 * One bank entry: the text shown (a sentence with ___ for a blank, a passage, or "" when the question
 * says it all), the right choice, the wrong ones with their tags, the clue (hint 3: the first step, never
 * the answer), the explanation (the first worked step), and the words the question points at ({t}).
 */
export type Entry = [shown: string, right: string, wrong: W[], clue: string, explain: string, target?: string];

export type Level = {
  bank: Bi<Entry>[];
  /** The question. {t} is replaced by the entry's target words, quoted. */
  ask: Bi<string>;
  /** Hints 1 and 2 (a nudge and the strategy); the entry's clue is hint 3. */
  hints: Bi<[string, string]>;
  seconds: number;
  /** Category answers (moods, clause types…) keep one fixed order so the buttons stay put. */
  order?: Bi<string[]>;
};

/** A sentence with ___ becomes prompt parts with an answer blank. */
function blanked(sentence: string): MathPart[] {
  const [before, after] = sentence.split("___");
  return [...(before ? [before] : []), { blank: true }, ...(after ? [after] : [])];
}
const sayBlank = (locale: Locale, sentence: string) => sentence.replace("___", tr(locale, "blank", "espacio en blanco"));
const fill = (sentence: string, word: string) => {
  const out = sentence.replace("___", word);
  return out.charAt(0).toUpperCase() + out.slice(1);
};

function build(r: Rng, locale: Locale, level: Level): ItemBody {
  const [shown, right, allWrong, clue, explain, target] = lang(locale, r.pick(level.bank));
  // Category levels with more than four names show the answer and three others.
  const wrong = allWrong.length > 3 ? r.shuffle(allWrong).slice(0, 3) : allWrong;
  const order = level.order ? lang(locale, level.order) : null;
  const labels = order ? order.filter((l) => l === right || wrong.some(([w]) => w === l)) : r.shuffle([right, ...wrong.map(([w]) => w)]);
  const choices: Choice[] = labels.map((label) => {
    const miss = wrong.find(([w]) => w === label);
    return miss ? { label, why: miss[1] } : { label };
  });
  const ask = lang(locale, level.ask).replace("{t}", target ? q(target) : "");
  const blank = shown.includes("___");
  const prompt: MathPart[] = blank ? [`${ask}\n\n`, ...blanked(shown)] : [shown ? para(shown, ask) : ask];
  const say = blank ? `${ask} ${sayBlank(locale, shown)}` : shown ? `${shown} ${ask}` : ask;
  const [nudge, strategy] = lang(locale, level.hints);
  return {
    prompt,
    say,
    choices,
    input: "choices",
    answer: { kind: "choice", index: labels.indexOf(right) },
    hints: [nudge, strategy, clue],
    steps: [explain, blank ? fill(shown, right) : tr(locale, `Answer: ${right}`, `Respuesta: ${right}`)],
    seconds: level.seconds,
  };
}

/** Every level of every skill in this strand, by skill id (index 0 = level 1), so the tests can check every entry. */
export const GRAMMAR_LEVELS: Record<string, Level[]> = {};

type Meta = Pick<Skill, "id" | "grade" | "title" | "standard" | "prereqs">;
function skill(meta: Meta, levels: Level[]): Skill {
  GRAMMAR_LEVELS[meta.id] = levels;
  return { ...meta, subject: "english", content: "draft", levels: levels.length, generate: (r, level, locale) => build(r, locale, levels[level - 1]) };
}

/** A category entry: the text, the right category, the clue, the explanation and the target words. */
type Cat<K extends string> = [shown: string, key: K, clue: string, explain: string, target?: string];

/**
 * Turns category entries into ordinary entries. Picking category k when the answer is `key` is tagged
 * "key-as-k" (e.g. "gerund-as-participle": a gerund taken for a participle).
 */
function cats<K extends string>(names: Bi<Partial<Record<K, string>>>, keys: Bi<readonly K[]>, bank: Bi<Cat<K>>[]): Pick<Level, "bank" | "order"> {
  const one = (l: Locale, [shown, key, clue, explain, target]: Cat<K>): Entry => [
    shown,
    names[l][key]!,
    keys[l].filter((k) => k !== key).map((k): W => [names[l][k]!, `${key}-as-${k}`]),
    clue,
    explain,
    target,
  ];
  return {
    bank: bank.map((b) => ({ en: one("en", b.en), es: one("es", b.es) })),
    order: { en: keys.en.map((k) => names.en[k]!), es: keys.es.map((k) => names.es[k]!) },
  };
}

const CHOOSE: Bi<string> = { en: "Choose the word that completes the sentence.", es: "Elige la palabra que completa la oración." };
const PUNCTUATED: Bi<string> = { en: "Which sentence is punctuated correctly?", es: "¿Qué oración está bien puntuada?" };

// ===================================================================================================
// Grade 6
// ===================================================================================================

// ---------------------------------------------------------------------------------------------------
// e.intensive.pronouns — level 1: the right -self form (English) or the right "mismo" and reflexive
// pronoun (Spanish: mismo agrees in gender and number; consigo and sí only point back to the subject);
// level 2: intensive or reflexive (enfático o reflexivo).

const SELF_FORMS: Bi<Entry>[] = [
  {
    en: ["My uncle built the treehouse by ___.", "himself", [["hisself", "nonstandard-form"], ["yourself", "wrong-person"]], "The pronoun points back to “my uncle,” one man.", "“Himself” matches “my uncle.” “Hisself” is not standard English."],
    es: ["Las niñas ___ armaron la tienda de campaña.", "mismas", [["mismos", "gender-mismatch"], ["misma", "number-mismatch"]], "La palabra se refiere a “las niñas”.", "“Niñas” es femenino y plural, así que va “mismas”."],
  },
  {
    en: ["The players fixed the torn net ___.", "themselves", [["theirselves", "nonstandard-form"], ["itself", "number-mismatch"]], "The pronoun points back to “the players,” more than one person.", "“Themselves” matches the plural “players.” “Theirselves” is not standard English."],
    es: ["El alcalde ___ cortó el listón de la biblioteca nueva.", "mismo", [["misma", "gender-mismatch"], ["mismos", "number-mismatch"]], "La palabra se refiere a “el alcalde”.", "“Alcalde” es masculino y singular: “el alcalde mismo”."],
  },
  {
    en: ["Kenji and ___ cleaned out the garage.", "I", [["myself", "reflexive-as-subject"], ["me", "object-as-subject"]], "Drop “Kenji and”: “___ cleaned out the garage.”", "The word is part of the subject, so use the subject form. A -self pronoun cannot be the subject by itself."],
    es: ["Marta, tú ___ me lo dijiste ayer.", "misma", [["mismo", "gender-mismatch"], ["mismas", "number-mismatch"]], "Le hablas a Marta, una sola persona.", "“Marta” es femenino y singular: “tú misma”."],
  },
  {
    en: ["Please send the photos to Ms. Ruiz or ___.", "me", [["myself", "reflexive-without-antecedent"], ["I", "subject-as-object"]], "Drop “Ms. Ruiz or”: “Please send the photos to ___.”", "A -self pronoun needs an “I” earlier in the sentence to point back to, and there is none. After “to,” use the object form."],
    es: ["Nosotros ___ vestimos rápido para la obra de teatro.", "nos", [["se", "wrong-person"], ["te", "wrong-person"]], "El verbo “vestimos” está en primera persona del plural.", "Con “nosotros” va “nos”: “nos vestimos”."],
  },
  {
    en: ["We painted the mural in the hallway ___.", "ourselves", [["ourself", "number-mismatch"], ["themselves", "wrong-person"]], "The pronoun points back to “we.”", "“We” is plural and first person, so use “ourselves.”"],
    es: ["Después del desmayo, Carlos volvió en ___.", "sí", [["él", "not-reflexive"], ["si", "missing-accent"]], "La palabra se refiere al mismo Carlos, quien hace la acción.", "Cuando se refiere al sujeto, va el reflexivo “sí”, con tilde: “volvió en sí”."],
  },
  {
    en: ["The robot vacuum turned ___ off when the battery ran low.", "itself", [["itsself", "nonstandard-form"], ["themselves", "number-mismatch"]], "The pronoun points back to “the robot vacuum,” one thing.", "One thing takes “itself,” spelled with one s."],
    es: ["Pedro habla ___ mismo cuando repasa para un examen.", "consigo", [["con él", "not-reflexive"], ["contigo", "wrong-person"]], "La palabra se refiere al mismo Pedro.", "Para decir “con él mismo” cuando se habla del sujeto, se usa “consigo”: “habla consigo mismo”."],
  },
  {
    en: ["My grandmother ___ sewed this quilt by hand.", "herself", [["her", "not-a-self-pronoun"], ["themselves", "number-mismatch"]], "The word right after “my grandmother” adds emphasis: she did it, no one else.", "A pronoun that stresses “my grandmother” is “herself.”"],
    es: ["Señora Díaz, ¿puedo hablar ___ un momento?", "con usted", [["consigo", "reflexive-without-antecedent"], ["con ella", "wrong-person"]], "Le hablas directamente a la señora Díaz, de usted.", "“Consigo” solo se usa cuando se refiere a quien hace la acción. Aquí se dice “con usted”."],
  },
  {
    en: ["The tickets are for Amara and ___.", "me", [["myself", "reflexive-without-antecedent"], ["I", "subject-as-object"]], "Drop “Amara and”: “The tickets are for ___.”", "There is no “I” earlier in the sentence for a -self pronoun to point back to. After “for,” use the object form."],
    es: ["Los abuelos ___ cocinaron la cena de Navidad.", "mismos", [["mismo", "number-mismatch"], ["mismas", "gender-mismatch"]], "La palabra se refiere a “los abuelos”.", "“Abuelos” es masculino y plural: “los abuelos mismos”."],
  },
  {
    en: ["The students ___ chose the theme for the spring dance.", "themselves", [["theirselves", "nonstandard-form"], ["himself", "number-mismatch"]], "The word stresses that “the students,” more than one person, made the choice.", "“Themselves” matches the plural “students.”"],
    es: ["Nosotras ___ pintamos el mural del pasillo.", "mismas", [["mismos", "gender-mismatch"], ["misma", "number-mismatch"]], "La palabra se refiere a “nosotras”.", "“Nosotras” es femenino y plural: “nosotras mismas”."],
  },
  {
    en: ["I taught ___ to juggle three balls.", "myself", [["me", "not-a-self-pronoun"], ["meself", "nonstandard-form"]], "The one who taught and the one who learned are the same person: “I.”", "When the doer and the receiver are the same, use the -self form: “myself.”"],
    es: ["Yo ___ lavo los dientes después de cada comida.", "me", [["se", "wrong-person"], ["te", "wrong-person"]], "El verbo “lavo” está en primera persona: yo.", "Con “yo” va “me”: “me lavo”."],
  },
  {
    en: ["Ali and Nadia introduced ___ to the new student.", "themselves", [["theirselves", "nonstandard-form"], ["ourselves", "wrong-person"]], "The pronoun points back to “Ali and Nadia.”", "Two people, third person: “themselves.”"],
    es: ["La doctora ___ nos explicó los resultados.", "misma", [["mismo", "gender-mismatch"], ["mismas", "number-mismatch"]], "La palabra se refiere a “la doctora”.", "“Doctora” es femenino y singular: “la doctora misma”."],
  },
  {
    en: ["Mr. Owens ___ handed out the science fair ribbons.", "himself", [["hisself", "nonstandard-form"], ["yourself", "wrong-person"]], "The word stresses that “Mr. Owens,” one man, did it in person.", "“Himself” matches “Mr. Owens.”"],
    es: ["Luis y Marcos ___ arreglaron la bicicleta.", "mismos", [["mismo", "number-mismatch"], ["mismas", "gender-mismatch"]], "La palabra se refiere a “Luis y Marcos”.", "Son dos personas, masculino plural: “mismos”."],
  },
  {
    en: ["He and ___ have been friends since kindergarten.", "I", [["myself", "reflexive-as-subject"], ["me", "object-as-subject"]], "Drop “He and”: “___ have been friends since kindergarten.”", "The word is part of the subject, so use the subject form."],
    es: ["Mi primo solo piensa en ___ mismo.", "sí", [["él", "not-reflexive"], ["si", "missing-accent"]], "La palabra se refiere al mismo primo, quien piensa.", "Cuando se refiere al sujeto, va el reflexivo “sí”, con tilde: “en sí mismo”."],
  },
  {
    en: ["The kids made ___ a snack after school.", "themselves", [["theirselves", "nonstandard-form"], ["themself", "number-mismatch"]], "The pronoun points back to “the kids.”", "The kids made the snack for the kids, so use “themselves.”"],
    es: ["¿Tú ___ peinaste sola esta mañana?", "te", [["se", "wrong-person"], ["me", "wrong-person"]], "El verbo “peinaste” está en segunda persona: tú.", "Con “tú” va “te”: “te peinaste”."],
  },
];

type SelfUse = "intensive" | "reflexive";
const SELF_USE = cats<SelfUse>(
  { en: { intensive: "Intensive", reflexive: "Reflexive" }, es: { intensive: "Enfático", reflexive: "Reflexivo" } },
  { en: ["intensive", "reflexive"], es: ["intensive", "reflexive"] },
  [
    {
      en: ["Maya taught herself to play the guitar.", "reflexive", "Read it without “herself”: “Maya taught to play the guitar.” Who learned?", "“Herself” receives the teaching and means the same person as Maya.", "herself"],
      es: ["Lucía se miró en el espejo antes de salir.", "reflexive", "Lucía hace la acción de mirar, y también es a quien mira.", "“Se” indica que Lucía se mira a sí misma.", "se"],
    },
    {
      en: ["Maya herself built the bookshelf.", "intensive", "Read it without “herself”: “Maya built the bookshelf.”", "The sentence is complete without it; “herself” only stresses that Maya did it.", "herself"],
      es: ["Lucía misma pintó el mural de la entrada.", "intensive", "Quita la palabra: “Lucía pintó el mural de la entrada” dice lo mismo.", "“Misma” solo subraya que fue Lucía quien lo pintó.", "misma"],
    },
    {
      en: ["The coach himself drove the team bus to the game.", "intensive", "Read it without “himself”: “The coach drove the team bus to the game.”", "The sentence is complete without it; “himself” adds emphasis.", "himself"],
      es: ["Yo mismo armé la bicicleta nueva.", "intensive", "Quita la palabra: “Yo armé la bicicleta nueva” dice lo mismo.", "“Mismo” subraya que nadie más la armó.", "mismo"],
    },
    {
      en: ["Diego hurt himself during soccer practice.", "reflexive", "Read it without “himself”: “Diego hurt during soccer practice.” Something is missing.", "Diego is the one who was hurt, so “himself” receives the action.", "himself"],
      es: ["El gato se lame las patas después de comer.", "reflexive", "El gato hace la acción de lamer, y las patas que lame son suyas.", "“Se” indica que la acción recae sobre el propio gato.", "se"],
    },
    {
      en: ["I fixed the flat tire myself.", "intensive", "Read it without “myself”: “I fixed the flat tire.”", "The sentence is complete without it; “myself” stresses that no one helped.", "myself"],
      es: ["Los niños mismos limpiaron el salón.", "intensive", "Quita la palabra: “Los niños limpiaron el salón” dice lo mismo.", "“Mismos” subraya quiénes hicieron la limpieza.", "mismos"],
    },
    {
      en: ["The kitten saw itself in the mirror and jumped.", "reflexive", "Read it without “itself”: “The kitten saw in the mirror.” What did it see?", "“Itself” is what the kitten saw, the same animal as the subject.", "itself"],
      es: ["Te cortaste con la hoja de papel.", "reflexive", "Tú haces la acción de cortar, y tú también recibes el corte.", "“Te” indica que la acción recae sobre quien la hace.", "Te"],
    },
    {
      en: ["You should be proud of yourself.", "reflexive", "Read it without “yourself”: “You should be proud of.” The sentence breaks.", "“Yourself” completes “proud of” and means the same person as “you.”", "yourself"],
      es: ["La directora misma nos dio la noticia.", "intensive", "Quita la palabra: “La directora nos dio la noticia” dice lo mismo.", "“Misma” solo da énfasis.", "misma"],
    },
    {
      en: ["The students themselves planned the fundraiser.", "intensive", "Read it without “themselves”: “The students planned the fundraiser.”", "The sentence is complete without it; “themselves” stresses who did the planning.", "themselves"],
      es: ["Me lavo las manos antes de comer.", "reflexive", "Yo hago la acción de lavar, y las manos que lavo son mías.", "“Me” indica que la acción recae sobre quien la hace.", "Me"],
    },
    {
      en: ["They introduced themselves to the new neighbors.", "reflexive", "Read it without “themselves”: “They introduced to the new neighbors.” Who was introduced?", "“Themselves” receives the action and means the same people as “they.”", "themselves"],
      es: ["Tú misma lo dijiste en la reunión.", "intensive", "Quita la palabra: “Tú lo dijiste en la reunión” dice lo mismo.", "“Misma” solo subraya quién lo dijo.", "misma"],
    },
    {
      en: ["The mayor herself cut the ribbon at the new library.", "intensive", "Read it without “herself”: “The mayor cut the ribbon at the new library.”", "The sentence is complete without it; “herself” adds emphasis.", "herself"],
      es: ["Mis hermanos se peinan frente al espejo.", "reflexive", "Mis hermanos hacen la acción de peinar, y es su propio pelo.", "“Se” indica que la acción recae sobre quienes la hacen.", "se"],
    },
    {
      en: ["The cat licked itself clean after dinner.", "reflexive", "Read it without “itself”: “The cat licked clean after dinner.” What did it lick?", "“Itself” is what the cat licked, the same animal as the subject.", "itself"],
      es: ["Nosotras mismas organizamos la feria de ciencias.", "intensive", "Quita la palabra: “Nosotras organizamos la feria de ciencias” dice lo mismo.", "“Mismas” solo da énfasis.", "mismas"],
    },
    {
      en: ["You yourself said the movie was too long.", "intensive", "Read it without “yourself”: “You said the movie was too long.”", "The sentence is complete without it; “yourself” adds emphasis.", "yourself"],
      es: ["El perro se rascó la oreja con la pata.", "reflexive", "El perro hace la acción de rascar, y la oreja es suya.", "“Se” indica que la acción recae sobre el propio perro.", "se"],
    },
    {
      en: ["Grandpa cut himself while slicing bread.", "reflexive", "Read it without “himself”: “Grandpa cut while slicing bread.” Who got cut?", "Grandpa is the one who got cut, so “himself” receives the action.", "himself"],
      es: ["El autor mismo firmó mi libro.", "intensive", "Quita la palabra: “El autor firmó mi libro” dice lo mismo.", "“Mismo” subraya que fue el autor en persona.", "mismo"],
    },
    {
      en: ["I myself have never seen snow.", "intensive", "Read it without “myself”: “I have never seen snow.”", "The sentence is complete without it; “myself” adds emphasis.", "myself"],
      es: ["Nos preparamos para el examen de mañana.", "reflexive", "Nosotros hacemos la acción de preparar, y también somos quienes quedan preparados.", "“Nos” indica que la acción recae sobre quienes la hacen.", "Nos"],
    },
    {
      en: ["Omar reminded himself to bring his library book.", "reflexive", "Read it without “himself”: “Omar reminded to bring his library book.” Who got the reminder?", "Omar reminded Omar, so “himself” receives the action.", "himself"],
      es: ["Yo misma cociné la sopa.", "intensive", "Quita la palabra: “Yo cociné la sopa” dice lo mismo.", "“Misma” subraya que nadie más la cocinó.", "misma"],
    },
  ],
);

const INTENSIVE_PRONOUNS = skill(
  { id: "e.intensive.pronouns", grade: "6", title: { en: "Intensive and reflexive pronouns", es: "Pronombres reflexivos y enfáticos" }, standard: "L.6.1b", prereqs: ["e.pronouns"] },
  [
    {
      bank: SELF_FORMS,
      ask: CHOOSE,
      hints: {
        en: ["Find the word the pronoun points back to, or the person doing the action.", "A pronoun ending in -self or -selves must match that word in person and number, and it never stands alone as the subject."],
        es: ["Busca a quién se refiere la palabra que falta.", "“Mismo” concuerda en género y número con la palabra a la que se refiere. El pronombre reflexivo concuerda con la persona del verbo."],
      },
      seconds: 15,
    },
    {
      ...SELF_USE,
      ask: { en: "Is {t} intensive or reflexive in this sentence?", es: "En esta oración, ¿{t} es enfático o reflexivo?" },
      hints: {
        en: ["Try reading the sentence without the -self word. Does it still make sense?", "An intensive pronoun only adds emphasis, so the sentence is complete without it. A reflexive pronoun is needed: it receives the action and means the same person as the subject."],
        es: ["¿La acción recae sobre quien la hace, o la palabra solo subraya quién la hizo?", "Un pronombre reflexivo (me, te, se, nos) indica que quien hace la acción también la recibe. “Mismo” o “misma” es enfático: solo da énfasis, y si lo quitas la oración dice lo mismo."],
      },
      seconds: 15,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.vague.pronouns — level 1: a pronoun that could mean either of two people or things (Spanish: the
// ambiguous "su", "él", "ella", "lo"); level 2: the revision that makes it clear without changing the
// meaning; level 3: shifts in person and number (Spanish: "uno" with "tú", "la gente" with a plural verb).

const AMBIGUOUS: Bi<Entry>[] = [
  {
    en: ["Marco told his dad that he needed a new phone.", "Either one: Marco or his dad", [["Only Marco", "assumed-first-noun"], ["Only his dad", "assumed-nearest-noun"]], "Try “Marco needed a new phone.” Then try “His dad needed a new phone.”", "Nothing in the sentence says which one needs the phone, so “he” is unclear.", "he"],
    es: ["Ana le dijo a Rosa que su perro estaba enfermo.", "Cualquiera de las dos: Ana o Rosa", [["Solo Ana", "assumed-first-noun"], ["Solo Rosa", "assumed-nearest-noun"]], "Prueba “el perro de Ana” y luego “el perro de Rosa”.", "Nada en la oración dice de quién es el perro, así que “su” es ambiguo.", "su"],
  },
  {
    en: ["Ana handed Rosa the map after she found the trail.", "Either one: Ana or Rosa", [["Only Ana", "assumed-first-noun"], ["Only Rosa", "assumed-nearest-noun"]], "Try “Ana found the trail.” Then try “Rosa found the trail.”", "Either girl could have found the trail, so “she” is unclear.", "she"],
    es: ["Marcos llamó a su papá porque él necesitaba ayuda.", "Cualquiera de los dos: Marcos o su papá", [["Solo Marcos", "assumed-first-noun"], ["Solo su papá", "assumed-nearest-noun"]], "Prueba “Marcos necesitaba ayuda” y luego “su papá necesitaba ayuda”.", "Cualquiera de los dos podía necesitar ayuda, así que “él” es ambiguo.", "él"],
  },
  {
    en: ["When the dog chased the cat, it knocked over a lamp.", "Either one: the dog or the cat", [["Only the dog", "assumed-first-noun"], ["Only the cat", "assumed-nearest-noun"]], "Try “The dog knocked over a lamp.” Then try “The cat knocked over a lamp.”", "Either animal could have knocked it over, so “it” is unclear.", "it"],
    es: ["La abuela le contó a la tía Mei que su jardín necesitaba agua.", "Cualquiera de las dos: la abuela o la tía Mei", [["Solo la abuela", "assumed-first-noun"], ["Solo la tía Mei", "assumed-nearest-noun"]], "Prueba “el jardín de la abuela” y luego “el jardín de la tía Mei”.", "El jardín puede ser de cualquiera de las dos, así que “su” es ambiguo.", "su"],
  },
  {
    en: ["Mr. Chen called Mr. Brooks because he was worried about the field trip.", "Either one: Mr. Chen or Mr. Brooks", [["Only Mr. Chen", "assumed-first-noun"], ["Only Mr. Brooks", "assumed-nearest-noun"]], "Try “Mr. Chen was worried.” Then try “Mr. Brooks was worried.”", "Either man could be the worried one, so “he” is unclear.", "he"],
    es: ["La señora Chen llamó a la señora Pérez porque ella estaba preocupada por la excursión.", "Cualquiera de las dos: la señora Chen o la señora Pérez", [["Solo la señora Chen", "assumed-first-noun"], ["Solo la señora Pérez", "assumed-nearest-noun"]], "Prueba “la señora Chen estaba preocupada” y luego “la señora Pérez estaba preocupada”.", "Cualquiera de las dos podía estar preocupada, así que “ella” es ambiguo.", "ella"],
  },
  {
    en: ["Lily put the vase on the shelf, and then it fell.", "Either one: the vase or the shelf", [["Only the vase", "assumed-first-noun"], ["Only the shelf", "assumed-nearest-noun"]], "Try “the vase fell.” Then try “the shelf fell.”", "Either thing could have fallen, so “it” is unclear.", "it"],
    es: ["Priya saludó a Sofía mientras ella cruzaba la calle.", "Cualquiera de las dos: Priya o Sofía", [["Solo Priya", "assumed-first-noun"], ["Solo Sofía", "assumed-nearest-noun"]], "Prueba “Priya cruzaba la calle” y luego “Sofía cruzaba la calle”.", "Cualquiera de las dos podía estar cruzando, así que “ella” es ambiguo.", "ella"],
  },
  {
    en: ["Grandma told Aunt Mei that her garden needed water.", "Either one: Grandma or Aunt Mei", [["Only Grandma", "assumed-first-noun"], ["Only Aunt Mei", "assumed-nearest-noun"]], "Try “Grandma's garden.” Then try “Aunt Mei's garden.”", "The garden could belong to either woman, so “her” is unclear.", "her"],
    es: ["Jada le dijo a su hermana que ella había ganado el concurso de arte.", "Cualquiera de las dos: Jada o su hermana", [["Solo Jada", "assumed-first-noun"], ["Solo su hermana", "assumed-nearest-noun"]], "Prueba “Jada había ganado” y luego “su hermana había ganado”.", "Cualquiera de las dos pudo ganar, así que “ella” es ambiguo.", "ella"],
  },
  {
    en: ["Take the batteries out of the remotes and recycle them.", "Either one: the batteries or the remotes", [["Only the batteries", "assumed-first-noun"], ["Only the remotes", "assumed-nearest-noun"]], "Try “recycle the batteries.” Then try “recycle the remotes.”", "Either could be recycled, so “them” is unclear.", "them"],
    es: ["La entrenadora le dijo a la árbitra que ella se había equivocado.", "Cualquiera de las dos: la entrenadora o la árbitra", [["Solo la entrenadora", "assumed-first-noun"], ["Solo la árbitra", "assumed-nearest-noun"]], "Prueba “la entrenadora se había equivocado” y luego “la árbitra se había equivocado”.", "Cualquiera de las dos pudo equivocarse, así que “ella” es ambiguo.", "ella"],
  },
  {
    en: ["Priya waved to Sofia while she was crossing the street.", "Either one: Priya or Sofia", [["Only Priya", "assumed-first-noun"], ["Only Sofia", "assumed-nearest-noun"]], "Try “Priya was crossing.” Then try “Sofia was crossing.”", "Either girl could be the one crossing, so “she” is unclear.", "she"],
    es: ["La maestra Ortiz le recordó a la maestra Hall que su grupo tenía el gimnasio primero.", "Cualquiera de las dos: la maestra Ortiz o la maestra Hall", [["Solo la maestra Ortiz", "assumed-first-noun"], ["Solo la maestra Hall", "assumed-nearest-noun"]], "Prueba “el grupo de la maestra Ortiz” y luego “el grupo de la maestra Hall”.", "El grupo puede ser de cualquiera de las dos, así que “su” es ambiguo.", "su"],
  },
  {
    en: ["The truck hit the mailbox, but it was not damaged.", "Either one: the truck or the mailbox", [["Only the truck", "assumed-first-noun"], ["Only the mailbox", "assumed-nearest-noun"]], "Try “the truck was not damaged.” Then try “the mailbox was not damaged.”", "Either one could have come through without damage, so “it” is unclear.", "it"],
    es: ["Sam metió el celular en el estuche, pero ahora no lo encuentra.", "Cualquiera de los dos: el celular o el estuche", [["Solo el celular", "assumed-first-noun"], ["Solo el estuche", "assumed-nearest-noun"]], "Prueba “no encuentra el celular” y luego “no encuentra el estuche”.", "Sam podría estar buscando cualquiera de los dos, así que “lo” es ambiguo.", "lo"],
  },
  {
    en: ["Mom moved the cake away from the pie because it was still hot.", "Either one: the cake or the pie", [["Only the cake", "assumed-first-noun"], ["Only the pie", "assumed-nearest-noun"]], "Try “the cake was still hot.” Then try “the pie was still hot.”", "Either dessert could be the hot one, so “it” is unclear.", "it"],
    es: ["Rafa dejó el cuaderno sobre el libro y luego lo guardó en la mochila.", "Cualquiera de los dos: el cuaderno o el libro", [["Solo el cuaderno", "assumed-first-noun"], ["Solo el libro", "assumed-nearest-noun"]], "Prueba “guardó el cuaderno” y luego “guardó el libro”.", "Rafa pudo guardar cualquiera de los dos, así que “lo” es ambiguo.", "lo"],
  },
  {
    en: ["Jada told her sister that she won the art contest.", "Either one: Jada or her sister", [["Only Jada", "assumed-first-noun"], ["Only her sister", "assumed-nearest-noun"]], "Try “Jada won.” Then try “her sister won.”", "Either girl could have won, so “she” is unclear.", "she"],
    es: ["Elena le prestó a Carmen su libro de cuentos.", "Cualquiera de las dos: Elena o Carmen", [["Solo Elena", "assumed-first-noun"], ["Solo Carmen", "assumed-nearest-noun"]], "Prueba “el libro de Elena” y luego “el libro de Carmen”.", "El libro puede ser de cualquiera de las dos, así que “su” es ambiguo.", "su"],
  },
  {
    en: ["The coach told the referee that he had made a mistake.", "Either one: the coach or the referee", [["Only the coach", "assumed-first-noun"], ["Only the referee", "assumed-nearest-noun"]], "Try “the coach made a mistake.” Then try “the referee made a mistake.”", "Either one could have made the mistake, so “he” is unclear.", "he"],
    es: ["Tomás le escribió a Andrés después de que él volvió del viaje.", "Cualquiera de los dos: Tomás o Andrés", [["Solo Tomás", "assumed-first-noun"], ["Solo Andrés", "assumed-nearest-noun"]], "Prueba “Tomás volvió del viaje” y luego “Andrés volvió del viaje”.", "Cualquiera de los dos pudo volver del viaje, así que “él” es ambiguo.", "él"],
  },
  {
    en: ["Sam put his phone in the backpack, but now he can't find it.", "Either one: his phone or the backpack", [["Only his phone", "assumed-first-noun"], ["Only the backpack", "assumed-nearest-noun"]], "Try “he can't find his phone.” Then try “he can't find the backpack.”", "Sam could be looking for either one, so “it” is unclear.", "it"],
    es: ["Papá le pidió a mi tío que lavara su carro.", "Cualquiera de los dos: papá o mi tío", [["Solo papá", "assumed-first-noun"], ["Solo mi tío", "assumed-nearest-noun"]], "Prueba “el carro de papá” y luego “el carro de mi tío”.", "El carro puede ser de cualquiera de los dos, así que “su” es ambiguo.", "su"],
  },
  {
    en: ["Ms. Ortiz reminded Ms. Hall that her class had the gym first.", "Either one: Ms. Ortiz or Ms. Hall", [["Only Ms. Ortiz", "assumed-first-noun"], ["Only Ms. Hall", "assumed-nearest-noun"]], "Try “Ms. Ortiz's class.” Then try “Ms. Hall's class.”", "The class could belong to either teacher, so “her” is unclear.", "her"],
    es: ["Luisa habló con su prima mientras ella preparaba la cena.", "Cualquiera de las dos: Luisa o su prima", [["Solo Luisa", "assumed-first-noun"], ["Solo su prima", "assumed-nearest-noun"]], "Prueba “Luisa preparaba la cena” y luego “su prima preparaba la cena”.", "Cualquiera de las dos podía estar cocinando, así que “ella” es ambiguo.", "ella"],
  },
];

const CLEAR_REVISION: Bi<Entry>[] = [
  {
    en: ["Marco told his dad that he needed a new phone.", "Marco said to his dad, “I need a new phone.”", [["Marco told his dad that he really needed a new phone.", "still-unclear"], ["Marco's dad told him to get a new phone.", "changed-meaning"]], "Turning the words into a quote can show who needs the phone.", "In the quote, “I” can only mean Marco."],
    es: ["Ana le dijo a Rosa que su perro estaba enfermo.", "Ana le dijo a Rosa: “Mi perro está enfermo”.", [["Ana le dijo a Rosa que su perro estaba muy enfermo.", "still-unclear"], ["Rosa le dijo a Ana que el perro estaba sano.", "changed-meaning"]], "Una cita directa puede mostrar de quién es el perro.", "En la cita, “mi perro” solo puede ser el de Ana."],
  },
  {
    en: ["In the article, it says that bees are losing their habitat.", "The article says that bees are losing their habitat.", [["In the article, they say that bees are losing their habitat.", "still-unclear"], ["The article says that bees are gaining habitat.", "changed-meaning"]], "Ask what “it” stands for. Nothing in the sentence is named “it.”", "Name the source directly and make it the subject."],
    es: ["Marcos llamó a su papá porque él necesitaba ayuda.", "Marcos necesitaba ayuda, así que llamó a su papá.", [["Marcos llamó a su papá porque él necesitaba mucha ayuda.", "still-unclear"], ["El papá de Marcos lo llamó para ofrecerle ayuda.", "changed-meaning"]], "Nombra primero a quien necesitaba ayuda.", "Ahora queda claro que quien necesitaba ayuda era Marcos."],
  },
  {
    en: ["At the clinic, they told us to drink more water.", "At the clinic, the nurse told us to drink more water.", [["At the clinic, they kept telling us to drink more water.", "still-unclear"], ["At the clinic, we told the nurse to drink more water.", "changed-meaning"]], "Who are “they”? The sentence never says.", "Naming the nurse tells who gave the advice."],
    es: ["La abuela le contó a la tía Mei que su jardín necesitaba agua.", "La abuela le dijo a la tía Mei: “Tu jardín necesita agua”.", [["La abuela le contó a la tía Mei que su jardín necesitaba mucha agua.", "still-unclear"], ["La tía Mei regó el jardín de la abuela.", "changed-meaning"]], "Una cita directa puede mostrar de quién es el jardín.", "“Tu jardín” solo puede ser el de la tía Mei."],
  },
  {
    en: ["Ana handed Rosa the map after she found the trail.", "After Rosa found the trail, Ana handed her the map.", [["Ana handed Rosa the map after she had found the trail.", "still-unclear"], ["Ana found the trail and kept the map.", "changed-meaning"]], "Name the person who found the trail first.", "Now “her” can only mean Rosa, because Ana cannot hand the map to herself."],
    es: ["La señora Chen llamó a la señora Pérez porque ella estaba preocupada por la excursión.", "La señora Chen estaba preocupada por la excursión, así que llamó a la señora Pérez.", [["La señora Chen llamó a la señora Pérez porque ella estaba muy preocupada por la excursión.", "still-unclear"], ["La señora Pérez llamó a la señora Chen para hablar de otra cosa.", "changed-meaning"]], "Nombra primero a la persona preocupada.", "Ahora queda claro que la preocupada era la señora Chen."],
  },
  {
    en: ["When the dog chased the cat, it knocked over a lamp.", "The dog knocked over a lamp while chasing the cat.", [["When the dog chased the cat, it suddenly knocked over a lamp.", "still-unclear"], ["The cat and the dog broke the lamp on purpose.", "changed-meaning"]], "Name the animal that knocked over the lamp.", "Now the sentence says which animal did it."],
    es: ["Priya saludó a Sofía mientras ella cruzaba la calle.", "Mientras Sofía cruzaba la calle, Priya la saludó.", [["Priya saludó a Sofía mientras ella cruzaba rápido la calle.", "still-unclear"], ["Sofía saludó a Priya desde el otro lado de la calle.", "changed-meaning"]], "Pon el nombre de quien cruzaba en la primera parte de la oración.", "Ahora “la” solo puede ser Sofía, porque Priya no se saluda a sí misma."],
  },
  {
    en: ["Take the batteries out of the remotes and recycle them.", "Recycle the batteries after you take them out of the remotes.", [["Take the batteries out of the remotes and then recycle them.", "still-unclear"], ["Recycle the remotes with the batteries still inside.", "changed-meaning"]], "Decide what gets recycled and name it before the pronoun.", "Naming the batteries first makes “them” clear."],
    es: ["Jada le dijo a su hermana que ella había ganado el concurso de arte.", "Jada le dijo a su hermana: “Gané el concurso de arte”.", [["Jada le dijo a su hermana que ella sí había ganado el concurso de arte.", "still-unclear"], ["La hermana de Jada le contó que nadie ganó el concurso.", "changed-meaning"]], "Una cita directa puede mostrar quién ganó.", "“Gané” solo puede referirse a Jada, que es quien habla."],
  },
  {
    en: ["Grandma told Aunt Mei that her garden needed water.", "Grandma said to Aunt Mei, “Your garden needs water.”", [["Grandma told Aunt Mei that her own garden needed water.", "still-unclear"], ["Aunt Mei told Grandma to water the garden.", "changed-meaning"]], "A quote can show whose garden it is.", "“Your garden” can only mean Aunt Mei's garden."],
    es: ["La entrenadora le dijo a la árbitra que ella se había equivocado.", "La entrenadora le dijo a la árbitra: “Usted se equivocó”.", [["La entrenadora le dijo a la árbitra que ella se había equivocado otra vez.", "still-unclear"], ["La árbitra le dijo a la entrenadora que el partido había terminado.", "changed-meaning"]], "Una cita directa puede mostrar quién se equivocó.", "“Usted” solo puede ser la árbitra, a quien se le habla."],
  },
  {
    en: ["On the news, they said the storm would arrive tonight.", "The weather reporter said the storm would arrive tonight.", [["On the news, they all said the storm would arrive tonight.", "still-unclear"], ["On the news, they said the storm had already passed.", "changed-meaning"]], "Who are “they”? Name the person who said it.", "Naming the weather reporter tells who spoke."],
    es: ["La maestra Ortiz le recordó a la maestra Hall que su grupo tenía el gimnasio primero.", "La maestra Ortiz le recordó a la maestra Hall: “Tu grupo tiene el gimnasio primero”.", [["La maestra Ortiz le recordó a la maestra Hall que su grupo siempre tenía el gimnasio primero.", "still-unclear"], ["La maestra Hall le recordó a la maestra Ortiz que el gimnasio estaba cerrado.", "changed-meaning"]], "Una cita directa puede mostrar de quién es el grupo.", "“Tu grupo” solo puede ser el de la maestra Hall."],
  },
  {
    en: ["Priya waved to Sofia while she was crossing the street.", "While Sofia was crossing the street, Priya waved to her.", [["Priya waved to Sofia while she crossed the street.", "still-unclear"], ["Sofia waved to Priya from across the street.", "changed-meaning"]], "Put the name of the person crossing in the first part of the sentence.", "Now “her” can only mean Sofia, because Priya cannot wave to herself."],
    es: ["Sam metió el celular en el estuche, pero ahora no lo encuentra.", "Sam metió el celular en el estuche, pero ahora no encuentra el celular.", [["Sam metió el celular en el estuche, pero ahora no lo encuentra por ningún lado.", "still-unclear"], ["Sam no encuentra ni el estuche ni la mochila.", "changed-meaning"]], "Cambia “lo” por la cosa que Sam busca.", "Nombrar el celular quita la duda."],
  },
  {
    en: ["Sam put his phone in the backpack, but now he can't find it.", "Sam put his phone in the backpack, but now he can't find the phone.", [["Sam put his phone in the backpack, and now he can't find it anywhere.", "still-unclear"], ["Sam can't find his backpack or his jacket.", "changed-meaning"]], "Replace “it” with the thing Sam is looking for.", "Naming the phone removes the doubt."],
    es: ["Rafa dejó el cuaderno sobre el libro y luego lo guardó en la mochila.", "Rafa dejó el cuaderno sobre el libro y luego guardó el libro en la mochila.", [["Rafa dejó el cuaderno sobre el libro y luego lo guardó con cuidado en la mochila.", "still-unclear"], ["Rafa dejó el cuaderno y el libro en la mesa.", "changed-meaning"]], "Cambia “lo” por la cosa que Rafa guardó.", "Nombrar el libro quita la duda."],
  },
  {
    en: ["In the instructions, it says to preheat the oven.", "The instructions say to preheat the oven.", [["In the instructions, they say to preheat the oven.", "still-unclear"], ["The instructions say not to preheat the oven.", "changed-meaning"]], "Nothing in the sentence is “it.” What is actually giving the direction?", "Make the instructions the subject."],
    es: ["Elena le prestó a Carmen su libro de cuentos.", "Elena tenía un libro de cuentos y se lo prestó a Carmen.", [["Elena le prestó a Carmen su nuevo libro de cuentos.", "still-unclear"], ["Carmen le prestó a Elena un libro de cuentos.", "changed-meaning"]], "Di primero quién tenía el libro.", "Ahora queda claro que el libro era de Elena."],
  },
  {
    en: ["Jada told her sister that she won the art contest.", "Jada told her sister, “I won the art contest.”", [["Jada told her sister that she had won the art contest.", "still-unclear"], ["Jada's sister told her about the art contest.", "changed-meaning"]], "A quote can show who won.", "In the quote, “I” can only mean Jada."],
    es: ["Tomás le escribió a Andrés después de que él volvió del viaje.", "Cuando Andrés volvió del viaje, Tomás le escribió.", [["Tomás le escribió a Andrés justo después de que él volvió del viaje.", "still-unclear"], ["Andrés le escribió a Tomás antes del viaje.", "changed-meaning"]], "Pon el nombre de quien volvió en la primera parte.", "Ahora queda claro que quien volvió fue Andrés."],
  },
  {
    en: ["The coach told the referee that he had made a mistake.", "The coach told the referee, “You made a mistake.”", [["The coach told the referee that he had clearly made a mistake.", "still-unclear"], ["The referee told the coach that the game was over.", "changed-meaning"]], "A quote can show who made the mistake.", "“You” can only mean the referee, the one being spoken to."],
    es: ["Papá le pidió a mi tío que lavara su carro.", "Papá le pidió a mi tío: “Lava mi carro, por favor”.", [["Papá le pidió a mi tío que lavara su carro hoy.", "still-unclear"], ["Mi tío le pidió a papá que lavara el carro.", "changed-meaning"]], "Una cita directa puede mostrar de quién es el carro.", "“Mi carro”, dicho por papá, solo puede ser el de papá."],
  },
  {
    en: ["Mr. Chen called Mr. Brooks because he was worried about the field trip.", "Mr. Chen was worried about the field trip, so he called Mr. Brooks.", [["Mr. Chen called Mr. Brooks because he was very worried about the field trip.", "still-unclear"], ["Mr. Brooks called Mr. Chen about the field trip.", "changed-meaning"]], "Name the worried person first, before any pronoun.", "Now “he” can only mean Mr. Chen."],
    es: ["Luisa habló con su prima mientras ella preparaba la cena.", "Mientras su prima preparaba la cena, Luisa habló con ella.", [["Luisa habló con su prima mientras ella preparaba toda la cena.", "still-unclear"], ["Luisa y su prima no prepararon la cena.", "changed-meaning"]], "Pon a quien preparaba la cena en la primera parte.", "Ahora queda claro que quien cocinaba era la prima."],
  },
  {
    en: ["Lily put the vase on the shelf, and then it fell.", "Lily put the vase on the shelf, and then the vase fell.", [["Lily put the vase on the shelf, and then it suddenly fell.", "still-unclear"], ["Lily put the vase on the shelf so it would not fall.", "changed-meaning"]], "Replace “it” with the thing that fell.", "Naming the vase removes the doubt."],
    es: ["Daniel le contó a su hermano que su bicicleta tenía una llanta desinflada.", "Daniel le dijo a su hermano: “Tu bicicleta tiene una llanta desinflada”.", [["Daniel le contó a su hermano que su bicicleta tenía otra vez una llanta desinflada.", "still-unclear"], ["El hermano de Daniel infló la llanta de su propia bicicleta.", "changed-meaning"]], "Una cita directa puede mostrar de quién es la bicicleta.", "“Tu bicicleta” solo puede ser la del hermano."],
  },
];

const SHIFTS: Bi<Entry>[] = [
  {
    en: ["When students study for a test, ___ should take short breaks.", "they", [["you", "shift-in-person"], ["he or she", "shift-in-number"]], "The sentence starts with “students,” more than one person.", "“Students” is plural and third person, so the pronoun is too."],
    es: ["Cuando uno estudia mucho, ___ cansa.", "se", [["te", "shift-in-person"], ["nos", "shift-in-person"]], "La oración empieza con “uno”, que va en tercera persona.", "Con “uno” se mantiene la tercera persona."],
  },
  {
    en: ["We love hiking because ___ can see the whole valley from the top.", "we", [["you", "shift-in-person"], ["one", "shift-in-person"]], "The sentence starts in the first person plural.", "Keep the same person all the way through."],
    es: ["La gente del barrio ___ a limpiar el parque.", "ayudó", [["ayudaron", "shift-in-number"], ["ayudamos", "shift-in-person"]], "“La gente” es una sola palabra en singular, aunque nombre a muchas personas.", "“La gente” es singular, así que el verbo también."],
  },
  {
    en: ["The members of the band tuned ___ instruments before the show.", "their", [["his or her", "shift-in-number"], ["your", "shift-in-person"]], "The pronoun points back to “the members,” more than one person.", "Plural “members” takes a plural pronoun."],
    es: ["Los integrantes de la banda afinaron ___ instrumentos antes del concierto.", "sus", [["su", "shift-in-number"], ["nuestros", "shift-in-person"]], "Lo que se posee es “instrumentos”, en plural.", "En español, el posesivo concuerda con lo que se posee: “instrumentos” es plural."],
  },
  {
    en: ["I enjoy painting because ___ can show feelings without words.", "I", [["you", "shift-in-person"], ["they", "shift-in-person"]], "The sentence starts in the first person singular.", "Keep the same person all the way through."],
    es: ["Me gusta pintar porque así ___ expresar lo que siento.", "puedo", [["puedes", "shift-in-person"], ["pueden", "shift-in-person"]], "La oración empieza con “me gusta”: habla la primera persona, yo.", "Se mantiene la primera persona del singular."],
  },
  {
    en: ["Hikers should carry water so that ___ do not get dehydrated.", "they", [["you", "shift-in-person"], ["he", "shift-in-number"]], "The pronoun points back to “hikers.”", "Plural “hikers” takes a plural pronoun."],
    es: ["Si uno practica todos los días, ___ más rápido.", "mejora", [["mejoras", "shift-in-person"], ["mejoran", "shift-in-number"]], "La oración empieza con “uno”, en tercera persona del singular.", "Con “uno”, el verbo va en tercera persona del singular."],
  },
  {
    en: ["When I practice piano every day, ___ notice that my fingers move faster.", "I", [["you", "shift-in-person"], ["we", "shift-in-number"]], "The sentence starts in the first person singular.", "Keep the same person and number all the way through."],
    es: ["El equipo celebró ___ triunfo en la cancha.", "su", [["sus", "shift-in-number"], ["nuestro", "shift-in-person"]], "Lo que se posee es “triunfo”, uno solo.", "“Triunfo” es singular, así que el posesivo también."],
  },
  {
    en: ["The scientists published ___ results in a journal.", "their", [["its", "shift-in-number"], ["our", "shift-in-person"]], "The pronoun points back to “the scientists.”", "Plural “scientists” takes a plural pronoun."],
    es: ["Cada uno de los estudiantes ___ su proyecto.", "presentó", [["presentaron", "shift-in-number"], ["presentamos", "shift-in-person"]], "El sujeto es “cada uno”, en singular.", "“Cada uno” pide el verbo en singular."],
  },
  {
    en: ["You should wear a helmet whenever ___ ride a bike.", "you", [["one", "shift-in-person"], ["they", "shift-in-person"]], "The sentence starts in the second person, talking to the reader.", "Keep the same person all the way through."],
    es: ["Nosotros llegamos temprano al museo, pero ___ que esperar en la fila.", "tuvimos", [["tuvieron", "shift-in-person"], ["tuviste", "shift-in-person"]], "La oración empieza con “nosotros”.", "Se mantiene la primera persona del plural."],
  },
  {
    en: ["My friends and I packed ___ bags the night before the trip.", "our", [["their", "shift-in-person"], ["my", "shift-in-number"]], "“My friends and I” includes the speaker and other people.", "A group that includes “I” takes a first-person plural pronoun."],
    es: ["Mis amigos y yo preparamos ___ mochilas la noche anterior.", "nuestras", [["sus", "shift-in-person"], ["nuestra", "shift-in-number"]], "El grupo incluye a quien habla: “mis amigos y yo”.", "Un grupo que incluye a “yo” lleva el posesivo de primera persona del plural, y concuerda con “mochilas”."],
  },
  {
    en: ["A spider spins ___ web in a corner of the barn.", "its", [["their", "shift-in-number"], ["your", "shift-in-person"]], "The pronoun points back to “a spider,” one animal.", "One animal takes a singular pronoun."],
    es: ["La familia de Inés ___ de vacaciones a Puerto Rico.", "viajó", [["viajaron", "shift-in-number"], ["viajamos", "shift-in-person"]], "El sujeto es “la familia”, una sola palabra en singular.", "“La familia” pide el verbo en singular."],
  },
  {
    en: ["Runners must stretch before ___ race.", "their", [["his", "shift-in-number"], ["your", "shift-in-person"]], "The pronoun points back to “runners.”", "Plural “runners” takes a plural pronoun."],
    es: ["Cuando tú haces ejercicio, ___ sientes con más energía.", "te", [["se", "shift-in-person"], ["me", "shift-in-person"]], "La oración empieza con “tú”.", "Con “tú” se mantiene la segunda persona."],
  },
  {
    en: ["When we arrived at the museum, ___ had to wait in a long line.", "we", [["you", "shift-in-person"], ["they", "shift-in-person"]], "The sentence starts in the first person plural.", "Keep the same person all the way through."],
    es: ["Los gansos volaron al sur porque ___ un lugar más cálido.", "buscaban", [["buscaba", "shift-in-number"], ["buscábamos", "shift-in-person"]], "El sujeto es “los gansos”, en plural.", "“Los gansos” es plural, así que el verbo también."],
  },
  {
    en: ["The geese flew south because ___ needed a warmer place for winter.", "they", [["it", "shift-in-number"], ["we", "shift-in-person"]], "The pronoun points back to “the geese,” more than one bird.", "“Geese” is plural, so the pronoun is too."],
    es: ["Uno se siente mejor cuando ___ bien.", "duerme", [["duermes", "shift-in-person"], ["duermen", "shift-in-number"]], "La oración empieza con “uno”, en tercera persona del singular.", "Se mantiene la tercera persona del singular."],
  },
  {
    en: ["Musicians in an orchestra must watch ___ conductor closely.", "their", [["your", "shift-in-person"], ["his", "shift-in-number"]], "The pronoun points back to “musicians.”", "Plural “musicians” takes a plural pronoun."],
    es: ["Los músicos de la orquesta miran a ___ director con atención.", "su", [["sus", "shift-in-number"], ["tu", "shift-in-person"]], "Lo que se posee es “director”, uno solo.", "“Director” es singular, así que el posesivo también."],
  },
];

const VAGUE_PRONOUNS = skill(
  { id: "e.vague.pronouns", grade: "6", title: { en: "Clear pronouns", es: "Pronombres claros" }, standard: "L.6.1d", prereqs: ["e.pronouns"] },
  [
    {
      bank: AMBIGUOUS,
      ask: { en: "Who or what could {t} refer to?", es: "¿A quién o a qué podría referirse {t}?" },
      hints: {
        en: ["Look at every noun that comes before the pronoun.", "Put each noun in place of the pronoun. If more than one still makes sense, the pronoun is unclear."],
        es: ["Fíjate en todos los sustantivos que aparecen antes del pronombre.", "Pon cada sustantivo en lugar del pronombre. Si más de uno tiene sentido, el pronombre es ambiguo."],
      },
      seconds: 20,
    },
    {
      bank: CLEAR_REVISION,
      ask: { en: "Which revision makes the pronoun's meaning clear?", es: "¿Qué versión deja claro a qué se refiere el pronombre?" },
      hints: {
        en: ["Find the pronoun and ask what it points back to.", "A clear revision names the person or thing, or rewords the sentence so only one meaning is possible. It keeps the original meaning."],
        es: ["Busca el pronombre y pregúntate a qué se refiere.", "Una buena versión nombra a la persona o la cosa, o cambia el orden para que solo haya un significado posible. Mantiene el sentido original."],
      },
      seconds: 35,
    },
    {
      bank: SHIFTS,
      ask: { en: "Choose the word that keeps the sentence consistent.", es: "Elige la palabra que mantiene la concordancia." },
      hints: {
        en: ["Find the noun or pronoun that the blank goes with.", "Keep the same person (first, second, or third) and the same number (singular or plural) all the way through the sentence."],
        es: ["Busca la palabra con la que debe concordar el espacio.", "Mantén la misma persona (primera, segunda o tercera) y el mismo número (singular o plural) en toda la oración."],
      },
      seconds: 15,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.nonrestrictive — level 1: a matching pair of commas, dashes or parentheses around extra information
// (Spanish: comas, rayas y paréntesis en incisos; the Spanish raya touches the words it encloses);
// level 2: whether the part needs commas at all, decided by the context (Spanish: explicativas van entre
// comas, especificativas no). The words never change between the choices, only the punctuation.

const ASIDE_MARKS: Bi<Entry>[] = [
  {
    en: ["", "My cousin, a talented drummer, joined the jazz band.", [["My cousin, a talented drummer joined the jazz band.", "missing-closing-mark"], ["My cousin—a talented drummer, joined the jazz band.", "mismatched-marks"], ["My cousin a talented, drummer joined the jazz band.", "mark-in-wrong-place"]], "The extra information is “a talented drummer.”", "Lift out “a talented drummer” and the sentence still works, so it needs a matching mark on each side."],
    es: ["", "Mi prima, una baterista excelente, se unió a la banda de jazz.", [["Mi prima, una baterista excelente se unió a la banda de jazz.", "missing-closing-mark"], ["Mi prima —una baterista excelente, se unió a la banda de jazz.", "mismatched-marks"], ["Mi prima una baterista, excelente se unió a la banda de jazz.", "mark-in-wrong-place"]], "El inciso es “una baterista excelente”.", "Si quitas “una baterista excelente”, la oración sigue funcionando, así que el inciso va entre dos signos iguales."],
  },
  {
    en: ["", "Our neighbor—who used to be a firefighter—teaches first aid classes.", [["Our neighbor—who used to be a firefighter, teaches first aid classes.", "mismatched-marks"], ["Our neighbor who used to be a firefighter—teaches first aid classes.", "missing-opening-mark"], ["Our neighbor—who used to be—a firefighter teaches first aid classes.", "mark-in-wrong-place"]], "The extra information is “who used to be a firefighter.”", "The aside starts with a dash, so it must end with a dash too."],
    es: ["", "Nuestro vecino —que antes era bombero— da clases de primeros auxilios.", [["Nuestro vecino —que antes era bombero, da clases de primeros auxilios.", "mismatched-marks"], ["Nuestro vecino que antes era bombero— da clases de primeros auxilios.", "missing-opening-mark"], ["Nuestro vecino —que antes era— bombero da clases de primeros auxilios.", "mark-in-wrong-place"]], "El inciso es “que antes era bombero”.", "El inciso abre con raya, así que también cierra con raya."],
  },
  {
    en: ["", "The Amazon River (the second-longest river on Earth) flows through Brazil.", [["The Amazon River (the second-longest river on Earth flows through Brazil).", "mark-in-wrong-place"], ["The Amazon River (the second-longest river on Earth, flows through Brazil.", "mismatched-marks"], ["The Amazon River the second-longest river on Earth) flows through Brazil.", "missing-opening-mark"]], "The extra information is “the second-longest river on Earth.”", "The parentheses go around the extra information only, not around the verb."],
    es: ["", "El río Amazonas (el segundo más largo del mundo) atraviesa Brasil.", [["El río Amazonas (el segundo más largo del mundo atraviesa Brasil).", "mark-in-wrong-place"], ["El río Amazonas (el segundo más largo del mundo, atraviesa Brasil.", "mismatched-marks"], ["El río Amazonas el segundo más largo del mundo) atraviesa Brasil.", "missing-opening-mark"]], "El inciso es “el segundo más largo del mundo”.", "Los paréntesis encierran solo el inciso, no el verbo."],
  },
  {
    en: ["", "Mrs. Patel, our music teacher, plays the cello.", [["Mrs. Patel our music teacher, plays the cello.", "missing-opening-mark"], ["Mrs. Patel, our music teacher plays the cello.", "missing-closing-mark"], ["Mrs. Patel, our music teacher—plays the cello.", "mismatched-marks"]], "The extra information is “our music teacher.”", "“Our music teacher” renames Mrs. Patel, so it needs a comma before and after."],
    es: ["", "La señora Patel, nuestra maestra de música, toca el violonchelo.", [["La señora Patel nuestra maestra de música, toca el violonchelo.", "missing-opening-mark"], ["La señora Patel, nuestra maestra de música toca el violonchelo.", "missing-closing-mark"], ["La señora Patel, nuestra maestra de música— toca el violonchelo.", "mismatched-marks"]], "El inciso es “nuestra maestra de música”.", "“Nuestra maestra de música” explica quién es la señora Patel, así que va entre dos comas."],
  },
  {
    en: ["", "The final score—52 to 51—surprised everyone.", [["The final score—52 to 51, surprised everyone.", "mismatched-marks"], ["The final score 52 to 51—surprised everyone.", "missing-opening-mark"], ["The final—score 52 to 51—surprised everyone.", "mark-in-wrong-place"]], "The extra information is the score itself.", "Two dashes go around “52 to 51.”"],
    es: ["", "El marcador final —52 a 51— sorprendió a todos.", [["El marcador final —52 a 51, sorprendió a todos.", "mismatched-marks"], ["El marcador final 52 a 51— sorprendió a todos.", "missing-opening-mark"], ["El marcador —final 52 a 51— sorprendió a todos.", "mark-in-wrong-place"]], "El inciso es el resultado del partido.", "Dos rayas encierran “52 a 51”."],
  },
  {
    en: ["", "Saturn, the planet famous for its rings, is a gas giant.", [["Saturn, the planet famous for its rings is a gas giant.", "missing-closing-mark"], ["Saturn the planet, famous for its rings, is a gas giant.", "mark-in-wrong-place"], ["Saturn (the planet famous for its rings, is a gas giant.", "mismatched-marks"]], "The extra information is “the planet famous for its rings.”", "The whole phrase that renames Saturn goes between two commas."],
    es: ["", "Saturno, el planeta famoso por sus anillos, es un gigante gaseoso.", [["Saturno, el planeta famoso por sus anillos es un gigante gaseoso.", "missing-closing-mark"], ["Saturno el planeta, famoso por sus anillos, es un gigante gaseoso.", "mark-in-wrong-place"], ["Saturno (el planeta famoso por sus anillos, es un gigante gaseoso.", "mismatched-marks"]], "El inciso es “el planeta famoso por sus anillos”.", "Toda la frase que explica qué es Saturno va entre dos comas."],
  },
  {
    en: ["", "My grandmother's recipe (she got it from her mother) uses fresh ginger.", [["My grandmother's recipe (she got it from her mother uses fresh ginger).", "mark-in-wrong-place"], ["My grandmother's recipe (she got it from her mother uses fresh ginger.", "missing-closing-mark"], ["My grandmother's recipe—she got it from her mother) uses fresh ginger.", "mismatched-marks"]], "The extra information is “she got it from her mother.”", "The parentheses close right after the extra information."],
    es: ["", "La receta de mi abuela (la aprendió de su mamá) lleva jengibre fresco.", [["La receta de mi abuela (la aprendió de su mamá lleva jengibre fresco).", "mark-in-wrong-place"], ["La receta de mi abuela (la aprendió de su mamá lleva jengibre fresco.", "missing-closing-mark"], ["La receta de mi abuela —la aprendió de su mamá) lleva jengibre fresco.", "mismatched-marks"]], "El inciso es “la aprendió de su mamá”.", "El paréntesis se cierra justo después del inciso."],
  },
  {
    en: ["", "Our team's goalie, Hana Sato, blocked every shot.", [["Our team's goalie, Hana Sato blocked every shot.", "missing-closing-mark"], ["Our team's goalie Hana, Sato blocked every shot.", "mark-in-wrong-place"], ["Our team's goalie (Hana Sato, blocked every shot.", "mismatched-marks"]], "The team has one goalie, so her name is extra information.", "“Hana Sato” goes between two commas."],
    es: ["", "La portera del equipo, Hana Sato, detuvo todos los tiros.", [["La portera del equipo, Hana Sato detuvo todos los tiros.", "missing-closing-mark"], ["La portera del equipo Hana, Sato detuvo todos los tiros.", "mark-in-wrong-place"], ["La portera del equipo (Hana Sato, detuvo todos los tiros.", "mismatched-marks"]], "El equipo tiene una sola portera, así que su nombre es un inciso.", "“Hana Sato” va entre dos comas."],
  },
  {
    en: ["", "The trail, which is steep in places, ends at a waterfall.", [["The trail, which is steep in places ends at a waterfall.", "missing-closing-mark"], ["The trail—which is steep in places, ends at a waterfall.", "mismatched-marks"], ["The trail which, is steep in places, ends at a waterfall.", "mark-in-wrong-place"]], "The extra information is “which is steep in places.”", "The comma goes before “which” and after “places.”"],
    es: ["", "El sendero, que es empinado en algunas partes, termina en una cascada.", [["El sendero, que es empinado en algunas partes termina en una cascada.", "missing-closing-mark"], ["El sendero —que es empinado en algunas partes, termina en una cascada.", "mismatched-marks"], ["El sendero que, es empinado en algunas partes, termina en una cascada.", "mark-in-wrong-place"]], "El inciso es “que es empinado en algunas partes”.", "La coma va antes de “que” y después de “partes”."],
  },
  {
    en: ["", "My brother—the pickiest eater I know—asked for more broccoli.", [["My brother—the pickiest eater I know, asked for more broccoli.", "mismatched-marks"], ["My brother the pickiest eater I know—asked for more broccoli.", "missing-opening-mark"], ["My brother—the pickiest eater—I know asked for more broccoli.", "mark-in-wrong-place"]], "The extra information is “the pickiest eater I know.”", "The second dash comes after “I know,” the end of the aside."],
    es: ["", "Mi hermano —el más quisquilloso para comer— pidió más brócoli.", [["Mi hermano —el más quisquilloso para comer, pidió más brócoli.", "mismatched-marks"], ["Mi hermano el más quisquilloso para comer— pidió más brócoli.", "missing-opening-mark"], ["Mi hermano —el más quisquilloso— para comer pidió más brócoli.", "mark-in-wrong-place"]], "El inciso es “el más quisquilloso para comer”.", "La segunda raya va después de “comer”, donde termina el inciso."],
  },
  {
    en: ["", "The field trip (if it doesn't rain) will be on Friday.", [["The field trip (if it doesn't rain will be on Friday).", "mark-in-wrong-place"], ["The field trip (if it doesn't rain, will be on Friday.", "mismatched-marks"], ["The field trip if it doesn't rain) will be on Friday.", "missing-opening-mark"]], "The extra information is “if it doesn't rain.”", "The parentheses go around “if it doesn't rain” only."],
    es: ["", "La excursión (si no llueve) será el viernes.", [["La excursión (si no llueve será el viernes).", "mark-in-wrong-place"], ["La excursión (si no llueve, será el viernes.", "mismatched-marks"], ["La excursión si no llueve) será el viernes.", "missing-opening-mark"]], "El inciso es “si no llueve”.", "Los paréntesis encierran solo “si no llueve”."],
  },
  {
    en: ["", "Dr. Okafor, a scientist who studies whales, visited our class.", [["Dr. Okafor, a scientist who studies whales visited our class.", "missing-closing-mark"], ["Dr. Okafor—a scientist who studies whales, visited our class.", "mismatched-marks"], ["Dr. Okafor a scientist, who studies whales, visited our class.", "mark-in-wrong-place"]], "The extra information is “a scientist who studies whales.”", "The whole phrase that tells who Dr. Okafor is goes between two commas."],
    es: ["", "La doctora Okafor, una científica que estudia las ballenas, visitó nuestra clase.", [["La doctora Okafor, una científica que estudia las ballenas visitó nuestra clase.", "missing-closing-mark"], ["La doctora Okafor —una científica que estudia las ballenas, visitó nuestra clase.", "mismatched-marks"], ["La doctora Okafor una científica, que estudia las ballenas, visitó nuestra clase.", "mark-in-wrong-place"]], "El inciso es “una científica que estudia las ballenas”.", "Toda la frase que dice quién es la doctora Okafor va entre dos comas."],
  },
  {
    en: ["", "This painting, which my sister made in art class, won a ribbon.", [["This painting, which my sister made in art class won a ribbon.", "missing-closing-mark"], ["This painting (which my sister made in art class, won a ribbon.", "mismatched-marks"], ["This painting which, my sister made in art class, won a ribbon.", "mark-in-wrong-place"]], "The extra information is “which my sister made in art class.”", "The comma goes before “which” and after “class.”"],
    es: ["", "Este cuadro, que pintó mi hermana en clase de arte, ganó un listón.", [["Este cuadro, que pintó mi hermana en clase de arte ganó un listón.", "missing-closing-mark"], ["Este cuadro (que pintó mi hermana en clase de arte, ganó un listón.", "mismatched-marks"], ["Este cuadro que, pintó mi hermana en clase de arte, ganó un listón.", "mark-in-wrong-place"]], "El inciso es “que pintó mi hermana en clase de arte”.", "La coma va antes de “que” y después de “arte”."],
  },
  {
    en: ["", "The recipe calls for one cup of flour (about 120 grams).", [["The recipe calls for one cup of flour (about 120 grams.", "missing-closing-mark"], ["The recipe calls for one cup (of flour about 120 grams).", "mark-in-wrong-place"], ["The recipe calls for one cup of flour—about 120 grams).", "mismatched-marks"]], "The extra information is “about 120 grams.”", "The parentheses open before “about” and close before the period."],
    es: ["", "La receta lleva una taza de harina (unos 120 gramos).", [["La receta lleva una taza de harina (unos 120 gramos.", "missing-closing-mark"], ["La receta lleva una taza (de harina unos 120 gramos).", "mark-in-wrong-place"], ["La receta lleva una taza de harina —unos 120 gramos).", "mismatched-marks"]], "El inciso es “unos 120 gramos”.", "El paréntesis abre antes de “unos” y cierra antes del punto."],
  },
];

const RESTRICTIVE: Bi<Entry>[] = [
  {
    en: ["Ms. Lee has only one daughter.", "Her daughter, who plays the cello, is in high school.", [["Her daughter who plays the cello is in high school.", "missing-commas-nonrestrictive"], ["Her daughter, who plays the cello is in high school.", "missing-closing-mark"]], "She has one daughter, so “her daughter” already tells which one.", "“Who plays the cello” only adds information, so it goes between commas."],
    es: ["La señora Lee tiene una sola hija.", "Su hija, que toca el violonchelo, está en la preparatoria.", [["Su hija que toca el violonchelo está en la preparatoria.", "missing-commas-nonrestrictive"], ["Su hija, que toca el violonchelo está en la preparatoria.", "missing-closing-mark"]], "Tiene una sola hija, así que “su hija” ya dice de quién se habla.", "“Que toca el violonchelo” solo agrega información: es explicativa y va entre comas."],
  },
  {
    en: ["Only some of the apples were ripe.", "The apples that were ripe went into the pie.", [["The apples, that were ripe, went into the pie.", "commas-around-restrictive"], ["The apples that were ripe, went into the pie.", "comma-before-verb"]], "Only some apples were ripe, so “that were ripe” tells which apples.", "The part tells which apples, so it gets no commas."],
    es: ["Solo algunas manzanas estaban maduras.", "Las manzanas que estaban maduras fueron para el pastel.", [["Las manzanas, que estaban maduras, fueron para el pastel.", "commas-around-restrictive"], ["Las manzanas que estaban maduras, fueron para el pastel.", "comma-before-verb"]], "Solo algunas estaban maduras, así que la parte dice cuáles.", "La parte dice cuáles manzanas: es especificativa y no lleva comas."],
  },
  {
    en: ["Our school has three buses.", "The bus that goes to Elm Street is always late.", [["The bus, that goes to Elm Street, is always late.", "commas-around-restrictive"], ["The bus that goes to Elm Street, is always late.", "comma-before-verb"]], "There are three buses, so “that goes to Elm Street” tells which bus.", "The part tells which bus, so it gets no commas."],
    es: ["Solo algunos alumnos estaban cansados.", "Los alumnos que estaban cansados se fueron a casa.", [["Los alumnos, que estaban cansados, se fueron a casa.", "commas-around-restrictive"], ["Los alumnos que estaban cansados, se fueron a casa.", "comma-before-verb"]], "No todos estaban cansados. La parte dice cuáles alumnos se fueron.", "La parte dice cuáles alumnos: es especificativa y no lleva comas. Con comas, diría que todos estaban cansados y todos se fueron."],
  },
  {
    en: ["Leo has one older brother.", "His older brother, who loves chess, is teaching him to play.", [["His older brother who loves chess is teaching him to play.", "missing-commas-nonrestrictive"], ["His older brother, who loves chess is teaching him to play.", "missing-closing-mark"]], "Leo has only one older brother, so we already know who he is.", "“Who loves chess” only adds information, so it goes between commas."],
    es: ["Leo tiene un solo hermano mayor.", "Su hermano mayor, que es fanático del ajedrez, le está enseñando a jugar.", [["Su hermano mayor que es fanático del ajedrez le está enseñando a jugar.", "missing-commas-nonrestrictive"], ["Su hermano mayor, que es fanático del ajedrez le está enseñando a jugar.", "missing-closing-mark"]], "Leo tiene un solo hermano mayor, así que ya sabemos quién es.", "“Que es fanático del ajedrez” solo agrega información: es explicativa y va entre comas."],
  },
  {
    en: ["Many students entered the science fair.", "Students who finished their projects early helped set up the tables.", [["Students, who finished their projects early, helped set up the tables.", "commas-around-restrictive"], ["Students who finished their projects early, helped set up the tables.", "comma-before-verb"]], "Not every student finished early. The part tells which students.", "The part tells which students, so it gets no commas."],
    es: ["Nuestra escuela tiene tres autobuses.", "El autobús que va a la calle Olmo siempre llega tarde.", [["El autobús, que va a la calle Olmo, siempre llega tarde.", "commas-around-restrictive"], ["El autobús que va a la calle Olmo, siempre llega tarde.", "comma-before-verb"]], "Hay tres autobuses, así que la parte dice de cuál se habla.", "La parte dice cuál autobús: es especificativa y no lleva comas."],
  },
  {
    en: ["The Pacific Ocean is the largest ocean on Earth.", "The Pacific Ocean, which covers about a third of the planet, has thousands of islands.", [["The Pacific Ocean which covers about a third of the planet has thousands of islands.", "missing-commas-nonrestrictive"], ["The Pacific Ocean, which covers about a third of the planet has thousands of islands.", "missing-closing-mark"]], "There is only one Pacific Ocean, so its name already tells which one.", "“Which covers about a third of the planet” only adds information, so it goes between commas."],
    es: ["El océano Pacífico es el más grande de la Tierra.", "El océano Pacífico, que cubre cerca de un tercio del planeta, tiene miles de islas.", [["El océano Pacífico que cubre cerca de un tercio del planeta tiene miles de islas.", "missing-commas-nonrestrictive"], ["El océano Pacífico, que cubre cerca de un tercio del planeta tiene miles de islas.", "missing-closing-mark"]], "Hay un solo océano Pacífico, así que su nombre ya dice de cuál se habla.", "La parte solo agrega información: es explicativa y va entre comas."],
  },
  {
    en: ["Mr. Diaz has two dogs, a poodle and a beagle.", "The dog that barks at the mail carrier is the beagle.", [["The dog, that barks at the mail carrier, is the beagle.", "commas-around-restrictive"], ["The dog that barks at the mail carrier, is the beagle.", "comma-before-verb"]], "He has two dogs, so “that barks at the mail carrier” tells which dog.", "The part tells which dog, so it gets no commas."],
    es: ["El señor Díaz tiene dos perros, un poodle y un beagle.", "El perro que le ladra al cartero es el beagle.", [["El perro, que le ladra al cartero, es el beagle.", "commas-around-restrictive"], ["El perro que le ladra al cartero, es el beagle.", "comma-before-verb"]], "Tiene dos perros, así que la parte dice de cuál se habla.", "La parte dice cuál perro: es especificativa y no lleva comas."],
  },
  {
    en: ["Ana's mom bakes for the whole street.", "Ana's mom, who owns a bakery, made the birthday cake.", [["Ana's mom who owns a bakery made the birthday cake.", "missing-commas-nonrestrictive"], ["Ana's mom, who owns a bakery made the birthday cake.", "missing-closing-mark"]], "Ana has one mom, so “Ana's mom” already tells who she is.", "“Who owns a bakery” only adds information, so it goes between commas."],
    es: ["La mamá de Ana hornea para toda la cuadra.", "La mamá de Ana, que tiene una panadería, hizo el pastel de cumpleaños.", [["La mamá de Ana que tiene una panadería hizo el pastel de cumpleaños.", "missing-commas-nonrestrictive"], ["La mamá de Ana, que tiene una panadería hizo el pastel de cumpleaños.", "missing-closing-mark"]], "Ana tiene una sola mamá, así que ya sabemos de quién se habla.", "“Que tiene una panadería” solo agrega información: es explicativa y va entre comas."],
  },
  {
    en: ["Some library books have a red sticker.", "Books that have a red sticker can be checked out for two weeks.", [["Books, that have a red sticker, can be checked out for two weeks.", "commas-around-restrictive"], ["Books that have a red sticker, can be checked out for two weeks.", "comma-before-verb"]], "Only some books have the sticker, so the part tells which books.", "The part tells which books, so it gets no commas."],
    es: ["Algunos libros de la biblioteca tienen una etiqueta roja.", "Los libros que tienen etiqueta roja se prestan por dos semanas.", [["Los libros, que tienen etiqueta roja, se prestan por dos semanas.", "commas-around-restrictive"], ["Los libros que tienen etiqueta roja, se prestan por dos semanas.", "comma-before-verb"]], "Solo algunos libros tienen la etiqueta, así que la parte dice cuáles.", "La parte dice cuáles libros: es especificativa y no lleva comas."],
  },
  {
    en: ["Mount Everest is the tallest mountain above sea level.", "Mount Everest, which sits on the border of Nepal and China, draws climbers every spring.", [["Mount Everest which sits on the border of Nepal and China draws climbers every spring.", "missing-commas-nonrestrictive"], ["Mount Everest, which sits on the border of Nepal and China draws climbers every spring.", "missing-closing-mark"]], "There is only one Mount Everest, so its name already tells which one.", "The part only adds information, so it goes between commas."],
    es: ["El monte Everest es la montaña más alta sobre el nivel del mar.", "El monte Everest, que está en la frontera entre Nepal y China, atrae a escaladores cada primavera.", [["El monte Everest que está en la frontera entre Nepal y China atrae a escaladores cada primavera.", "missing-commas-nonrestrictive"], ["El monte Everest, que está en la frontera entre Nepal y China atrae a escaladores cada primavera.", "missing-closing-mark"]], "Hay un solo monte Everest, así que su nombre ya dice de cuál se habla.", "La parte solo agrega información: es explicativa y va entre comas."],
  },
  {
    en: ["Two of the runners fell during the race.", "The runner who fell first got up and finished.", [["The runner, who fell first, got up and finished.", "commas-around-restrictive"], ["The runner who fell first, got up and finished.", "comma-before-verb"]], "Two runners fell, so “who fell first” tells which runner.", "The part tells which runner, so it gets no commas."],
    es: ["Dos corredores se cayeron durante la carrera.", "El corredor que se cayó primero se levantó y terminó.", [["El corredor, que se cayó primero, se levantó y terminó.", "commas-around-restrictive"], ["El corredor que se cayó primero, se levantó y terminó.", "comma-before-verb"]], "Se cayeron dos, así que la parte dice de cuál se habla.", "La parte dice cuál corredor: es especificativa y no lleva comas."],
  },
  {
    en: ["Our town has one public pool.", "The pool, which opens in June, has a new slide.", [["The pool which opens in June has a new slide.", "missing-commas-nonrestrictive"], ["The pool, which opens in June has a new slide.", "missing-closing-mark"]], "The town has one pool, so “the pool” already tells which one.", "“Which opens in June” only adds information, so it goes between commas."],
    es: ["Nuestro pueblo tiene una sola piscina pública.", "La piscina, que abre en junio, tiene un tobogán nuevo.", [["La piscina que abre en junio tiene un tobogán nuevo.", "missing-commas-nonrestrictive"], ["La piscina, que abre en junio tiene un tobogán nuevo.", "missing-closing-mark"]], "El pueblo tiene una sola piscina, así que ya sabemos de cuál se habla.", "“Que abre en junio” solo agrega información: es explicativa y va entre comas."],
  },
  {
    en: ["Some of the cookies had nuts.", "The cookies that had nuts were on a separate plate.", [["The cookies, that had nuts, were on a separate plate.", "commas-around-restrictive"], ["The cookies that had nuts, were on a separate plate.", "comma-before-verb"]], "Only some cookies had nuts, so the part tells which cookies.", "The part tells which cookies, so it gets no commas."],
    es: ["Algunas galletas tenían nueces.", "Las galletas que tenían nueces estaban en otro plato.", [["Las galletas, que tenían nueces, estaban en otro plato.", "commas-around-restrictive"], ["Las galletas que tenían nueces, estaban en otro plato.", "comma-before-verb"]], "Solo algunas galletas tenían nueces, así que la parte dice cuáles.", "La parte dice cuáles galletas: es especificativa y no lleva comas."],
  },
  {
    en: ["Sofia has one science teacher.", "Her science teacher, Mr. Kim, retires this year.", [["Her science teacher Mr. Kim retires this year.", "missing-commas-nonrestrictive"], ["Her science teacher, Mr. Kim retires this year.", "missing-closing-mark"]], "She has one science teacher, so his name only adds information.", "“Mr. Kim” only adds information, so it goes between commas."],
    es: ["Sofía tiene un solo maestro de ciencias.", "Su maestro de ciencias, el señor Kim, se jubila este año.", [["Su maestro de ciencias el señor Kim se jubila este año.", "missing-commas-nonrestrictive"], ["Su maestro de ciencias, el señor Kim se jubila este año.", "missing-closing-mark"]], "Tiene un solo maestro de ciencias, así que su nombre solo agrega información.", "“El señor Kim” solo agrega información, así que va entre comas."],
  },
];

const NONRESTRICTIVE = skill(
  { id: "e.nonrestrictive", grade: "6", title: { en: "Commas, dashes, and parentheses for asides", es: "Comas, rayas y paréntesis en incisos" }, standard: "L.6.2a", prereqs: ["e.commas"] },
  [
    {
      bank: ASIDE_MARKS,
      ask: PUNCTUATED,
      hints: {
        en: ["Find the extra information, the part you could lift out and still have a complete sentence.", "Extra information needs a mark on both sides: two commas, two dashes, or a pair of parentheses. The two marks must match."],
        es: ["Busca el inciso: la parte que podrías quitar y la oración seguiría completa.", "Un inciso va entre dos signos iguales: dos comas, dos rayas o un par de paréntesis. La raya va pegada a la primera y a la última palabra del inciso."],
      },
      seconds: 25,
    },
    {
      bank: RESTRICTIVE,
      ask: PUNCTUATED,
      hints: {
        en: ["Read the first sentence. Does the extra part tell which one, or is it just added information?", "If the part is needed to tell which one, use no commas. If it only adds information about someone or something already clear, set it off with commas. Never put a single comma between the subject and its verb."],
        es: ["Lee la primera oración. ¿La parte dice de cuál se habla, o solo agrega información?", "Si la parte es necesaria para saber de cuál se habla (especificativa), no lleva comas. Si solo agrega información sobre algo que ya está claro (explicativa), va entre comas. Nunca pongas una sola coma entre el sujeto y el verbo."],
      },
      seconds: 30,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.confused.words — words that sound or look alike. English: affect / effect, than / then, lose / loose,
// principal / principle… Spanish: sino / si no, haya / halla, hierva / hierba, también / tan bien,
// sobre todo / sobretodo, grabar / gravar, savia / sabia, and accents that do or do not belong.
// Tags: sound-alike-wrong-meaning (a homophone), look-alike-wrong-meaning, wrong-part-of-speech,
// split-compound (one word written as two, or the reverse), missing-accent, extra-accent, misspelling.

const CONFUSED_1: Bi<Entry>[] = [
  {
    en: ["The cold weather can ___ how fast plants grow.", "affect", [["effect", "wrong-part-of-speech"], ["afect", "misspelling"]], "The blank needs a verb: the weather does something to the plants.", "“Affect” is the verb: to change something. “Effect” is usually a noun: a result."],
    es: ["No quiero jugo, ___ agua.", "sino", [["si no", "split-compound"], ["sinó", "misspelling"]], "La oración corrige: no es jugo, es agua.", "“Sino” une dos ideas cuando una corrige a la otra. “Si no” significa “en caso de que no”."],
  },
  {
    en: ["The new rule had a big ___ on our lunch schedule.", "effect", [["affect", "wrong-part-of-speech"], ["efect", "misspelling"]], "The blank comes after “a big,” so it needs a noun.", "“Effect” is the noun: a result."],
    es: ["___ llegas a tiempo, perderás el autobús.", "Si no", [["Sino", "split-compound"], ["Sinó", "misspelling"]], "Prueba “en caso de que no”: “En caso de que no llegues…”.", "“Si no” significa “en caso de que no”: es una condición."],
  },
  {
    en: ["Maya is two inches taller ___ her brother.", "than", [["then", "sound-alike-wrong-meaning"], ["that", "look-alike-wrong-meaning"]], "The sentence compares two people.", "“Than” compares. “Then” tells when."],
    es: ["Espero que ___ buena comida en la fiesta.", "haya", [["halla", "sound-alike-wrong-meaning"], ["aya", "sound-alike-wrong-meaning"]], "La palabra es del verbo haber: que exista.", "“Haya” es del verbo haber. “Halla” es del verbo hallar, encontrar."],
  },
  {
    en: ["We finished dinner, and ___ we played a board game.", "then", [["than", "sound-alike-wrong-meaning"], ["them", "look-alike-wrong-meaning"]], "The blank tells what happened next.", "“Then” tells when. “Than” compares."],
    es: ["Mi hermana siempre ___ las llaves que yo pierdo.", "halla", [["haya", "sound-alike-wrong-meaning"], ["aya", "sound-alike-wrong-meaning"]], "La palabra significa encuentra.", "“Halla” es del verbo hallar: encontrar."],
  },
  {
    en: ["Everyone ___ Jordan went on the field trip.", "except", [["accept", "sound-alike-wrong-meaning"], ["expect", "look-alike-wrong-meaning"]], "The sentence leaves one person out.", "“Except” means leaving out. “Accept” means to receive or agree."],
    es: ["Espera a que el agua ___ para echar la pasta.", "hierva", [["hierba", "sound-alike-wrong-meaning"], ["ierva", "misspelling"]], "La palabra es del verbo hervir.", "“Hierva” (con v) es del verbo hervir. La “hierba” (con b) es una planta."],
  },
  {
    en: ["Please ___ my apology for being late.", "accept", [["except", "sound-alike-wrong-meaning"], ["expect", "look-alike-wrong-meaning"]], "The blank needs a verb meaning to receive.", "“Accept” means to receive or agree to something."],
    es: ["El conejo comía ___ en el jardín.", "hierba", [["hierva", "sound-alike-wrong-meaning"], ["ierba", "misspelling"]], "La palabra es una planta verde.", "La “hierba” (con b) es una planta."],
  },
  {
    en: ["If you ___ your library card, you will need a new one.", "lose", [["loose", "look-alike-wrong-meaning"], ["loss", "wrong-part-of-speech"]], "The blank needs a verb meaning to stop having something.", "“Lose” (one o) is the verb. “Loose” (two o's) means not tight."],
    es: ["Mi abuela me enseñó a ___ botones en la camisa.", "coser", [["cocer", "sound-alike-wrong-meaning"], ["cozer", "misspelling"]], "La palabra trata de aguja e hilo.", "“Coser” (con s) es unir con aguja e hilo. “Cocer” (con c) es cocinar."],
  },
  {
    en: ["My tooth is ___, so I chew on the other side.", "loose", [["lose", "look-alike-wrong-meaning"], ["loss", "wrong-part-of-speech"]], "The blank describes the tooth: it wiggles.", "“Loose” means not tight."],
    es: ["Hay que ___ las papas durante veinte minutos.", "cocer", [["coser", "sound-alike-wrong-meaning"], ["cozer", "misspelling"]], "La palabra trata de cocinar.", "“Cocer” (con c) es cocinar en agua o al fuego."],
  },
  {
    en: ["Can you give me some ___ about which book to read?", "advice", [["advise", "wrong-part-of-speech"], ["advize", "misspelling"]], "The blank comes after “some,” so it needs a noun.", "“Advice” (with c) is the noun. “Advise” (with s) is the verb."],
    es: ["___ mucho haber llegado tarde.", "Siento", [["Ciento", "sound-alike-wrong-meaning"], ["Sientto", "misspelling"]], "La palabra es del verbo sentir.", "“Siento” es del verbo sentir. “Ciento” es un número."],
  },
  {
    en: ["The coach will ___ us to drink plenty of water.", "advise", [["advice", "wrong-part-of-speech"], ["advize", "misspelling"]], "The blank comes after “will,” so it needs a verb.", "“Advise” is the verb: to give advice."],
    es: ["El libro tiene ___ veinte páginas.", "ciento", [["siento", "sound-alike-wrong-meaning"], ["sciento", "misspelling"]], "La palabra es un número: cien más veinte.", "“Ciento” es el número: ciento veinte."],
  },
  {
    en: ["Take a deep ___ before you start your speech.", "breath", [["breathe", "wrong-part-of-speech"], ["breth", "misspelling"]], "The blank comes after “a deep,” so it needs a noun.", "“Breath” (no e at the end) is the noun. “Breathe” is the verb."],
    es: ["Juan, ¿___ a la fiesta el sábado?", "vienes", [["bienes", "sound-alike-wrong-meaning"], ["viénes", "extra-accent"]], "La palabra es del verbo venir.", "“Vienes” (con v) es del verbo venir. Los “bienes” (con b) son cosas que alguien posee."],
  },
  {
    en: ["Fish ___ through their gills.", "breathe", [["breath", "wrong-part-of-speech"], ["breeth", "misspelling"]], "The blank needs a verb: what fish do.", "“Breathe” (with e at the end) is the verb."],
    es: ["Ayer mi tía me ___ un libro de cuentos.", "dio", [["dió", "extra-accent"], ["dío", "extra-accent"]], "La palabra tiene una sola sílaba.", "Las palabras de una sílaba como “dio”, “fue” y “vio” no llevan tilde."],
  },
  {
    en: ["The library was ___ except for the hum of the lights.", "quiet", [["quite", "look-alike-wrong-meaning"], ["quit", "look-alike-wrong-meaning"]], "The blank describes the library: no noise.", "“Quiet” means silent. “Quite” means very or completely."],
    es: ["Sirvieron chocolate caliente en una ___.", "taza", [["tasa", "sound-alike-wrong-meaning"], ["tassa", "misspelling"]], "La palabra es un recipiente para beber.", "Una “taza” (con z) sirve para beber. Una “tasa” (con s) es una medida o un impuesto."],
  },
  {
    en: ["We are not sure ___ the game will be canceled.", "whether", [["weather", "sound-alike-wrong-meaning"], ["wheather", "misspelling"]], "The blank introduces a choice: yes or no.", "“Whether” introduces a choice. “Weather” is rain, sun, and wind."],
    es: ["Los gatos salen de noche a ___ ratones.", "cazar", [["casar", "sound-alike-wrong-meaning"], ["kazar", "misspelling"]], "La palabra significa atrapar animales.", "“Cazar” (con z) es atrapar animales. “Casar” (con s) es unir en matrimonio."],
  },
  {
    en: ["We walked ___ the bakery on our way home.", "past", [["passed", "sound-alike-wrong-meaning"], ["pased", "misspelling"]], "The blank tells where you walked: beyond the bakery.", "“Past” tells where or when. “Passed” is a verb: “We passed the bakery.”"],
    es: ["Mi abuelo me dio un fuerte ___ cuando llegué.", "abrazo", [["abraso", "sound-alike-wrong-meaning"], ["abrazso", "misspelling"]], "La palabra es un gesto de cariño con los brazos.", "“Abrazo” (con z) viene de brazo. “Abrasar” (con s) es quemar."],
  },
  {
    en: ["After the long hike, everyone was ready for ___.", "dessert", [["desert", "look-alike-wrong-meaning"], ["dessart", "misspelling"]], "The blank names something sweet you eat after a meal.", "“Dessert” (two s's) is a sweet course. A “desert” (one s) is a dry land."],
    es: ["Una ___ enorme mojó a los surfistas.", "ola", [["hola", "sound-alike-wrong-meaning"], ["olla", "look-alike-wrong-meaning"]], "La palabra es agua del mar que se levanta.", "Una “ola” es agua del mar en movimiento. “Hola” es un saludo."],
  },
];

const CONFUSED_2: Bi<Entry>[] = [
  {
    en: ["The ___ announced that school would close early.", "principal", [["principle", "sound-alike-wrong-meaning"], ["principel", "misspelling"]], "The blank names a person who runs a school.", "The “principal” is the head of a school. A “principle” is a rule or belief."],
    es: ["Ana canta muy bien, y ___ toca la guitarra.", "también", [["tan bien", "split-compound"], ["tambien", "missing-accent"]], "La palabra significa además.", "“También” significa además. “Tan bien” significa de manera muy buena."],
  },
  {
    en: ["Honesty is an important ___ in our family.", "principle", [["principal", "sound-alike-wrong-meaning"], ["principel", "misspelling"]], "The blank names a belief or rule.", "A “principle” is a rule or belief."],
    es: ["Nunca había visto a alguien bailar ___.", "tan bien", [["también", "split-compound"], ["tanbien", "misspelling"]], "La palabra describe cómo baila: de una manera muy buena.", "“Tan bien” son dos palabras: “tan” más “bien”."],
  },
  {
    en: ["The bus stayed ___ while the students got on.", "stationary", [["stationery", "sound-alike-wrong-meaning"], ["stationairy", "misspelling"]], "The blank describes the bus: not moving.", "“Stationary” (with a) means not moving. “Stationery” (with e) is writing paper."],
    es: ["Llegaron Luis, Marta y los ___.", "demás", [["de más", "split-compound"], ["demas", "missing-accent"]], "La palabra significa los otros.", "“Los demás” significa los otros. “De más” significa de sobra."],
  },
  {
    en: ["Grandma keeps her letters and ___ in a wooden box.", "stationery", [["stationary", "sound-alike-wrong-meaning"], ["stationairy", "misspelling"]], "The blank names writing paper and envelopes.", "“Stationery” (with e) is paper for letters."],
    es: ["Compré dos boletos ___, por si alguien más quiere venir.", "de más", [["demás", "split-compound"], ["dé más", "extra-accent"]], "La palabra significa que sobran.", "“De más” significa de sobra."],
  },
  {
    en: ["Jamal gave his sister a ___ on her science project.", "compliment", [["complement", "sound-alike-wrong-meaning"], ["complament", "misspelling"]], "The blank names kind words of praise.", "A “compliment” (with i) is praise. A “complement” completes something."],
    es: ["Me gustan todas las frutas, ___ el mango.", "sobre todo", [["sobretodo", "split-compound"], ["sobre-todo", "misspelling"]], "La palabra significa especialmente.", "“Sobre todo” (separado) significa especialmente. Un “sobretodo” es un abrigo."],
  },
  {
    en: ["The red scarf is a nice ___ to her blue coat.", "complement", [["compliment", "sound-alike-wrong-meaning"], ["complament", "misspelling"]], "The blank names something that goes well with the coat and completes it.", "A “complement” (with e) completes something."],
    es: ["En invierno mi abuelo usa un ___ de lana.", "sobretodo", [["sobre todo", "split-compound"], ["sobretodó", "extra-accent"]], "La palabra es una prenda de ropa: un abrigo largo.", "Un “sobretodo” (junto) es un abrigo largo."],
  },
  {
    en: ["After the fall, the skater was ___ but dizzy.", "conscious", [["conscience", "look-alike-wrong-meaning"], ["concious", "misspelling"]], "The blank describes the skater: awake and aware.", "“Conscious” means awake and aware. Your “conscience” is your sense of right and wrong."],
    es: ["Estudiaste poco, ___ no te quejes de la nota.", "conque", [["con que", "split-compound"], ["con qué", "extra-accent"]], "La palabra significa “así que”.", "“Conque” (junto) significa así que."],
  },
  {
    en: ["My ___ told me to return the extra change.", "conscience", [["conscious", "look-alike-wrong-meaning"], ["concience", "misspelling"]], "The blank names the inner sense of right and wrong.", "Your “conscience” tells you right from wrong."],
    es: ["Mi papá ___ el video de la obra de teatro.", "grabó", [["gravó", "sound-alike-wrong-meaning"], ["grabo", "missing-accent"]], "La palabra es del verbo que significa registrar imágenes o sonido.", "“Grabar” (con b) es registrar imágenes o sonido. “Gravar” (con v) es poner un impuesto."],
  },
  {
    en: ["Austin is the ___ of Texas.", "capital", [["capitol", "sound-alike-wrong-meaning"], ["capitle", "misspelling"]], "The blank names a city where a state's government meets.", "The “capital” is the city. The “capitol” is the building where lawmakers meet."],
    es: ["Separa los ___ para reciclarlos.", "desechos", [["deshechos", "look-alike-wrong-meaning"], ["desechós", "extra-accent"]], "La palabra significa restos que se tiran.", "Los “desechos” (sin h) son restos que se tiran. “Deshecho” (con h) es lo que se deshizo."],
  },
  {
    en: ["Lawmakers meet in the ___ building downtown.", "capitol", [["capital", "sound-alike-wrong-meaning"], ["capitle", "misspelling"]], "The blank names the building where lawmakers meet.", "The “capitol” (with o) is the building."],
    es: ["La cama estaba ___ porque nadie la tendió.", "deshecha", [["desecha", "look-alike-wrong-meaning"], ["desecho", "look-alike-wrong-meaning"]], "La palabra viene de deshacer, lo contrario de hacer.", "“Deshecha” (con h) viene de deshacer."],
  },
  {
    en: ["The ___ of the hike follows the river for two miles.", "course", [["coarse", "sound-alike-wrong-meaning"], ["corse", "misspelling"]], "The blank names a path or route.", "A “course” is a path or a class. “Coarse” means rough."],
    es: ["El cocinero ___ el queso para la pizza.", "ralló", [["rayó", "sound-alike-wrong-meaning"], ["rallo", "missing-accent"]], "La palabra viene del verbo que significa desmenuzar con un rallador.", "“Rallar” (con ll) es desmenuzar. “Rayar” (con y) es hacer rayas."],
  },
  {
    en: ["The sandpaper felt ___ against my hand.", "coarse", [["course", "sound-alike-wrong-meaning"], ["corse", "misspelling"]], "The blank describes the sandpaper: rough.", "“Coarse” means rough."],
    es: ["Mi hermanito ___ la pared con un crayón.", "rayó", [["ralló", "sound-alike-wrong-meaning"], ["rayo", "missing-accent"]], "La palabra viene del verbo que significa hacer rayas.", "“Rayar” (con y) es hacer rayas o líneas."],
  },
  {
    en: ["The guide ___ the hikers to the waterfall yesterday.", "led", [["lead", "sound-alike-wrong-meaning"], ["leed", "misspelling"]], "It happened yesterday, so the blank needs the past tense.", "“Led” is the past tense of the verb “lead.” As a noun, “lead” is a metal."],
    es: ["Mañana vamos a ___ por el presidente del consejo estudiantil.", "votar", [["botar", "sound-alike-wrong-meaning"], ["vótar", "extra-accent"]], "La palabra trata de elegir en una elección.", "“Votar” (con v) es dar tu voto. “Botar” (con b) es tirar o hacer rebotar."],
  },
  {
    en: ["Only museum ___ can enter the storage rooms.", "personnel", [["personal", "look-alike-wrong-meaning"], ["personell", "misspelling"]], "The blank names the staff who work there.", "“Personnel” means the staff. “Personal” means private or your own."],
    es: ["El jugador hizo ___ el balón tres veces.", "botar", [["votar", "sound-alike-wrong-meaning"], ["bótar", "extra-accent"]], "La palabra trata de hacer rebotar el balón.", "“Botar” (con b) es hacer rebotar o tirar."],
  },
  {
    en: ["Please keep your ___ belongings in your locker.", "personal", [["personnel", "look-alike-wrong-meaning"], ["personel", "misspelling"]], "The blank describes belongings that are your own.", "“Personal” means your own."],
    es: ["La ___ sube por el tronco del árbol.", "savia", [["sabia", "sound-alike-wrong-meaning"], ["sabía", "sound-alike-wrong-meaning"]], "La palabra es el líquido que circula por las plantas.", "La “savia” (con v) es el líquido de las plantas. “Sabia” (con b) es una persona que sabe mucho."],
  },
  {
    en: ["The teacher read the poem ___ to the class.", "aloud", [["allowed", "sound-alike-wrong-meaning"], ["alowd", "misspelling"]], "The blank tells how she read: so everyone could hear.", "“Aloud” means out loud. “Allowed” means permitted."],
    es: ["Mi abuela es una mujer muy ___.", "sabia", [["savia", "sound-alike-wrong-meaning"], ["sabía", "extra-accent"]], "La palabra describe a alguien con mucho conocimiento.", "“Sabia” (con b, sin tilde) describe a alguien que sabe mucho."],
  },
];

const CONFUSED_WORDS = skill(
  { id: "e.confused.words", grade: "6", title: { en: "Commonly confused words", es: "Palabras que se confunden" }, standard: "L.6.2b", prereqs: ["e.homophones"] },
  [0, 1].map((i) => ({
    bank: [CONFUSED_1, CONFUSED_2][i],
    ask: CHOOSE,
    hints: {
      en: ["These words look or sound alike but mean different things. What meaning does the sentence need?", "Decide what kind of word fits the blank (a verb? a noun? a describing word?), then pick the spelling with that meaning."] as [string, string],
      es: ["Estas palabras se parecen o suenan igual, pero significan cosas distintas. ¿Qué significado necesita la oración?", "Piensa qué clase de palabra va en el espacio (¿un verbo? ¿un sustantivo?) y si va junta, separada o con tilde. Luego elige la que tiene ese significado."] as [string, string],
    },
    seconds: 12,
  })),
);

// ---------------------------------------------------------------------------------------------------
// e.greek.latin.roots — level 1: what one root means in a word; level 2: put the roots together to work
// out a whole word. Spanish uses the same Greek and Latin roots in Spanish words (geografía, termómetro,
// portátil…). Tags: meaning-of-other-part (took the meaning of the other root), similar-root-mixup
// (photo / phon, aud / vis), guessed-from-topic, opposite-root (ignored "in-", "de-", "mal-"…).

const ROOT_MEANING: Bi<Entry>[] = [
  {
    en: ["geography", "earth", [["write", "meaning-of-other-part"], ["map", "guessed-from-topic"]], "Think of “geology” and “geode.”", "“Geo” means earth; “graph” means write or draw.", "geo"],
    es: ["geografía", "tierra", [["escribir", "meaning-of-other-part"], ["mapa", "guessed-from-topic"]], "Piensa en “geología” y “geometría”.", "“Geo” significa tierra; “grafía” significa escritura o descripción.", "geo"],
  },
  {
    en: ["biology", "life", [["study", "meaning-of-other-part"], ["plant", "guessed-from-topic"]], "Think of “biography” and “antibiotic.”", "“Bio” means life; “logy” means the study of.", "bio"],
    es: ["biología", "vida", [["estudio", "meaning-of-other-part"], ["planta", "guessed-from-topic"]], "Piensa en “biografía” y “antibiótico”.", "“Bio” significa vida; “logía” significa estudio.", "bio"],
  },
  {
    en: ["telescope", "far", [["look", "meaning-of-other-part"], ["star", "guessed-from-topic"]], "Think of “telephone” and “television.”", "“Tele” means far; “scope” means look.", "tele"],
    es: ["teléfono", "lejos", [["sonido", "meaning-of-other-part"], ["hablar", "guessed-from-topic"]], "Piensa en “televisión” y “telescopio”.", "“Tele” significa lejos; “fono” significa sonido.", "tele"],
  },
  {
    en: ["microscope", "small", [["look", "meaning-of-other-part"], ["germ", "guessed-from-topic"]], "Think of “microphone” and “microchip.”", "“Micro” means small; “scope” means look.", "micro"],
    es: ["microscopio", "pequeño", [["mirar", "meaning-of-other-part"], ["germen", "guessed-from-topic"]], "Piensa en “micrófono” y “microbús”.", "“Micro” significa pequeño; “scopio” significa mirar u observar.", "micro"],
  },
  {
    en: ["phonics", "sound", [["letter", "guessed-from-topic"], ["light", "similar-root-mixup"]], "Think of “telephone” and “microphone.”", "“Phon” means sound.", "phon"],
    es: ["fonética", "sonido", [["letra", "guessed-from-topic"], ["luz", "similar-root-mixup"]], "Piensa en “teléfono” y “micrófono”.", "“Fon” significa sonido.", "fon"],
  },
  {
    en: ["photograph", "light", [["write", "meaning-of-other-part"], ["sound", "similar-root-mixup"]], "Think of “photosynthesis” and “photon.”", "“Photo” means light; “graph” means write or draw.", "photo"],
    es: ["fotografía", "luz", [["escribir", "meaning-of-other-part"], ["sonido", "similar-root-mixup"]], "Piensa en “fotosíntesis” y “fotón”.", "“Foto” significa luz; “grafía” significa escritura o dibujo.", "foto"],
  },
  {
    en: ["autograph", "self", [["write", "meaning-of-other-part"], ["car", "guessed-from-topic"]], "Think of “automatic” and “autobiography.”", "“Auto” means self.", "auto"],
    es: ["autógrafo", "uno mismo", [["escribir", "meaning-of-other-part"], ["carro", "guessed-from-topic"]], "Piensa en “automático” y “autobiografía”.", "“Auto” significa uno mismo.", "auto"],
  },
  {
    en: ["thermometer", "heat", [["measure", "meaning-of-other-part"], ["cold", "guessed-from-topic"]], "Think of “thermos” and “thermal.”", "“Therm” means heat; “meter” means measure.", "therm"],
    es: ["termómetro", "calor", [["medida", "meaning-of-other-part"], ["frío", "guessed-from-topic"]], "Piensa en “termo” y “térmico”.", "“Termo” significa calor; “metro” significa medida.", "termo"],
  },
  {
    en: ["chronological", "time", [["study", "meaning-of-other-part"], ["order", "guessed-from-topic"]], "Think of “chronic” and “synchronize.”", "“Chron” means time.", "chron"],
    es: ["cronológico", "tiempo", [["estudio", "meaning-of-other-part"], ["orden", "guessed-from-topic"]], "Piensa en “cronómetro” y “crónica”.", "“Crono” significa tiempo.", "crono"],
  },
  {
    en: ["dictate", "say", [["write", "guessed-from-topic"], ["lead", "similar-root-mixup"]], "Think of “predict” and “contradict.”", "“Dict” means say or speak.", "dict"],
    es: ["dictado", "decir", [["escribir", "guessed-from-topic"], ["guiar", "similar-root-mixup"]], "Piensa en “diccionario” y “dictador”.", "“Dict” significa decir.", "dict"],
  },
  {
    en: ["transport", "carry", [["across", "meaning-of-other-part"], ["door", "similar-root-mixup"]], "Think of “portable” and “export.”", "“Port” means carry; “trans” means across.", "port"],
    es: ["transportar", "llevar", [["a través", "meaning-of-other-part"], ["puerta", "similar-root-mixup"]], "Piensa en “portátil” y “exportar”.", "“Port” significa llevar; “trans” significa al otro lado.", "port"],
  },
  {
    en: ["visible", "see", [["able", "meaning-of-other-part"], ["life", "similar-root-mixup"]], "Think of “vision” and “visit.”", "“Vis” means see.", "vis"],
    es: ["visible", "ver", [["capaz", "meaning-of-other-part"], ["vida", "similar-root-mixup"]], "Piensa en “visión” y “visitar”.", "“Vis” significa ver.", "vis"],
  },
  {
    en: ["audience", "hear", [["see", "similar-root-mixup"], ["crowd", "guessed-from-topic"]], "Think of “audio” and “audition.”", "“Aud” means hear.", "aud"],
    es: ["audiencia", "oír", [["ver", "similar-root-mixup"], ["multitud", "guessed-from-topic"]], "Piensa en “audio” y “audición”.", "“Aud” significa oír.", "aud"],
  },
  {
    en: ["manuscript", "write", [["hand", "meaning-of-other-part"], ["book", "guessed-from-topic"]], "Think of “script” and “scribble.”", "“Script” means write; “manu” means hand.", "script"],
    es: ["manuscrito", "escribir", [["mano", "meaning-of-other-part"], ["libro", "guessed-from-topic"]], "Piensa en “inscripción” y “escritor”.", "“Scri” viene de escribir; “manu” significa mano.", "scri"],
  },
  {
    en: ["pedestrian", "foot", [["child", "similar-root-mixup"], ["street", "guessed-from-topic"]], "Think of “pedal” and “pedicure.”", "In “pedestrian,” “ped” comes from the Latin word for foot.", "ped"],
    es: ["pedal", "pie", [["niño", "similar-root-mixup"], ["bicicleta", "guessed-from-topic"]], "Piensa en “pedestre” y “pedicura”.", "En “pedal”, “ped” viene del latín y significa pie.", "ped"],
  },
  {
    en: ["aquarium", "water", [["fish", "guessed-from-topic"], ["place", "meaning-of-other-part"]], "Think of “aquatic” and “aqueduct.”", "“Aqua” means water.", "aqua"],
    es: ["acuario", "agua", [["pez", "guessed-from-topic"], ["lugar", "meaning-of-other-part"]], "Piensa en “acuático” y “acueducto”.", "“Acua” significa agua.", "acua"],
  },
];

const ROOT_WORDS: Bi<Entry>[] = [
  {
    en: ["", "a device that measures time very exactly", [["the study of history", "guessed-from-topic"], ["a device that measures heat", "similar-root-mixup"], ["a person who is always on time", "meaning-of-other-part"]], "“Chrono” means time, and “meter” means measure.", "Put the parts together: something that measures time.", "chronometer"],
    es: ["", "aparato que mide el tiempo con precisión", [["estudio de la historia", "guessed-from-topic"], ["aparato que mide el calor", "similar-root-mixup"], ["persona que siempre llega a tiempo", "meaning-of-other-part"]], "“Crono” significa tiempo y “metro” significa medida.", "Junta las partes: algo que mide el tiempo.", "cronómetro"],
  },
  {
    en: ["", "related to heat from inside the earth", [["related to the study of rocks", "guessed-from-topic"], ["related to light from the sky", "similar-root-mixup"], ["related to maps of the land", "meaning-of-other-part"]], "“Geo” means earth, and “therm” means heat.", "Put the parts together: earth plus heat.", "geothermal"],
    es: ["", "relacionado con el calor del interior de la Tierra", [["relacionado con el estudio de las rocas", "guessed-from-topic"], ["relacionado con la luz del cielo", "similar-root-mixup"], ["relacionado con los mapas", "meaning-of-other-part"]], "“Geo” significa tierra y “term” significa calor.", "Junta las partes: tierra más calor.", "geotérmico"],
  },
  {
    en: ["", "able to be heard", [["able to be seen", "similar-root-mixup"], ["very loud", "guessed-from-topic"], ["unable to be heard", "opposite-root"]], "“Aud” means hear, and “ible” means able to be.", "Put the parts together: able to be heard.", "audible"],
    es: ["", "que se puede oír", [["que se puede ver", "similar-root-mixup"], ["muy ruidoso", "guessed-from-topic"], ["que no se puede oír", "opposite-root"]], "“Aud” significa oír y “ible” significa que se puede.", "Junta las partes: que se puede oír.", "audible"],
  },
  {
    en: ["", "a person who does good for others", [["a person who causes harm", "opposite-root"], ["a person who works in a factory", "guessed-from-topic"], ["something done well", "meaning-of-other-part"]], "“Bene” means good or well, and “factor” means one who makes or does.", "Put the parts together: one who does good.", "benefactor"],
    es: ["", "persona que hace el bien a otros", [["persona que hace daño", "opposite-root"], ["persona que trabaja en una fábrica", "guessed-from-topic"], ["algo bien hecho", "meaning-of-other-part"]], "“Bene” significa bien y “factor” significa quien hace.", "Junta las partes: quien hace el bien.", "benefactor"],
  },
  {
    en: ["", "to work badly or fail", [["to work very well", "opposite-root"], ["a party or special event", "meaning-of-other-part"], ["to stop on purpose", "guessed-from-topic"]], "“Mal” means bad or badly.", "Put the parts together: to function badly.", "malfunction"],
    es: ["", "falta de una alimentación buena y suficiente", [["alimentación muy buena", "opposite-root"], ["enfermedad de la piel", "guessed-from-topic"], ["comida", "meaning-of-other-part"]], "“Mal” significa mal o malo.", "Junta las partes: nutrición mala.", "malnutrición"],
  },
  {
    en: ["", "the written story of a person's life", [["the study of living things", "similar-root-mixup"], ["a drawing of a plant", "guessed-from-topic"], ["a list of book titles", "meaning-of-other-part"]], "“Bio” means life, and “graph” means write.", "Put the parts together: writing about a life.", "biography"],
    es: ["", "historia escrita de la vida de una persona", [["estudio de los seres vivos", "similar-root-mixup"], ["dibujo de una planta", "guessed-from-topic"], ["lista de títulos de libros", "meaning-of-other-part"]], "“Bio” significa vida y “grafía” significa escritura.", "Junta las partes: escritura sobre una vida.", "biografía"],
  },
  {
    en: ["", "to say the opposite of what someone said", [["to agree with someone", "opposite-root"], ["to write a contract", "guessed-from-topic"], ["to say something again", "meaning-of-other-part"]], "“Contra” means against, and “dict” means say.", "Put the parts together: to say against.", "contradict"],
    es: ["", "decir lo contrario de lo que otro dijo", [["estar de acuerdo con alguien", "opposite-root"], ["escribir un contrato", "guessed-from-topic"], ["decir algo otra vez", "meaning-of-other-part"]], "“Contra” significa en contra de.", "Junta las partes: decir en contra.", "contradecir"],
  },
  {
    en: ["", "a person who watches an event", [["a person who speaks at an event", "similar-root-mixup"], ["a person who plays in a game", "guessed-from-topic"], ["a kind of eyeglasses", "meaning-of-other-part"]], "“Spect” means look or watch, and “or” means a person who.", "Put the parts together: a person who watches.", "spectator"],
    es: ["", "persona que mira un espectáculo", [["persona que habla en un evento", "similar-root-mixup"], ["persona que juega en un partido", "guessed-from-topic"], ["persona que espera mucho", "meaning-of-other-part"]], "“Spect” significa mirar y “dor” significa persona que hace algo.", "Junta las partes: persona que mira.", "espectador"],
  },
  {
    en: ["", "a stand with three legs", [["a trip on foot", "guessed-from-topic"], ["a group of three people", "meaning-of-other-part"], ["a stand with four legs", "similar-root-mixup"]], "“Tri” means three, and “pod” means foot.", "Put the parts together: three feet.", "tripod"],
    es: ["", "soporte de tres patas", [["viaje a pie", "guessed-from-topic"], ["grupo de tres personas", "meaning-of-other-part"], ["soporte de cuatro patas", "similar-root-mixup"]], "“Tri” significa tres, y “pode” viene del griego y significa pie.", "Junta las partes: tres pies.", "trípode"],
  },
  {
    en: ["", "too quiet to be heard", [["very loud", "opposite-root"], ["easy to see", "similar-root-mixup"], ["able to be heard", "meaning-of-other-part"]], "“In” means not, “aud” means hear, and “ible” means able to be.", "Put the parts together: not able to be heard.", "inaudible"],
    es: ["", "que no se puede oír", [["muy ruidoso", "opposite-root"], ["fácil de ver", "similar-root-mixup"], ["que se puede oír", "meaning-of-other-part"]], "“In” significa no, “aud” significa oír e “ible” significa que se puede.", "Junta las partes: que no se puede oír.", "inaudible"],
  },
  {
    en: ["", "easy to carry", [["easy to open", "similar-root-mixup"], ["made in a port city", "guessed-from-topic"], ["heavy and fixed in place", "opposite-root"]], "“Port” means carry, and “able” means can be.", "Put the parts together: can be carried.", "portable"],
    es: ["", "que se puede llevar fácilmente", [["que se puede abrir fácilmente", "similar-root-mixup"], ["hecho en un puerto", "guessed-from-topic"], ["pesado y fijo en un lugar", "opposite-root"]], "“Port” significa llevar, y “-átil” indica que se puede hacer.", "Junta las partes: que se puede llevar.", "portátil"],
  },
  {
    en: ["", "a living thing too small to see without a microscope", [["a very large animal", "opposite-root"], ["a small machine", "meaning-of-other-part"], ["a kind of microphone", "guessed-from-topic"]], "“Micro” means small, and “be” comes from “bio,” life.", "Put the parts together: small life.", "microbe"],
    es: ["", "ser vivo tan pequeño que no se ve sin microscopio", [["animal muy grande", "opposite-root"], ["máquina pequeña", "meaning-of-other-part"], ["tipo de micrófono", "guessed-from-topic"]], "“Micro” significa pequeño y “bio” significa vida.", "Junta las partes: vida pequeña.", "microbio"],
  },
  {
    en: ["", "to remove water from", [["to add water to", "opposite-root"], ["to heat until it melts", "guessed-from-topic"], ["to remove air from", "similar-root-mixup"]], "“De” means remove, and “hydr” means water.", "Put the parts together: remove water.", "dehydrate"],
    es: ["", "quitar el agua", [["agregar agua", "opposite-root"], ["calentar hasta derretir", "guessed-from-topic"], ["quitar el aire", "similar-root-mixup"]], "“Des” significa quitar e “hidr” significa agua.", "Junta las partes: quitar el agua.", "deshidratar"],
  },
  {
    en: ["", "able to speak only one language", [["able to speak many languages", "opposite-root"], ["speaking one word at a time", "guessed-from-topic"], ["having a long tongue", "meaning-of-other-part"]], "“Mono” means one, and “lingu” means language or tongue.", "Put the parts together: one language.", "monolingual"],
    es: ["", "que habla una sola lengua", [["que habla muchas lenguas", "opposite-root"], ["que dice una palabra a la vez", "guessed-from-topic"], ["que tiene una lengua larga", "meaning-of-other-part"]], "“Mono” significa uno y “lingüe” significa lengua o idioma.", "Junta las partes: una sola lengua.", "monolingüe"],
  },
];

const ROOTS = skill(
  { id: "e.greek.latin.roots", grade: "6", title: { en: "Greek and Latin roots", es: "Raíces griegas y latinas" }, standard: "L.6.4b", prereqs: ["e.prefixes", "e.context.clues"] },
  [
    {
      bank: ROOT_MEANING,
      ask: { en: "What does the root {t} mean in this word?", es: "¿Qué significa la raíz {t} en esta palabra?" },
      hints: {
        en: ["Think of other words that share this root.", "List two or three words you know with the root and ask what meaning they have in common."],
        es: ["Piensa en otras palabras que tengan esta raíz.", "Haz una lista de dos o tres palabras que conozcas con la raíz y busca el significado que comparten."],
      },
      seconds: 12,
    },
    {
      bank: ROOT_WORDS,
      ask: { en: "Use the roots to work out what {t} means.", es: "Usa las raíces para deducir qué significa {t}." },
      hints: {
        en: ["Split the word into its parts.", "Give each part its meaning, then put the meanings together. Watch for parts like “in-,” “de-,” or “mal-” that change the meaning."],
        es: ["Divide la palabra en sus partes.", "Dale a cada parte su significado y luego júntalos. Fíjate en partes como “in-”, “des-” o “mal-”, que cambian el sentido."],
      },
      seconds: 20,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.connotation — level 1: three words with about the same dictionary meaning; pick the one whose
// feeling fits the writer (Spanish adds the feeling of the suffixes -ito and -ucho: casita, casucha);
// level 2: what a word suggests beyond its dictionary meaning.

const CONNOTATION_FIT: Bi<Entry>[] = [
  {
    en: ["A hotel ad describes its little guest room as ___.", "cozy", [["small", "neutral-connotation"], ["cramped", "opposite-connotation"]], "An ad wants guests to feel good about the room.", "“Cozy,” “small,” and “cramped” all describe a little space, but only one makes it sound pleasant."],
    es: ["Un anuncio de hotel describe su cuarto pequeño como ___.", "acogedor", [["chico", "neutral-connotation"], ["estrecho", "opposite-connotation"]], "Un anuncio quiere que los huéspedes se sientan bien con el cuarto.", "Las tres palabras pueden describir un espacio pequeño, pero solo una lo hace sonar agradable."],
  },
  {
    en: ["A tenant complaining to the landlord calls the tiny apartment ___.", "cramped", [["small", "neutral-connotation"], ["cozy", "opposite-connotation"]], "A complaint needs a word that sounds unpleasant.", "“Cramped” makes the small space sound uncomfortable."],
    es: ["Un inquilino que se queja con el dueño dice que el departamento es ___.", "estrecho", [["chico", "neutral-connotation"], ["acogedor", "opposite-connotation"]], "Una queja necesita una palabra que suene desagradable.", "“Estrecho” hace que el espacio pequeño suene incómodo."],
  },
  {
    en: ["The candle box promises a sweet ___ of vanilla.", "fragrance", [["smell", "neutral-connotation"], ["stench", "opposite-connotation"]], "The box wants the candle to sound pleasant.", "All three name something you smell, but only one sounds lovely."],
    es: ["La caja de la vela promete un dulce ___ a vainilla.", "aroma", [["olor", "neutral-connotation"], ["hedor", "opposite-connotation"]], "La caja quiere que la vela suene agradable.", "Las tres nombran algo que se huele, pero solo una suena agradable."],
  },
  {
    en: ["The camper held his nose at the ___ of the garbage bin.", "stench", [["smell", "neutral-connotation"], ["fragrance", "opposite-connotation"]], "Holding your nose shows the smell is very unpleasant.", "“Stench” is a strong, unpleasant smell."],
    es: ["El campista se tapó la nariz por el ___ del basurero.", "hedor", [["olor", "neutral-connotation"], ["aroma", "opposite-connotation"]], "Taparse la nariz muestra que lo que huele es muy desagradable.", "“Hedor” es un olor fuerte y desagradable."],
  },
  {
    en: ["A store wants shoppers to feel smart about saving money, so it calls its prices ___.", "affordable", [["low", "neutral-connotation"], ["cheap", "opposite-connotation"]], "The store wants the prices to sound like a smart choice, not poor quality.", "“Cheap” can suggest poor quality; “affordable” sounds like a good value."],
    es: ["La guía del museo elogia el automóvil ___ de 1965.", "clásico", [["viejo", "neutral-connotation"], ["anticuado", "opposite-connotation"]], "La guía quiere que el carro suene especial.", "“Clásico” hace que un carro viejo suene valioso."],
  },
  {
    en: ["Annoyed by the old furniture, the reviewer called the chairs ___.", "outdated", [["old", "neutral-connotation"], ["classic", "opposite-connotation"]], "The reviewer is annoyed, so the word should sound negative.", "“Outdated” makes old sound like a problem."],
    es: ["El crítico, molesto con los muebles viejos, dijo que las sillas eran ___.", "anticuadas", [["viejas", "neutral-connotation"], ["clásicas", "opposite-connotation"]], "El crítico está molesto, así que la palabra debe sonar negativa.", "“Anticuadas” hace que lo viejo suene como un problema."],
  },
  {
    en: ["A museum guide praises the ___ car from 1965.", "classic", [["old", "neutral-connotation"], ["outdated", "opposite-connotation"]], "A guide praising the car wants it to sound special.", "“Classic” makes an old car sound valuable."],
    es: ["El abuelo sonrió a su nieta ___, que no paraba de preguntar sobre las estrellas.", "curiosa", [["preguntona", "opposite-connotation"], ["entrometida", "opposite-connotation"]], "El abuelo sonríe, así que le gustan sus preguntas.", "“Curiosa” es alguien con ganas de aprender; “preguntona” y “entrometida” suenan a crítica."],
  },
  {
    en: ["Grandpa smiled at his ___ granddaughter, who was full of questions about the stars.", "inquisitive", [["questioning", "neutral-connotation"], ["nosy", "opposite-connotation"]], "Grandpa is smiling, so he likes her questions.", "“Inquisitive” means eager to learn; “nosy” would mean prying into other people's business."],
    es: ["Cansada de las preguntas del vecino sobre su vida privada, Sara dijo que era ___.", "entrometido", [["curioso", "opposite-connotation"], ["inquisitivo", "opposite-connotation"]], "Sara está molesta, así que la palabra debe sonar negativa.", "“Entrometido” es quien se mete en asuntos que no son suyos."],
  },
  {
    en: ["Tired of her neighbor's questions about her private life, Sara called him ___.", "nosy", [["interested", "neutral-connotation"], ["inquisitive", "opposite-connotation"]], "Sara is annoyed, so the word should sound negative.", "“Nosy” means prying into things that are not your business."],
    es: ["La maestra, molesta, le pidió al grupo que dejara de portarse de manera tan ___.", "infantil", [["juvenil", "opposite-connotation"], ["inocente", "opposite-connotation"]], "La maestra está molesta, así que la palabra debe sonar negativa.", "“Infantil”, dicho de alguien que ya no es niño, es una crítica."],
  },
  {
    en: ["The poet describes the old woman's ___ laugh, full of life.", "youthful", [["young", "neutral-connotation"], ["childish", "opposite-connotation"]], "The poet admires her laugh.", "“Youthful” means having the good qualities of youth; “childish” would be an insult."],
    es: ["El poeta describe la risa ___ de la anciana, llena de vida.", "juvenil", [["infantil", "opposite-connotation"], ["inmadura", "opposite-connotation"]], "El poeta admira su risa.", "“Juvenil” da la idea de energía y alegría."],
  },
  {
    en: ["Frustrated, the teacher told the class to stop acting so ___.", "childish", [["young", "neutral-connotation"], ["youthful", "opposite-connotation"]], "The teacher is frustrated, so the word should sound negative.", "“Childish” is a criticism: acting younger than you should."],
    es: ["En su diario, Lucía recuerda con cariño la ___ de sus abuelos en el campo.", "casita", [["casa", "neutral-connotation"], ["casucha", "opposite-connotation"]], "Lucía la recuerda con cariño.", "El sufijo “-ita” añade cariño; “-ucha” desprecia."],
  },
  {
    en: ["A news story calls the scientist ___ for her work on clean water.", "renowned", [["well-known", "neutral-connotation"], ["notorious", "opposite-connotation"]], "The story praises her work.", "“Renowned” means famous for good reasons; “notorious” means famous for bad ones."],
    es: ["Molesto, el inquilino dijo que le habían rentado un ___ sin ventanas.", "cuartucho", [["cuarto", "neutral-connotation"], ["cuartito", "opposite-connotation"]], "El inquilino está molesto, así que la palabra debe sonar despectiva.", "El sufijo “-ucho” hace que el cuarto suene feo y pobre."],
  },
  {
    en: ["The town was tired of the ___ prankster who kept painting fake potholes.", "notorious", [["well-known", "neutral-connotation"], ["renowned", "opposite-connotation"]], "The town is tired of this person.", "“Notorious” means famous for something bad."],
    es: ["Enojado, el profesor dijo que el trabajo era un ___ lleno de errores.", "papelucho", [["papel", "neutral-connotation"], ["papelito", "opposite-connotation"]], "El profesor está enojado, así que la palabra debe sonar despectiva.", "El sufijo “-ucho” hace que el escrito suene sin valor."],
  },
  {
    en: ["The art teacher praised Mina's ___ style, unlike anyone else's.", "unique", [["unusual", "neutral-connotation"], ["weird", "opposite-connotation"]], "The teacher is praising the style.", "“Unique” makes being different sound special."],
    es: ["La maestra elogió el estilo ___ de Mina, distinto al de todos.", "original", [["diferente", "neutral-connotation"], ["raro", "opposite-connotation"]], "La maestra elogia el estilo.", "“Original” hace que ser distinto suene especial."],
  },
  {
    en: ["Kenji frowned at the ___ hat his uncle gave him.", "weird", [["unusual", "neutral-connotation"], ["unique", "opposite-connotation"]], "Kenji is frowning, so the word should sound negative.", "“Weird” makes being different sound bad."],
    es: ["Kenji frunció el ceño al ver el sombrero ___ que le regaló su tío.", "raro", [["diferente", "neutral-connotation"], ["original", "opposite-connotation"]], "Kenji frunce el ceño, así que la palabra debe sonar negativa.", "“Raro” hace que ser distinto suene mal."],
  },
];

const CONNOTATION_SUGGEST: Bi<Entry>[] = [
  {
    en: ["The new students huddled near the door on the first day.", "They felt nervous and wanted to stay close together", [["They stood near the door", "denotation-only"], ["They felt relaxed and confident", "opposite-connotation"], ["They were planning to leave school", "unsupported-reading"]], "Compare “huddled” with “stood.” What feeling does “huddled” add?", "“Huddled” means crowded close together, and it suggests nervousness or cold.", "huddled"],
    es: ["El gatito se acurrucó debajo de la cama durante la tormenta.", "Tenía miedo y buscaba protegerse", [["Estaba debajo de la cama", "denotation-only"], ["Estaba juguetón y curioso", "opposite-connotation"], ["Estaba herido", "unsupported-reading"]], "Compara “se acurrucó” con “se metió”. ¿Qué sensación añade?", "“Acurrucarse” es encogerse para protegerse, y sugiere miedo o frío.", "acurrucó"],
  },
  {
    en: ["Our dog gobbled his dinner in ten seconds.", "He ate fast and eagerly", [["He ate his dinner", "denotation-only"], ["He ate slowly and carefully", "opposite-connotation"], ["He was sick", "unsupported-reading"]], "Compare “gobbled” with “ate.” What does it add?", "“Gobbled” means ate quickly and greedily.", "gobbled"],
    es: ["Nuestro perro devoró su cena en diez segundos.", "Comió muy rápido y con muchas ganas", [["Comió su cena", "denotation-only"], ["Comió despacio y con cuidado", "opposite-connotation"], ["Estaba enfermo", "unsupported-reading"]], "Compara “devoró” con “comió”. ¿Qué añade?", "“Devorar” es comer con prisa y con muchas ganas.", "devoró"],
  },
  {
    en: ["The old house loomed over the empty street.", "It seemed large and a little threatening", [["It stood on the street", "denotation-only"], ["It seemed small and cheerful", "opposite-connotation"], ["It was about to fall down", "unsupported-reading"]], "Compare “loomed” with “stood.” What mood does it set?", "“Loomed” means appeared large in a threatening way.", "loomed"],
    es: ["La vieja casa se cernía sobre la calle vacía.", "Parecía grande y un poco amenazante", [["Estaba en la calle", "denotation-only"], ["Parecía pequeña y alegre", "opposite-connotation"], ["Estaba a punto de caerse", "unsupported-reading"]], "Compara “se cernía” con “estaba”. ¿Qué ambiente crea?", "“Cernirse” es estar encima de algo como una amenaza.", "cernía"],
  },
  {
    en: ["Grandma's kitchen was always bustling on holidays.", "It was busy and full of happy activity", [["It had people in it", "denotation-only"], ["It was quiet and empty", "opposite-connotation"], ["It was messy and dirty", "unsupported-reading"]], "Picture a kitchen that is “bustling.” What do you see and hear?", "“Bustling” means full of energetic, busy activity.", "bustling"],
    es: ["La cocina de la abuela siempre bullía de actividad en los días de fiesta.", "Estaba llena de movimiento alegre", [["Había gente en ella", "denotation-only"], ["Estaba tranquila y vacía", "opposite-connotation"], ["Estaba sucia y desordenada", "unsupported-reading"]], "Imagina una cocina que “bulle”. ¿Qué ves y qué oyes?", "“Bullir” es moverse mucho, como el agua cuando hierve.", "bullía"],
  },
  {
    en: ["The speaker droned on about the parking rules for an hour.", "The talk was dull and boring", [["The speaker talked", "denotation-only"], ["The talk was exciting", "opposite-connotation"], ["The speaker was angry", "unsupported-reading"]], "Compare “droned on” with “talked.” How does it sound?", "“Droned” means talked in a flat, boring way.", "droned"],
    es: ["Ava paseó por el jardín después del almuerzo.", "Caminó despacio y relajada", [["Caminó", "denotation-only"], ["Corrió con prisa y miedo", "opposite-connotation"], ["Estaba perdida", "unsupported-reading"]], "Compara “paseó” con “caminó”. ¿Qué añade?", "“Pasear” es andar sin prisa, por gusto.", "paseó"],
  },
  {
    en: ["Ava strolled through the garden after lunch.", "She walked in a slow, relaxed way", [["She walked", "denotation-only"], ["She hurried in a panic", "opposite-connotation"], ["She was lost", "unsupported-reading"]], "Compare “strolled” with “walked.” What does it add?", "“Strolled” means walked slowly for pleasure.", "strolled"],
    es: ["El cachorro brincaba por el patio moviendo la cola.", "Se movía con saltos alegres y llenos de energía", [["Se movía por el patio", "denotation-only"], ["Se movía despacio y triste", "opposite-connotation"], ["Huía de un peligro", "unsupported-reading"]], "Compara “brincaba” con “se movía”. ¿Qué añade?", "“Brincar” es dar saltos, y aquí sugiere alegría.", "brincaba"],
  },
  {
    en: ["The puppy's tail wagged as it bounded across the yard.", "It moved with happy, energetic leaps", [["It moved across the yard", "denotation-only"], ["It moved slowly and sadly", "opposite-connotation"], ["It was running away from danger", "unsupported-reading"]], "Compare “bounded” with “moved.” What does it add?", "“Bounded” means moved with big, lively jumps.", "bounded"],
    es: ["La capitana del equipo presumió el triunfo ante toda la escuela.", "Habló del triunfo con demasiado orgullo", [["Habló del triunfo", "denotation-only"], ["Fue humilde y callada", "opposite-connotation"], ["Mintió sobre el marcador", "unsupported-reading"]], "Compara “presumió” con “contó”. ¿Qué añade?", "“Presumir” es mostrar algo con demasiado orgullo.", "presumió"],
  },
  {
    en: ["The team captain boasted about the win to everyone at school.", "The captain bragged in a way that seemed too proud", [["The captain talked about the win", "denotation-only"], ["The captain was humble and quiet about it", "opposite-connotation"], ["The captain lied about the score", "unsupported-reading"]], "Compare “boasted” with “talked.” What does it add?", "“Boasted” means bragged with too much pride.", "boasted"],
    es: ["Las olas azotaban las rocas toda la noche.", "Golpeaban con fuerza y ruido", [["Tocaban las rocas", "denotation-only"], ["Estaban tranquilas y suaves", "opposite-connotation"], ["Rompían las rocas en pedazos", "unsupported-reading"]], "Compara “azotaban” con “tocaban”. ¿Qué fuerza sugiere?", "“Azotar” es golpear con fuerza y una y otra vez.", "azotaban"],
  },
  {
    en: ["The waves crashed against the rocks all night.", "The waves hit hard and loudly", [["The waves touched the rocks", "denotation-only"], ["The waves were calm and gentle", "opposite-connotation"], ["The rocks broke into pieces", "unsupported-reading"]], "Compare “crashed” with “touched.” What force does it suggest?", "“Crashed” suggests a hard, loud hit.", "crashed"],
    es: ["Leo se zambulló en la novela de misterio todo el fin de semana.", "La leyó con mucho interés y concentración", [["Leyó la novela", "denotation-only"], ["La leyó con desgano", "opposite-connotation"], ["No entendió el libro", "unsupported-reading"]], "Una persona no puede zambullirse de verdad en un libro. ¿Qué sugiere la palabra?", "“Zambullirse” en algo es meterse por completo, con mucho interés.", "zambulló"],
  },
  {
    en: ["The kitten cowered under the bed during the storm.", "It was frightened and hiding", [["It was under the bed", "denotation-only"], ["It was playful and curious", "opposite-connotation"], ["It was hurt", "unsupported-reading"]], "Compare “cowered” with “sat.” What feeling does it add?", "“Cowered” means crouched down in fear.", "cowered"],
    es: ["Papá nos gruñó que ordenáramos los cuartos.", "Habló con enojo y de mal humor", [["Nos dijo que ordenáramos", "denotation-only"], ["Nos lo pidió con dulzura", "opposite-connotation"], ["Estaba orgulloso de los cuartos", "unsupported-reading"]], "Compara “gruñó” con “dijo”. ¿Qué tono sugiere?", "“Gruñir” es hablar entre dientes, con disgusto.", "gruñó"],
  },
  {
    en: ["Leo devoured the mystery novel in one weekend.", "He read it eagerly and quickly", [["He read the novel", "denotation-only"], ["He read it slowly and unwillingly", "opposite-connotation"], ["He did not understand the book", "unsupported-reading"]], "People do not really eat books. What does the word suggest?", "“Devoured” means took in hungrily, so he read it eagerly.", "devoured"],
    es: ["El jardín estaba invadido por la maleza.", "Había tanta maleza que se adueñó del jardín", [["Había maleza", "denotation-only"], ["Había muy poca maleza", "opposite-connotation"], ["Alguien sembró la maleza a propósito", "unsupported-reading"]], "Compara “invadido” con “tenía”. ¿Qué añade?", "“Invadido” sugiere que la maleza ocupó todo, como un ejército.", "invadido"],
  },
  {
    en: ["Dad snapped at us to clean our rooms.", "He spoke sharply and with irritation", [["He told us to clean", "denotation-only"], ["He asked gently and kindly", "opposite-connotation"], ["He was proud of our rooms", "unsupported-reading"]], "Compare “snapped” with “said.” What tone does it suggest?", "“Snapped” means spoke in a quick, irritated way.", "snapped"],
    es: ["A María se le iluminó la cara cuando dijeron su nombre.", "Sonrió con mucha alegría y orgullo", [["Escuchó su nombre", "denotation-only"], ["Frunció el ceño, preocupada", "opposite-connotation"], ["Llevaba horas esperando", "unsupported-reading"]], "Una cara no se enciende como una lámpara. ¿Qué sugiere la palabra?", "Que a alguien se le ilumine la cara es que muestra una gran alegría.", "iluminó"],
  },
  {
    en: ["The garden was overrun with weeds.", "There were so many weeds that they took over", [["There were weeds", "denotation-only"], ["There were only a few weeds", "opposite-connotation"], ["Someone planted weeds on purpose", "unsupported-reading"]], "Compare “overrun” with “had.” What does it add?", "“Overrun” suggests the weeds spread everywhere and took control.", "overrun"],
    es: ["Los turistas se arrastraron colina arriba bajo el sol.", "Subieron con mucho cansancio y esfuerzo", [["Subieron la colina", "denotation-only"], ["Subieron con energía y alegría", "opposite-connotation"], ["Se perdieron en la colina", "unsupported-reading"]], "Compara “se arrastraron” con “subieron”. ¿Qué añade?", "“Arrastrarse” sugiere moverse con gran esfuerzo, casi sin fuerzas.", "arrastraron"],
  },
  {
    en: ["Maria beamed when her name was called.", "She smiled with great happiness and pride", [["She heard her name", "denotation-only"], ["She frowned with worry", "opposite-connotation"], ["She had been waiting for hours", "unsupported-reading"]], "A beam is a ray of light. What does that suggest about her face?", "“Beamed” means smiled brightly with joy.", "beamed"],
    es: ["El niño se plantó en la puerta y no quiso salir.", "Se quedó firme y terco en su lugar", [["Estaba en la puerta", "denotation-only"], ["Salió con gusto", "opposite-connotation"], ["Estaba enfermo", "unsupported-reading"]], "Una persona no echa raíces como una planta. ¿Qué sugiere la palabra?", "“Plantarse” es quedarse firme sin moverse, muchas veces por terquedad.", "plantó"],
  },
];

const CONNOTATION = skill(
  { id: "e.connotation", grade: "6", title: { en: "Connotation and denotation", es: "Connotación y denotación" }, standard: "L.6.5c", prereqs: ["e.synonyms"] },
  [
    {
      bank: CONNOTATION_FIT,
      ask: { en: "Which word best fits what the writer wants?", es: "¿Qué palabra se ajusta mejor a lo que quiere quien escribe?" },
      hints: {
        en: ["All three words have about the same dictionary meaning. What feeling does the writer want to create?", "Sort the words: which one sounds positive, which sounds neutral, and which sounds negative?"],
        es: ["Las tres palabras significan más o menos lo mismo en el diccionario. ¿Qué sensación quiere crear quien escribe?", "Ordena las palabras: ¿cuál suena positiva, cuál neutral y cuál negativa? Los sufijos también cuentan: “-ito” suele dar cariño y “-ucho” desprecio."],
      },
      seconds: 15,
    },
    {
      bank: CONNOTATION_SUGGEST,
      ask: { en: "Beyond its dictionary meaning, what does {t} suggest?", es: "Además de su significado de diccionario, ¿qué sugiere {t}?" },
      hints: {
        en: ["Think about the dictionary meaning first, then the feeling the word adds.", "Ask why the writer chose this word instead of a plainer one with the same meaning. The answer must still fit the sentence."],
        es: ["Piensa primero en el significado de diccionario y luego en la sensación que añade la palabra.", "Pregúntate por qué quien escribe eligió esta palabra en lugar de otra más neutral. La respuesta debe seguir encajando con la oración."],
      },
      seconds: 25,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.multiple.meanings — which dictionary meaning a word has in this sentence (Spanish: polisemia).

const SENSES: Bi<Entry>[] = [
  {
    en: ["The pitcher threw a fast pitch to the batter.", "a throw of the ball", [["how high or low a sound is", "other-meaning-of-word"], ["a sticky black tar", "other-meaning-of-word"]], "The sentence is about a baseball game.", "In baseball, a pitch is a throw to the batter.", "pitch"],
    es: ["Me senté en un banco del parque a leer.", "asiento largo", [["empresa que guarda dinero", "other-meaning-of-word"], ["grupo de peces", "other-meaning-of-word"]], "La oración dice que alguien se sentó.", "Aquí, el banco es un asiento.", "banco"],
  },
  {
    en: ["Please file these papers in the cabinet.", "put away in order in a folder or drawer", [["a tool for smoothing rough edges", "other-meaning-of-word"], ["a line of people one behind another", "other-meaning-of-word"]], "The sentence is about papers and a cabinet.", "Here, “file” means to put papers away in order.", "file"],
    es: ["Escribí el radio del círculo en mi cuaderno.", "línea del centro al borde de un círculo", [["aparato para oír emisoras", "other-meaning-of-word"], ["hueso del antebrazo", "other-meaning-of-word"]], "La oración habla de un círculo.", "Aquí, el radio es una medida del círculo.", "radio"],
  },
  {
    en: ["The bat flew out of the cave at dusk.", "a small flying mammal", [["a stick used to hit a ball", "other-meaning-of-word"], ["to blink your eyes quickly", "other-meaning-of-word"]], "What flies out of caves at dusk?", "Here, the bat is the animal.", "bat"],
    es: ["Vivimos en la tercera planta del edificio.", "piso de un edificio", [["ser vivo con hojas y raíces", "other-meaning-of-word"], ["parte de abajo del pie", "other-meaning-of-word"]], "La oración habla de un edificio.", "Aquí, la planta es un piso del edificio.", "planta"],
  },
  {
    en: ["The judge will rule on the case tomorrow.", "make an official decision", [["a law everyone must follow", "other-meaning-of-word"], ["govern a country as king or queen", "other-meaning-of-word"]], "The sentence says what the judge will do about a case.", "Here, “rule” is a verb: to decide officially.", "rule"],
    es: ["La llama del fuego subía cada vez más alto.", "luz y calor del fuego", [["animal de los Andes", "other-meaning-of-word"], ["forma del verbo llamar", "other-meaning-of-word"]], "La oración habla del fuego.", "Aquí, la llama es la luz del fuego.", "llama"],
  },
  {
    en: ["The new movie will draw a large crowd.", "attract or pull in", [["make a picture with a pencil", "other-meaning-of-word"], ["end a game in a tie", "other-meaning-of-word"]], "What does a movie do to a crowd?", "Here, “draw” means attract.", "draw"],
    es: ["El equipo ganó la copa del torneo.", "trofeo", [["parte de arriba de un árbol", "other-meaning-of-word"], ["vaso con pie para beber", "other-meaning-of-word"]], "La oración habla de ganar un torneo.", "Aquí, la copa es el trofeo.", "copa"],
  },
  {
    en: ["Our class will present the play on Friday.", "perform or show", [["a gift", "other-meaning-of-word"], ["here now, not absent", "other-meaning-of-word"]], "The sentence says what the class will do with the play.", "Here, “present” is a verb: to show or perform.", "present"],
    es: ["La hoja del cuchillo estaba muy afilada.", "parte que corta", [["parte verde de una planta", "other-meaning-of-word"], ["pedazo de papel", "other-meaning-of-word"]], "La oración habla de un cuchillo afilado.", "Aquí, la hoja es la parte que corta.", "hoja"],
  },
  {
    en: ["The bark of the old oak was rough and gray.", "the outer covering of a tree", [["the sound a dog makes", "other-meaning-of-word"], ["a kind of sailing ship", "other-meaning-of-word"]], "The sentence describes an oak tree.", "Here, the bark is the covering of a tree.", "bark"],
    es: ["En la escuela aprendo una segunda lengua.", "idioma", [["parte de la boca que sirve para saborear", "other-meaning-of-word"], ["franja de tierra que entra en el mar", "other-meaning-of-word"]], "La oración habla de algo que se aprende en la escuela.", "Aquí, la lengua es un idioma.", "lengua"],
  },
  {
    en: ["The baby can't bear loud noises.", "put up with", [["a large furry animal", "other-meaning-of-word"], ["carry a heavy load", "other-meaning-of-word"]], "The sentence is about how the baby reacts to noise.", "Here, “bear” means tolerate.", "bear"],
    es: ["Los alpinistas llegaron al pico más alto.", "cima de una montaña", [["boca dura de un ave", "other-meaning-of-word"], ["herramienta para romper la tierra", "other-meaning-of-word"]], "La oración habla de alpinistas.", "Aquí, el pico es la cima.", "pico"],
  },
  {
    en: ["Turn left at the next light.", "the direction opposite of right", [["went away", "other-meaning-of-word"], ["still remaining", "other-meaning-of-word"]], "The sentence gives a direction.", "Here, “left” is a direction.", "left"],
    es: ["Saqué la nota más alta en el examen de ciencias.", "calificación", [["sonido musical", "other-meaning-of-word"], ["mensaje breve escrito", "other-meaning-of-word"]], "La oración habla de un examen.", "Aquí, la nota es la calificación.", "nota"],
  },
  {
    en: ["The sun rose over the hills.", "came up", [["a flower with thorns", "other-meaning-of-word"], ["a pinkish color", "other-meaning-of-word"]], "The sentence says what the sun did.", "Here, “rose” is the past tense of “rise.”", "rose"],
    es: ["Había una cola larga para entrar al cine.", "fila de personas", [["parte final del cuerpo de un animal", "other-meaning-of-word"], ["pegamento", "other-meaning-of-word"]], "La oración habla de entrar al cine.", "Aquí, la cola es una fila de personas.", "cola"],
  },
  {
    en: ["The store will charge a fee for delivery.", "ask as a price", [["store power in a battery", "other-meaning-of-word"], ["be in control of a group", "other-meaning-of-word"]], "The sentence is about paying for delivery.", "Here, “charge” means ask a price.", "charge"],
    es: ["El mesero nos trajo la carta del restaurante.", "lista de platillos", [["mensaje escrito que se envía", "other-meaning-of-word"], ["naipe de una baraja", "other-meaning-of-word"]], "La oración habla de un restaurante.", "Aquí, la carta es el menú.", "carta"],
  },
  {
    en: ["The players drank water during the break.", "a short rest", [["split into pieces", "other-meaning-of-word"], ["a lucky chance", "other-meaning-of-word"]], "The sentence is about players taking time off in the middle of a game.", "Here, a break is a short rest.", "break"],
    es: ["Mi estación favorita es la primavera.", "época del año", [["lugar donde para el tren", "other-meaning-of-word"], ["emisora de radio", "other-meaning-of-word"]], "La oración nombra la primavera.", "Aquí, la estación es una época del año.", "estación"],
  },
  {
    en: ["We need a match to light the campfire.", "a small stick that makes a flame", [["a game between two teams", "other-meaning-of-word"], ["look the same as", "other-meaning-of-word"]], "What lights a campfire?", "Here, a match is a stick that makes fire.", "match"],
    es: ["Guarda la invitación en el sobre.", "envoltura de papel para cartas", [["encima de", "other-meaning-of-word"], ["acerca de", "other-meaning-of-word"]], "La oración dice dónde guardar una invitación.", "Aquí, el sobre es una envoltura de papel.", "sobre"],
  },
  {
    en: ["The river's current was too strong for swimming.", "the flow of water", [["happening now", "other-meaning-of-word"], ["the flow of electricity", "other-meaning-of-word"]], "The sentence is about a river.", "Here, the current is the moving water.", "current"],
    es: ["El barco pasó cerca del cabo antes de llegar al puerto.", "punta de tierra que entra en el mar", [["grado en el ejército", "other-meaning-of-word"], ["extremo de una cuerda", "other-meaning-of-word"]], "La oración habla de un barco en el mar.", "Aquí, el cabo es una punta de tierra.", "cabo"],
  },
  {
    en: ["The scale showed that the puppy weighed eight pounds.", "a device for weighing", [["a thin plate on a fish's skin", "other-meaning-of-word"], ["climb up", "other-meaning-of-word"]], "The sentence is about weighing a puppy.", "Here, a scale weighs things.", "scale"],
    es: ["Aunque parece inventada, la historia de la película es real.", "que existe o pasó de verdad", [["que pertenece al rey", "other-meaning-of-word"], ["antigua moneda española", "other-meaning-of-word"]], "Fíjate en “aunque parece inventada”.", "Aquí, “real” significa verdadero.", "real"],
  },
];

const MULTIPLE_MEANINGS = skill(
  { id: "e.multiple.meanings", grade: "6", title: { en: "Words with several meanings", es: "Palabras con varios significados" }, standard: "L.6.4c", prereqs: ["e.context.clues"] },
  [
    {
      bank: SENSES,
      ask: { en: "Which meaning of {t} is used in this sentence?", es: "¿Qué significado tiene {t} en esta oración?" },
      hints: {
        en: ["This word has more than one meaning. Which meaning fits the other words in the sentence?", "Try each meaning in place of the word and keep the one that makes sense."],
        es: ["Esta palabra tiene más de un significado. ¿Cuál encaja con las demás palabras de la oración?", "Prueba cada significado en lugar de la palabra y quédate con el que tiene sentido."],
      },
      seconds: 15,
    },
  ],
);

// ===================================================================================================
// Grade 7
// ===================================================================================================

// ---------------------------------------------------------------------------------------------------
// e.phrases.clauses — level 1: is the quoted group a phrase, an independent clause or a dependent clause
// (Spanish: frase, oración independiente u oración subordinada; the test is a conjugated verb, since a
// Spanish subject is often left unsaid); level 2: does the group work as a noun, an adjective or an
// adverb in this sentence.

type GroupKind = "phrase" | "independent" | "dependent";
const GROUP_KIND = cats<GroupKind>(
  {
    en: { phrase: "Phrase", independent: "Independent clause", dependent: "Dependent clause" },
    es: { phrase: "Frase", independent: "Oración independiente", dependent: "Oración subordinada" },
  },
  { en: ["phrase", "independent", "dependent"], es: ["phrase", "independent", "dependent"] },
  [
    {
      en: ["After the long game, the players rested in the shade.", "phrase", "Is there a verb in these words? Is anyone doing anything?", "“After the long game” has no subject and no verb, so it is a phrase.", "After the long game"],
      es: ["Después del partido largo, los jugadores descansaron a la sombra.", "phrase", "¿Hay un verbo conjugado en esas palabras?", "“Después del partido largo” no tiene verbo conjugado, así que es una frase.", "Después del partido largo"],
    },
    {
      en: ["The players rested because they were tired.", "dependent", "“They were tired” has a subject and a verb, but look at the word in front of it.", "It has a subject and verb but starts with “because,” so it cannot stand alone: a dependent clause.", "because they were tired"],
      es: ["Los jugadores descansaron porque estaban cansados.", "dependent", "“Estaban cansados” tiene verbo conjugado. ¿Qué palabra va delante?", "Tiene verbo, pero empieza con “porque” y no puede ir sola: es una oración subordinada.", "porque estaban cansados"],
    },
    {
      en: ["The players rested, and the coach handed out water.", "independent", "Read these words by themselves. Are they a complete thought?", "It has a subject (the coach) and a verb (handed), and it can stand alone: an independent clause.", "the coach handed out water"],
      es: ["Los jugadores descansaron y el entrenador repartió agua.", "independent", "Lee esas palabras solas. ¿Tienen sentido completo?", "Tiene sujeto y verbo conjugado, y puede ir sola: es una oración independiente.", "el entrenador repartió agua"],
    },
    {
      en: ["The girl with the red backpack won the spelling bee.", "phrase", "Look for a verb in these words.", "“With the red backpack” has no verb, so it is a phrase.", "with the red backpack"],
      es: ["La niña de la mochila roja ganó el concurso de ortografía.", "phrase", "Busca un verbo conjugado en esas palabras.", "“De la mochila roja” no tiene verbo conjugado, así que es una frase.", "de la mochila roja"],
    },
    {
      en: ["When the bell rang, everyone ran outside.", "dependent", "“The bell rang” has a subject and a verb. What word comes before it?", "It starts with “when,” so it cannot stand alone: a dependent clause.", "When the bell rang"],
      es: ["Cuando sonó el timbre, todos salieron corriendo.", "dependent", "“Sonó el timbre” tiene verbo. ¿Qué palabra va delante?", "Empieza con “cuando” y no puede ir sola: es una oración subordinada.", "Cuando sonó el timbre"],
    },
    {
      en: ["When the bell rang, everyone ran outside.", "independent", "Read these words by themselves. Are they a complete thought?", "It has a subject and a verb and is a complete thought: an independent clause.", "everyone ran outside"],
      es: ["Cuando sonó el timbre, todos salieron corriendo.", "independent", "Lee esas palabras solas. ¿Tienen sentido completo?", "Tiene sujeto y verbo conjugado, y tiene sentido completo: es una oración independiente.", "todos salieron corriendo"],
    },
    {
      en: ["My cousin, a talented painter, sold her first picture.", "phrase", "Look for a verb in these words.", "“A talented painter” renames my cousin but has no verb, so it is a phrase.", "a talented painter"],
      es: ["Mi prima, una pintora talentosa, vendió su primer cuadro.", "phrase", "Busca un verbo conjugado en esas palabras.", "“Una pintora talentosa” explica quién es mi prima, pero no tiene verbo: es una frase.", "una pintora talentosa"],
    },
    {
      en: ["The book that I borrowed is overdue.", "dependent", "“I borrowed” has a subject and a verb. What word starts the group?", "It starts with “that” and only describes the book, so it cannot stand alone: a dependent clause.", "that I borrowed"],
      es: ["El libro que pedí prestado está vencido.", "dependent", "“Pedí” es un verbo conjugado. ¿Con qué palabra empieza el grupo?", "Empieza con “que” y solo describe al libro: es una oración subordinada.", "que pedí prestado"],
    },
    {
      en: ["Running down the hill, Leo tripped on a root.", "phrase", "Is there a subject doing the running inside these words?", "“Running down the hill” has a verb form but no subject, so it is a phrase.", "Running down the hill"],
      es: ["Bajando la colina, Leo tropezó con una raíz.", "phrase", "“Bajando” es un gerundio. ¿Es un verbo conjugado?", "El gerundio no es un verbo conjugado, así que “bajando la colina” es una frase.", "Bajando la colina"],
    },
    {
      en: ["If it snows tomorrow, school will close.", "dependent", "Look at the first word of the group.", "It has a subject and a verb but starts with “if,” so it cannot stand alone: a dependent clause.", "If it snows tomorrow"],
      es: ["Si nieva mañana, no habrá clases.", "dependent", "Fíjate en la primera palabra del grupo.", "Tiene verbo, pero empieza con “si” y no puede ir sola: es una oración subordinada.", "Si nieva mañana"],
    },
    {
      en: ["If it snows tomorrow, school will close.", "independent", "Read these words by themselves. Are they a complete thought?", "It has a subject and a verb and is a complete thought: an independent clause.", "school will close"],
      es: ["Si nieva mañana, no habrá clases.", "independent", "Lee esas palabras solas. ¿Tienen sentido completo?", "Tiene verbo conjugado y sentido completo: es una oración independiente.", "no habrá clases"],
    },
    {
      en: ["We hiked to the top of the mountain.", "phrase", "Look for a verb in these words.", "These words have no subject and no verb, so they are a phrase.", "to the top of the mountain"],
      es: ["Subimos hasta la cima de la montaña.", "phrase", "Busca un verbo conjugado en esas palabras.", "Esas palabras no tienen verbo conjugado: son una frase.", "hasta la cima de la montaña"],
    },
    {
      en: ["Mia, who loves astronomy, joined the science club.", "dependent", "These words have a verb. Could they stand alone as a statement?", "“Who loves astronomy” describes Mia and cannot stand alone: a dependent clause.", "who loves astronomy"],
      es: ["Mía, que ama la astronomía, entró al club de ciencias.", "dependent", "Esas palabras tienen verbo. ¿Podrían ir solas como una afirmación?", "Describe a Mía y no puede ir sola: es una oración subordinada.", "que ama la astronomía"],
    },
    {
      en: ["Although it was cold, we swam in the lake.", "independent", "Read these words by themselves. Are they a complete thought?", "It has a subject and a verb and is a complete thought: an independent clause.", "we swam in the lake"],
      es: ["Aunque hacía frío, nadamos en el lago.", "independent", "Lee esas palabras solas. ¿Tienen sentido completo?", "Tiene verbo conjugado (el sujeto, nosotros, no se dice) y sentido completo: es una oración independiente.", "nadamos en el lago"],
    },
    {
      en: ["Although it was cold, we swam in the lake.", "dependent", "Look at the first word of the group.", "It starts with “although,” so it cannot stand alone: a dependent clause.", "Although it was cold"],
      es: ["Aunque hacía frío, nadamos en el lago.", "dependent", "Fíjate en la primera palabra del grupo.", "Empieza con “aunque” y no puede ir sola: es una oración subordinada.", "Aunque hacía frío"],
    },
    {
      en: ["The dog barked at the mail carrier, but the cat slept.", "independent", "Read these words by themselves. Are they a complete thought?", "It has a subject and a verb and is a complete thought: an independent clause.", "the cat slept"],
      es: ["El perro le ladró al cartero, pero el gato siguió dormido.", "independent", "Lee esas palabras solas. ¿Tienen sentido completo?", "Tiene sujeto y verbo conjugado, y tiene sentido completo: es una oración independiente.", "el gato siguió dormido"],
    },
  ],
);

type GroupJob = "noun" | "adjective" | "adverb";
const GROUP_JOB = cats<GroupJob>(
  {
    en: { noun: "Works as a noun", adjective: "Works as an adjective", adverb: "Works as an adverb" },
    es: { noun: "Funciona como sustantivo", adjective: "Funciona como adjetivo", adverb: "Funciona como adverbio" },
  },
  { en: ["noun", "adjective", "adverb"], es: ["noun", "adjective", "adverb"] },
  [
    {
      en: ["The girl with the red backpack won the spelling bee.", "adjective", "Ask: which girl?", "“With the red backpack” tells which girl, so it works as an adjective.", "with the red backpack"],
      es: ["La niña de la mochila roja ganó el concurso de ortografía.", "adjective", "Pregúntate: ¿cuál niña?", "“De la mochila roja” dice cuál niña, así que funciona como adjetivo.", "de la mochila roja"],
    },
    {
      en: ["We hiked to the top of the mountain.", "adverb", "Ask: where did we hike?", "It tells where we hiked, so it works as an adverb.", "to the top of the mountain"],
      es: ["Subimos hasta la cima de la montaña.", "adverb", "Pregúntate: ¿hasta dónde subimos?", "Dice hasta dónde, así que funciona como adverbio.", "hasta la cima de la montaña"],
    },
    {
      en: ["Reading mystery novels is my favorite hobby.", "noun", "Ask: what is my favorite hobby?", "It names an activity and is the subject, so it works as a noun.", "Reading mystery novels"],
      es: ["Leer novelas de misterio es mi pasatiempo favorito.", "noun", "Pregúntate: ¿qué es mi pasatiempo favorito?", "Nombra una actividad y es el sujeto, así que funciona como sustantivo.", "Leer novelas de misterio"],
    },
    {
      en: ["After lunch, the class visited the garden.", "adverb", "Ask: when did the class visit?", "It tells when, so it works as an adverb.", "After lunch"],
      es: ["Después del almuerzo, la clase visitó el huerto.", "adverb", "Pregúntate: ¿cuándo visitó la clase el huerto?", "Dice cuándo, así que funciona como adverbio.", "Después del almuerzo"],
    },
    {
      en: ["The house on the corner has a blue door.", "adjective", "Ask: which house?", "It tells which house, so it works as an adjective.", "on the corner"],
      es: ["La casa de la esquina tiene una puerta azul.", "adjective", "Pregúntate: ¿cuál casa?", "Dice cuál casa, así que funciona como adjetivo.", "de la esquina"],
    },
    {
      en: ["I know that the bus will be late.", "noun", "Ask: what do I know?", "The clause answers “what?” and is the object of “know,” so it works as a noun.", "that the bus will be late"],
      es: ["Sé que el autobús va a llegar tarde.", "noun", "Pregúntate: ¿qué sé?", "Responde a “¿qué?” y es el complemento de “sé”, así que funciona como sustantivo.", "que el autobús va a llegar tarde"],
    },
    {
      en: ["We stayed inside because it was raining.", "adverb", "Ask: why did we stay inside?", "It tells why, so it works as an adverb.", "because it was raining"],
      es: ["Nos quedamos adentro porque estaba lloviendo.", "adverb", "Pregúntate: ¿por qué nos quedamos adentro?", "Dice por qué, así que funciona como adverbio.", "porque estaba lloviendo"],
    },
    {
      en: ["The painting that hangs in the hall is mine.", "adjective", "Ask: which painting?", "It tells which painting, so it works as an adjective.", "that hangs in the hall"],
      es: ["El cuadro que cuelga en el pasillo es mío.", "adjective", "Pregúntate: ¿cuál cuadro?", "Dice cuál cuadro, así que funciona como adjetivo.", "que cuelga en el pasillo"],
    },
    {
      en: ["To win the race was Maya's goal.", "noun", "Ask: what was Maya's goal?", "It names the goal and is the subject, so it works as a noun.", "To win the race"],
      es: ["Ganar la carrera era la meta de Maya.", "noun", "Pregúntate: ¿qué era la meta de Maya?", "Nombra la meta y es el sujeto, así que funciona como sustantivo.", "Ganar la carrera"],
    },
    {
      en: ["The puppy slept under the kitchen table.", "adverb", "Ask: where did the puppy sleep?", "It tells where, so it works as an adverb.", "under the kitchen table"],
      es: ["El cachorro durmió debajo de la mesa de la cocina.", "adverb", "Pregúntate: ¿dónde durmió el cachorro?", "Dice dónde, así que funciona como adverbio.", "debajo de la mesa de la cocina"],
    },
    {
      en: ["A bowl of hot soup warmed us up.", "adjective", "Ask: what kind of bowl?", "It tells what kind of bowl, so it works as an adjective.", "of hot soup"],
      es: ["Un plato de sopa caliente nos reconfortó.", "adjective", "Pregúntate: ¿qué clase de plato?", "Dice qué clase de plato, así que funciona como adjetivo.", "de sopa caliente"],
    },
    {
      en: ["Whoever finishes first can choose the game.", "noun", "Ask: who can choose the game?", "The clause is the subject of the sentence, so it works as a noun.", "Whoever finishes first"],
      es: ["Quien termine primero puede elegir el juego.", "noun", "Pregúntate: ¿quién puede elegir el juego?", "Es el sujeto de la oración, así que funciona como sustantivo.", "Quien termine primero"],
    },
    {
      en: ["Leo practiced the piano until his fingers hurt.", "adverb", "Ask: how long did Leo practice?", "It tells how long, so it works as an adverb.", "until his fingers hurt"],
      es: ["Leo practicó el piano hasta que le dolieron los dedos.", "adverb", "Pregúntate: ¿hasta cuándo practicó Leo?", "Dice hasta cuándo, así que funciona como adverbio.", "hasta que le dolieron los dedos"],
    },
    {
      en: ["The student who answered first got a sticker.", "adjective", "Ask: which student?", "It tells which student, so it works as an adjective.", "who answered first"],
      es: ["El estudiante que respondió primero ganó una estampa.", "adjective", "Pregúntate: ¿cuál estudiante?", "Dice cuál estudiante, así que funciona como adjetivo.", "que respondió primero"],
    },
    {
      en: ["Grandpa enjoys working in his garden.", "noun", "Ask: what does Grandpa enjoy?", "It names the activity he enjoys, so it works as a noun.", "working in his garden"],
      es: ["Al abuelo le encanta trabajar en su jardín.", "noun", "Pregúntate: ¿qué le encanta al abuelo?", "Nombra la actividad que le encanta (es el sujeto de “encanta”), así que funciona como sustantivo.", "trabajar en su jardín"],
    },
  ],
);

const PHRASES_CLAUSES = skill(
  { id: "e.phrases.clauses", grade: "7", title: { en: "Phrases and clauses", es: "Frases y oraciones" }, standard: "L.7.1a", prereqs: ["e.subject.verb"] },
  [
    {
      ...GROUP_KIND,
      ask: { en: "In this sentence, what is {t}?", es: "En esta oración, ¿qué es {t}?" },
      hints: {
        en: ["Look for a subject and a verb inside the quoted words.", "A phrase has no subject-verb pair; a clause has one. An independent clause can stand alone as a sentence. A dependent clause starts with a word like because, when, if, although, that, or who, and cannot stand alone."],
        es: ["Busca un verbo conjugado dentro de las palabras entre comillas.", "Una frase no tiene verbo conjugado; una oración sí. La oración independiente podría ir sola; la subordinada empieza con palabras como porque, cuando, si, aunque o que, y no puede ir sola."],
      },
      seconds: 20,
    },
    {
      ...GROUP_JOB,
      ask: { en: "What job does {t} do in this sentence?", es: "¿Qué función cumple {t} en esta oración?" },
      hints: {
        en: ["Ask what question the group of words answers.", "If it names a thing or activity (what? who?), it works as a noun. If it tells which one or what kind, it works as an adjective. If it tells when, where, why, how, or how long, it works as an adverb."],
        es: ["Pregúntate a qué pregunta responde el grupo de palabras.", "Si nombra una cosa o una actividad (¿qué?, ¿quién?), funciona como sustantivo. Si dice cuál o de qué clase, como adjetivo. Si dice cuándo, dónde, por qué, cómo o hasta cuándo, como adverbio."],
      },
      seconds: 25,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.combining.sentences — level 1: join two sentences with the coordinating word that shows how they
// relate (and, but, or, so / y, pero, o, así que); level 2: make one idea a dependent clause (because,
// although, if, when / porque, como, aunque, si, cuando). English rules out the comma splice; Spanish
// rules out two sentences run together with no connector, and puts no comma before "y" or "o".

const COORDINATE: Bi<Entry>[] = [
  {
    en: ["It rained all morning. The game was canceled.", "It rained all morning, so the game was canceled.", [["It rained all morning, but the game was canceled.", "wrong-relationship"], ["It rained all morning, the game was canceled.", "comma-splice"], ["The game was canceled, so it rained all morning.", "reversed-relationship"]], "Did the rain cause the cancellation, or go against it?", "The rain caused the cancellation, so the link is a result: “so.”"],
    es: ["Llovió toda la mañana. Se canceló el partido.", "Llovió toda la mañana, así que se canceló el partido.", [["Llovió toda la mañana, pero se canceló el partido.", "wrong-relationship"], ["Llovió toda la mañana se canceló el partido.", "run-on"], ["Se canceló el partido, así que llovió toda la mañana.", "reversed-relationship"]], "¿La lluvia causó la cancelación, o va en contra de ella?", "La lluvia causó la cancelación: es una consecuencia, y se une con “así que”."],
  },
  {
    en: ["Mina practiced every day. She did not make the team.", "Mina practiced every day, but she did not make the team.", [["Mina practiced every day, so she did not make the team.", "wrong-relationship"], ["Mina practiced every day, she did not make the team.", "comma-splice"]], "Is the second idea what you would expect after the first?", "The second idea goes against what you expect, so the link is a contrast: “but.”"],
    es: ["Mina practicó todos los días. No entró al equipo.", "Mina practicó todos los días, pero no entró al equipo.", [["Mina practicó todos los días, así que no entró al equipo.", "wrong-relationship"], ["Mina practicó todos los días no entró al equipo.", "run-on"]], "¿La segunda idea es lo que esperarías después de la primera?", "La segunda idea va en contra de lo esperado: es un contraste, y se une con “pero”."],
  },
  {
    en: ["You can walk to school. You can ride the bus.", "You can walk to school, or you can ride the bus.", [["You can walk to school, but you can ride the bus.", "wrong-relationship"], ["You can walk to school, you can ride the bus.", "comma-splice"]], "The sentences give two options.", "Two choices are joined with “or.”"],
    es: ["Puedes caminar a la escuela. Puedes tomar el autobús.", "Puedes caminar a la escuela o puedes tomar el autobús.", [["Puedes caminar a la escuela, pero puedes tomar el autobús.", "wrong-relationship"], ["Puedes caminar a la escuela puedes tomar el autobús.", "run-on"]], "Las oraciones dan dos opciones.", "Dos opciones se unen con “o”, sin coma."],
  },
  {
    en: ["The library was closed. We studied at the park.", "The library was closed, so we studied at the park.", [["The library was closed, or we studied at the park.", "wrong-relationship"], ["The library was closed, we studied at the park.", "comma-splice"], ["We studied at the park, so the library was closed.", "reversed-relationship"]], "Why did we study at the park?", "The closed library caused the change, so the link is a result: “so.”"],
    es: ["La biblioteca estaba cerrada. Estudiamos en el parque.", "La biblioteca estaba cerrada, así que estudiamos en el parque.", [["La biblioteca estaba cerrada o estudiamos en el parque.", "wrong-relationship"], ["La biblioteca estaba cerrada estudiamos en el parque.", "run-on"], ["Estudiamos en el parque, así que la biblioteca estaba cerrada.", "reversed-relationship"]], "¿Por qué estudiamos en el parque?", "La biblioteca cerrada causó el cambio: es una consecuencia, y se une con “así que”."],
  },
  {
    en: ["Jamal plays the drums. His sister plays the violin.", "Jamal plays the drums, and his sister plays the violin.", [["Jamal plays the drums, so his sister plays the violin.", "wrong-relationship"], ["Jamal plays the drums, his sister plays the violin.", "comma-splice"]], "The second sentence adds a fact of the same kind.", "Two facts of the same kind are joined with “and.”"],
    es: ["Jamal toca la batería. Su hermana toca el violín.", "Jamal toca la batería y su hermana toca el violín.", [["Jamal toca la batería, así que su hermana toca el violín.", "wrong-relationship"], ["Jamal toca la batería su hermana toca el violín.", "run-on"]], "La segunda oración agrega un dato del mismo tipo.", "Dos datos del mismo tipo se unen con “y”, sin coma."],
  },
  {
    en: ["The soup was too hot. Leo waited a few minutes.", "The soup was too hot, so Leo waited a few minutes.", [["The soup was too hot, but Leo waited a few minutes.", "wrong-relationship"], ["The soup was too hot, Leo waited a few minutes.", "comma-splice"], ["Leo waited a few minutes, so the soup was too hot.", "reversed-relationship"]], "Why did Leo wait?", "The hot soup caused the waiting, so the link is a result: “so.”"],
    es: ["La sopa estaba muy caliente. Leo esperó unos minutos.", "La sopa estaba muy caliente, así que Leo esperó unos minutos.", [["La sopa estaba muy caliente, pero Leo esperó unos minutos.", "wrong-relationship"], ["La sopa estaba muy caliente Leo esperó unos minutos.", "run-on"], ["Leo esperó unos minutos, así que la sopa estaba muy caliente.", "reversed-relationship"]], "¿Por qué esperó Leo?", "La sopa caliente causó la espera: es una consecuencia, y se une con “así que”."],
  },
  {
    en: ["The museum was crowded. We still saw every exhibit.", "The museum was crowded, but we still saw every exhibit.", [["The museum was crowded, so we still saw every exhibit.", "wrong-relationship"], ["The museum was crowded, we still saw every exhibit.", "comma-splice"]], "Would a crowd usually help you see everything?", "Seeing everything goes against what a crowd leads you to expect, so the link is a contrast: “but.”"],
    es: ["El museo estaba lleno de gente. Vimos todas las salas.", "El museo estaba lleno de gente, pero vimos todas las salas.", [["El museo estaba lleno de gente, así que vimos todas las salas.", "wrong-relationship"], ["El museo estaba lleno de gente vimos todas las salas.", "run-on"]], "¿Mucha gente suele ayudar a ver todo?", "Ver todo va en contra de lo esperado: es un contraste, y se une con “pero”."],
  },
  {
    en: ["Bring a jacket. You might get cold.", "Bring a jacket, or you might get cold.", [["Bring a jacket, so you might get cold.", "wrong-relationship"], ["Bring a jacket, you might get cold.", "comma-splice"]], "What happens if you do not bring a jacket?", "Here “or” means “if not”: without a jacket, you might get cold."],
    es: ["Lleva una chaqueta. Te puede dar frío.", "Lleva una chaqueta o te puede dar frío.", [["Lleva una chaqueta, así que te puede dar frío.", "wrong-relationship"], ["Lleva una chaqueta te puede dar frío.", "run-on"]], "¿Qué pasa si no llevas chaqueta?", "Aquí “o” significa “si no”: sin chaqueta, te puede dar frío."],
  },
  {
    en: ["The power went out. We played board games by candlelight.", "The power went out, so we played board games by candlelight.", [["The power went out, but we played board games by candlelight.", "wrong-relationship"], ["The power went out, we played board games by candlelight.", "comma-splice"], ["We played board games by candlelight, so the power went out.", "reversed-relationship"]], "Why did we play by candlelight?", "The power outage caused the candlelight games, so the link is a result: “so.”"],
    es: ["Se fue la luz. Jugamos juegos de mesa con velas.", "Se fue la luz, así que jugamos juegos de mesa con velas.", [["Se fue la luz, pero jugamos juegos de mesa con velas.", "wrong-relationship"], ["Se fue la luz jugamos juegos de mesa con velas.", "run-on"], ["Jugamos juegos de mesa con velas, así que se fue la luz.", "reversed-relationship"]], "¿Por qué jugamos con velas?", "El apagón causó el juego con velas: es una consecuencia, y se une con “así que”."],
  },
  {
    en: ["Kai loves basketball. He has never played on a team.", "Kai loves basketball, but he has never played on a team.", [["Kai loves basketball, so he has never played on a team.", "wrong-relationship"], ["Kai loves basketball, he has never played on a team.", "comma-splice"]], "Is the second fact what you would expect?", "Never playing on a team is surprising for someone who loves the game, so the link is a contrast: “but.”"],
    es: ["A Kai le encanta el básquetbol. Nunca ha jugado en un equipo.", "A Kai le encanta el básquetbol, pero nunca ha jugado en un equipo.", [["A Kai le encanta el básquetbol, así que nunca ha jugado en un equipo.", "wrong-relationship"], ["A Kai le encanta el básquetbol nunca ha jugado en un equipo.", "run-on"]], "¿El segundo dato es lo que esperarías?", "Es sorprendente para alguien a quien le encanta el juego: es un contraste, y se une con “pero”."],
  },
  {
    en: ["The bakery sells fresh bread. It sells muffins too.", "The bakery sells fresh bread, and it sells muffins too.", [["The bakery sells fresh bread, but it sells muffins too.", "wrong-relationship"], ["The bakery sells fresh bread, it sells muffins too.", "comma-splice"]], "The second sentence adds one more thing the bakery sells.", "An added fact of the same kind is joined with “and.”"],
    es: ["La panadería vende pan fresco. También vende panecillos.", "La panadería vende pan fresco y también vende panecillos.", [["La panadería vende pan fresco, pero también vende panecillos.", "wrong-relationship"], ["La panadería vende pan fresco también vende panecillos.", "run-on"]], "La segunda oración agrega otra cosa que vende la panadería.", "Un dato más del mismo tipo se une con “y”, sin coma."],
  },
  {
    en: ["We can eat lunch now. We can wait until after the game.", "We can eat lunch now, or we can wait until after the game.", [["We can eat lunch now, so we can wait until after the game.", "wrong-relationship"], ["We can eat lunch now, we can wait until after the game.", "comma-splice"]], "The sentences give two options.", "Two choices are joined with “or.”"],
    es: ["Podemos almorzar ahora. Podemos esperar hasta después del partido.", "Podemos almorzar ahora o podemos esperar hasta después del partido.", [["Podemos almorzar ahora, así que podemos esperar hasta después del partido.", "wrong-relationship"], ["Podemos almorzar ahora podemos esperar hasta después del partido.", "run-on"]], "Las oraciones dan dos opciones.", "Dos opciones se unen con “o”, sin coma."],
  },
  {
    en: ["The trail was steep. Everyone reached the top.", "The trail was steep, but everyone reached the top.", [["The trail was steep, so everyone reached the top.", "wrong-relationship"], ["The trail was steep, everyone reached the top.", "comma-splice"]], "Does a steep trail usually make the climb easier or harder?", "Reaching the top goes against what a steep trail leads you to expect, so the link is a contrast: “but.”"],
    es: ["El sendero era empinado. Todos llegaron a la cima.", "El sendero era empinado, pero todos llegaron a la cima.", [["El sendero era empinado, así que todos llegaron a la cima.", "wrong-relationship"], ["El sendero era empinado todos llegaron a la cima.", "run-on"]], "¿Un sendero empinado facilita o dificulta la subida?", "Llegar a la cima va en contra de lo esperado: es un contraste, y se une con “pero”."],
  },
  {
    en: ["Our class raised 300 dollars. We bought a new tree for the courtyard.", "Our class raised 300 dollars, so we bought a new tree for the courtyard.", [["Our class raised 300 dollars, or we bought a new tree for the courtyard.", "wrong-relationship"], ["Our class raised 300 dollars, we bought a new tree for the courtyard.", "comma-splice"], ["We bought a new tree for the courtyard, so our class raised 300 dollars.", "reversed-relationship"]], "What made it possible to buy the tree?", "Raising the money led to buying the tree, so the link is a result: “so.”"],
    es: ["Nuestra clase reunió 300 dólares. Compramos un árbol nuevo para el patio.", "Nuestra clase reunió 300 dólares, así que compramos un árbol nuevo para el patio.", [["Nuestra clase reunió 300 dólares o compramos un árbol nuevo para el patio.", "wrong-relationship"], ["Nuestra clase reunió 300 dólares compramos un árbol nuevo para el patio.", "run-on"], ["Compramos un árbol nuevo para el patio, así que nuestra clase reunió 300 dólares.", "reversed-relationship"]], "¿Qué hizo posible comprar el árbol?", "Reunir el dinero llevó a comprar el árbol: es una consecuencia, y se une con “así que”."],
  },
];

const SUBORDINATE: Bi<Entry>[] = [
  {
    en: ["The game was canceled. It rained all morning.", "The game was canceled because it rained all morning.", [["The game was canceled although it rained all morning.", "wrong-relationship"], ["It rained all morning because the game was canceled.", "reversed-relationship"], ["Because it rained all morning. The game was canceled.", "fragment"]], "Which event caused the other?", "The rain is the cause, so it goes in the “because” clause."],
    es: ["Se canceló el partido. Llovió toda la mañana.", "Se canceló el partido porque llovió toda la mañana.", [["Se canceló el partido aunque llovió toda la mañana.", "wrong-relationship"], ["Llovió toda la mañana porque se canceló el partido.", "reversed-relationship"], ["Porque llovió toda la mañana. Se canceló el partido.", "fragment"]], "¿Qué hecho causó el otro?", "La lluvia es la causa, así que va en la subordinada con “porque”."],
  },
  {
    en: ["It was cold. We swam in the lake anyway.", "Although it was cold, we swam in the lake.", [["Because it was cold, we swam in the lake.", "wrong-relationship"], ["Although it was cold. We swam in the lake.", "fragment"]], "Is swimming in the cold what you would expect?", "The ideas contrast, so use “although.”"],
    es: ["Hacía frío. Igual nadamos en el lago.", "Aunque hacía frío, nadamos en el lago.", [["Como hacía frío, nadamos en el lago.", "wrong-relationship"], ["Aunque hacía frío. Nadamos en el lago.", "fragment"]], "¿Nadar con frío es lo que esperarías?", "Las ideas se oponen, así que se usa “aunque”."],
  },
  {
    en: ["You finish your homework. Then you can watch the movie.", "If you finish your homework, you can watch the movie.", [["Although you finish your homework, you can watch the movie.", "wrong-relationship"], ["If you can watch the movie, you finish your homework.", "reversed-relationship"], ["If you finish your homework. You can watch the movie.", "fragment"]], "One thing has to happen first for the other to happen.", "It is a condition, so use “if.”"],
    es: ["Terminas la tarea. Luego puedes ver la película.", "Si terminas la tarea, puedes ver la película.", [["Aunque terminas la tarea, puedes ver la película.", "wrong-relationship"], ["Si puedes ver la película, terminas la tarea.", "reversed-relationship"], ["Si terminas la tarea. Puedes ver la película.", "fragment"]], "Una cosa tiene que pasar para que pase la otra.", "Es una condición, así que se usa “si”."],
  },
  {
    en: ["The bell rang. Everyone ran outside.", "When the bell rang, everyone ran outside.", [["Unless the bell rang, everyone ran outside.", "wrong-relationship"], ["When everyone ran outside, the bell rang.", "reversed-relationship"], ["When the bell rang. Everyone ran outside.", "fragment"]], "Which happened first?", "One event happened at the time of the other, so use “when.”"],
    es: ["Sonó el timbre. Todos salieron corriendo.", "Cuando sonó el timbre, todos salieron corriendo.", [["Aunque sonó el timbre, todos salieron corriendo.", "wrong-relationship"], ["Cuando todos salieron corriendo, sonó el timbre.", "reversed-relationship"], ["Cuando sonó el timbre. Todos salieron corriendo.", "fragment"]], "¿Qué pasó primero?", "Un hecho pasó en el momento del otro, así que se usa “cuando”."],
  },
  {
    en: ["Leo studied hard. He wanted to pass the test.", "Leo studied hard because he wanted to pass the test.", [["Leo studied hard although he wanted to pass the test.", "wrong-relationship"], ["Leo wanted to pass the test because he studied hard.", "reversed-relationship"], ["Because he wanted to pass the test. Leo studied hard.", "fragment"]], "Why did Leo study?", "Wanting to pass is the reason, so it goes in the “because” clause."],
    es: ["Leo estudió mucho. Quería aprobar el examen.", "Leo estudió mucho porque quería aprobar el examen.", [["Leo estudió mucho aunque quería aprobar el examen.", "wrong-relationship"], ["Leo quería aprobar el examen porque estudió mucho.", "reversed-relationship"], ["Porque quería aprobar el examen. Leo estudió mucho.", "fragment"]], "¿Por qué estudió Leo?", "Querer aprobar es la razón, así que va en la subordinada con “porque”."],
  },
  {
    en: ["The movie was long. Nobody fell asleep.", "Although the movie was long, nobody fell asleep.", [["Because the movie was long, nobody fell asleep.", "wrong-relationship"], ["Although the movie was long. Nobody fell asleep.", "fragment"]], "Would a long movie usually keep everyone awake?", "The ideas contrast, so use “although.”"],
    es: ["La película era larga. Nadie se durmió.", "Aunque la película era larga, nadie se durmió.", [["Como la película era larga, nadie se durmió.", "wrong-relationship"], ["Aunque la película era larga. Nadie se durmió.", "fragment"]], "¿Una película larga suele mantener a todos despiertos?", "Las ideas se oponen, así que se usa “aunque”."],
  },
  {
    en: ["You must water the plants. Otherwise, they will dry out.", "The plants will dry out unless you water them.", [["The plants will dry out because you water them.", "wrong-relationship"], ["The plants will dry out if you water them.", "wrong-relationship"], ["Unless you water them. The plants will dry out.", "fragment"]], "The plants dry out only if one thing does not happen.", "“Unless” means “if not,” so it fits."],
    es: ["Tienes que regar las plantas. Si no, se secarán.", "Las plantas se secarán si no las riegas.", [["Las plantas se secarán porque las riegas.", "wrong-relationship"], ["Las plantas se secarán aunque las riegues.", "wrong-relationship"], ["Si no las riegas. Las plantas se secarán.", "fragment"]], "Las plantas se secan solo si algo no pasa.", "Es una condición negativa: “si no las riegas”."],
  },
  {
    en: ["The puppy saw the leash. It started wagging its tail.", "When the puppy saw the leash, it started wagging its tail.", [["Although the puppy saw the leash, it started wagging its tail.", "wrong-relationship"], ["When the puppy started wagging its tail, it saw the leash.", "reversed-relationship"], ["When the puppy saw the leash. It started wagging its tail.", "fragment"]], "What happened first, and what happened next?", "Seeing the leash came first, so it goes in the “when” clause."],
    es: ["El cachorro vio la correa. Empezó a mover la cola.", "Cuando el cachorro vio la correa, empezó a mover la cola.", [["Aunque el cachorro vio la correa, empezó a mover la cola.", "wrong-relationship"], ["Cuando el cachorro empezó a mover la cola, vio la correa.", "reversed-relationship"], ["Cuando el cachorro vio la correa. Empezó a mover la cola.", "fragment"]], "¿Qué pasó primero y qué pasó después?", "Ver la correa pasó primero, así que va en la subordinada con “cuando”."],
  },
  {
    en: ["The road was icy. The buses ran late.", "Because the road was icy, the buses ran late.", [["Although the road was icy, the buses ran late.", "wrong-relationship"], ["Because the buses ran late, the road was icy.", "reversed-relationship"], ["Because the road was icy. The buses ran late.", "fragment"]], "Which fact caused the other?", "The ice is the cause, so it goes in the “because” clause."],
    es: ["La carretera estaba congelada. Los autobuses llegaron tarde.", "Como la carretera estaba congelada, los autobuses llegaron tarde.", [["Aunque la carretera estaba congelada, los autobuses llegaron tarde.", "wrong-relationship"], ["Como los autobuses llegaron tarde, la carretera estaba congelada.", "reversed-relationship"], ["Como la carretera estaba congelada. Los autobuses llegaron tarde.", "fragment"]], "¿Qué hecho causó el otro?", "El hielo es la causa. “Como” causal va al principio de la oración."],
  },
  {
    en: ["Ana is shy. She gave a great speech.", "Although Ana is shy, she gave a great speech.", [["Because Ana is shy, she gave a great speech.", "wrong-relationship"], ["Although Ana is shy. She gave a great speech.", "fragment"]], "Is a great speech what you would expect from a shy person?", "The ideas contrast, so use “although.”"],
    es: ["Ana es tímida. Dio un gran discurso.", "Aunque Ana es tímida, dio un gran discurso.", [["Como Ana es tímida, dio un gran discurso.", "wrong-relationship"], ["Aunque Ana es tímida. Dio un gran discurso.", "fragment"]], "¿Un gran discurso es lo que esperarías de alguien tímido?", "Las ideas se oponen, así que se usa “aunque”."],
  },
  {
    en: ["It might stop raining. Then we will go to the park.", "If it stops raining, we will go to the park.", [["Although it stops raining, we will go to the park.", "wrong-relationship"], ["If we go to the park, it will stop raining.", "reversed-relationship"], ["If it stops raining. We will go to the park.", "fragment"]], "Which event depends on the other?", "Going to the park depends on the rain stopping, so use “if.”"],
    es: ["Puede que deje de llover. Entonces iremos al parque.", "Si deja de llover, iremos al parque.", [["Aunque deja de llover, iremos al parque.", "wrong-relationship"], ["Si vamos al parque, dejará de llover.", "reversed-relationship"], ["Si deja de llover. Iremos al parque.", "fragment"]], "¿Qué hecho depende del otro?", "Ir al parque depende de que deje de llover, así que se usa “si”."],
  },
  {
    en: ["Dad got home. Then we ate dinner.", "After Dad got home, we ate dinner.", [["Although Dad got home, we ate dinner.", "wrong-relationship"], ["After we ate dinner, Dad got home.", "reversed-relationship"], ["After Dad got home. We ate dinner.", "fragment"]], "Which happened first?", "Dad got home first, so it goes in the “after” clause."],
    es: ["Papá llegó a casa. Luego cenamos.", "Después de que papá llegó a casa, cenamos.", [["Aunque papá llegó a casa, cenamos.", "wrong-relationship"], ["Después de que cenamos, papá llegó a casa.", "reversed-relationship"], ["Después de que papá llegó a casa. Cenamos.", "fragment"]], "¿Qué pasó primero?", "Papá llegó primero, así que va en la subordinada con “después de que”."],
  },
  {
    en: ["The team lost the game. They celebrated their best season ever.", "Even though the team lost the game, they celebrated their best season ever.", [["Because the team lost the game, they celebrated their best season ever.", "wrong-relationship"], ["Even though the team lost the game. They celebrated their best season ever.", "fragment"]], "Is celebrating what you would expect after a loss?", "The ideas contrast, so use “even though.”"],
    es: ["El equipo perdió el partido. Celebró su mejor temporada.", "Aunque el equipo perdió el partido, celebró su mejor temporada.", [["Como el equipo perdió el partido, celebró su mejor temporada.", "wrong-relationship"], ["Aunque el equipo perdió el partido. Celebró su mejor temporada.", "fragment"]], "¿Celebrar es lo que esperarías después de perder?", "Las ideas se oponen, así que se usa “aunque”."],
  },
  {
    en: ["Sam forgot his lunch. His friends shared theirs.", "Because Sam forgot his lunch, his friends shared theirs.", [["Although Sam forgot his lunch, his friends shared theirs.", "wrong-relationship"], ["Because his friends shared their lunch, Sam forgot his.", "reversed-relationship"], ["Because Sam forgot his lunch. His friends shared theirs.", "fragment"]], "Why did his friends share?", "Forgetting the lunch is the cause, so it goes in the “because” clause."],
    es: ["Sam olvidó su almuerzo. Sus amigos compartieron el suyo.", "Como Sam olvidó su almuerzo, sus amigos compartieron el suyo.", [["Aunque Sam olvidó su almuerzo, sus amigos compartieron el suyo.", "wrong-relationship"], ["Como sus amigos compartieron su almuerzo, Sam olvidó el suyo.", "reversed-relationship"], ["Como Sam olvidó su almuerzo. Sus amigos compartieron el suyo.", "fragment"]], "¿Por qué compartieron sus amigos?", "Olvidar el almuerzo es la causa. “Como” causal va al principio de la oración."],
  },
];

const JOIN_ASK: Bi<string> = { en: "Which sentence joins the two ideas with the right connecting word?", es: "¿Qué oración une las dos ideas con el conector correcto?" };

const COMBINING = skill(
  { id: "e.combining.sentences", grade: "7", title: { en: "Combine sentences", es: "Unir oraciones" }, standard: "L.7.1b", prereqs: ["e.sentence.types"] },
  [
    {
      bank: COORDINATE,
      ask: JOIN_ASK,
      hints: {
        en: ["How are the two ideas related: one more fact, a contrast, a choice, or a result?", "Use “and” to add, “but” to contrast, “or” for a choice, and “so” for a result. Put a comma before the joining word. A comma alone cannot join two sentences."],
        es: ["¿Cómo se relacionan las dos ideas: un dato más, un contraste, una opción o una consecuencia?", "Usa “y” para sumar, “pero” para contrastar, “o” para elegir y “así que” para una consecuencia. Va coma antes de “pero” y de “así que”, pero no antes de “y” ni de “o”."],
      },
      seconds: 25,
    },
    {
      bank: SUBORDINATE,
      ask: JOIN_ASK,
      hints: {
        en: ["Which idea is the cause, the condition, the time, or the surprise?", "Start that idea with because, if, when, after, unless, or although. A clause that starts with one of these words cannot stand alone, so join it to the other idea, with a comma if it comes first."],
        es: ["¿Qué idea es la causa, la condición, el momento o la sorpresa?", "Empieza esa idea con porque, como, si, cuando, después de que o aunque. La subordinada no puede ir sola: únela a la otra idea, con coma si va primero."],
      },
      seconds: 30,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.modifiers — level 1: the meaning is given; pick the sentence that puts each describing phrase next to
// the word it describes (Spanish classics: "camisas de algodón para hombre", "cuna de madera para bebé");
// level 2: fix a dangling modifier (Spanish: gerundio y participio colgantes).

const MISPLACED: Bi<Entry>[] = [
  {
    en: ["The girl is wearing a pink sweater. She is walking her dog.", "The girl in a pink sweater walked her dog.", [["The girl walked her dog in a pink sweater.", "misplaced-modifier"], ["In a pink sweater, her dog was walked by the girl.", "misplaced-modifier"]], "Who wears the sweater? Put the phrase right next to that word.", "“In a pink sweater” goes right after “the girl.”"],
    es: ["Las camisas son de algodón y son para hombre.", "Se venden camisas de algodón para hombre.", [["Se venden camisas para hombre de algodón.", "misplaced-modifier"], ["De algodón se venden camisas para hombre.", "misplaced-modifier"]], "¿Qué es de algodón: las camisas o el hombre?", "“De algodón” va junto a “camisas”."],
  },
  {
    en: ["Mia ate nearly all of the pizza. One slice was left.", "Mia ate almost the whole pizza.", [["Mia almost ate the whole pizza.", "misplaced-modifier"], ["Almost Mia ate the whole pizza.", "misplaced-modifier"]], "What is “almost”: the eating, or the whole pizza?", "“Almost” goes right before “the whole pizza,” because she ate nearly all of it."],
    es: ["La cuna es de madera y es para bebé.", "Vendo cuna de madera para bebé.", [["Vendo cuna para bebé de madera.", "misplaced-modifier"], ["De madera vendo cuna para bebé.", "misplaced-modifier"]], "¿Qué es de madera: la cuna o el bebé?", "“De madera” va junto a “cuna”."],
  },
  {
    en: ["The bike has a broken chain. I bought it from my neighbor.", "I bought a bike with a broken chain from my neighbor.", [["I bought a bike from my neighbor with a broken chain.", "misplaced-modifier"], ["With a broken chain, I bought a bike from my neighbor.", "misplaced-modifier"]], "What has the broken chain?", "“With a broken chain” goes right after “a bike.”"],
    es: ["La niña lleva un suéter rosa. Pasea a su perro.", "La niña del suéter rosa pasea a su perro.", [["La niña pasea a su perro de suéter rosa.", "misplaced-modifier"], ["De suéter rosa, el perro es paseado por la niña.", "misplaced-modifier"]], "¿Quién lleva el suéter?", "“Del suéter rosa” va junto a “la niña”."],
  },
  {
    en: ["The wallet was full of cash. Ana found it on the sidewalk.", "Ana found a wallet full of cash on the sidewalk.", [["Ana found a wallet on the sidewalk full of cash.", "misplaced-modifier"], ["Full of cash, Ana found a wallet on the sidewalk.", "misplaced-modifier"]], "What was full of cash?", "“Full of cash” goes right after “a wallet.”"],
    es: ["Mía se comió la pizza y solo dejó una rebanada.", "Mía se comió casi toda la pizza.", [["Mía casi se comió toda la pizza.", "misplaced-modifier"], ["Casi Mía se comió toda la pizza.", "misplaced-modifier"]], "¿Qué es “casi”: comer, o toda la pizza?", "“Casi” va antes de “toda la pizza”, porque se comió casi toda."],
  },
  {
    en: ["The cookies were warm from the oven. The baker handed them to the children.", "The baker handed the cookies, warm from the oven, to the children.", [["The baker handed the cookies to the children warm from the oven.", "misplaced-modifier"], ["Warm from the oven, the baker handed the cookies to the children.", "misplaced-modifier"]], "What was warm from the oven?", "“Warm from the oven” goes right after “the cookies.”"],
    es: ["La bicicleta tiene la cadena rota. Se la compré a mi vecino.", "Le compré a mi vecino una bicicleta con la cadena rota.", [["Le compré una bicicleta a mi vecino con la cadena rota.", "misplaced-modifier"], ["Con la cadena rota, le compré a mi vecino una bicicleta.", "misplaced-modifier"]], "¿Qué tiene la cadena rota?", "“Con la cadena rota” va junto a “una bicicleta”."],
  },
  {
    en: ["The dog had a long, fluffy tail. The vet examined it.", "The vet examined the dog with a long, fluffy tail.", [["With a long, fluffy tail, the vet examined the dog.", "misplaced-modifier"], ["The vet with a long, fluffy tail examined the dog.", "misplaced-modifier"]], "What has the fluffy tail?", "“With a long, fluffy tail” goes right after “the dog.”"],
    es: ["La cartera estaba llena de billetes. Ana la encontró en la acera.", "Ana encontró en la acera una cartera llena de billetes.", [["Ana encontró una cartera en la acera llena de billetes.", "misplaced-modifier"], ["Llena de billetes, Ana encontró una cartera en la acera.", "misplaced-modifier"]], "¿Qué estaba llena de billetes?", "“Llena de billetes” va junto a “una cartera”."],
  },
  {
    en: ["The letter was written in purple ink. Jamal read it to his class.", "Jamal read the letter written in purple ink to his class.", [["Jamal read the letter to his class written in purple ink.", "misplaced-modifier"], ["Written in purple ink, Jamal read the letter to his class.", "misplaced-modifier"]], "What was written in purple ink?", "“Written in purple ink” goes right after “the letter.”"],
    es: ["El niño tiene un brazo roto. La enfermera lo ayudó a subir a la cama.", "La enfermera ayudó al niño del brazo roto a subir a la cama.", [["La enfermera del brazo roto ayudó al niño a subir a la cama.", "misplaced-modifier"], ["La enfermera ayudó al niño a subir a la cama del brazo roto.", "misplaced-modifier"]], "¿Quién tiene el brazo roto?", "“Del brazo roto” va junto a “al niño”."],
  },
  {
    en: ["The boy has a broken arm. The nurse helped him onto the bed.", "The nurse helped the boy with a broken arm onto the bed.", [["The nurse with a broken arm helped the boy onto the bed.", "misplaced-modifier"], ["The nurse helped the boy onto the bed with a broken arm.", "misplaced-modifier"]], "Who has the broken arm?", "“With a broken arm” goes right after “the boy.”"],
    es: ["El sándwich tenía queso extra. Maya lo pidió en la cafetería.", "En la cafetería, Maya pidió un sándwich con queso extra.", [["Maya pidió un sándwich en la cafetería con queso extra.", "misplaced-modifier"], ["Con queso extra, Maya pidió un sándwich en la cafetería.", "misplaced-modifier"]], "¿Qué tenía queso extra?", "“Con queso extra” va junto a “un sándwich”."],
  },
  {
    en: ["The sandwich had extra cheese. Maya ordered it at the café.", "At the café, Maya ordered a sandwich with extra cheese.", [["Maya ordered a sandwich at the café with extra cheese.", "misplaced-modifier"], ["With extra cheese, Maya ordered a sandwich at the café.", "misplaced-modifier"]], "What had extra cheese?", "“With extra cheese” goes right after “a sandwich.”"],
    es: ["El gatito estaba escondido debajo del porche. Rosa lo encontró.", "Rosa encontró al gatito escondido debajo del porche.", [["Escondida debajo del porche, Rosa encontró al gatito.", "misplaced-modifier"], ["Rosa, escondida debajo del porche, encontró al gatito.", "misplaced-modifier"]], "¿Quién estaba escondido?", "“Escondido debajo del porche” va junto a “al gatito”."],
  },
  {
    en: ["The kitten was hiding under the porch. Rosa found it.", "Rosa found the kitten hiding under the porch.", [["Hiding under the porch, Rosa found the kitten.", "misplaced-modifier"], ["Rosa, hiding under the porch, found the kitten.", "misplaced-modifier"]], "Who was hiding?", "“Hiding under the porch” goes right after “the kitten.”"],
    es: ["La bufanda la tejió mi abuela. Me la puse para ir a la escuela.", "Para ir a la escuela, me puse la bufanda que tejió mi abuela.", [["Me puse la bufanda para ir a la escuela que tejió mi abuela.", "misplaced-modifier"], ["Tejida por mi abuela, me puse la bufanda para ir a la escuela.", "misplaced-modifier"]], "¿Qué tejió la abuela?", "“Que tejió mi abuela” va junto a “la bufanda”."],
  },
  {
    en: ["The tickets cost five dollars each. Sam bought two of them for the concert.", "For the concert, Sam bought two tickets that cost five dollars each.", [["Sam bought two tickets for the concert that cost five dollars each.", "misplaced-modifier"], ["That cost five dollars each, Sam bought two tickets for the concert.", "misplaced-modifier"]], "What cost five dollars each?", "“That cost five dollars each” goes right after “two tickets.”"],
    es: ["Las galletas estaban recién horneadas. El panadero se las dio a los niños.", "El panadero les dio a los niños las galletas recién horneadas.", [["El panadero les dio las galletas a los niños recién horneados.", "misplaced-modifier"], ["Recién horneado, el panadero les dio las galletas a los niños.", "misplaced-modifier"]], "¿Qué estaba recién horneado?", "“Recién horneadas” va junto a “las galletas”."],
  },
  {
    en: ["The puppy had muddy paws. It ran across our clean kitchen floor.", "The puppy with muddy paws ran across our clean kitchen floor.", [["The puppy ran across our clean kitchen floor with muddy paws.", "misplaced-modifier"], ["With muddy paws, our clean kitchen floor was crossed by the puppy.", "misplaced-modifier"]], "What had muddy paws?", "“With muddy paws” goes right after “the puppy.”"],
    es: ["El perro tenía una cola larga y peluda. El veterinario lo revisó.", "El veterinario revisó al perro de cola larga y peluda.", [["El veterinario de cola larga y peluda revisó al perro.", "misplaced-modifier"], ["De cola larga y peluda, el veterinario revisó al perro.", "misplaced-modifier"]], "¿Quién tiene la cola peluda?", "“De cola larga y peluda” va junto a “al perro”."],
  },
  {
    en: ["The scarf was knitted by my grandmother. I wore it to school.", "I wore the scarf knitted by my grandmother to school.", [["I wore the scarf to school knitted by my grandmother.", "misplaced-modifier"], ["Knitted by my grandmother, I wore the scarf to school.", "misplaced-modifier"]], "What did Grandmother knit?", "“Knitted by my grandmother” goes right after “the scarf.”"],
    es: ["La carta estaba escrita con tinta morada. Jamal se la leyó a su clase.", "Jamal le leyó a su clase la carta escrita con tinta morada.", [["Jamal le leyó la carta a su clase escrita con tinta morada.", "misplaced-modifier"], ["Escrito con tinta morada, Jamal le leyó la carta a su clase.", "misplaced-modifier"]], "¿Qué estaba escrito con tinta morada?", "“Escrita con tinta morada” va junto a “la carta”."],
  },
  {
    en: ["The coach was holding a stopwatch. She timed the runners.", "Holding a stopwatch, the coach timed the runners.", [["The coach timed the runners holding a stopwatch.", "misplaced-modifier"], ["Holding a stopwatch, the runners were timed by the coach.", "misplaced-modifier"]], "Who held the stopwatch?", "“Holding a stopwatch” goes right next to “the coach.”"],
    es: ["Los boletos costaban cinco dólares cada uno. Sam compró dos para el concierto.", "Para el concierto, Sam compró dos boletos de cinco dólares cada uno.", [["Sam compró dos boletos para el concierto de cinco dólares cada uno.", "misplaced-modifier"], ["De cinco dólares cada uno, Sam compró dos boletos para el concierto.", "misplaced-modifier"]], "¿Qué costaba cinco dólares?", "“De cinco dólares cada uno” va junto a “dos boletos”."],
  },
];

const DANGLING: Bi<Entry>[] = [
  {
    en: ["Walking to school, the rain started to fall.", "As I was walking to school, the rain started to fall.", [["Walking to school, the rain fell harder.", "still-dangling"], ["The rain, walking to school, started to fall.", "misplaced-modifier"], ["I stayed home while the rain fell.", "changed-meaning"]], "Who was walking to school? The rain cannot walk.", "Give the walking its own subject: “As I was walking.”"],
    es: ["Caminando hacia la escuela, la lluvia me mojó toda.", "Mientras caminaba hacia la escuela, la lluvia me mojó toda.", [["Caminando hacia la escuela, la lluvia cayó más fuerte.", "still-dangling"], ["La lluvia, caminando hacia la escuela, me mojó toda.", "misplaced-modifier"], ["Me quedé en casa mientras llovía.", "changed-meaning"]], "¿Quién caminaba? La lluvia no camina.", "El gerundio tiene que referirse a quien de verdad camina: “mientras (yo) caminaba”."],
  },
  {
    en: ["After finishing my homework, the TV was turned on.", "After finishing my homework, I turned on the TV.", [["After finishing my homework, the TV came on.", "still-dangling"], ["The TV, after finishing my homework, was turned on.", "misplaced-modifier"], ["Before finishing my homework, I turned on the TV.", "changed-meaning"]], "Who finished the homework? Not the TV.", "Put the person who finished right after the comma: “I.”"],
    es: ["Después de terminar la tarea, la televisión fue encendida.", "Después de terminar la tarea, encendí la televisión.", [["Después de terminar la tarea, la televisión se encendió.", "still-dangling"], ["La televisión, después de terminar la tarea, fue encendida.", "misplaced-modifier"], ["Antes de terminar la tarea, encendí la televisión.", "changed-meaning"]], "¿Quién terminó la tarea? La televisión no.", "Quien termina la tarea tiene que ser el sujeto: “encendí” (yo)."],
  },
  {
    en: ["While eating lunch, a bee landed on my sandwich.", "While I was eating lunch, a bee landed on my sandwich.", [["While eating lunch, a bee buzzed onto my sandwich.", "still-dangling"], ["A bee, while eating lunch, landed on my sandwich.", "misplaced-modifier"], ["While I was eating lunch, I chased away every bee.", "changed-meaning"]], "Who was eating lunch? Not the bee.", "Give the eating its own subject: “While I was eating lunch.”"],
    es: ["Comiendo el almuerzo, una abeja se posó en mi sándwich.", "Mientras yo comía el almuerzo, una abeja se posó en mi sándwich.", [["Comiendo el almuerzo, una abeja zumbó sobre mi sándwich.", "still-dangling"], ["Una abeja, comiendo el almuerzo, se posó en mi sándwich.", "misplaced-modifier"], ["Mientras yo comía el almuerzo, espanté a todas las abejas.", "changed-meaning"]], "¿Quién comía el almuerzo? La abeja no.", "Dale a la acción su propio sujeto: “Mientras yo comía”."],
  },
  {
    en: ["To win the race, hard training is needed.", "To win the race, you need to train hard.", [["To win the race, hard training is necessary.", "still-dangling"], ["Hard training, to win the race, is needed.", "still-dangling"], ["To win the race, the race needs training.", "changed-meaning"]], "Who wants to win the race? Training cannot win.", "Name the person who wants to win right after the comma: “you.”"],
    es: ["Habiendo perdido la llave, la puerta no se abrió.", "Como María perdió la llave, no pudo abrir la puerta.", [["Habiendo perdido la llave, la puerta siguió cerrada.", "still-dangling"], ["La puerta, habiendo perdido la llave, no se abrió.", "misplaced-modifier"], ["Como María encontró la llave, abrió la puerta.", "changed-meaning"]], "¿Quién perdió la llave? La puerta no.", "Convierte la frase en una oración con su propio sujeto: “Como María perdió la llave”."],
  },
  {
    en: ["Having lost the key, the door would not open.", "Having lost the key, Maria could not open the door.", [["Having lost the key, the door stayed locked.", "still-dangling"], ["The door, having lost the key, would not open.", "misplaced-modifier"], ["Having found the key, Maria opened the door.", "changed-meaning"]], "Who lost the key? Not the door.", "Put the person who lost it right after the comma: “Maria.”"],
    es: ["Emocionados por el viaje, el trayecto en autobús se hizo corto.", "Emocionados por el viaje, sentimos que el trayecto en autobús fue corto.", [["Emocionados por el viaje, el trayecto en autobús fue rápido.", "still-dangling"], ["El trayecto en autobús, emocionado por el viaje, se hizo corto.", "misplaced-modifier"], ["Aburridos del viaje, sentimos que el trayecto fue largo.", "changed-meaning"]], "¿Quiénes estaban emocionados? El trayecto no.", "El participio tiene que referirse al sujeto: “sentimos” (nosotros)."],
  },
  {
    en: ["Excited about the trip, the bus ride felt short.", "Excited about the trip, we felt that the bus ride was short.", [["Excited about the trip, the bus ride was quick.", "still-dangling"], ["The bus ride, excited about the trip, felt short.", "misplaced-modifier"], ["Bored by the trip, we felt that the bus ride was long.", "changed-meaning"]], "Who was excited? A bus ride cannot be.", "Put the people who were excited right after the comma: “we.”"],
    es: ["Mirando por el telescopio, los anillos de Saturno se veían claramente.", "Mirando por el telescopio, Omar veía claramente los anillos de Saturno.", [["Mirando por el telescopio, los anillos de Saturno brillaban.", "still-dangling"], ["Los anillos de Saturno, mirando por el telescopio, se veían claramente.", "misplaced-modifier"], ["Omar vio los anillos de Saturno sin telescopio.", "changed-meaning"]], "¿Quién miraba? Los anillos no miran.", "El gerundio tiene que referirse a quien mira: Omar."],
  },
  {
    en: ["Looking through the telescope, Saturn's rings were visible.", "Looking through the telescope, Omar could see Saturn's rings.", [["Looking through the telescope, Saturn's rings looked bright.", "still-dangling"], ["Saturn's rings, looking through the telescope, were visible.", "misplaced-modifier"], ["Omar saw Saturn's rings without a telescope.", "changed-meaning"]], "Who was looking? The rings cannot look.", "Put the person looking right after the comma: “Omar.”"],
    es: ["Después de ensayar durante semanas, la canción sonó perfecta.", "Después de ensayar durante semanas, la banda tocó la canción a la perfección.", [["Después de ensayar durante semanas, la canción quedó perfecta.", "still-dangling"], ["La canción, después de ensayar durante semanas, sonó perfecta.", "misplaced-modifier"], ["Después de semanas sin ensayar, la banda olvidó la canción.", "changed-meaning"]], "¿Quién ensayó? La canción no ensaya.", "Quien ensaya tiene que ser el sujeto: la banda."],
  },
  {
    en: ["After practicing for weeks, the song sounded perfect.", "After practicing for weeks, the band played the song perfectly.", [["After practicing for weeks, the song was perfect.", "still-dangling"], ["The song, after practicing for weeks, sounded perfect.", "misplaced-modifier"], ["After weeks without practice, the band forgot the song.", "changed-meaning"]], "Who practiced? A song cannot practice.", "Put the band right after the comma."],
    es: ["Corriendo para alcanzar el autobús, la mochila se abrió.", "Mientras corría para alcanzar el autobús, la mochila se me abrió.", [["Corriendo para alcanzar el autobús, la mochila se cayó.", "still-dangling"], ["La mochila, corriendo para alcanzar el autobús, se abrió.", "misplaced-modifier"], ["Mientras corría para alcanzar el autobús, cerré la mochila.", "changed-meaning"]], "¿Quién corría? La mochila no corre.", "Dale a la acción su propio sujeto: “Mientras (yo) corría”."],
  },
  {
    en: ["Running to catch the bus, my backpack fell open.", "As I ran to catch the bus, my backpack fell open.", [["Running to catch the bus, my backpack spilled everywhere.", "still-dangling"], ["My backpack, running to catch the bus, fell open.", "misplaced-modifier"], ["As I ran to catch the bus, I zipped my backpack shut.", "changed-meaning"]], "Who was running? A backpack cannot run.", "Give the running its own subject: “As I ran.”"],
    es: ["Cansada de la caminata, el sofá se veía muy cómodo.", "Como Ella estaba cansada de la caminata, el sofá le pareció muy cómodo.", [["Cansada de la caminata, el sofá se veía blando.", "still-dangling"], ["El sofá, cansado de la caminata, se veía muy cómodo.", "misplaced-modifier"], ["Ella no estaba cansada, así que no usó el sofá.", "changed-meaning"]], "¿Quién estaba cansada? El sofá no.", "Convierte la frase en una oración con su propio sujeto: “Como Ella estaba cansada”."],
  },
  {
    en: ["At the age of five, my family moved to Ohio.", "When I was five, my family moved to Ohio.", [["At the age of five, my family moved to Ohio from Texas.", "still-dangling"], ["My family, at the age of five, moved to Ohio.", "misplaced-modifier"], ["When my family moved to Ohio, I was ten.", "changed-meaning"]], "Who was five years old? Not the whole family.", "Give the age its own subject: “When I was five.”"],
    es: ["Abriendo la caja, un cachorro saltó afuera.", "Cuando Leo abrió la caja, un cachorro saltó afuera.", [["Abriendo la caja, un cachorro pequeño saltó afuera.", "still-dangling"], ["Un cachorro, abriendo la caja, saltó afuera.", "misplaced-modifier"], ["Cuando el cachorro abrió la caja, Leo saltó afuera.", "changed-meaning"]], "¿Quién abrió la caja? El cachorro estaba adentro.", "Dale a la acción su propio sujeto: “Cuando Leo abrió la caja”."],
  },
  {
    en: ["Tired from the hike, the couch looked inviting.", "Because Ella was tired from the hike, the couch looked inviting to her.", [["Tired from the hike, the couch looked soft.", "still-dangling"], ["The couch, tired from the hike, looked inviting.", "misplaced-modifier"], ["Ella was not tired, so she skipped the couch.", "changed-meaning"]], "Who was tired? A couch cannot hike.", "Give the tiredness its own subject: “Because Ella was tired.”"],
    es: ["Lavándome los dientes, sonó el teléfono.", "Mientras me lavaba los dientes, sonó el teléfono.", [["Lavándome los dientes, el teléfono sonó dos veces.", "still-dangling"], ["El teléfono, lavándome los dientes, sonó.", "misplaced-modifier"], ["Mientras me lavaba los dientes, llamé a una amiga.", "changed-meaning"]], "¿Quién se lavaba los dientes? El teléfono no.", "Dale a la acción su propio sujeto: “Mientras me lavaba”."],
  },
  {
    en: ["Opening the box, a puppy jumped out.", "When Leo opened the box, a puppy jumped out.", [["Opening the box, a small puppy jumped out.", "still-dangling"], ["A puppy, opening the box, jumped out.", "misplaced-modifier"], ["When the puppy opened the box, Leo jumped out.", "changed-meaning"]], "Who opened the box? The puppy was inside it.", "Give the opening its own subject: “When Leo opened the box.”"],
    es: ["Atrapados en el tráfico, el concierto empezó sin nosotros.", "Como estábamos atrapados en el tráfico, el concierto empezó sin nosotros.", [["Atrapados en el tráfico, el concierto empezó tarde.", "still-dangling"], ["El concierto, atrapado en el tráfico, empezó sin nosotros.", "misplaced-modifier"], ["Como el concierto estaba atrapado en el tráfico, empezamos sin él.", "changed-meaning"]], "¿Quiénes estaban atrapados en el tráfico? El concierto no.", "Convierte la frase en una oración con su propio sujeto: “Como estábamos atrapados”."],
  },
  {
    en: ["While brushing my teeth, the phone rang.", "While I was brushing my teeth, the phone rang.", [["While brushing my teeth, the phone rang twice.", "still-dangling"], ["The phone, while brushing my teeth, rang.", "misplaced-modifier"], ["While I was brushing my teeth, I called a friend.", "changed-meaning"]], "Who was brushing? Not the phone.", "Give the brushing its own subject: “While I was brushing.”"],
    es: ["Pintado de azul, mi abuelo terminó el barco.", "Mi abuelo terminó el barco pintado de azul.", [["Pintado de azul, mi abuelo terminó el barco ayer.", "still-dangling"], ["Mi abuelo, pintado de azul, terminó el barco.", "misplaced-modifier"], ["Mi abuelo pintó de rojo el barco.", "changed-meaning"]], "¿Qué estaba pintado de azul? El abuelo no.", "“Pintado de azul” va junto a “el barco”."],
  },
  {
    en: ["Stuck in traffic, the concert started without us.", "Because we were stuck in traffic, the concert started without us.", [["Stuck in traffic, the concert began late.", "still-dangling"], ["The concert, stuck in traffic, started without us.", "misplaced-modifier"], ["Because the concert was stuck in traffic, we started without it.", "changed-meaning"]], "Who was stuck in traffic? Not the concert.", "Give the phrase its own subject: “Because we were stuck.”"],
    es: ["Asustado por los truenos, mi mamá abrazó al perro.", "Mi mamá abrazó al perro, que estaba asustado por los truenos.", [["Asustado por los truenos, mi mamá abrazó al perro con fuerza.", "still-dangling"], ["Mi mamá, asustada por los truenos, abrazó al perro.", "changed-meaning"], ["El perro abrazó a mi mamá durante los truenos.", "changed-meaning"]], "“Asustado” es masculino. ¿Quién estaba asustado?", "El asustado era el perro: “al perro, que estaba asustado”."],
  },
];

const MODIFIERS = skill(
  { id: "e.modifiers", grade: "7", title: { en: "Misplaced and dangling modifiers", es: "Modificadores bien colocados" }, standard: "L.7.1c", prereqs: ["e.phrases.clauses"] },
  [
    {
      bank: MISPLACED,
      ask: { en: "Which sentence says this clearly, with each describing phrase next to the word it describes?", es: "¿Qué oración lo dice con claridad, con cada modificador junto a la palabra que describe?" },
      hints: {
        en: ["Find each describing phrase and ask what it describes.", "Put a describing phrase right next to the word it describes. Words like “almost” go right before the word they limit."],
        es: ["Busca cada modificador y pregúntate qué describe.", "Pon el modificador junto a la palabra que describe. Palabras como “casi” van justo antes de la palabra que limitan."],
      },
      seconds: 30,
    },
    {
      bank: DANGLING,
      ask: { en: "Which revision fixes the dangling modifier?", es: "¿Qué versión corrige el modificador colgante?" },
      hints: {
        en: ["Who or what is doing the action in the opening phrase?", "An opening phrase describes the subject right after the comma. Put the real doer there, or turn the phrase into a clause with its own subject."],
        es: ["¿Quién hace la acción del gerundio, del participio o del infinitivo del principio?", "La frase del inicio se refiere al sujeto que viene después de la coma. Pon ahí a quien de verdad hace la acción, o convierte la frase en una oración con su propio sujeto (mientras yo…, como ella…)."],
      },
      seconds: 35,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.coordinate.adjectives — English: a comma between coordinate adjectives (they can swap places and
// take "and"), none between cumulative ones, and never one before the noun. Spanish: adjectives in a
// series take commas, but no comma before "y", and none between a noun and its adjective.

const ADJECTIVE_COMMAS: Bi<Entry>[] = [
  {
    en: ["", "It was a fascinating, enjoyable movie.", [["It was a fascinating enjoyable movie.", "missing-comma-coordinate"], ["It was a fascinating, enjoyable, movie.", "comma-before-noun"]], "Try “an enjoyable, fascinating movie” and “a fascinating and enjoyable movie.” Do they sound right?", "The adjectives can switch places and be joined by “and,” so a comma goes between them."],
    es: ["", "Fue una película fascinante, divertida y emocionante.", [["Fue una película fascinante, divertida, y emocionante.", "comma-before-y"], ["Fue una película, fascinante, divertida y emocionante.", "comma-between-noun-and-adjective"], ["Fue una película fascinante divertida y emocionante.", "missing-comma-series"]], "Hay tres adjetivos en serie. ¿Qué va entre los dos primeros, y qué pasa antes de “y”?", "En una serie, los adjetivos se separan con comas, pero antes de “y” no va coma."],
  },
  {
    en: ["", "He wore an old green shirt.", [["He wore an old, green shirt.", "comma-between-cumulative"], ["He wore an old green, shirt.", "comma-before-noun"]], "Try “a green old shirt” and “an old and green shirt.” Do they sound right?", "The adjectives cannot switch places or take “and,” so no comma goes between them."],
    es: ["", "Llevaba una camisa vieja y verde.", [["Llevaba una camisa vieja, y verde.", "comma-before-y"], ["Llevaba una camisa, vieja y verde.", "comma-between-noun-and-adjective"]], "Hay dos adjetivos unidos por “y”.", "Dos adjetivos unidos por “y” no llevan coma, y el sustantivo no se separa de su adjetivo."],
  },
  {
    en: ["", "The tired, hungry hikers reached the cabin.", [["The tired hungry hikers reached the cabin.", "missing-comma-coordinate"], ["The tired, hungry, hikers reached the cabin.", "comma-before-noun"]], "Try “the hungry, tired hikers” and “the tired and hungry hikers.”", "The adjectives can switch places and take “and,” so a comma goes between them."],
    es: ["", "Adoptamos un cachorro pequeño, café y juguetón.", [["Adoptamos un cachorro pequeño, café, y juguetón.", "comma-before-y"], ["Adoptamos un cachorro pequeño café y juguetón.", "missing-comma-series"], ["Adoptamos un cachorro, pequeño, café y juguetón.", "comma-between-noun-and-adjective"]], "Hay tres adjetivos en serie.", "En una serie, los adjetivos se separan con comas, pero antes de “y” no va coma."],
  },
  {
    en: ["", "We adopted a little brown puppy.", [["We adopted a little, brown puppy.", "comma-between-cumulative"], ["We adopted a little brown, puppy.", "comma-before-noun"]], "Try “a brown little puppy” and “a little and brown puppy.”", "The adjectives cannot switch places or take “and,” so no comma goes between them."],
    es: ["", "Fue una tarde fría y lluviosa.", [["Fue una tarde fría, y lluviosa.", "comma-before-y"], ["Fue una tarde, fría y lluviosa.", "comma-between-noun-and-adjective"]], "Hay dos adjetivos unidos por “y”.", "Dos adjetivos unidos por “y” no llevan coma, y el sustantivo no se separa de su adjetivo."],
  },
  {
    en: ["", "It was a cold, rainy afternoon.", [["It was a cold rainy afternoon.", "missing-comma-coordinate"], ["It was a cold, rainy, afternoon.", "comma-before-noun"]], "Try “a rainy, cold afternoon” and “a cold and rainy afternoon.”", "The adjectives can switch places and take “and,” so a comma goes between them."],
    es: ["", "Compró tres manzanas rojas.", [["Compró tres, manzanas rojas.", "comma-between-cumulative"], ["Compró tres manzanas, rojas.", "comma-between-noun-and-adjective"]], "“Tres” y “manzanas rojas” van juntas: no es una serie.", "Las palabras que van juntas no se separan con coma."],
  },
  {
    en: ["", "She bought three red apples.", [["She bought three, red apples.", "comma-between-cumulative"], ["She bought three red, apples.", "comma-before-noun"]], "Try “red three apples” and “three and red apples.”", "A number and an adjective cannot switch places or take “and,” so no comma."],
    es: ["", "El salón era luminoso, alegre y ordenado.", [["El salón era luminoso, alegre, y ordenado.", "comma-before-y"], ["El salón era luminoso alegre y ordenado.", "missing-comma-series"]], "Hay tres adjetivos en serie.", "En una serie, los adjetivos se separan con comas, pero antes de “y” no va coma."],
  },
  {
    en: ["", "The bright, cheerful classroom made everyone smile.", [["The bright cheerful classroom made everyone smile.", "missing-comma-coordinate"], ["The bright, cheerful, classroom made everyone smile.", "comma-before-noun"]], "Try “the cheerful, bright classroom” and “the bright and cheerful classroom.”", "The adjectives can switch places and take “and,” so a comma goes between them."],
    es: ["", "Mi abuelo tiene una gran mesa de madera.", [["Mi abuelo tiene una gran, mesa de madera.", "comma-between-cumulative"], ["Mi abuelo tiene una gran mesa, de madera.", "comma-between-noun-and-adjective"]], "“Gran mesa de madera” es un solo grupo: no es una serie.", "Las palabras que van juntas no se separan con coma."],
  },
  {
    en: ["", "My grandfather has a big wooden table.", [["My grandfather has a big, wooden table.", "comma-between-cumulative"], ["My grandfather has a big wooden, table.", "comma-before-noun"]], "Try “a wooden big table” and “a big and wooden table.”", "The adjectives cannot switch places or take “and,” so no comma goes between them."],
    es: ["", "El gimnasio estaba ruidoso, lleno y caluroso.", [["El gimnasio estaba ruidoso, lleno, y caluroso.", "comma-before-y"], ["El gimnasio estaba ruidoso lleno y caluroso.", "missing-comma-series"]], "Hay tres adjetivos en serie.", "En una serie, los adjetivos se separan con comas, pero antes de “y” no va coma."],
  },
  {
    en: ["", "The loud, crowded gym was full of fans.", [["The loud crowded gym was full of fans.", "missing-comma-coordinate"], ["The loud, crowded, gym was full of fans.", "comma-before-noun"]], "Try “the crowded, loud gym” and “the loud and crowded gym.”", "The adjectives can switch places and take “and,” so a comma goes between them."],
    es: ["", "Kenji encontró una moneda plateada y brillante.", [["Kenji encontró una moneda, plateada y brillante.", "comma-between-noun-and-adjective"], ["Kenji encontró una moneda plateada, y brillante.", "comma-before-y"]], "Hay dos adjetivos unidos por “y”.", "Dos adjetivos unidos por “y” no llevan coma, y el sustantivo no se separa de su adjetivo."],
  },
  {
    en: ["", "Kenji found a shiny silver coin.", [["Kenji found a shiny, silver coin.", "comma-between-cumulative"], ["Kenji found a shiny silver, coin.", "comma-before-noun"]], "Try “a silver shiny coin” and “a shiny and silver coin.”", "The adjectives do not sound right swapped or with “and,” so no comma goes between them."],
    es: ["", "Fue un examen largo y difícil.", [["Fue un examen largo, y difícil.", "comma-before-y"], ["Fue un examen, largo y difícil.", "comma-between-noun-and-adjective"]], "Hay dos adjetivos unidos por “y”.", "Dos adjetivos unidos por “y” no llevan coma, y el sustantivo no se separa de su adjetivo."],
  },
  {
    en: ["", "It was a long, difficult test.", [["It was a long difficult test.", "missing-comma-coordinate"], ["It was a long, difficult, test.", "comma-before-noun"]], "Try “a difficult, long test” and “a long and difficult test.”", "The adjectives can switch places and take “and,” so a comma goes between them."],
    es: ["", "Nos sentamos en el pasto suave, verde y fresco.", [["Nos sentamos en el pasto suave, verde, y fresco.", "comma-before-y"], ["Nos sentamos en el pasto suave verde y fresco.", "missing-comma-series"], ["Nos sentamos en el pasto, suave, verde y fresco.", "comma-between-noun-and-adjective"]], "Hay tres adjetivos en serie.", "En una serie, los adjetivos se separan con comas, pero antes de “y” no va coma."],
  },
  {
    en: ["", "We sat on the soft green grass.", [["We sat on the soft, green grass.", "comma-between-cumulative"], ["We sat on the soft green, grass.", "comma-before-noun"]], "Try “the green soft grass” and “the soft and green grass.”", "The adjectives do not sound right swapped or with “and,” so no comma goes between them."],
    es: ["", "Ana se puso sus tenis azules favoritos.", [["Ana se puso sus tenis, azules favoritos.", "comma-between-noun-and-adjective"], ["Ana se puso sus tenis azules, favoritos.", "comma-between-cumulative"]], "“Tenis azules favoritos” es un solo grupo: no es una serie.", "Las palabras que van juntas no se separan con coma."],
  },
  {
    en: ["", "The friendly, helpful librarian found my book.", [["The friendly helpful librarian found my book.", "missing-comma-coordinate"], ["The friendly, helpful, librarian found my book.", "comma-before-noun"]], "Try “the helpful, friendly librarian” and “the friendly and helpful librarian.”", "The adjectives can switch places and take “and,” so a comma goes between them."],
    es: ["", "Era un perro grande, peludo y cariñoso.", [["Era un perro grande, peludo, y cariñoso.", "comma-before-y"], ["Era un perro grande peludo y cariñoso.", "missing-comma-series"], ["Era un perro, grande, peludo y cariñoso.", "comma-between-noun-and-adjective"]], "Hay tres adjetivos en serie.", "En una serie, los adjetivos se separan con comas, pero antes de “y” no va coma."],
  },
  {
    en: ["", "Ana wore her favorite blue sneakers.", [["Ana wore her favorite, blue sneakers.", "comma-between-cumulative"], ["Ana wore her favorite blue, sneakers.", "comma-before-noun"]], "Try “her blue favorite sneakers” and “her favorite and blue sneakers.”", "The adjectives do not sound right swapped or with “and,” so no comma goes between them."],
    es: ["", "Mi tía hizo un pastel delicioso de chocolate.", [["Mi tía hizo un pastel delicioso, de chocolate.", "comma-between-cumulative"], ["Mi tía hizo un pastel, delicioso de chocolate.", "comma-between-noun-and-adjective"]], "“Pastel delicioso de chocolate” es un solo grupo: no es una serie.", "Las palabras que van juntas no se separan con coma."],
  },
];

const COORDINATE_ADJECTIVES = skill(
  { id: "e.coordinate.adjectives", grade: "7", title: { en: "Commas between adjectives", es: "Comas entre adjetivos" }, standard: "L.7.2a", prereqs: ["e.commas"] },
  [
    {
      bank: ADJECTIVE_COMMAS,
      ask: PUNCTUATED,
      hints: {
        en: ["Find the adjectives that come before the noun.", "Swap their order, or put “and” between them. If it still sounds right, they are coordinate: use a comma. If not, use no comma. Never put a comma between the last adjective and the noun."],
        es: ["Busca los adjetivos que describen al mismo sustantivo.", "En una serie de adjetivos, sepáralos con comas, pero no pongas coma antes de “y”. No pongas coma entre el sustantivo y su adjetivo, ni entre palabras que forman un solo grupo."],
      },
      seconds: 20,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.wordiness — level 1: the word that only repeats an idea (Spanish vicios del lenguaje: pleonasmo y
// dequeísmo); level 2: one plain word for a wordy phrase (Spanish: verbos comodín y circunloquios).

const REDUNDANT: Bi<Entry>[] = [
  {
    en: ["We returned back to the classroom after lunch.", "back", [["returned", "cut-needed-word"], ["after lunch", "cut-needed-word"]], "What does “returned” already mean?", "“Returned” already means went back, so “back” repeats it."],
    es: ["Entra adentro, que va a llover.", "adentro", [["Entra", "cut-needed-word"], ["que va a llover", "cut-needed-word"]], "¿Hacia dónde se entra siempre?", "“Entrar” ya significa ir adentro, así que “adentro” sobra."],
  },
  {
    en: ["Please repeat that again.", "again", [["repeat", "cut-needed-word"], ["that", "cut-needed-word"]], "What does “repeat” already mean?", "“Repeat” already means say again, so “again” is extra."],
    es: ["Bajé abajo a buscar mi mochila.", "abajo", [["Bajé", "cut-needed-word"], ["mi mochila", "cut-needed-word"]], "¿Hacia dónde se baja siempre?", "“Bajar” ya significa ir hacia abajo, así que “abajo” sobra."],
  },
  {
    en: ["The two twins wore matching jackets.", "two", [["twins", "cut-needed-word"], ["matching", "cut-needed-word"]], "How many twins are there, always?", "Twins are always two, so “two” is extra."],
    es: ["Pienso de que mañana va a llover.", "de", [["Pienso", "cut-needed-word"], ["mañana", "cut-needed-word"]], "Cambia lo que sigue a “pienso” por “eso”: ¿hace falta alguna palabra entre “pienso” y “eso”?", "Se dice “pienso que”. Poner “de” de más se llama dequeísmo."],
  },
  {
    en: ["The sweater was red in color.", "in color", [["sweater", "cut-needed-word"], ["red", "cut-needed-word"]], "What else could “red” describe besides a color?", "“Red” is already a color, so “in color” is extra."],
    es: ["Me dijo de que llegaría tarde.", "de", [["dijo", "cut-needed-word"], ["tarde", "cut-needed-word"]], "Cambia lo que sigue a “dijo” por “eso”: ¿hace falta alguna palabra entre “dijo” y “eso”?", "Se dice “me dijo que”. El “de” sobra: es dequeísmo."],
  },
  {
    en: ["My grandmother told me a true fact about her childhood.", "true", [["grandmother", "cut-needed-word"], ["childhood", "cut-needed-word"]], "Can a fact be false?", "A fact is true by definition, so “true” is extra."],
    es: ["Los dos gemelos llevaban chaquetas iguales.", "dos", [["gemelos", "cut-needed-word"], ["iguales", "cut-needed-word"]], "¿Cuántos son siempre los gemelos?", "Los gemelos siempre son dos, así que “dos” sobra."],
  },
  {
    en: ["Kai gave me a free gift for my birthday.", "free", [["gift", "cut-needed-word"], ["birthday", "cut-needed-word"]], "Do you ever pay for a gift you receive?", "A gift is already free, so “free” is extra."],
    es: ["Fue un regalo gratis por mi cumpleaños.", "gratis", [["regalo", "cut-needed-word"], ["cumpleaños", "cut-needed-word"]], "¿Alguna vez se paga por un regalo que recibes?", "Un regalo ya es gratis, así que “gratis” sobra."],
  },
  {
    en: ["The sun rose up over the mountains.", "up", [["rose", "cut-needed-word"], ["over the mountains", "cut-needed-word"]], "Which way does rising always go?", "“Rose” already means went up, so “up” is extra."],
    es: ["Llegamos tarde, mas sin embargo vimos el final.", "mas", [["tarde", "cut-needed-word"], ["el final", "cut-needed-word"]], "Hay dos palabras seguidas que significan “pero”.", "“Mas sin embargo” dice “pero” dos veces. Basta con “sin embargo”."],
  },
  {
    en: ["We need to cooperate together on this project.", "together", [["cooperate", "cut-needed-word"], ["project", "cut-needed-word"]], "What does the “co-” in “cooperate” mean?", "“Cooperate” already means work together, so “together” is extra."],
    es: ["Hay que prever con antelación los materiales del proyecto.", "con antelación", [["prever", "cut-needed-word"], ["los materiales", "cut-needed-word"]], "¿Qué significa el “pre-” de “prever”?", "“Prever” ya significa ver o preparar algo antes, así que “con antelación” sobra."],
  },
  {
    en: ["She shouted loudly across the field.", "loudly", [["shouted", "cut-needed-word"], ["across the field", "cut-needed-word"]], "Can you shout quietly?", "Shouting is already loud, so “loudly” is extra."],
    es: ["Las hojas volaban por el aire con el viento.", "por el aire", [["volaban", "cut-needed-word"], ["con el viento", "cut-needed-word"]], "¿Por dónde se vuela siempre?", "Volar ya es moverse por el aire, así que “por el aire” sobra."],
  },
  {
    en: ["The end result was a tie game.", "end", [["result", "cut-needed-word"], ["tie", "cut-needed-word"]], "Does a result ever come at the beginning?", "A result already comes at the end, so “end” is extra."],
    es: ["Tenemos que cooperar juntos en este proyecto.", "juntos", [["cooperar", "cut-needed-word"], ["proyecto", "cut-needed-word"]], "¿Qué significa el “co-” de “cooperar”?", "“Cooperar” ya significa trabajar juntos, así que “juntos” sobra."],
  },
  {
    en: ["The museum has a collection of ancient fossils from long ago.", "from long ago", [["ancient", "cut-needed-word"], ["fossils", "cut-needed-word"]], "What does “ancient” already mean?", "“Ancient” already means from long ago."],
    es: ["El museo tiene fósiles antiguos de hace muchísimo tiempo.", "de hace muchísimo tiempo", [["fósiles", "cut-needed-word"], ["El museo", "cut-needed-word"]], "¿Qué significa “antiguos”?", "“Antiguos” ya significa de hace mucho tiempo."],
  },
  {
    en: ["Let's circle around the block one more time.", "around", [["circle", "cut-needed-word"], ["one more time", "cut-needed-word"]], "What does “circle” already mean?", "To circle is already to go around, so “around” is extra."],
    es: ["Juan me confesó de que había roto el vaso.", "de", [["confesó", "cut-needed-word"], ["el vaso", "cut-needed-word"]], "Cambia lo que sigue a “confesó” por “eso”: ¿hace falta alguna palabra entre “confesó” y “eso”?", "Se dice “me confesó que”. El “de” sobra: es dequeísmo."],
  },
  {
    en: ["We should combine the two groups together.", "together", [["combine", "cut-needed-word"], ["the two groups", "cut-needed-word"]], "What does “combine” already mean?", "“Combine” already means put together, so “together” is extra."],
    es: ["Creo de que el examen será fácil.", "de", [["Creo", "cut-needed-word"], ["fácil", "cut-needed-word"]], "Cambia lo que sigue a “creo” por “eso”: ¿hace falta alguna palabra entre “creo” y “eso”?", "Se dice “creo que”. El “de” sobra: es dequeísmo."],
  },
  {
    en: ["The baby looks exactly identical to her twin.", "exactly", [["identical", "cut-needed-word"], ["twin", "cut-needed-word"]], "What does “identical” already mean?", "“Identical” already means exactly the same, so “exactly” is extra."],
    es: ["Mi abuela tiene una colección de monedas antiguas del pasado.", "del pasado", [["monedas", "cut-needed-word"], ["colección", "cut-needed-word"]], "¿Qué significa “antiguas”?", "“Antiguas” ya significa del pasado."],
  },
];

const WORDY_PHRASES: Bi<Entry>[] = [
  {
    en: ["In the event that it rains, the picnic will move indoors.", "If", [["Although", "changed-meaning"], ["In the case that", "still-wordy"]], "The phrase sets a condition: what happens only when it rains.", "“In the event that” means “if.”", "In the event that"],
    es: ["El robot tiene la capacidad de subir escaleras.", "puede", [["debe", "changed-meaning"], ["es capaz de poder", "still-wordy"]], "La frase dice que el robot es capaz de algo.", "“Tiene la capacidad de” significa “puede”.", "tiene la capacidad de"],
  },
  {
    en: ["Our robot has the ability to climb stairs.", "can", [["must", "changed-meaning"], ["is able to", "still-wordy"]], "The phrase says the robot is capable of something.", "“Has the ability to” means “can.”", "has the ability to"],
    es: ["Maya practica el violín de forma diaria.", "diariamente", [["semanalmente", "changed-meaning"], ["todos y cada uno de los días", "still-wordy"]], "¿Con qué frecuencia practica?", "“De forma diaria” significa “diariamente”.", "de forma diaria"],
  },
  {
    en: ["Maya practices the violin on a daily basis.", "daily", [["weekly", "changed-meaning"], ["every single day of the week", "still-wordy"]], "How often does she practice?", "“On a daily basis” means “daily.”", "on a daily basis"],
    es: ["La biblioteca está en las proximidades del parque.", "cerca", [["enfrente", "changed-meaning"], ["en la zona cercana", "still-wordy"]], "La frase dice qué tan lejos están.", "“En las proximidades de” significa “cerca de”.", "en las proximidades"],
  },
  {
    en: ["The library is in close proximity to the park.", "near", [["across from", "changed-meaning"], ["in the general vicinity of", "still-wordy"]], "The phrase tells how far apart they are.", "“In close proximity to” means “near.”", "in close proximity to"],
    es: ["Lávate las manos con anterioridad a cocinar.", "antes de", [["después de", "changed-meaning"], ["previamente antes de", "still-wordy"]], "La frase dice cuándo, comparado con cocinar.", "“Con anterioridad a” significa “antes de”.", "con anterioridad a"],
  },
  {
    en: ["Wash your hands prior to cooking.", "before", [["after", "changed-meaning"], ["in advance of", "still-wordy"]], "The phrase tells when, compared with cooking.", "“Prior to” means “before.”", "prior to"],
    es: ["El médico realizó una revisión de mis oídos.", "revisó", [["ignoró", "changed-meaning"], ["llevó a cabo una revisión de", "still-wordy"]], "La frase dice lo que hizo el médico con mis oídos.", "“Realizó una revisión de” significa “revisó”. “Realizar” es un verbo comodín.", "realizó una revisión de"],
  },
  {
    en: ["Everyone came to the party with the exception of Leo.", "except", [["including", "changed-meaning"], ["excluding the presence of", "still-wordy"]], "The phrase leaves one person out.", "“With the exception of” means “except.”", "with the exception of"],
    es: ["Los alumnos hicieron una visita a la granja.", "visitaron", [["evitaron", "changed-meaning"], ["efectuaron una visita a", "still-wordy"]], "La frase dice lo que hicieron los alumnos en la granja.", "“Hicieron una visita a” significa “visitaron”. “Hacer” es un verbo comodín.", "hicieron una visita a"],
  },
  {
    en: ["At the present time, the pool is closed.", "Now", [["Soon", "changed-meaning"], ["At this moment in time", "still-wordy"]], "The phrase tells when: at this moment.", "“At the present time” means “now.”", "At the present time"],
    es: ["La maestra dio comienzo a la clase a las ocho.", "comenzó", [["terminó", "changed-meaning"], ["dio inicio a", "still-wordy"]], "La frase dice lo que hizo la maestra con la clase.", "“Dio comienzo a” significa “comenzó”.", "dio comienzo a"],
  },
  {
    en: ["We will visit the planetarium in the near future.", "soon", [["yesterday", "changed-meaning"], ["at a later point in time", "still-wordy"]], "The phrase tells when: not long from now.", "“In the near future” means “soon.”", "in the near future"],
    es: ["Por favor, toma en consideración mi idea para el paseo.", "considera", [["ignora", "changed-meaning"], ["ten en cuenta y considera", "still-wordy"]], "La frase pide pensar en la idea.", "“Toma en consideración” significa “considera”.", "toma en consideración"],
  },
  {
    en: ["Please give consideration to my idea for the class trip.", "consider", [["ignore", "changed-meaning"], ["take into consideration", "still-wordy"]], "The phrase asks someone to think about the idea.", "“Give consideration to” means “consider.”", "give consideration to"],
    es: ["Ana hizo un intento de arreglar el cierre.", "intentó", [["se negó a", "changed-meaning"], ["hizo el esfuerzo de intentar", "still-wordy"]], "La frase dice lo que hizo Ana con el cierre.", "“Hizo un intento de” significa “intentó”.", "hizo un intento de"],
  },
  {
    en: ["Ana made an attempt to fix the zipper.", "tried", [["refused", "changed-meaning"], ["made an effort", "still-wordy"]], "The phrase tells what Ana did about the zipper.", "“Made an attempt” means “tried.”", "made an attempt"],
    es: ["La detective llegó a la conclusión de que el gato se llevó el ovillo de lana.", "concluyó", [["dudó", "changed-meaning"], ["arribó a la conclusión de", "still-wordy"]], "La frase dice lo que decidió la detective.", "“Llegó a la conclusión de” significa “concluyó”.", "llegó a la conclusión de"],
  },
  {
    en: ["The detective came to the conclusion that the cat had taken the yarn.", "concluded", [["doubted", "changed-meaning"], ["reached the conclusion", "still-wordy"]], "The phrase tells what the detective decided.", "“Came to the conclusion” means “concluded.”", "came to the conclusion"],
    es: ["El jardín tiene necesidad de agua.", "necesita", [["tiene mucha", "changed-meaning"], ["está en necesidad de", "still-wordy"]], "La frase dice qué le falta al jardín.", "“Tiene necesidad de” significa “necesita”.", "tiene necesidad de"],
  },
  {
    en: ["A majority of the students voted for a longer lunch.", "Most", [["A few", "changed-meaning"], ["A greater number", "still-wordy"]], "The phrase says more than half of the students.", "“A majority” means “most.”", "A majority"],
    es: ["El entrenador habló de manera tranquila.", "tranquilamente", [["a gritos", "changed-meaning"], ["de un modo calmado y tranquilo", "still-wordy"]], "La frase dice cómo habló.", "“De manera tranquila” significa “tranquilamente”.", "de manera tranquila"],
  },
  {
    en: ["The garden is in need of water.", "needs", [["has plenty of", "changed-meaning"], ["has a need for", "still-wordy"]], "The phrase tells what the garden is missing.", "“Is in need of” means “needs.”", "is in need of"],
    es: ["Nos quedamos adentro debido a que estaba nevando.", "porque", [["aunque", "changed-meaning"], ["por el motivo de que", "still-wordy"]], "La frase da una razón.", "“Debido a que” significa “porque”.", "debido a que"],
  },
  {
    en: ["The coach spoke in a quiet manner.", "quietly", [["loudly", "changed-meaning"], ["in a soft way", "still-wordy"]], "The phrase tells how the coach spoke.", "“In a quiet manner” means “quietly.”", "in a quiet manner"],
    es: ["El director hizo mención de la fecha del examen.", "mencionó", [["olvidó", "changed-meaning"], ["hizo referencia mencionando", "still-wordy"]], "La frase dice lo que hizo el director con la fecha.", "“Hizo mención de” significa “mencionó”.", "hizo mención de"],
  },
  {
    en: ["We stayed inside for the reason that it was snowing.", "because", [["although", "changed-meaning"], ["due to the reason that", "still-wordy"]], "The phrase gives a reason.", "“For the reason that” means “because.”", "for the reason that"],
    es: ["Pusimos de manifiesto nuestras dudas en la reunión.", "Mostramos", [["Ocultamos", "changed-meaning"], ["Hicimos manifiestas y mostramos", "still-wordy"]], "La frase dice lo que hicimos con las dudas.", "“Poner de manifiesto” significa “mostrar”.", "Pusimos de manifiesto"],
  },
];

const WORDINESS = skill(
  { id: "e.wordiness", grade: "7", title: { en: "Cut wordiness and redundancy", es: "Redundancias y vicios del lenguaje" }, standard: "L.7.3a", prereqs: ["e.synonyms"] },
  [
    {
      bank: REDUNDANT,
      ask: { en: "Which words can be cut without losing any meaning?", es: "¿Qué palabra o palabras sobran, porque repiten una idea o no hacen falta?" },
      hints: {
        en: ["Look for a word that repeats an idea another word already gives.", "Read the sentence without each choice. Keep the words that carry meaning; cut the one that only repeats."],
        es: ["Busca una palabra que repita una idea que otra palabra ya da.", "Lee la oración sin cada opción. Quédate con las palabras que aportan significado y quita la que solo repite. Ojo con el “de” que sobra antes de “que” (dequeísmo)."],
      },
      seconds: 15,
    },
    {
      bank: WORDY_PHRASES,
      ask: { en: "Which word or words can replace {t} without changing the meaning?", es: "¿Qué palabra puede reemplazar {t} sin cambiar el significado?" },
      hints: {
        en: ["What does the long phrase really mean?", "Say the same idea in one or two plain words. Rule out choices that change the meaning or are just as wordy."],
        es: ["¿Qué significa en realidad la expresión larga?", "Di la misma idea con una o dos palabras sencillas. Descarta las opciones que cambian el sentido o que siguen siendo largas."],
      },
      seconds: 15,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.analogies — level 1: name how two words are related (six relationships; four are shown); level 2:
// complete an analogy. Tags on level 2: wrong-relationship, associated-word (goes with the topic but not
// the pattern), reversed-order.

type Relation = "synonyms" | "antonyms" | "part-whole" | "cause-effect" | "item-category" | "tool-use";
const RELATIONS: readonly Relation[] = ["synonyms", "antonyms", "part-whole", "cause-effect", "item-category", "tool-use"];
const RELATION_PAIRS = cats<Relation>(
  {
    en: { synonyms: "Synonyms", antonyms: "Antonyms", "part-whole": "Part to whole", "cause-effect": "Cause and effect", "item-category": "Item and category", "tool-use": "Tool and its use" },
    es: { synonyms: "Sinónimos", antonyms: "Antónimos", "part-whole": "Parte y todo", "cause-effect": "Causa y efecto", "item-category": "Elemento y categoría", "tool-use": "Herramienta y su uso" },
  },
  { en: RELATIONS, es: RELATIONS },
  [
    {
      en: ["finger : hand", "part-whole", "Is a finger a kind of hand, or one piece of a hand?", "A finger is one piece of a hand."],
      es: ["dedo : mano", "part-whole", "¿Un dedo es un tipo de mano, o una pieza de la mano?", "Un dedo es una pieza de la mano."],
    },
    {
      en: ["happy : joyful", "synonyms", "Do the two words mean about the same thing, or opposite things?", "“Happy” and “joyful” mean about the same thing."],
      es: ["feliz : alegre", "synonyms", "¿Las dos palabras significan casi lo mismo, o lo contrario?", "“Feliz” y “alegre” significan casi lo mismo."],
    },
    {
      en: ["ancient : modern", "antonyms", "Do the two words mean about the same thing, or opposite things?", "“Ancient” means very old, and “modern” means new: they are opposites."],
      es: ["antiguo : moderno", "antonyms", "¿Las dos palabras significan casi lo mismo, o lo contrario?", "“Antiguo” y “moderno” significan lo contrario."],
    },
    {
      en: ["rain : flood", "cause-effect", "Can one of these lead to the other?", "Heavy rain can cause a flood."],
      es: ["lluvia : inundación", "cause-effect", "¿Una de estas cosas puede provocar la otra?", "Mucha lluvia puede provocar una inundación."],
    },
    {
      en: ["oak : tree", "item-category", "Is an oak one piece of a tree, or one kind of tree?", "An oak is one kind of tree."],
      es: ["roble : árbol", "item-category", "¿El roble es una pieza de un árbol, o un tipo de árbol?", "El roble es un tipo de árbol."],
    },
    {
      en: ["scissors : cut", "tool-use", "What do you do with scissors?", "Scissors are a tool, and cutting is what they are used for."],
      es: ["tijeras : cortar", "tool-use", "¿Qué haces con unas tijeras?", "Las tijeras son una herramienta, y sirven para cortar."],
    },
    {
      en: ["page : book", "part-whole", "Is a page a kind of book, or one piece of a book?", "A page is one piece of a book."],
      es: ["página : libro", "part-whole", "¿Una página es un tipo de libro, o una pieza del libro?", "Una página es una pieza del libro."],
    },
    {
      en: ["brave : fearless", "synonyms", "Do the two words mean about the same thing, or opposite things?", "“Brave” and “fearless” mean about the same thing."],
      es: ["valiente : intrépido", "synonyms", "¿Las dos palabras significan casi lo mismo, o lo contrario?", "“Valiente” e “intrépido” significan casi lo mismo."],
    },
    {
      en: ["generous : stingy", "antonyms", "Do the two words mean about the same thing, or opposite things?", "A generous person shares freely; a stingy person does not. They are opposites."],
      es: ["generoso : tacaño", "antonyms", "¿Las dos palabras significan casi lo mismo, o lo contrario?", "Una persona generosa comparte; una tacaña no. Son opuestas."],
    },
    {
      en: ["practice : improvement", "cause-effect", "Can one of these lead to the other?", "Practice leads to improvement."],
      es: ["práctica : mejora", "cause-effect", "¿Una de estas cosas puede provocar la otra?", "La práctica produce una mejora."],
    },
    {
      en: ["violin : instrument", "item-category", "Is a violin one piece of an instrument, or one kind of instrument?", "A violin is one kind of instrument."],
      es: ["violín : instrumento", "item-category", "¿El violín es una pieza de un instrumento, o un tipo de instrumento?", "El violín es un tipo de instrumento."],
    },
    {
      en: ["shovel : dig", "tool-use", "What do you do with a shovel?", "A shovel is a tool, and digging is what it is used for."],
      es: ["pala : cavar", "tool-use", "¿Qué haces con una pala?", "La pala es una herramienta, y sirve para cavar."],
    },
    {
      en: ["petal : flower", "part-whole", "Is a petal a kind of flower, or one piece of a flower?", "A petal is one piece of a flower."],
      es: ["pétalo : flor", "part-whole", "¿Un pétalo es un tipo de flor, o una pieza de la flor?", "Un pétalo es una pieza de la flor."],
    },
    {
      en: ["germ : illness", "cause-effect", "Can one of these lead to the other?", "A germ can cause an illness."],
      es: ["germen : enfermedad", "cause-effect", "¿Una de estas cosas puede provocar la otra?", "Un germen puede provocar una enfermedad."],
    },
    {
      en: ["Jupiter : planet", "item-category", "Is Jupiter one piece of a planet, or one kind of planet?", "Jupiter is one of the planets."],
      es: ["Júpiter : planeta", "item-category", "¿Júpiter es una pieza de un planeta, o uno de los planetas?", "Júpiter es uno de los planetas."],
    },
    {
      en: ["broom : sweep", "tool-use", "What do you do with a broom?", "A broom is a tool, and sweeping is what it is used for."],
      es: ["escoba : barrer", "tool-use", "¿Qué haces con una escoba?", "La escoba es una herramienta, y sirve para barrer."],
    },
    {
      en: ["huge : enormous", "synonyms", "Do the two words mean about the same thing, or opposite things?", "“Huge” and “enormous” mean about the same thing."],
      es: ["enorme : gigantesco", "synonyms", "¿Las dos palabras significan casi lo mismo, o lo contrario?", "“Enorme” y “gigantesco” significan casi lo mismo."],
    },
    {
      en: ["shallow : deep", "antonyms", "Do the two words mean about the same thing, or opposite things?", "“Shallow” and “deep” mean opposite things."],
      es: ["cerca : lejos", "antonyms", "¿Las dos palabras significan casi lo mismo, o lo contrario?", "“Cerca” y “lejos” significan lo contrario."],
    },
  ],
);

const ANALOGY: Bi<Entry>[] = [
  {
    en: ["Thermometer is to temperature as scale is to ___.", "weight", [["kitchen", "associated-word"], ["heavy", "wrong-relationship"]], "A thermometer measures temperature. What does a scale measure?", "Both pairs are a tool and what it measures."],
    es: ["Termómetro es a temperatura como balanza es a ___.", "peso", [["cocina", "associated-word"], ["pesado", "wrong-relationship"]], "El termómetro mide la temperatura. ¿Qué mide la balanza?", "Los dos pares son un instrumento y lo que mide."],
  },
  {
    en: ["Finger is to hand as toe is to ___.", "foot", [["shoe", "associated-word"], ["nail", "reversed-order"]], "A finger is one part of a hand. A toe is one part of what?", "Both pairs are a part and the whole it belongs to."],
    es: ["Pétalo es a flor como rama es a ___.", "árbol", [["bosque", "associated-word"], ["hoja", "reversed-order"]], "Un pétalo es una parte de la flor. ¿De qué es parte una rama?", "Los dos pares son una parte y el todo al que pertenece."],
  },
  {
    en: ["Hot is to cold as tall is to ___.", "short", [["high", "wrong-relationship"], ["giraffe", "associated-word"]], "Hot and cold are opposites. What is the opposite of tall?", "Both pairs are opposites."],
    es: ["Caliente es a frío como alto es a ___.", "bajo", [["elevado", "wrong-relationship"], ["jirafa", "associated-word"]], "Caliente y frío son opuestos. ¿Cuál es el opuesto de alto?", "Los dos pares son opuestos."],
  },
  {
    en: ["Author is to book as composer is to ___.", "symphony", [["piano", "associated-word"], ["conductor", "wrong-relationship"]], "An author creates a book. What does a composer create?", "Both pairs are a creator and what that person makes."],
    es: ["Autor es a libro como compositor es a ___.", "sinfonía", [["piano", "associated-word"], ["director", "wrong-relationship"]], "Un autor crea un libro. ¿Qué crea un compositor?", "Los dos pares son quien crea y lo que crea."],
  },
  {
    en: ["Honeybee is to hive as bird is to ___.", "nest", [["feather", "wrong-relationship"], ["sky", "associated-word"]], "Honeybees raise their young in a hive. Where do birds raise their young?", "Both pairs are an animal and the place it raises its young."],
    es: ["Abeja melífera es a colmena como pájaro es a ___.", "nido", [["pluma", "wrong-relationship"], ["cielo", "associated-word"]], "Las abejas melíferas crían en la colmena. ¿Dónde crían los pájaros?", "Los dos pares son un animal y el lugar donde cría."],
  },
  {
    en: ["Caterpillar is to butterfly as tadpole is to ___.", "frog", [["pond", "associated-word"], ["fish", "wrong-relationship"]], "A caterpillar grows up to become a butterfly. What does a tadpole become?", "Both pairs are a young animal and the adult it becomes."],
    es: ["Oruga es a mariposa como renacuajo es a ___.", "rana", [["charco", "associated-word"], ["pez", "wrong-relationship"]], "La oruga se convierte en mariposa. ¿En qué se convierte el renacuajo?", "Los dos pares son un animal joven y el adulto en que se convierte."],
  },
  {
    en: ["Pen is to write as knife is to ___.", "cut", [["fork", "associated-word"], ["sharp", "wrong-relationship"]], "You use a pen to write. What do you use a knife to do?", "Both pairs are a tool and its use."],
    es: ["Lápiz es a escribir como cuchillo es a ___.", "cortar", [["tenedor", "associated-word"], ["filoso", "wrong-relationship"]], "El lápiz sirve para escribir. ¿Para qué sirve el cuchillo?", "Los dos pares son una herramienta y su uso."],
  },
  {
    en: ["Rain is to flood as spark is to ___.", "fire", [["electricity", "associated-word"], ["match", "wrong-relationship"]], "Rain can cause a flood. What can a spark cause?", "Both pairs are a cause and its effect."],
    es: ["Lluvia es a inundación como chispa es a ___.", "incendio", [["electricidad", "associated-word"], ["fósforo", "wrong-relationship"]], "La lluvia puede provocar una inundación. ¿Qué puede provocar una chispa?", "Los dos pares son una causa y su efecto."],
  },
  {
    en: ["Puppy is to dog as kitten is to ___.", "cat", [["yarn", "associated-word"], ["litter", "wrong-relationship"]], "A puppy is a young dog. A kitten is a young what?", "Both pairs are a young animal and the adult."],
    es: ["Cachorro es a perro como gatito es a ___.", "gato", [["ovillo", "associated-word"], ["camada", "wrong-relationship"]], "Un cachorro es un perro joven. ¿Un gatito es un qué joven?", "Los dos pares son un animal joven y el adulto."],
  },
  {
    en: ["Generous is to stingy as brave is to ___.", "cowardly", [["bold", "wrong-relationship"], ["hero", "associated-word"]], "Generous and stingy are opposites. What is the opposite of brave?", "Both pairs are opposites."],
    es: ["Generoso es a tacaño como valiente es a ___.", "cobarde", [["audaz", "wrong-relationship"], ["héroe", "associated-word"]], "Generoso y tacaño son opuestos. ¿Cuál es el opuesto de valiente?", "Los dos pares son opuestos."],
  },
  {
    en: ["Teacher is to classroom as chef is to ___.", "kitchen", [["recipe", "associated-word"], ["waiter", "wrong-relationship"]], "A teacher works in a classroom. Where does a chef work?", "Both pairs are a worker and a workplace."],
    es: ["Maestro es a salón como cocinero es a ___.", "cocina", [["receta", "associated-word"], ["mesero", "wrong-relationship"]], "El maestro trabaja en el salón. ¿Dónde trabaja el cocinero?", "Los dos pares son quien trabaja y su lugar de trabajo."],
  },
  {
    en: ["Page is to book as key is to ___.", "keyboard", [["lock", "wrong-relationship"], ["open", "associated-word"]], "A page is one part of a book. A key is one part of what?", "Both pairs are a part and the whole it belongs to. A key on a keyboard is part of it; a lock key is not part of the lock."],
    es: ["Página es a libro como tecla es a ___.", "teclado", [["escribir", "associated-word"], ["dedo", "wrong-relationship"]], "Una página es una parte del libro. ¿De qué es parte una tecla?", "Los dos pares son una parte y el todo al que pertenece."],
  },
  {
    en: ["Brush is to painter as hammer is to ___.", "carpenter", [["nail", "wrong-relationship"], ["toolbox", "associated-word"]], "A painter uses a brush. Who uses a hammer?", "Both pairs are a tool and the worker who uses it."],
    es: ["Pincel es a pintor como martillo es a ___.", "carpintero", [["clavo", "wrong-relationship"], ["caja de herramientas", "associated-word"]], "El pintor usa el pincel. ¿Quién usa el martillo?", "Los dos pares son una herramienta y quien la usa."],
  },
  {
    en: ["Fish is to school as wolf is to ___.", "pack", [["forest", "associated-word"], ["howl", "wrong-relationship"]], "A group of fish is called a school. What is a group of wolves called?", "Both pairs are an animal and the name for its group."],
    es: ["Pez es a cardumen como lobo es a ___.", "manada", [["bosque", "associated-word"], ["aullido", "wrong-relationship"]], "Un grupo de peces se llama cardumen. ¿Cómo se llama un grupo de lobos?", "Los dos pares son un animal y el nombre de su grupo."],
  },
  {
    en: ["Sun is to day as moon is to ___.", "night", [["star", "associated-word"], ["crater", "wrong-relationship"]], "The sun lights up the day. What does the moon light up?", "Both pairs are a light in the sky and the time it lights up."],
    es: ["Sol es a día como luna es a ___.", "noche", [["estrella", "associated-word"], ["cráter", "wrong-relationship"]], "El sol ilumina el día. ¿Qué ilumina la luna?", "Los dos pares son una luz del cielo y el momento que ilumina."],
  },
];

const ANALOGIES = skill(
  { id: "e.analogies", grade: "7", title: { en: "Word relationships and analogies", es: "Relaciones entre palabras y analogías" }, standard: "L.7.5b", prereqs: ["e.synonyms"] },
  [
    {
      ...RELATION_PAIRS,
      ask: { en: "How are these two words related?", es: "¿Qué relación hay entre estas dos palabras?" },
      hints: {
        en: ["Make a short sentence that links the two words.", "Is one a part of the other, a kind of the other, the cause of the other, or a tool for the other? Or do they mean the same or opposite things?"],
        es: ["Haz una oración corta que una las dos palabras.", "¿Una es parte de la otra, un tipo de la otra, la causa de la otra o una herramienta para la otra? ¿O significan lo mismo o lo contrario?"],
      },
      seconds: 12,
    },
    {
      bank: ANALOGY,
      ask: { en: "Choose the word that completes the analogy.", es: "Elige la palabra que completa la analogía." },
      hints: {
        en: ["Say how the first two words are related in a short sentence.", "Use the same sentence with the third word, then test each choice in it. Keep the words in the same order."],
        es: ["Di en una oración corta qué relación hay entre las dos primeras palabras.", "Usa la misma oración con la tercera palabra y prueba cada opción. Mantén el mismo orden."],
      },
      seconds: 20,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.formal.style — choose the sentence that fits formal writing. Spanish adds the register of "usted"
// and of colloquial words. Tags: slang, text-abbreviation, casual-address.

const FORMAL: Bi<Entry>[] = [
  {
    en: ["A sentence for a science report about plants:", "The plants that received more sunlight grew taller.", [["The plants that got more sun totally shot up.", "slang"], ["Plants w/ more sun grew taller lol.", "text-abbreviation"], ["You won't believe how tall the sunny plants got.", "casual-address"]], "“Lol” and “w/” are texting shortcuts; they do not belong in a report.", "A report states results in complete, exact words."],
    es: ["Una oración para un informe de ciencias sobre plantas:", "Las plantas que recibieron más luz solar crecieron más.", [["Las plantas que tenían más sol crecieron un montón.", "slang"], ["Las plantas c/ más sol crecieron + q las otras.", "text-abbreviation"], ["No vas a creer cuánto crecieron las plantas con sol.", "casual-address"]], "“c/” y “q” son abreviaturas de chat; no van en un informe.", "Un informe da los resultados con palabras completas y precisas."],
  },
  {
    en: ["A sentence for a letter to the city council:", "We request that the city repair the broken streetlight on Oak Avenue.", [["Can y'all fix that busted light on Oak?", "slang"], ["Pls fix the light on Oak Ave ASAP.", "text-abbreviation"], ["Hey guys, you really need to fix the light on Oak Avenue.", "casual-address"]], "“Hey guys” talks to the council like friends.", "A letter to officials makes a polite, complete request."],
    es: ["Una oración para una carta al concejo municipal:", "Solicitamos que se repare la lámpara descompuesta de la avenida Roble.", [["¿Pueden arreglar ya esa lámpara toda fea de la avenida?", "slang"], ["Xfa arreglen la lámpara de la av. Roble.", "text-abbreviation"], ["Oigan, tienen que arreglar la lámpara de la avenida Roble.", "casual-address"]], "“Oigan” les habla a las autoridades como a amigos.", "Una carta a las autoridades hace una petición cortés y completa."],
  },
  {
    en: ["A sentence for an essay about recycling:", "Recycling reduces the amount of waste sent to landfills.", [["Recycling is super awesome and cuts down on junk.", "slang"], ["Recycling = less trash in landfills.", "text-abbreviation"], ["Trust me, you'd be amazed how much recycling helps.", "casual-address"]], "“Super awesome” is slang.", "An essay states its point in exact words."],
    es: ["Una oración para un ensayo sobre el reciclaje:", "El reciclaje reduce la cantidad de basura que llega a los rellenos sanitarios.", [["Reciclar está buenísimo y así hay menos basura.", "slang"], ["Reciclar = menos basura en los basureros.", "text-abbreviation"], ["Créeme, reciclar ayuda muchísimo.", "casual-address"]], "“Está buenísimo” es lenguaje coloquial.", "Un ensayo dice su idea con palabras precisas."],
  },
  {
    en: ["A sentence for a book report:", "The main character learns to trust her friends by the end of the novel.", [["The main character is kinda cool and finally chills with her friends.", "slang"], ["The main character learns 2 trust her friends.", "text-abbreviation"], ["You're gonna love how the main character changes.", "casual-address"]], "“Kinda” and “chills” are slang.", "A book report describes the story in clear, complete words."],
    es: ["Una oración para un reporte de lectura:", "La protagonista aprende a confiar en sus amigos al final de la novela.", [["La protagonista es bien chévere y al final se lleva bien con sus amigos.", "slang"], ["La protagonista aprende a confiar en sus amigos xq la ayudan.", "text-abbreviation"], ["Te va a encantar cómo cambia la protagonista.", "casual-address"]], "“Bien chévere” es lenguaje coloquial.", "Un reporte de lectura describe la historia con palabras claras y completas."],
  },
  {
    en: ["A sentence for an email to a teacher:", "Could you please explain the directions for question five?", [["What's the deal with question five?", "slang"], ["Can u explain #5?", "text-abbreviation"], ["Yo, help me out with question five.", "casual-address"]], "“Yo” talks to a teacher like a friend.", "A message to a teacher asks politely, in complete words."],
    es: ["Una oración para un correo a la maestra:", "¿Podría explicarme, por favor, las instrucciones de la pregunta cinco?", [["¿Qué onda con la pregunta cinco?", "slang"], ["¿Me explica la 5 xfa?", "text-abbreviation"], ["Oye, ¿me explicas la pregunta cinco?", "casual-address"]], "“Oye” y el tuteo le hablan a la maestra como a una amiga.", "A la maestra se le escribe con cortesía, de usted y con palabras completas."],
  },
  {
    en: ["A sentence for a history essay:", "The colonists protested the new taxes because they had no vote in Parliament.", [["The colonists were super mad about the taxes.", "slang"], ["Colonists were mad b/c of taxes.", "text-abbreviation"], ["Can you blame the colonists for being upset about taxes?", "casual-address"]], "“Super mad” is slang.", "A history essay explains causes in exact words."],
    es: ["Una oración para un ensayo de historia:", "Los colonos protestaron contra los nuevos impuestos porque no tenían voto en el Parlamento.", [["Los colonos estaban súper enojados por los impuestos.", "slang"], ["Los colonos protestaron xq no tenían voto.", "text-abbreviation"], ["¿Tú no te habrías enojado con esos impuestos?", "casual-address"]], "“Súper enojados” es lenguaje coloquial.", "Un ensayo de historia explica las causas con palabras precisas."],
  },
  {
    en: ["A sentence for a lab conclusion:", "The results support the hypothesis that salt water freezes at a lower temperature.", [["Turns out salt water freezes way colder, no joke.", "slang"], ["Salt water freezes @ a lower temp.", "text-abbreviation"], ["Guess what? You need more cold to freeze salt water.", "casual-address"]], "“@” and “temp” are shortcuts.", "A lab conclusion connects the results to the hypothesis in exact words."],
    es: ["Una oración para la conclusión de un experimento:", "Los resultados apoyan la hipótesis de que el agua salada se congela a menor temperatura.", [["Resulta que el agua salada tarda un montonal en congelarse.", "slang"], ["El agua salada se congela a menor temp.", "text-abbreviation"], ["¿Sabías que el agua salada necesita más frío para congelarse?", "casual-address"]], "“Temp.” es una abreviatura informal.", "Una conclusión conecta los resultados con la hipótesis con palabras precisas."],
  },
  {
    en: ["A sentence for a speech at a school board meeting:", "Our students would benefit from a longer lunch period.", [["Lunch is way too short, and it's a total drag.", "slang"], ["Longer lunch = happier kids.", "text-abbreviation"], ["Come on, you all know lunch is too short.", "casual-address"]], "“Come on, you all know” talks to the board like friends.", "A speech to a board makes the point respectfully."],
    es: ["Una oración para un discurso ante la junta escolar:", "Nuestros estudiantes se beneficiarían de un recreo más largo.", [["El recreo está bien cortito, es un rollo.", "slang"], ["Recreo + largo = niños + felices.", "text-abbreviation"], ["Ándale, tú sabes que el recreo es muy corto.", "casual-address"]], "“Ándale, tú sabes” le habla a la junta como a un amigo.", "Un discurso ante la junta presenta la idea con respeto."],
  },
  {
    en: ["A sentence for a museum label:", "This pottery was made by hand more than 500 years ago.", [["This pottery is crazy old, like 500 years.", "slang"], ["Pottery made by hand 500+ yrs ago.", "text-abbreviation"], ["Check out this pottery, you guys.", "casual-address"]], "“Crazy old” is slang.", "A museum label gives facts in complete words."],
    es: ["Una oración para la ficha de un museo:", "Esta vasija fue hecha a mano hace más de 500 años.", [["Esta vasija es viejísima, tipo de hace 500 años.", "slang"], ["Vasija hecha a mano hace +500 años.", "text-abbreviation"], ["Mira nada más esta vasija tan antigua.", "casual-address"]], "“Tipo de hace 500 años” es lenguaje coloquial.", "La ficha de un museo da datos con palabras completas."],
  },
  {
    en: ["A sentence for a thank-you letter to a guest speaker:", "Thank you for taking the time to speak to our class about your work.", [["Thanks a ton for the cool talk.", "slang"], ["Thx for the talk, ttyl.", "text-abbreviation"], ["Hey there, hope you had fun hanging out with us.", "casual-address"]], "“Thx” and “ttyl” are texting shortcuts.", "A thank-you letter to a guest is polite and complete."],
    es: ["Una oración para una carta de agradecimiento a una invitada:", "Le agradecemos que haya dedicado su tiempo a hablar con nuestra clase.", [["Mil gracias por la plática tan padre.", "slang"], ["Grax x la plática, saludos.", "text-abbreviation"], ["Gracias, te luciste con tu plática.", "casual-address"]], "“Grax” y “x” son abreviaturas de chat.", "A una invitada se le agradece de usted y con palabras completas."],
  },
  {
    en: ["A sentence for a research paper on sleep:", "Teenagers need between eight and ten hours of sleep each night.", [["Teens need tons of sleep, for real.", "slang"], ["Teens need 8-10 hrs of sleep.", "text-abbreviation"], ["You probably don't get enough sleep, right?", "casual-address"]], "“For real” is slang.", "A research paper states facts in exact words."],
    es: ["Una oración para un trabajo de investigación sobre el sueño:", "Los adolescentes necesitan entre ocho y diez horas de sueño cada noche.", [["Los adolescentes necesitan dormir un montón, en serio.", "slang"], ["Los adolescentes necesitan 8-10 hrs de sueño.", "text-abbreviation"], ["¿A poco tú duermes lo suficiente?", "casual-address"]], "“Un montón, en serio” es lenguaje coloquial.", "Un trabajo de investigación da datos con palabras precisas."],
  },
  {
    en: ["A sentence for a news article in the school paper:", "The robotics team placed second at the regional competition on Saturday.", [["The robotics team totally crushed it and got second.", "slang"], ["Robotics team got 2nd @ regionals Sat.", "text-abbreviation"], ["You'll never guess how the robotics team did.", "casual-address"]], "“Totally crushed it” is slang.", "A news article reports what happened in exact words."],
    es: ["Una oración para una noticia del periódico escolar:", "El equipo de robótica obtuvo el segundo lugar en la competencia regional del sábado.", [["El equipo de robótica la rompió y quedó en segundo.", "slang"], ["Robótica: 2.º lugar en la regional, sáb.", "text-abbreviation"], ["No vas a adivinar cómo le fue al equipo de robótica.", "casual-address"]], "“La rompió” es lenguaje coloquial.", "Una noticia informa lo que pasó con palabras precisas."],
  },
  {
    en: ["A sentence for a cover letter for a summer job at the library:", "I am interested in the summer position because I enjoy helping people find books.", [["I'm all about books, so this job is perfect for me.", "slang"], ["I want the job bc I like books.", "text-abbreviation"], ["You should totally hire me.", "casual-address"]], "“Bc” is a texting shortcut.", "A cover letter explains your interest politely and completely."],
    es: ["Una oración para una solicitud de empleo de verano en la biblioteca:", "Me interesa el puesto de verano porque disfruto ayudar a las personas a encontrar libros.", [["Me late un montón ese trabajo porque los libros están chidos.", "slang"], ["Quiero el trabajo xq me gustan los libros.", "text-abbreviation"], ["Deberías contratarme, de veras.", "casual-address"]], "“Xq” es una abreviatura de chat.", "Una solicitud explica tu interés con cortesía y palabras completas."],
  },
  {
    en: ["A sentence for a lab safety handout:", "Students must wear safety goggles while heating liquids.", [["Wear goggles or you'll be sorry, dude.", "slang"], ["Goggles = required w/ hot liquids.", "text-abbreviation"], ["You guys better put on goggles.", "casual-address"]], "“Dude” is slang.", "A safety rule is stated clearly and completely."],
    es: ["Una oración para una hoja de seguridad del laboratorio:", "Los estudiantes deben usar gafas de seguridad al calentar líquidos.", [["Pónganse los lentes o se van a arrepentir, chavos.", "slang"], ["Gafas = obligatorias c/ líquidos calientes.", "text-abbreviation"], ["Oye, ponte los lentes, ¿va?", "casual-address"]], "“Chavos” es lenguaje coloquial.", "Una regla de seguridad se dice con claridad y palabras completas."],
  },
];

const FORMAL_STYLE = skill(
  { id: "e.formal.style", grade: "7", title: { en: "Formal and informal style", es: "Registro formal e informal" }, standard: "W.7.1d", prereqs: ["e.claim.evidence"] },
  [
    {
      bank: FORMAL,
      ask: { en: "Which sentence fits this formal writing best?", es: "¿Qué oración queda mejor en este texto formal?" },
      hints: {
        en: ["Who will read this, and how should the writer sound to them?", "Formal writing uses complete sentences and exact words. Rule out slang, texting shortcuts, and chatty lines that talk to the reader like a friend."],
        es: ["¿Quién va a leer esto y cómo debe sonar quien escribe?", "El registro formal usa oraciones completas y palabras precisas, y trata de usted cuando hace falta. Descarta los coloquialismos, las abreviaturas de chat y el tuteo con desconocidos."],
      },
      seconds: 25,
    },
  ],
);

// ===================================================================================================
// Grade 8
// ===================================================================================================

// ---------------------------------------------------------------------------------------------------
// e.verbals — level 1: which verbal it is; level 2: the job it does. English gerunds, participles and
// infinitives; Spanish formas no personales (infinitivo, gerundio, participio). A Spanish gerundio is not
// an English gerund: it works like an adverb, while the Spanish infinitive is the one that works like a
// noun ("Nadar es divertido"), so the Spanish items teach the Spanish system.

type Verbal = "gerund" | "participle" | "infinitive";
const VERBAL_TYPE = cats<Verbal>(
  {
    en: { gerund: "Gerund", participle: "Participle", infinitive: "Infinitive" },
    es: { infinitive: "Infinitivo", gerund: "Gerundio", participle: "Participio" },
  },
  { en: ["gerund", "participle", "infinitive"], es: ["infinitive", "gerund", "participle"] },
  [
    {
      en: ["Swimming is my favorite sport.", "gerund", "It ends in -ing and names an activity; it is the subject.", "“Swimming” works as a noun, so it is a gerund.", "Swimming"],
      es: ["Nadar es mi deporte favorito.", "infinitive", "Fíjate en la terminación: -ar.", "“Nadar” termina en -ar: es un infinitivo.", "Nadar"],
    },
    {
      en: ["The barking dog woke the whole street.", "participle", "It ends in -ing, but it describes the dog.", "“Barking” describes a noun, so it is a participle.", "barking"],
      es: ["El niño llegó corriendo a la escuela.", "gerund", "Fíjate en la terminación: -iendo.", "“Corriendo” termina en -iendo: es un gerundio.", "corriendo"],
    },
    {
      en: ["Lena wants to learn Japanese.", "infinitive", "Look at the word right before “learn.”", "“To learn” is “to” plus a verb: an infinitive.", "to learn"],
      es: ["La ventana rota dejaba entrar el frío.", "participle", "Es una forma irregular del verbo romper, y describe a la ventana.", "“Rota” viene de romper y describe a la ventana: es un participio.", "rota"],
    },
    {
      en: ["The broken window let in the cold.", "participle", "It describes the window.", "“Broken” describes a noun, so it is a participle.", "broken"],
      es: ["Lena quiere aprender japonés.", "infinitive", "Fíjate en la terminación: -er.", "“Aprender” termina en -er: es un infinitivo.", "aprender"],
    },
    {
      en: ["Kenji enjoys drawing comics.", "gerund", "It names what Kenji enjoys; it is the object of “enjoys.”", "“Drawing” works as a noun, so it is a gerund.", "drawing"],
      es: ["Mi abuela cocina cantando.", "gerund", "Fíjate en la terminación: -ando.", "“Cantando” termina en -ando: es un gerundio.", "cantando"],
    },
    {
      en: ["To win the championship was the team's goal.", "infinitive", "It starts with “to” followed by a verb.", "“To win” is an infinitive.", "To win"],
      es: ["Los aficionados emocionados aplaudieron al equipo.", "participle", "Fíjate en la terminación: -ado, más la -s del plural.", "“Emocionados” describe a los aficionados: es un participio.", "emocionados"],
    },
    {
      en: ["The excited fans cheered for the team.", "participle", "It describes the fans.", "“Excited” describes a noun, so it is a participle.", "excited"],
      es: ["Ganar el campeonato era la meta del equipo.", "infinitive", "Fíjate en la terminación: -ar.", "“Ganar” es un infinitivo.", "Ganar"],
    },
    {
      en: ["Reading before bed helps me relax.", "gerund", "It names an activity and is the subject.", "“Reading” works as a noun, so it is a gerund.", "Reading"],
      es: ["Leyendo antes de dormir me relajo.", "gerund", "Viene de leer y termina en -yendo, una variante de -iendo.", "“Leyendo” es un gerundio.", "Leyendo"],
    },
    {
      en: ["We stopped at the store to buy milk.", "infinitive", "It starts with “to” followed by a verb.", "“To buy” is an infinitive.", "to buy"],
      es: ["El lago congelado brillaba al sol.", "participle", "Fíjate en la terminación: -ado.", "“Congelado” describe al lago: es un participio.", "congelado"],
    },
    {
      en: ["The smiling baby reached for the toy.", "participle", "It describes the baby.", "“Smiling” describes a noun, so it is a participle.", "smiling"],
      es: ["Kenji pasa las tardes dibujando historietas.", "gerund", "Fíjate en la terminación: -ando.", "“Dibujando” es un gerundio.", "dibujando"],
    },
    {
      en: ["My brother is good at baking bread.", "gerund", "It comes after “at” and names an activity.", "“Baking” works as a noun, so it is a gerund.", "baking"],
      es: ["Paramos en la tienda para comprar leche.", "infinitive", "Fíjate en la terminación: -ar.", "“Comprar” es un infinitivo.", "comprar"],
    },
    {
      en: ["Maya has a lot of homework to finish.", "infinitive", "It starts with “to” followed by a verb.", "“To finish” is an infinitive.", "to finish"],
      es: ["Agotada por la carrera, Ana se sentó.", "participle", "Fíjate en la terminación: -ada.", "“Agotada” describe a Ana: es un participio.", "Agotada"],
    },
    {
      en: ["The frozen lake sparkled in the sun.", "participle", "It describes the lake.", "“Frozen” describes a noun, so it is a participle.", "frozen"],
      es: ["Los niños salieron del agua temblando.", "gerund", "Fíjate en la terminación: -ando.", "“Temblando” es un gerundio.", "temblando"],
    },
    {
      en: ["Hiking in the rain was not much fun.", "gerund", "It names an activity and is the subject.", "“Hiking” works as a noun, so it is a gerund.", "Hiking"],
      es: ["Omar olvidó traer su almuerzo.", "infinitive", "Fíjate en la terminación: -er.", "“Traer” es un infinitivo.", "traer"],
    },
    {
      en: ["Omar forgot to bring his lunch.", "infinitive", "It starts with “to” followed by a verb.", "“To bring” is an infinitive.", "to bring"],
      es: ["La carta escrita a mano llegó ayer.", "participle", "Es una forma irregular del verbo escribir.", "“Escrita” es el participio irregular de escribir.", "escrita"],
    },
    {
      en: ["Exhausted from the race, Ana sat down.", "participle", "It describes Ana.", "“Exhausted” describes a noun, so it is a participle.", "Exhausted"],
      es: ["Me gusta escuchar música mientras estudio.", "infinitive", "Fíjate en la terminación: -ar.", "“Escuchar” es un infinitivo.", "escuchar"],
    },
  ],
);

const VERBAL_JOB = cats<GroupJob>(
  {
    en: { noun: "Works as a noun", adjective: "Works as an adjective", adverb: "Works as an adverb" },
    es: { noun: "Funciona como sustantivo", adjective: "Funciona como adjetivo", adverb: "Funciona como adverbio" },
  },
  { en: ["noun", "adjective", "adverb"], es: ["noun", "adjective", "adverb"] },
  [
    {
      en: ["Swimming is my favorite sport.", "noun", "Ask: what is my favorite sport?", "The gerund names the sport and is the subject, so it works as a noun.", "Swimming"],
      es: ["Nadar es mi deporte favorito.", "noun", "Pregúntate: ¿qué es mi deporte favorito?", "El infinitivo nombra el deporte y es el sujeto: funciona como sustantivo.", "Nadar"],
    },
    {
      en: ["The barking dog woke the whole street.", "adjective", "Ask: which dog?", "The participle describes the dog, so it works as an adjective.", "barking"],
      es: ["El niño llegó corriendo a la escuela.", "adverb", "Pregúntate: ¿cómo llegó el niño?", "El gerundio dice cómo llegó: funciona como adverbio.", "corriendo"],
    },
    {
      en: ["We went to the store to buy milk.", "adverb", "Ask: why did we go to the store?", "The infinitive phrase tells why, so it works as an adverb.", "to buy milk"],
      es: ["La ventana rota dejaba entrar el frío.", "adjective", "Pregúntate: ¿cómo es la ventana?", "El participio describe a la ventana: funciona como adjetivo.", "rota"],
    },
    {
      en: ["Maya has a lot of homework to finish.", "adjective", "Ask: what kind of homework?", "The infinitive describes the homework, so it works as an adjective.", "to finish"],
      es: ["Me gusta escuchar música.", "noun", "Pregúntate: ¿qué me gusta?", "El infinitivo nombra lo que me gusta (es el sujeto de “gusta”): funciona como sustantivo.", "escuchar música"],
    },
    {
      en: ["To win the championship was the team's goal.", "noun", "Ask: what was the team's goal?", "The infinitive phrase is the subject, so it works as a noun.", "To win the championship"],
      es: ["Mi abuela cocina cantando.", "adverb", "Pregúntate: ¿cómo cocina mi abuela?", "El gerundio dice cómo cocina: funciona como adverbio.", "cantando"],
    },
    {
      en: ["The frozen lake sparkled in the sun.", "adjective", "Ask: which lake?", "The participle describes the lake, so it works as an adjective.", "frozen"],
      es: ["El lago congelado brillaba al sol.", "adjective", "Pregúntate: ¿cómo es el lago?", "El participio describe al lago: funciona como adjetivo.", "congelado"],
    },
    {
      en: ["Kenji enjoys drawing comics.", "noun", "Ask: what does Kenji enjoy?", "The gerund phrase names what he enjoys, so it works as a noun.", "drawing comics"],
      es: ["Ganar el campeonato era la meta del equipo.", "noun", "Pregúntate: ¿qué era la meta del equipo?", "El infinitivo es el sujeto: funciona como sustantivo.", "Ganar el campeonato"],
    },
    {
      en: ["Lena practiced every day to improve her serve.", "adverb", "Ask: why did Lena practice?", "The infinitive phrase tells why, so it works as an adverb.", "to improve her serve"],
      es: ["Los niños salieron del agua temblando.", "adverb", "Pregúntate: ¿cómo salieron los niños?", "El gerundio dice cómo salieron: funciona como adverbio.", "temblando"],
    },
    {
      en: ["Exhausted from the race, Ana sat down.", "adjective", "Ask: what was Ana like?", "The participle phrase describes Ana, so it works as an adjective.", "Exhausted from the race"],
      es: ["Agotada por la carrera, Ana se sentó.", "adjective", "Pregúntate: ¿cómo estaba Ana?", "El participio describe a Ana: funciona como adjetivo.", "Agotada por la carrera"],
    },
    {
      en: ["Lena wants to learn Japanese.", "noun", "Ask: what does Lena want?", "The infinitive phrase names what she wants, so it works as a noun.", "to learn Japanese"],
      es: ["Lena quiere aprender japonés.", "noun", "Pregúntate: ¿qué quiere Lena?", "El infinitivo nombra lo que quiere: funciona como sustantivo.", "aprender japonés"],
    },
    {
      en: ["The students were happy to help.", "adverb", "Ask: happy in what way, or why?", "The infinitive adds to the adjective “happy,” so it works as an adverb.", "to help"],
      es: ["El perro entró a la casa ladrando.", "adverb", "Pregúntate: ¿cómo entró el perro?", "El gerundio dice cómo entró: funciona como adverbio.", "ladrando"],
    },
    {
      en: ["The book to read next is on my desk.", "adjective", "Ask: which book?", "The infinitive tells which book, so it works as an adjective.", "to read next"],
      es: ["La carta escrita a mano llegó ayer.", "adjective", "Pregúntate: ¿cómo es la carta?", "El participio describe a la carta: funciona como adjetivo.", "escrita a mano"],
    },
    {
      en: ["Hiking in the rain was not much fun.", "noun", "Ask: what was not much fun?", "The gerund phrase is the subject, so it works as a noun.", "Hiking in the rain"],
      es: ["Leer antes de dormir me relaja.", "noun", "Pregúntate: ¿qué me relaja?", "El infinitivo es el sujeto: funciona como sustantivo.", "Leer antes de dormir"],
    },
    {
      en: ["We left early to catch the first bus.", "adverb", "Ask: why did we leave early?", "The infinitive phrase tells why, so it works as an adverb.", "to catch the first bus"],
      es: ["Mi hermana aprendió inglés viendo dibujos animados.", "adverb", "Pregúntate: ¿cómo aprendió inglés?", "El gerundio dice cómo aprendió: funciona como adverbio.", "viendo dibujos animados"],
    },
    {
      en: ["The cookies, baked this morning, are still warm.", "adjective", "Ask: which cookies?", "The participle phrase describes the cookies, so it works as an adjective.", "baked this morning"],
      es: ["Los aficionados, emocionados, aplaudieron al equipo.", "adjective", "Pregúntate: ¿cómo estaban los aficionados?", "El participio describe a los aficionados: funciona como adjetivo.", "emocionados"],
    },
    {
      en: ["Grandpa came over to fix the sink.", "adverb", "Ask: why did Grandpa come over?", "The infinitive phrase tells why, so it works as an adverb.", "to fix the sink"],
      es: ["Su sueño es viajar por el mundo.", "noun", "Pregúntate: ¿cuál es su sueño?", "El infinitivo nombra el sueño: funciona como sustantivo.", "viajar por el mundo"],
    },
  ],
);

const VERBALS = skill(
  { id: "e.verbals", grade: "8", title: { en: "Verbals", es: "Formas no personales del verbo" }, standard: "L.8.1a", prereqs: ["e.phrases.clauses"] },
  [
    {
      ...VERBAL_TYPE,
      ask: { en: "What kind of verbal is {t}?", es: "¿Qué forma no personal del verbo es {t}?" },
      hints: {
        en: ["A verbal is a verb form doing the job of another part of speech. What job does it do here?", "A gerund ends in -ing and works as a noun. A participle (often ending in -ing or -ed) describes a noun. An infinitive is “to” plus a verb."],
        es: ["Las formas no personales no dicen quién hace la acción. Fíjate en la terminación.", "El infinitivo termina en -ar, -er o -ir. El gerundio termina en -ando o -iendo. El participio termina en -ado o -ido, o es irregular, como escrito o roto."],
      },
      seconds: 15,
    },
    {
      ...VERBAL_JOB,
      ask: { en: "What job does {t} do in this sentence?", es: "¿Qué función cumple {t} en esta oración?" },
      hints: {
        en: ["Ask what question the verbal answers in this sentence.", "Gerunds work as nouns and participles as adjectives. An infinitive can be any of the three: a noun (what?), an adjective (which one?), or an adverb (why? how?)."],
        es: ["Pregúntate a qué pregunta responde la forma verbal en esta oración.", "En español, el infinitivo funciona como sustantivo (¿qué?), el participio como adjetivo (¿cómo es?) y el gerundio como adverbio (¿cómo?, ¿de qué manera?)."],
      },
      seconds: 20,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.verb.moods — level 1: name the mood (English: indicative, imperative, interrogative, conditional,
// subjunctive; four are shown. Spanish: indicativo, subjuntivo, imperativo); level 2: form the verb.
// Spanish level 2 targets the real Spanish errors: "si sería" for "si fuera", "quiero que vienes".

type Mood = "indicative" | "imperative" | "interrogative" | "conditional" | "subjunctive";
const MOOD_NAME = cats<Mood>(
  {
    en: { indicative: "Indicative", imperative: "Imperative", interrogative: "Interrogative", conditional: "Conditional", subjunctive: "Subjunctive" },
    es: { indicative: "Indicativo", subjunctive: "Subjuntivo", imperative: "Imperativo" },
  },
  { en: ["indicative", "imperative", "interrogative", "conditional", "subjunctive"], es: ["indicative", "subjunctive", "imperative"] },
  [
    {
      en: ["The library opens at nine.", "indicative", "Is it stating a fact?", "It states a fact, so it is indicative."],
      es: ["La biblioteca abre a las nueve.", "indicative", "¿Presenta algo como un hecho real?", "“Abre” presenta un hecho: está en indicativo.", "abre"],
    },
    {
      en: ["Close the door, please.", "imperative", "Is someone being told to do something?", "It gives a command, so it is imperative."],
      es: ["Cierra la puerta, por favor.", "imperative", "¿Le dice a alguien que haga algo?", "“Cierra” da una orden: está en imperativo.", "Cierra"],
    },
    {
      en: ["Did you finish the science project?", "interrogative", "Look at the end mark.", "It asks a question, so it is interrogative."],
      es: ["Ojalá llueva mañana.", "subjunctive", "“Ojalá” expresa un deseo.", "“Llueva” expresa un deseo: está en subjuntivo.", "llueva"],
    },
    {
      en: ["With more time, I would visit every museum in the city.", "conditional", "Look for “would.” Is this something real, or something that might happen?", "“Would visit” tells what might happen: conditional."],
      es: ["Quiero que vengas a mi fiesta.", "subjunctive", "Lo que se quiere todavía no es un hecho.", "“Vengas” va después de “quiero que”: está en subjuntivo.", "vengas"],
    },
    {
      en: ["I wish I were taller.", "subjunctive", "Look at “were” after “I.” Is this real, or a wish?", "“I were” expresses a wish, so it is subjunctive."],
      es: ["Mía toca el violonchelo en la orquesta de la escuela.", "indicative", "¿Presenta algo como un hecho real?", "“Toca” presenta un hecho: está en indicativo.", "toca"],
    },
    {
      en: ["Mia plays the cello in the school orchestra.", "indicative", "Is it stating a fact?", "It states a fact, so it is indicative."],
      es: ["Apaga la luz al salir.", "imperative", "¿Le dice a alguien que haga algo?", "“Apaga” da una orden: está en imperativo.", "Apaga"],
    },
    {
      en: ["Please hand in your permission slips by Friday.", "imperative", "Is someone being told to do something?", "It gives a command, so it is imperative."],
      es: ["Es importante que llegues temprano.", "subjunctive", "Después de “es importante que”, lo que sigue todavía no es un hecho.", "“Llegues” está en subjuntivo.", "llegues"],
    },
    {
      en: ["Where did you put the scissors?", "interrogative", "Look at the end mark.", "It asks a question, so it is interrogative."],
      es: ["Saturno es el sexto planeta desde el Sol.", "indicative", "¿Presenta algo como un hecho real?", "“Es” presenta un hecho: está en indicativo.", "es"],
    },
    {
      en: ["A bigger tent would keep us drier.", "conditional", "Look for “would.” Do they have the bigger tent?", "“Would keep” tells what might happen: conditional."],
      es: ["Siéntate aquí, junto a la ventana.", "imperative", "¿Le dice a alguien que haga algo?", "“Siéntate” da una orden: está en imperativo.", "Siéntate"],
    },
    {
      en: ["The coach insists that every player be on time.", "subjunctive", "Look at “be” after “every player.” It is not “is.”", "After “insists that,” the base form “be” is subjunctive."],
      es: ["Dudo que el partido empiece a tiempo.", "subjunctive", "“Dudo que” expresa una duda.", "“Empiece” está en subjuntivo.", "empiece"],
    },
    {
      en: ["Saturn is the sixth planet from the sun.", "indicative", "Is it stating a fact?", "It states a fact, so it is indicative."],
      es: ["Mi hermano estudia piano todos los días.", "indicative", "¿Presenta algo como un hecho real?", "“Estudia” presenta un hecho: está en indicativo.", "estudia"],
    },
    {
      en: ["Turn off the lights when you leave.", "imperative", "Is someone being told to do something?", "It gives a command, so it is imperative."],
      es: ["Ven a ver el arcoíris.", "imperative", "¿Le dice a alguien que haga algo?", "“Ven” da una orden: está en imperativo.", "Ven"],
    },
    {
      en: ["Have you ever seen a shooting star?", "interrogative", "Look at the end mark.", "It asks a question, so it is interrogative."],
      es: ["La maestra pidió que trajéramos tijeras.", "subjunctive", "Lo que pidió la maestra todavía no es un hecho.", "“Trajéramos” está en pretérito de subjuntivo.", "trajéramos"],
    },
    {
      en: ["We would need a bigger table for the whole family.", "conditional", "Look for “would.” Is this about something that might be?", "“Would need” tells what might happen: conditional."],
      es: ["Ayer vimos una estrella fugaz.", "indicative", "¿Presenta algo como un hecho real?", "“Vimos” presenta un hecho: está en indicativo.", "vimos"],
    },
    {
      en: ["It is important that she arrive early.", "subjunctive", "Look at “arrive.” Why is it not “arrives”?", "After “it is important that,” the base form “arrive” is subjunctive."],
      es: ["Escucha con atención las instrucciones.", "imperative", "¿Le dice a alguien que haga algo?", "“Escucha” da una orden: está en imperativo.", "Escucha"],
    },
    {
      en: ["The teacher suggested that he study with a partner.", "subjunctive", "Look at “study.” Why is it not “studies”?", "After “suggested that,” the base form “study” is subjunctive."],
      es: ["Espero que te guste el regalo.", "subjunctive", "Lo que se espera todavía no es un hecho.", "“Guste” está en subjuntivo.", "guste"],
    },
  ],
);

const MOOD_FORMS: Bi<Entry>[] = [
  {
    en: ["If I ___ you, I would study for the test.", "were", [["was", "indicative-for-subjunctive"], ["am", "present-for-contrary-to-fact"]], "The sentence imagines something that is not true: you are not the other person.", "For a situation contrary to fact, formal English uses “were,” even after “I.”"],
    es: ["Si yo ___ tú, estudiaría para el examen.", "fuera", [["sería", "conditional-in-si-clause"], ["soy", "present-for-contrary-to-fact"]], "La oración imagina algo que no es real: no eres la otra persona.", "Después de “si”, para algo irreal va el pretérito de subjuntivo: “si yo fuera”."],
  },
  {
    en: ["The doctor recommends that Ana ___ more water.", "drink", [["drinks", "indicative-for-subjunctive"], ["drank", "wrong-tense"]], "After “recommends that,” the verb stays in its base form.", "The subjunctive uses the base form: “that Ana drink.”"],
    es: ["Quiero que ___ a mi fiesta.", "vengas", [["vienes", "indicative-for-subjunctive"], ["vendrás", "indicative-for-subjunctive"]], "Lo que se quiere todavía no es un hecho.", "Después de “quiero que” va el subjuntivo."],
  },
  {
    en: ["I wish it ___ summer already.", "were", [["is", "indicative-for-subjunctive"], ["will be", "wrong-tense"]], "A wish is about something that is not true right now.", "After “I wish,” formal English uses “were.”"],
    es: ["Ojalá que mañana ___ sol.", "haga", [["hace", "indicative-for-subjunctive"], ["hará", "indicative-for-subjunctive"]], "“Ojalá” expresa un deseo.", "Después de “ojalá” va el subjuntivo."],
  },
  {
    en: ["If we had a bigger car, we ___ take the whole team.", "could", [["can", "indicative-for-conditional"], ["will", "indicative-for-conditional"]], "The sentence imagines a car you do not have.", "An imagined result uses a conditional helping verb such as “could” or “would.”"],
    es: ["Si tuviéramos un carro más grande, ___ llevar a todo el equipo.", "podríamos", [["podemos", "indicative-for-conditional"], ["podremos", "indicative-for-conditional"]], "La oración imagina un carro que no tienen.", "El resultado de una condición imaginada va en condicional."],
  },
  {
    en: ["It is essential that every student ___ a helmet on the trip.", "wear", [["wears", "indicative-for-subjunctive"], ["wore", "wrong-tense"]], "After “it is essential that,” the verb stays in its base form.", "The subjunctive uses the base form: “that every student wear.”"],
    es: ["Es importante que todos ___ casco en la excursión.", "usen", [["usan", "indicative-for-subjunctive"], ["usarán", "indicative-for-subjunctive"]], "Después de “es importante que”, lo que sigue todavía no es un hecho.", "Después de “es importante que” va el subjuntivo."],
  },
  {
    en: ["If Leo ___ here, he would know the answer.", "were", [["was", "indicative-for-subjunctive"], ["is", "present-for-contrary-to-fact"]], "Leo is not here; the sentence imagines it.", "For a situation contrary to fact, formal English uses “were.”"],
    es: ["Si Leo ___ aquí, sabría la respuesta.", "estuviera", [["estaría", "conditional-in-si-clause"], ["está", "present-for-contrary-to-fact"]], "Leo no está; la oración lo imagina.", "Después de “si”, para algo irreal va el pretérito de subjuntivo, nunca el condicional."],
  },
  {
    en: ["With a map, we ___ have found the trail faster.", "would", [["will", "indicative-for-conditional"], ["did", "indicative-for-conditional"]], "They did not have a map; the sentence imagines a different past.", "An imagined past result uses “would have.”"],
    es: ["Con un mapa, ___ encontrado el sendero más rápido.", "habríamos", [["hemos", "indicative-for-conditional"], ["habremos", "indicative-for-conditional"]], "No tenían mapa; la oración imagina un pasado distinto.", "Un resultado imaginado en el pasado va en condicional compuesto."],
  },
  {
    en: ["The rules require that each team ___ five players.", "have", [["has", "indicative-for-subjunctive"], ["had", "wrong-tense"]], "After “require that,” the verb stays in its base form.", "The subjunctive uses the base form: “that each team have.”"],
    es: ["Cuando ___ a casa, llámame.", "llegues", [["llegas", "indicative-for-subjunctive"], ["llegarás", "indicative-for-subjunctive"]], "La llegada todavía no pasa: es futura.", "Con “cuando” y una acción futura va el subjuntivo."],
  },
  {
    en: ["I would buy a telescope if I ___ enough money.", "had", [["have", "present-for-contrary-to-fact"], ["would have", "double-conditional"]], "The speaker does not have the money; the sentence imagines it.", "The “if” part of an imagined situation uses the past form, and “would” goes only in the result."],
    es: ["Compraría un telescopio si ___ suficiente dinero.", "tuviera", [["tendría", "conditional-in-si-clause"], ["tengo", "present-for-contrary-to-fact"]], "Quien habla no tiene el dinero; la oración lo imagina.", "Después de “si” va el pretérito de subjuntivo; el condicional va solo en el resultado."],
  },
  {
    en: ["She asked that the meeting ___ moved to Tuesday.", "be", [["is", "indicative-for-subjunctive"], ["was", "wrong-tense"]], "After “asked that,” the verb stays in its base form.", "The subjunctive uses the base form: “that the meeting be moved.”"],
    es: ["La maestra pidió que ___ la tarea a tiempo.", "entregáramos", [["entregamos", "indicative-for-subjunctive"], ["entregaríamos", "conditional-for-subjunctive"]], "“Pidió” está en pasado, y lo que se pide todavía no es un hecho.", "Después de “pidió que” va el pretérito de subjuntivo."],
  },
  {
    en: ["If my dog ___ talk, he would ask for treats all day.", "could", [["can", "present-for-contrary-to-fact"], ["will", "indicative-for-conditional"]], "Dogs cannot talk; the sentence imagines it.", "The “if” part of an imagined situation uses a past form."],
    es: ["Si mi perro ___ hablar, pediría premios todo el día.", "pudiera", [["podría", "conditional-in-si-clause"], ["puede", "present-for-contrary-to-fact"]], "Los perros no hablan; la oración lo imagina.", "Después de “si”, para algo irreal va el pretérito de subjuntivo."],
  },
  {
    en: ["We ___ go to the beach if it were warmer.", "would", [["will", "indicative-for-conditional"], ["are going to", "indicative-for-conditional"]], "It is not warm; the sentence imagines it.", "The result of an imagined situation uses “would.”"],
    es: ["Iríamos a la playa si ___ más calor.", "hiciera", [["haría", "conditional-in-si-clause"], ["hace", "present-for-contrary-to-fact"]], "No hace calor; la oración lo imagina.", "Después de “si”, para algo irreal va el pretérito de subjuntivo."],
  },
  {
    en: ["I suggest that he ___ early tomorrow.", "leave", [["leaves", "indicative-for-subjunctive"], ["left", "wrong-tense"]], "After “suggest that,” the verb stays in its base form.", "The subjunctive uses the base form: “that he leave.”"],
    es: ["Te sugiero que ___ temprano mañana.", "salgas", [["sales", "indicative-for-subjunctive"], ["saldrías", "conditional-for-subjunctive"]], "Lo que se sugiere todavía no es un hecho.", "Después de “sugiero que” va el subjuntivo."],
  },
  {
    en: ["Kai talks as if he ___ the boss.", "were", [["is", "indicative-for-subjunctive"], ["will be", "wrong-tense"]], "Kai is not the boss; “as if” imagines it.", "After “as if” for something untrue, formal English uses “were.”"],
    es: ["Kai habla como si ___ el jefe.", "fuera", [["es", "indicative-for-subjunctive"], ["sería", "conditional-for-subjunctive"]], "Kai no es el jefe; “como si” lo imagina.", "Después de “como si” va el pretérito de subjuntivo."],
  },
  {
    en: ["If I ___ known about the party, I would have come.", "had", [["would have", "double-conditional"], ["have", "wrong-tense"]], "The speaker did not know; the sentence imagines a different past.", "The “if” part uses “had,” and “would have” goes only in the result."],
    es: ["Si ___ sabido lo de la fiesta, habría venido.", "hubiera", [["habría", "conditional-in-si-clause"], ["he", "wrong-tense"]], "Quien habla no lo sabía; la oración imagina un pasado distinto.", "Después de “si” va el pluscuamperfecto de subjuntivo: “si hubiera sabido”."],
  },
];

const VERB_MOODS = skill(
  { id: "e.verb.moods", grade: "8", title: { en: "Verb moods", es: "Modos verbales" }, standard: "L.8.1c", prereqs: ["e.sentence.types"] },
  [
    {
      ...MOOD_NAME,
      ask: { en: "What mood is this sentence in?", es: "¿En qué modo está el verbo {t}?" },
      hints: {
        en: ["What is the sentence doing: stating a fact, giving a command, asking, imagining a result, or wishing?", "Indicative states facts. Imperative gives commands. Interrogative asks. Conditional uses “would” or “could” for what might happen. Subjunctive expresses wishes, demands, or things contrary to fact, like “If I were…” or “I suggest that he be…”"],
        es: ["¿El verbo presenta algo como real, como un deseo o una duda, o como una orden?", "El indicativo presenta hechos. El subjuntivo expresa deseos, dudas o posibilidades (ojalá llueva, quiero que vengas). El imperativo da órdenes (ven, siéntate)."],
      },
      seconds: 15,
    },
    {
      bank: MOOD_FORMS,
      ask: CHOOSE,
      hints: {
        en: ["Is the sentence about something real, or about a wish, a demand, or an imagined situation?", "For wishes and situations contrary to fact, use “were” or the past form after “if.” After “suggest that” or “require that,” use the base form. For an imagined result, use “would” or “could.”"],
        es: ["¿La oración habla de algo real, o de un deseo, una petición o una situación imaginada?", "Para deseos, peticiones y dudas va el subjuntivo (quiero que vengas). Después de “si” en una situación irreal va el pretérito de subjuntivo (si fuera), nunca el condicional (si sería). El resultado imaginado va en condicional (estudiaría)."],
      },
      seconds: 15,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.ellipsis.dash — level 1: the mark that shows the pause. English: an ellipsis for hesitation or
// trailing off, a dash for a sudden break or interruption. Spanish works differently: los puntos
// suspensivos mark doubt, suspense and interruptions, go right after the word, and take no extra period;
// the raya opens each line of dialogue and sets off the narrator's words. Level 2: marking words left
// out of a quotation (Spanish: […] between brackets).

const PAUSES: Bi<Entry>[] = [
  {
    en: ["Show that the speaker trails off, unsure what to say.", "“Well… I guess we could try again.”", [["“Well—I guess we could try again.”", "dash-for-hesitation"], ["“Well, I guess we could try again.”", "comma-for-hesitation"]], "Trailing off is a slow, unsure pause.", "An ellipsis (…) shows hesitation or a voice trailing off."],
    es: ["Muestra que quien habla duda.", "—Bueno… creo que podemos intentarlo otra vez.", [["—Bueno, creo que podemos intentarlo otra vez.", "comma-for-hesitation"], ["—Bueno … creo que podemos intentarlo otra vez.", "space-before-ellipsis"]], "La duda es una pausa lenta e insegura.", "Los puntos suspensivos muestran duda y van pegados a la palabra anterior."],
  },
  {
    en: ["Show that the speaker is suddenly cut off.", "“I left my backpack on the—” The bus doors slammed shut.", [["“I left my backpack on the…” The bus doors slammed shut.", "ellipsis-for-sudden-break"], ["“I left my backpack on the,” The bus doors slammed shut.", "comma-for-strong-break"]], "Being cut off is sudden and sharp.", "A dash shows a sudden break or interruption."],
    es: ["Muestra que alguien interrumpe a quien habla.", "—¿Me prestas tu…? —No —dijo Leo.", [["—¿Me prestas tu—? —No —dijo Leo.", "dash-for-interruption"], ["—¿Me prestas tu,? —No —dijo Leo.", "comma-for-hesitation"]], "En español, una frase interrumpida queda en suspenso.", "En español, la interrupción se marca con puntos suspensivos, no con raya."],
  },
  {
    en: ["Show a sudden change of thought in the middle of the sentence.", "We could go to the park—no, the museum is better.", [["We could go to the park… no, the museum is better.", "ellipsis-for-sudden-break"], ["We could go to the park, no, the museum is better.", "comma-for-strong-break"]], "The writer changes direction all at once.", "A dash marks a sudden shift in thought."],
    es: ["Muestra que quien habla deja la frase en suspenso.", "—Si tuviéramos más tiempo…", [["—Si tuviéramos más tiempo….", "four-dots"], ["—Si tuviéramos más tiempo—", "dash-for-interruption"]], "La frase queda sin terminar, abierta.", "Los puntos suspensivos dejan la frase en suspenso, y después de ellos no se pone otro punto."],
  },
  {
    en: ["Show a long, nervous pause before the answer.", "“The answer is… forty-two?”", [["“The answer is—forty-two?”", "dash-for-hesitation"], ["“The answer is, forty-two?”", "comma-for-hesitation"]], "A nervous pause is slow and unsure.", "An ellipsis shows the hesitation."],
    es: ["Muestra una pausa larga y nerviosa antes de la respuesta.", "—La respuesta es… ¿cuarenta y dos?", [["—La respuesta es —¿cuarenta y dos?", "dash-for-interruption"], ["—La respuesta es, ¿cuarenta y dos?", "comma-for-hesitation"]], "Una pausa nerviosa es lenta e insegura.", "Los puntos suspensivos muestran la duda."],
  },
  {
    en: ["Show that the speaker trails off, thinking.", "“If only we had more time…”", [["“If only we had more time—”", "dash-for-hesitation"], ["“If only we had more time,”", "comma-for-hesitation"]], "The thought fades out slowly.", "An ellipsis shows a voice trailing off."],
    es: ["Escribe el diálogo con la raya que lo introduce y la que marca las palabras del narrador.", "—Ya llegué —dijo Ana.", [["“Ya llegué” —dijo Ana.", "missing-dialogue-dash"], ["—Ya llegué, —dijo Ana.", "comma-before-dash"]], "En español, cada intervención del diálogo empieza con raya.", "La raya abre lo que dice el personaje y otra raya introduce las palabras del narrador, sin coma antes."],
  },
  {
    en: ["Show that someone interrupts the speaker.", "“Can I borrow your—” “No,” said Leo.", [["“Can I borrow your…” “No,” said Leo.", "ellipsis-for-sudden-break"], ["“Can I borrow your,” “No,” said Leo.", "comma-for-strong-break"]], "An interruption cuts the words off sharply.", "A dash shows the interruption."],
    es: ["Muestra que algo interrumpe a quien habla.", "—Todos, por favor, tomen su… De pronto, una bandeja cayó al piso.", [["—Todos, por favor, tomen su— De pronto, una bandeja cayó al piso.", "dash-for-interruption"], ["—Todos, por favor, tomen su…. De pronto, una bandeja cayó al piso.", "four-dots"]], "En español, una frase interrumpida queda en suspenso.", "Los puntos suspensivos marcan la interrupción, sin punto extra."],
  },
  {
    en: ["Show a sharp break before an important point.", "The answer was simple—practice every day.", [["The answer was simple… practice every day.", "ellipsis-for-sudden-break"], ["The answer was simple, practice every day.", "comma-for-strong-break"]], "The break is sharp, to make the point stand out.", "A dash sets off the point with a strong break."],
    es: ["Muestra que quien habla intenta recordar.", "—Se llamaba… Rosa, creo.", [["—Se llamaba —Rosa, creo.", "dash-for-interruption"], ["—Se llamaba … Rosa, creo.", "space-before-ellipsis"]], "Recordar es hacer una pausa de duda.", "Los puntos suspensivos muestran la duda y van pegados a la palabra anterior."],
  },
  {
    en: ["Show that the speaker is unsure and stops.", "“I'm not sure if I can…”", [["“I'm not sure if I can—”", "dash-for-hesitation"], ["“I'm not sure if I can,”", "comma-for-hesitation"]], "The speaker fades out, unsure.", "An ellipsis shows the voice trailing off."],
    es: ["Escribe el diálogo con la raya que marca las palabras del narrador.", "—No encuentro mis llaves —murmuró Omar.", [["—No encuentro mis llaves, —murmuró Omar.", "comma-before-dash"], ["No encuentro mis llaves —murmuró Omar.", "missing-dialogue-dash"]], "En español, cada intervención del diálogo empieza con raya.", "La raya abre lo que dice Omar y otra raya introduce las palabras del narrador, sin coma antes."],
  },
  {
    en: ["Show a sudden interruption by a loud noise.", "“Everyone, please take your—” Crash. A tray hit the floor.", [["“Everyone, please take your…” Crash. A tray hit the floor.", "ellipsis-for-sudden-break"], ["“Everyone, please take your,” Crash. A tray hit the floor.", "comma-for-strong-break"]], "The noise cuts the sentence off sharply.", "A dash shows the sudden interruption."],
    es: ["Muestra que quien habla se va quedando dormido.", "—Solo cinco minutos más…", [["—Solo cinco minutos más….", "four-dots"], ["—Solo cinco minutos más …", "space-before-ellipsis"]], "La voz se apaga poco a poco.", "Los puntos suspensivos van pegados a la palabra anterior y no llevan otro punto."],
  },
  {
    en: ["Show the speaker pausing to remember.", "“Her name was… Rosa, I think.”", [["“Her name was—Rosa, I think.”", "dash-for-hesitation"], ["“Her name was, Rosa, I think.”", "comma-for-hesitation"]], "Remembering takes a slow, unsure pause.", "An ellipsis shows the hesitation."],
    es: ["Muestra que alguien interrumpe una pregunta.", "—¿Por qué tú…? Mamá levantó la mano.", [["—¿Por qué tú—? Mamá levantó la mano.", "dash-for-interruption"], ["—¿Por qué tú,? Mamá levantó la mano.", "comma-for-hesitation"]], "En español, una frase interrumpida queda en suspenso.", "Los puntos suspensivos marcan la interrupción; el signo de cierre va después."],
  },
  {
    en: ["Show a sudden change of plan.", "Let's paint the fence blue—actually, green would look better.", [["Let's paint the fence blue… actually, green would look better.", "ellipsis-for-sudden-break"], ["Let's paint the fence blue, actually, green would look better.", "comma-for-strong-break"]], "The plan changes all at once.", "A dash marks the sudden change."],
    es: ["Muestra que una lista podría seguir.", "Compramos manzanas, peras, uvas…", [["Compramos manzanas, peras, uvas….", "four-dots"], ["Compramos manzanas, peras, uvas—", "dash-for-interruption"]], "La lista queda abierta, como con un “etcétera”.", "Los puntos suspensivos al final de una enumeración la dejan abierta."],
  },
  {
    en: ["Show that the speaker drifts off, falling asleep.", "“Just five more minutes…”", [["“Just five more minutes—”", "dash-for-hesitation"], ["“Just five more minutes,”", "comma-for-hesitation"]], "The voice fades out slowly.", "An ellipsis shows the voice trailing off."],
    es: ["Escribe el diálogo con la raya que lo introduce.", "—¿Vienes a la feria? —preguntó Lucía.", [["¿Vienes a la feria? —preguntó Lucía.", "missing-dialogue-dash"], ["—¿Vienes a la feria?, —preguntó Lucía.", "comma-before-dash"]], "En español, cada intervención del diálogo empieza con raya.", "La raya abre la pregunta y otra raya introduce las palabras del narrador, sin coma."],
  },
  {
    en: ["Show that a question is cut off suddenly.", "“Why did you—” Mom held up her hand.", [["“Why did you…” Mom held up her hand.", "ellipsis-for-sudden-break"], ["“Why did you,” Mom held up her hand.", "comma-for-strong-break"]], "The question stops sharply in the middle.", "A dash shows the question was cut off."],
    es: ["Muestra suspenso antes de revelar algo.", "Abrí la caja despacio y adentro había… un cachorro.", [["Abrí la caja despacio y adentro había —un cachorro.", "dash-for-interruption"], ["Abrí la caja despacio y adentro había, un cachorro.", "comma-for-hesitation"]], "El suspenso se crea con una pausa que hace esperar.", "Los puntos suspensivos crean suspenso antes de la sorpresa."],
  },
  {
    en: ["Show a sudden, sharp break before a warning.", "Step back—the paint is still wet.", [["Step back… the paint is still wet.", "ellipsis-for-sudden-break"], ["Step back, the paint is still wet.", "comma-for-strong-break"]], "A warning needs a sharp break.", "A dash makes the sharp break; a comma alone cannot join these two sentences."],
    es: ["Muestra que quien habla duda antes de admitir algo.", "—Yo… rompí el florero.", [["—Yo, rompí el florero.", "comma-for-hesitation"], ["—Yo … rompí el florero.", "space-before-ellipsis"]], "Antes de admitir algo difícil, se duda.", "Los puntos suspensivos muestran la duda y van pegados a la palabra anterior."],
  },
];

const OMISSIONS: Bi<Entry>[] = [
  {
    en: ["Original: “The museum, which opened in 1910, is the oldest in the state.”", "“The museum … is the oldest in the state.”", [["“The museum is the oldest in the state.”", "missing-ellipsis"], ["“The museum, which opened in 1910 …”", "cut-key-words"]], "Which words can go without changing the main point?", "“Which opened in 1910” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “El museo, que abrió en 1910, es el más antiguo del estado”.", "“El museo […] es el más antiguo del estado”.", [["“El museo es el más antiguo del estado”.", "missing-ellipsis"], ["“El museo… es el más antiguo del estado”.", "ellipsis-without-brackets"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Que abrió en 1910” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “Bees, like many other insects, help flowers make seeds.”", "“Bees … help flowers make seeds.”", [["“Bees help flowers make seeds.”", "missing-ellipsis"], ["“Bees, like many other insects …”", "cut-key-words"]], "Which words can go without changing the main point?", "“Like many other insects” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “Las abejas, como muchos otros insectos, ayudan a las flores a producir semillas”.", "“Las abejas […] ayudan a las flores a producir semillas”.", [["“Las abejas ayudan a las flores a producir semillas”.", "missing-ellipsis"], ["“Las abejas… ayudan a las flores a producir semillas”.", "ellipsis-without-brackets"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Como muchos otros insectos” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “Our team, after months of hard practice, won the championship.”", "“Our team … won the championship.”", [["“Our team won the championship.”", "missing-ellipsis"], ["“Our team, after months of hard practice …”", "cut-key-words"]], "Which words can go without changing the main point?", "“After months of hard practice” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “Nuestro equipo, después de meses de práctica, ganó el campeonato”.", "“Nuestro equipo […] ganó el campeonato”.", [["“Nuestro equipo ganó el campeonato”.", "missing-ellipsis"], ["“Nuestro equipo, después de meses de práctica […]”.", "cut-key-words"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Después de meses de práctica” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “The old bridge, built of wood, is not safe for heavy trucks.”", "“The old bridge … is not safe for heavy trucks.”", [["“The old bridge … is safe for heavy trucks.”", "changed-meaning"], ["“The old bridge is not safe for heavy trucks.”", "missing-ellipsis"]], "Which small word must stay, because leaving it out flips the meaning?", "“Built of wood” can go. “Not” must stay."],
    es: ["Texto original: “El viejo puente, hecho de madera, no es seguro para camiones pesados”.", "“El viejo puente […] no es seguro para camiones pesados”.", [["“El viejo puente […] es seguro para camiones pesados”.", "changed-meaning"], ["“El viejo puente… no es seguro para camiones pesados”.", "ellipsis-without-brackets"]], "¿Qué palabra pequeña debe quedarse, porque quitarla cambia el sentido?", "“Hecho de madera” se puede quitar. “No” debe quedarse."],
  },
  {
    en: ["Original: “Sea turtles, which can live for decades, lay their eggs on sandy beaches.”", "“Sea turtles … lay their eggs on sandy beaches.”", [["“Sea turtles lay their eggs on sandy beaches.”", "missing-ellipsis"], ["“Sea turtles, which can live for decades …”", "cut-key-words"]], "Which words can go without changing the main point?", "“Which can live for decades” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “Las tortugas marinas, que pueden vivir décadas, ponen sus huevos en playas de arena”.", "“Las tortugas marinas […] ponen sus huevos en playas de arena”.", [["“Las tortugas marinas ponen sus huevos en playas de arena”.", "missing-ellipsis"], ["“Las tortugas marinas… ponen sus huevos en playas de arena”.", "ellipsis-without-brackets"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Que pueden vivir décadas” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “The library, because of the holiday, will not be open on Monday.”", "“The library … will not be open on Monday.”", [["“The library … will be open on Monday.”", "changed-meaning"], ["“The library will not be open on Monday.”", "missing-ellipsis"]], "Which small word must stay, because leaving it out flips the meaning?", "“Because of the holiday” can go. “Not” must stay."],
    es: ["Texto original: “La biblioteca, por el día festivo, no abrirá el lunes”.", "“La biblioteca […] no abrirá el lunes”.", [["“La biblioteca […] abrirá el lunes”.", "changed-meaning"], ["“La biblioteca no abrirá el lunes”.", "missing-ellipsis"]], "¿Qué palabra pequeña debe quedarse, porque quitarla cambia el sentido?", "“Por el día festivo” se puede quitar. “No” debe quedarse."],
  },
  {
    en: ["Original: “The new park, the mayor said on Tuesday, will open in May.”", "“The new park … will open in May.”", [["“The new park will open in May.”", "missing-ellipsis"], ["“The new park, the mayor said on Tuesday …”", "cut-key-words"]], "Which words can go without changing the main point?", "“The mayor said on Tuesday” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “El nuevo parque, dijo la alcaldesa el martes, abrirá en mayo”.", "“El nuevo parque […] abrirá en mayo”.", [["“El nuevo parque abrirá en mayo”.", "missing-ellipsis"], ["“El nuevo parque, dijo la alcaldesa el martes […]”.", "cut-key-words"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Dijo la alcaldesa el martes” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “Exercise, even a short daily walk, can improve your mood.”", "“Exercise … can improve your mood.”", [["“Exercise can improve your mood.”", "missing-ellipsis"], ["“Exercise, even a short daily walk …”", "cut-key-words"]], "Which words can go without changing the main point?", "“Even a short daily walk” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “El ejercicio, incluso una caminata corta diaria, puede mejorar el ánimo”.", "“El ejercicio […] puede mejorar el ánimo”.", [["“El ejercicio… puede mejorar el ánimo”.", "ellipsis-without-brackets"], ["“El ejercicio, incluso una caminata corta diaria […]”.", "cut-key-words"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Incluso una caminata corta diaria” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “The volcano, scientists believe, is unlikely to erupt this year.”", "“The volcano … is unlikely to erupt this year.”", [["“The volcano … is likely to erupt this year.”", "changed-meaning"], ["“The volcano is unlikely to erupt this year.”", "missing-ellipsis"]], "Which part of a word must stay, because leaving it out flips the meaning?", "“Scientists believe” can go. “Unlikely” must stay whole."],
    es: ["Texto original: “El volcán, según los científicos, probablemente no hará erupción este año”.", "“El volcán […] probablemente no hará erupción este año”.", [["“El volcán […] probablemente hará erupción este año”.", "changed-meaning"], ["“El volcán probablemente no hará erupción este año”.", "missing-ellipsis"]], "¿Qué palabra pequeña debe quedarse, porque quitarla cambia el sentido?", "“Según los científicos” se puede quitar. “No” debe quedarse."],
  },
  {
    en: ["Original: “Our class, with help from parents, planted forty trees.”", "“Our class … planted forty trees.”", [["“Our class planted forty trees.”", "missing-ellipsis"], ["“Our class, with help from parents …”", "cut-key-words"]], "Which words can go without changing the main point?", "“With help from parents” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “Nuestra clase, con ayuda de las familias, plantó cuarenta árboles”.", "“Nuestra clase […] plantó cuarenta árboles”.", [["“Nuestra clase plantó cuarenta árboles”.", "missing-ellipsis"], ["“Nuestra clase… plantó cuarenta árboles”.", "ellipsis-without-brackets"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Con ayuda de las familias” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “The test, according to Ms. Kim, will cover only chapters one and two.”", "“The test … will cover only chapters one and two.”", [["“The test … will cover … chapters one and two.”", "changed-meaning"], ["“The test will cover only chapters one and two.”", "missing-ellipsis"]], "Which small word must stay, because leaving it out changes the meaning?", "“According to Ms. Kim” can go. “Only” must stay."],
    es: ["Texto original: “El examen, según la maestra Kim, incluirá solo los capítulos uno y dos”.", "“El examen […] incluirá solo los capítulos uno y dos”.", [["“El examen […] incluirá […] los capítulos uno y dos”.", "changed-meaning"], ["“El examen incluirá solo los capítulos uno y dos”.", "missing-ellipsis"]], "¿Qué palabra pequeña debe quedarse, porque quitarla cambia el sentido?", "“Según la maestra Kim” se puede quitar. “Solo” debe quedarse."],
  },
  {
    en: ["Original: “The play, which the students wrote themselves, was a big success.”", "“The play … was a big success.”", [["“The play was a big success.”", "missing-ellipsis"], ["“The play, which the students wrote themselves …”", "cut-key-words"]], "Which words can go without changing the main point?", "“Which the students wrote themselves” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “La obra, que escribieron los propios estudiantes, fue todo un éxito”.", "“La obra […] fue todo un éxito”.", [["“La obra fue todo un éxito”.", "missing-ellipsis"], ["“La obra, que escribieron los propios estudiantes […]”.", "cut-key-words"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Que escribieron los propios estudiantes” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “Penguins, though they cannot fly, are excellent swimmers.”", "“Penguins … are excellent swimmers.”", [["“Penguins are excellent swimmers.”", "missing-ellipsis"], ["“Penguins, though they cannot fly …”", "cut-key-words"]], "Which words can go without changing the main point?", "“Though they cannot fly” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “Los pingüinos, aunque no pueden volar, son excelentes nadadores”.", "“Los pingüinos […] son excelentes nadadores”.", [["“Los pingüinos… son excelentes nadadores”.", "ellipsis-without-brackets"], ["“Los pingüinos, aunque no pueden volar […]”.", "cut-key-words"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Aunque no pueden volar” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “The storm, forecasters warned, could bring more than a foot of snow.”", "“The storm … could bring more than a foot of snow.”", [["“The storm … could bring … a foot of snow.”", "changed-meaning"], ["“The storm could bring more than a foot of snow.”", "missing-ellipsis"]], "Which words must stay, because leaving them out changes the amount?", "“Forecasters warned” can go. “More than” must stay."],
    es: ["Texto original: “La tormenta, advirtieron los meteorólogos, podría dejar más de treinta centímetros de nieve”.", "“La tormenta […] podría dejar más de treinta centímetros de nieve”.", [["“La tormenta […] podría dejar […] treinta centímetros de nieve”.", "changed-meaning"], ["“La tormenta… podría dejar más de treinta centímetros de nieve”.", "ellipsis-without-brackets"]], "¿Qué palabras deben quedarse, porque quitarlas cambia la cantidad?", "“Advirtieron los meteorólogos” se puede quitar. “Más de” debe quedarse."],
  },
];

const ELLIPSIS_DASH = skill(
  { id: "e.ellipsis.dash", grade: "8", title: { en: "Ellipses and dashes", es: "Puntos suspensivos y raya" }, standard: "L.8.2a", prereqs: ["e.nonrestrictive"] },
  [
    {
      bank: PAUSES,
      ask: { en: "Which sentence uses punctuation to show this?", es: "¿Qué opción usa la puntuación correcta para lograrlo?" },
      hints: {
        en: ["What kind of pause does the sentence need: slow and unsure, or sudden and sharp?", "An ellipsis (…) shows hesitation or a voice trailing off. A dash (—) shows a sudden break, a change of thought, or an interruption. A comma is only a brief, ordinary pause."],
        es: ["¿Qué hace falta: una pausa de duda, una interrupción, suspenso o marcar quién habla en un diálogo?", "Los puntos suspensivos (…) muestran duda, suspenso o una interrupción; van pegados a la palabra anterior y no llevan otro punto. La raya (—) abre cada intervención del diálogo y las palabras del narrador."],
      },
      seconds: 20,
    },
    {
      bank: OMISSIONS,
      ask: { en: "Which shortened quotation shows the omission correctly?", es: "¿Qué cita abreviada marca bien la parte omitida?" },
      hints: {
        en: ["Compare each choice with the original. What was left out?", "When you leave words out of a quotation, put an ellipsis where they were. Never leave out words that change or lose the main point."],
        es: ["Compara cada opción con el texto original. ¿Qué se quitó?", "Cuando quitas palabras de una cita, marca el lugar con puntos suspensivos entre corchetes: […]. Nunca quites palabras que cambien o borren la idea principal."],
      },
      seconds: 30,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.verb.shifts — revise a sentence that switches voice or mood for no reason (Spanish: correlación de
// tiempos y modos, "si tuviera… te ayudaría", and active-to-passive switches).

const VERB_SHIFTS: Bi<Entry>[] = [
  {
    en: ["First, mix the flour and sugar, and then the eggs should be added.", "First, mix the flour and sugar, and then add the eggs.", [["First, mix the flour and sugar, and then the eggs are added.", "still-shifts"], ["First, add the eggs, and then mix the flour and sugar.", "changed-meaning"]], "The sentence starts as a command, then switches to “should be added.”", "Keep both verbs as commands: “mix” and “add.”"],
    es: ["Si tuviera tiempo, te ayudo con la tarea.", "Si tuviera tiempo, te ayudaría con la tarea.", [["Si tuviera tiempo, te ayudaré con la tarea.", "still-shifts"], ["Tuve tiempo y te ayudé con la tarea.", "changed-meaning"]], "La primera parte imagina algo; la segunda suena a un hecho real.", "A una condición imaginada le corresponde un resultado en condicional: “te ayudaría”."],
  },
  {
    en: ["Maya wrote the speech, and it was delivered by her at the assembly.", "Maya wrote the speech, and she delivered it at the assembly.", [["Maya wrote the speech, and it was given by her at the assembly.", "still-shifts"], ["Someone else delivered Maya's speech at the assembly.", "changed-meaning"]], "The first part is active; the second switches to passive.", "Keep both parts active: Maya does both actions."],
    es: ["Primero lavamos los platos y después fueron secados por nosotros.", "Primero lavamos los platos y después los secamos.", [["Primero lavamos los platos y después se secaron.", "still-shifts"], ["Primero secamos los platos y nunca los lavamos.", "changed-meaning"]], "La primera parte está en voz activa; la segunda cambia a pasiva.", "Mantén la voz activa en las dos partes: “lavamos” y “secamos”."],
  },
  {
    en: ["If I were the coach, I will give everyone a turn.", "If I were the coach, I would give everyone a turn.", [["If I were the coach, I am giving everyone a turn.", "still-shifts"], ["I was the coach, and I gave everyone a turn.", "changed-meaning"]], "The first part imagines something; the second sounds like a real plan.", "An imagined condition takes an imagined result: “would give.”"],
    es: ["Mezcla la harina con el azúcar y luego los huevos deben ser agregados.", "Mezcla la harina con el azúcar y luego agrega los huevos.", [["Mezcla la harina con el azúcar y luego se agregan los huevos.", "still-shifts"], ["Agrega los huevos y no mezcles la harina.", "changed-meaning"]], "La oración empieza con una orden y luego cambia a “deben ser agregados”.", "Mantén las dos partes como órdenes: “mezcla” y “agrega”."],
  },
  {
    en: ["The students cleaned the park, and the trash was carried to the bins.", "The students cleaned the park and carried the trash to the bins.", [["The students cleaned the park, and the bins were filled with trash.", "still-shifts"], ["The students left the trash in the park.", "changed-meaning"]], "The students do both actions, but the second part hides them in the passive voice.", "Keep both verbs active, with the students as the doers."],
    es: ["Si Ana estudiara más, aprobará el examen.", "Si Ana estudiara más, aprobaría el examen.", [["Si Ana estudiara más, aprueba el examen.", "still-shifts"], ["Ana estudió más y aprobó el examen.", "changed-meaning"]], "La primera parte imagina algo; la segunda suena a un hecho seguro.", "A una condición imaginada le corresponde un resultado en condicional."],
  },
  {
    en: ["Please turn off your phones, and you should also stay seated.", "Please turn off your phones and stay seated.", [["Please turn off your phones, and you need to stay seated.", "still-shifts"], ["Please stay seated, but you may keep your phones on.", "changed-meaning"]], "The sentence starts with a command, then switches to a statement.", "Keep both as commands: “turn off” and “stay.”"],
    es: ["Maya escribió el discurso y fue leído por ella en la asamblea.", "Maya escribió el discurso y lo leyó en la asamblea.", [["Maya escribió el discurso y se leyó en la asamblea.", "still-shifts"], ["Otra persona leyó el discurso de Maya.", "changed-meaning"]], "La primera parte está en voz activa; la segunda cambia a pasiva.", "Mantén la voz activa: Maya hace las dos acciones."],
  },
  {
    en: ["If Ana studied more, she will pass the test.", "If Ana studied more, she would pass the test.", [["If Ana studied more, she passes the test.", "still-shifts"], ["Ana studied more and passed the test.", "changed-meaning"]], "The first part imagines something; the second sounds certain.", "An imagined condition takes an imagined result: “would pass.”"],
    es: ["Me pidió que la ayudo con el proyecto.", "Me pidió que la ayudara con el proyecto.", [["Me pidió que la ayudaré con el proyecto.", "still-shifts"], ["Yo le pedí que me ayudara con el proyecto.", "changed-meaning"]], "“Pidió” está en pasado, y lo que se pide todavía no es un hecho.", "Después de “pidió que” va el pretérito de subjuntivo: “ayudara”."],
  },
  {
    en: ["We planted the seeds in April, and the garden was watered every day.", "We planted the seeds in April and watered the garden every day.", [["We planted the seeds in April, and the garden got watered every day.", "still-shifts"], ["We watered the garden but never planted seeds.", "changed-meaning"]], "We do both actions, but the second part switches to the passive voice.", "Keep both verbs active: “planted” and “watered.”"],
    es: ["Si hiciera sol, podemos ir a la playa.", "Si hiciera sol, podríamos ir a la playa.", [["Si hiciera sol, podremos ir a la playa.", "still-shifts"], ["Hace sol, así que fuimos a la playa.", "changed-meaning"]], "La primera parte imagina algo; la segunda suena a un hecho.", "A una condición imaginada le corresponde un resultado en condicional: “podríamos”."],
  },
  {
    en: ["Read the directions carefully, and then you will answer the questions.", "Read the directions carefully, and then answer the questions.", [["Read the directions carefully, and then the questions are answered.", "still-shifts"], ["Answer the questions without reading the directions.", "changed-meaning"]], "The sentence starts with a command, then switches to a prediction.", "Keep both as commands: “read” and “answer.”"],
    es: ["Lee las instrucciones con cuidado y luego las preguntas deben ser contestadas.", "Lee las instrucciones con cuidado y luego contesta las preguntas.", [["Lee las instrucciones con cuidado y luego se contestan las preguntas.", "still-shifts"], ["Contesta las preguntas sin leer las instrucciones.", "changed-meaning"]], "La oración empieza con una orden y luego cambia a pasiva.", "Mantén las dos partes como órdenes: “lee” y “contesta”."],
  },
  {
    en: ["The chef tasted the soup, and more salt was added by him.", "The chef tasted the soup and added more salt.", [["The chef tasted the soup, and salt was added.", "still-shifts"], ["The chef refused to taste the soup.", "changed-meaning"]], "The chef does both actions, but the second part switches to the passive voice.", "Keep both verbs active: “tasted” and “added.”"],
    es: ["El cocinero probó la sopa y fue agregada más sal por él.", "El cocinero probó la sopa y le agregó más sal.", [["El cocinero probó la sopa y se le agregó más sal.", "still-shifts"], ["El cocinero no quiso probar la sopa.", "changed-meaning"]], "El cocinero hace las dos acciones, pero la segunda parte cambia a pasiva.", "Mantén la voz activa: “probó” y “agregó”."],
  },
  {
    en: ["If it were sunny, we can go to the beach.", "If it were sunny, we could go to the beach.", [["If it were sunny, we are going to the beach.", "still-shifts"], ["It is sunny, so we went to the beach.", "changed-meaning"]], "The first part imagines something; the second sounds like a fact.", "An imagined condition takes an imagined result: “could go.”"],
    es: ["La maestra quería que todos llegan temprano.", "La maestra quería que todos llegaran temprano.", [["La maestra quería que todos llegarán temprano.", "still-shifts"], ["La maestra llegó temprano.", "changed-meaning"]], "Lo que la maestra quería todavía no era un hecho.", "Con “quería que” va el pretérito de subjuntivo: “llegaran”."],
  },
  {
    en: ["Kai painted the fence, and then the gate was fixed by him.", "Kai painted the fence and then fixed the gate.", [["Kai painted the fence, and then the gate got fixed.", "still-shifts"], ["Kai fixed the fence but painted nothing.", "changed-meaning"]], "Kai does both actions, but the second part switches to the passive voice.", "Keep both verbs active: “painted” and “fixed.”"],
    es: ["Kai pintó la cerca y luego la puerta fue arreglada por él.", "Kai pintó la cerca y luego arregló la puerta.", [["Kai pintó la cerca y luego se arregló la puerta.", "still-shifts"], ["Kai arregló la cerca y no pintó nada.", "changed-meaning"]], "Kai hace las dos acciones, pero la segunda parte cambia a pasiva.", "Mantén la voz activa: “pintó” y “arregló”."],
  },
  {
    en: ["Close the windows, and the lights should be turned off too.", "Close the windows, and turn off the lights too.", [["Close the windows, and the lights are turned off too.", "still-shifts"], ["Open the windows, and leave the lights on.", "changed-meaning"]], "The sentence starts with a command, then switches to the passive voice.", "Keep both as commands: “close” and “turn off.”"],
    es: ["Cierra las ventanas y las luces deben ser apagadas también.", "Cierra las ventanas y apaga también las luces.", [["Cierra las ventanas y se apagan también las luces.", "still-shifts"], ["Abre las ventanas y deja las luces encendidas.", "changed-meaning"]], "La oración empieza con una orden y luego cambia a pasiva.", "Mantén las dos partes como órdenes: “cierra” y “apaga”."],
  },
  {
    en: ["If we left now, we will catch the early train.", "If we left now, we would catch the early train.", [["If we left now, we catch the early train.", "still-shifts"], ["We left early and missed the train.", "changed-meaning"]], "The first part imagines something; the second sounds certain.", "An imagined condition takes an imagined result: “would catch.”"],
    es: ["Si saliéramos ahora, alcanzamos el primer tren.", "Si saliéramos ahora, alcanzaríamos el primer tren.", [["Si saliéramos ahora, alcanzaremos el primer tren.", "still-shifts"], ["Salimos temprano y perdimos el tren.", "changed-meaning"]], "La primera parte imagina algo; la segunda suena a un hecho.", "A una condición imaginada le corresponde un resultado en condicional: “alcanzaríamos”."],
  },
  {
    en: ["The team practiced all week, and the trophy was won by them on Saturday.", "The team practiced all week and won the trophy on Saturday.", [["The team practiced all week, and the trophy was taken home on Saturday.", "still-shifts"], ["The team practiced all week but lost on Saturday.", "changed-meaning"]], "The team does both actions, but the second part switches to the passive voice.", "Keep both verbs active: “practiced” and “won.”"],
    es: ["El equipo entrenó toda la semana y el trofeo fue ganado por él el sábado.", "El equipo entrenó toda la semana y ganó el trofeo el sábado.", [["El equipo entrenó toda la semana y el trofeo se ganó el sábado.", "still-shifts"], ["El equipo entrenó toda la semana, pero perdió el sábado.", "changed-meaning"]], "El equipo hace las dos acciones, pero la segunda parte cambia a pasiva.", "Mantén la voz activa: “entrenó” y “ganó”."],
  },
];

const VERB_SHIFT = skill(
  { id: "e.verb.shifts", grade: "8", title: { en: "Shifts in voice and mood", es: "Cambios de voz y de modo" }, standard: "L.8.1d", prereqs: ["e.active.passive", "e.verb.moods"] },
  [
    {
      bank: VERB_SHIFTS,
      ask: { en: "Which revision keeps the verbs consistent?", es: "¿Qué versión mantiene los verbos coherentes?" },
      hints: {
        en: ["Look at each verb. Does the sentence switch from active to passive, or from a command or a real statement to something else?", "Keep the same voice and mood all the way through unless the meaning truly changes. An imagined condition (“If I were…”) takes an imagined result (“I would…”)."],
        es: ["Mira cada verbo. ¿La oración pasa de voz activa a pasiva, o de un modo o tiempo a otro sin razón?", "Mantén la misma voz y el mismo modo en toda la oración. Si la condición es imaginada (si tuviera…), el resultado va en condicional (ayudaría). Después de un verbo en pasado como “pidió que”, va el pretérito de subjuntivo."],
      },
      seconds: 30,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.irony.puns — level 1: verbal irony, pun, hyperbole or literal; level 2: what the line really means.
// The Spanish puns are Spanish word play (nada / nadar, “techo de menos”, “plata no es”, sin cero /
// sincero), not translated English jokes.

type Figure = "irony" | "pun" | "hyperbole" | "literal";
const FIGURES: readonly Figure[] = ["irony", "pun", "hyperbole", "literal"];
const FIGURE_KIND = cats<Figure>(
  {
    en: { irony: "Verbal irony", pun: "Pun", hyperbole: "Hyperbole", literal: "Literal statement" },
    es: { irony: "Ironía", pun: "Juego de palabras", hyperbole: "Hipérbole", literal: "Lenguaje literal" },
  },
  { en: FIGURES, es: FIGURES },
  [
    {
      en: ["After three hours stuck in traffic, Dad sighed, “Well, this is fun.”", "irony", "Is being stuck in traffic for three hours really fun?", "Dad says the opposite of what he means: verbal irony."],
      es: ["Después de tres horas atrapados en el tráfico, papá suspiró: “Qué divertido”.", "irony", "¿De verdad es divertido pasar tres horas en el tráfico?", "Papá dice lo contrario de lo que piensa: es ironía."],
    },
    {
      en: ["The math book looked sad because it had too many problems.", "pun", "“Problems” has two meanings here.", "“Problems” means both math exercises and troubles: a pun."],
      es: ["¿Por qué está triste el libro de matemáticas? Porque tiene muchos problemas.", "pun", "“Problemas” tiene dos sentidos aquí.", "“Problemas” son ejercicios de matemáticas y también dificultades: es un juego de palabras."],
    },
    {
      en: ["This suitcase weighs a thousand pounds.", "hyperbole", "Could a suitcase really weigh that much?", "It exaggerates far past the truth: hyperbole."],
      es: ["Esta maleta pesa mil kilos.", "hyperbole", "¿Una maleta puede pesar eso de verdad?", "Exagera muchísimo: es una hipérbole."],
    },
    {
      en: ["The library closes at six on Fridays.", "literal", "Does it mean exactly what it says?", "It means just what it says: a literal statement."],
      es: ["La biblioteca cierra a las seis los viernes.", "literal", "¿Dice exactamente lo que significa?", "Dice justo lo que significa: es lenguaje literal."],
    },
    {
      en: ["Looking at the muddy dog on the white couch, Mom said, “Perfect. Just perfect.”", "irony", "Is a muddy dog on a white couch really perfect?", "Mom says the opposite of what she means: verbal irony."],
      es: ["Al ver al perro lleno de lodo sobre el sofá blanco, mamá dijo: “Perfecto, qué maravilla”.", "irony", "¿De verdad es una maravilla un perro con lodo sobre un sofá blanco?", "Mamá dice lo contrario de lo que piensa: es ironía."],
    },
    {
      en: ["I used to be a baker, but I couldn't make enough dough.", "pun", "“Dough” can mean bread dough or, in slang, money.", "“Dough” has two meanings here: a pun."],
      es: ["¿Qué le dijo un pez a otro? Nada.", "pun", "“Nada” puede ser del verbo nadar o significar “ninguna cosa”.", "“Nada” tiene dos sentidos: es un juego de palabras."],
    },
    {
      en: ["I'm so hungry I could eat a horse.", "hyperbole", "Could anyone really eat a whole horse?", "It exaggerates far past the truth: hyperbole."],
      es: ["Tengo tanta hambre que me comería un elefante.", "hyperbole", "¿Alguien podría comerse un elefante?", "Exagera muchísimo: es una hipérbole."],
    },
    {
      en: ["Our soccer practice starts at four.", "literal", "Does it mean exactly what it says?", "It means just what it says: a literal statement."],
      es: ["El entrenamiento de fútbol empieza a las cuatro.", "literal", "¿Dice exactamente lo que significa?", "Dice justo lo que significa: es lenguaje literal."],
    },
    {
      en: ["When Leo dropped all his books in the hallway, his friend said, “Smooth move.”", "irony", "Was dropping the books really smooth?", "His friend says the opposite of what happened: verbal irony."],
      es: ["Cuando Leo dejó caer todos sus libros en el pasillo, su amigo le dijo: “Qué elegante”.", "irony", "¿De verdad fue elegante dejar caer los libros?", "Su amigo dice lo contrario de lo que pasó: es ironía."],
    },
    {
      en: ["The astronaut took a break because she needed some space.", "pun", "“Space” has two meanings here.", "“Space” means both outer space and time alone: a pun."],
      es: ["¿Cuál es el colmo de un astronauta? Quedarse sin espacio.", "pun", "“Espacio” tiene dos sentidos aquí.", "“Espacio” es el espacio exterior y también el lugar disponible: es un juego de palabras."],
    },
    {
      en: ["My little brother takes forever to get dressed.", "hyperbole", "Does it really take him forever?", "It exaggerates far past the truth: hyperbole."],
      es: ["Mi hermanito tarda una eternidad en vestirse.", "hyperbole", "¿De verdad tarda una eternidad?", "Exagera muchísimo: es una hipérbole."],
    },
    {
      en: ["The bus was late this morning.", "literal", "Does it mean exactly what it says?", "It means just what it says: a literal statement."],
      es: ["El autobús llegó tarde esta mañana.", "literal", "¿Dice exactamente lo que significa?", "Dice justo lo que significa: es lenguaje literal."],
    },
    {
      en: ["During the thunderstorm, Ana looked outside and said, “Lovely beach weather.”", "irony", "Is a thunderstorm good beach weather?", "Ana says the opposite of what she means: verbal irony."],
      es: ["Durante la tormenta, Ana miró por la ventana y dijo: “Qué buen día para ir a la playa”.", "irony", "¿Una tormenta es un buen día de playa?", "Ana dice lo contrario de lo que piensa: es ironía."],
    },
    {
      en: ["The bicycle couldn't stand up by itself because it was two-tired.", "pun", "Say “two-tired” out loud. What other words does it sound like?", "“Two-tired” sounds like “too tired,” and a bicycle has two tires: a pun."],
      es: ["Oro parece, plata no es. ¿Qué es? El plátano.", "pun", "Lee “plata no es” en voz alta, todo junto.", "“Plata no es” suena como “plátano”: es un juego de palabras."],
    },
    {
      en: ["The line for the roller coaster was a mile long.", "hyperbole", "Was the line really a mile long?", "It exaggerates far past the truth: hyperbole."],
      es: ["La fila para la montaña rusa medía un kilómetro.", "hyperbole", "¿De verdad medía un kilómetro?", "Exagera muchísimo: es una hipérbole."],
    },
    {
      en: ["The recipe needs two cups of rice.", "literal", "Does it mean exactly what it says?", "It means just what it says: a literal statement."],
      es: ["La receta lleva dos tazas de arroz.", "literal", "¿Dice exactamente lo que significa?", "Dice justo lo que significa: es lenguaje literal."],
    },
  ],
);

const FIGURE_MEANING: Bi<Entry>[] = [
  {
    en: ["After her team lost 10 to 0, Zoe said, “Well, that went great.”", "The game went badly, and Zoe is joking about it", [["Zoe thinks the game went well", "took-literally"], ["Zoe is angry at the other team", "unsupported-reading"]], "Compare the score with what Zoe says.", "Zoe says the opposite of what happened: verbal irony."],
    es: ["Después de perder 10 a 0, Zoe dijo: “Bueno, eso salió de maravilla”.", "El partido salió muy mal y Zoe bromea sobre eso", [["Zoe cree que el partido salió bien", "took-literally"], ["Zoe está enojada con el otro equipo", "unsupported-reading"]], "Compara el marcador con lo que dice Zoe.", "Zoe dice lo contrario de lo que pasó: es ironía."],
  },
  {
    en: ["Seeing the overflowing trash can, Omar said, “Wow, somebody really loves taking out the trash.”", "Nobody has taken out the trash, and Omar is pointing that out", [["Someone in the house loves taking out the trash", "took-literally"], ["Omar wants a bigger trash can", "unsupported-reading"]], "Compare the full trash can with what Omar says.", "Omar says the opposite of what is true: verbal irony."],
    es: ["Al ver el bote de basura desbordado, Omar dijo: “Vaya, a alguien le encanta sacar la basura”.", "Nadie ha sacado la basura, y Omar lo señala", [["A alguien de la casa le encanta sacar la basura", "took-literally"], ["Omar quiere un bote más grande", "unsupported-reading"]], "Compara el bote lleno con lo que dice Omar.", "Omar dice lo contrario de lo que pasa: es ironía."],
  },
  {
    en: ["“I'm reading a book about anti-gravity. It's impossible to put down.”", "It plays on “put down”: to stop reading, and to set something down", [["The book is too heavy to lift", "took-literally"], ["The book is about putting things away", "missed-double-meaning"]], "What would anti-gravity do to a book you tried to set down?", "“Impossible to put down” means very exciting, and with anti-gravity it also floats: a pun."],
    es: ["—¿Qué le dijo un techo a otro? —Techo de menos.", "Juega con “techo de menos”, que suena como “te echo de menos”: te extraño", [["Un techo es más pequeño que el otro", "took-literally"], ["Los techos están peleados", "missed-double-meaning"]], "Lee “techo de menos” en voz alta. ¿Qué frase conocida suena igual?", "“Techo de menos” suena como “te echo de menos”: es un juego de palabras."],
  },
  {
    en: ["After the cat knocked over the plant for the third time, Mia said, “What a helpful cat.”", "The cat is causing trouble, and Mia is annoyed", [["Mia thinks the cat is helping", "took-literally"], ["Mia wants to buy a new plant", "unsupported-reading"]], "Is knocking over a plant helpful?", "Mia says the opposite of what she means: verbal irony."],
    es: ["Después de que el gato tiró la planta por tercera vez, Mía dijo: “Qué gato tan servicial”.", "El gato causa problemas y Mía está molesta", [["Mía cree que el gato la ayuda", "took-literally"], ["Mía quiere comprar otra planta", "unsupported-reading"]], "¿Tirar una planta es ser servicial?", "Mía dice lo contrario de lo que piensa: es ironía."],
  },
  {
    en: ["“Why did the scarecrow win an award? Because he was outstanding in his field.”", "It plays on “outstanding in his field”: excellent at his job, and standing out in a farm field", [["The scarecrow was the best farmer in town", "took-literally"], ["The scarecrow won a sports award", "missed-double-meaning"]], "Where does a scarecrow stand?", "“Outstanding in his field” has two meanings: a pun."],
    es: ["¿Cuál es el colmo de un jardinero? Que su novia se llame Rosa y lo deje plantado.", "Juega con “dejar plantado”: no llegar a una cita, y sembrar una planta", [["La novia del jardinero siembra rosas", "took-literally"], ["El jardinero no tiene novia", "missed-double-meaning"]], "¿Qué significa “dejar plantado” a alguien? ¿Y qué hace un jardinero con las plantas?", "“Plantado” tiene dos sentidos, y “Rosa” es un nombre y una flor: es un juego de palabras."],
  },
  {
    en: ["Walking into the freezing classroom, Dev said, “Nice and toasty in here.”", "The room is very cold", [["The room is warm and comfortable", "took-literally"], ["Dev wants to make toast", "unsupported-reading"]], "Compare the freezing room with what Dev says.", "Dev says the opposite of what is true: verbal irony."],
    es: ["Al entrar al salón helado, Dev dijo: “Qué calorcito tan rico hay aquí”.", "El salón está muy frío", [["El salón está cálido y cómodo", "took-literally"], ["Dev tiene ganas de comer", "unsupported-reading"]], "Compara el salón helado con lo que dice Dev.", "Dev dice lo contrario de lo que pasa: es ironía."],
  },
  {
    en: ["“I stayed up all night wondering where the sun went. Then it dawned on me.”", "It plays on “dawned”: the sun came up, and the speaker finally understood", [["The speaker watched the sunrise and went to sleep", "took-literally"], ["The speaker forgot about the sun", "missed-double-meaning"]], "What does it mean when an idea “dawns on” you? What happens at dawn?", "“Dawned on me” has two meanings: a pun."],
    es: ["¿Qué le dice una iguana a su hermana gemela? Iguanita.", "Juega con “iguanita”, que suena como “igualita”: son idénticas", [["La iguana es muy pequeña", "took-literally"], ["Las iguanas no son hermanas", "missed-double-meaning"]], "Lee “iguanita” en voz alta. ¿Qué palabra suena casi igual?", "“Iguanita” suena como “igualita”: es un juego de palabras."],
  },
  {
    en: ["When his little sister colored on the wall, Sam said, “Great, a new mural for the hallway.”", "Sam is upset that she drew on the wall", [["Sam is happy about the new art", "took-literally"], ["Sam wants to paint the hallway", "unsupported-reading"]], "Is coloring on the wall really great?", "Sam says the opposite of what he means: verbal irony."],
    es: ["Cuando su hermanita pintó la pared, Sam dijo: “Genial, un mural nuevo para el pasillo”.", "Sam está molesto porque ella pintó la pared", [["Sam está feliz con el arte nuevo", "took-literally"], ["Sam quiere pintar el pasillo", "unsupported-reading"]], "¿De verdad es genial que pinten la pared?", "Sam dice lo contrario de lo que piensa: es ironía."],
  },
  {
    en: ["“I'm on a seafood diet. I see food, and I eat it.”", "It plays on “seafood” and “see food”: the speaker eats everything they see", [["The speaker eats only fish", "took-literally"], ["The speaker is trying to eat less", "missed-double-meaning"]], "Say “seafood” and “see food” out loud.", "“Seafood” sounds like “see food”: a pun."],
    es: ["¿Qué le dijo el número 1 al 10? Para ser como yo, tienes que ser sincero.", "Juega con “sincero”, que suena como “sin cero”: al 10 le sobra el cero", [["El 1 es más honesto que el 10", "took-literally"], ["Los números no se llevan bien", "missed-double-meaning"]], "¿Qué le pasa al 10 si le quitas el cero?", "“Sincero” suena como “sin cero”: es un juego de palabras."],
  },
  {
    en: ["After waiting an hour for a table, Grandpa said, “Speedy service here.”", "The service is very slow", [["The service is fast", "took-literally"], ["Grandpa wants to leave a big tip", "unsupported-reading"]], "Is an hour's wait speedy?", "Grandpa says the opposite of what is true: verbal irony."],
    es: ["Después de esperar una hora por una mesa, el abuelo dijo: “Qué servicio tan rápido”.", "El servicio es muy lento", [["El servicio es rápido", "took-literally"], ["El abuelo quiere dejar mucha propina", "unsupported-reading"]], "¿Una hora de espera es rápida?", "El abuelo dice lo contrario de lo que pasa: es ironía."],
  },
  {
    en: ["“Why are frogs so happy? They eat whatever bugs them.”", "It plays on two meanings of “bugs”: insects, and things that annoy you", [["Frogs are happy because they eat insects", "took-literally"], ["Frogs are annoyed by their food", "missed-double-meaning"]], "What can “bug” mean besides an insect?", "“Bugs them” has two meanings: a pun."],
    es: ["¿Qué le dijo una pared a otra? Nos vemos en la esquina.", "Juega con “nos vemos en la esquina”: las paredes se juntan en la esquina, y es una forma de despedirse", [["Las paredes van a caminar a la esquina", "took-literally"], ["Las paredes no se quieren ver", "missed-double-meaning"]], "¿Dónde se juntan dos paredes? ¿Y cuándo dice alguien “nos vemos en la esquina”?", "La frase tiene dos sentidos: es un juego de palabras."],
  },
  {
    en: ["As rain poured on the picnic, Lina said, “Good thing we planned this for today.”", "Planning the picnic for today was a bad idea", [["Today was the best day for a picnic", "took-literally"], ["Lina loves the rain", "unsupported-reading"]], "Is a rainy day good for a picnic?", "Lina says the opposite of what she means: verbal irony."],
    es: ["Mientras la lluvia caía sobre el picnic, Lina dijo: “Qué buena idea fue planearlo para hoy”.", "Planear el picnic para hoy fue mala idea", [["Hoy era el mejor día para un picnic", "took-literally"], ["A Lina le encanta la lluvia", "unsupported-reading"]], "¿Un día de lluvia es bueno para un picnic?", "Lina dice lo contrario de lo que piensa: es ironía."],
  },
  {
    en: ["“I would tell you a joke about construction, but I'm still working on it.”", "It plays on “working on it”: building something, and still preparing the joke", [["The speaker works in construction", "took-literally"], ["The speaker does not like jokes", "missed-double-meaning"]], "What do construction workers do to a building? What does it mean to work on a joke?", "“Working on it” has two meanings: a pun."],
    es: ["¿Cuál es el colmo de un electricista? Que su esposa se llame Luz y sus hijos le sigan la corriente.", "Juega con “Luz” y “seguir la corriente”, que también son palabras de la electricidad", [["La familia del electricista trabaja con cables", "took-literally"], ["El electricista no tiene luz en casa", "missed-double-meaning"]], "¿Qué significa “seguirle la corriente” a alguien? ¿Y qué es la corriente para un electricista?", "“Luz” y “corriente” tienen dos sentidos: es un juego de palabras."],
  },
  {
    en: ["Holding a test with a big red F, Max said, “My parents will be thrilled.”", "His parents will be upset", [["His parents will be very happy", "took-literally"], ["Max will hide the test forever", "unsupported-reading"]], "How do parents usually feel about a failing grade?", "Max says the opposite of what he expects: verbal irony."],
    es: ["Con un examen reprobado en la mano, Max dijo: “Mis papás van a estar felicísimos”.", "Sus papás se van a enojar", [["Sus papás van a estar muy contentos", "took-literally"], ["Max va a esconder el examen para siempre", "unsupported-reading"]], "¿Cómo suelen sentirse los papás con un examen reprobado?", "Max dice lo contrario de lo que espera: es ironía."],
  },
];

const IRONY_PUNS = skill(
  { id: "e.irony.puns", grade: "8", title: { en: "Verbal irony and puns", es: "Ironía y juegos de palabras" }, standard: "L.8.5a", prereqs: ["e.figurative"] },
  [
    {
      ...FIGURE_KIND,
      ask: { en: "Which kind of language is this?", es: "¿Qué tipo de lenguaje es este?" },
      hints: {
        en: ["Does the speaker mean exactly what the words say?", "Verbal irony says the opposite of what the speaker means. A pun plays on a word with two meanings, or on words that sound alike. Hyperbole exaggerates far past the truth. A literal statement means just what it says."],
        es: ["¿Quien habla quiere decir exactamente lo que dicen las palabras?", "La ironía dice lo contrario de lo que se quiere decir. Un juego de palabras usa una palabra con dos sentidos o palabras que suenan igual. La hipérbole exagera muchísimo. El lenguaje literal dice justo lo que significa."],
      },
      seconds: 15,
    },
    {
      bank: FIGURE_MEANING,
      ask: { en: "What does the line really mean?", es: "¿Qué quiere decir realmente la frase?" },
      hints: {
        en: ["Does the speaker mean exactly what the words say?", "For irony, compare the words with the situation: the meaning is the opposite. For a pun, find the word or phrase with two meanings, or two words that sound alike."],
        es: ["¿Quien habla quiere decir exactamente lo que dicen las palabras?", "En la ironía, compara las palabras con la situación: el sentido es el contrario. En un juego de palabras, busca la palabra con dos sentidos o las palabras que suenan igual."],
      },
      seconds: 25,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.allusions — what a reference to a famous myth, fable, book or person suggests. Spanish adds
// allusions from Spanish-language literature and fables: un Quijote, molinos de viento, el cuento de la
// lechera. Tags: took-literally, wrong-story, opposite-reading.

const ALLUSIONS: Bi<Entry>[] = [
  {
    en: ["Math is Diego's Achilles' heel; he aces every other subject.", "a weak spot in someone who is otherwise strong", [["an injury to his foot", "took-literally"], ["a gift that brings trouble", "wrong-story"]], "In Greek myth, the hero Achilles could be wounded in only one place: his heel.", "An Achilles' heel is the one weakness of someone strong."],
    es: ["Las matemáticas son el talón de Aquiles de Diego; en las demás materias saca dieces.", "un punto débil en alguien que en lo demás es fuerte", [["una lesión en el pie", "took-literally"], ["un regalo que trae problemas", "wrong-story"]], "En el mito griego, al héroe Aquiles solo lo podían herir en un lugar: el talón.", "El talón de Aquiles es la única debilidad de alguien fuerte."],
  },
  {
    en: ["Asking the twins about the broken vase opened Pandora's box.", "it set loose many unexpected problems", [["it opened a box of toys", "took-literally"], ["it revealed one small weakness", "wrong-story"]], "In Greek myth, Pandora opened a container that let troubles out into the world.", "Opening Pandora's box means starting something that causes many problems."],
    es: ["Preguntarles a los gemelos por el florero roto fue abrir la caja de Pandora.", "desató muchos problemas inesperados", [["abrió una caja de juguetes", "took-literally"], ["reveló una pequeña debilidad", "wrong-story"]], "En el mito griego, Pandora abrió un recipiente que soltó los males en el mundo.", "Abrir la caja de Pandora es empezar algo que trae muchos problemas."],
  },
  {
    en: ["Lena has the Midas touch; every business she starts makes money.", "the ability to make everything succeed", [["the ability to fix broken things with her hands", "took-literally"], ["a habit of losing everything she owns", "opposite-reading"]], "In Greek myth, King Midas turned everything he touched into gold.", "Having the Midas touch means making every project profitable."],
    es: ["Lena tiene el toque de Midas: todo negocio que empieza gana dinero.", "la capacidad de hacer que todo salga bien", [["la habilidad de arreglar cosas con las manos", "took-literally"], ["la costumbre de perder todo lo que tiene", "opposite-reading"]], "En el mito griego, el rey Midas convertía en oro todo lo que tocaba.", "Tener el toque de Midas es hacer que todo proyecto dé ganancias."],
  },
  {
    en: ["Moving the whole library across town was a Herculean task.", "a job that takes enormous strength and effort", [["a job done by a famous athlete", "took-literally"], ["a quick, easy chore", "opposite-reading"]], "In Greek and Roman myth, Hercules completed twelve nearly impossible labors.", "A Herculean task is one that takes huge effort."],
    es: ["Mover toda la biblioteca al otro lado del pueblo fue un trabajo de Hércules.", "una tarea que exige muchísima fuerza y esfuerzo", [["un trabajo hecho por un atleta famoso", "took-literally"], ["una tarea rápida y fácil", "opposite-reading"]], "En los mitos griegos y romanos, Hércules completó doce trabajos casi imposibles.", "Un trabajo de Hércules es una tarea enorme."],
  },
  {
    en: ["Their trip home from the tournament became an odyssey of missed flights and lost bags.", "a long journey full of trouble", [["a short, easy trip", "opposite-reading"], ["a contest of strength", "wrong-story"]], "In Homer's Odyssey, Odysseus spends ten years trying to get home.", "An odyssey is a long, eventful journey."],
    es: ["El viaje de regreso del torneo fue una odisea de vuelos perdidos y maletas extraviadas.", "un viaje largo y lleno de problemas", [["un viaje corto y fácil", "opposite-reading"], ["una competencia de fuerza", "wrong-story"]], "En la Odisea de Homero, Odiseo pasa diez años tratando de volver a casa.", "Una odisea es un viaje largo y lleno de contratiempos."],
  },
  {
    en: ["Kai complained of fake stomachaches so often to skip gym that no one believed him when he really got sick. He had cried wolf.", "he raised false alarms so often that no one believed the real one", [["he was afraid of animals", "took-literally"], ["he was too proud to ask for help", "wrong-story"]], "In Aesop's fable, a shepherd boy shouts that a wolf is coming as a joke, until no one believes him.", "Crying wolf means giving false alarms until no one listens."],
    es: ["Don Fermín es un Quijote: siempre lucha por causas que todos creen imposibles.", "una persona idealista que defiende causas nobles aunque parezcan imposibles", [["un caballero que viaja a caballo", "took-literally"], ["una persona tacaña", "wrong-story"]], "En la novela de Cervantes, don Quijote sale a luchar por la justicia contra enemigos que solo existen en su imaginación.", "Ser un Quijote es ser idealista hasta parecer soñador."],
  },
  {
    en: ["“Those grapes were sour anyway,” Ben said after he did not make the team.", "pretending not to want something he could not get", [["he did not like the snack", "took-literally"], ["he was being honest about the team", "opposite-reading"]], "In Aesop's fable, a fox who cannot reach some grapes decides they must be sour.", "“Sour grapes” means pretending you never wanted what you could not have."],
    es: ["Tratar de que mi hermanito coma brócoli es luchar contra molinos de viento.", "es intentar algo imposible", [["es trabajar en una granja", "took-literally"], ["es una tarea fácil", "opposite-reading"]], "En la novela de Cervantes, don Quijote ataca unos molinos de viento creyendo que son gigantes.", "Luchar contra molinos de viento es pelear contra algo imposible de vencer."],
  },
  {
    en: ["The new student was a real Good Samaritan, helping everyone find their classes.", "a person who helps strangers in need", [["a student from a town called Samaria", "took-literally"], ["someone who causes trouble", "opposite-reading"]], "In a parable from the Bible, a traveler from Samaria stops to help a hurt stranger.", "A Good Samaritan is someone who helps strangers."],
    es: ["Antes de vender un solo pastel, Ana ya planeaba qué compraría con las ganancias. Su abuela le dijo: “No hagas el cuento de la lechera”.", "contar con algo que todavía no tienes", [["vender leche en el mercado", "took-literally"], ["ser muy ahorradora", "opposite-reading"]], "En el cuento, una lechera imagina todo lo que comprará con la leche, pero el cántaro se le cae y lo pierde todo.", "Hacer el cuento de la lechera es hacer planes con lo que todavía no se tiene."],
  },
  {
    en: ["Our small team beat the champions; it was David versus Goliath.", "a much weaker side defeating a stronger one", [["a contest between two equal teams", "opposite-reading"], ["a team led by a coach named David", "took-literally"]], "In the Bible, young David defeats the giant Goliath.", "A David-and-Goliath contest is one where the underdog wins."],
    es: ["“Las uvas estaban verdes”, dijo Beto cuando no lo eligieron para el equipo.", "fingir que no quería lo que no pudo conseguir", [["no le gustó la fruta", "took-literally"], ["decía con sinceridad lo que pensaba", "opposite-reading"]], "En la fábula, una zorra que no alcanza unas uvas dice que estaban verdes.", "“Están verdes” se dice cuando alguien desprecia lo que no pudo conseguir."],
  },
  {
    en: ["After the fire, the town rebuilt its library and rose like a phoenix.", "came back stronger after being destroyed", [["turned into a bird", "took-literally"], ["disappeared forever", "opposite-reading"]], "In ancient myths, the phoenix is a bird that rises again from its own ashes.", "Rising like a phoenix means coming back after being destroyed."],
    es: ["Kai se quejaba tanto de dolores de panza falsos que, cuando de verdad se enfermó, nadie le creyó: le pasó como a Pedro y el lobo.", "dio tantas falsas alarmas que nadie creyó la verdadera", [["les tenía miedo a los animales", "took-literally"], ["era demasiado orgulloso para pedir ayuda", "wrong-story"]], "En la fábula, un pastorcito avisa en broma que viene el lobo, hasta que nadie le cree.", "Pasarle como a Pedro y el lobo es dar falsas alarmas hasta que nadie te cree."],
  },
  {
    en: ["My brother is such a Scrooge; he won't spend a penny on gifts.", "a stingy person", [["a person who loves holidays", "opposite-reading"], ["a person with a bad memory", "wrong-story"]], "In Charles Dickens's A Christmas Carol, Ebenezer Scrooge refuses to spend money or share.", "Calling someone a Scrooge means they are stingy."],
    es: ["Después del incendio, el pueblo reconstruyó la biblioteca y resurgió como el ave fénix.", "volvió más fuerte después de ser destruido", [["se convirtió en pájaro", "took-literally"], ["desapareció para siempre", "opposite-reading"]], "En los mitos antiguos, el ave fénix renace de sus propias cenizas.", "Resurgir como el ave fénix es volver después de haber sido destruido."],
  },
  {
    en: ["Being chosen for the team after years on the bench was a real Cinderella story.", "an unexpected rise from being overlooked to success", [["a story about losing a shoe", "took-literally"], ["a story about a long journey home", "wrong-story"]], "In the fairy tale, a mistreated girl ends up marrying a prince.", "A Cinderella story is a rise from being overlooked to success."],
    es: ["Que eligieran al jugador de la banca para la final fue una historia de Cenicienta.", "un ascenso inesperado de alguien a quien nadie tomaba en cuenta", [["una historia sobre perder un zapato", "took-literally"], ["un viaje largo de regreso a casa", "wrong-story"]], "En el cuento, una joven maltratada termina casándose con un príncipe.", "Una historia de Cenicienta es pasar de ser ignorado al éxito."],
  },
  {
    en: ["Every time Ava fibbed about her homework, her mom joked that her nose was growing like Pinocchio's.", "Ava was not telling the truth", [["Ava had a cold", "took-literally"], ["Ava was very brave", "wrong-story"]], "In the story, Pinocchio's nose grows whenever he lies.", "Mentioning Pinocchio's nose points to a lie."],
    es: ["Cada vez que Ava mentía sobre la tarea, su mamá bromeaba que le iba a crecer la nariz como a Pinocho.", "Ava no decía la verdad", [["Ava tenía gripe", "took-literally"], ["Ava era muy valiente", "wrong-story"]], "En el cuento, a Pinocho le crece la nariz cada vez que miente.", "Mencionar la nariz de Pinocho señala una mentira."],
  },
  {
    en: ["Tina's science fair project was so impressive that the judges called her the next Einstein.", "a brilliant scientific thinker", [["a person with messy hair", "took-literally"], ["a famous painter", "wrong-story"]], "Albert Einstein was a physicist famous for his theories about space, time, and energy.", "Calling someone the next Einstein means they seem brilliant at science."],
    es: ["El proyecto de Tina en la feria de ciencias impresionó tanto que los jueces la llamaron la próxima Marie Curie.", "una científica brillante", [["una persona que trabaja en un laboratorio de cocina", "took-literally"], ["una pintora famosa", "wrong-story"]], "Marie Curie fue una científica que ganó dos premios Nobel por sus investigaciones sobre la radiactividad.", "Llamar a alguien la próxima Marie Curie es decir que parece brillante en ciencias."],
  },
];

const ALLUSION = skill(
  { id: "e.allusions", grade: "8", title: { en: "Allusions", es: "Alusiones" }, standard: "RL.8.4", prereqs: ["e.figurative"] },
  [
    {
      bank: ALLUSIONS,
      ask: { en: "What does the allusion in this sentence suggest?", es: "¿Qué sugiere la alusión de esta oración?" },
      hints: {
        en: ["An allusion is a short reference to a famous story, myth, person, or work. Which one is mentioned?", "Recall what happens in that story, then ask how it matches the situation in the sentence."],
        es: ["Una alusión es una referencia breve a una historia, un mito, una persona o una obra famosa. ¿Cuál se menciona?", "Recuerda qué pasa en esa historia y luego piensa cómo se parece a la situación de la oración."],
      },
      seconds: 25,
    },
  ],
);

// ===================================================================================================
// Grade 9
// ===================================================================================================

// ---------------------------------------------------------------------------------------------------
// e.parallel.structure — level 1: the sentence whose series or paired parts share one form; level 2:
// the item that completes a series in the same form. Spanish pairs: tanto… como, no solo… sino también,
// ni… ni.

const PARALLEL_PICK: Bi<Entry>[] = [
  {
    en: ["", "Maya likes hiking, swimming, and biking.", [["Maya likes hiking, swimming, and to bike.", "mixed-verb-forms"], ["Maya likes hiking, swimming, and she bikes.", "mixed-word-types"]], "Look at the form of each activity in the list.", "All three activities end in -ing, so the series is parallel."],
    es: ["", "A Maya le gusta caminar, nadar y andar en bicicleta.", [["A Maya le gusta caminar, nadar y la bicicleta.", "mixed-word-types"], ["A Maya le gusta caminar, nadando y andar en bicicleta.", "mixed-verb-forms"]], "Fíjate en la forma de cada actividad de la serie.", "Las tres actividades son infinitivos, así que la serie es paralela."],
  },
  {
    en: ["", "The coach told us to stretch, to drink water, and to rest.", [["The coach told us to stretch, drinking water, and to rest.", "mixed-verb-forms"], ["The coach told us to stretch, to drink water, and that we should rest.", "mixed-word-types"]], "Look at how each instruction begins.", "All three instructions are “to” plus a verb."],
    es: ["", "El entrenador nos pidió estirarnos, tomar agua y descansar.", [["El entrenador nos pidió estirarnos, tomar agua y que descansáramos.", "mixed-word-types"], ["El entrenador nos pidió estirarnos, tomando agua y descansar.", "mixed-verb-forms"]], "Fíjate en cómo está escrita cada instrucción.", "Las tres instrucciones son infinitivos."],
  },
  {
    en: ["", "The new library is bright, quiet, and comfortable.", [["The new library is bright, quiet, and has comfortable chairs.", "mixed-word-types"], ["The new library is bright, quietly, and comfortable.", "mixed-word-types"]], "What kind of word is each item in the list?", "All three items are adjectives that describe the library."],
    es: ["", "La nueva biblioteca es luminosa, tranquila y cómoda.", [["La nueva biblioteca es luminosa, tranquila y tiene sillas cómodas.", "mixed-word-types"], ["La nueva biblioteca es luminosa, tranquilamente y cómoda.", "mixed-word-types"]], "¿Qué clase de palabra es cada elemento de la serie?", "Los tres elementos son adjetivos que describen la biblioteca."],
  },
  {
    en: ["", "Kenji not only finished his project but also helped his friends.", [["Kenji not only finished his project but also his friends were helped.", "unbalanced-pair"], ["Kenji not only finished his project but also helping his friends.", "mixed-verb-forms"]], "Compare the words after “not only” with the words after “but also.”", "Both parts start with a past-tense verb: “finished” and “helped.”"],
    es: ["", "Kenji no solo terminó su proyecto, sino que también ayudó a sus amigos.", [["Kenji no solo terminó su proyecto, sino también sus amigos fueron ayudados.", "unbalanced-pair"], ["Kenji no solo terminó su proyecto, sino también ayudando a sus amigos.", "mixed-verb-forms"]], "Compara lo que va después de “no solo” con lo que va después de “sino”.", "Las dos partes tienen un verbo en pasado: “terminó” y “ayudó”."],
  },
  {
    en: ["", "We can either take the train or ride our bikes.", [["We can either take the train or riding our bikes.", "mixed-verb-forms"], ["Either we can take the train or ride our bikes.", "unbalanced-pair"]], "Compare the words after “either” with the words after “or.”", "Both parts are a plain verb phrase: “take the train” and “ride our bikes.”"],
    es: ["", "Podemos tomar el tren o ir en bicicleta.", [["Podemos tomar el tren o yendo en bicicleta.", "mixed-verb-forms"], ["Podemos tomar el tren o la bicicleta es otra opción.", "mixed-word-types"]], "Compara las dos opciones.", "Las dos opciones son infinitivos: “tomar” e “ir”."],
  },
  {
    en: ["", "Our goals are to read more, to sleep more, and to worry less.", [["Our goals are to read more, sleeping more, and to worry less.", "mixed-verb-forms"], ["Our goals are to read more, to sleep more, and less worrying.", "mixed-word-types"]], "Look at how each goal begins.", "All three goals are “to” plus a verb."],
    es: ["", "Nuestras metas son leer más, dormir más y preocuparnos menos.", [["Nuestras metas son leer más, dormir más y menos preocupación.", "mixed-word-types"], ["Nuestras metas son leer más, durmiendo más y preocuparnos menos.", "mixed-verb-forms"]], "Fíjate en la forma de cada meta.", "Las tres metas son infinitivos."],
  },
  {
    en: ["", "The recipe was easy to follow, quick to make, and delicious to eat.", [["The recipe was easy to follow, quick to make, and it tasted delicious.", "mixed-word-types"], ["The recipe was easy to follow, making it quick, and delicious to eat.", "mixed-verb-forms"]], "Each item should have the same shape as “easy to follow.”", "All three items are an adjective plus “to” and a verb."],
    es: ["", "La receta era fácil de seguir, rápida de hacer y deliciosa de comer.", [["La receta era fácil de seguir, rápida de hacer y sabía deliciosa.", "mixed-word-types"], ["La receta era fácil de seguir, se hacía rápido y deliciosa de comer.", "mixed-word-types"]], "Cada elemento debe tener la forma de “fácil de seguir”.", "Los tres elementos son un adjetivo más “de” y un infinitivo."],
  },
  {
    en: ["", "She enjoys painting landscapes and playing the piano.", [["She enjoys painting landscapes and to play the piano.", "mixed-verb-forms"], ["She enjoys painting landscapes and the piano is played by her.", "mixed-word-types"]], "Look at the form of the two activities.", "Both activities end in -ing."],
    es: ["", "Le gusta pintar paisajes y tocar el piano.", [["Le gusta pintar paisajes y el piano.", "mixed-word-types"], ["Le gusta pintar paisajes y tocando el piano.", "mixed-verb-forms"]], "Fíjate en la forma de las dos actividades.", "Las dos actividades son infinitivos."],
  },
  {
    en: ["", "The trip was long, tiring, and expensive.", [["The trip was long, tiring, and cost a lot of money.", "mixed-word-types"], ["The trip was long, tiring, and an expense.", "mixed-word-types"]], "What kind of word is each item in the list?", "All three items are adjectives."],
    es: ["", "El viaje fue largo, cansado y caro.", [["El viaje fue largo, cansado y costó mucho dinero.", "mixed-word-types"], ["El viaje fue largo, cansado y un gasto.", "mixed-word-types"]], "¿Qué clase de palabra es cada elemento de la serie?", "Los tres elementos son adjetivos."],
  },
  {
    en: ["", "Neither the rain nor the cold stopped the runners.", [["Neither the rain nor did the cold stop the runners.", "unbalanced-pair"], ["Neither the rain or the cold stopped the runners.", "unbalanced-pair"]], "“Neither” has a partner word. Which one?", "“Neither” pairs with “nor,” and both parts are nouns: “the rain” and “the cold.”"],
    es: ["", "Ni la lluvia ni el frío detuvieron a los corredores.", [["Ni la lluvia o el frío detuvieron a los corredores.", "unbalanced-pair"], ["Ni la lluvia ni hizo frío para detener a los corredores.", "unbalanced-pair"]], "“Ni” va en pareja. ¿Con qué palabra?", "“Ni” se repite, y las dos partes son sustantivos: “la lluvia” y “el frío”."],
  },
  {
    en: ["", "Leo wanted to see the whales, to visit the lighthouse, and to eat fresh fish.", [["Leo wanted to see the whales, visiting the lighthouse, and to eat fresh fish.", "mixed-verb-forms"], ["Leo wanted to see the whales, to visit the lighthouse, and fresh fish.", "mixed-word-types"]], "Look at how each item begins.", "All three items are “to” plus a verb."],
    es: ["", "Leo quería ver las ballenas, visitar el faro y comer pescado fresco.", [["Leo quería ver las ballenas, visitando el faro y comer pescado fresco.", "mixed-verb-forms"], ["Leo quería ver las ballenas, visitar el faro y pescado fresco.", "mixed-word-types"]], "Fíjate en la forma de cada elemento.", "Los tres elementos son infinitivos."],
  },
  {
    en: ["", "The speech was clear, convincing, and short.", [["The speech was clear, convincing, and didn't take long.", "mixed-word-types"], ["The speech was clear, convincingly, and short.", "mixed-word-types"]], "What kind of word is each item in the list?", "All three items are adjectives."],
    es: ["", "El discurso fue claro, convincente y breve.", [["El discurso fue claro, convincente y no duró mucho.", "mixed-word-types"], ["El discurso fue claro, convincentemente y breve.", "mixed-word-types"]], "¿Qué clase de palabra es cada elemento de la serie?", "Los tres elementos son adjetivos."],
  },
  {
    en: ["", "The job requires patience, skill, and creativity.", [["The job requires patience, skill, and being creative.", "mixed-word-types"], ["The job requires patience, being skilled, and creativity.", "mixed-word-types"]], "What kind of word is each item in the list?", "All three items are nouns."],
    es: ["", "El trabajo requiere paciencia, habilidad y creatividad.", [["El trabajo requiere paciencia, habilidad y ser creativo.", "mixed-word-types"], ["El trabajo requiere paciencia, ser hábil y creatividad.", "mixed-word-types"]], "¿Qué clase de palabra es cada elemento de la serie?", "Los tres elementos son sustantivos."],
  },
  {
    en: ["", "Both the teachers and the students voted for the change.", [["Both the teachers and also the students voted for the change.", "unbalanced-pair"], ["Both the teachers as well as the students voted for the change.", "unbalanced-pair"]], "“Both” has a partner word. Which one?", "“Both” pairs with “and,” with nothing extra."],
    es: ["", "Tanto los maestros como los estudiantes votaron por el cambio.", [["Tanto los maestros y los estudiantes votaron por el cambio.", "unbalanced-pair"], ["Tanto los maestros como también los estudiantes votaron por el cambio.", "unbalanced-pair"]], "“Tanto” va en pareja. ¿Con qué palabra?", "“Tanto” va con “como”, sin nada más."],
  },
];

const PARALLEL_FILL: Bi<Entry>[] = [
  {
    en: ["On weekends, Ana likes reading, drawing, and ___.", "cooking", [["to cook", "mixed-verb-forms"], ["she cooks", "mixed-word-types"]], "Look at the form of “reading” and “drawing.”", "Match the -ing form of the other two."],
    es: ["Los fines de semana, a Ana le gusta leer, dibujar y ___.", "cocinar", [["cocinando", "mixed-verb-forms"], ["la cocina", "mixed-word-types"]], "Fíjate en la forma de “leer” y “dibujar”.", "Usa la misma forma que las otras dos: infinitivo."],
  },
  {
    en: ["The coach asked us to warm up, to listen closely, and ___.", "to have fun", [["having fun", "mixed-verb-forms"], ["that we have fun", "mixed-word-types"]], "Look at how the first two items begin.", "Match “to” plus a verb."],
    es: ["El entrenador nos pidió calentar, escuchar con atención y ___.", "divertirnos", [["divirtiéndonos", "mixed-verb-forms"], ["que nos divirtiéramos", "mixed-word-types"]], "Fíjate en la forma de “calentar” y “escuchar”.", "Usa la misma forma: infinitivo."],
  },
  {
    en: ["The puppy was small, fluffy, and ___.", "playful", [["it played a lot", "mixed-word-types"], ["playing", "mixed-verb-forms"]], "What kind of word are “small” and “fluffy”?", "Match the adjectives."],
    es: ["El cachorro era pequeño, peludo y ___.", "juguetón", [["jugaba mucho", "mixed-word-types"], ["jugando", "mixed-verb-forms"]], "¿Qué clase de palabra son “pequeño” y “peludo”?", "Usa otro adjetivo."],
  },
  {
    en: ["The museum was not only interesting but also ___.", "free", [["it was free", "unbalanced-pair"], ["costing nothing", "mixed-verb-forms"]], "What kind of word comes after “not only”?", "“Interesting” is an adjective, so the second part needs an adjective too."],
    es: ["El museo no solo era interesante, sino también ___.", "gratuito", [["no costaba nada", "unbalanced-pair"], ["costando nada", "mixed-verb-forms"]], "¿Qué clase de palabra va después de “no solo era”?", "“Interesante” es un adjetivo, así que la segunda parte también."],
  },
  {
    en: ["To learn a language, you need patience, practice, and ___.", "courage", [["being brave", "mixed-word-types"], ["to be brave", "mixed-verb-forms"]], "What kind of word are “patience” and “practice”?", "Match the nouns."],
    es: ["Para aprender un idioma necesitas paciencia, práctica y ___.", "valor", [["ser valiente", "mixed-word-types"], ["siendo valiente", "mixed-verb-forms"]], "¿Qué clase de palabra son “paciencia” y “práctica”?", "Usa otro sustantivo."],
  },
  {
    en: ["We walked along the beach, collected shells, and ___.", "watched the sunset", [["watching the sunset", "mixed-verb-forms"], ["the sunset was watched", "mixed-word-types"]], "Look at the verbs “walked” and “collected.”", "Match the past-tense verb."],
    es: ["Caminamos por la playa, recogimos conchas y ___.", "vimos el atardecer", [["viendo el atardecer", "mixed-verb-forms"], ["el atardecer fue visto", "mixed-word-types"]], "Fíjate en los verbos “caminamos” y “recogimos”.", "Usa el mismo tiempo y la misma persona: pasado, nosotros."],
  },
  {
    en: ["Kai would rather walk to school than ___.", "ride the bus", [["riding the bus", "mixed-verb-forms"], ["the bus", "mixed-word-types"]], "Look at the form of “walk.”", "Match the plain verb: “walk” and “ride.”"],
    es: ["A Kai le gusta más caminar a la escuela que ___.", "ir en autobús", [["yendo en autobús", "mixed-verb-forms"], ["el autobús", "mixed-word-types"]], "Fíjate en la forma de “caminar”.", "Usa la misma forma: infinitivo."],
  },
  {
    en: ["The goals of the club are to plant trees, to clean parks, and ___.", "to teach recycling", [["teaching recycling", "mixed-verb-forms"], ["recycling should be taught", "mixed-word-types"]], "Look at how the first two goals begin.", "Match “to” plus a verb."],
    es: ["Las metas del club son plantar árboles, limpiar parques y ___.", "enseñar a reciclar", [["enseñando a reciclar", "mixed-verb-forms"], ["que se enseñe a reciclar", "mixed-word-types"]], "Fíjate en la forma de las dos primeras metas.", "Usa la misma forma: infinitivo."],
  },
  {
    en: ["The new phone is faster, lighter, and ___.", "cheaper", [["costs less", "mixed-word-types"], ["it is cheap", "mixed-word-types"]], "Look at the form of “faster” and “lighter.”", "Match the -er comparison."],
    es: ["El nuevo teléfono es más rápido, más ligero y ___.", "más barato", [["cuesta menos", "mixed-word-types"], ["es barato", "mixed-word-types"]], "Fíjate en la forma de “más rápido” y “más ligero”.", "Usa la misma forma: “más” más un adjetivo."],
  },
  {
    en: ["Either we finish the poster tonight, or ___.", "we finish it tomorrow", [["finishing it tomorrow", "mixed-verb-forms"], ["tomorrow is another option", "mixed-word-types"]], "Look at the form of the part after “either.”", "Both parts are a full clause: “we finish…”"],
    es: ["O terminamos el cartel esta noche, o ___.", "lo terminamos mañana", [["terminándolo mañana", "mixed-verb-forms"], ["mañana es otra opción", "mixed-word-types"]], "Fíjate en la forma de la primera opción.", "Las dos partes son oraciones con el mismo verbo: “terminamos”."],
  },
  {
    en: ["Grandma taught me how to knit, how to bake bread, and ___.", "how to fix a bike", [["fixing a bike", "mixed-verb-forms"], ["that bikes can be fixed", "mixed-word-types"]], "Look at how the first two items begin.", "Match “how to” plus a verb."],
    es: ["La abuela me enseñó a tejer, a hornear pan y ___.", "a arreglar una bicicleta", [["arreglando una bicicleta", "mixed-verb-forms"], ["que las bicicletas se arreglan", "mixed-word-types"]], "Fíjate en cómo empiezan los dos primeros elementos.", "Usa la misma forma: “a” más un infinitivo."],
  },
  {
    en: ["The storm knocked down trees, flooded streets, and ___.", "closed schools", [["closing schools", "mixed-verb-forms"], ["schools were closed", "mixed-word-types"]], "Look at the verbs “knocked” and “flooded.”", "Match the past-tense verb."],
    es: ["La tormenta tumbó árboles, inundó calles y ___.", "cerró escuelas", [["cerrando escuelas", "mixed-verb-forms"], ["las escuelas fueron cerradas", "mixed-word-types"]], "Fíjate en los verbos “tumbó” e “inundó”.", "Usa el mismo tiempo: pasado."],
  },
  {
    en: ["A good friend is honest, loyal, and ___.", "kind", [["treats you kindly", "mixed-word-types"], ["kindness", "mixed-word-types"]], "What part of speech are “honest” and “loyal”?", "Match the adjectives."],
    es: ["Un buen amigo es honesto, leal y ___.", "amable", [["te trata con amabilidad", "mixed-word-types"], ["la amabilidad", "mixed-word-types"]], "¿Qué clase de palabra son “honesto” y “leal”?", "Usa otro adjetivo."],
  },
  {
    en: ["Both the singer and ___ bowed at the end of the show.", "the drummer", [["also the drummer", "unbalanced-pair"], ["as well as the drummer", "unbalanced-pair"]], "“Both” pairs with “and.” What should come after “and”?", "Match “the singer” with a plain noun phrase and nothing extra."],
    es: ["Tanto la cantante como ___ saludaron al final del concierto.", "el baterista", [["también el baterista", "unbalanced-pair"], ["y el baterista", "unbalanced-pair"]], "“Tanto” va con “como”. ¿Qué debe seguir?", "Después de “como” va solo el sustantivo, sin palabras extra."],
  },
];

const PARALLEL = skill(
  { id: "e.parallel.structure", grade: "9", title: { en: "Parallel structure", es: "Estructura paralela" }, standard: "L.9-10.1a", prereqs: ["e.verbals"] },
  [
    {
      bank: PARALLEL_PICK,
      ask: { en: "Which sentence uses parallel structure?", es: "¿Qué oración tiene estructura paralela?" },
      hints: {
        en: ["Find the items in the list, or the two parts of the pair.", "Every item in a series, and both parts of a pair like “not only… but also” or “either… or,” should have the same form: all -ing words, all “to” verbs, all adjectives, or all nouns."],
        es: ["Busca los elementos de la serie o las dos partes del par.", "Todos los elementos de una serie, y las dos partes de pares como “no solo… sino también”, “tanto… como” o “ni… ni”, deben tener la misma forma: todos infinitivos, todos adjetivos o todos sustantivos."],
      },
      seconds: 25,
    },
    {
      bank: PARALLEL_FILL,
      ask: CHOOSE,
      hints: {
        en: ["Look at the form of the other items in the series or pair.", "Choose the answer with the same form: an -ing word with -ing words, a “to” verb with “to” verbs, an adjective with adjectives."],
        es: ["Fíjate en la forma de los demás elementos de la serie o del par.", "Elige la opción que tenga la misma forma: infinitivo con infinitivos, adjetivo con adjetivos, sustantivo con sustantivos."],
      },
      seconds: 15,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.semicolon.colon — level 1: semicolons (between related sentences, before "however" / "sin embargo"
// with a comma after it, and in series whose items already have commas); level 2: colons (before a list
// or an explanation after a complete sentence, in times; Spanish adds the colon after a letter's greeting,
// before a quotation, and a lowercase letter after the colon).

const SEMICOLONS: Bi<Entry>[] = [
  {
    en: ["", "The bus was late; we missed the first bell.", [["The bus was late, we missed the first bell.", "comma-splice"], ["The bus was late; because we missed the first bell.", "semicolon-before-fragment"], ["The bus was; late we missed the first bell.", "semicolon-wrong-place"]], "Are both parts complete sentences?", "Two closely related complete sentences can be joined with a semicolon; a comma alone cannot join them."],
    es: ["", "El autobús llegó tarde; perdimos el primer timbre.", [["El autobús llegó tarde; porque perdimos el primer timbre.", "semicolon-before-fragment"], ["El autobús; llegó tarde, perdimos el primer timbre.", "semicolon-wrong-place"]], "¿Las dos partes son oraciones completas?", "El punto y coma separa dos oraciones completas y relacionadas."],
  },
  {
    en: ["", "It rained all day; however, the game went on.", [["It rained all day, however, the game went on.", "comma-splice"], ["It rained all day; however the game went on.", "missing-comma-after-transition"]], "“However” joins two complete sentences here.", "Put a semicolon before “however” and a comma after it."],
    es: ["", "Llovió todo el día; sin embargo, el partido siguió.", [["Llovió todo el día; sin embargo el partido siguió.", "missing-comma-after-transition"], ["Llovió todo el día; sin embargo, el partido; siguió.", "semicolon-wrong-place"]], "“Sin embargo” une dos oraciones completas.", "Antes de “sin embargo” va punto y coma, y después, coma."],
  },
  {
    en: ["", "Ana loves science; her brother loves art.", [["Ana loves science, her brother loves art.", "comma-splice"], ["Ana loves science; and art.", "semicolon-before-fragment"]], "Are both parts complete sentences?", "Two closely related complete sentences can be joined with a semicolon."],
    es: ["", "Ana ama las ciencias; su hermano, el arte.", [["Ana ama las ciencias; y el arte.", "semicolon-before-fragment"], ["Ana ama; las ciencias, su hermano, el arte.", "semicolon-wrong-place"]], "Hay dos ideas completas; en la segunda, la coma reemplaza al verbo “ama”.", "El punto y coma separa las dos oraciones, y la coma marca el verbo que se omite."],
  },
  {
    en: ["", "We visited Austin, Texas; Tucson, Arizona; and Denver, Colorado.", [["We visited Austin, Texas, Tucson, Arizona, and Denver, Colorado.", "commas-in-complex-series"], ["We visited Austin; Texas, Tucson; Arizona, and Denver; Colorado.", "semicolon-wrong-place"]], "Each item in the list already has a comma inside it.", "When list items contain commas, semicolons separate the items."],
    es: ["", "Los equipos llegaron así: el primero, en autobús; el segundo, en tren, y el tercero, en avión.", [["Los equipos llegaron así: el primero, en autobús, el segundo, en tren, y el tercero, en avión.", "commas-in-complex-series"], ["Los equipos llegaron así: el primero; en autobús, el segundo; en tren, y el tercero; en avión.", "semicolon-wrong-place"]], "Cada elemento de la serie ya tiene una coma dentro.", "Cuando los elementos de una serie llevan coma, el punto y coma los separa."],
  },
  {
    en: ["", "The test will be hard; therefore, we are studying all week.", [["The test will be hard, therefore, we are studying all week.", "comma-splice"], ["The test will be hard; therefore, we are studying; all week.", "semicolon-wrong-place"]], "“Therefore” joins two complete sentences here.", "Put a semicolon before “therefore” and a comma after it."],
    es: ["", "Compré tres cosas: pan, leche y huevos.", [["Compré tres cosas; pan, leche y huevos.", "semicolon-for-colon"], ["Compré; tres cosas, pan, leche y huevos.", "semicolon-wrong-place"]], "Lo que sigue es una lista que explica “tres cosas”.", "Antes de una lista van dos puntos, no punto y coma."],
  },
  {
    en: ["", "The library was quiet; everyone was reading.", [["The library was quiet, everyone was reading.", "comma-splice"], ["The library was quiet; while everyone was reading.", "semicolon-before-fragment"]], "Are both parts complete sentences?", "Two closely related complete sentences can be joined with a semicolon."],
    es: ["", "El examen será difícil; por lo tanto, estamos estudiando toda la semana.", [["El examen será difícil; por lo tanto estamos estudiando toda la semana.", "missing-comma-after-transition"], ["El examen será difícil; por lo tanto, estamos estudiando; toda la semana.", "semicolon-wrong-place"]], "“Por lo tanto” une dos oraciones completas.", "Antes de “por lo tanto” va punto y coma, y después, coma."],
  },
  {
    en: ["", "Kenji forgot his lunch; luckily, Mia shared hers.", [["Kenji forgot his lunch, luckily, Mia shared hers.", "comma-splice"], ["Kenji forgot; his lunch, luckily, Mia shared hers.", "semicolon-wrong-place"]], "Are both parts complete sentences?", "Two complete sentences are joined with a semicolon, and “luckily” takes a comma."],
    es: ["", "Invitamos a Leo, nuestro vecino; a Rosa, su hermana, y a Sam, su primo.", [["Invitamos a Leo, nuestro vecino, a Rosa, su hermana, y a Sam, su primo.", "commas-in-complex-series"], ["Invitamos a Leo; nuestro vecino, a Rosa; su hermana, y a Sam; su primo.", "semicolon-wrong-place"]], "Cada elemento de la serie ya tiene una coma dentro.", "Cuando los elementos de una serie llevan coma, el punto y coma los separa."],
  },
  {
    en: ["", "The team practiced hard; as a result, they won the title.", [["The team practiced hard, as a result, they won the title.", "comma-splice"], ["The team practiced hard; as a result of practice.", "semicolon-before-fragment"]], "Is the part after the semicolon a complete sentence?", "A semicolon needs a complete sentence on each side."],
    es: ["", "La película era larga; aun así, nadie se fue antes.", [["La película era larga; aun así nadie se fue antes.", "missing-comma-after-transition"], ["La película era larga; aunque nadie se fue antes.", "semicolon-before-fragment"]], "“Aun así” une dos oraciones completas.", "Antes de “aun así” va punto y coma, y después, coma."],
  },
  {
    en: ["", "We invited Leo, our neighbor; Rosa, his sister; and Sam, their cousin.", [["We invited Leo, our neighbor, Rosa, his sister, and Sam, their cousin.", "commas-in-complex-series"], ["We invited Leo; our neighbor, Rosa; his sister, and Sam; their cousin.", "semicolon-wrong-place"]], "Each item in the list already has a comma inside it.", "When list items contain commas, semicolons separate the items."],
    es: ["", "Quería ir de excursión; sin embargo, hacía demasiado calor.", [["Quería ir de excursión; sin embargo hacía demasiado calor.", "missing-comma-after-transition"], ["Quería ir de excursión; sin embargo, hacía; demasiado calor.", "semicolon-wrong-place"]], "“Sin embargo” une dos oraciones completas.", "Antes de “sin embargo” va punto y coma, y después, coma."],
  },
  {
    en: ["", "The movie was long; still, nobody left early.", [["The movie was long, still, nobody left early.", "comma-splice"], ["The movie was long; although nobody left early.", "semicolon-before-fragment"]], "Is the part after the semicolon a complete sentence?", "Two complete sentences are joined with a semicolon, and “still” takes a comma."],
    es: ["", "Necesitamos tres materiales: cartulina, tijeras y pegamento.", [["Necesitamos tres materiales; cartulina, tijeras y pegamento.", "semicolon-for-colon"], ["Necesitamos; tres materiales: cartulina, tijeras y pegamento.", "semicolon-wrong-place"]], "Lo que sigue es una lista que explica “tres materiales”.", "Antes de una lista van dos puntos, no punto y coma."],
  },
  {
    en: ["", "I wanted to go hiking; however, it was too hot.", [["I wanted to go hiking, however, it was too hot.", "comma-splice"], ["I wanted to go hiking; however it was too hot.", "missing-comma-after-transition"]], "“However” joins two complete sentences here.", "Put a semicolon before “however” and a comma after it."],
    es: ["", "Kenji olvidó su almuerzo; por suerte, Mía compartió el suyo.", [["Kenji olvidó su almuerzo; por suerte Mía compartió el suyo.", "missing-comma-after-transition"], ["Kenji olvidó; su almuerzo, por suerte, Mía compartió el suyo.", "semicolon-wrong-place"]], "“Por suerte” une dos oraciones completas.", "Las dos oraciones se separan con punto y coma, y “por suerte” lleva coma después."],
  },
  {
    en: ["", "The concert sold out in minutes; many fans were disappointed.", [["The concert sold out in minutes, many fans were disappointed.", "comma-splice"], ["The concert sold out in minutes; disappointing many fans.", "semicolon-before-fragment"]], "Is the part after the semicolon a complete sentence?", "A semicolon needs a complete sentence on each side."],
    es: ["", "El concierto se agotó en minutos; muchos aficionados se quedaron sin boleto.", [["El concierto se agotó en minutos; dejando a muchos aficionados sin boleto.", "semicolon-before-fragment"], ["El concierto; se agotó en minutos, muchos aficionados se quedaron sin boleto.", "semicolon-wrong-place"]], "¿Lo que va después del punto y coma es una oración completa?", "El punto y coma necesita una oración completa a cada lado."],
  },
  {
    en: ["", "Dinner is ready; please wash your hands.", [["Dinner is ready, please wash your hands.", "comma-splice"], ["Dinner is; ready please wash your hands.", "semicolon-wrong-place"]], "Are both parts complete sentences?", "Two closely related complete sentences can be joined with a semicolon."],
    es: ["", "La carretera estaba congelada; no obstante, los autobuses llegaron a tiempo.", [["La carretera estaba congelada; no obstante los autobuses llegaron a tiempo.", "missing-comma-after-transition"], ["La carretera estaba congelada; aunque los autobuses llegaron a tiempo.", "semicolon-before-fragment"]], "“No obstante” une dos oraciones completas.", "Antes de “no obstante” va punto y coma, y después, coma."],
  },
  {
    en: ["", "The road was icy; however, the buses ran on time.", [["The road was icy, however, the buses ran on time.", "comma-splice"], ["The road was icy; however the buses ran on time.", "missing-comma-after-transition"]], "“However” joins two complete sentences here.", "Put a semicolon before “however” and a comma after it."],
    es: ["", "Los premios fueron estos: oro, para Lucía; plata, para Tomás, y bronce, para Inés.", [["Los premios fueron estos: oro, para Lucía, plata, para Tomás, y bronce, para Inés.", "commas-in-complex-series"], ["Los premios fueron estos; oro, para Lucía; plata, para Tomás, y bronce, para Inés.", "semicolon-for-colon"]], "Cada elemento de la serie ya tiene una coma dentro.", "Antes de la lista van dos puntos, y entre elementos que llevan coma, punto y coma."],
  },
];

const COLONS: Bi<Entry>[] = [
  {
    en: ["", "Bring three things to the field trip: a lunch, a water bottle, and a jacket.", [["Bring three things to the field trip; a lunch, a water bottle, and a jacket.", "semicolon-for-colon"], ["Bring: three things to the field trip, a lunch, a water bottle, and a jacket.", "colon-after-incomplete-clause"]], "Is there a complete sentence before the list?", "A complete sentence introduces the list, so a colon comes before it."],
    es: ["", "Querida abuela: Te escribo desde el campamento.", [["Querida abuela, te escribo desde el campamento.", "comma-after-greeting"], ["Querida abuela: te escribo desde el campamento.", "lowercase-after-greeting"]], "En español, ¿qué signo va después del saludo de una carta?", "Después del saludo de una carta van dos puntos, y el texto empieza con mayúscula, normalmente en la línea siguiente."],
  },
  {
    en: ["", "My favorite colors are blue, green, and orange.", [["My favorite colors are: blue, green, and orange.", "colon-after-incomplete-clause"], ["My favorite: colors are blue, green, and orange.", "colon-wrong-place"]], "Is “My favorite colors are” a complete sentence by itself?", "No colon goes between a verb and the words that complete it."],
    es: ["", "Mis colores favoritos son el azul, el verde y el naranja.", [["Mis colores favoritos son: el azul, el verde y el naranja.", "colon-after-incomplete-clause"], ["Mis colores favoritos: son el azul, el verde y el naranja.", "colon-wrong-place"]], "¿“Mis colores favoritos son” es una oración completa?", "No se ponen dos puntos entre el verbo y lo que lo completa."],
  },
  {
    en: ["", "The coach had one rule: respect for every player.", [["The coach had one rule; respect for every player.", "semicolon-for-colon"], ["The coach had: one rule, respect for every player.", "colon-after-incomplete-clause"]], "The words at the end explain what the rule is.", "A colon after a complete sentence introduces the explanation."],
    es: ["", "Mi abuela siempre dice: “Más vale tarde que nunca”.", [["Mi abuela siempre dice, “Más vale tarde que nunca”.", "missing-colon-before-quote"], ["Mi abuela siempre: dice “Más vale tarde que nunca”.", "colon-wrong-place"]], "En español, ¿qué signo va antes de una cita textual?", "Antes de reproducir las palabras exactas de alguien van dos puntos."],
  },
  {
    en: ["", "We need flour, eggs, and sugar for the cake.", [["We need: flour, eggs, and sugar for the cake.", "colon-after-incomplete-clause"], ["We need flour: eggs, and sugar for the cake.", "colon-wrong-place"]], "Is “We need” a complete sentence by itself?", "No colon goes between a verb and the words that complete it."],
    es: ["", "Necesito tres cosas para la excursión: almuerzo, agua y una chaqueta.", [["Necesito tres cosas para la excursión: Almuerzo, agua y una chaqueta.", "capital-after-colon"], ["Necesito: tres cosas para la excursión, almuerzo, agua y una chaqueta.", "colon-after-incomplete-clause"]], "Después de los dos puntos, ¿la lista empieza con mayúscula o minúscula?", "Antes de la lista van dos puntos, y la lista sigue con minúscula."],
  },
  {
    en: ["", "The answer was obvious: the dog had eaten the cookies.", [["The answer was obvious, the dog had eaten the cookies.", "comma-splice"], ["The answer was: obvious the dog had eaten the cookies.", "colon-wrong-place"]], "The second part explains what the answer was.", "A colon after a complete sentence can introduce an explanation."],
    es: ["", "La respuesta era clara: el perro se había comido las galletas.", [["La respuesta era clara: El perro se había comido las galletas.", "capital-after-colon"], ["La respuesta era: clara el perro se había comido las galletas.", "colon-wrong-place"]], "Después de los dos puntos, ¿se sigue con mayúscula o minúscula?", "Los dos puntos introducen la explicación, que sigue con minúscula."],
  },
  {
    en: ["", "The recipe calls for two spices: cinnamon and nutmeg.", [["The recipe calls for: two spices, cinnamon and nutmeg.", "colon-after-incomplete-clause"], ["The recipe: calls for two spices, cinnamon and nutmeg.", "colon-wrong-place"]], "Is there a complete sentence before the list?", "A complete sentence introduces the list, so a colon comes before it."],
    es: ["", "Estimado señor Díaz: Le escribo para pedirle información.", [["Estimado señor Díaz, le escribo para pedirle información.", "comma-after-greeting"], ["Estimado: señor Díaz, le escribo para pedirle información.", "colon-wrong-place"]], "En español, ¿qué signo va después del saludo de una carta?", "Después del saludo de una carta van dos puntos, y el texto empieza con mayúscula."],
  },
  {
    en: ["", "The store sells three kinds of apples: Fuji, Gala, and Granny Smith.", [["The store sells three kinds of apples; Fuji, Gala, and Granny Smith.", "semicolon-for-colon"], ["The store sells: three kinds of apples, Fuji, Gala, and Granny Smith.", "colon-after-incomplete-clause"]], "Is there a complete sentence before the list?", "A complete sentence introduces the list, so a colon comes before it."],
    es: ["", "La tienda vende tres frutas: mangos, papayas y guayabas.", [["La tienda vende tres frutas; mangos, papayas y guayabas.", "semicolon-for-colon"], ["La tienda vende: tres frutas, mangos, papayas y guayabas.", "colon-after-incomplete-clause"]], "¿Hay una oración completa antes de la lista?", "Una oración completa anuncia la lista, así que van dos puntos."],
  },
  {
    en: ["", "Our class has visited many places, such as the zoo, the museum, and the aquarium.", [["Our class has visited many places, such as: the zoo, the museum, and the aquarium.", "colon-after-incomplete-clause"], ["Our class has visited many places; such as the zoo, the museum, and the aquarium.", "semicolon-for-colon"]], "Does “such as” need any mark after it?", "No colon goes after “such as”; the examples follow it directly."],
    es: ["", "El entrenador repetía siempre: “Respeta a cada jugador”.", [["El entrenador repetía siempre, “Respeta a cada jugador”.", "missing-colon-before-quote"], ["El entrenador repetía siempre “Respeta a cada jugador”.", "missing-colon-before-quote"]], "En español, ¿qué signo va antes de una cita textual?", "Antes de reproducir las palabras exactas de alguien van dos puntos."],
  },
  {
    en: ["", "There is only one way to get better: practice.", [["There is only one way to get better; practice.", "semicolon-for-colon"], ["There is: only one way to get better, practice.", "colon-after-incomplete-clause"]], "The last word explains what the one way is.", "A colon after a complete sentence introduces the explanation."],
    es: ["", "Solo hay una forma de mejorar: practicar.", [["Solo hay una forma de mejorar; practicar.", "semicolon-for-colon"], ["Solo hay: una forma de mejorar, practicar.", "colon-after-incomplete-clause"]], "La última palabra explica cuál es la forma.", "Los dos puntos después de una oración completa introducen la explicación."],
  },
  {
    en: ["", "The meeting is at 3:30 p.m.", [["The meeting is at 3;30 p.m.", "semicolon-for-colon"], ["The meeting is at: 3:30 p.m.", "colon-after-incomplete-clause"]], "Which mark separates hours from minutes?", "A colon separates the hour from the minutes."],
    es: ["", "La reunión es a las 3:30 p. m.", [["La reunión es a las 3;30 p. m.", "semicolon-for-colon"], ["La reunión es a las: 3:30 p. m.", "colon-after-incomplete-clause"]], "¿Qué signo separa las horas de los minutos?", "Los dos puntos separan la hora de los minutos."],
  },
  {
    en: ["", "The trail had one problem: it was covered in ice.", [["The trail had one problem, it was covered in ice.", "comma-splice"], ["The trail had: one problem, it was covered in ice.", "colon-after-incomplete-clause"]], "The second part explains what the problem was.", "A colon after a complete sentence introduces the explanation."],
    es: ["", "El sendero tenía un problema: estaba cubierto de hielo.", [["El sendero tenía un problema: Estaba cubierto de hielo.", "capital-after-colon"], ["El sendero tenía: un problema, estaba cubierto de hielo.", "colon-after-incomplete-clause"]], "Después de los dos puntos, ¿se sigue con mayúscula o minúscula?", "Los dos puntos introducen la explicación, que sigue con minúscula."],
  },
  {
    en: ["", "Please bring the following supplies: glue, scissors, and markers.", [["Please bring the following supplies; glue, scissors, and markers.", "semicolon-for-colon"], ["Please bring: the following supplies, glue, scissors, and markers.", "colon-after-incomplete-clause"]], "Is there a complete sentence before the list?", "A complete sentence introduces the list, so a colon comes before it."],
    es: ["", "Traigan los siguientes materiales: pegamento, tijeras y marcadores.", [["Traigan los siguientes materiales; pegamento, tijeras y marcadores.", "semicolon-for-colon"], ["Traigan: los siguientes materiales, pegamento, tijeras y marcadores.", "colon-after-incomplete-clause"]], "¿Hay una oración completa antes de la lista?", "Una oración completa anuncia la lista, así que van dos puntos."],
  },
  {
    en: ["", "The kit includes a map, a compass, and a whistle.", [["The kit includes: a map, a compass, and a whistle.", "colon-after-incomplete-clause"], ["The kit includes a map: a compass, and a whistle.", "colon-wrong-place"]], "Is “The kit includes” a complete sentence by itself?", "No colon goes between a verb and the words that complete it."],
    es: ["", "Querido Tomás: Gracias por tu carta.", [["Querido Tomás, gracias por tu carta.", "comma-after-greeting"], ["Querido Tomás: gracias por tu carta.", "lowercase-after-greeting"]], "En español, ¿qué signo va después del saludo de una carta, y cómo empieza el texto?", "Después del saludo van dos puntos, y el texto empieza con mayúscula."],
  },
  {
    en: ["", "Mia had a clear goal: to finish the marathon.", [["Mia had a clear goal; to finish the marathon.", "semicolon-for-colon"], ["Mia had: a clear goal, to finish the marathon.", "colon-after-incomplete-clause"]], "The end of the sentence explains what the goal was.", "A colon after a complete sentence introduces the explanation."],
    es: ["", "El equipo tenía una meta clara: terminar el maratón.", [["El equipo tenía una meta clara; terminar el maratón.", "semicolon-for-colon"], ["El equipo tenía una meta clara: Terminar el maratón.", "capital-after-colon"]], "La última parte explica cuál era la meta.", "Los dos puntos introducen la explicación, que sigue con minúscula."],
  },
];

const SEMICOLON_COLON = skill(
  { id: "e.semicolon.colon", grade: "9", title: { en: "Semicolons and colons", es: "Punto y coma y dos puntos" }, standard: "L.9-10.2a", prereqs: ["e.combining.sentences"] },
  [
    {
      bank: SEMICOLONS,
      ask: PUNCTUATED,
      hints: {
        en: ["Are there two complete sentences, or a list whose items already contain commas?", "A semicolon joins two closely related complete sentences, and goes before words like “however” when they join two sentences, with a comma after. It also separates list items that already have commas. A comma alone cannot join two sentences."],
        es: ["¿Hay dos oraciones completas relacionadas, o una serie cuyos elementos ya llevan coma?", "El punto y coma separa oraciones relacionadas, va antes de conectores como “sin embargo” o “por lo tanto” (que llevan coma después) y separa elementos de una serie que ya tienen coma. Antes de una lista no va punto y coma: van dos puntos."],
      },
      seconds: 25,
    },
    {
      bank: COLONS,
      ask: PUNCTUATED,
      hints: {
        en: ["Is there a complete sentence before the colon?", "Use a colon after a complete sentence to introduce a list, an example, or an explanation, and between hours and minutes. Do not put a colon right after a verb or after “such as.”"],
        es: ["¿Qué introducen los dos puntos: una lista, una cita, una explicación o el texto de una carta?", "Van dos puntos después del saludo de una carta, antes de una cita textual y antes de una lista o una explicación. No van entre el verbo y lo que lo completa. Después de ellos se sigue con minúscula, salvo en el texto de una carta o en una cita."],
      },
      seconds: 25,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.dependent.clauses — noun, relative and adverbial clauses (Spanish: subordinadas sustantivas,
// adjetivas o de relativo, y adverbiales). "That" / "que" can start a noun clause or a relative clause,
// and Spanish "si" can start a noun clause (preguntó si…) or a condition, so both appear on purpose.

type ClauseKind = "noun" | "relative" | "adverbial";
const CLAUSE_KIND = cats<ClauseKind>(
  {
    en: { noun: "Noun clause", relative: "Relative (adjective) clause", adverbial: "Adverbial clause" },
    es: { noun: "Sustantiva", relative: "Adjetiva (de relativo)", adverbial: "Adverbial" },
  },
  { en: ["noun", "relative", "adverbial"], es: ["noun", "relative", "adverbial"] },
  [
    {
      en: ["I know that the bus will be late.", "noun", "Ask: what do I know?", "The clause is the object of “know,” so it is a noun clause.", "that the bus will be late"],
      es: ["Sé que el autobús va a llegar tarde.", "noun", "Pregúntate: ¿qué sé?", "La subordinada es el complemento de “sé”: es sustantiva.", "que el autobús va a llegar tarde"],
    },
    {
      en: ["The book that I borrowed is overdue.", "relative", "Ask: which book?", "The clause describes “the book,” so it is a relative clause.", "that I borrowed"],
      es: ["El libro que pedí prestado está vencido.", "relative", "Pregúntate: ¿cuál libro?", "Describe a “el libro”: es adjetiva o de relativo.", "que pedí prestado"],
    },
    {
      en: ["We stayed inside because it was raining.", "adverbial", "Ask: why did we stay inside?", "The clause tells why, so it is an adverbial clause.", "because it was raining"],
      es: ["Nos quedamos adentro porque estaba lloviendo.", "adverbial", "Pregúntate: ¿por qué nos quedamos adentro?", "Dice por qué: es adverbial.", "porque estaba lloviendo"],
    },
    {
      en: ["Whoever finishes first can choose the game.", "noun", "Ask: who can choose the game?", "The clause is the subject, so it is a noun clause.", "Whoever finishes first"],
      es: ["Quien termine primero puede elegir el juego.", "noun", "Pregúntate: ¿quién puede elegir el juego?", "Es el sujeto de la oración: es sustantiva.", "Quien termine primero"],
    },
    {
      en: ["Mia, who loves astronomy, joined the science club.", "relative", "The clause gives information about Mia.", "It describes a noun and starts with “who,” so it is a relative clause.", "who loves astronomy"],
      es: ["Mía, que ama la astronomía, entró al club de ciencias.", "relative", "La subordinada da información sobre Mía.", "Describe a un sustantivo y empieza con “que”: es adjetiva o de relativo.", "que ama la astronomía"],
    },
    {
      en: ["When the bell rang, everyone ran outside.", "adverbial", "Ask: when did everyone run outside?", "The clause tells when, so it is an adverbial clause.", "When the bell rang"],
      es: ["Cuando sonó el timbre, todos salieron corriendo.", "adverbial", "Pregúntate: ¿cuándo salieron todos?", "Dice cuándo: es adverbial.", "Cuando sonó el timbre"],
    },
    {
      en: ["What you said surprised me.", "noun", "Ask: what surprised me?", "The clause is the subject, so it is a noun clause.", "What you said"],
      es: ["Me sorprendió lo que dijiste.", "noun", "Pregúntate: ¿qué me sorprendió?", "Es el sujeto de “sorprendió”: es sustantiva.", "lo que dijiste"],
    },
    {
      en: ["The town where my grandmother grew up is near the ocean.", "relative", "Ask: which town?", "The clause describes “the town,” so it is a relative clause.", "where my grandmother grew up"],
      es: ["El pueblo donde creció mi abuela está cerca del mar.", "relative", "Pregúntate: ¿cuál pueblo?", "Describe a “el pueblo”: es adjetiva o de relativo.", "donde creció mi abuela"],
    },
    {
      en: ["If it snows tomorrow, school will close.", "adverbial", "Ask: under what condition will school close?", "The clause gives a condition, so it is an adverbial clause.", "If it snows tomorrow"],
      es: ["Si nieva mañana, no habrá clases.", "adverbial", "Pregúntate: ¿con qué condición no habrá clases?", "Pone una condición: es adverbial.", "Si nieva mañana"],
    },
    {
      en: ["The coach asked whether we were ready.", "noun", "Ask: what did the coach ask?", "The clause is the object of “asked,” so it is a noun clause.", "whether we were ready"],
      es: ["El entrenador preguntó si estábamos listos.", "noun", "Pregúntate: ¿qué preguntó el entrenador?", "Es el complemento de “preguntó”: es sustantiva. Aquí “si” no pone una condición.", "si estábamos listos"],
    },
    {
      en: ["The dog that lives next door barks at night.", "relative", "Ask: which dog?", "The clause describes “the dog,” so it is a relative clause.", "that lives next door"],
      es: ["El perro que vive al lado ladra de noche.", "relative", "Pregúntate: ¿cuál perro?", "Describe a “el perro”: es adjetiva o de relativo.", "que vive al lado"],
    },
    {
      en: ["Although it was cold, we swam in the lake.", "adverbial", "The clause sets up a contrast with the main idea.", "It tells under what circumstances we swam, so it is an adverbial clause.", "Although it was cold"],
      es: ["Aunque hacía frío, nadamos en el lago.", "adverbial", "La subordinada plantea un contraste con la idea principal.", "Dice en qué circunstancia nadamos: es adverbial.", "Aunque hacía frío"],
    },
    {
      en: ["My hope is that everyone passes the test.", "noun", "Ask: what is my hope?", "The clause renames the subject after “is,” so it works as a noun.", "that everyone passes the test"],
      es: ["Quiero que vengas a mi fiesta.", "noun", "Pregúntate: ¿qué quiero?", "Es el complemento de “quiero”: es sustantiva.", "que vengas a mi fiesta"],
    },
    {
      en: ["The scientist whose experiment won the prize spoke at our school.", "relative", "Ask: which scientist?", "The clause describes “the scientist,” so it is a relative clause.", "whose experiment won the prize"],
      es: ["La científica cuyo experimento ganó el premio habló en nuestra escuela.", "relative", "Pregúntate: ¿cuál científica?", "Describe a “la científica”: es adjetiva o de relativo.", "cuyo experimento ganó el premio"],
    },
    {
      en: ["Leo practiced until his fingers hurt.", "adverbial", "Ask: how long did Leo practice?", "The clause tells how long, so it is an adverbial clause.", "until his fingers hurt"],
      es: ["Leo practicó hasta que le dolieron los dedos.", "adverbial", "Pregúntate: ¿hasta cuándo practicó Leo?", "Dice hasta cuándo: es adverbial.", "hasta que le dolieron los dedos"],
    },
  ],
);

const DEPENDENT_CLAUSES = skill(
  { id: "e.dependent.clauses", grade: "9", title: { en: "Noun, relative, and adverbial clauses", es: "Subordinadas sustantivas, adjetivas y adverbiales" }, standard: "L.9-10.1b", prereqs: ["e.phrases.clauses"] },
  [
    {
      ...CLAUSE_KIND,
      ask: { en: "What kind of clause is {t}?", es: "¿Qué tipo de subordinada es {t}?" },
      hints: {
        en: ["What job does the clause do in the sentence?", "A noun clause works as a subject or object (what? who?). A relative clause describes a noun and usually starts with who, whose, which, that, or where. An adverbial clause tells when, why, how long, or under what condition, with words like because, when, if, until, or although."],
        es: ["¿Qué función cumple la subordinada en la oración?", "La sustantiva funciona como sujeto o complemento (¿qué?, ¿quién?). La adjetiva o de relativo describe a un sustantivo y empieza con que, quien, cuyo o donde. La adverbial dice cuándo, por qué, hasta cuándo o con qué condición: porque, cuando, si, hasta que, aunque."],
      },
      seconds: 20,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.tone — the writer's attitude, read from word choice and details. Tags: opposite-tone,
// unsupported-tone (a tone the words do not show), overlooked-word-choice (called it neutral).

const TONES: Bi<Entry>[] = [
  {
    en: ["The new playground is finally here, and it is wonderful: three slides, a climbing wall, and shade for parents. Our neighborhood waited years for this, and it was worth every day.", "enthusiastic", [["bitter", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Look at words like “finally,” “wonderful,” and “worth every day.”", "Those words show excitement and approval."],
    es: ["Por fin tenemos el nuevo parque, y es maravilloso: tres toboganes, un muro para escalar y sombra para las familias. El barrio esperó años, y valió cada día.", "entusiasta", [["amargo", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Fíjate en palabras como “por fin”, “maravilloso” y “valió cada día”.", "Esas palabras muestran emoción y aprobación."],
  },
  {
    en: ["Once again, the city has promised to fix the potholes on Elm Street. Once again, nothing has happened. Maybe the potholes will fix themselves before the city does.", "sarcastic and frustrated", [["hopeful", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Notice the repeated “Once again” and the joke in the last sentence.", "The writer mocks the city's broken promises."],
    es: ["Otra vez la ciudad prometió arreglar los baches de la calle Olmo. Otra vez no pasó nada. Tal vez los baches se arreglen solos antes que la ciudad.", "sarcástico y frustrado", [["esperanzado", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Fíjate en el “Otra vez” repetido y en la broma de la última oración.", "Quien escribe se burla de las promesas incumplidas de la ciudad."],
  },
  {
    en: ["The museum is open Tuesday through Sunday from 10 a.m. to 5 p.m. Admission is free for students with an ID. Guided tours begin every hour.", "neutral and informative", [["excited", "unsupported-tone"], ["annoyed", "unsupported-tone"]], "Are there any words that show feelings, or only facts?", "The passage gives facts without opinions or feelings."],
    es: ["El museo abre de martes a domingo, de 10 a. m. a 5 p. m. La entrada es gratuita para estudiantes con credencial. Las visitas guiadas empiezan cada hora.", "neutral e informativo", [["emocionado", "unsupported-tone"], ["molesto", "unsupported-tone"]], "¿Hay palabras que muestren sentimientos, o solo datos?", "El texto da datos sin opiniones ni sentimientos."],
  },
  {
    en: ["I still remember the smell of my grandfather's workshop: sawdust, oil, and coffee. I miss the way he hummed while he worked, and I wish I had asked him more questions.", "nostalgic", [["cheerful", "unsupported-tone"], ["neutral", "overlooked-word-choice"]], "Look at “I still remember,” “I miss,” and “I wish.”", "The writer looks back with longing."],
    es: ["Todavía recuerdo el olor del taller de mi abuelo: aserrín, aceite y café. Extraño cómo tarareaba mientras trabajaba, y ojalá le hubiera hecho más preguntas.", "nostálgico", [["alegre", "unsupported-tone"], ["neutral", "overlooked-word-choice"]], "Fíjate en “todavía recuerdo”, “extraño” y “ojalá”.", "Quien escribe recuerda el pasado con añoranza."],
  },
  {
    en: ["Students, the fire alarm is not a toy. Pulling it as a prank puts everyone in danger and wastes the firefighters' time. This must stop now.", "serious and stern", [["playful", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Look at “not a toy,” “danger,” and “must stop now.”", "The writer is firm and warns the reader."],
    es: ["Estudiantes: la alarma de incendios no es un juguete. Activarla como broma pone en peligro a todos y les quita tiempo a los bomberos. Esto tiene que parar ya.", "serio y severo", [["juguetón", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Fíjate en “no es un juguete”, “peligro” y “tiene que parar ya”.", "Quien escribe es firme y advierte al lector."],
  },
  {
    en: ["Our cat believes she is the queen of the house. Every morning she inspects her kingdom, yells at the toaster, and demands breakfast as if we were her servants.", "humorous", [["angry", "unsupported-tone"], ["neutral", "overlooked-word-choice"]], "Picture a cat yelling at a toaster. Is the writer upset or amused?", "The writer exaggerates the cat's behavior to make readers laugh."],
    es: ["Nuestra gata cree que es la reina de la casa. Cada mañana inspecciona su reino, le maúlla al tostador y exige su desayuno como si fuéramos sus sirvientes.", "humorístico", [["enojado", "unsupported-tone"], ["neutral", "overlooked-word-choice"]], "Imagina a una gata regañando al tostador. ¿Quien escribe está molesto o divertido?", "Quien escribe exagera la conducta de la gata para hacer reír."],
  },
  {
    en: ["Thousands of volunteers showed up after the flood. Strangers carried sandbags side by side and shared food from their own kitchens. In the worst week, our town was at its best.", "admiring", [["critical", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Look at the last sentence: “our town was at its best.”", "The writer praises how people helped each other."],
    es: ["Miles de voluntarios llegaron después de la inundación. Desconocidos cargaron costales de arena hombro con hombro y compartieron la comida de sus propias cocinas. En la peor semana, nuestro pueblo dio lo mejor de sí.", "admirativo", [["crítico", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Fíjate en la última oración: “nuestro pueblo dio lo mejor de sí”.", "Quien escribe elogia cómo la gente se ayudó."],
  },
  {
    en: ["The coach said the bus would leave at 7:00. We were there at 6:45. The bus showed up at 8:30. Nobody called. Nobody apologized.", "frustrated", [["grateful", "opposite-tone"], ["joyful", "unsupported-tone"]], "Notice the short, flat sentences at the end: “Nobody called. Nobody apologized.”", "The clipped sentences show the writer's annoyance."],
    es: ["El entrenador dijo que el autobús saldría a las 7:00. Llegamos a las 6:45. El autobús apareció a las 8:30. Nadie llamó. Nadie se disculpó.", "frustrado", [["agradecido", "opposite-tone"], ["alegre", "unsupported-tone"]], "Fíjate en las oraciones cortas del final: “Nadie llamó. Nadie se disculpó”.", "Las oraciones cortantes muestran el enojo de quien escribe."],
  },
  {
    en: ["The cave was silent except for the drip of water somewhere in the dark. My flashlight flickered. Something shifted in the shadows ahead.", "suspenseful", [["cheerful", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Look at “silent,” “flickered,” and “something shifted in the shadows.”", "The details build tension and make the reader wonder what will happen."],
    es: ["La cueva estaba en silencio, salvo por el goteo del agua en algún lugar oscuro. Mi linterna parpadeó. Algo se movió entre las sombras.", "de suspenso", [["alegre", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Fíjate en “silencio”, “parpadeó” y “algo se movió entre las sombras”.", "Los detalles crean tensión y hacen que el lector se pregunte qué pasará."],
  },
  {
    en: ["Some people say the new schedule is confusing. They have a point: the bell times changed twice this year. Still, a later start gives students more sleep, and that matters.", "balanced and thoughtful", [["angry", "unsupported-tone"], ["silly", "unsupported-tone"]], "Does the writer consider the other side before giving a view?", "The writer admits a fair point and then explains a reason calmly."],
    es: ["Algunos dicen que el nuevo horario es confuso. Tienen algo de razón: el horario del timbre cambió dos veces este año. Aun así, entrar más tarde da a los estudiantes más horas de sueño, y eso importa.", "equilibrado y reflexivo", [["enojado", "unsupported-tone"], ["burlón", "unsupported-tone"]], "¿Quien escribe considera la otra postura antes de dar su opinión?", "Reconoce un punto justo y luego explica una razón con calma."],
  },
  {
    en: ["What a great idea it was to schedule the outdoor concert during hurricane season. I'm sure the band loved playing in the rain.", "sarcastic", [["sincere", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Is planning an outdoor concert in hurricane season really a great idea?", "The writer says the opposite of what they mean to criticize the plan."],
    es: ["Qué gran idea fue programar el concierto al aire libre en temporada de huracanes. Seguro que a la banda le encantó tocar bajo la lluvia.", "sarcástico", [["sincero", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "¿De verdad es una gran idea un concierto al aire libre en temporada de huracanes?", "Quien escribe dice lo contrario de lo que piensa para criticar el plan."],
  },
  {
    en: ["Thank you, Ms. Ruiz, for staying late every Thursday to help us with algebra. Because of you, I finally believe I can do math.", "grateful", [["resentful", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Look at “Thank you” and “Because of you.”", "The writer thanks the teacher warmly."],
    es: ["Gracias, maestra Ruiz, por quedarse tarde cada jueves para ayudarnos con álgebra. Gracias a usted, por fin creo que puedo con las matemáticas.", "agradecido", [["resentido", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Fíjate en “Gracias” y “Gracias a usted”.", "Quien escribe le da las gracias a la maestra con cariño."],
  },
  {
    en: ["The empty field behind the school used to be full of kids every afternoon. Now the swings rust, the grass grows wild, and no one comes.", "melancholy", [["cheerful", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Compare “used to be full of kids” with “no one comes.”", "The contrast between then and now creates a sad, wistful tone."],
    es: ["El terreno detrás de la escuela antes se llenaba de niños cada tarde. Ahora los columpios se oxidan, el pasto crece sin control y ya nadie va.", "melancólico", [["alegre", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Compara “antes se llenaba de niños” con “ya nadie va”.", "El contraste entre antes y ahora crea un tono triste."],
  },
  {
    en: ["Recycling is not optional anymore. Our landfill will be full in ten years. Every family on this street needs to start sorting its trash today.", "urgent", [["relaxed", "opposite-tone"], ["humorous", "unsupported-tone"]], "Look at “not optional anymore,” “ten years,” and “today.”", "The writer pushes readers to act right away."],
    es: ["Reciclar ya no es opcional. Nuestro relleno sanitario estará lleno en diez años. Cada familia de esta calle tiene que empezar a separar su basura hoy.", "urgente", [["relajado", "opposite-tone"], ["humorístico", "unsupported-tone"]], "Fíjate en “ya no es opcional”, “diez años” y “hoy”.", "Quien escribe empuja a actuar de inmediato."],
  },
];

const TONE = skill(
  { id: "e.tone", grade: "9", title: { en: "Tone and word choice", es: "Tono y elección de palabras" }, standard: "RL.9-10.4", prereqs: ["e.connotation"] },
  [
    {
      bank: TONES,
      ask: { en: "Which word best describes the writer's tone?", es: "¿Qué palabra describe mejor el tono de quien escribe?" },
      hints: {
        en: ["Tone is the writer's attitude toward the subject. Which words show feeling?", "List the strongest words and details. Do they sound approving, critical, joking, worried, or neutral?"],
        es: ["El tono es la actitud de quien escribe hacia el tema. ¿Qué palabras muestran sentimientos?", "Haz una lista de las palabras y los detalles más fuertes. ¿Suenan a aprobación, crítica, broma, preocupación o neutralidad?"],
      },
      seconds: 40,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.audience.purpose — level 1: the main purpose (to inform, to persuade, to entertain); level 2: the
// version that fits the audience and the purpose. Tags: too-technical, too-casual, too-formal,
// off-purpose.

type Purpose = "inform" | "persuade" | "entertain";
const PURPOSES: readonly Purpose[] = ["inform", "persuade", "entertain"];
const PURPOSE_KIND = cats<Purpose>(
  { en: { inform: "To inform", persuade: "To persuade", entertain: "To entertain" }, es: { inform: "Informar", persuade: "Persuadir", entertain: "Entretener" } },
  { en: PURPOSES, es: PURPOSES },
  [
    {
      en: ["Honeybees communicate by dancing. A bee that finds flowers returns to the hive and performs a “waggle dance” that shows the other bees which direction to fly and how far to go.", "inform", "Does the writer give an opinion or ask you to do anything?", "The passage gives facts and explains them."],
      es: ["Las abejas melíferas se comunican bailando. Una abeja que encuentra flores regresa a la colmena y hace una danza que les indica a las demás en qué dirección volar y qué tan lejos ir.", "inform", "¿Quien escribe da una opinión o te pide hacer algo?", "El texto da datos y los explica."],
    },
    {
      en: ["Our school should start a composting program. It would cut the cafeteria's trash in half and give the garden club free fertilizer. Sign the petition at the front office this week.", "persuade", "Look for “should” and the request at the end.", "The writer wants readers to agree and sign."],
      es: ["Nuestra escuela debería empezar un programa de composta. Reduciría a la mitad la basura de la cafetería y le daría abono gratis al club de jardinería. Firma la petición en la dirección esta semana.", "persuade", "Fíjate en “debería” y en la petición del final.", "Quien escribe quiere que el lector esté de acuerdo y firme."],
    },
    {
      en: ["When my little brother tried to make pancakes, he used salt instead of sugar. The dog took one bite, sneezed, and walked away with great dignity.", "entertain", "Is this a funny story or a set of facts?", "The writer tells a funny story for enjoyment."],
      es: ["Cuando mi hermanito intentó hacer panqueques, usó sal en vez de azúcar. El perro probó un bocado, estornudó y se fue con mucha dignidad.", "entertain", "¿Es una historia graciosa o una lista de datos?", "Quien escribe cuenta una historia graciosa para divertir."],
    },
    {
      en: ["The Great Wall of China was built over many centuries by different dynasties. It is not one single wall but a series of walls and fortifications.", "inform", "Does the writer give an opinion or ask you to do anything?", "The passage gives facts and explains them."],
      es: ["La Gran Muralla China se construyó durante muchos siglos, bajo distintas dinastías. No es un solo muro, sino una serie de murallas y fortificaciones.", "inform", "¿Quien escribe da una opinión o te pide hacer algo?", "El texto da datos y los explica."],
    },
    {
      en: ["Every student deserves a library that is open after school. Working parents cannot always pick kids up at three, and a safe place to read beats an empty house. Tell the school board to extend library hours.", "persuade", "Look for “deserves” and the request at the end.", "The writer wants readers to push for longer hours."],
      es: ["Todo estudiante merece una biblioteca abierta después de clases. Muchas familias que trabajan no pueden recoger a sus hijos a las tres, y un lugar seguro para leer es mejor que una casa vacía. Pídanle a la junta escolar que amplíe el horario.", "persuade", "Fíjate en “merece” y en la petición del final.", "Quien escribe quiere que el lector pida un horario más largo."],
    },
    {
      en: ["The squirrel had a plan. He would sneak past the dog, grab the biggest pinecone in the yard, and become a legend. The dog, unfortunately, had a plan too.", "entertain", "Is this a story or a set of facts?", "The writer tells a playful story for enjoyment."],
      es: ["La ardilla tenía un plan: pasar a escondidas junto al perro, robar la piña más grande del jardín y convertirse en leyenda. El perro, por desgracia, también tenía un plan.", "entertain", "¿Es una historia o una lista de datos?", "Quien escribe cuenta una historia divertida."],
    },
    {
      en: ["A solar eclipse happens when the moon passes between Earth and the sun and blocks some or all of the sun's light.", "inform", "Does the writer give an opinion or ask you to do anything?", "The passage explains a fact of science."],
      es: ["Un eclipse solar ocurre cuando la Luna pasa entre la Tierra y el Sol y tapa parte o toda la luz del Sol.", "inform", "¿Quien escribe da una opinión o te pide hacer algo?", "El texto explica un dato de ciencias."],
    },
    {
      en: ["If you care about clean water, stop buying bottled water. Use a refillable bottle instead. It saves money, and it keeps plastic out of our rivers.", "persuade", "Look at the commands: “stop buying” and “use.”", "The writer wants readers to change what they do."],
      es: ["Si te importa el agua limpia, deja de comprar agua embotellada. Usa una botella que puedas rellenar. Ahorras dinero y evitas que el plástico llegue a los ríos.", "persuade", "Fíjate en las órdenes: “deja de comprar” y “usa”.", "Quien escribe quiere que el lector cambie lo que hace."],
    },
    {
      en: ["At the talent show, Jamal planned to juggle three oranges. By the end, he had juggled two oranges, one shoe, and the principal's hat, and the crowd was on its feet.", "entertain", "Is this a story or a set of facts?", "The writer tells a funny story for enjoyment."],
      es: ["En el concurso de talentos, Jamal pensaba hacer malabares con tres naranjas. Al final hizo malabares con dos naranjas, un zapato y el sombrero del director, y el público se puso de pie.", "entertain", "¿Es una historia o una lista de datos?", "Quien escribe cuenta una historia graciosa para divertir."],
    },
    {
      en: ["Volcanoes form where melted rock, called magma, rises through cracks in Earth's crust. When magma reaches the surface, it is called lava.", "inform", "Does the writer give an opinion or ask you to do anything?", "The passage explains a fact of science."],
      es: ["Los volcanes se forman donde la roca fundida, llamada magma, sube por grietas de la corteza terrestre. Cuando el magma llega a la superficie, se llama lava.", "inform", "¿Quien escribe da una opinión o te pide hacer algo?", "El texto explica un dato de ciencias."],
    },
    {
      en: ["Ten minutes of stretching before practice could save your season. Every coach should make warm-ups a rule, starting today.", "persuade", "Look for “should” in the last sentence.", "The writer wants coaches to change their practices."],
      es: ["Diez minutos de estiramiento antes de entrenar pueden salvar tu temporada. Todos los entrenadores deberían hacer del calentamiento una regla desde hoy.", "persuade", "Fíjate en “deberían” en la última oración.", "Quien escribe quiere que los entrenadores cambien sus prácticas."],
    },
    {
      en: ["My grandmother's parrot speaks three words: “hello,” “dinner,” and my name. He uses the third one only when he wants the first two.", "entertain", "Is the writer making a joke?", "The writer shares a funny detail for enjoyment."],
      es: ["El perico de mi abuela dice tres palabras: “hola”, “comida” y mi nombre. La tercera solo la usa cuando quiere las otras dos.", "entertain", "¿Quien escribe está haciendo una broma?", "Quien escribe comparte un detalle gracioso para divertir."],
    },
    {
      en: ["The human heart has four chambers: two atria and two ventricles.", "inform", "Does the writer give an opinion or ask you to do anything?", "The passage states a fact of science."],
      es: ["El corazón humano tiene cuatro cavidades: dos aurículas y dos ventrículos.", "inform", "¿Quien escribe da una opinión o te pide hacer algo?", "El texto da un dato de ciencias."],
    },
    {
      en: ["Our town needs more bike lanes. Riding to school would be safer, traffic would ease, and the air would be cleaner. Vote yes on the bike-lane plan in November.", "persuade", "Look for “needs” and the request at the end.", "The writer wants readers to vote yes."],
      es: ["Nuestro pueblo necesita más ciclovías. Ir en bicicleta a la escuela sería más seguro, habría menos tráfico y el aire estaría más limpio. Vota sí al plan de ciclovías en noviembre.", "persuade", "Fíjate en “necesita” y en la petición del final.", "Quien escribe quiere que el lector vote que sí."],
    },
    {
      en: ["The class pet, a hamster named Captain, escaped on Friday. On Monday we found him asleep in the teacher's slipper, looking very pleased with himself.", "entertain", "Is this a story or a set of facts?", "The writer tells a funny story for enjoyment."],
      es: ["El hámster de la clase, el Capitán, se escapó el viernes. El lunes lo encontramos dormido en la pantufla de la maestra, muy satisfecho de sí mismo.", "entertain", "¿Es una historia o una lista de datos?", "Quien escribe cuenta una historia graciosa para divertir."],
    },
  ],
);

const AUDIENCE_FIT: Bi<Entry>[] = [
  {
    en: ["You are explaining photosynthesis to a group of second graders.", "Plants use sunlight to make their own food from water and air.", [["Photosynthesis converts carbon dioxide and water into glucose using light energy absorbed by chlorophyll.", "too-technical"], ["Plants are cool, and you should totally get one.", "off-purpose"]], "Second graders need short, simple words.", "The best version keeps the science true but uses words young children know."],
    es: ["Le explicas la fotosíntesis a un grupo de niños de segundo grado.", "Las plantas usan la luz del sol para fabricar su propio alimento con agua y aire.", [["La fotosíntesis transforma el dióxido de carbono y el agua en glucosa mediante la energía luminosa que absorbe la clorofila.", "too-technical"], ["Las plantas están buenísimas y deberías tener una.", "off-purpose"]], "Los niños de segundo grado necesitan palabras cortas y sencillas.", "La mejor versión dice algo verdadero con palabras que un niño conoce."],
  },
  {
    en: ["You are writing a letter to the principal asking for a longer lunch period.", "We respectfully ask for a longer lunch period so that every student has time to eat.", [["Lunch is way too short, so fix it.", "too-casual"], ["Schools have served lunch for many years.", "off-purpose"]], "A principal is an adult in charge, and you want a change.", "The best version is polite and asks clearly for the change."],
    es: ["Le escribes una carta al director para pedir un recreo más largo.", "Le pedimos respetuosamente un recreo más largo para que todos tengamos tiempo de comer.", [["El recreo está cortísimo, arréglelo ya.", "too-casual"], ["Los recreos existen desde hace muchos años.", "off-purpose"]], "El director es un adulto con autoridad, y quieres un cambio.", "La mejor versión es cortés y pide el cambio con claridad."],
  },
  {
    en: ["You are writing a safety sign for a public pool where families with young children swim.", "No running on the deck.", [["Running on the wet deck could lead to falls caused by reduced friction between feet and tile.", "too-technical"], ["Hey, maybe chill on the running thing.", "too-casual"]], "A sign must be understood in a second by people of all ages.", "The best sign is short and clear."],
    es: ["Escribes un letrero de seguridad para una piscina pública con muchas familias.", "No correr en la orilla de la piscina.", [["Correr sobre la superficie mojada podría provocar caídas por la menor fricción entre los pies y el piso.", "too-technical"], ["Oigan, no anden corriendo, ¿va?", "too-casual"]], "Un letrero debe entenderse en un segundo, a cualquier edad.", "El mejor letrero es corto y claro."],
  },
  {
    en: ["You are texting a close friend to say you will be late to the movie.", "Running ten minutes late, save me a seat.", [["Dear friend, I regret to inform you that my arrival will be delayed by approximately ten minutes.", "too-formal"], ["The movie theater on Main Street opened in 1950.", "off-purpose"]], "A text to a close friend can be short and relaxed.", "The best version is quick and friendly and says what matters."],
    es: ["Le mandas un mensaje a tu mejor amigo para decirle que llegarás tarde al cine.", "Llego diez minutos tarde, apártame un lugar.", [["Estimado amigo: lamento informarle que mi llegada se retrasará unos diez minutos.", "too-formal"], ["El cine de la plaza abrió en 1950.", "off-purpose"]], "Un mensaje a tu mejor amigo puede ser corto y relajado.", "La mejor versión es rápida, amistosa y dice lo importante."],
  },
  {
    en: ["You are writing a report for your science teacher about your experiment.", "The plants that received ten hours of light grew 4 centimeters taller than the others.", [["My plants did awesome, way better than I thought.", "too-casual"], ["You should buy more plants for your house.", "off-purpose"]], "A science report gives exact results.", "The best version reports the result with numbers."],
    es: ["Escribes un informe para tu maestra de ciencias sobre tu experimento.", "Las plantas que recibieron diez horas de luz crecieron 4 centímetros más que las demás.", [["Mis plantas crecieron un montón, mejor de lo que pensé.", "too-casual"], ["Deberías comprar más plantas para tu casa.", "off-purpose"]], "Un informe de ciencias da resultados exactos.", "La mejor versión informa el resultado con números."],
  },
  {
    en: ["You are giving directions to a tourist who speaks a little English.", "Walk two blocks. Turn left at the bank. The museum is on the right.", [["Proceed in a northerly direction for approximately two city blocks, then turn left at the financial institution.", "too-technical"], ["The museum has a lot of interesting history.", "off-purpose"]], "Someone learning the language needs short, common words.", "The best version uses short steps and simple words."],
    es: ["Le das indicaciones a un turista que habla poco español.", "Camine dos cuadras. Dé vuelta a la izquierda en el banco. El museo está a la derecha.", [["Avance en dirección norte aproximadamente dos manzanas y gire a la izquierda en la institución financiera.", "too-technical"], ["El museo tiene mucha historia interesante.", "off-purpose"]], "Alguien que está aprendiendo el idioma necesita palabras cortas y comunes.", "La mejor versión usa pasos cortos y palabras sencillas."],
  },
  {
    en: ["You are writing a thank-you note to a guest speaker who visited your class.", "Thank you for sharing your work with us; your talk about rescue dogs inspired our class.", [["Thx, it was fun.", "too-casual"], ["Rescue dogs are trained in many different ways.", "off-purpose"]], "A guest deserves a polite, specific thank-you.", "The best version thanks the speaker and says what the class gained."],
    es: ["Escribes una nota de agradecimiento a un invitado que visitó tu clase.", "Gracias por compartir su trabajo con nosotros; su plática sobre perros rescatistas inspiró a la clase.", [["Grax, estuvo padre.", "too-casual"], ["Los perros rescatistas se entrenan de muchas formas.", "off-purpose"]], "Un invitado merece un agradecimiento cortés y concreto.", "La mejor versión agradece y dice qué aprendió la clase."],
  },
  {
    en: ["You are writing instructions for a younger student on how to check out a library book.", "Bring the book and your card to the desk. The librarian will scan both.", [["Present the volume and your identification credential to the circulation desk for processing.", "too-technical"], ["Libraries have existed for thousands of years.", "off-purpose"]], "A younger student needs simple steps.", "The best version gives short, clear steps."],
    es: ["Escribes instrucciones para un niño más pequeño sobre cómo pedir un libro prestado.", "Lleva el libro y tu credencial al mostrador. La bibliotecaria los va a escanear.", [["Presente el volumen y su credencial de identificación en el mostrador de préstamos para su procesamiento.", "too-technical"], ["Las bibliotecas existen desde hace miles de años.", "off-purpose"]], "Un niño más pequeño necesita pasos sencillos.", "La mejor versión da pasos cortos y claros."],
  },
  {
    en: ["You are speaking to the city council to ask for a crosswalk near your school.", "A crosswalk on Pine Street would let more than two hundred students cross safely each day.", [["Pine Street is super scary, you guys.", "too-casual"], ["I like walking to school because I see my friends.", "off-purpose"]], "City leaders need a respectful request with a reason.", "The best version makes the request and gives a clear reason."],
    es: ["Hablas ante el concejo municipal para pedir un cruce peatonal cerca de tu escuela.", "Un cruce peatonal en la calle Pino permitiría que más de doscientos estudiantes crucen seguros cada día.", [["La calle Pino da muchísimo miedo, de veras.", "too-casual"], ["Me gusta caminar a la escuela porque veo a mis amigos.", "off-purpose"]], "Las autoridades necesitan una petición respetuosa con una razón.", "La mejor versión hace la petición y da una razón clara."],
  },
  {
    en: ["You are writing a birthday card for your grandmother.", "Happy birthday, Grandma. Thank you for every story and every Sunday dinner.", [["This card serves to formally acknowledge the anniversary of your birth.", "too-formal"], ["Birthdays are celebrated in many countries.", "off-purpose"]], "A card for family can be warm and personal.", "The best version is warm and specific."],
    es: ["Escribes una tarjeta de cumpleaños para tu abuela.", "Feliz cumpleaños, abuela. Gracias por cada cuento y cada comida de domingo.", [["La presente tiene como fin reconocer formalmente el aniversario de su nacimiento.", "too-formal"], ["Los cumpleaños se celebran en muchos países.", "off-purpose"]], "Una tarjeta para la familia puede ser cálida y personal.", "La mejor versión es cálida y concreta."],
  },
  {
    en: ["You are writing an email to a company to ask about a summer job.", "I am writing to ask whether you have any summer positions for students.", [["Got any summer jobs?", "too-casual"], ["Summer is the warmest season of the year.", "off-purpose"]], "A company you do not know needs a polite, clear message.", "The best version is polite and says exactly what you want."],
    es: ["Le escribes un correo a una empresa para preguntar por un empleo de verano.", "Le escribo para preguntarle si tienen puestos de verano para estudiantes.", [["¿Hay chamba para el verano?", "too-casual"], ["El verano es la estación más calurosa del año.", "off-purpose"]], "Una empresa que no conoces necesita un mensaje cortés y claro.", "La mejor versión es cortés y dice exactamente lo que quieres."],
  },
  {
    en: ["You are explaining what a half is to a first grader.", "If you cut a pizza into two equal pieces, each piece is one half.", [["A fraction represents a quotient of two integers with a nonzero denominator.", "too-technical"], ["Pizza is a popular food in many countries.", "off-purpose"]], "A first grader learns best from something they can picture.", "The best version uses a simple, familiar example."],
    es: ["Le explicas a un niño de primer grado qué es la mitad.", "Si cortas una pizza en dos partes iguales, cada parte es la mitad.", [["Una fracción representa el cociente de dos números enteros con denominador distinto de cero.", "too-technical"], ["La pizza es una comida popular en muchos países.", "off-purpose"]], "Un niño de primer grado aprende mejor con algo que puede imaginar.", "La mejor versión usa un ejemplo sencillo y conocido."],
  },
  {
    en: ["You are writing a news article for the school paper about the robotics team.", "The robotics team won second place at Saturday's regional competition.", [["OMG the robotics team was amazing.", "too-casual"], ["Robots will probably do every job someday.", "off-purpose"]], "A news article reports what happened.", "The best version states the facts clearly."],
    es: ["Escribes una noticia para el periódico escolar sobre el equipo de robótica.", "El equipo de robótica obtuvo el segundo lugar en la competencia regional del sábado.", [["El equipo de robótica estuvo increíble, nos encantó.", "too-casual"], ["Algún día los robots harán todo el trabajo.", "off-purpose"]], "Una noticia informa lo que pasó.", "La mejor versión da los hechos con claridad."],
  },
  {
    en: ["You are writing a note to a substitute teacher about a student's allergy.", "Please note that Sam is allergic to peanuts; his medicine is in the nurse's office.", [["Sam can't do peanuts lol.", "too-casual"], ["Peanuts are legumes, not true nuts.", "off-purpose"]], "A note about health must be clear and complete.", "The best version gives the key facts the teacher needs."],
    es: ["Le escribes una nota a la maestra suplente sobre la alergia de un estudiante.", "Le informo que Sam es alérgico al cacahuate; su medicina está en la enfermería.", [["Sam no puede con el cacahuate jaja.", "too-casual"], ["El cacahuate en realidad es una legumbre.", "off-purpose"]], "Una nota sobre salud debe ser clara y completa.", "La mejor versión da los datos clave que la maestra necesita."],
  },
];

const AUDIENCE_PURPOSE = skill(
  { id: "e.audience.purpose", grade: "9", title: { en: "Audience and purpose", es: "Público y propósito" }, standard: "W.9-10.4", prereqs: ["e.formal.style"] },
  [
    {
      ...PURPOSE_KIND,
      ask: { en: "What is the writer's main purpose?", es: "¿Cuál es el propósito principal de quien escribe?" },
      hints: {
        en: ["What does the writer want the reader to do, know, or feel after reading?", "To inform gives facts and explanations. To persuade tries to change what the reader thinks or does, often with words like “should” or a request. To entertain tells a story or a joke for enjoyment."],
        es: ["¿Qué quiere quien escribe que el lector haga, sepa o sienta después de leer?", "Informar es dar datos y explicaciones. Persuadir es intentar cambiar lo que el lector piensa o hace, muchas veces con “debería” o una petición. Entretener es contar una historia o una broma para divertir."],
      },
      seconds: 25,
    },
    {
      bank: AUDIENCE_FIT,
      ask: { en: "Which version fits this audience and purpose best?", es: "¿Qué versión se ajusta mejor a este público y a este propósito?" },
      hints: {
        en: ["Who is the audience, and what does the writer need them to do or understand?", "Match the words to the reader: simple for young readers, polite and complete for adults in charge, short for signs, relaxed only with friends. Every choice must also serve the purpose."],
        es: ["¿Quién es el público y qué necesita quien escribe que haga o entienda?", "Ajusta las palabras al lector: sencillas para los niños, corteses y completas para las autoridades, breves en un letrero, relajadas solo con amigos. Además, la opción debe cumplir el propósito."],
      },
      seconds: 30,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.counterclaims — level 1: the role of one sentence in a short argument (claim, evidence,
// counterclaim, rebuttal); level 2: the strongest rebuttal to a counterclaim. Level-2 tags:
// ignores-counterclaim, attacks-person, concedes-without-answer.

type Role = "claim" | "evidence" | "counterclaim" | "rebuttal";
const ROLES: readonly Role[] = ["claim", "evidence", "counterclaim", "rebuttal"];
/** Four-sentence arguments, in order: claim, evidence, counterclaim, rebuttal. */
const ARGUMENTS_4: Bi<[string, string, string, string]>[] = [
  {
    en: ["Our school should start at 8:30 instead of 7:30.", "A national survey found that most high school students do not get the sleep doctors recommend.", "Some parents worry that a later start would make after-school activities end too late.", "However, many schools that changed their start times kept their sports by moving practices a little later."],
    es: ["Nuestra escuela debería empezar a las 8:30 en lugar de a las 7:30.", "Una encuesta nacional encontró que la mayoría de los estudiantes de preparatoria no duermen las horas que recomiendan los médicos.", "Algunos padres temen que entrar más tarde haga que las actividades después de clases terminen muy tarde.", "Sin embargo, muchas escuelas que cambiaron su horario mantuvieron sus deportes moviendo los entrenamientos un poco más tarde."],
  },
  {
    en: ["Our town should build a skate park.", "Last year, the police received more than forty complaints about skateboarders in store parking lots.", "Some residents say a skate park would cost too much.", "But a fund from the state would pay for most of the building costs."],
    es: ["Nuestro pueblo debería construir un parque para patinetas.", "El año pasado, la policía recibió más de cuarenta quejas por patinadores en los estacionamientos de las tiendas.", "Algunos vecinos dicen que un parque así costaría demasiado.", "Pero un fondo del estado pagaría casi todo el costo de la construcción."],
  },
  {
    en: ["Students should be allowed to use phones at lunch.", "In a survey at our school, eight out of ten students said they use lunch to text their families about rides home.", "Some teachers argue that phones keep students from talking to each other.", "Yet the same survey showed that most students use their phones for only a few minutes of lunch."],
    es: ["Los estudiantes deberían poder usar el celular en el almuerzo.", "En una encuesta de nuestra escuela, ocho de cada diez estudiantes dijeron que usan el almuerzo para avisar a su familia cómo regresarán a casa.", "Algunos maestros opinan que los celulares impiden que los estudiantes platiquen entre sí.", "No obstante, la misma encuesta mostró que la mayoría usa el celular solo unos minutos durante el almuerzo."],
  },
  {
    en: ["Every middle school should have a garden.", "At Lincoln Middle School, students who worked in the garden ate twice as many vegetables at lunch.", "Critics say gardens take too much time away from classes.", "In fact, teachers can use the garden to teach science and math lessons."],
    es: ["Toda escuela secundaria debería tener un huerto.", "En la Secundaria Lincoln, los estudiantes que trabajaron en el huerto comieron el doble de verduras en el almuerzo.", "Hay quienes dicen que el huerto le quita demasiado tiempo a las clases.", "En realidad, los maestros pueden usar el huerto para dar lecciones de ciencias y matemáticas."],
  },
];

const ROLE_CLUES: Bi<Record<Role, string>> = {
  en: {
    claim: "Is this the main point the whole paragraph argues for?",
    evidence: "Does this sentence give a number or a fact that backs up the main point?",
    counterclaim: "Whose view is this: the writer's, or people who disagree?",
    rebuttal: "Look at the word it starts with. What earlier sentence does it answer?",
  },
  es: {
    claim: "¿Es la idea principal que defiende todo el párrafo?",
    evidence: "¿Esta oración da un número o un dato que respalda la idea principal?",
    counterclaim: "¿De quién es esta opinión: de quien escribe, o de quienes no están de acuerdo?",
    rebuttal: "Fíjate en la palabra con que empieza. ¿A qué oración anterior responde?",
  },
};
const ROLE_WHY: Bi<Record<Role, string>> = {
  en: {
    claim: "It states the position the writer wants readers to accept.",
    evidence: "It gives a fact that supports the claim.",
    counterclaim: "It presents the view of people who disagree.",
    rebuttal: "It answers the counterclaim and defends the claim.",
  },
  es: {
    claim: "Expresa la postura que quien escribe quiere que el lector acepte.",
    evidence: "Da un dato que apoya la afirmación.",
    counterclaim: "Presenta la opinión de quienes no están de acuerdo.",
    rebuttal: "Responde al contraargumento y defiende la afirmación.",
  },
};

const ARGUMENT_ROLES = cats<Role>(
  {
    en: { claim: "Claim", evidence: "Evidence", counterclaim: "Counterclaim", rebuttal: "Rebuttal" },
    es: { claim: "Afirmación", evidence: "Evidencia", counterclaim: "Contraargumento", rebuttal: "Refutación" },
  },
  { en: ROLES, es: ROLES },
  ARGUMENTS_4.flatMap((arg) =>
    ROLES.map((role, i) => ({
      en: [arg.en.join(" "), role, ROLE_CLUES.en[role], ROLE_WHY.en[role], arg.en[i]] as Cat<Role>,
      es: [arg.es.join(" "), role, ROLE_CLUES.es[role], ROLE_WHY.es[role], arg.es[i]] as Cat<Role>,
    })),
  ),
);

const REBUTTALS: Bi<Entry>[] = [
  {
    en: ["Claim: Our school should start at 8:30. Counterclaim: A later start would make sports practices end too late.", "Schools that switched to later starts kept their sports by moving practice back thirty minutes.", [["Our school should start at 8:30 because it is a good idea.", "ignores-counterclaim"], ["People who say that just don't care about students.", "attacks-person"], ["It is true that practices would end later.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "A rebuttal answers the worry directly, here by showing how the problem can be solved."],
    es: ["Afirmación: Nuestra escuela debería empezar a las 8:30. Contraargumento: Entrar más tarde haría que los entrenamientos terminen muy tarde.", "Las escuelas que cambiaron su horario mantuvieron sus deportes moviendo los entrenamientos media hora.", [["Nuestra escuela debería empezar a las 8:30 porque es buena idea.", "ignores-counterclaim"], ["Quienes dicen eso no se preocupan por los estudiantes.", "attacks-person"], ["Es cierto que los entrenamientos terminarían más tarde.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "Una refutación responde directamente a la preocupación; aquí muestra cómo resolver el problema."],
  },
  {
    en: ["Claim: The town should build a skate park. Counterclaim: A skate park would cost too much.", "A state fund would cover most of the building costs.", [["Skate parks are fun, so we should build one.", "ignores-counterclaim"], ["Anyone worried about cost is just against young people.", "attacks-person"], ["Yes, skate parks are expensive.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal answers the cost worry with a fact about who would pay."],
    es: ["Afirmación: El pueblo debería construir un parque para patinetas. Contraargumento: Un parque así costaría demasiado.", "Un fondo del estado cubriría casi todo el costo de la construcción.", [["Los parques para patinetas son divertidos, así que hay que construir uno.", "ignores-counterclaim"], ["Quien se preocupa por el costo está en contra de los jóvenes.", "attacks-person"], ["Sí, los parques para patinetas son caros.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación responde a la preocupación por el costo con un dato sobre quién pagaría."],
  },
  {
    en: ["Claim: Students should be allowed to use phones at lunch. Counterclaim: Phones keep students from talking to each other.", "Our survey found that most students use their phones for only a few minutes and spend the rest of lunch talking.", [["Phones should be allowed at lunch because students want them.", "ignores-counterclaim"], ["Teachers who say this are just old-fashioned.", "attacks-person"], ["It is true that some students stare at their phones.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal answers the worry with evidence about how students actually spend lunch."],
    es: ["Afirmación: Los estudiantes deberían poder usar el celular en el almuerzo. Contraargumento: Los celulares impiden que los estudiantes platiquen.", "Nuestra encuesta encontró que la mayoría usa el celular solo unos minutos y pasa el resto del almuerzo platicando.", [["Hay que permitir los celulares porque los estudiantes los quieren.", "ignores-counterclaim"], ["Los maestros que dicen eso son anticuados.", "attacks-person"], ["Es cierto que algunos estudiantes no dejan de ver el celular.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación responde con evidencia sobre cómo pasan el almuerzo los estudiantes."],
  },
  {
    en: ["Claim: Every school should have a garden. Counterclaim: Gardens take time away from classes.", "Teachers can teach science and math lessons in the garden, so garden time is class time.", [["Gardens are good, so every school should have one.", "ignores-counterclaim"], ["Critics of gardens have never planted anything.", "attacks-person"], ["Gardens do take a lot of time.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal shows the garden can be part of class instead of taking time from it."],
    es: ["Afirmación: Toda escuela debería tener un huerto. Contraargumento: El huerto le quita tiempo a las clases.", "Los maestros pueden dar clases de ciencias y matemáticas en el huerto, así que ese tiempo también es clase.", [["Los huertos son buenos, así que toda escuela debería tener uno.", "ignores-counterclaim"], ["Quienes critican los huertos nunca han sembrado nada.", "attacks-person"], ["Es cierto que el huerto toma mucho tiempo.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación muestra que el huerto puede ser parte de la clase en lugar de quitarle tiempo."],
  },
  {
    en: ["Claim: Our city should add bike lanes. Counterclaim: Bike lanes would make car traffic worse.", "A traffic study of our own streets found that the new lanes would add less than a minute to most car trips.", [["Bike lanes are good for the city, so we should add them.", "ignores-counterclaim"], ["Drivers who complain only care about themselves.", "attacks-person"], ["Bike lanes might slow down some cars.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal answers the traffic worry with a local study."],
    es: ["Afirmación: Nuestra ciudad debería agregar ciclovías. Contraargumento: Las ciclovías empeorarían el tráfico de autos.", "Un estudio de tráfico de nuestras propias calles encontró que las ciclovías sumarían menos de un minuto a la mayoría de los viajes en auto.", [["Las ciclovías son buenas para la ciudad, así que hay que ponerlas.", "ignores-counterclaim"], ["Los conductores que se quejan solo piensan en sí mismos.", "attacks-person"], ["Las ciclovías podrían hacer más lentos algunos autos.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación responde a la preocupación por el tráfico con un estudio local."],
  },
  {
    en: ["Claim: Homework should be limited to one hour a night. Counterclaim: Less homework means students will learn less.", "A study at our school found that students who did one hour of homework scored about the same as those who did two.", [["Homework should be limited because students are tired.", "ignores-counterclaim"], ["People who want more homework just like making kids suffer.", "attacks-person"], ["Some students might learn a little less.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal answers the learning worry with evidence about test scores."],
    es: ["Afirmación: La tarea debería limitarse a una hora por noche. Contraargumento: Menos tarea significa que los estudiantes aprenderán menos.", "Un estudio en nuestra escuela encontró que quienes hacían una hora de tarea sacaban notas parecidas a quienes hacían dos.", [["Hay que limitar la tarea porque los estudiantes están cansados.", "ignores-counterclaim"], ["Quienes quieren más tarea solo quieren que los niños sufran.", "attacks-person"], ["Puede que algunos estudiantes aprendan un poco menos.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación responde a la preocupación por el aprendizaje con evidencia sobre las notas."],
  },
  {
    en: ["Claim: The library should stay open until 9 p.m. Counterclaim: Hardly anyone would come in the evening.", "When the library tried late hours last spring, more than a hundred students came each night.", [["The library should stay open late because libraries are important.", "ignores-counterclaim"], ["Whoever says that never reads.", "attacks-person"], ["It is possible that the evenings would be quiet.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal answers with what happened when the library tried late hours."],
    es: ["Afirmación: La biblioteca debería abrir hasta las 9 p. m. Contraargumento: Casi nadie iría en la noche.", "Cuando la biblioteca probó abrir tarde la primavera pasada, llegaron más de cien estudiantes cada noche.", [["La biblioteca debería abrir tarde porque las bibliotecas son importantes.", "ignores-counterclaim"], ["Quien dice eso nunca lee.", "attacks-person"], ["Es posible que en las noches haya poca gente.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación responde con lo que pasó cuando la biblioteca probó abrir tarde."],
  },
  {
    en: ["Claim: Schools should serve free breakfast to every student. Counterclaim: Families should feed their own children breakfast.", "Many parents leave for work before dawn, and a school breakfast makes sure no student starts the day hungry.", [["Schools should serve breakfast because breakfast is important.", "ignores-counterclaim"], ["People who say that have never been hungry.", "attacks-person"], ["Families do usually make breakfast.", "concedes-without-answer"]], "What exactly is the objection? Which choice answers it?", "The rebuttal explains why many families cannot always do it and what the school adds."],
    es: ["Afirmación: Las escuelas deberían dar desayuno gratis a todos los estudiantes. Contraargumento: Cada familia debería darles el desayuno a sus hijos.", "Muchos padres salen a trabajar antes del amanecer, y el desayuno escolar asegura que ningún estudiante empiece el día con hambre.", [["Las escuelas deberían dar desayuno porque el desayuno es importante.", "ignores-counterclaim"], ["Quienes dicen eso nunca han pasado hambre.", "attacks-person"], ["Es cierto que las familias suelen preparar el desayuno.", "concedes-without-answer"]], "¿Cuál es exactamente la objeción? ¿Qué opción le responde?", "La refutación explica por qué muchas familias no siempre pueden hacerlo y qué aporta la escuela."],
  },
  {
    en: ["Claim: Our class should visit the science museum. Counterclaim: An amusement park would be more fun.", "The museum's hands-on exhibits are fun and connect to what we are learning this year.", [["The museum is the right choice for our class trip.", "ignores-counterclaim"], ["Only lazy students want the amusement park.", "attacks-person"], ["The amusement park would be more fun.", "concedes-without-answer"]], "What exactly is the objection? Which choice answers it?", "The rebuttal shows the museum can be fun and also useful."],
    es: ["Afirmación: Nuestra clase debería visitar el museo de ciencias. Contraargumento: Un parque de diversiones sería más divertido.", "Las exhibiciones interactivas del museo son divertidas y se relacionan con lo que aprendemos este año.", [["El museo es la opción correcta para la excursión.", "ignores-counterclaim"], ["Solo los estudiantes flojos quieren ir al parque de diversiones.", "attacks-person"], ["El parque de diversiones sería más divertido.", "concedes-without-answer"]], "¿Cuál es exactamente la objeción? ¿Qué opción le responde?", "La refutación muestra que el museo puede ser divertido y útil a la vez."],
  },
  {
    en: ["Claim: Students should wear uniforms. Counterclaim: Uniforms stop students from expressing themselves.", "Students can still express themselves through clubs, art, and their ideas, and uniforms cut down on teasing about clothes.", [["Uniforms are a good idea for every school.", "ignores-counterclaim"], ["People against uniforms just want to show off.", "attacks-person"], ["Uniforms do limit what students wear.", "concedes-without-answer"]], "What exactly is the objection? Which choice answers it?", "The rebuttal shows other ways to express yourself and adds a benefit."],
    es: ["Afirmación: Los estudiantes deberían usar uniforme. Contraargumento: El uniforme impide que los estudiantes se expresen.", "Los estudiantes pueden expresarse en los clubes, en el arte y con sus ideas, y el uniforme reduce las burlas por la ropa.", [["El uniforme es una buena idea para toda escuela.", "ignores-counterclaim"], ["Quienes están en contra del uniforme solo quieren presumir.", "attacks-person"], ["Es cierto que el uniforme limita lo que se ponen.", "concedes-without-answer"]], "¿Cuál es exactamente la objeción? ¿Qué opción le responde?", "La refutación muestra otras formas de expresarse y suma un beneficio."],
  },
  {
    en: ["Claim: Our town should ban plastic grocery bags. Counterclaim: Paper bags are bad for the environment too.", "The ban would push shoppers toward reusable bags, which can replace hundreds of paper and plastic bags.", [["Plastic bags should be banned because they are bad.", "ignores-counterclaim"], ["People who say that are just lazy about recycling.", "attacks-person"], ["Paper bags do have problems too.", "concedes-without-answer"]], "What exactly is the objection? Which choice answers it?", "The rebuttal shows the ban leads to a better choice than either kind of bag."],
    es: ["Afirmación: Nuestro pueblo debería prohibir las bolsas de plástico. Contraargumento: Las bolsas de papel también dañan el ambiente.", "La prohibición llevaría a usar bolsas reutilizables, que pueden reemplazar cientos de bolsas de papel y de plástico.", [["Hay que prohibir las bolsas de plástico porque son malas.", "ignores-counterclaim"], ["Quienes dicen eso son flojos para reciclar.", "attacks-person"], ["Es cierto que las bolsas de papel también tienen problemas.", "concedes-without-answer"]], "¿Cuál es exactamente la objeción? ¿Qué opción le responde?", "La refutación muestra que la prohibición lleva a una opción mejor que los dos tipos de bolsa."],
  },
  {
    en: ["Claim: Recess should last thirty minutes. Counterclaim: Longer recess means less time for learning.", "Teachers at our school reported that students focused better in afternoon lessons after a longer recess.", [["Recess should be longer because kids like it.", "ignores-counterclaim"], ["People who want short recess have forgotten what it is like to be young.", "attacks-person"], ["A longer recess would take some time from lessons.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal answers with evidence that learning improves."],
    es: ["Afirmación: El recreo debería durar treinta minutos. Contraargumento: Un recreo más largo significa menos tiempo para aprender.", "Los maestros de nuestra escuela notaron que los estudiantes se concentraban mejor en las clases de la tarde después de un recreo más largo.", [["El recreo debería ser más largo porque a los niños les gusta.", "ignores-counterclaim"], ["Quienes quieren un recreo corto olvidaron lo que es ser niño.", "attacks-person"], ["Un recreo más largo le quitaría algo de tiempo a las clases.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación responde con evidencia de que el aprendizaje mejora."],
  },
  {
    en: ["Claim: The school should add a coding class. Counterclaim: There is no room in the schedule.", "The class could replace one study hall, which most students already use as free time.", [["A coding class would be great for students.", "ignores-counterclaim"], ["People who say that do not understand technology.", "attacks-person"], ["The schedule is very full.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal finds room in the schedule."],
    es: ["Afirmación: La escuela debería agregar una clase de programación. Contraargumento: No hay lugar en el horario.", "La clase podría reemplazar una hora de estudio libre, que la mayoría ya usa como tiempo sin actividad.", [["Una clase de programación sería genial para los estudiantes.", "ignores-counterclaim"], ["Quienes dicen eso no entienden la tecnología.", "attacks-person"], ["El horario está muy lleno.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación encuentra lugar en el horario."],
  },
  {
    en: ["Claim: Our team should practice on Saturdays. Counterclaim: Many players have family plans on weekends.", "Saturday practice could be optional, with an extra weekday session for players who cannot come.", [["Saturday practice would make our team better.", "ignores-counterclaim"], ["Players who skip Saturdays do not really care about the team.", "attacks-person"], ["Many players are busy on weekends.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal offers a solution that respects family plans."],
    es: ["Afirmación: Nuestro equipo debería entrenar los sábados. Contraargumento: Muchos jugadores tienen planes familiares los fines de semana.", "El entrenamiento del sábado podría ser opcional, con una sesión extra entre semana para quienes no puedan ir.", [["Entrenar los sábados haría mejor al equipo.", "ignores-counterclaim"], ["Los jugadores que faltan los sábados no quieren de verdad al equipo.", "attacks-person"], ["Muchos jugadores están ocupados los fines de semana.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación ofrece una solución que respeta los planes familiares."],
  },
];

const COUNTERCLAIMS = skill(
  { id: "e.counterclaims", grade: "9", title: { en: "Counterclaims and rebuttals", es: "Contraargumentos y refutaciones" }, standard: "W.9-10.1b", prereqs: ["e.claim.evidence", "e.thesis"] },
  [
    {
      ...ARGUMENT_ROLES,
      ask: { en: "What role does this sentence play in the argument? {t}", es: "¿Qué papel cumple esta oración en el argumento? {t}" },
      hints: {
        en: ["Find the writer's main point first.", "The claim is the main point. Evidence is a fact or number that supports it. A counterclaim gives the other side's view. A rebuttal answers that view, often after a word like “however,” “but,” “yet,” or “in fact.”"],
        es: ["Busca primero la idea principal de quien escribe.", "La afirmación es la idea principal. La evidencia es un dato que la apoya. El contraargumento presenta la opinión contraria. La refutación responde a esa opinión, muchas veces después de “sin embargo”, “pero”, “no obstante” o “en realidad”."],
      },
      seconds: 40,
    },
    {
      bank: REBUTTALS,
      ask: { en: "Which sentence is the strongest rebuttal?", es: "¿Qué oración es la refutación más sólida?" },
      hints: {
        en: ["What exactly is the other side worried about?", "A strong rebuttal answers that worry with a fact, an example, or a solution. Repeating the claim, insulting the other side, or simply agreeing does not rebut it."],
        es: ["¿Qué le preocupa exactamente a la otra postura?", "Una refutación sólida responde a esa preocupación con un dato, un ejemplo o una solución. Repetir la afirmación, insultar a la otra parte o simplemente darle la razón no la refuta."],
      },
      seconds: 35,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.loaded.language — level 1: the loaded word that pushes a feeling; level 2: the neutral report.
// Tags: neutral-word; biased-negative, biased-positive, opinion-as-fact.

const LOADED_WORDS: Bi<Entry>[] = [
  {
    en: ["The mayor's reckless plan would change the bus routes.", "reckless", [["mayor's", "neutral-word"], ["bus routes", "neutral-word"]], "Which word judges the plan instead of just describing it?", "“Reckless” tells the reader to see the plan as dangerous."],
    es: ["El plan imprudente de la alcaldesa cambiaría las rutas del autobús.", "imprudente", [["alcaldesa", "neutral-word"], ["rutas del autobús", "neutral-word"]], "¿Qué palabra juzga el plan en lugar de solo describirlo?", "“Imprudente” le pide al lector ver el plan como peligroso."],
  },
  {
    en: ["A mob of parents met with the school board on Tuesday.", "mob", [["parents", "neutral-word"], ["Tuesday", "neutral-word"]], "Which word makes the group sound dangerous?", "“Mob” makes a group of parents sound wild; “group” would be neutral."],
    es: ["Una turba de padres se reunió con la junta escolar el martes.", "turba", [["padres", "neutral-word"], ["martes", "neutral-word"]], "¿Qué palabra hace que el grupo suene peligroso?", "“Turba” hace que un grupo de padres suene descontrolado; “grupo” sería neutral."],
  },
  {
    en: ["The heroic volunteers cleaned the beach on Saturday.", "heroic", [["volunteers", "neutral-word"], ["beach", "neutral-word"]], "Which word pushes you to admire the volunteers?", "“Heroic” pushes readers to admire them; the plain fact is that they cleaned the beach."],
    es: ["Los heroicos voluntarios limpiaron la playa el sábado.", "heroicos", [["voluntarios", "neutral-word"], ["playa", "neutral-word"]], "¿Qué palabra te empuja a admirar a los voluntarios?", "“Heroicos” empuja al lector a admirarlos; el dato es solo que limpiaron la playa."],
  },
  {
    en: ["The company dumped its waste into the river last year.", "dumped", [["company", "neutral-word"], ["last year", "neutral-word"]], "Which word makes the action sound careless?", "“Dumped” makes it sound careless; “released” would be more neutral."],
    es: ["La empresa envenenó el río con sus desechos el año pasado.", "envenenó", [["empresa", "neutral-word"], ["el año pasado", "neutral-word"]], "¿Qué palabra hace que la acción suene criminal?", "“Envenenó” es mucho más fuerte que “vertió desechos”."],
  },
  {
    en: ["Our senator caved in to pressure and changed her vote.", "caved in", [["senator", "neutral-word"], ["changed her vote", "neutral-word"]], "Which words make the senator sound weak?", "“Caved in” makes changing a vote sound weak."],
    es: ["La senadora se doblegó ante la presión y cambió su voto.", "se doblegó", [["senadora", "neutral-word"], ["cambió su voto", "neutral-word"]], "¿Qué palabras hacen que la senadora suene débil?", "“Se doblegó” hace que cambiar el voto suene a debilidad."],
  },
  {
    en: ["The new law is a job-killing disaster for small towns.", "job-killing disaster", [["new law", "neutral-word"], ["small towns", "neutral-word"]], "Which words try to scare you about the law?", "“Job-killing disaster” is meant to frighten readers, not to inform them."],
    es: ["La nueva ley es un desastre que destruye empleos en los pueblos pequeños.", "un desastre que destruye empleos", [["nueva ley", "neutral-word"], ["pueblos pequeños", "neutral-word"]], "¿Qué palabras intentan asustarte sobre la ley?", "“Un desastre que destruye empleos” busca asustar, no informar."],
  },
  {
    en: ["The team's star player was seen lurking near the coach's office.", "lurking", [["star player", "neutral-word"], ["coach's office", "neutral-word"]], "Which word makes the player sound sneaky?", "“Lurking” suggests something suspicious; “waiting” would be neutral."],
    es: ["Vieron al jugador estrella merodeando cerca de la oficina del entrenador.", "merodeando", [["jugador estrella", "neutral-word"], ["oficina del entrenador", "neutral-word"]], "¿Qué palabra hace que el jugador suene sospechoso?", "“Merodeando” sugiere algo sospechoso; “esperando” sería neutral."],
  },
  {
    en: ["The school board finally came to its senses and approved the plan.", "came to its senses", [["school board", "neutral-word"], ["approved", "neutral-word"]], "Which words suggest the board was foolish before?", "“Came to its senses” judges the board's earlier choices."],
    es: ["Por fin la junta escolar entró en razón y aprobó el plan.", "entró en razón", [["junta escolar", "neutral-word"], ["aprobó", "neutral-word"]], "¿Qué palabras sugieren que antes la junta actuaba sin pensar?", "“Entró en razón” juzga lo que la junta hacía antes."],
  },
  {
    en: ["The so-called expert spoke to our class about nutrition.", "so-called", [["expert", "neutral-word"], ["nutrition", "neutral-word"]], "Which word makes you doubt the speaker?", "“So-called” hints that the expert is not really an expert."],
    es: ["El supuesto experto habló con nuestra clase sobre nutrición.", "supuesto", [["experto", "neutral-word"], ["nutrición", "neutral-word"]], "¿Qué palabra te hace dudar de quien habló?", "“Supuesto” insinúa que en realidad no es experto."],
  },
  {
    en: ["The greedy landlord raised the rent again.", "greedy", [["landlord", "neutral-word"], ["rent", "neutral-word"]], "Which word judges the landlord?", "“Greedy” judges the landlord instead of just reporting the rent increase."],
    es: ["El casero avaricioso volvió a subir el alquiler.", "avaricioso", [["casero", "neutral-word"], ["alquiler", "neutral-word"]], "¿Qué palabra juzga al casero?", "“Avaricioso” juzga al casero en lugar de solo informar la subida."],
  },
  {
    en: ["The council's sneaky vote happened late at night.", "sneaky", [["council's", "neutral-word"], ["late at night", "neutral-word"]], "Which word suggests the council was hiding something?", "“Sneaky” accuses the council of trickery."],
    es: ["La votación tramposa del concejo ocurrió a altas horas de la noche.", "tramposa", [["concejo", "neutral-word"], ["noche", "neutral-word"]], "¿Qué palabra sugiere que el concejo ocultaba algo?", "“Tramposa” acusa al concejo de hacer trampa."],
  },
  {
    en: ["Supporters say the park is a priceless treasure for our town.", "priceless treasure", [["supporters", "neutral-word"], ["town", "neutral-word"]], "Which words push you to love the park?", "“Priceless treasure” is meant to stir strong feelings for the park."],
    es: ["Sus defensores dicen que el parque es un tesoro invaluable para el pueblo.", "tesoro invaluable", [["defensores", "neutral-word"], ["pueblo", "neutral-word"]], "¿Qué palabras te empujan a querer el parque?", "“Tesoro invaluable” busca despertar sentimientos fuertes por el parque."],
  },
  {
    en: ["The principal slashed the art budget this spring.", "slashed", [["principal", "neutral-word"], ["art budget", "neutral-word"]], "Which word makes the change sound violent?", "“Slashed” sounds harsh; “cut” or “reduced” would be neutral."],
    es: ["El director destrozó el presupuesto de arte esta primavera.", "destrozó", [["director", "neutral-word"], ["presupuesto de arte", "neutral-word"]], "¿Qué palabra hace que el cambio suene destructivo?", "“Destrozó” suena brutal; “redujo” sería neutral."],
  },
  {
    en: ["The visiting team whined about the referee's calls.", "whined", [["visiting team", "neutral-word"], ["referee's calls", "neutral-word"]], "Which word makes the team sound childish?", "“Whined” mocks the team; “complained” would be more neutral."],
    es: ["El equipo visitante lloriqueó por las decisiones del árbitro.", "lloriqueó", [["equipo visitante", "neutral-word"], ["decisiones del árbitro", "neutral-word"]], "¿Qué palabra hace que el equipo suene infantil?", "“Lloriqueó” se burla del equipo; “se quejó” sería más neutral."],
  },
];

const NEUTRAL_REPORT: Bi<Entry>[] = [
  {
    en: ["Topic: the city's new parking fee downtown.", "The city will charge two dollars an hour for parking downtown starting in May.", [["The city's greedy new parking fee will squeeze drivers starting in May.", "biased-negative"], ["The city's smart new parking plan will finally fix downtown starting in May.", "biased-positive"], ["Everyone agrees the new two-dollar parking fee is unfair.", "opinion-as-fact"]], "Which version reports only what will happen?", "The neutral version states the facts without judging them."],
    es: ["Tema: la nueva tarifa de estacionamiento en el centro.", "La ciudad cobrará dos dólares por hora de estacionamiento en el centro a partir de mayo.", [["La avariciosa tarifa de la ciudad exprimirá a los conductores a partir de mayo.", "biased-negative"], ["El brillante plan de la ciudad por fin arreglará el centro a partir de mayo.", "biased-positive"], ["Todos están de acuerdo en que la nueva tarifa es injusta.", "opinion-as-fact"]], "¿Qué versión informa solo lo que va a pasar?", "La versión neutral da los hechos sin juzgarlos."],
  },
  {
    en: ["Topic: parents speaking at a school board meeting.", "About fifty parents spoke at the school board meeting about the new schedule.", [["A mob of angry parents stormed the school board meeting.", "biased-negative"], ["Brave parents stood up for their children at the school board meeting.", "biased-positive"], ["Obviously, the new schedule upset every single parent.", "opinion-as-fact"]], "Which version reports only what happened?", "The neutral version says who spoke, where, and about what."],
    es: ["Tema: padres que hablaron en una reunión de la junta escolar.", "Unos cincuenta padres hablaron sobre el nuevo horario en la reunión de la junta escolar.", [["Una turba de padres furiosos irrumpió en la reunión de la junta escolar.", "biased-negative"], ["Padres valientes defendieron a sus hijos en la reunión de la junta escolar.", "biased-positive"], ["Es obvio que el nuevo horario molestó a todos los padres.", "opinion-as-fact"]], "¿Qué versión informa solo lo que pasó?", "La versión neutral dice quién habló, dónde y sobre qué."],
  },
  {
    en: ["Topic: a factory closing.", "The factory will close in June, and 200 workers will need new jobs.", [["Heartless owners are abandoning 200 loyal workers in June.", "biased-negative"], ["The owners are wisely moving on from an outdated factory in June.", "biased-positive"], ["Clearly, closing the factory is the worst decision anyone could make.", "opinion-as-fact"]], "Which version reports only what will happen?", "The neutral version gives the date and the number of workers without judging."],
    es: ["Tema: el cierre de una fábrica.", "La fábrica cerrará en junio, y 200 trabajadores necesitarán un nuevo empleo.", [["Unos dueños sin corazón abandonarán a 200 trabajadores leales en junio.", "biased-negative"], ["Los dueños dejan con sabiduría una fábrica anticuada en junio.", "biased-positive"], ["Está claro que cerrar la fábrica es la peor decisión posible.", "opinion-as-fact"]], "¿Qué versión informa solo lo que va a pasar?", "La versión neutral da la fecha y el número de trabajadores sin juzgar."],
  },
  {
    en: ["Topic: a new video game.", "The game was released on Friday and costs 30 dollars.", [["The overpriced game was dumped on stores Friday.", "biased-negative"], ["The amazing game finally arrived Friday at a bargain price.", "biased-positive"], ["Everyone knows this is the best game ever made.", "opinion-as-fact"]], "Which version reports only facts you could check?", "The neutral version gives the date and the price."],
    es: ["Tema: un nuevo videojuego.", "El juego salió a la venta el viernes y cuesta 30 dólares.", [["El juego carísimo llegó a las tiendas el viernes.", "biased-negative"], ["El increíble juego por fin llegó el viernes a un precio de regalo.", "biased-positive"], ["Todo el mundo sabe que es el mejor juego de la historia.", "opinion-as-fact"]], "¿Qué versión informa solo datos que se pueden comprobar?", "La versión neutral da la fecha y el precio."],
  },
  {
    en: ["Topic: a senator's vote.", "The senator voted against the bill on Tuesday.", [["The senator betrayed voters by blocking the bill on Tuesday.", "biased-negative"], ["The courageous senator stood firm against the bill on Tuesday.", "biased-positive"], ["The senator's vote was obviously wrong.", "opinion-as-fact"]], "Which version reports only what happened?", "The neutral version says how the senator voted and when."],
    es: ["Tema: el voto de una senadora.", "La senadora votó en contra del proyecto de ley el martes.", [["La senadora traicionó a sus votantes al bloquear el proyecto el martes.", "biased-negative"], ["La valiente senadora se mantuvo firme contra el proyecto el martes.", "biased-positive"], ["Es obvio que el voto de la senadora fue un error.", "opinion-as-fact"]], "¿Qué versión informa solo lo que pasó?", "La versión neutral dice cómo votó la senadora y cuándo."],
  },
  {
    en: ["Topic: a change to the lunch menu.", "The cafeteria will replace pizza Fridays with a salad bar next month.", [["The cafeteria is ripping away pizza Fridays next month.", "biased-negative"], ["The cafeteria is finally giving students a healthy salad bar next month.", "biased-positive"], ["No student will want the new salad bar.", "opinion-as-fact"]], "Which version reports only what will change?", "The neutral version says what changes and when."],
    es: ["Tema: un cambio en el menú del almuerzo.", "El próximo mes, la cafetería cambiará la pizza de los viernes por una barra de ensaladas.", [["El próximo mes, la cafetería nos arrebatará la pizza de los viernes.", "biased-negative"], ["El próximo mes, la cafetería por fin dará una barra de ensaladas saludable.", "biased-positive"], ["Ningún estudiante va a querer la barra de ensaladas.", "opinion-as-fact"]], "¿Qué versión informa solo lo que va a cambiar?", "La versión neutral dice qué cambia y cuándo."],
  },
  {
    en: ["Topic: a new skate park.", "The town council approved a skate park for Elm Park; it will cost 400,000 dollars.", [["The council wasted 400,000 dollars on a skate park.", "biased-negative"], ["The council gave young people a wonderful gift: a skate park.", "biased-positive"], ["The skate park is plainly the best use of town money.", "opinion-as-fact"]], "Which version reports only facts you could check?", "The neutral version says what was approved and what it costs."],
    es: ["Tema: un nuevo parque para patinetas.", "El concejo aprobó un parque para patinetas en el parque Olmo, que costará 400,000 dólares.", [["El concejo desperdició 400,000 dólares en un parque para patinetas.", "biased-negative"], ["El concejo les dio a los jóvenes un regalo maravilloso: un parque para patinetas.", "biased-positive"], ["Está claro que el parque es el mejor uso del dinero del pueblo.", "opinion-as-fact"]], "¿Qué versión informa solo datos que se pueden comprobar?", "La versión neutral dice qué se aprobó y cuánto cuesta."],
  },
  {
    en: ["Topic: a teachers' strike.", "Teachers in the district stopped work on Monday after contract talks ended without a deal.", [["Teachers abandoned their students on Monday.", "biased-negative"], ["Heroic teachers took a stand for students on Monday.", "biased-positive"], ["The strike is clearly the district's fault.", "opinion-as-fact"]], "Which version reports only what happened and why?", "The neutral version reports the event and its cause without judging anyone."],
    es: ["Tema: una huelga de maestros.", "Los maestros del distrito dejaron de trabajar el lunes después de que las negociaciones terminaron sin acuerdo.", [["Los maestros abandonaron a sus estudiantes el lunes.", "biased-negative"], ["Maestros heroicos defendieron a sus estudiantes el lunes.", "biased-positive"], ["Está claro que la huelga es culpa del distrito.", "opinion-as-fact"]], "¿Qué versión informa solo lo que pasó y por qué?", "La versión neutral informa el hecho y su causa sin juzgar a nadie."],
  },
  {
    en: ["Topic: a study about screen time.", "A new study found that students who used screens less than two hours a day slept about thirty minutes longer.", [["A shocking study proves screens are ruining kids' sleep.", "biased-negative"], ["A study shows that screen time is totally harmless.", "biased-positive"], ["Every scientist agrees that screens destroy sleep.", "opinion-as-fact"]], "Which version reports only what the study found?", "The neutral version reports the finding without exaggerating it."],
    es: ["Tema: un estudio sobre el tiempo frente a pantallas.", "Un estudio nuevo encontró que los estudiantes que usaban pantallas menos de dos horas al día dormían unos treinta minutos más.", [["Un estudio impactante demuestra que las pantallas arruinan el sueño de los niños.", "biased-negative"], ["Un estudio muestra que las pantallas no hacen ningún daño.", "biased-positive"], ["Todos los científicos están de acuerdo en que las pantallas destruyen el sueño.", "opinion-as-fact"]], "¿Qué versión informa solo lo que encontró el estudio?", "La versión neutral informa el resultado sin exagerarlo."],
  },
  {
    en: ["Topic: a new highway.", "The state plans to build a highway through the valley, which will shorten the trip to the city by twenty minutes.", [["The state will bulldoze the peaceful valley for a noisy highway.", "biased-negative"], ["The state's visionary highway will finally connect the valley to the world.", "biased-positive"], ["The highway is obviously a mistake.", "opinion-as-fact"]], "Which version reports only the plan and its effect?", "The neutral version states the plan and a checkable fact about it."],
    es: ["Tema: una nueva carretera.", "El estado planea construir una carretera por el valle, que acortará el viaje a la ciudad en veinte minutos.", [["El estado arrasará el tranquilo valle para hacer una carretera ruidosa.", "biased-negative"], ["La visionaria carretera del estado por fin conectará el valle con el mundo.", "biased-positive"], ["Es obvio que la carretera es un error.", "opinion-as-fact"]], "¿Qué versión informa solo el plan y su efecto?", "La versión neutral da el plan y un dato comprobable."],
  },
  {
    en: ["Topic: a school's new phone rule.", "Starting next week, students must keep phones in their lockers during class.", [["Next week, the school will start confiscating students' phones.", "biased-negative"], ["Next week, the school will rescue students from phone addiction.", "biased-positive"], ["Everyone hates the new phone rule.", "opinion-as-fact"]], "Which version reports only the rule?", "The neutral version states the rule and when it starts."],
    es: ["Tema: la nueva regla de celulares de una escuela.", "A partir de la próxima semana, los estudiantes deberán dejar el celular en su casillero durante la clase.", [["La próxima semana, la escuela empezará a confiscar los celulares.", "biased-negative"], ["La próxima semana, la escuela rescatará a los estudiantes de la adicción al celular.", "biased-positive"], ["Todo el mundo odia la nueva regla.", "opinion-as-fact"]], "¿Qué versión informa solo la regla?", "La versión neutral da la regla y cuándo empieza."],
  },
  {
    en: ["Topic: a rainy-day recess change.", "On rainy days, recess will be held in the gym.", [["Students will be trapped in the stuffy gym on rainy days.", "biased-negative"], ["Students will enjoy a fantastic gym recess on rainy days.", "biased-positive"], ["The gym is obviously the worst place for recess.", "opinion-as-fact"]], "Which version reports only the change?", "The neutral version says where recess will be and when."],
    es: ["Tema: el recreo en días de lluvia.", "En los días de lluvia, el recreo será en el gimnasio.", [["En los días de lluvia, los estudiantes quedarán encerrados en el gimnasio sofocante.", "biased-negative"], ["En los días de lluvia, los estudiantes disfrutarán de un recreo fantástico en el gimnasio.", "biased-positive"], ["Es obvio que el gimnasio es el peor lugar para el recreo.", "opinion-as-fact"]], "¿Qué versión informa solo el cambio?", "La versión neutral dice dónde será el recreo y cuándo."],
  },
  {
    en: ["Topic: a new bike-share program.", "The city added 100 rental bikes at ten stations downtown.", [["The city cluttered downtown sidewalks with 100 rental bikes.", "biased-negative"], ["The city's brilliant bike program will save downtown.", "biased-positive"], ["Clearly, nobody will ever ride these bikes.", "opinion-as-fact"]], "Which version reports only facts you could check?", "The neutral version gives the number of bikes and stations."],
    es: ["Tema: un nuevo programa de bicicletas compartidas.", "La ciudad puso 100 bicicletas de alquiler en diez estaciones del centro.", [["La ciudad llenó las banquetas del centro de 100 estorbosas bicicletas.", "biased-negative"], ["El brillante programa de bicicletas salvará el centro.", "biased-positive"], ["Está claro que nadie va a usar esas bicicletas.", "opinion-as-fact"]], "¿Qué versión informa solo datos que se pueden comprobar?", "La versión neutral da el número de bicicletas y de estaciones."],
  },
  {
    en: ["Topic: a change to the library's hours.", "Starting in July, the library will close at 6 p.m. instead of 8 p.m.", [["In July, the library will slash its hours and shut out working families.", "biased-negative"], ["In July, the library will wisely trim its wasted evening hours.", "biased-positive"], ["Obviously, no one uses the library at night.", "opinion-as-fact"]], "Which version reports only the change?", "The neutral version gives the old and new closing times."],
    es: ["Tema: un cambio en el horario de la biblioteca.", "A partir de julio, la biblioteca cerrará a las 6 p. m. en lugar de a las 8 p. m.", [["En julio, la biblioteca recortará su horario y dejará fuera a las familias que trabajan.", "biased-negative"], ["En julio, la biblioteca eliminará con sabiduría sus horas desperdiciadas de la noche.", "biased-positive"], ["Es obvio que nadie usa la biblioteca de noche.", "opinion-as-fact"]], "¿Qué versión informa solo el cambio?", "La versión neutral da la hora de cierre anterior y la nueva."],
  },
];

const LOADED_LANGUAGE = skill(
  { id: "e.loaded.language", grade: "9", title: { en: "Bias and loaded language", es: "Sesgo y lenguaje cargado" }, standard: "RI.9-10.6", prereqs: ["e.connotation", "e.appeals"] },
  [
    {
      bank: LOADED_WORDS,
      ask: { en: "Which word or phrase is loaded, pushing the reader to feel a certain way?", es: "¿Qué palabra o frase está cargada y empuja al lector a sentir algo?" },
      hints: {
        en: ["Look for a word that judges instead of just describing.", "Loaded words carry strong feelings, like “sinister,” “glorious,” or “horde.” Neutral words just name or describe. Ask which choice could be swapped for a calmer word with the same basic meaning."],
        es: ["Busca una palabra que juzgue en lugar de solo describir.", "Las palabras cargadas llevan sentimientos fuertes, como “siniestro”, “glorioso” u “horda”. Las neutrales solo nombran o describen. Pregúntate qué opción se podría cambiar por una palabra más tranquila con el mismo significado básico."],
      },
      seconds: 20,
    },
    {
      bank: NEUTRAL_REPORT,
      ask: { en: "Which sentence reports this most neutrally, without bias?", es: "¿Qué oración lo informa de la manera más neutral, sin sesgo?" },
      hints: {
        en: ["Which version sticks to facts you could check?", "Rule out versions with loaded words that push you to like or dislike something, and versions that state an opinion as if it were a fact, with words like “obviously,” “clearly,” or “everyone agrees.”"],
        es: ["¿Qué versión se limita a datos que se pueden comprobar?", "Descarta las versiones con palabras cargadas que te empujan a querer o rechazar algo, y las que presentan una opinión como si fuera un hecho, con palabras como “es obvio”, “está claro” o “todos están de acuerdo”."],
      },
      seconds: 30,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.evidence.quality — level 1: the most credible source for a question (old records are fine for
// history and for long-term trends, which is taught on purpose); level 2: the main weakness of a piece
// of evidence.

const SOURCES: Bi<Entry>[] = [
  {
    en: ["Question: How much sleep do teenagers need?", "A guide from a national association of sleep doctors, updated last year", [["A mattress company's ad about teen sleep", "biased-source"], ["A magazine article about sleep from 1975", "outdated-source"], ["An anonymous post on a homework forum", "unqualified-source"]], "Who studies sleep, has nothing to sell, and is up to date?", "Experts with current research and nothing to sell are the most credible."],
    es: ["Pregunta: ¿Cuántas horas de sueño necesitan los adolescentes?", "Una guía de una asociación nacional de médicos del sueño, actualizada el año pasado", [["Un anuncio de una empresa de colchones", "biased-source"], ["Un artículo de revista sobre el sueño de 1975", "outdated-source"], ["Un comentario anónimo en un foro de tareas", "unqualified-source"]], "¿Quién estudia el sueño, no vende nada y está al día?", "Los expertos con investigaciones recientes y nada que vender son los más confiables."],
  },
  {
    en: ["Question: Is the water in our town's lake safe for swimming?", "This month's water test results from the county health department", [["A brochure from a lakeside resort", "biased-source"], ["Water tests from ten years ago", "outdated-source"], ["A neighbor who swam there once and felt fine", "anecdote"]], "Water quality can change. Who tests it, and how recently?", "Recent tests by health officials are the most credible."],
    es: ["Pregunta: ¿El agua del lago del pueblo es segura para nadar?", "Los resultados de las pruebas de agua de este mes del departamento de salud del condado", [["El folleto de un hotel junto al lago", "biased-source"], ["Pruebas de agua de hace diez años", "outdated-source"], ["Un vecino que nadó ahí una vez y se sintió bien", "anecdote"]], "La calidad del agua puede cambiar. ¿Quién la mide y qué tan reciente es la medición?", "Las pruebas recientes de las autoridades de salud son las más confiables."],
  },
  {
    en: ["Question: How did the Apollo 11 astronauts land on the moon?", "NASA's mission records and the astronauts' own reports", [["A science fiction movie about a moon landing", "unqualified-source"], ["A blog with no author that says the landing was fake", "unqualified-source"], ["A toy company's website for its rocket set", "biased-source"]], "For a historical event, what records did the people involved leave?", "Records made by the people who did it are strong evidence, even though they are old."],
    es: ["Pregunta: ¿Cómo llegaron a la Luna los astronautas del Apolo 11?", "Los registros de la misión de la NASA y los informes de los propios astronautas", [["Una película de ciencia ficción sobre un viaje a la Luna", "unqualified-source"], ["Un blog sin autor que dice que el viaje fue falso", "unqualified-source"], ["La página de una juguetería que vende cohetes de juguete", "biased-source"]], "Para un hecho histórico, ¿qué registros dejaron quienes participaron?", "Los registros de quienes lo hicieron son evidencia sólida, aunque sean antiguos."],
  },
  {
    en: ["Question: Does a new allergy medicine work?", "A study published in a medical journal and reviewed by other doctors", [["An ad from the company that makes the medicine", "biased-source"], ["A friend who says it helped her once", "anecdote"], ["A comment under a video about allergies", "unqualified-source"]], "Which source was checked by experts and has nothing to sell?", "A reviewed medical study is the most credible."],
    es: ["Pregunta: ¿Funciona un nuevo medicamento para la alergia?", "Un estudio publicado en una revista médica y revisado por otros médicos", [["Un anuncio de la empresa que fabrica el medicamento", "biased-source"], ["Una amiga que dice que una vez le ayudó", "anecdote"], ["Un comentario debajo de un video sobre alergias", "unqualified-source"]], "¿Qué fuente revisaron los expertos y no tiene nada que vender?", "Un estudio médico revisado es el más confiable."],
  },
  {
    en: ["Question: What will the weather be this weekend?", "Today's forecast from the National Weather Service", [["Last month's forecast", "outdated-source"], ["An almanac printed last year", "outdated-source"], ["A cousin who says his knee aches before rain", "anecdote"]], "Weather changes fast. Which source is both expert and current?", "Today's forecast from weather scientists is the most credible."],
    es: ["Pregunta: ¿Qué tiempo hará este fin de semana?", "El pronóstico de hoy del Servicio Meteorológico Nacional", [["El pronóstico del mes pasado", "outdated-source"], ["Un almanaque impreso el año pasado", "outdated-source"], ["Un primo que dice que le duele la rodilla antes de que llueva", "anecdote"]], "El tiempo cambia rápido. ¿Qué fuente es experta y actual?", "El pronóstico de hoy de los meteorólogos es el más confiable."],
  },
  {
    en: ["Question: How many students in our school walk to school?", "A survey of every homeroom taken this fall", [["A count of the students in one homeroom", "small-sample"], ["The principal's guess", "unqualified-source"], ["A survey from five years ago", "outdated-source"]], "Which source counts the most students, most recently?", "A recent survey of every homeroom is the most credible."],
    es: ["Pregunta: ¿Cuántos estudiantes de nuestra escuela llegan caminando?", "Una encuesta en todos los grupos hecha este otoño", [["Un conteo de los estudiantes de un solo grupo", "small-sample"], ["Lo que calcula el director a ojo", "unqualified-source"], ["Una encuesta de hace cinco años", "outdated-source"]], "¿Qué fuente cuenta a más estudiantes, y con más actualidad?", "Una encuesta reciente en todos los grupos es la más confiable."],
  },
  {
    en: ["Question: Is a used car in good condition?", "A report from an independent mechanic who inspected the car", [["The seller's description of the car", "biased-source"], ["A review of that car model from 20 years ago", "outdated-source"], ["A friend who says that kind of car never breaks", "anecdote"]], "Who has examined this exact car and gains nothing from the sale?", "An independent inspection is the most credible."],
    es: ["Pregunta: ¿Un carro usado está en buenas condiciones?", "El informe de un mecánico independiente que revisó el carro", [["La descripción del vendedor", "biased-source"], ["Una reseña de ese modelo de hace 20 años", "outdated-source"], ["Un amigo que dice que esos carros nunca fallan", "anecdote"]], "¿Quién revisó este carro en particular y no gana nada con la venta?", "Una revisión independiente es la más confiable."],
  },
  {
    en: ["Question: How many people live in our state?", "The most recent United States Census figures", [["A population estimate from 1990", "outdated-source"], ["A tourism ad that says the state is home to millions", "biased-source"], ["A guess from a travel blog", "unqualified-source"]], "Which source counts people officially, and most recently?", "The latest census is the most credible count."],
    es: ["Pregunta: ¿Cuántas personas viven en nuestro estado?", "Las cifras más recientes del Censo de los Estados Unidos", [["Un cálculo de población de 1990", "outdated-source"], ["Un anuncio de turismo que dice que en el estado viven millones", "biased-source"], ["Un cálculo de un blog de viajes", "unqualified-source"]], "¿Qué fuente cuenta a la gente de manera oficial y más reciente?", "El censo más reciente es el conteo más confiable."],
  },
  {
    en: ["Question: Are electric scooters safe for teens?", "A recent report on scooter injuries from a children's hospital", [["A scooter rental company's safety page", "biased-source"], ["A teen who rides every day and has never been hurt", "anecdote"], ["A news story from before scooters were sold in the city", "outdated-source"]], "Which source has data on many riders and nothing to sell?", "A hospital's recent injury report is the most credible."],
    es: ["Pregunta: ¿Los scooters eléctricos son seguros para los adolescentes?", "Un informe reciente de un hospital infantil sobre lesiones en scooter", [["La página de seguridad de una empresa que renta scooters", "biased-source"], ["Un adolescente que anda en scooter todos los días y nunca se ha lastimado", "anecdote"], ["Una noticia de antes de que vendieran scooters en la ciudad", "outdated-source"]], "¿Qué fuente tiene datos de muchos usuarios y nada que vender?", "El informe reciente de un hospital es el más confiable."],
  },
  {
    en: ["Question: What does the Declaration of Independence say?", "The text of the Declaration itself, from the National Archives", [["A cartoon that retells the story", "unqualified-source"], ["A classmate's summary from memory", "anecdote"], ["A store ad for Fourth of July sales", "biased-source"]], "What is the best source for what a document says?", "The document itself is the best evidence of what it says."],
    es: ["Pregunta: ¿Qué dice la Declaración de Independencia?", "El texto de la Declaración, de los Archivos Nacionales", [["Una caricatura que vuelve a contar la historia", "unqualified-source"], ["El resumen que un compañero hace de memoria", "anecdote"], ["Un anuncio de ofertas del 4 de julio", "biased-source"]], "¿Cuál es la mejor fuente para saber qué dice un documento?", "El documento mismo es la mejor evidencia de lo que dice."],
  },
  {
    en: ["Question: Which phone has the longest battery life?", "Battery tests run this year by an independent consumer testing group", [["The phone maker's ad", "biased-source"], ["Battery tests from four years ago", "outdated-source"], ["One person's online review", "anecdote"]], "Which source tested many phones fairly and recently?", "Recent independent tests are the most credible."],
    es: ["Pregunta: ¿Qué teléfono tiene la batería que dura más?", "Pruebas de batería hechas este año por un grupo independiente de consumidores", [["El anuncio del fabricante", "biased-source"], ["Pruebas de batería de hace cuatro años", "outdated-source"], ["La reseña de una sola persona en internet", "anecdote"]], "¿Qué fuente probó muchos teléfonos de manera justa y reciente?", "Las pruebas independientes recientes son las más confiables."],
  },
  {
    en: ["Question: Is our town's river flooding more often than it used to?", "Fifty years of flood records from the state water agency", [["One photo of a flooded road", "anecdote"], ["A sales letter from a flood insurance company", "biased-source"], ["A rumor heard at the grocery store", "unqualified-source"]], "To see a change over time, what kind of records do you need?", "Long-term official records show the trend; here, old data is exactly what you need."],
    es: ["Pregunta: ¿El río del pueblo se desborda más que antes?", "Cincuenta años de registros de inundaciones de la agencia estatal del agua", [["Una foto de una calle inundada", "anecdote"], ["Una carta de venta de una aseguradora contra inundaciones", "biased-source"], ["Un rumor que se oyó en la tienda", "unqualified-source"]], "Para ver un cambio con el tiempo, ¿qué registros necesitas?", "Los registros oficiales de muchos años muestran la tendencia; aquí, los datos antiguos son justo lo que hace falta."],
  },
  {
    en: ["Question: Do students learn better with music playing?", "A study that compared 500 students working with and without music", [["A study of three students", "small-sample"], ["A music app's blog post", "biased-source"], ["A student who says music helps her focus", "anecdote"]], "Which source tested the most students and has nothing to gain?", "A large comparison study is the most credible."],
    es: ["Pregunta: ¿Los estudiantes aprenden mejor con música?", "Un estudio que comparó a 500 estudiantes trabajando con música y sin música", [["Un estudio con tres estudiantes", "small-sample"], ["Una publicación del blog de una aplicación de música", "biased-source"], ["Una estudiante que dice que la música la ayuda a concentrarse", "anecdote"]], "¿Qué fuente estudió a más estudiantes y no gana nada?", "Un estudio grande que compara grupos es el más confiable."],
  },
  {
    en: ["Question: What are this year's rules for the state science fair?", "This year's rule book from the state science fair website", [["Last year's rule book", "outdated-source"], ["A rumor from another school", "unqualified-source"], ["A science kit company's ad", "biased-source"]], "Rules can change each year. Which source is official and current?", "The official rule book for this year is the most credible."],
    es: ["Pregunta: ¿Cuáles son las reglas de este año para la feria estatal de ciencias?", "El reglamento de este año en la página oficial de la feria", [["El reglamento del año pasado", "outdated-source"], ["Un rumor de otra escuela", "unqualified-source"], ["El anuncio de una empresa de juegos de ciencias", "biased-source"]], "Las reglas pueden cambiar cada año. ¿Qué fuente es oficial y actual?", "El reglamento oficial de este año es el más confiable."],
  },
];

type Weakness = "small-sample" | "biased-source" | "outdated" | "irrelevant";
const WEAKNESSES: readonly Weakness[] = ["small-sample", "biased-source", "outdated", "irrelevant"];
const EVIDENCE_WEAKNESS = cats<Weakness>(
  {
    en: { "small-sample": "The sample is too small", "biased-source": "The source has a reason to be biased", outdated: "The information is out of date", irrelevant: "It does not prove this claim" },
    es: { "small-sample": "La muestra es demasiado pequeña", "biased-source": "La fuente tiene motivos para no ser imparcial", outdated: "La información es antigua", irrelevant: "No prueba esta afirmación" },
  },
  { en: WEAKNESSES, es: WEAKNESSES },
  [
    {
      en: ["Claim: Most students at our school want a later start time. Evidence: I asked three friends, and all of them said yes.", "small-sample", "How many students were asked?", "Three friends cannot speak for a whole school."],
      es: ["Afirmación: La mayoría de los estudiantes de nuestra escuela quiere entrar más tarde. Evidencia: Les pregunté a tres amigos y todos dijeron que sí.", "small-sample", "¿A cuántos estudiantes les preguntaron?", "Tres amigos no pueden hablar por toda una escuela."],
    },
    {
      en: ["Claim: Sugary cereal is part of a healthy breakfast. Evidence: A study paid for by a cereal company says so.", "biased-source", "Who paid for the study?", "The cereal company profits if people believe it."],
      es: ["Afirmación: El cereal azucarado es parte de un desayuno sano. Evidencia: Lo dice un estudio pagado por una empresa de cereales.", "biased-source", "¿Quién pagó el estudio?", "La empresa de cereales gana si la gente lo cree."],
    },
    {
      en: ["Claim: Phones are banned in most schools in our state. Evidence: A newspaper article from 2005.", "outdated", "When was the article written?", "School phone rules have changed a lot since 2005."],
      es: ["Afirmación: Los celulares están prohibidos en la mayoría de las escuelas del estado. Evidencia: Un artículo de periódico de 2005.", "outdated", "¿Cuándo se escribió el artículo?", "Las reglas sobre celulares en las escuelas han cambiado mucho desde 2005."],
    },
    {
      en: ["Claim: The school needs a new gym. Evidence: Our basketball team won the championship last year.", "irrelevant", "Does winning say anything about whether the gym is good enough?", "A championship does not show that the gym needs replacing."],
      es: ["Afirmación: La escuela necesita un gimnasio nuevo. Evidencia: Nuestro equipo de básquetbol ganó el campeonato el año pasado.", "irrelevant", "¿Ganar dice algo sobre si el gimnasio está en buen estado?", "Un campeonato no demuestra que haga falta cambiar el gimnasio."],
    },
    {
      en: ["Claim: People in our town love the new park. Evidence: Two people posted happy reviews online.", "small-sample", "How many people does the evidence include?", "Two reviews cannot speak for a whole town."],
      es: ["Afirmación: A la gente del pueblo le encanta el parque nuevo. Evidencia: Dos personas publicaron reseñas positivas en internet.", "small-sample", "¿A cuántas personas incluye la evidencia?", "Dos reseñas no pueden hablar por todo un pueblo."],
    },
    {
      en: ["Claim: Our energy drink improves test scores. Evidence: The company that sells the drink ran the only test.", "biased-source", "Who ran the test, and what do they gain?", "The seller profits if the drink seems to work."],
      es: ["Afirmación: Nuestra bebida energética mejora las calificaciones. Evidencia: La única prueba la hizo la empresa que vende la bebida.", "biased-source", "¿Quién hizo la prueba y qué gana con ella?", "La empresa gana si parece que la bebida funciona."],
    },
    {
      en: ["Claim: The bus fare in our city is two dollars. Evidence: A city bus map printed fifteen years ago.", "outdated", "When was the map printed?", "Fares can change in fifteen years."],
      es: ["Afirmación: El pasaje del autobús en nuestra ciudad cuesta dos dólares. Evidencia: Un mapa de autobuses impreso hace quince años.", "outdated", "¿Cuándo se imprimió el mapa?", "Los pasajes pueden cambiar en quince años."],
    },
    {
      en: ["Claim: Dogs are smarter than cats. Evidence: Dogs are more popular pets in our neighborhood.", "irrelevant", "Does being popular measure being smart?", "Popularity says nothing about intelligence."],
      es: ["Afirmación: Los perros son más inteligentes que los gatos. Evidencia: En nuestro barrio hay más perros que gatos como mascotas.", "irrelevant", "¿Ser más común mide la inteligencia?", "Que haya más perros no dice nada sobre su inteligencia."],
    },
    {
      en: ["Claim: Most teens prefer reading on paper. Evidence: A survey of five students in one class.", "small-sample", "How many teens were surveyed?", "Five students are far too few to speak for most teens."],
      es: ["Afirmación: La mayoría de los adolescentes prefiere leer en papel. Evidencia: Una encuesta a cinco estudiantes de un grupo.", "small-sample", "¿A cuántos adolescentes encuestaron?", "Cinco estudiantes son muy pocos para hablar por la mayoría."],
    },
    {
      en: ["Claim: Our town does not need bike lanes. Evidence: A report written by a group of car dealers.", "biased-source", "Who wrote the report, and what do they gain?", "Car dealers may gain if fewer people ride bikes."],
      es: ["Afirmación: Nuestro pueblo no necesita ciclovías. Evidencia: Un informe escrito por un grupo de vendedores de autos.", "biased-source", "¿Quién escribió el informe y qué gana?", "Los vendedores de autos podrían ganar si menos gente usa bicicleta."],
    },
    {
      en: ["Claim: The library has the newest science books. Evidence: A list of books from the library's catalog in 2012.", "outdated", "When was the list made?", "A list from 2012 cannot show the newest books."],
      es: ["Afirmación: La biblioteca tiene los libros de ciencias más nuevos. Evidencia: Una lista del catálogo de la biblioteca de 2012.", "outdated", "¿Cuándo se hizo la lista?", "Una lista de 2012 no puede mostrar los libros más nuevos."],
    },
    {
      en: ["Claim: Our school lunches are healthy. Evidence: The cafeteria was painted last summer.", "irrelevant", "Does fresh paint say anything about the food?", "The paint has nothing to do with how healthy the food is."],
      es: ["Afirmación: Los almuerzos de nuestra escuela son sanos. Evidencia: La cafetería se pintó el verano pasado.", "irrelevant", "¿La pintura nueva dice algo sobre la comida?", "La pintura no tiene nada que ver con lo sana que es la comida."],
    },
    {
      en: ["Claim: Everyone in the state supports the new law. Evidence: A poll of ten people at one shopping mall.", "small-sample", "How many people were asked, and where?", "Ten people at one mall cannot speak for a whole state."],
      es: ["Afirmación: Todo el estado apoya la nueva ley. Evidencia: Una encuesta a diez personas en un centro comercial.", "small-sample", "¿A cuántas personas les preguntaron, y dónde?", "Diez personas en un centro comercial no pueden hablar por todo un estado."],
    },
    {
      en: ["Claim: Video games improve reading skills. Evidence: A video game company's ad.", "biased-source", "Who made the ad, and what do they gain?", "The company profits if people believe games help."],
      es: ["Afirmación: Los videojuegos mejoran la lectura. Evidencia: Un anuncio de una empresa de videojuegos.", "biased-source", "¿Quién hizo el anuncio y qué gana?", "La empresa gana si la gente cree que los juegos ayudan."],
    },
    {
      en: ["Claim: There are nine planets in our solar system. Evidence: A textbook printed in 1995.", "outdated", "When was the book printed, and has astronomy changed since then?", "In 2006, astronomers reclassified Pluto as a dwarf planet, so the book is out of date."],
      es: ["Afirmación: Nuestro sistema solar tiene nueve planetas. Evidencia: Un libro de texto impreso en 1995.", "outdated", "¿Cuándo se imprimió el libro, y ha cambiado la astronomía desde entonces?", "En 2006, los astrónomos reclasificaron a Plutón como planeta enano, así que el libro es antiguo."],
    },
    {
      en: ["Claim: Our class should get a class pet. Evidence: Hamsters are most active at night.", "irrelevant", "Does this fact give a reason for or against having a pet?", "When hamsters are active does not show the class should get a pet."],
      es: ["Afirmación: Nuestra clase debería tener una mascota. Evidencia: Los hámsteres son más activos de noche.", "irrelevant", "¿Este dato da una razón a favor o en contra de tener mascota?", "La hora en que los hámsteres están activos no demuestra que la clase deba tener mascota."],
    },
  ],
);

const EVIDENCE_QUALITY = skill(
  { id: "e.evidence.quality", grade: "9", title: { en: "Evaluate evidence", es: "Evaluar la evidencia" }, standard: "RI.9-10.8", prereqs: ["e.claim.evidence", "e.fallacies"] },
  [
    {
      bank: SOURCES,
      ask: { en: "Which source is the most credible for this question?", es: "¿Qué fuente es la más confiable para esta pregunta?" },
      hints: {
        en: ["Ask who made each source, when, and why.", "The best source is expert, recent when the facts change over time, based on many cases, and free of any reason to twist the facts. One person's story is weak evidence."],
        es: ["Pregúntate quién hizo cada fuente, cuándo y para qué.", "La mejor fuente es experta, reciente si los datos cambian con el tiempo, basada en muchos casos y sin motivos para torcer los hechos. La historia de una sola persona es evidencia débil."],
      },
      seconds: 30,
    },
    {
      ...EVIDENCE_WEAKNESS,
      ask: { en: "What is the main weakness of this evidence?", es: "¿Cuál es la principal debilidad de esta evidencia?" },
      hints: {
        en: ["Read the claim, then ask: does this evidence really prove it?", "Check four things: Is the sample big enough? Does the source gain from the claim? Is it recent enough? Does it even relate to the claim?"],
        es: ["Lee la afirmación y pregúntate: ¿esta evidencia de verdad la prueba?", "Revisa cuatro cosas: ¿la muestra es suficiente?, ¿la fuente gana algo con la afirmación?, ¿es lo bastante reciente?, ¿tiene relación con la afirmación?"],
      },
      seconds: 25,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.mla.citation — level 1: MLA in-text citations (last name and page, no comma, no “p.”; “and” for two
// authors, “et al.” for three or more; a short title in quotation marks when there is no author; only
// the page when the author is named in the sentence; Spanish adds compound surnames written in full);
// level 2: the order of a Works Cited list, alphabetical by the author's last name (Spanish: by the first
// surname). Level 2 is built from the source data below, so the key is sorted by code.

const IN_TEXT: Bi<Entry>[] = [
  {
    en: ["Source: a book by Maria Ruiz. The quotation is on page 42.", "(Ruiz 42)", [["(Ruiz, 42)", "comma-in-citation"], ["(Maria Ruiz 42)", "first-name-in-citation"], ["(Ruiz p. 42)", "page-abbreviation"]], "MLA uses the author's last name and the page number.", "MLA in-text citations give the last name and the page number, with no comma and no “p.”"],
    es: ["Fuente: un libro de María Ruiz. La cita está en la página 42.", "(Ruiz 42)", [["(Ruiz, 42)", "comma-in-citation"], ["(María Ruiz 42)", "first-name-in-citation"], ["(Ruiz p. 42)", "page-abbreviation"]], "MLA usa el apellido del autor y el número de página.", "En MLA, la cita entre paréntesis lleva el apellido y la página, sin coma y sin “p.”."],
  },
  {
    en: ["Source: an article by David Chen. The quotation is on page 7.", "(Chen 7)", [["(Chen, page 7)", "page-abbreviation"], ["(7 Chen)", "wrong-order"], ["(David Chen, 7)", "first-name-in-citation"]], "MLA uses the author's last name and the page number, in that order.", "The last name comes first, then the page number, with nothing between them but a space."],
    es: ["Fuente: un libro de Gabriel García Márquez. La cita está en la página 45.", "(García Márquez 45)", [["(Márquez 45)", "partial-surname"], ["(Gabriel García Márquez 45)", "first-name-in-citation"], ["(García Márquez, 45)", "comma-in-citation"]], "En español, muchas personas tienen dos apellidos. ¿Cómo aparece el apellido completo de este autor?", "Los apellidos compuestos se escriben completos: García Márquez, y luego la página sin coma."],
  },
  {
    en: ["Source: a book by Aisha Bello and Tom Park. The quotation is on page 115.", "(Bello and Park 115)", [["(Bello, Park, 115)", "comma-in-citation"], ["(Bello et al. 115)", "et-al-for-two"], ["(Aisha Bello and Tom Park 115)", "first-name-in-citation"]], "There are two authors. How does MLA join two last names?", "Two authors are joined with “and,” followed by the page number."],
    es: ["Fuente: un artículo de Ana López Ortega. La cita está en la página 7.", "(López Ortega 7)", [["(Ortega 7)", "partial-surname"], ["(7 López Ortega)", "wrong-order"], ["(López Ortega, pág. 7)", "page-abbreviation"]], "La autora tiene dos apellidos. ¿Cuáles van en la cita?", "Los dos apellidos van completos, y después la página, sin coma ni abreviatura."],
  },
  {
    en: ["Source: a book by Lena Ortiz, Sam Lee, and Rosa Kim. The quotation is on page 30.", "(Ortiz et al. 30)", [["(Ortiz et al., 30)", "comma-in-citation"], ["(Ortiz, Lee, and Kim 30)", "et-al-missing"], ["(Lena Ortiz et al. 30)", "first-name-in-citation"]], "There are three authors. What does MLA do with three or more?", "With three or more authors, MLA gives the first author's last name and “et al.”"],
    es: ["Fuente: un libro de Lena Ortiz, Sam Lee y Rosa Kim. La cita está en la página 30.", "(Ortiz et al. 30)", [["(Ortiz et al., 30)", "comma-in-citation"], ["(Ortiz, Lee, Kim 30)", "et-al-missing"], ["(Lena Ortiz et al. 30)", "first-name-in-citation"]], "Hay tres autores. ¿Qué hace MLA cuando hay tres o más?", "Con tres autores o más, MLA usa el apellido del primero y “et al.”."],
  },
  {
    en: ["Source: an article with no author, titled “Saving the Bees.” The quotation is on page 3.", "(“Saving the Bees” 3)", [["(Anonymous 3)", "anonymous-for-no-author"], ["(3)", "missing-title"], ["(Saving the Bees 3)", "missing-quotation-marks"]], "There is no author. What does MLA use instead?", "With no author, use the title of the article in quotation marks, then the page."],
    es: ["Fuente: un artículo sin autor titulado “Cómo salvar a las abejas”. La cita está en la página 3.", "(“Cómo salvar a las abejas” 3)", [["(Anónimo 3)", "anonymous-for-no-author"], ["(3)", "missing-title"], ["(Cómo salvar a las abejas 3)", "missing-quotation-marks"]], "No hay autor. ¿Qué usa MLA en su lugar?", "Sin autor, se usa el título del artículo entre comillas y luego la página."],
  },
  {
    en: ["Source: a book by Kenji Sato. Your sentence already names him: Sato argues that rivers shape cities. The idea is on page 58.", "(58)", [["(Sato 58)", "repeated-author"], ["(p. 58)", "page-abbreviation"], ["(Kenji 58)", "first-name-in-citation"]], "The sentence already names the author. What is left to give?", "When the author is named in the sentence, the parentheses give only the page."],
    es: ["Fuente: un libro de Kenji Sato. Tu oración ya lo nombra: Sato explica que los ríos dan forma a las ciudades. La idea está en la página 58.", "(58)", [["(Sato 58)", "repeated-author"], ["(p. 58)", "page-abbreviation"], ["(Kenji 58)", "first-name-in-citation"]], "La oración ya nombra al autor. ¿Qué falta dar?", "Si el autor ya aparece en la oración, en el paréntesis solo va la página."],
  },
  {
    en: ["Source: a web page by Nia Brooks with no page numbers.", "(Brooks)", [["(Brooks, website)", "comma-in-citation"], ["(Nia Brooks)", "first-name-in-citation"], ["(Brooks p. 1)", "page-abbreviation"]], "There are no page numbers. What is left?", "With no page numbers, the citation gives only the last name."],
    es: ["Fuente: una página web de Nia Brooks sin números de página.", "(Brooks)", [["(Brooks, sitio web)", "comma-in-citation"], ["(Nia Brooks)", "first-name-in-citation"], ["(Brooks p. 1)", "page-abbreviation"]], "No hay números de página. ¿Qué queda?", "Sin números de página, la cita lleva solo el apellido."],
  },
  {
    en: ["Source: a book by Omar Haddad, published in 2020. The quotation is on page 201.", "(Haddad 201)", [["(Haddad, 2020)", "apa-style"], ["(201 Haddad)", "wrong-order"], ["(Omar 201)", "first-name-in-citation"]], "Does MLA put the year or the page in the parentheses?", "MLA uses the page number, not the year: the year belongs to another style."],
    es: ["Fuente: un libro de Omar Haddad, publicado en 2020. La cita está en la página 201.", "(Haddad 201)", [["(Haddad, 2020)", "apa-style"], ["(201 Haddad)", "wrong-order"], ["(Omar 201)", "first-name-in-citation"]], "¿MLA pone el año o la página en el paréntesis?", "MLA usa la página, no el año: el año es de otro formato."],
  },
  {
    en: ["Source: an article by Grace Liu and Ben Ford. The quotation is on page 12.", "(Liu and Ford 12)", [["(Liu & Ford, 12)", "apa-style"], ["(Liu et al. 12)", "et-al-for-two"], ["(Liu, Ford 12)", "comma-in-citation"]], "There are two authors. How does MLA join two last names?", "Two authors are joined with the word “and,” followed by the page number."],
    es: ["Fuente: un libro de Sofía Reyes Luna. La cita está en la página 77.", "(Reyes Luna 77)", [["(Luna 77)", "partial-surname"], ["(Reyes Luna, 77)", "comma-in-citation"], ["(Reyes Luna 2019)", "apa-style"]], "La autora tiene dos apellidos. ¿Cuáles van en la cita, y qué número?", "Los dos apellidos van completos, y después la página, sin coma."],
  },
  {
    en: ["Source: a book by Ana Diaz, published in 2019. The quotation is on page 9.", "(Diaz 9)", [["(Diaz, 2019)", "apa-style"], ["(Diaz 2019, 9)", "apa-style"], ["(Diaz, p. 9)", "page-abbreviation"]], "Does MLA put the year or the page in the parentheses?", "MLA uses the last name and the page number only."],
    es: ["Fuente: un libro de Ruth Okafor, Leo Martín e Ida Cho. La cita está en la página 64.", "(Okafor et al. 64)", [["(Okafor et al., 64)", "comma-in-citation"], ["(Okafor, Martín, Cho 64)", "et-al-missing"], ["(Ruth Okafor et al. 64)", "first-name-in-citation"]], "Hay tres autores. ¿Qué hace MLA cuando hay tres o más?", "Con tres autores o más, MLA usa el apellido del primero y “et al.”."],
  },
  {
    en: ["Source: a book by Ruth Okafor, Leo Martin, and Ida Cho. The quotation is on page 64.", "(Okafor et al. 64)", [["(Okafor and Martin 64)", "et-al-missing"], ["(Okafor et al., 64)", "comma-in-citation"], ["(Ruth Okafor et al. 64)", "first-name-in-citation"]], "There are three authors. What does MLA do with three or more?", "With three or more authors, MLA gives the first author's last name and “et al.”"],
    es: ["Fuente: un artículo sin autor titulado “Cómo se forman los volcanes”. La cita está en la página 2.", "(“Cómo se forman los volcanes” 2)", [["(Desconocido 2)", "anonymous-for-no-author"], ["(Cómo se forman los volcanes 2)", "missing-quotation-marks"], ["(2)", "missing-title"]], "No hay autor. ¿Qué usa MLA en su lugar?", "Sin autor, se usa el título del artículo entre comillas y luego la página."],
  },
  {
    en: ["Source: an article with no author, titled “How Volcanoes Form.” The quotation is on page 2.", "(“How Volcanoes Form” 2)", [["(Unknown 2)", "anonymous-for-no-author"], ["(How Volcanoes Form 2)", "missing-quotation-marks"], ["(2)", "missing-title"]], "There is no author. What does MLA use instead?", "With no author, use the title of the article in quotation marks, then the page."],
    es: ["Fuente: un libro de Priya Nair. Tu oración ya la nombra: Nair escribe que “todo mapa cuenta una historia”. La cita está en la página 14.", "(14)", [["(Nair 14)", "repeated-author"], ["(Nair, 14)", "comma-in-citation"], ["(página 14)", "page-abbreviation"]], "La oración ya nombra a la autora. ¿Qué falta dar?", "Si la autora ya aparece en la oración, en el paréntesis solo va la página."],
  },
  {
    en: ["Source: a book by Priya Nair. Your sentence already names her: Nair writes that “every map tells a story.” The quotation is on page 14.", "(14)", [["(Nair 14)", "repeated-author"], ["(Nair, 14)", "comma-in-citation"], ["(page 14)", "page-abbreviation"]], "The sentence already names the author. What is left to give?", "When the author is named in the sentence, the parentheses give only the page."],
    es: ["Fuente: un libro de Diego Torres Vega. La cita está en la página 9.", "(Torres Vega 9)", [["(Vega 9)", "partial-surname"], ["(Diego Torres Vega 9)", "first-name-in-citation"], ["(Torres Vega, p. 9)", "page-abbreviation"]], "El autor tiene dos apellidos. ¿Cuáles van en la cita?", "Los dos apellidos van completos, y después la página, sin coma ni abreviatura."],
  },
  {
    en: ["Source: a book by Sofia Reyes. The quotation is on page 77.", "(Reyes 77)", [["(Reyes, 77)", "comma-in-citation"], ["(Sofia Reyes, page 77)", "first-name-in-citation"], ["(Reyes 2019)", "apa-style"]], "MLA uses the author's last name and the page number.", "Last name, a space, and the page number: nothing else."],
    es: ["Fuente: un artículo de David Chen. La cita está en la página 12.", "(Chen 12)", [["(Chen, página 12)", "page-abbreviation"], ["(12 Chen)", "wrong-order"], ["(Chen 2021)", "apa-style"]], "MLA usa el apellido del autor y el número de página, en ese orden.", "Primero el apellido, después la página, sin nada en medio más que un espacio."],
  },
];

/** A source for the Works Cited order: first name, last name (Spanish: both surnames), year, topic. */
export type Source = [first: string, last: string, year: number, topic: string];

const WORKS_CITED_SETS: Bi<Source[]>[] = [
  { en: [["Maya", "Lee", 2022, "bridges"], ["Ben", "Young", 2010, "deserts"], ["Zoe", "Adams", 2018, "mountains"]], es: [["Ana", "López Ortega", 2022, "puentes"], ["Beto", "Ruiz Gil", 2010, "desiertos"], ["Zoe", "Álvarez Mora", 2018, "montañas"]] },
  { en: [["Omar", "Haddad", 2015, "soccer"], ["Carmen", "Ortiz", 2021, "space travel"], ["Ana", "Bell", 2019, "birds"]], es: [["Omar", "Haddad Soto", 2015, "fútbol"], ["Carmen", "Ortiz Vega", 2021, "viajes espaciales"], ["Ana", "Bello Ramos", 2019, "aves"]] },
  { en: [["Kenji", "Sato", 2012, "cooking"], ["Lucy", "Diaz", 2020, "jazz"], ["Ivan", "Petrov", 2016, "chess"]], es: [["Lucía", "Torres Luna", 2012, "cocina"], ["Diego", "Castro Peña", 2020, "jazz"], ["Iván", "Navarro Díaz", 2016, "ajedrez"]] },
  { en: [["Grace", "Wu", 2017, "volcanoes"], ["Noah", "Fischer", 2011, "basketball"], ["Amara", "Okafor", 2023, "painting"]], es: [["Gabriela", "Ramírez Cruz", 2017, "volcanes"], ["Nicolás", "Fuentes Lara", 2023, "básquetbol"], ["Amara", "Delgado Ríos", 2011, "pintura"]] },
  { en: [["Priya", "Nair", 2014, "whales"], ["Hugo", "Martin", 2022, "robots"], ["Tina", "Garcia", 2019, "gardens"]], es: [["Paula", "Méndez Rojas", 2014, "ballenas"], ["Hugo", "Serrano Gil", 2022, "robots"], ["Elena", "García Paz", 2019, "huertos"]] },
  { en: [["Amy", "Turner", 2016, "baseball"], ["Mei", "Chen", 2013, "music"], ["Ben", "Kapoor", 2021, "planets"]], es: [["Samuel", "Vidal Ortega", 2016, "béisbol"], ["Mei", "Chen Morales", 2013, "música"], ["Raúl", "Herrera Salas", 2021, "planetas"]] },
  { en: [["Lena", "Novak", 2020, "bees"], ["Jamal", "Reed", 2012, "drawing"], ["Ada", "Brooks", 2018, "video games"]], es: [["Lena", "Núñez Ibarra", 2020, "abejas"], ["Javier", "Reyes Campos", 2012, "dibujo"], ["Adela", "Benítez Rosas", 2018, "videojuegos"]] },
  { en: [["Fatima", "Ali", 2023, "poetry"], ["Carlos", "Mendez", 2017, "rain forests"], ["Tom", "Kowalski", 2011, "skateboarding"]], es: [["Carlos", "Medina Ruiz", 2011, "selvas"], ["Fátima", "Aguilar Toro", 2017, "poesía"], ["Tomás", "Cordero Pinto", 2023, "patinetas"]] },
  { en: [["Yuki", "Tanaka", 2019, "origami"], ["Zack", "Adler", 2014, "sharks"], ["Sofia", "Russo", 2022, "baking"]], es: [["Inés", "Vargas León", 2019, "origami"], ["Bruno", "Acosta Neri", 2014, "tiburones"], ["Sofía", "Rivas Molina", 2022, "repostería"]] },
  { en: [["Nia", "Grant", 2021, "dance"], ["Leo", "Vargas", 2013, "comets"], ["Ingrid", "Larsen", 2016, "wolves"]], es: [["Nora", "Gil Prado", 2013, "danza"], ["León", "Valdés Ochoa", 2021, "cometas"], ["Irene", "Lozano Bravo", 2016, "lobos"]] },
  { en: [["Dev", "Shah", 2018, "soccer"], ["Olivia", "Hughes", 2010, "the ocean"], ["Marcus", "Cole", 2022, "guitars"]], es: [["Darío", "Soto Ugarte", 2018, "fútbol"], ["Olivia", "Ibáñez Cano", 2010, "el océano"], ["Marcos", "Cortés Leal", 2022, "guitarras"]] },
  { en: [["Rosa", "Flores", 2015, "insects"], ["Kai", "Miller", 2020, "cooking"], ["Hana", "Ito", 2012, "the moon"]], es: [["Rosa", "Flores Mejía", 2015, "insectos"], ["Kai", "Molina Arce", 2020, "cocina"], ["Hana", "Espinoza Real", 2012, "la Luna"]] },
  { en: [["Ethan", "Moore", 2017, "tennis"], ["Ali", "Hassan", 2023, "chess"], ["Clara", "Dubois", 2011, "painting"]], es: [["Alí", "Hernández Tapia", 2023, "ajedrez"], ["Clara", "Domínguez Sáenz", 2011, "pintura"], ["Ernesto", "Morales Uribe", 2017, "tenis"]] },
  { en: [["Isla", "Murray", 2020, "birds"], ["Tariq", "Bashir", 2014, "jazz"], ["June", "Park", 2018, "stars"]], es: [["Isabel", "Muñoz Beltrán", 2014, "aves"], ["Tariq", "Barrios Quintana", 2020, "jazz"], ["Julia", "Pacheco Rey", 2018, "estrellas"]] },
];

const alpha = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base" });

function worksCitedEntry(locale: Locale, set: Source[]): Entry {
  const order = (list: Source[]) => list.map(([, last]) => last).join(tr(locale, ", then ", ", luego "));
  const by = (cmp: (a: Source, b: Source) => number) => order([...set].sort(cmp));
  const right = by((a, b) => alpha(a[1], b[1]));
  const candidates: W[] = [
    [by((a, b) => alpha(a[0], b[0])), "ordered-by-first-name"],
    [by((a, b) => a[2] - b[2]), "ordered-by-year"],
    [order(set), "kept-original-order"],
  ];
  if (locale === "es") candidates.push([by((a, b) => alpha(a[1].split(" ").pop()!, b[1].split(" ").pop()!)), "ordered-by-second-surname"]);
  const wrong: W[] = [];
  for (const c of candidates) if (c[0] !== right && !wrong.some(([w]) => w === c[0])) wrong.push(c);
  const sources = set.map(([first, last, year, topic]) => tr(locale, `a ${year} book by ${first} ${last} about ${topic}`, `un libro de ${year} de ${first} ${last} sobre ${topic}`));
  const lasts = set.map(([, last]) => last).join(", ");
  return [
    tr(locale, `Sources: ${sources.join("; ")}.`, `Fuentes: ${sources.join("; ")}.`),
    right,
    wrong,
    tr(locale, `In the order listed, the authors' last names are ${lasts}.`, `En el orden de la lista, los apellidos de los autores son: ${lasts}.`),
    tr(locale, "Works Cited entries go in alphabetical order by the author's last name.", "Las obras citadas van en orden alfabético por el primer apellido del autor."),
  ];
}

const WORKS_CITED: Bi<Entry>[] = WORKS_CITED_SETS.map((s) => ({ en: worksCitedEntry("en", s.en), es: worksCitedEntry("es", s.es) }));

const MLA_CITATION = skill(
  { id: "e.mla.citation", grade: "9", title: { en: "MLA citations", es: "Citas en formato MLA" }, standard: "W.9-10.8", prereqs: ["e.evidence.quality"] },
  [
    {
      bank: IN_TEXT,
      ask: { en: "Which in-text citation is correct in MLA style?", es: "¿Qué cita entre paréntesis es correcta en formato MLA?" },
      hints: {
        en: ["What does MLA put inside the parentheses?", "MLA uses the author's last name and the page number, with no comma and no “p.” Two authors are joined with “and”; three or more use the first last name and “et al.” With no author, use the title in quotation marks. If the sentence already names the author, give only the page."],
        es: ["¿Qué pone MLA dentro del paréntesis?", "MLA usa el apellido del autor y el número de página, sin coma y sin “p.”. Con tres autores o más, el primer apellido y “et al.”. Sin autor, el título entre comillas. Si la oración ya nombra al autor, solo la página. Los apellidos compuestos van completos."],
      },
      seconds: 20,
    },
    {
      bank: WORKS_CITED,
      ask: { en: "In what order should these sources appear on the Works Cited page?", es: "¿En qué orden deben aparecer estas fuentes en la lista de obras citadas?" },
      hints: {
        en: ["Works Cited entries follow one kind of order. What is it based on?", "Alphabetize by the author's last name, not by first name, by year, or by the order you used the sources."],
        es: ["La lista de obras citadas sigue un orden alfabético. ¿Por qué parte del nombre?", "Ordena alfabéticamente por el apellido del autor; si tiene dos apellidos, por el primero. No ordenes por el nombre de pila, por el año ni por el orden en que usaste las fuentes."],
      },
      seconds: 30,
    },
  ],
);

// ===================================================================================================

export { WORKS_CITED_SETS };

/** Teaching order inside each grade; prerequisites always come earlier in the skill map. */
export const ENGLISH_GRAMMAR_6_9: Skill[] = [
  INTENSIVE_PRONOUNS,
  VAGUE_PRONOUNS,
  NONRESTRICTIVE,
  CONFUSED_WORDS,
  ROOTS,
  MULTIPLE_MEANINGS,
  CONNOTATION,
  PHRASES_CLAUSES,
  COMBINING,
  MODIFIERS,
  COORDINATE_ADJECTIVES,
  WORDINESS,
  ANALOGIES,
  FORMAL_STYLE,
  VERBALS,
  VERB_MOODS,
  ELLIPSIS_DASH,
  VERB_SHIFT,
  IRONY_PUNS,
  ALLUSION,
  PARALLEL,
  SEMICOLON_COLON,
  DEPENDENT_CLAUSES,
  TONE,
  AUDIENCE_PURPOSE,
  COUNTERCLAIMS,
  LOADED_LANGUAGE,
  EVIDENCE_QUALITY,
  MLA_CITATION,
];
