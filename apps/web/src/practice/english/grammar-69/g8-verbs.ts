import { cats, skill, CHOOSE, type Bi, type Entry, type GroupJob } from "./shared";

// Grade 8: verbals; verb moods.

// ---------------------------------------------------------------------------------------------------
// e.verbals — level 1: which verbal it is; level 2: the job it does. English gerunds, participles and
// infinitives; Spanish formas no personales (infinitivo, gerundio, participio). A Spanish gerundio is not
// an English gerund: it works like an adverb, while the Spanish infinitive is the one that works like a
// noun ("Nadar es divertido"), so the Spanish items teach the Spanish system.

type Verbal = "gerund" | "participle" | "infinitive";
const VERBAL_TYPE = cats<Verbal>(
  {
    en: { gerund: "Gerund", participle: "Participle", infinitive: "Infinitive" },
    es: { infinitive: "Infinitivo", gerund: "Gerundio", participle: "Participio" },
  },
  { en: ["gerund", "participle", "infinitive"], es: ["infinitive", "gerund", "participle"] },
  [
    {
      en: ["Swimming is my favorite sport.", "gerund", "It ends in -ing and names an activity; it is the subject.", "“Swimming” works as a noun, so it is a gerund.", "Swimming"],
      es: ["Nadar es mi deporte favorito.", "infinitive", "Fíjate en la terminación: -ar.", "“Nadar” termina en -ar: es un infinitivo.", "Nadar"],
    },
    {
      en: ["The barking dog woke the whole street.", "participle", "It ends in -ing, but it describes the dog.", "“Barking” describes a noun, so it is a participle.", "barking"],
      es: ["El niño llegó corriendo a la escuela.", "gerund", "Fíjate en la terminación: -iendo.", "“Corriendo” termina en -iendo: es un gerundio.", "corriendo"],
    },
    {
      en: ["Lena wants to learn Japanese.", "infinitive", "Look at the word right before “learn.”", "“To learn” is “to” plus a verb: an infinitive.", "to learn"],
      es: ["La ventana rota dejaba entrar el frío.", "participle", "Es una forma irregular del verbo romper, y describe a la ventana.", "“Rota” viene de romper y describe a la ventana: es un participio.", "rota"],
    },
    {
      en: ["The broken window let in the cold.", "participle", "It describes the window.", "“Broken” describes a noun, so it is a participle.", "broken"],
      es: ["Lena quiere aprender japonés.", "infinitive", "Fíjate en la terminación: -er.", "“Aprender” termina en -er: es un infinitivo.", "aprender"],
    },
    {
      en: ["Kenji enjoys drawing comics.", "gerund", "It names what Kenji enjoys; it is the object of “enjoys.”", "“Drawing” works as a noun, so it is a gerund.", "drawing"],
      es: ["Mi abuela cocina cantando.", "gerund", "Fíjate en la terminación: -ando.", "“Cantando” termina en -ando: es un gerundio.", "cantando"],
    },
    {
      en: ["To win the championship was the team's goal.", "infinitive", "It starts with “to” followed by a verb.", "“To win” is an infinitive.", "To win"],
      es: ["Los aficionados emocionados aplaudieron al equipo.", "participle", "Fíjate en la terminación: -ado, más la -s del plural.", "“Emocionados” describe a los aficionados: es un participio.", "emocionados"],
    },
    {
      en: ["The excited fans cheered for the team.", "participle", "It describes the fans.", "“Excited” describes a noun, so it is a participle.", "excited"],
      es: ["Ganar el campeonato era la meta del equipo.", "infinitive", "Fíjate en la terminación: -ar.", "“Ganar” es un infinitivo.", "Ganar"],
    },
    {
      en: ["Reading before bed helps me relax.", "gerund", "It names an activity and is the subject.", "“Reading” works as a noun, so it is a gerund.", "Reading"],
      es: ["Leyendo antes de dormir me relajo.", "gerund", "Viene de leer y termina en -yendo, una variante de -iendo.", "“Leyendo” es un gerundio.", "Leyendo"],
    },
    {
      en: ["We stopped at the store to buy milk.", "infinitive", "It starts with “to” followed by a verb.", "“To buy” is an infinitive.", "to buy"],
      es: ["El lago congelado brillaba al sol.", "participle", "Fíjate en la terminación: -ado.", "“Congelado” describe al lago: es un participio.", "congelado"],
    },
    {
      en: ["The smiling baby reached for the toy.", "participle", "It describes the baby.", "“Smiling” describes a noun, so it is a participle.", "smiling"],
      es: ["Kenji pasa las tardes dibujando historietas.", "gerund", "Fíjate en la terminación: -ando.", "“Dibujando” es un gerundio.", "dibujando"],
    },
    {
      en: ["My brother is good at baking bread.", "gerund", "It comes after “at” and names an activity.", "“Baking” works as a noun, so it is a gerund.", "baking"],
      es: ["Paramos en la tienda para comprar leche.", "infinitive", "Fíjate en la terminación: -ar.", "“Comprar” es un infinitivo.", "comprar"],
    },
    {
      en: ["Maya has a lot of homework to finish.", "infinitive", "It starts with “to” followed by a verb.", "“To finish” is an infinitive.", "to finish"],
      es: ["Agotada por la carrera, Ana se sentó.", "participle", "Fíjate en la terminación: -ada.", "“Agotada” describe a Ana: es un participio.", "Agotada"],
    },
    {
      en: ["The frozen lake sparkled in the sun.", "participle", "It describes the lake.", "“Frozen” describes a noun, so it is a participle.", "frozen"],
      es: ["Los niños salieron del agua temblando.", "gerund", "Fíjate en la terminación: -ando.", "“Temblando” es un gerundio.", "temblando"],
    },
    {
      en: ["Hiking in the rain was not much fun.", "gerund", "It names an activity and is the subject.", "“Hiking” works as a noun, so it is a gerund.", "Hiking"],
      es: ["Omar olvidó traer su almuerzo.", "infinitive", "Fíjate en la terminación: -er.", "“Traer” es un infinitivo.", "traer"],
    },
    {
      en: ["Omar forgot to bring his lunch.", "infinitive", "It starts with “to” followed by a verb.", "“To bring” is an infinitive.", "to bring"],
      es: ["La carta escrita a mano llegó ayer.", "participle", "Es una forma irregular del verbo escribir.", "“Escrita” es el participio irregular de escribir.", "escrita"],
    },
    {
      en: ["Exhausted from the race, Ana sat down.", "participle", "It describes Ana.", "“Exhausted” describes a noun, so it is a participle.", "Exhausted"],
      es: ["Me gusta escuchar música mientras estudio.", "infinitive", "Fíjate en la terminación: -ar.", "“Escuchar” es un infinitivo.", "escuchar"],
    },
  ],
);

