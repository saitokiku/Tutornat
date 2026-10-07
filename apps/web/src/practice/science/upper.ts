import type { Locale } from "@/lib/types";
import type { Rng } from "../rng";
import { tr } from "../text";
import type { Choice, ItemBody, Skill } from "../types";

// Grades 6–9 science. Two kinds of skill live here:
// - computed: the answer is calculated (speed, density, atoms, Punnett squares, F = m × a, pH, formulas).
//   Decimals are built backward from whole numbers of tenths, so a key is never a floating-point accident.
// - draft: hand-written question banks, not yet teacher-reviewed. Each entry keeps English and Spanish
//   side by side, so one seed picks the same question in both languages.

type Bi = { en: string; es: string };
const bi = (en: string, es: string): Bi => ({ en, es });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One hand-written question: `a` is the right answer, `wrong` the distractors (each a common mistake). */
export type BankEntry = { q: Bi; a: Bi; wrong: Bi[]; clue: Bi; why: Bi };
/** A level's questions. `nudge` and `strategy` are hints 1 and 2 for every entry; the entry's `clue` is hint 3. */
export type Bank = { nudge: Bi; strategy: Bi; seconds: number; items: BankEntry[] };

const e = (q: Bi, a: Bi, wrong: Bi[], clue: Bi, why: Bi): BankEntry => ({ q, a, wrong, clue, why });

function bankItem(r: Rng, bank: Bank, locale: Locale): ItemBody {
  const entry = r.pick(bank.items);
  const order = r.shuffle([entry.a, ...entry.wrong]);
  const answer = entry.a[locale];
  return {
    prompt: [entry.q[locale]],
    say: entry.q[locale],
    choices: order.map((c) => ({ label: c[locale] })),
    input: "choices",
    answer: { kind: "choice", index: order.indexOf(entry.a) },
    hints: [bank.nudge[locale], bank.strategy[locale], entry.clue[locale]],
    steps: [entry.why[locale], tr(locale, `Answer: ${answer}`, `Respuesta: ${answer}`)],
    seconds: bank.seconds,
  };
}

// ── s.cells ─────────────────────────────────────────────────────────────────────────────────────

const NUCLEUS = bi("Nucleus", "Núcleo");
const MEMBRANE = bi("Cell membrane", "Membrana celular");
const MITO = bi("Mitochondria", "Mitocondria");
const CHLORO = bi("Chloroplast", "Cloroplasto");
const WALL = bi("Cell wall", "Pared celular");
const VACUOLE = bi("Vacuole", "Vacuola");
const CELL = bi("Cell", "Célula");
const TISSUE = bi("Tissue", "Tejido");
const ORGAN = bi("Organ", "Órgano");
const SYSTEM = bi("Organ system", "Sistema de órganos");
const ORGANISM = bi("Organism", "Organismo");

const CELLS_PARTS: Bank = {
  nudge: bi("Think about what each part is built to do.", "Piensa en para qué sirve cada parte."),
  strategy: bi(
    "Picture the cell as a factory: a control office, power plants, solar panels, a gate, an outer wall, and storage tanks. Match the job to the part.",
    "Imagina la célula como una fábrica: una oficina de control, plantas de energía, paneles solares, una puerta, un muro exterior y tanques de almacenamiento. Relaciona la función con la parte.",
  ),
  seconds: 20,
  items: [
    e(
      bi("Which part holds the cell's DNA and directs its activities?", "¿Qué parte guarda el ADN de la célula y dirige sus actividades?"),
      NUCLEUS,
      [MEMBRANE, MITO, VACUOLE],
      bi("It is often called the control center of the cell.", "A menudo se le llama el centro de control de la célula."),
      bi("The nucleus holds the DNA, the instructions for everything the cell does.", "El núcleo guarda el ADN, las instrucciones de todo lo que hace la célula."),
    ),
    e(
      bi("Which part controls what enters and leaves the cell?", "¿Qué parte controla lo que entra y sale de la célula?"),
      MEMBRANE,
      [WALL, NUCLEUS, CHLORO],
      bi("Every cell has this thin, flexible outer layer, even cells with no wall.", "Todas las células tienen esta capa externa delgada y flexible, incluso las que no tienen pared."),
      bi("The cell membrane lets some materials pass and blocks others. The cell wall mainly gives support and protection.", "La membrana celular deja pasar algunas sustancias y bloquea otras. La pared celular sobre todo da soporte y protección."),
    ),
    e(
      bi("Which part releases energy from sugar so the cell can use it?", "¿Qué parte libera la energía del azúcar para que la célula pueda usarla?"),
      MITO,
      [CHLORO, NUCLEUS, VACUOLE],
      bi("Plant cells and animal cells both have this part.", "Tanto las células vegetales como las animales tienen esta parte."),
      bi("Mitochondria break down sugar in cellular respiration and release energy the cell can use.", "Las mitocondrias descomponen el azúcar en la respiración celular y liberan energía que la célula puede usar."),
    ),
    e(
      bi("Which part uses energy from sunlight to make sugar?", "¿Qué parte usa la energía de la luz solar para producir azúcar?"),
      CHLORO,
      [MITO, WALL, VACUOLE],
      bi("This green part is found in leaf cells, not in animal cells.", "Esta parte verde está en las células de las hojas, no en las células animales."),
      bi("Chloroplasts carry out photosynthesis: they use light energy to make sugar.", "Los cloroplastos realizan la fotosíntesis: usan la energía de la luz para producir azúcar."),
    ),
    e(
      bi("Which stiff layer surrounds a plant cell and gives it support?", "¿Qué capa rígida rodea a la célula vegetal y le da soporte?"),
      WALL,
      [MEMBRANE, VACUOLE, NUCLEUS],
      bi("It sits outside the membrane and is made mostly of cellulose.", "Está por fuera de la membrana y está hecha sobre todo de celulosa."),
      bi("The cell wall is rigid, so it supports the plant cell and gives it a boxy shape.", "La pared celular es rígida, así que sostiene a la célula vegetal y le da forma de caja."),
    ),
    e(
      bi("Which part stores water and other materials, and is very large in plant cells?", "¿Qué parte guarda agua y otras sustancias, y es muy grande en las células vegetales?"),
      VACUOLE,
      [CHLORO, MITO, NUCLEUS],
      bi("When it is full of water, it keeps a plant firm.", "Cuando está llena de agua, mantiene firme a la planta."),
      bi("The vacuole stores water, food, and wastes. A plant cell's central vacuole can fill most of the cell.", "La vacuola guarda agua, alimento y desechos. La vacuola central de una célula vegetal puede ocupar casi toda la célula."),
    ),
    e(
      bi("What is the main job of the mitochondria?", "¿Cuál es la función principal de las mitocondrias?"),
      bi("Releasing energy from food", "Liberar energía de los alimentos"),
      [bi("Making food from sunlight", "Producir alimento con la luz solar"), bi("Storing the cell's DNA", "Guardar el ADN de la célula"), bi("Controlling what enters the cell", "Controlar lo que entra a la célula")],
      bi("Animal cells have mitochondria, and animals cannot make food from sunlight.", "Las células animales tienen mitocondrias, y los animales no pueden producir alimento con la luz solar."),
      bi("Mitochondria break down sugar to release energy. Making food from sunlight is the chloroplast's job.", "Las mitocondrias descomponen el azúcar para liberar energía. Producir alimento con la luz solar es tarea del cloroplasto."),
    ),
    e(
      bi("What is the main job of a chloroplast?", "¿Cuál es la función principal de un cloroplasto?"),
      bi("Making sugar using energy from sunlight", "Producir azúcar con la energía de la luz solar"),
      [bi("Releasing energy from sugar", "Liberar la energía del azúcar"), bi("Storing water", "Guardar agua"), bi("Giving the cell a stiff shape", "Darle a la célula una forma rígida")],
      bi("Chloroplasts are green and are found in the leaves of plants.", "Los cloroplastos son verdes y están en las hojas de las plantas."),
      bi("Chloroplasts carry out photosynthesis, turning light energy, water, and carbon dioxide into sugar.", "Los cloroplastos realizan la fotosíntesis: convierten la energía de la luz, el agua y el dióxido de carbono en azúcar."),
    ),
    e(
      bi("What does the cell membrane do?", "¿Qué hace la membrana celular?"),
      bi("Controls what enters and leaves the cell", "Controla lo que entra y sale de la célula"),
      [bi("Gives a plant cell its stiff shape", "Le da a la célula vegetal su forma rígida"), bi("Holds the cell's DNA", "Guarda el ADN de la célula"), bi("Stores water for the cell", "Guarda agua para la célula")],
      bi("Animal cells have a membrane but no wall, and they still need a border with gates.", "Las células animales tienen membrana pero no pared, y aun así necesitan un borde con puertas."),
      bi("The membrane is a flexible border that lets some materials in and out. A stiff shape comes from the cell wall.", "La membrana es un borde flexible que deja entrar y salir algunas sustancias. La forma rígida viene de la pared celular."),
    ),
    e(
      bi("What does the nucleus do?", "¿Qué hace el núcleo?"),
      bi("Holds the DNA and directs the cell's activities", "Guarda el ADN y dirige las actividades de la célula"),
      [bi("Releases energy from food", "Libera energía de los alimentos"), bi("Controls what enters and leaves the cell", "Controla lo que entra y sale de la célula"), bi("Captures energy from sunlight", "Capta la energía de la luz solar")],
      bi("The cell's instructions are kept here.", "Aquí se guardan las instrucciones de la célula."),
      bi("The nucleus stores the DNA, which carries the instructions for making everything the cell needs.", "El núcleo guarda el ADN, que lleva las instrucciones para producir todo lo que la célula necesita."),
    ),
    e(
      bi("What does the cell wall do?", "¿Qué hace la pared celular?"),
      bi("Supports and protects a plant cell", "Sostiene y protege a la célula vegetal"),
      [bi("Decides what enters and leaves the cell", "Decide lo que entra y sale de la célula"), bi("Makes sugar from sunlight", "Produce azúcar con la luz solar"), bi("Stores the cell's DNA", "Guarda el ADN de la célula")],
      bi("Plants have no skeleton, yet they stand up.", "Las plantas no tienen esqueleto y, aun así, se mantienen de pie."),
      bi("The rigid cell wall supports and protects plant cells. Choosing what passes through is the membrane's job.", "La pared celular rígida sostiene y protege a las células vegetales. Elegir lo que pasa es tarea de la membrana."),
    ),
    e(
      bi("What does a vacuole do?", "¿Qué hace una vacuola?"),
      bi("Stores water, food, and wastes", "Guarda agua, alimento y desechos"),
      [bi("Releases energy from food", "Libera energía de los alimentos"), bi("Holds the cell's DNA", "Guarda el ADN de la célula"), bi("Makes sugar from sunlight", "Produce azúcar con la luz solar")],
      bi("Think of a closet or a storage tank.", "Piensa en un clóset o en un tanque de almacenamiento."),
      bi("Vacuoles are storage spaces for water, food, and wastes.", "Las vacuolas son espacios para guardar agua, alimento y desechos."),
    ),
    e(
      bi("Muscle cells use a lot of energy. Which part would you expect them to have many of?", "Las células musculares usan mucha energía. ¿De qué parte esperarías que tuvieran muchas?"),
      bi("Mitochondria", "Mitocondrias"),
      [bi("Chloroplasts", "Cloroplastos"), bi("Vacuoles", "Vacuolas"), bi("Cell walls", "Paredes celulares")],
      bi("Which part releases energy from food?", "¿Qué parte libera la energía de los alimentos?"),
      bi("Muscle cells need a lot of energy, so they have many mitochondria. Animal cells have no chloroplasts or cell walls.", "Las células musculares necesitan mucha energía, así que tienen muchas mitocondrias. Las células animales no tienen cloroplastos ni pared celular."),
    ),
    e(
      bi("A plant that goes days without water droops. Which part of its cells has lost water?", "Una planta que pasa días sin agua se marchita. ¿Qué parte de sus células perdió agua?"),
      bi("The central vacuole", "La vacuola central"),
      [bi("The nucleus", "El núcleo"), bi("The chloroplasts", "Los cloroplastos"), bi("The mitochondria", "Las mitocondrias")],
      bi("Which part works like a water tank that pushes outward when full?", "¿Qué parte funciona como un tanque de agua que empuja hacia afuera cuando está lleno?"),
      bi("A full central vacuole presses against the cell wall and keeps the plant firm. When it loses water, the plant droops.", "Una vacuola central llena empuja contra la pared celular y mantiene firme a la planta. Cuando pierde agua, la planta se marchita."),
    ),
    e(
      bi("Leaf cells are green, but most root cells are not. Which part do most root cells lack?", "Las células de las hojas son verdes, pero la mayoría de las células de la raíz no. ¿Qué parte les falta a la mayoría de las células de la raíz?"),
      bi("Chloroplasts", "Cloroplastos"),
      [bi("Mitochondria", "Mitocondrias"), bi("A nucleus", "Un núcleo"), bi("A cell membrane", "Una membrana celular")],
      bi("Roots grow underground, where there is no light.", "Las raíces crecen bajo tierra, donde no hay luz."),
      bi("Chloroplasts give the green color and need light. Root cells still have mitochondria, a nucleus, and a membrane.", "Los cloroplastos dan el color verde y necesitan luz. Las células de la raíz sí tienen mitocondrias, núcleo y membrana."),
    ),
  ],
};

const CELLS_TYPES: Bank = {
  nudge: bi(
    "Is the question about plant versus animal cells, or about how cells build bigger structures?",
    "¿La pregunta trata de células vegetales y animales, o de cómo las células forman estructuras más grandes?",
  ),
  strategy: bi(
    "For plant versus animal, think about what a plant does that an animal does not. For levels, ask how many cells, tissues, or organs are working together.",
    "Para vegetal o animal, piensa en lo que hace una planta y un animal no. Para los niveles, pregúntate cuántas células, tejidos u órganos trabajan juntos.",
  ),
  seconds: 25,
  items: [
    e(
      bi("Which part is found in plant cells but not in animal cells?", "¿Qué parte tienen las células vegetales pero no las animales?"),
      WALL,
      [MEMBRANE, NUCLEUS, MITO],
      bi("Animal cells have only a flexible border. Plant cells add a stiff one.", "Las células animales solo tienen un borde flexible. Las vegetales tienen además uno rígido."),
      bi("Only plant cells have a cell wall. Both kinds have a membrane, a nucleus, and mitochondria.", "Solo las células vegetales tienen pared celular. Las dos tienen membrana, núcleo y mitocondrias."),
    ),
    e(
      bi("Which part is found in both plant and animal cells?", "¿Qué parte tienen tanto las células vegetales como las animales?"),
      MITO,
      [CHLORO, WALL, bi("Large central vacuole", "Vacuola central grande")],
      bi("Both plants and animals need to release energy from sugar.", "Tanto las plantas como los animales necesitan liberar la energía del azúcar."),
      bi("Plant and animal cells both have mitochondria. Chloroplasts, cell walls, and a large central vacuole belong to plant cells.", "Las células vegetales y las animales tienen mitocondrias. Los cloroplastos, la pared celular y la vacuola central grande son de las células vegetales."),
    ),
    e(
      bi("A cell has a cell wall, chloroplasts, and a large central vacuole. What kind of cell is it?", "Una célula tiene pared celular, cloroplastos y una vacuola central grande. ¿Qué tipo de célula es?"),
      bi("A plant cell", "Una célula vegetal"),
      [bi("An animal cell", "Una célula animal"), bi("A bacterium", "Una bacteria")],
      bi("Which kind of living thing makes its own food from sunlight?", "¿Qué tipo de ser vivo produce su propio alimento con la luz solar?"),
      bi("Chloroplasts, a cell wall, and a large central vacuole together mark a plant cell. Bacteria have no chloroplasts.", "Los cloroplastos, la pared celular y la vacuola central grande juntos indican una célula vegetal. Las bacterias no tienen cloroplastos."),
    ),
    e(
      bi(
        "A cell has a nucleus, mitochondria, and a cell membrane, but no cell wall and no chloroplasts. What kind of cell is it?",
        "Una célula tiene núcleo, mitocondrias y membrana celular, pero no tiene pared celular ni cloroplastos. ¿Qué tipo de célula es?",
      ),
      bi("An animal cell", "Una célula animal"),
      [bi("A plant leaf cell", "Una célula de hoja"), bi("A plant root cell", "Una célula de raíz")],
      bi("Plant cells have a wall, even in the roots.", "Las células vegetales tienen pared, incluso en la raíz."),
      bi("No cell wall means it is not a plant cell, so it is an animal cell. Root cells lack chloroplasts but still have walls.", "Sin pared celular no es una célula vegetal, así que es una célula animal. Las células de la raíz no tienen cloroplastos, pero sí pared."),
    ),
    e(
      bi("Why do plant cells have chloroplasts while animal cells do not?", "¿Por qué las células vegetales tienen cloroplastos y las animales no?"),
      bi("Plants make their own food from sunlight", "Las plantas producen su propio alimento con la luz solar"),
      [bi("Plant cells have no mitochondria", "Las células vegetales no tienen mitocondrias"), bi("Chloroplasts protect plants from the sun", "Los cloroplastos protegen a las plantas del sol")],
      bi("Animals eat food. Where does a plant's food come from?", "Los animales comen alimento. ¿De dónde viene el alimento de una planta?"),
      bi("Chloroplasts let plants make sugar by photosynthesis. Plant cells also have mitochondria to release that energy.", "Los cloroplastos permiten que las plantas produzcan azúcar por fotosíntesis. Las células vegetales también tienen mitocondrias para liberar esa energía."),
    ),
    e(
      bi("Do plant cells have mitochondria?", "¿Las células vegetales tienen mitocondrias?"),
      bi("Yes, to release energy from the sugar they make", "Sí, para liberar la energía del azúcar que producen"),
      [bi("No, chloroplasts do that job instead", "No, los cloroplastos hacen ese trabajo"), bi("Only in the leaves", "Solo en las hojas")],
      bi("Making sugar and using its energy are two different jobs.", "Producir azúcar y usar su energía son dos trabajos distintos."),
      bi("Plant cells have mitochondria in leaves, stems, and roots. Chloroplasts make sugar, and mitochondria release its energy.", "Las células vegetales tienen mitocondrias en hojas, tallos y raíces. Los cloroplastos producen azúcar y las mitocondrias liberan su energía."),
    ),
    e(
      bi("Which list goes from smallest to largest?", "¿Qué lista va de lo más pequeño a lo más grande?"),
      bi("Cell, tissue, organ, organ system, organism", "Célula, tejido, órgano, sistema de órganos, organismo"),
      [
        bi("Tissue, cell, organ, organism, organ system", "Tejido, célula, órgano, organismo, sistema de órganos"),
        bi("Cell, organ, tissue, organ system, organism", "Célula, órgano, tejido, sistema de órganos, organismo"),
        bi("Organ, tissue, cell, organ system, organism", "Órgano, tejido, célula, sistema de órganos, organismo"),
      ],
      bi("Similar cells group into a tissue first.", "Primero, las células parecidas se agrupan en un tejido."),
      bi("Cells form tissues, tissues form organs, organs form organ systems, and organ systems make up an organism.", "Las células forman tejidos, los tejidos forman órganos, los órganos forman sistemas de órganos y estos forman un organismo."),
    ),
    e(
      bi("A group of similar cells working together to do one job is called a…", "Un grupo de células parecidas que trabajan juntas para hacer una función se llama…"),
      TISSUE,
      [ORGAN, SYSTEM, ORGANISM],
      bi("This is the first level above a single cell.", "Es el primer nivel por encima de una sola célula."),
      bi("Similar cells working together form a tissue, such as muscle tissue.", "Las células parecidas que trabajan juntas forman un tejido, como el tejido muscular."),
    ),
    e(
      bi(
        "The heart is made of muscle tissue, nerve tissue, and other tissues working together. What level is the heart?",
        "El corazón está formado por tejido muscular, tejido nervioso y otros tejidos que trabajan juntos. ¿Qué nivel es el corazón?",
      ),
      ORGAN,
      [TISSUE, CELL, SYSTEM],
      bi("Several different tissues are working together here.", "Aquí trabajan juntos varios tejidos distintos."),
      bi("Different tissues working together form an organ, so the heart is an organ.", "Varios tejidos que trabajan juntos forman un órgano, así que el corazón es un órgano."),
    ),
    e(
      bi(
        "The heart, blood vessels, and blood work together to move materials around the body. What level is this?",
        "El corazón, los vasos sanguíneos y la sangre trabajan juntos para mover sustancias por el cuerpo. ¿Qué nivel es este?",
      ),
      SYSTEM,
      [ORGAN, TISSUE, ORGANISM],
      bi("Count how many organs are working together.", "Cuenta cuántos órganos trabajan juntos."),
      bi("Several organs working together form an organ system. This one is the circulatory system.", "Varios órganos que trabajan juntos forman un sistema de órganos. Este es el sistema circulatorio."),
    ),
    e(
      bi("A leaf is made of several tissues that work together to make food. What level is a leaf?", "Una hoja está formada por varios tejidos que trabajan juntos para producir alimento. ¿Qué nivel es una hoja?"),
      ORGAN,
      [TISSUE, CELL, ORGANISM],
      bi("What do you call several tissues doing one job together?", "¿Cómo se llama a varios tejidos que hacen juntos una función?"),
      bi("Several tissues working together form an organ, so a leaf is a plant organ.", "Varios tejidos que trabajan juntos forman un órgano, así que una hoja es un órgano de la planta."),
    ),
    e(
      bi("What is the smallest unit that can carry out all the processes of life?", "¿Cuál es la unidad más pequeña que puede realizar todos los procesos de la vida?"),
      CELL,
      [bi("Organelle", "Organelo"), TISSUE, ORGAN],
      bi("An organelle does only one job. What holds all the organelles?", "Un organelo hace solo un trabajo. ¿Qué contiene a todos los organelos?"),
      bi("The cell is the basic unit of life. A single organelle cannot live on its own.", "La célula es la unidad básica de la vida. Un organelo solo no puede vivir por su cuenta."),
    ),
    e(
      bi("Your stomach, intestines, and liver work together to break down food. What is this an example of?", "El estómago, los intestinos y el hígado trabajan juntos para descomponer los alimentos. ¿De qué es un ejemplo?"),
      bi("An organ system", "Un sistema de órganos"),
      [bi("A tissue", "Un tejido"), bi("An organ", "Un órgano"), bi("A cell", "Una célula")],
      bi("The stomach alone is one organ. Here there are three.", "El estómago solo es un órgano. Aquí hay tres."),
      bi("Organs working together form an organ system. This is the digestive system.", "Los órganos que trabajan juntos forman un sistema de órganos. Este es el sistema digestivo."),
    ),
    e(
      bi("An amoeba is a living thing made of just one cell. Which of these does it NOT have?", "Una ameba es un ser vivo formado por una sola célula. ¿Cuál de estas cosas NO tiene?"),
      bi("Tissues", "Tejidos"),
      [bi("A cell membrane", "Una membrana celular"), bi("A nucleus", "Un núcleo")],
      bi("A tissue needs a group of cells.", "Un tejido necesita un grupo de células."),
      bi("With only one cell, an amoeba cannot have tissues. It does have a membrane and a nucleus.", "Con una sola célula, la ameba no puede tener tejidos. Sí tiene membrana y núcleo."),
    ),
    e(
      bi("Which part would a leaf cell have that a human skin cell would not?", "¿Qué parte tendría una célula de hoja que no tendría una célula de la piel humana?"),
      bi("Chloroplasts", "Cloroplastos"),
      [bi("Mitochondria", "Mitocondrias"), bi("A nucleus", "Un núcleo"), bi("A cell membrane", "Una membrana celular")],
      bi("Which part needs sunlight to do its job?", "¿Qué parte necesita luz solar para hacer su trabajo?"),
      bi("Leaf cells have chloroplasts for photosynthesis. Skin cells, like all animal cells, have none.", "Las células de las hojas tienen cloroplastos para la fotosíntesis. Las células de la piel, como todas las células animales, no tienen."),
    ),
  ],
};

