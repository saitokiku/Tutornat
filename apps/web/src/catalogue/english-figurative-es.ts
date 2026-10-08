import type { CatalogueEntry } from "./types";

const figuradoEs: CatalogueEntry = {
  id: "english-figurative-es",
  title: "Lenguaje figurado",
  summary: "Símiles, metáforas, frases hechas, refranes, personificación e hipérbole: qué significan y para qué sirven.",
  subject: "english",
  grade: "4",
  locale: "es",
  lessons: [
    {
      id: "literal-figurative",
      title: "¿Literal o figurado?",
      summary: "El lenguaje literal dice exactamente lo que pasa. El figurado crea una imagen para decir algo con fuerza.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Dos maneras de usar las palabras",
          blocks: [
            { type: "text", text: "El lenguaje literal dice exactamente lo que pasa. “Está lloviendo mucho” es literal." },
            {
              type: "text",
              text: "El lenguaje figurado usa las palabras de una manera especial para crear una imagen. “Está lloviendo a cántaros” es figurado: no caen cántaros del cielo.",
            },
            { type: "points", items: ["Literal: El perro corrió por el patio.", "Figurado: Me muero de hambre."] },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "¿Para qué sirve?",
          blocks: [
            { type: "text", text: "El lenguaje figurado te ayuda a ver, oír o sentir lo que quiere decir quien escribe." },
            {
              type: "text",
              text: "“Esta mochila pesa una tonelada” no es verdad: una tonelada son mil kilos. Pero entiendes enseguida que la mochila pesa mucho.",
            },
            { type: "text", text: "Cuando leas lenguaje figurado, pregúntate: ¿qué quiere decir de verdad?" },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "¿Literal o figurado?",
          prompt: "Lee cada oración. ¿Dice exactamente lo que pasa?",
          widget: {
            kind: "sorter",
            categories: ["Literal", "Figurado"],
            items: [
              { id: "sopa", text: "Comimos sopa en el almuerzo.", answer: 0 },
              { id: "tortuga", text: "Mi hermano es una tortuga para vestirse.", answer: 1 },
              { id: "elefante", text: "Tengo tanta hambre que me comería un elefante.", answer: 1 },
              { id: "cuna", text: "El bebé durmió en su cuna.", answer: 0 },
              { id: "sonrisa", text: "Su sonrisa brillaba como el sol.", answer: 1 },
              { id: "autobus", text: "El autobús llegó diez minutos tarde.", answer: 0 },
            ],
          },
        },
        {
          id: "s4",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "¿Qué oración es literal?",
              choices: ["El salón era un zoológico.", "El tiempo vuela cuando te diviertes.", "El gato se sentó en la ventana."],
              answer: 2,
              hint: "¿Cuál puede pasar tal cual está escrita?",
              explain: "Un gato de verdad puede sentarse en la ventana. Un salón no es un zoológico, y el tiempo no tiene alas.",
            },
            {
              id: "q2",
              prompt: "“El examen fue pan comido”. ¿Qué quiere decir?",
              choices: ["Fue muy fácil.", "Trataba de comida.", "Duró muy poco."],
              answer: 0,
              hint: "Piensa en lo fácil que es comerse un pedazo de pan.",
              explain: "“Ser pan comido” quiere decir que algo es muy fácil. En el examen no había pan.",
            },
            {
              id: "q3",
              prompt: "¿Por qué alguien diría “mis pies eran dos bloques de hielo” en vez de “tenía los pies fríos”?",
              choices: ["Porque sus pies se volvieron hielo", "Para que sientas lo fríos que estaban", "Para que la oración sea más corta"],
              answer: 1,
              hint: "¿La oración quiere ser verdad palabra por palabra?",
              explain: "Los pies no se vuelven hielo. La imagen de los bloques de hielo te hace sentir lo fríos que estaban.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Un dicho, dos dibujos",
          brief: "Dibuja lo que dicen las palabras y lo que de verdad quieren decir.",
          steps: [
            "Dobla una hoja por la mitad.",
            "Elige un dicho: llover a cántaros, ser pan comido o morirse de hambre.",
            "A la izquierda, dibuja lo que dicen las palabras.",
            "A la derecha, dibuja lo que quiere decir de verdad.",
            "Enséñale los dibujos a alguien y pídele que adivine el dicho.",
          ],
        },
      ],
    },
    {
      id: "similes-metaphors",
      title: "Símiles y metáforas",
      summary: "Los dos comparan cosas distintas. El símil usa como. La metáfora dice que una cosa es otra.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "El símil",
          blocks: [
            { type: "text", text: "Un símil, o comparación, relaciona dos cosas distintas usando la palabra como." },
            { type: "points", items: ["Nada como un pez.", "Su pelo era suave como la seda.", "Duerme como un tronco."] },
            { type: "text", text: "También hay símiles con parece o igual que: “Las nubes parecen algodón”." },
            { type: "text", text: "Pregúntate en qué se parecen las dos cosas. Un pez nada con facilidad, así que él también." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "La metáfora",
          blocks: [
            {
              type: "text",
              text: "Una metáfora también compara dos cosas distintas, pero dice que una cosa es la otra. No usa como.",
            },
            { type: "points", items: ["Tus dientes son perlas.", "El salón era un zoológico.", "La nieve era una manta blanca sobre la colina."] },
            { type: "text", text: "Los dientes no son perlas de verdad. Son blancos y brillan como perlas." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Ojo con la palabra como",
          blocks: [
            { type: "text", text: "En español, la palabra como no siempre compara." },
            {
              type: "points",
              items: [
                "“Yo como pan” usa el verbo comer. No compara nada.",
                "“Como llovía, no salimos” quiere decir “porque llovía”.",
                "“Tomás es alto como su papá” compara a dos personas. Es una comparación literal, no un símil.",
              ],
            },
            { type: "text", text: "Un símil compara cosas muy distintas, como el pelo y la seda." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "¿Símil, metáfora o literal?",
          prompt: "Clasifica cada oración.",
          widget: {
            kind: "sorter",
            categories: ["Símil", "Metáfora", "Literal"],
            items: [
              { id: "liebre", text: "Corre como una liebre.", answer: 0 },
              { id: "diamantes", text: "Las estrellas eran diamantes en el cielo.", answer: 1 },
              { id: "manzanas", text: "Yo como manzanas.", answer: 2 },
              { id: "tomates", text: "Sus mejillas estaban rojas como tomates.", answer: 0 },
              { id: "huracan", text: "Mi hermanito es un huracán cuando juega.", answer: 1 },
              { id: "tomas", text: "Tomás es alto como su papá.", answer: 2 },
              { id: "espejo", text: "El lago era un espejo.", answer: 1 },
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
              prompt: "“La luna era una moneda de plata”. ¿Es un símil o una metáfora?",
              choices: ["Símil", "Metáfora"],
              answer: 1,
              hint: "Busca la palabra como.",
              explain: "Dice que la luna era una moneda, sin usar como. Por eso es una metáfora.",
            },
            {
              id: "q2",
              prompt: "¿Qué oración es un símil?",
              choices: ["Duerme como un tronco.", "Duerme mucho.", "Es un oso en invierno."],
              answer: 0,
              hint: "Busca una comparación con como entre dos cosas distintas.",
              explain: "“Como un tronco” compara usando como. “Es un oso en invierno” es una metáfora: dice que es un oso.",
            },
            {
              id: "q3",
              prompt: "“El patio era un horno”. ¿En qué se parecen el patio y un horno?",
              choices: ["Los dos están en la cocina.", "Los dos sirven para jugar.", "Los dos estaban muy calientes."],
              answer: 2,
              hint: "¿Cómo está un horno por dentro?",
              explain: "Un horno está muy caliente por dentro. La metáfora te dice que en el patio hacía mucho calor.",
            },
            {
              id: "q4",
              prompt: "Leo dice que “Yo como pan” es un símil porque tiene la palabra como. ¿Tiene razón?",
              choices: ["No. Ahí como es del verbo comer.", "Sí. Toda oración con como es un símil."],
              answer: 0,
              hint: "¿La oración compara dos cosas, o dice lo que alguien hace?",
              explain: "“Yo como pan” dice lo que alguien hace: comer. No compara nada, así que no es un símil.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Cazador de comparaciones",
          brief: "Busca símiles y metáforas en un libro de verdad.",
          steps: [
            "Elige un libro de cuentos o una novela de tu casa.",
            "Busca la palabra como. Anota los símiles que encuentres.",
            "Busca oraciones que digan que una cosa es otra. Pueden ser metáforas.",
            "Convierte un símil en metáfora: “nada como un pez” puede ser “es un pez en el agua”.",
            "Escribe un símil y una metáfora sobre alguien de tu familia.",
          ],
        },
      ],
    },
    {
      id: "idioms",
      title: "Frases hechas y refranes",
      summary: "Una frase hecha no significa lo que dicen sus palabras. Un refrán da un consejo.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Frases hechas",
          blocks: [
            { type: "text", text: "Una frase hecha es una expresión que quiere decir algo distinto de lo que dicen sus palabras." },
            {
              type: "points",
              items: [
                "Llover a cántaros: llover muchísimo.",
                "Ser pan comido: ser muy fácil.",
                "Estar en las nubes: estar distraído.",
                "Echar una mano: ayudar.",
                "Meter la pata: equivocarse.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Usa las pistas",
          blocks: [
            { type: "text", text: "Si no conoces una frase hecha, lee las oraciones de alrededor." },
            { type: "text", text: "“La bici de Jada costó un ojo de la cara. Ahorró su dinero durante un año entero para comprarla”." },
            { type: "text", text: "Ahorrar un año es una pista. “Costar un ojo de la cara” quiere decir costar muchísimo dinero." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Los refranes dan consejos",
          blocks: [
            { type: "text", text: "Un refrán es un dicho corto y conocido que da un consejo o una enseñanza." },
            {
              type: "points",
              items: [
                "Más vale tarde que nunca: es mejor hacer algo tarde que no hacerlo.",
                "Camarón que se duerme se lo lleva la corriente: si te distraes, pierdes tu oportunidad.",
                "Al mal tiempo, buena cara: ante un problema, mantén una buena actitud.",
              ],
            },
            { type: "text", text: "Muchos dichos cambian de un país a otro. En tu casa quizá se dicen distinto." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "¿Qué quiere decir?",
          prompt: "Clasifica cada frase hecha según lo que quiere decir.",
          widget: {
            kind: "sorter",
            categories: ["Es muy fácil", "Cuesta muchísimo", "Está distraído"],
            items: [
              { id: "pan", text: "ser pan comido", answer: 0 },
              { id: "juego", text: "ser un juego de niños", answer: 0 },
              { id: "ojo", text: "costar un ojo de la cara", answer: 1 },
              { id: "rinon", text: "costar un riñón", answer: 1 },
              { id: "nubes", text: "estar en las nubes", answer: 2 },
              { id: "luna", text: "estar en la luna", answer: 2 },
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
              prompt: "La entrenadora dijo: “Échame una mano con los balones”. ¿Qué quiso decir?",
              choices: ["Ayúdame con los balones.", "Dame tu mano.", "Lanza los balones."],
              answer: 0,
              hint: "Nadie le va a dar una mano de verdad. ¿Qué necesita la entrenadora?",
              explain: "“Echar una mano” quiere decir ayudar. La entrenadora pidió ayuda con los balones.",
            },
            {
              id: "q2",
              prompt: "Mateo no oyó la pregunta de la maestra porque estaba en las nubes. ¿Qué le pasaba?",
              choices: ["Estaba en un avión.", "Estaba subido al techo.", "Estaba distraído."],
              answer: 2,
              hint: "¿Por qué alguien no oiría una pregunta en clase?",
              explain: "“Estar en las nubes” quiere decir estar distraído. Por eso Mateo no oyó la pregunta.",
            },
            {
              id: "q3",
              prompt: "Lía llegó tarde al cumpleaños, pero llegó. ¿Qué refrán le queda?",
              choices: ["Camarón que se duerme se lo lleva la corriente.", "Más vale tarde que nunca.", "Al mal tiempo, buena cara."],
              answer: 1,
              hint: "¿Qué importa más: a qué hora llegó Lía, o que sí fue?",
              explain: "Llegar tarde es mejor que no llegar. Eso dice “Más vale tarde que nunca”.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Los dichos de mi familia",
          brief: "Junta los dichos y refranes que usa tu familia.",
          steps: [
            "Pregunta a dos familiares por un dicho o refrán que usen.",
            "Escribe cada dicho y lo que quiere decir.",
            "Pregunta: ¿cuándo lo dice la gente? ¿De dónde viene?",
            "Dibuja lo que dicen las palabras y lo que quiere decir de verdad.",
            "Comparte un dicho con tu clase o con un amigo.",
          ],
        },
      ],
    },
    {
      id: "personification-hyperbole",
      title: "Personificación e hipérbole",
      summary: "Dar rasgos humanos a lo que no es humano, y exagerar a propósito.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "La personificación",
          blocks: [
            { type: "text", text: "La personificación da acciones o sentimientos humanos a algo que no es humano." },
            {
              type: "points",
              items: ["El viento susurraba entre los árboles.", "El camión viejo se quejaba en la subida.", "Las flores bailaban con la brisa."],
            },
            { type: "text", text: "El viento no susurra de verdad. Pero así oyes lo suave que soplaba." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "La hipérbole",
          blocks: [
            { type: "text", text: "La hipérbole es una exageración enorme. Quien la dice no espera que la creas." },
            { type: "points", items: ["Te lo he dicho mil veces.", "Me muero de hambre.", "Tengo tanta tarea que no termino ni en un año."] },
            { type: "text", text: "La hipérbole dice algo con mucha fuerza: estoy muy molesto, tengo mucha hambre, tengo muchísima tarea." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Ponle nombre",
          prompt: "Clasifica cada oración. ¿Qué tipo de lenguaje figurado es?",
          widget: {
            kind: "sorter",
            categories: ["Símil", "Metáfora", "Personificación", "Hipérbole"],
            items: [
              { id: "sol", text: "El sol nos sonreía.", answer: 2 },
              { id: "anio", text: "Estoy tan cansado que dormiría un año entero.", answer: 3 },
              { id: "miel", text: "Su voz era dulce como la miel.", answer: 0 },
              { id: "cofre", text: "La biblioteca es un cofre del tesoro.", answer: 1 },
              { id: "hojas", text: "Las hojas bailaban con el viento.", answer: 2 },
              { id: "galletas", text: "Me comí cien galletas en el desayuno.", answer: 3 },
              { id: "chicle", text: "La nariz del gatito era rosada como un chicle.", answer: 0 },
              { id: "congelador", text: "Mi cuarto era un congelador.", answer: 1 },
            ],
          },
        },
        {
          id: "s4",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "“El trueno refunfuñaba a lo lejos”. ¿Qué tipo de lenguaje figurado es?",
              choices: ["Símil", "Hipérbole", "Personificación"],
              answer: 2,
              hint: "¿Quién refunfuña normalmente?",
              explain: "Las personas refunfuñan. Darle esa acción al trueno es una personificación.",
            },
            {
              id: "q2",
              prompt: "¿Qué oración es una hipérbole?",
              choices: ["Mi mochila pesa mucho.", "Mi mochila pesa mil kilos.", "Mi mochila es como el caparazón de una tortuga."],
              answer: 1,
              hint: "¿Cuál es una exageración que nadie creería?",
              explain: "Nadie puede cargar mil kilos, así que es una exageración. “Como el caparazón de una tortuga” es un símil.",
            },
            {
              id: "q3",
              prompt: "“La escalera se quejaba bajo mis pies”. ¿Qué te ayuda a oír?",
              choices: ["Que la escalera crujía fuerte.", "Que la escalera estaba viva.", "Que la escalera era nueva."],
              answer: 0,
              hint: "Una escalera no se queja. ¿Qué ruido hace una escalera vieja?",
              explain: "La personificación te ayuda a oír cómo crujía. La escalera no está viva, y una escalera nueva casi nunca cruje.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "El tiempo de hoy",
          brief: "Describe el tiempo de hoy con lenguaje figurado.",
          steps: [
            "Mira por la ventana. Fíjate en el cielo, el viento y si hace frío o calor.",
            "Escribe un símil sobre el tiempo.",
            "Escribe una metáfora sobre el tiempo.",
            "Escribe una personificación, como “El viento empujaba la puerta”.",
            "Escribe una hipérbole. Lee todo en voz alta y pide que adivinen cada tipo.",
          ],
        },
      ],
    },
  ],
};

export { practice } from "./english-figurative";

export default figuradoEs;
