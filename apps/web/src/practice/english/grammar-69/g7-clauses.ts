import { cats, skill, type Bi, type Entry, type GroupJob } from "./shared";

// Grade 7: phrases and clauses; combining sentences.

// ---------------------------------------------------------------------------------------------------
// e.phrases.clauses — level 1: is the quoted group a phrase, an independent clause or a dependent clause
// (Spanish: frase, oración independiente u oración subordinada; the test is a conjugated verb, since a
// Spanish subject is often left unsaid); level 2: does the group work as a noun, an adjective or an
// adverb in this sentence.

type GroupKind = "phrase" | "independent" | "dependent";
const GROUP_KIND = cats<GroupKind>(
  {
    en: { phrase: "Phrase", independent: "Independent clause", dependent: "Dependent clause" },
    es: { phrase: "Frase", independent: "Oración independiente", dependent: "Oración subordinada" },
  },
  { en: ["phrase", "independent", "dependent"], es: ["phrase", "independent", "dependent"] },
  [
    {
      en: ["After the long game, the players rested in the shade.", "phrase", "Is there a verb in these words? Is anyone doing anything?", "“After the long game” has no subject and no verb, so it is a phrase.", "After the long game"],
      es: ["Después del partido largo, los jugadores descansaron a la sombra.", "phrase", "¿Hay un verbo conjugado en esas palabras?", "“Después del partido largo” no tiene verbo conjugado, así que es una frase.", "Después del partido largo"],
    },
    {
      en: ["The players rested because they were tired.", "dependent", "“They were tired” has a subject and a verb, but look at the word in front of it.", "It has a subject and verb but starts with “because,” so it cannot stand alone: a dependent clause.", "because they were tired"],
      es: ["Los jugadores descansaron porque estaban cansados.", "dependent", "“Estaban cansados” tiene verbo conjugado. ¿Qué palabra va delante?", "Tiene verbo, pero empieza con “porque” y no puede ir sola: es una oración subordinada.", "porque estaban cansados"],
    },
    {
      en: ["The players rested, and the coach handed out water.", "independent", "Read these words by themselves. Are they a complete thought?", "It has a subject (the coach) and a verb (handed), and it can stand alone: an independent clause.", "the coach handed out water"],
      es: ["Los jugadores descansaron y el entrenador repartió agua.", "independent", "Lee esas palabras solas. ¿Tienen sentido completo?", "Tiene sujeto y verbo conjugado, y puede ir sola: es una oración independiente.", "el entrenador repartió agua"],
    },
    {
      en: ["The girl with the red backpack won the spelling bee.", "phrase", "Look for a verb in these words.", "“With the red backpack” has no verb, so it is a phrase.", "with the red backpack"],
      es: ["La niña de la mochila roja ganó el concurso de ortografía.", "phrase", "Busca un verbo conjugado en esas palabras.", "“De la mochila roja” no tiene verbo conjugado, así que es una frase.", "de la mochila roja"],
    },
    {
      en: ["When the bell rang, everyone ran outside.", "dependent", "“The bell rang” has a subject and a verb. What word comes before it?", "It starts with “when,” so it cannot stand alone: a dependent clause.", "When the bell rang"],
      es: ["Cuando sonó el timbre, todos salieron corriendo.", "dependent", "“Sonó el timbre” tiene verbo. ¿Qué palabra va delante?", "Empieza con “cuando” y no puede ir sola: es una oración subordinada.", "Cuando sonó el timbre"],
    },
    {
      en: ["When the bell rang, everyone ran outside.", "independent", "Read these words by themselves. Are they a complete thought?", "It has a subject and a verb and is a complete thought: an independent clause.", "everyone ran outside"],
      es: ["Cuando sonó el timbre, todos salieron corriendo.", "independent", "Lee esas palabras solas. ¿Tienen sentido completo?", "Tiene sujeto y verbo conjugado, y tiene sentido completo: es una oración independiente.", "todos salieron corriendo"],
    },
    {
      en: ["My cousin, a talented painter, sold her first picture.", "phrase", "Look for a verb in these words.", "“A talented painter” renames my cousin but has no verb, so it is a phrase.", "a talented painter"],
      es: ["Mi prima, una pintora talentosa, vendió su primer cuadro.", "phrase", "Busca un verbo conjugado en esas palabras.", "“Una pintora talentosa” explica quién es mi prima, pero no tiene verbo: es una frase.", "una pintora talentosa"],
    },
    {
      en: ["The book that I borrowed is overdue.", "dependent", "“I borrowed” has a subject and a verb. What word starts the group?", "It starts with “that” and only describes the book, so it cannot stand alone: a dependent clause.", "that I borrowed"],
      es: ["El libro que pedí prestado está vencido.", "dependent", "“Pedí” es un verbo conjugado. ¿Con qué palabra empieza el grupo?", "Empieza con “que” y solo describe al libro: es una oración subordinada.", "que pedí prestado"],
    },
    {
      en: ["Running down the hill, Leo tripped on a root.", "phrase", "Is there a subject doing the running inside these words?", "“Running down the hill” has a verb form but no subject, so it is a phrase.", "Running down the hill"],
      es: ["En la bajada de la colina, Leo tropezó con una raíz.", "phrase", "¿Hay un verbo conjugado en esas palabras?", "“En la bajada de la colina” no tiene verbo conjugado, así que es una frase.", "En la bajada de la colina"],
    },
    {
      en: ["If it snows tomorrow, school will close.", "dependent", "Look at the first word of the group.", "It has a subject and a verb but starts with “if,” so it cannot stand alone: a dependent clause.", "If it snows tomorrow"],
      es: ["Si nieva mañana, no habrá clases.", "dependent", "Fíjate en la primera palabra del grupo.", "Tiene verbo, pero empieza con “si” y no puede ir sola: es una oración subordinada.", "Si nieva mañana"],
    },
    {
      en: ["If it snows tomorrow, school will close.", "independent", "Read these words by themselves. Are they a complete thought?", "It has a subject and a verb and is a complete thought: an independent clause.", "school will close"],
      es: ["Si nieva mañana, no habrá clases.", "independent", "Lee esas palabras solas. ¿Tienen sentido completo?", "Tiene verbo conjugado y sentido completo: es una oración independiente.", "no habrá clases"],
    },
    {
      en: ["We hiked to the top of the mountain.", "phrase", "Look for a verb in these words.", "These words have no subject and no verb, so they are a phrase.", "to the top of the mountain"],
      es: ["Subimos hasta la cima de la montaña.", "phrase", "Busca un verbo conjugado en esas palabras.", "Esas palabras no tienen verbo conjugado: son una frase.", "hasta la cima de la montaña"],
    },
    {
      en: ["Mia, who loves astronomy, joined the science club.", "dependent", "These words have a verb. Could they stand alone as a statement?", "“Who loves astronomy” describes Mia and cannot stand alone: a dependent clause.", "who loves astronomy"],
      es: ["Mía, que ama la astronomía, entró al club de ciencias.", "dependent", "Esas palabras tienen verbo. ¿Podrían ir solas como una afirmación?", "Describe a Mía y no puede ir sola: es una oración subordinada.", "que ama la astronomía"],
    },
    {
      en: ["Although it was cold, we swam in the lake.", "independent", "Read these words by themselves. Are they a complete thought?", "It has a subject and a verb and is a complete thought: an independent clause.", "we swam in the lake"],
      es: ["Aunque hacía frío, nadamos en el lago.", "independent", "Lee esas palabras solas. ¿Tienen sentido completo?", "Tiene verbo conjugado (el sujeto, nosotros, no se dice) y sentido completo: es una oración independiente.", "nadamos en el lago"],
    },
    {
      en: ["Although it was cold, we swam in the lake.", "dependent", "Look at the first word of the group.", "It starts with “although,” so it cannot stand alone: a dependent clause.", "Although it was cold"],
      es: ["Aunque hacía frío, nadamos en el lago.", "dependent", "Fíjate en la primera palabra del grupo.", "Empieza con “aunque” y no puede ir sola: es una oración subordinada.", "Aunque hacía frío"],
    },
    {
      en: ["The dog barked at the mail carrier, but the cat slept.", "independent", "Read these words by themselves. Are they a complete thought?", "It has a subject and a verb and is a complete thought: an independent clause.", "the cat slept"],
      es: ["El perro le ladró al cartero, pero el gato siguió dormido.", "independent", "Lee esas palabras solas. ¿Tienen sentido completo?", "Tiene sujeto y verbo conjugado, y tiene sentido completo: es una oración independiente.", "el gato siguió dormido"],
    },
  ],
);

