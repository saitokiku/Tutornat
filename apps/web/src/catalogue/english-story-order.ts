import type { CatalogueEntry } from "./types";

const storyOrder: CatalogueEntry = {
  id: "english-story-order",
  title: "First, next, last",
  summary: "Tell what happens first, next and last in a story.",
  subject: "english",
  grade: "K",
  locale: "en",
  lessons: [
    {
      id: "first-next-last",
      title: "First, next, last",
      summary: "Put the parts of a tiny story in order.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Stories go in order",
          blocks: [
            { type: "text", text: "Stories happen in order. One thing comes after another." },
            { type: "points", items: ["First is the start.", "Next is the middle.", "Last is the end."] },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Ana's seed",
          blocks: [
            { type: "text", text: "First, Ana puts a seed in the dirt." },
            { type: "text", text: "Next, she waters it every day." },
            { type: "text", text: "Last, a little green plant pops up." },
            { type: "text", text: "Could the plant pop up first? No. It needs a seed and water." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Put Ana's story in order",
          prompt: "Put each part of Ana's story in First, Next or Last.",
          widget: {
            kind: "sorter",
            categories: ["First", "Next", "Last"],
            items: [
              { id: "plant", text: "A little plant pops up.", answer: 2 },
              { id: "seed", text: "Ana puts a seed in the dirt.", answer: 0 },
              { id: "water", text: "Ana waters the seed.", answer: 1 },
            ],
          },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Sam's snack",
          prompt: "Sam makes a jam sandwich. What happens first, next and last?",
          widget: {
            kind: "sorter",
            categories: ["First", "Next", "Last"],
            items: [
              { id: "eat", text: "Sam eats the sandwich.", answer: 2 },
              { id: "bread", text: "Sam gets two slices of bread.", answer: 0 },
              { id: "jam", text: "Sam spreads jam on the bread.", answer: 1 },
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
              prompt: "In Ana's story, what happened first?",
              choices: ["Ana watered the seed.", "Ana put a seed in the dirt.", "A plant popped up."],
              answer: 1,
              hint: "What does Ana need before she can water anything?",
              explain: "First, Ana put the seed in the dirt. Next, she watered it. Last, the plant came up.",
            },
            {
              id: "q2",
              prompt: "Lily puts on her socks. What does she do next?",
              choices: ["She puts on her shoes.", "She wakes up."],
              answer: 0,
              hint: "Think about getting dressed. What goes on after socks?",
              explain: "Lily woke up before she got dressed. Socks go on, then shoes go on next.",
            },
            {
              id: "q3",
              prompt: "Which word tells about the end of a story?",
              choices: ["First", "Next", "Last"],
              answer: 2,
              hint: "Think of a line of kids. What do we call the one at the very end?",
              explain: "Last tells the end. First is the start. Next is the middle.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Tell your day in order",
          brief: "Tell about something you did today, in order.",
          steps: [
            "Pick one thing you did today, like brushing your teeth.",
            "Hold up one finger. Say what you did first.",
            "Hold up two fingers. Say what you did next.",
            "Hold up three fingers. Say what you did last.",
            "Draw three boxes. Draw one part of your story in each box.",
          ],
        },
      ],
    },
    {
      id: "beginning-middle-end",
      title: "Beginning, middle, end",
      summary: "Use the words beginning, middle and end to talk about a story.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Three parts of a story",
          blocks: [
            { type: "text", text: "Every story has a beginning, a middle and an end." },
            {
              type: "points",
              items: [
                "Beginning: how the story starts. It comes first.",
                "Middle: what happens next.",
                "End: how the story finishes. It comes last.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Leo's mitten",
          blocks: [
            { type: "text", text: "At the beginning, Leo loses his red mitten in the snow." },
            { type: "text", text: "In the middle, he looks by the slide. He looks under a tree." },
            { type: "text", text: "At the end, his dog runs up with the mitten." },
            { type: "text", text: "Now Leo's hand is warm again." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Leo's story in three parts",
          prompt: "Put each part of Leo's story in Beginning, Middle or End.",
          widget: {
            kind: "sorter",
            categories: ["Beginning", "Middle", "End"],
            items: [
              { id: "dog", text: "His dog runs up with the mitten.", answer: 2 },
              { id: "lose", text: "Leo loses his mitten in the snow.", answer: 0 },
              { id: "look", text: "Leo looks under a tree.", answer: 1 },
            ],
          },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Rosa's tower",
          prompt: "Rosa builds a tower. Which part is the beginning, middle and end?",
          widget: {
            kind: "sorter",
            categories: ["Beginning", "Middle", "End"],
            items: [
              { id: "again", text: "Rosa builds it again, wider at the bottom.", answer: 2 },
              { id: "stack", text: "Rosa stacks blocks into a tall tower.", answer: 0 },
              { id: "fall", text: "The tower wobbles and falls down.", answer: 1 },
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
              prompt: "In Leo's story, what happens at the end?",
              choices: ["Leo loses his mitten.", "Leo looks under a tree.", "His dog brings the mitten back."],
              answer: 2,
              hint: "The end is the last part. Is the mitten still lost?",
              explain: "At the end, the dog brings the mitten back. Leo's problem is fixed.",
            },
            {
              id: "q2",
              prompt: "Which word tells how a story starts?",
              choices: ["Beginning", "Middle", "End"],
              answer: 0,
              hint: "Think of the first page of a book.",
              explain: "The beginning is how a story starts. To begin means to start.",
            },
            {
              id: "q3",
              prompt: "Kim gets a box. She paints it blue. Her cat naps in it. What happens in the middle?",
              choices: ["Kim gets a box.", "Kim paints the box blue.", "The cat naps in the box."],
              answer: 1,
              hint: "The middle comes after the start and before the end.",
              explain: "First, Kim gets the box. In the middle, she paints it blue.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "A story in three parts",
          brief: "Draw a story you know in three parts.",
          steps: [
            "Fold a sheet of paper into three parts.",
            "Pick a story you know well, like a favorite book.",
            "Draw the beginning in the first part.",
            "Draw the middle in the next part. Draw the end in the last part.",
            "Point to each part as you tell the story.",
          ],
        },
      ],
    },
    {
      id: "tell-it-back",
      title: "Tell it back",
      summary: "Listen to a short story. Then tell it back in order.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Tell it back",
          blocks: [
            { type: "text", text: "To tell a story back, say it in your own words." },
            { type: "points", items: ["Tell the parts in order.", "Use words like first, next and last.", "Tell the big parts. Skip the tiny ones."] },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Listen: Max and the puddle",
          blocks: [
            { type: "text", text: "Listen to each part. Then try to tell it back." },
            { type: "text", text: "It rains all morning. Max puts on his yellow boots." },
            { type: "text", text: "He jumps in a big puddle. Mud splashes all over his pants." },
            { type: "text", text: "Max goes home. Dad helps him wash off the mud." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Put the puddle story in order",
          prompt: "Put each part of the puddle story in First, Next or Last.",
          widget: {
            kind: "sorter",
            categories: ["First", "Next", "Last"],
            items: [
              { id: "jump", text: "Max jumps in a big puddle.", answer: 1 },
              { id: "boots", text: "Max puts on his yellow boots.", answer: 0 },
              { id: "wash", text: "Dad helps Max wash off the mud.", answer: 2 },
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
              prompt: "In the puddle story, what does Max do first?",
              choices: ["He jumps in a puddle.", "He puts on his boots.", "He washes off the mud."],
              answer: 1,
              hint: "What does Max need before he goes out in the rain?",
              explain: "First, Max puts on his boots. Then he jumps, and last he washes off the mud.",
            },
            {
              id: "q2",
              prompt: "Which one tells the story back in order?",
              choices: ["Max puts on boots, jumps in a puddle, then washes off.", "Max washes off, puts on boots, then jumps in a puddle."],
              answer: 0,
              hint: "Which one starts with what Max did first?",
              explain: "Boots come first, then the jump, then washing off. That is the order of the story.",
            },
            {
              id: "q3",
              prompt: "Tia tells it back: “Max puts on boots. Then Dad washes off the mud.” What did Tia leave out?",
              choices: ["Max eats lunch.", "Dad reads a book.", "Max jumps in a puddle."],
              answer: 2,
              hint: "What did Max do between the boots and the washing?",
              explain: "Tia left out the middle. Max jumps in a puddle and gets muddy.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Tell a story back at home",
          brief: "Listen to a story. Then tell it back in your own words.",
          steps: [
            "Ask a grown-up to read you a short story.",
            "Listen for what happens first, next and last.",
            "Close the book. Tell the story back in your own words.",
            "Hold up one finger for each part you tell.",
            "Look at the book together. Did you tell it in order?",
          ],
        },
      ],
    },
    {
      id: "my-story",
      title: "Make your own story",
      summary: "Plan a story with a first, next and last part.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Plan your story",
          blocks: [
            { type: "text", text: "Before you tell a story, make a plan with three parts." },
            {
              type: "points",
              items: ["First: who is in the story? Where are they?", "Next: what happens? Maybe there is a problem.", "Last: how does it end?"],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "A story plan: Nia's kite",
          blocks: [
            { type: "text", text: "First: Nia flies her new kite at the park." },
            { type: "text", text: "Next: The wind blows her kite into a tall tree." },
            { type: "text", text: "Last: Her big brother gets it down with a long stick." },
            { type: "text", text: "The plan has a who, a problem and an ending." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Plan Ben's story",
          prompt: "Here are three parts of Ben's story. Put them in First, Next or Last.",
          widget: {
            kind: "sorter",
            categories: ["First", "Next", "Last"],
            items: [
              { id: "shade", text: "Ben builds a new snowman in the shade.", answer: 2 },
              { id: "build", text: "Ben builds a snowman in his yard.", answer: 0 },
              { id: "melt", text: "The sun comes out. The snowman starts to melt.", answer: 1 },
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
              prompt: "Which is the best first part for a story?",
              choices: ["Then they all went home.", "So the problem was fixed.", "Pip the puppy lived on a busy farm."],
              answer: 2,
              hint: "A first part tells who the story is about.",
              explain: "“Pip the puppy lived on a busy farm” tells who and where. The other two sound like endings.",
            },
            {
              id: "q2",
              prompt: "First, Jo's tooth is loose. Next, she bites an apple. What is a good last part?",
              choices: ["Jo's tooth is loose.", "The tooth comes out, and Jo smiles.", "Jo wakes up in the morning."],
              answer: 1,
              hint: "The last part finishes the story. What could happen after the bite?",
              explain: "The tooth coming out finishes the story. The other two would come earlier.",
            },
            {
              id: "q3",
              prompt: "Why does a story need a last part?",
              choices: ["To tell how it ends", "To tell who is in it"],
              answer: 0,
              hint: "When a story is almost over, what do you want to know?",
              explain: "The last part tells how things turn out. Without it, the story just stops.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Make a little story book",
          brief: "Plan and draw your own story with three parts.",
          steps: [
            "Pick a toy to be the star of your story.",
            "Say the first part: who is it, and where?",
            "Say the next part: what happens to your toy?",
            "Say the last part: how does it end?",
            "Draw each part on its own page. Read your book to someone.",
          ],
        },
      ],
    },
  ],
};

export default storyOrder;
