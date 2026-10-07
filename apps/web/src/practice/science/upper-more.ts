import type { Locale } from "@/lib/types";
import type { Rng } from "../rng";
import { gcd } from "../rng";
import { tr } from "../text";
import type { Choice, ItemBody, Skill } from "../types";

// Grades 6–9 science, second strand (NGSS middle and early high school). Two kinds of skill:
// - computed: the answer is calculated here (moon phase from a date, rates from tables and graphs,
//   population tables, mixing water, scientific notation, kinetic and potential energy, wave speed,
//   balancing equations, momentum, Ohm's law, half-life, percent composition). Every value is built
//   backward from whole numbers of tenths (or other exact integers), so a key is never a
//   floating-point accident.
// - draft: hand-written banks, not yet teacher-reviewed. Each entry keeps English and Spanish side by
//   side, so one seed picks the same question in both languages.
// Every wrong choice names the mistake it stands for (`why`, kebab-case, reused within a skill), and
// typed answers list the likely wrong values, so a miss becomes a diagnosis.

type Bi = { en: string; es: string };
const bi = (en: string, es: string): Bi => ({ en, es });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ── Banks ───────────────────────────────────────────────────────────────────────────────────────

/** A wrong choice and the misconception it shows. */
export type Miss = { c: Bi; why: string };
const m = (why: string, en: string, es: string): Miss => ({ c: bi(en, es), why });
const mx = (why: string, c: Bi): Miss => ({ c, why });

/** One hand-written question: `a` is right, each wrong choice names its mistake, `clue` is hint 3, `explain` the worked step. */
export type Entry = { q: Bi; a: Bi; wrong: Miss[]; clue: Bi; explain: Bi };
/** A level's questions. `nudge` and `strategy` are hints 1 and 2 for every entry. */
export type Bank = { nudge: Bi; strategy: Bi; seconds: number; items: Entry[] };
const e = (q: Bi, a: Bi, wrong: Miss[], clue: Bi, explain: Bi): Entry => ({ q, a, wrong, clue, explain });

function bankItem(r: Rng, bank: Bank, locale: Locale): ItemBody {
  const entry = r.pick(bank.items);
  const right: { c: Bi; why?: string } = { c: entry.a };
  const order = r.shuffle([right, ...entry.wrong]);
  const answer = entry.a[locale];
  return {
    prompt: [entry.q[locale]],
    say: entry.q[locale],
    choices: order.map((o) => (o.why ? { label: o.c[locale], why: o.why } : { label: o.c[locale] })),
    input: "choices",
    answer: { kind: "choice", index: order.indexOf(right) },
    hints: [bank.nudge[locale], bank.strategy[locale], entry.clue[locale]],
    steps: [entry.explain[locale], tr(locale, `Answer: ${answer}`, `Respuesta: ${answer}`)],
    seconds: bank.seconds,
  };
}

// ── s.organelles ────────────────────────────────────────────────────────────────────────────────

const ORG_THEORY: Bank = {
  nudge: bi("Is the question about what all living things share, or about one kind of cell?", "¿La pregunta trata de lo que comparten todos los seres vivos o de un tipo de célula?"),
  strategy: bi(
    "The cell theory has three ideas: living things are made of cells, the cell is the basic unit of life, and new cells come only from existing cells. Prokaryotic cells have no nucleus; eukaryotic cells do.",
    "La teoría celular tiene tres ideas: los seres vivos están formados por células, la célula es la unidad básica de la vida y las células nuevas solo vienen de células que ya existen. Las células procariotas no tienen núcleo; las eucariotas sí.",
  ),
  seconds: 25,
  items: [
    e(
      bi("Which statement is part of the cell theory?", "¿Qué enunciado forma parte de la teoría celular?"),
      bi("All living things are made of one or more cells.", "Todos los seres vivos están formados por una o más células."),
      [
        m("overgeneralized-plant-cells", "All cells have a cell wall.", "Todas las células tienen pared celular."),
        m("spontaneous-generation", "Cells can form from nonliving matter.", "Las células pueden formarse a partir de materia sin vida."),
        m("only-some-living-things", "Only animals are made of cells.", "Solo los animales están formados por células."),
      ],
      bi("The idea covers every living thing, from bacteria to trees.", "La idea abarca a todos los seres vivos, desde las bacterias hasta los árboles."),
      bi("The cell theory says all living things are made of cells. Animal cells have no wall, and cells never form from nonliving matter.", "La teoría celular dice que todos los seres vivos están formados por células. Las células animales no tienen pared, y las células nunca se forman de materia sin vida."),
    ),
    e(
      bi("According to the cell theory, where do new cells come from?", "Según la teoría celular, ¿de dónde vienen las células nuevas?"),
      bi("From cells that already exist", "De células que ya existen"),
      [
        m("spontaneous-generation", "From nonliving materials such as mud or air", "De materiales sin vida, como el lodo o el aire"),
        m("food-becomes-cells", "Straight from the food an organism eats", "Directamente de los alimentos que come el organismo"),
        m("virus-as-cell", "From viruses that turn into cells", "De virus que se convierten en células"),
      ],
      bi("Think of one cell splitting into two.", "Piensa en una célula que se divide en dos."),
      bi("New cells form only when an existing cell divides. Food supplies materials and energy, but it does not turn into cells by itself.", "Las células nuevas solo se forman cuando una célula que ya existe se divide. Los alimentos aportan materiales y energía, pero no se convierten solos en células."),
    ),
    e(
      bi("What is the basic unit of structure and function in living things?", "¿Cuál es la unidad básica de estructura y función de los seres vivos?"),
      bi("The cell", "La célula"),
      [
        m("confused-atom-and-cell", "The atom", "El átomo"),
        m("too-large-level", "The tissue", "El tejido"),
        m("too-large-level", "The organ", "El órgano"),
      ],
      bi("It is the smallest thing that is alive on its own.", "Es lo más pequeño que está vivo por sí mismo."),
      bi("The cell is the smallest unit that carries out life. Atoms are not alive, and tissues and organs are built from many cells.", "La célula es la unidad más pequeña que realiza las funciones de la vida. Los átomos no están vivos, y los tejidos y órganos están formados por muchas células."),
    ),
    e(
      bi("In 1665, Robert Hooke looked at a thin slice of cork under a microscope. What did he see and name?", "En 1665, Robert Hooke observó una lámina delgada de corcho con un microscopio. ¿Qué vio y nombró?"),
      bi("Tiny box-like spaces he called cells", "Pequeños espacios en forma de caja que llamó células"),
      [
        m("confused-hooke-leeuwenhoek", "Bacteria swimming in a drop of water", "Bacterias nadando en una gota de agua"),
        m("thinks-nucleus-seen-first", "The nucleus inside each cell", "El núcleo dentro de cada célula"),
        m("confused-atom-and-cell", "Atoms packed together", "Átomos apretados unos con otros"),
      ],
      bi("Cork comes from dead bark, so only the empty walls were left.", "El corcho viene de corteza muerta, así que solo quedaban las paredes vacías."),
      bi("Hooke saw the empty walls of dead cork cells and called the little rooms cells. Living single-celled organisms were first seen by Leeuwenhoek.", "Hooke vio las paredes vacías de las células muertas del corcho y llamó células a los pequeños cuartos. Los organismos unicelulares vivos los vio primero Leeuwenhoek."),
    ),
    e(
      bi("Who was the first to see living single-celled organisms, using microscopes he made himself?", "¿Quién fue el primero en ver organismos unicelulares vivos, con microscopios que él mismo fabricó?"),
      bi("Anton van Leeuwenhoek", "Anton van Leeuwenhoek"),
      [
        m("confused-hooke-leeuwenhoek", "Robert Hooke", "Robert Hooke"),
        m("mixed-up-scientists", "Rudolf Virchow", "Rudolf Virchow"),
        m("mixed-up-scientists", "Charles Darwin", "Charles Darwin"),
      ],
      bi("He was a Dutch cloth seller who ground his own tiny lenses.", "Era un comerciante de telas holandés que pulía sus propias lentes diminutas."),
      bi("In the 1670s Leeuwenhoek saw tiny living things in pond water. Hooke had named cells by looking at dead cork.", "En la década de 1670, Leeuwenhoek vio seres vivos diminutos en agua de estanque. Hooke había nombrado las células al observar corcho muerto."),
    ),
    e(
      bi("Which pair of scientists concluded that all plants and all animals are made of cells?", "¿Qué pareja de científicos concluyó que todas las plantas y todos los animales están formados por células?"),
      bi("Matthias Schleiden and Theodor Schwann", "Matthias Schleiden y Theodor Schwann"),
      [
        m("confused-hooke-leeuwenhoek", "Robert Hooke and Anton van Leeuwenhoek", "Robert Hooke y Anton van Leeuwenhoek"),
        m("mixed-up-scientists", "James Watson and Francis Crick", "James Watson y Francis Crick"),
        m("mixed-up-scientists", "Charles Darwin and Gregor Mendel", "Charles Darwin y Gregor Mendel"),
      ],
      bi("One studied plants and the other studied animals, in the late 1830s.", "Uno estudió plantas y el otro animales, a fines de la década de 1830."),
      bi("Schleiden (plants) and Schwann (animals) gave the first part of the cell theory. Hooke and Leeuwenhoek came earlier, and Watson and Crick described DNA much later.", "Schleiden (plantas) y Schwann (animales) dieron la primera parte de la teoría celular. Hooke y Leeuwenhoek vinieron antes, y Watson y Crick describieron el ADN mucho después."),
    ),
    e(
      bi("Which scientist is known for stating that all cells come from other cells?", "¿Qué científico es conocido por afirmar que todas las células vienen de otras células?"),
      bi("Rudolf Virchow", "Rudolf Virchow"),
      [
        m("confused-hooke-leeuwenhoek", "Robert Hooke", "Robert Hooke"),
        m("mixed-up-scientists", "Theodor Schwann", "Theodor Schwann"),
        m("mixed-up-scientists", "Gregor Mendel", "Gregor Mendel"),
      ],
      bi("He was a German doctor who studied diseased cells in the 1850s.", "Era un médico alemán que estudió células enfermas en la década de 1850."),
      bi("In 1855 Virchow wrote that every cell comes from a cell. That idea completed the cell theory.", "En 1855, Virchow escribió que toda célula viene de otra célula. Esa idea completó la teoría celular."),
    ),
    e(
      bi("A bacterium has no nucleus. What kind of cell is it?", "Una bacteria no tiene núcleo. ¿Qué tipo de célula es?"),
      bi("A prokaryotic cell", "Una célula procariota"),
      [
        m("confused-prokaryote-eukaryote", "A eukaryotic cell", "Una célula eucariota"),
        m("bacteria-as-plant-or-animal", "A plant cell", "Una célula vegetal"),
        m("bacteria-as-plant-or-animal", "An animal cell", "Una célula animal"),
      ],
      bi("The word part pro means before: before a nucleus.", "La parte pro de la palabra significa antes: antes del núcleo."),
      bi("Cells without a nucleus are prokaryotic. Plant and animal cells have a nucleus, so they are eukaryotic.", "Las células sin núcleo son procariotas. Las células vegetales y animales tienen núcleo, así que son eucariotas."),
    ),
    e(
      bi("Where is the DNA in a prokaryotic cell such as a bacterium?", "¿Dónde está el ADN en una célula procariota, como una bacteria?"),
      bi("Loose in the cytoplasm, not inside a nucleus", "Suelto en el citoplasma, no dentro de un núcleo"),
      [
        m("confused-prokaryote-eukaryote", "Inside a nucleus", "Dentro de un núcleo"),
        m("dna-in-wrong-part", "Inside the cell wall", "Dentro de la pared celular"),
        m("thinks-bacteria-lack-dna", "Bacteria have no DNA", "Las bacterias no tienen ADN"),
      ],
      bi("Every cell needs DNA, but not every cell has a nucleus to keep it in.", "Toda célula necesita ADN, pero no toda célula tiene un núcleo donde guardarlo."),
      bi("Prokaryotic cells have DNA, but it sits in a region of the cytoplasm because there is no nucleus.", "Las células procariotas tienen ADN, pero está en una zona del citoplasma porque no hay núcleo."),
    ),
    e(
      bi("Which part do both prokaryotic and eukaryotic cells have?", "¿Qué parte tienen tanto las células procariotas como las eucariotas?"),
      bi("Ribosomes", "Ribosomas"),
      [
        m("confused-prokaryote-eukaryote", "A nucleus", "Un núcleo"),
        m("confused-prokaryote-eukaryote", "Mitochondria", "Mitocondrias"),
        m("overgeneralized-plant-cells", "Chloroplasts", "Cloroplastos"),
      ],
      bi("Every cell has to make proteins.", "Toda célula tiene que producir proteínas."),
      bi("All cells have ribosomes, a membrane, cytoplasm, and DNA. Only eukaryotic cells have a nucleus and mitochondria, and only plant and algae cells have chloroplasts.", "Todas las células tienen ribosomas, membrana, citoplasma y ADN. Solo las eucariotas tienen núcleo y mitocondrias, y solo las de plantas y algas tienen cloroplastos."),
    ),
    e(
      bi("An amoeba is made of just one cell. What is it called?", "Una ameba está formada por una sola célula. ¿Cómo se le llama?"),
      bi("A unicellular organism", "Un organismo unicelular"),
      [
        m("confused-unicellular-multicellular", "A multicellular organism", "Un organismo pluricelular"),
        m("too-large-level", "A tissue", "Un tejido"),
        m("virus-as-cell", "A virus", "Un virus"),
      ],
      bi("Uni means one.", "Uni significa uno."),
      bi("An organism made of a single cell is unicellular. A tissue is a group of many cells, and a virus is not a cell at all.", "Un organismo de una sola célula es unicelular. Un tejido es un grupo de muchas células, y un virus ni siquiera es una célula."),
    ),
    e(
      bi("Why does the cell theory not count a virus as a cell?", "¿Por qué la teoría celular no considera que un virus sea una célula?"),
      bi("It is not made of a cell and can copy itself only inside a living cell.", "No está formado por una célula y solo puede copiarse dentro de una célula viva."),
      [
        m("size-means-nonliving", "It is too small to see with a light microscope.", "Es demasiado pequeño para verlo con un microscopio óptico."),
        m("thinks-viruses-lack-genes", "It has no DNA or RNA.", "No tiene ADN ni ARN."),
        m("virus-as-bacterium", "It is a kind of bacterium.", "Es un tipo de bacteria."),
      ],
      bi("Ask what a virus can do on its own, outside a host.", "Pregúntate qué puede hacer un virus por sí solo, fuera de un huésped."),
      bi("A virus is genetic material in a protein coat. It has no cell parts of its own, so it must use a living cell to make copies.", "Un virus es material genético dentro de una cubierta de proteína. No tiene partes celulares propias, así que debe usar una célula viva para hacer copias."),
    ),
    e(
      bi("A scientist watches one yeast cell divide into two cells. Which idea of the cell theory does this show?", "Una científica observa cómo una célula de levadura se divide en dos células. ¿Qué idea de la teoría celular muestra esto?"),
      bi("New cells come from existing cells.", "Las células nuevas vienen de células que ya existen."),
      [
        m("wrong-tenet", "All living things are made of cells.", "Todos los seres vivos están formados por células."),
        m("spontaneous-generation", "Cells can form from nonliving matter.", "Las células pueden formarse a partir de materia sin vida."),
        m("only-some-living-things", "Only large organisms are made of cells.", "Solo los organismos grandes están formados por células."),
      ],
      bi("Focus on where the second cell came from.", "Fíjate de dónde salió la segunda célula."),
      bi("The new yeast cell came from a cell that already existed. That is the idea that cells come only from cells.", "La nueva célula de levadura salió de una célula que ya existía. Esa es la idea de que las células solo vienen de células."),
    ),
    e(
      bi("Which organism is multicellular?", "¿Qué organismo es pluricelular?"),
      bi("A mushroom", "Un hongo de sombrero"),
      [
        m("confused-unicellular-multicellular", "A bacterium", "Una bacteria"),
        m("confused-unicellular-multicellular", "A yeast cell", "Una levadura"),
        m("confused-unicellular-multicellular", "An amoeba", "Una ameba"),
      ],
      bi("Yeast and mushrooms are both fungi, but only one is built from many cells.", "La levadura y el hongo de sombrero son hongos, pero solo uno está formado por muchas células."),
      bi("A mushroom is made of many cells working together. Bacteria, yeast, and amoebas each live as a single cell.", "Un hongo de sombrero está formado por muchas células que trabajan juntas. Las bacterias, las levaduras y las amebas viven como una sola célula."),
    ),
  ],
};

const RIBO = bi("Ribosome", "Ribosoma");
const GOLGI = bi("Golgi apparatus", "Aparato de Golgi");
const RER = bi("Rough endoplasmic reticulum", "Retículo endoplasmático rugoso");
const SER = bi("Smooth endoplasmic reticulum", "Retículo endoplasmático liso");
const LYSO = bi("Lysosome", "Lisosoma");
const CYTO = bi("Cytoplasm", "Citoplasma");
const NUCLEOLUS = bi("Nucleolus", "Nucléolo");
const VESICLE = bi("Vesicle", "Vesícula");
const SKELETON = bi("Cytoskeleton", "Citoesqueleto");
const MITO = bi("Mitochondrion", "Mitocondria");
const NUCLEUS = bi("Nucleus", "Núcleo");
const VACUOLE = bi("Vacuole", "Vacuola");
const ENVELOPE = bi("Nuclear envelope", "Envoltura nuclear");
const MEMBRANE = bi("Cell membrane", "Membrana celular");

