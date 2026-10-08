import { skill, type Bi, type Entry } from "./shared";

// Grade 8: ellipses and dashes; shifts in voice and mood.

// ---------------------------------------------------------------------------------------------------
// e.ellipsis.dash — level 1: the mark that shows the pause. English: an ellipsis for hesitation or
// trailing off, a dash for a sudden break or interruption. Spanish works differently: los puntos
// suspensivos mark doubt, suspense and interruptions, go right after the word, and take no extra period;
// the raya opens each line of dialogue and sets off the narrator's words. Level 2: marking words left
// out of a quotation (Spanish: […] between brackets).

const PAUSES: Bi<Entry>[] = [
  {
    en: ["Show that the speaker trails off, unsure what to say.", "“Well… I guess we could try again.”", [["“Well—I guess we could try again.”", "dash-for-hesitation"], ["“Well, I guess we could try again.”", "comma-for-hesitation"]], "Trailing off is a slow, unsure pause.", "An ellipsis (…) shows hesitation or a voice trailing off."],
    es: ["Muestra que quien habla duda.", "—Bueno… creo que podemos intentarlo otra vez.", [["—Bueno, creo que podemos intentarlo otra vez.", "comma-for-hesitation"], ["—Bueno … creo que podemos intentarlo otra vez.", "space-before-ellipsis"]], "La duda es una pausa lenta e insegura.", "Los puntos suspensivos muestran duda y van pegados a la palabra anterior."],
  },
  {
    en: ["Show that the speaker is suddenly cut off.", "“I left my backpack on the—” The bus doors slammed shut.", [["“I left my backpack on the…” The bus doors slammed shut.", "ellipsis-for-sudden-break"], ["“I left my backpack on the,” The bus doors slammed shut.", "comma-for-strong-break"]], "Being cut off is sudden and sharp.", "A dash shows a sudden break or interruption."],
    es: ["Muestra que alguien interrumpe a quien habla.", "—¿Me prestas tu…? —No —dijo Leo.", [["—¿Me prestas tu—? —No —dijo Leo.", "dash-for-interruption"], ["—¿Me prestas tu,? —No —dijo Leo.", "comma-for-hesitation"]], "En español, una frase interrumpida queda en suspenso.", "En español, la interrupción se marca con puntos suspensivos, no con raya."],
  },
  {
    en: ["Show a sudden change of thought in the middle of the sentence.", "We could go to the park—no, the museum is better.", [["We could go to the park… no, the museum is better.", "ellipsis-for-sudden-break"], ["We could go to the park, no, the museum is better.", "comma-for-strong-break"]], "The writer changes direction all at once.", "A dash marks a sudden shift in thought."],
    es: ["Muestra que quien habla deja la frase en suspenso.", "—Si tuviéramos más tiempo…", [["—Si tuviéramos más tiempo….", "four-dots"], ["—Si tuviéramos más tiempo—", "dash-for-interruption"]], "La frase queda sin terminar, abierta.", "Los puntos suspensivos dejan la frase en suspenso, y después de ellos no se pone otro punto."],
  },
  {
    en: ["Show a long, nervous pause before the answer.", "“The answer is… forty-two?”", [["“The answer is—forty-two?”", "dash-for-hesitation"], ["“The answer is, forty-two?”", "comma-for-hesitation"]], "A nervous pause is slow and unsure.", "An ellipsis shows the hesitation."],
    es: ["Muestra una pausa larga y nerviosa antes de la respuesta.", "—La respuesta es… ¿cuarenta y dos?", [["—La respuesta es —¿cuarenta y dos?", "dash-for-interruption"], ["—La respuesta es, ¿cuarenta y dos?", "comma-for-hesitation"]], "Una pausa nerviosa es lenta e insegura.", "Los puntos suspensivos muestran la duda."],
  },
  {
    en: ["Show that the speaker trails off, thinking.", "“If only we had more time…”", [["“If only we had more time—”", "dash-for-hesitation"], ["“If only we had more time,”", "comma-for-hesitation"]], "The thought fades out slowly.", "An ellipsis shows a voice trailing off."],
    es: ["Escribe el diálogo con la raya que lo introduce y la que marca las palabras del narrador.", "—Ya llegué —dijo Ana.", [["“Ya llegué” —dijo Ana.", "missing-dialogue-dash"], ["—Ya llegué, —dijo Ana.", "comma-before-dash"]], "En español, cada intervención del diálogo empieza con raya.", "La raya abre lo que dice el personaje y otra raya introduce las palabras del narrador, sin coma antes."],
  },
  {
    en: ["Show that someone interrupts the speaker.", "“Can I borrow your—” “No,” said Leo.", [["“Can I borrow your…” “No,” said Leo.", "ellipsis-for-sudden-break"], ["“Can I borrow your,” “No,” said Leo.", "comma-for-strong-break"]], "An interruption cuts the words off sharply.", "A dash shows the interruption."],
    es: ["Muestra que algo interrumpe a quien habla.", "—Todos, por favor, tomen su… De pronto, una bandeja cayó al piso.", [["—Todos, por favor, tomen su— De pronto, una bandeja cayó al piso.", "dash-for-interruption"], ["—Todos, por favor, tomen su…. De pronto, una bandeja cayó al piso.", "four-dots"]], "En español, una frase interrumpida queda en suspenso.", "Los puntos suspensivos marcan la interrupción, sin punto extra."],
  },
  {
    en: ["Show a sharp break before an important point.", "The answer was simple—practice every day.", [["The answer was simple… practice every day.", "ellipsis-for-sudden-break"], ["The answer was simple, practice every day.", "comma-for-strong-break"]], "The break is sharp, to make the point stand out.", "A dash sets off the point with a strong break."],
    es: ["Muestra que quien habla intenta recordar.", "—Se llamaba… Rosa, creo.", [["—Se llamaba —Rosa, creo.", "dash-for-interruption"], ["—Se llamaba … Rosa, creo.", "space-before-ellipsis"]], "Recordar es hacer una pausa de duda.", "Los puntos suspensivos muestran la duda y van pegados a la palabra anterior."],
  },
  {
    en: ["Show that the speaker is unsure and stops.", "“I'm not sure if I can…”", [["“I'm not sure if I can—”", "dash-for-hesitation"], ["“I'm not sure if I can,”", "comma-for-hesitation"]], "The speaker fades out, unsure.", "An ellipsis shows the voice trailing off."],
    es: ["Escribe el diálogo con la raya que marca las palabras del narrador.", "—No encuentro mis llaves —murmuró Omar.", [["—No encuentro mis llaves, —murmuró Omar.", "comma-before-dash"], ["No encuentro mis llaves —murmuró Omar.", "missing-dialogue-dash"]], "En español, cada intervención del diálogo empieza con raya.", "La raya abre lo que dice Omar y otra raya introduce las palabras del narrador, sin coma antes."],
  },
  {
    en: ["Show a sudden interruption by a loud noise.", "“Everyone, please take your—” Crash. A tray hit the floor.", [["“Everyone, please take your…” Crash. A tray hit the floor.", "ellipsis-for-sudden-break"], ["“Everyone, please take your,” Crash. A tray hit the floor.", "comma-for-strong-break"]], "The noise cuts the sentence off sharply.", "A dash shows the sudden interruption."],
    es: ["Muestra que quien habla se va quedando dormido.", "—Solo cinco minutos más…", [["—Solo cinco minutos más….", "four-dots"], ["—Solo cinco minutos más …", "space-before-ellipsis"]], "La voz se apaga poco a poco.", "Los puntos suspensivos van pegados a la palabra anterior y no llevan otro punto."],
  },
  {
    en: ["Show the speaker pausing to remember.", "“Her name was… Rosa, I think.”", [["“Her name was—Rosa, I think.”", "dash-for-hesitation"], ["“Her name was, Rosa, I think.”", "comma-for-hesitation"]], "Remembering takes a slow, unsure pause.", "An ellipsis shows the hesitation."],
    es: ["Muestra que alguien interrumpe una pregunta.", "—¿Por qué tú…? Mamá levantó la mano.", [["—¿Por qué tú—? Mamá levantó la mano.", "dash-for-interruption"], ["—¿Por qué tú,? Mamá levantó la mano.", "comma-for-hesitation"]], "En español, una frase interrumpida queda en suspenso.", "Los puntos suspensivos marcan la interrupción; el signo de cierre va después."],
  },
  {
    en: ["Show a sudden change of plan.", "Let's paint the fence blue—actually, green would look better.", [["Let's paint the fence blue… actually, green would look better.", "ellipsis-for-sudden-break"], ["Let's paint the fence blue, actually, green would look better.", "comma-for-strong-break"]], "The plan changes all at once.", "A dash marks the sudden change."],
    es: ["Muestra que una lista podría seguir.", "Compramos manzanas, peras, uvas…", [["Compramos manzanas, peras, uvas….", "four-dots"], ["Compramos manzanas, peras, uvas—", "dash-for-interruption"]], "La lista queda abierta, como con un “etcétera”.", "Los puntos suspensivos al final de una enumeración la dejan abierta."],
  },
  {
    en: ["Show that the speaker drifts off, falling asleep.", "“Just five more minutes…”", [["“Just five more minutes—”", "dash-for-hesitation"], ["“Just five more minutes,”", "comma-for-hesitation"]], "The voice fades out slowly.", "An ellipsis shows the voice trailing off."],
    es: ["Escribe el diálogo con la raya que lo introduce.", "—¿Vienes a la feria? —preguntó Lucía.", [["¿Vienes a la feria? —preguntó Lucía.", "missing-dialogue-dash"], ["—¿Vienes a la feria?, —preguntó Lucía.", "comma-before-dash"]], "En español, cada intervención del diálogo empieza con raya.", "La raya abre la pregunta y otra raya introduce las palabras del narrador, sin coma."],
  },
  {
    en: ["Show that a question is cut off suddenly.", "“Why did you—” Mom held up her hand.", [["“Why did you…” Mom held up her hand.", "ellipsis-for-sudden-break"], ["“Why did you,” Mom held up her hand.", "comma-for-strong-break"]], "The question stops sharply in the middle.", "A dash shows the question was cut off."],
    es: ["Muestra suspenso antes de revelar algo.", "Abrí la caja despacio y adentro había… un cachorro.", [["Abrí la caja despacio y adentro había —un cachorro.", "dash-for-interruption"], ["Abrí la caja despacio y adentro había, un cachorro.", "comma-for-hesitation"]], "El suspenso se crea con una pausa que hace esperar.", "Los puntos suspensivos crean suspenso antes de la sorpresa."],
  },
  {
    en: ["Show a sudden, sharp break before a warning.", "Step back—the paint is still wet.", [["Step back… the paint is still wet.", "ellipsis-for-sudden-break"], ["Step back, the paint is still wet.", "comma-for-strong-break"]], "A warning needs a sharp break.", "A dash makes the sharp break; a comma alone cannot join these two sentences."],
    es: ["Muestra que quien habla duda antes de admitir algo.", "—Yo… rompí el florero.", [["—Yo, rompí el florero.", "comma-for-hesitation"], ["—Yo … rompí el florero.", "space-before-ellipsis"]], "Antes de admitir algo difícil, se duda.", "Los puntos suspensivos muestran la duda y van pegados a la palabra anterior."],
  },
];

