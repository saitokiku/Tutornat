import type { CatalogueEntry } from "./types";

const linearFunctions: CatalogueEntry = {
  id: "math-linear-functions",
  title: "Linear functions",
  summary:
    "Treat a function as a rule with one output for each input, find the rate of change and initial value, tell linear functions from nonlinear ones in function tables, and read graphs.",
  subject: "math",
  grade: "8",
  locale: "en",
  lessons: [
    {
      id: "functions",
      title: "One output for each input",
      summary: "A function is a rule that gives exactly one output for each input. Work with rules, tables and lists of points.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "An input-output rule",
          blocks: [
            { type: "text", text: "On a snack machine, you press a button and get a snack. Press B, get pretzels. Press B again, and you get pretzels again." },
            { type: "text", text: "A function works the same way: it is a rule that gives exactly one output for each input. The button is the input and the snack is the output." },
            { type: "text", text: "Rule: multiply by 2, then add 1. Input 3 gives output 7. Input 10 gives output 21." },
            {
              type: "points",
              items: ["Call the input x and the output y. This rule is y = 2x + 1.", "A table of the rule: x: 0, 1, 2, 3. y: 1, 3, 5, 7."],
            },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 1], [1, 3], [2, 5], [3, 7]], xLabel: "Input (x)", yLabel: "Output (y)" },
              alt: "A graph of y = 2x + 1: the points (0, 1), (1, 3), (2, 5) and (3, 7) lie on a straight line.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Function or not?",
          blocks: [
            { type: "text", text: "A table or a list of points is a function when no input has two different outputs." },
            {
              type: "points",
              items: [
                "x: 1, 2, 3, 4 with y: 5, 5, 6, 6 is a function. Outputs can repeat.",
                "x: 1, 1, 2, 3 with y: 4, 7, 8, 9 is not a function. The input 1 has two outputs, 4 and 7.",
              ],
            },
            {
              type: "text",
              text: "An everyday example: each person has one birthday, so person → birthday is a function. Many people share a birthday, so birthday → person isn't.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Function or not?",
          prompt: "Sort each one. Look for an input with two different outputs.",
          widget: {
            kind: "sorter",
            categories: ["Function", "Not a function"],
            items: [
              { id: "t1", text: "x: 1, 2, 3. y: 4, 8, 12.", answer: 0 },
              { id: "t2", text: "x: 2, 2, 5. y: 1, 3, 7.", answer: 1 },
              { id: "t3", text: "x: 0, 1, 2, 3. y: 9, 9, 9, 9.", answer: 0 },
              { id: "pts1", text: "(1, 2), (3, 4), (1, 5)", answer: 1 },
              { id: "pts2", text: "(−1, 0), (0, 0), (1, 0)", answer: 0 },
              { id: "shoe", text: "Each student in a class → that student's shoe size", answer: 0 },
              { id: "size", text: "Shoe size → student, in a class where three students wear size 6", answer: 1 },
            ],
          },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Use the rule",
          prompt: "The rule is y = −2x + 3. What is y when x = 4? Move the marker to your answer.",
          widget: { kind: "number-line", min: -10, max: 10, step: 1, start: 0, target: -5 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "The rule is y = 4x − 1. What is y when x = 3?",
              choices: ["13", "11", "7", "12"],
              answer: 1,
              hint: "Put 3 in place of x. Multiply first, then subtract.",
              explain: "4 × 3 − 1 = 12 − 1 = 11.",
            },
            {
              id: "q2",
              prompt: "Which set of points is not a function?",
              choices: ["(1, 3), (2, 3), (3, 3)", "(4, 1), (4, 2), (5, 3)", "(0, 1), (1, 2), (2, 3)"],
              answer: 1,
              hint: "Look for an input (x) that appears with two different outputs.",
              explain: "The input 4 has two outputs, 1 and 2, so that set isn't a function. Repeated outputs, like the 3s in the first set, are fine.",
            },
            {
              id: "q3",
              prompt: "A snack machine is a function from button to snack when each button gives exactly one snack. Which of these breaks that rule?",
              choices: ["Button A always gives crackers.", "Buttons C and D both give pretzels.", "Button B sometimes gives crackers and sometimes pretzels."],
              answer: 2,
              hint: "The input is the button and the output is the snack.",
              explain: "Button B gives two different outputs for the same input, so a machine with that button isn't a function. Two buttons giving the same snack is fine.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Function hunt",
          brief: "Find functions in everyday life, and test them by flipping them around.",
          steps: [
            "List three relationships at home, like “people at dinner → plates to set” or “family member → age.”",
            "For each one, check: does each input have exactly one output?",
            "Flip each one around, like “age → family member.” Is the flipped one still a function?",
            "Write one of your functions as a rule, like plates = people.",
            "Explain to someone why a function can't give two outputs for one input.",
          ],
        },
      ],
    },
    {
      id: "rate-initial",
      title: "Rate of change and initial value",
      summary: "Every linear function has a constant rate of change and a starting value. Find both from a story, a table or two points.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "A pool filling up",
          blocks: [
            { type: "text", text: "A pool already holds 100 liters of water. A hose adds 50 liters each minute." },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 100], [1, 150], [2, 200], [3, 250], [4, 300]], xLabel: "Time (minutes)", yLabel: "Water (liters)" },
              alt: "A line graph of water in the pool: (0, 100), (1, 150), (2, 200), (3, 250) and (4, 300). The line starts at 100 liters and rises 50 liters each minute.",
            },
            {
              type: "points",
              items: [
                "Initial value: 100 liters, the amount when x = 0. On the graph, it's where the line meets the y-axis.",
                "Rate of change: 50 liters per minute. It's the slope of the line.",
                "The function is y = 50x + 100.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "From a table",
          blocks: [
            { type: "text", text: "Another pool fills at a steady rate. Minutes: 2, 4, 6. Water (liters): 40, 70, 100." },
            {
              type: "points",
              items: [
                "Rate of change = change in y ÷ change in x = 30 ÷ 2 = 15 liters per minute.",
                "Work back to x = 0: 40 − 2 × 15 = 10 liters at the start.",
                "So y = 15x + 10. Check with the last row: 15 × 6 + 10 = 100.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "The taxi's rate",
          prompt:
            "A taxi ride costs $11 for 3 miles and $19 for 7 miles, and the cost is a linear function of the distance. What is the rate of change, in dollars per mile? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 5, step: 0.5, start: 0, target: 2 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "The taxi's starting fee",
          prompt: "Same taxi: what is the initial value, the cost before any miles are driven? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 10, step: 1, start: 0, target: 5 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "A plant is 6 cm tall and grows 1.5 cm per week. Which function gives its height y after x weeks?",
              choices: ["y = 6x + 1.5", "y = 7.5x", "y = 1.5x + 6", "y = 1.5x"],
              answer: 2,
              hint: "The rate of change multiplies x. The starting value is added.",
              explain: "The plant starts at 6 cm and grows 1.5 cm each week, so y = 1.5x + 6.",
            },
            {
              id: "q2",
              prompt: "x: 0, 1, 2, 3. y: 20, 17, 14, 11. What are the rate of change and the initial value?",
              choices: ["Rate −3, initial value 20", "Rate 3, initial value 20", "Rate −3, initial value 11", "Rate 20, initial value −3"],
              answer: 0,
              hint: "How does y change each time x goes up by 1? What is y when x = 0?",
              explain: "y drops by 3 each step, so the rate is −3. At x = 0, y = 20. The function is y = −3x + 20.",
            },
            {
              id: "q3",
              prompt: "A phone's battery level is y = −5x + 80 percent after x hours. What does the 80 mean?",
              choices: ["The battery lasts 80 hours.", "The battery loses 80% each hour.", "The battery was at 80% at the start."],
              answer: 2,
              hint: "What is y when x = 0?",
              explain: "When x = 0, y = 80, so the battery started at 80%. The −5 is the rate: it loses 5 percentage points each hour.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Fill a jar",
          brief: "Measure a jar filling up, and find the rate of change and the initial value.",
          steps: [
            "Find a jar or glass with straight sides, a ruler, and a small cup or spoon to scoop water.",
            "Pour some water in to start. Measure the water's height in centimeters.",
            "Add one scoop at a time and measure the height after each. Make a table of scoops and height.",
            "Find the rate of change (centimeters per scoop) and the initial value (the height at 0 scoops). Write the function.",
            "Predict the height after 3 more scoops, then test it. If your jar is wider in some places, explain what that does to the rate.",
          ],
        },
      ],
    },
    {
      id: "linear-nonlinear",
      title: "Linear or nonlinear?",
      summary: "Linear functions change by the same amount for each step in x, and their graphs are straight lines. Spot the ones that aren't.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Equal steps, equal changes",
          blocks: [
            { type: "text", text: "A function is linear when equal steps in x always give equal changes in y. Its graph is a straight line." },
            {
              type: "points",
              items: [
                "Linear: saving $10 a week gives 0, 10, 20, 30 dollars. The change is 10 every time.",
                "Nonlinear: squares with sides of 1, 2, 3 and 4 cm have areas of 1, 4, 9 and 16 cm². The changes are 3, 5 and 7.",
              ],
            },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 0], [1, 1], [2, 4], [3, 9], [4, 16]], xLabel: "Side length (cm)", yLabel: "Area (cm²)" },
              alt: "A graph of a square's area against its side length: (0, 0), (1, 1), (2, 4), (3, 9) and (4, 16). The points bend upward instead of lying on one straight line.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "In an equation",
          blocks: [
            { type: "text", text: "A linear function can be written as y = mx + b." },
            {
              type: "points",
              items: [
                "Linear: y = 3x − 2, y = −x, y = 0.5x + 4, and y = 7, a flat line with a rate of change of 0.",
                "Nonlinear: y = x², y = x³ + 1 and y = 12/x.",
              ],
            },
            { type: "text", text: "If x is squared, cubed or in a denominator, the function isn't linear." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Linear or nonlinear?",
          prompt: "Sort each equation, table or situation.",
          widget: {
            kind: "sorter",
            categories: ["Linear", "Nonlinear"],
            items: [
              { id: "e1", text: "y = 4x + 1", answer: 0 },
              { id: "e2", text: "y = x² − 3", answer: 1 },
              { id: "t1", text: "x: 0, 1, 2, 3. y: 5, 8, 11, 14.", answer: 0 },
              { id: "t2", text: "x: 0, 1, 2, 3. y: 1, 2, 4, 8.", answer: 1 },
              { id: "t3", text: "x: 1, 2, 3, 4. y: 12, 6, 4, 3.", answer: 1 },
              { id: "area", text: "The area of a square as its side length grows", answer: 1 },
              { id: "apples", text: "The cost of apples at $2 per pound", answer: 0 },
              { id: "e3", text: "y = −2x", answer: 0 },
            ],
          },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "The missing value",
          prompt: "This table is linear: x: 0, 2, 4, 6 and y: 3, 7, ?, 15. What is the missing y-value? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 11 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Which table is linear?",
              choices: ["x: 0, 1, 2, 3. y: 2, 4, 8, 16.", "x: 0, 1, 2, 3. y: 0, 1, 4, 9.", "x: 0, 1, 2, 3. y: 10, 7, 4, 1."],
              answer: 2,
              hint: "Find the change in y for each step. A linear table has the same change every time.",
              explain: "In the third table, y drops by 3 every step. In the other two, the change grows from step to step.",
            },
            {
              id: "q2",
              prompt: "Is y = x² a linear function?",
              choices: ["Yes, because it has an x in it", "No, because the changes in y grow as x grows"],
              answer: 1,
              hint: "Find y for x = 0, 1, 2 and 3. Then look at the changes.",
              explain: "y = 0, 1, 4, 9. The changes are 1, 3 and 5. They aren't equal, so the graph curves and the function is nonlinear.",
            },
            {
              id: "q3",
              prompt: "A table has x: 1, 3, 5 and y: 4, 10, 16. Is it linear, and what is its rate of change?",
              choices: ["Linear, rate 6", "Linear, rate 3", "Nonlinear"],
              answer: 1,
              hint: "x goes up by 2 each time, not 1. Divide the change in y by 2.",
              explain: "y goes up 6 each time x goes up 2, so the rate is 6 ÷ 2 = 3. The changes are equal, so it's linear: y = 3x + 1.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Fold and stack",
          brief: "Make one linear table and one nonlinear table with things from home, and compare their graphs.",
          steps: [
            "Fold a sheet of paper in half again and again. After each fold, count the layers.",
            "Record folds 0 to 5 and the number of layers in a table.",
            "Now stack coins or buttons, 3 at a time, and record the total after each turn.",
            "Find the change between rows in each table. Which one changes by the same amount every time?",
            "Graph both tables on one sheet, and explain to someone which one is linear and how the graph shows it.",
          ],
        },
      ],
    },
    {
      id: "reading-graphs",
      title: "Reading graphs of functions",
      summary: "Tell the story of a graph: where it increases, decreases or stays constant, and where it changes fastest.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "A bike ride on a graph",
          blocks: [
            { type: "text", text: "This graph shows a bike ride: the distance from home over time." },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 0], [1, 10], [2, 20], [3, 20], [4, 0]], xLabel: "Time (hours)", yLabel: "Distance from home (km)" },
              alt: "A graph of distance from home over 4 hours. It rises from 0 to 20 km over the first 2 hours, stays flat at 20 km from hour 2 to hour 3, then falls back to 0 km at hour 4.",
            },
            {
              type: "points",
              items: [
                "Increasing, hours 0 to 2: riding away from home at 10 km per hour.",
                "Constant, hours 2 to 3: stopped, 20 km from home.",
                "Decreasing, hours 3 to 4: riding home. 20 km in 1 hour is the fastest part of the trip, so it's the steepest part of the graph.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Stories without numbers",
          blocks: [
            { type: "text", text: "You can describe a graph, or sketch one from a story, without any numbers." },
            {
              type: "points",
              items: [
                "Water in a tub while it fills: increasing.",
                "Water in the tub while someone sits in the bath: about constant.",
                "Water in the tub after the plug is pulled: decreasing.",
              ],
            },
            {
              type: "text",
              text: "A graph made of straight pieces with different rates, like the bike ride, isn't one linear function. Each piece is linear on its own.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Increasing, decreasing or constant?",
          prompt: "Each quantity is graphed against time. Sort them.",
          widget: {
            kind: "sorter",
            categories: ["Increasing", "Decreasing", "Constant"],
            items: [
              { id: "candle", text: "The height of a burning candle", answer: 1 },
              { id: "jar", text: "The money in a jar when you add $2 every day", answer: 0 },
              { id: "school", text: "Your distance from home while you sit in class all morning", answer: 2 },
              { id: "drain", text: "The water in a bathtub after the plug is pulled", answer: 1 },
              { id: "pages", text: "The total number of pages you've read, as you keep reading", answer: 0 },
              { id: "parked", text: "The distance between two parked cars", answer: 2 },
            ],
          },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "The ride home",
          prompt:
            "On the bike graph, the distance falls from 20 km to 0 km between hour 3 and hour 4. What is the rate of change for that part, in km per hour? Move the marker to your answer.",
          widget: { kind: "number-line", min: -25, max: 25, step: 5, start: 0, target: -20 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "On a graph of distance from home, what does a flat part mean?",
              choices: ["The person is moving fast.", "The person is going home.", "The person isn't moving."],
              answer: 2,
              hint: "Flat means y isn't changing.",
              explain: "A flat part has a rate of change of 0. The distance from home stays the same, so the person is stopped.",
            },
            {
              id: "q2",
              prompt: "Which graph shows one linear function?",
              choices: ["A curve that bends upward", "A straight line that rises", "A line that rises, goes flat, then falls"],
              answer: 1,
              hint: "A linear function has one constant rate of change the whole way.",
              explain:
                "Only the straight line has one rate the whole way. The bike ride has three different rates, so it's made of linear pieces but isn't one linear function.",
            },
            {
              id: "q3",
              prompt: "A car's fuel tank holds y = −3x + 45 liters after x hours of driving. When is the tank empty?",
              choices: ["After 45 hours", "After 15 hours", "After 3 hours", "After 42 hours"],
              answer: 1,
              hint: "Empty means y = 0. Solve −3x + 45 = 0.",
              explain: "−3x + 45 = 0, so 3x = 45 and x = 15 hours.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Graph your day",
          brief: "Track one quantity over a day and tell its story with a graph.",
          steps: [
            "Pick something that changes during your day: your distance from home, a device's battery, or the water in a bottle you drink from.",
            "Every hour or so, write down the time and the amount. Estimates are fine.",
            "Draw a graph with time across and the amount up. Join the points with straight lines.",
            "Label the parts that increase, decrease or stay constant, and mark the steepest part.",
            "Tell someone the story of your graph without saying what it measures, and see if they can guess.",
          ],
        },
      ],
    },
  ],
};

/** Practice on the skill map that fits each lesson (lesson id → skill ids). */
export const practice: Record<string, string[]> = {
  // m.linear.table uses the lesson's "the rule is y = mx + b"; m.func.eval is grade 9, with f(x) notation and x².
  functions: ["m.linear.table"],
  "rate-initial": ["m.linear.table", "m.slope"],
  "linear-nonlinear": ["m.linear.table"],
  "reading-graphs": ["m.slope"],
};

export default linearFunctions;
