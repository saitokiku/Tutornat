import { cats, skill, type Bi, type Entry, type Cat } from "./shared";

// Grade 9: counterclaims and rebuttals; bias and loaded language.

// ---------------------------------------------------------------------------------------------------
// e.counterclaims — level 1: the role of one sentence in a short argument (claim, evidence,
// counterclaim, rebuttal); level 2: the strongest rebuttal to a counterclaim. Level-2 tags:
// ignores-counterclaim, attacks-person, concedes-without-answer.

type Role = "claim" | "evidence" | "counterclaim" | "rebuttal";
const ROLES: readonly Role[] = ["claim", "evidence", "counterclaim", "rebuttal"];
/**
 * Four-sentence arguments: each role's sentence, and the order the passage puts them in. The order varies
 * (the claim can come first, second or last), so a sentence's position never gives its role away; the
 * rebuttal always comes right after the counterclaim it answers.
 */
type Argument = { order: readonly Role[]; en: Record<Role, string>; es: Record<Role, string> };
const ARGUMENTS: Argument[] = [
  {
    order: ["evidence", "claim", "counterclaim", "rebuttal"],
    en: {
      claim: "Our school should start at 8:30 instead of 7:30.",
      evidence: "A national survey found that most high school students do not get the sleep doctors recommend.",
      counterclaim: "Some parents worry that a later start would make after-school activities end too late.",
      rebuttal: "However, many schools that changed their start times kept their sports by moving practices a little later.",
    },
    es: {
      claim: "Nuestra escuela debería empezar a las 8:30 en lugar de a las 7:30.",
      evidence: "Una encuesta nacional encontró que la mayoría de los estudiantes de preparatoria no duermen las horas que recomiendan los médicos.",
      counterclaim: "Algunos padres temen que entrar más tarde haga que las actividades después de clases terminen muy tarde.",
      rebuttal: "Sin embargo, muchas escuelas que cambiaron su horario mantuvieron sus deportes moviendo los entrenamientos un poco más tarde.",
    },
  },
  {
    order: ["counterclaim", "rebuttal", "evidence", "claim"],
    en: {
      claim: "Our town should build a skate park.",
      evidence: "Last year, the police received more than forty complaints about skateboarders in store parking lots.",
      counterclaim: "Some residents say a skate park would cost too much.",
      rebuttal: "But a fund from the state would pay for most of the building costs.",
    },
    es: {
      claim: "Nuestro pueblo debería construir un parque para patinetas.",
      evidence: "El año pasado, la policía recibió más de cuarenta quejas por patinadores en los estacionamientos de las tiendas.",
      counterclaim: "Algunos vecinos dicen que un parque para patinetas costaría demasiado.",
      rebuttal: "Pero un fondo del estado pagaría casi todo el costo de la construcción.",
    },
  },
  {
    order: ["claim", "evidence", "counterclaim", "rebuttal"],
    en: {
      claim: "Students should be allowed to use phones at lunch.",
      evidence: "In a survey at our school, eight out of ten students said they use lunch to text their families about rides home.",
      counterclaim: "Some teachers argue that phones keep students from talking to each other.",
      rebuttal: "Yet the same survey showed that most students use their phones for only a few minutes of lunch.",
    },
    es: {
      claim: "Los estudiantes deberían poder usar el celular en el almuerzo.",
      evidence: "En una encuesta de nuestra escuela, ocho de cada diez estudiantes dijeron que usan el almuerzo para avisar a su familia cómo regresarán a casa.",
      counterclaim: "Algunos maestros opinan que los celulares impiden que los estudiantes platiquen entre sí.",
      rebuttal: "No obstante, la misma encuesta mostró que la mayoría usa el celular solo unos minutos durante el almuerzo.",
    },
  },
  {
    order: ["claim", "counterclaim", "rebuttal", "evidence"],
    en: {
      claim: "Every middle school should have a garden.",
      evidence: "At Lincoln Middle School, students who worked in the garden ate twice as many vegetables at lunch.",
      counterclaim: "Critics say gardens take too much time away from classes.",
      rebuttal: "In fact, teachers can use the garden to teach science and math lessons.",
    },
    es: {
      claim: "Toda escuela secundaria debería tener un huerto.",
      evidence: "En la Secundaria Lincoln, los estudiantes que trabajaron en el huerto comieron el doble de verduras en el almuerzo.",
      counterclaim: "Hay quienes dicen que el huerto le quita demasiado tiempo a las clases.",
      rebuttal: "En realidad, los maestros pueden usar el huerto para dar lecciones de ciencias y matemáticas.",
    },
  },
  {
    order: ["claim", "counterclaim", "rebuttal", "evidence"],
    en: {
      claim: "Our school should offer a free coding club after school.",
      evidence: "Last year, more than sixty students signed a petition asking for one.",
      counterclaim: "Some people say there are no teachers available to run it.",
      rebuttal: "However, two parents who work as programmers have offered to lead it for free.",
    },
    es: {
      claim: "Nuestra escuela debería ofrecer un club gratuito de programación después de clases.",
      evidence: "El año pasado, más de sesenta estudiantes firmaron una petición para pedirlo.",
      counterclaim: "Algunas personas dicen que no hay maestros disponibles para dirigirlo.",
      rebuttal: "Sin embargo, dos madres que trabajan como programadoras se ofrecieron a dirigirlo gratis.",
    },
  },
  {
    order: ["evidence", "claim", "counterclaim", "rebuttal"],
    en: {
      claim: "Our town should plant more trees along Main Street.",
      evidence: "A county study found that shaded sidewalks on Main Street were more than twenty degrees cooler on summer afternoons.",
      counterclaim: "Some store owners worry that trees would block their signs.",
      rebuttal: "Yet the trees could go between the stores, where they would not cover any signs.",
    },
    es: {
      claim: "Nuestro pueblo debería plantar más árboles en la calle principal.",
      evidence: "Un estudio del condado encontró que las aceras con sombra de la calle principal estaban más de diez grados más frescas en las tardes de verano.",
      counterclaim: "Algunos comerciantes temen que los árboles tapen sus letreros.",
      rebuttal: "No obstante, los árboles podrían ir entre las tiendas, donde no taparían ningún letrero.",
    },
  },
  {
    order: ["counterclaim", "rebuttal", "claim", "evidence"],
    en: {
      claim: "Our library should lend out board games.",
      evidence: "When the library held a game night last month, more than eighty families came.",
      counterclaim: "Some people worry that library board games would soon be missing pieces.",
      rebuttal: "But libraries that already lend games keep each one in a sealed box and count the pieces when it comes back.",
    },
    es: {
      claim: "Nuestra biblioteca debería prestar juegos de mesa.",
      evidence: "Cuando la biblioteca organizó una noche de juegos el mes pasado, llegaron más de ochenta familias.",
      counterclaim: "Algunas personas temen que a los juegos de mesa de la biblioteca pronto les falten piezas.",
      rebuttal: "Pero las bibliotecas que ya prestan juegos guardan cada uno en una caja cerrada y cuentan las piezas cuando lo devuelven.",
    },
  },
  {
    order: ["evidence", "counterclaim", "rebuttal", "claim"],
    en: {
      claim: "Our school should add stations where students can refill water bottles.",
      evidence: "Last year, our cafeteria sold more than five thousand plastic bottles of water.",
      counterclaim: "Some people say refill stations would cost too much.",
      rebuttal: "However, a parent group has already raised enough money for two of them.",
    },
    es: {
      claim: "Nuestra escuela debería instalar estaciones donde los estudiantes puedan rellenar sus botellas de agua.",
      evidence: "El año pasado, la cafetería de nuestra escuela vendió más de cinco mil botellas de agua de plástico.",
      counterclaim: "Algunas personas dicen que las estaciones para rellenar botellas costarían demasiado.",
      rebuttal: "Sin embargo, un grupo de padres ya reunió dinero suficiente para dos.",
    },
  },
];

