import type { Locale } from "@/lib/types";
import { tr } from "../../text";
import { cats, skill, type Bi, type Entry, type W } from "./shared";

// Grade 9: evaluating evidence; MLA citations.

// ---------------------------------------------------------------------------------------------------
// e.evidence.quality — level 1: the most credible source for a question (old records are fine for
// history and for long-term trends, which is taught on purpose); level 2: the main weakness of a piece
// of evidence.

const SOURCES: Bi<Entry>[] = [
  {
    en: ["Question: How much sleep do teenagers need?", "A guide from a national association of sleep doctors, updated last year", [["A mattress company's ad about teen sleep", "biased-source"], ["A magazine article about sleep from 1975", "outdated-source"], ["An anonymous post on a homework forum", "unqualified-source"]], "Who studies sleep, has nothing to sell, and is up to date?", "Experts with current research and nothing to sell are the most credible."],
    es: ["Pregunta: ¿Cuántas horas de sueño necesitan los adolescentes?", "Una guía de una asociación nacional de médicos del sueño, actualizada el año pasado", [["Un anuncio de una empresa de colchones", "biased-source"], ["Un artículo de revista sobre el sueño de 1975", "outdated-source"], ["Un comentario anónimo en un foro de tareas", "unqualified-source"]], "¿Quién estudia el sueño, no vende nada y está al día?", "Los expertos con investigaciones recientes y nada que vender son los más confiables."],
  },
  {
    en: ["Question: Is the water in our town's lake safe for swimming?", "This month's water test results from the county health department", [["A brochure from a lakeside resort", "biased-source"], ["Water tests from ten years ago", "outdated-source"], ["A neighbor who swam there once and felt fine", "anecdote"]], "Water quality can change. Who tests it, and how recently?", "Recent tests by health officials are the most credible."],
    es: ["Pregunta: ¿El agua del lago del pueblo es segura para nadar?", "Los resultados de las pruebas de agua de este mes del departamento de salud del condado", [["El folleto de un hotel junto al lago", "biased-source"], ["Pruebas de agua de hace diez años", "outdated-source"], ["Un vecino que nadó ahí una vez y se sintió bien", "anecdote"]], "La calidad del agua puede cambiar. ¿Quién la mide y qué tan reciente es la medición?", "Las pruebas recientes de las autoridades de salud son las más confiables."],
  },
  {
    en: ["Question: How did the Apollo 11 astronauts land on the moon?", "NASA's mission records and the astronauts' own reports", [["A science fiction movie about a moon landing", "unqualified-source"], ["A blog with no author that says the landing was fake", "unqualified-source"], ["A toy company's website for its rocket set", "biased-source"]], "For a historical event, what records did the people involved leave?", "Records made by the people who did it are strong evidence, even though they are old."],
    es: ["Pregunta: ¿Cómo llegaron a la Luna los astronautas del Apolo 11?", "Los registros de la misión de la NASA y los informes de los propios astronautas", [["Una película de ciencia ficción sobre un viaje a la Luna", "unqualified-source"], ["Un blog sin autor que dice que el viaje fue falso", "unqualified-source"], ["La página de una juguetería que vende cohetes de juguete", "biased-source"]], "Para un hecho histórico, ¿qué registros dejaron quienes participaron?", "Los registros de quienes lo hicieron son evidencia sólida, aunque sean antiguos."],
  },
  {
    en: ["Question: Does a new allergy medicine work?", "A study published in a medical journal and reviewed by other doctors", [["An ad from the company that makes the medicine", "biased-source"], ["A friend who says it helped her once", "anecdote"], ["A comment under a video about allergies", "unqualified-source"]], "Which source was checked by experts and has nothing to sell?", "A reviewed medical study is the most credible."],
    es: ["Pregunta: ¿Funciona un nuevo medicamento para la alergia?", "Un estudio publicado en una revista médica y revisado por otros médicos", [["Un anuncio de la empresa que fabrica el medicamento", "biased-source"], ["Una amiga que dice que una vez le ayudó", "anecdote"], ["Un comentario debajo de un video sobre alergias", "unqualified-source"]], "¿Qué fuente revisaron los expertos y no tiene nada que vender?", "Un estudio médico revisado es el más confiable."],
  },
  {
    en: ["Question: What will the weather be this weekend?", "Today's forecast from the National Weather Service", [["Last month's forecast", "outdated-source"], ["An almanac printed last year", "outdated-source"], ["A cousin who says his knee aches before rain", "anecdote"]], "Weather changes fast. Which source is both expert and current?", "Today's forecast from weather scientists is the most credible."],
    es: ["Pregunta: ¿Qué tiempo hará este fin de semana?", "El pronóstico de hoy del Servicio Meteorológico Nacional", [["El pronóstico del mes pasado", "outdated-source"], ["Un almanaque impreso el año pasado", "outdated-source"], ["Un primo que dice que le duele la rodilla antes de que llueva", "anecdote"]], "El tiempo cambia rápido. ¿Qué fuente es experta y actual?", "El pronóstico de hoy de los meteorólogos es el más confiable."],
  },
  {
    en: ["Question: How many students in our school walk to school?", "A survey of every homeroom taken this fall", [["A count of the students in one homeroom", "small-sample"], ["The principal's guess", "unqualified-source"], ["A survey from five years ago", "outdated-source"]], "Which source counts the most students, most recently?", "A recent survey of every homeroom is the most credible."],
    es: ["Pregunta: ¿Cuántos estudiantes de nuestra escuela llegan caminando?", "Una encuesta en todos los grupos hecha este otoño", [["Un conteo de los estudiantes de un solo grupo", "small-sample"], ["Lo que calcula el director a ojo", "unqualified-source"], ["Una encuesta de hace cinco años", "outdated-source"]], "¿Qué fuente cuenta a más estudiantes, y con más actualidad?", "Una encuesta reciente en todos los grupos es la más confiable."],
  },
  {
    en: ["Question: Is a used car in good condition?", "A report from an independent mechanic who inspected the car", [["The seller's description of the car", "biased-source"], ["A review of that car model from 20 years ago", "outdated-source"], ["A friend who says that kind of car never breaks", "anecdote"]], "Who has examined this exact car and gains nothing from the sale?", "An independent inspection is the most credible."],
    es: ["Pregunta: ¿Un carro usado está en buenas condiciones?", "El informe de un mecánico independiente que revisó el carro", [["La descripción del vendedor", "biased-source"], ["Una reseña de ese modelo de hace 20 años", "outdated-source"], ["Un amigo que dice que esos carros nunca fallan", "anecdote"]], "¿Quién revisó este carro en particular y no gana nada con la venta?", "Una revisión independiente es la más confiable."],
  },
  {
    en: ["Question: How many people live in our state?", "The most recent United States Census figures", [["A population estimate from 1990", "outdated-source"], ["A tourism ad that says the state is home to millions", "biased-source"], ["A guess from a travel blog", "unqualified-source"]], "Which source counts people officially, and most recently?", "The latest census is the most credible count."],
    es: ["Pregunta: ¿Cuántas personas viven en nuestro estado?", "Las cifras más recientes del Censo de los Estados Unidos", [["Un cálculo de población de 1990", "outdated-source"], ["Un anuncio de turismo que dice que en el estado viven millones", "biased-source"], ["Un cálculo de un blog de viajes", "unqualified-source"]], "¿Qué fuente cuenta a la gente de manera oficial y más reciente?", "El censo más reciente es el conteo más confiable."],
  },
  {
    en: ["Question: Are electric scooters safe for teens?", "A recent report on scooter injuries from a children's hospital", [["A scooter rental company's safety page", "biased-source"], ["A teen who rides every day and has never been hurt", "anecdote"], ["A news story from before scooters were sold in the city", "outdated-source"]], "Which source has data on many riders and nothing to sell?", "A hospital's recent injury report is the most credible."],
    es: ["Pregunta: ¿Los scooters eléctricos son seguros para los adolescentes?", "Un informe reciente de un hospital infantil sobre lesiones en scooter", [["La página de seguridad de una empresa que renta scooters", "biased-source"], ["Un adolescente que anda en scooter todos los días y nunca se ha lastimado", "anecdote"], ["Una noticia de antes de que vendieran scooters en la ciudad", "outdated-source"]], "¿Qué fuente tiene datos de muchos usuarios y nada que vender?", "El informe reciente de un hospital es el más confiable."],
  },
  {
    en: ["Question: What does the Declaration of Independence say?", "The text of the Declaration itself, from the National Archives", [["A cartoon that retells the story", "unqualified-source"], ["A classmate's summary from memory", "anecdote"], ["A store ad for Fourth of July sales", "biased-source"]], "What is the best source for what a document says?", "The document itself is the best evidence of what it says."],
    es: ["Pregunta: ¿Qué dice la Declaración de Independencia?", "El texto de la Declaración, de los Archivos Nacionales", [["Una caricatura que vuelve a contar la historia", "unqualified-source"], ["El resumen que un compañero hace de memoria", "anecdote"], ["Un anuncio de ofertas del 4 de julio", "biased-source"]], "¿Cuál es la mejor fuente para saber qué dice un documento?", "El documento mismo es la mejor evidencia de lo que dice."],
  },
  {
    en: ["Question: Which phone has the longest battery life?", "Battery tests run this year by an independent consumer testing group", [["The phone maker's ad", "biased-source"], ["Battery tests from four years ago", "outdated-source"], ["One person's online review", "anecdote"]], "Which source tested many phones fairly and recently?", "Recent independent tests are the most credible."],
    es: ["Pregunta: ¿Qué teléfono tiene la batería que dura más?", "Pruebas de batería hechas este año por un grupo independiente de consumidores", [["El anuncio del fabricante", "biased-source"], ["Pruebas de batería de hace cuatro años", "outdated-source"], ["La reseña de una sola persona en internet", "anecdote"]], "¿Qué fuente probó muchos teléfonos de manera justa y reciente?", "Las pruebas independientes recientes son las más confiables."],
  },
  {
    en: ["Question: Is our town's river flooding more often than it used to?", "Fifty years of flood records from the state water agency", [["One photo of a flooded road", "anecdote"], ["A sales letter from a flood insurance company", "biased-source"], ["A rumor heard at the grocery store", "unqualified-source"]], "To see a change over time, what kind of records do you need?", "Long-term official records show the trend; here, old data is exactly what you need."],
    es: ["Pregunta: ¿El río del pueblo se desborda más que antes?", "Cincuenta años de registros de inundaciones de la agencia estatal del agua", [["Una foto de una calle inundada", "anecdote"], ["Una carta de venta de una aseguradora contra inundaciones", "biased-source"], ["Un rumor que se oyó en la tienda", "unqualified-source"]], "Para ver un cambio con el tiempo, ¿qué registros necesitas?", "Los registros oficiales de muchos años muestran la tendencia; aquí, los datos antiguos son justo lo que hace falta."],
  },
  {
    en: ["Question: Do students learn better with music playing?", "A study that compared 500 students working with and without music", [["A study of three students", "small-sample"], ["A music app's blog post", "biased-source"], ["A student who says music helps her focus", "anecdote"]], "Which source tested the most students and has nothing to gain?", "A large comparison study is the most credible."],
    es: ["Pregunta: ¿Los estudiantes aprenden mejor con música?", "Un estudio que comparó a 500 estudiantes trabajando con música y sin música", [["Un estudio con tres estudiantes", "small-sample"], ["Una publicación del blog de una aplicación de música", "biased-source"], ["Una estudiante que dice que la música la ayuda a concentrarse", "anecdote"]], "¿Qué fuente estudió a más estudiantes y no gana nada?", "Un estudio grande que compara grupos es el más confiable."],
  },
  {
    en: ["Question: What are this year's rules for the state science fair?", "This year's rule book from the state science fair website", [["Last year's rule book", "outdated-source"], ["A rumor from another school", "unqualified-source"], ["A science kit company's ad", "biased-source"]], "Rules can change each year. Which source is official and current?", "The official rule book for this year is the most credible."],
    es: ["Pregunta: ¿Cuáles son las reglas de este año para la feria estatal de ciencias?", "El reglamento de este año en la página oficial de la feria", [["El reglamento del año pasado", "outdated-source"], ["Un rumor de otra escuela", "unqualified-source"], ["El anuncio de una empresa de juegos de ciencias", "biased-source"]], "Las reglas pueden cambiar cada año. ¿Qué fuente es oficial y actual?", "El reglamento oficial de este año es el más confiable."],
  },
];

