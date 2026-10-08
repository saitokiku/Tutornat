import { type Passage, q } from "./types";

// Level 2 informational articles, one for each overall structure. Facts were checked when written.
export const L2_INFO: Passage[] = [
  {
    id: "polio-vaccine",
    level: 2,
    genre: "informational",
    structure: {
      kind: "chronological",
      en: [["That same year", "Then came", "In 1954", "in 1979"], "The passage follows the fight against polio in time order: the worst year in 1952, Salk's first tests, the 1954 trial, the 1955 announcement, the oral vaccine of the early 1960s, and the last case in 1979. The vaccine answers a problem, but the paragraphs are arranged by date."],
      es: [["Ese mismo año", "Luego vino", "En 1954", "empezó a usarse"], "El texto sigue la lucha contra la polio en orden de tiempo: el peor año, en 1952, las primeras pruebas de Salk, la prueba de 1954, el anuncio de 1955, la vacuna oral de principios de la década de 1960 y el último caso, en 1979. La vacuna responde a un problema, pero los párrafos están ordenados por fecha."],
    },
    en: [
      {
        title: "Polio in America, 1952 to 1979",
        paras: [
          "By the early 1950s, few diseases frightened American parents more than polio. The virus could attack the nerves that control muscles, and in the worst cases it left children unable to walk or even to breathe on their own. Summer, when polio spread most easily, became a season of fear. Public pools closed, and some parents kept their children away from movie theaters and playgrounds. The worst year came in 1952, when the United States reported nearly 58,000 cases.",
          "That same year, Jonas Salk, a researcher at the University of Pittsburgh, began testing a vaccine made from virus that had been killed with a chemical. A killed virus could not cause the disease, but it might still teach the body to defend itself. He tried it first on small groups of volunteers, and in 1953 he gave it to himself, his wife, and their three sons.",
          "Then came the largest medical test the country had ever seen. In 1954, about 1.8 million schoolchildren, nicknamed the Polio Pioneers, took part. Some received the vaccine, some received a harmless look-alike shot, and others were simply watched for comparison. Volunteers, many of them parents, helped run the clinics.",
          "On April 12, 1955, after nearly a year of studying the results, researchers announced that the vaccine was safe and effective. Church bells rang in some towns, and the vaccine was approved for use that same day. When a television reporter asked Salk who owned the patent, he answered that there was no patent and asked, “Could you patent the sun?”",
          "In the early 1960s, Albert Sabin's vaccine came into use. Made from a weakened live virus, it could be swallowed instead of injected, which made it easier to give to millions of people. Cases in the United States fell sharply. The last case of polio caused by the wild virus spreading within the country occurred in 1979, and today the disease survives in only a few parts of the world.",
        ],
      },
    ],
    es: [
      {
        title: "La polio en Estados Unidos, de 1952 a 1979",
        paras: [
          "A principios de la década de 1950, pocas enfermedades asustaban tanto a los padres estadounidenses como la polio. El virus podía atacar los nervios que controlan los músculos, y en los peores casos dejaba a los niños sin poder caminar o incluso sin poder respirar por sí solos. El verano, cuando la polio se contagiaba con más facilidad, se volvió una temporada de miedo. Cerraban las piscinas públicas, y algunos padres no dejaban que sus hijos fueran al cine ni a los parques. El peor año llegó en 1952, cuando Estados Unidos registró casi 58,000 casos.",
          "Ese mismo año, Jonas Salk, un investigador de la Universidad de Pittsburgh, empezó a probar una vacuna hecha con virus muerto por medio de una sustancia química. Un virus muerto no podía causar la enfermedad, pero quizá sí podía enseñarle al cuerpo a defenderse. Primero la probó en grupos pequeños de voluntarios, y en 1953 se la aplicó a sí mismo, a su esposa y a sus tres hijos.",
          "Luego vino la prueba médica más grande que el país había visto. En 1954 participaron unos 1.8 millones de escolares, a quienes llamaron los Pioneros de la Polio. Algunos recibieron la vacuna, otros recibieron una inyección inofensiva que se veía igual, y otros simplemente fueron observados para comparar. Voluntarios, muchos de ellos padres de familia, ayudaron a atender las clínicas.",
          "El 12 de abril de 1955, después de casi un año de estudiar los resultados, los investigadores anunciaron que la vacuna era segura y eficaz. En algunos pueblos repicaron las campanas de las iglesias, y la vacuna se aprobó ese mismo día. Cuando un periodista de televisión le preguntó a Salk quién era el dueño de la patente, él respondió que no había patente y preguntó si acaso se podía patentar el sol.",
          "En los primeros años de la década de 1960 empezó a usarse la vacuna de Albert Sabin, hecha con virus vivo debilitado, que se podía tomar por la boca en lugar de inyectarse, lo que facilitaba dársela a millones de personas. Los casos en Estados Unidos bajaron muchísimo. El último caso de polio causado por el virus salvaje que se contagió dentro del país ocurrió en 1979, y hoy la enfermedad sobrevive solo en unas pocas partes del mundo.",
        ],
      },
    ],
    qs: [
      q(
        "structure.section",
        ["wrong-section-role", "wrong-section-role", "not-in-text"],
        [
          "What is the role of paragraph 1 in the passage?",
          "It shows how feared polio was, which explains why the vaccine mattered so much.",
          ["It explains how Jonas Salk made his vaccine from a virus that had been killed with a chemical.", "It describes the 1954 test of the vaccine on schoolchildren.", "It argues that public pools should have stayed open in the summer."],
          ["Summer, when polio spread most easily, became a season of fear."],
          "Before the history of the vaccine begins, paragraph 1 sets the stakes: closed pools, frightened parents, and tens of thousands of cases a year.",
        ],
        [
          "¿Qué función tiene el párrafo 1 en el texto?",
          "Muestra cuánto se temía a la polio, lo que explica por qué la vacuna importaba tanto.",
          ["Explica cómo Jonas Salk hizo su vacuna con un virus muerto por medio de una sustancia química.", "Describe la prueba de 1954 de la vacuna en escolares.", "Defiende que las piscinas públicas debieron seguir abiertas en verano."],
          ["El verano, cuando la polio se contagiaba con más facilidad, se volvió una temporada de miedo."],
          "Antes de que empiece la historia de la vacuna, el párrafo 1 muestra lo que estaba en juego: piscinas cerradas, padres asustados y decenas de miles de casos al año.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "contradicts-text"],
        [
          "What is the central idea of the passage?",
          "Years of research and a huge public trial produced vaccines that ended the spread of polio in the United States.",
          ["About 1.8 million schoolchildren took part in the 1954 vaccine trial.", "Scientists work hard to solve many problems.", "Jonas Salk's vaccine failed in the 1954 trial, so polio is still a common disease in the United States today."],
          ["Cases in the United States fell sharply."],
          "The passage moves from the fear of polio, through Salk's research and the 1954 trial, to the vaccines that stopped the disease from spreading in the country.",
        ],
        [
          "¿Cuál es la idea central del texto?",
          "Años de investigación y una enorme prueba pública dieron vacunas que acabaron con el contagio de la polio en Estados Unidos.",
          ["Unos 1.8 millones de escolares participaron en la prueba de la vacuna de 1954.", "Los científicos trabajan mucho para resolver muchos problemas.", "La vacuna de Jonas Salk fracasó en la prueba de 1954, así que la polio sigue siendo común en Estados Unidos."],
          ["Los casos en Estados Unidos bajaron muchísimo."],
          "El texto va del miedo a la polio, pasando por la investigación de Salk y la prueba de 1954, hasta las vacunas que acabaron con el contagio de la enfermedad en el país.",
        ],
      ),
      q(
        "infer.what",
        ["not-in-text", "contradicts-text", "overgeneralizes"],
        [
          "Why might the trial have included children who received “a harmless look-alike shot”?",
          "Comparing them with vaccinated children would show whether the vaccine itself worked.",
          ["There was not enough vaccine for every child, so some of them had to wait for a second batch.", "The look-alike shot was a second, weaker kind of polio vaccine being tested at the same time.", "Every medical test must use exactly two groups of children."],
          ["others were simply watched for comparison"],
          "If vaccinated children got polio far less often than children who got the look-alike shot, the difference had to come from the vaccine. The passage says the groups were there “for comparison.”",
        ],
        [
          "¿Por qué la prueba habrá incluido a niños que recibieron “una inyección inofensiva que se veía igual”?",
          "Compararlos con los niños vacunados mostraría si la vacuna en sí funcionaba.",
          ["No alcanzaba la vacuna para todos los niños, así que algunos tuvieron que esperar otro lote.", "La inyección que se veía igual era otro tipo de vacuna contra la polio, más débil, que se probaba al mismo tiempo.", "Toda prueba médica debe usar exactamente dos grupos de niños."],
          ["otros simplemente fueron observados para comparar"],
          "Si los niños vacunados enfermaban de polio mucho menos que los que recibieron la inyección que se veía igual, la diferencia tenía que venir de la vacuna. El texto dice que los grupos estaban ahí “para comparar”.",
        ],
      ),
      q(
        "words.connotation",
        ["too-literal", "opposite-tone", "not-in-text"],
        [
          "In paragraph 1, the author says summer “became a season of fear.” What does this phrase suggest?",
          "A time usually linked with fun turned into a time of worry.",
          ["Summer weather became dangerously hot during the 1950s.", "Families looked forward to summer more than ever.", "Doctors could study polio only in summer."],
          ["Public pools closed"],
          "Summer usually means pools, movies, and playgrounds. Calling it a “season of fear” shows how polio turned those pleasures into risks.",
        ],
        [
          "En el párrafo 1, el autor dice que el verano “se volvió una temporada de miedo”. ¿Qué sugiere esta frase?",
          "Una época que suele asociarse con la diversión se convirtió en una época de preocupación.",
          ["El clima de verano se volvió peligrosamente caluroso en la década de 1950.", "Las familias esperaban el verano con más ganas que nunca.", "Los médicos solo podían estudiar la polio en verano."],
          ["Cerraban las piscinas públicas"],
          "El verano suele significar piscinas, cine y parques. Llamarlo una “temporada de miedo” muestra cómo la polio convirtió esos gustos en riesgos.",
        ],
      ),
    ],
  },
  {
    id: "comets-asteroids",
    level: 2,
    genre: "informational",
    structure: {
      kind: "compare-contrast",
      en: [["Both", "but they", "on the other hand", "looks the same"], "The passage sets asteroids and comets side by side: what they share, then how their makeup, orbits, and appearance differ."],
      es: [["Ambos", "pero", "en cambio", "se ve igual"], "El texto pone lado a lado los asteroides y los cometas: lo que tienen en común y luego cómo se diferencian su composición, sus órbitas y su aspecto."],
    },
    en: [
      {
        title: "Comets and Asteroids: Leftovers from the Beginning",
        paras: [
          "About 4.6 billion years ago, the planets formed from a huge, spinning cloud of gas and dust around the young Sun. Not all of that material ended up in planets. Billions of smaller pieces were left over, and they are still out there. Scientists sort most of them into two groups: asteroids and comets. Both are leftovers from the birth of the solar system, but they differ in what they are made of, where they travel, and how they look.",
          "Asteroids are made mostly of rock and metal. Most of them orbit the Sun in the asteroid belt, a wide ring between Mars and Jupiter. They range from boulders to the dwarf planet Ceres, which is nearly 600 miles across. Seen through a telescope, an asteroid is just a dim point of light, because it gives off nothing except the sunlight it reflects.",
          "Comets, on the other hand, are mixtures of ice, dust, and rock, sometimes called dirty snowballs. Most of them spend their lives far beyond Neptune, in the cold outer edges of the solar system. Many comets travel on long, stretched-out orbits that bring them close to the Sun only rarely. Halley's Comet, for example, returns about every 76 years.",
          "The biggest difference appears when a comet nears the Sun. Its ice heats up and turns into gas, which carries dust away with it. This forms a glowing cloud around the comet's center and one or more tails that can stretch for millions of miles, pointing away from the Sun. An asteroid, in contrast, usually looks the same near the Sun as it does anywhere else.",
          "Studying both kinds of leftovers helps scientists understand what the early solar system was like. Some researchers even think that comets and asteroids that crashed into the young Earth may have delivered some of its water.",
        ],
      },
    ],
    es: [
      {
        title: "Cometas y asteroides: restos del principio",
        paras: [
          "Hace unos 4,600 millones de años, los planetas se formaron a partir de una nube enorme de gas y polvo que giraba alrededor del Sol joven. No todo ese material terminó en planetas. Sobraron miles de millones de pedazos más pequeños, y todavía siguen ahí. Los científicos clasifican la mayoría en dos grupos: asteroides y cometas. Ambos son restos del nacimiento del sistema solar, pero se diferencian en de qué están hechos, por dónde viajan y cómo se ven.",
          "Los asteroides están hechos sobre todo de roca y metal. La mayoría gira alrededor del Sol en el cinturón de asteroides, un anillo ancho entre Marte y Júpiter. Van desde peñascos hasta el planeta enano Ceres, que mide casi 600 millas de un lado a otro. Visto con un telescopio, un asteroide es apenas un punto de luz tenue, porque no despide nada más que la luz del sol que refleja.",
          "Los cometas, en cambio, son mezclas de hielo, polvo y roca, y a veces se les llama bolas de nieve sucias. La mayoría pasa su vida mucho más allá de Neptuno, en los bordes fríos del sistema solar. Muchos cometas viajan en órbitas largas y alargadas que solo de vez en cuando los acercan al Sol. El cometa Halley, por ejemplo, regresa más o menos cada 76 años.",
          "La diferencia más grande aparece cuando un cometa se acerca al Sol. Su hielo se calienta y se convierte en gas, que arrastra polvo consigo. Así se forma una nube brillante alrededor del centro del cometa y una o más colas que pueden extenderse millones de millas, del lado contrario al Sol. Un asteroide, en contraste, por lo general se ve igual cerca del Sol que en cualquier otro lugar.",
          "Estudiar los dos tipos de restos ayuda a los científicos a entender cómo era el sistema solar en sus inicios. Algunos investigadores incluso piensan que los cometas y asteroides que chocaron contra la Tierra joven pudieron haberle traído parte de su agua.",
        ],
      },
    ],
    qs: [
      q(
        "structure.section",
        ["wrong-section-role", "wrong-section-role", "not-in-text"],
        [
          "How does paragraph 4 build on paragraphs 2 and 3?",
          "After each object is described on its own, it shows the most visible way they differ.",
          ["It introduces asteroids for the first time and explains where they orbit.", "It explains how the planets formed from a huge, spinning cloud of gas and dust around the young Sun.", "It argues that comets are more important to study than asteroids."],
          ["The biggest difference appears when a comet nears the Sun."],
          "Paragraphs 2 and 3 describe asteroids and then comets. Paragraph 4 brings them together around the clearest contrast: a comet grows a glowing cloud and tails near the Sun, and an asteroid does not.",
        ],
        [
          "¿Cómo se apoya el párrafo 4 en los párrafos 2 y 3?",
          "Después de que se describe cada objeto por separado, muestra la manera más visible en que se diferencian.",
          ["Presenta los asteroides por primera vez y explica dónde giran.", "Explica cómo se formaron los planetas a partir de una nube enorme de gas y polvo que giraba alrededor del Sol joven.", "Defiende que es más importante estudiar los cometas que los asteroides."],
          ["La diferencia más grande aparece cuando un cometa se acerca al Sol."],
          "Los párrafos 2 y 3 describen los asteroides y luego los cometas. El párrafo 4 los junta alrededor del contraste más claro: cerca del Sol, al cometa le salen una nube brillante y colas, y al asteroide no.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "contradicts-text"],
        [
          "What is the central idea of the passage?",
          "Comets and asteroids both formed with the solar system, but they differ in makeup, orbits, and appearance.",
          ["Halley's Comet, a famous mix of ice, dust, and rock, returns to the inner solar system about every 76 years.", "Space is full of interesting objects.", "Comets and asteroids are really the same kind of object, made of the same materials and simply known by two different names."],
          ["Both are leftovers from the birth of the solar system"],
          "Paragraph 1 states what the two share and how they will differ, and the rest of the passage explains those differences one by one.",
        ],
        [
          "¿Cuál es la idea central del texto?",
          "Los cometas y los asteroides se formaron con el sistema solar, pero son distintos en su composición, sus órbitas y su aspecto.",
          ["El cometa Halley, una famosa mezcla de hielo, polvo y roca, regresa al interior del sistema solar más o menos una vez cada 76 años.", "El espacio está lleno de objetos interesantes.", "Los cometas y los asteroides son en realidad el mismo tipo de objeto, hechos de los mismos materiales y conocidos simplemente con dos nombres distintos."],
          ["Ambos son restos del nacimiento del sistema solar"],
          "El párrafo 1 dice lo que tienen en común y en qué serán distintos, y el resto del texto explica esas diferencias una por una.",
        ],
      ),
      q(
        "infer.what",
        ["contradicts-text", "contradicts-text", "overgeneralizes"],
        [
          "Based on the passage, why can people on Earth see a comet's tail only once in a long while?",
          "Tails form only near the Sun, and many comets come close only rarely.",
          ["Comets grow their tails only in the coldest, darkest parts of space, far from the Sun.", "A comet's tail always points toward Earth, so the comet's center hides it.", "No comet ever comes close enough to Earth to be seen."],
          ["Many comets travel on long, stretched-out orbits that bring them close to the Sun only rarely."],
          "The tail appears when a comet's ice heats up near the Sun. Because many comets reach the Sun only after long journeys, the tail is a rare sight.",
        ],
        [
          "Según el texto, ¿por qué desde la Tierra solo se puede ver la cola de un cometa muy de vez en cuando?",
          "Las colas se forman solo cerca del Sol, y muchos cometas se acercan muy pocas veces.",
          ["Los cometas forman su cola solo en las partes más frías y oscuras del espacio, lejos del Sol.", "La cola de un cometa siempre apunta hacia la Tierra, así que el centro del cometa la tapa.", "Ningún cometa se acerca nunca lo suficiente a la Tierra para verse."],
          ["Muchos cometas viajan en órbitas largas y alargadas que solo de vez en cuando los acercan al Sol."],
          "La cola aparece cuando el hielo del cometa se calienta cerca del Sol. Como muchos cometas llegan al Sol solo después de viajes larguísimos, la cola se ve pocas veces.",
        ],
      ),
      q(
        "words.figurative",
        ["too-literal", "not-in-text", "not-in-text"],
        [
          "Why does the author say comets are “sometimes called dirty snowballs”?",
          "The nickname captures what comets are made of: ice mixed with dust and rock.",
          ["Comets are made of the same white snow that falls on Earth during the winter months.", "Comets are dangerous and should be avoided.", "Comets are dirty because asteroids keep crashing into them and leaving dust behind."],
          ["mixtures of ice, dust, and rock"],
          "A snowball is ice, and dirt makes it gritty and dark. The nickname is a quick picture of a comet's mix of ice, dust, and rock, not a claim that it is real snow.",
        ],
        [
          "¿Por qué el texto dice que a los cometas “a veces se les llama bolas de nieve sucias”?",
          "El apodo describe de qué están hechos los cometas: hielo mezclado con polvo y roca.",
          ["Los cometas están hechos de la misma nieve blanca que cae en la Tierra durante los meses de invierno.", "Los cometas son peligrosos y hay que evitarlos.", "Los cometas están sucios porque los asteroides chocan contra ellos todo el tiempo y les dejan polvo."],
          ["mezclas de hielo, polvo y roca"],
          "Una bola de nieve es hielo, y la tierra la vuelve oscura y arenosa. El apodo es una imagen rápida de la mezcla de hielo, polvo y roca de un cometa, no una afirmación de que sea nieve de verdad.",
        ],
      ),
    ],
  },
  {
    id: "aral-sea",
    level: 2,
    genre: "informational",
    structure: {
      kind: "cause-effect",
      en: [["as a result", "which led to", "Without it"], "The passage names the cause, water taken from the sea's rivers, and then traces the effects on the fish, the people, the air, and the weather."],
      es: [["como resultado", "lo que provocó", "Sin ella"], "El texto nombra la causa, el agua que se les quitó a los ríos del mar, y luego sigue los efectos en los peces, la gente, el aire y el clima."],
    },
    en: [
      {
        title: "How a Sea Disappeared",
        paras: [
          "In 1960, the Aral Sea in Central Asia was the fourth-largest lake in the world. Fishing boats worked its waters, and towns along its shores canned tens of thousands of tons of fish each year. Today much of that sea is gone. Where waves once broke, there is a desert of sand and salt, and rusting ships sit on dry ground.",
          "The main cause was a decision made far upstream. The Aral Sea had no outlet; it was fed by two great rivers, the Amu Darya and the Syr Darya. In the 1960s, the government of the Soviet Union began diverting huge amounts of water from both rivers through canals to irrigate cotton fields in the desert. The cotton grew, but as a result, far less water reached the sea, and it began to shrink.",
          "The effects spread in every direction. As the water level dropped, the sea became saltier, and most of its native fish died. The fishing industry collapsed, which led to thousands of people losing their work. Winds picked up salt and dust from the exposed seabed, laced with farm chemicals, and carried them across the region. Doctors reported rising rates of breathing problems in nearby communities.",
          "Even the weather changed. A large body of water softens the climate around it. Without it, summers near the old shoreline became hotter and winters colder.",
          "There is one hopeful chapter. In 2005, Kazakhstan finished a dam that keeps the water of the Syr Darya in the northern part of the sea. Since then, that smaller northern sea has risen, its water has become less salty, and fish have returned. The larger southern part, however, continues to dry up.",
        ],
      },
    ],
    es: [
      {
        title: "Cómo desapareció un mar",
        paras: [
          "En 1960, el mar de Aral, en Asia Central, era el cuarto lago más grande del mundo. Los barcos pesqueros recorrían sus aguas, y los pueblos de sus orillas enlataban decenas de miles de toneladas de pescado cada año. Hoy gran parte de ese mar ya no existe. Donde antes rompían las olas hay un desierto de arena y sal, y barcos oxidados descansan sobre tierra seca.",
          "La causa principal fue una decisión que se tomó muy río arriba. El mar de Aral no tenía salida; lo alimentaban dos grandes ríos, el Amu Daria y el Sir Daria. En la década de 1960, el gobierno de la Unión Soviética empezó a desviar enormes cantidades de agua de los dos ríos por medio de canales para regar campos de algodón en el desierto. El algodón creció, pero como resultado llegaba mucha menos agua al mar, y este empezó a encogerse.",
          "Los efectos se extendieron en todas direcciones. Al bajar el nivel del agua, el mar se volvió más salado, y casi todos sus peces nativos murieron. La industria pesquera se vino abajo, lo que provocó que miles de personas perdieran su trabajo. El viento levantaba sal y polvo del fondo del mar que había quedado al descubierto, impregnado de químicos agrícolas, y los llevaba por toda la región. Los médicos informaron que aumentaban los problemas respiratorios en las comunidades cercanas.",
          "Hasta el clima cambió. Una gran masa de agua suaviza el clima a su alrededor. Sin ella, los veranos cerca de la antigua orilla se volvieron más calurosos y los inviernos más fríos.",
          "Hay un capítulo con esperanza. En 2005, Kazajistán terminó una presa que retiene el agua del Sir Daria en la parte norte del mar. Desde entonces, ese mar del norte, más pequeño, ha subido, su agua se ha vuelto menos salada y los peces han regresado. La parte sur, más grande, en cambio, se sigue secando.",
        ],
      },
    ],
    qs: [
      q(
        "structure.section",
        ["wrong-section-role", "wrong-section-role", "not-in-text"],
        [
          "What is the role of paragraph 2?",
          "It explains the main cause of the shrinking: water taken from the sea's rivers.",
          ["It describes how the salty dust harmed people's health.", "It describes the dam that helped the northern sea recover.", "It argues that cotton should never be grown in a desert."],
          ["The main cause was a decision made far upstream."],
          "Paragraph 1 shows what was lost. Paragraph 2 explains why: the rivers that fed the sea were turned into canals for cotton. The paragraphs after it describe the effects.",
        ],
        [
          "¿Qué función tiene el párrafo 2?",
          "Explica la causa principal de que el mar se encogiera: el agua que se les quitó a sus ríos.",
          ["Describe cómo el polvo salado dañó la salud de la gente.", "Describe la presa que ayudó a recuperar el mar del norte.", "Defiende que nunca se debería cultivar algodón en un desierto."],
          ["La causa principal fue una decisión que se tomó muy río arriba."],
          "El párrafo 1 muestra lo que se perdió. El párrafo 2 explica por qué: los ríos que alimentaban el mar se desviaron por canales para el algodón. Los párrafos siguientes describen los efectos.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "contradicts-text"],
        [
          "What is the central idea of the passage?",
          "Diverting the Aral Sea's rivers for farming made it shrink, which seriously harmed the region.",
          ["Kazakhstan finished a dam on the Syr Darya in 2005, and fish have returned to the northern part of the sea.", "Water is important to people everywhere.", "The Aral Sea dried up because of a long natural drought in Central Asia that no one could have prevented."],
          ["far less water reached the sea, and it began to shrink"],
          "The passage explains one human cause, the diverted rivers, and then traces its many effects on the sea and the people around it.",
        ],
        [
          "¿Cuál es la idea central del texto?",
          "Desviar los ríos del mar de Aral para la agricultura lo hizo encogerse y causó graves daños a la región.",
          ["Kazajistán terminó una presa en el Sir Daria en 2005, y los peces han vuelto a la parte norte del mar de Aral.", "El agua es importante para la gente de todas partes.", "El mar de Aral se secó por una larga sequía natural en Asia Central que nadie en la región pudo haber evitado."],
          ["llegaba mucha menos agua al mar, y este empezó a encogerse"],
          "El texto explica una causa humana, los ríos desviados, y luego sigue sus muchos efectos en el mar y en la gente que vive cerca.",
        ],
      ),
      q(
        "infer.what",
        ["not-in-text", "not-in-text", "overgeneralizes"],
        [
          "Why did fish return only to the northern part of the sea?",
          "The dam kept river water there, so that part grew deeper and less salty.",
          ["People stopped fishing in the northern part of the sea after the dam was finished in 2005.", "The southern part of the sea is too cold in winter for any fish to survive there.", "Fish always return to any lake after a few years."],
          ["its water has become less salty, and fish have returned"],
          "Salt killed the fish when the sea shrank. The dam holds the river's fresh water in the north, so only that part has become less salty and full enough for fish.",
        ],
        [
          "¿Por qué los peces regresaron solo a la parte norte del mar?",
          "La presa retuvo ahí el agua del río, así que esa parte se hizo más profunda y menos salada.",
          ["La gente dejó de pescar en la parte norte del mar después de que se terminó la presa en 2005.", "La parte sur del mar es demasiado fría en invierno para que cualquier pez pueda sobrevivir ahí.", "Los peces siempre regresan a cualquier lago después de unos años."],
          ["su agua se ha vuelto menos salada y los peces han regresado"],
          "La sal mató a los peces cuando el mar se encogió. La presa retiene el agua dulce del río en el norte, así que solo esa parte se volvió menos salada y con agua suficiente para los peces.",
        ],
      ),
      q(
        "words.connotation",
        ["too-literal", "wrong-context-meaning", "opposite-tone"],
        [
          "In paragraph 3, the author writes that the dust was “laced with farm chemicals.” What does the word “laced” suggest?",
          "Harmful chemicals were mixed all through the dust.",
          ["The dust was tied together with string.", "The dust was decorated with pretty patterns and nice to look at.", "Only a tiny, harmless amount of chemicals was present."],
          ["Doctors reported rising rates of breathing problems"],
          "When something is “laced” with a substance, the substance is mixed all through it, usually something harmful. The next sentence, about breathing problems, shows why the word fits.",
        ],
        [
          "En el párrafo 3, el autor escribe que el polvo estaba “impregnado de químicos agrícolas”. ¿Qué sugiere la palabra “impregnado”?",
          "Los químicos dañinos estaban mezclados por todo el polvo.",
          ["El polvo estaba empapado del agua salada que quedaba en el fondo del mar.", "El polvo olía a perfume.", "Solo había una cantidad diminuta e inofensiva de químicos."],
          ["Los médicos informaron que aumentaban los problemas respiratorios"],
          "Cuando algo está “impregnado” de una sustancia, la sustancia está metida por todas partes, y aquí es algo dañino. La oración siguiente, sobre los problemas respiratorios, muestra por qué la palabra encaja.",
        ],
      ),
    ],
  },
  {
    id: "apollo-13",
    level: 2,
    genre: "informational",
    structure: {
      kind: "problem-solution",
      en: [["find a fix", "tried", "the design that worked"], "The passage is built around one problem: after the explosion it narrows the danger to the canisters that would not fit, then shows the attempts and the fix that saved the crew."],
      es: [["arreglarlo", "Intentaron", "el diseño que funcionó"], "El texto se organiza alrededor de un problema: después de la explosión reduce el peligro a los cartuchos que no encajaban, y luego muestra los intentos y el arreglo que salvó a la tripulación."],
    },
    en: [
      {
        title: "A Square Peg in a Round Hole",
        paras: [
          "In 1970, Apollo 13 was about 200,000 miles from Earth, on its way to the Moon, when an oxygen tank exploded in the service module. The blast knocked out most of the spacecraft's power and much of its oxygen. Landing on the Moon was suddenly out of the question. The new goal was to bring astronauts Jim Lovell, Jack Swigert, and Fred Haise home alive.",
          "The crew moved into the lunar module, the small lander they had planned to take to the Moon's surface, and used it as a lifeboat. But it had been built to support two men for about two days, not three men for nearly four. That created a deadly new problem: carbon dioxide. Every breath the astronauts let out added more of the gas to the cabin, and too much of it would poison them.",
          "The lunar module cleaned the air with canisters of a chemical that absorbs carbon dioxide, but it did not carry enough for the whole trip. The command module had plenty of spare canisters. The trouble was their shape. The command module's canisters were square, and the lunar module's openings were round.",
          "In Houston, a team of engineers set out to find a fix using only items the astronauts had on board. They tried designs with plastic bags, cardboard covers torn from the flight plan, a sock, and gray duct tape. They read the instructions for the design that worked to the crew over the radio, one step at a time. The astronauts built the device, nicknamed the mailbox, and the carbon dioxide levels dropped.",
          "The crew made it home, splashing down safely in the Pacific Ocean. Apollo 13 never reached the Moon, but NASA has often called it a successful failure, because a team turned a disaster into a rescue with nothing but careful thinking and the materials at hand.",
        ],
      },
    ],
    es: [
      {
        title: "Un cuadrado en un hoyo redondo",
        paras: [
          "En 1970, el Apolo 13 estaba a unas 200,000 millas de la Tierra, rumbo a la Luna, cuando explotó un tanque de oxígeno en el módulo de servicio. La explosión dejó a la nave sin la mayor parte de su energía y sin buena parte de su oxígeno. De pronto, aterrizar en la Luna era imposible. La nueva meta era traer de vuelta con vida a los astronautas Jim Lovell, Jack Swigert y Fred Haise.",
          "La tripulación se pasó al módulo lunar, el pequeño vehículo con el que pensaban bajar a la superficie de la Luna, y lo usó como bote salvavidas. Pero lo habían construido para mantener a dos hombres durante unos dos días, no a tres hombres durante casi cuatro. Eso creó un nuevo problema mortal: el dióxido de carbono. Cada vez que los astronautas exhalaban, el gas se acumulaba en la cabina, y demasiado de él los envenenaría.",
          "El módulo lunar limpiaba el aire con cartuchos de una sustancia química que absorbe el dióxido de carbono, pero no llevaba suficientes para todo el viaje. El módulo de mando tenía muchos cartuchos de repuesto. El problema era su forma. Los cartuchos del módulo de mando eran cuadrados, y las aberturas del módulo lunar eran redondas.",
          "En Houston, un equipo de ingenieros se propuso encontrar cómo arreglarlo usando solo cosas que los astronautas tenían a bordo. Intentaron diseños con bolsas de plástico, cubiertas de cartón arrancadas del plan de vuelo, un calcetín y cinta adhesiva gris. Les leyeron por radio a los astronautas, paso por paso, las instrucciones del diseño que funcionó. Los astronautas armaron el aparato, al que apodaron el buzón, y los niveles de dióxido de carbono bajaron.",
          "La tripulación volvió a casa y cayó sana y salva en el océano Pacífico. El Apolo 13 nunca llegó a la Luna, pero la NASA lo ha llamado muchas veces un fracaso exitoso, porque un equipo convirtió un desastre en un rescate solo con pensamiento cuidadoso y los materiales que tenía a mano.",
        ],
      },
    ],
    qs: [
      q(
        "structure.section",
        ["wrong-section-role", "wrong-section-role", "not-in-text"],
        [
          "What is the purpose of paragraph 3?",
          "It narrows the danger down to one specific problem: the canisters did not fit.",
          ["It describes how engineers built the device that fixed it.", "It tells how the mission ended in the Pacific Ocean.", "It argues that the spacecraft was badly designed from the start."],
          ["The trouble was their shape."],
          "Paragraph 2 names the danger, carbon dioxide. Paragraph 3 pins down exactly what stood in the way, square canisters and round openings, so the solution in paragraph 4 makes sense.",
        ],
        [
          "¿Cuál es el propósito del párrafo 3?",
          "Reduce el peligro a un problema específico: los cartuchos no encajaban.",
          ["Describe cómo los ingenieros armaron el aparato.", "Cuenta cómo terminó la misión en el océano Pacífico.", "Defiende que la nave estaba mal diseñada desde el principio."],
          ["El problema era su forma."],
          "El párrafo 2 nombra el peligro, el dióxido de carbono. El párrafo 3 precisa qué era lo que estorbaba, cartuchos cuadrados y aberturas redondas, para que la solución del párrafo 4 tenga sentido.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "contradicts-text"],
        [
          "What is the central idea of the passage?",
          "After an explosion, engineers and astronauts improvised a fix for deadly carbon dioxide and brought the crew home.",
          ["The command module's canisters were square, while the openings in the lunar module, where they had to fit, were round.", "Space travel can be dangerous.", "Apollo 13 still landed on the Moon as planned and collected rocks, even though an oxygen tank exploded on the way there."],
          ["the carbon dioxide levels dropped"],
          "The passage follows one emergency from the explosion to the improvised mailbox to the safe splashdown.",
        ],
        [
          "¿Cuál es la idea central del texto?",
          "Tras una explosión, ingenieros y astronautas improvisaron un remedio contra el dióxido de carbono y salvaron a la tripulación.",
          ["Los cartuchos del módulo de mando eran cuadrados, mientras que las aberturas del módulo lunar, donde tenían que encajar, eran redondas.", "Viajar al espacio puede ser peligroso.", "El Apolo 13 aterrizó en la Luna como estaba planeado y los astronautas recogieron rocas, aunque un tanque de oxígeno había explotado en el camino de ida."],
          ["los niveles de dióxido de carbono bajaron"],
          "El texto sigue una emergencia desde la explosión hasta el buzón improvisado y el regreso a salvo.",
        ],
      ),
      q(
        "infer.what",
        ["not-in-text", "not-in-text", "overgeneralizes"],
        [
          "Why did the engineers limit themselves to “items the astronauts had on board”?",
          "Nothing new could be sent to a spacecraft that far from Earth.",
          ["NASA wanted to save money on spare parts.", "The astronauts refused to use any new equipment that had not been tested in space.", "Engineers always prefer to work with old materials rather than new ones."],
          ["Apollo 13 was about 200,000 miles from Earth"],
          "The spacecraft was hundreds of thousands of miles away, so no one could deliver a new part. Whatever the fix was, it had to be built from what was already inside.",
        ],
        [
          "¿Por qué los ingenieros se limitaron a “cosas que los astronautas tenían a bordo”?",
          "No se podía mandar nada nuevo a una nave que estaba tan lejos de la Tierra.",
          ["La NASA quería ahorrar dinero en piezas de repuesto.", "Los astronautas se negaron a usar cualquier equipo nuevo que no se hubiera probado en el espacio.", "Los ingenieros siempre prefieren trabajar con materiales viejos en lugar de nuevos."],
          ["el Apolo 13 estaba a unas 200,000 millas de la Tierra"],
          "La nave estaba a cientos de miles de millas, así que nadie podía llevarle una pieza nueva. La solución, fuera cual fuera, tenía que armarse con lo que ya había adentro.",
        ],
      ),
      q(
        "words.connotation",
        ["contradicts-text", "contradicts-text", "not-in-text"],
        [
          "What does the phrase “successful failure” suggest about Apollo 13?",
          "It failed at its goal but achieved something that mattered more.",
          ["The mission was a complete success from start to finish, with nothing going wrong.", "The mission was a disaster from start to finish, with nothing good about it.", "NASA was embarrassed by the mission and tried to hide what had happened."],
          ["a team turned a disaster into a rescue"],
          "The two words seem to cancel out. Together they say that Apollo 13 failed to reach the Moon but succeeded in bringing the crew home, which mattered more.",
        ],
        [
          "¿Qué sugiere la frase “fracaso exitoso” sobre el Apolo 13?",
          "No logró su meta, pero logró algo que importaba más.",
          ["La misión fue un éxito total de principio a fin, sin que nada saliera mal.", "La misión fue un desastre de principio a fin, sin nada bueno.", "La NASA se avergonzó de la misión e intentó ocultar lo que había pasado."],
          ["un equipo convirtió un desastre en un rescate"],
          "Las dos palabras parecen anularse. Juntas dicen que el Apolo 13 no llegó a la Luna, pero sí logró traer de vuelta a la tripulación, lo que importaba más.",
        ],
      ),
    ],
  },
];
