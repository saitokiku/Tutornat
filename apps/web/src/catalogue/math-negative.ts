import type { CatalogueEntry } from "./types";

const negative: CatalogueEntry = {
  id: "math-negative",
  title: "Negative numbers and the number line",
  summary: "Use numbers below zero for cold temperatures, depths and debts, and place them on the number line.",
  subject: "math",
  grade: "6",
  locale: "en",
  lessons: [
    {
      id: "below-zero",
      title: "Numbers below zero",
      summary: "Negative numbers name amounts less than zero, like cold temperatures and depths below sea level.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Less than zero",
          blocks: [
            { type: "text", text: "A negative number is a number less than zero. It's written with a minus sign: −5 is read “negative five.”" },
            {
              type: "visual",
              visual: { kind: "number-line", min: -5, max: 5, marks: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5] },
              alt: "A number line from −5 to 5 with a mark at every integer. Zero is in the middle, negative numbers are to its left, and positive numbers are to its right.",
            },
            {
              type: "points",
              items: [
                "Positive numbers are greater than zero. They sit to the right of 0.",
                "Negative numbers are less than zero. They sit to the left of 0.",
                "Zero is neither positive nor negative.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Where negative numbers show up",
          blocks: [
            {
              type: "points",
              items: [
                "Temperature: −8 °C means 8 degrees below zero.",
                "Elevation: −20 m means 20 meters below sea level.",
                "Money: a balance of −$15 means you owe $15.",
              ],
            },
            {
              type: "text",
              text: "In each case, 0 is the reference point you measure from: the freezing point of water on the Celsius scale, sea level, or a balance of $0.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Opposites",
          blocks: [
            {
              type: "text",
              text: "Opposites are two numbers that are the same distance from 0, on opposite sides. 4 and −4 are opposites.",
            },
            {
              type: "visual",
              visual: { kind: "number-line", min: -5, max: 5, marks: [-4, 0, 4] },
              alt: "A number line from −5 to 5 with marks only at −4, 0 and 4. The marks at −4 and 4 are each 4 units from 0, on opposite sides.",
            },
            { type: "points", items: ["The opposite of 7 is −7, and the opposite of −7 is 7.", "The opposite of 0 is 0."] },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "A cold night",
          prompt: "It's 2 °C at sunset. Overnight, the temperature drops 5 degrees. Move the marker to the morning temperature.",
          widget: { kind: "number-line", min: -10, max: 10, step: 1, start: 0, target: -3 },
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Find the opposite",
          prompt: "Move the marker to the opposite of 6.",
          widget: { kind: "number-line", min: -10, max: 10, step: 1, start: 0, target: -6 },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Which is colder: −8 °C or −3 °C?",
              choices: ["−8 °C", "−3 °C", "They are the same"],
              answer: 0,
              hint: "Picture both on a number line. Which one is farther below zero?",
              explain:
                "−8 °C is 8 degrees below zero; −3 °C is only 3 below. So −8 °C is colder. On a number line, −8 is farther left, which makes it the lesser number.",
            },
            {
              id: "q2",
              prompt: "The lowest point in Death Valley, California, is 86 meters below sea level. Which number gives its elevation?",
              choices: ["86 m", "−86 m", "0 m"],
              answer: 1,
              hint: "Sea level is 0. Is this point above it or below it?",
              explain: "Below sea level means less than 0, so the elevation is −86 m.",
            },
            {
              id: "q3",
              prompt: "What is the opposite of −9?",
              choices: ["−9", "9", "0", "1/9"],
              answer: 1,
              hint: "Opposites are the same distance from 0, on opposite sides.",
              explain: "−9 is 9 units to the left of 0. The number 9 units to the right of 0 is 9.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Greater wins",
          brief: "Make a deck of number cards and play a quick comparing game with someone at home.",
          steps: [
            "Cut 21 small cards from paper. Write the integers −10 through 10, one on each card.",
            "Shuffle the cards and split them into two face-down piles, one for each player.",
            "Each player flips the top card. The greater number wins both cards. Remember that −2 is greater than −7.",
            "If the two cards are opposites, like 4 and −4, the first player to say “opposites” wins them.",
            "When the game ends, lay out all 21 cards in order from least to greatest.",
          ],
        },
      ],
    },
    {
      id: "compare-order",
      title: "Comparing and ordering",
      summary: "Use the number line to tell which number is greater, even when both are negative.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Farther left is less",
          blocks: [
            {
              type: "text",
              text: "Integers are the whole numbers and their opposites, such as −3, −2, −1, 0, 1, 2 and 3. On a number line, they increase from left to right.",
            },
            {
              type: "visual",
              visual: { kind: "number-line", min: -10, max: 0, marks: [-10, -8, -3, 0] },
              alt: "A number line from −10 to 0 with marks at −10, −8, −3 and 0. −8 is farther left than −3.",
            },
            { type: "text", text: "−8 is farther left than −3, so −8 < −3. That's why −8 °C is colder than −3 °C." },
            { type: "points", items: ["The symbol < means “is less than.”", "The symbol > means “is greater than.”"] },
          ],
        },
        {
          id: "s2",
          kind: "interactive",
          title: "The greatest negative integer",
          prompt: "Which negative integer is the greatest? Move the marker to it.",
          widget: { kind: "number-line", min: -10, max: 10, step: 1, start: 0, target: -1 },
        },
        {
          id: "s3",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Which list is in order from least to greatest?",
              choices: ["−1, −5, 0, 2", "−5, −1, 0, 2", "0, −1, −5, 2"],
              answer: 1,
              hint: "Start with the number that is farthest to the left on a number line.",
              explain: "−5 is farthest left, then −1, then 0, then 2.",
            },
            {
              id: "q2",
              prompt: "A submarine is at −120 m. A diver is at −15 m. Which statement is true?",
              choices: ["−120 > −15", "−120 < −15"],
              answer: 1,
              hint: "Which one is deeper, meaning farther below 0?",
              explain: "The submarine is deeper, so its elevation is lower: −120 < −15.",
            },
          ],
        },
      ],
    },
    {
      id: "absolute-value",
      title: "Absolute value",
      summary: "Measure how far a number is from zero, whichever side it is on.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Distance from zero",
          blocks: [
            { type: "text", text: "The absolute value of a number is its distance from 0 on the number line." },
            {
              type: "visual",
              visual: { kind: "number-line", min: -6, max: 6, marks: [-5, 0, 5] },
              alt: "A number line from −6 to 6 with marks at −5, 0 and 5. The marks at −5 and 5 are each 5 units from 0, on opposite sides.",
            },
            { type: "text", text: "−5 and 5 are both 5 units from 0, so both have an absolute value of 5." },
            {
              type: "points",
              items: [
                "Absolute value is written with two bars: |−5| = 5 and |5| = 5.",
                "A distance can't be negative, so an absolute value is never negative.",
                "|0| = 0, because 0 is 0 units from itself.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Size without direction",
          blocks: [
            { type: "text", text: "Absolute value tells the size of an amount without saying which side of 0 it's on." },
            {
              type: "points",
              items: [
                "A diver at −30 m is 30 m below sea level: |−30| = 30.",
                "A balance of −$25 means a debt of $25: |−25| = 25.",
                "A temperature of −12 °C is 12 degrees below zero: |−12| = 12.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Less, but farther from zero",
          blocks: [
            { type: "text", text: "A negative number can be less than another number and still have a greater absolute value." },
            {
              type: "visual",
              visual: { kind: "number-line", min: -10, max: 0, marks: [-10, -8, -3, 0] },
              alt: "A number line from −10 to 0 with marks at −10, −8, −3 and 0. −8 is 8 units from 0, and −3 is 3 units from 0.",
            },
            { type: "text", text: "−8 < −3, but |−8| > |−3|. A debt of $8 is a bigger debt than a debt of $3." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "The other one",
          prompt: "Two numbers have an absolute value of 7. One of them is 7. Move the marker to the other one.",
          widget: { kind: "number-line", min: -10, max: 10, step: 1, start: 0, target: -7 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "What is |−14|?",
              choices: ["−14", "14", "0", "1/14"],
              answer: 1,
              hint: "Absolute value is a distance. Can a distance be negative?",
              explain: "−14 is 14 units from 0, so |−14| = 14.",
            },
            {
              id: "q2",
              prompt: "Which statement is true?",
              choices: ["−9 > −2", "|−9| > |−2|", "|−9| < |−2|"],
              answer: 1,
              hint: "For the absolute values, compare distances from 0. For the plain numbers, compare positions on the line.",
              explain: "−9 is farther from 0 than −2, so |−9| = 9 is greater than |−2| = 2. But −9 itself is less than −2.",
            },
            {
              id: "q3",
              prompt: "Ana's account balance is −$40. Ben's is −$15. Who owes more money?",
              choices: ["Ana", "Ben", "They owe the same"],
              answer: 0,
              hint: "The amount someone owes is the absolute value of a negative balance.",
              explain: "Ana owes |−40| = $40 and Ben owes |−15| = $15. Ana owes more, even though −40 < −15.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Walk the distance",
          brief: "Make a number line on the floor and walk absolute values.",
          steps: [
            "With masking tape or chalk, make a number line on the floor from −10 to 10, one step apart. Mark 0 clearly.",
            "Have a partner call out a number, like −6. Stand on it.",
            "Walk back to 0, counting your steps. The number of steps is the absolute value.",
            "Try a number and its opposite, like 4 and −4. Do they take the same number of steps?",
            "Explain to your partner why an absolute value is never negative.",
          ],
        },
      ],
    },
    {
      id: "coordinate-plane",
      title: "Negative numbers on the coordinate plane",
      summary: "Use negative coordinates to plot points in all four quadrants.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Two number lines",
          blocks: [
            {
              type: "text",
              text: "The coordinate plane is made of two number lines: the horizontal x-axis and the vertical y-axis. They cross at 0, a point called the origin, (0, 0).",
            },
            {
              type: "visual",
              visual: { kind: "number-line", min: -5, max: 5, marks: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5] },
              alt: "A horizontal number line from −5 to 5 with a mark at every integer. This is what the x-axis looks like, with negative numbers to the left of the origin.",
            },
            {
              type: "text",
              text: "An ordered pair (x, y) gives a point's location. From the origin, x tells how far to move right or left, then y tells how far to move up or down.",
            },
            {
              type: "points",
              items: ["Negative x: move left. Negative y: move down.", "(−3, 2) means 3 units left of the origin, then 2 units up."],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Four quadrants",
          blocks: [
            {
              type: "text",
              text: "The axes split the plane into four quadrants, numbered I, II, III and IV. The numbering goes counterclockwise, starting at the upper right.",
            },
            {
              type: "points",
              items: [
                "Quadrant I: x positive, y positive, like (2, 5).",
                "Quadrant II: x negative, y positive, like (−2, 5).",
                "Quadrant III: x negative, y negative, like (−2, −5).",
                "Quadrant IV: x positive, y negative, like (2, −5).",
              ],
            },
            { type: "text", text: "A point on an axis, like (0, 3) or (−4, 0), isn't in any quadrant." },
            {
              type: "text",
              text: "Points that differ only in the sign of x, like (2, 5) and (−2, 5), are mirror images of each other across the y-axis.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Which quadrant?",
          prompt: "Sort each point into its quadrant.",
          widget: {
            kind: "sorter",
            categories: ["Quadrant I", "Quadrant II", "Quadrant III", "Quadrant IV"],
            items: [
              { id: "a", text: "(3, 4)", answer: 0 },
              { id: "b", text: "(−1, 6)", answer: 1 },
              { id: "c", text: "(−5, −2)", answer: 2 },
              { id: "d", text: "(7, −3)", answer: 3 },
              { id: "e", text: "(−8, 1)", answer: 1 },
              { id: "f", text: "(2, −9)", answer: 3 },
              { id: "g", text: "(−4, −4)", answer: 2 },
              { id: "h", text: "(6, 6)", answer: 0 },
            ],
          },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Reflect across the y-axis",
          prompt: "Reflect the point (5, 2) across the y-axis. The y-coordinate stays 2. Move the marker to the new x-coordinate.",
          widget: { kind: "number-line", min: -10, max: 10, step: 1, start: 0, target: -5 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "In which quadrant is (−6, −2)?",
              choices: ["I", "II", "III", "IV"],
              answer: 2,
              hint: "Negative x means left of the origin. Negative y means below it.",
              explain: "Left and down puts the point in Quadrant III, where both coordinates are negative.",
            },
            {
              id: "q2",
              prompt: "Which point is 3 units left of the origin and 5 units up?",
              choices: ["(3, 5)", "(−3, 5)", "(5, −3)", "(−5, 3)"],
              answer: 1,
              hint: "The x-coordinate comes first and tells left or right.",
              explain: "3 units left gives x = −3, and 5 units up gives y = 5, so the point is (−3, 5).",
            },
            {
              id: "q3",
              prompt: "How far apart are the points (−3, 4) and (5, 4)?",
              choices: ["2 units", "8 units", "9 units"],
              answer: 1,
              hint: "Both points have y = 4, so they sit on the same horizontal line. How far is each one from the y-axis?",
              explain: "(−3, 4) is 3 units left of the y-axis and (5, 4) is 5 units right of it, so they are 3 + 5 = 8 units apart.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Coordinate hide-and-seek",
          brief: "Play a guessing game for two on a grid with all four quadrants.",
          steps: [
            "Each player draws two grids on graph paper. On each, draw an x-axis and a y-axis from −6 to 6 that cross in the middle.",
            "Without showing your partner, mark three points on your first grid. Use at least two different quadrants.",
            "Take turns guessing a point, like (−2, 4). Your partner says “hit” if it's one of their points, or “miss.”",
            "Plot each of your guesses on your second grid, so you can keep track.",
            "The first player to find all three points wins. Then trade grids and check every point together.",
          ],
        },
      ],
    },
  ],
};

export default negative;
