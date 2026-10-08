import { bi, e, m, type Bank } from "./shared";

// Grade 9 banks: from DNA to proteins (s.dna.protein), carrying capacity (s.carrying.capacity), Earth's
// internal energy (s.earth.energy), and arguing from evidence: claim, evidence, reasoning (s.claim.evidence).

// ── s.dna.protein ───────────────────────────────────────────────────────────────────────────────

export const DNA_PROTEIN: Bank = {
  nudge: bi("Which molecule holds the code here, and which one is being built?", "¿Qué molécula guarda el código aquí y cuál se está construyendo?"),
  strategy: bi(
    "Use the pairing rules and the order of the steps: the code is copied before it is read, and the reading builds something new. Ask which molecule this step makes and where in the cell it happens.",
    "Usa las reglas de apareamiento y el orden de los pasos: el código se copia antes de leerse, y la lectura construye algo nuevo. Pregúntate qué molécula produce este paso y en qué parte de la célula ocurre.",
  ),
  seconds: 25,
  items: [
    e(
      bi("What does DNA carry?", "¿Qué lleva el ADN?"),
      bi("Instructions for making proteins", "Las instrucciones para producir proteínas"),
      [
        m("dna-as-energy", "Energy for the cell to use", "Energía para que la use la célula"),
        m("dna-as-energy", "Oxygen for the cell", "Oxígeno para la célula"),
        m("dna-protein-mixup", "Finished proteins ready to use", "Proteínas terminadas, listas para usarse"),
      ],
      bi("A gene is a section of DNA.", "Un gen es una sección del ADN."),
      bi("Genes in DNA are coded instructions. The cell reads them to build proteins, which do the work.", "Los genes del ADN son instrucciones en código. La célula las lee para construir proteínas, que hacen el trabajo."),
    ),
    e(
      bi("Where is most of the DNA in a plant or animal cell?", "¿Dónde está la mayor parte del ADN en una célula vegetal o animal?"),
      bi("In the nucleus", "En el núcleo"),
      [m("wrong-organelle", "In the cell wall", "En la pared celular"), m("wrong-organelle", "In the vacuole", "En la vacuola"), m("wrong-organelle", "In the ribosomes", "En los ribosomas")],
      bi("It is the cell's control center.", "Es el centro de control de la célula."),
      bi("Eukaryotic cells keep their DNA in the nucleus. Mitochondria and chloroplasts hold small amounts of their own DNA too.", "Las células eucariotas guardan su ADN en el núcleo. Las mitocondrias y los cloroplastos también tienen pequeñas cantidades de ADN propio."),
    ),
    e(
      bi("Which four bases are found in DNA?", "¿Cuáles son las cuatro bases del ADN?"),
      bi("A, T, C, G", "A, T, C, G"),
      [m("dna-rna-mixup", "A, U, C, G", "A, U, C, G"), m("elements-not-bases", "H, O, N, C", "H, O, N, C"), m("invented-reason", "A, B, C, D", "A, B, C, D")],
      bi("RNA swaps one of DNA's bases for uracil.", "El ARN cambia una de las bases del ADN por uracilo."),
      bi("DNA uses adenine (A), thymine (T), cytosine (C), and guanine (G). RNA uses uracil (U) in place of thymine.", "El ADN usa adenina (A), timina (T), citosina (C) y guanina (G). El ARN usa uracilo (U) en lugar de timina."),
    ),
    e(
      bi("In DNA, adenine (A) always pairs with which base?", "En el ADN, ¿con qué base se aparea siempre la adenina (A)?"),
      bi("Thymine (T)", "Timina (T)"),
      [m("base-pair-mixup", "Guanine (G)", "Guanina (G)"), m("base-pair-mixup", "Cytosine (C)", "Citosina (C)"), m("dna-rna-mixup", "Uracil (U)", "Uracilo (U)")],
      bi("The pairs are A with one base and C with another.", "Los pares son A con una base y C con otra."),
      bi("In DNA, A pairs with T and C pairs with G, so the two strands match each other.", "En el ADN, A se aparea con T y C con G, así que las dos cadenas encajan."),
    ),
    e(
      bi(
        "One strand of DNA reads A T T G C. Reading in the same direction, what does the matching strand read?",
        "Una cadena de ADN dice A T T G C. Leída en la misma dirección, ¿qué dice la cadena que le corresponde?",
      ),
      bi("T A A C G", "T A A C G"),
      // G C C A T swaps A with G and T with C; it is not the partner strand read backward (G C A A T).
      [m("copied-not-paired", "A T T G C", "A T T G C"), m("base-pair-mixup", "G C C A T", "G C C A T"), m("dna-rna-mixup", "U A A C G", "U A A C G")],
      bi("A pairs with T and C pairs with G; pair each base in order.", "A se aparea con T y C con G; aparea cada base en orden."),
      bi("Each base is replaced by its partner: A by T, T by A, G by C, and C by G. So A T T G C matches T A A C G.", "Cada base se cambia por su pareja: A por T, T por A, G por C y C por G. Así, A T T G C corresponde a T A A C G."),
    ),
    e(
      bi("What is transcription?", "¿Qué es la transcripción?"),
      bi("Copying a gene's DNA into messenger RNA", "Copiar el ADN de un gen en ARN mensajero"),
      [
        m("transcription-translation-mixup", "Building a protein from amino acids", "Construir una proteína con aminoácidos"),
        m("confused-with-replication", "Copying all of the DNA before a cell divides", "Copiar todo el ADN antes de que la célula se divida"),
        m("reversed-flow", "Turning a protein back into DNA", "Convertir una proteína de nuevo en ADN"),
      ],
      bi("To transcribe means to copy in the same language, from DNA letters to RNA letters.", "Transcribir significa copiar en el mismo lenguaje, de letras de ADN a letras de ARN."),
      bi("In transcription, an enzyme reads one gene and builds a matching strand of messenger RNA, which leaves the nucleus.", "En la transcripción, una enzima lee un gen y construye una cadena de ARN mensajero que le corresponde, la cual sale del núcleo."),
    ),
    e(
      bi("What is translation?", "¿Qué es la traducción?"),
      bi("A ribosome reading messenger RNA to build a protein", "Un ribosoma que lee el ARN mensajero para construir una proteína"),
      [
        m("transcription-translation-mixup", "Copying DNA into messenger RNA", "Copiar el ADN en ARN mensajero"),
        m("reversed-flow", "Turning a protein into DNA", "Convertir una proteína en ADN"),
        m("confused-with-replication", "Copying all of the DNA before a cell divides in two", "Copiar todo el ADN antes de que la célula se divida en dos células"),
      ],
      bi("To translate means to change from one language to another: from bases to amino acids.", "Traducir significa pasar de un lenguaje a otro: de bases a aminoácidos."),
      bi("In translation, a ribosome reads each codon of the messenger RNA and adds the matching amino acid to a growing protein chain.", "En la traducción, un ribosoma lee cada codón del ARN mensajero y agrega el aminoácido que le corresponde a una cadena de proteína que va creciendo."),
    ),
    e(
      bi("Where in the cell does translation take place?", "¿En qué parte de la célula ocurre la traducción?"),
      bi("At ribosomes", "En los ribosomas"),
      [
        m("transcription-translation-mixup", "Inside the nucleus, on the DNA", "Dentro del núcleo, sobre el ADN"),
        m("wrong-organelle", "In the cell membrane", "En la membrana celular"),
        m("wrong-organelle", "In the vacuole", "En la vacuola"),
      ],
      bi("This is where amino acids are linked together.", "Aquí es donde se unen los aminoácidos."),
      bi("Messenger RNA leaves the nucleus and attaches to ribosomes in the cytoplasm or on the rough ER, where proteins are built.", "El ARN mensajero sale del núcleo y se une a los ribosomas en el citoplasma o en el retículo rugoso, donde se construyen las proteínas."),
    ),
    e(
      bi("What are proteins made of?", "¿De qué están hechas las proteínas?"),
      bi("Chains of amino acids", "Cadenas de aminoácidos"),
      [
        m("dna-protein-mixup", "Chains of nucleotides", "Cadenas de nucleótidos"),
        m("macromolecule-mixup", "Sugars and fats", "Azúcares y grasas"),
        m("dna-protein-mixup", "Chains of DNA bases", "Cadenas de bases del ADN"),
      ],
      bi("There are 20 common kinds of these building blocks.", "Hay 20 tipos comunes de estos bloques de construcción."),
      bi("A protein is a chain of amino acids, folded into a shape that lets it do its job. DNA and RNA are chains of nucleotides.", "Una proteína es una cadena de aminoácidos plegada en una forma que le permite hacer su trabajo. El ADN y el ARN son cadenas de nucleótidos."),
    ),
    e(
      bi("How many bases make up one codon?", "¿Cuántas bases forman un codón?"),
      bi("3", "3"),
      [m("codon-size-mixup", "1", "1"), m("codon-size-mixup", "2", "2"), m("codon-size-mixup", "4", "4")],
      bi("Four bases taken two at a time give only 16 combinations, not enough for 20 amino acids.", "Cuatro bases tomadas de dos en dos dan solo 16 combinaciones, que no alcanzan para 20 aminoácidos."),
      bi("A codon is three bases long. Four bases in groups of three give 64 codons, enough for 20 amino acids plus start and stop signals.", "Un codón mide tres bases. Cuatro bases en grupos de tres dan 64 codones, suficientes para 20 aminoácidos y las señales de inicio y fin."),
    ),
    e(
      bi("In RNA, which base takes the place of thymine?", "En el ARN, ¿qué base ocupa el lugar de la timina?"),
      bi("Uracil (U)", "Uracilo (U)"),
      [m("dna-rna-mixup", "Adenine (A)", "Adenina (A)"), m("dna-rna-mixup", "Guanine (G)", "Guanina (G)"), m("dna-rna-mixup", "Cytosine (C)", "Citosina (C)")],
      bi("This base is found in RNA but not in DNA.", "Esta base está en el ARN pero no en el ADN."),
      bi("RNA uses uracil (U) where DNA uses thymine (T), so an A in DNA is copied as a U in RNA.", "El ARN usa uracilo (U) donde el ADN usa timina (T), así que una A del ADN se copia como una U en el ARN."),
    ),
    e(
      bi("What is the usual order in which information flows in a cell?", "¿Cuál es el orden habitual en que fluye la información en una célula?"),
      bi("DNA → RNA → protein", "ADN → ARN → proteína"),
      [m("reversed-flow", "Protein → RNA → DNA", "Proteína → ARN → ADN"), m("reversed-flow", "RNA → DNA → protein", "ARN → ADN → proteína"), m("transcription-translation-mixup", "DNA → protein → RNA", "ADN → proteína → ARN")],
      bi("First transcription, then translation.", "Primero la transcripción, luego la traducción."),
      bi("DNA is transcribed into RNA, and RNA is translated into protein. This is often called the central dogma of biology.", "El ADN se transcribe en ARN, y el ARN se traduce en proteína. A esto se le suele llamar el dogma central de la biología."),
    ),
    e(
      bi("A mutation changes one base in a gene. What might happen?", "Una mutación cambia una base de un gen. ¿Qué podría pasar?"),
      bi("It could change one amino acid in the protein.", "Podría cambiar un aminoácido de la proteína."),
      [
        m("overstates-mutation", "The whole cell turns into a different kind of cell at once.", "Toda la célula se convierte de inmediato en otro tipo de célula."),
        m("understates-mutation", "Nothing at all, because one base never matters.", "Nada, porque una sola base nunca importa."),
        m("confused-with-chromosome-change", "The cell gains a whole new chromosome.", "La célula gana un cromosoma completo nuevo."),
      ],
      bi("A codon change can call for a different amino acid.", "Un cambio en un codón puede pedir un aminoácido distinto."),
      bi("Changing one base changes one codon. That may swap one amino acid, change nothing, or stop the protein early, depending on the codon.", "Cambiar una base cambia un codón. Eso puede cambiar un aminoácido, no cambiar nada o detener la proteína antes de tiempo, según el codón."),
    ),
    e(
      bi("Sickle cell disease is caused by a change in one base of the gene for hemoglobin, the protein that carries oxygen in red blood cells. What does this show?", "La anemia de células falciformes se debe al cambio de una base en el gen de la hemoglobina, la proteína que transporta oxígeno en los glóbulos rojos. ¿Qué muestra esto?"),
      bi("A small change in DNA can change a protein and a trait.", "Un cambio pequeño en el ADN puede cambiar una proteína y un rasgo."),
      [
        m("ignores-dna-trait-link", "Traits are not controlled by DNA.", "Los rasgos no los controla el ADN."),
        m("dna-protein-mixup", "Hemoglobin is made of DNA.", "La hemoglobina está hecha de ADN."),
        m("understates-mutation", "Only large changes in DNA, like losing a whole gene, can matter.", "Solo importan los cambios grandes en el ADN, como perder un gen entero."),
      ],
      bi("The changed base swaps one amino acid in hemoglobin.", "La base cambiada sustituye un aminoácido en la hemoglobina."),
      bi("One base change puts valine in place of glutamic acid in hemoglobin. The altered protein makes red blood cells bend into a sickle shape.", "Un cambio de una base pone valina en lugar de ácido glutámico en la hemoglobina. La proteína alterada hace que los glóbulos rojos se doblen en forma de hoz."),
    ),
  ],
};

