import type { CatalogueEntry } from "./types";

const pythagorean: CatalogueEntry = {
  id: "math-pythagorean",
  title: "The Pythagorean theorem",
  summary:
    "Find square roots, use the Pythagorean theorem to find missing sides of right triangles, test for a right angle, and find distances on a grid.",
  subject: "math",
  grade: "8",
  locale: "en",
  lessons: [
    {
      id: "square-roots",
      title: "Squares and square roots",
      summary: "Square a number, undo it with a square root, and estimate square roots that aren't whole numbers.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Squaring a number",
          blocks: [
            { type: "text", text: "To square a number, multiply it by itself: 5² = 5 × 5 = 25." },
            { type: "visual", visual: { kind: "array", rows: 5, cols: 5 }, alt: "25 counters arranged in a square: 5 rows of 5." },
            { type: "text", text: "The name comes from shapes. A square with sides of 5 cm has an area of 5 × 5 = 25 cm²." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Square roots",
          blocks: [
            { type: "text", text: "A square root undoes squaring. √25 = 5, because 5² = 25." },
            {
              type: "points",
              items: [
                "√ is read “the square root of.”",
                "Perfect squares are the squares of whole numbers: 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144 and so on.",
                "A square with an area of 49 cm² has sides of √49 = 7 cm.",
                "Every positive number has two square roots, like 5 and −5, because (−5)² = 25 too. The √ symbol means the positive one.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Between two whole numbers",
          blocks: [
            { type: "text", text: "√50 isn't a whole number. 50 is between the perfect squares 49 and 64, so √50 is between 7 and 8." },
            {
              type: "visual",
              visual: { kind: "number-line", min: 7, max: 8, marks: [7, 7.5, 8], marker: 7.07 },
              alt: "A number line from 7 to 8 with a mark at 7.5. A dot sits just to the right of 7, at about 7.07.",
            },
            { type: "text", text: "50 is much closer to 49 than to 64, so √50 is just above 7. A calculator gives about 7.07." },
            {
              type: "points",
              items: [
                "√50 is irrational: its decimal never ends and never repeats.",
                "The square root of a whole number that isn't a perfect square is always irrational.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "A square garden",
          prompt: "A square garden has an area of 144 m². How long is each side, in meters? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 12 },
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Estimate √30",
          prompt: "Estimate √30 to the nearest tenth. Square 5.4 and 5.5 to help you decide. Move the marker to your estimate.",
          widget: { kind: "number-line", min: 5, max: 6, step: 0.1, start: 5, target: 5.5 },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "What is √64?",
              choices: ["32", "8", "16", "4,096"],
              answer: 1,
              hint: "Which number times itself is 64?",
              explain: "8 × 8 = 64, so √64 = 8. 32 is 64 ÷ 2, which is a different operation.",
            },
            {
              id: "q2",
              prompt: "Between which two whole numbers is √70?",
              choices: ["6 and 7", "7 and 8", "8 and 9", "35 and 36"],
              answer: 2,
              hint: "Find the perfect squares just below and just above 70.",
              explain: "64 < 70 < 81. √64 = 8 and √81 = 9, so √70 is between 8 and 9. It's about 8.37.",
            },
            {
              id: "q3",
              prompt: "A square tile has an area of 36 cm². What is its perimeter?",
              choices: ["6 cm", "9 cm", "24 cm", "144 cm"],
              answer: 2,
              hint: "Find the side length first, with a square root.",
              explain: "√36 = 6, so each side is 6 cm and the perimeter is 4 × 6 = 24 cm.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Build the squares",
          brief: "Build perfect squares from small square objects.",
          steps: [
            "Gather small square things: sticky notes, crackers, tiles or paper squares.",
            "Build squares 1 by 1, 2 by 2, 3 by 3 and 4 by 4. Count the pieces in each.",
            "List the counts. These are the first perfect squares.",
            "Try to build a square from exactly 20 pieces. What happens?",
            "Use what you found to explain to someone why √20 is between 4 and 5.",
          ],
        },
      ],
    },
    {
      id: "theorem",
      title: "The theorem: a² + b² = c²",
      summary: "In every right triangle, the legs and the hypotenuse are linked by a² + b² = c². See why it's true, then use it.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Parts of a right triangle",
          blocks: [
            { type: "text", text: "A right triangle has one right angle, a square corner." },
            {
              type: "visual",
              visual: { kind: "right-triangle", a: 3, b: 4, c: 5, unit: "cm" },
              alt: "A right triangle with the right angle at the bottom left. The vertical leg is 3 cm, the bottom leg is 4 cm, and the slanted side across from the right angle, the hypotenuse, is 5 cm.",
            },
            {
              type: "points",
              items: [
                "The two sides that make the right angle are the legs.",
                "The side across from the right angle is the hypotenuse. It's always the longest side.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "The theorem",
          blocks: [
            { type: "text", text: "In every right triangle, the square of the hypotenuse equals the sum of the squares of the legs." },
            { type: "text", text: "a² + b² = c², where a and b are the legs and c is the hypotenuse." },
            {
              type: "points",
              items: [
                "For the 3-4-5 triangle: 3² + 4² = 9 + 16 = 25, and 5² = 25.",
                "It works only for right triangles.",
                "It's named after Pythagoras, a Greek thinker who lived about 2,500 years ago. Mathematicians in Babylon used the idea more than 1,000 years before him.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Why it's true",
          blocks: [
            {
              type: "text",
              text: "Here is one way to see it. Draw a big square with sides a + b, and place four copies of the right triangle inside it.",
            },
            {
              type: "points",
              items: [
                "Arrangement 1: put a triangle in each corner. The space left in the middle is a tilted square with sides c. Its area is c².",
                "Arrangement 2: push the same four triangles together in pairs, making two rectangles in opposite corners. The space left is two squares, one with area a² and one with area b².",
                "The big square and the four triangles are the same both times, so the space left over must be the same: c² = a² + b².",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Find the hypotenuse",
          prompt: "A right triangle has legs of 6 cm and 8 cm. How long is the hypotenuse, in centimeters? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 10 },
        },
        {
          id: "s5",
          kind: "interactive",
          title: "One more",
          prompt: "A right triangle has legs of 5 m and 12 m. How long is the hypotenuse, in meters? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 13 },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "A right triangle has legs of 9 and 12. How long is the hypotenuse?",
              choices: ["21", "15", "225", "10.5"],
              answer: 1,
              hint: "Square each leg, add, then take the square root.",
              explain: "9² + 12² = 81 + 144 = 225, and √225 = 15.",
            },
            {
              id: "q2",
              prompt: "In a right triangle, which side is always the longest?",
              choices: ["Either leg", "The shorter leg", "The hypotenuse", "It depends on the triangle"],
              answer: 2,
              hint: "Which side is across from the largest angle?",
              explain: "The right angle is the largest angle in a right triangle, and the longest side is across from it. That side is the hypotenuse.",
            },
            {
              id: "q3",
              prompt: "Tom says a right triangle with legs of 3 and 4 has a hypotenuse of 7, because 3 + 4 = 7. What's wrong?",
              choices: ["Nothing. He's right.", "You add the squares, not the sides: 9 + 16 = 25, so it's 5.", "You multiply the legs: 3 × 4 = 12."],
              answer: 1,
              hint: "The theorem uses a², b² and c².",
              explain: "a² + b² = c² gives 9 + 16 = 25, so c = √25 = 5. The two legs together are always longer than the hypotenuse, so adding them gives too much.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Cut-out proof",
          brief: "Build the proof from this lesson with paper triangles.",
          steps: [
            "On card or stiff paper, draw a right triangle with legs of 6 cm and 8 cm. Cut it out and trace it to make four copies.",
            "Draw two squares with sides of 6 + 8 = 14 cm.",
            "In the first square, put a triangle in each corner so the hypotenuses make a tilted square in the middle.",
            "In the second square, push the triangles together in pairs to make two rectangles in opposite corners. Two empty squares are left.",
            "Find the empty area in each square. Explain to someone why the two must be equal, and what that proves.",
          ],
        },
      ],
    },
    {
      id: "converse",
      title: "Is it a right triangle?",
      summary: "Use the theorem backward to test whether three side lengths make a right angle, the way builders check corners.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Test with the theorem",
          blocks: [
            {
              type: "text",
              text: "The theorem also works backward. If the two shorter sides a and b and the longest side c fit a² + b² = c², the triangle has a right angle.",
            },
            {
              type: "visual",
              visual: { kind: "right-triangle", a: 8, b: 15, c: 17, unit: "m" },
              alt: "A right triangle with legs of 8 m and 15 m and a hypotenuse of 17 m.",
            },
            {
              type: "points",
              items: [
                "Sides 8, 15 and 17: 64 + 225 = 289, and 17² = 289. It's a right triangle.",
                "Sides 5, 6 and 8: 25 + 36 = 61, but 8² = 64. It's not a right triangle. Because 61 is less than 64, the angle across from the 8 is wider than a right angle.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Builders use it",
          blocks: [
            {
              type: "text",
              text: "Builders check corners with the numbers 3, 4 and 5. They mark 3 units along one wall and 4 units along the other. If the marks are 5 units apart, the corner is square.",
            },
            {
              type: "points",
              items: [
                "Multiples work too: 6-8-10, 9-12-15, or 30, 40 and 50 cm.",
                "Sets of whole numbers like 3-4-5 and 5-12-13 that fit a² + b² = c² are called Pythagorean triples.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Right triangle or not?",
          prompt: "Each set gives three side lengths. Square them, then sort.",
          widget: {
            kind: "sorter",
            categories: ["Right triangle", "Not a right triangle"],
            items: [
              { id: "345", text: "3, 4, 5", answer: 0 },
              { id: "456", text: "4, 5, 6", answer: 1 },
              { id: "51213", text: "5, 12, 13", answer: 0 },
              { id: "789", text: "7, 8, 9", answer: 1 },
              { id: "6810", text: "6, 8, 10", answer: 0 },
              { id: "234", text: "2, 3, 4", answer: 1 },
              { id: "94041", text: "9, 40, 41", answer: 0 },
              { id: "102426", text: "10, 24, 26", answer: 0 },
            ],
          },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Check the corner",
          prompt:
            "A builder marks 9 feet along one wall and 12 feet along the other. If the corner is square, how far apart should the marks be, in feet? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 15 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Do sides of 7, 24 and 25 make a right triangle?",
              choices: ["Yes", "No"],
              answer: 0,
              hint: "Check whether 7² + 24² equals 25².",
              explain: "7² + 24² = 49 + 576 = 625, and 25² = 625. They match, so it's a right triangle.",
            },
            {
              id: "q2",
              prompt: "Do sides of 6, 7 and 9 make a right triangle?",
              choices: ["Yes", "No"],
              answer: 1,
              hint: "Square the two shorter sides and add. Compare with the longest side squared.",
              explain: "6² + 7² = 36 + 49 = 85, but 9² = 81. They don't match, so there's no right angle.",
            },
            {
              id: "q3",
              prompt: "When you test three side lengths, which one should be c?",
              choices: ["The shortest side", "Any side", "The longest side"],
              answer: 2,
              hint: "In a right triangle, which side is c?",
              explain: "c is the hypotenuse, which is always the longest side. Testing with a shorter side as c gives the wrong answer.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Square corners at home",
          brief: "Check real corners with a tape measure and a 30-40-50 triangle.",
          steps: [
            "Pick a corner where two straight edges meet: a table, a bookshelf, a door frame or a rug.",
            "Measure 30 cm along one edge and 40 cm along the other. Mark both points with a small piece of tape.",
            "Measure straight between the marks. If it's 50 cm, the corner is square.",
            "Check two or three corners. Is any of them a little off?",
            "Explain to someone why 30-40-50 works: 30² + 40² = 900 + 1,600 = 2,500 = 50².",
          ],
        },
      ],
    },
    {
      id: "distances",
      title: "Missing legs and distances",
      summary: "Subtract to find a missing leg, and use a right triangle to find the distance between two points on a grid.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Finding a leg",
          blocks: [
            { type: "text", text: "If you know the hypotenuse and one leg, subtract: missing leg² = hypotenuse² − known leg²." },
            {
              type: "visual",
              visual: { kind: "right-triangle", a: null, b: 6, c: 10, unit: "ft" },
              alt: "A ladder leaning against a wall makes a right triangle. The ladder, the hypotenuse, is 10 ft. Its foot is 6 ft from the wall along the bottom leg. The height up the wall, the vertical leg, is unknown.",
            },
            { type: "text", text: "A 10-foot ladder leans against a wall, with its foot 6 feet from the wall. How high up the wall does it reach?" },
            { type: "points", items: ["The ladder is the hypotenuse.", "height² = 10² − 6² = 100 − 36 = 64", "height = √64 = 8 feet"] },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Distance on a grid",
          blocks: [
            { type: "text", text: "To find the distance between two points on a grid, draw a right triangle with the distance as its hypotenuse." },
            { type: "visual", visual: { kind: "coord", points: [[1, 1], [4, 5]] }, alt: "A coordinate grid with points at (1, 1) and (4, 5)." },
            {
              type: "points",
              items: ["Across: 4 − 1 = 3 units.", "Up: 5 − 1 = 4 units.", "Distance = √(3² + 4²) = √25 = 5 units."],
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "The ladder",
          prompt: "A 13-foot ladder leans against a wall. Its foot is 5 feet from the wall. How high up the wall does it reach, in feet? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 12 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Distance between points",
          prompt: "How far apart are the points (−2, 1) and (4, 9)? Move the marker to your answer.",
          widget: { kind: "number-line", min: 0, max: 20, step: 1, start: 0, target: 10 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "A right triangle has a hypotenuse of 25 cm and one leg of 7 cm. How long is the other leg?",
              choices: ["18 cm", "26 cm", "24 cm", "32 cm"],
              answer: 2,
              hint: "The missing side is a leg, so subtract: 25² − 7².",
              explain: "25² − 7² = 625 − 49 = 576, and √576 = 24 cm.",
            },
            {
              id: "q2",
              prompt: "A rectangular field is 60 m long and 80 m wide. How long is the straight path from one corner to the opposite corner?",
              choices: ["100 m", "140 m", "70 m", "4,800 m"],
              answer: 0,
              hint: "The diagonal splits the field into two right triangles. The diagonal is the hypotenuse.",
              explain: "60² + 80² = 3,600 + 6,400 = 10,000, and √10,000 = 100 m. That's 40 m shorter than walking along two sides.",
            },
            {
              id: "q3",
              prompt: "What is the distance between (0, 0) and (5, 12)?",
              choices: ["17", "7", "169", "13"],
              answer: 3,
              hint: "Go across 5 and up 12. Use those as the legs.",
              explain: "5² + 12² = 25 + 144 = 169, and √169 = 13.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "The shortcut",
          brief: "Predict a diagonal with the theorem, then measure it.",
          steps: [
            "Find a rectangle at home: a table, a rug, a door or a sheet of paper.",
            "Measure its length and width.",
            "Use the theorem to predict the diagonal from corner to corner. Round to the nearest whole unit.",
            "Measure the diagonal and compare it with your prediction.",
            "Work out how much shorter the diagonal is than going along two sides, and explain why cutting across a field saves distance.",
          ],
        },
      ],
    },
  ],
};

/** Practice on the skill map that fits each lesson (lesson id → skill ids). */
export const practice: Record<string, string[]> = {
  "square-roots": ["m.sqrt"],
  theorem: ["m.pythag"],
  converse: ["m.pythag"],
  distances: ["m.pythag"],
};

export default pythagorean;
