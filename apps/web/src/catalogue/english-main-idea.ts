import type { CatalogueEntry } from "./types";

const mainIdea: CatalogueEntry = {
  id: "english-main-idea",
  title: "Finding the main idea",
  summary: "Figure out what a passage is mostly about, and tell the main idea apart from the details.",
  subject: "english",
  grade: "3",
  locale: "en",
  lessons: [
    {
      id: "main-idea-details",
      title: "Main idea and details",
      summary: "The main idea is what a passage is mostly about. Details tell more about it.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "What is it mostly about?",
          blocks: [
            { type: "text", text: "The main idea is what a passage is mostly about." },
            {
              type: "points",
              items: [
                "The main idea is the big point.",
                "Details are smaller facts. They tell more about the main idea.",
                "To find the main idea, ask: what do all the sentences have in common?",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Read: Octopuses",
          blocks: [
            {
              type: "text",
              text: "Octopuses are experts at hiding. An octopus can change the color of its skin to match rocks or sand.",
            },
            {
              type: "text",
              text: "It has no bones, so it can squeeze its soft body into small cracks. Most octopuses can also squirt a cloud of dark ink and slip away.",
            },
            { type: "text", text: "Every sentence tells about how octopuses hide. That is the main idea." },
            {
              type: "points",
              items: [
                "Main idea: Octopuses are experts at hiding.",
                "Details: they change color, squeeze into cracks and squirt ink.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Read: Honeybees",
          blocks: [
            {
              type: "text",
              text: "Every honeybee in a hive has a job. Some bees fly out to gather nectar and pollen from flowers.",
            },
            {
              type: "text",
              text: "Others stay inside and feed the young bees. A few guard the entrance to keep out bees from other hives.",
            },
            { type: "text", text: "The queen bee has one main job: she lays the eggs." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Main idea or detail?",
          prompt: "Sort the sentences from the honeybee passage. One is the main idea. The rest are details.",
          widget: {
            kind: "sorter",
            categories: ["Main idea", "Detail"],
            items: [
              { id: "nectar", text: "Some bees gather nectar and pollen.", answer: 1 },
              { id: "guard", text: "A few bees guard the entrance.", answer: 1 },
              { id: "job", text: "Every honeybee in a hive has a job.", answer: 0 },
              { id: "feed", text: "Some bees feed the young bees.", answer: 1 },
              { id: "queen", text: "The queen bee lays the eggs.", answer: 1 },
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
              prompt:
                "Read: “A cactus stores water in its thick stem. Its sharp spines help keep thirsty animals away. Many cactuses have wide, shallow roots that soak up rain quickly. A cactus is built to survive in dry places.” What is the main idea?",
              choices: ["A cactus has sharp spines.", "A cactus is built to survive in dry places.", "Rain soaks into the ground quickly."],
              answer: 1,
              hint: "Which sentence do all the other sentences help explain?",
              explain:
                "The stem, the spines and the roots are details. Each one shows how a cactus survives where it is dry. Here, the main idea comes last.",
            },
            {
              id: "q2",
              prompt: "The main idea is: “Our town park has something for everyone.” Which sentence is a detail that supports it?",
              choices: ["There are swings for kids and benches for grown-ups.", "My cousin has a new puppy.", "It rained a lot last spring."],
              answer: 0,
              hint: "A detail tells more about the main idea. Which sentence is about the park?",
              explain:
                "Swings for kids and benches for grown-ups show the park has something for different people. The other two sentences are not about the park.",
            },
            {
              id: "q3",
              prompt:
                "Read: “Sloths spend almost their whole lives in trees. They eat, sleep and even have babies while hanging from branches. They climb down only about once a week, to go to the bathroom.” What is the main idea?",
              choices: ["Sloths eat leaves.", "Sloths spend almost their whole lives in trees.", "Sloths climb down once a week."],
              answer: 1,
              hint: "Two of the choices cover only a small part. Which one covers every sentence?",
              explain:
                "Eating, sleeping, having babies and climbing down all tell about life in the trees. “Sloths eat leaves” is true, but this passage doesn't say it.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Main idea at home",
          brief: "Find a short piece of nonfiction at home: a page from a library book, the back of a cereal box, or a kids' magazine.",
          steps: [
            "Read one paragraph out loud with a grown-up.",
            "Ask: what is this paragraph mostly about? Say it in one sentence.",
            "Find two or three details that tell more about it.",
            "Draw a table. Write the main idea on the tabletop and one detail on each leg.",
            "Check each leg: does this detail really hold up the main idea?",
          ],
        },
      ],
    },
    {
      id: "where-is-it",
      title: "Where is the main idea?",
      summary: "The main idea can come first, in the middle, or last.",
      minutes: 10,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Look everywhere",
          blocks: [
            { type: "text", text: "Writers often put the main idea in the first sentence. But it can also come in the middle or at the end." },
            {
              type: "points",
              items: [
                "First: the main idea, then the details.",
                "Middle: a detail or two, then the main idea, then more details.",
                "Last: the details come first and build up to the main idea.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Read: Emperor penguins",
          blocks: [
            { type: "text", text: "Emperor penguins are built for the cold of Antarctica. A thick layer of fat keeps their bodies warm." },
            {
              type: "text",
              text: "Their tightly packed feathers keep out the icy wind. In storms, they huddle in big groups and take turns standing on the outside.",
            },
            { type: "text", text: "Here the main idea comes first. Every sentence after it shows how the penguins stay warm." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Read: Our library",
          blocks: [
            {
              type: "text",
              text: "Every Saturday morning, kids crowd into the library for story time. Grown-ups use its computers to write letters and look for jobs.",
            },
            { type: "text", text: "Our library is much more than a place to borrow books." },
            { type: "text", text: "Teens come after school to get help with homework. Some nights, there is even a free cooking class." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "First, middle or last?",
          prompt: "Read each short paragraph. Is its main idea first, in the middle, or last?",
          widget: {
            kind: "sorter",
            categories: ["First", "Middle", "Last"],
            items: [
              {
                id: "dogs",
                text: "Dogs help people in many ways. Some guide people who cannot see. Others sniff out hikers who are lost.",
                answer: 0,
              },
              {
                id: "summer",
                text: "The sidewalk burns our bare feet. Summer in our town is very hot. Even the dogs lie in the shade all afternoon.",
                answer: 1,
              },
              {
                id: "frogs",
                text: "Frogs start life as tadpoles in the water. Later they grow legs and hop onto land. A frog's body changes a lot as it grows.",
                answer: 2,
              },
              {
                id: "market",
                text: "Farmers bring fresh corn and peaches. The Saturday market is the busiest place in town. Every parking spot is full by eight o'clock.",
                answer: 1,
              },
              {
                id: "cat",
                text: "Our cat naps in the sun all morning. After lunch, she sleeps on my bed. Our cat spends most of the day asleep.",
                answer: 2,
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
              prompt: "In the library passage, where is the main idea?",
              choices: ["In the first sentence", "In the middle", "In the last sentence"],
              answer: 1,
              hint: "Find the sentence that all the others tell more about. Then look at where it sits.",
              explain:
                "“Our library is much more than a place to borrow books” is in the middle. The sentences before and after it are details.",
            },
            {
              id: "q2",
              prompt:
                "Read: “Wind can spin a pinwheel. It can push a sailboat across a lake. It can even turn giant blades that make electricity. Wind has a lot of power.” Where is the main idea?",
              choices: ["First", "Middle", "Last"],
              answer: 2,
              hint: "Which sentence sums up all the others?",
              explain: "The last sentence, “Wind has a lot of power,” sums up the details that come before it.",
            },
            {
              id: "q3",
              prompt: "How can you check that you found the main idea?",
              choices: ["See if all the other sentences tell more about it.", "Pick the longest sentence.", "Pick the first sentence every time."],
              answer: 0,
              hint: "The main idea is connected to every detail.",
              explain: "Every detail should tell more about the main idea. It isn't always the first sentence or the longest one.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Main idea hunt",
          brief: "Find out where writers put the main idea in real books.",
          steps: [
            "Pick three paragraphs from a library book, a magazine or a newspaper.",
            "For each one, find the sentence that sums up the paragraph.",
            "Mark where it is: first, middle or last.",
            "Test it: does every other sentence tell more about it?",
            "Count where the main idea showed up most often. Tell someone what you found.",
          ],
        },
      ],
    },
    {
      id: "not-stated",
      title: "When the main idea isn't stated",
      summary: "Put the details together to figure out what a paragraph is mostly about.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "No sentence says it",
          blocks: [
            { type: "text", text: "Sometimes no single sentence tells the main idea. You figure it out from the details." },
            {
              type: "points",
              items: ["Read all the details.", "Ask: what do they have in common?", "Say the main idea in your own sentence."],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Read: Getting ready",
          blocks: [
            { type: "text", text: "Dad packed the tent and the sleeping bags. Mia found the flashlights and checked the batteries." },
            { type: "text", text: "Leo filled a cooler with sandwiches and apples. Mom loaded everything into the car." },
            {
              type: "text",
              text: "No sentence says it, but the details add up. The main idea is that the family is getting ready for a camping trip.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "What are the details about?",
          prompt: "Each detail belongs to one of two main ideas. Sort them.",
          widget: {
            kind: "sorter",
            categories: ["Getting ready for a birthday party", "Getting ready for school"],
            items: [
              { id: "balloons", text: "Blow up the balloons.", answer: 0 },
              { id: "lunch", text: "Pack a lunch box.", answer: 1 },
              { id: "present", text: "Wrap the present.", answer: 0 },
              { id: "homework", text: "Put your homework in your backpack.", answer: 1 },
              { id: "candles", text: "Put candles on the cake.", answer: 0 },
              { id: "pencils", text: "Sharpen your pencils.", answer: 1 },
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
              prompt:
                "Read: “Grandpa's hands shook as he opened the letter. He read it twice. Then he laughed out loud and called everyone into the kitchen.” What is this paragraph mostly about?",
              choices: ["Grandpa got good news in a letter.", "Grandpa's kitchen is big.", "Grandpa can't read well."],
              answer: 0,
              hint: "Put the clues together. How does Grandpa act after he reads the letter?",
              explain: "He laughs and calls everyone in to hear. The details add up to good news, even though no sentence says so.",
            },
            {
              id: "q2",
              prompt: "Read: “The bread has blue fuzz on it. The milk smells sour. The bananas are brown and mushy.” What is the main idea?",
              choices: ["The food in the kitchen has gone bad.", "Bananas are yellow.", "Someone went shopping today."],
              answer: 0,
              hint: "What do the bread, the milk and the bananas have in common?",
              explain: "Fuzzy bread, sour milk and mushy bananas are all food that has gone bad.",
            },
            {
              id: "q3",
              prompt:
                "Read: “The ground is covered in snow. Kids are building a snowman. Everyone wears mittens and hats.” Which sentence best states the main idea?",
              choices: ["It is a snowy winter day.", "Kids are building a snowman.", "Mittens keep hands warm."],
              answer: 0,
              hint: "Pick the sentence that covers all three details, not just one.",
              explain: "“Kids are building a snowman” is only one detail. “It is a snowy winter day” covers all three.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Detail detective",
          brief: "Play a guessing game where the main idea is never said out loud.",
          steps: [
            "Ask someone at home to think of a place, like a beach or a bakery, without saying it.",
            "They give you one detail at a time, like “I hear waves.”",
            "After three details, say the main idea: what are all the details about?",
            "Switch. You give three details, and they guess.",
            "Find a paragraph in a book that doesn't state its main idea. Say the main idea in your own sentence.",
          ],
        },
      ],
    },
    {
      id: "whole-article",
      title: "The main idea of a whole article",
      summary: "Use headings and the main idea of each paragraph to find what a longer article is about.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Bigger than a paragraph",
          blocks: [
            {
              type: "text",
              text: "A longer article has a main idea too. Each part has its own main idea, and they all support the big one.",
            },
            {
              type: "points",
              items: [
                "Read the title. It often names the topic.",
                "Read the headings. Each one tells what its part is about.",
                "Find the main idea of each part.",
                "Ask: what do all the parts add up to?",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Read: Beavers change their world, part 1",
          blocks: [
            { type: "text", text: "Heading: Building a dam" },
            {
              type: "text",
              text: "Beavers cut down small trees with their strong front teeth. They pile branches, mud and rocks across a stream to make a dam.",
            },
            { type: "text", text: "Heading: A pond appears" },
            { type: "text", text: "The dam blocks the water, so a pond forms behind it. The beavers build their home, called a lodge, in the pond." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Read: Beavers change their world, part 2",
          blocks: [
            { type: "text", text: "Heading: A home for others" },
            { type: "text", text: "The still water of the pond becomes a home for fish, frogs and ducks. Many insects lay their eggs in it too." },
            { type: "text", text: "Each heading told you what its part was about. What do all three parts add up to?" },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Big idea, part idea or detail?",
          prompt:
            "The beaver article has three parts. Is each sentence the main idea of the whole article, the main idea of one part, or a detail?",
          widget: {
            kind: "sorter",
            categories: ["Whole article", "One part", "Detail"],
            items: [
              { id: "whole", text: "Beavers build dams that change a stream and help other animals.", answer: 0 },
              { id: "dam", text: "Beavers build dams across streams.", answer: 1 },
              { id: "pond", text: "The dam turns the stream into a pond.", answer: 1 },
              { id: "home", text: "The pond becomes a home for other animals.", answer: 1 },
              { id: "teeth", text: "Beavers cut down trees with their front teeth.", answer: 2 },
              { id: "lodge", text: "A beaver's home is called a lodge.", answer: 2 },
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
              prompt: "What is the beaver article mostly about?",
              choices: ["Beavers have strong teeth.", "Beavers build dams that change a stream and help other animals.", "Ducks like ponds."],
              answer: 1,
              hint: "Pick the choice that covers all three parts of the article.",
              explain:
                "Strong teeth and ducks are each details from one part. The whole article is about how a beaver dam changes a stream and helps other animals.",
            },
            {
              id: "q2",
              prompt: "Why are headings useful?",
              choices: ["They tell what each part is about.", "They are always the main idea of the whole article.", "They show where the article ends."],
              answer: 0,
              hint: "Look back at the beaver headings. What did each one tell you?",
              explain: "A heading names the topic of its part. Put the headings together to find the main idea of the whole article.",
            },
            {
              id: "q3",
              prompt:
                "An article has three headings: “Seeds ride the wind,” “Seeds float on water” and “Seeds hitch rides on animals.” What is it mostly about?",
              choices: ["How seeds travel to new places", "How wind blows", "Animals with fur"],
              answer: 0,
              hint: "What do all three headings have in common?",
              explain: "Every heading names a way seeds travel. So the article is about how seeds get to new places.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Map an article",
          brief: "Find a short nonfiction article with headings, in a kids' magazine or a library book.",
          steps: [
            "Write the article's title at the top of a page.",
            "Under it, write each heading. Next to each one, write that part's main idea in a few words.",
            "Look at all the parts together.",
            "Write one sentence that tells what the whole article is about.",
            "Read your sentence to someone. Ask: does it cover every part?",
          ],
        },
      ],
    },
  ],
};

export default mainIdea;
