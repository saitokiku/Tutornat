import { bi, e, m, mx, type Bank } from "./shared";

// Grade 7 banks: photosynthesis and respiration, matter cycling and energy flow, mixtures and compounds,
// signs of chemical reactions, and where natural resources come from.

// ── s.photo.resp ────────────────────────────────────────────────────────────────────────────────

export const PHOTO_IO: Bank = {
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

export const MATTER_ENERGY: Bank = {
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
      [m("inverted-pyramid", "Top predators", "Los superdepredadores"), m("inverted-pyramid", "Secondary consumers", "Los consumidores secundarios"), m("inverted-pyramid", "Primary consumers", "Los consumidores primarios")],
      bi("Energy is lost at every step up.", "Se pierde energía en cada paso hacia arriba."),
      bi("All the energy for the pyramid enters through the producers, and each level above has less.", "Toda la energía de la pirámide entra por los productores, y cada nivel de arriba tiene menos."),
    ),
    e(
      bi("What is the source of energy for almost every ecosystem on Earth?", "¿Cuál es la fuente de energía de casi todos los ecosistemas de la Tierra?"),
      bi("The Sun", "El Sol"),
      [m("thinks-plants-eat-soil", "The soil", "El suelo"), m("thinks-energy-recycles", "Decomposers", "Los descomponedores"), m("matter-as-energy-source", "Water", "El agua")],
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

export const MIXTURES: Bank = {
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

export const REACTION_SIGNS: Bank = {
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
      [m("precipitate-solution-mixup", "A solution", "Una disolución"), m("precipitate-solution-mixup", "A solvent", "Un disolvente"), m("physical-change-as-reaction", "Ice", "Hielo")],
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

export const RESOURCES: Bank = {
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
