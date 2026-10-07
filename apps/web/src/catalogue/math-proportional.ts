import type { CatalogueEntry } from "./types";

const proportional: CatalogueEntry = {
  id: "math-proportional",
  title: "Proportional relationships",
  summary:
    "Spot proportional relationships in tables, graphs and equations, find the constant of proportionality, solve proportions, and work with scale drawings.",
  subject: "math",
  grade: "7",
  locale: "en",
  lessons: [
    {
      id: "proportional-or-not",
      title: "Proportional or not?",
      summary: "Two quantities are proportional when their ratio stays the same. Test tables, graphs and situations.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "The same ratio every time",
          blocks: [
            {
              type: "text",
              text: "Two quantities are proportional when their ratio is always the same. One is always the same number times the other.",
            },
            { type: "text", text: "Strawberries cost $3 per pound. Pounds: 1, 2, 3, 4. Cost ($): 3, 6, 9, 12." },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 0], [1, 3], [2, 6], [3, 9], [4, 12]], xLabel: "Strawberries (pounds)", yLabel: "Cost ($)" },
              alt: "A line graph of the cost of strawberries: (0, 0), (1, 3), (2, 6), (3, 9) and (4, 12). The points lie on a straight line through (0, 0).",
            },
            { type: "points", items: ["Cost ÷ pounds is 3 in every row.", "0 pounds cost $0, so the line starts at (0, 0)."] },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "A starting fee breaks it",
          blocks: [
            { type: "text", text: "A taxi charges $4 to start, plus $2 per mile. Miles: 1, 2, 3, 4. Cost ($): 6, 8, 10, 12." },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 4], [1, 6], [2, 8], [3, 10], [4, 12]], xLabel: "Distance (miles)", yLabel: "Cost ($)" },
              alt: "A line graph of taxi cost: (0, 4), (1, 6), (2, 8), (3, 10) and (4, 12). The points lie on a straight line that starts at $4, above (0, 0).",
            },
            {
              type: "text",
              text: "Cost ÷ miles is 6, then 4, then about 3.33, then 3. The ratio keeps changing, so the cost isn't proportional to the distance.",
            },
            {
              type: "points",
              items: [
                "The graph is a straight line, but it doesn't pass through (0, 0).",
                "A straight line alone isn't enough. A proportional graph is a straight line through the origin, (0, 0).",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Proportional or not?",
          prompt: "Sort each table, line or situation. For a table, divide y by x in every row.",
          widget: {
            kind: "sorter",
            categories: ["Proportional", "Not proportional"],
            items: [
              { id: "t1", text: "x: 2, 4, 6. y: 10, 20, 30.", answer: 0 },
              { id: "t2", text: "x: 1, 2, 3. y: 4, 6, 8.", answer: 1 },
              { id: "tickets", text: "The total cost of movie tickets at $9 each, compared with the number of tickets", answer: 0 },
              { id: "gym", text: "The total cost of a gym with a $25 joining fee plus $10 a month, compared with the number of months", answer: 1 },
              { id: "line1", text: "A straight line through (0, 0) and (3, 6)", answer: 0 },
              { id: "line2", text: "A straight line through (0, 2) and (4, 10)", answer: 1 },
              { id: "perimeter", text: "The perimeter of a square, compared with its side length", answer: 0 },
              { id: "area", text: "The area of a square, compared with its side length", answer: 1 },
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
              prompt: "Which table shows a proportional relationship?",
              choices: ["x: 1, 2, 3. y: 3, 5, 7.", "x: 0, 1, 2. y: 1, 2, 4.", "x: 2, 3, 5. y: 8, 12, 20.", "x: 1, 3, 4. y: 2, 4, 5."],
              answer: 2,
              hint: "Divide y by x in every row. Look for the table where you always get the same number.",
              explain:
                "In that table, 8 ÷ 2, 12 ÷ 3 and 20 ÷ 5 all equal 4. In the others the ratio changes, and the table with (0, 1) can't be proportional, because 0 must go with 0.",
            },
            {
              id: "q2",
              prompt: "A graph is a straight line through (0, 5) and (2, 9). Is the relationship proportional?",
              choices: ["Yes, because the graph is a straight line", "No, because the line doesn't pass through (0, 0)"],
              answer: 1,
              hint: "Where must the graph of a proportional relationship start?",
              explain: "When x = 0, y = 5, not 0. A straight line that misses the origin isn't proportional.",
            },
            {
              id: "q3",
              prompt: "A recipe uses 2 cups of rice for 6 servings, and the relationship is proportional. Which is also true?",
              choices: ["3 cups make 7 servings", "5 cups make 15 servings", "4 cups make 10 servings"],
              answer: 1,
              hint: "Find the number of servings for 1 cup of rice.",
              explain: "6 ÷ 2 = 3 servings per cup, so 5 cups make 5 × 3 = 15 servings. 3 cups make 9 servings, and 4 cups make 12.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Steps and distance",
          brief: "Test whether the distance you walk is proportional to the number of steps you take.",
          steps: [
            "Mark a starting line. Walk 10 normal steps and measure the distance with a tape measure.",
            "Go back and do the same for 20 steps and for 30 steps.",
            "Make a table of steps and distance. Divide distance by steps in each row.",
            "Real measurements are never exact. Are your ratios close enough to call it proportional?",
            "Explain why 0 steps and 0 distance belong in your table.",
          ],
        },
      ],
    },
    {
      id: "constant",
      title: "The constant of proportionality",
      summary: "Find k, the number that y always equals times x, from a table, a graph or a story, and write y = kx.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "The number that stays the same",
          blocks: [
            {
              type: "text",
              text: "In a proportional relationship, y ÷ x is always the same number. That number is called the constant of proportionality, often written k.",
            },
            { type: "text", text: "So y = kx. A printer prints 8 pages per minute: pages = 8 × minutes, or y = 8x. Here k = 8." },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 0], [1, 8], [2, 16], [3, 24]], xLabel: "Time (minutes)", yLabel: "Pages printed" },
              alt: "A line graph of pages printed: (0, 0), (1, 8), (2, 16) and (3, 24). The points lie on a straight line through (0, 0).",
            },
            {
              type: "points",
              items: ["k is the unit rate: 8 pages per minute.", "On the graph, the point (1, k) is always on the line. Here it's (1, 8)."],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Finding k in a table",
          blocks: [
            { type: "text", text: "Gas costs the same amount for every gallon. Gallons: 2, 5, 10. Cost ($): 7, 17.50, 35." },
            { type: "points", items: ["7 ÷ 2 = 3.5", "17.50 ÷ 5 = 3.5", "35 ÷ 10 = 3.5"] },
            { type: "text", text: "Every row gives 3.5, so k = 3.5 and the equation is y = 3.5x. Gas costs $3.50 per gallon." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Find k",
          prompt: "A table shows x = 4, 6, 10 and y = 10, 15, 25. What is the constant of proportionality? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 5, step: 0.5, start: 0, target: 2.5 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Use the equation",
          prompt: "The same table follows y = 2.5x. What is y when x = 8? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 30, step: 1, start: 0, target: 20 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "A car moves at a steady speed. The equation y = 55x gives the miles y it travels in x hours. What does the 55 tell you?",
              choices: ["The trip takes 55 hours", "The car goes 55 miles each hour", "The car goes 55 miles in all", "The car started 55 miles from home"],
              answer: 1,
              hint: "In y = kx, k is the number of y-units for each 1 x-unit.",
              explain: "k = 55, and its units are miles per hour: the car travels 55 miles each hour.",
            },
            {
              id: "q2",
              prompt: "The point (4, 6) is on the graph of a proportional relationship. What is k?",
              choices: ["2/3", "24", "1.5", "10"],
              answer: 2,
              hint: "k = y ÷ x.",
              explain: "k = 6 ÷ 4 = 1.5, so y = 1.5x. The 2/3 comes from dividing x by y, the wrong way around.",
            },
            {
              id: "q3",
              prompt: "Which equation shows a proportional relationship?",
              choices: ["y = 4x + 1", "y = 0.4x", "y = x + 4", "y = 4"],
              answer: 1,
              hint: "A proportional equation has the form y = kx, with nothing added.",
              explain:
                "y = 0.4x has the form y = kx, with k = 0.4. y = 4x + 1 and y = x + 4 add a number, so their graphs miss (0, 0). y = 4 doesn't depend on x at all.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "k on a food label",
          brief: "Use a nutrition label to write a proportional equation.",
          steps: [
            "Find a food package with a nutrition label. It lists amounts for one serving.",
            "Pick one amount, like grams of sugar or protein, and make a table for 1, 2 and 3 servings.",
            "Find k: the grams per serving.",
            "Write y = kx, where x is the number of servings and y is the grams.",
            "Use your equation to find the grams in half a serving, and explain to someone at home what k means.",
          ],
        },
      ],
    },
    {
      id: "solving-proportions",
      title: "Solving proportions",
      summary: "Set up a proportion with the units in matching places, solve it by scaling or with cross products, and check the answer.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Two equal ratios",
          blocks: [
            { type: "text", text: "A proportion says that two ratios are equal, such as 3/5 = 12/20." },
            { type: "text", text: "3 notebooks cost $5. What do 12 notebooks cost? Write notebooks over dollars on both sides: 3/5 = 12/x." },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 0], [3, 5], [6, 10], [9, 15], [12, 20]], xLabel: "Notebooks", yLabel: "Cost ($)" },
              alt: "A line graph of notebook cost: (0, 0), (3, 5), (6, 10), (9, 15) and (12, 20). The points lie on a straight line through (0, 0).",
            },
            { type: "text", text: "12 is 3 × 4, so the cost is 5 × 4 = $20." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Cross products",
          blocks: [
            { type: "text", text: "When the numbers don't scale neatly, use cross products. In a proportion a/b = c/d, a × d = b × c." },
            {
              type: "points",
              items: [
                "6/9 = 10/x",
                "Multiply across: 6 × x = 9 × 10, so 6x = 90.",
                "Divide both sides by 6: x = 15.",
                "Check: 6/9 and 10/15 both simplify to 2/3.",
              ],
            },
            {
              type: "text",
              text: "Keep the units in matching places. You can also compare like with like: 3/12 = 5/x puts notebooks with notebooks and dollars with dollars, and it gives the same $20.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Set up right?",
          prompt: "3 pens cost $2, and x is the cost of 12 pens. Sort each proportion: does it keep pens and dollars in matching places?",
          widget: {
            kind: "sorter",
            categories: ["Set up correctly", "Units mixed up"],
            items: [
              { id: "a", text: "3/2 = 12/x", answer: 0 },
              { id: "b", text: "2/3 = x/12", answer: 0 },
              { id: "c", text: "3/12 = 2/x", answer: 0 },
              { id: "d", text: "3/2 = x/12", answer: 1 },
              { id: "e", text: "2/3 = 12/x", answer: 1 },
              { id: "f", text: "12/x = 3/2", answer: 0 },
            ],
          },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Solve it",
          prompt: "Solve 4/10 = 6/x. Move the marker to x.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 15 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Solve x/8 = 3/4.",
              choices: ["2", "24", "32/3", "6"],
              answer: 3,
              hint: "Multiply across: 4 × x = 8 × 3.",
              explain: "4x = 24, so x = 6. Check: 6/8 simplifies to 3/4.",
            },
            {
              id: "q2",
              prompt: "5 bags of apples weigh 15 pounds in all, and each bag weighs the same. How much do 7 bags weigh?",
              choices: ["17 pounds", "21 pounds", "35 pounds", "105 pounds"],
              answer: 1,
              hint: "Set up bags over pounds on both sides: 5/15 = 7/x.",
              explain: "5x = 105, so x = 21 pounds. Or use the unit rate: each bag weighs 3 pounds, and 7 × 3 = 21.",
            },
            {
              id: "q3",
              prompt: "Which question can't be answered with a proportion?",
              choices: [
                "How much flour do you need to triple a cookie recipe?",
                "What do 8 tickets cost if 3 tickets cost $27?",
                "How tall will a 10-year-old be at age 20?",
              ],
              answer: 2,
              hint: "A proportion only works when the two amounts keep the same ratio.",
              explain:
                "People don't grow in proportion to their age, so you can't double a 10-year-old's height to predict it at 20. The recipe and the tickets keep the same ratio.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "How long will the chapter take?",
          brief: "Use a proportion to predict your reading time, then test it.",
          steps: [
            "Pick a chapter in a book you're reading. Time how long it takes you to read 2 pages.",
            "Count the pages left in the chapter.",
            "Write a proportion: 2 pages over your minutes = chapter pages over x minutes. Solve for x.",
            "Read the chapter and time it.",
            "Compare your prediction with the real time, and explain why they might not match.",
          ],
        },
      ],
    },
    {
      id: "scale-drawings",
      title: "Scale drawings",
      summary: "Use a scale to turn lengths on a map or plan into real lengths and back, and see why areas scale differently.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Drawn to scale",
          blocks: [
            {
              type: "text",
              text: "A scale drawing shows a real object with every length shrunk or enlarged by the same factor. Maps, floor plans and model cars are scale drawings.",
            },
            { type: "text", text: "The scale 1 cm : 2 m means 1 cm on the drawing stands for 2 m in real life." },
            {
              type: "visual",
              visual: { kind: "rect", w: 5, h: 3, unit: "cm" },
              alt: "A rectangle 5 cm long and 3 cm wide: the drawing of a garden on a plan.",
            },
            { type: "text", text: "A garden on a plan is 5 cm by 3 cm. The real garden is 5 × 2 = 10 m long and 3 × 2 = 6 m wide." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Lengths and areas",
          blocks: [
            {
              type: "points",
              items: [
                "From the drawing to real life, multiply by the scale.",
                "From real life to the drawing, divide by the scale.",
                "Areas don't follow the scale. Each 1 cm by 1 cm square on the plan stands for a 2 m by 2 m square in the garden, which is 4 m².",
              ],
            },
            {
              type: "text",
              text: "The plan's area is 5 × 3 = 15 cm². The real garden's area is 10 × 6 = 60 m², which is 15 × 4, not 15 × 2. Find the real lengths first, then the area.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Map distance",
          prompt:
            "On a map, 1 cm stands for 5 km. Two towns are 7 cm apart on the map. How far apart are they in real life, in kilometers? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 50, step: 1, start: 0, target: 35 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Model car",
          prompt:
            "A model car is built at a scale of 1 : 24, so every length on the model is 1/24 of the real length. The real car is 4.8 m long. How long is the model, in centimeters? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 40, step: 1, start: 0, target: 20 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "A floor plan uses the scale 1 inch : 4 feet. A wall is 3.5 inches long on the plan. How long is the real wall?",
              choices: ["7.5 feet", "14 feet", "0.875 feet", "12 feet"],
              answer: 1,
              hint: "Each inch on the plan stands for 4 feet.",
              explain: "3.5 × 4 = 14, so the real wall is 14 feet long.",
            },
            {
              id: "q2",
              prompt: "Two cities are 150 km apart. How far apart are they on a map with a scale of 1 cm : 25 km?",
              choices: ["6 cm", "125 cm", "175 cm", "3,750 cm"],
              answer: 0,
              hint: "From real life to the map, divide by the scale.",
              explain: "150 ÷ 25 = 6, so the cities are 6 cm apart on the map.",
            },
            {
              id: "q3",
              prompt: "A square patio is drawn 2 cm on each side, at a scale of 1 cm : 3 m. What is the real patio's area?",
              choices: ["12 m²", "6 m²", "36 m²", "4 m²"],
              answer: 2,
              hint: "Find the real side length first, then the area.",
              explain: "Each real side is 2 × 3 = 6 m, so the area is 6 × 6 = 36 m². Multiplying the plan's 4 cm² by 3 gives 12, which is too small.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Your room to scale",
          brief: "Make a floor plan of a real room.",
          steps: [
            "Measure the length and width of a room at home, in feet or meters.",
            "Choose a scale that fits your paper, such as 1 cm : 0.5 m or 1 inch : 2 feet.",
            "Divide each real length by the scale to get the lengths to draw. Draw the room on graph paper.",
            "Measure a bed, a table or a rug and add it to the plan at the same scale.",
            "Ask someone to use your plan and the scale to find a real length, then check it with the tape measure.",
          ],
        },
      ],
    },
  ],
};

/** Practice on the skill map that fits each lesson (lesson id → skill ids). */
export const practice: Record<string, string[]> = {
  "proportional-or-not": ["m.proportion"],
  constant: ["m.proportion", "m.ratio.unit"],
  "solving-proportions": ["m.proportion"],
  "scale-drawings": ["m.proportion"],
};

export default proportional;
