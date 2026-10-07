import type { CatalogueEntry } from "./types";

const matter: CatalogueEntry = {
  id: "science-matter",
  title: "Solid, liquid, gas",
  summary: "Water can be ice, liquid water, or a gas you cannot see. Heating and cooling change it.",
  subject: "science",
  grade: "2",
  locale: "en",
  lessons: [
    {
      id: "three-states",
      title: "Solids, liquids and gases",
      summary: "A solid keeps its shape. A liquid flows. A gas spreads out.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "A solid keeps its shape",
          blocks: [
            { type: "text", text: "A solid keeps its own shape. A rock is a solid." },
            { type: "visual", visual: { kind: "particles", state: "solid" }, alt: "Small circles lined up in neat rows, all touching." },
            {
              type: "text",
              text: "Everything is made of tiny bits, too small to see. In a solid, the bits stay in place and wiggle.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "A liquid flows",
          blocks: [
            { type: "text", text: "A liquid flows. It takes the shape of its cup." },
            { type: "text", text: "Milk, juice and rain are liquids." },
            {
              type: "visual",
              visual: { kind: "particles", state: "liquid" },
              alt: "Small circles close together and touching, but jumbled, not in rows.",
            },
            { type: "text", text: "In a liquid, the bits stay close but slide past each other." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "A gas spreads out",
          blocks: [
            { type: "text", text: "A gas spreads out to fill all the space it has." },
            {
              type: "visual",
              visual: { kind: "particles", state: "gas" },
              alt: "A few small circles spread far apart, with lots of empty space between them.",
            },
            { type: "text", text: "In a gas, the bits are far apart. They move fast, all around." },
            {
              type: "points",
              items: ["The air around you is a gas.", "Water can turn into a gas called water vapor. You cannot see it."],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Melt the ice",
          prompt: "This water is frozen. Warm it up until it turns into a liquid.",
          widget: { kind: "states-of-matter", startC: -20, target: "liquid" },
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Make a gas",
          prompt: "Now heat the water until it turns into a gas.",
          widget: { kind: "states-of-matter", startC: 20, target: "gas" },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "In which one are the tiny bits far apart?",
              choices: ["Solid", "Liquid", "Gas"],
              answer: 2,
              hint: "Think of the picture where the bits had lots of space.",
              explain: "In a gas, the bits are far apart. That is why a gas spreads out.",
            },
            {
              id: "q2",
              prompt: "Which one keeps its own shape?",
              choices: ["Juice", "A wooden block", "Air"],
              answer: 1,
              hint: "Put each one in a bowl. Which one stays the same?",
              explain: "A wooden block is a solid, so it keeps its shape. Juice and air do not.",
            },
            {
              id: "q3",
              prompt: "An ice cube sits in a warm room. What does it turn into first?",
              choices: ["A liquid", "A gas", "It stays a solid"],
              answer: 0,
              hint: "Think about what is left in the dish after a while.",
              explain: "The warm room melts the ice. It turns into liquid water.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Watch water change",
          brief: "Follow one ice cube as it melts and then dries up.",
          steps: [
            "Put an ice cube on a plate. Look at its shape.",
            "Leave the plate in a warm spot. Check it every 10 minutes.",
            "When the ice has melted, tip the plate a little. Watch the water flow.",
            "Leave the plate out until the water is gone. It may take a day or two.",
            "Tell a grown-up where the water went.",
          ],
        },
      ],
    },
    {
      id: "sort-it",
      title: "Solid, liquid or gas?",
      summary: "Look at things around you and sort them.",
      minutes: 8,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Three questions",
          blocks: [
            { type: "text", text: "Ask these questions to sort anything." },
            {
              type: "points",
              items: [
                "Does it keep its own shape? It is a solid.",
                "Does it flow to the bottom of a cup? It is a liquid.",
                "Does it spread out to fill all the space? It is a gas.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "interactive",
          title: "Sort them",
          prompt: "Put each thing with solid, liquid or gas.",
          widget: {
            kind: "sorter",
            categories: ["Solid", "Liquid", "Gas"],
            items: [
              { id: "rock", text: "A rock", answer: 0 },
              { id: "milk", text: "Milk", answer: 1 },
              { id: "balloon", text: "Air in a balloon", answer: 2 },
              { id: "spoon", text: "A spoon", answer: 0 },
              { id: "honey", text: "Honey", answer: 1 },
              { id: "tire", text: "Air in a bike tire", answer: 2 },
              { id: "rain", text: "Rain", answer: 1 },
              { id: "ice", text: "An ice cube", answer: 0 },
            ],
          },
        },
        {
          id: "s3",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Honey is thick and slow. Is it a liquid?",
              choices: ["Yes", "No"],
              answer: 0,
              hint: "Tip the jar. Does honey keep its shape, or does it flow?",
              explain: "Honey flows and takes the shape of its jar. It is a liquid, just a slow one.",
            },
            {
              id: "q2",
              prompt: "You blow up a balloon. What fills it?",
              choices: ["A solid", "A liquid", "A gas"],
              answer: 2,
              hint: "You cannot see it, but you can feel it on your hand.",
              explain: "Your breath is air, and air is a gas. It spreads out to fill the balloon.",
            },
          ],
        },
      ],
    },
    {
      id: "melt-freeze",
      title: "Melting and freezing",
      summary: "Heat melts a solid into a liquid. Cold freezes it back.",
      minutes: 10,
      scenes: [],
    },
    {
      id: "not-just-water",
      title: "Not just water",
      summary: "Butter, chocolate and crayons melt too. Find out what makes them change.",
      minutes: 10,
      scenes: [],
    },
  ],
};

export default matter;
