import type { Subject } from "@/lib/types";

// Things children ask about, bridged by people to the skill map and to the ready-made lessons that
// teach the idea underneath ("lava is melted rock" → melting and freezing). Like the school-word table
// in planner/skillmatch it only suggests: whoever uses it decides whether a skill or lesson fits the
// learner's grade. Words are English and Spanish, written without accents, matched as whole words
// (a plural -s or -es counts).

export type Topic = {
  id: string;
  subject: Subject;
  words: string[];
  /** Skill ids, the best fit first. */
  skills: string[];
  /** Ready-made lessons as "catalogueId/lessonId", the best fit first. Each topic with lessons has a `crs.why.<id>` line. */
  lessons?: string[];
};

export const TOPICS: Topic[] = [
  {
    id: "volcano",
    subject: "science",
    words: ["volcano", "volcanic", "lava", "magma", "eruption", "volcan", "erupcion"],
    skills: ["s.rocks", "s.plate.tectonics"],
    lessons: ["science-matter/melt-freeze"],
  },
  { id: "earthquake", subject: "science", words: ["earthquake", "tectonic plate", "plate tectonics", "tsunami", "terremoto", "sismo", "placas tectonicas"], skills: ["s.plate.tectonics", "s.rocks"] },
  {
    id: "rocks",
    subject: "science",
    words: ["rock", "mountain", "cave", "crystal", "mineral", "erosion", "fossil", "dinosaur", "roca", "montana", "cueva", "cristal", "fosil", "dinosaurio"],
    skills: ["s.rocks"],
  },
  {
    id: "water",
    subject: "science",
    words: ["water cycle", "rain", "cloud", "snow", "evaporation", "condensation", "precipitation", "ciclo del agua", "lluvia", "nube", "nieve", "evaporacion", "condensacion"],
    skills: ["s.water.cycle", "s.states.matter", "s.weather"],
    lessons: ["science-matter/three-states"],
  },
  {
    id: "ice",
    subject: "science",
    words: ["ice", "melting", "freezing", "boiling", "steam", "hielo", "derretir", "congelar", "hervir", "vapor de agua"],
    skills: ["s.states.matter", "s.chem.phys"],
    lessons: ["science-matter/melt-freeze", "science-matter/three-states"],
  },
  {
    id: "weather",
    subject: "science",
    words: ["weather", "storm", "tornado", "hurricane", "thunder", "lightning", "tormenta", "huracan", "trueno", "relampago"],
    skills: ["s.weather", "s.water.cycle"],
  },
  { id: "moon", subject: "science", words: ["moon", "lunar", "eclipse", "luna"], skills: ["s.earth.sun.moon"], lessons: ["science-moon/half-lit", "science-moon/eclipses"] },
  {
    id: "space",
    subject: "science",
    words: ["outer space", "planet", "solar system", "sun", "star", "galaxy", "astronaut", "orbit", "espacio exterior", "planeta", "sistema solar", "sol", "estrella", "galaxia", "astronauta", "orbita"],
    skills: ["s.earth.sun.moon"],
  },
  {
    id: "animals",
    subject: "science",
    words: [
      "animal", "shark", "whale", "dolphin", "octopus", "fish", "frog", "snake", "lizard", "turtle", "crocodile", "alligator", "bird", "owl", "eagle", "penguin",
      "bat", "bear", "wolf", "fox", "lion", "tiger", "elephant", "giraffe", "zebra", "monkey", "gorilla", "horse", "donkey", "cow", "pig", "sheep", "goat",
      "chicken", "dog", "cat", "rabbit", "deer", "camel", "kangaroo", "panda", "koala", "spider", "bee", "ant", "insect", "bug", "worm",
      "tiburon", "ballena", "delfin", "pulpo", "pez", "peces", "rana", "serpiente", "lagarto", "tortuga", "cocodrilo", "pajaro", "buho", "aguila", "pinguino",
      "murcielago", "oso", "lobo", "zorro", "tigre", "elefante", "jirafa", "cebra", "gorila", "caballo", "burro", "vaca", "cerdo", "oveja", "cabra", "gallina",
      "perro", "gato", "conejo", "venado", "camello", "canguro", "arana", "abeja", "hormiga", "insecto", "gusano",
    ],
    skills: ["s.needs", "s.habitats", "s.life.cycles", "s.food.chains", "s.ecosystems", "s.living"],
  },
  {
    id: "plants",
    subject: "science",
    words: ["plant", "seed", "flower", "tree", "leaf", "leaves", "photosynthesis", "garden", "planta", "semilla", "flor", "arbol", "hoja", "fotosintesis", "jardin"],
    skills: ["s.needs", "s.life.cycles", "s.living", "s.food.chains"],
  },
  {
    id: "lifecycle",
    subject: "science",
    words: ["butterfly", "butterflies", "caterpillar", "tadpole", "metamorphosis", "life cycle", "mariposa", "oruga", "renacuajo", "metamorfosis", "ciclo de vida"],
    skills: ["s.life.cycles", "s.needs"],
  },
  {
    id: "body",
    subject: "science",
    words: ["cell", "human body", "bone", "skeleton", "heart", "blood", "brain", "muscle", "celula", "cuerpo humano", "hueso", "esqueleto", "corazon", "sangre", "cerebro", "musculo"],
    skills: ["s.cells"],
  },
  {
    id: "forces",
    subject: "science",
    words: ["magnet", "magnetism", "friction", "gravity", "force", "iman", "imanes", "magnetismo", "friccion", "gravedad", "fuerza"],
    skills: ["s.push.pull", "s.forces", "s.newton.laws"],
  },
  {
    id: "energy",
    subject: "science",
    words: ["electricity", "energy", "light", "sound", "heat", "battery", "batteries", "circuit", "electricidad", "energia", "luz", "luces", "sonido", "calor", "bateria", "circuito"],
    skills: ["s.energy.forms"],
  },
  {
    id: "cooking",
    subject: "science",
    words: ["cooking", "baking", "rust", "burning", "chemical reaction", "cocinar", "hornear", "oxido", "reaccion quimica"],
    skills: ["s.chem.phys"],
    lessons: ["science-changes/everyday-reactions", "science-changes/same-or-new"],
  },
  {
    id: "speed",
    subject: "science",
    words: ["speed", "velocity", "racing", "race car", "rocket", "velocidad", "rapidez", "cohete"],
    skills: ["s.speed", "s.newton"],
    lessons: ["science-motion/what-is-speed"],
  },
  { id: "ocean", subject: "science", words: ["ocean", "sea", "coral reef", "tide", "oceano", "arrecife", "marea"], skills: ["s.habitats", "s.food.chains", "s.water.cycle"] },
  { id: "atoms", subject: "science", words: ["atom", "molecule", "periodic table", "atomo", "molecula", "tabla periodica"], skills: ["s.atoms", "s.formula.atoms"] },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PATTERNS = TOPICS.map((topic) => ({ topic, re: new RegExp(`(^|[^a-z])(${topic.words.map(escape).join("|")})(s|es)?(?=$|[^a-z])`) }));

/** The topics a request names, in table order. */
export function topicsIn(text: string): Topic[] {
  const t = norm(text);
  return PATTERNS.filter((p) => p.re.test(t)).map((p) => p.topic);
}
