import { bi, e, m, type Bank } from "./shared";

// Grade 8 banks: gravity and orbits (s.gravity.orbits), human impact on climate (s.climate.impact), and
// waves carrying information, analog and digital (s.waves.info).

// ── s.gravity.orbits ────────────────────────────────────────────────────────────────────────────

export const GRAVITY_ORBITS: Bank = {
  nudge: bi("Which objects are pulling on each other here, and how massive and how far apart are they?", "¿Qué objetos se atraen aquí, y qué tanta masa tienen y qué tan lejos están?"),
  strategy: bi(
    "Every object with mass pulls on every other one. The pull is stronger when the masses are bigger and weaker when the objects are farther apart. An orbit is a moving object that keeps falling around a more massive one instead of flying off in a straight line.",
    "Todo objeto con masa atrae a todos los demás. La atracción es más fuerte cuando las masas son más grandes y más débil cuando los objetos están más lejos. Una órbita es un objeto en movimiento que sigue cayendo alrededor de otro con más masa en lugar de salir disparado en línea recta.",
  ),
  seconds: 25,
  items: [
    e(
      bi("What keeps the Moon in orbit around Earth?", "¿Qué mantiene a la Luna en órbita alrededor de la Tierra?"),
      bi("Earth's gravity pulling on the Moon as it moves", "La gravedad de la Tierra que jala a la Luna mientras se mueve"),
      [
        m("thinks-no-gravity-in-space", "Nothing; there is no gravity in space", "Nada; en el espacio no hay gravedad"),
        m("thinks-orbits-need-push", "A force from the Moon pushing itself forward", "Una fuerza de la Luna que se empuja a sí misma hacia adelante"),
        m("magnetism-gravity-mixup", "Earth's magnetic field", "El campo magnético de la Tierra"),
      ],
      bi("Without a pull toward Earth, the Moon would travel in a straight line.", "Sin una atracción hacia la Tierra, la Luna viajaría en línea recta."),
      bi("The Moon is moving sideways, and Earth's gravity keeps bending its path into a curve around Earth.", "La Luna se mueve de lado, y la gravedad de la Tierra curva su camino continuamente alrededor de la Tierra."),
    ),
    e(
      bi("Which two things affect the strength of gravity between two objects?", "¿Qué dos cosas afectan la fuerza de gravedad entre dos objetos?"),
      bi("Their masses and the distance between them", "Sus masas y la distancia entre ellos"),
      [
        m("irrelevant-property", "Their colors and shapes", "Sus colores y formas"),
        m("irrelevant-property", "Their speeds and temperatures", "Sus rapideces y temperaturas"),
        m("size-mass-mixup", "Only their sizes", "Solo sus tamaños"),
      ],
      bi("A big balloon and a small iron ball show that size alone is not what counts.", "Un globo grande y una bola de hierro pequeña muestran que el tamaño solo no es lo que cuenta."),
      bi("Gravity grows with the masses of the objects and gets weaker as they move apart.", "La gravedad aumenta con las masas de los objetos y se debilita cuando se alejan."),
    ),
    e(
      bi("Two objects move farther apart. What happens to the gravitational force between them?", "Dos objetos se alejan más uno del otro. ¿Qué le pasa a la fuerza de gravedad entre ellos?"),
      bi("It gets weaker.", "Se vuelve más débil."),
      [m("distance-effect-reversed", "It gets stronger.", "Se vuelve más fuerte."), m("ignores-distance", "It stays the same.", "Se queda igual.")],
      bi("Think of how much weaker the Sun's pull is on far-off Neptune than on Earth.", "Piensa en qué tan débil es la atracción del Sol sobre Neptuno, que está lejísimos, comparada con la que ejerce sobre la Tierra."),
      bi("Gravity weakens with distance: twice as far gives one fourth of the pull.", "La gravedad se debilita con la distancia: al doble de distancia, la atracción es la cuarta parte."),
    ),
    e(
      bi("Why do astronauts float inside the International Space Station?", "¿Por qué flotan los astronautas dentro de la Estación Espacial Internacional?"),
      bi("They and the station are falling around Earth together.", "Ellos y la estación caen juntos alrededor de la Tierra."),
      [
        m("thinks-no-gravity-in-space", "There is no gravity in space.", "En el espacio no hay gravedad."),
        m("thinks-no-gravity-in-space", "They are too far from Earth to feel its gravity.", "Están demasiado lejos de la Tierra para sentir su gravedad."),
        m("invented-cause", "The air in the station holds them up.", "El aire de la estación los sostiene."),
      ],
      bi("At the station's height, Earth's gravity is still about 90% as strong as on the ground.", "A la altura de la estación, la gravedad de la Tierra todavía es cerca del 90% de la que hay en el suelo."),
      bi("The station is in free fall around Earth, moving sideways fast enough to keep missing it. Everything inside falls at the same rate, so it floats.", "La estación está en caída libre alrededor de la Tierra y se mueve de lado tan rápido que nunca la alcanza. Todo lo que hay adentro cae al mismo ritmo, así que flota."),
    ),
    e(
      bi("A person would weigh about 2.5 times as much on Jupiter's cloud tops as on Earth. Why?", "Una persona pesaría unas 2.5 veces más en la parte alta de las nubes de Júpiter que en la Tierra. ¿Por qué?"),
      bi("Jupiter has much more mass than Earth.", "Júpiter tiene mucha más masa que la Tierra."),
      [
        m("irrelevant-property", "Jupiter is closer to the Sun.", "Júpiter está más cerca del Sol."),
        m("irrelevant-property", "Jupiter spins faster.", "Júpiter gira más rápido."),
        m("mass-weight-mixup", "The person's mass would grow on Jupiter.", "La masa de la persona aumentaría en Júpiter."),
      ],
      bi("Weight is the pull of a planet's gravity on you.", "El peso es la atracción de la gravedad de un planeta sobre ti."),
      bi("Jupiter's huge mass gives it a stronger pull at its cloud tops. The person's mass stays the same; only the weight changes.", "La enorme masa de Júpiter le da una atracción más fuerte en la parte alta de sus nubes. La masa de la persona no cambia; solo cambia el peso."),
    ),
    e(
      bi("An astronaut has a mass of 70 kg on Earth. What is her mass on the Moon?", "Una astronauta tiene una masa de 70 kg en la Tierra. ¿Cuál es su masa en la Luna?"),
      bi("Still 70 kg; only her weight changes", "Siguen siendo 70 kg; solo cambia su peso"),
      [
        m("mass-weight-mixup", "About one sixth as much, near 12 kg", "Cerca de la sexta parte, unos 12 kg"),
        m("thinks-no-gravity-in-space", "Zero, because the Moon has no gravity", "Cero, porque la Luna no tiene gravedad"),
        m("mass-weight-mixup", "More than 70 kg, because the Moon is smaller", "Más de 70 kg, porque la Luna es más pequeña"),
      ],
      bi("Mass is the amount of matter in her body.", "La masa es la cantidad de materia en su cuerpo."),
      bi("Mass does not depend on where you are. On the Moon her weight is about one sixth of her Earth weight, but her mass is still 70 kg.", "La masa no depende de dónde estés. En la Luna su peso es cerca de la sexta parte de su peso en la Tierra, pero su masa sigue siendo de 70 kg."),
    ),
    e(
      bi("What keeps the planets moving in orbits around the Sun?", "¿Qué mantiene a los planetas en órbita alrededor del Sol?"),
      bi("The Sun's gravity", "La gravedad del Sol"),
      [
        m("earth-centered-thinking", "Earth's gravity", "La gravedad de la Tierra"),
        m("invented-cause", "Sunlight pushing on them", "La luz del Sol que los empuja"),
        m("magnetism-gravity-mixup", "The Sun's magnetism", "El magnetismo del Sol"),
      ],
      bi("Which object in the solar system has by far the most mass?", "¿Qué objeto del sistema solar tiene, por mucho, la mayor masa?"),
      bi("The Sun holds about 99.8% of the solar system's mass, and its gravity bends every planet's path into an orbit.", "El Sol tiene cerca del 99.8% de la masa del sistema solar, y su gravedad curva el camino de cada planeta hasta formar una órbita."),
    ),
    e(
      bi("If the Sun's gravity suddenly disappeared, what would Earth do?", "Si la gravedad del Sol desapareciera de pronto, ¿qué haría la Tierra?"),
      bi("Move off in a straight line", "Seguiría en línea recta"),
      [
        m("orbit-misconception", "Fall into the Sun", "Caería hacia el Sol"),
        m("thinks-orbits-need-push", "Stop moving", "Dejaría de moverse"),
        m("orbit-misconception", "Keep circling the Sun as before", "Seguiría girando alrededor del Sol como antes"),
      ],
      bi("A moving object keeps going straight unless a force changes its path.", "Un objeto en movimiento sigue en línea recta a menos que una fuerza cambie su camino."),
      bi("Earth is already moving fast. Without the Sun's pull to curve its path, it would keep going in a straight line.", "La Tierra ya se mueve rápido. Sin la atracción del Sol que curva su camino, seguiría en línea recta."),
    ),
    e(
      bi("What causes most of the ocean tides on Earth?", "¿Qué causa la mayor parte de las mareas del océano en la Tierra?"),
      bi("The Moon's gravity pulling on Earth and its oceans", "La gravedad de la Luna que atrae a la Tierra y a sus océanos"),
      [
        m("invented-cause", "Wind blowing across the ocean", "El viento que sopla sobre el océano"),
        m("magnetism-gravity-mixup", "Earth's magnetic field", "El campo magnético de la Tierra"),
        m("invented-cause", "The Sun heating the water", "El Sol que calienta el agua"),
      ],
      bi("High tides come about every 12 hours and follow the Moon across the sky.", "Las mareas altas llegan cada 12 horas, más o menos, y siguen a la Luna en el cielo."),
      bi("The Moon pulls harder on the side of Earth closer to it, making bulges of water. The Sun's gravity adds a smaller effect.", "La Luna atrae con más fuerza el lado de la Tierra más cercano, y eso forma abultamientos de agua. La gravedad del Sol agrega un efecto menor."),
    ),
    e(
      bi("How did gravity help form the solar system?", "¿Cómo ayudó la gravedad a formar el sistema solar?"),
      bi("It pulled a spinning cloud of gas and dust together into the Sun and planets.", "Juntó una nube giratoria de gas y polvo para formar el Sol y los planetas."),
      [
        m("gravity-pushes", "It pushed gas and dust away from the center.", "Empujó el gas y el polvo lejos del centro."),
        m("invented-cause", "It had no part; the planets formed from light.", "No participó; los planetas se formaron a partir de la luz."),
        m("invented-cause", "It froze the gas into solid planets.", "Congeló el gas para formar planetas sólidos."),
      ],
      bi("Gravity always attracts; it never pushes.", "La gravedad siempre atrae; nunca empuja."),
      bi("Gravity pulled most of the cloud into the center, forming the Sun. Leftover material clumped together into planets and moons.", "La gravedad jaló la mayor parte de la nube hacia el centro y formó el Sol. El material sobrante se juntó en planetas y lunas."),
    ),
    e(
      bi("Why can astronauts jump much higher on the Moon than on Earth?", "¿Por qué los astronautas pueden saltar mucho más alto en la Luna que en la Tierra?"),
      bi("The Moon has less mass, so its gravity is weaker.", "La Luna tiene menos masa, así que su gravedad es más débil."),
      [
        m("thinks-no-gravity-in-space", "The Moon has no gravity.", "La Luna no tiene gravedad."),
        m("mass-weight-mixup", "The astronauts have less mass on the Moon.", "Los astronautas tienen menos masa en la Luna."),
        m("irrelevant-property", "The Moon is colder than Earth.", "La Luna es más fría que la Tierra."),
      ],
      bi("The astronauts still come back down, so gravity is there.", "Los astronautas sí vuelven a bajar, así que hay gravedad."),
      bi("The Moon's gravity is about one sixth of Earth's because it has much less mass, so the same push sends an astronaut higher.", "La gravedad de la Luna es cerca de la sexta parte de la de la Tierra porque tiene mucha menos masa, así que el mismo impulso lanza al astronauta más alto."),
    ),
    e(
      bi("What holds the hundreds of billions of stars of the Milky Way together?", "¿Qué mantiene juntas a los cientos de miles de millones de estrellas de la Vía Láctea?"),
      bi("Gravity", "La gravedad"),
      [m("magnetism-gravity-mixup", "Magnetism", "El magnetismo"), m("invented-cause", "Friction", "La fricción"), m("invented-cause", "Air pressure", "La presión del aire")],
      bi("It is the same force that holds planets around the Sun.", "Es la misma fuerza que mantiene a los planetas alrededor del Sol."),
      bi("The combined mass of the galaxy's stars, gas, and dark matter makes gravity that keeps the stars orbiting its center.", "La masa combinada de las estrellas, el gas y la materia oscura de la galaxia produce una gravedad que mantiene a las estrellas girando alrededor de su centro."),
    ),
    e(
      bi("A comet moves fastest when it is closest to the Sun. Why?", "Un cometa se mueve más rápido cuando está más cerca del Sol. ¿Por qué?"),
      bi("The Sun's gravity pulls on it harder there and speeds it up as it falls inward.", "Ahí la gravedad del Sol lo atrae con más fuerza y lo acelera mientras cae hacia adentro."),
      [
        m("invented-cause", "Its glowing tail pushes it forward.", "Su cola brillante lo empuja hacia adelante."),
        m("irrelevant-property", "The Sun's heat makes it lighter.", "El calor del Sol lo hace más ligero."),
        m("distance-effect-reversed", "Gravity is weakest near the Sun.", "La gravedad es más débil cerca del Sol."),
      ],
      bi("How does the pull of gravity change as the comet gets closer?", "¿Cómo cambia la atracción de la gravedad cuando el cometa se acerca?"),
      bi("As the comet falls toward the Sun, gravity speeds it up; as it climbs away, gravity slows it down.", "Cuando el cometa cae hacia el Sol, la gravedad lo acelera; cuando se aleja, la gravedad lo frena."),
    ),
  ],
};

