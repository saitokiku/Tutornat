import type { CatalogueEntry } from "./types";

const herenciaEs: CatalogueEntry = {
  id: "science-heredity-es",
  title: "Herencia y genes",
  summary: "Descubre cómo pasan los rasgos de progenitores a descendientes a través del ADN, los genes y los cromosomas, y usa cuadros de Punnett para predecir las probabilidades.",
  subject: "science",
  grade: "8",
  locale: "es",
  lessons: [
    {
      id: "traits",
      title: "¿Heredado o adquirido?",
      summary: "Algunos rasgos vienen de los genes, otros vienen de la vida, y muchos dependen de las dos cosas.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Qué es un rasgo",
          blocks: [
            { type: "text", text: "Un rasgo es una característica de un ser vivo, como el color de una flor, la forma de una hoja o el tipo de sangre de una persona." },
            {
              type: "points",
              items: [
                "Los rasgos heredados pasan de los progenitores a sus descendientes a través de los genes. El color del pelaje de un perro y tu tipo de sangre son heredados.",
                "Los rasgos adquiridos aparecen durante la vida, por las experiencias o por el ambiente. Una cicatriz, saber andar en bicicleta y el idioma que hablas son adquiridos.",
              ],
            },
            {
              type: "text",
              text: "Los rasgos adquiridos no se transmiten por los genes. Un perro al que le enseñaron a sentarse no tiene cachorros que ya sepan sentarse.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Genes y ambiente a la vez",
          blocks: [
            {
              type: "text",
              text: "Muchos rasgos dependen de los genes y del ambiente. Tus genes influyen en cuánto puedes crecer, pero también influyen la comida, el sueño y la salud mientras creces.",
            },
            {
              type: "text",
              text: "Las hortensias lo muestran muy bien. La misma planta puede dar flores azules en un suelo ácido y flores rosadas en un suelo menos ácido.",
            },
            { type: "text", text: "Casi todos los rasgos humanos, como la estatura y el color de ojos, dependen de muchos genes a la vez, no de uno solo." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "¿Heredado o adquirido?",
          prompt: "Clasifica cada rasgo. ¿Se hereda por los genes o se adquiere durante la vida?",
          widget: {
            kind: "sorter",
            categories: ["Heredado", "Adquirido"],
            items: [
              { id: "scar", text: "Una cicatriz por una caída", answer: 1 },
              { id: "blood", text: "Tu tipo de sangre", answer: 0 },
              { id: "coat", text: "El color del pelaje de un perro", answer: 0 },
              { id: "bike", text: "Saber andar en bicicleta", answer: 1 },
              { id: "stripes", text: "Las rayas de un tigre", answer: 0 },
              { id: "language", text: "El idioma que hablas", answer: 1 },
              { id: "muscles", text: "Músculos fuertes por nadar todos los días", answer: 1 },
              { id: "eyes", text: "El color natural de los ojos", answer: 0 },
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
              prompt: "¿Cuál de estos es un rasgo adquirido?",
              choices: ["El tipo de sangre", "El color natural del pelo", "Un tatuaje"],
              answer: 2,
              hint: "Los rasgos adquiridos vienen de la experiencia o del ambiente, no de los genes.",
              explain: "Un tatuaje se hace durante la vida, así que es adquirido. El tipo de sangre y el color natural del pelo se heredan por los genes.",
            },
            {
              id: "q2",
              prompt: "Un ratón pierde la cola en un accidente. ¿Sus crías nacerán sin cola?",
              choices: ["No. Perder la cola no cambia los genes que pasa a sus crías.", "Sí. Las crías salen como su padre o su madre, así que nacerán sin cola."],
              answer: 0,
              hint: "¿La cola perdida está escrita en los genes del ratón?",
              explain:
                "Perder la cola es un cambio adquirido y no cambia los genes del ratón. En la década de 1880, el biólogo August Weismann les cortó la cola a ratones durante varias generaciones, y todas las crías nuevas nacieron con cola.",
            },
            {
              id: "q3",
              prompt: "Dos gemelos idénticos crecen en países distintos. De adultos, uno mide 3 cm más que el otro. ¿Qué explica mejor la diferencia?",
              choices: ["En realidad tienen genes distintos.", "Crecieron con distinta alimentación y salud.", "La estatura es un rasgo adquirido, no heredado."],
              answer: 1,
              hint: "Los gemelos idénticos tienen los mismos genes.",
              explain: "Los gemelos idénticos tienen los mismos genes, así que la diferencia de estatura tiene que venir del ambiente, como la alimentación y la salud mientras crecían.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Hojas de sol y hojas de sombra",
          brief: "Comprueba si el ambiente cambia un rasgo cuando los genes son los mismos. Necesitas una regla y un árbol o arbusto que tenga un lado al sol y otro a la sombra.",
          steps: [
            "Busca un árbol o arbusto al que le dé el sol de un lado y la sombra del otro.",
            "Con permiso, toma 5 hojas del lado soleado y 5 del lado sombreado. Tómalas solo de una planta que una persona adulta diga que es segura, y lávate las manos al terminar.",
            "Mide el largo de cada hoja y calcula el promedio de cada lado.",
            "Todas las hojas crecieron en la misma planta, así que tienen los mismos genes. ¿Qué te dice cualquier diferencia?",
            "Escribe una oración sobre un rasgo que depende de los genes y otra sobre un rasgo que depende del ambiente.",
          ],
        },
      ],
    },
    {
      id: "genes-dna",
      title: "Genes, ADN y cromosomas",
      summary: "Dónde se guardan las instrucciones de los rasgos, cómo están empacadas y cómo se transmiten.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Instrucciones en cada célula",
          blocks: [
            {
              type: "text",
              text: "Dentro del núcleo de tus células está el ADN, una molécula larguísima con forma de escalera torcida. A esa forma se le llama doble hélice.",
            },
            {
              type: "text",
              text: "El ADN está escrito con un código de cuatro letras químicas: A, T, C y G. El orden de las letras lleva las instrucciones para formar y hacer funcionar a un ser vivo.",
            },
            {
              type: "points",
              items: [
                "Un gen es un tramo de ADN con las instrucciones para un producto, casi siempre una proteína. Las personas tenemos unos 20 000 genes que codifican proteínas.",
                "Un cromosoma es una molécula larga de ADN, muy enrollada y empacada con proteínas. Cada cromosoma contiene muchos genes.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Cromosomas en pares",
          blocks: [
            {
              type: "text",
              text: "Casi todas las células del cuerpo humano tienen 46 cromosomas, en 23 pares. De cada par, recibiste un cromosoma de cada uno de tus progenitores biológicos.",
            },
            {
              type: "visual",
              visual: { kind: "number-line", min: 0, max: 50, marks: [0, 23, 46] },
              alt: "Una recta numérica de 0 a 50, con marcas en 23, los cromosomas de un óvulo o un espermatozoide, y en 46, los cromosomas de casi todas las células del cuerpo humano.",
            },
            {
              type: "text",
              text: "Los óvulos y los espermatozoides son distintos: cada uno lleva solo 23 cromosomas, uno de cada par. Cuando un óvulo y un espermatozoide se unen, la nueva célula vuelve a tener 46.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "El óvulo de una mosca de la fruta",
          prompt: "Las células del cuerpo de una mosca de la fruta tienen 8 cromosomas, en 4 pares. ¿Cuántos cromosomas lleva uno de sus óvulos? Mueve el marcador.",
          widget: { kind: "number-line", min: 0, max: 10, step: 1, start: 0, target: 4 },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Los alelos",
          blocks: [
            {
              type: "text",
              text: "Los genes tienen distintas versiones, llamadas alelos. En las plantas de guisante (también llamado chícharo o arveja), un gen del color de la flor tiene un alelo para flores moradas y otro para flores blancas.",
            },
            {
              type: "text",
              text: "Como los cromosomas vienen en pares, tienes dos copias de casi todos tus genes. Las dos copias pueden ser el mismo alelo o dos alelos distintos.",
            },
            {
              type: "text",
              text: "Cada óvulo o espermatozoide recibe un cromosoma de cada par, elegido al azar. Con 23 pares, una persona puede formar más de 8 millones de combinaciones distintas. Por eso, entre otras cosas, los hermanos nunca son exactamente iguales, salvo los gemelos idénticos.",
            },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Nombra la parte",
          prompt: "Clasifica cada descripción. ¿Habla del ADN, de un gen, de un alelo o de un cromosoma?",
          widget: {
            kind: "sorter",
            categories: ["ADN", "Gen", "Alelo", "Cromosoma"],
            items: [
              { id: "section", text: "Un tramo de ADN con las instrucciones para una proteína", answer: 1 },
              { id: "code", text: "La molécula que lleva el código escrito con A, T, C y G", answer: 0 },
              { id: "coiled", text: "Una molécula larga de ADN, muy enrollada", answer: 3 },
              { id: "version", text: "Una versión de un gen, como la de las flores blancas del guisante", answer: 2 },
              { id: "ladder", text: "Tiene forma de escalera torcida", answer: 0 },
              { id: "pairs", text: "Casi todas las células humanas tienen 23 pares", answer: 3 },
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
              prompt: "¿Cuántos cromosomas hay en un espermatozoide humano?",
              choices: ["23", "46", "92"],
              answer: 0,
              hint: "Las células sexuales llevan un cromosoma de cada par.",
              explain: "Un espermatozoide lleva 23 cromosomas, uno de cada par. Al unirse con los 23 del óvulo, la nueva célula tiene 46.",
            },
            {
              id: "q2",
              prompt: "¿Qué es un gen?",
              choices: ["Un cromosoma entero, bien enrollado", "Una célula diminuta que lleva un rasgo", "Un tramo de una molécula de ADN"],
              answer: 2,
              hint: "Los genes son más pequeños que los cromosomas. Cada cromosoma tiene muchos.",
              explain: "Un gen es un tramo de ADN. Un cromosoma es una molécula de ADN completa y contiene muchos genes.",
            },
            {
              id: "q3",
              prompt: "¿Por qué los hermanos de los mismos padres no son exactamente iguales?",
              choices: [
                "Porque sus genes cambian de distinta forma al crecer.",
                "Porque a cada hijo le toca una mezcla de cromosomas al azar.",
                "Porque solo el hijo mayor recibe genes de los dos padres.",
              ],
              answer: 1,
              hint: "Piensa en cómo cada óvulo o espermatozoide recibe un cromosoma de cada par.",
              explain: "Cada óvulo y cada espermatozoide lleva un juego de cromosomas elegido al azar. Así, a cada hijo le toca una combinación distinta de los mismos dos padres, salvo a los gemelos idénticos.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Baraja los cromosomas",
          brief: "Haz un modelo de cómo las células sexuales reciben una mezcla de cromosomas al azar. Tu modelo es un ser vivo inventado con solo 3 pares. Necesitas papel, dos lápices de colores, tijeras y una moneda.",
          steps: [
            "Recorta 6 tiras de papel. Pinta 3 de azul y 3 de rojo, y numera cada color con 1, 2 y 3. Cada número es un par: una tira azul y una roja.",
            "Pon los pares en fila: el 1 con el 1, el 2 con el 2 y el 3 con el 3.",
            "Para formar una célula sexual, lanza la moneda una vez por cada par: si sale cara, toma la tira azul; si sale el otro lado, la roja. Anota las tres que te tocaron.",
            "Forma 8 células sexuales así. ¿Cuántas combinaciones distintas te salieron? Con 3 pares, hay 2 × 2 × 2 = 8 posibles.",
            "Explica por qué 23 pares dan más de 8 millones de combinaciones posibles.",
          ],
        },
      ],
    },
    {
      id: "dominant-recessive",
      title: "Dominante y recesivo",
      summary: "Las plantas de guisante de Mendel, y por qué un rasgo puede saltarse una generación.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Los guisantes de Mendel",
          blocks: [
            {
              type: "text",
              text: "En las décadas de 1850 y 1860, Gregor Mendel, un monje de lo que hoy es la República Checa, cultivó miles de plantas de guisante y contó sus rasgos.",
            },
            {
              type: "text",
              text: "Cruzó plantas de flores moradas con plantas de flores blancas. Toda la descendencia tuvo flores moradas. Parecía que el rasgo blanco había desaparecido.",
            },
            { type: "text", text: "Luego dejó que esas plantas moradas se cruzaran entre sí. En la generación siguiente volvieron las flores blancas, en más o menos 1 de cada 4 plantas." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Alelos dominantes y recesivos",
          blocks: [
            {
              type: "points",
              items: [
                "Un alelo dominante muestra su rasgo siempre que está presente. Se escribe con mayúscula: en el guisante, P es el alelo de las flores moradas.",
                "Un alelo recesivo muestra su rasgo solo cuando las dos copias son recesivas. Se escribe con minúscula: p es el alelo de las flores blancas.",
              ],
            },
            { type: "text", text: "El alelo blanco nunca desapareció. Estaba escondido en las plantas moradas, que tenían una P y una p cada una." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Genotipo y fenotipo",
          blocks: [
            {
              type: "points",
              items: [
                "Genotipo: el par de alelos, como PP, Pp o pp.",
                "Fenotipo: el rasgo que se puede observar, como flores moradas o blancas.",
                "Homocigoto: dos alelos iguales, como PP o pp.",
                "Heterocigoto: dos alelos distintos, como Pp.",
              ],
            },
            { type: "text", text: "Las plantas PP y las Pp tienen flores moradas. Solo las plantas pp tienen flores blancas." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "¿Rasgo dominante o recesivo?",
          prompt:
            "En las plantas de guisante, las flores moradas (P) dominan sobre las blancas (p), y las plantas altas (T) dominan sobre las bajas (t). Clasifica cada genotipo: ¿la planta muestra el rasgo dominante o el recesivo?",
          widget: {
            kind: "sorter",
            categories: ["Rasgo dominante", "Rasgo recesivo"],
            items: [
              { id: "Pp", text: "Pp", answer: 0 },
              { id: "pp", text: "pp", answer: 1 },
              { id: "TT", text: "TT", answer: 0 },
              { id: "tt", text: "tt", answer: 1 },
              { id: "PP", text: "PP", answer: 0 },
              { id: "Tt", text: "Tt", answer: 0 },
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
              prompt: "Una planta de guisante tiene el genotipo Pp. ¿De qué color son sus flores?",
              choices: ["Moradas", "Blancas", "Lilas, una mezcla de las dos"],
              answer: 0,
              hint: "P es dominante. ¿Basta con una copia de P para que se note?",
              explain: "Basta con un alelo dominante. Una planta Pp tiene flores moradas y lleva escondido el alelo blanco.",
            },
            {
              id: "q2",
              prompt: "¿Qué genotipo es homocigoto recesivo?",
              choices: ["TT", "Tt", "tt"],
              answer: 2,
              hint: "Homocigoto quiere decir que los dos alelos son iguales. Los alelos recesivos van con minúscula.",
              explain: "tt tiene dos copias del alelo recesivo, así que es homocigoto recesivo. TT es homocigoto dominante y Tt es heterocigoto.",
            },
            {
              id: "q3",
              prompt: "En una generación de guisantes, Mendel contó 5474 semillas lisas y 1850 semillas rugosas. ¿Más o menos qué proporción es?",
              choices: ["1 : 1", "2 : 1", "3 : 1", "4 : 1"],
              answer: 2,
              hint: "Divide 5474 entre 1850.",
              explain: "5474 ÷ 1850 da unos 2.96, muy cerca de 3 : 1. Es la proporción que se espera al cruzar dos plantas heterocigotas.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Dibuja las flores blancas perdidas",
          brief: "Usa dibujos para explicar cómo las flores blancas se saltaron una generación. Necesitas papel y lápices de colores.",
          steps: [
            "Dibuja una planta de flores moradas con la etiqueta PP y una de flores blancas con la etiqueta pp.",
            "Dibuja su descendencia. Cada planta hija recibe un alelo de cada progenitor, así que todas son Pp. Colorea sus flores.",
            "Ahora cruza dos plantas Pp. Escribe las cuatro formas en que pueden juntarse sus alelos: P con P, P con p, p con P y p con p.",
            "Colorea una flor para cada combinación y cuenta: ¿cuántas moradas y cuántas blancas?",
            "Usa tus dibujos para explicarle a alguien en casa cómo las flores blancas se saltaron una generación.",
          ],
        },
      ],
    },
    {
      id: "punnett",
      title: "Cuadros de Punnett y probabilidad",
      summary: "Predice la descendencia de un cruce y descubre por qué una predicción es una probabilidad, no una promesa.",
      minutes: 16,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Un cuadro de Punnett",
          blocks: [
            {
              type: "text",
              text: "Un cuadro de Punnett predice la descendencia de un cruce. Escribe los dos alelos de un progenitor arriba y los del otro al costado. Llena cada casilla con una letra de arriba y una del costado.",
            },
            {
              type: "points",
              items: [
                "Cruce Pp × Pp. Arriba: P y p. Al costado: P y p.",
                "Las cuatro casillas: PP, Pp, Pp, pp.",
                "Genotipos: 1 PP : 2 Pp : 1 pp.",
                "Fenotipos: 3 moradas : 1 blanca.",
              ],
            },
            {
              type: "visual",
              visual: { kind: "fraction", parts: 4, shaded: 1 },
              alt: "Una barra dividida en 4 partes iguales con 1 parte sombreada: 1 de las 4 casillas, pp, da flores blancas.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Probabilidades, no promesas",
          blocks: [
            { type: "text", text: "Cada casilla es un resultado igual de probable. En Pp × Pp, cada semilla tiene 1 probabilidad entre 4 de ser pp. Es decir, un 25 %." },
            {
              type: "text",
              text: "Cada descendiente es una nueva oportunidad, como lanzar otra vez una moneda. Cuatro semillas podrían salir todas moradas, o dos podrían salir blancas. La proporción 3 : 1 se nota bien solo con mucha descendencia. Por eso Mendel contó miles de plantas.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "La probabilidad de blanco",
          prompt: "Se cruzan dos plantas Pp. Muestra la probabilidad de que un descendiente tenga flores blancas, como fracción de las 4 casillas.",
          widget: { kind: "fraction-bar", parts: 1, shaded: 0, target: { parts: 4, shaded: 1 } },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Otro cruce",
          blocks: [
            { type: "text", text: "Ahora cruza una planta Pp con una planta pp. Arriba: P y p. Al costado: p y p." },
            {
              type: "points",
              items: ["Las cuatro casillas: Pp, pp, Pp, pp.", "Genotipos: 2 Pp : 2 pp.", "Fenotipos: 2 moradas : 2 blancas, que es lo mismo que 1 : 1."],
            },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Ahora, blancas",
          prompt: "En el cruce Pp × pp, muestra la probabilidad de que un descendiente tenga flores blancas, como fracción de las 4 casillas.",
          widget: { kind: "fraction-bar", parts: 1, shaded: 0, target: { parts: 4, shaded: 2 } },
        },
        {
          id: "s6",
          kind: "slide",
          title: "Cuando el ADN cambia",
          blocks: [
            {
              type: "text",
              text: "A veces el ADN cambia. Un cambio en el ADN se llama mutación. Las mutaciones pueden ocurrir al copiarse el ADN o por causas como la luz ultravioleta intensa.",
            },
            {
              type: "text",
              text: "Muchas mutaciones no tienen ningún efecto. Algunas son dañinas y unas pocas son útiles. Solo las mutaciones de los óvulos o los espermatozoides pueden pasar a la descendencia.",
            },
          ],
        },
        {
          id: "s7",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "Se cruzan dos plantas de guisante Tt (T = alta, t = baja). ¿Qué fracción de la descendencia se espera que sea baja?",
              choices: ["0", "1/4", "1/2", "3/4"],
              answer: 1,
              hint: "Dibuja el cuadro. ¿Qué casillas tienen dos t minúsculas?",
              explain: "Las casillas son TT, Tt, Tt y tt. Solo tt es baja: 1 de las 4 casillas, o sea 1/4.",
            },
            {
              id: "q2",
              prompt: "Se cruza una planta TT con una planta tt. ¿Qué porcentaje de la descendencia se espera que sea alta?",
              choices: ["25 %", "50 %", "75 %", "100 %"],
              answer: 3,
              hint: "Cada descendiente recibe un alelo de cada progenitor. ¿Qué puede dar la planta TT?",
              explain: "Todas las casillas son Tt. Cada descendiente recibe T de un progenitor y t del otro. Como T es dominante, toda la descendencia es alta.",
            },
            {
              id: "q3",
              prompt: "Dos plantas Pp producen 4 semillas, y ninguna da flores blancas. ¿Quiere decir que el cuadro de Punnett estaba mal?",
              choices: ["No. Cada semilla tenía 1 probabilidad entre 4 de ser blanca.", "Sí. Con 4 semillas, exactamente 1 tenía que ser blanca."],
              answer: 0,
              hint: "¿Una probabilidad de 1 entre 4 promete que pasará exactamente 1 vez de cada 4?",
              explain:
                "Un cuadro de Punnett da probabilidades. La probabilidad de que las 4 semillas salgan moradas es (3/4)⁴, alrededor del 32 %, así que pasa seguido. Con cientos de semillas, cerca de 1/4 saldrían blancas.",
            },
          ],
        },
        {
          id: "s8",
          kind: "project",
          title: "Flores al azar con monedas",
          brief: "Usa monedas para repetir muchas veces un cruce Pp × Pp. Necesitas dos monedas y un cuaderno.",
          steps: [
            "Cada moneda es un progenitor Pp. Si sale cara, pasa P; si sale el otro lado, pasa p.",
            "Lanza las dos monedas a la vez para formar un descendiente. Anota su genotipo: PP, Pp o pp.",
            "Repite hasta tener 40 descendientes.",
            "Cuenta los pp. El cuadro de Punnett predice más o menos 1/4 de 40, que es 10. ¿Qué tan cerca quedaste?",
            "Lanza 40 veces más, o suma tus resultados a los de otra persona. ¿El total se acerca más a 1/4?",
          ],
        },
      ],
    },
  ],
};

export { practice } from "./science-heredity";

export default herenciaEs;
