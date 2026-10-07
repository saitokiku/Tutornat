import type { Locale } from "@/lib/types";
import type { Rng } from "../rng";
import { tr } from "../text";
import type { Choice, ItemBody, MathPart, Skill } from "../types";

// Grades 5–9 English and rhetoric: word meaning from context, the main idea of a paragraph, building
// and judging arguments, and the grammar that keeps writing clear. Every item comes from a hand-written
// bank (draft: not yet reviewed by a teacher). Each entry has an English and a Spanish version; the
// Spanish one teaches the same skill with a natural Spanish example rather than a literal translation.
// The entry is picked before anything else, so a seed lands on the same entry in both languages.

export type Bi<T> = { en: T; es: T };
const lang = <T>(locale: Locale, b: Bi<T>): T => (locale === "es" ? b.es : b.en);

/** Quotes a word or sentence inside learner copy. */
const q = (s: string) => `“${s}”`;
/** Quotes a sentence in the middle of another one, without its final period. */
const qs = (s: string) => q(s.replace(/\.$/, ""));

/** Joins the parts of a prompt; a renderer that keeps line breaks shows them as paragraphs. */
const para = (...lines: string[]) => lines.join("\n\n");

type Pick = { choices: Choice[]; index: number };

/** The right option shuffled in with the wrong ones. */
function shuffled(r: Rng, right: string, wrong: readonly string[]): Pick {
  const labels = r.shuffle([right, ...wrong]);
  return { choices: labels.map((label) => ({ label })), index: labels.indexOf(right) };
}

/** Category answers (Fact or Opinion, the sentence types…) keep one fixed order so the buttons stay put. */
const fixed = (labels: readonly string[], index: number): Pick => ({ choices: labels.map((label) => ({ label })), index });

function mc(prompt: MathPart[], say: string, pick: Pick, hints: string[], steps: string[], seconds: number): ItemBody {
  return { prompt, say, choices: pick.choices, input: "choices", answer: { kind: "choice", index: pick.index }, hints, steps, seconds };
}

/** A sentence with ___ becomes prompt parts with an answer blank. */
function blanked(sentence: string): MathPart[] {
  const [before, after] = sentence.split("___");
  return [...(before ? [before] : []), { blank: true }, ...(after ? [after] : [])];
}
const sayBlank = (locale: Locale, sentence: string) => sentence.replace("___", tr(locale, "blank", "espacio en blanco"));
const fill = (sentence: string, word: string) => {
  const out = sentence.replace("___", word);
  return out.charAt(0).toUpperCase() + out.slice(1);
};

// ---------------------------------------------------------------------------------------------------
// e.context.clues — level 1: definition or synonym clues; level 2: contrast and inference clues.

type ContextEntry = [sentence: string, word: string, right: string, wrong: [string, string, string], clue: string];

const CONTEXT: Bi<ContextEntry>[][] = [
  [
    {
      en: ["The hikers were famished, or very hungry, after walking all morning.", "famished", "starving", ["very tired", "lost", "cheerful"], "or very hungry"],
      es: ["Los excursionistas estaban famélicos, es decir, muertos de hambre, después de caminar toda la mañana.", "famélicos", "con mucha hambre", ["muy cansados", "perdidos", "muy alegres"], "es decir, muertos de hambre"],
    },
    {
      en: ["Our class made a replica, which is an exact copy, of the old town bell.", "replica", "a copy that looks just like the original", ["a broken piece", "a drawing of a map", "a loud sound"], "which is an exact copy"],
      es: ["Nuestra clase hizo una réplica, o sea, una copia exacta, de la vieja campana del pueblo.", "réplica", "una copia idéntica al original", ["un pedazo roto", "un dibujo de un mapa", "un sonido fuerte"], "o sea, una copia exacta"],
    },
    {
      en: ["The puppy was timid; it hid behind the couch whenever a new person came in.", "timid", "shy and easily scared", ["playful and loud", "hungry", "very small"], "hid behind the couch whenever a new person came in"],
      es: ["El cachorro era huraño: se escondía detrás del sofá cada vez que llegaba alguien nuevo.", "huraño", "que evita a la gente", ["juguetón y ruidoso", "con mucha hambre", "muy pequeño"], "se escondía detrás del sofá cada vez que llegaba alguien nuevo"],
    },
    {
      en: ["Maya was elated, which means extremely happy, when her team won the spelling bee.", "elated", "full of joy", ["very nervous", "confused", "disappointed"], "which means extremely happy"],
      es: ["Maya estaba eufórica, que significa muy feliz, cuando su equipo ganó el concurso de ortografía.", "eufórica", "llena de alegría", ["muy nerviosa", "confundida", "decepcionada"], "que significa muy feliz"],
    },
    {
      en: ["The library has an abundance of books. In other words, it has plenty of them.", "abundance", "a large amount", ["an old collection", "a quiet room", "a short list"], "In other words, it has plenty of them"],
      es: ["La biblioteca tiene profusión de libros; en otras palabras, tiene muchísimos.", "profusión", "una gran cantidad", ["una colección vieja", "un salón silencioso", "una lista corta"], "en otras palabras, tiene muchísimos"],
    },
    {
      en: ["The soup was scalding, or burning hot, so Ben waited before tasting it.", "scalding", "extremely hot", ["very salty", "ice cold", "too thick"], "or burning hot"],
      es: ["La sopa estaba hirviente, o sea, quemaba, así que Beto esperó antes de probarla.", "hirviente", "muy caliente", ["muy salada", "helada", "muy espesa"], "o sea, quemaba"],
    },
    {
      en: ["Recycling helps conserve, or save, our natural resources.", "conserve", "protect and not waste", ["use up", "count", "find"], "or save"],
      es: ["Reciclar ayuda a preservar, es decir, a cuidar, los recursos naturales.", "preservar", "proteger y no desperdiciar", ["gastar por completo", "contar", "encontrar"], "es decir, a cuidar"],
    },
    {
      en: ["Please be concise. Keep your answer short and clear.", "concise", "brief and to the point", ["long and detailed", "loud", "slow and careful"], "Keep your answer short and clear"],
      es: ["Sé conciso: da una respuesta corta y clara.", "conciso", "breve y directo", ["largo y detallado", "en voz alta", "lento y cuidadoso"], "da una respuesta corta y clara"],
    },
    {
      en: ["The field was arid, meaning it was very dry and got little rain.", "arid", "lacking water", ["muddy", "green and grassy", "very windy"], "meaning it was very dry and got little rain"],
      es: ["El campo era árido, lo que quiere decir que era muy seco y casi no llovía.", "árido", "con muy poca agua", ["lodoso", "verde y con pasto", "con mucho viento"], "lo que quiere decir que era muy seco y casi no llovía"],
    },
    {
      en: ["Lena was reluctant to jump into the cold pool. She did not want to do it.", "reluctant", "not willing", ["excited", "ready", "the first one"], "She did not want to do it"],
      es: ["Lena estaba renuente a saltar a la piscina fría. No quería hacerlo.", "renuente", "sin ganas de hacerlo", ["emocionada", "lista para hacerlo", "la primera en la fila"], "No quería hacerlo"],
    },
    {
      en: ["The coach gave us a brief talk, a short one, before the game.", "brief", "not long", ["angry", "funny", "long"], "a short one"],
      es: ["El entrenador nos dio una charla breve, es decir, corta, antes del partido.", "breve", "de poca duración", ["enojada", "divertida", "larga"], "es decir, corta"],
    },
    {
      en: ["Dad is frugal; he is careful not to waste money.", "frugal", "careful with money", ["generous with gifts", "rich", "forgetful"], "he is careful not to waste money"],
      es: ["Papá es austero: tiene cuidado de no gastar dinero de más.", "austero", "cuidadoso con el dinero", ["generoso con los regalos", "muy rico", "olvidadizo"], "tiene cuidado de no gastar dinero de más"],
    },
    {
      en: ["The noisy cafeteria became tranquil, or calm and quiet, after lunch ended.", "tranquil", "peaceful", ["crowded", "messy", "loud"], "or calm and quiet"],
      es: ["La cafetería ruidosa quedó apacible, o sea, tranquila y silenciosa, al terminar el almuerzo.", "apacible", "en calma", ["llena de gente", "desordenada", "ruidosa"], "o sea, tranquila y silenciosa"],
    },
    {
      en: ["A nocturnal animal, one that is active at night, sleeps during the day.", "nocturnal", "awake and moving after dark", ["active during the day", "living in water", "very large"], "one that is active at night"],
      es: ["Un animal nocturno, es decir, uno que está activo de noche, duerme durante el día.", "nocturno", "despierto cuando oscurece", ["activo de día", "que vive en el agua", "muy grande"], "es decir, uno que está activo de noche"],
    },
  ],
  [
    {
      en: ["Unlike his talkative sister, Omar is reserved and rarely speaks in class.", "reserved", "quiet and private", ["talkative", "booked ahead of time", "rude"], "Unlike his talkative sister"],
      es: ["A diferencia de su hermana conversadora, Omar es reservado y casi nunca habla en clase.", "reservado", "callado y discreto", ["conversador", "apartado con anticipación", "grosero"], "A diferencia de su hermana conversadora"],
    },
    {
      en: ["The first test was easy, but the second one was arduous, and most of us needed the whole hour.", "arduous", "very hard", ["very easy", "short", "fun"], "but … most of us needed the whole hour"],
      es: ["El primer examen fue fácil, pero el segundo fue arduo y casi todos necesitamos la hora completa.", "arduo", "muy difícil", ["muy fácil", "corto", "divertido"], "pero … casi todos necesitamos la hora completa"],
    },
    {
      en: ["After the storm, the icy sidewalk was treacherous, so the principal told everyone to walk on the grass.", "treacherous", "dangerous", ["beautiful", "crowded", "freshly cleaned"], "icy … told everyone to walk on the grass"],
      es: ["Después de la tormenta, la acera helada estaba traicionera, así que la directora pidió caminar por el pasto.", "traicionera", "peligrosa", ["bonita", "llena de gente", "recién limpia"], "helada … pidió caminar por el pasto"],
    },
    {
      en: ["Jada's room is usually a mess, but today it was immaculate, with not a single sock on the floor.", "immaculate", "perfectly clean", ["very messy", "freshly painted", "very small"], "usually a mess, but … not a single sock on the floor"],
      es: ["El cuarto de Jada casi siempre está desordenado, pero hoy estaba impecable: ni un calcetín en el piso.", "impecable", "perfectamente limpio", ["muy desordenado", "recién pintado", "muy pequeño"], "casi siempre está desordenado, pero … ni un calcetín en el piso"],
    },
    {
      en: ["Homework in this class is not optional; it is mandatory, and every assignment counts.", "mandatory", "required", ["optional", "difficult", "short"], "not optional … every assignment counts"],
      es: ["La tarea en esta clase no es opcional; es forzosa y cada trabajo cuenta.", "forzosa", "obligatoria", ["opcional", "difícil", "corta"], "no es opcional … cada trabajo cuenta"],
    },
    {
      en: ["The cat looked at the bath with disdain, turned up its nose, and walked away.", "disdain", "a feeling that something is beneath you", ["joy", "fear of water", "curiosity"], "turned up its nose, and walked away"],
      es: ["El gato miró la bañera con desdén, levantó la nariz y se fue.", "desdén", "desprecio", ["alegría", "miedo al agua", "curiosidad"], "levantó la nariz y se fue"],
    },
    {
      en: ["Even though the movie was long, the kids were so engrossed that no one looked away from the screen.", "engrossed", "completely absorbed", ["bored", "confused", "sleepy"], "no one looked away from the screen"],
      es: ["Aunque la película era larga, los niños estaban tan absortos que nadie apartó la vista de la pantalla.", "absortos", "totalmente concentrados", ["aburridos", "confundidos", "con sueño"], "nadie apartó la vista de la pantalla"],
    },
    {
      en: ["Most of the class agreed with the plan, but Pablo was skeptical and asked for proof that it would work.", "skeptical", "doubtful", ["sure it would work", "angry", "excited"], "but … asked for proof that it would work"],
      es: ["Casi toda la clase estuvo de acuerdo con el plan, pero Pablo era escéptico y pidió pruebas de que funcionaría.", "escéptico", "con dudas", ["seguro de que funcionaría", "enojado", "emocionado"], "pero … pidió pruebas de que funcionaría"],
    },
    {
      en: ["The old bridge was fragile, so the town allowed only people on foot, not cars.", "fragile", "easily broken", ["very long", "brand new", "strong"], "allowed only people on foot, not cars"],
      es: ["El viejo puente era endeble, así que el pueblo solo dejaba pasar a la gente a pie, no a los carros.", "endeble", "débil, fácil de romper", ["muy largo", "nuevo", "fuerte"], "solo dejaba pasar a la gente a pie, no a los carros"],
    },
    {
      en: ["Sam's answer was vague, while Ana's was clear and full of details.", "vague", "not clear", ["full of details", "correct", "funny"], "while Ana's was clear and full of details"],
      es: ["La respuesta de Sam fue vaga, mientras que la de Ana fue clara y llena de detalles.", "vaga", "poco clara", ["llena de detalles", "correcta", "perezosa"], "mientras que la de Ana fue clara y llena de detalles"],
    },
    {
      en: ["The plant had been neglected for weeks; its leaves were brown and the soil was dust-dry.", "neglected", "not taken care of", ["watered often", "moved outside", "recently bought"], "its leaves were brown and the soil was dust-dry"],
      es: ["La planta estaba mustia: las hojas colgaban cafés y la tierra estaba seca como polvo.", "mustia", "seca y sin fuerza", ["regada a menudo", "recién comprada", "llena de flores"], "las hojas colgaban cafés y la tierra estaba seca como polvo"],
    },
    {
      en: ["The water in the pond was murky, unlike the clear water in the fish tank.", "murky", "cloudy and dark", ["clear", "cold", "deep"], "unlike the clear water"],
      es: ["El agua del estanque estaba turbia, a diferencia del agua clara de la pecera.", "turbia", "poco transparente", ["clara", "fría", "profunda"], "a diferencia del agua clara"],
    },
    {
      en: ["The kitten was so docile that it let the children hold it, brush it, and even put a bow on it.", "docile", "calm and easy to handle", ["wild and scratchy", "tiny", "asleep"], "let the children hold it, brush it, and even put a bow on it"],
      es: ["El gatito era tan dócil que dejó que los niños lo cargaran, lo cepillaran y hasta le pusieran un moño.", "dócil", "tranquilo y fácil de manejar", ["salvaje y arisco", "diminuto", "dormido"], "dejó que los niños lo cargaran, lo cepillaran y hasta le pusieran un moño"],
    },
    {
      en: ["Our team was jubilant after the win; players hugged, cheered, and danced on the field.", "jubilant", "full of joy", ["tired", "upset", "surprised"], "players hugged, cheered, and danced"],
      es: ["Nuestro equipo estaba jubiloso después de ganar: los jugadores se abrazaron, gritaron y bailaron en la cancha.", "jubiloso", "lleno de alegría", ["cansado", "molesto", "sorprendido"], "los jugadores se abrazaron, gritaron y bailaron"],
    },
  ],
];

// ---------------------------------------------------------------------------------------------------
// e.fact.opinion — only clear-cut statements: a fact can be checked, an opinion is a judgment.

type FactEntry = [statement: string, fact: boolean, why: string];

const FACT_OPINION: Bi<FactEntry>[] = [
  { en: ["Water freezes at 32 degrees Fahrenheit.", true, "You could test this with a thermometer."], es: ["El agua se congela a 0 grados Celsius.", true, "Se puede comprobar con un termómetro."] },
  { en: ["Our school library opens at 8:00 every morning.", true, "You could check the hours posted on the library door."], es: ["La biblioteca de la escuela abre a las 8:00 todas las mañanas.", true, "Se puede comprobar con el horario de la puerta de la biblioteca."] },
  { en: ["A spider has eight legs.", true, "You could count the legs or look it up in a science book."], es: ["Una araña tiene ocho patas.", true, "Se pueden contar las patas o buscarlo en un libro de ciencias."] },
  { en: ["The cafeteria menu lists tacos for Tuesday.", true, "You could read the menu to check."], es: ["El menú de la cafetería dice que el martes hay tacos.", true, "Se puede leer el menú para comprobarlo."] },
  { en: ["Aluminum cans can be recycled.", true, "You could check this with the town's recycling guide."], es: ["Las latas de aluminio se pueden reciclar.", true, "Se puede comprobar con la guía de reciclaje del pueblo."] },
  { en: ["There are 12 months in a year.", true, "You could count the months on a calendar."], es: ["Un año tiene 12 meses.", true, "Se pueden contar los meses en un calendario."] },
  { en: ["The park on Elm Street has three swings.", true, "You could go to the park and count them."], es: ["El parque de la calle Olmo tiene tres columpios.", true, "Se puede ir al parque y contarlos."] },
  { en: ["Dogs are mammals.", true, "You could look this up in a science book."], es: ["Los perros son mamíferos.", true, "Se puede buscar en un libro de ciencias."] },
  { en: ["The soccer game starts at 10 a.m. on Saturday.", true, "You could check the game schedule."], es: ["El partido de fútbol empieza a las 10 de la mañana el sábado.", true, "Se puede revisar el calendario de partidos."] },
  { en: ["Earth travels around the Sun.", true, "Scientists have measured this, and you could look it up."], es: ["La Tierra gira alrededor del Sol.", true, "Los científicos lo han medido y se puede buscar en un libro."] },
  { en: ["Our class has 24 students.", true, "You could count the students on the class list."], es: ["Nuestra clase tiene 24 estudiantes.", true, "Se pueden contar los nombres en la lista de la clase."] },
  { en: ["Pizza is the best school lunch.", false, "“Best” is a judgment. Other people could pick a different lunch."], es: ["La pizza es el mejor almuerzo de la escuela.", false, "“El mejor” es un juicio. Otras personas podrían elegir otro almuerzo."] },
  { en: ["Recess should be longer.", false, "“Should” tells what someone wants. It cannot be measured or checked."], es: ["El recreo debería ser más largo.", false, "“Debería” dice lo que alguien quiere. No se puede medir ni comprobar."] },
  { en: ["Cats make better pets than dogs.", false, "“Better” is a judgment. Dog lovers would disagree."], es: ["Los gatos son mejores mascotas que los perros.", false, "“Mejores” es un juicio. A quien le gustan los perros no estaría de acuerdo."] },
  { en: ["Math homework is boring.", false, "“Boring” is a feeling. Some students enjoy math homework."], es: ["La tarea de matemáticas es aburrida.", false, "“Aburrida” es un sentimiento. A algunos estudiantes les gusta la tarea de matemáticas."] },
  { en: ["The new playground is beautiful.", false, "“Beautiful” is a judgment about looks. People can disagree."], es: ["El nuevo patio de juegos es hermoso.", false, "“Hermoso” es un juicio sobre cómo se ve. La gente puede no estar de acuerdo."] },
  { en: ["Everyone should read before bed.", false, "“Should” tells what someone thinks is right. It cannot be checked."], es: ["Todos deberían leer antes de dormir.", false, "“Deberían” dice lo que alguien cree que está bien. No se puede comprobar."] },
  { en: ["Soccer is the most exciting sport.", false, "“Most exciting” is a feeling. Fans of other sports would disagree."], es: ["El fútbol es el deporte más emocionante.", false, "“Más emocionante” es un sentimiento. A quien le gustan otros deportes no estaría de acuerdo."] },
  { en: ["Phones at school are annoying.", false, "“Annoying” is a feeling. Not everyone feels that way."], es: ["Los teléfonos en la escuela son molestos.", false, "“Molestos” es un sentimiento. No todos piensan así."] },
  { en: ["Summer is the nicest season.", false, "“Nicest” is a judgment. Someone else might prefer winter."], es: ["El verano es la estación más bonita.", false, "“Más bonita” es un juicio. Otra persona podría preferir el invierno."] },
  { en: ["The library is the most fun place in town.", false, "“Most fun” is a judgment. Others might pick the park."], es: ["La biblioteca es el lugar más divertido del pueblo.", false, "“Más divertido” es un juicio. Otros podrían elegir el parque."] },
  { en: ["Video games are more fun than board games.", false, "“More fun” is a judgment. People enjoy different games."], es: ["Los videojuegos son más divertidos que los juegos de mesa.", false, "“Más divertidos” es un juicio. A cada quien le gustan juegos distintos."] },
];

// ---------------------------------------------------------------------------------------------------
// e.main.idea — level 1: the first sentence states the main idea; level 2: it is implied or comes last.
// Distractors are always one detail, one statement too broad to be about this paragraph, and one
// statement the paragraph never discusses.

type MainEntry = [passage: string, main: string, detail: string, broad: string, unrelated: string];

