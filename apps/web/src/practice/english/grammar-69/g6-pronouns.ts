import { cats, skill, CHOOSE, type Bi, type Entry } from "./shared";

// Grade 6: intensive and reflexive pronouns; clear pronouns.

// ---------------------------------------------------------------------------------------------------
// e.intensive.pronouns — level 1: the right -self form (English) or the right "mismo" and reflexive
// pronoun (Spanish: mismo agrees in gender and number; consigo and sí only point back to the subject);
// level 2: intensive or reflexive (enfático o reflexivo).

const SELF_FORMS: Bi<Entry>[] = [
  {
    en: ["My uncle built the treehouse by ___.", "himself", [["hisself", "nonstandard-form"], ["yourself", "wrong-person"]], "The pronoun points back to “my uncle,” one man.", "“Himself” matches “my uncle.” “Hisself” is not standard English."],
    es: ["Las niñas ___ armaron la tienda de campaña.", "mismas", [["mismos", "gender-mismatch"], ["misma", "number-mismatch"]], "La palabra se refiere a “las niñas”.", "“Niñas” es femenino y plural, así que va “mismas”."],
  },
  {
    en: ["The players fixed the torn net ___.", "themselves", [["theirselves", "nonstandard-form"], ["itself", "number-mismatch"]], "The pronoun points back to “the players,” more than one person.", "“Themselves” matches the plural “players.” “Theirselves” is not standard English."],
    es: ["El alcalde ___ cortó el listón de la biblioteca nueva.", "mismo", [["misma", "gender-mismatch"], ["mismos", "number-mismatch"]], "La palabra se refiere a “el alcalde”.", "“Alcalde” es masculino y singular: “el alcalde mismo”."],
  },
  {
    en: ["Kenji and ___ cleaned out the garage.", "I", [["myself", "reflexive-as-subject"], ["me", "object-as-subject"]], "Drop “Kenji and”: “___ cleaned out the garage.”", "The word is part of the subject, so use the subject form. A -self pronoun cannot be the subject by itself."],
    es: ["Marta, tú ___ me lo dijiste ayer.", "misma", [["mismo", "gender-mismatch"], ["mismas", "number-mismatch"]], "Le hablas a Marta, una sola persona.", "“Marta” es femenino y singular: “tú misma”."],
  },
  {
    en: ["Please send the photos to Ms. Ruiz or ___.", "me", [["myself", "reflexive-without-antecedent"], ["I", "subject-as-object"]], "Drop “Ms. Ruiz or”: “Please send the photos to ___.”", "A -self pronoun needs an “I” earlier in the sentence to point back to, and there is none. After “to,” use the object form."],
    es: ["Nosotros ___ vestimos rápido para la obra de teatro.", "nos", [["se", "wrong-person"], ["te", "wrong-person"]], "El verbo “vestimos” está en primera persona del plural.", "Con “nosotros” va “nos”: “nos vestimos”."],
  },
  {
    en: ["We painted the mural in the hallway ___.", "ourselves", [["ourself", "number-mismatch"], ["themselves", "wrong-person"]], "The pronoun points back to “we.”", "“We” is plural and first person, so use “ourselves.”"],
    es: ["Después del desmayo, Carlos volvió en ___.", "sí", [["él", "not-reflexive"], ["si", "missing-accent"]], "La palabra se refiere al mismo Carlos, quien hace la acción.", "Cuando se refiere al sujeto, va el reflexivo “sí”, con tilde: “volvió en sí”."],
  },
  {
    en: ["The robot vacuum turned ___ off when the battery ran low.", "itself", [["itsself", "nonstandard-form"], ["themselves", "number-mismatch"]], "The pronoun points back to “the robot vacuum,” one thing.", "One thing takes “itself,” spelled with one s."],
    es: ["Pedro habla ___ mismo cuando repasa para un examen.", "consigo", [["con él", "not-reflexive"], ["contigo", "wrong-person"]], "La palabra se refiere al mismo Pedro.", "Para decir “con él mismo” cuando se habla del sujeto, se usa “consigo”: “habla consigo mismo”."],
  },
  {
    en: ["My grandmother ___ sewed this quilt by hand.", "herself", [["her", "not-a-self-pronoun"], ["themselves", "number-mismatch"]], "The word right after “my grandmother” adds emphasis: she did it, no one else.", "A pronoun that stresses “my grandmother” is “herself.”"],
    es: ["Señora Díaz, ¿puedo hablar ___ un momento?", "con usted", [["consigo", "reflexive-without-antecedent"], ["con ella", "wrong-person"]], "Le hablas directamente a la señora Díaz, de usted.", "“Consigo” solo se usa cuando se refiere a quien hace la acción. Aquí se dice “con usted”."],
  },
  {
    en: ["The tickets are for Amara and ___.", "me", [["myself", "reflexive-without-antecedent"], ["I", "subject-as-object"]], "Drop “Amara and”: “The tickets are for ___.”", "There is no “I” earlier in the sentence for a -self pronoun to point back to. After “for,” use the object form."],
    es: ["Los abuelos ___ cocinaron la cena de Navidad.", "mismos", [["mismo", "number-mismatch"], ["mismas", "gender-mismatch"]], "La palabra se refiere a “los abuelos”.", "“Abuelos” es masculino y plural: “los abuelos mismos”."],
  },
  {
    en: ["The students ___ chose the theme for the spring dance.", "themselves", [["theirselves", "nonstandard-form"], ["himself", "number-mismatch"]], "The word stresses that “the students,” more than one person, made the choice.", "“Themselves” matches the plural “students.”"],
    es: ["Nosotras ___ pintamos el mural del pasillo.", "mismas", [["mismos", "gender-mismatch"], ["misma", "number-mismatch"]], "La palabra se refiere a “nosotras”.", "“Nosotras” es femenino y plural: “nosotras mismas”."],
  },
  {
    en: ["I taught ___ to juggle three balls.", "myself", [["me", "not-a-self-pronoun"], ["meself", "nonstandard-form"]], "The one who taught and the one who learned are the same person: “I.”", "When the doer and the receiver are the same, use the -self form: “myself.”"],
    es: ["Yo ___ lavo los dientes después de cada comida.", "me", [["se", "wrong-person"], ["te", "wrong-person"]], "El verbo “lavo” está en primera persona: yo.", "Con “yo” va “me”: “me lavo”."],
  },
  {
    en: ["Ali and Nadia introduced ___ to the new student.", "themselves", [["theirselves", "nonstandard-form"], ["ourselves", "wrong-person"]], "The pronoun points back to “Ali and Nadia.”", "Two people, third person: “themselves.”"],
    es: ["La doctora ___ nos explicó los resultados.", "misma", [["mismo", "gender-mismatch"], ["mismas", "number-mismatch"]], "La palabra se refiere a “la doctora”.", "“Doctora” es femenino y singular: “la doctora misma”."],
  },
  {
    en: ["Mr. Owens ___ handed out the science fair ribbons.", "himself", [["hisself", "nonstandard-form"], ["yourself", "wrong-person"]], "The word stresses that “Mr. Owens,” one man, did it in person.", "“Himself” matches “Mr. Owens.”"],
    es: ["Luis y Marcos ___ arreglaron la bicicleta.", "mismos", [["mismo", "number-mismatch"], ["mismas", "gender-mismatch"]], "La palabra se refiere a “Luis y Marcos”.", "Son dos personas, masculino plural: “mismos”."],
  },
  {
    en: ["He and ___ have been friends since kindergarten.", "I", [["myself", "reflexive-as-subject"], ["me", "object-as-subject"]], "Drop “He and”: “___ have been friends since kindergarten.”", "The word is part of the subject, so use the subject form."],
    es: ["Mi primo solo piensa en ___ mismo.", "sí", [["él", "not-reflexive"], ["si", "missing-accent"]], "La palabra se refiere al mismo primo, quien piensa.", "Cuando se refiere al sujeto, va el reflexivo “sí”, con tilde: “en sí mismo”."],
  },
  {
    en: ["The kids made ___ a snack after school.", "themselves", [["theirselves", "nonstandard-form"], ["themself", "number-mismatch"]], "The pronoun points back to “the kids.”", "The kids made the snack for the kids, so use “themselves.”"],
    es: ["¿Tú ___ peinaste sola esta mañana?", "te", [["se", "wrong-person"], ["me", "wrong-person"]], "El verbo “peinaste” está en segunda persona: tú.", "Con “tú” va “te”: “te peinaste”."],
  },
];

