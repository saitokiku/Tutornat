import { cats, skill, type Bi, type Entry } from "./shared";

// Grade 7: wordiness; word relationships and analogies; formal style.

// ---------------------------------------------------------------------------------------------------
// e.wordiness — level 1: the word that only repeats an idea (Spanish vicios del lenguaje: pleonasmo y
// dequeísmo); level 2: one plain word for a wordy phrase (Spanish: verbos comodín y circunloquios).

const REDUNDANT: Bi<Entry>[] = [
  {
    en: ["We returned back to the classroom after lunch.", "back", [["returned", "cut-needed-word"], ["after lunch", "cut-needed-word"]], "What does “returned” already mean?", "“Returned” already means went back, so “back” repeats it."],
    es: ["Entra adentro, que va a llover.", "adentro", [["Entra", "cut-needed-word"], ["que va a llover", "cut-needed-word"]], "¿Hacia dónde se entra siempre?", "“Entrar” ya significa ir adentro, así que “adentro” sobra."],
  },
  {
    en: ["Please repeat that again.", "again", [["repeat", "cut-needed-word"], ["that", "cut-needed-word"]], "What does “repeat” already mean?", "“Repeat” already means say again, so “again” is extra."],
    es: ["Bajé abajo a buscar mi mochila.", "abajo", [["Bajé", "cut-needed-word"], ["mi mochila", "cut-needed-word"]], "¿Hacia dónde se baja siempre?", "“Bajar” ya significa ir hacia abajo, así que “abajo” sobra."],
  },
  {
    en: ["The two twins wore matching jackets.", "two", [["twins", "cut-needed-word"], ["matching", "cut-needed-word"]], "How many twins are there, always?", "Twins are always two, so “two” is extra."],
    es: ["Pienso de que mañana va a llover.", "de", [["Pienso", "cut-needed-word"], ["mañana", "cut-needed-word"]], "Cambia lo que sigue a “pienso” por “eso”: ¿hace falta alguna palabra entre “pienso” y “eso”?", "Se dice “pienso que”. Poner “de” de más se llama dequeísmo."],
  },
  {
    en: ["The sweater was red in color.", "in color", [["sweater", "cut-needed-word"], ["red", "cut-needed-word"]], "What else could “red” describe besides a color?", "“Red” is already a color, so “in color” is extra."],
    es: ["Me dijo de que llegaría tarde.", "de", [["dijo", "cut-needed-word"], ["tarde", "cut-needed-word"]], "Cambia lo que sigue a “dijo” por “eso”: ¿hace falta alguna palabra entre “dijo” y “eso”?", "Se dice “me dijo que”. El “de” sobra: es dequeísmo."],
  },
  {
    en: ["My grandmother told me a true fact about her childhood.", "true", [["grandmother", "cut-needed-word"], ["childhood", "cut-needed-word"]], "Can a fact be false?", "A fact is true by definition, so “true” is extra."],
    es: ["Los dos gemelos llevaban chaquetas iguales.", "dos", [["gemelos", "cut-needed-word"], ["iguales", "cut-needed-word"]], "¿Cuántos son siempre los gemelos?", "Los gemelos siempre son dos, así que “dos” sobra."],
  },
  {
    en: ["Kai gave me a free gift for my birthday.", "free", [["gift", "cut-needed-word"], ["birthday", "cut-needed-word"]], "Do you ever pay for a gift you receive?", "A gift is already free, so “free” is extra."],
    es: ["Fue un regalo gratis por mi cumpleaños.", "gratis", [["regalo", "cut-needed-word"], ["cumpleaños", "cut-needed-word"]], "¿Alguna vez se paga por un regalo que recibes?", "Un regalo ya es gratis, así que “gratis” sobra."],
  },
  {
    en: ["The sun rose up over the mountains.", "up", [["rose", "cut-needed-word"], ["over the mountains", "cut-needed-word"]], "Which way does rising always go?", "“Rose” already means went up, so “up” is extra."],
    es: ["Llegamos tarde, mas sin embargo vimos el final.", "mas", [["tarde", "cut-needed-word"], ["el final", "cut-needed-word"]], "Hay dos palabras seguidas que significan “pero”.", "“Mas sin embargo” dice “pero” dos veces. Basta con “sin embargo”."],
  },
  {
    en: ["We need to cooperate together on this project.", "together", [["cooperate", "cut-needed-word"], ["project", "cut-needed-word"]], "What does the “co-” in “cooperate” mean?", "“Cooperate” already means work together, so “together” is extra."],
    es: ["Hay que prever con antelación los materiales del proyecto.", "con antelación", [["prever", "cut-needed-word"], ["los materiales", "cut-needed-word"]], "¿Qué significa el “pre-” de “prever”?", "“Prever” ya significa ver o preparar algo antes, así que “con antelación” sobra."],
  },
  {
    en: ["She shouted loudly across the field.", "loudly", [["shouted", "cut-needed-word"], ["across the field", "cut-needed-word"]], "Can you shout quietly?", "Shouting is already loud, so “loudly” is extra."],
    es: ["Subimos arriba a la azotea para ver las estrellas.", "arriba", [["Subimos", "cut-needed-word"], ["las estrellas", "cut-needed-word"]], "¿Hacia dónde se sube siempre?", "“Subir” ya significa ir hacia arriba, así que “arriba” sobra."],
  },
  {
    en: ["The end result of the vote was a tie.", "end", [["of the vote", "cut-needed-word"], ["a tie", "cut-needed-word"]], "Does a result ever come at the beginning?", "A result already comes at the end, so “end” is extra."],
    es: ["Tenemos que cooperar juntos en este proyecto.", "juntos", [["cooperar", "cut-needed-word"], ["proyecto", "cut-needed-word"]], "¿Qué significa el “co-” de “cooperar”?", "“Cooperar” ya significa trabajar juntos, así que “juntos” sobra."],
  },
  {
    en: ["The museum has a collection of ancient fossils from long ago.", "from long ago", [["collection", "cut-needed-word"], ["fossils", "cut-needed-word"]], "What does “ancient” already mean?", "“Ancient” already means from long ago."],
    es: ["El museo tiene fósiles antiguos de hace muchísimo tiempo.", "de hace muchísimo tiempo", [["fósiles", "cut-needed-word"], ["El museo", "cut-needed-word"]], "¿Qué significa “antiguos”?", "“Antiguos” ya significa de hace mucho tiempo."],
  },
  {
    en: ["Let's circle around the block one more time.", "around", [["circle", "cut-needed-word"], ["one more time", "cut-needed-word"]], "What does “circle” already mean?", "To circle is already to go around, so “around” is extra."],
    es: ["Juan me confesó de que había roto el vaso.", "de", [["confesó", "cut-needed-word"], ["el vaso", "cut-needed-word"]], "Cambia lo que sigue a “confesó” por “eso”: ¿hace falta alguna palabra entre “confesó” y “eso”?", "Se dice “me confesó que”. El “de” sobra: es dequeísmo."],
  },
  {
    en: ["We should combine the two groups together.", "together", [["combine", "cut-needed-word"], ["the two groups", "cut-needed-word"]], "What does “combine” already mean?", "“Combine” already means put together, so “together” is extra."],
    es: ["Creo de que el examen será fácil.", "de", [["Creo", "cut-needed-word"], ["fácil", "cut-needed-word"]], "Cambia lo que sigue a “creo” por “eso”: ¿hace falta alguna palabra entre “creo” y “eso”?", "Se dice “creo que”. El “de” sobra: es dequeísmo."],
  },
  {
    en: ["The baby looks exactly identical to her twin.", "exactly", [["identical", "cut-needed-word"], ["twin", "cut-needed-word"]], "What does “identical” already mean?", "“Identical” already means exactly the same, so “exactly” is extra."],
    es: ["Mi abuela tiene una colección de monedas antiguas del pasado.", "del pasado", [["monedas", "cut-needed-word"], ["colección", "cut-needed-word"]], "¿Qué significa “antiguas”?", "“Antiguas” ya significa del pasado."],
  },
];

