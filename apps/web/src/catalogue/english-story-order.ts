import type { CatalogueEntry } from "./types";

const storyOrder: CatalogueEntry = {
  id: "english-story-order",
  title: "First, next, last",
  summary: "Tell what happens first, next and last in a story.",
  subject: "english",
  grade: "K",
  locale: "en",
  lessons: [
    {
      id: "first-next-last",
      title: "First, next, last",
      summary: "Put the parts of a tiny story in order.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Stories go in order",
          blocks: [
            { type: "text", text: "Stories happen in order. One thing comes after another." },
            { type: "points", items: ["First is the start.", "Next is the middle.", "Last is the end."] },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Ana's seed",
          blocks: [
            { type: "text", text: "First, Ana puts a seed in the dirt." },
            { type: "text", text: "Next, she waters it every day." },
            { type: "text", text: "Last, a little green plant pops up." },
            { type: "text", text: "Could the plant pop up first? No. It needs a seed and water." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Put Ana's story in order",
          prompt: "Put each part of Ana's story in First, Next or Last.",
          widget: {
            kind: "sorter",
            categories: ["First", "Next", "Last"],
            items: [
              { id: "plant", text: "A little plant pops up.", answer: 2 },
              { id: "seed", text: "Ana puts a seed in the dirt.", answer: 0 },
              { id: "water", text: "Ana waters the seed.", answer: 1 },
            ],
          },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Sam's snack",
          prompt: "Sam makes a jam sandwich. What happens first, next and last?",
          widget: {
            kind: "sorter",
            categories: ["First", "Next", "Last"],
            items: [
              { id: "eat", text: "Sam eats the sandwich.", answer: 2 },
              { id: "bread", text: "Sam gets two slices of bread.", answer: 0 },
              { id: "jam", text: "Sam spreads jam on the bread.", answer: 1 },
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
              prompt: "In Ana's story, what happened first?",
              choices: ["Ana watered the seed.", "Ana put a seed in the dirt.", "A plant popped up."],
              answer: 1,
              hint: "What does Ana need before she can water anything?",
              explain: "First, Ana put the seed in the dirt. Next, she watered it. Last, the plant came up.",
            },
            {
              id: "q2",
              prompt: "Lily puts on her socks. What does she do next?",
              choices: ["She puts on her shoes.", "She wakes up."],
              answer: 0,
              hint: "Think about getting dressed. What goes on after socks?",
              explain: "Lily woke up before she got dressed. Socks go on, then shoes go on next.",
            },
            {
              id: "q3",
              prompt: "Which word tells about the end of a story?",
              choices: ["First", "Next", "Last"],
              answer: 2,
              hint: "Think of a line of kids. What do we call the one at the very end?",
              explain: "Last tells the end. First is the start. Next is the middle.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Tell your day in order",
          brief: "Tell about something you did today, in order.",
          steps: [
            "Pick one thing you did today, like brushing your teeth.",
            "Hold up one finger. Say what you did first.",
            "Hold up two fingers. Say what you did next.",
            "Hold up three fingers. Say what you did last.",
            "Draw three boxes. Draw one part of your story in each box.",
          ],
        },
      ],
    },
    {
      id: "beginning-middle-end",
      title: "Beginning, middle, end",
      summary: "Use the words beginning, middle and end to talk about a story.",
      minutes: 10,
      scenes: [],
    },
    {
      id: "tell-it-back",
      title: "Tell it back",
      summary: "Listen to a short story. Then tell it back in order.",
      minutes: 10,
      scenes: [],
    },
    {
      id: "my-story",
      title: "Make your own story",
      summary: "Plan a story with a first, next and last part.",
      minutes: 10,
      scenes: [],
    },
  ],
};

export default storyOrder;
