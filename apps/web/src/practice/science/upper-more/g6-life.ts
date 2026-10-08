import { bi, e, m, mx, type Bank } from "./shared";

// Grade 6 life science banks: cell theory and organelles (s.organelles), body systems (s.body.systems).

// ── s.organelles ────────────────────────────────────────────────────────────────────────────────

export const ORG_THEORY: Bank = {
  nudge: bi("Is the question about the theory itself, the scientists behind it, or one kind of living thing?", "¿La pregunta trata de la teoría, de los científicos que la formaron o de un tipo de ser vivo?"),
  strategy: bi(
    "For an idea of the theory, test each choice: is it true of every living thing, from bacteria to trees? For a kind of organism, ask what it is built from and whether it has a nucleus.",
    "Para una idea de la teoría, prueba cada opción: ¿es cierta para todos los seres vivos, desde las bacterias hasta los árboles? Para un tipo de organismo, pregúntate de qué está hecho y si tiene núcleo.",
  ),
  seconds: 25,
  items: [
    e(
      bi("Which statement is part of the cell theory?", "¿Qué enunciado forma parte de la teoría celular?"),
      bi("All living things are made of one or more cells.", "Todos los seres vivos están formados por una o más células."),
      [
        m("overgeneralized-plant-cells", "All cells have a cell wall.", "Todas las células tienen pared celular."),
        m("spontaneous-generation", "Cells can form on their own from nonliving matter such as mud.", "Las células pueden formarse solas a partir de materia sin vida, como el lodo."),
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
        m("confused-hooke-leeuwenhoek", "Bacteria swimming in a drop of pond water", "Bacterias vivas que nadaban en una gota de agua de estanque"),
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
      bi("Loose in the cytoplasm", "Suelto en el citoplasma"),
      [
        m("confused-prokaryote-eukaryote", "Inside a nucleus", "Dentro de un núcleo"),
        m("dna-in-wrong-part", "Inside the cell wall", "Dentro de la pared celular"),
        m("thinks-bacteria-lack-dna", "Bacteria have no DNA at all", "Las bacterias no tienen ADN"),
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
      bi("It is not a cell and can copy itself only inside a living cell.", "No es una célula y solo puede copiarse dentro de una célula viva."),
      [
        m("size-means-nonliving", "It is too small to see with the light microscopes used in a school lab.", "Es demasiado pequeño para verlo con los microscopios ópticos de un laboratorio escolar."),
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
      bi("A mushroom", "Un champiñón"),
      [
        m("confused-unicellular-multicellular", "A bacterium", "Una bacteria"),
        m("confused-unicellular-multicellular", "A yeast cell", "Una levadura"),
        m("confused-unicellular-multicellular", "An amoeba", "Una ameba"),
      ],
      bi("Yeast and mushrooms are both fungi, but only one is built from many cells.", "La levadura y el champiñón son hongos, pero solo uno está formado por muchas células."),
      bi("A mushroom is made of many cells working together. Bacteria, yeast, and amoebas each live as a single cell.", "Un champiñón está formado por muchas células que trabajan juntas. Las bacterias, las levaduras y las amebas viven como una sola célula."),
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

export const ORG_PARTS: Bank = {
  nudge: bi("Name the job first, then find the part that does it.", "Primero nombra la función y luego busca la parte que la realiza."),
  strategy: bi(
    "Picture the cell as a factory: some parts follow instructions to build products, some carry, pack, and ship them, and others break down waste or supply power. Decide which of those roles the question describes.",
    "Imagina la célula como una fábrica: algunas partes siguen instrucciones para fabricar productos, otras los transportan, empacan y envían, y otras descomponen desechos o dan energía. Decide cuál de esos papeles describe la pregunta.",
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
      [mx("ribosome-golgi-mixup", RIBO), mx("golgi-vacuole-mixup", VACUOLE), mx("nucleolus-vesicle-mixup", NUCLEOLUS)],
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
        m("pathway-out-of-order", "Golgi apparatus, then a ribosome on the rough ER, then vesicle, then cell membrane", "Aparato de Golgi, luego ribosoma en el retículo rugoso, luego vesícula y luego membrana celular"),
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

export const BODY_JOBS: Bank = {
  nudge: bi("What does the body need done here: moving, breathing, eating, signaling, cleaning, or defending?", "¿Qué necesita hacer el cuerpo aquí: moverse, respirar, alimentarse, enviar señales, limpiar o defenderse?"),
  strategy: bi(
    "Find the job word in the question, such as carry, take in, break down, signal, filter, or defend. Then think of the organs that do that job; the answer is the system they belong to.",
    "Busca la palabra de la función en la pregunta, como transportar, tomar, descomponer, enviar señales, filtrar o defender. Luego piensa en los órganos que hacen ese trabajo; la respuesta es el sistema al que pertenecen.",
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
      [m("wrong-organ-job", "Lungs", "Pulmones"), m("wrong-organ-job", "Heart", "Corazón"), m("wrong-organ-job", "Stomach", "Estómago")],
      bi("There are two of them, one on each side of the lower back.", "Son dos, uno a cada lado de la parte baja de la espalda."),
      bi("The kidneys filter the blood and send wastes and extra water out as urine.", "Los riñones filtran la sangre y sacan los desechos y el agua de más en forma de orina."),
    ),
    e(
      bi("Besides holding the body up, what else do bones do?", "Además de sostener el cuerpo, ¿qué más hacen los huesos?"),
      bi("Protect organs and make blood cells", "Protegen órganos y producen células de la sangre"),
      [
        m("wrong-organ-job", "Pump blood through the body", "Bombean sangre por el cuerpo"),
        m("wrong-system-job", "Break down food", "Descomponen el alimento"),
        m("skeletal-muscular-mixup", "Contract to make the arms and legs move", "Se contraen para que se muevan los brazos y las piernas"),
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
      bi("It includes the body's largest organ, and it covers you.", "Incluye el órgano más grande del cuerpo, y te cubre."),
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
        m("airway-mixup", "The trachea, the tube that carries air down", "La tráquea, el tubo que lleva el aire hacia abajo"),
        m("respiratory-circulatory-mixup", "The heart", "El corazón"),
        m("airway-food-pipe-mixup", "The esophagus", "El esófago"),
      ],
      bi("The airways end in millions of tiny sacs wrapped in blood vessels.", "Las vías respiratorias terminan en millones de sacos diminutos rodeados de vasos sanguíneos."),
      bi("The alveoli have very thin walls covered in capillaries, so oxygen moves into the blood and carbon dioxide moves out.", "Los alvéolos tienen paredes muy delgadas cubiertas de capilares, así que el oxígeno pasa a la sangre y el dióxido de carbono sale."),
    ),
  ],
};

export const BODY_TOGETHER: Bank = {
  nudge: bi("Which systems does this need: one to sense or control, one to carry, one to do the job?", "¿Qué sistemas se necesitan: uno que detecte o controle, uno que transporte y uno que haga el trabajo?"),
  strategy: bi(
    "Trace what moves: oxygen and nutrients travel in the blood, signals travel along nerves, hormones travel in the blood. Name every system the material or signal passes through.",
    "Sigue lo que se mueve: el oxígeno y los nutrientes viajan en la sangre, las señales por los nervios y las hormonas en la sangre. Nombra cada sistema por el que pasa la sustancia o la señal.",
  ),
  seconds: 30,
  items: [
    e(
      bi("When you run, your breathing and your heart rate both speed up. Why?", "Cuando corres, tu respiración y tu ritmo cardíaco se aceleran. ¿Por qué?"),
      bi("Your muscles need more oxygen and make more carbon dioxide.", "Tus músculos necesitan más oxígeno y producen más dióxido de carbono."),
      [
        m("respiratory-circulatory-mixup", "Your lungs start pumping blood faster so your muscles stay cool.", "Tus pulmones empiezan a bombear sangre más rápido para enfriar tus músculos."),
        m("reversed-cause", "Your muscles stop using oxygen while you run.", "Tus músculos dejan de usar oxígeno mientras corres."),
        m("wrong-system-job", "Your stomach needs extra air to digest food.", "Tu estómago necesita aire extra para digerir."),
      ],
      bi("Working muscles release more energy from sugar, and that uses oxygen.", "Los músculos que trabajan liberan más energía del azúcar, y eso usa oxígeno."),
      bi("Faster breathing brings in more oxygen, and a faster heart delivers it to the muscles and carries carbon dioxide back to the lungs.", "Respirar más rápido trae más oxígeno, y un corazón más rápido lo lleva a los músculos y regresa el dióxido de carbono a los pulmones."),
    ),
    e(
      bi("After a meal, how do nutrients reach your muscle cells?", "Después de comer, ¿cómo llegan los nutrientes a las células de tus músculos?"),
      bi("Digestion moves them into the blood, and the blood carries them.", "La digestión los pasa a la sangre, y la sangre los transporta."),
      [
        m("wrong-system-job", "The respiratory system breathes them into the muscles.", "El sistema respiratorio los inhala hacia los músculos."),
        m("nervous-carries-materials", "The nervous system carries them along the nerves to each muscle cell.", "El sistema nervioso los lleva por los nervios hasta cada célula muscular."),
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
      bi("The triceps contracts and pulls the other way.", "El tríceps se contrae y jala en sentido contrario."),
      [
        m("thinks-muscles-push", "The biceps pushes on the bones to straighten the arm.", "El bíceps empuja los huesos para estirar el brazo."),
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
        m("airway-food-pipe-mixup", "Nose, esophagus, stomach, small intestine, then blood", "Nariz, esófago, estómago, intestino delgado y luego la sangre"),
        m("respiratory-circulatory-mixup", "Nose, heart, lungs, then blood", "Nariz, corazón, pulmones y luego la sangre"),
        m("airway-mixup", "Nose, bronchi, trachea, alveoli in the lungs, then blood", "Nariz, bronquios, tráquea, alvéolos de los pulmones y luego la sangre"),
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
      [m("wrong-organ-job", "In the heart", "En el corazón"), m("wrong-organ-job", "In the lungs", "En los pulmones"), m("wrong-organ-job", "In the walls of the stomach and intestines", "En las paredes del estómago y del intestino")],
      bi("This is one way the skeletal system helps the circulatory system.", "Esta es una forma en que el sistema óseo ayuda al circulatorio."),
      bi("Red marrow inside bones makes red blood cells, which then travel in the blood.", "La médula roja dentro de los huesos produce los glóbulos rojos, que luego viajan en la sangre."),
    ),
    e(
      bi("A disease damages the alveoli in a person's lungs. Why might the person feel tired after a short walk?", "Una enfermedad daña los alvéolos de los pulmones de una persona. ¿Por qué podría cansarse después de caminar un poco?"),
      bi("Less oxygen reaches the blood, so muscles get less energy.", "Llega menos oxígeno a la sangre, así que los músculos obtienen menos energía."),
      [
        m("wrong-system-job", "The stomach can no longer digest food.", "El estómago ya no puede digerir el alimento."),
        m("skeletal-muscular-mixup", "The bones become too weak to hold up the muscles during a walk.", "Los huesos se vuelven demasiado débiles para sostener los músculos al caminar."),
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