const WORDY_PHRASES: Bi<Entry>[] = [
  {
    en: ["In the event that it rains, the picnic will move indoors.", "If", [["Although", "changed-meaning"], ["In the case that", "still-wordy"]], "The phrase sets a condition: what happens only when it rains.", "“In the event that” means “if.”", "In the event that"],
    es: ["El robot tiene la capacidad de subir escaleras.", "puede", [["debe", "changed-meaning"], ["es capaz de poder", "still-wordy"]], "La frase dice que el robot es capaz de algo.", "“Tiene la capacidad de” significa “puede”.", "tiene la capacidad de"],
  },
  {
    en: ["Our robot has the ability to climb stairs.", "can", [["must", "changed-meaning"], ["is able to", "still-wordy"]], "The phrase says the robot is capable of something.", "“Has the ability to” means “can.”", "has the ability to"],
    es: ["Maya practica el violín de forma diaria.", "diariamente", [["semanalmente", "changed-meaning"], ["todos y cada uno de los días", "still-wordy"]], "¿Con qué frecuencia practica?", "“De forma diaria” significa “diariamente”.", "de forma diaria"],
  },
  {
    en: ["Maya practices the violin on a daily basis.", "daily", [["weekly", "changed-meaning"], ["every single day of the week", "still-wordy"]], "How often does she practice?", "“On a daily basis” means “daily.”", "on a daily basis"],
    es: ["La biblioteca está en las proximidades del parque.", "cerca", [["enfrente", "changed-meaning"], ["en la zona cercana", "still-wordy"]], "La frase dice qué tan lejos están.", "“En las proximidades de” significa “cerca de”.", "en las proximidades"],
  },
  {
    en: ["The library is in close proximity to the park.", "near", [["across from", "changed-meaning"], ["in the general vicinity of", "still-wordy"]], "The phrase tells how far apart they are.", "“In close proximity to” means “near.”", "in close proximity to"],
    es: ["Lávate las manos con anterioridad a cocinar.", "antes de", [["después de", "changed-meaning"], ["previamente antes de", "still-wordy"]], "La frase dice cuándo, comparado con cocinar.", "“Con anterioridad a” significa “antes de”.", "con anterioridad a"],
  },
  {
    en: ["Wash your hands prior to cooking.", "before", [["after", "changed-meaning"], ["in advance of", "still-wordy"]], "The phrase tells when, compared with cooking.", "“Prior to” means “before.”", "prior to"],
    es: ["El médico realizó una revisión de mis oídos.", "revisó", [["ignoró", "changed-meaning"], ["llevó a cabo una revisión de", "still-wordy"]], "La frase dice lo que hizo el médico con mis oídos.", "“Realizó una revisión de” significa “revisó”. “Realizar” es un verbo comodín.", "realizó una revisión de"],
  },
  {
    en: ["Everyone came to the party with the exception of Leo.", "except", [["including", "changed-meaning"], ["excluding the presence of", "still-wordy"]], "The phrase leaves one person out.", "“With the exception of” means “except.”", "with the exception of"],
    es: ["Los alumnos hicieron una visita a la granja.", "visitaron", [["evitaron", "changed-meaning"], ["efectuaron una visita a", "still-wordy"]], "La frase dice lo que hicieron los alumnos en la granja.", "“Hicieron una visita a” significa “visitaron”. “Hacer” es un verbo comodín.", "hicieron una visita a"],
  },
  {
    en: ["At the present time, the pool is closed.", "Now", [["Soon", "changed-meaning"], ["At this moment in time", "still-wordy"]], "The phrase tells when: at this moment.", "“At the present time” means “now.”", "At the present time"],
    es: ["La maestra dio comienzo a la clase a las ocho.", "comenzó", [["terminó", "changed-meaning"], ["dio inicio a", "still-wordy"]], "La frase dice lo que hizo la maestra con la clase.", "“Dio comienzo a” significa “comenzó”.", "dio comienzo a"],
  },
  {
    en: ["We will visit the planetarium in the near future.", "soon", [["yesterday", "changed-meaning"], ["at a later point in time", "still-wordy"]], "The phrase tells when: not long from now.", "“In the near future” means “soon.”", "in the near future"],
    es: ["Por favor, toma en consideración mi idea para el paseo.", "considera", [["ignora", "changed-meaning"], ["ten en cuenta y considera", "still-wordy"]], "La frase pide pensar en la idea.", "“Toma en consideración” significa “considera”.", "toma en consideración"],
  },
  {
    en: ["Please give consideration to my idea for the class trip.", "consider", [["ignore", "changed-meaning"], ["take into consideration", "still-wordy"]], "The phrase asks someone to think about the idea.", "“Give consideration to” means “consider.”", "give consideration to"],
    es: ["Ana hizo un intento de arreglar el cierre.", "intentó", [["se negó a", "changed-meaning"], ["hizo el esfuerzo de intentar", "still-wordy"]], "La frase dice lo que hizo Ana con el cierre.", "“Hizo un intento de” significa “intentó”.", "hizo un intento de"],
  },
  {
    en: ["Ana made an attempt to fix the zipper.", "tried", [["refused", "changed-meaning"], ["made an effort", "still-wordy"]], "The phrase tells what Ana did about the zipper.", "“Made an attempt” means “tried.”", "made an attempt"],
    es: ["La detective llegó a la conclusión de que el gato se llevó el ovillo de lana.", "concluyó", [["dudó", "changed-meaning"], ["arribó a la conclusión de", "still-wordy"]], "La frase dice lo que decidió la detective.", "“Llegó a la conclusión de” significa “concluyó”.", "llegó a la conclusión de"],
  },
  {
    en: ["The detective came to the conclusion that the cat had taken the yarn.", "concluded", [["doubted", "changed-meaning"], ["reached the conclusion", "still-wordy"]], "The phrase tells what the detective decided.", "“Came to the conclusion” means “concluded.”", "came to the conclusion"],
    es: ["El jardín tiene necesidad de agua.", "necesita", [["tiene mucha", "changed-meaning"], ["está en necesidad de", "still-wordy"]], "La frase dice qué le falta al jardín.", "“Tiene necesidad de” significa “necesita”.", "tiene necesidad de"],
  },
  {
    en: ["A majority of the students voted for a longer lunch.", "Most", [["A few", "changed-meaning"], ["A greater number", "still-wordy"]], "The phrase says more than half of the students.", "“A majority” means “most.”", "A majority"],
    es: ["El entrenador habló de manera tranquila.", "tranquilamente", [["a gritos", "changed-meaning"], ["de un modo calmado y tranquilo", "still-wordy"]], "La frase dice cómo habló.", "“De manera tranquila” significa “tranquilamente”.", "de manera tranquila"],
  },
  {
    en: ["The garden is in need of water.", "needs", [["has plenty of", "changed-meaning"], ["has a need for", "still-wordy"]], "The phrase tells what the garden is missing.", "“Is in need of” means “needs.”", "is in need of"],
    es: ["Nos quedamos adentro debido a que estaba nevando.", "porque", [["aunque", "changed-meaning"], ["por el motivo de que", "still-wordy"]], "La frase da una razón.", "“Debido a que” significa “porque”.", "debido a que"],
  },
  {
    en: ["The coach spoke in a quiet manner.", "quietly", [["loudly", "changed-meaning"], ["in a soft way", "still-wordy"]], "The phrase tells how the coach spoke.", "“In a quiet manner” means “quietly.”", "in a quiet manner"],
    es: ["El director hizo mención de la fecha del examen.", "mencionó", [["olvidó", "changed-meaning"], ["hizo referencia mencionando", "still-wordy"]], "La frase dice lo que hizo el director con la fecha.", "“Hizo mención de” significa “mencionó”.", "hizo mención de"],
  },
  {
    en: ["We stayed inside for the reason that it was snowing.", "because", [["although", "changed-meaning"], ["due to the reason that", "still-wordy"]], "The phrase gives a reason.", "“For the reason that” means “because.”", "for the reason that"],
    es: ["Pusimos de manifiesto nuestras dudas en la reunión.", "Mostramos", [["Ocultamos", "changed-meaning"], ["Hicimos manifiestas y mostramos", "still-wordy"]], "La frase dice lo que hicimos con las dudas.", "“Poner de manifiesto” significa “mostrar”.", "Pusimos de manifiesto"],
  },
];