type Weakness = "small-sample" | "biased-source" | "outdated" | "irrelevant";
const WEAKNESSES: readonly Weakness[] = ["small-sample", "biased-source", "outdated", "irrelevant"];
const EVIDENCE_WEAKNESS = cats<Weakness>(
  {
    en: { "small-sample": "The sample is too small", "biased-source": "The source has a reason to be biased", outdated: "The information is out of date", irrelevant: "It does not prove this claim" },
    es: { "small-sample": "La muestra es demasiado pequeña", "biased-source": "La fuente tiene motivos para no ser imparcial", outdated: "La información es antigua", irrelevant: "No prueba esta afirmación" },
  },
  { en: WEAKNESSES, es: WEAKNESSES },
  [
    {
      en: ["Claim: Most students at our school want a later start time. Evidence: I asked three friends, and all of them said yes.", "small-sample", "How many students were asked?", "Three friends cannot speak for a whole school."],
      es: ["Afirmación: La mayoría de los estudiantes de nuestra escuela quiere entrar más tarde. Evidencia: Les pregunté a tres amigos y todos dijeron que sí.", "small-sample", "¿A cuántos estudiantes les preguntaron?", "Tres amigos no pueden hablar por toda una escuela."],
    },
    {
      en: ["Claim: Sugary cereal is part of a healthy breakfast. Evidence: A study paid for by a cereal company says so.", "biased-source", "Who paid for the study?", "The cereal company profits if people believe it."],
      es: ["Afirmación: El cereal azucarado es parte de un desayuno sano. Evidencia: Lo dice un estudio pagado por una empresa de cereales.", "biased-source", "¿Quién pagó el estudio?", "La empresa de cereales gana si la gente lo cree."],
    },
    {
      en: ["Claim: Phones are banned in most schools in our state. Evidence: A newspaper article from 2005.", "outdated", "When was the article written?", "School phone rules have changed a lot since 2005."],
      es: ["Afirmación: Los celulares están prohibidos en la mayoría de las escuelas del estado. Evidencia: Un artículo de periódico de 2005.", "outdated", "¿Cuándo se escribió el artículo?", "Las reglas sobre celulares en las escuelas han cambiado mucho desde 2005."],
    },
    {
      en: ["Claim: The school needs a new gym. Evidence: Our basketball team won the championship last year.", "irrelevant", "Does winning say anything about whether the gym is good enough?", "A championship does not show that the gym needs replacing."],
      es: ["Afirmación: La escuela necesita un gimnasio nuevo. Evidencia: Nuestro equipo de básquetbol ganó el campeonato el año pasado.", "irrelevant", "¿Ganar dice algo sobre si el gimnasio está en buen estado?", "Un campeonato no demuestra que haga falta cambiar el gimnasio."],
    },
    {
      en: ["Claim: People in our town love the new park. Evidence: Two people posted happy reviews online.", "small-sample", "How many people does the evidence include?", "Two reviews cannot speak for a whole town."],
      es: ["Afirmación: A la gente del pueblo le encanta el parque nuevo. Evidencia: Dos personas publicaron reseñas positivas en internet.", "small-sample", "¿A cuántas personas incluye la evidencia?", "Dos reseñas no pueden hablar por todo un pueblo."],
    },
    {
      en: ["Claim: Our energy drink improves test scores. Evidence: The company that sells the drink ran the only test.", "biased-source", "Who ran the test, and what do they gain?", "The seller profits if the drink seems to work."],
      es: ["Afirmación: Nuestra bebida energética mejora las calificaciones. Evidencia: La única prueba la hizo la empresa que vende la bebida.", "biased-source", "¿Quién hizo la prueba y qué gana con ella?", "La empresa gana si parece que la bebida funciona."],
    },
    {
      en: ["Claim: The bus fare in our city is two dollars. Evidence: A city bus map printed fifteen years ago.", "outdated", "When was the map printed?", "Fares can change in fifteen years."],
      es: ["Afirmación: El pasaje del autobús en nuestra ciudad cuesta dos dólares. Evidencia: Un mapa de autobuses impreso hace quince años.", "outdated", "¿Cuándo se imprimió el mapa?", "Los pasajes pueden cambiar en quince años."],
    },
    {
      en: ["Claim: Dogs are smarter than cats. Evidence: Dogs are more popular pets in our neighborhood.", "irrelevant", "Does being popular measure being smart?", "Popularity says nothing about intelligence."],
      es: ["Afirmación: Los perros son más inteligentes que los gatos. Evidencia: En nuestro barrio hay más perros que gatos como mascotas.", "irrelevant", "¿Ser más común mide la inteligencia?", "Que haya más perros no dice nada sobre su inteligencia."],
    },
    {
      en: ["Claim: Most teens prefer reading on paper. Evidence: A survey of five students in one class.", "small-sample", "How many teens were surveyed?", "Five students are far too few to speak for most teens."],
      es: ["Afirmación: La mayoría de los adolescentes prefiere leer en papel. Evidencia: Una encuesta a cinco estudiantes de un grupo.", "small-sample", "¿A cuántos adolescentes encuestaron?", "Cinco estudiantes son muy pocos para hablar por la mayoría."],
    },
    {
      en: ["Claim: Our town does not need bike lanes. Evidence: A report written by a group of car dealers.", "biased-source", "Who wrote the report, and what do they gain?", "Car dealers may gain if fewer people ride bikes."],
      es: ["Afirmación: Nuestro pueblo no necesita ciclovías. Evidencia: Un informe escrito por un grupo de vendedores de autos.", "biased-source", "¿Quién escribió el informe y qué gana?", "Los vendedores de autos podrían ganar si menos gente usa bicicleta."],
    },
    {
      en: ["Claim: The library has the newest science books. Evidence: A list of books from the library's catalog in 2012.", "outdated", "When was the list made?", "A list from 2012 cannot show the newest books."],
      es: ["Afirmación: La biblioteca tiene los libros de ciencias más nuevos. Evidencia: Una lista del catálogo de la biblioteca de 2012.", "outdated", "¿Cuándo se hizo la lista?", "Una lista de 2012 no puede mostrar los libros más nuevos."],
    },
    {
      en: ["Claim: Our school lunches are healthy. Evidence: The cafeteria was painted last summer.", "irrelevant", "Does fresh paint say anything about the food?", "The paint has nothing to do with how healthy the food is."],
      es: ["Afirmación: Los almuerzos de nuestra escuela son sanos. Evidencia: La cafetería se pintó el verano pasado.", "irrelevant", "¿La pintura nueva dice algo sobre la comida?", "La pintura no tiene nada que ver con lo sana que es la comida."],
    },
    {
      en: ["Claim: Everyone in the state supports the new law. Evidence: A poll of ten people at one shopping mall.", "small-sample", "How many people were asked, and where?", "Ten people at one mall cannot speak for a whole state."],
      es: ["Afirmación: Todo el estado apoya la nueva ley. Evidencia: Una encuesta a diez personas en un centro comercial.", "small-sample", "¿A cuántas personas les preguntaron, y dónde?", "Diez personas en un centro comercial no pueden hablar por todo un estado."],
    },
    {
      en: ["Claim: Video games improve reading skills. Evidence: A video game company's ad.", "biased-source", "Who made the ad, and what do they gain?", "The company profits if people believe games help."],
      es: ["Afirmación: Los videojuegos mejoran la lectura. Evidencia: Un anuncio de una empresa de videojuegos.", "biased-source", "¿Quién hizo el anuncio y qué gana?", "La empresa gana si la gente cree que los juegos ayudan."],
    },
    {
      en: ["Claim: There are nine planets in our solar system. Evidence: A textbook printed in 1995.", "outdated", "When was the book printed, and has astronomy changed since then?", "In 2006, astronomers reclassified Pluto as a dwarf planet, so the book is out of date."],
      es: ["Afirmación: Nuestro sistema solar tiene nueve planetas. Evidencia: Un libro de texto impreso en 1995.", "outdated", "¿Cuándo se imprimió el libro, y ha cambiado la astronomía desde entonces?", "En 2006, los astrónomos reclasificaron a Plutón como planeta enano, así que el libro es antiguo."],
    },
    {
      en: ["Claim: Our class should get a class pet. Evidence: Hamsters are most active at night.", "irrelevant", "Does this fact give a reason for or against having a pet?", "When hamsters are active does not show the class should get a pet."],
      es: ["Afirmación: Nuestra clase debería tener una mascota. Evidencia: Los hámsteres son más activos de noche.", "irrelevant", "¿Este dato da una razón a favor o en contra de tener mascota?", "La hora en que los hámsteres están activos no demuestra que la clase deba tener mascota."],
    },
  ],
);

