import type { CatalogueEntry } from "./types";

const slope: CatalogueEntry = {
  id: "math-slope",
  title: "Slope as a rate of change",
  summary: "Read, calculate and interpret slope: the rate at which one quantity changes compared with another.",
  subject: "math",
  grade: "9",
  locale: "en",
  lessons: [
    {
      id: "rise-over-run",
      title: "Rise over run",
      summary: "Find slope as rise over run, and say what it means in units.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "A steady walk",
          blocks: [
            { type: "text", text: "Someone walks at a steady pace. The graph shows distance walked (y) against time (x)." },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 0], [1, 3], [2, 6], [3, 9]], xLabel: "Time (hours)", yLabel: "Distance (miles)" },
              alt: "A line graph with time in hours on the horizontal axis and distance in miles on the vertical axis. The points (0, 0), (1, 3), (2, 6) and (3, 9) lie on a straight line rising to the right.",
            },
            {
              type: "text",
              text: "Each hour, the distance goes up by 3 miles. When y changes by the same amount for every 1-unit step in x, the rate of change is constant and the graph is a straight line.",
            },
            {
              type: "points",
              items: ["Rate of change: how much y changes for each 1-unit change in x.", "Here, the rate of change is 3 miles per hour."],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Rise over run",
          blocks: [
            {
              type: "text",
              text: "The slope of a line is its rate of change. Choose any two points on the line: the rise is the change in y, and the run is the change in x.",
            },
            { type: "text", text: "slope = rise ÷ run = (y₂ − y₁) ÷ (x₂ − x₁)" },
            {
              type: "visual",
              visual: {
                kind: "line-graph",
                points: [[0, 1], [1, 3], [2, 5], [3, 7], [4, 9]],
                xLabel: "Time (minutes)",
                yLabel: "Water (liters)",
              },
              alt: "A line graph of water in a bucket over time. The points (0, 1), (1, 3), (2, 5), (3, 7) and (4, 9) lie on a straight line that starts at 1 liter.",
            },
            {
              type: "text",
              text: "A bucket already holds 1 liter, and a tap fills it steadily. From (1, 3) to (4, 9): rise = 9 − 3 = 6 and run = 4 − 1 = 3, so the slope is 6 ÷ 3 = 2 liters per minute.",
            },
            {
              type: "points",
              items: [
                "Any two points on a line give the same slope.",
                "The units of slope are y-units per x-unit.",
                "The starting amount (1 liter) doesn't affect the slope.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Going down",
          blocks: [
            {
              type: "visual",
              visual: {
                kind: "line-graph",
                points: [[0, 10], [1, 8], [2, 6], [3, 4], [4, 2], [5, 0]],
                xLabel: "Time (hours)",
                yLabel: "Height (cm)",
              },
              alt: "A line graph of a candle's height over time. It starts at 10 cm at 0 hours and falls in a straight line to 0 cm at 5 hours.",
            },
            {
              type: "text",
              text: "A burning candle gets shorter at a steady rate. As x increases, y decreases, so the rise is negative and the slope is negative.",
            },
            {
              type: "points",
              items: ["Positive slope: the line goes up from left to right.", "Negative slope: the line goes down from left to right."],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "The candle's slope",
          prompt:
            "The candle is 10 cm tall at 0 hours and 4 cm tall at 3 hours. What is the slope, in centimeters per hour? Move the marker to your answer.",
          widget: { kind: "number-line", min: -5, max: 5, step: 1, start: 0, target: -2 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "A line passes through (2, 5) and (6, 13). What is its slope?",
              choices: ["2", "1/2", "8", "4"],
              answer: 0,
              hint: "Find the change in y and the change in x, then divide in that order.",
              explain: "Rise = 13 − 5 = 8 and run = 6 − 2 = 4, so the slope is 8 ÷ 4 = 2.",
            },
            {
              id: "q2",
              prompt:
                "A graph shows the cost of renting a kayak: x is time in hours and y is cost in dollars. The slope is 15. What does that mean?",
              choices: [
                "The kayak costs $15 in total.",
                "The cost goes up $15 for each hour.",
                "You can rent it for 15 hours.",
                "Each dollar buys 15 hours.",
              ],
              answer: 1,
              hint: "The units of slope are y-units per x-unit. Say them in that order.",
              explain: "The slope's units are dollars per hour, so each extra hour adds $15 to the cost.",
            },
            {
              id: "q3",
              prompt: "Which situation has a negative slope when graphed with time on the x-axis?",
              choices: [
                "Savings that grow by $5 each week",
                "Water draining from a tub at 3 gallons per minute",
                "A car moving at a steady 30 miles per hour",
              ],
              answer: 1,
              hint: "A negative slope means y goes down as x goes up.",
              explain:
                "As time goes on, the water in the tub decreases, so its rate of change is −3 gallons per minute. The other two quantities increase over time.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Stacking cups",
          brief: "Measure how the height of a stack of cups changes as you add cups, then find and explain the slope.",
          steps: [
            "Gather at least 5 identical cups (paper or plastic) and a ruler.",
            "Measure the height of 1 cup, then stacks of 2, 3, 4 and 5 cups. Record a table with x = number of cups and y = height in centimeters.",
            "Plot the points on graph paper. Check whether they fall on a straight line.",
            "Pick two points and calculate the slope. Write it with units: centimeters per cup.",
            "Find the part of each cup that the slope measures. Use it to predict the height of a stack of 20 cups, and explain your method to someone at home.",
          ],
        },
      ],
    },
    {
      id: "tables-equations",
      title: "Slope in tables and equations",
      summary: "Find the rate of change from a table, and recognize it as m in y = mx + b.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Rate of change from a table",
          blocks: [
            { type: "text", text: "A plant is 4 cm tall when you start measuring, and it grows 3 cm a week." },
            { type: "text", text: "Weeks (x): 0, 1, 2, 3. Height in cm (y): 4, 7, 10, 13." },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 4], [1, 7], [2, 10], [3, 13]], xLabel: "Time (weeks)", yLabel: "Height (cm)" },
              alt: "A line graph of the plant's height. The points (0, 4), (1, 7), (2, 10) and (3, 13) lie on a straight line that starts at 4 cm.",
            },
            {
              type: "text",
              text: "Each time x goes up by 1, y goes up by 3. A constant change in y for equal steps in x means a linear relationship with slope 3.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "y = mx + b",
          blocks: [
            { type: "text", text: "A line with slope m that crosses the y-axis at b has the equation y = mx + b." },
            {
              type: "points",
              items: [
                "m is the slope: the rate of change.",
                "b is the y-intercept: the value of y when x = 0, often a starting amount.",
                "For the plant, m = 3 and b = 4, so y = 3x + 4.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "When x doesn't step by 1",
          blocks: [
            { type: "text", text: "In this table, x goes up by 2 each row." },
            { type: "text", text: "x: 0, 2, 4, 6. y: 5, 9, 13, 17." },
            {
              type: "text",
              text: "y goes up by 4 each time x goes up by 2, so the slope is 4 ÷ 2 = 2. The table starts at (0, 5), so b = 5 and y = 2x + 5.",
            },
            {
              type: "points",
              items: [
                "Always divide the change in y by the change in x.",
                "If equal steps in x don't give equal changes in y, the relationship isn't linear, and it has no single slope.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Slope from a table",
          prompt: "A table shows x = 1, 3, 5 and y = 11, 5, −1. What is the slope? Move the marker to your answer.",
          widget: { kind: "number-line", min: -5, max: 5, step: 1, start: 0, target: -3 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Which equation matches this table? x: 0, 1, 2, 3. y: 6, 4, 2, 0.",
              choices: ["y = 2x + 6", "y = 6x − 2", "y = −2x", "y = −2x + 6"],
              answer: 3,
              hint: "Find how y changes when x goes up by 1. Then find y when x = 0.",
              explain: "y drops by 2 each time x goes up by 1, so m = −2. When x = 0, y = 6, so b = 6 and y = −2x + 6.",
            },
            {
              id: "q2",
              prompt: "Renting a bike costs y = 8x + 5 dollars for x hours. What does the 5 represent?",
              choices: ["The cost per hour", "A fixed fee you pay even before any hours are added", "The number of hours", "The total cost"],
              answer: 1,
              hint: "b is the value of y when x = 0.",
              explain: "When x = 0, y = 5, so $5 is a fixed fee. The 8 is the cost per hour.",
            },
            {
              id: "q3",
              prompt: "Is this table linear? x: 0, 1, 2, 3. y: 1, 2, 4, 8.",
              choices: ["Yes, the slope is 1", "Yes, the slope is 2", "No, the rate of change isn't constant"],
              answer: 2,
              hint: "Find the change in y for each step of 1 in x. Are the changes all the same?",
              explain: "y changes by 1, then 2, then 4. The rate of change keeps growing, so the points don't lie on a line and there's no single slope.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Charging table",
          brief: "Record a phone or tablet charging, and test whether the data is linear.",
          steps: [
            "Plug in a phone or tablet when its battery is below about 30%. Write down the battery percentage.",
            "Record the percentage every 10 minutes for an hour. Make a table with x = minutes and y = percent.",
            "Find the change in y for each 10-minute step. Is the rate of change constant?",
            "Use the first and last rows to find the average rate of change, in percent per minute.",
            "Write y = mx + b for your data and predict when the battery reaches 100%. Many devices charge more slowly near full, so check your prediction and explain any difference.",
          ],
        },
      ],
    },
    {
      id: "kinds-of-slope",
      title: "Positive, negative, zero and undefined",
      summary: "What each kind of slope looks like on a graph and what it means in a situation.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Positive and negative",
          blocks: [
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 2], [1, 4], [2, 6], [3, 8]], xLabel: "Time (weeks)", yLabel: "Savings ($)" },
              alt: "A line graph of savings over time. The points (0, 2), (1, 4), (2, 6) and (3, 8) lie on a straight line rising from left to right.",
            },
            { type: "text", text: "Positive slope: y increases as x increases, and the line rises from left to right. These savings grow $2 a week." },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 8], [1, 6], [2, 4], [3, 2], [4, 0]], xLabel: "Time (minutes)", yLabel: "Water in tank (gallons)" },
              alt: "A line graph of water in a tank over time. It starts at 8 gallons and falls in a straight line to 0 gallons at 4 minutes.",
            },
            { type: "text", text: "Negative slope: y decreases as x increases, and the line falls from left to right. This tank drains 2 gallons a minute." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Zero slope",
          blocks: [
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5]], xLabel: "Time (hours)", yLabel: "Distance from home (miles)" },
              alt: "A line graph of a parked car's distance from home. The line is horizontal at 5 miles from 0 to 4 hours.",
            },
            { type: "text", text: "A parked car stays 5 miles from home. Time passes, but y doesn't change." },
            {
              type: "text",
              text: "The rise between any two points is 0, so the slope is 0 ÷ run = 0. A horizontal line has zero slope, and this one's equation is y = 5.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Undefined slope",
          blocks: [
            {
              type: "text",
              text: "Every point on a vertical line, such as x = 3, has the same x-coordinate. So the run between any two points is 0.",
            },
            { type: "text", text: "Division by 0 is undefined, so the slope of a vertical line is undefined." },
            {
              type: "text",
              text: "With time on the x-axis, a vertical line would mean being at many different values at the same instant. That's why vertical lines almost never describe a situation over time.",
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Name the slope",
          prompt: "Sort each line or situation by the kind of slope it has.",
          widget: {
            kind: "sorter",
            categories: ["Positive", "Negative", "Zero", "Undefined"],
            items: [
              { id: "plant", text: "Height of a plant that grows 2 cm each week, graphed against time", answer: 0 },
              { id: "bucket", text: "Water left in a leaking bucket, graphed against time", answer: 1 },
              { id: "flat", text: "Monthly cost of a $10 flat-rate streaming plan, graphed against hours watched", answer: 2 },
              { id: "vertical", text: "The line x = −4", answer: 3 },
              { id: "same-y", text: "The line through (1, 3) and (5, 3)", answer: 2 },
              { id: "same-x", text: "The line through (2, 1) and (2, 9)", answer: 3 },
              { id: "hike", text: "Distance hiked at a steady pace, graphed against time", answer: 0 },
              { id: "down", text: "The line through (0, 6) and (3, 0)", answer: 1 },
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
              prompt: "What is the slope of the line through (−2, 4) and (3, 4)?",
              choices: ["Undefined", "1", "0", "−2"],
              answer: 2,
              hint: "Find the rise first.",
              explain: "Rise = 4 − 4 = 0 and run = 3 − (−2) = 5, so the slope is 0 ÷ 5 = 0. The line is horizontal.",
            },
            {
              id: "q2",
              prompt: "Why is the slope of the line x = 7 undefined?",
              choices: ["Its rise is 0, so the slope is 0.", "Its run is 0, and you can't divide by 0.", "It has no points."],
              answer: 1,
              hint: "Every point on x = 7 has the same x-coordinate. What does that make the run?",
              explain: "Every point has x = 7, so the run between any two points is 0. Rise ÷ 0 is undefined.",
            },
            {
              id: "q3",
              prompt:
                "A graph shows a phone's battery level (y, in percent) against time (x, in hours). For two hours, the line is horizontal. What does that mean?",
              choices: ["The battery level stayed the same.", "The battery was charging quickly.", "The battery died."],
              answer: 0,
              hint: "A horizontal line has zero slope. What does a rate of change of 0 mean here?",
              explain: "Zero slope means y didn't change. The battery level stayed constant for those two hours, perhaps because the phone was switched off.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Slopes around the house",
          brief: "Measure real slopes with a ruler or tape measure.",
          steps: [
            "Find a staircase. Measure the rise (height) and the run (depth) of one step.",
            "Calculate the slope of the stairs as rise ÷ run.",
            "Find something with zero slope, like a tabletop, and something vertical, like the edge of a door. Explain why their slopes are 0 and undefined.",
            "If you can, find a ramp, a slide or a sloped driveway. Measure a rise and run, and compare its slope with the stairs.",
            "Order everything you measured from least steep to most steep, and explain your order to someone.",
          ],
        },
      ],
    },
    {
      id: "comparing-rates",
      title: "Comparing rates",
      summary: "Compare two situations by their slopes, whether they are given as graphs, tables or equations.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Same question, three forms",
          blocks: [
            { type: "text", text: "To compare two rates, find each slope in the same units. Then compare the numbers." },
            {
              type: "points",
              items: [
                "Graph: pick two points on the line and compute rise ÷ run.",
                "Table: divide the change in y by the change in x.",
                "Equation in the form y = mx + b: read m.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Two pumps",
          blocks: [
            { type: "text", text: "Pump A's graph shows how much water it has moved over time." },
            {
              type: "visual",
              visual: { kind: "line-graph", points: [[0, 0], [1, 4], [2, 8], [3, 12]], xLabel: "Time (minutes)", yLabel: "Water pumped (gallons)" },
              alt: "A line graph for Pump A. The points (0, 0), (1, 4), (2, 8) and (3, 12) lie on a straight line rising to the right.",
            },
            { type: "text", text: "Pump B's equation: y = 5x, with x in minutes and y in gallons." },
            {
              type: "text",
              text: "Pump A's slope is 12 ÷ 3 = 4 gallons per minute. Pump B's is 5 gallons per minute, so Pump B is faster.",
            },
            {
              type: "text",
              text: "Compare the numbers, not how steep two graphs look. A graph drawn at a different scale can make a slow rate look steep.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "A head start isn't a faster rate",
          blocks: [
            { type: "text", text: "Jada has $50 and saves $5 a week: y = 5x + 50." },
            { type: "text", text: "Marco's table: after 0, 1 and 2 weeks, he has $10, $25 and $40. His rate is $15 a week: y = 15x + 10." },
            {
              type: "text",
              text: "Jada starts ahead, but Marco's rate is 3 times hers. After 4 weeks they each have $70, and after that Marco stays ahead.",
            },
            { type: "points", items: ["The y-intercept b is where a line starts.", "The slope m is how fast it changes."] },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "When do they cost the same?",
          prompt:
            "Gym A charges a $20 sign-up fee plus $3 a visit: y = 3x + 20. Gym B's table: 0 visits cost $10, 2 visits $20, 4 visits $30. After how many visits do they cost the same? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 10, step: 1, start: 0, target: 5 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Car A's distance is y = 55x (miles after x hours). Car B travels 180 miles in 3 hours at a steady speed. Which is faster?",
              choices: ["Car A", "Car B", "They're the same"],
              answer: 1,
              hint: "Write both rates in miles per hour.",
              explain: "Car A goes 55 miles per hour. Car B goes 180 ÷ 3 = 60 miles per hour, so Car B is faster.",
            },
            {
              id: "q2",
              prompt: "Line P passes through (0, 1) and (2, 7). Line Q passes through (0, 5) and (4, 9). Which line is steeper?",
              choices: ["Line P", "Line Q", "They're equally steep"],
              answer: 0,
              hint: "Compute rise ÷ run for each line.",
              explain: "P's slope is (7 − 1) ÷ 2 = 3, and Q's is (9 − 5) ÷ 4 = 1. P is steeper, even though Q starts higher.",
            },
            {
              id: "q3",
              prompt: "Jada has y = 5x + 50 dollars and Marco has y = 15x + 10 dollars after x weeks. Who has more after 10 weeks?",
              choices: ["Jada", "Marco", "They have the same"],
              answer: 1,
              hint: "Substitute x = 10 into each equation.",
              explain: "Jada has 5(10) + 50 = $100 and Marco has 15(10) + 10 = $160. Marco's greater rate overtook Jada's head start after week 4.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Unit price check",
          brief: "Compare the price rates of two package sizes, like a grocery shopper would.",
          steps: [
            "Find two packages of the same kind of food in different sizes, or use a store receipt or flyer.",
            "For each, write down the price and the amount, in ounces, grams or number of items.",
            "Compute each unit price: price ÷ amount. It's the slope of a cost line that starts at (0, 0).",
            "Sketch both lines on one graph, with amount on the x-axis and cost on the y-axis. Which line is steeper?",
            "Decide which package is the better deal, and explain why the steeper line means a higher price per unit.",
          ],
        },
      ],
    },
  ],
};

export default slope;
