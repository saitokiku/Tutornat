import { skill, CHOOSE, PUNCTUATED, type Bi, type Entry } from "./shared";

// Grade 6: punctuation for asides; commonly confused words.

// ---------------------------------------------------------------------------------------------------
// e.nonrestrictive — level 1: a matching pair of commas, dashes or parentheses around extra information
// (Spanish: comas, rayas y paréntesis en incisos; the Spanish raya touches the words it encloses);
// level 2: whether the part needs commas at all, decided by the context (Spanish: explicativas van entre
// comas, especificativas no). The words never change between the choices, only the punctuation.

const ASIDE_MARKS: Bi<Entry>[] = [
  {
    en: ["", "My cousin, a talented drummer, joined the jazz band.", [["My cousin, a talented drummer joined the jazz band.", "missing-closing-mark"], ["My cousin—a talented drummer, joined the jazz band.", "mismatched-marks"], ["My cousin a talented, drummer joined the jazz band.", "mark-in-wrong-place"]], "The extra information is “a talented drummer.”", "Lift out “a talented drummer” and the sentence still works, so it needs a matching mark on each side."],
    es: ["", "Mi prima, una baterista excelente, se unió a la banda de jazz.", [["Mi prima, una baterista excelente se unió a la banda de jazz.", "missing-closing-mark"], ["Mi prima —una baterista excelente, se unió a la banda de jazz.", "mismatched-marks"], ["Mi prima una baterista, excelente se unió a la banda de jazz.", "mark-in-wrong-place"]], "El inciso es “una baterista excelente”.", "Si quitas “una baterista excelente”, la oración sigue funcionando, así que el inciso va entre dos signos iguales."],
  },
  {
    en: ["", "Our neighbor—who used to be a firefighter—teaches first aid classes.", [["Our neighbor—who used to be a firefighter, teaches first aid classes.", "mismatched-marks"], ["Our neighbor who used to be a firefighter—teaches first aid classes.", "missing-opening-mark"], ["Our neighbor—who used to be—a firefighter teaches first aid classes.", "mark-in-wrong-place"]], "The extra information is “who used to be a firefighter.”", "The aside starts with a dash, so it must end with a dash too."],
    es: ["", "Nuestro vecino —que antes era bombero— da clases de primeros auxilios.", [["Nuestro vecino —que antes era bombero, da clases de primeros auxilios.", "mismatched-marks"], ["Nuestro vecino que antes era bombero— da clases de primeros auxilios.", "missing-opening-mark"], ["Nuestro vecino —que antes era— bombero da clases de primeros auxilios.", "mark-in-wrong-place"]], "El inciso es “que antes era bombero”.", "El inciso abre con raya, así que también cierra con raya."],
  },
  {
    en: ["", "The Amazon River (the second-longest river on Earth) flows through Brazil.", [["The Amazon River (the second-longest river on Earth flows through Brazil).", "mark-in-wrong-place"], ["The Amazon River (the second-longest river on Earth, flows through Brazil.", "mismatched-marks"], ["The Amazon River the second-longest river on Earth) flows through Brazil.", "missing-opening-mark"]], "The extra information is “the second-longest river on Earth.”", "The parentheses go around the extra information only, not around the verb."],
    es: ["", "El río Amazonas (el segundo más largo del mundo) atraviesa Brasil.", [["El río Amazonas (el segundo más largo del mundo atraviesa Brasil).", "mark-in-wrong-place"], ["El río Amazonas (el segundo más largo del mundo, atraviesa Brasil.", "mismatched-marks"], ["El río Amazonas el segundo más largo del mundo) atraviesa Brasil.", "missing-opening-mark"]], "El inciso es “el segundo más largo del mundo”.", "Los paréntesis encierran solo el inciso, no el verbo."],
  },
  {
    en: ["", "Mrs. Patel, our music teacher, plays the cello.", [["Mrs. Patel our music teacher, plays the cello.", "missing-opening-mark"], ["Mrs. Patel, our music teacher plays the cello.", "missing-closing-mark"], ["Mrs. Patel, our music teacher—plays the cello.", "mismatched-marks"]], "The extra information is “our music teacher.”", "“Our music teacher” renames Mrs. Patel, so it needs a comma before and after."],
    es: ["", "La señora Patel, nuestra maestra de música, toca el violonchelo.", [["La señora Patel nuestra maestra de música, toca el violonchelo.", "missing-opening-mark"], ["La señora Patel, nuestra maestra de música toca el violonchelo.", "missing-closing-mark"], ["La señora Patel, nuestra maestra de música— toca el violonchelo.", "mismatched-marks"]], "El inciso es “nuestra maestra de música”.", "“Nuestra maestra de música” explica quién es la señora Patel, así que va entre dos comas."],
  },
  {
    en: ["", "The final score—52 to 51—surprised everyone.", [["The final score—52 to 51, surprised everyone.", "mismatched-marks"], ["The final score 52 to 51—surprised everyone.", "missing-opening-mark"], ["The final—score 52 to 51—surprised everyone.", "mark-in-wrong-place"]], "The extra information is the score itself.", "Two dashes go around “52 to 51.”"],
    es: ["", "El marcador final —52 a 51— sorprendió a todos.", [["El marcador final —52 a 51, sorprendió a todos.", "mismatched-marks"], ["El marcador final 52 a 51— sorprendió a todos.", "missing-opening-mark"], ["El marcador —final 52 a 51— sorprendió a todos.", "mark-in-wrong-place"]], "El inciso es el resultado del partido.", "Dos rayas encierran “52 a 51”."],
  },
  {
    en: ["", "Saturn, the planet famous for its rings, is a gas giant.", [["Saturn, the planet famous for its rings is a gas giant.", "missing-closing-mark"], ["Saturn the planet famous for its rings, is a gas giant.", "missing-opening-mark"], ["Saturn (the planet famous for its rings, is a gas giant.", "mismatched-marks"]], "The extra information is “the planet famous for its rings.”", "The whole phrase that renames Saturn goes between two commas."],
    es: ["", "Saturno, el planeta famoso por sus anillos, es un gigante gaseoso.", [["Saturno, el planeta famoso por sus anillos es un gigante gaseoso.", "missing-closing-mark"], ["Saturno el planeta famoso por sus anillos, es un gigante gaseoso.", "missing-opening-mark"], ["Saturno (el planeta famoso por sus anillos, es un gigante gaseoso.", "mismatched-marks"]], "El inciso es “el planeta famoso por sus anillos”.", "Toda la frase que explica qué es Saturno va entre dos comas."],
  },
  {
    en: ["", "My grandmother's recipe (she got it from her mother) uses fresh ginger.", [["My grandmother's recipe (she got it from her mother uses fresh ginger).", "mark-in-wrong-place"], ["My grandmother's recipe (she got it from her mother uses fresh ginger.", "missing-closing-mark"], ["My grandmother's recipe—she got it from her mother) uses fresh ginger.", "mismatched-marks"]], "The extra information is “she got it from her mother.”", "The parentheses close right after the extra information."],
    es: ["", "La receta de mi abuela (la aprendió de su mamá) lleva jengibre fresco.", [["La receta de mi abuela (la aprendió de su mamá lleva jengibre fresco).", "mark-in-wrong-place"], ["La receta de mi abuela (la aprendió de su mamá lleva jengibre fresco.", "missing-closing-mark"], ["La receta de mi abuela —la aprendió de su mamá) lleva jengibre fresco.", "mismatched-marks"]], "El inciso es “la aprendió de su mamá”.", "El paréntesis se cierra justo después del inciso."],
  },
  {
    en: ["", "Our team's goalie, Hana Sato, blocked every shot.", [["Our team's goalie, Hana Sato blocked every shot.", "missing-closing-mark"], ["Our team's goalie Hana, Sato blocked every shot.", "mark-in-wrong-place"], ["Our team's goalie (Hana Sato, blocked every shot.", "mismatched-marks"]], "The team has one goalie, so her name is extra information.", "“Hana Sato” goes between two commas."],
    es: ["", "La portera del equipo, Hana Sato, detuvo todos los tiros.", [["La portera del equipo, Hana Sato detuvo todos los tiros.", "missing-closing-mark"], ["La portera del equipo Hana, Sato detuvo todos los tiros.", "mark-in-wrong-place"], ["La portera del equipo (Hana Sato, detuvo todos los tiros.", "mismatched-marks"]], "El equipo tiene una sola portera, así que su nombre es un inciso.", "“Hana Sato” va entre dos comas."],
  },
  {
    en: ["", "The trail, which is steep in places, ends at a waterfall.", [["The trail, which is steep in places ends at a waterfall.", "missing-closing-mark"], ["The trail—which is steep in places, ends at a waterfall.", "mismatched-marks"], ["The trail which, is steep in places, ends at a waterfall.", "mark-in-wrong-place"]], "The extra information is “which is steep in places.”", "The comma goes before “which” and after “places.”"],
    es: ["", "El sendero, que es empinado en algunas partes, termina en una cascada.", [["El sendero, que es empinado en algunas partes termina en una cascada.", "missing-closing-mark"], ["El sendero —que es empinado en algunas partes, termina en una cascada.", "mismatched-marks"], ["El sendero que, es empinado en algunas partes, termina en una cascada.", "mark-in-wrong-place"]], "El inciso es “que es empinado en algunas partes”.", "La coma va antes de “que” y después de “partes”."],
  },
  {
    en: ["", "My brother—the pickiest eater I know—asked for more broccoli.", [["My brother—the pickiest eater I know, asked for more broccoli.", "mismatched-marks"], ["My brother the pickiest eater I know—asked for more broccoli.", "missing-opening-mark"], ["My brother—the pickiest eater—I know asked for more broccoli.", "mark-in-wrong-place"]], "The extra information is “the pickiest eater I know.”", "The second dash comes after “I know,” the end of the aside."],
    es: ["", "Mi hermano —el más quisquilloso para comer— pidió más brócoli.", [["Mi hermano —el más quisquilloso para comer, pidió más brócoli.", "mismatched-marks"], ["Mi hermano el más quisquilloso para comer— pidió más brócoli.", "missing-opening-mark"], ["Mi hermano —el más quisquilloso— para comer pidió más brócoli.", "mark-in-wrong-place"]], "El inciso es “el más quisquilloso para comer”.", "La segunda raya va después de “comer”, donde termina el inciso."],
  },
  {
    en: ["", "The field trip (if it doesn't rain) will be on Friday.", [["The field trip (if it doesn't rain will be on Friday).", "mark-in-wrong-place"], ["The field trip (if it doesn't rain, will be on Friday.", "mismatched-marks"], ["The field trip if it doesn't rain) will be on Friday.", "missing-opening-mark"]], "The extra information is “if it doesn't rain.”", "The parentheses go around “if it doesn't rain” only."],
    es: ["", "La excursión (si no llueve) será el viernes.", [["La excursión (si no llueve será el viernes).", "mark-in-wrong-place"], ["La excursión (si no llueve, será el viernes.", "mismatched-marks"], ["La excursión si no llueve) será el viernes.", "missing-opening-mark"]], "El inciso es “si no llueve”.", "Los paréntesis encierran solo “si no llueve”."],
  },
  {
    en: ["", "Dr. Okafor, a scientist who studies whales, visited our class.", [["Dr. Okafor, a scientist who studies whales visited our class.", "missing-closing-mark"], ["Dr. Okafor—a scientist who studies whales, visited our class.", "mismatched-marks"], ["Dr. Okafor a scientist, who studies whales, visited our class.", "mark-in-wrong-place"]], "The extra information is “a scientist who studies whales.”", "The whole phrase that tells who Dr. Okafor is goes between two commas."],
    es: ["", "La doctora Okafor, una científica que estudia las ballenas, visitó nuestra clase.", [["La doctora Okafor, una científica que estudia las ballenas visitó nuestra clase.", "missing-closing-mark"], ["La doctora Okafor —una científica que estudia las ballenas, visitó nuestra clase.", "mismatched-marks"], ["La doctora Okafor una científica, que estudia las ballenas, visitó nuestra clase.", "mark-in-wrong-place"]], "El inciso es “una científica que estudia las ballenas”.", "Toda la frase que dice quién es la doctora Okafor va entre dos comas."],
  },
  {
    en: ["", "This painting, which my sister made in art class, won a ribbon.", [["This painting, which my sister made in art class won a ribbon.", "missing-closing-mark"], ["This painting (which my sister made in art class, won a ribbon.", "mismatched-marks"], ["This painting which, my sister made in art class, won a ribbon.", "mark-in-wrong-place"]], "The extra information is “which my sister made in art class.”", "The comma goes before “which” and after “class.”"],
    es: ["", "Este cuadro, que pintó mi hermana en clase de arte, ganó un listón.", [["Este cuadro, que pintó mi hermana en clase de arte ganó un listón.", "missing-closing-mark"], ["Este cuadro (que pintó mi hermana en clase de arte, ganó un listón.", "mismatched-marks"], ["Este cuadro que, pintó mi hermana en clase de arte, ganó un listón.", "mark-in-wrong-place"]], "El inciso es “que pintó mi hermana en clase de arte”.", "La coma va antes de “que” y después de “arte”."],
  },
  {
    en: ["", "The recipe calls for one cup of flour (about 120 grams).", [["The recipe calls for one cup of flour (about 120 grams.", "missing-closing-mark"], ["The recipe calls for one cup (of flour about 120 grams).", "mark-in-wrong-place"], ["The recipe calls for one cup of flour—about 120 grams).", "mismatched-marks"]], "The extra information is “about 120 grams.”", "The parentheses open before “about” and close before the period."],
    es: ["", "La receta lleva una taza de harina (unos 120 gramos).", [["La receta lleva una taza de harina (unos 120 gramos.", "missing-closing-mark"], ["La receta lleva una taza (de harina unos 120 gramos).", "mark-in-wrong-place"], ["La receta lleva una taza de harina —unos 120 gramos).", "mismatched-marks"]], "El inciso es “unos 120 gramos”.", "El paréntesis abre antes de “unos” y cierra antes del punto."],
  },
];