// ── s.variables ─────────────────────────────────────────────────────────────────────────────────

const IV = bi("The independent variable", "La variable independiente");
const DV = bi("The dependent variable", "La variable dependiente");
const CV = bi("A controlled variable", "Una variable controlada");

const VARIABLES_ID: Bank = {
  nudge: bi("Which thing does the scientist change on purpose, and which one is measured?", "¿Qué cambia el científico a propósito y qué se mide?"),
  strategy: bi(
    "Ask two questions. What was changed on purpose? That is the cause. What was measured or counted afterward? That is the effect.",
    "Hazte dos preguntas. ¿Qué se cambió a propósito? Esa es la causa. ¿Qué se midió o se contó después? Ese es el efecto.",
  ),
  seconds: 30,
  items: [
    e(
      bi(
        "Maya gives four bean plants different amounts of water each day. After two weeks she measures how tall each plant is. What is the independent variable?",
        "Maya les da a cuatro plantas de frijol cantidades distintas de agua cada día. Después de dos semanas mide la altura de cada planta. ¿Cuál es la variable independiente?",
      ),
      bi("The amount of water", "La cantidad de agua"),
      [bi("The height of the plants", "La altura de las plantas"), bi("The kind of bean plant", "El tipo de planta de frijol"), bi("The number of days", "El número de días")],
      bi("What did Maya change on purpose from plant to plant?", "¿Qué cambió Maya a propósito de una planta a otra?"),
      bi("Maya chose a different amount of water for each plant, so water is the independent variable. Height is what she measured.", "Maya eligió una cantidad de agua distinta para cada planta, así que el agua es la variable independiente. La altura es lo que midió."),
    ),
    e(
      bi(
        "Maya gives four bean plants different amounts of water each day. After two weeks she measures how tall each plant is. What is the dependent variable?",
        "Maya les da a cuatro plantas de frijol cantidades distintas de agua cada día. Después de dos semanas mide la altura de cada planta. ¿Cuál es la variable dependiente?",
      ),
      bi("The height of the plants", "La altura de las plantas"),
      [bi("The amount of water", "La cantidad de agua"), bi("The kind of bean plant", "El tipo de planta de frijol"), bi("The number of days", "El número de días")],
      bi("What did Maya measure at the end?", "¿Qué midió Maya al final?"),
      bi("Maya measured height to see the effect of water, so height is the dependent variable.", "Maya midió la altura para ver el efecto del agua, así que la altura es la variable dependiente."),
    ),
    e(
      bi(
        "Diego drops the same ball from 50 cm, 100 cm, and 150 cm and measures how high it bounces. What is the independent variable?",
        "Diego deja caer la misma pelota desde 50 cm, 100 cm y 150 cm y mide qué tan alto rebota. ¿Cuál es la variable independiente?",
      ),
      bi("The drop height", "La altura desde la que cae"),
      [bi("The bounce height", "La altura del rebote"), bi("The kind of ball", "El tipo de pelota"), bi("The floor surface", "La superficie del piso")],
      bi("Which number did Diego pick before each drop?", "¿Qué número eligió Diego antes de cada caída?"),
      bi("Diego chose the drop heights, so drop height is the independent variable. The bounce is the result he measured.", "Diego eligió las alturas de caída, así que esa es la variable independiente. El rebote es el resultado que midió."),
    ),
    e(
      bi(
        "Diego drops the same ball from 50 cm, 100 cm, and 150 cm and measures how high it bounces. What is the dependent variable?",
        "Diego deja caer la misma pelota desde 50 cm, 100 cm y 150 cm y mide qué tan alto rebota. ¿Cuál es la variable dependiente?",
      ),
      bi("The bounce height", "La altura del rebote"),
      [bi("The drop height", "La altura desde la que cae"), bi("The kind of ball", "El tipo de pelota"), bi("The floor surface", "La superficie del piso")],
      bi("What did Diego measure after each drop?", "¿Qué midió Diego después de cada caída?"),
      bi("How high the ball bounces depends on the drop height, so the bounce height is the dependent variable.", "Qué tan alto rebota depende de la altura de caída, así que la altura del rebote es la variable dependiente."),
    ),
    e(
      bi(
        "Aiko stirs one spoonful of sugar into cold, warm, and hot water. She times how long the sugar takes to dissolve. What is the dependent variable?",
        "Aiko mezcla una cucharada de azúcar en agua fría, tibia y caliente. Mide cuánto tarda el azúcar en disolverse. ¿Cuál es la variable dependiente?",
      ),
      bi("The time for the sugar to dissolve", "El tiempo que tarda el azúcar en disolverse"),
      [bi("The water temperature", "La temperatura del agua"), bi("The amount of sugar", "La cantidad de azúcar"), bi("The size of the spoon", "El tamaño de la cuchara")],
      bi("What did Aiko time with a stopwatch?", "¿Qué midió Aiko con el cronómetro?"),
      bi("The dissolving time is measured to see the effect of temperature, so it is the dependent variable.", "El tiempo de disolución se mide para ver el efecto de la temperatura, así que es la variable dependiente."),
    ),
    e(
      bi(
        "Kwame sets a ramp at three different angles and measures how far a toy car rolls each time. What is the independent variable?",
        "Kwame coloca una rampa en tres ángulos distintos y mide qué tan lejos rueda un carrito de juguete cada vez. ¿Cuál es la variable independiente?",
      ),
      bi("The angle of the ramp", "El ángulo de la rampa"),
      [bi("How far the car rolls", "La distancia que rueda el carrito"), bi("The toy car used", "El carrito que usa"), bi("The length of the ramp", "El largo de la rampa")],
      bi("What did Kwame set differently for each trial?", "¿Qué ajustó Kwame de forma distinta en cada prueba?"),
      bi("Kwame changed the angle on purpose, so the angle is the independent variable. The rolling distance is measured.", "Kwame cambió el ángulo a propósito, así que el ángulo es la variable independiente. La distancia que rueda se mide."),
    ),
    e(
      bi(
        "A student counts how many times a cricket chirps in one minute at 15 °C, 20 °C, and 25 °C. What is the dependent variable?",
        "Un estudiante cuenta cuántas veces canta un grillo en un minuto a 15 °C, 20 °C y 25 °C. ¿Cuál es la variable dependiente?",
      ),
      bi("The number of chirps per minute", "El número de cantos por minuto"),
      [bi("The temperature", "La temperatura"), bi("The one-minute counting time", "El minuto que dura cada conteo")],
      bi("What did the student count?", "¿Qué contó el estudiante?"),
      bi("Chirps were counted to see the effect of temperature, so chirps per minute is the dependent variable.", "Los cantos se contaron para ver el efecto de la temperatura, así que los cantos por minuto son la variable dependiente."),
    ),
    e(
      bi(
        "Priya grows the same kind of plant under red, blue, and green light and measures its growth after two weeks. What is the independent variable?",
        "Priya cultiva el mismo tipo de planta con luz roja, azul y verde, y mide su crecimiento después de dos semanas. ¿Cuál es la variable independiente?",
      ),
      bi("The color of the light", "El color de la luz"),
      [bi("How much the plants grow", "Cuánto crecen las plantas"), bi("The kind of plant", "El tipo de planta"), bi("The length of the test", "La duración de la prueba")],
      bi("What is different about each plant's setup?", "¿Qué es distinto en el montaje de cada planta?"),
      bi("Priya chose the light colors, so light color is the independent variable. Growth is what she measured.", "Priya eligió los colores de la luz, así que el color es la variable independiente. El crecimiento es lo que midió."),
    ),
    e(
      bi(
        "Luis tests three kinds of paper towels. He dips each one in water and measures how much water it soaks up. What is the dependent variable?",
        "Luis prueba tres tipos de toallas de papel. Moja cada una en agua y mide cuánta agua absorbe. ¿Cuál es la variable dependiente?",
      ),
      bi("The amount of water soaked up", "La cantidad de agua absorbida"),
      [bi("The kind of paper towel", "El tipo de toalla de papel"), bi("The size of each towel", "El tamaño de cada toalla")],
      bi("What did Luis measure after each dip?", "¿Qué midió Luis después de mojar cada una?"),
      bi("The water soaked up is measured to compare the towels, so it is the dependent variable.", "El agua absorbida se mide para comparar las toallas, así que es la variable dependiente."),
    ),
    e(
      bi(
        "Fatima connects a bulb to 1, then 2, then 3 batteries and records how brightly the bulb glows. What is the independent variable?",
        "Fátima conecta un foco a 1, luego a 2 y luego a 3 pilas, y anota qué tan brillante se ve. ¿Cuál es la variable independiente?",
      ),
      bi("The number of batteries", "El número de pilas"),
      [bi("The brightness of the bulb", "El brillo del foco"), bi("The type of bulb", "El tipo de foco"), bi("The length of the wires", "El largo de los cables")],
      bi("What did Fatima add one at a time?", "¿Qué fue agregando Fátima de uno en uno?"),
      bi("Fatima changed the number of batteries on purpose, so that is the independent variable. Brightness is the result.", "Fátima cambió el número de pilas a propósito, así que esa es la variable independiente. El brillo es el resultado."),
    ),
    e(
      bi(
        "Noah puts identical ice cubes in rooms at 10 °C, 20 °C, and 30 °C and times how long each takes to melt. What is the dependent variable?",
        "Noah pone cubos de hielo iguales en cuartos a 10 °C, 20 °C y 30 °C y mide cuánto tarda cada uno en derretirse. ¿Cuál es la variable dependiente?",
      ),
      bi("The melting time", "El tiempo que tarda en derretirse"),
      [bi("The room temperature", "La temperatura del cuarto"), bi("The size of the ice cubes", "El tamaño de los cubos de hielo")],
      bi("What did Noah time?", "¿Qué cronometró Noah?"),
      bi("The melting time is measured to see the effect of room temperature, so it is the dependent variable.", "El tiempo de derretimiento se mide para ver el efecto de la temperatura del cuarto, así que es la variable dependiente."),
    ),
    e(
      bi(
        "Mei changes the length of a pendulum's string and counts how many swings it makes in 30 seconds. What is the independent variable?",
        "Mei cambia el largo de la cuerda de un péndulo y cuenta cuántas oscilaciones hace en 30 segundos. ¿Cuál es la variable independiente?",
      ),
      bi("The length of the string", "El largo de la cuerda"),
      [bi("The number of swings", "El número de oscilaciones"), bi("The 30-second time limit", "Los 30 segundos de cada conteo"), bi("The weight on the string", "El peso en la cuerda")],
      bi("What did Mei change between trials?", "¿Qué cambió Mei entre una prueba y otra?"),
      bi("Mei changed the string length on purpose, so it is the independent variable. The swings are counted.", "Mei cambió el largo de la cuerda a propósito, así que es la variable independiente. Las oscilaciones se cuentan."),
    ),
    e(
      bi(
        "Omar adds different amounts of salt to cups of water and checks whether an egg floats in each one. What is the dependent variable?",
        "Omar agrega distintas cantidades de sal a vasos con agua y observa si un huevo flota en cada uno. ¿Cuál es la variable dependiente?",
      ),
      bi("Whether the egg floats", "Si el huevo flota o no"),
      [bi("The amount of salt", "La cantidad de sal"), bi("The amount of water", "La cantidad de agua"), bi("The size of the egg", "El tamaño del huevo")],
      bi("What did Omar observe in each cup?", "¿Qué observó Omar en cada vaso?"),
      bi("Floating or sinking is the result Omar observes, so it is the dependent variable. Salt is what he changed.", "Que flote o se hunda es el resultado que Omar observa, así que es la variable dependiente. La sal es lo que cambió."),
    ),
    e(
      bi("On a graph of experiment results, which variable usually goes on the horizontal x-axis?", "En una gráfica de los resultados de un experimento, ¿qué variable suele ir en el eje horizontal x?"),
      IV,
      [DV, CV],
      bi("The x-axis shows the values the scientist chose ahead of time.", "El eje x muestra los valores que el científico eligió de antemano."),
      bi("The independent variable goes on the x-axis, and the dependent variable goes on the y-axis.", "La variable independiente va en el eje x y la variable dependiente va en el eje y."),
    ),
    e(
      bi("What is the variable that a scientist changes on purpose called?", "¿Cómo se llama la variable que un científico cambia a propósito?"),
      IV,
      [DV, CV],
      bi("It does not depend on the results. The scientist picks it.", "No depende de los resultados. El científico la elige."),
      bi("The variable chosen and changed on purpose is the independent variable.", "La variable que se elige y se cambia a propósito es la variable independiente."),
    ),
    e(
      bi("What is the variable that is measured to see the effect of a change called?", "¿Cómo se llama la variable que se mide para ver el efecto de un cambio?"),
      DV,
      [IV, CV],
      bi("Its value depends on what the scientist changed.", "Su valor depende de lo que cambió el científico."),
      bi("The measured result depends on the change, so it is the dependent variable.", "El resultado medido depende del cambio, así que es la variable dependiente."),
    ),
  ],
};