const EVIDENCE_QUALITY = skill(
  { id: "e.evidence.quality", grade: "9", title: { en: "Evaluate evidence", es: "Evaluar la evidencia" }, standard: "RI.9-10.8", prereqs: ["e.claim.evidence", "e.fallacies"] },
  [
    {
      bank: SOURCES,
      ask: { en: "Which source is the most credible for this question?", es: "¿Qué fuente es la más confiable para esta pregunta?" },
      hints: {
        en: ["Ask who made each source, when, and why.", "The best source is expert, recent when the facts change over time, based on many cases, and free of any reason to twist the facts. One person's story is weak evidence."],
        es: ["Pregúntate quién hizo cada fuente, cuándo y para qué.", "La mejor fuente es experta, reciente si los datos cambian con el tiempo, basada en muchos casos y sin motivos para torcer los hechos. La historia de una sola persona es evidencia débil."],
      },
      seconds: 30,
    },
    {
      ...EVIDENCE_WEAKNESS,
      ask: { en: "What is the main weakness of this evidence?", es: "¿Cuál es la principal debilidad de esta evidencia?" },
      hints: {
        en: ["Read the claim, then ask: does this evidence really prove it?", "Check four things: Is the sample big enough? Does the source gain from the claim? Is it recent enough? Does it even relate to the claim?"],
        es: ["Lee la afirmación y pregúntate: ¿esta evidencia de verdad la prueba?", "Revisa cuatro cosas: ¿la muestra es suficiente?, ¿la fuente gana algo con la afirmación?, ¿es lo bastante reciente?, ¿tiene relación con la afirmación?"],
      },
      seconds: 25,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.mla.citation — level 1: MLA in-text citations (last name and page, no comma, no “p.”; “and” for two
// authors, “et al.” for three or more; a short title in quotation marks when there is no author; only
// the page when the author is named in the sentence; Spanish adds compound surnames written in full);
// level 2: the order of a Works Cited list, alphabetical by the author's last name (Spanish: by the first
// surname). Level 2 is built from the source data below, so the key is sorted by code.

const IN_TEXT: Bi<Entry>[] = [
  {
    en: ["Source: a book by Maria Ruiz. The quotation is on page 42.", "(Ruiz 42)", [["(Ruiz, 42)", "comma-in-citation"], ["(Maria Ruiz 42)", "first-name-in-citation"], ["(Ruiz p. 42)", "page-abbreviation"]], "MLA uses the author's last name and the page number.", "MLA in-text citations give the last name and the page number, with no comma and no “p.”"],
    es: ["Fuente: un libro de María Ruiz. La cita está en la página 42.", "(Ruiz 42)", [["(Ruiz, 42)", "comma-in-citation"], ["(María Ruiz 42)", "first-name-in-citation"], ["(Ruiz p. 42)", "page-abbreviation"]], "MLA usa el apellido del autor y el número de página.", "En MLA, la cita entre paréntesis lleva el apellido y la página, sin coma y sin “p.”."],
  },
  {
    en: ["Source: an article by David Chen. The quotation is on page 7.", "(Chen 7)", [["(Chen, page 7)", "page-word"], ["(7 Chen)", "wrong-order"], ["(David Chen, 7)", "first-name-in-citation"]], "MLA uses the author's last name and the page number, in that order.", "The last name comes first, then the page number, with nothing between them but a space."],
    es: ["Fuente: un libro de Gabriel García Márquez. La cita está en la página 45.", "(García Márquez 45)", [["(Márquez 45)", "partial-surname"], ["(Gabriel García Márquez 45)", "first-name-in-citation"], ["(García Márquez, 45)", "comma-in-citation"]], "En español, muchas personas tienen dos apellidos. ¿Cómo aparece el apellido completo de este autor?", "Los apellidos compuestos se escriben completos: García Márquez, y luego la página sin coma."],
  },
  {
    en: ["Source: a book by Aisha Bello and Tom Park. The quotation is on page 115.", "(Bello and Park 115)", [["(Bello, Park, 115)", "comma-in-citation"], ["(Bello et al. 115)", "et-al-for-two"], ["(Aisha Bello and Tom Park 115)", "first-name-in-citation"]], "There are two authors. How does MLA join two last names?", "Two authors are joined with “and,” followed by the page number."],
    es: ["Fuente: un artículo de Ana López Ortega. La cita está en la página 7.", "(López Ortega 7)", [["(Ortega 7)", "partial-surname"], ["(7 López Ortega)", "wrong-order"], ["(López Ortega, pág. 7)", "page-abbreviation"]], "La autora tiene dos apellidos. ¿Cuáles van en la cita?", "Los dos apellidos van completos, y después la página, sin coma ni abreviatura."],
  },
  {
    en: ["Source: a book by Lena Ortiz, Sam Lee, and Rosa Kim. The quotation is on page 30.", "(Ortiz et al. 30)", [["(Ortiz et al., 30)", "comma-in-citation"], ["(Ortiz, Lee, and Kim 30)", "et-al-missing"], ["(Lena Ortiz et al. 30)", "first-name-in-citation"]], "There are three authors. What does MLA do with three or more?", "With three or more authors, MLA gives the first author's last name and “et al.”"],
    es: ["Fuente: un libro de Lena Ortiz, Sam Lee y Rosa Kim. La cita está en la página 30.", "(Ortiz et al. 30)", [["(Ortiz et al., 30)", "comma-in-citation"], ["(Ortiz, Lee, Kim 30)", "et-al-missing"], ["(Lena Ortiz et al. 30)", "first-name-in-citation"]], "Hay tres autores. ¿Qué hace MLA cuando hay tres o más?", "Con tres autores o más, MLA usa el apellido del primero y “et al.”."],
  },
  {
    en: ["Source: an article with no author, titled “Saving the Bees.” The quotation is on page 3.", "(“Saving the Bees” 3)", [["(Anonymous 3)", "anonymous-for-no-author"], ["(3)", "missing-title"], ["(Saving the Bees 3)", "missing-quotation-marks"]], "There is no author. What does MLA use instead?", "With no author, use the title of the article in quotation marks, then the page."],
    es: ["Fuente: un artículo sin autor titulado “Cómo salvar a las abejas”. La cita está en la página 3.", "(“Cómo salvar a las abejas” 3)", [["(Anónimo 3)", "anonymous-for-no-author"], ["(3)", "missing-title"], ["(Cómo salvar a las abejas 3)", "missing-quotation-marks"]], "No hay autor. ¿Qué usa MLA en su lugar?", "Sin autor, se usa el título del artículo entre comillas y luego la página."],
  },
  {
    en: ["Source: a book by Kenji Sato. Your sentence already names him: Sato argues that rivers shape cities. The idea is on page 58.", "(58)", [["(Sato 58)", "repeated-author"], ["(p. 58)", "page-abbreviation"], ["(Kenji 58)", "first-name-in-citation"]], "The sentence already names the author. What is left to give?", "When the author is named in the sentence, the parentheses give only the page."],
    es: ["Fuente: un libro de Kenji Sato. Tu oración ya lo nombra: Sato explica que los ríos dan forma a las ciudades. La idea está en la página 58.", "(58)", [["(Sato 58)", "repeated-author"], ["(p. 58)", "page-abbreviation"], ["(Kenji 58)", "first-name-in-citation"]], "La oración ya nombra al autor. ¿Qué falta dar?", "Si el autor ya aparece en la oración, en el paréntesis solo va la página."],
  },
  {
    en: ["Source: a web page by Nia Brooks with no page numbers.", "(Brooks)", [["(Brooks, website)", "comma-in-citation"], ["(Nia Brooks)", "first-name-in-citation"], ["(Brooks p. 1)", "page-abbreviation"]], "There are no page numbers. What is left?", "With no page numbers, the citation gives only the last name."],
    es: ["Fuente: una página web de Nia Brooks sin números de página.", "(Brooks)", [["(Brooks, sitio web)", "comma-in-citation"], ["(Nia Brooks)", "first-name-in-citation"], ["(Brooks p. 1)", "page-abbreviation"]], "No hay números de página. ¿Qué queda?", "Sin números de página, la cita lleva solo el apellido."],
  },
  {
    en: ["Source: a book by Omar Haddad, published in 2020. The quotation is on page 201.", "(Haddad 201)", [["(Haddad, 2020)", "apa-style"], ["(201 Haddad)", "wrong-order"], ["(Omar 201)", "first-name-in-citation"]], "Does MLA put the year or the page in the parentheses?", "MLA uses the page number, not the year: the year belongs to another style."],
    es: ["Fuente: un libro de Omar Haddad, publicado en 2020. La cita está en la página 201.", "(Haddad 201)", [["(Haddad, 2020)", "apa-style"], ["(201 Haddad)", "wrong-order"], ["(Omar 201)", "first-name-in-citation"]], "¿MLA pone el año o la página en el paréntesis?", "MLA usa la página, no el año: el año es de otro formato."],
  },
  {
    en: ["Source: an article by Grace Liu and Ben Ford. The quotation is on page 12.", "(Liu and Ford 12)", [["(Liu & Ford, 12)", "apa-style"], ["(Liu et al. 12)", "et-al-for-two"], ["(Liu, Ford 12)", "comma-in-citation"]], "There are two authors. How does MLA join two last names?", "Two authors are joined with the word “and,” followed by the page number."],
    es: ["Fuente: un libro de Sofía Reyes Luna. La cita está en la página 77.", "(Reyes Luna 77)", [["(Luna 77)", "partial-surname"], ["(Reyes Luna, 77)", "comma-in-citation"], ["(Reyes Luna 2019)", "apa-style"]], "La autora tiene dos apellidos. ¿Cuáles van en la cita, y qué número?", "Los dos apellidos van completos, y después la página, sin coma."],
  },
  {
    en: ["Source: a book by Ana Diaz, published in 2019. The quotation is on page 9.", "(Diaz 9)", [["(Diaz, 2019)", "apa-style"], ["(Diaz 2019, 9)", "apa-style"], ["(Diaz, p. 9)", "page-abbreviation"]], "Does MLA put the year or the page in the parentheses?", "MLA uses the last name and the page number only."],
    es: ["Fuente: un libro de Ruth Okafor, Leo Martín e Ida Cho. La cita está en la página 64.", "(Okafor et al. 64)", [["(Okafor et al., 64)", "comma-in-citation"], ["(Okafor, Martín, Cho 64)", "et-al-missing"], ["(Ruth Okafor et al. 64)", "first-name-in-citation"]], "Hay tres autores. ¿Qué hace MLA cuando hay tres o más?", "Con tres autores o más, MLA usa el apellido del primero y “et al.”."],
  },
  {
    en: ["Source: a book by Ruth Okafor, Leo Martin, and Ida Cho. The quotation is on page 64.", "(Okafor et al. 64)", [["(Okafor and Martin 64)", "et-al-missing"], ["(Okafor et al., 64)", "comma-in-citation"], ["(Ruth Okafor et al. 64)", "first-name-in-citation"]], "There are three authors. What does MLA do with three or more?", "With three or more authors, MLA gives the first author's last name and “et al.”"],
    es: ["Fuente: un artículo sin autor titulado “Cómo se forman los volcanes”. La cita está en la página 2.", "(“Cómo se forman los volcanes” 2)", [["(Desconocido 2)", "anonymous-for-no-author"], ["(Cómo se forman los volcanes 2)", "missing-quotation-marks"], ["(2)", "missing-title"]], "No hay autor. ¿Qué usa MLA en su lugar?", "Sin autor, se usa el título del artículo entre comillas y luego la página."],
  },
  {
    en: ["Source: an article with no author, titled “How Volcanoes Form.” The quotation is on page 2.", "(“How Volcanoes Form” 2)", [["(Unknown 2)", "anonymous-for-no-author"], ["(How Volcanoes Form 2)", "missing-quotation-marks"], ["(2)", "missing-title"]], "There is no author. What does MLA use instead?", "With no author, use the title of the article in quotation marks, then the page."],
    es: ["Fuente: un libro de Priya Nair. Tu oración ya la nombra: Nair escribe que “todo mapa cuenta una historia”. La cita está en la página 14.", "(14)", [["(Nair 14)", "repeated-author"], ["(Nair, 14)", "comma-in-citation"], ["(página 14)", "page-word"]], "La oración ya nombra a la autora. ¿Qué falta dar?", "Si la autora ya aparece en la oración, en el paréntesis solo va la página."],
  },
  {
    en: ["Source: a book by Priya Nair. Your sentence already names her: Nair writes that “every map tells a story.” The quotation is on page 14.", "(14)", [["(Nair 14)", "repeated-author"], ["(Nair, 14)", "comma-in-citation"], ["(page 14)", "page-word"]], "The sentence already names the author. What is left to give?", "When the author is named in the sentence, the parentheses give only the page."],
    es: ["Fuente: un libro de Diego Torres Vega. La cita está en la página 9.", "(Torres Vega 9)", [["(Vega 9)", "partial-surname"], ["(Diego Torres Vega 9)", "first-name-in-citation"], ["(Torres Vega, p. 9)", "page-abbreviation"]], "El autor tiene dos apellidos. ¿Cuáles van en la cita?", "Los dos apellidos van completos, y después la página, sin coma ni abreviatura."],
  },
  {
    en: ["Source: a book by Sofia Reyes. The quotation is on page 77.", "(Reyes 77)", [["(Reyes, 77)", "comma-in-citation"], ["(Sofia Reyes, page 77)", "first-name-in-citation"], ["(Reyes 2019)", "apa-style"]], "MLA uses the author's last name and the page number.", "Last name, a space, and the page number: nothing else."],
    es: ["Fuente: un artículo de David Chen. La cita está en la página 12.", "(Chen 12)", [["(Chen, página 12)", "page-word"], ["(12 Chen)", "wrong-order"], ["(Chen 2021)", "apa-style"]], "MLA usa el apellido del autor y el número de página, en ese orden.", "Primero el apellido, después la página, sin nada en medio más que un espacio."],
  },
];

/** A source for the Works Cited order: first name, last name (Spanish: both surnames), year, topic. */
export type Source = [first: string, last: string, year: number, topic: string];

const WORKS_CITED_SETS: Bi<Source[]>[] = [
  { en: [["Maya", "Lee", 2022, "bridges"], ["Ben", "Young", 2010, "deserts"], ["Zoe", "Adams", 2018, "mountains"]], es: [["Ana", "López Ortega", 2022, "puentes"], ["Beto", "Ruiz Gil", 2010, "desiertos"], ["Zoe", "Álvarez Mora", 2018, "montañas"]] },
  { en: [["Omar", "Haddad", 2015, "soccer"], ["Carmen", "Ortiz", 2021, "space travel"], ["Ana", "Bell", 2019, "birds"]], es: [["Omar", "Haddad Soto", 2015, "fútbol"], ["Carmen", "Ortiz Vega", 2021, "viajes espaciales"], ["Ana", "Bello Ramos", 2019, "aves"]] },
  { en: [["Kenji", "Sato", 2012, "cooking"], ["Lucy", "Diaz", 2020, "jazz"], ["Ivan", "Petrov", 2016, "chess"]], es: [["Lucía", "Torres Luna", 2012, "cocina"], ["Diego", "Castro Peña", 2020, "jazz"], ["Iván", "Navarro Díaz", 2016, "ajedrez"]] },
  { en: [["Grace", "Wu", 2017, "volcanoes"], ["Noah", "Fischer", 2011, "basketball"], ["Amara", "Okafor", 2023, "painting"]], es: [["Gabriela", "Ramírez Cruz", 2017, "volcanes"], ["Nicolás", "Fuentes Lara", 2023, "básquetbol"], ["Amara", "Delgado Ríos", 2011, "pintura"]] },
  { en: [["Priya", "Nair", 2014, "whales"], ["Hugo", "Martin", 2022, "robots"], ["Tina", "Garcia", 2019, "gardens"]], es: [["Paula", "Méndez Rojas", 2014, "ballenas"], ["Hugo", "Serrano Gil", 2022, "robots"], ["Elena", "García Paz", 2019, "huertos"]] },
  { en: [["Amy", "Turner", 2016, "baseball"], ["Mei", "Chen", 2013, "music"], ["Ben", "Kapoor", 2021, "planets"]], es: [["Samuel", "Vidal Ortega", 2016, "béisbol"], ["Mei", "Chen Morales", 2013, "música"], ["Raúl", "Herrera Salas", 2021, "planetas"]] },
  { en: [["Lena", "Novak", 2020, "bees"], ["Jamal", "Reed", 2012, "drawing"], ["Ada", "Brooks", 2018, "video games"]], es: [["Lena", "Núñez Ibarra", 2020, "abejas"], ["Javier", "Reyes Campos", 2012, "dibujo"], ["Adela", "Benítez Rosas", 2018, "videojuegos"]] },
  { en: [["Fatima", "Ali", 2023, "poetry"], ["Carlos", "Mendez", 2017, "rain forests"], ["Tom", "Kowalski", 2011, "skateboarding"]], es: [["Carlos", "Medina Ruiz", 2011, "selvas"], ["Fátima", "Aguilar Toro", 2017, "poesía"], ["Tomás", "Cordero Pinto", 2023, "patinetas"]] },
  { en: [["Yuki", "Tanaka", 2019, "origami"], ["Zack", "Adler", 2014, "sharks"], ["Sofia", "Russo", 2022, "baking"]], es: [["Inés", "Vargas León", 2019, "origami"], ["Bruno", "Acosta Neri", 2014, "tiburones"], ["Sofía", "Rivas Molina", 2022, "repostería"]] },
  { en: [["Nia", "Grant", 2021, "dance"], ["Leo", "Vargas", 2013, "comets"], ["Ingrid", "Larsen", 2016, "wolves"]], es: [["Nora", "Gil Prado", 2013, "danza"], ["León", "Valdés Ochoa", 2021, "cometas"], ["Irene", "Lozano Bravo", 2016, "lobos"]] },
  { en: [["Dev", "Shah", 2018, "soccer"], ["Olivia", "Hughes", 2010, "the ocean"], ["Marcus", "Cole", 2022, "guitars"]], es: [["Darío", "Soto Ugarte", 2018, "fútbol"], ["Olivia", "Ibáñez Cano", 2010, "el océano"], ["Marcos", "Cortés Leal", 2022, "guitarras"]] },
  { en: [["Rosa", "Flores", 2015, "insects"], ["Kai", "Miller", 2020, "cooking"], ["Hana", "Ito", 2012, "the moon"]], es: [["Rosa", "Flores Mejía", 2015, "insectos"], ["Kai", "Molina Arce", 2020, "cocina"], ["Hana", "Espinoza Real", 2012, "la Luna"]] },
  { en: [["Ethan", "Moore", 2017, "tennis"], ["Ali", "Hassan", 2023, "chess"], ["Clara", "Dubois", 2011, "painting"]], es: [["Alí", "Hernández Tapia", 2023, "ajedrez"], ["Clara", "Domínguez Sáenz", 2011, "pintura"], ["Ernesto", "Morales Uribe", 2017, "tenis"]] },
  { en: [["Isla", "Murray", 2020, "birds"], ["Tariq", "Bashir", 2014, "jazz"], ["June", "Park", 2018, "stars"]], es: [["Isabel", "Muñoz Beltrán", 2014, "aves"], ["Tariq", "Barrios Quintana", 2020, "jazz"], ["Julia", "Pacheco Rey", 2018, "estrellas"]] },
];

const alpha = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base" });

function worksCitedEntry(locale: Locale, set: Source[]): Entry {
  const order = (list: Source[]) => list.map(([, last]) => last).join(tr(locale, ", then ", ", luego "));
  const by = (cmp: (a: Source, b: Source) => number) => order([...set].sort(cmp));
  const right = by((a, b) => alpha(a[1], b[1]));
  const candidates: W[] = [
    [by((a, b) => alpha(a[0], b[0])), "ordered-by-first-name"],
    [by((a, b) => a[2] - b[2]), "ordered-by-year"],
    [order(set), "kept-original-order"],
  ];
  if (locale === "es") candidates.push([by((a, b) => alpha(a[1].split(" ").pop()!, b[1].split(" ").pop()!)), "ordered-by-second-surname"]);
  const wrong: W[] = [];
  for (const c of candidates) if (c[0] !== right && !wrong.some(([w]) => w === c[0])) wrong.push(c);
  const sources = set.map(([first, last, year, topic]) => tr(locale, `a ${year} book by ${first} ${last} about ${topic}`, `un libro de ${year} de ${first} ${last} sobre ${topic}`));
  const lasts = set.map(([, last]) => last).join(", ");
  return [
    tr(locale, `Sources: ${sources.join("; ")}.`, `Fuentes: ${sources.join("; ")}.`),
    right,
    wrong,
    tr(locale, `In the order listed, the authors' last names are ${lasts}.`, `En el orden de la lista, los apellidos de los autores son: ${lasts}.`),
    tr(locale, "Works Cited entries go in alphabetical order by the author's last name.", "Las obras citadas van en orden alfabético por el primer apellido del autor."),
  ];
}

const WORKS_CITED: Bi<Entry>[] = WORKS_CITED_SETS.map((s) => ({ en: worksCitedEntry("en", s.en), es: worksCitedEntry("es", s.es) }));

const MLA_CITATION = skill(
  { id: "e.mla.citation", grade: "9", title: { en: "MLA citations", es: "Citas en formato MLA" }, standard: "W.9-10.8", prereqs: ["e.evidence.quality"] },
  [
    {
      bank: IN_TEXT,
      ask: { en: "Which in-text citation is correct in MLA style?", es: "¿Qué cita entre paréntesis es correcta en formato MLA?" },
      hints: {
        en: ["What does MLA put inside the parentheses?", "MLA uses the author's last name and the page number, with no comma and no “p.” Two authors are joined with “and”; three or more use the first last name and “et al.” With no author, use the title in quotation marks. If the sentence already names the author, give only the page."],
        es: ["¿Qué pone MLA dentro del paréntesis?", "MLA usa el apellido del autor y el número de página, sin coma y sin “p.”. Con tres autores o más, el primer apellido y “et al.”. Sin autor, el título entre comillas. Si la oración ya nombra al autor, solo la página. Los apellidos compuestos van completos."],
      },
      seconds: 20,
    },
    {
      bank: WORKS_CITED,
      ask: { en: "In what order should these sources appear on the Works Cited page?", es: "¿En qué orden deben aparecer estas fuentes en la lista de obras citadas?" },
      hints: {
        en: ["Works Cited entries follow one kind of order. What is it based on?", "Alphabetize by the author's last name, not by first name, by year, or by the order you used the sources."],
        es: ["La lista de obras citadas sigue un orden alfabético. ¿Por qué parte del nombre?", "Ordena alfabéticamente por el apellido del autor; si tiene dos apellidos, por el primero. No ordenes por el nombre de pila, por el año ni por el orden en que usaste las fuentes."],
      },
      seconds: 30,
    },
  ],
);

export { EVIDENCE_QUALITY, MLA_CITATION, WORKS_CITED_SETS };