const ORG_PARTS: Bank = {
  nudge: bi("Name the job first, then find the part that does it.", "Primero nombra la función y luego busca la parte que la realiza."),
  strategy: bi(
    "Follow a protein: ribosomes build it, the rough ER carries it, the Golgi apparatus packs it, and a vesicle ships it. Lysosomes break things down, and mitochondria release energy.",
    "Sigue a una proteína: los ribosomas la fabrican, el retículo endoplasmático rugoso la transporta, el aparato de Golgi la empaca y una vesícula la envía. Los lisosomas descomponen cosas y las mitocondrias liberan energía.",
  ),
  seconds: 25,
  items: [
    e(
      bi("Which organelle builds proteins by linking amino acids together?", "¿Qué organelo fabrica proteínas al unir aminoácidos?"),
      RIBO,
      [mx("ribosome-golgi-mixup", GOLGI), mx("ribosome-lysosome-mixup", LYSO), mx("ribosome-mitochondria-mixup", MITO)],
      bi("It is tiny and found in every kind of cell, even bacteria.", "Es diminuto y está en todo tipo de célula, incluso en las bacterias."),
      bi("Ribosomes read instructions from the nucleus and join amino acids into proteins. The Golgi apparatus only packs proteins that are already made.", "Los ribosomas leen las instrucciones del núcleo y unen aminoácidos para formar proteínas. El aparato de Golgi solo empaca proteínas que ya están hechas."),
    ),
    e(
      bi("Which organelle sorts proteins, changes them, and packs them into small sacs to be shipped?", "¿Qué organelo clasifica proteínas, las modifica y las empaca en sacos pequeños para enviarlas?"),
      GOLGI,
      [mx("ribosome-golgi-mixup", RIBO), mx("golgi-er-mixup", RER), mx("golgi-vacuole-mixup", VACUOLE)],
      bi("Think of a post office that labels and sends packages.", "Piensa en una oficina de correos que etiqueta y envía paquetes."),
      bi("The Golgi apparatus finishes, sorts, and packs proteins into vesicles. Ribosomes make the proteins in the first place.", "El aparato de Golgi termina, clasifica y empaca las proteínas en vesículas. Los ribosomas son los que fabrican las proteínas."),
    ),
    e(
      bi("Which organelle is a system of folded membranes covered with ribosomes, where proteins are made and moved?", "¿Qué organelo es un sistema de membranas plegadas cubierto de ribosomas, donde se fabrican y transportan proteínas?"),
      RER,
      [mx("rough-smooth-er-mixup", SER), mx("golgi-er-mixup", GOLGI), mx("er-envelope-mixup", ENVELOPE)],
      bi("The ribosomes on its surface make it look bumpy.", "Los ribosomas de su superficie la hacen ver rugosa."),
      bi("Ribosomes stud the rough ER, so proteins are made there and then moved through its channels. Smooth ER has no ribosomes.", "Los ribosomas cubren el retículo endoplasmático rugoso, así que allí se fabrican proteínas que luego viajan por sus canales. El liso no tiene ribosomas."),
    ),
    e(
      bi("Which organelle has no ribosomes on it and makes fats and oils (lipids)?", "¿Qué organelo no tiene ribosomas y produce grasas y aceites (lípidos)?"),
      SER,
      [mx("rough-smooth-er-mixup", RER), mx("ribosome-golgi-mixup", RIBO), mx("ribosome-lysosome-mixup", LYSO)],
      bi("Its name tells you its surface is not bumpy.", "Su nombre te dice que su superficie no es rugosa."),
      bi("The smooth ER makes lipids, such as the fats in cell membranes. The rough ER, with ribosomes, works on proteins.", "El retículo endoplasmático liso produce lípidos, como las grasas de las membranas. El rugoso, con ribosomas, trabaja con proteínas."),
    ),
    e(
      bi("Which organelle holds digestive enzymes that break down worn-out cell parts and food particles?", "¿Qué organelo contiene enzimas digestivas que descomponen partes gastadas de la célula y partículas de alimento?"),
      LYSO,
      [mx("ribosome-lysosome-mixup", RIBO), mx("lysosome-mitochondria-mixup", MITO), mx("golgi-vacuole-mixup", GOLGI)],
      bi("Lysis means breaking apart.", "Lisis significa romper o deshacer."),
      bi("Lysosomes are sacs of enzymes that digest old parts and particles. Mitochondria release energy from sugar; they do not digest cell parts.", "Los lisosomas son sacos de enzimas que digieren partes viejas y partículas. Las mitocondrias liberan energía del azúcar; no digieren partes de la célula."),
    ),
    e(
      bi("What is the jelly-like fluid that fills the cell and holds the organelles?", "¿Cuál es el líquido gelatinoso que llena la célula y sostiene a los organelos?"),
      CYTO,
      [mx("cytoplasm-nucleus-mixup", NUCLEUS), mx("cytoplasm-vacuole-mixup", VACUOLE), mx("cytoplasm-membrane-mixup", MEMBRANE)],
      bi("Many of the cell's chemical reactions happen in it.", "En él ocurren muchas de las reacciones químicas de la célula."),
      bi("The cytoplasm is the fluid between the membrane and the nucleus, where organelles sit. A vacuole is a separate storage sac.", "El citoplasma es el líquido entre la membrana y el núcleo, donde están los organelos. Una vacuola es un saco aparte para guardar cosas."),
    ),
    e(
      bi("Which dark spot inside the nucleus makes the parts of ribosomes?", "¿Qué mancha oscura dentro del núcleo produce las partes de los ribosomas?"),
      NUCLEOLUS,
      [mx("ribosome-golgi-mixup", GOLGI), mx("nucleolus-envelope-mixup", ENVELOPE), mx("ribosome-lysosome-mixup", LYSO)],
      bi("Its name sounds like a small nucleus inside the nucleus.", "Su nombre suena a un núcleo pequeño dentro del núcleo."),
      bi("The nucleolus assembles ribosome parts, which then leave the nucleus to make proteins.", "El nucléolo arma las partes de los ribosomas, que luego salen del núcleo para fabricar proteínas."),
    ),
    e(
      bi("What surrounds the nucleus and has pores that let messages move out to the ribosomes?", "¿Qué rodea al núcleo y tiene poros que dejan salir mensajes hacia los ribosomas?"),
      ENVELOPE,
      [mx("cytoplasm-membrane-mixup", MEMBRANE), mx("nucleolus-envelope-mixup", NUCLEOLUS), mx("er-envelope-mixup", SER)],
      bi("It is a double layer of membrane around just one organelle.", "Es una doble capa de membrana alrededor de un solo organelo."),
      bi("The nuclear envelope is a double membrane around the nucleus. Its pores let RNA messages travel out to the ribosomes.", "La envoltura nuclear es una doble membrana alrededor del núcleo. Sus poros dejan salir mensajes de ARN hacia los ribosomas."),
    ),
    e(
      bi("What are the small membrane sacs that carry materials from one part of the cell to another?", "¿Cómo se llaman los sacos pequeños de membrana que llevan sustancias de una parte de la célula a otra?"),
      VESICLE,
      [mx("ribosome-golgi-mixup", RIBO), mx("golgi-vacuole-mixup", VACUOLE), mx("cytoplasm-nucleus-mixup", NUCLEOLUS)],
      bi("Think of delivery trucks that bud off the Golgi apparatus.", "Piensa en camiones de reparto que se separan del aparato de Golgi."),
      bi("Vesicles pinch off from the ER and Golgi and carry materials to where they are needed, including the cell membrane.", "Las vesículas se desprenden del retículo y del aparato de Golgi y llevan sustancias a donde se necesitan, incluida la membrana celular."),
    ),
    e(
      bi("What network of protein fibers gives an animal cell its shape and helps it move?", "¿Qué red de fibras de proteína le da su forma a una célula animal y la ayuda a moverse?"),
      SKELETON,
      [mx("skeleton-wall-mixup", bi("Cell wall", "Pared celular")), mx("cytoplasm-membrane-mixup", MEMBRANE), mx("golgi-er-mixup", RER)],
      bi("Animal cells have no wall, so their support comes from inside.", "Las células animales no tienen pared, así que su soporte viene de adentro."),
      bi("The cytoskeleton is a frame of protein fibers inside the cell. Animal cells have no cell wall.", "El citoesqueleto es un armazón de fibras de proteína dentro de la célula. Las células animales no tienen pared celular."),
    ),
    e(
      bi("A cell makes a protein that it will send outside the cell. Which path does the protein most likely follow?", "Una célula fabrica una proteína que enviará fuera de la célula. ¿Qué camino sigue con mayor probabilidad la proteína?"),
      bi("Ribosome on the rough ER, then Golgi apparatus, then vesicle, then cell membrane", "Ribosoma en el retículo rugoso, luego aparato de Golgi, luego vesícula y luego membrana celular"),
      [
        m("pathway-out-of-order", "Golgi apparatus, then ribosome, then nucleus, then cell membrane", "Aparato de Golgi, luego ribosoma, luego núcleo y luego membrana celular"),
        m("ribosome-mitochondria-mixup", "Mitochondrion, then lysosome, then cell membrane", "Mitocondria, luego lisosoma y luego membrana celular"),
        m("golgi-vacuole-mixup", "Nucleus, then vacuole, then cell wall", "Núcleo, luego vacuola y luego pared celular"),
      ],
      bi("A protein has to be made before it can be packed and shipped.", "Una proteína tiene que fabricarse antes de poder empacarse y enviarse."),
      bi("The protein is built on a ribosome of the rough ER, finished and packed in the Golgi apparatus, and carried in a vesicle to the membrane.", "La proteína se fabrica en un ribosoma del retículo rugoso, se termina y empaca en el aparato de Golgi y viaja en una vesícula hasta la membrana."),
    ),
    e(
      bi("A white blood cell swallows bacteria and breaks them down. Which organelle would you expect it to have many of?", "Un glóbulo blanco se traga bacterias y las descompone. ¿De qué organelo esperarías que tuviera muchos?"),
      bi("Lysosomes", "Lisosomas"),
      [
        m("ribosome-lysosome-mixup", "Ribosomes", "Ribosomas"),
        m("overgeneralized-plant-cells", "Chloroplasts", "Cloroplastos"),
        m("golgi-vacuole-mixup", "Large central vacuoles", "Vacuolas centrales grandes"),
      ],
      bi("Which organelle holds the enzymes that digest things?", "¿Qué organelo guarda las enzimas que digieren cosas?"),
      bi("Breaking down bacteria takes digestive enzymes, which are stored in lysosomes. Animal cells have no chloroplasts or large central vacuole.", "Descomponer bacterias requiere enzimas digestivas, que se guardan en los lisosomas. Las células animales no tienen cloroplastos ni vacuola central grande."),
    ),
    e(
      bi("Cells in the pancreas make large amounts of digestive enzymes, which are proteins sent out of the cell. Which organelles would they have many of?", "Las células del páncreas producen grandes cantidades de enzimas digestivas, que son proteínas que salen de la célula. ¿De qué organelos tendrían muchos?"),
      bi("Rough ER and Golgi apparatus", "Retículo rugoso y aparato de Golgi"),
      [
        m("rough-smooth-er-mixup", "Smooth ER and lysosomes", "Retículo liso y lisosomas"),
        m("overgeneralized-plant-cells", "Chloroplasts and cell walls", "Cloroplastos y paredes celulares"),
        m("cytoplasm-vacuole-mixup", "Vacuoles and nucleoli", "Vacuolas y nucléolos"),
      ],
      bi("Making proteins to export uses the same parts as the shipping path.", "Fabricar proteínas para exportar usa las mismas partes que el camino de envío."),
      bi("Proteins for export are made on the rough ER and packed by the Golgi apparatus, so these cells have a lot of both.", "Las proteínas para exportar se fabrican en el retículo rugoso y las empaca el aparato de Golgi, así que estas células tienen mucho de ambos."),
    ),
    e(
      bi("A hummingbird beats its wings dozens of times a second. Which organelle would its flight muscle cells have many of?", "Un colibrí bate las alas decenas de veces por segundo. ¿De qué organelo tendrían muchas las células de sus músculos de vuelo?"),
      bi("Mitochondria", "Mitocondrias"),
      [
        m("ribosome-mitochondria-mixup", "Ribosomes", "Ribosomas"),
        m("lysosome-mitochondria-mixup", "Lysosomes", "Lisosomas"),
        m("golgi-vacuole-mixup", "Vesicles", "Vesículas"),
      ],
      bi("Flying uses a lot of energy.", "Volar usa mucha energía."),
      bi("Mitochondria release energy from sugar, so cells that work hard all the time have many of them.", "Las mitocondrias liberan energía del azúcar, así que las células que trabajan mucho todo el tiempo tienen muchas."),
    ),
  ],
};

// ── s.body.systems ──────────────────────────────────────────────────────────────────────────────

const CIRC = bi("Circulatory system", "Sistema circulatorio");
const RESP = bi("Respiratory system", "Sistema respiratorio");
const DIGEST = bi("Digestive system", "Sistema digestivo");
const NERV = bi("Nervous system", "Sistema nervioso");
const ENDO = bi("Endocrine system", "Sistema endocrino");
const EXCR = bi("Excretory (urinary) system", "Sistema excretor (urinario)");
const IMMUNE = bi("Immune system", "Sistema inmunitario");
const SKEL = bi("Skeletal system", "Sistema óseo");
const MUSC = bi("Muscular system", "Sistema muscular");
const SKIN = bi("Integumentary system (skin)", "Sistema tegumentario (piel)");

const BODY_JOBS: Bank = {
  nudge: bi("What does the body need done here: moving, breathing, eating, signaling, cleaning, or defending?", "¿Qué necesita hacer el cuerpo aquí: moverse, respirar, alimentarse, enviar señales, limpiar o defenderse?"),
  strategy: bi(
    "Match the job to the system: circulatory carries, respiratory exchanges gases, digestive breaks down food, nervous sends signals, endocrine sends hormones, excretory filters blood, immune defends.",
    "Relaciona la función con el sistema: el circulatorio transporta, el respiratorio intercambia gases, el digestivo descompone el alimento, el nervioso envía señales, el endocrino envía hormonas, el excretor filtra la sangre y el inmunitario defiende.",
  ),
  seconds: 20,
  items: [
    e(
      bi("Which body system carries oxygen, nutrients, and wastes around the body in the blood?", "¿Qué sistema del cuerpo lleva oxígeno, nutrientes y desechos por todo el cuerpo en la sangre?"),
      CIRC,
      [mx("respiratory-circulatory-mixup", RESP), mx("wrong-system-job", DIGEST), mx("nervous-carries-materials", NERV)],
      bi("It includes the heart and the blood vessels.", "Incluye el corazón y los vasos sanguíneos."),
      bi("The circulatory system moves blood through vessels, and the blood carries oxygen, nutrients, and wastes.", "El sistema circulatorio mueve la sangre por los vasos, y la sangre lleva oxígeno, nutrientes y desechos."),
    ),
    e(
      bi("Which body system takes in oxygen and gets rid of carbon dioxide?", "¿Qué sistema del cuerpo toma oxígeno y elimina dióxido de carbono?"),
      RESP,
      [mx("respiratory-circulatory-mixup", CIRC), mx("wrong-system-job", EXCR), mx("wrong-system-job", DIGEST)],
      bi("It includes the nose, the windpipe, and the lungs.", "Incluye la nariz, la tráquea y los pulmones."),
      bi("The respiratory system brings air into the lungs, where oxygen enters the blood and carbon dioxide leaves it.", "El sistema respiratorio lleva aire a los pulmones, donde el oxígeno entra a la sangre y el dióxido de carbono sale de ella."),
    ),
    e(
      bi("Which body system breaks food down into nutrients the body can absorb?", "¿Qué sistema del cuerpo descompone el alimento en nutrientes que el cuerpo puede absorber?"),
      DIGEST,
      [mx("digestive-excretory-mixup", EXCR), mx("wrong-system-job", CIRC), mx("nervous-endocrine-mixup", ENDO)],
      bi("It starts at the mouth.", "Empieza en la boca."),
      bi("The digestive system breaks food into small molecules that pass into the blood. The excretory system removes wastes from the blood.", "El sistema digestivo descompone el alimento en moléculas pequeñas que pasan a la sangre. El sistema excretor elimina desechos de la sangre."),
    ),
    e(
      bi("Which organ absorbs most of the nutrients from digested food?", "¿Qué órgano absorbe la mayor parte de los nutrientes del alimento digerido?"),
      bi("Small intestine", "Intestino delgado"),
      [
        m("thinks-stomach-absorbs-most", "Stomach", "Estómago"),
        m("large-small-intestine-mixup", "Large intestine", "Intestino grueso"),
        m("wrong-organ-job", "Esophagus", "Esófago"),
      ],
      bi("This long, folded tube comes right after the stomach.", "Este tubo largo y plegado viene justo después del estómago."),
      bi("Most nutrients pass into the blood through the walls of the small intestine. The large intestine mostly absorbs water.", "La mayoría de los nutrientes pasan a la sangre por las paredes del intestino delgado. El intestino grueso absorbe sobre todo agua."),
    ),
    e(
      bi("Which body system uses the brain, spinal cord, and nerves to send signals through the body?", "¿Qué sistema del cuerpo usa el cerebro, la médula espinal y los nervios para enviar señales por el cuerpo?"),
      NERV,
      [mx("nervous-endocrine-mixup", ENDO), mx("wrong-system-job", MUSC), mx("wrong-system-job", CIRC)],
      bi("Its signals travel as electrical messages along nerve cells.", "Sus señales viajan como mensajes eléctricos por las células nerviosas."),
      bi("The nervous system sends fast electrical signals. The endocrine system sends slower chemical messages called hormones.", "El sistema nervioso envía señales eléctricas rápidas. El sistema endocrino envía mensajes químicos más lentos llamados hormonas."),
    ),
    e(
      bi("Which body system uses glands to release hormones into the blood?", "¿Qué sistema del cuerpo usa glándulas para liberar hormonas en la sangre?"),
      ENDO,
      [mx("nervous-endocrine-mixup", NERV), mx("wrong-system-job", DIGEST), mx("wrong-system-job", IMMUNE)],
      bi("The thyroid and the pancreas are two of its glands.", "La tiroides y el páncreas son dos de sus glándulas."),
      bi("Endocrine glands release hormones, chemical messages that the blood carries to other organs.", "Las glándulas endocrinas liberan hormonas, mensajes químicos que la sangre lleva a otros órganos."),
    ),
    e(
      bi("Which body system filters wastes out of the blood and makes urine?", "¿Qué sistema del cuerpo filtra desechos de la sangre y produce orina?"),
      EXCR,
      [mx("digestive-excretory-mixup", DIGEST), mx("wrong-system-job", CIRC), mx("wrong-system-job", RESP)],
      bi("Its main organs are the kidneys and the bladder.", "Sus órganos principales son los riñones y la vejiga."),
      bi("The kidneys filter the blood and make urine, which the bladder stores. The digestive system handles food, not blood.", "Los riñones filtran la sangre y producen orina, que se guarda en la vejiga. El sistema digestivo procesa el alimento, no la sangre."),
    ),
    e(
      bi("Which organs filter the blood to remove wastes and extra water?", "¿Qué órganos filtran la sangre para quitarle desechos y agua de más?"),
      bi("Kidneys", "Riñones"),
      [m("wrong-organ-job", "Lungs", "Pulmones"), m("wrong-organ-job", "Heart", "Corazón"), m("thinks-stomach-absorbs-most", "Stomach", "Estómago")],
      bi("There are two of them, one on each side of the lower back.", "Son dos, uno a cada lado de la parte baja de la espalda."),
      bi("The kidneys filter the blood and send wastes and extra water out as urine.", "Los riñones filtran la sangre y sacan los desechos y el agua de más en forma de orina."),
    ),
    e(
      bi("Besides holding the body up, what else do bones do?", "Además de sostener el cuerpo, ¿qué más hacen los huesos?"),
      bi("Protect organs and make blood cells", "Protegen órganos y producen células de la sangre"),
      [
        m("wrong-organ-job", "Pump blood through the body", "Bombean sangre por el cuerpo"),
        m("wrong-system-job", "Break down food", "Descomponen el alimento"),
        m("skeletal-muscular-mixup", "Contract to make the body move", "Se contraen para mover el cuerpo"),
      ],
      bi("Think of the skull and the soft marrow inside some bones.", "Piensa en el cráneo y en la médula blanda dentro de algunos huesos."),
      bi("Bones protect organs, like the skull around the brain, and marrow inside bones makes blood cells. Muscles, not bones, contract.", "Los huesos protegen órganos, como el cráneo al cerebro, y la médula de los huesos produce células de la sangre. Los músculos, no los huesos, se contraen."),
    ),
    e(
      bi("Which body system fights germs that cause disease?", "¿Qué sistema del cuerpo combate los microbios que causan enfermedades?"),
      IMMUNE,
      [mx("immune-circulatory-mixup", CIRC), mx("nervous-endocrine-mixup", ENDO), mx("wrong-system-job", SKEL)],
      bi("White blood cells and antibodies belong to it.", "Los glóbulos blancos y los anticuerpos pertenecen a él."),
      bi("The immune system finds and destroys germs. White blood cells travel in the blood, but defending the body is the immune system's job.", "El sistema inmunitario encuentra y destruye microbios. Los glóbulos blancos viajan en la sangre, pero defender el cuerpo es tarea del sistema inmunitario."),
    ),
    e(
      bi("How do muscles move bones?", "¿Cómo mueven los músculos a los huesos?"),
      bi("They contract (get shorter) and pull on the bones.", "Se contraen (se acortan) y jalan de los huesos."),
      [
        m("thinks-muscles-push", "They push the bones away from them.", "Empujan los huesos para alejarlos."),
        m("skeletal-muscular-mixup", "The bones move on their own, and the muscles follow.", "Los huesos se mueven solos y los músculos los siguen."),
        m("thinks-nerves-move-bones", "Nerves grab the bones and move them.", "Los nervios agarran los huesos y los mueven."),
      ],
      bi("A muscle can only pull, never push.", "Un músculo solo puede jalar, nunca empujar."),
      bi("Muscles attached to bones by tendons contract and pull. Nerves tell the muscles when to contract.", "Los músculos unidos a los huesos por tendones se contraen y jalan. Los nervios les indican cuándo contraerse."),
    ),
    e(
      bi("Which body system includes the skin and helps control body temperature by sweating?", "¿Qué sistema del cuerpo incluye la piel y ayuda a controlar la temperatura del cuerpo con el sudor?"),
      SKIN,
      [mx("wrong-system-job", RESP), mx("wrong-system-job", SKEL), mx("wrong-system-job", DIGEST)],
      bi("It is the body's largest organ system, and it covers you.", "Es el sistema de órganos más grande del cuerpo, y te cubre."),
      bi("The integumentary system is the skin, hair, and nails. Sweat on the skin cools the body as it evaporates.", "El sistema tegumentario es la piel, el pelo y las uñas. El sudor en la piel enfría el cuerpo al evaporarse."),
    ),
    e(
      bi("Which organ pumps blood through the body?", "¿Qué órgano bombea la sangre por el cuerpo?"),
      bi("Heart", "Corazón"),
      [m("respiratory-circulatory-mixup", "Lungs", "Pulmones"), m("wrong-organ-job", "Brain", "Cerebro"), m("wrong-organ-job", "Liver", "Hígado")],
      bi("It is a muscle that never takes a rest.", "Es un músculo que nunca descansa."),
      bi("The heart is a muscular pump of the circulatory system. The lungs exchange gases but do not pump blood.", "El corazón es la bomba muscular del sistema circulatorio. Los pulmones intercambian gases, pero no bombean sangre."),
    ),
    e(
      bi("Inside the lungs, where does oxygen pass into the blood?", "Dentro de los pulmones, ¿dónde pasa el oxígeno a la sangre?"),
      bi("Tiny air sacs called alveoli", "Pequeños sacos de aire llamados alvéolos"),
      [
        m("airway-mixup", "The trachea (windpipe)", "La tráquea"),
        m("respiratory-circulatory-mixup", "The heart", "El corazón"),
        m("airway-food-pipe-mixup", "The esophagus", "El esófago"),
      ],
      bi("The airways end in millions of tiny sacs wrapped in blood vessels.", "Las vías respiratorias terminan en millones de sacos diminutos rodeados de vasos sanguíneos."),
      bi("The alveoli have very thin walls covered in capillaries, so oxygen moves into the blood and carbon dioxide moves out.", "Los alvéolos tienen paredes muy delgadas cubiertas de capilares, así que el oxígeno pasa a la sangre y el dióxido de carbono sale."),
    ),
  ],
};

