import type { CatalogueEntry } from "./types";

// Practice skills this course teaches toward: e.main.idea (topic sentence), e.transitions.

const paragraph: CatalogueEntry = {
  id: "english-paragraph",
  title: "Writing a strong paragraph",
  summary:
    "Build a paragraph around one main idea: a focused topic sentence, details that support it, transitions that connect them and a sentence that closes it.",
  subject: "english",
  grade: "6",
  locale: "en",
  lessons: [
    {
      id: "topic-sentence",
      title: "The topic sentence",
      summary: "A paragraph is about one main idea. The topic sentence tells the reader what it is.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "A model paragraph",
          blocks: [
            { type: "text", text: "Read this paragraph and notice what the first sentence does." },
            {
              type: "text",
              text: "“Our town's library is much more than a place to borrow books. Every weekday afternoon, volunteers run a free homework help table. On Saturdays, families can check out laptops, board games and even cake pans. In summer, kids who read ten books get one to keep. For many families, the library is the most useful building in town.”",
            },
            {
              type: "text",
              text: "The first sentence makes a point: the library is more than books. Every sentence after it gives the reader a reason to believe that point. That's what holds the paragraph together.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "One paragraph, one idea",
          blocks: [
            {
              type: "text",
              text: "A paragraph is a group of sentences about one main idea. In most school writing, the first sentence states that idea. It's called the topic sentence.",
            },
            {
              type: "points",
              items: [
                "Topic sentence: states the main idea. In the library paragraph, it's the first sentence.",
                "Supporting sentences: give details, examples and explanations that develop it, like the homework table and the laptops.",
                "Concluding sentence: brings the reader back to the main idea at the end, like “the most useful building in town.”",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Not too broad, not too narrow",
          blocks: [
            { type: "text", text: "A strong topic sentence is focused: big enough to need a whole paragraph, small enough to cover in one." },
            {
              type: "points",
              items: [
                "Too broad: “Sports are popular around the world.” That needs a book, not a paragraph.",
                "Too narrow: “Our soccer practice starts at 4:00.” Once you've said it, there's nothing left to explain.",
                "Focused: “Playing on a soccer team taught me how to handle losing.” One paragraph can explain this well.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "slide",
          title: "Name the topic, then make a point",
          blocks: [
            {
              type: "text",
              text: "A topic sentence does two jobs. It names the topic, and it says something about that topic that the rest of the paragraph will explain.",
            },
            {
              type: "points",
              items: [
                "Topic only: “This paragraph is about my dog.”",
                "Topic and point: “Taking care of my dog has made me more responsible.”",
                "Skip announcements like “In this paragraph, I will tell you about…” Make the point instead.",
              ],
            },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Focused or not?",
          prompt: "Sort each topic sentence. Is it too broad, too narrow, or focused enough for one paragraph?",
          widget: {
            kind: "sorter",
            categories: ["Too broad", "Too narrow", "Focused"],
            items: [
              { id: "cook", text: "Learning to cook dinner one night a week has made me more independent.", answer: 2 },
              { id: "history", text: "History is full of interesting events.", answer: 0 },
              { id: "bike", text: "My sister's bike is red.", answer: 1 },
              { id: "garden", text: "Starting a garden club taught our school that students will work hard for something they can eat.", answer: 2 },
              { id: "bus", text: "The bus picks me up at 7:42.", answer: 1 },
              { id: "music", text: "Music is important to people.", answer: 0 },
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
              prompt: "Which is the strongest topic sentence?",
              choices: [
                "This paragraph is about my grandmother and the life she has lived.",
                "My grandmother showed me that cooking is a way to care for people.",
                "My grandmother was born in Puebla, Mexico, and moved here in 1990.",
                "Grandmothers are important to families in every country of the world.",
              ],
              answer: 1,
              hint: "Look for the one that names a topic and makes a point the paragraph can explain.",
              explain:
                "The cooking sentence names the topic, your grandmother, and makes a point, that cooking is a way of caring, which the rest of the paragraph can explain. The announcement only names the topic, the Puebla sentence gives facts with no point, and the one about all grandmothers is too broad.",
            },
            {
              id: "q2",
              prompt: "Where does the topic sentence usually go in a school paragraph?",
              choices: ["In the middle", "At the very end", "It's usually left out", "At the start"],
              answer: 3,
              hint: "The reader needs to know the main idea before the details make sense.",
              explain:
                "In most school writing, the topic sentence comes first, so the reader knows what every detail is supporting. Experienced writers sometimes place it later, but the start is the usual spot.",
            },
            {
              id: "q3",
              prompt: "Why is “Our team practices at 4:00” a weak topic sentence?",
              choices: [
                "It's too long to be a topic sentence.",
                "It's one fact, with nothing left to explain.",
                "It's an opinion, and opinions don't belong in paragraphs.",
                "It names too many topics at once.",
              ],
              answer: 1,
              hint: "Try to write three more sentences that explain it. What happens?",
              explain:
                "A topic sentence needs a point the paragraph can develop. A practice time is one fact. Once it's stated, there's nothing more to say about it.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Three topic sentences",
          brief: "Write topic sentences about your own life, and test whether each one could carry a paragraph.",
          steps: [
            "Pick three things you know well: a place, a person and a skill.",
            "For each one, write a topic sentence that names it and makes a point about it.",
            "Test each sentence. Could you write four sentences that explain it? If not, widen it. Would it need a whole essay? Narrow it.",
            "Read your best one to someone at home. Ask them to guess what the rest of the paragraph would say.",
          ],
        },
      ],
    },
    {
      id: "supporting-details",
      title: "Details that support",
      summary: "Every sentence after the topic sentence should develop the main idea. Cut the ones that wander off.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Kinds of support",
          blocks: [
            {
              type: "text",
              text: "Supporting sentences give the reader reasons to believe or understand the topic sentence. They come in a few kinds.",
            },
            {
              type: "points",
              items: [
                "Facts and numbers: “The library is open 60 hours a week.”",
                "Examples: “Last month I borrowed a cake pan there for my brother's birthday.”",
                "Explanations: sentences that say why a fact or example matters.",
                "Quotations: someone's exact words, inside quotation marks.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Stay on topic",
          blocks: [
            {
              type: "text",
              text: "A paragraph has unity when every sentence supports the main idea. A sentence that wanders off weakens the paragraph, even if it's true and interesting.",
            },
            {
              type: "text",
              text: "“Walking to school is a good way to start the day. It gives me twenty minutes of exercise before I sit in class for hours. I get to talk with my friends on the way. My friend Ana just got a new puppy. By the time I reach class, I'm awake and ready to work.”",
            },
            {
              type: "text",
              text: "The puppy is real news, but it says nothing about walking to school. That sentence belongs in a different paragraph.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Detail, then explanation",
          blocks: [
            {
              type: "text",
              text: "A detail on its own can leave the reader asking, “So what?” Follow it with words that connect it to your main idea.",
            },
            {
              type: "points",
              items: [
                "Topic sentence: “Our school needs a longer lunch period.”",
                "Detail only: “The lunch line takes 15 minutes.”",
                "Detail and explanation: “The lunch line takes 15 minutes, which leaves only 10 minutes to eat in a 25-minute lunch.”",
              ],
            },
            { type: "text", text: "The explanation turns a plain fact into support for the point." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Supports it or wanders?",
          prompt: "Topic sentence: “Taking care of our class guinea pig, Pepper, teaches us responsibility.” Sort each sentence.",
          widget: {
            kind: "sorter",
            categories: ["Supports the topic", "Wanders off topic"],
            items: [
              { id: "origin", text: "Guinea pigs first came from South America.", answer: 1 },
              { id: "feed", text: "Each week, two students are in charge of feeding Pepper and giving her fresh water.", answer: 0 },
              { id: "smell", text: "If we forget to clean her cage, the whole room can smell it by Friday.", answer: 0 },
              { id: "walls", text: "Our classroom walls are painted blue.", answer: 1 },
              { id: "cat", text: "My cousin has a cat that sleeps in shoeboxes.", answer: 1 },
              { id: "chart", text: "We keep a chart on the wall so everyone knows whose turn it is.", answer: 0 },
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
              prompt: "Topic sentence: “Learning to swim made me braver.” Which detail supports it best?",
              choices: [
                "I was scared the first time I jumped in the deep end, but I jumped again the next day.",
                "Swimming has been part of the Olympic Games for more than a hundred years.",
                "My swimsuit is green, and my goggles are blue.",
                "The pool where I learned is next to the library on Main Street.",
              ],
              answer: 0,
              hint: "Which detail shows the writer becoming braver?",
              explain:
                "The deep-end jump shows fear and then courage, which is exactly what the topic sentence claims. The other choices are about swimming or the pool, not about bravery.",
            },
            {
              id: "q2",
              prompt: "A sentence in your paragraph is true and interesting, but it doesn't support the main idea. What should you do?",
              choices: [
                "Keep it, because true sentences always help a paragraph.",
                "Cut it, or move it to a paragraph where it fits.",
                "Make it the first sentence so readers see it right away.",
              ],
              answer: 1,
              hint: "Think about unity. What should every sentence in a paragraph do?",
              explain: "A true sentence can still wander. Cut it from this paragraph, or save it for one where it supports the main idea.",
            },
            {
              id: "q3",
              prompt: "Topic sentence: “Our school needs more water fountains.” Which sentence gives a detail and explains it?",
              choices: [
                "With 900 students and two fountains, lines at break are too long to get a drink.",
                "Our school has 900 students and two water fountains.",
                "Water is important for everyone, and doctors say we should drink more of it each day.",
                "Some of the fountains in our school are made of shiny steel.",
              ],
              answer: 0,
              hint: "Look for a fact plus words that say what it means for the main idea.",
              explain:
                "The sentence about long lines gives a fact and then explains its effect: students can't get a drink in time. The one that only counts students and fountains is a fact with no point, and the other two don't support the claim.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Tighten a paragraph",
          brief: "Revise a paragraph so that every sentence supports its main idea.",
          steps: [
            "Find a paragraph you wrote for school, or write a new one about a place you like.",
            "Underline the topic sentence.",
            "Number each sentence after it. Next to each number, write how that sentence supports the topic sentence.",
            "Cross out any sentence that wanders, even if it's true.",
            "Add an explanation after one detail that needs a “so what.”",
            "Read the old and new versions to someone at home. Ask which one is clearer, and why.",
          ],
        },
      ],
    },
    {
      id: "transitions",
      title: "Transitions that connect",
      summary: "Words like “for example,” “however” and “as a result” show readers how one idea leads to the next.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Signposts for the reader",
          blocks: [
            {
              type: "text",
              text: "Transitions are words and phrases that show how two ideas connect. Like road signs, they tell the reader what's coming.",
            },
            {
              type: "points",
              items: [
                "Adding an idea: in addition, also, furthermore.",
                "Giving an example: for example, for instance.",
                "Showing a contrast: however, on the other hand, but.",
                "Showing a result: as a result, therefore, so.",
                "Showing order: first, next, then, finally.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Same facts, connected",
          blocks: [
            {
              type: "text",
              text: "Without transitions: “I wanted to join the robotics club. The meetings were on Tuesdays. I had piano lessons on Tuesdays. I talked to my piano teacher. She moved my lesson to Thursdays. I joined the club in October.”",
            },
            {
              type: "text",
              text: "With transitions: “I wanted to join the robotics club. However, the meetings were on Tuesdays, when I had piano lessons. So I talked to my piano teacher, and she moved my lesson to Thursdays. As a result, I joined the club in October.”",
            },
            {
              type: "text",
              text: "The facts didn't change. The transitions show which idea is the problem, which is the fix and which is the result.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Pick the one that fits",
          blocks: [
            { type: "text", text: "Each transition has a job. The wrong one sends the reader in the wrong direction." },
            {
              type: "points",
              items: [
                "Wrong: “It rained all morning. For example, the game was canceled.” A canceled game isn't an example of rain. It's a result.",
                "Right: “It rained all morning. As a result, the game was canceled.”",
                "Don't start every sentence with a transition. Use one where the connection would otherwise be unclear.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "What job does it do?",
          prompt: "Sort each transition by the job it does.",
          widget: {
            kind: "sorter",
            categories: ["Adds an idea", "Gives an example", "Shows a contrast", "Shows a result"],
            items: [
              { id: "therefore", text: "Therefore", answer: 3 },
              { id: "addition", text: "In addition", answer: 0 },
              { id: "however", text: "However", answer: 2 },
              { id: "for-example", text: "For example", answer: 1 },
              { id: "also", text: "Also", answer: 0 },
              { id: "as-a-result", text: "As a result", answer: 3 },
              { id: "instance", text: "For instance", answer: 1 },
              { id: "other-hand", text: "On the other hand", answer: 2 },
            ],
          },
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Fill the gap",
          prompt: "Each pair of sentences is missing a transition at the blank. Sort each pair by the transition that fits.",
          widget: {
            kind: "sorter",
            categories: ["However", "For example", "As a result"],
            items: [
              { id: "zoo", text: "Most of the class voted for the zoo trip. ___, a few students wanted to visit the museum.", answer: 0 },
              { id: "league", text: "Our team practiced every day for a month. ___, we won the league.", answer: 2 },
              { id: "hare", text: "Some animals change color with the seasons. ___, the snowshoe hare turns white in winter.", answer: 1 },
              { id: "bridge", text: "The bridge was closed for repairs. ___, the bus took a longer route.", answer: 2 },
              { id: "movie", text: "The movie got strong reviews. ___, I found it slow.", answer: 0 },
              {
                id: "tomatoes",
                text: "Many vegetables need a lot of sun. ___, tomatoes grow best with at least six hours of direct sunlight a day.",
                answer: 1,
              },
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
              prompt: "“The library was closed on Monday. ___, I studied at the kitchen table.” Which transition fits best?",
              choices: ["For instance", "For example", "In addition", "As a result"],
              answer: 3,
              hint: "Does the second sentence add an idea, give an example, show a contrast or show what happened because of the first?",
              explain: "Studying at home happened because the library was closed. That's a result, so “As a result” fits.",
            },
            {
              id: "q2",
              prompt: "Which pair uses a transition incorrectly?",
              choices: [
                "I love winter. However, I hate shoveling snow.",
                "Some birds can't fly. For example, penguins can't fly, but they use their wings to swim.",
                "Our dog is twelve years old. As a result, she still loves to run.",
                "We packed sandwiches. In addition, we brought water.",
              ],
              answer: 2,
              hint: "Read each pair. Does the transition match how the two ideas connect?",
              explain: "An old dog that still loves to run is a surprise, not a result. “However, she still loves to run” would fit.",
            },
            {
              id: "q3",
              prompt: "Why use transitions in a paragraph?",
              choices: ["To make every sentence longer and more formal", "To replace the topic sentence when there isn't one", "To show the reader how ideas connect"],
              answer: 2,
              hint: "Think of road signs. What do they tell a driver?",
              explain:
                "Transitions are signposts. They tell the reader whether the next idea adds to, illustrates, contrasts with or results from the one before.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Transition hunt",
          brief: "Find transitions in real writing, then use them in your own.",
          steps: [
            "Pick a page from a book, a magazine article or a set of instructions.",
            "Circle every transition you find.",
            "Next to each one, write its job: adds, example, contrast, result or order.",
            "Write a paragraph about how you spend a Saturday. Use transitions of at least three different kinds.",
            "Read it to someone at home twice, once without the transitions and once with them. Ask which was easier to follow.",
          ],
        },
      ],
    },
    {
      id: "closing-revising",
      title: "Closing and revising",
      summary: "End with a sentence that brings the reader back to the point, then revise the whole paragraph with a checklist.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "The concluding sentence",
          blocks: [
            { type: "text", text: "A concluding sentence brings the reader back to the main idea and leaves them with the point." },
            {
              type: "points",
              items: [
                "Restate the main idea in new words, or say why it matters.",
                "Don't copy the topic sentence word for word.",
                "Don't add a new idea at the end. A new idea needs its own paragraph.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Three endings",
          blocks: [
            { type: "text", text: "Topic sentence: “Our town's library is much more than a place to borrow books.”" },
            {
              type: "points",
              items: [
                "Copies: “Our town's library is much more than a place to borrow books.”",
                "Adds a new idea: “Also, the town should build a new pool.”",
                "Brings it home: “For many families, the library is the most useful building in town.”",
              ],
            },
            { type: "text", text: "The last one restates the point in new words and says why it matters." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Revise, then edit",
          blocks: [
            {
              type: "text",
              text: "Revising means improving what you say and how it's organized. Editing means fixing spelling, punctuation and grammar. Revise first: there's no point polishing a sentence you're about to cut.",
            },
            {
              type: "points",
              items: [
                "Does the first sentence state one focused main idea?",
                "Does every other sentence support it?",
                "Does each detail have an explanation where a reader might ask “so what?”",
                "Do transitions show how the ideas connect?",
                "Does the last sentence bring the reader back to the point?",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "slide",
          title: "Watch a paragraph improve",
          blocks: [
            { type: "text", text: "First draft: “Recess. Recess is good and we play tag. My friend has a new jacket. It should be longer. That's all.”" },
            {
              type: "text",
              text: "Revised: “Our school should make recess ten minutes longer. Right now, recess lasts 15 minutes, and about five of them go to lining up and walking outside. A longer break would give students time to actually play. In addition, many students say they focus better after a chance to run around. Ten more minutes outside could mean a better afternoon inside.”",
            },
            {
              type: "text",
              text: "The revision has a focused topic sentence, details with explanations, a transition and a real ending. The jacket is gone.",
            },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Strong ending or weak?",
          prompt: "Topic sentence: “Doing chores taught me to manage my time.” Sort each possible concluding sentence.",
          widget: {
            kind: "sorter",
            categories: ["Strong ending", "Weak ending"],
            items: [
              { id: "copy", text: "Doing chores taught me to manage my time.", answer: 1 },
              { id: "plan", text: "Because of a few weekly jobs, I now plan my afternoons instead of losing them.", answer: 0 },
              { id: "snake", text: "Also, I really want a pet snake.", answer: 1 },
              { id: "all", text: "That's all I have to say about chores.", answer: 1 },
              { id: "skill", text: "Those chores gave me a skill I'll use every busy week from now on.", answer: 0 },
              { id: "fit", text: "Fitting chores around homework made me better at planning everything else.", answer: 0 },
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
              prompt: "What should a concluding sentence do?",
              choices: [
                "Introduce a new topic for the next paragraph",
                "Bring the reader back to the main idea",
                "List every detail again in the same order",
                "Repeat the topic sentence word for word",
              ],
              answer: 1,
              hint: "Think of the last thing you want the reader to remember.",
              explain:
                "A concluding sentence restates the main idea in new words or says why it matters. A new topic, a copied sentence or a list of every detail doesn't do that.",
            },
            {
              id: "q2",
              prompt: "Which change is revising rather than editing?",
              choices: [
                "Adding a missing comma after a transition",
                "Fixing a misspelled word in the second sentence",
                "Cutting a sentence that wanders off topic",
                "Capitalizing the name of a city",
              ],
              answer: 2,
              hint: "Revising changes what you say or how it's organized. Editing fixes the surface.",
              explain: "Cutting an off-topic sentence changes the paragraph's content, so it's revising. Spelling, commas and capital letters are editing.",
            },
            {
              id: "q3",
              prompt: "Topic sentence: “Our park needs more shade.” Which is the strongest concluding sentence?",
              choices: [
                "More trees would make the park a place families can use all summer.",
                "The park also has a basketball court, and both of its hoops need new nets.",
                "Our park needs more shade.",
              ],
              answer: 0,
              hint: "Look for one that restates the point in new words without starting a new topic.",
              explain:
                "The sentence about trees restates the need for shade in new words and shows why it matters. The short one copies the topic sentence, and the basketball sentence starts a new topic.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Write it, then revise it",
          brief: "Write one complete paragraph, then revise it with this lesson's checklist.",
          steps: [
            "Choose something you'd like to change at home or at school.",
            "Write a topic sentence that names the change and makes a point.",
            "Add three supporting details, and explain the ones that need it.",
            "Connect your ideas with at least two different kinds of transitions.",
            "End with a concluding sentence that restates your point in new words.",
            "Run the checklist. Make at least two revisions, then read both versions to someone at home.",
          ],
        },
      ],
    },
  ],
};

export default paragraph;
