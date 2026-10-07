import type { Subject } from "@/lib/types";
import { SKILLS } from "@/practice/skills";

// School words → skills on the map. A teacher writes "regrouping" or "long division"; the map says
// "Subtract two-digit numbers". This table bridges the two in English and Spanish. It only suggests:
// a grown-up confirms before anything is linked.

const WORDS: Record<string, string[]> = {
  "m.count.10": ["counting", "count to 10", "contar"],
  "m.count.20": ["count to 20", "teen numbers", "contar hasta 20"],
  "m.compare.10": ["more or less", "greater less", "mayor menor"],
  "m.add.5": ["addition within 5", "sumas hasta 5"],
  "m.add.10": ["addition facts", "adding", "sumas", "suma"],
  "m.sub.10": ["subtraction facts", "subtracting", "restas", "resta"],
  "m.make.10": ["make ten", "make 10", "formar 10"],
  "m.add.20": ["addition within 20", "add within 20", "doubles"],
  "m.sub.20": ["subtraction within 20"],
  "m.missing.addend": ["missing number", "missing addend", "número que falta"],
  "m.place.tens": ["place value", "tens and ones", "valor posicional", "decenas"],
  "m.compare.100": ["compare numbers", "greater than", "less than", "comparar números"],
  "m.time.clock": ["telling time", "clock", "la hora", "reloj"],
  "m.add.2digit": ["two-digit addition", "carrying", "regrouping addition", "llevar"],
  "m.sub.2digit": ["borrowing", "regrouping", "two-digit subtraction", "pedir prestado"],
  "m.skip.count": ["skip counting", "count by"],
  "m.addsub.1000": ["three-digit", "within 1000", "hasta 1000"],
  "m.mult.groups": ["equal groups", "arrays", "multiplication meaning", "grupos iguales"],
  "m.mult.easy": ["times tables", "multiplication facts"],
  "m.mult.facts": ["times tables", "multiplication facts", "multiplication", "tablas de multiplicar", "multiplicación"],
  "m.div.facts": ["division facts", "dividing", "division", "división"],
  "m.round": ["rounding", "round to", "redondear"],
  "m.frac.unit": ["fractions", "unit fractions", "fracciones"],
  "m.frac.numberline": ["fractions on a number line", "recta numérica"],
  "m.area.rect": ["area", "perimeter", "área", "perímetro"],
  "m.mult.multi": ["multi-digit multiplication", "multiplying big numbers"],
  "m.div.long": ["long division", "remainders", "división larga", "residuo"],
  "m.factors": ["factors", "multiples", "prime", "factores", "múltiplos", "primos"],
  "m.frac.equiv": ["equivalent fractions", "simplify fractions", "simplest form", "fracciones equivalentes", "simplificar"],
  "m.frac.compare": ["compare fractions", "comparing fractions", "comparar fracciones"],
  "m.frac.addlike": ["adding fractions", "subtracting fractions", "like denominators", "sumar fracciones"],
  "m.frac.mixed": ["mixed numbers", "improper fractions", "números mixtos"],
  "m.dec.tenths": ["decimals", "tenths", "hundredths", "decimales"],
  "m.frac.addunlike": ["unlike denominators", "common denominator", "denominador común"],
  "m.frac.mult": ["multiplying fractions", "multiplicar fracciones"],
  "m.frac.divunit": ["dividing unit fractions"],
  "m.dec.addsub": ["adding decimals", "subtracting decimals"],
  "m.dec.mult": ["multiplying decimals"],
  "m.order.ops": ["order of operations", "pemdas", "orden de las operaciones"],
  "m.pow10": ["powers of ten", "potencias de 10"],
  "m.volume": ["volume", "volumen"],
  "m.frac.div": ["dividing fractions", "dividir fracciones", "reciprocal"],
  "m.gcf.lcm": ["gcf", "lcm", "greatest common factor", "least common multiple", "mcd", "mcm"],
  "m.ratio.equiv": ["ratios", "ratio tables", "razones"],
  "m.ratio.unit": ["unit rate", "unit price", "tasa unitaria"],
  "m.percent": ["percent", "percentage", "porcentaje"],
  "m.int.numberline": ["negative numbers", "integers", "absolute value", "números negativos", "enteros", "valor absoluto"],
  "m.exp.whole": ["exponents", "powers", "exponentes"],
  "m.expr.eval": ["evaluate expressions", "expressions", "expresiones"],
  "m.eq.onestep": ["one-step equations", "ecuaciones de un paso"],
  "m.area.poly": ["area of triangles", "parallelograms", "trapezoid", "área de triángulos"],
  "m.int.addsub": ["adding integers", "subtracting integers", "sumar enteros"],
  "m.int.multdiv": ["multiplying integers", "dividing integers"],
  "m.expr.simplify": ["like terms", "distributive property", "simplify expressions", "términos semejantes", "propiedad distributiva"],
  "m.eq.twostep": ["two-step equations", "ecuaciones de dos pasos"],
  "m.proportion": ["proportions", "proporciones", "scale drawings"],
  "m.percent.change": ["percent change", "tax", "tip", "discount", "markup", "descuento", "impuesto"],
  "m.ineq.onestep": ["inequalities", "desigualdades"],
  "m.circle": ["circumference", "circles", "circunferencia", "círculos"],
  "m.exp.rules": ["exponent rules", "laws of exponents", "leyes de los exponentes"],
  "m.sqrt": ["square roots", "cube roots", "raíz cuadrada"],
  "m.sci.notation": ["scientific notation", "notación científica"],
  "m.eq.multistep": ["multi-step equations", "variables on both sides"],
  "m.slope": ["slope", "rate of change", "pendiente"],
  "m.linear.table": ["linear functions", "function tables", "funciones lineales"],
  "m.pythag": ["pythagorean theorem", "pythagoras", "teorema de pitágoras"],
  "m.systems": ["systems of equations", "sistemas de ecuaciones"],
  "m.ineq.multistep": ["multi-step inequalities"],
  "m.poly.addsub": ["polynomials", "polinomios"],
  "m.poly.mult": ["multiplying binomials", "foil", "binomios"],
  "m.factor.tri": ["factoring", "factor trinomials", "factorizar"],
  "m.quad.solve": ["quadratic equations", "quadratics", "ecuaciones cuadráticas"],
  "m.func.eval": ["function notation", "f(x)", "evaluating functions"],
  "m.line.equation": ["slope-intercept", "equation of a line", "y = mx + b", "ecuación de la recta"],
  "e.letter.sounds": ["letter sounds", "phonics", "sonidos de las letras", "fonética"],
  "e.rhyme": ["rhyming", "rhymes", "rimas"],
  "e.syllables": ["syllables", "sílabas"],
  "e.sight.words": ["sight words", "high-frequency words", "palabras de uso frecuente"],
  "e.cvc.words": ["cvc words", "short vowels", "decoding"],
  "e.capitals": ["capital letters", "punctuation", "mayúsculas", "puntuación"],
  "e.plurals": ["plurals", "plurales"],
  "e.nouns.verbs": ["nouns", "verbs", "parts of speech", "sustantivos", "verbos"],
  "e.past.tense": ["past tense", "irregular verbs", "pretérito", "tiempo pasado"],
  "e.contractions": ["contractions", "contracciones"],
  "e.adjectives": ["adjectives", "adjetivos"],
  "e.homophones": ["homophones", "their there they're", "homófonos"],
  "e.prefixes": ["prefixes", "suffixes", "prefijos", "sufijos"],
  "e.synonyms": ["synonyms", "antonyms", "sinónimos", "antónimos"],
  "e.subject.verb": ["subject-verb agreement", "concordancia"],
  "e.commas": ["commas", "comas"],
  "e.figurative": ["figurative language", "similes", "metaphors", "idioms", "lenguaje figurado", "símil", "metáfora"],
  "e.context.clues": ["context clues", "vocabulary", "vocabulario", "pistas de contexto"],
  "e.fact.opinion": ["fact and opinion", "hecho y opinión"],
  "e.main.idea": ["main idea", "summarizing", "idea principal", "resumen"],
  "e.claim.evidence": ["claim evidence reasoning", "argument writing", "cer", "argumentative", "argumento"],
  "e.pronouns": ["pronouns", "pronombres"],
  "e.sentence.types": ["compound sentences", "complex sentences", "sentence structure", "oraciones compuestas"],
  "e.transitions": ["transitions", "transition words", "conectores"],
  "e.appeals": ["ethos", "pathos", "logos", "rhetorical appeals", "persuasion", "persuasive"],
  "e.active.passive": ["active voice", "passive voice", "voz pasiva", "voz activa"],
  "e.fallacies": ["fallacies", "logical fallacies", "falacias"],
  "e.rhetorical.devices": ["rhetorical devices", "rhetoric", "figuras retóricas", "retórica"],
  "e.thesis": ["thesis statement", "thesis", "tesis"],
  "e.concision": ["wordiness", "concise writing", "revision", "revising"],
  "s.living": ["living things", "seres vivos"],
  "s.needs": ["needs of plants", "what animals need"],
  "s.weather": ["weather", "el tiempo", "clima"],
  "s.push.pull": ["pushes and pulls", "empujar y jalar"],
  "s.materials": ["properties of materials", "materiales"],
  "s.states.matter": ["states of matter", "solids liquids gases", "estados de la materia"],
  "s.habitats": ["habitats", "hábitats"],
  "s.life.cycles": ["life cycles", "ciclo de vida"],
  "s.forces": ["forces", "magnets", "friction", "fuerzas", "imanes", "fricción"],
  "s.energy.forms": ["forms of energy", "energy", "energía"],
  "s.rocks": ["rocks", "rock cycle", "fossils", "rocas", "fósiles", "weathering", "erosion"],
  "s.units": ["metric units", "measurement", "conversions", "unidades", "medición"],
  "s.food.chains": ["food chains", "food webs", "producers consumers", "cadenas alimenticias"],
  "s.water.cycle": ["water cycle", "ciclo del agua", "evaporation", "condensation"],
  "s.earth.sun.moon": ["moon phases", "seasons", "day and night", "fases de la luna", "estaciones"],
  "s.cells": ["cells", "organelles", "células"],
  "s.variables": ["scientific method", "variables", "experiment", "método científico"],
  "s.speed": ["speed", "distance time", "rapidez", "velocidad"],
  "s.density": ["density", "densidad", "float or sink"],
  "s.ecosystems": ["ecosystems", "symbiosis", "ecosistemas"],
  "s.plate.tectonics": ["plate tectonics", "earthquakes", "volcanoes", "placas tectónicas"],
  "s.atoms": ["atoms", "protons", "electrons", "periodic table", "átomos", "tabla periódica"],
  "s.chem.phys": ["chemical change", "physical change", "cambio químico"],
  "s.genetics": ["genetics", "punnett squares", "heredity", "genética", "herencia"],
  "s.newton": ["newton's laws", "force and acceleration", "f = ma", "leyes de newton"],
  "s.newton.laws": ["newton's laws", "inertia", "inercia"],
  "s.ph": ["acids and bases", "ph", "ácidos y bases"],
  "s.formula.atoms": ["chemical formulas", "fórmulas químicas", "balancing equations"],
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9()=+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Best matching skills for a piece of school text, most likely first. */
export function matchSkills(text: string, subject?: Subject, limit = 3): string[] {
  const t = ` ${norm(text)} `;
  if (t.trim().length < 3) return [];
  const scored: [string, number][] = [];
  for (const skill of SKILLS) {
    if (subject && subject !== "other" && skill.subject !== subject) continue;
    let score = 0;
    for (const w of WORDS[skill.id] ?? []) if (t.includes(` ${norm(w)} `) || t.includes(` ${norm(w)}`)) score += 3 + norm(w).split(" ").length;
    const title = norm(skill.title.en).split(" ").concat(norm(skill.title.es).split(" ")).filter((w) => w.length > 4);
    for (const w of title) if (t.includes(` ${w}`)) score += 1;
    if (score >= 3) scored.push([skill.id, score]);
  }
  return scored.sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
}
