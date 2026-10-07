import { skill, type Bi, type Entry } from "./shared";

// Grade 6: Greek and Latin roots; connotation; words with several meanings.

// ---------------------------------------------------------------------------------------------------
// e.greek.latin.roots — level 1: what one root means in a word; level 2: put the roots together to work
// out a whole word. Spanish uses the same Greek and Latin roots in Spanish words (geografía, termómetro,
// portátil…). Tags: meaning-of-other-part (took the meaning of the other root), similar-root-mixup
// (photo / phon, aud / vis), guessed-from-topic, opposite-root (ignored "in-", "de-", "mal-"…).

const ROOT_MEANING: Bi<Entry>[] = [
  {
    en: ["geography", "earth", [["write", "meaning-of-other-part"], ["map", "guessed-from-topic"]], "Think of “geology” and “geode.”", "“Geo” means earth; “graph” means write or draw.", "geo"],
    es: ["geografía", "tierra", [["escribir", "meaning-of-other-part"], ["mapa", "guessed-from-topic"]], "Piensa en “geología” y “geometría”.", "“Geo” significa tierra; “grafía” significa escritura o descripción.", "geo"],
  },
  {
    en: ["biology", "life", [["study", "meaning-of-other-part"], ["plant", "guessed-from-topic"]], "Think of “biography” and “antibiotic.”", "“Bio” means life; “logy” means the study of.", "bio"],
    es: ["biología", "vida", [["estudio", "meaning-of-other-part"], ["planta", "guessed-from-topic"]], "Piensa en “biografía” y “antibiótico”.", "“Bio” significa vida; “logía” significa estudio.", "bio"],
  },
  {
    en: ["telescope", "far", [["look", "meaning-of-other-part"], ["star", "guessed-from-topic"]], "Think of “telephone” and “television.”", "“Tele” means far; “scope” means look.", "tele"],
    es: ["teléfono", "lejos", [["sonido", "meaning-of-other-part"], ["hablar", "guessed-from-topic"]], "Piensa en “televisión” y “telescopio”.", "“Tele” significa lejos; “fono” significa sonido.", "tele"],
  },
  {
    en: ["microscope", "small", [["look", "meaning-of-other-part"], ["germ", "guessed-from-topic"]], "Think of “microphone” and “microchip.”", "“Micro” means small; “scope” means look.", "micro"],
    es: ["microscopio", "pequeño", [["mirar", "meaning-of-other-part"], ["germen", "guessed-from-topic"]], "Piensa en “micrófono” y “microbús”.", "“Micro” significa pequeño; “scopio” significa mirar u observar.", "micro"],
  },
  {
    en: ["phonics", "sound", [["letter", "guessed-from-topic"], ["light", "similar-root-mixup"]], "Think of “telephone” and “microphone.”", "“Phon” means sound.", "phon"],
    es: ["fonética", "sonido", [["letra", "guessed-from-topic"], ["luz", "similar-root-mixup"]], "Piensa en “teléfono” y “micrófono”.", "“Fon” significa sonido.", "fon"],
  },
  {
    en: ["photograph", "light", [["write", "meaning-of-other-part"], ["sound", "similar-root-mixup"]], "Think of “photosynthesis” and “photon.”", "“Photo” means light; “graph” means write or draw.", "photo"],
    es: ["fotografía", "luz", [["escribir", "meaning-of-other-part"], ["sonido", "similar-root-mixup"]], "Piensa en “fotosíntesis” y “fotón”.", "“Foto” significa luz; “grafía” significa escritura o dibujo.", "foto"],
  },
  {
    en: ["autograph", "self", [["write", "meaning-of-other-part"], ["car", "guessed-from-topic"]], "Think of “automatic” and “autobiography.”", "“Auto” means self.", "auto"],
    es: ["autógrafo", "uno mismo", [["escribir", "meaning-of-other-part"], ["carro", "guessed-from-topic"]], "Piensa en “automático” y “autobiografía”.", "“Auto” significa uno mismo.", "auto"],
  },
  {
    en: ["thermometer", "heat", [["measure", "meaning-of-other-part"], ["cold", "guessed-from-topic"]], "Think of “thermos” and “thermal.”", "“Therm” means heat; “meter” means measure.", "therm"],
    es: ["termómetro", "calor", [["medida", "meaning-of-other-part"], ["frío", "guessed-from-topic"]], "Piensa en “termo” y “térmico”.", "“Termo” significa calor; “metro” significa medida.", "termo"],
  },
  {
    en: ["chronological", "time", [["study", "meaning-of-other-part"], ["order", "guessed-from-topic"]], "Think of “chronic” and “synchronize.”", "“Chron” means time.", "chron"],
    es: ["cronológico", "tiempo", [["estudio", "meaning-of-other-part"], ["orden", "guessed-from-topic"]], "Piensa en “cronómetro” y “crónica”.", "“Crono” significa tiempo.", "crono"],
  },
  {
    en: ["dictate", "say", [["write", "guessed-from-topic"], ["lead", "similar-root-mixup"]], "Think of “predict” and “contradict.”", "“Dict” means say or speak.", "dict"],
    es: ["dictado", "decir", [["escribir", "guessed-from-topic"], ["guiar", "similar-root-mixup"]], "Piensa en “diccionario” y “dictador”.", "“Dict” significa decir.", "dict"],
  },
  {
    en: ["transport", "carry", [["across", "meaning-of-other-part"], ["door", "similar-root-mixup"]], "Think of “portable” and “export.”", "“Port” means carry; “trans” means across.", "port"],
    es: ["transportar", "llevar", [["a través", "meaning-of-other-part"], ["puerta", "similar-root-mixup"]], "Piensa en “portátil” y “exportar”.", "“Port” significa llevar; “trans” significa al otro lado.", "port"],
  },
  {
    en: ["visible", "see", [["able", "meaning-of-other-part"], ["life", "similar-root-mixup"]], "Think of “vision” and “visit.”", "“Vis” means see.", "vis"],
    es: ["visible", "ver", [["capaz", "meaning-of-other-part"], ["vida", "similar-root-mixup"]], "Piensa en “visión” y “visitar”.", "“Vis” significa ver.", "vis"],
  },
  {
    en: ["audience", "hear", [["see", "similar-root-mixup"], ["crowd", "guessed-from-topic"]], "Think of “audio” and “audition.”", "“Aud” means hear.", "aud"],
    es: ["audiencia", "oír", [["ver", "similar-root-mixup"], ["multitud", "guessed-from-topic"]], "Piensa en “audio” y “audición”.", "“Aud” significa oír.", "aud"],
  },
  {
    en: ["manuscript", "write", [["hand", "meaning-of-other-part"], ["book", "guessed-from-topic"]], "Think of “script” and “scribble.”", "“Script” means write; “manu” means hand.", "script"],
    es: ["manuscrito", "escribir", [["mano", "meaning-of-other-part"], ["libro", "guessed-from-topic"]], "Piensa en “inscripción” y “escritor”.", "“Scri” viene de escribir; “manu” significa mano.", "scri"],
  },
  {
    en: ["pedestrian", "foot", [["child", "similar-root-mixup"], ["street", "guessed-from-topic"]], "Think of “pedal” and “pedicure.”", "In “pedestrian,” “ped” comes from the Latin word for foot.", "ped"],
    es: ["pedal", "pie", [["niño", "similar-root-mixup"], ["bicicleta", "guessed-from-topic"]], "Piensa en “pedestre” y “pedicura”.", "En “pedal”, “ped” viene del latín y significa pie.", "ped"],
  },
  {
    en: ["aquarium", "water", [["fish", "guessed-from-topic"], ["place", "meaning-of-other-part"]], "Think of “aquatic” and “aqueduct.”", "“Aqua” means water.", "aqua"],
    es: ["acuario", "agua", [["pez", "guessed-from-topic"], ["lugar", "meaning-of-other-part"]], "Piensa en “acuático” y “acueducto”.", "“Acua” significa agua.", "acua"],
  },
];