// ── s.carrying.capacity ─────────────────────────────────────────────────────────────────────────

export const CARRYING_CAPACITY: Bank = {
  nudge: bi("What limits how big this population can get?", "¿Qué limita qué tan grande puede llegar a ser esta población?"),
  strategy: bi(
    "List what the population needs, such as water, space, and shelter. Ask which need runs short first, and whether that limit gets stronger as the population gets more crowded. On a graph, look at where the line stops rising.",
    "Haz una lista de lo que necesita la población, como agua, espacio y refugio. Pregúntate qué necesidad se acaba primero y si ese límite se hace más fuerte cuando la población está más hacinada. En una gráfica, fíjate dónde deja de subir la línea.",
  ),
  seconds: 30,
  items: [
    e(
      bi("What is carrying capacity?", "¿Qué es la capacidad de carga?"),
      bi("The largest population an environment can support over time", "La población más grande que un ambiente puede sostener con el tiempo"),
      [
        m("rate-vs-limit-mixup", "The fastest rate at which a population can grow when food is plentiful", "La rapidez máxima con que puede crecer una población cuando sobra alimento"),
        m("literal-meaning", "The number of young an animal can carry", "El número de crías que puede cargar un animal"),
        m("population-community-mixup", "The total number of species in an area", "El número total de especies en una zona"),
      ],
      bi("It depends on how much food, water, and space there is.", "Depende de cuánto alimento, agua y espacio hay."),
      bi("Carrying capacity is the population size that the resources of an area can support year after year.", "La capacidad de carga es el tamaño de población que los recursos de una zona pueden sostener año tras año."),
    ),
    e(
      bi("A deer population grows quickly, then levels off at about 500 deer and stays near that number for years. What is the carrying capacity for deer there?", "Una población de venados crece rápido, luego se estabiliza en unos 500 venados y se mantiene cerca de ese número durante años. ¿Cuál es la capacidad de carga para los venados ahí?"),
      bi("About 500 deer", "Unos 500 venados"),
      [
        m("ignores-graph", "The number of deer in the first year", "El número de venados del primer año"),
        m("ignores-limits", "There is no limit", "No hay límite"),
        m("rate-vs-limit-mixup", "The number of deer born each year", "El número de venados que nacen cada año"),
      ],
      bi("Look at where the population settles.", "Fíjate en dónde se estabiliza la población."),
      bi("The level where a population stays over time, balanced between births and deaths, is the carrying capacity.", "El nivel donde una población se mantiene con el tiempo, con los nacimientos y las muertes en equilibrio, es la capacidad de carga."),
    ),
    e(
      bi("Which limiting factor has a bigger effect when a population is crowded (density-dependent)?", "¿Qué factor limitante tiene más efecto cuando una población está hacinada (dependiente de la densidad)?"),
      bi("Competition for food", "La competencia por el alimento"),
      [
        m("density-dependence-mixup", "A hurricane", "Un huracán"),
        m("density-dependence-mixup", "A wildfire", "Un incendio forestal"),
        m("density-dependence-mixup", "An unusually cold winter", "Un invierno mucho más frío de lo normal"),
      ],
      bi("Which one gets worse as more animals share the same space?", "¿Cuál empeora cuando más animales comparten el mismo espacio?"),
      bi("Competition, disease, and predation grow stronger as a population gets denser. Storms, fires, and cold strike whether the population is large or small.", "La competencia, las enfermedades y la depredación se hacen más fuertes cuando una población es más densa. Las tormentas, los incendios y el frío afectan igual a una población grande o pequeña."),
    ),
    e(
      bi("Which limiting factor affects a population the same way no matter how crowded it is (density-independent)?", "¿Qué factor limitante afecta a una población igual sin importar qué tan hacinada esté (independiente de la densidad)?"),
      bi("A flood", "Una inundación"),
      [
        m("density-dependence-mixup", "A disease spreading through a crowded herd", "Una enfermedad que se propaga en una manada hacinada"),
        m("density-dependence-mixup", "Competition for nesting sites", "La competencia por lugares para anidar"),
        m("density-dependence-mixup", "Predators finding prey more easily", "Depredadores que encuentran presas con más facilidad"),
      ],
      bi("Look for an event caused by weather or the land, not by other living things.", "Busca un suceso causado por el clima o el terreno, no por otros seres vivos."),
      bi("A flood harms a population whether there are few or many individuals. The other limits depend on how crowded the population is.", "Una inundación daña a una población haya pocos o muchos individuos. Los otros límites dependen de qué tan hacinada esté la población."),
    ),
    e(
      bi("What happens if a population grows above its environment's carrying capacity?", "¿Qué pasa si una población crece por encima de la capacidad de carga de su ambiente?"),
      bi("Resources run short, so the population drops back down.", "Los recursos escasean, así que la población vuelve a bajar."),
      [
        m("ignores-limits", "The population keeps growing forever.", "La población sigue creciendo para siempre."),
        m("thinks-resources-expand", "The environment grows more food to match.", "El ambiente produce más alimento para alcanzar."),
        m("ignores-limits", "Nothing changes; carrying capacity does not affect real populations.", "No cambia nada; la capacidad de carga no afecta a las poblaciones reales."),
      ],
      bi("There is not enough food and space for everyone.", "No hay suficiente alimento ni espacio para todos."),
      bi("Above carrying capacity, individuals compete for too few resources. Starvation, disease, or fewer births bring the population back down.", "Por encima de la capacidad de carga, los individuos compiten por muy pocos recursos. El hambre, las enfermedades o menos nacimientos hacen que la población vuelva a bajar."),
    ),
    e(
      bi("A population with plenty of resources and no limits grows faster and faster. What shape is its graph?", "Una población con muchos recursos y sin límites crece cada vez más rápido. ¿Qué forma tiene su gráfica?"),
      bi("A J-shaped curve", "Una curva en forma de J"),
      [
        m("j-s-curve-mixup", "An S-shaped curve", "Una curva en forma de S"),
        m("ignores-graph", "A flat line", "Una línea plana"),
        m("trend-reversed", "A line going down", "Una línea que baja"),
      ],
      bi("Each generation adds more individuals than the one before.", "Cada generación agrega más individuos que la anterior."),
      bi("Unlimited growth is exponential: the curve starts slow and then shoots upward like the letter J.", "El crecimiento sin límites es exponencial: la curva empieza lenta y luego se dispara hacia arriba como la letra J."),
    ),
    e(
      bi("A population grows quickly at first, slows down, and levels off at the carrying capacity. What shape is its graph?", "Una población crece rápido al principio, se frena y se estabiliza en la capacidad de carga. ¿Qué forma tiene su gráfica?"),
      bi("An S-shaped curve", "Una curva en forma de S"),
      [
        m("j-s-curve-mixup", "A J-shaped curve", "Una curva en forma de J"),
        m("ignores-limits", "A straight line that keeps going up", "Una línea recta que sigue subiendo"),
        m("ignores-graph", "A U-shaped curve", "Una curva en forma de U"),
      ],
      bi("The curve flattens out at the top.", "La curva se aplana en la parte de arriba."),
      bi("Logistic growth rises steeply, then bends and flattens near the carrying capacity, like a stretched letter S.", "El crecimiento logístico sube rápido, luego se curva y se aplana cerca de la capacidad de carga, como una letra S estirada."),
    ),
    e(
      bi(
        "In 1944, 29 reindeer were brought to St. Matthew Island in Alaska, which had no predators for them. By 1963 there were about 6,000. Then most of them died during the next winter. What is the best explanation?",
        "En 1944 se llevaron 29 renos a la isla St. Matthew, en Alaska, donde no tenían depredadores. Para 1963 había unos 6,000. Luego la mayoría murió durante el invierno siguiente. ¿Cuál es la mejor explicación?",
      ),
      bi("They outgrew their food supply and starved in a harsh winter.", "Superaron su suministro de alimento y murieron de hambre en un invierno duro."),
      [
        m("ignores-evidence", "Predators crossed the winter sea ice to the island and ate most of them.", "Llegaron depredadores a la isla cruzando el hielo del invierno y se comieron a la mayoría."),
        m("thinks-resources-expand", "The island grew more food as the herd grew.", "La isla produjo más alimento a medida que crecía la manada."),
        m("invented-reason", "Reindeer can live for only 19 years.", "Los renos solo pueden vivir 19 años."),
      ],
      bi("The reindeer fed on lichens, which grow back very slowly.", "Los renos se alimentaban de líquenes, que vuelven a crecer muy despacio."),
      bi("With no predators, the herd overshot what the island could feed. When the lichens ran out in a severe winter, the population crashed.", "Sin depredadores, la manada sobrepasó lo que la isla podía alimentar. Cuando se acabaron los líquenes en un invierno muy duro, la población se desplomó."),
    ),
    e(
      bi("Can the carrying capacity of an environment change?", "¿Puede cambiar la capacidad de carga de un ambiente?"),
      bi("Yes; a long drought can lower it, for example.", "Sí; por ejemplo, una sequía larga puede bajarla."),
      [
        m("thinks-k-fixed", "No; it stays the same forever.", "No; se queda igual para siempre."),
        m("thinks-individuals-adapt", "Only if the animals all decide to change it together.", "Solo si los animales deciden cambiarla entre todos."),
      ],
      bi("Carrying capacity depends on the resources available.", "La capacidad de carga depende de los recursos disponibles."),
      bi("When resources change, so does carrying capacity. Droughts, fires, and new predators can lower it; a wet year can raise it.", "Cuando cambian los recursos, también cambia la capacidad de carga. Las sequías, los incendios y nuevos depredadores pueden bajarla; un año lluvioso puede subirla."),
    ),
    e(
      bi("When a snowshoe hare population rises, the lynx population usually rises a little later. Why?", "Cuando aumenta la población de liebres americanas, la población de linces suele aumentar un poco después. ¿Por qué?"),
      bi("More hares means more food, so more lynx survive.", "Más liebres significa más alimento, así que sobreviven más linces."),
      [
        m("cause-effect-reversed", "More lynx cause the hare population to grow by scaring off other predators.", "Más linces hacen que crezca la población de liebres al ahuyentar a otros depredadores."),
        m("wrong-food-relationship", "Lynx and hares eat the same plants.", "Los linces y las liebres comen las mismas plantas."),
        m("invented-reason", "Lynx and hares are the same species.", "Los linces y las liebres son de la misma especie."),
      ],
      bi("Lynx hunt hares.", "Los linces cazan liebres."),
      bi("Prey are a resource for predators. When prey are plentiful, more predators survive, and their numbers climb after the prey's.", "Las presas son un recurso para los depredadores. Cuando abundan las presas, más depredadores sobreviven, y su número sube después que el de las presas."),
    ),
    e(
      bi("Which human action can raise the carrying capacity of an area for people?", "¿Qué acción humana puede aumentar la capacidad de carga de una zona para las personas?"),
      bi("Building irrigation to grow more food", "Construir sistemas de riego para cultivar más alimento"),
      [
        m("trend-reversed", "Paving over farmland", "Pavimentar tierras de cultivo"),
        m("trend-reversed", "Polluting the river that supplies the town's water", "Contaminar el río que le da agua potable a todo el pueblo"),
      ],
      bi("Which choice adds resources?", "¿Qué opción agrega recursos?"),
      bi("Irrigation makes more food possible, so more people can be supported. Losing farmland or clean water lowers carrying capacity.", "El riego permite producir más alimento, así que se puede sostener a más personas. Perder tierras de cultivo o agua limpia baja la capacidad de carga."),
    ),
    e(
      bi("On the floor of a dense forest, which resource most limits how many small plants can grow?", "En el suelo de un bosque denso, ¿qué recurso limita más cuántas plantas pequeñas pueden crecer?"),
      bi("Sunlight", "La luz del Sol"),
      [m("abundant-resource", "Oxygen in the air", "El oxígeno del aire"), m("irrelevant-factor", "Wind", "El viento")],
      bi("The tall trees above catch most of something plants need.", "Los árboles altos de arriba atrapan casi todo de algo que las plantas necesitan."),
      bi("The tree canopy blocks most of the light, so only shade-tolerant plants can grow on the forest floor.", "Las copas de los árboles bloquean casi toda la luz, así que en el suelo del bosque solo crecen plantas que toleran la sombra."),
    ),
    e(
      bi("Zebra mussels reached the Great Lakes in the late 1980s and had no natural predators there. Their population exploded. What does this show?", "Los mejillones cebra llegaron a los Grandes Lagos a fines de la década de 1980 y no tenían depredadores naturales ahí. Su población se disparó. ¿Qué muestra esto?"),
      bi("Without predators or other limits, a population can grow very fast.", "Sin depredadores ni otros límites, una población puede crecer muy rápido."),
      [
        m("cause-effect-reversed", "Predators make populations grow faster.", "Los depredadores hacen que las poblaciones crezcan más rápido."),
        m("ignores-evidence", "Mussels cannot live in fresh water.", "Los mejillones no pueden vivir en agua dulce."),
        m("ignores-limits", "Every population grows this fast all the time, in every kind of lake.", "Todas las poblaciones crecen así de rápido todo el tiempo, en cualquier lago."),
      ],
      bi("In their home waters, predators and competitors keep them in check.", "En sus aguas de origen, los depredadores y los competidores los mantienen bajo control."),
      bi("An invasive species that escapes its usual limits can grow explosively, crowding out native species.", "Una especie invasora que escapa de sus límites habituales puede crecer de forma explosiva y desplazar a las especies nativas."),
    ),
  ],
};

