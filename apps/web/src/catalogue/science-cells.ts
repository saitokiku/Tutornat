import type { CatalogueEntry } from "./types";

const cells: CatalogueEntry = {
  id: "science-cells",
  title: "Cells: the parts of life",
  summary: "Every living thing is built from cells. Look inside plant and animal cells, see what each part does, and follow how cells build a whole body.",
  subject: "science",
  grade: "6",
  locale: "en",
  lessons: [
    {
      id: "made-of-cells",
      title: "Everything alive is made of cells",
      summary: "What a cell is, how small cells are, and the three ideas of cell theory.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "The unit of life",
          blocks: [
            {
              type: "text",
              text: "A cell is the smallest unit that can do all the jobs of being alive: take in food, release energy, get rid of waste, grow, and make new cells.",
            },
            {
              type: "text",
              text: "Some living things are a single cell. Others, like you, are made of many cells working together. Your body has tens of trillions of them.",
            },
            {
              type: "points",
              items: [
                "One-celled (unicellular): bacteria, yeast, an amoeba.",
                "Many-celled (multicellular): plants, animals, mushrooms.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Cell theory",
          blocks: [
            {
              type: "text",
              text: "In 1665, Robert Hooke looked at a thin slice of cork through an early microscope. He saw rows of tiny boxes and called them cells.",
            },
            {
              type: "text",
              text: "Over the next two centuries, scientists studying plants, animals and microbes found cells everywhere they looked. Their findings became cell theory:",
            },
            {
              type: "points",
              items: [
                "All living things are made of one or more cells.",
                "The cell is the basic unit of structure and function in living things.",
                "All cells come from cells that already exist.",
              ],
            },
            {
              type: "text",
              text: "The cork cells Hooke saw were dead, so he saw only their empty walls. Living cells are full of parts. That is the next lesson.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "One cell or many?",
          prompt: "Sort each living thing. Is it a single cell, or is it made of many cells?",
          widget: {
            kind: "sorter",
            categories: ["One cell", "Many cells"],
            items: [
              { id: "oak", text: "An oak tree", answer: 1 },
              { id: "bacterium", text: "A bacterium", answer: 0 },
              { id: "mushroom", text: "A mushroom", answer: 1 },
              { id: "yeast", text: "A yeast cell that makes bread dough rise", answer: 0 },
              { id: "spider", text: "A spider", answer: 1 },
              { id: "you", text: "You", answer: 1 },
              { id: "amoeba", text: "An amoeba in pond water", answer: 0 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Too small to see",
          blocks: [
            {
              type: "text",
              text: "Most cells are far too small to see with your eyes alone. Scientists measure them in micrometers (µm). 1 millimeter is 1,000 micrometers.",
            },
            {
              type: "points",
              items: [
                "A typical bacterium: a few micrometers long.",
                "A human red blood cell: about 8 micrometers across. It is the dot on the line below.",
                "A human egg cell: about 100 micrometers across, the whole length of the line. It is one of the few cells you can just see as a speck.",
              ],
            },
            {
              type: "visual",
              visual: { kind: "number-line", min: 0, max: 100, marks: [0, 25, 50, 75, 100], marker: 8 },
              alt: "A line from 0 to 100 micrometers. A dot at 8 marks a red blood cell; a human egg cell would reach the end, at about 100.",
            },
            {
              type: "text",
              text: "A light microscope can make cells look up to about 1,000 times bigger. Cells were only discovered after microscopes were invented.",
            },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Cells across a millimeter",
          prompt:
            "Picture cells that are each 10 micrometers wide, lined up side by side. 1 millimeter is 1,000 micrometers. How many of these cells fit across 1 millimeter? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 200, step: 10, start: 0, target: 100 },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Which of these is not made of cells?",
              choices: ["A mushroom", "A bacterium", "A blade of grass", "A grain of sand"],
              answer: 3,
              hint: "Was it ever alive? Can it grow and make more of itself?",
              explain:
                "Sand is broken-down rock. It was never alive, so it is not made of cells. Mushrooms, bacteria and grass are all living things, so they are made of cells.",
            },
            {
              id: "q2",
              prompt: "A bacterium is a single cell. What does that tell you?",
              choices: ["It is not really alive.", "It must be part of a bigger living thing.", "One cell can do all the jobs of life."],
              answer: 2,
              hint: "Cell theory says the cell is the basic unit of life.",
              explain:
                "A one-celled living thing takes in food, releases energy, gets rid of waste, grows and divides, all inside one cell.",
            },
            {
              id: "q3",
              prompt: "Where do new cells come from?",
              choices: ["From cells that already exist", "From nonliving material, like dust", "From food that turns into cells"],
              answer: 0,
              hint: "Think of the third idea of cell theory.",
              explain: "All cells come from cells that already exist. A cell grows, copies its instructions, and divides into two cells.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "A millimeter of cells",
          brief: "Get a feel for how small cells are. You need a ruler, a pencil and paper.",
          steps: [
            "Find the millimeter marks on the ruler. Draw a line exactly 1 millimeter long.",
            "Remember: about 100 cells that are 10 micrometers wide would fit along that tiny line.",
            "Measure the width of your fingernail in millimeters. Multiply by 100 to estimate how many of those cells would fit across it.",
            "Do the same for the length of your thumb. Write both estimates down.",
            "Explain to someone at home why Hooke needed a microscope to discover cells.",
          ],
        },
      ],
    },
    {
      id: "cell-parts",
      title: "Inside a cell",
      summary: "The main parts of a cell and the job each one does.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Parts with jobs",
          blocks: [
            {
              type: "text",
              text: "A cell is not an empty bag. It is packed with parts, and each part has a job. Many of these small parts are called organelles.",
            },
            {
              type: "text",
              text: "Picture a cell as a tiny factory. It has a gate, a factory floor, a control office, generators, workers and storerooms. Each of them matches a part of the cell.",
            },
            {
              type: "points",
              items: [
                "Cell membrane (the gate): a thin, flexible border around the cell. It controls what goes in and out.",
                "Cytoplasm (the factory floor): the jelly-like fluid that fills the cell. The other parts sit in it.",
                "Nucleus (the control office): holds the cell's DNA, the instructions for everything the cell does.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Energy, building and storage",
          blocks: [
            {
              type: "points",
              items: [
                "Mitochondria (the generators): release energy from sugar so the cell can use it.",
                "Ribosomes (the workers): tiny parts that build proteins, following instructions from the DNA.",
                "Vacuoles (the storerooms): sacs that store water, food and waste.",
              ],
            },
            {
              type: "text",
              text: "Proteins do much of the cell's work. They help build its structures and speed up its chemical reactions.",
            },
            { type: "text", text: "Cells that use a lot of energy, such as muscle cells, have many mitochondria." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Match the job to the part",
          prompt: "Sort each job. Which part of the cell does it?",
          widget: {
            kind: "sorter",
            categories: ["Nucleus", "Cell membrane", "Mitochondria", "Ribosomes"],
            items: [
              { id: "gate", text: "Lets some materials in and keeps others out", answer: 1 },
              { id: "dna", text: "Holds the DNA", answer: 0 },
              { id: "energy", text: "Releases energy from sugar", answer: 2 },
              { id: "follows", text: "Follows the DNA's instructions to put proteins together", answer: 3 },
              { id: "border", text: "Forms the flexible border of the cell", answer: 1 },
              { id: "proteins", text: "Builds proteins", answer: 3 },
              { id: "directs", text: "Directs what the cell does", answer: 0 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Cellular respiration",
          blocks: [
            {
              type: "text",
              text: "Mitochondria use oxygen to break down sugar. This releases energy the cell can use, and leaves carbon dioxide and water as waste. The process is called cellular respiration.",
            },
            { type: "text", text: "sugar + oxygen → carbon dioxide + water + energy" },
            {
              type: "text",
              text: "That is why you breathe in oxygen and breathe out carbon dioxide. Your cells need the first and make the second.",
            },
          ],
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Which part controls what enters and leaves the cell?",
              choices: ["Cell membrane", "Nucleus", "Ribosome", "Vacuole"],
              answer: 0,
              hint: "Think of the border around the cell.",
              explain: "The cell membrane is the border. It lets some materials through, such as oxygen and water, and blocks others.",
            },
            {
              id: "q2",
              prompt: "Muscle cells use a lot of energy. Which part would you expect them to have many of?",
              choices: ["Cell walls", "Vacuoles", "Mitochondria"],
              answer: 2,
              hint: "Which part releases energy from sugar?",
              explain:
                "Mitochondria release energy from sugar, so cells that do a lot of work, like muscle cells, have many of them. Animal cells have no cell walls at all.",
            },
            {
              id: "q3",
              prompt: "Why do you breathe out carbon dioxide?",
              choices: [
                "Your cells make it when they release energy from sugar.",
                "Your lungs make it out of the air you breathe in.",
                "It comes in with your food and passes straight through you.",
              ],
              answer: 0,
              hint: "Look at the right side of the cellular respiration equation.",
              explain:
                "Cellular respiration in your mitochondria makes carbon dioxide as waste. Your blood carries it to your lungs, and you breathe it out.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "A cell in a bag",
          brief:
            "Build a model cell from kitchen things. You need a zip-top bag, clear gelatin or hair gel, and small objects for the parts. Gelatin is made with boiling water, so ask a grown-up to make it and let it cool, or use hair gel.",
          steps: [
            "The bag is the cell membrane. Fill it about halfway with gel. The gel is the cytoplasm.",
            "Add something large and round, like a plum or a ping-pong ball, for the nucleus.",
            "Add a few beans for mitochondria and a pinch of sprinkles or seeds for ribosomes.",
            "Add a grape or a small water balloon for a vacuole, then seal the bag.",
            "Make a key that names each part and its job. Explain your model to someone at home, and name one way it is not like a real cell.",
          ],
        },
      ],
    },
    {
      id: "plant-animal",
      title: "Plant cells and animal cells",
      summary: "What plant and animal cells share, the three parts only plant cells have, and a fair test with potato strips.",
      minutes: 16,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "The parts they share",
          blocks: [
            {
              type: "text",
              text: "Plant cells and animal cells share the same basic parts: a cell membrane, cytoplasm, a nucleus, mitochondria and ribosomes.",
            },
            {
              type: "text",
              text: "Plant cells have mitochondria too. Plants make their own sugar, and their mitochondria release the energy from it, just as yours do.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Three parts plant cells add",
          blocks: [
            {
              type: "points",
              items: [
                "Cell wall: a stiff layer outside the membrane, made mostly of cellulose. It supports the cell and gives it a boxy shape.",
                "Chloroplasts: green parts that use energy from sunlight to make sugar. This is photosynthesis.",
                "A large central vacuole: a big sac of water that can fill most of the cell. When it is full, it presses outward and keeps the plant firm.",
              ],
            },
            {
              type: "text",
              text: "Not every plant cell has chloroplasts. Root cells grow in the dark soil, and most have none. They still have a cell wall.",
            },
            { type: "text", text: "Animal cells have no cell wall and no chloroplasts. Their vacuoles, if they have any, are small." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Plant only, or both?",
          prompt: "Sort each cell part. Is it found only in plant cells, or in both plant and animal cells?",
          widget: {
            kind: "sorter",
            categories: ["Plant cells only", "Both"],
            items: [
              { id: "nucleus", text: "Nucleus", answer: 1 },
              { id: "wall", text: "Cell wall", answer: 0 },
              { id: "membrane", text: "Cell membrane", answer: 1 },
              { id: "mito", text: "Mitochondria", answer: 1 },
              { id: "chloroplast", text: "Chloroplasts", answer: 0 },
              { id: "ribosomes", text: "Ribosomes", answer: 1 },
              { id: "vacuole", text: "A large central vacuole", answer: 0 },
              { id: "cytoplasm", text: "Cytoplasm", answer: 1 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Bacteria are simpler",
          blocks: [
            { type: "text", text: "Bacteria are cells too, but simpler ones. They have no nucleus. Their DNA sits loose in the cytoplasm." },
            {
              type: "points",
              items: [
                "They have a cell membrane, cytoplasm and ribosomes.",
                "Most bacteria also have a cell wall, though it is not made of cellulose.",
                "They have no mitochondria and no chloroplasts.",
              ],
            },
          ],
        },
        {
          id: "s5",
          kind: "slide",
          title: "A fair test with plant cells",
          blocks: [
            {
              type: "text",
              text: "Water moves into and out of cells through the membrane. In very salty water, plant cells lose water and go soft. In fresh water, they stay firm.",
            },
            {
              type: "text",
              text: "You can test this with potato strips, but only if the test is fair. A fair test changes one thing on purpose and keeps everything else the same.",
            },
            {
              type: "points",
              items: [
                "Independent variable: the one thing you change on purpose. Here, salt or no salt.",
                "Dependent variable: what you measure to see the effect. Here, how much each strip bends.",
                "Controlled variables: everything you keep the same, such as the size of the strips, the amount of water and the soaking time.",
              ],
            },
          ],
        },
        {
          id: "s6",
          kind: "interactive",
          title: "Sort the variables",
          prompt: "In the potato test, one cup has salty water and one has fresh water. Sort each item: is it changed on purpose, measured, or kept the same?",
          widget: {
            kind: "sorter",
            categories: ["Changed on purpose", "Measured", "Kept the same"],
            items: [
              { id: "length", text: "The length of each potato strip", answer: 2 },
              { id: "salt", text: "Whether the water has salt in it", answer: 0 },
              { id: "water", text: "The amount of water in each cup", answer: 2 },
              { id: "bend", text: "How much each strip bends", answer: 1 },
              { id: "time", text: "How long the strips soak", answer: 2 },
              { id: "potato", text: "The kind of potato", answer: 2 },
            ],
          },
        },
        {
          id: "s7",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "A cell has a cell wall, chloroplasts and a large central vacuole. What kind of cell is it?",
              choices: ["An animal cell", "A bacterium", "A plant cell"],
              answer: 2,
              hint: "Do animal cells have any of these three parts?",
              explain:
                "Chloroplasts, a cell wall and a large central vacuole together mark a plant cell. Animal cells have none of them, and bacteria have no chloroplasts.",
            },
            {
              id: "q2",
              prompt: "Do plant cells have mitochondria?",
              choices: ["Yes, to release the energy in their sugar.", "No. Their chloroplasts do that job instead.", "Only the cells in leaves, where sugar is made."],
              answer: 0,
              hint: "Making sugar and releasing its energy are two different jobs.",
              explain: "Chloroplasts make sugar. Mitochondria release the energy stored in it. Plant cells in leaves, stems and roots all have mitochondria.",
            },
            {
              id: "q3",
              prompt:
                "Maya soaks one potato strip in salty water for 1 hour and another in fresh water overnight. Why is this not a fair test?",
              choices: ["She should have used carrots, not potatoes.", "She measured how much the strips bend.", "She changed two things: salt and time."],
              answer: 2,
              hint: "Count how many things are different between the two cups.",
              explain:
                "A fair test changes only one thing. With different soaking times too, Maya can't tell whether the salt or the time caused the difference.",
            },
          ],
        },
        {
          id: "s8",
          kind: "project",
          title: "The potato strip test",
          brief: "Run the fair test from this lesson. You need a potato, two cups, salt, water, and a grown-up to cut the strips.",
          steps: [
            "Ask a grown-up to cut two potato strips the same size, about as long and thick as your finger.",
            "Pour the same amount of water into both cups. Stir 2 big spoonfuls of salt into one cup. Label the cups.",
            "Put one strip in each cup at the same time. Wait 1 hour.",
            "Take the strips out and gently try to bend each one. Write down which one bends more.",
            "Explain your result with cells: in which strip did the cells lose water?",
          ],
        },
      ],
    },
    {
      id: "cells-to-organisms",
      title: "From cells to a whole body",
      summary: "How cells specialize and team up into tissues, organs and organ systems.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Cells with special jobs",
          blocks: [
            { type: "text", text: "In a many-celled living thing, cells specialize. Each kind of cell is built for one main job." },
            {
              type: "points",
              items: [
                "Red blood cells are small discs that carry oxygen. In humans, they lose their nucleus as they mature, which leaves more room to carry oxygen.",
                "Nerve cells have long branches that carry signals. Some stretch from your lower back all the way to your foot.",
                "Muscle cells can shorten, or contract, to pull on bones and move your body.",
                "Root hair cells in plants have a long, thin extension that takes in water from the soil.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Levels of organization",
          blocks: [
            {
              type: "points",
              items: [
                "Cell: the basic unit, such as one muscle cell.",
                "Tissue: a group of similar cells doing the same job, such as muscle tissue.",
                "Organ: different tissues working together, such as the heart, which has muscle, nerve and other tissues.",
                "Organ system: organs working together, such as the circulatory system: the heart, blood vessels and blood.",
                "Organism: the whole living thing, made of organ systems working together.",
              ],
            },
            { type: "text", text: "Plants have these levels too. A leaf is an organ made of several kinds of tissue." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Which level?",
          prompt: "Sort each example. Is it a cell, a tissue, an organ or an organ system?",
          widget: {
            kind: "sorter",
            categories: ["Cell", "Tissue", "Organ", "Organ system"],
            items: [
              { id: "heart", text: "The heart", answer: 2 },
              { id: "nerve", text: "One nerve cell", answer: 0 },
              { id: "digestive", text: "The digestive system", answer: 3 },
              { id: "muscle", text: "A sheet of similar muscle cells in your arm", answer: 1 },
              { id: "leaf", text: "A leaf", answer: 2 },
              { id: "rbc", text: "A red blood cell", answer: 0 },
              { id: "circulatory", text: "The heart, blood vessels and blood working together", answer: 3 },
              { id: "stomach", text: "The stomach", answer: 2 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Systems work together",
          blocks: [
            { type: "text", text: "Organ systems depend on each other. When you run, your muscle cells need more energy." },
            {
              type: "points",
              items: [
                "Your respiratory system takes in more oxygen.",
                "Your circulatory system carries oxygen and sugar to your muscle cells faster.",
                "In the muscle cells, mitochondria release energy and make carbon dioxide. The blood carries it back to your lungs.",
              ],
            },
            { type: "text", text: "Every level depends on the one below it. A healthy body needs healthy, working cells." },
          ],
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Which list goes from smallest to largest?",
              choices: [
                "Tissue, cell, organ, organism, organ system",
                "Cell, tissue, organ, organ system, organism",
                "Organ, tissue, cell, organ system, organism",
              ],
              answer: 1,
              hint: "Similar cells group together first.",
              explain: "Cells form tissues, tissues form organs, organs form organ systems, and organ systems make up an organism.",
            },
            {
              id: "q2",
              prompt: "The stomach is made of muscle tissue, nerve tissue and lining tissue working together. What level is the stomach?",
              choices: ["A tissue", "An organ", "An organ system"],
              answer: 1,
              hint: "Is it one kind of tissue, or several kinds working together?",
              explain: "Different tissues working together form an organ. The stomach is one organ in the digestive system.",
            },
            {
              id: "q3",
              prompt: "Why does a nerve cell have long branches?",
              choices: ["To store water for the body", "To carry signals a long way", "To make sugar from sunlight"],
              answer: 1,
              hint: "A cell's shape fits its job. What is a nerve cell's job?",
              explain: "Nerve cells carry signals. Long branches let one cell link distant parts of the body, such as your spine and your foot.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Map a system",
          brief: "Pick one organ system and map it from the whole body down to its cells. You need paper and a pencil.",
          steps: [
            "Choose a system: digestive, circulatory, respiratory or muscular.",
            "List two organs in your system and what each one does.",
            "For one of those organs, name one tissue it contains.",
            "Name one kind of cell in that tissue, and say how its shape or parts fit its job.",
            "Draw your map as a ladder from cell to organism, and explain it to someone at home.",
          ],
        },
      ],
    },
  ],
};

/** Practice on the skill map that fits each lesson (lesson id → skill ids). */
export const practice: Record<string, string[]> = {
  "made-of-cells": ["s.cells"],
  "cell-parts": ["s.cells"],
  "plant-animal": ["s.cells", "s.variables"],
  "cells-to-organisms": ["s.cells"],
};

export default cells;