const GROUP_JOB = cats<GroupJob>(
  {
    en: { noun: "Works as a noun", adjective: "Works as an adjective", adverb: "Works as an adverb" },
    es: { noun: "Funciona como sustantivo", adjective: "Funciona como adjetivo", adverb: "Funciona como adverbio" },
  },
  { en: ["noun", "adjective", "adverb"], es: ["noun", "adjective", "adverb"] },
  [
    {
      en: ["The girl with the red backpack won the spelling bee.", "adjective", "Ask: which girl?", "“With the red backpack” tells which girl, so it works as an adjective.", "with the red backpack"],
      es: ["La niña de la mochila roja ganó el concurso de ortografía.", "adjective", "Pregúntate: ¿cuál niña?", "“De la mochila roja” dice cuál niña, así que funciona como adjetivo.", "de la mochila roja"],
    },
    {
      en: ["We hiked to the top of the mountain.", "adverb", "Ask: where did we hike?", "It tells where we hiked, so it works as an adverb.", "to the top of the mountain"],
      es: ["Subimos hasta la cima de la montaña.", "adverb", "Pregúntate: ¿hasta dónde subimos?", "Dice hasta dónde, así que funciona como adverbio.", "hasta la cima de la montaña"],
    },
    {
      en: ["Reading mystery novels is my favorite hobby.", "noun", "Ask: what is my favorite hobby?", "It names an activity and is the subject, so it works as a noun.", "Reading mystery novels"],
      es: ["Leer novelas de misterio es mi pasatiempo favorito.", "noun", "Pregúntate: ¿qué es mi pasatiempo favorito?", "Nombra una actividad y es el sujeto, así que funciona como sustantivo.", "Leer novelas de misterio"],
    },
    {
      en: ["After lunch, the class visited the garden.", "adverb", "Ask: when did the class visit?", "It tells when, so it works as an adverb.", "After lunch"],
      es: ["Después del almuerzo, la clase visitó el huerto.", "adverb", "Pregúntate: ¿cuándo visitó la clase el huerto?", "Dice cuándo, así que funciona como adverbio.", "Después del almuerzo"],
    },
    {
      en: ["The house on the corner has a blue door.", "adjective", "Ask: which house?", "It tells which house, so it works as an adjective.", "on the corner"],
      es: ["La casa de la esquina tiene una puerta azul.", "adjective", "Pregúntate: ¿cuál casa?", "Dice cuál casa, así que funciona como adjetivo.", "de la esquina"],
    },
    {
      en: ["I know that the bus will be late.", "noun", "Ask: what do I know?", "The clause answers “what?” and is the object of “know,” so it works as a noun.", "that the bus will be late"],
      es: ["Sé que el autobús va a llegar tarde.", "noun", "Pregúntate: ¿qué sé?", "Responde a “¿qué?” y es el complemento de “sé”, así que funciona como sustantivo.", "que el autobús va a llegar tarde"],
    },
    {
      en: ["We stayed inside because it was raining.", "adverb", "Ask: why did we stay inside?", "It tells why, so it works as an adverb.", "because it was raining"],
      es: ["Nos quedamos adentro porque estaba lloviendo.", "adverb", "Pregúntate: ¿por qué nos quedamos adentro?", "Dice por qué, así que funciona como adverbio.", "porque estaba lloviendo"],
    },
    {
      en: ["The painting that hangs in the hall is mine.", "adjective", "Ask: which painting?", "It tells which painting, so it works as an adjective.", "that hangs in the hall"],
      es: ["El cuadro que cuelga en el pasillo es mío.", "adjective", "Pregúntate: ¿cuál cuadro?", "Dice cuál cuadro, así que funciona como adjetivo.", "que cuelga en el pasillo"],
    },
    {
      en: ["To win the race was Maya's goal.", "noun", "Ask: what was Maya's goal?", "It names the goal and is the subject, so it works as a noun.", "To win the race"],
      es: ["Ganar la carrera era la meta de Maya.", "noun", "Pregúntate: ¿qué era la meta de Maya?", "Nombra la meta y es el sujeto, así que funciona como sustantivo.", "Ganar la carrera"],
    },
    {
      en: ["The puppy slept under the kitchen table.", "adverb", "Ask: where did the puppy sleep?", "It tells where, so it works as an adverb.", "under the kitchen table"],
      es: ["El cachorro durmió debajo de la mesa de la cocina.", "adverb", "Pregúntate: ¿dónde durmió el cachorro?", "Dice dónde, así que funciona como adverbio.", "debajo de la mesa de la cocina"],
    },
    {
      en: ["A bowl of hot soup warmed us up.", "adjective", "Ask: what kind of bowl?", "It tells what kind of bowl, so it works as an adjective.", "of hot soup"],
      es: ["Un plato de sopa caliente nos reconfortó.", "adjective", "Pregúntate: ¿qué clase de plato?", "Dice qué clase de plato, así que funciona como adjetivo.", "de sopa caliente"],
    },
    {
      en: ["Whoever finishes first can choose the game.", "noun", "Ask: who can choose the game?", "The clause is the subject of the sentence, so it works as a noun.", "Whoever finishes first"],
      es: ["Quien termine primero puede elegir el juego.", "noun", "Pregúntate: ¿quién puede elegir el juego?", "Es el sujeto de la oración, así que funciona como sustantivo.", "Quien termine primero"],
    },
    {
      en: ["Leo practiced the piano until his fingers hurt.", "adverb", "Ask: how long did Leo practice?", "It tells how long, so it works as an adverb.", "until his fingers hurt"],
      es: ["Leo practicó el piano hasta que le dolieron los dedos.", "adverb", "Pregúntate: ¿hasta cuándo practicó Leo?", "Dice hasta cuándo, así que funciona como adverbio.", "hasta que le dolieron los dedos"],
    },
    {
      en: ["The student who answered first got a sticker.", "adjective", "Ask: which student?", "It tells which student, so it works as an adjective.", "who answered first"],
      es: ["El estudiante que respondió primero ganó una estampa.", "adjective", "Pregúntate: ¿cuál estudiante?", "Dice cuál estudiante, así que funciona como adjetivo.", "que respondió primero"],
    },
    {
      en: ["Grandpa enjoys working in his garden.", "noun", "Ask: what does Grandpa enjoy?", "It names the activity he enjoys, so it works as a noun.", "working in his garden"],
      es: ["Al abuelo le encanta trabajar en su jardín.", "noun", "Pregúntate: ¿qué le encanta al abuelo?", "Nombra la actividad que le encanta (es el sujeto de “encanta”), así que funciona como sustantivo.", "trabajar en su jardín"],
    },
  ],
);

