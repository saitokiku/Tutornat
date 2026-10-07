import { cats, skill, type Bi, type Entry } from "./shared";

// Grade 8: verbal irony and puns; allusions.

// ---------------------------------------------------------------------------------------------------
// e.irony.puns — level 1: verbal irony, pun, hyperbole or literal; level 2: what the line really means.
// The Spanish puns are Spanish word play (nada / nadar, “techo de menos”, “plata no es”, sin cero /
// sincero), not translated English jokes.

type Figure = "irony" | "pun" | "hyperbole" | "literal";
const FIGURES: readonly Figure[] = ["irony", "pun", "hyperbole", "literal"];
const FIGURE_KIND = cats<Figure>(
  {
    en: { irony: "Verbal irony", pun: "Pun", hyperbole: "Hyperbole", literal: "Literal statement" },
    es: { irony: "Ironía", pun: "Juego de palabras", hyperbole: "Hipérbole", literal: "Lenguaje literal" },
  },
  { en: FIGURES, es: FIGURES },
  [
    {
      en: ["After three hours stuck in traffic, Dad sighed, “Well, this is fun.”", "irony", "Is being stuck in traffic for three hours really fun?", "Dad says the opposite of what he means: verbal irony."],
      es: ["Después de tres horas atrapados en el tráfico, papá suspiró: “Qué divertido”.", "irony", "¿De verdad es divertido pasar tres horas en el tráfico?", "Papá dice lo contrario de lo que piensa: es ironía."],
    },
    {
      en: ["The math book looked sad because it had too many problems.", "pun", "“Problems” has two meanings here.", "“Problems” means both math exercises and troubles: a pun."],
      es: ["¿Por qué está triste el libro de matemáticas? Porque tiene muchos problemas.", "pun", "“Problemas” tiene dos sentidos aquí.", "“Problemas” son ejercicios de matemáticas y también dificultades: es un juego de palabras."],
    },
    {
      en: ["This suitcase weighs a thousand pounds.", "hyperbole", "Could a suitcase really weigh that much?", "It exaggerates far past the truth: hyperbole."],
      es: ["Esta maleta pesa mil kilos.", "hyperbole", "¿Una maleta puede pesar eso de verdad?", "Exagera muchísimo: es una hipérbole."],
    },
    {
      en: ["The library closes at six on Fridays.", "literal", "Does it mean exactly what it says?", "It means just what it says: a literal statement."],
      es: ["La biblioteca cierra a las seis los viernes.", "literal", "¿Dice exactamente lo que significa?", "Dice justo lo que significa: es lenguaje literal."],
    },
    {
      en: ["Looking at the muddy dog on the white couch, Mom said, “Perfect. Just perfect.”", "irony", "Is a muddy dog on a white couch really perfect?", "Mom says the opposite of what she means: verbal irony."],
      es: ["Al ver al perro lleno de lodo sobre el sofá blanco, mamá dijo: “Perfecto, qué maravilla”.", "irony", "¿De verdad es una maravilla un perro con lodo sobre un sofá blanco?", "Mamá dice lo contrario de lo que piensa: es ironía."],
    },
    {
      en: ["I used to be a baker, but I couldn't make enough dough.", "pun", "“Dough” can mean bread dough or, in slang, money.", "“Dough” has two meanings here: a pun."],
      es: ["¿Qué le dijo un pez a otro? Nada.", "pun", "“Nada” puede ser del verbo nadar o significar “ninguna cosa”.", "“Nada” tiene dos sentidos: es un juego de palabras."],
    },
    {
      en: ["I'm so hungry I could eat a horse.", "hyperbole", "Could anyone really eat a whole horse?", "It exaggerates far past the truth: hyperbole."],
      es: ["Tengo tanta hambre que me comería un elefante.", "hyperbole", "¿Alguien podría comerse un elefante?", "Exagera muchísimo: es una hipérbole."],
    },
    {
      en: ["Our soccer practice starts at four.", "literal", "Does it mean exactly what it says?", "It means just what it says: a literal statement."],
      es: ["El entrenamiento de fútbol empieza a las cuatro.", "literal", "¿Dice exactamente lo que significa?", "Dice justo lo que significa: es lenguaje literal."],
    },
    {
      en: ["When Leo dropped all his books in the hallway, his friend said, “Smooth move.”", "irony", "Was dropping the books really smooth?", "His friend says the opposite of what happened: verbal irony."],
      es: ["Cuando Leo dejó caer todos sus libros en el pasillo, su amigo le dijo: “Qué elegante”.", "irony", "¿De verdad fue elegante dejar caer los libros?", "Su amigo dice lo contrario de lo que pasó: es ironía."],
    },
    {
      en: ["The astronaut took a break because she needed some space.", "pun", "“Space” has two meanings here.", "“Space” means both outer space and time alone: a pun."],
      es: ["¿Cuál es el colmo de un astronauta? Quedarse sin espacio.", "pun", "“Espacio” tiene dos sentidos aquí.", "“Espacio” es el espacio exterior y también el lugar disponible: es un juego de palabras."],
    },
    {
      en: ["My little brother takes forever to get dressed.", "hyperbole", "Does it really take him forever?", "It exaggerates far past the truth: hyperbole."],
      es: ["Mi hermanito tarda una eternidad en vestirse.", "hyperbole", "¿De verdad tarda una eternidad?", "Exagera muchísimo: es una hipérbole."],
    },
    {
      en: ["The bus was late this morning.", "literal", "Does it mean exactly what it says?", "It means just what it says: a literal statement."],
      es: ["El autobús llegó tarde esta mañana.", "literal", "¿Dice exactamente lo que significa?", "Dice justo lo que significa: es lenguaje literal."],
    },
    {
      en: ["During the thunderstorm, Ana looked outside and said, “Lovely beach weather.”", "irony", "Is a thunderstorm good beach weather?", "Ana says the opposite of what she means: verbal irony."],
      es: ["Durante la tormenta, Ana miró por la ventana y dijo: “Qué buen día para ir a la playa”.", "irony", "¿Una tormenta es un buen día de playa?", "Ana dice lo contrario de lo que piensa: es ironía."],
    },
    {
      en: ["The bicycle couldn't stand up by itself because it was two-tired.", "pun", "Say “two-tired” out loud. What other words does it sound like?", "“Two-tired” sounds like “too tired,” and a bicycle has two tires: a pun."],
      es: ["Oro parece, plata no es. ¿Qué es? El plátano.", "pun", "Lee “plata no es” en voz alta, todo junto.", "“Plata no es” suena como “plátano”: es un juego de palabras."],
    },
    {
      en: ["The line for the roller coaster was a mile long.", "hyperbole", "Was the line really a mile long?", "It exaggerates far past the truth: hyperbole."],
      es: ["La fila para la montaña rusa medía un kilómetro.", "hyperbole", "¿De verdad medía un kilómetro?", "Exagera muchísimo: es una hipérbole."],
    },
    {
      en: ["The recipe needs two cups of rice.", "literal", "Does it mean exactly what it says?", "It means just what it says: a literal statement."],
      es: ["La receta lleva dos tazas de arroz.", "literal", "¿Dice exactamente lo que significa?", "Dice justo lo que significa: es lenguaje literal."],
    },
  ],
);

