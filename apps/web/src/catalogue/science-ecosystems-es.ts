import type { CatalogueEntry } from "./types";

const ecosistemasEs: CatalogueEntry = {
  id: "science-ecosystems-es",
  title: "Ecosistemas y redes alimentarias",
  summary: "Sigue la energía del Sol a través de productores, consumidores y descomponedores, arma redes alimentarias y nombra las formas en que los seres vivos dependen unos de otros.",
  subject: "science",
  grade: "7",
  locale: "es",
  lessons: [
    {
      id: "roles",
      title: "Productores, consumidores y descomponedores",
      summary: "Cada ser vivo de un ecosistema tiene un papel: producir alimento, comérselo o descomponer lo que queda.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Quién produce el alimento y quién se lo come",
          blocks: [
            {
              type: "text",
              text: "Un ecosistema es el conjunto de seres vivos de un lugar junto con todo lo no vivo de lo que dependen, como el agua, el suelo, la luz del sol y el aire.",
            },
            {
              type: "points",
              items: [
                "Los productores fabrican su propio alimento. Las plantas, las algas y algunas bacterias usan la energía de la luz del sol para producir azúcar mediante la fotosíntesis.",
                "Los consumidores obtienen energía comiendo otros seres vivos.",
                "Los descomponedores, sobre todo hongos y bacterias, desintegran plantas y animales muertos y desechos.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Tipos de consumidores",
          blocks: [
            {
              type: "points",
              items: [
                "Los herbívoros comen plantas o algas. Un venado que come hojas es herbívoro.",
                "Los carnívoros comen otros animales. Un halcón que caza una serpiente es carnívoro.",
                "Los omnívoros comen de los dos. Los osos, los mapaches y la mayoría de las personas son omnívoros.",
                "Los carroñeros, como los zopilotes y los buitres, comen animales que ya estaban muertos.",
              ],
            },
            {
              type: "text",
              text: "Los descomponedores devuelven al suelo los nutrientes de los seres muertos, y así los productores pueden volver a usarlos. Sin ellos, las hojas secas y los cuerpos se irían amontonando.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "¿Qué papel tiene?",
          prompt: "Clasifica cada ser vivo según su papel en el ecosistema.",
          widget: {
            kind: "sorter",
            categories: ["Productor", "Consumidor", "Descomponedor"],
            items: [
              { id: "rabbit", text: "Un conejo", answer: 1 },
              { id: "grass", text: "El pasto", answer: 0 },
              { id: "mushroom", text: "Un hongo que crece en un tronco podrido", answer: 2 },
              { id: "hawk", text: "Un halcón", answer: 1 },
              { id: "algae", text: "Las algas de un estanque", answer: 0 },
              { id: "mold", text: "El moho del pan viejo", answer: 2 },
              { id: "oak", text: "Un roble", answer: 0 },
              { id: "bear", text: "Un oso negro", answer: 1 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "La energía empieza en el Sol",
          blocks: [
            {
              type: "text",
              text: "Casi todas las cadenas alimentarias empiezan con la luz del sol. Los productores captan su energía y la guardan en el azúcar. Todos los consumidores reciben esa energía de los productores, ya sea directamente o al comerse a alguien que la recibió.",
            },
            {
              type: "text",
              text: "Hay excepciones poco comunes. Junto a las fuentes hidrotermales del fondo del mar, donde no llega la luz, algunas bacterias producen alimento a partir de sustancias químicas.",
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
              prompt: "¿Cuál de estos es un productor?",
              choices: ["Un champiñón", "Un saltamontes", "Un tiburón", "Un alga marina"],
              answer: 3,
              hint: "¿Cuál de estos puede fabricar su propio alimento con la luz del sol?",
              explain:
                "Un alga marina fabrica su alimento por fotosíntesis. Los champiñones son hongos, que son descomponedores. Los saltamontes y los tiburones son consumidores.",
            },
            {
              id: "q2",
              prompt: "Un mapache come moras, insectos y peces. ¿Qué tipo de consumidor es?",
              choices: ["Herbívoro", "Carnívoro", "Omnívoro"],
              answer: 2,
              hint: "Mira la lista de lo que come: ¿solo plantas, solo animales o las dos cosas?",
              explain: "Un animal que come plantas y animales es omnívoro.",
            },
            {
              id: "q3",
              prompt: "¿Qué pasaría en un bosque sin descomponedores?",
              choices: [
                "Las plantas crecerían más rápido, sin hongos ni bacterias que las dañen.",
                "Lo muerto se amontonaría y al suelo le faltarían nutrientes.",
                "No cambiaría nada, porque los descomponedores son muy pequeños.",
              ],
              answer: 1,
              hint: "Los descomponedores desintegran lo que está muerto. ¿A dónde van sus nutrientes?",
              explain: "Los descomponedores devuelven al suelo los nutrientes de los seres muertos. Sin ellos, lo muerto se amontonaría y a los productores les faltarían nutrientes.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Descomponedores en acción",
          brief: "Observa cómo los descomponedores deshacen el alimento y comprueba qué necesitan. Necesitas dos rebanadas de pan, dos bolsas con cierre, agua y un marcador.",
          steps: [
            "Mete una rebanada en una bolsa y rocíala con unas gotas de agua. Mete la otra rebanada seca en la segunda bolsa. Cierra las dos y ponles etiqueta.",
            "Deja las dos bolsas juntas en el mismo lugar tibio y oscuro.",
            "Míralas todos los días, hasta dos semanas, sin abrirlas. Dibuja lo que veas.",
            "¿En qué rebanada salió moho primero? ¿Qué te dice eso sobre lo que necesitan los descomponedores?",
            "Tira las dos bolsas sin abrirlas. Algunos mohos pueden enfermar a las personas.",
          ],
        },
      ],
    },
    {
      id: "food-webs",
      title: "Cadenas y redes alimentarias",
      summary: "Dibuja los caminos que sigue la energía y predice qué pasa cuando desaparece un ser vivo.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Cadenas alimentarias",
          blocks: [
            { type: "text", text: "Una cadena alimentaria muestra un camino que sigue la energía en un ecosistema: pasto → saltamontes → rana → serpiente → halcón." },
            {
              type: "text",
              text: "Cada flecha va del ser vivo que es comido al que se lo come. Las flechas muestran hacia dónde fluye la energía.",
            },
            {
              type: "points",
              items: [
                "El pasto es el productor.",
                "El saltamontes es un consumidor primario: se come al productor.",
                "La rana es un consumidor secundario: se come al consumidor primario.",
                "La serpiente y el halcón son consumidores de nivel superior. El halcón es el depredador más alto de esta cadena.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Redes alimentarias",
          blocks: [
            {
              type: "text",
              text: "En la naturaleza no hay cadenas sueltas. Casi todos los animales comen más de una cosa, y casi todos son comida de más de un animal. Una red alimentaria muestra todas las cadenas conectadas.",
            },
            {
              type: "points",
              items: ["Pasto → saltamontes → rana → serpiente → halcón", "Pasto → conejo → halcón", "Pasto → ratón → serpiente", "Pasto → ratón → halcón"],
            },
            { type: "text", text: "En esta red de la pradera, el halcón come conejos, ratones y serpientes. Los ratones son alimento de las serpientes y de los halcones." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Los niveles de la pradera",
          prompt: "Usa la red de la pradera. Clasifica cada ser vivo: ¿productor, consumidor primario o consumidor de nivel superior?",
          widget: {
            kind: "sorter",
            categories: ["Productor", "Consumidor primario", "Consumidor de nivel superior"],
            items: [
              { id: "frog", text: "Rana", answer: 2 },
              { id: "grass", text: "Pasto", answer: 0 },
              { id: "rabbit", text: "Conejo", answer: 1 },
              { id: "hawk", text: "Halcón", answer: 2 },
              { id: "grasshopper", text: "Saltamontes", answer: 1 },
              { id: "snake", text: "Serpiente", answer: 2 },
              { id: "mouse", text: "Ratón", answer: 1 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Un cambio se extiende por la red",
          blocks: [
            { type: "text", text: "Como todo en la red está conectado, un cambio en una población afecta a las demás." },
            {
              type: "points",
              items: [
                "Si desaparecieran las ranas de la pradera, los saltamontes perderían un depredador y seguramente aumentarían. Más saltamontes se comerían más pasto.",
                "Las serpientes perderían una fuente de alimento y dependerían más de los ratones.",
              ],
            },
            {
              type: "text",
              text: "Un caso real: las nutrias marinas comen erizos de mar, y los erizos comen kelp, un alga gigante. Donde se cazó a las nutrias hasta casi acabar con ellas, los erizos se multiplicaron y arrasaron los bosques de kelp. Donde las nutrias volvieron, el kelp volvió a crecer.",
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
              prompt: "En la cadena pasto → saltamontes → rana, ¿hacia dónde fluye la energía?",
              choices: ["Del pasto al saltamontes y a la rana", "De la rana al saltamontes y al pasto", "De un lado a otro, entre los tres"],
              answer: 0,
              hint: "Las flechas van de lo que es comido a quien se lo come.",
              explain: "La energía sigue las flechas: el saltamontes la recibe del pasto y la rana la recibe del saltamontes.",
            },
            {
              id: "q2",
              prompt: "En la red de la pradera, una enfermedad mata a casi todos los ratones. ¿Qué es probable que les pase a las serpientes?",
              choices: [
                "Nada, porque en esta red las serpientes no comen ratones.",
                "Empezarán a comer el pasto que dejaron los ratones.",
                "Tendrán menos alimento, así que podrían disminuir.",
              ],
              answer: 2,
              hint: "Busca todas las flechas que salen del ratón.",
              explain: "Los ratones son alimento de serpientes y halcones. Con menos ratones, las serpientes tienen menos comida: pueden disminuir y comer más ranas.",
            },
            {
              id: "q3",
              prompt: "¿Por qué se redujeron los bosques de kelp donde se cazaba a las nutrias marinas?",
              choices: [
                "Porque los erizos se multiplicaron y se comieron el kelp.",
                "Porque las nutrias comen kelp y, sin ellas, el kelp se murió.",
                "Porque el agua se enfrió cuando se fueron las nutrias.",
              ],
              answer: 0,
              hint: "Sigue la cadena: kelp → erizo de mar → nutria marina.",
              explain: "Las nutrias mantienen a raya a los erizos. Sin nutrias, los erizos se multiplicaron y se comieron el kelp. Un cambio arriba se extendió por toda la cadena.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "La red alimentaria de tu barrio",
          brief: "Arma una red alimentaria con seres vivos que encuentres afuera. Observa de cerca, pero no toques animales silvestres.",
          steps: [
            "Ve a un jardín, un parque o el patio de la escuela. Anota al menos seis seres vivos que veas, o señales de ellos, como hojas mordidas o excrementos.",
            "Marca cada uno como productor, consumidor o descomponedor.",
            "Dibuja flechas de cada ser vivo hacia quien se lo come. Usa lo que sabes o búscalo.",
            "Encuentra un ser vivo que forme parte de dos o más cadenas.",
            "Predice qué le pasaría a tu red si desapareciera uno de sus seres vivos.",
          ],
        },
      ],
    },
    {
      id: "energy-pyramid",
      title: "La pirámide de energía",
      summary: "Por qué solo una pequeña parte de la energía pasa de un nivel al siguiente, y por qué hay pocos depredadores grandes.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "La energía se gasta en el camino",
          blocks: [
            {
              type: "text",
              text: "Cuando un conejo come pasto, no recibe toda la energía que el pasto captó. El pasto usó gran parte solo para mantenerse vivo, y esa energía se fue como calor. Algunas partes, como las raíces, no se las come nadie.",
            },
            { type: "text", text: "El conejo, a su vez, usa casi toda su energía para moverse, mantenerse caliente y seguir vivo. Mucha se le escapa en forma de calor." },
            {
              type: "visual",
              visual: { kind: "fraction", parts: 10, shaded: 1 },
              alt: "Una barra dividida en 10 partes iguales con 1 parte sombreada: en promedio, solo una décima parte de la energía de un nivel llega al siguiente.",
            },
            {
              type: "text",
              text: "En promedio, solo alrededor del 10 % de la energía de un nivel pasa al siguiente. Por eso se le llama la regla del 10 %. La cantidad real varía, pero siempre es una parte pequeña.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "¿Por qué una pirámide?",
          blocks: [
            {
              type: "text",
              text: "Una pirámide de energía muestra cuánta energía hay en cada nivel de una cadena alimentaria. Los productores forman la base ancha. Los depredadores más altos están en la punta angosta.",
            },
            {
              type: "points",
              items: [
                "Productores: 10 000 unidades de energía",
                "Consumidores primarios: unas 1000 unidades",
                "Consumidores secundarios: unas 100 unidades",
                "Consumidores terciarios: unas 10 unidades",
              ],
            },
            {
              type: "text",
              text: "Por eso hay muchos menos halcones que ratones, y por eso las cadenas alimentarias casi nunca tienen más de cuatro o cinco eslabones.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Un nivel más arriba",
          prompt: "Los productores de un campo captan 10 000 unidades de energía. ¿Más o menos cuánta llega a los consumidores primarios que se los comen? Usa la regla del 10 % y mueve el marcador.",
          widget: { kind: "number-line", min: 0, max: 2000, step: 100, start: 0, target: 1000 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Dos niveles más arriba",
          prompt: "Ahora sube un nivel más. ¿Más o menos cuánta de esa energía llega a los consumidores secundarios?",
          widget: { kind: "number-line", min: 0, max: 200, step: 10, start: 0, target: 100 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "¿Por qué en un ecosistema hay menos depredadores grandes que herbívoros?",
              choices: [
                "Porque son más grandes y caben menos en un lugar.",
                "Porque los depredadores no necesitan mucha energía.",
                "Porque en la punta de la pirámide queda poca energía.",
              ],
              answer: 2,
              hint: "Piensa en lo que le pasa a la energía en cada escalón de la pirámide.",
              explain: "Cada nivel pasa solo alrededor del 10 % de su energía. Al llegar arriba, solo queda energía para mantener a unos pocos animales.",
            },
            {
              id: "q2",
              prompt: "¿A dónde va casi toda la energía que no pasa al siguiente nivel?",
              choices: [
                "Se pierde como calor, o queda en partes que nadie come.",
                "Se hunde en el suelo y se guarda ahí para siempre.",
                "Regresa hacia el Sol en forma de luz.",
              ],
              answer: 0,
              hint: "¿En qué gasta energía un conejo todos los días?",
              explain:
                "Los seres vivos usan casi toda su energía para moverse, mantenerse calientes y hacer funcionar su cuerpo, y esa energía se pierde como calor. Otra parte se queda en lo que nadie se come, como raíces y huesos.",
            },
            {
              id: "q3",
              prompt: "Los productores de una cadena tienen 5000 unidades de energía. Con la regla del 10 %, ¿más o menos cuánta llega a los consumidores secundarios?",
              choices: ["500 unidades", "50 unidades", "5 unidades"],
              answer: 1,
              hint: "Calcula el 10 % dos veces: una para los consumidores primarios y otra para los secundarios.",
              explain: "El 10 % de 5000 es 500 para los consumidores primarios. El 10 % de 500 es 50 para los secundarios.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Del plato al Sol",
          brief: "Cada comida que haces es el final de una cadena alimentaria. Sigue una hasta el Sol. Necesitas papel y lápiz.",
          steps: [
            "Anota todo lo que hay en una de tus comidas de hoy.",
            "Sigue cada alimento hasta llegar a un productor. Por ejemplo: el queso viene de la leche, la leche viene de una vaca y la vaca comió pasto.",
            "Dibuja cada uno como una cadena alimentaria contigo al final, con las flechas apuntando hacia ti.",
            "Cuenta los eslabones de cada cadena. ¿Qué alimento está a menos pasos del Sol?",
            "Usa la regla del 10 % para explicar qué alimento de tu comida necesitó más energía de las plantas para producirse.",
          ],
        },
      ],
    },
    {
      id: "relationships",
      title: "Vivir juntos",
      summary: "Depredación, competencia, mutualismo, comensalismo y parasitismo, y qué pone límite al tamaño de una población.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Cinco tipos de relaciones",
          blocks: [
            {
              type: "points",
              items: [
                "Depredación: un animal, el depredador, caza y se come a otro, la presa. Un halcón que atrapa un ratón.",
                "Competencia: dos seres vivos necesitan el mismo recurso limitado, como alimento, agua o espacio. Dos especies de aves que comen las mismas semillas.",
                "Mutualismo: los dos salen ganando. Las abejas obtienen néctar de las flores, y las flores quedan polinizadas.",
                "Comensalismo: uno sale ganando y al otro no le afecta. Un pájaro que hace su nido en un árbol.",
                "Parasitismo: uno, el parásito, sale ganando y perjudica al otro, el huésped. Una garrapata que se alimenta de un venado.",
              ],
            },
            {
              type: "text",
              text: "El mutualismo, el comensalismo y el parasitismo son tipos de simbiosis: dos especies distintas que viven en contacto cercano durante mucho tiempo.",
            },
          ],
        },
        {
          id: "s2",
          kind: "interactive",
          title: "Nombra la relación",
          prompt: "Clasifica cada ejemplo. ¿Qué tipo de relación es?",
          widget: {
            kind: "sorter",
            categories: ["Depredación", "Competencia", "Mutualismo", "Comensalismo", "Parasitismo"],
            items: [
              { id: "lichen", text: "Un hongo y un alga viven juntos formando un liquen. El alga produce alimento, y el hongo guarda agua y protege al alga.", answer: 2 },
              { id: "owl", text: "Un búho atrapa un ratón y se lo come.", answer: 0 },
              { id: "robin", text: "Un pájaro hace su nido en un árbol alto. Al árbol no le afecta.", answer: 3 },
              { id: "lions", text: "Los leones y las hienas cazan las mismas cebras.", answer: 1 },
              { id: "tapeworm", text: "Una tenia vive en el intestino de un perro y absorbe su alimento.", answer: 4 },
              { id: "barnacles", text: "Unos percebes viajan sobre una ballena hacia aguas con mucho alimento. A la ballena no le afecta.", answer: 3 },
              { id: "plants", text: "Dos plantas que crecen una junto a otra necesitan la misma luz y la misma agua.", answer: 1 },
              { id: "fleas", text: "Las pulgas se alimentan de la sangre de un gato.", answer: 4 },
            ],
          },
        },
        {
          id: "s3",
          kind: "slide",
          title: "Límites para una población",
          blocks: [
            {
              type: "visual",
              visual: {
                kind: "line-graph",
                points: [[0, 20], [1, 32], [2, 50], [3, 72], [4, 92], [5, 106], [6, 114], [7, 118], [8, 120]],
                xLabel: "Años",
                yLabel: "Número de venados",
              },
              alt: "Una gráfica de línea de la población de venados de un bosque de ejemplo. Empieza en 20, crece rápido durante unos años y luego se estabiliza en unos 120.",
            },
            { type: "text", text: "Una población no puede crecer sin fin. El alimento, el agua, el espacio y el refugio son limitados. Se les llama factores limitantes." },
            {
              type: "text",
              text: "La población más grande que un ambiente puede mantener a lo largo del tiempo es su capacidad de carga. Al acercarse a ella, la competencia por los recursos aumenta y el crecimiento se frena, como en este ejemplo.",
            },
          ],
        },
        {
          id: "s4",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "Una garrapata se pega a un venado y se alimenta de su sangre durante días. ¿Qué relación es?",
              choices: ["Depredación", "Parasitismo", "Mutualismo"],
              answer: 1,
              hint: "El venado sale perjudicado, pero no muere ni es devorado.",
              explain: "La garrapata se beneficia y el venado sale perjudicado sin que lo maten y se lo coman. Eso es parasitismo.",
            },
            {
              id: "q2",
              prompt: "Las garzas bueyeras siguen a las vacas y se comen los insectos que las vacas espantan del pasto. A las vacas no les afecta. ¿Qué relación es?",
              choices: ["Mutualismo", "Competencia", "Comensalismo"],
              answer: 2,
              hint: "¿Las vacas ganan o pierden algo?",
              explain: "Las garzas salen ganando y a las vacas ni les ayuda ni les perjudica, así que es comensalismo.",
            },
            {
              id: "q3",
              prompt: "Un estanque puede mantener a unas 200 ranas. Un año seco hace que el estanque se encoja. ¿Qué es lo más probable?",
              choices: [
                "Ahí caben menos ranas, así que su número baja.",
                "La población de ranas sigue creciendo como antes.",
                "No cambia nada, porque las ranas no necesitan mucha agua.",
              ],
              answer: 0,
              hint: "La capacidad de carga depende de los recursos. ¿Qué les pasó a los recursos?",
              explain: "Con menos agua y espacio, el estanque puede mantener menos ranas. La competencia aumenta y la población baja hacia la nueva capacidad de carga, que es menor.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Relaciones al aire libre",
          brief: "Observa cómo se relacionan los seres vivos y nombra lo que ves. Necesitas un cuaderno y 20 minutos al aire libre.",
          steps: [
            "Observa un jardín, un parque o un huerto durante 20 minutos. Fíjate bien en las flores, los árboles, los insectos y las aves.",
            "Describe al menos tres interacciones, como un insecto que visita una flor o dos pájaros que se pelean por la comida y uno ahuyenta al otro.",
            "Para cada una, pregúntate: ¿quién gana, quién sale perjudicado y a quién no le afecta?",
            "Nombra cada relación: depredación, competencia, mutualismo, comensalismo o parasitismo.",
            "Elige una y explica qué les podría pasar a las dos especies si esa relación terminara.",
          ],
        },
      ],
    },
  ],
};

export { practice } from "./science-ecosystems";

export default ecosistemasEs;
