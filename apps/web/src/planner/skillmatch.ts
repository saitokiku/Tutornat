import type { Grade, Subject } from "@/lib/types";
import { gradeIndex, SKILLS } from "@/practice/skills";

// School words and learners' questions → skills on the map. A teacher writes "regrouping" or "long
// division", a learner asks "what is a logical fallacy?"; the map says "Subtract two-digit numbers" or
// "Spot the fallacy". This table bridges the two in English and Spanish. It only suggests: a grown-up
// confirms before anything is linked, and a learner chooses whether to start practice.

const WORDS: Record<string, string[]> = {
  "m.count.10": ["counting", "count", "count to 10", "contar", "contar hasta 10"],
  "m.count.20": ["count to 20", "teen numbers", "contar hasta 20"],
  "m.compare.10": ["more or less", "greater less", "which is more", "mayor menor", "cuál es más"],
  "m.next.number": ["number before", "number after", "comes next", "antes y después", "número que sigue"],
  "m.add.5": ["addition within 5", "sumas hasta 5"],
  "m.sub.5": ["take away", "quitar"],
  "m.add.10": ["addition facts", "addition", "adding", "plus", "sumas", "suma", "sumar"],
  "m.sub.10": ["subtraction facts", "subtraction", "subtracting", "minus", "restas", "resta", "restar"],
  "m.make.10": ["make ten", "make 10", "formar 10"],
  "m.add.20": ["addition within 20", "add within 20", "doubles"],
  "m.sub.20": ["subtraction within 20"],
  "m.missing.addend": ["missing number", "missing addend", "número que falta"],
  "m.place.tens": ["place value", "tens and ones", "valor posicional", "decenas", "decenas y unidades"],
  "m.compare.100": ["compare numbers", "greater than", "less than", "comparar números", "mayor que", "menor que"],
  "m.time.clock": ["telling time", "tell time", "tell the time", "o clock", "half past", "clock", "la hora", "reloj", "decir la hora"],
  "m.add.2digit": ["two-digit addition", "carrying", "regrouping addition", "llevar"],
  "m.sub.2digit": ["borrowing", "regrouping", "two-digit subtraction", "pedir prestado"],
  "m.skip.count": ["skip counting", "count by", "contar de 2 en 2"],
  "m.addsub.1000": ["three-digit", "within 1000", "hasta 1000"],
  "m.mult.groups": ["equal groups", "arrays", "multiplication meaning", "grupos iguales"],
  "m.mult.easy": ["times tables", "multiplication facts"],
  "m.mult.facts": ["times tables", "multiplication tables", "multiplication facts", "multiplication", "times table", "tablas de multiplicar", "multiplicación"],
  "m.div.facts": ["division facts", "dividing", "division", "divide", "división", "dividir"],
  "m.round": ["rounding", "round to", "round", "nearest ten", "redondear"],
  "m.frac.unit": ["fractions", "unit fractions", "what is a fraction", "fracciones", "fracción"],
  "m.frac.numberline": ["fractions on a number line", "fracciones en la recta numérica", "recta numérica"],
  "m.area.rect": ["area", "perimeter", "área", "perímetro"],
  "m.mult.multi": ["multi-digit multiplication", "multiplying big numbers", "long multiplication"],
  "m.div.long": ["long division", "remainders", "remainder", "división larga", "residuo"],
  "m.factors": ["factors", "multiples", "prime", "prime number", "composite", "factores", "múltiplos", "primos", "números primos"],
  "m.frac.equiv": ["equivalent fractions", "simplify fractions", "simplest form", "fracciones equivalentes", "simplificar"],
  "m.frac.compare": ["compare fractions", "comparing fractions", "which fraction is bigger", "comparar fracciones"],
  "m.frac.addlike": ["adding fractions", "add fractions", "subtracting fractions", "like denominators", "same denominator", "sumar fracciones", "mismo denominador"],
  "m.frac.mixed": ["mixed numbers", "improper fractions", "números mixtos", "fracciones impropias"],
  "m.dec.tenths": ["decimals", "tenths", "hundredths", "decimales", "décimos", "centésimos"],
  "m.frac.addunlike": ["unlike denominators", "different denominators", "fractions with different denominators", "common denominator", "denominador común", "distinto denominador", "denominadores diferentes"],
  "m.frac.mult": ["multiplying fractions", "multiply fractions", "multiplicar fracciones"],
  "m.frac.divunit": ["dividing unit fractions"],
  "m.dec.addsub": ["adding decimals", "subtracting decimals", "sumar decimales"],
  "m.dec.mult": ["multiplying decimals", "multiplicar decimales"],
  "m.order.ops": ["order of operations", "pemdas", "orden de las operaciones"],
  "m.pow10": ["powers of ten", "potencias de 10"],
  "m.volume": ["volume", "volumen"],
  "m.frac.div": ["dividing fractions", "divide fractions", "dividir fracciones", "reciprocal"],
  "m.gcf.lcm": ["gcf", "lcm", "greatest common factor", "least common multiple", "mcd", "mcm", "máximo común divisor", "mínimo común múltiplo"],
  "m.ratio.equiv": ["ratios", "ratio tables", "razones"],
  "m.ratio.unit": ["unit rate", "unit price", "tasa unitaria"],
  "m.percent": ["percent", "percentage", "porcentaje", "por ciento"],
  "m.int.numberline": ["negative numbers", "integers", "absolute value", "números negativos", "enteros", "valor absoluto"],
  "m.exp.whole": ["exponents", "powers", "squared", "exponentes", "potencias"],
  "m.expr.eval": ["evaluate expressions", "expressions", "expresiones"],
  "m.eq.onestep": ["one-step equations", "equations", "solve for x", "ecuaciones de un paso", "ecuaciones"],
  "m.area.poly": ["area of triangles", "parallelograms", "trapezoid", "área de triángulos"],
  "m.int.addsub": ["adding integers", "subtracting integers", "sumar enteros"],
  "m.int.multdiv": ["multiplying integers", "dividing integers"],
  "m.expr.simplify": ["like terms", "distributive property", "simplify expressions", "términos semejantes", "propiedad distributiva"],
  "m.eq.twostep": ["two-step equations", "ecuaciones de dos pasos"],
  "m.proportion": ["proportions", "proporciones", "scale drawings"],
  "m.percent.change": ["percent change", "sales tax", "tax and tip", "discount", "markup", "descuento", "impuesto"],
  "m.ineq.onestep": ["inequalities", "desigualdades"],
  "m.circle": ["circumference", "circles", "diameter", "radius", "circunferencia", "círculos", "diámetro"],
  "m.exp.rules": ["exponent rules", "laws of exponents", "leyes de los exponentes"],
  "m.sqrt": ["square roots", "cube roots", "raíz cuadrada", "raíces cuadradas"],
  "m.sci.notation": ["scientific notation", "notación científica"],
  "m.eq.multistep": ["multi-step equations", "variables on both sides"],
  "m.slope": ["slope", "rate of change", "rise over run", "pendiente"],
  "m.linear.table": ["linear functions", "function tables", "funciones lineales"],
  "m.pythag": ["pythagorean theorem", "pythagoras", "hypotenuse", "teorema de pitágoras", "hipotenusa"],
  "m.systems": ["systems of equations", "sistemas de ecuaciones"],
  "m.ineq.multistep": ["multi-step inequalities"],
  "m.poly.addsub": ["polynomials", "polinomios"],
  "m.poly.mult": ["multiplying binomials", "foil", "binomios"],
  "m.factor.tri": ["factoring", "factor trinomials", "factorizar"],
  "m.quad.solve": ["quadratic equations", "quadratics", "ecuaciones cuadráticas"],
  "m.func.eval": ["function notation", "f(x)", "evaluating functions"],
  "m.line.equation": ["slope-intercept", "equation of a line", "y = mx + b", "ecuación de la recta"],
  "e.letter.sounds": ["letter sounds", "phonics", "alphabet", "abc", "sonidos de las letras", "fonética", "abecedario", "alfabeto"],
  "e.rhyme": ["rhyming", "rhymes", "rhyming words", "rimas", "palabras que riman"],
  "e.syllables": ["syllables", "sílabas"],
  "e.sight.words": ["sight words", "high-frequency words", "palabras de uso frecuente", "palabras frecuentes"],
  "e.cvc.words": ["cvc words", "short vowels", "decoding", "short words"],
  "e.capitals": ["capital letters", "punctuation", "capitalization", "end marks", "question mark", "mayúsculas", "puntuación"],
  "e.plurals": ["plurals", "plurales"],
  "e.nouns.verbs": ["nouns", "verbs", "parts of speech", "sustantivos", "verbos"],
  "e.past.tense": ["past tense", "irregular verbs", "pretérito", "tiempo pasado"],
  "e.contractions": ["contractions", "contracciones"],
  "e.adjectives": ["adjectives", "describing words", "adjetivos"],
  "e.homophones": ["homophones", "their there they're", "homófonos"],
  "e.prefixes": ["prefixes", "suffixes", "prefijos", "sufijos"],
  "e.synonyms": ["synonyms", "antonyms", "sinónimos", "antónimos"],
  "e.subject.verb": ["subject-verb agreement", "concordancia"],
  "e.commas": ["commas", "comas"],
  "e.figurative": ["figurative language", "similes", "metaphors", "idioms", "personification", "hyperbole", "lenguaje figurado", "símil", "metáfora", "personificación", "hipérbole"],
  "e.context.clues": ["context clues", "vocabulary", "vocabulario", "pistas de contexto"],
  "e.fact.opinion": ["fact and opinion", "fact or opinion", "hecho y opinión", "hecho u opinión"],
  "e.main.idea": ["main idea", "central idea", "summarizing", "idea principal", "idea central", "resumen"],
  "e.claim.evidence": ["claim evidence reasoning", "argument writing", "cer", "argumentative", "argumento", "afirmación evidencia"],
  "e.pronouns": ["pronouns", "pronombres"],
  "e.sentence.types": ["compound sentences", "complex sentences", "sentence structure", "oraciones compuestas"],
  "e.transitions": ["transitions", "transition words", "conectores"],
  "e.appeals": ["ethos", "pathos", "logos", "rhetorical appeals", "persuasion", "persuasive", "persuasive techniques"],
  "e.active.passive": ["active voice", "passive voice", "voz pasiva", "voz activa"],
  "e.fallacies": [
    "fallacies",
    "logical fallacies",
    "ad hominem",
    "straw man",
    "strawman",
    "bandwagon",
    "slippery slope",
    "red herring",
    "false dilemma",
    "hasty generalization",
    "falacias",
    "falacia lógica",
    "hombre de paja",
    "pendiente resbaladiza",
    "falso dilema",
    "ataque personal",
  ],
  "e.rhetorical.devices": ["rhetorical devices", "rhetoric", "alliteration", "anaphora", "rhetorical question", "figuras retóricas", "retórica", "aliteración", "anáfora", "pregunta retórica"],
  "e.thesis": ["thesis statement", "thesis", "tesis"],
  "e.concision": ["wordiness", "concise writing", "revision", "revising"],
  "s.living": ["living things", "living or nonliving", "alive", "seres vivos", "ser vivo"],
  "s.needs": ["needs of plants", "what animals need", "what plants need"],
  "s.weather": ["weather", "el tiempo", "clima"],
  "s.push.pull": ["pushes and pulls", "push", "pull", "empujar y jalar"],
  "s.materials": ["properties of materials", "materiales"],
  "s.states.matter": ["states of matter", "solids liquids gases", "solid liquid gas", "estados de la materia", "sólidos líquidos y gases"],
  "s.habitats": ["habitats", "hábitats"],
  "s.life.cycles": ["life cycles", "metamorphosis", "ciclo de vida", "metamorfosis"],
  "s.forces": ["forces", "magnets", "friction", "gravity", "fuerzas", "imanes", "fricción", "gravedad"],
  "s.energy.forms": ["forms of energy", "energy", "energía"],
  "s.rocks": ["rocks", "rock cycle", "fossils", "minerals", "rocas", "fósiles", "weathering", "erosion", "erosión"],
  "s.units": ["metric units", "measurement", "conversions", "unidades", "medición"],
  "s.food.chains": ["food chains", "food webs", "producers consumers", "predators and prey", "cadenas alimenticias", "cadenas alimentarias"],
  "s.water.cycle": ["water cycle", "ciclo del agua", "evaporation", "condensation", "precipitation", "evaporación", "condensación", "precipitación"],
  "s.earth.sun.moon": ["moon phases", "phases of the moon", "moon", "eclipse", "seasons", "day and night", "fases de la luna", "luna", "eclipses", "estaciones"],
  "s.cells": ["cells", "organelles", "nucleus", "mitochondria", "células", "núcleo", "mitocondria"],
  "s.variables": ["scientific method", "variables", "experiment", "fair test", "hypothesis", "método científico", "hipótesis"],
  "s.speed": ["speed", "distance time", "rapidez", "velocidad"],
  "s.density": ["density", "densidad", "float or sink"],
  "s.ecosystems": ["ecosystems", "symbiosis", "ecosistemas", "simbiosis"],
  "s.plate.tectonics": ["plate tectonics", "tectonic plates", "earthquakes", "volcanoes", "placas tectónicas", "terremotos", "volcanes"],
  "s.atoms": ["atoms", "protons", "neutrons", "electrons", "periodic table", "átomos", "protones", "electrones", "tabla periódica"],
  "s.chem.phys": ["chemical change", "physical change", "cambio químico", "cambio físico"],
  "s.genetics": ["genetics", "punnett squares", "heredity", "dna", "genes", "genética", "herencia", "adn"],
  "s.newton": ["newton's laws", "force and acceleration", "mass times acceleration", "f = ma", "leyes de newton"],
  "s.newton.laws": ["newton's laws", "inertia", "inercia"],
  "s.ph": ["acids and bases", "ph", "ácidos y bases"],
  "s.formula.atoms": ["chemical formulas", "fórmulas químicas", "balancing equations"],
};