const VARIABLES_FAIR: Bank = {
  nudge: bi("In a fair test, how many things are changed on purpose?", "En una prueba justa, ¿cuántas cosas se cambian a propósito?"),
  strategy: bi(
    "Change only one thing, measure the result, and keep everything else the same. Then any difference in the results has only one possible cause.",
    "Cambia solo una cosa, mide el resultado y mantén todo lo demás igual. Así cualquier diferencia en los resultados tiene una sola causa posible.",
  ),
  seconds: 35,
  items: [
    e(
      bi(
        "Maya tests how the amount of water affects the growth of bean plants. What should she keep the same for every plant?",
        "Maya prueba cómo la cantidad de agua afecta el crecimiento de plantas de frijol. ¿Qué debe mantener igual para todas las plantas?",
      ),
      bi("The type of soil", "El tipo de tierra"),
      [bi("The amount of water", "La cantidad de agua"), bi("How tall the plants grow", "Cuánto crecen las plantas")],
      bi("Water is what she is testing, so it has to change. What else could affect growth?", "El agua es lo que está probando, así que debe cambiar. ¿Qué más podría afectar el crecimiento?"),
      bi("Soil is a controlled variable. If it stays the same, only water can cause a difference in growth.", "La tierra es una variable controlada. Si se mantiene igual, solo el agua puede causar una diferencia en el crecimiento."),
    ),
    e(
      bi("Diego tests whether different kinds of balls bounce to different heights. What should he keep the same?", "Diego prueba si distintos tipos de pelota rebotan a distintas alturas. ¿Qué debe mantener igual?"),
      bi("The height he drops them from", "La altura desde la que las deja caer"),
      [bi("The kind of ball", "El tipo de pelota"), bi("How high each ball bounces", "Qué tan alto rebota cada pelota")],
      bi("If one ball fell from higher up, would the test be fair?", "Si una pelota cayera desde más alto, ¿la prueba sería justa?"),
      bi("Drop height is a controlled variable. The kind of ball is tested, and the bounce is measured.", "La altura de caída es una variable controlada. Se prueba el tipo de pelota y se mide el rebote."),
    ),
    e(
      bi("Which plan is a fair test of whether fertilizer helps plants grow?", "¿Qué plan es una prueba justa para saber si el fertilizante ayuda a crecer a las plantas?"),
      bi("Two identical plants with the same light and water, and only one gets fertilizer", "Dos plantas iguales con la misma luz y agua, y solo una recibe fertilizante"),
      [
        bi("One plant with fertilizer in a sunny window, one without in a dark closet", "Una planta con fertilizante junto a una ventana soleada y otra sin fertilizante en un clóset oscuro"),
        bi("Two different kinds of plants, both given fertilizer", "Dos tipos distintos de plantas, las dos con fertilizante"),
      ],
      bi("Look for the plan where only one thing is different.", "Busca el plan en el que solo una cosa es distinta."),
      bi("Only the fertilizer differs in that plan, so any difference in growth comes from the fertilizer.", "En ese plan solo cambia el fertilizante, así que cualquier diferencia en el crecimiento viene del fertilizante."),
    ),
    e(
      bi(
        "Aiko tests whether water temperature changes how fast sugar dissolves. She puts 1 spoonful of sugar in hot water in a big cup and 3 spoonfuls in cold water in a small cup. What is wrong with her test?",
        "Aiko prueba si la temperatura del agua cambia qué tan rápido se disuelve el azúcar. Pone 1 cucharada de azúcar en agua caliente en un vaso grande y 3 cucharadas en agua fría en un vaso pequeño. ¿Qué está mal en su prueba?",
      ),
      bi("She changed more than one variable", "Cambió más de una variable"),
      [bi("Nothing; it is a fair test", "Nada; es una prueba justa"), bi("She should use only hot water", "Debería usar solo agua caliente")],
      bi("List everything that is different between the two cups.", "Haz una lista de todo lo que es distinto entre los dos vasos."),
      bi("Temperature, amount of sugar, and cup size all changed, so she cannot tell which one made the difference.", "Cambiaron la temperatura, la cantidad de azúcar y el tamaño del vaso, así que no puede saber cuál causó la diferencia."),
    ),
    e(
      bi("Why do scientists keep controlled variables the same?", "¿Por qué los científicos mantienen iguales las variables controladas?"),
      bi("So only the independent variable can cause a change in the results", "Para que solo la variable independiente pueda causar un cambio en los resultados"),
      [bi("So the dependent variable does not change", "Para que la variable dependiente no cambie"), bi("So the experiment finishes faster", "Para que el experimento termine más rápido")],
      bi("If two things change at once, can you tell which one caused the result?", "Si cambian dos cosas a la vez, ¿puedes saber cuál causó el resultado?"),
      bi("Keeping everything else the same leaves the independent variable as the only possible cause.", "Mantener todo lo demás igual deja a la variable independiente como la única causa posible."),
    ),
    e(
      bi("Kwame tests how the angle of a ramp affects how far a toy car rolls. What should NOT change between trials?", "Kwame prueba cómo el ángulo de una rampa afecta qué tan lejos rueda un carrito de juguete. ¿Qué NO debe cambiar entre pruebas?"),
      bi("The toy car he uses", "El carrito que usa"),
      [bi("The angle of the ramp", "El ángulo de la rampa"), bi("How far the car rolls", "Qué tan lejos rueda el carrito")],
      bi("One choice is what he tests, and one is what he measures.", "Una opción es lo que prueba y otra es lo que mide."),
      bi("The car is a controlled variable. The angle is tested, and the distance is measured.", "El carrito es una variable controlada. Se prueba el ángulo y se mide la distancia."),
    ),
    e(
      bi("Luis tests which kind of paper towel soaks up the most water. Which is a controlled variable?", "Luis prueba qué tipo de toalla de papel absorbe más agua. ¿Cuál es una variable controlada?"),
      bi("The size of each towel piece", "El tamaño de cada trozo de toalla"),
      [bi("The kind of paper towel", "El tipo de toalla de papel"), bi("The amount of water soaked up", "La cantidad de agua absorbida")],
      bi("A controlled variable is kept the same in every trial.", "Una variable controlada se mantiene igual en todas las pruebas."),
      bi("A bigger piece would soak up more water, so size must stay the same. The kind of towel is what he tests.", "Un trozo más grande absorbería más agua, así que el tamaño debe ser igual. El tipo de toalla es lo que prueba."),
    ),
    e(
      bi("Why should each trial in an experiment be repeated several times?", "¿Por qué conviene repetir varias veces cada prueba de un experimento?"),
      bi("To check that the results are reliable and not a fluke", "Para comprobar que los resultados son confiables y no una casualidad"),
      [bi("To change the independent variable each time", "Para cambiar la variable independiente cada vez"), bi("To make the dependent variable bigger", "Para que la variable dependiente sea más grande")],
      bi("What if one result happened by chance?", "¿Y si un resultado salió así por casualidad?"),
      bi("Repeating trials shows whether the results are consistent, which makes them reliable.", "Repetir las pruebas muestra si los resultados son constantes, y eso los hace confiables."),
    ),
    e(
      bi(
        "In a test of whether music helps plants grow, one group of plants gets no music. What is this group called?",
        "En una prueba para saber si la música ayuda a crecer a las plantas, un grupo de plantas no escucha música. ¿Cómo se llama este grupo?",
      ),
      bi("The control group", "El grupo de control"),
      [bi("The experimental group", "El grupo experimental"), bi("The dependent variable", "La variable dependiente")],
      bi("This group shows what happens without the change, for comparison.", "Este grupo muestra qué pasa sin el cambio, para comparar."),
      bi("The group that gets no music is the control group. The plants with music are the experimental group.", "El grupo sin música es el grupo de control. Las plantas con música son el grupo experimental."),
    ),
    e(
      bi(
        "Noah tests whether salt makes ice melt faster. He puts salt on one ice cube and nothing on another. For a fair test, how should the two ice cubes be set up?",
        "Noah prueba si la sal hace que el hielo se derrita más rápido. Pone sal en un cubo de hielo y nada en otro. Para que la prueba sea justa, ¿cómo deben estar los dos cubos?",
      ),
      bi("Same size, in the same place", "Del mismo tamaño y en el mismo lugar"),
      [bi("Different sizes, to show more of an effect", "De tamaños distintos, para ver más efecto"), bi("One in the sun and one in the shade", "Uno al sol y otro a la sombra")],
      bi("Only the salt should be different.", "Solo la sal debe ser distinta."),
      bi("Size and place are controlled variables, so the salt is the only thing that differs.", "El tamaño y el lugar son variables controladas, así que la sal es lo único distinto."),
    ),
    e(
      bi(
        "Mei tests how string length affects a pendulum's swings. She also uses a heavier weight on the longest string. Why is this a problem?",
        "Mei prueba cómo el largo de la cuerda afecta las oscilaciones de un péndulo. Además, usa un peso mayor en la cuerda más larga. ¿Por qué es un problema?",
      ),
      bi("She cannot tell whether the length or the weight caused any change", "No puede saber si el cambio lo causó el largo o el peso"),
      [bi("It is not a problem; more changes give more data", "No es un problema; más cambios dan más datos"), bi("She should count swings for a longer time", "Debería contar las oscilaciones durante más tiempo")],
      bi("How many things are different for the longest string?", "¿Cuántas cosas son distintas en la cuerda más larga?"),
      bi("Two variables changed at once, so the test is not fair.", "Cambiaron dos variables a la vez, así que la prueba no es justa."),
    ),
    e(
      bi("Priya tests whether the color of light affects plant growth. Which is NOT a controlled variable?", "Priya prueba si el color de la luz afecta el crecimiento de las plantas. ¿Cuál NO es una variable controlada?"),
      bi("The color of the light", "El color de la luz"),
      [bi("The amount of water", "La cantidad de agua"), bi("The type of plant", "El tipo de planta")],
      bi("Which one is Priya changing on purpose?", "¿Cuál está cambiando Priya a propósito?"),
      bi("Light color is the independent variable, so it changes. Water and plant type are kept the same.", "El color de la luz es la variable independiente, así que cambia. El agua y el tipo de planta se mantienen iguales."),
    ),
    e(
      bi("Sofia wants to test whether a bigger parachute makes a toy fall more slowly. Which plan is fair?", "Sofía quiere probar si un paracaídas más grande hace que un juguete caiga más despacio. ¿Qué plan es justo?"),
      bi("Drop the same toy with a small and a large parachute from the same height", "Dejar caer el mismo juguete con un paracaídas pequeño y uno grande desde la misma altura"),
      [
        bi("Drop the large parachute from higher up so it is easier to time", "Dejar caer el paracaídas grande desde más alto para que sea más fácil medir el tiempo"),
        bi("Use a heavier toy with the large parachute", "Usar un juguete más pesado con el paracaídas grande"),
      ],
      bi("Only the size of the parachute should be different.", "Solo el tamaño del paracaídas debe ser distinto."),
      bi("Same toy and same height leave parachute size as the only difference.", "El mismo juguete y la misma altura dejan el tamaño del paracaídas como única diferencia."),
    ),
    e(
      bi("Fatima tests whether the number of batteries changes how brightly a bulb glows. What should stay the same?", "Fátima prueba si el número de pilas cambia qué tan brillante se ve un foco. ¿Qué debe mantenerse igual?"),
      bi("The type of bulb", "El tipo de foco"),
      [bi("The number of batteries", "El número de pilas"), bi("How brightly the bulb glows", "Qué tan brillante se ve el foco")],
      bi("A different bulb could glow differently on its own.", "Un foco distinto podría brillar diferente por sí solo."),
      bi("The bulb is a controlled variable. The batteries are tested, and the brightness is observed.", "El foco es una variable controlada. Se prueban las pilas y se observa el brillo."),
    ),
  ],
};

// ── s.ecosystems ────────────────────────────────────────────────────────────────────────────────

const PRED = bi("Predation", "Depredación");
const COMP = bi("Competition", "Competencia");
const MUT = bi("Mutualism", "Mutualismo");
const COMM = bi("Commensalism", "Comensalismo");
const PARA = bi("Parasitism", "Parasitismo");

const ECOSYSTEMS: Bank = {
  nudge: bi("Who benefits, and is anyone harmed?", "¿Quién se beneficia y alguien sale perjudicado?"),
  strategy: bi(
    "Both benefit: mutualism. One benefits and the other is not affected: commensalism. One lives on or in the other and harms it: parasitism. One kills and eats the other: predation. Both need the same limited resource: competition.",
    "Los dos se benefician: mutualismo. Uno se beneficia y al otro no le afecta: comensalismo. Uno vive sobre o dentro del otro y lo perjudica: parasitismo. Uno mata y se come al otro: depredación. Los dos necesitan el mismo recurso escaso: competencia.",
  ),
  seconds: 25,
  items: [
    e(
      bi(
        "Bees drink nectar from flowers and carry pollen from flower to flower. What is the relationship between the bees and the flowers?",
        "Las abejas toman néctar de las flores y llevan polen de una flor a otra. ¿Qué relación hay entre las abejas y las flores?",
      ),
      MUT,
      [COMM, PARA, COMP],
      bi("The bees get food. What do the flowers get from the bees?", "Las abejas obtienen alimento. ¿Qué obtienen las flores de las abejas?"),
      bi("Bees get food and flowers get pollinated, so both benefit: mutualism.", "Las abejas obtienen alimento y las flores son polinizadas; las dos se benefician: mutualismo."),
    ),
    e(
      bi("A tick attaches to a deer and feeds on its blood for days. What is the relationship?", "Una garrapata se pega a un venado y se alimenta de su sangre durante días. ¿Qué relación es?"),
      PARA,
      [PRED, MUT, COMM],
      bi("The deer is harmed, but it is not killed and eaten.", "El venado sale perjudicado, pero no muere ni es devorado."),
      bi("The tick benefits by living on the deer and harming it without killing it: parasitism.", "La garrapata se beneficia viviendo sobre el venado y perjudicándolo sin matarlo: parasitismo."),
    ),
    e(
      bi("A hawk swoops down, catches a mouse, and eats it. What is the relationship?", "Un halcón baja en picada, atrapa un ratón y se lo come. ¿Qué relación es?"),
      PRED,
      [PARA, COMP, COMM],
      bi("One animal hunts, kills, and eats the other.", "Un animal caza, mata y se come al otro."),
      bi("The hawk is the predator and the mouse is the prey: predation.", "El halcón es el depredador y el ratón es la presa: depredación."),
    ),
    e(
      bi(
        "Two kinds of birds eat the same seeds in a field where seeds are scarce. What is the relationship between the two kinds of birds?",
        "Dos tipos de aves comen las mismas semillas en un campo donde hay pocas semillas. ¿Qué relación hay entre los dos tipos de aves?",
      ),
      COMP,
      [PRED, MUT, COMM],
      bi("Every seed one bird eats is a seed the other bird cannot have.", "Cada semilla que come un ave es una semilla que la otra ya no puede comer."),
      bi("Both need the same limited food, so they compete: competition.", "Las dos necesitan el mismo alimento escaso, así que compiten: competencia."),
    ),
    e(
      bi(
        "Barnacles attach to a whale's skin and ride to waters full of food. The whale is neither helped nor harmed. What is the relationship?",
        "Los percebes se pegan a la piel de una ballena y viajan a aguas llenas de alimento. A la ballena no le ayuda ni le perjudica. ¿Qué relación es?",
      ),
      COMM,
      [MUT, PARA, PRED],
      bi("Only one of them gains anything, and the other is not affected.", "Solo uno de los dos gana algo, y al otro no le afecta."),
      bi("The barnacles benefit and the whale is not affected: commensalism.", "Los percebes se benefician y a la ballena no le afecta: comensalismo."),
    ),
    e(
      bi(
        "A clownfish lives among the stinging tentacles of a sea anemone. The anemone protects the clownfish, and the clownfish cleans the anemone and chases away fish that eat it. What is the relationship?",
        "Un pez payaso vive entre los tentáculos urticantes de una anémona. La anémona protege al pez payaso, y el pez payaso limpia a la anémona y ahuyenta a los peces que se la comen. ¿Qué relación es?",
      ),
      MUT,
      [COMM, PARA, PRED],
      bi("List what each one gets from the other.", "Haz una lista de lo que cada uno recibe del otro."),
      bi("Each one helps the other, so it is mutualism.", "Cada uno ayuda al otro, así que es mutualismo."),
    ),
    e(
      bi(
        "Lions and hyenas on the same savanna both hunt zebras. What is the relationship between the lions and the hyenas?",
        "Los leones y las hienas de la misma sabana cazan cebras. ¿Qué relación hay entre los leones y las hienas?",
      ),
      COMP,
      [PRED, MUT, PARA],
      bi("Look at the lions and the hyenas, not at the zebras.", "Fíjate en los leones y las hienas, no en las cebras."),
      bi("Lions and hyenas need the same prey, so they compete with each other: competition.", "Los leones y las hienas necesitan las mismas presas, así que compiten entre sí: competencia."),
    ),
    e(
      bi("A tapeworm lives inside a dog's intestine and absorbs food the dog has digested. What is the relationship?", "Una tenia vive dentro del intestino de un perro y absorbe el alimento que el perro ha digerido. ¿Qué relación es?"),
      PARA,
      [COMM, MUT, PRED],
      bi("The dog loses food it needs, and the worm lives inside it.", "El perro pierde alimento que necesita, y el gusano vive dentro de él."),
      bi("The tapeworm benefits and harms its host from the inside: parasitism.", "La tenia se beneficia y perjudica a su huésped desde adentro: parasitismo."),
    ),
    e(
      bi("A robin builds its nest in the branches of a tall tree. The tree is not affected. What is the relationship?", "Un petirrojo construye su nido en las ramas de un árbol alto. Al árbol no le afecta. ¿Qué relación es?"),
      COMM,
      [MUT, PARA, COMP],
      bi("The bird gets a home. Does the tree gain or lose anything?", "El ave obtiene un hogar. ¿El árbol gana o pierde algo?"),
      bi("The robin benefits and the tree is not affected: commensalism.", "El petirrojo se beneficia y al árbol no le afecta: comensalismo."),
    ),
    e(
      bi(
        "Cattle egrets follow cows and eat the insects the cows stir up from the grass. The cows are not affected. What is the relationship between the egrets and the cows?",
        "Las garzas ganaderas siguen a las vacas y se comen los insectos que las vacas espantan del pasto. A las vacas no les afecta. ¿Qué relación hay entre las garzas y las vacas?",
      ),
      COMM,
      [MUT, PARA, PRED],
      bi("The birds get an easy meal. What do the cows get?", "Las aves consiguen comida fácil. ¿Qué obtienen las vacas?"),
      bi("The egrets benefit and the cows are not affected: commensalism.", "Las garzas se benefician y a las vacas no les afecta: comensalismo."),
    ),
    e(
      bi(
        "In a lichen, a fungus and an alga live together. The alga makes food by photosynthesis, and the fungus gives it shelter and water. What is the relationship?",
        "En un liquen, un hongo y un alga viven juntos. El alga produce alimento por fotosíntesis y el hongo le da refugio y agua. ¿Qué relación es?",
      ),
      MUT,
      [PARA, COMM, COMP],
      bi("Check whether each partner gives the other something.", "Revisa si cada uno le da algo al otro."),
      bi("Both partners benefit: mutualism.", "Los dos se benefician: mutualismo."),
    ),
    e(
      bi("A snake catches a frog and swallows it. What is the relationship?", "Una serpiente atrapa una rana y se la traga. ¿Qué relación es?"),
      PRED,
      [PARA, COMM, COMP],
      bi("The frog does not survive this meeting.", "La rana no sobrevive a este encuentro."),
      bi("The snake kills and eats the frog: predation.", "La serpiente mata y se come a la rana: depredación."),
    ),
    e(
      bi("Mistletoe grows on tree branches and takes water and nutrients from the tree. What is the relationship?", "El muérdago crece en las ramas de los árboles y les quita agua y nutrientes. ¿Qué relación es?"),
      PARA,
      [MUT, COMM, PRED],
      bi("The tree loses water and nutrients but keeps living.", "El árbol pierde agua y nutrientes, pero sigue vivo."),
      bi("The mistletoe benefits and the tree is harmed: parasitism.", "El muérdago se beneficia y el árbol sale perjudicado: parasitismo."),
    ),
    e(
      bi(
        "Two pine trees grow close together. Both need the same sunlight, water, and soil nutrients. What is the relationship?",
        "Dos pinos crecen muy juntos. Los dos necesitan la misma luz, agua y nutrientes del suelo. ¿Qué relación es?",
      ),
      COMP,
      [MUT, COMM, PARA],
      bi("There is only so much light and water to share.", "La luz y el agua que hay que compartir son limitadas."),
      bi("Both trees need the same limited resources: competition.", "Los dos árboles necesitan los mismos recursos limitados: competencia."),
    ),
    e(
      bi(
        "Bacteria in your intestines help digest food and make some vitamins, and they get a warm place to live with plenty of food. What is the relationship?",
        "Las bacterias de tus intestinos ayudan a digerir el alimento y producen algunas vitaminas, y a cambio tienen un lugar cálido con mucho alimento. ¿Qué relación es?",
      ),
      MUT,
      [PARA, COMM, PRED],
      bi("You gain something, and so do the bacteria.", "Tú ganas algo, y las bacterias también."),
      bi("You and the bacteria both benefit: mutualism.", "Tú y las bacterias se benefician: mutualismo."),
    ),
    e(
      bi("A pack of wolves chases down a moose and eats it. What is the relationship between the wolves and the moose?", "Una manada de lobos persigue a un alce y se lo come. ¿Qué relación hay entre los lobos y el alce?"),
      PRED,
      [COMP, PARA, COMM],
      bi("One animal is hunted and killed for food.", "Un animal es cazado y muerto para servir de alimento."),
      bi("The wolves are predators and the moose is their prey: predation.", "Los lobos son depredadores y el alce es su presa: depredación."),
    ),
    e(
      bi(
        "A remora fish attaches to a shark and eats scraps from the shark's meals. The shark is not affected. What is the relationship?",
        "Una rémora se pega a un tiburón y come restos de las presas del tiburón. Al tiburón no le afecta. ¿Qué relación es?",
      ),
      COMM,
      [MUT, PARA, PRED],
      bi("The remora gets food and a ride. What happens to the shark?", "La rémora obtiene comida y transporte. ¿Qué le pasa al tiburón?"),
      bi("The remora benefits and the shark is not affected: commensalism.", "La rémora se beneficia y al tiburón no le afecta: comensalismo."),
    ),
    e(
      bi("Fleas live on a cat, bite its skin, and drink its blood. What is the relationship?", "Las pulgas viven sobre un gato, le pican la piel y le chupan la sangre. ¿Qué relación es?"),
      PARA,
      [PRED, COMM, MUT],
      bi("The fleas live on the cat and harm it without killing it.", "Las pulgas viven sobre el gato y lo perjudican sin matarlo."),
      bi("The fleas benefit and harm their host: parasitism.", "Las pulgas se benefician y perjudican a su huésped: parasitismo."),
    ),
  ],
};

