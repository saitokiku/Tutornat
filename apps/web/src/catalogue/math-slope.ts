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
      scenes: [],
    },
    {
      id: "kinds-of-slope",
      title: "Positive, negative, zero and undefined",
      summary: "What each kind of slope looks like on a graph and what it means in a situation.",
      minutes: 12,
      scenes: [],
    },
    {
      id: "comparing-rates",
      title: "Comparing rates",
      summary: "Compare two situations by their slopes, whether they are given as graphs, tables or equations.",
      minutes: 15,
      scenes: [],
    },
  ],
};

export default slope;