const ROLE_CLUES: Bi<Record<Role, string>> = {
  en: {
    claim: "Is this the main point the whole paragraph argues for?",
    evidence: "Does this sentence give a number or a fact that backs up the main point?",
    counterclaim: "Whose view is this: the writer's, or people who disagree?",
    rebuttal: "Look at the word it starts with. What earlier sentence does it answer?",
  },
  es: {
    claim: "¿Es la idea principal que defiende todo el párrafo?",
    evidence: "¿Esta oración da un número o un dato que respalda la idea principal?",
    counterclaim: "¿De quién es esta opinión: de quien escribe, o de quienes no están de acuerdo?",
    rebuttal: "Fíjate en la palabra con que empieza. ¿A qué oración anterior responde?",
  },
};
const ROLE_WHY: Bi<Record<Role, string>> = {
  en: {
    claim: "It states the position the writer wants readers to accept.",
    evidence: "It gives a fact that supports the claim.",
    counterclaim: "It presents the view of people who disagree.",
    rebuttal: "It answers the counterclaim and defends the claim.",
  },
  es: {
    claim: "Expresa la postura que quien escribe quiere que el lector acepte.",
    evidence: "Da un dato que apoya la afirmación.",
    counterclaim: "Presenta la opinión de quienes no están de acuerdo.",
    rebuttal: "Responde al contraargumento y defiende la afirmación.",
  },
};

const ARGUMENT_ROLES = cats<Role>(
  {
    en: { claim: "Claim", evidence: "Evidence", counterclaim: "Counterclaim", rebuttal: "Rebuttal" },
    es: { claim: "Afirmación", evidence: "Evidencia", counterclaim: "Contraargumento", rebuttal: "Refutación" },
  },
  { en: ROLES, es: ROLES },
  ARGUMENTS.flatMap(({ order, en, es }) =>
    ROLES.map((role) => ({
      en: [order.map((r) => en[r]).join(" "), role, ROLE_CLUES.en[role], ROLE_WHY.en[role], en[role]] as Cat<Role>,
      es: [order.map((r) => es[r]).join(" "), role, ROLE_CLUES.es[role], ROLE_WHY.es[role], es[role]] as Cat<Role>,
    })),
  ),
);