const VERBAL_JOB = cats<GroupJob>(
  {
    en: { noun: "Works as a noun", adjective: "Works as an adjective", adverb: "Works as an adverb" },
    es: { noun: "Funciona como sustantivo", adjective: "Funciona como adjetivo", adverb: "Funciona como adverbio" },
  },
  { en: ["noun", "adjective", "adverb"], es: ["noun", "adjective", "adverb"] },
  [
    {
      en: ["Swimming is my favorite sport.", "noun", "Ask: what is my favorite sport?", "The gerund names the sport and is the subject, so it works as a noun.", "Swimming"],
      es: ["Nadar es mi deporte favorito.", "noun", "Pregúntate: ¿qué es mi deporte favorito?", "El infinitivo nombra el deporte y es el sujeto: funciona como sustantivo.", "Nadar"],
    },
    {
      en: ["The barking dog woke the whole street.", "adjective", "Ask: which dog?", "The participle describes the dog, so it works as an adjective.", "barking"],
      es: ["El niño llegó corriendo a la escuela.", "adverb", "Pregúntate: ¿cómo llegó el niño?", "El gerundio dice cómo llegó: funciona como adverbio.", "corriendo"],
    },
    {
      en: ["We went to the store to buy milk.", "adverb", "Ask: why did we go to the store?", "The infinitive phrase tells why, so it works as an adverb.", "to buy milk"],
      es: ["La ventana rota dejaba entrar el frío.", "adjective", "Pregúntate: ¿cómo es la ventana?", "El participio describe a la ventana: funciona como adjetivo.", "rota"],
    },
    {
      en: ["Maya has a lot of homework to finish.", "adjective", "Ask: what kind of homework?", "The infinitive describes the homework, so it works as an adjective.", "to finish"],
      es: ["Me gusta escuchar música.", "noun", "Pregúntate: ¿qué me gusta?", "El infinitivo nombra lo que me gusta (es el sujeto de “gusta”): funciona como sustantivo.", "escuchar música"],
    },
    {
      en: ["To win the championship was the team's goal.", "noun", "Ask: what was the team's goal?", "The infinitive phrase is the subject, so it works as a noun.", "To win the championship"],
      es: ["Mi abuela cocina cantando.", "adverb", "Pregúntate: ¿cómo cocina mi abuela?", "El gerundio dice cómo cocina: funciona como adverbio.", "cantando"],
    },
    {
      en: ["The frozen lake sparkled in the sun.", "adjective", "Ask: which lake?", "The participle describes the lake, so it works as an adjective.", "frozen"],
      es: ["El lago congelado brillaba al sol.", "adjective", "Pregúntate: ¿cómo es el lago?", "El participio describe al lago: funciona como adjetivo.", "congelado"],
    },
    {
      en: ["Kenji enjoys drawing comics.", "noun", "Ask: what does Kenji enjoy?", "The gerund phrase names what he enjoys, so it works as a noun.", "drawing comics"],
      es: ["Ganar el campeonato era la meta del equipo.", "noun", "Pregúntate: ¿qué era la meta del equipo?", "El infinitivo es el sujeto: funciona como sustantivo.", "Ganar el campeonato"],
    },
    {
      en: ["Lena practiced every day to improve her serve.", "adverb", "Ask: why did Lena practice?", "The infinitive phrase tells why, so it works as an adverb.", "to improve her serve"],
      es: ["Los niños salieron del agua temblando.", "adverb", "Pregúntate: ¿cómo salieron los niños?", "El gerundio dice cómo salieron: funciona como adverbio.", "temblando"],
    },
    {
      en: ["Exhausted from the race, Ana sat down.", "adjective", "Ask: what was Ana like?", "The participle phrase describes Ana, so it works as an adjective.", "Exhausted from the race"],
      es: ["Agotada por la carrera, Ana se sentó.", "adjective", "Pregúntate: ¿cómo estaba Ana?", "El participio describe a Ana: funciona como adjetivo.", "Agotada por la carrera"],
    },
    {
      en: ["Lena wants to learn Japanese.", "noun", "Ask: what does Lena want?", "The infinitive phrase names what she wants, so it works as a noun.", "to learn Japanese"],
      es: ["Lena quiere aprender japonés.", "noun", "Pregúntate: ¿qué quiere Lena?", "El infinitivo nombra lo que quiere: funciona como sustantivo.", "aprender japonés"],
    },
    {
      en: ["The students were happy to help.", "adverb", "Ask: happy in what way, or why?", "The infinitive adds to the adjective “happy,” so it works as an adverb.", "to help"],
      es: ["El perro entró a la casa ladrando.", "adverb", "Pregúntate: ¿cómo entró el perro?", "El gerundio dice cómo entró: funciona como adverbio.", "ladrando"],
    },
    {
      en: ["The book to read next is on my desk.", "adjective", "Ask: which book?", "The infinitive tells which book, so it works as an adjective.", "to read next"],
      es: ["La carta escrita a mano llegó ayer.", "adjective", "Pregúntate: ¿cómo es la carta?", "El participio describe a la carta: funciona como adjetivo.", "escrita a mano"],
    },
    {
      en: ["Hiking in the rain was not much fun.", "noun", "Ask: what was not much fun?", "The gerund phrase is the subject, so it works as a noun.", "Hiking in the rain"],
      es: ["Leer antes de dormir me relaja.", "noun", "Pregúntate: ¿qué me relaja?", "El infinitivo es el sujeto: funciona como sustantivo.", "Leer antes de dormir"],
    },
    {
      en: ["We left early to catch the first bus.", "adverb", "Ask: why did we leave early?", "The infinitive phrase tells why, so it works as an adverb.", "to catch the first bus"],
      es: ["Mi hermana aprendió inglés viendo dibujos animados.", "adverb", "Pregúntate: ¿cómo aprendió inglés?", "El gerundio dice cómo aprendió: funciona como adverbio.", "viendo dibujos animados"],
    },
    {
      en: ["The cookies, baked this morning, are still warm.", "adjective", "Ask: which cookies?", "The participle phrase describes the cookies, so it works as an adjective.", "baked this morning"],
      es: ["Los aficionados, emocionados, aplaudieron al equipo.", "adjective", "Pregúntate: ¿cómo estaban los aficionados?", "El participio describe a los aficionados: funciona como adjetivo.", "emocionados"],
    },
    {
      en: ["Grandpa came over to fix the sink.", "adverb", "Ask: why did Grandpa come over?", "The infinitive phrase tells why, so it works as an adverb.", "to fix the sink"],
      es: ["Su sueño es viajar por el mundo.", "noun", "Pregúntate: ¿cuál es su sueño?", "El infinitivo nombra el sueño: funciona como sustantivo.", "viajar por el mundo"],
    },
  ],
);

