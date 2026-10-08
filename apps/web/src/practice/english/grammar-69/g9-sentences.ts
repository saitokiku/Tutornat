import { skill, CHOOSE, PUNCTUATED, type Bi, type Entry } from "./shared";

// Grade 9: parallel structure; semicolons and colons.

// ---------------------------------------------------------------------------------------------------
// e.parallel.structure — level 1: the sentence whose series or paired parts share one form; level 2:
// the item that completes a series in the same form. Spanish pairs: tanto… como, no solo… sino también,
// ni… ni.

const PARALLEL_PICK: Bi<Entry>[] = [
  {
    en: ["", "Maya likes hiking, swimming, and biking.", [["Maya likes hiking, swimming, and to bike.", "mixed-verb-forms"], ["Maya likes hiking, swimming, and she bikes.", "mixed-word-types"]], "Look at the form of each activity in the list.", "All three activities end in -ing, so the series is parallel."],
    es: ["", "A Maya le gusta caminar, nadar y andar en bicicleta.", [["A Maya le gusta caminar, nadar y la bicicleta.", "mixed-word-types"], ["A Maya le gusta caminar, nadando y andar en bicicleta.", "mixed-verb-forms"]], "Fíjate en la forma de cada actividad de la serie.", "Las tres actividades son infinitivos, así que la serie es paralela."],
  },
  {
    en: ["", "The coach told us to stretch, to drink water, and to rest.", [["The coach told us to stretch, drinking water, and to rest.", "mixed-verb-forms"], ["The coach told us to stretch, to drink water, and that we should rest.", "mixed-word-types"]], "Look at how each instruction begins.", "All three instructions are “to” plus a verb."],
    es: ["", "El entrenador nos pidió estirarnos, tomar agua y descansar.", [["El entrenador nos pidió estirarnos, tomar agua y que descansáramos.", "mixed-word-types"], ["El entrenador nos pidió estirarnos, tomando agua y descansar.", "mixed-verb-forms"]], "Fíjate en cómo está escrita cada instrucción.", "Las tres instrucciones son infinitivos."],
  },
  {
    en: ["", "The new library is bright, quiet, and comfortable.", [["The new library is bright, quiet, and has comfortable chairs.", "mixed-word-types"], ["The new library is bright, quietly, and comfortable.", "mixed-word-types"]], "What kind of word is each item in the list?", "All three items are adjectives that describe the library."],
    es: ["", "La nueva biblioteca es luminosa, tranquila y cómoda.", [["La nueva biblioteca es luminosa, tranquila y tiene sillas cómodas.", "mixed-word-types"], ["La nueva biblioteca es luminosa, tranquilamente y cómoda.", "mixed-word-types"]], "¿Qué clase de palabra es cada elemento de la serie?", "Los tres elementos son adjetivos que describen la biblioteca."],
  },
  {
    en: ["", "Kenji not only finished his project but also helped his friends.", [["Kenji not only finished his project but also his friends were helped.", "unbalanced-pair"], ["Kenji not only finished his project but also helping his friends.", "mixed-verb-forms"]], "Compare the words after “not only” with the words after “but also.”", "Both parts start with a past-tense verb: “finished” and “helped.”"],
    es: ["", "Kenji no solo terminó su proyecto, sino que también ayudó a sus amigos.", [["Kenji no solo terminó su proyecto, sino también sus amigos fueron ayudados.", "unbalanced-pair"], ["Kenji no solo terminó su proyecto, sino también ayudando a sus amigos.", "mixed-verb-forms"]], "Compara lo que va después de “no solo” con lo que va después de “sino”.", "Las dos partes tienen un verbo en pasado: “terminó” y “ayudó”."],
  },
  {
    en: ["", "We can either take the train or ride our bikes.", [["We can either take the train or riding our bikes.", "mixed-verb-forms"], ["Either we can take the train or ride our bikes.", "unbalanced-pair"]], "Compare the words after “either” with the words after “or.”", "Both parts are a plain verb phrase: “take the train” and “ride our bikes.”"],
    es: ["", "Podemos tomar el tren o ir en bicicleta.", [["Podemos tomar el tren o yendo en bicicleta.", "mixed-verb-forms"], ["Podemos tomar el tren o la bicicleta es otra opción.", "mixed-word-types"]], "Compara las dos opciones.", "Las dos opciones son infinitivos: “tomar” e “ir”."],
  },
  {
    en: ["", "Our goals are to read more, to sleep more, and to worry less.", [["Our goals are to read more, sleeping more, and to worry less.", "mixed-verb-forms"], ["Our goals are to read more, to sleep more, and less worrying.", "mixed-word-types"]], "Look at how each goal begins.", "All three goals are “to” plus a verb."],
    es: ["", "Nuestras metas son leer más, dormir más y preocuparnos menos.", [["Nuestras metas son leer más, dormir más y menos preocupación.", "mixed-word-types"], ["Nuestras metas son leer más, durmiendo más y preocuparnos menos.", "mixed-verb-forms"]], "Fíjate en la forma de cada meta.", "Las tres metas son infinitivos."],
  },
  {
    en: ["", "The recipe was easy to follow, quick to make, and delicious to eat.", [["The recipe was easy to follow, quick to make, and it tasted delicious.", "mixed-word-types"], ["The recipe was easy to follow, making it quick, and delicious to eat.", "mixed-verb-forms"]], "Each item should have the same shape as “easy to follow.”", "All three items are an adjective plus “to” and a verb."],
    es: ["", "La receta era fácil de seguir, rápida de hacer y deliciosa de comer.", [["La receta era fácil de seguir, rápida de hacer y sabía deliciosa.", "mixed-word-types"], ["La receta era fácil de seguir, se hacía rápido y deliciosa de comer.", "mixed-word-types"]], "Cada elemento debe tener la forma de “fácil de seguir”.", "Los tres elementos son un adjetivo más “de” y un infinitivo."],
  },
  {
    en: ["", "She enjoys painting landscapes and playing the piano.", [["She enjoys painting landscapes and to play the piano.", "mixed-verb-forms"], ["She enjoys painting landscapes and the piano is played by her.", "mixed-word-types"]], "Look at the form of the two activities.", "Both activities end in -ing."],
    es: ["", "Le gusta pintar paisajes y tocar el piano.", [["Le gusta pintar paisajes y el piano.", "mixed-word-types"], ["Le gusta pintar paisajes y tocando el piano.", "mixed-verb-forms"]], "Fíjate en la forma de las dos actividades.", "Las dos actividades son infinitivos."],
  },
  {
    en: ["", "The trip was long, tiring, and expensive.", [["The trip was long, tiring, and cost a lot of money.", "mixed-word-types"], ["The trip was long, tiring, and an expense.", "mixed-word-types"]], "What kind of word is each item in the list?", "All three items are adjectives."],
    es: ["", "El viaje fue largo, cansado y caro.", [["El viaje fue largo, cansado y costó mucho dinero.", "mixed-word-types"], ["El viaje fue largo, cansado y un gasto.", "mixed-word-types"]], "¿Qué clase de palabra es cada elemento de la serie?", "Los tres elementos son adjetivos."],
  },
  {
    en: ["", "Neither the rain nor the cold stopped the runners.", [["Neither the rain nor did the cold stop the runners.", "unbalanced-pair"], ["Neither the rain or the cold stopped the runners.", "unbalanced-pair"]], "“Neither” has a partner word. Which one?", "“Neither” pairs with “nor,” and both parts are nouns: “the rain” and “the cold.”"],
    es: ["", "Ni la lluvia ni el frío detuvieron a los corredores.", [["Ni la lluvia o el frío detuvieron a los corredores.", "unbalanced-pair"], ["Ni la lluvia ni hizo frío para detener a los corredores.", "unbalanced-pair"]], "“Ni” va en pareja. ¿Con qué palabra?", "“Ni” se repite, y las dos partes son sustantivos: “la lluvia” y “el frío”."],
  },
  {
    en: ["", "Leo wanted to see the whales, to visit the lighthouse, and to eat fresh fish.", [["Leo wanted to see the whales, visiting the lighthouse, and to eat fresh fish.", "mixed-verb-forms"], ["Leo wanted to see the whales, to visit the lighthouse, and fresh fish.", "mixed-word-types"]], "Look at how each item begins.", "All three items are “to” plus a verb."],
    es: ["", "Leo quería ver las ballenas, visitar el faro y comer pescado fresco.", [["Leo quería ver las ballenas, visitando el faro y comer pescado fresco.", "mixed-verb-forms"], ["Leo quería ver las ballenas, visitar el faro y pescado fresco.", "mixed-word-types"]], "Fíjate en la forma de cada elemento.", "Los tres elementos son infinitivos."],
  },
  {
    en: ["", "The speech was clear, convincing, and short.", [["The speech was clear, convincing, and didn't take long.", "mixed-word-types"], ["The speech was clear, convincingly, and short.", "mixed-word-types"]], "What kind of word is each item in the list?", "All three items are adjectives."],
    es: ["", "El discurso fue claro, convincente y breve.", [["El discurso fue claro, convincente y no duró mucho.", "mixed-word-types"], ["El discurso fue claro, convincentemente y breve.", "mixed-word-types"]], "¿Qué clase de palabra es cada elemento de la serie?", "Los tres elementos son adjetivos."],
  },
  {
    en: ["", "The job requires patience, skill, and creativity.", [["The job requires patience, skill, and being creative.", "mixed-word-types"], ["The job requires patience, being skilled, and creativity.", "mixed-word-types"]], "What kind of word is each item in the list?", "All three items are nouns."],
    es: ["", "El trabajo requiere paciencia, habilidad y creatividad.", [["El trabajo requiere paciencia, habilidad y ser creativo.", "mixed-word-types"], ["El trabajo requiere paciencia, ser hábil y creatividad.", "mixed-word-types"]], "¿Qué clase de palabra es cada elemento de la serie?", "Los tres elementos son sustantivos."],
  },
  {
    en: ["", "Both the teachers and the students voted for the change.", [["Both the teachers and also the students voted for the change.", "unbalanced-pair"], ["Both the teachers as well as the students voted for the change.", "unbalanced-pair"]], "“Both” has a partner word. Which one?", "“Both” pairs with “and,” with nothing extra."],
    es: ["", "Tanto los maestros como los estudiantes votaron por el cambio.", [["Tanto los maestros y los estudiantes votaron por el cambio.", "unbalanced-pair"], ["Tanto los maestros como a los estudiantes votaron por el cambio.", "unbalanced-pair"]], "“Tanto” va en pareja. ¿Con qué palabra?", "“Tanto” va con “como”, y las dos partes tienen la misma forma: “los maestros” y “los estudiantes”."],
  },
];

