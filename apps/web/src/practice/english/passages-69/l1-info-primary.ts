import { type Passage, q } from "./types";

// Level 1 informational articles (continued) and imagined historical documents.
export const L1_INFO_PRIMARY: Passage[] = [
  {
    id: "leaf-color",
    level: 1,
    genre: "informational",
    structure: {
      kind: "cause-effect",
      en: [["because", "As a result", "a different cause", "leads to"], "The passage explains what causes each fall color: the loss of green chlorophyll reveals yellows and oranges, and new pigments made in the fall cause the reds."],
      es: [["porque", "Como resultado", "otra causa", "provoca"], "El texto explica qué causa cada color del otoño: al perderse la clorofila verde aparecen los amarillos y naranjas, y los pigmentos nuevos que se fabrican en otoño causan los rojos."],
    },
    en: [
      {
        title: "Why Leaves Change Color",
        paras: [
          "Every autumn, the forests of New England, the upper Midwest, and many other places turn red, orange, and gold. The color change can look like magic, but it has a clear scientific explanation, and it begins with the green that leaves wear all summer.",
          "Leaves are green because they are packed with chlorophyll, a pigment that captures energy from sunlight so the tree can make sugar from water and carbon dioxide. Chlorophyll breaks down quickly in bright light, so during the growing season the tree keeps making more. As long as it does, the green covers up every other color in the leaf.",
          "In autumn, nights grow longer and temperatures drop. These changes signal the tree to prepare for winter, when its thin leaves would freeze and be useless. As a result, the tree slowly stops making chlorophyll and begins to seal off each leaf where its stem meets the branch. As the green fades, yellow and orange pigments called carotenoids, which were in the leaf all along, finally show through.",
          "Reds and purples have a different cause. In some trees, such as red maples and sugar maples, sugar trapped in the leaves is turned into new pigments called anthocyanins. Because these pigments are made in the fall, the weather matters. A run of sunny days and cool, but not freezing, nights tends to produce the brightest reds. A warm, cloudy autumn often leads to duller colors.",
          "Eventually, the sealed-off leaf breaks free and falls. The bare tree saves its energy through the winter, and in spring it grows a fresh set of leaves. Then the cycle begins again.",
        ],
      },
    ],
    es: [
      {
        title: "¿Por qué cambian de color las hojas?",
        paras: [
          "Cada otoño, los bosques de Nueva Inglaterra, del norte del Medio Oeste y de muchos otros lugares se pintan de rojo, naranja y dorado. El cambio de color puede parecer magia, pero tiene una explicación científica clara, y empieza con el verde que tienen las hojas todo el verano.",
          "Las hojas son verdes porque están llenas de clorofila, un pigmento que capta la energía del sol para que el árbol pueda fabricar azúcar a partir de agua y dióxido de carbono. La clorofila se descompone rápido con la luz intensa, así que durante la temporada de crecimiento el árbol fabrica más sin parar. Mientras lo hace, el verde tapa todos los demás colores de la hoja.",
          "En otoño, las noches se alargan y las temperaturas bajan. Estos cambios le indican al árbol que debe prepararse para el invierno, cuando sus hojas delgadas se congelarían y ya no le servirían. Como resultado, el árbol deja poco a poco de fabricar clorofila y empieza a sellar cada hoja en el punto donde el tallo se une a la rama. Al desaparecer el verde, por fin se asoman unos pigmentos amarillos y anaranjados llamados carotenoides, que estuvieron en la hoja todo el tiempo.",
          "Los rojos y los morados tienen otra causa. En algunos árboles, como el arce rojo y el arce azucarero, el azúcar atrapado en las hojas se convierte en pigmentos nuevos llamados antocianinas. Como estos pigmentos se fabrican en otoño, el clima importa. Una racha de días soleados y noches frescas, pero sin helada, suele producir los rojos más intensos. Un otoño cálido y nublado a menudo provoca colores más apagados.",
          "Con el tiempo, la hoja sellada se desprende y cae. El árbol, ya sin hojas, ahorra energía durante el invierno, y en primavera le sale un juego nuevo de hojas. Luego el ciclo vuelve a empezar.",
        ],
      },
    ],
    qs: [
      q(
        "structure.section",
        ["contradicts-text", "wrong-section-role", "wrong-section-role"],
        [
          "Why does the author explain chlorophyll in paragraph 2, before describing the fall colors?",
          "Readers need to know what keeps leaves green to understand why the green fades.",
          ["To show that chlorophyll is the pigment that turns maple leaves bright red in the fall.", "To describe the weather that produces the brightest colors.", "To explain how the tree seals off each leaf before it falls."],
          ["As long as it does, the green covers up every other color in the leaf."],
          "Paragraph 2 explains that chlorophyll hides the other colors. That sets up paragraph 3, where the chlorophyll fades and the hidden colors appear.",
        ],
        [
          "¿Por qué el autor explica la clorofila en el párrafo 2, antes de describir los colores del otoño?",
          "Hay que saber qué mantiene verdes las hojas para entender por qué se pierde el verde.",
          ["Para mostrar que la clorofila es el pigmento que pinta de rojo intenso las hojas del arce en otoño.", "Para describir el clima que produce los colores más intensos.", "Para explicar cómo el árbol sella cada hoja antes de que caiga."],
          ["Mientras lo hace, el verde tapa todos los demás colores de la hoja."],
          "El párrafo 2 explica que la clorofila esconde los otros colores. Eso prepara el párrafo 3, donde la clorofila desaparece y se ven los colores escondidos.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "contradicts-text"],
        [
          "What is the central idea of the passage?",
          "Fall colors appear as trees stop making chlorophyll before winter.",
          ["Sugar maples can turn a very bright red in the fall.", "Plants depend on sunlight to survive.", "Leaves change color because cold weather freezes them and damages the green parts."],
          ["the tree slowly stops making chlorophyll"],
          "The passage explains that when the tree stops making chlorophyll, hidden yellows show through, and some trees make new reds.",
        ],
        [
          "¿Cuál es la idea central del texto?",
          "El otoño se pinta de colores cuando los árboles dejan de fabricar clorofila.",
          ["El arce azucarero puede ponerse de un rojo muy intenso en otoño, sobre todo si hace sol.", "Las plantas dependen de la luz del sol para sobrevivir.", "Las hojas cambian de color porque el frío las congela y daña primero sus partes verdes."],
          ["el árbol deja poco a poco de fabricar clorofila"],
          "El texto explica que cuando el árbol deja de fabricar clorofila se asoman los amarillos escondidos, y algunos árboles fabrican rojos nuevos.",
        ],
      ),
      q(
        "infer.what",
        ["contradicts-text", "not-in-text", "overgeneralizes"],
        [
          "Why might the same maple tree look brighter red one fall than the next?",
          "That fall had more sunny days and cool nights, so the leaves made more red pigment.",
          ["The tree made more chlorophyll that year, so the leaves stayed green much longer than usual.", "The tree is older now, so its leaves have grown larger.", "A maple tree always turns exactly the same shade every year."],
          ["A run of sunny days and cool, but not freezing, nights tends to produce the brightest reds."],
          "Red pigments are made in the fall, so the fall weather matters. Sunny days and cool nights lead to brighter reds than a warm, cloudy fall.",
        ],
        [
          "¿Por qué el mismo arce podría verse de un rojo más intenso un otoño que el siguiente?",
          "Ese otoño tuvo más días soleados y noches frescas, así que las hojas fabricaron más pigmento rojo.",
          ["Ese año el árbol fabricó más clorofila, así que las hojas siguieron verdes mucho más tiempo de lo normal.", "El árbol ya es más viejo, así que sus hojas crecieron más.", "Un arce siempre se pone exactamente del mismo tono cada año."],
          ["Una racha de días soleados y noches frescas, pero sin helada, suele producir los rojos más intensos."],
          "Los pigmentos rojos se fabrican en otoño, así que el clima del otoño importa. Los días soleados y las noches frescas dan rojos más intensos que un otoño cálido y nublado.",
        ],
      ),
      q(
        "words.connotation",
        ["too-literal", "opposite-tone", "contradicts-text"],
        [
          "In paragraph 1, the author says the color change “can look like magic.” Why include this phrase?",
          "To admit how amazing the colors seem before showing that science explains them.",
          ["To tell readers that the fall colors are really caused by a kind of forest magic.", "To suggest that the color change is boring and ordinary.", "To show that scientists still cannot explain the colors."],
          ["The color change can look like magic, but it has a clear scientific explanation"],
          "The author agrees the colors seem magical, then says “but” and gives the science. The phrase draws readers in before the explanation.",
        ],
        [
          "En el párrafo 1, el texto dice que el cambio de color “puede parecer magia”. ¿Para qué incluye el autor esta frase?",
          "Para reconocer lo asombrosos que parecen los colores antes de mostrar que la ciencia los explica.",
          ["Para decirles a los lectores que los colores en realidad los causa una especie de magia del bosque.", "Para sugerir que el cambio de color es aburrido y común.", "Para mostrar que los científicos todavía no pueden explicar los colores."],
          ["El cambio de color puede parecer magia, pero tiene una explicación científica clara"],
          "El autor acepta que los colores parecen mágicos, luego dice “pero” y da la explicación científica. La frase atrapa al lector antes de la explicación.",
        ],
      ),
    ],
  },
  {
    id: "heat-island",
    level: 1,
    genre: "informational",
    structure: {
      kind: "problem-solution",
      en: [["The problem", "One solution", "Another solution", "fixes"], "The passage explains a problem, cities that trap extra heat, and then describes three ways to cool them."],
      es: [["El problema", "Una solución", "Otra solución", "soluciones"], "El texto explica un problema, las ciudades que atrapan calor extra, y luego describe tres maneras de refrescarlas."],
    },
    en: [
      {
        title: "Cooling Down a Hot City",
        paras: [
          "On a summer afternoon, a city can be several degrees hotter than the farmland and forests around it. Scientists call this an urban heat island. The problem comes from the city itself. Dark roofs and asphalt soak up sunlight all day and give off that heat long after sunset. Buildings block breezes, and there are fewer trees and plants to cool the air.",
          "The extra heat is more than uncomfortable. It raises electricity bills as people run air conditioners longer, and it can be dangerous for older adults, young children, and anyone who works outside. So cities across the country have been looking for ways to cool down.",
          "One solution is to plant trees. A tree's shade keeps pavement and buildings from heating up, and its leaves release water vapor that cools the air around them. Some cities have set goals to shade more of their streets with trees, starting with the neighborhoods that have the least shade.",
          "Another solution is to change the color of roofs and roads. A white or light-colored “cool roof” reflects much of the sunlight that a black roof would absorb, so the building beneath it stays cooler. A few cities have tested light-colored coatings on streets and playgrounds for the same reason.",
          "A third idea is to grow plants on the roofs themselves. These green roofs act like a sponge and a sunshade at once, soaking up rainwater and keeping the building below cooler.",
          "None of these fixes works alone, and each has costs. Trees take years to grow, and coatings must be renewed. But together they can make a hot city a little more livable, one street at a time.",
        ],
      },
    ],
    es: [
      {
        title: "Cómo refrescar una ciudad caliente",
        paras: [
          "En una tarde de verano, una ciudad puede estar varios grados más caliente que los campos y bosques que la rodean. Los científicos llaman a esto una isla de calor urbana. El problema viene de la ciudad misma. Los techos oscuros y el asfalto absorben la luz del sol todo el día y sueltan ese calor mucho después de que se pone el sol. Los edificios bloquean la brisa, y hay menos árboles y plantas que refresquen el aire.",
          "El calor extra es más que una molestia. Hace que suba la cuenta de luz porque la gente usa el aire acondicionado más tiempo, y puede ser peligroso para las personas mayores, los niños pequeños y cualquiera que trabaje al aire libre. Por eso, ciudades de todo el país buscan maneras de refrescarse.",
          "Una solución es plantar árboles. La sombra de un árbol evita que el pavimento y los edificios se calienten, y sus hojas sueltan vapor de agua que refresca el aire a su alrededor. Algunas ciudades se han puesto metas para dar sombra a más calles con árboles, empezando por los vecindarios que tienen menos sombra.",
          "Otra solución es cambiar el color de techos y calles. Un “techo fresco”, blanco o de color claro, refleja gran parte de la luz que un techo negro absorbería, así que el edificio de abajo se mantiene más fresco. Algunas ciudades han probado recubrimientos claros en calles y patios de juego por la misma razón.",
          "Una tercera idea es sembrar plantas en los techos mismos. Estos techos verdes funcionan a la vez como una esponja y una sombrilla: absorben el agua de lluvia y mantienen más fresco el edificio de abajo.",
          "Ninguna de estas soluciones funciona sola, y cada una tiene costos. Los árboles tardan años en crecer, y los recubrimientos hay que renovarlos. Pero juntas pueden hacer que una ciudad caliente sea un poco más habitable, calle por calle.",
        ],
      },
    ],
    qs: [
      q(
        "structure.section",
        ["wrong-section-role", "wrong-section-role", "not-in-text"],
        [
          "What is the purpose of paragraph 2?",
          "To show why the extra heat is a problem worth solving.",
          ["To describe the first solution, planting trees along city streets and in the neighborhoods with the least shade.", "To explain why dark roofs and asphalt soak up so much sunlight.", "To prove that air conditioners are the main cause of heat islands."],
          ["The extra heat is more than uncomfortable."],
          "Paragraph 1 names the problem. Paragraph 2 explains why it matters, its costs and dangers, before the passage turns to solutions.",
        ],
        [
          "¿Cuál es el propósito del párrafo 2?",
          "Mostrar por qué vale la pena resolver el problema del calor extra.",
          ["Describir la primera solución: plantar árboles en las calles y en los vecindarios con menos sombra.", "Explicar por qué los techos oscuros y el asfalto absorben tanta luz del sol.", "Probar que los aires acondicionados son la causa principal de las islas de calor."],
          ["El calor extra es más que una molestia."],
          "El párrafo 1 nombra el problema. El párrafo 2 explica por qué importa, sus costos y peligros, antes de que el texto pase a las soluciones.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "not-in-text"],
        [
          "What is the central idea of the passage?",
          "Cities trap extra heat, but trees, light-colored surfaces, and green roofs can help.",
          ["Green roofs soak up rainwater like a sponge and keep the building below them cooler.", "Summer weather can be uncomfortable.", "Cities should tear up all of their asphalt roads."],
          ["But together they can make a hot city a little more livable"],
          "The passage explains why cities get hotter and then spends most of its paragraphs on three ways to cool them.",
        ],
        [
          "¿Cuál es la idea central del texto?",
          "Las ciudades atrapan calor extra, pero los árboles, las superficies claras y los techos verdes pueden ayudar.",
          ["Los techos verdes absorben el agua de lluvia como una esponja y mantienen más fresco todo el edificio de abajo.", "El clima de verano puede ser incómodo.", "Las ciudades deberían quitar todas sus calles de asfalto."],
          ["Pero juntas pueden hacer que una ciudad caliente sea un poco más habitable"],
          "El texto explica por qué las ciudades se calientan más y luego dedica la mayoría de sus párrafos a tres maneras de refrescarlas.",
        ],
      ),
      q(
        "infer.what",
        ["not-in-text", "contradicts-text", "overgeneralizes"],
        [
          "Why might a city plant trees first in “the neighborhoods that have the least shade”?",
          "Those neighborhoods are likely the hottest, so new trees help them most.",
          ["Trees grow faster in places where no other trees are nearby to block the sun.", "Those neighborhoods already have the most trees in the city.", "A new tree always cools a whole street by many degrees right away."],
          ["A tree's shade keeps pavement and buildings from heating up"],
          "Shade keeps pavement and buildings from heating up, so the places with the least shade are probably the hottest and would gain the most.",
        ],
        [
          "¿Por qué una ciudad plantaría árboles primero en “los vecindarios que tienen menos sombra”?",
          "Esos vecindarios quizá son los más calientes, así que ahí los árboles ayudan más.",
          ["Los árboles crecen más rápido donde no hay otros árboles cerca que les tapen el sol.", "Esos vecindarios ya tienen la mayor cantidad de árboles de la ciudad.", "Un árbol nuevo siempre refresca una calle entera muchos grados de inmediato."],
          ["La sombra de un árbol evita que el pavimento y los edificios se calienten"],
          "La sombra evita que el pavimento y los edificios se calienten, así que los lugares con menos sombra probablemente son los más calientes y los que más ganarían.",
        ],
      ),
      q(
        "words.figurative",
        ["too-literal", "contradicts-text", "not-in-text"],
        [
          "In paragraph 5, what does the author mean by saying green roofs act “like a sponge and a sunshade at once”?",
          "They soak up rain and block the sun's heat at the same time.",
          ["They are covered with rows of real sponges and small beach umbrellas.", "They make the building below wetter and darker inside.", "They only work on cloudy, rainy days."],
          ["These green roofs act like a sponge and a sunshade at once"],
          "A sponge soaks up water and a sunshade blocks sunlight. Green roofs do both jobs: they hold rainwater and keep the building cooler.",
        ],
        [
          "En el párrafo 5, ¿qué quiere decir el texto con que los techos verdes funcionan “a la vez como una esponja y una sombrilla”?",
          "Absorben la lluvia y bloquean el calor del sol al mismo tiempo.",
          ["Están cubiertos de filas de esponjas y sombrillas de playa de verdad.", "Hacen que el edificio de abajo esté más mojado y oscuro por dentro.", "Solo funcionan en días nublados y lluviosos."],
          ["Estos techos verdes funcionan a la vez como una esponja y una sombrilla"],
          "Una esponja absorbe agua y una sombrilla bloquea el sol. Los techos verdes hacen los dos trabajos: guardan el agua de lluvia y mantienen más fresco el edificio.",
        ],
      ),
    ],
  },
  {
    id: "lunch-line",
    level: 1,
    genre: "informational",
    structure: {
      kind: "problem-solution",
      en: [["The problem", "solutions", "fix it"], "The passage describes a problem, a slow lunch line, then how a class studied it, proposed solutions, and tested them."],
      es: [["El problema", "soluciones", "resolverlo"], "El texto describe un problema, una fila del almuerzo muy lenta, y luego cómo una clase lo estudió, propuso soluciones y las puso a prueba."],
    },
    en: [
      {
        title: "How Room 214 Fixed the Lunch Line",
        paras: [
          "At Riverside Middle School, lunch lasts twenty-five minutes. Last fall, students were spending up to fifteen of those minutes standing in line. By the time many sixth graders sat down, they had only a few minutes left to eat, and much of their food went into the trash.",
          "The problem bothered Ms. Okonkwo's math class in Room 214, so they decided to study it and try to fix it. For two weeks, students stood near the cafeteria with stopwatches and clipboards. They timed how long each person spent at each station and discovered that the line was not slow everywhere. Most of the delay happened at one spot: the single register where students typed in their lunch numbers.",
          "The class came up with three possible solutions. The first was to open a second register. The second was to let students punch in their numbers on a tablet while waiting in line. The third was to have each grade start lunch five minutes apart, so fewer students would arrive at once.",
          "The class presented its data to the principal and the cafeteria manager. A second register would require another worker, which the school could not afford. But the staggered start times cost nothing, and the cafeteria manager agreed to try a tablet at the front of the line.",
          "A month after the changes, the class timed the line again. The average wait had dropped from twelve minutes to five. The cafeteria also reported that less food was being thrown away.",
          "“We didn't just complain about it,” said sixth grader Lucas Ferreira. “We measured it. That's why they listened.”",
        ],
      },
    ],
    es: [
      {
        title: "Cómo el salón 214 arregló la fila del almuerzo",
        paras: [
          "En la Escuela Intermedia Riverside, el almuerzo dura veinticinco minutos. El otoño pasado, los estudiantes pasaban hasta quince de esos minutos haciendo fila. Cuando muchos de sexto grado por fin se sentaban, les quedaban pocos minutos para comer, y gran parte de su comida terminaba en la basura.",
          "El problema le molestaba a la clase de matemáticas de la maestra Okonkwo, en el salón 214, así que decidió estudiarlo para resolverlo. Durante dos semanas, los estudiantes se pararon cerca de la cafetería con cronómetros y tablas de apuntes. Midieron cuánto tiempo pasaba cada persona en cada estación y descubrieron que la fila no era lenta en todas partes. Casi todo el retraso ocurría en un solo lugar: la única caja donde los estudiantes tecleaban su número de almuerzo.",
          "La clase pensó en tres posibles soluciones. La primera era abrir una segunda caja. La segunda era dejar que los estudiantes marcaran su número en una tableta mientras esperaban en la fila. La tercera era que cada grado empezara a almorzar con cinco minutos de diferencia, para que llegaran menos estudiantes a la vez.",
          "La clase presentó sus datos al director y a la encargada de la cafetería. Una segunda caja requería otro empleado, y la escuela no podía pagarlo. Pero los horarios escalonados no costaban nada, y la encargada de la cafetería aceptó probar una tableta al frente de la fila.",
          "Un mes después de los cambios, la clase volvió a medir la fila. La espera promedio había bajado de doce minutos a cinco. La cafetería también informó que se tiraba menos comida.",
          "—No nos quedamos en quejarnos —dijo Lucas Ferreira, de sexto grado—. Lo medimos. Por eso nos hicieron caso.",
        ],
      },
    ],
    qs: [
      q(
        "structure.section",
        ["wrong-section-role", "wrong-section-role", "not-in-text"],
        [
          "What is the role of paragraph 2 in the passage?",
          "It shows how the class found the real cause of the slow line.",
          ["It lists the three solutions the class came up with.", "It reports what happened to the wait times a month after the changes began.", "It argues that students should be given a longer lunch period."],
          ["Most of the delay happened at one spot"],
          "Paragraph 1 describes the problem. Paragraph 2 shows the class measuring the line and finding where the delay really was, which shapes the solutions that follow.",
        ],
        [
          "¿Qué función tiene el párrafo 2 en el texto?",
          "Muestra cómo la clase encontró la verdadera causa de la fila lenta.",
          ["Enumera las tres soluciones que se le ocurrieron a la clase.", "Informa qué pasó con los tiempos de espera un mes después de los cambios.", "Defiende que los estudiantes deberían tener más tiempo para almorzar."],
          ["Casi todo el retraso ocurría en un solo lugar"],
          "El párrafo 1 describe el problema. El párrafo 2 muestra a la clase midiendo la fila y encontrando dónde estaba de verdad el retraso, lo que da forma a las soluciones que siguen.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "contradicts-text"],
        [
          "What is the central idea of the passage?",
          "A class measured why the lunch line was slow and helped the school fix it.",
          ["The cafeteria manager agreed to put a tablet at the very front of the lunch line.", "Schools have to solve many different problems every year.", "The school hired a new worker so it could open a second register."],
          ["The average wait had dropped from twelve minutes to five."],
          "The article follows one class from the problem, to measuring it, to solutions that cut the wait from twelve minutes to five.",
        ],
        [
          "¿Cuál es la idea central del texto?",
          "Una clase midió por qué la fila del almuerzo era lenta y ayudó a la escuela a resolverlo.",
          ["La encargada de la cafetería aceptó poner una tableta justo al frente de la fila del almuerzo.", "Las escuelas tienen que resolver muchos problemas distintos cada año.", "La escuela contrató a un empleado nuevo para abrir una segunda caja."],
          ["La espera promedio había bajado de doce minutos a cinco."],
          "El artículo sigue a una clase desde el problema hasta medirlo y encontrar soluciones que bajaron la espera de doce minutos a cinco.",
        ],
      ),
      q(
        "infer.what",
        ["not-in-text", "contradicts-text", "overgeneralizes"],
        [
          "Why does the cafeteria report that “less food was being thrown away” after the changes?",
          "With shorter waits, students had more time to finish eating.",
          ["The cafeteria started serving smaller portions to save money.", "The line got even longer, so many students skipped lunch.", "Students always waste less food during the winter months."],
          ["they had only a few minutes left to eat, and much of their food went into the trash"],
          "Paragraph 1 links the long line to food in the trash: students ran out of time to eat. A shorter wait gave them that time back.",
        ],
        [
          "¿Por qué la cafetería informa que “se tiraba menos comida” después de los cambios?",
          "Con esperas más cortas, los estudiantes tenían más tiempo para terminar de comer.",
          ["La cafetería empezó a servir porciones más pequeñas para ahorrar dinero.", "La fila se hizo todavía más larga, así que muchos estudiantes ya ni siquiera almorzaron.", "Los estudiantes siempre desperdician menos comida en los meses de invierno."],
          ["les quedaban pocos minutos para comer, y gran parte de su comida terminaba en la basura"],
          "El párrafo 1 relaciona la fila larga con la comida en la basura: a los estudiantes no les alcanzaba el tiempo para comer. Una espera más corta les devolvió ese tiempo.",
        ],
      ),
      q(
        "pov.purpose",
        ["contradicts-text", "wrong-purpose", "not-in-text"],
        [
          "Why does the author end the article with Lucas Ferreira's words?",
          "To stress that careful measuring, not complaining, convinced the adults.",
          ["To show that students complained loudly until the school finally gave in.", "To introduce a new problem with the lunch line that still needs solving.", "To reveal that the tablet was Lucas's idea from the start."],
          ["We measured it. That's why they listened."],
          "Lucas contrasts complaining with measuring. Ending on his words sums up the article's point: data is what made the principal and the cafeteria manager act.",
        ],
        [
          "¿Por qué el autor termina el artículo con las palabras de Lucas Ferreira?",
          "Para resaltar que medir con cuidado, y no quejarse, fue lo que convenció a los adultos.",
          ["Para mostrar que los estudiantes se quejaron mucho hasta que la escuela por fin cedió ante ellos.", "Para presentar un problema nuevo de la fila que todavía hay que resolver.", "Para revelar que la tableta fue idea de Lucas desde el principio."],
          ["Lo medimos. Por eso nos hicieron caso."],
          "Lucas contrasta quejarse con medir. Terminar con sus palabras resume la idea del artículo: los datos fueron lo que hizo actuar al director y a la cafetería.",
        ],
      ),
    ],
  },
  {
    id: "mill-letter",
    level: 1,
    genre: "primary",
    note: {
      en: "An imagined letter, written for this practice in the style of the 1840s. The writer is invented; the Lowell mills, their bells, and their long workdays were real.",
      es: "Una carta imaginada, escrita para esta práctica al estilo de la década de 1840. La autora es inventada; las fábricas de Lowell, sus campanas y sus largas jornadas fueron reales.",
    },
    en: [
      {
        title: "A Letter from the Mills, 1846",
        paras: [
          "Lowell, Massachusetts, May 3, 1846. Dear Sister Abigail, I have been at the mill three weeks now, and at last I have a quiet hour to write. You asked whether city life is as grand as the stories say. I will tell you plainly, and you may decide.",
          "The bell rules everything here. It rings before five in the morning to wake us, rings again to call us to the mill, and rings us in and out for meals so short that I have learned to eat my dinner faster than I could say grace at home. We work six days a week, from early morning until seven in the evening.",
          "The weaving room is a wonder and a trial. Hundreds of looms run at once, and the noise is so great that the girls talk with their hands and faces rather than their voices. The air is warm and full of cotton dust, and the windows are kept shut so the threads will not break. My head ached every night the first week. It aches less now, or perhaps I have only grown used to it.",
          "Still, I do not regret coming. After I pay for my room and meals at Mrs. Ames's boardinghouse, I can put away a little money each week, more than I ever held at home. On Sundays I go to church and then to the reading room, and some evenings the girls in my house read aloud to one another. Several of them write stories and poems, and two have had their work printed in a magazine written by mill girls.",
          "Tell Mother I am well and that I keep my Bible and my savings book in the same box. I mean to stay one more year, perhaps two, and then come home with enough to help with the farm, or to pay for a term at the academy. Write soon. Your loving sister, Hannah.",
        ],
      },
    ],
    es: [
      {
        title: "Una carta desde las fábricas, 1846",
        paras: [
          "Lowell, Massachusetts, 3 de mayo de 1846. Querida hermana Abigail: Llevo tres semanas en la fábrica y por fin tengo una hora tranquila para escribirte. Me preguntaste si la vida en la ciudad es tan grandiosa como dicen las historias. Te lo diré con franqueza, y tú decidirás.",
          "Aquí la campana lo gobierna todo. Suena antes de las cinco de la mañana para despertarnos, vuelve a sonar para llamarnos a la fábrica y nos hace entrar y salir de comidas tan cortas que he aprendido a comer más rápido de lo que tardaba en bendecir la mesa en casa. Trabajamos seis días a la semana, desde muy temprano hasta las siete de la noche.",
          "El salón de tejido es una maravilla y una prueba. Cientos de telares funcionan a la vez, y el ruido es tan fuerte que las muchachas hablan con las manos y la cara en lugar de la voz. El aire es caliente y está lleno de polvo de algodón, y las ventanas se mantienen cerradas para que no se rompan los hilos. La primera semana me dolía la cabeza todas las noches. Ahora me duele menos, o tal vez solo me he acostumbrado.",
          "Aun así, no me arrepiento de haber venido. Después de pagar mi cuarto y mis comidas en la casa de huéspedes de la señora Ames, puedo guardar un poco de dinero cada semana, más del que nunca tuve en casa. Los domingos voy a la iglesia y luego a la sala de lectura, y algunas noches las muchachas de mi casa leen en voz alta unas para otras. Varias escriben cuentos y poemas, y a dos les han publicado su trabajo en una revista escrita por obreras de las fábricas.",
          "Dile a mamá que estoy bien y que guardo mi Biblia y mi libreta de ahorros en la misma caja. Pienso quedarme un año más, tal vez dos, y luego volver a casa con lo suficiente para ayudar con la granja o pagar un curso en la academia. Escríbeme pronto. Tu hermana que te quiere, Hannah.",
        ],
      },
    ],
    qs: [
      q(
        "pov.view",
        ["contradicts-text", "overstates-view", "not-in-text"],
        [
          "How does Hannah feel about working at the mill?",
          "She finds it hard, but worth it for the money and chances it gives her.",
          ["She hates the mill and plans to leave it and come home to the farm right away.", "She believes every girl in New England should go to work in a mill.", "She is mostly upset with her sister for not writing more often."],
          ["Still, I do not regret coming."],
          "Hannah describes the noise, dust, and strict bells honestly, then says she does not regret coming because of her savings and the chance to read and learn.",
        ],
        [
          "¿Qué piensa Hannah de trabajar en la fábrica?",
          "Le parece duro, pero vale la pena por el dinero y las oportunidades que le da.",
          ["Odia la fábrica y piensa irse y volver a casa de inmediato.", "Cree que todas las muchachas de Nueva Inglaterra deberían ir a trabajar a una fábrica.", "Sobre todo está molesta con su hermana porque no le escribe más seguido."],
          ["Aun así, no me arrepiento de haber venido."],
          "Hannah describe con franqueza el ruido, el polvo y las campanas estrictas, y luego dice que no se arrepiente por sus ahorros y la oportunidad de leer y aprender.",
        ],
      ),
      q(
        "pov.purpose",
        ["wrong-purpose", "not-in-text", "contradicts-text"],
        [
          "Why does Hannah describe the bells in paragraph 2?",
          "To show how strictly the mill controls every part of the workers' day.",
          ["To explain to her sister exactly how the mill's bells are made and rung each day.", "To complain that the church bells back home were too quiet.", "To show that the workers are free to choose their own hours."],
          ["The bell rules everything here."],
          "Every detail about the bells, waking, working, and short meals, shows that the mill, not the workers, decides how each day is spent.",
        ],
        [
          "¿Por qué Hannah describe las campanas en el párrafo 2?",
          "Para mostrar con qué rigor la fábrica controla cada parte del día de las obreras.",
          ["Para explicarle a su hermana cómo se fabrican y se tocan las campanas de la fábrica.", "Para quejarse de que las campanas de la iglesia de su pueblo sonaban muy bajito.", "Para mostrar que las obreras pueden elegir su propio horario."],
          ["Aquí la campana lo gobierna todo."],
          "Cada detalle sobre las campanas, despertar, trabajar y comer rápido, muestra que la fábrica, y no las obreras, decide cómo se usa cada día.",
        ],
      ),
      q(
        "infer.what",
        ["not-in-text", "contradicts-text", "overgeneralizes"],
        [
          "What can you infer from the sentence “It aches less now, or perhaps I have only grown used to it”?",
          "Conditions may not have improved; Hannah may just be getting used to them.",
          ["The mill owners fixed the noise and the dust after Hannah's first week of work.", "Hannah's headaches came from reading too late at night.", "Everyone who works in a mill gets used to it within a week."],
          ["It aches less now, or perhaps I have only grown used to it."],
          "Hannah is not sure the pain is really less. “Perhaps I have only grown used to it” suggests the noise and dust are the same and she is adjusting.",
        ],
        [
          "¿Qué puedes inferir de la oración “Ahora me duele menos, o tal vez solo me he acostumbrado”?",
          "Puede que las condiciones no hayan mejorado; tal vez Hannah solo se está acostumbrando.",
          ["Los dueños de la fábrica arreglaron el ruido y el polvo después de la primera semana de Hannah.", "Los dolores de cabeza de Hannah venían de leer hasta muy tarde.", "Todas las personas que trabajan en una fábrica se acostumbran en una semana."],
          ["Ahora me duele menos, o tal vez solo me he acostumbrado."],
          "Hannah no está segura de que el dolor de verdad sea menor. “Tal vez solo me he acostumbrado” sugiere que el ruido y el polvo siguen igual y ella se está adaptando.",
        ],
      ),
      q(
        "words.figurative",
        ["too-literal", "not-in-text", "contradicts-text"],
        [
          "What does Hannah mean when she writes, “The bell rules everything here”?",
          "The bell's schedule decides when the workers wake, work, and eat.",
          ["A huge iron bell hangs from the ceiling above every room of the mill.", "The bell is the most beautiful sight in Lowell.", "The bell rings only once a day, at the end of work."],
          ["It rings before five in the morning to wake us"],
          "A bell cannot really rule. Hannah means the bell's signals control the workers' whole day, like a ruler giving orders.",
        ],
        [
          "¿Qué quiere decir Hannah cuando escribe: “Aquí la campana lo gobierna todo”?",
          "El horario de la campana decide cuándo despiertan, trabajan y comen las obreras.",
          ["Hay una campana de hierro enorme colgada del techo sobre cada salón de la fábrica.", "La campana es lo más hermoso que hay en Lowell.", "La campana suena una sola vez al día, al terminar el trabajo."],
          ["Suena antes de las cinco de la mañana para despertarnos"],
          "Una campana no puede gobernar de verdad. Hannah quiere decir que sus señales controlan todo el día de las obreras, como alguien que da órdenes.",
        ],
      ),
      q(
        "central.summary",
        ["adds-opinion", "misses-key-point", "contradicts-text"],
        [
          "Which is the best objective summary of the letter?",
          "Hannah writes that mill life is long, loud, and ruled by bells, but the pay and chances to learn make it worth it for now.",
          ["Hannah's letter proves that mill work was cruel, and her family was wrong to let her go so far from home alone at her age.", "Hannah mentions a woman named Mrs. Ames, a reading room, a Bible, a savings book, a box, and a farm.", "Hannah writes that she is quitting the mill soon because the pay is too low for her to save anything."],
          ["I mean to stay one more year, perhaps two"],
          "A good summary covers both sides of Hannah's letter, the hard work and the reasons she stays, without adding a judgment.",
        ],
        [
          "¿Cuál es el mejor resumen objetivo de la carta?",
          "Hannah cuenta que la fábrica es dura, ruidosa y regida por campanas, pero que el sueldo y lo que aprende valen la pena por ahora.",
          ["La carta de Hannah demuestra que el trabajo en la fábrica era cruel, y que su familia hizo muy mal en dejarla ir tan lejos sola a su edad.", "Hannah menciona a una señora Ames, una sala de lectura, una Biblia, una libreta de ahorros, una caja y una granja.", "Hannah escribe que pronto va a dejar la fábrica porque el sueldo es tan bajo que no puede ahorrar nada."],
          ["Pienso quedarme un año más, tal vez dos"],
          "Un buen resumen cubre los dos lados de la carta de Hannah, el trabajo duro y las razones por las que se queda, sin agregar un juicio.",
        ],
      ),
    ],
  },
  {
    id: "trail-diary",
    level: 1,
    genre: "primary",
    note: {
      en: "An imagined diary, written for this practice in the style of an 1850s trail journal. The family is invented; the route and its landmarks are real.",
      es: "Un diario imaginado, escrito para esta práctica al estilo de un diario de viaje de la década de 1850. La familia es inventada; la ruta y sus lugares son reales.",
    },
    en: [
      {
        title: "From a Trail Diary, 1853",
        paras: [
          "June 2. We crossed the South Platte today, which took from sunup until past noon. The river is wide but shallow, and the bottom is soft sand that pulls at the wheels if a wagon stops for even a moment. Father walked beside the oxen in water to his waist, shouting at them the whole way. When we reached the far bank, Mother sat down on a box and laughed until she cried, though nothing was funny.",
          "June 9. Passed Chimney Rock this afternoon. We first saw it two days ago and thought it was close enough to reach by supper. The air out here plays tricks; distances are always greater than they look. Thomas says it looks like a chimney. I say it looks like a church steeple with no church beneath it.",
          "June 14. Reached Fort Laramie. We traded one of our spare wheels for flour and coffee, and Mother traded her good tablecloth for a sack of dried apples. I asked if she was sorry to lose it. She said a tablecloth needs a table, and we have not had one since April.",
          "June 29. We are at Independence Rock at last. Father says we are nearly on the schedule he wanted, which was to reach it by the Fourth of July. That still leaves the mountains and more than half of the trail ahead. Hundreds of names are painted on the rock. Thomas wrote ours in axle grease low on the north side.",
          "Tonight the wind is hard across the sage, and the canvas over our heads snaps like a flag. I am tired in a way I did not know a person could be tired. But when I climbed the rock this evening, I could see the trail running west for miles, a pale line through the grass, and I thought: other people made it. So can we.",
        ],
      },
    ],
    es: [
      {
        title: "De un diario de viaje, 1853",
        paras: [
          "2 de junio. Hoy cruzamos el río South Platte, y nos tomó desde el amanecer hasta pasado el mediodía. El río es ancho pero poco profundo, y el fondo es de arena blanda que jala las ruedas si una carreta se detiene aunque sea un momento. Papá caminó junto a los bueyes con el agua hasta la cintura, gritándoles todo el camino. Cuando llegamos a la otra orilla, mamá se sentó en una caja y se rio hasta llorar, aunque nada era gracioso.",
          "9 de junio. Hoy en la tarde pasamos por Chimney Rock. La vimos por primera vez hace dos días y creímos que estaba tan cerca que llegaríamos para la cena. Aquí el aire engaña; las distancias siempre son mayores de lo que parecen. Thomas dice que parece una chimenea. Yo digo que parece el campanario de una iglesia sin iglesia debajo.",
          "14 de junio. Llegamos a Fort Laramie. Cambiamos una de nuestras ruedas de repuesto por harina y café, y mamá cambió su mantel bueno por un costal de manzanas secas. Le pregunté si le daba pena perderlo. Me dijo que un mantel necesita una mesa, y no hemos tenido una desde abril.",
          "29 de junio. Por fin estamos en Independence Rock. Papá dice que vamos casi en el tiempo que quería, que era llegar aquí para el 4 de julio. Todavía nos quedan las montañas y más de la mitad del camino. En la roca hay cientos de nombres pintados. Thomas escribió los nuestros con grasa de eje, abajo, en el lado norte.",
          "Esta noche el viento sopla fuerte sobre la salvia, y la lona sobre nuestras cabezas chasquea como una bandera. Estoy cansada como no sabía que una persona podía estarlo. Pero cuando subí a la roca esta tarde, vi el camino que corría hacia el oeste por kilómetros, una línea pálida entre el pasto, y pensé: otras personas lo lograron. Nosotros también podemos.",
        ],
      },
    ],
    qs: [
      q(
        "infer.what",
        ["contradicts-text", "not-in-text", "overgeneralizes"],
        [
          "Why does Mother laugh “until she cried, though nothing was funny” after the river crossing?",
          "She is letting out the fear and strain of a dangerous crossing.",
          ["She thinks Father looked silly shouting at the oxen in the water.", "She is upset because the family lost a wagon in the river.", "People always laugh when they finish a hard day of work."],
          ["The river is wide but shallow, and the bottom is soft sand that pulls at the wheels"],
          "The crossing took all morning, and the sand could trap a wagon. Laughing and crying when “nothing was funny” shows relief after a frightening day.",
        ],
        [
          "¿Por qué mamá se ríe “hasta llorar, aunque nada era gracioso” después de cruzar el río?",
          "Está soltando el miedo y la tensión de un cruce peligroso.",
          ["Le pareció chistoso ver a papá gritándoles a los bueyes en el agua.", "Está triste porque la familia perdió una carreta en el río.", "La gente siempre se ríe cuando termina un día de trabajo duro."],
          ["el fondo es de arena blanda que jala las ruedas si una carreta se detiene"],
          "El cruce tomó toda la mañana y la arena podía atrapar una carreta. Reír y llorar cuando “nada era gracioso” muestra alivio después de un día de miedo.",
        ],
      ),
      q(
        "infer.support",
        ["off-point-evidence", "off-point-evidence", "off-point-evidence"],
        [
          "Which sentence best supports the inference that the family has given up comforts of home?",
          "She said a tablecloth needs a table, and we have not had one since April.",
          ["We first saw it two days ago and thought it was close enough to reach by supper.", "Father walked beside the oxen in water to his waist, shouting at them the whole way.", "Thomas wrote ours in axle grease low on the north side."],
          ["She said a tablecloth needs a table, and we have not had one since April."],
          "Not having a table for months, and trading away a good tablecloth, shows the family has left everyday comforts behind.",
        ],
        [
          "¿Qué oración apoya mejor la inferencia de que la familia ha dejado atrás las comodidades de su casa?",
          "Me dijo que un mantel necesita una mesa, y no hemos tenido una desde abril.",
          ["La vimos por primera vez hace dos días y creímos que estaba tan cerca que llegaríamos para la cena.", "Papá caminó junto a los bueyes con el agua hasta la cintura, gritándoles todo el camino.", "Thomas escribió los nuestros con grasa de eje, abajo, en el lado norte."],
          ["Me dijo que un mantel necesita una mesa, y no hemos tenido una desde abril."],
          "No tener mesa desde hace meses, y cambiar un mantel bueno, muestra que la familia ha dejado atrás las comodidades de todos los días.",
        ],
      ),
      q(
        "words.figurative",
        ["wrong-context-meaning", "too-literal", "not-in-text"],
        [
          "What does the writer mean by “The air out here plays tricks”?",
          "On the open plains, faraway things look closer than they are.",
          ["The weather changes so quickly that no one can plan ahead.", "The wind blows away anything that is left outside the wagons at night.", "The air smells strange and makes the travelers feel sick."],
          ["distances are always greater than they look"],
          "The family thought they could reach Chimney Rock by supper, but it took two more days. The writer explains that distances fool the eye.",
        ],
        [
          "¿Qué quiere decir quien escribe con “Aquí el aire engaña”?",
          "En las llanuras abiertas, las cosas lejanas parecen más cerca de lo que están.",
          ["El clima cambia tan rápido que nadie puede hacer planes.", "El viento se lleva todo lo que se deja fuera de las carretas durante toda la noche.", "El aire huele raro y hace que los viajeros se sientan mal."],
          ["las distancias siempre son mayores de lo que parecen"],
          "La familia creyó que llegaría a Chimney Rock para la cena, pero tardó dos días más. Quien escribe explica que las distancias engañan a la vista.",
        ],
      ),
      q(
        "pov.view",
        ["contradicts-text", "misses-author-stance", "overstates-view"],
        [
          "Based on the whole diary, how does the writer see the family's journey?",
          "As exhausting and costly, but worth pushing through.",
          ["As an easy adventure without any real hardships.", "As something to report without any feelings at all.", "As proof that every family on the trail will surely make it."],
          ["I am tired in a way I did not know a person could be tired.", "other people made it. So can we."],
          "The writer admits deep tiredness and losses, yet ends with “So can we.” The view is honest about the hardship and still determined.",
        ],
        [
          "Según todo el diario, ¿cómo ve quien escribe el viaje de la familia?",
          "Como agotador y costoso, pero algo por lo que vale la pena seguir.",
          ["Como una aventura fácil sin dificultades de verdad.", "Como algo que se cuenta sin ningún sentimiento.", "Como prueba de que todas las familias del camino seguramente llegarán."],
          ["Estoy cansada como no sabía que una persona podía estarlo.", "otras personas lo lograron. Nosotros también podemos."],
          "Quien escribe admite un cansancio enorme y las pérdidas, pero termina con “Nosotros también podemos”. Su visión es honesta sobre lo duro y aun así decidida.",
        ],
      ),
      q(
        "central.summary",
        ["adds-opinion", "misses-key-point", "contradicts-text"],
        [
          "Which is the best objective summary of the diary?",
          "On the trail, the writer records a hard river crossing, trades for supplies, and reaches Independence Rock, tired but determined.",
          ["The diary shows that pioneer families were foolish to risk the long, hard trail west when they could have stayed safely at home on their farms.", "The writer mentions Chimney Rock, a steeple, a tablecloth, dried apples, axle grease, sage, and canvas.", "The family turns back at Fort Laramie after Mother trades away her tablecloth."],
          ["We are at Independence Rock at last."],
          "A good summary follows the main stops in order and the writer's feelings at the end, without the reader's opinions.",
        ],
        [
          "¿Cuál es el mejor resumen objetivo del diario?",
          "En el camino, quien escribe cuenta un cruce difícil, cambia cosas por provisiones y llega a Independence Rock, cansada pero decidida.",
          ["El diario demuestra que las familias pioneras fueron insensatas al arriesgarse en el largo camino al oeste cuando podían quedarse seguras en sus granjas.", "Quien escribe menciona Chimney Rock, un campanario, un mantel, manzanas secas, grasa de eje, salvia y lona.", "La familia se regresa en Fort Laramie después de que mamá cambia su mantel."],
          ["Por fin estamos en Independence Rock."],
          "Un buen resumen sigue las paradas principales en orden y los sentimientos de quien escribe al final, sin las opiniones del lector.",
        ],
      ),
    ],
  },
];