const FIGURE_MEANING: Bi<Entry>[] = [
  {
    en: ["After her team lost 10 to 0, Zoe said, “Well, that went great.”", "The game went badly, and Zoe is joking about it", [["Zoe thinks the game went well", "took-literally"], ["Zoe is angry at the other team", "unsupported-reading"]], "Compare the score with what Zoe says.", "Zoe says the opposite of what happened: verbal irony."],
    es: ["Después de perder 10 a 0, Zoe dijo: “Bueno, eso salió de maravilla”.", "El partido salió muy mal y Zoe bromea sobre eso", [["Zoe cree que el partido salió bien", "took-literally"], ["Zoe está enojada con el otro equipo", "unsupported-reading"]], "Compara el marcador con lo que dice Zoe.", "Zoe dice lo contrario de lo que pasó: es ironía."],
  },
  {
    en: ["Seeing the overflowing trash can, Omar said, “Wow, somebody really loves taking out the trash.”", "Nobody has taken out the trash, and Omar is pointing that out", [["Someone in the house loves taking out the trash", "took-literally"], ["Omar wants a bigger trash can", "unsupported-reading"]], "Compare the full trash can with what Omar says.", "Omar says the opposite of what is true: verbal irony."],
    es: ["Al ver el bote de basura desbordado, Omar dijo: “Vaya, a alguien le encanta sacar la basura”.", "Nadie ha sacado la basura, y Omar lo señala", [["A alguien de la casa le encanta sacar la basura", "took-literally"], ["Omar quiere un bote más grande", "unsupported-reading"]], "Compara el bote lleno con lo que dice Omar.", "Omar dice lo contrario de lo que pasa: es ironía."],
  },
  {
    en: ["“I'm reading a book about anti-gravity. It's impossible to put down.”", "It plays on “put down”: to stop reading, and to set something down", [["The book is too heavy to lift", "took-literally"], ["The book is about putting things away", "missed-double-meaning"]], "What would anti-gravity do to a book you tried to set down?", "“Impossible to put down” means very exciting, and with anti-gravity it also floats: a pun."],
    es: ["—¿Qué le dijo un techo a otro? —Techo de menos.", "Juega con “techo de menos”, que suena como “te echo de menos”: te extraño", [["Un techo es más pequeño que el otro", "took-literally"], ["Los techos están peleados", "missed-double-meaning"]], "Lee “techo de menos” en voz alta. ¿Qué frase conocida suena igual?", "“Techo de menos” suena como “te echo de menos”: es un juego de palabras."],
  },
  {
    en: ["After the cat knocked over the plant for the third time, Mia said, “What a helpful cat.”", "The cat is causing trouble, and Mia is annoyed", [["Mia thinks the cat is helping", "took-literally"], ["Mia wants to buy a new plant", "unsupported-reading"]], "Is knocking over a plant helpful?", "Mia says the opposite of what she means: verbal irony."],
    es: ["Después de que el gato tiró la planta por tercera vez, Mía dijo: “Qué gato tan servicial”.", "El gato causa problemas y Mía está molesta", [["Mía cree que el gato la ayuda", "took-literally"], ["Mía quiere comprar otra planta", "unsupported-reading"]], "¿Tirar una planta es ser servicial?", "Mía dice lo contrario de lo que piensa: es ironía."],
  },
  {
    en: ["“Why did the scarecrow win an award? Because he was outstanding in his field.”", "It plays on “outstanding in his field”: excellent at his job, and standing out in a farm field", [["The scarecrow was the best farmer in town", "took-literally"], ["The scarecrow won a sports award", "missed-double-meaning"]], "Where does a scarecrow stand?", "“Outstanding in his field” has two meanings: a pun."],
    es: ["¿Cuál es el colmo de un jardinero? Que su novia se llame Rosa y lo deje plantado.", "Juega con “dejar plantado”: no llegar a una cita, y sembrar una planta", [["La novia del jardinero siembra rosas", "took-literally"], ["El jardinero no tiene novia", "missed-double-meaning"]], "¿Qué significa “dejar plantado” a alguien? ¿Y qué hace un jardinero con las plantas?", "“Plantado” tiene dos sentidos, y “Rosa” es un nombre y una flor: es un juego de palabras."],
  },
  {
    en: ["Walking into the freezing classroom, Dev said, “Nice and toasty in here.”", "The room is very cold", [["The room is warm and comfortable", "took-literally"], ["Dev wants to make toast", "unsupported-reading"]], "Compare the freezing room with what Dev says.", "Dev says the opposite of what is true: verbal irony."],
    es: ["Al entrar al salón helado, Dev dijo: “Qué calorcito tan rico hay aquí”.", "El salón está muy frío", [["El salón está cálido y cómodo", "took-literally"], ["Dev tiene ganas de comer", "unsupported-reading"]], "Compara el salón helado con lo que dice Dev.", "Dev dice lo contrario de lo que pasa: es ironía."],
  },
  {
    en: ["“I stayed up all night wondering where the sun went. Then it dawned on me.”", "It plays on “dawned”: the sun came up, and the speaker finally understood", [["The speaker watched the sunrise and went to sleep", "took-literally"], ["The speaker forgot about the sun", "missed-double-meaning"]], "What does it mean when an idea “dawns on” you? What happens at dawn?", "“Dawned on me” has two meanings: a pun."],
    es: ["¿Qué le dice una iguana a su hermana gemela? Iguanita.", "Juega con “iguanita”, que suena como “igualita”: son idénticas", [["La iguana es muy pequeña", "took-literally"], ["Las iguanas no son hermanas", "missed-double-meaning"]], "Lee “iguanita” en voz alta. ¿Qué palabra suena casi igual?", "“Iguanita” suena como “igualita”: es un juego de palabras."],
  },
  {
    en: ["When his little sister colored on the wall, Sam said, “Great, a new mural for the hallway.”", "Sam is upset that she drew on the wall", [["Sam is happy about the new art", "took-literally"], ["Sam wants to paint the hallway", "unsupported-reading"]], "Is coloring on the wall really great?", "Sam says the opposite of what he means: verbal irony."],
    es: ["Cuando su hermanita pintó la pared, Sam dijo: “Genial, un mural nuevo para el pasillo”.", "Sam está molesto porque ella pintó la pared", [["Sam está feliz con el arte nuevo", "took-literally"], ["Sam quiere pintar el pasillo", "unsupported-reading"]], "¿De verdad es genial que pinten la pared?", "Sam dice lo contrario de lo que piensa: es ironía."],
  },
  {
    en: ["“I'm on a seafood diet. I see food, and I eat it.”", "It plays on “seafood” and “see food”: the speaker eats everything they see", [["The speaker eats only fish", "took-literally"], ["The speaker is trying to eat less", "missed-double-meaning"]], "Say “seafood” and “see food” out loud.", "“Seafood” sounds like “see food”: a pun."],
    es: ["¿Qué le dijo el número 1 al 10? Para ser como yo, tienes que ser sincero.", "Juega con “sincero”, que suena como “sin cero”: al 10 le sobra el cero", [["El 1 es más honesto que el 10", "took-literally"], ["Los números no se llevan bien", "missed-double-meaning"]], "¿Qué le pasa al 10 si le quitas el cero?", "“Sincero” suena como “sin cero”: es un juego de palabras."],
  },
  {
    en: ["After waiting an hour for a table, Grandpa said, “Speedy service here.”", "The service is very slow", [["The service is fast", "took-literally"], ["Grandpa wants to leave a big tip", "unsupported-reading"]], "Is an hour's wait speedy?", "Grandpa says the opposite of what is true: verbal irony."],
    es: ["Después de esperar una hora por una mesa, el abuelo dijo: “Qué servicio tan rápido”.", "El servicio es muy lento", [["El servicio es rápido", "took-literally"], ["El abuelo quiere dejar mucha propina", "unsupported-reading"]], "¿Una hora de espera es rápida?", "El abuelo dice lo contrario de lo que pasa: es ironía."],
  },
  {
    en: ["“Why are frogs so happy? They eat whatever bugs them.”", "It plays on two meanings of “bugs”: insects, and things that annoy you", [["Frogs are happy because they eat insects", "took-literally"], ["Frogs are annoyed by their food", "missed-double-meaning"]], "What can “bug” mean besides an insect?", "“Bugs them” has two meanings: a pun."],
    es: ["¿Qué le dijo una pared a otra? Nos vemos en la esquina.", "Juega con “nos vemos en la esquina”: las paredes se juntan en la esquina, y es una forma de despedirse", [["Las paredes van a caminar a la esquina", "took-literally"], ["Las paredes no se quieren ver", "missed-double-meaning"]], "¿Dónde se juntan dos paredes? ¿Y cuándo dice alguien “nos vemos en la esquina”?", "La frase tiene dos sentidos: es un juego de palabras."],
  },
  {
    en: ["As rain poured on the picnic, Lina said, “Good thing we planned this for today.”", "Planning the picnic for today was a bad idea", [["Today was the best day for a picnic", "took-literally"], ["Lina loves the rain", "unsupported-reading"]], "Is a rainy day good for a picnic?", "Lina says the opposite of what she means: verbal irony."],
    es: ["Mientras la lluvia caía sobre el picnic, Lina dijo: “Qué buena idea fue planearlo para hoy”.", "Planear el picnic para hoy fue mala idea", [["Hoy era el mejor día para un picnic", "took-literally"], ["A Lina le encanta la lluvia", "unsupported-reading"]], "¿Un día de lluvia es bueno para un picnic?", "Lina dice lo contrario de lo que piensa: es ironía."],
  },
  {
    en: ["“I would tell you a joke about construction, but I'm still working on it.”", "It plays on “working on it”: building something, and still preparing the joke", [["The speaker works in construction", "took-literally"], ["The speaker does not like jokes", "missed-double-meaning"]], "What do construction workers do to a building? What does it mean to work on a joke?", "“Working on it” has two meanings: a pun."],
    es: ["¿Cuál es el colmo de un electricista? Que su esposa se llame Luz y sus hijos le sigan la corriente.", "Juega con “Luz” y “seguir la corriente”, que también son palabras de la electricidad", [["La familia del electricista trabaja con cables", "took-literally"], ["El electricista no tiene luz en casa", "missed-double-meaning"]], "¿Qué significa “seguirle la corriente” a alguien? ¿Y qué es la corriente para un electricista?", "“Luz” y “corriente” tienen dos sentidos: es un juego de palabras."],
  },
  {
    en: ["Holding a test with a big red F, Max said, “My parents will be thrilled.”", "His parents will be upset", [["His parents will be very happy", "took-literally"], ["Max will hide the test forever", "unsupported-reading"]], "How do parents usually feel about a failing grade?", "Max says the opposite of what he expects: verbal irony."],
    es: ["Con un examen reprobado en la mano, Max dijo: “Mis papás van a estar felicísimos”.", "Sus papás se van a enojar", [["Sus papás van a estar muy contentos", "took-literally"], ["Max va a esconder el examen para siempre", "unsupported-reading"]], "¿Cómo suelen sentirse los papás con un examen reprobado?", "Max dice lo contrario de lo que espera: es ironía."],
  },
];