const MAIN_IDEA: Bi<MainEntry>[][] = [
  [
    {
      en: ["Our town library offers much more than books. Kids can join a free chess club on Tuesdays. Families can borrow board games and even fishing poles. On Saturdays, volunteers help students with homework.", "The library offers many things besides books.", "Kids can play chess on Tuesdays.", "Towns have many kinds of buildings.", "Libraries should stay open all night."],
      es: ["La biblioteca del pueblo ofrece mucho más que libros. Los niños pueden unirse a un club de ajedrez gratis los martes. Las familias pueden pedir prestados juegos de mesa y hasta cañas de pescar. Los sábados, unos voluntarios ayudan a los estudiantes con la tarea.", "La biblioteca ofrece muchas cosas además de libros.", "Los niños pueden jugar ajedrez los martes.", "Los pueblos tienen muchos tipos de edificios.", "Las bibliotecas deberían abrir toda la noche."],
    },
    {
      en: ["Recess helps students do better in class. Running and playing let kids burn off extra energy. After a break, many students find it easier to focus. Recess also gives kids time to practice getting along with others.", "Recess helps students learn and get along.", "Running lets kids burn off energy.", "Children go to school.", "Recess should happen indoors."],
      es: ["El recreo ayuda a los estudiantes a rendir más en clase. Correr y jugar les permite gastar energía. Después de un descanso, a muchos les cuesta menos concentrarse. El recreo también les da tiempo para aprender a convivir.", "El recreo ayuda a los estudiantes a aprender y a convivir.", "Correr les permite gastar energía.", "Los niños van a la escuela.", "El recreo debería ser adentro."],
    },
    {
      en: ["Taking care of a dog is a big responsibility. A dog needs food and fresh water every day. It needs walks and exercise. It also needs visits to the vet to stay healthy.", "Caring for a dog takes a lot of work.", "Dogs need fresh water.", "Animals live all over the world.", "Cats are easier to train than dogs."],
      es: ["Cuidar a un perro es una gran responsabilidad. Un perro necesita comida y agua fresca todos los días. Necesita paseos y ejercicio. También necesita visitas al veterinario para estar sano.", "Cuidar a un perro requiere mucho trabajo.", "Los perros necesitan agua fresca.", "Hay animales en todo el mundo.", "Los gatos son más fáciles de entrenar que los perros."],
    },
    {
      en: ["Recycling at our school is easy when everyone helps. Each classroom has a blue bin for paper. The cafeteria has bins for cans and bottles. Students on the green team empty the bins every Friday.", "Our school makes recycling easy with everyone's help.", "The cafeteria has bins for cans.", "People throw away many things.", "Plastic is made from oil."],
      es: ["Reciclar en nuestra escuela es fácil cuando todos ayudan. Cada salón tiene un bote azul para el papel. La cafetería tiene botes para latas y botellas. Los estudiantes del equipo verde vacían los botes cada viernes.", "En nuestra escuela es fácil reciclar si todos ayudan.", "La cafetería tiene botes para latas.", "La gente tira muchas cosas.", "El plástico se hace con petróleo."],
    },
    {
      en: ["Getting enough sleep helps kids in many ways. Sleep gives the body time to grow and repair itself. A rested brain remembers what it learned that day. Kids who sleep well are also less likely to feel grumpy.", "Sleep helps kids' bodies, minds, and moods.", "A rested brain remembers more.", "Everyone does things at night.", "Some animals sleep standing up."],
      es: ["Dormir lo suficiente ayuda a los niños de muchas maneras. El sueño le da al cuerpo tiempo para crecer y repararse. Un cerebro descansado recuerda lo que aprendió ese día. Los niños que duermen bien también se ponen de mal humor con menos frecuencia.", "Dormir ayuda al cuerpo, a la mente y al ánimo de los niños.", "Un cerebro descansado recuerda más.", "Todos hacen cosas de noche.", "Algunos animales duermen de pie."],
    },
    {
      en: ["A bike helmet protects your head in several ways. Its hard outer shell spreads out the force of a fall. The foam inside soaks up the shock. A snug strap keeps the helmet in place.", "A helmet protects your head in different ways.", "The foam soaks up the shock.", "Bikes have many parts.", "Biking is faster than walking."],
      es: ["Un casco de bicicleta protege la cabeza de varias maneras. Su cubierta dura reparte la fuerza de una caída. La espuma de adentro absorbe el golpe. Una correa bien ajustada mantiene el casco en su lugar.", "Un casco protege la cabeza de distintas maneras.", "La espuma absorbe el golpe.", "Las bicicletas tienen muchas partes.", "Andar en bicicleta es más rápido que caminar."],
    },
    {
      en: ["The school garden teaches students about more than plants. Students measure how tall the bean plants grow each week. They write about the changes they see. They also sell the vegetables at a fall market and count the money.", "The garden helps students learn many subjects.", "Students measure the bean plants.", "Schools teach many things.", "Tomatoes are really fruits."],
      es: ["El huerto escolar enseña a los estudiantes más que sobre plantas. Los estudiantes miden cuánto crecen los frijoles cada semana. Escriben sobre los cambios que ven. También venden las verduras en un mercado de otoño y cuentan el dinero.", "El huerto ayuda a los estudiantes a aprender muchas materias.", "Los estudiantes miden los frijoles.", "Las escuelas enseñan muchas cosas.", "Los tomates en realidad son frutas."],
    },
    {
      en: ["Honeybees work together to keep their hive running. Some bees gather nectar and pollen from flowers. Others clean the hive and care for the young bees. A few guard the entrance from intruders.", "Honeybees share jobs to run the hive.", "Some bees guard the entrance.", "Insects are everywhere.", "Bee stings can hurt."],
      es: ["Las abejas trabajan en equipo para que su colmena funcione. Algunas recogen néctar y polen de las flores. Otras limpian la colmena y cuidan a las abejas jóvenes. Unas pocas vigilan la entrada para que no entren intrusos.", "Las abejas se reparten el trabajo de la colmena.", "Algunas abejas vigilan la entrada.", "Hay insectos en todas partes.", "Las picaduras de abeja pueden doler."],
    },
    {
      en: ["Drinking water is important for athletes. Players lose water when they sweat. Without enough water, muscles can cramp and players feel tired. That is why coaches give water breaks during practice.", "Athletes need water to play well.", "Players lose water when they sweat.", "Sports are popular.", "Sports drinks come in many flavors."],
      es: ["Tomar agua es importante para los deportistas. Los jugadores pierden agua cuando sudan. Sin suficiente agua, los músculos pueden acalambrarse y los jugadores se cansan. Por eso los entrenadores dan pausas para tomar agua durante la práctica.", "Los deportistas necesitan agua para jugar bien.", "Los jugadores pierden agua cuando sudan.", "Los deportes son populares.", "Las bebidas deportivas vienen en muchos sabores."],
    },
    {
      en: ["Packing lunch the night before saves time in the morning. You can make a sandwich and put it in the fridge. Fruit and a snack can go in the bag ahead of time. In the morning, you just grab it and go.", "Packing lunch the night before makes mornings easier.", "Fruit can go in the bag early.", "People eat many meals.", "School lunches should be free."],
      es: ["Preparar el almuerzo la noche anterior ahorra tiempo en la mañana. Puedes hacer un sándwich y guardarlo en el refrigerador. La fruta y un refrigerio pueden ir en la bolsa desde antes. En la mañana, solo lo tomas y te vas.", "Preparar el almuerzo la noche anterior facilita las mañanas.", "La fruta puede ir en la bolsa desde antes.", "La gente come muchas comidas.", "Los almuerzos escolares deberían ser gratis."],
    },
    {
      en: ["City parks give people many ways to stay active. Walking paths wind around the pond. There are courts for basketball and tennis. On weekends, a free exercise class meets on the lawn.", "Parks offer many ways to exercise.", "There are basketball courts.", "Cities are busy places.", "Ponds are home to ducks."],
      es: ["Los parques de la ciudad dan a la gente muchas maneras de mantenerse activa. Hay caminos que rodean el estanque. Hay canchas de básquetbol y de tenis. Los fines de semana, una clase de ejercicio gratis se reúne en el pasto.", "Los parques ofrecen muchas maneras de hacer ejercicio.", "Hay canchas de básquetbol.", "Las ciudades son lugares muy activos.", "En los estanques viven patos."],
    },
    {
      en: ["Video games can be fun, but they work best in small doses. Playing for a short time can help kids relax. Playing for hours can cut into sleep and homework time. Many families set a time limit to keep a healthy balance.", "Video games are best in limited amounts.", "Playing can help kids relax.", "People have many hobbies.", "Some video games are very expensive."],
      es: ["Los videojuegos pueden ser divertidos, pero funcionan mejor en dosis pequeñas. Jugar un rato corto puede ayudar a relajarse. Jugar durante horas puede quitar tiempo de sueño y de tarea. Muchas familias ponen un límite de tiempo para mantener el equilibrio.", "Los videojuegos son mejores en cantidades limitadas.", "Jugar puede ayudar a relajarse.", "La gente tiene muchos pasatiempos.", "Algunos videojuegos son muy caros."],
    },
    {
      en: ["Emperor penguins survive the coldest winters on Earth. They huddle together in large groups to share warmth. Thick layers of fat keep their bodies warm. Their tightly packed feathers block the icy wind.", "Emperor penguins have ways to survive extreme cold.", "Penguins huddle in large groups.", "Many animals live in cold places.", "Penguins cannot fly."],
      es: ["Los pingüinos emperador sobreviven a los inviernos más fríos de la Tierra. Se juntan en grandes grupos para compartir el calor. Unas capas gruesas de grasa mantienen caliente su cuerpo. Sus plumas, muy apretadas, frenan el viento helado.", "Los pingüinos emperador tienen maneras de sobrevivir al frío extremo.", "Los pingüinos se juntan en grandes grupos.", "Muchos animales viven en lugares fríos.", "Los pingüinos no pueden volar."],
    },
  ],
  [
    {
      en: ["Ana fills a jug with water before she leaves for school. She checks that her tomato plants have shade on hot days. Each evening she pulls the weeds that sprouted overnight. On weekends she adds compost to the soil.", "Ana takes careful care of her garden.", "Ana pulls weeds every evening.", "Ana has a busy life.", "Tomatoes grow best in cold weather."],
      es: ["Ana llena una jarra de agua antes de irse a la escuela. Revisa que sus tomateras tengan sombra en los días de calor. Cada tarde arranca la maleza que brotó la noche anterior. Los fines de semana le agrega abono a la tierra.", "Ana cuida su huerto con mucho esmero.", "Ana arranca la maleza cada tarde.", "Ana tiene una vida muy ocupada.", "Los tomates crecen mejor con frío."],
    },
    {
      en: ["Since our school started keeping phones in locked pouches, lunch tables are loud with conversation. Fewer students glance at screens during class. Some students missed their phones at first. Now most say they hardly notice.", "Keeping phones in pouches has changed the school day.", "Lunch tables are louder with talk.", "Schools have many rules.", "Phones keep getting more expensive."],
      es: ["Desde que la escuela guarda los teléfonos en bolsas con candado, las mesas del almuerzo se llenan de conversación. Menos estudiantes miran pantallas durante la clase. Al principio, algunos extrañaban su teléfono. Ahora casi todos dicen que ni lo notan.", "Guardar los teléfonos en bolsas ha cambiado el día escolar.", "En el almuerzo se conversa más.", "Las escuelas tienen muchas reglas.", "Los teléfonos son cada vez más caros."],
    },
    {
      en: ["Marco's dog, Pepper, used to pull on the leash and bark at every squirrel. Marco practiced with her for ten minutes every day, using treats as rewards. After a month, Pepper walked calmly at his side. Now neighbors ask Marco for tips.", "Daily practice helped Marco train his dog.", "Marco used treats as rewards.", "Dogs are popular pets.", "Squirrels store nuts for winter."],
      es: ["Pimienta, la perra de Marco, jalaba la correa y le ladraba a cada ardilla. Marco practicó con ella diez minutos todos los días, con premios como recompensa. Después de un mes, Pimienta caminaba tranquila a su lado. Ahora los vecinos le piden consejos a Marco.", "La práctica diaria ayudó a Marco a entrenar a su perra.", "Marco usó premios como recompensa.", "Los perros son mascotas populares.", "Las ardillas guardan nueces para el invierno."],
    },
    {
      en: ["The old field turned to mud every spring, and games were often canceled. Last summer, volunteers added drains and planted tougher grass. This spring, not a single game was called off. The team even hosted the league finals.", "Fixing the field let the team play all season.", "Volunteers planted tougher grass.", "Weather affects many things.", "Mud is good for gardens."],
      es: ["La cancha vieja se llenaba de lodo cada primavera y muchos partidos se cancelaban. El verano pasado, unos voluntarios pusieron drenajes y sembraron un pasto más resistente. Esta primavera no se canceló ni un partido. El equipo hasta fue sede de la final de la liga.", "Arreglar la cancha permitió jugar toda la temporada.", "Unos voluntarios sembraron un pasto más resistente.", "El clima afecta muchas cosas.", "El lodo es bueno para los huertos."],
    },
    {
      en: ["Twice a month, a bus filled with books parks outside the apartments on Pine Road. Children climb aboard to pick out stories and graphic novels. The nearest library is across the highway, too far to walk. For many families, the bus is the easiest way to borrow books.", "The book bus brings books to kids who live far from a library.", "Children pick out graphic novels.", "Reading is important.", "Buses use a lot of fuel."],
      es: ["Dos veces al mes, un autobús lleno de libros se estaciona frente a los apartamentos de la calle Pino. Los niños suben a escoger cuentos y novelas gráficas. La biblioteca más cercana está al otro lado de la autopista, demasiado lejos para ir a pie. Para muchas familias, el autobús es la manera más fácil de pedir libros.", "El autobús de libros lleva libros a niños que viven lejos de una biblioteca.", "Los niños escogen novelas gráficas.", "Leer es importante.", "Los autobuses gastan mucho combustible."],
    },
    {
      en: ["Kai wrote his homework assignments in a planner each day. He set a timer so he would take breaks. He packed his backpack every night before bed. By the end of the term, staying organized had raised his grades.", "Staying organized helped Kai do better in school.", "Kai set a timer for breaks.", "Students have homework.", "Planners come in many colors."],
      es: ["Kai anotaba sus tareas en una agenda cada día. Ponía un temporizador para tomar descansos. Preparaba la mochila todas las noches antes de dormir. Al final del trimestre, ser organizado le había subido las calificaciones.", "Ser organizado ayudó a Kai a mejorar en la escuela.", "Kai ponía un temporizador para descansar.", "Los estudiantes tienen tarea.", "Las agendas vienen en muchos colores."],
    },
    {
      en: ["At first, only five students signed up for the recycling club. They put up posters showing how much paper the school threw away each week. They visited classrooms to explain which bins to use. By spring, forty students had joined, and the school's trash was cut in half.", "The club's hard work made recycling grow at the school.", "The club put up posters.", "Many schools have clubs.", "Paper is made from trees."],
      es: ["Al principio, solo cinco estudiantes se inscribieron en el club de reciclaje. Pusieron carteles que mostraban cuánto papel tiraba la escuela cada semana. Visitaron los salones para explicar qué bote usar. Para la primavera, cuarenta estudiantes se habían unido y la basura de la escuela se redujo a la mitad.", "El trabajo del club hizo crecer el reciclaje en la escuela.", "El club puso carteles.", "Muchas escuelas tienen clubes.", "El papel se hace con árboles."],
    },
    {
      en: ["Some people worried that a salad bar in the cafeteria would go to waste. But at Hillside School, students filled their trays with carrots, peppers, and beans the first week. Lunch workers say less food goes in the trash than before. The school now plans to add a fruit station.", "The salad bar has been a success at the school.", "Students chose carrots and peppers.", "Schools serve lunch.", "Beans are a good source of protein."],
      es: ["Algunas personas temían que una barra de ensaladas en la cafetería se desperdiciara. Pero en la escuela Colinas, los estudiantes llenaron sus charolas de zanahorias, pimientos y frijoles la primera semana. Las cocineras dicen que ahora se tira menos comida que antes. La escuela ya planea agregar una mesa de frutas.", "La barra de ensaladas ha sido un éxito en la escuela.", "Los estudiantes escogieron zanahorias y pimientos.", "Las escuelas sirven almuerzo.", "Los frijoles tienen mucha proteína."],
    },
    {
      en: ["An octopus can change the color of its skin in less than a second. It can squeeze its soft body through a hole the size of a coin. It can also squirt dark ink to cloud the water. These tricks help it escape animals that want to eat it.", "An octopus has several ways to escape predators.", "An octopus can squirt ink.", "Ocean animals are interesting.", "Octopuses have three hearts."],
      es: ["Un pulpo puede cambiar el color de su piel en menos de un segundo. Puede meter su cuerpo blando por un agujero del tamaño de una moneda. También puede lanzar tinta oscura para enturbiar el agua. Estos trucos le sirven para escapar de los animales que quieren comérselo.", "El pulpo tiene varias maneras de escapar de sus depredadores.", "El pulpo puede lanzar tinta.", "Los animales del mar son interesantes.", "Los pulpos tienen tres corazones."],
    },
    {
      en: ["Lucía's grandmother cannot see well enough to read anymore. Every Sunday, Lucía reads the newspaper aloud to her. Afterward, they talk about the stories, and Lucía learns new words. Both of them look forward to Sunday all week.", "Reading together helps both Lucía and her grandmother.", "Lucía learns new words.", "Families spend time together.", "Newspapers are printed every day."],
      es: ["La abuela de Lucía ya no ve bien para leer. Cada domingo, Lucía le lee el periódico en voz alta. Después platican sobre las noticias y Lucía aprende palabras nuevas. Las dos esperan el domingo toda la semana.", "Leer juntas les hace bien a Lucía y a su abuela.", "Lucía aprende palabras nuevas.", "Las familias pasan tiempo juntas.", "Los periódicos se imprimen todos los días."],
    },
    {
      en: ["The trash cans at the park used to overflow on weekends. The city added more cans and a recycling bin at each picnic area. Volunteers put up signs asking visitors to carry out what they bring. Now the grass stays clean, and ducks have returned to the pond.", "Several changes helped keep the park clean.", "The city added more trash cans.", "Parks are nice places to visit.", "Ducks fly south in winter."],
      es: ["Los botes de basura del parque se desbordaban los fines de semana. La ciudad puso más botes y uno de reciclaje en cada zona de picnic. Unos voluntarios colocaron letreros que piden a los visitantes llevarse lo que traen. Ahora el pasto está limpio y los patos volvieron al estanque.", "Varios cambios ayudaron a mantener limpio el parque.", "La ciudad puso más botes de basura.", "Los parques son lugares agradables.", "Los patos vuelan al sur en invierno."],
    },
    {
      en: ["Mia's team lost its first four games. Instead of giving up, the players met early to practice passing. They watched videos of their games to spot mistakes. They won five of their last six games.", "Hard work turned the team's season around.", "The players watched videos of their games.", "Sports have winners and losers.", "Soccer is played all over the world."],
      es: ["El equipo de Mía perdió sus primeros cuatro partidos. En vez de rendirse, las jugadoras llegaban temprano a practicar pases. Veían videos de sus partidos para encontrar errores. Ganaron cinco de sus últimos seis partidos.", "El esfuerzo cambió la temporada del equipo.", "Las jugadoras veían videos de sus partidos.", "En los deportes hay ganadores y perdedores.", "El fútbol se juega en todo el mundo."],
    },
    {
      en: ["Ravi used to leave the water running while he brushed his teeth. Then he learned that a faucet can pour out about two gallons a minute. Now he turns it off until he needs to rinse. He even made a sign for the bathroom mirror to remind his little brother.", "Ravi learned to save water and helps others do it too.", "Ravi made a sign for the mirror.", "Water is important.", "Toothpaste comes in many flavors."],
      es: ["Ravi dejaba la llave abierta mientras se cepillaba los dientes. Luego aprendió que una llave puede echar unos ocho litros por minuto. Ahora la cierra hasta que necesita enjuagarse. Hasta hizo un letrero para el espejo del baño para recordárselo a su hermanito.", "Ravi aprendió a ahorrar agua y ayuda a otros a hacerlo.", "Ravi hizo un letrero para el espejo.", "El agua es importante.", "La pasta de dientes viene en muchos sabores."],
    },
  ],
];

// ---------------------------------------------------------------------------------------------------
// e.claim.evidence — level 1: name the part of a three-sentence argument; level 2: pick the evidence
// that best supports a claim over an opinion, a true-but-off-point fact, and one person's story.

type ArgumentEntry = [claim: string, evidence: string, reasoning: string];

