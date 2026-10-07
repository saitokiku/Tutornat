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
      ],
    },
    {
      id: "moon-in-daytime",
      title: "The Moon in the daytime",
      summary: "Why the Moon rises at a different time each day, and why you can often see it in a daytime sky.",
      minutes: 10,
      scenes: [],
    },
    {
      id: "eclipses",
      title: "Eclipses are different",
      summary: "What happens on the rare nights when Earth's shadow really does fall on the Moon.",
      minutes: 12,
      scenes: [],
    },
  ],
};

export default moon;