const PARALLEL_FILL: Bi<Entry>[] = [
  {
    en: ["On weekends, Ana likes reading, drawing, and ___.", "cooking", [["to cook", "mixed-verb-forms"], ["she cooks", "mixed-word-types"]], "Look at the form of “reading” and “drawing.”", "Match the -ing form of the other two."],
    es: ["Los fines de semana, a Ana le gusta leer, dibujar y ___.", "cocinar", [["cocinando", "mixed-verb-forms"], ["la cocina", "mixed-word-types"]], "Fíjate en la forma de “leer” y “dibujar”.", "Usa la misma forma que las otras dos: infinitivo."],
  },
  {
    en: ["The coach asked us to warm up, to listen closely, and ___.", "to have fun", [["having fun", "mixed-verb-forms"], ["that we have fun", "mixed-word-types"]], "Look at how the first two items begin.", "Match “to” plus a verb."],
    es: ["El entrenador nos pidió calentar, escuchar con atención y ___.", "divertirnos", [["divirtiéndonos", "mixed-verb-forms"], ["que nos divirtiéramos", "mixed-word-types"]], "Fíjate en la forma de “calentar” y “escuchar”.", "Usa la misma forma: infinitivo."],
  },
  {
    en: ["The puppy was small, fluffy, and ___.", "playful", [["it played a lot", "mixed-word-types"], ["playing", "mixed-verb-forms"]], "What kind of word are “small” and “fluffy”?", "Match the adjectives."],
    es: ["El cachorro era pequeño, peludo y ___.", "juguetón", [["jugaba mucho", "mixed-word-types"], ["jugando", "mixed-verb-forms"]], "¿Qué clase de palabra son “pequeño” y “peludo”?", "Usa otro adjetivo."],
  },
  {
    en: ["The museum was not only interesting but also ___.", "free", [["it was free", "unbalanced-pair"], ["costing nothing", "mixed-verb-forms"]], "What kind of word comes after “not only”?", "“Interesting” is an adjective, so the second part needs an adjective too."],
    es: ["El museo no solo era interesante, sino también ___.", "gratuito", [["no costaba nada", "unbalanced-pair"], ["costando nada", "mixed-verb-forms"]], "¿Qué clase de palabra va después de “no solo era”?", "“Interesante” es un adjetivo, así que la segunda parte también."],
  },
  {
    en: ["To learn a language, you need patience, practice, and ___.", "courage", [["being brave", "mixed-word-types"], ["to be brave", "mixed-verb-forms"]], "What kind of word are “patience” and “practice”?", "Match the nouns."],
    es: ["Para aprender un idioma necesitas paciencia, práctica y ___.", "valor", [["ser valiente", "mixed-word-types"], ["siendo valiente", "mixed-verb-forms"]], "¿Qué clase de palabra son “paciencia” y “práctica”?", "Usa otro sustantivo."],
  },
  {
    en: ["We walked along the beach, collected shells, and ___.", "watched the sunset", [["watching the sunset", "mixed-verb-forms"], ["the sunset was watched", "mixed-word-types"]], "Look at the verbs “walked” and “collected.”", "Match the past-tense verb."],
    es: ["Caminamos por la playa, recogimos conchas y ___.", "vimos el atardecer", [["viendo el atardecer", "mixed-verb-forms"], ["el atardecer fue visto", "mixed-word-types"]], "Fíjate en los verbos “caminamos” y “recogimos”.", "Usa el mismo tiempo y la misma persona: pasado, nosotros."],
  },
  {
    en: ["Kai would rather walk to school than ___.", "ride the bus", [["riding the bus", "mixed-verb-forms"], ["the bus", "mixed-word-types"]], "Look at the form of “walk.”", "Match the plain verb: “walk” and “ride.”"],
    es: ["A Kai le gusta más caminar a la escuela que ___.", "ir en autobús", [["yendo en autobús", "mixed-verb-forms"], ["el autobús", "mixed-word-types"]], "Fíjate en la forma de “caminar”.", "Usa la misma forma: infinitivo."],
  },
  {
    en: ["The goals of the club are to plant trees, to clean parks, and ___.", "to teach recycling", [["teaching recycling", "mixed-verb-forms"], ["recycling should be taught", "mixed-word-types"]], "Look at how the first two goals begin.", "Match “to” plus a verb."],
    es: ["Las metas del club son plantar árboles, limpiar parques y ___.", "enseñar a reciclar", [["enseñando a reciclar", "mixed-verb-forms"], ["que se enseñe a reciclar", "mixed-word-types"]], "Fíjate en la forma de las dos primeras metas.", "Usa la misma forma: infinitivo."],
  },
  {
    en: ["The new phone is faster, lighter, and ___.", "cheaper", [["costs less", "mixed-word-types"], ["it is cheap", "mixed-word-types"]], "Look at the form of “faster” and “lighter.”", "Match the -er comparison."],
    es: ["El nuevo teléfono es más rápido, más ligero y ___.", "más barato", [["cuesta menos", "mixed-word-types"], ["es barato", "mixed-word-types"]], "Fíjate en la forma de “más rápido” y “más ligero”.", "Usa la misma forma: “más” más un adjetivo."],
  },
  {
    en: ["Either we finish the poster tonight, or ___.", "we finish it tomorrow", [["finishing it tomorrow", "mixed-verb-forms"], ["tomorrow is another option", "mixed-word-types"]], "Look at the form of the part after “either.”", "Both parts are a full clause: “we finish…”"],
    es: ["O terminamos el cartel esta noche, o ___.", "lo terminamos mañana", [["terminándolo mañana", "mixed-verb-forms"], ["mañana es otra opción", "mixed-word-types"]], "Fíjate en la forma de la primera opción.", "Las dos partes son oraciones con el mismo verbo: “terminamos”."],
  },
  {
    en: ["Grandma taught me how to knit, how to bake bread, and ___.", "how to fix a bike", [["fixing a bike", "mixed-verb-forms"], ["that bikes can be fixed", "mixed-word-types"]], "Look at how the first two items begin.", "Match “how to” plus a verb."],
    es: ["La abuela me enseñó a tejer, a hornear pan y ___.", "a arreglar una bicicleta", [["arreglando una bicicleta", "mixed-verb-forms"], ["que las bicicletas se arreglan", "mixed-word-types"]], "Fíjate en cómo empiezan los dos primeros elementos.", "Usa la misma forma: “a” más un infinitivo."],
  },
  {
    en: ["The storm knocked down trees, flooded streets, and ___.", "closed schools", [["closing schools", "mixed-verb-forms"], ["schools were closed", "mixed-word-types"]], "Look at the verbs “knocked” and “flooded.”", "Match the past-tense verb."],
    es: ["La tormenta tumbó árboles, inundó calles y ___.", "cerró escuelas", [["cerrando escuelas", "mixed-verb-forms"], ["las escuelas fueron cerradas", "mixed-word-types"]], "Fíjate en los verbos “tumbó” e “inundó”.", "Usa el mismo tiempo: pasado."],
  },
  {
    en: ["A good friend is honest, loyal, and ___.", "kind", [["treats you kindly", "mixed-word-types"], ["kindness", "mixed-word-types"]], "What part of speech are “honest” and “loyal”?", "Match the adjectives."],
    es: ["Un buen amigo es honesto, leal y ___.", "amable", [["te trata con amabilidad", "mixed-word-types"], ["la amabilidad", "mixed-word-types"]], "¿Qué clase de palabra son “honesto” y “leal”?", "Usa otro adjetivo."],
  },
  {
    en: ["Both the singer and ___ bowed at the end of the show.", "the drummer", [["also the drummer", "unbalanced-pair"], ["as well as the drummer", "unbalanced-pair"]], "“Both” pairs with “and.” What should come after “and”?", "Match “the singer” with a plain noun phrase and nothing extra."],
    es: ["Tanto la cantante como ___ saludaron al final del concierto.", "el baterista", [["al baterista", "unbalanced-pair"], ["y el baterista", "unbalanced-pair"]], "“Tanto” va con “como”. ¿Qué debe seguir?", "Después de “como” va la misma forma que después de “tanto”: “la cantante” y “el baterista”."],
  },
];