const ARGUMENTS: Bi<ArgumentEntry>[] = [
  {
    en: ["Our school should start a reading buddy program.", "Last year, second graders who read with an older buddy each week raised their reading scores by ten points.", "This shows that reading with an older student helps younger kids improve."],
    es: ["Nuestra escuela debería empezar un programa de compañeros de lectura.", "El año pasado, los alumnos de segundo grado que leían cada semana con un compañero mayor subieron diez puntos en lectura.", "Esto muestra que leer con un estudiante mayor ayuda a los más pequeños a mejorar."],
  },
  {
    en: ["Students should be allowed to drink water in class.", "In a survey at our school, students who drank water during the day reported fewer headaches.", "Fewer headaches means students can pay more attention to their lessons."],
    es: ["Los estudiantes deberían poder tomar agua en clase.", "En una encuesta de nuestra escuela, los estudiantes que tomaban agua durante el día dijeron tener menos dolores de cabeza.", "Con menos dolores de cabeza, los estudiantes pueden poner más atención en clase."],
  },
  {
    en: ["Our town should build a skate park.", "Town records show forty complaints last year about skateboarding in the library parking lot.", "A skate park would give skaters a safe place to ride and keep the parking lot clear."],
    es: ["Nuestro pueblo debería construir un parque para patinetas.", "Los registros del pueblo muestran cuarenta quejas el año pasado por patinetas en el estacionamiento de la biblioteca.", "Un parque para patinetas les daría a los patinadores un lugar seguro y dejaría libre el estacionamiento."],
  },
  {
    en: ["Recess should come before lunch, not after.", "At schools that made the switch, cafeteria workers threw away about a third less food.", "When kids play first, they come to lunch hungry and eat more of their meal."],
    es: ["El recreo debería ser antes del almuerzo, no después.", "En las escuelas que hicieron el cambio, la cafetería tiró casi un tercio menos de comida.", "Cuando los niños juegan primero, llegan con hambre al almuerzo y se comen más."],
  },
  {
    en: ["Our class should keep a pet fish.", "The pet store's care guide says feeding a fish and checking its tank takes about five minutes a day.", "Because it takes so little time, students could take turns without missing class work."],
    es: ["Nuestra clase debería tener un pez como mascota.", "La guía de cuidado de la tienda de mascotas dice que alimentar a un pez y revisar su pecera toma unos cinco minutos al día.", "Como toma tan poco tiempo, los estudiantes podrían turnarse sin perder clase."],
  },
  {
    en: ["The library should stay open later on weekdays.", "The library's sign-in sheet shows that more than fifty students arrive in the last hour before closing.", "So many late visitors means students need more time there after school."],
    es: ["La biblioteca debería abrir hasta más tarde entre semana.", "La hoja de registro de la biblioteca muestra que más de cincuenta estudiantes llegan en la última hora antes de cerrar.", "Tantos visitantes de última hora indican que los estudiantes necesitan más tiempo allí después de clases."],
  },
  {
    en: ["Students should walk or bike to school when it is safe.", "A city study found that kids who walk to school get about twenty more minutes of exercise a day.", "Those extra minutes help students reach the hour of activity that doctors recommend."],
    es: ["Los estudiantes deberían caminar o ir en bicicleta a la escuela cuando sea seguro.", "Un estudio de la ciudad encontró que los niños que caminan a la escuela hacen unos veinte minutos más de ejercicio al día.", "Esos minutos extra ayudan a llegar a la hora de actividad que recomiendan los médicos."],
  },
  {
    en: ["Every classroom should have a recycling bin.", "Our green team weighed the school's trash and found that almost half of it was clean paper.", "If that paper went into recycling bins, the school would throw away far less."],
    es: ["Cada salón debería tener un bote de reciclaje.", "Nuestro equipo verde pesó la basura de la escuela y encontró que casi la mitad era papel limpio.", "Si ese papel fuera a botes de reciclaje, la escuela tiraría mucho menos."],
  },
  {
    en: ["Phones should stay in backpacks during class.", "In a survey, two out of three teachers at our school named phones as the biggest distraction in class.", "If the biggest distraction is put away, students can focus on the lesson."],
    es: ["Los teléfonos deberían quedarse en la mochila durante la clase.", "En una encuesta, dos de cada tres maestros de nuestra escuela dijeron que los teléfonos son la mayor distracción en clase.", "Si se guarda la mayor distracción, los estudiantes pueden concentrarse en la lección."],
  },
  {
    en: ["The cafeteria should offer a vegetarian choice every day.", "When the cafeteria tried a bean burrito on Mondays, it sold out every week.", "Selling out shows that many students want a meatless meal."],
    es: ["La cafetería debería ofrecer un plato vegetariano todos los días.", "Cuando la cafetería probó un burrito de frijoles los lunes, se agotó cada semana.", "Que se agote muestra que muchos estudiantes quieren una comida sin carne."],
  },
  {
    en: ["Students should get a short stretch break during long tests.", "In one study, students who stood up and stretched for two minutes made fewer careless mistakes.", "A quick break clears the mind, so students can do their best work."],
    es: ["Los estudiantes deberían tener una pausa corta para estirarse durante los exámenes largos.", "En un estudio, los estudiantes que se pararon a estirarse dos minutos cometieron menos errores por descuido.", "Una pausa rápida despeja la mente, y así los estudiantes pueden dar lo mejor."],
  },
  {
    en: ["Our town should add more crosswalks near the school.", "A count by parents found that over 200 students cross Oak Street every morning.", "With that many students crossing, a marked crosswalk would make the walk safer."],
    es: ["Nuestro pueblo debería poner más cruces peatonales cerca de la escuela.", "Un conteo de los padres encontró que más de 200 estudiantes cruzan la calle Roble cada mañana.", "Con tantos estudiantes cruzando, un cruce marcado haría el camino más seguro."],
  },
  {
    en: ["Kids should help cook dinner at home.", "A nutrition study found that kids who help cook are more likely to try new vegetables.", "Trying new foods helps kids build healthier eating habits."],
    es: ["Los niños deberían ayudar a preparar la cena en casa.", "Un estudio de nutrición encontró que los niños que ayudan a cocinar prueban verduras nuevas con más facilidad.", "Probar comidas nuevas ayuda a los niños a formar hábitos más sanos."],
  },
];

type SupportEntry = [claim: string, best: string, opinion: string, offPoint: string, anecdote: string];

const SUPPORT: Bi<SupportEntry>[] = [
  {
    en: ["Our school should have a longer recess.", "A study of thousands of third graders found that classes with at least 15 minutes of daily recess behaved better in class.", "Recess is the best part of the day.", "Our playground has two slides and a climbing wall.", "My friend says she feels better after recess."],
    es: ["Nuestra escuela debería tener un recreo más largo.", "Un estudio con miles de alumnos de tercer grado encontró que los grupos con al menos 15 minutos de recreo diario se portaban mejor en clase.", "El recreo es la mejor parte del día.", "Nuestro patio tiene dos resbaladillas y un muro para escalar.", "Mi amiga dice que se siente mejor después del recreo."],
  },
  {
    en: ["Students should wear helmets when they bike to school.", "Doctors report that wearing a helmet cuts the risk of a serious head injury in a bike crash by more than half.", "Helmets come in really cool colors.", "Many students ride bikes on sunny days.", "My brother wore a helmet when he fell, and he was okay."],
    es: ["Los estudiantes deberían usar casco cuando van en bicicleta a la escuela.", "Los médicos informan que usar casco reduce a menos de la mitad el riesgo de una lesión grave en la cabeza en un choque de bicicleta.", "Los cascos vienen en colores muy bonitos.", "Muchos estudiantes andan en bicicleta en los días de sol.", "Mi hermano llevaba casco cuando se cayó y no le pasó nada."],
  },
  {
    en: ["The cafeteria should serve more fresh fruit.", "Last month, the cafeteria ran out of apples and oranges before noon every day.", "Fruit tastes better than chips.", "Bananas grow in warm places.", "One student told me he wishes there were more grapes."],
    es: ["La cafetería debería servir más fruta fresca.", "El mes pasado, a la cafetería se le acabaron las manzanas y las naranjas antes del mediodía todos los días.", "La fruta sabe mejor que las papitas.", "Los plátanos crecen en lugares cálidos.", "Un estudiante me dijo que le gustaría que hubiera más uvas."],
  },
  {
    en: ["Our town should open a dog park.", "The town has more than 3,000 licensed dogs and no fenced area where they can run off leash.", "Dogs are the friendliest animals.", "Some dogs can learn more than 100 words.", "My aunt's dog loves to run."],
    es: ["Nuestro pueblo debería abrir un parque para perros.", "El pueblo tiene más de 3,000 perros registrados y ningún lugar cercado donde puedan correr sin correa.", "Los perros son los animales más amigables.", "Algunos perros pueden aprender más de 100 palabras.", "Al perro de mi tía le encanta correr."],
  },
  {
    en: ["Students should read for 20 minutes every day.", "Students in our district who read 20 minutes a day scored higher on reading tests than those who did not.", "Reading is more fun than watching TV.", "The library has a new reading room.", "My sister reads every night and likes it."],
    es: ["Los estudiantes deberían leer 20 minutos todos los días.", "Los estudiantes de nuestro distrito que leen 20 minutos al día sacaron mejores notas en lectura que los que no lo hacen.", "Leer es más divertido que ver la tele.", "La biblioteca tiene una sala de lectura nueva.", "Mi hermana lee todas las noches y le gusta."],
  },
  {
    en: ["Our school should install water bottle refill stations.", "The custodians collect about 400 plastic water bottles from the school trash every week.", "Metal bottles look nicer than plastic ones.", "Water is made of hydrogen and oxygen.", "My friend forgot his water bottle once."],
    es: ["Nuestra escuela debería instalar estaciones para rellenar botellas de agua.", "Los conserjes sacan unas 400 botellas de plástico de la basura de la escuela cada semana.", "Las botellas de metal se ven mejor que las de plástico.", "El agua está hecha de hidrógeno y oxígeno.", "A mi amigo se le olvidó su botella una vez."],
  },
  {
    en: ["Middle school homework should be limited to about 90 minutes a night.", "Researchers found that middle school students gained little from homework beyond about 90 minutes a night.", "Homework is the worst part of school.", "Some students do homework at the kitchen table.", "My cousin finishes his homework in ten minutes."],
    es: ["La tarea en secundaria debería limitarse a unos 90 minutos por noche.", "Los investigadores encontraron que los estudiantes de secundaria ganan poco con la tarea después de unos 90 minutos por noche.", "La tarea es lo peor de la escuela.", "Algunos estudiantes hacen la tarea en la mesa de la cocina.", "Mi primo termina su tarea en diez minutos."],
  },
  {
    en: ["Our school should start later in the morning.", "Sleep doctors say teenagers need 8 to 10 hours of sleep, and teenagers' bodies tend to fall asleep later at night.", "Mornings are too gloomy.", "The school bus has 40 seats.", "My friend is always yawning in first period."],
    es: ["Nuestra escuela debería empezar más tarde en la mañana.", "Los médicos del sueño dicen que los adolescentes necesitan de 8 a 10 horas de sueño, y su cuerpo tiende a dormirse más tarde.", "Las mañanas son muy tristes.", "El autobús escolar tiene 40 asientos.", "Mi amigo siempre bosteza en la primera clase."],
  },
  {
    en: ["The park needs more trash cans.", "Volunteers picked up 30 bags of litter in the park last month, most of it near the picnic tables, which have no trash cans.", "Litter is ugly.", "The park has a pond with ducks.", "I saw a wrapper on the ground once."],
    es: ["El parque necesita más botes de basura.", "Unos voluntarios recogieron 30 bolsas de basura en el parque el mes pasado, casi toda cerca de las mesas de picnic, que no tienen botes.", "La basura tirada se ve fea.", "El parque tiene un estanque con patos.", "Una vez vi una envoltura en el suelo."],
  },
  {
    en: ["Students should be allowed to use the library during lunch.", "Last year, 75 students signed a request asking for lunchtime library hours.", "The library is a cozy place.", "The library has more than 8,000 books.", "My friend says she would go."],
    es: ["Los estudiantes deberían poder usar la biblioteca durante el almuerzo.", "El año pasado, 75 estudiantes firmaron una petición para abrir la biblioteca a la hora del almuerzo.", "La biblioteca es un lugar acogedor.", "La biblioteca tiene más de 8,000 libros.", "Mi amiga dice que ella iría."],
  },
  {
    en: ["Families should set a daily limit on video game time.", "Pediatricians recommend steady limits on screen time so it does not crowd out sleep and exercise.", "Video games are a waste of time.", "Some video games are about sports.", "My brother played for three hours and got a headache."],
    es: ["Las familias deberían poner un límite diario a los videojuegos.", "Los pediatras recomiendan límites fijos de pantalla para que no le quiten tiempo al sueño y al ejercicio.", "Los videojuegos son una pérdida de tiempo.", "Algunos videojuegos son de deportes.", "Mi hermano jugó tres horas y le dolió la cabeza."],
  },
  {
    en: ["Our class should take a field trip to the science museum.", "The museum's free school program covers the exact unit on electricity we are studying this month.", "Museums are amazing.", "The museum was built in 1950.", "My mom went there once and liked it."],
    es: ["Nuestra clase debería ir de excursión al museo de ciencias.", "El programa escolar gratuito del museo trata justo el tema de electricidad que estudiamos este mes.", "Los museos son increíbles.", "El museo se construyó en 1950.", "Mi mamá fue una vez y le gustó."],
  },
  {
    en: ["Students should learn to cook in school.", "The school nurse found that students in the cooking class ate more vegetables at lunch than other students.", "Cooking is a fun hobby.", "Ovens were invented a long time ago.", "My dad says he learned to cook when he was young."],
    es: ["Los estudiantes deberían aprender a cocinar en la escuela.", "La enfermera de la escuela encontró que los estudiantes de la clase de cocina comían más verduras en el almuerzo que los demás.", "Cocinar es un pasatiempo divertido.", "Los hornos se inventaron hace mucho tiempo.", "Mi papá dice que aprendió a cocinar de joven."],
  },
];

// ---------------------------------------------------------------------------------------------------
// e.pronouns — level 1: subject and object forms (English I / me; Spanish yo / mí / conmigo);
// level 2: who / whom and pronoun–antecedent agreement (Spanish quien / quienes, su / sus, lo / las).

type PronounEntry = [sentence: string, right: string, wrong: [string, string], clue: string, why: string];

const PRONOUN_CASE: Bi<PronounEntry>[] = [
  {
    en: ["Maya and ___ walked to the library.", "I", ["me", "myself"], "Drop “Maya and”: “___ walked to the library.”", "The pronoun is part of the subject, the ones who walked, so it takes the subject form."],
    es: ["Maya y ___ caminamos a la biblioteca.", "yo", ["mí", "me"], "La persona que falta hace la acción de “caminamos”.", "Es parte del sujeto, y para el sujeto se usa “yo”."],
  },
  {
    en: ["The coach handed the new jerseys to Ben and ___.", "me", ["I", "myself"], "Drop “Ben and”: “The coach handed the new jerseys to ___.”", "The pronoun comes after the preposition “to,” so it takes the object form."],
    es: ["El entrenador trajo camisetas nuevas para Beto y para ___.", "mí", ["yo", "me"], "Mira la palabra justo antes del espacio: “para” es una preposición.", "Después de una preposición como “para” se dice “mí”, con acento."],
  },
  {
    en: ["Grandpa took Leo and ___ fishing on Saturday.", "me", ["I", "myself"], "Drop “Leo and”: “Grandpa took ___ fishing on Saturday.”", "The pronoun receives the action of “took,” so it takes the object form."],
    es: ["¿Quieres venir al parque ___?", "conmigo", ["con yo", "con mí"], "Todas las opciones quieren decir “con” más la persona que habla.", "Con “con” no se dice “con mí” ni “con yo”: se dice “conmigo”."],
  },
  {
    en: ["Priya and ___ planted the class garden.", "I", ["me", "myself"], "Drop “Priya and”: “___ planted the class garden.”", "The pronoun is part of the subject, the ones who planted, so it takes the subject form."],
    es: ["Entre tú y ___ terminamos el cartel.", "yo", ["mí", "me"], "Fíjate en la otra persona: dice “tú”, no “ti”.", "Después de “entre” se usan “tú” y “yo”: “entre tú y yo”."],
  },
  {
    en: ["Ms. Ortiz asked Jamal and ___ to pass out the papers.", "me", ["I", "myself"], "Drop “Jamal and”: “Ms. Ortiz asked ___ to pass out the papers.”", "The pronoun receives the action of “asked,” so it takes the object form."],
    es: ["A Leo y a ___ nos encanta pescar con el abuelo.", "mí", ["yo", "me"], "Justo antes del espacio está la preposición “a”.", "Después de “a” se dice “mí”: “a mí”."],
  },
  {
    en: ["Our neighbors invited my brother and ___ to their cookout.", "me", ["I", "myself"], "Drop “my brother and”: “Our neighbors invited ___ to their cookout.”", "The pronoun receives the action of “invited,” so it takes the object form."],
    es: ["Esta carta es para ___, no para tu hermano.", "ti", ["tú", "te"], "Justo antes del espacio está la preposición “para”.", "Después de una preposición se dice “ti”, sin acento: “para ti”."],
  },
  {
    en: ["Aunt Rosa and ___ baked bread for the bake sale.", "she", ["her", "herself"], "Drop “Aunt Rosa and”: “___ baked bread for the bake sale.”", "The pronoun is part of the subject, the ones who baked, so it takes the subject form."],
    es: ["Priya y ___ sembramos el huerto de la clase.", "yo", ["mí", "me"], "La persona que falta hace la acción de “sembramos”.", "Es parte del sujeto, y para el sujeto se usa “yo”."],
  },
  {
    en: ["The librarian saved the last copy for Kenji and ___.", "him", ["he", "himself"], "Drop “Kenji and”: “The librarian saved the last copy for ___.”", "The pronoun comes after the preposition “for,” so it takes the object form."],
    es: ["Mañana voy a estudiar ___, si quieres.", "contigo", ["con tú", "con ti"], "Todas las opciones quieren decir “con” más la persona a la que le hablas.", "Con “con” no se dice “con ti”: se dice “contigo”."],
  },
  {
    en: ["The principal thanked ___ students for cleaning the park.", "us", ["we", "ourselves"], "Drop “students”: “The principal thanked ___ for cleaning the park.”", "The pronoun receives the action of “thanked,” so it takes the object form."],
    es: ["Papá y ___ arreglamos la llanta de mi bicicleta.", "yo", ["mí", "me"], "La persona que falta hace la acción de “arreglamos”.", "Es parte del sujeto, y para el sujeto se usa “yo”."],
  },
  {
    en: ["___ fifth graders planned the school fun run.", "We", ["Us", "Ourselves"], "Drop “fifth graders”: “___ planned the school fun run.”", "The pronoun is the subject, the ones who planned, so it takes the subject form."],
    es: ["___ los de quinto grado organizamos la carrera de la escuela.", "Nosotros", ["Nos", "Nuestros"], "La palabra que falta es el sujeto de “organizamos”.", "Para el sujeto se usa “nosotros”; “nos” solo va junto al verbo."],
  },
  {
    en: ["Between you and ___, the quiz was easier than I expected.", "me", ["I", "myself"], "“Between” is a preposition, like “to” or “for.”", "A pronoun after a preposition takes the object form: “between you and me.”"],
    es: ["Hasta ___ pude resolver ese acertijo.", "yo", ["mí", "me"], "Aquí “hasta” significa “incluso”, y la persona que falta es la que pudo resolverlo.", "Cuando “hasta” significa “incluso”, va la forma de sujeto: “hasta yo pude”."],
  },
  {
    en: ["Dad and ___ fixed the flat tire on my bike.", "I", ["me", "myself"], "Drop “Dad and”: “___ fixed the flat tire on my bike.”", "The pronoun is part of the subject, the ones who fixed it, so it takes the subject form."],
    es: ["Los vecinos nos invitaron a mi hermano y a ___ a la parrillada.", "mí", ["yo", "me"], "Justo antes del espacio está la preposición “a”.", "Después de “a” se dice “mí”: “a mi hermano y a mí”."],
  },
  {
    en: ["The bus driver waved to Lila and ___.", "us", ["we", "ourselves"], "Drop “Lila and”: “The bus driver waved to ___.”", "The pronoun comes after the preposition “to,” so it takes the object form."],
    es: ["El chofer del autobús se despidió de Lila y de ___.", "mí", ["yo", "me"], "Justo antes del espacio está la preposición “de”.", "Después de “de” se dice “mí”: “de mí”."],
  },
  {
    en: ["Mr. Lee gave Tomás and ___ a ride home.", "her", ["she", "herself"], "Drop “Tomás and”: “Mr. Lee gave ___ a ride home.”", "The pronoun receives the ride, so it takes the object form."],
    es: ["El señor Lee nos llevó a casa a Tomás y a ___.", "mí", ["yo", "me"], "Justo antes del espacio está la preposición “a”.", "Después de “a” se dice “mí”: “a Tomás y a mí”."],
  },
];

type AgreeEntry = [kind: "who" | "agree", sentence: string, right: string, wrong: [string, string], clue: string, why: string];