const OMISSIONS: Bi<Entry>[] = [
  {
    en: ["Original: “The museum, which opened in 1910, is the oldest in the state.”", "“The museum … is the oldest in the state.”", [["“The museum is the oldest in the state.”", "missing-ellipsis"], ["“The museum, which opened in 1910 …”", "cut-key-words"]], "Which words can go without changing the main point?", "“Which opened in 1910” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “El museo, que abrió en 1910, es el más antiguo del estado”.", "“El museo […] es el más antiguo del estado”.", [["“El museo es el más antiguo del estado”.", "missing-ellipsis"], ["“El museo… es el más antiguo del estado”.", "ellipsis-without-brackets"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Que abrió en 1910” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “Bees, like many other insects, help flowers make seeds.”", "“Bees … help flowers make seeds.”", [["“Bees help flowers make seeds.”", "missing-ellipsis"], ["“Bees, like many other insects …”", "cut-key-words"]], "Which words can go without changing the main point?", "“Like many other insects” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “Las abejas, como muchos otros insectos, ayudan a las flores a producir semillas”.", "“Las abejas […] ayudan a las flores a producir semillas”.", [["“Las abejas ayudan a las flores a producir semillas”.", "missing-ellipsis"], ["“Las abejas… ayudan a las flores a producir semillas”.", "ellipsis-without-brackets"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Como muchos otros insectos” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “Our team, after months of hard practice, won the championship.”", "“Our team … won the championship.”", [["“Our team won the championship.”", "missing-ellipsis"], ["“Our team, after months of hard practice …”", "cut-key-words"]], "Which words can go without changing the main point?", "“After months of hard practice” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “Nuestro equipo, después de meses de práctica, ganó el campeonato”.", "“Nuestro equipo […] ganó el campeonato”.", [["“Nuestro equipo ganó el campeonato”.", "missing-ellipsis"], ["“Nuestro equipo, después de meses de práctica […]”.", "cut-key-words"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Después de meses de práctica” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “The old bridge, built of wood, is not safe for heavy trucks.”", "“The old bridge … is not safe for heavy trucks.”", [["“The old bridge … is safe for heavy trucks.”", "changed-meaning"], ["“The old bridge is not safe for heavy trucks.”", "missing-ellipsis"]], "Which small word must stay, because leaving it out flips the meaning?", "“Built of wood” can go. “Not” must stay."],
    es: ["Texto original: “El viejo puente, hecho de madera, no es seguro para camiones pesados”.", "“El viejo puente […] no es seguro para camiones pesados”.", [["“El viejo puente […] es seguro para camiones pesados”.", "changed-meaning"], ["“El viejo puente… no es seguro para camiones pesados”.", "ellipsis-without-brackets"]], "¿Qué palabra pequeña debe quedarse, porque quitarla cambia el sentido?", "“Hecho de madera” se puede quitar. “No” debe quedarse."],
  },
  {
    en: ["Original: “Sea turtles, which can live for decades, lay their eggs on sandy beaches.”", "“Sea turtles … lay their eggs on sandy beaches.”", [["“Sea turtles lay their eggs on sandy beaches.”", "missing-ellipsis"], ["“Sea turtles, which can live for decades …”", "cut-key-words"]], "Which words can go without changing the main point?", "“Which can live for decades” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “Las tortugas marinas, que pueden vivir décadas, ponen sus huevos en playas de arena”.", "“Las tortugas marinas […] ponen sus huevos en playas de arena”.", [["“Las tortugas marinas ponen sus huevos en playas de arena”.", "missing-ellipsis"], ["“Las tortugas marinas… ponen sus huevos en playas de arena”.", "ellipsis-without-brackets"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Que pueden vivir décadas” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “The library, because of the holiday, will not be open on Monday.”", "“The library … will not be open on Monday.”", [["“The library … will be open on Monday.”", "changed-meaning"], ["“The library will not be open on Monday.”", "missing-ellipsis"]], "Which small word must stay, because leaving it out flips the meaning?", "“Because of the holiday” can go. “Not” must stay."],
    es: ["Texto original: “La biblioteca, por el día festivo, no abrirá el lunes”.", "“La biblioteca […] no abrirá el lunes”.", [["“La biblioteca […] abrirá el lunes”.", "changed-meaning"], ["“La biblioteca no abrirá el lunes”.", "missing-ellipsis"]], "¿Qué palabra pequeña debe quedarse, porque quitarla cambia el sentido?", "“Por el día festivo” se puede quitar. “No” debe quedarse."],
  },
  {
    en: ["Original: “The new park, built on an old parking lot, will open in May.”", "“The new park … will open in May.”", [["“The new park will open in May.”", "missing-ellipsis"], ["“The new park, built on an old parking lot …”", "cut-key-words"]], "Which words can go without changing the main point?", "“Built on an old parking lot” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “El nuevo parque, construido sobre un antiguo estacionamiento, abrirá en mayo”.", "“El nuevo parque […] abrirá en mayo”.", [["“El nuevo parque abrirá en mayo”.", "missing-ellipsis"], ["“El nuevo parque, construido sobre un antiguo estacionamiento […]”.", "cut-key-words"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Construido sobre un antiguo estacionamiento” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “Exercise, even a short daily walk, can improve your mood.”", "“Exercise … can improve your mood.”", [["“Exercise can improve your mood.”", "missing-ellipsis"], ["“Exercise, even a short daily walk …”", "cut-key-words"]], "Which words can go without changing the main point?", "“Even a short daily walk” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “El ejercicio, incluso una caminata corta diaria, puede mejorar el ánimo”.", "“El ejercicio […] puede mejorar el ánimo”.", [["“El ejercicio… puede mejorar el ánimo”.", "ellipsis-without-brackets"], ["“El ejercicio, incluso una caminata corta diaria […]”.", "cut-key-words"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Incluso una caminata corta diaria” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “The volcano, covered in snow, is unlikely to erupt this year.”", "“The volcano … is unlikely to erupt this year.”", [["“The volcano … is likely to erupt this year.”", "changed-meaning"], ["“The volcano is unlikely to erupt this year.”", "missing-ellipsis"]], "Which part of a word must stay, because leaving it out flips the meaning?", "“Covered in snow” can go. “Unlikely” must stay whole."],
    es: ["Texto original: “El volcán, cubierto de nieve, probablemente no hará erupción este año”.", "“El volcán […] probablemente no hará erupción este año”.", [["“El volcán […] probablemente hará erupción este año”.", "changed-meaning"], ["“El volcán probablemente no hará erupción este año”.", "missing-ellipsis"]], "¿Qué palabra pequeña debe quedarse, porque quitarla cambia el sentido?", "“Cubierto de nieve” se puede quitar. “No” debe quedarse."],
  },
  {
    en: ["Original: “Our class, with help from parents, planted forty trees.”", "“Our class … planted forty trees.”", [["“Our class planted forty trees.”", "missing-ellipsis"], ["“Our class, with help from parents …”", "cut-key-words"]], "Which words can go without changing the main point?", "“With help from parents” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “Nuestra clase, con ayuda de las familias, plantó cuarenta árboles”.", "“Nuestra clase […] plantó cuarenta árboles”.", [["“Nuestra clase plantó cuarenta árboles”.", "missing-ellipsis"], ["“Nuestra clase… plantó cuarenta árboles”.", "ellipsis-without-brackets"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Con ayuda de las familias” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “The test, which has twenty questions, will cover only chapters one and two.”", "“The test … will cover only chapters one and two.”", [["“The test … will cover … chapters one and two.”", "changed-meaning"], ["“The test will cover only chapters one and two.”", "missing-ellipsis"]], "Which small word must stay, because leaving it out changes the meaning?", "“Which has twenty questions” can go. “Only” must stay."],
    es: ["Texto original: “El examen, que tiene veinte preguntas, incluirá solo los capítulos uno y dos”.", "“El examen […] incluirá solo los capítulos uno y dos”.", [["“El examen […] incluirá […] los capítulos uno y dos”.", "changed-meaning"], ["“El examen incluirá solo los capítulos uno y dos”.", "missing-ellipsis"]], "¿Qué palabra pequeña debe quedarse, porque quitarla cambia el sentido?", "“Que tiene veinte preguntas” se puede quitar. “Solo” debe quedarse."],
  },
  {
    en: ["Original: “The play, which the students wrote themselves, was a big success.”", "“The play … was a big success.”", [["“The play was a big success.”", "missing-ellipsis"], ["“The play, which the students wrote themselves …”", "cut-key-words"]], "Which words can go without changing the main point?", "“Which the students wrote themselves” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “La obra, que escribieron los propios estudiantes, fue todo un éxito”.", "“La obra […] fue todo un éxito”.", [["“La obra fue todo un éxito”.", "missing-ellipsis"], ["“La obra, que escribieron los propios estudiantes […]”.", "cut-key-words"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Que escribieron los propios estudiantes” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “Penguins, though they cannot fly, are excellent swimmers.”", "“Penguins … are excellent swimmers.”", [["“Penguins are excellent swimmers.”", "missing-ellipsis"], ["“Penguins, though they cannot fly …”", "cut-key-words"]], "Which words can go without changing the main point?", "“Though they cannot fly” can go, and the ellipsis shows where it was."],
    es: ["Texto original: “Los pingüinos, aunque no pueden volar, son excelentes nadadores”.", "“Los pingüinos […] son excelentes nadadores”.", [["“Los pingüinos… son excelentes nadadores”.", "ellipsis-without-brackets"], ["“Los pingüinos, aunque no pueden volar […]”.", "cut-key-words"]], "¿Qué palabras se pueden quitar sin cambiar la idea principal?", "“Aunque no pueden volar” se puede quitar, y […] marca dónde estaba."],
  },
  {
    en: ["Original: “The storm, the third of the winter, could bring more than a foot of snow.”", "“The storm … could bring more than a foot of snow.”", [["“The storm … could bring … a foot of snow.”", "changed-meaning"], ["“The storm could bring more than a foot of snow.”", "missing-ellipsis"]], "Which words must stay, because leaving them out changes the amount?", "“The third of the winter” can go. “More than” must stay."],
    es: ["Texto original: “La tormenta, la tercera del invierno, podría dejar más de treinta centímetros de nieve”.", "“La tormenta […] podría dejar más de treinta centímetros de nieve”.", [["“La tormenta […] podría dejar […] treinta centímetros de nieve”.", "changed-meaning"], ["“La tormenta… podría dejar más de treinta centímetros de nieve”.", "ellipsis-without-brackets"]], "¿Qué palabras deben quedarse, porque quitarlas cambia la cantidad?", "“La tercera del invierno” se puede quitar. “Más de” debe quedarse."],
  },
];

const ELLIPSIS_DASH = skill(
  { id: "e.ellipsis.dash", grade: "8", title: { en: "Ellipses and dashes", es: "Puntos suspensivos y raya" }, standard: "L.8.2", prereqs: ["e.nonrestrictive"] },
  [
    {
      bank: PAUSES,
      ask: { en: "Which sentence uses punctuation to show this?", es: "¿Qué opción usa la puntuación correcta para lograrlo?" },
      hints: {
        en: ["What kind of pause does the sentence need: slow and unsure, or sudden and sharp?", "An ellipsis (…) shows hesitation or a voice trailing off. A dash (—) shows a sudden break, a change of thought, or an interruption. A comma is only a brief, ordinary pause."],
        es: ["¿Qué hace falta: una pausa de duda, una interrupción, suspenso o marcar quién habla en un diálogo?", "Los puntos suspensivos (…) muestran duda, suspenso o una interrupción; van pegados a la palabra anterior y no llevan otro punto. La raya (—) abre cada intervención del diálogo y las palabras del narrador."],
      },
      seconds: 20,
    },
    {
      bank: OMISSIONS,
      ask: { en: "Which shortened quotation shows the omission correctly?", es: "¿Qué cita abreviada marca bien la parte omitida?" },
      hints: {
        en: ["Compare each choice with the original. What was left out?", "When you leave words out of a quotation, put an ellipsis where they were. Never leave out words that change or lose the main point."],
        es: ["Compara cada opción con el texto original. ¿Qué se quitó?", "Cuando quitas palabras de una cita, marca el lugar con puntos suspensivos entre corchetes: […]. Nunca quites palabras que cambien o borren la idea principal."],
      },
      seconds: 30,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.verb.shifts — revise a sentence that switches voice or mood for no reason (Spanish: correlación de
// tiempos y modos, "si tuviera… te ayudaría", and active-to-passive switches).

const VERB_SHIFTS: Bi<Entry>[] = [
  {
    en: ["First, mix the flour and sugar, and then the eggs should be added.", "First, mix the flour and sugar, and then add the eggs.", [["First, mix the flour and sugar, and then the eggs are added.", "still-shifts"], ["First, add the eggs, and then mix the flour and sugar.", "changed-meaning"]], "The sentence starts as a command, then switches to “should be added.”", "Keep both verbs as commands: “mix” and “add.”"],
    es: ["Si tuviera tiempo, te ayudo con la tarea.", "Si tuviera tiempo, te ayudaría con la tarea.", [["Si tuviera tiempo, te ayudaré con la tarea.", "still-shifts"], ["Tuve tiempo y te ayudé con la tarea.", "changed-meaning"]], "La primera parte imagina algo; la segunda suena a un hecho real.", "A una condición imaginada le corresponde un resultado en condicional: “te ayudaría”."],
  },
  {
    en: ["Maya wrote the speech, and it was delivered by her at the assembly.", "Maya wrote the speech, and she delivered it at the assembly.", [["Maya wrote the speech, and it was given by her at the assembly.", "still-shifts"], ["Someone else delivered Maya's speech at the assembly.", "changed-meaning"]], "The first part is active; the second switches to passive.", "Keep both parts active: Maya does both actions."],
    es: ["Primero lavamos los platos y después fueron secados por nosotros.", "Primero lavamos los platos y después los secamos.", [["Primero lavamos los platos y después se secaron.", "still-shifts"], ["Primero secamos los platos y nunca los lavamos.", "changed-meaning"]], "La primera parte está en voz activa; la segunda cambia a pasiva.", "Mantén la voz activa en las dos partes: “lavamos” y “secamos”."],
  },
  {
    en: ["If I were the coach, I will give everyone a turn.", "If I were the coach, I would give everyone a turn.", [["If I were the coach, I am giving everyone a turn.", "still-shifts"], ["I was the coach, and I gave everyone a turn.", "changed-meaning"]], "The first part imagines something; the second sounds like a real plan.", "An imagined condition takes an imagined result: “would give.”"],
    es: ["Mezcla la harina con el azúcar y luego los huevos deben ser agregados.", "Mezcla la harina con el azúcar y luego agrega los huevos.", [["Mezcla la harina con el azúcar y luego se agregan los huevos.", "still-shifts"], ["Agrega los huevos y no mezcles la harina.", "changed-meaning"]], "La oración empieza con una orden y luego cambia a “deben ser agregados”.", "Mantén las dos partes como órdenes: “mezcla” y “agrega”."],
  },
  {
    en: ["The students cleaned the park, and the trash was carried to the bins.", "The students cleaned the park and carried the trash to the bins.", [["The students cleaned the park, and the bins were filled with trash.", "still-shifts"], ["The students left the trash in the park.", "changed-meaning"]], "The students do both actions, but the second part hides them in the passive voice.", "Keep both verbs active, with the students as the doers."],
    es: ["Si Ana estudiara más, aprobará el examen.", "Si Ana estudiara más, aprobaría el examen.", [["Si Ana estudiara más, aprueba el examen.", "still-shifts"], ["Ana estudió más y aprobó el examen.", "changed-meaning"]], "La primera parte imagina algo; la segunda suena a un hecho seguro.", "A una condición imaginada le corresponde un resultado en condicional."],
  },
  {
    en: ["Please turn off your phones, and you should also stay seated.", "Please turn off your phones and stay seated.", [["Please turn off your phones, and you need to stay seated.", "still-shifts"], ["Please stay seated, but you may keep your phones on.", "changed-meaning"]], "The sentence starts with a command, then switches to a statement.", "Keep both as commands: “turn off” and “stay.”"],
    es: ["Maya escribió el discurso y fue leído por ella en la asamblea.", "Maya escribió el discurso y lo leyó en la asamblea.", [["Maya escribió el discurso y se leyó en la asamblea.", "still-shifts"], ["Otra persona leyó el discurso de Maya.", "changed-meaning"]], "La primera parte está en voz activa; la segunda cambia a pasiva.", "Mantén la voz activa: Maya hace las dos acciones."],
  },
  {
    en: ["If Ana studied more, she will pass the test.", "If Ana studied more, she would pass the test.", [["If Ana studied more, she passes the test.", "still-shifts"], ["Ana studied more and passed the test.", "changed-meaning"]], "The first part imagines something; the second sounds certain.", "An imagined condition takes an imagined result: “would pass.”"],
    es: ["Me pidió que la ayudo con el proyecto.", "Me pidió que la ayudara con el proyecto.", [["Me pidió que la ayudaré con el proyecto.", "still-shifts"], ["Yo le pedí que me ayudara con el proyecto.", "changed-meaning"]], "“Pidió” está en pasado, y lo que se pide todavía no es un hecho.", "Después de “pidió que” va el pretérito de subjuntivo: “ayudara”."],
  },
  {
    en: ["We planted the seeds in April, and the garden was watered every day.", "We planted the seeds in April and watered the garden every day.", [["We planted the seeds in April, and the garden got watered every day.", "still-shifts"], ["We watered the garden but never planted seeds.", "changed-meaning"]], "We do both actions, but the second part switches to the passive voice.", "Keep both verbs active: “planted” and “watered.”"],
    es: ["Si hiciera sol, podemos ir a la playa.", "Si hiciera sol, podríamos ir a la playa.", [["Si hiciera sol, podremos ir a la playa.", "still-shifts"], ["Hace sol, así que fuimos a la playa.", "changed-meaning"]], "La primera parte imagina algo; la segunda suena a un hecho.", "A una condición imaginada le corresponde un resultado en condicional: “podríamos”."],
  },
  {
    en: ["Read the directions carefully, and then you will answer the questions.", "Read the directions carefully, and then answer the questions.", [["Read the directions carefully, and then the questions are answered.", "still-shifts"], ["Answer the questions without reading the directions.", "changed-meaning"]], "The sentence starts with a command, then switches to a prediction.", "Keep both as commands: “read” and “answer.”"],
    es: ["Lee las instrucciones con cuidado y luego las preguntas deben ser contestadas.", "Lee las instrucciones con cuidado y luego contesta las preguntas.", [["Lee las instrucciones con cuidado y luego se contestan las preguntas.", "still-shifts"], ["Contesta las preguntas sin leer las instrucciones.", "changed-meaning"]], "La oración empieza con una orden y luego cambia a pasiva.", "Mantén las dos partes como órdenes: “lee” y “contesta”."],
  },
  {
    en: ["The chef tasted the soup, and more salt was added by him.", "The chef tasted the soup and added more salt.", [["The chef tasted the soup, and salt was added.", "still-shifts"], ["The chef refused to taste the soup.", "changed-meaning"]], "The chef does both actions, but the second part switches to the passive voice.", "Keep both verbs active: “tasted” and “added.”"],
    es: ["El cocinero probó la sopa y fue agregada más sal por él.", "El cocinero probó la sopa y le agregó más sal.", [["El cocinero probó la sopa y se le agregó más sal.", "still-shifts"], ["El cocinero no quiso probar la sopa.", "changed-meaning"]], "El cocinero hace las dos acciones, pero la segunda parte cambia a pasiva.", "Mantén la voz activa: “probó” y “agregó”."],
  },
  {
    en: ["If it were sunny, we can go to the beach.", "If it were sunny, we could go to the beach.", [["If it were sunny, we are going to the beach.", "still-shifts"], ["It is sunny, so we went to the beach.", "changed-meaning"]], "The first part imagines something; the second sounds like a fact.", "An imagined condition takes an imagined result: “could go.”"],
    es: ["La maestra quería que todos llegan temprano.", "La maestra quería que todos llegaran temprano.", [["La maestra quería que todos llegarán temprano.", "still-shifts"], ["La maestra llegó temprano.", "changed-meaning"]], "Lo que la maestra quería todavía no era un hecho.", "Con “quería que” va el pretérito de subjuntivo: “llegaran”."],
  },
  {
    en: ["Kai painted the fence, and then the gate was fixed by him.", "Kai painted the fence and then fixed the gate.", [["Kai painted the fence, and then the gate got fixed.", "still-shifts"], ["Kai fixed the fence but painted nothing.", "changed-meaning"]], "Kai does both actions, but the second part switches to the passive voice.", "Keep both verbs active: “painted” and “fixed.”"],
    es: ["Kai pintó la cerca y luego la puerta fue arreglada por él.", "Kai pintó la cerca y luego arregló la puerta.", [["Kai pintó la cerca y luego se arregló la puerta.", "still-shifts"], ["Kai arregló la cerca y no pintó nada.", "changed-meaning"]], "Kai hace las dos acciones, pero la segunda parte cambia a pasiva.", "Mantén la voz activa: “pintó” y “arregló”."],
  },
  {
    en: ["Close the windows, and the lights should be turned off too.", "Close the windows, and turn off the lights too.", [["Close the windows, and the lights are turned off too.", "still-shifts"], ["Open the windows, and leave the lights on.", "changed-meaning"]], "The sentence starts with a command, then switches to the passive voice.", "Keep both as commands: “close” and “turn off.”"],
    es: ["Cierra las ventanas y las luces deben ser apagadas también.", "Cierra las ventanas y apaga también las luces.", [["Cierra las ventanas y se apagan también las luces.", "still-shifts"], ["Abre las ventanas y deja las luces encendidas.", "changed-meaning"]], "La oración empieza con una orden y luego cambia a pasiva.", "Mantén las dos partes como órdenes: “cierra” y “apaga”."],
  },
  {
    en: ["If we left now, we will catch the early train.", "If we left now, we would catch the early train.", [["If we left now, we catch the early train.", "still-shifts"], ["We left early and missed the train.", "changed-meaning"]], "The first part imagines something; the second sounds certain.", "An imagined condition takes an imagined result: “would catch.”"],
    es: ["Si saliéramos ahora, alcanzamos el primer tren.", "Si saliéramos ahora, alcanzaríamos el primer tren.", [["Si saliéramos ahora, alcanzaremos el primer tren.", "still-shifts"], ["Salimos temprano y perdimos el tren.", "changed-meaning"]], "La primera parte imagina algo; la segunda suena a un hecho.", "A una condición imaginada le corresponde un resultado en condicional: “alcanzaríamos”."],
  },
  {
    en: ["The team practiced all week, and the trophy was won by them on Saturday.", "The team practiced all week and won the trophy on Saturday.", [["The team practiced all week, and the trophy was taken home on Saturday.", "still-shifts"], ["The team practiced all week but lost on Saturday.", "changed-meaning"]], "The team does both actions, but the second part switches to the passive voice.", "Keep both verbs active: “practiced” and “won.”"],
    es: ["El equipo entrenó toda la semana y el trofeo fue ganado por él el sábado.", "El equipo entrenó toda la semana y ganó el trofeo el sábado.", [["El equipo entrenó toda la semana y el trofeo se ganó el sábado.", "still-shifts"], ["El equipo entrenó toda la semana, pero perdió el sábado.", "changed-meaning"]], "El equipo hace las dos acciones, pero la segunda parte cambia a pasiva.", "Mantén la voz activa: “entrenó” y “ganó”."],
  },
];

const VERB_SHIFT = skill(
  { id: "e.verb.shifts", grade: "8", title: { en: "Shifts in voice and mood", es: "Cambios de voz y de modo" }, standard: "L.8.1d", prereqs: ["e.active.passive", "e.verb.moods"] },
  [
    {
      bank: VERB_SHIFTS,
      ask: { en: "Which revision keeps the verbs consistent?", es: "¿Qué versión mantiene los verbos coherentes?" },
      hints: {
        en: ["Look at each verb. Does the sentence switch from active to passive, or from a command or a real statement to something else?", "Keep the same voice and mood all the way through unless the meaning truly changes. An imagined condition (“If I were…”) takes an imagined result (“I would…”)."],
        es: ["Mira cada verbo. ¿La oración pasa de voz activa a pasiva, o de un modo o tiempo a otro sin razón?", "Mantén la misma voz y el mismo modo en toda la oración. Si la condición es imaginada (si tuviera…), el resultado va en condicional (ayudaría). Después de un verbo en pasado como “pidió que”, va el pretérito de subjuntivo."],
      },
      seconds: 30,
    },
  ],
);

export { ELLIPSIS_DASH, VERB_SHIFT };
