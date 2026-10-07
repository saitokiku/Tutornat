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
      scenes: [],
    },
    {
      id: "not-stated",
      title: "When the main idea isn't stated",
      summary: "Put the details together to figure out what a paragraph is mostly about.",
      minutes: 12,
      scenes: [],
    },
    {
      id: "whole-article",
      title: "The main idea of a whole article",
      summary: "Use headings and the main idea of each paragraph to find what a longer article is about.",
      minutes: 15,
      scenes: [],
    },
  ],
};

export default mainIdea;
