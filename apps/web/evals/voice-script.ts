// The fixed 30-line script for the voice (live tutor spec §7.4–7.5): the same lines for the blind
// listen, the real-vendor time-to-first-audio run, and the comparison with the best browser voice.
// Fractions, negatives, times, money, questions, and three K–2 lines, in English and Spanish, written
// the way the tutor writes them (digits and math signs: the app says them in words).

export type ScriptLine = { id: string; band: "k2" | "35" | "69"; en: string; es: string };

export const SCRIPT: ScriptLine[] = [
  { id: "k2-dots", band: "k2", en: "Let's count the dots together. How many do you see?", es: "Vamos a contar los puntos juntos. ¿Cuántos ves?" },
  { id: "k2-more", band: "k2", en: "Seven is more than five. Which one has more?", es: "Siete es más que cinco. ¿Cuál tiene más?" },
  { id: "k2-clock", band: "k2", en: "The short hand points to the 3. What time is it?", es: "La manecilla corta apunta al 3. ¿Qué hora es?" },
  { id: "frac-bottom", band: "35", en: "Look at the bottom number. It tells how many equal parts there are.", es: "Mira el número de abajo. Dice cuántas partes iguales hay." },
  { id: "frac-compare", band: "35", en: "Is 3/4 bigger than 2/3?", es: "¿Es 3/4 más grande que 2/3?" },
  { id: "frac-equal", band: "35", en: "1/2 and 2/4 are the same amount. Can you see why?", es: "1/2 y 2/4 son la misma cantidad. ¿Ves por qué?" },
  { id: "frac-sixteenths", band: "69", en: "So 5/16 of the pizza is left.", es: "Entonces queda 5/16 de la pizza." },
  { id: "frac-mixed", band: "35", en: "That makes 2 1/2 cups of flour.", es: "Eso da 2 1/2 tazas de harina." },
  { id: "frac-over", band: "69", en: "Write it as 5/23. Can it be simplified?", es: "Escríbelo como 5/23. ¿Se puede simplificar?" },
  { id: "neg-temp", band: "69", en: "The temperature dropped to -2 degrees overnight.", es: "La temperatura bajó a -2 grados durante la noche." },
  { id: "neg-add", band: "69", en: "What is -3 + 5?", es: "¿Cuánto es -3 + 5?" },
  { id: "neg-line", band: "69", en: "On the number line, -7 is to the left of -4.", es: "En la recta numérica, −7 está a la izquierda de −4." },
  { id: "time-half", band: "35", en: "School starts at 8:30. When do you leave home?", es: "La escuela empieza a las 8:30. ¿A qué hora sales de casa?" },
  { id: "time-quarter", band: "35", en: "The bus comes at 3:15.", es: "El autobús llega a las 3:15." },
  { id: "time-oclock", band: "k2", en: "It's 3:00. Time for a snack.", es: "Son las 3:00. Hora de merendar." },
  { id: "money-cents", band: "35", en: "A juice box costs $0.75.", es: "Una caja de jugo cuesta $0.75." },
  { id: "money-dollars", band: "35", en: "You have $2.50. Is that enough for two?", es: "Tienes $2.50. ¿Te alcanza para dos?" },
  { id: "money-thousand", band: "69", en: "The bike costs $1,250.", es: "La bicicleta cuesta $1.250." },
  { id: "pct", band: "69", en: "50% of 30 is 15. What is 10% of 30?", es: "El 50% de 30 es 15. ¿Cuánto es el 10% de 30?" },
  { id: "times", band: "35", en: "3 × 4 = 12. What is 3 × 5?", es: "3 × 4 = 12. ¿Cuánto es 3 × 5?" },
  { id: "area", band: "35", en: "The area is 12 cm². How did you find it?", es: "El área es 12 cm². ¿Cómo la encontraste?" },
  { id: "power", band: "69", en: "x^2 means x times x. What is 5²?", es: "x^2 quiere decir x por x. ¿Cuánto es 5²?" },
  { id: "root", band: "69", en: "√16 is 4, because 4 × 4 = 16.", es: "√16 es 4, porque 4 × 4 = 16." },
  { id: "decimal", band: "69", en: "Round 3.75 to the nearest tenth.", es: "Redondea 3.75 a la décima más cercana." },
  { id: "ordinal", band: "35", en: "She came in 2nd place.", es: "Ella quedó en 2.º lugar." },
  { id: "question-try", band: "35", en: "Which part is tricky?", es: "¿Qué parte es difícil?" },
  { id: "question-what", band: "69", en: "What have you tried so far?", es: "¿Qué has intentado hasta ahora?" },
  { id: "choice", band: "35", en: "Is it the top number or the bottom number?", es: "¿Es el número de arriba o el de abajo?" },
  { id: "misheard", band: "69", en: "I heard twelve. Did you mean twenty?", es: "Escuché doce. ¿Quisiste decir veinte?" },
  { id: "phone", band: "69", en: "You can call or text 988 any time.", es: "Puedes llamar o enviar un mensaje al 988 a cualquier hora." },
];