const VERBALS = skill(
  { id: "e.verbals", grade: "8", title: { en: "Verbals", es: "Formas no personales del verbo" }, standard: "L.8.1a", prereqs: ["e.phrases.clauses"] },
  [
    {
      ...VERBAL_TYPE,
      ask: { en: "What kind of verbal is {t}?", es: "¿Qué forma no personal del verbo es {t}?" },
      hints: {
        en: ["A verbal is a verb form doing the job of another part of speech. What job does it do here?", "A gerund ends in -ing and works as a noun. A participle (often ending in -ing or -ed) describes a noun. An infinitive is “to” plus a verb."],
        es: ["Las formas no personales no dicen quién hace la acción. Fíjate en la terminación.", "El infinitivo termina en -ar, -er o -ir. El gerundio termina en -ando o -iendo. El participio termina en -ado o -ido, o es irregular, como escrito o roto."],
      },
      seconds: 15,
    },
    {
      ...VERBAL_JOB,
      ask: { en: "What job does {t} do in this sentence?", es: "¿Qué función cumple {t} en esta oración?" },
      hints: {
        en: ["Ask what question the verbal answers in this sentence.", "Gerunds work as nouns and participles as adjectives. An infinitive can be any of the three: a noun (what?), an adjective (which one?), or an adverb (why? how?)."],
        es: ["Pregúntate a qué pregunta responde la forma verbal en esta oración.", "En español, el infinitivo funciona como sustantivo (¿qué?), el participio como adjetivo (¿cómo es?) y el gerundio como adverbio (¿cómo?, ¿de qué manera?)."],
      },
      seconds: 20,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.verb.moods — level 1: name the mood (English: indicative, imperative, interrogative, conditional,
// subjunctive; four are shown. Spanish: indicativo, subjuntivo, imperativo); level 2: form the verb.
// Spanish level 2 targets the real Spanish errors: "si sería" for "si fuera", "quiero que vienes".

type Mood = "indicative" | "imperative" | "interrogative" | "conditional" | "subjunctive";
const MOOD_NAME = cats<Mood>(
  {
    en: { indicative: "Indicative", imperative: "Imperative", interrogative: "Interrogative", conditional: "Conditional", subjunctive: "Subjunctive" },
    es: { indicative: "Indicativo", subjunctive: "Subjuntivo", imperative: "Imperativo" },
  },
  { en: ["indicative", "imperative", "interrogative", "conditional", "subjunctive"], es: ["indicative", "subjunctive", "imperative"] },
  [
    {
      en: ["The library opens at nine.", "indicative", "Is it stating a fact?", "It states a fact, so it is indicative."],
      es: ["La biblioteca abre a las nueve.", "indicative", "¿Presenta algo como un hecho real?", "“Abre” presenta un hecho: está en indicativo.", "abre"],
    },
    {
      en: ["Close the door, please.", "imperative", "Is someone being told to do something?", "It gives a command, so it is imperative."],
      es: ["Cierra la puerta, por favor.", "imperative", "¿Le dice a alguien que haga algo?", "“Cierra” da una orden: está en imperativo.", "Cierra"],
    },
    {
      en: ["Did you finish the science project?", "interrogative", "Look at the end mark.", "It asks a question, so it is interrogative."],
      es: ["Ojalá llueva mañana.", "subjunctive", "“Ojalá” expresa un deseo.", "“Llueva” expresa un deseo: está en subjuntivo.", "llueva"],
    },
    {
      en: ["With more time, I would visit every museum in the city.", "conditional", "Look for “would.” Is this something real, or something that might happen?", "“Would visit” tells what might happen: conditional."],
      es: ["Quiero que vengas a mi fiesta.", "subjunctive", "Lo que se quiere todavía no es un hecho.", "“Vengas” va después de “quiero que”: está en subjuntivo.", "vengas"],
    },
    {
      en: ["I wish I were taller.", "subjunctive", "Look at “were” after “I.” Is this real, or a wish?", "“I were” expresses a wish, so it is subjunctive."],
      es: ["Mía toca el violonchelo en la orquesta de la escuela.", "indicative", "¿Presenta algo como un hecho real?", "“Toca” presenta un hecho: está en indicativo.", "toca"],
    },
    {
      en: ["Mia plays the cello in the school orchestra.", "indicative", "Is it stating a fact?", "It states a fact, so it is indicative."],
      es: ["Apaga la luz al salir.", "imperative", "¿Le dice a alguien que haga algo?", "“Apaga” da una orden: está en imperativo.", "Apaga"],
    },
    {
      en: ["Please hand in your permission slips by Friday.", "imperative", "Is someone being told to do something?", "It gives a command, so it is imperative."],
      es: ["Es importante que llegues temprano.", "subjunctive", "Después de “es importante que”, lo que sigue todavía no es un hecho.", "“Llegues” está en subjuntivo.", "llegues"],
    },
    {
      en: ["Where did you put the scissors?", "interrogative", "Look at the end mark.", "It asks a question, so it is interrogative."],
      es: ["Saturno es el sexto planeta desde el Sol.", "indicative", "¿Presenta algo como un hecho real?", "“Es” presenta un hecho: está en indicativo.", "es"],
    },
    {
      en: ["A bigger tent would keep us drier.", "conditional", "Look for “would.” Do they have the bigger tent?", "“Would keep” tells what might happen: conditional."],
      es: ["Siéntate aquí, junto a la ventana.", "imperative", "¿Le dice a alguien que haga algo?", "“Siéntate” da una orden: está en imperativo.", "Siéntate"],
    },
    {
      en: ["The coach insists that every player be on time.", "subjunctive", "Look at “be” after “every player.” It is not “is.”", "After “insists that,” the base form “be” is subjunctive."],
      es: ["Dudo que el partido empiece a tiempo.", "subjunctive", "“Dudo que” expresa una duda.", "“Empiece” está en subjuntivo.", "empiece"],
    },
    {
      en: ["Saturn is the sixth planet from the sun.", "indicative", "Is it stating a fact?", "It states a fact, so it is indicative."],
      es: ["Mi hermano estudia piano todos los días.", "indicative", "¿Presenta algo como un hecho real?", "“Estudia” presenta un hecho: está en indicativo.", "estudia"],
    },
    {
      en: ["Turn off the lights when you leave.", "imperative", "Is someone being told to do something?", "It gives a command, so it is imperative."],
      es: ["Ven a ver el arcoíris.", "imperative", "¿Le dice a alguien que haga algo?", "“Ven” da una orden: está en imperativo.", "Ven"],
    },
    {
      en: ["Have you ever seen a shooting star?", "interrogative", "Look at the end mark.", "It asks a question, so it is interrogative."],
      es: ["La maestra pidió que trajéramos tijeras.", "subjunctive", "Lo que pidió la maestra todavía no es un hecho.", "“Trajéramos” está en pretérito de subjuntivo.", "trajéramos"],
    },
    {
      en: ["We would need a bigger table for the whole family.", "conditional", "Look for “would.” Is this about something that might be?", "“Would need” tells what might happen: conditional."],
      es: ["Ayer vimos una estrella fugaz.", "indicative", "¿Presenta algo como un hecho real?", "“Vimos” presenta un hecho: está en indicativo.", "vimos"],
    },
    {
      en: ["It is important that she arrive early.", "subjunctive", "Look at “arrive.” Why is it not “arrives”?", "After “it is important that,” the base form “arrive” is subjunctive."],
      es: ["Escucha con atención las instrucciones.", "imperative", "¿Le dice a alguien que haga algo?", "“Escucha” da una orden: está en imperativo.", "Escucha"],
    },
    {
      en: ["The teacher suggested that he study with a partner.", "subjunctive", "Look at “study.” Why is it not “studies”?", "After “suggested that,” the base form “study” is subjunctive."],
      es: ["Espero que te guste el regalo.", "subjunctive", "Lo que se espera todavía no es un hecho.", "“Guste” está en subjuntivo.", "guste"],
    },
  ],
);

const MOOD_FORMS: Bi<Entry>[] = [
  {
    en: ["If I ___ you, I would study for the test.", "were", [["was", "indicative-for-subjunctive"], ["am", "present-for-contrary-to-fact"]], "The sentence imagines something that is not true: you are not the other person.", "For a situation contrary to fact, formal English uses “were,” even after “I.”"],
    es: ["Si yo ___ tú, estudiaría para el examen.", "fuera", [["sería", "conditional-in-si-clause"], ["soy", "present-for-contrary-to-fact"]], "La oración imagina algo que no es real: no eres la otra persona.", "Después de “si”, para algo irreal va el pretérito de subjuntivo: “si yo fuera”."],
  },
  {
    en: ["The doctor recommends that Ana ___ more water.", "drink", [["drinks", "indicative-for-subjunctive"], ["drank", "wrong-tense"]], "After “recommends that,” the verb stays in its base form.", "The subjunctive uses the base form: “that Ana drink.”"],
    es: ["Quiero que ___ a mi fiesta.", "vengas", [["vienes", "indicative-for-subjunctive"], ["vendrás", "indicative-for-subjunctive"]], "Lo que se quiere todavía no es un hecho.", "Después de “quiero que” va el subjuntivo."],
  },
  {
    en: ["I wish it ___ summer already.", "were", [["is", "indicative-for-subjunctive"], ["will be", "wrong-tense"]], "A wish is about something that is not true right now.", "After “I wish,” formal English uses “were.”"],
    es: ["Ojalá que mañana ___ sol.", "haga", [["hace", "indicative-for-subjunctive"], ["hará", "indicative-for-subjunctive"]], "“Ojalá” expresa un deseo.", "Después de “ojalá” va el subjuntivo."],
  },
  {
    en: ["If we had a bigger car, we ___ take the whole team.", "could", [["can", "indicative-for-conditional"], ["will", "indicative-for-conditional"]], "The sentence imagines a car you do not have.", "An imagined result uses a conditional helping verb such as “could” or “would.”"],
    es: ["Si tuviéramos un carro más grande, ___ llevar a todo el equipo.", "podríamos", [["podemos", "indicative-for-conditional"], ["podremos", "indicative-for-conditional"]], "La oración imagina un carro que no tienen.", "El resultado de una condición imaginada va en condicional."],
  },
  {
    en: ["It is essential that every student ___ a helmet on the trip.", "wear", [["wears", "indicative-for-subjunctive"], ["wore", "wrong-tense"]], "After “it is essential that,” the verb stays in its base form.", "The subjunctive uses the base form: “that every student wear.”"],
    es: ["Es importante que todos ___ casco en la excursión.", "usen", [["usan", "indicative-for-subjunctive"], ["usarán", "indicative-for-subjunctive"]], "Después de “es importante que”, lo que sigue todavía no es un hecho.", "Después de “es importante que” va el subjuntivo."],
  },
  {
    en: ["If Leo ___ here, he would know the answer.", "were", [["was", "indicative-for-subjunctive"], ["is", "present-for-contrary-to-fact"]], "Leo is not here; the sentence imagines it.", "For a situation contrary to fact, formal English uses “were.”"],
    es: ["Si Leo ___ aquí, sabría la respuesta.", "estuviera", [["estaría", "conditional-in-si-clause"], ["está", "present-for-contrary-to-fact"]], "Leo no está; la oración lo imagina.", "Después de “si”, para algo irreal va el pretérito de subjuntivo, nunca el condicional."],
  },
  {
    en: ["With a map, we ___ have found the trail faster.", "would", [["will", "indicative-for-conditional"], ["did", "indicative-for-conditional"]], "They did not have a map; the sentence imagines a different past.", "An imagined past result uses “would have.”"],
    es: ["Con un mapa, ___ encontrado el sendero más rápido.", "habríamos", [["hemos", "indicative-for-conditional"], ["habremos", "indicative-for-conditional"]], "No tenían mapa; la oración imagina un pasado distinto.", "Un resultado imaginado en el pasado va en condicional compuesto."],
  },
  {
    en: ["The rules require that each team ___ five players.", "have", [["has", "indicative-for-subjunctive"], ["had", "wrong-tense"]], "After “require that,” the verb stays in its base form.", "The subjunctive uses the base form: “that each team have.”"],
    es: ["Cuando ___ a casa, llámame.", "llegues", [["llegas", "indicative-for-subjunctive"], ["llegarás", "indicative-for-subjunctive"]], "La llegada todavía no pasa: es futura.", "Con “cuando” y una acción futura va el subjuntivo."],
  },
  {
    en: ["I would buy a telescope if I ___ enough money.", "had", [["have", "present-for-contrary-to-fact"], ["would have", "double-conditional"]], "The speaker does not have the money; the sentence imagines it.", "The “if” part of an imagined situation uses the past form, and “would” goes only in the result."],
    es: ["Compraría un telescopio si ___ suficiente dinero.", "tuviera", [["tendría", "conditional-in-si-clause"], ["tengo", "present-for-contrary-to-fact"]], "Quien habla no tiene el dinero; la oración lo imagina.", "Después de “si” va el pretérito de subjuntivo; el condicional va solo en el resultado."],
  },
  {
    en: ["She asked that the meeting ___ moved to Tuesday.", "be", [["is", "indicative-for-subjunctive"], ["was", "wrong-tense"]], "After “asked that,” the verb stays in its base form.", "The subjunctive uses the base form: “that the meeting be moved.”"],
    es: ["La maestra pidió que ___ la tarea a tiempo.", "entregáramos", [["entregamos", "indicative-for-subjunctive"], ["entregaríamos", "conditional-for-subjunctive"]], "“Pidió” está en pasado, y lo que se pide todavía no es un hecho.", "Después de “pidió que” va el pretérito de subjuntivo."],
  },
  {
    en: ["If my dog ___ talk, he would ask for treats all day.", "could", [["can", "present-for-contrary-to-fact"], ["will", "indicative-for-conditional"]], "Dogs cannot talk; the sentence imagines it.", "The “if” part of an imagined situation uses a past form."],
    es: ["Si mi perro ___ hablar, pediría premios todo el día.", "pudiera", [["podría", "conditional-in-si-clause"], ["puede", "present-for-contrary-to-fact"]], "Los perros no hablan; la oración lo imagina.", "Después de “si”, para algo irreal va el pretérito de subjuntivo."],
  },
  {
    en: ["We ___ go to the beach if it were warmer.", "would", [["will", "indicative-for-conditional"], ["are going to", "indicative-for-conditional"]], "It is not warm; the sentence imagines it.", "The result of an imagined situation uses “would.”"],
    es: ["Iríamos a la playa si ___ más calor.", "hiciera", [["haría", "conditional-in-si-clause"], ["hace", "present-for-contrary-to-fact"]], "No hace calor; la oración lo imagina.", "Después de “si”, para algo irreal va el pretérito de subjuntivo."],
  },
  {
    en: ["I suggest that he ___ early tomorrow.", "leave", [["leaves", "indicative-for-subjunctive"], ["left", "wrong-tense"]], "After “suggest that,” the verb stays in its base form.", "The subjunctive uses the base form: “that he leave.”"],
    es: ["Te sugiero que ___ temprano mañana.", "salgas", [["sales", "indicative-for-subjunctive"], ["saldrías", "conditional-for-subjunctive"]], "Lo que se sugiere todavía no es un hecho.", "Después de “sugiero que” va el subjuntivo."],
  },
  {
    en: ["Kai talks as if he ___ the boss.", "were", [["is", "indicative-for-subjunctive"], ["will be", "wrong-tense"]], "Kai is not the boss; “as if” imagines it.", "After “as if” for something untrue, formal English uses “were.”"],
    es: ["Kai habla como si ___ el jefe.", "fuera", [["es", "indicative-for-subjunctive"], ["sería", "conditional-for-subjunctive"]], "Kai no es el jefe; “como si” lo imagina.", "Después de “como si” va el pretérito de subjuntivo."],
  },
  {
    en: ["If I ___ known about the party, I would have come.", "had", [["would have", "double-conditional"], ["have", "wrong-tense"]], "The speaker did not know; the sentence imagines a different past.", "The “if” part uses “had,” and “would have” goes only in the result."],
    es: ["Si ___ sabido lo de la fiesta, habría venido.", "hubiera", [["habría", "conditional-in-si-clause"], ["he", "wrong-tense"]], "Quien habla no lo sabía; la oración imagina un pasado distinto.", "Después de “si” va el pluscuamperfecto de subjuntivo: “si hubiera sabido”."],
  },
];

const VERB_MOODS = skill(
  { id: "e.verb.moods", grade: "8", title: { en: "Verb moods", es: "Modos verbales" }, standard: "L.8.1c", prereqs: ["e.sentence.types"] },
  [
    {
      ...MOOD_NAME,
      ask: { en: "What mood is this sentence in?", es: "¿En qué modo está el verbo {t}?" },
      hints: {
        en: ["What is the sentence doing: stating a fact, giving a command, asking, imagining a result, or wishing?", "Indicative states facts. Imperative gives commands. Interrogative asks. Conditional uses “would” or “could” for what might happen. Subjunctive expresses wishes, demands, or things contrary to fact, like “If I were…” or “I suggest that he be…”"],
        es: ["¿El verbo presenta algo como real, como un deseo o una duda, o como una orden?", "El indicativo presenta hechos. El subjuntivo expresa deseos, dudas o posibilidades (ojalá llueva, quiero que vengas). El imperativo da órdenes (ven, siéntate)."],
      },
      seconds: 15,
    },
    {
      bank: MOOD_FORMS,
      ask: CHOOSE,
      hints: {
        en: ["Is the sentence about something real, or about a wish, a demand, or an imagined situation?", "For wishes and situations contrary to fact, use “were” or the past form after “if.” After “suggest that” or “require that,” use the base form. For an imagined result, use “would” or “could.”"],
        es: ["¿La oración habla de algo real, o de un deseo, una petición o una situación imaginada?", "Para deseos, peticiones y dudas va el subjuntivo (quiero que vengas). Después de “si” en una situación irreal va el pretérito de subjuntivo (si fuera), nunca el condicional (si sería). El resultado imaginado va en condicional (estudiaría)."],
      },
      seconds: 15,
    },
  ],
);

export { VERBALS, VERB_MOODS };
