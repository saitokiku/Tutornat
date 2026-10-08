import type { CatalogueEntry } from "./types";

const factOpinion: CatalogueEntry = {
  id: "english-fact-opinion",
  title: "Fact, opinion and the author's purpose",
  summary: "Tell facts from opinions, see how writers back up opinions, and figure out why an author wrote a text.",
  subject: "english",
  grade: "5",
  locale: "en",
  lessons: [
    {
      id: "fact-opinion",
      title: "Fact or opinion?",
      summary: "A fact can be checked. An opinion tells what someone thinks, feels or believes.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Two kinds of statements",
          blocks: [
            { type: "text", text: "A fact is a statement that can be checked and proved true or false." },
            {
              type: "text",
              text: "An opinion tells what someone thinks, feels or believes. People can disagree about it, and no measurement can settle it.",
            },
            { type: "points", items: ["Fact: A spider has eight legs.", "Opinion: Spiders are creepy."] },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "How to check a fact",
          blocks: [
            {
              type: "points",
              items: [
                "Count it: Our class has 24 students.",
                "Measure it: The table is 5 feet long.",
                "Look it up in a trusted source: Dogs are mammals.",
                "Check a record: The library opens at 8:00.",
              ],
            },
            { type: "text", text: "Opinions often use judgment words like best, worst, should, beautiful, boring or I think." },
            {
              type: "text",
              text: "But clue words are only clues. “The Pacific is the largest ocean” uses largest, and it is a fact: the oceans have been measured.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Fact or opinion?",
          prompt: "Sort each statement. Could someone check it?",
          widget: {
            kind: "sorter",
            categories: ["Fact", "Opinion"],
            items: [
              { id: "months", text: "There are 12 months in a year.", answer: 0 },
              { id: "summer", text: "Summer is the nicest season.", answer: 1 },
              { id: "mammals", text: "Dogs are mammals.", answer: 0 },
              { id: "recess", text: "Recess should be longer.", answer: 1 },
              { id: "pacific", text: "The Pacific is the largest ocean on Earth.", answer: 0 },
              { id: "boring", text: "Math homework is boring.", answer: 1 },
              { id: "freezes", text: "Water freezes at 32 degrees Fahrenheit.", answer: 0 },
            ],
          },
        },
        {
          id: "s4",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "“Our class has 24 students.” Is this a fact or an opinion?",
              choices: ["Fact", "Opinion"],
              answer: 0,
              hint: "Could you check it by counting?",
              explain: "You can count the students or read the class list. It can be checked, so it is a fact.",
            },
            {
              id: "q2",
              prompt: "Which statement is an opinion?",
              choices: ["Soccer is the most exciting sport.", "A soccer team has 11 players on the field.", "Soccer is played with a ball."],
              answer: 0,
              hint: "Which one would fans of other sports argue with?",
              explain: "“Most exciting” is a judgment. The other two can be checked in the rules of the game.",
            },
            {
              id: "q3",
              prompt: "Jay says, “The bridge is 50 feet long.” Ana measures it. It is 40 feet. What is true about Jay's statement?",
              choices: ["It is a statement of fact, but it is wrong.", "It is an opinion, because it is wrong.", "No one can tell if it is a fact."],
              answer: 0,
              hint: "Could Jay's statement be checked? Ana just checked it.",
              explain: "A statement of fact can be checked, and checking can show it is wrong. Jay made a mistake. He didn't give an opinion.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Facts and opinions in the kitchen",
          brief: "Find facts and opinions on the packages in your kitchen.",
          steps: [
            "Pick a cereal box, a snack bag or a food ad.",
            "Find one fact on it, like how many grams of sugar are in one serving.",
            "Find one opinion, like “the tastiest crunch.”",
            "Explain how someone could check the fact.",
            "Ask someone at home whether they agree with the opinion.",
          ],
        },
      ],
    },
    {
      id: "opinions-reasons",
      title: "Opinions backed by reasons",
      summary: "Writers mix facts and opinions. An opinion is stronger when reasons and facts back it up.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Facts can support opinions",
          blocks: [
            { type: "text", text: "Writers often mix facts and opinions in the same piece." },
            { type: "text", text: "An opinion is stronger when the writer backs it up with reasons and facts a reader can check." },
            {
              type: "points",
              items: [
                "Opinion: Our school should start a garden.",
                "Reason: Students could grow food they can taste.",
                "Supporting fact: The empty lot behind the gym gets sun all day.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Read: We need a dog park",
          blocks: [
            { type: "text", text: "Our town should build a dog park." },
            {
              type: "text",
              text: "There are about 900 dogs in town. Right now, there is no fenced place where dogs can run off a leash.",
            },
            { type: "text", text: "The empty field on Oak Street is already owned by the town. A dog park would also give neighbors a place to meet." },
            { type: "text", text: "It would be the best spot in town." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Sort the dog park sentences",
          prompt: "Sort each sentence from the dog park piece. Could someone check it?",
          widget: {
            kind: "sorter",
            categories: ["Fact", "Opinion"],
            items: [
              { id: "should", text: "Our town should build a dog park.", answer: 1 },
              { id: "dogs", text: "There are about 900 dogs in town.", answer: 0 },
              { id: "fenced", text: "There is no fenced place where dogs can run off a leash.", answer: 0 },
              { id: "field", text: "The empty field on Oak Street is owned by the town.", answer: 0 },
              { id: "best", text: "A dog park would be the best spot in town.", answer: 1 },
            ],
          },
        },
        {
          id: "s4",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "What is the author's main opinion in the dog park piece?",
              choices: ["Our town should build a dog park.", "There are about 900 dogs in town.", "Neighbors like to meet."],
              answer: 0,
              hint: "Which sentence do the other sentences try to support?",
              explain: "The facts about the dogs and the field are there to back up one opinion: the town should build a dog park.",
            },
            {
              id: "q2",
              prompt: "Which reason best supports the opinion “Our school should have a garden”?",
              choices: ["A garden lets students grow food they can taste.", "Gardens are pretty.", "My aunt has a garden."],
              answer: 0,
              hint: "Which reason is about students and school?",
              explain: "Growing food students can taste is a reason tied to school. “Gardens are pretty” is just another opinion, and an aunt's garden says nothing about school.",
            },
            {
              id: "q3",
              prompt: "Why does the author mention that the town already owns the field on Oak Street?",
              choices: ["To show the park could be built without buying land", "To prove that dogs like fields", "To make readers laugh"],
              answer: 0,
              hint: "Think about what a town would need before it could build a park.",
              explain: "If the town already owns the land, building the park is easier. That fact makes the opinion stronger.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Back it up",
          brief: "Write an opinion and support it with a fact you checked.",
          steps: [
            "Pick an opinion you hold, like “Our family should get a pet” or “Recess should be longer.”",
            "Write it as one sentence.",
            "Write two reasons why.",
            "Find one fact that supports a reason. Check it in a book, on a label, or by counting or measuring.",
            "Read it to someone. Ask which part convinced them most.",
          ],
        },
      ],
    },
    {
      id: "authors-purpose",
      title: "The author's purpose",
      summary: "Authors write to persuade, to inform or to entertain. Clues in the text show which.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Why did the author write this?",
          blocks: [
            { type: "text", text: "Every author has a reason for writing. That reason is the author's purpose." },
            {
              type: "points",
              items: [
                "To persuade: to get you to believe something or do something.",
                "To inform: to teach you facts about a topic.",
                "To entertain: to tell a story, make you laugh or keep you turning pages.",
              ],
            },
            { type: "text", text: "A text can do more than one of these. Ask which purpose matters most." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Clues to the purpose",
          blocks: [
            {
              type: "points",
              items: [
                "Persuade: opinions, the word should, reasons, and requests like vote, buy or join.",
                "Inform: facts, numbers, dates, headings and diagrams.",
                "Entertain: characters, a plot, jokes, rhyme and surprises.",
              ],
            },
            {
              type: "text",
              text: "A recipe, a news report and a science book usually inform. An ad, a campaign poster and a letter asking for something usually persuade. A comic, a novel and a funny poem usually entertain.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Persuade, inform or entertain?",
          prompt: "What is the main purpose of each text?",
          widget: {
            kind: "sorter",
            categories: ["Persuade", "Inform", "Entertain"],
            items: [
              { id: "ad", text: "An ad: “Buy Zippy Shoes, the fastest shoes in town.”", answer: 0 },
              { id: "bees", text: "A science book page about how bees make honey.", answer: 1 },
              { id: "pirate", text: "A comic about a cat who wants to be a pirate.", answer: 2 },
              { id: "letter", text: "A letter asking the principal to add a second recess.", answer: 0 },
              { id: "bridge", text: "A news article about a new bridge opening downtown.", answer: 1 },
              { id: "dragon", text: "A funny poem about a dragon who can't stop sneezing.", answer: 2 },
            ],
          },
        },
        {
          id: "s4",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "A poster says, “Vote for Maya for class president. She listens to everyone.” What is the author's purpose?",
              choices: ["To persuade", "To inform", "To entertain"],
              answer: 0,
              hint: "What does the poster want you to do?",
              explain: "The poster asks you to vote and gives a reason. That is persuading.",
            },
            {
              id: "q2",
              prompt: "A website explains how volcanoes form, with diagrams and labels. What is its main purpose?",
              choices: ["To entertain", "To inform", "To persuade"],
              answer: 1,
              hint: "Is it giving opinions, telling a story, or teaching facts?",
              explain: "Diagrams and explanations teach facts about volcanoes. The purpose is to inform.",
            },
            {
              id: "q3",
              prompt: "A story tells about a sandwich that runs away from a lunchbox. What is the author's main purpose?",
              choices: ["To inform", "To persuade", "To entertain"],
              answer: 2,
              hint: "Can sandwiches really run? Why would someone write this?",
              explain: "A runaway sandwich is a made-up, funny story. The purpose is to entertain.",
            },
            {
              id: "q4",
              prompt: "A news article about a new park ends with “Everyone should visit it this weekend.” Which is true?",
              choices: ["The article mostly informs, but the last line persuades.", "The whole article is meant to entertain.", "The article has no purpose."],
              answer: 0,
              hint: "Look at the last sentence. Does it give a fact, or tell you what to do?",
              explain: "Most of a news article informs. “Everyone should visit” is an opinion that tries to persuade. A text can have more than one purpose.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Purpose detective",
          brief: "Find texts at home and name each author's purpose.",
          steps: [
            "Collect three texts: a food package, a recipe, a storybook, a store flyer or a letter.",
            "For each one, ask: is it mainly trying to persuade, inform or entertain?",
            "Write down one clue that told you.",
            "Find a text that does two things at once, like a cereal box with facts and a sales pitch.",
            "Explain your choices to someone at home.",
          ],
        },
      ],
    },
    {
      id: "main-idea-purpose",
      title: "Two texts, one topic",
      summary: "Compare a text that informs with a text that persuades, both about sea otters.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Three questions for any text",
          blocks: [
            {
              type: "points",
              items: [
                "What is it mostly about? That is the main idea.",
                "Which statements are facts, and which are opinions?",
                "Why did the author write it?",
              ],
            },
            { type: "text", text: "Asking all three helps you read carefully, especially when a text is trying to change your mind." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Text A: Sea otters",
          blocks: [
            {
              type: "text",
              text: "Sea otters live along the coasts of the North Pacific Ocean. Unlike seals and whales, they don't have a thick layer of blubber. They stay warm with the densest fur of any animal: no other animal has so many hairs packed so close together.",
            },
            {
              type: "text",
              text: "Sea otters eat sea urchins, and sea urchins eat kelp. Where otters keep the number of urchins down, kelp forests can grow. Otters also use rocks as tools to crack open shellfish.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Text B: Protect the sea otters",
          blocks: [
            {
              type: "text",
              text: "Sea otters are the cutest animals in the ocean. Everyone should help protect them.",
            },
            {
              type: "text",
              text: "Without otters, sea urchins can eat away whole kelp forests. Tell your friends why otters matter.",
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Fact or opinion?",
          prompt: "Sort these sentences from Text A and Text B.",
          widget: {
            kind: "sorter",
            categories: ["Fact", "Opinion"],
            items: [
              { id: "urchins", text: "Sea otters eat sea urchins.", answer: 0 },
              { id: "cutest", text: "Sea otters are the cutest animals in the ocean.", answer: 1 },
              { id: "rocks", text: "Otters use rocks as tools to crack open shellfish.", answer: 0 },
              { id: "protect", text: "Everyone should help protect sea otters.", answer: 1 },
              { id: "coasts", text: "Sea otters live along the coasts of the North Pacific Ocean.", answer: 0 },
              { id: "kelp", text: "Without otters, sea urchins can eat away whole kelp forests.", answer: 0 },
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
              prompt: "Which sentence best states the main idea of Text A?",
              choices: [
                "Sea otters have special ways to survive, and they help kelp forests grow.",
                "Sea otters use rocks as tools.",
                "The ocean is home to many animals.",
                "Everyone should protect sea otters.",
              ],
              answer: 0,
              hint: "Which choice covers the whole text, not just one detail?",
              explain:
                "Using rocks as tools is one detail. “The ocean is home to many animals” is too broad. Protecting otters is Text B's opinion, not Text A's main idea.",
            },
            {
              id: "q2",
              prompt: "What is the main purpose of Text B?",
              choices: ["To persuade readers to care about sea otters", "To teach how otters crack open shellfish", "To tell a funny story about otters"],
              answer: 0,
              hint: "Look for should, requests and judgment words.",
              explain: "Text B gives an opinion, asks readers to act and uses a fact as a reason. Its purpose is to persuade.",
            },
            {
              id: "q3",
              prompt: "Text B uses one fact to support its opinion. Which one?",
              choices: [
                "Without otters, sea urchins can eat away whole kelp forests.",
                "Sea otters are the cutest animals in the ocean.",
                "Everyone should help protect them.",
              ],
              answer: 0,
              hint: "Which sentence could a scientist check?",
              explain: "Scientists have studied what happens to kelp forests when otters disappear. The other two sentences are opinions.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Write it two ways",
          brief: "Write about one topic twice: once to inform, once to persuade.",
          steps: [
            "Pick an animal or a place you know well.",
            "Write three facts about it. Check each one in a book or with an adult.",
            "Now write three sentences that try to persuade. Use should and at least one of your facts.",
            "Underline every opinion in your persuasive version.",
            "Read both versions to someone. Ask which one changed their mind more, and why.",
          ],
        },
      ],
    },
  ],
};

/** Practice on the skill map that fits each lesson (lesson id → skill ids). The author's purpose has no practice skill yet. */
export const practice: Record<string, string[]> = {
  "fact-opinion": ["e.fact.opinion"],
  "opinions-reasons": ["e.fact.opinion"],
  "main-idea-purpose": ["e.main.idea", "e.fact.opinion"],
};

export default factOpinion;