const BODY_TOGETHER: Bank = {
  nudge: bi("Which systems does this need: one to sense or control, one to carry, one to do the job?", "¿Qué sistemas se necesitan: uno que detecte o controle, uno que transporte y uno que haga el trabajo?"),
  strategy: bi(
    "Trace what moves: oxygen and nutrients travel in the blood, signals travel along nerves, hormones travel in the blood. Name every system the material or signal passes through.",
    "Sigue lo que se mueve: el oxígeno y los nutrientes viajan en la sangre, las señales por los nervios y las hormonas en la sangre. Nombra cada sistema por el que pasa la sustancia o la señal.",
  ),
  seconds: 30,
  items: [
    e(
      bi("When you run, your breathing and your heart rate both speed up. Why?", "Cuando corres, tu respiración y tu ritmo cardíaco se aceleran. ¿Por qué?"),
      bi("Your muscles need more oxygen and must get rid of more carbon dioxide.", "Tus músculos necesitan más oxígeno y deben eliminar más dióxido de carbono."),
      [
        m("respiratory-circulatory-mixup", "Your lungs start pumping blood faster.", "Tus pulmones empiezan a bombear sangre más rápido."),
        m("reversed-cause", "Your muscles stop using oxygen while you run.", "Tus músculos dejan de usar oxígeno mientras corres."),
        m("wrong-system-job", "Your stomach needs extra air to digest food.", "Tu estómago necesita aire extra para digerir."),
      ],
      bi("Working muscles release more energy from sugar, and that uses oxygen.", "Los músculos que trabajan liberan más energía del azúcar, y eso usa oxígeno."),
      bi("Faster breathing brings in more oxygen, and a faster heart delivers it to the muscles and carries carbon dioxide back to the lungs.", "Respirar más rápido trae más oxígeno, y un corazón más rápido lo lleva a los músculos y regresa el dióxido de carbono a los pulmones."),
    ),
    e(
      bi("After a meal, how do nutrients reach your muscle cells?", "Después de comer, ¿cómo llegan los nutrientes a las células de tus músculos?"),
      bi("The digestive system absorbs them into the blood, and the circulatory system carries them.", "El sistema digestivo los absorbe hacia la sangre y el sistema circulatorio los transporta."),
      [
        m("wrong-system-job", "The respiratory system breathes them into the muscles.", "El sistema respiratorio los inhala hacia los músculos."),
        m("nervous-carries-materials", "The nervous system carries them along the nerves.", "El sistema nervioso los lleva por los nervios."),
        m("thinks-stomach-absorbs-most", "They wait in the stomach until a muscle needs them.", "Esperan en el estómago hasta que un músculo los necesita."),
      ],
      bi("Nutrients enter the blood through the walls of the small intestine.", "Los nutrientes entran a la sangre por las paredes del intestino delgado."),
      bi("Digested food is absorbed in the small intestine, and the blood carries the nutrients to every cell.", "El alimento digerido se absorbe en el intestino delgado, y la sangre lleva los nutrientes a todas las células."),
    ),
    e(
      bi("You touch a hot pan and pull your hand away before you even feel pain. Which two systems worked together?", "Tocas una sartén caliente y retiras la mano antes de sentir dolor. ¿Qué dos sistemas trabajaron juntos?"),
      bi("Nervous and muscular", "Nervioso y muscular"),
      [
        m("wrong-system-job", "Digestive and skeletal", "Digestivo y óseo"),
        m("nervous-endocrine-mixup", "Endocrine and respiratory", "Endocrino y respiratorio"),
        m("wrong-system-job", "Circulatory and excretory", "Circulatorio y excretor"),
      ],
      bi("A fast signal had to reach the muscles in your arm.", "Una señal rápida tuvo que llegar a los músculos de tu brazo."),
      bi("Nerves carried a signal to the spinal cord and back, and arm muscles contracted to pull the hand away. This quick response is a reflex.", "Los nervios llevaron una señal a la médula espinal y de regreso, y los músculos del brazo se contrajeron para retirar la mano. Esta respuesta rápida es un reflejo."),
    ),
    e(
      bi("Blood carries wastes from your cells to your kidneys. Which two systems are working together?", "La sangre lleva desechos de tus células a tus riñones. ¿Qué dos sistemas trabajan juntos?"),
      bi("Circulatory and excretory", "Circulatorio y excretor"),
      [
        m("digestive-excretory-mixup", "Digestive and respiratory", "Digestivo y respiratorio"),
        m("wrong-system-job", "Nervous and muscular", "Nervioso y muscular"),
        m("wrong-system-job", "Immune and skeletal", "Inmunitario y óseo"),
      ],
      bi("One system does the carrying and the other does the filtering.", "Un sistema transporta y el otro filtra."),
      bi("The circulatory system brings the blood to the kidneys, and the excretory system filters out the wastes.", "El sistema circulatorio lleva la sangre a los riñones, y el sistema excretor filtra los desechos."),
    ),
    e(
      bi("Your biceps contracts to bend your elbow. What straightens the arm again?", "Tu bíceps se contrae para doblar el codo. ¿Qué vuelve a estirar el brazo?"),
      bi("The triceps on the back of the arm contracts and pulls the other way.", "El tríceps, en la parte de atrás del brazo, se contrae y jala en sentido contrario."),
      [
        m("thinks-muscles-push", "The biceps pushes the arm straight.", "El bíceps empuja el brazo para estirarlo."),
        m("skeletal-muscular-mixup", "The bones straighten themselves.", "Los huesos se estiran solos."),
        m("thinks-nerves-move-bones", "The nerves in the elbow push it open.", "Los nervios del codo lo empujan para abrirlo."),
      ],
      bi("Muscles only pull, so they work in pairs.", "Los músculos solo jalan, así que trabajan en pares."),
      bi("The biceps and triceps are a pair: one pulls to bend the arm and the other pulls to straighten it.", "El bíceps y el tríceps son un par: uno jala para doblar el brazo y el otro jala para estirarlo."),
    ),
    e(
      bi("When you are frightened, a hormone called adrenaline makes your heart beat faster. Which system releases adrenaline?", "Cuando te asustas, una hormona llamada adrenalina hace que tu corazón lata más rápido. ¿Qué sistema libera la adrenalina?"),
      ENDO,
      [mx("wrong-system-job", DIGEST), mx("wrong-system-job", SKEL), mx("immune-circulatory-mixup", IMMUNE)],
      bi("Hormones come from glands.", "Las hormonas vienen de glándulas."),
      bi("The adrenal glands of the endocrine system release adrenaline into the blood, and it reaches the heart.", "Las glándulas suprarrenales del sistema endocrino liberan adrenalina en la sangre, y esta llega al corazón."),
    ),
    e(
      bi("Air enters through your nose. Which path does the oxygen follow to reach your blood?", "El aire entra por tu nariz. ¿Qué camino sigue el oxígeno para llegar a tu sangre?"),
      bi("Nose, trachea, bronchi, alveoli in the lungs, then blood", "Nariz, tráquea, bronquios, alvéolos de los pulmones y luego la sangre"),
      [
        m("airway-food-pipe-mixup", "Nose, esophagus, stomach, then blood", "Nariz, esófago, estómago y luego la sangre"),
        m("respiratory-circulatory-mixup", "Nose, heart, lungs, then blood", "Nariz, corazón, pulmones y luego la sangre"),
        m("airway-mixup", "Nose, bronchi, trachea, then blood", "Nariz, bronquios, tráquea y luego la sangre"),
      ],
      bi("The windpipe splits into two branches, one for each lung.", "La tráquea se divide en dos ramas, una para cada pulmón."),
      bi("Air goes down the trachea, into the bronchi, and on to the alveoli, where oxygen crosses into the capillaries.", "El aire baja por la tráquea, entra a los bronquios y llega a los alvéolos, donde el oxígeno pasa a los capilares."),
    ),
    e(
      bi("Which path does food take through the digestive system?", "¿Qué camino sigue el alimento por el sistema digestivo?"),
      bi("Mouth, esophagus, stomach, small intestine, large intestine", "Boca, esófago, estómago, intestino delgado, intestino grueso"),
      [
        m("intestine-order-reversed", "Mouth, esophagus, stomach, large intestine, small intestine", "Boca, esófago, estómago, intestino grueso, intestino delgado"),
        m("airway-food-pipe-mixup", "Mouth, trachea, stomach, small intestine, large intestine", "Boca, tráquea, estómago, intestino delgado, intestino grueso"),
        m("wrong-organ-job", "Mouth, stomach, kidneys, small intestine, large intestine", "Boca, estómago, riñones, intestino delgado, intestino grueso"),
      ],
      bi("Nutrients are absorbed before water is.", "Los nutrientes se absorben antes que el agua."),
      bi("Food goes down the esophagus to the stomach, then the small intestine absorbs nutrients and the large intestine absorbs water.", "El alimento baja por el esófago al estómago; luego el intestino delgado absorbe los nutrientes y el intestino grueso absorbe el agua."),
    ),
    e(
      bi("White blood cells travel to a cut on your knee to fight germs. Which two systems are working together?", "Los glóbulos blancos viajan a una cortada en tu rodilla para combatir microbios. ¿Qué dos sistemas trabajan juntos?"),
      bi("Immune and circulatory", "Inmunitario y circulatorio"),
      [
        m("wrong-system-job", "Nervous and muscular", "Nervioso y muscular"),
        m("digestive-excretory-mixup", "Digestive and excretory", "Digestivo y excretor"),
        m("wrong-system-job", "Skeletal and respiratory", "Óseo y respiratorio"),
      ],
      bi("The defenders ride in the blood.", "Los defensores viajan en la sangre."),
      bi("White blood cells belong to the immune system, and the circulatory system carries them to the cut.", "Los glóbulos blancos pertenecen al sistema inmunitario, y el sistema circulatorio los lleva a la cortada."),
    ),
    e(
      bi("On a hot day your body starts to sweat. Which system senses that you are too hot and triggers the sweating?", "En un día caluroso tu cuerpo empieza a sudar. ¿Qué sistema detecta que tienes demasiado calor y activa el sudor?"),
      NERV,
      [mx("wrong-system-job", DIGEST), mx("wrong-system-job", SKEL), mx("wrong-system-job", RESP)],
      bi("Something has to sense the temperature and send a signal to the skin.", "Algo tiene que detectar la temperatura y enviar una señal a la piel."),
      bi("The brain senses body temperature and signals sweat glands in the skin. Evaporating sweat cools the body.", "El cerebro detecta la temperatura del cuerpo y envía señales a las glándulas sudoríparas de la piel. El sudor, al evaporarse, enfría el cuerpo."),
    ),
    e(
      bi("Where are new red blood cells made?", "¿Dónde se producen los glóbulos rojos nuevos?"),
      bi("In the marrow inside bones", "En la médula, dentro de los huesos"),
      [m("wrong-organ-job", "In the heart", "En el corazón"), m("wrong-organ-job", "In the lungs", "En los pulmones"), m("thinks-stomach-absorbs-most", "In the stomach", "En el estómago")],
      bi("This is one way the skeletal system helps the circulatory system.", "Esta es una forma en que el sistema óseo ayuda al circulatorio."),
      bi("Red marrow inside bones makes red blood cells, which then travel in the blood.", "La médula roja dentro de los huesos produce los glóbulos rojos, que luego viajan en la sangre."),
    ),
    e(
      bi("A disease damages the alveoli in a person's lungs. Why might the person feel tired after a short walk?", "Una enfermedad daña los alvéolos de los pulmones de una persona. ¿Por qué podría cansarse después de caminar un poco?"),
      bi("Less oxygen reaches the blood, so muscle cells release less energy.", "Llega menos oxígeno a la sangre, así que las células musculares liberan menos energía."),
      [
        m("wrong-system-job", "The stomach can no longer digest food.", "El estómago ya no puede digerir el alimento."),
        m("skeletal-muscular-mixup", "The bones become too weak to hold the muscles.", "Los huesos se vuelven demasiado débiles para sostener los músculos."),
        m("overstates-effect", "The heart stops pumping blood.", "El corazón deja de bombear sangre."),
      ],
      bi("Muscle cells need oxygen to release energy from sugar.", "Las células musculares necesitan oxígeno para liberar energía del azúcar."),
      bi("Damaged alveoli let less oxygen into the blood, so the blood delivers less oxygen and the muscles tire quickly.", "Los alvéolos dañados dejan pasar menos oxígeno a la sangre, así que la sangre lleva menos oxígeno y los músculos se cansan pronto."),
    ),
    e(
      bi("After a meal, the pancreas releases insulin, a hormone that helps cells take in sugar from the blood. Which systems does this connect?", "Después de comer, el páncreas libera insulina, una hormona que ayuda a las células a tomar azúcar de la sangre. ¿Qué sistemas conecta esto?"),
      bi("Endocrine, digestive, and circulatory", "Endocrino, digestivo y circulatorio"),
      [
        m("skeletal-muscular-mixup", "Skeletal and muscular only", "Solo óseo y muscular"),
        m("wrong-system-job", "Respiratory and excretory only", "Solo respiratorio y excretor"),
        m("nervous-endocrine-mixup", "Nervous and immune only", "Solo nervioso e inmunitario"),
      ],
      bi("Where did the sugar come from, and what carries the hormone?", "¿De dónde vino el azúcar y qué transporta la hormona?"),
      bi("Sugar comes from digested food, insulin is an endocrine hormone, and the blood carries both.", "El azúcar viene del alimento digerido, la insulina es una hormona endocrina y la sangre transporta a las dos."),
    ),
    e(
      bi("Which system carries carbon dioxide from your cells to your lungs?", "¿Qué sistema lleva el dióxido de carbono de tus células a tus pulmones?"),
      CIRC,
      [mx("respiratory-circulatory-mixup", RESP), mx("digestive-excretory-mixup", EXCR), mx("nervous-carries-materials", NERV)],
      bi("The lungs breathe it out, but something has to bring it there first.", "Los pulmones lo exhalan, pero algo tiene que llevarlo allí primero."),
      bi("Blood picks up carbon dioxide from the cells and carries it to the lungs, where the respiratory system breathes it out.", "La sangre recoge el dióxido de carbono de las células y lo lleva a los pulmones, donde el sistema respiratorio lo exhala."),
    ),
  ],
};

// ── s.air.masses ────────────────────────────────────────────────────────────────────────────────

const COLD_FRONT = bi("Cold front", "Frente frío");
const WARM_FRONT = bi("Warm front", "Frente cálido");
const STAT_FRONT = bi("Stationary front", "Frente estacionario");
const OCCL_FRONT = bi("Occluded front", "Frente ocluido");
const WARM_HUMID = bi("Warm and humid", "Cálida y húmeda");
const WARM_DRY = bi("Warm and dry", "Cálida y seca");
const COLD_HUMID = bi("Cold and humid", "Fría y húmeda");
const COLD_DRY = bi("Cold and dry", "Fría y seca");

const AIR_MASSES: Bank = {
  nudge: bi("Where did the air come from, and which air is moving into which?", "¿De dónde vino el aire y cuál aire avanza sobre cuál?"),
  strategy: bi(
    "Air takes on the traits of where it forms: over oceans it is humid, over land it is dry, near the poles it is cold, near the tropics it is warm. At a front, the warmer air always rises over the colder air.",
    "El aire toma las características del lugar donde se forma: sobre el océano es húmedo, sobre la tierra es seco, cerca de los polos es frío y cerca de los trópicos es cálido. En un frente, el aire más cálido siempre sube sobre el más frío.",
  ),
  seconds: 25,
  items: [
    e(
      bi("What is an air mass?", "¿Qué es una masa de aire?"),
      bi("A huge body of air with about the same temperature and humidity throughout", "Un gran volumen de aire con casi la misma temperatura y humedad en todas sus partes"),
      [
        m("confused-air-mass-and-front", "A narrow boundary where two kinds of air meet", "Un límite angosto donde se encuentran dos tipos de aire"),
        m("confused-air-mass-and-jet-stream", "A fast wind high in the sky that circles the planet", "Un viento rápido en lo alto del cielo que rodea el planeta"),
        m("thinks-air-mass-is-a-cloud", "A large cloud that brings rain", "Una nube grande que trae lluvia"),
      ],
      bi("It can cover thousands of square kilometers.", "Puede cubrir miles de kilómetros cuadrados."),
      bi("An air mass is a very large body of air that picked up the temperature and moisture of the place where it formed.", "Una masa de aire es un volumen enorme de aire que adquirió la temperatura y la humedad del lugar donde se formó."),
    ),
    e(
      bi("An air mass forms over the warm water of the Gulf of Mexico. What is it like?", "Una masa de aire se forma sobre el agua cálida del golfo de México. ¿Cómo es?"),
      WARM_HUMID,
      [mx("mixed-up-source-region", COLD_DRY), mx("ignored-land-vs-ocean", WARM_DRY), mx("ignored-latitude", COLD_HUMID)],
      bi("Warm water both heats the air and adds water vapor to it.", "El agua cálida calienta el aire y también le agrega vapor de agua."),
      bi("Air over a warm ocean becomes warm and humid. This air often brings muggy weather and storms to the southeastern United States.", "El aire sobre un océano cálido se vuelve cálido y húmedo. Este aire suele traer tiempo bochornoso y tormentas al sureste de Estados Unidos."),
    ),
    e(
      bi("An air mass forms over the snowy land of northern Canada in winter. What is it like?", "Una masa de aire se forma sobre la tierra nevada del norte de Canadá en invierno. ¿Cómo es?"),
      COLD_DRY,
      [mx("mixed-up-source-region", WARM_HUMID), mx("ignored-land-vs-ocean", COLD_HUMID), mx("ignored-latitude", WARM_DRY)],
      bi("There is little open water there to add moisture.", "Allí hay poca agua abierta que agregue humedad."),
      bi("Air over cold land far to the north becomes cold and dry. These air masses bring frigid, clear days to the United States.", "El aire sobre tierra fría del norte se vuelve frío y seco. Estas masas de aire traen días helados y despejados a Estados Unidos."),
    ),
    e(
      bi("An air mass forms over the deserts of the southwestern United States and northern Mexico in summer. What is it like?", "Una masa de aire se forma sobre los desiertos del suroeste de Estados Unidos y el norte de México en verano. ¿Cómo es?"),
      bi("Hot and dry", "Caliente y seca"),
      [mx("ignored-land-vs-ocean", bi("Hot and humid", "Caliente y húmeda")), mx("mixed-up-source-region", COLD_HUMID), mx("ignored-latitude", COLD_DRY)],
      bi("A desert is over land, and summer sun heats it strongly.", "Un desierto está sobre tierra, y el sol de verano lo calienta mucho."),
      bi("Air over hot, dry land becomes hot and dry.", "El aire sobre tierra caliente y seca se vuelve caliente y seco."),
    ),
    e(
      bi("An air mass forms over the cool waters of the northern Pacific Ocean. What is it like?", "Una masa de aire se forma sobre las aguas frescas del norte del océano Pacífico. ¿Cómo es?"),
      bi("Cool and humid", "Fresca y húmeda"),
      [mx("ignored-land-vs-ocean", bi("Cool and dry", "Fresca y seca")), mx("ignored-latitude", WARM_HUMID), mx("mixed-up-source-region", WARM_DRY)],
      bi("Ocean air is humid; how warm can it be this far north?", "El aire oceánico es húmedo; ¿qué tan cálido puede ser tan al norte?"),
      bi("Air over a cool northern ocean is cool and humid. It brings cloudy, rainy weather to the Pacific Northwest.", "El aire sobre un océano frío del norte es fresco y húmedo. Trae tiempo nublado y lluvioso al noroeste del Pacífico."),
    ),
    e(
      bi("What is a weather front?", "¿Qué es un frente meteorológico?"),
      bi("The boundary where two different air masses meet", "El límite donde se encuentran dos masas de aire diferentes"),
      [
        m("confused-air-mass-and-front", "The center of a single air mass", "El centro de una sola masa de aire"),
        m("thinks-front-means-direction", "The direction an air mass comes from", "La dirección de donde viene una masa de aire"),
        m("confused-air-mass-and-jet-stream", "A narrow river of fast wind high in the sky", "Un río angosto de viento rápido en lo alto del cielo"),
      ],
      bi("Fronts are drawn as lines on weather maps.", "Los frentes se dibujan como líneas en los mapas del tiempo."),
      bi("A front is where two air masses with different temperatures and humidity meet. Most changes in weather happen along fronts.", "Un frente es donde se encuentran dos masas de aire con distinta temperatura y humedad. La mayoría de los cambios de tiempo ocurren a lo largo de los frentes."),
    ),
    e(
      bi("A cold front is arriving. Which weather is most likely as it passes?", "Se acerca un frente frío. ¿Qué tiempo es más probable cuando pase?"),
      bi("Tall clouds, thunderstorms, and heavy rain for a short time", "Nubes altas, tormentas eléctricas y lluvia fuerte por poco tiempo"),
      [
        m("cold-warm-front-mixup", "Layers of low clouds and light, steady rain for a day or two", "Capas de nubes bajas y lluvia ligera y constante durante uno o dos días"),
        m("thinks-fronts-bring-no-weather", "Clear skies with no change at all", "Cielo despejado sin ningún cambio"),
        m("cold-stationary-front-mixup", "Clouds and drizzle that stay in place for a week", "Nubes y llovizna que se quedan en el mismo lugar una semana"),
      ],
      bi("Cold air moves in fast and shoves the warm air straight up.", "El aire frío avanza rápido y empuja el aire cálido hacia arriba de golpe."),
      bi("At a cold front, dense cold air pushes under warm air and forces it up quickly. The rising air builds tall clouds and short, strong storms.", "En un frente frío, el aire frío y denso se mete debajo del aire cálido y lo obliga a subir rápido. El aire que sube forma nubes altas y tormentas cortas y fuertes."),
    ),
    e(
      bi("A warm front is arriving. Which weather is most likely?", "Se acerca un frente cálido. ¿Qué tiempo es más probable?"),
      bi("Layers of clouds and light, steady rain that can last a day or more", "Capas de nubes y lluvia ligera y constante que puede durar un día o más"),
      [
        m("cold-warm-front-mixup", "A short burst of thunderstorms, then cooler air", "Una racha corta de tormentas y luego aire más fresco"),
        m("thinks-fronts-bring-no-weather", "Clear skies and no clouds", "Cielo despejado y sin nubes"),
        m("mixed-up-air-properties", "Colder, drier air right away", "Aire más frío y seco de inmediato"),
      ],
      bi("Warm air slides gently up over the cold air, like going up a long ramp.", "El aire cálido sube suavemente sobre el aire frío, como por una rampa larga."),
      bi("At a warm front, warm air rises slowly over cold air, so wide layers of clouds form and steady rain falls for a long time.", "En un frente cálido, el aire cálido sube despacio sobre el aire frío, así que se forman capas amplias de nubes y cae lluvia constante por mucho tiempo."),
    ),
    e(
      bi("After a cold front passes, what is the air usually like?", "Después de que pasa un frente frío, ¿cómo suele ser el aire?"),
      bi("Cooler and drier, with clearing skies", "Más fresco y seco, con cielo que se despeja"),
      [
        m("cold-warm-front-mixup", "Warmer and more humid", "Más cálido y húmedo"),
        m("thinks-fronts-bring-no-weather", "The same as before the front", "Igual que antes del frente"),
        m("mixed-up-air-properties", "Hotter and drier", "Más caliente y seco"),
      ],
      bi("The air mass behind the front is the cold one.", "La masa de aire detrás del frente es la fría."),
      bi("Behind a cold front is the cold air mass, so temperatures drop, humidity falls, and skies often clear.", "Detrás de un frente frío está la masa de aire frío, así que baja la temperatura, baja la humedad y el cielo suele despejarse."),
    ),
    e(
      bi("On a weather map, a blue line with triangles shows which kind of front?", "En un mapa del tiempo, una línea azul con triángulos indica qué tipo de frente?"),
      COLD_FRONT,
      [mx("mixed-up-map-symbols", WARM_FRONT), mx("mixed-up-map-symbols", STAT_FRONT), mx("mixed-up-map-symbols", OCCL_FRONT)],
      bi("Blue stands for cold, and the triangles point the way the front moves.", "El azul representa lo frío, y los triángulos apuntan hacia donde avanza el frente."),
      bi("A cold front is drawn in blue with triangles. A warm front is red with half circles.", "Un frente frío se dibuja en azul con triángulos. Un frente cálido es rojo con semicírculos."),
    ),
    e(
      bi("On a weather map, a red line with half circles shows which kind of front?", "En un mapa del tiempo, ¿qué tipo de frente indica una línea roja con semicírculos?"),
      WARM_FRONT,
      [mx("mixed-up-map-symbols", COLD_FRONT), mx("mixed-up-map-symbols", STAT_FRONT), mx("mixed-up-map-symbols", OCCL_FRONT)],
      bi("Red stands for warm.", "El rojo representa lo cálido."),
      bi("A warm front is drawn in red with half circles on the side it is moving toward.", "Un frente cálido se dibuja en rojo con semicírculos del lado hacia el que avanza."),
    ),
    e(
      bi("Two air masses meet, and neither one pushes the other. The boundary barely moves for days. What is it called?", "Dos masas de aire se encuentran y ninguna empuja a la otra. El límite casi no se mueve durante días. ¿Cómo se llama?"),
      STAT_FRONT,
      [mx("cold-stationary-front-mixup", COLD_FRONT), mx("mixed-up-map-symbols", WARM_FRONT), mx("mixed-up-map-symbols", OCCL_FRONT)],
      bi("Stationary means staying in one place.", "Estacionario significa que se queda en un lugar."),
      bi("A stationary front stalls in place, so the same cloudy or rainy weather can sit over an area for several days.", "Un frente estacionario se detiene, así que el mismo tiempo nublado o lluvioso puede quedarse sobre una zona varios días."),
    ),
    e(
      bi("Why does a cold front often cause thunderstorms?", "¿Por qué un frente frío suele causar tormentas eléctricas?"),
      bi("Cold, dense air pushes warm, moist air up fast; the rising air cools and its water vapor condenses.", "El aire frío y denso empuja hacia arriba al aire cálido y húmedo; el aire que sube se enfría y su vapor de agua se condensa."),
      [
        m("thinks-warm-air-sinks", "Warm air sinks under the cold air and heats the ground.", "El aire cálido baja debajo del aire frío y calienta el suelo."),
        m("thinks-cold-air-holds-more-water", "Cold air holds more water vapor, so it rains as it arrives.", "El aire frío contiene más vapor de agua, así que llueve cuando llega."),
        m("thinks-fronts-bring-no-weather", "The front itself is a giant storm cloud.", "El frente mismo es una nube de tormenta gigante."),
      ],
      bi("Clouds form when air rises and cools.", "Las nubes se forman cuando el aire sube y se enfría."),
      bi("Fast-rising warm, moist air cools quickly, so its water vapor condenses into tall storm clouds.", "El aire cálido y húmedo que sube rápido se enfría pronto, así que su vapor de agua se condensa en nubes altas de tormenta."),
    ),
    e(
      bi("Across most of the United States, in which direction do weather systems usually move?", "En la mayor parte de Estados Unidos, ¿en qué dirección suelen moverse los sistemas de tiempo?"),
      bi("From west to east", "De oeste a este"),
      [
        m("reversed-wind-direction", "From east to west", "De este a oeste"),
        m("thinks-fronts-only-from-north", "Only from north to south", "Solo de norte a sur"),
        m("thinks-air-masses-stay-put", "They stay in one place", "Se quedan en un solo lugar"),
      ],
      bi("Winds high over the middle latitudes blow from the west.", "Los vientos altos sobre las latitudes medias soplan desde el oeste."),
      bi("The prevailing westerlies and the jet stream carry most storms and fronts across the country from west to east.", "Los vientos del oeste y la corriente en chorro llevan la mayoría de las tormentas y frentes a través del país de oeste a este."),
    ),
    e(
      bi("Very cold, dry air blows across the unfrozen Great Lakes in early winter. What often happens on the far shores?", "Aire muy frío y seco sopla sobre los Grandes Lagos aún sin congelar a principios del invierno. ¿Qué suele pasar en las orillas del otro lado?"),
      bi("Heavy snow falls, because the air picked up moisture from the lakes.", "Cae mucha nieve, porque el aire tomó humedad de los lagos."),
      [
        m("ignored-land-vs-ocean", "The air stays dry, so the sky stays clear.", "El aire sigue seco, así que el cielo sigue despejado."),
        m("thinks-warm-air-sinks", "The lakes warm the air so much that it rains warm rain.", "Los lagos calientan tanto el aire que cae lluvia tibia."),
        m("thinks-air-masses-stay-put", "The air stops moving when it reaches the water.", "El aire deja de moverse cuando llega al agua."),
      ],
      bi("Air takes on moisture from the water it passes over.", "El aire toma humedad del agua sobre la que pasa."),
      bi("The cold air gains water vapor and some warmth from the lakes, rises, and drops heavy lake-effect snow downwind.", "El aire frío gana vapor de agua y algo de calor de los lagos, sube y deja caer mucha nieve por efecto lago del otro lado."),
    ),
  ],
};

