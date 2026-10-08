import type { CatalogueEntry } from "./types";

const ecosystems: CatalogueEntry = {
  id: "science-ecosystems",
  title: "Ecosystems and food webs",
  summary: "Follow energy from the Sun through producers, consumers and decomposers, map food webs, and name the ways living things depend on each other.",
  subject: "science",
  grade: "7",
  locale: "en",
  lessons: [
    {
      id: "roles",
      title: "Producers, consumers and decomposers",
      summary: "Every living thing in an ecosystem has a role: making food, eating it, or breaking down what is left.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Who makes food, who eats it",
          blocks: [
            {
              type: "text",
              text: "An ecosystem is all the living things in an area, together with the nonliving things they depend on, such as water, soil, sunlight and air.",
            },
            {
              type: "points",
              items: [
                "Producers make their own food. Plants, algae and some bacteria use energy from sunlight to make sugar by photosynthesis.",
                "Consumers get energy by eating other living things.",
                "Decomposers, mainly fungi and bacteria, break down dead plants, dead animals and waste.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Kinds of consumers",
          blocks: [
            {
              type: "points",
              items: [
                "Herbivores eat plants or algae. A deer eating leaves is a herbivore.",
                "Carnivores eat other animals. A hawk eating a snake is a carnivore.",
                "Omnivores eat both. Bears, raccoons and most people are omnivores.",
                "Scavengers, such as vultures, eat animals that are already dead.",
              ],
            },
            {
              type: "text",
              text: "Decomposers return nutrients from dead things to the soil, where producers can use them again. Without decomposers, dead leaves and bodies would pile up.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Sort the roles",
          prompt: "Sort each living thing by its role in the ecosystem.",
          widget: {
            kind: "sorter",
            categories: ["Producer", "Consumer", "Decomposer"],
            items: [
              { id: "rabbit", text: "A rabbit", answer: 1 },
              { id: "grass", text: "Grass", answer: 0 },
              { id: "mushroom", text: "A mushroom growing on a rotting log", answer: 2 },
              { id: "hawk", text: "A hawk", answer: 1 },
              { id: "algae", text: "Algae in a pond", answer: 0 },
              { id: "mold", text: "Mold on old bread", answer: 2 },
              { id: "oak", text: "An oak tree", answer: 0 },
              { id: "bear", text: "A black bear", answer: 1 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Energy starts with the Sun",
          blocks: [
            {
              type: "text",
              text: "Almost every food chain starts with sunlight. Producers capture its energy and store it in sugar. Every consumer gets that energy from producers, directly or by eating something that did.",
            },
            {
              type: "text",
              text: "There are rare exceptions. Near vents on the deep sea floor, where no sunlight reaches, some bacteria make food from chemicals instead.",
            },
          ],
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Which of these is a producer?",
              choices: ["A mushroom", "A grasshopper", "A shark", "Seaweed"],
              answer: 3,
              hint: "Which of these can make its own food from sunlight?",
              explain:
                "Seaweed is a kind of algae, and it makes food by photosynthesis. Mushrooms are fungi, which are decomposers. Grasshoppers and sharks are consumers.",
            },
            {
              id: "q2",
              prompt: "A raccoon eats berries, insects and fish. What kind of consumer is it?",
              choices: ["Herbivore", "Carnivore", "Omnivore"],
              answer: 2,
              hint: "Look at the list of foods: is it only plants, only animals, or both?",
              explain: "An animal that eats both plants and animals is an omnivore.",
            },
            {
              id: "q3",
              prompt: "What would happen in a forest with no decomposers?",
              choices: [
                "Plants would grow faster, with no fungi or bacteria to harm them.",
                "Dead material would pile up and soil would lose nutrients.",
                "Nothing would change, because decomposers are so small.",
              ],
              answer: 1,
              hint: "Decomposers break down dead material. Where do its nutrients go?",
              explain: "Decomposers return nutrients from dead things to the soil. Without them, dead material would pile up and producers would run short of nutrients.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Decomposers at work",
          brief: "Watch decomposers break down food, and test what they need. You need two slices of bread, two zip-top bags, water and a marker.",
          steps: [
            "Put one slice of bread in a bag and sprinkle it with a few drops of water. Put the other slice in the second bag dry. Seal and label both bags.",
            "Leave both bags side by side in the same warm, dark place.",
            "Look at them every day for up to two weeks without opening them. Draw what you see.",
            "Which slice grew mold first? What does that tell you about what decomposers need?",
            "Throw both bags away without opening them. Some molds can make people sick.",
          ],
        },
      ],
    },
    {
      id: "food-webs",
      title: "Food chains and food webs",
      summary: "Draw the paths energy takes, and predict what happens when one living thing disappears.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Food chains",
          blocks: [
            { type: "text", text: "A food chain shows one path that energy takes through an ecosystem: grass → grasshopper → frog → snake → hawk." },
            {
              type: "text",
              text: "Each arrow points from the living thing that is eaten to the one that eats it. The arrows show the direction energy flows.",
            },
            {
              type: "points",
              items: [
                "Grass is the producer.",
                "The grasshopper is a primary consumer: it eats the producer.",
                "The frog is a secondary consumer: it eats the primary consumer.",
                "The snake and the hawk are higher-level consumers. The hawk is the top predator in this chain.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Food webs",
          blocks: [
            {
              type: "text",
              text: "Real ecosystems are not single chains. Most animals eat more than one thing, and most are eaten by more than one thing. A food web shows the linked chains together.",
            },
            {
              type: "points",
              items: [
                "Grass → grasshopper → frog → snake → hawk",
                "Grass → rabbit → hawk",
                "Grass → mouse → snake",
                "Grass → mouse → hawk",
              ],
            },
            { type: "text", text: "In this meadow web, the hawk eats rabbits, mice and snakes. Mice are food for both snakes and hawks." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Levels in the meadow",
          prompt: "Use the meadow food web. Sort each living thing: producer, primary consumer, or higher-level consumer?",
          widget: {
            kind: "sorter",
            categories: ["Producer", "Primary consumer", "Higher-level consumer"],
            items: [
              { id: "frog", text: "Frog", answer: 2 },
              { id: "grass", text: "Grass", answer: 0 },
              { id: "rabbit", text: "Rabbit", answer: 1 },
              { id: "hawk", text: "Hawk", answer: 2 },
              { id: "grasshopper", text: "Grasshopper", answer: 1 },
              { id: "snake", text: "Snake", answer: 2 },
              { id: "mouse", text: "Mouse", answer: 1 },
            ],
          },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Changes ripple through a web",
          blocks: [
            { type: "text", text: "Because everything in a web is linked, a change to one population affects others." },
            {
              type: "points",
              items: [
                "If frogs vanished from the meadow, grasshoppers would lose a predator, so their numbers would likely rise. More grasshoppers would eat more grass.",
                "Snakes would lose one source of food, so they would rely more on mice.",
              ],
            },
            {
              type: "text",
              text: "A real example: sea otters eat sea urchins, and sea urchins eat kelp. Where otters were hunted out, urchins multiplied and stripped kelp forests bare. Where otters returned, the kelp grew back.",
            },
          ],
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "In the chain grass → grasshopper → frog, which way does energy flow?",
              choices: ["From grass to grasshopper to frog", "From frog to grasshopper to grass", "Back and forth between them"],
              answer: 0,
              hint: "Arrows point from what is eaten to what eats it.",
              explain: "Energy flows the way the arrows point: the grasshopper gets energy from the grass, and the frog gets energy from the grasshopper.",
            },
            {
              id: "q2",
              prompt: "In the meadow web, a disease kills most of the mice. What is likely to happen to the snakes?",
              choices: [
                "Nothing, because snakes don't eat mice in this web.",
                "They switch to eating the grass the mice left.",
                "They have less food, so their numbers may drop.",
              ],
              answer: 2,
              hint: "Find every arrow that starts at the mouse.",
              explain: "Mice are food for snakes and hawks. With fewer mice, snakes have less food. Their numbers may fall, and they may eat more frogs instead.",
            },
            {
              id: "q3",
              prompt: "Why did kelp forests shrink where sea otters were hunted?",
              choices: [
                "Sea urchins multiplied and ate the kelp.",
                "Otters eat kelp, so without otters the kelp died.",
                "The water got colder after the otters left.",
              ],
              answer: 0,
              hint: "Follow the chain: kelp → sea urchin → sea otter.",
              explain: "Otters keep sea urchin numbers down. With the otters gone, urchins multiplied and ate the kelp. One change at the top rippled down the chain.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Map a food web near you",
          brief: "Build a food web from living things you can find outside. Look closely, but don't touch wild animals.",
          steps: [
            "Go to a yard, park or schoolyard. List at least six living things you see, or signs of them, like chewed leaves or droppings.",
            "Mark each one as a producer, consumer or decomposer.",
            "Draw arrows from each living thing to what eats it. Use what you know, or look it up.",
            "Find one living thing that belongs to two or more chains.",
            "Predict what would happen to your web if one of its living things disappeared.",
          ],
        },
      ],
    },
    {
      id: "energy-pyramid",
      title: "The energy pyramid",
      summary: "Why only a small part of the energy passes up each level, and why top predators are rare.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Energy gets used along the way",
          blocks: [
            {
              type: "text",
              text: "When a rabbit eats grass, it does not get all the energy the grass captured. The grass used much of it just to stay alive, and that energy left as heat. Some parts, like the roots, aren't eaten.",
            },
            { type: "text", text: "The rabbit, in turn, uses most of its energy to move, stay warm and stay alive. Much of it leaves the rabbit as heat." },
            {
              type: "visual",
              visual: { kind: "fraction", parts: 10, shaded: 1 },
              alt: "A bar cut into 10 equal parts with 1 part shaded: on average, only about one tenth of the energy at one level reaches the next level.",
            },
            {
              type: "text",
              text: "On average, only about 10% of the energy at one level passes on to the next. This is often called the 10% rule. The real amount varies, but it is always a small part.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Why a pyramid?",
          blocks: [
            {
              type: "text",
              text: "An energy pyramid shows how much energy is at each level of a food chain. Producers make up the wide bottom. Top predators sit at the narrow top.",
            },
            {
              type: "points",
              items: [
                "Producers: 10,000 units of energy",
                "Primary consumers: about 1,000 units",
                "Secondary consumers: about 100 units",
                "Tertiary consumers: about 10 units",
              ],
            },
            {
              type: "text",
              text: "That is why there are far fewer hawks than mice, and why food chains rarely have more than four or five links.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "One level up",
          prompt: "The producers in a field capture 10,000 units of energy. About how much reaches the primary consumers that eat them? Use the 10% rule and move the marker.",
          widget: { kind: "number-line", min: 0, max: 2000, step: 100, start: 0, target: 1000 },
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Two levels up",
          prompt: "Now go one more level up. About how much of that energy reaches the secondary consumers?",
          widget: { kind: "number-line", min: 0, max: 200, step: 10, start: 0, target: 100 },
        },
        {
          id: "s5",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Why are there fewer top predators than herbivores in an ecosystem?",
              choices: [
                "Top predators are bigger, so fewer of them fit in an area.",
                "Top predators don't need much energy to live.",
                "Little energy is left at the top of the pyramid.",
              ],
              answer: 2,
              hint: "Think about what happens to the energy at each step up the pyramid.",
              explain: "Each level passes on only about 10% of its energy. By the top, there is only enough energy left to support a few animals.",
            },
            {
              id: "q2",
              prompt: "Where does most of the energy go that isn't passed on?",
              choices: [
                "It is given off as heat, or left in uneaten parts.",
                "It sinks into the soil and is stored there forever.",
                "It is passed back up to the Sun as sunlight.",
              ],
              answer: 0,
              hint: "What does a rabbit use energy for every day?",
              explain:
                "Living things use most of their energy to move, stay warm and keep their bodies working, and that energy leaves as heat. Some stays in parts that are never eaten, like roots and bones.",
            },
            {
              id: "q3",
              prompt: "The producers in a food chain hold 5,000 units of energy. Using the 10% rule, about how much reaches the secondary consumers?",
              choices: ["500 units", "50 units", "5 units"],
              answer: 1,
              hint: "Take 10% twice: once for the primary consumers, once more for the secondary consumers.",
              explain: "10% of 5,000 is 500 for the primary consumers. 10% of 500 is 50 for the secondary consumers.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Trace a meal to the Sun",
          brief: "Every meal you eat is the end of a food chain. Trace one back to the Sun. You need paper and a pencil.",
          steps: [
            "Write down everything in one meal you eat today.",
            "Trace each food back to a producer. For example: cheese comes from milk, milk comes from a cow, and the cow ate grass.",
            "Draw each one as a food chain with you at the end, with the arrows pointing toward you.",
            "Count the links in each chain. Which food is the fewest steps from the Sun?",
            "Use the 10% rule to explain which food in your meal needed the most plant energy to produce.",
          ],
        },
      ],
    },
    {
      id: "relationships",
      title: "Living together",
      summary: "Predation, competition, mutualism, commensalism and parasitism, and what limits how big a population can grow.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Five kinds of relationships",
          blocks: [
            {
              type: "points",
              items: [
                "Predation: one animal, the predator, hunts and eats another, the prey. A hawk catching a mouse.",
                "Competition: two living things need the same limited resource, like food, water or space. Two kinds of birds eating the same seeds.",
                "Mutualism: both partners benefit. Bees get nectar from flowers, and the flowers get pollinated.",
                "Commensalism: one partner benefits and the other is not affected. A bird builds its nest in a tree.",
                "Parasitism: one partner, the parasite, benefits and harms the other, the host. A tick feeding on a deer.",
              ],
            },
            {
              type: "text",
              text: "Mutualism, commensalism and parasitism are kinds of symbiosis: two different species living in close contact over a long time.",
            },
          ],
        },
        {
          id: "s2",
          kind: "interactive",
          title: "Name the relationship",
          prompt: "Sort each example. Which kind of relationship is it?",
          widget: {
            kind: "sorter",
            categories: ["Predation", "Competition", "Mutualism", "Commensalism", "Parasitism"],
            items: [
              { id: "lichen", text: "A fungus and an alga live together as a lichen. The alga makes food, and the fungus holds water and shelters the alga.", answer: 2 },
              { id: "owl", text: "An owl catches and eats a mouse.", answer: 0 },
              { id: "robin", text: "A robin builds its nest in a tall tree. The tree is not affected.", answer: 3 },
              { id: "lions", text: "Lions and hyenas hunt the same zebras.", answer: 1 },
              { id: "tapeworm", text: "A tapeworm lives in a dog's gut and absorbs its food.", answer: 4 },
              { id: "barnacles", text: "Barnacles ride on a whale to reach food-rich water. The whale is not affected.", answer: 3 },
              { id: "plants", text: "Two plants growing side by side need the same sunlight and water.", answer: 1 },
              { id: "fleas", text: "Fleas feed on a cat's blood.", answer: 4 },
            ],
          },
        },
        {
          id: "s3",
          kind: "slide",
          title: "Limits on a population",
          blocks: [
            {
              type: "visual",
              visual: {
                kind: "line-graph",
                points: [[0, 20], [1, 32], [2, 50], [3, 72], [4, 92], [5, 106], [6, 114], [7, 118], [8, 120]],
                xLabel: "Years",
                yLabel: "Number of deer",
              },
              alt: "A line graph of the deer population in an example forest. It starts at 20, grows quickly for a few years, then levels off at about 120.",
            },
            { type: "text", text: "A population can't grow forever. Food, water, space and shelter are limited. These are called limiting factors." },
            {
              type: "text",
              text: "The largest population an environment can support over time is its carrying capacity. As a population nears it, competition for resources gets stronger and growth slows, as in this example.",
            },
          ],
        },
        {
          id: "s4",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "A tick attaches to a deer and feeds on its blood for days. What is the relationship?",
              choices: ["Predation", "Parasitism", "Mutualism"],
              answer: 1,
              hint: "The deer is harmed, but it is not killed and eaten.",
              explain: "The tick benefits, and the deer is harmed without being killed and eaten. That is parasitism.",
            },
            {
              id: "q2",
              prompt: "Cattle egrets follow cows and eat the insects the cows stir up from the grass. The cows are not affected. What is the relationship?",
              choices: ["Mutualism", "Competition", "Commensalism"],
              answer: 2,
              hint: "Do the cows gain or lose anything?",
              explain: "The egrets benefit, and the cows are neither helped nor harmed, so it is commensalism.",
            },
            {
              id: "q3",
              prompt: "A pond can support about 200 frogs. A dry year shrinks the pond. What most likely happens?",
              choices: [
                "Fewer frogs can live there, so their numbers drop.",
                "The frog population keeps growing as before.",
                "Nothing changes, because frogs don't need much water.",
              ],
              answer: 0,
              hint: "Carrying capacity depends on resources. What happened to the resources?",
              explain:
                "Less water and space means the pond can support fewer frogs. Competition rises, and the population falls toward the new, lower carrying capacity.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Relationships outside",
          brief: "Watch living things interact and name what you see. You need a notebook and 20 minutes outside.",
          steps: [
            "Watch a yard, park or garden for 20 minutes. Look closely at flowers, trees, insects and birds.",
            "Describe at least three interactions, like an insect visiting a flower or two birds chasing each other away from food.",
            "For each one, ask: who benefits, who is harmed, and who is not affected?",
            "Name each relationship: predation, competition, mutualism, commensalism or parasitism.",
            "Pick one and explain what might happen to both species if that relationship stopped.",
          ],
        },
      ],
    },
  ],
};

/** Practice on the skill map that fits each lesson (lesson id → skill ids). */
export const practice: Record<string, string[]> = {
  roles: ["s.food.chains"],
  "food-webs": ["s.food.chains"],
  "energy-pyramid": ["s.food.chains"],
  relationships: ["s.ecosystems"],
};

export default ecosystems;
