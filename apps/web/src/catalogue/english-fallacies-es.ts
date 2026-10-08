import type { CatalogueEntry } from "./types";

// Practice skills this course teaches toward: e.fallacies (the same eight names the practice bank uses), e.claim.evidence.

const falaciasEs: CatalogueEntry = {
  id: "english-fallacies-es",
  title: "Detecta la falacia",
  summary: "Reconoce ocho errores comunes de razonamiento, del ataque personal al falso dilema, y responde a cada uno con una pregunta justa.",
  subject: "english",
  grade: "8",
  locale: "es",
  lessons: [
    {
      id: "attacks",
      title: "Atacar a la persona, deformar la idea",
      summary: "Una falacia es un eslabón roto en el razonamiento. Dos de las más comunes apuntan al blanco equivocado: la persona o una copia falsa de su idea.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Un eslabón roto",
          blocks: [
            {
              type: "text",
              text: "Don Ernesto dice que hace falta un semáforo en la esquina de la escuela. Alguien responde: “Ni siquiera sabe usar su celular, así que no le hagas caso”.",
            },
            { type: "text", text: "Esa respuesta parece una razón, pero no dice nada de la esquina. Es una falacia." },
            {
              type: "text",
              text: "Un argumento da razones para apoyar una afirmación. Una falacia es un error en ese razonamiento: las razones no apoyan de verdad la afirmación, aunque suenen convincentes.",
            },
            {
              type: "points",
              items: [
                "Una falacia puede hacer que un argumento débil parezca fuerte.",
                "Encontrar una no demuestra que la afirmación sea falsa. Demuestra que este argumento no la ha probado.",
                "Las falacias aparecen en anuncios, discursos, comentarios en redes y también en nuestros propios argumentos.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Ataque personal (ad hominem)",
          blocks: [
            {
              type: "text",
              text: "Ad hominem es una expresión latina que significa “dirigido a la persona”. Esta falacia ataca a quien da el argumento en lugar de responder al argumento.",
            },
            {
              type: "text",
              text: "“Don Ernesto dice que hace falta un semáforo en la esquina de la escuela, pero ni siquiera sabe usar su celular, así que no le hagas caso”.",
            },
            {
              type: "text",
              text: "Que sepa usar o no su celular no tiene nada que ver con si la esquina es peligrosa. Para responderle, hay que hablar de la esquina.",
            },
            {
              type: "text",
              text: "No todo comentario sobre una persona es una falacia. Si alguien te da datos, es justo preguntar si conoce el tema o si gana algo con que le creas. Se vuelve falacia cuando el ataque sustituye la respuesta a sus razones.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Hombre de paja: pelear contra una copia falsa",
          blocks: [
            {
              type: "text",
              text: "El hombre de paja deforma el argumento de alguien en una versión más débil o más exagerada, y luego ataca esa versión. Un muñeco de paja es fácil de tumbar; el argumento real sigue en pie.",
            },
            {
              type: "points",
              items: [
                "Argumento real: “La cafetería debería tener un día a la semana sin bebidas azucaradas”.",
                "Respuesta de hombre de paja: “¿O sea que quieres prohibir todo lo dulce y que comamos puras verduras? Qué exageración”.",
                "Nadie habló de prohibir lo dulce. La respuesta ataca algo que nadie dijo.",
              ],
            },
            {
              type: "text",
              text: "Para evitarlo, resume con justicia la postura del otro antes de responder. Si la otra persona estaría de acuerdo con tu resumen, estás discutiendo con la idea real.",
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "¿Qué jugada es?",
          prompt: "Clasifica cada respuesta. ¿Es un ataque personal, un hombre de paja o un argumento justo?",
          widget: {
            kind: "sorter",
            categories: ["Ataque personal", "Hombre de paja", "Argumento justo"],
            items: [
              { id: "recreo", text: "Diego propone diez minutos más de recreo. ¿O sea que quiere que nos pasemos el día jugando?", answer: 1 },
              { id: "prima", text: "Mi prima dice que deberíamos ahorrar agua, pero tiene once años. ¿Qué va a saber?", answer: 0 },
              { id: "datos-viejos", text: "Los datos que usa Diego son de hace treinta años, así que conviene revisar si siguen siendo ciertos.", answer: 2 },
              { id: "despeinada", text: "No le hagas caso a la propuesta de Valeria para la feria escolar. Siempre llega despeinada.", answer: 0 },
              { id: "excursion", text: "La excursión cuesta el doble de lo que el grupo ha juntado, así que este mes no nos alcanza.", answer: 2 },
              {
                id: "cavernas",
                text: "La maestra sugiere guardar los celulares durante la clase. Quiere quitarnos toda la tecnología y regresarnos a la época de las cavernas.",
                answer: 1,
              },
            ],
          },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "“No le creas a Andrés lo del torneo. Ni siquiera sabe amarrarse los cordones”. ¿Qué falacia es?",
              choices: ["Ataque personal", "Hombre de paja", "No hay falacia"],
              answer: 0,
              hint: "¿De qué habla la respuesta: del torneo o de Andrés?",
              explain: "La respuesta ataca los cordones de Andrés en lugar de lo que dijo sobre el torneo. Es un ataque personal.",
            },
            {
              id: "q2",
              prompt: "Lucía: “La escuela debería empezar media hora más tarde”. Andrés: “Lucía quiere que durmamos todo el día y no aprendamos nada”. ¿Qué hizo Andrés?",
              choices: [
                "Atacó el carácter de Lucía en vez de su idea",
                "Señaló un costo real de empezar más tarde",
                "Cambió la idea de Lucía por una versión exagerada",
                "Dio pruebas de que empezar tarde no funciona",
              ],
              answer: 2,
              hint: "Compara lo que dijo Lucía con lo que Andrés dice que ella quiere.",
              explain: "Lucía pidió media hora. Andrés finge que ella quiere dormir todo el día, una versión fácil de atacar. Es un hombre de paja.",
            },
            {
              id: "q3",
              prompt: "Encuentras una falacia en el argumento de alguien. ¿Qué te dice eso?",
              choices: [
                "Que la afirmación es falsa y ya no vale la pena pensarla",
                "Que la persona miente y sabe que la afirmación es falsa",
                "Que ganaste la discusión y el otro tiene que darte la razón",
                "Que el argumento falla; la afirmación aún podría ser cierta",
              ],
              answer: 3,
              hint: "Un eslabón roto habla del argumento, no de la conclusión.",
              explain:
                "Una falacia muestra que las razones no apoyan la afirmación. La afirmación podría ser cierta por otras razones, así que lo justo es buscar mejores pruebas.",
            },
            {
              id: "q4",
              prompt: "La señora Pérez propone que la biblioteca abra los domingos. ¿Qué respuesta discute su argumento en vez de atacarla a ella?",
              choices: [
                "“Nunca ha sabido administrar nada, así que no hay que confiar en sus planes”.",
                "“Solo quiere que abra los domingos para que le paguen más horas”.",
                "“Abrir el domingo requiere dos turnos más de personal, y el presupuesto acaba de bajar”.",
                "“A nadie en el barrio le cae bien la señora Pérez, así que su idea no va a llegar a ningún lado”.",
              ],
              answer: 2,
              hint: "¿Qué respuesta seguiría teniendo sentido aunque no supieras quién es la señora Pérez?",
              explain:
                "La respuesta sobre los turnos y el presupuesto discute la propuesta: lo que costaría y lo que se puede pagar. Las demás hablan de la señora Pérez, así que no tocan sus razones.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Bitácora de falacias",
          brief: "Lleva durante una semana una bitácora corta de ataques personales y hombres de paja que notes.",
          steps: [
            "Pon atención a las discusiones en anuncios, comentarios en redes, debates en la tele o conversaciones en familia.",
            "Cada vez que notes un ataque a una persona o una versión deformada de una idea, anota lo que se dijo.",
            "Junto a cada nota, escribe la versión justa: cuál era el argumento real o cuál sería una respuesta de verdad.",
            "Fíjate si tú lo hiciste también. A todos nos pasa a veces.",
            "Comparte una nota con alguien de tu casa y pregúntale si está de acuerdo en que es una falacia.",
          ],
        },
      ],
    },
    {
      id: "crowds-experts",
      title: "La multitud y los famosos",
      summary: "La popularidad y la fama pueden parecer pruebas. Aprende cuándo cuentan como pruebas y cuándo no.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Efecto arrastre: “todos lo hacen”",
          blocks: [
            {
              type: "text",
              text: "La falacia del efecto arrastre, también llamada ad populum, dice que algo es cierto o correcto porque mucha gente lo cree o lo hace.",
            },
            { type: "text", text: "“Este reto ya lo hicieron millones de personas en redes, así que no puede ser peligroso”." },
            { type: "text", text: "Que millones lo hayan hecho muestra que el reto es popular. No muestra que sea seguro." },
            {
              type: "text",
              text: "La popularidad sí es buena prueba cuando la afirmación trata de popularidad: “Fue el libro más prestado de la biblioteca este año”.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Falsa autoridad: el experto equivocado",
          blocks: [
            {
              type: "text",
              text: "Apelar a una autoridad se vuelve falacia cuando le creemos a alguien por ser famoso o importante, en un tema que no conoce.",
            },
            {
              type: "points",
              items: [
                "Falacia: “Un futbolista famoso dice que este cereal es el desayuno más sano, así que debe serlo”. Un futbolista no es experto en nutrición, y seguramente le pagan por decirlo.",
                "Justo: “Los especialistas en sueño recomiendan que los adolescentes duerman de 8 a 10 horas cada noche”. Son expertos en su campo y sus estudios coinciden.",
              ],
            },
            {
              type: "text",
              text: "Hazte tres preguntas. ¿Esta persona es experta justo en este tema? ¿Otros expertos opinan lo mismo? ¿Gana algo si le creo?",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Por qué nos funcionan",
          blocks: [
            {
              type: "text",
              text: "Las personas nos fijamos en lo que hacen los demás y en las caras conocidas. Casi siempre ese hábito nos sirve, y por eso los anuncios lo aprovechan.",
            },
            {
              type: "points",
              items: [
                "“Únete a los millones que ya lo usan”. Efecto arrastre.",
                "“El celular más vendido del país”. Efecto arrastre, a menos que solo hable de ventas.",
                "Una cantante famosa promocionando un producto del que no sabe nada especial. Falsa autoridad.",
              ],
            },
            { type: "text", text: "Darte cuenta del truco no significa que el producto sea malo. Significa que el anuncio todavía no te dio una razón real." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "¿Multitud, fama o prueba justa?",
          prompt: "Clasifica cada afirmación. ¿Es efecto arrastre, falsa autoridad o una prueba justa?",
          widget: {
            kind: "sorter",
            categories: ["Efecto arrastre", "Falsa autoridad", "Prueba justa"],
            items: [
              { id: "dentistas", text: "Los dentistas recomiendan cepillarse los dientes dos veces al día, así que yo lo hago.", answer: 2 },
              { id: "mochila", text: "Todos en mi salón ya tienen esa mochila, así que yo también la necesito.", answer: 0 },
              { id: "te", text: "Un cantante famoso dice que este té cura la gripe, así que voy a tomarlo.", answer: 1 },
              { id: "vistas", text: "Ese video tiene 50 millones de vistas, así que lo que dice sobre la historia debe ser cierto.", answer: 0 },
              { id: "huracan", text: "El servicio meteorológico emitió una alerta de huracán para nuestra costa, así que nos preparamos para salir.", answer: 2 },
              { id: "influencer", text: "Una influencer de videojuegos dice que este protector solar es el mejor, así que seguro lo es.", answer: 1 },
            ],
          },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "“Cuatro de cada cinco chicos de la escuela juegan este juego, así que es el mejor juego del mundo”. ¿Qué falacia es?",
              choices: ["Falsa autoridad", "Efecto arrastre", "Ataque personal", "Hombre de paja"],
              answer: 1,
              hint: "¿Qué razón se da para decir que es el mejor?",
              explain: "La única razón es cuántos chicos lo juegan. La popularidad no prueba que sea el mejor juego. Es efecto arrastre.",
            },
            {
              id: "q2",
              prompt: "¿Cuál es una apelación justa a la autoridad?",
              choices: [
                "Una vulcanóloga explica cómo se formó un volcán",
                "Un actor explica qué medicina funciona mejor",
                "Una cantante explica cómo arreglar un coche",
                "Un entrenador de fútbol explica qué celular tiene la mejor cámara",
              ],
              answer: 0,
              hint: "Busca a la persona que habla de su propio campo.",
              explain: "Una vulcanóloga estudia los volcanes. Los demás hablan de temas que no dominan, así que su fama no es una prueba.",
            },
            {
              id: "q3",
              prompt: "Un futbolista aparece en un anuncio de un banco. ¿Qué deberías preguntarte primero?",
              choices: [
                "¿En qué equipo juega esta temporada?",
                "¿Cuántos goles ha metido en toda su carrera profesional?",
                "¿Es popular entre la gente de mi edad?",
                "¿Sabe de bancos, y le pagan por el anuncio?",
              ],
              answer: 3,
              hint: "¿Qué pregunta pone a prueba si su opinión cuenta como prueba?",
              explain:
                "Jugar bien al fútbol no hace a nadie experto en bancos, y a los famosos casi siempre les pagan por salir en anuncios. El anuncio necesita otras razones, como sus comisiones o sus tasas de interés.",
            },
            {
              id: "q4",
              prompt: "¿Cuándo es la popularidad una buena prueba?",
              choices: [
                "Siempre que más de la mitad de la gente esté de acuerdo",
                "Cuando alguien famoso opina lo mismo que la mayoría",
                "Nunca; la popularidad no prueba nada en ningún caso",
                "Cuando la afirmación misma trata de popularidad",
              ],
              answer: 3,
              hint: "La popularidad puede probar un tipo de afirmación.",
              explain:
                "Las ventas son una buena prueba de que un libro es popular, como cuál se vendió más. No prueban que sea exacto, sabio o bueno para ti.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Detective de anuncios",
          brief: "Mira anuncios reales y descubre en qué se apoya cada uno: la multitud, una cara famosa o una razón real.",
          steps: [
            "Busca tres anuncios: en internet, en la tele, en una caja de cereal o en un cartel de la calle.",
            "Para cada uno, anota quién habla y si es experto en el producto.",
            "Subraya las palabras que se apoyan en la multitud, como “todos”, “millones” o “el más vendido”.",
            "Anota cualquier razón real que dé el anuncio: precio, ingredientes o resultados de pruebas.",
            "Reescribe un anuncio para que dé una razón real en vez de una multitud o un famoso. Enséñaselo a alguien de tu casa.",
          ],
        },
      ],
    },
    {
      id: "choices-leaps",
      title: "Pocas opciones, saltos enormes",
      summary: "Tres falacias que aprietan o estiran los hechos: el falso dilema, la pendiente resbaladiza y la generalización apresurada.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Falso dilema: solo dos puertas",
          blocks: [
            { type: "text", text: "Un falso dilema ofrece solo dos opciones cuando hay más." },
            { type: "text", text: "“O prohibimos los celulares en la escuela, o nadie va a volver a poner atención”." },
            {
              type: "text",
              text: "Hay otras opciones: guardar los celulares durante la clase, tener zonas sin celular o poner reglas claras sobre cuándo se pueden usar.",
            },
            {
              type: "points",
              items: [
                "Fíjate en frases como “o… o…”, “si no…, entonces…” y “estás conmigo o contra mí”.",
                "Algunas decisiones sí tienen solo dos opciones. Es falacia cuando se esconden las demás.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Pendiente resbaladiza: un paso y luego el desastre",
          blocks: [
            {
              type: "text",
              text: "La pendiente resbaladiza asegura que un pequeño paso desatará una cadena de sucesos que termina en desastre, sin demostrar que cada paso vaya a ocurrir de verdad.",
            },
            {
              type: "text",
              text: "“Si dejamos que pongan música en la hora de estudio, luego van a querer música en los exámenes, después nadie va a estudiar y toda la escuela va a reprobar”.",
            },
            {
              type: "text",
              text: "Cada eslabón de la cadena necesita sus propias pruebas. Algunas cadenas son reales: faltar a los entrenamientos sí puede hacer que juegues peor. Pregúntate si hay razones para creer cada paso.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Generalización apresurada: muy pocos ejemplos",
          blocks: [
            {
              type: "text",
              text: "Una generalización apresurada saca una gran conclusión de muy pocos ejemplos, o de ejemplos que no representan a todo el grupo.",
            },
            {
              type: "text",
              text: "“Les pregunté a tres amigos de mi grupo de 30 y a ninguno le gusta el nuevo menú de la cafetería, así que no le gusta a nadie del grupo”.",
            },
            {
              type: "visual",
              visual: { kind: "fraction", parts: 30, shaded: 3 },
              alt: "Una barra dividida en 30 partes iguales, una por cada alumno de un grupo. Solo 3 partes están sombreadas: los 3 amigos a quienes se les preguntó.",
            },
            {
              type: "text",
              text: "Tres amigos no pueden hablar por 30 alumnos, sobre todo si piensan parecido. Pregúntate: ¿a cuántos se les preguntó y cómo se eligieron?",
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "¿Aprieta o estira?",
          prompt: "Clasifica cada afirmación según la falacia que usa.",
          widget: {
            kind: "sorter",
            categories: ["Falso dilema", "Pendiente resbaladiza", "Generalización apresurada"],
            items: [
              { id: "equipo", text: "O te unes al equipo de fútbol, o no te importa la escuela.", answer: 0 },
              { id: "autora", text: "Los dos primeros libros que leí de esa autora me aburrieron, así que todos sus libros deben ser aburridos.", answer: 2 },
              {
                id: "platos",
                text: "Si hoy no lavamos los platos, mañana tampoco, la cocina se llenará de cucarachas y tendremos que mudarnos.",
                answer: 1,
              },
              { id: "gorra", text: "Si dejan que usemos gorra en clase, pronto vendremos en pijama y nadie tomará en serio la escuela.", answer: 1 },
              { id: "tamal", text: "Probé un tamal de ese puesto y estaba frío, así que su comida siempre es mala.", answer: 2 },
              { id: "lluvia", text: "O cancelamos la excursión, o dejamos que todos se empapen con la lluvia.", answer: 0 },
            ],
          },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "“O apoyas el nuevo estadio, o no te importa nuestra ciudad”. ¿Qué falacia es?",
              choices: ["Pendiente resbaladiza", "Falso dilema", "Generalización apresurada", "Efecto arrastre"],
              answer: 1,
              hint: "¿Cuántas opciones ofrece? ¿Hay más?",
              explain:
                "Alguien puede querer a su ciudad y aun así oponerse al estadio, o preferir uno más pequeño. La frase esconde esas opciones, así que es un falso dilema.",
            },
            {
              id: "q2",
              prompt: "¿Cuál es la mejor manera de responder a una pendiente resbaladiza?",
              choices: [
                "Darle la razón, porque el último paso da demasiado miedo",
                "Atacar a la persona que dio el argumento",
                "Pedir pruebas de que cada paso lleva al siguiente",
                "Cambiar de tema a algo más tranquilo",
              ],
              answer: 2,
              hint: "¿Dónde está el punto débil de una cadena?",
              explain: "Una cadena es tan fuerte como su eslabón más débil. Pedir pruebas de cada paso muestra si el desastre es probable o solo imaginado.",
            },
            {
              id: "q3",
              prompt: "Mateo leyó dos reseñas de unos audífonos y las dos eran malas. Decide que los audífonos son malos. ¿Qué haría más fuerte su conclusión?",
              choices: [
                "Leer muchas reseñas de compradores distintos",
                "Preguntarle a un amigo que nunca los ha usado",
                "Volver a leer las mismas dos reseñas con más cuidado",
                "Fijarse en las fotos de los colores disponibles",
              ],
              answer: 0,
              hint: "Las generalizaciones apresuradas salen de muy pocos ejemplos.",
              explain: "Dos reseñas son muy pocas para juzgar un producto que usan miles de personas. Muchas reseñas de compradores distintos dan una idea más justa.",
            },
            {
              id: "q4",
              prompt: "¿Cuál de estas frases NO es un falso dilema?",
              choices: [
                "Podemos irnos en autobús, caminando o pedir que nos lleven.",
                "O estás con nosotros, o estás contra nosotros.",
                "O compramos uniformes nuevos, o el equipo se verá mal para siempre.",
                "O te encantan las matemáticas, o eres malo para ellas.",
              ],
              answer: 0,
              hint: "¿Cuál deja lugar para más de dos opciones?",
              explain: "Irse en autobús, caminando o pedir que los lleven son tres opciones reales. Las demás aprietan la decisión en dos lados cuando hay más.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Encuentra la tercera puerta",
          brief: "Practica cómo encontrar opciones escondidas y pruebas que faltan en discusiones de todos los días.",
          steps: [
            "Anota tres frases de “o esto o aquello” que escuches esta semana, o invéntalas.",
            "Para cada una, escribe al menos dos opciones que deja fuera.",
            "Anota una pendiente resbaladiza que hayas oído. Debajo de cada paso, escribe si hay pruebas de que de verdad pasaría.",
            "Pregúntale a alguien de tu casa por una decisión que tomó y que tenía más de dos opciones. ¿Qué opciones consideró?",
          ],
        },
      ],
    },
    {
      id: "red-herring-review",
      title: "Pistas falsas y repaso",
      summary: "Detecta un argumento que cambia de tema y luego practica cómo nombrar y responder las ocho falacias.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Pista falsa: cambiar de tema",
          blocks: [
            { type: "text", text: "Una pista falsa saca un tema distinto para desviar la atención del problema real." },
            {
              type: "points",
              items: [
                "Mamá: “¿Por qué tu cuarto sigue desordenado?” Hijo: “Pues el garaje de papá está peor”. El garaje es otro asunto.",
                "Periodista: “¿El nuevo centro comercial va a aumentar el tráfico frente a la escuela?” Constructora: “Este centro comercial tendrá la mejor zona de comida de la región”. La zona de comida no responde a la pregunta del tráfico.",
              ],
            },
            { type: "text", text: "El tema nuevo puede incluso ser cierto. Sigue siendo una pista falsa si no responde a lo que se preguntó." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Nómbrala y luego respóndela",
          blocks: [
            {
              type: "text",
              text: "Detectar una falacia es la mitad del trabajo. La otra mitad es responderla de una forma que mantenga la discusión justa.",
            },
            {
              type: "points",
              items: [
                "Descríbela con palabras sencillas: “Esa es otra pregunta” o “Eso no fue lo que ella dijo”. No necesitas el nombre en latín.",
                "Regresa al tema real: “Volviendo al tráfico: ¿cuántos coches más pasarían frente a la escuela cada día?”",
                "Pide la razón que falta: “¿Qué prueba hay de que ese paso de verdad va a pasar?”",
                "Revisa tus propios argumentos de la misma forma antes de compartirlos.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Las ocho de un vistazo",
          blocks: [
            {
              type: "points",
              items: [
                "Ataque personal (ad hominem): ataca a la persona en vez de a la idea.",
                "Hombre de paja: deforma la idea del otro en una versión más débil y ataca esa versión.",
                "Efecto arrastre: dice que algo está bien porque mucha gente lo hace o lo cree.",
                "Falsa autoridad: confía en alguien que no es experto en el tema.",
                "Falso dilema: ofrece solo dos opciones cuando hay más.",
                "Pendiente resbaladiza: asegura que un pequeño paso desatará una cadena de desastres.",
                "Generalización apresurada: saca una gran conclusión de muy pocos ejemplos.",
                "Pista falsa: cambia de tema para distraer del problema real.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Repaso mezclado",
          prompt: "Clasifica cada afirmación. Ojo con las que no tienen ninguna falacia.",
          widget: {
            kind: "sorter",
            categories: ["Pista falsa", "Ataque personal", "Pendiente resbaladiza", "Sin falacia"],
            items: [
              { id: "picnic", text: "El pronóstico dice que lloverá fuerte todo el sábado, así que mejor movamos el pícnic al domingo.", answer: 3 },
              { id: "perro", text: "Sí, se me olvidó darle de comer al perro, pero ¿ya viste qué calificación saqué en matemáticas?", answer: 0 },
              { id: "zoologico", text: "Si dejamos que un alumno traiga su mascota, pronto cada salón será un zoológico.", answer: 2 },
              { id: "julian", text: "¿Por qué escuchar las ideas de Julián sobre el presupuesto? Siempre llega tarde a clase.", answer: 1 },
              {
                id: "puente",
                text: "Periodista: “¿Por qué la reparación del puente costó el doble de lo planeado?” Alcaldesa: “Nuestra ciudad tiene los mejores parques de la región”.",
                answer: 0,
              },
              {
                id: "encuesta",
                text: "Nuestra encuesta a los 120 alumnos de nuestro grado encontró que 90 quieren entrar más tarde, así que la mayoría del grado quiere entrar más tarde.",
                answer: 3,
              },
              { id: "plastico", text: "El estudio de esa científica sobre el plástico debe estar mal; es aburridísima cuando habla.", answer: 1 },
              { id: "examen", text: "Si repruebas un examen, nunca vas a entrar a la universidad y nunca vas a conseguir un buen trabajo.", answer: 2 },
            ],
          },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "Maestra: “Tu ensayo lleva dos días de retraso”. Alumno: “La comida de la cafetería es horrible”. ¿Qué falacia es?",
              choices: ["Pista falsa", "Generalización apresurada", "Hombre de paja", "Falso dilema"],
              answer: 0,
              hint: "¿La respuesta del alumno tiene algo que ver con el ensayo?",
              explain: "La cafetería no tiene nada que ver con el ensayo atrasado. El alumno cambió de tema: es una pista falsa.",
            },
            {
              id: "q2",
              prompt: "“Todo el mundo está comprando la nueva consola, así que debe valer lo que cuesta”. ¿Qué falacia es?",
              choices: ["Pista falsa", "Falsa autoridad", "Pendiente resbaladiza", "Efecto arrastre"],
              answer: 3,
              hint: "¿Cuál es la única razón que se da?",
              explain: "La única razón es que todos la están comprando. Que sea popular no demuestra que valga su precio.",
            },
            {
              id: "q3",
              prompt: "“Un chef famoso dice que este coche es el más seguro del mercado”. ¿Qué falacia es?",
              choices: ["Efecto arrastre", "Falsa autoridad", "Ataque personal", "Generalización apresurada"],
              answer: 1,
              hint: "¿De qué sabe mucho este chef, y de qué trata la afirmación?",
              explain:
                "Un chef sabe de comida, no de pruebas de choque. Creerle a un famoso fuera de su campo es falsa autoridad. Los resultados de pruebas de choque sí serían una prueba real.",
            },
            {
              id: "q4",
              prompt: "En una discusión en clase, alguien usa un hombre de paja contra tu idea. ¿Qué es lo mejor que puedes hacer?",
              choices: [
                "Gritar el nombre de la falacia para que todos sepan que se equivocó",
                "Señalar un defecto de su carácter para quedar parejos",
                "Repetir lo que de verdad dijiste y pedirle que responda a eso",
                "Abandonar tu idea, porque ya la deformó",
              ],
              answer: 2,
              hint: "¿Qué respuesta mantiene la discusión en la idea real?",
              explain:
                "Repetir con calma tu postura real regresa la discusión a ella. Gritar el nombre de la falacia o atacar de vuelta convierte la discusión en un pleito, y abandonar tu idea deja ganar a la versión deformada.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Arregla una falacia",
          brief: "Toma un argumento con una falacia y reconstrúyelo con razones reales.",
          steps: [
            "Elige una falacia de tu bitácora, de un anuncio o de este curso.",
            "Escribe el argumento tal como lo encontraste y describe la falacia con palabras sencillas.",
            "Reescribe el argumento para que dé pruebas reales: hechos, cifras o un experto en el campo correcto.",
            "Si no encuentras pruebas reales, anota qué tendrías que investigar.",
            "Lee las dos versiones a alguien de tu casa. Pregúntale cuál lo convence más y por qué.",
          ],
        },
      ],
    },
  ],
};

export default falaciasEs;