// ── s.plate.tectonics ───────────────────────────────────────────────────────────────────────────

const CONV = bi("Convergent boundary", "Límite convergente");
const DIV = bi("Divergent boundary", "Límite divergente");
const TRANS = bi("Transform boundary", "Límite transformante");
const RIFT = bi("A rift valley", "Un valle de rift");
const RIDGE = bi("A mid-ocean ridge", "Una dorsal oceánica");

const PLATES: Bank = {
  nudge: bi("Which way are the plates moving: together, apart, or sliding past each other?", "¿Hacia dónde se mueven las placas: se juntan, se separan o se deslizan una junto a la otra?"),
  strategy: bi(
    "Plates that push together build mountains, or one sinks and makes a trench and volcanoes. Plates that pull apart open rifts and make new crust. Plates that slide past each other cause earthquakes along faults.",
    "Las placas que se empujan forman montañas, o una se hunde y forma una fosa y volcanes. Las placas que se separan abren valles de rift y forman corteza nueva. Las placas que se deslizan una junto a la otra causan sismos a lo largo de fallas.",
  ),
  seconds: 25,
  items: [
    e(
      bi("Two plates move toward each other. What kind of boundary is this?", "Dos placas se mueven una hacia la otra. ¿Qué tipo de límite es?"),
      CONV,
      [DIV, TRANS],
      bi("Converge means to come together.", "Converger significa juntarse."),
      bi("Plates moving toward each other meet at a convergent boundary.", "Las placas que se mueven una hacia la otra se encuentran en un límite convergente."),
    ),
    e(
      bi("Two plates move away from each other. What kind of boundary is this?", "Dos placas se alejan una de la otra. ¿Qué tipo de límite es?"),
      DIV,
      [CONV, TRANS],
      bi("Diverge means to split apart.", "Divergir significa separarse."),
      bi("Plates moving apart form a divergent boundary.", "Las placas que se separan forman un límite divergente."),
    ),
    e(
      bi("Two plates slide past each other sideways. What kind of boundary is this?", "Dos placas se deslizan de lado una junto a la otra. ¿Qué tipo de límite es?"),
      TRANS,
      [CONV, DIV],
      bi("The plates neither crash together nor pull apart.", "Las placas no chocan ni se separan."),
      bi("Plates sliding past each other meet at a transform boundary.", "Las placas que se deslizan una junto a la otra forman un límite transformante."),
    ),
    e(
      bi(
        "The Himalayas, the tallest mountains on Earth, formed where two continental plates collide. Which kind of boundary formed them?",
        "El Himalaya, las montañas más altas de la Tierra, se formó donde chocan dos placas continentales. ¿Qué tipo de límite lo formó?",
      ),
      CONV,
      [DIV, TRANS],
      bi("Collide means to push into each other.", "Chocar significa empujarse una contra la otra."),
      bi("The Indian and Eurasian plates push together at a convergent boundary, folding rock into mountains.", "Las placas Índica y Euroasiática se empujan en un límite convergente y pliegan la roca en montañas."),
    ),
    e(
      bi(
        "Along the Mid-Atlantic Ridge, new ocean floor forms as magma rises between two plates. Which kind of boundary is this?",
        "En la dorsal mesoatlántica se forma nuevo fondo oceánico cuando el magma sube entre dos placas. ¿Qué tipo de límite es?",
      ),
      DIV,
      [CONV, TRANS],
      bi("Something has to make room for the new ocean floor.", "Algo tiene que dejar espacio para el nuevo fondo oceánico."),
      bi("The plates spread apart and magma fills the gap: a divergent boundary.", "Las placas se separan y el magma llena el hueco: un límite divergente."),
    ),
    e(
      bi(
        "The San Andreas Fault in California is where two plates grind past each other, causing many earthquakes. Which kind of boundary is it?",
        "La falla de San Andrés, en California, es donde dos placas se rozan al pasar una junto a la otra y causan muchos sismos. ¿Qué tipo de límite es?",
      ),
      TRANS,
      [CONV, DIV],
      bi("The plates move side by side, in opposite directions.", "Las placas se mueven lado a lado, en direcciones opuestas."),
      bi("The Pacific and North American plates slide past each other at a transform boundary.", "Las placas del Pacífico y Norteamericana se deslizan una junto a la otra en un límite transformante."),
    ),
    e(
      bi(
        "The East African Rift is a long valley where a continent is slowly splitting apart. Which kind of boundary is forming there?",
        "El Rift de África Oriental es un valle largo donde un continente se está separando poco a poco. ¿Qué tipo de límite se está formando allí?",
      ),
      DIV,
      [CONV, TRANS],
      bi("Splitting apart means the two sides move away from each other.", "Separarse significa que los dos lados se alejan uno del otro."),
      bi("A rift valley forms where plates pull apart: a divergent boundary.", "Un valle de rift se forma donde las placas se separan: un límite divergente."),
    ),
    e(
      bi("What landform usually forms where two continental plates push into each other?", "¿Qué relieve se forma normalmente donde dos placas continentales se empujan una contra la otra?"),
      bi("Tall mountain ranges", "Cordilleras altas"),
      [RIFT, RIDGE],
      bi("Neither plate sinks easily, so the rock crumples upward.", "Ninguna placa se hunde con facilidad, así que la roca se pliega hacia arriba."),
      bi("Colliding continents fold and push rock up into tall mountain ranges, like the Himalayas.", "Los continentes que chocan pliegan y levantan la roca en cordilleras altas, como el Himalaya."),
    ),
    e(
      bi("What landform forms where two plates pull apart on land?", "¿Qué relieve se forma donde dos placas se separan en tierra firme?"),
      RIFT,
      [bi("Tall folded mountains", "Montañas altas plegadas"), bi("A deep ocean trench", "Una fosa oceánica profunda")],
      bi("When the ground stretches, the middle drops down.", "Cuando el terreno se estira, la parte de en medio se hunde."),
      bi("As the plates pull apart, a block of land sinks between them and forms a rift valley.", "Al separarse las placas, un bloque de tierra se hunde entre ellas y forma un valle de rift."),
    ),
    e(
      bi("An ocean plate sinks beneath a continental plate. What forms there?", "Una placa oceánica se hunde debajo de una placa continental. ¿Qué se forma allí?"),
      bi("A deep trench and a chain of volcanoes", "Una fosa profunda y una cadena de volcanes"),
      [RIFT, RIDGE],
      bi("As the plate sinks, rock deep underground melts and the magma rises.", "Al hundirse la placa, roca en las profundidades se funde y el magma sube."),
      bi("A trench forms where the ocean plate bends down, and rising magma builds volcanoes, like the Andes.", "Se forma una fosa donde la placa oceánica se dobla hacia abajo, y el magma que sube forma volcanes, como en los Andes."),
    ),
    e(
      bi("What is it called when one plate sinks beneath another into the mantle?", "¿Cómo se llama el proceso en que una placa se hunde debajo de otra hacia el manto?"),
      bi("Subduction", "Subducción"),
      [bi("Sea-floor spreading", "Expansión del fondo oceánico"), bi("Erosion", "Erosión")],
      bi("The word starts with sub-, which means under.", "La palabra empieza con sub-, que significa debajo."),
      bi("One plate diving under another is subduction. It happens at convergent boundaries.", "Que una placa se meta debajo de otra es la subducción. Ocurre en los límites convergentes."),
    ),
    e(
      bi("At which kind of boundary is new crust made?", "¿En qué tipo de límite se forma corteza nueva?"),
      DIV,
      [CONV, TRANS],
      bi("Magma rises to fill a gap between the plates.", "El magma sube para llenar un hueco entre las placas."),
      bi("Where plates pull apart, magma cools into new crust: a divergent boundary.", "Donde las placas se separan, el magma se enfría y forma corteza nueva: un límite divergente."),
    ),
    e(
      bi("At which kind of boundary is crust neither made nor destroyed?", "¿En qué tipo de límite la corteza no se forma ni se destruye?"),
      TRANS,
      [CONV, DIV],
      bi("The plates only scrape past each other.", "Las placas solo se rozan al pasar."),
      bi("At a transform boundary the plates slide past each other, so no crust is made or lost.", "En un límite transformante las placas se deslizan una junto a la otra, así que no se forma ni se pierde corteza."),
    ),
    e(
      bi(
        "Iceland sits on the Mid-Atlantic Ridge. It has many volcanoes and long cracks in the ground that slowly get wider. Which kind of boundary runs through Iceland?",
        "Islandia está sobre la dorsal mesoatlántica. Tiene muchos volcanes y grietas largas en el suelo que poco a poco se ensanchan. ¿Qué tipo de límite atraviesa Islandia?",
      ),
      DIV,
      [CONV, TRANS],
      bi("Cracks that get wider show the ground is being pulled.", "Las grietas que se ensanchan muestran que el suelo se está estirando."),
      bi("The North American and Eurasian plates pull apart through Iceland: a divergent boundary.", "Las placas Norteamericana y Euroasiática se separan a través de Islandia: un límite divergente."),
    ),
    e(
      bi(
        "The Andes Mountains have many volcanoes, formed where an ocean plate sinks under South America. Which kind of boundary is this?",
        "La cordillera de los Andes tiene muchos volcanes, formados donde una placa oceánica se hunde debajo de América del Sur. ¿Qué tipo de límite es?",
      ),
      CONV,
      [DIV, TRANS],
      bi("For one plate to sink under another, which way must they move?", "Para que una placa se hunda debajo de otra, ¿hacia dónde deben moverse?"),
      bi("The Nazca Plate moves toward South America and sinks beneath it: a convergent boundary.", "La placa de Nazca avanza hacia América del Sur y se hunde debajo de ella: un límite convergente."),
    ),
    e(
      bi("Why do earthquakes happen along plate boundaries?", "¿Por qué ocurren sismos a lo largo de los límites de placas?"),
      bi("The plates get stuck, then suddenly slip", "Las placas se atascan y de repente se deslizan"),
      [bi("The plates melt and collapse", "Las placas se derriten y se derrumban"), bi("Ocean waves push on the plates", "Las olas del mar empujan las placas")],
      bi("Think of pushing a heavy box that sticks, then jerks forward.", "Piensa en empujar una caja pesada que se atora y de pronto avanza de golpe."),
      bi("Friction locks the plate edges while stress builds. When the rock gives way, the sudden slip is an earthquake.", "La fricción traba los bordes de las placas mientras se acumula tensión. Cuando la roca cede, el deslizamiento repentino es un sismo."),
    ),
    e(
      bi(
        "Japan has active volcanoes and a deep ocean trench just offshore. What kind of boundary is near Japan?",
        "Japón tiene volcanes activos y una fosa oceánica profunda cerca de la costa. ¿Qué tipo de límite hay cerca de Japón?",
      ),
      CONV,
      [DIV, TRANS],
      bi("Trenches form where one plate dives under another.", "Las fosas se forman donde una placa se mete debajo de otra."),
      bi("An ocean plate sinks under Japan, making the trench and the volcanoes: a convergent boundary.", "Una placa oceánica se hunde debajo de Japón y forma la fosa y los volcanes: un límite convergente."),
    ),
  ],
};

// ── s.chem.phys ─────────────────────────────────────────────────────────────────────────────────

const CHEM = bi("Chemical change", "Cambio químico");
const PHYS = bi("Physical change", "Cambio físico");
const cp = (en: string, es: string) => bi(`${en} Chemical or physical change?`, `${es} ¿Cambio químico o físico?`);

const CHEM_PHYS: Bank = {
  nudge: bi("Is a new substance made, or is it the same substance in a new form?", "¿Se forma una sustancia nueva o es la misma sustancia con otra forma?"),
  strategy: bi(
    "Signs of a new substance: gas bubbles, a new color, a solid forming when liquids mix, light, heat, or a new smell. Melting, freezing, boiling, dissolving, cutting, and bending only change form.",
    "Señales de una sustancia nueva: burbujas de gas, un color nuevo, un sólido que aparece al mezclar líquidos, luz, calor o un olor nuevo. Derretir, congelar, hervir, disolver, cortar y doblar solo cambian la forma.",
  ),
  seconds: 20,
  items: [
    e(
      cp("Ice melts into liquid water.", "El hielo se derrite y se vuelve agua líquida."),
      PHYS,
      [CHEM],
      bi("Is it still water after it melts?", "¿Sigue siendo agua después de derretirse?"),
      bi("Melted ice is still water, just in a different state: a physical change.", "El hielo derretido sigue siendo agua, solo que en otro estado: un cambio físico."),
    ),
    e(
      cp("Wood burns in a campfire, leaving ash and smoke.", "La leña se quema en una fogata y deja ceniza y humo."),
      CHEM,
      [PHYS],
      bi("Can the ash and smoke be turned back into wood?", "¿Se pueden volver a convertir la ceniza y el humo en madera?"),
      bi("Burning makes new substances and gives off heat and light: a chemical change.", "Al quemarse se forman sustancias nuevas y se desprenden calor y luz: un cambio químico."),
    ),
    e(
      cp("An iron nail left out in the rain becomes covered in reddish-brown rust.", "Un clavo de hierro que se queda afuera bajo la lluvia se cubre de óxido café rojizo."),
      CHEM,
      [PHYS],
      bi("Is rust the same substance as shiny iron?", "¿El óxido es la misma sustancia que el hierro brillante?"),
      bi("Iron reacts with oxygen and water to form rust, a new substance: a chemical change.", "El hierro reacciona con el oxígeno y el agua y forma óxido, una sustancia nueva: un cambio químico."),
    ),
    e(
      cp("Sugar dissolves when it is stirred into tea.", "El azúcar se disuelve al mezclarla en el té."),
      PHYS,
      [CHEM],
      bi("Does the tea still taste sweet? The sugar is still there.", "¿El té sigue sabiendo dulce? El azúcar sigue ahí."),
      bi("Dissolved sugar is still sugar, spread through the tea: a physical change.", "El azúcar disuelta sigue siendo azúcar, repartida en el té: un cambio físico."),
    ),
    e(
      cp("Baking soda and vinegar are mixed, and the mixture fizzes with bubbles of gas.", "Se mezclan bicarbonato de sodio y vinagre, y la mezcla hace burbujas de gas."),
      CHEM,
      [PHYS],
      bi("Where did the gas come from?", "¿De dónde salió el gas?"),
      bi("A new gas, carbon dioxide, forms: a chemical change.", "Se forma un gas nuevo, el dióxido de carbono: un cambio químico."),
    ),
    e(
      cp("A sheet of paper is cut into small pieces.", "Una hoja de papel se corta en pedacitos."),
      PHYS,
      [CHEM],
      bi("Is each little piece still paper?", "¿Cada pedacito sigue siendo papel?"),
      bi("The pieces are still paper, only smaller: a physical change.", "Los pedacitos siguen siendo papel, solo que más pequeños: un cambio físico."),
    ),
    e(
      cp("Cake batter bakes into a fluffy cake in the oven.", "La mezcla para pastel se hornea y se convierte en un pastel esponjoso."),
      CHEM,
      [PHYS],
      bi("Can the baked cake be turned back into batter?", "¿Se puede volver a convertir el pastel horneado en mezcla?"),
      bi("Heat makes new substances and gas bubbles in the batter: a chemical change.", "El calor forma sustancias nuevas y burbujas de gas en la mezcla: un cambio químico."),
    ),
    e(
      cp("Water boils and turns into steam.", "El agua hierve y se convierte en vapor."),
      PHYS,
      [CHEM],
      bi("If the steam cools, what does it turn back into?", "Si el vapor se enfría, ¿en qué se convierte otra vez?"),
      bi("Steam is water as a gas, so this is a change of state: a physical change.", "El vapor es agua en estado gaseoso, así que es un cambio de estado: un cambio físico."),
    ),
    e(
      cp("A slice of apple turns brown after sitting out in the air.", "Una rebanada de manzana se pone café después de quedar expuesta al aire."),
      CHEM,
      [PHYS],
      bi("Did the apple only change shape, or did something in it react with the air?", "¿La manzana solo cambió de forma, o algo en ella reaccionó con el aire?"),
      bi("Substances in the apple react with oxygen and form new brown substances: a chemical change.", "Sustancias de la manzana reaccionan con el oxígeno y forman sustancias nuevas de color café: un cambio químico."),
    ),
    e(
      cp("Milk left out too long turns sour and smells bad.", "La leche que se deja fuera mucho tiempo se agria y huele mal."),
      CHEM,
      [PHYS],
      bi("What does a new smell tell you?", "¿Qué te indica un olor nuevo?"),
      bi("Bacteria turn substances in the milk into new ones, such as acids: a chemical change.", "Las bacterias convierten sustancias de la leche en otras nuevas, como ácidos: un cambio químico."),
    ),
    e(
      cp("A glass bottle falls and shatters into pieces.", "Una botella de vidrio se cae y se rompe en pedazos."),
      PHYS,
      [CHEM],
      bi("Are the pieces still glass?", "¿Los pedazos siguen siendo vidrio?"),
      bi("Broken glass is still glass: a physical change.", "El vidrio roto sigue siendo vidrio: un cambio físico."),
    ),
    e(
      cp("Butter melts in a hot pan.", "La mantequilla se derrite en una sartén caliente."),
      PHYS,
      [CHEM],
      bi("If it cools, does it become solid butter again?", "Si se enfría, ¿vuelve a ser mantequilla sólida?"),
      bi("Melting is a change of state, so it is a physical change.", "Derretirse es un cambio de estado, así que es un cambio físico."),
    ),
    e(
      bi("Which is a sign that a chemical change has happened?", "¿Cuál es una señal de que ocurrió un cambio químico?"),
      bi("Bubbles of a new gas form when two liquids are mixed", "Se forman burbujas de un gas nuevo al mezclar dos líquidos"),
      [bi("A solid melts into a liquid", "Un sólido se derrite y se vuelve líquido"), bi("A piece of clay is bent into a new shape", "Un trozo de plastilina se dobla en otra forma"), bi("Salt dissolves in water", "La sal se disuelve en agua")],
      bi("Which choice makes something that was not there before?", "¿Qué opción produce algo que no estaba antes?"),
      bi("A new gas means a new substance formed. The other choices only change form or state.", "Un gas nuevo significa que se formó una sustancia nueva. Las otras opciones solo cambian la forma o el estado."),
    ),
    e(
      bi("Which change does NOT make a new substance?", "¿Qué cambio NO produce una sustancia nueva?"),
      bi("A puddle evaporates on a sunny day", "Un charco se evapora en un día soleado"),
      [bi("Fireworks explode with light and heat", "Unos fuegos artificiales estallan con luz y calor"), bi("Bread turns black in the toaster", "El pan se pone negro en el tostador"), bi("A copper roof slowly turns green", "Un techo de cobre se pone verde poco a poco")],
      bi("Which one is only a change of state?", "¿Cuál es solo un cambio de estado?"),
      bi("Evaporated water is still water, now as a gas. The other changes make new substances.", "El agua evaporada sigue siendo agua, ahora en estado gaseoso. Los otros cambios producen sustancias nuevas."),
    ),
    e(
      cp("Two clear liquids are mixed, and a cloudy yellow solid suddenly appears.", "Se mezclan dos líquidos transparentes y de repente aparece un sólido amarillo turbio."),
      CHEM,
      [PHYS],
      bi("A solid appeared where there were only liquids.", "Apareció un sólido donde solo había líquidos."),
      bi("A new solid, called a precipitate, formed from the liquids: a chemical change.", "Se formó un sólido nuevo, llamado precipitado, a partir de los líquidos: un cambio químico."),
    ),
    e(
      cp("You bend a glow stick, the liquids inside mix, and it starts to glow.", "Doblas una barra luminosa, los líquidos de adentro se mezclan y empieza a brillar."),
      CHEM,
      [PHYS],
      bi("Where does the light come from?", "¿De dónde sale la luz?"),
      bi("The mixed chemicals react and give off light: a chemical change.", "Las sustancias mezcladas reaccionan y desprenden luz: un cambio químico."),
    ),
    e(
      cp("Mixing blue paint and yellow paint makes green paint.", "Mezclar pintura azul y pintura amarilla da pintura verde."),
      PHYS,
      [CHEM],
      bi("The blue and yellow pigments are still there, just mixed together.", "Los pigmentos azul y amarillo siguen ahí, solo que mezclados."),
      bi("No new substance forms; the pigments are only mixed. A color change alone does not prove a chemical change.", "No se forma una sustancia nueva; los pigmentos solo se mezclan. Un cambio de color por sí solo no prueba un cambio químico."),
    ),
    e(
      cp("A hand-warmer packet heats up when the iron powder inside reacts with oxygen from the air.", "Un calentador de manos se calienta cuando el polvo de hierro de adentro reacciona con el oxígeno del aire."),
      CHEM,
      [PHYS],
      bi("What is the iron powder turning into?", "¿En qué se está convirtiendo el polvo de hierro?"),
      bi("Iron and oxygen form iron oxide, a new substance, and release heat: a chemical change.", "El hierro y el oxígeno forman óxido de hierro, una sustancia nueva, y desprenden calor: un cambio químico."),
    ),
    e(
      cp("A piece of chocolate melts in your hand.", "Un trozo de chocolate se derrite en tu mano."),
      PHYS,
      [CHEM],
      bi("Put it in the fridge. What happens?", "Ponlo en el refrigerador. ¿Qué pasa?"),
      bi("Melted chocolate is still chocolate and hardens again when cooled: a physical change.", "El chocolate derretido sigue siendo chocolate y se endurece otra vez al enfriarse: un cambio físico."),
    ),
  ],
};

