import { cats, skill, type Bi, type Entry } from "./shared";

// Grade 9: noun, relative and adverbial clauses; tone; audience and purpose.

// ---------------------------------------------------------------------------------------------------
// e.dependent.clauses — noun, relative and adverbial clauses (Spanish: subordinadas sustantivas,
// adjetivas o de relativo, y adverbiales). "That" / "que" can start a noun clause or a relative clause,
// and Spanish "si" can start a noun clause (preguntó si…) or a condition, so both appear on purpose.

type ClauseKind = "noun" | "relative" | "adverbial";
const CLAUSE_KIND = cats<ClauseKind>(
  {
    en: { noun: "Noun clause", relative: "Relative (adjective) clause", adverbial: "Adverbial clause" },
    es: { noun: "Sustantiva", relative: "Adjetiva (de relativo)", adverbial: "Adverbial" },
  },
  { en: ["noun", "relative", "adverbial"], es: ["noun", "relative", "adverbial"] },
  [
    {
      en: ["I know that the bus will be late.", "noun", "Ask: what do I know?", "The clause is the object of “know,” so it is a noun clause.", "that the bus will be late"],
      es: ["Sé que el autobús va a llegar tarde.", "noun", "Pregúntate: ¿qué sé?", "La subordinada es el complemento de “sé”: es sustantiva.", "que el autobús va a llegar tarde"],
    },
    {
      en: ["The book that I borrowed is overdue.", "relative", "Ask: which book?", "The clause describes “the book,” so it is a relative clause.", "that I borrowed"],
      es: ["El libro que pedí prestado está vencido.", "relative", "Pregúntate: ¿cuál libro?", "Describe a “el libro”: es adjetiva o de relativo.", "que pedí prestado"],
    },
    {
      en: ["We stayed inside because it was raining.", "adverbial", "Ask: why did we stay inside?", "The clause tells why, so it is an adverbial clause.", "because it was raining"],
      es: ["Nos quedamos adentro porque estaba lloviendo.", "adverbial", "Pregúntate: ¿por qué nos quedamos adentro?", "Dice por qué: es adverbial.", "porque estaba lloviendo"],
    },
    {
      en: ["Whoever finishes first can choose the game.", "noun", "Ask: who can choose the game?", "The clause is the subject, so it is a noun clause.", "Whoever finishes first"],
      es: ["Es importante que todos lleguen a tiempo.", "noun", "Pregúntate: ¿qué es importante?", "La subordinada es el sujeto de “es importante”: es sustantiva.", "que todos lleguen a tiempo"],
    },
    {
      en: ["Mia, who loves astronomy, joined the science club.", "relative", "The clause gives information about Mia.", "It describes a noun and starts with “who,” so it is a relative clause.", "who loves astronomy"],
      es: ["Mía, que ama la astronomía, entró al club de ciencias.", "relative", "La subordinada da información sobre Mía.", "Describe a un sustantivo y empieza con “que”: es adjetiva o de relativo.", "que ama la astronomía"],
    },
    {
      en: ["When the bell rang, everyone ran outside.", "adverbial", "Ask: when did everyone run outside?", "The clause tells when, so it is an adverbial clause.", "When the bell rang"],
      es: ["Cuando sonó el timbre, todos salieron corriendo.", "adverbial", "Pregúntate: ¿cuándo salieron todos?", "Dice cuándo: es adverbial.", "Cuando sonó el timbre"],
    },
    {
      en: ["What you said surprised me.", "noun", "Ask: what surprised me?", "The clause is the subject, so it is a noun clause.", "What you said"],
      es: ["Me sorprendió que llegaras tan temprano.", "noun", "Pregúntate: ¿qué me sorprendió?", "La subordinada es el sujeto de “sorprendió”: es sustantiva.", "que llegaras tan temprano"],
    },
    {
      en: ["The town where my grandmother grew up is near the ocean.", "relative", "Ask: which town?", "The clause describes “the town,” so it is a relative clause.", "where my grandmother grew up"],
      es: ["El pueblo donde creció mi abuela está cerca del mar.", "relative", "Pregúntate: ¿cuál pueblo?", "Describe a “el pueblo”: es adjetiva o de relativo.", "donde creció mi abuela"],
    },
    {
      en: ["If it snows tomorrow, school will close.", "adverbial", "Ask: under what condition will school close?", "The clause gives a condition, so it is an adverbial clause.", "If it snows tomorrow"],
      es: ["Si nieva mañana, no habrá clases.", "adverbial", "Pregúntate: ¿con qué condición no habrá clases?", "Pone una condición: es adverbial.", "Si nieva mañana"],
    },
    {
      en: ["The coach asked whether we were ready.", "noun", "Ask: what did the coach ask?", "The clause is the object of “asked,” so it is a noun clause.", "whether we were ready"],
      es: ["El entrenador preguntó si estábamos listos.", "noun", "Pregúntate: ¿qué preguntó el entrenador?", "Es el complemento de “preguntó”: es sustantiva. Aquí “si” no pone una condición.", "si estábamos listos"],
    },
    {
      en: ["The dog that lives next door barks at night.", "relative", "Ask: which dog?", "The clause describes “the dog,” so it is a relative clause.", "that lives next door"],
      es: ["El perro que vive al lado ladra de noche.", "relative", "Pregúntate: ¿cuál perro?", "Describe a “el perro”: es adjetiva o de relativo.", "que vive al lado"],
    },
    {
      en: ["Although it was cold, we swam in the lake.", "adverbial", "The clause sets up a contrast with the main idea.", "It tells under what circumstances we swam, so it is an adverbial clause.", "Although it was cold"],
      es: ["Aunque hacía frío, nadamos en el lago.", "adverbial", "La subordinada plantea un contraste con la idea principal.", "Dice en qué circunstancia nadamos: es adverbial.", "Aunque hacía frío"],
    },
    {
      en: ["My hope is that everyone passes the test.", "noun", "Ask: what is my hope?", "The clause renames the subject after “is,” so it works as a noun.", "that everyone passes the test"],
      es: ["Quiero que vengas a mi fiesta.", "noun", "Pregúntate: ¿qué quiero?", "Es el complemento de “quiero”: es sustantiva.", "que vengas a mi fiesta"],
    },
    {
      en: ["The scientist whose experiment won the prize spoke at our school.", "relative", "Ask: which scientist?", "The clause describes “the scientist,” so it is a relative clause.", "whose experiment won the prize"],
      es: ["La científica cuyo experimento ganó el premio habló en nuestra escuela.", "relative", "Pregúntate: ¿cuál científica?", "Describe a “la científica”: es adjetiva o de relativo.", "cuyo experimento ganó el premio"],
    },
    {
      en: ["Leo practiced until his fingers hurt.", "adverbial", "Ask: how long did Leo practice?", "The clause tells how long, so it is an adverbial clause.", "until his fingers hurt"],
      es: ["Leo practicó hasta que le dolieron los dedos.", "adverbial", "Pregúntate: ¿hasta cuándo practicó Leo?", "Dice hasta cuándo: es adverbial.", "hasta que le dolieron los dedos"],
    },
  ],
);

