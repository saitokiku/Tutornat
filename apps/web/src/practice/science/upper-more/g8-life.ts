import { bi, e, m, mx, type Bank } from "./shared";

// Grade 8 banks: natural selection and adaptation (s.natural.selection), the fossil record and other
// evidence of evolution (s.fossil.evidence), and Earth's history and geologic time (s.geologic.time).

// ── s.natural.selection ─────────────────────────────────────────────────────────────────────────

export const NATURAL_SELECTION: Bank = {
  nudge: bi("Was the trait already there before the change, or did the change create it?", "¿El rasgo ya existía antes del cambio, o el cambio lo creó?"),
  strategy: bi(
    "Ask three things: did the trait vary, could it be inherited, and did some individuals leave more offspring than others? Then follow the trait from parents to their young.",
    "Pregúntate tres cosas: ¿el rasgo variaba, se podía heredar y algunos individuos dejaron más crías que otros? Luego sigue el rasgo de los padres a sus crías.",
  ),
  seconds: 30,
  items: [
    e(
      bi("What does natural selection act on?", "¿Sobre qué actúa la selección natural?"),
      bi("Inherited differences among the individuals of a population", "Las diferencias heredadas entre los individuos de una población"),
      [
        m("thinks-individuals-adapt", "Changes an animal makes during its life because it needs them", "Los cambios que un animal hace durante su vida porque los necesita"),
        m("thinks-learned-traits-inherited", "Skills an animal learns from its parents", "Las habilidades que un animal aprende de sus padres"),
        m("thinks-strongest-always-wins", "Only the strongest animal in each group", "Solo el animal más fuerte de cada grupo"),
      ],
      bi("Without variation, there would be nothing to choose between.", "Sin variación, no habría nada entre qué elegir."),
      bi("Natural selection works on inherited variation: individuals whose traits help them survive and reproduce leave more offspring, so those traits spread.", "La selección natural actúa sobre la variación heredada: los individuos cuyos rasgos les ayudan a sobrevivir y reproducirse dejan más crías, así que esos rasgos se extienden."),
    ),
    e(
      bi(
        "Before the 1800s, most peppered moths in England were light colored. After soot from factories darkened tree trunks, dark moths became much more common. Why?",
        "Antes del siglo XIX, la mayoría de las polillas moteadas de Inglaterra eran de color claro. Cuando el hollín de las fábricas oscureció los troncos, las polillas oscuras se volvieron mucho más comunes. ¿Por qué?",
      ),
      bi("Birds ate more light moths, which stood out on dark trunks.", "Las aves comían más polillas claras, que resaltaban sobre los troncos oscuros."),
      [
        m("thinks-individuals-adapt", "The light moths turned dark so they could hide.", "Las polillas claras se volvieron oscuras para esconderse."),
        m("thinks-acquired-traits-inherited", "Soot stained the moths' wings, so their young were born stained too.", "El hollín manchó las alas de las polillas, y por eso sus crías nacieron manchadas."),
        m("thinks-selection-has-a-goal", "The moths decided to have dark offspring.", "Las polillas decidieron tener crías oscuras."),
      ],
      bi("Both colors were already in the population. Think about which ones birds could see.", "Los dos colores ya existían en la población. Piensa en cuáles podían ver las aves."),
      bi("Dark moths were hidden on sooty bark, so more of them lived long enough to reproduce. Over generations, the dark form became common.", "Las polillas oscuras quedaban ocultas sobre la corteza con hollín, así que más de ellas vivían lo suficiente para reproducirse. Con las generaciones, la forma oscura se volvió común."),
    ),
    e(
      bi(
        "An antibiotic kills most of the bacteria in an infection, but a few with a resistance gene survive and keep multiplying. What will the bacteria population be like?",
        "Un antibiótico mata a la mayoría de las bacterias de una infección, pero unas pocas con un gen de resistencia sobreviven y siguen multiplicándose. ¿Cómo será la población de bacterias?",
      ),
      bi("Mostly bacteria that resist the antibiotic", "En su mayoría bacterias que resisten el antibiótico"),
      [
        m("thinks-individuals-adapt", "Bacteria that the antibiotic taught to resist it", "Bacterias a las que el antibiótico les enseñó a resistirlo"),
        m("thinks-traits-disappear", "Bacteria that have lost the resistance gene", "Bacterias que perdieron el gen de resistencia"),
        m("misunderstands-survival", "The same mix as before the antibiotic", "La misma mezcla que antes del antibiótico"),
      ],
      bi("The resistance gene was there before the medicine was given.", "El gen de resistencia ya estaba antes de dar la medicina."),
      bi("The antibiotic removed the bacteria that could not resist it. The survivors pass the resistance gene to their offspring, so resistant bacteria take over.", "El antibiótico eliminó a las bacterias que no podían resistirlo. Las sobrevivientes pasan el gen de resistencia a sus descendientes, así que las bacterias resistentes predominan."),
    ),
    e(
      bi("Where do new inherited variations in a population first come from?", "¿De dónde vienen al principio las nuevas variaciones heredadas de una población?"),
      bi("Random changes in DNA, called mutations", "Cambios al azar en el ADN, llamados mutaciones"),
      [
        m("thinks-mutations-are-caused-by-need", "Animals choosing the traits they need", "Animales que eligen los rasgos que necesitan"),
        m("thinks-acquired-traits-inherited", "Exercise and practice during an animal's life", "El ejercicio y la práctica durante la vida de un animal"),
        m("thinks-selection-has-a-goal", "The environment telling genes what to become", "El ambiente que les dice a los genes en qué convertirse"),
      ],
      bi("These changes happen by chance, not because they are needed.", "Estos cambios ocurren por casualidad, no porque se necesiten."),
      bi("Mutations create new versions of genes by chance. Sexual reproduction then mixes those versions in new combinations.", "Las mutaciones crean nuevas versiones de los genes por casualidad. Luego la reproducción sexual mezcla esas versiones en combinaciones nuevas."),
    ),
    e(
      bi("Which of these is an adaptation?", "¿Cuál de estas es una adaptación?"),
      bi("A cactus's thick stem that stores water", "El tallo grueso de un cactus que guarda agua"),
      [
        m("thinks-learned-traits-inherited", "A dog learning to sit on command", "Un perro que aprende a sentarse cuando se lo piden"),
        m("thinks-acquired-traits-inherited", "A person getting a suntan after a summer at the beach", "Una persona que se broncea después de un verano en la playa"),
        m("confused-adaptation-with-change", "A tree losing a branch in a storm", "Un árbol que pierde una rama en una tormenta"),
      ],
      bi("An adaptation is an inherited trait that helps a species survive where it lives.", "Una adaptación es un rasgo heredado que ayuda a una especie a sobrevivir donde vive."),
      bi("A water-storing stem is inherited and helps cactuses survive dry deserts. Learned tricks, tans, and injuries are not passed to offspring.", "Un tallo que guarda agua se hereda y ayuda a los cactus a sobrevivir en desiertos secos. Los trucos aprendidos, el bronceado y las heridas no pasan a las crías."),
    ),
    e(
      bi(
        "For thousands of years, farmers planted seeds from the corn plants with the biggest ears. Today's corn has much bigger ears than its wild ancestor. What is this process called?",
        "Durante miles de años, los agricultores sembraron semillas de las plantas de maíz con las mazorcas más grandes. El maíz de hoy tiene mazorcas mucho más grandes que su ancestro silvestre. ¿Cómo se llama este proceso?",
      ),
      bi("Artificial selection", "Selección artificial"),
      [
        m("mixed-up-artificial-natural", "Natural selection", "Selección natural"),
        m("confused-with-genetic-engineering", "Genetic engineering in a lab", "Ingeniería genética en un laboratorio"),
        m("confused-variation-source", "Mutation", "Mutación"),
      ],
      bi("Who chose which plants got to reproduce?", "¿Quién eligió qué plantas se reproducían?"),
      bi("When people choose which organisms reproduce, it is artificial selection. In natural selection, the environment does the choosing.", "Cuando las personas eligen qué organismos se reproducen, es selección artificial. En la selección natural, el ambiente es el que elige."),
    ),
    e(
      bi("How does natural selection explain the long necks of giraffes?", "¿Cómo explica la selección natural el cuello largo de las jirafas?"),
      bi("Giraffes born with longer necks reached more food and had more young.", "Las jirafas de cuello más largo alcanzaban más alimento y tenían más crías."),
      [
        m("thinks-acquired-traits-inherited", "Each giraffe stretched its neck, and its young were born with longer necks.", "Cada jirafa estiró el cuello, y por eso sus crías nacieron con el cuello más largo."),
        m("thinks-selection-has-a-goal", "Giraffes grew long necks because they wanted to reach high leaves.", "Las jirafas desarrollaron el cuello largo porque querían alcanzar las hojas altas."),
        m("thinks-individuals-adapt", "Short-necked giraffes grew long necks during their lives.", "Las jirafas de cuello corto desarrollaron el cuello largo durante su vida."),
      ],
      bi("Stretching does not change the genes an animal passes on.", "Estirarse no cambia los genes que un animal transmite a sus crías."),
      bi("Neck length already varied. Giraffes with longer necks left more offspring, so over many generations the average neck got longer.", "El largo del cuello ya variaba. Las jirafas con el cuello más largo dejaron más crías, así que con muchas generaciones el cuello promedio se alargó."),
    ),
    e(
      bi("In biology, what does it mean for an organism to be fit?", "En biología, ¿qué significa que un organismo sea apto?"),
      bi("It survives and has offspring that carry its genes.", "Sobrevive y tiene crías que llevan sus genes."),
      [
        m("thinks-strongest-always-wins", "It is the strongest or the fastest animal in its group.", "Es el más fuerte o el más rápido de su grupo."),
        m("thinks-acquired-traits-inherited", "It exercises often.", "Hace ejercicio con frecuencia."),
        m("confuses-lifespan-with-fitness", "It lives the longest.", "Es el que vive más tiempo."),
      ],
      bi("In evolution, what counts is passing on genes.", "En la evolución, lo que cuenta es transmitir los genes a la siguiente generación."),
      bi("Fitness means reproductive success. A small, slow animal that leaves many offspring is more fit than a strong one that leaves none.", "La aptitud significa éxito reproductivo. Un animal pequeño y lento que deja muchas crías es más apto que uno fuerte que no deja ninguna."),
    ),
    e(
      bi("Which one evolves by natural selection?", "¿Qué es lo que evoluciona por selección natural?"),
      bi("A population, over many generations", "Una población, a lo largo de muchas generaciones"),
      [
        m("thinks-individuals-adapt", "An individual, during its lifetime", "Un individuo, durante su vida"),
        m("confuses-population-and-individual", "Each individual, in the same way as the population", "Cada individuo, de la misma forma que la población"),
        m("thinks-species-fixed", "Nothing; species never change", "Nada; las especies nunca cambian"),
      ],
      bi("An individual's genes stay the same for its whole life.", "Los genes de un individuo son los mismos durante toda su vida."),
      bi("Selection changes how common traits are in a population from one generation to the next. Individuals do not evolve.", "La selección cambia qué tan comunes son los rasgos en una población de una generación a la siguiente. Los individuos no evolucionan."),
    ),
    e(
      bi(
        "On one Galápagos island, a long drought left mostly large, hard seeds. In the next generation, the finches' average beak was deeper. Why?",
        "En una isla de las Galápagos, una larga sequía dejó sobre todo semillas grandes y duras. En la siguiente generación, el pico promedio de los pinzones era más grueso. ¿Por qué?",
      ),
      bi("Finches with deeper beaks cracked the hard seeds, survived, and passed deep beaks to their chicks.", "Los pinzones de pico grueso rompían las semillas duras, sobrevivieron y transmitieron ese pico a sus crías."),
      [
        m("thinks-acquired-traits-inherited", "Each finch's beak grew from cracking hard seeds, and its chicks were born with that bigger beak.", "El pico de cada pinzón creció de tanto romper semillas duras, y sus polluelos nacieron con ese pico más grande."),
        m("thinks-mutations-are-caused-by-need", "The drought caused mutations for bigger beaks.", "La sequía causó mutaciones para tener picos más grandes."),
        m("thinks-individuals-adapt", "Small-beaked finches changed their beaks to fit the seeds.", "Los pinzones de pico pequeño cambiaron su pico para adaptarlo a las semillas."),
      ],
      bi("Which finches could still eat during the drought?", "¿Qué pinzones todavía podían comer durante la sequía?"),
      bi("Beak size already varied. Birds that could eat the hard seeds survived the drought and had chicks with deep beaks like theirs.", "El tamaño del pico ya variaba. Las aves que podían comer las semillas duras sobrevivieron a la sequía y tuvieron polluelos con picos gruesos como los suyos."),
    ),
    e(
      bi(
        "Green and brown insects of the same species live on green leaves. Birds eat the insects they can see. After many generations, what is most likely?",
        "Insectos verdes y cafés de la misma especie viven sobre hojas verdes. Las aves se comen los insectos que pueden ver. Después de muchas generaciones, ¿qué es lo más probable?",
      ),
      bi("Most of the insects will be green.", "La mayoría de los insectos serán verdes."),
      [
        m("prediction-reversed", "Most of the insects will be brown.", "La mayoría de los insectos serán cafés."),
        m("thinks-individuals-adapt", "The brown insects will turn green during their lives.", "Los insectos cafés se volverán verdes durante su vida."),
        m("ignores-selection", "Half will be green and half brown, no matter what.", "La mitad serán verdes y la mitad cafés, pase lo que pase."),
      ],
      bi("Which insects are easier for a bird to spot on a green leaf?", "¿Qué insectos son más fáciles de ver para un ave sobre una hoja verde?"),
      bi("Brown insects stand out on green leaves and get eaten more. Green insects survive to reproduce, so green becomes more common.", "Los insectos cafés resaltan sobre las hojas verdes y se los comen más. Los verdes sobreviven para reproducirse, así que el verde se vuelve más común."),
    ),
    e(
      bi("Which of these is NOT needed for natural selection to happen?", "¿Cuál de estas NO es necesaria para que ocurra la selección natural?"),
      bi("Organisms trying to change their traits", "Que los organismos intenten cambiar sus rasgos"),
      [
        m("missed-requirement", "Variation in a trait within a population", "Variación en un rasgo dentro de una población"),
        m("missed-requirement", "Traits that can be inherited", "Rasgos que se puedan heredar"),
        m("missed-requirement", "More offspring than can survive", "Más crías de las que pueden sobrevivir"),
      ],
      bi("Natural selection needs variation, inheritance, and a struggle to survive.", "La selección natural necesita variación, herencia y una lucha por sobrevivir."),
      bi("Variation, inheritance, and competition to survive are all required. Effort to change does not alter an organism's genes.", "La variación, la herencia y la competencia por sobrevivir son necesarias. El esfuerzo por cambiar no altera los genes de un organismo."),
    ),
    e(
      bi("A farmer sprays the same insecticide every year, and each year it kills fewer insects. What is the best explanation?", "Un agricultor rocía el mismo insecticida cada año, y cada año mata menos insectos. ¿Cuál es la mejor explicación?"),
      bi("Insects that resisted it survived and passed resistance to their young.", "Los insectos resistentes sobrevivieron y transmitieron la resistencia a sus crías."),
      [
        m("thinks-individuals-adapt", "Each insect got used to the poison during its life.", "Cada insecto se acostumbró al veneno durante su vida."),
        m("ignores-selection", "The insecticide got weaker while it sat in storage.", "El insecticida se debilitó mientras estaba guardado."),
        m("thinks-learned-traits-inherited", "The insects learned to avoid the spray and then taught their young to avoid it too.", "Los insectos aprendieron a evitar el rociado y luego les enseñaron a sus crías a evitarlo."),
      ],
      bi("Each spraying removes the insects that cannot survive it.", "Cada rociado elimina a los insectos que no pueden sobrevivirlo."),
      bi("A few insects were resistant from the start. Spraying killed the others, so each year more of the population inherited resistance.", "Unos pocos insectos eran resistentes desde el principio. El rociado mató a los demás, así que cada año más de la población heredó la resistencia."),
    ),
    e(
      bi(
        "In the deserts of the Southwest, rock pocket mice with dark fur are common on dark lava rock, while light-colored mice are common on light sand. What best explains this?",
        "En los desiertos del suroeste, los ratones de bolsillo de pelaje oscuro son comunes sobre la roca volcánica oscura, y los de pelaje claro son comunes sobre la arena clara. ¿Qué lo explica mejor?",
      ),
      bi("Mice that blend in with the ground are less likely to be caught.", "Los ratones que se confunden con el suelo tienen menos probabilidad de que los atrapen."),
      [
        m("thinks-acquired-traits-inherited", "Mice darken their fur by rolling in lava dust, and their young are born dark.", "Los ratones oscurecen su pelaje revolcándose en polvo volcánico, y sus crías nacen oscuras."),
        m("thinks-mutations-are-caused-by-need", "The dark rock causes mutations for dark fur.", "La roca oscura causa mutaciones para tener pelaje oscuro."),
        m("thinks-individuals-adapt", "Each mouse changes its fur color to match where it lives.", "Cada ratón cambia el color de su pelaje para que combine con el lugar donde vive."),
      ],
      bi("Owls and hawks hunt by sight.", "Los búhos y los halcones cazan con la vista."),
      bi("Fur color is inherited and varies. On dark rock, dark mice are harder to see, so more survive to reproduce; on sand, light mice do better.", "El color del pelaje se hereda y varía. Sobre la roca oscura, los ratones oscuros son más difíciles de ver, así que más sobreviven para reproducirse; en la arena, a los claros les va mejor."),
    ),
  ],
};