const RESTRICTIVE: Bi<Entry>[] = [
  {
    en: ["Ms. Lee has only one daughter.", "Her daughter, who plays the cello, is in high school.", [["Her daughter who plays the cello is in high school.", "missing-commas-nonrestrictive"], ["Her daughter, who plays the cello is in high school.", "missing-closing-mark"]], "She has one daughter, so “her daughter” already tells which one.", "“Who plays the cello” only adds information, so it goes between commas."],
    es: ["La señora Lee tiene una sola hija.", "Su hija, que toca el violonchelo, está en la preparatoria.", [["Su hija que toca el violonchelo está en la preparatoria.", "missing-commas-nonrestrictive"], ["Su hija, que toca el violonchelo está en la preparatoria.", "missing-closing-mark"]], "Tiene una sola hija, así que “su hija” ya dice de quién se habla.", "“Que toca el violonchelo” solo agrega información: es explicativa y va entre comas."],
  },
  {
    en: ["Only some of the apples were ripe.", "The apples that were ripe went into the pie.", [["The apples, that were ripe, went into the pie.", "commas-around-restrictive"], ["The apples that were ripe, went into the pie.", "comma-before-verb"]], "Only some apples were ripe, so “that were ripe” tells which apples.", "The part tells which apples, so it gets no commas."],
    es: ["Solo algunas manzanas estaban maduras.", "Las manzanas que estaban maduras fueron para el pastel.", [["Las manzanas, que estaban maduras, fueron para el pastel.", "commas-around-restrictive"], ["Las manzanas que estaban maduras, fueron para el pastel.", "comma-before-verb"]], "Solo algunas estaban maduras, así que la parte dice cuáles.", "La parte dice cuáles manzanas: es especificativa y no lleva comas."],
  },
  {
    en: ["Our school has three buses.", "The bus that goes to Elm Street is always late.", [["The bus, that goes to Elm Street, is always late.", "commas-around-restrictive"], ["The bus that goes to Elm Street, is always late.", "comma-before-verb"]], "There are three buses, so “that goes to Elm Street” tells which bus.", "The part tells which bus, so it gets no commas."],
    es: ["Solo algunos alumnos estaban cansados.", "Los alumnos que estaban cansados se fueron a casa.", [["Los alumnos, que estaban cansados, se fueron a casa.", "commas-around-restrictive"], ["Los alumnos que estaban cansados, se fueron a casa.", "comma-before-verb"]], "No todos estaban cansados. La parte dice cuáles alumnos se fueron.", "La parte dice cuáles alumnos: es especificativa y no lleva comas. Con comas, diría que todos estaban cansados y todos se fueron."],
  },
  {
    en: ["Leo has one older brother.", "His older brother, who loves chess, is teaching him to play.", [["His older brother who loves chess is teaching him to play.", "missing-commas-nonrestrictive"], ["His older brother, who loves chess is teaching him to play.", "missing-closing-mark"]], "Leo has only one older brother, so we already know who he is.", "“Who loves chess” only adds information, so it goes between commas."],
    es: ["Leo tiene un solo hermano mayor.", "Su hermano mayor, que es fanático del ajedrez, le está enseñando a jugar.", [["Su hermano mayor que es fanático del ajedrez le está enseñando a jugar.", "missing-commas-nonrestrictive"], ["Su hermano mayor, que es fanático del ajedrez le está enseñando a jugar.", "missing-closing-mark"]], "Leo tiene un solo hermano mayor, así que ya sabemos quién es.", "“Que es fanático del ajedrez” solo agrega información: es explicativa y va entre comas."],
  },
  {
    en: ["Many students entered the science fair.", "Students who finished their projects early helped set up the tables.", [["Students, who finished their projects early, helped set up the tables.", "commas-around-restrictive"], ["Students who finished their projects early, helped set up the tables.", "comma-before-verb"]], "Not every student finished early. The part tells which students.", "The part tells which students, so it gets no commas."],
    es: ["Nuestra escuela tiene tres autobuses.", "El autobús que va a la calle Olmo siempre llega tarde.", [["El autobús, que va a la calle Olmo, siempre llega tarde.", "commas-around-restrictive"], ["El autobús que va a la calle Olmo, siempre llega tarde.", "comma-before-verb"]], "Hay tres autobuses, así que la parte dice de cuál se habla.", "La parte dice cuál autobús: es especificativa y no lleva comas."],
  },
  {
    en: ["The Pacific Ocean is the largest ocean on Earth.", "The Pacific Ocean, which covers about a third of the planet, has thousands of islands.", [["The Pacific Ocean which covers about a third of the planet has thousands of islands.", "missing-commas-nonrestrictive"], ["The Pacific Ocean, which covers about a third of the planet has thousands of islands.", "missing-closing-mark"]], "There is only one Pacific Ocean, so its name already tells which one.", "“Which covers about a third of the planet” only adds information, so it goes between commas."],
    es: ["El océano Pacífico es el más grande de la Tierra.", "El océano Pacífico, que cubre cerca de un tercio del planeta, tiene miles de islas.", [["El océano Pacífico que cubre cerca de un tercio del planeta tiene miles de islas.", "missing-commas-nonrestrictive"], ["El océano Pacífico, que cubre cerca de un tercio del planeta tiene miles de islas.", "missing-closing-mark"]], "Hay un solo océano Pacífico, así que su nombre ya dice de cuál se habla.", "La parte solo agrega información: es explicativa y va entre comas."],
  },
  {
    en: ["Mr. Diaz has two dogs, a poodle and a beagle.", "The dog that barks at the mail carrier is the beagle.", [["The dog, that barks at the mail carrier, is the beagle.", "commas-around-restrictive"], ["The dog that barks at the mail carrier, is the beagle.", "comma-before-verb"]], "He has two dogs, so “that barks at the mail carrier” tells which dog.", "The part tells which dog, so it gets no commas."],
    es: ["El señor Díaz tiene dos perros, un poodle y un beagle.", "El perro que le ladra al cartero es el beagle.", [["El perro, que le ladra al cartero, es el beagle.", "commas-around-restrictive"], ["El perro que le ladra al cartero, es el beagle.", "comma-before-verb"]], "Tiene dos perros, así que la parte dice de cuál se habla.", "La parte dice cuál perro: es especificativa y no lleva comas."],
  },
  {
    en: ["Ana's mom bakes for the whole street.", "Ana's mom, who owns a bakery, made the birthday cake.", [["Ana's mom who owns a bakery made the birthday cake.", "missing-commas-nonrestrictive"], ["Ana's mom, who owns a bakery made the birthday cake.", "missing-closing-mark"]], "Ana has one mom, so “Ana's mom” already tells who she is.", "“Who owns a bakery” only adds information, so it goes between commas."],
    es: ["La mamá de Ana hornea para toda la cuadra.", "La mamá de Ana, que tiene una panadería, hizo el pastel de cumpleaños.", [["La mamá de Ana que tiene una panadería hizo el pastel de cumpleaños.", "missing-commas-nonrestrictive"], ["La mamá de Ana, que tiene una panadería hizo el pastel de cumpleaños.", "missing-closing-mark"]], "Ana tiene una sola mamá, así que ya sabemos de quién se habla.", "“Que tiene una panadería” solo agrega información: es explicativa y va entre comas."],
  },
  {
    en: ["Some library books have a red sticker.", "Books that have a red sticker can be checked out for two weeks.", [["Books, that have a red sticker, can be checked out for two weeks.", "commas-around-restrictive"], ["Books that have a red sticker, can be checked out for two weeks.", "comma-before-verb"]], "Only some books have the sticker, so the part tells which books.", "The part tells which books, so it gets no commas."],
    es: ["Algunos libros de la biblioteca tienen una etiqueta roja.", "Los libros que tienen etiqueta roja se prestan por dos semanas.", [["Los libros, que tienen etiqueta roja, se prestan por dos semanas.", "commas-around-restrictive"], ["Los libros que tienen etiqueta roja, se prestan por dos semanas.", "comma-before-verb"]], "Solo algunos libros tienen la etiqueta, así que la parte dice cuáles.", "La parte dice cuáles libros: es especificativa y no lleva comas."],
  },
  {
    en: ["Mount Everest is the tallest mountain above sea level.", "Mount Everest, which sits on the border of Nepal and China, draws climbers every spring.", [["Mount Everest which sits on the border of Nepal and China draws climbers every spring.", "missing-commas-nonrestrictive"], ["Mount Everest, which sits on the border of Nepal and China draws climbers every spring.", "missing-closing-mark"]], "There is only one Mount Everest, so its name already tells which one.", "The part only adds information, so it goes between commas."],
    es: ["El monte Everest es la montaña más alta sobre el nivel del mar.", "El monte Everest, que está en la frontera entre Nepal y China, atrae a escaladores cada primavera.", [["El monte Everest que está en la frontera entre Nepal y China atrae a escaladores cada primavera.", "missing-commas-nonrestrictive"], ["El monte Everest, que está en la frontera entre Nepal y China atrae a escaladores cada primavera.", "missing-closing-mark"]], "Hay un solo monte Everest, así que su nombre ya dice de cuál se habla.", "La parte solo agrega información: es explicativa y va entre comas."],
  },
  {
    en: ["Two of the runners fell during the race.", "The runner who fell first got up and finished.", [["The runner, who fell first, got up and finished.", "commas-around-restrictive"], ["The runner who fell first, got up and finished.", "comma-before-verb"]], "Two runners fell, so “who fell first” tells which runner.", "The part tells which runner, so it gets no commas."],
    es: ["Dos corredores se cayeron durante la carrera.", "El corredor que se cayó primero se levantó y terminó.", [["El corredor, que se cayó primero, se levantó y terminó.", "commas-around-restrictive"], ["El corredor que se cayó primero, se levantó y terminó.", "comma-before-verb"]], "Se cayeron dos, así que la parte dice de cuál se habla.", "La parte dice cuál corredor: es especificativa y no lleva comas."],
  },
  {
    en: ["Our town has one public pool.", "The pool, which opens in June, has a new slide.", [["The pool which opens in June has a new slide.", "missing-commas-nonrestrictive"], ["The pool, which opens in June has a new slide.", "missing-closing-mark"]], "The town has one pool, so “the pool” already tells which one.", "“Which opens in June” only adds information, so it goes between commas."],
    es: ["Nuestro pueblo tiene una sola piscina pública.", "La piscina, que abre en junio, tiene un tobogán nuevo.", [["La piscina que abre en junio tiene un tobogán nuevo.", "missing-commas-nonrestrictive"], ["La piscina, que abre en junio tiene un tobogán nuevo.", "missing-closing-mark"]], "El pueblo tiene una sola piscina, así que ya sabemos de cuál se habla.", "“Que abre en junio” solo agrega información: es explicativa y va entre comas."],
  },
  {
    en: ["Some of the cookies had nuts.", "The cookies that had nuts were on a separate plate.", [["The cookies, that had nuts, were on a separate plate.", "commas-around-restrictive"], ["The cookies that had nuts, were on a separate plate.", "comma-before-verb"]], "Only some cookies had nuts, so the part tells which cookies.", "The part tells which cookies, so it gets no commas."],
    es: ["Algunas galletas tenían nueces.", "Las galletas que tenían nueces estaban en otro plato.", [["Las galletas, que tenían nueces, estaban en otro plato.", "commas-around-restrictive"], ["Las galletas que tenían nueces, estaban en otro plato.", "comma-before-verb"]], "Solo algunas galletas tenían nueces, así que la parte dice cuáles.", "La parte dice cuáles galletas: es especificativa y no lleva comas."],
  },
  {
    en: ["Sofia has one science teacher.", "Her science teacher, Mr. Kim, retires this year.", [["Her science teacher Mr. Kim retires this year.", "missing-commas-nonrestrictive"], ["Her science teacher, Mr. Kim retires this year.", "missing-closing-mark"]], "She has one science teacher, so his name only adds information.", "“Mr. Kim” only adds information, so it goes between commas."],
    es: ["Sofía tiene un solo maestro de ciencias.", "Su maestro de ciencias, el señor Kim, se jubila este año.", [["Su maestro de ciencias el señor Kim se jubila este año.", "missing-commas-nonrestrictive"], ["Su maestro de ciencias, el señor Kim se jubila este año.", "missing-closing-mark"]], "Tiene un solo maestro de ciencias, así que su nombre solo agrega información.", "“El señor Kim” solo agrega información, así que va entre comas."],
  },
];

