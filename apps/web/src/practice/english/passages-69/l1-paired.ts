import { type Passage, q } from "./types";

// Level 1 paired texts: two short texts on one subject, for comparing how writers see and present it.
export const L1_PAIRED: Passage[] = [
  {
    id: "phone-pouches",
    level: 1,
    genre: "paired",
    en: [
      {
        title: "Lock Them Up",
        paras: [
          "At lunch last Tuesday, I counted. Of the twenty-four kids at the three tables near mine, seventeen were looking at a screen instead of at each other. The cafeteria used to be the loudest room in our school. Now it hums like a waiting room.",
          "Our school should require students to lock their phones in pouches from the first bell to the last. Phones pull our attention away even when we try to ignore them. In a survey I gave my homeroom, nineteen of twenty-six students admitted they had checked a phone during class when they were not supposed to. Even a phone that stays in a backpack keeps buzzing in the back of your mind.",
          "A school day without phones would give us back our focus and our friends. My cousin's school in Ohio banned phones in September, and by October everyone there had made new friends. If we lock up our phones, we will finally look up.",
        ],
      },
      {
        title: "Teach Us Instead",
        paras: [
          "I agree with one thing the phone-ban supporters say: phones do not belong in class. When my phone buzzes during science, my mind leaves the lab and goes straight to the message. Teachers are right to ask for phones to stay off and out of sight while they teach.",
          "But locking phones away all day goes too far. Many of us take a city bus home or walk to a parent's job after school, and plans change. Last month my aunt's car broke down, and she texted me at lunch so I would know to take the bus. With a locked pouch, I would have waited outside for an hour.",
          "There is a bigger reason, too. In a few years, no one will lock our phones for us. Middle school is the place to practice putting a phone away by choice. A ban does not teach that skill; it only puts off the day we need it.",
          "Keep phones off during class. Then trust us, and teach us, the rest of the time.",
        ],
      },
    ],
    es: [
      {
        title: "Que se queden guardados",
        paras: [
          "El martes pasado, en el almuerzo, me puse a contar. De los veinticuatro chicos de las tres mesas cerca de la mía, diecisiete miraban una pantalla en lugar de mirarse entre ellos. La cafetería era el lugar más ruidoso de la escuela. Ahora zumba como una sala de espera.",
          "Nuestra escuela debería exigir que los estudiantes guarden el teléfono en una funda con candado desde el primer timbre hasta el último. Los teléfonos nos roban la atención aunque intentemos ignorarlos. En una encuesta que hice en mi grupo, diecinueve de veintiséis estudiantes admitieron que habían revisado el teléfono en clase cuando no debían. Hasta un teléfono que se queda en la mochila sigue vibrando en el fondo de la mente.",
          "Un día escolar sin teléfonos nos devolvería la concentración y a los amigos. La escuela de mi primo en Ohio prohibió los teléfonos en septiembre, y para octubre todos ahí ya habían hecho amigos nuevos. Si guardamos los teléfonos, por fin vamos a levantar la vista.",
        ],
      },
      {
        title: "Mejor enséñennos",
        paras: [
          "Estoy de acuerdo con una cosa que dicen quienes apoyan la prohibición: los teléfonos no tienen lugar en la clase. Cuando mi teléfono vibra en ciencias, mi mente se sale del laboratorio y se va directo al mensaje. Los maestros tienen razón al pedir que los teléfonos estén apagados y fuera de la vista mientras enseñan.",
          "Pero guardarlos bajo candado todo el día es demasiado. Muchos tomamos el autobús de la ciudad para volver a casa o caminamos al trabajo de alguno de nuestros padres después de clases, y los planes cambian. El mes pasado, el carro de mi tía se descompuso y me mandó un mensaje en el almuerzo para que supiera que tenía que tomar el autobús. Con una funda cerrada, la habría esperado afuera una hora.",
          "Hay una razón más importante. En unos años, nadie nos va a guardar el teléfono bajo candado. La escuela intermedia es el lugar para practicar a guardarlo por decisión propia. Una prohibición no enseña esa habilidad; solo aplaza el día en que la vamos a necesitar.",
          "Que los teléfonos estén apagados en clase. Y el resto del tiempo, confíen en nosotros y enséñennos.",
        ],
      },
    ],
    qs: [
      q(
        "compare.differ",
        ["swaps-texts", "same-not-different", "not-in-text"],
        [
          "How do the two writers disagree?",
          "Text 1 wants phones locked away all day; Text 2 wants them off only during class.",
          ["Text 1 wants phones off only in class; Text 2 wants them locked up all day.", "They do not disagree; both want phones locked in pouches from the first bell to the last.", "Text 1 wants phones banned only at lunchtime; Text 2 wants them banned only while riding the bus."],
          ["Our school should require students to lock their phones in pouches from the first bell to the last.", "Keep phones off during class."],
          "Text 1 asks for pouches “from the first bell to the last.” Text 2 agrees that phones should be off in class but says a full-day ban “goes too far.”",
        ],
        [
          "¿En qué no están de acuerdo los dos autores?",
          "El texto 1 quiere los teléfonos guardados todo el día; el texto 2, solo apagados durante la clase.",
          ["El texto 1 los quiere apagados solo en clase; el texto 2, guardados todo el día.", "No hay desacuerdo: los dos quieren los teléfonos en fundas con candado desde el primer timbre hasta el último.", "El texto 1 quiere prohibirlos solo a la hora del almuerzo; el texto 2, solo mientras viajan en el autobús."],
          ["desde el primer timbre hasta el último", "Que los teléfonos estén apagados en clase."],
          "El texto 1 pide fundas “desde el primer timbre hasta el último”. El texto 2 acepta que los teléfonos estén apagados en clase, pero dice que guardarlos todo el día “es demasiado”.",
        ],
      ),
      q(
        "compare.agree",
        ["one-text-only", "one-text-only", "not-in-text"],
        [
          "On which point do both writers agree?",
          "Phones distract students during class.",
          ["Students need phones to plan their rides home.", "Phones should stay locked away during lunch.", "Teachers should collect phones at the door."],
          ["Phones pull our attention away even when we try to ignore them.", "my mind leaves the lab and goes straight to the message"],
          "Text 1 says phones “pull our attention away.” Text 2 admits that a buzzing phone pulls the writer's mind out of science class. On distraction in class, they agree.",
        ],
        [
          "¿En qué punto coinciden los dos autores?",
          "Los teléfonos distraen a los estudiantes en clase.",
          ["Los estudiantes necesitan el teléfono para organizar cómo volver a casa.", "Los teléfonos deben quedarse guardados también en el almuerzo.", "Los maestros deberían recoger los teléfonos en la puerta."],
          ["Los teléfonos nos roban la atención aunque intentemos ignorarlos.", "mi mente se sale del laboratorio y se va directo al mensaje"],
          "El texto 1 dice que los teléfonos “nos roban la atención”. El texto 2 admite que, cuando su teléfono vibra, su mente se sale de la clase de ciencias. En que distraen en clase, coinciden.",
        ],
      ),
      q(
        "compare.approach",
        ["not-in-text", "same-not-different", "not-in-text"],
        [
          "How do the writers support their positions differently?",
          "Text 1 uses counts and a survey; Text 2 uses a personal story and a reason about the future.",
          ["Text 1 uses counts and a survey; Text 2 uses a survey of its own classmates.", "Both writers rely mainly on numbers from surveys they gave to their classmates.", "Text 1 quotes a doctor; Text 2 quotes a school principal."],
          ["nineteen of twenty-six students admitted", "Last month my aunt's car broke down"],
          "Text 1 counts students at lunch and reports a homeroom survey. Text 2 tells what happened when the writer's aunt's car broke down and argues that students need practice for later.",
        ],
        [
          "¿En qué se diferencia la manera en que cada autor apoya su postura?",
          "El texto 1 usa conteos y una encuesta; el texto 2, una historia personal y una razón sobre el futuro.",
          ["El texto 1 usa conteos y una encuesta; el texto 2, otra encuesta a sus compañeros.", "Los dos se apoyan sobre todo en números de encuestas que hicieron a sus compañeros.", "El texto 1 cita a un médico; el texto 2 cita al director de la escuela."],
          ["diecinueve de veintiséis estudiantes admitieron", "el carro de mi tía se descompuso"],
          "El texto 1 cuenta a los estudiantes en el almuerzo y da una encuesta de su grupo. El texto 2 cuenta lo que pasó cuando se descompuso el carro de su tía y dice que los estudiantes necesitan practicar para después.",
        ],
      ),
      q(
        "argument.reasoning",
        ["not-a-flaw", "not-a-flaw", "not-a-flaw"],
        [
          "Which sentence in Text 1 relies on the weakest reasoning?",
          "My cousin's school in Ohio banned phones in September, and by October everyone there had made new friends.",
          ["In a survey I gave my homeroom, nineteen of twenty-six students admitted they had checked a phone during class when they were not supposed to.", "Of the twenty-four kids at the three tables near mine, seventeen were looking at a screen instead of at each other.", "Phones pull our attention away even when we try to ignore them."],
          ["by October everyone there had made new friends"],
          "One school is a single example, and the writer cannot know that “everyone” there made new friends, or that the ban was the reason. The conclusion is much bigger than the evidence.",
        ],
        [
          "¿Qué oración del texto 1 se apoya en el razonamiento más débil?",
          "La escuela de mi primo en Ohio prohibió los teléfonos en septiembre, y para octubre todos ahí ya habían hecho amigos nuevos.",
          ["En una encuesta que hice en mi grupo, diecinueve de veintiséis estudiantes admitieron que habían revisado el teléfono en clase cuando no debían.", "De los veinticuatro chicos de las tres mesas cerca de la mía, diecisiete miraban una pantalla en lugar de mirarse entre ellos.", "Los teléfonos nos roban la atención aunque intentemos ignorarlos."],
          ["para octubre todos ahí ya habían hecho amigos nuevos"],
          "Una sola escuela es un solo ejemplo, y quien escribe no puede saber que “todos” ahí hicieron amigos nuevos, ni que la prohibición fue la razón. La conclusión es mucho más grande que la evidencia.",
        ],
      ),
      q(
        "argument.claim",
        ["counterclaim-not-claim", "evidence-not-claim", "evidence-not-claim"],
        [
          "Which sentence states the main claim of Text 2?",
          "But locking phones away all day goes too far.",
          ["Our school should require students to lock their phones in pouches from the first bell to the last.", "Last month my aunt's car broke down, and she texted me at lunch so I would know to take the bus.", "Many of us take a city bus home or walk to a parent's job after school, and plans change."],
          ["But locking phones away all day goes too far."],
          "Everything else in Text 2 explains why a full-day ban goes too far. The pouch sentence is the claim of Text 1, and the bus and aunt sentences are support.",
        ],
        [
          "¿Qué oración presenta la afirmación principal del texto 2?",
          "Pero guardarlos bajo candado todo el día es demasiado.",
          ["Nuestra escuela debería exigir que los estudiantes guarden el teléfono en una funda con candado desde el primer timbre hasta el último.", "El mes pasado, el carro de mi tía se descompuso y me mandó un mensaje en el almuerzo para que supiera que tenía que tomar el autobús.", "Muchos tomamos el autobús de la ciudad para volver a casa o caminamos al trabajo de alguno de nuestros padres después de clases, y los planes cambian."],
          ["Pero guardarlos bajo candado todo el día es demasiado."],
          "Todo lo demás del texto 2 explica por qué prohibirlos todo el día es demasiado. La oración de las fundas es la afirmación del texto 1, y las del autobús y la tía son apoyo.",
        ],
      ),
    ],
  },
  {
    id: "monarch-relay",
    level: 1,
    genre: "paired",
    en: [
      {
        title: "To a Monarch on the Milkweed",
        paras: [
          "Last month you hatched behind our fence,\na striped caterpillar on a milkweed leaf,\nand now you open and close your wings\nlike a letter in orange ink, still drying.",
          "Tomorrow, they say, you will start south\nto a mountain forest you have never seen,\nthree thousand miles of wind and highway,\nwith no one to follow and no map to read.",
          "How do you know the way?\nThe last of your family to see those firs\nlived three or four lifetimes ago\nand never came back to teach you.",
          "Maybe the sun is your map.\nMaybe the way is folded up inside you\nthe way a flower is folded in a seed.\nGo on, then. I will watch the sky.",
        ],
      },
      {
        title: "The Monarchs' Long Relay",
        paras: [
          "Every fall, monarch butterflies from the eastern United States and southern Canada fly as far as 3,000 miles to spend the winter in the mountain forests of central Mexico. There they cluster by the millions on fir trees, so many that branches bend under their weight. What makes the trip remarkable is that none of the travelers has ever been there before.",
          "The reason is the monarch's short life. A monarch born in early summer lives only a few weeks. In that time it mates, lays eggs on milkweed, the only plant its caterpillars can eat, and dies. Its children do the same. But the monarchs born in late summer are different. They put off laying eggs and can live for up to eight months, long enough to fly south, survive the winter, and start back north in spring.",
          "Even then, no single butterfly finishes the round trip. The spring travelers lay eggs along the way, and it takes three or four generations to reach Canada again. The return is a relay race, and each runner covers only part of the course.",
          "How first-time travelers find the forests is still being studied. Scientists have found that monarchs use the position of the sun as a compass, and that a clock in their antennae helps them adjust for the time of day.",
        ],
      },
    ],
    es: [
      {
        title: "A una monarca en el algodoncillo",
        paras: [
          "El mes pasado naciste detrás de la cerca,\nuna oruga a rayas sobre una hoja de algodoncillo,\ny ahora abres y cierras las alas\ncomo una carta en tinta naranja, todavía fresca.",
          "Dicen que mañana empiezas el viaje al sur,\nhacia un bosque en la montaña que nunca has visto,\ntres mil millas de viento y de carretera,\nsin nadie a quien seguir y sin un mapa que leer.",
          "¿Cómo sabes el camino?\nLa última de tu familia que vio esos oyameles\nvivió hace tres o cuatro vidas\ny nunca volvió para enseñarte.",
          "Tal vez el sol sea tu mapa.\nTal vez el camino viene doblado dentro de ti\ncomo una flor viene doblada en una semilla.\nAnda, pues. Yo me quedo mirando el cielo.",
        ],
      },
      {
        title: "El relevo de las monarcas",
        paras: [
          "Cada otoño, las mariposas monarca del este de Estados Unidos y del sur de Canadá vuelan hasta 3,000 millas para pasar el invierno en los bosques de las montañas del centro de México. Allí se agrupan por millones en los oyameles, tantas que las ramas se doblan con su peso. Lo asombroso del viaje es que ninguna de las viajeras ha estado allí antes.",
          "La razón es la vida corta de la monarca. Una monarca que nace a principios del verano vive solo unas semanas. En ese tiempo se aparea, pone huevos en el algodoncillo, la única planta que pueden comer sus orugas, y muere. Sus hijas hacen lo mismo. Pero las monarcas que nacen a fines del verano son distintas. Retrasan la puesta de huevos y pueden vivir hasta ocho meses, lo suficiente para volar al sur, pasar el invierno y emprender el regreso al norte en primavera.",
          "Aun así, ninguna mariposa completa el viaje de ida y vuelta. Las viajeras de primavera ponen huevos por el camino, y se necesitan tres o cuatro generaciones para volver a Canadá. El regreso es una carrera de relevos, y cada corredora cubre solo una parte del recorrido.",
          "Cómo encuentran el bosque las que viajan por primera vez todavía se estudia. Los científicos han descubierto que las monarcas usan la posición del sol como brújula, y que un reloj en sus antenas les ayuda a ajustarse a la hora del día.",
        ],
      },
    ],
    qs: [
      q(
        "compare.differ",
        ["one-text-only", "same-not-different", "not-in-text"],
        [
          "How is the purpose of the poem different from the purpose of the article?",
          "The poem expresses wonder at one butterfly's trip; the article explains how the migration works.",
          ["Both texts mainly aim to explain the monarch's life cycle and how long each generation lives.", "Both texts mainly try to persuade readers to plant milkweed in their backyards.", "The poem warns that monarchs are disappearing; the article tells the story of a family's trip to Mexico."],
          ["How do you know the way?", "How first-time travelers find the forests is still being studied."],
          "The poem speaks to one monarch and asks how it knows the way, which shows wonder. The article gives facts about the life cycle and the research, which explains.",
        ],
        [
          "¿En qué se diferencia el propósito del poema del propósito del artículo?",
          "El poema expresa asombro por el viaje de una mariposa; el artículo explica cómo funciona la migración.",
          ["Los dos textos buscan sobre todo explicar el ciclo de vida de las monarcas y cuánto viven.", "Los dos textos buscan sobre todo convencer a los lectores de sembrar algodoncillo en su patio.", "El poema advierte que las monarcas están desapareciendo; el artículo cuenta el viaje de una familia a México."],
          ["¿Cómo sabes el camino?", "Cómo encuentran el bosque las que viajan por primera vez todavía se estudia."],
          "El poema le habla a una monarca y le pregunta cómo sabe el camino, lo que muestra asombro. El artículo da datos sobre el ciclo de vida y las investigaciones, lo que explica.",
        ],
      ),
      q(
        "compare.agree",
        ["one-text-only", "contradicts-text", "not-in-text"],
        [
          "Which idea appears in both texts?",
          "The monarchs flying south have never been to the forests before.",
          ["A clock in the monarch's antennae helps it adjust for the time of day.", "The same butterflies that fly south in the fall come back north the next summer.", "Monarchs spend the winter hiding in the forests of southern Canada."],
          ["to a mountain forest you have never seen", "none of the travelers has ever been there before"],
          "The poem calls it a forest “you have never seen,” and the article says none of the travelers “has ever been there before.” The antennae clock appears only in the article.",
        ],
        [
          "¿Qué idea aparece en los dos textos?",
          "Las monarcas que vuelan al sur nunca han estado antes en esos bosques.",
          ["Un reloj en las antenas de la monarca le ayuda a ajustarse a la hora del día.", "Las mismas mariposas que vuelan al sur en otoño regresan al norte el verano siguiente.", "Las monarcas pasan el invierno escondidas en los bosques del sur de Canadá."],
          ["hacia un bosque en la montaña que nunca has visto", "ninguna de las viajeras ha estado allí antes"],
          "El poema habla de un bosque “que nunca has visto”, y el artículo dice que ninguna de las viajeras “ha estado allí antes”. El reloj de las antenas aparece solo en el artículo.",
        ],
      ),
      q(
        "compare.approach",
        ["swaps-texts", "same-not-different", "contradicts-text"],
        [
          "How does the article's way of presenting the migration differ from the poem's?",
          "The article uses numbers and research; the poem uses images and questions.",
          ["The article uses images and questions; the poem, numbers and research.", "Both texts use only images and questions, never facts.", "The article tells the story through the butterfly's own eyes."],
          ["as far as 3,000 miles", "like a letter in orange ink, still drying"],
          "The article gives distances, life spans, and what scientists have found. The poem compares wings to a letter in orange ink and asks the butterfly how it knows the way.",
        ],
        [
          "¿En qué se diferencia la manera de presentar la migración en el artículo y en el poema?",
          "El artículo usa cifras e investigaciones; el poema usa imágenes y preguntas.",
          ["El artículo usa imágenes y preguntas; el poema, cifras e investigaciones.", "Los dos textos usan solo imágenes y preguntas, nunca datos.", "El artículo cuenta la historia desde los ojos de la mariposa."],
          ["hasta 3,000 millas", "como una carta en tinta naranja, todavía fresca"],
          "El artículo da distancias, cuánto viven las mariposas y lo que han descubierto los científicos. El poema compara las alas con una carta en tinta naranja y le pregunta a la mariposa cómo sabe el camino.",
        ],
      ),
      q(
        "pov.purpose",
        ["wrong-purpose", "contradicts-text", "not-in-text"],
        [
          "Why does the author of Text 2 explain that summer monarchs live only a few weeks?",
          "To show why the trip south needs a special generation that lives much longer.",
          ["To persuade readers to keep monarchs as pets at home so that they live longer.", "To prove that the monarchs born in early summer are the ones that fly to Mexico.", "To describe what milkweed plants look like in early summer."],
          ["But the monarchs born in late summer are different."],
          "A few weeks is far too short for a trip of thousands of miles. Explaining that first makes it clear why the late-summer monarchs, which live up to eight months, are the ones that fly south.",
        ],
        [
          "¿Por qué el autor del texto 2 explica que las monarcas del verano viven solo unas semanas?",
          "Para mostrar por qué el viaje al sur necesita una generación especial que vive mucho más.",
          ["Para convencer a los lectores de tener monarcas como mascotas en casa para que vivan más tiempo.", "Para probar que las monarcas que nacen a principios del verano son las que vuelan a México.", "Para describir cómo se ven las plantas de algodoncillo a principios del verano."],
          ["Pero las monarcas que nacen a fines del verano son distintas."],
          "Unas semanas son muy poco para un viaje de miles de millas. Explicarlo primero deja claro por qué las monarcas de fines del verano, que viven hasta ocho meses, son las que vuelan al sur.",
        ],
      ),
      q(
        "words.figurative",
        ["too-literal", "contradicts-text", "not-in-text"],
        [
          "In Text 1, the speaker says the way may be folded inside the butterfly “the way a flower is folded in a seed.” What does this comparison suggest?",
          "The monarch is born already knowing the way.",
          ["The monarch hides seeds inside its wings for the long trip.", "The monarch must first learn the route from older butterflies.", "The monarch will stop to plant flowers all along its route."],
          ["Maybe the way is folded up inside you"],
          "A seed already holds the whole flower before it grows. The speaker imagines the route stored inside the monarch from birth, since no one is there to teach it.",
        ],
        [
          "En el texto 1, la voz poética dice que el camino quizá viene doblado dentro de la mariposa “como una flor viene doblada en una semilla”. ¿Qué sugiere esta comparación?",
          "La monarca nace llevando ya lo que necesita saber.",
          ["La monarca esconde semillas en las alas para el viaje largo.", "La monarca tiene que aprender primero la ruta de mariposas mayores.", "La monarca se detiene a sembrar flores a lo largo de su ruta."],
          ["Tal vez el camino viene doblado dentro de ti"],
          "Una semilla ya guarda la flor completa antes de crecer. La voz poética imagina que la ruta está guardada dentro de la monarca desde que nace, porque nadie está ahí para enseñársela.",
        ],
      ),
    ],
  },
  {
    id: "science-fair",
    level: 1,
    genre: "paired",
    en: [
      {
        title: "Forty Bean Plants",
        paras: [
          "For six weeks, forty bean plants lived on our kitchen windowsill. Twenty of them listened to music for an hour every night through an old speaker. The other twenty sat in silence at the other end of the sill. My question was simple: would music make the plants grow faster?",
          "On the morning of the fair, I measured every plant one last time. The music group was taller, but only by about a centimeter. I had hoped for a giant difference, and I almost didn't bring my poster at all.",
          "In the gym, my table was between a robot that could sort recycling and a volcano that actually smoked. When the judges reached me, my hands were shaking so badly that I kept them in my pockets. The tall judge asked how I knew the windowsill was the same for both groups. I told her I switched the trays' places every morning so both got the same sunlight. She wrote something down and nodded.",
          "When they read my name for second place, I laughed out loud, right in the middle of the announcement. Then I remembered that a centimeter is still a difference.",
        ],
      },
      {
        title: "Robot Sorter Wins Top Prize at Science Fair",
        paras: [
          "Sixty-two projects filled the Jefferson Middle School gym on Thursday for the annual science fair. Judges from the community college spent three hours visiting every table.",
          "First place went to eighth grader Tomás Reyes for a robot that sorts plastic, metal, and paper using a color sensor. Second place went to sixth grader Priya Raman, who tested whether music helps bean plants grow. Third place went to seventh graders Grace Liu and Omar Siddiqui for a water filter made from sand and charcoal.",
          "Judge Linda Okafor said the winning projects shared one strength. “The best projects were not the flashiest ones,” she said. “They were the ones where students controlled their experiments carefully.” She pointed to Raman's project, in which the plants traded places every morning so both groups got equal light.",
          "The top three projects will move on to the regional fair in March.",
        ],
      },
    ],
    es: [
      {
        title: "Cuarenta matas de frijol",
        paras: [
          "Durante seis semanas, cuarenta matas de frijol vivieron en la ventana de nuestra cocina. Veinte escuchaban música una hora cada noche por una bocina vieja. Las otras veinte estaban en silencio al otro extremo de la ventana. Mi pregunta era sencilla: ¿la música haría que las plantas crecieran más rápido?",
          "La mañana de la feria, medí cada planta por última vez. El grupo con música era más alto, pero solo por un centímetro, más o menos. Yo esperaba una diferencia enorme, y casi no llevé mi cartel.",
          "En el gimnasio, mi mesa quedó entre un robot que separaba el reciclaje y un volcán que de verdad echaba humo. Cuando los jueces llegaron, me temblaban tanto las manos que las metí en los bolsillos. La jueza alta me preguntó cómo sabía que la ventana era igual para los dos grupos. Le dije que cada mañana cambiaba las bandejas de lugar para que las dos recibieran la misma luz. Ella anotó algo y asintió.",
          "Cuando leyeron mi nombre para el segundo lugar, solté una carcajada en plena ceremonia. Luego me acordé de que un centímetro también es una diferencia.",
        ],
      },
      {
        title: "Un robot clasificador gana el primer lugar en la feria de ciencias",
        paras: [
          "Sesenta y dos proyectos llenaron el gimnasio de la Escuela Intermedia Jefferson el jueves, en la feria de ciencias anual. Jueces del colegio comunitario pasaron tres horas visitando cada mesa.",
          "El primer lugar fue para Tomás Reyes, de octavo grado, por un robot que separa plástico, metal y papel con un sensor de color. El segundo lugar fue para Priya Raman, de sexto grado, que puso a prueba si la música ayuda a crecer a las plantas de frijol. El tercer lugar fue para Grace Liu y Omar Siddiqui, de séptimo grado, por un filtro de agua hecho con arena y carbón.",
          "La jueza Linda Okafor dijo que los proyectos ganadores tenían una fortaleza en común. “Los mejores proyectos no fueron los más llamativos”, dijo. “Fueron aquellos en los que los estudiantes controlaron sus experimentos con cuidado”. Luego señaló el proyecto de Raman, en el que las plantas cambiaban de lugar cada mañana para que los dos grupos recibieran la misma luz.",
          "Los tres primeros lugares pasarán a la feria regional en marzo.",
        ],
      },
    ],
    qs: [
      q(
        "compare.differ",
        ["not-in-text", "same-not-different", "not-in-text"],
        [
          "How is Text 1's account of the science fair different from Text 2's?",
          "Text 1 shares one student's feelings; Text 2 reports facts about the whole fair.",
          ["Text 1 tells how Priya felt; Text 2 tells how the judges and the winners felt.", "Both texts focus on the robot that won and how it was built.", "Text 1 says Priya won first place, but Text 2 says she did not place at all."],
          ["my hands were shaking so badly that I kept them in my pockets", "Sixty-two projects filled the Jefferson Middle School gym on Thursday"],
          "Text 1 is full of Priya's thoughts and nerves. Text 2 gives the number of projects, all three winners, and a judge's comments, without anyone's private feelings.",
        ],
        [
          "¿En qué se diferencia el relato de la feria del texto 1 del relato del texto 2?",
          "El texto 1 cuenta lo que sintió una estudiante; el texto 2 informa datos de toda la feria.",
          ["El texto 1 cuenta lo que sintió Priya; el texto 2, lo que sintieron jueces y ganadores.", "Los dos textos se centran en el robot ganador y en cómo se construyó.", "El texto 1 dice que Priya ganó el primer lugar, pero el texto 2 dice que no ganó nada."],
          ["me temblaban tanto las manos que las metí en los bolsillos", "Sesenta y dos proyectos llenaron el gimnasio de la Escuela Intermedia Jefferson el jueves"],
          "El texto 1 está lleno de los pensamientos y los nervios de Priya. El texto 2 da el número de proyectos, los tres ganadores y lo que dijo una jueza, sin los sentimientos de nadie.",
        ],
      ),
      q(
        "compare.agree",
        ["one-text-only", "contradicts-text", "not-in-text"],
        [
          "Which detail do both texts include?",
          "Priya's plants traded places every morning to get equal light.",
          ["Priya's hands shook so much during judging that she hid them in her pockets.", "The plants that heard music grew about ten centimeters taller than the others.", "The judges gave Priya a prize for her poster."],
          ["I switched the trays' places every morning", "the plants traded places every morning"],
          "Text 1 says Priya switched the trays every morning, and the judge in Text 2 points to the same detail. The shaking hands appear only in Text 1.",
        ],
        [
          "¿Qué detalle aparece en los dos textos?",
          "Las plantas de Priya cambiaban de lugar cada mañana para recibir la misma luz.",
          ["A Priya le temblaban tanto las manos durante la evaluación que las escondió en los bolsillos.", "Las plantas que escuchaban música crecieron unos diez centímetros más que las otras.", "Los jueces le dieron a Priya un premio por su cartel."],
          ["cada mañana cambiaba las bandejas de lugar", "las plantas cambiaban de lugar cada mañana"],
          "El texto 1 dice que Priya cambiaba las bandejas cada mañana, y la jueza del texto 2 señala el mismo detalle. Lo de las manos temblorosas aparece solo en el texto 1.",
        ],
      ),
      q(
        "compare.approach",
        ["swaps-texts", "same-not-different", "contradicts-text"],
        [
          "Text 1 is told in the first person, and Text 2 in the third person. How does this change what readers learn?",
          "Readers learn Priya's private thoughts from Text 1, and the other winners from Text 2.",
          ["Readers learn Priya's thoughts from Text 2, and the other winners from Text 1.", "Both texts let readers know what every student at the fair was thinking.", "Text 2 lets readers hear what Priya was thinking as the judges slowly walked toward her table."],
          ["I had hoped for a giant difference", "Third place went to seventh graders Grace Liu and Omar Siddiqui"],
          "Only Priya can tell us that she “hoped for a giant difference.” A reporter cannot see inside her head, but can name all three winners and quote a judge.",
        ],
        [
          "El texto 1 está contado en primera persona y el texto 2 en tercera persona. ¿Cómo cambia eso lo que aprenden los lectores?",
          "Por el texto 1 conocemos lo que Priya pensaba, y por el texto 2, a los demás ganadores.",
          ["Por el texto 2 sabemos lo que pensaba Priya, y por el texto 1, quiénes más ganaron.", "Los dos textos dejan saber lo que pensaba cada estudiante de la feria.", "El texto 2 deja oír lo que Priya pensaba mientras los jueces se acercaban poco a poco a su mesa."],
          ["Yo esperaba una diferencia enorme", "El tercer lugar fue para Grace Liu y Omar Siddiqui"],
          "Solo Priya puede contarnos que “esperaba una diferencia enorme”. Un periodista no puede ver dentro de su cabeza, pero sí nombrar a los tres ganadores y citar a una jueza.",
        ],
      ),
      q(
        "pov.reveal",
        ["off-point-evidence", "off-point-evidence", "off-point-evidence"],
        [
          "Which sentence from Text 1 best reveals how Priya felt about her results before the fair?",
          "I had hoped for a giant difference, and I almost didn't bring my poster at all.",
          ["When the judges reached me, my hands were shaking so badly that I kept them in my pockets.", "Twenty of them listened to music for an hour every night through an old speaker.", "I told her I switched the trays' places every morning so both got the same sunlight."],
          ["I almost didn't bring my poster at all"],
          "Almost leaving the poster at home shows that Priya was disappointed and doubted her project. Her shaking hands show nerves during the judging, not how she felt about her results before the fair, and the other sentences report facts.",
        ],
        [
          "¿Qué oración del texto 1 revela mejor cómo se sentía Priya con sus resultados antes de la feria?",
          "Yo esperaba una diferencia enorme, y casi no llevé mi cartel.",
          ["Cuando los jueces llegaron, me temblaban tanto las manos que las metí en los bolsillos.", "Veinte escuchaban música una hora cada noche por una bocina vieja.", "Le dije que cada mañana cambiaba las bandejas de lugar para que las dos recibieran la misma luz."],
          ["casi no llevé mi cartel"],
          "Casi dejar el cartel en casa muestra que Priya estaba decepcionada y dudaba de su proyecto. Sus manos temblorosas muestran nervios durante la evaluación, no lo que sentía por sus resultados antes de la feria, y las otras oraciones cuentan datos.",
        ],
      ),
      q(
        "infer.what",
        ["contradicts-text", "not-in-text", "overgeneralizes"],
        [
          "Why does Priya laugh out loud when her name is read?",
          "She is surprised and relieved after doubting her result.",
          ["She thinks the judges made a mistake and should have picked the volcano instead.", "She is laughing at a joke the announcer told about bean plants.", "Everyone laughs out loud when they hear their name read for a prize."],
          ["Then I remembered that a centimeter is still a difference."],
          "Priya almost left her poster at home because the difference was small. Laughing in the middle of the announcement shows surprise, and her last thought shows she now sees that her result had value.",
        ],
        [
          "¿Por qué Priya suelta una carcajada cuando leen su nombre?",
          "Está sorprendida y aliviada tras dudar de su resultado.",
          ["Cree que los jueces se equivocaron y que debieron elegir el volcán.", "Se ríe de un chiste sobre las matas de frijol que contó el presentador.", "Todo el mundo suelta una carcajada cuando oye su nombre en una premiación."],
          ["Luego me acordé de que un centímetro también es una diferencia."],
          "Priya casi deja su cartel en casa porque la diferencia era pequeña. Reírse en plena ceremonia muestra sorpresa, y su último pensamiento muestra que ahora ve que su resultado sí valía.",
        ],
      ),
    ],
  },
  {
    id: "lantern-reviews",
    level: 1,
    genre: "paired",
    en: [
      {
        title: "Review: The Lantern Keeper Shines",
        paras: [
          "The Lantern Keeper, the new animated film about a girl named Suri who tends the last lighthouse on a stormy island, is the best movie I have seen this year. The animation alone is worth the ticket. Every wave looks hand-painted, and during the storm scenes the whole theater leaned back in their seats.",
          "But the heart of the movie is Suri's friendship with Bolt, a grumpy seabird who refuses to fly. Their arguments are funny, and their final scene together is moving. At my showing, the little kids laughed at Bolt's complaints, and the grown-ups laughed at his jokes about the weather. When the lantern went dark in the last storm, the theater went completely silent.",
          "The middle drags a little, with one too many songs. Still, The Lantern Keeper is a movie for the whole family, and I would happily see it again.",
        ],
      },
      {
        title: "Review: Pretty, but Predictable",
        paras: [
          "There is no question that The Lantern Keeper is beautiful. The painted waves, the glowing lantern, and the storm clouds rolling over the island are some of the best animation I have seen.",
          "Unfortunately, the story does not match the pictures. It follows the same path as nearly every animated adventure: a lonely hero, a funny animal sidekick, a big argument in the middle, and a rescue at the end. By the second scene, I had guessed how the movie would end, and I was right about almost everything.",
          "Bolt the seabird gets a few good lines, but most of his jokes are repeated two or three times, and they were not as funny the third time. If you love animation, see it once for the art. If you want a story that surprises you, wait for something else.",
        ],
      },
    ],
    es: [
      {
        title: "Reseña: La guardiana de la luz brilla",
        paras: [
          "La guardiana de la luz, la nueva película animada sobre una niña llamada Suri que cuida el último faro de una isla tormentosa, es la mejor película que he visto este año. Solo la animación ya vale el boleto. Cada ola parece pintada a mano, y en las escenas de tormenta todo el cine se echó hacia atrás en sus asientos.",
          "Pero el corazón de la película es la amistad de Suri con Bolt, un ave marina gruñona que se niega a volar. Sus discusiones son divertidas, y su última escena juntos es conmovedora. En mi función, los niños pequeños se reían de las quejas de Bolt, y los adultos, de sus chistes sobre el clima. Cuando la luz del faro se apagó en la última tormenta, el cine quedó en completo silencio.",
          "La parte de en medio se alarga un poco, con una canción de más. Aun así, La guardiana de la luz es una película para toda la familia, y con gusto la volvería a ver.",
        ],
      },
      {
        title: "Reseña: Bonita, pero predecible",
        paras: [
          "No hay duda de que La guardiana de la luz es hermosa. Las olas pintadas, la luz brillante del faro y las nubes de tormenta que pasan sobre la isla son de la mejor animación que he visto.",
          "Por desgracia, la historia no está a la altura de las imágenes. Sigue el mismo camino que casi todas las aventuras animadas: una heroína solitaria, un animal gracioso que la acompaña, una gran pelea a la mitad y un rescate al final. Para la segunda escena ya había adivinado cómo terminaría la película, y acerté en casi todo.",
          "Bolt, el ave marina, tiene algunas frases buenas, pero la mayoría de sus chistes se repiten dos o tres veces, y la tercera vez ya no dan tanta risa. Si te encanta la animación, ve a verla una vez por el arte. Si quieres una historia que te sorprenda, espera otra cosa.",
        ],
      },
    ],
    qs: [
      q(
        "compare.differ",
        ["swaps-texts", "same-not-different", "not-in-text"],
        [
          "How do the two reviewers disagree?",
          "Text 1 finds the story moving; Text 2 finds it predictable.",
          ["Text 1 finds the story predictable; Text 2, moving.", "They do not disagree; both think the story is the weakest part and the animation the strongest.", "Text 1 dislikes the animation; Text 2 dislikes the songs."],
          ["their final scene together is moving", "By the second scene, I had guessed how the movie would end"],
          "The first reviewer calls the friendship's final scene moving. The second guessed the ending by the second scene. They agree about the pictures but not about the story.",
        ],
        [
          "¿En qué no están de acuerdo los dos críticos?",
          "Para el texto 1, la historia es conmovedora; para el texto 2, es predecible.",
          ["Para el texto 1, la historia es predecible; para el 2, conmovedora.", "No hay desacuerdo: los dos piensan que la historia es lo más débil y la animación lo más fuerte.", "Al texto 1 no le gusta la animación; al texto 2 no le gustan las canciones."],
          ["su última escena juntos es conmovedora", "Para la segunda escena ya había adivinado cómo terminaría la película"],
          "El primer crítico dice que la última escena de los amigos es conmovedora. El segundo adivinó el final desde la segunda escena. Coinciden en las imágenes, pero no en la historia.",
        ],
      ),
      q(
        "compare.agree",
        ["one-text-only", "contradicts-text", "same-not-different"],
        [
          "On which point do both reviewers agree?",
          "The animation is beautiful.",
          ["The middle of the movie has too many songs.", "Bolt's jokes get funnier each time he repeats them.", "The movie is worth seeing more than once."],
          ["Every wave looks hand-painted", "The painted waves, the glowing lantern, and the storm clouds"],
          "Both reviewers praise the painted waves. Only Text 1 complains about the songs, and Text 2 says to see the movie once, while Text 1 would see it again.",
        ],
        [
          "¿En qué punto coinciden los dos críticos?",
          "La animación es hermosa.",
          ["La parte de en medio tiene demasiadas canciones.", "Los chistes de Bolt son más graciosos cada vez que los repite.", "Vale la pena ver la película más de una vez."],
          ["Cada ola parece pintada a mano", "Las olas pintadas, la luz brillante del faro y las nubes de tormenta"],
          "Los dos críticos elogian las olas pintadas. Solo el texto 1 se queja de las canciones, y el texto 2 dice que hay que verla una vez, mientras que el texto 1 la volvería a ver.",
        ],
      ),
      q(
        "compare.approach",
        ["one-text-only", "same-not-different", "not-in-text"],
        [
          "How do the reviewers support their opinions differently?",
          "Text 1 describes how the audience reacted; Text 2 compares the plot to other films.",
          ["Both reviewers describe how the audience in the theater reacted during the storm scenes.", "Both reviewers support their opinions mainly by quoting the people who made the movie.", "Text 1 gives ticket sales; Text 2 quotes other critics."],
          ["the theater went completely silent", "It follows the same path as nearly every animated adventure"],
          "Text 1 reports laughter and a silent theater at the showing. Text 2 lists the familiar pattern the story follows, which many animated adventures share.",
        ],
        [
          "¿En qué se diferencia la manera en que cada crítico apoya su opinión?",
          "El texto 1 describe cómo reaccionó el público; el texto 2 compara la trama con otras películas.",
          ["Los dos críticos cuentan cómo reaccionó el público en la sala durante las escenas de la tormenta.", "Los dos críticos apoyan su opinión sobre todo con citas de las personas que hicieron la película.", "El texto 1 da cifras de taquilla; el texto 2 cita a otros críticos."],
          ["el cine quedó en completo silencio", "Sigue el mismo camino que casi todas las aventuras animadas"],
          "El texto 1 cuenta las risas y el silencio del cine durante la función. El texto 2 enumera el patrón conocido que sigue la historia, el mismo de muchas aventuras animadas.",
        ],
      ),
      q(
        "pov.view",
        ["overstates-view", "contradicts-text", "misses-author-stance"],
        [
          "What is the second reviewer's overall view of the movie?",
          "It is worth seeing for the art, but its story is too familiar.",
          ["It is the worst animated movie ever made, with nothing worth seeing.", "It is a perfect movie everyone should see twice.", "It is a movie for the whole family, with a moving friendship at its heart."],
          ["If you love animation, see it once for the art."],
          "The second reviewer praises the animation, says the story follows a familiar path, and recommends seeing it once for the art. The view is mixed, not all bad.",
        ],
        [
          "¿Cuál es la opinión general del segundo crítico sobre la película?",
          "Vale la pena verla por el arte, pero su historia es demasiado conocida.",
          ["Es la peor película animada de la historia y no tiene nada que valga la pena.", "Es una película perfecta que todos deberían ver dos veces.", "Es una película para toda la familia, con una amistad conmovedora en el centro."],
          ["Si te encanta la animación, ve a verla una vez por el arte."],
          "El segundo crítico elogia la animación, dice que la historia sigue un camino conocido y recomienda verla una vez por el arte. Su opinión es mixta, no del todo mala.",
        ],
      ),
      q(
        "argument.evidence",
        ["opinion-as-evidence", "off-point-evidence", "off-point-evidence"],
        [
          "Text 1 claims the movie is for the whole family. Which detail from Text 1 best supports that claim?",
          "Little kids laughed at Bolt's complaints, and grown-ups laughed at his jokes.",
          ["The reviewer calls it the best movie of the year.", "The middle of the movie has one too many songs.", "Every wave in the movie looks hand-painted."],
          ["The Lantern Keeper is a movie for the whole family"],
          "A movie for the whole family should work for children and adults. Both age groups laughing at the same showing supports that. Calling it the best movie is only an opinion.",
        ],
        [
          "El texto 1 afirma que la película es para toda la familia. ¿Qué detalle del texto 1 apoya mejor esa afirmación?",
          "Los niños pequeños se reían de las quejas de Bolt, y los adultos, de sus chistes.",
          ["Quien escribe dice que es la mejor película del año.", "La parte de en medio tiene una canción de más.", "Cada ola de la película parece pintada a mano."],
          ["La guardiana de la luz es una película para toda la familia"],
          "Una película para toda la familia debe funcionar para niños y adultos. Que los dos grupos se rieran en la misma función lo apoya. Decir que es la mejor película es solo una opinión.",
        ],
      ),
    ],
  },
];