const ROOT_WORDS: Bi<Entry>[] = [
  {
    en: ["", "a device that measures time very exactly", [["the study of history", "guessed-from-topic"], ["a device that measures heat", "similar-root-mixup"], ["a person who is always on time", "meaning-of-other-part"]], "“Chrono” means time, and “meter” means measure.", "Put the parts together: something that measures time.", "chronometer"],
    es: ["", "aparato que mide el tiempo con precisión", [["estudio de la historia", "guessed-from-topic"], ["aparato que mide el calor", "similar-root-mixup"], ["persona que siempre llega a tiempo", "meaning-of-other-part"]], "“Crono” significa tiempo y “metro” significa medida.", "Junta las partes: algo que mide el tiempo.", "cronómetro"],
  },
  {
    en: ["", "related to heat from inside the earth", [["related to the study of rocks", "guessed-from-topic"], ["related to light from the sky", "similar-root-mixup"], ["related to maps of the land", "meaning-of-other-part"]], "“Geo” means earth, and “therm” means heat.", "Put the parts together: earth plus heat.", "geothermal"],
    es: ["", "relacionado con el calor del interior de la Tierra", [["relacionado con el estudio de las rocas", "guessed-from-topic"], ["relacionado con la luz del cielo", "similar-root-mixup"], ["relacionado con los mapas", "meaning-of-other-part"]], "“Geo” significa tierra y “term” significa calor.", "Junta las partes: tierra más calor.", "geotérmico"],
  },
  {
    en: ["", "able to be heard", [["able to be seen", "similar-root-mixup"], ["very loud", "guessed-from-topic"], ["unable to be heard", "opposite-root"]], "“Aud” means hear, and “ible” means able to be.", "Put the parts together: able to be heard.", "audible"],
    es: ["", "que se puede oír", [["que se puede ver", "similar-root-mixup"], ["muy ruidoso", "guessed-from-topic"], ["que no se puede oír", "opposite-root"]], "“Aud” significa oír y “ible” significa que se puede.", "Junta las partes: que se puede oír.", "audible"],
  },
  {
    en: ["", "a person who does good for others", [["a person who causes harm", "opposite-root"], ["a person who works in a factory", "guessed-from-topic"], ["something done well", "meaning-of-other-part"]], "“Bene” means good or well, and “factor” means one who makes or does.", "Put the parts together: one who does good.", "benefactor"],
    es: ["", "persona que hace el bien a otros", [["persona que hace daño", "opposite-root"], ["persona que trabaja en una fábrica", "guessed-from-topic"], ["algo bien hecho", "meaning-of-other-part"]], "“Bene” significa bien y “factor” significa quien hace.", "Junta las partes: quien hace el bien.", "benefactor"],
  },
  {
    en: ["", "to work badly or fail", [["to work very well", "opposite-root"], ["a party or special event", "meaning-of-other-part"], ["to stop on purpose", "guessed-from-topic"]], "“Mal” means bad or badly.", "Put the parts together: to function badly.", "malfunction"],
    es: ["", "falta de una alimentación buena y suficiente", [["alimentación muy buena", "opposite-root"], ["enfermedad de la piel", "guessed-from-topic"], ["comida", "meaning-of-other-part"]], "“Mal” significa mal o malo.", "Junta las partes: nutrición mala.", "malnutrición"],
  },
  {
    en: ["", "the written story of a person's life", [["the study of living things", "similar-root-mixup"], ["a drawing of a plant", "guessed-from-topic"], ["a list of book titles", "meaning-of-other-part"]], "“Bio” means life, and “graph” means write.", "Put the parts together: writing about a life.", "biography"],
    es: ["", "historia escrita de la vida de una persona", [["estudio de los seres vivos", "similar-root-mixup"], ["dibujo de una planta", "guessed-from-topic"], ["lista de títulos de libros", "meaning-of-other-part"]], "“Bio” significa vida y “grafía” significa escritura.", "Junta las partes: escritura sobre una vida.", "biografía"],
  },
  {
    en: ["", "to say the opposite of what someone said", [["to agree with someone", "opposite-root"], ["to write a contract", "guessed-from-topic"], ["to say something again", "meaning-of-other-part"]], "“Contra” means against, and “dict” means say.", "Put the parts together: to say against.", "contradict"],
    es: ["", "decir lo contrario de lo que otro dijo", [["estar de acuerdo con alguien", "opposite-root"], ["escribir un contrato", "guessed-from-topic"], ["decir algo otra vez", "meaning-of-other-part"]], "“Contra” significa en contra de.", "Junta las partes: decir en contra.", "contradecir"],
  },
  {
    en: ["", "a person who watches an event", [["a person who speaks at an event", "similar-root-mixup"], ["a person who plays in a game", "guessed-from-topic"], ["a kind of eyeglasses", "meaning-of-other-part"]], "“Spect” means look or watch, and “or” means a person who.", "Put the parts together: a person who watches.", "spectator"],
    es: ["", "persona que mira un espectáculo", [["persona que habla en un evento", "similar-root-mixup"], ["persona que juega en un partido", "guessed-from-topic"], ["persona que espera mucho", "meaning-of-other-part"]], "“Spect” significa mirar y “dor” significa persona que hace algo.", "Junta las partes: persona que mira.", "espectador"],
  },
  {
    en: ["", "a stand with three legs", [["a trip on foot", "guessed-from-topic"], ["a group of three people", "meaning-of-other-part"], ["a stand with four legs", "similar-root-mixup"]], "“Tri” means three, and “pod” means foot.", "Put the parts together: three feet.", "tripod"],
    es: ["", "soporte de tres patas", [["viaje a pie", "guessed-from-topic"], ["grupo de tres personas", "meaning-of-other-part"], ["soporte de cuatro patas", "similar-root-mixup"]], "“Tri” significa tres, y “pode” viene del griego y significa pie.", "Junta las partes: tres pies.", "trípode"],
  },
  {
    en: ["", "too quiet to be heard", [["very loud", "opposite-root"], ["easy to see", "similar-root-mixup"], ["able to be heard", "meaning-of-other-part"]], "“In” means not, “aud” means hear, and “ible” means able to be.", "Put the parts together: not able to be heard.", "inaudible"],
    es: ["", "que no se puede oír", [["muy ruidoso", "opposite-root"], ["fácil de ver", "similar-root-mixup"], ["que se puede oír", "meaning-of-other-part"]], "“In” significa no, “aud” significa oír e “ible” significa que se puede.", "Junta las partes: que no se puede oír.", "inaudible"],
  },
  {
    en: ["", "easy to carry", [["easy to open", "similar-root-mixup"], ["made in a port city", "guessed-from-topic"], ["heavy and fixed in place", "opposite-root"]], "“Port” means carry, and “able” means can be.", "Put the parts together: can be carried.", "portable"],
    es: ["", "que se puede llevar fácilmente", [["que se puede abrir fácilmente", "similar-root-mixup"], ["hecho en un puerto", "guessed-from-topic"], ["pesado y fijo en un lugar", "opposite-root"]], "“Port” significa llevar, y “-átil” indica que se puede hacer.", "Junta las partes: que se puede llevar.", "portátil"],
  },
  {
    en: ["", "a living thing too small to see without a microscope", [["a very large animal", "opposite-root"], ["a small machine", "meaning-of-other-part"], ["a kind of microphone", "guessed-from-topic"]], "“Micro” means small, and “be” comes from “bio,” life.", "Put the parts together: small life.", "microbe"],
    es: ["", "ser vivo tan pequeño que no se ve sin microscopio", [["animal muy grande", "opposite-root"], ["máquina pequeña", "meaning-of-other-part"], ["tipo de micrófono", "guessed-from-topic"]], "“Micro” significa pequeño y “bio” significa vida.", "Junta las partes: vida pequeña.", "microbio"],
  },
  {
    en: ["", "to remove water from", [["to add water to", "opposite-root"], ["to heat until it melts", "guessed-from-topic"], ["to remove air from", "similar-root-mixup"]], "“De” means remove, and “hydr” means water.", "Put the parts together: remove water.", "dehydrate"],
    es: ["", "quitar el agua", [["agregar agua", "opposite-root"], ["calentar hasta derretir", "guessed-from-topic"], ["quitar el aire", "similar-root-mixup"]], "“Des” significa quitar e “hidr” significa agua.", "Junta las partes: quitar el agua.", "deshidratar"],
  },
  {
    en: ["", "able to speak only one language", [["able to speak many languages", "opposite-root"], ["speaking one word at a time", "guessed-from-topic"], ["having a long tongue", "meaning-of-other-part"]], "“Mono” means one, and “lingu” means language or tongue.", "Put the parts together: one language.", "monolingual"],
    es: ["", "que habla una sola lengua", [["que habla muchas lenguas", "opposite-root"], ["que dice una palabra a la vez", "guessed-from-topic"], ["que tiene una lengua larga", "meaning-of-other-part"]], "“Mono” significa uno y “lingüe” significa lengua o idioma.", "Junta las partes: una sola lengua.", "monolingüe"],
  },
];

