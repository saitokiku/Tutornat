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
      scenes: [],
    },
    {
      id: "coordinate-plane",
      title: "Negative numbers on the coordinate plane",
      summary: "Use negative coordinates to plot points in all four quadrants.",
      minutes: 15,
      scenes: [],
    },
  ],
};

export default negative;