// ── s.newton.laws ───────────────────────────────────────────────────────────────────────────────

const LAW1 = bi("Newton's first law (inertia)", "Primera ley de Newton (inercia)");
const LAW2 = bi("Newton's second law (F = ma)", "Segunda ley de Newton (F = ma)");
const LAW3 = bi("Newton's third law (action and reaction)", "Tercera ley de Newton (acción y reacción)");
const law = (en: string, es: string) => bi(`${en} Which law explains this?`, `${es} ¿Qué ley lo explica?`);

const NEWTON_LAWS: Bank = {
  nudge: bi(
    "Is something resisting a change in its motion, speeding up because of a force, or pushing back on something?",
    "¿Algo se resiste a cambiar su movimiento, acelera por una fuerza o empuja de vuelta a otra cosa?",
  ),
  strategy: bi(
    "First law: an object keeps doing what it is doing unless a net force acts on it. Second law: more force or less mass means more acceleration. Third law: every push comes with an equal push back in the opposite direction.",
    "Primera ley: un objeto sigue haciendo lo que hace a menos que una fuerza neta actúe sobre él. Segunda ley: más fuerza o menos masa significan más aceleración. Tercera ley: todo empujón viene con otro igual en sentido contrario.",
  ),
  seconds: 25,
  items: [
    e(
      law("A car stops suddenly, and the passengers keep moving forward against their seat belts.", "Un auto frena de golpe y los pasajeros siguen moviéndose hacia adelante contra el cinturón."),
      LAW1,
      [LAW2, LAW3],
      bi("The passengers were already moving. What do moving things tend to do?", "Los pasajeros ya se movían. ¿Qué tienden a hacer las cosas que se mueven?"),
      bi("The passengers' bodies keep moving forward until the belts apply a force: inertia, the first law.", "El cuerpo de los pasajeros sigue hacia adelante hasta que el cinturón aplica una fuerza: inercia, la primera ley."),
    ),
    e(
      law("A rocket pushes hot gas down out of its engines, and the gas pushes the rocket up.", "Un cohete empuja gases calientes hacia abajo por sus motores, y los gases empujan el cohete hacia arriba."),
      LAW3,
      [LAW1, LAW2],
      bi("Look for two forces between the same two objects, in opposite directions.", "Busca dos fuerzas entre los mismos dos objetos, en direcciones opuestas."),
      bi("The rocket pushes the gas and the gas pushes back equally on the rocket: the third law.", "El cohete empuja los gases y los gases empujan igual de vuelta al cohete: la tercera ley."),
    ),
    e(
      law("The same push makes an empty shopping cart speed up more than a full one.", "El mismo empujón hace que un carrito de compras vacío acelere más que uno lleno."),
      LAW2,
      [LAW1, LAW3],
      bi("Same force, different mass. What happens to the acceleration?", "Misma fuerza, distinta masa. ¿Qué pasa con la aceleración?"),
      bi("With the same force, less mass gives more acceleration: the second law.", "Con la misma fuerza, menos masa da más aceleración: la segunda ley."),
    ),
    e(
      law("A soccer ball sits still on the grass until a player kicks it.", "Un balón de fútbol se queda quieto en el pasto hasta que un jugador lo patea."),
      LAW1,
      [LAW2, LAW3],
      bi("Without a force, does a resting ball start moving on its own?", "Sin una fuerza, ¿un balón en reposo empieza a moverse solo?"),
      bi("An object at rest stays at rest until a net force acts: the first law.", "Un objeto en reposo sigue en reposo hasta que actúa una fuerza neta: la primera ley."),
    ),
    e(
      law("You jump from a small boat onto a dock, and the boat moves backward.", "Saltas de un bote pequeño a un muelle y el bote se mueve hacia atrás."),
      LAW3,
      [LAW1, LAW2],
      bi("Your feet push the boat one way. Which way does the boat push you?", "Tus pies empujan el bote hacia un lado. ¿Hacia dónde te empuja el bote a ti?"),
      bi("You push the boat backward and the boat pushes you forward: the third law.", "Tú empujas el bote hacia atrás y el bote te empuja hacia adelante: la tercera ley."),
    ),
    e(
      law("Kicking a ball harder makes it speed up more.", "Patear un balón más fuerte hace que acelere más."),
      LAW2,
      [LAW1, LAW3],
      bi("Same ball, more force. What changes?", "Mismo balón, más fuerza. ¿Qué cambia?"),
      bi("More force on the same mass gives more acceleration: the second law.", "Más fuerza sobre la misma masa da más aceleración: la segunda ley."),
    ),
    e(
      law("A hockey puck slides a long way across smooth ice before it slows down.", "Un disco de hockey se desliza un buen tramo sobre el hielo liso antes de frenar."),
      LAW1,
      [LAW2, LAW3],
      bi("Smooth ice means very little friction acts on the puck.", "El hielo liso significa que casi no hay fricción sobre el disco."),
      bi("With almost no force to stop it, the puck keeps moving: the first law.", "Casi sin fuerza que lo detenga, el disco sigue moviéndose: la primera ley."),
    ),
    e(
      law("A swimmer pushes backward on the pool wall and glides forward.", "Una nadadora empuja hacia atrás la pared de la alberca y se desliza hacia adelante."),
      LAW3,
      [LAW1, LAW2],
      bi("The swimmer pushes on the wall. What does the wall do to the swimmer?", "La nadadora empuja la pared. ¿Qué le hace la pared a ella?"),
      bi("The wall pushes the swimmer forward as hard as she pushes it backward: the third law.", "La pared empuja a la nadadora hacia adelante con la misma fuerza con que ella la empuja hacia atrás: la tercera ley."),
    ),
    e(
      law("A tablecloth is yanked out quickly, and the dishes on it stay in place.", "Se jala rápido un mantel y los platos que están encima se quedan en su lugar."),
      LAW1,
      [LAW2, LAW3],
      bi("The dishes were at rest. How long did the force act on them?", "Los platos estaban en reposo. ¿Cuánto tiempo actuó la fuerza sobre ellos?"),
      bi("The dishes tend to stay at rest, and the quick pull barely moves them: inertia, the first law.", "Los platos tienden a seguir en reposo, y el jalón rápido casi no los mueve: inercia, la primera ley."),
    ),
    e(
      law("A loaded truck needs a much bigger force than a small car to speed up at the same rate.", "Un camión cargado necesita una fuerza mucho mayor que un auto pequeño para acelerar igual."),
      LAW2,
      [LAW1, LAW3],
      bi("Compare the masses. What must happen to the force?", "Compara las masas. ¿Qué debe pasar con la fuerza?"),
      bi("Force equals mass times acceleration, so more mass needs more force for the same acceleration: the second law.", "La fuerza es igual a la masa por la aceleración, así que más masa necesita más fuerza para la misma aceleración: la segunda ley."),
    ),
    e(
      law("When you lean on a wall, the wall pushes back on you with the same force.", "Cuando te recargas en una pared, la pared te empuja de vuelta con la misma fuerza."),
      LAW3,
      [LAW1, LAW2],
      bi("Who is pushing on whom?", "¿Quién empuja a quién?"),
      bi("You push the wall and the wall pushes you equally in the opposite direction: the third law.", "Tú empujas la pared y la pared te empuja igual en sentido contrario: la tercera ley."),
    ),
    e(
      law("Seat belts stop riders from flying forward when a car brakes hard.", "Los cinturones de seguridad evitan que los pasajeros salgan hacia adelante cuando el auto frena fuerte."),
      LAW1,
      [LAW2, LAW3],
      bi("When the car slows, what keeps a rider's body moving?", "Cuando el auto frena, ¿qué hace que el cuerpo del pasajero siga moviéndose?"),
      bi("A moving body keeps moving unless a force stops it, so the belt supplies that force: the first law.", "Un cuerpo en movimiento sigue moviéndose a menos que una fuerza lo detenga, y el cinturón da esa fuerza: la primera ley."),
    ),
    e(
      law("Air rushes out of an untied balloon, and the balloon zooms the other way.", "El aire sale de golpe de un globo sin amarrar y el globo sale disparado hacia el otro lado."),
      LAW3,
      [LAW1, LAW2],
      bi("The balloon pushes the air out. What does the air do to the balloon?", "El globo empuja el aire hacia afuera. ¿Qué le hace el aire al globo?"),
      bi("The balloon pushes air one way and the air pushes the balloon the other way: the third law.", "El globo empuja el aire hacia un lado y el aire empuja el globo hacia el otro: la tercera ley."),
    ),
    e(
      law("Two identical balls are kicked. The ball kicked with twice the force gets twice the acceleration.", "Se patean dos balones iguales. El que recibe el doble de fuerza tiene el doble de aceleración."),
      LAW2,
      [LAW1, LAW3],
      bi("How are force and acceleration related here?", "¿Cómo se relacionan aquí la fuerza y la aceleración?"),
      bi("For the same mass, acceleration grows in step with force: the second law.", "Para la misma masa, la aceleración crece al mismo ritmo que la fuerza: la segunda ley."),
    ),
    e(
      law("The same throw makes a tennis ball speed up much more than a bowling ball.", "El mismo lanzamiento hace que una pelota de tenis acelere mucho más que una bola de boliche."),
      LAW2,
      [LAW1, LAW3],
      bi("Same force, very different masses.", "Misma fuerza, masas muy distintas."),
      bi("The lighter ball gets more acceleration from the same force: the second law.", "La pelota más ligera recibe más aceleración con la misma fuerza: la segunda ley."),
    ),
    e(
      law("Water sprays forward out of a garden hose, and the hose pushes back on your hands.", "El agua sale disparada hacia adelante de una manguera y la manguera empuja tus manos hacia atrás."),
      LAW3,
      [LAW1, LAW2],
      bi("The hose pushes the water out. What does the water push on?", "La manguera empuja el agua hacia afuera. ¿Qué empuja el agua?"),
      bi("The hose pushes water forward and the water pushes the hose back: the third law.", "La manguera empuja el agua hacia adelante y el agua empuja la manguera hacia atrás: la tercera ley."),
    ),
    e(
      law(
        "A ball rolling across a gym floor slowly stops because of friction. Without friction or any other force, it would keep rolling.",
        "Una pelota que rueda por el piso del gimnasio se detiene poco a poco por la fricción. Sin fricción ni otra fuerza, seguiría rodando.",
      ),
      LAW1,
      [LAW2, LAW3],
      bi("Friction is the force that changes the ball's motion here.", "Aquí la fricción es la fuerza que cambia el movimiento de la pelota."),
      bi("An object keeps moving at the same speed unless a net force acts on it: the first law.", "Un objeto sigue moviéndose con la misma rapidez a menos que actúe una fuerza neta: la primera ley."),
    ),
  ],
};

/** The hand-written banks, by skill id, one per level (exported for the bank checks in the test). */
export const SCIENCE_6_9_BANKS: Record<string, Bank[]> = {
  "s.cells": [CELLS_PARTS, CELLS_TYPES],
  "s.variables": [VARIABLES_ID, VARIABLES_FAIR],
  "s.ecosystems": [ECOSYSTEMS],
  "s.plate.tectonics": [PLATES],
  "s.chem.phys": [CHEM_PHYS],
  "s.newton.laws": [NEWTON_LAWS],
};

const fromBank = (id: string) => (r: Rng, level: number, locale: Locale) => bankItem(r, SCIENCE_6_9_BANKS[id][level - 1], locale);

// ── Numbers and units for the computed skills ───────────────────────────────────────────────────

/** A count of tenths shown as a decimal: 35 → "3.5", 40 → "4". Integer math only. */
const dec = (tenths: number) => (tenths % 10 === 0 ? String(tenths / 10) : `${Math.floor(tenths / 10)}.${tenths % 10}`);

/** `sym` is shown on screen and `word` is read aloud, as [singular, plural]; `one` names one unit of time ("one hour"). */
type Unit = { sym: Bi; word: [Bi, Bi]; one?: Bi };
const unit = (sym: string, en: [string, string], es: [string, string], symEs = sym, one?: Bi): Unit => ({
  sym: bi(sym, symEs),
  word: [bi(en[0], es[0]), bi(en[1], es[1])],
  one,
});
const KM = unit("km", ["kilometer", "kilometers"], ["kilómetro", "kilómetros"]);
const M = unit("m", ["meter", "meters"], ["metro", "metros"]);
const CM = unit("cm", ["centimeter", "centimeters"], ["centímetro", "centímetros"]);
const MI = unit("mi", ["mile", "miles"], ["milla", "millas"]);
const HOURS = unit("hours", ["hour", "hours"], ["hora", "horas"], "horas", bi("one hour", "una hora"));
const SECONDS = unit("seconds", ["second", "seconds"], ["segundo", "segundos"], "segundos", bi("one second", "un segundo"));
const MINUTES = unit("minutes", ["minute", "minutes"], ["minuto", "minutos"], "minutos", bi("one minute", "un minuto"));
const KMH = unit("km/h", ["kilometer per hour", "kilometers per hour"], ["kilómetro por hora", "kilómetros por hora"]);
const MPS = unit("m/s", ["meter per second", "meters per second"], ["metro por segundo", "metros por segundo"]);
const MPH = unit("mph", ["mile per hour", "miles per hour"], ["milla por hora", "millas por hora"], "mi/h");
const CMMIN = unit("cm/min", ["centimeter per minute", "centimeters per minute"], ["centímetro por minuto", "centímetros por minuto"]);
const MMIN = unit("m/min", ["meter per minute", "meters per minute"], ["metro por minuto", "metros por minuto"]);
const GRAMS = unit("g", ["gram", "grams"], ["gramo", "gramos"]);
const CM3 = unit("cm³", ["cubic centimeter", "cubic centimeters"], ["centímetro cúbico", "centímetros cúbicos"]);
const GCM3 = unit("g/cm³", ["gram per cubic centimeter", "grams per cubic centimeter"], ["gramo por centímetro cúbico", "gramos por centímetro cúbico"]);
const KG = unit("kg", ["kilogram", "kilograms"], ["kilogramo", "kilogramos"]);
const MS2 = unit("m/s²", ["meter per second squared", "meters per second squared"], ["metro por segundo al cuadrado", "metros por segundo al cuadrado"]);
const NEWTONS = unit("N", ["newton", "newtons"], ["newton", "newtons"]);

/** "36 km" on screen, "36 kilometers" read aloud ("1 kilogram", not "1 kilograms"). */
const qty = (tenths: number, u: Unit, locale: Locale, spoken: boolean) =>
  `${dec(tenths)} ${(spoken ? u.word[tenths === 10 ? 0 : 1] : u.sym)[locale]}`;
const uname = (u: Unit, locale: Locale, spoken: boolean) => (spoken ? u.word[1] : u.sym)[locale];

const NAMES = ["Aiko", "Diego", "Kwame", "Priya", "Luis", "Noah", "Mei", "Omar", "Jamal", "Ana", "Tariq", "Lena", "Ravi", "Camila", "Elena", "Mateo"];

// ── s.speed ─────────────────────────────────────────────────────────────────────────────────────

/** `who` is a thing ("A train"); without it the mover is a person with a name. Ranges are whole numbers. */
type Mover = { who?: Bi; the?: Bi; cover: Bi; move: Bi; d: Unit; t: Unit; v: Unit; speed: [number, number]; time: [number, number]; fine: boolean };
const MOVERS: Mover[] = [
  { cover: bi("bikes", "recorre en bicicleta"), move: bi("bikes", "va en bicicleta"), d: KM, t: HOURS, v: KMH, speed: [8, 24], time: [2, 5], fine: false },
  { cover: bi("runs", "corre"), move: bi("runs", "corre"), d: M, t: SECONDS, v: MPS, speed: [3, 8], time: [10, 40], fine: true },
  { cover: bi("swims", "nada"), move: bi("swims", "nada"), d: M, t: MINUTES, v: MMIN, speed: [20, 60], time: [2, 10], fine: false },
  { who: bi("A train", "Un tren"), the: bi("the train", "el tren"), cover: bi("travels", "recorre"), move: bi("travels", "viaja"), d: KM, t: HOURS, v: KMH, speed: [60, 140], time: [2, 5], fine: false },
  { who: bi("A snail", "Un caracol"), the: bi("the snail", "el caracol"), cover: bi("crawls", "recorre"), move: bi("crawls", "avanza"), d: CM, t: MINUTES, v: CMMIN, speed: [2, 9], time: [3, 12], fine: true },
  { who: bi("A car", "Un auto"), the: bi("the car", "el auto"), cover: bi("travels", "recorre"), move: bi("travels", "viaja"), d: MI, t: HOURS, v: MPH, speed: [30, 65], time: [2, 6], fine: false },
  { who: bi("A drone", "Un dron"), the: bi("the drone", "el dron"), cover: bi("flies", "vuela"), move: bi("flies", "vuela"), d: M, t: SECONDS, v: MPS, speed: [4, 15], time: [5, 30], fine: true },
];

/** A speed in tenths: whole most of the time, otherwise one decimal (any tenth for slow movers, .5 for fast). */
function pickSpeed(r: Rng, m: Mover): number {
  const [lo, hi] = m.speed;
  if (!r.bool(0.35)) return r.int(lo, hi) * 10;
  if (!m.fine) return r.int(lo, hi - 1) * 10 + 5;
  const s = r.int(lo * 10 + 1, hi * 10 - 1);
  return s % 10 === 0 ? s + r.int(1, 9) : s;
}

