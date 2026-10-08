import type { CatalogueEntry } from "./types";

// Every string here can be read aloud, and the voice reads letters by their names ("c" is "see").
// So no line names a lone letter or a word part: sounds are named by a keyword ("the first sound in
// sock") or heard in a whole word said slowly.
const shortWords: CatalogueEntry = {
  id: "english-short-words",
  title: "Sound it out",
  summary: "Phonics: blend letter sounds into cat, sun and pig. Then listen for short vowels.",
  subject: "english",
  grade: "1",
  locale: "en",
  lessons: [
    {
      id: "sound-it-out",
      title: "Letters and sounds",
      summary: "Say the sound of each letter. Then blend the sounds.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Letters stand for sounds",
          blocks: [
            { type: "text", text: "In words like cat, each letter stands for one sound." },
            { type: "text", text: "Say cat very slowly. Can you hear three sounds?" },
            {
              type: "visual",
              visual: { kind: "dots", groups: [1, 1, 1] },
              alt: "Three dots in a row. One for each sound in cat.",
            },
            { type: "text", text: "Touch a dot for each sound as you say it." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Blend the sounds",
          blocks: [
            { type: "text", text: "Say cat slowly, one sound at a time." },
            { type: "text", text: "Now say the sounds faster and faster. You hear cat." },
            { type: "points", items: ["Say each sound.", "Slide the sounds together.", "Listen for a word you know."] },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Like cat or like top?",
          prompt: "Read each word. Is the middle sound like cat or like top?",
          widget: {
            kind: "sorter",
            categories: ["Middle sound like cat", "Middle sound like top"],
            items: [
              { id: "hat", text: "hat", answer: 0 },
              { id: "mop", text: "mop", answer: 1 },
              { id: "pan", text: "pan", answer: 0 },
              { id: "hot", text: "hot", answer: 1 },
              { id: "bag", text: "bag", answer: 0 },
              { id: "fox", text: "fox", answer: 1 },
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
              prompt: "Blend the first sounds of sock, up and nut. What word is it?",
              choices: ["sit", "sun", "nut"],
              answer: 1,
              hint: "Say the first sound of each word. Then say them fast.",
              explain: "Sock, up and nut start with the sounds in sun.",
            },
            {
              id: "q2",
              prompt: "Which word names a farm animal that says oink?",
              choices: ["big", "peg", "pig"],
              answer: 2,
              hint: "Read each word. Check the first and middle letters.",
              explain: "A pig says oink. Big starts like ball. Peg has the middle sound of egg.",
            },
            {
              id: "q3",
              prompt: "How many sounds are in dog?",
              choices: ["2", "3", "4"],
              answer: 1,
              hint: "Say dog very slowly. Touch a dot for each sound.",
              explain: "Dog has three sounds, one for each letter.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Sound dots at home",
          brief: "Use sound dots to read short words.",
          steps: [
            "Write cat, dog and sun on paper.",
            "Draw a dot under each letter.",
            "Touch each dot and say its sound.",
            "Slide your finger under the word. Say it fast.",
            "Read your words to someone at home.",
          ],
        },
      ],
    },
    {
      id: "short-vowels",
      title: "The middle sound",
      summary: "Many short words have a vowel in the middle.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Vowels in the middle",
          blocks: [
            { type: "text", text: "Some letters are called vowels." },
            { type: "text", text: "Each word below starts with a vowel." },
            { type: "points", items: ["apple", "egg", "igloo", "octopus", "up"] },
            { type: "text", text: "Say each word. Its first sound is a short vowel sound." },
            { type: "text", text: "Many short words have a vowel in the middle." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "One letter, a new word",
          blocks: [
            { type: "text", text: "Read these: bag, beg, big, bug." },
            { type: "text", text: "Only the middle letter changes. Each one is a new word." },
            { type: "text", text: "So look closely at the middle when you read." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Sort by the middle sound",
          prompt: "Read each word. Which vowel sound is in the middle?",
          widget: {
            kind: "sorter",
            categories: ["The apple sound", "The igloo sound", "The up sound"],
            items: [
              { id: "cap", text: "cap", answer: 0 },
              { id: "sit", text: "sit", answer: 1 },
              { id: "cup", text: "cup", answer: 2 },
              { id: "map", text: "map", answer: 0 },
              { id: "pig", text: "pig", answer: 1 },
              { id: "bus", text: "bus", answer: 2 },
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
              prompt: "Say hat. Swap its middle sound for the start of octopus. What word do you get?",
              choices: ["hot", "hit", "hut"],
              answer: 0,
              hint: "Keep the first and last sounds. Change only the middle.",
              explain: "Hat with the octopus sound in the middle makes hot.",
            },
            {
              id: "q2",
              prompt: "Which word has the egg sound in the middle?",
              choices: ["bad", "bud", "bed"],
              answer: 2,
              hint: "Say each word slowly. Listen to the middle.",
              explain: "Bed has the egg sound. Bad has the apple sound. Bud has the up sound.",
            },
            {
              id: "q3",
              prompt: "Sam reads pin as pan. Which letter did he misread?",
              choices: ["The first letter", "The middle letter", "The last letter"],
              answer: 1,
              hint: "Look at pin and pan. Which letter is different?",
              explain: "Pin and pan differ only in the middle. Pin has the igloo sound. Pan has the apple sound.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Vowel switch",
          brief: "Make new words by changing the middle letter.",
          steps: [
            "Write bag on a strip of paper.",
            "Look at apple, egg, igloo, octopus and up. Write each first letter on a small slip. These five letters are the vowels.",
            "Put a slip over the middle letter. Read the new word.",
            "Try every vowel. You can make beg, big, bog and bug.",
            "A bog is a wet, muddy place. Did you know that word?",
            "Pick one word. Say a sentence with it.",
          ],
        },
      ],
    },
    {
      id: "word-families",
      title: "Word families",
      summary: "Words in a family share an end. Read one, read many.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Same end, new start",
          blocks: [
            { type: "text", text: "Some words share the same end. They make a word family." },
            { type: "text", text: "Cat, hat, mat and sat all end the same way." },
            { type: "text", text: "If you can read cat, you can read hat." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Swap the first sound",
          blocks: [
            { type: "text", text: "Start with top." },
            { type: "text", text: "Swap the first sound for the start of moon. Now it says mop." },
            { type: "text", text: "Swap again for the start of hat: hop." },
            { type: "points", items: ["Keep the end the same.", "Change the first sound.", "Read the new word."] },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Which family?",
          prompt: "Read each word. Which word does it end like?",
          widget: {
            kind: "sorter",
            categories: ["Ends like cat", "Ends like pig", "Ends like top"],
            items: [
              { id: "mat", text: "mat", answer: 0 },
              { id: "dig", text: "dig", answer: 1 },
              { id: "hop", text: "hop", answer: 2 },
              { id: "bat", text: "bat", answer: 0 },
              { id: "wig", text: "wig", answer: 1 },
              { id: "pop", text: "pop", answer: 2 },
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
              prompt: "Which word is in the same family as sun?",
              choices: ["run", "sit", "sad"],
              answer: 0,
              hint: "Say sun. Listen to how it ends.",
              explain: "Run and sun end the same way. They are in one family.",
            },
            {
              id: "q2",
              prompt: "Start with pig. Swap the first sound for the start of web. What word is it?",
              choices: ["wag", "wig", "win"],
              answer: 1,
              hint: "Keep the end of pig. Put the new sound first.",
              explain: "Web's first sound and pig's end make wig.",
            },
            {
              id: "q3",
              prompt: "Which word does not belong: hop, mop, top, map?",
              choices: ["hop", "mop", "top", "map"],
              answer: 3,
              hint: "Look at the last two letters of each word.",
              explain: "Hop, mop and top end the same way. Map ends like cap.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Word family strip",
          brief: "Make one word family into many words.",
          steps: [
            "Write at on the right side of a card.",
            "Write the first letter of cat on a slip.",
            "Do the same for hat, mat, sat and bat.",
            "Put each slip in front of at. Read each word you make.",
            "Try again with the end of bug: hug, mug, rug.",
          ],
        },
      ],
    },
    {
      id: "read-sentences",
      title: "Read a short sentence",
      summary: "Read short words together to make sentences.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Short words make sentences",
          blocks: [
            { type: "text", text: "Now read short words together." },
            { type: "text", text: "The cat is on the mat." },
            { type: "text", text: "Some words, like the and is, you know by sight." },
            {
              type: "points",
              items: ["Read each word.", "Sound out a word you do not know.", "Read the whole sentence again, smoothly."],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Read: Ben and the bug",
          blocks: [
            { type: "text", text: "Ben has a big bug." },
            { type: "text", text: "The bug is in a box." },
            { type: "text", text: "Ben lets the bug go." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "In the story or not?",
          prompt: "Read each sentence. Does Ben's story say it?",
          widget: {
            kind: "sorter",
            categories: ["In the story", "Not in the story"],
            items: [
              { id: "big-bug", text: "Ben has a big bug.", answer: 0 },
              { id: "cup", text: "The bug is in a cup.", answer: 1 },
              { id: "go", text: "Ben lets the bug go.", answer: 0 },
              { id: "hat", text: "Ben has a red hat.", answer: 1 },
              { id: "box", text: "The bug is in a box.", answer: 0 },
              { id: "log", text: "The bug sits on a log.", answer: 1 },
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
              prompt: "Read: The pig can dig. What can the pig do?",
              choices: ["sit", "run", "dig"],
              answer: 2,
              hint: "Find the word after can.",
              explain: "The sentence says the pig can dig.",
            },
            {
              id: "q2",
              prompt: "Read: Meg has a wet dog. What is wet?",
              choices: ["the dog", "Meg", "the hat"],
              answer: 0,
              hint: "Find the word wet. What word comes right after it?",
              explain: "Wet comes right before dog. The dog is wet.",
            },
            {
              id: "q3",
              prompt: "A pet that says meow sits on a small rug. Which sentence tells this?",
              choices: ["The cat is on a map.", "The bat is on a mat.", "The cat is on a mat."],
              answer: 2,
              hint: "Check every word. Look at the first and last letters.",
              explain: "A cat says meow. A mat is a small rug. Map ends like cap. Bat starts like ball.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Build a sentence",
          brief: "Make sentences from word cards.",
          steps: [
            "Get eight small cards. Write one word on each.",
            "The words: the, a, cat, dog, sat, ran, on, mat.",
            "Line up cards to make a sentence.",
            "Read it out loud. Does it make sense?",
            "Swap one card. Read your new sentence.",
          ],
        },
      ],
    },
  ],
};

/** Practice on the skill map that fits each lesson (lesson id → skill ids). Not linked from the lesson screen yet. */
export const practice: Record<string, string[]> = {
  "sound-it-out": ["e.blend.onset", "e.segment.sounds", "e.cvc.words"],
  "short-vowels": ["e.short.vowels", "e.middle.vowel"],
  "word-families": ["e.word.families", "e.rhyme"],
  "read-sentences": ["e.cvc.words", "e.sight.words"],
};

export default shortWords;
