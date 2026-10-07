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
      scenes: [],
    },
    {
      id: "conservation-of-mass",
      title: "Atoms are not lost",
      summary: "In a chemical change, atoms rearrange but are not created or destroyed, so the total mass in a closed container stays the same.",
      minutes: 14,
      scenes: [],
    },
    {
      id: "everyday-reactions",
      title: "Reactions in everyday life",
      summary: "Cooking, rusting, digestion and batteries: chemical changes you can find around you.",
      minutes: 12,
      scenes: [],
    },
  ],
};

export default changes;