const WORDINESS = skill(
  { id: "e.wordiness", grade: "7", title: { en: "Cut wordiness and redundancy", es: "Redundancias y vicios del lenguaje" }, standard: "L.7.3a", prereqs: ["e.synonyms"] },
  [
    {
      bank: REDUNDANT,
      ask: { en: "Which words can be cut without losing any meaning?", es: "¿Qué palabra o palabras sobran, porque repiten una idea o no hacen falta?" },
      hints: {
        en: ["Look for a word that repeats an idea another word already gives.", "Read the sentence without each choice. Keep the words that carry meaning; cut the one that only repeats."],
        es: ["Busca una palabra que repita una idea que otra palabra ya da.", "Lee la oración sin cada opción. Quédate con las palabras que aportan significado y quita la que solo repite. Ojo con el “de” que sobra antes de “que” (dequeísmo)."],
      },
      seconds: 15,
    },
    {
      bank: WORDY_PHRASES,
      ask: { en: "What is the shortest, plainest way to say {t} without changing the meaning?", es: "¿Cuál es la forma más breve y sencilla de decir {t} sin cambiar el significado?" },
      hints: {
        en: ["What does the long phrase really mean?", "Say the same idea in one or two plain words. Rule out choices that change the meaning or are just as wordy."],
        es: ["¿Qué significa en realidad la expresión larga?", "Di la misma idea con una o dos palabras sencillas. Descarta las opciones que cambian el sentido o que siguen siendo largas."],
      },
      seconds: 15,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.word.relationships — level 1: name how two words are related (six relationships; four are shown); level 2:
// complete an analogy. Tags on level 2: wrong-relationship, associated-word (goes with the topic but not
// the pattern), reversed-order.

type Relation = "synonyms" | "antonyms" | "part-whole" | "cause-effect" | "item-category" | "tool-use";
const RELATIONS: readonly Relation[] = ["synonyms", "antonyms", "part-whole", "cause-effect", "item-category", "tool-use"];
const RELATION_PAIRS = cats<Relation>(
  {
    en: { synonyms: "Synonyms", antonyms: "Antonyms", "part-whole": "Part to whole", "cause-effect": "Cause and effect", "item-category": "Item and category", "tool-use": "Tool and its use" },
    es: { synonyms: "Sinónimos", antonyms: "Antónimos", "part-whole": "Parte y todo", "cause-effect": "Causa y efecto", "item-category": "Elemento y categoría", "tool-use": "Herramienta y su uso" },
  },
  { en: RELATIONS, es: RELATIONS },
  [
    {
      en: ["finger : hand", "part-whole", "Is a finger a kind of hand, or one piece of a hand?", "A finger is one piece of a hand."],
      es: ["dedo : mano", "part-whole", "¿Un dedo es un tipo de mano, o una pieza de la mano?", "Un dedo es una pieza de la mano."],
    },
    {
      en: ["happy : joyful", "synonyms", "Do the two words mean about the same thing, or opposite things?", "“Happy” and “joyful” mean about the same thing."],
      es: ["feliz : alegre", "synonyms", "¿Las dos palabras significan casi lo mismo, o lo contrario?", "“Feliz” y “alegre” significan casi lo mismo."],
    },
    {
      en: ["ancient : modern", "antonyms", "Do the two words mean about the same thing, or opposite things?", "“Ancient” means very old, and “modern” means new: they are opposites."],
      es: ["antiguo : moderno", "antonyms", "¿Las dos palabras significan casi lo mismo, o lo contrario?", "“Antiguo” y “moderno” significan lo contrario."],
    },
    {
      en: ["rain : flood", "cause-effect", "Can one of these lead to the other?", "Heavy rain can cause a flood."],
      es: ["lluvia : inundación", "cause-effect", "¿Una de estas cosas puede provocar la otra?", "Mucha lluvia puede provocar una inundación."],
    },
    {
      en: ["oak : tree", "item-category", "Is an oak one piece of a tree, or one kind of tree?", "An oak is one kind of tree."],
      es: ["roble : árbol", "item-category", "¿El roble es una pieza de un árbol, o un tipo de árbol?", "El roble es un tipo de árbol."],
    },
    {
      en: ["scissors : cut", "tool-use", "What do you do with scissors?", "Scissors are a tool, and cutting is what they are used for."],
      es: ["tijeras : cortar", "tool-use", "¿Qué haces con unas tijeras?", "Las tijeras son una herramienta, y sirven para cortar."],
    },
    {
      en: ["page : book", "part-whole", "Is a page a kind of book, or one piece of a book?", "A page is one piece of a book."],
      es: ["página : libro", "part-whole", "¿Una página es un tipo de libro, o una pieza del libro?", "Una página es una pieza del libro."],
    },
    {
      en: ["brave : fearless", "synonyms", "Do the two words mean about the same thing, or opposite things?", "“Brave” and “fearless” mean about the same thing."],
      es: ["valiente : intrépido", "synonyms", "¿Las dos palabras significan casi lo mismo, o lo contrario?", "“Valiente” e “intrépido” significan casi lo mismo."],
    },
    {
      en: ["generous : stingy", "antonyms", "Do the two words mean about the same thing, or opposite things?", "A generous person shares freely; a stingy person does not. They are opposites."],
      es: ["generoso : tacaño", "antonyms", "¿Las dos palabras significan casi lo mismo, o lo contrario?", "Una persona generosa comparte; una tacaña no. Son opuestas."],
    },
    {
      en: ["practice : improvement", "cause-effect", "Can one of these lead to the other?", "Practice leads to improvement."],
      es: ["práctica : mejora", "cause-effect", "¿Una de estas cosas puede provocar la otra?", "La práctica produce una mejora."],
    },
    {
      en: ["violin : instrument", "item-category", "Is a violin one piece of an instrument, or one kind of instrument?", "A violin is one kind of instrument."],
      es: ["violín : instrumento", "item-category", "¿El violín es una pieza de un instrumento, o un tipo de instrumento?", "El violín es un tipo de instrumento."],
    },
    {
      en: ["shovel : dig", "tool-use", "What do you do with a shovel?", "A shovel is a tool, and digging is what it is used for."],
      es: ["pala : cavar", "tool-use", "¿Qué haces con una pala?", "La pala es una herramienta, y sirve para cavar."],
    },
    {
      en: ["petal : flower", "part-whole", "Is a petal a kind of flower, or one piece of a flower?", "A petal is one piece of a flower."],
      es: ["pétalo : flor", "part-whole", "¿Un pétalo es un tipo de flor, o una pieza de la flor?", "Un pétalo es una pieza de la flor."],
    },
    {
      en: ["germ : illness", "cause-effect", "Can one of these lead to the other?", "A germ can cause an illness."],
      es: ["germen : enfermedad", "cause-effect", "¿Una de estas cosas puede provocar la otra?", "Un germen puede provocar una enfermedad."],
    },
    {
      en: ["Jupiter : planet", "item-category", "Is Jupiter one piece of a planet, or one kind of planet?", "Jupiter is one of the planets."],
      es: ["Júpiter : planeta", "item-category", "¿Júpiter es una pieza de un planeta, o uno de los planetas?", "Júpiter es uno de los planetas."],
    },
    {
      en: ["broom : sweep", "tool-use", "What do you do with a broom?", "A broom is a tool, and sweeping is what it is used for."],
      es: ["escoba : barrer", "tool-use", "¿Qué haces con una escoba?", "La escoba es una herramienta, y sirve para barrer."],
    },
    {
      en: ["huge : enormous", "synonyms", "Do the two words mean about the same thing, or opposite things?", "“Huge” and “enormous” mean about the same thing."],
      es: ["enorme : gigantesco", "synonyms", "¿Las dos palabras significan casi lo mismo, o lo contrario?", "“Enorme” y “gigantesco” significan casi lo mismo."],
    },
    {
      en: ["shallow : deep", "antonyms", "Do the two words mean about the same thing, or opposite things?", "“Shallow” and “deep” mean opposite things."],
      es: ["cerca : lejos", "antonyms", "¿Las dos palabras significan casi lo mismo, o lo contrario?", "“Cerca” y “lejos” significan lo contrario."],
    },
  ],
);

const ANALOGY: Bi<Entry>[] = [
  {
    en: ["Thermometer is to temperature as scale is to ___.", "weight", [["kitchen", "associated-word"], ["heavy", "wrong-relationship"]], "A thermometer measures temperature. What does a scale measure?", "Both pairs are a tool and what it measures."],
    es: ["Termómetro es a temperatura como balanza es a ___.", "peso", [["cocina", "associated-word"], ["pesado", "wrong-relationship"]], "El termómetro mide la temperatura. ¿Qué mide la balanza?", "Los dos pares son un instrumento y lo que mide."],
  },
  {
    en: ["Finger is to hand as toe is to ___.", "foot", [["shoe", "associated-word"], ["nail", "reversed-order"]], "A finger is one part of a hand. A toe is one part of what?", "Both pairs are a part and the whole it belongs to."],
    es: ["Pétalo es a flor como rama es a ___.", "árbol", [["bosque", "associated-word"], ["hoja", "reversed-order"]], "Un pétalo es una parte de la flor. ¿De qué es parte una rama?", "Los dos pares son una parte y el todo al que pertenece."],
  },
  {
    en: ["Hot is to cold as tall is to ___.", "short", [["high", "wrong-relationship"], ["giraffe", "associated-word"]], "Hot and cold are opposites. What is the opposite of tall?", "Both pairs are opposites."],
    es: ["Caliente es a frío como alto es a ___.", "bajo", [["elevado", "wrong-relationship"], ["jirafa", "associated-word"]], "Caliente y frío son opuestos. ¿Cuál es el opuesto de alto?", "Los dos pares son opuestos."],
  },
  {
    en: ["Author is to book as composer is to ___.", "symphony", [["piano", "associated-word"], ["conductor", "wrong-relationship"]], "An author creates a book. What does a composer create?", "Both pairs are a creator and what that person makes."],
    es: ["Autor es a libro como compositor es a ___.", "sinfonía", [["piano", "associated-word"], ["director", "wrong-relationship"]], "Un autor crea un libro. ¿Qué crea un compositor?", "Los dos pares son quien crea y lo que crea."],
  },
  {
    en: ["Honeybee is to hive as bird is to ___.", "nest", [["feather", "wrong-relationship"], ["sky", "associated-word"]], "Honeybees raise their young in a hive. Where do birds raise their young?", "Both pairs are an animal and the place it raises its young."],
    es: ["Abeja melífera es a colmena como pájaro es a ___.", "nido", [["pluma", "wrong-relationship"], ["cielo", "associated-word"]], "Las abejas melíferas crían en la colmena. ¿Dónde crían los pájaros?", "Los dos pares son un animal y el lugar donde cría."],
  },
  {
    en: ["Caterpillar is to butterfly as tadpole is to ___.", "frog", [["pond", "associated-word"], ["fish", "wrong-relationship"]], "A caterpillar grows up to become a butterfly. What does a tadpole become?", "Both pairs are a young animal and the adult it becomes."],
    es: ["Oruga es a mariposa como renacuajo es a ___.", "rana", [["estanque", "associated-word"], ["pez", "wrong-relationship"]], "La oruga se convierte en mariposa. ¿En qué se convierte el renacuajo?", "Los dos pares son un animal joven y el adulto en que se convierte."],
  },
  {
    en: ["Pen is to write as knife is to ___.", "cut", [["fork", "associated-word"], ["sharp", "wrong-relationship"]], "You use a pen to write. What do you use a knife to do?", "Both pairs are a tool and its use."],
    es: ["Lápiz es a escribir como cuchillo es a ___.", "cortar", [["tenedor", "associated-word"], ["filoso", "wrong-relationship"]], "El lápiz sirve para escribir. ¿Para qué sirve el cuchillo?", "Los dos pares son una herramienta y su uso."],
  },
  {
    en: ["Rain is to flood as spark is to ___.", "fire", [["electricity", "associated-word"], ["match", "wrong-relationship"]], "Rain can cause a flood. What can a spark cause?", "Both pairs are a cause and its effect."],
    es: ["Lluvia es a inundación como chispa es a ___.", "incendio", [["electricidad", "associated-word"], ["fósforo", "wrong-relationship"]], "La lluvia puede provocar una inundación. ¿Qué puede provocar una chispa?", "Los dos pares son una causa y su efecto."],
  },
  {
    en: ["Puppy is to dog as kitten is to ___.", "cat", [["yarn", "associated-word"], ["litter", "wrong-relationship"]], "A puppy is a young dog. A kitten is a young what?", "Both pairs are a young animal and the adult."],
    es: ["Cachorro es a perro como gatito es a ___.", "gato", [["ovillo", "associated-word"], ["camada", "wrong-relationship"]], "Un cachorro es un perro joven. ¿Un gatito es un qué joven?", "Los dos pares son un animal joven y el adulto."],
  },
  {
    en: ["Generous is to stingy as brave is to ___.", "cowardly", [["bold", "wrong-relationship"], ["hero", "associated-word"]], "Generous and stingy are opposites. What is the opposite of brave?", "Both pairs are opposites."],
    es: ["Generoso es a tacaño como valiente es a ___.", "cobarde", [["audaz", "wrong-relationship"], ["héroe", "associated-word"]], "Generoso y tacaño son opuestos. ¿Cuál es el opuesto de valiente?", "Los dos pares son opuestos."],
  },
  {
    en: ["Teacher is to classroom as chef is to ___.", "kitchen", [["recipe", "associated-word"], ["waiter", "wrong-relationship"]], "A teacher works in a classroom. Where does a chef work?", "Both pairs are a worker and a workplace."],
    es: ["Maestro es a salón como cocinero es a ___.", "cocina", [["receta", "associated-word"], ["mesero", "wrong-relationship"]], "El maestro trabaja en el salón. ¿Dónde trabaja el cocinero?", "Los dos pares son quien trabaja y su lugar de trabajo."],
  },
  {
    en: ["Page is to book as key is to ___.", "keyboard", [["lock", "wrong-relationship"], ["open", "associated-word"]], "A page is one part of a book. A key is one part of what?", "Both pairs are a part and the whole it belongs to. A key on a keyboard is part of it; a lock key is not part of the lock."],
    es: ["Página es a libro como tecla es a ___.", "teclado", [["escribir", "associated-word"], ["dedo", "wrong-relationship"]], "Una página es una parte del libro. ¿De qué es parte una tecla?", "Los dos pares son una parte y el todo al que pertenece."],
  },
  {
    en: ["Brush is to painter as hammer is to ___.", "carpenter", [["nail", "wrong-relationship"], ["toolbox", "associated-word"]], "A painter uses a brush. Who uses a hammer?", "Both pairs are a tool and the worker who uses it."],
    es: ["Pincel es a pintor como martillo es a ___.", "carpintero", [["clavo", "wrong-relationship"], ["caja de herramientas", "associated-word"]], "El pintor usa el pincel. ¿Quién usa el martillo?", "Los dos pares son una herramienta y quien la usa."],
  },
  {
    en: ["Fish is to school as wolf is to ___.", "pack", [["forest", "associated-word"], ["howl", "wrong-relationship"]], "A group of fish is called a school. What is a group of wolves called?", "Both pairs are an animal and the name for its group."],
    es: ["Pez es a cardumen como lobo es a ___.", "manada", [["bosque", "associated-word"], ["aullido", "wrong-relationship"]], "Un grupo de peces se llama cardumen. ¿Cómo se llama un grupo de lobos?", "Los dos pares son un animal y el nombre de su grupo."],
  },
  {
    en: ["Sun is to day as moon is to ___.", "night", [["star", "associated-word"], ["crater", "wrong-relationship"]], "The sun lights up the day. What does the moon light up?", "Both pairs are a light in the sky and the time it lights up."],
    es: ["Sol es a día como luna es a ___.", "noche", [["estrella", "associated-word"], ["cráter", "wrong-relationship"]], "El sol ilumina el día. ¿Qué ilumina la luna?", "Los dos pares son una luz del cielo y el momento que ilumina."],
  },
];

const ANALOGIES = skill(
  { id: "e.word.relationships", grade: "7", title: { en: "Word relationships and analogies", es: "Relaciones entre palabras y analogías" }, standard: "L.7.5b", prereqs: ["e.synonyms"] },
  [
    {
      ...RELATION_PAIRS,
      ask: { en: "How are these two words related?", es: "¿Qué relación hay entre estas dos palabras?" },
      hints: {
        en: ["Make a short sentence that links the two words.", "Is one a part of the other, a kind of the other, the cause of the other, or a tool for the other? Or do they mean the same or opposite things?"],
        es: ["Haz una oración corta que una las dos palabras.", "¿Una es parte de la otra, un tipo de la otra, la causa de la otra o una herramienta para la otra? ¿O significan lo mismo o lo contrario?"],
      },
      seconds: 12,
    },
    {
      bank: ANALOGY,
      ask: { en: "Choose the word that completes the analogy.", es: "Elige la palabra que completa la analogía." },
      hints: {
        en: ["Make a sentence that says how the first two words are related.", "Use the same sentence with the third word, then test each choice in it. Keep the words in the same order."],
        es: ["Haz una oración que diga qué relación hay entre las dos primeras palabras.", "Usa la misma oración con la tercera palabra y prueba cada opción. Mantén el mismo orden."],
      },
      seconds: 20,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.formal.style — choose the sentence that fits formal writing. Spanish adds the register of "usted"
// and of colloquial words. Tags: slang, text-abbreviation, casual-address.

const FORMAL: Bi<Entry>[] = [
  {
    en: ["A sentence for a science report about plants:", "The plants that received more sunlight grew taller.", [["The plants that got more sun totally shot up.", "slang"], ["Plants w/ more sun grew taller lol.", "text-abbreviation"], ["You won't believe how tall the sunny plants got.", "casual-address"]], "“Lol” and “w/” are texting shortcuts; they do not belong in a report.", "A report states results in complete, exact words."],
    es: ["Una oración para un informe de ciencias sobre plantas:", "Las plantas que recibieron más luz solar crecieron más.", [["Las plantas que tenían más sol crecieron un montón.", "slang"], ["Las plantas c/ más sol crecieron + q las otras.", "text-abbreviation"], ["No vas a creer cuánto crecieron las plantas con sol.", "casual-address"]], "“c/” y “q” son abreviaturas de chat; no van en un informe.", "Un informe da los resultados con palabras completas y precisas."],
  },
  {
    en: ["A sentence for a letter to the city council:", "We request that the city repair the broken streetlight on Oak Avenue.", [["Can y'all fix that busted light on Oak?", "slang"], ["Pls fix the light on Oak Ave ASAP.", "text-abbreviation"], ["Hey guys, you really need to fix the light on Oak Avenue.", "casual-address"]], "“Hey guys” talks to the council like friends.", "A letter to officials makes a polite, complete request."],
    es: ["Una oración para una carta al concejo municipal:", "Solicitamos que se repare la lámpara descompuesta de la avenida Roble.", [["¿Pueden arreglar ya esa lámpara toda fea de la avenida?", "slang"], ["Xfa arreglen la lámpara de la av. Roble.", "text-abbreviation"], ["Oigan, tienen que arreglar la lámpara de la avenida Roble.", "casual-address"]], "“Oigan” les habla a las autoridades como a amigos.", "Una carta a las autoridades hace una petición cortés y completa."],
  },
  {
    en: ["A sentence for an essay about recycling:", "Recycling reduces the amount of waste sent to landfills.", [["Recycling is super awesome and cuts down on junk.", "slang"], ["Recycling = less trash in landfills.", "text-abbreviation"], ["Trust me, you'd be amazed how much recycling helps.", "casual-address"]], "“Super awesome” is slang.", "An essay states its point in exact words."],
    es: ["Una oración para un ensayo sobre el reciclaje:", "El reciclaje reduce la cantidad de basura que llega a los rellenos sanitarios.", [["Reciclar está buenísimo y así hay menos basura.", "slang"], ["Reciclar = menos basura en los basureros.", "text-abbreviation"], ["Créeme, reciclar ayuda muchísimo.", "casual-address"]], "“Está buenísimo” es lenguaje coloquial.", "Un ensayo dice su idea con palabras precisas."],
  },
  {
    en: ["A sentence for a book report:", "The main character learns to trust her friends by the end of the novel.", [["The main character is kinda cool and finally chills with her friends.", "slang"], ["The main character learns 2 trust her friends.", "text-abbreviation"], ["You're gonna love how the main character changes.", "casual-address"]], "“Kinda” and “chills” are slang.", "A book report describes the story in clear, complete words."],
    es: ["Una oración para un reporte de lectura:", "La protagonista aprende a confiar en sus amigos al final de la novela.", [["La protagonista es bien chévere y al final se lleva bien con sus amigos.", "slang"], ["La protagonista aprende a confiar en sus amigos xq la ayudan.", "text-abbreviation"], ["Te va a encantar cómo cambia la protagonista.", "casual-address"]], "“Bien chévere” es lenguaje coloquial.", "Un reporte de lectura describe la historia con palabras claras y completas."],
  },
  {
    en: ["A sentence for an email to a teacher:", "Could you please explain the directions for question five?", [["What's the deal with question five?", "slang"], ["Can u explain #5?", "text-abbreviation"], ["Yo, help me out with question five.", "casual-address"]], "“Yo” talks to a teacher like a friend.", "A message to a teacher asks politely, in complete words."],
    es: ["Una oración para un correo a la maestra:", "¿Podría explicarme, por favor, las instrucciones de la pregunta cinco?", [["¿Qué onda con la pregunta cinco?", "slang"], ["¿Me explica la 5 xfa?", "text-abbreviation"], ["Oye, ¿me explicas la pregunta cinco?", "casual-address"]], "“Oye” y el tuteo le hablan a la maestra como a una amiga.", "A la maestra se le escribe con cortesía, de usted y con palabras completas."],
  },
  {
    en: ["A sentence for a history essay:", "The colonists protested the new taxes because they had no vote in Parliament.", [["The colonists were super mad about the taxes.", "slang"], ["Colonists were mad b/c of taxes.", "text-abbreviation"], ["Can you blame the colonists for being upset about taxes?", "casual-address"]], "“Super mad” is slang.", "A history essay explains causes in exact words."],
    es: ["Una oración para un ensayo de historia:", "Los colonos protestaron contra los nuevos impuestos porque no tenían voto en el Parlamento.", [["Los colonos estaban súper enojados por los impuestos.", "slang"], ["Los colonos protestaron xq no tenían voto.", "text-abbreviation"], ["¿Tú no te habrías enojado con esos impuestos?", "casual-address"]], "“Súper enojados” es lenguaje coloquial.", "Un ensayo de historia explica las causas con palabras precisas."],
  },
  {
    en: ["A sentence for a lab conclusion:", "The results support the hypothesis that salt water freezes at a lower temperature.", [["Turns out salt water freezes way colder, no joke.", "slang"], ["Salt water freezes @ a lower temp.", "text-abbreviation"], ["Guess what? You need more cold to freeze salt water.", "casual-address"]], "“@” and “temp” are shortcuts.", "A lab conclusion connects the results to the hypothesis in exact words."],
    es: ["Una oración para la conclusión de un experimento:", "Los resultados apoyan la hipótesis de que el agua salada se congela a menor temperatura.", [["Resulta que el agua salada tarda un montonal en congelarse.", "slang"], ["El agua salada se congela a menor temp.", "text-abbreviation"], ["¿Sabías que el agua salada necesita más frío para congelarse?", "casual-address"]], "“Temp.” es una abreviatura informal.", "Una conclusión conecta los resultados con la hipótesis con palabras precisas."],
  },
  {
    en: ["A sentence for a speech at a school board meeting:", "Our students would benefit from a longer lunch period.", [["Lunch is way too short, and it's a total drag.", "slang"], ["Longer lunch = happier kids.", "text-abbreviation"], ["Come on, you all know lunch is too short.", "casual-address"]], "“Come on, you all know” talks to the board like friends.", "A speech to a board makes the point respectfully."],
    es: ["Una oración para un discurso ante la junta escolar:", "Nuestros estudiantes se beneficiarían de un recreo más largo.", [["El recreo está bien cortito, es un rollo.", "slang"], ["Recreo + largo = niños + felices.", "text-abbreviation"], ["Ándale, tú sabes que el recreo es muy corto.", "casual-address"]], "“Ándale, tú sabes” le habla a la junta como a un amigo.", "Un discurso ante la junta presenta la idea con respeto."],
  },
  {
    en: ["A sentence for a museum label:", "This pottery was made by hand more than 500 years ago.", [["This pottery is crazy old, like 500 years.", "slang"], ["Pottery made by hand 500+ yrs ago.", "text-abbreviation"], ["Check out this pottery, you guys.", "casual-address"]], "“Crazy old” is slang.", "A museum label gives facts in complete words."],
    es: ["Una oración para la ficha de un museo:", "Esta vasija fue hecha a mano hace más de 500 años.", [["Esta vasija es viejísima, tipo de hace 500 años.", "slang"], ["Vasija hecha a mano hace +500 años.", "text-abbreviation"], ["Mira nada más esta vasija tan antigua.", "casual-address"]], "“Tipo de hace 500 años” es lenguaje coloquial.", "La ficha de un museo da datos con palabras completas."],
  },
  {
    en: ["A sentence for a thank-you letter to a guest speaker:", "Thank you for taking the time to speak to our class about your work.", [["Thanks a ton for the cool talk.", "slang"], ["Thx for the talk, ttyl.", "text-abbreviation"], ["Hey there, hope you had fun hanging out with us.", "casual-address"]], "“Thx” and “ttyl” are texting shortcuts.", "A thank-you letter to a guest is polite and complete."],
    es: ["Una oración para una carta de agradecimiento a una invitada:", "Le agradecemos que haya dedicado su tiempo a hablar con nuestra clase.", [["Mil gracias por la plática tan padre.", "slang"], ["Grax x la plática, saludos.", "text-abbreviation"], ["Gracias, te luciste con tu plática.", "casual-address"]], "“Grax” y “x” son abreviaturas de chat.", "A una invitada se le agradece de usted y con palabras completas."],
  },
  {
    en: ["A sentence for a research paper on sleep:", "Teenagers need between eight and ten hours of sleep each night.", [["Teens need tons of sleep, for real.", "slang"], ["Teens need 8-10 hrs of sleep.", "text-abbreviation"], ["You probably don't get enough sleep, right?", "casual-address"]], "“For real” is slang.", "A research paper states facts in exact words."],
    es: ["Una oración para un trabajo de investigación sobre el sueño:", "Los adolescentes necesitan entre ocho y diez horas de sueño cada noche.", [["Los adolescentes necesitan dormir un montón, en serio.", "slang"], ["Los adolescentes necesitan 8-10 hrs de sueño.", "text-abbreviation"], ["¿A poco tú duermes lo suficiente?", "casual-address"]], "“Un montón, en serio” es lenguaje coloquial.", "Un trabajo de investigación da datos con palabras precisas."],
  },
  {
    en: ["A sentence for a news article in the school paper:", "The robotics team placed second at the regional competition on Saturday.", [["The robotics team totally crushed it and got second.", "slang"], ["Robotics team got 2nd @ regionals Sat.", "text-abbreviation"], ["You'll never guess how the robotics team did.", "casual-address"]], "“Totally crushed it” is slang.", "A news article reports what happened in exact words."],
    es: ["Una oración para una noticia del periódico escolar:", "El equipo de robótica obtuvo el segundo lugar en la competencia regional del sábado.", [["El equipo de robótica la rompió y quedó en segundo.", "slang"], ["Robótica: 2.º lugar en la regional, sáb.", "text-abbreviation"], ["No vas a adivinar cómo le fue al equipo de robótica.", "casual-address"]], "“La rompió” es lenguaje coloquial.", "Una noticia informa lo que pasó con palabras precisas."],
  },
  {
    en: ["A sentence for a cover letter for a summer job at the library:", "I am interested in the summer position because I enjoy helping people find books.", [["I'm all about books, so this job is perfect for me.", "slang"], ["I want the job bc I like books.", "text-abbreviation"], ["You should totally hire me.", "casual-address"]], "“Bc” is a texting shortcut.", "A cover letter explains your interest politely and completely."],
    es: ["Una oración para una solicitud de empleo de verano en la biblioteca:", "Me interesa el puesto de verano porque disfruto ayudar a las personas a encontrar libros.", [["Me late un montón ese trabajo porque los libros están chidos.", "slang"], ["Quiero el trabajo xq me gustan los libros.", "text-abbreviation"], ["Deberías contratarme, de veras.", "casual-address"]], "“Xq” es una abreviatura de chat.", "Una solicitud explica tu interés con cortesía y palabras completas."],
  },
  {
    en: ["A sentence for a lab safety handout:", "Students must wear safety goggles while heating liquids.", [["Wear goggles or you'll be sorry, dude.", "slang"], ["Goggles = required w/ hot liquids.", "text-abbreviation"], ["You guys better put on goggles.", "casual-address"]], "“Dude” is slang.", "A safety rule is stated clearly and completely."],
    es: ["Una oración para una hoja de seguridad del laboratorio:", "Los estudiantes deben usar gafas de seguridad al calentar líquidos.", [["Pónganse los lentes o se van a arrepentir, chavos.", "slang"], ["Gafas = obligatorias c/ líquidos calientes.", "text-abbreviation"], ["Oye, ponte los lentes, ¿va?", "casual-address"]], "“Chavos” es lenguaje coloquial.", "Una regla de seguridad se dice con claridad y palabras completas."],
  },
];

const FORMAL_STYLE = skill(
  { id: "e.formal.style", grade: "7", title: { en: "Formal and informal style", es: "Registro formal e informal" }, standard: "W.7.1d", prereqs: ["e.claim.evidence"] },
  [
    {
      bank: FORMAL,
      ask: { en: "Which sentence fits this formal writing best?", es: "¿Qué oración queda mejor en este texto formal?" },
      hints: {
        en: ["Who will read this, and how should the writer sound to them?", "Formal writing uses complete sentences and exact words. Rule out slang, texting shortcuts, and chatty lines that talk to the reader like a friend."],
        es: ["¿Quién va a leer esto y cómo debe sonar quien escribe?", "El registro formal usa oraciones completas y palabras precisas, y trata de usted cuando hace falta. Descarta los coloquialismos, las abreviaturas de chat y el tuteo con desconocidos."],
      },
      seconds: 25,
    },
  ],
);

export { WORDINESS, ANALOGIES, FORMAL_STYLE };
