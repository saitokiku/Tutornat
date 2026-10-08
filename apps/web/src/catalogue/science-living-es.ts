import type { CatalogueEntry } from "./types";

// Habilidades de práctica de este curso: s.living, s.needs (src/practice/science/early.ts).
const livingEs: CatalogueEntry = {
  id: "science-living-es",
  title: "Seres vivos y no vivos",
  summary: "Los seres vivos crecen y necesitan comida, agua y aire. Descubre qué está vivo y qué no.",
  subject: "science",
  grade: "K",
  locale: "es",
  lessons: [
    {
      id: "what-living-things-do",
      title: "Qué hacen los seres vivos",
      summary: "Los seres vivos crecen y se reproducen. Necesitan comida, agua y aire.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Los seres vivos crecen",
          blocks: [
            { type: "text", text: "Un ser vivo crece y cambia." },
            {
              type: "points",
              items: ["Un cachorro crece y se hace perro.", "Una semilla crece y se hace planta.", "Un bebé crece y se hace niño grande."],
            },
            { type: "text", text: "Tú eres un ser vivo. Tú también estás creciendo." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Comida, agua y aire",
          blocks: [
            { type: "text", text: "Los seres vivos necesitan comida, agua y aire." },
            {
              type: "points",
              items: ["Los animales comen.", "Las plantas usan la luz para hacer su comida.", "Plantas y animales necesitan agua y aire."],
            },
            { type: "text", text: "Una planta sin agua se seca." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "¿Ser vivo o no?",
          prompt: "¿Es un ser vivo? Toca Ser vivo o No vivo en cada uno.",
          widget: {
            kind: "sorter",
            categories: ["Ser vivo", "No vivo"],
            items: [
              { id: "rock", text: "Una piedra", answer: 1 },
              { id: "cat", text: "Un gato", answer: 0 },
              { id: "tree", text: "Un árbol", answer: 0 },
              { id: "spoon", text: "Una cuchara", answer: 1 },
              { id: "ball", text: "Una pelota", answer: 1 },
              { id: "butterfly", text: "Una mariposa", answer: 0 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Los seres vivos se reproducen",
          blocks: [
            { type: "text", text: "Los seres vivos forman otros seres vivos parecidos a ellos." },
            {
              type: "points",
              items: [
                "Las gatas tienen gatitos.",
                "Las gallinas ponen huevos. De algunos huevos salen pollitos.",
                "Las plantas dan semillas. De las semillas nacen plantas nuevas.",
              ],
            },
          ],
        },
        {
          id: "s5",
          kind: "slide",
          title: "Una piedra no es un ser vivo",
          blocks: [
            { type: "text", text: "Una piedra no crece. No come ni bebe." },
            { type: "text", text: "Una piedra nunca tiene piedritas bebé. No es un ser vivo." },
            { type: "text", text: "Un carrito de juguete se mueve. Pero no crece. No es un ser vivo." },
          ],
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "¿Cuál es un ser vivo?",
              choices: ["Una piedra", "Un perro", "Una cuchara"],
              answer: 1,
              hint: "Pregúntate por cada uno. ¿Crece? ¿Necesita comida?",
              explain: "Un perro come, bebe y crece. Puede tener cachorros. Es un ser vivo.",
            },
            {
              id: "q2",
              prompt: "Un gatito está más grande cada semana. ¿Qué le pasa?",
              choices: ["Está durmiendo", "Se está derritiendo", "Está creciendo"],
              answer: 2,
              hint: "Tú también estás más grande cada año.",
              explain: "El gatito está creciendo. Los seres vivos crecen.",
            },
            {
              id: "q3",
              prompt: "¿Qué necesitan las plantas y los animales?",
              choices: ["Tierra y piedras", "Agua y aire", "Pasto y semillas"],
              answer: 1,
              hint: "Piensa en una planta y en un gato. ¿Qué necesitan los dos?",
              explain: "Plantas y animales necesitan agua y aire para vivir.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "A buscar seres vivos",
          brief: "Busca seres vivos y cosas sin vida, adentro o afuera.",
          steps: [
            "Da una vuelta con una persona adulta.",
            "Encuentra 3 seres vivos. Dibújalos.",
            "Encuentra 3 cosas que no son seres vivos. Dibújalas también.",
            "Para cada ser vivo, di cómo lo sabes.",
          ],
        },
      ],
    },
    {
      id: "tricky-ones",
      title: "Casos difíciles",
      summary: "Algunas cosas se mueven y no son seres vivos. Algunos seres vivos no caminan.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Moverse no basta",
          blocks: [
            { type: "text", text: "Un carro se mueve. El viento se mueve. El río también." },
            { type: "text", text: "Pero no crecen. Nunca tienen crías." },
            { type: "text", text: "Moverse no hace que algo sea un ser vivo." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Quieto, pero vivo",
          blocks: [
            { type: "text", text: "Un árbol no camina. Pero es un ser vivo." },
            {
              type: "points",
              items: ["Crece más alto cada año.", "Toma agua por sus raíces.", "Da semillas que se vuelven árboles nuevos."],
            },
            { type: "text", text: "Un hongo también es un ser vivo. Crece y forma más hongos." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Casos difíciles",
          prompt: "Estos son difíciles. ¿Cada uno es un ser vivo o no?",
          widget: {
            kind: "sorter",
            categories: ["Ser vivo", "No vivo"],
            items: [
              { id: "cactus", text: "Un cactus", answer: 0 },
              { id: "robot", text: "Un robot", answer: 1 },
              { id: "wind", text: "El viento", answer: 1 },
              { id: "mushroom", text: "Un hongo", answer: 0 },
              { id: "river", text: "Un río", answer: 1 },
              { id: "snail", text: "Un caracol", answer: 0 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Semillas dormidas",
          blocks: [
            { type: "text", text: "Una semilla parece una piedrita." },
            { type: "text", text: "Pero adentro hay una plantita. Está esperando." },
            { type: "text", text: "Dale agua y un lugar tibio. Empieza a crecer." },
            { type: "text", text: "Una semilla es un ser vivo." },
          ],
        },
        {
          id: "s5",
          kind: "slide",
          title: "El fuego y las nubes",
          blocks: [
            { type: "text", text: "El fuego puede hacerse más grande. Las nubes se mueven y cambian." },
            { type: "text", text: "Pero el fuego nunca tiene crías. Las nubes tampoco." },
            { type: "text", text: "El fuego y las nubes no son seres vivos." },
            { type: "text", text: "Nunca toques el fuego. Te puede quemar." },
          ],
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "Un robot camina y habla. ¿Es un ser vivo?",
              choices: ["Sí", "No"],
              answer: 1,
              hint: "¿Un robot puede crecer o tener crías?",
              explain: "Las personas construyen los robots. Un robot nunca crece. No es un ser vivo.",
            },
            {
              id: "q2",
              prompt: "Hay un frijol seco en un frasco. ¿Es un ser vivo?",
              choices: ["Sí", "No"],
              answer: 0,
              hint: "¿Qué pasa si siembras un frijol y lo riegas?",
              explain: "Dentro del frijol hay una plantita. Está esperando para crecer. Es un ser vivo.",
            },
            {
              id: "q3",
              prompt: "¿Cuál es un ser vivo, pero no puede caminar?",
              choices: ["Un carro", "El viento", "Un árbol"],
              answer: 2,
              hint: "¿Cuál da semillas?",
              explain: "Un árbol se queda en su lugar. Igual crece y da semillas. Es un ser vivo.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Despierta una semilla",
          brief: "Demuestra que una semilla seca es un ser vivo.",
          steps: [
            "Dobla una toalla de papel mojada. Ponla dentro de un vaso transparente.",
            "Mete un frijol seco entre la toalla y el vaso.",
            "Mantén la toalla mojada. Mira el frijol cada día.",
            "Después de unos días, busca una raíz pequeñita.",
            "Cuéntale a un adulto: ¿el frijol es un ser vivo? ¿Cómo lo sabes?",
          ],
        },
      ],
    },
    {
      id: "what-they-need",
      title: "Lo que necesitan plantas y animales",
      summary: "Los animales necesitan comida, agua y aire. Las plantas necesitan luz, agua y aire.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Lo que necesitan los animales",
          blocks: [
            { type: "text", text: "Los animales necesitan comida, agua y aire." },
            { type: "points", items: ["Una vaca come pasto.", "Un perro bebe agua.", "Tú respiras aire de día y de noche."] },
            { type: "text", text: "Los animales no pueden hacer su comida. Tienen que buscarla." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Lo que necesitan las plantas",
          blocks: [
            { type: "text", text: "Las plantas necesitan luz, agua y aire." },
            { type: "text", text: "Las plantas no comen. Hacen su propia comida." },
            { type: "text", text: "Las hojas usan luz, aire y agua para hacer comida." },
            { type: "text", text: "Las raíces toman agua de la tierra." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "¿Plantas, animales o los dos?",
          prompt: "¿Quién hace esto? ¿Las plantas, los animales o los dos?",
          widget: {
            kind: "sorter",
            categories: ["Plantas", "Animales", "Los dos"],
            items: [
              { id: "water", text: "Necesita agua", answer: 2 },
              { id: "makes-food", text: "Hace su propia comida", answer: 0 },
              { id: "eats", text: "Come alimentos", answer: 1 },
              { id: "air", text: "Necesita aire", answer: 2 },
              { id: "hunts", text: "Camina, nada o vuela para buscar comida", answer: 1 },
              { id: "roots", text: "Tiene raíces", answer: 0 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Un lugar seguro",
          blocks: [
            { type: "text", text: "Muchos animales necesitan un lugar seguro. Se llama refugio." },
            {
              type: "points",
              items: ["Un pájaro hace un nido para sus huevos.", "Un zorro cava una madriguera.", "Algunos osos duermen en cuevas en invierno."],
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
              prompt: "¿Qué recibe una planta del Sol?",
              choices: ["Tierra", "Agua", "Luz"],
              answer: 2,
              hint: "¿Qué ves cuando sale el Sol?",
              explain: "El Sol les da luz a las plantas. Con la luz hacen su comida.",
            },
            {
              id: "q2",
              prompt: "¿De dónde saca su comida una planta?",
              choices: ["La hace ella misma", "Come tierra", "Bebe agua de lluvia"],
              answer: 0,
              hint: "¿Una planta tiene boca?",
              explain: "Las hojas hacen comida con luz, aire y agua. Las plantas no comen tierra.",
            },
            {
              id: "q3",
              prompt: "Un pájaro hace un nido. ¿Qué le da el nido?",
              choices: ["Comida para comer", "Un lugar seguro", "Agua para beber"],
              answer: 1,
              hint: "¿Qué pone el pájaro en su nido?",
              explain: "El nido es un refugio. Protege los huevos y los pollitos.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "¿Luz u oscuridad?",
          brief: "Averigua si una planta necesita luz.",
          steps: [
            "Consigue dos plantas pequeñas que se vean iguales.",
            "Pon una planta junto a una ventana con sol.",
            "Pon la otra planta en un armario oscuro.",
            "Riega las dos con la misma cantidad de agua.",
            "Mira las hojas cada día durante una semana.",
            "¿Qué cambió? Luego pon las dos plantas otra vez en la luz.",
          ],
        },
      ],
    },
    {
      id: "changing-homes",
      title: "Los seres vivos cambian su hogar",
      summary: "Animales, plantas y personas cambian los lugares donde viven.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Cavan y construyen",
          blocks: [
            { type: "text", text: "Los seres vivos cambian los lugares donde viven." },
            {
              type: "points",
              items: [
                "Una ardilla cava hoyos para esconder nueces.",
                "Las lombrices hacen túneles en la tierra.",
                "Un pájaro hace un nido con ramitas y pasto.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Un castor hace un estanque",
          blocks: [
            { type: "text", text: "El castor roe árboles con sus dientes hasta tumbarlos." },
            { type: "text", text: "Con palos y barro, cierra el paso del arroyo. Es una presa." },
            { type: "text", text: "El agua se acumula detrás de la presa. Se forma un estanque." },
            { type: "text", text: "Ahora ahí pueden vivir patos y ranas." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "¿Quién hizo el cambio?",
          prompt: "Mira cada cambio. ¿Lo hizo un ser vivo?",
          widget: {
            kind: "sorter",
            categories: ["Un ser vivo", "No fue un ser vivo"],
            items: [
              { id: "puddle", text: "Un charco después de la lluvia", answer: 1 },
              { id: "nut-hole", text: "Un hoyo donde una ardilla escondió una nuez", answer: 0 },
              { id: "pond", text: "Un estanque detrás de la presa de un castor", answer: 0 },
              { id: "leaf-pile", text: "Hojas que el viento juntó en un montón", answer: 1 },
              { id: "snow", text: "Nieve amontonada después de una tormenta", answer: 1 },
              { id: "ant-tunnels", text: "Túneles que cavaron las hormigas", answer: 0 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Las plantas también cambian los lugares",
          blocks: [
            { type: "text", text: "Las raíces de los árboles crecen bajo la tierra." },
            { type: "text", text: "Las raíces grandes pueden levantar y romper una acera." },
            { type: "text", text: "Las raíces también sujetan la tierra cuando llueve." },
          ],
        },
        {
          id: "s5",
          kind: "slide",
          title: "Las personas también",
          blocks: [
            { type: "text", text: "Las personas somos seres vivos. También cambiamos los lugares." },
            { type: "points", items: ["Construimos casas y calles.", "Cortamos árboles.", "Sembramos huertos y árboles."] },
            { type: "text", text: "Podemos elegir cambios que ayuden a otros seres vivos." },
          ],
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "¿Cómo cambia un castor un arroyo?",
              choices: ["Hace una presa", "Se toma toda el agua", "Congela el agua"],
              answer: 0,
              hint: "Piensa en palos y barro.",
              explain: "El castor hace una presa con palos y barro. Así se forma un estanque.",
            },
            {
              id: "q2",
              prompt: "Las raíces de un árbol rompieron la acera. ¿Qué hizo el cambio?",
              choices: ["Un viento fuerte", "Una tormenta de lluvia", "Un ser vivo"],
              answer: 2,
              hint: "Las raíces son parte de algo. ¿De qué?",
              explain: "Las raíces son parte del árbol. El árbol es un ser vivo. Un ser vivo hizo el cambio.",
            },
            {
              id: "q3",
              prompt: "¿Qué cambio hacen las personas?",
              choices: ["Construir una calle", "Cavar un túnel de lombriz", "Hacer un nido de ramitas"],
              answer: 0,
              hint: "¿Quién maneja carros en las calles?",
              explain: "Las personas construyen calles. Las lombrices cavan túneles. Los pájaros hacen nidos.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Busca cambios hechos por seres vivos",
          brief: "Busca cambios hechos por seres vivos cerca de tu casa.",
          steps: [
            "Sal con una persona adulta.",
            "Busca hoyos, nidos, hojas mordidas o huellas.",
            "Busca una acera rota por raíces.",
            "Dibuja un cambio. ¿Quién lo hizo?",
            "Cuéntale a un adulto para qué le sirve ese cambio.",
          ],
        },
      ],
    },
  ],
};

export default livingEs;
