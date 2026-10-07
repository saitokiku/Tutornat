import type { CatalogueEntry } from "./types";

const moon: CatalogueEntry = {
  id: "science-moon",
  title: "Why the Moon changes shape",
  summary: "The Moon doesn't make its own light. Find out why the part we see changes over about a month.",
  subject: "science",
  grade: "5",
  locale: "en",
  lessons: [
    {
      id: "half-lit",
      title: "Half lit, all the time",
      summary: "The Sun always lights half the Moon. As the Moon travels around Earth, we see different amounts of that lit half.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Moonlight is sunlight",
          blocks: [
            { type: "visual", visual: { kind: "moon", phase: 0.5 }, alt: "A full moon: the whole round face is lit." },
            { type: "text", text: "The Moon doesn't make its own light. It shines because sunlight bounces off its rocky surface." },
            {
              type: "points",
              items: ["The Sun makes its own light.", "The Moon only reflects sunlight. Without the Sun, we couldn't see the Moon at all."],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Half is always lit",
          blocks: [
            {
              type: "text",
              text: "The Sun lights the half of the Moon that faces it, the same way it lights the day side of Earth.",
            },
            { type: "text", text: "As the Moon travels around Earth, we see different amounts of that lit half." },
            {
              type: "visual",
              visual: { kind: "moon", phase: 0.25 },
              alt: "A first quarter moon: the right half of the face is lit and the left half is dark.",
            },
            {
              type: "text",
              text: "When we see the right half lit, the Moon is one quarter of the way through its cycle. That's why this phase is called the first quarter moon.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Growing and shrinking",
          blocks: [
            {
              type: "visual",
              visual: { kind: "moon", phase: 0.125 },
              alt: "A waxing crescent moon: a thin curved sliver of light on the right edge.",
            },
            {
              type: "points",
              items: [
                "Waxing: the lit part grows each night, from new moon to full moon.",
                "Waning: the lit part shrinks each night, from full moon back to new moon.",
                "Crescent: less than half the face is lit. Gibbous: more than half is lit.",
              ],
            },
            {
              type: "visual",
              visual: { kind: "moon", phase: 0.375 },
              alt: "A waxing gibbous moon: more than half the face is lit, with a thin dark curve on the left.",
            },
            { type: "text", text: "The whole cycle, from one new moon to the next, takes about 29.5 days." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Find the first quarter moon",
          prompt: "Move through the days of the cycle. Stop on a day when the Moon is at first quarter, with the right half lit.",
          widget: { kind: "moon-phases", target: 7 },
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Find the full moon",
          prompt: "Keep going. Stop on a day when the whole face of the Moon is lit.",
          widget: { kind: "moon-phases", target: 15 },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Why does the Moon look like a thin crescent on some nights?",
              choices: [
                "Earth's shadow covers most of it.",
                "We are seeing only a small part of its sunlit half.",
                "Clouds block part of it.",
                "The Moon makes less light that night.",
              ],
              answer: 1,
              hint: "The Sun lights half the Moon every single night. So what could be changing?",
              explain:
                "The Moon is always half lit. As it moves around Earth, we see more or less of that lit half. Earth's shadow only falls on the Moon during a lunar eclipse, which is rare.",
            },
            {
              id: "q2",
              prompt: "About how long does it take the Moon to go through all its phases, from one new moon to the next?",
              choices: ["1 day", "1 week", "About 29.5 days", "1 year"],
              answer: 2,
              hint: "The word “month” comes from the word “moon.”",
              explain: "A full cycle of phases takes about 29.5 days, a little less than most calendar months.",
            },
            {
              id: "q3",
              prompt: "At new moon, the Moon is between Earth and the Sun. Why can't we see it?",
              choices: ["Its lit half faces away from Earth.", "It moves behind Earth.", "The Sun stops lighting it."],
              answer: 0,
              hint: "The Sun lights the side of the Moon that faces the Sun. Which way does that side point at new moon?",
              explain:
                "At new moon, the sunlit half faces the Sun, away from us. The half that faces Earth is dark, so we can't see the Moon.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Make the phases with a lamp",
          brief: "Use a lamp, a ball and your own head to model the Sun, the Moon and Earth.",
          steps: [
            "Ask a grown-up to set a lamp without its shade at one side of a dark room. The lamp is the Sun. Don't touch the bulb; it can get hot.",
            "Push a pencil into a ball or an orange to make a handle. That's the Moon. Your head is Earth.",
            "Face the lamp and hold the Moon at arm's length, a little above your head. The side facing you is dark: that's new moon.",
            "Turn slowly to your left, keeping the Moon in front of your face. Watch the lit part grow until it is full, then shrink. If your head's shadow covers the Moon, you've made an eclipse, so raise it a little.",
            "Draw what you saw after each quarter turn and label it: new moon, first quarter, full moon, last quarter.",
          ],
        },
      ],
    },
    {
      id: "eight-phases",
      title: "The eight phases in order",
      summary: "Name each phase, and tell whether the Moon is waxing or waning.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Eight phases",
          blocks: [
            {
              type: "points",
              items: [
                "Waxing: new moon, waxing crescent, first quarter, waxing gibbous, full moon.",
                "Waning: full moon, waning gibbous, last quarter, waning crescent, then new moon again.",
              ],
            },
            {
              type: "text",
              text: "Seen from the Northern Hemisphere, a waxing moon is lit on the right and a waning moon is lit on the left.",
            },
            {
              type: "visual",
              visual: { kind: "moon", phase: 0.75 },
              alt: "A last quarter moon: the left half of the face is lit and the right half is dark.",
            },
            { type: "text", text: "At last quarter, only the left half is lit. The Moon is three quarters of the way through its cycle." },
          ],
        },
        {
          id: "s2",
          kind: "interactive",
          title: "Find the last quarter moon",
          prompt: "Find a day when the Moon is at last quarter, with only the left half lit.",
          widget: { kind: "moon-phases", target: 22 },
        },
        {
          id: "s3",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Which phase comes right after the full moon?",
              choices: ["Waxing gibbous", "Waning gibbous", "New moon"],
              answer: 1,
              hint: "After full moon, is the lit part growing or shrinking? Which word means shrinking?",
              explain:
                "After full moon, the lit part starts to shrink, so the Moon is waning. More than half is still lit, so it's a waning gibbous.",
            },
            {
              id: "q2",
              prompt: "Just before sunrise, you see a thin crescent moon lit on the left side. Is it waxing or waning?",
              choices: ["Waxing", "Waning"],
              answer: 1,
              hint: "In the Northern Hemisphere, which side is lit when the Moon is growing?",
              explain:
                "A waxing moon is lit on the right. Lit on the left means waning: this crescent is shrinking toward new moon.",
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Put the waxing phases in order",
          prompt: "Start at new moon. Put the phases in the order you would see them as the lit part grows.",
          widget: {
            kind: "sequence",
            items: [
              { id: "new", text: "New moon" },
              { id: "waxing-crescent", text: "Waxing crescent" },
              { id: "first-quarter", text: "First quarter" },
              { id: "waxing-gibbous", text: "Waxing gibbous" },
              { id: "full", text: "Full moon" },
            ],
          },
        },
      ],
    },
    {
      id: "moon-in-daytime",
      title: "The Moon in the daytime",
      summary: "Why the Moon rises at a different time each day, and why you can often see it in a daytime sky.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "A little later each day",
          blocks: [
            {
              type: "text",
              text: "Earth spins once a day. As it turns, the Sun and the Moon seem to rise in the east and set in the west.",
            },
            {
              type: "text",
              text: "While Earth spins, the Moon also moves along its path around Earth, in the same direction Earth spins.",
            },
            {
              type: "text",
              text: "So after each spin, Earth has to turn a little extra to catch up with the Moon. On average, the Moon rises about 50 minutes later each day.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "When each phase is up",
          blocks: [
            {
              type: "visual",
              visual: { kind: "moon", phase: 0.25 },
              alt: "A first quarter moon: the right half of the face is lit and the left half is dark.",
            },
            {
              type: "points",
              items: [
                "First quarter: rises around noon and sets around midnight. Look for it in the afternoon and evening.",
                "Full moon: rises around sunset and sets around sunrise. It's up all night.",
                "Last quarter: rises around midnight and sets around noon. Look for it in the morning.",
                "New moon: rises and sets with the Sun. Its lit half faces away from us, so we can't see it.",
              ],
            },
            { type: "text", text: "These times are approximate. They shift with the seasons and with where you live." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "The Moon in a blue sky",
          blocks: [
            {
              type: "text",
              text: "The Moon is bright enough to shine through the blue daytime sky. Stars are much fainter, so the bright sky hides them.",
            },
            {
              type: "points",
              items: [
                "Near new moon, the Moon is too close to the Sun in the sky to see.",
                "Near full moon, it's up mostly at night.",
                "On many of the days in between, you can spot it in daylight.",
              ],
            },
            { type: "text", text: "Never look straight at the Sun while you search." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Find an afternoon moon",
          prompt:
            "A few days after first quarter, the Moon rises in the middle of the afternoon, so you can see it before sunset. Find a day like that.",
          widget: { kind: "moon-phases", target: 10 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "On average, about how much later does the Moon rise each day?",
              choices: ["About 5 minutes", "About 50 minutes", "About 5 hours", "It rises at the same time every day"],
              answer: 1,
              hint: "Over the 29.5-day cycle of phases, the daily delays add up to about one whole day.",
              explain:
                "The Moon rises about 50 minutes later each day, on average, because it moves along its path while Earth spins.",
            },
            {
              id: "q2",
              prompt: "Why does the Moon rise later each day?",
              choices: [
                "Earth spins more slowly each day.",
                "The Moon gets farther from Earth each day.",
                "The Moon moves along its path, so Earth has to turn a little extra to face it again.",
              ],
              answer: 2,
              hint: "Two things are moving: Earth is spinning, and the Moon is traveling around Earth.",
              explain:
                "Earth's spin stays the same. The Moon moves ahead on its path each day, so Earth needs about 50 extra minutes to bring it back into view.",
            },
            {
              id: "q3",
              prompt: "At 4 p.m., you see a half-lit moon in the sky. Which phase is it most likely to be?",
              choices: ["First quarter", "Last quarter"],
              answer: 0,
              hint: "Think about when each half-lit moon rises and when it sets.",
              explain:
                "A first quarter moon rises around noon, so it's in the sky at 4 p.m. A last quarter moon sets around noon, so it's already gone.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Keep a moon log",
          brief: "Look for the Moon at the same time each evening for five days, and record what changes.",
          steps: [
            "Find the date of the next first quarter moon on a calendar or in a weather app.",
            "Starting that day, go outside at the same time each evening, such as 7 p.m., and stand in the same spot.",
            "Sketch the Moon's shape. Draw what it's near, like a tree, a roof or a pole.",
            "Each night, compare with the night before. Is the Moon in the same place? Is more or less of it lit?",
            "After five nights, explain to someone why the Moon was in a different place and why its shape changed.",
          ],
        },
        {
          id: "s7",
          kind: "interactive",
          title: "Tomorrow's moonrise",
          prompt: "Tonight the Moon rose at 7:00. It rises about 50 minutes later each day. Set the clock to about when it will rise tomorrow.",
          widget: { kind: "clock", h: 7, m: 0, target: { h: 7, m: 50 } },
        },
      ],
    },
    {
      id: "eclipses",
      title: "Eclipses are different",
      summary: "What happens on the rare nights when Earth's shadow really does fall on the Moon.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Two kinds of eclipse",
          blocks: [
            {
              type: "text",
              text: "Phases happen because we see different amounts of the Moon's sunlit half. Earth's shadow has nothing to do with them.",
            },
            {
              type: "text",
              text: "In a lunar eclipse, Earth passes directly between the Sun and the Moon. Earth's shadow falls on the Moon.",
            },
            {
              type: "text",
              text: "In a solar eclipse, the Moon passes directly between the Sun and Earth. The Moon's shadow falls on Earth.",
            },
            { type: "points", items: ["A lunar eclipse can only happen at full moon.", "A solar eclipse can only happen at new moon."] },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Why not every month?",
          blocks: [
            { type: "visual", visual: { kind: "moon", phase: 0.5 }, alt: "A full moon: the whole round face is lit." },
            { type: "text", text: "There's a full moon about every 29.5 days, but most full moons have no eclipse." },
            {
              type: "text",
              text: "The Moon's path around Earth is tilted by about 5 degrees. Most months, the full moon passes just above or below Earth's shadow.",
            },
            { type: "text", text: "An eclipse happens only in the months when the Sun, Earth and Moon line up closely enough." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "A red moon",
          blocks: [
            {
              type: "text",
              text: "During a total lunar eclipse, the Moon doesn't disappear. It usually turns a dark, coppery red.",
            },
            { type: "text", text: "Some sunlight bends as it passes through Earth's air, and it still reaches the Moon." },
            {
              type: "text",
              text: "The air scatters away most of the blue light, so the light that gets through is mostly red. It's the same reason sunsets look red.",
            },
            {
              type: "points",
              items: [
                "A lunar eclipse is safe to watch with your eyes alone.",
                "Anyone who can see the Moon during the eclipse can watch it.",
                "A solar eclipse is different: looking at the Sun without eclipse glasses can hurt your eyes.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Lunar or solar?",
          prompt: "Sort each fact. Is it about a lunar eclipse or a solar eclipse?",
          widget: {
            kind: "sorter",
            categories: ["Lunar eclipse", "Solar eclipse"],
            items: [
              { id: "earth-shadow", text: "Earth's shadow falls on the Moon.", answer: 0 },
              { id: "moon-shadow", text: "The Moon's shadow falls on Earth.", answer: 1 },
              { id: "full", text: "It can only happen at full moon.", answer: 0 },
              { id: "new", text: "It can only happen at new moon.", answer: 1 },
              { id: "red", text: "The Moon may turn a dark coppery red.", answer: 0 },
              { id: "glasses", text: "Looking at it without eclipse glasses can hurt your eyes.", answer: 1 },
              { id: "safe", text: "It's safe to watch with your eyes alone.", answer: 0 },
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
              prompt: "During a lunar eclipse, whose shadow falls on the Moon?",
              choices: ["Earth's shadow", "The Moon's own shadow", "A cloud's shadow", "The Sun's shadow"],
              answer: 0,
              hint: "Which one moves between the Sun and the Moon?",
              explain: "In a lunar eclipse, Earth is directly between the Sun and the Moon, so Earth's shadow falls on the Moon.",
            },
            {
              id: "q2",
              prompt: "Why isn't there a lunar eclipse at every full moon?",
              choices: [
                "The Sun is too far away most months.",
                "Earth only has a shadow in winter.",
                "The Moon's path is tilted, so it usually passes above or below Earth's shadow.",
              ],
              answer: 2,
              hint: "Picture the Moon's path around Earth. Does it line up exactly with the Sun and Earth every month?",
              explain:
                "The Moon's path is tilted by about 5 degrees. Most months, the full moon slips past just above or below Earth's shadow.",
            },
            {
              id: "q3",
              prompt: "Your friend says the Moon is a crescent tonight because Earth's shadow covers most of it. What's wrong?",
              choices: [
                "Nothing. That's right.",
                "A crescent means we see only a small part of the Moon's sunlit half.",
                "Crescents happen only during solar eclipses.",
              ],
              answer: 1,
              hint: "Earth's shadow reaches the Moon only during an eclipse, and only at one phase.",
              explain:
                "A crescent is a phase: most of the sunlit half faces away from us. Earth's shadow falls on the Moon only in a lunar eclipse, at full moon.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Model an eclipse with a lamp",
          brief: "Use the lamp, the ball on a pencil and your own head again, this time to make eclipses.",
          steps: [
            "Set up as in the phases activity: a lamp without its shade in a dark room is the Sun, the ball is the Moon, and your head is Earth. Don't touch the bulb; it can get hot.",
            "Stand with your back to the lamp. Hold the Moon in front of you, a little above your head, so its face is fully lit. That's full moon.",
            "Slowly lower the Moon until your head's shadow covers it. That's a lunar eclipse.",
            "Raise the Moon until it's just above the shadow again. That's what happens at most full moons.",
            "Now face the lamp and move the Moon between the bulb and your eyes, so its shadow falls on your face. That's a model of a solar eclipse.",
          ],
        },
      ],
    },
  ],
};

export default moon;