type MotionKind = "speed" | "distance" | "time";
function motionText(kind: MotionKind, m: Mover, name: string, d10: number, t10: number, s10: number, locale: Locale, spoken: boolean) {
  const Who = m.who ? m.who[locale] : name;
  const the = m.the ? m.the[locale] : name;
  const D = qty(d10, m.d, locale, spoken), T = qty(t10, m.t, locale, spoken), V = qty(s10, m.v, locale, spoken);
  const U = (u: Unit) => uname(u, locale, spoken);
  if (locale === "es") {
    if (kind === "speed") return `${Who} ${m.cover.es} ${D} en ${T}. ¿Cuál es su rapidez promedio, en ${U(m.v)}?`;
    if (kind === "distance") return `${Who} ${m.move.es} a una rapidez promedio de ${V} durante ${T}. ¿Qué distancia recorre, en ${U(m.d)}?`;
    return `${Who} ${m.cover.es} ${D} a una rapidez promedio de ${V}. ¿Cuánto tiempo tarda, en ${U(m.t)}?`;
  }
  if (kind === "speed") return `${Who} ${m.cover.en} ${D} in ${T}. What is ${the}'s average speed, in ${U(m.v)}?`;
  if (kind === "distance") return `${Who} ${m.move.en} at an average speed of ${V} for ${T}. How far does ${the} go, in ${U(m.d)}?`;
  return `${Who} ${m.cover.en} ${D} at an average speed of ${V}. How long does it take, in ${U(m.t)}?`;
}

function speedItem(r: Rng, level: number, locale: Locale): ItemBody {
  const m = r.pick(MOVERS);
  const name = r.pick(NAMES);
  const kind: MotionKind = level === 1 ? "speed" : r.bool() ? "distance" : "time";
  let s10: number, t10: number;
  if (kind === "time") {
    s10 = r.int(m.speed[0], m.speed[1]) * 10;
    t10 = m.t === HOURS ? r.int(m.time[0] * 2, m.time[1] * 2) * 5 : r.int(m.time[0], m.time[1]) * 10;
  } else {
    s10 = pickSpeed(r, m);
    t10 = r.int(m.time[0], m.time[1]) * 10;
  }
  // One of speed and time is whole, so distance in tenths is exact.
  const d10 = (s10 * t10) / 10;
  const [d, t, s] = [dec(d10), dec(t10), dec(s10)];
  const the = m.the ? m.the[locale] : name;
  const dU = m.d.sym[locale], tU = m.t.sym[locale], vU = m.v.sym[locale];
  const one = m.t.one![locale];
  const D = `${d} ${dU}`, T = `${t} ${tU}`;
  const prompt = motionText(kind, m, name, d10, t10, s10, locale, false);
  const say = motionText(kind, m, name, d10, t10, s10, locale, true);
  const base = { prompt: [prompt], say, input: "keypad" as const, keys: ["."] as "."[] };
  if (kind === "speed")
    return {
      ...base,
      answer: { kind: "number", value: s10 / 10 },
      hints: [
        tr(locale, `How far does ${the} go in ${one}?`, `¿Qué distancia recorre en ${one}?`),
        tr(locale, "Divide the distance by the time: speed = distance ÷ time.", "Divide la distancia entre el tiempo: rapidez = distancia ÷ tiempo."),
        tr(locale, `${D} ÷ ${T} gives the speed in ${vU}.`, `${D} ÷ ${T} da la rapidez en ${vU}.`),
      ],
      steps: [tr(locale, "speed = distance ÷ time", "rapidez = distancia ÷ tiempo"), `${d} ÷ ${t} = ${s}`, tr(locale, `Check: ${s} × ${t} = ${d}`, `Comprobación: ${s} × ${t} = ${d}`), `${s} ${vU}`],
      seconds: 30,
    };
  if (kind === "distance")
    return {
      ...base,
      answer: { kind: "number", value: d10 / 10 },
      hints: [
        tr(locale, `In ${one}, ${the} covers ${s} ${dU}. How far in ${T}?`, `En ${one} recorre ${s} ${dU}. ¿Y en ${T}?`),
        tr(locale, "Multiply the speed by the time: distance = speed × time.", "Multiplica la rapidez por el tiempo: distancia = rapidez × tiempo."),
        tr(locale, `${s} × ${t} gives the distance in ${dU}.`, `${s} × ${t} da la distancia en ${dU}.`),
      ],
      steps: [tr(locale, "distance = speed × time", "distancia = rapidez × tiempo"), `${s} × ${t} = ${d}`, `${d} ${dU}`],
      seconds: 35,
    };
  return {
    ...base,
    answer: { kind: "number", value: t10 / 10 },
    hints: [
      tr(locale, `${cap(the)} covers ${s} ${dU} in ${one}. How many ${tU} to cover ${D}?`, `En ${one} recorre ${s} ${dU}. ¿Cuánto tiempo necesita para recorrer ${D}?`),
      tr(locale, "Divide the distance by the speed: time = distance ÷ speed.", "Divide la distancia entre la rapidez: tiempo = distancia ÷ rapidez."),
      tr(locale, `${d} ÷ ${s} gives the time in ${tU}.`, `${d} ÷ ${s} da el tiempo en ${tU}.`),
    ],
    steps: [tr(locale, "time = distance ÷ speed", "tiempo = distancia ÷ rapidez"), `${d} ÷ ${s} = ${t}`, tr(locale, `Check: ${s} × ${t} = ${d}`, `Comprobación: ${s} × ${t} = ${d}`), `${t} ${tU}`],
    seconds: 40,
  };
}

// ── s.density ───────────────────────────────────────────────────────────────────────────────────

/** Real-world samples with believable densities (tenths of g/cm³) and volumes (`vol` × `step` cm³). */
type Sample = { name: Bi; rho: [number, number]; vol: [number, number]; step: number };
const SAMPLES: Sample[] = [
  { name: bi("a wooden block", "un bloque de madera"), rho: [4, 8], vol: [2, 20], step: 10 },
  { name: bi("a plastic toy", "un juguete de plástico"), rho: [11, 14], vol: [10, 80], step: 1 },
  { name: bi("a rock sample", "una muestra de roca"), rho: [22, 30], vol: [10, 60], step: 1 },
  { name: bi("a metal bolt", "un tornillo de metal"), rho: [27, 89], vol: [2, 15], step: 1 },
  { name: bi("an ice cube", "un cubo de hielo"), rho: [9, 9], vol: [10, 30], step: 1 },
  { name: bi("a piece of cork", "un trozo de corcho"), rho: [2, 2], vol: [10, 50], step: 1 },
  { name: bi("a rubber eraser", "una goma de borrar"), rho: [12, 15], vol: [5, 20], step: 1 },
  { name: bi("a glass marble", "una canica de vidrio"), rho: [25, 25], vol: [2, 8], step: 1 },
  { name: bi("a candle", "una vela"), rho: [9, 9], vol: [5, 20], step: 10 },
  { name: bi("an apple", "una manzana"), rho: [7, 8], vol: [15, 25], step: 10 },
];
/** Objects that could plausibly float or sink, so the name gives nothing away. */
const UNKNOWNS: Bi[] = [
  bi("a sealed jar", "un frasco cerrado"),
  bi("a mystery block", "un bloque misterioso"),
  bi("a bar of soap", "una barra de jabón"),
  bi("a capped bottle with sand inside", "una botella tapada con arena adentro"),
  bi("a sealed lunch box", "una lonchera cerrada"),
  bi("a hollow plastic ball", "una pelota de plástico hueca"),
];

function massVolume(name: Bi, m: number, v: number, locale: Locale, spoken: boolean) {
  const M_ = qty(m * 10, GRAMS, locale, spoken), V_ = qty(v * 10, CM3, locale, spoken);
  return tr(locale, `${cap(name.en)} has a mass of ${M_} and a volume of ${V_}.`, `${cap(name.es)} tiene una masa de ${M_} y un volumen de ${V_}.`);
}

function densityItem(r: Rng, level: number, locale: Locale): ItemBody {
  const gcm3 = GCM3.sym[locale];
  if (level === 1) {
    const sm = r.pick(SAMPLES);
    const rho10 = r.int(sm.rho[0], sm.rho[1]);
    const v = r.int(sm.vol[0], sm.vol[1]) * sm.step;
    const m10 = rho10 * v;
    const [m, rho] = [dec(m10), dec(rho10)];
    const text = (spoken: boolean) => {
      const M_ = qty(m10, GRAMS, locale, spoken), V_ = qty(v * 10, CM3, locale, spoken), U = uname(GCM3, locale, spoken);
      return tr(
        locale,
        `${cap(sm.name.en)} has a mass of ${M_} and a volume of ${V_}. What is its density, in ${U}?`,
        `${cap(sm.name.es)} tiene una masa de ${M_} y un volumen de ${V_}. ¿Cuál es su densidad, en ${U}?`,
      );
    };
    return {
      prompt: [text(false)],
      say: text(true),
      input: "keypad",
      keys: ["."],
      answer: { kind: "number", value: rho10 / 10 },
      hints: [
        tr(locale, "Density is how many grams are packed into each cubic centimeter.", "La densidad es cuántos gramos hay en cada centímetro cúbico."),
        tr(locale, "Divide the mass by the volume: density = mass ÷ volume.", "Divide la masa entre el volumen: densidad = masa ÷ volumen."),
        tr(locale, `${m} g ÷ ${v} cm³ gives the density in ${gcm3}.`, `${m} g ÷ ${v} cm³ da la densidad en ${gcm3}.`),
      ],
      steps: [tr(locale, "density = mass ÷ volume", "densidad = masa ÷ volumen"), `${m} ÷ ${v} = ${rho}`, tr(locale, `Check: ${rho} × ${v} = ${m}`, `Comprobación: ${rho} × ${v} = ${m}`), `${rho} ${gcm3}`],
      seconds: 30,
    };
  }
  const water = tr(locale, "Water has a density of 1 g/cm³.", "La densidad del agua es 1 g/cm³.");
  const waterSaid = tr(locale, "Water has a density of 1 gram per cubic centimeter.", "La densidad del agua es 1 gramo por centímetro cúbico.");
  if (r.bool()) {
    // One object: float or sink. Volumes are multiples of 10, so the mass is a whole number of grams.
    const name = r.pick(UNKNOWNS);
    const floats = r.bool();
    const rho10 = floats ? r.int(3, 9) : r.int(11, 30);
    const v = r.int(2, 30) * 10;
    const m = (rho10 * v) / 10;
    const rho = dec(rho10);
    const FLOAT = bi("It floats", "Flota"), SINK = bi("It sinks", "Se hunde");
    const order = r.shuffle([FLOAT, SINK]);
    const right = floats ? FLOAT : SINK;
    const ask = tr(locale, "Will it float or sink in water?", "¿Flota o se hunde en el agua?");
    return {
      prompt: [`${massVolume(name, m, v, locale, false)} ${water} ${ask}`],
      say: `${massVolume(name, m, v, locale, true)} ${waterSaid} ${ask}`,
      choices: order.map((c) => ({ label: c[locale] })),
      input: "choices",
      answer: { kind: "choice", index: order.indexOf(right) },
      hints: [
        tr(locale, "Compare the object's density with water's density, 1 g/cm³.", "Compara la densidad del objeto con la del agua, 1 g/cm³."),
        tr(locale, "Find density = mass ÷ volume. Less than 1 g/cm³ floats; more than 1 g/cm³ sinks.", "Calcula densidad = masa ÷ volumen. Menos de 1 g/cm³ flota; más de 1 g/cm³ se hunde."),
        `${m} g ÷ ${v} cm³ = ${rho} g/cm³`,
      ],
      steps: [
        `${m} ÷ ${v} = ${rho} ${gcm3}`,
        floats
          ? tr(locale, `${rho} is less than 1, so it floats.`, `${rho} es menor que 1, así que flota.`)
          : tr(locale, `${rho} is greater than 1, so it sinks.`, `${rho} es mayor que 1, así que se hunde.`),
      ],
      seconds: 25,
    };
  }
  // Three blocks, one odd one out. Half the time mass points the wrong way (the floater is heaviest, or the sinker lightest).
  const oddFloats = r.bool();
  const trick = r.bool();
  const blocks = [0, 1, 2].map((i) => {
    const odd = i === 0;
    const floats = odd === oddFloats;
    const rho10 = floats ? r.int(4, 9) : r.int(12, 30);
    const v = (trick ? (odd === oddFloats ? r.int(15, 30) : r.int(2, 8)) : r.int(2, 20)) * 10;
    return { odd, floats, rho10, v, m: (rho10 * v) / 10 };
  });
  const shown = r.shuffle(blocks);
  const letters = ["A", "B", "C"];
  const word = tr(locale, "Block", "Bloque");
  const label = (b: (typeof blocks)[number], i: number) => `${word} ${letters[i]}: ${b.m} g, ${b.v} cm³`;
  const choices: Choice[] = shown.map((b, i) => ({
    label: label(b, i),
    say: tr(locale, `Block ${letters[i]}: ${b.m} grams, ${b.v} cubic centimeters`, `Bloque ${letters[i]}: ${b.m} gramos, ${b.v} centímetros cúbicos`),
  }));
  const oddIndex = shown.findIndex((b) => b.odd);
  const ask = oddFloats ? tr(locale, "Which block floats?", "¿Qué bloque flota?") : tr(locale, "Which block sinks?", "¿Qué bloque se hunde?");
  const intro = tr(locale, "Three blocks are placed in water.", "Se colocan tres bloques en agua.");
  const first = shown[0];
  return {
    prompt: [`${intro} ${water} ${ask}`],
    say: `${intro} ${waterSaid} ${ask}`,
    choices,
    input: "choices",
    answer: { kind: "choice", index: oddIndex },
    hints: [
      tr(locale, "Mass alone does not decide. Compare each block's density with 1 g/cm³.", "La masa sola no decide. Compara la densidad de cada bloque con 1 g/cm³."),
      tr(locale, "For each block, divide its mass by its volume.", "Para cada bloque, divide su masa entre su volumen."),
      `${word} A: ${first.m} ÷ ${first.v} = ${dec(first.rho10)} ${gcm3}`,
    ],
    steps: [
      shown.map((b, i) => `${letters[i]}: ${b.m} ÷ ${b.v} = ${dec(b.rho10)}`).join("; "),
      oddFloats
        ? tr(locale, `Only block ${letters[oddIndex]} is less dense than water, so it floats.`, `Solo el bloque ${letters[oddIndex]} es menos denso que el agua, así que flota.`)
        : tr(locale, `Only block ${letters[oddIndex]} is denser than water, so it sinks.`, `Solo el bloque ${letters[oddIndex]} es más denso que el agua, así que se hunde.`),
    ],
    seconds: 45,
  };
}

// ── s.atoms ─────────────────────────────────────────────────────────────────────────────────────

/** Elements 1–20: atomic number, symbol, name, and standard atomic weight rounded to a whole number. */
type Element = { z: number; sym: string; name: Bi; mass: number };
const el = (z: number, sym: string, en: string, es: string, mass: number): Element => ({ z, sym, name: bi(en, es), mass });
const ELEMENTS_1_20: Element[] = [
  el(1, "H", "hydrogen", "hidrógeno", 1),
  el(2, "He", "helium", "helio", 4),
  el(3, "Li", "lithium", "litio", 7),
  el(4, "Be", "beryllium", "berilio", 9),
  el(5, "B", "boron", "boro", 11),
  el(6, "C", "carbon", "carbono", 12),
  el(7, "N", "nitrogen", "nitrógeno", 14),
  el(8, "O", "oxygen", "oxígeno", 16),
  el(9, "F", "fluorine", "flúor", 19),
  el(10, "Ne", "neon", "neón", 20),
  el(11, "Na", "sodium", "sodio", 23),
  el(12, "Mg", "magnesium", "magnesio", 24),
  el(13, "Al", "aluminum", "aluminio", 27),
  el(14, "Si", "silicon", "silicio", 28),
  el(15, "P", "phosphorus", "fósforo", 31),
  el(16, "S", "sulfur", "azufre", 32),
  el(17, "Cl", "chlorine", "cloro", 35),
  el(18, "Ar", "argon", "argón", 40),
  el(19, "K", "potassium", "potasio", 39),
  el(20, "Ca", "calcium", "calcio", 40),
];

const count = (n: number, en: [string, string], es: [string, string], locale: Locale) =>
  `${n} ${locale === "es" ? (n === 1 ? es[0] : es[1]) : n === 1 ? en[0] : en[1]}`;
const protons = (n: number, locale: Locale) => count(n, ["proton", "protons"], ["protón", "protones"], locale);
const neutrons = (n: number, locale: Locale) => count(n, ["neutron", "neutrons"], ["neutrón", "neutrones"], locale);
const electrons = (n: number, locale: Locale) => count(n, ["electron", "electrons"], ["electrón", "electrones"], locale);

