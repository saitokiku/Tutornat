import { bi, e, m, mx, type Bank } from "./shared";

// Grade 9 banks: periodic table trends (s.periodic.trends), ionic and covalent bonding (s.bonding), and
// nuclear processes, fission and fusion (s.nuclear).

// ── s.periodic.trends ───────────────────────────────────────────────────────────────────────────

export const PERIODIC_TRENDS: Bank = {
  nudge: bi("Is the question about a column (group) or a row (period) of the periodic table?", "¿La pregunta trata de una columna (grupo) o de una fila (período) de la tabla periódica?"),
  strategy: bi(
    "Elements in a group have the same number of valence electrons, so they react alike. Going down a group, atoms get bigger and metals get more reactive. Going across a period from left to right, atoms get smaller and the elements change from metals to nonmetals.",
    "Los elementos de un grupo tienen el mismo número de electrones de valencia, así que reaccionan de forma parecida. Al bajar por un grupo, los átomos son más grandes y los metales más reactivos. Al avanzar por un período de izquierda a derecha, los átomos son más pequeños y los elementos pasan de metales a no metales.",
  ),
  seconds: 25,
  items: [
    e(
      bi("Elements in the same group (column) of the periodic table have the same number of what?", "Los elementos del mismo grupo (columna) de la tabla periódica tienen el mismo número de ¿qué?"),
      bi("Valence electrons (electrons in the outer shell)", "Electrones de valencia (electrones de la capa externa)"),
      [
        m("confused-subatomic", "Protons", "Protones"),
        m("confused-subatomic", "Neutrons", "Neutrones"),
        m("group-period-mixup", "Occupied electron shells", "Capas de electrones ocupadas"),
      ],
      bi("This number decides how an element reacts.", "Este número decide cómo reacciona un elemento."),
      bi("Main-group elements in one column share the same number of outer electrons, which is why they react in similar ways.", "Los elementos de los grupos principales de una columna tienen el mismo número de electrones externos, por eso reaccionan de forma parecida."),
    ),
    e(
      bi("Elements in the same period (row) have the same number of what?", "Los elementos del mismo período (fila) tienen el mismo número de ¿qué?"),
      bi("Occupied electron shells (energy levels)", "Capas de electrones ocupadas (niveles de energía)"),
      [
        m("group-period-mixup", "Valence electrons", "Electrones de valencia"),
        m("confused-subatomic", "Protons", "Protones"),
        m("confused-subatomic", "Neutrons", "Neutrones"),
      ],
      bi("Each new row starts filling a new shell.", "Cada fila nueva empieza a llenar una capa nueva."),
      bi("All elements in a row have their electrons in the same number of shells. Across the row, protons and electrons increase one at a time.", "Todos los elementos de una fila tienen sus electrones en el mismo número de capas. A lo largo de la fila, los protones y los electrones aumentan de uno en uno."),
    ),
    e(
      bi("Why do sodium (Na) and potassium (K) react in similar ways?", "¿Por qué el sodio (Na) y el potasio (K) reaccionan de forma parecida?"),
      bi("They are in the same group, so each has 1 valence electron.", "Están en el mismo grupo, así que cada uno tiene 1 electrón de valencia."),
      [
        m("mass-not-electrons", "They have almost the same mass.", "Tienen casi la misma masa."),
        m("group-period-mixup", "They are in the same period.", "Están en el mismo período."),
        m("metal-nonmetal-mixup", "They are both gases.", "Los dos son gases."),
      ],
      bi("Find them in the first column.", "Búscalos en la primera columna."),
      bi("Both are alkali metals in group 1. Each gives up its single outer electron easily, so they react alike.", "Los dos son metales alcalinos del grupo 1. Cada uno cede con facilidad su único electrón externo, así que reaccionan de forma parecida."),
    ),
    e(
      bi("How does the size of atoms change as you go down a group?", "¿Cómo cambia el tamaño de los átomos al bajar por un grupo?"),
      bi("The atoms get larger.", "Los átomos se vuelven más grandes."),
      [m("trend-reversed", "The atoms get smaller.", "Los átomos se vuelven más pequeños."), m("ignores-trend", "The size stays the same.", "El tamaño se queda igual.")],
      bi("Each row down adds another shell of electrons.", "Cada fila hacia abajo agrega otra capa de electrones."),
      bi("Going down a group adds electron shells, so the atoms get bigger.", "Al bajar por un grupo se agregan capas de electrones, así que los átomos son más grandes."),
    ),
    e(
      bi("How does the size of atoms generally change across a period from left to right?", "¿Cómo cambia en general el tamaño de los átomos a lo largo de un período de izquierda a derecha?"),
      bi("The atoms get smaller.", "Los átomos se vuelven más pequeños."),
      [m("trend-reversed", "The atoms get larger.", "Los átomos se vuelven más grandes."), m("ignores-trend", "The size stays the same.", "El tamaño se queda igual.")],
      bi("Across a row, the nucleus gains protons, but no new shell is added.", "A lo largo de una fila, el núcleo gana protones, pero no se agrega una capa nueva."),
      bi("More protons pull the same shells in tighter, so atoms shrink from left to right.", "Más protones jalan con más fuerza las mismas capas, así que los átomos se encogen de izquierda a derecha."),
    ),
    e(
      bi("Which of these elements is a noble gas that almost never reacts?", "¿Cuál de estos elementos es un gas noble que casi nunca reacciona?"),
      bi("Neon", "Neón"),
      [m("group-mixup", "Sodium", "Sodio"), m("group-mixup", "Chlorine", "Cloro"), m("group-mixup", "Oxygen", "Oxígeno")],
      bi("Noble gases are in the last column, with full outer shells.", "Los gases nobles están en la última columna y tienen la capa externa llena."),
      bi("Neon is in group 18. Its full outer shell makes it very stable, so it hardly ever forms compounds.", "El neón está en el grupo 18. Su capa externa llena lo hace muy estable, así que casi nunca forma compuestos."),
    ),
    e(
      bi("Which group holds very reactive metals, such as sodium and potassium, that react with water?", "¿Qué grupo contiene metales muy reactivos, como el sodio y el potasio, que reaccionan con el agua?"),
      bi("Group 1, the alkali metals", "El grupo 1, los metales alcalinos"),
      [
        m("group-mixup", "Group 18, the noble gases", "El grupo 18, los gases nobles"),
        m("group-mixup", "Group 17, the halogens", "El grupo 17, los halógenos"),
        m("group-mixup", "The transition metals, such as iron and copper", "Los metales de transición, como el hierro y el cobre"),
      ],
      bi("These metals have only one valence electron to lose.", "Estos metales tienen un solo electrón de valencia que perder."),
      bi("Alkali metals in group 1 lose their single outer electron easily, so they react quickly, even with water.", "Los metales alcalinos del grupo 1 pierden con facilidad su único electrón externo, así que reaccionan rápido, incluso con el agua."),
    ),
    e(
      bi("Which of these halogens is the most reactive?", "¿Cuál de estos halógenos es el más reactivo?"),
      bi("Fluorine", "Flúor"),
      [m("trend-reversed", "Chlorine", "Cloro"), m("trend-reversed", "Iodine", "Yodo")],
      bi("Halogens react by gaining an electron; a smaller atom pulls harder.", "Los halógenos reaccionan ganando un electrón; un átomo más pequeño atrae con más fuerza."),
      bi("Fluorine is the smallest halogen, at the top of group 17, so it pulls in an electron most strongly and is the most reactive.", "El flúor es el halógeno más pequeño, en la parte de arriba del grupo 17, así que atrae un electrón con más fuerza y es el más reactivo."),
    ),
    e(
      bi("Which of these alkali metals reacts most strongly with water?", "¿Cuál de estos metales alcalinos reacciona con más fuerza con el agua?"),
      bi("Potassium", "Potasio"),
      [m("trend-reversed", "Sodium", "Sodio"), m("trend-reversed", "Lithium", "Litio")],
      bi("Alkali metals react by losing their outer electron. Where is it easiest to lose?", "Los metales alcalinos reaccionan al perder su electrón externo. ¿Dónde es más fácil perderlo?"),
      bi("Going down group 1, the outer electron is farther from the nucleus and easier to lose, so potassium reacts more strongly than sodium or lithium.", "Al bajar por el grupo 1, el electrón externo está más lejos del núcleo y es más fácil de perder, así que el potasio reacciona con más fuerza que el sodio o el litio."),
    ),
    e(
      bi("Where are the metals on the periodic table?", "¿Dónde están los metales en la tabla periódica?"),
      bi("On the left side and in the middle", "En el lado izquierdo y en el centro"),
      [
        m("metal-nonmetal-mixup", "On the right side", "En el lado derecho"),
        m("ignores-trend", "Only in the top row", "Solo en la fila de arriba"),
        m("group-mixup", "Only in the last column", "Solo en la última columna"),
      ],
      bi("A zigzag line near the right side separates metals from nonmetals.", "Una línea en zigzag cerca del lado derecho separa los metales de los no metales."),
      bi("Most elements are metals, filling the left side and the middle. Nonmetals are on the upper right, with hydrogen as an exception at the top left.", "La mayoría de los elementos son metales y ocupan el lado izquierdo y el centro. Los no metales están arriba a la derecha, con el hidrógeno como excepción arriba a la izquierda."),
    ),
    e(
      bi("Which property is typical of metals?", "¿Qué propiedad es típica de los metales?"),
      bi("They conduct electricity and heat well.", "Conducen bien la electricidad y el calor."),
      [
        m("metal-nonmetal-mixup", "They are brittle and shatter when hit.", "Son frágiles y se rompen al golpearlos."),
        m("metal-nonmetal-mixup", "Most are gases at room temperature.", "La mayoría son gases a temperatura ambiente."),
        m("metal-nonmetal-mixup", "They are dull and do not reflect light.", "Son opacos y no reflejan la luz."),
      ],
      bi("Think of copper wire and a metal spoon in hot soup.", "Piensa en un cable de cobre y en una cuchara de metal dentro de sopa caliente."),
      bi("Metals are shiny, conduct electricity and heat, and can be hammered into shapes. Brittleness and being gases are typical of nonmetals.", "Los metales son brillantes, conducen la electricidad y el calor y se pueden moldear a golpes. Ser frágiles o gases es típico de los no metales."),
    ),
    e(
      bi("Dmitri Mendeleev left gaps in his periodic table in 1869. Why?", "Dmitri Mendeléiev dejó espacios vacíos en su tabla periódica en 1869. ¿Por qué?"),
      bi("He predicted elements that had not been discovered yet.", "Predijo elementos que todavía no se habían descubierto."),
      [
        m("misreads-history", "He forgot some elements he knew about.", "Olvidó algunos elementos que conocía."),
        m("misreads-history", "Those elements were too dangerous to list.", "Esos elementos eran demasiado peligrosos para incluirlos."),
        m("misreads-history", "He ran out of room on the page.", "Se le acabó el espacio en la página."),
      ],
      bi("Later, gallium and germanium were found with properties close to what he described.", "Después se encontraron el galio y el germanio con propiedades parecidas a las que él describió."),
      bi("Mendeleev arranged elements by repeating properties and left gaps where the pattern called for unknown elements. Their later discovery supported his table.", "Mendeléiev ordenó los elementos por propiedades que se repiten y dejó espacios donde el patrón pedía elementos desconocidos. Su descubrimiento posterior apoyó su tabla."),
    ),
    e(
      bi("How are the elements ordered in the modern periodic table?", "¿Cómo están ordenados los elementos en la tabla periódica moderna?"),
      bi("By atomic number, the number of protons", "Por número atómico, el número de protones"),
      [
        m("mass-not-electrons", "By atomic mass", "Por masa atómica"),
        m("misreads-history", "By the date they were discovered", "Por la fecha en que se descubrieron"),
        m("misreads-history", "In alphabetical order", "En orden alfabético"),
      ],
      bi("Each element has exactly one more proton than the one before it.", "Cada elemento tiene exactamente un protón más que el anterior."),
      bi("The modern table is ordered by atomic number. Ordering by mass, as Mendeleev did, puts a few pairs such as tellurium and iodine out of place.", "La tabla moderna se ordena por número atómico. Ordenar por masa, como hizo Mendeléiev, deja fuera de lugar algunos pares, como el telurio y el yodo."),
    ),
    e(
      bi("Which of these atoms needs the most energy to remove an outer electron?", "¿Cuál de estos átomos necesita más energía para que se le quite un electrón externo?"),
      bi("Helium", "Helio"),
      [m("trend-reversed", "Sodium", "Sodio"), m("trend-reversed", "Potassium", "Potasio")],
      bi("Small atoms with full outer shells hold their electrons tightly.", "Los átomos pequeños con la capa externa llena sujetan con fuerza sus electrones."),
      bi("Helium's two electrons are close to the nucleus in a full shell, so removing one takes more energy than for any other element.", "Los dos electrones del helio están cerca del núcleo en una capa llena, así que quitar uno requiere más energía que en cualquier otro elemento."),
    ),
  ],
};