// ── s.earth.energy ──────────────────────────────────────────────────────────────────────────────

export const EARTH_ENERGY: Bank = {
  nudge: bi("Where does the heat come from, and how does it move through Earth?", "¿De dónde viene el calor y cómo se mueve por la Tierra?"),
  strategy: bi(
    "Ask where the heat starts and how it moves outward. Use the clues about pressure, depth, and earthquake waves.",
    "Pregúntate dónde empieza el calor y cómo se mueve hacia afuera. Usa las pistas sobre la presión, la profundidad y las ondas de los sismos.",
  ),
  seconds: 25,
  items: [
    e(
      bi("What are the two main sources of Earth's internal heat?", "¿Cuáles son las dos fuentes principales del calor interno de la Tierra?"),
      bi("Leftover heat from Earth's formation and radioactive decay", "El calor que quedó de la formación de la Tierra y la desintegración radiactiva"),
      [
        m("sun-heats-interior", "Sunlight that soaks deep into the ground over millions of years", "La luz del Sol que penetra hasta lo profundo del suelo durante millones de años"),
        m("invented-source", "Coal burning deep underground", "Carbón que arde en lo profundo"),
        m("invented-source", "Friction from ocean waves", "La fricción de las olas del mar"),
      ],
      bi("One source is very old; the other comes from unstable atoms.", "Una fuente es muy antigua; la otra viene de átomos inestables."),
      bi("Earth formed hot from colliding material, and elements such as uranium, thorium, and potassium still release heat as they decay.", "La Tierra se formó caliente por el choque de materiales, y elementos como el uranio, el torio y el potasio todavía liberan calor al desintegrarse."),
    ),
    e(
      bi("Which layer of Earth is liquid?", "¿Qué capa de la Tierra es líquida?"),
      bi("The outer core", "El núcleo externo"),
      [m("core-state-mixup", "The inner core", "El núcleo interno"), m("mantle-is-liquid", "The mantle", "El manto"), m("ignores-heat", "The crust", "La corteza")],
      bi("It is made of molten iron and nickel.", "Está hecha de hierro y níquel fundidos."),
      bi("The outer core is liquid metal. The mantle is mostly solid rock, and the inner core is solid because of enormous pressure.", "El núcleo externo es metal líquido. El manto es sobre todo roca sólida, y el núcleo interno es sólido por la enorme presión."),
    ),
    e(
      bi("The inner core is hotter than the outer core, yet it is solid. Why?", "El núcleo interno está más caliente que el núcleo externo y, aun así, es sólido. ¿Por qué?"),
      bi("The enormous pressure at the center keeps the metal solid.", "La enorme presión en el centro mantiene sólido el metal."),
      [
        m("core-state-mixup", "It is actually colder than the outer core that surrounds it.", "En realidad es más frío que el núcleo externo que lo rodea."),
        m("composition-mixup", "It is made of rock instead of metal.", "Está hecho de roca en lugar de metal."),
        m("invented-source", "It is made of frozen water.", "Está hecho de agua congelada."),
      ],
      bi("Squeezing particles together makes it harder for them to move apart into a liquid.", "Apretar las partículas hace más difícil que se separen para formar un líquido."),
      bi("Pressure rises toward Earth's center. At the center it is so high that iron stays solid even at more than 5,000 °C.", "La presión aumenta hacia el centro de la Tierra. En el centro es tan alta que el hierro sigue sólido incluso a más de 5,000 °C."),
    ),
    e(
      bi("What is the mantle mostly like?", "¿Cómo es el manto en su mayor parte?"),
      bi("Hot solid rock that flows very slowly", "Roca sólida caliente que fluye muy despacio"),
      [
        m("mantle-is-liquid", "An ocean of liquid lava", "Un océano de lava líquida"),
        m("ignores-heat", "Cold, brittle rock like the crust above it", "Roca fría y quebradiza como la corteza de arriba"),
        m("core-state-mixup", "Liquid iron", "Hierro líquido"),
      ],
      bi("Earthquake S waves, which cannot cross liquids, pass through the mantle.", "Las ondas S de los sismos, que no atraviesan líquidos, sí pasan por el manto."),
      bi("The mantle is solid, but hot enough to creep a few centimeters a year, like very stiff putty.", "El manto es sólido, pero está tan caliente que se desliza unos centímetros al año, como una plastilina muy dura."),
    ),
    e(
      bi("What drives the slow movement of tectonic plates?", "¿Qué impulsa el movimiento lento de las placas tectónicas?"),
      bi("Heat from Earth's interior moving through the mantle", "El calor del interior de la Tierra que se mueve por el manto"),
      [
        m("surface-forces", "Strong winds blowing on the continents for millions of years", "Vientos fuertes que soplan sobre los continentes durante millones de años"),
        m("surface-forces", "Ocean tides pushing the plates", "Las mareas que empujan las placas"),
        m("magnetism-mixup", "Earth's magnetic field", "El campo magnético de la Tierra"),
      ],
      bi("The energy comes from inside Earth, not from the Sun or the Moon.", "La energía viene del interior de la Tierra, no del Sol ni de la Luna."),
      bi("Mantle convection carries heat upward, and cold, dense plates sinking into the mantle pull the rest of the plate along.", "La convección del manto lleva el calor hacia arriba, y las placas frías y densas que se hunden en el manto jalan al resto de la placa."),
    ),
    e(
      bi("What evidence tells scientists that the outer core is liquid?", "¿Qué evidencia indica a los científicos que el núcleo externo es líquido?"),
      bi("Earthquake S waves do not pass through it.", "Las ondas S de los sismos no lo atraviesan."),
      [
        m("lava-from-core", "Lava from volcanoes comes straight from the core.", "La lava de los volcanes viene directamente del núcleo."),
        m("thinks-drilled-to-core", "Scientists have drilled down to it.", "Los científicos han perforado hasta llegar a él."),
      ],
      bi("The deepest hole ever drilled is about 12 km deep; the core starts near 2,900 km.", "El pozo más profundo que se ha perforado mide unos 12 km; el núcleo empieza cerca de los 2,900 km."),
      bi("S waves cannot travel through liquids, and they leave a shadow zone on the far side of Earth, so the outer core must be liquid.", "Las ondas S no viajan por líquidos y dejan una zona de sombra del otro lado de la Tierra, así que el núcleo externo debe ser líquido."),
    ),
    e(
      bi("Where does most magma come from?", "¿De dónde viene la mayor parte del magma?"),
      bi("Rock melting in the upper mantle and lower crust", "Roca que se funde en el manto superior y en la corteza baja"),
      [
        m("lava-from-core", "The liquid outer core", "El núcleo externo líquido"),
        m("invented-source", "Melted ice under the crust", "Hielo derretido bajo la corteza"),
        m("mantle-is-liquid", "A layer of liquid rock that covers the whole mantle under the crust", "Una capa de roca líquida que cubre todo el manto por debajo de la corteza"),
      ],
      bi("Melting happens where pressure drops or water is added, such as at ridges and subduction zones.", "La fusión ocurre donde baja la presión o se agrega agua, como en las dorsales y las zonas de subducción."),
      bi("Magma forms when parts of the upper mantle or crust melt, for example where plates pull apart or one plate sinks under another.", "El magma se forma cuando se funden partes del manto superior o de la corteza, por ejemplo donde las placas se separan o donde una placa se hunde bajo otra."),
    ),
    e(
      bi("What produces Earth's magnetic field?", "¿Qué produce el campo magnético de la Tierra?"),
      bi("Moving liquid iron in the outer core", "El hierro líquido en movimiento del núcleo externo"),
      [
        m("magnetism-mixup", "A giant bar magnet buried in Earth's crust", "Un imán de barra gigante enterrado en la corteza terrestre"),
        m("invented-source", "The Moon's gravity", "La gravedad de la Luna"),
        m("sun-heats-interior", "Sunlight hitting the poles", "La luz del Sol que llega a los polos"),
      ],
      bi("Moving electric charges make magnetic fields.", "Las cargas eléctricas en movimiento producen campos magnéticos."),
      bi("Convection in the liquid iron of the outer core makes electric currents, and those currents make the magnetic field.", "La convección del hierro líquido del núcleo externo produce corrientes eléctricas, y esas corrientes producen el campo magnético."),
    ),
    e(
      bi("How does temperature change as you go deeper into Earth?", "¿Cómo cambia la temperatura a medida que bajas hacia el interior de la Tierra?"),
      bi("It gets hotter.", "Aumenta."),
      [m("trend-reversed", "It gets colder.", "Disminuye."), m("ignores-heat", "It stays the same.", "Se mantiene igual.")],
      bi("Deep mines can be very hot.", "Las minas profundas pueden ser muy calientes."),
      bi("Temperature rises with depth, from about 25 °C per kilometer near the surface to more than 5,000 °C at the center.", "La temperatura aumenta con la profundidad, unos 25 °C por kilómetro cerca de la superficie, hasta más de 5,000 °C en el centro."),
    ),
    e(
      bi("Why are hot springs and geysers common in Yellowstone National Park?", "¿Por qué son comunes las aguas termales y los géiseres en el Parque Nacional Yellowstone?"),
      bi("Magma close to the surface heats underground water.", "El magma cerca de la superficie calienta el agua subterránea."),
      [
        m("sun-heats-interior", "The Sun heats the ground there more strongly than in other places.", "El Sol calienta el suelo ahí con más fuerza que en otros lugares."),
        m("invented-source", "Underground fires burn coal there.", "Ahí arden incendios de carbón bajo tierra."),
      ],
      bi("Yellowstone sits above a hot spot in the mantle.", "Yellowstone está sobre un punto caliente del manto."),
      bi("A large body of magma lies only a few kilometers under Yellowstone. It heats rainwater that soaks into the ground, which returns as hot springs and geysers.", "Un gran cuerpo de magma está a solo unos kilómetros bajo Yellowstone. Calienta el agua de lluvia que se filtra en el suelo, la cual regresa como aguas termales y géiseres."),
    ),
    e(
      bi("A pot of soup is heated from below. Warm soup rises, cools at the top, and sinks again. Which part of Earth moves in a similar way, but far more slowly?", "Una olla de sopa se calienta desde abajo. La sopa caliente sube, se enfría arriba y vuelve a bajar. ¿Qué parte de la Tierra se mueve de forma parecida, pero mucho más despacio?"),
      bi("The mantle", "El manto"),
      [m("core-state-mixup", "The inner core", "El núcleo interno"), m("ignores-heat", "The crust", "La corteza")],
      bi("This layer is solid rock that creeps over millions of years.", "Esta capa es roca sólida que se desliza a lo largo de millones de años."),
      bi("Hot mantle rock rises, cools near the top, and sinks, forming convection currents that move a few centimeters a year.", "La roca caliente del manto sube, se enfría cerca de arriba y baja, formando corrientes de convección que se mueven unos centímetros al año."),
    ),
    e(
      bi("The crust and the top part of the mantle together make up which layer?", "¿Qué capa forman juntas la corteza y la parte superior del manto?"),
      bi("The lithosphere", "La litosfera"),
      [
        m("layer-name-mixup", "The asthenosphere", "La astenosfera"),
        m("layer-name-mixup", "The outer core", "El núcleo externo"),
        m("layer-name-mixup", "The atmosphere", "La atmósfera"),
      ],
      bi("Litho means stone.", "Lito significa piedra."),
      bi("The rigid lithosphere is broken into tectonic plates that ride on the softer, slowly flowing asthenosphere below.", "La litosfera rígida está dividida en placas tectónicas que se mueven sobre la astenosfera, más blanda y que fluye despacio, que está debajo."),
    ),
    e(
      bi("The decay of which elements helps heat Earth's interior?", "¿La desintegración de qué elementos ayuda a calentar el interior de la Tierra?"),
      bi("Uranium, thorium, and potassium", "Uranio, torio y potasio"),
      [
        m("wrong-elements", "Oxygen, nitrogen, carbon, and hydrogen", "Oxígeno, nitrógeno, carbono e hidrógeno"),
        m("wrong-elements", "Helium and neon", "Helio y neón"),
        m("composition-mixup", "Iron and nickel", "Hierro y níquel"),
      ],
      bi("Look for elements that have radioactive forms found in rocks.", "Busca elementos que tengan formas radiactivas presentes en las rocas."),
      bi("Radioactive uranium, thorium, and potassium-40 in Earth's rocks release heat as they decay. Iron and nickel make up the core but are not radioactive.", "El uranio, el torio y el potasio-40 radiactivos de las rocas de la Tierra liberan calor al desintegrarse. El hierro y el níquel forman el núcleo, pero no son radiactivos."),
    ),
  ],
};

