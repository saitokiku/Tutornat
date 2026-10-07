import type { CatalogueEntry } from "./types";

const addNumberLine: CatalogueEntry = {
  id: "math-add-number-line",
  title: "Adding on the number line",
  summary: "Start at a number, then jump forward to add.",
  subject: "math",
  grade: "1",
  locale: "en",
  lessons: [
    {
      id: "jump-forward",
      title: "Start, then jump",
      summary: "Put your finger on the first number. Jump forward to add the second.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Numbers in a row",
          blocks: [
            {
              type: "visual",
              visual: { kind: "number-line", min: 0, max: 10, marks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
              alt: "A number line from 0 to 10, with a mark at every number.",
            },
            { type: "text", text: "A number line puts numbers in order." },
            { type: "points", items: ["Numbers get bigger as you go right.", "One jump to the right adds 1."] },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Count the jumps",
          blocks: [
            { type: "text", text: "To add 3 + 5, start at 3. Then jump 5 times." },
            {
              type: "visual",
              visual: { kind: "number-line", min: 3, max: 8, marks: [3, 4, 5, 6, 7, 8] },
              alt: "A short number line from 3 to 8, with a mark at every number. There are 5 spaces between 3 and 8.",
            },
            { type: "text", text: "Each jump crosses one space. You land on 8, so 3 + 5 = 8." },
            { type: "points", items: ["Do not count the number you start on.", "Count each jump: 4, 5, 6, 7, 8."] },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Jump to add",
          prompt: "Start at 3. Jump 5 more. Where do you land?",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 3, target: 8 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Jump past 10",
          prompt: "Start at 9. Jump 6 more. Where do you land?",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 9, target: 15 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Start at 4. Jump 3 more. Where do you land?",
              choices: ["6", "7", "8"],
              answer: 1,
              hint: "Put your finger on 4. Say the next number with each jump.",
              explain: "From 4, the jumps land on 5, 6, 7. So 4 + 3 = 7.",
            },
            {
              id: "q2",
              prompt: "Mia adds 3 + 3. She counts 3, 4, 5. She says 5. Is she right?",
              choices: ["Yes", "No"],
              answer: 1,
              hint: "Does the number you start on count as a jump?",
              explain: "Mia counted the 3 she started on. Start on 3, then jump: 4, 5, 6. So 3 + 3 = 6.",
            },
            {
              id: "q3",
              prompt: "You have 8 crayons. You get 4 more. How many do you have now?",
              choices: ["11", "12", "13"],
              answer: 1,
              hint: "Start at 8 on the number line. Make 4 jumps.",
              explain: "From 8, jump 4 times: 9, 10, 11, 12. You have 12 crayons.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "A number line on the floor",
          brief: "Make a number line you can walk on.",
          steps: [
            "Write 0 to 10 on 11 pieces of paper, one number each.",
            "Lay them on the floor in order, one step apart.",
            "A grown-up says a problem, like 2 + 5.",
            "Stand on 2. Take 5 steps forward. Say where you land.",
            "Now you make up a problem for the grown-up to walk.",
          ],
        },
      ],
    },
    {
      id: "bigger-first",
      title: "Start with the bigger number",
      summary: "You can add in any order. Starting with the bigger number means fewer jumps.",
      minutes: 8,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Fewer jumps",
          blocks: [
            { type: "text", text: "2 + 9 and 9 + 2 both make 11." },
            {
              type: "visual",
              visual: { kind: "number-line", min: 9, max: 11, marks: [9, 10, 11] },
              alt: "A short number line from 9 to 11. There are 2 spaces between 9 and 11.",
            },
            { type: "text", text: "Start at 9 and jump 2: 10, 11. That is faster than 9 jumps from 2." },
            { type: "points", items: ["You can add in any order.", "Start with the bigger number. Then you make fewer jumps."] },
          ],
        },
        {
          id: "s2",
          kind: "interactive",
          title: "Find 3 + 8",
          prompt: "Find 3 + 8. The marker starts on 8, the bigger number. Jump 3 more.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 8, target: 11 },
        },
        {
          id: "s3",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "To find 2 + 7, which way has fewer jumps?",
              choices: ["Start at 2. Jump 7.", "Start at 7. Jump 2."],
              answer: 1,
              hint: "The number you jump tells how many jumps. Which is fewer, 7 or 2?",
              explain: "Starting at 7 takes only 2 jumps: 8, 9. Both ways land on 9.",
            },
            {
              id: "q2",
              prompt: "Does 4 + 6 land on the same number as 6 + 4?",
              choices: ["Yes", "No"],
              answer: 0,
              hint: "Try both on a number line. Where does each one land?",
              explain: "Both land on 10. You can add in either order.",
            },
          ],
        },
      ],
    },
    {
      id: "jump-to-ten",
      title: "Jump to 10 first",
      summary: "Split a jump into two parts: up to 10, then the rest.",
      minutes: 10,
      scenes: [],
    },
    {
      id: "how-many-more",
      title: "How many more?",
      summary: "Count the jumps between two numbers to find how many more.",
      minutes: 10,
      scenes: [],
    },
  ],
};

export default addNumberLine;