// ── s.bonding ───────────────────────────────────────────────────────────────────────────────────

const IONIC = bi("Ionic", "Iónico");
const COVALENT = bi("Covalent", "Covalente");
const METALLIC = bi("Metallic", "Metálico");

export const BONDING: Bank = {
  nudge: bi("Are electrons being transferred, shared, or spread among many atoms?", "¿Los electrones se transfieren, se comparten o se reparten entre muchos átomos?"),
  strategy: bi(
    "A metal and a nonmetal usually form an ionic bond: the metal gives electrons to the nonmetal, and the opposite charges attract. Two nonmetals usually form covalent bonds by sharing pairs of electrons. Atoms bond to reach a full outer shell.",
    "Un metal y un no metal suelen formar un enlace iónico: el metal le da electrones al no metal, y las cargas opuestas se atraen. Dos no metales suelen formar enlaces covalentes al compartir pares de electrones. Los átomos se enlazan para completar su capa externa.",
  ),
  seconds: 25,
  items: [
    e(
      bi("What happens in an ionic bond?", "¿Qué ocurre en un enlace iónico?"),
      bi("Electrons move from one atom to another, and the oppositely charged ions attract.", "Los electrones pasan de un átomo a otro, y los iones de carga opuesta se atraen."),
      [
        m("ionic-covalent-mixup", "Two atoms share pairs of electrons.", "Dos átomos comparten pares de electrones."),
        m("moves-protons", "Protons move from one atom to another.", "Los protones pasan de un átomo a otro."),
        m("confused-with-nuclear", "Two nuclei join into one.", "Dos núcleos se unen en uno solo."),
      ],
      bi("Ions are atoms that have gained or lost electrons.", "Los iones son átomos que han ganado o perdido electrones."),
      bi("In an ionic bond, a metal atom gives electrons to a nonmetal atom. The positive and negative ions then attract each other.", "En un enlace iónico, un átomo metálico le da electrones a un átomo no metálico. Luego los iones positivo y negativo se atraen."),
    ),
    e(
      bi("What happens in a covalent bond?", "¿Qué ocurre en un enlace covalente?"),
      bi("Two atoms share pairs of electrons.", "Dos átomos comparten pares de electrones."),
      [
        m("ionic-covalent-mixup", "One atom gives electrons to another.", "Un átomo le da electrones a otro."),
        m("moves-protons", "Two atoms share protons.", "Dos átomos comparten protones."),
        m("covalent-metallic-mixup", "Many metal atoms share a sea of electrons.", "Muchos átomos de metal comparten un mar de electrones."),
      ],
      bi("Co- means together.", "Co- significa juntos."),
      bi("In a covalent bond, two nonmetal atoms share electron pairs so that each gets closer to a full outer shell.", "En un enlace covalente, dos átomos no metálicos comparten pares de electrones para que cada uno se acerque a completar su capa externa."),
    ),
    e(
      bi("Which pair of elements is most likely to form an ionic bond?", "¿Qué par de elementos tiene más probabilidad de formar un enlace iónico?"),
      bi("Sodium and chlorine", "Sodio y cloro"),
      [
        m("ionic-covalent-mixup", "Carbon and oxygen", "Carbono y oxígeno"),
        m("ionic-covalent-mixup", "Hydrogen and hydrogen", "Hidrógeno e hidrógeno"),
        m("ionic-covalent-mixup", "Nitrogen and oxygen", "Nitrógeno y oxígeno"),
      ],
      bi("Look for a metal paired with a nonmetal.", "Busca un metal junto con un no metal."),
      bi("Sodium is a metal that loses an electron easily, and chlorine is a nonmetal that gains one easily, so they form ions. The other pairs are nonmetals that share electrons.", "El sodio es un metal que pierde un electrón con facilidad, y el cloro es un no metal que gana uno con facilidad, así que forman iones. Los otros pares son no metales que comparten electrones."),
    ),
    e(
      bi("Which compound is held together by covalent bonds?", "¿Qué compuesto se mantiene unido por enlaces covalentes?"),
      bi("Water (H₂O)", "Agua (H₂O)"),
      [
        m("ionic-covalent-mixup", "Table salt (NaCl)", "Sal de mesa (NaCl)"),
        m("ionic-covalent-mixup", "Magnesium oxide (MgO)", "Óxido de magnesio (MgO)"),
        m("ionic-covalent-mixup", "Potassium chloride (KCl)", "Cloruro de potasio (KCl)"),
      ],
      bi("Look for the compound made only of nonmetals.", "Busca el compuesto formado solo por no metales."),
      bi("Hydrogen and oxygen are both nonmetals, so they share electrons. The other three join a metal with a nonmetal, which makes ionic compounds.", "El hidrógeno y el oxígeno son no metales, así que comparten electrones. Los otros tres unen un metal con un no metal, lo que forma compuestos iónicos."),
    ),
    e(
      bi("A sodium atom becomes an ion. What charge does it get?", "Un átomo de sodio se convierte en ion. ¿Qué carga adquiere?"),
      bi("+1, because it loses one electron", "+1, porque pierde un electrón"),
      [
        m("charge-sign-reversed", "−1, because it gains one electron", "−1, porque gana un electrón"),
        m("moves-protons", "+1, because it gains one proton", "+1, porque gana un protón"),
        m("ignores-ion", "No charge at all", "Ninguna carga"),
      ],
      bi("Sodium has one valence electron, and losing it leaves a full shell underneath.", "El sodio tiene un electrón de valencia, y al perderlo queda una capa llena debajo."),
      bi("Losing one negative electron leaves 11 protons and 10 electrons, so the ion has a charge of +1.", "Al perder un electrón negativo quedan 11 protones y 10 electrones, así que el ion tiene carga +1."),
    ),
    e(
      bi("A chlorine atom becomes an ion. What charge does it get?", "Un átomo de cloro se convierte en ion. ¿Qué carga adquiere?"),
      bi("−1, because it gains one electron", "−1, porque gana un electrón"),
      [
        m("charge-sign-reversed", "+1, because it loses one electron", "+1, porque pierde un electrón"),
        m("moves-protons", "−1, because it loses one proton", "−1, porque pierde un protón"),
        m("counted-valence-as-charge", "+7, because it has 7 valence electrons", "+7, porque tiene 7 electrones de valencia"),
      ],
      bi("Chlorine has 7 valence electrons and needs 8 for a full shell.", "El cloro tiene 7 electrones de valencia y necesita 8 para completar su capa."),
      bi("Gaining one electron gives 17 protons and 18 electrons, so the chloride ion has a charge of −1.", "Al ganar un electrón tiene 17 protones y 18 electrones, así que el ion cloruro tiene carga −1."),
    ),
    e(
      bi("Why do atoms form chemical bonds?", "¿Por qué los átomos forman enlaces químicos?"),
      bi("To reach a more stable arrangement of outer electrons, often a full outer shell", "Para llegar a un arreglo más estable de electrones externos, muchas veces una capa externa llena"),
      [
        m("moves-protons", "To gain more protons", "Para ganar más protones"),
        m("confused-with-nuclear", "To turn into a different element", "Para convertirse en otro elemento"),
        m("invented-reason", "To become bigger atoms", "Para volverse átomos más grandes"),
      ],
      bi("Noble gases already have full outer shells, and they rarely bond.", "Los gases nobles ya tienen la capa externa llena, y casi nunca se enlazan."),
      bi("Bonding lets atoms gain, lose, or share electrons until their outer shells are full, which lowers their energy and makes them more stable.", "Al enlazarse, los átomos ganan, pierden o comparten electrones hasta completar su capa externa, lo que baja su energía y los hace más estables."),
    ),
    e(
      bi("Table salt melts at a very high temperature and conducts electricity when it is dissolved in water. What kind of bonds does it have?", "La sal de mesa se funde a una temperatura muy alta y conduce la electricidad cuando está disuelta en agua. ¿Qué tipo de enlaces tiene?"),
      IONIC,
      [mx("ionic-covalent-mixup", COVALENT), mx("covalent-metallic-mixup", METALLIC)],
      bi("Charged particles that can move carry electric current.", "Las partículas con carga que se pueden mover llevan la corriente eléctrica."),
      bi("Salt is made of Na⁺ and Cl⁻ ions held strongly together. Dissolved, the ions move freely and carry current.", "La sal está formada por iones Na⁺ y Cl⁻ unidos con fuerza. Al disolverse, los iones se mueven con libertad y llevan corriente."),
    ),
    e(
      bi("Sugar melts at a much lower temperature than salt, and sugar water does not conduct electricity. What kind of bonds does sugar have?", "El azúcar se funde a una temperatura mucho más baja que la sal, y el agua con azúcar no conduce la electricidad. ¿Qué tipo de enlaces tiene el azúcar?"),
      COVALENT,
      [mx("ionic-covalent-mixup", IONIC), mx("covalent-metallic-mixup", METALLIC)],
      bi("Dissolved sugar makes no charged particles.", "El azúcar disuelto no forma partículas con carga."),
      bi("Sugar is made of covalent molecules. They dissolve whole, without forming ions, so the solution does not conduct.", "El azúcar está formado por moléculas covalentes. Se disuelven enteras, sin formar iones, así que la disolución no conduce."),
    ),
    e(
      bi("How many electrons are shared in a double covalent bond?", "¿Cuántos electrones se comparten en un enlace covalente doble?"),
      bi("4 (two pairs)", "4 (dos pares)"),
      [m("counted-pairs-not-electrons", "2", "2"), m("counted-full-shell", "8", "8"), m("counted-pairs-not-electrons", "1", "1")],
      bi("A single bond is one shared pair.", "Un enlace sencillo es un par compartido."),
      bi("Each bond is one pair, or 2 electrons, so a double bond shares 2 pairs, which is 4 electrons.", "Cada enlace es un par, o 2 electrones, así que un enlace doble comparte 2 pares, que son 4 electrones."),
    ),
    e(
      bi("How are the two atoms held together in a molecule of oxygen gas (O₂)?", "¿Cómo se mantienen unidos los dos átomos de una molécula de oxígeno gaseoso (O₂)?"),
      bi("By a double covalent bond", "Por un enlace covalente doble"),
      [
        m("ionic-covalent-mixup", "By an ionic bond", "Por un enlace iónico"),
        m("bond-order-mixup", "By a single covalent bond", "Por un enlace covalente sencillo"),
        m("ignores-bond", "They are not bonded at all", "No están enlazados"),
      ],
      bi("Each oxygen atom has 6 valence electrons and needs 2 more.", "Cada átomo de oxígeno tiene 6 electrones de valencia y necesita 2 más."),
      bi("Two identical atoms cannot transfer electrons to each other, so they share. Sharing two pairs gives each oxygen a full outer shell.", "Dos átomos iguales no se pueden transferir electrones, así que los comparten. Al compartir dos pares, cada oxígeno completa su capa externa."),
    ),
    e(
      bi("What holds the atoms together in a piece of copper?", "¿Qué mantiene unidos a los átomos de un trozo de cobre?"),
      bi("Metallic bonds: positive ions in a sea of shared electrons", "Enlaces metálicos: iones positivos en un mar de electrones compartidos"),
      [
        m("metallic-ionic-mixup", "Ionic bonds between copper ions and chloride ions", "Enlaces iónicos entre iones de cobre e iones cloruro"),
        m("covalent-metallic-mixup", "Covalent bonds in small separate molecules", "Enlaces covalentes en moléculas pequeñas separadas"),
        m("invented-reason", "Magnetism between the atoms", "El magnetismo entre los átomos"),
      ],
      bi("The electrons that move freely through copper also explain why it conducts electricity.", "Los electrones que se mueven con libertad por el cobre también explican por qué conduce la electricidad."),
      bi("In a metal, outer electrons are shared by all the atoms and move freely, holding the positive ions together.", "En un metal, los electrones externos los comparten todos los átomos y se mueven con libertad, manteniendo unidos a los iones positivos."),
    ),
    e(
      bi("Magnesium is in group 2. How many electrons does a magnesium atom usually lose to form an ion?", "El magnesio está en el grupo 2. ¿Cuántos electrones suele perder un átomo de magnesio para formar un ion?"),
      bi("2", "2"),
      [m("gains-instead-of-loses", "6", "6"), m("group-mixup", "1", "1"), m("used-atomic-number", "12", "12")],
      bi("Metals lose all of their valence electrons, leaving the full shell underneath.", "Los metales pierden todos sus electrones de valencia y queda la capa llena de abajo."),
      bi("Losing its 2 valence electrons leaves magnesium with a full shell, forming the Mg²⁺ ion.", "Al perder sus 2 electrones de valencia, el magnesio queda con una capa llena y forma el ion Mg²⁺."),
    ),
    e(
      bi("Oxygen has 6 valence electrons. How many electrons does an oxygen atom usually gain to form an ion?", "El oxígeno tiene 6 electrones de valencia. ¿Cuántos electrones suele ganar un átomo de oxígeno para formar un ion?"),
      bi("2", "2"),
      [m("counted-valence-as-charge", "6", "6"), m("used-group-number", "16", "16"), m("counted-full-shell", "8", "8")],
      bi("A full outer shell holds 8 electrons.", "Una capa externa llena tiene 8 electrones."),
      bi("Oxygen needs 8 − 6 = 2 more electrons, so it gains 2 and forms the O²⁻ ion.", "Al oxígeno le faltan 8 − 6 = 2 electrones, así que gana 2 y forma el ion O²⁻."),
    ),
  ],
};