const ROOTS = skill(
  { id: "e.greek.latin.roots", grade: "6", title: { en: "Greek and Latin roots", es: "Raíces griegas y latinas" }, standard: "L.6.4b", prereqs: ["e.prefixes", "e.context.clues"] },
  [
    {
      bank: ROOT_MEANING,
      ask: { en: "What does the root {t} mean in this word?", es: "¿Qué significa la raíz {t} en esta palabra?" },
      hints: {
        en: ["Think of other words that share this root.", "List two or three words you know with the root and ask what meaning they have in common."],
        es: ["Piensa en otras palabras que tengan esta raíz.", "Haz una lista de dos o tres palabras que conozcas con la raíz y busca el significado que comparten."],
      },
      seconds: 12,
    },
    {
      bank: ROOT_WORDS,
      ask: { en: "Use the roots to work out what {t} means.", es: "Usa las raíces para deducir qué significa {t}." },
      hints: {
        en: ["Split the word into its parts.", "Give each part its meaning, then put the meanings together. Watch for parts like “in-,” “de-,” or “mal-” that change the meaning."],
        es: ["Divide la palabra en sus partes.", "Dale a cada parte su significado y luego júntalos. Fíjate en partes como “in-”, “des-” o “mal-”, que cambian el sentido."],
      },
      seconds: 20,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.connotation — level 1: three words with about the same dictionary meaning; pick the one whose
// feeling fits the writer (Spanish adds the feeling of the suffixes -ito and -ucho: casita, casucha);
// level 2: what a word suggests beyond its dictionary meaning.

const CONNOTATION_FIT: Bi<Entry>[] = [
  {
    en: ["A hotel ad describes its little guest room as ___.", "cozy", [["small", "neutral-connotation"], ["cramped", "opposite-connotation"]], "An ad wants guests to feel good about the room.", "“Cozy,” “small,” and “cramped” all describe a little space, but only one makes it sound pleasant."],
    es: ["Un anuncio de hotel describe su cuarto pequeño como ___.", "acogedor", [["chico", "neutral-connotation"], ["estrecho", "opposite-connotation"]], "Un anuncio quiere que los huéspedes se sientan bien con el cuarto.", "Las tres palabras pueden describir un espacio pequeño, pero solo una lo hace sonar agradable."],
  },
  {
    en: ["A tenant complaining to the landlord calls the tiny apartment ___.", "cramped", [["small", "neutral-connotation"], ["cozy", "opposite-connotation"]], "A complaint needs a word that sounds unpleasant.", "“Cramped” makes the small space sound uncomfortable."],
    es: ["Un inquilino que se queja con el dueño dice que el departamento es ___.", "estrecho", [["chico", "neutral-connotation"], ["acogedor", "opposite-connotation"]], "Una queja necesita una palabra que suene desagradable.", "“Estrecho” hace que el espacio pequeño suene incómodo."],
  },
  {
    en: ["The candle box promises a sweet ___ of vanilla.", "fragrance", [["smell", "neutral-connotation"], ["stench", "opposite-connotation"]], "The box wants the candle to sound pleasant.", "All three name something you smell, but only one sounds lovely."],
    es: ["La caja de la vela promete un dulce ___ a vainilla.", "aroma", [["olor", "neutral-connotation"], ["hedor", "opposite-connotation"]], "La caja quiere que la vela suene agradable.", "Las tres nombran algo que se huele, pero solo una suena agradable."],
  },
  {
    en: ["The camper held his nose at the ___ of the garbage bin.", "stench", [["smell", "neutral-connotation"], ["fragrance", "opposite-connotation"]], "Holding your nose shows the smell is very unpleasant.", "“Stench” is a strong, unpleasant smell."],
    es: ["El campista se tapó la nariz por el ___ del basurero.", "hedor", [["olor", "neutral-connotation"], ["aroma", "opposite-connotation"]], "Taparse la nariz muestra que lo que huele es muy desagradable.", "“Hedor” es un olor fuerte y desagradable."],
  },
  {
    en: ["A store wants shoppers to feel smart about saving money, so it calls its prices ___.", "affordable", [["low", "neutral-connotation"], ["cheap", "opposite-connotation"]], "The store wants the prices to sound like a smart choice, not poor quality.", "“Cheap” can suggest poor quality; “affordable” sounds like a good value."],
    es: ["La guía del museo elogia el automóvil ___ de 1965.", "clásico", [["viejo", "neutral-connotation"], ["anticuado", "opposite-connotation"]], "La guía quiere que el carro suene especial.", "“Clásico” hace que un carro viejo suene valioso."],
  },
  {
    en: ["Annoyed by the old furniture, the reviewer called the chairs ___.", "outdated", [["old", "neutral-connotation"], ["classic", "opposite-connotation"]], "The reviewer is annoyed, so the word should sound negative.", "“Outdated” makes old sound like a problem."],
    es: ["El crítico, molesto con los muebles viejos, dijo que las sillas eran ___.", "anticuadas", [["viejas", "neutral-connotation"], ["clásicas", "opposite-connotation"]], "El crítico está molesto, así que la palabra debe sonar negativa.", "“Anticuadas” hace que lo viejo suene como un problema."],
  },
  {
    en: ["A museum guide praises the ___ car from 1965.", "classic", [["old", "neutral-connotation"], ["outdated", "opposite-connotation"]], "A guide praising the car wants it to sound special.", "“Classic” makes an old car sound valuable."],
    es: ["El abuelo sonrió a su nieta ___, que no paraba de preguntar sobre las estrellas.", "curiosa", [["preguntona", "opposite-connotation"], ["entrometida", "opposite-connotation"]], "El abuelo sonríe, así que le gustan sus preguntas.", "“Curiosa” es alguien con ganas de aprender; “preguntona” y “entrometida” suenan a crítica."],
  },
  {
    en: ["Grandpa smiled at his ___ granddaughter, who was full of questions about the stars.", "inquisitive", [["questioning", "neutral-connotation"], ["nosy", "opposite-connotation"]], "Grandpa is smiling, so he likes her questions.", "“Inquisitive” means eager to learn; “nosy” would mean prying into other people's business."],
    es: ["Cansada de las preguntas del vecino sobre su vida privada, Sara dijo que era ___.", "entrometido", [["curioso", "opposite-connotation"], ["inquisitivo", "opposite-connotation"]], "Sara está molesta, así que la palabra debe sonar negativa.", "“Entrometido” es quien se mete en asuntos que no son suyos."],
  },
  {
    en: ["Tired of her neighbor's questions about her private life, Sara called him ___.", "nosy", [["interested", "neutral-connotation"], ["inquisitive", "opposite-connotation"]], "Sara is annoyed, so the word should sound negative.", "“Nosy” means prying into things that are not your business."],
    es: ["La maestra, molesta, le pidió al grupo que dejara de portarse de manera tan ___.", "infantil", [["juvenil", "opposite-connotation"], ["inocente", "opposite-connotation"]], "La maestra está molesta, así que la palabra debe sonar negativa.", "“Infantil”, dicho de alguien que ya no es niño, es una crítica."],
  },
  {
    en: ["The poet describes the old woman's ___ laugh, full of life.", "youthful", [["young", "neutral-connotation"], ["childish", "opposite-connotation"]], "The poet admires her laugh.", "“Youthful” means having the good qualities of youth; “childish” would be an insult."],
    es: ["El poeta describe la risa ___ de la anciana, llena de vida.", "juvenil", [["infantil", "opposite-connotation"], ["inmadura", "opposite-connotation"]], "El poeta admira su risa.", "“Juvenil” da la idea de energía y alegría."],
  },
  {
    en: ["Frustrated, the teacher told the class to stop acting so ___.", "childish", [["young", "neutral-connotation"], ["youthful", "opposite-connotation"]], "The teacher is frustrated, so the word should sound negative.", "“Childish” is a criticism: acting younger than you should."],
    es: ["En su diario, Lucía recuerda con cariño la ___ de sus abuelos en el campo.", "casita", [["casa", "neutral-connotation"], ["casucha", "opposite-connotation"]], "Lucía la recuerda con cariño.", "El sufijo “-ita” añade cariño; “-ucha” desprecia."],
  },
  {
    en: ["A news story calls the scientist ___ for her work on clean water.", "renowned", [["well-known", "neutral-connotation"], ["notorious", "opposite-connotation"]], "The story praises her work.", "“Renowned” means famous for good reasons; “notorious” means famous for bad ones."],
    es: ["Molesto, el inquilino dijo que le habían rentado un ___ sin ventanas.", "cuartucho", [["cuarto", "neutral-connotation"], ["cuartito", "opposite-connotation"]], "El inquilino está molesto, así que la palabra debe sonar despectiva.", "El sufijo “-ucho” hace que el cuarto suene feo y pobre."],
  },
  {
    en: ["The town was tired of the ___ prankster who kept painting fake potholes.", "notorious", [["well-known", "neutral-connotation"], ["renowned", "opposite-connotation"]], "The town is tired of this person.", "“Notorious” means famous for something bad."],
    es: ["Enojado, el profesor dijo que el trabajo era un ___ lleno de errores.", "papelucho", [["papel", "neutral-connotation"], ["papelito", "opposite-connotation"]], "El profesor está enojado, así que la palabra debe sonar despectiva.", "El sufijo “-ucho” hace que el escrito suene sin valor."],
  },
  {
    en: ["The art teacher praised Mina's ___ style, unlike anyone else's.", "unique", [["unusual", "neutral-connotation"], ["weird", "opposite-connotation"]], "The teacher is praising the style.", "“Unique” makes being different sound special."],
    es: ["La maestra elogió el estilo ___ de Mina, distinto al de todos.", "original", [["diferente", "neutral-connotation"], ["raro", "opposite-connotation"]], "La maestra elogia el estilo.", "“Original” hace que ser distinto suene especial."],
  },
  {
    en: ["Kenji frowned at the ___ hat his uncle gave him.", "weird", [["unusual", "neutral-connotation"], ["unique", "opposite-connotation"]], "Kenji is frowning, so the word should sound negative.", "“Weird” makes being different sound bad."],
    es: ["Kenji frunció el ceño al ver el sombrero ___ que le regaló su tío.", "raro", [["diferente", "neutral-connotation"], ["original", "opposite-connotation"]], "Kenji frunce el ceño, así que la palabra debe sonar negativa.", "“Raro” hace que ser distinto suene mal."],
  },
];

const CONNOTATION_SUGGEST: Bi<Entry>[] = [
  {
    en: ["The new students huddled near the door on the first day.", "They felt nervous and wanted to stay close together", [["They stood near the door", "denotation-only"], ["They felt relaxed and confident", "opposite-connotation"], ["They were planning to leave school", "unsupported-reading"]], "Compare “huddled” with “stood.” What feeling does “huddled” add?", "“Huddled” means crowded close together, and it suggests nervousness or cold.", "huddled"],
    es: ["El gatito se acurrucó debajo de la cama durante la tormenta.", "Tenía miedo y buscaba protegerse", [["Estaba debajo de la cama", "denotation-only"], ["Estaba juguetón y curioso", "opposite-connotation"], ["Estaba herido", "unsupported-reading"]], "Compara “se acurrucó” con “se metió”. ¿Qué sensación añade?", "“Acurrucarse” es encogerse para protegerse, y sugiere miedo o frío.", "acurrucó"],
  },
  {
    en: ["Our dog gobbled his dinner in ten seconds.", "He ate fast and eagerly", [["He ate his dinner", "denotation-only"], ["He ate slowly and carefully", "opposite-connotation"], ["He was sick", "unsupported-reading"]], "Compare “gobbled” with “ate.” What does it add?", "“Gobbled” means ate quickly and greedily.", "gobbled"],
    es: ["Nuestro perro devoró su cena en diez segundos.", "Comió muy rápido y con muchas ganas", [["Comió su cena", "denotation-only"], ["Comió despacio y con cuidado", "opposite-connotation"], ["Estaba enfermo", "unsupported-reading"]], "Compara “devoró” con “comió”. ¿Qué añade?", "“Devorar” es comer con prisa y con muchas ganas.", "devoró"],
  },
  {
    en: ["The old house loomed over the empty street.", "It seemed large and a little threatening", [["It stood on the street", "denotation-only"], ["It seemed small and cheerful", "opposite-connotation"], ["It was about to fall down", "unsupported-reading"]], "Compare “loomed” with “stood.” What mood does it set?", "“Loomed” means appeared large in a threatening way.", "loomed"],
    es: ["La vieja casa se cernía sobre la calle vacía.", "Parecía grande y un poco amenazante", [["Estaba en la calle", "denotation-only"], ["Parecía pequeña y alegre", "opposite-connotation"], ["Estaba a punto de caerse", "unsupported-reading"]], "Compara “se cernía” con “estaba”. ¿Qué ambiente crea?", "“Cernirse” es estar encima de algo como una amenaza.", "cernía"],
  },
  {
    en: ["Grandma's kitchen was always bustling on holidays.", "It was busy and full of happy activity", [["It had people in it", "denotation-only"], ["It was quiet and empty", "opposite-connotation"], ["It was messy and dirty", "unsupported-reading"]], "Picture a kitchen that is “bustling.” What do you see and hear?", "“Bustling” means full of energetic, busy activity.", "bustling"],
    es: ["La cocina de la abuela siempre bullía de actividad en los días de fiesta.", "Estaba llena de movimiento alegre", [["Había gente en ella", "denotation-only"], ["Estaba tranquila y vacía", "opposite-connotation"], ["Estaba sucia y desordenada", "unsupported-reading"]], "Imagina una cocina que “bulle”. ¿Qué ves y qué oyes?", "“Bullir” es moverse mucho, como el agua cuando hierve.", "bullía"],
  },
  {
    en: ["The speaker droned on about the parking rules for an hour.", "The talk was dull and boring", [["The speaker talked", "denotation-only"], ["The talk was exciting", "opposite-connotation"], ["The speaker was angry", "unsupported-reading"]], "Compare “droned on” with “talked.” How does it sound?", "“Droned” means talked in a flat, boring way.", "droned"],
    es: ["Ava paseó por el jardín después del almuerzo.", "Caminó despacio y relajada", [["Caminó", "denotation-only"], ["Corrió con prisa y miedo", "opposite-connotation"], ["Estaba perdida", "unsupported-reading"]], "Compara “paseó” con “caminó”. ¿Qué añade?", "“Pasear” es andar sin prisa, por gusto.", "paseó"],
  },
  {
    en: ["Ava strolled through the garden after lunch.", "She walked in a slow, relaxed way", [["She walked", "denotation-only"], ["She hurried in a panic", "opposite-connotation"], ["She was lost", "unsupported-reading"]], "Compare “strolled” with “walked.” What does it add?", "“Strolled” means walked slowly for pleasure.", "strolled"],
    es: ["El cachorro brincaba por el patio moviendo la cola.", "Se movía con saltos alegres y llenos de energía", [["Se movía por el patio", "denotation-only"], ["Se movía despacio y triste", "opposite-connotation"], ["Huía de un peligro", "unsupported-reading"]], "Compara “brincaba” con “se movía”. ¿Qué añade?", "“Brincar” es dar saltos, y aquí sugiere alegría.", "brincaba"],
  },
  {
    en: ["The puppy's tail wagged as it bounded across the yard.", "It moved with happy, energetic leaps", [["It moved across the yard", "denotation-only"], ["It moved slowly and sadly", "opposite-connotation"], ["It was running away from danger", "unsupported-reading"]], "Compare “bounded” with “moved.” What does it add?", "“Bounded” means moved with big, lively jumps.", "bounded"],
    es: ["La capitana del equipo presumió el triunfo ante toda la escuela.", "Habló del triunfo con demasiado orgullo", [["Habló del triunfo", "denotation-only"], ["Fue humilde y callada", "opposite-connotation"], ["Mintió sobre el marcador", "unsupported-reading"]], "Compara “presumió” con “contó”. ¿Qué añade?", "“Presumir” es mostrar algo con demasiado orgullo.", "presumió"],
  },
  {
    en: ["The team captain boasted about the win to everyone at school.", "The captain bragged in a way that seemed too proud", [["The captain talked about the win", "denotation-only"], ["The captain was humble and quiet about it", "opposite-connotation"], ["The captain lied about the score", "unsupported-reading"]], "Compare “boasted” with “talked.” What does it add?", "“Boasted” means bragged with too much pride.", "boasted"],
    es: ["Las olas azotaban las rocas toda la noche.", "Golpeaban con fuerza y ruido", [["Tocaban las rocas", "denotation-only"], ["Estaban tranquilas y suaves", "opposite-connotation"], ["Rompían las rocas en pedazos", "unsupported-reading"]], "Compara “azotaban” con “tocaban”. ¿Qué fuerza sugiere?", "“Azotar” es golpear con fuerza y una y otra vez.", "azotaban"],
  },
  {
    en: ["The waves crashed against the rocks all night.", "The waves hit hard and loudly", [["The waves touched the rocks", "denotation-only"], ["The waves were calm and gentle", "opposite-connotation"], ["The rocks broke into pieces", "unsupported-reading"]], "Compare “crashed” with “touched.” What force does it suggest?", "“Crashed” suggests a hard, loud hit.", "crashed"],
    es: ["Leo se zambulló en la novela de misterio todo el fin de semana.", "La leyó con mucho interés y concentración", [["Leyó la novela", "denotation-only"], ["La leyó con desgano", "opposite-connotation"], ["No entendió el libro", "unsupported-reading"]], "Una persona no puede zambullirse de verdad en un libro. ¿Qué sugiere la palabra?", "“Zambullirse” en algo es meterse por completo, con mucho interés.", "zambulló"],
  },
  {
    en: ["The kitten cowered under the bed during the storm.", "It was frightened and hiding", [["It was under the bed", "denotation-only"], ["It was playful and curious", "opposite-connotation"], ["It was hurt", "unsupported-reading"]], "Compare “cowered” with “sat.” What feeling does it add?", "“Cowered” means crouched down in fear.", "cowered"],
    es: ["Papá nos gruñó que ordenáramos los cuartos.", "Habló con enojo y de mal humor", [["Nos dijo que ordenáramos", "denotation-only"], ["Nos lo pidió con dulzura", "opposite-connotation"], ["Estaba orgulloso de los cuartos", "unsupported-reading"]], "Compara “gruñó” con “dijo”. ¿Qué tono sugiere?", "“Gruñir” es hablar entre dientes, con disgusto.", "gruñó"],
  },
  {
    en: ["Leo devoured the mystery novel in one weekend.", "He read it eagerly and quickly", [["He read the novel", "denotation-only"], ["He read it slowly and unwillingly", "opposite-connotation"], ["He did not understand the book", "unsupported-reading"]], "People do not really eat books. What does the word suggest?", "“Devoured” means took in hungrily, so he read it eagerly.", "devoured"],
    es: ["El jardín estaba invadido por la maleza.", "Había tanta maleza que se adueñó del jardín", [["Había maleza", "denotation-only"], ["Había muy poca maleza", "opposite-connotation"], ["Alguien sembró la maleza a propósito", "unsupported-reading"]], "Compara “invadido” con “tenía”. ¿Qué añade?", "“Invadido” sugiere que la maleza ocupó todo, como un ejército.", "invadido"],
  },
  {
    en: ["Dad snapped at us to clean our rooms.", "He spoke sharply and with irritation", [["He told us to clean", "denotation-only"], ["He asked gently and kindly", "opposite-connotation"], ["He was proud of our rooms", "unsupported-reading"]], "Compare “snapped” with “said.” What tone does it suggest?", "“Snapped” means spoke in a quick, irritated way.", "snapped"],
    es: ["A María se le iluminó la cara cuando dijeron su nombre.", "Sonrió con mucha alegría y orgullo", [["Escuchó su nombre", "denotation-only"], ["Frunció el ceño, preocupada", "opposite-connotation"], ["Llevaba horas esperando", "unsupported-reading"]], "Una cara no se enciende como una lámpara. ¿Qué sugiere la palabra?", "Que a alguien se le ilumine la cara es que muestra una gran alegría.", "iluminó"],
  },
  {
    en: ["The garden was overrun with weeds.", "There were so many weeds that they took over", [["There were weeds", "denotation-only"], ["There were only a few weeds", "opposite-connotation"], ["Someone planted weeds on purpose", "unsupported-reading"]], "Compare “overrun” with “had.” What does it add?", "“Overrun” suggests the weeds spread everywhere and took control.", "overrun"],
    es: ["Los turistas se arrastraron colina arriba bajo el sol.", "Subieron con mucho cansancio y esfuerzo", [["Subieron la colina", "denotation-only"], ["Subieron con energía y alegría", "opposite-connotation"], ["Se perdieron en la colina", "unsupported-reading"]], "Compara “se arrastraron” con “subieron”. ¿Qué añade?", "“Arrastrarse” sugiere moverse con gran esfuerzo, casi sin fuerzas.", "arrastraron"],
  },
  {
    en: ["Maria beamed when her name was called.", "She smiled with great happiness and pride", [["She heard her name", "denotation-only"], ["She frowned with worry", "opposite-connotation"], ["She had been waiting for hours", "unsupported-reading"]], "A beam is a ray of light. What does that suggest about her face?", "“Beamed” means smiled brightly with joy.", "beamed"],
    es: ["El niño se plantó en la puerta y no quiso salir.", "Se quedó firme y terco en su lugar", [["Estaba en la puerta", "denotation-only"], ["Salió con gusto", "opposite-connotation"], ["Estaba enfermo", "unsupported-reading"]], "Una persona no echa raíces como una planta. ¿Qué sugiere la palabra?", "“Plantarse” es quedarse firme sin moverse, muchas veces por terquedad.", "plantó"],
  },
];

const CONNOTATION = skill(
  { id: "e.connotation", grade: "6", title: { en: "Connotation and denotation", es: "Connotación y denotación" }, standard: "L.6.5c", prereqs: ["e.synonyms"] },
  [
    {
      bank: CONNOTATION_FIT,
      ask: { en: "Which word best fits what the writer wants?", es: "¿Qué palabra se ajusta mejor a lo que quiere quien escribe?" },
      hints: {
        en: ["All three words have about the same dictionary meaning. What feeling does the writer want to create?", "Sort the words: which one sounds positive, which sounds neutral, and which sounds negative?"],
        es: ["Las tres palabras significan más o menos lo mismo en el diccionario. ¿Qué sensación quiere crear quien escribe?", "Ordena las palabras: ¿cuál suena positiva, cuál neutral y cuál negativa? Los sufijos también cuentan: “-ito” suele dar cariño y “-ucho” desprecio."],
      },
      seconds: 15,
    },
    {
      bank: CONNOTATION_SUGGEST,
      ask: { en: "Beyond its dictionary meaning, what does {t} suggest?", es: "Además de su significado de diccionario, ¿qué sugiere {t}?" },
      hints: {
        en: ["Think about the dictionary meaning first, then the feeling the word adds.", "Ask why the writer chose this word instead of a plainer one with the same meaning. The answer must still fit the sentence."],
        es: ["Piensa primero en el significado de diccionario y luego en la sensación que añade la palabra.", "Pregúntate por qué quien escribe eligió esta palabra en lugar de otra más neutral. La respuesta debe seguir encajando con la oración."],
      },
      seconds: 25,
    },
  ],
);

// ---------------------------------------------------------------------------------------------------
// e.multiple.meanings — which dictionary meaning a word has in this sentence (Spanish: polisemia).

const SENSES: Bi<Entry>[] = [
  {
    en: ["The pitcher threw a fast pitch to the batter.", "a throw of the ball", [["how high or low a sound is", "other-meaning-of-word"], ["a sticky black tar", "other-meaning-of-word"]], "The sentence is about a baseball game.", "In baseball, a pitch is a throw to the batter.", "pitch"],
    es: ["Me senté en un banco del parque a leer.", "asiento largo", [["empresa que guarda dinero", "other-meaning-of-word"], ["grupo de peces", "other-meaning-of-word"]], "La oración dice que alguien se sentó.", "Aquí, el banco es un asiento.", "banco"],
  },
  {
    en: ["Please file these papers in the cabinet.", "put away in order in a folder or drawer", [["a tool for smoothing rough edges", "other-meaning-of-word"], ["a line of people one behind another", "other-meaning-of-word"]], "The sentence is about papers and a cabinet.", "Here, “file” means to put papers away in order.", "file"],
    es: ["Escribí el radio del círculo en mi cuaderno.", "línea del centro al borde de un círculo", [["aparato para oír emisoras", "other-meaning-of-word"], ["hueso del antebrazo", "other-meaning-of-word"]], "La oración habla de un círculo.", "Aquí, el radio es una medida del círculo.", "radio"],
  },
  {
    en: ["The bat flew out of the cave at dusk.", "a small flying mammal", [["a stick used to hit a ball", "other-meaning-of-word"], ["to blink your eyes quickly", "other-meaning-of-word"]], "What flies out of caves at dusk?", "Here, the bat is the animal.", "bat"],
    es: ["Vivimos en la tercera planta del edificio.", "piso de un edificio", [["ser vivo con hojas y raíces", "other-meaning-of-word"], ["parte de abajo del pie", "other-meaning-of-word"]], "La oración habla de un edificio.", "Aquí, la planta es un piso del edificio.", "planta"],
  },
  {
    en: ["The judge will rule on the case tomorrow.", "make an official decision", [["a law everyone must follow", "other-meaning-of-word"], ["govern a country as king or queen", "other-meaning-of-word"]], "The sentence says what the judge will do about a case.", "Here, “rule” is a verb: to decide officially.", "rule"],
    es: ["La llama del fuego subía cada vez más alto.", "luz y calor del fuego", [["animal de los Andes", "other-meaning-of-word"], ["forma del verbo llamar", "other-meaning-of-word"]], "La oración habla del fuego.", "Aquí, la llama es la luz del fuego.", "llama"],
  },
  {
    en: ["The new movie will draw a large crowd.", "attract or pull in", [["make a picture with a pencil", "other-meaning-of-word"], ["end a game in a tie", "other-meaning-of-word"]], "What does a movie do to a crowd?", "Here, “draw” means attract.", "draw"],
    es: ["El equipo ganó la copa del torneo.", "trofeo", [["parte de arriba de un árbol", "other-meaning-of-word"], ["vaso con pie para beber", "other-meaning-of-word"]], "La oración habla de ganar un torneo.", "Aquí, la copa es el trofeo.", "copa"],
  },
  {
    en: ["Our class will present the play on Friday.", "perform or show", [["a gift", "other-meaning-of-word"], ["here now, not absent", "other-meaning-of-word"]], "The sentence says what the class will do with the play.", "Here, “present” is a verb: to show or perform.", "present"],
    es: ["La hoja del cuchillo estaba muy afilada.", "parte que corta", [["parte verde de una planta", "other-meaning-of-word"], ["pedazo de papel", "other-meaning-of-word"]], "La oración habla de un cuchillo afilado.", "Aquí, la hoja es la parte que corta.", "hoja"],
  },
  {
    en: ["The bark of the old oak was rough and gray.", "the outer covering of a tree", [["the sound a dog makes", "other-meaning-of-word"], ["a kind of sailing ship", "other-meaning-of-word"]], "The sentence describes an oak tree.", "Here, the bark is the covering of a tree.", "bark"],
    es: ["En la escuela aprendo una segunda lengua.", "idioma", [["parte de la boca que sirve para saborear", "other-meaning-of-word"], ["franja de tierra que entra en el mar", "other-meaning-of-word"]], "La oración habla de algo que se aprende en la escuela.", "Aquí, la lengua es un idioma.", "lengua"],
  },
  {
    en: ["The baby can't bear loud noises.", "put up with", [["a large furry animal", "other-meaning-of-word"], ["carry a heavy load", "other-meaning-of-word"]], "The sentence is about how the baby reacts to noise.", "Here, “bear” means tolerate.", "bear"],
    es: ["Los alpinistas llegaron al pico más alto.", "cima de una montaña", [["boca dura de un ave", "other-meaning-of-word"], ["herramienta para romper la tierra", "other-meaning-of-word"]], "La oración habla de alpinistas.", "Aquí, el pico es la cima.", "pico"],
  },
  {
    en: ["Turn left at the next light.", "the direction opposite of right", [["went away", "other-meaning-of-word"], ["still remaining", "other-meaning-of-word"]], "The sentence gives a direction.", "Here, “left” is a direction.", "left"],
    es: ["Saqué la nota más alta en el examen de ciencias.", "calificación", [["sonido musical", "other-meaning-of-word"], ["mensaje breve escrito", "other-meaning-of-word"]], "La oración habla de un examen.", "Aquí, la nota es la calificación.", "nota"],
  },
  {
    en: ["The sun rose over the hills.", "came up", [["a flower with thorns", "other-meaning-of-word"], ["a pinkish color", "other-meaning-of-word"]], "The sentence says what the sun did.", "Here, “rose” is the past tense of “rise.”", "rose"],
    es: ["Había una cola larga para entrar al cine.", "fila de personas", [["parte final del cuerpo de un animal", "other-meaning-of-word"], ["pegamento", "other-meaning-of-word"]], "La oración habla de entrar al cine.", "Aquí, la cola es una fila de personas.", "cola"],
  },
  {
    en: ["The store will charge a fee for delivery.", "ask as a price", [["store power in a battery", "other-meaning-of-word"], ["be in control of a group", "other-meaning-of-word"]], "The sentence is about paying for delivery.", "Here, “charge” means ask a price.", "charge"],
    es: ["El mesero nos trajo la carta del restaurante.", "lista de platillos", [["mensaje escrito que se envía", "other-meaning-of-word"], ["naipe de una baraja", "other-meaning-of-word"]], "La oración habla de un restaurante.", "Aquí, la carta es el menú.", "carta"],
  },
  {
    en: ["The players drank water during the break.", "a short rest", [["split into pieces", "other-meaning-of-word"], ["a lucky chance", "other-meaning-of-word"]], "The sentence is about players taking time off in the middle of a game.", "Here, a break is a short rest.", "break"],
    es: ["Mi estación favorita es la primavera.", "época del año", [["lugar donde para el tren", "other-meaning-of-word"], ["emisora de radio", "other-meaning-of-word"]], "La oración nombra la primavera.", "Aquí, la estación es una época del año.", "estación"],
  },
  {
    en: ["We need a match to light the campfire.", "a small stick that makes a flame", [["a game between two teams", "other-meaning-of-word"], ["look the same as", "other-meaning-of-word"]], "What lights a campfire?", "Here, a match is a stick that makes fire.", "match"],
    es: ["Guarda la invitación en el sobre.", "envoltura de papel para cartas", [["encima de", "other-meaning-of-word"], ["acerca de", "other-meaning-of-word"]], "La oración dice dónde guardar una invitación.", "Aquí, el sobre es una envoltura de papel.", "sobre"],
  },
  {
    en: ["The river's current was too strong for swimming.", "the flow of water", [["happening now", "other-meaning-of-word"], ["the flow of electricity", "other-meaning-of-word"]], "The sentence is about a river.", "Here, the current is the moving water.", "current"],
    es: ["El barco pasó cerca del cabo antes de llegar al puerto.", "punta de tierra que entra en el mar", [["grado en el ejército", "other-meaning-of-word"], ["extremo de una cuerda", "other-meaning-of-word"]], "La oración habla de un barco en el mar.", "Aquí, el cabo es una punta de tierra.", "cabo"],
  },
  {
    en: ["The scale showed that the puppy weighed eight pounds.", "a device for weighing", [["a thin plate on a fish's skin", "other-meaning-of-word"], ["climb up", "other-meaning-of-word"]], "The sentence is about weighing a puppy.", "Here, a scale weighs things.", "scale"],
    es: ["Aunque parece inventada, la historia de la película es real.", "que existe o pasó de verdad", [["que pertenece al rey", "other-meaning-of-word"], ["antigua moneda española", "other-meaning-of-word"]], "Fíjate en “aunque parece inventada”.", "Aquí, “real” significa verdadero.", "real"],
  },
];

const MULTIPLE_MEANINGS = skill(
  { id: "e.multiple.meanings", grade: "6", title: { en: "Words with several meanings", es: "Palabras con varios significados" }, standard: "L.6.4a", prereqs: ["e.context.clues"] },
  [
    {
      bank: SENSES,
      ask: { en: "Which meaning of {t} is used in this sentence?", es: "¿Qué significado tiene {t} en esta oración?" },
      hints: {
        en: ["This word has more than one meaning. Which meaning fits the other words in the sentence?", "Try each meaning in place of the word and keep the one that makes sense."],
        es: ["Esta palabra tiene más de un significado. ¿Cuál encaja con las demás palabras de la oración?", "Prueba cada significado en lugar de la palabra y quédate con el que tiene sentido."],
      },
      seconds: 15,
    },
  ],
);

export { ROOTS, CONNOTATION, MULTIPLE_MEANINGS };