const PRONOUN_AGREE: Bi<AgreeEntry>[] = [
  {
    en: ["who", "___ left the lights on in the gym?", "Who", ["Whom", "Whose"], "Answer with he or him: “He left the lights on.”", "“He” is a subject, so the question uses “who.”"],
    es: ["who", "¿___ dejó las luces del gimnasio encendidas?", "Quién", ["Quiénes", "Cuál"], "Mira el verbo: “dejó” es singular, y se pregunta por una persona.", "Una persona y un verbo en singular: “¿Quién dejó…?”"],
  },
  {
    en: ["who", "To ___ should I give the permission slip?", "whom", ["who", "whose"], "Answer with he or him: “Give it to him.”", "“Him” is an object, and it follows the preposition “to,” so use “whom.”"],
    es: ["who", "Mis primos, ___ viven en Texas, vienen de visita.", "quienes", ["quien", "cual"], "La palabra se refiere a “mis primos”.", "“Primos” es plural, así que va “quienes”."],
  },
  {
    en: ["who", "The girl ___ won the spelling bee is in my class.", "who", ["whom", "which"], "Rewrite that part on its own: “She won the spelling bee.”", "“She” is a subject, so use “who.” “Which” is for things, not people."],
    es: ["who", "La maestra, a ___ todos respetamos, se jubila este año.", "quien", ["quienes", "cual"], "La palabra se refiere a “la maestra”.", "Es una sola persona, así que va “quien”: “a quien todos respetamos”."],
  },
  {
    en: ["who", "The coach, ___ we all respect, is retiring this year.", "whom", ["who", "which"], "Rewrite that part on its own: “We all respect him.”", "“Him” is an object, so use “whom.”"],
    es: ["who", "Los estudiantes con ___ hice el proyecto son de sexto grado.", "quienes", ["quien", "cual"], "La palabra se refiere a “los estudiantes”.", "“Estudiantes” es plural, así que va “quienes”."],
  },
  {
    en: ["who", "___ did you invite to the party?", "Whom", ["Who", "Which"], "Answer with he or him: “You invited him.”", "“Him” is an object, so use “whom.”"],
    es: ["who", "El niño ___ encontró el perrito recibió una recompensa.", "que", ["quien", "cual"], "No hay coma antes del espacio: la palabra solo dice de qué niño se habla.", "Sin coma y sin preposición se usa “que”: “el niño que encontró…”."],
  },
  {
    en: ["who", "The student ___ found the lost puppy got a reward.", "who", ["whom", "which"], "Rewrite that part on its own: “He found the lost puppy.”", "“He” is a subject, so use “who.”"],
    es: ["who", "¿A ___ le toca sacar la basura hoy?", "quién", ["quiénes", "qué"], "Mira la palabra “le”: es singular, y se pregunta por una persona.", "Una sola persona: “¿A quién le toca?”"],
  },
  {
    en: ["agree", "The dogs wagged ___ tails when Rosa came home.", "their", ["its", "his"], "The pronoun points back to “the dogs.”", "“Dogs” is plural, so use “their.”"],
    es: ["agree", "Los perros movieron ___ colas cuando llegó Rosa.", "sus", ["su", "nuestras"], "Lo que se posee es “colas”, en plural.", "En español, el posesivo concuerda con lo que se posee: “sus colas”."],
  },
  {
    en: ["agree", "My grandparents sold ___ old car.", "their", ["its", "his"], "The pronoun points back to “my grandparents.”", "Grandparents means more than one person, so use “their.”"],
    es: ["agree", "Mis abuelos vendieron ___ carro viejo.", "su", ["sus", "mi"], "Lo que se posee es “carro”, uno solo.", "“Su” concuerda con “carro”, no con “abuelos”: “su carro”."],
  },
  {
    en: ["agree", "The tree dropped ___ leaves in October.", "its", ["it's", "their"], "The pronoun points back to “the tree,” one thing.", "One thing takes “its.” “It's” means “it is.”"],
    es: ["agree", "El árbol dejó caer ___ hojas en octubre.", "sus", ["su", "tus"], "Lo que se posee es “hojas”, en plural.", "“Hojas” es plural: “sus hojas”."],
  },
  {
    en: ["agree", "When the students finished the test, ___ turned in their papers.", "they", ["he", "them"], "The pronoun points back to “the students,” and it is the subject of “turned in.”", "A plural subject takes “they.”"],
    es: ["agree", "Compré galletas y ___ comí todas.", "las", ["los", "la"], "La palabra reemplaza a “galletas”.", "“Galletas” es femenino y plural: “las”."],
  },
  {
    en: ["agree", "The bird built ___ nest in our mailbox.", "its", ["it's", "their"], "The pronoun points back to “the bird,” one animal.", "One animal takes “its.” “It's” means “it is.”"],
    es: ["agree", "Lena y Kai olvidaron ___ mochilas en el autobús.", "sus", ["su", "nuestras"], "Lo que se posee es “mochilas”, en plural.", "“Mochilas” es plural: “sus mochilas”."],
  },
  {
    en: ["agree", "Lena and Kai forgot ___ umbrellas, so they got wet.", "their", ["her", "his"], "The pronoun points back to “Lena and Kai.”", "Two people take “their.”"],
    es: ["agree", "La biblioteca amplió ___ horario para el verano.", "su", ["sus", "tu"], "Lo que se posee es “horario”, uno solo.", "“Horario” es singular: “su horario”."],
  },
  {
    en: ["agree", "If you want to join the club, ___ should sign up by Friday.", "you", ["they", "one"], "The sentence starts by talking to “you.”", "Keep the same person all the way through: “If you want…, you should…”"],
    es: ["agree", "Encontré los libros y ___ devolví a la biblioteca.", "los", ["las", "lo"], "La palabra reemplaza a “los libros”.", "“Libros” es masculino y plural: “los”."],
  },
  {
    en: ["agree", "The library extended ___ hours for the summer.", "its", ["their", "it's"], "The pronoun points back to “the library,” one place.", "One place takes “its.”"],
    es: ["agree", "El pájaro hizo ___ nido en nuestro buzón.", "su", ["sus", "mi"], "Lo que se posee es “nido”, uno solo.", "“Nido” es singular: “su nido”."],
  },
];

// ---------------------------------------------------------------------------------------------------
// e.sentence.types — each entry lists its clauses; the type is worked out from them (independent
// clauses: 1 or 2+; dependent clauses: none or some), so the key cannot drift from the analysis.

type ClauseEntry = [sentence: string, independent: string[], dependent: string[]];

const SENTENCE_TYPES: Bi<ClauseEntry>[] = [
  { en: ["The dog barked at the mail carrier.", ["The dog barked at the mail carrier"], []], es: ["El perro le ladró al cartero.", ["El perro le ladró al cartero"], []] },
  { en: ["Jada and her brother rode their bikes to the park.", ["Jada and her brother rode their bikes to the park"], []], es: ["Jada y su hermano fueron en bicicleta al parque.", ["Jada y su hermano fueron en bicicleta al parque"], []] },
  { en: ["After lunch, the class walked to the library.", ["After lunch, the class walked to the library"], []], es: ["Después del almuerzo, la clase caminó a la biblioteca.", ["Después del almuerzo, la clase caminó a la biblioteca"], []] },
  { en: ["The players stretched, ran laps, and practiced passing.", ["The players stretched, ran laps, and practiced passing"], []], es: ["Los jugadores se estiraron, corrieron y practicaron pases.", ["Los jugadores se estiraron, corrieron y practicaron pases"], []] },
  { en: ["The bell rang, and the students hurried to class.", ["The bell rang", "the students hurried to class"], []], es: ["Sonó el timbre y los estudiantes corrieron a clase.", ["Sonó el timbre", "los estudiantes corrieron a clase"], []] },
  { en: ["I wanted to play outside, but it was raining.", ["I wanted to play outside", "it was raining"], []], es: ["Quería jugar afuera, pero estaba lloviendo.", ["Quería jugar afuera", "estaba lloviendo"], []] },
  { en: ["You can walk to school, or you can take the bus.", ["You can walk to school", "you can take the bus"], []], es: ["Puedes caminar a la escuela o puedes tomar el autobús.", ["Puedes caminar a la escuela", "puedes tomar el autobús"], []] },
  { en: ["Omar fed the cat; Lucy walked the dog.", ["Omar fed the cat", "Lucy walked the dog"], []], es: ["Omar le dio de comer al gato; Lucy paseó al perro.", ["Omar le dio de comer al gato", "Lucy paseó al perro"], []] },
  { en: ["When the bell rang, the students hurried to class.", ["the students hurried to class"], ["When the bell rang"]], es: ["Cuando sonó el timbre, los estudiantes corrieron a clase.", ["los estudiantes corrieron a clase"], ["Cuando sonó el timbre"]] },
  { en: ["We stayed inside because it was raining.", ["We stayed inside"], ["because it was raining"]], es: ["Nos quedamos adentro porque estaba lloviendo.", ["Nos quedamos adentro"], ["porque estaba lloviendo"]] },
  { en: ["The book that I borrowed is due on Friday.", ["The book is due on Friday"], ["that I borrowed"]], es: ["El libro que saqué de la biblioteca vence el viernes.", ["El libro vence el viernes"], ["que saqué de la biblioteca"]] },
  { en: ["Although the test was long, Ana finished early.", ["Ana finished early"], ["Although the test was long"]], es: ["Aunque el examen era largo, Ana terminó temprano.", ["Ana terminó temprano"], ["Aunque el examen era largo"]] },
  { en: ["When the rain stopped, we went outside, and the kids played soccer.", ["we went outside", "the kids played soccer"], ["When the rain stopped"]], es: ["Cuando dejó de llover, salimos al patio y los niños jugaron fútbol.", ["salimos al patio", "los niños jugaron fútbol"], ["Cuando dejó de llover"]] },
  { en: ["I finished my homework before dinner, but my sister, who had practice, finished late.", ["I finished my homework before dinner", "my sister finished late"], ["who had practice"]], es: ["Terminé la tarea antes de la cena, pero mi hermana, que tenía práctica, terminó tarde.", ["Terminé la tarea antes de la cena", "mi hermana terminó tarde"], ["que tenía práctica"]] },
  { en: ["Because the bus was late, Kai missed first period, and his teacher gave him the notes later.", ["Kai missed first period", "his teacher gave him the notes later"], ["Because the bus was late"]], es: ["Como el autobús llegó tarde, Kai se perdió la primera clase, y su maestra le dio los apuntes después.", ["Kai se perdió la primera clase", "su maestra le dio los apuntes después"], ["Como el autobús llegó tarde"]] },
  { en: ["The puppy chewed the shoe that Dad left by the door, and Mom laughed.", ["The puppy chewed the shoe", "Mom laughed"], ["that Dad left by the door"]], es: ["El cachorro mordió el zapato que papá dejó junto a la puerta, y mamá se rio.", ["El cachorro mordió el zapato", "mamá se rio"], ["que papá dejó junto a la puerta"]] },
];

/** 0 simple, 1 compound, 2 complex, 3 compound-complex. */
export const sentenceType = (independent: number, dependent: number) => (independent >= 2 ? (dependent ? 3 : 1) : dependent ? 2 : 0);

// ---------------------------------------------------------------------------------------------------
// e.transitions — every item offers one transition from each kind of link, so exactly one fits.

type Link = "contrast" | "result" | "example" | "addition";
const LINKS: Link[] = ["contrast", "result", "example", "addition"];
export const TRANSITION_WORDS: Bi<Record<Link, string[]>> = {
  en: { contrast: ["However", "On the other hand"], result: ["Therefore", "As a result"], example: ["For example"], addition: ["In addition"] },
  es: { contrast: ["Sin embargo", "En cambio"], result: ["Por lo tanto", "Como resultado"], example: ["Por ejemplo"], addition: ["Además"] },
};

type TransitionEntry = [first: string, rest: string, link: Link, word: string];

const TRANSITIONS: Bi<TransitionEntry>[] = [
  { en: ["Many students wanted a longer recess.", ", the schedule had no extra time.", "contrast", "However"], es: ["Muchos estudiantes querían un recreo más largo.", ", el horario no tenía tiempo extra.", "contrast", "Sin embargo"] },
  { en: ["Cats are happy to stay indoors.", ", dogs need to go outside several times a day.", "contrast", "On the other hand"], es: ["A los gatos les gusta quedarse en casa.", ", los perros necesitan salir varias veces al día.", "contrast", "En cambio"] },
  { en: ["The library is usually quiet.", ", it gets noisy during Saturday story time.", "contrast", "However"], es: ["La biblioteca casi siempre está en silencio.", ", los sábados se llena de ruido durante la hora del cuento.", "contrast", "Sin embargo"] },
  { en: ["Video games can help kids relax.", ", playing too long can cut into sleep.", "contrast", "On the other hand"], es: ["Los videojuegos pueden ayudar a relajarse.", ", jugar demasiado tiempo puede quitar horas de sueño.", "contrast", "Sin embargo"] },
  { en: ["It rained all night.", ", the soccer field was too muddy to use.", "result", "As a result"], es: ["Llovió toda la noche.", ", la cancha de fútbol quedó llena de lodo.", "result", "Como resultado"] },
  { en: ["The recycling bins were full by Wednesday.", ", the green team asked for a second pickup each week.", "result", "Therefore"], es: ["Los botes de reciclaje se llenaban para el miércoles.", ", el equipo verde pidió una segunda recolección cada semana.", "result", "Por lo tanto"] },
  { en: ["Our class saved its spare change all year.", ", we had enough money to buy new books for the library.", "result", "As a result"], es: ["Nuestra clase ahorró monedas todo el año.", ", juntamos suficiente dinero para comprar libros nuevos para la biblioteca.", "result", "Como resultado"] },
  { en: ["Phones distracted many students during class.", ", the school asked students to keep them in their lockers.", "result", "Therefore"], es: ["Los teléfonos distraían a muchos estudiantes en clase.", ", la escuela pidió guardarlos en los casilleros.", "result", "Por lo tanto"] },
  { en: ["Some animals sleep through most of the winter.", ", bears can spend months resting in their dens.", "example", "For example"], es: ["Algunos animales duermen casi todo el invierno.", ", los osos pueden pasar meses descansando en sus guaridas.", "example", "Por ejemplo"] },
  { en: ["There are easy ways to save water at home.", ", you can turn off the faucet while you brush your teeth.", "example", "For example"], es: ["Hay maneras fáciles de ahorrar agua en casa.", ", puedes cerrar la llave mientras te cepillas los dientes.", "example", "Por ejemplo"] },
  { en: ["Many foods in the cafeteria are healthy.", ", the salad bar has fresh carrots and peppers every day.", "example", "For example"], es: ["Muchas comidas de la cafetería son saludables.", ", la barra de ensaladas tiene zanahorias y pimientos frescos todos los días.", "example", "Por ejemplo"] },
  { en: ["Exercise does not have to be a sport.", ", walking the dog counts as exercise.", "example", "For example"], es: ["El ejercicio no tiene que ser un deporte.", ", pasear al perro también cuenta como ejercicio.", "example", "Por ejemplo"] },
  { en: ["Reading every day builds your vocabulary.", ", it helps you focus for longer.", "addition", "In addition"], es: ["Leer todos los días amplía tu vocabulario.", ", te ayuda a concentrarte por más tiempo.", "addition", "Además"] },
  { en: ["Our school recycles paper.", ", the cafeteria turns food scraps into compost.", "addition", "In addition"], es: ["Nuestra escuela recicla papel.", ", la cafetería convierte los restos de comida en abono.", "addition", "Además"] },
  { en: ["A pet dog needs daily walks.", ", it needs fresh water and healthy food.", "addition", "In addition"], es: ["Un perro necesita paseos diarios.", ", necesita agua fresca y comida sana.", "addition", "Además"] },
  { en: ["The science fair gives students a chance to experiment.", ", it lets them practice speaking in front of a crowd.", "addition", "In addition"], es: ["La feria de ciencias permite a los estudiantes experimentar.", ", les da práctica para hablar frente al público.", "addition", "Además"] },
];

// ---------------------------------------------------------------------------------------------------
// e.appeals — 0 ethos, 1 pathos, 2 logos. Level 1: one sentence; level 2: a short ad or speech.

type AppealEntry = [text: string, appeal: 0 | 1 | 2, clue: string];

const APPEAL_LABELS: Bi<string[]> = {
  en: ["Ethos (credibility)", "Pathos (emotion)", "Logos (logic)"],
  es: ["Ethos (credibilidad)", "Pathos (emoción)", "Logos (lógica)"],
};

const APPEALS: Bi<AppealEntry>[][] = [
  [
    { en: ["As a veterinarian with twenty years of experience, I recommend brushing your dog's teeth every week.", 0, "The speaker points to twenty years as a veterinarian."], es: ["Como veterinaria con veinte años de experiencia, recomiendo cepillarle los dientes a tu perro cada semana.", 0, "La hablante menciona sus veinte años como veterinaria."] },
    { en: ["Our school nurse, who has cared for students for fifteen years, says handwashing is the best way to stop colds.", 0, "The sentence points to the nurse's fifteen years of experience."], es: ["La enfermera de nuestra escuela, que ha cuidado a estudiantes durante quince años, dice que lavarse las manos es la mejor manera de evitar resfriados.", 0, "La oración destaca los quince años de experiencia de la enfermera."] },
    { en: ["I have coached youth soccer for ten years, and I always tell players to warm up before a game.", 0, "The speaker points to ten years of coaching."], es: ["He entrenado fútbol infantil durante diez años, y siempre les digo a los jugadores que calienten antes de un partido.", 0, "El hablante menciona sus diez años como entrenador."] },
    { en: ["The town librarian, who has run the summer reading program since it began, says it works best with a weekly goal.", 0, "The sentence points to the librarian's long experience with the program."], es: ["La bibliotecaria del pueblo, que dirige el programa de lectura de verano desde que empezó, dice que funciona mejor con una meta semanal.", 0, "La oración destaca la larga experiencia de la bibliotecaria con el programa."] },
    { en: ["As a park ranger who cleans these trails every day, I can tell you that litter harms the animals here.", 0, "The speaker points to daily work as a park ranger."], es: ["Como guardaparques que limpia estos senderos todos los días, puedo decirles que la basura daña a los animales de aquí.", 0, "El hablante menciona su trabajo diario como guardaparques."] },
    { en: ["Imagine a lonely puppy shivering in a cold shelter, waiting for someone to take it home.", 1, "“Lonely,” “shivering,” and “cold” are chosen to make you feel sad."], es: ["Imagina a un cachorrito solo, temblando en un refugio frío, esperando que alguien se lo lleve a casa.", 1, "“Solo”, “temblando” y “frío” están elegidas para que sientas tristeza."] },
    { en: ["Picture your little brother's face when he finds out the park he loves is closing.", 1, "It asks you to picture someone you love being sad."], es: ["Piensa en la cara de tu hermanito cuando se entere de que van a cerrar el parque que tanto quiere.", 1, "Te pide imaginar triste a alguien que quieres."] },
    { en: ["Every piece of trash we leave behind could end up tangled around a sea turtle.", 1, "The image of a tangled sea turtle is meant to upset you."], es: ["Cada pedazo de basura que dejamos podría terminar enredado en una tortuga marina.", 1, "La imagen de una tortuga enredada busca que te sientas mal."] },
    { en: ["Do you want to be the only kid left out when the whole class goes on the trip?", 1, "It plays on the fear of being left out."], es: ["¿Quieres ser el único que se quede fuera cuando toda la clase vaya a la excursión?", 1, "Juega con el miedo a quedarse fuera."] },
    { en: ["Think of how proud you will feel when you cross the finish line with your friends cheering.", 1, "It asks you to imagine feeling proud."], es: ["Piensa en el orgullo que sentirás al cruzar la meta mientras tus amigos te aplauden.", 1, "Te pide imaginar el orgullo que sentirías."] },
    { en: ["Recycling one ton of paper saves about 17 trees, so our school's recycling program protects forests.", 2, "It uses a number and “so” to reach a conclusion."], es: ["Reciclar una tonelada de papel salva unos 17 árboles, así que el programa de reciclaje de la escuela protege los bosques.", 2, "Usa un número y “así que” para llegar a una conclusión."] },
    { en: ["In one study, students who slept nine hours scored higher on tests, so a later start time could help grades.", 2, "It reasons from a study's results to a conclusion."], es: ["En un estudio, los estudiantes que dormían nueve horas sacaron mejores notas, así que empezar más tarde podría ayudar a las calificaciones.", 2, "Razona a partir de los resultados de un estudio."] },
    { en: ["The bus costs $2 each school day and a bike costs nothing, so biking saves $20 over ten school days.", 2, "It does the math: $2 a day for ten days."], es: ["El autobús cuesta $2 cada día de clases y la bicicleta no cuesta nada, así que ir en bicicleta ahorra $20 en diez días de clases.", 2, "Hace la cuenta: $2 al día durante diez días."] },
    { en: ["Our survey shows that 8 out of 10 students would use the library at lunch, so opening it would serve most of the school.", 2, "It reasons from survey numbers to a conclusion."], es: ["Nuestra encuesta muestra que 8 de cada 10 estudiantes usarían la biblioteca en el almuerzo, así que abrirla serviría a la mayoría.", 2, "Razona a partir de los números de una encuesta."] },
    { en: ["A water fountain by the field would cost less than the bottled water the team buys each season.", 2, "It compares two costs."], es: ["Una fuente de agua junto a la cancha costaría menos que el agua embotellada que el equipo compra cada temporada.", 2, "Compara dos costos."] },
  ],
  [
    { en: ["Hi, I'm Dr. Patel. I've been a children's dentist for twenty years, and I've seen what sugary drinks do to young teeth. That's why my own family drinks water with every meal.", 0, "Dr. Patel's twenty years as a children's dentist are the main reason to believe her."], es: ["Hola, soy la doctora Patel. Llevo veinte años como dentista infantil y he visto lo que las bebidas azucaradas les hacen a los dientes de los niños. Por eso en mi familia tomamos agua en cada comida.", 0, "Los veinte años de la doctora como dentista infantil son la razón principal para creerle."] },
    { en: ["Our bike shop has repaired bikes in this town for three generations. Every mechanic is certified, and we stand behind every repair. Bring your bike to the people who know bikes.", 0, "The ad leans on the shop's long history and certified mechanics."], es: ["Nuestro taller ha reparado bicicletas en este pueblo durante tres generaciones. Todos nuestros mecánicos están certificados y garantizamos cada reparación. Trae tu bicicleta a quienes saben de bicicletas.", 0, "El anuncio se apoya en la larga historia del taller y en sus mecánicos certificados."] },
    { en: ["Coach Rivera has led the track team to five league titles. When she says stretching prevents injuries, runners listen. Join her free running clinic this Saturday.", 0, "The ad relies on the coach's record of titles."], es: ["La entrenadora Rivera ha llevado al equipo de atletismo a ganar cinco campeonatos de la liga. Cuando dice que estirarse previene lesiones, los corredores le hacen caso. Ven a su taller gratuito de carrera este sábado.", 0, "El anuncio se apoya en los campeonatos de la entrenadora."] },
    { en: ["Every tutor in the library's homework club is a retired teacher. Together they have helped thousands of students with math and writing. Stop by after school for free help.", 0, "The tutors' teaching experience is the selling point."], es: ["Todos los tutores del club de tareas de la biblioteca son maestros jubilados. Juntos han ayudado a miles de estudiantes con matemáticas y escritura. Pasa después de clases para recibir ayuda gratis.", 0, "La experiencia de los tutores como maestros es lo que convence."] },
    { en: ["As nurses at the children's hospital and parents of three young athletes, we have seen many sports injuries up close. Please wear a helmet every time you ride.", 0, "The writers point to their work as nurses and what they have seen."], es: ["Como enfermeras del hospital infantil y madres de tres jóvenes deportistas, hemos visto de cerca muchas lesiones deportivas. Por favor, usa casco cada vez que andes en bicicleta.", 0, "Las autoras destacan su trabajo como enfermeras y lo que han visto."] },
    { en: ["Every night, Max the shelter dog curls up alone in a cold kennel. He has waited three months for a family. Your visit could be the day his tail finally wags again.", 1, "“Alone,” “cold,” and “finally wags again” aim straight at your heart."], es: ["Cada noche, Max, un perro del refugio, se acurruca solo en una jaula fría. Lleva tres meses esperando una familia. Tu visita podría ser el día en que por fin vuelva a mover la cola.", 1, "“Solo”, “fría” y “por fin vuelva a mover la cola” apuntan directo al corazón."] },
    { en: ["Remember the joy of your first day at the pool? This summer, hundreds of kids will miss that feeling because the pool needs repairs. Don't let their summer be empty.", 1, "It asks you to remember a happy feeling and imagine kids losing it."], es: ["¿Recuerdas la alegría de tu primer día en la piscina? Este verano, cientos de niños se perderán esa emoción porque la piscina necesita reparaciones. No dejes que su verano quede vacío.", 1, "Te pide recordar una alegría e imaginar a otros niños perdiéndola."] },
    { en: ["The old oak in the town park has shaded birthday picnics and first bike rides for a hundred years. Now it may be cut down. Imagine the park without it.", 1, "It calls up warm memories and asks you to imagine losing them."], es: ["El viejo roble del parque ha dado sombra a fiestas de cumpleaños y primeros paseos en bicicleta durante cien años. Ahora podrían cortarlo. Imagina el parque sin él.", 1, "Despierta recuerdos queridos y te pide imaginar que se pierden."] },
    { en: ["Close your eyes and picture a beach covered in plastic. Seabirds pick through the bottles, looking for food. Together, we can stop this.", 1, "It paints a sad picture to stir your feelings."], es: ["Cierra los ojos e imagina una playa cubierta de plástico. Las aves marinas buscan comida entre las botellas. Juntos podemos evitarlo.", 1, "Pinta una imagen triste para despertar tus sentimientos."] },
    { en: ["After school, some kids in our town have nowhere to go. They sit alone at home, staring out the window. A new youth center would give them friends and a place to belong.", 1, "“Alone” and “staring out the window” are meant to make you feel for these kids."], es: ["Después de clases, algunos niños de nuestro pueblo no tienen adónde ir. Se quedan solos en casa, mirando por la ventana. Un centro juvenil les daría amigos y un lugar al que pertenecer.", 1, "“Solos” y “mirando por la ventana” buscan que sientas compasión por esos niños."] },
    { en: ["A reusable water bottle costs $10. If you buy a $1 bottle of water every school day, you spend $180 in a school year. The reusable bottle pays for itself in two weeks.", 2, "It does the math: $1 a day adds up fast."], es: ["Una botella reutilizable cuesta $10. Si compras una botella de agua de $1 cada día de clases, gastas $180 en un año escolar. La botella reutilizable se paga sola en dos semanas.", 2, "Hace la cuenta: $1 al día suma rápido."] },
    { en: ["Our survey found that 70 percent of students skip breakfast. Studies show that students who eat breakfast pay closer attention in class. A free breakfast program would help most of our school focus.", 2, "It links a survey number to study results and draws a conclusion."], es: ["Nuestra encuesta encontró que el 70 por ciento de los estudiantes no desayuna. Los estudios muestran que quienes desayunan ponen más atención en clase. Un programa de desayuno gratis ayudaría a la mayoría de la escuela a concentrarse.", 2, "Une un dato de encuesta con resultados de estudios y saca una conclusión."] },
    { en: ["In the year since the town added a crosswalk by the school, accidents nearby dropped from eight to one. The crosswalk cost $5,000. The numbers show it was worth it.", 2, "It compares accident numbers before and after."], es: ["En el año desde que el pueblo puso un cruce peatonal junto a la escuela, los accidentes cercanos bajaron de ocho a uno. El cruce costó $5,000. Los números muestran que valió la pena.", 2, "Compara el número de accidentes antes y después."] },
    { en: ["LED bulbs use at least 75 percent less energy than old bulbs and last many years longer. Switching the school's lights would cut the electric bill and the number of bulbs we throw away.", 2, "It uses energy facts to show a practical result."], es: ["Los focos LED gastan al menos un 75 por ciento menos de energía que los focos viejos y duran muchos años más. Cambiar las luces de la escuela bajaría la cuenta de la luz y la cantidad de focos que tiramos.", 2, "Usa datos sobre energía para mostrar un resultado práctico."] },
  ],
];