function atomsItem(r: Rng, level: number, locale: Locale): ItemBody {
  const x = r.pick(ELEMENTS_1_20);
  const name = x.name[locale];
  const Name = cap(name);
  const n = x.mass - x.z;
  const intro = tr(locale, `${Name} (${x.sym}) has atomic number ${x.z}.`, `El ${name} (${x.sym}) tiene número atómico ${x.z}.`);
  const kind = r.int(1, 10);
  if (level === 1) {
    if (kind <= 4) {
      const q = `${intro} ${tr(locale, `How many protons are in the nucleus of one ${name} atom?`, `¿Cuántos protones hay en el núcleo de un átomo de ${name}?`)}`;
      return {
        prompt: [q],
        say: q,
        input: "keypad",
        answer: { kind: "number", value: x.z },
        hints: [
          tr(locale, "What does the atomic number count?", "¿Qué cuenta el número atómico?"),
          tr(locale, "The atomic number is the number of protons. It is the same for every atom of an element.", "El número atómico es el número de protones. Es el mismo en todos los átomos de un elemento."),
          tr(locale, "Find the atomic number in the question.", "Busca el número atómico en la pregunta."),
        ],
        steps: [tr(locale, `Atomic number ${x.z} means ${protons(x.z, locale)}.`, `Número atómico ${x.z} significa ${protons(x.z, locale)}.`)],
        seconds: 10,
      };
    }
    if (kind <= 7) {
      const q = `${intro} ${tr(locale, `How many electrons are in one neutral ${name} atom?`, `¿Cuántos electrones hay en un átomo neutro de ${name}?`)}`;
      return {
        prompt: [q],
        say: q,
        input: "keypad",
        answer: { kind: "number", value: x.z },
        hints: [
          tr(locale, "A neutral atom has no overall charge.", "Un átomo neutro no tiene carga total."),
          tr(locale, "Each proton is +1 and each electron is −1, so a neutral atom has as many electrons as protons.", "Cada protón es +1 y cada electrón es −1, así que un átomo neutro tiene tantos electrones como protones."),
          tr(locale, `The atomic number tells you ${name} has ${protons(x.z, locale)}.`, `El número atómico te dice que el ${name} tiene ${protons(x.z, locale)}.`),
        ],
        steps: [
          tr(locale, `Atomic number ${x.z}: ${protons(x.z, locale)}.`, `Número atómico ${x.z}: ${protons(x.z, locale)}.`),
          tr(locale, `Neutral, so ${electrons(x.z, locale)}.`, `Neutro, así que ${electrons(x.z, locale)}.`),
        ],
        seconds: 12,
      };
    }
    const q = tr(locale, `A neutral atom has ${electrons(x.z, "en")}. What is its atomic number?`, `Un átomo neutro tiene ${electrons(x.z, "es")}. ¿Cuál es su número atómico?`);
    return {
      prompt: [q],
      say: q,
      input: "keypad",
      answer: { kind: "number", value: x.z },
      hints: [
        tr(locale, "A neutral atom has no overall charge.", "Un átomo neutro no tiene carga total."),
        tr(locale, "So it has as many protons as electrons, and the atomic number counts the protons.", "Entonces tiene tantos protones como electrones, y el número atómico cuenta los protones."),
        tr(locale, `${cap(electrons(x.z, locale))} means the same number of protons.`, `${cap(electrons(x.z, locale))} significa el mismo número de protones.`),
      ],
      steps: [
        tr(locale, `${cap(electrons(x.z, locale))}, so ${protons(x.z, locale)}.`, `${cap(electrons(x.z, locale))}, así que ${protons(x.z, locale)}.`),
        tr(locale, `Atomic number ${x.z}: this is ${name}.`, `Número atómico ${x.z}: es el ${name}.`),
      ],
      seconds: 12,
    };
  }
  if (kind <= 6) {
    const q = tr(
      locale,
      `One atom of ${name} (${x.sym}) has atomic number ${x.z} and mass number ${x.mass}. How many neutrons does it have?`,
      `Un átomo de ${name} (${x.sym}) tiene número atómico ${x.z} y número de masa ${x.mass}. ¿Cuántos neutrones tiene?`,
    );
    return {
      prompt: [q],
      say: q,
      input: "keypad",
      answer: { kind: "number", value: n },
      hints: [
        tr(locale, "The mass number counts protons and neutrons together.", "El número de masa cuenta los protones y los neutrones juntos."),
        tr(locale, "Neutrons = mass number − atomic number.", "Neutrones = número de masa − número atómico."),
        tr(locale, `It has ${protons(x.z, locale)}, so take ${x.z} away from ${x.mass}.`, `Tiene ${protons(x.z, locale)}, así que resta ${x.z} de ${x.mass}.`),
      ],
      steps: [
        tr(locale, "neutrons = mass number − atomic number", "neutrones = número de masa − número atómico"),
        `${x.mass} − ${x.z} = ${n}`,
        tr(locale, `Check: ${x.z} + ${n} = ${x.mass}`, `Comprobación: ${x.z} + ${n} = ${x.mass}`),
      ],
      seconds: 15,
    };
  }
  if (kind <= 8) {
    const q = tr(
      locale,
      `An atom has ${protons(x.z, "en")} and ${neutrons(n, "en")}. What is its mass number?`,
      `Un átomo tiene ${protons(x.z, "es")} y ${neutrons(n, "es")}. ¿Cuál es su número de masa?`,
    );
    return {
      prompt: [q],
      say: q,
      input: "keypad",
      answer: { kind: "number", value: x.mass },
      hints: [
        tr(locale, "Protons and neutrons are both in the nucleus, and both have mass.", "Los protones y los neutrones están en el núcleo, y los dos tienen masa."),
        tr(locale, "Mass number = protons + neutrons. Electrons are too light to count.", "Número de masa = protones + neutrones. Los electrones son demasiado ligeros para contar."),
        tr(locale, `Add ${x.z} and ${n}.`, `Suma ${x.z} y ${n}.`),
      ],
      steps: [tr(locale, "mass number = protons + neutrons", "número de masa = protones + neutrones"), `${x.z} + ${n} = ${x.mass}`],
      seconds: 15,
    };
  }
  const q = tr(
    locale,
    `An atom has mass number ${x.mass} and ${neutrons(n, "en")}. What is its atomic number?`,
    `Un átomo tiene número de masa ${x.mass} y ${neutrons(n, "es")}. ¿Cuál es su número atómico?`,
  );
  return {
    prompt: [q],
    say: q,
    input: "keypad",
    answer: { kind: "number", value: x.z },
    hints: [
      tr(locale, "The mass number counts protons plus neutrons.", "El número de masa cuenta protones más neutrones."),
      tr(locale, "Protons = mass number − neutrons, and the atomic number is the number of protons.", "Protones = número de masa − neutrones, y el número atómico es el número de protones."),
      tr(locale, `Take ${n} away from ${x.mass}.`, `Resta ${n} de ${x.mass}.`),
    ],
    steps: [`${x.mass} − ${n} = ${x.z}`, tr(locale, `Atomic number ${x.z}: this is ${name}.`, `Número atómico ${x.z}: es el ${name}.`)],
    seconds: 15,
  };
}

// ── s.genetics ──────────────────────────────────────────────────────────────────────────────────

/** One gene, two alleles, complete dominance (Mendel's pea traits and two classroom animal traits). */
type Trait = { org: Bi; one: Bi; fem: boolean; letter: string; dom: Bi; rec: Bi };
const pea = (letter: string, dom: Bi, rec: Bi): Trait => ({ org: bi("pea plants", "las plantas de guisante"), one: bi("plant", "planta"), fem: true, letter, dom, rec });
const TRAITS: Trait[] = [
  pea("P", bi("purple flowers", "flores moradas"), bi("white flowers", "flores blancas")),
  pea("R", bi("round seeds", "semillas lisas"), bi("wrinkled seeds", "semillas rugosas")),
  pea("Y", bi("yellow seeds", "semillas amarillas"), bi("green seeds", "semillas verdes")),
  pea("T", bi("tall stems", "tallos altos"), bi("short stems", "tallos cortos")),
  pea("G", bi("green pods", "vainas verdes"), bi("yellow pods", "vainas amarillas")),
  { org: bi("fruit flies", "las moscas de la fruta"), one: bi("fly", "mosca"), fem: true, letter: "V", dom: bi("normal wings", "alas normales"), rec: bi("vestigial wings", "alas vestigiales") },
  { org: bi("mice", "los ratones"), one: bi("mouse", "ratón"), fem: false, letter: "B", dom: bi("black fur", "pelaje negro"), rec: bi("brown fur", "pelaje café") },
];
/** Parent pairs, weighted toward the informative crosses. "A" stands for the dominant allele. */
const CROSSES: [string, string][] = [
  ["Aa", "Aa"], ["Aa", "Aa"], ["Aa", "Aa"],
  ["Aa", "aa"], ["Aa", "aa"], ["Aa", "aa"],
  ["AA", "aa"], ["AA", "aa"],
  ["AA", "Aa"], ["AA", "Aa"],
  ["aa", "aa"], ["AA", "AA"],
];

/** The 4 boxes, row by row: `top` alleles across the top, `side` alleles down the side. Dominant letter first. */
const punnett = (top: string, side: string) => [...side].flatMap((b) => [...top].map((a) => (a < b ? a + b : b + a)));

const zygosity = (g: string, t: Trait, locale: Locale) => {
  const het = g[0] !== g[1];
  const dom = g[0] === t.letter;
  if (locale === "en") return het ? "heterozygous" : dom ? "homozygous dominant" : "homozygous recessive";
  const o = t.fem ? "a" : "o";
  return het ? `heterocigot${o}` : `homocigot${o} ${dom ? "dominante" : `recesiv${o}`}`;
};
/** "Pp" read aloud: "big P little p". */
const sayGenotype = (g: string, locale: Locale) =>
  [...g].map((c) => (c === c.toUpperCase() ? tr(locale, `big ${c}`, `${c} mayúscula`) : tr(locale, `little ${c}`, `${c} minúscula`))).join(" ");

function crossText(t: Trait, g1: string, g2: string, locale: Locale, spoken: boolean) {
  const D = t.letter, d = t.letter.toLowerCase();
  const G = (g: string) => (spoken ? sayGenotype(g, locale) : g);
  if (locale === "es") {
    const un = t.fem ? "una" : "un";
    return `En ${t.org.es}, el alelo para ${t.dom.es} (${G(D)}) es dominante sobre el alelo para ${t.rec.es} (${G(d)}). Se cruza ${un} ${t.one.es} ${zygosity(g1, t, "es")} (${G(g1)}) con ${un} ${t.one.es} ${zygosity(g2, t, "es")} (${G(g2)}).`;
  }
  return `In ${t.org.en}, the allele for ${t.dom.en} (${G(D)}) is dominant over the allele for ${t.rec.en} (${G(d)}). A ${zygosity(g1, t, "en")} ${t.one.en} (${G(g1)}) is crossed with a ${zygosity(g2, t, "en")} ${t.one.en} (${G(g2)}).`;
}

/** Genotype counts out of 4 as [homozygous dominant, heterozygous, homozygous recessive]. */
const RATIOS: number[][] = [[4, 0, 0], [2, 2, 0], [0, 4, 0], [1, 2, 1], [0, 2, 2], [0, 0, 4], [3, 0, 1], [2, 0, 2]];
/** The most tempting wrong answer for each true ratio: phenotype 3 : 1 for Aa × Aa, "half like each parent" for AA × aa… */
const MISTAKE: Record<string, number[]> = {
  "1,2,1": [3, 0, 1],
  "0,4,0": [2, 0, 2],
  "0,2,2": [1, 2, 1],
  "2,2,0": [1, 2, 1],
  "4,0,0": [2, 2, 0],
  "0,0,4": [0, 2, 2],
};

function geneticsItem(r: Rng, level: number, locale: Locale): ItemBody {
  const t = r.pick(TRAITS);
  const [x, y] = r.pick(CROSSES);
  const fill = (s: string) => s.replace(/A/g, t.letter).replace(/a/g, t.letter.toLowerCase());
  const [g1, g2] = r.bool() ? [fill(x), fill(y)] : [fill(y), fill(x)];
  const D = t.letter, d = t.letter.toLowerCase();
  const boxes = punnett(g1, g2);
  const square = tr(
    locale,
    `Draw a Punnett square: ${g1[0]} and ${g1[1]} across the top, ${g2[0]} and ${g2[1]} down the side. Fill each box with one letter from each parent.`,
    `Dibuja un cuadro de Punnett: ${g1[0]} y ${g1[1]} arriba, ${g2[0]} y ${g2[1]} al costado. Llena cada casilla con una letra de cada progenitor.`,
  );
  const allele = tr(locale, "Each offspring gets one allele from each parent.", "Cada descendiente recibe un alelo de cada progenitor.");
  const boxLine = tr(locale, `Boxes: ${boxes.join(", ")}`, `Casillas: ${boxes.join(", ")}`);
  if (level === 1) {
    const k = boxes.filter((b) => b[0] === D).length;
    const pct = k * 25;
    const q = tr(locale, ` What percent of the offspring are expected to have ${t.dom.en}?`, ` ¿Qué porcentaje de la descendencia se espera que tenga ${t.dom.es}?`);
    return {
      prompt: [crossText(t, g1, g2, locale, false) + q, " ", { blank: true }, " %"],
      say: crossText(t, g1, g2, locale, true) + q + tr(locale, " Answer in percent.", " Responde en porcentaje."),
      input: "keypad",
      answer: { kind: "number", value: pct },
      hints: [
        allele,
        square,
        tr(locale, `The 4 boxes are ${boxes.join(", ")}. Which have at least one ${D}?`, `Las 4 casillas son ${boxes.join(", ")}. ¿Cuáles tienen al menos una ${D}?`),
      ],
      steps: [
        boxLine,
        tr(locale, `Boxes with at least one ${D} show ${t.dom.en}: ${k} out of 4.`, `Las casillas con al menos una ${D} tienen ${t.dom.es}: ${k} de 4.`),
        tr(locale, `${k} out of 4 = ${pct}%`, `${k} de 4 = ${pct}%`),
      ],
      seconds: 60,
    };
  }
  const geno = [D + D, D + d, d + d];
  const want = geno.map((g) => boxes.filter((b) => b === g).length);
  const key = want.join(",");
  const others = r.shuffle(RATIOS.filter((c) => c.join(",") !== key && c.join(",") !== MISTAKE[key].join(",")));
  const options = r.shuffle([want, MISTAKE[key], others[0], others[1]]);
  const choices: Choice[] = options.map((c) => ({
    label: `${c[0]} ${geno[0]} : ${c[1]} ${geno[1]} : ${c[2]} ${geno[2]}`,
    say: c.map((n, i) => `${n} ${sayGenotype(geno[i], locale)}`).join(", "),
  }));
  const q = tr(locale, " In the Punnett square, how many of the 4 boxes have each genotype?", " En el cuadro de Punnett, ¿cuántas de las 4 casillas tienen cada genotipo?");
  return {
    prompt: [crossText(t, g1, g2, locale, false) + q],
    say: crossText(t, g1, g2, locale, true) + q,
    choices,
    input: "choices",
    answer: { kind: "choice", index: options.indexOf(want) },
    hints: [allele, square, tr(locale, `The top row is ${boxes[0]} and ${boxes[1]}.`, `La fila de arriba es ${boxes[0]} y ${boxes[1]}.`)],
    steps: [boxLine, `${geno[0]}: ${want[0]}, ${geno[1]}: ${want[1]}, ${geno[2]}: ${want[2]}`],
    seconds: 60,
  };
}

// ── s.newton ────────────────────────────────────────────────────────────────────────────────────

/** Masses in whole kg, or a fixed `m10` (tenths of a kg) for light objects; accelerations in whole m/s². */
type Body = { name: Bi; m: [number, number]; a: [number, number]; m10?: number };
const BODIES: Body[] = [
  { name: bi("a shopping cart", "un carrito de compras"), m: [10, 30], a: [1, 3] },
  { name: bi("a sled", "un trineo"), m: [5, 25], a: [1, 4] },
  { name: bi("a box of books", "una caja de libros"), m: [8, 30], a: [1, 3] },
  { name: bi("a skateboarder", "un patinador"), m: [40, 70], a: [1, 3] },
  { name: bi("a bike and its rider", "una bicicleta con su ciclista"), m: [60, 90], a: [1, 2] },
  { name: bi("a toy car", "un carrito de juguete"), m: [0, 0], a: [2, 9], m10: 5 },
  { name: bi("a bowling ball", "una bola de boliche"), m: [5, 7], a: [2, 8] },
  { name: bi("a soccer ball", "un balón de fútbol"), m: [0, 0], a: [5, 30], m10: 4 },
];

type ForceKind = "force" | "accel" | "mass";
function forceText(kind: ForceKind, b: Body, m10: number, a10: number, f10: number, locale: Locale, spoken: boolean) {
  const n = b.name[locale];
  const Mq = qty(m10, KG, locale, spoken), Aq = qty(a10, MS2, locale, spoken), Fq = qty(f10, NEWTONS, locale, spoken);
  const U = (u: Unit) => uname(u, locale, spoken);
  if (locale === "es") {
    if (kind === "force") return `${cap(n)} tiene una masa de ${Mq}. Una fuerza neta le da una aceleración de ${Aq}. ¿Cuál es la fuerza neta, en ${spoken ? "newtons" : "newtons (N)"}?`;
    if (kind === "accel") return `Una fuerza neta de ${Fq} actúa sobre ${n}, que tiene una masa de ${Mq}. ¿Cuál es su aceleración, en ${U(MS2)}?`;
    return `Una fuerza neta de ${Fq} le da a ${n} una aceleración de ${Aq}. ¿Cuál es su masa, en ${U(KG)}?`;
  }
  if (kind === "force") return `${cap(n)} has a mass of ${Mq}. A net force gives it an acceleration of ${Aq}. What is the net force, in ${spoken ? "newtons" : "newtons (N)"}?`;
  if (kind === "accel") return `A net force of ${Fq} acts on ${n}, which has a mass of ${Mq}. What is its acceleration, in ${U(MS2)}?`;
  return `A net force of ${Fq} gives ${n} an acceleration of ${Aq}. What is its mass, in ${U(KG)}?`;
}

function newtonItem(r: Rng, level: number, locale: Locale): ItemBody {
  const b = r.pick(BODIES);
  const kind: ForceKind = level === 1 ? "force" : r.bool() ? "accel" : "mass";
  // Exactly one of mass and acceleration may carry a decimal, so the force in tenths is exact.
  let m10: number, a10: number;
  if (b.m10) {
    m10 = b.m10;
    a10 = r.int(b.a[0], b.a[1]) * 10;
  } else {
    m10 = r.int(b.m[0], b.m[1]) * 10;
    a10 = r.bool(0.4) ? r.int(b.a[0] * 10 + 1, b.a[1] * 10 - 1) : r.int(b.a[0], b.a[1]) * 10;
    if (a10 % 10 !== 0 && a10 % 10 !== 5 && b.m[1] > 30) a10 = Math.floor(a10 / 10) * 10 + 5;
  }
  const f10 = (m10 * a10) / 10;
  const [m, a, f] = [dec(m10), dec(a10), dec(f10)];
  const prompt = forceText(kind, b, m10, a10, f10, locale, false);
  const say = forceText(kind, b, m10, a10, f10, locale, true);
  const base = { prompt: [prompt], say, input: "keypad" as const, keys: ["."] as "."[] };
  if (kind === "force")
    return {
      ...base,
      answer: { kind: "number", value: f10 / 10 },
      hints: [
        tr(locale, "More mass or more acceleration needs more force.", "Más masa o más aceleración requieren más fuerza."),
        tr(locale, "Use Newton's second law: F = m × a.", "Usa la segunda ley de Newton: F = m × a."),
        `F = ${m} kg × ${a} m/s²`,
      ],
      steps: ["F = m × a", `F = ${m} × ${a} = ${f}`, `${f} N`],
      seconds: 25,
    };
  if (kind === "accel")
    return {
      ...base,
      answer: { kind: "number", value: a10 / 10 },
      hints: [
        tr(locale, "The same force speeds up a smaller mass more.", "La misma fuerza acelera más a una masa menor."),
        tr(locale, "Rearrange F = m × a to get a = F ÷ m.", "Despeja de F = m × a: a = F ÷ m."),
        `a = ${f} N ÷ ${m} kg`,
      ],
      steps: ["a = F ÷ m", `${f} ÷ ${m} = ${a}`, tr(locale, `Check: ${m} × ${a} = ${f}`, `Comprobación: ${m} × ${a} = ${f}`), `${a} m/s²`],
      seconds: 35,
    };
  return {
    ...base,
    answer: { kind: "number", value: m10 / 10 },
    hints: [
      tr(locale, "A bigger mass needs more force for the same acceleration.", "Una masa mayor necesita más fuerza para la misma aceleración."),
      tr(locale, "Rearrange F = m × a to get m = F ÷ a.", "Despeja de F = m × a: m = F ÷ a."),
      `m = ${f} N ÷ ${a} m/s²`,
    ],
    steps: ["m = F ÷ a", `${f} ÷ ${a} = ${m}`, tr(locale, `Check: ${m} × ${a} = ${f}`, `Comprobación: ${m} × ${a} = ${f}`), `${m} kg`],
    seconds: 35,
  };
}

// ── s.ph ────────────────────────────────────────────────────────────────────────────────────────

/** Everyday substances with commonly cited approximate pH (tenths). */
const PH_THINGS: { name: Bi; ph10: number }[] = [
  { name: bi("Lemon juice", "El jugo de limón"), ph10: 20 },
  { name: bi("Vinegar", "El vinagre"), ph10: 30 },
  { name: bi("Tomato juice", "El jugo de tomate"), ph10: 40 },
  { name: bi("Black coffee", "El café negro"), ph10: 50 },
  { name: bi("Milk", "La leche"), ph10: 65 },
  { name: bi("Pure water", "El agua pura"), ph10: 70 },
  { name: bi("Human blood", "La sangre humana"), ph10: 74 },
  { name: bi("Seawater", "El agua de mar"), ph10: 80 },
  { name: bi("Milk of magnesia", "La leche de magnesia"), ph10: 105 },
  { name: bi("Household ammonia", "El amoníaco doméstico"), ph10: 110 },
];
const ACIDIC = bi("Acidic", "Ácida"), NEUTRAL = bi("Neutral", "Neutra"), BASIC = bi("Basic", "Básica");

