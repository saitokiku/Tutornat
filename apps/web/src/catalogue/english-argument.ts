import type { CatalogueEntry } from "./types";

const argument: CatalogueEntry = {
  id: "english-argument",
  title: "Claim, evidence, reasoning",
  summary: "Build an argument from a clear claim, evidence a reader can check, and reasoning that connects the two.",
  subject: "english",
  grade: "7",
  locale: "en",
  lessons: [
    {
      id: "three-parts",
      title: "The three parts of an argument",
      summary: "A claim takes a position, evidence supports it, and reasoning explains why the evidence matters.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Claim, evidence, reasoning",
          blocks: [
            { type: "text", text: "In writing, an argument is a position backed up with support, so a reader can judge it. It has three parts." },
            {
              type: "points",
              items: [
                "Claim: a statement that answers the question and takes a side someone could disagree with.",
                "Evidence: facts, numbers, examples or quotes that support the claim. A reader can check them.",
                "Reasoning: the explanation of how the evidence supports the claim.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "A short example",
          blocks: [
            { type: "text", text: "Question: Is a bike helmet worth wearing?" },
            { type: "text", text: "Claim: You should wear a helmet every time you ride a bike." },
            {
              type: "text",
              text: "Evidence: A large review of bike crash studies found that riders wearing helmets were much less likely to have a serious head injury — roughly two-thirds less likely.",
            },
            {
              type: "text",
              text: "Reasoning: A serious head injury can affect the rest of your life, and a helmet takes seconds to put on. That small effort is worth the protection.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Read an argument",
          blocks: [
            {
              type: "text",
              text: "A student wrote this for the school newspaper. The question: should our school start at 8:30 a.m. instead of 7:30?",
            },
            { type: "text", text: "Our school should start at 8:30 a.m." },
            {
              type: "text",
              text: "The American Academy of Pediatrics, a national group of children's doctors, recommends that middle and high schools start at 8:30 or later. These doctors study children's health for a living, so their advice should carry weight.",
            },
            {
              type: "text",
              text: "Sleep experts say teens need 8 to 10 hours of sleep a night. In a survey at our school, 7 out of 10 students said they feel sleepy in first period.",
            },
            { type: "text", text: "Well-rested students pay attention better, so a later start would help us learn." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Take it apart",
          prompt: "Sort each sentence from the student's argument: is it the claim, evidence, or reasoning?",
          widget: {
            kind: "sorter",
            categories: ["Claim", "Evidence", "Reasoning"],
            items: [
              { id: "aap", text: "Children's doctors recommend that middle and high schools start at 8:30 or later.", answer: 1 },
              { id: "claim", text: "Our school should start at 8:30 a.m.", answer: 0 },
              { id: "focus", text: "Well-rested students pay attention better, so a later start would help us learn.", answer: 2 },
              { id: "sleep", text: "Sleep experts say teens need 8 to 10 hours of sleep a night.", answer: 1 },
              { id: "weight", text: "These doctors study children's health for a living, so their advice should carry weight.", answer: 2 },
              { id: "survey", text: "In our survey, 7 out of 10 students said they feel sleepy in first period.", answer: 1 },
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
              prompt: "Which sentence is a claim?",
              choices: [
                "Our town's library is open 40 hours a week.",
                "Our town's library should stay open on Sundays.",
                "Many families work on weekdays.",
              ],
              answer: 1,
              hint: "A claim takes a side that someone could argue against.",
              explain:
                "“Should stay open on Sundays” takes a position someone could disagree with. The other two are facts that could be used as evidence.",
            },
            {
              id: "q2",
              prompt:
                "Claim: Our class should plant a vegetable garden behind the school. Evidence: The empty lot behind the school gets full sun most of the day. Which is the best reasoning?",
              choices: [
                "Most vegetables need at least six hours of sun a day, so the lot is a good place for a garden.",
                "Gardens are fun to have.",
                "The lot is behind the school.",
              ],
              answer: 0,
              hint: "Good reasoning doesn't just repeat the evidence or give an opinion. It explains why the evidence matters for the claim.",
              explain:
                "The first choice connects the evidence (full sun) to the claim (plant a garden) with a reason: vegetables need sun. The second is an opinion, and the third only repeats the evidence.",
            },
            {
              id: "q3",
              prompt: "A student claims, “Our school should ban phones in class,” and gives this evidence: “I don't like phones.” What is the problem?",
              choices: [
                "It's a personal feeling, not evidence a reader can check.",
                "The claim is too short.",
                "Nothing. It's strong evidence.",
              ],
              answer: 0,
              hint: "Evidence is something a reader can check, like a fact, a number or an example.",
              explain:
                "“I don't like phones” is a feeling, and a reader can't check it. Evidence should be facts, data or examples that support the claim.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Argue a question at home",
          brief: "Pick a real question your family could decide, such as “Should we eat dinner without screens?” or “Should I get a later bedtime on Fridays?”, and argue it in one paragraph.",
          steps: [
            "Write your claim in one sentence that clearly takes a side.",
            "Gather two pieces of evidence someone could check: a fact, a number, or something that actually happened.",
            "For each piece of evidence, write a sentence of reasoning that explains how it supports your claim.",
            "Read the paragraph to someone at home. Ask them to point to your claim, your evidence and your reasoning.",
            "Ask them for one reason on the other side. Decide whether your claim still holds, and why.",
          ],
        },
      ],
    },
    {
      id: "strong-evidence",
      title: "Strong and weak evidence",
      summary: "Choose evidence that is relevant, checkable and from a source you can trust.",
      minutes: 12,
      scenes: [],
    },
    {
      id: "reasoning",
      title: "Reasoning that connects",
      summary: "Explain why your evidence matters, using a rule or idea your reader already accepts.",
      minutes: 12,
      scenes: [],
    },
    {
      id: "counterclaims",
      title: "Answering the other side",
      summary: "Name the opposing view, called a counterclaim, and respond to it with evidence.",
      minutes: 14,
      scenes: [],
    },
  ],
};

export default argument;
