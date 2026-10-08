import type { CatalogueEntry } from "./types";

const figurative: CatalogueEntry = {
  id: "english-figurative",
  title: "Figurative language",
  summary: "Similes, metaphors, idioms, personification and hyperbole: what they mean and why writers use them.",
  subject: "english",
  grade: "4",
  locale: "en",
  lessons: [
    {
      id: "literal-figurative",
      title: "Literal or figurative?",
      summary: "Literal words mean exactly what they say. Figurative words make a point by painting a picture.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Two ways to use words",
          blocks: [
            { type: "text", text: "Literal language means exactly what it says. “It is raining hard” is literal." },
            {
              type: "text",
              text: "Figurative language uses words in an unusual way to make a point or paint a picture. “It's raining cats and dogs” is figurative. No animals are falling.",
            },
            { type: "points", items: ["Literal: The dog ran across the yard.", "Figurative: My backpack weighs a ton."] },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Why writers use it",
          blocks: [
            { type: "text", text: "Figurative language helps you see, hear or feel what a writer means." },
            {
              type: "text",
              text: "“My backpack weighs a ton” isn't true: a ton is 2,000 pounds. But you know right away that the backpack feels very heavy.",
            },
            { type: "text", text: "When you read figurative language, ask: what does the writer really mean?" },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Literal or figurative?",
          prompt: "Read each sentence. Does it mean exactly what it says?",
          widget: {
            kind: "sorter",
            categories: ["Literal", "Figurative"],
            items: [
              { id: "soup", text: "We ate soup for lunch.", answer: 0 },
              { id: "couch", text: "My brother is a couch potato.", answer: 1 },
              { id: "horse", text: "I'm so hungry I could eat a horse.", answer: 1 },
              { id: "crib", text: "The baby slept in her crib.", answer: 0 },
              { id: "smile", text: "Her smile was as bright as the sun.", answer: 1 },
              { id: "bus", text: "The bus was ten minutes late.", answer: 0 },
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
              prompt: "Which sentence is literal?",
              choices: ["The classroom was a zoo.", "Time flies when you're having fun.", "The cat sat on the windowsill."],
              answer: 2,
              hint: "Which one could happen exactly as it is written?",
              explain: "A cat really can sit on a windowsill. A classroom isn't a zoo, and time doesn't have wings.",
            },
            {
              id: "q2",
              prompt: "“This homework is a breeze.” What does the writer mean?",
              choices: ["The homework is easy.", "The homework is about wind.", "The homework blew away."],
              answer: 0,
              hint: "A breeze is a light, gentle wind. What would light homework be like?",
              explain: "Calling something a breeze means it is easy. It takes about as much effort as a gentle wind.",
            },
            {
              id: "q3",
              prompt: "Why might a writer say “my feet were blocks of ice” instead of “my feet were cold”?",
              choices: ["Because the writer's feet turned into ice", "To help the reader feel how cold they were", "To make the sentence shorter"],
              answer: 1,
              hint: "Is the sentence meant to be true word for word?",
              explain: "Feet can't turn into ice. The picture of ice blocks makes you feel just how cold the writer's feet were.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Two-picture saying",
          brief: "Draw what a saying says, and what it means.",
          steps: [
            "Fold a sheet of paper in half.",
            "Pick a saying: raining cats and dogs, a couch potato, or my backpack weighs a ton.",
            "On the left, draw what the words literally say.",
            "On the right, draw what the saying really means.",
            "Show someone your drawings and ask them to guess the saying.",
          ],
        },
      ],
    },
    {
      id: "similes-metaphors",
      title: "Similes and metaphors",
      summary: "Both compare two different things. A simile uses like or as. A metaphor says one thing is another.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Similes",
          blocks: [
            { type: "text", text: "A simile compares two different things using the word like or as." },
            { type: "points", items: ["He swims like a fish.", "The kitten's fur was as soft as silk.", "Her voice was like honey."] },
            { type: "text", text: "Ask how the two things are alike. A fish swims easily, so he swims easily too." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Metaphors",
          blocks: [
            {
              type: "text",
              text: "A metaphor also compares two different things, but it says one thing is the other. There is no like or as.",
            },
            { type: "points", items: ["The snow was a white blanket on the hill.", "The classroom was a zoo.", "Dad is a bear in the morning."] },
            { type: "text", text: "The snow isn't really a blanket. It covers the hill the way a blanket covers a bed." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Not every like is a simile",
          blocks: [
            { type: "text", text: "“I like pizza” uses the word like, but it doesn't compare anything." },
            {
              type: "text",
              text: "“Tom is as tall as his dad” compares two people. They are the same kind of thing, so it's a literal comparison, not a simile.",
            },
            { type: "text", text: "A simile compares things that are different in most ways, like a voice and honey." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Simile, metaphor or literal?",
          prompt: "Sort each sentence.",
          widget: {
            kind: "sorter",
            categories: ["Simile", "Metaphor", "Literal"],
            items: [
              { id: "cheetah", text: "She ran as fast as a cheetah.", answer: 0 },
              { id: "diamonds", text: "The stars were diamonds in the sky.", answer: 1 },
              { id: "apples", text: "I like apples.", answer: 2 },
              { id: "cheeks", text: "The baby's cheeks were as red as apples.", answer: 0 },
              { id: "tornado", text: "My little brother is a tornado when he plays.", answer: 1 },
              { id: "tall", text: "Tom is as tall as his dad.", answer: 2 },
              { id: "mirror", text: "The pond was a mirror.", answer: 1 },
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
              prompt: "“The moon was a silver coin.” Is this a simile or a metaphor?",
              choices: ["Simile", "Metaphor"],
              answer: 1,
              hint: "Look for the word like or as.",
              explain: "It says the moon was a coin, with no like or as. That makes it a metaphor.",
            },
            {
              id: "q2",
              prompt: "Which sentence is a simile?",
              choices: ["The test was as easy as pie.", "The test was easy.", "The test was a piece of cake."],
              answer: 0,
              hint: "Look for like or as comparing two different things.",
              explain: "“As easy as pie” compares the test to pie using as. “A piece of cake” is an idiom with no like or as.",
            },
            {
              id: "q3",
              prompt: "“The playground was an oven.” How are the playground and an oven alike?",
              choices: ["Both are in a kitchen.", "Both are fun to play in.", "Both are very hot."],
              answer: 2,
              hint: "What do you know about the inside of an oven?",
              explain: "An oven is very hot inside. The metaphor tells you the playground was very hot.",
            },
            {
              id: "q4",
              prompt: "Kim says “Tom is as tall as his dad” is a simile because it uses as. Is she right?",
              choices: ["No. It compares two people, so it is literal.", "Yes. Any sentence with as is a simile."],
              answer: 0,
              hint: "Does a simile compare things of the same kind, or different kinds?",
              explain: "A simile compares two different kinds of things. Tom and his dad are both people, so this is a plain, literal comparison.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Comparison hunt",
          brief: "Find similes and metaphors in a real book.",
          steps: [
            "Pick a picture book or chapter book at home.",
            "Look for like or as. Write down any similes you find.",
            "Look for sentences that say one thing is another. Those may be metaphors.",
            "Turn one simile into a metaphor. “Swims like a fish” could become “is a fish in the water.”",
            "Write one simile and one metaphor about someone in your family.",
          ],
        },
      ],
    },
    {
      id: "idioms",
      title: "Idioms and proverbs",
      summary: "An idiom means something different from its words. A proverb gives advice.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Idioms",
          blocks: [
            { type: "text", text: "An idiom is a saying whose meaning is different from the meaning of its words." },
            {
              type: "points",
              items: [
                "Break a leg: good luck. People say it before a show.",
                "It's raining cats and dogs: it's raining very hard.",
                "Hold your horses: wait and be patient.",
                "I'm all ears: I'm listening closely.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Use the clues around it",
          blocks: [
            { type: "text", text: "If you don't know an idiom, read the sentences around it." },
            { type: "text", text: "“Jada's bike cost an arm and a leg. She saved her allowance for a whole year to buy it.”" },
            { type: "text", text: "Saving for a year is a clue. “Cost an arm and a leg” means it cost a lot of money." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Proverbs give advice",
          blocks: [
            { type: "text", text: "A proverb is a short, well-known saying that gives advice or says something true about life." },
            {
              type: "points",
              items: [
                "Don't count your chickens before they hatch: don't count on something before it happens.",
                "Practice makes perfect: doing something again and again makes you better at it.",
                "The early bird catches the worm: people who start early get the first chance.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "What does it mean?",
          prompt: "Sort each idiom by what it means.",
          widget: {
            kind: "sorter",
            categories: ["It's easy", "It costs a lot", "Wait"],
            items: [
              { id: "cake", text: "a piece of cake", answer: 0 },
              { id: "breeze", text: "a breeze", answer: 0 },
              { id: "arm", text: "costs an arm and a leg", answer: 1 },
              { id: "fortune", text: "costs a fortune", answer: 1 },
              { id: "horses", text: "hold your horses", answer: 2 },
              { id: "tight", text: "sit tight", answer: 2 },
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
              prompt: "Coach said, “Hold your horses. The game hasn't started.” What did Coach mean?",
              choices: ["Wait and be patient.", "Grab the horses.", "Run faster."],
              answer: 0,
              hint: "There are no horses at the game. What is Coach asking the players to do?",
              explain: "“Hold your horses” means wait. The game hadn't started yet.",
            },
            {
              id: "q2",
              prompt: "Grandpa put down his newspaper and said, “I'm all ears.” What does he mean?",
              choices: ["His ears are big.", "He cannot hear you.", "He is ready to listen."],
              answer: 2,
              hint: "What are ears for? Why did he put down the paper?",
              explain: "“I'm all ears” means he is listening closely. Putting down the paper is a clue.",
            },
            {
              id: "q3",
              prompt: "Lin planned a party before her parents said yes. Which proverb fits?",
              choices: ["Practice makes perfect.", "Don't count your chickens before they hatch.", "The early bird catches the worm."],
              answer: 1,
              hint: "Lin is planning for something that may not happen.",
              explain: "Lin is planning a party that might not happen. That's counting your chickens before they hatch.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Family sayings",
          brief: "Collect the sayings your family uses.",
          steps: [
            "Ask two family members for a saying they use or heard growing up. It can be in any language.",
            "Write each saying and what it means.",
            "Ask: when do people say it?",
            "Draw what the words say, and what the saying really means.",
            "Share one saying with a friend or your class.",
          ],
        },
      ],
    },
    {
      id: "personification-hyperbole",
      title: "Personification and hyperbole",
      summary: "Giving human traits to things that aren't human, and exaggerating on purpose.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Personification",
          blocks: [
            { type: "text", text: "Personification gives human actions or feelings to something that isn't human." },
            { type: "points", items: ["The wind whispered through the trees.", "The old car groaned up the hill.", "The flowers danced in the breeze."] },
            { type: "text", text: "Wind can't really whisper. But now you can hear how soft it was." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Hyperbole",
          blocks: [
            { type: "text", text: "Hyperbole is a huge exaggeration. The writer doesn't expect you to believe it." },
            { type: "points", items: ["I have a million things to do.", "I've told you a thousand times.", "This bag weighs a ton."] },
            { type: "text", text: "Hyperbole says something very strongly: I'm very busy, I'm very annoyed, this bag is very heavy." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Name the figure",
          prompt: "Sort each sentence. Which kind of figurative language is it?",
          widget: {
            kind: "sorter",
            categories: ["Simile", "Metaphor", "Personification", "Hyperbole"],
            items: [
              { id: "sun", text: "The sun smiled down on us.", answer: 2 },
              { id: "year", text: "I'm so tired I could sleep for a year.", answer: 3 },
              { id: "honey", text: "Her voice was like honey.", answer: 0 },
              { id: "treasure", text: "The library is a treasure chest.", answer: 1 },
              { id: "leaves", text: "The leaves danced in the wind.", answer: 2 },
              { id: "pancakes", text: "I ate a hundred pancakes for breakfast.", answer: 3 },
              { id: "gum", text: "The kitten's nose was as pink as bubble gum.", answer: 0 },
              { id: "icebox", text: "My bedroom was an icebox.", answer: 1 },
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
              prompt: "“The thunder grumbled in the distance.” What kind of figurative language is this?",
              choices: ["Simile", "Hyperbole", "Personification"],
              answer: 2,
              hint: "Who usually grumbles?",
              explain: "People grumble. Giving that human action to thunder is personification.",
            },
            {
              id: "q2",
              prompt: "Which sentence is a hyperbole?",
              choices: ["My backpack is heavy.", "My backpack weighs a thousand pounds.", "My backpack is like a turtle's shell."],
              answer: 1,
              hint: "Which one is an exaggeration no one would believe?",
              explain: "No one could carry a thousand pounds, so the writer is exaggerating. “Like a turtle's shell” is a simile.",
            },
            {
              id: "q3",
              prompt: "“The stairs groaned under my feet.” What does this help you hear?",
              choices: ["The stairs creaked loudly.", "The stairs were alive.", "The stairs were brand new."],
              answer: 0,
              hint: "Stairs can't groan. What sound might old stairs make?",
              explain: "The personification helps you hear the creaking. The stairs aren't alive, and new stairs usually don't creak.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Weather report",
          brief: "Write a weather report full of figurative language.",
          steps: [
            "Look out the window. Notice the sky, the wind and how warm or cold it is.",
            "Write one simile about the weather.",
            "Write one metaphor about the weather.",
            "Write one sentence with personification, like “The wind pushed at the door.”",
            "Write one hyperbole. Read your report aloud and ask your listener to name each kind.",
          ],
        },
      ],
    },
  ],
};

/** Practice on the skill map that fits each lesson (lesson id → skill ids). Not linked from the lesson screen yet. */
export const practice: Record<string, string[]> = {
  "literal-figurative": ["e.figurative"],
  "similes-metaphors": ["e.figurative"],
  idioms: ["e.idioms.proverbs", "e.figurative"],
  "personification-hyperbole": ["e.figurative"],
};

export default figurative;