// Words that carry no topic: question frames and articles in both languages.
const STOP = new Set(
  (
    "a an the of to in on at and or for with by from is are was be what whats how do does did i me my you your it its this that these those about " +
    "mean means meaning why who when where can could would please help explain show give find need want some any s " +
    "de del la el los las lo un una unos unas y o u en con por para que es son era como me mi mis se al le les su sus esto esta este eso"
  ).split(" "),
);

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9()=+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * A light stem so singular and plural meet ("fallacy"/"fallacies", "fracción"/"fracciones",
 * "phase"/"phases", "raíz"/"raíces"). Applied to both sides, so over-stemming only has to be consistent.
 */
export function stem(w: string): string {
  if (w.length <= 3) return w;
  let s = w;
  if (s.endsWith("ies") && s.length > 4) s = `${s.slice(0, -3)}y`;
  else if (s.endsWith("es") && s.length > 4) s = s.slice(0, -2);
  else if (s.endsWith("s") && !/(ss|us|is)$/.test(s)) s = s.slice(0, -1);
  if (s.endsWith("e") && s.length > 3) s = s.slice(0, -1);
  if (s.endsWith("z")) s = `${s.slice(0, -1)}c`;
  return s;
}

/** The topic words of a text: normalized, without question frames or articles, stemmed. */
export function tokens(text: string): string[] {
  return norm(text)
    .split(" ")
    .filter((w) => w && !STOP.has(w))
    .map(stem);
}