// ── s.rock.cycle ────────────────────────────────────────────────────────────────────────────────

const IGNEOUS = bi("Igneous rock", "Roca ígnea");
const SEDIMENTARY = bi("Sedimentary rock", "Roca sedimentaria");
const METAMORPHIC = bi("Metamorphic rock", "Roca metamórfica");

const ROCK_CYCLE: Bank = {
  nudge: bi("Which process is acting here: melting, cooling, breaking, settling, pressing, or heating without melting?", "¿Qué proceso actúa aquí: fundirse, enfriarse, romperse, depositarse, compactarse o calentarse sin fundirse?"),
  strategy: bi(
    "Igneous rock forms when melted rock cools. Sedimentary rock forms when bits of rock are pressed and cemented. Metamorphic rock forms when heat and pressure change a rock without melting it.",
    "La roca ígnea se forma cuando la roca fundida se enfría. La roca sedimentaria se forma cuando pedazos de roca se compactan y se cementan. La roca metamórfica se forma cuando el calor y la presión cambian una roca sin fundirla.",
  ),
  seconds: 25,
  items: [
    e(
      bi("How does igneous rock form?", "¿Cómo se forma la roca ígnea?"),
      bi("Melted rock (magma or lava) cools and hardens.", "La roca fundida (magma o lava) se enfría y se endurece."),
      [
        m("confused-with-sedimentary", "Layers of sediment are pressed and cemented together.", "Capas de sedimento se compactan y se cementan."),
        m("confused-with-metamorphic", "Heat and pressure change a rock without melting it.", "El calor y la presión cambian una roca sin fundirla."),
        m("weathering-erosion-mixup", "Wind and water break a rock into pieces.", "El viento y el agua rompen una roca en pedazos."),
      ],
      bi("Igneous comes from the Latin word for fire.", "Ígnea viene de la palabra latina para fuego."),
      bi("Igneous rock forms when magma cools underground or lava cools at the surface.", "La roca ígnea se forma cuando el magma se enfría bajo tierra o la lava se enfría en la superficie."),
    ),
    e(
      bi("How does sedimentary rock form?", "¿Cómo se forma la roca sedimentaria?"),
      bi("Sediments settle in layers and are pressed and cemented together.", "Los sedimentos se depositan en capas y se compactan y cementan."),
      [
        m("confused-with-igneous", "Lava cools quickly at the surface.", "La lava se enfría rápido en la superficie."),
        m("confused-with-metamorphic", "Heat and pressure deep underground change it.", "El calor y la presión en lo profundo la cambian."),
        m("thinks-metamorphic-melts", "Rock melts and then cools slowly.", "La roca se funde y luego se enfría despacio."),
      ],
      bi("Think of sand and mud piling up at the bottom of a lake.", "Piensa en arena y lodo que se acumulan en el fondo de un lago."),
      bi("Bits of rock, shells, and mud pile up in layers. Over time the weight presses them, and minerals cement them into rock.", "Pedacitos de roca, conchas y lodo se acumulan en capas. Con el tiempo, el peso los compacta y los minerales los cementan hasta formar roca."),
    ),
    e(
      bi("How does metamorphic rock form?", "¿Cómo se forma la roca metamórfica?"),
      bi("Heat and pressure change an existing rock without melting it.", "El calor y la presión cambian una roca que ya existe sin fundirla."),
      [
        m("thinks-metamorphic-melts", "A rock melts completely and then cools.", "Una roca se funde por completo y luego se enfría."),
        m("confused-with-sedimentary", "Sand grains are cemented together.", "Granos de arena se cementan."),
        m("weathering-erosion-mixup", "Water wears a rock smooth.", "El agua desgasta una roca hasta alisarla."),
      ],
      bi("Meta means change, and morph means form.", "Meta significa cambio y morfo significa forma."),
      bi("Deep underground, heat and pressure squeeze and bake a rock until its minerals change, but it stays solid. If it melted, it would become igneous.", "En lo profundo, el calor y la presión aprietan y cuecen una roca hasta que sus minerales cambian, pero sigue sólida. Si se fundiera, se volvería ígnea."),
    ),
    e(
      bi("Granite has large crystals you can see easily. How did it most likely form?", "El granito tiene cristales grandes que se ven con facilidad. ¿Cómo se formó con mayor probabilidad?"),
      bi("Magma cooled slowly deep underground.", "El magma se enfrió despacio en lo profundo."),
      [
        m("crystal-size-reversed", "Lava cooled quickly on the surface.", "La lava se enfrió rápido en la superficie."),
        m("confused-with-sedimentary", "Sand grains were cemented together.", "Granos de arena se cementaron."),
        m("confused-with-metamorphic", "A limestone was squeezed by heat and pressure.", "Una caliza fue apretada por el calor y la presión."),
      ],
      bi("Crystals need time to grow.", "Los cristales necesitan tiempo para crecer."),
      bi("Slow cooling underground gives crystals time to grow large, so granite is an intrusive igneous rock.", "El enfriamiento lento bajo tierra da tiempo a que los cristales crezcan, así que el granito es una roca ígnea intrusiva."),
    ),
    e(
      bi("Obsidian is a shiny, glassy rock with no crystals. How did it form?", "La obsidiana es una roca brillante y vidriosa sin cristales. ¿Cómo se formó?"),
      bi("Lava cooled very quickly.", "La lava se enfrió muy rápido."),
      [
        m("crystal-size-reversed", "Magma cooled very slowly underground.", "El magma se enfrió muy despacio bajo tierra."),
        m("confused-with-sedimentary", "Mud was pressed into thin layers.", "El lodo se compactó en capas delgadas."),
        m("confused-with-metamorphic", "Heat and pressure changed sandstone.", "El calor y la presión cambiaron una arenisca."),
      ],
      bi("No crystals means there was almost no time for them to grow.", "Sin cristales significa que casi no hubo tiempo para que crecieran."),
      bi("When lava cools in moments, atoms cannot line up into crystals, so the rock becomes natural glass.", "Cuando la lava se enfría en instantes, los átomos no alcanzan a ordenarse en cristales, así que la roca se vuelve vidrio natural."),
    ),
    e(
      bi("Marble is a metamorphic rock. Which rock does it form from?", "El mármol es una roca metamórfica. ¿De qué roca se forma?"),
      bi("Limestone changed by heat and pressure", "Caliza cambiada por el calor y la presión"),
      [
        m("thinks-metamorphic-melts", "Granite that melted and cooled again", "Granito que se fundió y se volvió a enfriar"),
        m("confused-with-sedimentary", "Sand cemented together on a beach", "Arena cementada en una playa"),
        m("wrong-parent-rock", "Shale changed by heat and pressure", "Lutita cambiada por el calor y la presión"),
      ],
      bi("Both marble and its parent rock are made mostly of the mineral calcite.", "Tanto el mármol como su roca de origen están hechos sobre todo del mineral calcita."),
      bi("Heat and pressure recrystallize limestone into marble. Shale becomes slate instead.", "El calor y la presión recristalizan la caliza y la convierten en mármol. La lutita, en cambio, se vuelve pizarra."),
    ),
    e(
      bi("Slate is a metamorphic rock that splits into flat sheets. Which rock does it form from?", "La pizarra es una roca metamórfica que se parte en láminas planas. ¿De qué roca se forma?"),
      bi("Shale", "Lutita"),
      [m("wrong-parent-rock", "Limestone", "Caliza"), m("thinks-metamorphic-melts", "Basalt that melted", "Basalto que se fundió"), m("wrong-parent-rock", "Granite", "Granito")],
      bi("Its parent is a fine-grained sedimentary rock made from mud.", "Su roca de origen es una roca sedimentaria de grano fino hecha de lodo."),
      bi("Shale, made of hardened mud, is changed by heat and pressure into slate.", "La lutita, hecha de lodo endurecido, se convierte en pizarra por el calor y la presión."),
    ),
    e(
      bi("In which type of rock are fossils most often found?", "¿En qué tipo de roca se encuentran fósiles con más frecuencia?"),
      SEDIMENTARY,
      [mx("fossils-in-wrong-rock", IGNEOUS), mx("fossils-in-wrong-rock", METAMORPHIC)],
      bi("A fossil has to be buried gently, without being melted or crushed.", "Un fósil tiene que quedar enterrado con suavidad, sin fundirse ni aplastarse."),
      bi("Sediments bury remains gently in layers. Melting destroys remains, and heat and pressure usually wreck them.", "Los sedimentos entierran los restos con suavidad en capas. Fundirse destruye los restos, y el calor y la presión suelen deshacerlos."),
    ),
    e(
      bi("Rain and streams carry broken bits of rock down a mountain to a lake. What is this process called?", "La lluvia y los arroyos llevan pedacitos de roca montaña abajo hasta un lago. ¿Cómo se llama este proceso?"),
      bi("Erosion", "Erosión"),
      [m("weathering-erosion-mixup", "Weathering", "Meteorización"), m("mixed-up-processes", "Cementation", "Cementación"), m("mixed-up-processes", "Melting", "Fusión")],
      bi("The rock pieces are being moved, not broken.", "Los pedazos de roca se están moviendo, no rompiendo."),
      bi("Weathering breaks rock into pieces; erosion carries the pieces away to a new place.", "La meteorización rompe la roca en pedazos; la erosión se lleva los pedazos a otro lugar."),
    ),
    e(
      bi("Before a rock on the surface can become sediment, what has to happen to it?", "Antes de que una roca de la superficie se convierta en sedimento, ¿qué le tiene que pasar?"),
      bi("Weathering breaks it into smaller pieces.", "La meteorización la rompe en pedazos más pequeños."),
      [
        m("mixed-up-processes", "It has to melt into magma.", "Tiene que fundirse y volverse magma."),
        m("thinks-cycle-has-fixed-order", "It has to become metamorphic rock first.", "Primero tiene que volverse roca metamórfica."),
        m("mixed-up-processes", "It has to be cemented.", "Tiene que cementarse."),
      ],
      bi("Sediment is made of small pieces.", "El sedimento está hecho de pedazos pequeños."),
      bi("Weathering by water, ice, wind, and roots breaks rock into sediment. Cementing comes later, after the pieces settle.", "La meteorización por agua, hielo, viento y raíces rompe la roca en sedimento. La cementación viene después, cuando los pedazos se depositan."),
    ),
    e(
      bi("Can a metamorphic rock become an igneous rock?", "¿Una roca metamórfica puede convertirse en roca ígnea?"),
      bi("Yes, if it melts and then cools.", "Sí, si se funde y luego se enfría."),
      [
        m("thinks-cycle-has-fixed-order", "No, rocks can change only in one fixed order.", "No, las rocas solo pueden cambiar en un orden fijo."),
        m("confused-with-sedimentary", "Yes, by being pressed and cemented.", "Sí, al compactarse y cementarse."),
        m("thinks-cycle-has-end", "No, metamorphic rock is the last stage.", "No, la roca metamórfica es la última etapa."),
      ],
      bi("Every igneous rock starts as melted rock.", "Toda roca ígnea empieza como roca fundida."),
      bi("The rock cycle has many paths. Any rock that melts becomes magma, and magma that cools becomes igneous rock.", "El ciclo de las rocas tiene muchos caminos. Cualquier roca que se funde se vuelve magma, y el magma que se enfría se vuelve roca ígnea."),
    ),
    e(
      bi("What provides the energy that melts rock and forms metamorphic rock deep underground?", "¿Qué aporta la energía que funde la roca y forma la roca metamórfica en lo profundo?"),
      bi("Heat from Earth's interior", "El calor del interior de la Tierra"),
      [m("mixed-up-energy-sources", "Energy from the Sun", "La energía del Sol"), m("surface-heat-for-deep-rock", "Heat from forest fires", "El calor de los incendios forestales")],
      bi("The Sun's heat reaches only a short way into the ground.", "El calor del Sol solo llega un poco bajo el suelo."),
      bi("Earth's internal heat, from its formation and from radioactive elements, drives melting and metamorphism.", "El calor interno de la Tierra, que viene de su formación y de elementos radiactivos, impulsa la fusión y el metamorfismo."),
    ),
    e(
      bi("What provides the energy that drives weathering and erosion at Earth's surface?", "¿Qué aporta la energía que impulsa la meteorización y la erosión en la superficie de la Tierra?"),
      bi("Energy from the Sun, through wind, rain, and the water cycle", "La energía del Sol, mediante el viento, la lluvia y el ciclo del agua"),
      [m("mixed-up-energy-sources", "Heat from Earth's interior", "El calor del interior de la Tierra"), m("thinks-magnetism-is-energy", "Earth's magnetic field", "El campo magnético de la Tierra")],
      bi("Where does the energy for wind and rain come from?", "¿De dónde viene la energía del viento y de la lluvia?"),
      bi("Sunlight heats air and water, which drives wind, evaporation, and rain. These break rock and carry it away.", "La luz del Sol calienta el aire y el agua, lo que impulsa el viento, la evaporación y la lluvia. Estos rompen la roca y se la llevan."),
    ),
    e(
      bi("Pumice is so light that it can float, and it is full of tiny holes. How did the holes form?", "La piedra pómez es tan ligera que puede flotar, y está llena de agujeritos. ¿Cómo se formaron los agujeros?"),
      bi("Gas bubbles were trapped as lava cooled very quickly.", "Burbujas de gas quedaron atrapadas cuando la lava se enfrió muy rápido."),
      [
        m("weathering-erosion-mixup", "Water slowly dissolved holes in the rock.", "El agua disolvió agujeros en la roca poco a poco."),
        m("confused-with-sedimentary", "Shells were cemented together with spaces between them.", "Conchas se cementaron dejando espacios entre ellas."),
        m("confused-with-metamorphic", "Heat and pressure squeezed the rock full of holes.", "El calor y la presión apretaron la roca hasta llenarla de agujeros."),
      ],
      bi("Think of the bubbles in a shaken soda bottle when you open it.", "Piensa en las burbujas de una botella de refresco agitada cuando la abres."),
      bi("Pumice comes from frothy lava. Gas escaped as bubbles, and the lava hardened around them before they could leave.", "La piedra pómez viene de lava espumosa. El gas salió en burbujas, y la lava se endureció a su alrededor antes de que escaparan."),
    ),
  ],
};

// ── s.heat.transfer ─────────────────────────────────────────────────────────────────────────────

const CONDUCTION = bi("Conduction", "Conducción");
const CONVECTION = bi("Convection", "Convección");
const RADIATION = bi("Radiation", "Radiación");

const HEAT_TRANSFER: Bank = {
  nudge: bi("Is the energy moving through touching, through a moving fluid, or through empty space?", "¿La energía se mueve por contacto, por un fluido en movimiento o a través del espacio vacío?"),
  strategy: bi(
    "Conduction passes energy between touching particles. Convection carries energy as warm liquid or gas moves. Radiation carries energy as waves, even through empty space. Energy always flows from warmer to cooler.",
    "La conducción pasa la energía entre partículas que se tocan. La convección lleva la energía cuando un líquido o gas caliente se mueve. La radiación lleva la energía en forma de ondas, incluso por el espacio vacío. La energía siempre fluye de lo más caliente a lo más frío.",
  ),
  seconds: 25,
  items: [
    e(
      bi("A metal spoon sits in a pot of hot soup, and soon its handle is hot. How did the energy travel up the spoon?", "Una cuchara de metal está en una olla de sopa caliente y pronto se calienta el mango. ¿Cómo viajó la energía por la cuchara?"),
      CONDUCTION,
      [mx("conduction-convection-mixup", CONVECTION), mx("conduction-radiation-mixup", RADIATION)],
      bi("The spoon is solid, and its particles stay in place.", "La cuchara es sólida, y sus partículas se quedan en su lugar."),
      bi("Fast-moving particles at the hot end bump their neighbors, passing energy along the solid spoon. That is conduction.", "Las partículas rápidas del extremo caliente chocan con sus vecinas y pasan la energía a lo largo de la cuchara sólida. Eso es conducción."),
    ),
    e(
      bi("In a pot of water on the stove, warm water rises and cooler water sinks in a loop. What is this?", "En una olla de agua sobre la estufa, el agua tibia sube y el agua más fría baja en un circuito. ¿Qué es esto?"),
      CONVECTION,
      [mx("conduction-convection-mixup", CONDUCTION), mx("convection-radiation-mixup", RADIATION)],
      bi("The water itself is moving and carrying energy with it.", "El agua misma se está moviendo y lleva la energía con ella."),
      bi("Warm water is less dense, so it rises; cooler, denser water sinks to take its place. This loop is a convection current.", "El agua tibia es menos densa, así que sube; el agua más fría y densa baja a ocupar su lugar. Este circuito es una corriente de convección."),
    ),
    e(
      bi("Sunlight warms Earth even though the space between them is almost empty. How does the energy get here?", "La luz del Sol calienta la Tierra aunque el espacio entre ellos está casi vacío. ¿Cómo llega la energía?"),
      RADIATION,
      [mx("thinks-heat-needs-matter", CONDUCTION), mx("thinks-heat-needs-matter", CONVECTION)],
      bi("Which transfer does not need any particles to carry it?", "¿Qué transferencia no necesita partículas que la lleven?"),
      bi("Radiation travels as electromagnetic waves, which can cross empty space. Conduction and convection both need matter.", "La radiación viaja como ondas electromagnéticas, que pueden cruzar el espacio vacío. La conducción y la convección necesitan materia."),
    ),
    e(
      bi("You stand beside a campfire, not touching it, and feel warmth on your face. Mostly how is the energy reaching you?", "Estás al lado de una fogata, sin tocarla, y sientes calor en la cara. ¿Principalmente cómo te llega la energía?"),
      RADIATION,
      [mx("conduction-radiation-mixup", CONDUCTION), mx("convection-radiation-mixup", CONVECTION)],
      bi("The hot air from the fire mostly rises straight up, not sideways toward you.", "El aire caliente de la fogata sube casi todo hacia arriba, no hacia los lados."),
      bi("The fire gives off infrared radiation in all directions, which warms your face even from the side.", "La fogata emite radiación infrarroja en todas direcciones, que te calienta la cara aunque estés a un lado."),
    ),
    e(
      bi("You hold an ice cube, and your hand feels cold. What is really happening?", "Sostienes un cubo de hielo y sientes la mano fría. ¿Qué está pasando en realidad?"),
      bi("Thermal energy flows from your hand into the ice.", "La energía térmica fluye de tu mano hacia el hielo."),
      [
        m("thinks-cold-flows", "Cold flows from the ice into your hand.", "El frío fluye del hielo hacia tu mano."),
        m("energy-direction-reversed", "Thermal energy flows from the ice into your hand.", "La energía térmica fluye del hielo hacia tu mano."),
        m("thinks-no-transfer", "No energy moves; the ice just feels cold.", "No se mueve energía; el hielo solo se siente frío."),
      ],
      bi("Energy only flows one way: from warmer to cooler.", "La energía solo fluye en un sentido: de lo más caliente a lo más frío."),
      bi("Your hand is warmer, so energy leaves your hand and melts the ice. Losing energy is what feels cold; cold itself does not flow.", "Tu mano está más caliente, así que la energía sale de tu mano y derrite el hielo. Perder energía es lo que se siente frío; el frío no fluye."),
    ),
    e(
      bi("Which material is the best thermal insulator?", "¿Qué material es el mejor aislante térmico?"),
      bi("Foam", "Espuma"),
      [m("conductor-insulator-mixup", "Copper", "Cobre"), m("conductor-insulator-mixup", "Aluminum", "Aluminio"), m("conductor-insulator-mixup", "Steel", "Acero")],
      bi("Metals let energy pass quickly. Look for a material full of trapped air.", "Los metales dejan pasar la energía rápido. Busca un material lleno de aire atrapado."),
      bi("Foam traps tiny pockets of air, which conduct energy poorly. Copper, aluminum, and steel are good conductors.", "La espuma atrapa pequeñas bolsas de aire, que conducen mal la energía. El cobre, el aluminio y el acero son buenos conductores."),
    ),
    e(
      bi("A metal bench and a wooden bench sit outside on a cold morning at the same temperature. Why does the metal one feel colder?", "Una banca de metal y una de madera están afuera en una mañana fría a la misma temperatura. ¿Por qué la de metal se siente más fría?"),
      bi("Metal conducts energy away from your skin faster.", "El metal conduce la energía lejos de tu piel más rápido."),
      [
        m("thinks-metal-is-colder", "The metal bench is at a lower temperature.", "La banca de metal está a una temperatura más baja."),
        m("thinks-cold-flows", "Metal gives off more cold.", "El metal suelta más frío."),
        m("thinks-wood-makes-heat", "Wood makes its own heat.", "La madera produce su propio calor."),
      ],
      bi("The benches are at the same temperature, so the difference is in how fast energy moves.", "Las bancas están a la misma temperatura, así que la diferencia está en qué tan rápido se mueve la energía."),
      bi("Both benches are equally cold, but metal is a good conductor, so it pulls energy from your skin quickly. Your skin cools fast, which feels colder.", "Las dos bancas están igual de frías, pero el metal es buen conductor y quita energía de tu piel rápido. Tu piel se enfría pronto, y eso se siente más frío."),
    ),
    e(
      bi("Why does warm air rise?", "¿Por qué sube el aire caliente?"),
      bi("It expands and becomes less dense, so cooler, denser air pushes it up.", "Se expande y se vuelve menos denso, así que el aire más frío y denso lo empuja hacia arriba."),
      [
        m("density-reversed", "It becomes heavier and denser.", "Se vuelve más pesado y más denso."),
        m("thinks-heat-is-a-substance", "Heat is a substance that always floats upward by itself.", "El calor es una sustancia que siempre flota hacia arriba sola."),
        m("thinks-cold-flows", "Cold air pulls it up from above.", "El aire frío lo jala desde arriba."),
      ],
      bi("Compare how tightly packed the particles are in warm air and cool air.", "Compara qué tan juntas están las partículas en el aire caliente y en el frío."),
      bi("Heated air particles move faster and spread out, so the air is less dense. Denser cool air sinks below it and pushes it upward.", "Las partículas del aire caliente se mueven más rápido y se separan, así que el aire es menos denso. El aire frío, más denso, baja y lo empuja hacia arriba."),
    ),
    e(
      bi("On a sunny afternoon at the beach, a breeze blows from the ocean onto the land. Why?", "En una tarde soleada en la playa, sopla una brisa del mar hacia la tierra. ¿Por qué?"),
      bi("The land heats faster, warm air over it rises, and cooler air from the sea moves in.", "La tierra se calienta más rápido, el aire caliente sobre ella sube y el aire más fresco del mar entra."),
      [
        m("land-sea-heating-reversed", "The ocean heats faster, so warm air moves from the sea to the land.", "El mar se calienta más rápido, así que el aire caliente va del mar a la tierra."),
        m("thinks-waves-make-wind", "The waves push the air toward the land.", "Las olas empujan el aire hacia la tierra."),
        m("convection-radiation-mixup", "Sunlight bounces off the water and pushes the air.", "La luz del Sol rebota en el agua y empuja el aire."),
      ],
      bi("Sand gets hot under your feet long before the water warms up.", "La arena se calienta bajo tus pies mucho antes de que el agua se entibie."),
      bi("Land warms faster than water. Air over the land warms and rises, and cooler air from over the water flows in: a convection current.", "La tierra se calienta más rápido que el agua. El aire sobre la tierra se calienta y sube, y el aire más fresco de sobre el agua entra: una corriente de convección."),
    ),
    e(
      bi("Two identical shirts lie in direct sunlight. Which one warms up faster?", "Dos camisetas iguales están al sol directo. ¿Cuál se calienta más rápido?"),
      bi("The black shirt", "La camiseta negra"),
      [m("dark-light-surface-mixup", "The white shirt", "La camiseta blanca"), m("ignores-surface-color", "Both warm up at the same rate", "Las dos se calientan igual de rápido")],
      bi("Which color absorbs more of the light that hits it?", "¿Qué color absorbe más de la luz que le llega?"),
      bi("Dark surfaces absorb more radiation, and light surfaces reflect more, so the black shirt warms faster.", "Las superficies oscuras absorben más radiación y las claras reflejan más, así que la camiseta negra se calienta más rápido."),
    ),
    e(
      bi("A vacuum flask keeps soup hot. Its two walls have empty space between them. Which transfers does the empty space mainly stop?", "Un termo mantiene caliente la sopa. Sus dos paredes tienen espacio vacío entre ellas. ¿Qué transferencias detiene principalmente ese espacio vacío?"),
      bi("Conduction and convection", "Conducción y convección"),
      [
        m("thinks-vacuum-stops-radiation", "Radiation only", "Solo la radiación"),
        m("thinks-heat-needs-matter", "All three: conduction, convection, and radiation", "Las tres: conducción, convección y radiación"),
        m("conduction-convection-mixup", "Convection only", "Solo la convección"),
      ],
      bi("Which transfers need particles, and which one can cross empty space?", "¿Qué transferencias necesitan partículas y cuál puede cruzar el espacio vacío?"),
      bi("With no particles in the gap, energy cannot be conducted or carried by moving air. Radiation can still cross, so the walls are made shiny to reflect it.", "Sin partículas en el espacio, la energía no puede conducirse ni viajar con aire en movimiento. La radiación sí puede cruzar, por eso las paredes son brillantes para reflejarla."),
    ),
    e(
      bi("Why are cooking pots usually metal with plastic or wooden handles?", "¿Por qué las ollas suelen ser de metal con mangos de plástico o de madera?"),
      bi("Metal conducts energy to the food, and the handle insulates your hand.", "El metal conduce la energía a los alimentos y el mango aísla tu mano."),
      [
        m("conductor-insulator-mixup", "Plastic and wood conduct energy better than metal.", "El plástico y la madera conducen la energía mejor que el metal."),
        m("thinks-cold-flows", "The handle keeps cold inside the pot.", "El mango mantiene el frío dentro de la olla."),
        m("convection-radiation-mixup", "Metal sends radiation into the food, and handles block light.", "El metal envía radiación a los alimentos y los mangos bloquean la luz."),
      ],
      bi("One part should pass energy easily, and the other should not.", "Una parte debe dejar pasar la energía con facilidad y la otra no."),
      bi("Metal is a good conductor, so it heats food quickly. Plastic and wood are insulators, so the handle stays cool enough to hold.", "El metal es buen conductor, así que calienta los alimentos rápido. El plástico y la madera son aislantes, así que el mango no se calienta tanto."),
    ),
    e(
      bi("A heater sits on the floor on one side of a cold room. Mostly how does the warmth spread through the room?", "Un calentador está en el piso de un lado de un cuarto frío. ¿Principalmente cómo se reparte el calor por el cuarto?"),
      bi("By convection currents in the air", "Por corrientes de convección en el aire"),
      [
        m("conduction-convection-mixup", "By conduction through the still air", "Por conducción a través del aire quieto"),
        m("thinks-cold-flows", "Cold air flows into the heater and is used up", "El aire frío entra al calentador y se gasta"),
        m("conduction-radiation-mixup", "By conduction through the walls", "Por conducción a través de las paredes"),
      ],
      bi("Air is a poor conductor, but it can move.", "El aire conduce mal la energía, pero se puede mover."),
      bi("Air warmed by the heater rises, spreads across the ceiling, cools, and sinks, so a loop of moving air carries energy around the room.", "El aire que calienta el calentador sube, se extiende por el techo, se enfría y baja, así que un circuito de aire en movimiento lleva la energía por el cuarto."),
    ),
    e(
      bi("A cup of water at 80 °C touches a cup of water at 20 °C. Which way does thermal energy flow?", "Una taza de agua a 80 °C toca una taza de agua a 20 °C. ¿Hacia dónde fluye la energía térmica?"),
      bi("From the hot water to the cool water, until both are the same temperature", "Del agua caliente al agua fría, hasta que las dos tienen la misma temperatura"),
      [
        m("energy-direction-reversed", "From the cool water to the hot water", "Del agua fría al agua caliente"),
        m("thinks-cold-flows", "Cold flows from the cool water into the hot water", "El frío fluye del agua fría al agua caliente"),
        m("thinks-no-transfer", "No energy flows unless the water is stirred", "No fluye energía a menos que se revuelva el agua"),
      ],
      bi("Which cup has faster-moving particles?", "¿Qué taza tiene partículas que se mueven más rápido?"),
      bi("Thermal energy flows from warmer to cooler. The hot water cools and the cool water warms until they match.", "La energía térmica fluye de lo más caliente a lo más frío. El agua caliente se enfría y la fría se calienta hasta que se igualan."),
    ),
  ],
};