// ---------------------------------------------------------------------------------------------------
// e.active.passive — each entry is one event told both ways, plus two wrong rewrites: one that changes
// the meaning (roles swapped or the time changed) and one that is still passive.

type VoiceEntry = [passive: string, active: string, changed: string, stillPassive: string, receiver: string, doer: string];

const VOICE: Bi<VoiceEntry>[] = [
  {
    en: ["The new student was welcomed by the class.", "The class welcomed the new student.", "The new student welcomed the class.", "The new student had been welcomed by the class.", "The new student", "The class"],
    es: ["El estudiante nuevo fue recibido por la clase.", "La clase recibió al estudiante nuevo.", "El estudiante nuevo recibió a la clase.", "El estudiante nuevo había sido recibido por la clase.", "El estudiante nuevo", "La clase"],
  },
  {
    en: ["The poster was designed by Mia.", "Mia designed the poster.", "Mia is designing the poster.", "The poster has been designed by Mia.", "The poster", "Mia"],
    es: ["El cartel fue diseñado por Mia.", "Mia diseñó el cartel.", "Mia está diseñando el cartel.", "El cartel ha sido diseñado por Mia.", "El cartel", "Mia"],
  },
  {
    en: ["The cookies were eaten by the twins.", "The twins ate the cookies.", "The twins will eat the cookies.", "The cookies had been eaten by the twins.", "The cookies", "The twins"],
    es: ["El mural fue pintado por los de sexto grado.", "Los de sexto grado pintaron el mural.", "Los de sexto grado pintarán el mural.", "El mural había sido pintado por los de sexto grado.", "El mural", "Los de sexto grado"],
  },
  {
    en: ["The game was won by the visiting team.", "The visiting team won the game.", "The visiting team wins the game.", "The game is won by the visiting team.", "The game", "The visiting team"],
    es: ["El partido fue ganado por el equipo visitante.", "El equipo visitante ganó el partido.", "El equipo visitante gana el partido.", "El partido es ganado por el equipo visitante.", "El partido", "El equipo visitante"],
  },
  {
    en: ["The bake sale was organized by the parents.", "The parents organized the bake sale.", "The parents organize the bake sale.", "The bake sale had been organized by the parents.", "The bake sale", "The parents"],
    es: ["La venta de pasteles fue organizada por los padres.", "Los padres organizaron la venta de pasteles.", "Los padres organizan la venta de pasteles.", "La venta de pasteles había sido organizada por los padres.", "La venta de pasteles", "Los padres"],
  },
  {
    en: ["The library books were returned by Ms. Chen.", "Ms. Chen returned the library books.", "Ms. Chen is returning the library books.", "The library books have been returned by Ms. Chen.", "The library books", "Ms. Chen"],
    es: ["Los libros fueron devueltos por la señora Chen.", "La señora Chen devolvió los libros.", "La señora Chen está devolviendo los libros.", "Los libros han sido devueltos por la señora Chen.", "Los libros", "La señora Chen"],
  },
  {
    en: ["The referee was thanked by both coaches.", "Both coaches thanked the referee.", "The referee thanked both coaches.", "Both coaches were thanked by the referee.", "The referee", "Both coaches"],
    es: ["La árbitra fue felicitada por los dos entrenadores.", "Los dos entrenadores felicitaron a la árbitra.", "La árbitra felicitó a los dos entrenadores.", "Los dos entrenadores fueron felicitados por la árbitra.", "La árbitra", "Los dos entrenadores"],
  },
  {
    en: ["The class garden was planted by the fifth graders.", "The fifth graders planted the class garden.", "The fifth graders will plant the class garden.", "The class garden had been planted by the fifth graders.", "The class garden", "The fifth graders"],
    es: ["El huerto fue sembrado por los de quinto grado.", "Los de quinto grado sembraron el huerto.", "Los de quinto grado sembrarán el huerto.", "El huerto había sido sembrado por los de quinto grado.", "El huerto", "Los de quinto grado"],
  },
  {
    en: ["The lost kitten was found by a neighbor.", "A neighbor found the lost kitten.", "A neighbor finds the lost kitten.", "The lost kitten had been found by a neighbor.", "The lost kitten", "A neighbor"],
    es: ["El gatito perdido fue encontrado por una vecina.", "Una vecina encontró al gatito perdido.", "Una vecina encuentra al gatito perdido.", "El gatito perdido había sido encontrado por una vecina.", "El gatito perdido", "Una vecina"],
  },
  {
    en: ["The story was read aloud by the librarian.", "The librarian read the story aloud.", "The librarian will read the story aloud.", "The story has been read aloud by the librarian.", "The story", "The librarian"],
    es: ["El cuento fue leído en voz alta por la bibliotecaria.", "La bibliotecaria leyó el cuento en voz alta.", "La bibliotecaria leerá el cuento en voz alta.", "El cuento ha sido leído en voz alta por la bibliotecaria.", "El cuento", "La bibliotecaria"],
  },
  {
    en: ["The park was cleaned by volunteers.", "Volunteers cleaned the park.", "Volunteers are cleaning the park.", "The park had been cleaned by volunteers.", "The park", "Volunteers"],
    es: ["El parque fue limpiado por unos voluntarios.", "Unos voluntarios limpiaron el parque.", "Unos voluntarios están limpiando el parque.", "El parque había sido limpiado por unos voluntarios.", "El parque", "Unos voluntarios"],
  },
  {
    en: ["The captain was chosen by her teammates.", "Her teammates chose the captain.", "The captain chose her teammates.", "Her teammates were chosen by the captain.", "The captain", "Her teammates"],
    es: ["La capitana fue elegida por sus compañeras.", "Sus compañeras eligieron a la capitana.", "La capitana eligió a sus compañeras.", "Sus compañeras fueron elegidas por la capitana.", "La capitana", "Sus compañeras"],
  },
  {
    en: ["The essay was written by Luis.", "Luis wrote the essay.", "Luis writes the essay.", "The essay has been written by Luis.", "The essay", "Luis"],
    es: ["El ensayo fue escrito por Luis.", "Luis escribió el ensayo.", "Luis escribe el ensayo.", "El ensayo ha sido escrito por Luis.", "El ensayo", "Luis"],
  },
];

// ---------------------------------------------------------------------------------------------------
// e.fallacies — level 1: the four common ones, always shown together; level 2 adds four more and shows
// the right name with three others. Examples are short and about school, pets, games and parks.

type Fallacy = "adHominem" | "bandwagon" | "falseDilemma" | "strawMan" | "slipperySlope" | "hasty" | "authority" | "redHerring";
const FALLACIES_L1: Fallacy[] = ["adHominem", "bandwagon", "falseDilemma", "strawMan"];
const FALLACIES_ALL: Fallacy[] = [...FALLACIES_L1, "slipperySlope", "hasty", "authority", "redHerring"];

const FALLACY_NAMES: Bi<Record<Fallacy, [label: string, does: string]>> = {
  en: {
    adHominem: ["Ad hominem", "attacks the person instead of the idea"],
    bandwagon: ["Bandwagon", "says something is right because many people do it or believe it"],
    falseDilemma: ["False dilemma", "offers only two choices when there are more"],
    strawMan: ["Straw man", "twists the other side's idea into a weaker one, then attacks that"],
    slipperySlope: ["Slippery slope", "claims one small step will set off a chain of disasters"],
    hasty: ["Hasty generalization", "draws a big conclusion from too few examples"],
    authority: ["Appeal to authority", "trusts someone who is not an expert on the topic"],
    redHerring: ["Red herring", "changes the subject to distract from the real issue"],
  },
  es: {
    adHominem: ["Ataque personal", "ataca a la persona en vez de a la idea"],
    bandwagon: ["Efecto arrastre", "dice que algo está bien porque mucha gente lo hace o lo cree"],
    falseDilemma: ["Falso dilema", "ofrece solo dos opciones cuando hay más"],
    strawMan: ["Hombre de paja", "deforma la idea del otro en una versión más débil y ataca esa versión"],
    slipperySlope: ["Pendiente resbaladiza", "asegura que un pequeño paso desatará una cadena de desastres"],
    hasty: ["Generalización apresurada", "saca una gran conclusión de muy pocos ejemplos"],
    authority: ["Falsa autoridad", "confía en alguien que no es experto en el tema"],
    redHerring: ["Pista falsa", "cambia de tema para distraer del problema real"],
  },
};

type FallacyEntry = [text: string, fallacy: Fallacy, clue: string];

const FALLACIES: Bi<FallacyEntry>[][] = [
  [
    { en: ["Jordan says we should start a school garden, but Jordan can't even keep his locker clean, so his idea must be bad.", "adHominem", "It talks about Jordan's locker, not his garden idea."], es: ["Jordan dice que deberíamos tener un huerto escolar, pero Jordan ni siquiera mantiene limpio su casillero, así que su idea debe ser mala.", "adHominem", "Habla del casillero de Jordan, no de su idea del huerto."] },
    { en: ["Why listen to Priya's plan for the bake sale? She failed the spelling test last week.", "adHominem", "The spelling test has nothing to do with her plan."], es: ["¿Por qué escuchar el plan de Priya para la venta de pasteles? Reprobó el examen de ortografía la semana pasada.", "adHominem", "El examen de ortografía no tiene nada que ver con su plan."] },
    { en: ["Of course Leo wants a longer recess. He's the slowest reader in the class.", "adHominem", "It puts Leo down instead of answering his idea."], es: ["Claro que Leo quiere un recreo más largo. Es el que lee más lento de la clase.", "adHominem", "Menosprecia a Leo en lugar de responder a su idea."] },
    { en: ["Don't trust Sam's report on recycling. He's only in sixth grade.", "adHominem", "It rejects the report because of Sam's age, not because of what it says."], es: ["No le hagan caso al informe de Sam sobre reciclaje. Solo está en sexto grado.", "adHominem", "Descarta el informe por la edad de Sam, no por lo que dice."] },
    { en: ["Everyone in our grade has the new sneakers, so you should get them too.", "bandwagon", "The only reason given is that everyone has them."], es: ["Todos en nuestro grado tienen los tenis nuevos, así que tú también deberías comprarlos.", "bandwagon", "La única razón es que todos los tienen."] },
    { en: ["Most kids at our school skip breakfast, so breakfast must not matter.", "bandwagon", "Many people doing something does not prove it is right."], es: ["Casi todos los niños de la escuela no desayunan, así que desayunar no debe importar.", "bandwagon", "Que muchos lo hagan no prueba que esté bien."] },
    { en: ["All the popular kids are joining the drama club, so it must be the best club.", "bandwagon", "The reason is what the crowd does, not what the club is like."], es: ["Todos los chicos populares se están uniendo al club de teatro, así que debe ser el mejor club.", "bandwagon", "La razón es lo que hace la mayoría, no cómo es el club."] },
    { en: ["Millions of people play this game, so it must be good for you.", "bandwagon", "Being popular does not prove it is good for you."], es: ["Millones de personas juegan este juego, así que debe ser bueno para ti.", "bandwagon", "Que sea popular no prueba que sea bueno para ti."] },
    { en: ["Either we cancel recess, or students will keep getting hurt on the playground.", "falseDilemma", "It gives only two options; there could be more supervision or new rules."], es: ["O cancelamos el recreo, o los estudiantes se seguirán lastimando en el patio.", "falseDilemma", "Solo da dos opciones; podría haber más vigilancia o reglas nuevas."] },
    { en: ["You either love soccer, or you hate sports.", "falseDilemma", "There are many possibilities between those two."], es: ["O te encanta el fútbol, o odias los deportes.", "falseDilemma", "Hay muchas otras posibilidades entre esas dos."] },
    { en: ["If you don't join the band, you don't care about our school.", "falseDilemma", "There are many ways to support the school besides the band."], es: ["Si no te unes a la banda, no te importa nuestra escuela.", "falseDilemma", "Hay muchas maneras de apoyar a la escuela además de la banda."] },
    { en: ["We can either ban phones completely, or students will never learn anything.", "falseDilemma", "It ignores middle options, like putting phones away during class."], es: ["O prohibimos los teléfonos por completo, o los estudiantes nunca aprenderán nada.", "falseDilemma", "Ignora opciones intermedias, como guardarlos durante la clase."] },
    { en: ["Lena wants fewer fried foods at lunch. So she wants to take away all the food we like.", "strawMan", "Lena asked for fewer fried foods, not for taking away everything we like."], es: ["Lena quiere menos comida frita en el almuerzo. O sea, quiere quitarnos toda la comida que nos gusta.", "strawMan", "Lena pidió menos frituras, no quitar toda la comida que nos gusta."] },
    { en: ["Mr. Díaz suggested shorter homework assignments. Clearly he thinks students should never have to work.", "strawMan", "Shorter homework is not the same as never working."], es: ["El señor Díaz propuso tareas más cortas. Está claro que cree que los estudiantes nunca deberían esforzarse.", "strawMan", "Tareas más cortas no es lo mismo que no esforzarse nunca."] },
    { en: ["Ana said the library should be quieter. I guess she wants a library where nobody can ever talk at all.", "strawMan", "Ana asked for less noise, not total silence forever."], es: ["Ana dijo que la biblioteca debería ser más silenciosa. Supongo que quiere una biblioteca donde nadie pueda hablar jamás.", "strawMan", "Ana pidió menos ruido, no silencio total para siempre."] },
    { en: ["Kai asked if we could have one game day a month. So he wants us to play games instead of learning.", "strawMan", "One day a month is not the same as playing instead of learning."], es: ["Kai preguntó si podíamos tener un día de juegos al mes. O sea, quiere que juguemos en vez de aprender.", "strawMan", "Un día al mes no es lo mismo que jugar en vez de aprender."] },
  ],
  [
    { en: ["If we let students use phones at lunch, soon they will use them in class, then during tests, and before long nobody will learn anything.", "slipperySlope", "One small rule change is said to lead, step by step, to disaster."], es: ["Si dejamos que los estudiantes usen el teléfono en el almuerzo, pronto lo usarán en clase, luego en los exámenes, y al final nadie aprenderá nada.", "slipperySlope", "Un pequeño cambio de regla supuestamente lleva, paso a paso, al desastre."] },
    { en: ["If the coach lets one player skip practice, everyone will skip, the team will fall apart, and the school will drop soccer.", "slipperySlope", "One skipped practice is said to lead to the end of the soccer program."], es: ["Si el entrenador deja que un jugador falte a la práctica, todos faltarán, el equipo se desmoronará y la escuela eliminará el fútbol.", "slipperySlope", "Una práctica perdida supuestamente acaba con el programa de fútbol."] },
    { en: ["If we let the dog sleep on the couch once, next he'll take over the beds, and soon he'll run the whole house.", "slipperySlope", "One night on the couch is said to lead to a chain of bigger problems."], es: ["Si dejamos que el perro duerma una vez en el sofá, luego se adueñará de las camas y pronto mandará en toda la casa.", "slipperySlope", "Una noche en el sofá supuestamente lleva a una cadena de problemas mayores."] },
    { en: ["If the library allows snacks, there will be crumbs everywhere, then bugs, and finally the library will have to close.", "slipperySlope", "Snacks are said to lead, step by step, to the library closing."], es: ["Si la biblioteca permite refrigerios, habrá migajas por todas partes, luego bichos, y al final tendrá que cerrar.", "slipperySlope", "Los refrigerios supuestamente llevan, paso a paso, al cierre de la biblioteca."] },
    { en: ["I got a stomachache after eating at the new taco stand once, so all their food must be bad.", "hasty", "One stomachache is the only evidence for a claim about all their food."], es: ["Una vez me dolió el estómago después de comer en el puesto nuevo de tacos, así que toda su comida debe ser mala.", "hasty", "Un solo dolor de estómago es la única prueba sobre toda su comida."] },
    { en: ["My two cousins who play video games get bad grades, so video games ruin everyone's grades.", "hasty", "Two cousins are used to judge everyone."], es: ["Mis dos primos que juegan videojuegos sacan malas notas, así que los videojuegos arruinan las notas de todos.", "hasty", "Se usa a dos primos para juzgar a todo el mundo."] },
    { en: ["The first chapter of the book was slow, so the whole series must be boring.", "hasty", "One chapter is used to judge a whole series."], es: ["El primer capítulo del libro fue lento, así que toda la serie debe ser aburrida.", "hasty", "Se usa un capítulo para juzgar toda una serie."] },
    { en: ["Two kids from the other school were rude at the game, so that whole school is rude.", "hasty", "Two kids are used to judge a whole school."], es: ["Dos niños de la otra escuela fueron groseros en el partido, así que toda esa escuela es grosera.", "hasty", "Se usa a dos niños para juzgar a toda una escuela."] },
    { en: ["A famous basketball player says this cereal makes you smarter, so it must be true.", "authority", "A basketball player is not an expert on food or the brain."], es: ["Un jugador de básquetbol famoso dice que este cereal te hace más inteligente, así que debe ser cierto.", "authority", "Un jugador de básquetbol no es experto en alimentación ni en el cerebro."] },
    { en: ["My dentist says this video game is the best way to learn history.", "authority", "A dentist is an expert on teeth, not on history games."], es: ["Mi dentista dice que este videojuego es la mejor manera de aprender historia.", "authority", "Un dentista sabe de dientes, no de juegos de historia."] },
    { en: ["A singer said on a talk show that recycling doesn't help, so we should stop recycling.", "authority", "A singer is not an expert on recycling."], es: ["Una cantante dijo en un programa de televisión que reciclar no sirve, así que deberíamos dejar de reciclar.", "authority", "Una cantante no es experta en reciclaje."] },
    { en: ["A movie star says this vitamin cures colds, so it must work.", "authority", "Being good at acting says nothing about medicine."], es: ["Un actor de cine dice que esta vitamina cura los resfriados, así que debe funcionar.", "authority", "Saber actuar no dice nada sobre medicina."] },
    { en: ["Teacher: “Why is your homework late?” Student: “Did you know our class has the best attendance in the school?”", "redHerring", "Attendance has nothing to do with the late homework."], es: ["Maestra: “¿Por qué entregaste tarde la tarea?” Estudiante: “¿Sabía que nuestra clase tiene la mejor asistencia de la escuela?”", "redHerring", "La asistencia no tiene nada que ver con la tarea atrasada."] },
    { en: ["Sure, the park has a litter problem, but have you seen how nice the new benches look?", "redHerring", "The benches pull attention away from the litter problem."], es: ["Es cierto que el parque tiene un problema de basura, pero ¿ya vieron qué bonitas se ven las bancas nuevas?", "redHerring", "Las bancas desvían la atención del problema de la basura."] },
    { en: ["People say the cafeteria pizza is cold, but the cafeteria workers have to wake up very early.", "redHerring", "When the workers wake up does not explain or fix cold pizza."], es: ["Dicen que la pizza de la cafetería está fría, pero las cocineras tienen que levantarse muy temprano.", "redHerring", "La hora a la que se levantan no explica ni arregla la pizza fría."] },
    { en: ["When Mom asked why I played games for two hours, I told her the weather is supposed to be great this weekend.", "redHerring", "The weekend weather has nothing to do with two hours of games."], es: ["Cuando mamá me preguntó por qué jugué videojuegos dos horas, le dije que el fin de semana va a hacer muy buen tiempo.", "redHerring", "El clima del fin de semana no tiene nada que ver con las dos horas de juego."] },
    { en: ["Dr. Lane's study on sleep can't be right. Have you seen the old car she drives?", "adHominem", "Her car has nothing to do with her study."], es: ["El estudio de la doctora Lane sobre el sueño no puede estar bien. ¿Ya vieron el carro viejo que maneja?", "adHominem", "Su carro no tiene nada que ver con su estudio."] },
    { en: ["Nine out of ten families on our street already signed up for the summer camp, so it must be the right choice for you too.", "bandwagon", "The reason given is that most families signed up."], es: ["Nueve de cada diez familias de nuestra calle ya inscribieron a sus hijos en el campamento de verano, así que también debe ser la mejor opción para ti.", "bandwagon", "La razón que se da es que casi todas las familias se inscribieron."] },
    { en: ["Either you are with the team on this, or you are against the team.", "falseDilemma", "There are more than two positions someone could take."], es: ["O estás con el equipo en esto, o estás en contra del equipo.", "falseDilemma", "Hay más de dos posturas posibles."] },
    { en: ["Maya thinks we should recycle more. So she wants us to dig through garbage cans all day.", "strawMan", "Maya asked for more recycling, not for digging through garbage."], es: ["Maya cree que deberíamos reciclar más. O sea, quiere que nos pasemos el día revolviendo botes de basura.", "strawMan", "Maya pidió reciclar más, no revolver la basura."] },
  ],
];

