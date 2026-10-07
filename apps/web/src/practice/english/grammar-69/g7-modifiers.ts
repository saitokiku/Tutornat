import { skill, PUNCTUATED, type Bi, type Entry } from "./shared";

// Grade 7: misplaced and dangling modifiers; commas between adjectives.

// ---------------------------------------------------------------------------------------------------
// e.modifiers — level 1: the meaning is given; pick the sentence that puts each describing phrase next to
// the word it describes (Spanish classics: "camisas de algodón para hombre", "cuna de madera para bebé");
// level 2: fix a dangling modifier (Spanish: gerundio y participio colgantes).

const MISPLACED: Bi<Entry>[] = [
  {
    en: ["The girl is wearing a pink sweater. She is walking her dog.", "The girl in a pink sweater walked her dog.", [["The girl walked her dog in a pink sweater.", "misplaced-modifier"], ["In a pink sweater, her dog was walked by the girl.", "misplaced-modifier"]], "Who wears the sweater? Put the phrase right next to that word.", "“In a pink sweater” goes right after “the girl.”"],
    es: ["Las camisas son de algodón y son para hombre.", "Se venden camisas de algodón para hombre.", [["Se venden camisas para hombre de algodón.", "misplaced-modifier"], ["De algodón se venden camisas para hombre.", "misplaced-modifier"]], "¿Qué es de algodón: las camisas o el hombre?", "“De algodón” va junto a “camisas”."],
  },
  {
    en: ["Mia ate nearly all of the pizza. One slice was left.", "Mia ate almost the whole pizza.", [["Mia almost ate the whole pizza.", "misplaced-modifier"], ["Almost Mia ate the whole pizza.", "misplaced-modifier"]], "What is “almost”: the eating, or the whole pizza?", "“Almost” goes right before “the whole pizza,” because she ate nearly all of it."],
    es: ["La cuna es de madera y es para bebé.", "Vendo cuna de madera para bebé.", [["Vendo cuna para bebé de madera.", "misplaced-modifier"], ["De madera vendo cuna para bebé.", "misplaced-modifier"]], "¿Qué es de madera: la cuna o el bebé?", "“De madera” va junto a “cuna”."],
  },
  {
    en: ["The bike has a broken chain. I bought it from my neighbor.", "I bought a bike with a broken chain from my neighbor.", [["I bought a bike from my neighbor with a broken chain.", "misplaced-modifier"], ["With a broken chain, I bought a bike from my neighbor.", "misplaced-modifier"]], "What has the broken chain?", "“With a broken chain” goes right after “a bike.”"],
    es: ["La niña lleva un suéter rosa. Pasea a su perro.", "La niña del suéter rosa pasea a su perro.", [["La niña pasea a su perro de suéter rosa.", "misplaced-modifier"], ["De suéter rosa, el perro es paseado por la niña.", "misplaced-modifier"]], "¿Quién lleva el suéter?", "“Del suéter rosa” va junto a “la niña”."],
  },
  {
    en: ["The wallet was full of cash. Ana found it on the sidewalk.", "Ana found a wallet full of cash on the sidewalk.", [["Ana found a wallet on the sidewalk full of cash.", "misplaced-modifier"], ["Full of cash, Ana found a wallet on the sidewalk.", "misplaced-modifier"]], "What was full of cash?", "“Full of cash” goes right after “a wallet.”"],
    es: ["Mía se comió la pizza y solo dejó una rebanada.", "Mía se comió casi toda la pizza.", [["Mía casi se comió toda la pizza.", "misplaced-modifier"], ["Casi Mía se comió toda la pizza.", "misplaced-modifier"]], "¿Qué es “casi”: comer, o toda la pizza?", "“Casi” va antes de “toda la pizza”, porque se comió casi toda."],
  },
  {
    en: ["The cookies were warm from the oven. The baker handed them to the children.", "The baker handed the cookies, warm from the oven, to the children.", [["The baker handed the cookies to the children warm from the oven.", "misplaced-modifier"], ["Warm from the oven, the baker handed the cookies to the children.", "misplaced-modifier"]], "What was warm from the oven?", "“Warm from the oven” goes right after “the cookies.”"],
    es: ["La bicicleta tiene la cadena rota. Se la compré a mi vecino.", "Le compré a mi vecino una bicicleta con la cadena rota.", [["Le compré una bicicleta a mi vecino con la cadena rota.", "misplaced-modifier"], ["Con la cadena rota, le compré a mi vecino una bicicleta.", "misplaced-modifier"]], "¿Qué tiene la cadena rota?", "“Con la cadena rota” va junto a “una bicicleta”."],
  },
  {
    en: ["The dog had a long, fluffy tail. The vet examined it.", "The vet examined the dog with a long, fluffy tail.", [["With a long, fluffy tail, the vet examined the dog.", "misplaced-modifier"], ["The vet with a long, fluffy tail examined the dog.", "misplaced-modifier"]], "What has the fluffy tail?", "“With a long, fluffy tail” goes right after “the dog.”"],
    es: ["La cartera estaba llena de billetes. Ana la encontró en la acera.", "Ana encontró en la acera una cartera llena de billetes.", [["Ana encontró una cartera en la acera llena de billetes.", "misplaced-modifier"], ["Llena de billetes, Ana encontró una cartera en la acera.", "misplaced-modifier"]], "¿Qué estaba llena de billetes?", "“Llena de billetes” va junto a “una cartera”."],
  },
  {
    en: ["The letter was written in purple ink. Jamal read it to his class.", "Jamal read the letter written in purple ink to his class.", [["Jamal read the letter to his class written in purple ink.", "misplaced-modifier"], ["Written in purple ink, Jamal read the letter to his class.", "misplaced-modifier"]], "What was written in purple ink?", "“Written in purple ink” goes right after “the letter.”"],
    es: ["El niño tiene un brazo roto. La enfermera lo ayudó a subir a la cama.", "La enfermera ayudó al niño del brazo roto a subir a la cama.", [["La enfermera del brazo roto ayudó al niño a subir a la cama.", "misplaced-modifier"], ["La enfermera ayudó al niño a subir a la cama del brazo roto.", "misplaced-modifier"]], "¿Quién tiene el brazo roto?", "“Del brazo roto” va junto a “al niño”."],
  },
  {
    en: ["The boy has a broken arm. The nurse helped him onto the bed.", "The nurse helped the boy with a broken arm onto the bed.", [["The nurse with a broken arm helped the boy onto the bed.", "misplaced-modifier"], ["The nurse helped the boy onto the bed with a broken arm.", "misplaced-modifier"]], "Who has the broken arm?", "“With a broken arm” goes right after “the boy.”"],
    es: ["El sándwich tenía queso extra. Maya lo pidió en la cafetería.", "En la cafetería, Maya pidió un sándwich con queso extra.", [["Maya pidió un sándwich en la cafetería con queso extra.", "misplaced-modifier"], ["Con queso extra, Maya pidió un sándwich en la cafetería.", "misplaced-modifier"]], "¿Qué tenía queso extra?", "“Con queso extra” va junto a “un sándwich”."],
  },
  {
    en: ["The sandwich had extra cheese. Maya ordered it at the café.", "At the café, Maya ordered a sandwich with extra cheese.", [["Maya ordered a sandwich at the café with extra cheese.", "misplaced-modifier"], ["With extra cheese, Maya ordered a sandwich at the café.", "misplaced-modifier"]], "What had extra cheese?", "“With extra cheese” goes right after “a sandwich.”"],
    es: ["El gatito estaba escondido debajo del porche. Rosa lo encontró.", "Rosa encontró al gatito escondido debajo del porche.", [["Escondida debajo del porche, Rosa encontró al gatito.", "misplaced-modifier"], ["Rosa, escondida debajo del porche, encontró al gatito.", "misplaced-modifier"]], "¿Quién estaba escondido?", "“Escondido debajo del porche” va junto a “al gatito”."],
  },
  {
    en: ["The kitten was hiding under the porch. Rosa found it.", "Rosa found the kitten hiding under the porch.", [["Hiding under the porch, Rosa found the kitten.", "misplaced-modifier"], ["Rosa, hiding under the porch, found the kitten.", "misplaced-modifier"]], "Who was hiding?", "“Hiding under the porch” goes right after “the kitten.”"],
    es: ["La bufanda la tejió mi abuela. Me la puse para ir a la escuela.", "Para ir a la escuela, me puse la bufanda que tejió mi abuela.", [["Me puse la bufanda para ir a la escuela que tejió mi abuela.", "misplaced-modifier"], ["Tejida por mi abuela, me puse la bufanda para ir a la escuela.", "misplaced-modifier"]], "¿Qué tejió la abuela?", "“Que tejió mi abuela” va junto a “la bufanda”."],
  },
  {
    en: ["The tickets cost five dollars each. Sam bought two of them for the concert.", "For the concert, Sam bought two tickets that cost five dollars each.", [["Sam bought two tickets for the concert that cost five dollars each.", "misplaced-modifier"], ["That cost five dollars each, Sam bought two tickets for the concert.", "misplaced-modifier"]], "What cost five dollars each?", "“That cost five dollars each” goes right after “two tickets.”"],
    es: ["Las galletas estaban recién horneadas. El panadero se las dio a los niños.", "El panadero les dio a los niños las galletas recién horneadas.", [["El panadero les dio las galletas a los niños recién horneados.", "misplaced-modifier"], ["Recién horneado, el panadero les dio las galletas a los niños.", "misplaced-modifier"]], "¿Qué estaba recién horneado?", "“Recién horneadas” va junto a “las galletas”."],
  },
  {
    en: ["The puppy had muddy paws. It ran across our clean kitchen floor.", "The puppy with muddy paws ran across our clean kitchen floor.", [["The puppy ran across our clean kitchen floor with muddy paws.", "misplaced-modifier"], ["With muddy paws, our clean kitchen floor was crossed by the puppy.", "misplaced-modifier"]], "What had muddy paws?", "“With muddy paws” goes right after “the puppy.”"],
    es: ["El perro tenía una cola larga y peluda. El veterinario lo revisó.", "El veterinario revisó al perro de cola larga y peluda.", [["El veterinario de cola larga y peluda revisó al perro.", "misplaced-modifier"], ["De cola larga y peluda, el veterinario revisó al perro.", "misplaced-modifier"]], "¿Quién tiene la cola peluda?", "“De cola larga y peluda” va junto a “al perro”."],
  },
  {
    en: ["The scarf was knitted by my grandmother. I wore it to school.", "I wore the scarf knitted by my grandmother to school.", [["I wore the scarf to school knitted by my grandmother.", "misplaced-modifier"], ["Knitted by my grandmother, I wore the scarf to school.", "misplaced-modifier"]], "What did Grandmother knit?", "“Knitted by my grandmother” goes right after “the scarf.”"],
    es: ["La carta estaba escrita con tinta morada. Jamal se la leyó a su clase.", "Jamal le leyó a su clase la carta escrita con tinta morada.", [["Jamal le leyó la carta a su clase escrita con tinta morada.", "misplaced-modifier"], ["Escrito con tinta morada, Jamal le leyó la carta a su clase.", "misplaced-modifier"]], "¿Qué estaba escrito con tinta morada?", "“Escrita con tinta morada” va junto a “la carta”."],
  },
  {
    en: ["The coach was holding a stopwatch. She timed the runners.", "Holding a stopwatch, the coach timed the runners.", [["The coach timed the runners holding a stopwatch.", "misplaced-modifier"], ["Holding a stopwatch, the runners were timed by the coach.", "misplaced-modifier"]], "Who held the stopwatch?", "“Holding a stopwatch” goes right next to “the coach.”"],
    es: ["Los boletos costaban cinco dólares cada uno. Sam compró dos para el concierto.", "Para el concierto, Sam compró dos boletos de cinco dólares cada uno.", [["Sam compró dos boletos para el concierto de cinco dólares cada uno.", "misplaced-modifier"], ["De cinco dólares cada uno, Sam compró dos boletos para el concierto.", "misplaced-modifier"]], "¿Qué costaba cinco dólares?", "“De cinco dólares cada uno” va junto a “dos boletos”."],
  },
];

