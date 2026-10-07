import type { CatalogueEntry } from "./types";

const rhetoric: CatalogueEntry = {
  id: "english-rhetoric",
  title: "Ethos, pathos, logos",
  summary: "Recognize and use the three classic appeals: credibility (ethos), emotion (pathos) and logic (logos).",
  subject: "english",
  grade: "9",
  locale: "en",
  lessons: [
    {
      id: "three-appeals",
      title: "Three ways to persuade",
      summary: "Speakers and writers persuade through trust, feeling and reason. Learn to name each appeal.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Three appeals",
          blocks: [
            {
              type: "text",
              text: "More than 2,300 years ago, the Greek philosopher Aristotle described three ways a speaker can persuade an audience. We still use his terms.",
            },
            {
              type: "points",
              items: [
                "Ethos: an appeal based on the speaker's credibility, meaning their knowledge, experience or character.",
                "Pathos: an appeal to the audience's emotions, such as hope, fear, pride or sympathy.",
                "Logos: an appeal to logic, using evidence, numbers and reasoning.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Ethos: the coach",
          blocks: [
            {
              type: "text",
              text: "Coach Rivera, before a cross-country meet: “I've raced and coached on this course for fifteen years. I know where people lose this race: on the first hill. Hold back there.”",
            },
            {
              type: "text",
              text: "Rivera persuades by reminding the team how well she knows the course. That is ethos: the audience trusts the speaker because of who she is and what she has done.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Pathos: the shelter ad",
          blocks: [
            {
              type: "text",
              text: "An animal shelter's ad: “Biscuit waited by the gate for three weeks after his family moved away. He's still waiting. Twenty dollars gives him a warm bed tonight.”",
            },
            {
              type: "text",
              text: "The ad gives no statistics. It makes you feel for one dog. That is pathos: persuasion through emotion.",
            },
            {
              type: "text",
              text: "Pathos isn't a trick by itself. It becomes manipulation when the feeling is meant to replace the facts.",
            },
          ],
        },
        {
          id: "s4",
          kind: "slide",
          title: "Logos: the phone review",
          blocks: [
            {
              type: "text",
              text: "A phone review: “In our tests, the battery lasted 26 hours of video playback, 5 hours more than last year's model, and the price dropped by $50. For most buyers, that makes it the better deal.”",
            },
            {
              type: "text",
              text: "The review persuades with measurable facts and a conclusion that follows from them. That is logos.",
            },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Name the appeal",
          prompt: "Sort each line by the appeal it relies on most.",
          widget: {
            kind: "sorter",
            categories: ["Ethos", "Pathos", "Logos"],
            items: [
              { id: "nurse", text: "“As a nurse for 20 years, I know what keeps patients safe.”", answer: 0 },
              { id: "brother", text: "“Picture your little brother, alone and scared on his first day.”", answer: 1 },
              { id: "bus", text: "“A bus pass costs $40 a month. Driving the same route costs about $180 in gas and parking.”", answer: 2 },
              { id: "mechanic", text: "“I've fixed cars for 25 years, and this is the tire I put on my own car.”", answer: 0 },
              { id: "cold", text: "“Don't let your family be the one left out in the cold this winter.”", answer: 1 },
              { id: "bottle", text: "“This bottle holds 20 ounces and costs the same as a 16-ounce bottle.”", answer: 2 },
            ],
          },
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt:
                "A candidate for county commissioner says, “I grew up on a farm in this county and worked it for twenty years before I ran for office.” Which appeal is she using?",
              choices: ["Ethos", "Pathos", "Logos"],
              answer: 0,
              hint: "Is she pointing to a feeling, to data, or to her own background?",
              explain: "She builds trust by showing she knows farm life firsthand. That is ethos.",
            },
            {
              id: "q2",
              prompt: "Which line relies most on logos?",
              choices: [
                "“You deserve to feel safe walking home at night.”",
                "“After streetlights were added on Elm Street, reported thefts there fell from 40 to 22 a year.”",
                "“As your police chief, I give you my word.”",
              ],
              answer: 1,
              hint: "Logos relies on evidence a listener could check and reason from.",
              explain:
                "The Elm Street line gives numbers and links a cause to an effect. The first line is pathos, and the third is ethos.",
            },
            {
              id: "q3",
              prompt:
                "In his first inaugural address in 1933, during the Great Depression, President Franklin D. Roosevelt said, “the only thing we have to fear is fear itself.” Which appeal does this line rely on most?",
              choices: ["Ethos", "Pathos", "Logos"],
              answer: 1,
              hint: "Think about how Americans felt in 1933, and what this line tries to do to that feeling.",
              explain:
                "Roosevelt speaks to a frightened country and tries to replace panic with courage. Working on the audience's feelings is pathos.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Appeals in the wild",
          brief: "Find one persuasive message in the real world and explain how it works.",
          steps: [
            "Find a real ad, commercial, speech or opinion piece. A billboard, a cereal box or a video ad all count.",
            "Copy down the exact words of one line that tries to persuade you.",
            "Name the main appeal it uses: ethos, pathos or logos.",
            "In two or three sentences, explain how it works: what does it want you to trust, feel or conclude?",
            "Decide whether the appeal is fair. Does it give you a real reason, or only a feeling? Discuss your answer with someone at home.",
          ],
        },
      ],
    },
    {
      id: "appeals-together",
      title: "Appeals working together",
      summary: "Strong arguments often combine all three. Trace how one speech moves between them.",
      minutes: 14,
      scenes: [],
    },
    {
      id: "misused-appeals",
      title: "When appeals mislead",
      summary: "Spot fallacies, or flawed reasoning, such as false authority, scare tactics and statistics without context.",
      minutes: 14,
      scenes: [],
    },
    {
      id: "your-turn",
      title: "Using the appeals yourself",
      summary: "Choose the mix of ethos, pathos and logos that fits your audience and purpose.",
      minutes: 15,
      scenes: [],
    },
  ],
};

export default rhetoric;