// ---------------------------------------------------------------------------------------------------
// e.rhetorical.devices — level 1: name the device; level 2: why the speaker uses it. Anaphora and
// antithesis are built on parallel structure, so parallelism is never offered against them (and the
// reverse), which keeps exactly one right answer.

type Device = "anaphora" | "question" | "hyperbole" | "understatement" | "parallelism" | "antithesis" | "alliteration";
const DEVICES: Device[] = ["anaphora", "question", "hyperbole", "understatement", "parallelism", "antithesis", "alliteration"];
export const DEVICE_OVERLAP: Record<Device, Device[]> = {
  anaphora: ["parallelism"],
  question: [],
  hyperbole: [],
  understatement: [],
  parallelism: ["anaphora", "antithesis"],
  antithesis: ["parallelism"],
  alliteration: [],
};

export const DEVICE_NAMES: Bi<Record<Device, [label: string, does: string]>> = {
  en: {
    anaphora: ["Anaphora", "repeats the same words at the start of several sentences or phrases"],
    question: ["Rhetorical question", "asks a question to make a point, not to get an answer"],
    hyperbole: ["Hyperbole", "exaggerates far past the truth for effect"],
    understatement: ["Understatement", "makes something sound smaller or milder than it really is"],
    parallelism: ["Parallelism", "uses the same grammatical pattern for a series of ideas"],
    antithesis: ["Antithesis", "sets opposite ideas side by side in balanced phrases"],
    alliteration: ["Alliteration", "repeats the same first sound in nearby words"],
  },
  es: {
    anaphora: ["Anáfora", "repite las mismas palabras al comienzo de varias oraciones o frases"],
    question: ["Pregunta retórica", "hace una pregunta para afirmar algo, no para recibir respuesta"],
    hyperbole: ["Hipérbole", "exagera mucho más allá de la verdad para causar efecto"],
    understatement: ["Atenuación (lítote)", "hace que algo parezca menor o más suave de lo que es"],
    parallelism: ["Paralelismo", "usa la misma estructura gramatical para una serie de ideas"],
    antithesis: ["Antítesis", "pone ideas opuestas una junto a otra en frases equilibradas"],
    alliteration: ["Aliteración", "repite el mismo sonido inicial en palabras cercanas"],
  },
};

type DeviceEntry = [line: string, device: Device, clue: string];

const DEVICE_LINES: Bi<DeviceEntry>[] = [
  { en: ["We will clean the park. We will plant the trees. We will make this town proud.", "anaphora", "Each sentence starts with “We will.”"], es: ["Vamos a limpiar el parque. Vamos a plantar árboles. Vamos a hacer que el pueblo se sienta orgulloso.", "anaphora", "Cada oración empieza con “Vamos a”."] },
  { en: ["Every book is a door. Every page is a step. Every word is a chance to learn.", "anaphora", "Each sentence starts with “Every.”"], es: ["Cada libro es una puerta. Cada página es un paso. Cada palabra es una oportunidad de aprender.", "anaphora", "Cada oración empieza con “Cada”."] },
  { en: ["Who wouldn't want a longer recess?", "question", "It is a question, but the speaker already knows the answer: everyone would."], es: ["¿A quién no le gustaría un recreo más largo?", "question", "Es una pregunta, pero quien habla ya sabe la respuesta: a todos."] },
  { en: ["If we don't protect our parks, who will?", "question", "The question is not waiting for an answer; it makes a point."], es: ["Si nosotros no cuidamos nuestros parques, ¿quién lo hará?", "question", "La pregunta no espera respuesta: sirve para afirmar algo."] },
  { en: ["I have told you a million times to hang up your coat.", "hyperbole", "No one has really said it a million times."], es: ["Te lo he dicho un millón de veces: cuelga tu abrigo.", "hyperbole", "Nadie lo ha dicho de verdad un millón de veces."] },
  { en: ["This backpack weighs a ton.", "hyperbole", "A backpack cannot really weigh a ton."], es: ["Esta mochila pesa una tonelada.", "hyperbole", "Una mochila no puede pesar de verdad una tonelada."] },
  { en: ["After three days of rain flooded the soccer field, Dani said, “It's a little damp out there.”", "understatement", "A flooded field is much more than “a little damp.”"], es: ["Después de tres días de lluvia que inundaron la cancha, Dani dijo: “Está un poquito húmedo allá afuera”.", "understatement", "Una cancha inundada es mucho más que “un poquito húmeda”."] },
  { en: ["Winning the state championship was not bad for a team that had never won a game before.", "understatement", "Winning a championship is far better than “not bad.”"], es: ["Ganar el campeonato estatal no estuvo nada mal para un equipo que nunca había ganado un partido.", "understatement", "Ganar un campeonato es mucho más que “no estuvo nada mal”."] },
  { en: ["She likes reading in the morning, swimming in the afternoon, and painting at night.", "parallelism", "Each part has the same shape: an activity, then a time of day."], es: ["Le gusta leer por la mañana, nadar por la tarde y pintar por la noche.", "parallelism", "Cada parte tiene la misma forma: una actividad y luego un momento del día."] },
  { en: ["To learn, to grow, and to lead: that is our goal.", "parallelism", "Three ideas share the same pattern: “to” plus an action."], es: ["Aprender, crecer y dirigir: esa es nuestra meta.", "parallelism", "Tres ideas comparten la misma forma: tres verbos seguidos."] },
  { en: ["We cannot change the past, but we can shape the future.", "antithesis", "“Cannot change the past” is set against “can shape the future.”"], es: ["No podemos cambiar el pasado, pero sí podemos construir el futuro.", "antithesis", "“No podemos cambiar el pasado” se enfrenta a “podemos construir el futuro”."] },
  { en: ["Hard choices today make easy days tomorrow.", "antithesis", "“Hard” is set against “easy,” and “today” against “tomorrow.”"], es: ["Decisiones difíciles hoy, días fáciles mañana.", "antithesis", "“Difíciles” se enfrenta a “fáciles”, y “hoy” a “mañana”."] },
  { en: ["The playful puppy pounced on the purple pillow.", "alliteration", "Listen to the first sound of “playful,” “puppy,” “pounced,” “purple,” and “pillow.”"], es: ["El perro Pepe pide pan para su perrita Paca.", "alliteration", "Escucha el primer sonido de “perro”, “Pepe”, “pide”, “pan” y “Paca”."] },
  { en: ["Big brown bears bounced bright beach balls.", "alliteration", "Listen to the first sound of almost every word."], es: ["Mi mamá mezcla mangos maduros con miel.", "alliteration", "Escucha el primer sonido de casi todas las palabras."] },
];

type PurposeEntry = [setup: string, question: string, device: Device, right: string, wrong: [string, string, string]];

const DEVICE_PURPOSES: Bi<PurposeEntry>[] = [
  {
    en: ["In a student council speech, Ana says: “We will fix the water fountains. We will bring back game day. We will listen to every class.”", "Why does Ana begin each sentence with “We will”?", "anaphora", "To make her promises sound strong and easy to remember", ["To admit that the plans might not happen", "To compare two opposite ideas", "To give exact numbers that prove a point"]],
    es: ["En un discurso para el consejo estudiantil, Ana dice: “Vamos a arreglar los bebederos. Vamos a recuperar el día de juegos. Vamos a escuchar a cada salón”.", "¿Por qué Ana empieza cada oración con “Vamos a”?", "anaphora", "Para que sus promesas suenen firmes y sean fáciles de recordar", ["Para admitir que los planes tal vez no se cumplan", "Para comparar dos ideas opuestas", "Para dar números exactos que prueben algo"]],
  },
  {
    en: ["A library poster reads: “Read when you are happy. Read when you are sad. Read when you need a friend.”", "What is the effect of repeating “Read when”?", "anaphora", "It stresses that reading fits every moment of life", ["It shows the writer is tired of reading", "It exaggerates how many books the library has", "It asks the reader to answer a question"]],
    es: ["Un cartel de la biblioteca dice: “Lee cuando estés feliz. Lee cuando estés triste. Lee cuando necesites un amigo”.", "¿Qué efecto tiene repetir “Lee cuando”?", "anaphora", "Destaca que la lectura sirve en todo momento", ["Muestra que quien escribe está cansado de leer", "Exagera cuántos libros tiene la biblioteca", "Le pide al lector que responda una pregunta"]],
  },
  {
    en: ["Asking the town for a crosswalk, Omar says: “How many close calls do we need before someone gets hurt?”", "Why does Omar ask this question?", "question", "To make listeners see that waiting any longer is a bad idea", ["To find out the exact number of close calls", "To show that he has not studied the problem", "To make the problem sound smaller than it is"]],
    es: ["Para pedir un cruce peatonal, Omar dice: “¿Cuántos sustos más necesitamos antes de que alguien salga lastimado?”", "¿Por qué Omar hace esta pregunta?", "question", "Para que el público vea que seguir esperando es mala idea", ["Para saber el número exacto de sustos", "Para mostrar que no ha estudiado el problema", "Para que el problema parezca más pequeño de lo que es"]],
  },
  {
    en: ["In a speech for a homework help line, Mei asks: “Who here has never forgotten a homework assignment?”", "Why does Mei ask this?", "question", "To remind listeners that everyone shares the problem", ["To count the people who raise their hands", "To blame one student for forgetting", "To give a statistic about homework"]],
    es: ["En un discurso a favor de una línea de ayuda con la tarea, Mei pregunta: “¿Quién de aquí nunca ha olvidado una tarea?”", "¿Por qué Mei pregunta esto?", "question", "Para recordar que todos comparten el problema", ["Para contar a quienes levanten la mano", "Para culpar a un estudiante por olvidar", "Para dar un dato sobre la tarea"]],
  },
  {
    en: ["A poster for the new lunch line says: “So fast, you'll be eating before you sit down.”", "Why does the poster exaggerate?", "hyperbole", "To make the speed of the line memorable in a fun way", ["To give the exact time the line takes", "To admit that the line is slow", "To repeat a phrase for rhythm"]],
    es: ["Un cartel de la nueva fila del almuerzo dice: “Tan rápida que comerás antes de sentarte”.", "¿Por qué exagera el cartel?", "hyperbole", "Para que la rapidez de la fila se recuerde de forma divertida", ["Para dar el tiempo exacto que tarda la fila", "Para admitir que la fila es lenta", "Para repetir una frase con ritmo"]],
  },
  {
    en: ["In a letter to the school board, Diego writes: “Our bus is older than the dinosaurs and breaks down every five minutes.”", "Why does Diego exaggerate?", "hyperbole", "To stress how badly the school needs a new bus", ["To report the bus's exact age", "To show that the bus is in good shape", "To create a pattern of repeated sounds"]],
    es: ["En una carta a la junta escolar, Diego escribe: “Nuestro autobús es más viejo que los dinosaurios y se descompone cada cinco minutos”.", "¿Por qué exagera Diego?", "hyperbole", "Para destacar cuánto necesita la escuela un autobús nuevo", ["Para informar la edad exacta del autobús", "Para mostrar que el autobús está en buen estado", "Para crear un patrón de sonidos repetidos"]],
  },
  {
    en: ["The robotics team built a working robot out of cardboard and won first place. The captain shrugged and said: “It turned out okay, I guess.”", "Why does the captain play down the win?", "understatement", "To sound modest and let the impressive result speak for itself", ["To show that the robot failed", "To exaggerate how hard the team worked", "To make listeners feel afraid"]],
    es: ["El equipo de robótica construyó un robot de cartón que funcionó y ganó el primer lugar. La capitana se encogió de hombros y dijo: “Quedó más o menos bien”.", "¿Por qué la capitana le resta importancia al triunfo?", "understatement", "Para sonar modesta y dejar que el gran resultado hable por sí solo", ["Para mostrar que el robot falló", "Para exagerar lo mucho que trabajó el equipo", "Para que el público sienta miedo"]],
  },
  {
    en: ["Speaking about the cafeteria's broken heaters, Ruth says: “Eating lunch in our winter coats is not ideal.”", "Why does Ruth say “not ideal” instead of “terrible”?", "understatement", "To make her point with calm, dry humor that gets attention", ["To show that the problem is not real", "To give scientific evidence about heaters", "To repeat a key phrase for rhythm"]],
    es: ["Al hablar de la calefacción descompuesta de la cafetería, Ruth dice: “Almorzar con el abrigo puesto no es lo ideal”.", "¿Por qué Ruth dice “no es lo ideal” en vez de “es terrible”?", "understatement", "Para señalar el problema con un humor sereno que llama la atención", ["Para mostrar que el problema no es real", "Para dar pruebas científicas sobre la calefacción", "Para repetir una frase clave con ritmo"]],
  },
  {
    en: ["Before the season, the coach told the team: “Train with focus, play with heart, and win with grace.”", "What does the matching pattern do?", "parallelism", "It makes the three goals sound balanced and equally important", ["It shows the coach cares only about winning", "It exaggerates how hard practice will be", "It asks the team a question to answer"]],
    es: ["Antes de la temporada, la entrenadora le dijo al equipo: “Entrenen con enfoque, jueguen con corazón y ganen con humildad”.", "¿Qué logra que las tres partes tengan la misma forma?", "parallelism", "Hace que las tres metas suenen equilibradas e igual de importantes", ["Muestra que a la entrenadora solo le importa ganar", "Exagera lo duras que serán las prácticas", "Le hace al equipo una pregunta para responder"]],
  },
  {
    en: ["A recycling flyer says: “Recycling saves trees, saves energy, and saves money.”", "Why does the flyer use the same pattern three times?", "parallelism", "To show several benefits in a clear list that is easy to remember", ["To show that recycling has only one benefit", "To make fun of people who recycle", "To set two opposite ideas against each other"]],
    es: ["Un volante de reciclaje dice: “Reciclar salva árboles, ahorra energía y cuida el dinero”.", "¿Por qué el volante usa la misma estructura tres veces?", "parallelism", "Para mostrar varios beneficios en una lista clara y fácil de recordar", ["Para mostrar que reciclar tiene un solo beneficio", "Para burlarse de quienes reciclan", "Para enfrentar dos ideas opuestas"]],
  },
  {
    en: ["In a speech about phones, Zoe says: “Our phones can connect us to the whole world, or cut us off from the people beside us.”", "Why does Zoe put these opposite ideas side by side?", "antithesis", "To sharpen the contrast so listeners think about how they use phones", ["To prove that phones are always harmful", "To make a catchy pattern of sounds", "To exaggerate how many people own phones"]],
    es: ["En un discurso sobre los teléfonos, Zoe dice: “El teléfono puede conectarnos con todo el mundo o alejarnos de quien tenemos al lado”.", "¿Por qué Zoe pone estas ideas opuestas una junto a otra?", "antithesis", "Para marcar el contraste y que el público piense en cómo usa el teléfono", ["Para probar que los teléfonos siempre hacen daño", "Para crear un patrón de sonidos pegajoso", "Para exagerar cuántas personas tienen teléfono"]],
  },
  {
    en: ["A science teacher tells the class: “A minute of planning saves an hour of fixing.”", "What does the contrast do?", "antithesis", "It shows that a small effort now prevents a big problem later", ["It gives an exact measurement of time", "It asks the class to answer a question", "It makes planning sound useless"]],
    es: ["Una maestra de ciencias le dice a la clase: “Un minuto de planear ahorra una hora de arreglar”.", "¿Qué logra el contraste?", "antithesis", "Muestra que un pequeño esfuerzo ahora evita un gran problema después", ["Da una medida exacta de tiempo", "Le pide a la clase que responda una pregunta", "Hace que planear parezca inútil"]],
  },
  {
    en: ["A park cleanup poster says: “Pick it up, pack it out, protect the park.”", "Why does the poster repeat the “p” sound?", "alliteration", "To make the slogan catchy and easy to remember", ["To make the park sound dangerous", "To give a fact about litter", "To set two opposite ideas side by side"]],
    es: ["Un cartel de limpieza del parque dice: “Recoge, recicla, respeta”.", "¿Por qué el cartel repite el sonido “r”?", "alliteration", "Para que el lema sea pegajoso y fácil de recordar", ["Para que el parque parezca peligroso", "Para dar un dato sobre la basura", "Para poner dos ideas opuestas una junto a otra"]],
  },
  {
    en: ["A bake sale sign reads: “Fresh, fluffy, fabulous muffins.”", "Why does the sign use words that start with the same sound?", "alliteration", "To make the sign sound fun and stick in readers' minds", ["To list the muffin ingredients", "To make the muffins sound worse than they are", "To ask readers a question"]],
    es: ["Un letrero de la venta de pasteles dice: “Mantecadas magníficas, mullidas y maravillosas”.", "¿Por qué el letrero usa palabras que empiezan con el mismo sonido?", "alliteration", "Para que el letrero suene divertido y se quede en la memoria", ["Para enumerar los ingredientes", "Para que las mantecadas parezcan peores de lo que son", "Para hacerle una pregunta al lector"]],
  },
];