const DANGLING: Bi<Entry>[] = [
  {
    en: ["Walking to school, the rain started to fall.", "As I was walking to school, the rain started to fall.", [["Walking to school, the rain fell harder.", "still-dangling"], ["The rain, walking to school, started to fall.", "misplaced-modifier"], ["I stayed home while the rain fell.", "changed-meaning"]], "Who was walking to school? The rain cannot walk.", "Give the walking its own subject: “As I was walking.”"],
    es: ["Caminando hacia la escuela, la lluvia me mojó toda.", "Mientras caminaba hacia la escuela, la lluvia me mojó toda.", [["Caminando hacia la escuela, la lluvia cayó más fuerte.", "still-dangling"], ["La lluvia, caminando hacia la escuela, me mojó toda.", "misplaced-modifier"], ["Me quedé en casa mientras llovía.", "changed-meaning"]], "¿Quién caminaba? La lluvia no camina.", "El gerundio tiene que referirse a quien de verdad camina: “mientras (yo) caminaba”."],
  },
  {
    en: ["After finishing my homework, the TV was turned on.", "After finishing my homework, I turned on the TV.", [["After finishing my homework, the TV came on.", "still-dangling"], ["The TV, after finishing my homework, was turned on.", "misplaced-modifier"], ["Before finishing my homework, I turned on the TV.", "changed-meaning"]], "Who finished the homework? Not the TV.", "Put the person who finished right after the comma: “I.”"],
    es: ["Después de terminar la tarea, la televisión fue encendida.", "Después de terminar la tarea, encendí la televisión.", [["Después de terminar la tarea, la televisión se encendió.", "still-dangling"], ["La televisión, después de terminar la tarea, fue encendida.", "misplaced-modifier"], ["Antes de terminar la tarea, encendí la televisión.", "changed-meaning"]], "¿Quién terminó la tarea? La televisión no.", "Quien termina la tarea tiene que ser el sujeto: “encendí” (yo)."],
  },
  {
    en: ["While eating lunch, a bee landed on my sandwich.", "While I was eating lunch, a bee landed on my sandwich.", [["While eating lunch, a bee buzzed onto my sandwich.", "still-dangling"], ["A bee, while eating lunch, landed on my sandwich.", "misplaced-modifier"], ["While I was eating lunch, I chased away every bee.", "changed-meaning"]], "Who was eating lunch? Not the bee.", "Give the eating its own subject: “While I was eating lunch.”"],
    es: ["Comiendo el almuerzo, una abeja se posó en mi sándwich.", "Mientras yo comía el almuerzo, una abeja se posó en mi sándwich.", [["Comiendo el almuerzo, una abeja zumbó sobre mi sándwich.", "still-dangling"], ["Una abeja, comiendo el almuerzo, se posó en mi sándwich.", "misplaced-modifier"], ["Mientras yo comía el almuerzo, espanté a todas las abejas.", "changed-meaning"]], "¿Quién comía el almuerzo? La abeja no.", "Dale a la acción su propio sujeto: “Mientras yo comía”."],
  },
  {
    en: ["To win the race, hard training is needed.", "To win the race, you need to train hard.", [["To win the race, hard training is necessary.", "still-dangling"], ["Hard training, to win the race, is needed.", "still-dangling"], ["To win the race, the race needs training.", "changed-meaning"]], "Who wants to win the race? Training cannot win.", "Name the person who wants to win right after the comma: “you.”"],
    es: ["Habiendo perdido la llave, la puerta no se abrió.", "Como María perdió la llave, no pudo abrir la puerta.", [["Habiendo perdido la llave, la puerta siguió cerrada.", "still-dangling"], ["La puerta, habiendo perdido la llave, no se abrió.", "misplaced-modifier"], ["Como María encontró la llave, abrió la puerta.", "changed-meaning"]], "¿Quién perdió la llave? La puerta no.", "Convierte la frase en una oración con su propio sujeto: “Como María perdió la llave”."],
  },
  {
    en: ["Having lost the key, the door would not open.", "Having lost the key, Maria could not open the door.", [["Having lost the key, the door stayed locked.", "still-dangling"], ["The door, having lost the key, would not open.", "misplaced-modifier"], ["Having found the key, Maria opened the door.", "changed-meaning"]], "Who lost the key? Not the door.", "Put the person who lost it right after the comma: “Maria.”"],
    es: ["Emocionados por el viaje, el trayecto en autobús se hizo corto.", "Emocionados por el viaje, sentimos que el trayecto en autobús fue corto.", [["Emocionados por el viaje, el trayecto en autobús fue rápido.", "still-dangling"], ["El trayecto en autobús, emocionado por el viaje, se hizo corto.", "misplaced-modifier"], ["Aburridos del viaje, sentimos que el trayecto fue largo.", "changed-meaning"]], "¿Quiénes estaban emocionados? El trayecto no.", "El participio tiene que referirse al sujeto: “sentimos” (nosotros)."],
  },
  {
    en: ["Excited about the trip, the bus ride felt short.", "Excited about the trip, we felt that the bus ride was short.", [["Excited about the trip, the bus ride was quick.", "still-dangling"], ["The bus ride, excited about the trip, felt short.", "misplaced-modifier"], ["Bored by the trip, we felt that the bus ride was long.", "changed-meaning"]], "Who was excited? A bus ride cannot be.", "Put the people who were excited right after the comma: “we.”"],
    es: ["Mirando por el telescopio, los anillos de Saturno se veían claramente.", "Mirando por el telescopio, Omar veía claramente los anillos de Saturno.", [["Mirando por el telescopio, los anillos de Saturno brillaban.", "still-dangling"], ["Los anillos de Saturno, mirando por el telescopio, se veían claramente.", "misplaced-modifier"], ["Omar vio los anillos de Saturno sin telescopio.", "changed-meaning"]], "¿Quién miraba? Los anillos no miran.", "El gerundio tiene que referirse a quien mira: Omar."],
  },
  {
    en: ["Looking through the telescope, Saturn's rings were visible.", "Looking through the telescope, Omar could see Saturn's rings.", [["Looking through the telescope, Saturn's rings looked bright.", "still-dangling"], ["Saturn's rings, looking through the telescope, were visible.", "misplaced-modifier"], ["Omar saw Saturn's rings without a telescope.", "changed-meaning"]], "Who was looking? The rings cannot look.", "Put the person looking right after the comma: “Omar.”"],
    es: ["Después de ensayar durante semanas, la canción sonó perfecta.", "Después de ensayar durante semanas, la banda tocó la canción a la perfección.", [["Después de ensayar durante semanas, la canción quedó perfecta.", "still-dangling"], ["La canción, después de ensayar durante semanas, sonó perfecta.", "misplaced-modifier"], ["Después de semanas sin ensayar, la banda olvidó la canción.", "changed-meaning"]], "¿Quién ensayó? La canción no ensaya.", "Quien ensaya tiene que ser el sujeto: la banda."],
  },
  {
    en: ["After practicing for weeks, the song sounded perfect.", "After practicing for weeks, the band played the song perfectly.", [["After practicing for weeks, the song was perfect.", "still-dangling"], ["The song, after practicing for weeks, sounded perfect.", "misplaced-modifier"], ["After weeks without practice, the band forgot the song.", "changed-meaning"]], "Who practiced? A song cannot practice.", "Put the band right after the comma."],
    es: ["Corriendo para alcanzar el autobús, la mochila se abrió.", "Mientras corría para alcanzar el autobús, la mochila se me abrió.", [["Corriendo para alcanzar el autobús, la mochila se cayó.", "still-dangling"], ["La mochila, corriendo para alcanzar el autobús, se abrió.", "misplaced-modifier"], ["Mientras corría para alcanzar el autobús, cerré la mochila.", "changed-meaning"]], "¿Quién corría? La mochila no corre.", "Dale a la acción su propio sujeto: “Mientras (yo) corría”."],
  },
  {
    en: ["Running to catch the bus, my backpack fell open.", "As I ran to catch the bus, my backpack fell open.", [["Running to catch the bus, my backpack spilled everywhere.", "still-dangling"], ["My backpack, running to catch the bus, fell open.", "misplaced-modifier"], ["As I ran to catch the bus, I zipped my backpack shut.", "changed-meaning"]], "Who was running? A backpack cannot run.", "Give the running its own subject: “As I ran.”"],
    es: ["Cansada de la caminata, el sofá se veía muy cómodo.", "Como Ella estaba cansada de la caminata, el sofá le pareció muy cómodo.", [["Cansada de la caminata, el sofá se veía blando.", "still-dangling"], ["El sofá, cansado de la caminata, se veía muy cómodo.", "misplaced-modifier"], ["Ella no estaba cansada, así que no usó el sofá.", "changed-meaning"]], "¿Quién estaba cansada? El sofá no.", "Convierte la frase en una oración con su propio sujeto: “Como Ella estaba cansada”."],
  },
  {
    en: ["At the age of five, my family moved to Ohio.", "When I was five, my family moved to Ohio.", [["At the age of five, my family moved to Ohio from Texas.", "still-dangling"], ["My family, at the age of five, moved to Ohio.", "misplaced-modifier"], ["When my family moved to Ohio, I was ten.", "changed-meaning"]], "Who was five years old? Not the whole family.", "Give the age its own subject: “When I was five.”"],
    es: ["Abriendo la caja, un cachorro saltó afuera.", "Cuando Leo abrió la caja, un cachorro saltó afuera.", [["Abriendo la caja, un cachorro pequeño saltó afuera.", "still-dangling"], ["Un cachorro, abriendo la caja, saltó afuera.", "misplaced-modifier"], ["Cuando el cachorro abrió la caja, Leo saltó afuera.", "changed-meaning"]], "¿Quién abrió la caja? El cachorro estaba adentro.", "Dale a la acción su propio sujeto: “Cuando Leo abrió la caja”."],
  },
  {
    en: ["Tired from the hike, the couch looked inviting.", "Because Ella was tired from the hike, the couch looked inviting to her.", [["Tired from the hike, the couch looked soft.", "still-dangling"], ["The couch, tired from the hike, looked inviting.", "misplaced-modifier"], ["Ella was not tired, so she skipped the couch.", "changed-meaning"]], "Who was tired? A couch cannot hike.", "Give the tiredness its own subject: “Because Ella was tired.”"],
    es: ["Lavándome los dientes, sonó el teléfono.", "Mientras me lavaba los dientes, sonó el teléfono.", [["Lavándome los dientes, el teléfono sonó dos veces.", "still-dangling"], ["El teléfono, lavándome los dientes, sonó.", "misplaced-modifier"], ["Mientras me lavaba los dientes, llamé a una amiga.", "changed-meaning"]], "¿Quién se lavaba los dientes? El teléfono no.", "Dale a la acción su propio sujeto: “Mientras me lavaba”."],
  },
  {
    en: ["Opening the box, a puppy jumped out.", "When Leo opened the box, a puppy jumped out.", [["Opening the box, a small puppy jumped out.", "still-dangling"], ["A puppy, opening the box, jumped out.", "misplaced-modifier"], ["When the puppy opened the box, Leo jumped out.", "changed-meaning"]], "Who opened the box? The puppy was inside it.", "Give the opening its own subject: “When Leo opened the box.”"],
    es: ["Atrapados en el tráfico, el concierto empezó sin nosotros.", "Como estábamos atrapados en el tráfico, el concierto empezó sin nosotros.", [["Atrapados en el tráfico, el concierto empezó tarde.", "still-dangling"], ["El concierto, atrapado en el tráfico, empezó sin nosotros.", "misplaced-modifier"], ["Como el concierto estaba atrapado en el tráfico, empezamos sin él.", "changed-meaning"]], "¿Quiénes estaban atrapados en el tráfico? El concierto no.", "Convierte la frase en una oración con su propio sujeto: “Como estábamos atrapados”."],
  },
  {
    en: ["While brushing my teeth, the phone rang.", "While I was brushing my teeth, the phone rang.", [["While brushing my teeth, the phone rang twice.", "still-dangling"], ["The phone, while brushing my teeth, rang.", "misplaced-modifier"], ["While I was brushing my teeth, I called a friend.", "changed-meaning"]], "Who was brushing? Not the phone.", "Give the brushing its own subject: “While I was brushing.”"],
    es: ["Pintado de azul, mi abuelo terminó el barco.", "Mi abuelo terminó el barco pintado de azul.", [["Pintado de azul, mi abuelo terminó el barco ayer.", "still-dangling"], ["Mi abuelo, pintado de azul, terminó el barco.", "misplaced-modifier"], ["Mi abuelo pintó de rojo el barco.", "changed-meaning"]], "¿Qué estaba pintado de azul? El abuelo no.", "“Pintado de azul” va junto a “el barco”."],
  },
  {
    en: ["Stuck in traffic, the concert started without us.", "Because we were stuck in traffic, the concert started without us.", [["Stuck in traffic, the concert began late.", "still-dangling"], ["The concert, stuck in traffic, started without us.", "misplaced-modifier"], ["Because the concert was stuck in traffic, we started without it.", "changed-meaning"]], "Who was stuck in traffic? Not the concert.", "Give the phrase its own subject: “Because we were stuck.”"],
    es: ["Asustado por los truenos, mi mamá abrazó al perro.", "Mi mamá abrazó al perro, que estaba asustado por los truenos.", [["Asustado por los truenos, mi mamá abrazó al perro con fuerza.", "still-dangling"], ["Mi mamá, asustada por los truenos, abrazó al perro.", "changed-meaning"], ["El perro abrazó a mi mamá durante los truenos.", "changed-meaning"]], "“Asustado” es masculino. ¿Quién estaba asustado?", "El asustado era el perro: “al perro, que estaba asustado”."],
  },
];