type SelfUse = "intensive" | "reflexive";
const SELF_USE = cats<SelfUse>(
  { en: { intensive: "Intensive", reflexive: "Reflexive" }, es: { intensive: "Enfático", reflexive: "Reflexivo" } },
  { en: ["intensive", "reflexive"], es: ["intensive", "reflexive"] },
  [
    {
      en: ["Maya taught herself to play the guitar.", "reflexive", "Read it without “herself”: “Maya taught to play the guitar.” Who learned?", "“Herself” receives the teaching and means the same person as Maya.", "herself"],
      es: ["Lucía se miró en el espejo antes de salir.", "reflexive", "Lucía hace la acción de mirar, y también es a quien mira.", "“Se” indica que Lucía se mira a sí misma.", "se"],
    },
    {
      en: ["Maya herself built the bookshelf.", "intensive", "Read it without “herself”: “Maya built the bookshelf.”", "The sentence is complete without it; “herself” only stresses that Maya did it.", "herself"],
      es: ["Lucía misma pintó el mural de la entrada.", "intensive", "Quita la palabra: “Lucía pintó el mural de la entrada” dice lo mismo.", "“Misma” solo subraya que fue Lucía quien lo pintó.", "misma"],
    },
    {
      en: ["The coach himself drove the team bus to the game.", "intensive", "Read it without “himself”: “The coach drove the team bus to the game.”", "The sentence is complete without it; “himself” adds emphasis.", "himself"],
      es: ["Yo mismo armé la bicicleta nueva.", "intensive", "Quita la palabra: “Yo armé la bicicleta nueva” dice lo mismo.", "“Mismo” subraya que nadie más la armó.", "mismo"],
    },
    {
      en: ["Diego hurt himself during soccer practice.", "reflexive", "Read it without “himself”: “Diego hurt during soccer practice.” Something is missing.", "Diego is the one who was hurt, so “himself” receives the action.", "himself"],
      es: ["El gato se lame las patas después de comer.", "reflexive", "El gato hace la acción de lamer, y las patas que lame son suyas.", "“Se” indica que la acción recae sobre el propio gato.", "se"],
    },
    {
      en: ["I fixed the flat tire myself.", "intensive", "Read it without “myself”: “I fixed the flat tire.”", "The sentence is complete without it; “myself” stresses that no one helped.", "myself"],
      es: ["Los niños mismos limpiaron el salón.", "intensive", "Quita la palabra: “Los niños limpiaron el salón” dice lo mismo.", "“Mismos” subraya quiénes hicieron la limpieza.", "mismos"],
    },
    {
      en: ["The kitten saw itself in the mirror and jumped.", "reflexive", "Read it without “itself”: “The kitten saw in the mirror.” What did it see?", "“Itself” is what the kitten saw, the same animal as the subject.", "itself"],
      es: ["Te cortaste con la hoja de papel.", "reflexive", "Tú haces la acción de cortar, y tú también recibes el corte.", "“Te” indica que la acción recae sobre quien la hace.", "Te"],
    },
    {
      en: ["You should be proud of yourself.", "reflexive", "Read it without “yourself”: “You should be proud of.” The sentence breaks.", "“Yourself” completes “proud of” and means the same person as “you.”", "yourself"],
      es: ["La directora misma nos dio la noticia.", "intensive", "Quita la palabra: “La directora nos dio la noticia” dice lo mismo.", "“Misma” solo da énfasis.", "misma"],
    },
    {
      en: ["The students themselves planned the fundraiser.", "intensive", "Read it without “themselves”: “The students planned the fundraiser.”", "The sentence is complete without it; “themselves” stresses who did the planning.", "themselves"],
      es: ["Me lavo las manos antes de comer.", "reflexive", "Yo hago la acción de lavar, y las manos que lavo son mías.", "“Me” indica que la acción recae sobre quien la hace.", "Me"],
    },
    {
      en: ["They introduced themselves to the new neighbors.", "reflexive", "Read it without “themselves”: “They introduced to the new neighbors.” Who was introduced?", "“Themselves” receives the action and means the same people as “they.”", "themselves"],
      es: ["Tú misma lo dijiste en la reunión.", "intensive", "Quita la palabra: “Tú lo dijiste en la reunión” dice lo mismo.", "“Misma” solo subraya quién lo dijo.", "misma"],
    },
    {
      en: ["The mayor herself cut the ribbon at the new library.", "intensive", "Read it without “herself”: “The mayor cut the ribbon at the new library.”", "The sentence is complete without it; “herself” adds emphasis.", "herself"],
      es: ["Mis hermanos se peinan frente al espejo.", "reflexive", "Mis hermanos hacen la acción de peinar, y es su propio pelo.", "“Se” indica que la acción recae sobre quienes la hacen.", "se"],
    },
    {
      en: ["The cat licked itself clean after dinner.", "reflexive", "Read it without “itself”: “The cat licked clean after dinner.” What did it lick?", "“Itself” is what the cat licked, the same animal as the subject.", "itself"],
      es: ["Nosotras mismas organizamos la feria de ciencias.", "intensive", "Quita la palabra: “Nosotras organizamos la feria de ciencias” dice lo mismo.", "“Mismas” solo da énfasis.", "mismas"],
    },
    {
      en: ["You yourself said the movie was too long.", "intensive", "Read it without “yourself”: “You said the movie was too long.”", "The sentence is complete without it; “yourself” adds emphasis.", "yourself"],
      es: ["El perro se rascó la oreja con la pata.", "reflexive", "El perro hace la acción de rascar, y la oreja es suya.", "“Se” indica que la acción recae sobre el propio perro.", "se"],
    },
    {
      en: ["Grandpa cut himself while slicing bread.", "reflexive", "Read it without “himself”: “Grandpa cut while slicing bread.” Who got cut?", "Grandpa is the one who got cut, so “himself” receives the action.", "himself"],
      es: ["El autor mismo firmó mi libro.", "intensive", "Quita la palabra: “El autor firmó mi libro” dice lo mismo.", "“Mismo” subraya que fue el autor en persona.", "mismo"],
    },
    {
      en: ["I myself have never seen snow.", "intensive", "Read it without “myself”: “I have never seen snow.”", "The sentence is complete without it; “myself” adds emphasis.", "myself"],
      es: ["Nos preparamos para el examen de mañana.", "reflexive", "Nosotros hacemos la acción de preparar, y también somos quienes quedan preparados.", "“Nos” indica que la acción recae sobre quienes la hacen.", "Nos"],
    },
    {
      en: ["Omar reminded himself to bring his library book.", "reflexive", "Read it without “himself”: “Omar reminded to bring his library book.” Who got the reminder?", "Omar reminded Omar, so “himself” receives the action.", "himself"],
      es: ["Yo misma cociné la sopa.", "intensive", "Quita la palabra: “Yo cociné la sopa” dice lo mismo.", "“Misma” subraya que nadie más la cocinó.", "misma"],
    },
  ],
);

