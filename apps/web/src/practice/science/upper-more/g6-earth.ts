import { bi, e, m, mx, type Bank } from "./shared";

// Grade 6 Earth, energy and engineering banks: air masses and fronts, the rock cycle, thermal energy
// transfer, and design criteria and constraints.

// ── s.air.masses ────────────────────────────────────────────────────────────────────────────────

const COLD_FRONT = bi("Cold front", "Frente frío");
const WARM_FRONT = bi("Warm front", "Frente cálido");
const STAT_FRONT = bi("Stationary front", "Frente estacionario");
const OCCL_FRONT = bi("Occluded front", "Frente ocluido");
const WARM_HUMID = bi("Warm and humid", "Cálida y húmeda");
const WARM_DRY = bi("Warm and dry", "Cálida y seca");
const COLD_HUMID = bi("Cold and humid", "Fría y húmeda");
const COLD_DRY = bi("Cold and dry", "Fría y seca");

export const AIR_MASSES: Bank = {
  nudge: bi("Where did the air come from, and which air is moving into which?", "¿De dónde vino el aire y cuál aire avanza sobre cuál?"),
  strategy: bi(
    "Ask where the air formed: over water or over land, and nearer the poles or the tropics. Each answer sets one of its traits. At a boundary, ask which air is moving in and how quickly it lifts the other air.",
    "Pregúntate dónde se formó el aire: sobre agua o sobre tierra, y más cerca de los polos o de los trópicos. Cada respuesta define uno de sus rasgos. En un límite, pregúntate qué aire está llegando y qué tan rápido levanta al otro.",
  ),
  seconds: 25,
  items: [
    e(
      bi("What is an air mass?", "¿Qué es una masa de aire?"),
      bi("A huge body of air with about the same temperature and humidity throughout", "Un gran volumen de aire con casi la misma temperatura y humedad en todas sus partes"),
      [
        m("confused-air-mass-and-front", "A narrow boundary line where two kinds of air with different temperatures meet", "Una franja angosta donde se encuentran dos tipos de aire con distinta temperatura y humedad"),
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
        m("confused-air-mass-and-jet-stream", "A narrow river of fast wind high in the sky, above the clouds", "Un río angosto de viento rápido en lo alto del cielo, sobre las nubes"),
      ],
      bi("Fronts are drawn as lines on weather maps.", "Los frentes se dibujan como líneas en los mapas del tiempo."),
      bi("A front is where two air masses with different temperatures and humidity meet. Most changes in weather happen along fronts.", "Un frente es donde se encuentran dos masas de aire con distinta temperatura y humedad. La mayoría de los cambios de tiempo ocurren a lo largo de los frentes."),
    ),
    e(
      bi("A cold front is arriving. Which weather is most likely as it passes?", "Se acerca un frente frío. ¿Qué tiempo es más probable cuando pase?"),
      bi("Tall clouds, thunderstorms, and heavy rain for a short time", "Nubes de tormenta, tormentas eléctricas y lluvia fuerte por poco tiempo"),
      [
        m("cold-warm-front-mixup", "Layers of low clouds and light, steady rain for a day or two", "Capas de nubes bajas y lluvia ligera y constante durante uno o dos días"),
        m("thinks-fronts-bring-no-weather", "Clear skies with no change at all", "Cielo despejado sin ningún cambio"),
        m("cold-stationary-front-mixup", "Clouds and drizzle that stay in place for a week", "Nubes y llovizna que se quedan en el mismo lugar una semana"),
      ],
      bi("Cold air moves in fast and shoves the warm air straight up.", "El aire frío avanza rápido y empuja el aire cálido hacia arriba de golpe."),
      bi("At a cold front, dense cold air pushes under warm air and forces it up quickly. The rising air builds tall clouds and short, strong storms.", "En un frente frío, el aire frío y denso se mete debajo del aire cálido y lo obliga a subir rápido. El aire que sube forma nubes de gran desarrollo vertical y tormentas cortas y fuertes."),
    ),
    e(
      bi("A warm front is arriving. Which weather is most likely?", "Se acerca un frente cálido. ¿Qué tiempo es más probable?"),
      bi("Layers of clouds and light, steady rain that can last a day or more", "Capas de nubes y lluvia ligera y constante que puede durar un día o más"),
      [
        m("cold-warm-front-mixup", "A short burst of strong thunderstorms, then cooler, drier air behind it", "Una racha corta de tormentas fuertes y luego aire más fresco y seco detrás"),
        m("thinks-fronts-bring-no-weather", "Clear skies and no clouds", "Cielo despejado y sin nubes"),
        m("mixed-up-air-properties", "Colder, drier air right away", "Aire más frío y seco de inmediato"),
      ],
      bi("Warm air slides gently up over the cold air, like going up a long ramp.", "El aire cálido sube suavemente sobre el aire frío, como por una rampa larga."),
      bi("At a warm front, warm air rises slowly over cold air, so wide layers of clouds form and steady rain falls for a long time.", "En un frente cálido, el aire cálido sube despacio sobre el aire frío, así que se forman capas amplias de nubes y cae lluvia constante por mucho tiempo."),
    ),
    e(
      bi("After a cold front passes, what is the air usually like?", "Después de que pasa un frente frío, ¿cómo suele ser el aire?"),
      bi("Cooler and drier", "Más fresco y seco"),
      [
        m("cold-warm-front-mixup", "Warmer and more humid", "Más cálido y húmedo"),
        m("thinks-fronts-bring-no-weather", "The same as before the front", "Igual que antes del frente"),
        m("mixed-up-air-properties", "Hotter and drier", "Más caliente y seco"),
      ],
      bi("The air mass behind the front is the cold one.", "La masa de aire detrás del frente es la fría."),
      bi("Behind a cold front is the cold air mass, so temperatures drop, humidity falls, and skies often clear.", "Detrás de un frente frío está la masa de aire frío, así que baja la temperatura, baja la humedad y el cielo suele despejarse."),
    ),
    e(
      bi("On a weather map, a blue line with triangles shows which kind of front?", "En un mapa del tiempo, ¿qué tipo de frente indica una línea azul con triángulos?"),
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
      bi("Warm, moist air is pushed up fast, cools, and its water vapor condenses.", "El aire cálido y húmedo sube rápido, se enfría y su vapor de agua se condensa."),
      [
        m("thinks-warm-air-sinks", "Warm air sinks under the cold air and heats the ground.", "El aire cálido baja debajo del aire frío y calienta el suelo."),
        m("thinks-cold-air-holds-more-water", "Cold air holds more water vapor than warm air, so it rains as soon as it arrives.", "El aire frío contiene más vapor de agua que el cálido, así que llueve en cuanto llega."),
        m("thinks-fronts-bring-no-weather", "The front itself is a giant storm cloud.", "El frente mismo es una nube de tormenta gigante."),
      ],
      bi("Clouds form when air rises and cools.", "Las nubes se forman cuando el aire sube y se enfría."),
      bi("Fast-rising warm, moist air cools quickly, so its water vapor condenses into tall storm clouds.", "El aire cálido y húmedo que sube rápido se enfría pronto, así que su vapor de agua se condensa en nubes de tormenta de gran desarrollo vertical."),
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

export const ROCK_CYCLE: Bank = {
  nudge: bi("Which process is acting here: melting, cooling, breaking, settling, pressing, or heating without melting?", "¿Qué proceso actúa aquí: fundirse, enfriarse, romperse, depositarse, compactarse o calentarse sin fundirse?"),
  strategy: bi(
    "Find the process in the question first: melting and then cooling, breaking and piling up, or squeezing and heating while the rock stays solid. Then name the kind of rock that process builds.",
    "Primero encuentra el proceso en la pregunta: fundirse y luego enfriarse, romperse y acumularse, o apretarse y calentarse mientras la roca sigue sólida. Luego nombra el tipo de roca que forma ese proceso.",
  ),
  seconds: 25,
  items: [
    e(
      bi("How does igneous rock form?", "¿Cómo se forma la roca ígnea?"),
      bi("Melted rock (magma or lava) cools and hardens.", "La roca fundida (magma o lava) se enfría y se endurece."),
      [
        m("confused-with-sedimentary", "Layers of sediment are pressed and cemented together.", "Capas de sedimento se compactan y se cementan."),
        m("confused-with-metamorphic", "Heat and pressure change a rock without ever melting it.", "El calor y la presión cambian una roca sin llegar a fundirla."),
        m("weathering-erosion-mixup", "Wind and water break a rock into pieces.", "El viento y el agua rompen una roca en pedazos."),
      ],
      bi("Igneous comes from the Latin word for fire.", "Ígnea viene de la palabra latina para fuego."),
      bi("Igneous rock forms when magma cools underground or lava cools at the surface.", "La roca ígnea se forma cuando el magma se enfría bajo tierra o la lava se enfría en la superficie."),
    ),
    e(
      bi("How does sedimentary rock form?", "¿Cómo se forma la roca sedimentaria?"),
      bi("Sediments settle in layers and are pressed and cemented.", "Los sedimentos se depositan en capas y se compactan y cementan."),
      [
        m("confused-with-igneous", "Lava cools quickly at the surface.", "La lava se enfría rápido en la superficie."),
        m("confused-with-metamorphic", "Heat and pressure deep underground change it without melting it.", "El calor y la presión en lo profundo de la Tierra la cambian sin fundirla."),
        m("thinks-metamorphic-melts", "Rock melts and then cools slowly.", "La roca se funde y luego se enfría despacio."),
      ],
      bi("Think of sand and mud piling up at the bottom of a lake.", "Piensa en arena y lodo que se acumulan en el fondo de un lago."),
      bi("Bits of rock, shells, and mud pile up in layers. Over time the weight presses them, and minerals cement them into rock.", "Pedacitos de roca, conchas y lodo se acumulan en capas. Con el tiempo, el peso los compacta y los minerales los cementan hasta formar roca."),
    ),
    e(
      bi("How does metamorphic rock form?", "¿Cómo se forma la roca metamórfica?"),
      bi("Heat and pressure change an existing rock without melting it.", "El calor y la presión cambian una roca que ya existe sin fundirla."),
      [
        m("thinks-metamorphic-melts", "A rock melts completely deep underground and then cools again.", "Una roca se funde por completo en lo profundo y luego se vuelve a enfriar."),
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
        m("thinks-metamorphic-melts", "Granite that melted and then cooled again", "Granito que se fundió y se volvió a enfriar"),
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
        m("thinks-cycle-has-fixed-order", "It has to become a metamorphic rock first.", "Primero tiene que convertirse en roca metamórfica."),
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
      [m("mixed-up-energy-sources", "Energy from the Sun", "La energía del Sol"), m("surface-heat-for-deep-rock", "Heat from wildfires at the surface", "El calor de los incendios en la superficie")],
      bi("The Sun's heat reaches only a short way into the ground.", "El calor del Sol solo llega un poco bajo el suelo."),
      bi("Earth's internal heat, from its formation and from radioactive elements, drives melting and metamorphism.", "El calor interno de la Tierra, que viene de su formación y de elementos radiactivos, impulsa la fusión y el metamorfismo."),
    ),
    e(
      bi("What provides the energy that drives weathering and erosion at Earth's surface?", "¿Qué aporta la energía que impulsa la meteorización y la erosión en la superficie de la Tierra?"),
      bi("Energy from the Sun", "La energía del Sol"),
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
        m("confused-with-metamorphic", "Heat and pressure squeezed the rock full of holes.", "El calor y la presión apretaron tanto la roca que la dejaron llena de agujeros."),
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

export const HEAT_TRANSFER: Bank = {
  nudge: bi("Is the energy moving through touching, through a moving fluid, or through empty space?", "¿La energía se mueve por contacto, por un fluido en movimiento o a través del espacio vacío?"),
  strategy: bi(
    "Ask what carries the energy: particles that bump their neighbors but stay in place, a warm liquid or gas that moves from place to place, or waves that need no matter at all. Then ask which way the energy moves.",
    "Pregúntate qué lleva la energía: partículas que chocan con sus vecinas pero se quedan en su lugar, un líquido o gas tibio que se mueve de un lugar a otro, u ondas que no necesitan materia. Luego pregúntate hacia dónde se mueve la energía.",
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
        m("energy-direction-reversed", "Thermal energy flows from the ice into your hand.", "La energía térmica fluye desde el hielo hacia tu mano."),
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
        m("thinks-metal-is-colder", "The metal bench is at a lower temperature than the wooden one.", "La banca de metal está a una temperatura más baja que la de madera."),
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
        m("thinks-heat-is-a-substance", "Heat is a light substance that always floats up on its own and lifts the air.", "El calor es una sustancia ligera que siempre flota hacia arriba por sí sola y levanta el aire."),
        m("thinks-cold-flows", "Cold air pulls it up from above.", "El aire frío lo jala desde arriba."),
      ],
      bi("Compare how tightly packed the particles are in warm air and cool air.", "Compara qué tan juntas están las partículas en el aire caliente y en el frío."),
      bi("Heated air particles move faster and spread out, so the air is less dense. Denser cool air sinks below it and pushes it upward.", "Las partículas del aire caliente se mueven más rápido y se separan, así que el aire es menos denso. El aire frío, más denso, baja y lo empuja hacia arriba."),
    ),
    e(
      bi("On a sunny afternoon at the beach, a breeze blows from the ocean onto the land. Why?", "En una tarde soleada en la playa, sopla una brisa del mar hacia la tierra. ¿Por qué?"),
      bi("The land heats faster, warm air over it rises, and cooler sea air moves in.", "La tierra se calienta más rápido, el aire caliente sube y entra aire más fresco del mar."),
      [
        m("land-sea-heating-reversed", "The ocean heats faster than the land, so warm air moves from the sea to the land.", "El mar se calienta más rápido que la tierra, así que el aire caliente va del mar hacia la tierra."),
        m("thinks-waves-make-wind", "The waves push the air toward the land.", "Las olas empujan el aire hacia la tierra."),
        m("convection-radiation-mixup", "Sunlight bounces off the water and pushes the air.", "La luz del Sol rebota en el agua y empuja el aire."),
      ],
      bi("Sand gets hot under your feet long before the water warms up.", "La arena se calienta bajo tus pies mucho antes de que el agua se entibie."),
      bi("Land warms faster than water. Air over the land warms and rises, and cooler air from over the water flows in: a convection current.", "La tierra se calienta más rápido que el agua. El aire sobre la tierra se calienta y sube, y el aire más fresco de sobre el agua entra: una corriente de convección."),
    ),
    e(
      bi(
        "Two shirts are the same except that one is black and one is white. Both lie in direct sunlight. Which one warms up faster?",
        "Dos camisetas son iguales, salvo que una es negra y la otra es blanca. Las dos están al sol directo. ¿Cuál se calienta más rápido?",
      ),
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
        m("convection-radiation-mixup", "Metal sends radiation into the food, and the handles block light from your hand.", "El metal envía radiación a los alimentos y los mangos le bloquean la luz a tu mano."),
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
        m("conduction-convection-mixup", "By conduction through the walls", "Por conducción a través de las paredes"),
      ],
      bi("Air is a poor conductor, but it can move.", "El aire conduce mal la energía, pero se puede mover."),
      bi("Air warmed by the heater rises, spreads across the ceiling, cools, and sinks, so a loop of moving air carries energy around the room.", "El aire que calienta el calentador sube, se extiende por el techo, se enfría y baja, así que un circuito de aire en movimiento lleva la energía por el cuarto."),
    ),
    e(
      bi("A cup of water at 80 °C touches a cup of water at 20 °C. Which way does thermal energy flow?", "Una taza de agua a 80 °C toca una taza de agua a 20 °C. ¿Hacia dónde fluye la energía térmica?"),
      bi("From the hot water to the cool water", "Del agua caliente al agua fría"),
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

// Every entry has three or four choices, so a blind guess scores at most a third.
export const DESIGN: Bank = {
  nudge: bi("Is it something the design must do, or a limit on how you can build it?", "¿Es algo que el diseño debe lograr o un límite sobre cómo puedes construirlo?"),
  strategy: bi(
    "Criteria say what a successful design must do, such as hold a weight or keep water warm. Constraints are limits, such as cost, time, materials, size, or safety rules.",
    "Los criterios dicen lo que debe lograr un diseño exitoso, como aguantar un peso o mantener el agua caliente. Las restricciones son límites, como el costo, el tiempo, los materiales, el tamaño o las reglas de seguridad.",
  ),
  seconds: 25,
  items: [
    e(
      bi("A team is designing a filter for muddy water. Which of these is a criterion?", "Un equipo diseña un filtro para agua con lodo. ¿Cuál de estas es un criterio?"),
      bi("It removes the visible dirt from the water.", "Quita del agua la suciedad visible."),
      [
        m("criterion-constraint-mixup", "Its materials can cost no more than $5 in all.", "Sus materiales no pueden costar más de $5 en total."),
        m("criterion-constraint-mixup", "It may use only sand, gravel, and cloth.", "Solo puede usar arena, grava y tela."),
      ],
      bi("Look for the one that describes a result the filter must achieve.", "Busca la que describe un resultado que el filtro debe lograr."),
      bi("Removing the dirt is the goal the filter must meet, so it is a criterion. The cost and the allowed materials are limits, so they are constraints.", "Quitar la suciedad es la meta que debe cumplir el filtro, así que es un criterio. El costo y los materiales permitidos son límites, así que son restricciones."),
    ),
    e(
      bi("A class is building model bridges. Which of these is a constraint?", "Una clase construye maquetas de puentes. ¿Cuál de estas es una restricción?"),
      bi("It may be built only from craft sticks and glue.", "Solo se puede construir con palitos de madera y pegamento."),
      [
        m("criterion-constraint-mixup", "It must hold a 2 kg load without breaking.", "Debe aguantar una carga de 2 kg sin romperse."),
        m("criterion-constraint-mixup", "It must stay standing when a toy truck rolls across it.", "Debe seguir en pie cuando un camión de juguete pasa por encima."),
      ],
      bi("Look for the one that limits how the bridge may be built.", "Busca la que limita cómo se puede construir el puente."),
      bi("Holding 2 kg and staying standing are goals, so they are criteria. A rule about the allowed materials is a limit, so it is a constraint.", "Aguantar 2 kg y seguir en pie son metas, así que son criterios. Una regla sobre los materiales permitidos es un límite, así que es una restricción."),
    ),
    e(
      bi("Students are designing a solar oven. Which of these is a criterion?", "Unos estudiantes diseñan un horno solar. ¿Cuál de estas es un criterio?"),
      bi("It heats a cup of water to at least 50 °C.", "Calienta una taza de agua hasta al menos 50 °C."),
      [
        m("criterion-constraint-mixup", "It must be finished within three class periods.", "Debe terminarse en un máximo de tres clases."),
        m("criterion-constraint-mixup", "It can be no larger than a shoebox.", "No puede ser más grande que una caja de zapatos."),
      ],
      bi("Which one is a measurable goal for the oven?", "¿Cuál es una meta medible para el horno?"),
      bi("Reaching 50 °C is what the oven must achieve, so it is a criterion. The time limit and the size limit are constraints.", "Llegar a 50 °C es lo que el horno debe lograr, así que es un criterio. El límite de tiempo y el de tamaño son restricciones."),
    ),
    e(
      bi("A team is designing a package to protect a raw egg in a 2 m drop. Which of these is a constraint?", "Un equipo diseña un empaque para proteger un huevo crudo en una caída de 2 m. ¿Cuál de estas es una restricción?"),
      bi("It can use no more than 10 sheets of paper and 1 m of tape.", "No puede usar más de 10 hojas de papel y 1 m de cinta."),
      [
        m("criterion-constraint-mixup", "It keeps the egg from cracking when the package hits the floor.", "Evita que el huevo se rompa cuando el empaque choca contra el suelo."),
        m("criterion-constraint-mixup", "It lands with the egg still inside.", "Cae con el huevo todavía adentro."),
      ],
      bi("Look for the one that limits what you may use.", "Busca la que limita lo que puedes usar."),
      bi("Protecting the egg and keeping it inside are goals, so they are criteria. The limit on paper and tape is a constraint.", "Proteger el huevo y mantenerlo adentro son metas, así que son criterios. El límite de papel y cinta es una restricción."),
    ),
    e(
      bi("A student is building a toy car powered by a balloon. Which of these is a criterion?", "Una estudiante construye un carrito de juguete impulsado por un globo. ¿Cuál de estas es un criterio?"),
      bi("It rolls at least 3 m in a straight line.", "Avanza al menos 3 m en línea recta."),
      [
        m("criterion-constraint-mixup", "It must use only one balloon.", "Solo debe usar un globo."),
        m("criterion-constraint-mixup", "It must have a mass of less than 200 grams.", "Debe tener una masa de menos de 200 gramos."),
      ],
      bi("Which one describes how well the car must perform?", "¿Cuál describe qué tan bien debe funcionar el carrito?"),
      bi("Rolling 3 m is a goal the car must meet, so it is a criterion. Using one balloon and staying under 200 g are limits, so they are constraints.", "Avanzar 3 m es una meta que debe cumplir el carrito, así que es un criterio. Usar un solo globo y pesar menos de 200 g son límites, así que son restricciones."),
    ),
    e(
      bi("A club is building a birdhouse. Which of these is a constraint?", "Un club construye una casita para pájaros. ¿Cuál de estas es una restricción?"),
      bi("It must be made from wood scraps the club already has.", "Debe hacerse con retazos de madera que el club ya tiene."),
      [
        m("criterion-constraint-mixup", "It keeps rain off the nest inside.", "Protege de la lluvia el nido de adentro."),
        m("criterion-constraint-mixup", "It has an opening big enough for a small bird to get in.", "Tiene una entrada lo bastante grande para que entre un pájaro pequeño."),
      ],
      bi("Look for the one that limits the materials.", "Busca la que limita los materiales."),
      bi("Keeping rain out and letting a bird in are goals, so they are criteria. Using only the club's wood scraps is a limit, so it is a constraint.", "Proteger de la lluvia y dejar entrar a un pájaro son metas, así que son criterios. Usar solo los retazos de madera del club es un límite, así que es una restricción."),
    ),
    e(
      bi("A student is designing a phone stand for a class project. Which of these is a constraint?", "Un estudiante diseña un soporte para celular en un proyecto de la clase. ¿Cuál de estas es una restricción?"),
      bi("It must be finished by Friday.", "Debe estar terminado para el viernes."),
      [
        m("criterion-constraint-mixup", "It holds the phone upright so the screen is easy to see.", "Sostiene el celular derecho para que la pantalla se vea bien."),
        m("criterion-constraint-mixup", "It does not tip over when someone taps the screen.", "No se cae cuando alguien toca la pantalla."),
      ],
      bi("Time is one of the most common limits on a design.", "El tiempo es uno de los límites más comunes de un diseño."),
      bi("Holding the phone and not tipping over are goals, so they are criteria. The deadline limits the work, so it is a constraint.", "Sostener el celular y no caerse son metas, así que son criterios. La fecha límite limita el trabajo, así que es una restricción."),
    ),
    e(
      bi("Which of these is a constraint for a school garden watering system?", "¿Cuál de estas es una restricción para un sistema de riego del huerto escolar?"),
      bi("It must be built with less than $50 of parts.", "Debe construirse con menos de $50 en piezas."),
      [
        m("criterion-constraint-mixup", "It must water every plant each day.", "Debe regar todas las plantas cada día."),
        m("criterion-constraint-mixup", "It must turn off on its own when the soil is wet.", "Debe apagarse solo cuando la tierra esté húmeda."),
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
        m("literal-trade", "Trading extra materials with another team to finish faster", "Intercambiar materiales sobrantes con otro equipo para terminar antes"),
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
        m("ignored-constraint", "Make the walls as thick as possible so the food stays cold for the longest time.", "Hacer las paredes lo más gruesas posible para que la comida se mantenga fría el mayor tiempo."),
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
        m("thinks-one-right-answer", "So that only one of the team's designs can possibly work", "Para que solo uno de los diseños del equipo pueda funcionar"),
      ],
      bi("How would you check whether a bridge \"is strong\"?", "¿Cómo comprobarías si un puente \"es fuerte\"?"),
      bi("A precise criterion can be measured, so a test shows clearly whether the design succeeded.", "Un criterio preciso se puede medir, así que una prueba muestra con claridad si el diseño tuvo éxito."),
    ),
    e(
      bi("A prototype fails one of its tests. What is the best next step?", "Un prototipo falla una de sus pruebas. ¿Cuál es el mejor paso siguiente?"),
      bi("Find out what failed, change the design, and test it again.", "Averiguar qué falló, cambiar el diseño y volver a probarlo."),
      [
        m("thinks-failure-ends-design", "Give up on the idea.", "Abandonar la idea."),
        m("moved-goalposts", "Change the criteria so the same design passes the test next time.", "Cambiar los criterios para que el mismo diseño pase la prueba la próxima vez."),
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
        m("thinks-first-always-fails", "The first design always fails, so it must be thrown out and started over.", "El primer diseño siempre falla, así que hay que tirarlo y empezar de nuevo desde cero."),
        m("ignores-limits", "Using more materials always makes a better design.", "Usar más materiales siempre da un mejor diseño."),
      ],
      bi("Data from several tries lets you compare.", "Los datos de varios intentos te dejan comparar."),
      bi("Testing more than one design gives data to compare, so the team can choose or combine the best ideas.", "Probar más de un diseño da datos para comparar, así que el equipo puede elegir o combinar las mejores ideas."),
    ),
  ],
};
