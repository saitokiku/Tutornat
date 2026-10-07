import type { CatalogueEntry } from "./types";

const fractions: CatalogueEntry = {
  id: "math-fractions",
  title: "Fractions: parts of a whole",
  summary: "Cut one whole into equal parts, name the parts, and find them on a number line.",
  subject: "math",
  grade: "3",
  locale: "en",
  lessons: [
    {
      id: "halves-quarters",
      title: "Halves and quarters",
      summary: "Cut one whole into 2 and 4 equal parts, and name each part.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "One whole, cut fairly",
          blocks: [
            { type: "visual", visual: { kind: "fraction", parts: 1, shaded: 1 }, alt: "A bar that is one whole piece, fully shaded." },
            { type: "text", text: "Here is one whole. A fraction is a part of a whole." },
            { type: "visual", visual: { kind: "fraction", parts: 2, shaded: 1 }, alt: "The same bar cut into 2 equal parts. 1 part is shaded." },
            { type: "text", text: "Cut it into 2 equal parts. Each part is one half. We write it 1/2." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Quarters",
          blocks: [
            { type: "visual", visual: { kind: "fraction", parts: 4, shaded: 1 }, alt: "The same bar cut into 4 equal parts. 1 part is shaded." },
            { type: "text", text: "Cut the same whole into 4 equal parts. Each part is one quarter: 1/4." },
            {
              type: "points",
              items: ["The bottom number says how many equal parts the whole has.", "The top number says how many of those parts we mean."],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Make three quarters",
          prompt: "Cut the bar into 4 equal parts. Then shade 3 of them.",
          widget: { kind: "fraction-bar", parts: 1, shaded: 0, target: { parts: 4, shaded: 3 } },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Two quarters",
          prompt: "Show 2/4. Look closely: is it the same amount as 1/2?",
          widget: { kind: "fraction-bar", parts: 2, shaded: 1, target: { parts: 4, shaded: 2 } },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "A pizza is cut into 4 equal slices. You eat 1 slice. What fraction of the pizza did you eat?",
              choices: ["1/2", "1/4", "4/1", "1/3"],
              answer: 1,
              hint: "Count all the equal slices. That number goes on the bottom.",
              explain: "There are 4 equal slices and you ate 1 of them, so you ate 1/4.",
            },
            {
              id: "q2",
              prompt: "Which is more of the same sandwich: 1/2 or 1/4?",
              choices: ["1/2", "1/4", "They are the same"],
              answer: 0,
              hint: "Imagine cutting the sandwich into more pieces. What happens to the size of each piece?",
              explain: "Cutting into 4 makes smaller pieces than cutting into 2, so 1/2 is more.",
            },
            {
              id: "q3",
              prompt: "A bar is cut into 4 pieces, but the pieces are different sizes. Is one piece 1/4 of the bar?",
              choices: ["Yes", "No"],
              answer: 1,
              hint: "Fractions need parts that are all the same size.",
              explain: "1/4 means one of 4 equal parts. Pieces of different sizes aren't quarters.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Fractions at home",
          brief: "Find something you can share fairly: a sandwich, a sheet of paper, or a tortilla.",
          steps: [
            "Fold or cut it into 2 equal parts. Say: each part is one half.",
            "Fold or cut it again so there are 4 equal parts. Say: each part is one quarter.",
            "Put 3 parts together to show 3/4.",
            "Show someone why 2/4 is the same amount as 1/2.",
          ],
        },
      ],
    },
    {
      id: "thirds-sixths-eighths",
      title: "Thirds, sixths and eighths",
      summary: "More ways to cut the same whole, and why more parts means smaller parts.",
      minutes: 12,
      scenes: [],
    },
    {
      id: "number-line",
      title: "Fractions on a number line",
      summary: "A fraction is also a number. Find it between 0 and 1.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "From a bar to a line",
          blocks: [
            { type: "visual", visual: { kind: "fraction", parts: 4, shaded: 3 }, alt: "A bar cut into 4 equal parts with 3 shaded." },
            { type: "text", text: "Stretch the bar out into a line that starts at 0 and ends at 1." },
            {
              type: "visual",
              visual: { kind: "number-line", min: 0, max: 1, marks: [0, 0.25, 0.5, 0.75, 1], denominator: 4 },
              alt: "A number line from 0 to 1 split into 4 equal jumps, marked 0, 1/4, 2/4, 3/4 and 1.",
            },
            { type: "text", text: "Each equal jump is 1/4. Three jumps from 0 lands on 3/4." },
          ],
        },
        {
          id: "s2",
          kind: "interactive",
          title: "Land on three quarters",
          prompt: "Move the marker to 3/4.",
          widget: { kind: "number-line", min: 0, max: 1, step: 0.25, start: 0, target: 0.75, denominator: 4 },
        },
        {
          id: "s3",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "A line from 0 to 1 is split into 4 equal jumps. Where is 1/4?",
              choices: ["After 1 jump", "After 4 jumps", "Exactly in the middle"],
              answer: 0,
              hint: "The top number counts the jumps from 0.",
              explain: "1/4 is one equal jump from 0.",
            },
            {
              id: "q2",
              prompt: "Which fraction sits exactly halfway between 0 and 1?",
              choices: ["1/4", "2/4", "3/4"],
              answer: 1,
              hint: "Halfway means half of the jumps.",
              explain: "2/4 is two of four equal jumps — the middle. It's the same point as 1/2.",
            },
          ],
        },
      ],
    },
    {
      id: "comparing",
      title: "Comparing fractions",
      summary: "Use pictures and the number line to tell which fraction is bigger.",
      minutes: 12,
      scenes: [],
    },
  ],
};

export default fractions;