// ---------------------------------------------------------------------------------------------------
// e.thesis — the strongest thesis is arguable, specific and focused; the others are a plain fact, a
// question, and a claim too vague to defend.

type ThesisEntry = [thesis: string, fact: string, question: string, vague: string];

const THESES: Bi<ThesisEntry>[] = [
  { en: ["Our high school should start at 8:30 a.m. because teenagers learn better with more sleep.", "Our high school starts at 7:30 a.m.", "Should school start later?", "School start times are a big deal."], es: ["Nuestra preparatoria debería empezar a las 8:30 a. m., porque los adolescentes aprenden mejor cuando duermen más.", "Nuestra preparatoria empieza a las 7:30 a. m.", "¿Debería empezar más tarde la escuela?", "El horario de entrada es un tema importante."] },
  { en: ["Phones should be stored in lockers during class because they pull attention away from lessons.", "Many students bring phones to school.", "Are phones a problem in class?", "Phones are bad in some ways."], es: ["Los teléfonos deberían guardarse en los casilleros durante la clase, porque distraen la atención de las lecciones.", "Muchos estudiantes llevan teléfono a la escuela.", "¿Son un problema los teléfonos en clase?", "Los teléfonos son malos en algunos sentidos."] },
  { en: ["Middle schools should have physical education every day because regular exercise improves focus and health.", "Our school has gym class twice a week.", "How often should students exercise?", "Exercise is good."], es: ["Las escuelas secundarias deberían tener educación física todos los días, porque el ejercicio regular mejora la concentración y la salud.", "Nuestra escuela tiene educación física dos veces por semana.", "¿Con qué frecuencia deberían hacer ejercicio los estudiantes?", "El ejercicio es bueno."] },
  { en: ["The cafeteria should offer a salad bar every day to give students fresh, healthy choices.", "The cafeteria serves lunch from 11:00 to 1:00.", "What should the cafeteria serve?", "School lunches could be better."], es: ["La cafetería debería tener una barra de ensaladas todos los días para dar a los estudiantes opciones frescas y sanas.", "La cafetería sirve el almuerzo de 11:00 a 1:00.", "¿Qué debería servir la cafetería?", "Los almuerzos escolares podrían ser mejores."] },
  { en: ["Our town should collect food scraps for compost because it would cut household trash and feed community gardens.", "Food scraps make up part of household trash.", "Is composting worth it?", "Composting is interesting."], es: ["Nuestro pueblo debería recolectar restos de comida para hacer abono, porque reduciría la basura de las casas y alimentaría los huertos comunitarios.", "Los restos de comida son parte de la basura de las casas.", "¿Vale la pena hacer abono?", "El abono es interesante."] },
  { en: ["Public libraries should stay open until 9 p.m. so that students who work or ride late buses can still use them.", "The public library closes at 6 p.m.", "Should libraries stay open later?", "Libraries matter to a lot of people."], es: ["Las bibliotecas públicas deberían abrir hasta las 9 p. m. para que los estudiantes que trabajan o salen tarde también puedan usarlas.", "La biblioteca pública cierra a las 6 p. m.", "¿Deberían abrir más tarde las bibliotecas?", "Las bibliotecas les importan a muchas personas."] },
  { en: ["Teachers should limit homework to one hour a night so students have time for sleep, family, and activities.", "Most teachers assign homework.", "How much homework is too much?", "Homework has pros and cons."], es: ["Los maestros deberían limitar la tarea a una hora por noche para que los estudiantes tengan tiempo de dormir, estar en familia y hacer actividades.", "La mayoría de los maestros deja tarea.", "¿Cuánta tarea es demasiada?", "La tarea tiene ventajas y desventajas."] },
  { en: ["Families should set a daily screen-time limit because unlimited gaming can cut into sleep and schoolwork.", "Many teenagers play video games.", "Are video games harmful?", "Video games are complicated."], es: ["Las familias deberían poner un límite diario de pantalla, porque jugar sin límite puede quitarle tiempo al sueño y a la escuela.", "Muchos adolescentes juegan videojuegos.", "¿Son dañinos los videojuegos?", "Los videojuegos son complicados."] },
  { en: ["Every animal shelter should offer free training classes, since trained pets are less likely to be returned.", "Some adopted pets are returned to the shelter.", "Why are adopted pets returned?", "Pet training is something to think about."], es: ["Todos los refugios de animales deberían ofrecer clases de entrenamiento gratis, porque las mascotas entrenadas tienen menos probabilidad de ser devueltas.", "Algunas mascotas adoptadas son devueltas al refugio.", "¿Por qué se devuelven las mascotas adoptadas?", "Entrenar mascotas es algo en qué pensar."] },
  { en: ["The city should turn the empty lot on Main Street into a park because the neighborhood has no green space within walking distance.", "The lot on Main Street has been empty for two years.", "What should happen to the empty lot?", "Parks are nice."], es: ["La ciudad debería convertir el terreno baldío de la calle Principal en un parque, porque el barrio no tiene áreas verdes a una distancia que se pueda caminar.", "El terreno de la calle Principal lleva dos años vacío.", "¿Qué debería pasar con el terreno baldío?", "Los parques son agradables."] },
  { en: ["Every school team should warm up before games because warming up lowers the risk of injury.", "Our soccer team practices three days a week.", "Do warm-ups prevent injuries?", "Sports can be risky."], es: ["Todos los equipos escolares deberían calentar antes de los partidos, porque calentar reduce el riesgo de lesiones.", "Nuestro equipo de fútbol practica tres días por semana.", "¿Los calentamientos previenen lesiones?", "Los deportes pueden ser riesgosos."] },
  { en: ["Schools should give students 20 minutes of free reading each day because choosing what to read builds lifelong readers.", "Our school has a library period on Fridays.", "Do students read enough?", "Reading is important."], es: ["Las escuelas deberían dar 20 minutos diarios de lectura libre, porque elegir qué leer forma lectores para toda la vida.", "Nuestra escuela tiene hora de biblioteca los viernes.", "¿Leen lo suficiente los estudiantes?", "Leer es importante."] },
  { en: ["Our school should not require uniforms, because a simple dress code lets students show responsibility instead.", "Some schools require uniforms.", "Should students wear uniforms?", "Uniforms are a topic many people discuss."], es: ["Nuestra escuela no debería exigir uniforme, porque un código de vestimenta sencillo permite a los estudiantes mostrar responsabilidad.", "Algunas escuelas exigen uniforme.", "¿Deberían usar uniforme los estudiantes?", "El uniforme es un tema del que mucha gente habla."] },
];

// ---------------------------------------------------------------------------------------------------
// e.concision — the wordy original, the clear version, a different wordy version, and one that got
// short by dropping information.

type ConciseEntry = [wordy: string, concise: string, alsoWordy: string, lostMeaning: string, cut: string];

const CONCISION: Bi<ConciseEntry>[] = [
  { en: ["Due to the fact that it was raining, the game was postponed until a later date.", "Because it was raining, the game was postponed.", "Because of the fact that it rained, the game was put off until later on.", "The game was postponed.", "“Due to the fact that” can be “Because,” and “postponed” already means moved to a later date."], es: ["Debido al hecho de que estaba lloviendo, el partido se pospuso para una fecha posterior.", "Como llovía, el partido se pospuso.", "Por el hecho de que llovía, el partido se pospuso para más adelante en otra fecha.", "El partido se pospuso.", "“Debido al hecho de que” puede ser “Como”, y “posponer” ya significa pasar a otra fecha."] },
  { en: ["In my opinion, I think that the library should be open on Sundays.", "The library should be open on Sundays.", "I personally think, in my view, that the library should be open Sundays.", "The library should open.", "“In my opinion” and “I think” say the same thing, and the sentence is already your opinion."], es: ["En mi opinión personal, yo creo que la biblioteca debería abrir los domingos.", "La biblioteca debería abrir los domingos.", "Yo pienso, según mi parecer, que la biblioteca debería abrir los domingos.", "La biblioteca debería abrir.", "“En mi opinión personal” y “yo creo” dicen lo mismo, y la oración ya es tu opinión."] },
  { en: ["At this point in time, we are currently collecting cans for the food drive.", "We are collecting cans for the food drive.", "Right now at this time, we are collecting cans for the food drive.", "We are collecting cans.", "“At this point in time” and “currently” both mean now, and “are collecting” already says now."], es: ["En este momento actual, ahora estamos recolectando latas para la colecta de alimentos.", "Estamos recolectando latas para la colecta de alimentos.", "Ahora mismo, en este momento, estamos juntando latas para la colecta de alimentos.", "Estamos recolectando latas.", "“En este momento actual” y “ahora” dicen lo mismo, y “estamos recolectando” ya indica el presente."] },
  { en: ["The cafeteria workers, who work in the cafeteria, made fresh bread.", "The cafeteria workers made fresh bread.", "The workers who work in the cafeteria made bread that was fresh.", "Workers made bread.", "“Who work in the cafeteria” repeats “cafeteria workers.”"], es: ["Los niños salieron afuera al patio a jugar.", "Los niños salieron al patio a jugar.", "Los niños salieron hacia afuera, al patio de afuera, a jugar.", "Los niños salieron.", "“Salir” ya significa ir afuera, así que “afuera” sobra."] },
  { en: ["The puppy was very tiny and small in size.", "The puppy was tiny.", "The puppy was small and tiny in its size.", "The dog was small.", "“Tiny,” “small,” and “in size” all say the same thing."], es: ["El cachorro era muy diminuto y pequeño de tamaño.", "El cachorro era diminuto.", "El cachorro era pequeño y diminuto en su tamaño.", "El perro era pequeño.", "“Diminuto”, “pequeño” y “de tamaño” dicen lo mismo."] },
  { en: ["The reason why the bus was late is because there was a lot of traffic.", "The bus was late because of heavy traffic.", "The reason the bus was late was due to the fact of a lot of traffic.", "The bus was late.", "“The reason why … is because” says “because” twice."], es: ["La razón por la que el autobús llegó tarde es porque había mucho tráfico.", "El autobús llegó tarde por el tráfico.", "El motivo por el cual el autobús llegó tarde fue debido a que había mucho tráfico.", "El autobús llegó tarde.", "“La razón por la que … es porque” dice “porque” dos veces."] },
  { en: ["Our soccer team, which is a team that has won many games, will play on Saturday.", "Our soccer team, which has won many games, will play on Saturday.", "Our team, a soccer team that is a team with many wins, will play on the day of Saturday.", "Our team will play.", "“Is a team that” repeats “team.”"], es: ["Tenemos que volver a repetir el experimento otra vez.", "Tenemos que repetir el experimento.", "Tenemos que hacer de nuevo otra vez el experimento una vez más.", "Tenemos que hacer un experimento.", "“Repetir” ya significa volver a hacer, así que “volver a” y “otra vez” sobran."] },
  { en: ["She made the decision to join the drama club.", "She decided to join the drama club.", "She came to the decision that she would join the drama club.", "She joined a club.", "“Made the decision to” can be one verb: “decided.”"], es: ["Ella tomó la decisión de unirse al club de teatro.", "Ella decidió unirse al club de teatro.", "Ella llegó a la decisión de que se uniría al club de teatro.", "Ella se unió a un club.", "“Tomó la decisión de” puede ser un solo verbo: “decidió”."] },
  { en: ["It is important to note that the field trip will begin at 9 a.m. in the morning.", "The field trip will begin at 9 a.m.", "Note that the field trip will start at 9 a.m. in the morning hours.", "The field trip will begin in the morning.", "“a.m.” already means morning, and “It is important to note that” adds nothing."], es: ["Es importante señalar que la excursión empezará a las 9 a. m. de la mañana.", "La excursión empezará a las 9 a. m.", "Hay que señalar que la excursión empieza a las 9 a. m. en horas de la mañana.", "La excursión empezará en la mañana.", "“a. m.” ya significa de la mañana, y “Es importante señalar que” no aporta nada."] },
  { en: ["The library has a large number of books that are new.", "The library has many new books.", "The library has a big amount of books that are brand new.", "The library has books.", "“A large number of” can be “many,” and “books that are new” can be “new books.”"], es: ["La biblioteca tiene un gran número de libros que son nuevos.", "La biblioteca tiene muchos libros nuevos.", "La biblioteca tiene una gran cantidad de libros que son completamente nuevos.", "La biblioteca tiene libros.", "“Un gran número de” puede ser “muchos”, y “libros que son nuevos” puede ser “libros nuevos”."] },
  { en: ["We will discuss and talk about the recycling plan at the meeting.", "We will discuss the recycling plan at the meeting.", "At the meeting, we will discuss and go over the plan about recycling.", "We will meet.", "“Discuss” and “talk about” mean the same thing."], es: ["Subimos arriba al tercer piso para ver la exposición.", "Subimos al tercer piso para ver la exposición.", "Subimos hacia arriba hasta el tercer piso de arriba para ver la exposición.", "Subimos para ver algo.", "“Subir” ya significa ir hacia arriba, así que “arriba” sobra."] },
  { en: ["The final outcome of the game was a tie.", "The game ended in a tie.", "The end result of the game was a final tie.", "The game was close.", "An outcome is always final, and “ended in” says it more directly."], es: ["El resultado final del partido fue un empate.", "El partido terminó en empate.", "El resultado final y definitivo del partido fue un empate.", "El partido estuvo reñido.", "Un resultado ya es final, y “terminó en” lo dice de forma más directa."] },
  { en: ["Kai returned back to the classroom to get the jacket that he forgot.", "Kai returned to the classroom to get the jacket he forgot.", "Kai went back again to the classroom so that he could get the jacket that he had forgotten there.", "Kai returned to the classroom.", "“Returned” already means went back, so “back” is extra."], es: ["Hace dos años atrás, plantamos el huerto de la escuela.", "Hace dos años plantamos el huerto de la escuela.", "Hace ya dos años atrás en el tiempo, plantamos el huerto de la escuela.", "Plantamos un huerto.", "“Hace” ya indica tiempo pasado, así que “atrás” sobra."] },
  { en: ["In spite of the fact that the test was hard, most students passed it.", "Although the test was hard, most students passed.", "Despite the fact that the test was a hard one, the majority of the students passed it.", "The test was hard.", "“In spite of the fact that” can be one word: “Although.”"], es: ["A pesar del hecho de que el examen era difícil, la mayoría de los estudiantes lo aprobó.", "Aunque el examen era difícil, la mayoría lo aprobó.", "A pesar de que el examen era uno difícil, la mayor parte de los estudiantes lo aprobó al final.", "El examen era difícil.", "“A pesar del hecho de que” puede ser una sola palabra: “Aunque”."] },
];

/** The hand-written banks, exported so the tests can check every entry, not only the ones a seed hits. */
export const BANKS = {
  CONTEXT,
  FACT_OPINION,
  MAIN_IDEA,
  ARGUMENTS,
  SUPPORT,
  PRONOUN_CASE,
  PRONOUN_AGREE,
  SENTENCE_TYPES,
  TRANSITIONS,
  APPEALS,
  VOICE,
  FALLACIES,
  DEVICE_LINES,
  DEVICE_PURPOSES,
  THESES,
  CONCISION,
};

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const LINK_TEXT: Bi<Record<Link, [how: string, name: string]>> = {
  en: {
    contrast: ["The second sentence goes against what the first one leads you to expect.", "a contrast"],
    result: ["The second sentence tells what happened because of the first.", "a result"],
    example: ["The second sentence gives an example of the first.", "an example"],
    addition: ["The second sentence adds another point of the same kind.", "an added idea"],
  },
  es: {
    contrast: ["La segunda oración va en contra de lo que la primera hace esperar.", "un contraste"],
    result: ["La segunda oración dice lo que pasó a causa de la primera.", "un resultado"],
    example: ["La segunda oración da un ejemplo de la primera.", "un ejemplo"],
    addition: ["La segunda oración agrega otra idea del mismo tipo.", "una idea más"],
  },
};

