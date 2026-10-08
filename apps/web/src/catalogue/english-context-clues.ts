import type { CatalogueEntry } from "./types";

// Practice skills this course teaches toward: e.context.clues, e.prefixes, e.synonyms, e.root.clues (lesson 4).

const contextClues: CatalogueEntry = {
  id: "english-context-clues",
  title: "Context clues and vocabulary",
  summary: "Work out what an unfamiliar word means from the sentence around it, from the parts it's built from and from the feeling it carries.",
  subject: "english",
  grade: "7",
  locale: "en",
  lessons: [
    {
      id: "direct-clues",
      title: "Clues that say it outright",
      summary: "Many sentences define a hard word for you, or put a word you know right next to it.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Read around the word",
          blocks: [
            {
              type: "text",
              text: "When you meet a word you don't know, you don't always need a dictionary first. The words around it, its context, often tell you what it means.",
            },
            {
              type: "points",
              items: [
                "Definition clue: the sentence explains the word. “A peninsula is land almost surrounded by water.”",
                "Restatement clue: right after the hard word, a phrase explains it in easier words, often after a comma, a dash or “or.”",
                "Synonym clue: one familiar word nearby, often in the next sentence, means nearly the same thing.",
              ],
            },
            {
              type: "text",
              text: "The difference between the last two: a restatement explains the word in a phrase, and a synonym clue gives you a single word you already know.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Signal words",
          blocks: [
            { type: "text", text: "Some words and punctuation marks signal that an explanation is coming." },
            {
              type: "points",
              items: [
                "“is” or “means”: “A biome is a large area with a similar climate, plants and animals.”",
                "“or,” “that is,” “which means”: “By the end of July, the garden was arid, or very dry.”",
                "Commas or dashes around a phrase: “After the flood, the town built a levee, a wall of earth that holds back the river.”",
                "“is called” or “known as”: “The slow wearing away of rock and soil by water, wind or ice is called erosion.”",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Synonym clues",
          blocks: [
            {
              type: "text",
              text: "A synonym clue gives you a word you already know that means about the same thing. Look in the same sentence or the next one.",
            },
            {
              type: "points",
              items: [
                "“The detective was meticulous. She was careful about every tiny detail.” Meticulous means very careful.",
                "“The fans were jubilant; everyone in the stands was joyful after the final whistle.” Jubilant means joyful.",
              ],
            },
            {
              type: "text",
              text: "Then test your guess: put it in place of the hard word. “The detective was very careful.” If the sentence still makes sense, your guess is probably close.",
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Is there a clue?",
          prompt: "Each item starts with a hard word, then a sentence that uses it. Sort them: does the sentence give a clue to the word's meaning?",
          widget: {
            kind: "sorter",
            categories: ["Gives a clue", "No real clue"],
            items: [
              { id: "almanac", text: "almanac: Grandpa gave me his old almanac.", answer: 1 },
              { id: "levee", text: "levee: After the flood, the town built a levee, a wall of earth that holds back the river.", answer: 0 },
              { id: "bland", text: "bland: The soup was bland; it had almost no flavor.", answer: 0 },
              { id: "treatise", text: "treatise: She read the treatise twice.", answer: 1 },
              { id: "gaudy", text: "gaudy: Mom said the sign was gaudy.", answer: 1 },
              {
                id: "photosynthesis",
                text: "photosynthesis: Photosynthesis is the way plants use sunlight, water and carbon dioxide to make their own food.",
                answer: 0,
              },
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
              prompt: "“The hikers reached the summit, the highest point of the mountain, just before noon.” What is a summit?",
              choices: ["A trail that winds through the woods", "A flat place where hikers camp", "A low valley between two hills", "The highest point of a mountain"],
              answer: 3,
              hint: "Look at the words set off by commas right after “summit.”",
              explain: "The phrase between the commas says the word again in easier words: a summit is the highest point of a mountain. That's a restatement clue.",
            },
            {
              id: "q2",
              prompt: "Which words often signal a definition or restatement clue?",
              choices: ["“however,” “but,” “unlike”", "“because,” “so,” “as a result”", "“first,” “next,” “last”", "“that is,” “which means,” “or”"],
              answer: 3,
              hint: "Which words promise to say something again in other words?",
              explain:
                "“That is,” “which means” and “or” introduce another way of saying the same thing. “However” and “unlike” signal a contrast, “because” and “so” signal cause and effect, and “first” and “next” signal order.",
            },
            {
              id: "q3",
              prompt: "“Marisol is frugal. She saves her allowance and almost never buys anything she doesn't need.” What does frugal mean?",
              choices: ["Generous with gifts for friends", "Forgetful about where things are", "Careful about spending money", "Rich enough to buy anything"],
              answer: 2,
              hint: "What does the second sentence show Marisol doing with her money?",
              explain: "The second sentence shows Marisol saving and rarely spending. Frugal means careful about spending money.",
            },
            {
              id: "q4",
              prompt: "You guess that “meticulous” means “very careful.” What's the quickest way to test your guess?",
              choices: [
                "Decide whether the word sounds nice when you say it",
                "Count its letters and compare it with words you know",
                "Skip the sentence and see if the story still makes sense",
                "Put “very careful” in its place and reread the sentence",
              ],
              answer: 3,
              hint: "A good guess should fit where the word was.",
              explain:
                "If “The detective was very careful about every tiny detail” still makes sense, your guess is probably close. When the exact meaning matters, a dictionary confirms it.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Word catcher",
          brief: "Catch unfamiliar words in your own reading and work out what they mean from context.",
          steps: [
            "Read for 20 minutes: a book, a news article or a magazine.",
            "Each time you meet a word you don't know, copy the whole sentence.",
            "Underline any words in the sentence that work as a clue.",
            "Write your guess, then put it in place of the word to test it.",
            "Look up three of the words in a dictionary. How close were your guesses?",
            "Teach one new word to someone at home by using it in a sentence with a clue.",
          ],
        },
      ],
    },
    {
      id: "contrast-example",
      title: "Contrast and example clues",
      summary: "Some clues tell you what a word is not. Others show you examples of it.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Clues that point the other way",
          blocks: [
            {
              type: "text",
              text: "A contrast clue, sometimes called an antonym clue, tells you the word means the opposite of something nearby. Signal words include but, however, unlike, although, instead and on the other hand.",
            },
            { type: "text", text: "“Unlike his gregarious sister, who chats with everyone at parties, Marcus stays quiet around new people.”" },
            {
              type: "text",
              text: "Marcus is quiet, and his sister is unlike him. So gregarious must mean the opposite of quiet: outgoing and fond of company.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Clues that give examples",
          blocks: [
            {
              type: "text",
              text: "An example clue lists things that belong to the word's group. Signal words include such as, for example, including and like.",
            },
            { type: "text", text: "“The market sells many legumes, such as lentils, chickpeas and black beans.”" },
            {
              type: "text",
              text: "Lentils, chickpeas and black beans are all seeds that grow in pods. From the examples, you can guess that legumes are beans, peas and plants like them.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "The signal word decides",
          blocks: [
            { type: "text", text: "One small word can change what a clue tells you." },
            {
              type: "points",
              items: [
                "“The first test was easy, but the second was arduous.” “But” signals a contrast, so arduous means the opposite of easy: hard and tiring.",
                "“The climb was long, steep and arduous.” Here arduous sits in a list with long and steep, so it means something like them: difficult.",
              ],
            },
            { type: "text", text: "Before you guess, find the signal word and ask: is this clue saying same, opposite or example?" },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "What kind of clue?",
          prompt: "Sort each sentence by the kind of clue it gives for its hard word. A restatement explains the word in a phrase; a synonym clue is one word you already know.",
          widget: {
            kind: "sorter",
            categories: ["Definition or restatement", "Synonym", "Contrast", "Example"],
            items: [
              { id: "tedious", text: "Leo found the movie tedious, but his sister thought every minute was exciting.", answer: 2 },
              { id: "cast", text: "The doctor put on a cast, a hard shell that holds a broken bone still while it heals.", answer: 0 },
              { id: "intricate", text: "The puzzle was intricate. Even the box called it complicated, and it took us all weekend.", answer: 1 },
              { id: "citrus", text: "Citrus fruits, such as lemons, limes and oranges, grow well in warm places.", answer: 3 },
              { id: "peninsula", text: "A peninsula is land almost surrounded by water.", answer: 0 },
              { id: "tranquil", text: "Unlike the tranquil lake at dawn, the afternoon water was rough and choppy.", answer: 2 },
              { id: "artifacts", text: "The museum displays artifacts, including clay pots, arrowheads and old coins.", answer: 3 },
              { id: "jubilant", text: "The fans were jubilant. Everyone in the stands was joyful after the final whistle.", answer: 1 },
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
              prompt: "“Although the first hike was easy, the second was grueling, and we stopped to rest every ten minutes.” What does grueling mean?",
              choices: ["Short and easy to finish", "Very hard and tiring", "Flat and smooth all the way", "Crowded with other hikers"],
              answer: 1,
              hint: "“Although” sets up a contrast with “easy.” What else does the sentence tell you?",
              explain: "“Although” signals the opposite of easy, and stopping every ten minutes backs that up. Grueling means very hard and tiring.",
            },
            {
              id: "q2",
              prompt: "Which signal words point to an example clue?",
              choices: ["“such as,” “including”", "“or,” “that is,” “in other words”", "“because,” “so,” “as a result”", "“unlike,” “on the other hand”"],
              answer: 0,
              hint: "Which words introduce a list of things that belong to a group?",
              explain:
                "“Such as” and “including” introduce examples. “Unlike” and “on the other hand” signal a contrast, “or,” “that is” and “in other words” signal a restatement, and “because,” “so” and “as a result” signal cause and effect.",
            },
            {
              id: "q3",
              prompt: "“The store sells all kinds of headwear, such as caps, beanies and sun hats.” What is headwear?",
              choices: ["Shoes made for playing sports", "Things you wear on your head", "Warm jackets for cold weather", "Products for washing your hair"],
              answer: 1,
              hint: "What do caps, beanies and sun hats have in common?",
              explain: "All three examples are worn on the head, so headwear means things you wear on your head. The word's parts, head and wear, agree.",
            },
            {
              id: "q4",
              prompt: "“Unlike her talkative brother, Ana is taciturn.” Which part of the sentence is the clue to taciturn?",
              choices: ["Only the word “unlike”", "None; the sentence never explains it", "“Ana is,” the words just before it", "“Unlike her talkative brother”"],
              answer: 3,
              hint: "Find the signal word, then the word it sets up a contrast with.",
              explain:
                "“Unlike” signals a contrast with “talkative,” so taciturn means the opposite: someone who says very little. The signal word alone isn't enough; you need “talkative” to know what Ana is the opposite of.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Clue writer",
          brief: "Write your own clue sentences and test them on someone at home.",
          steps: [
            "Choose four words you met recently, from this course or from your own reading.",
            "Write one sentence for each, using a different kind of clue each time: definition, synonym, contrast and example.",
            "Circle the signal word in each sentence.",
            "Read the sentences to someone at home without telling them the meanings. Ask them to guess each word.",
            "If they guess wrong, rewrite that sentence with a stronger clue and try again.",
          ],
        },
      ],
    },
    {
      id: "meanings-feelings",
      title: "Which meaning, which feeling",
      summary: "Context tells you which meaning a word has, and the feeling a writer chose it for.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "One word, several meanings",
          blocks: [
            {
              type: "text",
              text: "Many common words have more than one meaning. The sentence around the word tells you which one the writer means.",
            },
            {
              type: "points",
              items: [
                "“The canoe drifted toward the bank.” Here a bank is the land along the side of a river.",
                "“I put my birthday money in the bank.” Here a bank is a business that keeps money.",
                "“The current was too strong for swimming.” Here current means moving water. In “We discussed current events,” it means happening now.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "interactive",
          title: "Which bark?",
          prompt: "Sort each sentence by the meaning of “bark.”",
          widget: {
            kind: "sorter",
            categories: ["The sound a dog makes", "The outer layer of a tree"],
            items: [
              { id: "birch", text: "The bark of the old birch tree peeled off in thin strips.", answer: 1 },
              { id: "neighbor", text: "Our neighbor's dog has a loud bark.", answer: 0 },
              { id: "baby", text: "One sharp bark from the yard woke the baby.", answer: 0 },
              { id: "moss", text: "Moss grew thick on the bark.", answer: 1 },
              { id: "puppy", text: "The puppy's bark sounded more like a squeak.", answer: 0 },
              { id: "fire", text: "Thick bark helps some trees survive forest fires.", answer: 1 },
            ],
          },
        },
        {
          id: "s3",
          kind: "slide",
          title: "Same meaning, different feeling",
          blocks: [
            {
              type: "text",
              text: "Some words share a dictionary meaning but carry different feelings. The dictionary meaning is the denotation. The feeling a word carries is its connotation.",
            },
            {
              type: "points",
              items: [
                "Thrifty and stingy both describe someone careful with money. Thrifty sounds wise; stingy sounds selfish.",
                "Curious and nosy both describe someone who wants to know things. Curious sounds positive; nosy sounds rude.",
                "Confident and arrogant both describe someone sure of themselves. Arrogant adds that they think they're better than others.",
              ],
            },
            {
              type: "text",
              text: "Writers choose words for their connotation. When you read, ask how a word makes you feel about the person or thing it describes.",
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Positive or negative?",
          prompt: "These words come in pairs that mean nearly the same thing. Sort each word by the feeling it usually carries.",
          widget: {
            kind: "sorter",
            categories: ["Positive feeling", "Negative feeling"],
            items: [
              { id: "stingy", text: "stingy", answer: 1 },
              { id: "determined", text: "determined", answer: 0 },
              { id: "curious", text: "curious", answer: 0 },
              { id: "scrawny", text: "scrawny", answer: 1 },
              { id: "thrifty", text: "thrifty", answer: 0 },
              { id: "stubborn", text: "stubborn", answer: 1 },
              { id: "nosy", text: "nosy", answer: 1 },
              { id: "slender", text: "slender", answer: 0 },
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
              prompt: "“The pitcher wound up and threw a fastball.” Which meaning of pitcher fits?",
              choices: ["A jug for pouring water or juice", "The player who throws to batters", "A fan cheering in the stands", "The coach who calls the plays"],
              answer: 1,
              hint: "Who winds up and throws a fastball?",
              explain: "In a baseball sentence, a pitcher is the player who throws the ball to the batter. In a kitchen sentence, a pitcher is a jug. The context picks the meaning.",
            },
            {
              id: "q2",
              prompt: "One review calls a jacket “cheap.” Another calls it “affordable.” What's the difference?",
              choices: [
                "No difference; both words feel exactly the same",
                "“Affordable” means it costs more than a cheap one",
                "They mean opposite things about the price",
                "Same low price, but “cheap” can hint at poor quality",
              ],
              answer: 3,
              hint: "Both words are about price. Which one might make you worry about the jacket?",
              explain: "The denotation is the same: a low price. “Cheap” often carries a negative connotation, that the jacket may be badly made, while “affordable” sounds positive.",
            },
            {
              id: "q3",
              prompt: "A writer wants readers to admire a character who never gives up. Which word fits best?",
              choices: ["stubborn", "determined", "obstinate", "pig-headed"],
              answer: 1,
              hint: "Say each word about a friend. Which one would your friend take as a compliment?",
              explain:
                "All four can describe someone who won't give up or back down, but only “determined” makes readers admire it. “Stubborn,” “obstinate” and “pig-headed” carry negative feelings.",
            },
            {
              id: "q4",
              prompt: "“The old mattress had a broken spring poking through.” What does spring mean here?",
              choices: ["The season after winter", "A sudden jump", "A coil of metal that bounces back", "A place where water comes out of the ground"],
              answer: 2,
              hint: "What could poke through a mattress?",
              explain: "A mattress has metal coils inside, so here a spring is a coil of metal that bounces back. All four choices are real meanings of spring; the mattress decides which one fits.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Word feelings at home",
          brief: "Find out how word choice changes the way people feel about the same thing.",
          steps: [
            "Collect three ads, product reviews or restaurant menus.",
            "Circle words that carry a strong feeling, like “crispy,” “cozy” or “cramped.”",
            "For each circled word, write a plain word with the same dictionary meaning.",
            "Read the original and your plain version to someone at home. Ask which one makes them want the product more.",
            "Write two sentences about your own room using the same facts: one that makes it sound inviting and one that makes it sound unpleasant.",
          ],
        },
      ],
    },
    {
      id: "word-parts",
      title: "Word parts: roots, prefixes and suffixes",
      summary: "Many English words are built from Greek and Latin parts. A few parts unlock many words.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Words are built from parts",
          blocks: [
            {
              type: "text",
              text: "Many English words are built from smaller parts. A root carries the main meaning. A prefix comes before the root and changes its meaning. A suffix comes at the end and often changes the kind of word.",
            },
            {
              type: "points",
              items: [
                "un + predict + able = unpredictable: not able to be predicted.",
                "Predict has parts too: pre (before) + dict (say). To predict is to say what will happen before it does.",
                "Many roots come from Latin and Greek, which is why one root can turn up in dozens of English words.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Roots worth knowing",
          blocks: [
            {
              type: "points",
              items: [
                "port (carry): portable, transport, export",
                "rupt (break): erupt, interrupt, rupture",
                "spect (look): inspect, spectator, spectacles",
                "aud (hear): audience, audible, audition",
                "bio (life): biology, biography",
                "graph (write): autograph, paragraph",
                "chron (time): chronological, chronic",
                "therm (heat): thermometer, thermal",
              ],
            },
            { type: "text", text: "The first four roots come from Latin. The last four come from Greek." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Prefixes and suffixes",
          blocks: [
            {
              type: "points",
              items: [
                "re- (again or back): rewrite, return",
                "pre- (before): preview, prehistoric",
                "mis- (wrongly): misread, misspell",
                "inter- (between): international, interrupt",
                "trans- (across): transport, transatlantic",
                "sub- (under): submarine, subway",
                "-less (without): fearless, careless",
                "-ful (full of): hopeful, colorful",
                "-able or -ible (can be): readable, visible",
                "-ology (the study of): biology, geology",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Match the root",
          prompt: "Sort each word by what its root means.",
          widget: {
            kind: "sorter",
            categories: ["carry (port)", "break (rupt)", "look (spect)", "hear (aud)"],
            items: [
              { id: "erupt", text: "erupt", answer: 1 },
              { id: "portable", text: "portable", answer: 0 },
              { id: "auditorium", text: "auditorium", answer: 3 },
              { id: "inspect", text: "inspect", answer: 2 },
              { id: "audition", text: "audition", answer: 3 },
              { id: "export", text: "export", answer: 0 },
              { id: "spectator", text: "spectator", answer: 2 },
              { id: "rupture", text: "rupture", answer: 1 },
            ],
          },
        },
        {
          id: "s5",
          kind: "slide",
          title: "Parts are clues, not proof",
          blocks: [
            {
              type: "text",
              text: "Word parts point you toward a meaning, but they can mislead. Check your guess against the sentence, and use a dictionary when the exact meaning matters.",
            },
            {
              type: "points",
              items: [
                "Invaluable doesn't mean “not valuable.” It means extremely valuable or useful.",
                "Inflammable doesn't mean “cannot burn.” It means easily set on fire, the same as flammable.",
                "The letters “port” in “portrait” don't mean carry. Portrait comes from a different root.",
              ],
            },
          ],
        },
        {
          id: "s6",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Using its parts, what does “interrupt” most likely mean?",
              choices: ["To carry something across a long distance", "To break in while something is happening", "To look at something again more closely", "To hear something clearly from far away"],
              answer: 1,
              hint: "Split the word into a prefix and a root. What did each part mean on the earlier slides?",
              explain: "Inter (between) + rupt (break): to interrupt is to break in between, like cutting into the middle of someone's sentence.",
            },
            {
              id: "q2",
              prompt: "What does a transatlantic flight do?",
              choices: ["It flies under the clouds the whole way", "It goes back to where it started", "It crosses the Atlantic Ocean", "It stays between two cities in one state"],
              answer: 2,
              hint: "What does the prefix tell you about direction?",
              explain:
                "Trans (across) + Atlantic: a transatlantic flight crosses the Atlantic Ocean, for example from New York to London. Under would be sub-, back would be re-, and between would be inter-.",
            },
            {
              id: "q3",
              prompt: "Which word means “the study of life”?",
              choices: ["biology", "geography", "autograph", "thermal"],
              answer: 0,
              hint: "Find the root for life and the suffix for the study of.",
              explain: "Bio (life) + ology (the study of) = biology. Geography describes the earth (geo), an autograph is your own (auto) signature, and thermal has to do with heat.",
            },
            {
              id: "q4",
              prompt: "A truck's sign says: “Inflammable. Keep away from flames.” What does inflammable mean?",
              choices: ["Easily set on fire", "Already burned once", "Keeps things cool", "Cannot burn, so it is safe near flames"],
              answer: 0,
              hint: "Read the rest of the sign. Why would you keep it away from flames?",
              explain:
                "The sign warns you to keep it away from flames, so the word must mean it burns easily. Inflammable means the same as flammable. Here the context corrects a misleading prefix.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Root family tree",
          brief: "Build a family of words that share one root, and check every member.",
          steps: [
            "Pick one root from this lesson: port, rupt, spect, aud, bio, graph, chron or therm.",
            "Write the root in the middle of a page. Around it, list every word you can think of that contains it.",
            "Check each word in a dictionary. Cross out any where the letters appear but the root's meaning doesn't fit, like “portrait” for port.",
            "For two of your words, write a sentence that gives a context clue.",
            "Ask someone at home to add one word to your tree, then check it together.",
          ],
        },
      ],
    },
  ],
};

export default contextClues;