const MODIFIERS = skill(
  { id: "e.modifiers", grade: "7", title: { en: "Misplaced and dangling modifiers", es: "Modificadores bien colocados" }, standard: "L.7.1c", prereqs: ["e.phrases.clauses"] },
  [
    {
      bank: MISPLACED,
      ask: { en: "Which sentence says this clearly, with each describing phrase next to the word it describes?", es: "¿Qué oración lo dice con claridad, con cada modificador junto a la palabra que describe?" },
      hints: {
        en: ["Find each describing phrase and ask what it describes.", "Put a describing phrase right next to the word it describes. Words like “almost” go right before the word they limit."],
        es: ["Busca cada modificador y pregúntate qué describe.", "Pon el modificador junto a la palabra que describe. Palabras como “casi” van justo antes de la palabra que limitan."],
      },
      seconds: 30,
    },
    {
      bank: DANGLING,
      ask: { en: "Which revision fixes the dangling modifier?", es: "¿Qué versión corrige el modificador colgante?" },
      hints: {
        en: ["Who or what is doing the action in the opening phrase?", "An opening phrase describes the subject right after the comma. Put the real doer there, or turn the phrase into a clause with its own subject."],
        es: ["¿Quién hace la acción del gerundio, del participio o del infinitivo del principio?", "La frase del inicio se refiere al sujeto que viene después de la coma. Pon ahí a quien de verdad hace la acción, o convierte la frase en una oración con su propio sujeto (mientras yo…, como ella…)."],
      },
      seconds: 35,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.coordinate.adjectives — English: a comma between coordinate adjectives (they can swap places and
// take "and"), none between cumulative ones, and never one before the noun. Spanish: adjectives in a
// series take commas, but no comma before "y", and none between a noun and its adjective.

const ADJECTIVE_COMMAS: Bi<Entry>[] = [
  {
    en: ["", "It was a fascinating, enjoyable movie.", [["It was a fascinating enjoyable movie.", "missing-comma-coordinate"], ["It was a fascinating, enjoyable, movie.", "comma-before-noun"]], "Try “an enjoyable, fascinating movie” and “a fascinating and enjoyable movie.” Do they sound right?", "The adjectives can switch places and be joined by “and,” so a comma goes between them."],
    es: ["", "Fue una película fascinante, divertida y emocionante.", [["Fue una película fascinante, divertida, y emocionante.", "comma-before-y"], ["Fue una película, fascinante, divertida y emocionante.", "comma-between-noun-and-adjective"], ["Fue una película fascinante divertida y emocionante.", "missing-comma-series"]], "Hay tres adjetivos en serie. ¿Qué va entre los dos primeros, y qué pasa antes de “y”?", "En una serie, los adjetivos se separan con comas, pero antes de “y” no va coma."],
  },
  {
    en: ["", "He wore an old green shirt.", [["He wore an old, green shirt.", "comma-between-cumulative"], ["He wore an old green, shirt.", "comma-before-noun"]], "Try “a green old shirt” and “an old and green shirt.” Do they sound right?", "The adjectives cannot switch places or take “and,” so no comma goes between them."],
    es: ["", "Llevaba una camisa vieja y verde.", [["Llevaba una camisa vieja, y verde.", "comma-before-y"], ["Llevaba una camisa, vieja y verde.", "comma-between-noun-and-adjective"]], "Hay dos adjetivos unidos por “y”.", "Dos adjetivos unidos por “y” no llevan coma, y el sustantivo no se separa de su adjetivo."],
  },
  {
    en: ["", "The tired, hungry hikers reached the cabin.", [["The tired hungry hikers reached the cabin.", "missing-comma-coordinate"], ["The tired, hungry, hikers reached the cabin.", "comma-before-noun"]], "Try “the hungry, tired hikers” and “the tired and hungry hikers.”", "The adjectives can switch places and take “and,” so a comma goes between them."],
    es: ["", "Adoptamos un cachorro pequeño, café y juguetón.", [["Adoptamos un cachorro pequeño, café, y juguetón.", "comma-before-y"], ["Adoptamos un cachorro pequeño café y juguetón.", "missing-comma-series"], ["Adoptamos un cachorro, pequeño, café y juguetón.", "comma-between-noun-and-adjective"]], "Hay tres adjetivos en serie.", "En una serie, los adjetivos se separan con comas, pero antes de “y” no va coma."],
  },
  {
    en: ["", "We adopted a little brown puppy.", [["We adopted a little, brown puppy.", "comma-between-cumulative"], ["We adopted a little brown, puppy.", "comma-before-noun"]], "Try “a brown little puppy” and “a little and brown puppy.”", "The adjectives cannot switch places or take “and,” so no comma goes between them."],
    es: ["", "Fue una tarde fría y lluviosa.", [["Fue una tarde fría, y lluviosa.", "comma-before-y"], ["Fue una tarde, fría y lluviosa.", "comma-between-noun-and-adjective"]], "Hay dos adjetivos unidos por “y”.", "Dos adjetivos unidos por “y” no llevan coma, y el sustantivo no se separa de su adjetivo."],
  },
  {
    en: ["", "It was a cold, rainy afternoon.", [["It was a cold rainy afternoon.", "missing-comma-coordinate"], ["It was a cold, rainy, afternoon.", "comma-before-noun"]], "Try “a rainy, cold afternoon” and “a cold and rainy afternoon.”", "The adjectives can switch places and take “and,” so a comma goes between them."],
    es: ["", "Compró tres manzanas rojas.", [["Compró tres, manzanas rojas.", "comma-between-cumulative"], ["Compró tres manzanas, rojas.", "comma-between-noun-and-adjective"]], "“Tres” y “manzanas rojas” van juntas: no es una serie.", "Las palabras que van juntas no se separan con coma."],
  },
  {
    en: ["", "She bought three red apples.", [["She bought three, red apples.", "comma-between-cumulative"], ["She bought three red, apples.", "comma-before-noun"]], "Try “red three apples” and “three and red apples.”", "A number and an adjective cannot switch places or take “and,” so no comma."],
    es: ["", "El salón era luminoso, alegre y ordenado.", [["El salón era luminoso, alegre, y ordenado.", "comma-before-y"], ["El salón era luminoso alegre y ordenado.", "missing-comma-series"]], "Hay tres adjetivos en serie.", "En una serie, los adjetivos se separan con comas, pero antes de “y” no va coma."],
  },
  {
    en: ["", "The bright, cheerful classroom made everyone smile.", [["The bright cheerful classroom made everyone smile.", "missing-comma-coordinate"], ["The bright, cheerful, classroom made everyone smile.", "comma-before-noun"]], "Try “the cheerful, bright classroom” and “the bright and cheerful classroom.”", "The adjectives can switch places and take “and,” so a comma goes between them."],
    es: ["", "Mi abuelo tiene una gran mesa de madera.", [["Mi abuelo tiene una gran, mesa de madera.", "comma-between-cumulative"], ["Mi abuelo tiene una gran mesa, de madera.", "comma-between-noun-and-adjective"]], "“Gran mesa de madera” es un solo grupo: no es una serie.", "Las palabras que van juntas no se separan con coma."],
  },
  {
    en: ["", "My grandfather has a big wooden table.", [["My grandfather has a big, wooden table.", "comma-between-cumulative"], ["My grandfather has a big wooden, table.", "comma-before-noun"]], "Try “a wooden big table” and “a big and wooden table.”", "The adjectives cannot switch places or take “and,” so no comma goes between them."],
    es: ["", "El gimnasio estaba ruidoso, lleno y caluroso.", [["El gimnasio estaba ruidoso, lleno, y caluroso.", "comma-before-y"], ["El gimnasio estaba ruidoso lleno y caluroso.", "missing-comma-series"]], "Hay tres adjetivos en serie.", "En una serie, los adjetivos se separan con comas, pero antes de “y” no va coma."],
  },
  {
    en: ["", "The loud, crowded gym was full of fans.", [["The loud crowded gym was full of fans.", "missing-comma-coordinate"], ["The loud, crowded, gym was full of fans.", "comma-before-noun"]], "Try “the crowded, loud gym” and “the loud and crowded gym.”", "The adjectives can switch places and take “and,” so a comma goes between them."],
    es: ["", "Kenji encontró una moneda plateada y brillante.", [["Kenji encontró una moneda, plateada y brillante.", "comma-between-noun-and-adjective"], ["Kenji encontró una moneda plateada, y brillante.", "comma-before-y"]], "Hay dos adjetivos unidos por “y”.", "Dos adjetivos unidos por “y” no llevan coma, y el sustantivo no se separa de su adjetivo."],
  },
  {
    en: ["", "Kenji found a shiny silver coin.", [["Kenji found a shiny, silver coin.", "comma-between-cumulative"], ["Kenji found a shiny silver, coin.", "comma-before-noun"]], "Try “a silver shiny coin” and “a shiny and silver coin.”", "The adjectives do not sound right swapped or with “and,” so no comma goes between them."],
    es: ["", "Fue un examen largo y difícil.", [["Fue un examen largo, y difícil.", "comma-before-y"], ["Fue un examen, largo y difícil.", "comma-between-noun-and-adjective"]], "Hay dos adjetivos unidos por “y”.", "Dos adjetivos unidos por “y” no llevan coma, y el sustantivo no se separa de su adjetivo."],
  },
  {
    en: ["", "It was a long, difficult test.", [["It was a long difficult test.", "missing-comma-coordinate"], ["It was a long, difficult, test.", "comma-before-noun"]], "Try “a difficult, long test” and “a long and difficult test.”", "The adjectives can switch places and take “and,” so a comma goes between them."],
    es: ["", "Nos sentamos en el pasto suave, verde y fresco.", [["Nos sentamos en el pasto suave, verde, y fresco.", "comma-before-y"], ["Nos sentamos en el pasto suave verde y fresco.", "missing-comma-series"], ["Nos sentamos en el pasto, suave, verde y fresco.", "comma-between-noun-and-adjective"]], "Hay tres adjetivos en serie.", "En una serie, los adjetivos se separan con comas, pero antes de “y” no va coma."],
  },
  {
    en: ["", "We sat on the soft green grass.", [["We sat on the soft, green grass.", "comma-between-cumulative"], ["We sat on the soft green, grass.", "comma-before-noun"]], "Try “the green soft grass” and “the soft and green grass.”", "The adjectives do not sound right swapped or with “and,” so no comma goes between them."],
    es: ["", "Ana se puso sus tenis azules favoritos.", [["Ana se puso sus tenis, azules favoritos.", "comma-between-noun-and-adjective"], ["Ana se puso sus tenis azules, favoritos.", "comma-between-cumulative"]], "“Tenis azules favoritos” es un solo grupo: no es una serie.", "Las palabras que van juntas no se separan con coma."],
  },
  {
    en: ["", "The friendly, helpful librarian found my book.", [["The friendly helpful librarian found my book.", "missing-comma-coordinate"], ["The friendly, helpful, librarian found my book.", "comma-before-noun"]], "Try “the helpful, friendly librarian” and “the friendly and helpful librarian.”", "The adjectives can switch places and take “and,” so a comma goes between them."],
    es: ["", "Era un perro grande, peludo y cariñoso.", [["Era un perro grande, peludo, y cariñoso.", "comma-before-y"], ["Era un perro grande peludo y cariñoso.", "missing-comma-series"], ["Era un perro, grande, peludo y cariñoso.", "comma-between-noun-and-adjective"]], "Hay tres adjetivos en serie.", "En una serie, los adjetivos se separan con comas, pero antes de “y” no va coma."],
  },
  {
    en: ["", "Ana wore her favorite blue sneakers.", [["Ana wore her favorite, blue sneakers.", "comma-between-cumulative"], ["Ana wore her favorite blue, sneakers.", "comma-before-noun"]], "Try “her blue favorite sneakers” and “her favorite and blue sneakers.”", "The adjectives do not sound right swapped or with “and,” so no comma goes between them."],
    es: ["", "Mi tía hizo un pastel delicioso de chocolate.", [["Mi tía hizo un pastel delicioso, de chocolate.", "comma-between-cumulative"], ["Mi tía hizo un pastel, delicioso de chocolate.", "comma-between-noun-and-adjective"]], "“Pastel delicioso de chocolate” es un solo grupo: no es una serie.", "Las palabras que van juntas no se separan con coma."],
  },
];

const COORDINATE_ADJECTIVES = skill(
  { id: "e.coordinate.adjectives", grade: "7", title: { en: "Commas between adjectives", es: "Comas entre adjetivos" }, standard: "L.7.2a", prereqs: ["e.commas"] },
  [
    {
      bank: ADJECTIVE_COMMAS,
      ask: PUNCTUATED,
      hints: {
        en: ["Find the adjectives that come before the noun.", "Swap their order, or put “and” between them. If it still sounds right, they are coordinate: use a comma. If not, use no comma. Never put a comma between the last adjective and the noun."],
        es: ["Busca los adjetivos que describen al mismo sustantivo.", "En una serie de adjetivos, sepáralos con comas, pero no pongas coma antes de “y”. No pongas coma entre el sustantivo y su adjetivo, ni entre palabras que forman un solo grupo."],
      },
      seconds: 20,
    },
  ],
);

export { MODIFIERS, COORDINATE_ADJECTIVES };
