// Reading passages for grades 6–9 comprehension (used by english/reading-69.ts). Every passage is
// original, written for KaizenEDU: stories, poems, informational articles, arguments, imagined
// historical documents (each one says it is imagined) and paired texts on one topic. Each passage has
// an English and a Spanish version with the same paragraphs (stanzas for poems), so "paragraph 3" means
// the same place in both. Questions name the passage quotes that settle them. Draft: not yet reviewed
// by a teacher. Facts in the informational and historical passages were checked when written; see the
// strand's report for anything left out because it could not be confirmed.

export type Structure = "chronological" | "compare-contrast" | "cause-effect" | "problem-solution";

/** What a question asks. The part before the dot is the skill it practises. */
export type Ask =
  | "central.idea"
  | "central.summary"
  | "infer.what"
  | "infer.support"
  | "words.figurative"
  | "words.connotation"
  | "words.tone"
  | "structure.section"
  | "theme.statement"
  | "theme.develop"
  | "pov.view"
  | "pov.purpose"
  | "pov.response"
  | "pov.reveal"
  | "argument.claim"
  | "argument.evidence"
  | "argument.reasoning"
  | "compare.differ"
  | "compare.agree"
  | "compare.approach";

/** The misconception a wrong choice shows (rule 16). */
export type Tag =
  | "not-in-text"
  | "contradicts-text"
  | "too-narrow"
  | "too-broad"
  | "adds-opinion"
  | "misses-key-point"
  | "overgeneralizes"
  | "wrong-character"
  | "off-point-evidence"
  | "too-literal"
  | "ignores-connotation"
  | "opposite-tone"
  | "topic-not-tone"
  | "wrong-context-meaning"
  | "misread-as-chronological"
  | "misread-as-compare-contrast"
  | "misread-as-cause-effect"
  | "misread-as-problem-solution"
  | "wrong-section-role"
  | "topic-not-theme"
  | "plot-not-theme"
  | "misses-the-change"
  | "confuses-speaker-author"
  | "misses-author-stance"
  | "overstates-view"
  | "wrong-purpose"
  | "evidence-not-claim"
  | "counterclaim-not-claim"
  | "anecdote-as-proof"
  | "opinion-as-evidence"
  | "misjudges-relevance"
  | "not-a-flaw"
  | "swaps-texts"
  | "one-text-only"
  | "same-not-different";

/** One text: a title and its paragraphs (for a poem, stanzas with lines split by "\n"). */
export type Text = { title: string; paras: string[] };

/**
 * A question in one language: what is asked, the key, the wrong choices (in the order of `tags`), the
 * passage quotes that settle it, and why the key is right.
 */
export type QText = [ask: string, right: string, wrong: string[], evidence: string[], explain: string];

export type Question = { ask: Ask; tags: Tag[]; en: QText; es: QText };

export type Genre = "story" | "poem" | "informational" | "argument" | "primary" | "paired";

export type Passage = {
  id: string;
  /** 1: grades 6–7 complexity; 2: grades 8–9 (longer sentences, more implied meaning). */
  level: 1 | 2;
  genre: Genre;
  /** Shown under the title of an imagined document, so no one mistakes it for a real one. */
  note?: { en: string; es: string };
  /** Informational passages with one clear overall structure get a "How is it organized?" question. */
  structure?: { kind: Structure; en: [signals: string[], explain: string]; es: [signals: string[], explain: string] };
  en: Text[];
  es: Text[];
  qs: Question[];
};

const q = (ask: Ask, tags: Tag[], en: QText, es: QText): Question => ({ ask, tags, en, es });