// ── s.fossil.evidence ───────────────────────────────────────────────────────────────────────────

export const FOSSIL_EVIDENCE: Bank = {
  nudge: bi("What does this evidence show about how organisms are related or how life changed over time?", "¿Qué muestra esta evidencia sobre cómo se relacionan los organismos o cómo cambió la vida con el tiempo?"),
  strategy: bi(
    "Ask what each kind of evidence can tell you. Rock layers give an order in time. Body parts, embryos, and DNA can show how closely groups are related. A fossil with a mix of features can show a change in progress.",
    "Pregúntate qué puede decirte cada tipo de evidencia. Las capas de roca dan un orden en el tiempo. Las partes del cuerpo, los embriones y el ADN pueden mostrar qué tan emparentados están los grupos. Un fósil con una mezcla de rasgos puede mostrar un cambio en marcha.",
  ),
  seconds: 30,
  items: [
    e(
      bi("In undisturbed layers of sedimentary rock, where are the oldest fossils usually found?", "En capas de roca sedimentaria sin alterar, ¿dónde se encuentran normalmente los fósiles más antiguos?"),
      bi("In the bottom layers", "En las capas de abajo"),
      [
        m("layer-order-reversed", "In the top layers", "En las capas de arriba"),
        m("ignores-superposition", "In the middle layers", "En las capas del medio"),
        m("ignores-superposition", "Anywhere; the order of layers says nothing about age", "En cualquier lugar; el orden de las capas no dice nada sobre la edad"),
      ],
      bi("Each new layer settles on top of the ones already there.", "Cada capa nueva se deposita encima de las que ya estaban."),
      bi("Layers pile up over time, so the deepest undisturbed layers formed first and hold the oldest fossils.", "Las capas se acumulan con el tiempo, así que las más profundas sin alterar se formaron primero y tienen los fósiles más antiguos."),
    ),
    e(
      bi("What is the fossil record?", "¿Qué es el registro fósil?"),
      bi("All the fossils found so far, arranged by age", "Todos los fósiles encontrados hasta ahora, ordenados por edad"),
      [
        m("thinks-record-complete", "A complete list of every species that has ever lived on Earth", "Una lista completa de todas las especies que han existido en la Tierra"),
        m("too-narrow", "A single skeleton in a museum", "Un solo esqueleto en un museo"),
        m("too-narrow", "A record of dinosaurs only", "Un registro solo de dinosaurios"),
      ],
      bi("Think of it as a huge, unfinished library of life's history.", "Piénsalo como una biblioteca enorme y sin terminar sobre la historia de la vida."),
      bi("The fossil record is the collection of all known fossils, arranged by age. It is incomplete, but it shows patterns of change.", "El registro fósil es el conjunto de todos los fósiles conocidos, ordenados por edad. Está incompleto, pero muestra patrones de cambio."),
    ),
    e(
      bi("Why is the fossil record incomplete?", "¿Por qué el registro fósil está incompleto?"),
      bi("Most organisms decay or are eaten before they can be buried and fossilized.", "Casi todos los organismos se pudren o se los comen antes de quedar enterrados."),
      [
        m("thinks-record-complete", "It is not incomplete; every layer of rock has been dug up.", "No está incompleto; ya se excavaron todas las capas de roca."),
        m("wrong-fossil-conditions", "Only animals that lived in the last few thousand years can form any fossils.", "Solo los animales que vivieron en los últimos miles de años pueden formar fósiles."),
        m("misreads-evidence", "Scientists throw away fossils that do not fit.", "Los científicos tiran los fósiles que no encajan."),
      ],
      bi("Forming a fossil takes special conditions.", "Para que se forme un fósil se necesitan condiciones especiales."),
      bi("A fossil usually forms only when remains are buried quickly in sediment. Most remains rot, are eaten, or are later destroyed by erosion or heat.", "Un fósil casi siempre se forma solo cuando los restos quedan enterrados rápido en sedimento. La mayoría de los restos se pudren, se los comen o después los destruyen la erosión o el calor."),
    ),
    e(
      bi("Which organisms are most likely to become fossils?", "¿Qué organismos tienen más probabilidad de convertirse en fósiles?"),
      bi("Ones with shells or bones, buried quickly in mud", "Los de conchas o huesos que quedan enterrados rápido en lodo"),
      [
        m("wrong-fossil-conditions", "Soft jellyfish left on dry sand", "Medusas blandas que quedan sobre arena seca"),
        m("wrong-fossil-conditions", "Animals that died on a mountaintop in the open air", "Animales que murieron en la cima de una montaña al aire libre"),
        m("wrong-fossil-conditions", "Plants that burned in a forest fire", "Plantas que se quemaron en un incendio forestal"),
      ],
      bi("Fast burial protects remains from scavengers and decay.", "Quedar enterrado rápido protege los restos de los carroñeros y de la descomposición."),
      bi("Hard parts last longer, and quick burial in mud or sand keeps them from rotting or being eaten.", "Las partes duras duran más, y quedar enterradas rápido en lodo o arena evita que se pudran o se las coman."),
    ),
    e(
      bi(
        "A human arm, a bat wing, and a whale flipper have the same set of bones arranged in a similar way. What does this suggest?",
        "El brazo humano, el ala de un murciélago y la aleta de una ballena tienen el mismo conjunto de huesos ordenados de forma parecida. ¿Qué sugiere esto?",
      ),
      bi("These animals share a common ancestor.", "Estos animales comparten un ancestro común."),
      [
        m("function-not-ancestry", "These limbs all do the same job.", "Estas extremidades hacen todas el mismo trabajo."),
        m("confuses-similarity-with-identity", "These animals are the same species.", "Estos animales son de la misma especie."),
        m("ignores-evidence", "Bones always end up in this pattern by chance.", "Los huesos siempre terminan en este patrón por casualidad."),
      ],
      bi("The limbs do very different jobs, yet the bones match.", "Las extremidades hacen trabajos muy distintos y, aun así, los huesos coinciden."),
      bi("These are homologous structures: the same bones inherited from a shared ancestor, changed over time for walking, flying, or swimming.", "Son estructuras homólogas: los mismos huesos heredados de un ancestro común, que cambiaron con el tiempo para caminar, volar o nadar."),
    ),
    e(
      bi(
        "A bird's wing and a butterfly's wing both help with flying, but they are built in completely different ways. What are they called?",
        "El ala de un ave y el ala de una mariposa sirven para volar, pero están construidas de formas completamente distintas. ¿Cómo se llaman?",
      ),
      bi("Analogous structures", "Estructuras análogas"),
      [
        m("homologous-analogous-mixup", "Homologous structures", "Estructuras homólogas"),
        m("vestigial-mixup", "Vestigial structures", "Estructuras vestigiales"),
        m("confuses-similarity-with-identity", "Identical structures", "Estructuras idénticas"),
      ],
      bi("Same job, different build, no shared wing ancestor.", "Mismo trabajo, distinta construcción, sin un ancestro común con alas."),
      bi("Analogous structures do the same job but evolved separately. Homologous structures share an origin even when their jobs differ.", "Las estructuras análogas hacen el mismo trabajo pero evolucionaron por separado. Las homólogas tienen un mismo origen aunque hagan trabajos distintos."),
    ),
    e(
      bi("Whales have small hip bones that do not help them swim. What is the best explanation?", "Las ballenas tienen pequeños huesos de cadera que no les ayudan a nadar. ¿Cuál es la mejor explicación?"),
      bi("Whales evolved from ancestors that walked on land.", "Las ballenas evolucionaron de ancestros que caminaban en tierra."),
      [
        m("thinks-selection-has-a-goal", "The hip bones will grow into legs again in the future.", "Los huesos de la cadera volverán a convertirse en patas en el futuro."),
        m("function-not-ancestry", "Whales use the bones to walk on the sea floor.", "Las ballenas usan esos huesos para caminar en el fondo del mar."),
        m("ignores-evidence", "The bones come from fish the whales ate.", "Los huesos vienen de los peces que comieron las ballenas."),
      ],
      bi("A body part left over from ancestors is called vestigial.", "Una parte del cuerpo que quedó de los ancestros se llama vestigial."),
      bi("Fossils show early whale relatives with four legs. Over millions of years the hind legs shrank, leaving small hip bones.", "Los fósiles muestran parientes antiguos de las ballenas con cuatro patas. A lo largo de millones de años las patas traseras se redujeron y quedaron pequeños huesos de cadera."),
    ),
    e(
      bi(
        "Tiktaalik lived about 375 million years ago. It had gills and scales like a fish, but also a neck and sturdy fins with wrist-like bones. Why is this fossil important?",
        "Tiktaalik vivió hace unos 375 millones de años. Tenía branquias y escamas como un pez, pero también cuello y aletas fuertes con huesos parecidos a una muñeca. ¿Por qué es importante este fósil?",
      ),
      bi("It shows features in between fish and four-legged land animals.", "Tiene rasgos intermedios entre peces y animales terrestres de cuatro patas."),
      [
        m("misreads-evidence", "It proves fish never lived in water.", "Demuestra que los peces nunca vivieron en el agua."),
        m("misreads-evidence", "It was the first animal that ever lived.", "Fue el primer animal que existió."),
        m("confuses-fossil-age", "It is a kind of fish that is still common in rivers and lakes today.", "Es un tipo de pez que todavía es muy común hoy en los ríos y los lagos de agua dulce."),
      ],
      bi("Look at the mix of fish features and land-animal features.", "Fíjate en la mezcla de rasgos de pez y rasgos de animal terrestre."),
      bi("Tiktaalik is a transitional fossil: it combines fish traits with traits of the first four-legged animals.", "Tiktaalik es un fósil de transición: combina rasgos de pez con rasgos de los primeros animales de cuatro patas."),
    ),
    e(
      bi(
        "Archaeopteryx had feathers and wings like a bird, but also teeth, claws on its wings, and a long bony tail like a small dinosaur. What does it show?",
        "Archaeopteryx tenía plumas y alas como un ave, pero también dientes, garras en las alas y una cola larga con huesos como un dinosaurio pequeño. ¿Qué muestra?",
      ),
      bi("A link between dinosaurs and birds", "Un vínculo entre los dinosaurios y las aves"),
      [
        m("misreads-evidence", "That birds came before all reptiles", "Que las aves aparecieron antes que todos los reptiles"),
        m("ignores-evidence", "That dinosaurs and birds are not related", "Que los dinosaurios y las aves no están emparentados"),
        m("misreads-evidence", "That feathers first appeared on bats", "Que las plumas aparecieron primero en los murciélagos"),
      ],
      bi("It has some bird features and some dinosaur features.", "Tiene algunos rasgos de ave y otros de dinosaurio."),
      bi("Archaeopteryx mixes bird and dinosaur traits, which supports the idea that birds evolved from small feathered dinosaurs.", "Archaeopteryx mezcla rasgos de ave y de dinosaurio, lo que apoya la idea de que las aves evolucionaron de dinosaurios pequeños con plumas."),
    ),
    e(
      bi(
        "Early embryos of fish, chickens, and humans all have similar pouches in the neck area and a tail. What does this suggest?",
        "Los embriones tempranos de peces, pollos y humanos tienen bolsas parecidas en la zona del cuello y una cola. ¿Qué sugiere esto?",
      ),
      bi("They share a common ancestor.", "Comparten un ancestro común."),
      [
        m("misreads-evidence", "Human embryos breathe underwater with gills.", "Los embriones humanos respiran bajo el agua con branquias."),
        m("confuses-similarity-with-identity", "All three are really fish.", "Los tres son en realidad peces."),
        m("ignores-evidence", "Embryos copy the animals around them.", "Los embriones copian a los animales que los rodean."),
      ],
      bi("Similar early development points to shared genes.", "Un desarrollo temprano parecido indica genes compartidos."),
      bi("Shared features in early embryos come from genes inherited from a common ancestor. The features develop differently later.", "Los rasgos compartidos de los embriones tempranos vienen de genes heredados de un ancestro común. Después esos rasgos se desarrollan de forma distinta."),
    ),
    e(
      bi(
        "DNA comparisons show that humans share much more DNA with chimpanzees than with mice. What does this suggest?",
        "Las comparaciones de ADN muestran que los humanos comparten mucho más ADN con los chimpancés que con los ratones. ¿Qué sugiere esto?",
      ),
      bi("Humans and chimpanzees share a more recent common ancestor.", "Los humanos y los chimpancés comparten un ancestro común más reciente."),
      [
        m("thinks-living-species-are-ancestors", "Humans evolved from modern chimpanzees.", "Los humanos evolucionaron de los chimpancés actuales."),
        m("ignores-evidence", "Mice are not related to humans at all.", "Los ratones no están emparentados con los humanos en absoluto."),
        m("ignores-evidence", "DNA tells us nothing about how closely species are related.", "El ADN no dice nada sobre qué tan cerca están emparentadas las especies."),
      ],
      bi("The more DNA two species share, the more recently their lines split.", "Cuanto más ADN comparten dos especies, más recientemente se separaron sus linajes."),
      bi("Humans and chimpanzees are cousins, not ancestor and descendant. Their lines split more recently than the line leading to mice.", "Los humanos y los chimpancés son primos, no ancestro y descendiente. Sus linajes se separaron más recientemente que el linaje de los ratones."),
    ),
    e(
      bi(
        "In a cliff, the lower layers hold fossils of only simple sea animals, and higher layers hold more kinds of organisms, including land plants. What does this pattern show?",
        "En un acantilado, las capas de abajo tienen fósiles solo de animales marinos simples, y las capas de arriba tienen más tipos de organismos, incluso plantas terrestres. ¿Qué muestra este patrón?",
      ),
      bi("Life changed over time, from simpler forms to more varied ones.", "La vida cambió con el tiempo, de formas más simples a formas más variadas."),
      [
        m("ignores-superposition", "All of these organisms lived at the same time.", "Todos estos organismos vivieron al mismo tiempo."),
        m("layer-order-reversed", "The land plants in the higher layers are older than the sea animals.", "Las plantas terrestres de las capas de arriba son más antiguas que los animales marinos."),
        m("ignores-evidence", "Fossils tell nothing about the past.", "Los fósiles no dicen nada sobre el pasado."),
      ],
      bi("Remember which layers are older.", "Recuerda qué capas son más antiguas."),
      bi("Lower layers are older, so the simple sea animals came first and more varied life appeared later.", "Las capas de abajo son más antiguas, así que los animales marinos simples aparecieron primero y la vida más variada después."),
    ),
    e(
      bi(
        "Trilobite fossils are common in very old rock layers, but none are found in younger layers, and none live today. What does this tell you?",
        "Los fósiles de trilobites son comunes en capas de roca muy antiguas, pero no aparecen en capas más jóvenes ni viven hoy. ¿Qué te dice esto?",
      ),
      bi("Trilobites went extinct.", "Los trilobites se extinguieron."),
      [
        m("ignores-evidence", "Trilobites are still common in today's oceans.", "Los trilobites todavía son comunes en los océanos de hoy."),
        m("layer-order-reversed", "Trilobites lived only recently.", "Los trilobites vivieron solo hace poco."),
        m("wrong-fossil-conditions", "Trilobites turned into rock while they were alive.", "Los trilobites se convirtieron en roca mientras estaban vivos."),
      ],
      bi("Think about what it means when a group disappears from all younger layers.", "Piensa en qué significa que un grupo desaparezca de todas las capas más jóvenes."),
      bi("A group found only in older layers and not alive today has died out. Trilobites vanished in a mass extinction about 252 million years ago.", "Un grupo que solo aparece en capas antiguas y no vive hoy se extinguió. Los trilobites desaparecieron en una extinción masiva hace unos 252 millones de años."),
    ),
    e(
      bi(
        "Fossils show whale relatives with four legs, then later forms with smaller back legs, then whales with only tiny hip bones. What does this sequence show?",
        "Los fósiles muestran parientes de las ballenas con cuatro patas, luego formas más recientes con patas traseras más pequeñas y luego ballenas con solo pequeños huesos de cadera. ¿Qué muestra esta secuencia?",
      ),
      bi("Whales changed gradually from ancestors that lived on land.", "Las ballenas cambiaron poco a poco a partir de ancestros que vivían en tierra."),
      [
        m("layer-order-reversed", "Land animals evolved from whales.", "Los animales terrestres evolucionaron de las ballenas."),
        m("thinks-individuals-adapt", "Each whale lost its legs during its own lifetime as it swam more.", "Cada ballena perdió sus patas durante su propia vida a medida que nadaba más."),
        m("ignores-superposition", "All of these animals lived at the same time.", "Todos estos animales vivieron al mismo tiempo."),
      ],
      bi("The fossils are in order from older to younger.", "Los fósiles están ordenados de más antiguos a más jóvenes."),
      bi("The sequence of fossils, from oldest to youngest, shows legs shrinking over many generations as whale ancestors moved into the water.", "La secuencia de fósiles, de la más antigua a la más joven, muestra cómo las patas se redujeron a lo largo de muchas generaciones cuando los ancestros de las ballenas pasaron al agua."),
    ),
  ],
};