// ── s.climate.impact ────────────────────────────────────────────────────────────────────────────

export const CLIMATE_IMPACT: Bank = {
  nudge: bi("Is the question about weather on one day, or about climate over many years?", "¿La pregunta trata del tiempo de un día o del clima a lo largo de muchos años?"),
  strategy: bi(
    "Burning coal, oil, and gas adds carbon dioxide to the air. Carbon dioxide and other greenhouse gases absorb heat given off by Earth and send some back down, so average temperatures rise. Evidence comes from long-term records, not single days.",
    "Quemar carbón, petróleo y gas agrega dióxido de carbono al aire. El dióxido de carbono y otros gases de efecto invernadero absorben el calor que emite la Tierra y regresan parte de él hacia abajo, así que las temperaturas promedio suben. La evidencia viene de registros de muchos años, no de días sueltos.",
  ),
  seconds: 30,
  items: [
    e(
      bi("Which gas, released by burning fossil fuels, is the main cause of global warming since the 1800s?", "¿Qué gas, liberado al quemar combustibles fósiles, es la causa principal del calentamiento global desde el siglo XIX?"),
      bi("Carbon dioxide", "El dióxido de carbono"),
      [m("wrong-gas", "Oxygen", "El oxígeno"), m("wrong-gas", "Nitrogen", "El nitrógeno"), m("wrong-gas", "Helium", "El helio")],
      bi("It forms when the carbon in fuel combines with oxygen.", "Se forma cuando el carbono del combustible se combina con oxígeno."),
      bi("Burning coal, oil, and gas releases carbon dioxide, a greenhouse gas. Its amount in the air has risen by about half since the 1800s.", "Quemar carbón, petróleo y gas libera dióxido de carbono, un gas de efecto invernadero. Su cantidad en el aire ha aumentado cerca de la mitad desde el siglo XIX."),
    ),
    e(
      bi("How do greenhouse gases warm Earth?", "¿Cómo calientan la Tierra los gases de efecto invernadero?"),
      bi("They absorb heat given off by Earth's surface and send some of it back down.", "Absorben el calor que emite la superficie de la Tierra y regresan parte de él hacia abajo."),
      [
        m("ozone-hole-confusion", "They make holes in the atmosphere that let in more sunlight.", "Hacen agujeros en la atmósfera que dejan entrar más luz del Sol."),
        m("sun-causes-recent-warming", "They make the Sun shine brighter.", "Hacen que el Sol brille más."),
        m("invented-cause", "They are hot gases that warm the air when they are released.", "Son gases calientes que calientan el aire cuando se liberan."),
      ],
      bi("Earth's warm surface gives off infrared energy toward space.", "La superficie caliente de la Tierra emite energía infrarroja hacia el espacio."),
      bi("Sunlight warms the surface, which gives off infrared energy. Greenhouse gases absorb some of it and send part back down, so less heat escapes.", "La luz del Sol calienta la superficie, que emite energía infrarroja. Los gases de efecto invernadero absorben parte de ella y regresan una parte hacia abajo, así que escapa menos calor."),
    ),
    e(
      bi("Is the ozone hole the main cause of global warming?", "¿El agujero de la capa de ozono es la causa principal del calentamiento global?"),
      bi("No; global warming is caused mainly by greenhouse gases such as carbon dioxide.", "No; el calentamiento global se debe sobre todo a gases de efecto invernadero como el dióxido de carbono."),
      [
        m("ozone-hole-confusion", "Yes; heat pours in through the hole.", "Sí; el calor entra por el agujero."),
        m("ozone-hole-confusion", "Yes; the hole lets the cold air out.", "Sí; el agujero deja salir el aire frío."),
      ],
      bi("The ozone layer blocks ultraviolet light; it is a different problem.", "La capa de ozono bloquea la luz ultravioleta; es un problema distinto."),
      bi("Ozone loss lets in more ultraviolet light, which harms skin and eyes. Warming comes from greenhouse gases trapping heat.", "La pérdida de ozono deja pasar más luz ultravioleta, que daña la piel y los ojos. El calentamiento viene de los gases de efecto invernadero que atrapan calor."),
    ),
    e(
      bi("What is the difference between weather and climate?", "¿Cuál es la diferencia entre el tiempo y el clima?"),
      bi("Weather is day-to-day conditions; climate is the average pattern over many years.", "El tiempo es lo que pasa en la atmósfera día a día; el clima es el patrón promedio a lo largo de muchos años."),
      [
        m("weather-climate-mixup", "They mean the same thing.", "Significan lo mismo."),
        m("weather-climate-mixup", "Climate is today's conditions; weather is the long-term average.", "El clima es lo que pasa hoy; el tiempo es el promedio de muchos años."),
      ],
      bi("Which one would you check before choosing a jacket for today?", "¿Cuál revisarías antes de elegir una chamarra para hoy?"),
      bi("Weather changes hour to hour. Climate describes what is typical for a place over 30 years or more.", "El tiempo cambia de una hora a otra. El clima describe lo que es normal en un lugar durante 30 años o más."),
    ),
    e(
      bi("A city has one very cold week in winter. Does this show that global warming is not happening?", "Una ciudad tiene una semana muy fría en invierno. ¿Esto demuestra que no existe el calentamiento global?"),
      bi("No; global warming is about long-term average temperatures across all of Earth.", "No; el calentamiento global trata de las temperaturas promedio de muchos años en toda la Tierra."),
      [
        m("weather-climate-mixup", "Yes; any cold week disproves it.", "Sí; cualquier semana fría lo desmiente."),
        m("weather-climate-mixup", "Yes, if the week is colder than the same week last year.", "Sí, si la semana es más fría que la misma semana del año pasado."),
      ],
      bi("One week in one place is weather.", "Una semana en un lugar es tiempo, no clima."),
      bi("Cold spells still happen in a warming world. The trend shows up in averages over decades and over the whole planet.", "Siguen ocurriendo olas de frío en un mundo que se calienta. La tendencia se ve en los promedios de décadas y de todo el planeta."),
    ),
    e(
      bi("Which observation is evidence that Earth's climate is warming?", "¿Qué observación es evidencia de que el clima de la Tierra se está calentando?"),
      bi("Most glaciers around the world are shrinking.", "La mayoría de los glaciares del mundo se están reduciendo."),
      [
        m("weather-climate-mixup", "Some summer days are hot.", "Algunos días de verano son calurosos."),
        m("irrelevant-evidence", "The Sun rises in the east.", "El Sol sale por el este."),
        m("irrelevant-evidence", "Volcanoes erupt in Hawaii.", "Los volcanes hacen erupción en Hawái."),
      ],
      bi("Look for a long-term change that happens across the whole planet.", "Busca un cambio de largo plazo que ocurra en todo el planeta."),
      bi("Glaciers on almost every continent have lost ice over decades, a sign of long-term warming.", "Los glaciares de casi todos los continentes han perdido hielo durante décadas, una señal de calentamiento a largo plazo."),
    ),
    e(
      bi("How does global warming raise sea level?", "¿Cómo hace subir el nivel del mar el calentamiento global?"),
      bi("Ice on land melts into the ocean, and warmer seawater expands.", "El hielo sobre tierra se derrite hacia el océano, y el agua de mar más caliente se expande."),
      [
        m("floating-ice-misconception", "Melting sea ice that already floats raises the sea a lot.", "El hielo marino que ya flota, al derretirse, hace subir mucho el mar."),
        m("invented-cause", "More rain falls on the ocean than before.", "Cae más lluvia sobre el océano que antes."),
      ],
      bi("Think of an ice cube floating in a full glass: when it melts, the glass does not overflow.", "Piensa en un cubo de hielo que flota en un vaso lleno: cuando se derrite, el vaso no se desborda."),
      bi("Water from melting glaciers and ice sheets adds to the ocean, and water expands as it warms. Floating ice already pushes aside its own weight in water.", "El agua de los glaciares y las capas de hielo que se derriten se suma al océano, y el agua se expande al calentarse. El hielo que flota ya desplaza su propio peso en agua."),
    ),
    e(
      bi("Which action reduces the carbon dioxide people add to the air?", "¿Qué acción reduce el dióxido de carbono que las personas agregan al aire?"),
      bi("Getting electricity from solar panels and wind instead of coal", "Obtener electricidad de paneles solares y del viento en lugar del carbón"),
      [
        m("increases-emissions", "Burning more coal to make electricity", "Quemar más carbón para producir electricidad"),
        m("deforestation-misconception", "Cutting down forests to make farmland", "Talar bosques para hacer tierras de cultivo"),
        m("increases-emissions", "Driving short trips instead of walking", "Ir en auto en trayectos cortos en lugar de caminar"),
      ],
      bi("Which choice burns no fuel?", "¿Qué opción no quema combustible?"),
      bi("Solar and wind power make electricity without burning fuel, so they add little carbon dioxide.", "La energía solar y la eólica producen electricidad sin quemar combustible, así que agregan poco dióxido de carbono."),
    ),
    e(
      bi("How does clearing large forests add to climate change?", "¿Cómo contribuye a cambiar el clima la tala de grandes bosques?"),
      bi("Fewer trees take in carbon dioxide, and burning or rotting wood releases it.", "Hay menos árboles que absorban dióxido de carbono, y la madera que se quema o se pudre lo libera."),
      [
        m("invented-cause", "Trees block sunlight from space, so fewer trees let in more sunlight.", "Los árboles bloquean la luz que viene del espacio, así que menos árboles dejan entrar más luz."),
        m("ignores-carbon-cycle", "It has no effect on climate.", "No tiene ningún efecto en el clima."),
      ],
      bi("Trees store carbon that they took from the air.", "Los árboles guardan carbono que tomaron del aire."),
      bi("Forests take in carbon dioxide by photosynthesis. Cutting and burning them stops that and releases the stored carbon.", "Los bosques absorben dióxido de carbono por fotosíntesis. Talarlos y quemarlos detiene eso y libera el carbono guardado."),
    ),
    e(
      bi(
        "Measurements on Mauna Loa in Hawaii show carbon dioxide in the air rising every year since 1958. What is the main source of the extra carbon dioxide?",
        "Las mediciones en el Mauna Loa, en Hawái, muestran que el dióxido de carbono en el aire sube cada año desde 1958. ¿Cuál es la fuente principal del dióxido de carbono adicional?",
      ),
      bi("Burning fossil fuels such as coal, oil, and gas", "La quema de combustibles fósiles como el carbón, el petróleo y el gas"),
      [
        m("volcano-misconception", "Volcanoes", "Los volcanes"),
        m("respiration-misconception", "People breathing out", "Las personas que exhalan"),
        m("wrong-source", "The ocean giving off gas", "El océano que libera gas"),
      ],
      bi("Volcanoes release less than 1% as much carbon dioxide as people do each year.", "Los volcanes liberan menos del 1% del dióxido de carbono que liberan las personas cada año."),
      bi("Fossil fuel use releases carbon that was stored underground for millions of years. The ocean is actually taking in some of the extra carbon dioxide.", "Usar combustibles fósiles libera carbono que estuvo guardado bajo tierra millones de años. De hecho, el océano está absorbiendo parte del dióxido de carbono adicional."),
    ),
    e(
      bi("Since satellite records began in 1979, what has happened to the Arctic sea ice left at the end of each summer?", "Desde que empezaron los registros por satélite en 1979, ¿qué ha pasado con el hielo marino del Ártico que queda al final de cada verano?"),
      bi("It has become smaller overall.", "En general, ha disminuido."),
      [m("trend-reversed", "It has grown steadily.", "Ha crecido sin parar."), m("ignores-evidence", "It has stayed exactly the same.", "Se ha mantenido exactamente igual.")],
      bi("Warmer air and water melt more ice each summer.", "El aire y el agua más calientes derriten más hielo cada verano."),
      bi("The September Arctic sea ice has shrunk by about 12% per decade since 1979, with ups and downs from year to year.", "El hielo marino del Ártico en septiembre se ha reducido cerca de un 12% por década desde 1979, con altibajos de un año a otro."),
    ),
    e(
      bi("As the ocean takes in more carbon dioxide, what happens to seawater?", "Al absorber el océano más dióxido de carbono, ¿qué le pasa al agua de mar?"),
      bi("It becomes more acidic, which makes it harder for corals and shellfish to build shells.", "Se vuelve más ácida, lo que hace más difícil que los corales y los mariscos formen sus conchas."),
      [
        m("trend-reversed", "It becomes more basic.", "Se vuelve más básica."),
        m("invented-cause", "It becomes much saltier.", "Se vuelve mucho más salada."),
        m("ignores-evidence", "Nothing changes.", "No cambia nada."),
      ],
      bi("Carbon dioxide dissolved in water forms a weak acid.", "El dióxido de carbono disuelto en agua forma un ácido débil."),
      bi("Dissolved carbon dioxide forms carbonic acid, lowering the ocean's pH. Shell-building animals then find it harder to make their shells.", "El dióxido de carbono disuelto forma ácido carbónico, que baja el pH del océano. Así, a los animales que forman conchas les cuesta más hacerlas."),
    ),
    e(
      bi("Which human activity releases methane, another greenhouse gas?", "¿Qué actividad humana libera metano, otro gas de efecto invernadero?"),
      bi("Raising cattle and growing rice in flooded fields", "Criar ganado y cultivar arroz en campos inundados"),
      [
        m("reverses-carbon-sink", "Planting trees", "Plantar árboles"),
        m("increases-emissions", "Using solar panels", "Usar paneles solares"),
        m("irrelevant-evidence", "Recycling glass bottles", "Reciclar botellas de vidrio"),
      ],
      bi("Methane is made by microbes that live without oxygen, such as in a cow's stomach or in soggy soil.", "El metano lo producen microbios que viven sin oxígeno, como en el estómago de una vaca o en el suelo empapado."),
      bi("Microbes in cattle stomachs and in flooded rice fields make methane. Leaks from natural gas wells and landfills add more.", "Los microbios del estómago del ganado y de los campos de arroz inundados producen metano. Las fugas de pozos de gas natural y los rellenos sanitarios agregan más."),
    ),
  ],
};