/**
 * True when two words or short phrases are the same once case, accents and plurals are set aside:
 * "Fallacies" and "fallacy", "logical fallacy" and "Logical fallacies". A dictionary that answers with a
 * different word than the one asked about ("spelled like") is not an answer.
 */
export function sameWord(a: string, b: string): boolean {
  const words = (s: string) => norm(s).split(" ").filter(Boolean).map(stem).join(" ");
  return !!words(a) && words(a) === words(b);
}

/**
 * Everyday compounds whose words are also school words: "power plant" is not about plants or powers,
 * "prime minister" not about primes. They are taken out of a question before it is matched.
 */
const COMPOUNDS = [
  "power plant",
  "power station",
  "power ranger",
  "prime minister",
  "prime time",
  "cell phone",
  "cell tower",
  "rock band",
  "rock music",
  "rock and roll",
  "rock star",
  "volume knob",
  "volume button",
  "space station",
  "planta de energia",
  "planta electrica",
  "primer ministro",
  "telefono celular",
  "musica rock",
  "banda de rock",
].map(tokens);

/** True when `part` appears in `whole` as consecutive words. */
function contains(whole: string[], part: string[]): boolean {
  if (!part.length || part.length > whole.length) return false;
  for (let i = 0; i + part.length <= whole.length; i++) if (part.every((w, j) => whole[i + j] === w)) return true;
  return false;
}

