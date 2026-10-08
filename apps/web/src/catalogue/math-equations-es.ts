import type { CatalogueEntry } from "./types";

const ecuacionesEs: CatalogueEntry = {
  id: "math-equations-es",
  title: "Resolver ecuaciones",
  summary:
    "Deshaz operaciones para resolver ecuaciones de un paso y ecuaciones de dos pasos, simplifica con términos semejantes y la propiedad distributiva, y resuelve ecuaciones de varios pasos con la variable en ambos lados.",
  subject: "math",
  grade: "7",
  locale: "es",
  lessons: [
    {
      id: "one-step",
      title: "Ecuaciones de un paso",
      summary: "Una ecuación dice que dos lados valen lo mismo. Deshaz una operación en ambos lados para hallar la incógnita, y comprueba.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Qué dice una ecuación",
          blocks: [
            { type: "text", text: "Una bolsa tiene algunas canicas. Si metes 5 más, hay 12 en total. ¿Cuántas había en la bolsa?" },
            {
              type: "text",
              text: "Una ecuación dice que dos expresiones valen lo mismo. Si llamas x al número que no conoces, la bolsa dice x + 5 = 12: un número más 5 es igual a 12.",
            },
            {
              type: "visual",
              visual: { kind: "number-line", min: 0, max: 12, marks: [0, 7, 12], marker: 7 },
              alt: "Una recta numérica de 0 a 12 con marcas en 0, 7 y 12, y un punto en 7. Del 7 al 12 hay 5.",
            },
            { type: "text", text: "Resolver es encontrar el valor de x que hace verdadera la ecuación. Aquí x = 7, porque 7 + 5 = 12." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Deshaz la operación en ambos lados",
          blocks: [
            { type: "text", text: "Para despejar x, haz la operación contraria. Hazla en ambos lados, para que sigan valiendo lo mismo." },
            {
              type: "points",
              items: [
                "x + 5 = 12: resta 5 en ambos lados. x = 7.",
                "x − 4 = 9: suma 4 en ambos lados. x = 13.",
                "4x = 28 quiere decir 4 por x. Divide ambos lados entre 4: x = 7.",
                "x/3 = 6: multiplica ambos lados por 3. x = 18.",
              ],
            },
            { type: "text", text: "Para comprobar, pon tu respuesta en la ecuación: 4 × 7 = 28. Es verdad, así que x = 7 es correcto." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Resuelve x − 8 = 3",
          prompt: "Resuelve x − 8 = 3. Mueve el marcador al valor de x.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 11 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Una respuesta negativa",
          prompt: "Resuelve x + 9 = 4. Mueve el marcador al valor de x.",
          widget: { kind: "number-line", min: -10, max: 10, step: 1, start: 0, target: -5 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "Resuelve 5x = 35.",
              choices: ["30", "7", "40", "175"],
              answer: 1,
              hint: "x está multiplicada por 5. ¿Qué operación deshace una multiplicación?",
              explain: "Divide ambos lados entre 5: x = 35 ÷ 5 = 7. Comprueba: 5 × 7 = 35.",
            },
            {
              id: "q2",
              prompt: "Resuelve x/4 = 9.",
              choices: ["13", "2.25", "36", "5"],
              answer: 2,
              hint: "x está dividida entre 4. Para deshacerlo, multiplica ambos lados por 4.",
              explain: "x = 9 × 4 = 36. Comprueba: 36 ÷ 4 = 9.",
            },
            {
              id: "q3",
              prompt: "¿Qué paso resuelve x + 2.5 = 10?",
              choices: ["Sumar 2.5 en ambos lados", "Restar 2.5 en ambos lados", "Dividir ambos lados entre 2.5", "Restar 10 en ambos lados"],
              answer: 1,
              hint: "¿Qué se le hace a x? Haz lo contrario.",
              explain: "A x se le suma 2.5, así que resta 2.5 en ambos lados: x = 7.5. Comprueba: 7.5 + 2.5 = 10.",
            },
            {
              id: "q4",
              prompt: "Valeria tenía unas canicas. Regaló 12 y le quedaron 30. ¿Qué ecuación describe lo que pasó?",
              choices: ["c + 12 = 30", "12c = 30", "c − 12 = 30", "30 − c = 12"],
              answer: 2,
              hint: "Empieza con el número de canicas que no conoces, c. ¿Qué le pasó a ese número?",
              explain: "Valeria empezó con c canicas, regaló 12 y le quedaron 30: c − 12 = 30. Suma 12 en ambos lados: c = 42.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "La bolsa misteriosa",
          brief: "Inventa acertijos de ecuaciones con una bolsa y objetos pequeños, como monedas o frijoles.",
          steps: [
            "Pídele a alguien que meta algunos objetos en una bolsa sin decirte cuántos.",
            "Esa persona agrega 4 más mientras miras, cuenta todo y te dice el total.",
            "Escribe una ecuación, como b + 4 = 11, y resuélvela.",
            "Abre la bolsa y cuenta para comprobar.",
            "Cambien de papel. Llena 3 bolsas con la misma cantidad cada una, di el total y pide que resuelvan 3b = tu total.",
          ],
        },
      ],
    },
    {
      id: "two-step",
      title: "Ecuaciones de dos pasos",
      summary: "Cuando a x le pasan dos cosas, deshazlas en orden inverso: primero la suma o la resta, luego la multiplicación o la división.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "A x le pasaron dos cosas",
          blocks: [
            { type: "text", text: "Imagina 3 bolsas con el mismo número de canicas cada una, y 2 canicas sueltas. En total hay 14 canicas." },
            {
              type: "visual",
              visual: { kind: "dots", groups: [4, 4, 4, 2] },
              alt: "Tres grupos iguales de 4 fichas y un grupo de 2 fichas extra: 14 fichas en total.",
            },
            { type: "text", text: "Si en cada bolsa hay x canicas, 3x + 2 = 14. Primero x se multiplicó por 3 y luego se sumó 2." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Deshaz en orden inverso",
          blocks: [
            { type: "text", text: "Deshaz primero lo último que se hizo, como cuando te quitas los zapatos antes que los calcetines." },
            {
              type: "points",
              items: ["Resta 2 en ambos lados: 3x = 12.", "Divide ambos lados entre 3: x = 4.", "Comprueba: 3 × 4 + 2 = 14. Es verdad."],
            },
            {
              type: "visual",
              visual: { kind: "dots", groups: [4, 4, 4, 2], crossed: 2 },
              alt: "Las mismas fichas con las 2 fichas extra tachadas. Quedan 12, en 3 grupos iguales de 4.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Con negativos y fracciones",
          blocks: [
            {
              type: "points",
              items: [
                "−2x + 7 = 1: resta 7 en ambos lados y queda −2x = −6. Divide ambos lados entre −2: x = 3.",
                "x/5 − 3 = 2: suma 3 en ambos lados y queda x/5 = 5. Multiplica ambos lados por 5: x = 25.",
              ],
            },
            { type: "text", text: "Comprueba las dos: −2 × 3 + 7 = 1 y 25 ÷ 5 − 3 = 2. Las dos son verdaderas." },
            { type: "text", text: "Cuida los signos. Un negativo entre un negativo da positivo: −6 ÷ (−2) = 3." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Resuelve 2x + 5 = 17",
          prompt: "Resuelve 2x + 5 = 17. Mueve el marcador al valor de x.",
          widget: { kind: "number-line", min: -10, max: 10, step: 1, start: 0, target: 6 },
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Resuelve 4x − 3 = −15",
          prompt: "Resuelve 4x − 3 = −15. Mueve el marcador al valor de x.",
          widget: { kind: "number-line", min: -10, max: 10, step: 1, start: 0, target: -3 },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "Resuelve 5x − 4 = 21.",
              choices: ["3.4", "17", "5", "125"],
              answer: 2,
              hint: "Primero deshaz la resta: suma 4 en ambos lados. Luego deshaz la multiplicación.",
              explain: "Suma 4: 5x = 25. Divide entre 5: x = 5. Comprueba: 5 × 5 − 4 = 21. El 3.4 sale de restar 4 en vez de sumarlo.",
            },
            {
              id: "q2",
              prompt: "Resuelve x/3 + 6 = 10.",
              choices: ["12", "48", "4/3", "2"],
              answer: 0,
              hint: "Primero resta 6. Luego deshaz la división entre 3.",
              explain: "Resta 6: x/3 = 4. Multiplica por 3: x = 12. Comprueba: 12 ÷ 3 + 6 = 10.",
            },
            {
              id: "q3",
              prompt: "Un plan de teléfono cuesta $20 de inscripción más $15 al mes. ¿Después de cuántos meses habrás pagado $95 en total?",
              choices: ["4", "6", "75", "5"],
              answer: 3,
              hint: "¿Qué se paga una sola vez y qué se paga cada mes?",
              explain: "Resta 20: 15m = 75. Divide entre 15: m = 5 meses. Comprueba: 15 × 5 + 20 = 95.",
            },
            {
              id: "q4",
              prompt: "Tomás resolvió −3x + 4 = 19 y le dio x = 5. ¿Tiene razón?",
              choices: ["Sí", "No, x = −5", "No, x = 15"],
              answer: 1,
              hint: "Pon 5 en lugar de x. ¿La ecuación es verdadera?",
              explain: "−3 × 5 + 4 = −11, no 19. Resta 4 y queda −3x = 15; divide entre −3: x = −5. Comprueba: −3 × (−5) + 4 = 19.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Piensa un número",
          brief: "Inventa acertijos de dos pasos para alguien de tu casa y resuelve los suyos.",
          steps: [
            "Piensa un número entero y no se lo digas a nadie.",
            "Multiplícalo por un número que elijas y luego suma o resta otro número. Calcula el resultado.",
            "Dile a alguien los pasos y el resultado, por ejemplo: “Lo multipliqué por 4, le sumé 3 y me dio 31.”",
            "Esa persona escribe una ecuación, como 4n + 3 = 31, y la resuelve para hallar tu número.",
            "Cambien de papel. Comprueben cada respuesta poniéndola en los pasos.",
          ],
        },
      ],
    },
    {
      id: "simplify-first",
      title: "Paréntesis y términos semejantes",
      summary: "Junta términos semejantes y usa la propiedad distributiva para que la ecuación se resuelva en dos pasos.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Junta los términos semejantes",
          blocks: [
            {
              type: "text",
              text: "Imagina 3 bolsas de canicas y luego 2 bolsas más, todas con el mismo número de canicas, x. En total son 5 bolsas: 3x + 2x = 5x. Pero 3 bolsas y 3 canicas sueltas no se pueden contar como una sola cosa, así que 3x + 3 se queda como está.",
            },
            { type: "text", text: "Los términos semejantes tienen la misma parte variable. 3x y 2x son semejantes. 3x y 3 no lo son." },
            {
              type: "points",
              items: ["3x + 2x − 4 = 21 se convierte en 5x − 4 = 21.", "Suma 4 en ambos lados: 5x = 25.", "Divide ambos lados entre 5: x = 5."],
            },
            { type: "text", text: "Comprueba en la ecuación original: 3 × 5 + 2 × 5 − 4 = 15 + 10 − 4 = 21. Es verdad." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Paréntesis",
          blocks: [
            { type: "text", text: "2(x + 3) = 16 quiere decir que 2 grupos de x + 3 suman 16." },
            {
              type: "visual",
              visual: { kind: "dots", groups: [8, 8] },
              alt: "Dos grupos iguales de 8 fichas: 16 en total. Cada grupo es x + 3, así que x + 3 = 8.",
            },
            {
              type: "points",
              items: [
                "Primera forma, dividir primero: 2(x + 3) = 16, así que x + 3 = 8 y x = 5.",
                "Segunda forma, distribuir primero: 2x + 6 = 16, así que 2x = 10 y x = 5.",
                "Las dos formas dan lo mismo. Elige la que tenga números más fáciles.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Resuelve 3(x − 2) = 12",
          prompt: "Resuelve 3(x − 2) = 12. Mueve el marcador al valor de x.",
          widget: { kind: "number-line", min: -10, max: 10, step: 1, start: 0, target: 6 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Clasifica por solución",
          prompt: "Resuelve cada ecuación y clasifícala según su solución.",
          widget: {
            kind: "sorter",
            categories: ["x = 2", "x = 3", "x = 4"],
            items: [
              { id: "a", text: "2x + 4 = 10", answer: 1 },
              { id: "b", text: "5(x − 1) = 15", answer: 2 },
              { id: "c", text: "3x + x = 8", answer: 0 },
              { id: "d", text: "7x − 2x + 1 = 16", answer: 1 },
              { id: "e", text: "2(x + 6) = 20", answer: 2 },
              { id: "f", text: "6x − 9 = 3", answer: 0 },
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
              prompt: "Simplifica 4x + 7 − x + 2.",
              choices: ["5x + 9", "3x + 9", "3x + 5", "12x"],
              answer: 1,
              hint: "Agrupa por un lado los términos con x y por otro los números solos.",
              explain: "4x − x = 3x y 7 + 2 = 9, así que la expresión queda 3x + 9.",
            },
            {
              id: "q2",
              prompt: "Resuelve 4(x + 1) = 28.",
              choices: ["7", "24", "6", "8"],
              answer: 2,
              hint: "Primero divide ambos lados entre 4, o distribuye el 4.",
              explain: "Divide entre 4: x + 1 = 7, así que x = 6. Comprueba: 4 × (6 + 1) = 28.",
            },
            {
              id: "q3",
              prompt: "Kai escribió 2(x + 5) = 2x + 5. ¿En qué se equivocó?",
              choices: ["En nada. Está bien.", "El 2 multiplica a x y también a 5: 2x + 10.", "El 2 se suma: x + 7."],
              answer: 1,
              hint: "Distribuir quiere decir multiplicar cada término dentro del paréntesis.",
              explain: "2(x + 5) = 2 × x + 2 × 5 = 2x + 10.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Ecuaciones con un recibo",
          brief: "Convierte un recibo de compra o un menú en una ecuación.",
          steps: [
            "Busca un recibo de compra o un menú.",
            "Elige un producto que se compró varias veces, o uno del que comprarías varios, y otro producto más.",
            "Escribe una ecuación con la cantidad del primer producto como incógnita: precio × n + otro producto = total.",
            "Resuélvela y compara tu respuesta con el recibo o el menú.",
            "Pídele a alguien que te escriba una ecuación como 3(x + 2) = 21. Resuélvela de las dos formas: dividiendo primero y distribuyendo primero.",
          ],
        },
      ],
    },
    {
      id: "both-sides",
      title: "La variable en ambos lados",
      summary:
        "Un paso hacia 8.º grado, con ecuaciones de varios pasos: junta los términos con x en un lado, resuelve y reconoce cuándo no hay solución o sirve cualquier número.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "¿Cuándo tendrán lo mismo?",
          blocks: [
            {
              type: "text",
              text: "Diego tiene $40 y ahorra $5 por semana. Sofía tiene $10 y ahorra $8 por semana. ¿Después de cuántas semanas, s, tendrán la misma cantidad?",
            },
            { type: "text", text: "Diego empieza con $30 de ventaja, pero Sofía ahorra $3 más cada semana, así que la ventaja de Diego baja $3 por semana." },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 30], [2, 24], [4, 18], [6, 12], [8, 6], [10, 0]], xLabel: "Semanas", yLabel: "Ventaja de Diego ($)" },
              alt: "La ventaja de Diego sobre Sofía: $30 al principio, que baja $3 cada semana, hasta llegar a $0 en la semana 10.",
            },
            {
              type: "points",
              items: [
                "Escríbelo: 40 + 5s = 10 + 8s. La incógnita está en los dos lados.",
                "Resta 5s en ambos lados: 40 = 10 + 3s.",
                "Resta 10: 30 = 3s. Son los $30 de ventaja y los $3 por semana de la gráfica.",
                "Divide entre 3: s = 10. Comprueba: después de 10 semanas, Diego tiene 40 + 50 = $90 y Sofía tiene 10 + 80 = $90.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "x en los dos lados",
          blocks: [
            { type: "text", text: "En 5x + 3 = 2x + 15, x aparece en los dos lados. Igual que con los ahorros, primero junta los términos con x en un solo lado." },
            {
              type: "points",
              items: ["Resta 2x en ambos lados: 3x + 3 = 15.", "Resta 3 en ambos lados: 3x = 12.", "Divide ambos lados entre 3: x = 4."],
            },
            { type: "text", text: "Comprueba: 5 × 4 + 3 = 23 y 2 × 4 + 15 = 23. Los dos lados coinciden." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Sin solución, o cualquier número",
          blocks: [
            {
              type: "points",
              items: [
                "x + 3 = x + 5: resta x en ambos lados y queda 3 = 5, que es falso. Ningún número sirve, así que no hay solución.",
                "2(x + 1) = 2x + 2: distribuye y queda 2x + 2 = 2x + 2. Los dos lados siempre son iguales, así que cualquier número es solución.",
              ],
            },
            {
              type: "text",
              text: "Si los términos con x se cancelan, mira lo que queda. Algo falso quiere decir que no hay solución. Algo verdadero quiere decir que sirve cualquier número.",
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Resuelve 7x − 4 = 3x + 8",
          prompt: "Resuelve 7x − 4 = 3x + 8. Mueve el marcador al valor de x.",
          widget: { kind: "number-line", min: -10, max: 10, step: 1, start: 0, target: 3 },
        },
        {
          id: "s5",
          kind: "interactive",
          title: "¿Cuántas soluciones?",
          prompt: "Clasifica cada ecuación según cuántas soluciones tiene.",
          widget: {
            kind: "sorter",
            categories: ["Una solución", "Ninguna solución", "Cualquier número"],
            items: [
              { id: "a", text: "3x + 1 = x + 7", answer: 0 },
              { id: "b", text: "x + 4 = x + 9", answer: 1 },
              { id: "c", text: "3(x + 2) = 3x + 6", answer: 2 },
              { id: "d", text: "2x − 5 = 2x + 1", answer: 1 },
              { id: "e", text: "4x = 2x + 10", answer: 0 },
              { id: "f", text: "5x + 10 = 5(x + 2)", answer: 2 },
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
              prompt: "Resuelve 6x + 2 = 4x + 10.",
              choices: ["6", "−4", "8", "4"],
              answer: 3,
              hint: "Primero resta 4x en ambos lados.",
              explain: "6x − 4x = 2x, así que 2x + 2 = 10. Luego 2x = 8 y x = 4. Comprueba: 6 × 4 + 2 = 26 y 4 × 4 + 10 = 26.",
            },
            {
              id: "q2",
              prompt: "Resuelve 9 − x = 2x + 3.",
              choices: ["2", "4", "−2", "6"],
              answer: 0,
              hint: "Suma x en ambos lados, para que todos los términos con x queden en un lado.",
              explain: "Suma x: 9 = 3x + 3. Resta 3: 6 = 3x. Divide entre 3: x = 2. Comprueba: 9 − 2 = 7 y 2 × 2 + 3 = 7.",
            },
            {
              id: "q3",
              prompt: "¿Cuántas soluciones tiene 4(x − 1) = 4x − 4?",
              choices: ["Ninguna", "Exactamente una", "Cualquier número es solución"],
              answer: 2,
              hint: "Distribuye el 4 del lado izquierdo. Luego compara los dos lados.",
              explain: "4(x − 1) = 4x − 4, que es justo el lado derecho. Cualquier valor de x hace verdadera la ecuación.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "¿Ventaja inicial o más rapidez?",
          brief: "Compara dos planes con una ecuación y comprueba con una tabla.",
          steps: [
            "Inventa dos planes de ahorro, o busca dos planes de teléfono en anuncios: uno que empieza más alto y otro que crece más rápido.",
            "Escribe una expresión para cada uno después de s semanas o meses.",
            "Iguala las expresiones y resuelve para saber cuándo coinciden.",
            "Haz una tabla de 0 a 12 para comprobar tu respuesta.",
            "Explícale a alguien qué plan conviene por poco tiempo y cuál por mucho tiempo.",
          ],
        },
      ],
    },
  ],
};

export { practice } from "./math-equations";

export default ecuacionesEs;