// ── s.waves.info ────────────────────────────────────────────────────────────────────────────────

export const WAVES_INFO: Bank = {
  nudge: bi("Is the information carried as a smooth, changing wave or as separate on-and-off values?", "¿La información viaja como una onda continua que cambia o como valores separados de encendido y apagado?"),
  strategy: bi(
    "An analog signal changes smoothly, like the original sound wave. A digital signal is a pattern of separate values, usually 0s and 1s (bits). Digital signals resist noise and copy exactly, which is why most information is now sent digitally by radio waves and light.",
    "Una señal analógica cambia de forma continua, como la onda de sonido original. Una señal digital es un patrón de valores separados, casi siempre 0 y 1 (bits). Las señales digitales resisten el ruido y se copian con exactitud, por eso hoy casi toda la información se envía en forma digital con ondas de radio y luz.",
  ),
  seconds: 25,
  items: [
    e(
      bi("What is a digital signal?", "¿Qué es una señal digital?"),
      bi("A signal sent as a pattern of separate values, such as 0s and 1s", "Una señal que se envía como un patrón de valores separados, como 0 y 1"),
      [
        m("analog-digital-mixup", "A smooth wave that changes continuously", "Una onda continua que cambia sin saltos"),
        m("medium-confusion", "Any signal that travels through a wire", "Cualquier señal que viaja por un cable"),
        m("invented-property", "A signal that can never be copied", "Una señal que nunca se puede copiar"),
      ],
      bi("Think of a light switch: on or off, nothing in between.", "Piensa en un interruptor de luz: encendido o apagado, nada intermedio."),
      bi("Digital signals use separate values, usually two (0 and 1), instead of a smoothly changing wave.", "Las señales digitales usan valores separados, casi siempre dos (0 y 1), en lugar de una onda que cambia de forma continua."),
    ),
    e(
      bi("What is an analog signal?", "¿Qué es una señal analógica?"),
      bi("A signal that changes smoothly and continuously, like the original sound wave", "Una señal que cambia de forma continua, como la onda de sonido original"),
      [
        m("analog-digital-mixup", "A signal made only of 0s and 1s", "Una señal hecha solo de 0 y 1"),
        m("invented-property", "A signal that cannot carry sound", "Una señal que no puede llevar sonido"),
        m("medium-confusion", "A signal that travels only as light", "Una señal que viaja solo como luz"),
      ],
      bi("A record player's groove has the same wiggly shape as the sound wave.", "El surco de un disco de vinilo tiene la misma forma ondulada que la onda de sonido."),
      bi("An analog signal copies the shape of the original wave, so it can take any value in a range.", "Una señal analógica copia la forma de la onda original, así que puede tomar cualquier valor dentro de un rango."),
    ),
    e(
      bi("Why are digital signals more reliable than analog signals over long distances?", "¿Por qué las señales digitales son más confiables que las analógicas en distancias largas?"),
      bi("A little noise does not change whether a value is read as 0 or 1.", "Un poco de ruido no cambia si un valor se lee como 0 o como 1."),
      [
        m("thinks-digital-is-faster", "Digital signals travel faster than light.", "Las señales digitales viajan más rápido que la luz."),
        m("invented-property", "Digital signals never lose any energy.", "Las señales digitales nunca pierden energía."),
        m("medium-confusion", "Analog signals cannot travel through wires.", "Las señales analógicas no pueden viajar por cables."),
      ],
      bi("Noise adds small wiggles to any signal on the way.", "El ruido agrega pequeñas ondulaciones a cualquier señal en el camino."),
      bi("Small wiggles change an analog signal's shape, but a digital receiver only has to tell 0 from 1, so it can rebuild the exact message.", "Las pequeñas ondulaciones cambian la forma de una señal analógica, pero un receptor digital solo tiene que distinguir 0 de 1, así que puede reconstruir el mensaje exacto."),
    ),
    e(
      bi("What is a bit?", "¿Qué es un bit?"),
      bi("A single 0 or 1 in digital information", "Un solo 0 o 1 en la información digital"),
      [
        m("bit-byte-mixup", "A group of eight 0s and 1s", "Un grupo de ocho 0 y 1"),
        m("analog-digital-mixup", "One complete wave of an analog signal", "Una onda completa de una señal analógica"),
        m("invented-property", "A unit of loudness", "Una unidad de volumen del sonido"),
      ],
      bi("It is the smallest piece of digital information.", "Es la pieza más pequeña de información digital."),
      bi("A bit (binary digit) is one 0 or 1. Eight bits make one byte.", "Un bit (dígito binario) es un solo 0 o 1. Ocho bits forman un byte."),
    ),
    e(
      bi("How many bits are in one byte?", "¿Cuántos bits hay en un byte?"),
      bi("8", "8"),
      [m("bit-byte-mixup", "2", "2"), m("decimal-thinking", "10", "10"), m("bit-byte-mixup", "1,000", "1,000")],
      bi("A byte can hold one letter of text.", "Un byte puede guardar una letra de un texto."),
      bi("One byte is 8 bits, which allows 256 different patterns, enough for letters, digits, and symbols.", "Un byte son 8 bits, lo que permite 256 patrones distintos, suficientes para letras, dígitos y símbolos."),
    ),
    e(
      bi("How many different patterns can 3 bits make?", "¿Cuántos patrones distintos se pueden formar con 3 bits?"),
      bi("8", "8"),
      [m("counted-bits-not-patterns", "3", "3"), m("multiplied-instead-of-powers", "6", "6"), m("used-3-squared", "9", "9")],
      bi("Each bit can be 0 or 1. Try listing them: 000, 001, 010...", "Cada bit puede ser 0 o 1. Intenta escribirlos: 000, 001, 010..."),
      bi("Each extra bit doubles the number of patterns: 2 × 2 × 2 = 8 (000 through 111).", "Cada bit adicional duplica la cantidad de patrones: 2 × 2 × 2 = 8 (de 000 a 111)."),
    ),
    e(
      bi("A copy of a copy of an analog cassette tape sounds worse each time, but a copy of a digital music file sounds the same. Why?", "Una copia de una copia de un casete analógico suena peor cada vez, pero la copia de un archivo de música digital suena igual. ¿Por qué?"),
      bi("Each analog copy adds noise, while digital copies repeat the same 0s and 1s exactly.", "Cada copia analógica agrega ruido, mientras que las copias digitales repiten exactamente los mismos 0 y 1."),
      [
        m("invented-property", "Digital files are played louder.", "Los archivos digitales se reproducen más fuerte."),
        m("invented-property", "Analog copies are made too quickly.", "Las copias analógicas se hacen demasiado rápido."),
        m("analog-digital-mixup", "Cassette tapes store 0s and 1s.", "Los casetes guardan 0 y 1."),
      ],
      bi("What gets added to a smooth wave each time it is copied?", "¿Qué se le agrega a una onda continua cada vez que se copia?"),
      bi("Copying an analog wave adds a little noise each time, and it builds up. A digital copy just repeats the same list of numbers.", "Copiar una onda analógica agrega un poco de ruido cada vez, y se va acumulando. Una copia digital solo repite la misma lista de números."),
    ),
    e(
      bi("Fiber-optic cables carry internet data under the ocean. What do they send the data as?", "Los cables de fibra óptica llevan datos de internet bajo el océano. ¿Cómo envían los datos?"),
      bi("Pulses of light", "Como pulsos de luz"),
      [m("medium-confusion", "Sound waves", "Como ondas de sonido"), m("medium-confusion", "Water waves", "Como olas de agua")],
      bi("The glass fibers are thin and very clear.", "Las fibras de vidrio son delgadas y muy transparentes."),
      bi("Lasers flash light on and off inside glass fibers, and the light carries the 0s and 1s across long distances.", "Unos láseres encienden y apagan la luz dentro de fibras de vidrio, y la luz lleva los 0 y 1 a grandes distancias."),
    ),
    e(
      bi("How does a cell phone send your voice to a cell tower?", "¿Cómo envía un teléfono celular tu voz a una torre de telefonía?"),
      bi("It turns your voice into a digital signal and sends it as radio waves.", "Convierte tu voz en una señal digital y la envía como ondas de radio."),
      [
        m("sound-travels-far", "It sends the sound waves of your voice through the air to the tower.", "Envía las ondas de sonido de tu voz por el aire hasta la torre."),
        m("medium-confusion", "It sends light from its screen to the tower.", "Envía luz desde su pantalla hasta la torre."),
        m("analog-digital-mixup", "It sends a copy of the sound wave down a wire to the tower.", "Envía una copia de la onda de sonido por un cable hasta la torre."),
      ],
      bi("Sound fades quickly in air, but some waves can travel many kilometers without wires.", "El sonido se apaga rápido en el aire, pero algunas ondas pueden viajar muchos kilómetros sin cables."),
      bi("The microphone turns sound into an electrical signal, the phone makes it digital, and an antenna sends it to the tower as radio waves.", "El micrófono convierte el sonido en una señal eléctrica, el teléfono la vuelve digital y una antena la envía a la torre como ondas de radio."),
    ),
    e(
      bi("To make a digital recording, a computer measures a sound wave many times each second. What happens if it measures more times per second?", "Para hacer una grabación digital, una computadora mide una onda de sonido muchas veces por segundo. ¿Qué pasa si la mide más veces por segundo?"),
      bi("The digital copy matches the original sound more closely.", "La copia digital se parece más al sonido original."),
      [
        m("invented-property", "The sound gets louder.", "El sonido se vuelve más fuerte."),
        m("trend-reversed", "The file gets smaller.", "El archivo se vuelve más pequeño."),
        m("ignores-sampling", "Nothing changes.", "No cambia nada."),
      ],
      bi("More measurements give more points to rebuild the wave's shape.", "Más mediciones dan más puntos para reconstruir la forma de la onda."),
      bi("Each measurement is a sample. More samples per second capture more detail, though the file gets bigger.", "Cada medición es una muestra. Más muestras por segundo capturan más detalle, aunque el archivo se vuelve más grande."),
    ),
    e(
      bi("Which statement about radio waves and sound waves is true?", "¿Qué enunciado sobre las ondas de radio y las ondas de sonido es verdadero?"),
      bi("Radio waves can travel through empty space; sound waves cannot.", "Las ondas de radio pueden viajar por el espacio vacío; las de sonido no."),
      [
        m("medium-confusion", "Sound waves can travel through empty space; radio waves cannot.", "Las ondas de sonido pueden viajar por el espacio vacío; las de radio no."),
        m("medium-confusion", "Both need air to travel.", "Las dos necesitan aire para viajar."),
        m("sound-radio-mixup", "Radio waves are a kind of sound wave.", "Las ondas de radio son un tipo de onda de sonido."),
      ],
      bi("Radio messages reach us from spacecraft far beyond the air.", "Nos llegan mensajes de radio de naves espaciales que están mucho más allá del aire."),
      bi("Radio waves are electromagnetic waves, like light, and need no medium. Sound is a vibration of matter, so it needs air, water, or a solid.", "Las ondas de radio son ondas electromagnéticas, como la luz, y no necesitan un medio. El sonido es una vibración de la materia, así que necesita aire, agua o un sólido."),
    ),
    e(
      bi("A barcode stores a number as a pattern of wide and narrow bars that a scanner reads. What kind of signal is this?", "Un código de barras guarda un número como un patrón de barras anchas y angostas que lee un escáner. ¿Qué tipo de señal es?"),
      bi("Digital", "Digital"),
      [m("analog-digital-mixup", "Analog", "Analógica"), m("invented-property", "Neither; a barcode holds no information", "Ninguna; un código de barras no guarda información")],
      bi("The bars come in a few set widths, not every possible width.", "Las barras tienen unos pocos anchos fijos, no cualquier ancho posible."),
      bi("A barcode uses separate, set patterns to stand for digits, so it is digital information.", "Un código de barras usa patrones separados y fijos para representar dígitos, así que es información digital."),
    ),
    e(
      bi("In a sound wave, what does a larger amplitude mean?", "En una onda de sonido, ¿qué significa una amplitud mayor?"),
      bi("A louder sound", "Un sonido más fuerte"),
      [m("amplitude-frequency-mixup", "A higher pitch", "Un tono más agudo"), m("invented-property", "A faster sound", "Un sonido más rápido"), m("amplitude-frequency-mixup", "A lower pitch", "Un tono más grave")],
      bi("Amplitude is how big the vibration is.", "La amplitud es qué tan grande es la vibración."),
      bi("A bigger amplitude carries more energy, which we hear as louder. Pitch depends on frequency.", "Una amplitud mayor lleva más energía, que escuchamos como un sonido más fuerte. El tono depende de la frecuencia."),
    ),
    e(
      bi("How does a sound wave with a higher frequency sound?", "¿Cómo suena una onda de sonido con una frecuencia más alta?"),
      bi("Higher in pitch", "Más aguda"),
      [m("amplitude-frequency-mixup", "Louder", "Más fuerte"), m("trend-reversed", "Lower in pitch", "Más grave")],
      bi("Frequency is how many vibrations happen each second.", "La frecuencia es cuántas vibraciones ocurren cada segundo."),
      bi("More vibrations per second make a higher pitch, like a whistle compared with a tuba.", "Más vibraciones por segundo producen un tono más agudo, como un silbato comparado con una tuba."),
    ),
  ],
};