export const ENGLISH_5_9: Skill[] = [
  {
    id: "e.context.clues",
    subject: "english",
    grade: "5",
    title: { en: "Word meaning from context", es: "Significado por el contexto" },
    standard: "L.5.4a",
    prereqs: ["e.synonyms"],
    content: "draft",
    levels: 2,
    generate(r, level, locale) {
      const [sentence, word, right, wrong, clue] = lang(locale, r.pick(CONTEXT[level - 1]));
      const ask = tr(locale, `What does ${q(word)} mean in this sentence?`, `¿Qué significa ${q(word)} en esta oración?`);
      return mc(
        [para(sentence, ask)],
        `${sentence} ${ask}`,
        shuffled(r, right, wrong),
        [
          tr(locale, `Find the words around ${q(word)} that help explain it.`, `Busca las palabras alrededor de ${q(word)} que ayudan a explicarla.`),
          level === 1
            ? tr(locale, "Writers often explain a hard word right after it: after a comma, a semicolon, “or,” “which means,” or “in other words.”", "Muchas veces quien escribe explica una palabra difícil justo después: tras una coma, dos puntos, “o sea”, “es decir” o “que significa”.")
            : tr(locale, "Look for a contrast word like “but,” “unlike,” or “while,” or use the details to work out the meaning. Then try each choice in place of the word.", "Busca una palabra de contraste como “pero”, “a diferencia de” o “mientras que”, o usa los detalles para deducir el significado. Luego prueba cada opción en lugar de la palabra."),
          tr(locale, `The clue is ${q(clue)}.`, `La pista es ${q(clue)}.`),
        ],
        [
          tr(locale, `The clue ${q(clue)} tells what ${q(word)} means.`, `La pista ${q(clue)} dice lo que significa ${q(word)}.`),
          tr(locale, `${q(word)} means ${q(right)}.`, `${q(word)} significa ${q(right)}.`),
        ],
        level === 1 ? 25 : 35,
      );
    },
  },
  {
    id: "e.fact.opinion",
    subject: "english",
    grade: "5",
    title: { en: "Fact or opinion", es: "Hecho u opinión" },
    standard: "RI.5.8",
    prereqs: ["e.context.clues"],
    content: "draft",
    levels: 1,
    generate(r, _level, locale) {
      const [statement, fact, why] = lang(locale, r.pick(FACT_OPINION));
      const ask = tr(locale, "Is this a fact or an opinion?", "¿Es un hecho o una opinión?");
      return mc(
        [para(statement, ask)],
        `${statement} ${ask}`,
        fixed(lang(locale, { en: ["Fact", "Opinion"], es: ["Hecho", "Opinión"] }), fact ? 0 : 1),
        [
          tr(locale, "Could someone prove this true or false by counting, measuring, or checking a record?", "¿Se podría probar si es cierto o falso contando, midiendo o revisando un registro?"),
          tr(locale, "A fact can be checked. An opinion tells what someone thinks or feels, often with words like best, should, boring, or beautiful.", "Un hecho se puede comprobar. Una opinión dice lo que alguien piensa o siente, muchas veces con palabras como mejor, debería, aburrido o hermoso."),
          why,
        ],
        [why, fact ? tr(locale, "It can be checked, so it is a fact.", "Se puede comprobar, así que es un hecho.") : tr(locale, "It is a judgment, so it is an opinion.", "Es un juicio, así que es una opinión.")],
        12,
      );
    },
  },
  {
    id: "e.main.idea",
    subject: "english",
    grade: "5",
    title: { en: "Find the main idea", es: "La idea principal" },
    standard: "RI.5.2",
    prereqs: ["e.context.clues"],
    content: "draft",
    levels: 2,
    generate(r, level, locale) {
      const [passage, main, detail, broad, unrelated] = lang(locale, r.pick(MAIN_IDEA[level - 1]));
      const ask = tr(locale, "Which sentence best states the main idea of the paragraph?", "¿Qué oración expresa mejor la idea principal del párrafo?");
      return mc(
        [para(passage, ask)],
        `${passage} ${ask}`,
        shuffled(r, main, [detail, broad, unrelated]),
        [
          tr(locale, "What is the whole paragraph mostly about, not just one sentence?", "¿De qué trata el párrafo completo, no solo una oración?"),
          level === 1
            ? tr(locale, "Read the first sentence, then check that the other sentences support it.", "Lee la primera oración y revisa si las demás la apoyan.")
            : tr(locale, "No single sentence may say it. Ask what all the details have in common.", "Puede que ninguna oración lo diga directamente. Pregúntate qué tienen en común todos los detalles."),
          tr(locale, `${qs(detail)} is only one detail, so it cannot be the main idea.`, `${qs(detail)} es solo un detalle, así que no puede ser la idea principal.`),
        ],
        [
          tr(locale, `${qs(detail)} is one detail. ${qs(broad)} is too broad. ${qs(unrelated)} is not what the paragraph discusses.`, `${qs(detail)} es un detalle. ${qs(broad)} es demasiado general. ${qs(unrelated)} no es de lo que trata el párrafo.`),
          tr(locale, `Main idea: ${main}`, `Idea principal: ${main}`),
        ],
        level === 1 ? 45 : 60,
      );
    },
  },
  {
    id: "e.claim.evidence",
    subject: "english",
    grade: "6",
    title: { en: "Claim, evidence, reasoning", es: "Afirmación, evidencia y razonamiento" },
    standard: "W.6.1",
    prereqs: ["e.fact.opinion"],
    content: "draft",
    levels: 2,
    generate(r, level, locale) {
      if (level === 1) {
        const parts = lang(locale, r.pick(ARGUMENTS));
        const role = r.int(0, 2);
        const the = lang(locale, { en: ["the claim", "the evidence", "the reasoning"], es: ["la afirmación", "la evidencia", "el razonamiento"] });
        const label = lang(locale, { en: ["Claim", "Evidence", "Reasoning"], es: ["Afirmación", "Evidencia", "Razonamiento"] });
        const ask = tr(locale, `Which sentence is ${the[role]}?`, `¿Qué oración es ${the[role]}?`);
        // Rule one sentence out for hint 3: the evidence when asking for the claim or the reasoning, else the claim.
        const out = role === 1 ? 0 : 1;
        const order = [0, 1, 2].filter((i) => i !== role).concat(role);
        return mc(
          [para(parts.join(" "), ask)],
          `${parts.join(" ")} ${ask}`,
          shuffled(r, parts[role], parts.filter((_, i) => i !== role)),
          [
            lang(locale, {
              en: ["The claim is the main point the writer wants you to accept.", "Evidence is a fact, number, or example that backs up the point.", "Reasoning explains how the evidence supports the claim."],
              es: ["La afirmación es la idea principal que quien escribe quiere que aceptes.", "La evidencia es un dato, un número o un ejemplo que respalda la idea.", "El razonamiento explica cómo la evidencia apoya la afirmación."],
            })[role],
            lang(locale, {
              en: ["Look for the sentence someone could disagree with.", "Look for the sentence you could check, such as a survey, a count, or a study.", "Look for the sentence that connects the facts to the point, often with words like “this shows” or “means.”"],
              es: ["Busca la oración con la que alguien podría no estar de acuerdo.", "Busca la oración que se podría comprobar, como una encuesta, un conteo o un estudio.", "Busca la oración que conecta los datos con la idea, a menudo con palabras como “esto muestra” o “indica”."],
            })[role],
            tr(locale, `${qs(parts[out])} is ${the[out]}, so it is not the answer.`, `${qs(parts[out])} es ${the[out]}, así que no es la respuesta.`),
          ],
          order.map((i) => `${label[i]}: ${q(parts[i])}`),
          35,
        );
      }
      const [claim, best, opinion, offPoint, anecdote] = lang(locale, r.pick(SUPPORT));
      const ask = tr(locale, "Which evidence best supports this claim?", "¿Qué evidencia apoya mejor esta afirmación?");
      const shown = tr(locale, `Claim: ${claim}`, `Afirmación: ${claim}`);
      return mc(
        [para(shown, ask)],
        `${shown} ${ask}`,
        shuffled(r, best, [opinion, offPoint, anecdote]),
        [
          tr(locale, "Good evidence is a fact or example that proves this exact claim.", "La buena evidencia es un dato o ejemplo que prueba justo esta afirmación."),
          tr(locale, "Rule out opinions, facts about something else, and one person's story. Then pick the strongest fact.", "Descarta las opiniones, los datos sobre otra cosa y la historia de una sola persona. Luego elige el dato más fuerte."),
          tr(locale, `${qs(opinion)} is an opinion, not evidence.`, `${qs(opinion)} es una opinión, no una evidencia.`),
        ],
        [
          tr(locale, `${qs(opinion)} is an opinion. ${qs(offPoint)} may be true, but it does not prove the claim. ${qs(anecdote)} is only one person's experience.`, `${qs(opinion)} es una opinión. ${qs(offPoint)} puede ser cierto, pero no prueba la afirmación. ${qs(anecdote)} es la experiencia de una sola persona.`),
          tr(locale, `Best evidence: ${q(best)}`, `Mejor evidencia: ${q(best)}`),
        ],
        45,
      );
    },
  },
  {
    id: "e.pronouns",
    subject: "english",
    grade: "6",
    title: { en: "Use pronouns correctly", es: "Usar bien los pronombres" },
    standard: "L.6.1a",
    prereqs: ["e.subject.verb"],
    content: "draft",
    levels: 2,
    generate(r, level, locale) {
      const ask = tr(locale, "Choose the word that completes the sentence.", "Elige la palabra que completa la oración.");
      if (level === 1) {
        const [sentence, right, wrong, clue, why] = lang(locale, r.pick(PRONOUN_CASE));
        return mc(
          [`${ask}\n\n`, ...blanked(sentence)],
          `${ask} ${sayBlank(locale, sentence)}`,
          shuffled(r, right, wrong),
          [
            tr(locale, "Is the missing word doing the action, or receiving it?", "¿La palabra que falta hace la acción, o va después de una preposición como a, para, de o con?"),
            tr(locale, "Cover the other person and read the sentence with only the pronoun. Use the form that sounds right alone.", "Fíjate en la palabra justo antes del espacio y en quién hace la acción. Luego prueba cada opción en la oración."),
            clue,
          ],
          [why, fill(sentence, right)],
          15,
        );
      }
      const [kind, sentence, right, wrong, clue, why] = lang(locale, r.pick(PRONOUN_AGREE));
      return mc(
        [`${ask}\n\n`, ...blanked(sentence)],
        `${ask} ${sayBlank(locale, sentence)}`,
        shuffled(r, right, wrong),
        kind === "who"
          ? [
              tr(locale, "“Who” works like he or she. “Whom” works like him or her.", "“Quien” es para una persona y “quienes” para varias. Sin coma ni preposición, después de un nombre se usa “que”."),
              tr(locale, "Answer the question, or rewrite that part as its own sentence, using he or him.", "Busca a quién se refiere la palabra: ¿una persona o varias? ¿Hay una coma o una preposición antes?"),
              clue,
            ]
          : [
              tr(locale, "Find the word the pronoun points back to.", "Busca la palabra a la que se refiere el pronombre, o la cosa que se posee."),
              tr(locale, "Is that word one thing or more than one? A person or a thing? The pronoun has to match it.", "¿Esa palabra es singular o plural? ¿Masculina o femenina? El pronombre tiene que concordar con ella."),
              clue,
            ],
        [why, fill(sentence, right)],
        20,
      );
    },
  },
  {
    id: "e.sentence.types",
    subject: "english",
    grade: "7",
    title: { en: "Types of sentences", es: "Tipos de oraciones" },
    standard: "L.7.1b",
    prereqs: ["e.commas"],
    content: "draft",
    levels: 1,
    generate(r, _level, locale) {
      const [sentence, independent, dependent] = lang(locale, r.pick(SENTENCE_TYPES));
      const type = sentenceType(independent.length, dependent.length);
      const labels = lang(locale, { en: ["Simple", "Compound", "Complex", "Compound-complex"], es: ["Simple", "Compuesta", "Compleja", "Compuesta-compleja"] });
      const list = (xs: string[]) => xs.map(q).join(tr(locale, " and ", " y "));
      const ask = tr(locale, "What type of sentence is this?", "¿Qué tipo de oración es?");
      const first =
        independent.length === 1
          ? tr(locale, `It has one independent clause: ${q(independent[0])}.`, `Tiene una oración independiente: ${q(independent[0])}.`)
          : tr(locale, `It has two independent clauses: ${list(independent)}.`, `Tiene dos oraciones independientes: ${list(independent)}.`);
      return mc(
        [para(sentence, ask)],
        `${sentence} ${ask}`,
        fixed(labels, type),
        [
          tr(locale, "Count the independent clauses: each has its own subject and verb and could stand alone as a sentence.", "Cuenta las oraciones independientes: cada una tiene su propio sujeto y verbo y podría ir sola."),
          tr(locale, "Then look for a dependent clause. It starts with a word like because, when, although, if, that, or who, and it cannot stand alone.", "Luego busca una oración subordinada. Empieza con palabras como porque, cuando, aunque, si, como o que, y no puede ir sola."),
          first,
        ],
        [
          first,
          dependent.length ? tr(locale, `Dependent clause: ${list(dependent)}.`, `Oración subordinada: ${list(dependent)}.`) : tr(locale, "There is no dependent clause.", "No hay oración subordinada."),
          tr(locale, `So it is ${["a simple", "a compound", "a complex", "a compound-complex"][type]} sentence.`, `Así que es una oración ${labels[type].toLowerCase()}.`),
        ],
        30,
      );
    },
  },
  {
    id: "e.transitions",
    subject: "english",
    grade: "7",
    title: { en: "Transitions", es: "Conectores" },
    standard: "W.7.1c",
    prereqs: ["e.claim.evidence"],
    content: "draft",
    levels: 1,
    generate(r, _level, locale) {
      const [first, rest, link, word] = lang(locale, r.pick(TRANSITIONS));
      const words = lang(locale, TRANSITION_WORDS);
      const wrong = LINKS.filter((l) => l !== link).map((l) => r.pick(words[l]));
      const [how, name] = lang(locale, LINK_TEXT)[link];
      const ask = tr(locale, "Which transition fits in the blank?", "¿Qué conector va en el espacio?");
      return mc(
        [`${ask}\n\n`, `${first} `, { blank: true }, rest],
        `${ask} ${first} ${tr(locale, "blank", "espacio en blanco")}${rest}`,
        shuffled(r, word, wrong),
        [
          tr(locale, "How does the second sentence connect to the first?", "¿Cómo se conecta la segunda oración con la primera?"),
          tr(locale, "Decide whether it shows a contrast, a result, an example, or one more idea. Then pick the word for that link.", "Decide si muestra un contraste, un resultado, un ejemplo o una idea más. Luego elige la palabra para esa conexión."),
          how,
        ],
        [how, tr(locale, `${q(word)} signals ${name}.`, `${q(word)} indica ${name}.`), `${first} ${word}${rest}`],
        25,
      );
    },
  },
  {
    id: "e.appeals",
    subject: "english",
    grade: "7",
    title: { en: "Ethos, pathos, logos", es: "Ethos, pathos y logos" },
    standard: "RI.8.6",
    prereqs: ["e.claim.evidence"],
    content: "draft",
    levels: 2,
    generate(r, level, locale) {
      const [text, appeal, clue] = lang(locale, r.pick(APPEALS[level - 1]));
      const labels = lang(locale, APPEAL_LABELS);
      const ask =
        level === 1
          ? tr(locale, "Which appeal does this sentence use?", "¿En qué se apoya esta oración para convencer?")
          : tr(locale, "Which appeal does this message rely on most?", "¿En qué se apoya más este mensaje para convencer?");
      return mc(
        [para(text, ask)],
        `${text} ${ask}`,
        fixed(labels, appeal),
        [
          tr(locale, "Ethos leans on the speaker's credibility, pathos on the listener's feelings, and logos on facts and reasoning.", "El ethos se apoya en la credibilidad de quien habla, el pathos en los sentimientos de quien escucha y el logos en datos y razonamientos."),
          level === 1
            ? tr(locale, "Ask: does it rely on who is speaking, on how you feel, or on numbers and logic?", "Pregúntate: ¿se apoya en quién habla, en cómo te sientes, o en números y lógica?")
            : tr(locale, "A message can mix appeals. Find the one doing most of the persuading.", "Un mensaje puede mezclar recursos. Busca el que más trabaja para convencer."),
          clue,
        ],
        [clue, tr(locale, `So it relies on ${labels[appeal]}.`, `Por eso se apoya en ${labels[appeal]}.`)],
        level === 1 ? 20 : 35,
      );
    },
  },
  {
    id: "e.active.passive",
    subject: "english",
    grade: "8",
    title: { en: "Active and passive voice", es: "Voz activa y pasiva" },
    standard: "L.8.1b",
    prereqs: ["e.sentence.types"],
    content: "draft",
    levels: 1,
    generate(r, _level, locale) {
      const [passive, active, changed, stillPassive, receiver, doer] = lang(locale, r.pick(VOICE));
      const mode = r.int(0, 2);
      if (mode === 2) {
        const ask = tr(locale, "Which sentence says the same thing in the active voice?", "¿Qué oración dice lo mismo en voz activa?");
        const first = tr(locale, `The doer is ${q(doer)}. Put the doer first, as the subject.`, `Quien hace la acción es ${q(doer)}: va primero, como sujeto.`);
        return mc(
          [para(passive, ask)],
          `${passive} ${ask}`,
          shuffled(r, active, [changed, stillPassive]),
          [
            tr(locale, "Who or what does the action in this sentence?", "¿Quién hace la acción en esta oración?"),
            tr(locale, "In the active voice, the doer comes first as the subject. Keep the same time: if it happened in the past, keep it in the past.", "En voz activa, quien hace la acción va primero como sujeto. Mantén el mismo tiempo: si pasó en el pasado, sigue en pasado."),
            first,
          ],
          [first, tr(locale, `Active voice: ${active}`, `Voz activa: ${active}`)],
          25,
        );
      }
      const isPassive = mode === 0;
      const sentence = isPassive ? passive : active;
      const subject = isPassive ? receiver : doer;
      const ask = tr(locale, "Is this sentence in the active voice or the passive voice?", "¿Esta oración está en voz activa o en voz pasiva?");
      return mc(
        [para(sentence, ask)],
        `${sentence} ${ask}`,
        fixed(lang(locale, { en: ["Active", "Passive"], es: ["Activa", "Pasiva"] }), isPassive ? 1 : 0),
        [
          tr(locale, "Does the subject do the action, or does the action happen to the subject?", "¿El sujeto hace la acción, o la acción le pasa al sujeto?"),
          tr(locale, "Passive voice uses a form of “be” with a verb like “chosen” or “written,” and often names the doer after “by.”", "La voz pasiva usa “ser” con un participio, como “fue elegido” o “fue escrito”, y muchas veces nombra a quien hace la acción después de “por”."),
          tr(locale, `The subject is ${q(subject)}. Does the subject do the action, or receive it?`, `El sujeto es ${q(subject)}. ¿El sujeto hace la acción, o la recibe?`),
        ],
        isPassive
          ? [tr(locale, `The subject, ${q(receiver)}, receives the action. The doer is ${q(doer)}.`, `El sujeto, ${q(receiver)}, recibe la acción. Quien la hace es ${q(doer)}.`), tr(locale, "So the sentence is in the passive voice.", "Así que la oración está en voz pasiva.")]
          : [tr(locale, `The subject, ${q(doer)}, does the action.`, `El sujeto, ${q(doer)}, hace la acción.`), tr(locale, "So the sentence is in the active voice.", "Así que la oración está en voz activa.")],
        15,
      );
    },
  },
  {
    id: "e.fallacies",
    subject: "english",
    grade: "8",
    title: { en: "Spot the fallacy", es: "Detectar falacias" },
    standard: "RI.8.8",
    prereqs: ["e.appeals"],
    content: "draft",
    levels: 2,
    generate(r, level, locale) {
      const [text, fallacy, clue] = lang(locale, r.pick(FALLACIES[level - 1]));
      const names = lang(locale, FALLACY_NAMES);
      // Level 1 always shows its four names in one order; level 2 shows the answer with three others.
      const shown = level === 1 ? FALLACIES_L1 : r.shuffle([fallacy, ...r.shuffle(FALLACIES_ALL.filter((f) => f !== fallacy)).slice(0, 3)]);
      const ask = tr(locale, "Which fallacy is this?", "¿Qué falacia es esta?");
      return mc(
        [para(text, ask)],
        `${text} ${ask}`,
        fixed(shown.map((f) => names[f][0]), shown.indexOf(fallacy)),
        [
          tr(locale, "Find the weak spot: what does the argument use in place of a good reason?", "Busca el punto débil: ¿qué usa el argumento en lugar de una buena razón?"),
          shown.map((f) => `${names[f][0]}: ${names[f][1]}.`).join(" "),
          clue,
        ],
        [clue, tr(locale, `${names[fallacy][0]}: it ${names[fallacy][1]}.`, `${names[fallacy][0]}: ${names[fallacy][1]}.`)],
        level === 1 ? 30 : 40,
      );
    },
  },
  {
    id: "e.rhetorical.devices",
    subject: "english",
    grade: "9",
    title: { en: "Rhetorical devices", es: "Recursos retóricos" },
    standard: "RL.9-10.4",
    prereqs: ["e.figurative", "e.appeals"],
    content: "draft",
    levels: 2,
    generate(r, level, locale) {
      const names = lang(locale, DEVICE_NAMES);
      if (level === 1) {
        const [line, device, clue] = lang(locale, r.pick(DEVICE_LINES));
        const pool = DEVICES.filter((d) => d !== device && !DEVICE_OVERLAP[device].includes(d));
        const shown = r.shuffle([device, ...r.shuffle(pool).slice(0, 3)]);
        const ask = tr(locale, "Which rhetorical device does this line use?", "¿Qué recurso retórico usa esta frase?");
        return mc(
          [para(line, ask)],
          `${line} ${ask}`,
          fixed(shown.map((d) => names[d][0]), shown.indexOf(device)),
          [
            tr(locale, "Read it aloud. What do you notice about its sound, its pattern, or what it claims?", "Léela en voz alta. ¿Qué notas en su sonido, en su estructura o en lo que afirma?"),
            shown.map((d) => `${names[d][0]}: ${names[d][1]}.`).join(" "),
            clue,
          ],
          [clue, tr(locale, `${names[device][0]}: it ${names[device][1]}.`, `${names[device][0]}: ${names[device][1]}.`)],
          25,
        );
      }
      const [setup, question, device, right, wrong] = lang(locale, r.pick(DEVICE_PURPOSES));
      const named = tr(locale, `The device is ${lowerFirst(names[device][0])}. It ${names[device][1]}.`, `El recurso es ${lowerFirst(names[device][0])}: ${names[device][1]}.`);
      return mc(
        [para(setup, question)],
        `${setup} ${question}`,
        shuffled(r, right, wrong),
        [
          tr(locale, "First name the device: what pattern do you notice?", "Primero nombra el recurso: ¿qué patrón notas?"),
          tr(locale, "Then think about the effect on the audience. What should they feel, think, or remember?", "Luego piensa en el efecto en el público. ¿Qué debería sentir, pensar o recordar?"),
          named,
        ],
        [named, tr(locale, `The purpose: ${lowerFirst(right)}.`, `El propósito: ${lowerFirst(right)}.`)],
        40,
      );
    },
  },
  {
    id: "e.thesis",
    subject: "english",
    grade: "9",
    title: { en: "Strong thesis statements", es: "Tesis sólidas" },
    standard: "W.9-10.1a",
    prereqs: ["e.claim.evidence"],
    content: "draft",
    levels: 1,
    generate(r, _level, locale) {
      const [thesis, fact, question, vague] = lang(locale, r.pick(THESES));
      const ask = tr(locale, "Which is the strongest thesis statement?", "¿Cuál es la tesis más sólida?");
      return mc(
        [ask],
        ask,
        shuffled(r, thesis, [fact, question, vague]),
        [
          tr(locale, "A thesis takes a position someone could argue against, and it is specific enough to defend.", "Una tesis toma una postura con la que alguien podría no estar de acuerdo, y es lo bastante específica para defenderla."),
          tr(locale, "Rule out a plain fact, a question, and a claim too vague to prove.", "Descarta un simple dato, una pregunta y una afirmación demasiado vaga para probarla."),
          tr(locale, `${qs(fact)} is a fact; no one would argue about it.`, `${qs(fact)} es un dato; nadie discutiría sobre eso.`),
        ],
        [
          tr(locale, `${qs(fact)} is a fact. ${q(question)} is a question, not a position. ${qs(vague)} is too vague to defend.`, `${qs(fact)} es un dato. ${q(question)} es una pregunta, no una postura. ${qs(vague)} es una afirmación demasiado vaga para defenderla.`),
          tr(locale, `Strongest thesis: ${q(thesis)}`, `Tesis más sólida: ${q(thesis)}`),
        ],
        45,
      );
    },
  },
  {
    id: "e.concision",
    subject: "english",
    grade: "9",
    title: { en: "Clear, concise sentences", es: "Oraciones claras y concisas" },
    standard: "L.9-10.3",
    prereqs: ["e.active.passive"],
    content: "draft",
    levels: 1,
    generate(r, _level, locale) {
      const [wordy, concise, alsoWordy, lost, cut] = lang(locale, r.pick(CONCISION));
      const ask = tr(locale, "Which version is the clearest and most concise, with the same meaning?", "¿Qué versión es la más clara y concisa, con el mismo significado?");
      return mc(
        [para(wordy, ask)],
        `${wordy} ${ask}`,
        shuffled(r, concise, [wordy, alsoWordy, lost]),
        [
          tr(locale, "Look for words that repeat an idea or add nothing.", "Busca palabras que repiten una idea o no aportan nada."),
          tr(locale, "The best version keeps every important fact and drops the extra words. A version that got short by losing information is not the answer.", "La mejor versión conserva toda la información importante y quita lo que sobra. Una versión que quedó corta porque perdió información no es la respuesta."),
          cut,
        ],
        [cut, tr(locale, `Clearest version: ${q(concise)}`, `Versión más clara: ${q(concise)}`)],
        40,
      );
    },
  },
];
