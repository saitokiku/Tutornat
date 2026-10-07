import type { CatalogueEntry } from "./types";

const heredity: CatalogueEntry = {
  id: "science-heredity",
  title: "Heredity and genes",
  summary: "See how traits pass from parents to offspring through DNA, genes and chromosomes, and use Punnett squares to predict the chances.",
  subject: "science",
  grade: "8",
  locale: "en",
  lessons: [
    {
      id: "traits",
      title: "Inherited or acquired?",
      summary: "Some traits come from genes, some come from life, and many depend on both.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "What a trait is",
          blocks: [
            { type: "text", text: "A trait is a feature of a living thing, such as the color of a flower, the shape of a leaf, or a person's blood type." },
            {
              type: "points",
              items: [
                "Inherited traits are passed from parents to offspring through genes. A dog's coat color and your blood type are inherited.",
                "Acquired traits develop during a living thing's life, from its experiences or surroundings. A scar, a skill like riding a bike, and the language you speak are acquired.",
              ],
            },
            {
              type: "text",
              text: "Acquired traits are not passed on through genes. A dog that has been trained to sit does not have puppies that already know how to sit.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Genes and environment together",
          blocks: [
            {
              type: "text",
              text: "Many traits depend on both genes and environment. Your genes affect how tall you can grow, but so do food, sleep and health while you are growing.",
            },
            {
              type: "text",
              text: "Hydrangea flowers show this clearly. The same plant can bloom blue in acidic soil and pink in less acidic soil.",
            },
            { type: "text", text: "Most human traits, like height and eye color, are shaped by many genes at once, not by just one." },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "Inherited or acquired?",
          prompt: "Sort each trait. Is it inherited through genes, or acquired during life?",
          widget: {
            kind: "sorter",
            categories: ["Inherited", "Acquired"],
            items: [
              { id: "blood", text: "Your blood type", answer: 0 },
              { id: "coat", text: "A dog's coat color", answer: 0 },
              { id: "stripes", text: "A tiger's stripes", answer: 0 },
              { id: "eyes", text: "Natural eye color", answer: 0 },
              { id: "scar", text: "A scar from a fall", answer: 1 },
              { id: "bike", text: "Being able to ride a bike", answer: 1 },
              { id: "language", text: "The language you speak", answer: 1 },
              { id: "muscles", text: "Strong muscles from swimming every day", answer: 1 },
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
              prompt: "Which of these is an acquired trait?",
              choices: ["Blood type", "A tattoo", "Natural hair color"],
              answer: 1,
              hint: "Acquired traits come from experience or surroundings, not from genes.",
              explain: "A tattoo is added during a person's life, so it is acquired. Blood type and natural hair color are inherited through genes.",
            },
            {
              id: "q2",
              prompt: "A mouse loses its tail in an accident. Will its babies be born without tails?",
              choices: ["Yes, the babies take after the parent.", "No. Losing a tail doesn't change the genes passed to offspring."],
              answer: 1,
              hint: "Is a lost tail written in the mouse's genes?",
              explain:
                "Losing a tail is an acquired change, and it doesn't change the mouse's genes. In the 1880s, the biologist August Weismann cut the tails off mice for several generations, and every new generation was still born with tails.",
            },
            {
              id: "q3",
              prompt: "Identical twins grow up in different countries. As adults, one is 3 cm taller. What best explains the difference?",
              choices: ["They have different genes.", "Environment, such as food and health, also affects height.", "Height is only an acquired trait."],
              answer: 1,
              hint: "Identical twins share the same genes.",
              explain: "Identical twins have the same genes, so a difference in height must come from their environments, such as diet and health while growing.",
            },
          ],
        },
        {
          id: "s5",
          kind: "project",
          title: "Sun leaves and shade leaves",
          brief: "Test whether the environment changes a trait when the genes stay the same. You need a ruler and a tree or bush with a sunny side and a shady side.",
          steps: [
            "Find a tree or bush that gets sun on one side and shade on the other.",
            "With permission, pick 5 leaves from the sunny side and 5 from the shady side.",
            "Measure the length of each leaf, then find the average length for each side.",
            "All the leaves grew on one plant, so they have the same genes. What does any difference tell you?",
            "Write one sentence about a trait that depends on genes and one about a trait that depends on the environment.",
          ],
        },
      ],
    },
    {
      id: "genes-dna",
      title: "Genes, DNA and chromosomes",
      summary: "Where the instructions for traits are kept, how they are packed, and how they are passed on.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Instructions in every cell",
          blocks: [
            {
              type: "text",
              text: "Inside the nucleus of your cells is DNA, a very long molecule shaped like a twisted ladder. This shape is called a double helix.",
            },
            {
              type: "text",
              text: "DNA is written in a code of four chemical letters: A, T, C and G. The order of the letters carries the instructions for building and running a living thing.",
            },
            {
              type: "points",
              items: [
                "A gene is a section of DNA with the instructions for one product, usually a protein. Humans have about 20,000 genes that code for proteins.",
                "A chromosome is one long DNA molecule, tightly coiled and packed with proteins. Each chromosome holds many genes.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Pairs of chromosomes",
          blocks: [
            {
              type: "text",
              text: "Most human body cells have 46 chromosomes, in 23 pairs. You got one chromosome of each pair from each of your biological parents.",
            },
            {
              type: "visual",
              visual: { kind: "number-line", min: 0, max: 50, marks: [0, 23, 46] },
              alt: "A number line from 0 to 50, with marks at 23, the number of chromosomes in an egg or sperm cell, and at 46, the number in most human body cells.",
            },
            {
              type: "text",
              text: "Egg and sperm cells are different. Each carries just 23 chromosomes, one from each pair. When an egg and a sperm join, the new cell has 46 again.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "A fruit fly's egg",
          prompt: "A fruit fly's body cells have 8 chromosomes, in 4 pairs. How many chromosomes does one of its egg cells carry? Move the marker.",
          widget: { kind: "number-line", min: 0, max: 10, step: 1, start: 0, target: 4 },
        },
        {
          id: "s4",
          kind: "slide",
          title: "Alleles",
          blocks: [
            {
              type: "text",
              text: "Genes come in different versions called alleles. In pea plants, a gene for flower color has one allele for purple flowers and one for white flowers.",
            },
            {
              type: "text",
              text: "Because chromosomes come in pairs, you have two copies of most genes. The two copies can be the same allele or two different alleles.",
            },
            {
              type: "text",
              text: "Each egg or sperm gets one chromosome from each pair, chosen at random. With 23 pairs, one person can make more than 8 million different combinations. That is one reason siblings, except identical twins, are never exactly alike.",
            },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Name the part",
          prompt: "Sort each description. Is it about DNA, a gene, an allele or a chromosome?",
          widget: {
            kind: "sorter",
            categories: ["DNA", "Gene", "Allele", "Chromosome"],
            items: [
              { id: "code", text: "The molecule that carries the code in A, T, C and G", answer: 0 },
              { id: "ladder", text: "Shaped like a twisted ladder", answer: 0 },
              { id: "section", text: "A section of DNA with the instructions for one protein", answer: 1 },
              { id: "version", text: "One version of a gene, such as the one for white pea flowers", answer: 2 },
              { id: "coiled", text: "One long, tightly coiled DNA molecule", answer: 3 },
              { id: "pairs", text: "Most human cells have 23 pairs of these", answer: 3 },
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
              prompt: "How many chromosomes are in a human sperm cell?",
              choices: ["46", "23", "92"],
              answer: 1,
              hint: "Sex cells carry one chromosome from each pair.",
              explain: "A sperm cell carries 23 chromosomes, one from each pair. Joined with an egg's 23, the new cell has 46.",
            },
            {
              id: "q2",
              prompt: "What is a gene?",
              choices: ["A whole chromosome", "A section of DNA with the instructions for one product, usually a protein", "A kind of cell"],
              answer: 1,
              hint: "Genes are smaller than chromosomes. Each chromosome holds many of them.",
              explain: "A gene is a section of DNA. A chromosome is a whole DNA molecule, and it holds many genes.",
            },
            {
              id: "q3",
              prompt: "Why are brothers and sisters with the same parents not exactly alike?",
              choices: [
                "Their genes change as they grow up.",
                "Each egg and sperm gets a random mix of chromosomes, so each child gets a different combination.",
                "Only the oldest child gets genes from both parents.",
              ],
              answer: 1,
              hint: "Think about how each egg or sperm gets one chromosome from each pair.",
              explain: "Each egg and each sperm carries a random set of chromosomes. So each child gets a different combination from the same two parents, except identical twins.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Shuffle the chromosomes",
          brief: "Model how sex cells get a random mix of chromosomes. Your model is a made-up living thing with only 3 pairs. You need paper, two colored pencils, scissors and a coin.",
          steps: [
            "Cut 6 paper strips. Color 3 blue and 3 red, and number each color 1, 2 and 3. Each number is one pair: a blue and a red.",
            "Line up the pairs: 1 with 1, 2 with 2, 3 with 3.",
            "To make one sex cell, flip the coin once for each pair: heads, take the blue strip; tails, take the red one. Write down the three you got.",
            "Make 8 sex cells this way. How many different combinations did you get? With 3 pairs, there are 2 × 2 × 2 = 8 possible.",
            "Explain why 23 pairs give more than 8 million possible combinations.",
          ],
        },
      ],
    },
    {
      id: "dominant-recessive",
      title: "Dominant and recessive",
      summary: "Mendel's pea plants, and why a trait can skip a generation.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Mendel's peas",
          blocks: [
            {
              type: "text",
              text: "In the 1850s and 1860s, Gregor Mendel, a monk in what is now the Czech Republic, bred thousands of pea plants and counted their traits.",
            },
            {
              type: "text",
              text: "He crossed plants with purple flowers and plants with white flowers. All of their offspring had purple flowers. The white trait seemed to vanish.",
            },
            { type: "text", text: "Then he let those purple offspring breed with each other. In the next generation, white flowers came back, in about 1 of every 4 plants." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Dominant and recessive alleles",
          blocks: [
            {
              type: "points",
              items: [
                "A dominant allele shows its trait whenever it is present. It is written with a capital letter: P for purple.",
                "A recessive allele shows its trait only when both copies are recessive. It is written with a lowercase letter: p for white.",
              ],
            },
            { type: "text", text: "The white allele never vanished. It was hidden in the purple offspring, each of which had one P and one p." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Genotype and phenotype",
          blocks: [
            {
              type: "points",
              items: [
                "Genotype: the pair of alleles, such as PP, Pp or pp.",
                "Phenotype: the trait you can observe, such as purple or white flowers.",
                "Homozygous: two of the same allele, like PP or pp.",
                "Heterozygous: two different alleles, like Pp.",
              ],
            },
            { type: "text", text: "PP plants and Pp plants both have purple flowers. Only pp plants have white flowers." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Dominant or recessive trait?",
          prompt:
            "In pea plants, purple flowers (P) are dominant over white (p), and tall plants (T) are dominant over short (t). Sort each genotype: does the plant show the dominant trait or the recessive one?",
          widget: {
            kind: "sorter",
            categories: ["Dominant trait", "Recessive trait"],
            items: [
              { id: "PP", text: "PP", answer: 0 },
              { id: "Pp", text: "Pp", answer: 0 },
              { id: "pp", text: "pp", answer: 1 },
              { id: "TT", text: "TT", answer: 0 },
              { id: "Tt", text: "Tt", answer: 0 },
              { id: "tt", text: "tt", answer: 1 },
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
              prompt: "A pea plant has the genotype Pp. What color are its flowers?",
              choices: ["Purple", "White", "Light purple, a mix of both"],
              answer: 0,
              hint: "P is dominant. Is one copy of P enough to show?",
              explain: "One dominant allele is enough. A Pp plant has purple flowers, and it carries the hidden white allele.",
            },
            {
              id: "q2",
              prompt: "Which genotype is homozygous recessive?",
              choices: ["TT", "Tt", "tt"],
              answer: 2,
              hint: "Homozygous means both alleles are the same. Recessive alleles use lowercase letters.",
              explain: "tt has two copies of the recessive allele, so it is homozygous recessive. TT is homozygous dominant, and Tt is heterozygous.",
            },
            {
              id: "q3",
              prompt: "In one generation of peas, Mendel counted 5,474 round seeds and 1,850 wrinkled seeds. About what ratio is that?",
              choices: ["1 : 1", "2 : 1", "3 : 1", "4 : 1"],
              answer: 2,
              hint: "Divide 5,474 by 1,850.",
              explain: "5,474 ÷ 1,850 is about 2.96, very close to 3 : 1. That is the ratio expected when two heterozygous plants are crossed.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Draw the missing white flowers",
          brief: "Use drawings to explain how white flowers skipped a generation. You need paper and colored pencils.",
          steps: [
            "Draw a purple-flowered plant labeled PP and a white-flowered plant labeled pp.",
            "Draw their offspring. Each gets one allele from each parent, so every offspring is Pp. Color the flowers.",
            "Now cross two Pp plants. List all four ways their alleles can pair up: P with P, P with p, p with P, and p with p.",
            "Color a flower for each pairing and count: how many purple, and how many white?",
            "Use your drawings to explain to someone at home how the white flowers skipped a generation.",
          ],
        },
      ],
    },
    {
      id: "punnett",
      title: "Punnett squares and chance",
      summary: "Predict the offspring of a cross, and see why a prediction is a chance, not a promise.",
      minutes: 16,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "A Punnett square",
          blocks: [
            {
              type: "text",
              text: "A Punnett square predicts the offspring of a cross. Write one parent's two alleles across the top and the other parent's down the side. Fill each box with one letter from the top and one from the side.",
            },
            {
              type: "points",
              items: [
                "Cross Pp × Pp. Top: P and p. Side: P and p.",
                "The four boxes: PP, Pp, Pp, pp.",
                "Genotypes: 1 PP : 2 Pp : 1 pp.",
                "Phenotypes: 3 purple : 1 white.",
              ],
            },
            {
              type: "visual",
              visual: { kind: "fraction", parts: 4, shaded: 1 },
              alt: "A bar cut into 4 equal parts with 1 part shaded: 1 of the 4 boxes, pp, gives white flowers.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Chances, not promises",
          blocks: [
            { type: "text", text: "Each box is one equally likely outcome. In Pp × Pp, each seed has a 1 in 4 chance of being pp. That is 25%." },
            {
              type: "text",
              text: "Each offspring is a new chance, like a new coin flip. Four seeds could all be purple, or two could be white. The 3 : 1 ratio shows up clearly only with many offspring, which is why Mendel counted thousands of plants.",
            },
          ],
        },
        {
          id: "s3",
          kind: "interactive",
          title: "The chance of white",
          prompt: "Two Pp plants are crossed. Show the chance that one offspring has white flowers, as a fraction of the 4 boxes.",
          widget: { kind: "fraction-bar", parts: 1, shaded: 0, target: { parts: 4, shaded: 1 } },
        },
        {
          id: "s4",
          kind: "slide",
          title: "A different cross",
          blocks: [
            { type: "text", text: "Now cross a Pp plant with a pp plant. Top: P and p. Side: p and p." },
            {
              type: "points",
              items: ["The four boxes: Pp, pp, Pp, pp.", "Genotypes: 2 Pp : 2 pp.", "Phenotypes: 2 purple : 2 white, which is the same as 1 : 1."],
            },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "White this time",
          prompt: "In the cross Pp × pp, show the chance that an offspring has white flowers, as a fraction of the 4 boxes.",
          widget: { kind: "fraction-bar", parts: 1, shaded: 0, target: { parts: 4, shaded: 2 } },
        },
        {
          id: "s6",
          kind: "slide",
          title: "When DNA changes",
          blocks: [
            {
              type: "text",
              text: "Sometimes DNA changes. A change in DNA is called a mutation. Mutations can happen when DNA is copied, or be caused by things like strong ultraviolet light.",
            },
            {
              type: "text",
              text: "Many mutations have no effect. Some are harmful, and a few are helpful. Only mutations in egg or sperm cells can be passed on to offspring.",
            },
          ],
        },
        {
          id: "s7",
          kind: "quiz",
          title: "Check what you know",
          questions: [
            {
              id: "q1",
              prompt: "Two Tt pea plants are crossed (T = tall, t = short). What fraction of the offspring are expected to be short?",
              choices: ["1/4", "1/2", "3/4", "0"],
              answer: 0,
              hint: "Draw the square. Which boxes have two lowercase t's?",
              explain: "The boxes are TT, Tt, Tt and tt. Only tt is short: 1 of the 4 boxes, or 1/4.",
            },
            {
              id: "q2",
              prompt: "A TT plant is crossed with a tt plant. What percent of the offspring are expected to be tall?",
              choices: ["25%", "50%", "75%", "100%"],
              answer: 3,
              hint: "Every offspring gets one allele from each parent. What can the TT parent give?",
              explain: "Every box is Tt. Each offspring gets T from one parent and t from the other. T is dominant, so 100% are tall.",
            },
            {
              id: "q3",
              prompt: "Two Pp plants make 4 seeds, and none of them grow white flowers. Does that mean the Punnett square was wrong?",
              choices: [
                "Yes. Exactly 1 of the 4 should have been white.",
                "No. Each seed had a 1 in 4 chance of being white, so getting none in only 4 seeds is quite possible.",
              ],
              answer: 1,
              hint: "Is a 1 in 4 chance a promise that exactly 1 of 4 will happen?",
              explain:
                "A Punnett square gives chances. The chance that all 4 seeds are purple is (3/4)⁴, about 32%, so it happens often. With hundreds of seeds, close to 1/4 would be white.",
            },
          ],
        },
        {
          id: "s8",
          kind: "project",
          title: "Flip for flowers",
          brief: "Use coins to act out a Pp × Pp cross many times. You need two coins and a notebook.",
          steps: [
            "Each coin is one Pp parent. Heads passes on P, and tails passes on p.",
            "Flip both coins together to make one offspring. Write down its genotype: PP, Pp or pp.",
            "Repeat until you have 40 offspring.",
            "Count the pp offspring. The Punnett square predicts about 1/4 of 40, which is 10. How close did you get?",
            "Flip 40 more, or add someone else's results to yours. Does the total come closer to 1/4?",
          ],
        },
      ],
    },
  ],
};

/** Practice on the skill map that fits each lesson (lesson id → skill ids). */
export const practice: Record<string, string[]> = {
  "genes-dna": ["s.cells"],
  "dominant-recessive": ["s.genetics"],
  punnett: ["s.genetics"],
};

export default heredity;