// ── s.claim.evidence ────────────────────────────────────────────────────────────────────────────

const LIGHT = bi(
  "A student grows three groups of bean plants with 2, 6, and 10 hours of light a day. After two weeks, the average heights are 4 cm, 9 cm, and 15 cm. She claims that more light makes bean plants grow taller.",
  "Una estudiante cultiva tres grupos de plantas de frijol con 2, 6 y 10 horas de luz al día. Después de dos semanas, las alturas promedio son 4 cm, 9 cm y 15 cm. Ella afirma que más luz hace crecer más a las plantas de frijol.",
);
const join = (a: { en: string; es: string }, en: string, es: string) => bi(`${a.en} ${en}`, `${a.es} ${es}`);

export const CLAIM_EVIDENCE: Bank = {
  nudge: bi("Is this part answering the question, giving data, or explaining why the data matter?", "¿Esta parte responde la pregunta, da datos o explica por qué importan los datos?"),
  strategy: bi(
    "Sort each statement by its job in the argument: the main point, the data behind it, or the science idea that links them. For data, check how many trials there were and whether the test was fair.",
    "Clasifica cada enunciado por su función en el argumento: la idea principal, los datos que la apoyan o la idea científica que los une. Para los datos, revisa cuántas pruebas hubo y si la prueba fue justa.",
  ),
  seconds: 40,
  items: [
    e(
      join(LIGHT, "Which part is her evidence?", "¿Cuál es su evidencia?"),
      bi("The average heights of 4, 9, and 15 cm with more hours of light", "Las alturas promedio de 4, 9 y 15 cm con más horas de luz"),
      [
        m("reasoning-as-evidence", "Plants use light energy to make the food they need to grow taller.", "Las plantas usan la energía de la luz para producir el alimento que necesitan para crecer."),
        m("claim-as-evidence", "More light makes bean plants grow taller.", "Más luz hace crecer más a las plantas de frijol."),
        m("irrelevant-evidence", "Bean plants are easy to grow.", "Las plantas de frijol son fáciles de cultivar."),
      ],
      bi("Evidence is what she measured.", "La evidencia es lo que ella midió."),
      bi("Her measured heights are the evidence. The statement about light is her claim, and the idea about making food is reasoning.", "Las alturas que midió son la evidencia. El enunciado sobre la luz es su afirmación, y la idea de producir alimento es razonamiento."),
    ),
    e(
      join(LIGHT, "Which statement is the best reasoning?", "¿Qué enunciado es el mejor razonamiento?"),
      bi("Plants make food from light, so more light means more growth.", "Las plantas producen alimento con la luz, así que más luz significa más crecimiento."),
      [
        m("evidence-as-reasoning", "The heights were 4 cm, 9 cm, and 15 cm after the two weeks of growth.", "Las alturas fueron de 4 cm, 9 cm y 15 cm al final de las dos semanas de crecimiento."),
        m("claim-as-reasoning", "More light makes bean plants grow taller.", "Más luz hace crecer más a las plantas de frijol."),
        m("irrelevant-evidence", "She used three groups of plants.", "Usó tres grupos de plantas."),
      ],
      bi("Reasoning explains why, using a science idea.", "El razonamiento explica por qué, usando una idea científica."),
      bi("Reasoning links the data to the claim with science: photosynthesis needs light, so more light means more food and more growth.", "El razonamiento une los datos con la afirmación usando la ciencia: la fotosíntesis necesita luz, así que más luz significa más alimento y más crecimiento."),
    ),
    e(
      bi("In an investigation, what is a claim?", "En una investigación, ¿qué es una afirmación?"),
      bi("A statement that answers the question being investigated", "Un enunciado que responde la pregunta que se investiga"),
      [
        m("claim-evidence-mixup", "The data collected in the experiment", "Los datos reunidos en el experimento"),
        m("claim-reasoning-mixup", "The science idea that explains why the data support the answer", "La idea científica que explica por qué los datos apoyan la respuesta"),
        m("irrelevant-evidence", "The list of materials used", "La lista de materiales que se usaron"),
      ],
      bi("It comes first in a claim–evidence–reasoning answer.", "Va primero en una respuesta de afirmación, evidencia y razonamiento."),
      bi("A claim is a one-sentence answer to the question. Evidence and reasoning then back it up.", "Una afirmación es una respuesta de una oración a la pregunta. Luego la evidencia y el razonamiento la respaldan."),
    ),
    e(
      bi("Which evidence best supports the claim that exercise raises heart rate?", "¿Qué evidencia apoya mejor la afirmación de que el ejercicio aumenta el ritmo cardíaco?"),
      bi("Heart rates of 20 students measured before and after exercise, all higher after", "Ritmos cardíacos de 20 estudiantes medidos antes y después del ejercicio, todos más altos después"),
      [
        m("weak-evidence", "One student said that she could feel her heart beating faster after she exercised.", "Una estudiante dijo que podía sentir que su corazón latía más rápido después de hacer ejercicio."),
        m("irrelevant-evidence", "A website says exercise is healthy.", "Una página web dice que el ejercicio es saludable."),
        m("reasoning-as-evidence", "The heart is a muscle.", "El corazón es un músculo."),
      ],
      bi("Look for measurements from many people.", "Busca mediciones de muchas personas."),
      bi("Measured data from many students, before and after, is strong evidence. One feeling, a general web statement, or a fact about the heart is not.", "Los datos medidos de muchos estudiantes, antes y después, son evidencia sólida. Una sensación, una frase general de internet o un dato sobre el corazón no lo son."),
    ),
    e(
      bi("Why is testing 30 plants better than testing just 1?", "¿Por qué es mejor probar 30 plantas que solo 1?"),
      bi("One unusual plant counts for less, so the results are more reliable.", "Una planta rara cuenta menos, así que los resultados son más confiables."),
      [
        m("invented-reason", "It makes the experiment finish faster.", "Hace que el experimento termine más rápido."),
        m("overclaims", "It proves the hypothesis is correct.", "Demuestra que la hipótesis es correcta."),
        m("ignores-control", "It means the experiment no longer needs a control group to compare with.", "Significa que el experimento ya no necesita un grupo de control para comparar."),
      ],
      bi("One plant might be unusual for reasons that have nothing to do with the test.", "Una planta podría ser rara por razones que no tienen nada que ver con la prueba."),
      bi("A larger sample averages out chance differences, so the results are more trustworthy. It still cannot prove a hypothesis for certain.", "Una muestra más grande compensa las diferencias por casualidad, así que los resultados son más confiables. Aun así, no puede demostrar una hipótesis con certeza."),
    ),
    e(
      bi(
        "Data show that on days when more ice cream is sold, more people get sunburned. A student claims that eating ice cream causes sunburn. What is the best response?",
        "Los datos muestran que los días en que se vende más helado, más personas se queman con el sol. Un estudiante afirma que comer helado causa quemaduras de sol. ¿Cuál es la mejor respuesta?",
      ),
      bi("Hot, sunny days raise both; a link does not prove a cause.", "Los días calurosos y soleados aumentan los dos; una relación no prueba una causa."),
      [
        m("correlation-as-causation", "The claim is proven, because the two numbers rise together.", "La afirmación está demostrada, porque los dos números suben juntos todos los días."),
        m("irrelevant-reasoning", "The claim is wrong, because ice cream is cold.", "La afirmación es falsa, porque el helado está frío."),
      ],
      bi("Is there a third thing that could make both numbers go up?", "¿Hay una tercera cosa que podría hacer que los dos números suban?"),
      bi("Sunny weather raises both ice cream sales and sunburns. A correlation alone does not show cause and effect.", "El clima soleado aumenta tanto la venta de helado como las quemaduras de sol. Una correlación por sí sola no muestra causa y efecto."),
    ),
    e(
      bi("A ball dropped from 1 m bounces up 60 cm. Dropped from 2 m, it bounces 120 cm. Dropped from 3 m, it bounces 180 cm. Which claim do these data support?", "Una pelota que cae desde 1 m rebota 60 cm. Desde 2 m, rebota 120 cm. Desde 3 m, rebota 180 cm. ¿Qué afirmación apoyan estos datos?"),
      bi("The ball bounces back to about 60% of the height it is dropped from.", "La pelota rebota hasta cerca del 60% de la altura desde la que cae."),
      [
        m("misreads-data", "The ball bounces higher than the height it is dropped from each time.", "La pelota rebota cada vez más alto que la altura desde la que la dejan caer."),
        m("misreads-data", "Drop height does not affect bounce height.", "La altura de caída no afecta la altura del rebote."),
        m("misreads-data", "The ball always bounces 60 cm.", "La pelota siempre rebota 60 cm."),
      ],
      bi("Compare each bounce height with its drop height.", "Compara cada altura de rebote con su altura de caída."),
      bi("60 ÷ 100, 120 ÷ 200, and 180 ÷ 300 all equal 0.6, so the bounce is 60% of the drop height each time.", "60 ÷ 100, 120 ÷ 200 y 180 ÷ 300 dan 0.6, así que el rebote es el 60% de la altura de caída cada vez."),
    ),
    e(
      bi("A claim says that magnets attract all metals. Which observation goes against this claim?", "Una afirmación dice que los imanes atraen a todos los metales. ¿Qué observación va en contra de esta afirmación?"),
      bi("A magnet does not pull on a copper wire.", "Un imán no atrae un alambre de cobre."),
      [
        m("supports-not-refutes", "A magnet pulls on an iron nail.", "Un imán atrae un clavo de hierro."),
        m("supports-not-refutes", "A magnet pulls on a steel paper clip.", "Un imán atrae un clip de acero."),
        m("supports-not-refutes", "A magnet sticks to a steel refrigerator door.", "Un imán se pega a la puerta de acero de un refrigerador."),
      ],
      bi("One counterexample is enough to show an all claim is false.", "Un solo contraejemplo basta para mostrar que una afirmación sobre todos es falsa."),
      bi("Copper is a metal that magnets do not attract, so the claim about all metals is false. Iron and steel fit the claim but cannot prove it.", "El cobre es un metal que los imanes no atraen, así que la afirmación sobre todos los metales es falsa. El hierro y el acero encajan con la afirmación, pero no la demuestran."),
    ),
    e(
      bi("In a test of whether a fertilizer helps plants grow, which group is the control?", "En una prueba para ver si un fertilizante ayuda a crecer a las plantas, ¿cuál es el grupo de control?"),
      bi("Plants given the same water and light but no fertilizer", "Plantas con la misma agua y luz, pero sin fertilizante"),
      [
        m("ignores-control", "Plants given the most fertilizer", "Plantas con la mayor cantidad de fertilizante"),
        m("changes-two-variables", "Plants given fertilizer and also extra hours of light each day", "Plantas con fertilizante y además más horas de luz cada día"),
        m("irrelevant-evidence", "Plants that died during the test", "Plantas que murieron durante la prueba"),
      ],
      bi("The control shows what happens without the thing being tested.", "El grupo de control muestra qué pasa sin lo que se está probando."),
      bi("The control group gets everything the same except the fertilizer, so any difference can be traced to the fertilizer.", "El grupo de control recibe todo igual excepto el fertilizante, así que cualquier diferencia se puede atribuir al fertilizante."),
    ),
    e(
      bi("New, careful measurements go against a scientist's claim. What should she do?", "Nuevas mediciones cuidadosas van en contra de la afirmación de una científica. ¿Qué debe hacer?"),
      bi("Revise the claim so it fits all of the evidence.", "Revisar la afirmación para que concuerde con toda la evidencia."),
      [
        m("ignores-evidence", "Ignore the new measurements.", "Ignorar las nuevas mediciones."),
        m("overclaims", "Keep the claim because she was the first one to make it.", "Mantener la afirmación porque ella fue la primera persona en hacerla."),
        m("overreacts", "Throw out all of her earlier data.", "Tirar todos sus datos anteriores."),
      ],
      bi("Science changes when the evidence calls for it.", "La ciencia cambia cuando la evidencia lo pide."),
      bi("Claims must fit the evidence. When reliable new data disagree, scientists check the data and then revise the claim.", "Las afirmaciones deben concordar con la evidencia. Cuando nuevos datos confiables no coinciden, los científicos revisan los datos y luego corrigen la afirmación."),
    ),
    e(
      bi(
        "A graph shows that as water temperature rises from 10 °C to 40 °C, the amount of sugar that dissolves in 100 mL of water rises from about 190 g to about 240 g. Which claim does this support?",
        "Una gráfica muestra que cuando la temperatura del agua sube de 10 °C a 40 °C, la cantidad de azúcar que se disuelve en 100 mL de agua sube de unos 190 g a unos 240 g. ¿Qué afirmación apoya esto?",
      ),
      bi("More sugar can dissolve in warmer water.", "En el agua más caliente se puede disolver más azúcar."),
      [
        m("misreads-data", "Less sugar can dissolve in warmer water.", "En el agua más caliente se puede disolver menos azúcar."),
        m("misreads-data", "Temperature has no effect on how much sugar dissolves.", "La temperatura no afecta cuánta azúcar se disuelve."),
        m("overclaims", "No sugar can dissolve in cold water.", "En el agua fría no se puede disolver nada de azúcar."),
      ],
      bi("Which way does the amount change as the temperature goes up?", "¿Hacia dónde cambia la cantidad cuando sube la temperatura?"),
      bi("The amount that dissolves rises with temperature, so warmer water dissolves more sugar. Even at 10 °C, a lot of sugar dissolves.", "La cantidad que se disuelve aumenta con la temperatura, así que el agua más caliente disuelve más azúcar. Incluso a 10 °C se disuelve mucha azúcar."),
    ),
    e(
      bi("Two classes in different schools test the same hypothesis the same way and get the same results. What does this do?", "Dos grupos de escuelas distintas prueban la misma hipótesis de la misma forma y obtienen los mismos resultados. ¿Qué logra esto?"),
      bi("It makes the conclusion more trustworthy.", "Hace que la conclusión sea más confiable."),
      [
        m("overclaims", "It proves the hypothesis is true forever.", "Demuestra que la hipótesis es verdadera para siempre."),
        m("invented-reason", "It means one class copied the other.", "Significa que un grupo copió al otro."),
        m("ignores-evidence", "It makes no difference to the conclusion.", "No cambia en nada la conclusión."),
      ],
      bi("Scientists repeat each other's experiments on purpose.", "Los científicos repiten a propósito los experimentos de otros."),
      bi("Results that can be repeated by others are more reliable, though new evidence could still change the conclusion someday.", "Los resultados que otros pueden repetir son más confiables, aunque nueva evidencia podría cambiar la conclusión algún día."),
    ),
    e(
      bi(
        "Claim: Ice melts faster on a metal tray than on a plastic tray. Evidence: ice on metal melted in 4 minutes, and ice on plastic in 11 minutes. Which reasoning best connects them?",
        "Afirmación: el hielo se derrite más rápido sobre una bandeja de metal que sobre una de plástico. Evidencia: el hielo sobre metal se derritió en 4 minutos, y sobre plástico en 11 minutos. ¿Qué razonamiento las conecta mejor?",
      ),
      bi("Metal conducts heat better than plastic, so energy reached the ice faster.", "El metal conduce el calor mejor que el plástico, así que la energía llegó más rápido al hielo."),
      [
        m("misreads-heat", "Metal is colder than plastic, so it pulls the cold out of the ice and melts it faster.", "El metal está más frío que el plástico, así que le saca el frío al hielo y lo derrite más rápido."),
        m("evidence-as-reasoning", "4 minutes is less than 11 minutes.", "4 minutos es menos que 11 minutos."),
      ],
      bi("Which science idea explains how energy moved into the ice?", "¿Qué idea científica explica cómo entró la energía al hielo?"),
      bi("Reasoning uses a science idea: metal is a good thermal conductor, so it carried energy from the warm room to the ice faster.", "El razonamiento usa una idea científica: el metal es buen conductor térmico, así que llevó la energía del cuarto tibio al hielo más rápido."),
    ),
  ],
};
