import type { CatalogueEntry } from "./types";

const razonesEs: CatalogueEntry = {
  id: "math-ratios-es",
  title: "Razones y tasas",
  summary: "Compara dos cantidades con razones, arma tablas de razones equivalentes y usa la tasa unitaria y el precio unitario para resolver problemas.",
  subject: "math",
  grade: "6",
  locale: "es",
  lessons: [
    {
      id: "what-ratio",
      title: "Qué compara una razón",
      summary: "Escribe una razón en el orden correcto, dibújala como diagrama de cinta y distingue las razones de parte a parte de las de parte a todo.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Dos cantidades, una comparación",
          blocks: [
            { type: "text", text: "Una razón compara dos cantidades. Para preparar un agua fresca se mezclan 3 tazas de jugo de sandía por cada 2 tazas de agua." },
            {
              type: "visual",
              visual: { kind: "fraction", parts: 5, shaded: 3 },
              alt: "Una cinta dividida en 5 casillas iguales. 3 casillas están sombreadas para las tazas de jugo y 2 están vacías para las tazas de agua.",
            },
            { type: "text", text: "Este dibujo es un diagrama de cinta: una casilla por cada taza. La razón de jugo a agua es 3 a 2." },
            {
              type: "points",
              items: [
                "Se escribe 3 a 2 o 3 : 2.",
                "El orden importa. La razón de agua a jugo es 2 : 3, que es otra razón.",
                "Dila con una oración: por cada 3 tazas de jugo hay 2 tazas de agua.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Parte a parte y parte a todo",
          blocks: [
            { type: "text", text: "En un frutero hay 4 manzanas verdes y 6 rojas: 10 manzanas en total." },
            {
              type: "visual",
              visual: { kind: "dots", groups: [4, 6] },
              alt: "Dos grupos de fichas, uno junto al otro: 4 fichas para las manzanas verdes y 6 fichas para las rojas.",
            },
            {
              type: "points",
              items: [
                "Parte a parte: la razón de verdes a rojas es 4 : 6.",
                "Parte a todo: la razón de verdes al total es 4 : 10.",
                "Una razón de parte a todo es lo mismo que una fracción del total: 4/10 de las manzanas son verdes.",
              ],
            },
            { type: "text", text: "Antes de escribir una razón, fíjate qué compara. 4 : 6 y 4 : 10 hablan del mismo frutero, pero dicen cosas distintas." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Arma la cinta de la pintura",
          prompt:
            "Un color de pintura lleva 2 botes de azul por cada 3 botes de blanco. Arma la cinta de una mezcla, con una parte igual por cada bote, y sombrea los botes de azul. Abajo verás qué fracción de la pintura es azul.",
          widget: { kind: "fraction-bar", parts: 1, shaded: 0, target: { parts: 5, shaded: 2 } },
        },
        {
          id: "s4",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "Una receta lleva 4 huevos por cada 3 tazas de harina. ¿Cuál es la razón de harina a huevos?",
              choices: ["4 : 3", "3 : 4", "3 : 7", "7 : 4"],
              answer: 1,
              hint: "Lo que se nombra primero va primero. ¿Qué se nombra primero en la pregunta?",
              explain: "La pregunta nombra primero la harina, así que su cantidad va primero: 3 tazas de harina a 4 huevos, o 3 : 4.",
            },
            {
              id: "q2",
              prompt: "Un equipo de fútbol ganó 7 partidos y perdió 5. No empató ninguno. ¿Cuál es la razón de partidos ganados a partidos jugados?",
              choices: ["7 : 5", "5 : 12", "12 : 7", "7 : 12"],
              answer: 3,
              hint: "Partidos jugados = partidos ganados + partidos perdidos.",
              explain: "El equipo jugó 7 + 5 = 12 partidos. Ganados a jugados es 7 : 12, una razón de parte a todo.",
            },
            {
              id: "q3",
              prompt: "Una bebida lleva 3 partes de jugo por 1 parte de agua mineral. ¿Qué fracción de la bebida es jugo?",
              choices: ["1/3", "1/4", "3/4", "3/1"],
              answer: 2,
              hint: "Suma las partes para tener el total. Luego cuenta las partes de jugo.",
              explain: "La bebida tiene 3 + 1 = 4 partes iguales y 3 son de jugo, así que 3/4 de la bebida es jugo.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Razones en la cocina",
          brief: "Busca razones en las recetas o en los empaques de comida de tu casa.",
          steps: [
            "Busca una receta en un libro de cocina o en un empaque, o pídele una a alguien de tu casa.",
            "Elige dos ingredientes que se midan con la misma unidad, como tazas o cucharadas. Escribe su razón en los dos órdenes, por ejemplo 2 : 1 y 1 : 2.",
            "Dibuja un diagrama de cinta de una de las razones, con una casilla por cada unidad.",
            "Escribe una razón de parte a todo: un ingrediente comparado con el total de los dos.",
            "Explícale a alguien qué quiere decir tu razón usando las palabras “por cada”.",
          ],
        },
      ],
    },
    {
      id: "ratio-tables",
      title: "Razones equivalentes y tablas",
      summary: "Agranda o achica una razón multiplicando o dividiendo sus dos partes por el mismo número, y ordena las razones equivalentes en una tabla.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Más cantidad, el mismo sabor",
          blocks: [
            { type: "text", text: "Para preparar más agua fresca con el mismo sabor, multiplica las dos cantidades por el mismo número." },
            {
              type: "visual",
              visual: { kind: "fraction", parts: 10, shaded: 6 },
              alt: "Una cinta de 10 casillas iguales: 6 sombreadas para el jugo y 4 vacías para el agua. Es la cinta de 3 : 2 al doble.",
            },
            {
              type: "text",
              text: "Al doble se usan 6 tazas de jugo y 4 de agua. 3 : 2 y 6 : 4 son razones equivalentes: describen la misma mezcla.",
            },
            {
              type: "points",
              items: [
                "Multiplica las dos partes por el mismo número: 3 : 2 = 9 : 6 (por 3).",
                "Divide las dos partes entre el mismo número: 6 : 4 = 3 : 2 (entre 2).",
                "Sumar lo mismo a las dos partes no funciona. En 4 : 3 hay más agua por cada taza de jugo que en 3 : 2, así que queda más aguada.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Una tabla de razones",
          blocks: [
            { type: "text", text: "Una tabla de razones muestra razones equivalentes. Cada columna es la misma agua fresca, preparada en una jarra de otro tamaño." },
            { type: "text", text: "Jugo (tazas): 3, 6, 9, 12. Agua (tazas): 2, 4, 6, 8." },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 0], [2, 3], [4, 6], [6, 9], [8, 12]], xLabel: "Agua (tazas)", yLabel: "Jugo (tazas)" },
              alt: "Los pares de la tabla como puntos, con las tazas de agua en el eje horizontal y las de jugo en el vertical: (0, 0), (2, 3), (4, 6), (6, 9) y (8, 12). Los puntos quedan en una línea recta que pasa por (0, 0).",
            },
            { type: "text", text: "Si dibujas razones equivalentes como puntos, siempre quedan en una línea recta que pasa por (0, 0)." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Tres jarras de limonada",
          prompt:
            "La limonada lleva 1 taza de jugo de limón por cada 3 tazas de agua. La barra muestra una jarra. Cámbiala para mostrar 3 jarras, con una parte igual por cada taza, y sombrea el jugo de limón.",
          widget: { kind: "fraction-bar", parts: 4, shaded: 1, target: { parts: 12, shaded: 3 } },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Completa la tabla",
          prompt:
            "En una tabla de la limonada, el jugo de limón es 1, 2, 5 tazas y el agua es 3, 6, ? tazas. ¿Cuántas tazas de agua van con 5 tazas de jugo? Mueve el marcador a tu respuesta.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 15 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Comprueba lo que sabes",
          questions: [
            {
              id: "q1",
              prompt: "¿Qué razón es equivalente a 4 : 6?",
              choices: ["6 : 8", "8 : 10", "2 : 3", "5 : 7"],
              answer: 2,
              hint: "Prueba dividir los dos números entre el mismo número.",
              explain: "Si divides las dos partes de 4 : 6 entre 2, obtienes 2 : 3. En 6 : 8, 8 : 10 y 5 : 7 se sumó lo mismo a las dos partes, y eso cambia la razón.",
            },
            {
              id: "q2",
              prompt: "5 lápices cuestan $2. Al mismo precio, ¿cuánto cuestan 20 lápices?",
              choices: ["$4", "$8", "$10", "$17"],
              answer: 1,
              hint: "¿Por qué número multiplicas 5 para obtener 20? Haz lo mismo con el precio.",
              explain: "20 = 5 × 4, así que el precio es $2 × 4 = $8.",
            },
            {
              id: "q3",
              prompt: "Mia mezcla 2 tazas de pintura azul con 3 de amarilla. Leo mezcla 4 tazas de azul con 5 de amarilla. ¿Les sale el mismo verde?",
              choices: ["Sí, los dos pusieron 1 taza más de amarilla que de azul", "Sí, los dos mezclaron azul y amarilla", "No, 4 : 5 no es equivalente a 2 : 3"],
              answer: 2,
              hint: "Calcula el doble de la mezcla de Mia. ¿Te da la de Leo?",
              explain: "El doble de 2 : 3 es 4 : 6, no 4 : 5. La pintura de Leo tiene menos amarillo por cada taza de azul, así que su verde sale más azulado.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Una receta al doble o a la mitad",
          brief: "Usa una tabla de razones para cambiar el tamaño de una receta de verdad.",
          steps: [
            "Elige una receta con al menos tres ingredientes.",
            "Haz una tabla de razones con una columna para media receta, una receta y dos recetas.",
            "Revisa cada columna: ¿multiplicaste o dividiste todos los ingredientes por el mismo número?",
            "Si se puede, prepara la receta a la mitad o al doble con un adulto.",
            "Explícale a alguien por qué sumar 1 taza a cada ingrediente cambiaría el sabor.",
          ],
        },
      ],
    },
    {
      id: "unit-rates",
      title: "Tasa unitaria y precio unitario",
      summary: "Calcula cuánto hay por cada uno, como kilómetros por hora o precio por pieza, y usa el precio unitario para comparar.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Cuánto por cada uno",
          blocks: [
            {
              type: "text",
              text: "Una tasa compara dos cantidades con unidades distintas, como kilómetros y horas. La tasa unitaria dice cuánto hay por cada 1 de la segunda cantidad.",
            },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 0], [1, 12], [2, 24], [3, 36]], xLabel: "Tiempo (horas)", yLabel: "Distancia (km)" },
              alt: "Una gráfica de un paseo en bicicleta: (0, 0), (1, 12), (2, 24) y (3, 36). La distancia sube 12 km cada hora.",
            },
            { type: "text", text: "Una ciclista recorre 36 km en 3 horas a velocidad constante. Su tasa unitaria es 36 ÷ 3 = 12 kilómetros por hora." },
            {
              type: "points",
              items: [
                "“12 kilómetros por hora” quiere decir 12 kilómetros en cada hora.",
                "Para hallar la tasa unitaria, divide la primera cantidad entre la segunda.",
                "En la gráfica, la tasa unitaria es cuánto sube la línea por cada hora.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Precio unitario",
          blocks: [
            { type: "text", text: "El precio unitario es una tasa unitaria de dinero: lo que cuesta 1 pieza, o 1 kilo, 1 litro o 1 gramo." },
            {
              type: "points",
              items: [
                "Un paquete de 6 yogures cuesta $4.50. El precio unitario es $4.50 ÷ 6 = $0.75 por yogur.",
                "Uno de 12 yogures cuesta $8.40. El precio unitario es $8.40 ÷ 12 = $0.70 por yogur.",
                "El paquete de 12 cuesta menos por yogur. Conviene si se van a comer todos antes de que caduquen.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Precio por cajita",
          prompt: "Un paquete de 4 cajitas de jugo cuesta $3. ¿Cuánto cuesta 1 cajita, en dólares? Mueve el marcador a tu respuesta.",
          widget: { kind: "number-line", min: 0, max: 2, step: 0.25, start: 0, target: 0.75 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "¿Cuál cuesta menos por pieza?",
          prompt: "Calcula el precio unitario de cada paquete. Luego clasifica cada par según cuál cuesta menos por pieza.",
          widget: {
            kind: "sorter",
            categories: ["A cuesta menos", "B cuesta menos", "Mismo precio unitario"],
            items: [
              { id: "p1", text: "A: 3 por $1.50. B: 5 por $2.00.", answer: 1 },
              { id: "p2", text: "A: 2 por $5. B: 4 por $10.", answer: 2 },
              { id: "p3", text: "A: 10 por $4. B: 4 por $2.", answer: 0 },
              { id: "p4", text: "A: 6 por $3. B: 8 por $4.80.", answer: 0 },
              { id: "p5", text: "A: 12 por $6. B: 3 por $1.50.", answer: 2 },
              { id: "p6", text: "A: 8 por $2. B: 5 por $1.", answer: 1 },
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
              prompt: "Una impresora imprime 90 páginas en 6 minutos. ¿Cuántas páginas por minuto son?",
              choices: ["84", "15", "96", "540"],
              answer: 1,
              hint: "Por minuto quiere decir en 1 minuto. Divide las páginas entre los minutos.",
              explain: "90 ÷ 6 = 15, así que la impresora imprime 15 páginas por minuto.",
            },
            {
              id: "q2",
              prompt: "3 kilos de cerezas cuestan $12. ¿Cuál es el precio unitario?",
              choices: ["$36 por kilo", "$9 por kilo", "$0.25 por kilo", "$4 por kilo"],
              answer: 3,
              hint: "Divide el precio entre los kilos.",
              explain: "$12 ÷ 3 kilos = $4 por kilo. Los $0.25 salen de dividir al revés: eso son kilos por cada dólar.",
            },
            {
              id: "q3",
              prompt: "Diego corre 5 kilómetros en 25 minutos. Ana corre 3 kilómetros en 18 minutos. ¿Quién corre más rápido?",
              choices: ["Diego", "Ana", "Corren igual de rápido"],
              answer: 0,
              hint: "Calcula cuántos minutos tarda cada uno en 1 kilómetro. Menos minutos por kilómetro es más rápido.",
              explain:
                "Diego tarda 25 ÷ 5 = 5 minutos por kilómetro. Ana tarda 18 ÷ 3 = 6 minutos por kilómetro. Diego tarda menos en cada kilómetro, así que corre más rápido.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Compara en la tienda",
          brief: "Compara dos tamaños del mismo producto, como hace quien va de compras.",
          steps: [
            "Con un adulto, busca dos tamaños del mismo producto en casa, en una tienda o en un folleto de ofertas.",
            "Anota el precio y la cantidad de cada uno: gramos, mililitros o número de piezas.",
            "Divide para hallar cada precio unitario y redondea al centavo.",
            "Muchas tiendas ponen el precio unitario en la etiqueta del estante. Si estás en una tienda, compáralo con tu resultado.",
            "Decide cuál conviene más y di una razón por la que alguien elegiría el otro.",
          ],
        },
      ],
    },
    {
      id: "rate-problems",
      title: "Problemas de tasas",
      summary: "Usa la tasa unitaria para hallar un total o un tiempo, y cambia de unidades, como de metros a centímetros.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Usa la tasa de 1",
          blocks: [
            { type: "text", text: "Cuando conoces la tasa unitaria, puedes hallar cualquier cantidad. Una llave llena una tina a 3 litros por minuto." },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 0], [1, 3], [2, 6], [3, 9], [4, 12]], xLabel: "Tiempo (minutos)", yLabel: "Agua (litros)" },
              alt: "Una gráfica del agua que llena una tina: (0, 0), (1, 3), (2, 6), (3, 9) y (4, 12). El agua sube 3 litros cada minuto.",
            },
            {
              type: "points",
              items: [
                "Para hallar la cantidad, multiplica: 3 litros por minuto × 9 minutos = 27 litros.",
                "Para hallar el tiempo, divide: 30 litros ÷ 3 litros por minuto = 10 minutos.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Cambiar de unidades",
          blocks: [
            { type: "text", text: "Cambiar de unidad también es usar una tasa. En 1 metro hay 100 centímetros: 100 centímetros por metro." },
            {
              type: "points",
              items: [
                "3.5 metros = 3.5 × 100 = 350 centímetros.",
                "250 centímetros = 250 ÷ 100 = 2.5 metros.",
                "Para pasar a una unidad más pequeña se necesitan más, así que multiplicas. Para pasar a una más grande se necesitan menos, así que divides.",
              ],
            },
            { type: "text", text: "Con el tiempo pasa lo mismo: en 1 hora hay 60 minutos, así que 2.5 horas son 2.5 × 60 = 150 minutos." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Gasolina para un viaje",
          prompt: "Un carro recorre 15 km con 1 litro de gasolina. ¿Cuántos litros necesita para un viaje de 120 km? Mueve el marcador a tu respuesta.",
          widget: { kind: "number-line", min: 0, max: 10, step: 1, start: 0, target: 8 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "¿Multiplicar o dividir?",
          prompt: "Clasifica cada pregunta según la operación que la resuelve.",
          widget: {
            kind: "sorter",
            categories: ["Multiplicar", "Dividir"],
            items: [
              { id: "m-cm", text: "Pasar 7 metros a centímetros.", answer: 0 },
              { id: "cm-m", text: "Pasar 300 centímetros a metros.", answer: 1 },
              { id: "how-far", text: "Un autobús va a 60 km por hora. ¿Qué distancia recorre en 3 horas?", answer: 0 },
              { id: "how-long", text: "Un autobús va a 60 km por hora. ¿Cuánto tarda en recorrer 240 km?", answer: 1 },
              { id: "notebooks", text: "6 cuadernos cuestan $9. ¿Cuánto cuesta 1 cuaderno?", answer: 1 },
              { id: "kg", text: "Pasar 4 kilogramos a gramos.", answer: 0 },
              { id: "apples", text: "Las manzanas cuestan $2 el kilo. ¿Cuánto cuestan 5 kilos?", answer: 0 },
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
              prompt: "Una máquina llena 120 botellas en 4 minutos. Al mismo ritmo, ¿cuántas botellas llena en 10 minutos?",
              choices: ["480", "126", "300", "40"],
              answer: 2,
              hint: "Primero halla la tasa unitaria: botellas por minuto.",
              explain: "120 ÷ 4 = 30 botellas por minuto, y 30 × 10 = 300 botellas.",
            },
            {
              id: "q2",
              prompt: "¿Cuántos minutos hay en 3.5 horas?",
              choices: ["210", "350", "180", "63.5"],
              answer: 0,
              hint: "En cada hora hay 60 minutos.",
              explain: "3.5 × 60 = 210 minutos.",
            },
            {
              id: "q3",
              prompt: "Lucía camina a 4 km por hora. ¿Cuánto tarda en caminar 6 km?",
              choices: ["24 horas", "1 hora", "2 horas", "1.5 horas"],
              answer: 3,
              hint: "Divide la distancia entre la rapidez.",
              explain: "6 ÷ 4 = 1.5, así que tarda 1.5 horas: 1 hora y 30 minutos.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Latidos por minuto",
          brief: "Mide tu ritmo cardiaco, una tasa que tu cuerpo lleva todo el día.",
          steps: [
            "Busca tu pulso: apoya con suavidad dos dedos en la parte de adentro de la muñeca o a un lado del cuello.",
            "Cuenta los latidos durante 15 segundos mientras alguien mide el tiempo.",
            "Multiplica por 4 para obtener los latidos por minuto. ¿Por qué funciona multiplicar por 4?",
            "Haz saltos de tijera durante 30 segundos y vuelve a medir.",
            "Compara las dos tasas y cuéntale a alguien qué cambió.",
          ],
        },
      ],
    },
  ],
};

export default razonesEs;