/** The words with every everyday compound taken out ("what is a power plant" → nothing to match). */
function withoutCompounds(words: string[]): string[] {
  const out = [...words];
  for (const c of COMPOUNDS)
    for (let i = 0; i + c.length <= out.length; i++) if (c.every((w, j) => out[i + j] === w)) out.splice(i, c.length, "");
  return out.filter(Boolean);
}

type Entry = { id: string; subject: Subject; grade: Grade; phrases: string[][]; title: string[][]; titleWords: Set<string> };

// Built once: the table and the skill titles, already tokenized.
let index: Entry[] | null = null;
function entries(): Entry[] {
  index ??= SKILLS.map((skill) => {
    const title = [tokens(skill.title.en), tokens(skill.title.es)];
    // "fracciones" and "fracción" are one phrase once stemmed: count it once.
    const phrases = [...new Map((WORDS[skill.id] ?? []).map(tokens).filter((p) => p.length).map((p) => [p.join(" "), p])).values()];
    return {
      id: skill.id,
      subject: skill.subject,
      grade: skill.grade,
      phrases,
      title,
      titleWords: new Set(title.flat().filter((w) => w.length > 4)),
    };
  });
  return index;
}

/**
 * Best matching skills for a piece of school text or a learner's question, most likely first.
 * With `grade`, ties go to the skill closest to the learner's grade.
 */
export function matchSkills(text: string, subject?: Subject, limit = 3, grade?: Grade): string[] {
  const words = withoutCompounds(tokens(text));
  if (!words.length || norm(text).length < 3) return [];
  const scored: [Entry, number][] = [];
  for (const e of entries()) {
    if (subject && subject !== "other" && e.subject !== subject) continue;
    let score = 0;
    for (const p of e.phrases) if (contains(words, p)) score += 3 + p.length;
    for (const w of e.titleWords) if (words.includes(w)) score += 1;
    // A short question that is most of a skill's name ("fallacy", "slope", "tell time"), not one
    // word of a long one ("tip" in "Percent change, tax, tip and discount").
    if (e.title.some((t) => words.length * 2 >= t.length && contains(t, words))) score += 2 + words.length;
    if (score >= 3) scored.push([e, score]);
  }
  const near = (e: Entry) => (grade ? Math.abs(gradeIndex(e.grade) - gradeIndex(grade)) : 0);
  return scored
    .sort((a, b) => b[1] - a[1] || near(a[0]) - near(b[0]))
    .slice(0, limit)
    .map(([e]) => e.id);
}