const IRONY_PUNS = skill(
  { id: "e.irony.puns", grade: "8", title: { en: "Verbal irony and puns", es: "Ironía y juegos de palabras" }, standard: "L.8.5a", prereqs: ["e.figurative"] },
  [
    {
      ...FIGURE_KIND,
      ask: { en: "Which kind of language is this?", es: "¿Qué tipo de lenguaje es este?" },
      hints: {
        en: ["Does the speaker mean exactly what the words say?", "Verbal irony says the opposite of what the speaker means. A pun plays on a word with two meanings, or on words that sound alike. Hyperbole exaggerates far past the truth. A literal statement means just what it says."],
        es: ["¿Quien habla quiere decir exactamente lo que dicen las palabras?", "La ironía dice lo contrario de lo que se quiere decir. Un juego de palabras usa una palabra con dos sentidos o palabras que suenan igual. La hipérbole exagera muchísimo. El lenguaje literal dice justo lo que significa."],
      },
      seconds: 15,
    },
    {
      bank: FIGURE_MEANING,
      ask: { en: "What does the line really mean?", es: "¿Qué quiere decir realmente la frase?" },
      hints: {
        en: ["Does the speaker mean exactly what the words say?", "For irony, compare the words with the situation: the meaning is the opposite. For a pun, find the word or phrase with two meanings, or two words that sound alike."],
        es: ["¿Quien habla quiere decir exactamente lo que dicen las palabras?", "En la ironía, compara las palabras con la situación: el sentido es el contrario. En un juego de palabras, busca la palabra con dos sentidos o las palabras que suenan igual."],
      },
      seconds: 25,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.allusions — what a reference to a famous myth, fable, book or person suggests. Spanish adds
// allusions from Spanish-language literature and fables: un Quijote, molinos de viento, el cuento de la
// lechera. Tags: took-literally, wrong-story, opposite-reading.

const ALLUSIONS: Bi<Entry>[] = [
  {
    en: ["Math is Diego's Achilles' heel; he aces every other subject.", "a weak spot in someone who is otherwise strong", [["an injury to his foot", "took-literally"], ["a gift that brings trouble", "wrong-story"]], "In Greek myth, the hero Achilles could be wounded in only one place: his heel.", "An Achilles' heel is the one weakness of someone strong."],
    es: ["Las matemáticas son el talón de Aquiles de Diego; en las demás materias saca dieces.", "un punto débil en alguien que en lo demás es fuerte", [["una lesión en el pie", "took-literally"], ["un regalo que trae problemas", "wrong-story"]], "En el mito griego, al héroe Aquiles solo lo podían herir en un lugar: el talón.", "El talón de Aquiles es la única debilidad de alguien fuerte."],
  },
  {
    en: ["Asking the twins about the broken vase opened Pandora's box.", "it set loose many unexpected problems", [["it opened a box of toys", "took-literally"], ["it revealed one small weakness", "wrong-story"]], "In Greek myth, Pandora opened a container that let troubles out into the world.", "Opening Pandora's box means starting something that causes many problems."],
    es: ["Preguntarles a los gemelos por el florero roto fue abrir la caja de Pandora.", "desató muchos problemas inesperados", [["abrió una caja de juguetes", "took-literally"], ["reveló una pequeña debilidad", "wrong-story"]], "En el mito griego, Pandora abrió un recipiente que soltó los males en el mundo.", "Abrir la caja de Pandora es empezar algo que trae muchos problemas."],
  },
  {
    en: ["Lena has the Midas touch; every business she starts makes money.", "the ability to make everything succeed", [["the ability to fix broken things with her hands", "took-literally"], ["a habit of losing everything she owns", "opposite-reading"]], "In Greek myth, King Midas turned everything he touched into gold.", "Having the Midas touch means making every project profitable."],
    es: ["Lena tiene el toque de Midas: todo negocio que empieza gana dinero.", "la capacidad de hacer que todo salga bien", [["la habilidad de arreglar cosas con las manos", "took-literally"], ["la costumbre de perder todo lo que tiene", "opposite-reading"]], "En el mito griego, el rey Midas convertía en oro todo lo que tocaba.", "Tener el toque de Midas es hacer que todo proyecto dé ganancias."],
  },
  {
    en: ["Moving the whole library across town was a Herculean task.", "a job that takes enormous strength and effort", [["a job done by a famous athlete", "took-literally"], ["a quick, easy chore", "opposite-reading"]], "In Greek and Roman myth, Hercules completed twelve nearly impossible labors.", "A Herculean task is one that takes huge effort."],
    es: ["Mover toda la biblioteca al otro lado del pueblo fue un trabajo de Hércules.", "una tarea que exige muchísima fuerza y esfuerzo", [["un trabajo hecho por un atleta famoso", "took-literally"], ["una tarea rápida y fácil", "opposite-reading"]], "En los mitos griegos y romanos, Hércules completó doce trabajos casi imposibles.", "Un trabajo de Hércules es una tarea enorme."],
  },
  {
    en: ["Their trip home from the tournament became an odyssey of missed flights and lost bags.", "a long journey full of trouble", [["a short, easy trip", "opposite-reading"], ["a contest of strength", "wrong-story"]], "In Homer's Odyssey, Odysseus spends ten years trying to get home.", "An odyssey is a long, eventful journey."],
    es: ["El viaje de regreso del torneo fue una odisea de vuelos perdidos y maletas extraviadas.", "un viaje largo y lleno de problemas", [["un viaje corto y fácil", "opposite-reading"], ["una competencia de fuerza", "wrong-story"]], "En la Odisea de Homero, Odiseo pasa diez años tratando de volver a casa.", "Una odisea es un viaje largo y lleno de contratiempos."],
  },
  {
    en: ["Kai complained of fake stomachaches so often to skip gym that no one believed him when he really got sick. He had cried wolf.", "he raised false alarms so often that no one believed the real one", [["he was afraid of animals", "took-literally"], ["he was too proud to ask for help", "wrong-story"]], "In Aesop's fable, a shepherd boy shouts that a wolf is coming as a joke, until no one believes him.", "Crying wolf means giving false alarms until no one listens."],
    es: ["Don Fermín es un Quijote: siempre lucha por causas que todos creen imposibles.", "una persona idealista que defiende causas nobles aunque parezcan imposibles", [["un caballero que viaja a caballo", "took-literally"], ["una persona tacaña", "wrong-story"]], "En la novela de Cervantes, don Quijote sale a luchar por la justicia contra enemigos que solo existen en su imaginación.", "Ser un Quijote es ser idealista hasta parecer soñador."],
  },
  {
    en: ["“Those grapes were sour anyway,” Ben said after he did not make the team.", "pretending not to want something he could not get", [["he did not like the snack", "took-literally"], ["he was being honest about the team", "opposite-reading"]], "In Aesop's fable, a fox who cannot reach some grapes decides they must be sour.", "“Sour grapes” means pretending you never wanted what you could not have."],
    es: ["Tratar de que mi hermanito coma brócoli es luchar contra molinos de viento.", "es intentar algo imposible", [["es trabajar en una granja", "took-literally"], ["es una tarea fácil", "opposite-reading"]], "En la novela de Cervantes, don Quijote ataca unos molinos de viento creyendo que son gigantes.", "Luchar contra molinos de viento es pelear contra algo imposible de vencer."],
  },
  {
    en: ["The new student was a real Good Samaritan, helping everyone find their classes.", "a person who helps strangers in need", [["a student from a town called Samaria", "took-literally"], ["someone who causes trouble", "opposite-reading"]], "In a parable from the Bible, a traveler from Samaria stops to help a hurt stranger.", "A Good Samaritan is someone who helps strangers."],
    es: ["Antes de vender un solo pastel, Ana ya planeaba qué compraría con las ganancias. Su abuela le dijo: “No hagas el cuento de la lechera”.", "contar con algo que todavía no tienes", [["vender leche en el mercado", "took-literally"], ["ser muy ahorradora", "opposite-reading"]], "En el cuento, una lechera imagina todo lo que comprará con la leche, pero el cántaro se le cae y lo pierde todo.", "Hacer el cuento de la lechera es hacer planes con lo que todavía no se tiene."],
  },
  {
    en: ["Our small team beat the champions; it was David versus Goliath.", "a much weaker side defeating a stronger one", [["a contest between two equal teams", "opposite-reading"], ["a team led by a coach named David", "took-literally"]], "In the Bible, young David defeats the giant Goliath.", "A David-and-Goliath contest is one where the underdog wins."],
    es: ["“Las uvas estaban verdes”, dijo Beto cuando no lo eligieron para el equipo.", "fingir que no quería lo que no pudo conseguir", [["no le gustó la fruta", "took-literally"], ["decía con sinceridad lo que pensaba", "opposite-reading"]], "En la fábula, una zorra que no alcanza unas uvas dice que estaban verdes.", "“Están verdes” se dice cuando alguien desprecia lo que no pudo conseguir."],
  },
  {
    en: ["After the fire, the town rebuilt its library and rose like a phoenix.", "came back stronger after being destroyed", [["turned into a bird", "took-literally"], ["disappeared forever", "opposite-reading"]], "In ancient myths, the phoenix is a bird that rises again from its own ashes.", "Rising like a phoenix means coming back after being destroyed."],
    es: ["Kai se quejaba tanto de dolores de panza falsos que, cuando de verdad se enfermó, nadie le creyó: le pasó como a Pedro y el lobo.", "dio tantas falsas alarmas que nadie creyó la verdadera", [["les tenía miedo a los animales", "took-literally"], ["era demasiado orgulloso para pedir ayuda", "wrong-story"]], "En la fábula, un pastorcito avisa en broma que viene el lobo, hasta que nadie le cree.", "Pasarle como a Pedro y el lobo es dar falsas alarmas hasta que nadie te cree."],
  },
  {
    en: ["My brother is such a Scrooge; he won't spend a penny on gifts.", "a stingy person", [["a person who loves holidays", "opposite-reading"], ["a person with a bad memory", "wrong-story"]], "In Charles Dickens's A Christmas Carol, Ebenezer Scrooge refuses to spend money or share.", "Calling someone a Scrooge means they are stingy."],
    es: ["Después del incendio, el pueblo reconstruyó la biblioteca y resurgió como el ave fénix.", "volvió más fuerte después de ser destruido", [["se convirtió en pájaro", "took-literally"], ["desapareció para siempre", "opposite-reading"]], "En los mitos antiguos, el ave fénix renace de sus propias cenizas.", "Resurgir como el ave fénix es volver después de haber sido destruido."],
  },
  {
    en: ["Being chosen for the team after years on the bench was a real Cinderella story.", "an unexpected rise from being overlooked to success", [["a story about losing a shoe", "took-literally"], ["a story about a long journey home", "wrong-story"]], "In the fairy tale, a mistreated girl ends up marrying a prince.", "A Cinderella story is a rise from being overlooked to success."],
    es: ["Que eligieran al jugador de la banca para la final fue una historia de Cenicienta.", "un ascenso inesperado de alguien a quien nadie tomaba en cuenta", [["una historia sobre perder un zapato", "took-literally"], ["un viaje largo de regreso a casa", "wrong-story"]], "En el cuento, una joven maltratada termina casándose con un príncipe.", "Una historia de Cenicienta es pasar de ser ignorado al éxito."],
  },
  {
    en: ["Every time Ava fibbed about her homework, her mom joked that her nose was growing like Pinocchio's.", "Ava was not telling the truth", [["Ava had a cold", "took-literally"], ["Ava was very brave", "wrong-story"]], "In the story, Pinocchio's nose grows whenever he lies.", "Mentioning Pinocchio's nose points to a lie."],
    es: ["Cada vez que Ava mentía sobre la tarea, su mamá bromeaba que le iba a crecer la nariz como a Pinocho.", "Ava no decía la verdad", [["Ava tenía gripe", "took-literally"], ["Ava era muy valiente", "wrong-story"]], "En el cuento, a Pinocho le crece la nariz cada vez que miente.", "Mencionar la nariz de Pinocho señala una mentira."],
  },
  {
    en: ["Tina's science fair project was so impressive that the judges called her the next Einstein.", "a brilliant scientific thinker", [["a person with messy hair", "took-literally"], ["a famous painter", "wrong-story"]], "Albert Einstein was a physicist famous for his theories about space, time, and energy.", "Calling someone the next Einstein means they seem brilliant at science."],
    es: ["El proyecto de Tina en la feria de ciencias impresionó tanto que los jueces la llamaron la próxima Marie Curie.", "una científica brillante", [["una persona que trabaja en un laboratorio de cocina", "took-literally"], ["una pintora famosa", "wrong-story"]], "Marie Curie fue una científica que ganó dos premios Nobel por sus investigaciones sobre la radiactividad.", "Llamar a alguien la próxima Marie Curie es decir que parece brillante en ciencias."],
  },
];

const ALLUSION = skill(
  { id: "e.allusions", grade: "8", title: { en: "Allusions", es: "Alusiones" }, standard: "RL.8.4", prereqs: ["e.figurative"] },
  [
    {
      bank: ALLUSIONS,
      ask: { en: "What does the allusion in this sentence suggest?", es: "¿Qué sugiere la alusión de esta oración?" },
      hints: {
        en: ["An allusion is a short reference to a famous story, myth, person, or work. Which one is mentioned?", "Recall what happens in that story, then ask how it matches the situation in the sentence."],
        es: ["Una alusión es una referencia breve a una historia, un mito, una persona o una obra famosa. ¿Cuál se menciona?", "Recuerda qué pasa en esa historia y luego piensa cómo se parece a la situación de la oración."],
      },
      seconds: 25,
    },
  ],
);

export { IRONY_PUNS, ALLUSION };