function phItem(r: Rng, _level: number, locale: Locale): ItemBody {
  if (r.bool(0.6)) {
    const known = r.bool(0.4) ? r.pick(PH_THINGS) : null;
    let ph10: number;
    if (known) ph10 = known.ph10;
    else {
      const roll = r.int(1, 20);
      if (roll <= 3) ph10 = 70;
      else if (roll <= 8) ph10 = r.pick([r.int(60, 69), r.int(71, 80)]);
      else ph10 = r.pick([...Array(15).keys()].filter((v) => v !== 7)) * 10;
    }
    const ph = dec(ph10);
    const q = known
      ? ph10 === 70
        ? tr(locale, `${known.name.en} has a pH of 7. Is it acidic, neutral, or basic?`, `${known.name.es} tiene un pH de 7. ¿Es una sustancia ácida, neutra o básica?`)
        : tr(locale, `${known.name.en} has a pH of about ${ph}. Is it acidic, neutral, or basic?`, `${known.name.es} tiene un pH de aproximadamente ${ph}. ¿Es una sustancia ácida, neutra o básica?`)
      : tr(locale, `A solution has a pH of ${ph}. Is it acidic, neutral, or basic?`, `Una solución tiene un pH de ${ph}. ¿Es ácida, neutra o básica?`);
    const index = ph10 < 70 ? 0 : ph10 === 70 ? 1 : 2;
    const choices = [ACIDIC, NEUTRAL, BASIC].map((c) => ({ label: c[locale] }));
    const compare = [
      tr(locale, `${ph} is less than 7.`, `${ph} es menor que 7.`),
      tr(locale, `${ph} is exactly 7.`, `${ph} es exactamente 7.`),
      tr(locale, `${ph} is greater than 7.`, `${ph} es mayor que 7.`),
    ][index];
    const rule = [
      tr(locale, "A pH below 7 is acidic.", "Un pH menor que 7 es ácido."),
      tr(locale, "A pH of 7 is neutral.", "Un pH de 7 es neutro."),
      tr(locale, "A pH above 7 is basic.", "Un pH mayor que 7 es básico."),
    ][index];
    return {
      prompt: [q],
      say: q,
      choices,
      input: "choices",
      answer: { kind: "choice", index },
      hints: [
        tr(locale, "Find 7 on the pH scale. What does 7 mean?", "Busca el 7 en la escala de pH. ¿Qué significa el 7?"),
        tr(locale, "Below 7 is acidic, exactly 7 is neutral, and above 7 is basic.", "Menos de 7 es ácido, exactamente 7 es neutro y más de 7 es básico."),
        compare,
      ],
      steps: [compare, rule, choices[index].label],
      seconds: 10,
    };
  }
  // Two solutions: which is more acidic (or more basic)?
  const pick = () => (r.bool(0.75) ? r.int(0, 14) * 10 : r.int(1, 139));
  const a10 = pick();
  let b10 = pick();
  while (b10 === a10) b10 = pick();
  const acid = r.bool(0.7);
  const [a, b] = [dec(a10), dec(b10)];
  const sol = tr(locale, "Solution", "Solución");
  const choices = [`${sol} A (pH ${a})`, `${sol} B (pH ${b})`].map((label) => ({ label }));
  const wantA = acid ? a10 < b10 : a10 > b10;
  const index = wantA ? 0 : 1;
  const lo = dec(Math.min(a10, b10)), hi = dec(Math.max(a10, b10));
  const q = tr(
    locale,
    `Solution A has a pH of ${a}. Solution B has a pH of ${b}. Which is more ${acid ? "acidic" : "basic"}?`,
    `La solución A tiene un pH de ${a}. La solución B tiene un pH de ${b}. ¿Cuál es más ${acid ? "ácida" : "básica"}?`,
  );
  const diff = Math.abs(a10 - b10) / 10;
  const times =
    a10 % 10 === 0 && b10 % 10 === 0 && diff <= 3
      ? [
          acid
            ? tr(locale, `Each step down the pH scale is 10 times more acidic, so it is ${10 ** diff} times more acidic.`, `Cada paso hacia abajo en la escala de pH es 10 veces más ácido, así que es ${10 ** diff} veces más ácida.`)
            : tr(locale, `Each step up the pH scale is 10 times more basic, so it is ${10 ** diff} times more basic.`, `Cada paso hacia arriba en la escala de pH es 10 veces más básico, así que es ${10 ** diff} veces más básica.`),
        ]
      : [];
  return {
    prompt: [q],
    say: q,
    choices,
    input: "choices",
    answer: { kind: "choice", index },
    hints: [
      tr(locale, `On the pH scale, which direction is more ${acid ? "acidic" : "basic"}?`, `En la escala de pH, ¿hacia qué lado es más ${acid ? "ácido" : "básico"}?`),
      tr(locale, "The lower the pH, the more acidic. The higher the pH, the more basic.", "Cuanto más bajo el pH, más ácido. Cuanto más alto el pH, más básico."),
      tr(locale, `${lo} is lower than ${hi}.`, `${lo} es menor que ${hi}.`),
    ],
    steps: [
      `${lo} < ${hi}`,
      acid
        ? tr(locale, `The lower pH is more acidic: ${choices[index].label}.`, `El pH más bajo es más ácido: ${choices[index].label}.`)
        : tr(locale, `The higher pH is more basic: ${choices[index].label}.`, `El pH más alto es más básico: ${choices[index].label}.`),
      ...times,
    ],
    seconds: 15,
  };
}

// ── s.formula.atoms ─────────────────────────────────────────────────────────────────────────────

const ELEMENT_NAMES: Record<string, Bi> = {
  ...Object.fromEntries(ELEMENTS_1_20.map((x) => [x.sym, x.name])),
  Fe: bi("iron", "hierro"),
  Cu: bi("copper", "cobre"),
  Zn: bi("zinc", "zinc"),
  Ba: bi("barium", "bario"),
};

type Formula = { f: string; name: Bi };
const fm = (f: string, en: string, es: string): Formula => ({ f, name: bi(en, es) });
const SIMPLE: Formula[] = [
  fm("H2O", "water", "el agua"),
  fm("CO2", "carbon dioxide", "el dióxido de carbono"),
  fm("C6H12O6", "glucose", "la glucosa"),
  fm("NaCl", "table salt (sodium chloride)", "la sal de mesa (cloruro de sodio)"),
  fm("NH3", "ammonia", "el amoníaco"),
  fm("CH4", "methane", "el metano"),
  fm("O2", "oxygen gas", "el oxígeno gaseoso"),
  fm("H2O2", "hydrogen peroxide", "el peróxido de hidrógeno"),
  fm("H2SO4", "sulfuric acid", "el ácido sulfúrico"),
  fm("NaHCO3", "baking soda (sodium bicarbonate)", "el bicarbonato de sodio"),
  fm("CaCO3", "calcium carbonate", "el carbonato de calcio"),
  fm("C2H5OH", "ethanol", "el etanol"),
  fm("C12H22O11", "table sugar (sucrose)", "el azúcar de mesa (sacarosa)"),
  fm("C3H8", "propane", "el propano"),
  fm("Fe2O3", "rust (iron oxide)", "el óxido de hierro"),
  fm("NaOH", "sodium hydroxide", "el hidróxido de sodio"),
  fm("MgCl2", "magnesium chloride", "el cloruro de magnesio"),
  fm("Al2O3", "aluminum oxide", "el óxido de aluminio"),
  fm("C8H18", "octane", "el octano"),
  fm("SO2", "sulfur dioxide", "el dióxido de azufre"),
  fm("HNO3", "nitric acid", "el ácido nítrico"),
  fm("CH3COOH", "acetic acid (in vinegar)", "el ácido acético (del vinagre)"),
];
const GROUPED: Formula[] = [
  fm("Ca(OH)2", "calcium hydroxide", "el hidróxido de calcio"),
  fm("Mg(OH)2", "magnesium hydroxide", "el hidróxido de magnesio"),
  fm("Al(OH)3", "aluminum hydroxide", "el hidróxido de aluminio"),
  fm("Fe(OH)3", "iron(III) hydroxide", "el hidróxido de hierro(III)"),
  fm("Ba(OH)2", "barium hydroxide", "el hidróxido de bario"),
  fm("Ca(NO3)2", "calcium nitrate", "el nitrato de calcio"),
  fm("Mg(NO3)2", "magnesium nitrate", "el nitrato de magnesio"),
  fm("Cu(NO3)2", "copper(II) nitrate", "el nitrato de cobre(II)"),
  fm("Al(NO3)3", "aluminum nitrate", "el nitrato de aluminio"),
  fm("Zn(NO3)2", "zinc nitrate", "el nitrato de zinc"),
  fm("(NH4)2SO4", "ammonium sulfate", "el sulfato de amonio"),
  fm("(NH4)3PO4", "ammonium phosphate", "el fosfato de amonio"),
  fm("(NH4)2CO3", "ammonium carbonate", "el carbonato de amonio"),
  fm("Mg3(PO4)2", "magnesium phosphate", "el fosfato de magnesio"),
  fm("Ca3(PO4)2", "calcium phosphate", "el fosfato de calcio"),
  fm("Al2(SO4)3", "aluminum sulfate", "el sulfato de aluminio"),
  fm("Fe2(SO4)3", "iron(III) sulfate", "el sulfato de hierro(III)"),
  fm("Ca(HCO3)2", "calcium bicarbonate", "el bicarbonato de calcio"),
  fm("Ca(C2H3O2)2", "calcium acetate", "el acetato de calcio"),
];

/** Atoms of each element in a formula, in order of first appearance; handles nested parentheses. */
function countAtoms(f: string): Map<string, number> {
  const stack: Map<string, number>[] = [new Map()];
  const add = (into: Map<string, number>, sym: string, n: number) => into.set(sym, (into.get(sym) ?? 0) + n);
  for (const m of f.matchAll(/([A-Z][a-z]?)(\d*)|(\()|\)(\d*)/g)) {
    const top = stack[stack.length - 1];
    if (m[1]) add(top, m[1], Number(m[2] || 1));
    else if (m[3]) stack.push(new Map());
    else {
      const inner = stack.pop()!;
      for (const [sym, n] of inner) add(stack[stack.length - 1], sym, n * Number(m[4] || 1));
    }
  }
  return stack[0];
}

const SUBSCRIPT = "₀₁₂₃₄₅₆₇₈₉";
const subscripts = (f: string) => f.replace(/\d/g, (d) => SUBSCRIPT[Number(d)]);
/** How a chemist reads a formula aloud: "C 6 H 12 O 6", "C A, open parenthesis, O H, close parenthesis, 2". */
function sayFormula(f: string, locale: Locale) {
  const words = [...f.matchAll(/[A-Z][a-z]?|\d+|[()]/g)].map(([tok]) =>
    tok === "("
      ? tr(locale, ", open parenthesis,", ", abre paréntesis,")
      : tok === ")"
        ? tr(locale, ", close parenthesis,", ", cierra paréntesis,")
        : /\d/.test(tok)
          ? tok
          : tok.toUpperCase().split("").join(" "),
  );
  return words.join(" ").replace(/ ,/g, ",").replace(/^, /, "");
}
const deEs = (name: string) => (name.startsWith("el ") ? `del ${name.slice(3)}` : `de ${name}`);
const atomsWord = (n: number, locale: Locale) => count(n, ["atom", "atoms"], ["átomo", "átomos"], locale);

function formulaItem(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) {
    const x = r.pick(SIMPLE);
    const counts = [...countAtoms(x.f)];
    const total = counts.reduce((s, [, n]) => s + n, 0);
    const text = (spoken: boolean) => {
      const F = spoken ? sayFormula(x.f, locale) : subscripts(x.f);
      return tr(
        locale,
        `The formula for ${x.name.en} is ${F}. How many atoms in total does this formula show?`,
        `La fórmula ${deEs(x.name.es)} es ${F}. ¿Cuántos átomos en total muestra esta fórmula?`,
      );
    };
    const [firstSym, firstN] = counts[0];
    return {
      prompt: [text(false)],
      say: text(true),
      input: "keypad",
      answer: { kind: "number", value: total },
      hints: [
        tr(locale, "A small number after a symbol counts the atoms of that element.", "Un número pequeño después de un símbolo cuenta los átomos de ese elemento."),
        tr(locale, "A symbol with no number means 1 atom. Add up the atoms of every element.", "Un símbolo sin número significa 1 átomo. Suma los átomos de todos los elementos."),
        tr(locale, `Start with ${firstSym}: ${atomsWord(firstN, "en")}.`, `Empieza con ${firstSym}: ${atomsWord(firstN, "es")}.`),
      ],
      steps: [counts.map(([sym, n]) => `${sym}: ${n}`).join(", "), `${counts.map(([, n]) => n).join(" + ")} = ${total}`],
      seconds: 20,
    };
  }
  const x = r.pick(GROUPED);
  const g = /\(([^()]+)\)(\d+)/.exec(x.f)!;
  const [group, k] = [g[1], Number(g[2])];
  const inside = countAtoms(group);
  const outside = countAtoms(x.f.replace(g[0], ""));
  const total = countAtoms(x.f);
  // Elements inside the parentheses are where the mistakes happen, so ask about them more often.
  const syms = [...total.keys()];
  const sym = r.pick(syms.flatMap((s) => (inside.has(s) ? [s, s, s] : [s])));
  const ans = total.get(sym)!;
  const elName = ELEMENT_NAMES[sym][locale];
  const text = (spoken: boolean) => {
    const F = spoken ? sayFormula(x.f, locale) : subscripts(x.f);
    return tr(
      locale,
      `The formula for ${x.name.en} is ${F}. How many ${elName} atoms does this formula show?`,
      `La fórmula ${deEs(x.name.es)} es ${F}. ¿Cuántos átomos de ${elName} muestra esta fórmula?`,
    );
  };
  const inner = inside.get(sym) ?? 0, out = outside.get(sym) ?? 0;
  const groupShown = `(${subscripts(group)})${subscripts(String(k))}`;
  const steps = inner
    ? [
        tr(locale, `${groupShown}: ${inner} × ${k} = ${inner * k}`, `${groupShown}: ${inner} × ${k} = ${inner * k}`),
        ...(out ? [tr(locale, `Outside the parentheses: ${out}`, `Fuera del paréntesis: ${out}`), `${inner * k} + ${out} = ${ans}`] : []),
        tr(locale, `${ans} ${elName} atoms`, `${atomsWord(ans, "es")} de ${elName}`),
      ]
    : [tr(locale, `${sym} is outside the parentheses: ${out}`, `${sym} está fuera del paréntesis: ${out}`), tr(locale, `${atomsWord(ans, "en")} of ${elName}`, `${atomsWord(ans, "es")} de ${elName}`)];
  return {
    prompt: [text(false)],
    say: text(true),
    input: "keypad",
    answer: { kind: "number", value: ans },
    hints: [
      tr(locale, "A number right after parentheses multiplies everything inside them.", "Un número justo después de un paréntesis multiplica todo lo que está adentro."),
      inner
        ? tr(locale, `Count ${sym} inside the parentheses and multiply by ${k}. Then add any ${sym} outside them.`, `Cuenta los ${sym} dentro del paréntesis y multiplica por ${k}. Luego suma los ${sym} de afuera.`)
        : tr(locale, `${sym} is outside the parentheses, so the ${k} does not apply to it.`, `${sym} está fuera del paréntesis, así que el ${k} no se le aplica.`),
      inner
        ? tr(locale, `Inside (${subscripts(group)}) there ${inner === 1 ? "is" : "are"} ${atomsWord(inner, "en")} of ${sym}.`, `Dentro de (${subscripts(group)}) hay ${atomsWord(inner, "es")} de ${sym}.`)
        : tr(locale, `Only the number right after ${sym} counts for ${elName}.`, `Solo el número justo después de ${sym} cuenta para el ${elName}.`),
    ],
    steps,
    seconds: 30,
  };
}

// ── The strand ──────────────────────────────────────────────────────────────────────────────────

export const SCIENCE_6_9: Skill[] = [
  {
    id: "s.cells",
    subject: "science",
    grade: "6",
    title: { en: "Cell parts and their jobs", es: "Las partes de la célula y sus funciones" },
    standard: "MS-LS1-2",
    prereqs: [],
    content: "draft",
    levels: 2,
    generate: fromBank("s.cells"),
  },
  {
    id: "s.variables",
    subject: "science",
    grade: "6",
    title: { en: "Variables and fair tests", es: "Variables y pruebas justas" },
    standard: "MS-ETS1",
    prereqs: [],
    content: "draft",
    levels: 2,
    generate: fromBank("s.variables"),
  },
  {
    id: "s.speed",
    subject: "science",
    grade: "6",
    title: { en: "Speed, distance and time", es: "Rapidez, distancia y tiempo" },
    standard: "MS-PS3-1",
    prereqs: [],
    content: "computed",
    levels: 2,
    generate: speedItem,
  },
  {
    id: "s.density",
    subject: "science",
    grade: "7",
    title: { en: "Density and floating", es: "Densidad y flotación" },
    standard: "MS-PS1-2",
    prereqs: ["s.speed"],
    content: "computed",
    levels: 2,
    generate: densityItem,
  },
  {
    id: "s.ecosystems",
    subject: "science",
    grade: "7",
    title: { en: "Relationships in ecosystems", es: "Relaciones en los ecosistemas" },
    standard: "MS-LS2-2",
    prereqs: [],
    content: "draft",
    levels: 1,
    generate: fromBank("s.ecosystems"),
  },
  {
    id: "s.plate.tectonics",
    subject: "science",
    grade: "7",
    title: { en: "Plate boundaries", es: "Límites de placas" },
    standard: "MS-ESS2-3",
    prereqs: [],
    content: "draft",
    levels: 1,
    generate: fromBank("s.plate.tectonics"),
  },
  {
    id: "s.atoms",
    subject: "science",
    grade: "8",
    title: { en: "Protons, neutrons and electrons", es: "Protones, neutrones y electrones" },
    standard: "MS-PS1-1",
    prereqs: [],
    content: "computed",
    levels: 2,
    generate: atomsItem,
  },
  {
    id: "s.chem.phys",
    subject: "science",
    grade: "8",
    title: { en: "Chemical and physical changes", es: "Cambios químicos y físicos" },
    standard: "MS-PS1-2",
    prereqs: ["s.atoms"],
    content: "draft",
    levels: 1,
    generate: fromBank("s.chem.phys"),
  },
  {
    id: "s.genetics",
    subject: "science",
    grade: "8",
    title: { en: "Punnett squares", es: "Cuadros de Punnett" },
    standard: "MS-LS3-2",
    prereqs: ["s.cells"],
    content: "computed",
    levels: 2,
    generate: geneticsItem,
  },
  {
    id: "s.newton",
    subject: "science",
    grade: "9",
    title: { en: "Force, mass and acceleration", es: "Fuerza, masa y aceleración" },
    standard: "HS-PS2-1",
    prereqs: ["s.speed"],
    content: "computed",
    levels: 2,
    generate: newtonItem,
  },
  {
    id: "s.newton.laws",
    subject: "science",
    grade: "9",
    title: { en: "Newton's three laws", es: "Las tres leyes de Newton" },
    standard: "HS-PS2-1",
    prereqs: ["s.newton"],
    content: "draft",
    levels: 1,
    generate: fromBank("s.newton.laws"),
  },
  {
    id: "s.ph",
    subject: "science",
    grade: "9",
    title: { en: "Acids, bases and pH", es: "Ácidos, bases y pH" },
    standard: "HS-PS1",
    prereqs: ["s.chem.phys"],
    content: "computed",
    levels: 1,
    generate: phItem,
  },
  {
    id: "s.formula.atoms",
    subject: "science",
    grade: "9",
    title: { en: "Counting atoms in formulas", es: "Contar átomos en fórmulas" },
    standard: "HS-PS1-7",
    prereqs: ["s.atoms"],
    content: "computed",
    levels: 2,
    generate: formulaItem,
  },
];
