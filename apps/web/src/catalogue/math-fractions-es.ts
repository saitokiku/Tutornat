import type { CatalogueEntry } from "./types";

const fraccionesEs: CatalogueEntry = {
  id: "math-fractions-es",
  title: "Fracciones: partes de un entero",
  summary: "Corta un entero en partes iguales, nombra las partes y encuéntralas en una recta numérica.",
  subject: "math",
  grade: "3",
  locale: "es",
  lessons: [
    {
      id: "halves-quarters",
      title: "Medios y cuartos",
      summary: "Corta un entero en 2 y en 4 partes iguales, y nombra cada parte.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Un entero, en partes iguales",
          blocks: [
            { type: "visual", visual: { kind: "fraction", parts: 1, shaded: 1 }, alt: "Una barra que es un solo entero, toda sombreada." },
            { type: "text", text: "Esto es un entero. Una fracción es una parte de un entero." },
            { type: "visual", visual: { kind: "fraction", parts: 2, shaded: 1 }, alt: "La misma barra cortada en 2 partes iguales. 1 parte está sombreada." },
            { type: "text", text: "Córtalo en 2 partes iguales. Cada parte es un medio. Se escribe 1/2." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Cuartos",
          blocks: [
            { type: "visual", visual: { kind: "fraction", parts: 4, shaded: 1 }, alt: "La misma barra cortada en 4 partes iguales. 1 parte está sombreada." },
            { type: "text", text: "Corta el mismo entero en 4 partes iguales. Cada parte es un cuarto: 1/4." },
            {
              type: "points",
              items: [
                "El número de abajo dice en cuántas partes iguales está dividido el entero.",
                "El número de arriba dice de cuántas de esas partes hablamos.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Haz tres cuartos",
          prompt: "Corta la barra en 4 partes iguales. Luego sombrea 3.",
          widget: { kind: "fraction-bar", parts: 1, shaded: 0, target: { parts: 4, shaded: 3 } },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Dos cuartos",
          prompt: "Muestra 2/4. Fíjate bien: ¿es la misma cantidad que 1/2?",
          widget: { kind: "fraction-bar", parts: 2, shaded: 1, target: { parts: 4, shaded: 2 } },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "Una pizza está cortada en 4 rebanadas iguales. Te comes 1 rebanada. ¿Qué fracción de la pizza te comiste?",
              choices: ["1/2", "1/4", "4/1", "1/3"],
              answer: 1,
              hint: "Cuenta todas las rebanadas iguales. Ese número va abajo.",
              explain: "Hay 4 rebanadas iguales y te comiste 1, así que te comiste 1/4.",
            },
            {
              id: "q2",
              prompt: "Del mismo sándwich, ¿qué es más: 1/2 o 1/4?",
              choices: ["1/2", "1/4", "Son iguales"],
              answer: 0,
              hint: "Imagina que cortas el sándwich en más pedazos. ¿Qué pasa con el tamaño de cada pedazo?",
              explain: "Al cortarlo en 4, los pedazos son más pequeños que al cortarlo en 2, así que 1/2 es más.",
            },
            {
              id: "q3",
              prompt: "Una barra está cortada en 4 pedazos, pero los pedazos son de distintos tamaños. ¿Un pedazo es 1/4 de la barra?",
              choices: ["Sí", "No"],
              answer: 1,
              hint: "Las fracciones necesitan partes que sean todas del mismo tamaño.",
              explain: "1/4 quiere decir una de 4 partes iguales. Los pedazos de distintos tamaños no son cuartos.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Fracciones en casa",
          brief: "Busca algo que puedas repartir en partes iguales: un sándwich, una hoja de papel o una tortilla.",
          steps: [
            "Dóblalo o córtalo en 2 partes iguales. Di: cada parte es un medio.",
            "Dóblalo o córtalo otra vez para que queden 4 partes iguales. Di: cada parte es un cuarto.",
            "Junta 3 partes para mostrar 3/4.",
            "Muéstrale a alguien por qué 2/4 es la misma cantidad que 1/2.",
          ],
        },
      ],
    },
    {
      id: "thirds-sixths-eighths",
      title: "Tercios, sextos y octavos",
      summary: "Más maneras de cortar el mismo entero, y por qué más partes quiere decir partes más pequeñas.",
      minutes: 12,
      scenes: [],
    },
    {
      id: "number-line",
      title: "Fracciones en la recta numérica",
      summary: "Una fracción también es un número. Encuéntrala entre 0 y 1.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "De una barra a una recta",
          blocks: [
            { type: "visual", visual: { kind: "fraction", parts: 4, shaded: 3 }, alt: "Una barra cortada en 4 partes iguales con 3 sombreadas." },
            { type: "text", text: "Estira la barra hasta que sea una recta que empieza en 0 y termina en 1." },
            {
              type: "visual",
              visual: { kind: "number-line", min: 0, max: 1, marks: [0, 0.25, 0.5, 0.75, 1], denominator: 4 },
              alt: "Una recta numérica de 0 a 1 dividida en 4 saltos iguales, marcada con 0, 1/4, 2/4, 3/4 y 1.",
            },
            { type: "text", text: "Cada salto igual es 1/4. Con tres saltos desde 0 llegas a 3/4." },
          ],
        },
        {
          id: "s2",
          kind: "interactive",
          title: "Llega a tres cuartos",
          prompt: "Mueve el marcador a 3/4.",
          widget: { kind: "number-line", min: 0, max: 1, step: 0.25, start: 0, target: 0.75, denominator: 4 },
        },
        {
          id: "s3",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "Una recta de 0 a 1 está dividida en 4 saltos iguales. ¿Dónde está 1/4?",
              choices: ["Después de 1 salto", "Después de 4 saltos", "Justo en el medio"],
              answer: 0,
              hint: "El número de arriba cuenta los saltos desde 0.",
              explain: "1/4 está a un salto igual desde 0.",
            },
            {
              id: "q2",
              prompt: "¿Qué fracción está justo a la mitad entre 0 y 1?",
              choices: ["1/4", "2/4", "3/4"],
              answer: 1,
              hint: "A la mitad quiere decir la mitad de los saltos.",
              explain: "2/4 son dos de cuatro saltos iguales: justo en el medio. Es el mismo punto que 1/2.",
            },
          ],
        },
      ],
    },
    {
      id: "comparing",
      title: "Comparar fracciones",
      summary: "Usa dibujos y la recta numérica para saber qué fracción es mayor.",
      minutes: 12,
      scenes: [],
    },
  ],
};

export default fraccionesEs;