const NONRESTRICTIVE = skill(
  { id: "e.nonrestrictive", grade: "6", title: { en: "Commas, dashes, and parentheses for asides", es: "Comas, rayas y paréntesis en incisos" }, standard: "L.6.2a", prereqs: ["e.commas"] },
  [
    {
      bank: ASIDE_MARKS,
      ask: PUNCTUATED,
      hints: {
        en: ["Find the extra information, the part you could lift out and still have a complete sentence.", "Extra information needs a mark on both sides: two commas, two dashes, or a pair of parentheses. The two marks must match."],
        es: ["Busca el inciso: la parte que podrías quitar y la oración seguiría completa.", "Un inciso va entre dos signos iguales: dos comas, dos rayas o un par de paréntesis. La raya va pegada a la primera y a la última palabra del inciso."],
      },
      seconds: 25,
    },
    {
      bank: RESTRICTIVE,
      ask: PUNCTUATED,
      hints: {
        en: ["Read the first sentence. Does the extra part tell which one, or is it just added information?", "If the part is needed to tell which one, use no commas. If it only adds information about someone or something already clear, set it off with commas. Never put a single comma between the subject and its verb."],
        es: ["Lee la primera oración. ¿La parte dice de cuál se habla, o solo agrega información?", "Si la parte es necesaria para saber de cuál se habla (especificativa), no lleva comas. Si solo agrega información sobre algo que ya está claro (explicativa), va entre comas. Nunca pongas una sola coma entre el sujeto y el verbo."],
      },
      seconds: 30,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.confused.words — words that sound or look alike. English: affect / effect, than / then, lose / loose,
// principal / principle… Spanish: sino / si no, haya / halla, hierva / hierba, también / tan bien,
// sobre todo / sobretodo, grabar / gravar, savia / sabia, and accents that do or do not belong.
// Tags: sound-alike-wrong-meaning (a homophone), look-alike-wrong-meaning, wrong-part-of-speech,
// split-compound (one word written as two, or the reverse), missing-accent, extra-accent, misspelling.

const CONFUSED_1: Bi<Entry>[] = [
  {
    en: ["The cold weather can ___ how fast plants grow.", "affect", [["effect", "wrong-part-of-speech"], ["afect", "misspelling"]], "The blank needs a verb: the weather does something to the plants.", "“Affect” is the verb: to change something. “Effect” is usually a noun: a result."],
    es: ["No quiero jugo, ___ agua.", "sino", [["si no", "split-compound"], ["sinó", "misspelling"]], "La oración corrige: no es jugo, es agua.", "“Sino” une dos ideas cuando una corrige a la otra. “Si no” significa “en caso de que no”."],
  },
  {
    en: ["The new rule had a big ___ on our lunch schedule.", "effect", [["affect", "wrong-part-of-speech"], ["efect", "misspelling"]], "The blank comes after “a big,” so it needs a noun.", "“Effect” is the noun: a result."],
    es: ["___ llegas a tiempo, perderás el autobús.", "Si no", [["Sino", "split-compound"], ["Sinó", "misspelling"]], "Prueba “en caso de que no”: “En caso de que no llegues…”.", "“Si no” significa “en caso de que no”: es una condición."],
  },
  {
    en: ["Maya is two inches taller ___ her brother.", "than", [["then", "sound-alike-wrong-meaning"], ["that", "look-alike-wrong-meaning"]], "The sentence compares two people.", "“Than” compares. “Then” tells when."],
    es: ["Espero que ___ buena comida en la fiesta.", "haya", [["halla", "sound-alike-wrong-meaning"], ["aya", "sound-alike-wrong-meaning"]], "La palabra es del verbo haber: que exista.", "“Haya” es del verbo haber. “Halla” es del verbo hallar, encontrar."],
  },
  {
    en: ["We finished dinner, and ___ we played a board game.", "then", [["than", "sound-alike-wrong-meaning"], ["them", "look-alike-wrong-meaning"]], "The blank tells what happened next.", "“Then” tells when. “Than” compares."],
    es: ["Mi hermana siempre ___ las llaves que yo pierdo.", "halla", [["haya", "sound-alike-wrong-meaning"], ["aya", "sound-alike-wrong-meaning"]], "La palabra significa encuentra.", "“Halla” es del verbo hallar: encontrar."],
  },
  {
    en: ["Everyone ___ Jordan went on the field trip.", "except", [["accept", "sound-alike-wrong-meaning"], ["expect", "look-alike-wrong-meaning"]], "The sentence leaves one person out.", "“Except” means leaving out. “Accept” means to receive or agree."],
    es: ["Espera a que el agua ___ para echar la pasta.", "hierva", [["hierba", "sound-alike-wrong-meaning"], ["ierva", "misspelling"]], "La palabra es del verbo hervir.", "“Hierva” (con v) es del verbo hervir. La “hierba” (con b) es una planta."],
  },
  {
    en: ["Please ___ my apology for being late.", "accept", [["except", "sound-alike-wrong-meaning"], ["expect", "look-alike-wrong-meaning"]], "The blank needs a verb meaning to receive.", "“Accept” means to receive or agree to something."],
    es: ["El conejo comía ___ en el jardín.", "hierba", [["hierva", "sound-alike-wrong-meaning"], ["ierba", "misspelling"]], "La palabra es una planta verde.", "La “hierba” (con b) es una planta."],
  },
  {
    en: ["If you ___ your library card, you will need a new one.", "lose", [["loose", "look-alike-wrong-meaning"], ["loss", "wrong-part-of-speech"]], "The blank needs a verb meaning to stop having something.", "“Lose” (one o) is the verb. “Loose” (two o's) means not tight."],
    es: ["Mi abuela me enseñó a ___ botones en la camisa.", "coser", [["cocer", "sound-alike-wrong-meaning"], ["cozer", "misspelling"]], "La palabra trata de aguja e hilo.", "“Coser” (con s) es unir con aguja e hilo. “Cocer” (con c) es cocinar."],
  },
  {
    en: ["My tooth is ___, so I chew on the other side.", "loose", [["lose", "look-alike-wrong-meaning"], ["loss", "wrong-part-of-speech"]], "The blank describes the tooth: it wiggles.", "“Loose” means not tight."],
    es: ["Hay que ___ las papas durante veinte minutos.", "cocer", [["coser", "sound-alike-wrong-meaning"], ["cozer", "misspelling"]], "La palabra trata de cocinar.", "“Cocer” (con c) es cocinar en agua o al fuego."],
  },
  {
    en: ["Can you give me some ___ about which book to read?", "advice", [["advise", "wrong-part-of-speech"], ["advize", "misspelling"]], "The blank comes after “some,” so it needs a noun.", "“Advice” (with c) is the noun. “Advise” (with s) is the verb."],
    es: ["___ mucho haber llegado tarde.", "Siento", [["Ciento", "sound-alike-wrong-meaning"], ["Sientto", "misspelling"]], "La palabra es del verbo sentir.", "“Siento” es del verbo sentir. “Ciento” es un número."],
  },
  {
    en: ["The coach will ___ us to drink plenty of water.", "advise", [["advice", "wrong-part-of-speech"], ["advize", "misspelling"]], "The blank comes after “will,” so it needs a verb.", "“Advise” is the verb: to give advice."],
    es: ["El libro tiene ___ veinte páginas.", "ciento", [["siento", "sound-alike-wrong-meaning"], ["sciento", "misspelling"]], "La palabra es un número: cien más veinte.", "“Ciento” es el número: ciento veinte."],
  },
  {
    en: ["Take a deep ___ before you start your speech.", "breath", [["breathe", "wrong-part-of-speech"], ["breth", "misspelling"]], "The blank comes after “a deep,” so it needs a noun.", "“Breath” (no e at the end) is the noun. “Breathe” is the verb."],
    es: ["Juan, ¿___ a la fiesta el sábado?", "vienes", [["bienes", "sound-alike-wrong-meaning"], ["viénes", "extra-accent"]], "La palabra es del verbo venir.", "“Vienes” (con v) es del verbo venir. Los “bienes” (con b) son cosas que alguien posee."],
  },
  {
    en: ["Fish ___ through their gills.", "breathe", [["breath", "wrong-part-of-speech"], ["breeth", "misspelling"]], "The blank needs a verb: what fish do.", "“Breathe” (with e at the end) is the verb."],
    es: ["Ayer mi tía me ___ un libro de cuentos.", "dio", [["dió", "extra-accent"], ["dío", "extra-accent"]], "La palabra tiene una sola sílaba.", "Las palabras de una sílaba como “dio”, “fue” y “vio” no llevan tilde."],
  },
  {
    en: ["The library was ___ except for the hum of the lights.", "quiet", [["quite", "look-alike-wrong-meaning"], ["quit", "look-alike-wrong-meaning"]], "The blank describes the library: no noise.", "“Quiet” means silent. “Quite” means very or completely."],
    es: ["Sirvieron chocolate caliente en una ___.", "taza", [["tasa", "sound-alike-wrong-meaning"], ["tassa", "misspelling"]], "La palabra es un recipiente para beber.", "Una “taza” (con z) sirve para beber. Una “tasa” (con s) es una medida o un impuesto."],
  },
  {
    en: ["We are not sure ___ the game will be canceled.", "whether", [["weather", "sound-alike-wrong-meaning"], ["wheather", "misspelling"]], "The blank introduces a choice: yes or no.", "“Whether” introduces a choice. “Weather” is rain, sun, and wind."],
    es: ["Los gatos salen de noche a ___ ratones.", "cazar", [["casar", "sound-alike-wrong-meaning"], ["kazar", "misspelling"]], "La palabra significa atrapar animales.", "“Cazar” (con z) es atrapar animales. “Casar” (con s) es unir en matrimonio."],
  },
  {
    en: ["We walked ___ the bakery on our way home.", "past", [["passed", "sound-alike-wrong-meaning"], ["pased", "misspelling"]], "The blank tells where you walked: beyond the bakery.", "“Past” tells where or when. “Passed” is a verb: “We passed the bakery.”"],
    es: ["Mi abuelo me dio un fuerte ___ cuando llegué.", "abrazo", [["abraso", "sound-alike-wrong-meaning"], ["abrazso", "misspelling"]], "La palabra es un gesto de cariño con los brazos.", "“Abrazo” (con z) viene de brazo. “Abrasar” (con s) es quemar."],
  },
  {
    en: ["After the long hike, everyone was ready for ___.", "dessert", [["desert", "look-alike-wrong-meaning"], ["dessart", "misspelling"]], "The blank names something sweet you eat after a meal.", "“Dessert” (two s's) is a sweet course. A “desert” (one s) is a dry land."],
    es: ["Una ___ enorme mojó a los surfistas.", "ola", [["hola", "sound-alike-wrong-meaning"], ["olla", "look-alike-wrong-meaning"]], "La palabra es agua del mar que se levanta.", "Una “ola” es agua del mar en movimiento. “Hola” es un saludo."],
  },
];

const CONFUSED_2: Bi<Entry>[] = [
  {
    en: ["The ___ announced that school would close early.", "principal", [["principle", "sound-alike-wrong-meaning"], ["principel", "misspelling"]], "The blank names a person who runs a school.", "The “principal” is the head of a school. A “principle” is a rule or belief."],
    es: ["Ana canta muy bien, y ___ toca la guitarra.", "también", [["tan bien", "split-compound"], ["tambien", "missing-accent"]], "La palabra significa además.", "“También” significa además. “Tan bien” significa de manera muy buena."],
  },
  {
    en: ["Honesty is an important ___ in our family.", "principle", [["principal", "sound-alike-wrong-meaning"], ["principel", "misspelling"]], "The blank names a belief or rule.", "A “principle” is a rule or belief."],
    es: ["Nunca había visto a alguien bailar ___.", "tan bien", [["también", "split-compound"], ["tanbien", "misspelling"]], "La palabra describe cómo baila: de una manera muy buena.", "“Tan bien” son dos palabras: “tan” más “bien”."],
  },
  {
    en: ["The bus stayed ___ while the students got on.", "stationary", [["stationery", "sound-alike-wrong-meaning"], ["stationairy", "misspelling"]], "The blank describes the bus: not moving.", "“Stationary” (with a) means not moving. “Stationery” (with e) is writing paper."],
    es: ["Llegaron Luis, Marta y los ___.", "demás", [["de más", "split-compound"], ["demas", "missing-accent"]], "La palabra significa los otros.", "“Los demás” significa los otros. “De más” significa de sobra."],
  },
  {
    en: ["Grandma keeps her letters and ___ in a wooden box.", "stationery", [["stationary", "sound-alike-wrong-meaning"], ["stationairy", "misspelling"]], "The blank names writing paper and envelopes.", "“Stationery” (with e) is paper for letters."],
    es: ["Compré dos boletos ___, por si alguien más quiere venir.", "de más", [["demás", "split-compound"], ["dé más", "extra-accent"]], "La palabra significa que sobran.", "“De más” significa de sobra."],
  },
  {
    en: ["Jamal gave his sister a ___ on her science project.", "compliment", [["complement", "sound-alike-wrong-meaning"], ["complament", "misspelling"]], "The blank names kind words of praise.", "A “compliment” (with i) is praise. A “complement” completes something."],
    es: ["Me gustan todas las frutas, ___ el mango.", "sobre todo", [["sobretodo", "split-compound"], ["sobre-todo", "misspelling"]], "La palabra significa especialmente.", "“Sobre todo” (separado) significa especialmente. Un “sobretodo” es un abrigo."],
  },
  {
    en: ["The red scarf is a nice ___ to her blue coat.", "complement", [["compliment", "sound-alike-wrong-meaning"], ["complament", "misspelling"]], "The blank names something that goes well with the coat and completes it.", "A “complement” (with e) completes something."],
    es: ["En invierno mi abuelo usa un ___ de lana.", "sobretodo", [["sobre todo", "split-compound"], ["sobretodó", "extra-accent"]], "La palabra es una prenda de ropa: un abrigo largo.", "Un “sobretodo” (junto) es un abrigo largo."],
  },
  {
    en: ["After the fall, the skater was ___ but dizzy.", "conscious", [["conscience", "look-alike-wrong-meaning"], ["concious", "misspelling"]], "The blank describes the skater: awake and aware.", "“Conscious” means awake and aware. Your “conscience” is your sense of right and wrong."],
    es: ["Estudiaste poco, ___ no te quejes de la nota.", "conque", [["con que", "split-compound"], ["con qué", "extra-accent"]], "La palabra significa “así que”.", "“Conque” (junto) significa así que."],
  },
  {
    en: ["My ___ told me to return the extra change.", "conscience", [["conscious", "look-alike-wrong-meaning"], ["concience", "misspelling"]], "The blank names the inner sense of right and wrong.", "Your “conscience” tells you right from wrong."],
    es: ["Mi papá ___ el video de la obra de teatro.", "grabó", [["gravó", "sound-alike-wrong-meaning"], ["grabo", "missing-accent"]], "La palabra es del verbo que significa registrar imágenes o sonido.", "“Grabar” (con b) es registrar imágenes o sonido. “Gravar” (con v) es poner un impuesto."],
  },
  {
    en: ["Austin is the ___ of Texas.", "capital", [["capitol", "sound-alike-wrong-meaning"], ["capitle", "misspelling"]], "The blank names a city where a state's government meets.", "The “capital” is the city. The “capitol” is the building where lawmakers meet."],
    es: ["Separa los ___ para reciclarlos.", "desechos", [["deshechos", "look-alike-wrong-meaning"], ["desechós", "extra-accent"]], "La palabra significa restos que se tiran.", "Los “desechos” (sin h) son restos que se tiran. “Deshecho” (con h) es lo que se deshizo."],
  },
  {
    en: ["Lawmakers meet in the ___ building downtown.", "capitol", [["capital", "sound-alike-wrong-meaning"], ["capitle", "misspelling"]], "The blank names the building where lawmakers meet.", "The “capitol” (with o) is the building."],
    es: ["La cama estaba ___ porque nadie la tendió.", "deshecha", [["desecha", "look-alike-wrong-meaning"], ["desecho", "look-alike-wrong-meaning"]], "La palabra viene de deshacer, lo contrario de hacer.", "“Deshecha” (con h) viene de deshacer."],
  },
  {
    en: ["The ___ of the hike follows the river for two miles.", "course", [["coarse", "sound-alike-wrong-meaning"], ["corse", "misspelling"]], "The blank names a path or route.", "A “course” is a path or a class. “Coarse” means rough."],
    es: ["El cocinero ___ el queso para la pizza.", "ralló", [["rayó", "sound-alike-wrong-meaning"], ["rallo", "missing-accent"]], "La palabra viene del verbo que significa desmenuzar con un rallador.", "“Rallar” (con ll) es desmenuzar. “Rayar” (con y) es hacer rayas."],
  },
  {
    en: ["The sandpaper felt ___ against my hand.", "coarse", [["course", "sound-alike-wrong-meaning"], ["corse", "misspelling"]], "The blank describes the sandpaper: rough.", "“Coarse” means rough."],
    es: ["Mi hermanito ___ la pared con un crayón.", "rayó", [["ralló", "sound-alike-wrong-meaning"], ["rayo", "missing-accent"]], "La palabra viene del verbo que significa hacer rayas.", "“Rayar” (con y) es hacer rayas o líneas."],
  },
  {
    en: ["The guide ___ the hikers to the waterfall yesterday.", "led", [["lead", "sound-alike-wrong-meaning"], ["leed", "misspelling"]], "It happened yesterday, so the blank needs the past tense.", "“Led” is the past tense of the verb “lead.” As a noun, “lead” is a metal."],
    es: ["Mañana vamos a ___ por el presidente del consejo estudiantil.", "votar", [["botar", "sound-alike-wrong-meaning"], ["vótar", "extra-accent"]], "La palabra trata de elegir en una elección.", "“Votar” (con v) es dar tu voto. “Botar” (con b) es tirar o hacer rebotar."],
  },
  {
    en: ["Only museum ___ can enter the storage rooms.", "personnel", [["personal", "look-alike-wrong-meaning"], ["personell", "misspelling"]], "The blank names the staff who work there.", "“Personnel” means the staff. “Personal” means private or your own."],
    es: ["El jugador hizo ___ el balón tres veces.", "botar", [["votar", "sound-alike-wrong-meaning"], ["bótar", "extra-accent"]], "La palabra trata de hacer rebotar el balón.", "“Botar” (con b) es hacer rebotar o tirar."],
  },
  {
    en: ["Please keep your ___ belongings in your locker.", "personal", [["personnel", "look-alike-wrong-meaning"], ["personel", "misspelling"]], "The blank describes belongings that are your own.", "“Personal” means your own."],
    es: ["La ___ sube por el tronco del árbol.", "savia", [["sabia", "sound-alike-wrong-meaning"], ["sabía", "sound-alike-wrong-meaning"]], "La palabra es el líquido que circula por las plantas.", "La “savia” (con v) es el líquido de las plantas. “Sabia” (con b) es una persona que sabe mucho."],
  },
  {
    en: ["The teacher read the poem ___ to the class.", "aloud", [["allowed", "sound-alike-wrong-meaning"], ["alowd", "misspelling"]], "The blank tells how she read: so everyone could hear.", "“Aloud” means out loud. “Allowed” means permitted."],
    es: ["Mi abuela es una mujer muy ___.", "sabia", [["savia", "sound-alike-wrong-meaning"], ["sabía", "extra-accent"]], "La palabra describe a alguien con mucho conocimiento.", "“Sabia” (con b, sin tilde) describe a alguien que sabe mucho."],
  },
];

const CONFUSED_WORDS = skill(
  { id: "e.confused.words", grade: "6", title: { en: "Commonly confused words", es: "Palabras que se confunden" }, standard: "L.6.2b", prereqs: ["e.homophones"] },
  [0, 1].map((i) => ({
    bank: [CONFUSED_1, CONFUSED_2][i],
    ask: CHOOSE,
    hints: {
      en: ["These words look or sound alike but mean different things. What meaning does the sentence need?", "Decide what kind of word fits the blank (a verb? a noun? a describing word?), then pick the spelling with that meaning."] as [string, string],
      es: ["Estas palabras se parecen o suenan igual, pero significan cosas distintas. ¿Qué significado necesita la oración?", "Piensa qué clase de palabra va en el espacio (¿un verbo? ¿un sustantivo?) y si va junta, separada o con tilde. Luego elige la que tiene ese significado."] as [string, string],
    },
    seconds: 12,
  })),
);

export { NONRESTRICTIVE, CONFUSED_WORDS };
