import type { CatalogueEntry } from "./types";

const atoms: CatalogueEntry = {
  id: "science-atoms",
  title: "Atoms and the periodic table",
  summary: "Look inside atoms, use protons and neutrons to identify elements, read the patterns in the periodic table, and count the atoms in a formula.",
  subject: "science",
  grade: "8",
  locale: "en",
  lessons: [
    {
      id: "inside-atom",
      title: "Inside an atom",
      summary: "Protons, neutrons and electrons: where they are, what charge they carry, and how much mass they have.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Three particles",
          blocks: [
            {
              type: "text",
              text: "All matter, from air to rock to you, is made of atoms. Atoms are far too small to see. A single human hair is hundreds of thousands of atoms wide.",
            },
            {
              type: "points",
              items: [
                "Protons: in the nucleus, the atom's center, with a positive charge (+1).",
                "Neutrons: in the nucleus, with no charge.",
                "Electrons: moving around the nucleus in a cloud, with a negative charge (−1).",
              ],
            },
            {
              type: "visual",
              visual: { kind: "dots", groups: [6, 6] },
              alt: "Two groups of 6 counters: the 6 protons and the 6 neutrons packed into the nucleus of a carbon atom.",
            },
            {
              type: "text",
              text: "A proton and a neutron have about the same mass. An electron is far lighter, about 1/1,800 of a proton's mass. So almost all of an atom's mass is in its nucleus.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Mostly empty space",
          blocks: [
            {
              type: "text",
              text: "The nucleus is tiny compared with the whole atom. If an atom were the size of a football stadium, its nucleus would be about the size of a pea in the middle.",
            },
            {
              type: "text",
              text: "The rest is the space where the electrons move. Electrons don't follow neat paths like planets. They are spread out in a cloud, more likely to be found in some places than in others.",
            },
            {
              type: "text",
              text: "In a neutral atom, the number of electrons equals the number of protons, so the positive and negative charges cancel out.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Proton, neutron or electron?",
          prompt: "Sort each clue. Which particle does it describe?",
          widget: {
            kind: "sorter",
            categories: ["Proton", "Neutron", "Electron"],
            items: [
              { id: "positive", text: "Has a positive charge", answer: 0 },
              { id: "element", text: "Its number decides which element the atom is", answer: 0 },
              { id: "neutral", text: "Has no charge", answer: 1 },
              { id: "isotope", text: "Adding one makes a heavier version of the same element", answer: 1 },
              { id: "negative", text: "Has a negative charge", answer: 2 },
              { id: "cloud", text: "Moves in a cloud around the nucleus", answer: 2 },
              { id: "light", text: "Has far less mass than the other two", answer: 2 },
            ],
          },
        },
        {
          id: "s4",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Which two particles are found in the nucleus?",
              choices: ["Protons and electrons", "Protons and neutrons", "Neutrons and electrons"],
              answer: 1,
              hint: "Electrons are in the cloud around the nucleus.",
              explain: "The nucleus holds the protons and neutrons. The electrons move in a cloud around it.",
            },
            {
              id: "q2",
              prompt: "An atom has 9 protons and 9 electrons. What is its overall charge?",
              choices: ["+9", "−9", "0: it is neutral"],
              answer: 2,
              hint: "Each proton is +1 and each electron is −1.",
              explain: "9 positive charges and 9 negative charges cancel out, so the atom has no overall charge.",
            },
            {
              id: "q3",
              prompt: "Where is almost all of an atom's mass?",
              choices: ["In the electron cloud", "In the nucleus", "Spread evenly through the atom"],
              answer: 1,
              hint: "Compare the mass of an electron with the mass of a proton.",
              explain: "Protons and neutrons are each about 1,800 times heavier than an electron, and they are packed in the nucleus. So almost all the mass is there.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Build two atoms",
          brief: "Model atoms with things from around the house. You need a plate and three kinds of small objects, like dried beans, buttons and paper clips.",
          steps: [
            "Choose which object stands for protons, which for neutrons, and which for electrons.",
            "Build a carbon atom: put 6 protons and 6 neutrons together in the middle of the plate. Spread 6 electrons around the edge.",
            "Build an oxygen atom next to it: 8 protons, 8 neutrons and 8 electrons.",
            "Check each model: are the protons and electrons equal in number, so the atom is neutral?",
            "Explain one way your model is not like a real atom. Think about size and empty space.",
          ],
        },
      ],
    },
    {
      id: "atomic-number",
      title: "Atomic number and mass number",
      summary: "Use the number of protons to name an element, and the mass number to count its neutrons.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "The atomic number",
          blocks: [
            { type: "text", text: "The number of protons in an atom is its atomic number. It decides which element the atom is." },
            {
              type: "visual",
              visual: { kind: "number-line", min: 0, max: 20, marks: [1, 6, 8, 11, 17] },
              alt: "A number line of atomic numbers from 0 to 20, with marks at 1 for hydrogen, 6 for carbon, 8 for oxygen, 11 for sodium and 17 for chlorine.",
            },
            {
              type: "points",
              items: [
                "Every hydrogen atom has 1 proton.",
                "Every carbon atom has 6 protons.",
                "Every oxygen atom has 8 protons.",
                "Every gold atom has 79 protons.",
              ],
            },
            { type: "text", text: "Change the number of protons and you have a different element." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "The mass number",
          blocks: [
            { type: "text", text: "The mass number is the number of protons plus the number of neutrons in the nucleus." },
            { type: "text", text: "To find the neutrons, subtract: neutrons = mass number − atomic number." },
            {
              type: "points",
              items: [
                "Carbon-12: 6 protons, so 12 − 6 = 6 neutrons.",
                "Sodium-23: 11 protons, so 23 − 11 = 12 neutrons.",
                "Chlorine-35: 17 protons, so 35 − 17 = 18 neutrons.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Count the neutrons",
          prompt: "An aluminum atom has atomic number 13 and mass number 27. How many neutrons does it have? Move the marker.",
          widget: { kind: "number-line", min: 0, max: 30, step: 1, start: 0, target: 14 },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Isotopes",
          blocks: [
            {
              type: "text",
              text: "Atoms of the same element always have the same number of protons, but they can have different numbers of neutrons. These versions are called isotopes.",
            },
            {
              type: "points",
              items: [
                "Carbon-12 has 6 protons and 6 neutrons. Almost all carbon is carbon-12.",
                "Carbon-14 has 6 protons and 8 neutrons. It is rare, and it slowly breaks down, which lets scientists find the age of old bones and wood.",
              ],
            },
            { type: "text", text: "Both are carbon, because both have 6 protons." },
            {
              type: "text",
              text: "The atomic mass printed on a periodic table, such as 35.45 for chlorine, is an average over the element's isotopes. That is why it is often not a whole number.",
            },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Carbon or not?",
          prompt: "Each line describes the nucleus of an atom. Sort them: is the atom carbon, or a different element?",
          widget: {
            kind: "sorter",
            categories: ["Carbon", "Not carbon"],
            items: [
              { id: "c12", text: "6 protons, 6 neutrons", answer: 0 },
              { id: "c13", text: "6 protons, 7 neutrons", answer: 0 },
              { id: "c14", text: "6 protons, 8 neutrons", answer: 0 },
              { id: "n14", text: "7 protons, 7 neutrons", answer: 1 },
              { id: "o14", text: "8 protons, 6 neutrons", answer: 1 },
              { id: "b11", text: "5 protons, 6 neutrons", answer: 1 },
            ],
          },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "An atom has 17 protons and 18 neutrons. What is its mass number?",
              choices: ["17", "18", "35", "1"],
              answer: 2,
              hint: "The mass number counts the particles in the nucleus.",
              explain: "Mass number = protons + neutrons = 17 + 18 = 35. This atom is chlorine-35.",
            },
            {
              id: "q2",
              prompt: "Potassium has atomic number 19. How many neutrons are in potassium-40, a rare isotope found in tiny amounts in bananas?",
              choices: ["19", "21", "40", "59"],
              answer: 1,
              hint: "Neutrons = mass number − atomic number.",
              explain: "40 − 19 = 21. Every potassium atom has 19 protons, and potassium-40 has 21 neutrons.",
            },
            {
              id: "q3",
              prompt: "Two atoms both have 8 protons. One has 8 neutrons and the other has 10. What are they?",
              choices: ["Two different elements", "Two isotopes of the same element, oxygen", "One atom of oxygen and one of neon"],
              answer: 1,
              hint: "Which number decides the element?",
              explain: "Both have 8 protons, so both are oxygen. Different numbers of neutrons make them different isotopes: oxygen-16 and oxygen-18.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Element cards",
          brief: "Make a deck of element cards and use it to quiz someone. You need 6 index cards and a periodic table from a book or the internet.",
          steps: [
            "Pick 6 elements with atomic numbers from 1 to 20.",
            "On the front of each card, write the symbol, the name and the atomic number.",
            "Round the atomic mass to the nearest whole number. For these 20 elements, that gives the mass number of the most common isotope. Write it on the front too.",
            "On the back, write how many protons, neutrons and electrons a neutral atom of that isotope has.",
            "Quiz someone at home: show the front, and have them work out the back.",
          ],
        },
      ],
    },
    {
      id: "periodic-table",
      title: "The periodic table",
      summary: "How the table is arranged, why Mendeleev left gaps, and what an element's place tells you about it.",
      minutes: 16,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "A table with a pattern",
          blocks: [
            {
              type: "text",
              text: "Scientists know of 118 elements. The periodic table arranges them in order of atomic number, from hydrogen (1) to oganesson (118).",
            },
            {
              type: "points",
              items: [
                "Each row is a period. There are 7 of them.",
                "Each column is a group. There are 18 of them.",
                "Elements in the same group have similar properties.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Mendeleev's gaps",
          blocks: [
            {
              type: "text",
              text: "In 1869, Dmitri Mendeleev arranged the elements known at the time into a table by their mass and by how they behaved. He saw a repeating pattern.",
            },
            {
              type: "text",
              text: "Where no known element fit, he left a gap and predicted that an element would be found to fill it. He even predicted its properties. Gallium, found in 1875, and germanium, found in 1886, matched his predictions closely.",
            },
            { type: "text", text: "A strong scientific idea makes predictions that can be tested. Mendeleev's table passed the test." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Metals, nonmetals and metalloids",
          blocks: [
            {
              type: "points",
              items: [
                "Metals fill the left side and the middle. Most are shiny, bend without breaking, and conduct heat and electricity well. Iron, copper and gold are metals.",
                "Nonmetals sit on the right, plus hydrogen. Many are gases, and the solid ones are dull and brittle. Oxygen, carbon and sulfur are nonmetals.",
                "Metalloids sit along a zigzag line between the two and have some properties of each. Silicon, used in computer chips, is a metalloid.",
              ],
            },
            { type: "text", text: "Mercury is the only metal that is liquid at room temperature." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Metal, metalloid or nonmetal?",
          prompt: "Sort each element.",
          widget: {
            kind: "sorter",
            categories: ["Metal", "Metalloid", "Nonmetal"],
            items: [
              { id: "copper", text: "Copper", answer: 0 },
              { id: "iron", text: "Iron", answer: 0 },
              { id: "sodium", text: "Sodium", answer: 0 },
              { id: "aluminum", text: "Aluminum", answer: 0 },
              { id: "silicon", text: "Silicon", answer: 1 },
              { id: "boron", text: "Boron", answer: 1 },
              { id: "oxygen", text: "Oxygen", answer: 2 },
              { id: "sulfur", text: "Sulfur", answer: 2 },
              { id: "neon", text: "Neon", answer: 2 },
            ],
          },
        },
        {
          id: "s5",
          kind: "slide",
          title: "Families that behave alike",
          blocks: [
            {
              type: "text",
              text: "Elements in the same group usually have the same number of electrons in their outer shell. Those outer electrons decide how an element reacts, which is why members of a group behave alike.",
            },
            {
              type: "points",
              items: [
                "Group 1, the alkali metals, such as lithium, sodium and potassium: soft metals that react strongly with water. Sodium and potassium are stored in oil to keep water and air away from them.",
                "Group 17, the halogens, such as fluorine and chlorine: very reactive nonmetals.",
                "Group 18, the noble gases, such as helium, neon and argon: their outer shells are full, so they almost never react.",
              ],
            },
          ],
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "In what order are the elements arranged in the modern periodic table?",
              choices: ["Alphabetical order", "By atomic number", "By the year they were discovered"],
              answer: 1,
              hint: "Which number tells you which element an atom is?",
              explain: "The table runs in order of atomic number, the number of protons: hydrogen 1, helium 2, lithium 3, and so on.",
            },
            {
              id: "q2",
              prompt: "Sodium reacts strongly with water. Potassium is in the same group. What would you predict about potassium?",
              choices: ["It doesn't react with water.", "It also reacts strongly with water.", "It is a gas at room temperature."],
              answer: 1,
              hint: "Elements in the same group behave alike.",
              explain:
                "Sodium and potassium are both alkali metals in group 1, each with one outer electron. Potassium also reacts strongly with water, even more strongly than sodium.",
            },
            {
              id: "q3",
              prompt: "Why did Mendeleev leave gaps in his table?",
              choices: ["He ran out of space.", "He predicted that undiscovered elements belonged there.", "Those elements were too dangerous to list."],
              answer: 1,
              hint: "Think about gallium and germanium.",
              explain: "Mendeleev left gaps for elements no one had found yet and predicted their properties. When gallium and germanium were discovered, they matched.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Elements at home",
          brief: "Find objects made mostly of a single element and place them on the periodic table. You need a periodic table and a notebook.",
          steps: [
            "Look for things made mostly of one element: aluminum foil, a piece of copper wire that isn't connected to anything, an iron nail, a pencil's graphite (carbon).",
            "For each one, find the element on the periodic table and write its symbol and atomic number.",
            "Decide whether each is a metal, metalloid or nonmetal, and give one property you can observe as evidence.",
            "Note where each one sits on the table: left, middle or right.",
            "Explain the pattern you found to someone at home.",
          ],
        },
      ],
    },
    {
      id: "compounds",
      title: "Elements, compounds and changes",
      summary: "How atoms bond into molecules and compounds, how to read a chemical formula, and why atoms are never lost in a reaction.",
      minutes: 16,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Atoms join together",
          blocks: [
            { type: "text", text: "Atoms can bond to each other. A group of atoms bonded together is called a molecule." },
            {
              type: "points",
              items: [
                "An element is made of only one kind of atom. Oxygen gas, O₂, is two oxygen atoms bonded together, but it is still an element.",
                "A compound is made of two or more different elements bonded together in a fixed ratio. Water, H₂O, is a compound.",
              ],
            },
            {
              type: "text",
              text: "A compound can be very different from the elements in it. Sodium is a soft metal that reacts violently with water. Chlorine is a poisonous yellow-green gas. Bonded together, they make sodium chloride: table salt.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Reading a formula",
          blocks: [
            {
              type: "text",
              text: "A chemical formula lists the elements in a substance by their symbols. A small number after a symbol, called a subscript, tells how many atoms of that element there are. No number means one.",
            },
            {
              type: "points",
              items: [
                "H₂O: 2 hydrogen atoms and 1 oxygen atom, 3 atoms in all.",
                "CO₂: 1 carbon atom and 2 oxygen atoms, 3 atoms in all.",
                "C₆H₁₂O₆, glucose: 6 carbon, 12 hydrogen and 6 oxygen atoms, 24 atoms in all.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Count the atoms",
          prompt: "Table sugar is sucrose, C₁₂H₂₂O₁₁. How many atoms are in one molecule of it? Move the marker.",
          widget: { kind: "number-line", min: 0, max: 50, step: 1, start: 0, target: 45 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Element or compound?",
          prompt: "Sort each substance. Is it an element or a compound?",
          widget: {
            kind: "sorter",
            categories: ["Element", "Compound"],
            items: [
              { id: "o2", text: "Oxygen gas, O₂", answer: 0 },
              { id: "au", text: "Gold, Au", answer: 0 },
              { id: "o3", text: "Ozone, O₃", answer: 0 },
              { id: "he", text: "Helium, He", answer: 0 },
              { id: "h2o", text: "Water, H₂O", answer: 1 },
              { id: "co2", text: "Carbon dioxide, CO₂", answer: 1 },
              { id: "nacl", text: "Table salt, NaCl", answer: 1 },
              { id: "sugar", text: "Table sugar, C₁₂H₂₂O₁₁", answer: 1 },
            ],
          },
        },
        {
          id: "s5",
          kind: "slide",
          title: "Changes and conservation",
          blocks: [
            {
              type: "text",
              text: "In a physical change, like melting ice or dissolving sugar, the molecules stay the same. Only their arrangement or spacing changes.",
            },
            {
              type: "text",
              text: "In a chemical change, bonds break and atoms rearrange into new substances. When methane gas burns: CH₄ + 2O₂ → CO₂ + 2H₂O.",
            },
            {
              type: "text",
              text: "No atoms are created or destroyed. The same atoms are there before and after, just arranged differently. So in a closed container, the total mass stays the same. This is the law of conservation of mass.",
            },
          ],
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "How many oxygen atoms are in one molecule of CO₂?",
              choices: ["1", "2", "3"],
              answer: 1,
              hint: "The subscript after a symbol tells how many atoms of that element there are.",
              explain: "CO₂ has 1 carbon atom and 2 oxygen atoms. The 2 belongs to the O.",
            },
            {
              id: "q2",
              prompt: "Which of these is an element, not a compound?",
              choices: ["H₂O", "NaCl", "N₂", "CO₂"],
              answer: 2,
              hint: "An element has only one kind of atom, even if there are two of them.",
              explain: "N₂ is two nitrogen atoms bonded together. It has only one kind of atom, so it is the element nitrogen. Each of the others contains two different elements.",
            },
            {
              id: "q3",
              prompt: "Wood burns inside a sealed jar. The ash left over weighs much less than the wood did. Where did the rest of the atoms go?",
              choices: [
                "The fire destroyed them.",
                "They are in the gases the burning made, such as carbon dioxide and water vapor, still inside the jar.",
                "They escaped through the glass.",
              ],
              answer: 1,
              hint: "Atoms are never created or destroyed in a chemical change.",
              explain:
                "Burning rearranges atoms. Many of them leave the wood as gases like carbon dioxide and water vapor. In a sealed jar, the total mass of everything inside stays the same.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Atoms in the kitchen",
          brief: "Count the atoms in kitchen substances, then watch one of them take part in a chemical change. You need baking soda, vinegar, a cup and a grown-up.",
          steps: [
            "Write down three kitchen formulas: water (H₂O), table salt (NaCl) and baking soda (NaHCO₃).",
            "For each formula, list the elements and count the atoms of each one.",
            "Add up the total number of atoms in one unit of each substance.",
            "With a grown-up, put a spoonful of baking soda in a cup over a sink and pour in some vinegar. Watch the bubbles.",
            "The bubbles are carbon dioxide, CO₂. Find the C and O atoms in baking soda that it came from, and explain why this is a chemical change.",
          ],
        },
      ],
    },
  ],
};

/** Practice on the skill map that fits each lesson (lesson id → skill ids). */
export const practice: Record<string, string[]> = {
  "inside-atom": ["s.atoms"],
  "atomic-number": ["s.atoms"],
  "periodic-table": ["s.atoms"],
  compounds: ["s.formula.atoms", "s.chem.phys"],
};

export default atoms;
