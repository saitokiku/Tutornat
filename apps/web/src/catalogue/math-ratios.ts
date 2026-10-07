import type { CatalogueEntry } from "./types";

const ratios: CatalogueEntry = {
  id: "math-ratios",
  title: "Ratios and rates",
  summary: "Compare two amounts with ratios, build ratio tables of equivalent ratios, and use unit rates and unit prices to solve problems.",
  subject: "math",
  grade: "6",
  locale: "en",
  lessons: [
    {
      id: "what-ratio",
      title: "What a ratio compares",
      summary: "Write a ratio in the right order, draw it as a tape diagram, and tell part-to-part ratios from part-to-whole ratios.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Two amounts, side by side",
          blocks: [
            { type: "text", text: "A ratio compares two amounts. A fruit punch uses 3 cups of orange juice for every 2 cups of mango juice." },
            {
              type: "visual",
              visual: { kind: "fraction", parts: 5, shaded: 3 },
              alt: "A tape cut into 5 equal boxes. 3 boxes are shaded for the cups of orange juice and 2 are empty for the cups of mango juice.",
            },
            { type: "text", text: "This picture is a tape diagram, with one box for each cup. The ratio of orange juice to mango juice is 3 to 2." },
            {
              type: "points",
              items: [
                "You can write it as 3 to 2 or as 3 : 2.",
                "Order matters. Mango juice to orange juice is 2 : 3, a different ratio.",
                "Say it as a sentence: for every 3 cups of orange juice, there are 2 cups of mango juice.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Part to part, part to whole",
          blocks: [
            { type: "text", text: "A bowl holds 4 green apples and 6 red apples, 10 apples in all." },
            {
              type: "visual",
              visual: { kind: "dots", groups: [4, 6] },
              alt: "Two groups of counters side by side: 4 counters for the green apples and 6 counters for the red apples.",
            },
            {
              type: "points",
              items: [
                "Part to part: green apples to red apples is 4 : 6.",
                "Part to whole: green apples to all the apples is 4 : 10.",
                "A part-to-whole ratio is the same as a fraction of the whole: 4/10 of the apples are green.",
              ],
            },
            { type: "text", text: "Check what a ratio compares before you write it. 4 : 6 and 4 : 10 describe the same bowl, but they say different things." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Build the paint tape",
          prompt:
            "A paint color uses 2 cans of blue for every 3 cans of white. Make a tape for one batch, with one equal part for each can, and shade the blue cans. The readout then shows what fraction of the paint is blue.",
          widget: { kind: "fraction-bar", parts: 1, shaded: 0, target: { parts: 5, shaded: 2 } },
        },
        {
          id: "s4",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "A recipe uses 4 eggs for every 3 cups of flour. What is the ratio of flour to eggs?",
              choices: ["4 : 3", "3 : 4", "3 : 7", "7 : 4"],
              answer: 1,
              hint: "The amount named first goes first. Which is named first in the question?",
              explain: "The question names flour first, so its amount comes first: 3 cups of flour to 4 eggs, or 3 : 4.",
            },
            {
              id: "q2",
              prompt: "A team won 7 games and lost 5, with no ties. What is the ratio of games won to games played?",
              choices: ["7 : 5", "5 : 12", "12 : 7", "7 : 12"],
              answer: 3,
              hint: "Games played = games won + games lost.",
              explain: "The team played 7 + 5 = 12 games. Won to played is 7 : 12, a part-to-whole ratio.",
            },
            {
              id: "q3",
              prompt: "A drink is 3 parts juice to 1 part sparkling water. What fraction of the drink is juice?",
              choices: ["1/3", "1/4", "3/4", "3/1"],
              answer: 2,
              hint: "Add the parts to find the whole. Then count the juice parts.",
              explain: "The drink has 3 + 1 = 4 equal parts, and 3 of them are juice, so 3/4 of the drink is juice.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Ratios in the kitchen",
          brief: "Find ratios in recipes or on food packages at home.",
          steps: [
            "Find a recipe in a cookbook, on a package, or from someone at home.",
            "Pick two ingredients measured in the same unit, such as cups or spoons. Write their ratio both ways, like 2 : 1 and 1 : 2.",
            "Draw a tape diagram for one of the ratios, with one box for each unit.",
            "Write a part-to-whole ratio: one ingredient compared with the total of the two.",
            "Tell someone what your ratio means, using the words “for every.”",
          ],
        },
      ],
    },
    {
      id: "ratio-tables",
      title: "Equivalent ratios and ratio tables",
      summary: "Scale a ratio up or down by multiplying or dividing both parts by the same number, and list equivalent ratios in a ratio table.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "A bigger batch, the same taste",
          blocks: [
            { type: "text", text: "To make more punch that tastes the same, multiply both amounts by the same number." },
            {
              type: "visual",
              visual: { kind: "fraction", parts: 10, shaded: 6 },
              alt: "A tape cut into 10 equal boxes: 6 shaded for orange juice and 4 empty for mango juice. It is the 3 : 2 tape, doubled.",
            },
            {
              type: "text",
              text: "Two batches use 6 cups of orange juice and 4 cups of mango juice. 3 : 2 and 6 : 4 are equivalent ratios: they describe the same mix.",
            },
            {
              type: "points",
              items: [
                "Multiply both parts by the same number: 3 : 2 = 9 : 6 (times 3).",
                "Divide both parts by the same number: 6 : 4 = 3 : 2 (divided by 2).",
                "Adding the same number to both parts doesn't work. 4 : 3 has more mango juice for each cup of orange juice than 3 : 2, so it tastes different.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "A ratio table",
          blocks: [
            { type: "text", text: "A ratio table lists equivalent ratios. Each column is the same punch, made in a different-sized batch." },
            { type: "text", text: "Orange juice (cups): 3, 6, 9, 12. Mango juice (cups): 2, 4, 6, 8." },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 0], [2, 3], [4, 6], [6, 9], [8, 12]], xLabel: "Mango juice (cups)", yLabel: "Orange juice (cups)" },
              alt: "The ratio table plotted as points, with cups of mango juice across and cups of orange juice up: (0, 0), (2, 3), (4, 6), (6, 9) and (8, 12). The points lie on a straight line through (0, 0).",
            },
            { type: "text", text: "When you plot equivalent ratios as points, they always line up on a straight line through (0, 0)." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Three batches of lemonade",
          prompt:
            "Lemonade uses 1 cup of lemon juice for every 3 cups of water. The bar shows one batch. Change it to show 3 batches, with one equal part for each cup, and shade the lemon juice.",
          widget: { kind: "fraction-bar", parts: 4, shaded: 1, target: { parts: 12, shaded: 3 } },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Fill in the table",
          prompt:
            "A ratio table for the lemonade shows lemon juice 1, 2, 5 and water 3, 6, ? cups. How many cups of water go with 5 cups of lemon juice? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 15 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Which ratio is equivalent to 4 : 6?",
              choices: ["6 : 8", "8 : 10", "2 : 3", "5 : 7"],
              answer: 2,
              hint: "Try dividing both numbers by the same number.",
              explain: "Divide both parts of 4 : 6 by 2 to get 2 : 3. The ratios 6 : 8, 8 : 10 and 5 : 7 add the same amount to both parts, which changes the ratio.",
            },
            {
              id: "q2",
              prompt: "5 pencils cost $2. At the same price, how much do 20 pencils cost?",
              choices: ["$4", "$8", "$10", "$17"],
              answer: 1,
              hint: "What do you multiply 5 by to get 20? Do the same to the cost.",
              explain: "20 = 5 × 4, so the cost is $2 × 4 = $8.",
            },
            {
              id: "q3",
              prompt: "Mia mixes 2 cups of blue paint with 3 cups of yellow. Leo mixes 4 cups of blue with 5 cups of yellow. Will their greens match?",
              choices: ["Yes, both used 1 more cup of yellow than blue", "Yes, both mixed blue and yellow", "No, 4 : 5 isn't equivalent to 2 : 3"],
              answer: 2,
              hint: "Double Mia's mix. Do you get Leo's?",
              explain: "Doubling 2 : 3 gives 4 : 6, not 4 : 5. Leo's paint has less yellow for each cup of blue, so his green will look bluer.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Halve or double a recipe",
          brief: "Use a ratio table to resize a real recipe.",
          steps: [
            "Choose a recipe with at least three ingredients.",
            "Make a ratio table with a column for half a batch, 1 batch and 2 batches.",
            "Check each column: did you multiply or divide every ingredient by the same number?",
            "If you can, cook the half or double batch with a grown-up.",
            "Explain to someone why adding 1 cup to every ingredient would change the taste.",
          ],
        },
      ],
    },
    {
      id: "unit-rates",
      title: "Unit rates and unit prices",
      summary: "Find how much for one, like miles per hour or price per item, and use unit prices to compare.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "How much for one",
          blocks: [
            {
              type: "text",
              text: "A rate compares two amounts measured in different units, like miles and hours. A unit rate tells how much there is for 1 of the second amount.",
            },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 0], [1, 12], [2, 24], [3, 36]], xLabel: "Time (hours)", yLabel: "Distance (miles)" },
              alt: "A line graph of a bike ride: (0, 0), (1, 12), (2, 24) and (3, 36). The distance goes up 12 miles every hour.",
            },
            { type: "text", text: "A cyclist rides 36 miles in 3 hours at a steady speed. The unit rate is 36 ÷ 3 = 12 miles per hour." },
            {
              type: "points",
              items: [
                "Per means “for each.”",
                "To find a unit rate, divide the first amount by the second.",
                "On the graph, the unit rate is how far the line rises for each 1 hour.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Unit price",
          blocks: [
            { type: "text", text: "A unit price is a unit rate for money: the cost of 1 item, or of 1 ounce, pound or liter." },
            {
              type: "points",
              items: [
                "A 6-pack of yogurt costs $4.50. The unit price is $4.50 ÷ 6 = $0.75 per yogurt.",
                "A 12-pack costs $8.40. The unit price is $8.40 ÷ 12 = $0.70 per yogurt.",
                "The 12-pack costs less per yogurt. It's the better buy if all 12 get eaten before they spoil.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Price per juice box",
          prompt: "A pack of 4 juice boxes costs $3. What is the price of 1 juice box, in dollars? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 2, step: 0.25, start: 0, target: 0.75 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Which pack costs less per item?",
          prompt: "Find the unit price of each pack. Then sort each pair by which pack costs less per item.",
          widget: {
            kind: "sorter",
            categories: ["A costs less", "B costs less", "Same unit price"],
            items: [
              { id: "p1", text: "A: 3 for $1.50. B: 5 for $2.00.", answer: 1 },
              { id: "p2", text: "A: 2 for $5. B: 4 for $10.", answer: 2 },
              { id: "p3", text: "A: 10 for $4. B: 4 for $2.", answer: 0 },
              { id: "p4", text: "A: 6 for $3. B: 8 for $4.80.", answer: 0 },
              { id: "p5", text: "A: 12 for $6. B: 3 for $1.50.", answer: 2 },
              { id: "p6", text: "A: 8 for $2. B: 5 for $1.", answer: 1 },
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
              prompt: "A printer prints 90 pages in 6 minutes. How many pages per minute is that?",
              choices: ["84", "15", "96", "540"],
              answer: 1,
              hint: "Per minute means for 1 minute. Divide the pages by the minutes.",
              explain: "90 ÷ 6 = 15, so the printer prints 15 pages per minute.",
            },
            {
              id: "q2",
              prompt: "Cherries cost $12 for 3 pounds. What is the unit price?",
              choices: ["$36 per pound", "$9 per pound", "$0.25 per pound", "$4 per pound"],
              answer: 3,
              hint: "Divide the cost by the number of pounds.",
              explain: "$12 ÷ 3 pounds = $4 per pound. The $0.25 comes from dividing the other way: that's pounds per dollar.",
            },
            {
              id: "q3",
              prompt: "Sam runs 5 kilometers in 25 minutes. Ana runs 3 kilometers in 18 minutes. Who runs faster?",
              choices: ["Sam", "Ana", "They run at the same speed"],
              answer: 0,
              hint: "Find how many minutes each one takes for 1 kilometer. Fewer minutes per kilometer is faster.",
              explain:
                "Sam takes 25 ÷ 5 = 5 minutes per kilometer. Ana takes 18 ÷ 3 = 6 minutes per kilometer. Sam needs less time for each kilometer, so Sam is faster.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Shelf check",
          brief: "Compare two sizes of the same product, the way a shopper does.",
          steps: [
            "With a grown-up, find two sizes of the same product at home, in a store or in a flyer.",
            "Write down the price and the amount of each: ounces, grams or number of items.",
            "Divide to find each unit price, and round to the nearest cent.",
            "Many stores print the unit price on the shelf tag. If you're in a store, check your answer against it.",
            "Decide which is the better buy, and give one reason someone might still choose the other.",
          ],
        },
      ],
    },
    {
      id: "rate-problems",
      title: "Solving rate problems",
      summary: "Use a unit rate to find a total or a time, and convert units like feet and inches.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Use the rate for one",
          blocks: [
            { type: "text", text: "Once you know the unit rate, you can find any amount. A tap fills a tub at 3 liters per minute." },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 0], [1, 3], [2, 6], [3, 9], [4, 12]], xLabel: "Time (minutes)", yLabel: "Water (liters)" },
              alt: "A line graph of water filling a tub: (0, 0), (1, 3), (2, 6), (3, 9) and (4, 12). The water goes up 3 liters every minute.",
            },
            {
              type: "points",
              items: [
                "To find the amount, multiply: 3 liters per minute × 9 minutes = 27 liters.",
                "To find the time, divide: 30 liters ÷ 3 liters per minute = 10 minutes.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Converting units",
          blocks: [
            { type: "text", text: "A unit conversion is a rate too. There are 12 inches in 1 foot: 12 inches per foot." },
            {
              type: "points",
              items: [
                "5 feet = 5 × 12 = 60 inches.",
                "48 inches = 48 ÷ 12 = 4 feet.",
                "Changing to a smaller unit takes more of them, so multiply. Changing to a larger unit takes fewer, so divide.",
              ],
            },
            { type: "text", text: "Metric units work the same way: 1 meter = 100 centimeters, so 3.5 meters = 3.5 × 100 = 350 centimeters." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Gas for a trip",
          prompt: "A car goes 30 miles on 1 gallon of gas. How many gallons does it need for a 180-mile trip? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 10, step: 1, start: 0, target: 6 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Multiply or divide?",
          prompt: "Sort each question by the operation that answers it.",
          widget: {
            kind: "sorter",
            categories: ["Multiply", "Divide"],
            items: [
              { id: "ft-in", text: "Change 7 feet to inches.", answer: 0 },
              { id: "in-ft", text: "Change 36 inches to feet.", answer: 1 },
              { id: "how-far", text: "A car goes 50 miles per hour. How far does it go in 3 hours?", answer: 0 },
              { id: "how-long", text: "A car goes 50 miles per hour. How long does it take to go 200 miles?", answer: 1 },
              { id: "pens", text: "6 pens cost $9. What does 1 pen cost?", answer: 1 },
              { id: "kg", text: "Change 4 kilograms to grams.", answer: 0 },
              { id: "apples", text: "Apples cost $2 per pound. What do 5 pounds cost?", answer: 0 },
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
              prompt: "A machine fills 120 bottles in 4 minutes. At the same rate, how many bottles does it fill in 10 minutes?",
              choices: ["480", "126", "300", "40"],
              answer: 2,
              hint: "Find the unit rate first: bottles per minute.",
              explain: "120 ÷ 4 = 30 bottles per minute, and 30 × 10 = 300 bottles.",
            },
            {
              id: "q2",
              prompt: "How many inches are in 6 feet?",
              choices: ["72", "18", "2", "60"],
              answer: 0,
              hint: "There are 12 inches in each foot.",
              explain: "6 × 12 = 72 inches.",
            },
            {
              id: "q3",
              prompt: "Rosa walks at 3 miles per hour. How long does it take her to walk 4.5 miles?",
              choices: ["13.5 hours", "1 hour", "7.5 hours", "1.5 hours"],
              answer: 3,
              hint: "Divide the distance by the speed.",
              explain: "4.5 ÷ 3 = 1.5, so it takes 1.5 hours: 1 hour and 30 minutes.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Heartbeats per minute",
          brief: "Measure your own heart rate, a rate your body keeps all day.",
          steps: [
            "Find your pulse: press two fingers gently on the inside of your wrist or the side of your neck.",
            "Count the beats for 15 seconds while someone times you.",
            "Multiply by 4 to get beats per minute. Why does multiplying by 4 work?",
            "Do jumping jacks for 30 seconds, then measure again.",
            "Compare the two rates and tell someone what changed.",
          ],
        },
      ],
    },
  ],
};

/** Practice on the skill map that fits each lesson (lesson id → skill ids). */
export const practice: Record<string, string[]> = {
  "what-ratio": ["m.ratio.equiv"],
  "ratio-tables": ["m.ratio.equiv"],
  "unit-rates": ["m.ratio.unit"],
  "rate-problems": ["m.ratio.unit"],
};

export default ratios;