// ── s.design.criteria ───────────────────────────────────────────────────────────────────────────

const CRITERION = bi("Criterion", "Criterio");
const CONSTRAINT = bi("Constraint", "Restricción");
const crit = (en: string, es: string) => bi(`${en} Is this a criterion or a constraint?`, `${es} ¿Es un criterio o una restricción?`);

const DESIGN: Bank = {
  nudge: bi("Is it something the design must do, or a limit on how you can build it?", "¿Es algo que el diseño debe lograr o un límite sobre cómo puedes construirlo?"),
  strategy: bi(
    "Criteria say what a successful design must do, such as hold a weight or keep water warm. Constraints are limits, such as cost, time, materials, size, or safety rules.",
    "Los criterios dicen lo que debe lograr un diseño exitoso, como aguantar un peso o mantener el agua caliente. Las restricciones son límites, como el costo, el tiempo, los materiales, el tamaño o las reglas de seguridad.",
  ),
  seconds: 25,
  items: [
    e(
      crit("A team's water filter must remove the visible dirt from muddy water.", "El filtro de agua de un equipo debe quitar la suciedad visible del agua con lodo."),
      CRITERION,
      [mx("criterion-constraint-mixup", CONSTRAINT)],
      bi("This describes what the filter has to do to succeed.", "Esto describe lo que el filtro tiene que hacer para tener éxito."),
      bi("Removing visible dirt is the goal the filter must meet, so it is a criterion.", "Quitar la suciedad visible es la meta que debe cumplir el filtro, así que es un criterio."),
    ),
    e(
      crit("The materials for the water filter can cost no more than $5.", "Los materiales del filtro de agua no pueden costar más de $5."),
      CONSTRAINT,
      [mx("criterion-constraint-mixup", CRITERION)],
      bi("A spending limit tells you how you may build it, not what it must do.", "Un límite de gasto te dice cómo puedes construirlo, no lo que debe lograr."),
      bi("A budget is a limit on the design, so it is a constraint.", "Un presupuesto es un límite para el diseño, así que es una restricción."),
    ),
    e(
      crit("A model bridge must hold a 2 kg load without breaking.", "Un puente de modelo debe aguantar una carga de 2 kg sin romperse."),
      CRITERION,
      [mx("criterion-constraint-mixup", CONSTRAINT)],
      bi("This is a test the bridge must pass.", "Esta es una prueba que el puente debe pasar."),
      bi("Holding 2 kg is what the bridge must do to count as a success, so it is a criterion.", "Aguantar 2 kg es lo que debe lograr el puente para considerarse exitoso, así que es un criterio."),
    ),
    e(
      crit("The bridge may be built only from craft sticks and glue.", "El puente solo se puede construir con palitos de madera y pegamento."),
      CONSTRAINT,
      [mx("criterion-constraint-mixup", CRITERION)],
      bi("This limits the materials you may use.", "Esto limita los materiales que puedes usar."),
      bi("A rule about allowed materials is a limit, so it is a constraint.", "Una regla sobre los materiales permitidos es un límite, así que es una restricción."),
    ),
    e(
      crit("A solar oven must heat a cup of water to at least 50 °C.", "Un horno solar debe calentar una taza de agua hasta al menos 50 °C."),
      CRITERION,
      [mx("criterion-constraint-mixup", CONSTRAINT)],
      bi("This is a measurable goal for the oven.", "Esta es una meta medible para el horno."),
      bi("Reaching 50 °C is what the oven must achieve, so it is a criterion.", "Llegar a 50 °C es lo que el horno debe lograr, así que es un criterio."),
    ),
    e(
      crit("The project must be finished within three class periods.", "El proyecto debe terminarse en tres clases."),
      CONSTRAINT,
      [mx("criterion-constraint-mixup", CRITERION)],
      bi("Time is one of the most common limits on a design.", "El tiempo es uno de los límites más comunes de un diseño."),
      bi("A deadline limits the work, so it is a constraint.", "Una fecha límite limita el trabajo, así que es una restricción."),
    ),
    e(
      crit("A package must keep a raw egg from cracking when dropped from 2 m.", "Un empaque debe evitar que un huevo crudo se rompa al caer desde 2 m."),
      CRITERION,
      [mx("criterion-constraint-mixup", CONSTRAINT)],
      bi("Ask what result tells you the package worked.", "Pregúntate qué resultado te dice que el empaque funcionó."),
      bi("Protecting the egg in a 2 m drop is the goal the package must meet, so it is a criterion.", "Proteger el huevo en una caída de 2 m es la meta que debe cumplir el empaque, así que es un criterio."),
    ),
    e(
      bi("Which of these is a constraint for a school garden watering system?", "¿Cuál de estas es una restricción para un sistema de riego del huerto escolar?"),
      bi("It must be built with less than $50 of parts.", "Debe construirse con menos de $50 en piezas."),
      [
        m("criterion-constraint-mixup", "It must water every plant each day.", "Debe regar todas las plantas cada día."),
        m("criterion-constraint-mixup", "It must turn off when the soil is wet.", "Debe apagarse cuando la tierra esté húmeda."),
      ],
      bi("Two of these describe what the system must do. One is a limit.", "Dos de estas describen lo que debe hacer el sistema. Una es un límite."),
      bi("Watering every plant and turning off when the soil is wet are criteria. The $50 limit on parts is a constraint.", "Regar todas las plantas y apagarse cuando la tierra esté húmeda son criterios. El límite de $50 en piezas es una restricción."),
    ),
    e(
      bi("Which of these is a criterion for a backpack that protects a laptop?", "¿Cuál de estas es un criterio para una mochila que protege una computadora portátil?"),
      bi("It keeps the laptop safe in a 1 m fall.", "Mantiene segura la computadora en una caída de 1 m."),
      [
        m("criterion-constraint-mixup", "It must use only materials the school already has.", "Solo debe usar materiales que la escuela ya tiene."),
        m("criterion-constraint-mixup", "It must be finished in two weeks.", "Debe terminarse en dos semanas."),
      ],
      bi("Look for the one that describes a result the backpack must achieve.", "Busca la que describe un resultado que la mochila debe lograr."),
      bi("Surviving a 1 m fall is what the backpack must do, so it is a criterion. Materials and time are limits, so they are constraints.", "Resistir una caída de 1 m es lo que la mochila debe lograr, así que es un criterio. Los materiales y el tiempo son límites, así que son restricciones."),
    ),
    e(
      bi("What is a trade-off in engineering design?", "¿Qué es un compromiso (trade-off) en el diseño de ingeniería?"),
      bi("Giving up some of one feature to get more of another", "Ceder un poco en una característica para obtener más de otra"),
      [
        m("literal-trade", "Trading materials with another team", "Intercambiar materiales con otro equipo"),
        m("ignores-limits", "Adding every possible feature at once", "Agregar todas las características posibles a la vez"),
        m("skipped-testing", "Picking the first design without testing it", "Elegir el primer diseño sin probarlo"),
      ],
      bi("Think of a lighter bike frame that costs more.", "Piensa en un cuadro de bicicleta más ligero que cuesta más."),
      bi("Designs often cannot have everything, so engineers balance features, such as strength against weight or cost.", "Los diseños casi nunca pueden tenerlo todo, así que los ingenieros equilibran características, como la resistencia contra el peso o el costo."),
    ),
    e(
      bi("Thicker walls keep a lunch box cold longer, but they make it heavier. The design must stay under 1 kg. What should the team do?", "Paredes más gruesas mantienen fría una lonchera por más tiempo, pero la hacen más pesada. El diseño debe pesar menos de 1 kg. ¿Qué debe hacer el equipo?"),
      bi("Test thicknesses to find one that keeps food cold enough and stays under 1 kg.", "Probar grosores para encontrar uno que mantenga la comida bastante fría y pese menos de 1 kg."),
      [
        m("ignored-constraint", "Make the walls as thick as possible.", "Hacer las paredes lo más gruesas posible."),
        m("ignored-criterion", "Make the walls as thin as possible.", "Hacer las paredes lo más delgadas posible."),
        m("skipped-testing", "Guess a thickness and skip testing.", "Adivinar un grosor y no hacer pruebas."),
      ],
      bi("The best design meets the goal without breaking the limit.", "El mejor diseño cumple la meta sin romper el límite."),
      bi("This is a trade-off: test different thicknesses and choose one that meets the cooling goal while staying under the weight limit.", "Esto es un compromiso: probar distintos grosores y elegir uno que cumpla la meta de enfriamiento sin pasar el límite de peso."),
    ),
    e(
      bi("Why should a criterion be specific, like \"holds 2 kg,\" instead of \"is strong\"?", "¿Por qué un criterio debe ser específico, como \"aguanta 2 kg\", en lugar de \"es fuerte\"?"),
      bi("So the team can test whether the design meets it", "Para que el equipo pueda probar si el diseño lo cumple"),
      [
        m("criteria-means-cost", "So the design will cost less", "Para que el diseño cueste menos"),
        m("judges-by-appearance", "So the design looks stronger", "Para que el diseño se vea más fuerte"),
        m("thinks-one-right-answer", "So only one design can possibly work", "Para que solo un diseño pueda funcionar"),
      ],
      bi("How would you check whether a bridge \"is strong\"?", "¿Cómo comprobarías si un puente \"es fuerte\"?"),
      bi("A precise criterion can be measured, so a test shows clearly whether the design succeeded.", "Un criterio preciso se puede medir, así que una prueba muestra con claridad si el diseño tuvo éxito."),
    ),
    e(
      bi("A prototype fails one of its tests. What is the best next step?", "Un prototipo falla una de sus pruebas. ¿Cuál es el mejor paso siguiente?"),
      bi("Find out what failed, change the design, and test it again.", "Averiguar qué falló, cambiar el diseño y volver a probarlo."),
      [
        m("thinks-failure-ends-design", "Give up on the idea.", "Abandonar la idea."),
        m("moved-goalposts", "Change the criteria so the design passes.", "Cambiar los criterios para que el diseño pase."),
        m("skipped-testing", "Build the final version anyway.", "Construir la versión final de todos modos."),
      ],
      bi("Engineering design is a loop, not a straight line.", "El diseño de ingeniería es un ciclo, no una línea recta."),
      bi("A failed test gives data. Engineers use it to improve the design and test again until it meets the criteria.", "Una prueba fallida da datos. Los ingenieros los usan para mejorar el diseño y probar otra vez hasta que cumpla los criterios."),
    ),
    e(
      bi(
        "Wind turbine designs must spin at least 45 turns per minute (criterion) and cost at most $10 (constraint). A: 40 turns per minute, $8. B: 55 turns per minute, $14. C: 50 turns per minute, $9. Which design meets both?",
        "Los diseños de turbina de viento deben girar al menos 45 vueltas por minuto (criterio) y costar como máximo $10 (restricción). A: 40 vueltas por minuto, $8. B: 55 vueltas por minuto, $14. C: 50 vueltas por minuto, $9. ¿Qué diseño cumple con ambos?",
      ),
      bi("Design C", "El diseño C"),
      [m("ignored-constraint", "Design B", "El diseño B"), m("ignored-criterion", "Design A", "El diseño A")],
      bi("Check each design against the speed goal first, then against the cost limit.", "Revisa cada diseño primero con la meta de velocidad y luego con el límite de costo."),
      bi("A is too slow, and B costs too much. C spins 50 turns per minute for $9, so it meets both.", "A es demasiado lenta y B cuesta demasiado. C gira 50 vueltas por minuto por $9, así que cumple con ambos."),
    ),
    e(
      bi(
        "Foil boats must hold at least 20 pennies (criterion) and use at most 1 sheet of foil (constraint). Boat A held 25 pennies and used 2 sheets. Boat B held 22 pennies and used 1 sheet. Boat C held 15 pennies and used 1 sheet. Which boat meets both?",
        "Los botes de papel aluminio deben aguantar al menos 20 monedas (criterio) y usar como máximo 1 hoja de aluminio (restricción). El bote A aguantó 25 monedas y usó 2 hojas. El bote B aguantó 22 monedas y usó 1 hoja. El bote C aguantó 15 monedas y usó 1 hoja. ¿Qué bote cumple con ambos?",
      ),
      bi("Boat B", "El bote B"),
      [m("ignored-constraint", "Boat A", "El bote A"), m("ignored-criterion", "Boat C", "El bote C")],
      bi("The boat that holds the most is not automatically the winner.", "El bote que aguanta más no es automáticamente el ganador."),
      bi("A used too much foil, and C held too few pennies. B held 22 pennies with 1 sheet, so it meets both.", "A usó demasiado aluminio y C aguantó muy pocas monedas. B aguantó 22 monedas con 1 hoja, así que cumple con ambos."),
    ),
    e(
      bi("Why do engineers often build and test several designs instead of only one?", "¿Por qué los ingenieros a menudo construyen y prueban varios diseños en lugar de uno solo?"),
      bi("Comparing test results shows which design best meets the criteria.", "Comparar los resultados de las pruebas muestra qué diseño cumple mejor los criterios."),
      [
        m("skipped-testing", "One test of one design is always enough.", "Una prueba de un solo diseño siempre es suficiente."),
        m("thinks-first-always-fails", "The first design always fails, so it must be thrown out.", "El primer diseño siempre falla, así que hay que tirarlo."),
        m("ignores-limits", "Using more materials always makes a better design.", "Usar más materiales siempre da un mejor diseño."),
      ],
      bi("Data from several tries lets you compare.", "Los datos de varios intentos te dejan comparar."),
      bi("Testing more than one design gives data to compare, so the team can choose or combine the best ideas.", "Probar más de un diseño da datos para comparar, así que el equipo puede elegir o combinar las mejores ideas."),
    ),
  ],
};

// ── Numbers for the computed skills ─────────────────────────────────────────────────────────────

/** An integer count of 10^-k units written exactly: dec(375) = "37.5", dec(40) = "4", dec(5, 2) = "0.05", dec(57300, 0) = "57,300". */
function dec(n: number, k = 1): string {
  const s = String(Math.abs(n)).padStart(k + 1, "0");
  const whole = (k ? s.slice(0, -k) : s).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = k ? s.slice(-k).replace(/0+$/, "") : "";
  return `${n < 0 ? "−" : ""}${whole}${frac ? `.${frac}` : ""}`;
}
/** The likely wrong typed values, minus any that equal the key, without repeats. */
function misses(right: number, list: [number, string][]): { value: string; why: string }[] {
  const out: { value: string; why: string }[] = [];
  for (const [v, why] of list) {
    if (!Number.isFinite(v) || Math.abs(v - right) < 1e-9) continue;
    const value = String(Math.round(v * 1e6) / 1e6);
    if (!out.some((o) => o.value === value)) out.push({ value, why });
  }
  return out;
}
/** Wrong choices first by priority, the right one shuffled in: returns the choices and the key. */
function withChoices(r: Rng, right: Choice, wrong: Choice[]): Pick<ItemBody, "choices" | "input" | "answer"> {
  const list: Choice[] = [];
  for (const w of wrong) if (list.length < 3 && w.label !== right.label && !list.some((c) => c.label === w.label)) list.push(w);
  const choices = r.shuffle([right, ...list]);
  return { choices, input: "choices", answer: { kind: "choice", index: choices.indexOf(right) } };
}
const plural = (n: string, one: string, many: string) => (n === "1" ? one : many);

const NAMES = ["Aiko", "Diego", "Kwame", "Priya", "Luis", "Noah", "Mei", "Omar", "Jamal", "Ana", "Tariq", "Lena", "Ravi", "Camila", "Elena", "Mateo", "Sofia", "Kenji", "Amara", "Yusuf", "Ines", "Malik", "Hana", "Arjun", "Zara", "Chen", "Nia", "Valentina"];

// ── s.moon.phase ────────────────────────────────────────────────────────────────────────────────

const DAY = 86_400_000;
/** The fixed reference: the new moon of the total solar eclipse, April 8, 2024, 18:21 UT. */
export const REF_NEW_MOON = Date.UTC(2024, 3, 8, 18, 21);
/** The mean synodic month in days: new moon to new moon. */
export const SYNODIC = 29.53;
const EIGHTH = SYNODIC / 8;
/** Days since the last new moon at a moment (ms since 1970), by the mean cycle. */
export const moonAge = (t: number) => ((((t - REF_NEW_MOON) / DAY) % SYNODIC) + SYNODIC) % SYNODIC;
/** The nearest eighth of the cycle: 0 new, 1 waxing crescent, 2 first quarter, 3 waxing gibbous, 4 full, 5 waning gibbous, 6 last quarter, 7 waning crescent. */
export const phaseAt = (t: number) => Math.round(moonAge(t) / EIGHTH) % 8;