// ── s.nuclear ───────────────────────────────────────────────────────────────────────────────────

const ALPHA = bi("Alpha particles", "Partículas alfa");
const BETA = bi("Beta particles", "Partículas beta");
const GAMMA = bi("Gamma rays", "Rayos gamma");

export const NUCLEAR: Bank = {
  nudge: bi("Is something happening to the nucleus, or only to the electrons?", "¿Le pasa algo al núcleo o solo a los electrones?"),
  strategy: bi(
    "Nuclear reactions change the nucleus and can turn one element into another. Fission splits a heavy nucleus; fusion joins light nuclei. Both turn a tiny amount of mass into a large amount of energy. Chemical reactions only rearrange electrons and atoms.",
    "Las reacciones nucleares cambian el núcleo y pueden convertir un elemento en otro. La fisión divide un núcleo pesado; la fusión une núcleos ligeros. Las dos convierten una cantidad diminuta de masa en una gran cantidad de energía. Las reacciones químicas solo reacomodan electrones y átomos.",
  ),
  seconds: 25,
  items: [
    e(
      bi("What is nuclear fission?", "¿Qué es la fisión nuclear?"),
      bi("A heavy nucleus splits into smaller nuclei and releases energy.", "Un núcleo pesado se divide en núcleos más pequeños y libera energía."),
      [
        m("fission-fusion-mixup", "Two light nuclei join to make a heavier one.", "Dos núcleos ligeros se unen para formar uno más pesado."),
        m("chemical-vs-nuclear", "An atom loses some of its electrons.", "Un átomo pierde algunos de sus electrones."),
        m("chemical-vs-nuclear", "Molecules break apart in a chemical reaction.", "Unas moléculas se separan en una reacción química."),
      ],
      bi("Think of the word fissure, a split or crack.", "Piensa en la palabra fisura, una grieta o división."),
      bi("In fission, a large nucleus such as uranium-235 absorbs a neutron and splits into two smaller nuclei, releasing energy and more neutrons.", "En la fisión, un núcleo grande como el uranio-235 absorbe un neutrón y se divide en dos núcleos más pequeños, liberando energía y más neutrones."),
    ),
    e(
      bi("What is nuclear fusion?", "¿Qué es la fusión nuclear?"),
      bi("Light nuclei join to form a heavier nucleus and release energy.", "Núcleos ligeros se unen para formar un núcleo más pesado y liberan energía."),
      [
        m("fission-fusion-mixup", "A heavy nucleus splits apart.", "Un núcleo pesado se divide."),
        m("chemical-vs-nuclear", "Two atoms share electrons.", "Dos átomos comparten electrones."),
        m("chemical-vs-nuclear", "A solid melts into a liquid.", "Un sólido se derrite y se vuelve líquido."),
      ],
      bi("To fuse means to join together.", "Fusionar significa unir."),
      bi("In fusion, small nuclei such as hydrogen join into a larger nucleus such as helium, releasing a great deal of energy.", "En la fusión, núcleos pequeños como los de hidrógeno se unen en un núcleo más grande como el de helio, liberando muchísima energía."),
    ),
    e(
      bi("What process powers the Sun?", "¿Qué proceso le da energía al Sol?"),
      bi("Fusion of hydrogen into helium", "La fusión de hidrógeno en helio"),
      [
        m("fission-fusion-mixup", "Fission of uranium", "La fisión del uranio"),
        m("chemical-vs-nuclear", "Burning of coal", "La combustión de carbón"),
        m("chemical-vs-nuclear", "Chemical reactions with oxygen", "Reacciones químicas con oxígeno"),
      ],
      bi("The Sun is made mostly of hydrogen, crushed and heated in its core.", "El Sol está hecho sobre todo de hidrógeno, aplastado y calentado en su núcleo."),
      bi("In the Sun's core, extreme heat and pressure fuse hydrogen nuclei into helium, turning a little mass into the energy we see as sunlight.", "En el núcleo del Sol, el calor y la presión extremos fusionan núcleos de hidrógeno en helio y convierten un poco de masa en la energía que vemos como luz solar."),
    ),
    e(
      bi("Which process do today's nuclear power plants use to make electricity?", "¿Qué proceso usan las plantas nucleares actuales para producir electricidad?"),
      bi("Fission of uranium", "La fisión del uranio"),
      [
        m("fission-fusion-mixup", "Fusion of hydrogen", "La fusión del hidrógeno"),
        m("chemical-vs-nuclear", "Burning natural gas", "La combustión de gas natural"),
      ],
      bi("Controlled fusion power is still being researched.", "La energía de fusión controlada todavía se está investigando."),
      bi("Power plants split uranium nuclei. The heat boils water into steam, which spins turbines to make electricity.", "Las plantas dividen núcleos de uranio. El calor hierve agua y la convierte en vapor, que hace girar turbinas para producir electricidad."),
    ),
    e(
      bi("In a nuclear reaction, where does the released energy come from?", "En una reacción nuclear, ¿de dónde viene la energía que se libera?"),
      bi("A tiny amount of mass is changed into energy.", "Una cantidad diminuta de masa se convierte en energía."),
      [
        m("chemical-vs-nuclear", "Electrons jumping between atoms", "Electrones que saltan entre átomos"),
        m("invented-source", "Sunlight stored in the fuel", "Luz del Sol guardada en el combustible"),
        m("invented-source", "Friction between atoms", "La fricción entre los átomos"),
      ],
      bi("Einstein's equation E = mc² links mass and energy.", "La ecuación de Einstein E = mc² relaciona la masa y la energía."),
      bi("The products of a nuclear reaction have slightly less mass than the starting nuclei. The missing mass becomes energy, by E = mc².", "Los productos de una reacción nuclear tienen un poco menos de masa que los núcleos iniciales. La masa que falta se convierte en energía, según E = mc²."),
    ),
    e(
      bi("Why does fusion happen in the core of the Sun but not in a glass of water?", "¿Por qué ocurre la fusión en el núcleo del Sol pero no en un vaso de agua?"),
      bi("Fusion needs extremely high temperature and pressure to push nuclei together.", "La fusión necesita temperaturas y presiones altísimas para juntar los núcleos."),
      [
        m("invented-reason", "Water has no nuclei.", "El agua no tiene núcleos."),
        m("fission-fusion-mixup", "Fusion works only with uranium.", "La fusión solo funciona con uranio."),
      ],
      bi("Nuclei are all positive, so they push each other away.", "Todos los núcleos son positivos, así que se repelen."),
      bi("Only at millions of degrees and huge pressure do nuclei move fast enough to overcome their repulsion and fuse.", "Solo a millones de grados y con una presión enorme los núcleos se mueven tan rápido que vencen su repulsión y se fusionan."),
    ),
    e(
      bi("Which type of radiation is made of particles that are helium nuclei, 2 protons and 2 neutrons?", "¿Qué tipo de radiación está formada por partículas que son núcleos de helio, 2 protones y 2 neutrones?"),
      ALPHA,
      [mx("radiation-type-mixup", BETA), mx("radiation-type-mixup", GAMMA)],
      bi("It is the heaviest and slowest of the three.", "Es la más pesada y lenta de las tres."),
      bi("Alpha particles are helium nuclei. Beta particles are fast electrons, and gamma rays are high-energy light.", "Las partículas alfa son núcleos de helio. Las partículas beta son electrones rápidos, y los rayos gamma son luz de alta energía."),
    ),
    e(
      bi("Which type of radiation is the most penetrating and needs thick lead or concrete to block it?", "¿Qué tipo de radiación es la más penetrante y necesita plomo o concreto grueso para bloquearla?"),
      GAMMA,
      [mx("radiation-type-mixup", ALPHA), mx("radiation-type-mixup", BETA)],
      bi("It has no mass and no charge.", "No tiene masa ni carga."),
      bi("Gamma rays are high-energy electromagnetic waves, so they pass through most materials. Alpha is stopped by paper, and beta by thin metal.", "Los rayos gamma son ondas electromagnéticas de alta energía, así que atraviesan la mayoría de los materiales. La alfa se detiene con papel, y la beta con metal delgado."),
    ),
    e(
      bi("Which type of radiation can be stopped by a sheet of paper?", "¿Qué tipo de radiación se puede detener con una hoja de papel?"),
      ALPHA,
      [mx("radiation-type-mixup", GAMMA), mx("radiation-type-mixup", BETA)],
      bi("The heaviest particles with the biggest charge run into atoms quickly.", "Las partículas más pesadas y con mayor carga chocan pronto con los átomos."),
      bi("Alpha particles are large and charged, so they lose their energy fast and are stopped by paper or the outer layer of skin.", "Las partículas alfa son grandes y tienen carga, así que pierden su energía rápido y las detiene el papel o la capa externa de la piel."),
    ),
    e(
      bi("A uranium-238 nucleus gives off an alpha particle. What happens to it?", "Un núcleo de uranio-238 emite una partícula alfa. ¿Qué le pasa?"),
      bi("It becomes a different element, thorium-234.", "Se convierte en otro elemento, el torio-234."),
      [
        m("ignores-transmutation", "It stays uranium but gets heavier.", "Sigue siendo uranio, pero más pesado."),
        m("transmutation-direction", "It becomes uranium-239.", "Se convierte en uranio-239."),
        m("skips-decay-chain", "It turns straight into lead.", "Se convierte directamente en plomo."),
      ],
      bi("An alpha particle carries away 2 protons and 2 neutrons.", "Una partícula alfa se lleva 2 protones y 2 neutrones."),
      bi("Losing 2 protons changes the atomic number from 92 to 90 (thorium), and losing 4 mass units changes 238 to 234.", "Perder 2 protones cambia el número atómico de 92 a 90 (torio), y perder 4 unidades de masa cambia 238 a 234."),
    ),
    e(
      bi("What is a chain reaction in nuclear fission?", "¿Qué es una reacción en cadena en la fisión nuclear?"),
      bi("Neutrons released by one split cause more nuclei to split.", "Los neutrones que libera una división hacen que se dividan más núcleos."),
      [
        m("chemical-vs-nuclear", "Electrons pass from atom to atom like a chain.", "Los electrones pasan de un átomo a otro como una cadena."),
        m("fission-fusion-mixup", "Fission and fusion take turns.", "La fisión y la fusión se turnan."),
        m("chemical-vs-nuclear", "The fuel burns like a fuse.", "El combustible arde como una mecha."),
      ],
      bi("Each fission of uranium-235 gives off 2 or 3 neutrons.", "Cada fisión de uranio-235 libera 2 o 3 neutrones."),
      bi("The freed neutrons hit other uranium nuclei and split them. Power plants use control rods to absorb extra neutrons and keep the reaction steady.", "Los neutrones liberados chocan con otros núcleos de uranio y los dividen. Las plantas usan barras de control que absorben neutrones de más y mantienen estable la reacción."),
    ),
    e(
      bi("What is a major challenge of fission power plants?", "¿Cuál es un gran desafío de las plantas de energía por fisión?"),
      bi("Used fuel stays radioactive for thousands of years and must be stored safely.", "El combustible usado sigue siendo radiactivo por miles de años y debe guardarse con seguridad."),
      [
        m("chemical-vs-nuclear", "They release large amounts of carbon dioxide while running.", "Liberan grandes cantidades de dióxido de carbono mientras funcionan."),
        m("chemical-vs-nuclear", "They use up the oxygen in the air.", "Gastan el oxígeno del aire."),
      ],
      bi("The products of fission are themselves radioactive.", "Los productos de la fisión también son radiactivos."),
      bi("Fission plants release almost no carbon dioxide while running, but their used fuel holds long-lived radioactive isotopes that need safe storage.", "Las plantas de fisión casi no liberan dióxido de carbono mientras funcionan, pero su combustible usado tiene isótopos radiactivos de larga vida que necesitan un almacenamiento seguro."),
    ),
    e(
      bi("Which change can happen in a nuclear reaction but never in a chemical reaction?", "¿Qué cambio puede ocurrir en una reacción nuclear pero nunca en una reacción química?"),
      bi("One element changes into another.", "Un elemento se convierte en otro."),
      [
        m("chemical-vs-nuclear", "New substances form.", "Se forman sustancias nuevas."),
        m("chemical-vs-nuclear", "Energy is released.", "Se libera energía."),
        m("chemical-vs-nuclear", "Bonds between atoms break.", "Se rompen enlaces entre átomos."),
      ],
      bi("An element is set by the number of protons in its nucleus.", "Un elemento está definido por el número de protones de su núcleo."),
      bi("Chemical reactions rearrange atoms but never change their nuclei. Nuclear reactions change the number of protons, making a new element.", "Las reacciones químicas reacomodan los átomos pero nunca cambian sus núcleos. Las reacciones nucleares cambian el número de protones y forman un elemento nuevo."),
    ),
    e(
      bi("Doctors give patients tiny amounts of radioactive isotopes such as technetium-99m. What is the main reason?", "Los médicos dan a sus pacientes cantidades diminutas de isótopos radiactivos como el tecnecio-99m. ¿Cuál es la razón principal?"),
      bi("To make images of organs inside the body", "Para obtener imágenes de los órganos dentro del cuerpo"),
      [
        m("invented-use", "To make the patient's bones stronger", "Para fortalecer los huesos del paciente"),
        m("invented-use", "To cool the patient's body", "Para enfriar el cuerpo del paciente"),
        m("invented-use", "To give the patient more energy", "Para darle más energía al paciente"),
      ],
      bi("The isotope gives off gamma rays that a special camera can detect.", "El isótopo emite rayos gamma que una cámara especial puede detectar."),
      bi("Technetium-99m collects in certain organs and gives off gamma rays, so doctors can see how the organs are working. Its short half-life limits the dose.", "El tecnecio-99m se acumula en ciertos órganos y emite rayos gamma, así que los médicos pueden ver cómo funcionan. Su vida media corta limita la dosis."),
    ),
  ],
};