const PARALLEL = skill(
  { id: "e.parallel.structure", grade: "9", title: { en: "Parallel structure", es: "Estructura paralela" }, standard: "L.9-10.1a", prereqs: ["e.verbals"] },
  [
    {
      bank: PARALLEL_PICK,
      ask: { en: "Which sentence uses parallel structure?", es: "¿Qué oración tiene estructura paralela?" },
      hints: {
        en: ["Find the items in the list, or the two parts of the pair.", "Every item in a series, and both parts of a pair like “not only… but also” or “either… or,” should have the same form: all -ing words, all “to” verbs, all adjectives, or all nouns."],
        es: ["Busca los elementos de la serie o las dos partes del par.", "Todos los elementos de una serie, y las dos partes de pares como “no solo… sino también”, “tanto… como” o “ni… ni”, deben tener la misma forma: todos infinitivos, todos adjetivos o todos sustantivos."],
      },
      seconds: 25,
    },
    {
      bank: PARALLEL_FILL,
      ask: CHOOSE,
      hints: {
        en: ["Look at the form of the other items in the series or pair.", "Choose the answer with the same form: an -ing word with -ing words, a “to” verb with “to” verbs, an adjective with adjectives."],
        es: ["Fíjate en la forma de los demás elementos de la serie o del par.", "Elige la opción que tenga la misma forma: infinitivo con infinitivos, adjetivo con adjetivos, sustantivo con sustantivos."],
      },
      seconds: 15,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.semicolon.colon — level 1: semicolons (between related sentences, before "however" / "sin embargo"
// with a comma after it, and in series whose items already have commas); level 2: colons (before a list
// or an explanation after a complete sentence, in times; Spanish adds the colon after a letter's greeting,
// before a quotation, and a lowercase letter after the colon).

const SEMICOLONS: Bi<Entry>[] = [
  {
    en: ["", "The bus was late; we missed the first bell.", [["The bus was late, we missed the first bell.", "comma-splice"], ["The bus was late; because we missed the first bell.", "semicolon-before-fragment"], ["The bus was; late we missed the first bell.", "semicolon-wrong-place"]], "Are both parts complete sentences?", "Two closely related complete sentences can be joined with a semicolon; a comma alone cannot join them."],
    es: ["", "El autobús llegó tarde; perdimos el primer timbre.", [["El autobús llegó tarde; porque perdimos el primer timbre.", "semicolon-before-fragment"], ["El autobús; llegó tarde, perdimos el primer timbre.", "semicolon-wrong-place"]], "¿Las dos partes son oraciones completas?", "El punto y coma separa dos oraciones completas y relacionadas."],
  },
  {
    en: ["", "It rained all day; however, the game went on.", [["It rained all day, however, the game went on.", "comma-splice"], ["It rained all day; however the game went on.", "missing-comma-after-transition"]], "“However” joins two complete sentences here.", "Put a semicolon before “however” and a comma after it."],
    es: ["", "Llovió todo el día; sin embargo, el partido siguió.", [["Llovió todo el día; sin embargo el partido siguió.", "missing-comma-after-transition"], ["Llovió todo el día; sin embargo, el partido; siguió.", "semicolon-wrong-place"]], "“Sin embargo” une dos oraciones completas.", "Antes de “sin embargo” va punto y coma, y después, coma."],
  },
  {
    en: ["", "Ana loves science; her brother loves art.", [["Ana loves science, her brother loves art.", "comma-splice"], ["Ana loves science; and art.", "semicolon-before-fragment"]], "Are both parts complete sentences?", "Two closely related complete sentences can be joined with a semicolon."],
    es: ["", "Ana ama las ciencias; su hermano, el arte.", [["Ana ama las ciencias; y el arte.", "semicolon-before-fragment"], ["Ana ama; las ciencias, su hermano, el arte.", "semicolon-wrong-place"]], "Hay dos ideas completas; en la segunda, la coma reemplaza al verbo “ama”.", "El punto y coma separa las dos oraciones, y la coma marca el verbo que se omite."],
  },
  {
    en: ["", "We visited Austin, Texas; Tucson, Arizona; and Denver, Colorado.", [["We visited Austin, Texas, Tucson, Arizona, and Denver, Colorado.", "commas-in-complex-series"], ["We visited Austin; Texas, Tucson; Arizona, and Denver; Colorado.", "semicolon-wrong-place"]], "Each item in the list already has a comma inside it.", "When list items contain commas, semicolons separate the items."],
    es: ["", "Los equipos llegaron así: el primero, en autobús; el segundo, en tren, y el tercero, en avión.", [["Los equipos llegaron así: el primero, en autobús, el segundo, en tren, y el tercero, en avión.", "commas-in-complex-series"], ["Los equipos llegaron así: el primero; en autobús, el segundo; en tren, y el tercero; en avión.", "semicolon-wrong-place"]], "Cada elemento de la serie ya tiene una coma dentro.", "Cuando los elementos de una serie llevan coma, el punto y coma los separa."],
  },
  {
    en: ["", "The test will be hard; therefore, we are studying all week.", [["The test will be hard, therefore, we are studying all week.", "comma-splice"], ["The test will be hard; therefore, we are studying; all week.", "semicolon-wrong-place"]], "“Therefore” joins two complete sentences here.", "Put a semicolon before “therefore” and a comma after it."],
    es: ["", "Compré tres cosas: pan, leche y huevos.", [["Compré tres cosas; pan, leche y huevos.", "semicolon-for-colon"], ["Compré; tres cosas, pan, leche y huevos.", "semicolon-wrong-place"]], "Lo que sigue es una lista que explica “tres cosas”.", "Antes de una lista van dos puntos, no punto y coma."],
  },
  {
    en: ["", "The library was quiet; everyone was reading.", [["The library was quiet, everyone was reading.", "comma-splice"], ["The library was quiet; while everyone was reading.", "semicolon-before-fragment"]], "Are both parts complete sentences?", "Two closely related complete sentences can be joined with a semicolon."],
    es: ["", "El examen será difícil; por lo tanto, estamos estudiando toda la semana.", [["El examen será difícil; por lo tanto estamos estudiando toda la semana.", "missing-comma-after-transition"], ["El examen será difícil; por lo tanto, estamos estudiando; toda la semana.", "semicolon-wrong-place"]], "“Por lo tanto” une dos oraciones completas.", "Antes de “por lo tanto” va punto y coma, y después, coma."],
  },
  {
    en: ["", "Kenji forgot his lunch; luckily, Mia shared hers.", [["Kenji forgot his lunch, luckily, Mia shared hers.", "comma-splice"], ["Kenji forgot; his lunch, luckily, Mia shared hers.", "semicolon-wrong-place"]], "Are both parts complete sentences?", "Two complete sentences are joined with a semicolon, and “luckily” takes a comma."],
    es: ["", "Invitamos a Leo, nuestro vecino; a Rosa, su hermana, y a Sam, su primo.", [["Invitamos a Leo, nuestro vecino, a Rosa, su hermana, y a Sam, su primo.", "commas-in-complex-series"], ["Invitamos a Leo; nuestro vecino, a Rosa; su hermana, y a Sam; su primo.", "semicolon-wrong-place"]], "Cada elemento de la serie ya tiene una coma dentro.", "Cuando los elementos de una serie llevan coma, el punto y coma los separa."],
  },
  {
    en: ["", "The team practiced hard; as a result, they won the title.", [["The team practiced hard, as a result, they won the title.", "comma-splice"], ["The team practiced hard; as a result of practice.", "semicolon-before-fragment"]], "Is the part after the semicolon a complete sentence?", "A semicolon needs a complete sentence on each side."],
    es: ["", "La película era larga; aun así, nadie se fue antes.", [["La película era larga; aun así nadie se fue antes.", "missing-comma-after-transition"], ["La película era larga; aunque nadie se fue antes.", "semicolon-before-fragment"]], "“Aun así” une dos oraciones completas.", "Antes de “aun así” va punto y coma, y después, coma."],
  },
  {
    en: ["", "We invited Leo, our neighbor; Rosa, his sister; and Sam, their cousin.", [["We invited Leo, our neighbor, Rosa, his sister, and Sam, their cousin.", "commas-in-complex-series"], ["We invited Leo; our neighbor, Rosa; his sister, and Sam; their cousin.", "semicolon-wrong-place"]], "Each item in the list already has a comma inside it.", "When list items contain commas, semicolons separate the items."],
    es: ["", "Quería ir de excursión; sin embargo, hacía demasiado calor.", [["Quería ir de excursión; sin embargo hacía demasiado calor.", "missing-comma-after-transition"], ["Quería ir de excursión; sin embargo, hacía; demasiado calor.", "semicolon-wrong-place"]], "“Sin embargo” une dos oraciones completas.", "Antes de “sin embargo” va punto y coma, y después, coma."],
  },
  {
    en: ["", "The movie was long; still, nobody left early.", [["The movie was long, still, nobody left early.", "comma-splice"], ["The movie was long; although nobody left early.", "semicolon-before-fragment"]], "Is the part after the semicolon a complete sentence?", "Two complete sentences are joined with a semicolon, and “still” takes a comma."],
    es: ["", "Necesitamos tres materiales: cartulina, tijeras y pegamento.", [["Necesitamos tres materiales; cartulina, tijeras y pegamento.", "semicolon-for-colon"], ["Necesitamos; tres materiales: cartulina, tijeras y pegamento.", "semicolon-wrong-place"]], "Lo que sigue es una lista que explica “tres materiales”.", "Antes de una lista van dos puntos, no punto y coma."],
  },
  {
    en: ["", "I wanted to go hiking; however, it was too hot.", [["I wanted to go hiking, however, it was too hot.", "comma-splice"], ["I wanted to go hiking; however it was too hot.", "missing-comma-after-transition"]], "“However” joins two complete sentences here.", "Put a semicolon before “however” and a comma after it."],
    es: ["", "Kenji olvidó su almuerzo; por suerte, Mía compartió el suyo.", [["Kenji olvidó su almuerzo; por suerte Mía compartió el suyo.", "missing-comma-after-transition"], ["Kenji olvidó; su almuerzo, por suerte, Mía compartió el suyo.", "semicolon-wrong-place"]], "“Por suerte” une dos oraciones completas.", "Las dos oraciones se separan con punto y coma, y “por suerte” lleva coma después."],
  },
  {
    en: ["", "The concert sold out in minutes; many fans were disappointed.", [["The concert sold out in minutes, many fans were disappointed.", "comma-splice"], ["The concert sold out in minutes; disappointing many fans.", "semicolon-before-fragment"]], "Is the part after the semicolon a complete sentence?", "A semicolon needs a complete sentence on each side."],
    es: ["", "El concierto se agotó en minutos; muchos aficionados se quedaron sin boleto.", [["El concierto se agotó en minutos; dejando a muchos aficionados sin boleto.", "semicolon-before-fragment"], ["El concierto; se agotó en minutos, muchos aficionados se quedaron sin boleto.", "semicolon-wrong-place"]], "¿Lo que va después del punto y coma es una oración completa?", "El punto y coma necesita una oración completa a cada lado."],
  },
  {
    en: ["", "Dinner is ready; please wash your hands.", [["Dinner is ready, please wash your hands.", "comma-splice"], ["Dinner is; ready please wash your hands.", "semicolon-wrong-place"]], "Are both parts complete sentences?", "Two closely related complete sentences can be joined with a semicolon."],
    es: ["", "La carretera estaba congelada; no obstante, los autobuses llegaron a tiempo.", [["La carretera estaba congelada; no obstante los autobuses llegaron a tiempo.", "missing-comma-after-transition"], ["La carretera estaba congelada; aunque los autobuses llegaron a tiempo.", "semicolon-before-fragment"]], "“No obstante” une dos oraciones completas.", "Antes de “no obstante” va punto y coma, y después, coma."],
  },
  {
    en: ["", "The road was icy; however, the buses ran on time.", [["The road was icy, however, the buses ran on time.", "comma-splice"], ["The road was icy; however the buses ran on time.", "missing-comma-after-transition"]], "“However” joins two complete sentences here.", "Put a semicolon before “however” and a comma after it."],
    es: ["", "Los premios fueron estos: oro, para Lucía; plata, para Tomás, y bronce, para Inés.", [["Los premios fueron estos: oro, para Lucía, plata, para Tomás, y bronce, para Inés.", "commas-in-complex-series"], ["Los premios fueron estos; oro, para Lucía; plata, para Tomás, y bronce, para Inés.", "semicolon-for-colon"]], "Cada elemento de la serie ya tiene una coma dentro.", "Antes de la lista van dos puntos, y entre elementos que llevan coma, punto y coma."],
  },
];

const COLONS: Bi<Entry>[] = [
  {
    en: ["", "Bring three things to the field trip: a lunch, a water bottle, and a jacket.", [["Bring three things to the field trip; a lunch, a water bottle, and a jacket.", "semicolon-for-colon"], ["Bring: three things to the field trip, a lunch, a water bottle, and a jacket.", "colon-after-incomplete-clause"]], "Is there a complete sentence before the list?", "A complete sentence introduces the list, so a colon comes before it."],
    es: ["", "Querida abuela: Te escribo desde el campamento.", [["Querida abuela, te escribo desde el campamento.", "comma-after-greeting"], ["Querida abuela: te escribo desde el campamento.", "lowercase-after-greeting"]], "En español, ¿qué signo va después del saludo de una carta?", "Después del saludo de una carta van dos puntos, y el texto empieza con mayúscula, normalmente en la línea siguiente."],
  },
  {
    en: ["", "My favorite colors are blue, green, and orange.", [["My favorite colors are: blue, green, and orange.", "colon-after-incomplete-clause"], ["My favorite: colors are blue, green, and orange.", "colon-wrong-place"]], "Is “My favorite colors are” a complete sentence by itself?", "No colon goes between a verb and the words that complete it."],
    es: ["", "Mis colores favoritos son el azul, el verde y el naranja.", [["Mis colores favoritos son: el azul, el verde y el naranja.", "colon-after-incomplete-clause"], ["Mis colores favoritos: son el azul, el verde y el naranja.", "colon-wrong-place"]], "¿“Mis colores favoritos son” es una oración completa?", "No se ponen dos puntos entre el verbo y lo que lo completa."],
  },
  {
    en: ["", "The coach had one rule: respect for every player.", [["The coach had one rule; respect for every player.", "semicolon-for-colon"], ["The coach had: one rule, respect for every player.", "colon-after-incomplete-clause"]], "The words at the end explain what the rule is.", "A colon after a complete sentence introduces the explanation."],
    es: ["", "Mi abuela siempre dice: “Más vale tarde que nunca”.", [["Mi abuela siempre dice, “Más vale tarde que nunca”.", "missing-colon-before-quote"], ["Mi abuela siempre: dice “Más vale tarde que nunca”.", "colon-wrong-place"]], "En español, ¿qué signo va antes de una cita textual?", "Antes de reproducir las palabras exactas de alguien van dos puntos."],
  },
  {
    en: ["", "We need flour, eggs, and sugar for the cake.", [["We need: flour, eggs, and sugar for the cake.", "colon-after-incomplete-clause"], ["We need flour: eggs, and sugar for the cake.", "colon-wrong-place"]], "Is “We need” a complete sentence by itself?", "No colon goes between a verb and the words that complete it."],
    es: ["", "Necesito tres cosas para la excursión: almuerzo, agua y una chaqueta.", [["Necesito tres cosas para la excursión: Almuerzo, agua y una chaqueta.", "capital-after-colon"], ["Necesito: tres cosas para la excursión, almuerzo, agua y una chaqueta.", "colon-after-incomplete-clause"]], "Después de los dos puntos, ¿la lista empieza con mayúscula o minúscula?", "Antes de la lista van dos puntos, y la lista sigue con minúscula."],
  },
  {
    en: ["", "The answer was obvious: the dog had eaten the cookies.", [["The answer was obvious, the dog had eaten the cookies.", "comma-splice"], ["The answer was: obvious the dog had eaten the cookies.", "colon-wrong-place"]], "The second part explains what the answer was.", "A colon after a complete sentence can introduce an explanation."],
    es: ["", "La respuesta era clara: el perro se había comido las galletas.", [["La respuesta era clara: El perro se había comido las galletas.", "capital-after-colon"], ["La respuesta era: clara el perro se había comido las galletas.", "colon-wrong-place"]], "Después de los dos puntos, ¿se sigue con mayúscula o minúscula?", "Los dos puntos introducen la explicación, que sigue con minúscula."],
  },
  {
    en: ["", "The recipe calls for two spices: cinnamon and nutmeg.", [["The recipe calls for: two spices, cinnamon and nutmeg.", "colon-after-incomplete-clause"], ["The recipe: calls for two spices, cinnamon and nutmeg.", "colon-wrong-place"]], "Is there a complete sentence before the list?", "A complete sentence introduces the list, so a colon comes before it."],
    es: ["", "Estimado señor Díaz: Le escribo para pedirle información.", [["Estimado señor Díaz, le escribo para pedirle información.", "comma-after-greeting"], ["Estimado: señor Díaz, le escribo para pedirle información.", "colon-wrong-place"]], "En español, ¿qué signo va después del saludo de una carta?", "Después del saludo de una carta van dos puntos, y el texto empieza con mayúscula."],
  },
  {
    en: ["", "The store sells three kinds of apples: Fuji, Gala, and Granny Smith.", [["The store sells three kinds of apples; Fuji, Gala, and Granny Smith.", "semicolon-for-colon"], ["The store sells: three kinds of apples, Fuji, Gala, and Granny Smith.", "colon-after-incomplete-clause"]], "Is there a complete sentence before the list?", "A complete sentence introduces the list, so a colon comes before it."],
    es: ["", "La tienda vende tres frutas: mangos, papayas y guayabas.", [["La tienda vende tres frutas; mangos, papayas y guayabas.", "semicolon-for-colon"], ["La tienda vende: tres frutas, mangos, papayas y guayabas.", "colon-after-incomplete-clause"]], "¿Hay una oración completa antes de la lista?", "Una oración completa anuncia la lista, así que van dos puntos."],
  },
  {
    en: ["", "Our class has visited many places, such as the zoo, the museum, and the aquarium.", [["Our class has visited many places, such as: the zoo, the museum, and the aquarium.", "colon-after-incomplete-clause"], ["Our class has visited many places; such as the zoo, the museum, and the aquarium.", "semicolon-for-colon"]], "Does “such as” need any mark after it?", "No colon goes after “such as”; the examples follow it directly."],
    es: ["", "El entrenador repetía siempre: “Respeta a cada jugador”.", [["El entrenador repetía siempre, “Respeta a cada jugador”.", "missing-colon-before-quote"], ["El entrenador repetía siempre “Respeta a cada jugador”.", "missing-colon-before-quote"]], "En español, ¿qué signo va antes de una cita textual?", "Antes de reproducir las palabras exactas de alguien van dos puntos."],
  },
  {
    en: ["", "There is only one way to get better: practice.", [["There is only one way to get better; practice.", "semicolon-for-colon"], ["There is: only one way to get better, practice.", "colon-after-incomplete-clause"]], "The last word explains what the one way is.", "A colon after a complete sentence introduces the explanation."],
    es: ["", "Solo hay una forma de mejorar: practicar.", [["Solo hay una forma de mejorar; practicar.", "semicolon-for-colon"], ["Solo hay: una forma de mejorar, practicar.", "colon-after-incomplete-clause"]], "La última palabra explica cuál es la forma.", "Los dos puntos después de una oración completa introducen la explicación."],
  },
  {
    en: ["", "The meeting is at 3:30 p.m.", [["The meeting is at 3;30 p.m.", "semicolon-for-colon"], ["The meeting is at: 3:30 p.m.", "colon-after-incomplete-clause"]], "Which mark separates hours from minutes?", "A colon separates the hour from the minutes."],
    es: ["", "La reunión es a las 3:30 p. m.", [["La reunión es a las 3;30 p. m.", "semicolon-for-colon"], ["La reunión es a las: 3:30 p. m.", "colon-after-incomplete-clause"]], "¿Qué signo separa las horas de los minutos?", "Los dos puntos separan la hora de los minutos."],
  },
  {
    en: ["", "The trail had one problem: it was covered in ice.", [["The trail had one problem, it was covered in ice.", "comma-splice"], ["The trail had: one problem, it was covered in ice.", "colon-after-incomplete-clause"]], "The second part explains what the problem was.", "A colon after a complete sentence introduces the explanation."],
    es: ["", "El sendero tenía un problema: estaba cubierto de hielo.", [["El sendero tenía un problema: Estaba cubierto de hielo.", "capital-after-colon"], ["El sendero tenía: un problema, estaba cubierto de hielo.", "colon-after-incomplete-clause"]], "Después de los dos puntos, ¿se sigue con mayúscula o minúscula?", "Los dos puntos introducen la explicación, que sigue con minúscula."],
  },
  {
    en: ["", "Please bring the following supplies: glue, scissors, and markers.", [["Please bring the following supplies; glue, scissors, and markers.", "semicolon-for-colon"], ["Please bring: the following supplies, glue, scissors, and markers.", "colon-after-incomplete-clause"]], "Is there a complete sentence before the list?", "A complete sentence introduces the list, so a colon comes before it."],
    es: ["", "Traigan los siguientes materiales: pegamento, tijeras y marcadores.", [["Traigan los siguientes materiales; pegamento, tijeras y marcadores.", "semicolon-for-colon"], ["Traigan: los siguientes materiales, pegamento, tijeras y marcadores.", "colon-after-incomplete-clause"]], "¿Hay una oración completa antes de la lista?", "Una oración completa anuncia la lista, así que van dos puntos."],
  },
  {
    en: ["", "The kit includes a map, a compass, and a whistle.", [["The kit includes: a map, a compass, and a whistle.", "colon-after-incomplete-clause"], ["The kit includes a map: a compass, and a whistle.", "colon-wrong-place"]], "Is “The kit includes” a complete sentence by itself?", "No colon goes between a verb and the words that complete it."],
    es: ["", "Querido Tomás: Gracias por tu carta.", [["Querido Tomás, gracias por tu carta.", "comma-after-greeting"], ["Querido Tomás: gracias por tu carta.", "lowercase-after-greeting"]], "En español, ¿qué signo va después del saludo de una carta, y cómo empieza el texto?", "Después del saludo van dos puntos, y el texto empieza con mayúscula."],
  },
  {
    en: ["", "Mia had a clear goal: to finish the marathon.", [["Mia had a clear goal; to finish the marathon.", "semicolon-for-colon"], ["Mia had: a clear goal, to finish the marathon.", "colon-after-incomplete-clause"]], "The end of the sentence explains what the goal was.", "A colon after a complete sentence introduces the explanation."],
    es: ["", "El equipo tenía una meta clara: terminar el maratón.", [["El equipo tenía una meta clara; terminar el maratón.", "semicolon-for-colon"], ["El equipo tenía una meta clara: Terminar el maratón.", "capital-after-colon"]], "La última parte explica cuál era la meta.", "Los dos puntos introducen la explicación, que sigue con minúscula."],
  },
];

const SEMICOLON_COLON = skill(
  { id: "e.semicolon.colon", grade: "9", title: { en: "Semicolons and colons", es: "Punto y coma y dos puntos" }, standard: "L.9-10.2a", prereqs: ["e.combining.sentences"] },
  [
    {
      bank: SEMICOLONS,
      ask: PUNCTUATED,
      hints: {
        en: ["Are there two complete sentences, or a list whose items already contain commas?", "A semicolon joins two closely related complete sentences, and goes before words like “however” when they join two sentences, with a comma after. It also separates list items that already have commas. A comma alone cannot join two sentences."],
        es: ["¿Hay dos oraciones completas relacionadas, o una serie cuyos elementos ya llevan coma?", "El punto y coma separa oraciones relacionadas, va antes de conectores como “sin embargo” o “por lo tanto” (que llevan coma después) y separa elementos de una serie que ya tienen coma. Antes de una lista no va punto y coma: van dos puntos."],
      },
      seconds: 25,
    },
    {
      bank: COLONS,
      ask: PUNCTUATED,
      hints: {
        en: ["Is there a complete sentence before the colon?", "Use a colon after a complete sentence to introduce a list, an example, or an explanation, and between hours and minutes. Do not put a colon right after a verb or after “such as.”"],
        es: ["¿Qué introducen los dos puntos: una lista, una cita, una explicación o el texto de una carta?", "Van dos puntos después del saludo de una carta, antes de una cita textual y antes de una lista o una explicación. No van entre el verbo y lo que lo completa. Después de ellos se sigue con minúscula, salvo en el texto de una carta o en una cita."],
      },
      seconds: 25,
    },
  ],
);

export { PARALLEL, SEMICOLON_COLON };
