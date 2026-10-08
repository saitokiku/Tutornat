import type { CatalogueEntry } from "./types";

const partsOfSpeech: CatalogueEntry = {
  id: "english-parts-of-speech",
  title: "Nouns, verbs and adjectives",
  summary: "Nouns name. Verbs show action. Adjectives describe.",
  subject: "english",
  grade: "2",
  locale: "en",
  lessons: [
    {
      id: "nouns",
      title: "Nouns name things",
      summary: "A noun names a person, place or thing.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "What is a noun?",
          blocks: [
            { type: "text", text: "A noun names a person, place or thing." },
            {
              type: "points",
              items: [
                "Person: teacher, mom, baby",
                "Place: park, school, kitchen",
                "Thing: ball, apple, chair",
                "Animals are nouns too: dog, frog, bee.",
              ],
            },
            { type: "text", text: "Names of people and places are nouns, too." },
            { type: "text", text: "They start with a capital letter: Ana, Texas." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "The “the” test",
          blocks: [
            { type: "text", text: "Put the in front of a word." },
            { type: "text", text: "“The park” makes sense. Park is a noun." },
            { type: "text", text: "“The happy” does not make sense. Happy is not a noun." },
            { type: "points", items: ["This test works for most nouns.", "Names like Ana skip the. They are still nouns."] },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Person, place or thing?",
          prompt: "Sort each noun. Is it a person, a place or a thing?",
          widget: {
            kind: "sorter",
            categories: ["Person", "Place", "Thing"],
            items: [
              { id: "doctor", text: "doctor", answer: 0 },
              { id: "kitchen", text: "kitchen", answer: 1 },
              { id: "pencil", text: "pencil", answer: 2 },
              { id: "baby", text: "baby", answer: 0 },
              { id: "beach", text: "beach", answer: 1 },
              { id: "spoon", text: "spoon", answer: 2 },
            ],
          },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Noun or not?",
          prompt: "Put the in front of each word. Is it a noun?",
          widget: {
            kind: "sorter",
            categories: ["Noun", "Not a noun"],
            items: [
              { id: "river", text: "river", answer: 0 },
              { id: "sing", text: "sing", answer: 1 },
              { id: "teacher", text: "teacher", answer: 0 },
              { id: "soft", text: "soft", answer: 1 },
              { id: "garden", text: "garden", answer: 0 },
              { id: "quickly", text: "quickly", answer: 1 },
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
              prompt: "Which word is a noun?",
              choices: ["eat", "lamp", "tall"],
              answer: 1,
              hint: "Put the in front of each word.",
              explain: "“The lamp” makes sense. A lamp is a thing, so lamp is a noun.",
            },
            {
              id: "q2",
              prompt: "Mia swims at the pool. Which word names a place?",
              choices: ["Mia", "swims", "pool"],
              answer: 2,
              hint: "A place is somewhere you can go.",
              explain: "The pool is a place. Mia is a person. Swims is what she does.",
            },
            {
              id: "q3",
              prompt: "Rosa says happy is not a noun. Is she right?",
              choices: ["Yes", "No"],
              answer: 0,
              hint: "Does happy name a person, place or thing?",
              explain: "Rosa is right. Happy tells how someone feels. It does not name a person, place or thing.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Noun hunt",
          brief: "Hunt for nouns around your home.",
          steps: [
            "Fold a sheet of paper into three columns.",
            "Label them: person, place, thing.",
            "Walk around your home. Write or draw nouns you find.",
            "Find at least three for each column.",
            "Read your list to someone. Do they agree?",
          ],
        },
      ],
    },
    {
      id: "verbs",
      title: "Verbs show action",
      summary: "A verb tells what someone or something does.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "What is a verb?",
          blocks: [
            { type: "text", text: "A verb tells what someone or something does." },
            { type: "points", items: ["The dog runs.", "Birds sing.", "Mom reads."] },
            { type: "text", text: "Runs, sing and reads are verbs. Most verbs are action words." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Find the verb",
          blocks: [
            { type: "text", text: "First, find who the sentence is about." },
            { type: "text", text: "Then ask: what do they do?" },
            { type: "text", text: "The frog jumps into the pond. What does the frog do?" },
            { type: "text", text: "It jumps. Jumps is the verb." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Noun or verb?",
          prompt: "Sort each word. Is it a noun or a verb?",
          widget: {
            kind: "sorter",
            categories: ["Noun", "Verb"],
            items: [
              { id: "eat", text: "eat", answer: 1 },
              { id: "apple", text: "apple", answer: 0 },
              { id: "write", text: "write", answer: 1 },
              { id: "kitten", text: "kitten", answer: 0 },
              { id: "bring", text: "bring", answer: 1 },
              { id: "window", text: "window", answer: 0 },
            ],
          },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Words from two sentences",
          prompt: "Read: Dad cooks eggs. The frog jumps into the pond. Sort these words.",
          widget: {
            kind: "sorter",
            categories: ["Noun", "Verb"],
            items: [
              { id: "dad", text: "Dad", answer: 0 },
              { id: "cooks", text: "cooks", answer: 1 },
              { id: "eggs", text: "eggs", answer: 0 },
              { id: "frog", text: "frog", answer: 0 },
              { id: "jumps", text: "jumps", answer: 1 },
              { id: "pond", text: "pond", answer: 0 },
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
              prompt: "The baby sleeps in her crib. Which word is the verb?",
              choices: ["baby", "crib", "sleeps"],
              answer: 2,
              hint: "Who is the sentence about? What does the baby do?",
              explain: "Sleeps tells what the baby does. So sleeps is the verb.",
            },
            {
              id: "q2",
              prompt: "Which word is a verb?",
              choices: ["write", "banana", "soft"],
              answer: 0,
              hint: "Try each word after “I can.”",
              explain: "“I can write” makes sense. Write is something you do.",
            },
            {
              id: "q3",
              prompt: "Leo says kitten is a verb. Is he right?",
              choices: ["Yes", "No"],
              answer: 1,
              hint: "Try “I can kitten.” Does it make sense?",
              explain: "“I can kitten” makes no sense. Kitten names an animal, so it is a noun.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Verb charades",
          brief: "Act out verbs and guess them.",
          steps: [
            "Write five verbs on slips: hop, swim, eat, sleep, read.",
            "Mix up the slips. Pick one.",
            "Act out the verb. Do not talk.",
            "Your family guesses the verb.",
            "Take turns. Add new verbs as you play.",
          ],
        },
      ],
    },
    {
      id: "adjectives",
      title: "Adjectives describe",
      summary: "An adjective tells more about a noun.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "What is an adjective?",
          blocks: [
            { type: "text", text: "An adjective describes a noun." },
            {
              type: "points",
              items: ["What kind: a soft blanket", "What color: a red ball", "What size: a tiny bug", "How many: three cats"],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Find the noun first",
          blocks: [
            { type: "text", text: "Read: The tiny bird sang." },
            { type: "text", text: "Bird is the noun. Tiny tells what the bird is like." },
            { type: "text", text: "So tiny is the adjective." },
            { type: "text", text: "An adjective can come after the noun, too." },
            { type: "text", text: "The soup is hot. Hot describes the soup." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Noun, verb or adjective?",
          prompt: "Read: The hungry dog eats a big bone. Sort each word.",
          widget: {
            kind: "sorter",
            categories: ["Noun", "Verb", "Adjective"],
            items: [
              { id: "hungry", text: "hungry", answer: 2 },
              { id: "dog", text: "dog", answer: 0 },
              { id: "eats", text: "eats", answer: 1 },
              { id: "big", text: "big", answer: 2 },
              { id: "bone", text: "bone", answer: 0 },
            ],
          },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Color, size or feel?",
          prompt: "Each word is an adjective. What does it tell about?",
          widget: {
            kind: "sorter",
            categories: ["Color", "Size", "How it feels"],
            items: [
              { id: "red", text: "red", answer: 0 },
              { id: "tiny", text: "tiny", answer: 1 },
              { id: "soft", text: "soft", answer: 2 },
              { id: "green", text: "green", answer: 0 },
              { id: "huge", text: "huge", answer: 1 },
              { id: "bumpy", text: "bumpy", answer: 2 },
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
              prompt: "We ate a juicy peach. Which word is the adjective?",
              choices: ["juicy", "ate", "peach"],
              answer: 0,
              hint: "Find the noun first. Then find the word that tells about it.",
              explain: "Peach is the noun. Juicy tells what the peach is like.",
            },
            {
              id: "q2",
              prompt: "Which adjective tells a color?",
              choices: ["loud", "tall", "purple"],
              answer: 2,
              hint: "Which word could you find in a box of crayons?",
              explain: "Purple is a color. Loud tells about sound. Tall tells about size.",
            },
            {
              id: "q3",
              prompt: "The library is quiet. Which word describes the library?",
              choices: ["library", "quiet", "is"],
              answer: 1,
              hint: "What is the library like?",
              explain: "Quiet tells what the library is like. Here the adjective comes after the noun.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Mystery bag",
          brief: "Describe a hidden object with adjectives.",
          steps: [
            "Ask a grown-up to hide an object in a bag.",
            "Feel the object without looking.",
            "Say three adjectives about it, like smooth, cold, round.",
            "Guess what it is. Then look.",
            "Switch. Now you hide something for them.",
          ],
        },
      ],
    },
    {
      id: "sentence-parts",
      title: "All three together",
      summary: "Use nouns, verbs and adjectives to build better sentences.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Who, and what they do",
          blocks: [
            { type: "text", text: "A sentence tells who or what, and what they do." },
            { type: "text", text: "Birds sing. Birds is the noun. Sing is the verb." },
            { type: "points", items: ["Who or what: often a noun.", "What they do: the verb."] },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Add adjectives",
          blocks: [
            { type: "text", text: "Start small: Cats nap." },
            { type: "text", text: "Add an adjective: Fat cats nap." },
            { type: "text", text: "Add one more: Fat, sleepy cats nap." },
            { type: "text", text: "Each adjective helps you picture the cats." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Sort the words",
          prompt: "Read: The small girl kicks a red ball. Sort each word.",
          widget: {
            kind: "sorter",
            categories: ["Noun", "Verb", "Adjective"],
            items: [
              { id: "small", text: "small", answer: 2 },
              { id: "girl", text: "girl", answer: 0 },
              { id: "kicks", text: "kicks", answer: 1 },
              { id: "red", text: "red", answer: 2 },
              { id: "ball", text: "ball", answer: 0 },
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
              prompt: "Which sentence has an adjective?",
              choices: ["Trees sway.", "Tall trees sway.", "Birds sing."],
              answer: 1,
              hint: "Look for a word that describes the trees.",
              explain: "Tall describes the trees. The other two sentences have no adjective.",
            },
            {
              id: "q2",
              prompt: "Two brown horses run fast. Which word is the noun?",
              choices: ["horses", "brown", "run"],
              answer: 0,
              hint: "Ask: what is this sentence about?",
              explain: "Horses is the noun. Brown describes them. Run tells what they do.",
            },
            {
              id: "q3",
              prompt: "The ___ kitten sleeps. Which word fits?",
              choices: ["jumps", "slowly", "fluffy"],
              answer: 2,
              hint: "The missing word should describe the kitten.",
              explain: "Fluffy describes the kitten. Jumps is a verb. Slowly tells how something happens.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Silly sentence game",
          brief: "Build silly sentences from three piles of words.",
          steps: [
            "Make three piles of slips: nouns, verbs, adjectives.",
            "Write five words for each pile.",
            "Pick one adjective, one noun and one verb.",
            "Make a sentence, like: The purple pig sings.",
            "Read your silliest sentence to someone.",
          ],
        },
      ],
    },
  ],
};

/**
 * Practice on the skill map that fits each lesson (lesson id → skill ids). The course page offers them.
 * e.adjectives sits at grade 3 on the map (L.3.1a), but its items are this lesson's kind: find the word that describes.
 */
export const practice: Record<string, string[]> = {
  nouns: ["e.nouns.verbs"],
  verbs: ["e.nouns.verbs"],
  adjectives: ["e.adjectives"],
  "sentence-parts": ["e.nouns.verbs", "e.adjectives"],
};

export default { ...partsOfSpeech, practice } satisfies CatalogueEntry;
