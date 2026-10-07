import type { CatalogueEntry } from "./types";

const changes: CatalogueEntry = {
  id: "science-changes",
  title: "Physical and chemical changes",
  summary: "Tell whether a change keeps the same substance or makes a new one, and use clues without mistaking them for proof.",
  subject: "science",
  grade: "7",
  locale: "en",
  lessons: [
    {
      id: "same-or-new",
      title: "Same substance or new substance?",
      summary: "A physical change keeps the same substance. A chemical change makes a new one.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Physical changes",
          blocks: [
            {
              type: "text",
              text: "A physical change alters a substance's size, shape or state, but it is still the same substance.",
            },
            {
              type: "visual",
              visual: { kind: "particles", state: "solid" },
              alt: "Particles in a solid: lined up in neat rows, each one held in place.",
            },
            {
              type: "visual",
              visual: { kind: "particles", state: "liquid" },
              alt: "Particles in a liquid: still close together, but jumbled and able to slide past one another.",
            },
            {
              type: "text",
              text: "When ice melts, its molecules move more freely, but each one is still a water molecule, H₂O. A molecule is a group of atoms bonded together.",
            },
          ],
        },
        {
          id: "s2",
          kind: "interactive",
          title: "Ice to water vapor",
          prompt: "Heat the ice until it becomes water vapor. Every step is a physical change: the molecules stay H₂O the whole time.",
          widget: { kind: "states-of-matter", startC: -20, target: "gas" },
        },
        {
          id: "s3",
          kind: "slide",
          title: "Chemical changes",
          blocks: [
            {
              type: "text",
              text: "In a chemical change, also called a chemical reaction, atoms rearrange to form new substances with different properties.",
            },
            {
              type: "points",
              items: [
                "Iron, oxygen and water react to form rust. Iron is gray and strong; rust is reddish-brown and crumbly.",
                "Burning wood produces ash, smoke, carbon dioxide and water vapor. Ash can't be turned back into wood.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "slide",
          title: "Clues, not proof",
          blocks: [
            { type: "text", text: "These signs often mean a chemical change has happened:" },
            {
              type: "points",
              items: [
                "A gas forms: bubbles or a new smell.",
                "The color changes.",
                "It gets warmer or colder on its own, or gives off light.",
                "A solid forms when two liquids are mixed. This solid is called a precipitate.",
              ],
            },
            {
              type: "text",
              text: "Signs are clues, not proof. Boiling water bubbles, and mixing blue and yellow paint makes green, but both are physical changes.",
            },
            { type: "text", text: "The real test is whether a new substance formed." },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Physical or chemical?",
          prompt: "Sort each change. Ask: is it still the same substance, or did a new one form?",
          widget: {
            kind: "sorter",
            categories: ["Physical change", "Chemical change"],
            items: [
              { id: "ice", text: "Melting ice", answer: 0 },
              { id: "rust", text: "Iron rusting", answer: 1 },
              { id: "paper", text: "Cutting paper", answer: 0 },
              { id: "cake", text: "Baking a cake", answer: 1 },
              { id: "sugar", text: "Dissolving sugar in water", answer: 0 },
              { id: "wood", text: "Burning wood", answer: 1 },
              { id: "boil", text: "Boiling water", answer: 0 },
              { id: "milk", text: "Milk going sour", answer: 1 },
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
              prompt: "When you stir sugar into water, the sugar seems to disappear. What kind of change is this?",
              choices: ["Physical: the sugar is still there, spread through the water", "Chemical: the sugar became a new substance"],
              answer: 0,
              hint: "If you let all the water evaporate, what would be left in the glass?",
              explain:
                "Dissolving is a physical change. The sugar molecules are still sugar; let the water evaporate and the sugar is left behind.",
            },
            {
              id: "q2",
              prompt: "Water in a pot bubbles as it boils. Is that a sign of a chemical change?",
              choices: ["Yes. Bubbles always mean a new substance formed.", "No. The bubbles are water vapor, so it's still water."],
              answer: 1,
              hint: "What is inside the bubbles? Is it a new substance, or water in a different state?",
              explain:
                "The bubbles are water vapor: water as a gas. No new substance forms, so boiling is a physical change. A clue like bubbles isn't proof on its own.",
            },
            {
              id: "q3",
              prompt: "A cut apple slice turns brown after sitting out. What kind of change is this?",
              choices: ["Physical", "Chemical"],
              answer: 1,
              hint: "Is the brown material the same substance as the fresh apple, or something new?",
              explain:
                "Chemicals in the apple react with oxygen in the air and form new brown substances. A new substance means a chemical change.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Two cups in the kitchen",
          brief: "Compare a physical change and a chemical change side by side. You need two clear cups, an ice cube, baking soda and vinegar.",
          steps: [
            "Put an ice cube in the first cup and let it melt. Write down what you see.",
            "With a grown-up, put a spoonful of baking soda in the second cup and pour in a few spoonfuls of vinegar. Do this over a sink or tray, since it can foam over.",
            "Record every clue you notice in the second cup: bubbles, sound, smell, or anything else that changes.",
            "Make a two-column table, Physical change and Chemical change. Put each cup in a column and list your evidence.",
            "Explain to your helper why the melted ice is still water, while the bubbles in the second cup are a new gas, carbon dioxide.",
          ],
        },
      ],
    },
    {
      id: "clues-and-tests",
      title: "Clues and tests",
      summary: "Use signs like gas, color change and temperature change as clues, then look for evidence of a new substance.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "A clue starts the investigation",
          blocks: [
            {
              type: "text",
              text: "A clue, such as bubbles or a color change, tells you a chemical change might have happened. It doesn't prove it.",
            },
            {
              type: "text",
              text: "To be sure, look for evidence of a new substance: something with different properties from what you started with.",
            },
            {
              type: "points",
              items: [
                "A property is a trait you can observe or measure, such as color, smell, melting point, or whether it dissolves in water.",
                "Each pure substance has its own set of properties, a bit like a fingerprint.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Clues that can fool you",
          blocks: [
            {
              type: "points",
              items: [
                "Opening a soda makes bubbles, but that carbon dioxide was already dissolved in the drink. No new substance forms.",
                "A toaster's wires glow orange and give off heat. When they cool, they're the same metal as before.",
                "A drop of food coloring turns water red. The dye just spreads out through the water.",
              ],
            },
            { type: "text", text: "Each one shows a clue: bubbles, light and heat, or a new color. Each one is still a physical change." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Looking for a new substance",
          blocks: [
            { type: "text", text: "Compare properties before and after the change." },
            {
              type: "points",
              items: [
                "Test the gas: a small flame held in the gas from baking soda and vinegar goes out. Ordinary air keeps it burning, so the gas is something new: carbon dioxide.",
                "Compare before and after: sugar is white, sweet and dissolves in water. Heated too long, it becomes a black solid that is none of those. That solid is mostly carbon.",
                "Try to reverse it: melted ice freezes back into ice, but burnt sugar never turns back into sugar. This is another clue, not a rule.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Clue or evidence?",
          prompt: "For each observation, decide: did a new substance form, or not?",
          widget: {
            kind: "sorter",
            categories: ["New substance", "No new substance"],
            items: [
              { id: "soda", text: "Bubbles rise when you open a bottle of soda.", answer: 1 },
              { id: "flame", text: "The gas from baking soda and vinegar puts out a small flame.", answer: 0 },
              { id: "sugar", text: "Heated sugar turns into a black solid that won't dissolve.", answer: 0 },
              { id: "toaster", text: "A toaster's wires glow orange.", answer: 1 },
              { id: "dye", text: "A drop of food coloring turns a glass of water red.", answer: 1 },
              { id: "ash", text: "A burned log leaves gray ash that won't burn.", answer: 0 },
              { id: "boil", text: "A pot of water bubbles as it boils.", answer: 1 },
            ],
          },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "A student drops a fizzing tablet into water and sees bubbles. What should she do before calling it a chemical change?",
              choices: [
                "Nothing. Bubbles prove a chemical change.",
                "Test the gas, or compare properties, to see whether a new substance formed.",
                "Stir the water faster.",
              ],
              answer: 1,
              hint: "An opened soda bubbles too, and that isn't a chemical change. What would tell the two apart?",
              explain:
                "Bubbles are only a clue, so she needs evidence of a new substance. Here she'd find it: the tablet's acid and baking soda react in water to make carbon dioxide.",
            },
            {
              id: "q2",
              prompt: "Which observation is the strongest evidence that a new substance formed?",
              choices: [
                "The mixture changed color.",
                "The mixture got warm.",
                "The solid left at the end melts at a different temperature than anything you started with.",
              ],
              answer: 2,
              hint: "Which choice compares a measured property before and after?",
              explain:
                "Color and temperature changes are clues. A different melting point means a substance with different properties, which is evidence that a new one formed.",
            },
            {
              id: "q3",
              prompt: "A cook heats sugar until it turns brown and smells like caramel. What is the best evidence that this is a chemical change?",
              choices: [
                "The sugar got hot.",
                "The caramel looks, tastes and smells different from sugar, and it stays caramel when it cools.",
                "The sugar melted into a liquid.",
              ],
              answer: 1,
              hint: "Getting hot and melting can both happen in a physical change.",
              explain:
                "Caramel has new properties, and cooling doesn't turn it back into white sugar. That is evidence of new substances; melting alone would be a physical change.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Three cups",
          brief: "Look for clues in three cups, then decide which one has evidence of a new substance.",
          steps: [
            "With a grown-up, set up three clear cups: water with a drop of food coloring, a freshly poured fizzy drink, and a spoonful of baking soda with a splash of vinegar.",
            "Watch for one minute. Write down every clue you notice in each cup: bubbles, color, smell or sound.",
            "Touch the outside of each cup. Note any that feel warmer or colder than the others.",
            "For each cup, decide: is there evidence of a new substance, or only a clue? Write your reason.",
            "Explain to your helper which cup made a new gas, and how you could test it.",
          ],
        },
      ],
    },
    {
      id: "conservation-of-mass",
      title: "Atoms are not lost",
      summary: "In a chemical change, atoms rearrange but are not created or destroyed, so the total mass in a closed container stays the same.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Rearranged, not lost",
          blocks: [
            {
              type: "text",
              text: "In a chemical change, the atoms of the starting substances rearrange to form new substances. No atoms are created, and none are destroyed.",
            },
            {
              type: "text",
              text: "This is the law of conservation of mass: in a closed system, the total mass before a change equals the total mass after it.",
            },
            {
              type: "points",
              items: [
                "Reactants: the substances you start with.",
                "Products: the new substances that form.",
                "Closed system: nothing can get in or out, not even a gas.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Counting atoms",
          blocks: [
            { type: "text", text: "Methane, the main gas in natural gas, burns in oxygen: CH₄ + 2 O₂ → CO₂ + 2 H₂O." },
            {
              type: "points",
              items: [
                "Before: 1 carbon atom, 4 hydrogen atoms and 4 oxygen atoms.",
                "After: 1 carbon atom, 4 hydrogen atoms and 4 oxygen atoms.",
                "The same atoms in new arrangements, so the same total mass.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Where did the mass go?",
          blocks: [
            {
              type: "text",
              text: "A campfire seems to lose mass: the ash left behind weighs much less than the wood. The missing mass went into the air as carbon dioxide and water vapor.",
            },
            {
              type: "text",
              text: "Trap every product, and the mass stays the same. Here, baking soda and vinegar react inside a sealed bottle on a scale.",
            },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 300], [1, 300], [2, 300], [3, 300], [4, 300]], xLabel: "Time (minutes)", yLabel: "Total mass (g)" },
              alt: "A line graph of the total mass of a sealed bottle during the reaction, from 0 to 4 minutes. The line stays flat at 300 grams the whole time.",
            },
            { type: "text", text: "Gas forms inside the bottle, but none escapes, so the total mass doesn't change." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Mass in a sealed bag",
          prompt:
            "In a sealed bag, 5 g of baking soda reacts with 50 g of vinegar. The bag puffs up with gas. What is the total mass of everything inside the bag afterward, in grams? Move the marker to your answer.",
          widget: { kind: "number-line", min: 50, max: 60, step: 1, start: 50, target: 55 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "An iron nail rusts, and the rusty nail weighs more than the clean nail did. Where did the extra mass come from?",
              choices: ["Atoms from oxygen and water in the air joined the iron.", "Rusting creates new atoms.", "Rust is lighter, so the scale must be wrong."],
              answer: 0,
              hint: "Rust forms from iron, oxygen and water. Where were the oxygen and water before?",
              explain:
                "Rust contains oxygen and hydrogen atoms that came from the air and moisture. The nail gained exactly the mass of those atoms; none were created.",
            },
            {
              id: "q2",
              prompt: "What is the best way to show that mass is conserved when baking soda and vinegar react?",
              choices: [
                "Weigh an open cup before and after.",
                "Weigh everything in a sealed bag before and after mixing.",
                "Weigh only the baking soda.",
              ],
              answer: 1,
              hint: "The reaction makes a gas. What happens to a gas in an open cup?",
              explain:
                "In an open cup, the carbon dioxide escapes and the mass seems to drop. A sealed bag keeps every atom inside, so the before and after masses match.",
            },
            {
              id: "q3",
              prompt: "How many oxygen atoms are on each side of 2 H₂ + O₂ → 2 H₂O?",
              choices: ["2 on the left, 1 on the right", "2 on each side", "1 on each side", "4 on each side"],
              answer: 1,
              hint: "Count the oxygen atoms in each molecule, then multiply by the number in front of it.",
              explain: "O₂ has 2 oxygen atoms, and 2 H₂O has 2 × 1 = 2. Both sides have 2, as conservation of mass requires.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Weigh a reaction",
          brief: "Test conservation of mass with a kitchen scale, a small plastic bottle, a balloon, baking soda and vinegar.",
          steps: [
            "Pour a few spoonfuls of vinegar into the bottle. Use a funnel or a rolled-up paper to put a spoonful of baking soda inside the balloon.",
            "Stretch the balloon over the bottle's mouth, letting it hang to the side so no baking soda falls in yet. Weigh everything together.",
            "Lift the balloon so the baking soda drops into the vinegar. When the fizzing stops, weigh everything again.",
            "Compare the two masses. If the full balloon reads a gram or so lighter, that's because the air around it pushes up on the bigger balloon. No mass was lost.",
            "Take the balloon off, let the gas escape, and weigh the bottle and balloon again. Explain to someone why the mass dropped this time.",
          ],
        },
      ],
    },
    {
      id: "everyday-reactions",
      title: "Reactions in everyday life",
      summary: "Cooking, rusting, digestion and batteries: chemical changes you can find around you.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "In the kitchen",
          blocks: [
            {
              type: "points",
              items: [
                "Toasting bread: sugars and proteins on the surface react and form new brown substances with new flavors.",
                "Baking: baking soda or baking powder reacts to make carbon dioxide. The gas bubbles make a cake rise.",
                "Cooking an egg: heat changes the proteins in the egg white, so it turns from clear and runny to white and firm. It can't turn back.",
              ],
            },
            { type: "text", text: "The same kitchen has physical changes too: chopping, melting butter and boiling water." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Rust and batteries",
          blocks: [
            {
              type: "points",
              items: [
                "Rusting: iron reacts with oxygen and water to form rust. Paint and oil slow it down by keeping water and air away from the iron.",
                "Batteries: chemicals inside react and push an electric current through a circuit. A battery dies when its reactants are used up.",
                "A rechargeable battery runs its reaction in reverse while it charges.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Inside you",
          blocks: [
            { type: "text", text: "Digestion uses chemical reactions to break food into smaller molecules your body can absorb." },
            { type: "text", text: "Many of these reactions need enzymes. An enzyme is a protein that speeds up one particular reaction." },
            {
              type: "points",
              items: [
                "Chewing tears food into smaller pieces. That part is a physical change.",
                "An enzyme in saliva starts breaking starch into sugar. Chew a plain cracker for a minute, and it starts to taste sweeter.",
                "In the stomach, acid and enzymes start breaking proteins apart.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Chemical or physical?",
          prompt: "Sort each everyday change. Is a new substance forming?",
          widget: {
            kind: "sorter",
            categories: ["Chemical change", "Physical change"],
            items: [
              { id: "toast", text: "Bread turning brown in a toaster", answer: 0 },
              { id: "butter", text: "Butter melting in a pan", answer: 1 },
              { id: "chain", text: "A bike chain rusting", answer: 0 },
              { id: "chew", text: "Teeth chewing a cracker into pieces", answer: 1 },
              { id: "saliva", text: "Saliva breaking starch into sugar", answer: 0 },
              { id: "battery", text: "A battery powering a flashlight", answer: 0 },
              { id: "freeze", text: "Water freezing into ice cubes", answer: 1 },
              { id: "cheese", text: "Grating a block of cheese", answer: 1 },
            ],
          },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Why does a cake rise in the oven?",
              choices: ["Heat makes the flour grow.", "Baking powder reacts and makes bubbles of carbon dioxide.", "The eggs melt."],
              answer: 1,
              hint: "Look for the choice that makes a gas.",
              explain: "Baking powder reacts when it gets wet and hot, making carbon dioxide. The gas bubbles get trapped in the batter and make it rise.",
            },
            {
              id: "q2",
              prompt: "Why does painting an iron fence help keep it from rusting?",
              choices: ["Paint keeps water and oxygen away from the iron.", "Paint turns iron into a different metal.", "Paint makes the fence colder."],
              answer: 0,
              hint: "Rusting needs iron plus two other things from the air around it.",
              explain: "Rusting needs iron, oxygen and water. Paint keeps water and oxygen from touching the iron, which slows the reaction.",
            },
            {
              id: "q3",
              prompt: "Which part of digestion is a physical change?",
              choices: [
                "Teeth chewing food into smaller pieces",
                "Saliva breaking starch into sugar",
                "Stomach acid and enzymes breaking down proteins",
              ],
              answer: 0,
              hint: "Which one changes only the size of the food, not the substances in it?",
              explain:
                "Chewing makes smaller pieces of the same food, so it's a physical change. Breaking starch and proteins into new, smaller molecules are chemical changes.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Reaction hunt",
          brief: "Find chemical changes that have already happened, or are happening, in your home.",
          steps: [
            "Look for at least five changes: rust on a tool, browned toast, a used-up battery, a banana with brown spots, or a burnt match.",
            "For each one, write what you see and whether it's a physical or a chemical change.",
            "For each chemical change, name your evidence of a new substance: a new color, smell or texture, or something that can't turn back.",
            "Chew a plain cracker for a full minute before you swallow. Write down whether the taste changes, and which reaction explains it.",
            "Pick one reaction from your list and explain it to someone at home.",
          ],
        },
      ],
    },
  ],
};

export default changes;