export const PHASES: { name: Bi; pic: string }[] = [
  { name: bi("New moon", "Luna nueva"), pic: "🌑" },
  { name: bi("Waxing crescent", "Luna creciente"), pic: "🌒" },
  { name: bi("First quarter", "Cuarto creciente"), pic: "🌓" },
  { name: bi("Waxing gibbous", "Gibosa creciente"), pic: "🌔" },
  { name: bi("Full moon", "Luna llena"), pic: "🌕" },
  { name: bi("Waning gibbous", "Gibosa menguante"), pic: "🌖" },
  { name: bi("Last quarter", "Cuarto menguante"), pic: "🌗" },
  { name: bi("Waning crescent", "Luna menguante"), pic: "🌘" },
];
/** Where each phase sits in the cycle, in tenths of a day, as said in the steps. */
const PHASE_DAY10 = [0, 37, 74, 111, 148, 185, 221, 258];
const MONTHS: Bi[] = [
  bi("January", "enero"), bi("February", "febrero"), bi("March", "marzo"), bi("April", "abril"), bi("May", "mayo"), bi("June", "junio"),
  bi("July", "julio"), bi("August", "agosto"), bi("September", "septiembre"), bi("October", "octubre"), bi("November", "noviembre"), bi("December", "diciembre"),
];
/** "March 10, 2025" / "10 de marzo de 2025"; `year: false` drops the year. */
function dateText(t: number, locale: Locale, year = true) {
  const d = new Date(t);
  const [day, month, y] = [d.getUTCDate(), MONTHS[d.getUTCMonth()][locale], d.getUTCFullYear()];
  if (locale === "es") return year ? `${day} de ${month} de ${y}` : `${day} de ${month}`;
  return year ? `${month} ${day}, ${y}` : `${month} ${day}`;
}
/** Wrong phases by how a learner slips: waxing for waning, half a cycle off, a quarter off, an eighth off. */
function phaseMisses(p: number): [number, string][] {
  return [
    [(8 - p) % 8, "mixed-up-waxing-waning"],
    [(p + 4) % 8, "half-cycle-off"],
    [(p + 2) % 8, "off-by-a-quarter"],
    [(p + 6) % 8, "off-by-a-quarter"],
    [(p + 1) % 8, "off-by-an-eighth"],
  ];
}

function moonItem(r: Rng, level: number, locale: Locale): ItemBody {
  const full = r.bool(level === 1 ? 0.3 : 0.5);
  // A real new or full moon between early 2025 and late 2027, counted in whole cycles from the reference.
  const k = r.int(10, 45);
  const tEvent = REF_NEW_MOON + (k + (full ? 0.5 : 0)) * SYNODIC * DAY;
  const day0 = Math.floor(tEvent / DAY) * DAY;
  const start = full ? SYNODIC / 2 : 0;
  // Day counts whose estimate lands within half a day of a phase, so "about" is safe even with the
  // real Moon running up to a day off the mean cycle.
  const [lo, hi] = level === 1 ? (full ? [2, 16] : [2, 30]) : [31, 88];
  const options: { n: number; p: number }[] = [];
  for (let n = lo; n <= hi; n++) {
    const age = (start + n) % SYNODIC;
    const j = Math.round(age / EIGHTH);
    if (Math.abs(age - j * EIGHTH) <= 0.5) options.push({ n, p: j % 8 });
  }
  const p = r.pick([...new Set(options.map((o) => o.p))]);
  const n = r.pick(options.filter((o) => o.p === p)).n;
  const t1 = day0 + n * DAY;
  const D0 = dateText(day0, locale), D1 = dateText(t1, locale);
  const d0 = dateText(day0, locale, false), d1 = dateText(t1, locale, false);
  const cycles = Math.floor((start + n) / SYNODIC);
  const total10 = (full ? 148 : 0) + 10 * n;
  const x10 = total10 - 295 * cycles;
  const X = dec(x10);
  const ref = full ? PHASES[4].name : PHASES[0].name;
  const q = tr(
    locale,
    `The Moon is ${full ? "full" : "new"} on ${D0}. About what phase is it in on ${D1}?`,
    `Hay ${ref.es.toLowerCase()} el ${D0}. ¿Aproximadamente en qué fase está la Luna el ${D1}?`,
  );
  const days = tr(locale, `From ${d0} to ${d1} is ${n} days.`, `Del ${d0} al ${d1} hay ${n} días.`);
  const into =
    !full && cycles === 0
      ? tr(locale, `So the Moon is about ${n} days into its cycle of about 29.5 days.`, `Así que la Luna lleva unos ${n} días de su ciclo de unos 29.5 días.`)
      : (full ? tr(locale, "A full moon is about 14.8 days into the cycle. ", "La luna llena está a unos 14.8 días del inicio del ciclo. ") : "") +
        (cycles === 0
          ? tr(locale, `14.8 + ${n} = ${X}, so the Moon is about ${X} days into its cycle.`, `14.8 + ${n} = ${X}, así que la Luna lleva unos ${X} días de su ciclo.`)
          : tr(
              locale,
              `${dec(total10)} − ${dec(295 * cycles)} = ${X}, so the Moon is about ${X} days into a new cycle.`,
              `${dec(total10)} − ${dec(295 * cycles)} = ${X}, así que la Luna lleva unos ${X} días de un nuevo ciclo.`,
            ));
  const name = PHASES[p].name[locale];
  const near =
    p === 0
      ? tr(locale, "That is about the start of a cycle: a new moon.", "Eso es casi el inicio de un ciclo: luna nueva.")
      : tr(locale, `${X} days is closest to ${name.toLowerCase()}, at about ${dec(PHASE_DAY10[p])} days.`, `${X} días está más cerca de ${name.toLowerCase()}, a unos ${dec(PHASE_DAY10[p])} días.`);
  const right: Choice = { label: name, picture: PHASES[p].pic };
  const wrong = phaseMisses(p).map(([i, why]) => ({ label: PHASES[i].name[locale], picture: PHASES[i].pic, why }));
  return {
    prompt: [q],
    say: q,
    ...withChoices(r, right, wrong),
    hints: [
      tr(locale, `How many days after the ${full ? "full" : "new"} moon is ${d1}?`, `¿Cuántos días después de la ${ref.es.toLowerCase()} es el ${d1}?`),
      tr(
        locale,
        "The phases repeat about every 29.5 days: first quarter about 7.4 days after a new moon, full moon at about 14.8, last quarter at about 22.1, then new again.",
        "Las fases se repiten cada 29.5 días, más o menos: cuarto creciente unos 7.4 días después de la luna nueva, luna llena a los 14.8, cuarto menguante a los 22.1 y otra vez luna nueva.",
      ),
      days,
    ],
    steps: [days, into, near, tr(locale, `Answer: ${name}`, `Respuesta: ${name}`)],
    seconds: level === 1 ? 45 : 75,
  };
}

// ── s.photo.resp ────────────────────────────────────────────────────────────────────────────────

const PHOTO_IO: Bank = {
  nudge: bi("Is this about making sugar or about using sugar?", "¿Se trata de producir azúcar o de usar azúcar?"),
  strategy: bi(
    "Photosynthesis: carbon dioxide + water + light energy → sugar (glucose) + oxygen, in chloroplasts. Cellular respiration runs the other way: sugar + oxygen → carbon dioxide + water + usable energy, in mitochondria.",
    "Fotosíntesis: dióxido de carbono + agua + energía de la luz → azúcar (glucosa) + oxígeno, en los cloroplastos. La respiración celular va al revés: azúcar + oxígeno → dióxido de carbono + agua + energía utilizable, en las mitocondrias.",
  ),
  seconds: 25,
  items: [
    e(
      bi("What are the inputs of photosynthesis?", "¿Cuáles son las entradas de la fotosíntesis?"),
      bi("Carbon dioxide, water, and light energy", "Dióxido de carbono, agua y energía de la luz"),
      [
        m("swapped-inputs-outputs", "Glucose and oxygen", "Glucosa y oxígeno"),
        m("thinks-plants-eat-soil", "Soil nutrients and oxygen", "Nutrientes del suelo y oxígeno"),
        m("mixed-up-gases", "Oxygen, water, and light energy", "Oxígeno, agua y energía de la luz"),
      ],
      bi("A plant takes in a gas through its leaves and water through its roots.", "Una planta toma un gas por sus hojas y agua por sus raíces."),
      bi("Plants use light energy to combine carbon dioxide and water into sugar.", "Las plantas usan la energía de la luz para combinar dióxido de carbono y agua y formar azúcar."),
    ),
    e(
      bi("What are the products of photosynthesis?", "¿Cuáles son los productos de la fotosíntesis?"),
      bi("Glucose (sugar) and oxygen", "Glucosa (azúcar) y oxígeno"),
      [
        m("swapped-inputs-outputs", "Carbon dioxide and water", "Dióxido de carbono y agua"),
        m("mixed-up-gases", "Glucose and carbon dioxide", "Glucosa y dióxido de carbono"),
        m("thinks-plants-eat-soil", "Soil and minerals", "Suelo y minerales"),
      ],
      bi("Animals breathe in one of the products.", "Los animales inhalan uno de los productos."),
      bi("Photosynthesis makes glucose, which stores energy, and releases oxygen into the air.", "La fotosíntesis produce glucosa, que guarda energía, y libera oxígeno al aire."),
    ),
    e(
      bi("What are the inputs of cellular respiration?", "¿Cuáles son las entradas de la respiración celular?"),
      bi("Glucose and oxygen", "Glucosa y oxígeno"),
      [
        m("swapped-inputs-outputs", "Carbon dioxide and water", "Dióxido de carbono y agua"),
        m("confused-photosynthesis-respiration", "Light energy and water", "Energía de la luz y agua"),
        m("mixed-up-gases", "Glucose and carbon dioxide", "Glucosa y dióxido de carbono"),
      ],
      bi("Respiration releases energy from food, and it needs the gas you breathe in.", "La respiración libera energía de los alimentos y necesita el gas que inhalas."),
      bi("Cells break down glucose using oxygen to release energy they can use.", "Las células descomponen la glucosa usando oxígeno para liberar energía que pueden usar."),
    ),
    e(
      bi("What are the products of cellular respiration?", "¿Cuáles son los productos de la respiración celular?"),
      bi("Carbon dioxide, water, and usable energy", "Dióxido de carbono, agua y energía utilizable"),
      [
        m("swapped-inputs-outputs", "Glucose and oxygen", "Glucosa y oxígeno"),
        m("confused-photosynthesis-respiration", "Sugar and light", "Azúcar y luz"),
        m("mixed-up-gases", "Oxygen and water", "Oxígeno y agua"),
      ],
      bi("You breathe out one of the products.", "Exhalas uno de los productos."),
      bi("Respiration turns glucose and oxygen into carbon dioxide and water, releasing energy for the cell.", "La respiración convierte la glucosa y el oxígeno en dióxido de carbono y agua, y libera energía para la célula."),
    ),
    e(
      bi("In which organelle does photosynthesis happen?", "¿En qué organelo ocurre la fotosíntesis?"),
      bi("Chloroplast", "Cloroplasto"),
      [m("mixed-up-organelles", "Mitochondrion", "Mitocondria"), m("mixed-up-organelles", "Nucleus", "Núcleo"), m("mixed-up-organelles", "Vacuole", "Vacuola")],
      bi("It contains the green pigment chlorophyll.", "Contiene el pigmento verde llamado clorofila."),
      bi("Chloroplasts capture light energy with chlorophyll and use it to make sugar.", "Los cloroplastos captan la energía de la luz con la clorofila y la usan para producir azúcar."),
    ),
    e(
      bi("In which organelle does most of cellular respiration happen?", "¿En qué organelo ocurre la mayor parte de la respiración celular?"),
      bi("Mitochondrion", "Mitocondria"),
      [m("mixed-up-organelles", "Chloroplast", "Cloroplasto"), m("mixed-up-organelles", "Ribosome", "Ribosoma"), m("mixed-up-organelles", "Cell wall", "Pared celular")],
      bi("It is found in both plant and animal cells.", "Está en las células vegetales y en las animales."),
      bi("Mitochondria use oxygen to break down glucose and release usable energy.", "Las mitocondrias usan oxígeno para descomponer la glucosa y liberar energía utilizable."),
    ),
    e(
      bi("Which living things carry out cellular respiration?", "¿Qué seres vivos realizan la respiración celular?"),
      bi("Both plants and animals", "Tanto las plantas como los animales"),
      [
        m("thinks-plants-dont-respire", "Only animals", "Solo los animales"),
        m("confused-photosynthesis-respiration", "Only plants", "Solo las plantas"),
        m("thinks-plants-dont-respire", "Only animals with lungs", "Solo los animales con pulmones"),
      ],
      bi("A plant's cells need to use energy too, even in the dark.", "Las células de una planta también necesitan usar energía, incluso en la oscuridad."),
      bi("Plants make sugar by photosynthesis, but all of their cells also respire to release its energy, just like animal cells.", "Las plantas producen azúcar por fotosíntesis, pero todas sus células también respiran para liberar su energía, igual que las células animales."),
    ),
    e(
      bi("Most of the dry mass of a big tree's wood came from where?", "¿De dónde vino la mayor parte de la masa seca de la madera de un árbol grande?"),
      bi("Carbon dioxide taken in from the air", "Del dióxido de carbono que tomó del aire"),
      [
        m("thinks-mass-from-soil", "Minerals taken in from the soil", "De los minerales que tomó del suelo"),
        m("thinks-light-is-matter", "Sunlight that turned into wood", "De la luz del Sol que se convirtió en madera"),
        m("thinks-mass-from-soil", "Fertilizer added by people", "Del fertilizante que agregaron las personas"),
      ],
      bi("Wood is mostly carbon, built into sugars and other molecules.", "La madera es sobre todo carbono, unido en azúcares y otras moléculas."),
      bi("The carbon in wood comes from carbon dioxide in the air, fixed by photosynthesis. Soil gives only small amounts of minerals, and light is energy, not matter.", "El carbono de la madera viene del dióxido de carbono del aire, captado por la fotosíntesis. El suelo da solo pequeñas cantidades de minerales, y la luz es energía, no materia."),
    ),
    e(
      bi("How does carbon dioxide get into a leaf?", "¿Cómo entra el dióxido de carbono a una hoja?"),
      bi("Through tiny openings called stomata", "Por pequeñas aberturas llamadas estomas"),
      [
        m("thinks-roots-take-co2", "Up through the roots from the soil", "Subiendo por las raíces desde el suelo"),
        m("thinks-co2-made-in-leaf", "The leaf makes it from water", "La hoja lo produce a partir del agua"),
        m("thinks-plants-eat-soil", "Through the flowers, with pollen", "Por las flores, con el polen"),
      ],
      bi("Leaves have pores, mostly on their undersides.", "Las hojas tienen poros, sobre todo en su parte de abajo."),
      bi("Stomata open to let carbon dioxide in and let oxygen and water vapor out.", "Los estomas se abren para dejar entrar el dióxido de carbono y dejar salir el oxígeno y el vapor de agua."),
    ),
    e(
      bi("A plant is kept in total darkness for two days. Which process stops?", "Una planta se mantiene en oscuridad total durante dos días. ¿Qué proceso se detiene?"),
      bi("Photosynthesis", "La fotosíntesis"),
      [
        m("thinks-respiration-needs-light", "Cellular respiration", "La respiración celular"),
        m("thinks-respiration-needs-light", "Both photosynthesis and respiration", "La fotosíntesis y la respiración"),
        m("ignores-light-need", "Neither one", "Ninguno de los dos"),
      ],
      bi("Which process needs light energy as an input?", "¿Qué proceso necesita la energía de la luz como entrada?"),
      bi("Without light, photosynthesis cannot run. Respiration keeps going, using stored sugar.", "Sin luz, la fotosíntesis no puede ocurrir. La respiración continúa, usando el azúcar guardado."),
    ),
    e(
      bi("Photosynthesis changes light energy into which kind of energy?", "¿En qué tipo de energía convierte la fotosíntesis la energía de la luz?"),
      bi("Chemical energy stored in sugar", "Energía química guardada en el azúcar"),
      [m("energy-type-mixup", "Thermal energy", "Energía térmica"), m("energy-type-mixup", "Kinetic energy", "Energía cinética"), m("energy-type-mixup", "Electrical energy", "Energía eléctrica")],
      bi("The energy ends up stored in the bonds of a molecule.", "La energía termina guardada en los enlaces de una molécula."),
      bi("The energy of light is stored as chemical energy in glucose, which cells release later in respiration.", "La energía de la luz se guarda como energía química en la glucosa, que las células liberan después en la respiración."),
    ),
    e(
      bi("Which gas do plants release in photosynthesis that animals use in respiration?", "¿Qué gas liberan las plantas en la fotosíntesis que los animales usan en la respiración?"),
      bi("Oxygen", "Oxígeno"),
      [m("mixed-up-gases", "Carbon dioxide", "Dióxido de carbono"), m("mixed-up-gases", "Nitrogen", "Nitrógeno"), m("mixed-up-gases", "Methane", "Metano")],
      bi("It is the gas you need to breathe in.", "Es el gas que necesitas inhalar."),
      bi("Plants release oxygen, and animals use it to break down food. Animals breathe out carbon dioxide, which plants take in.", "Las plantas liberan oxígeno, y los animales lo usan para descomponer el alimento. Los animales exhalan dióxido de carbono, que las plantas toman."),
    ),
    e(
      bi("A plant sits in bright sunlight. Are its cells doing cellular respiration?", "Una planta está bajo luz solar intensa. ¿Sus células están haciendo respiración celular?"),
      bi("Yes; plant cells respire all the time, day and night.", "Sí; las células de la planta respiran todo el tiempo, de día y de noche."),
      [
        m("thinks-respiration-only-at-night", "No; plants respire only at night.", "No; las plantas solo respiran de noche."),
        m("thinks-plants-dont-respire", "No; plants never respire.", "No; las plantas nunca respiran."),
        m("confused-photosynthesis-respiration", "No; in sunlight, photosynthesis replaces respiration.", "No; con luz, la fotosíntesis reemplaza a la respiración."),
      ],
      bi("Every living cell needs a steady supply of usable energy.", "Toda célula viva necesita un suministro constante de energía utilizable."),
      bi("In light a plant does both: it makes sugar and also breaks some down. In daylight it usually makes more oxygen than it uses.", "Con luz, la planta hace las dos cosas: produce azúcar y también descompone parte de ella. De día suele producir más oxígeno del que usa."),
    ),
  ],
};