const PHRASES_CLAUSES = skill(
  { id: "e.phrases.clauses", grade: "7", title: { en: "Phrases and clauses", es: "Frases y oraciones" }, standard: "L.7.1a", prereqs: ["e.subject.verb"] },
  [
    {
      ...GROUP_KIND,
      ask: { en: "In this sentence, what is {t}?", es: "En esta oración, ¿qué es {t}?" },
      hints: {
        en: ["Look for a subject and a verb inside the quoted words.", "A phrase has no subject-verb pair; a clause has one. An independent clause can stand alone as a sentence. A dependent clause starts with a word like because, when, if, although, that, or who, and cannot stand alone."],
        es: ["Busca un verbo conjugado dentro de las palabras entre comillas.", "Una frase no tiene verbo conjugado; una oración sí. La oración independiente podría ir sola; la subordinada empieza con palabras como porque, cuando, si, aunque o que, y no puede ir sola."],
      },
      seconds: 20,
    },
    {
      ...GROUP_JOB,
      ask: { en: "What job does {t} do in this sentence?", es: "¿Qué función cumple {t} en esta oración?" },
      hints: {
        en: ["Ask what question the group of words answers.", "If it names a thing or activity (what? who?), it works as a noun. If it tells which one or what kind, it works as an adjective. If it tells when, where, why, how, or how long, it works as an adverb."],
        es: ["Pregúntate a qué pregunta responde el grupo de palabras.", "Si nombra una cosa o una actividad (¿qué?, ¿quién?), funciona como sustantivo. Si dice cuál o de qué clase, como adjetivo. Si dice cuándo, dónde, por qué, cómo o hasta cuándo, como adverbio."],
      },
      seconds: 25,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.combining.sentences — level 1: join two sentences with the coordinating word that shows how they
// relate (and, but, or, so / y, pero, o, así que); level 2: make one idea a dependent clause (because,
// although, if, when / porque, como, aunque, si, cuando). English rules out the comma splice; Spanish
// rules out two sentences run together with no connector, and puts no comma before "y" or "o".

const COORDINATE: Bi<Entry>[] = [
  {
    en: ["It rained all morning. The game was canceled.", "It rained all morning, so the game was canceled.", [["It rained all morning, but the game was canceled.", "wrong-relationship"], ["It rained all morning, the game was canceled.", "comma-splice"], ["The game was canceled, so it rained all morning.", "reversed-relationship"]], "Did the rain cause the cancellation, or go against it?", "The rain caused the cancellation, so the link is a result: “so.”"],
    es: ["Llovió toda la mañana. Se canceló el partido.", "Llovió toda la mañana, así que se canceló el partido.", [["Llovió toda la mañana, pero se canceló el partido.", "wrong-relationship"], ["Llovió toda la mañana se canceló el partido.", "run-on"], ["Se canceló el partido, así que llovió toda la mañana.", "reversed-relationship"]], "¿La lluvia causó la cancelación, o va en contra de ella?", "La lluvia causó la cancelación: es una consecuencia, y se une con “así que”."],
  },
  {
    en: ["Mina practiced every day. She did not make the team.", "Mina practiced every day, but she did not make the team.", [["Mina practiced every day, so she did not make the team.", "wrong-relationship"], ["Mina practiced every day, she did not make the team.", "comma-splice"]], "Is the second idea what you would expect after the first?", "The second idea goes against what you expect, so the link is a contrast: “but.”"],
    es: ["Mina practicó todos los días. No entró al equipo.", "Mina practicó todos los días, pero no entró al equipo.", [["Mina practicó todos los días, así que no entró al equipo.", "wrong-relationship"], ["Mina practicó todos los días no entró al equipo.", "run-on"]], "¿La segunda idea es lo que esperarías después de la primera?", "La segunda idea va en contra de lo esperado: es un contraste, y se une con “pero”."],
  },
  {
    en: ["You can walk to school. You can ride the bus.", "You can walk to school, or you can ride the bus.", [["You can walk to school, but you can ride the bus.", "wrong-relationship"], ["You can walk to school, you can ride the bus.", "comma-splice"]], "The sentences give two options.", "Two choices are joined with “or.”"],
    es: ["Puedes caminar a la escuela. Puedes tomar el autobús.", "Puedes caminar a la escuela o puedes tomar el autobús.", [["Puedes caminar a la escuela, pero puedes tomar el autobús.", "wrong-relationship"], ["Puedes caminar a la escuela puedes tomar el autobús.", "run-on"]], "Las oraciones dan dos opciones.", "Dos opciones se unen con “o”, sin coma."],
  },
  {
    en: ["The library was closed. We studied at the park.", "The library was closed, so we studied at the park.", [["The library was closed, or we studied at the park.", "wrong-relationship"], ["The library was closed, we studied at the park.", "comma-splice"], ["We studied at the park, so the library was closed.", "reversed-relationship"]], "Why did we study at the park?", "The closed library caused the change, so the link is a result: “so.”"],
    es: ["La biblioteca estaba cerrada. Estudiamos en el parque.", "La biblioteca estaba cerrada, así que estudiamos en el parque.", [["La biblioteca estaba cerrada o estudiamos en el parque.", "wrong-relationship"], ["La biblioteca estaba cerrada estudiamos en el parque.", "run-on"], ["Estudiamos en el parque, así que la biblioteca estaba cerrada.", "reversed-relationship"]], "¿Por qué estudiamos en el parque?", "La biblioteca cerrada causó el cambio: es una consecuencia, y se une con “así que”."],
  },
  {
    en: ["Jamal plays the drums. His sister plays the violin.", "Jamal plays the drums, and his sister plays the violin.", [["Jamal plays the drums, so his sister plays the violin.", "wrong-relationship"], ["Jamal plays the drums, his sister plays the violin.", "comma-splice"]], "The second sentence adds a fact of the same kind.", "Two facts of the same kind are joined with “and.”"],
    es: ["Jamal toca la batería. Su hermana toca el violín.", "Jamal toca la batería y su hermana toca el violín.", [["Jamal toca la batería, así que su hermana toca el violín.", "wrong-relationship"], ["Jamal toca la batería su hermana toca el violín.", "run-on"]], "La segunda oración agrega un dato del mismo tipo.", "Dos datos del mismo tipo se unen con “y”, sin coma."],
  },
  {
    en: ["The soup was too hot. Leo waited a few minutes.", "The soup was too hot, so Leo waited a few minutes.", [["The soup was too hot, but Leo waited a few minutes.", "wrong-relationship"], ["The soup was too hot, Leo waited a few minutes.", "comma-splice"], ["Leo waited a few minutes, so the soup was too hot.", "reversed-relationship"]], "Why did Leo wait?", "The hot soup caused the waiting, so the link is a result: “so.”"],
    es: ["La sopa estaba muy caliente. Leo esperó unos minutos.", "La sopa estaba muy caliente, así que Leo esperó unos minutos.", [["La sopa estaba muy caliente, pero Leo esperó unos minutos.", "wrong-relationship"], ["La sopa estaba muy caliente Leo esperó unos minutos.", "run-on"], ["Leo esperó unos minutos, así que la sopa estaba muy caliente.", "reversed-relationship"]], "¿Por qué esperó Leo?", "La sopa caliente causó la espera: es una consecuencia, y se une con “así que”."],
  },
  {
    en: ["The museum was crowded. We still saw every exhibit.", "The museum was crowded, but we still saw every exhibit.", [["The museum was crowded, so we still saw every exhibit.", "wrong-relationship"], ["The museum was crowded, we still saw every exhibit.", "comma-splice"]], "Would a crowd usually help you see everything?", "Seeing everything goes against what a crowd leads you to expect, so the link is a contrast: “but.”"],
    es: ["El museo estaba lleno de gente. Vimos todas las salas.", "El museo estaba lleno de gente, pero vimos todas las salas.", [["El museo estaba lleno de gente, así que vimos todas las salas.", "wrong-relationship"], ["El museo estaba lleno de gente vimos todas las salas.", "run-on"]], "¿Mucha gente suele ayudar a ver todo?", "Ver todo va en contra de lo esperado: es un contraste, y se une con “pero”."],
  },
  {
    en: ["Bring a jacket. You might get cold.", "Bring a jacket, or you might get cold.", [["Bring a jacket, so you might get cold.", "wrong-relationship"], ["Bring a jacket, you might get cold.", "comma-splice"]], "What happens if you do not bring a jacket?", "Here “or” means “if not”: without a jacket, you might get cold."],
    es: ["Lleva una chaqueta. Te puede dar frío.", "Lleva una chaqueta o te puede dar frío.", [["Lleva una chaqueta, así que te puede dar frío.", "wrong-relationship"], ["Lleva una chaqueta te puede dar frío.", "run-on"]], "¿Qué pasa si no llevas chaqueta?", "Aquí “o” significa “si no”: sin chaqueta, te puede dar frío."],
  },
  {
    en: ["The power went out. We played board games by candlelight.", "The power went out, so we played board games by candlelight.", [["The power went out, but we played board games by candlelight.", "wrong-relationship"], ["The power went out, we played board games by candlelight.", "comma-splice"], ["We played board games by candlelight, so the power went out.", "reversed-relationship"]], "Why did we play by candlelight?", "The power outage caused the candlelight games, so the link is a result: “so.”"],
    es: ["Se fue la luz. Jugamos juegos de mesa con velas.", "Se fue la luz, así que jugamos juegos de mesa con velas.", [["Se fue la luz, pero jugamos juegos de mesa con velas.", "wrong-relationship"], ["Se fue la luz jugamos juegos de mesa con velas.", "run-on"], ["Jugamos juegos de mesa con velas, así que se fue la luz.", "reversed-relationship"]], "¿Por qué jugamos con velas?", "El apagón causó el juego con velas: es una consecuencia, y se une con “así que”."],
  },
  {
    en: ["Kai loves basketball. He has never played on a team.", "Kai loves basketball, but he has never played on a team.", [["Kai loves basketball, so he has never played on a team.", "wrong-relationship"], ["Kai loves basketball, he has never played on a team.", "comma-splice"]], "Is the second fact what you would expect?", "Never playing on a team is surprising for someone who loves the game, so the link is a contrast: “but.”"],
    es: ["A Kai le encanta el básquetbol. Nunca ha jugado en un equipo.", "A Kai le encanta el básquetbol, pero nunca ha jugado en un equipo.", [["A Kai le encanta el básquetbol, así que nunca ha jugado en un equipo.", "wrong-relationship"], ["A Kai le encanta el básquetbol nunca ha jugado en un equipo.", "run-on"]], "¿El segundo dato es lo que esperarías?", "Es sorprendente para alguien a quien le encanta el juego: es un contraste, y se une con “pero”."],
  },
  {
    en: ["The bakery sells fresh bread. It sells muffins too.", "The bakery sells fresh bread, and it sells muffins too.", [["The bakery sells fresh bread, but it sells muffins too.", "wrong-relationship"], ["The bakery sells fresh bread, it sells muffins too.", "comma-splice"]], "The second sentence adds one more thing the bakery sells.", "An added fact of the same kind is joined with “and.”"],
    es: ["La panadería vende pan fresco. También vende panecillos.", "La panadería vende pan fresco y también vende panecillos.", [["La panadería vende pan fresco, pero también vende panecillos.", "wrong-relationship"], ["La panadería vende pan fresco también vende panecillos.", "run-on"]], "La segunda oración agrega otra cosa que vende la panadería.", "Un dato más del mismo tipo se une con “y”, sin coma."],
  },
  {
    en: ["We can eat lunch now. We can wait until after the game.", "We can eat lunch now, or we can wait until after the game.", [["We can eat lunch now, so we can wait until after the game.", "wrong-relationship"], ["We can eat lunch now, we can wait until after the game.", "comma-splice"]], "The sentences give two options.", "Two choices are joined with “or.”"],
    es: ["Podemos almorzar ahora. Podemos esperar hasta después del partido.", "Podemos almorzar ahora o podemos esperar hasta después del partido.", [["Podemos almorzar ahora, así que podemos esperar hasta después del partido.", "wrong-relationship"], ["Podemos almorzar ahora podemos esperar hasta después del partido.", "run-on"]], "Las oraciones dan dos opciones.", "Dos opciones se unen con “o”, sin coma."],
  },
  {
    en: ["The trail was steep. Everyone reached the top.", "The trail was steep, but everyone reached the top.", [["The trail was steep, so everyone reached the top.", "wrong-relationship"], ["The trail was steep, everyone reached the top.", "comma-splice"]], "Does a steep trail usually make the climb easier or harder?", "Reaching the top goes against what a steep trail leads you to expect, so the link is a contrast: “but.”"],
    es: ["El sendero era empinado. Todos llegaron a la cima.", "El sendero era empinado, pero todos llegaron a la cima.", [["El sendero era empinado, así que todos llegaron a la cima.", "wrong-relationship"], ["El sendero era empinado todos llegaron a la cima.", "run-on"]], "¿Un sendero empinado facilita o dificulta la subida?", "Llegar a la cima va en contra de lo esperado: es un contraste, y se une con “pero”."],
  },
  {
    en: ["Our class raised 300 dollars. We bought a new tree for the courtyard.", "Our class raised 300 dollars, so we bought a new tree for the courtyard.", [["Our class raised 300 dollars, or we bought a new tree for the courtyard.", "wrong-relationship"], ["Our class raised 300 dollars, we bought a new tree for the courtyard.", "comma-splice"], ["We bought a new tree for the courtyard, so our class raised 300 dollars.", "reversed-relationship"]], "What made it possible to buy the tree?", "Raising the money led to buying the tree, so the link is a result: “so.”"],
    es: ["Nuestra clase reunió 300 dólares. Compramos un árbol nuevo para el patio.", "Nuestra clase reunió 300 dólares, así que compramos un árbol nuevo para el patio.", [["Nuestra clase reunió 300 dólares o compramos un árbol nuevo para el patio.", "wrong-relationship"], ["Nuestra clase reunió 300 dólares compramos un árbol nuevo para el patio.", "run-on"], ["Compramos un árbol nuevo para el patio, así que nuestra clase reunió 300 dólares.", "reversed-relationship"]], "¿Qué hizo posible comprar el árbol?", "Reunir el dinero llevó a comprar el árbol: es una consecuencia, y se une con “así que”."],
  },
];

const SUBORDINATE: Bi<Entry>[] = [
  {
    en: ["The game was canceled. It rained all morning.", "The game was canceled because it rained all morning.", [["The game was canceled although it rained all morning.", "wrong-relationship"], ["It rained all morning because the game was canceled.", "reversed-relationship"], ["Because it rained all morning. The game was canceled.", "fragment"]], "Which event caused the other?", "The rain is the cause, so it goes in the “because” clause."],
    es: ["Se canceló el partido. Llovió toda la mañana.", "Se canceló el partido porque llovió toda la mañana.", [["Se canceló el partido aunque llovió toda la mañana.", "wrong-relationship"], ["Llovió toda la mañana porque se canceló el partido.", "reversed-relationship"], ["Porque llovió toda la mañana. Se canceló el partido.", "fragment"]], "¿Qué hecho causó el otro?", "La lluvia es la causa, así que va en la subordinada con “porque”."],
  },
  {
    en: ["It was cold. We swam in the lake anyway.", "Although it was cold, we swam in the lake.", [["Because it was cold, we swam in the lake.", "wrong-relationship"], ["Although it was cold. We swam in the lake.", "fragment"]], "Is swimming in the cold what you would expect?", "The ideas contrast, so use “although.”"],
    es: ["Hacía frío. Igual nadamos en el lago.", "Aunque hacía frío, nadamos en el lago.", [["Como hacía frío, nadamos en el lago.", "wrong-relationship"], ["Aunque hacía frío. Nadamos en el lago.", "fragment"]], "¿Nadar con frío es lo que esperarías?", "Las ideas se oponen, así que se usa “aunque”."],
  },
  {
    en: ["You finish your homework. Then you can watch the movie.", "If you finish your homework, you can watch the movie.", [["Although you finish your homework, you can watch the movie.", "wrong-relationship"], ["If you can watch the movie, you finish your homework.", "reversed-relationship"], ["If you finish your homework. You can watch the movie.", "fragment"]], "One thing has to happen first for the other to happen.", "It is a condition, so use “if.”"],
    es: ["Terminas la tarea. Luego puedes ver la película.", "Si terminas la tarea, puedes ver la película.", [["Aunque terminas la tarea, puedes ver la película.", "wrong-relationship"], ["Si puedes ver la película, terminas la tarea.", "reversed-relationship"], ["Si terminas la tarea. Puedes ver la película.", "fragment"]], "Una cosa tiene que pasar para que pase la otra.", "Es una condición, así que se usa “si”."],
  },
  {
    en: ["The bell rang. Everyone ran outside.", "When the bell rang, everyone ran outside.", [["Unless the bell rang, everyone ran outside.", "wrong-relationship"], ["When everyone ran outside, the bell rang.", "reversed-relationship"], ["When the bell rang. Everyone ran outside.", "fragment"]], "Which happened first?", "One event happened at the time of the other, so use “when.”"],
    es: ["Sonó el timbre. Todos salieron corriendo.", "Cuando sonó el timbre, todos salieron corriendo.", [["Aunque sonó el timbre, todos salieron corriendo.", "wrong-relationship"], ["Cuando todos salieron corriendo, sonó el timbre.", "reversed-relationship"], ["Cuando sonó el timbre. Todos salieron corriendo.", "fragment"]], "¿Qué pasó primero?", "Un hecho pasó en el momento del otro, así que se usa “cuando”."],
  },
  {
    en: ["Leo studied hard. He wanted to pass the test.", "Leo studied hard because he wanted to pass the test.", [["Leo studied hard although he wanted to pass the test.", "wrong-relationship"], ["Leo wanted to pass the test because he studied hard.", "reversed-relationship"], ["Because he wanted to pass the test. Leo studied hard.", "fragment"]], "Why did Leo study?", "Wanting to pass is the reason, so it goes in the “because” clause."],
    es: ["Leo estudió mucho. Quería aprobar el examen.", "Leo estudió mucho porque quería aprobar el examen.", [["Leo estudió mucho aunque quería aprobar el examen.", "wrong-relationship"], ["Leo quería aprobar el examen porque estudió mucho.", "reversed-relationship"], ["Porque quería aprobar el examen. Leo estudió mucho.", "fragment"]], "¿Por qué estudió Leo?", "Querer aprobar es la razón, así que va en la subordinada con “porque”."],
  },
  {
    en: ["The movie was long. Nobody fell asleep.", "Although the movie was long, nobody fell asleep.", [["Because the movie was long, nobody fell asleep.", "wrong-relationship"], ["Although the movie was long. Nobody fell asleep.", "fragment"]], "Would a long movie usually keep everyone awake?", "The ideas contrast, so use “although.”"],
    es: ["La película era larga. Nadie se durmió.", "Aunque la película era larga, nadie se durmió.", [["Como la película era larga, nadie se durmió.", "wrong-relationship"], ["Aunque la película era larga. Nadie se durmió.", "fragment"]], "¿Una película larga suele mantener a todos despiertos?", "Las ideas se oponen, así que se usa “aunque”."],
  },
  {
    en: ["You must water the plants. Otherwise, they will dry out.", "The plants will dry out unless you water them.", [["The plants will dry out because you water them.", "wrong-relationship"], ["The plants will dry out if you water them.", "wrong-relationship"], ["Unless you water them. The plants will dry out.", "fragment"]], "The plants dry out only if one thing does not happen.", "“Unless” means “if not,” so it fits."],
    es: ["Tienes que regar las plantas. Si no, se secarán.", "Las plantas se secarán si no las riegas.", [["Las plantas se secarán porque las riegas.", "wrong-relationship"], ["Las plantas se secarán aunque las riegues.", "wrong-relationship"], ["Si no las riegas. Las plantas se secarán.", "fragment"]], "Las plantas se secan solo si algo no pasa.", "Es una condición negativa: “si no las riegas”."],
  },
  {
    en: ["The puppy saw the leash. It started wagging its tail.", "When the puppy saw the leash, it started wagging its tail.", [["Although the puppy saw the leash, it started wagging its tail.", "wrong-relationship"], ["When the puppy started wagging its tail, it saw the leash.", "reversed-relationship"], ["When the puppy saw the leash. It started wagging its tail.", "fragment"]], "What happened first, and what happened next?", "Seeing the leash came first, so it goes in the “when” clause."],
    es: ["El cachorro vio la correa. Empezó a mover la cola.", "Cuando el cachorro vio la correa, empezó a mover la cola.", [["Aunque el cachorro vio la correa, empezó a mover la cola.", "wrong-relationship"], ["Cuando el cachorro empezó a mover la cola, vio la correa.", "reversed-relationship"], ["Cuando el cachorro vio la correa. Empezó a mover la cola.", "fragment"]], "¿Qué pasó primero y qué pasó después?", "Ver la correa pasó primero, así que va en la subordinada con “cuando”."],
  },
  {
    en: ["The road was icy. The buses ran late.", "Because the road was icy, the buses ran late.", [["Although the road was icy, the buses ran late.", "wrong-relationship"], ["Because the buses ran late, the road was icy.", "reversed-relationship"], ["Because the road was icy. The buses ran late.", "fragment"]], "Which fact caused the other?", "The ice is the cause, so it goes in the “because” clause."],
    es: ["La carretera estaba congelada. Los autobuses llegaron tarde.", "Como la carretera estaba congelada, los autobuses llegaron tarde.", [["Aunque la carretera estaba congelada, los autobuses llegaron tarde.", "wrong-relationship"], ["Como los autobuses llegaron tarde, la carretera estaba congelada.", "reversed-relationship"], ["Como la carretera estaba congelada. Los autobuses llegaron tarde.", "fragment"]], "¿Qué hecho causó el otro?", "El hielo es la causa. “Como” causal va al principio de la oración."],
  },
  {
    en: ["Ana is shy. She gave a great speech.", "Although Ana is shy, she gave a great speech.", [["Because Ana is shy, she gave a great speech.", "wrong-relationship"], ["Although Ana is shy. She gave a great speech.", "fragment"]], "Is a great speech what you would expect from a shy person?", "The ideas contrast, so use “although.”"],
    es: ["Ana es tímida. Dio un gran discurso.", "Aunque Ana es tímida, dio un gran discurso.", [["Como Ana es tímida, dio un gran discurso.", "wrong-relationship"], ["Aunque Ana es tímida. Dio un gran discurso.", "fragment"]], "¿Un gran discurso es lo que esperarías de alguien tímido?", "Las ideas se oponen, así que se usa “aunque”."],
  },
  {
    en: ["It might stop raining. Then we will go to the park.", "If it stops raining, we will go to the park.", [["Although it stops raining, we will go to the park.", "wrong-relationship"], ["If we go to the park, it will stop raining.", "reversed-relationship"], ["If it stops raining. We will go to the park.", "fragment"]], "Which event depends on the other?", "Going to the park depends on the rain stopping, so use “if.”"],
    es: ["Puede que deje de llover. Entonces iremos al parque.", "Si deja de llover, iremos al parque.", [["Aunque deja de llover, iremos al parque.", "wrong-relationship"], ["Si vamos al parque, dejará de llover.", "reversed-relationship"], ["Si deja de llover. Iremos al parque.", "fragment"]], "¿Qué hecho depende del otro?", "Ir al parque depende de que deje de llover, así que se usa “si”."],
  },
  {
    en: ["Dad got home. Then we ate dinner.", "After Dad got home, we ate dinner.", [["Although Dad got home, we ate dinner.", "wrong-relationship"], ["After we ate dinner, Dad got home.", "reversed-relationship"], ["After Dad got home. We ate dinner.", "fragment"]], "Which happened first?", "Dad got home first, so it goes in the “after” clause."],
    es: ["Papá llegó a casa. Luego cenamos.", "Después de que papá llegó a casa, cenamos.", [["Aunque papá llegó a casa, cenamos.", "wrong-relationship"], ["Después de que cenamos, papá llegó a casa.", "reversed-relationship"], ["Después de que papá llegó a casa. Cenamos.", "fragment"]], "¿Qué pasó primero?", "Papá llegó primero, así que va en la subordinada con “después de que”."],
  },
  {
    en: ["The team lost the game. They celebrated their best season ever.", "Even though the team lost the game, they celebrated their best season ever.", [["Because the team lost the game, they celebrated their best season ever.", "wrong-relationship"], ["Even though the team lost the game. They celebrated their best season ever.", "fragment"]], "Is celebrating what you would expect after a loss?", "The ideas contrast, so use “even though.”"],
    es: ["El equipo perdió el partido. Celebró su mejor temporada.", "Aunque el equipo perdió el partido, celebró su mejor temporada.", [["Como el equipo perdió el partido, celebró su mejor temporada.", "wrong-relationship"], ["Aunque el equipo perdió el partido. Celebró su mejor temporada.", "fragment"]], "¿Celebrar es lo que esperarías después de perder?", "Las ideas se oponen, así que se usa “aunque”."],
  },
  {
    en: ["Sam forgot his lunch. His friends shared theirs.", "Because Sam forgot his lunch, his friends shared theirs.", [["Although Sam forgot his lunch, his friends shared theirs.", "wrong-relationship"], ["Because his friends shared their lunch, Sam forgot his.", "reversed-relationship"], ["Because Sam forgot his lunch. His friends shared theirs.", "fragment"]], "Why did his friends share?", "Forgetting the lunch is the cause, so it goes in the “because” clause."],
    es: ["Sam olvidó su almuerzo. Sus amigos compartieron el suyo.", "Como Sam olvidó su almuerzo, sus amigos compartieron el suyo.", [["Aunque Sam olvidó su almuerzo, sus amigos compartieron el suyo.", "wrong-relationship"], ["Como sus amigos compartieron su almuerzo, Sam olvidó el suyo.", "reversed-relationship"], ["Como Sam olvidó su almuerzo. Sus amigos compartieron el suyo.", "fragment"]], "¿Por qué compartieron sus amigos?", "Olvidar el almuerzo es la causa. “Como” causal va al principio de la oración."],
  },
];

const JOIN_ASK: Bi<string> = { en: "Which sentence joins the two ideas with the right connecting word?", es: "¿Qué oración une las dos ideas con el conector correcto?" };

const COMBINING = skill(
  { id: "e.combining.sentences", grade: "7", title: { en: "Combine sentences", es: "Unir oraciones" }, standard: "L.7.1b", prereqs: ["e.sentence.types"] },
  [
    {
      bank: COORDINATE,
      ask: JOIN_ASK,
      hints: {
        en: ["How are the two ideas related: one more fact, a contrast, a choice, or a result?", "Use “and” to add, “but” to contrast, “or” for a choice, and “so” for a result. Put a comma before the joining word. A comma alone cannot join two sentences."],
        es: ["¿Cómo se relacionan las dos ideas: un dato más, un contraste, una opción o una consecuencia?", "Usa “y” para sumar, “pero” para contrastar, “o” para elegir y “así que” para una consecuencia. Va coma antes de “pero” y de “así que”, pero no antes de “y” ni de “o”."],
      },
      seconds: 25,
    },
    {
      bank: SUBORDINATE,
      ask: JOIN_ASK,
      hints: {
        en: ["Which idea is the cause, the condition, the time, or the surprise?", "Start that idea with because, if, when, after, unless, or although. A clause that starts with one of these words cannot stand alone, so join it to the other idea, with a comma if it comes first."],
        es: ["¿Qué idea es la causa, la condición, el momento o la sorpresa?", "Empieza esa idea con porque, como, si, cuando, después de que o aunque. La subordinada no puede ir sola: únela a la otra idea, con coma si va primero."],
      },
      seconds: 30,
    },
  ],
);

export { PHRASES_CLAUSES, COMBINING };