export const PASSAGES: Passage[] = [
  // ---------------------------------------------------------------------------------------------------
  // Level 1 stories
  {
    id: "night-market",
    level: 1,
    genre: "story",
    en: [
      {
        title: "The Night Market",
        paras: [
          "Every Saturday in summer, the parking lot behind the hardware store turned into a night market. Strings of lights went up between the poles, and by seven o'clock the air smelled like grilled corn, frying dough, and rain on hot pavement. Mei's grandmother had a stall near the middle, where she sold pork dumplings from a steamer as tall as Mei's waist.",
          "Mei had spent the first two Saturdays of summer hiding behind the steamer. Kids from her school walked past in groups, and she was sure they were staring at the hand-painted sign with its crooked letters. She kept her hood up and counted change without looking at anyone's face.",
          "On the third Saturday, a boy from her math class, Darius, stopped at the stall. Mei froze. He read the sign out loud, ordered six dumplings, and ate the first one standing right there. Then he closed his eyes. “These are better than my uncle's,” he said, “and my uncle thinks he's a chef.”",
          "Nai Nai laughed and slid two extra dumplings into his box. Darius came back twenty minutes later with his cousins.",
          "That night, Mei pushed her hood back. She folded the boxes faster than her grandmother could fill them, and when someone asked what was in the dipping sauce, she answered before Nai Nai could. “Black vinegar, ginger, and a secret,” she said. Her grandmother raised an eyebrow, then nodded, as if Mei had passed a test she hadn't known she was taking.",
          "When the lights came down at eleven, Mei carried the empty steamer to the car. It was heavier than it looked. She didn't mind.",
        ],
      },
    ],
    es: [
      {
        title: "El mercado nocturno",
        paras: [
          "Cada sábado de verano, el estacionamiento detrás de la ferretería se convertía en un mercado nocturno. Colgaban hileras de luces entre los postes y, a las siete, el aire olía a elote asado, a masa frita y a lluvia sobre el pavimento caliente. La abuela de Mei tenía un puesto cerca del centro, donde vendía empanadillas chinas de cerdo, cocidas en una vaporera tan alta como la cintura de Mei.",
          "Mei había pasado los dos primeros sábados del verano escondida detrás de la vaporera. Chicos de su escuela pasaban en grupos, y ella estaba segura de que se fijaban en el letrero pintado a mano, con sus letras chuecas. Se dejaba la capucha puesta y contaba el cambio sin mirarle la cara a nadie.",
          "El tercer sábado, un chico de su clase de matemáticas, Darius, se detuvo en el puesto. Mei se quedó helada. Él leyó el letrero en voz alta, pidió seis empanadillas y se comió la primera ahí mismo, de pie. Luego cerró los ojos. —Están mejores que las de mi tío —dijo—, y mi tío se cree chef.",
          "Nai Nai se rio y le metió dos empanadillas de más en la caja. Darius volvió veinte minutos después con sus primos.",
          "Esa noche, Mei se bajó la capucha. Armaba las cajas más rápido de lo que su abuela alcanzaba a llenarlas, y cuando alguien preguntó qué llevaba la salsa, contestó antes que Nai Nai. —Vinagre negro, jengibre y un secreto —dijo. Su abuela levantó una ceja y luego asintió, como si Mei hubiera pasado una prueba que no sabía que estaba presentando.",
          "Cuando apagaron las luces a las once, Mei cargó la vaporera vacía hasta el carro. Pesaba más de lo que parecía. No le importó.",
        ],
      },
    ],
    qs: [
      q(
        "theme.statement",
        ["topic-not-theme", "plot-not-theme", "not-in-text"],
        [
          "Which statement best expresses a theme of the story?",
          "Embarrassment about your family can turn into pride once you see the value of what they do.",
          ["Night markets", "Mei hides behind her grandmother's steamer at the night market until a classmate from math class buys six dumplings.", "Selling food at a market is harder work than going to school."],
          ["That night, Mei pushed her hood back."],
          "Mei starts out hiding her face and ends up working proudly beside her grandmother. That change carries the story's message.",
        ],
        [
          "¿Qué oración expresa mejor un mensaje del cuento?",
          "La vergüenza por la propia familia puede volverse orgullo cuando uno ve el valor de lo que hace.",
          ["Los mercados nocturnos", "Mei se esconde detrás de la vaporera de su abuela en el mercado nocturno hasta que un compañero de matemáticas le compra seis empanadillas.", "Vender comida en un mercado es más difícil que ir a la escuela."],
          ["Esa noche, Mei se bajó la capucha."],
          "Al principio Mei esconde la cara y al final trabaja con orgullo junto a su abuela. Ese cambio lleva el mensaje del cuento.",
        ],
      ),
      q(
        "theme.develop",
        ["misses-the-change", "wrong-character", "off-point-evidence"],
        [
          "How does the author show that Mei's feelings have changed by the end?",
          "She pushes back her hood and answers a customer herself.",
          ["She keeps her hood up and counts change without looking at anyone.", "Darius says the dumplings are better than his uncle's cooking.", "The market lights come down at eleven o'clock."],
          ["she answered before Nai Nai could"],
          "At first Mei hid and would not look at customers. Now she shows her face and speaks up for the stall, which shows pride instead of embarrassment.",
        ],
        [
          "¿Cómo muestra la autora que los sentimientos de Mei cambiaron al final?",
          "Se baja la capucha y le contesta ella misma a un cliente.",
          ["Se deja la capucha puesta y cuenta el cambio sin mirar a nadie.", "Darius dice que las empanadillas están mejores que las de su tío.", "Las luces del mercado se apagan a las once."],
          ["contestó antes que Nai Nai"],
          "Al principio Mei se escondía y no miraba a los clientes. Ahora da la cara y habla por el puesto, lo que muestra orgullo en lugar de vergüenza.",
        ],
      ),
      q(
        "infer.what",
        ["contradicts-text", "not-in-text", "overgeneralizes"],
        [
          "Why does Nai Nai raise an eyebrow and then nod at the end of paragraph 5?",
          "She is surprised and pleased that Mei is speaking up for the stall.",
          ["She is annoyed that Mei almost gave away the secret ingredient to a stranger.", "She wants Mei to fold the boxes more slowly.", "She tests every person who helps at the stall."],
          ["as if Mei had passed a test she hadn't known she was taking"],
          "A raised eyebrow shows surprise, and the nod and the test Mei “passed” show approval.",
        ],
        [
          "¿Por qué Nai Nai levanta una ceja y luego asiente al final del párrafo 5?",
          "Está sorprendida y contenta de que Mei hable por el puesto.",
          ["Está molesta porque Mei casi le revela el ingrediente secreto a un desconocido.", "Quiere que Mei arme las cajas más despacio.", "Pone a prueba a todas las personas que ayudan en el puesto."],
          ["como si Mei hubiera pasado una prueba que no sabía que estaba presentando"],
          "Levantar una ceja muestra sorpresa, y el gesto de asentir y la prueba que Mei “pasó” muestran aprobación.",
        ],
      ),
      q(
        "words.figurative",
        ["too-literal", "not-in-text", "contradicts-text"],
        [
          "In paragraph 3, the narrator says “Mei froze.” What does “froze” mean here?",
          "She was suddenly too nervous to move.",
          ["She felt very cold in the night air.", "She was angry that Darius read the sign out loud.", "She hurried to serve him before anyone else."],
          ["Mei froze."],
          "“Froze” does not mean cold here. Mei stopped moving because she was nervous that a classmate had seen her.",
        ],
        [
          "En el párrafo 3, el narrador dice: “Mei se quedó helada”. ¿Qué significa “se quedó helada” aquí?",
          "De pronto estaba tan nerviosa que no podía moverse.",
          ["Tenía mucho frío por el aire de la noche.", "Estaba enojada porque Darius leyó en voz alta el letrero.", "Se apuró a atenderlo antes que a nadie."],
          ["Mei se quedó helada."],
          "Aquí “se quedó helada” no tiene que ver con el frío. Mei se paralizó de nervios porque un compañero la había visto.",
        ],
      ),
      q(
        "central.summary",
        ["adds-opinion", "misses-key-point", "contradicts-text"],
        [
          "Which is the best objective summary of the story?",
          "Mei hides at her grandmother's dumpling stall until a classmate loves the food and brings friends. Then she works openly beside her grandmother.",
          ["Mei's grandmother makes the best dumplings at the market, and Mei was silly to feel embarrassed about them.", "Mei goes to a night market that smells like grilled corn and frying dough, sees a hand-painted sign with crooked letters, and carries an empty steamer to the car at eleven.", "Mei quits working at the stall after a classmate laughs at the crooked letters on the sign."],
          ["Darius came back twenty minutes later with his cousins."],
          "A good summary tells the main events and the change in Mei, and it leaves out the reader's own opinions.",
        ],
        [
          "¿Cuál es el mejor resumen objetivo del cuento?",
          "Mei se esconde en el puesto de su abuela hasta que a un compañero le encanta la comida y trae amigos. Después trabaja sin esconderse junto a su abuela.",
          ["La abuela de Mei hace las mejores empanadillas del mercado, y fue una tontería que Mei sintiera vergüenza.", "Mei va a un mercado nocturno que huele a elote asado y a masa frita, ve un letrero pintado a mano con letras chuecas y a las once lleva una vaporera vacía al carro.", "Mei deja de trabajar en el puesto después de que un compañero se ríe de las letras chuecas del letrero."],
          ["Darius volvió veinte minutos después con sus primos."],
          "Un buen resumen cuenta los hechos principales y el cambio de Mei, sin las opiniones de quien lee.",
        ],
      ),
    ],
  },
  {
    id: "second-chair",
    level: 1,
    genre: "story",
    en: [
      {
        title: "Second Chair",
        paras: [
          "For a whole year, Mateo had sat in the first chair of the trumpet section, the seat closest to the conductor and the one that played the solos. Then, in January, a new student named Amara joined the band. At the spring auditions she played the hardest passage without a single cracked note, and Ms. Lindqvist moved her to first chair. Mateo moved one seat to the right.",
          "It was only one seat, but it felt like a mile. For two weeks he barely spoke to Amara. When she asked which page they were starting on, he pointed instead of answering. At home he practiced the solo from the spring concert anyway, over and over, as if someone might change their mind.",
          "On the night of the concert, the band warmed up in the noisy hallway behind the stage. Mateo noticed Amara pressing the third valve of her trumpet again and again. It was sticking. She had no valve oil, and her face had gone pale.",
          "Mateo's own bottle of oil was in his pocket. For a moment he just stood there, feeling the cold plastic against his fingers. If her trumpet failed, the solo would probably come back to him. He thought about that for exactly as long as it took to cross the hallway.",
          "“Here,” he said, holding out the bottle. “Two drops. Then work the valve up and down.”",
          "Amara's solo was clean and bright, and the audience clapped before the song was even over. Mateo played his part underneath it, steady and quiet, and he was surprised to find that the clapping felt partly like his.",
          "Afterward, Amara tapped her trumpet bell gently against his. “Next audition,” she said, “you'd better be ready.”",
          "“I will,” Mateo said, and he meant it in a friendly way.",
        ],
      },
    ],
    es: [
      {
        title: "Segunda silla",
        paras: [
          "Durante un año entero, Mateo se había sentado en la primera silla de la sección de trompetas, el asiento más cerca de la directora y el que tocaba los solos. Luego, en enero, una estudiante nueva llamada Amara entró a la banda. En las audiciones de primavera tocó el pasaje más difícil sin una sola nota quebrada, y la maestra Lindqvist la pasó a la primera silla. Mateo se movió un asiento a la derecha.",
          "Era solo un asiento, pero se sentía como un kilómetro. Durante dos semanas casi no le habló a Amara. Cuando ella preguntó en qué página empezaban, él señaló en lugar de contestar. En casa practicaba de todos modos el solo del concierto de primavera, una y otra vez, como si alguien pudiera cambiar de opinión.",
          "La noche del concierto, la banda calentaba en el pasillo ruidoso detrás del escenario. Mateo notó que Amara apretaba el tercer pistón de su trompeta una y otra vez. Se estaba trabando. Ella no tenía aceite para pistones, y se había puesto pálida.",
          "El frasco de aceite de Mateo estaba en su bolsillo. Por un momento se quedó quieto, sintiendo el plástico frío entre los dedos. Si la trompeta de Amara fallaba, lo más probable era que el solo volviera a él. Lo pensó exactamente lo que tardó en cruzar el pasillo.",
          "—Toma —dijo, ofreciéndole el frasco—. Dos gotas. Luego mueve el pistón de arriba abajo.",
          "El solo de Amara sonó limpio y brillante, y el público aplaudió antes de que terminara la canción. Mateo tocó su parte por debajo, firme y suave, y se sorprendió al sentir que los aplausos eran, en parte, también suyos.",
          "Después, Amara chocó suavemente la campana de su trompeta contra la de él. —En la próxima audición —le dijo—, más te vale estar listo.",
          "—Lo estaré —dijo Mateo, y lo dijo sin rencor.",
        ],
      },
    ],
    qs: [
      q(
        "theme.statement",
        ["topic-not-theme", "plot-not-theme", "not-in-text"],
        [
          "Which statement best expresses a theme of the story?",
          "Another person's success does not have to be your loss.",
          ["Competition", "Mateo loses first chair to Amara but lends her his valve oil before the concert.", "The student who practices the most always earns the best seat."],
          ["the clapping felt partly like his"],
          "Mateo helps the person who took his seat, and her success ends up feeling partly like his own. Losing the seat did not mean losing everything.",
        ],
        [
          "¿Qué oración expresa mejor un mensaje del cuento?",
          "El éxito de otra persona no tiene por qué ser una pérdida para ti.",
          ["La competencia", "Mateo pierde la primera silla ante Amara, pero le presta su aceite antes del concierto.", "Quien más practica siempre se gana el mejor asiento."],
          ["los aplausos eran, en parte, también suyos"],
          "Mateo ayuda a quien le quitó el asiento, y el éxito de ella termina sintiéndose en parte como suyo. Perder el asiento no significó perderlo todo.",
        ],
      ),
      q(
        "theme.develop",
        ["misses-the-change", "off-point-evidence", "wrong-character"],
        [
          "Which moment is the turning point in how Mateo treats Amara?",
          "He crosses the hallway and offers her his valve oil.",
          ["He points to the page number instead of answering her.", "The audience claps before the song is over.", "Amara tells him he had better be ready for the next audition."],
          ["He thought about that for exactly as long as it took to cross the hallway."],
          "Until then, Mateo avoids Amara. When he chooses to help her even though her failure could help him, the way he treats her changes.",
        ],
        [
          "¿Qué momento marca el cambio en cómo trata Mateo a Amara?",
          "Cruza el pasillo y le ofrece su aceite para pistones.",
          ["Señala el número de página en lugar de contestarle.", "El público aplaude antes de que termine la canción.", "Amara le dice que más le vale estar listo para la próxima audición."],
          ["Lo pensó exactamente lo que tardó en cruzar el pasillo."],
          "Hasta ese momento, Mateo evita a Amara. Cuando decide ayudarla aunque el fracaso de ella podría beneficiarlo, cambia su manera de tratarla.",
        ],
      ),
      q(
        "words.figurative",
        ["too-literal", "contradicts-text", "not-in-text"],
        [
          "In paragraph 2, what does the narrator mean by “It was only one seat, but it felt like a mile”?",
          "The small move felt like a huge loss to Mateo.",
          ["Mateo's new seat was far away from the rest of the band.", "Mateo was glad to have more room to play.", "The band room was much bigger than Mateo expected."],
          ["It was only one seat, but it felt like a mile."],
          "Moving one seat is a tiny distance, but comparing it to a mile shows how big the loss felt to him.",
        ],
        [
          "En el párrafo 2, ¿qué quiere decir el narrador con “Era solo un asiento, pero se sentía como un kilómetro”?",
          "El pequeño cambio se sintió como una gran pérdida para Mateo.",
          ["El nuevo asiento de Mateo quedaba muy lejos del resto de la banda.", "Mateo estaba contento de tener más espacio para tocar.", "El salón de la banda era mucho más grande de lo que Mateo esperaba."],
          ["Era solo un asiento, pero se sentía como un kilómetro."],
          "Moverse un asiento es una distancia mínima, pero compararlo con un kilómetro muestra lo grande que se sintió la pérdida.",
        ],
      ),
      q(
        "infer.what",
        ["contradicts-text", "not-in-text", "overgeneralizes"],
        [
          "What does the last line suggest about how Mateo now sees Amara?",
          "He sees her as a friendly rival, not an enemy.",
          ["He is still angry that she took his seat.", "He plans to quit the band before the next audition.", "He has decided that competition always ruins friendships."],
          ["he meant it in a friendly way"],
          "Mateo still wants to compete for first chair, but he says so “in a friendly way.” He no longer treats Amara as an enemy.",
        ],
        [
          "¿Qué sugiere la última línea sobre cómo ve Mateo ahora a Amara?",
          "La ve como una rival amistosa, no como una enemiga.",
          ["Sigue enojado porque ella le quitó el asiento.", "Piensa dejar la banda antes de la próxima audición.", "Decidió que competir siempre arruina las amistades."],
          ["lo dijo sin rencor"],
          "Mateo todavía quiere competir por la primera silla, pero lo dice “sin rencor”. Ya no trata a Amara como enemiga.",
        ],
      ),
      q(
        "central.summary",
        ["adds-opinion", "misses-key-point", "contradicts-text"],
        [
          "Which is the best objective summary of the story?",
          "After Amara wins first chair, Mateo avoids her. On concert night he gives her the valve oil she needs, and her solo succeeds with his support.",
          ["Amara is simply a better trumpet player than Mateo, so she deserves the solo more than he does.", "The band warms up in a noisy hallway behind the stage, a trumpet valve sticks, Mateo plays his part steady and quiet, and the audience claps before a song is over.", "Mateo wins back first chair by playing the solo himself when Amara's trumpet breaks on stage."],
          ["“Here,” he said, holding out the bottle."],
          "The summary has to include the lost seat, Mateo's choice to help, and the result, with no opinions added.",
        ],
        [
          "¿Cuál es el mejor resumen objetivo del cuento?",
          "Después de que Amara gana la primera silla, Mateo la evita. La noche del concierto le da el aceite que necesita, y el solo de ella sale bien con su apoyo.",
          ["Amara simplemente toca la trompeta mejor que Mateo, así que merece el solo más que él.", "La banda calienta en un pasillo ruidoso detrás del escenario, un pistón se traba, Mateo toca su parte firme y suave, y el público aplaude antes de que termine una canción.", "Mateo recupera la primera silla al tocar él mismo el solo cuando la trompeta de Amara falla en el escenario."],
          ["—Toma —dijo, ofreciéndole el frasco—."],
          "El resumen tiene que incluir el asiento perdido, la decisión de Mateo de ayudar y el resultado, sin agregar opiniones.",
        ],
      ),
    ],
  },
  {
    id: "fourth-street",
    level: 1,
    genre: "story",
    en: [
      {
        title: "The Garden on Fourth Street",
        paras: [
          "The lot on Fourth Street had been empty for as long as Rosa could remember. It was a square of broken glass, tall weeds, and one shopping cart lying on its side like a tired animal. People walked past it quickly, the way you walk past a dog that might bark.",
          "Then, one Saturday in April, Mr. Haddad from the third floor of Rosa's building carried a rake and a stack of trash bags across the street. He was seventy-three and walked with a cane, so he worked slowly. He filled one bag, rested on an upturned bucket, and filled another.",
          "Rosa watched from her window for an hour. Finally she went down. “Why are you doing this?” she asked. “The city owns it. They'll never let you keep it.”",
          "Mr. Haddad shrugged. “Maybe not. But today it will have less glass in it.” He handed her a pair of gloves that were much too big.",
          "The next Saturday, Rosa's little brother came too. The Saturday after that, Mrs. Obi from the laundromat brought tomato seedlings in coffee cans, and two teenagers dragged the shopping cart to the curb. By June, someone had painted a sign that said FOURTH STREET GARDEN in uneven green letters, and the city had agreed to let the neighbors use the land for a dollar a year.",
          "In August, Rosa picked the first ripe tomato and carried it up three flights of stairs to Mr. Haddad's apartment. He held it up to the light as if it were a jewel.",
          "“You see?” he said. “Less glass.”",
        ],
      },
    ],
    es: [
      {
        title: "El huerto de la calle Cuarta",
        paras: [
          "El terreno de la calle Cuarta había estado vacío desde que Rosa tenía memoria. Era un cuadro de vidrios rotos, hierba alta y un carrito de supermercado tirado de lado como un animal cansado. La gente pasaba rápido frente a él, como se pasa junto a un perro que podría ladrar.",
          "Entonces, un sábado de abril, el señor Haddad, del tercer piso del edificio de Rosa, cruzó la calle con un rastrillo y un montón de bolsas de basura. Tenía setenta y tres años y caminaba con bastón, así que trabajaba despacio. Llenó una bolsa, descansó sobre una cubeta volteada y llenó otra.",
          "Rosa lo miró desde su ventana durante una hora. Por fin bajó. —¿Por qué hace esto? —le preguntó—. El terreno es de la ciudad. Nunca se lo van a dejar.",
          "El señor Haddad se encogió de hombros. —Tal vez no. Pero hoy va a tener menos vidrio. —Le dio un par de guantes que le quedaban enormes.",
          "El sábado siguiente, el hermanito de Rosa también fue. El sábado después, la señora Obi, de la lavandería, llevó plantitas de tomate en latas de café, y dos adolescentes arrastraron el carrito hasta la banqueta. Para junio, alguien había pintado un letrero que decía HUERTO DE LA CALLE CUARTA con letras verdes disparejas, y la ciudad había aceptado que los vecinos usaran el terreno por un dólar al año.",
          "En agosto, Rosa cortó el primer tomate maduro y lo subió tres pisos hasta el apartamento del señor Haddad. Él lo levantó hacia la luz como si fuera una joya.",
          "—¿Ves? —dijo—. Menos vidrio.",
        ],
      },
    ],
    qs: [
      q(
        "theme.statement",
        ["topic-not-theme", "plot-not-theme", "not-in-text"],
        [
          "Which statement best expresses a theme of the story?",
          "One person's small, steady effort can inspire others to join in.",
          ["Gardening", "Mr. Haddad cleans an empty lot, and later the neighbors plant tomatoes there.", "Cities should give every empty lot to the people who live nearby."],
          ["The next Saturday, Rosa's little brother came too."],
          "Mr. Haddad starts alone and works slowly, and one by one other people join him. The story shows how a small effort can spread.",
        ],
        [
          "¿Qué oración expresa mejor un mensaje del cuento?",
          "El esfuerzo pequeño y constante de una persona puede animar a otras a unirse.",
          ["La jardinería", "El señor Haddad limpia un terreno vacío y después los vecinos siembran tomates.", "Las ciudades deberían regalar todos los terrenos vacíos a los vecinos."],
          ["El sábado siguiente, el hermanito de Rosa también fue."],
          "El señor Haddad empieza solo y trabaja despacio, y poco a poco otras personas se le unen. El cuento muestra cómo un esfuerzo pequeño se contagia.",
        ],
      ),
      q(
        "infer.what",
        ["contradicts-text", "not-in-text", "overgeneralizes"],
        [
          "What can you infer from Mr. Haddad's answer, “Maybe not. But today it will have less glass in it”?",
          "A small improvement today is worth it to him, even with no promise.",
          ["He expects the city to let him keep the lot as soon as it is clean.", "He is cleaning the lot because he hopes to find something valuable buried there.", "He believes that no one should ever make plans."],
          ["Maybe not. But today it will have less glass in it."],
          "He admits the city may never let them keep the lot, but he works anyway, because each bag of trash makes the lot better today.",
        ],
        [
          "¿Qué puedes inferir de la respuesta del señor Haddad: “Tal vez no. Pero hoy va a tener menos vidrio”?",
          "Para él vale la pena mejorar un poco hoy, aunque nadie le prometa nada.",
          ["Espera que la ciudad le deje el terreno en cuanto esté limpio.", "Limpia el terreno porque espera encontrar algo de valor enterrado entre la basura.", "Cree que nadie debería hacer planes nunca."],
          ["Tal vez no. Pero hoy va a tener menos vidrio."],
          "Acepta que tal vez la ciudad nunca les deje el terreno, pero trabaja de todos modos, porque cada bolsa de basura mejora el terreno hoy.",
        ],
      ),
      q(
        "words.figurative",
        ["too-literal", "contradicts-text", "not-in-text"],
        [
          "In paragraph 1, the shopping cart is lying on its side “like a tired animal.” What does this comparison suggest about the lot?",
          "The lot looks neglected and worn out, as if it has given up.",
          ["Animals have made their home among the weeds and broken glass in the lot.", "The lot is a lively place where children like to play.", "The cart belongs to someone who is resting nearby."],
          ["one shopping cart lying on its side like a tired animal"],
          "A tired animal lying on its side looks worn out. The comparison makes the whole lot feel abandoned.",
        ],
        [
          "En el párrafo 1, el carrito está tirado de lado “como un animal cansado”. ¿Qué sugiere esta comparación sobre el terreno?",
          "El terreno se ve descuidado y gastado, como si se hubiera rendido.",
          ["Algunos animales viven entre la hierba alta y los vidrios rotos del terreno.", "El terreno es un lugar lleno de vida donde a los niños les gusta jugar.", "El carrito es de alguien que está descansando cerca."],
          ["un carrito de supermercado tirado de lado como un animal cansado"],
          "Un animal cansado tirado de lado se ve agotado. La comparación hace que todo el terreno se sienta abandonado.",
        ],
      ),
      q(
        "theme.develop",
        ["too-narrow", "contradicts-text", "not-in-text"],
        [
          "How does the last line, “Less glass,” help develop the theme?",
          "It repeats Mr. Haddad's first small goal, showing how much that small start has grown.",
          ["It reminds readers that the lot was once covered in broken glass, tall weeds, and an old cart.", "It shows that Mr. Haddad has lost interest in the garden.", "It warns readers that the garden will soon be closed."],
          ["“You see?” he said. “Less glass.”"],
          "“Less glass” was Mr. Haddad's tiny goal on the first day. Repeating it while holding a ripe tomato shows how one small step grew into a whole garden.",
        ],
        [
          "¿Cómo ayuda la última línea, “Menos vidrio”, a desarrollar el mensaje?",
          "Repite la primera meta pequeña del señor Haddad y muestra cuánto creció ese pequeño comienzo.",
          ["Les recuerda a los lectores que el terreno antes estaba cubierto de vidrios rotos, hierba alta y un carrito viejo.", "Muestra que el señor Haddad perdió el interés en el huerto.", "Les advierte a los lectores que pronto van a cerrar el huerto."],
          ["—¿Ves? —dijo—. Menos vidrio."],
          "“Menos vidrio” fue la meta mínima del señor Haddad el primer día. Repetirla con un tomate maduro en la mano muestra cómo un paso pequeño se volvió todo un huerto.",
        ],
      ),
      q(
        "central.summary",
        ["adds-opinion", "misses-key-point", "contradicts-text"],
        [
          "Which is the best objective summary of the story?",
          "Mr. Haddad begins cleaning an empty lot by himself. Rosa and other neighbors join him, and by August the lot has become a community garden.",
          ["Mr. Haddad is the kindest neighbor on Fourth Street, and everyone in the city should learn from him and start cleaning up the empty lots in their own neighborhoods.", "Rosa watches from her window, puts on gloves that are too big, and carries a tomato up three flights of stairs.", "The city cleans up the empty lot and builds a garden as a gift for the neighbors."],
          ["By June, someone had painted a sign that said FOURTH STREET GARDEN"],
          "A good summary covers how the garden began, who joined, and how it turned out, without opinions.",
        ],
        [
          "¿Cuál es el mejor resumen objetivo del cuento?",
          "El señor Haddad empieza a limpiar solo un terreno vacío. Rosa y otros vecinos se le unen, y para agosto el terreno es un huerto comunitario.",
          ["El señor Haddad es el vecino más bondadoso de la calle Cuarta, y todos en la ciudad deberían aprender de él y ponerse a limpiar los terrenos vacíos de sus propios vecindarios.", "Rosa mira desde su ventana, se pone unos guantes enormes y sube un tomate tres pisos.", "La ciudad limpia el terreno vacío y construye un huerto como regalo para los vecinos."],
          ["Para junio, alguien había pintado un letrero que decía HUERTO DE LA CALLE CUARTA"],
          "Un buen resumen cuenta cómo empezó el huerto, quiénes se unieron y cómo terminó, sin opiniones.",
        ],
      ),
    ],
  },
  {
    id: "low-tide",
    level: 1,
    genre: "story",
    en: [
      {
        title: "Low Tide",
        paras: [
          "The tide table said low tide would come at 9:42, and Jun had been watching the clock since breakfast. At low tide, the ocean pulled back from the rocks below the lighthouse and left behind hundreds of pools, each one a small, crowded world. He wanted to reach the far pools, the ones near the point, before the water came back.",
          "His sister Hana did not want to reach anything. She was seven, and she stood at the edge of the first rock in her new rain boots as if it were the edge of a cliff.",
          "“It's slippery,” she said.",
          "“Only the green parts,” Jun said. “Step on the brown parts.” He hopped across three rocks to show her how easy it was and then looked back. She hadn't moved.",
          "Jun sighed loudly enough for her to hear. The far pools were getting farther every minute. Then he noticed that her lip was shaking, and the sigh suddenly felt like something he wanted to take back.",
          "He came back and crouched beside the very first pool, the boring one, the one right next to the sand. “Okay,” he said. “Let's just look at this one.”",
          "They looked. At first it was only water and pebbles. Then a pebble walked. It was a hermit crab, carrying its borrowed shell. Hana gasped. A minute later she found a purple sea star the size of her hand, and then a green anemone that closed gently around her fingertip like a soft fist. She laughed, a big surprised laugh that echoed off the rocks.",
          "They never made it to the far pools. By the time Hana was ready to cross the brown rocks on her own, the tide was already coming in. Walking back, Jun realized he had seen more in one small pool than he usually saw on the whole point.",
        ],
      },
    ],
    es: [
      {
        title: "Marea baja",
        paras: [
          "La tabla de mareas decía que la marea baja llegaría a las 9:42, y Jun llevaba mirando el reloj desde el desayuno. Con la marea baja, el mar se retiraba de las rocas al pie del faro y dejaba cientos de pozas, cada una un mundo pequeño y lleno de vida. Él quería llegar a las pozas lejanas, las de la punta, antes de que volviera el agua.",
          "Su hermana Hana no quería llegar a ninguna parte. Tenía siete años y estaba parada en la orilla de la primera roca, con sus botas de lluvia nuevas, como si fuera el borde de un precipicio.",
          "—Está resbaloso —dijo.",
          "—Solo lo verde —dijo Jun—. Pisa lo café. —Saltó sobre tres rocas para mostrarle lo fácil que era y luego miró hacia atrás. Ella no se había movido.",
          "Jun suspiró lo bastante fuerte para que ella lo oyera. Las pozas lejanas se alejaban más cada minuto. Entonces notó que a ella le temblaba el labio, y de pronto el suspiro le pareció algo que quería retirar.",
          "Regresó y se agachó junto a la primerísima poza, la aburrida, la que estaba junto a la arena. —Bueno —dijo—. Vamos a ver solo esta.",
          "Miraron. Al principio solo había agua y piedritas. Luego, una piedrita caminó. Era un cangrejo ermitaño que cargaba su concha prestada. Hana ahogó un grito. Un minuto después encontró una estrella de mar morada del tamaño de su mano, y luego una anémona verde que se cerró con suavidad alrededor de la punta de su dedo, como un puño blando. Se rio con una risa grande y sorprendida que rebotó en las rocas.",
          "Nunca llegaron a las pozas lejanas. Cuando Hana por fin se animó a cruzar sola las rocas cafés, la marea ya estaba subiendo. De regreso, Jun se dio cuenta de que había visto más en una pequeña poza que lo que solía ver en toda la punta.",
        ],
      },
    ],
    qs: [
      q(
        "theme.statement",
        ["topic-not-theme", "plot-not-theme", "not-in-text"],
        [
          "Which statement best expresses a theme of the story?",
          "Slowing down for someone else can help you notice things you would have missed.",
          ["Tide pools", "Jun and Hana explore the first tide pool near the sand instead of reaching the far ones.", "Older siblings should always do whatever younger siblings want."],
          ["he had seen more in one small pool than he usually saw on the whole point"],
          "Jun gives up his race to the far pools to stay with Hana, and he ends up seeing more than ever. The story's message comes from that surprise.",
        ],
        [
          "¿Qué oración expresa mejor un mensaje del cuento?",
          "Ir más despacio por otra persona puede ayudarte a notar cosas que te habrías perdido.",
          ["La marea baja", "Jun y Hana exploran la primera poza junto a la arena en lugar de llegar a las lejanas.", "Los hermanos mayores siempre deben hacer lo que quieren los menores."],
          ["había visto más en una pequeña poza que lo que solía ver en toda la punta"],
          "Jun deja su carrera hacia las pozas lejanas para quedarse con Hana, y termina viendo más que nunca. El mensaje del cuento sale de esa sorpresa.",
        ],
      ),
      q(
        "theme.develop",
        ["misses-the-change", "wrong-character", "off-point-evidence"],
        [
          "Which detail best shows that Jun's attitude starts to change?",
          "He notices Hana's lip shaking and wishes he could take back his sigh.",
          ["He hops across three rocks to show her how easy it is.", "Hana laughs a big, surprised laugh when the anemone closes around her finger.", "The tide table says low tide will come at 9:42."],
          ["the sigh suddenly felt like something he wanted to take back"],
          "Until this moment Jun is impatient. Seeing that Hana is truly scared makes him regret his sigh, and he turns back to help her.",
        ],
        [
          "¿Qué detalle muestra mejor que la actitud de Jun empieza a cambiar?",
          "Nota que a Hana le tiembla el labio y quisiera retirar su suspiro.",
          ["Salta sobre tres rocas para mostrarle lo fácil que es.", "Hana suelta una risa grande y sorprendida cuando la anémona se cierra alrededor de su dedo.", "La tabla de mareas dice que la marea baja llegará a las 9:42."],
          ["de pronto el suspiro le pareció algo que quería retirar"],
          "Hasta ese momento Jun está impaciente. Ver que Hana de verdad tiene miedo hace que se arrepienta de su suspiro y regrese a ayudarla.",
        ],
      ),
      q(
        "words.connotation",
        ["contradicts-text", "not-in-text", "wrong-context-meaning"],
        [
          "Jun calls the first pool “the boring one.” Why does the author use that word here?",
          "It sets up a surprise: the pool Jun expects nothing from is full of life.",
          ["It shows that the first pool really has nothing living in it, unlike the far pools.", "It shows that Hana is bored by the ocean.", "It means the pool is shallow and easy to walk across."],
          ["the boring one, the one right next to the sand"],
          "Jun thinks the nearest pool will be dull. When it turns out to be full of life, the word “boring” makes the surprise stronger.",
        ],
        [
          "Jun llama a la primera poza “la aburrida”. ¿Por qué el autor usa esa palabra aquí?",
          "Prepara una sorpresa: la poza de la que Jun no espera nada está llena de vida.",
          ["Muestra que en la primera poza de verdad no vive nada, a diferencia de las lejanas.", "Muestra que a Hana le aburre el mar.", "Quiere decir que la poza es poco profunda y fácil de cruzar."],
          ["la aburrida, la que estaba junto a la arena"],
          "Jun cree que la poza más cercana será sosa. Cuando resulta llena de vida, la palabra “aburrida” hace más fuerte la sorpresa.",
        ],
      ),
      q(
        "infer.what",
        ["not-in-text", "contradicts-text", "overgeneralizes"],
        [
          "What can you infer from the fact that Jun “sighed loudly enough for her to hear”?",
          "He wants Hana to know he is impatient with her.",
          ["He is out of breath from hopping across the rocks.", "He wants Hana to feel proud of how brave she is.", "He gets angry at his sister about everything."],
          ["Jun sighed loudly enough for her to hear."],
          "Sighing so that someone hears it is a way to show impatience. Jun is frustrated that Hana is slowing him down.",
        ],
        [
          "¿Qué puedes inferir del hecho de que Jun “suspiró lo bastante fuerte para que ella lo oyera”?",
          "Quiere que Hana sepa que está impaciente con ella.",
          ["Le falta el aire de tanto saltar sobre las rocas.", "Quiere que Hana se sienta orgullosa de lo valiente que es.", "Se enoja con su hermana por todo."],
          ["Jun suspiró lo bastante fuerte para que ella lo oyera."],
          "Suspirar para que alguien lo oiga es una manera de mostrar impaciencia. Jun está frustrado porque Hana lo retrasa.",
        ],
      ),
      q(
        "central.summary",
        ["adds-opinion", "misses-key-point", "contradicts-text"],
        [
          "Which is the best objective summary of the story?",
          "Jun wants to rush to the far tide pools, but his little sister is scared of the rocks. He stays with her at the nearest pool, where they find more than he expected.",
          ["Jun is an impatient brother who should have been kinder to Hana from the very beginning of the day.", "Jun and Hana go to the beach below a lighthouse, look at the green and brown rocks, find a hermit crab, a purple sea star, and a green anemone, and walk back when the tide comes in.", "Jun leaves Hana on the sand and explores the far pools near the point by himself."],
          ["“Okay,” he said. “Let's just look at this one.”"],
          "A good summary tells Jun's goal, the problem with Hana's fear, his choice, and the result, without judging him.",
        ],
        [
          "¿Cuál es el mejor resumen objetivo del cuento?",
          "Jun quiere correr a las pozas lejanas, pero a su hermanita le dan miedo las rocas. Él se queda con ella en la poza más cercana, donde encuentran más de lo que esperaba.",
          ["Jun es un hermano impaciente que debió ser más amable con Hana desde el principio del día.", "Jun y Hana van a la playa al pie de un faro, miran las rocas verdes y cafés, encuentran un cangrejo ermitaño, una estrella de mar morada y una anémona verde, y regresan cuando sube la marea.", "Jun deja a Hana en la arena y explora él solo las pozas lejanas de la punta."],
          ["—Bueno —dijo—. Vamos a ver solo esta."],
          "Un buen resumen cuenta la meta de Jun, el problema del miedo de Hana, la decisión de él y el resultado, sin juzgarlo.",
        ],
      ),
    ],
  },
  {
    id: "the-map",
    level: 1,
    genre: "story",
    en: [
      {
        title: "The Map",
        paras: [
          "The week Kofi's family moved to Duluth, the snow was already up to the mailbox, and every street looked the same: white, quiet, and unfamiliar. In Houston, he had known which corner store sold the best mango ice pops and which neighbor's dog would follow you to school. Here he didn't even know which way the lake was.",
          "So he made a map. He taped four sheets of paper together on the kitchen table and drew his new building in the middle. Then he added what he knew: the bus stop, the school, the laundromat with the broken dryer. It took about five minutes. The rest of the paper stayed blank.",
          "On Monday, a girl named Ingrid showed him a shortcut behind the library, and he drew it in with a dotted line. On Wednesday, the man at the bakery, Mr. Kowalski, gave him a day-old cardamom roll for free, and Kofi drew a tiny roll next to the bakery and wrote “Mr. K.” Over the next few weeks the map filled up: the sledding hill where Ingrid's brothers raced, the steep street everyone called the Ski Jump, the bench where an old woman fed the pigeons and told him their names.",
          "By March, the paper was soft from being folded and unfolded. Kofi noticed something strange. When he looked at it, he didn't really see streets anymore. He saw Ingrid's shortcut, Mr. K's rolls, and the pigeon lady's bench. Almost every mark on the map had a person attached to it.",
          "One night his mother leaned over his shoulder. “You need more paper,” she said.",
          "Kofi looked at the blank edges. For the first time since the move, the empty space didn't look lonely. It looked like room to grow.",
        ],
      },
    ],
    es: [
      {
        title: "El mapa",
        paras: [
          "La semana en que la familia de Kofi se mudó a Duluth, la nieve ya llegaba al buzón, y todas las calles se veían iguales: blancas, calladas y desconocidas. En Houston, él sabía qué tiendita de la esquina vendía las mejores paletas de mango y qué perro del vecindario te seguía hasta la escuela. Aquí ni siquiera sabía para qué lado quedaba el lago.",
          "Así que hizo un mapa. Pegó cuatro hojas de papel con cinta sobre la mesa de la cocina y dibujó su nuevo edificio en el centro. Luego agregó lo que conocía: la parada del autobús, la escuela, la lavandería con la secadora descompuesta. Le tomó unos cinco minutos. El resto del papel se quedó en blanco.",
          "El lunes, una niña llamada Ingrid le enseñó un atajo detrás de la biblioteca, y él lo dibujó con una línea punteada. El miércoles, el señor de la panadería, el señor Kowalski, le regaló un pan de cardamomo del día anterior, y Kofi dibujó un panecito junto a la panadería y escribió “Sr. K.” En las semanas siguientes, el mapa se fue llenando: la colina donde los hermanos de Ingrid competían en trineo, la calle empinada que todos llamaban el Trampolín, la banca donde una señora mayor alimentaba a las palomas y le decía cómo se llamaba cada una.",
          "Para marzo, el papel estaba suave de tanto doblarlo y desdoblarlo. Kofi notó algo raro. Cuando lo miraba, ya no veía calles. Veía el atajo de Ingrid, los panes del Sr. K y la banca de la señora de las palomas. Casi cada marca del mapa tenía una persona detrás.",
          "Una noche, su mamá se asomó por encima de su hombro. —Te hace falta más papel —le dijo.",
          "Kofi miró los bordes en blanco. Por primera vez desde la mudanza, el espacio vacío no se veía solitario. Parecía espacio por llenar.",
        ],
      },
    ],
    qs: [
      q(
        "theme.statement",
        ["topic-not-theme", "plot-not-theme", "not-in-text"],
        [
          "Which statement best expresses a theme of the story?",
          "A new place starts to feel like home as you get to know the people in it.",
          ["Moving", "Kofi draws a map of his new neighborhood in Duluth and fills it in over the winter.", "It is better to live in a warm city than in a cold one."],
          ["Almost every mark on the map had a person attached to it."],
          "Kofi's map fills up with places tied to the people he meets, and by the end the city no longer feels lonely. The people are what make it home.",
        ],
        [
          "¿Qué oración expresa mejor un mensaje del cuento?",
          "Un lugar nuevo empieza a sentirse como un hogar cuando conoces a la gente que vive ahí.",
          ["La mudanza", "Kofi dibuja un mapa de su nuevo vecindario en Duluth y lo va llenando durante el invierno.", "Es mejor vivir en una ciudad cálida que en una fría."],
          ["Casi cada marca del mapa tenía una persona detrás."],
          "El mapa de Kofi se llena de lugares unidos a las personas que conoce, y al final la ciudad ya no se siente solitaria. La gente es lo que la vuelve un hogar.",
        ],
      ),
      q(
        "words.figurative",
        ["too-literal", "not-in-text", "contradicts-text"],
        [
          "What does the narrator mean in the last line: “It looked like room to grow”?",
          "The blank space now feels like a chance for new places and friends.",
          ["The map is big enough to cover a whole wall.", "Kofi wants to move again to a bigger apartment.", "The empty space reminds Kofi how lonely he still feels in his new city."],
          ["the empty space didn't look lonely"],
          "The blank edges once felt lonely. Now they look like space for the people and places Kofi has not found yet.",
        ],
        [
          "¿Qué quiere decir el narrador en la última línea: “Parecía espacio por llenar”?",
          "El espacio en blanco ahora se siente como una oportunidad para nuevos lugares y amigos.",
          ["El mapa es tan grande que puede cubrir una pared entera.", "Kofi quiere mudarse otra vez a un apartamento más grande.", "El espacio vacío le recuerda a Kofi lo solo que todavía se siente en su nueva ciudad fría."],
          ["el espacio vacío no se veía solitario"],
          "Antes, los bordes en blanco se sentían solitarios. Ahora parecen espacio para las personas y los lugares que Kofi todavía no ha encontrado.",
        ],
      ),
      q(
        "theme.develop",
        ["misses-the-change", "not-in-text", "contradicts-text"],
        [
          "How does the change in Kofi's map help develop the theme?",
          "It goes from a few buildings to places tied to people, showing that people make the city home.",
          ["The first version shows only the bus stop and the school, showing that Kofi cares only about getting places.", "The paper gets soft from folding, showing that Kofi is careless with his things.", "His mother says he needs more paper, showing that she wants him to stop drawing."],
          ["He saw Ingrid's shortcut, Mr. K's rolls, and the pigeon lady's bench."],
          "At first the map holds only buildings. By March it is full of people's places, which shows how Kofi's connections turn the city into home.",
        ],
        [
          "¿Cómo ayuda el cambio en el mapa de Kofi a desarrollar el mensaje?",
          "Pasa de tener unos cuantos edificios a tener lugares unidos a personas, y muestra que la gente vuelve la ciudad un hogar.",
          ["La primera versión solo muestra la parada del autobús y la escuela, y eso muestra que a Kofi solo le importa llegar a los lugares.", "El papel se pone suave de tanto doblarlo, y eso muestra que Kofi descuida sus cosas.", "Su mamá dice que le hace falta más papel, y eso muestra que quiere que deje de dibujar."],
          ["Veía el atajo de Ingrid, los panes del Sr. K y la banca de la señora de las palomas."],
          "Al principio el mapa solo tiene edificios. Para marzo está lleno de lugares de personas, lo que muestra cómo los lazos de Kofi vuelven la ciudad un hogar.",
        ],
      ),
      q(
        "infer.what",
        ["not-in-text", "contradicts-text", "overgeneralizes"],
        [
          "What can you infer about how Kofi felt during his first week in Duluth?",
          "He felt lost and lonely in a place where nothing was familiar.",
          ["He was excited to go sledding right away.", "He was glad to leave everything about his old life in Houston behind him.", "Everyone who moves to a cold city feels lonely forever."],
          ["Here he didn't even know which way the lake was."],
          "Kofi compares how well he knew Houston with how little he knows Duluth. Not even knowing where the lake is shows he felt lost.",
        ],
        [
          "¿Qué puedes inferir sobre cómo se sentía Kofi en su primera semana en Duluth?",
          "Se sentía perdido y solo en un lugar donde nada le era conocido.",
          ["Estaba emocionado por ir a deslizarse en trineo de inmediato.", "Estaba contento de dejar atrás todo lo de su vida anterior en Houston.", "Todos los que se mudan a una ciudad fría se sienten solos para siempre."],
          ["Aquí ni siquiera sabía para qué lado quedaba el lago."],
          "Kofi compara lo bien que conocía Houston con lo poco que conoce Duluth. No saber ni dónde queda el lago muestra que se sentía perdido.",
        ],
      ),
      q(
        "central.summary",
        ["adds-opinion", "misses-key-point", "contradicts-text"],
        [
          "Which is the best objective summary of the story?",
          "After moving to Duluth, Kofi draws a map. As he meets people and adds the places tied to them, the city starts to feel like home.",
          ["Kofi's map is a clever idea, and every kid who moves to a new city should make one just like it.", "Kofi tapes four sheets of paper together and draws a bus stop, a school, and a laundromat.", "Kofi gets lost in the snow during his first week, gives up on his map, and decides that his family should move back to Houston for good."],
          ["Over the next few weeks the map filled up"],
          "The summary needs the move, the map, the people who fill it, and how Kofi's feelings change, without opinions.",
        ],
        [
          "¿Cuál es el mejor resumen objetivo del cuento?",
          "Tras mudarse a Duluth, Kofi dibuja un mapa. Al conocer gente y agregar los lugares unidos a ella, la ciudad empieza a sentirse como un hogar.",
          ["El mapa de Kofi es una idea ingeniosa, y todos los niños que se mudan deberían hacer uno igual.", "Kofi pega cuatro hojas con cinta y dibuja una parada de autobús, una escuela y una lavandería.", "Kofi se pierde en la nieve en su primera semana, abandona su mapa a medio hacer y decide que su familia tiene que volver a Houston para siempre."],
          ["En las semanas siguientes, el mapa se fue llenando"],
          "El resumen necesita la mudanza, el mapa, las personas que lo llenan y cómo cambian los sentimientos de Kofi, sin opiniones.",
        ],
      ),
    ],
  },
  // ---------------------------------------------------------------------------------------------------
  // Level 1 poems
  {
    id: "river-keeps",
    level: 1,
    genre: "poem",
    en: [
      {
        title: "What the River Keeps",
        paras: [
          "In March the river is loud.\nIt shoulders the broken ice aside\nand hurries under the Elm Street bridge\nas if it is late for something important.",
          "In June it slows down and spreads out,\nlazy and brown and warm as bathwater,\nand lets the kids from Maple Street\nfloat on their backs and argue about the clouds.",
          "In August it shrinks to a whisper.\nRocks we have never seen before\nlift their gray heads out of the water,\nand the herons stand in it up to their knees.",
          "In October it goes quiet and thin.\nIt carries the maple leaves away,\none red boat at a time,\nand never tells us where they land.",
          "In January it hides\nunder a hard white lid,\nand you would swear it was gone for good\nif you didn't kneel at the frozen edge,",
          "press your ear against the ice,\nand hear it, small and steady underneath,\nstill traveling the way it always travels,\nstill keeping its one promise to the sea.",
          "My grandfather says I've changed this year,\ntaller and quieter, harder to read,\nalways somewhere else when he calls my name.\nMaybe so. But if he listens closely,\nhe will hear me underneath, still going.",
        ],
      },
    ],
    es: [
      {
        title: "Lo que guarda el río",
        paras: [
          "En marzo el río es ruidoso.\nEmpuja con el hombro el hielo roto\ny corre bajo el puente de la calle Olmo\ncomo si llegara tarde a algo importante.",
          "En junio se calma y se ensancha,\nperezoso, café y tibio como agua de baño,\ny deja que los niños de la calle Arce\nfloten bocarriba discutiendo sobre las nubes.",
          "En agosto se encoge hasta ser un susurro.\nPiedras que nunca habíamos visto\nasoman sus cabezas grises sobre el agua,\ny las garzas se paran en él con el agua a las rodillas.",
          "En octubre se queda callado y delgado.\nSe lleva las hojas del arce,\nun barquito rojo a la vez,\ny nunca nos dice dónde llegan.",
          "En enero se esconde\nbajo una tapa dura y blanca,\ny jurarías que se fue para siempre\nsi no te arrodillaras en la orilla helada,",
          "pegaras la oreja al hielo\ny lo oyeras, pequeño y constante allá abajo,\ntodavía viajando como siempre viaja,\ntodavía cumpliendo su única promesa al mar.",
          "Mi abuelo dice que este año he cambiado,\nmás alto y más callado, más difícil de entender,\nsiempre en otra parte cuando dice mi nombre.\nTal vez. Pero si escucha con atención,\nme oirá allá abajo, todavía en camino.",
        ],
      },
    ],
    qs: [
      q(
        "theme.statement",
        ["topic-not-theme", "plot-not-theme", "contradicts-text"],
        [
          "Which statement best expresses a theme of the poem?",
          "A person can change on the outside and still stay the same underneath.",
          ["Rivers", "The river is loud in March, warm in June, thin in October, and frozen over in January.", "Growing up means losing the person you used to be."],
          ["he will hear me underneath, still going"],
          "The river looks different every season but keeps flowing under the ice. The speaker says the same is true of them, which is the poem's message.",
        ],
        [
          "¿Qué oración expresa mejor un mensaje del poema?",
          "Una persona puede cambiar por fuera y seguir siendo la misma por dentro.",
          ["Los ríos", "El río es ruidoso en marzo, tibio en junio, delgado en octubre y se congela en enero.", "Crecer significa perder a la persona que eras antes."],
          ["me oirá allá abajo, todavía en camino"],
          "El río se ve distinto en cada estación, pero sigue corriendo bajo el hielo. La voz poética dice que a ella le pasa lo mismo, y ese es el mensaje del poema.",
        ],
      ),
      q(
        "theme.develop",
        ["contradicts-text", "too-narrow", "not-in-text"],
        [
          "How does the last stanza connect the speaker to the river?",
          "Like the frozen river, the speaker has changed on the surface but keeps going underneath.",
          ["The speaker has stopped changing, the way the river stops moving once it freezes in winter.", "The speaker has grown taller this year.", "The speaker wants to follow the river all the way to the sea."],
          ["still traveling the way it always travels", "he will hear me underneath, still going"],
          "The river is still traveling under the ice, and the speaker is still “going” underneath a quieter surface. The last stanza ties the two together.",
        ],
        [
          "¿Cómo conecta la última estrofa a la voz poética con el río?",
          "Como el río congelado, la voz poética cambió por fuera, pero sigue en camino por dentro.",
          ["La voz poética dejó de cambiar, igual que el río deja de moverse cuando se congela en invierno.", "La voz poética creció este año.", "La voz poética quiere seguir el río hasta llegar al mar."],
          ["todavía viajando como siempre viaja", "me oirá allá abajo, todavía en camino"],
          "El río sigue viajando bajo el hielo, y la voz poética sigue “en camino” por debajo de su silencio. La última estrofa une a los dos.",
        ],
      ),
      q(
        "words.figurative",
        ["too-literal", "not-in-text", "contradicts-text"],
        [
          "In stanza 4, what does the poet mean by “one red boat at a time”?",
          "The floating leaves look like tiny boats carried downstream.",
          ["Children are sailing small red boats down the river in the fall.", "The river is too thin in October for real boats to pass.", "The leaves are sinking to the bottom of the river one by one."],
          ["It carries the maple leaves away,"],
          "The red maple leaves float on the water like little boats. The phrase is a metaphor, not real boats.",
        ],
        [
          "En la estrofa 4, ¿qué quiere decir el poeta con “un barquito rojo a la vez”?",
          "Las hojas que flotan parecen barquitos que el río lleva corriente abajo.",
          ["Unos niños navegan barquitos rojos por el río en el otoño.", "En octubre el río está tan delgado que no pueden pasar barcos de verdad.", "Las hojas se hunden una por una hasta el fondo del río."],
          ["Se lleva las hojas del arce,"],
          "Las hojas rojas del arce flotan en el agua como barquitos. La frase es una metáfora, no habla de barcos de verdad.",
        ],
      ),
      q(
        "words.tone",
        ["opposite-tone", "too-narrow", "ignores-connotation"],
        [
          "Which word best describes the speaker's attitude toward the river?",
          "Admiring",
          ["Fearful", "Sad", "Indifferent"],
          ["still keeping its one promise to the sea"],
          "The speaker describes the river with respectful words like “steady” and “promise” and even compares themself to it. That shows admiration.",
        ],
        [
          "¿Qué palabra describe mejor la actitud de la voz poética hacia el río?",
          "Admirativa",
          ["Temerosa", "Triste", "Indiferente"],
          ["todavía cumpliendo su única promesa al mar"],
          "La voz poética describe el río con palabras de respeto como “constante” y “promesa”, y hasta se compara con él. Eso muestra admiración.",
        ],
      ),
      q(
        "infer.what",
        ["not-in-text", "contradicts-text", "overgeneralizes"],
        [
          "What can you infer about the speaker's grandfather from stanza 7?",
          "He has noticed the speaker growing up and pulling away a little.",
          ["He is proud that the speaker has grown taller than he is this year.", "He no longer pays any attention to the speaker.", "He believes all young people stop listening to their families."],
          ["always somewhere else when he calls my name"],
          "The grandfather sees that the speaker is quieter, harder to read, and often “somewhere else.” He has noticed a change and feels some distance.",
        ],
        [
          "¿Qué puedes inferir sobre el abuelo de la voz poética en la estrofa 7?",
          "Ha notado que su nieto está creciendo y se aleja un poco.",
          ["Está orgulloso de que su nieto ya sea más alto que él.", "Ya no le presta ninguna atención a su nieto.", "Cree que todos los jóvenes dejan de escuchar a su familia."],
          ["siempre en otra parte cuando dice mi nombre"],
          "El abuelo ve que su nieto está más callado, es más difícil de entender y a menudo está “en otra parte”. Notó un cambio y siente cierta distancia.",
        ],
      ),
    ],
  },
  {
    id: "grandmother-hands",
    level: 1,
    genre: "poem",
    en: [
      {
        title: "My Grandmother's Hands",
        paras: [
          "My grandmother's hands are not soft.\nThey are maps of everything they have done:\na white scar from a tin can in 1979,\na burn shaped like a comma from the comal.",
          "Every Sunday they wake before the sun.\nThey press the masa into perfect circles,\nflip each tortilla with bare fingertips,\nand never once complain about the heat.",
          "They have sewn the hems of my brothers' jeans\nand the torn knee of my soccer uniform.\nThey have braided my hair so tight\nI could feel my thoughts lining up.",
          "When I was small and sick with fever,\nthey rested on my forehead all night,\ncool as river stones,\nand the fever did not dare to stay.",
          "She does not say “I love you” very often.\nThe words seem too small for her mouth,\nlike shoes she has outgrown.\nShe says “Eat,” and “Sit up straight,” and “Did you finish?”",
          "But I have learned to read her hands\nthe way you read a letter from far away,\nslowly, more than once,\nfinding something new each time I read it.",
          "Someday my hands will be maps too.\nI hope they show the same roads:\nthe early mornings, the patient stitches,\nthe warm circle of a tortilla, given away.",
        ],
      },
    ],
    es: [
      {
        title: "Las manos de mi abuela",
        paras: [
          "Las manos de mi abuela no son suaves.\nSon mapas de todo lo que han hecho:\nuna cicatriz blanca de una lata en 1979,\nuna quemadura en forma de coma, del comal.",
          "Cada domingo despiertan antes que el sol.\nAplanan la masa en círculos perfectos,\nvoltean cada tortilla con la punta de los dedos\ny nunca, ni una sola vez, se quejan del calor.",
          "Han cosido el dobladillo de los pantalones de mis hermanos\ny la rodilla rota de mi uniforme de fútbol.\nMe han trenzado el pelo tan apretado\nque sentía mis ideas ponerse en fila.",
          "Cuando era pequeña y ardía en fiebre,\ndescansaron en mi frente toda la noche,\nfrescas como piedras de río,\ny la fiebre no se atrevió a quedarse.",
          "Ella no dice “te quiero” muy seguido.\nLas palabras parecen quedarle chicas,\ncomo zapatos que ya no le entran.\nDice “Come”, “Siéntate derecha” y “¿Ya terminaste?”.",
          "Pero he aprendido a leer sus manos\ncomo se lee una carta que viene de lejos:\ndespacio, más de una vez,\nencontrando algo nuevo cada vez que la leo.",
          "Algún día mis manos también serán mapas.\nOjalá muestren los mismos caminos:\nlas madrugadas, las puntadas pacientes,\nel círculo tibio de una tortilla regalada.",
        ],
      },
    ],
    qs: [
      q(
        "theme.statement",
        ["topic-not-theme", "plot-not-theme", "contradicts-text"],
        [
          "Which statement best expresses a theme of the poem?",
          "Love can be shown through everyday acts of care, not only through words.",
          ["Cooking", "The grandmother makes tortillas, sews jeans, braids hair, and stays up with the speaker during a fever.", "People who love each other always say so out loud."],
          ["But I have learned to read her hands"],
          "The grandmother rarely says “I love you,” but every stanza shows her caring through work. The speaker learns to read that love in her hands.",
        ],
        [
          "¿Qué oración expresa mejor un mensaje del poema?",
          "El cariño se puede mostrar con actos de cuidado de todos los días, no solo con palabras.",
          ["La cocina", "La abuela hace tortillas, cose pantalones, trenza el pelo y se queda despierta cuando la voz poética tiene fiebre.", "Las personas que se quieren siempre lo dicen en voz alta."],
          ["Pero he aprendido a leer sus manos"],
          "La abuela casi nunca dice “te quiero”, pero cada estrofa muestra su cariño a través del trabajo. La voz poética aprende a leer ese amor en sus manos.",
        ],
      ),
      q(
        "theme.develop",
        ["contradicts-text", "not-in-text", "off-point-evidence"],
        [
          "How does stanza 5 help develop the poem's theme?",
          "It shows that she rarely says loving words, so her actions must carry her love.",
          ["It shows that the grandmother is too strict and busy to care much about the speaker.", "It shows that the grandmother can barely speak because she is sick.", "It describes the Sunday mornings when the grandmother makes tortillas for the whole family."],
          ["The words seem too small for her mouth"],
          "Stanza 5 says the grandmother almost never says “I love you.” That is why the rest of the poem looks for her love in what her hands do.",
        ],
        [
          "¿Cómo ayuda la estrofa 5 a desarrollar el mensaje del poema?",
          "Muestra que casi no dice palabras de cariño, así que sus acciones tienen que expresar su amor.",
          ["Muestra que la abuela es demasiado estricta y está muy ocupada para que le importe la voz poética.", "Muestra que la abuela casi no puede hablar porque está enferma.", "Describe las mañanas de domingo en que la abuela hace tortillas para toda la familia."],
          ["Las palabras parecen quedarle chicas"],
          "La estrofa 5 dice que la abuela casi nunca dice “te quiero”. Por eso el resto del poema busca su amor en lo que hacen sus manos.",
        ],
      ),
      q(
        "words.figurative",
        ["too-literal", "contradicts-text", "not-in-text"],
        [
          "In stanza 5, what does the simile “like shoes she has outgrown” suggest?",
          "The words “I love you” feel too small for how much she cares.",
          ["The grandmother needs a new pair of shoes.", "The grandmother loves the speaker less as the speaker grows older.", "The grandmother is embarrassed by her old clothes and shoes."],
          ["like shoes she has outgrown"],
          "Outgrown shoes are too small for you. The simile says the words are too small to hold what the grandmother feels.",
        ],
        [
          "En la estrofa 5, ¿qué sugiere el símil “como zapatos que ya no le entran”?",
          "Decir “te quiero” le queda chico para todo lo que siente.",
          ["La abuela necesita un par de zapatos nuevos.", "La abuela quiere menos a la voz poética a medida que crece.", "La abuela se avergüenza de su ropa y sus zapatos viejos."],
          ["como zapatos que ya no le entran"],
          "Los zapatos que ya no te entran te quedan chicos. El símil dice que esas palabras son demasiado pequeñas para lo que siente la abuela.",
        ],
      ),
      q(
        "words.figurative",
        ["too-literal", "wrong-context-meaning", "contradicts-text"],
        [
          "In stanza 1, the speaker calls the hands “maps of everything they have done.” What does this metaphor mean?",
          "The marks on her hands tell the story of her work.",
          ["Her hands have lines that look like the roads on a map.", "She uses her hands to point the way when someone is lost.", "Her hands are soft and smooth from many years of rest."],
          ["a white scar from a tin can in 1979"],
          "A map shows where someone has been. The scars and burns on the grandmother's hands show the work she has done.",
        ],
        [
          "En la estrofa 1, la voz poética dice que las manos “Son mapas de todo lo que han hecho”. ¿Qué significa esta metáfora?",
          "Las marcas de sus manos cuentan la historia de su trabajo.",
          ["Sus manos tienen líneas que parecen los caminos de un mapa.", "Usa las manos para indicar el camino cuando alguien se pierde.", "Sus manos son suaves por tantos años de descanso."],
          ["una cicatriz blanca de una lata en 1979"],
          "Un mapa muestra por dónde ha pasado alguien. Las cicatrices y quemaduras de las manos de la abuela muestran el trabajo que ha hecho.",
        ],
      ),
      q(
        "infer.what",
        ["contradicts-text", "not-in-text", "overgeneralizes"],
        [
          "What can you infer about the speaker's feelings in the last stanza?",
          "The speaker admires her and wants to care for others the same way.",
          ["The speaker hopes never to work as hard as the grandmother does.", "The speaker plans to study maps and become a mapmaker someday.", "The speaker believes that all hands end up looking the same in old age, no matter what."],
          ["I hope they show the same roads"],
          "The speaker hopes their own hands will show “the same roads”: early mornings, patient stitches, and food given away. That shows admiration and a wish to care for others.",
        ],
        [
          "¿Qué puedes inferir sobre los sentimientos de la voz poética en la última estrofa?",
          "Admira a su abuela y quiere cuidar a otros de la misma manera.",
          ["Espera nunca tener que trabajar tanto como su abuela.", "Piensa estudiar mapas y dedicarse a dibujarlos algún día.", "Cree que todas las manos terminan viéndose igual en la vejez, pase lo que pase."],
          ["Ojalá muestren los mismos caminos"],
          "La voz poética desea que sus manos muestren “los mismos caminos”: madrugadas, puntadas pacientes y comida regalada. Eso muestra admiración y ganas de cuidar a otros.",
        ],
      ),
    ],
  },
  // ---------------------------------------------------------------------------------------------------
  // Level 1 informational
  {
    id: "alligator-crocodile",
    level: 1,
    genre: "informational",
    structure: {
      kind: "compare-contrast",
      en: [["Both", "But", "while", "also differ"], "The passage sets the two animals side by side: first how they are alike, then how their snouts, teeth, color, and homes differ."],
      es: [["Ambos", "Pero", "mientras que", "también se diferencian"], "El texto pone a los dos animales lado a lado: primero en qué se parecen y luego cómo se diferencian su hocico, sus dientes, su color y dónde viven."],
    },
    en: [
      {
        title: "Alligator or Crocodile?",
        paras: [
          "At first glance, alligators and crocodiles look almost identical. Both are large reptiles with armored skin, powerful tails, and eyes and nostrils on top of their heads, so they can watch and breathe while the rest of the body stays hidden underwater. Both belong to ancient groups whose relatives lived alongside the dinosaurs. But if you know where to look, telling them apart is not hard.",
          "The quickest clue is the snout. An alligator has a wide, rounded snout shaped like the letter U. A crocodile's snout is narrower and more pointed, closer to a V. The teeth offer a second clue. When an alligator closes its mouth, its upper jaw covers most of its lower teeth. When a crocodile closes its mouth, a large tooth near the front of the lower jaw still shows on each side, giving it a jagged grin.",
          "Color can help too, though less reliably. Adult alligators tend to be dark, almost black, while many crocodiles are lighter, closer to olive or tan.",
          "The two animals also differ in where they live. Alligators live mainly in fresh water, such as swamps, rivers, and lakes. Only two species exist: the American alligator of the southeastern United States and the much rarer Chinese alligator. Crocodiles are found in tropical parts of Africa, Asia, Australia, and the Americas, and many crocodiles have glands that remove extra salt from their bodies, which lets them live in salty coastal waters.",
          "There is one place on Earth where both animals live side by side in the wild: southern Florida. There, in the brackish water where rivers meet the sea, a lucky visitor might spot an American alligator and an American crocodile on the same muddy bank, and now you would know which is which.",
        ],
      },
    ],
    es: [
      {
        title: "¿Aligátor o cocodrilo?",
        paras: [
          "A primera vista, los aligátores y los cocodrilos parecen casi idénticos. Ambos son reptiles grandes con piel acorazada, colas poderosas y los ojos y las fosas nasales en lo alto de la cabeza, así que pueden mirar y respirar mientras el resto del cuerpo queda escondido bajo el agua. Ambos pertenecen a grupos muy antiguos cuyos parientes vivieron junto a los dinosaurios. Pero si sabes dónde mirar, no es difícil distinguirlos.",
          "La pista más rápida es el hocico. El aligátor tiene un hocico ancho y redondeado, con forma de U. El hocico del cocodrilo es más angosto y puntiagudo, más parecido a una V. Los dientes dan una segunda pista. Cuando el aligátor cierra la boca, la mandíbula de arriba tapa casi todos los dientes de abajo. Cuando el cocodrilo cierra la boca, todavía se ve a cada lado un diente grande cerca del frente de la mandíbula inferior, lo que le da una sonrisa dentada.",
          "El color también ayuda, aunque es menos confiable. Los aligátores adultos suelen ser oscuros, casi negros, mientras que muchos cocodrilos son más claros, de color oliva o canela.",
          "Los dos animales también se diferencian en dónde viven. Los aligátores viven sobre todo en agua dulce, como pantanos, ríos y lagos. Solo existen dos especies: el aligátor americano, del sureste de Estados Unidos, y el aligátor chino, mucho más escaso. Los cocodrilos viven en zonas tropicales de África, Asia, Australia y América, y muchos tienen glándulas que eliminan el exceso de sal de su cuerpo, lo que les permite vivir en las aguas saladas de la costa.",
          "Hay un solo lugar en la Tierra donde los dos animales viven juntos en estado salvaje: el sur de Florida. Allí, en el agua salobre donde los ríos se juntan con el mar, un visitante con suerte podría ver un aligátor americano y un cocodrilo americano en la misma orilla lodosa, y ahora sabría cuál es cuál.",
        ],
      },
    ],
    qs: [
      q(
        "structure.section",
        ["wrong-section-role", "wrong-section-role", "not-in-text"],
        [
          "What is the main purpose of paragraph 5?",
          "To end by naming the one place where both animals could be seen together.",
          ["To explain how crocodiles get rid of the extra salt in their bodies so they can live in salty water.", "To describe the differences between the two animals' snouts and teeth.", "To argue that Florida should protect crocodiles but not alligators."],
          ["There is one place on Earth where both animals live side by side in the wild: southern Florida."],
          "After the comparison, the last paragraph brings the two animals together in one real place and invites the reader to use the clues.",
        ],
        [
          "¿Cuál es el propósito principal del párrafo 5?",
          "Terminar con el único lugar donde se podría ver a los dos animales juntos.",
          ["Explicar cómo los cocodrilos eliminan el exceso de sal de su cuerpo para poder vivir en agua salada.", "Describir las diferencias entre el hocico y los dientes de los dos animales.", "Convencer de que Florida debería proteger a los cocodrilos, pero no a los aligátores."],
          ["Hay un solo lugar en la Tierra donde los dos animales viven juntos en estado salvaje: el sur de Florida."],
          "Después de la comparación, el último párrafo junta a los dos animales en un lugar real e invita al lector a usar las pistas.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "contradicts-text"],
        [
          "What is the central idea of the passage?",
          "Alligators and crocodiles look alike, but clear differences set them apart.",
          ["A crocodile has a large lower tooth that shows on each side when its mouth is closed.", "Reptiles are animals that have lived on Earth for a very long time.", "Alligators and crocodiles are so alike that even experts cannot tell them apart."],
          ["But if you know where to look, telling them apart is not hard."],
          "Every paragraph after the first gives a way to tell the animals apart: snout, teeth, color, and habitat.",
        ],
        [
          "¿Cuál es la idea central del texto?",
          "Los aligátores y los cocodrilos se parecen, pero hay diferencias claras entre ellos.",
          ["El cocodrilo tiene un diente inferior grande que se ve a cada lado cuando cierra la boca.", "Los reptiles son animales que han vivido en la Tierra durante mucho tiempo.", "Los aligátores y los cocodrilos se parecen tanto que ni los expertos pueden distinguirlos."],
          ["Pero si sabes dónde mirar, no es difícil distinguirlos."],
          "Cada párrafo después del primero da una manera de distinguir a los animales: el hocico, los dientes, el color y dónde viven.",
        ],
      ),
      q(
        "infer.what",
        ["not-in-text", "contradicts-text", "overgeneralizes"],
        [
          "Why does the author say color helps “though less reliably”?",
          "Some animals do not match the usual colors, so color alone could fool you.",
          ["Alligators change color from one season to the next.", "Color is the most dependable clue of all, even more than the snout or the teeth.", "Every crocodile is tan and every alligator is black."],
          ["Adult alligators tend to be dark, almost black, while many crocodiles are lighter"],
          "The author says alligators “tend to be” dark and “many” crocodiles are lighter. Those words leave room for exceptions, so color is a weaker clue than the snout or teeth.",
        ],
        [
          "¿Por qué el texto dice que el color ayuda, “aunque es menos confiable”?",
          "Algunos animales no tienen el color usual, así que el color solo puede engañar.",
          ["Los aligátores cambian de color de una estación a otra.", "El color es la pista más segura de todas, incluso más que el hocico o los dientes.", "Todos los cocodrilos son de color canela y todos los aligátores son negros."],
          ["Los aligátores adultos suelen ser oscuros, casi negros, mientras que muchos cocodrilos son más claros"],
          "El texto dice que los aligátores “suelen ser” oscuros y que “muchos” cocodrilos son más claros. Esas palabras dejan espacio para excepciones, así que el color es una pista más débil que el hocico o los dientes.",
        ],
      ),
      q(
        "words.connotation",
        ["too-literal", "wrong-context-meaning", "not-in-text"],
        [
          "The author says a crocodile's visible tooth gives it a “jagged grin.” What does the word “grin” add?",
          "It makes the closed mouth look like a sly smile, so readers can picture it.",
          ["It shows that crocodiles are friendly animals that enjoy meeting people up close.", "It means that the crocodile's teeth are broken.", "It shows that the author is afraid of crocodiles."],
          ["giving it a jagged grin"],
          "A grin is a wide smile. Using it for a row of showing teeth gives readers a vivid, slightly sly picture of the crocodile's face.",
        ],
        [
          "El texto dice que el diente visible le da al cocodrilo una “sonrisa dentada”. ¿Qué agrega la palabra “sonrisa”?",
          "Hace que la boca cerrada parezca una sonrisa pícara, así el lector puede imaginarla.",
          ["Muestra que los cocodrilos son animales amistosos a los que les gusta conocer gente.", "Quiere decir que los dientes del cocodrilo están rotos.", "Muestra que al autor le dan miedo los cocodrilos."],
          ["lo que le da una sonrisa dentada"],
          "Una sonrisa enseña los dientes. Usar esa palabra para los dientes que se asoman le da al lector una imagen viva, un poco pícara, de la cara del cocodrilo.",
        ],
      ),
    ],
  },
  {
    id: "braille-dots",
    level: 1,
    genre: "informational",
    structure: {
      kind: "chronological",
      en: [["in 1809", "In 1821", "By 1824", "two years later"], "The passage follows Louis Braille's life and his invention in time order, from his birth in 1809 to the school's adoption of braille in 1854."],
      es: [["en 1809", "En 1821", "Para 1824", "dos años después"], "El texto sigue la vida de Louis Braille y su invento en orden de tiempo, desde su nacimiento en 1809 hasta que la escuela adoptó el braille en 1854."],
    },
    en: [
      {
        title: "Six Dots That Changed Reading",
        paras: [
          "Louis Braille was born in 1809 in Coupvray, a small town east of Paris, France. When he was three years old, he was hurt in an accident in his father's leather workshop, and an infection that followed left him completely blind by the age of five.",
          "Louis was a bright student, and in 1819, at age ten, he won a place at the Royal Institute for Blind Youth in Paris, one of the first schools of its kind. The school owned a few books for blind readers, but they were printed with large raised letters. The books were huge and heavy, and reading them was painfully slow, because fingers had to trace the shape of each letter.",
          "In 1821, a former army captain named Charles Barbier visited the school. He had invented a system of raised dots that soldiers could read in the dark, which he called “night writing.” Barbier's code used up to twelve dots for each sound, which made it hard to feel under one fingertip, but Louis saw something important in it: dots were much easier to feel than the shapes of letters.",
          "Louis began experimenting. By 1824, when he was only fifteen, he had created a simpler system. Each letter fit in a small cell of just six dots, arranged in two columns of three, so a single fingertip could feel a whole letter at once. In 1829 he published his method, which also included a way to write music.",
          "For years, the system spread mostly from student to student. Louis Braille died in 1852, and two years later, in 1854, the school officially adopted his system. Today braille is used around the world, in many languages, on everything from library books to elevator buttons.",
        ],
      },
    ],
    es: [
      {
        title: "Seis puntos que cambiaron la lectura",
        paras: [
          "Louis Braille nació en 1809 en Coupvray, un pueblo pequeño al este de París, Francia. Cuando tenía tres años, se lastimó en un accidente en el taller de cuero de su padre, y una infección posterior lo dejó completamente ciego a los cinco años.",
          "Louis era un estudiante brillante, y en 1819, a los diez años, obtuvo un lugar en el Real Instituto para Jóvenes Ciegos de París, una de las primeras escuelas de su tipo. La escuela tenía algunos libros para lectores ciegos, pero estaban impresos con letras grandes en relieve. Los libros eran enormes y pesados, y leerlos era dolorosamente lento, porque los dedos tenían que recorrer la forma de cada letra.",
          "En 1821, un excapitán del ejército llamado Charles Barbier visitó la escuela. Había inventado un sistema de puntos en relieve que los soldados podían leer en la oscuridad, al que llamó “escritura nocturna”. El código de Barbier usaba hasta doce puntos para cada sonido, lo que lo hacía difícil de sentir con la yema de un dedo, pero Louis vio algo importante: los puntos eran mucho más fáciles de sentir que la forma de las letras.",
          "Louis empezó a experimentar. Para 1824, cuando tenía apenas quince años, había creado un sistema más sencillo. Cada letra cabía en una celda pequeña de solo seis puntos, ordenados en dos columnas de tres, así que la yema de un dedo podía sentir una letra completa de una vez. En 1829 publicó su método, que también incluía una manera de escribir música.",
          "Durante años, el sistema se difundió sobre todo de estudiante a estudiante. Louis Braille murió en 1852, y dos años después, en 1854, la escuela adoptó oficialmente su sistema. Hoy el braille se usa en todo el mundo, en muchos idiomas, en todo tipo de cosas, desde libros de biblioteca hasta botones de elevador.",
        ],
      },
    ],
    qs: [
      q(
        "structure.section",
        ["wrong-section-role", "contradicts-text", "not-in-text"],
        [
          "How does paragraph 3 connect to paragraph 4?",
          "Paragraph 3 shows the idea Louis learned from, and paragraph 4 shows how he improved it.",
          ["Paragraph 3 describes Louis's early childhood, and paragraph 4 describes the end of his life.", "Paragraph 4 explains that Louis gave up on dots and went back to raised letters.", "Paragraph 3 explains why Louis was chosen for the school in Paris."],
          ["dots were much easier to feel than the shapes of letters", "By 1824, when he was only fifteen, he had created a simpler system."],
          "Paragraph 3 introduces Barbier's twelve-dot code and what Louis noticed about it. Paragraph 4 shows what he built from that idea: a six-dot cell one fingertip could feel at once.",
        ],
        [
          "¿Cómo se conecta el párrafo 3 con el párrafo 4?",
          "El párrafo 3 muestra la idea de la que Louis aprendió, y el párrafo 4 muestra cómo la mejoró.",
          ["El párrafo 3 describe la primera infancia de Louis, y el párrafo 4 describe el final de su vida.", "El párrafo 4 explica que Louis abandonó los puntos y volvió a las letras en relieve.", "El párrafo 3 explica por qué eligieron a Louis para la escuela de París."],
          ["los puntos eran mucho más fáciles de sentir que la forma de las letras", "Para 1824, cuando tenía apenas quince años, había creado un sistema más sencillo."],
          "El párrafo 3 presenta el código de doce puntos de Barbier y lo que Louis notó en él. El párrafo 4 muestra lo que construyó con esa idea: una celda de seis puntos que una sola yema podía sentir de una vez.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "not-in-text"],
        [
          "What is the central idea of the passage?",
          "Louis Braille, blind from childhood, turned an idea about raised dots into a reading system now used worldwide.",
          ["Charles Barbier invented a code of raised dots so that soldiers could read messages in the dark without using a light.", "Many inventions change the way people live and work.", "Louis Braille became famous in Paris for writing music for blind students."],
          ["Today braille is used around the world"],
          "The passage traces how Louis went from slow raised-letter books to his six-dot system, and it ends with braille used around the world.",
        ],
        [
          "¿Cuál es la idea central del texto?",
          "Louis Braille, ciego desde niño, convirtió una idea de puntos en relieve en un sistema de lectura usado en todo el mundo.",
          ["Charles Barbier inventó un código de puntos en relieve para que los soldados pudieran leer mensajes a oscuras, sin encender ninguna luz.", "Muchos inventos cambian la manera en que la gente vive y trabaja.", "Louis Braille se hizo famoso en París por componer música para estudiantes ciegos."],
          ["Hoy el braille se usa en todo el mundo"],
          "El texto cuenta cómo Louis pasó de los libros lentos de letras en relieve a su sistema de seis puntos, y termina con el braille usado en todo el mundo.",
        ],
      ),
      q(
        "infer.what",
        ["contradicts-text", "not-in-text", "overgeneralizes"],
        [
          "What can you infer from the fact that braille “spread mostly from student to student” before 1854?",
          "Students found the system useful before the school officially accepted it.",
          ["The teachers taught braille in every class from the very first day.", "Braille was a secret code that only former soldiers in the army knew how to read.", "Every blind person in France had learned braille by 1830."],
          ["For years, the system spread mostly from student to student."],
          "The school did not adopt braille until 1854, yet students kept passing it to each other. They would only do that if they found it useful.",
        ],
        [
          "¿Qué puedes inferir del hecho de que el braille “se difundió sobre todo de estudiante a estudiante” antes de 1854?",
          "A los estudiantes les sirvió el sistema antes de que la escuela lo aceptara oficialmente.",
          ["Los maestros enseñaron braille en todas las clases desde el primer día.", "El braille era un código secreto que solo sabían leer los antiguos soldados del ejército francés.", "Todas las personas ciegas de Francia habían aprendido braille para 1830."],
          ["Durante años, el sistema se difundió sobre todo de estudiante a estudiante."],
          "La escuela no adoptó el braille hasta 1854, pero los estudiantes se lo seguían pasando entre ellos. Solo lo harían si les resultaba útil.",
        ],
      ),
      q(
        "words.connotation",
        ["too-literal", "not-in-text", "opposite-tone"],
        [
          "In paragraph 2, the author says reading the old books was “painfully slow.” Why does the author choose the word “painfully”?",
          "To stress how frustrating and tiring the old way of reading was.",
          ["To show that touching the raised letters hurt the students' fingers.", "To show that the students did not want to learn to read.", "To suggest that the old books were a fun and pleasant challenge."],
          ["reading them was painfully slow"],
          "“Painfully” here means “so much that it was hard to bear.” It stresses how slow and frustrating the old books were, which makes Louis's invention matter more.",
        ],
        [
          "En el párrafo 2, el texto dice que leer los libros viejos era “dolorosamente lento”. ¿Por qué el autor elige la palabra “dolorosamente”?",
          "Para resaltar lo frustrante y cansado que era leer de la manera antigua.",
          ["Para mostrar que tocar las letras en relieve lastimaba los dedos de los estudiantes.", "Para mostrar que los estudiantes no querían aprender a leer.", "Para sugerir que los libros viejos eran un reto divertido y agradable."],
          ["leerlos era dolorosamente lento"],
          "Aquí “dolorosamente” quiere decir “tanto que costaba soportarlo”. Resalta lo lentos y frustrantes que eran los libros viejos, y eso hace más importante el invento de Louis.",
        ],
      ),
    ],
  },
  {
    id: "dust-bowl",
    level: 1,
    genre: "informational",
    structure: {
      kind: "cause-effect",
      en: [["because", "The first cause", "As a result", "most visible effect"], "The passage explains the causes of the Dust Bowl, plowing and drought, and then its effects, from the storms to the families who left."],
      es: [["porque", "La primera causa", "Como resultado", "El efecto más visible"], "El texto explica las causas del desastre, el arado y la sequía, y luego sus efectos, desde las tormentas hasta las familias que se fueron."],
    },
    en: [
      {
        title: "What Caused the Dust Bowl?",
        paras: [
          "During the 1930s, huge dust storms swept across the southern Great Plains, a region that includes parts of Oklahoma, Texas, Kansas, Colorado, and New Mexico. The disaster became known as the Dust Bowl. It did not have a single cause. It happened because human choices and natural forces combined at the worst possible time.",
          "The first cause was the plow. The Plains had once been covered in tough prairie grasses whose deep, tangled roots held the soil in place, even in dry years. But when wheat prices rose and new tractors made plowing fast, farmers turned millions of acres of grassland into wheat fields. While the rain lasted, harvests were huge, so even more grass was plowed under.",
          "The second cause was the weather. In the early 1930s, a long drought dried the bare fields. Without roots to anchor it, the loose topsoil had nothing to hold it down. As a result, when the strong winds of the Plains blew, they lifted the soil into enormous clouds of dust.",
          "The most visible effect was the storms themselves. These “black blizzards” could turn day into night. Dust piled against fences like snowdrifts, buried farm equipment, and crept into houses through cracks around windows and doors. Families hung wet sheets over doorways and still found grit in their food.",
          "The effects reached far beyond the storms. Crops failed year after year, and many families lost their farms. Hundreds of thousands of people left the region, many heading west to California in search of work. The disaster also changed how Americans thought about land, because it showed that the way people farm can affect the soil for generations.",
        ],
      },
    ],
    es: [
      {
        title: "¿Qué causó el Cuenco de Polvo?",
        paras: [
          "Durante la década de 1930, enormes tormentas de polvo azotaron el sur de las Grandes Llanuras de Estados Unidos, una región que incluye partes de Oklahoma, Texas, Kansas, Colorado y Nuevo México. El desastre se conoció como el Dust Bowl, o “Cuenco de Polvo”. No tuvo una sola causa. Ocurrió porque las decisiones humanas y las fuerzas de la naturaleza se juntaron en el peor momento posible.",
          "La primera causa fue el arado. Las Llanuras habían estado cubiertas de pastos resistentes, cuyas raíces profundas y enredadas sujetaban el suelo, incluso en los años secos. Pero cuando subió el precio del trigo y los tractores nuevos hicieron que arar fuera rápido, los agricultores convirtieron millones de acres de pastizal en campos de trigo. Mientras duraron las lluvias, las cosechas fueron enormes, así que se aró todavía más pasto.",
          "La segunda causa fue el clima. A principios de la década de 1930, una larga sequía secó los campos desnudos. Sin raíces que la sujetaran, la capa superior del suelo quedó suelta, sin nada que la retuviera. Como resultado, cuando soplaban los fuertes vientos de las Llanuras, levantaban la tierra en nubes gigantescas de polvo.",
          "El efecto más visible fueron las tormentas mismas. Estas “ventiscas negras” podían convertir el día en noche. El polvo se amontonaba contra las cercas como montones de nieve, enterraba la maquinaria agrícola y se metía en las casas por las rendijas de puertas y ventanas. Las familias colgaban sábanas mojadas en las puertas y aun así encontraban tierra en la comida.",
          "Los efectos llegaron mucho más allá de las tormentas. Las cosechas se perdieron año tras año, y muchas familias perdieron sus granjas. Cientos de miles de personas dejaron la región, y muchas se fueron al oeste, a California, en busca de trabajo. El desastre también cambió la manera en que los estadounidenses pensaban sobre la tierra, porque mostró que la forma de cultivar puede afectar el suelo por generaciones.",
        ],
      },
    ],
    qs: [
      q(
        "structure.section",
        ["wrong-section-role", "not-in-text", "wrong-section-role"],
        [
          "What is the role of paragraph 4 in the passage?",
          "It describes the most visible result of the causes explained before it.",
          ["It explains the second cause of the Dust Bowl, the long drought of the early 1930s.", "It tells how farmers finally solved the problem of blowing dust.", "It introduces the region where the Dust Bowl took place."],
          ["The most visible effect was the storms themselves."],
          "Paragraphs 2 and 3 give the two causes. Paragraph 4 turns to the effects, starting with the storms people could see.",
        ],
        [
          "¿Qué función tiene el párrafo 4 en el texto?",
          "Describe el resultado más visible de las causas que se explicaron antes.",
          ["Explica la segunda causa del desastre: la larga sequía de principios de la década de 1930.", "Cuenta cómo los agricultores por fin resolvieron el problema del polvo.", "Presenta la región donde ocurrió el desastre."],
          ["El efecto más visible fueron las tormentas mismas."],
          "Los párrafos 2 y 3 dan las dos causas. El párrafo 4 pasa a los efectos, empezando por las tormentas que la gente podía ver.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "contradicts-text"],
        [
          "What is the central idea of the passage?",
          "Plowing removed the grass that held the soil, and then drought and wind blew the soil away.",
          ["Families hung wet sheets over their doorways and windows to try to keep the blowing dust out of their homes.", "Weather can change the way people live.", "The Dust Bowl was caused only by a lack of rain."],
          ["It happened because human choices and natural forces combined at the worst possible time."],
          "The passage says the Dust Bowl had more than one cause: farmers plowed up the grass, and then drought and wind did the rest.",
        ],
        [
          "¿Cuál es la idea central del texto?",
          "El arado quitó el pasto que sujetaba el suelo, y luego la sequía y el viento se llevaron la tierra.",
          ["Las familias colgaban sábanas mojadas en puertas y ventanas para intentar que el polvo no entrara a sus casas.", "El clima puede cambiar la forma en que vive la gente.", "El desastre se debió solo a la falta de lluvia."],
          ["Ocurrió porque las decisiones humanas y las fuerzas de la naturaleza se juntaron en el peor momento posible."],
          "El texto dice que el desastre tuvo más de una causa: los agricultores araron el pasto, y luego la sequía y el viento hicieron el resto.",
        ],
      ),
      q(
        "infer.what",
        ["not-in-text", "contradicts-text", "overgeneralizes"],
        [
          "Based on paragraph 2, why did farmers keep plowing up more grassland?",
          "Big harvests in rainy years made plowing seem safe and profitable.",
          ["They knew a long drought was coming and wanted to harvest as much wheat as they could before it arrived.", "The government had ordered them to protect the prairie grass.", "Farmers never think about what might happen in the future."],
          ["While the rain lasted, harvests were huge, so even more grass was plowed under."],
          "When it rained, the wheat grew well and prices were high. Those good years made more plowing look like a smart choice.",
        ],
        [
          "Según el párrafo 2, ¿por qué los agricultores siguieron arando más pastizal?",
          "Las grandes cosechas de los años lluviosos hacían que arar pareciera seguro y rentable.",
          ["Sabían que venía una larga sequía y querían cosechar todo el trigo posible antes de que llegara.", "El gobierno les había ordenado proteger el pasto de la pradera.", "Los agricultores nunca piensan en lo que podría pasar en el futuro."],
          ["Mientras duraron las lluvias, las cosechas fueron enormes, así que se aró todavía más pasto."],
          "Cuando llovía, el trigo crecía bien y los precios estaban altos. Esos buenos años hacían que arar más pareciera una buena decisión.",
        ],
      ),
      q(
        "words.figurative",
        ["too-literal", "not-in-text", "contradicts-text"],
        [
          "Why does the author call the dust storms “black blizzards”?",
          "Like snowstorms, they filled the air and piled up drifts, but with dark dust.",
          ["The storms brought dark-colored snow to the Plains.", "The storms happened only in the coldest months of winter.", "The storms were milder and much shorter than the regular snowstorms of a Plains winter."],
          ["Dust piled against fences like snowdrifts"],
          "A blizzard is a storm so thick you cannot see. The dust storms were like that, and the dust even piled up like snow, but it was dark soil.",
        ],
        [
          "¿Por qué el autor llama a las tormentas de polvo “ventiscas negras”?",
          "Como las tormentas de nieve, llenaban el aire y formaban montones, pero de polvo oscuro.",
          ["Las tormentas traían nieve de color oscuro a las Llanuras.", "Las tormentas solo ocurrían en los meses más fríos del invierno.", "Las tormentas eran más suaves y mucho más cortas que las tormentas de nieve del invierno en las Llanuras."],
          ["El polvo se amontonaba contra las cercas como montones de nieve"],
          "Una ventisca es una tormenta tan espesa que no se ve nada. Las tormentas de polvo eran así, y el polvo hasta se amontonaba como nieve, pero era tierra oscura.",
        ],
      ),
    ],
  },
  {
    id: "leaf-color",
    level: 1,
    genre: "informational",
    structure: {
      kind: "cause-effect",
      en: [["because", "As a result", "a different cause", "leads to"], "The passage explains what causes each fall color: the loss of green chlorophyll reveals yellows and oranges, and new pigments made in the fall cause the reds."],
      es: [["porque", "Como resultado", "otra causa", "provoca"], "El texto explica qué causa cada color del otoño: al perderse la clorofila verde aparecen los amarillos y naranjas, y los pigmentos nuevos que se fabrican en otoño causan los rojos."],
    },
    en: [
      {
        title: "Why Leaves Change Color",
        paras: [
          "Every autumn, the forests of New England, the upper Midwest, and many other places turn red, orange, and gold. The color change can look like magic, but it has a clear scientific explanation, and it begins with the green that leaves wear all summer.",
          "Leaves are green because they are packed with chlorophyll, a pigment that captures energy from sunlight so the tree can make sugar from water and carbon dioxide. Chlorophyll breaks down quickly in bright light, so during the growing season the tree keeps making more. As long as it does, the green covers up every other color in the leaf.",
          "In autumn, nights grow longer and temperatures drop. These changes signal the tree to prepare for winter, when its thin leaves would freeze and be useless. As a result, the tree slowly stops making chlorophyll and begins to seal off each leaf where its stem meets the branch. As the green fades, yellow and orange pigments called carotenoids, which were in the leaf all along, finally show through.",
          "Reds and purples have a different cause. In some trees, such as red maples and sugar maples, sugar trapped in the leaves is turned into new pigments called anthocyanins. Because these pigments are made in the fall, the weather matters. A run of sunny days and cool, but not freezing, nights tends to produce the brightest reds. A warm, cloudy autumn often leads to duller colors.",
          "Eventually, the sealed-off leaf breaks free and falls. The bare tree saves its energy through the winter, and in spring it grows a fresh set of leaves. Then the cycle begins again.",
        ],
      },
    ],
    es: [
      {
        title: "¿Por qué cambian de color las hojas?",
        paras: [
          "Cada otoño, los bosques de Nueva Inglaterra, del norte del Medio Oeste y de muchos otros lugares se pintan de rojo, naranja y dorado. El cambio de color puede parecer magia, pero tiene una explicación científica clara, y empieza con el verde que tienen las hojas todo el verano.",
          "Las hojas son verdes porque están llenas de clorofila, un pigmento que capta la energía del sol para que el árbol pueda fabricar azúcar a partir de agua y dióxido de carbono. La clorofila se descompone rápido con la luz intensa, así que durante la temporada de crecimiento el árbol fabrica más sin parar. Mientras lo hace, el verde tapa todos los demás colores de la hoja.",
          "En otoño, las noches se alargan y las temperaturas bajan. Estos cambios le indican al árbol que debe prepararse para el invierno, cuando sus hojas delgadas se congelarían y ya no le servirían. Como resultado, el árbol deja poco a poco de fabricar clorofila y empieza a sellar cada hoja en el punto donde el tallo se une a la rama. Al desaparecer el verde, por fin se asoman unos pigmentos amarillos y anaranjados llamados carotenoides, que estuvieron en la hoja todo el tiempo.",
          "Los rojos y los morados tienen otra causa. En algunos árboles, como el arce rojo y el arce azucarero, el azúcar atrapado en las hojas se convierte en pigmentos nuevos llamados antocianinas. Como estos pigmentos se fabrican en otoño, el clima importa. Una racha de días soleados y noches frescas, pero sin helada, suele producir los rojos más intensos. Un otoño cálido y nublado a menudo provoca colores más apagados.",
          "Con el tiempo, la hoja sellada se desprende y cae. El árbol, ya sin hojas, ahorra energía durante el invierno, y en primavera le sale un juego nuevo de hojas. Luego el ciclo vuelve a empezar.",
        ],
      },
    ],
    qs: [
      q(
        "structure.section",
        ["contradicts-text", "wrong-section-role", "wrong-section-role"],
        [
          "Why does the author explain chlorophyll in paragraph 2, before describing the fall colors?",
          "Readers need to know what keeps leaves green to understand why the green fades.",
          ["To show that chlorophyll is the pigment that turns maple leaves bright red in the fall.", "To describe the weather that produces the brightest colors.", "To explain how the tree seals off each leaf before it falls."],
          ["As long as it does, the green covers up every other color in the leaf."],
          "Paragraph 2 explains that chlorophyll hides the other colors. That sets up paragraph 3, where the chlorophyll fades and the hidden colors appear.",
        ],
        [
          "¿Por qué el autor explica la clorofila en el párrafo 2, antes de describir los colores del otoño?",
          "Hay que saber qué mantiene verdes las hojas para entender por qué se pierde el verde.",
          ["Para mostrar que la clorofila es el pigmento que pinta de rojo intenso las hojas del arce en otoño.", "Para describir el clima que produce los colores más intensos.", "Para explicar cómo el árbol sella cada hoja antes de que caiga."],
          ["Mientras lo hace, el verde tapa todos los demás colores de la hoja."],
          "El párrafo 2 explica que la clorofila esconde los otros colores. Eso prepara el párrafo 3, donde la clorofila desaparece y se ven los colores escondidos.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "contradicts-text"],
        [
          "What is the central idea of the passage?",
          "Fall colors appear as trees stop making chlorophyll before winter.",
          ["Sugar maples can turn a very bright red in the fall.", "Plants depend on sunlight to survive.", "Leaves change color because cold weather freezes them and damages the green parts."],
          ["the tree slowly stops making chlorophyll"],
          "The passage explains that when the tree stops making chlorophyll, hidden yellows show through, and some trees make new reds.",
        ],
        [
          "¿Cuál es la idea central del texto?",
          "El otoño se pinta de colores cuando los árboles dejan de fabricar clorofila.",
          ["El arce azucarero puede ponerse de un rojo muy intenso en otoño, sobre todo si hace sol.", "Las plantas dependen de la luz del sol para sobrevivir.", "Las hojas cambian de color porque el frío las congela y daña primero sus partes verdes."],
          ["el árbol deja poco a poco de fabricar clorofila"],
          "El texto explica que cuando el árbol deja de fabricar clorofila se asoman los amarillos escondidos, y algunos árboles fabrican rojos nuevos.",
        ],
      ),
      q(
        "infer.what",
        ["contradicts-text", "not-in-text", "overgeneralizes"],
        [
          "Why might the same maple tree look brighter red one fall than the next?",
          "That fall had more sunny days and cool nights, so the leaves made more red pigment.",
          ["The tree made more chlorophyll that year, so the leaves stayed green much longer than usual.", "The tree is older now, so its leaves have grown larger.", "A maple tree always turns exactly the same shade every year."],
          ["A run of sunny days and cool, but not freezing, nights tends to produce the brightest reds."],
          "Red pigments are made in the fall, so the fall weather matters. Sunny days and cool nights lead to brighter reds than a warm, cloudy fall.",
        ],
        [
          "¿Por qué el mismo arce podría verse de un rojo más intenso un otoño que el siguiente?",
          "Ese otoño tuvo más días soleados y noches frescas, así que las hojas fabricaron más pigmento rojo.",
          ["Ese año el árbol fabricó más clorofila, así que las hojas siguieron verdes mucho más tiempo de lo normal.", "El árbol ya es más viejo, así que sus hojas crecieron más.", "Un arce siempre se pone exactamente del mismo tono cada año."],
          ["Una racha de días soleados y noches frescas, pero sin helada, suele producir los rojos más intensos."],
          "Los pigmentos rojos se fabrican en otoño, así que el clima del otoño importa. Los días soleados y las noches frescas dan rojos más intensos que un otoño cálido y nublado.",
        ],
      ),
      q(
        "words.connotation",
        ["too-literal", "opposite-tone", "contradicts-text"],
        [
          "In paragraph 1, the author says the color change “can look like magic.” Why include this phrase?",
          "To admit how amazing the colors seem before showing that science explains them.",
          ["To tell readers that the fall colors are really caused by a kind of forest magic.", "To suggest that the color change is boring and ordinary.", "To show that scientists still cannot explain the colors."],
          ["The color change can look like magic, but it has a clear scientific explanation"],
          "The author agrees the colors seem magical, then says “but” and gives the science. The phrase draws readers in before the explanation.",
        ],
        [
          "En el párrafo 1, el texto dice que el cambio de color “puede parecer magia”. ¿Para qué incluye el autor esta frase?",
          "Para reconocer lo asombrosos que parecen los colores antes de mostrar que la ciencia los explica.",
          ["Para decirles a los lectores que los colores en realidad los causa una especie de magia del bosque.", "Para sugerir que el cambio de color es aburrido y común.", "Para mostrar que los científicos todavía no pueden explicar los colores."],
          ["El cambio de color puede parecer magia, pero tiene una explicación científica clara"],
          "El autor acepta que los colores parecen mágicos, luego dice “pero” y da la explicación científica. La frase atrapa al lector antes de la explicación.",
        ],
      ),
    ],
  },
  {
    id: "heat-island",
    level: 1,
    genre: "informational",
    structure: {
      kind: "problem-solution",
      en: [["The problem", "One solution", "Another solution", "fixes"], "The passage explains a problem, cities that trap extra heat, and then describes three ways to cool them."],
      es: [["El problema", "Una solución", "Otra solución", "soluciones"], "El texto explica un problema, las ciudades que atrapan calor extra, y luego describe tres maneras de refrescarlas."],
    },
    en: [
      {
        title: "Cooling Down a Hot City",
        paras: [
          "On a summer afternoon, a city can be several degrees hotter than the farmland and forests around it. Scientists call this an urban heat island. The problem comes from the city itself. Dark roofs and asphalt soak up sunlight all day and give off that heat long after sunset. Buildings block breezes, and there are fewer trees and plants to cool the air.",
          "The extra heat is more than uncomfortable. It raises electricity bills as people run air conditioners longer, and it can be dangerous for older adults, young children, and anyone who works outside. So cities across the country have been looking for ways to cool down.",
          "One solution is to plant trees. A tree's shade keeps pavement and buildings from heating up, and its leaves release water vapor that cools the air around them. Some cities have set goals to shade more of their streets with trees, starting with the neighborhoods that have the least shade.",
          "Another solution is to change the color of roofs and roads. A white or light-colored “cool roof” reflects much of the sunlight that a black roof would absorb, so the building beneath it stays cooler. A few cities have tested light-colored coatings on streets and playgrounds for the same reason.",
          "A third idea is to grow plants on the roofs themselves. These green roofs act like a sponge and a sunshade at once, soaking up rainwater and keeping the building below cooler.",
          "None of these fixes works alone, and each has costs. Trees take years to grow, and coatings must be renewed. But together they can make a hot city a little more livable, one street at a time.",
        ],
      },
    ],
    es: [
      {
        title: "Cómo refrescar una ciudad caliente",
        paras: [
          "En una tarde de verano, una ciudad puede estar varios grados más caliente que los campos y bosques que la rodean. Los científicos llaman a esto una isla de calor urbana. El problema viene de la ciudad misma. Los techos oscuros y el asfalto absorben la luz del sol todo el día y sueltan ese calor mucho después de que se pone el sol. Los edificios bloquean la brisa, y hay menos árboles y plantas que refresquen el aire.",
          "El calor extra es más que una molestia. Hace que suba la cuenta de luz porque la gente usa el aire acondicionado más tiempo, y puede ser peligroso para las personas mayores, los niños pequeños y cualquiera que trabaje al aire libre. Por eso, ciudades de todo el país buscan maneras de refrescarse.",
          "Una solución es plantar árboles. La sombra de un árbol evita que el pavimento y los edificios se calienten, y sus hojas sueltan vapor de agua que refresca el aire a su alrededor. Algunas ciudades se han puesto metas para dar sombra a más calles con árboles, empezando por los vecindarios que tienen menos sombra.",
          "Otra solución es cambiar el color de techos y calles. Un “techo fresco”, blanco o de color claro, refleja gran parte de la luz que un techo negro absorbería, así que el edificio de abajo se mantiene más fresco. Algunas ciudades han probado recubrimientos claros en calles y patios de juego por la misma razón.",
          "Una tercera idea es sembrar plantas en los techos mismos. Estos techos verdes funcionan a la vez como una esponja y una sombrilla: absorben el agua de lluvia y mantienen más fresco el edificio de abajo.",
          "Ninguna de estas soluciones funciona sola, y cada una tiene costos. Los árboles tardan años en crecer, y los recubrimientos hay que renovarlos. Pero juntas pueden hacer que una ciudad caliente sea un poco más habitable, calle por calle.",
        ],
      },
    ],
    qs: [
      q(
        "structure.section",
        ["wrong-section-role", "wrong-section-role", "not-in-text"],
        [
          "What is the purpose of paragraph 2?",
          "To show why the extra heat is a problem worth solving.",
          ["To describe the first solution, planting trees along city streets and in the neighborhoods with the least shade.", "To explain why dark roofs and asphalt soak up so much sunlight.", "To prove that air conditioners are the main cause of heat islands."],
          ["The extra heat is more than uncomfortable."],
          "Paragraph 1 names the problem. Paragraph 2 explains why it matters, its costs and dangers, before the passage turns to solutions.",
        ],
        [
          "¿Cuál es el propósito del párrafo 2?",
          "Mostrar por qué vale la pena resolver el problema del calor extra.",
          ["Describir la primera solución: plantar árboles en las calles y en los vecindarios con menos sombra.", "Explicar por qué los techos oscuros y el asfalto absorben tanta luz del sol.", "Probar que los aires acondicionados son la causa principal de las islas de calor."],
          ["El calor extra es más que una molestia."],
          "El párrafo 1 nombra el problema. El párrafo 2 explica por qué importa, sus costos y peligros, antes de que el texto pase a las soluciones.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "not-in-text"],
        [
          "What is the central idea of the passage?",
          "Cities trap extra heat, but trees, light-colored surfaces, and green roofs can help.",
          ["Green roofs soak up rainwater like a sponge and keep the building below them cooler.", "Summer weather can be uncomfortable.", "Cities should tear up all of their asphalt roads."],
          ["But together they can make a hot city a little more livable"],
          "The passage explains why cities get hotter and then spends most of its paragraphs on three ways to cool them.",
        ],
        [
          "¿Cuál es la idea central del texto?",
          "Las ciudades atrapan calor extra, pero los árboles, las superficies claras y los techos verdes pueden ayudar.",
          ["Los techos verdes absorben el agua de lluvia como una esponja y mantienen más fresco todo el edificio de abajo.", "El clima de verano puede ser incómodo.", "Las ciudades deberían quitar todas sus calles de asfalto."],
          ["Pero juntas pueden hacer que una ciudad caliente sea un poco más habitable"],
          "El texto explica por qué las ciudades se calientan más y luego dedica la mayoría de sus párrafos a tres maneras de refrescarlas.",
        ],
      ),
      q(
        "infer.what",
        ["not-in-text", "contradicts-text", "overgeneralizes"],
        [
          "Why might a city plant trees first in “the neighborhoods that have the least shade”?",
          "Those neighborhoods are likely the hottest, so new trees help them most.",
          ["Trees grow faster in places where no other trees are nearby to block the sun.", "Those neighborhoods already have the most trees in the city.", "A new tree always cools a whole street by many degrees right away."],
          ["A tree's shade keeps pavement and buildings from heating up"],
          "Shade keeps pavement and buildings from heating up, so the places with the least shade are probably the hottest and would gain the most.",
        ],
        [
          "¿Por qué una ciudad plantaría árboles primero en “los vecindarios que tienen menos sombra”?",
          "Esos vecindarios quizá son los más calientes, así que ahí los árboles ayudan más.",
          ["Los árboles crecen más rápido donde no hay otros árboles cerca que les tapen el sol.", "Esos vecindarios ya tienen la mayor cantidad de árboles de la ciudad.", "Un árbol nuevo siempre refresca una calle entera muchos grados de inmediato."],
          ["La sombra de un árbol evita que el pavimento y los edificios se calienten"],
          "La sombra evita que el pavimento y los edificios se calienten, así que los lugares con menos sombra probablemente son los más calientes y los que más ganarían.",
        ],
      ),
      q(
        "words.figurative",
        ["too-literal", "contradicts-text", "not-in-text"],
        [
          "In paragraph 5, what does the author mean by saying green roofs act “like a sponge and a sunshade at once”?",
          "They soak up rain and block the sun's heat at the same time.",
          ["They are covered with rows of real sponges and small beach umbrellas.", "They make the building below wetter and darker inside.", "They only work on cloudy, rainy days."],
          ["These green roofs act like a sponge and a sunshade at once"],
          "A sponge soaks up water and a sunshade blocks sunlight. Green roofs do both jobs: they hold rainwater and keep the building cooler.",
        ],
        [
          "En el párrafo 5, ¿qué quiere decir el texto con que los techos verdes funcionan “a la vez como una esponja y una sombrilla”?",
          "Absorben la lluvia y bloquean el calor del sol al mismo tiempo.",
          ["Están cubiertos de filas de esponjas y sombrillas de playa de verdad.", "Hacen que el edificio de abajo esté más mojado y oscuro por dentro.", "Solo funcionan en días nublados y lluviosos."],
          ["Estos techos verdes funcionan a la vez como una esponja y una sombrilla"],
          "Una esponja absorbe agua y una sombrilla bloquea el sol. Los techos verdes hacen los dos trabajos: guardan el agua de lluvia y mantienen más fresco el edificio.",
        ],
      ),
    ],
  },
  {
    id: "lunch-line",
    level: 1,
    genre: "informational",
    structure: {
      kind: "problem-solution",
      en: [["The problem", "solutions", "fix it"], "The passage describes a problem, a slow lunch line, then how a class studied it, proposed solutions, and tested them."],
      es: [["El problema", "soluciones", "resolverlo"], "El texto describe un problema, una fila del almuerzo muy lenta, y luego cómo una clase lo estudió, propuso soluciones y las puso a prueba."],
    },
    en: [
      {
        title: "How Room 214 Fixed the Lunch Line",
        paras: [
          "At Riverside Middle School, lunch lasts twenty-five minutes. Last fall, students were spending up to fifteen of those minutes standing in line. By the time many sixth graders sat down, they had only a few minutes left to eat, and much of their food went into the trash.",
          "The problem bothered Ms. Okonkwo's math class in Room 214, so they decided to study it and try to fix it. For two weeks, students stood near the cafeteria with stopwatches and clipboards. They timed how long each person spent at each station and discovered that the line was not slow everywhere. Most of the delay happened at one spot: the single register where students typed in their lunch numbers.",
          "The class came up with three possible solutions. The first was to open a second register. The second was to let students punch in their numbers on a tablet while waiting in line. The third was to have each grade start lunch five minutes apart, so fewer students would arrive at once.",
          "The class presented its data to the principal and the cafeteria manager. A second register would require another worker, which the school could not afford. But the staggered start times cost nothing, and the cafeteria manager agreed to try a tablet at the front of the line.",
          "A month after the changes, the class timed the line again. The average wait had dropped from twelve minutes to five. The cafeteria also reported that less food was being thrown away.",
          "“We didn't just complain about it,” said sixth grader Lucas Ferreira. “We measured it. That's why they listened.”",
        ],
      },
    ],
    es: [
      {
        title: "Cómo el salón 214 arregló la fila del almuerzo",
        paras: [
          "En la Escuela Intermedia Riverside, el almuerzo dura veinticinco minutos. El otoño pasado, los estudiantes pasaban hasta quince de esos minutos haciendo fila. Cuando muchos de sexto grado por fin se sentaban, les quedaban pocos minutos para comer, y gran parte de su comida terminaba en la basura.",
          "El problema le molestaba a la clase de matemáticas de la maestra Okonkwo, en el salón 214, así que decidió estudiarlo para resolverlo. Durante dos semanas, los estudiantes se pararon cerca de la cafetería con cronómetros y tablas de apuntes. Midieron cuánto tiempo pasaba cada persona en cada estación y descubrieron que la fila no era lenta en todas partes. Casi todo el retraso ocurría en un solo lugar: la única caja donde los estudiantes tecleaban su número de almuerzo.",
          "La clase pensó en tres posibles soluciones. La primera era abrir una segunda caja. La segunda era dejar que los estudiantes marcaran su número en una tableta mientras esperaban en la fila. La tercera era que cada grado empezara a almorzar con cinco minutos de diferencia, para que llegaran menos estudiantes a la vez.",
          "La clase presentó sus datos al director y a la encargada de la cafetería. Una segunda caja requería otro empleado, y la escuela no podía pagarlo. Pero los horarios escalonados no costaban nada, y la encargada de la cafetería aceptó probar una tableta al frente de la fila.",
          "Un mes después de los cambios, la clase volvió a medir la fila. La espera promedio había bajado de doce minutos a cinco. La cafetería también informó que se tiraba menos comida.",
          "—No nos quedamos en quejarnos —dijo Lucas Ferreira, de sexto grado—. Lo medimos. Por eso nos hicieron caso.",
        ],
      },
    ],
    qs: [
      q(
        "structure.section",
        ["wrong-section-role", "wrong-section-role", "not-in-text"],
        [
          "What is the role of paragraph 2 in the passage?",
          "It shows how the class found the real cause of the slow line.",
          ["It lists the three solutions the class came up with.", "It reports what happened to the wait times a month after the changes began.", "It argues that students should be given a longer lunch period."],
          ["Most of the delay happened at one spot"],
          "Paragraph 1 describes the problem. Paragraph 2 shows the class measuring the line and finding where the delay really was, which shapes the solutions that follow.",
        ],
        [
          "¿Qué función tiene el párrafo 2 en el texto?",
          "Muestra cómo la clase encontró la verdadera causa de la fila lenta.",
          ["Enumera las tres soluciones que se le ocurrieron a la clase.", "Informa qué pasó con los tiempos de espera un mes después de los cambios.", "Defiende que los estudiantes deberían tener más tiempo para almorzar."],
          ["Casi todo el retraso ocurría en un solo lugar"],
          "El párrafo 1 describe el problema. El párrafo 2 muestra a la clase midiendo la fila y encontrando dónde estaba de verdad el retraso, lo que da forma a las soluciones que siguen.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "contradicts-text"],
        [
          "What is the central idea of the passage?",
          "A class measured why the lunch line was slow and helped the school fix it.",
          ["The cafeteria manager agreed to put a tablet at the very front of the lunch line.", "Schools have to solve many different problems every year.", "The school hired a new worker so it could open a second register."],
          ["The average wait had dropped from twelve minutes to five."],
          "The article follows one class from the problem, to measuring it, to solutions that cut the wait from twelve minutes to five.",
        ],
        [
          "¿Cuál es la idea central del texto?",
          "Una clase midió por qué la fila del almuerzo era lenta y ayudó a la escuela a resolverlo.",
          ["La encargada de la cafetería aceptó poner una tableta justo al frente de la fila del almuerzo.", "Las escuelas tienen que resolver muchos problemas distintos cada año.", "La escuela contrató a un empleado nuevo para abrir una segunda caja."],
          ["La espera promedio había bajado de doce minutos a cinco."],
          "El artículo sigue a una clase desde el problema hasta medirlo y encontrar soluciones que bajaron la espera de doce minutos a cinco.",
        ],
      ),
      q(
        "infer.what",
        ["not-in-text", "contradicts-text", "overgeneralizes"],
        [
          "Why does the cafeteria report that “less food was being thrown away” after the changes?",
          "With shorter waits, students had more time to finish eating.",
          ["The cafeteria started serving smaller portions to save money.", "The line got even longer, so many students skipped lunch.", "Students always waste less food during the winter months."],
          ["they had only a few minutes left to eat, and much of their food went into the trash"],
          "Paragraph 1 links the long line to food in the trash: students ran out of time to eat. A shorter wait gave them that time back.",
        ],
        [
          "¿Por qué la cafetería informa que “se tiraba menos comida” después de los cambios?",
          "Con esperas más cortas, los estudiantes tenían más tiempo para terminar de comer.",
          ["La cafetería empezó a servir porciones más pequeñas para ahorrar dinero.", "La fila se hizo todavía más larga, así que muchos estudiantes ya ni siquiera almorzaron.", "Los estudiantes siempre desperdician menos comida en los meses de invierno."],
          ["les quedaban pocos minutos para comer, y gran parte de su comida terminaba en la basura"],
          "El párrafo 1 relaciona la fila larga con la comida en la basura: a los estudiantes no les alcanzaba el tiempo para comer. Una espera más corta les devolvió ese tiempo.",
        ],
      ),
      q(
        "pov.purpose",
        ["contradicts-text", "wrong-purpose", "not-in-text"],
        [
          "Why does the author end the article with Lucas Ferreira's words?",
          "To stress that careful measuring, not complaining, convinced the adults.",
          ["To show that students complained loudly until the school finally gave in.", "To introduce a new problem with the lunch line that still needs solving.", "To reveal that the tablet was Lucas's idea from the start."],
          ["We measured it. That's why they listened."],
          "Lucas contrasts complaining with measuring. Ending on his words sums up the article's point: data is what made the principal and the cafeteria manager act.",
        ],
        [
          "¿Por qué el autor termina el artículo con las palabras de Lucas Ferreira?",
          "Para resaltar que medir con cuidado, y no quejarse, fue lo que convenció a los adultos.",
          ["Para mostrar que los estudiantes se quejaron mucho hasta que la escuela por fin cedió ante ellos.", "Para presentar un problema nuevo de la fila que todavía hay que resolver.", "Para revelar que la tableta fue idea de Lucas desde el principio."],
          ["Lo medimos. Por eso nos hicieron caso."],
          "Lucas contrasta quejarse con medir. Terminar con sus palabras resume la idea del artículo: los datos fueron lo que hizo actuar al director y a la cafetería.",
        ],
      ),
    ],
  },
  // ---------------------------------------------------------------------------------------------------
  // Level 1 imagined historical documents
  {
    id: "mill-letter",
    level: 1,
    genre: "primary",
    note: {
      en: "An imagined letter, written for this practice in the style of the 1840s. The writer is invented; the Lowell mills, their bells, and their long workdays were real.",
      es: "Una carta imaginada, escrita para esta práctica al estilo de la década de 1840. La autora es inventada; las fábricas de Lowell, sus campanas y sus largas jornadas fueron reales.",
    },
    en: [
      {
        title: "A Letter from the Mills, 1846",
        paras: [
          "Lowell, Massachusetts, May 3, 1846. Dear Sister Abigail, I have been at the mill three weeks now, and at last I have a quiet hour to write. You asked whether city life is as grand as the stories say. I will tell you plainly, and you may decide.",
          "The bell rules everything here. It rings before five in the morning to wake us, rings again to call us to the mill, and rings us in and out for meals so short that I have learned to eat my dinner faster than I could say grace at home. We work six days a week, from early morning until seven in the evening.",
          "The weaving room is a wonder and a trial. Hundreds of looms run at once, and the noise is so great that the girls talk with their hands and faces rather than their voices. The air is warm and full of cotton dust, and the windows are kept shut so the threads will not break. My head ached every night the first week. It aches less now, or perhaps I have only grown used to it.",
          "Still, I do not regret coming. After I pay for my room and meals at Mrs. Ames's boardinghouse, I can put away a little money each week, more than I ever held at home. On Sundays I go to church and then to the reading room, and some evenings the girls in my house read aloud to one another. Several of them write stories and poems, and two have had their work printed in a magazine written by mill girls.",
          "Tell Mother I am well and that I keep my Bible and my savings book in the same box. I mean to stay one more year, perhaps two, and then come home with enough to help with the farm, or to pay for a term at the academy. Write soon. Your loving sister, Hannah.",
        ],
      },
    ],
    es: [
      {
        title: "Una carta desde las fábricas, 1846",
        paras: [
          "Lowell, Massachusetts, 3 de mayo de 1846. Querida hermana Abigail: Llevo tres semanas en la fábrica y por fin tengo una hora tranquila para escribirte. Me preguntaste si la vida en la ciudad es tan grandiosa como dicen las historias. Te lo diré con franqueza, y tú decidirás.",
          "Aquí la campana lo gobierna todo. Suena antes de las cinco de la mañana para despertarnos, vuelve a sonar para llamarnos a la fábrica y nos hace entrar y salir de comidas tan cortas que he aprendido a comer más rápido de lo que tardaba en bendecir la mesa en casa. Trabajamos seis días a la semana, desde muy temprano hasta las siete de la noche.",
          "El salón de tejido es una maravilla y una prueba. Cientos de telares funcionan a la vez, y el ruido es tan fuerte que las muchachas hablan con las manos y la cara en lugar de la voz. El aire es caliente y está lleno de polvo de algodón, y las ventanas se mantienen cerradas para que no se rompan los hilos. La primera semana me dolía la cabeza todas las noches. Ahora me duele menos, o tal vez solo me he acostumbrado.",
          "Aun así, no me arrepiento de haber venido. Después de pagar mi cuarto y mis comidas en la casa de huéspedes de la señora Ames, puedo guardar un poco de dinero cada semana, más del que nunca tuve en casa. Los domingos voy a la iglesia y luego a la sala de lectura, y algunas noches las muchachas de mi casa leen en voz alta unas para otras. Varias escriben cuentos y poemas, y a dos les han publicado su trabajo en una revista escrita por obreras de las fábricas.",
          "Dile a mamá que estoy bien y que guardo mi Biblia y mi libreta de ahorros en la misma caja. Pienso quedarme un año más, tal vez dos, y luego volver a casa con lo suficiente para ayudar con la granja o pagar un curso en la academia. Escríbeme pronto. Tu hermana que te quiere, Hannah.",
        ],
      },
    ],
    qs: [
      q(
        "pov.view",
        ["contradicts-text", "overstates-view", "not-in-text"],
        [
          "How does Hannah feel about working at the mill?",
          "She finds it hard, but worth it for the money and chances it gives her.",
          ["She hates the mill and plans to leave it and come home to the farm right away.", "She believes every girl in New England should go to work in a mill.", "She is mostly upset with her sister for not writing more often."],
          ["Still, I do not regret coming."],
          "Hannah describes the noise, dust, and strict bells honestly, then says she does not regret coming because of her savings and the chance to read and learn.",
        ],
        [
          "¿Qué piensa Hannah de trabajar en la fábrica?",
          "Le parece duro, pero vale la pena por el dinero y las oportunidades que le da.",
          ["Odia la fábrica y piensa irse y volver a casa de inmediato.", "Cree que todas las muchachas de Nueva Inglaterra deberían ir a trabajar a una fábrica.", "Sobre todo está molesta con su hermana porque no le escribe más seguido."],
          ["Aun así, no me arrepiento de haber venido."],
          "Hannah describe con franqueza el ruido, el polvo y las campanas estrictas, y luego dice que no se arrepiente por sus ahorros y la oportunidad de leer y aprender.",
        ],
      ),
      q(
        "pov.purpose",
        ["wrong-purpose", "not-in-text", "contradicts-text"],
        [
          "Why does Hannah describe the bells in paragraph 2?",
          "To show how strictly the mill controls every part of the workers' day.",
          ["To explain to her sister exactly how the mill's bells are made and rung each day.", "To complain that the church bells back home were too quiet.", "To show that the workers are free to choose their own hours."],
          ["The bell rules everything here."],
          "Every detail about the bells, waking, working, and short meals, shows that the mill, not the workers, decides how each day is spent.",
        ],
        [
          "¿Por qué Hannah describe las campanas en el párrafo 2?",
          "Para mostrar con qué rigor la fábrica controla cada parte del día de las obreras.",
          ["Para explicarle a su hermana cómo se fabrican y se tocan las campanas de la fábrica.", "Para quejarse de que las campanas de la iglesia de su pueblo sonaban muy bajito.", "Para mostrar que las obreras pueden elegir su propio horario."],
          ["Aquí la campana lo gobierna todo."],
          "Cada detalle sobre las campanas, despertar, trabajar y comer rápido, muestra que la fábrica, y no las obreras, decide cómo se usa cada día.",
        ],
      ),
      q(
        "infer.what",
        ["not-in-text", "contradicts-text", "overgeneralizes"],
        [
          "What can you infer from the sentence “It aches less now, or perhaps I have only grown used to it”?",
          "Conditions may not have improved; Hannah may just be getting used to them.",
          ["The mill owners fixed the noise and the dust after Hannah's first week of work.", "Hannah's headaches came from reading too late at night.", "Everyone who works in a mill gets used to it within a week."],
          ["It aches less now, or perhaps I have only grown used to it."],
          "Hannah is not sure the pain is really less. “Perhaps I have only grown used to it” suggests the noise and dust are the same and she is adjusting.",
        ],
        [
          "¿Qué puedes inferir de la oración “Ahora me duele menos, o tal vez solo me he acostumbrado”?",
          "Puede que las condiciones no hayan mejorado; tal vez Hannah solo se está acostumbrando.",
          ["Los dueños de la fábrica arreglaron el ruido y el polvo después de la primera semana de Hannah.", "Los dolores de cabeza de Hannah venían de leer hasta muy tarde.", "Todas las personas que trabajan en una fábrica se acostumbran en una semana."],
          ["Ahora me duele menos, o tal vez solo me he acostumbrado."],
          "Hannah no está segura de que el dolor de verdad sea menor. “Tal vez solo me he acostumbrado” sugiere que el ruido y el polvo siguen igual y ella se está adaptando.",
        ],
      ),
      q(
        "words.figurative",
        ["too-literal", "not-in-text", "contradicts-text"],
        [
          "What does Hannah mean when she writes, “The bell rules everything here”?",
          "The bell's schedule decides when the workers wake, work, and eat.",
          ["A huge iron bell hangs from the ceiling above every room of the mill.", "The bell is the most beautiful sight in Lowell.", "The bell rings only once a day, at the end of work."],
          ["It rings before five in the morning to wake us"],
          "A bell cannot really rule. Hannah means the bell's signals control the workers' whole day, like a ruler giving orders.",
        ],
        [
          "¿Qué quiere decir Hannah cuando escribe: “Aquí la campana lo gobierna todo”?",
          "El horario de la campana decide cuándo despiertan, trabajan y comen las obreras.",
          ["Hay una campana de hierro enorme colgada del techo sobre cada salón de la fábrica.", "La campana es lo más hermoso que hay en Lowell.", "La campana suena una sola vez al día, al terminar el trabajo."],
          ["Suena antes de las cinco de la mañana para despertarnos"],
          "Una campana no puede gobernar de verdad. Hannah quiere decir que sus señales controlan todo el día de las obreras, como alguien que da órdenes.",
        ],
      ),
      q(
        "central.summary",
        ["adds-opinion", "misses-key-point", "contradicts-text"],
        [
          "Which is the best objective summary of the letter?",
          "Hannah writes that mill life is long, loud, and ruled by bells, but the pay and chances to learn make it worth it for now.",
          ["Hannah's letter proves that mill work was cruel, and her family was wrong to let her go so far from home alone at her age.", "Hannah mentions a woman named Mrs. Ames, a reading room, a Bible, a savings book, a box, and a farm.", "Hannah writes that she is quitting the mill soon because the pay is too low for her to save anything."],
          ["I mean to stay one more year, perhaps two"],
          "A good summary covers both sides of Hannah's letter, the hard work and the reasons she stays, without adding a judgment.",
        ],
        [
          "¿Cuál es el mejor resumen objetivo de la carta?",
          "Hannah cuenta que la fábrica es dura, ruidosa y regida por campanas, pero que el sueldo y lo que aprende valen la pena por ahora.",
          ["La carta de Hannah demuestra que el trabajo en la fábrica era cruel, y que su familia hizo muy mal en dejarla ir tan lejos sola a su edad.", "Hannah menciona a una señora Ames, una sala de lectura, una Biblia, una libreta de ahorros, una caja y una granja.", "Hannah escribe que pronto va a dejar la fábrica porque el sueldo es tan bajo que no puede ahorrar nada."],
          ["Pienso quedarme un año más, tal vez dos"],
          "Un buen resumen cubre los dos lados de la carta de Hannah, el trabajo duro y las razones por las que se queda, sin agregar un juicio.",
        ],
      ),
    ],
  },
  {
    id: "trail-diary",
    level: 1,
    genre: "primary",
    note: {
      en: "An imagined diary, written for this practice in the style of an 1850s trail journal. The family is invented; the route and its landmarks are real.",
      es: "Un diario imaginado, escrito para esta práctica al estilo de un diario de viaje de la década de 1850. La familia es inventada; la ruta y sus lugares son reales.",
    },
    en: [
      {
        title: "From a Trail Diary, 1853",
        paras: [
          "June 2. We crossed the South Platte today, which took from sunup until past noon. The river is wide but shallow, and the bottom is soft sand that pulls at the wheels if a wagon stops for even a moment. Father walked beside the oxen in water to his waist, shouting at them the whole way. When we reached the far bank, Mother sat down on a box and laughed until she cried, though nothing was funny.",
          "June 9. Passed Chimney Rock this afternoon. We first saw it two days ago and thought it was close enough to reach by supper. The air out here plays tricks; distances are always greater than they look. Thomas says it looks like a chimney. I say it looks like a church steeple with no church beneath it.",
          "June 14. Reached Fort Laramie. We traded one of our spare wheels for flour and coffee, and Mother traded her good tablecloth for a sack of dried apples. I asked if she was sorry to lose it. She said a tablecloth needs a table, and we have not had one since April.",
          "June 29. We are at Independence Rock at last. Father says we are nearly on the schedule he wanted, which was to reach it by the Fourth of July. That still leaves the mountains and more than half of the trail ahead. Hundreds of names are painted on the rock. Thomas wrote ours in axle grease low on the north side.",
          "Tonight the wind is hard across the sage, and the canvas over our heads snaps like a flag. I am tired in a way I did not know a person could be tired. But when I climbed the rock this evening, I could see the trail running west for miles, a pale line through the grass, and I thought: other people made it. So can we.",
        ],
      },
    ],
    es: [
      {
        title: "De un diario de viaje, 1853",
        paras: [
          "2 de junio. Hoy cruzamos el río South Platte, y nos tomó desde el amanecer hasta pasado el mediodía. El río es ancho pero poco profundo, y el fondo es de arena blanda que jala las ruedas si una carreta se detiene aunque sea un momento. Papá caminó junto a los bueyes con el agua hasta la cintura, gritándoles todo el camino. Cuando llegamos a la otra orilla, mamá se sentó en una caja y se rio hasta llorar, aunque nada era gracioso.",
          "9 de junio. Hoy en la tarde pasamos por Chimney Rock. La vimos por primera vez hace dos días y creímos que estaba tan cerca que llegaríamos para la cena. Aquí el aire engaña; las distancias siempre son mayores de lo que parecen. Thomas dice que parece una chimenea. Yo digo que parece el campanario de una iglesia sin iglesia debajo.",
          "14 de junio. Llegamos a Fort Laramie. Cambiamos una de nuestras ruedas de repuesto por harina y café, y mamá cambió su mantel bueno por un costal de manzanas secas. Le pregunté si le daba pena perderlo. Me dijo que un mantel necesita una mesa, y no hemos tenido una desde abril.",
          "29 de junio. Por fin estamos en Independence Rock. Papá dice que vamos casi en el tiempo que quería, que era llegar aquí para el 4 de julio. Todavía nos quedan las montañas y más de la mitad del camino. En la roca hay cientos de nombres pintados. Thomas escribió los nuestros con grasa de eje, abajo, en el lado norte.",
          "Esta noche el viento sopla fuerte sobre la salvia, y la lona sobre nuestras cabezas chasquea como una bandera. Estoy cansada como no sabía que una persona podía estarlo. Pero cuando subí a la roca esta tarde, vi el camino que corría hacia el oeste por kilómetros, una línea pálida entre el pasto, y pensé: otras personas lo lograron. Nosotros también podemos.",
        ],
      },
    ],
    qs: [
      q(
        "infer.what",
        ["contradicts-text", "not-in-text", "overgeneralizes"],
        [
          "Why does Mother laugh “until she cried, though nothing was funny” after the river crossing?",
          "She is letting out the fear and strain of a dangerous crossing.",
          ["She thinks Father looked silly shouting at the oxen in the water.", "She is upset because the family lost a wagon in the river.", "People always laugh when they finish a hard day of work."],
          ["The river is wide but shallow, and the bottom is soft sand that pulls at the wheels"],
          "The crossing took all morning, and the sand could trap a wagon. Laughing and crying when “nothing was funny” shows relief after a frightening day.",
        ],
        [
          "¿Por qué mamá se ríe “hasta llorar, aunque nada era gracioso” después de cruzar el río?",
          "Está soltando el miedo y la tensión de un cruce peligroso.",
          ["Le pareció chistoso ver a papá gritándoles a los bueyes en el agua.", "Está triste porque la familia perdió una carreta en el río.", "La gente siempre se ríe cuando termina un día de trabajo duro."],
          ["el fondo es de arena blanda que jala las ruedas si una carreta se detiene"],
          "El cruce tomó toda la mañana y la arena podía atrapar una carreta. Reír y llorar cuando “nada era gracioso” muestra alivio después de un día de miedo.",
        ],
      ),
      q(
        "infer.support",
        ["off-point-evidence", "off-point-evidence", "off-point-evidence"],
        [
          "Which sentence best supports the inference that the family has given up comforts of home?",
          "She said a tablecloth needs a table, and we have not had one since April.",
          ["We first saw it two days ago and thought it was close enough to reach by supper.", "Father walked beside the oxen in water to his waist, shouting at them the whole way.", "Thomas wrote ours in axle grease low on the north side."],
          ["She said a tablecloth needs a table, and we have not had one since April."],
          "Not having a table for months, and trading away a good tablecloth, shows the family has left everyday comforts behind.",
        ],
        [
          "¿Qué oración apoya mejor la inferencia de que la familia ha dejado atrás las comodidades de su casa?",
          "Me dijo que un mantel necesita una mesa, y no hemos tenido una desde abril.",
          ["La vimos por primera vez hace dos días y creímos que estaba tan cerca que llegaríamos para la cena.", "Papá caminó junto a los bueyes con el agua hasta la cintura, gritándoles todo el camino.", "Thomas escribió los nuestros con grasa de eje, abajo, en el lado norte."],
          ["Me dijo que un mantel necesita una mesa, y no hemos tenido una desde abril."],
          "No tener mesa desde hace meses, y cambiar un mantel bueno, muestra que la familia ha dejado atrás las comodidades de todos los días.",
        ],
      ),
      q(
        "words.figurative",
        ["wrong-context-meaning", "too-literal", "not-in-text"],
        [
          "What does the writer mean by “The air out here plays tricks”?",
          "On the open plains, faraway things look closer than they are.",
          ["The weather changes so quickly that no one can plan ahead.", "The wind blows away anything that is left outside the wagons at night.", "The air smells strange and makes the travelers feel sick."],
          ["distances are always greater than they look"],
          "The family thought they could reach Chimney Rock by supper, but it took two more days. The writer explains that distances fool the eye.",
        ],
        [
          "¿Qué quiere decir quien escribe con “Aquí el aire engaña”?",
          "En las llanuras abiertas, las cosas lejanas parecen más cerca de lo que están.",
          ["El clima cambia tan rápido que nadie puede hacer planes.", "El viento se lleva todo lo que se deja fuera de las carretas durante toda la noche.", "El aire huele raro y hace que los viajeros se sientan mal."],
          ["las distancias siempre son mayores de lo que parecen"],
          "La familia creyó que llegaría a Chimney Rock para la cena, pero tardó dos días más. Quien escribe explica que las distancias engañan a la vista.",
        ],
      ),
      q(
        "pov.view",
        ["contradicts-text", "misses-author-stance", "overstates-view"],
        [
          "Based on the whole diary, how does the writer see the family's journey?",
          "As exhausting and costly, but worth pushing through.",
          ["As an easy adventure without any real hardships.", "As something to report without any feelings at all.", "As proof that every family on the trail will surely make it."],
          ["I am tired in a way I did not know a person could be tired.", "other people made it. So can we."],
          "The writer admits deep tiredness and losses, yet ends with “So can we.” The view is honest about the hardship and still determined.",
        ],
        [
          "Según todo el diario, ¿cómo ve quien escribe el viaje de la familia?",
          "Como agotador y costoso, pero algo por lo que vale la pena seguir.",
          ["Como una aventura fácil sin dificultades de verdad.", "Como algo que se cuenta sin ningún sentimiento.", "Como prueba de que todas las familias del camino seguramente llegarán."],
          ["Estoy cansada como no sabía que una persona podía estarlo.", "otras personas lo lograron. Nosotros también podemos."],
          "Quien escribe admite un cansancio enorme y las pérdidas, pero termina con “Nosotros también podemos”. Su visión es honesta sobre lo duro y aun así decidida.",
        ],
      ),
      q(
        "central.summary",
        ["adds-opinion", "misses-key-point", "contradicts-text"],
        [
          "Which is the best objective summary of the diary?",
          "On the trail, the writer records a hard river crossing, trades for supplies, and reaches Independence Rock, tired but determined.",
          ["The diary shows that pioneer families were foolish to risk the long, hard trail west when they could have stayed safely at home on their farms.", "The writer mentions Chimney Rock, a steeple, a tablecloth, dried apples, axle grease, sage, and canvas.", "The family turns back at Fort Laramie after Mother trades away her tablecloth."],
          ["We are at Independence Rock at last."],
          "A good summary follows the main stops in order and the writer's feelings at the end, without the reader's opinions.",
        ],
        [
          "¿Cuál es el mejor resumen objetivo del diario?",
          "En el camino, quien escribe cuenta un cruce difícil, cambia cosas por provisiones y llega a Independence Rock, cansada pero decidida.",
          ["El diario demuestra que las familias pioneras fueron insensatas al arriesgarse en el largo camino al oeste cuando podían quedarse seguras en sus granjas.", "Quien escribe menciona Chimney Rock, un campanario, un mantel, manzanas secas, grasa de eje, salvia y lona.", "La familia se regresa en Fort Laramie después de que mamá cambia su mantel."],
          ["Por fin estamos en Independence Rock."],
          "Un buen resumen sigue las paradas principales en orden y los sentimientos de quien escribe al final, sin las opiniones del lector.",
        ],
      ),
    ],
  },
  // ---------------------------------------------------------------------------------------------------
  // Level 1 arguments (student writers; some reasoning is weak on purpose, so it can be judged)
  {
    id: "start-later",
    level: 1,
    genre: "argument",
    en: [
      {
        title: "Our School Should Start Later",
        paras: [
          "Every school morning, my alarm goes off at 6:05. By the time I reach my first class at 7:20, I have been awake for over an hour, but my brain has not. I am not alone. Our district should move middle school start times to 8:30 a.m. or later.",
          "The main reason is sleep. Doctors who study adolescents report that during the teen years, the body's internal clock shifts later, so most teenagers have trouble falling asleep before about 11 p.m. Sleep experts recommend that teenagers get eight to ten hours a night. With a 7:20 start, that is nearly impossible. In 2014, the American Academy of Pediatrics recommended that middle and high schools start no earlier than 8:30 a.m.",
          "Later start times also seem to help in the classroom. When our student council surveyed 312 students last spring, 71 percent said they had trouble staying awake in first period. My cousin's school in another state starts at 9:00, and their basketball team won the state championship last year.",
          "Some parents worry that a later start would mess up bus schedules and after-school sports. Those are real concerns. However, other districts have handled them by staggering bus routes and moving practices slightly later, and the benefits of rested students outweigh the inconvenience.",
          "Students cannot learn if they cannot stay awake. Moving the first bell to 8:30 would give us what doctors say we need, and it would cost our district far less than the hours of learning we lose every morning.",
        ],
      },
    ],
    es: [
      {
        title: "Nuestra escuela debería empezar más tarde",
        paras: [
          "Cada mañana de clases, mi despertador suena a las 6:05. Cuando llego a mi primera clase a las 7:20, llevo más de una hora despierta, pero mi cerebro no. No soy la única. Nuestro distrito debería cambiar la hora de entrada de la escuela intermedia a las 8:30 de la mañana o más tarde.",
          "La razón principal es el sueño. Los médicos que estudian a los adolescentes explican que en esos años el reloj interno del cuerpo se atrasa, así que a la mayoría le cuesta dormirse antes de las 11 de la noche. Los expertos en sueño recomiendan que los adolescentes duerman de ocho a diez horas cada noche. Con una entrada a las 7:20, eso es casi imposible. En 2014, la Academia Estadounidense de Pediatría recomendó que las escuelas intermedias y secundarias no empiecen antes de las 8:30 de la mañana.",
          "Empezar más tarde también parece ayudar en el salón. Cuando el consejo estudiantil encuestó a 312 estudiantes la primavera pasada, el 71 por ciento dijo que le costaba mantenerse despierto en la primera clase. La escuela de mi primo, en otro estado, empieza a las 9:00, y su equipo de básquetbol ganó el campeonato estatal el año pasado.",
          "A algunos padres les preocupa que una entrada más tarde desordene los horarios de los autobuses y de los deportes después de clases. Son preocupaciones reales. Sin embargo, otros distritos las han resuelto escalonando las rutas de autobús y moviendo un poco más tarde los entrenamientos, y los beneficios de tener estudiantes descansados pesan más que la molestia.",
          "Los estudiantes no pueden aprender si no pueden mantenerse despiertos. Mover el primer timbre a las 8:30 nos daría lo que los médicos dicen que necesitamos, y le costaría a nuestro distrito mucho menos que las horas de aprendizaje que perdemos cada mañana.",
        ],
      },
    ],
    qs: [
      q(
        "argument.claim",
        ["evidence-not-claim", "counterclaim-not-claim", "evidence-not-claim"],
        [
          "Which sentence states the author's main claim?",
          "Our district should move middle school start times to 8:30 a.m. or later.",
          ["Sleep experts recommend that teenagers get eight to ten hours a night.", "Some parents worry that a later start would mess up bus schedules and after-school sports.", "Every school morning, my alarm goes off at 6:05."],
          ["Our district should move middle school start times to 8:30 a.m. or later."],
          "This is the point the whole essay tries to prove. The other sentences are evidence for it or the other side's worry.",
        ],
        [
          "¿Qué oración presenta la afirmación principal de la autora?",
          "Nuestro distrito debería cambiar la hora de entrada de la escuela intermedia a las 8:30 de la mañana o más tarde.",
          ["Los expertos en sueño recomiendan que los adolescentes duerman de ocho a diez horas cada noche.", "A algunos padres les preocupa que una entrada más tarde desordene los horarios de los autobuses y de los deportes después de clases.", "Cada mañana de clases, mi despertador suena a las 6:05."],
          ["Nuestro distrito debería cambiar la hora de entrada de la escuela intermedia a las 8:30 de la mañana o más tarde."],
          "Esta es la idea que todo el ensayo intenta probar. Las otras oraciones son evidencia a su favor o la preocupación de la otra postura.",
        ],
      ),
      q(
        "argument.evidence",
        ["misjudges-relevance", "misjudges-relevance", "misjudges-relevance"],
        [
          "Which piece of evidence is irrelevant to the author's claim?",
          "A school that starts at 9:00 won a basketball championship.",
          ["Seventy-one percent of surveyed students had trouble staying awake in first period.", "Teenagers' body clocks shift later, so they fall asleep later.", "A group of doctors recommends that schools start no earlier than 8:30 a.m."],
          ["their basketball team won the state championship last year"],
          "A sports title says nothing about whether students are rested or learning. The survey, the body-clock research, and the doctors' advice all connect to sleep and school.",
        ],
        [
          "¿Qué evidencia no tiene relación con la afirmación de la autora?",
          "Una escuela que empieza a las 9:00 ganó un campeonato de básquetbol.",
          ["El 71 por ciento de los estudiantes encuestados tenía problemas para mantenerse despierto en la primera clase.", "El reloj del cuerpo de los adolescentes se atrasa, así que se duermen más tarde.", "Un grupo de médicos recomienda que las escuelas no empiecen antes de las 8:30 de la mañana."],
          ["su equipo de básquetbol ganó el campeonato estatal el año pasado"],
          "Un campeonato deportivo no dice nada sobre si los estudiantes están descansados o aprendiendo. La encuesta, el estudio del reloj del cuerpo y la recomendación de los médicos tienen que ver con el sueño y la escuela.",
        ],
      ),
      q(
        "pov.response",
        ["contradicts-text", "misses-author-stance", "not-in-text"],
        [
          "How does the author respond to people who worry about buses and sports?",
          "The author admits the concerns are real, then argues they can be handled.",
          ["The author ignores the concerns and never mentions the other side at all.", "The author agrees the concerns outweigh the benefits and drops the plan.", "The author says those parents do not care about students."],
          ["Those are real concerns. However, other districts have handled them"],
          "The author grants that the worries are real, then answers them with how other districts solved them and why the benefits matter more.",
        ],
        [
          "¿Cómo responde la autora a quienes se preocupan por los autobuses y los deportes?",
          "Reconoce que son preocupaciones reales y luego argumenta que tienen solución.",
          ["Ignora las preocupaciones y nunca menciona la otra postura.", "Acepta que las preocupaciones pesan más que los beneficios y abandona su propuesta.", "Dice que a esos padres no les importan los estudiantes."],
          ["Son preocupaciones reales. Sin embargo, otros distritos las han resuelto"],
          "La autora acepta que las preocupaciones son reales y luego las responde con lo que hicieron otros distritos y por qué los beneficios importan más.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "contradicts-text"],
        [
          "What is the central idea of the essay?",
          "Middle school should start at 8:30 or later so students get the sleep they need.",
          ["Many students in the student council survey had trouble staying awake during their first class of the day.", "Sleep is important for everyone's health.", "Bus routes matter more than when classes start."],
          ["Moving the first bell to 8:30 would give us what doctors say we need"],
          "Every paragraph supports one point: a later start would let students get the sleep that doctors recommend.",
        ],
        [
          "¿Cuál es la idea central del ensayo?",
          "La escuela intermedia debería empezar a las 8:30 o más tarde para que los estudiantes duerman lo que necesitan.",
          ["Muchos estudiantes de la encuesta del consejo estudiantil tenían problemas para mantenerse despiertos en la primera clase del día.", "Dormir es importante para la salud de todos.", "Las rutas de autobús importan más que la hora de entrada."],
          ["Mover el primer timbre a las 8:30 nos daría lo que los médicos dicen que necesitamos"],
          "Cada párrafo apoya una sola idea: empezar más tarde permitiría que los estudiantes durmieran lo que recomiendan los médicos.",
        ],
      ),
      q(
        "structure.section",
        ["wrong-section-role", "wrong-section-role", "contradicts-text"],
        [
          "What is the purpose of paragraph 4?",
          "To answer a likely objection before the conclusion.",
          ["To give the main scientific evidence about how much sleep teenagers need each night.", "To state the author's claim for the first time.", "To admit that a later start time is a bad idea."],
          ["Some parents worry that a later start would mess up bus schedules and after-school sports."],
          "Paragraph 4 brings up what opponents might say and answers it, which makes the argument stronger right before the final paragraph.",
        ],
        [
          "¿Cuál es el propósito del párrafo 4?",
          "Responder a una objeción probable antes de la conclusión.",
          ["Dar la evidencia científica principal sobre cuántas horas necesitan dormir los adolescentes cada noche.", "Presentar por primera vez la afirmación de la autora.", "Admitir que empezar más tarde es una mala idea."],
          ["A algunos padres les preocupa que una entrada más tarde desordene los horarios de los autobuses"],
          "El párrafo 4 presenta lo que podrían decir quienes no están de acuerdo y lo responde, lo que fortalece el argumento justo antes del último párrafo.",
        ],
      ),
    ],
  },
  {
    id: "library-saturdays",
    level: 1,
    genre: "argument",
    en: [
      {
        title: "Keep the Library Open on Saturdays",
        paras: [
          "To the members of the Elmwood City Council: I am writing about your plan to close the Elmwood Public Library on Saturdays to save money. I am in seventh grade, and I believe closing on Saturdays would be a serious mistake.",
          "For many families, Saturday is the only day the library is useful. Most parents in my neighborhood work on weekdays until after the library closes at six. The library's own sign-in records, which the head librarian shared with our class, show that Saturday is its busiest day, with about twice as many visitors as an average weekday.",
          "The library is also more than a building full of books. On Saturdays, it offers free homework help, a coding club, and the only public computers within walking distance of my apartment. My neighbor Mrs. Delgado used those computers to apply for the job she has now.",
          "Some council members have said that people can simply use the library online. But you cannot get homework help from a website if your family has no internet at home. Closing on Saturdays would hurt the people who depend on the library most.",
          "Libraries are the heart of a city, and only someone who has never been inside one would vote to close it on Saturdays. I urge you to find savings somewhere else and keep our library open.",
        ],
      },
    ],
    es: [
      {
        title: "Mantengan abierta la biblioteca los sábados",
        paras: [
          "A los miembros del Concejo Municipal de Elmwood: Les escribo sobre su plan de cerrar la Biblioteca Pública de Elmwood los sábados para ahorrar dinero. Estoy en séptimo grado y creo que cerrar los sábados sería un grave error.",
          "Para muchas familias, el sábado es el único día en que la biblioteca les sirve. La mayoría de los padres de mi vecindario trabajan entre semana hasta después de que la biblioteca cierra a las seis. Los registros de entrada de la propia biblioteca, que la bibliotecaria principal compartió con nuestra clase, muestran que el sábado es su día más concurrido, con cerca del doble de visitantes que un día promedio entre semana.",
          "La biblioteca también es más que un edificio lleno de libros. Los sábados ofrece ayuda gratis con la tarea, un club de programación y las únicas computadoras públicas a las que puedo llegar caminando desde mi apartamento. Mi vecina, la señora Delgado, usó esas computadoras para solicitar el trabajo que tiene ahora.",
          "Algunos concejales han dicho que la gente simplemente puede usar la biblioteca en línea. Pero no se puede recibir ayuda con la tarea en un sitio web si tu familia no tiene internet en casa. Cerrar los sábados perjudicaría a quienes más dependen de la biblioteca.",
          "Las bibliotecas son el corazón de una ciudad, y solo alguien que nunca ha entrado a una votaría por cerrarla los sábados. Les pido que busquen ahorros en otra parte y mantengan abierta nuestra biblioteca.",
        ],
      },
    ],
    qs: [
      q(
        "argument.evidence",
        ["anecdote-as-proof", "opinion-as-evidence", "off-point-evidence"],
        [
          "Which evidence best supports the claim that closing on Saturdays would hurt many people?",
          "Sign-in records show Saturday is the library's busiest day.",
          ["A neighbor used the library's computers to apply for the job she has now.", "Libraries are the heart of every city.", "The writer of the letter is in seventh grade."],
          ["show that Saturday is its busiest day, with about twice as many visitors as an average weekday"],
          "The sign-in records count real visitors and show Saturday is the busiest day. One neighbor's story is only one person, and “the heart of every city” is an opinion.",
        ],
        [
          "¿Qué evidencia apoya mejor la afirmación de que cerrar los sábados perjudicaría a mucha gente?",
          "Los registros de entrada muestran que el sábado es el día más concurrido.",
          ["Una vecina usó las computadoras de la biblioteca para solicitar el trabajo que tiene ahora.", "Las bibliotecas son el corazón de todas las ciudades.", "Quien escribe la carta está en séptimo grado."],
          ["muestran que el sábado es su día más concurrido, con cerca del doble de visitantes que un día promedio entre semana"],
          "Los registros cuentan visitantes reales y muestran que el sábado es el día más concurrido. La historia de una vecina es la de una sola persona, y “el corazón de todas las ciudades” es una opinión.",
        ],
      ),
      q(
        "argument.reasoning",
        ["not-a-flaw", "not-a-flaw", "not-a-flaw"],
        [
          "Which part of the letter uses the weakest reasoning?",
          "The claim that only someone who has never been inside a library would vote to close it.",
          ["The sign-in records showing that Saturday is the library's busiest day of the week.", "The point that online services do not help families without internet.", "The fact that the library closes at six on weekdays."],
          ["only someone who has never been inside one would vote to close it on Saturdays"],
          "That claim attacks the council members instead of giving a reason. People can disagree about a budget and still value libraries.",
        ],
        [
          "¿Qué parte de la carta usa el razonamiento más débil?",
          "La afirmación de que solo alguien que nunca ha entrado a una biblioteca votaría por cerrarla.",
          ["Los registros de entrada que muestran que el sábado es el día más concurrido de la biblioteca en toda la semana.", "La idea de que los servicios en línea no ayudan a las familias sin internet.", "El dato de que la biblioteca cierra a las seis entre semana."],
          ["solo alguien que nunca ha entrado a una votaría por cerrarla los sábados"],
          "Esa afirmación ataca a los concejales en lugar de dar una razón. La gente puede no estar de acuerdo sobre un presupuesto y aun así valorar las bibliotecas.",
        ],
      ),
      q(
        "pov.view",
        ["confuses-speaker-author", "overstates-view", "misses-author-stance"],
        [
          "What is the author's point of view on the council's plan?",
          "It would hurt the families who need the library most.",
          ["The library should close on Saturdays so the city can save money for other things.", "The library should stay open every night until midnight.", "The author does not feel strongly either way about it."],
          ["Closing on Saturdays would hurt the people who depend on the library most."],
          "The author calls the plan “a serious mistake” and says it would hurt those who depend on the library most.",
        ],
        [
          "¿Cuál es el punto de vista de quien escribe sobre el plan del concejo?",
          "Perjudicaría a las familias que más necesitan la biblioteca.",
          ["La biblioteca debería cerrar los sábados para que la ciudad ahorre dinero para otras cosas.", "La biblioteca debería abrir todas las noches hasta la medianoche.", "A quien escribe le da igual lo que pase."],
          ["Cerrar los sábados perjudicaría a quienes más dependen de la biblioteca."],
          "Quien escribe dice que el plan sería “un grave error” y que perjudicaría a quienes más dependen de la biblioteca.",
        ],
      ),
      q(
        "pov.response",
        ["misses-author-stance", "overstates-view", "contradicts-text"],
        [
          "How does the author respond to the idea that people can use the library online?",
          "By pointing out that families without internet at home cannot do that.",
          ["By agreeing that online services can fully replace the library's Saturday hours.", "By saying the library should stop offering anything online.", "By ignoring the idea and moving on to something else."],
          ["But you cannot get homework help from a website if your family has no internet at home."],
          "The author names the council members' idea and answers it: an online library does not help families with no internet.",
        ],
        [
          "¿Cómo responde quien escribe a la idea de que la gente puede usar la biblioteca en línea?",
          "Señalando que las familias sin internet en casa no pueden hacerlo.",
          ["Aceptando que los servicios en línea pueden reemplazar por completo el horario de los sábados.", "Diciendo que la biblioteca debería dejar de ofrecer cualquier cosa en línea.", "Ignorando la idea y pasando a otra cosa."],
          ["Pero no se puede recibir ayuda con la tarea en un sitio web si tu familia no tiene internet en casa."],
          "Quien escribe menciona la idea de los concejales y la responde: una biblioteca en línea no ayuda a las familias sin internet.",
        ],
      ),
      q(
        "words.figurative",
        ["too-literal", "contradicts-text", "not-in-text"],
        [
          "The author calls libraries “the heart of a city.” What does this phrase suggest?",
          "Libraries are central to city life and help keep it going.",
          ["Libraries are always built in the exact middle of downtown.", "Libraries are buildings that a city could easily do without.", "Libraries are the oldest buildings in most cities."],
          ["Libraries are the heart of a city"],
          "The heart keeps a body alive. Calling libraries the heart of a city says they are central and vital to the people who live there.",
        ],
        [
          "Quien escribe dice que las bibliotecas son “el corazón de una ciudad”. ¿Qué sugiere esta frase?",
          "Las bibliotecas son centrales para la vida de la ciudad y la mantienen en marcha.",
          ["Las bibliotecas siempre se construyen justo en el centro de la ciudad.", "Las bibliotecas son edificios de los que una ciudad podría prescindir fácilmente.", "Las bibliotecas son los edificios más antiguos de casi todas las ciudades."],
          ["Las bibliotecas son el corazón de una ciudad"],
          "El corazón mantiene vivo al cuerpo. Decir que las bibliotecas son el corazón de una ciudad significa que son centrales y vitales para la gente que vive ahí.",
        ],
      ),
    ],
  },
  {
    id: "teach-cooking",
    level: 1,
    genre: "argument",
    en: [
      {
        title: "Every School Should Teach Cooking",
        paras: [
          "Most students can solve for x, name the parts of a cell, and write a five-paragraph essay. Far fewer can cook a simple, healthy dinner. That is a gap our schools should close. Every middle school should require a semester of cooking.",
          "Cooking is a life skill that everyone eventually needs. Young adults who cannot cook often depend on fast food and packaged meals, which tend to cost more and contain more salt and sugar than food made at home. A student who learns to make rice, beans, and a vegetable stir-fry has learned something that will save money and protect health for decades.",
          "Cooking also reinforces what students learn in other classes. Doubling a recipe is a lesson in fractions. Watching bread rise is a lesson in chemistry and living things, since yeast is a living organism. Reading a recipe carefully and following the steps in order is practice in reading directions.",
          "Last year, Lincoln Middle School in our district tried a six-week cooking unit in its science classes. The teacher said that students were more excited about that unit than any other. This proves that a cooking class would raise test scores across the district.",
          "Some people argue that schools are already too busy to add another class. It is true that schedules are full. But a single semester could replace one study hall, and the skills would last a lifetime. Schools teach students how to plan for their futures; they should also teach them how to feed themselves.",
        ],
      },
    ],
    es: [
      {
        title: "Todas las escuelas deberían enseñar a cocinar",
        paras: [
          "La mayoría de los estudiantes sabe despejar una x, nombrar las partes de una célula y escribir un ensayo de cinco párrafos. Muchos menos saben preparar una cena sencilla y saludable. Esa es una brecha que nuestras escuelas deberían cerrar. Todas las escuelas intermedias deberían exigir un semestre de cocina.",
          "Cocinar es una habilidad para la vida que todos necesitan tarde o temprano. Los adultos jóvenes que no saben cocinar suelen depender de la comida rápida y de los platos empaquetados, que tienden a costar más y a tener más sal y azúcar que la comida hecha en casa. Un estudiante que aprende a preparar arroz, frijoles y verduras salteadas ha aprendido algo que le ahorrará dinero y cuidará su salud durante décadas.",
          "Cocinar también refuerza lo que se aprende en otras clases. Duplicar una receta es una lección de fracciones. Ver cómo sube el pan es una lección de química y de seres vivos, porque la levadura es un organismo vivo. Leer una receta con cuidado y seguir los pasos en orden es práctica para leer instrucciones.",
          "El año pasado, la Escuela Intermedia Lincoln de nuestro distrito probó una unidad de cocina de seis semanas en sus clases de ciencias. La maestra dijo que los estudiantes estaban más entusiasmados con esa unidad que con cualquier otra. Esto demuestra que una clase de cocina subiría los resultados de los exámenes en todo el distrito.",
          "Algunas personas dicen que las escuelas ya están demasiado ocupadas para agregar otra clase. Es cierto que los horarios están llenos. Pero un solo semestre podría reemplazar una hora de estudio libre, y las habilidades durarían toda la vida. Las escuelas enseñan a los estudiantes a planear su futuro; también deberían enseñarles a alimentarse.",
        ],
      },
    ],
    qs: [
      q(
        "argument.claim",
        ["evidence-not-claim", "counterclaim-not-claim", "evidence-not-claim"],
        [
          "Which sentence states the author's main claim?",
          "Every middle school should require a semester of cooking.",
          ["Doubling a recipe is a lesson in fractions.", "Some people argue that schools are already too busy to add another class.", "Far fewer can cook a simple, healthy dinner."],
          ["Every middle school should require a semester of cooking."],
          "This is the position the whole essay defends. The others are examples, a fact used as support, or the other side's view.",
        ],
        [
          "¿Qué oración presenta la afirmación principal del autor?",
          "Todas las escuelas intermedias deberían exigir un semestre de cocina.",
          ["Duplicar una receta es una lección de fracciones.", "Algunas personas dicen que las escuelas ya están demasiado ocupadas para agregar otra clase.", "Muchos menos saben preparar una cena sencilla y saludable."],
          ["Todas las escuelas intermedias deberían exigir un semestre de cocina."],
          "Esta es la postura que defiende todo el ensayo. Las otras son ejemplos, un dato que sirve de apoyo o la postura contraria.",
        ],
      ),
      q(
        "argument.reasoning",
        ["not-a-flaw", "not-a-flaw", "not-in-text"],
        [
          "What is the main flaw in the reasoning in paragraph 4?",
          "It jumps from one class enjoying a unit to higher test scores everywhere.",
          ["It names the real school in the district that tried the six-week cooking unit last year.", "It reports what the teacher observed during the unit.", "It reports that test scores fell after the unit."],
          ["This proves that a cooking class would raise test scores across the district."],
          "Students being excited in one school does not prove anything about test scores, let alone across a whole district. The conclusion goes far beyond the evidence.",
        ],
        [
          "¿Cuál es la falla principal del razonamiento en el párrafo 4?",
          "Salta de que una clase disfrutó una unidad a mejores resultados en todas partes.",
          ["Nombra la escuela real del distrito que probó la unidad de cocina de seis semanas el año pasado.", "Cuenta lo que la maestra observó durante la unidad.", "Informa que los resultados de los exámenes bajaron después de la unidad."],
          ["Esto demuestra que una clase de cocina subiría los resultados de los exámenes en todo el distrito."],
          "Que los estudiantes de una escuela estuvieran entusiasmados no prueba nada sobre los exámenes, y menos en todo un distrito. La conclusión va mucho más allá de la evidencia.",
        ],
      ),
      q(
        "argument.evidence",
        ["anecdote-as-proof", "off-point-evidence", "opinion-as-evidence"],
        [
          "Which new evidence would most strengthen the author's argument?",
          "A study showing that students who took cooking classes ate healthier meals years later.",
          ["A quote from one student at Lincoln Middle School who said the cooking unit was the most fun she had all year.", "A list of the author's favorite recipes.", "A statement that cooking is the most important subject of all."],
          ["Cooking is a life skill that everyone eventually needs."],
          "The essay claims cooking class builds lasting healthy habits. A study of many students over years tests that directly; one student's opinion or a recipe list does not.",
        ],
        [
          "¿Qué evidencia nueva fortalecería más el argumento del autor?",
          "Un estudio que muestre que quienes tomaron clases de cocina comían más sano años después.",
          ["Una cita de una estudiante de la Escuela Intermedia Lincoln que dijo que la unidad de cocina fue lo más divertido de todo su año.", "Una lista de las recetas favoritas del autor.", "Una afirmación de que cocinar es la materia más importante de todas."],
          ["Cocinar es una habilidad para la vida que todos necesitan tarde o temprano."],
          "El ensayo afirma que la clase de cocina crea hábitos sanos que duran. Un estudio con muchos estudiantes durante años lo pone a prueba; la opinión de una estudiante o una lista de recetas no.",
        ],
      ),
      q(
        "pov.purpose",
        ["wrong-purpose", "not-in-text", "contradicts-text"],
        [
          "Why does the author mention in paragraph 3 that yeast is a living organism?",
          "To show that cooking connects to science lessons.",
          ["To warn readers that homemade bread can be dangerous to eat.", "To prove that cooking is harder than science class.", "To argue that yeast should be kept out of school kitchens."],
          ["Watching bread rise is a lesson in chemistry and living things, since yeast is a living organism."],
          "Paragraph 3 is about how cooking supports other subjects. The yeast detail ties baking to what students learn about living things in science.",
        ],
        [
          "¿Por qué el autor menciona en el párrafo 3 que la levadura es un organismo vivo?",
          "Para mostrar que cocinar se conecta con las clases de ciencias.",
          ["Para advertir que el pan hecho en casa puede ser peligroso.", "Para probar que cocinar es más difícil que la clase de ciencias.", "Para defender que la levadura no debería usarse en las cocinas escolares."],
          ["Ver cómo sube el pan es una lección de química y de seres vivos, porque la levadura es un organismo vivo."],
          "El párrafo 3 trata de cómo cocinar apoya otras materias. El dato de la levadura relaciona hornear pan con lo que se aprende sobre los seres vivos en ciencias.",
        ],
      ),
      q(
        "central.idea",
        ["too-narrow", "too-broad", "contradicts-text"],
        [
          "What is the central idea of the essay?",
          "Schools should teach cooking, a life skill that also supports other subjects.",
          ["Doubling a recipe can teach students about fractions, and baking bread can teach chemistry.", "Healthy eating matters for people of all ages.", "Schools are already too busy to add any new classes."],
          ["Every middle school should require a semester of cooking."],
          "The essay argues for a cooking requirement and supports it with two main reasons: it is a lasting life skill, and it reinforces other classes.",
        ],
        [
          "¿Cuál es la idea central del ensayo?",
          "Las escuelas deberían enseñar a cocinar, una habilidad para la vida que también apoya otras materias.",
          ["Duplicar una receta puede enseñar fracciones a los estudiantes, y hornear pan puede enseñarles química.", "Comer sano importa a cualquier edad.", "Las escuelas ya están demasiado ocupadas para agregar clases nuevas."],
          ["Todas las escuelas intermedias deberían exigir un semestre de cocina."],
          "El ensayo defiende que la cocina sea obligatoria y lo apoya con dos razones principales: es una habilidad para toda la vida y refuerza otras clases.",
        ],
      ),
    ],
  },
  {
    id: "middle-recess",
    level: 1,
    genre: "argument",
    en: [
      {
        title: "Recess Belongs in Middle School",
        paras: [
          "In elementary school, recess was a given. Then we reached sixth grade, and it disappeared. At Hillcrest Middle School, students now go from 8:00 to 3:00 with only a twenty-minute lunch to break up the day. It is time to bring back recess for middle schoolers.",
          "Children and teens need movement. The Centers for Disease Control and Prevention recommends that young people ages 6 to 17 get at least sixty minutes of physical activity each day. For students who ride the bus and spend their evenings on homework, a school recess may be the best chance to move.",
          "A break also helps students focus. After sitting through four classes in a row, it is hard to pay attention to a fifth. Many teachers already know this; that is why some of them let us stand up and stretch halfway through a long lesson.",
          "Recess teaches social skills, too. Middle school is when many students feel lonely or left out. Unstructured time to play a game of four square or just talk gives students a chance to make friends outside their usual group.",
          "Some argue that recess would take time away from learning. But a fifteen-minute break would not have to come out of class time; it could come from trimming a few minutes from passing periods and homeroom. Besides, everyone knows that kids who have recess get better grades.",
          "We are still kids. Fifteen minutes of fresh air is not too much to ask.",
        ],
      },
    ],
    es: [
      {
        title: "El recreo también es para la escuela intermedia",
        paras: [
          "En la primaria, el recreo estaba garantizado. Luego llegamos a sexto grado y desapareció. En la Escuela Intermedia Hillcrest, los estudiantes ahora van de 8:00 a 3:00 con solo veinte minutos de almuerzo para cortar el día. Es hora de devolverles el recreo a los estudiantes de la escuela intermedia.",
          "Los niños y los adolescentes necesitan moverse. Los Centros para el Control y la Prevención de Enfermedades recomiendan que los jóvenes de 6 a 17 años hagan por lo menos sesenta minutos de actividad física al día. Para los estudiantes que viajan en autobús y pasan la tarde haciendo tarea, un recreo en la escuela puede ser su mejor oportunidad de moverse.",
          "Un descanso también ayuda a concentrarse. Después de cuatro clases seguidas, es difícil prestar atención a una quinta. Muchos maestros ya lo saben; por eso algunos nos dejan pararnos y estirarnos a mitad de una lección larga.",
          "El recreo también enseña a convivir. La escuela intermedia es cuando muchos estudiantes se sienten solos o excluidos. Un rato libre para jugar a la pelota o simplemente platicar les da la oportunidad de hacer amigos fuera de su grupo de siempre.",
          "Algunos dicen que el recreo le quitaría tiempo al aprendizaje. Pero un descanso de quince minutos no tendría que salir del tiempo de clase; podría salir de recortar unos minutos a los cambios de salón y a la hora de registro. Además, todo el mundo sabe que los niños que tienen recreo sacan mejores calificaciones.",
          "Todavía somos niños. Quince minutos de aire libre no es mucho pedir.",
        ],
      },
    ],
    qs: [
      q(
        "argument.evidence",
        ["anecdote-as-proof", "opinion-as-evidence", "off-point-evidence"],
        [
          "Which evidence gives the strongest support for the claim that students need recess to move?",
          "The CDC recommends at least sixty minutes of activity a day for young people.",
          ["The author remembers feeling restless and unable to focus after sitting through four classes in a row.", "Everyone knows that kids who have recess get better grades.", "Elementary schools always have recess."],
          ["The Centers for Disease Control and Prevention recommends that young people ages 6 to 17 get at least sixty minutes of physical activity each day."],
          "A recommendation from a national health agency applies to all young people and is about movement. One person's feeling, a claim about “everyone,” and a fact about elementary schools do not prove the need.",
        ],
        [
          "¿Qué evidencia apoya con más fuerza la afirmación de que los estudiantes necesitan recreo para moverse?",
          "Los CDC recomiendan al menos sesenta minutos de actividad al día para los jóvenes.",
          ["El autor recuerda que se sentía inquieto y sin poder concentrarse después de cuatro clases seguidas.", "Todo el mundo sabe que los niños que tienen recreo sacan mejores calificaciones.", "Las escuelas primarias siempre tienen recreo."],
          ["Los Centros para el Control y la Prevención de Enfermedades recomiendan que los jóvenes de 6 a 17 años hagan por lo menos sesenta minutos de actividad física al día."],
          "La recomendación de una agencia nacional de salud se aplica a todos los jóvenes y trata del movimiento. El sentimiento de una persona, una afirmación sobre “todo el mundo” y un dato sobre la primaria no prueban la necesidad.",
        ],
      ),
      q(
        "argument.reasoning",
        ["not-a-flaw", "not-a-flaw", "not-a-flaw"],
        [
          "Which sentence relies on the weakest reasoning?",
          "Besides, everyone knows that kids who have recess get better grades.",
          ["Some argue that recess would take time away from learning.", "After sitting through four classes in a row, it is hard to pay attention to a fifth.", "Middle school is when many students feel lonely or left out."],
          ["Besides, everyone knows that kids who have recess get better grades."],
          "“Everyone knows” is not evidence. The sentence makes a big claim about grades and offers nothing to back it up.",
        ],
        [
          "¿Qué oración se apoya en el razonamiento más débil?",
          "Además, todo el mundo sabe que los niños que tienen recreo sacan mejores calificaciones.",
          ["Algunos dicen que el recreo le quitaría tiempo al aprendizaje.", "Después de cuatro clases seguidas, es difícil prestar atención a una quinta.", "La escuela intermedia es cuando muchos estudiantes se sienten solos o excluidos."],
          ["Además, todo el mundo sabe que los niños que tienen recreo sacan mejores calificaciones."],
          "“Todo el mundo sabe” no es evidencia. La oración hace una afirmación grande sobre las calificaciones y no ofrece nada que la respalde.",
        ],
      ),
      q(
        "pov.response",
        ["misses-author-stance", "overstates-view", "contradicts-text"],
        [
          "How does the author handle the argument that recess takes time from learning?",
          "The author suggests the time could come from passing periods and homeroom.",
          ["The author agrees and decides recess should stay in elementary school only.", "The author says that learning matters less than playing outside.", "The author never mentions this argument."],
          ["it could come from trimming a few minutes from passing periods and homeroom"],
          "The author states the objection and answers it with a plan: take the fifteen minutes from passing periods and homeroom instead of class time.",
        ],
        [
          "¿Cómo maneja el autor el argumento de que el recreo le quita tiempo al aprendizaje?",
          "Propone que el tiempo salga de los cambios de salón y de la hora de registro.",
          ["Le da la razón y decide que el recreo debería quedarse solo en la primaria.", "Dice que aprender importa menos que jugar al aire libre.", "Nunca menciona ese argumento."],
          ["podría salir de recortar unos minutos a los cambios de salón y a la hora de registro"],
          "El autor presenta la objeción y la responde con un plan: tomar los quince minutos de los cambios de salón y de la hora de registro en lugar del tiempo de clase.",
        ],
      ),
      q(
        "structure.section",
        ["wrong-section-role", "wrong-section-role", "wrong-section-role"],
        [
          "How does paragraph 1 set up the rest of the essay?",
          "It describes a school day with no breaks and states the author's position.",
          ["It gives the CDC's recommendation about how much physical activity young people need each day.", "It answers people who say recess wastes time.", "It explains why middle school students feel lonely."],
          ["It is time to bring back recess for middle schoolers."],
          "Paragraph 1 shows the problem, a long day with only a short lunch, and ends with the claim the other paragraphs support.",
        ],
        [
          "¿Cómo prepara el párrafo 1 el resto del ensayo?",
          "Describe un día escolar sin descansos y presenta la postura del autor.",
          ["Da la recomendación de los CDC sobre cuánta actividad física necesitan los jóvenes cada día.", "Responde a quienes dicen que el recreo es una pérdida de tiempo.", "Explica por qué los estudiantes de la escuela intermedia se sienten solos."],
          ["Es hora de devolverles el recreo a los estudiantes de la escuela intermedia."],
          "El párrafo 1 muestra el problema, un día largo con solo un almuerzo corto, y termina con la afirmación que apoyan los demás párrafos.",
        ],
      ),
      q(
        "words.tone",
        ["opposite-tone", "opposite-tone", "ignores-connotation"],
        [
          "Which word best describes the tone of the final paragraph?",
          "Sincere",
          ["Furious", "Playful", "Detached"],
          ["Fifteen minutes of fresh air is not too much to ask."],
          "“We are still kids” and “not too much to ask” are plain, honest appeals. The writer is neither angry nor joking, and the words carry real feeling.",
        ],
        [
          "¿Qué palabra describe mejor el tono del último párrafo?",
          "Sincero",
          ["Furioso", "Juguetón", "Distante"],
          ["Quince minutos de aire libre no es mucho pedir."],
          "“Todavía somos niños” y “no es mucho pedir” son peticiones sencillas y honestas. El autor no está enojado ni bromeando, y sus palabras llevan sentimiento.",
        ],
      ),
    ],
  },
];