const MATTER_ENERGY: Bank = {
  nudge: bi("Is the question about matter (atoms) or about energy?", "¿La pregunta trata de la materia (los átomos) o de la energía?"),
  strategy: bi(
    "Matter cycles: the same atoms move between air, soil, and living things again and again. Energy flows one way: from the Sun to producers to consumers, and about 90% is given off as heat at each step.",
    "La materia circula: los mismos átomos pasan una y otra vez entre el aire, el suelo y los seres vivos. La energía fluye en un solo sentido: del Sol a los productores y a los consumidores, y cerca del 90% se libera como calor en cada paso.",
  ),
  seconds: 30,
  items: [
    e(
      bi("Which statement about an ecosystem is true?", "¿Qué enunciado sobre un ecosistema es verdadero?"),
      bi("Matter cycles, but energy flows through in one direction.", "La materia circula, pero la energía fluye en un solo sentido."),
      [
        m("swapped-matter-energy", "Energy cycles, but matter flows through and is used up.", "La energía circula, pero la materia fluye y se gasta."),
        m("thinks-matter-destroyed", "Both matter and energy are used up.", "Tanto la materia como la energía se gastan."),
        m("thinks-energy-recycles", "Both matter and energy cycle forever.", "Tanto la materia como la energía circulan para siempre."),
      ],
      bi("Atoms are reused; heat escapes and cannot be used again by living things.", "Los átomos se reutilizan; el calor se escapa y los seres vivos no pueden volver a usarlo."),
      bi("Atoms such as carbon are passed around again and again, but energy enters as sunlight and leaves as heat.", "Átomos como el carbono pasan una y otra vez de un lugar a otro, pero la energía entra como luz solar y sale como calor."),
    ),
    e(
      bi("What happens to most of the energy at each level of a food chain?", "¿Qué pasa con la mayor parte de la energía en cada nivel de una cadena alimentaria?"),
      bi("It is used for life processes and given off as heat.", "Se usa en los procesos de la vida y se libera como calor."),
      [
        m("thinks-all-energy-passes", "It is all stored and passed to the next level.", "Toda se guarda y pasa al siguiente nivel."),
        m("thinks-energy-destroyed", "It is destroyed.", "Se destruye."),
        m("thinks-energy-recycles", "It returns to the Sun.", "Regresa al Sol."),
      ],
      bi("Moving, growing, and staying warm all use energy.", "Moverse, crecer y mantenerse caliente usan energía."),
      bi("Only about 10% of the energy is stored in new body mass. The rest is used and ends up as heat, which is not destroyed but leaves the food chain.", "Solo cerca del 10% de la energía se guarda en nueva masa corporal. El resto se usa y termina como calor, que no se destruye pero sale de la cadena alimentaria."),
    ),
    e(
      bi("The plants in a meadow store 20,000 units of energy. About how much reaches the animals that eat the plants?", "Las plantas de un prado guardan 20,000 unidades de energía. ¿Aproximadamente cuánta llega a los animales que comen las plantas?"),
      bi("About 2,000 units", "Unas 2,000 unidades"),
      [
        m("thinks-all-energy-passes", "About 20,000 units", "Unas 20,000 unidades"),
        m("thinks-half-passes", "About 10,000 units", "Unas 10,000 unidades"),
        m("moved-two-levels", "About 200 units", "Unas 200 unidades"),
      ],
      bi("Use the 10% rule once.", "Usa la regla del 10% una vez."),
      bi("About 10% passes up one level: 10% of 20,000 is 2,000.", "Cerca del 10% pasa al siguiente nivel: el 10% de 20,000 es 2,000."),
    ),
    e(
      bi("In the food chain grass → grasshopper → frog → snake, the grass stores 50,000 units of energy. About how much reaches the frogs?", "En la cadena alimentaria pasto → saltamontes → rana → serpiente, el pasto guarda 50,000 unidades de energía. ¿Aproximadamente cuánta llega a las ranas?"),
      bi("About 500 units", "Unas 500 unidades"),
      [
        m("stopped-one-level-early", "About 5,000 units", "Unas 5,000 unidades"),
        m("thinks-all-energy-passes", "About 50,000 units", "Unas 50,000 unidades"),
        m("moved-two-levels", "About 50 units", "Unas 50 unidades"),
      ],
      bi("The frogs are two steps above the grass.", "Las ranas están dos pasos arriba del pasto."),
      bi("Grass to grasshoppers: 10% of 50,000 is 5,000. Grasshoppers to frogs: 10% of 5,000 is 500.", "Del pasto a los saltamontes: el 10% de 50,000 es 5,000. De los saltamontes a las ranas: el 10% de 5,000 es 500."),
    ),
    e(
      bi("What do decomposers do in the cycling of matter?", "¿Qué hacen los descomponedores en el ciclo de la materia?"),
      bi("Break down dead matter and return nutrients to the soil and air", "Descomponen la materia muerta y devuelven nutrientes al suelo y al aire"),
      [
        m("confused-producers-decomposers", "Make food from sunlight", "Producen alimento con la luz del Sol"),
        m("confused-consumers-decomposers", "Hunt and eat living animals", "Cazan y comen animales vivos"),
        m("thinks-matter-destroyed", "Destroy matter so that it is gone", "Destruyen la materia para que desaparezca"),
      ],
      bi("Think of mushrooms and worms on a rotting log.", "Piensa en hongos y lombrices sobre un tronco que se pudre."),
      bi("Fungi and bacteria break down dead things into carbon dioxide, water, and nutrients that producers use again.", "Los hongos y las bacterias descomponen los seres muertos en dióxido de carbono, agua y nutrientes que los productores vuelven a usar."),
    ),
    e(
      bi("In the carbon cycle, which process moves carbon from the air into living things?", "En el ciclo del carbono, ¿qué proceso mueve el carbono del aire a los seres vivos?"),
      bi("Photosynthesis", "La fotosíntesis"),
      [m("reversed-carbon-flow", "Cellular respiration", "La respiración celular"), m("confused-water-cycle", "Evaporation", "La evaporación"), m("reversed-carbon-flow", "Decomposition", "La descomposición")],
      bi("Which process takes in carbon dioxide?", "¿Qué proceso toma dióxido de carbono?"),
      bi("Producers take carbon dioxide from the air and build it into sugar. Respiration and decomposition send carbon back to the air.", "Los productores toman dióxido de carbono del aire y lo convierten en azúcar. La respiración y la descomposición regresan el carbono al aire."),
    ),
    e(
      bi("Which process returns carbon to the air as carbon dioxide?", "¿Qué proceso devuelve carbono al aire en forma de dióxido de carbono?"),
      bi("Cellular respiration", "La respiración celular"),
      [m("reversed-carbon-flow", "Photosynthesis", "La fotosíntesis"), m("confused-water-cycle", "Condensation", "La condensación"), m("confused-water-cycle", "Precipitation", "La precipitación")],
      bi("You do this process every time you breathe out.", "Haces este proceso cada vez que exhalas."),
      bi("Living things break down sugar in respiration and release carbon dioxide into the air.", "Los seres vivos descomponen el azúcar en la respiración y liberan dióxido de carbono al aire."),
    ),
    e(
      bi("A field has many more mice than hawks. Why?", "Un campo tiene muchos más ratones que halcones. ¿Por qué?"),
      bi("Less energy is available at each higher level of a food chain.", "Hay menos energía disponible en cada nivel más alto de una cadena alimentaria."),
      [
        m("ignores-energy-loss", "Hawks live longer, so fewer are needed.", "Los halcones viven más, así que se necesitan menos."),
        m("confused-producers-consumers", "Hawks make their own food.", "Los halcones producen su propio alimento."),
        m("thinks-all-energy-passes", "Mice pass all of their energy to hawks.", "Los ratones pasan toda su energía a los halcones."),
      ],
      bi("Each level gets only a small part of the energy of the level below.", "Cada nivel recibe solo una pequeña parte de la energía del nivel de abajo."),
      bi("Because about 90% of the energy is lost at each step, the energy in many mice supports only a few hawks.", "Como cerca del 90% de la energía se pierde en cada paso, la energía de muchos ratones alcanza solo para unos pocos halcones."),
    ),
    e(
      bi("Where did the atoms in a rabbit's body come from?", "¿De dónde vinieron los átomos del cuerpo de un conejo?"),
      bi("From the plants it ate, which built them from air, water, and soil minerals", "De las plantas que comió, que los tomaron del aire, del agua y de los minerales del suelo"),
      [
        m("thinks-light-is-matter", "From sunlight that turned into matter", "De la luz del Sol que se convirtió en materia"),
        m("thinks-matter-created", "The rabbit's body made new atoms", "El cuerpo del conejo creó átomos nuevos"),
        m("thinks-energy-recycles", "From the heat the rabbit absorbs", "Del calor que absorbe el conejo"),
      ],
      bi("Atoms are never made or destroyed in living things; they are passed along.", "Los átomos nunca se crean ni se destruyen en los seres vivos; solo pasan de uno a otro."),
      bi("The rabbit rearranges atoms from the plants it eats. The plants got those atoms from carbon dioxide, water, and minerals.", "El conejo reacomoda los átomos de las plantas que come. Las plantas obtuvieron esos átomos del dióxido de carbono, el agua y los minerales."),
    ),
    e(
      bi("A fallen log rots away over several years. What happens to its matter?", "Un tronco caído se pudre durante varios años. ¿Qué pasa con su materia?"),
      bi("Decomposers change it into carbon dioxide, water, and nutrients that other living things use.", "Los descomponedores la convierten en dióxido de carbono, agua y nutrientes que otros seres vivos usan."),
      [
        m("thinks-matter-destroyed", "It disappears completely.", "Desaparece por completo."),
        m("thinks-matter-becomes-energy", "It turns into energy.", "Se convierte en energía."),
        m("confused-water-cycle", "It evaporates like water.", "Se evapora como el agua."),
      ],
      bi("The atoms in the log have to go somewhere.", "Los átomos del tronco tienen que ir a algún lado."),
      bi("The log's atoms are not lost. Decomposers release them as gases and nutrients that plants take up again.", "Los átomos del tronco no se pierden. Los descomponedores los liberan como gases y nutrientes que las plantas vuelven a tomar."),
    ),
    e(
      bi("Which level of an energy pyramid has the most energy?", "¿Qué nivel de una pirámide de energía tiene más energía?"),
      bi("Producers, at the bottom", "Los productores, en la base"),
      [m("inverted-pyramid", "Top predators", "Los depredadores tope"), m("inverted-pyramid", "Secondary consumers", "Los consumidores secundarios"), m("inverted-pyramid", "Primary consumers", "Los consumidores primarios")],
      bi("Energy is lost at every step up.", "Se pierde energía en cada paso hacia arriba."),
      bi("All the energy for the pyramid enters through the producers, and each level above has less.", "Toda la energía de la pirámide entra por los productores, y cada nivel de arriba tiene menos."),
    ),
    e(
      bi("What is the source of energy for almost every ecosystem on Earth?", "¿Cuál es la fuente de energía de casi todos los ecosistemas de la Tierra?"),
      bi("The Sun", "El Sol"),
      [m("thinks-plants-eat-soil", "The soil", "El suelo"), m("thinks-energy-recycles", "Decomposers", "Los descomponedores"), m("thinks-mass-from-soil", "Water", "El agua")],
      bi("Where do producers get the energy to make food?", "¿De dónde obtienen los productores la energía para producir alimento?"),
      bi("Producers capture sunlight in photosynthesis, and that energy then flows to consumers.", "Los productores captan la luz del Sol en la fotosíntesis, y esa energía luego fluye a los consumidores."),
    ),
    e(
      bi("When people burn coal, oil, or gas, which substance is added to the air?", "Cuando las personas queman carbón, petróleo o gas, ¿qué sustancia se agrega al aire?"),
      bi("Carbon dioxide", "Dióxido de carbono"),
      [
        m("mixed-up-gases", "Oxygen", "Oxígeno"),
        m("thinks-matter-destroyed", "Nothing; burning destroys the fuel's matter", "Nada; quemar destruye la materia del combustible"),
        m("reversed-carbon-flow", "Glucose", "Glucosa"),
      ],
      bi("These fuels are made of carbon from ancient living things.", "Estos combustibles están hechos de carbono de seres vivos antiguos."),
      bi("Burning combines the carbon in fuel with oxygen, releasing carbon dioxide that had been stored underground for millions of years.", "Al quemar, el carbono del combustible se une con oxígeno y se libera dióxido de carbono que estuvo guardado bajo tierra millones de años."),
    ),
  ],
};

// ── s.mixtures ──────────────────────────────────────────────────────────────────────────────────

const ELEMENT = bi("An element", "Un elemento");
const COMPOUND = bi("A compound", "Un compuesto");
const HOMO = bi("A homogeneous mixture (solution)", "Una mezcla homogénea (disolución)");
const HETERO = bi("A heterogeneous mixture", "Una mezcla heterogénea");

const MIXTURES: Bank = {
  nudge: bi("Is it one kind of atom, atoms joined in a fixed ratio, or substances just mixed together?", "¿Es un solo tipo de átomo, átomos unidos en una proporción fija o sustancias solo mezcladas?"),
  strategy: bi(
    "An element has one kind of atom. A compound has elements chemically joined in a fixed ratio. A mixture has substances mixed in any amounts that can be separated by physical means, like filtering or evaporating.",
    "Un elemento tiene un solo tipo de átomo. Un compuesto tiene elementos unidos químicamente en una proporción fija. Una mezcla tiene sustancias combinadas en cualquier cantidad que se pueden separar por medios físicos, como filtrar o evaporar.",
  ),
  seconds: 20,
  items: [
    e(
      bi("Which of these is an element?", "¿Cuál de estos es un elemento?"),
      bi("Gold", "Oro"),
      [m("element-compound-mixup", "Water", "Agua"), m("compound-mixture-mixup", "Salt water", "Agua salada"), m("element-compound-mixup", "Carbon dioxide", "Dióxido de carbono")],
      bi("Look for the one made of a single kind of atom.", "Busca el que está hecho de un solo tipo de átomo."),
      bi("Gold is made only of gold atoms, so it is an element. Water and carbon dioxide are compounds, and salt water is a mixture.", "El oro está hecho solo de átomos de oro, así que es un elemento. El agua y el dióxido de carbono son compuestos, y el agua salada es una mezcla."),
    ),
    e(
      bi("Which of these is a compound?", "¿Cuál de estos es un compuesto?"),
      bi("Water (H₂O)", "Agua (H₂O)"),
      [m("element-compound-mixup", "Oxygen gas (O₂)", "Oxígeno gaseoso (O₂)"), m("compound-mixture-mixup", "Air", "Aire"), m("element-compound-mixup", "Iron (Fe)", "Hierro (Fe)")],
      bi("A compound needs at least two different elements joined together.", "Un compuesto necesita al menos dos elementos distintos unidos."),
      bi("Water joins hydrogen and oxygen in a fixed 2 to 1 ratio. O₂ is two atoms of one element, so it is still an element.", "El agua une hidrógeno y oxígeno en una proporción fija de 2 a 1. El O₂ son dos átomos del mismo elemento, así que sigue siendo un elemento."),
    ),
    e(
      bi("Which of these is a mixture?", "¿Cuál de estos es una mezcla?"),
      bi("Air", "Aire"),
      [m("compound-mixture-mixup", "Carbon dioxide", "Dióxido de carbono"), m("element-compound-mixup", "Gold", "Oro"), m("compound-mixture-mixup", "Pure water", "Agua pura")],
      bi("This one is made of several gases that are not joined to each other.", "Este está formado por varios gases que no están unidos entre sí."),
      bi("Air is mostly nitrogen and oxygen mixed together with other gases, in amounts that can vary. Carbon dioxide and pure water are compounds.", "El aire es sobre todo nitrógeno y oxígeno mezclados con otros gases, en cantidades que pueden variar. El dióxido de carbono y el agua pura son compuestos."),
    ),
    e(
      bi("Salt dissolved in water looks the same all the way through. What is it?", "La sal disuelta en agua se ve igual en todas partes. ¿Qué es?"),
      HOMO,
      [mx("compound-mixture-mixup", COMPOUND), mx("homogeneous-heterogeneous-mixup", HETERO), mx("element-compound-mixup", ELEMENT)],
      bi("You can get the salt back by letting the water evaporate.", "Puedes recuperar la sal si dejas que el agua se evapore."),
      bi("Salt water is evenly mixed and can be separated physically, so it is a homogeneous mixture, also called a solution.", "El agua salada está mezclada de manera uniforme y se puede separar por medios físicos, así que es una mezcla homogénea, también llamada disolución."),
    ),
    e(
      bi("A bowl of trail mix has nuts, raisins, and seeds that you can pick apart. What is it?", "Un tazón de mezcla de frutos secos tiene nueces, pasas y semillas que puedes separar. ¿Qué es?"),
      HETERO,
      [mx("homogeneous-heterogeneous-mixup", HOMO), mx("compound-mixture-mixup", COMPOUND), mx("element-compound-mixup", ELEMENT)],
      bi("Can you see the different parts?", "¿Puedes ver las distintas partes?"),
      bi("The parts are visible and unevenly spread, so trail mix is a heterogeneous mixture.", "Las partes se ven y no están repartidas de forma uniforme, así que es una mezcla heterogénea."),
    ),
    e(
      bi("In salt water, which substance is the solute?", "En el agua salada, ¿cuál sustancia es el soluto?"),
      bi("The salt", "La sal"),
      [m("solute-solvent-mixup", "The water", "El agua"), m("whole-solution-as-solute", "The salt water", "El agua salada")],
      bi("The solute is the substance that gets dissolved.", "El soluto es la sustancia que se disuelve."),
      bi("Salt dissolves in water, so salt is the solute and water is the solvent. Together they make the solution.", "La sal se disuelve en el agua, así que la sal es el soluto y el agua es el disolvente. Juntos forman la disolución."),
    ),
    e(
      bi("You want to separate sand from water and keep both. Which method works best?", "Quieres separar arena del agua y quedarte con las dos. ¿Qué método funciona mejor?"),
      bi("Pour it through a filter", "Pasarla por un filtro"),
      [
        m("wrong-separation-method", "Use a magnet", "Usar un imán"),
        m("loses-a-part", "Boil away the water", "Hervir el agua hasta que se evapore"),
        m("thinks-stirring-separates", "Stir it quickly", "Revolverla rápido"),
      ],
      bi("Sand grains are too big to pass through tiny holes.", "Los granos de arena son demasiado grandes para pasar por agujeros diminutos."),
      bi("A filter lets the water through and catches the sand. Boiling would also leave the sand, but the water would be lost to the air.", "Un filtro deja pasar el agua y atrapa la arena. Hervir también dejaría la arena, pero el agua se perdería en el aire."),
    ),
    e(
      bi("How can you get the salt back out of salt water?", "¿Cómo puedes recuperar la sal del agua salada?"),
      bi("Let the water evaporate", "Dejar que el agua se evapore"),
      [
        m("thinks-filter-removes-dissolved", "Pour it through a paper filter", "Pasarla por un filtro de papel"),
        m("wrong-separation-method", "Use a magnet", "Usar un imán"),
        m("thinks-stirring-separates", "Stir it until the salt settles", "Revolverla hasta que la sal se asiente"),
      ],
      bi("Dissolved salt is split into particles far too small to catch.", "La sal disuelta está dividida en partículas demasiado pequeñas para atraparlas."),
      bi("Dissolved salt passes right through a filter. When the water evaporates, the salt is left behind.", "La sal disuelta pasa a través de un filtro. Cuando el agua se evapora, la sal queda en el recipiente."),
    ),
    e(
      bi("Iron filings are mixed with sand. What is the easiest way to separate them?", "Hay limaduras de hierro mezcladas con arena. ¿Cuál es la forma más fácil de separarlas?"),
      bi("Use a magnet", "Usar un imán"),
      [
        m("wrong-separation-method", "Pour the mixture through a filter", "Pasar la mezcla por un filtro"),
        m("wrong-separation-method", "Add water and let it evaporate", "Agregar agua y dejar que se evapore"),
        m("thinks-stirring-separates", "Stir the mixture", "Revolver la mezcla"),
      ],
      bi("Which substance has a property the other does not?", "¿Qué sustancia tiene una propiedad que la otra no tiene?"),
      bi("Iron is attracted to a magnet and sand is not, so a magnet pulls the iron out.", "El hierro es atraído por un imán y la arena no, así que un imán saca el hierro."),
    ),
    e(
      bi("Sodium is a soft metal that reacts with water, and chlorine is a poisonous green gas. Together they form table salt, which is safe to eat. What does this show?", "El sodio es un metal blando que reacciona con el agua, y el cloro es un gas verde venenoso. Juntos forman la sal de mesa, que se puede comer. ¿Qué muestra esto?"),
      bi("A compound can have very different properties from its elements.", "Un compuesto puede tener propiedades muy distintas a las de sus elementos."),
      [
        m("thinks-compound-keeps-properties", "A compound keeps the properties of its elements.", "Un compuesto conserva las propiedades de sus elementos."),
        m("compound-mixture-mixup", "Table salt is a mixture of sodium and chlorine.", "La sal de mesa es una mezcla de sodio y cloro."),
        m("element-compound-mixup", "Table salt is an element.", "La sal de mesa es un elemento."),
      ],
      bi("Compare the properties of salt with the properties of sodium and chlorine.", "Compara las propiedades de la sal con las del sodio y el cloro."),
      bi("When elements join chemically, they form a new substance with new properties. Salt is neither a metal nor a poisonous gas.", "Cuando los elementos se unen químicamente, forman una sustancia nueva con propiedades nuevas. La sal no es un metal ni un gas venenoso."),
    ),
    e(
      bi("Every water molecule has 2 hydrogen atoms and 1 oxygen atom. What does this show about compounds?", "Toda molécula de agua tiene 2 átomos de hidrógeno y 1 de oxígeno. ¿Qué muestra esto sobre los compuestos?"),
      bi("A compound always has the same fixed ratio of elements.", "Un compuesto siempre tiene la misma proporción fija de elementos."),
      [
        m("compound-mixture-mixup", "The amounts in a compound can vary, like in a mixture.", "Las cantidades en un compuesto pueden variar, como en una mezcla."),
        m("element-compound-mixup", "Water is an element made of three atoms.", "El agua es un elemento formado por tres átomos."),
        m("thinks-compound-keeps-properties", "Water has the properties of hydrogen and oxygen gas.", "El agua tiene las propiedades del hidrógeno y del oxígeno gaseosos."),
      ],
      bi("Does water ever come with 3 hydrogen atoms per oxygen?", "¿El agua alguna vez tiene 3 átomos de hidrógeno por cada oxígeno?"),
      bi("A compound always has its elements in the same ratio. Change the ratio and you get a different substance.", "Un compuesto siempre tiene sus elementos en la misma proporción. Si cambias la proporción, obtienes una sustancia distinta."),
    ),
    e(
      bi("Why is tap water a mixture, while pure water is a compound?", "¿Por qué el agua de la llave es una mezcla, mientras que el agua pura es un compuesto?"),
      bi("Tap water has small amounts of minerals and gases dissolved in it.", "El agua de la llave tiene pequeñas cantidades de minerales y gases disueltos."),
      [
        m("element-compound-mixup", "Tap water is made of different atoms than pure water.", "El agua de la llave está hecha de átomos distintos a los del agua pura."),
        m("thinks-compound-keeps-properties", "Tap water is a mixture of hydrogen gas and oxygen gas.", "El agua de la llave es una mezcla de hidrógeno gaseoso y oxígeno gaseoso."),
        m("compound-mixture-mixup", "Pipes turn the water molecules into a mixture.", "Las tuberías convierten las moléculas de agua en una mezcla."),
      ],
      bi("What is in tap water besides water molecules?", "¿Qué hay en el agua de la llave además de moléculas de agua?"),
      bi("Pure water is only H₂O. Tap water also has dissolved minerals and gases, so it is a mixture.", "El agua pura es solo H₂O. El agua de la llave también tiene minerales y gases disueltos, así que es una mezcla."),
    ),
    e(
      bi("Brass is made by melting copper and zinc together. The metal looks the same throughout, and the amounts can vary. What is brass?", "El latón se hace fundiendo cobre y zinc juntos. El metal se ve igual en todas partes, y las cantidades pueden variar. ¿Qué es el latón?"),
      HOMO,
      [mx("compound-mixture-mixup", COMPOUND), mx("element-compound-mixup", ELEMENT), mx("homogeneous-heterogeneous-mixup", HETERO)],
      bi("The amounts can vary, so it is not a compound.", "Las cantidades pueden variar, así que no es un compuesto."),
      bi("Brass is a solid solution called an alloy: two metals evenly mixed in amounts that can change.", "El latón es una disolución sólida llamada aleación: dos metales mezclados de manera uniforme en cantidades que pueden cambiar."),
    ),
    e(
      bi("Which can be separated into its parts by physical means, such as filtering or evaporating?", "¿Cuál se puede separar en sus partes por medios físicos, como filtrar o evaporar?"),
      bi("A mixture", "Una mezcla"),
      [mx("compound-mixture-mixup", COMPOUND), mx("element-compound-mixup", ELEMENT)],
      bi("Which one is made of substances that are not chemically joined?", "¿Cuál está formado por sustancias que no están unidas químicamente?"),
      bi("The parts of a mixture keep their own properties, so physical methods can pull them apart. Breaking a compound takes a chemical reaction.", "Las partes de una mezcla conservan sus propiedades, así que los métodos físicos pueden separarlas. Separar un compuesto requiere una reacción química."),
    ),
  ],
};

// ── s.reaction.signs ────────────────────────────────────────────────────────────────────────────

const CHEMICAL = bi("A chemical reaction", "Una reacción química");
const PHYSICAL = bi("A physical change", "Un cambio físico");

