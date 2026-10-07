import type { CatalogueEntry } from "./types";

const celulasEs: CatalogueEntry = {
  id: "science-cells-es",
  title: "Células: las partes de la vida",
  summary: "Todo ser vivo está hecho de células. Mira por dentro las células vegetales y animales, descubre qué hace cada parte y sigue cómo las células forman un cuerpo entero.",
  subject: "science",
  grade: "6",
  locale: "es",
  lessons: [
    {
      id: "made-of-cells",
      title: "Todo lo vivo está hecho de células",
      summary: "Qué es una célula, qué tan pequeñas son las células y las tres ideas de la teoría celular.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "La unidad de la vida",
          blocks: [
            {
              type: "text",
              text: "Una célula es la unidad más pequeña capaz de hacer todo lo que hace un ser vivo: tomar alimento, liberar energía, deshacerse de desechos, crecer y formar células nuevas.",
            },
            {
              type: "text",
              text: "Algunos seres vivos son una sola célula. Otros, como tú, están formados por muchas células que trabajan juntas. Tu cuerpo tiene decenas de billones de ellas.",
            },
            {
              type: "points",
              items: ["Unicelulares (de una sola célula): las bacterias, la levadura, una ameba.", "Pluricelulares (de muchas células): las plantas, los animales, los hongos como el champiñón."],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "La teoría celular",
          blocks: [
            {
              type: "text",
              text: "En 1665, Robert Hooke miró una lámina muy delgada de corcho con uno de los primeros microscopios. Vio filas de cajitas diminutas y las llamó células.",
            },
            {
              type: "text",
              text: "Durante los dos siglos siguientes, quienes estudiaban plantas, animales y microbios encontraron células en todas partes. Lo que descubrieron se resume en la teoría celular:",
            },
            {
              type: "points",
              items: [
                "Todos los seres vivos están formados por una o más células.",
                "La célula es la unidad básica de estructura y función de los seres vivos.",
                "Toda célula proviene de otra célula que ya existía.",
              ],
            },
            {
              type: "text",
              text: "Las células de corcho que vio Hooke estaban muertas, así que solo vio sus paredes vacías. Las células vivas están llenas de partes. De eso trata la próxima lección.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "¿Una célula o muchas?",
          prompt: "Clasifica cada ser vivo. ¿Es una sola célula o está formado por muchas células?",
          widget: {
            kind: "sorter",
            categories: ["Una célula", "Muchas células"],
            items: [
              { id: "bacterium", text: "Una bacteria", answer: 0 },
              { id: "yeast", text: "Una célula de levadura, la que hace crecer la masa del pan", answer: 0 },
              { id: "amoeba", text: "Una ameba en el agua de un estanque", answer: 0 },
              { id: "oak", text: "Un roble", answer: 1 },
              { id: "mushroom", text: "Un champiñón", answer: 1 },
              { id: "spider", text: "Una araña", answer: 1 },
              { id: "you", text: "Tú", answer: 1 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Demasiado pequeñas para verlas",
          blocks: [
            {
              type: "text",
              text: "Casi todas las células son demasiado pequeñas para verlas a simple vista. Se miden en micrómetros (µm). Un milímetro tiene 1000 micrómetros.",
            },
            {
              type: "points",
              items: [
                "Una bacteria típica: mide unos pocos micrómetros de largo.",
                "Un glóbulo rojo humano: mide unos 8 micrómetros de ancho.",
                "Un óvulo humano: mide unos 100 micrómetros, una de las pocas células que apenas se ven como un puntito.",
              ],
            },
            {
              type: "text",
              text: "Un microscopio óptico puede hacer que las células se vean hasta unas 1000 veces más grandes. Las células se descubrieron solo después de que se inventó el microscopio.",
            },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Células en un milímetro",
          prompt:
            "Imagina células de 10 micrómetros de ancho cada una, puestas una junto a otra. Un milímetro tiene 1000 micrómetros. ¿Cuántas de estas células caben a lo largo de 1 milímetro? Mueve el marcador a tu respuesta.",
          widget: { kind: "number-line", min: 0, max: 200, step: 10, start: 0, target: 100 },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "¿Cuál de estos no está hecho de células?",
              choices: ["Un champiñón", "Un grano de arena", "Una bacteria", "Una hoja de pasto"],
              answer: 1,
              hint: "¿Estuvo vivo alguna vez? ¿Puede crecer y formar más de sí mismo?",
              explain:
                "La arena es roca desmenuzada. Nunca estuvo viva, así que no está hecha de células. Los champiñones, las bacterias y el pasto son seres vivos, así que sí están hechos de células.",
            },
            {
              id: "q2",
              prompt: "Una bacteria es una sola célula. ¿Qué nos dice eso?",
              choices: ["Que en realidad no está viva.", "Que una sola célula puede hacer todo lo que necesita un ser vivo.", "Que tiene que ser parte de un ser vivo más grande."],
              answer: 1,
              hint: "La teoría celular dice que la célula es la unidad básica de la vida.",
              explain: "Un ser vivo unicelular toma alimento, libera energía, elimina desechos, crece y se divide, todo dentro de una sola célula.",
            },
            {
              id: "q3",
              prompt: "¿De dónde salen las células nuevas?",
              choices: ["De células que ya existían", "De materiales sin vida, como el polvo", "Del alimento, que se convierte en células"],
              answer: 0,
              hint: "Piensa en la tercera idea de la teoría celular.",
              explain: "Toda célula proviene de otra célula. Una célula crece, copia sus instrucciones y se divide en dos.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Un milímetro de células",
          brief: "Date una idea de lo pequeñas que son las células. Necesitas una regla, un lápiz y una hoja.",
          steps: [
            "Busca las marcas de milímetros en la regla. Dibuja una línea que mida exactamente 1 milímetro.",
            "Recuerda: en esa línea diminuta cabrían unas 100 células de 10 micrómetros de ancho.",
            "Mide el ancho de tu uña en milímetros. Multiplica por 100 para calcular cuántas de esas células cabrían de lado a lado.",
            "Haz lo mismo con el largo de tu pulgar. Anota las dos estimaciones.",
            "Explícale a alguien en casa por qué Hooke necesitó un microscopio para descubrir las células.",
          ],
        },
      ],
    },
    {
      id: "cell-parts",
      title: "Dentro de una célula",
      summary: "Las partes principales de una célula y la función de cada una.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Partes con funciones",
          blocks: [
            {
              type: "text",
              text: "Una célula no es una bolsa vacía. Está llena de partes, y cada parte tiene una función. Muchas de estas partes pequeñas se llaman orgánulos (o también organelos).",
            },
            {
              type: "points",
              items: [
                "Membrana celular: un borde delgado y flexible alrededor de la célula. Controla lo que entra y lo que sale.",
                "Citoplasma: el líquido espeso, parecido a una gelatina, que llena la célula. Las demás partes flotan en él.",
                "Núcleo: guarda el ADN de la célula, las instrucciones de todo lo que hace.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Energía, construcción y almacén",
          blocks: [
            {
              type: "points",
              items: [
                "Mitocondrias: liberan la energía del azúcar para que la célula pueda usarla.",
                "Ribosomas: partes diminutas que fabrican proteínas siguiendo las instrucciones del ADN.",
                "Vacuolas: bolsitas que guardan agua, alimento y desechos.",
              ],
            },
            {
              type: "text",
              text: "Las proteínas hacen buena parte del trabajo de la célula: ayudan a construir sus estructuras y aceleran sus reacciones químicas.",
            },
            { type: "text", text: "Las células que gastan mucha energía, como las de los músculos, tienen muchas mitocondrias." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "¿Qué parte lo hace?",
          prompt: "Clasifica cada función. ¿Qué parte de la célula la cumple?",
          widget: {
            kind: "sorter",
            categories: ["Núcleo", "Membrana celular", "Mitocondrias", "Ribosomas"],
            items: [
              { id: "dna", text: "Guarda el ADN", answer: 0 },
              { id: "directs", text: "Dirige lo que hace la célula", answer: 0 },
              { id: "gate", text: "Deja pasar algunas sustancias y frena otras", answer: 1 },
              { id: "border", text: "Forma el borde flexible de la célula", answer: 1 },
              { id: "energy", text: "Libera la energía del azúcar", answer: 2 },
              { id: "proteins", text: "Fabrica proteínas", answer: 3 },
              { id: "follows", text: "Sigue las instrucciones del ADN para armar proteínas", answer: 3 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "La respiración celular",
          blocks: [
            {
              type: "text",
              text: "Las mitocondrias usan oxígeno para descomponer el azúcar. Así liberan energía que la célula puede usar, y quedan dióxido de carbono y agua como desechos. A este proceso se le llama respiración celular.",
            },
            { type: "text", text: "azúcar + oxígeno → dióxido de carbono + agua + energía" },
            {
              type: "text",
              text: "Por eso inhalas oxígeno y exhalas dióxido de carbono: tus células necesitan lo primero y producen lo segundo.",
            },
          ],
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "¿Qué parte controla lo que entra y sale de la célula?",
              choices: ["El núcleo", "La membrana celular", "Un ribosoma", "Una vacuola"],
              answer: 1,
              hint: "Piensa en el borde que rodea la célula.",
              explain: "La membrana celular es el borde. Deja pasar algunas sustancias, como el oxígeno y el agua, y frena otras.",
            },
            {
              id: "q2",
              prompt: "Las células de los músculos gastan mucha energía. ¿De qué parte esperarías que tuvieran muchas?",
              choices: ["Vacuolas", "Mitocondrias", "Paredes celulares"],
              answer: 1,
              hint: "¿Qué parte libera la energía del azúcar?",
              explain:
                "Las mitocondrias liberan la energía del azúcar, así que las células que trabajan mucho, como las musculares, tienen muchas. Las células animales no tienen pared celular.",
            },
            {
              id: "q3",
              prompt: "¿Por qué exhalas dióxido de carbono?",
              choices: [
                "Porque tus pulmones lo fabrican con el aire.",
                "Porque tus células lo producen cuando sus mitocondrias liberan la energía del azúcar.",
                "Porque llega con la comida y pasa de largo.",
              ],
              answer: 1,
              hint: "Mira el lado derecho de la ecuación de la respiración celular.",
              explain: "La respiración celular en tus mitocondrias produce dióxido de carbono como desecho. La sangre lo lleva a los pulmones y lo exhalas.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Una célula en una bolsa",
          brief: "Arma un modelo de célula con cosas de la cocina. Necesitas una bolsa con cierre, gelatina transparente o gel para el cabello, y objetos pequeños para las partes.",
          steps: [
            "La bolsa es la membrana celular. Llénala hasta la mitad con el gel: ese es el citoplasma.",
            "Agrega algo grande y redondo, como una ciruela o una pelota de ping-pong, para el núcleo.",
            "Agrega unos frijoles para las mitocondrias y una pizca de chispas de colores o semillas para los ribosomas.",
            "Agrega una uva o un globo pequeño con agua para una vacuola, y cierra la bolsa.",
            "Haz una clave con el nombre y la función de cada parte. Explica tu modelo a alguien en casa y di en qué no se parece a una célula real.",
          ],
        },
      ],
    },
    {
      id: "plant-animal",
      title: "Células vegetales y células animales",
      summary: "Lo que comparten, las tres partes que solo tienen las células vegetales y una prueba justa con tiras de papa.",
      minutes: 16,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Lo que comparten",
          blocks: [
            {
              type: "text",
              text: "Las células vegetales y las animales tienen las mismas partes básicas: membrana celular, citoplasma, núcleo, mitocondrias y ribosomas.",
            },
            {
              type: "text",
              text: "Las células vegetales también tienen mitocondrias. Las plantas fabrican su propio azúcar, y sus mitocondrias liberan la energía que guarda, igual que las tuyas.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Tres partes de más",
          blocks: [
            {
              type: "points",
              items: [
                "Pared celular: una capa rígida por fuera de la membrana, hecha sobre todo de celulosa. Sostiene la célula y le da forma de caja.",
                "Cloroplastos: partes verdes que usan la energía de la luz del sol para fabricar azúcar. Eso es la fotosíntesis.",
                "Una vacuola central grande: una bolsa de agua que puede ocupar casi toda la célula. Cuando está llena, empuja hacia afuera y mantiene firme a la planta.",
              ],
            },
            {
              type: "text",
              text: "No todas las células vegetales tienen cloroplastos. Las de la raíz crecen en la oscuridad de la tierra y casi todas carecen de ellos. Pero sí tienen pared celular.",
            },
            { type: "text", text: "Las células animales no tienen pared celular ni cloroplastos. Si tienen vacuolas, son pequeñas." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "¿Solo vegetal, o las dos?",
          prompt: "Clasifica cada parte. ¿Está solo en las células vegetales, o en las vegetales y en las animales?",
          widget: {
            kind: "sorter",
            categories: ["Solo células vegetales", "Las dos"],
            items: [
              { id: "wall", text: "Pared celular", answer: 0 },
              { id: "chloroplast", text: "Cloroplastos", answer: 0 },
              { id: "vacuole", text: "Una vacuola central grande", answer: 0 },
              { id: "nucleus", text: "Núcleo", answer: 1 },
              { id: "membrane", text: "Membrana celular", answer: 1 },
              { id: "mito", text: "Mitocondrias", answer: 1 },
              { id: "ribosomes", text: "Ribosomas", answer: 1 },
              { id: "cytoplasm", text: "Citoplasma", answer: 1 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Las bacterias son más sencillas",
          blocks: [
            { type: "text", text: "Las bacterias también son células, pero más sencillas. No tienen núcleo: su ADN está suelto en el citoplasma." },
            {
              type: "points",
              items: [
                "Tienen membrana celular, citoplasma y ribosomas.",
                "La mayoría también tiene pared celular, aunque no está hecha de celulosa.",
                "No tienen mitocondrias ni cloroplastos.",
              ],
            },
          ],
        },
        {
          id: "s5",
          kind: "slide",
          title: "Una prueba justa con células vegetales",
          blocks: [
            {
              type: "text",
              text: "El agua entra y sale de las células a través de la membrana. En agua muy salada, las células vegetales pierden agua y se ablandan. En agua dulce, se mantienen firmes.",
            },
            {
              type: "text",
              text: "Puedes comprobarlo con tiras de papa, pero solo si la prueba es justa. Una prueba justa cambia una sola cosa a propósito y mantiene todo lo demás igual.",
            },
            {
              type: "points",
              items: [
                "Variable independiente: lo único que cambias a propósito. Aquí, con sal o sin sal.",
                "Variable dependiente: lo que mides para ver el efecto. Aquí, cuánto se dobla cada tira.",
                "Variables controladas: todo lo que mantienes igual, como el tamaño de las tiras, la cantidad de agua y el tiempo en remojo.",
              ],
            },
          ],
        },
        {
          id: "s6",
          kind: "interactive",
          title: "Ordena las variables",
          prompt: "En la prueba de la papa, un vaso tiene agua salada y el otro agua dulce. Clasifica cada cosa: ¿se cambia a propósito, se mide o se mantiene igual?",
          widget: {
            kind: "sorter",
            categories: ["Se cambia a propósito", "Se mide", "Se mantiene igual"],
            items: [
              { id: "salt", text: "Si el agua tiene sal o no", answer: 0 },
              { id: "bend", text: "Cuánto se dobla cada tira", answer: 1 },
              { id: "length", text: "El largo de cada tira de papa", answer: 2 },
              { id: "water", text: "La cantidad de agua en cada vaso", answer: 2 },
              { id: "time", text: "El tiempo que las tiras pasan en remojo", answer: 2 },
              { id: "potato", text: "El tipo de papa", answer: 2 },
            ],
          },
        },
        {
          id: "s7",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "Una célula tiene pared celular, cloroplastos y una vacuola central grande. ¿Qué tipo de célula es?",
              choices: ["Una célula animal", "Una célula vegetal", "Una bacteria"],
              answer: 1,
              hint: "¿Las células animales tienen alguna de esas tres partes?",
              explain:
                "Los cloroplastos, la pared celular y la vacuola central grande juntos indican una célula vegetal. Las células animales no tienen ninguna de esas partes, y las bacterias no tienen cloroplastos.",
            },
            {
              id: "q2",
              prompt: "¿Las células vegetales tienen mitocondrias?",
              choices: ["No, los cloroplastos hacen ese trabajo.", "Sí, para liberar la energía del azúcar que fabrican.", "Solo las células de las hojas."],
              answer: 1,
              hint: "Fabricar azúcar y liberar su energía son dos trabajos distintos.",
              explain: "Los cloroplastos fabrican azúcar y las mitocondrias liberan la energía que guarda. Las células de las hojas, los tallos y las raíces tienen mitocondrias.",
            },
            {
              id: "q3",
              prompt: "Maya deja una tira de papa en agua salada durante 1 hora y otra en agua dulce toda la noche. ¿Por qué no es una prueba justa?",
              choices: ["Porque usó papas en vez de zanahorias.", "Porque cambió dos cosas: la sal y el tiempo en remojo.", "Porque midió cuánto se doblan las tiras."],
              answer: 1,
              hint: "Cuenta cuántas cosas son distintas entre los dos vasos.",
              explain: "Una prueba justa cambia una sola cosa. Si el tiempo también es distinto, Maya no puede saber si la diferencia la causó la sal o el tiempo.",
            },
          ],
        },
        {
          id: "s8",
          kind: "project",
          title: "La prueba de las tiras de papa",
          brief: "Haz la prueba justa de esta lección. Necesitas una papa, dos vasos, sal, agua y una persona adulta que corte las tiras.",
          steps: [
            "Pide a una persona adulta que corte dos tiras de papa del mismo tamaño, más o menos del largo y el grosor de tu dedo.",
            "Pon la misma cantidad de agua en los dos vasos. Disuelve 2 cucharadas grandes de sal en uno de ellos. Ponles etiqueta.",
            "Mete una tira en cada vaso al mismo tiempo. Espera 1 hora.",
            "Saca las tiras y dobla cada una con cuidado. Anota cuál se dobla más.",
            "Explica tu resultado con las células: ¿en qué tira perdieron agua las células?",
          ],
        },
      ],
    },
    {
      id: "cells-to-organisms",
      title: "De las células a un cuerpo entero",
      summary: "Cómo las células se especializan y se agrupan en tejidos, órganos y sistemas de órganos.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Células con trabajos especiales",
          blocks: [
            { type: "text", text: "En un ser vivo pluricelular, las células se especializan. Cada tipo de célula está hecho para un trabajo principal." },
            {
              type: "points",
              items: [
                "Los glóbulos rojos son discos pequeños que llevan oxígeno. En las personas, pierden el núcleo al madurar, y así les queda más espacio para llevar oxígeno.",
                "Las células nerviosas, o neuronas, tienen ramas largas que llevan señales. Algunas van desde la parte baja de la espalda hasta el pie.",
                "Las células musculares pueden acortarse, o contraerse, para jalar de los huesos y mover el cuerpo.",
                "Los pelos absorbentes de la raíz son células con una prolongación larga y delgada que toma agua de la tierra.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Niveles de organización",
          blocks: [
            {
              type: "points",
              items: [
                "Célula: la unidad básica, como una célula muscular.",
                "Tejido: un grupo de células parecidas que hacen el mismo trabajo, como el tejido muscular.",
                "Órgano: varios tejidos que trabajan juntos, como el corazón, que tiene tejido muscular, nervioso y de otros tipos.",
                "Sistema de órganos: órganos que trabajan juntos, como el sistema circulatorio: el corazón, los vasos sanguíneos y la sangre.",
                "Organismo: el ser vivo completo, formado por sistemas que trabajan juntos.",
              ],
            },
            { type: "text", text: "Las plantas también tienen estos niveles. Una hoja es un órgano formado por varios tipos de tejido." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "¿Qué nivel es?",
          prompt: "Clasifica cada ejemplo. ¿Es una célula, un tejido, un órgano o un sistema de órganos?",
          widget: {
            kind: "sorter",
            categories: ["Célula", "Tejido", "Órgano", "Sistema de órganos"],
            items: [
              { id: "nerve", text: "Una neurona", answer: 0 },
              { id: "rbc", text: "Un glóbulo rojo", answer: 0 },
              { id: "muscle", text: "Una capa de células musculares parecidas en tu brazo", answer: 1 },
              { id: "heart", text: "El corazón", answer: 2 },
              { id: "stomach", text: "El estómago", answer: 2 },
              { id: "leaf", text: "Una hoja", answer: 2 },
              { id: "digestive", text: "El sistema digestivo", answer: 3 },
              { id: "circulatory", text: "El corazón, los vasos sanguíneos y la sangre trabajando juntos", answer: 3 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Los sistemas trabajan en equipo",
          blocks: [
            { type: "text", text: "Los sistemas de órganos dependen unos de otros. Cuando corres, tus células musculares necesitan más energía." },
            {
              type: "points",
              items: [
                "Tu sistema respiratorio toma más oxígeno.",
                "Tu sistema circulatorio lleva oxígeno y azúcar a las células musculares más rápido.",
                "En las células musculares, las mitocondrias liberan energía y producen dióxido de carbono, que la sangre lleva de vuelta a los pulmones.",
              ],
            },
            { type: "text", text: "Cada nivel depende del nivel de abajo. Un cuerpo sano necesita células sanas que funcionen bien." },
          ],
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "¿Qué lista va de lo más pequeño a lo más grande?",
              choices: [
                "Célula, tejido, órgano, sistema de órganos, organismo",
                "Tejido, célula, órgano, organismo, sistema de órganos",
                "Órgano, tejido, célula, sistema de órganos, organismo",
              ],
              answer: 0,
              hint: "Primero se juntan células parecidas.",
              explain: "Las células forman tejidos, los tejidos forman órganos, los órganos forman sistemas y los sistemas forman un organismo.",
            },
            {
              id: "q2",
              prompt: "El estómago está formado por tejido muscular, tejido nervioso y el tejido que lo recubre por dentro, trabajando juntos. ¿Qué nivel es el estómago?",
              choices: ["Un tejido", "Un órgano", "Un sistema de órganos"],
              answer: 1,
              hint: "¿Es un solo tipo de tejido, o varios tipos que trabajan juntos?",
              explain: "Varios tejidos que trabajan juntos forman un órgano. El estómago es uno de los órganos del sistema digestivo.",
            },
            {
              id: "q3",
              prompt: "¿Por qué una neurona tiene ramas largas?",
              choices: ["Para guardar agua", "Para llevar señales a larga distancia", "Para fabricar azúcar con la luz del sol"],
              answer: 1,
              hint: "La forma de una célula va con su trabajo. ¿Cuál es el trabajo de una neurona?",
              explain: "Las neuronas llevan señales. Sus ramas largas permiten que una sola célula conecte partes lejanas del cuerpo, como la columna y el pie.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "El mapa de un sistema",
          brief: "Elige un sistema de órganos y haz su mapa, desde el cuerpo entero hasta sus células. Necesitas papel y lápiz.",
          steps: [
            "Elige un sistema: digestivo, circulatorio, respiratorio o muscular.",
            "Escribe dos órganos de tu sistema y lo que hace cada uno.",
            "Para uno de esos órganos, nombra un tejido que tenga.",
            "Nombra un tipo de célula de ese tejido y explica cómo su forma o sus partes van con su trabajo.",
            "Dibuja tu mapa como una escalera de la célula al organismo y explícaselo a alguien en casa.",
          ],
        },
      ],
    },
  ],
};

export { practice } from "./science-cells";

export default celulasEs;
