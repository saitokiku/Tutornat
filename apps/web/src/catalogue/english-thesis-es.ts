import type { CatalogueEntry } from "./types";

// Practice skills this course teaches toward: e.thesis, e.claim.evidence (lección 3), e.concision (lección 4).

const tesisEs: CatalogueEntry = {
  id: "english-thesis-es",
  title: "Una tesis que se sostiene",
  summary: "Escribe la afirmación en la que se apoya un ensayo: debatible, específica y acotada, con razones que la evidencia pueda sostener.",
  subject: "english",
  grade: "9",
  locale: "es",
  lessons: [
    {
      id: "what-thesis",
      title: "Qué hace una tesis",
      summary: "La tesis es la afirmación principal de un ensayo. Todo lo demás está ahí para apoyarla.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "La oración en la que se apoya el ensayo",
          blocks: [
            {
              type: "text",
              text: "Un ensayo pregunta: “¿Debería empezar más tarde la escuela?”. Quien escribe responde: “Nuestra escuela debería empezar a las 8:30, porque los adolescentes aprenden mejor cuando duermen más”.",
            },
            {
              type: "text",
              text: "Esa respuesta es la tesis: la afirmación principal de un ensayo, casi siempre en una o dos oraciones. Cada párrafo de desarrollo existe para apoyarla; si la tesis es débil, todo el ensayo se tambalea.",
            },
            {
              type: "points",
              items: [
                "En la mayoría de los ensayos escolares, va al final de la introducción.",
                "Responde la pregunta que explora el ensayo.",
                "Es una afirmación. No es un tema, ni un dato, ni una pregunta.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Lo que no es una tesis",
          blocks: [
            {
              type: "points",
              items: [
                "Un tema: “El horario de entrada”. Nombra un asunto, pero no dice nada sobre él.",
                "Un dato: “Nuestra escuela empieza a las 7:00”. Es cierto, pero no hay nada que discutir.",
                "Una pregunta: “¿Debería empezar más tarde la escuela?”. Es una buena pregunta para explorar en un ensayo, pero la tesis es tu respuesta.",
                "Un anuncio: “En este ensayo voy a hablar del horario de entrada”. Promete un tema sin afirmar nada.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "De la pregunta a la tesis",
          blocks: [
            { type: "text", text: "Una forma confiable de escribir una tesis: parte de una pregunta, respóndela y agrega tu razón principal." },
            {
              type: "points",
              items: [
                "Pregunta: “¿Se debería permitir el celular en el recreo?”",
                "Respuesta: “Se debería permitir el celular en el recreo”.",
                "Respuesta y razón: “Se debería permitir el celular en el recreo, porque para muchos alumnos es el único momento en que pueden comunicarse con familiares que trabajan durante el día”.",
              ],
            },
            { type: "text", text: "La razón le dice al lector lo que van a demostrar los párrafos de desarrollo." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "¿Tesis o no?",
          prompt: "Clasifica cada oración. ¿Es una tesis o una de las cosas que una tesis no es?",
          widget: {
            kind: "sorter",
            categories: ["Tesis", "Tema", "Dato", "Pregunta o anuncio"],
            items: [
              { id: "cook-topic", text: "Las clases de cocina", answer: 1 },
              { id: "bike-fact", text: "La avenida del Río mide tres kilómetros.", answer: 2 },
              {
                id: "bike-thesis",
                text: "Nuestra ciudad debería construir una ciclovía en la avenida del Río, porque es la única ruta directa entre el lado este de la ciudad y la escuela.",
                answer: 0,
              },
              { id: "cook-announce", text: "En este ensayo voy a hablar de las clases de cocina.", answer: 3 },
              { id: "cook-fact", text: "La cafetería sirve el almuerzo de 12:00 a 14:00.", answer: 2 },
              { id: "bike-question", text: "¿Debería nuestra ciudad construir una ciclovía?", answer: 3 },
              { id: "bike-topic", text: "Las ciclovías", answer: 1 },
              {
                id: "cook-thesis",
                text: "Las escuelas deberían enseñar a cocinar, porque saber preparar comidas sencillas ahorra dinero y forma hábitos sanos.",
                answer: 0,
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
              prompt: "¿Cuál de estas oraciones es una tesis?",
              choices: [
                "Muchos adolescentes de Estados Unidos tienen un trabajo de medio tiempo durante el ciclo escolar.",
                "¿Trabajar medio tiempo durante el ciclo escolar les sirve a los adolescentes o baja sus calificaciones?",
                "Un trabajo de medio tiempo puede enseñar a los jóvenes a administrar su dinero, si no pasa de diez horas por semana.",
                "Este ensayo trata sobre los adolescentes y los trabajos de medio tiempo que muchos de ellos tienen durante el ciclo escolar.",
              ],
              answer: 2,
              hint: "Busca una afirmación con la que alguien podría no estar de acuerdo.",
              explain:
                "La oración sobre administrar el dinero toma una postura y le pone un límite. Las demás son un dato, una pregunta y un anuncio, así que ninguna toma postura.",
            },
            {
              id: "q2",
              prompt: "¿Dónde suele ir la tesis en un ensayo escolar?",
              choices: ["Al final de la introducción", "A la mitad del segundo párrafo de desarrollo", "Solo en la conclusión", "En el título"],
              answer: 0,
              hint: "El lector necesita conocer la afirmación antes de que los párrafos empiecen a demostrarla.",
              explain: "Al final de la introducción, la tesis le anuncia al lector lo que el resto del ensayo va a demostrar. La conclusión suele retomarla con otras palabras.",
            },
            {
              id: "q3",
              prompt: "¿Por qué “En este ensayo hablaré del reciclaje” es una tesis débil?",
              choices: [
                "Es demasiado corta para sostener un argumento",
                "Usa la primera persona, y una tesis nunca debe hacerlo",
                "El reciclaje es un tema demasiado común para un ensayo",
                "Nombra un tema, pero no afirma nada",
              ],
              answer: 3,
              hint: "Después de leerla, ¿qué sabes de la postura de quien escribe?",
              explain: "La oración dice el tema, pero no lo que piensa quien escribe. Una tesis tiene que tomar postura: por ejemplo, qué debería cambiar la escuela sobre el reciclaje y por qué.",
            },
            {
              id: "q4",
              prompt: "Convierte esta pregunta en tesis: “¿Debería la biblioteca prestar juegos de mesa?”. ¿Cuál funciona mejor?",
              choices: [
                "Los juegos de mesa son divertidos y a muchas familias les gusta jugarlos juntas.",
                "La biblioteca debería prestar juegos de mesa, porque atraería a familias nuevas.",
                "Algunas bibliotecas de otras ciudades ya prestan juegos de mesa a las familias.",
                "¿Debería la biblioteca prestar juegos de mesa? Este ensayo lo va a averiguar.",
              ],
              answer: 1,
              hint: "Responde la pregunta y luego da una razón.",
              explain:
                "La oración sobre atraer familias nuevas responde la pregunta y da una razón que el ensayo puede demostrar. Las demás son una opinión que no responde, un dato y la misma pregunta repetida.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "De la pregunta a la tesis",
          brief: "Convierte preguntas reales de tu vida en tesis.",
          steps: [
            "Escribe tres preguntas sobre tu escuela, tu ciudad o tu casa en las que la gente no se pone de acuerdo.",
            "Responde cada una en una sola oración.",
            "Agrega a cada respuesta tu razón principal con “porque”.",
            "Léelas a alguien de tu casa. Pregúntale con cuál le darían más ganas de discutir y por qué.",
          ],
        },
      ],
    },
    {
      id: "three-tests",
      title: "Debatible, específica y acotada",
      summary: "Tres pruebas separan una tesis que se sostiene de una que se cae.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Prueba 1: debatible",
          blocks: [
            {
              type: "text",
              text: "Una tesis es debatible cuando una persona razonable podría no estar de acuerdo. Si nadie podría estar en desacuerdo, no hay nada que demostrar.",
            },
            {
              type: "points",
              items: [
                "No es debatible: “El ejercicio es bueno para la salud”. Casi todos están de acuerdo.",
                "Debatible: “Nuestra escuela debería exigir 20 minutos de actividad física todos los días, incluso los días sin clase de educación física”.",
                "Debatible no quiere decir exagerada. Quiere decir que hay una pregunta real, con personas razonables en más de un lado.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Prueba 2: específica",
          blocks: [
            {
              type: "text",
              text: "Las palabras vagas como bueno, malo, cosas, la sociedad o un tema importante dejan al lector adivinando qué quieres decir.",
            },
            {
              type: "points",
              items: [
                "Vaga: “Las redes sociales son malas para los adolescentes”.",
                "Específica: “Usar redes sociales de noche les quita horas de sueño a los adolescentes, así que en casa los celulares deberían cargarse fuera de los cuartos”.",
              ],
            },
            { type: "text", text: "Cambia cada palabra vaga por lo que de verdad quieres decir. ¿Malo cómo? ¿Para quién? ¿Cuándo?" },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Prueba 3: acotada",
          blocks: [
            {
              type: "text",
              text: "Una tesis acotada se puede demostrar en el espacio que tienes. Un ensayo de cinco párrafos no puede demostrar algo sobre toda la historia.",
            },
            {
              type: "points",
              items: [
                "Demasiado amplia: “La tecnología ha cambiado el mundo”.",
                "Acotada: “Permitir la calculadora en los exámenes de matemáticas de secundaria ayuda más de lo que perjudica, siempre que antes los alumnos aprendan a estimar”.",
              ],
            },
            { type: "text", text: "Si una tesis es demasiado amplia, acota el quién, el dónde o el cuándo." },
          ],
        },
        {
          id: "s4",
          kind: "slide",
          title: "Mira cómo mejora una tesis",
          blocks: [
            {
              type: "points",
              items: [
                "Borrador: “El recreo es importante”. Vaga, y nadie diría lo contrario.",
                "Debatible: “El recreo de nuestra escuela debería ser más largo”. Mejor, pero ¿cuánto más largo y por qué?",
                "Específica y acotada: “Nuestra escuela debería alargar el recreo de 20 a 30 minutos, porque quienes hacen fila en la cafetería apenas tienen cinco minutos para comer”.",
              ],
            },
            { type: "text", text: "Cada versión responde una pregunta que la anterior dejaba abierta." },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "¿Qué prueba no pasa?",
          prompt: "Clasifica cada tesis según la primera prueba que no pasa, en este orden: debatible, luego específica, luego acotada. Si pasa las tres, se sostiene.",
          widget: {
            kind: "sorter",
            categories: ["No es debatible", "Demasiado vaga", "Demasiado amplia", "Se sostiene"],
            items: [
              { id: "phones", text: "Los celulares son malos para los alumnos.", answer: 1 },
              {
                id: "library",
                text: "Nuestra escuela debería abrir la biblioteca a las 7:00, para que quienes llegan temprano en el autobús tengan un lugar tranquilo para estudiar.",
                answer: 3,
              },
              { id: "seatbelts", text: "El cinturón de seguridad salva vidas en los choques.", answer: 0 },
              { id: "four-day", text: "Todos los países deberían cambiar a una semana escolar de cuatro días.", answer: 2 },
              { id: "parks", text: "La ciudad debería mejorar sus parques.", answer: 1 },
              { id: "handwashing", text: "Lavarse las manos con jabón elimina gérmenes.", answer: 0 },
              {
                id: "recycling",
                text: "La ciudad debería poner un contenedor de reciclaje junto a cada cesto de basura del parque, porque hoy el parque no tiene ninguno.",
                answer: 3,
              },
              { id: "homework", text: "Todas las escuelas del mundo deberían eliminar la tarea.", answer: 2 },
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
              prompt: "¿Cuál de estas tesis es debatible?",
              choices: [
                "Muchas escuelas del país todavía usan libros de texto en papel en la mayoría de sus materias y grados.",
                "Nuestra escuela debería cambiar los libros de texto en papel por tabletas en todas las materias.",
                "Los libros de texto en papel pesan más que una sola tableta.",
                "Las tabletas son aparatos electrónicos que pueden guardar muchos libros.",
              ],
              answer: 1,
              hint: "¿Con cuál podría no estar de acuerdo una persona razonable?",
              explain: "Cambiar todos los libros por tabletas es un debate real, con razones de los dos lados. Las otras tres son datos que nadie discutiría.",
            },
            {
              id: "q2",
              prompt: "¿Qué hace débil a la tesis “Los uniformes escolares son una mala idea”?",
              choices: [
                "Nadie podría estar en desacuerdo, así que no hay nada que demostrar",
                "Es demasiado específica para llenar un ensayo entero",
                "Es una pregunta disfrazada de afirmación",
                "Es demasiado vaga: ¿mala cómo y para quién?",
              ],
              answer: 3,
              hint: "Después de leerla, ¿qué demostraría exactamente el ensayo?",
              explain:
                "Sobre los uniformes sí se debate de verdad, así que pasa la primera prueba. Pero “mala” podría significar cara, injusta o incómoda, y no dice para quién. Nombrar el problema y a quién afecta la volvería específica.",
            },
            {
              id: "q3",
              prompt: "¿Qué versión acota mejor “La contaminación es un problema en el mundo”?",
              choices: [
                "La contaminación es un problema muy grande en todo el mundo, y cada año se vuelve peor.",
                "La contaminación es mala, y todos deberíamos hacer más para detenerla.",
                "La ciudad debería prohibir que los coches esperen con el motor encendido frente a las escuelas a la hora de la salida.",
                "Hay muchos tipos de contaminación, como la del aire y la del agua.",
              ],
              answer: 2,
              hint: "Busca un quién, un dónde y una afirmación clara.",
              explain:
                "La tesis sobre los coches con el motor encendido acota el lugar, la causa y la acción, así que un ensayo corto podría demostrarla. Las demás siguen siendo vagas, amplias o simples datos.",
            },
            {
              id: "q4",
              prompt: "Una tesis pasa las tres pruebas. ¿Qué garantiza eso?",
              choices: [
                "Que se puede debatir y demostrar, si encuentras la evidencia",
                "Que todos los que la lean van a terminar de acuerdo con ella",
                "Que el ensayo ya está terminado y listo para entregar al maestro",
                "Que no vas a necesitar evidencia para demostrarla",
              ],
              answer: 0,
              hint: "Las pruebas revisan la afirmación, no la demostración.",
              explain: "Las tres pruebas hacen que valga la pena defender la tesis. El ensayo todavía tiene que demostrarla con evidencia, y algunos lectores seguirán sin estar de acuerdo. Por eso es debatible.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Renueva una tesis",
          brief: "Pon una de tus tesis a prueba con las tres pruebas.",
          steps: [
            "Busca una tesis que hayas escrito para la escuela, o escribe una sobre una regla que cambiarías.",
            "Aplica las tres pruebas y anota cuáles no pasa.",
            "Revísala hasta que pase las tres.",
            "Lee la versión vieja y la nueva a alguien de tu casa. Pregúntale cuál le deja más claro lo que vas a demostrar.",
          ],
        },
      ],
    },
    {
      id: "reasons-evidence",
      title: "Razones y evidencia",
      summary: "Una tesis sólida señala sus razones, y cada razón necesita evidencia. Si la evidencia dice otra cosa, la tesis cambia.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Una tesis con mapa",
          blocks: [
            {
              type: "text",
              text: "Muchas tesis nombran las razones que el ensayo va a desarrollar. Así el lector sabe qué va a demostrar cada párrafo.",
            },
            {
              type: "points",
              items: [
                "Solo la afirmación: “Nuestra escuela debería empezar a las 8:30”.",
                "Afirmación con razones: “Nuestra escuela debería empezar a las 8:30, porque los alumnos dormirían más, llegarían a tiempo con más frecuencia y rendirían mejor en la primera clase”.",
              ],
            },
            { type: "text", text: "Cada razón se convierte en un párrafo de desarrollo, y cada una necesita su propia evidencia." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Haz espacio para la postura contraria",
          blocks: [
            {
              type: "text",
              text: "Empezar la tesis con “aunque” muestra que conoces la objeción más fuerte y que, aun así, sostienes tu postura.",
            },
            {
              type: "points",
              items: [
                "“Aunque entrar más tarde retrasaría los entrenamientos deportivos, nuestra escuela debería empezar a las 8:30, porque los alumnos necesitan dormir más para aprender bien”.",
                "La primera parte admite un costo real. La segunda dice por qué la afirmación sigue ganando.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "La tesis provisional",
          blocks: [
            {
              type: "text",
              text: "Tu primera tesis es provisional: una apuesta que pones a prueba con la evidencia. Si la investigación muestra algo que no esperabas, cambia la tesis en lugar de ignorar la evidencia.",
            },
            {
              type: "points",
              items: [
                "Tesis provisional: “La ciudad debería construir un parque de patinaje, porque los adolescentes no tienen adónde ir después de clases”.",
                "Luego descubres que el centro comunitario ya ofrece talleres gratuitos por la tarde, pero no tiene espacio al aire libre.",
                "Tesis revisada: “La ciudad debería construir un parque de patinaje junto al centro comunitario, para que sus talleres de la tarde ganen el espacio al aire libre que les falta”.",
              ],
            },
            { type: "text", text: "Cambiar la tesis para que coincida con la evidencia no es perder. Así es como una tesis llega a sostenerse." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "¿Apoya la tesis?",
          prompt:
            "Tesis: “La escuela debería poner un bebedero en el tercer piso, porque los alumnos de ese piso tienen que bajar hasta la planta baja para tomar agua”. Clasifica cada evidencia.",
          widget: {
            kind: "sorter",
            categories: ["Apoya la tesis", "No la apoya"],
            items: [
              { id: "gym", text: "El gimnasio se pintó durante las vacaciones.", answer: 1 },
              { id: "first-floor", text: "Los únicos bebederos de la escuela están en la planta baja, y en el tercer piso hay ocho salones.", answer: 0 },
              { id: "juice", text: "A algunos alumnos les gusta más el jugo que el agua.", answer: 1 },
              { id: "teachers", text: "Los maestros del tercer piso dicen que los alumnos piden salir de clase seguido para ir por agua.", answer: 0 },
              { id: "survey", text: "En una encuesta en el pasillo, 40 de 50 alumnos del tercer piso dijeron que no toman agua en toda la jornada.", answer: 0 },
              { id: "bottled", text: "La cafetería vende agua embotellada a la hora del almuerzo.", answer: 1 },
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
              prompt:
                "Tesis: “La piscina municipal debería abrir hasta las 21:00 en verano, porque muchas familias no pueden ir antes de la noche”. ¿Qué evidencia la apoya mejor?",
              choices: [
                "La piscina se construyó en 1985, y el verano pasado la pintaron de nuevo y le pusieron camastros nuevos.",
                "Nadar es buen ejercicio para personas de todas las edades.",
                "La piscina tiene un tobogán azul donde los niños más chicos hacen fila.",
                "En una encuesta a usuarios de la piscina, la mayoría de los padres dijo trabajar hasta las 18:00 o más tarde.",
              ],
              answer: 3,
              hint: "¿Qué dato explica por qué las familias no pueden ir antes?",
              explain: "La encuesta habla justo de la razón de la tesis: las familias no pueden ir hasta la noche. Los otros datos pueden ser ciertos, pero no tocan esa razón.",
            },
            {
              id: "q2",
              prompt: "¿Qué hace una tesis que empieza con “Aunque”?",
              choices: [
                "Evita tomar partido para que ningún lector se moleste",
                "Admite una objeción y luego hace su afirmación",
                "Convierte la afirmación en una pregunta para el lector",
                "Enumera todas las razones antes de afirmar algo",
              ],
              answer: 1,
              hint: "Lee por separado las dos mitades de una tesis con “aunque”.",
              explain: "La parte con “aunque” nombra la objeción más fuerte. La parte principal sigue tomando partido con claridad, y eso muestra que quien escribe pesó los dos lados.",
            },
            {
              id: "q3",
              prompt: "A mitad de la investigación, encuentras evidencia sólida en contra de tu tesis provisional. ¿Qué haces?",
              choices: [
                "Reviso la tesis para que coincida con la evidencia",
                "Dejo la evidencia fuera del ensayo",
                "Mantengo la tesis y espero que nadie se dé cuenta",
                "Abandono el tema y empiezo un ensayo completamente nuevo",
              ],
              answer: 0,
              hint: "Una tesis provisional es una apuesta que se pone a prueba.",
              explain: "La tesis debe seguir a la evidencia. Revisarla o acotarla mantiene honesto tu argumento y lo hace más fuerte.",
            },
            {
              id: "q4",
              prompt: "Una tesis nombra tres razones. ¿Cuántos párrafos de desarrollo suele sugerir?",
              choices: [
                "Uno, porque la tesis es una sola oración",
                "Diez, para que el ensayo se vea completo",
                "Tres, uno por cada razón",
                "Ninguno; las razones van todas en la introducción",
              ],
              answer: 2,
              hint: "Vuelve a la tesis con mapa. ¿En qué se convirtió cada una de sus razones?",
              explain: "Un plan común dedica un párrafo de desarrollo a cada razón, con su propia evidencia. En ensayos más largos, una razón puede ocupar más de un párrafo.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Revisa la evidencia",
          brief: "Comprueba que cada razón de tu tesis tenga evidencia detrás.",
          steps: [
            "Toma la tesis que revisaste en la lección anterior.",
            "Anota las razones que da, o agrega dos o tres si no tiene ninguna.",
            "Para cada razón, escribe una evidencia que tengas o que podrías conseguir: un dato, una cifra, un ejemplo o la opinión de un experto.",
            "Marca las razones sin evidencia. Quítalas o búscales apoyo.",
            "Escribe una versión de tu tesis con “aunque” que admita la objeción más fuerte.",
            "Explica en voz alta tu tesis y sus razones a alguien de tu casa en menos de un minuto.",
          ],
        },
      ],
    },
    {
      id: "test-revise",
      title: "Ponla a prueba y ajústala",
      summary: "Somete la tesis a preguntas difíciles y luego quita las palabras que la debilitan.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Tres preguntas difíciles",
          blocks: [
            {
              type: "points",
              items: [
                "¿Y qué? ¿Por qué le importaría al lector? Si no sabes responder, agrega qué está en juego y para quién.",
                "¿Cómo lo sabes? ¿Puedes nombrar evidencia para cada razón?",
                "¿Quién no está de acuerdo y por qué? Si nadie lo estaría, la tesis todavía no es debatible.",
              ],
            },
            { type: "text", text: "Házselas a tu propia tesis antes de que lo haga un lector." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Quita el relleno",
          blocks: [
            { type: "text", text: "Las frases de relleno hacen que la tesis suene insegura y esconden la afirmación." },
            {
              type: "points",
              items: [
                "“En mi opinión, yo creo que…” La tesis ya es tu opinión. Quita las dos.",
                "“En este ensayo voy a demostrar que…” Mejor haz la afirmación.",
                "“Debido al hecho de que” se convierte en “porque”.",
                "“Se podría tal vez decir que quizá…” Comprométete con una afirmación y luego limítala donde la evidencia lo pida.",
              ],
            },
            {
              type: "text",
              text: "Antes: “En mi opinión, yo creo que tal vez nuestra escuela debería considerar empezar más tarde debido al hecho de que los alumnos están cansados”. Después: “Nuestra escuela debería empezar más tarde, porque los alumnos cansados aprenden menos”.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Una tesis sobre un texto",
          blocks: [
            {
              type: "text",
              text: "Los ensayos sobre literatura también necesitan tesis. Hacen una afirmación debatible sobre lo que significa un texto o sobre cómo logra el autor un efecto.",
            },
            {
              type: "points",
              items: [
                "Resumen, no tesis: “En Romeo y Julieta, dos jóvenes de familias enemigas se enamoran y mueren”.",
                "Tesis: “Aunque el prólogo presenta a los amantes como marcados por el destino, la prisa de Romeo y Julieta pesa más en la tragedia que la mala suerte”.",
              ],
            },
            { type: "text", text: "Hay lectores que discuten esa idea, y tendrías que demostrarla con detalles de la obra." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "¿Con relleno o directa?",
          prompt: "Clasifica cada tesis. ¿Tiene relleno o es clara y directa?",
          widget: {
            kind: "sorter",
            categories: ["Con relleno", "Clara y directa"],
            items: [
              { id: "dog-tight", text: "La ciudad debería construir un parque para perros, para que los dueños dejen de usar la cancha de la escuela.", answer: 1 },
              { id: "recess-wordy", text: "En este ensayo voy a estar demostrando que el recreo debería ser más largo.", answer: 0 },
              {
                id: "bus-wordy",
                text: "Debido al hecho de que los autobuses suelen llegar tarde, es posible que se pudiera considerar empezar más tarde.",
                answer: 0,
              },
              {
                id: "recess-tight",
                text: "El recreo de secundaria debería durar 30 minutos, porque los alumnos se concentran mejor después de un descanso de verdad.",
                answer: 1,
              },
              { id: "dog-wordy", text: "En mi opinión, yo personalmente creo que la ciudad tal vez debería construir un parque para perros.", answer: 0 },
              { id: "bus-tight", text: "Como los autobuses llegan tarde casi todas las mañanas, nuestra escuela debería mover la primera clase a las 8:15.", answer: 1 },
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
              prompt: "¿Cuál es la versión más directa de “En mi opinión, yo pienso que nuestra escuela, en cierta forma, tal vez debería tener más clases de arte”?",
              choices: [
                "Yo pienso, en mi opinión, que tal vez debería haber más arte.",
                "Nuestra escuela debería tener más clases de arte en cierta forma.",
                "En este ensayo hablaré de las clases de arte.",
                "Nuestra escuela debería ofrecer una clase de arte cada semestre.",
              ],
              answer: 3,
              hint: "Quita el relleno, conserva la afirmación y precisa qué significa “más”.",
              explain:
                "La versión de cada semestre quita “en mi opinión”, “yo pienso” y “tal vez”, y convierte “más” en algo preciso. Las demás conservan el relleno, siguen siendo vagas o pierden la afirmación.",
            },
            {
              id: "q2",
              prompt: "Te preguntas “¿Y qué?” sobre tu tesis y no sabes responder. ¿Qué deberías agregar?",
              choices: [
                "Más adjetivos para que la afirmación suene viva",
                "Una pregunta al final para el lector",
                "Por qué importa: a quién afecta y cómo",
                "La palabra “definitivamente” para darle fuerza",
              ],
              answer: 2,
              hint: "“¿Y qué?” pregunta qué está en juego.",
              explain: "A los lectores les importa una tesis cuando ven a quién afecta y cómo. Los adjetivos y palabras como “definitivamente” suenan más fuertes, pero no agregan razones.",
            },
            {
              id: "q3",
              prompt: "¿Cuál es una tesis sobre un texto, y no un dato o un resumen?",
              choices: [
                "Romeo y Julieta es una obra que William Shakespeare escribió en la década de 1590.",
                "En Romeo y Julieta, la prisa de los amantes causa la tragedia más que el destino.",
                "Romeo y Julieta se conocen en una fiesta en la casa de la familia Capuleto.",
                "Romeo y Julieta ocurre en Verona, una ciudad del norte de Italia.",
              ],
              answer: 1,
              hint: "¿Cuál podría discutir un lector usando la propia obra?",
              explain:
                "La oración sobre la prisa y el destino hace una interpretación que los lectores debaten y que se puede apoyar con detalles de la obra. Las demás son datos sobre la obra.",
            },
            {
              id: "q4",
              prompt: "¿Por qué quitar “En este ensayo voy a demostrar que” de una tesis?",
              choices: [
                "La afirmación es más fuerte y directa sin ella",
                "Es un error de gramática empezar así",
                "Los maestros nunca permiten la palabra “ensayo” en una tesis",
                "Hace que la tesis sea demasiado específica",
              ],
              answer: 0,
              hint: "¿Qué le agrega la frase a la afirmación en sí?",
              explain: "La frase es gramaticalmente correcta, pero retrasa la afirmación y no le agrega nada. Empezar con la afirmación suena más seguro y le ahorra tiempo al lector.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Tu tesis, a prueba",
          brief: "Construye la tesis de un ensayo real y aplícale todo lo de este curso.",
          steps: [
            "Elige un ensayo que tengas pendiente, o una pregunta que te importe.",
            "Escribe una tesis provisional con tus razones principales.",
            "Aplica las tres pruebas: debatible, específica y acotada.",
            "Hazte las tres preguntas difíciles: ¿Y qué? ¿Cómo lo sabes? ¿Quién no está de acuerdo?",
            "Quita las palabras de relleno.",
            "Lee la tesis final a alguien de tu casa y pídele que la contradiga. Anota lo que diga: ese es tu párrafo de contraargumento.",
          ],
        },
      ],
    },
  ],
};

export default tesisEs;
