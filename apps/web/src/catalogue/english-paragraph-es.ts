import type { CatalogueEntry } from "./types";

// Practice skills this course teaches toward: e.main.idea (oración temática), e.transitions (conectores).

const parrafoEs: CatalogueEntry = {
  id: "english-paragraph-es",
  title: "Cómo escribir un párrafo sólido",
  summary:
    "Construye un párrafo alrededor de una sola idea: una oración temática enfocada, ideas que la apoyan, conectores que las unen y una oración que lo cierra.",
  subject: "english",
  grade: "6",
  locale: "es",
  lessons: [
    {
      id: "topic-sentence",
      title: "La oración temática",
      summary: "Un párrafo trata de una sola idea. La oración temática le dice al lector cuál es.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Un párrafo, una idea",
          blocks: [
            {
              type: "text",
              text: "Un párrafo es un grupo de oraciones que desarrollan una sola idea. En la mayoría de los textos escolares, la primera oración presenta esa idea. Se llama oración temática.",
            },
            {
              type: "points",
              items: [
                "Oración temática: presenta la idea principal.",
                "Oraciones de apoyo: dan datos, ejemplos y explicaciones que la desarrollan.",
                "Oración de cierre: al final, regresa a la idea principal.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Un párrafo modelo",
          blocks: [
            { type: "text", text: "Lee este párrafo y fíjate en lo que hace la primera oración." },
            {
              type: "text",
              text: "“El mercado de los domingos es mucho más que un lugar para comprar fruta. Ahí mi abuela saluda a vecinos que no ve en toda la semana. Los puestos de comida reúnen a familias enteras alrededor de una misma mesa. Los niños aprenden a pedir, a contar el cambio y a regatear con respeto. Para muchas familias del barrio, el mercado es el punto de encuentro de la semana”.",
            },
            {
              type: "text",
              text: "La primera oración afirma algo: el mercado es más que un lugar de compras. Cada oración que sigue le da al lector una razón para creerlo. Eso es lo que mantiene unido el párrafo.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Ni muy amplia ni muy estrecha",
          blocks: [
            {
              type: "text",
              text: "Una buena oración temática está enfocada: es lo bastante amplia para necesitar un párrafo entero y lo bastante concreta para caber en uno.",
            },
            {
              type: "points",
              items: [
                "Demasiado amplia: “El deporte es popular en todo el mundo”. Eso da para un libro, no para un párrafo.",
                "Demasiado estrecha: “El entrenamiento de fútbol empieza a las cuatro”. Una vez dicho, ya no queda nada que explicar.",
                "Enfocada: “Jugar en un equipo de fútbol me enseñó a perder sin enojarme”. Un párrafo puede explicarlo bien.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "slide",
          title: "Nombra el tema y di algo de él",
          blocks: [
            {
              type: "text",
              text: "Una oración temática hace dos trabajos: nombra el tema y afirma algo sobre él que el resto del párrafo va a explicar.",
            },
            {
              type: "points",
              items: [
                "Solo el tema: “Este párrafo trata de mi perro”.",
                "Tema y afirmación: “Cuidar a mi perro me ha hecho más responsable”.",
                "Evita anuncios como “En este párrafo les voy a hablar de…”. Di directamente lo que piensas.",
              ],
            },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "¿Enfocada o no?",
          prompt: "Clasifica cada oración temática. ¿Es demasiado amplia, demasiado estrecha o está enfocada para un solo párrafo?",
          widget: {
            kind: "sorter",
            categories: ["Demasiado amplia", "Demasiado estrecha", "Enfocada"],
            items: [
              { id: "nature", text: "La naturaleza es muy interesante.", answer: 0 },
              { id: "floors", text: "Mi escuela tiene dos pisos.", answer: 1 },
              { id: "tortillas", text: "Aprender a hacer tortillas con mi tía me enseñó a tener paciencia.", answer: 2 },
              { id: "food", text: "La comida es importante para las personas.", answer: 0 },
              { id: "bus", text: "El autobús pasa a las siete y diez.", answer: 1 },
              { id: "garden", text: "El huerto de la escuela convirtió un patio vacío en un lugar donde los alumnos cultivan su propia comida.", answer: 2 },
            ],
          },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "¿Cuál es la oración temática más sólida?",
              choices: [
                "Este párrafo es sobre mi abuelo.",
                "Mi abuelo nació en Oaxaca.",
                "Mi abuelo me enseñó que arreglar las cosas es mejor que tirarlas.",
                "Los abuelos son importantes.",
              ],
              answer: 2,
              hint: "Busca la que nombra un tema y además afirma algo que el párrafo pueda explicar.",
              explain:
                "Nombra el tema, tu abuelo, y afirma algo, que arreglar es mejor que tirar, que el resto del párrafo puede explicar. La primera solo anuncia el tema, la segunda es un solo dato y la última es demasiado amplia.",
            },
            {
              id: "q2",
              prompt: "¿Dónde suele ir la oración temática en un párrafo escolar?",
              choices: ["Al principio", "En medio", "Al final", "Casi nunca se escribe"],
              answer: 0,
              hint: "El lector necesita saber cuál es la idea antes de que los detalles tengan sentido.",
              explain:
                "En la mayoría de los textos escolares va primero, para que el lector sepa qué apoya cada detalle. Los escritores con experiencia a veces la colocan después, pero el principio es el lugar habitual.",
            },
            {
              id: "q3",
              prompt: "¿Por qué “Mi equipo entrena a las cuatro” es una oración temática débil?",
              choices: [
                "Es demasiado larga.",
                "Es un solo dato, así que al párrafo no le queda nada que explicar.",
                "Es una opinión.",
                "Habla de demasiados temas.",
              ],
              answer: 1,
              hint: "Intenta escribir tres oraciones más que la expliquen. ¿Qué pasa?",
              explain:
                "Una oración temática necesita una afirmación que el párrafo pueda desarrollar. La hora del entrenamiento es un solo dato: una vez dicho, no hay nada más que contar sobre él.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Tres oraciones temáticas",
          brief: "Escribe oraciones temáticas sobre tu propia vida y comprueba si cada una podría sostener un párrafo.",
          steps: [
            "Elige tres cosas que conozcas bien: un lugar, una persona y algo que sepas hacer.",
            "Para cada una, escribe una oración temática que la nombre y afirme algo sobre ella.",
            "Pon a prueba cada oración. ¿Podrías escribir cuatro oraciones que la expliquen? Si no, amplíala. ¿Necesitaría un ensayo entero? Acótala.",
            "Lee la mejor a alguien de tu casa. Pídele que adivine qué diría el resto del párrafo.",
          ],
        },
      ],
    },
    {
      id: "supporting-details",
      title: "Ideas que apoyan",
      summary: "Cada oración después de la temática debe desarrollar la idea principal. Quita las que se desvían.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Tipos de apoyo",
          blocks: [
            {
              type: "text",
              text: "Las oraciones de apoyo le dan al lector razones para creer o entender la oración temática. Hay varios tipos.",
            },
            {
              type: "points",
              items: [
                "Datos y cifras: “La biblioteca abre 60 horas a la semana”.",
                "Ejemplos: “El domingo pasado, en el mercado, vi a un señor enseñarle a su nieta a escoger aguacates”.",
                "Explicaciones: oraciones que dicen por qué un dato o un ejemplo importa.",
                "Citas: las palabras exactas de alguien, entre comillas.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "No te salgas del tema",
          blocks: [
            {
              type: "text",
              text: "Un párrafo tiene unidad cuando todas sus oraciones apoyan la idea principal. Una oración que se desvía lo debilita, aunque sea verdadera e interesante.",
            },
            {
              type: "text",
              text: "“Ir a la escuela en bicicleta es una buena forma de empezar el día. Son quince minutos de ejercicio antes de pasar horas sentado en clase. En el camino voy hablando con mis amigos. Mi prima Sofía acaba de adoptar un gato. Cuando llego al salón, ya estoy despierto y con ganas de trabajar”.",
            },
            {
              type: "text",
              text: "Lo del gato es una buena noticia, pero no dice nada sobre ir en bicicleta. Esa oración va en otro párrafo.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Dato y explicación",
          blocks: [
            {
              type: "text",
              text: "Un dato solo puede dejar al lector preguntándose: “¿Y eso qué?”. Después del dato, agrega palabras que lo conecten con tu idea principal.",
            },
            {
              type: "points",
              items: [
                "Oración temática: “Nuestra escuela necesita un recreo más largo”.",
                "Solo el dato: “La fila de la cafetería tarda 15 minutos”.",
                "Dato y explicación: “La fila de la cafetería tarda 15 minutos, así que de un recreo de 25 solo quedan 10 para comer y jugar”.",
              ],
            },
            { type: "text", text: "La explicación convierte un dato suelto en apoyo para la idea." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "¿Apoya o se desvía?",
          prompt: "Oración temática: “Cuidar las plantas del salón nos enseña a ser responsables”. Clasifica cada oración.",
          widget: {
            kind: "sorter",
            categories: ["Apoya el tema", "Se desvía del tema"],
            items: [
              { id: "water", text: "Cada semana, dos alumnos se encargan de regar las macetas.", answer: 0 },
              { id: "cactus", text: "Los cactus pueden vivir en el desierto.", answer: 1 },
              { id: "leaves", text: "Si nadie las riega el lunes, para el viernes ya tienen las hojas caídas.", answer: 0 },
              { id: "uncle", text: "Mi tío tiene una tienda de bicicletas.", answer: 1 },
              { id: "calendar", text: "En la pared hay un calendario para que todos sepan a quién le toca.", answer: 0 },
              { id: "windows", text: "Las ventanas del salón dan a la cancha.", answer: 1 },
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
              prompt: "Oración temática: “Aprender a nadar me hizo más valiente”. ¿Qué detalle la apoya mejor?",
              choices: [
                "La piscina está junto al parque.",
                "La primera vez que salté a la parte honda me temblaban las piernas, pero al día siguiente volví a saltar.",
                "La natación es un deporte olímpico.",
                "Mi traje de baño es verde.",
              ],
              answer: 1,
              hint: "¿Qué detalle muestra a alguien volviéndose más valiente?",
              explain:
                "El salto muestra miedo y después valor, que es justo lo que afirma la oración temática. Las otras opciones hablan de la natación o de la piscina, no de la valentía.",
            },
            {
              id: "q2",
              prompt: "Una oración de tu párrafo es verdadera e interesante, pero no apoya la idea principal. ¿Qué haces?",
              choices: ["La dejo, porque es verdad.", "La pongo como primera oración.", "La quito o la paso a un párrafo donde sí encaje."],
              answer: 2,
              hint: "Piensa en la unidad. ¿Qué debe hacer cada oración de un párrafo?",
              explain: "Una oración verdadera también puede desviarse. Quítala de este párrafo o guárdala para uno donde sí apoye la idea principal.",
            },
            {
              id: "q3",
              prompt: "Oración temática: “Nuestra escuela necesita más bebederos”. ¿Qué oración da un dato y lo explica?",
              choices: [
                "Somos 900 alumnos y solo hay dos bebederos, así que en el recreo las filas son tan largas que no alcanzamos a tomar agua.",
                "Somos 900 alumnos.",
                "El agua es importante.",
                "Algunos bebederos son de metal.",
              ],
              answer: 0,
              hint: "Busca un dato seguido de palabras que digan qué significa para la idea principal.",
              explain:
                "La primera opción da un dato y luego explica su efecto: no alcanzamos a tomar agua. La segunda es un dato sin explicación, y las dos últimas no apoyan la afirmación.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Ajusta un párrafo",
          brief: "Revisa un párrafo para que cada oración apoye su idea principal.",
          steps: [
            "Busca un párrafo que hayas escrito para la escuela, o escribe uno nuevo sobre un lugar que te guste.",
            "Subraya la oración temática.",
            "Numera las oraciones que siguen. Junto a cada número, escribe cómo apoya esa oración a la temática.",
            "Tacha las oraciones que se desvían, aunque sean verdaderas.",
            "Después de un dato que lo necesite, agrega una explicación que responda al “¿y eso qué?”.",
            "Lee la versión vieja y la nueva a alguien de tu casa. Pregúntale cuál se entiende mejor y por qué.",
          ],
        },
      ],
    },
    {
      id: "transitions",
      title: "Conectores que unen las ideas",
      summary: "Palabras como “por ejemplo”, “sin embargo” y “por eso” le muestran al lector cómo se relaciona una idea con la siguiente.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Señales para el lector",
          blocks: [
            {
              type: "text",
              text: "Los conectores son palabras y frases que muestran cómo se relacionan dos ideas. Como las señales del camino, le avisan al lector lo que viene.",
            },
            {
              type: "points",
              items: [
                "Para agregar una idea: además, también, asimismo.",
                "Para dar un ejemplo: por ejemplo, por citar un caso.",
                "Para mostrar un contraste: sin embargo, en cambio, pero.",
                "Para mostrar una consecuencia: por eso, por lo tanto, así que.",
                "Para marcar un orden: primero, después, luego, por último.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Los mismos datos, unidos",
          blocks: [
            {
              type: "text",
              text: "Sin conectores: “Quería entrar al club de robótica. Las reuniones eran los martes. Los martes tenía clase de guitarra. Hablé con mi maestra de guitarra. Cambió mi clase al jueves. Entré al club en octubre”.",
            },
            {
              type: "text",
              text: "Con conectores: “Quería entrar al club de robótica. Sin embargo, las reuniones eran los martes, cuando tenía clase de guitarra. Por eso hablé con mi maestra, y ella cambió mi clase al jueves. Gracias a eso, en octubre entré al club”.",
            },
            {
              type: "text",
              text: "Los datos no cambiaron. Los conectores muestran cuál es el problema, cuál es la solución y cuál es el resultado.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Elige el que encaja",
          blocks: [
            { type: "text", text: "Cada conector tiene un trabajo. Si eliges el equivocado, mandas al lector en la dirección contraria." },
            {
              type: "points",
              items: [
                "Mal: “Llovió toda la mañana. Por ejemplo, se canceló el partido”. Un partido cancelado no es un ejemplo de lluvia: es una consecuencia.",
                "Bien: “Llovió toda la mañana. Por eso se canceló el partido”.",
                "Al inicio de una oración, “sin embargo”, “por ejemplo” y “además” suelen llevar coma después.",
                "No empieces todas las oraciones con un conector. Úsalo donde la relación entre las ideas no quedaría clara.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "¿Qué trabajo hace?",
          prompt: "Clasifica cada conector según el trabajo que hace.",
          widget: {
            kind: "sorter",
            categories: ["Agrega una idea", "Da un ejemplo", "Muestra un contraste", "Muestra una consecuencia"],
            items: [
              { id: "ademas", text: "Además", answer: 0 },
              { id: "por-ejemplo", text: "Por ejemplo", answer: 1 },
              { id: "en-cambio", text: "En cambio", answer: 2 },
              { id: "por-lo-tanto", text: "Por lo tanto", answer: 3 },
              { id: "tambien", text: "También", answer: 0 },
              { id: "sin-embargo", text: "Sin embargo", answer: 2 },
              { id: "por-eso", text: "Por eso", answer: 3 },
              { id: "por-citar", text: "Por citar un caso", answer: 1 },
            ],
          },
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Llena el hueco",
          prompt: "A cada par de oraciones le falta un conector en el hueco. Clasifica cada par según el conector que encaja.",
          widget: {
            kind: "sorter",
            categories: ["Sin embargo", "Por ejemplo", "Por lo tanto"],
            items: [
              { id: "torneo", text: "Entrenamos todos los días durante un mes. ___, ganamos el torneo.", answer: 2 },
              { id: "tomate", text: "Muchas verduras necesitan mucho sol. ___, el tomate crece mejor con al menos seis horas de sol directo al día.", answer: 1 },
              { id: "zoologico", text: "Casi todo el grupo votó por ir al zoológico. ___, algunos querían ir al museo.", answer: 0 },
              { id: "puente", text: "El puente estaba cerrado por reparaciones. ___, el autobús tomó un camino más largo.", answer: 2 },
              { id: "zorro", text: "Algunos animales cambian de color con las estaciones. ___, muchos zorros árticos son blancos en invierno y pardos en verano.", answer: 1 },
              { id: "pelicula", text: "La película tuvo muy buenas críticas. ___, a mí me pareció lenta.", answer: 0 },
            ],
          },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "“La biblioteca estaba cerrada el lunes. ___ estudié en la mesa de la cocina”. ¿Qué conector encaja mejor?",
              choices: ["Por ejemplo,", "Además,", "Por lo tanto,", "En cambio,"],
              answer: 2,
              hint: "¿La segunda oración agrega algo, da un ejemplo, contrasta o cuenta lo que pasó a causa de la primera?",
              explain: "Estudiar en casa pasó porque la biblioteca estaba cerrada. Es una consecuencia, así que encaja “Por lo tanto”.",
            },
            {
              id: "q2",
              prompt: "¿En qué par se usa mal el conector?",
              choices: [
                "Me encanta el invierno. Sin embargo, odio levantarme cuando todavía está oscuro.",
                "Algunas aves no vuelan. Por ejemplo, los pingüinos usan las alas para nadar.",
                "Nuestra perra tiene doce años. Por eso todavía le encanta correr.",
                "Llevamos sándwiches. Además, llevamos agua.",
              ],
              answer: 2,
              hint: "Lee cada par. ¿El conector coincide con la relación entre las dos ideas?",
              explain: "Que una perra de doce años todavía corra es una sorpresa, no una consecuencia. Encajaría “Sin embargo, todavía le encanta correr”.",
            },
            {
              id: "q3",
              prompt: "¿Para qué sirven los conectores en un párrafo?",
              choices: ["Para mostrar cómo se relacionan las ideas", "Para que cada oración sea más larga", "Para reemplazar la oración temática"],
              answer: 0,
              hint: "Piensa en las señales del camino. ¿Qué le dicen a quien maneja?",
              explain:
                "Los conectores son señales. Le dicen al lector si la siguiente idea agrega, ejemplifica, contrasta o es consecuencia de la anterior.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Cacería de conectores",
          brief: "Encuentra conectores en textos reales y luego úsalos en el tuyo.",
          steps: [
            "Elige una página de un libro, una noticia o un instructivo.",
            "Encierra en un círculo cada conector que encuentres.",
            "Junto a cada uno, escribe su trabajo: agrega, ejemplo, contraste, consecuencia u orden.",
            "Escribe un párrafo sobre cómo pasas un sábado. Usa conectores de al menos tres tipos distintos.",
            "Léeselo dos veces a alguien de tu casa, una vez sin conectores y otra con ellos. Pregúntale cuál fue más fácil de seguir.",
          ],
        },
      ],
    },
    {
      id: "closing-revising",
      title: "Cerrar y revisar",
      summary: "Termina con una oración que regrese a la idea principal y luego revisa todo el párrafo con una lista.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "La oración de cierre",
          blocks: [
            { type: "text", text: "La oración de cierre lleva al lector de vuelta a la idea principal y se la deja clara." },
            {
              type: "points",
              items: [
                "Repite la idea principal con otras palabras, o di por qué importa.",
                "No copies la oración temática palabra por palabra.",
                "No agregues una idea nueva al final. Una idea nueva necesita su propio párrafo.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Tres finales",
          blocks: [
            { type: "text", text: "Oración temática: “El mercado de los domingos es mucho más que un lugar para comprar fruta”." },
            {
              type: "points",
              items: [
                "Copia: “El mercado de los domingos es mucho más que un lugar para comprar fruta”.",
                "Agrega una idea nueva: “También deberían arreglar el parque del barrio”.",
                "Cierra bien: “Para muchas familias del barrio, el mercado es el punto de encuentro de la semana”.",
              ],
            },
            { type: "text", text: "El último repite la idea con palabras nuevas y dice por qué importa." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Primero revisa, luego corrige",
          blocks: [
            {
              type: "text",
              text: "Revisar es mejorar lo que dices y cómo lo organizas. Corregir es arreglar la ortografía, los acentos, la puntuación y la gramática. Revisa primero: no tiene caso pulir una oración que vas a borrar.",
            },
            {
              type: "points",
              items: [
                "¿La primera oración presenta una idea principal enfocada?",
                "¿Todas las demás oraciones la apoyan?",
                "¿Cada dato tiene una explicación donde el lector podría preguntar “¿y eso qué?”?",
                "¿Los conectores muestran cómo se relacionan las ideas?",
                "¿La última oración regresa a la idea principal?",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "slide",
          title: "Mira cómo mejora un párrafo",
          blocks: [
            {
              type: "text",
              text: "Borrador: “El recreo. El recreo está bien y jugamos fútbol. Mi amigo tiene una mochila nueva. Debería ser más largo. Eso es todo”.",
            },
            {
              type: "text",
              text: "Versión revisada: “Nuestra escuela debería alargar el recreo diez minutos. Ahora dura 15 minutos, y casi cinco se van en formarnos y salir al patio. Un recreo más largo nos daría tiempo de jugar de verdad. Además, muchos compañeros dicen que se concentran mejor después de correr un rato. Diez minutos más afuera podrían significar una mejor tarde adentro”.",
            },
            {
              type: "text",
              text: "La versión revisada tiene una oración temática enfocada, datos con explicación, un conector y un cierre de verdad. La mochila desapareció.",
            },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "¿Cierre sólido o débil?",
          prompt: "Oración temática: “Ayudar en casa me enseñó a organizar mi tiempo”. Clasifica cada posible oración de cierre.",
          widget: {
            kind: "sorter",
            categories: ["Cierre sólido", "Cierre débil"],
            items: [
              { id: "copy", text: "Ayudar en casa me enseñó a organizar mi tiempo.", answer: 1 },
              { id: "plan", text: "Gracias a unas cuantas tareas por semana, ahora planeo mis tardes en lugar de perderlas.", answer: 0 },
              { id: "turtle", text: "Además, quiero tener una tortuga.", answer: 1 },
              { id: "all", text: "Eso es todo lo que tengo que decir sobre la casa.", answer: 1 },
              { id: "skill", text: "Esas tareas me dieron una habilidad que voy a usar en cada semana ocupada.", answer: 0 },
              { id: "fit", text: "Acomodar las tareas de la casa junto con las de la escuela me ayudó a planear todo lo demás.", answer: 0 },
            ],
          },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "¿Qué debe hacer una oración de cierre?",
              choices: [
                "Presentar un tema nuevo",
                "Llevar al lector de vuelta a la idea principal",
                "Repetir la oración temática palabra por palabra",
                "Volver a enumerar todos los detalles",
              ],
              answer: 1,
              hint: "Piensa en lo último que quieres que el lector recuerde.",
              explain:
                "La oración de cierre repite la idea principal con palabras nuevas o dice por qué importa. Un tema nuevo, una oración copiada o una lista de todos los detalles no lo hacen.",
            },
            {
              id: "q2",
              prompt: "¿Qué cambio es revisar y no corregir?",
              choices: ["Arreglar una palabra mal escrita", "Poner un acento que faltaba", "Agregar una coma", "Quitar una oración que se sale del tema"],
              answer: 3,
              hint: "Revisar cambia lo que dices o cómo lo organizas. Corregir arregla la superficie.",
              explain: "Quitar una oración que se desvía cambia el contenido del párrafo, así que es revisar. La ortografía, los acentos y las comas se corrigen.",
            },
            {
              id: "q3",
              prompt: "Oración temática: “Nuestro parque necesita más sombra”. ¿Cuál es la oración de cierre más sólida?",
              choices: [
                "Unos cuantos árboles más convertirían un parque caluroso y vacío en un lugar que las familias usen todo el verano.",
                "Nuestro parque necesita más sombra.",
                "El parque también tiene una cancha de básquetbol.",
              ],
              answer: 0,
              hint: "Busca la que repite la idea con palabras nuevas sin empezar un tema nuevo.",
              explain: "Repite la necesidad de sombra con palabras nuevas y muestra por qué importa. La segunda copia la oración temática y la tercera empieza otro tema.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Escríbelo y revísalo",
          brief: "Escribe un párrafo completo y luego revísalo con la lista de esta lección.",
          steps: [
            "Elige algo que te gustaría cambiar en tu casa o en tu escuela.",
            "Escribe una oración temática que nombre el cambio y afirme algo sobre él.",
            "Agrega tres datos o ejemplos de apoyo, y explica los que lo necesiten.",
            "Une tus ideas con al menos dos tipos distintos de conectores.",
            "Termina con una oración de cierre que repita tu idea con palabras nuevas.",
            "Pasa la lista. Haz al menos dos cambios y luego lee las dos versiones a alguien de tu casa.",
          ],
        },
      ],
    },
  ],
};

export default parrafoEs;
