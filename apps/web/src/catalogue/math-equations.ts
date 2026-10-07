import type { CatalogueEntry } from "./types";

const equations: CatalogueEntry = {
  id: "math-equations",
  title: "Solving equations",
  summary:
    "Undo operations to solve one-step equations and two-step equations, simplify with like terms and the distributive property, and solve equations with variables on both sides.",
  subject: "math",
  grade: "7",
  locale: "en",
  lessons: [
    {
      id: "one-step",
      title: "One-step equations",
      summary: "An equation says two sides are equal. Undo one operation, on both sides, to find the unknown, then check.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "What an equation says",
          blocks: [
            { type: "text", text: "An equation says that two expressions have the same value. x + 5 = 12 says: some number plus 5 equals 12." },
            {
              type: "visual",
              visual: { kind: "number-line", min: 0, max: 12, marks: [0, 7, 12], marker: 7 },
              alt: "A number line from 0 to 12 with marks at 0, 7 and 12, and a dot at 7. A jump of 5 from 7 lands on 12.",
            },
            { type: "text", text: "Solving means finding the value of x that makes the equation true. Here x = 7, because 7 + 5 = 12." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Undo it, on both sides",
          blocks: [
            { type: "text", text: "To get x by itself, do the opposite operation. Do it to both sides, so they stay equal." },
            {
              type: "points",
              items: [
                "x + 5 = 12: subtract 5 from both sides. x = 7.",
                "x − 4 = 9: add 4 to both sides. x = 13.",
                "4x = 28 means 4 times x. Divide both sides by 4: x = 7.",
                "x/3 = 6: multiply both sides by 3. x = 18.",
              ],
            },
            { type: "text", text: "Check by putting your answer back into the equation: 4 × 7 = 28. That's true, so x = 7 is right." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Solve x − 8 = 3",
          prompt: "Solve x − 8 = 3. Move the marker to x.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 11 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "A negative answer",
          prompt: "Solve x + 9 = 4. Move the marker to x.",
          widget: { kind: "number-line", min: -10, max: 10, step: 1, start: 0, target: -5 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Solve 5x = 35.",
              choices: ["30", "7", "40", "175"],
              answer: 1,
              hint: "x is multiplied by 5. What undoes multiplying?",
              explain: "Divide both sides by 5: x = 35 ÷ 5 = 7. Check: 5 × 7 = 35.",
            },
            {
              id: "q2",
              prompt: "Solve x/4 = 9.",
              choices: ["13", "2.25", "36", "5"],
              answer: 2,
              hint: "x is divided by 4. Undo it by multiplying both sides by 4.",
              explain: "x = 9 × 4 = 36. Check: 36 ÷ 4 = 9.",
            },
            {
              id: "q3",
              prompt: "Which step solves x + 2.5 = 10?",
              choices: ["Add 2.5 to both sides", "Subtract 2.5 from both sides", "Divide both sides by 2.5", "Subtract 10 from both sides"],
              answer: 1,
              hint: "What is being done to x? Do the opposite.",
              explain: "2.5 is added to x, so subtract 2.5 from both sides: x = 7.5. Check: 7.5 + 2.5 = 10.",
            },
            {
              id: "q4",
              prompt: "Jo had some stickers. She gave away 12 and has 30 left. Which equation fits?",
              choices: ["s + 12 = 30", "12s = 30", "s − 12 = 30", "30 − s = 12"],
              answer: 2,
              hint: "Start with the unknown number of stickers, s. What happened to it?",
              explain: "Jo started with s, took away 12 and had 30 left: s − 12 = 30. Add 12 to both sides: s = 42.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Mystery bag",
          brief: "Make equation puzzles with a bag and some small objects, like coins or dry beans.",
          steps: [
            "Ask someone to put some objects in a bag without telling you how many.",
            "They add 4 more while you watch, then count everything and tell you the total.",
            "Write an equation, like b + 4 = 11, and solve it.",
            "Open the bag and count to check.",
            "Swap roles. Fill 3 bags with the same number in each, say the total, and have them solve 3b = your total.",
          ],
        },
      ],
    },
    {
      id: "two-step",
      title: "Two-step equations",
      summary: "When two things happen to x, undo them in reverse order: first the adding or subtracting, then the multiplying or dividing.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Two things happened to x",
          blocks: [
            { type: "text", text: "Picture 3 bags with the same number of marbles in each, plus 2 loose marbles. There are 14 marbles in all." },
            {
              type: "visual",
              visual: { kind: "dots", groups: [4, 4, 4, 2] },
              alt: "Three equal groups of 4 counters and one group of 2 extra counters: 14 counters in all.",
            },
            { type: "text", text: "With x marbles in each bag, 3x + 2 = 14. First x was multiplied by 3, then 2 was added." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Undo in reverse order",
          blocks: [
            { type: "text", text: "Undo the last step first, the way you take off your shoes before your socks." },
            {
              type: "points",
              items: ["Subtract 2 from both sides: 3x = 12.", "Divide both sides by 3: x = 4.", "Check: 3 × 4 + 2 = 14. True."],
            },
            {
              type: "visual",
              visual: { kind: "dots", groups: [4, 4, 4, 2], crossed: 2 },
              alt: "The same counters with the 2 extra counters crossed out. 12 are left, in 3 equal groups of 4.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "With negatives and fractions",
          blocks: [
            {
              type: "points",
              items: [
                "−2x + 7 = 1: subtract 7 from both sides to get −2x = −6. Divide both sides by −2: x = 3.",
                "x/5 − 3 = 2: add 3 to both sides to get x/5 = 5. Multiply both sides by 5: x = 25.",
              ],
            },
            { type: "text", text: "Check each one: −2 × 3 + 7 = 1 and 25 ÷ 5 − 3 = 2. Both are true." },
            { type: "text", text: "Watch the signs. A negative divided by a negative is positive: −6 ÷ (−2) = 3." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Solve 2x + 5 = 17",
          prompt: "Solve 2x + 5 = 17. Move the marker to x.",
          widget: { kind: "number-line", min: -10, max: 10, step: 1, start: 0, target: 6 },
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Solve 4x − 3 = −15",
          prompt: "Solve 4x − 3 = −15. Move the marker to x.",
          widget: { kind: "number-line", min: -10, max: 10, step: 1, start: 0, target: -3 },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Solve 5x − 4 = 21.",
              choices: ["3.4", "17", "5", "125"],
              answer: 2,
              hint: "Undo the subtraction first: add 4 to both sides. Then undo the multiplication.",
              explain: "Add 4: 5x = 25. Divide by 5: x = 5. Check: 5 × 5 − 4 = 21. The 3.4 comes from subtracting 4 instead of adding it.",
            },
            {
              id: "q2",
              prompt: "Solve x/3 + 6 = 10.",
              choices: ["12", "48", "4/3", "2"],
              answer: 0,
              hint: "Subtract 6 first. Then undo dividing by 3.",
              explain: "Subtract 6: x/3 = 4. Multiply by 3: x = 12. Check: 12 ÷ 3 + 6 = 10.",
            },
            {
              id: "q3",
              prompt: "A phone plan costs $20 to start plus $15 a month. After how many months will you have paid $95 in all?",
              choices: ["4", "6", "75", "5"],
              answer: 3,
              hint: "Write an equation with m for the months: 15m + 20 = 95.",
              explain: "Subtract 20: 15m = 75. Divide by 15: m = 5 months. Check: 15 × 5 + 20 = 95.",
            },
            {
              id: "q4",
              prompt: "Lee solved −3x + 4 = 19 and got x = 5. Is he right?",
              choices: ["Yes", "No, x = −5", "No, x = 15"],
              answer: 1,
              hint: "Put 5 in for x. Is the equation true?",
              explain: "−3 × 5 + 4 = −11, not 19. Subtract 4 to get −3x = 15, then divide by −3: x = −5. Check: −3 × (−5) + 4 = 19.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Think of a number",
          brief: "Make two-step puzzles for someone at home, then solve theirs.",
          steps: [
            "Think of a whole number and keep it secret.",
            "Multiply it by a number you choose, then add or subtract another number. Work out the result.",
            "Tell someone your steps and the result, like “I multiplied by 4, added 3 and got 31.”",
            "They write an equation, like 4n + 3 = 31, and solve it to find your number.",
            "Swap roles. Check every answer by putting it back into the steps.",
          ],
        },
      ],
    },
    {
      id: "simplify-first",
      title: "Parentheses and like terms",
      summary: "Combine like terms and use the distributive property, so the equation becomes one you can solve in two steps.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Combine like terms",
          blocks: [
            { type: "text", text: "Like terms have the same variable part. 3x and 2x are like terms. 3x and 3 are not." },
            {
              type: "points",
              items: ["3x + 2x − 4 = 21 becomes 5x − 4 = 21.", "Add 4 to both sides: 5x = 25.", "Divide both sides by 5: x = 5."],
            },
            { type: "text", text: "Check in the original equation: 3 × 5 + 2 × 5 − 4 = 15 + 10 − 4 = 21. True." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Parentheses",
          blocks: [
            { type: "text", text: "2(x + 3) = 16 means 2 groups of x + 3 make 16." },
            {
              type: "visual",
              visual: { kind: "dots", groups: [8, 8] },
              alt: "Two equal groups of 8 counters: 16 in all. Each group is x + 3, so x + 3 = 8.",
            },
            {
              type: "points",
              items: [
                "Way 1, divide first: 2(x + 3) = 16, so x + 3 = 8 and x = 5.",
                "Way 2, distribute first: 2x + 6 = 16, so 2x = 10 and x = 5.",
                "Both ways give the same answer. Choose the one with easier numbers.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Solve 3(x − 2) = 12",
          prompt: "Solve 3(x − 2) = 12. Move the marker to x.",
          widget: { kind: "number-line", min: -10, max: 10, step: 1, start: 0, target: 6 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Sort by solution",
          prompt: "Solve each equation, then sort it by its solution.",
          widget: {
            kind: "sorter",
            categories: ["x = 2", "x = 3", "x = 4"],
            items: [
              { id: "a", text: "2x + 4 = 10", answer: 1 },
              { id: "b", text: "5(x − 1) = 15", answer: 2 },
              { id: "c", text: "3x + x = 8", answer: 0 },
              { id: "d", text: "7x − 2x + 1 = 16", answer: 1 },
              { id: "e", text: "2(x + 6) = 20", answer: 2 },
              { id: "f", text: "6x − 9 = 3", answer: 0 },
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
              prompt: "Simplify 4x + 7 − x + 2.",
              choices: ["5x + 9", "3x + 9", "3x + 5", "12x"],
              answer: 1,
              hint: "Group the x terms and the plain numbers separately.",
              explain: "4x − x = 3x and 7 + 2 = 9, so the expression is 3x + 9.",
            },
            {
              id: "q2",
              prompt: "Solve 4(x + 1) = 28.",
              choices: ["7", "24", "6", "8"],
              answer: 2,
              hint: "Divide both sides by 4 first, or distribute the 4.",
              explain: "Divide by 4: x + 1 = 7, so x = 6. Check: 4 × (6 + 1) = 28.",
            },
            {
              id: "q3",
              prompt: "Kai wrote 2(x + 5) = 2x + 5. What went wrong?",
              choices: ["Nothing. It's right.", "The 2 must multiply both x and 5: 2x + 10.", "The 2 should be added: x + 7."],
              answer: 1,
              hint: "Distributing means multiplying every term inside the parentheses.",
              explain: "2(x + 5) = 2 × x + 2 × 5 = 2x + 10.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Receipt equations",
          brief: "Turn a real receipt or menu into an equation.",
          steps: [
            "Find a receipt or a menu.",
            "Pick an item bought several times, or one you'd buy several of, plus one other item.",
            "Write an equation with the number of the first item as the unknown: price × n + other item = total.",
            "Solve it and check your answer against the receipt or menu.",
            "Ask someone to write an equation like 3(x + 2) = 21 for you. Solve it both ways: dividing first and distributing first.",
          ],
        },
      ],
    },
    {
      id: "both-sides",
      title: "Variables on both sides",
      summary: "Collect the x terms on one side, solve, and notice when an equation has no solution or every number works.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "x on both sides",
          blocks: [
            { type: "text", text: "In 5x + 3 = 2x + 15, x is on both sides. Collect the x terms on one side first." },
            {
              type: "points",
              items: ["Subtract 2x from both sides: 3x + 3 = 15.", "Subtract 3 from both sides: 3x = 12.", "Divide both sides by 3: x = 4."],
            },
            { type: "text", text: "Check: 5 × 4 + 3 = 23 and 2 × 4 + 15 = 23. The two sides match." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "When will they match?",
          blocks: [
            {
              type: "text",
              text: "Aiden has $40 and saves $5 a week. Bea has $10 and saves $8 a week. After how many weeks, w, will they have the same amount?",
            },
            {
              type: "points",
              items: [
                "Write it: 40 + 5w = 10 + 8w.",
                "Subtract 5w from both sides: 40 = 10 + 3w.",
                "Subtract 10: 30 = 3w. Divide by 3: w = 10.",
                "Check: after 10 weeks, Aiden has 40 + 50 = $90 and Bea has 10 + 80 = $90.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "No solution, or every number",
          blocks: [
            {
              type: "points",
              items: [
                "x + 3 = x + 5: subtract x from both sides and you get 3 = 5, which is false. No number works, so there is no solution.",
                "2(x + 1) = 2x + 2: distribute and you get 2x + 2 = 2x + 2. The sides are always equal, so every number is a solution.",
              ],
            },
            {
              type: "text",
              text: "If the x terms cancel out, look at what's left. A false statement means no solution. A true one means every number works.",
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Solve 7x − 4 = 3x + 8",
          prompt: "Solve 7x − 4 = 3x + 8. Move the marker to x.",
          widget: { kind: "number-line", min: -10, max: 10, step: 1, start: 0, target: 3 },
        },
        {
          id: "s5",
          kind: "interactive",
          title: "How many solutions?",
          prompt: "Sort each equation by how many solutions it has.",
          widget: {
            kind: "sorter",
            categories: ["One solution", "No solution", "Every number"],
            items: [
              { id: "a", text: "3x + 1 = x + 7", answer: 0 },
              { id: "b", text: "x + 4 = x + 9", answer: 1 },
              { id: "c", text: "3(x + 2) = 3x + 6", answer: 2 },
              { id: "d", text: "2x − 5 = 2x + 1", answer: 1 },
              { id: "e", text: "4x = 2x + 10", answer: 0 },
              { id: "f", text: "5x + 10 = 5(x + 2)", answer: 2 },
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
              prompt: "Solve 6x + 2 = 4x + 10.",
              choices: ["6", "−4", "8", "4"],
              answer: 3,
              hint: "Subtract 4x from both sides first.",
              explain: "6x − 4x = 2x, so 2x + 2 = 10. Then 2x = 8 and x = 4. Check: 6 × 4 + 2 = 26 and 4 × 4 + 10 = 26.",
            },
            {
              id: "q2",
              prompt: "Solve 9 − x = 2x + 3.",
              choices: ["2", "4", "−2", "6"],
              answer: 0,
              hint: "Add x to both sides, so all the x terms are on one side.",
              explain: "Add x: 9 = 3x + 3. Subtract 3: 6 = 3x. Divide by 3: x = 2. Check: 9 − 2 = 7 and 2 × 2 + 3 = 7.",
            },
            {
              id: "q3",
              prompt: "How many solutions does 4(x − 1) = 4x − 4 have?",
              choices: ["None", "Exactly one", "Every number is a solution"],
              answer: 2,
              hint: "Distribute the 4 on the left. Then compare the two sides.",
              explain: "4(x − 1) = 4x − 4, exactly the right side. Any value of x makes the equation true.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Head start or faster rate?",
          brief: "Compare two plans with an equation, then check with a table.",
          steps: [
            "Make up two savings plans, or find two phone or streaming plans in ads: one that starts higher and one that grows faster.",
            "Write an expression for each one after w weeks or months.",
            "Set the expressions equal and solve to find when they match.",
            "Make a table from 0 to 12 to check your answer.",
            "Explain to someone which plan is better for a short time and which is better for a long time.",
          ],
        },
      ],
    },
  ],
};

/** Practice on the skill map that fits each lesson (lesson id → skill ids). */
export const practice: Record<string, string[]> = {
  "one-step": ["m.eq.onestep"],
  "two-step": ["m.eq.twostep"],
  "simplify-first": ["m.expr.simplify", "m.eq.multistep"],
  "both-sides": ["m.eq.multistep"],
};

export default equations;
