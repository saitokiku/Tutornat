import type { CatalogueEntry } from "./types";

const pitagorasEs: CatalogueEntry = {
  id: "math-pythagorean-es",
  title: "El teorema de Pitágoras",
  summary:
    "Calcula la raíz cuadrada de un número, usa el teorema de Pitágoras para hallar lados de triángulos rectángulos, comprueba si un ángulo es recto y mide distancias en una cuadrícula.",
  subject: "math",
  grade: "8",
  locale: "es",
  lessons: [
    {
      id: "square-roots",
      title: "Cuadrados y raíces cuadradas",
      summary: "Eleva un número al cuadrado, deshazlo con una raíz cuadrada y estima las raíces que no son números enteros.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Elevar al cuadrado",
          blocks: [
            { type: "text", text: "Elevar un número al cuadrado es multiplicarlo por sí mismo: 5² = 5 × 5 = 25." },
            { type: "visual", visual: { kind: "array", rows: 5, cols: 5 }, alt: "25 fichas acomodadas en un cuadrado: 5 filas de 5." },
            { type: "text", text: "El nombre viene de la figura. Un cuadrado de 5 cm de lado tiene un área de 5 × 5 = 25 cm²." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Raíces cuadradas",
          blocks: [
            { type: "text", text: "La raíz cuadrada deshace el cuadrado. √25 = 5, porque 5² = 25." },
            {
              type: "points",
              items: [
                "El símbolo √ se lee “raíz cuadrada de”.",
                "Los cuadrados perfectos son los cuadrados de los números naturales: 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, etcétera.",
                "Un cuadrado con un área de 49 cm² tiene lados de √49 = 7 cm.",
                "Todo número positivo tiene dos raíces cuadradas, como 5 y −5, porque (−5)² también es 25. El símbolo √ indica la positiva.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Entre dos números enteros",
          blocks: [
            { type: "text", text: "√50 no es un número entero. 50 está entre los cuadrados perfectos 49 y 64, así que √50 está entre 7 y 8." },
            {
              type: "visual",
              visual: { kind: "number-line", min: 7, max: 8, marks: [7, 7.5, 8], marker: 7.07 },
              alt: "Una recta numérica de 7 a 8 con una marca en 7.5. Hay un punto justo a la derecha del 7, en 7.07 aproximadamente.",
            },
            { type: "text", text: "50 está mucho más cerca de 49 que de 64, así que √50 es apenas mayor que 7. Con calculadora da unos 7.07." },
            {
              type: "points",
              items: [
                "√50 es irracional: sus decimales no terminan y no se repiten.",
                "La raíz cuadrada de un número natural que no es cuadrado perfecto siempre es irracional.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Un huerto cuadrado",
          prompt: "Un huerto cuadrado tiene un área de 144 m². ¿Cuánto mide cada lado, en metros? Mueve el marcador a tu respuesta.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 12 },
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Estima √30",
          prompt: "Estima √30 a la décima más cercana. Eleva 5.4 y 5.5 al cuadrado para decidir. Mueve el marcador a tu estimación.",
          widget: { kind: "number-line", min: 5, max: 6, step: 0.1, start: 5, target: 5.5 },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "¿Cuánto es √64?",
              choices: ["32", "8", "16", "4096"],
              answer: 1,
              hint: "¿Qué número multiplicado por sí mismo da 64?",
              explain: "8 × 8 = 64, así que √64 = 8. 32 es 64 ÷ 2, que es otra operación.",
            },
            {
              id: "q2",
              prompt: "¿Entre qué dos números enteros está √70?",
              choices: ["6 y 7", "7 y 8", "8 y 9", "35 y 36"],
              answer: 2,
              hint: "Busca los cuadrados perfectos que quedan justo antes y justo después de 70.",
              explain: "64 < 70 < 81. √64 = 8 y √81 = 9, así que √70 está entre 8 y 9. Es 8.37, aproximadamente.",
            },
            {
              id: "q3",
              prompt: "Un azulejo cuadrado tiene un área de 36 cm². ¿Cuál es su perímetro?",
              choices: ["6 cm", "9 cm", "24 cm", "144 cm"],
              answer: 2,
              hint: "Primero halla cuánto mide el lado, con una raíz cuadrada.",
              explain: "√36 = 6, así que cada lado mide 6 cm y el perímetro es 4 × 6 = 24 cm.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Arma los cuadrados",
          brief: "Arma cuadrados perfectos con objetos cuadrados pequeños.",
          steps: [
            "Junta objetos cuadrados pequeños: notas adhesivas, galletas, azulejos o cuadritos de papel.",
            "Arma cuadrados de 1 por 1, 2 por 2, 3 por 3 y 4 por 4. Cuenta las piezas de cada uno.",
            "Haz una lista con lo que contaste. Esos son los primeros cuadrados perfectos.",
            "Intenta armar un cuadrado con exactamente 20 piezas. ¿Qué pasa?",
            "Con lo que descubriste, explícale a alguien por qué √20 está entre 4 y 5.",
          ],
        },
      ],
    },
    {
      id: "theorem",
      title: "El teorema: a² + b² = c²",
      summary: "En todo triángulo rectángulo, los catetos y la hipotenusa cumplen a² + b² = c². Mira por qué es cierto y úsalo.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Las partes de un triángulo rectángulo",
          blocks: [
            { type: "text", text: "Un triángulo rectángulo tiene un ángulo recto, una esquina como la de una hoja de papel." },
            {
              type: "visual",
              visual: { kind: "right-triangle", a: 3, b: 4, c: 5, unit: "cm" },
              alt: "Un triángulo rectángulo con el ángulo recto abajo a la izquierda. El cateto vertical mide 3 cm, el cateto de abajo mide 4 cm y el lado inclinado, opuesto al ángulo recto, que es la hipotenusa, mide 5 cm.",
            },
            {
              type: "points",
              items: [
                "Los dos lados que forman el ángulo recto son los catetos.",
                "El lado opuesto al ángulo recto es la hipotenusa. Siempre es el lado más largo.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "El teorema",
          blocks: [
            { type: "text", text: "En todo triángulo rectángulo, el cuadrado de la hipotenusa es igual a la suma de los cuadrados de los catetos." },
            { type: "text", text: "a² + b² = c², donde a y b son los catetos y c es la hipotenusa." },
            {
              type: "points",
              items: [
                "En el triángulo de 3, 4 y 5: 3² + 4² = 9 + 16 = 25, y 5² = 25.",
                "Solo funciona en triángulos rectángulos.",
                "Lleva el nombre de Pitágoras, un pensador griego que vivió hace unos dos mil quinientos años. Los matemáticos de Babilonia ya usaban la idea más de mil años antes.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Por qué es cierto",
          blocks: [
            {
              type: "text",
              text: "Una forma de verlo: dibuja un cuadrado grande con lados de a + b y acomoda adentro cuatro copias del triángulo rectángulo.",
            },
            {
              type: "points",
              items: [
                "Primera forma: pon un triángulo en cada esquina. En el centro queda un cuadrado inclinado de lado c. Su área es c².",
                "Segunda forma: junta los mismos cuatro triángulos de dos en dos, formando dos rectángulos en esquinas opuestas. Quedan libres dos cuadrados, uno de área a² y otro de área b².",
                "El cuadrado grande y los cuatro triángulos son los mismos las dos veces, así que el espacio libre tiene que ser igual: c² = a² + b².",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Halla la hipotenusa",
          prompt: "Un triángulo rectángulo tiene catetos de 6 cm y 8 cm. ¿Cuánto mide la hipotenusa, en centímetros? Mueve el marcador a tu respuesta.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 10 },
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Otra más",
          prompt: "Un triángulo rectángulo tiene catetos de 5 m y 12 m. ¿Cuánto mide la hipotenusa, en metros? Mueve el marcador a tu respuesta.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 13 },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "Un triángulo rectángulo tiene catetos de 9 y 12. ¿Cuánto mide la hipotenusa?",
              choices: ["21", "15", "225", "10.5"],
              answer: 1,
              hint: "Eleva cada cateto al cuadrado, suma y saca la raíz cuadrada.",
              explain: "9² + 12² = 81 + 144 = 225, y √225 = 15.",
            },
            {
              id: "q2",
              prompt: "En un triángulo rectángulo, ¿qué lado es siempre el más largo?",
              choices: ["Cualquiera de los catetos", "El cateto más corto", "La hipotenusa", "Depende del triángulo"],
              answer: 2,
              hint: "¿Qué lado queda frente al ángulo más grande?",
              explain: "El ángulo recto es el ángulo más grande de un triángulo rectángulo, y el lado más largo queda frente a él. Ese lado es la hipotenusa.",
            },
            {
              id: "q3",
              prompt: "Paula dice que un triángulo rectángulo con catetos de 3 y 4 tiene una hipotenusa de 7, porque 3 + 4 = 7. ¿Qué está mal?",
              choices: ["Nada. Tiene razón.", "Se suman los cuadrados, no los lados: 9 + 16 = 25, así que mide 5.", "Se multiplican los catetos: 3 × 4 = 12."],
              answer: 1,
              hint: "El teorema usa a², b² y c².",
              explain: "a² + b² = c² da 9 + 16 = 25, así que c = √25 = 5. Los dos catetos juntos siempre miden más que la hipotenusa, así que sumarlos da de más.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "La demostración con recortes",
          brief: "Arma con triángulos de papel la demostración de esta lección.",
          steps: [
            "En cartulina o papel grueso, dibuja un triángulo rectángulo con catetos de 6 cm y 8 cm. Recórtalo y cálcalo para tener cuatro copias.",
            "Dibuja dos cuadrados con lados de 6 + 8 = 14 cm.",
            "En el primer cuadrado, pon un triángulo en cada esquina para que las hipotenusas formen un cuadrado inclinado en el centro.",
            "En el segundo cuadrado, junta los triángulos de dos en dos para formar dos rectángulos en esquinas opuestas. Quedan libres dos cuadrados.",
            "Calcula el área libre de cada cuadrado. Explícale a alguien por qué tienen que ser iguales y qué demuestra eso.",
          ],
        },
      ],
    },
    {
      id: "converse",
      title: "¿Es un triángulo rectángulo?",
      summary: "Usa el teorema al revés para saber si tres lados forman un ángulo recto, como hacen los albañiles con las esquinas.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Comprueba con el teorema",
          blocks: [
            {
              type: "text",
              text: "El teorema también funciona al revés. Si los dos lados más cortos, a y b, y el más largo, c, cumplen a² + b² = c², el triángulo tiene un ángulo recto.",
            },
            {
              type: "visual",
              visual: { kind: "right-triangle", a: 8, b: 15, c: 17, unit: "m" },
              alt: "Un triángulo rectángulo con catetos de 8 m y 15 m y una hipotenusa de 17 m.",
            },
            {
              type: "points",
              items: [
                "Lados de 8, 15 y 17: 64 + 225 = 289, y 17² = 289. Es un triángulo rectángulo.",
                "Lados de 5, 6 y 8: 25 + 36 = 61, pero 8² = 64. No es un triángulo rectángulo. Como 61 es menor que 64, el ángulo opuesto al 8 es más abierto que un ángulo recto.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "En las obras se usa",
          blocks: [
            {
              type: "text",
              text: "En la construcción se revisan las esquinas con los números 3, 4 y 5. Se marcan 3 unidades en una pared y 4 en la otra. Si entre las marcas hay 5 unidades, la esquina está a escuadra.",
            },
            {
              type: "points",
              items: [
                "También sirven los múltiplos: 6, 8 y 10, o 60, 80 y 100 cm.",
                "Los grupos de números naturales que cumplen a² + b² = c², como 3, 4, 5 y 5, 12, 13, se llaman ternas pitagóricas.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "¿Rectángulo o no?",
          prompt: "Cada grupo da las medidas de tres lados. Elévalas al cuadrado y clasifica.",
          widget: {
            kind: "sorter",
            categories: ["Triángulo rectángulo", "No es rectángulo"],
            items: [
              { id: "345", text: "3, 4, 5", answer: 0 },
              { id: "456", text: "4, 5, 6", answer: 1 },
              { id: "51213", text: "5, 12, 13", answer: 0 },
              { id: "789", text: "7, 8, 9", answer: 1 },
              { id: "6810", text: "6, 8, 10", answer: 0 },
              { id: "234", text: "2, 3, 4", answer: 1 },
              { id: "94041", text: "9, 40, 41", answer: 0 },
              { id: "102426", text: "10, 24, 26", answer: 0 },
            ],
          },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Revisa la esquina",
          prompt:
            "Una albañil marca 90 cm en una pared y 120 cm en la otra. Si la esquina está a escuadra, ¿a qué distancia deben quedar las marcas, en centímetros? Mueve el marcador a tu respuesta.",
          widget: { kind: "number-line", min: 0, max: 200, step: 10, start: 0, target: 150 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "¿Unos lados de 7, 24 y 25 forman un triángulo rectángulo?",
              choices: ["Sí", "No"],
              answer: 0,
              hint: "Revisa si 7² + 24² es igual a 25².",
              explain: "7² + 24² = 49 + 576 = 625, y 25² = 625. Coinciden, así que es un triángulo rectángulo.",
            },
            {
              id: "q2",
              prompt: "¿Unos lados de 6, 7 y 9 forman un triángulo rectángulo?",
              choices: ["Sí", "No"],
              answer: 1,
              hint: "Eleva al cuadrado los dos lados más cortos y súmalos. Compara con el cuadrado del lado más largo.",
              explain: "6² + 7² = 36 + 49 = 85, pero 9² = 81. No coinciden, así que no hay ángulo recto.",
            },
            {
              id: "q3",
              prompt: "Cuando revisas tres lados, ¿cuál debe ser c?",
              choices: ["El lado más corto", "Cualquier lado", "El lado más largo"],
              answer: 2,
              hint: "En un triángulo rectángulo, ¿qué lado es c?",
              explain: "c es la hipotenusa, que siempre es el lado más largo. Si usas un lado más corto como c, la prueba sale mal.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Esquinas a escuadra en casa",
          brief: "Revisa esquinas de verdad con una cinta métrica y un triángulo de 30, 40 y 50 cm.",
          steps: [
            "Elige una esquina donde se junten dos bordes rectos: una mesa, un librero, el marco de una puerta o un tapete.",
            "Mide 30 cm por un borde y 40 cm por el otro. Marca los dos puntos con un pedacito de cinta adhesiva.",
            "Mide en línea recta entre las marcas. Si da 50 cm, la esquina está a escuadra.",
            "Revisa dos o tres esquinas. ¿Alguna está un poco chueca?",
            "Explícale a alguien por qué funciona: 30² + 40² = 900 + 1600 = 2500 = 50².",
          ],
        },
      ],
    },
    {
      id: "distances",
      title: "Catetos que faltan y distancias",
      summary: "Resta para hallar un cateto que falta, y usa un triángulo rectángulo para medir la distancia entre dos puntos de una cuadrícula.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Hallar un cateto",
          blocks: [
            { type: "text", text: "Si conoces la hipotenusa y un cateto, resta: cateto que falta² = hipotenusa² − cateto conocido²." },
            {
              type: "visual",
              visual: { kind: "right-triangle", a: null, b: 1.5, c: 2.5, unit: "m" },
              alt: "Una escalera apoyada en una pared forma un triángulo rectángulo. La escalera, que es la hipotenusa, mide 2.5 m. Su base está a 1.5 m de la pared, sobre el cateto de abajo. La altura en la pared, el cateto vertical, es desconocida.",
            },
            { type: "text", text: "Una escalera de 2.5 m está apoyada en una pared, con la base a 1.5 m de la pared. ¿A qué altura de la pared llega?" },
            { type: "points", items: ["La escalera es la hipotenusa.", "altura² = 2.5² − 1.5² = 6.25 − 2.25 = 4", "altura = √4 = 2 m"] },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Distancia en una cuadrícula",
          blocks: [
            {
              type: "text",
              text: "Para hallar la distancia entre dos puntos de una cuadrícula, dibuja un triángulo rectángulo cuya hipotenusa sea esa distancia.",
            },
            { type: "visual", visual: { kind: "coord", points: [[1, 1], [4, 5]] }, alt: "Un plano cartesiano con puntos en (1, 1) y (4, 5)." },
            {
              type: "points",
              items: ["En horizontal: 4 − 1 = 3 unidades.", "En vertical: 5 − 1 = 4 unidades.", "Distancia = √(3² + 4²) = √25 = 5 unidades."],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "El cable del poste",
          prompt:
            "Un cable de 13 m va de lo alto de un poste hasta el suelo, a 5 m de la base del poste. ¿Cuánto mide el poste, en metros? Mueve el marcador a tu respuesta.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 12 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Distancia entre puntos",
          prompt: "¿A qué distancia están los puntos (−2, 1) y (4, 9)? Mueve el marcador a tu respuesta.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 10 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "Un triángulo rectángulo tiene una hipotenusa de 25 cm y un cateto de 7 cm. ¿Cuánto mide el otro cateto?",
              choices: ["18 cm", "26 cm", "24 cm", "32 cm"],
              answer: 2,
              hint: "El lado que falta es un cateto, así que resta: 25² − 7².",
              explain: "25² − 7² = 625 − 49 = 576, y √576 = 24 cm.",
            },
            {
              id: "q2",
              prompt: "Un terreno rectangular mide 30 m de largo y 40 m de ancho. ¿Cuánto mide el camino recto de una esquina a la esquina opuesta?",
              choices: ["50 m", "70 m", "35 m", "1200 m"],
              answer: 0,
              hint: "La diagonal parte el terreno en dos triángulos rectángulos. La diagonal es la hipotenusa.",
              explain: "30² + 40² = 900 + 1600 = 2500, y √2500 = 50 m. Son 20 m menos que caminar por dos lados.",
            },
            {
              id: "q3",
              prompt: "¿Cuál es la distancia entre (0, 0) y (5, 12)?",
              choices: ["17", "7", "169", "13"],
              answer: 3,
              hint: "Avanza 5 en horizontal y 12 en vertical. Usa esas medidas como catetos.",
              explain: "5² + 12² = 25 + 144 = 169, y √169 = 13.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "El atajo",
          brief: "Predice una diagonal con el teorema y luego mídela.",
          steps: [
            "Busca algo rectangular en casa: una mesa, un tapete, una puerta o una hoja de papel.",
            "Mide el largo y el ancho.",
            "Usa el teorema para predecir la diagonal de esquina a esquina. Redondea a la unidad más cercana.",
            "Mide la diagonal y compárala con tu predicción.",
            "Calcula cuánto más corta es la diagonal que ir por dos lados, y explica por qué cruzar un parque en diagonal ahorra camino.",
          ],
        },
      ],
    },
  ],
};

export default pitagorasEs;