const DEPENDENT_CLAUSES = skill(
  { id: "e.dependent.clauses", grade: "9", title: { en: "Noun, relative, and adverbial clauses", es: "Subordinadas sustantivas, adjetivas y adverbiales" }, standard: "L.9-10.1b", prereqs: ["e.phrases.clauses"] },
  [
    {
      ...CLAUSE_KIND,
      ask: { en: "What kind of clause is {t}?", es: "¿Qué tipo de subordinada es {t}?" },
      hints: {
        en: ["What job does the clause do in the sentence?", "A noun clause works as a subject or object (what? who?). A relative clause describes a noun and usually starts with who, whose, which, that, or where. An adverbial clause tells when, why, how long, or under what condition, with words like because, when, if, until, or although."],
        es: ["¿Qué función cumple la subordinada en la oración?", "La sustantiva funciona como sujeto o complemento (¿qué?, ¿quién?). La adjetiva o de relativo describe a un sustantivo y empieza con que, quien, cuyo o donde. La adverbial dice cuándo, por qué, hasta cuándo o con qué condición: porque, cuando, si, hasta que, aunque."],
      },
      seconds: 20,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.tone — the writer's attitude, read from word choice and details. Tags: opposite-tone,
// unsupported-tone (a tone the words do not show), overlooked-word-choice (called it neutral).

const TONES: Bi<Entry>[] = [
  {
    en: ["The new playground is finally here, and it is wonderful: three slides, a climbing wall, and shade for parents. Our neighborhood waited years for this, and it was worth every day.", "enthusiastic", [["bitter", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Look at words like “finally,” “wonderful,” and “worth every day.”", "Those words show excitement and approval."],
    es: ["Por fin tenemos el nuevo parque, y es maravilloso: tres toboganes, un muro para escalar y sombra para las familias. El barrio esperó años, y valió cada día.", "entusiasta", [["amargo", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Fíjate en palabras como “por fin”, “maravilloso” y “valió cada día”.", "Esas palabras muestran emoción y aprobación."],
  },
  {
    en: ["Once again, the city has promised to fix the potholes on Elm Street. Once again, nothing has happened. Maybe the potholes will fix themselves before the city does.", "sarcastic and frustrated", [["hopeful", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Notice the repeated “Once again” and the joke in the last sentence.", "The writer mocks the city's broken promises."],
    es: ["Otra vez la ciudad prometió arreglar los baches de la calle Olmo. Otra vez no pasó nada. Tal vez los baches se arreglen solos antes que la ciudad.", "sarcástico y frustrado", [["esperanzado", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Fíjate en el “Otra vez” repetido y en la broma de la última oración.", "Quien escribe se burla de las promesas incumplidas de la ciudad."],
  },
  {
    en: ["The museum is open Tuesday through Sunday from 10 a.m. to 5 p.m. Admission is free for students with an ID. Guided tours begin every hour.", "neutral and informative", [["excited", "unsupported-tone"], ["annoyed", "unsupported-tone"]], "Are there any words that show feelings, or only facts?", "The passage gives facts without opinions or feelings."],
    es: ["El museo abre de martes a domingo, de 10 a. m. a 5 p. m. La entrada es gratuita para estudiantes con credencial. Las visitas guiadas empiezan cada hora.", "neutral e informativo", [["emocionado", "unsupported-tone"], ["molesto", "unsupported-tone"]], "¿Hay palabras que muestren sentimientos, o solo datos?", "El texto da datos sin opiniones ni sentimientos."],
  },
  {
    en: ["I still remember the smell of my grandfather's workshop: sawdust, oil, and coffee. I miss the way he hummed while he worked, and I wish I had asked him more questions.", "nostalgic", [["cheerful", "unsupported-tone"], ["neutral", "overlooked-word-choice"]], "Look at “I still remember,” “I miss,” and “I wish.”", "The writer looks back with longing."],
    es: ["Todavía recuerdo el olor del taller de mi abuelo: aserrín, aceite y café. Extraño cómo tarareaba mientras trabajaba, y ojalá le hubiera hecho más preguntas.", "nostálgico", [["alegre", "unsupported-tone"], ["neutral", "overlooked-word-choice"]], "Fíjate en “todavía recuerdo”, “extraño” y “ojalá”.", "Quien escribe recuerda el pasado con añoranza."],
  },
  {
    en: ["Students, the fire alarm is not a toy. Pulling it as a prank puts everyone in danger and wastes the firefighters' time. This must stop now.", "serious and stern", [["playful", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Look at “not a toy,” “danger,” and “must stop now.”", "The writer is firm and warns the reader."],
    es: ["Estudiantes: la alarma de incendios no es un juguete. Activarla como broma pone en peligro a todos y les quita tiempo a los bomberos. Esto tiene que parar ya.", "serio y severo", [["juguetón", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Fíjate en “no es un juguete”, “peligro” y “tiene que parar ya”.", "Quien escribe es firme y advierte al lector."],
  },
  {
    en: ["Our cat believes she is the queen of the house. Every morning she inspects her kingdom, yells at the toaster, and demands breakfast as if we were her servants.", "humorous", [["angry", "unsupported-tone"], ["neutral", "overlooked-word-choice"]], "Picture a cat yelling at a toaster. Is the writer upset or amused?", "The writer exaggerates the cat's behavior to make readers laugh."],
    es: ["Nuestra gata cree que es la reina de la casa. Cada mañana inspecciona su reino, le maúlla al tostador y exige su desayuno como si fuéramos sus sirvientes.", "humorístico", [["enojado", "unsupported-tone"], ["neutral", "overlooked-word-choice"]], "Imagina a una gata regañando al tostador. ¿Quien escribe está molesto o divertido?", "Quien escribe exagera la conducta de la gata para hacer reír."],
  },
  {
    en: ["Thousands of volunteers showed up after the flood. Strangers carried sandbags side by side and shared food from their own kitchens. In the worst week, our town was at its best.", "admiring", [["critical", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Look at the last sentence: “our town was at its best.”", "The writer praises how people helped each other."],
    es: ["Miles de voluntarios llegaron después de la inundación. Desconocidos cargaron costales de arena hombro con hombro y compartieron la comida de sus propias cocinas. En la peor semana, nuestro pueblo dio lo mejor de sí.", "admirativo", [["crítico", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Fíjate en la última oración: “nuestro pueblo dio lo mejor de sí”.", "Quien escribe elogia cómo la gente se ayudó."],
  },
  {
    en: ["The coach said the bus would leave at 7:00. We were there at 6:45. The bus showed up at 8:30. Nobody called. Nobody apologized.", "frustrated", [["grateful", "opposite-tone"], ["joyful", "unsupported-tone"]], "Notice the short, flat sentences at the end: “Nobody called. Nobody apologized.”", "The clipped sentences show the writer's annoyance."],
    es: ["El entrenador dijo que el autobús saldría a las 7:00. Llegamos a las 6:45. El autobús apareció a las 8:30. Nadie llamó. Nadie se disculpó.", "frustrado", [["agradecido", "opposite-tone"], ["alegre", "unsupported-tone"]], "Fíjate en las oraciones cortas del final: “Nadie llamó. Nadie se disculpó”.", "Las oraciones cortantes muestran el enojo de quien escribe."],
  },
  {
    en: ["The cave was silent except for the drip of water somewhere in the dark. My flashlight flickered. Something shifted in the shadows ahead.", "suspenseful", [["cheerful", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Look at “silent,” “flickered,” and “something shifted in the shadows.”", "The details build tension and make the reader wonder what will happen."],
    es: ["La cueva estaba en silencio, salvo por el goteo del agua en algún lugar oscuro. Mi linterna parpadeó. Algo se movió entre las sombras.", "de suspenso", [["alegre", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Fíjate en “silencio”, “parpadeó” y “algo se movió entre las sombras”.", "Los detalles crean tensión y hacen que el lector se pregunte qué pasará."],
  },
  {
    en: ["Some people say the new schedule is confusing. They have a point: the bell times changed twice this year. Still, a later start gives students more sleep, and that matters.", "balanced and thoughtful", [["angry", "unsupported-tone"], ["silly", "unsupported-tone"]], "Does the writer consider the other side before giving a view?", "The writer admits a fair point and then explains a reason calmly."],
    es: ["Algunos dicen que el nuevo horario es confuso. Tienen algo de razón: el horario del timbre cambió dos veces este año. Aun así, entrar más tarde da a los estudiantes más horas de sueño, y eso importa.", "equilibrado y reflexivo", [["enojado", "unsupported-tone"], ["burlón", "unsupported-tone"]], "¿Quien escribe considera la otra postura antes de dar su opinión?", "Reconoce un punto justo y luego explica una razón con calma."],
  },
  {
    en: ["What a great idea it was to schedule the outdoor concert during hurricane season. I'm sure the band loved playing in the rain.", "sarcastic", [["sincere", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Is planning an outdoor concert in hurricane season really a great idea?", "The writer says the opposite of what they mean to criticize the plan."],
    es: ["Qué gran idea fue programar el concierto al aire libre en temporada de huracanes. Seguro que a la banda le encantó tocar bajo la lluvia.", "sarcástico", [["sincero", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "¿De verdad es una gran idea un concierto al aire libre en temporada de huracanes?", "Quien escribe dice lo contrario de lo que piensa para criticar el plan."],
  },
  {
    en: ["Thank you, Ms. Ruiz, for staying late every Thursday to help us with algebra. Because of you, I finally believe I can do math.", "grateful", [["resentful", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Look at “Thank you” and “Because of you.”", "The writer thanks the teacher warmly."],
    es: ["Gracias, maestra Ruiz, por quedarse tarde cada jueves para ayudarnos con álgebra. Gracias a usted, por fin creo que puedo con las matemáticas.", "agradecido", [["resentido", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Fíjate en “Gracias” y “Gracias a usted”.", "Quien escribe le da las gracias a la maestra con cariño."],
  },
  {
    en: ["The empty field behind the school used to be full of kids every afternoon. Now the swings rust, the grass grows wild, and no one comes.", "melancholy", [["cheerful", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Compare “used to be full of kids” with “no one comes.”", "The contrast between then and now creates a sad, wistful tone."],
    es: ["El terreno detrás de la escuela antes se llenaba de niños cada tarde. Ahora los columpios se oxidan, el pasto crece sin control y ya nadie va.", "melancólico", [["alegre", "opposite-tone"], ["neutral", "overlooked-word-choice"]], "Compara “antes se llenaba de niños” con “ya nadie va”.", "El contraste entre antes y ahora crea un tono triste."],
  },
  {
    en: ["Recycling is not optional anymore. Our landfill will be full in ten years. Every family on this street needs to start sorting its trash today.", "urgent", [["relaxed", "opposite-tone"], ["humorous", "unsupported-tone"]], "Look at “not optional anymore,” “ten years,” and “today.”", "The writer pushes readers to act right away."],
    es: ["Reciclar ya no es opcional. Nuestro relleno sanitario estará lleno en diez años. Cada familia de esta calle tiene que empezar a separar su basura hoy.", "urgente", [["relajado", "opposite-tone"], ["humorístico", "unsupported-tone"]], "Fíjate en “ya no es opcional”, “diez años” y “hoy”.", "Quien escribe empuja a actuar de inmediato."],
  },
];

const TONE = skill(
  { id: "e.tone", grade: "9", title: { en: "Tone and word choice", es: "Tono y elección de palabras" }, standard: "RL.9-10.4", prereqs: ["e.connotation"] },
  [
    {
      bank: TONES,
      ask: { en: "Which word best describes the writer's tone?", es: "¿Qué palabra describe mejor el tono de quien escribe?" },
      hints: {
        en: ["Tone is the writer's attitude toward the subject. Which words show feeling?", "List the strongest words and details. Do they sound approving, critical, joking, worried, or neutral?"],
        es: ["El tono es la actitud de quien escribe hacia el tema. ¿Qué palabras muestran sentimientos?", "Haz una lista de las palabras y los detalles más fuertes. ¿Suenan a aprobación, crítica, broma, preocupación o neutralidad?"],
      },
      seconds: 40,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.audience.purpose — level 1: the main purpose (to inform, to persuade, to entertain); level 2: the
// version that fits the audience and the purpose. Tags: too-technical, too-casual, too-formal,
// off-purpose.

type Purpose = "inform" | "persuade" | "entertain";
const PURPOSES: readonly Purpose[] = ["inform", "persuade", "entertain"];
const PURPOSE_KIND = cats<Purpose>(
  { en: { inform: "To inform", persuade: "To persuade", entertain: "To entertain" }, es: { inform: "Informar", persuade: "Persuadir", entertain: "Entretener" } },
  { en: PURPOSES, es: PURPOSES },
  [
    {
      en: ["Honeybees communicate by dancing. A bee that finds flowers returns to the hive and performs a “waggle dance” that shows the other bees which direction to fly and how far to go.", "inform", "Does the writer give an opinion or ask you to do anything?", "The passage gives facts and explains them."],
      es: ["Las abejas melíferas se comunican bailando. Una abeja que encuentra flores regresa a la colmena y hace una danza que les indica a las demás en qué dirección volar y qué tan lejos ir.", "inform", "¿Quien escribe da una opinión o te pide hacer algo?", "El texto da datos y los explica."],
    },
    {
      en: ["Our school should start a composting program. It would cut the cafeteria's trash in half and give the garden club free fertilizer. Sign the petition at the front office this week.", "persuade", "Look for “should” and the request at the end.", "The writer wants readers to agree and sign."],
      es: ["Nuestra escuela debería empezar un programa de composta. Reduciría a la mitad la basura de la cafetería y le daría abono gratis al club de jardinería. Firma la petición en la dirección esta semana.", "persuade", "Fíjate en “debería” y en la petición del final.", "Quien escribe quiere que el lector esté de acuerdo y firme."],
    },
    {
      en: ["When my little brother tried to make pancakes, he used salt instead of sugar. The dog took one bite, sneezed, and walked away with great dignity.", "entertain", "Is this a funny story or a set of facts?", "The writer tells a funny story for enjoyment."],
      es: ["Cuando mi hermanito intentó hacer panqueques, usó sal en vez de azúcar. El perro probó un bocado, estornudó y se fue con mucha dignidad.", "entertain", "¿Es una historia graciosa o una lista de datos?", "Quien escribe cuenta una historia graciosa para divertir."],
    },
    {
      en: ["The Great Wall of China was built over many centuries by different dynasties. It is not one single wall but a series of walls and fortifications.", "inform", "Does the writer give an opinion or ask you to do anything?", "The passage gives facts and explains them."],
      es: ["La Gran Muralla China se construyó durante muchos siglos, bajo distintas dinastías. No es un solo muro, sino una serie de murallas y fortificaciones.", "inform", "¿Quien escribe da una opinión o te pide hacer algo?", "El texto da datos y los explica."],
    },
    {
      en: ["Every student deserves a library that is open after school. Working parents cannot always pick kids up at three, and a safe place to read beats an empty house. Tell the school board to extend library hours.", "persuade", "Look for “deserves” and the request at the end.", "The writer wants readers to push for longer hours."],
      es: ["Todo estudiante merece una biblioteca abierta después de clases. Muchas familias que trabajan no pueden recoger a sus hijos a las tres, y un lugar seguro para leer es mejor que una casa vacía. Pídanle a la junta escolar que amplíe el horario.", "persuade", "Fíjate en “merece” y en la petición del final.", "Quien escribe quiere que el lector pida un horario más largo."],
    },
    {
      en: ["The squirrel had a plan. He would sneak past the dog, grab the biggest pinecone in the yard, and become a legend. The dog, unfortunately, had a plan too.", "entertain", "Is this a story or a set of facts?", "The writer tells a playful story for enjoyment."],
      es: ["La ardilla tenía un plan: pasar a escondidas junto al perro, robar la piña más grande del jardín y convertirse en leyenda. El perro, por desgracia, también tenía un plan.", "entertain", "¿Es una historia o una lista de datos?", "Quien escribe cuenta una historia divertida."],
    },
    {
      en: ["A solar eclipse happens when the moon passes between Earth and the sun and blocks some or all of the sun's light.", "inform", "Does the writer give an opinion or ask you to do anything?", "The passage explains a fact of science."],
      es: ["Un eclipse solar ocurre cuando la Luna pasa entre la Tierra y el Sol y tapa parte o toda la luz del Sol.", "inform", "¿Quien escribe da una opinión o te pide hacer algo?", "El texto explica un dato de ciencias."],
    },
    {
      en: ["If you care about clean water, stop buying bottled water. Use a refillable bottle instead. It saves money, and it keeps plastic out of our rivers.", "persuade", "Look at the commands: “stop buying” and “use.”", "The writer wants readers to change what they do."],
      es: ["Si te importa el agua limpia, deja de comprar agua embotellada. Usa una botella que puedas rellenar. Ahorras dinero y evitas que el plástico llegue a los ríos.", "persuade", "Fíjate en las órdenes: “deja de comprar” y “usa”.", "Quien escribe quiere que el lector cambie lo que hace."],
    },
    {
      en: ["At the talent show, Jamal planned to juggle three oranges. By the end, he had juggled two oranges, one shoe, and the principal's hat, and the crowd was on its feet.", "entertain", "Is this a story or a set of facts?", "The writer tells a funny story for enjoyment."],
      es: ["En el concurso de talentos, Jamal pensaba hacer malabares con tres naranjas. Al final hizo malabares con dos naranjas, un zapato y el sombrero del director, y el público se puso de pie.", "entertain", "¿Es una historia o una lista de datos?", "Quien escribe cuenta una historia graciosa para divertir."],
    },
    {
      en: ["Volcanoes form where melted rock, called magma, rises through cracks in Earth's crust. When magma reaches the surface, it is called lava.", "inform", "Does the writer give an opinion or ask you to do anything?", "The passage explains a fact of science."],
      es: ["Los volcanes se forman donde la roca fundida, llamada magma, sube por grietas de la corteza terrestre. Cuando el magma llega a la superficie, se llama lava.", "inform", "¿Quien escribe da una opinión o te pide hacer algo?", "El texto explica un dato de ciencias."],
    },
    {
      en: ["Ten minutes of stretching before practice could save your season. Every coach should make warm-ups a rule, starting today.", "persuade", "Look for “should” in the last sentence.", "The writer wants coaches to change their practices."],
      es: ["Diez minutos de estiramiento antes de entrenar pueden salvar tu temporada. Todos los entrenadores deberían hacer del calentamiento una regla desde hoy.", "persuade", "Fíjate en “deberían” en la última oración.", "Quien escribe quiere que los entrenadores cambien sus prácticas."],
    },
    {
      en: ["My grandmother's parrot speaks three words: “hello,” “dinner,” and my name. He uses the third one only when he wants the first two.", "entertain", "Is the writer making a joke?", "The writer shares a funny detail for enjoyment."],
      es: ["El perico de mi abuela dice tres palabras: “hola”, “comida” y mi nombre. La tercera solo la usa cuando quiere las otras dos.", "entertain", "¿Quien escribe está haciendo una broma?", "Quien escribe comparte un detalle gracioso para divertir."],
    },
    {
      en: ["The human heart has four chambers: two atria and two ventricles.", "inform", "Does the writer give an opinion or ask you to do anything?", "The passage states a fact of science."],
      es: ["El corazón humano tiene cuatro cavidades: dos aurículas y dos ventrículos.", "inform", "¿Quien escribe da una opinión o te pide hacer algo?", "El texto da un dato de ciencias."],
    },
    {
      en: ["Our town needs more bike lanes. Riding to school would be safer, traffic would ease, and the air would be cleaner. Vote yes on the bike-lane plan in November.", "persuade", "Look for “needs” and the request at the end.", "The writer wants readers to vote yes."],
      es: ["Nuestro pueblo necesita más ciclovías. Ir en bicicleta a la escuela sería más seguro, habría menos tráfico y el aire estaría más limpio. Vota sí al plan de ciclovías en noviembre.", "persuade", "Fíjate en “necesita” y en la petición del final.", "Quien escribe quiere que el lector vote que sí."],
    },
    {
      en: ["The class pet, a hamster named Captain, escaped on Friday. On Monday we found him asleep in the teacher's slipper, looking very pleased with himself.", "entertain", "Is this a story or a set of facts?", "The writer tells a funny story for enjoyment."],
      es: ["El hámster de la clase, el Capitán, se escapó el viernes. El lunes lo encontramos dormido en la pantufla de la maestra, muy satisfecho de sí mismo.", "entertain", "¿Es una historia o una lista de datos?", "Quien escribe cuenta una historia graciosa para divertir."],
    },
  ],
);

const AUDIENCE_FIT: Bi<Entry>[] = [
  {
    en: ["You are explaining photosynthesis to a group of second graders.", "Plants use sunlight to make their own food from water and air.", [["Photosynthesis converts carbon dioxide and water into glucose using light energy absorbed by chlorophyll.", "too-technical"], ["Plants are cool, and you should totally get one.", "off-purpose"]], "Second graders need short, simple words.", "The best version keeps the science true but uses words young children know."],
    es: ["Le explicas la fotosíntesis a un grupo de niños de segundo grado.", "Las plantas usan la luz del sol para fabricar su propio alimento con agua y aire.", [["La fotosíntesis transforma el dióxido de carbono y el agua en glucosa mediante la energía luminosa que absorbe la clorofila.", "too-technical"], ["Las plantas están buenísimas y deberías tener una.", "off-purpose"]], "Los niños de segundo grado necesitan palabras cortas y sencillas.", "La mejor versión dice algo verdadero con palabras que un niño conoce."],
  },
  {
    en: ["You are writing a letter to the principal asking for a longer lunch period.", "We respectfully ask for a longer lunch period so that every student has time to eat.", [["Lunch is way too short, so fix it.", "too-casual"], ["Schools have served lunch for many years.", "off-purpose"]], "A principal is an adult in charge, and you want a change.", "The best version is polite and asks clearly for the change."],
    es: ["Le escribes una carta al director para pedir un recreo más largo.", "Le pedimos respetuosamente un recreo más largo para que todos tengamos tiempo de comer.", [["El recreo está cortísimo, arréglelo ya.", "too-casual"], ["Los recreos existen desde hace muchos años.", "off-purpose"]], "El director es un adulto con autoridad, y quieres un cambio.", "La mejor versión es cortés y pide el cambio con claridad."],
  },
  {
    en: ["You are writing a safety sign for a public pool where families with young children swim.", "No running on the deck.", [["Running on the wet deck could lead to falls caused by reduced friction between feet and tile.", "too-technical"], ["Hey, maybe chill on the running thing.", "too-casual"]], "A sign must be understood in a second by people of all ages.", "The best sign is short and clear."],
    es: ["Escribes un letrero de seguridad para una piscina pública con muchas familias.", "No correr en la orilla de la piscina.", [["Correr sobre la superficie mojada podría provocar caídas por la menor fricción entre los pies y el piso.", "too-technical"], ["Oigan, no anden corriendo, ¿va?", "too-casual"]], "Un letrero debe entenderse en un segundo, a cualquier edad.", "El mejor letrero es corto y claro."],
  },
  {
    en: ["You are texting a close friend to say you will be late to the movie.", "Running ten minutes late, save me a seat.", [["Dear friend, I regret to inform you that my arrival will be delayed by approximately ten minutes.", "too-formal"], ["The movie theater on Main Street opened in 1950.", "off-purpose"]], "A text to a close friend can be short and relaxed.", "The best version is quick and friendly and says what matters."],
    es: ["Le mandas un mensaje a tu mejor amigo para decirle que llegarás tarde al cine.", "Llego diez minutos tarde, apártame un lugar.", [["Estimado amigo: lamento informarle que mi llegada se retrasará unos diez minutos.", "too-formal"], ["El cine de la plaza abrió en 1950.", "off-purpose"]], "Un mensaje a tu mejor amigo puede ser corto y relajado.", "La mejor versión es rápida, amistosa y dice lo importante."],
  },
  {
    en: ["You are writing a report for your science teacher about your experiment.", "The plants that received ten hours of light grew 4 centimeters taller than the others.", [["My plants did awesome, way better than I thought.", "too-casual"], ["You should buy more plants for your house.", "off-purpose"]], "A science report gives exact results.", "The best version reports the result with numbers."],
    es: ["Escribes un informe para tu maestra de ciencias sobre tu experimento.", "Las plantas que recibieron diez horas de luz crecieron 4 centímetros más que las demás.", [["Mis plantas crecieron un montón, mejor de lo que pensé.", "too-casual"], ["Deberías comprar más plantas para tu casa.", "off-purpose"]], "Un informe de ciencias da resultados exactos.", "La mejor versión informa el resultado con números."],
  },
  {
    en: ["You are giving directions to a tourist who speaks a little English.", "Walk two blocks. Turn left at the bank. The museum is on the right.", [["Proceed in a northerly direction for approximately two city blocks, then turn left at the financial institution.", "too-technical"], ["The museum has a lot of interesting history.", "off-purpose"]], "Someone learning the language needs short, common words.", "The best version uses short steps and simple words."],
    es: ["Le das indicaciones a un turista que habla poco español.", "Camine dos cuadras. Dé vuelta a la izquierda en el banco. El museo está a la derecha.", [["Avance en dirección norte aproximadamente dos manzanas y gire a la izquierda en la institución financiera.", "too-technical"], ["El museo tiene mucha historia interesante.", "off-purpose"]], "Alguien que está aprendiendo el idioma necesita palabras cortas y comunes.", "La mejor versión usa pasos cortos y palabras sencillas."],
  },
  {
    en: ["You are writing a thank-you note to a guest speaker who visited your class.", "Thank you for sharing your work with us; your talk about rescue dogs inspired our class.", [["Thx, it was fun.", "too-casual"], ["Rescue dogs are trained in many different ways.", "off-purpose"]], "A guest deserves a polite, specific thank-you.", "The best version thanks the speaker and says what the class gained."],
    es: ["Escribes una nota de agradecimiento a un invitado que visitó tu clase.", "Gracias por compartir su trabajo con nosotros; su plática sobre perros rescatistas inspiró a la clase.", [["Grax, estuvo padre.", "too-casual"], ["Los perros rescatistas se entrenan de muchas formas.", "off-purpose"]], "Un invitado merece un agradecimiento cortés y concreto.", "La mejor versión agradece y dice qué aprendió la clase."],
  },
  {
    en: ["You are writing instructions for a younger student on how to check out a library book.", "Bring the book and your card to the desk. The librarian will scan both.", [["Present the volume and your identification credential to the circulation desk for processing.", "too-technical"], ["Libraries have existed for thousands of years.", "off-purpose"]], "A younger student needs simple steps.", "The best version gives short, clear steps."],
    es: ["Escribes instrucciones para un niño más pequeño sobre cómo pedir un libro prestado.", "Lleva el libro y tu credencial al mostrador. La bibliotecaria los va a escanear.", [["Presente el volumen y su credencial de identificación en el mostrador de préstamos para su procesamiento.", "too-technical"], ["Las bibliotecas existen desde hace miles de años.", "off-purpose"]], "Un niño más pequeño necesita pasos sencillos.", "La mejor versión da pasos cortos y claros."],
  },
  {
    en: ["You are speaking to the city council to ask for a crosswalk near your school.", "A crosswalk on Pine Street would let more than two hundred students cross safely each day.", [["Pine Street is super scary, you guys.", "too-casual"], ["I like walking to school because I see my friends.", "off-purpose"]], "City leaders need a respectful request with a reason.", "The best version makes the request and gives a clear reason."],
    es: ["Hablas ante el concejo municipal para pedir un cruce peatonal cerca de tu escuela.", "Un cruce peatonal en la calle Pino permitiría que más de doscientos estudiantes crucen seguros cada día.", [["La calle Pino da muchísimo miedo, de veras.", "too-casual"], ["Me gusta caminar a la escuela porque veo a mis amigos.", "off-purpose"]], "Las autoridades necesitan una petición respetuosa con una razón.", "La mejor versión hace la petición y da una razón clara."],
  },
  {
    en: ["You are writing a birthday card for your grandmother.", "Happy birthday, Grandma. Thank you for every story and every Sunday dinner.", [["This card serves to formally acknowledge the anniversary of your birth.", "too-formal"], ["Birthdays are celebrated in many countries.", "off-purpose"]], "A card for family can be warm and personal.", "The best version is warm and specific."],
    es: ["Escribes una tarjeta de cumpleaños para tu abuela.", "Feliz cumpleaños, abuela. Gracias por cada cuento y cada comida de domingo.", [["La presente tiene como fin reconocer formalmente el aniversario de su nacimiento.", "too-formal"], ["Los cumpleaños se celebran en muchos países.", "off-purpose"]], "Una tarjeta para la familia puede ser cálida y personal.", "La mejor versión es cálida y concreta."],
  },
  {
    en: ["You are writing an email to a company to ask about a summer job.", "I am writing to ask whether you have any summer positions for students.", [["Got any summer jobs?", "too-casual"], ["Summer is the warmest season of the year.", "off-purpose"]], "A company you do not know needs a polite, clear message.", "The best version is polite and says exactly what you want."],
    es: ["Le escribes un correo a una empresa para preguntar por un empleo de verano.", "Le escribo para preguntarle si tienen puestos de verano para estudiantes.", [["¿Hay chamba para el verano?", "too-casual"], ["El verano es la estación más calurosa del año.", "off-purpose"]], "Una empresa que no conoces necesita un mensaje cortés y claro.", "La mejor versión es cortés y dice exactamente lo que quieres."],
  },
  {
    en: ["You are explaining what a half is to a first grader.", "If you cut a pizza into two equal pieces, each piece is one half.", [["A fraction represents a quotient of two integers with a nonzero denominator.", "too-technical"], ["Pizza is a popular food in many countries.", "off-purpose"]], "A first grader learns best from something they can picture.", "The best version uses a simple, familiar example."],
    es: ["Le explicas a un niño de primer grado qué es la mitad.", "Si cortas una pizza en dos partes iguales, cada parte es la mitad.", [["Una fracción representa el cociente de dos números enteros con denominador distinto de cero.", "too-technical"], ["La pizza es una comida popular en muchos países.", "off-purpose"]], "Un niño de primer grado aprende mejor con algo que puede imaginar.", "La mejor versión usa un ejemplo sencillo y conocido."],
  },
  {
    en: ["You are writing a news article for the school paper about the robotics team.", "The robotics team won second place at Saturday's regional competition.", [["OMG the robotics team was amazing.", "too-casual"], ["Robots will probably do every job someday.", "off-purpose"]], "A news article reports what happened.", "The best version states the facts clearly."],
    es: ["Escribes una noticia para el periódico escolar sobre el equipo de robótica.", "El equipo de robótica obtuvo el segundo lugar en la competencia regional del sábado.", [["El equipo de robótica estuvo increíble, nos encantó.", "too-casual"], ["Algún día los robots harán todo el trabajo.", "off-purpose"]], "Una noticia informa lo que pasó.", "La mejor versión da los hechos con claridad."],
  },
  {
    en: ["You are writing a note to a substitute teacher about a student's allergy.", "Please note that Sam is allergic to peanuts; his medicine is in the nurse's office.", [["Sam can't do peanuts lol.", "too-casual"], ["Peanuts are legumes, not true nuts.", "off-purpose"]], "A note about health must be clear and complete.", "The best version gives the key facts the teacher needs."],
    es: ["Le escribes una nota a la maestra suplente sobre la alergia de un estudiante.", "Le informo que Sam es alérgico al cacahuate; su medicina está en la enfermería.", [["Sam no puede con el cacahuate jaja.", "too-casual"], ["El cacahuate en realidad es una legumbre.", "off-purpose"]], "Una nota sobre salud debe ser clara y completa.", "La mejor versión da los datos clave que la maestra necesita."],
  },
];

const AUDIENCE_PURPOSE = skill(
  { id: "e.audience.purpose", grade: "9", title: { en: "Audience and purpose", es: "Público y propósito" }, standard: "W.9-10.4", prereqs: ["e.formal.style"] },
  [
    {
      ...PURPOSE_KIND,
      ask: { en: "What is the writer's main purpose?", es: "¿Cuál es el propósito principal de quien escribe?" },
      hints: {
        en: ["What does the writer want the reader to do, know, or feel after reading?", "To inform gives facts and explanations. To persuade tries to change what the reader thinks or does, often with words like “should” or a request. To entertain tells a story or a joke for enjoyment."],
        es: ["¿Qué quiere quien escribe que el lector haga, sepa o sienta después de leer?", "Informar es dar datos y explicaciones. Persuadir es intentar cambiar lo que el lector piensa o hace, muchas veces con “debería” o una petición. Entretener es contar una historia o una broma para divertir."],
      },
      seconds: 25,
    },
    {
      bank: AUDIENCE_FIT,
      ask: { en: "Which version fits this audience and purpose best?", es: "¿Qué versión se ajusta mejor a este público y a este propósito?" },
      hints: {
        en: ["Who is the audience, and what does the writer need them to do or understand?", "Match the words to the reader: simple for young readers, polite and complete for adults in charge, short for signs, relaxed only with friends. Every choice must also serve the purpose."],
        es: ["¿Quién es el público y qué necesita quien escribe que haga o entienda?", "Ajusta las palabras al lector: sencillas para los niños, corteses y completas para las autoridades, breves en un letrero, relajadas solo con amigos. Además, la opción debe cumplir el propósito."],
      },
      seconds: 30,
    },
  ],
);

export { DEPENDENT_CLAUSES, TONE, AUDIENCE_PURPOSE };