const REBUTTALS: Bi<Entry>[] = [
  {
    en: ["Claim: Our school should start at 8:30. Counterclaim: A later start would make sports practices end too late.", "Schools that switched to later starts kept their sports by moving practice back thirty minutes.", [["Our school should start at 8:30 because it is a good idea.", "ignores-counterclaim"], ["People who say that just don't care about students.", "attacks-person"], ["It is true that practices would end later.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "A rebuttal answers the worry directly, here by showing how the problem can be solved."],
    es: ["Afirmación: Nuestra escuela debería empezar a las 8:30. Contraargumento: Entrar más tarde haría que los entrenamientos terminen muy tarde.", "Las escuelas que cambiaron su horario mantuvieron sus deportes moviendo los entrenamientos media hora.", [["Nuestra escuela debería empezar a las 8:30 porque es buena idea.", "ignores-counterclaim"], ["Quienes dicen eso no se preocupan por los estudiantes.", "attacks-person"], ["Es cierto que los entrenamientos terminarían más tarde.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "Una refutación responde directamente a la preocupación; aquí muestra cómo resolver el problema."],
  },
  {
    en: ["Claim: The town should build a skate park. Counterclaim: A skate park would cost too much.", "A state fund would cover most of the building costs.", [["Skate parks are fun, so we should build one.", "ignores-counterclaim"], ["Anyone worried about cost is just against young people.", "attacks-person"], ["Yes, skate parks are expensive.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal answers the cost worry with a fact about who would pay."],
    es: ["Afirmación: El pueblo debería construir un parque para patinetas. Contraargumento: Un parque así costaría demasiado.", "Un fondo del estado cubriría casi todo el costo de la construcción.", [["Los parques para patinetas son divertidos, así que hay que construir uno.", "ignores-counterclaim"], ["Quien se preocupa por el costo está en contra de los jóvenes.", "attacks-person"], ["Sí, los parques para patinetas son caros.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación responde a la preocupación por el costo con un dato sobre quién pagaría."],
  },
  {
    en: ["Claim: Students should be allowed to use phones at lunch. Counterclaim: Phones keep students from talking to each other.", "Our survey found that most students use their phones for only a few minutes and spend the rest of lunch talking.", [["Phones should be allowed at lunch because students want them.", "ignores-counterclaim"], ["Teachers who say this are just old-fashioned.", "attacks-person"], ["It is true that some students stare at their phones.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal answers the worry with evidence about how students actually spend lunch."],
    es: ["Afirmación: Los estudiantes deberían poder usar el celular en el almuerzo. Contraargumento: Los celulares impiden que los estudiantes platiquen.", "Nuestra encuesta encontró que la mayoría usa el celular solo unos minutos y pasa el resto del almuerzo platicando.", [["Hay que permitir los celulares porque los estudiantes los quieren.", "ignores-counterclaim"], ["Los maestros que dicen eso son anticuados.", "attacks-person"], ["Es cierto que algunos estudiantes no dejan de ver el celular.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación responde con evidencia sobre cómo pasan el almuerzo los estudiantes."],
  },
  {
    en: ["Claim: Every school should have a garden. Counterclaim: Gardens take time away from classes.", "Teachers can teach science and math lessons in the garden, so garden time is class time.", [["Gardens are good, so every school should have one.", "ignores-counterclaim"], ["Critics of gardens have never planted anything.", "attacks-person"], ["Gardens do take a lot of time.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal shows the garden can be part of class instead of taking time from it."],
    es: ["Afirmación: Toda escuela debería tener un huerto. Contraargumento: El huerto le quita tiempo a las clases.", "Los maestros pueden dar clases de ciencias y matemáticas en el huerto, así que ese tiempo también es clase.", [["Los huertos son buenos, así que toda escuela debería tener uno.", "ignores-counterclaim"], ["Quienes critican los huertos nunca han sembrado nada.", "attacks-person"], ["Es cierto que el huerto toma mucho tiempo.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación muestra que el huerto puede ser parte de la clase en lugar de quitarle tiempo."],
  },
  {
    en: ["Claim: Our city should add bike lanes. Counterclaim: Bike lanes would make car traffic worse.", "A traffic study of our own streets found that the new lanes would add less than a minute to most car trips.", [["Bike lanes are good for the city, so we should add them.", "ignores-counterclaim"], ["Drivers who complain only care about themselves.", "attacks-person"], ["Bike lanes might slow down some cars.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal answers the traffic worry with a local study."],
    es: ["Afirmación: Nuestra ciudad debería agregar ciclovías. Contraargumento: Las ciclovías empeorarían el tráfico de autos.", "Un estudio de tráfico de nuestras propias calles encontró que las ciclovías sumarían menos de un minuto a la mayoría de los viajes en auto.", [["Las ciclovías son buenas para la ciudad, así que hay que ponerlas.", "ignores-counterclaim"], ["Los conductores que se quejan solo piensan en sí mismos.", "attacks-person"], ["Las ciclovías podrían hacer más lentos algunos autos.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación responde a la preocupación por el tráfico con un estudio local."],
  },
  {
    en: ["Claim: Homework should be limited to one hour a night. Counterclaim: Less homework means students will learn less.", "A study at our school found that students who did one hour of homework scored about the same as those who did two.", [["Homework should be limited because students are tired.", "ignores-counterclaim"], ["People who want more homework just like making kids suffer.", "attacks-person"], ["Some students might learn a little less.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal answers the learning worry with evidence about test scores."],
    es: ["Afirmación: La tarea debería limitarse a una hora por noche. Contraargumento: Menos tarea significa que los estudiantes aprenderán menos.", "Un estudio en nuestra escuela encontró que quienes hacían una hora de tarea sacaban notas parecidas a quienes hacían dos.", [["Hay que limitar la tarea porque los estudiantes están cansados.", "ignores-counterclaim"], ["Quienes quieren más tarea solo quieren que los niños sufran.", "attacks-person"], ["Puede que algunos estudiantes aprendan un poco menos.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación responde a la preocupación por el aprendizaje con evidencia sobre las notas."],
  },
  {
    en: ["Claim: The library should stay open until 9 p.m. Counterclaim: Hardly anyone would come in the evening.", "When the library tried late hours last spring, more than a hundred students came each night.", [["The library should stay open late because libraries are important.", "ignores-counterclaim"], ["Whoever says that never reads.", "attacks-person"], ["It is possible that the evenings would be quiet.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal answers with what happened when the library tried late hours."],
    es: ["Afirmación: La biblioteca debería abrir hasta las 9 p. m. Contraargumento: Casi nadie iría en la noche.", "Cuando la biblioteca probó abrir tarde la primavera pasada, llegaron más de cien estudiantes cada noche.", [["La biblioteca debería abrir tarde porque las bibliotecas son importantes.", "ignores-counterclaim"], ["Quien dice eso nunca lee.", "attacks-person"], ["Es posible que en las noches haya poca gente.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación responde con lo que pasó cuando la biblioteca probó abrir tarde."],
  },
  {
    en: ["Claim: Schools should serve free breakfast to every student. Counterclaim: Families should feed their own children breakfast.", "Many parents leave for work before dawn, and a school breakfast makes sure no student starts the day hungry.", [["Schools should serve breakfast because breakfast is important.", "ignores-counterclaim"], ["People who say that have never been hungry.", "attacks-person"], ["Families do usually make breakfast.", "concedes-without-answer"]], "What exactly is the objection? Which choice answers it?", "The rebuttal explains why many families cannot always do it and what the school adds."],
    es: ["Afirmación: Las escuelas deberían dar desayuno gratis a todos los estudiantes. Contraargumento: Cada familia debería darles el desayuno a sus hijos.", "Muchos padres salen a trabajar antes del amanecer, y el desayuno escolar asegura que ningún estudiante empiece el día con hambre.", [["Las escuelas deberían dar desayuno porque el desayuno es importante.", "ignores-counterclaim"], ["Quienes dicen eso nunca han pasado hambre.", "attacks-person"], ["Es cierto que las familias suelen preparar el desayuno.", "concedes-without-answer"]], "¿Cuál es exactamente la objeción? ¿Qué opción le responde?", "La refutación explica por qué muchas familias no siempre pueden hacerlo y qué aporta la escuela."],
  },
  {
    en: ["Claim: Our class should visit the science museum. Counterclaim: An amusement park would be more fun.", "The museum's hands-on exhibits are fun and connect to what we are learning this year.", [["The museum is the right choice for our class trip.", "ignores-counterclaim"], ["Only lazy students want the amusement park.", "attacks-person"], ["The amusement park would be more fun.", "concedes-without-answer"]], "What exactly is the objection? Which choice answers it?", "The rebuttal shows the museum can be fun and also useful."],
    es: ["Afirmación: Nuestra clase debería visitar el museo de ciencias. Contraargumento: Un parque de diversiones sería más divertido.", "Las exhibiciones interactivas del museo son divertidas y se relacionan con lo que aprendemos este año.", [["El museo es la opción correcta para la excursión.", "ignores-counterclaim"], ["Solo los estudiantes flojos quieren ir al parque de diversiones.", "attacks-person"], ["El parque de diversiones sería más divertido.", "concedes-without-answer"]], "¿Cuál es exactamente la objeción? ¿Qué opción le responde?", "La refutación muestra que el museo puede ser divertido y útil a la vez."],
  },
  {
    en: ["Claim: Students should wear uniforms. Counterclaim: Uniforms stop students from expressing themselves.", "Students can still express themselves through clubs, art, and their ideas, and uniforms cut down on teasing about clothes.", [["Uniforms are a good idea for every school.", "ignores-counterclaim"], ["People against uniforms just want to show off.", "attacks-person"], ["Uniforms do limit what students wear.", "concedes-without-answer"]], "What exactly is the objection? Which choice answers it?", "The rebuttal shows other ways to express yourself and adds a benefit."],
    es: ["Afirmación: Los estudiantes deberían usar uniforme. Contraargumento: El uniforme impide que los estudiantes se expresen.", "Los estudiantes pueden expresarse en los clubes, en el arte y con sus ideas, y el uniforme reduce las burlas por la ropa.", [["El uniforme es una buena idea para toda escuela.", "ignores-counterclaim"], ["Quienes están en contra del uniforme solo quieren presumir.", "attacks-person"], ["Es cierto que el uniforme limita lo que se ponen.", "concedes-without-answer"]], "¿Cuál es exactamente la objeción? ¿Qué opción le responde?", "La refutación muestra otras formas de expresarse y suma un beneficio."],
  },
  {
    en: ["Claim: Our town should ban plastic grocery bags. Counterclaim: Paper bags are bad for the environment too.", "The ban would push shoppers toward reusable bags, which can replace hundreds of paper and plastic bags.", [["Plastic bags should be banned because they are bad.", "ignores-counterclaim"], ["People who say that are just lazy about recycling.", "attacks-person"], ["Paper bags do have problems too.", "concedes-without-answer"]], "What exactly is the objection? Which choice answers it?", "The rebuttal shows the ban leads to a better choice than either kind of bag."],
    es: ["Afirmación: Nuestro pueblo debería prohibir las bolsas de plástico. Contraargumento: Las bolsas de papel también dañan el ambiente.", "La prohibición llevaría a usar bolsas reutilizables, que pueden reemplazar cientos de bolsas de papel y de plástico.", [["Hay que prohibir las bolsas de plástico porque son malas.", "ignores-counterclaim"], ["Quienes dicen eso son flojos para reciclar.", "attacks-person"], ["Es cierto que las bolsas de papel también tienen problemas.", "concedes-without-answer"]], "¿Cuál es exactamente la objeción? ¿Qué opción le responde?", "La refutación muestra que la prohibición lleva a una opción mejor que los dos tipos de bolsa."],
  },
  {
    en: ["Claim: Recess should last thirty minutes. Counterclaim: Longer recess means less time for learning.", "Teachers at our school reported that students focused better in afternoon lessons after a longer recess.", [["Recess should be longer because kids like it.", "ignores-counterclaim"], ["People who want short recess have forgotten what it is like to be young.", "attacks-person"], ["A longer recess would take some time from lessons.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal answers with evidence that learning improves."],
    es: ["Afirmación: El recreo debería durar treinta minutos. Contraargumento: Un recreo más largo significa menos tiempo para aprender.", "Los maestros de nuestra escuela notaron que los estudiantes se concentraban mejor en las clases de la tarde después de un recreo más largo.", [["El recreo debería ser más largo porque a los niños les gusta.", "ignores-counterclaim"], ["Quienes quieren un recreo corto olvidaron lo que es ser niño.", "attacks-person"], ["Un recreo más largo le quitaría algo de tiempo a las clases.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación responde con evidencia de que el aprendizaje mejora."],
  },
  {
    en: ["Claim: The school should add a coding class. Counterclaim: There is no room in the schedule.", "The class could replace one study hall, which most students already use as free time.", [["A coding class would be great for students.", "ignores-counterclaim"], ["People who say that do not understand technology.", "attacks-person"], ["The schedule is very full.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal finds room in the schedule."],
    es: ["Afirmación: La escuela debería agregar una clase de programación. Contraargumento: No hay lugar en el horario.", "La clase podría reemplazar una hora de estudio libre, que la mayoría ya usa como tiempo sin actividad.", [["Una clase de programación sería genial para los estudiantes.", "ignores-counterclaim"], ["Quienes dicen eso no entienden la tecnología.", "attacks-person"], ["El horario está muy lleno.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación encuentra lugar en el horario."],
  },
  {
    en: ["Claim: Our team should practice on Saturdays. Counterclaim: Many players have family plans on weekends.", "Saturday practice could be optional, with an extra weekday session for players who cannot come.", [["Saturday practice would make our team better.", "ignores-counterclaim"], ["Players who skip Saturdays do not really care about the team.", "attacks-person"], ["Many players are busy on weekends.", "concedes-without-answer"]], "What exactly is the worry? Which choice answers it?", "The rebuttal offers a solution that respects family plans."],
    es: ["Afirmación: Nuestro equipo debería entrenar los sábados. Contraargumento: Muchos jugadores tienen planes familiares los fines de semana.", "El entrenamiento del sábado podría ser opcional, con una sesión extra entre semana para quienes no puedan ir.", [["Entrenar los sábados haría mejor al equipo.", "ignores-counterclaim"], ["Los jugadores que faltan los sábados no quieren de verdad al equipo.", "attacks-person"], ["Muchos jugadores están ocupados los fines de semana.", "concedes-without-answer"]], "¿Cuál es exactamente la preocupación? ¿Qué opción le responde?", "La refutación ofrece una solución que respeta los planes familiares."],
  },
];

const COUNTERCLAIMS = skill(
  { id: "e.counterclaims", grade: "9", title: { en: "Counterclaims and rebuttals", es: "Contraargumentos y refutaciones" }, standard: "W.9-10.1b", prereqs: ["e.claim.evidence", "e.thesis"] },
  [
    {
      ...ARGUMENT_ROLES,
      ask: { en: "What role does this sentence play in the argument? {t}", es: "¿Qué papel cumple esta oración en el argumento? {t}" },
      hints: {
        en: ["Find the writer's main point first.", "The claim is the main point. Evidence is a fact or number that supports it. A counterclaim gives the other side's view. A rebuttal answers that view, often after a word like “however,” “but,” “yet,” or “in fact.”"],
        es: ["Busca primero la idea principal de quien escribe.", "La afirmación es la idea principal. La evidencia es un dato que la apoya. El contraargumento presenta la opinión contraria. La refutación responde a esa opinión, muchas veces después de “sin embargo”, “pero”, “no obstante” o “en realidad”."],
      },
      seconds: 40,
    },
    {
      bank: REBUTTALS,
      ask: { en: "Which sentence is the strongest rebuttal?", es: "¿Qué oración es la refutación más sólida?" },
      hints: {
        en: ["What exactly is the other side worried about?", "A strong rebuttal answers that worry with a fact, an example, or a solution. Repeating the claim, insulting the other side, or simply agreeing does not rebut it."],
        es: ["¿Qué le preocupa exactamente a la otra postura?", "Una refutación sólida responde a esa preocupación con un dato, un ejemplo o una solución. Repetir la afirmación, insultar a la otra parte o simplemente darle la razón no la refuta."],
      },
      seconds: 35,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.loaded.language — level 1: the loaded word that pushes a feeling; level 2: the neutral report.
// Tags: neutral-word; biased-negative, biased-positive, opinion-as-fact.

const LOADED_WORDS: Bi<Entry>[] = [
  {
    en: ["The mayor's reckless plan would change the bus routes.", "reckless", [["mayor's", "neutral-word"], ["bus routes", "neutral-word"]], "Which word judges the plan instead of just describing it?", "“Reckless” tells the reader to see the plan as dangerous."],
    es: ["El plan imprudente de la alcaldesa cambiaría las rutas del autobús.", "imprudente", [["alcaldesa", "neutral-word"], ["rutas del autobús", "neutral-word"]], "¿Qué palabra juzga el plan en lugar de solo describirlo?", "“Imprudente” le pide al lector ver el plan como peligroso."],
  },
  {
    en: ["A mob of parents met with the school board on Tuesday.", "mob", [["parents", "neutral-word"], ["Tuesday", "neutral-word"]], "Which word makes the group sound dangerous?", "“Mob” makes a group of parents sound wild; “group” would be neutral."],
    es: ["Una turba de padres se reunió con la junta escolar el martes.", "turba", [["padres", "neutral-word"], ["martes", "neutral-word"]], "¿Qué palabra hace que el grupo suene peligroso?", "“Turba” hace que un grupo de padres suene descontrolado; “grupo” sería neutral."],
  },
  {
    en: ["The heroic volunteers cleaned the beach on Saturday.", "heroic", [["volunteers", "neutral-word"], ["beach", "neutral-word"]], "Which word pushes you to admire the volunteers?", "“Heroic” pushes readers to admire them; the plain fact is that they cleaned the beach."],
    es: ["Los heroicos voluntarios limpiaron la playa el sábado.", "heroicos", [["voluntarios", "neutral-word"], ["playa", "neutral-word"]], "¿Qué palabra te empuja a admirar a los voluntarios?", "“Heroicos” empuja al lector a admirarlos; el dato es solo que limpiaron la playa."],
  },
  {
    en: ["The company dumped its waste into the river last year.", "dumped", [["company", "neutral-word"], ["last year", "neutral-word"]], "Which word makes the action sound careless?", "“Dumped” makes it sound careless; “released” would be more neutral."],
    es: ["La empresa envenenó el río con sus desechos el año pasado.", "envenenó", [["empresa", "neutral-word"], ["el año pasado", "neutral-word"]], "¿Qué palabra hace que la acción suene criminal?", "“Envenenó” es mucho más fuerte que “vertió desechos”."],
  },
  {
    en: ["Our senator caved in to pressure and changed her vote.", "caved in", [["senator", "neutral-word"], ["changed her vote", "neutral-word"]], "Which words make the senator sound weak?", "“Caved in” makes changing a vote sound weak."],
    es: ["La senadora se doblegó ante la presión y cambió su voto.", "se doblegó", [["senadora", "neutral-word"], ["cambió su voto", "neutral-word"]], "¿Qué palabras hacen que la senadora suene débil?", "“Se doblegó” hace que cambiar el voto suene a debilidad."],
  },
  {
    en: ["The new law is a job-killing disaster for small towns.", "job-killing disaster", [["new law", "neutral-word"], ["small towns", "neutral-word"]], "Which words try to scare you about the law?", "“Job-killing disaster” is meant to frighten readers, not to inform them."],
    es: ["La nueva ley es un desastre que destruye empleos en los pueblos pequeños.", "un desastre que destruye empleos", [["nueva ley", "neutral-word"], ["pueblos pequeños", "neutral-word"]], "¿Qué palabras intentan asustarte sobre la ley?", "“Un desastre que destruye empleos” busca asustar, no informar."],
  },
  {
    en: ["The team's star player was seen lurking near the coach's office.", "lurking", [["star player", "neutral-word"], ["coach's office", "neutral-word"]], "Which word makes the player sound sneaky?", "“Lurking” suggests something suspicious; “waiting” would be neutral."],
    es: ["Vieron al jugador estrella merodeando cerca de la oficina del entrenador.", "merodeando", [["jugador estrella", "neutral-word"], ["oficina del entrenador", "neutral-word"]], "¿Qué palabra hace que el jugador suene sospechoso?", "“Merodeando” sugiere algo sospechoso; “esperando” sería neutral."],
  },
  {
    en: ["The school board finally came to its senses and approved the plan.", "came to its senses", [["school board", "neutral-word"], ["approved", "neutral-word"]], "Which words suggest the board was foolish before?", "“Came to its senses” judges the board's earlier choices."],
    es: ["Por fin la junta escolar entró en razón y aprobó el plan.", "entró en razón", [["junta escolar", "neutral-word"], ["aprobó", "neutral-word"]], "¿Qué palabras sugieren que antes la junta actuaba sin pensar?", "“Entró en razón” juzga lo que la junta hacía antes."],
  },
  {
    en: ["The so-called expert spoke to our class about nutrition.", "so-called", [["expert", "neutral-word"], ["nutrition", "neutral-word"]], "Which word makes you doubt the speaker?", "“So-called” hints that the expert is not really an expert."],
    es: ["El supuesto experto habló con nuestra clase sobre nutrición.", "supuesto", [["experto", "neutral-word"], ["nutrición", "neutral-word"]], "¿Qué palabra te hace dudar de quien habló?", "“Supuesto” insinúa que en realidad no es experto."],
  },
  {
    en: ["The greedy landlord raised the rent again.", "greedy", [["landlord", "neutral-word"], ["rent", "neutral-word"]], "Which word judges the landlord?", "“Greedy” judges the landlord instead of just reporting the rent increase."],
    es: ["El casero avaricioso volvió a subir el alquiler.", "avaricioso", [["casero", "neutral-word"], ["alquiler", "neutral-word"]], "¿Qué palabra juzga al casero?", "“Avaricioso” juzga al casero en lugar de solo informar la subida."],
  },
  {
    en: ["The council's sneaky vote happened late at night.", "sneaky", [["council's", "neutral-word"], ["late at night", "neutral-word"]], "Which word suggests the council was hiding something?", "“Sneaky” accuses the council of trickery."],
    es: ["La votación tramposa del concejo ocurrió a altas horas de la noche.", "tramposa", [["concejo", "neutral-word"], ["noche", "neutral-word"]], "¿Qué palabra sugiere que el concejo ocultaba algo?", "“Tramposa” acusa al concejo de hacer trampa."],
  },
  {
    en: ["Supporters say the park is a priceless treasure for our town.", "priceless treasure", [["supporters", "neutral-word"], ["town", "neutral-word"]], "Which words push you to love the park?", "“Priceless treasure” is meant to stir strong feelings for the park."],
    es: ["Sus defensores dicen que el parque es un tesoro invaluable para el pueblo.", "tesoro invaluable", [["defensores", "neutral-word"], ["pueblo", "neutral-word"]], "¿Qué palabras te empujan a querer el parque?", "“Tesoro invaluable” busca despertar sentimientos fuertes por el parque."],
  },
  {
    en: ["The principal slashed the art budget this spring.", "slashed", [["principal", "neutral-word"], ["art budget", "neutral-word"]], "Which word makes the change sound violent?", "“Slashed” sounds harsh; “cut” or “reduced” would be neutral."],
    es: ["El director destrozó el presupuesto de arte esta primavera.", "destrozó", [["director", "neutral-word"], ["presupuesto de arte", "neutral-word"]], "¿Qué palabra hace que el cambio suene destructivo?", "“Destrozó” suena brutal; “redujo” sería neutral."],
  },
  {
    en: ["The visiting team whined about the referee's calls.", "whined", [["visiting team", "neutral-word"], ["referee's calls", "neutral-word"]], "Which word makes the team sound childish?", "“Whined” mocks the team; “complained” would be more neutral."],
    es: ["El equipo visitante lloriqueó por las decisiones del árbitro.", "lloriqueó", [["equipo visitante", "neutral-word"], ["decisiones del árbitro", "neutral-word"]], "¿Qué palabra hace que el equipo suene infantil?", "“Lloriqueó” se burla del equipo; “se quejó” sería más neutral."],
  },
];

const NEUTRAL_REPORT: Bi<Entry>[] = [
  {
    en: ["Topic: the city's new parking fee downtown.", "The city will charge two dollars an hour for parking downtown starting in May.", [["The city's greedy new parking fee will squeeze drivers starting in May.", "biased-negative"], ["The city's smart new parking plan will finally fix downtown starting in May.", "biased-positive"], ["Everyone agrees the new two-dollar parking fee is unfair.", "opinion-as-fact"]], "Which version reports only what will happen?", "The neutral version states the facts without judging them."],
    es: ["Tema: la nueva tarifa de estacionamiento en el centro.", "La ciudad cobrará dos dólares por hora de estacionamiento en el centro a partir de mayo.", [["La avariciosa tarifa de la ciudad exprimirá a los conductores a partir de mayo.", "biased-negative"], ["El brillante plan de la ciudad por fin arreglará el centro a partir de mayo.", "biased-positive"], ["Todos están de acuerdo en que la nueva tarifa es injusta.", "opinion-as-fact"]], "¿Qué versión informa solo lo que va a pasar?", "La versión neutral da los hechos sin juzgarlos."],
  },
  {
    en: ["Topic: parents speaking at a school board meeting.", "About fifty parents spoke at the school board meeting about the new schedule.", [["A mob of angry parents stormed the school board meeting.", "biased-negative"], ["Brave parents stood up for their children at the school board meeting.", "biased-positive"], ["Obviously, the new schedule upset every single parent.", "opinion-as-fact"]], "Which version reports only what happened?", "The neutral version says who spoke, where, and about what."],
    es: ["Tema: padres que hablaron en una reunión de la junta escolar.", "Unos cincuenta padres hablaron sobre el nuevo horario en la reunión de la junta escolar.", [["Una turba de padres furiosos irrumpió en la reunión de la junta escolar.", "biased-negative"], ["Padres valientes defendieron a sus hijos en la reunión de la junta escolar.", "biased-positive"], ["Es obvio que el nuevo horario molestó a todos los padres.", "opinion-as-fact"]], "¿Qué versión informa solo lo que pasó?", "La versión neutral dice quién habló, dónde y sobre qué."],
  },
  {
    en: ["Topic: a factory closing.", "The factory will close in June, and 200 workers will need new jobs.", [["Heartless owners are abandoning 200 loyal workers in June.", "biased-negative"], ["The owners are wisely moving on from an outdated factory in June.", "biased-positive"], ["Clearly, closing the factory is the worst decision anyone could make.", "opinion-as-fact"]], "Which version reports only what will happen?", "The neutral version gives the date and the number of workers without judging."],
    es: ["Tema: el cierre de una fábrica.", "La fábrica cerrará en junio, y 200 trabajadores necesitarán un nuevo empleo.", [["Unos dueños sin corazón abandonarán a 200 trabajadores leales en junio.", "biased-negative"], ["Los dueños dejan con sabiduría una fábrica anticuada en junio.", "biased-positive"], ["Está claro que cerrar la fábrica es la peor decisión posible.", "opinion-as-fact"]], "¿Qué versión informa solo lo que va a pasar?", "La versión neutral da la fecha y el número de trabajadores sin juzgar."],
  },
  {
    en: ["Topic: a new video game.", "The game was released on Friday and costs 30 dollars.", [["The overpriced game was dumped on stores Friday.", "biased-negative"], ["The amazing game finally arrived Friday at a bargain price.", "biased-positive"], ["Everyone knows this is the best game ever made.", "opinion-as-fact"]], "Which version reports only facts you could check?", "The neutral version gives the date and the price."],
    es: ["Tema: un nuevo videojuego.", "El juego salió a la venta el viernes y cuesta 30 dólares.", [["El juego carísimo llegó a las tiendas el viernes.", "biased-negative"], ["El increíble juego por fin llegó el viernes a un precio de regalo.", "biased-positive"], ["Todo el mundo sabe que es el mejor juego de la historia.", "opinion-as-fact"]], "¿Qué versión informa solo datos que se pueden comprobar?", "La versión neutral da la fecha y el precio."],
  },
  {
    en: ["Topic: a senator's vote.", "The senator voted against the bill on Tuesday.", [["The senator betrayed voters by blocking the bill on Tuesday.", "biased-negative"], ["The courageous senator stood firm against the bill on Tuesday.", "biased-positive"], ["The senator's vote was obviously wrong.", "opinion-as-fact"]], "Which version reports only what happened?", "The neutral version says how the senator voted and when."],
    es: ["Tema: el voto de una senadora.", "La senadora votó en contra del proyecto de ley el martes.", [["La senadora traicionó a sus votantes al bloquear el proyecto el martes.", "biased-negative"], ["La valiente senadora se mantuvo firme contra el proyecto el martes.", "biased-positive"], ["Es obvio que el voto de la senadora fue un error.", "opinion-as-fact"]], "¿Qué versión informa solo lo que pasó?", "La versión neutral dice cómo votó la senadora y cuándo."],
  },
  {
    en: ["Topic: a change to the lunch menu.", "The cafeteria will replace pizza Fridays with a salad bar next month.", [["The cafeteria is ripping away pizza Fridays next month.", "biased-negative"], ["The cafeteria is finally giving students a healthy salad bar next month.", "biased-positive"], ["No student will want the new salad bar.", "opinion-as-fact"]], "Which version reports only what will change?", "The neutral version says what changes and when."],
    es: ["Tema: un cambio en el menú del almuerzo.", "El próximo mes, la cafetería cambiará la pizza de los viernes por una barra de ensaladas.", [["El próximo mes, la cafetería nos arrebatará la pizza de los viernes.", "biased-negative"], ["El próximo mes, la cafetería por fin dará una barra de ensaladas saludable.", "biased-positive"], ["Ningún estudiante va a querer la barra de ensaladas.", "opinion-as-fact"]], "¿Qué versión informa solo lo que va a cambiar?", "La versión neutral dice qué cambia y cuándo."],
  },
  {
    en: ["Topic: a new skate park.", "The town council approved a skate park for Elm Park; it will cost 400,000 dollars.", [["The council wasted 400,000 dollars on a skate park.", "biased-negative"], ["The council gave young people a wonderful gift: a skate park.", "biased-positive"], ["The skate park is plainly the best use of town money.", "opinion-as-fact"]], "Which version reports only facts you could check?", "The neutral version says what was approved and what it costs."],
    es: ["Tema: un nuevo parque para patinetas.", "El concejo aprobó un parque para patinetas en el parque Olmo, que costará 400,000 dólares.", [["El concejo desperdició 400,000 dólares en un parque para patinetas.", "biased-negative"], ["El concejo les dio a los jóvenes un regalo maravilloso: un parque para patinetas.", "biased-positive"], ["Está claro que el parque es el mejor uso del dinero del pueblo.", "opinion-as-fact"]], "¿Qué versión informa solo datos que se pueden comprobar?", "La versión neutral dice qué se aprobó y cuánto cuesta."],
  },
  {
    en: ["Topic: a teachers' strike.", "Teachers in the district stopped work on Monday after contract talks ended without a deal.", [["Teachers abandoned their students on Monday.", "biased-negative"], ["Heroic teachers took a stand for students on Monday.", "biased-positive"], ["The strike is clearly the district's fault.", "opinion-as-fact"]], "Which version reports only what happened and why?", "The neutral version reports the event and its cause without judging anyone."],
    es: ["Tema: una huelga de maestros.", "Los maestros del distrito dejaron de trabajar el lunes después de que las negociaciones terminaron sin acuerdo.", [["Los maestros abandonaron a sus estudiantes el lunes.", "biased-negative"], ["Maestros heroicos defendieron a sus estudiantes el lunes.", "biased-positive"], ["Está claro que la huelga es culpa del distrito.", "opinion-as-fact"]], "¿Qué versión informa solo lo que pasó y por qué?", "La versión neutral informa el hecho y su causa sin juzgar a nadie."],
  },
  {
    en: ["Topic: a study about screen time.", "A new study found that students who used screens less than two hours a day slept about thirty minutes longer.", [["A shocking study proves screens are ruining kids' sleep.", "biased-negative"], ["A study shows that screen time is totally harmless.", "biased-positive"], ["Every scientist agrees that screens destroy sleep.", "opinion-as-fact"]], "Which version reports only what the study found?", "The neutral version reports the finding without exaggerating it."],
    es: ["Tema: un estudio sobre el tiempo frente a pantallas.", "Un estudio nuevo encontró que los estudiantes que usaban pantallas menos de dos horas al día dormían unos treinta minutos más.", [["Un estudio impactante demuestra que las pantallas arruinan el sueño de los niños.", "biased-negative"], ["Un estudio muestra que las pantallas no hacen ningún daño.", "biased-positive"], ["Todos los científicos están de acuerdo en que las pantallas destruyen el sueño.", "opinion-as-fact"]], "¿Qué versión informa solo lo que encontró el estudio?", "La versión neutral informa el resultado sin exagerarlo."],
  },
  {
    en: ["Topic: a new highway.", "The state plans to build a highway through the valley, which will shorten the trip to the city by twenty minutes.", [["The state will bulldoze the peaceful valley for a noisy highway.", "biased-negative"], ["The state's visionary highway will finally connect the valley to the world.", "biased-positive"], ["The highway is obviously a mistake.", "opinion-as-fact"]], "Which version reports only the plan and its effect?", "The neutral version states the plan and a checkable fact about it."],
    es: ["Tema: una nueva carretera.", "El estado planea construir una carretera por el valle, que acortará el viaje a la ciudad en veinte minutos.", [["El estado arrasará el tranquilo valle para hacer una carretera ruidosa.", "biased-negative"], ["La visionaria carretera del estado por fin conectará el valle con el mundo.", "biased-positive"], ["Es obvio que la carretera es un error.", "opinion-as-fact"]], "¿Qué versión informa solo el plan y su efecto?", "La versión neutral da el plan y un dato comprobable."],
  },
  {
    en: ["Topic: a school's new phone rule.", "Starting next week, students must keep phones in their lockers during class.", [["Next week, the school will start confiscating students' phones.", "biased-negative"], ["Next week, the school will rescue students from phone addiction.", "biased-positive"], ["Everyone hates the new phone rule.", "opinion-as-fact"]], "Which version reports only the rule?", "The neutral version states the rule and when it starts."],
    es: ["Tema: la nueva regla de celulares de una escuela.", "A partir de la próxima semana, los estudiantes deberán dejar el celular en su casillero durante la clase.", [["La próxima semana, la escuela empezará a confiscar los celulares.", "biased-negative"], ["La próxima semana, la escuela rescatará a los estudiantes de la adicción al celular.", "biased-positive"], ["Todo el mundo odia la nueva regla.", "opinion-as-fact"]], "¿Qué versión informa solo la regla?", "La versión neutral da la regla y cuándo empieza."],
  },
  {
    en: ["Topic: a rainy-day recess change.", "On rainy days, recess will be held in the gym.", [["Students will be trapped in the stuffy gym on rainy days.", "biased-negative"], ["Students will enjoy a fantastic gym recess on rainy days.", "biased-positive"], ["The gym is obviously the worst place for recess.", "opinion-as-fact"]], "Which version reports only the change?", "The neutral version says where recess will be and when."],
    es: ["Tema: el recreo en días de lluvia.", "En los días de lluvia, el recreo será en el gimnasio.", [["En los días de lluvia, los estudiantes quedarán encerrados en el gimnasio sofocante.", "biased-negative"], ["En los días de lluvia, los estudiantes disfrutarán de un recreo fantástico en el gimnasio.", "biased-positive"], ["Es obvio que el gimnasio es el peor lugar para el recreo.", "opinion-as-fact"]], "¿Qué versión informa solo el cambio?", "La versión neutral dice dónde será el recreo y cuándo."],
  },
  {
    en: ["Topic: a new bike-share program.", "The city added 100 rental bikes at ten stations downtown.", [["The city cluttered downtown sidewalks with 100 rental bikes.", "biased-negative"], ["The city's brilliant bike program will save downtown.", "biased-positive"], ["Clearly, nobody will ever ride these bikes.", "opinion-as-fact"]], "Which version reports only facts you could check?", "The neutral version gives the number of bikes and stations."],
    es: ["Tema: un nuevo programa de bicicletas compartidas.", "La ciudad puso 100 bicicletas de alquiler en diez estaciones del centro.", [["La ciudad llenó las banquetas del centro de 100 estorbosas bicicletas.", "biased-negative"], ["El brillante programa de bicicletas salvará el centro.", "biased-positive"], ["Está claro que nadie va a usar esas bicicletas.", "opinion-as-fact"]], "¿Qué versión informa solo datos que se pueden comprobar?", "La versión neutral da el número de bicicletas y de estaciones."],
  },
  {
    en: ["Topic: a change to the library's hours.", "Starting in July, the library will close at 6 p.m. instead of 8 p.m.", [["In July, the library will slash its hours and shut out working families.", "biased-negative"], ["In July, the library will wisely trim its wasted evening hours.", "biased-positive"], ["Obviously, no one uses the library at night.", "opinion-as-fact"]], "Which version reports only the change?", "The neutral version gives the old and new closing times."],
    es: ["Tema: un cambio en el horario de la biblioteca.", "A partir de julio, la biblioteca cerrará a las 6 p. m. en lugar de a las 8 p. m.", [["En julio, la biblioteca recortará su horario y dejará fuera a las familias que trabajan.", "biased-negative"], ["En julio, la biblioteca eliminará con sabiduría sus horas desperdiciadas de la noche.", "biased-positive"], ["Es obvio que nadie usa la biblioteca de noche.", "opinion-as-fact"]], "¿Qué versión informa solo el cambio?", "La versión neutral da la hora de cierre anterior y la nueva."],
  },
];

const LOADED_LANGUAGE = skill(
  { id: "e.loaded.language", grade: "9", title: { en: "Bias and loaded language", es: "Sesgo y lenguaje cargado" }, standard: "RI.9-10.6", prereqs: ["e.connotation", "e.appeals"] },
  [
    {
      bank: LOADED_WORDS,
      ask: { en: "Which word or phrase is loaded, pushing the reader to feel a certain way?", es: "¿Qué palabra o frase está cargada y empuja al lector a sentir algo?" },
      hints: {
        en: ["Look for a word that judges instead of just describing.", "Loaded words carry strong feelings, like “sinister,” “glorious,” or “horde.” Neutral words just name or describe. Ask which choice could be swapped for a calmer word with the same basic meaning."],
        es: ["Busca una palabra que juzgue en lugar de solo describir.", "Las palabras cargadas llevan sentimientos fuertes, como “siniestro”, “glorioso” u “horda”. Las neutrales solo nombran o describen. Pregúntate qué opción se podría cambiar por una palabra más tranquila con el mismo significado básico."],
      },
      seconds: 20,
    },
    {
      bank: NEUTRAL_REPORT,
      ask: { en: "Which sentence reports this most neutrally, without bias?", es: "¿Qué oración lo informa de la manera más neutral, sin sesgo?" },
      hints: {
        en: ["Which version sticks to facts you could check?", "Rule out versions with loaded words that push you to like or dislike something, and versions that state an opinion as if it were a fact, with words like “obviously,” “clearly,” or “everyone agrees.”"],
        es: ["¿Qué versión se limita a datos que se pueden comprobar?", "Descarta las versiones con palabras cargadas que te empujan a querer o rechazar algo, y las que presentan una opinión como si fuera un hecho, con palabras como “es obvio”, “está claro” o “todos están de acuerdo”."],
      },
      seconds: 30,
    },
  ],
);

export { COUNTERCLAIMS, LOADED_LANGUAGE };
