import { type Passage, q } from "./types";

// Level 2 paired texts: two views of one question, or a first-hand account beside an explanation.
export const L2_PAIRED: Passage[] = [
  {
    id: "clock-debate",
    level: 2,
    genre: "paired",
    en: [
      {
        title: "End the Switch: Choose Standard Time",
        paras: [
          "Twice a year, most Americans change their clocks, and every spring we lose an hour of sleep. Nearly everyone agrees the switching should stop. The real question is which time to keep, and the answer should be standard time, the time we use in winter.",
          "Our bodies run on an internal clock that is set mainly by morning light. Standard time lines up the clock on the wall more closely with the sun, so mornings are brighter. The American Academy of Sleep Medicine, a group of doctors and scientists who study sleep, has called for permanent standard time for this reason.",
          "Permanent daylight saving time would mean dark winter mornings. In parts of the northern United States, the sun would not rise until after 8:30 or even 9:00 in December, and many students would wait for the bus in the dark.",
          "Bright evenings are pleasant, but our health should come first. Let's stop changing the clocks and keep standard time all year.",
        ],
      },
      {
        title: "Keep the Light: Choose Daylight Saving Time",
        paras: [
          "Ask people what they love about summer, and many will mention long, bright evenings: soccer practice that ends in daylight, dinner on the porch, a walk after homework. Permanent daylight saving time would keep that extra hour of evening light all year.",
          "Supporters point out that evening light gets used. People shop, play sports, and run errands after work and school, not at dawn. In 2022, the U.S. Senate passed a bill to make daylight saving time permanent, though it did not become law.",
          "Critics worry about dark winter mornings, and that is a fair concern. But schools could start later in winter, which many sleep experts favor for teenagers anyway. Darkness at 4:30 in the afternoon, which many northern cities now face in December, is hardly better for anyone's mood.",
          "Stop switching, yes. But choose the light we can actually use.",
        ],
      },
    ],
    es: [
      {
        title: "Basta de cambios: elijamos el horario estándar",
        paras: [
          "Dos veces al año, la mayoría de los estadounidenses cambia la hora del reloj, y cada primavera perdemos una hora de sueño. Casi todo el mundo está de acuerdo en que hay que dejar de cambiarla. La verdadera pregunta es qué horario conservar, y la respuesta debería ser el horario estándar, el que usamos en invierno.",
          "Nuestro cuerpo funciona con un reloj interno que se ajusta sobre todo con la luz de la mañana. El horario estándar alinea mejor el reloj de la pared con el sol, así que las mañanas son más luminosas. La Academia Estadounidense de Medicina del Sueño, un grupo de médicos y científicos que estudian el sueño, ha pedido el horario estándar permanente por esta razón.",
          "El horario de verano permanente significaría mañanas oscuras en invierno. En partes del norte de Estados Unidos, el sol no saldría sino hasta después de las 8:30 o incluso de las 9:00 en diciembre, y muchos estudiantes esperarían el autobús a oscuras.",
          "Las tardes con luz son agradables, pero nuestra salud debe ir primero. Dejemos de cambiar la hora y quedémonos con el horario estándar todo el año.",
        ],
      },
      {
        title: "Que se quede la luz: elijamos el horario de verano",
        paras: [
          "Si le preguntas a la gente qué le encanta del verano, muchos hablarán de las tardes largas y luminosas: el entrenamiento de fútbol que termina con luz, la cena en el porche, una caminata después de la tarea. El horario de verano permanente conservaría esa hora extra de luz en la tarde todo el año.",
          "Quienes lo apoyan señalan que la luz de la tarde sí se aprovecha. La gente compra, hace deporte y hace mandados después del trabajo y de la escuela, no al amanecer. En 2022, el Senado de Estados Unidos aprobó un proyecto para que el horario de verano fuera permanente, aunque no llegó a ser ley.",
          "A los críticos les preocupan las mañanas oscuras en invierno, y es una preocupación justa. Pero las escuelas podrían empezar más tarde en invierno, algo que muchos expertos en sueño recomiendan de todos modos para los adolescentes. Que oscurezca a las 4:30 de la tarde, como pasa ahora en diciembre en muchas ciudades del norte, no le hace ningún bien al ánimo de nadie.",
          "Dejar de cambiar la hora, sí. Pero elijamos la luz que de verdad usamos.",
        ],
      },
    ],
    qs: [
      q(
        "compare.differ",
        ["swaps-texts", "contradicts-text", "not-in-text"],
        [
          "On what main point do the two writers disagree?",
          "Which time to keep all year: Text 1 wants standard time, and Text 2 wants daylight saving time.",
          ["Which time to keep: Text 1 wants daylight saving time, and Text 2, standard time.", "Whether to stop changing the clocks at all: Text 1 wants to keep switching, and Text 2 wants to stop.", "Whether sleep matters at all: Text 1 says it matters a great deal, and Text 2 says it does not matter."],
          ["the answer should be standard time", "Permanent daylight saving time would keep that extra hour of evening light all year."],
          "Both writers want the switching to end. Text 1 chooses standard time for brighter mornings, and Text 2 chooses daylight saving time for brighter evenings.",
        ],
        [
          "¿En qué punto principal no están de acuerdo los dos autores?",
          "En qué horario conservar todo el año: el texto 1 quiere el estándar, y el texto 2, el de verano.",
          ["En qué horario conservar: el texto 1 quiere el de verano, y el texto 2, el estándar.", "En si hay que dejar de cambiar la hora: el texto 1 quiere seguir cambiándola, y el texto 2, dejar de hacerlo.", "En si el sueño importa: el texto 1 dice que importa muchísimo, y el texto 2 dice que no importa nada."],
          ["la respuesta debería ser el horario estándar", "El horario de verano permanente conservaría esa hora extra de luz en la tarde todo el año."],
          "Los dos autores quieren dejar de cambiar la hora. El texto 1 elige el horario estándar por las mañanas con más luz, y el texto 2 elige el de verano por las tardes con más luz.",
        ],
      ),
      q(
        "compare.agree",
        ["one-text-only", "one-text-only", "same-not-different"],
        [
          "On which point do both writers agree?",
          "The country should stop changing the clocks twice a year.",
          ["Schools should start later in the winter.", "A group of sleep doctors favors keeping standard time all year long.", "Evening light matters more than morning light."],
          ["Nearly everyone agrees the switching should stop.", "Stop switching, yes."],
          "Text 1 says the switching should stop, and Text 2 opens its last paragraph with “Stop switching, yes.” They disagree only about which time to keep.",
        ],
        [
          "¿En qué punto coinciden los dos autores?",
          "El país debería dejar de cambiar la hora dos veces al año.",
          ["Las escuelas deberían empezar más tarde en invierno.", "Los médicos del sueño prefieren el horario estándar permanente.", "La luz de la tarde importa más que la de la mañana."],
          ["Casi todo el mundo está de acuerdo en que hay que dejar de cambiarla.", "Dejar de cambiar la hora, sí."],
          "El texto 1 dice que hay que dejar de cambiar la hora, y el texto 2 empieza su último párrafo con “Dejar de cambiar la hora, sí”. Solo difieren en qué horario conservar.",
        ],
      ),
      q(
        "compare.approach",
        ["one-text-only", "not-in-text", "contradicts-text"],
        [
          "How do the writers support their positions differently?",
          "Text 1 relies on health and expert advice; Text 2 relies on how people use their evenings.",
          ["Both writers rely mainly on the Senate vote from 2022.", "Both writers rely only on personal stories about their own families.", "Text 1 relies on health research, and Text 2 offers no reasons at all."],
          ["The American Academy of Sleep Medicine", "People shop, play sports, and run errands after work and school"],
          "Text 1 builds its case on the body's clock and a group of sleep doctors. Text 2 builds its case on what people do with evening light, plus the Senate vote.",
        ],
        [
          "¿En qué se diferencia la manera en que cada autor apoya su postura?",
          "El texto 1 se basa en la salud y en la opinión de expertos; el texto 2, en cómo usa la gente sus tardes.",
          ["Los dos se basan sobre todo en la votación del Senado de 2022.", "Los dos se basan solo en historias personales sobre sus propias familias.", "El texto 1 se basa en estudios de salud, y el texto 2 no da ninguna razón."],
          ["La Academia Estadounidense de Medicina del Sueño", "La gente compra, hace deporte y hace mandados después del trabajo y de la escuela"],
          "El texto 1 arma su postura con el reloj del cuerpo y un grupo de médicos del sueño. El texto 2 la arma con lo que la gente hace con la luz de la tarde, más la votación del Senado.",
        ],
      ),
      q(
        "pov.response",
        ["misses-author-stance", "contradicts-text", "contradicts-text"],
        [
          "How does the author of Text 2 respond to the worry about dark winter mornings?",
          "The author calls it fair, suggests later winter start times, and points to dark afternoons under standard time.",
          ["The author agrees that dark mornings are too dangerous and switches to supporting permanent standard time for the whole country instead.", "The author says winter mornings would not be dark at all under permanent daylight saving time, even in the north.", "The author ignores the worry and moves on."],
          ["Critics worry about dark winter mornings, and that is a fair concern."],
          "The author grants the concern, offers a fix, and then turns it around: standard time brings its own darkness, at 4:30 in the afternoon.",
        ],
        [
          "¿Cómo responde el autor del texto 2 a la preocupación por las mañanas oscuras en invierno?",
          "La considera justa, propone que las escuelas empiecen más tarde en invierno y señala las tardes oscuras del horario estándar.",
          ["Le da la razón a los críticos, dice que las mañanas oscuras son demasiado peligrosas y pasa a apoyar el horario estándar para todo el país.", "Dice que con el horario de verano permanente las mañanas de invierno no serían oscuras en absoluto, ni siquiera en el norte del país.", "Ignora la preocupación y pasa a otro tema."],
          ["A los críticos les preocupan las mañanas oscuras en invierno, y es una preocupación justa."],
          "El autor acepta la preocupación, ofrece una solución y luego le da la vuelta: el horario estándar trae su propia oscuridad, a las 4:30 de la tarde.",
        ],
      ),
      q(
        "argument.evidence",
        ["off-point-evidence", "opinion-as-evidence", "off-point-evidence"],
        [
          "Which detail gives the strongest support for the position in Text 1?",
          "A group of sleep doctors and scientists has called for permanent standard time.",
          ["Most Americans lose an hour of sleep every spring.", "Bright evenings are pleasant.", "The Senate passed a bill in 2022."],
          ["has called for permanent standard time for this reason"],
          "Text 1 argues for standard time in particular. Experts who study sleep recommending exactly that is the strongest support. Losing an hour each spring argues only for ending the switch, and the Senate vote supports the other side.",
        ],
        [
          "¿Qué detalle apoya con más fuerza la postura del texto 1?",
          "Un grupo de médicos y científicos del sueño ha pedido el horario estándar permanente.",
          ["La mayoría de los estadounidenses pierde una hora de sueño cada primavera.", "Las tardes con luz son agradables.", "El Senado aprobó un proyecto en 2022."],
          ["ha pedido el horario estándar permanente por esta razón"],
          "El texto 1 defiende el horario estándar en particular. Que expertos en sueño recomienden justo eso es el apoyo más fuerte. Perder una hora cada primavera solo apoya dejar de cambiar la hora, y la votación del Senado apoya la otra postura.",
        ],
      ),
    ],
  },
  {
    id: "wall-opens",
    level: 2,
    genre: "paired",
    note: {
      en: "Text 1 is an imagined diary entry, written for this practice. The writer is invented; the events of that night are real.",
      es: "El texto 1 es una entrada de diario imaginada, escrita para esta práctica. Quien escribe es una persona inventada; los hechos de esa noche son reales.",
    },
    en: [
      {
        title: "From a Diary, East Berlin, November 10, 1989",
        paras: [
          "Last night at dinner, the man on the television said something none of us understood at first. People in East Germany could travel to the West. When? someone asked him. Immediately, he said, and shuffled his papers. Papa put down his fork and said it must be a mistake.",
          "By ten o'clock, half our building was walking toward the crossing at Bornholmer Strasse. The crowd was so thick that I held Mama's coat so I would not lose her. People were chanting, “Open the gate.” The guards looked as confused as we were.",
          "Then, a little before midnight, the gate opened. Nobody pushed. We just walked, slowly, as if the ground might change its mind. On the other side, strangers were cheering and crying. A woman I had never seen handed me a banana and kissed my cheek.",
          "I am fifteen, and the Wall has been there my whole life and longer. This morning I keep touching the stamp in my identity card to make sure last night happened.",
        ],
      },
      {
        title: "The Night the Wall Opened",
        paras: [
          "In August 1961, East Germany's government built a wall through the middle of Berlin to stop its citizens from leaving for the West. For twenty-eight years, the Berlin Wall divided families, streets, and even cemeteries.",
          "By the fall of 1989, East Germany was under heavy pressure. Thousands of its citizens had fled through other countries, and huge peaceful protests filled its streets. On the evening of November 9, a government spokesman announced new travel rules at a press conference. Asked when they took effect, he looked through his notes and said, in effect, immediately. The rules were actually meant to start the next day.",
          "Thousands of East Berliners rushed to the border crossings. The guards had received no orders. At Bornholmer Strasse, facing a growing crowd, the officer in charge opened the gate at about 11:30 p.m. Other crossings soon followed.",
          "Within days, people were chipping pieces off the Wall. Less than a year later, on October 3, 1990, East and West Germany were reunited.",
        ],
      },
    ],
    es: [
      {
        title: "De un diario, Berlín Oriental, 10 de noviembre de 1989",
        paras: [
          "Anoche, durante la cena, el señor de la televisión dijo algo que al principio ninguno entendió. La gente de Alemania Oriental podía viajar al Oeste. ¿Desde cuándo?, le preguntó alguien. Desde ya, dijo, y revolvió sus papeles. Papá dejó el tenedor y dijo que tenía que ser un error.",
          "Para las diez, medio edificio caminaba hacia el cruce de Bornholmer Strasse. La multitud era tan densa que me agarré del abrigo de mamá para no perderla. La gente gritaba: “Abran la puerta”. Los guardias se veían tan confundidos como nosotros.",
          "Entonces, un poco antes de la medianoche, se abrió la puerta. Nadie empujó. Solo caminamos, despacio, como si el suelo pudiera arrepentirse. Del otro lado, unos desconocidos aplaudían y lloraban. Una mujer que yo nunca había visto me dio un plátano y me besó la mejilla.",
          "Tengo quince años, y el Muro ha estado ahí toda mi vida y desde antes. Esta mañana no dejo de tocar el sello en mi documento de identidad para asegurarme de que lo de anoche pasó.",
        ],
      },
      {
        title: "La noche en que se abrió el Muro",
        paras: [
          "En agosto de 1961, el gobierno de Alemania Oriental construyó un muro por el centro de Berlín para impedir que sus ciudadanos se fueran al Oeste. Durante veintiocho años, el Muro de Berlín dividió familias, calles y hasta cementerios.",
          "Para el otoño de 1989, Alemania Oriental estaba bajo mucha presión. Miles de sus ciudadanos habían huido a través de otros países, y enormes protestas pacíficas llenaban sus calles. La noche del 9 de noviembre, un vocero del gobierno anunció nuevas reglas de viaje en una conferencia de prensa. Cuando le preguntaron desde cuándo valían, revisó sus notas y dijo, en pocas palabras, que de inmediato. En realidad, las reglas debían empezar al día siguiente.",
          "Miles de habitantes de Berlín Oriental corrieron a los cruces de la frontera. Los guardias no habían recibido órdenes. En Bornholmer Strasse, frente a una multitud cada vez más grande, el oficial a cargo abrió la puerta hacia las 11:30 de la noche. Pronto otros cruces hicieron lo mismo.",
          "En cuestión de días, la gente le estaba arrancando pedazos al Muro. Menos de un año después, el 3 de octubre de 1990, Alemania Oriental y Alemania Occidental se reunificaron.",
        ],
      },
    ],
    qs: [
      q(
        "compare.differ",
        ["not-in-text", "not-in-text", "contradicts-text"],
        [
          "How does Text 1's account of the night differ from Text 2's?",
          "Text 1 shows what one family saw and felt; Text 2 explains how and why the border opened.",
          ["Text 1 shows one family's feelings; Text 2 shows the border guards' feelings.", "Both texts mainly describe the day the Wall was built in 1961.", "Text 1 says the gate stayed closed, while Text 2 says it opened."],
          ["I held Mama's coat so I would not lose her", "The guards had received no orders."],
          "The diary is full of personal moments: a dropped fork, a mother's coat, a banana from a stranger. The article explains the background, the mistaken announcement, and what followed.",
        ],
        [
          "¿En qué se diferencia el relato de esa noche en el texto 1 del relato del texto 2?",
          "El texto 1 muestra lo que una familia vio y sintió; el texto 2 explica cómo y por qué se abrió la frontera.",
          ["El texto 1 muestra lo que sintió una familia; el texto 2, lo que sintieron los guardias.", "Los dos textos describen sobre todo el día en que se construyó el Muro en 1961.", "El texto 1 dice que la puerta siguió cerrada, mientras que el texto 2 dice que se abrió."],
          ["me agarré del abrigo de mamá para no perderla", "Los guardias no habían recibido órdenes."],
          "El diario está lleno de momentos personales: un tenedor que cae, el abrigo de una madre, un plátano que regala una desconocida. El artículo explica los antecedentes, el anuncio equivocado y lo que vino después.",
        ],
      ),
      q(
        "compare.agree",
        ["one-text-only", "one-text-only", "contradicts-text"],
        [
          "Which fact do both texts agree on?",
          "The gate at Bornholmer Strasse opened shortly before midnight.",
          ["A stranger handed the writer a banana.", "The travel rules were meant to start the next day, not that same night.", "The guards were ordered to open the gate early in the evening, before the crowd came."],
          ["Then, a little before midnight, the gate opened.", "the officer in charge opened the gate at about 11:30 p.m."],
          "The diary says the gate opened “a little before midnight,” and the article gives about 11:30 p.m. The banana appears only in the diary, and the mistake about the date appears only in the article.",
        ],
        [
          "¿En qué dato coinciden los dos textos?",
          "La puerta de Bornholmer Strasse se abrió poco antes de la medianoche.",
          ["Una desconocida le dio un plátano a quien escribe.", "Las reglas de viaje debían empezar al día siguiente, no esa misma noche.", "A los guardias les ordenaron abrir la puerta temprano en la noche, antes de que llegara la gente."],
          ["Entonces, un poco antes de la medianoche, se abrió la puerta.", "el oficial a cargo abrió la puerta hacia las 11:30 de la noche"],
          "El diario dice que la puerta se abrió “un poco antes de la medianoche”, y el artículo dice que hacia las 11:30. El plátano aparece solo en el diario, y el error con la fecha, solo en el artículo.",
        ],
      ),
      q(
        "compare.approach",
        ["swaps-texts", "not-in-text", "not-in-text"],
        [
          "How does the diary's way of describing the announcement differ from the article's?",
          "The diary shows the family's confusion at dinner; the article explains that the spokesman got the start date wrong.",
          ["The diary explains the spokesman's mistake; the article shows the family at dinner.", "Both texts quote the spokesman's exact words in full.", "The diary says the announcement had been planned for midnight."],
          ["Papa put down his fork and said it must be a mistake.", "The rules were actually meant to start the next day."],
          "The diary reports only what the family saw and felt. The article steps back to explain what really happened at the press conference.",
        ],
        [
          "¿En qué se diferencia la manera de contar el anuncio en el diario y en el artículo?",
          "El diario muestra la confusión de la familia en la cena; el artículo explica que el vocero se equivocó con la fecha de inicio.",
          ["El diario explica el error del vocero; el artículo muestra a la familia en la cena.", "Los dos textos citan completas las palabras exactas del vocero.", "El diario dice que el anuncio estaba planeado para la medianoche."],
          ["Papá dejó el tenedor y dijo que tenía que ser un error.", "En realidad, las reglas debían empezar al día siguiente."],
          "El diario cuenta solo lo que la familia vio y sintió. El artículo se aleja un poco para explicar lo que de verdad pasó en la conferencia de prensa.",
        ],
      ),
      q(
        "pov.view",
        ["contradicts-text", "contradicts-text", "misses-author-stance"],
        [
          "What is the diary writer's attitude toward the events of that night?",
          "Amazed and joyful, but still half afraid it was not real.",
          ["Angry that the crowd pushed and shoved at the gate.", "Bored, because the writer had expected the Wall to open for years.", "Certain from the very start that the announcement on television was true."],
          ["to make sure last night happened"],
          "The writer describes cheering, crying, and a stranger's kiss, and the next morning keeps touching the stamp to be sure it was real. That shows wonder mixed with disbelief.",
        ],
        [
          "¿Qué actitud tiene quien escribe el diario ante lo que pasó esa noche?",
          "Asombro y alegría, aunque con algo de miedo de que no fuera real.",
          ["Enojo porque la multitud empujaba en la puerta.", "Aburrimiento, porque quien escribe esperaba que el Muro se abriera desde hacía años.", "Seguridad desde el principio de que el anuncio de la televisión era cierto."],
          ["para asegurarme de que lo de anoche pasó"],
          "Quien escribe cuenta aplausos, llanto y el beso de una desconocida, y a la mañana siguiente no deja de tocar el sello para asegurarse de que fue real. Eso muestra asombro mezclado con incredulidad.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "contradicts-text"],
        [
          "What is the central idea of Text 2?",
          "A confused announcement and huge crowds led to the sudden opening of the Berlin Wall.",
          ["The officer in charge at Bornholmer Strasse opened the gate at about 11:30 p.m. that night.", "Governments sometimes make mistakes.", "The Berlin Wall opened as part of a careful plan that the government had decided weeks earlier."],
          ["Asked when they took effect, he looked through his notes and said, in effect, immediately."],
          "The article explains the pressure on East Germany, the mistaken announcement, and the crowds that forced the gates open, ending with what came next.",
        ],
        [
          "¿Cuál es la idea central del texto 2?",
          "Un anuncio confuso y multitudes enormes llevaron a la apertura repentina del Muro de Berlín.",
          ["El oficial a cargo en Bornholmer Strasse abrió la puerta hacia las 11:30 de la noche del 9 de noviembre.", "Los gobiernos a veces se equivocan.", "El Muro de Berlín se abrió como parte de un plan cuidadoso que el gobierno había decidido semanas antes."],
          ["Cuando le preguntaron desde cuándo valían, revisó sus notas y dijo, en pocas palabras, que de inmediato."],
          "El artículo explica la presión sobre Alemania Oriental, el anuncio equivocado y las multitudes que hicieron abrir las puertas, y termina con lo que vino después.",
        ],
      ),
    ],
  },
  {
    id: "city-coyotes",
    level: 2,
    genre: "paired",
    en: [
      {
        title: "The Visitor",
        paras: [
          "Ana saw it on Tuesday, just before dawn, while she was taking out the recycling. At first she thought it was a neighbor's dog, loose again. Then it turned its head, and she saw the long, narrow snout, the yellow eyes, the gray-brown coat that seemed to soak up the streetlight.",
          "A coyote. In the middle of the city, between a bakery and a parking garage.",
          "Ana froze, the bin still in her hands. The coyote did not growl or run at her. It simply watched her for a long moment, calm and careful, the way she imagined a person might study a stranger on a train. Then it trotted down the alley and slipped through a gap in the fence, as if it had an appointment.",
          "All day at school, she could not stop thinking about it. Where did it sleep? What did it eat? How long had it been living here, three blocks from her apartment, without anyone noticing?",
        ],
      },
      {
        title: "Coyotes Move to Town",
        paras: [
          "A century ago, coyotes lived mainly in the open country of the western and central United States. Today they are found in every state except Hawaii, and many live in cities, including Chicago, Los Angeles, and New York.",
          "Coyotes have succeeded in cities for several reasons. They eat almost anything, from mice and rabbits to fruit. They can raise their pups in small patches of woods, in parks, or even in overgrown lots. And they have learned to avoid people. Researchers who track city coyotes have found that many become active mostly at night, when streets are quiet.",
          "Attacks on people are rare. Wildlife experts say the best way to keep coyotes wild and wary is never to feed them, to keep pet food indoors, and to keep small pets close. If a coyote comes too near, people should make themselves look big and make noise, which usually sends it running.",
          "Many scientists see city coyotes as a sign of how adaptable wild animals can be. Coyotes also help control the number of rats and mice.",
        ],
      },
    ],
    es: [
      {
        title: "La visita",
        paras: [
          "Ana lo vio el martes, justo antes del amanecer, mientras sacaba el reciclaje. Al principio pensó que era el perro de algún vecino, suelto otra vez. Luego volteó la cabeza, y ella vio el hocico largo y angosto, los ojos amarillos, el pelaje gris y café que parecía absorber la luz del farol.",
          "Un coyote. En medio de la ciudad, entre una panadería y un estacionamiento.",
          "Ana se quedó inmóvil, con el bote todavía en las manos. El coyote no gruñó ni corrió hacia ella. Solo la miró un largo rato, tranquilo y atento, como ella se imaginaba que una persona estudia a un desconocido en el tren. Luego trotó por el callejón y se metió por un hueco de la cerca, como si tuviera una cita.",
          "Todo el día en la escuela no pudo dejar de pensar en él. ¿Dónde dormía? ¿Qué comía? ¿Cuánto tiempo llevaba viviendo ahí, a tres cuadras de su apartamento, sin que nadie lo notara?",
        ],
      },
      {
        title: "Los coyotes se mudan a la ciudad",
        paras: [
          "Hace un siglo, los coyotes vivían sobre todo en el campo abierto del oeste y el centro de Estados Unidos. Hoy se encuentran en todos los estados menos Hawái, y muchos viven en ciudades como Chicago, Los Ángeles y Nueva York.",
          "A los coyotes les ha ido bien en las ciudades por varias razones. Comen casi de todo, desde ratones y conejos hasta fruta. Pueden criar a sus cachorros en pedacitos de bosque, en parques o incluso en terrenos llenos de hierba. Y han aprendido a evitar a la gente. Los investigadores que siguen a los coyotes de ciudad han encontrado que muchos se vuelven activos sobre todo de noche, cuando las calles están tranquilas.",
          "Los ataques a personas son raros. Los expertos en vida silvestre dicen que la mejor manera de que los coyotes sigan siendo salvajes y desconfiados es no darles nunca de comer, guardar adentro la comida de las mascotas y tener cerca a las mascotas pequeñas. Si un coyote se acerca demasiado, hay que hacerse ver grande y hacer ruido, lo que por lo general lo hace huir.",
          "Muchos científicos ven a los coyotes de ciudad como una muestra de lo mucho que pueden adaptarse los animales salvajes. Además, los coyotes ayudan a controlar la cantidad de ratas y ratones.",
        ],
      },
    ],
    qs: [
      q(
        "compare.differ",
        ["swaps-texts", "contradicts-text", "not-in-text"],
        [
          "How does Text 1 present the coyote differently from Text 2?",
          "Text 1 shows one surprising meeting through a girl's eyes; Text 2 gives facts about coyotes in many cities.",
          ["Text 1 gives facts about city coyotes; Text 2 shows one girl's surprising meeting.", "Both texts present coyotes as dangerous animals that often attack people and their pets in city neighborhoods.", "Text 1 describes a coyote attacking a neighbor's dog in the alley, while Text 2 says coyotes never leave the woods."],
          ["Ana froze, the bin still in her hands.", "many live in cities, including Chicago, Los Angeles, and New York"],
          "Text 1 stays with Ana and one coyote in one alley. Text 2 steps back to explain where coyotes live, how they survive in cities, and how people should act.",
        ],
        [
          "¿En qué se diferencia la manera de presentar al coyote en el texto 1 y en el texto 2?",
          "El texto 1 muestra un encuentro sorprendente desde los ojos de una niña; el texto 2 da datos sobre los coyotes en muchas ciudades.",
          ["El texto 1 da datos sobre los coyotes de ciudad; el texto 2 muestra el encuentro de una niña.", "Los dos textos presentan a los coyotes como animales peligrosos que atacan seguido a la gente y a sus mascotas en los vecindarios de la ciudad.", "El texto 1 describe a un coyote que ataca al perro de un vecino en el callejón, mientras que el texto 2 dice que los coyotes nunca salen del bosque."],
          ["Ana se quedó inmóvil, con el bote todavía en las manos.", "muchos viven en ciudades como Chicago, Los Ángeles y Nueva York"],
          "El texto 1 se queda con Ana y un solo coyote en un callejón. El texto 2 se aleja para explicar dónde viven los coyotes, cómo sobreviven en las ciudades y cómo debe actuar la gente.",
        ],
      ),
      q(
        "compare.agree",
        ["one-text-only", "contradicts-text", "one-text-only"],
        [
          "Which idea is supported by both texts?",
          "Coyotes can live in cities without people noticing them much.",
          ["Coyotes are found in every state except Hawaii.", "Coyotes often growl at people and chase them down city streets and alleys.", "Coyotes eat fruit as well as mice and rabbits."],
          ["without anyone noticing", "many become active mostly at night, when streets are quiet"],
          "Ana wonders how long the coyote lived nearby “without anyone noticing,” and the article explains that city coyotes avoid people and move mostly at night.",
        ],
        [
          "¿Qué idea apoyan los dos textos?",
          "Los coyotes pueden vivir en las ciudades sin que la gente los note mucho.",
          ["Los coyotes se encuentran en todos los estados menos Hawái.", "Los coyotes suelen gruñirle a la gente y perseguirla por las calles y los callejones.", "Los coyotes comen fruta además de ratones y conejos."],
          ["sin que nadie lo notara", "muchos se vuelven activos sobre todo de noche, cuando las calles están tranquilas"],
          "Ana se pregunta cuánto tiempo vivió el coyote cerca “sin que nadie lo notara”, y el artículo explica que los coyotes de ciudad evitan a la gente y se mueven sobre todo de noche.",
        ],
      ),
      q(
        "compare.approach",
        ["one-text-only", "not-in-text", "contradicts-text"],
        [
          "How do the writers help readers understand coyotes differently?",
          "Text 1 uses vivid details and questions; Text 2, research and advice.",
          ["Both texts help readers picture the coyote's yellow eyes and gray-brown coat in vivid detail.", "Both texts rely mainly on quotes from wildlife experts who study coyotes in cities.", "Text 1 warns readers to fear coyotes, and Text 2 says coyotes are harmless in every way."],
          ["the yellow eyes, the gray-brown coat", "Researchers who track city coyotes have found"],
          "Text 1 makes readers see and wonder: yellow eyes, a gray-brown coat, a string of questions. Text 2 informs: what researchers found and what people should do.",
        ],
        [
          "¿En qué se diferencia la manera en que cada texto ayuda a entender a los coyotes?",
          "El texto 1 usa detalles vivos y preguntas; el texto 2, investigaciones y consejos.",
          ["Los dos textos hacen ver al lector los ojos amarillos y el pelaje gris y café del coyote con detalles vivos.", "Los dos textos se basan sobre todo en citas de expertos en vida silvestre que estudian a los coyotes.", "El texto 1 advierte que hay que temerles a los coyotes, y el texto 2 dice que son inofensivos en todo."],
          ["los ojos amarillos, el pelaje gris y café", "Los investigadores que siguen a los coyotes de ciudad han encontrado"],
          "El texto 1 hace que el lector vea y se pregunte: ojos amarillos, pelaje gris y café, una serie de preguntas. El texto 2 informa: lo que encontraron los investigadores y lo que debe hacer la gente.",
        ],
      ),
      q(
        "pov.purpose",
        ["overstates-view", "contradicts-text", "wrong-purpose"],
        [
          "Why does the author of Text 2 include advice about never feeding coyotes?",
          "To show how people can help city coyotes stay wary.",
          ["To argue that all coyotes should be trapped and removed from cities as soon as they are spotted.", "To prove that coyotes attack people often in cities across the country.", "To explain what coyotes eat in the wild, from mice and rabbits to fruit."],
          ["the best way to keep coyotes wild and wary is never to feed them"],
          "Right after saying attacks are rare, the author explains how to keep it that way. The advice is about living alongside coyotes, not getting rid of them.",
        ],
        [
          "¿Por qué el autor del texto 2 incluye el consejo de no darles nunca de comer a los coyotes?",
          "Para mostrar cómo la gente puede ayudar a que los coyotes sigan desconfiados.",
          ["Para defender que se atrape y se saque de las ciudades a todos los coyotes en cuanto alguien los vea por las calles.", "Para probar que los coyotes atacan seguido a la gente en las ciudades de todo el país.", "Para explicar qué comen los coyotes en estado salvaje, desde ratones y conejos hasta fruta."],
          ["la mejor manera de que los coyotes sigan siendo salvajes y desconfiados es no darles nunca de comer"],
          "Justo después de decir que los ataques son raros, el autor explica cómo mantenerlo así. El consejo trata de convivir con los coyotes, no de deshacerse de ellos.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "contradicts-text"],
        [
          "What is the central idea of Text 2?",
          "Coyotes have adapted to cities, and people can live safely with them.",
          ["City coyotes are often active at night, when the streets are quiet and empty.", "Wild animals of many kinds live in many different places around the world.", "Coyotes are a growing danger that cities should fear, since they often attack people and pets."],
          ["Many scientists see city coyotes as a sign of how adaptable wild animals can be."],
          "The article explains how coyotes spread into cities, why they succeed there, and how people can share space with them safely.",
        ],
        [
          "¿Cuál es la idea central del texto 2?",
          "Los coyotes se adaptaron a las ciudades, y la gente puede convivir con ellos sin peligro.",
          ["Los coyotes de ciudad suelen estar activos de noche, cuando las calles están tranquilas y vacías.", "Animales salvajes de muchos tipos viven en lugares muy distintos, en todas partes del mundo.", "Los coyotes son un peligro creciente al que las ciudades deben temer, porque atacan seguido a las personas y a las mascotas."],
          ["Muchos científicos ven a los coyotes de ciudad como una muestra de lo mucho que pueden adaptarse los animales salvajes."],
          "El artículo explica cómo los coyotes llegaron a las ciudades, por qué les va bien ahí y cómo la gente puede compartir el espacio con ellos sin peligro.",
        ],
      ),
    ],
  },
  {
    id: "museum-return",
    level: 2,
    genre: "paired",
    en: [
      {
        title: "Send Them Home",
        paras: [
          "Many great museums in Europe and North America hold objects that left their homelands under unfair conditions: taken in wars, carried off by colonial armies, or sold by officials with no right to sell them. These objects should be returned to the places they came from.",
          "Take the Parthenon sculptures in the British Museum. They were removed from the Acropolis in Athens in the early 1800s, while Greece was ruled by the Ottoman Empire. Greece has asked for them back for decades, and in 2009 it opened the Acropolis Museum, with space waiting for them, within sight of the temple they once decorated.",
          "Returns are already happening. In 2022, Germany transferred ownership of more than a thousand Benin Bronzes, sculptures taken from the Kingdom of Benin by British soldiers in 1897, to Nigeria.",
          "Some say these treasures are safer in famous museums. But the Acropolis Museum shows that Greece can care for its own heritage. Anyone who still defends keeping them simply does not respect other cultures.",
        ],
      },
      {
        title: "Share Them Instead",
        paras: [
          "No one should defend keeping an object that was plainly stolen. When a museum learns that something in its collection was looted, it should return it, and many museums now do.",
          "But a rule that sends every object home would empty the world's great museums of what makes them valuable: the chance to see many cultures side by side, under one roof. A student in London can compare Greek, Egyptian, and Chinese art in a single afternoon.",
          "Some museums also cannot simply give objects away. The British Museum, for example, is barred by a 1963 law from giving away most of the objects in its collection.",
          "A better path is sharing. Museums can make long-term loans, return some pieces while keeping others, and work with the countries of origin on exhibitions. Sharing respects where an object came from without closing the doors that let the whole world see it.",
        ],
      },
    ],
    es: [
      {
        title: "Que vuelvan a casa",
        paras: [
          "Muchos grandes museos de Europa y Norteamérica guardan objetos que salieron de su tierra en condiciones injustas: tomados en guerras, llevados por ejércitos coloniales o vendidos por funcionarios que no tenían derecho a venderlos. Estos objetos deberían devolverse a los lugares de donde vinieron.",
          "Pensemos en las esculturas del Partenón que están en el Museo Británico. Las quitaron de la Acrópolis de Atenas a principios del siglo XIX, cuando Grecia estaba bajo el dominio del Imperio otomano. Grecia lleva décadas pidiendo que se las devuelvan, y en 2009 abrió el Museo de la Acrópolis, con un espacio que las espera, a la vista del templo que antes adornaban.",
          "Las devoluciones ya están ocurriendo. En 2022, Alemania le transfirió a Nigeria la propiedad de más de mil Bronces de Benín, esculturas que soldados británicos se llevaron del Reino de Benín en 1897.",
          "Algunos dicen que estos tesoros están más seguros en museos famosos. Pero el Museo de la Acrópolis demuestra que Grecia puede cuidar su patrimonio. Cualquiera que todavía defienda quedárselos simplemente no respeta otras culturas.",
        ],
      },
      {
        title: "Mejor compartirlos",
        paras: [
          "Nadie debería defender que se quede un objeto que claramente fue robado. Cuando un museo descubre que algo de su colección fue saqueado, debería devolverlo, y muchos museos ya lo hacen.",
          "Pero una regla que mande cada objeto de vuelta vaciaría los grandes museos del mundo de lo que los hace valiosos: la oportunidad de ver muchas culturas juntas, bajo un mismo techo. Un estudiante en Londres puede comparar arte griego, egipcio y chino en una sola tarde.",
          "Además, algunos museos no pueden simplemente regalar objetos. El Museo Británico, por ejemplo, tiene prohibido por una ley de 1963 regalar la mayoría de los objetos de su colección.",
          "Un mejor camino es compartir. Los museos pueden hacer préstamos a largo plazo, devolver algunas piezas y quedarse con otras, y trabajar con los países de origen en exposiciones. Compartir respeta el lugar de donde viene un objeto sin cerrar las puertas que permiten que todo el mundo lo vea.",
        ],
      },
    ],
    qs: [
      q(
        "compare.differ",
        ["contradicts-text", "contradicts-text", "not-in-text"],
        [
          "What is the main disagreement between the two writers?",
          "Text 1 wants the objects sent back; Text 2 prefers sharing them.",
          ["Text 1 wants the objects sent back; Text 2 wants even looted objects kept in museums.", "Text 1 says stolen objects should stay in museums; Text 2 says they should be returned.", "They disagree about whether great museums like the British Museum should exist at all."],
          ["These objects should be returned to the places they came from.", "A better path is sharing."],
          "Text 1 calls for returning objects taken unfairly. Text 2 agrees about plainly stolen objects but argues that sharing is better than sending everything home.",
        ],
        [
          "¿Cuál es el desacuerdo principal entre los dos autores?",
          "El texto 1 quiere que se devuelvan; el texto 2 prefiere compartirlos.",
          ["El texto 1 quiere que se devuelvan; el texto 2 quiere que hasta lo saqueado se quede en los museos.", "El texto 1 dice que los objetos robados deben quedarse en los museos; el texto 2 dice que deben devolverse.", "No están de acuerdo en si los grandes museos, como el Museo Británico, deberían existir."],
          ["Estos objetos deberían devolverse a los lugares de donde vinieron.", "Un mejor camino es compartir."],
          "El texto 1 pide devolver los objetos que se tomaron de forma injusta. El texto 2 está de acuerdo en lo que claramente fue robado, pero argumenta que compartir es mejor que mandar todo de vuelta.",
        ],
      ),
      q(
        "compare.agree",
        ["one-text-only", "not-in-text", "same-not-different"],
        [
          "On which point do both writers agree?",
          "Objects that were clearly taken unfairly deserve to go back.",
          ["The British Museum is barred by law from giving most objects away.", "The Parthenon sculptures must stay in London.", "Museums should send every object home."],
          ["or sold by officials with no right to sell them", "When a museum learns that something in its collection was looted, it should return it"],
          "Text 1 wants objects taken unfairly returned, and Text 2 says looted objects should go back. They split only on objects whose history is less clear-cut, and on whether to send everything home.",
        ],
        [
          "¿En qué punto coinciden los dos autores?",
          "Los objetos que claramente se tomaron de forma injusta merecen volver.",
          ["El Museo Británico tiene prohibido por ley regalar la mayoría de sus objetos.", "Las esculturas del Partenón deben quedarse en Londres.", "Los museos deberían mandar de vuelta cada objeto."],
          ["o vendidos por funcionarios que no tenían derecho a venderlos", "Cuando un museo descubre que algo de su colección fue saqueado, debería devolverlo"],
          "El texto 1 quiere que se devuelvan los objetos tomados de forma injusta, y el texto 2 dice que lo saqueado debe volver. Solo difieren en los objetos con una historia menos clara y en si hay que mandar todo de vuelta.",
        ],
      ),
      q(
        "compare.approach",
        ["swaps-texts", "contradicts-text", "swaps-texts"],
        [
          "How does Text 2's way of arguing differ from Text 1's?",
          "Text 2 grants a point before offering a middle path; Text 1 dismisses opponents.",
          ["Text 1 grants part of the other side before offering a middle path; Text 2 takes a firm stand and dismisses opponents.", "Neither text admits any point that the other side makes, and both refuse to give an inch.", "Text 2 relies mainly on the story of the Benin Bronzes, which Germany returned to Nigeria."],
          ["No one should defend keeping an object that was plainly stolen.", "Anyone who still defends keeping them simply does not respect other cultures."],
          "Text 2 opens by agreeing about stolen objects and ends with a compromise. Text 1 ends by saying that anyone who disagrees lacks respect, which closes the door on the other side.",
        ],
        [
          "¿En qué se diferencia la manera de argumentar del texto 2 de la del texto 1?",
          "El texto 2 concede un punto antes de proponer un punto medio; el texto 1 descarta a quienes no están de acuerdo.",
          ["El texto 1 le concede una parte a la otra postura antes de proponer un punto medio; el texto 2 toma una postura firme y descarta a quienes no están de acuerdo.", "Ninguno de los dos textos acepta ningún punto de la otra postura, y los dos se niegan a ceder aunque sea en lo más mínimo.", "El texto 2 se basa sobre todo en la historia de los Bronces de Benín, que Alemania le transfirió a Nigeria en 2022."],
          ["Nadie debería defender que se quede un objeto que claramente fue robado.", "Cualquiera que todavía defienda quedárselos simplemente no respeta otras culturas."],
          "El texto 2 empieza dándole la razón a la otra postura sobre lo robado y termina con un punto medio. El texto 1 termina diciendo que quien no está de acuerdo no respeta otras culturas, lo que le cierra la puerta a la otra postura.",
        ],
      ),
      q(
        "pov.purpose",
        ["overstates-view", "not-in-text", "wrong-purpose"],
        [
          "Why does the author of Text 2 mention the 1963 law?",
          "To show that some museums may not legally give objects back.",
          ["To argue that the 1963 law proves the Parthenon sculptures were bought fairly in the first place.", "To show that Greece passed a law in 1963 asking for the sculptures back.", "To describe how and when the British Museum was first founded in London."],
          ["Some museums also cannot simply give objects away."],
          "The law is a practical obstacle: even a museum willing to return something may not be allowed to. It supports the writer's case for loans and sharing.",
        ],
        [
          "¿Por qué el autor del texto 2 menciona la ley de 1963?",
          "Para mostrar que algunos museos no pueden devolver objetos por ley.",
          ["Para argumentar que la ley de 1963 demuestra que las esculturas se compraron de forma justa.", "Para mostrar que Grecia aprobó una ley en 1963 para pedir que le devolvieran las esculturas.", "Para describir cómo y cuándo se fundó por primera vez el Museo Británico en Londres."],
          ["Además, algunos museos no pueden simplemente regalar objetos."],
          "La ley es un obstáculo práctico: aunque un museo quiera devolver algo, quizá no se lo permitan. Eso apoya la propuesta del autor de hacer préstamos y compartir.",
        ],
      ),
      q(
        "argument.reasoning",
        ["not-a-flaw", "not-a-flaw", "not-a-flaw"],
        [
          "Which sentence in Text 1 relies on the weakest reasoning?",
          "Anyone who still defends keeping them simply does not respect other cultures.",
          ["Greece has asked for them back for decades, and in 2009 it opened the Acropolis Museum, with space waiting for them, within sight of the temple they once decorated.", "In 2022, Germany transferred ownership of more than a thousand Benin Bronzes, sculptures taken from the Kingdom of Benin by British soldiers in 1897, to Nigeria.", "But the Acropolis Museum shows that Greece can care for its own heritage."],
          ["simply does not respect other cultures"],
          "That sentence attacks the motives of people who disagree instead of answering their reasons. Text 2 shows that someone can respect other cultures and still prefer sharing.",
        ],
        [
          "¿Qué oración del texto 1 se apoya en el razonamiento más débil?",
          "Cualquiera que todavía defienda quedárselos simplemente no respeta otras culturas.",
          ["Grecia lleva décadas pidiendo que se las devuelvan, y en 2009 abrió el Museo de la Acrópolis, con un espacio que las espera, a la vista del templo que antes adornaban.", "En 2022, Alemania le transfirió a Nigeria la propiedad de más de mil Bronces de Benín, esculturas que soldados británicos se llevaron del Reino de Benín en 1897.", "Pero el Museo de la Acrópolis demuestra que Grecia puede cuidar su patrimonio."],
          ["simplemente no respeta otras culturas"],
          "Esa oración ataca los motivos de quienes no están de acuerdo en lugar de responder a sus razones. El texto 2 muestra que alguien puede respetar otras culturas y aun así preferir compartir.",
        ],
      ),
    ],
  },
];