const REACTION_SIGNS: Bank = {
  nudge: bi("Did a new substance form, or did the same substance just change form?", "¿Se formó una sustancia nueva o la misma sustancia solo cambió de forma?"),
  strategy: bi(
    "Signs of a chemical reaction: a gas forms (not from boiling), a new color appears, the temperature changes on its own, a solid (precipitate) forms from two liquids, light is given off, or a new smell appears. Melting, boiling, dissolving, and mixing colors are physical changes.",
    "Señales de una reacción química: se forma un gas (no por hervir), aparece un color nuevo, la temperatura cambia sola, se forma un sólido (precipitado) a partir de dos líquidos, se emite luz o aparece un olor nuevo. Fundirse, hervir, disolverse y mezclar colores son cambios físicos.",
  ),
  seconds: 25,
  items: [
    e(
      bi("Vinegar is poured on baking soda, and the mixture fizzes and bubbles. What is the best evidence of a chemical reaction?", "Se vierte vinagre sobre bicarbonato de sodio y la mezcla burbujea. ¿Cuál es la mejor evidencia de una reacción química?"),
      bi("A gas forms that was not there before.", "Se forma un gas que antes no estaba."),
      [
        m("thinks-dissolving-is-reaction", "The baking soda disappears into the liquid.", "El bicarbonato desaparece en el líquido."),
        m("physical-change-as-reaction", "The mixture is wet.", "La mezcla está mojada."),
        m("color-mixing-as-reaction", "The mixture is white.", "La mezcla es blanca."),
      ],
      bi("The bubbles are not from boiling, since nothing was heated.", "Las burbujas no son por hervir, porque nada se calentó."),
      bi("The bubbles are carbon dioxide, a new substance made by the reaction.", "Las burbujas son dióxido de carbono, una sustancia nueva que produjo la reacción."),
    ),
    e(
      bi("Two clear liquids are mixed, and a cloudy solid forms and settles to the bottom. What is the solid called?", "Se mezclan dos líquidos transparentes y se forma un sólido turbio que se asienta en el fondo. ¿Cómo se llama el sólido?"),
      bi("A precipitate", "Un precipitado"),
      [m("precipitate-solution-mixup", "A solution", "Una disolución"), m("missed-precipitate-sign", "A solvent", "Un disolvente"), m("physical-change-as-reaction", "Ice", "Hielo")],
      bi("It comes out of the liquid as a new solid.", "Sale del líquido como un sólido nuevo."),
      bi("A solid that forms when two liquids react is a precipitate, a sign that a new substance formed.", "Un sólido que se forma cuando reaccionan dos líquidos es un precipitado, una señal de que se formó una sustancia nueva."),
    ),
    e(
      bi("Which of these is NOT evidence of a chemical reaction?", "¿Cuál de estas NO es evidencia de una reacción química?"),
      bi("Water boiling and making bubbles", "El agua hirviendo y haciendo burbujas"),
      [
        m("missed-real-reaction-sign", "An iron nail turning orange-brown with rust", "Un clavo de hierro que se pone café anaranjado por el óxido"),
        m("missed-real-reaction-sign", "A match burning with light and heat", "Un cerillo que arde con luz y calor"),
        m("missed-real-reaction-sign", "Milk turning sour and smelling different", "La leche que se agria y huele distinto"),
      ],
      bi("In one choice, the bubbles are still the same substance.", "En una de las opciones, las burbujas siguen siendo la misma sustancia."),
      bi("Boiling water makes bubbles of water vapor, which is still water. Rusting, burning, and souring all make new substances.", "Al hervir, el agua forma burbujas de vapor de agua, que sigue siendo agua. El óxido, la combustión y el agriado producen sustancias nuevas."),
    ),
    e(
      bi("Sugar is stirred into water and seems to disappear. What kind of change is this?", "Se revuelve azúcar en agua y parece desaparecer. ¿Qué tipo de cambio es este?"),
      PHYSICAL,
      [mx("thinks-dissolving-is-reaction", CHEMICAL), m("thinks-matter-destroyed", "The sugar is destroyed", "El azúcar se destruye")],
      bi("If you let the water evaporate, what would be left?", "Si dejas que el agua se evapore, ¿qué quedaría?"),
      bi("Dissolving spreads the sugar out but does not change it. Evaporate the water and the sugar is still there.", "Al disolverse, el azúcar se reparte pero no cambia. Si evaporas el agua, el azúcar sigue ahí."),
    ),
    e(
      bi("A hand warmer packet gets hot when air reaches the iron powder inside. Which sign of a chemical reaction is this?", "Un calentador de manos se calienta cuando el aire llega al polvo de hierro de adentro. ¿Qué señal de reacción química es esta?"),
      bi("A temperature change", "Un cambio de temperatura"),
      [m("wrong-sign-named", "A precipitate forms", "Se forma un precipitado"), m("wrong-sign-named", "A gas forms", "Se forma un gas"), m("wrong-sign-named", "Light is given off", "Se emite luz")],
      bi("What do you feel with your hands?", "¿Qué sientes con las manos?"),
      bi("Iron reacting with oxygen releases energy as heat. The temperature rising on its own is the sign.", "El hierro que reacciona con el oxígeno libera energía en forma de calor. Que la temperatura suba sola es la señal."),
    ),
    e(
      bi("Bread is toasted. It turns brown and smells different. What kind of change is this?", "Se tuesta pan. Se pone café y huele distinto. ¿Qué tipo de cambio es este?"),
      CHEMICAL,
      [mx("physical-change-as-reaction", PHYSICAL), m("thinks-heat-only-melts", "Melting", "Una fusión")],
      bi("Can you turn toast back into bread?", "¿Puedes volver a convertir el pan tostado en pan?"),
      bi("Browning and a new smell show that new substances formed on the surface of the bread.", "El color café y el olor nuevo muestran que se formaron sustancias nuevas en la superficie del pan."),
    ),
    e(
      bi("Blue paint and yellow paint are mixed to make green paint. What kind of change is this?", "Se mezclan pintura azul y pintura amarilla para hacer pintura verde. ¿Qué tipo de cambio es este?"),
      PHYSICAL,
      [mx("color-mixing-as-reaction", CHEMICAL), m("thinks-matter-destroyed", "The blue and yellow paint are destroyed", "La pintura azul y la amarilla se destruyen")],
      bi("A color change counts only when a new substance makes the new color.", "Un cambio de color solo cuenta cuando una sustancia nueva produce el color nuevo."),
      bi("The blue and yellow pigments are just mixed together; no new substance forms. Your eye sees the mix as green.", "Los pigmentos azul y amarillo solo se mezclan; no se forma ninguna sustancia nueva. Tu ojo ve la mezcla como verde."),
    ),
    e(
      bi("When a candle burns, which observation shows a chemical reaction?", "Cuando una vela arde, ¿qué observación muestra una reacción química?"),
      bi("The flame gives off light and heat as the wax burns.", "La llama emite luz y calor mientras la cera se quema."),
      [
        m("melting-as-reaction", "The wax near the flame melts.", "La cera cerca de la llama se derrite."),
        m("melting-as-reaction", "Melted wax drips and hardens again.", "La cera derretida gotea y se vuelve a endurecer."),
        m("physical-change-as-reaction", "The candle is soft enough to bend when warm.", "La vela está tan blanda que se dobla cuando está tibia."),
      ],
      bi("Melting and hardening can go back and forth without making anything new.", "Derretirse y endurecerse puede ir y venir sin producir nada nuevo."),
      bi("Burning wax combines with oxygen to make carbon dioxide and water, giving off light and heat. Melting wax is only a physical change.", "La cera que arde se combina con oxígeno y forma dióxido de carbono y agua, y emite luz y calor. Que la cera se derrita es solo un cambio físico."),
    ),
    e(
      bi("A shiny iron nail left outside slowly gets a flaky orange-brown coating. What happened?", "Un clavo de hierro brillante que se deja afuera se cubre poco a poco de una capa escamosa café anaranjada. ¿Qué pasó?"),
      bi("Iron reacted with oxygen and water to form a new substance, rust.", "El hierro reaccionó con oxígeno y agua y formó una sustancia nueva, el óxido."),
      [
        m("physical-change-as-reaction", "The iron got dirty, but it is still iron.", "El hierro se ensució, pero sigue siendo hierro."),
        m("color-mixing-as-reaction", "Orange paint from the air stuck to the nail.", "Pintura anaranjada del aire se pegó al clavo."),
        m("melting-as-reaction", "The iron melted in the sun.", "El hierro se derritió con el sol."),
      ],
      bi("Rust is brittle and flaky, while iron is strong and shiny.", "El óxido es frágil y escamoso, mientras que el hierro es fuerte y brillante."),
      bi("Rust (iron oxide) has different properties from iron, so a new substance formed. That is a chemical reaction.", "El óxido de hierro tiene propiedades distintas a las del hierro, así que se formó una sustancia nueva. Eso es una reacción química."),
    ),
    e(
      bi("Two chemicals react inside a sealed bag. Before the reaction, the bag and its contents have a mass of 50 g. What is the mass after the reaction?", "Dos sustancias reaccionan dentro de una bolsa cerrada. Antes de la reacción, la bolsa y su contenido tienen una masa de 50 g. ¿Cuál es la masa después de la reacción?"),
      bi("50 g", "50 g"),
      [m("thinks-gas-has-no-mass", "Less than 50 g, because a gas formed", "Menos de 50 g, porque se formó un gas"), m("thinks-mass-created", "More than 50 g, because a new substance formed", "Más de 50 g, porque se formó una sustancia nueva")],
      bi("Nothing can get in or out of a sealed bag.", "Nada puede entrar ni salir de una bolsa cerrada."),
      bi("Atoms are rearranged in a reaction, not created or destroyed, so the total mass in a closed system stays the same.", "En una reacción los átomos se reacomodan, no se crean ni se destruyen, así que la masa total en un sistema cerrado no cambia."),
    ),
    e(
      bi("Baking soda and vinegar react in an open cup, and the cup's mass goes down. Why?", "El bicarbonato y el vinagre reaccionan en un vaso abierto, y la masa del vaso disminuye. ¿Por qué?"),
      bi("A gas formed and escaped into the air.", "Se formó un gas que escapó al aire."),
      [
        m("thinks-matter-destroyed", "Some of the matter was destroyed.", "Parte de la materia se destruyó."),
        m("thinks-reactions-change-mass", "Reactions always make substances lighter.", "Las reacciones siempre hacen más ligeras las sustancias."),
        m("thinks-gas-has-no-mass", "The bubbles made the liquid lighter, even though nothing left.", "Las burbujas hicieron más ligero el líquido, aunque nada salió."),
      ],
      bi("Where did the bubbles go?", "¿A dónde se fueron las burbujas?"),
      bi("The carbon dioxide gas has mass. In an open cup it escapes, so the scale shows less. The mass is not destroyed.", "El dióxido de carbono tiene masa. En un vaso abierto se escapa, así que la báscula marca menos. La masa no se destruye."),
    ),
    e(
      bi("Milk left out too long smells sour and gets lumpy. What kind of change is this?", "La leche que se deja afuera demasiado tiempo huele agria y se pone grumosa. ¿Qué tipo de cambio es este?"),
      CHEMICAL,
      [mx("physical-change-as-reaction", PHYSICAL), m("thinks-heat-only-melts", "Freezing", "Una congelación")],
      bi("A new smell is one of the signs.", "Un olor nuevo es una de las señales."),
      bi("Bacteria change sugar in the milk into an acid, a new substance, so the smell and texture change.", "Las bacterias convierten el azúcar de la leche en un ácido, una sustancia nueva, así que cambian el olor y la textura."),
    ),
    e(
      bi("Before: a shiny, silver metal ribbon. After burning: a white powder with different properties. Did a chemical reaction happen?", "Antes: una cinta de metal plateada y brillante. Después de arder: un polvo blanco con propiedades distintas. ¿Ocurrió una reacción química?"),
      bi("Yes; the product has different properties, so it is a new substance.", "Sí; el producto tiene propiedades distintas, así que es una sustancia nueva."),
      [
        m("physical-change-as-reaction", "No; the metal only changed shape.", "No; el metal solo cambió de forma."),
        m("melting-as-reaction", "No; the metal only melted.", "No; el metal solo se derritió."),
        m("thinks-color-alone-decides", "Only if the powder is a new color.", "Solo si el polvo es de un color nuevo."),
      ],
      bi("Compare the properties before and after.", "Compara las propiedades de antes y de después."),
      bi("A substance with new properties formed (magnesium oxide), so a chemical reaction happened.", "Se formó una sustancia con propiedades nuevas (óxido de magnesio), así que ocurrió una reacción química."),
    ),
  ],
};

// ── s.resources ─────────────────────────────────────────────────────────────────────────────────

const RESOURCES: Bank = {
  nudge: bi("How long did this resource take to form, and what geologic process made it?", "¿Cuánto tardó en formarse este recurso y qué proceso geológico lo formó?"),
  strategy: bi(
    "Fossil fuels formed from buried remains over millions of years; metal ores often formed near magma; salt formed where seas evaporated; groundwater collects in porous rock. Because each needs special conditions, resources are spread unevenly.",
    "Los combustibles fósiles se formaron de restos enterrados durante millones de años; los minerales metálicos a menudo se formaron cerca del magma; la sal se formó donde se evaporaron mares; el agua subterránea se junta en roca porosa. Como cada uno necesita condiciones especiales, los recursos están repartidos de forma desigual.",
  ),
  seconds: 30,
  items: [
    e(
      bi("Why are coal, oil, and natural gas called nonrenewable?", "¿Por qué el carbón, el petróleo y el gas natural se llaman no renovables?"),
      bi("They take millions of years to form, far longer than we take to use them.", "Tardan millones de años en formarse, mucho más de lo que tardamos en usarlos."),
      [
        m("uneven-means-nonrenewable", "They are found in only a few places.", "Se encuentran solo en algunos lugares."),
        m("thinks-fuels-are-manufactured", "They are made in factories that are closing.", "Se fabrican en fábricas que están cerrando."),
        m("renewable-nonrenewable-mixup", "They grow back each year, but slowly.", "Vuelven a crecer cada año, pero despacio."),
      ],
      bi("Compare how fast they form with how fast we burn them.", "Compara qué tan rápido se forman con qué tan rápido los quemamos."),
      bi("Fossil fuels formed from remains buried and heated for millions of years. Once burned, they are not replaced on any human time scale.", "Los combustibles fósiles se formaron de restos enterrados y calentados durante millones de años. Una vez quemados, no se reponen en una escala de tiempo humana."),
    ),
    e(
      bi("Coal formed mostly from what?", "¿De qué se formó principalmente el carbón?"),
      bi("Plants from ancient swamps that were buried and squeezed", "Plantas de pantanos antiguos que quedaron enterradas y comprimidas"),
      [
        m("dinosaur-myth", "Dinosaur bones", "Huesos de dinosaurio"),
        m("confused-igneous-origin", "Lava that cooled underground", "Lava que se enfrió bajo tierra"),
        m("confused-coal-and-oil", "Tiny ocean organisms only", "Solo organismos diminutos del océano"),
      ],
      bi("Coal sometimes shows prints of leaves and bark.", "A veces el carbón muestra huellas de hojas y corteza."),
      bi("Coal formed from thick layers of swamp plants that were buried, heated, and pressed over millions of years.", "El carbón se formó de capas gruesas de plantas de pantano que quedaron enterradas, calentadas y comprimidas durante millones de años."),
    ),
    e(
      bi("Oil and natural gas formed mostly from what?", "¿De qué se formaron principalmente el petróleo y el gas natural?"),
      bi("Remains of tiny ocean organisms buried in sediment", "Restos de organismos diminutos del océano enterrados en sedimento"),
      [
        m("dinosaur-myth", "Dinosaur bodies", "Cuerpos de dinosaurios"),
        m("confused-igneous-origin", "Melted rock from volcanoes", "Roca fundida de los volcanes"),
        m("confused-coal-and-oil", "Giant swamp trees", "Árboles gigantes de pantano"),
      ],
      bi("Think of plankton and algae drifting in ancient seas.", "Piensa en el plancton y las algas que flotaban en mares antiguos."),
      bi("Plankton and algae sank to the sea floor, were buried in mud, and were slowly changed by heat and pressure into oil and gas.", "El plancton y las algas se hundieron al fondo del mar, quedaron enterrados en lodo y el calor y la presión los transformaron lentamente en petróleo y gas."),
    ),
    e(
      bi("In which kind of rock are oil and natural gas usually found?", "¿En qué tipo de roca se encuentran normalmente el petróleo y el gas natural?"),
      bi("Sedimentary rock", "Roca sedimentaria"),
      [m("confused-igneous-origin", "Igneous rock", "Roca ígnea"), m("wrong-rock-type", "Metamorphic rock", "Roca metamórfica")],
      bi("The organisms were buried in layers of sediment.", "Los organismos quedaron enterrados en capas de sedimento."),
      bi("Oil and gas form in and move through sedimentary layers, often trapped under a rock layer they cannot pass through.", "El petróleo y el gas se forman y se mueven en capas sedimentarias, y a menudo quedan atrapados bajo una capa de roca que no pueden atravesar."),
    ),
    e(
      bi("What is an aquifer?", "¿Qué es un acuífero?"),
      bi("An underground layer of rock or sediment that holds water and lets it flow", "Una capa subterránea de roca o sedimento que guarda agua y la deja fluir"),
      [
        m("underground-lake-myth", "A large lake inside an underground cave", "Un lago grande dentro de una cueva subterránea"),
        m("confused-aquifer-with-aqueduct", "A pipe that carries water to a city", "Un tubo que lleva agua a una ciudad"),
        m("confused-water-cycle", "A layer of clouds that holds rain", "Una capa de nubes que guarda la lluvia"),
      ],
      bi("Think of water filling the spaces between grains of sand.", "Piensa en agua que llena los espacios entre los granos de arena."),
      bi("Most groundwater fills tiny spaces in sand, gravel, or porous rock. Underground lakes in caves are rare.", "La mayor parte del agua subterránea llena espacios diminutos en arena, grava o roca porosa. Los lagos subterráneos en cuevas son raros."),
    ),
    e(
      bi("Rain refills an aquifer, but the water level in its wells keeps dropping. What is the most likely reason?", "La lluvia rellena un acuífero, pero el nivel del agua en sus pozos sigue bajando. ¿Cuál es la razón más probable?"),
      bi("People pump out water faster than rain refills it.", "Las personas sacan agua más rápido de lo que la lluvia la repone."),
      [
        m("thinks-no-recharge", "Rainwater can never reach an aquifer.", "El agua de lluvia nunca puede llegar a un acuífero."),
        m("thinks-sun-dries-aquifer", "The Sun evaporates water straight out of the aquifer.", "El Sol evapora el agua directamente del acuífero."),
        m("thinks-water-turns-to-rock", "The water slowly turns into rock.", "El agua se convierte lentamente en roca."),
      ],
      bi("Compare what goes in with what comes out.", "Compara lo que entra con lo que sale."),
      bi("Refilling can take years or centuries. Heavy pumping for farms and cities can lower the water faster than it returns.", "Rellenarse puede tardar años o siglos. Bombear mucho para granjas y ciudades puede bajar el agua más rápido de lo que regresa."),
    ),
    e(
      bi("Many large copper deposits are found in the Andes Mountains, where one plate sinks under another. Why there?", "Muchos depósitos grandes de cobre están en la cordillera de los Andes, donde una placa se hunde bajo otra. ¿Por qué allí?"),
      bi("Hot fluids from magma carried metals and left them in cracks in the rock.", "Fluidos calientes del magma llevaron metales y los dejaron en grietas de la roca."),
      [
        m("confused-with-fossil-fuels", "Buried ocean organisms turned into copper.", "Organismos marinos enterrados se convirtieron en cobre."),
        m("confused-with-salt-deposits", "An ancient sea evaporated and left copper behind.", "Un mar antiguo se evaporó y dejó cobre."),
        m("thinks-people-moved-resources", "People brought copper there long ago.", "Las personas llevaron cobre allí hace mucho tiempo."),
      ],
      bi("Sinking plates melt rock and make volcanoes and magma.", "Las placas que se hunden funden roca y forman volcanes y magma."),
      bi("Magma near the plate boundary heats water that dissolves metals, and the metals are deposited as the fluids cool.", "El magma cerca del límite de placas calienta agua que disuelve metales, y los metales se depositan cuando los fluidos se enfrían."),
    ),
    e(
      bi("Thick layers of rock salt are found deep underground in some places. How did they most likely form?", "En algunos lugares hay capas gruesas de sal de roca en lo profundo. ¿Cómo se formaron con mayor probabilidad?"),
      bi("Ancient seas or salty lakes evaporated and left the salt behind.", "Mares antiguos o lagos salados se evaporaron y dejaron la sal."),
      [
        m("confused-igneous-origin", "Lava cooled into salt.", "La lava se enfrió y se volvió sal."),
        m("confused-with-fossil-fuels", "Plants were buried and pressed into salt.", "Plantas enterradas se comprimieron hasta volverse sal."),
        m("thinks-people-moved-resources", "Salt was carried there by rivers of salt.", "Ríos de sal la llevaron allí."),
      ],
      bi("Think of what is left in a pan after you boil away salt water.", "Piensa en lo que queda en una olla después de hervir agua salada hasta secarla."),
      bi("When a shallow sea dries up, its dissolved salt is left behind, then buried under later layers.", "Cuando un mar poco profundo se seca, su sal disuelta queda en el lugar y luego la cubren otras capas."),
    ),
    e(
      bi("Which energy resource is renewable?", "¿Qué recurso energético es renovable?"),
      bi("Wind", "El viento"),
      [m("renewable-nonrenewable-mixup", "Natural gas", "El gas natural"), m("renewable-nonrenewable-mixup", "Coal", "El carbón"), m("renewable-nonrenewable-mixup", "Uranium", "El uranio")],
      bi("Which one is replaced naturally and quickly?", "¿Cuál se repone de forma natural y rápida?"),
      bi("Wind is renewed by the Sun heating the air every day. Gas, coal, and uranium exist in limited amounts.", "El viento se renueva porque el Sol calienta el aire todos los días. El gas, el carbón y el uranio existen en cantidades limitadas."),
    ),
    e(
      bi("Which energy resource is nonrenewable?", "¿Qué recurso energético es no renovable?"),
      bi("Uranium used in nuclear power plants", "El uranio que se usa en las plantas nucleares"),
      [m("renewable-nonrenewable-mixup", "Sunlight", "La luz del Sol"), m("renewable-nonrenewable-mixup", "Wind", "El viento"), m("renewable-nonrenewable-mixup", "Flowing river water", "El agua de los ríos")],
      bi("Which one is mined from the ground and used up?", "¿Cuál se extrae del suelo y se agota?"),
      bi("Uranium is a mineral resource that is mined and used up. Sunlight, wind, and flowing water are renewed constantly.", "El uranio es un recurso mineral que se extrae y se agota. La luz del Sol, el viento y el agua que fluye se renuevan constantemente."),
    ),
    e(
      bi("Iceland gets much of its energy from geothermal power. Why does it have so much?", "Islandia obtiene gran parte de su energía de la geotermia. ¿Por qué tiene tanta?"),
      bi("It sits on a plate boundary, with hot rock and magma close to the surface.", "Está sobre un límite de placas, con roca caliente y magma cerca de la superficie."),
      [
        m("thinks-cold-places-have-heat", "Its cold climate makes the ground store more heat.", "Su clima frío hace que el suelo guarde más calor."),
        m("confused-energy-sources", "It has huge coal mines underground.", "Tiene enormes minas de carbón bajo tierra."),
        m("thinks-people-moved-resources", "It imports hot water from other countries.", "Importa agua caliente de otros países."),
      ],
      bi("Iceland has many volcanoes and hot springs.", "Islandia tiene muchos volcanes y aguas termales."),
      bi("Iceland lies on the Mid-Atlantic Ridge, where plates pull apart. Heat from magma near the surface heats underground water.", "Islandia está sobre la dorsal mesoatlántica, donde las placas se separan. El calor del magma cerca de la superficie calienta el agua subterránea."),
    ),
    e(
      bi("Why are oil, metals, and groundwater not spread evenly around Earth?", "¿Por qué el petróleo, los metales y el agua subterránea no están repartidos de forma uniforme en la Tierra?"),
      bi("Each formed through geologic processes that happened only in certain places.", "Cada uno se formó por procesos geológicos que ocurrieron solo en ciertos lugares."),
      [
        m("thinks-people-moved-resources", "People moved them to certain countries.", "Las personas los llevaron a ciertos países."),
        m("uneven-means-nonrenewable", "They were spread evenly at first, and only renewable ones stayed.", "Al principio estaban repartidos de forma uniforme y solo se quedaron los renovables."),
        m("thinks-resources-random", "They fell randomly from space.", "Cayeron al azar desde el espacio."),
      ],
      bi("Think of where swamps, seas, and magma were in the past.", "Piensa en dónde había pantanos, mares y magma en el pasado."),
      bi("Oil formed where ancient seas buried organisms, ores formed near magma, and aquifers formed in porous rock. Those conditions were found only in some places.", "El petróleo se formó donde mares antiguos enterraron organismos, los minerales metálicos cerca del magma y los acuíferos en roca porosa. Esas condiciones solo existieron en algunos lugares."),
    ),
    e(
      bi("Where do most natural diamonds form?", "¿Dónde se forman la mayoría de los diamantes naturales?"),
      bi("Deep in the mantle, under very high pressure and temperature", "En lo profundo del manto, a muy alta presión y temperatura"),
      [
        m("diamonds-from-coal", "From coal pressed in shallow mines", "Del carbón comprimido en minas poco profundas"),
        m("wrong-rock-type", "In layers of sand at the bottom of lakes", "En capas de arena en el fondo de los lagos"),
        m("confused-with-salt-deposits", "Where seawater evaporates", "Donde se evapora el agua de mar"),
      ],
      bi("They are carried up to the surface by rare, deep volcanic eruptions.", "Llegan a la superficie con erupciones volcánicas raras y profundas."),
      bi("Most diamonds form from carbon deep in the mantle, more than 150 km down, and rise in volcanic pipes. They do not come from coal.", "La mayoría de los diamantes se forman de carbono en lo profundo del manto, a más de 150 km, y suben por chimeneas volcánicas. No vienen del carbón."),
    ),
  ],
};

// @@NEXT