const INTENSIVE_PRONOUNS = skill(
  { id: "e.intensive.pronouns", grade: "6", title: { en: "Intensive and reflexive pronouns", es: "Pronombres reflexivos y enfáticos" }, standard: "L.6.1b", prereqs: ["e.pronouns"] },
  [
    {
      bank: SELF_FORMS,
      ask: CHOOSE,
      hints: {
        en: ["Find the word the pronoun points back to, or the person doing the action.", "A pronoun ending in -self or -selves must match that word in person and number, and it never stands alone as the subject."],
        es: ["Busca a quién se refiere la palabra que falta.", "“Mismo” concuerda en género y número con la palabra a la que se refiere. El pronombre reflexivo concuerda con la persona del verbo."],
      },
      seconds: 15,
    },
    {
      ...SELF_USE,
      ask: { en: "Is {t} intensive or reflexive in this sentence?", es: "En esta oración, ¿{t} es enfático o reflexivo?" },
      hints: {
        en: ["Try reading the sentence without the -self word. Does it still make sense?", "An intensive pronoun only adds emphasis, so the sentence is complete without it. A reflexive pronoun is needed: it receives the action and means the same person as the subject."],
        es: ["¿La acción recae sobre quien la hace, o la palabra solo subraya quién la hizo?", "Un pronombre reflexivo (me, te, se, nos) indica que quien hace la acción también la recibe. “Mismo” o “misma” es enfático: solo da énfasis, y si lo quitas la oración dice lo mismo."],
      },
      seconds: 15,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.vague.pronouns — level 1: a pronoun that could mean either of two people or things (Spanish: the
// ambiguous "su", "él", "ella", "lo"); level 2: the revision that makes it clear without changing the
// meaning; level 3: shifts in person and number (Spanish: "uno" with "tú", "la gente" with a plural verb).

const AMBIGUOUS: Bi<Entry>[] = [
  {
    en: ["Marco told his dad that he needed a new phone.", "Either one: Marco or his dad", [["Only Marco", "assumed-first-noun"], ["Only his dad", "assumed-nearest-noun"]], "Try “Marco needed a new phone.” Then try “His dad needed a new phone.”", "Nothing in the sentence says which one needs the phone, so “he” is unclear.", "he"],
    es: ["Ana le dijo a Rosa que su perro estaba enfermo.", "Cualquiera de las dos: Ana o Rosa", [["Solo Ana", "assumed-first-noun"], ["Solo Rosa", "assumed-nearest-noun"]], "Prueba “el perro de Ana” y luego “el perro de Rosa”.", "Nada en la oración dice de quién es el perro, así que “su” es ambiguo.", "su"],
  },
  {
    en: ["Ana handed Rosa the map after she found the trail.", "Either one: Ana or Rosa", [["Only Ana", "assumed-first-noun"], ["Only Rosa", "assumed-nearest-noun"]], "Try “Ana found the trail.” Then try “Rosa found the trail.”", "Either girl could have found the trail, so “she” is unclear.", "she"],
    es: ["Marcos llamó a su papá porque él necesitaba ayuda.", "Cualquiera de los dos: Marcos o su papá", [["Solo Marcos", "assumed-first-noun"], ["Solo su papá", "assumed-nearest-noun"]], "Prueba “Marcos necesitaba ayuda” y luego “su papá necesitaba ayuda”.", "Cualquiera de los dos podía necesitar ayuda, así que “él” es ambiguo.", "él"],
  },
  {
    en: ["When the dog chased the cat, it knocked over a lamp.", "Either one: the dog or the cat", [["Only the dog", "assumed-first-noun"], ["Only the cat", "assumed-nearest-noun"]], "Try “The dog knocked over a lamp.” Then try “The cat knocked over a lamp.”", "Either animal could have knocked it over, so “it” is unclear.", "it"],
    es: ["La abuela le contó a la tía Mei que su jardín necesitaba agua.", "Cualquiera de las dos: la abuela o la tía Mei", [["Solo la abuela", "assumed-first-noun"], ["Solo la tía Mei", "assumed-nearest-noun"]], "Prueba “el jardín de la abuela” y luego “el jardín de la tía Mei”.", "El jardín puede ser de cualquiera de las dos, así que “su” es ambiguo.", "su"],
  },
  {
    en: ["Mr. Chen called Mr. Brooks because he was worried about the field trip.", "Either one: Mr. Chen or Mr. Brooks", [["Only Mr. Chen", "assumed-first-noun"], ["Only Mr. Brooks", "assumed-nearest-noun"]], "Try “Mr. Chen was worried.” Then try “Mr. Brooks was worried.”", "Either man could be the worried one, so “he” is unclear.", "he"],
    es: ["La señora Chen llamó a la señora Pérez porque ella estaba preocupada por la excursión.", "Cualquiera de las dos: la señora Chen o la señora Pérez", [["Solo la señora Chen", "assumed-first-noun"], ["Solo la señora Pérez", "assumed-nearest-noun"]], "Prueba “la señora Chen estaba preocupada” y luego “la señora Pérez estaba preocupada”.", "Cualquiera de las dos podía estar preocupada, así que “ella” es ambiguo.", "ella"],
  },
  {
    en: ["Lily put the vase on the shelf, and then it fell.", "Either one: the vase or the shelf", [["Only the vase", "assumed-first-noun"], ["Only the shelf", "assumed-nearest-noun"]], "Try “the vase fell.” Then try “the shelf fell.”", "Either thing could have fallen, so “it” is unclear.", "it"],
    es: ["Priya saludó a Sofía mientras ella cruzaba la calle.", "Cualquiera de las dos: Priya o Sofía", [["Solo Priya", "assumed-first-noun"], ["Solo Sofía", "assumed-nearest-noun"]], "Prueba “Priya cruzaba la calle” y luego “Sofía cruzaba la calle”.", "Cualquiera de las dos podía estar cruzando, así que “ella” es ambiguo.", "ella"],
  },
  {
    en: ["Grandma told Aunt Mei that her garden needed water.", "Either one: Grandma or Aunt Mei", [["Only Grandma", "assumed-first-noun"], ["Only Aunt Mei", "assumed-nearest-noun"]], "Try “Grandma's garden.” Then try “Aunt Mei's garden.”", "The garden could belong to either woman, so “her” is unclear.", "her"],
    es: ["Jada le dijo a su hermana que ella había ganado el concurso de arte.", "Cualquiera de las dos: Jada o su hermana", [["Solo Jada", "assumed-first-noun"], ["Solo su hermana", "assumed-nearest-noun"]], "Prueba “Jada había ganado” y luego “su hermana había ganado”.", "Cualquiera de las dos pudo ganar, así que “ella” es ambiguo.", "ella"],
  },
  {
    en: ["Take the batteries out of the remotes and recycle them.", "Either one: the batteries or the remotes", [["Only the batteries", "assumed-first-noun"], ["Only the remotes", "assumed-nearest-noun"]], "Try “recycle the batteries.” Then try “recycle the remotes.”", "Either could be recycled, so “them” is unclear.", "them"],
    es: ["La entrenadora le dijo a la árbitra que ella se había equivocado.", "Cualquiera de las dos: la entrenadora o la árbitra", [["Solo la entrenadora", "assumed-first-noun"], ["Solo la árbitra", "assumed-nearest-noun"]], "Prueba “la entrenadora se había equivocado” y luego “la árbitra se había equivocado”.", "Cualquiera de las dos pudo equivocarse, así que “ella” es ambiguo.", "ella"],
  },
  {
    en: ["Priya waved to Sofia while she was crossing the street.", "Either one: Priya or Sofia", [["Only Priya", "assumed-first-noun"], ["Only Sofia", "assumed-nearest-noun"]], "Try “Priya was crossing.” Then try “Sofia was crossing.”", "Either girl could be the one crossing, so “she” is unclear.", "she"],
    es: ["La maestra Ortiz le recordó a la maestra Hall que su grupo tenía el gimnasio primero.", "Cualquiera de las dos: la maestra Ortiz o la maestra Hall", [["Solo la maestra Ortiz", "assumed-first-noun"], ["Solo la maestra Hall", "assumed-nearest-noun"]], "Prueba “el grupo de la maestra Ortiz” y luego “el grupo de la maestra Hall”.", "El grupo puede ser de cualquiera de las dos, así que “su” es ambiguo.", "su"],
  },
  {
    en: ["The truck hit the mailbox, but it was not damaged.", "Either one: the truck or the mailbox", [["Only the truck", "assumed-first-noun"], ["Only the mailbox", "assumed-nearest-noun"]], "Try “the truck was not damaged.” Then try “the mailbox was not damaged.”", "Either one could have come through without damage, so “it” is unclear.", "it"],
    es: ["Sam metió el celular en el estuche, pero ahora no lo encuentra.", "Cualquiera de los dos: el celular o el estuche", [["Solo el celular", "assumed-first-noun"], ["Solo el estuche", "assumed-nearest-noun"]], "Prueba “no encuentra el celular” y luego “no encuentra el estuche”.", "Sam podría estar buscando cualquiera de los dos, así que “lo” es ambiguo.", "lo"],
  },
  {
    en: ["Mom moved the cake away from the pie because it was still hot.", "Either one: the cake or the pie", [["Only the cake", "assumed-first-noun"], ["Only the pie", "assumed-nearest-noun"]], "Try “the cake was still hot.” Then try “the pie was still hot.”", "Either dessert could be the hot one, so “it” is unclear.", "it"],
    es: ["Rafa dejó el cuaderno sobre el libro y luego lo guardó en la mochila.", "Cualquiera de los dos: el cuaderno o el libro", [["Solo el cuaderno", "assumed-first-noun"], ["Solo el libro", "assumed-nearest-noun"]], "Prueba “guardó el cuaderno” y luego “guardó el libro”.", "Rafa pudo guardar cualquiera de los dos, así que “lo” es ambiguo.", "lo"],
  },
  {
    en: ["Jada told her sister that she won the art contest.", "Either one: Jada or her sister", [["Only Jada", "assumed-first-noun"], ["Only her sister", "assumed-nearest-noun"]], "Try “Jada won.” Then try “her sister won.”", "Either girl could have won, so “she” is unclear.", "she"],
    es: ["Elena le prestó a Carmen su libro de cuentos.", "Cualquiera de las dos: Elena o Carmen", [["Solo Elena", "assumed-first-noun"], ["Solo Carmen", "assumed-nearest-noun"]], "Prueba “el libro de Elena” y luego “el libro de Carmen”.", "El libro puede ser de cualquiera de las dos, así que “su” es ambiguo.", "su"],
  },
  {
    en: ["The coach told the referee that he had made a mistake.", "Either one: the coach or the referee", [["Only the coach", "assumed-first-noun"], ["Only the referee", "assumed-nearest-noun"]], "Try “the coach made a mistake.” Then try “the referee made a mistake.”", "Either one could have made the mistake, so “he” is unclear.", "he"],
    es: ["Tomás le escribió a Andrés después de que él volvió del viaje.", "Cualquiera de los dos: Tomás o Andrés", [["Solo Tomás", "assumed-first-noun"], ["Solo Andrés", "assumed-nearest-noun"]], "Prueba “Tomás volvió del viaje” y luego “Andrés volvió del viaje”.", "Cualquiera de los dos pudo volver del viaje, así que “él” es ambiguo.", "él"],
  },
  {
    en: ["Sam put his phone in the backpack, but now he can't find it.", "Either one: his phone or the backpack", [["Only his phone", "assumed-first-noun"], ["Only the backpack", "assumed-nearest-noun"]], "Try “he can't find his phone.” Then try “he can't find the backpack.”", "Sam could be looking for either one, so “it” is unclear.", "it"],
    es: ["Papá le pidió a mi tío que lavara su carro.", "Cualquiera de los dos: papá o mi tío", [["Solo papá", "assumed-first-noun"], ["Solo mi tío", "assumed-nearest-noun"]], "Prueba “el carro de papá” y luego “el carro de mi tío”.", "El carro puede ser de cualquiera de los dos, así que “su” es ambiguo.", "su"],
  },
  {
    en: ["Ms. Ortiz reminded Ms. Hall that her class had the gym first.", "Either one: Ms. Ortiz or Ms. Hall", [["Only Ms. Ortiz", "assumed-first-noun"], ["Only Ms. Hall", "assumed-nearest-noun"]], "Try “Ms. Ortiz's class.” Then try “Ms. Hall's class.”", "The class could belong to either teacher, so “her” is unclear.", "her"],
    es: ["Luisa habló con su prima mientras ella preparaba la cena.", "Cualquiera de las dos: Luisa o su prima", [["Solo Luisa", "assumed-first-noun"], ["Solo su prima", "assumed-nearest-noun"]], "Prueba “Luisa preparaba la cena” y luego “su prima preparaba la cena”.", "Cualquiera de las dos podía estar cocinando, así que “ella” es ambiguo.", "ella"],
  },
];

const CLEAR_REVISION: Bi<Entry>[] = [
  {
    en: ["Marco told his dad that he needed a new phone.", "Marco said to his dad, “I need a new phone.”", [["Marco told his dad that he really needed a new phone.", "still-unclear"], ["Marco's dad told him to get a new phone.", "changed-meaning"]], "Turning the words into a quote can show who needs the phone.", "In the quote, “I” can only mean Marco."],
    es: ["Ana le dijo a Rosa que su perro estaba enfermo.", "Ana le dijo a Rosa: “Mi perro está enfermo”.", [["Ana le dijo a Rosa que su perro estaba muy enfermo.", "still-unclear"], ["Rosa le dijo a Ana que el perro estaba sano.", "changed-meaning"]], "Una cita directa puede mostrar de quién es el perro.", "En la cita, “mi perro” solo puede ser el de Ana."],
  },
  {
    en: ["In the article, it says that bees are losing their habitat.", "The article says that bees are losing their habitat.", [["In the article, they say that bees are losing their habitat.", "still-unclear"], ["The article says that bees are gaining habitat.", "changed-meaning"]], "Ask what “it” stands for. Nothing in the sentence is named “it.”", "Name the source directly and make it the subject."],
    es: ["Marcos llamó a su papá porque él necesitaba ayuda.", "Marcos necesitaba ayuda, así que llamó a su papá.", [["Marcos llamó a su papá porque él necesitaba mucha ayuda.", "still-unclear"], ["El papá de Marcos lo llamó para ofrecerle ayuda.", "changed-meaning"]], "Nombra primero a quien necesitaba ayuda.", "Ahora queda claro que quien necesitaba ayuda era Marcos."],
  },
  {
    en: ["At the clinic, they told us to drink more water.", "At the clinic, the nurse told us to drink more water.", [["At the clinic, they kept telling us to drink more water.", "still-unclear"], ["At the clinic, we told the nurse to drink more water.", "changed-meaning"]], "Who are “they”? The sentence never says.", "Naming the nurse tells who gave the advice."],
    es: ["La abuela le contó a la tía Mei que su jardín necesitaba agua.", "La abuela le dijo a la tía Mei: “Tu jardín necesita agua”.", [["La abuela le contó a la tía Mei que su jardín necesitaba mucha agua.", "still-unclear"], ["La tía Mei regó el jardín de la abuela.", "changed-meaning"]], "Una cita directa puede mostrar de quién es el jardín.", "“Tu jardín” solo puede ser el de la tía Mei."],
  },
  {
    en: ["Ana handed Rosa the map after she found the trail.", "After Rosa found the trail, Ana handed her the map.", [["Ana handed Rosa the map after she had found the trail.", "still-unclear"], ["Ana found the trail and kept the map.", "changed-meaning"]], "Name the person who found the trail first.", "Now “her” can only mean Rosa, because Ana cannot hand the map to herself."],
    es: ["La señora Chen llamó a la señora Pérez porque ella estaba preocupada por la excursión.", "La señora Chen estaba preocupada por la excursión, así que llamó a la señora Pérez.", [["La señora Chen llamó a la señora Pérez porque ella estaba muy preocupada por la excursión.", "still-unclear"], ["La señora Pérez llamó a la señora Chen para hablar de otra cosa.", "changed-meaning"]], "Nombra primero a la persona preocupada.", "Ahora queda claro que la preocupada era la señora Chen."],
  },
  {
    en: ["When the dog chased the cat, it knocked over a lamp.", "The dog knocked over a lamp while chasing the cat.", [["When the dog chased the cat, it suddenly knocked over a lamp.", "still-unclear"], ["The cat and the dog broke the lamp on purpose.", "changed-meaning"]], "Name the animal that knocked over the lamp.", "Now the sentence says which animal did it."],
    es: ["Priya saludó a Sofía mientras ella cruzaba la calle.", "Mientras Sofía cruzaba la calle, Priya la saludó.", [["Priya saludó a Sofía mientras ella cruzaba rápido la calle.", "still-unclear"], ["Sofía saludó a Priya desde el otro lado de la calle.", "changed-meaning"]], "Pon el nombre de quien cruzaba en la primera parte de la oración.", "Ahora “la” solo puede ser Sofía, porque Priya no se saluda a sí misma."],
  },
  {
    en: ["Take the batteries out of the remotes and recycle them.", "Recycle the batteries after you take them out of the remotes.", [["Take the batteries out of the remotes and then recycle them.", "still-unclear"], ["Recycle the remotes with the batteries still inside.", "changed-meaning"]], "Decide what gets recycled and name it before the pronoun.", "Naming the batteries first makes “them” clear."],
    es: ["Jada le dijo a su hermana que ella había ganado el concurso de arte.", "Jada le dijo a su hermana: “Gané el concurso de arte”.", [["Jada le dijo a su hermana que ella sí había ganado el concurso de arte.", "still-unclear"], ["La hermana de Jada le contó que nadie ganó el concurso.", "changed-meaning"]], "Una cita directa puede mostrar quién ganó.", "“Gané” solo puede referirse a Jada, que es quien habla."],
  },
  {
    en: ["Grandma told Aunt Mei that her garden needed water.", "Grandma said to Aunt Mei, “Your garden needs water.”", [["Grandma told Aunt Mei that her own garden needed water.", "still-unclear"], ["Aunt Mei told Grandma to water the garden.", "changed-meaning"]], "A quote can show whose garden it is.", "“Your garden” can only mean Aunt Mei's garden."],
    es: ["La entrenadora le dijo a la árbitra que ella se había equivocado.", "La entrenadora le dijo a la árbitra: “Usted se equivocó”.", [["La entrenadora le dijo a la árbitra que ella se había equivocado otra vez.", "still-unclear"], ["La árbitra le dijo a la entrenadora que el partido había terminado.", "changed-meaning"]], "Una cita directa puede mostrar quién se equivocó.", "“Usted” solo puede ser la árbitra, a quien se le habla."],
  },
  {
    en: ["On the news, they said the storm would arrive tonight.", "The weather reporter said the storm would arrive tonight.", [["On the news, they all said the storm would arrive tonight.", "still-unclear"], ["On the news, they said the storm had already passed.", "changed-meaning"]], "Who are “they”? Name the person who said it.", "Naming the weather reporter tells who spoke."],
    es: ["La maestra Ortiz le recordó a la maestra Hall que su grupo tenía el gimnasio primero.", "La maestra Ortiz le recordó a la maestra Hall: “Tu grupo tiene el gimnasio primero”.", [["La maestra Ortiz le recordó a la maestra Hall que su grupo siempre tenía el gimnasio primero.", "still-unclear"], ["La maestra Hall le recordó a la maestra Ortiz que el gimnasio estaba cerrado.", "changed-meaning"]], "Una cita directa puede mostrar de quién es el grupo.", "“Tu grupo” solo puede ser el de la maestra Hall."],
  },
  {
    en: ["Priya waved to Sofia while she was crossing the street.", "While Sofia was crossing the street, Priya waved to her.", [["Priya waved to Sofia while she crossed the street.", "still-unclear"], ["Sofia waved to Priya from across the street.", "changed-meaning"]], "Put the name of the person crossing in the first part of the sentence.", "Now “her” can only mean Sofia, because Priya cannot wave to herself."],
    es: ["Sam metió el celular en el estuche, pero ahora no lo encuentra.", "Sam metió el celular en el estuche, pero ahora no encuentra el celular.", [["Sam metió el celular en el estuche, pero ahora no lo encuentra por ningún lado.", "still-unclear"], ["Sam no encuentra ni el estuche ni la mochila.", "changed-meaning"]], "Cambia “lo” por la cosa que Sam busca.", "Nombrar el celular quita la duda."],
  },
  {
    en: ["Sam put his phone in the backpack, but now he can't find it.", "Sam put his phone in the backpack, but now he can't find the phone.", [["Sam put his phone in the backpack, and now he can't find it anywhere.", "still-unclear"], ["Sam can't find his backpack or his jacket.", "changed-meaning"]], "Replace “it” with the thing Sam is looking for.", "Naming the phone removes the doubt."],
    es: ["Rafa dejó el cuaderno sobre el libro y luego lo guardó en la mochila.", "Rafa dejó el cuaderno sobre el libro y luego guardó el libro en la mochila.", [["Rafa dejó el cuaderno sobre el libro y luego lo guardó con cuidado en la mochila.", "still-unclear"], ["Rafa dejó el cuaderno y el libro en la mesa.", "changed-meaning"]], "Cambia “lo” por la cosa que Rafa guardó.", "Nombrar el libro quita la duda."],
  },
  {
    en: ["In the instructions, it says to preheat the oven.", "The instructions say to preheat the oven.", [["In the instructions, they say to preheat the oven.", "still-unclear"], ["The instructions say not to preheat the oven.", "changed-meaning"]], "Nothing in the sentence is “it.” What is actually giving the direction?", "Make the instructions the subject."],
    es: ["Elena le prestó a Carmen su libro de cuentos.", "Elena tenía un libro de cuentos y se lo prestó a Carmen.", [["Elena le prestó a Carmen su nuevo libro de cuentos.", "still-unclear"], ["Carmen le prestó a Elena un libro de cuentos.", "changed-meaning"]], "Di primero quién tenía el libro.", "Ahora queda claro que el libro era de Elena."],
  },
  {
    en: ["Jada told her sister that she won the art contest.", "Jada told her sister, “I won the art contest.”", [["Jada told her sister that she had won the art contest.", "still-unclear"], ["Jada's sister told her about the art contest.", "changed-meaning"]], "A quote can show who won.", "In the quote, “I” can only mean Jada."],
    es: ["Tomás le escribió a Andrés después de que él volvió del viaje.", "Cuando Andrés volvió del viaje, Tomás le escribió.", [["Tomás le escribió a Andrés justo después de que él volvió del viaje.", "still-unclear"], ["Andrés le escribió a Tomás antes del viaje.", "changed-meaning"]], "Pon el nombre de quien volvió en la primera parte.", "Ahora queda claro que quien volvió fue Andrés."],
  },
  {
    en: ["The coach told the referee that he had made a mistake.", "The coach told the referee, “You made a mistake.”", [["The coach told the referee that he had clearly made a mistake.", "still-unclear"], ["The referee told the coach that the game was over.", "changed-meaning"]], "A quote can show who made the mistake.", "“You” can only mean the referee, the one being spoken to."],
    es: ["Papá le pidió a mi tío que lavara su carro.", "Papá le pidió a mi tío: “Lava mi carro, por favor”.", [["Papá le pidió a mi tío que lavara su carro hoy.", "still-unclear"], ["Mi tío le pidió a papá que lavara el carro.", "changed-meaning"]], "Una cita directa puede mostrar de quién es el carro.", "“Mi carro”, dicho por papá, solo puede ser el de papá."],
  },
  {
    en: ["Mr. Chen called Mr. Brooks because he was worried about the field trip.", "Mr. Chen was worried about the field trip, so he called Mr. Brooks.", [["Mr. Chen called Mr. Brooks because he was very worried about the field trip.", "still-unclear"], ["Mr. Brooks called Mr. Chen about the field trip.", "changed-meaning"]], "Name the worried person first, before any pronoun.", "Now “he” can only mean Mr. Chen."],
    es: ["Luisa habló con su prima mientras ella preparaba la cena.", "Mientras su prima preparaba la cena, Luisa habló con ella.", [["Luisa habló con su prima mientras ella preparaba toda la cena.", "still-unclear"], ["Luisa y su prima no prepararon la cena.", "changed-meaning"]], "Pon a quien preparaba la cena en la primera parte.", "Ahora queda claro que quien cocinaba era la prima."],
  },
  {
    en: ["Lily put the vase on the shelf, and then it fell.", "Lily put the vase on the shelf, and then the vase fell.", [["Lily put the vase on the shelf, and then it suddenly fell.", "still-unclear"], ["Lily put the vase on the shelf so it would not fall.", "changed-meaning"]], "Replace “it” with the thing that fell.", "Naming the vase removes the doubt."],
    es: ["Daniel le contó a su hermano que su bicicleta tenía una llanta desinflada.", "Daniel le dijo a su hermano: “Tu bicicleta tiene una llanta desinflada”.", [["Daniel le contó a su hermano que su bicicleta tenía otra vez una llanta desinflada.", "still-unclear"], ["El hermano de Daniel infló la llanta de su propia bicicleta.", "changed-meaning"]], "Una cita directa puede mostrar de quién es la bicicleta.", "“Tu bicicleta” solo puede ser la del hermano."],
  },
];

const SHIFTS: Bi<Entry>[] = [
  {
    en: ["When students study for a test, ___ should take short breaks.", "they", [["you", "shift-in-person"], ["he or she", "shift-in-number"]], "The sentence starts with “students,” more than one person.", "“Students” is plural and third person, so the pronoun is too."],
    es: ["Cuando uno estudia mucho, ___ cansa.", "se", [["te", "shift-in-person"], ["nos", "shift-in-person"]], "La oración empieza con “uno”, que va en tercera persona.", "Con “uno” se mantiene la tercera persona."],
  },
  {
    en: ["We love hiking because ___ can see the whole valley from the top.", "we", [["you", "shift-in-person"], ["one", "shift-in-person"]], "The sentence starts in the first person plural.", "Keep the same person all the way through."],
    es: ["La gente del barrio ___ a limpiar el parque.", "ayudó", [["ayudaron", "shift-in-number"], ["ayudamos", "shift-in-person"]], "“La gente” es una sola palabra en singular, aunque nombre a muchas personas.", "“La gente” es singular, así que el verbo también."],
  },
  {
    en: ["The members of the band tuned ___ instruments before the show.", "their", [["his or her", "shift-in-number"], ["your", "shift-in-person"]], "The pronoun points back to “the members,” more than one person.", "Plural “members” takes a plural pronoun."],
    es: ["Los integrantes de la banda afinaron ___ instrumentos antes del concierto.", "sus", [["su", "shift-in-number"], ["nuestros", "shift-in-person"]], "Lo que se posee es “instrumentos”, en plural.", "En español, el posesivo concuerda con lo que se posee: “instrumentos” es plural."],
  },
  {
    en: ["I enjoy painting because ___ can show feelings without words.", "I", [["you", "shift-in-person"], ["they", "shift-in-person"]], "The sentence starts in the first person singular.", "Keep the same person all the way through."],
    es: ["Me gusta pintar porque así ___ expresar lo que siento.", "puedo", [["puedes", "shift-in-person"], ["pueden", "shift-in-person"]], "La oración empieza con “me gusta”: habla la primera persona, yo.", "Se mantiene la primera persona del singular."],
  },
  {
    en: ["Hikers should carry water so that ___ do not get dehydrated.", "they", [["you", "shift-in-person"], ["he", "shift-in-number"]], "The pronoun points back to “hikers.”", "Plural “hikers” takes a plural pronoun."],
    es: ["Si uno practica todos los días, ___ más rápido.", "mejora", [["mejoras", "shift-in-person"], ["mejoran", "shift-in-number"]], "La oración empieza con “uno”, en tercera persona del singular.", "Con “uno”, el verbo va en tercera persona del singular."],
  },
  {
    en: ["When I practice piano every day, ___ notice that my fingers move faster.", "I", [["you", "shift-in-person"], ["we", "shift-in-number"]], "The sentence starts in the first person singular.", "Keep the same person and number all the way through."],
    es: ["El equipo celebró ___ triunfo en la cancha.", "su", [["sus", "shift-in-number"], ["nuestro", "shift-in-person"]], "Lo que se posee es “triunfo”, uno solo.", "“Triunfo” es singular, así que el posesivo también."],
  },
  {
    en: ["The scientists published ___ results in a journal.", "their", [["its", "shift-in-number"], ["our", "shift-in-person"]], "The pronoun points back to “the scientists.”", "Plural “scientists” takes a plural pronoun."],
    es: ["Cada uno de los estudiantes ___ su proyecto.", "presentó", [["presentaron", "shift-in-number"], ["presentamos", "shift-in-person"]], "El sujeto es “cada uno”, en singular.", "“Cada uno” pide el verbo en singular."],
  },
  {
    en: ["You should wear a helmet whenever ___ ride a bike.", "you", [["one", "shift-in-person"], ["they", "shift-in-person"]], "The sentence starts in the second person, talking to the reader.", "Keep the same person all the way through."],
    es: ["Nosotros llegamos temprano al museo, pero ___ que esperar en la fila.", "tuvimos", [["tuvieron", "shift-in-person"], ["tuviste", "shift-in-person"]], "La oración empieza con “nosotros”.", "Se mantiene la primera persona del plural."],
  },
  {
    en: ["My friends and I packed ___ bags the night before the trip.", "our", [["their", "shift-in-person"], ["my", "shift-in-number"]], "“My friends and I” includes the speaker and other people.", "A group that includes “I” takes a first-person plural pronoun."],
    es: ["Mis amigos y yo preparamos ___ mochilas la noche anterior.", "nuestras", [["sus", "shift-in-person"], ["nuestra", "shift-in-number"]], "El grupo incluye a quien habla: “mis amigos y yo”.", "Un grupo que incluye a “yo” lleva el posesivo de primera persona del plural, y concuerda con “mochilas”."],
  },
  {
    en: ["A spider spins ___ web in a corner of the barn.", "its", [["their", "shift-in-number"], ["your", "shift-in-person"]], "The pronoun points back to “a spider,” one animal.", "One animal takes a singular pronoun."],
    es: ["La familia de Inés ___ de vacaciones a Puerto Rico.", "viajó", [["viajaron", "shift-in-number"], ["viajamos", "shift-in-person"]], "El sujeto es “la familia”, una sola palabra en singular.", "“La familia” pide el verbo en singular."],
  },
  {
    en: ["Runners must stretch before ___ race.", "their", [["his", "shift-in-number"], ["your", "shift-in-person"]], "The pronoun points back to “runners.”", "Plural “runners” takes a plural pronoun."],
    es: ["Cuando tú haces ejercicio, ___ sientes con más energía.", "te", [["se", "shift-in-person"], ["me", "shift-in-person"]], "La oración empieza con “tú”.", "Con “tú” se mantiene la segunda persona."],
  },
  {
    en: ["When we arrived at the museum, ___ had to wait in a long line.", "we", [["you", "shift-in-person"], ["they", "shift-in-person"]], "The sentence starts in the first person plural.", "Keep the same person all the way through."],
    es: ["Los gansos volaron al sur porque ___ un lugar más cálido.", "buscaban", [["buscaba", "shift-in-number"], ["buscábamos", "shift-in-person"]], "El sujeto es “los gansos”, en plural.", "“Los gansos” es plural, así que el verbo también."],
  },
  {
    en: ["The geese flew south because ___ needed a warmer place for winter.", "they", [["it", "shift-in-number"], ["we", "shift-in-person"]], "The pronoun points back to “the geese,” more than one bird.", "“Geese” is plural, so the pronoun is too."],
    es: ["Uno se siente mejor cuando ___ bien.", "duerme", [["duermes", "shift-in-person"], ["duermen", "shift-in-number"]], "La oración empieza con “uno”, en tercera persona del singular.", "Se mantiene la tercera persona del singular."],
  },
  {
    en: ["Musicians in an orchestra must watch ___ conductor closely.", "their", [["your", "shift-in-person"], ["his", "shift-in-number"]], "The pronoun points back to “musicians.”", "Plural “musicians” takes a plural pronoun."],
    es: ["Los músicos de la orquesta miran a ___ director con atención.", "su", [["sus", "shift-in-number"], ["tu", "shift-in-person"]], "Lo que se posee es “director”, uno solo.", "“Director” es singular, así que el posesivo también."],
  },
];

const VAGUE_PRONOUNS = skill(
  { id: "e.vague.pronouns", grade: "6", title: { en: "Clear pronouns", es: "Pronombres claros" }, standard: "L.6.1d", prereqs: ["e.pronouns"] },
  [
    {
      bank: AMBIGUOUS,
      ask: { en: "Who or what could {t} refer to?", es: "¿A quién o a qué podría referirse {t}?" },
      hints: {
        en: ["Look at every noun that comes before the pronoun.", "Put each noun in place of the pronoun. If more than one still makes sense, the pronoun is unclear."],
        es: ["Fíjate en todos los sustantivos que aparecen antes del pronombre.", "Pon cada sustantivo en lugar del pronombre. Si más de uno tiene sentido, el pronombre es ambiguo."],
      },
      seconds: 20,
    },
    {
      bank: CLEAR_REVISION,
      ask: { en: "Which revision makes the pronoun's meaning clear?", es: "¿Qué versión deja claro a qué se refiere el pronombre?" },
      hints: {
        en: ["Find the pronoun and ask what it points back to.", "A clear revision names the person or thing, or rewords the sentence so only one meaning is possible. It keeps the original meaning."],
        es: ["Busca el pronombre y pregúntate a qué se refiere.", "Una buena versión nombra a la persona o la cosa, o cambia el orden para que solo haya un significado posible. Mantiene el sentido original."],
      },
      seconds: 35,
    },
    {
      bank: SHIFTS,
      ask: { en: "Choose the word that keeps the sentence consistent.", es: "Elige la palabra que mantiene la concordancia." },
      hints: {
        en: ["Find the noun or pronoun that the blank goes with.", "Keep the same person (first, second, or third) and the same number (singular or plural) all the way through the sentence."],
        es: ["Busca la palabra con la que debe concordar el espacio.", "Mantén la misma persona (primera, segunda o tercera) y el mismo número (singular o plural) en toda la oración."],
      },
      seconds: 15,
    },
  ],
);

export { INTENSIVE_PRONOUNS, VAGUE_PRONOUNS };