// ── s.geologic.time ─────────────────────────────────────────────────────────────────────────────

const MESOZOIC = bi("The Mesozoic Era", "La era Mesozoica");
const CENOZOIC = bi("The Cenozoic Era", "La era Cenozoica");
const PALEOZOIC = bi("The Paleozoic Era", "La era Paleozoica");
const PRECAMBRIAN = bi("Precambrian time", "El Precámbrico");

export const GEOLOGIC_TIME: Bank = {
  nudge: bi("Is this about the order of events, or about how long ago something happened?", "¿Se trata del orden de los sucesos o de cuánto tiempo hace que ocurrió algo?"),
  strategy: bi(
    "Put the events in order on one timeline before you choose, and check the size of each number by counting its zeros. For rock layers, ask which one had to form first.",
    "Antes de elegir, ordena los sucesos en una línea del tiempo y revisa el tamaño de cada número contando sus ceros. En las capas de roca, pregúntate cuál tuvo que formarse primero.",
  ),
  seconds: 30,
  items: [
    e(
      bi("About how old is Earth?", "¿Aproximadamente cuántos años tiene la Tierra?"),
      bi("About 4.5 billion years", "Unos 4,500 millones de años"),
      [
        m("million-billion-mixup", "About 4.5 million years", "Unos 4.5 millones de años"),
        m("confused-with-dinosaur-extinction", "About 66 million years", "Unos 66 millones de años"),
        m("confused-with-universe-age", "About 13.8 billion years", "Unos 13,800 millones de años"),
      ],
      bi("Meteorites and the oldest minerals on Earth were dated with radioactive elements.", "Los meteoritos y los minerales más antiguos de la Tierra se fecharon con elementos radiactivos."),
      bi("Radiometric dating gives Earth an age of about 4.5 billion years. About 13.8 billion years is the age of the universe.", "La datación radiométrica le da a la Tierra una edad de unos 4,500 millones de años. Unos 13,800 millones de años es la edad del universo."),
    ),
    e(
      bi("Which of these happened most recently?", "¿Cuál de estos sucesos ocurrió más recientemente?"),
      bi("Modern humans appeared.", "Aparecieron los seres humanos modernos."),
      [
        m("order-of-events-mixup", "The last non-bird dinosaurs died out.", "Se extinguieron los últimos dinosaurios no avianos."),
        m("order-of-events-mixup", "The first land plants appeared.", "Aparecieron las primeras plantas terrestres."),
        m("order-of-events-mixup", "The first fish appeared.", "Aparecieron los primeros peces."),
      ],
      bi("Put them in order: fish, land plants, the end of the dinosaurs, then one more.", "Ponlos en orden: peces, plantas terrestres, el fin de los dinosaurios y luego uno más."),
      bi("The first fish came about 500 million years ago, land plants soon after, the dinosaurs died out 66 million years ago, and modern humans appeared about 300,000 years ago.", "Los primeros peces aparecieron hace unos 500 millones de años, las plantas terrestres poco después, los dinosaurios se extinguieron hace 66 millones de años y los humanos modernos aparecieron hace unos 300,000 años."),
    ),
    e(
      bi("About when did the non-bird dinosaurs die out?", "¿Aproximadamente cuándo se extinguieron los dinosaurios no avianos?"),
      bi("About 66 million years ago", "Hace unos 66 millones de años"),
      [
        m("thousand-million-mixup", "About 66 thousand years ago", "Hace unos 66 mil años"),
        m("confused-with-earth-age", "About 4.5 billion years ago", "Hace unos 4,500 millones de años"),
        m("order-of-magnitude-slip", "About 660 million years ago", "Hace unos 660 millones de años"),
      ],
      bi("It marks the end of the Mesozoic Era.", "Marca el final de la era Mesozoica."),
      bi("The non-bird dinosaurs died out about 66 million years ago, at the end of the Cretaceous Period. Birds are the dinosaur line that survived.", "Los dinosaurios no avianos se extinguieron hace unos 66 millones de años, al final del período Cretácico. Las aves son el linaje de dinosaurios que sobrevivió."),
    ),
    e(
      bi("What was the main cause of the mass extinction that ended the age of dinosaurs?", "¿Cuál fue la causa principal de la extinción masiva que terminó la era de los dinosaurios?"),
      bi("A large asteroid striking Earth", "Un asteroide grande que chocó contra la Tierra"),
      [
        m("humans-and-dinosaurs-together", "Early humans hunting them", "Los primeros humanos que los cazaban"),
        m("invented-cause", "The Moon moving much closer to Earth", "La Luna que se acercó mucho a la Tierra"),
      ],
      bi("A huge crater near Mexico's Yucatán Peninsula is about 66 million years old.", "Un cráter enorme cerca de la península de Yucatán, en México, tiene unos 66 millones de años."),
      bi("The Chicxulub crater and a worldwide layer rich in iridium, an element common in asteroids, point to an asteroid impact.", "El cráter de Chicxulub y una capa rica en iridio en todo el mundo, un elemento común en los asteroides, indican el impacto de un asteroide."),
    ),
    e(
      bi("Did people and non-bird dinosaurs ever live at the same time?", "¿Las personas y los dinosaurios no avianos vivieron alguna vez al mismo tiempo?"),
      bi("No; they died out about 66 million years before people appeared.", "No; se extinguieron unos 66 millones de años antes de que aparecieran las personas."),
      [
        m("humans-and-dinosaurs-together", "Yes; early people hunted dinosaurs.", "Sí; las primeras personas cazaban dinosaurios."),
        m("humans-and-dinosaurs-together", "Yes, but only in a few places where both survived for a long time.", "Sí, pero solo en algunos lugares donde los dos lograron sobrevivir durante mucho tiempo."),
      ],
      bi("Compare 66 million years with about 300,000 years.", "Compara 66 millones de años con unos 300,000 años."),
      bi("Rock layers with dinosaur fossils are tens of millions of years older than any layers with human fossils.", "Las capas de roca con fósiles de dinosaurios son decenas de millones de años más antiguas que cualquier capa con fósiles humanos."),
    ),
    e(
      bi("Geologists divide Earth's history into eons, eras, periods, and epochs. What are these divisions mostly based on?", "Los geólogos dividen la historia de la Tierra en eones, eras, períodos y épocas. ¿En qué se basan sobre todo estas divisiones?"),
      bi("Big changes in the fossil record, such as mass extinctions", "Grandes cambios en el registro fósil, como las extinciones masivas"),
      [
        m("thinks-units-are-equal", "Equal blocks of time, each exactly one million years long", "Bloques iguales de tiempo, cada uno de exactamente un millón de años"),
        m("confused-with-human-history", "The reigns of ancient kings", "Los reinados de reyes antiguos"),
        m("invented-cause", "Changes in the length of a year", "Cambios en la duración de un año"),
      ],
      bi("The boundaries are where life on Earth changed sharply.", "Los límites están donde la vida en la Tierra cambió de forma brusca."),
      bi("The time scale is divided at big changes in fossils and rocks, so its units have very different lengths.", "La escala del tiempo se divide en los grandes cambios de los fósiles y las rocas, así que sus unidades tienen duraciones muy distintas."),
    ),
    e(
      bi("Which era is often called the Age of Dinosaurs?", "¿Qué era suele llamarse la era de los dinosaurios?"),
      MESOZOIC,
      [mx("era-mixup", CENOZOIC), mx("era-mixup", PALEOZOIC), mx("era-mixup", PRECAMBRIAN)],
      bi("It includes the Triassic, Jurassic, and Cretaceous Periods.", "Incluye los períodos Triásico, Jurásico y Cretácico."),
      bi("The Mesozoic Era, about 252 to 66 million years ago, was when dinosaurs were the main large land animals.", "La era Mesozoica, de hace unos 252 a 66 millones de años, fue cuando los dinosaurios eran los principales animales terrestres grandes."),
    ),
    e(
      bi("Which era do we live in now?", "¿En qué era vivimos ahora?"),
      CENOZOIC,
      [mx("era-mixup", MESOZOIC), mx("era-mixup", PALEOZOIC), mx("era-mixup", PRECAMBRIAN)],
      bi("It began right after the dinosaurs died out.", "Empezó justo después de que se extinguieron los dinosaurios."),
      bi("The Cenozoic Era began about 66 million years ago and continues today. It is sometimes called the Age of Mammals.", "La era Cenozoica empezó hace unos 66 millones de años y continúa hoy. A veces se le llama la era de los mamíferos."),
    ),
    e(
      bi("For most of Earth's history, all life was single-celled. When did the first single-celled life appear?", "Durante la mayor parte de la historia de la Tierra, toda la vida fue unicelular. ¿Cuándo apareció la primera vida unicelular?"),
      bi("At least 3.5 billion years ago", "Hace al menos 3,500 millones de años"),
      [
        m("confused-with-cambrian", "About 540 million years ago, in the Cambrian", "Hace unos 540 millones de años, en el Cámbrico"),
        m("thousand-million-mixup", "About 10,000 years ago", "Hace unos 10,000 años"),
        m("confused-with-dinosaur-extinction", "About 66 million years ago", "Hace unos 66 millones de años"),
      ],
      bi("Layered rocks built by ancient microbes, called stromatolites, are among the oldest fossils.", "Las rocas en capas formadas por microbios antiguos, llamadas estromatolitos, están entre los fósiles más antiguos."),
      bi("Fossil microbes and stromatolites show that life existed at least 3.5 billion years ago, long before animals appeared.", "Los microbios fósiles y los estromatolitos muestran que la vida existía hace al menos 3,500 millones de años, mucho antes de que aparecieran los animales."),
    ),
    e(
      bi("Why are index fossils useful to geologists?", "¿Por qué los fósiles guía son útiles para los geólogos?"),
      bi("They lived for a short time over a wide area.", "Vivieron poco tiempo en una zona amplia."),
      [
        m("misreads-evidence", "They are always the largest fossils.", "Siempre son los fósiles más grandes."),
        m("index-fossil-mixup", "They are found in every layer of rock, old and young.", "Se encuentran en todas las capas de roca, antiguas y jóvenes."),
        m("misreads-evidence", "They show exactly how an animal died.", "Muestran exactamente cómo murió un animal."),
      ],
      bi("A fossil found everywhere but only for a short time works like a time stamp.", "Un fósil que está en todas partes pero solo durante poco tiempo funciona como un sello de fecha."),
      bi("If two distant rock layers hold the same index fossil, they formed at about the same time.", "Si dos capas de roca lejanas tienen el mismo fósil guía, se formaron más o menos al mismo tiempo."),
    ),
    e(
      bi("A band of igneous rock cuts straight up through several layers of sedimentary rock. Which is older?", "Una franja de roca ígnea atraviesa de abajo hacia arriba varias capas de roca sedimentaria. ¿Qué es más antiguo?"),
      bi("The sedimentary layers that were cut", "Las capas sedimentarias que fueron atravesadas"),
      [
        m("cross-cutting-reversed", "The igneous rock that cuts up through them", "La roca ígnea que las atraviesa de abajo hacia arriba"),
        m("ignores-cross-cutting", "They must be the same age", "Deben tener la misma edad"),
      ],
      bi("Something has to exist before it can be cut.", "Algo tiene que existir antes de que lo puedan atravesar."),
      bi("Magma pushed into layers that were already there, so the cut layers are older than the igneous rock.", "El magma se metió en capas que ya existían, así que las capas atravesadas son más antiguas que la roca ígnea."),
    ),
    e(
      bi("How do scientists find the age of some rocks in years?", "¿Cómo encuentran los científicos la edad en años de algunas rocas?"),
      bi("By measuring how much of a radioactive element has decayed", "Midiendo cuánto de un elemento radiactivo se ha desintegrado"),
      [
        m("invented-method", "By weighing the rocks", "Pesando las rocas"),
        m("invented-method", "By looking at the rocks' color", "Observando el color de las rocas"),
        m("relative-absolute-mixup", "By checking whether the rock is above or below another layer", "Revisando si la roca está arriba o abajo de otra capa de roca"),
      ],
      bi("Radioactive elements decay at a steady, known rate.", "Los elementos radiactivos se desintegran a un ritmo constante y conocido."),
      bi("Radiometric dating compares the amount of a radioactive element with the amount of what it decays into. Layer order gives only relative age.", "La datación radiométrica compara la cantidad de un elemento radiactivo con la cantidad de lo que produce al desintegrarse. El orden de las capas solo da la edad relativa."),
    ),
    e(
      bi("If all of Earth's history were squeezed into one calendar year, when would our species appear?", "Si toda la historia de la Tierra cupiera en un año calendario, ¿cuándo aparecería nuestra especie?"),
      bi("In the last hour of December 31", "En la última hora del 31 de diciembre"),
      [
        m("overestimates-human-time", "In early July", "A principios de julio"),
        m("overestimates-human-time", "In late December, around when the dinosaurs died out", "A fines de diciembre, más o menos cuando se extinguieron los dinosaurios"),
        m("order-of-events-mixup", "On January 1", "El 1 de enero"),
      ],
      bi("300,000 years is a tiny part of 4.5 billion years.", "300,000 años son una parte diminuta de 4,500 millones de años."),
      bi("On that calendar each day is about 12 million years. The dinosaurs die out around December 26, and our species shows up about half an hour before midnight on December 31.", "En ese calendario cada día equivale a unos 12 millones de años. Los dinosaurios se extinguen alrededor del 26 de diciembre, y nuestra especie aparece una media hora antes de la medianoche del 31 de diciembre."),
    ),
    e(
      bi("The walls of the Grand Canyon show many rock layers. What can geologists say about the layers near the bottom?", "Las paredes del Gran Cañón muestran muchas capas de roca. ¿Qué pueden decir los geólogos sobre las capas cercanas al fondo?"),
      bi("They are the oldest layers showing in the canyon.", "Son las capas más antiguas que se ven en el cañón."),
      [
        m("layer-order-reversed", "They are the youngest layers.", "Son las capas más jóvenes."),
        m("ignores-superposition", "They formed at the same time as the top layers.", "Se formaron al mismo tiempo que las capas de arriba."),
        m("misreads-evidence", "They formed after the river cut the canyon.", "Se formaron después de que el río excavó el cañón."),
      ],
      bi("The layers formed long before the river cut down through them.", "Las capas se formaron mucho antes de que el río las cortara."),
      bi("The layers were laid down one on top of another, so the bottom ones are oldest. The river later cut through them, exposing the record.", "Las capas se depositaron una encima de otra, así que las de abajo son las más antiguas. Después el río las cortó y dejó al descubierto el registro."),
    ),
  ],
};
