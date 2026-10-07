import type { CatalogueEntry } from "./types";

// Practice skills this course teaches toward: e.thesis, e.claim.evidence (lesson 3), e.concision (lesson 4).

const thesis: CatalogueEntry = {
  id: "english-thesis",
  title: "Writing a thesis that holds up",
  summary: "Write the one-sentence claim an essay is built on: arguable, specific and focused, with reasons the evidence can carry.",
  subject: "english",
  grade: "9",
  locale: "en",
  lessons: [
    {
      id: "what-thesis",
      title: "What a thesis does",
      summary: "A thesis is the main claim of an essay. Everything else in the essay is there to support it.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "The sentence an essay stands on",
          blocks: [
            {
              type: "text",
              text: "A thesis statement is the main claim of an essay, usually in one or two sentences. Every body paragraph exists to support it, so if the thesis is weak, the whole essay wobbles.",
            },
            {
              type: "points",
              items: [
                "In most school essays, it comes at the end of the introduction.",
                "It answers the question the essay explores. “Should our school start later?” becomes “Our school should start at 8:30 a.m. because teenagers learn better with more sleep.”",
                "It's a claim. It isn't a topic, a fact or a question.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "What a thesis is not",
          blocks: [
            {
              type: "points",
              items: [
                "A topic: “School start times.” It names a subject but says nothing about it.",
                "A fact: “Our school starts at 7:30 a.m.” True, but there's nothing to argue.",
                "A question: “Should school start later?” A good question for an essay to explore, but the thesis is your answer.",
                "An announcement: “In this essay, I will discuss school start times.” It promises a topic without making a claim.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "From question to thesis",
          blocks: [
            { type: "text", text: "One reliable way to write a thesis: start with a question, answer it, then add your main reason." },
            {
              type: "points",
              items: [
                "Question: “Should students be allowed to use phones during lunch?”",
                "Answer: “Students should be allowed to use phones during lunch.”",
                "Answer and reason: “Students should be allowed to use phones during lunch because it's the only time many of them can reach family members who work during the day.”",
              ],
            },
            { type: "text", text: "The reason tells your reader what the body paragraphs will prove." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Thesis or not?",
          prompt: "Sort each sentence. Is it a thesis, or one of the things a thesis is not?",
          widget: {
            kind: "sorter",
            categories: ["Thesis", "Topic", "Fact", "Question or announcement"],
            items: [
              {
                id: "bike-thesis",
                text: "Our town should add bike lanes on River Road because it's the only direct route from the east side to the high school.",
                answer: 0,
              },
              { id: "bike-topic", text: "Bike lanes", answer: 1 },
              { id: "bike-fact", text: "River Road is two miles long.", answer: 2 },
              { id: "bike-question", text: "Should our town add bike lanes?", answer: 3 },
              {
                id: "cook-thesis",
                text: "Schools should teach students to cook because knowing how to make simple meals saves money and builds healthy habits.",
                answer: 0,
              },
              { id: "cook-topic", text: "Cooking classes", answer: 1 },
              { id: "cook-fact", text: "Our cafeteria serves lunch from 11:00 to 1:00.", answer: 2 },
              { id: "cook-announce", text: "In this essay, I will talk about cooking classes.", answer: 3 },
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
              prompt: "Which sentence is a thesis statement?",
              choices: [
                "Many teenagers have part-time jobs.",
                "Do part-time jobs help teenagers?",
                "A part-time job during the school year can teach teenagers to manage money, as long as it stays under about ten hours a week.",
                "This essay is about part-time jobs.",
              ],
              answer: 2,
              hint: "Look for a claim that someone could disagree with.",
              explain: "The third choice takes a position and sets a limit on it. The first is a fact, the second is a question and the fourth is an announcement.",
            },
            {
              id: "q2",
              prompt: "Where does the thesis usually go in a school essay?",
              choices: ["At the end of the introduction", "In the middle of the second body paragraph", "Only in the conclusion", "In the title"],
              answer: 0,
              hint: "The reader needs the claim before the body paragraphs start proving it.",
              explain: "Placing the thesis at the end of the introduction tells the reader what the rest of the essay will prove. The conclusion often returns to it in new words.",
            },
            {
              id: "q3",
              prompt: "Why is “In this essay, I will discuss recycling” a weak thesis?",
              choices: ["It announces a topic without making a claim", "It's too short", "It uses the word “I”", "Recycling isn't a good topic"],
              answer: 0,
              hint: "After reading it, what do you know about the writer's position?",
              explain: "The sentence tells you the topic but not what the writer thinks about it. A thesis has to take a position, such as what our school should change about recycling and why.",
            },
            {
              id: "q4",
              prompt: "Turn this question into a thesis: “Should our library lend board games?” Which works best?",
              choices: [
                "Our library should lend board games because they bring in families who might not visit otherwise.",
                "Board games are fun.",
                "Some libraries lend board games.",
                "Should our library lend board games? Let's find out.",
              ],
              answer: 0,
              hint: "Answer the question, then give a reason.",
              explain: "The first choice answers the question and gives a reason the essay can prove. The others are an opinion with no position on the question, a fact and a repeat of the question.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Question to thesis",
          brief: "Turn real questions from your life into thesis statements.",
          steps: [
            "Write three questions about your school, town or home that people disagree about.",
            "Answer each one in a single sentence.",
            "Add your main reason to each answer with “because.”",
            "Read them to someone at home. Ask which one they'd most want to argue with, and why.",
          ],
        },
      ],
    },
    {
      id: "three-tests",
      title: "Arguable, specific, focused",
      summary: "Three tests separate a thesis that holds up from one that falls apart.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Test 1: arguable",
          blocks: [
            {
              type: "text",
              text: "A thesis is arguable when a thoughtful person could disagree with it. If nobody could, there's nothing to prove.",
            },
            {
              type: "points",
              items: [
                "Not arguable: “Exercise is good for your health.” Almost everyone already agrees.",
                "Arguable: “Our school should require 20 minutes of physical activity every day, even on days without gym class.”",
                "Arguable doesn't mean extreme. It means there's a real question with reasonable people on more than one side.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Test 2: specific",
          blocks: [
            { type: "text", text: "Vague words like good, bad, things, society or a big deal leave the reader guessing what you mean." },
            {
              type: "points",
              items: [
                "Vague: “Social media is bad for teens.”",
                "Specific: “Scrolling social media late at night cuts into teenagers' sleep, so families should have phones charge outside bedrooms overnight.”",
              ],
            },
            { type: "text", text: "Replace each vague word with the exact thing you mean. Bad how? For whom? When?" },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Test 3: focused",
          blocks: [
            {
              type: "text",
              text: "A focused thesis can be proved in the space you have. A five-paragraph essay can't prove a claim about all of history.",
            },
            {
              type: "points",
              items: [
                "Too broad: “Technology has changed the world.”",
                "Focused: “Letting students use calculators on middle school math tests does more good than harm, as long as they learn to estimate first.”",
              ],
            },
            { type: "text", text: "When a thesis is too broad, narrow the who, the where or the when." },
          ],
        },
        {
          id: "s4",
          kind: "slide",
          title: "Watch a thesis improve",
          blocks: [
            {
              type: "points",
              items: [
                "Draft: “Lunch is important.” Vague, and nobody would disagree.",
                "Arguable: “Our school's lunch period should be longer.” Better, but how much longer, and why?",
                "Specific and focused: “Our school should extend lunch from 25 to 40 minutes, because students at the end of the line have less than ten minutes to eat.”",
              ],
            },
            { type: "text", text: "Each revision answers a question the last one left open." },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Which test does it fail?",
          prompt: "Each thesis fails one of the three tests, or passes all of them. Sort them.",
          widget: {
            kind: "sorter",
            categories: ["Not arguable", "Too vague", "Too broad", "Holds up"],
            items: [
              { id: "seatbelts", text: "Seat belts save lives in car crashes.", answer: 0 },
              { id: "bullying", text: "Bullying hurts people.", answer: 0 },
              { id: "schedule", text: "The new schedule has some good and bad things about it.", answer: 1 },
              { id: "cafeteria", text: "Our cafeteria's food could be better in some ways.", answer: 1 },
              { id: "four-day", text: "Every country should switch to a four-day school week.", answer: 2 },
              { id: "homework", text: "Every school in the world should get rid of homework.", answer: 2 },
              {
                id: "library",
                text: "Our school should open the library at 7:30 a.m. so students who arrive early on the bus have a quiet place to study.",
                answer: 3,
              },
              {
                id: "recycling",
                text: "Our town should put a recycling bin next to every trash can in its parks, since the parks have no recycling bins now.",
                answer: 3,
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
              prompt: "Which thesis is arguable?",
              choices: [
                "Our school should replace paper textbooks with tablets in every class.",
                "Many schools use textbooks.",
                "Textbooks have pages.",
                "Tablets are electronic devices.",
              ],
              answer: 0,
              hint: "Which one could a thoughtful person disagree with?",
              explain: "Replacing every textbook with tablets is a real debate with reasons on both sides. The other three are facts nobody would argue with.",
            },
            {
              id: "q2",
              prompt: "What makes “Social media has good and bad effects” a weak thesis?",
              choices: [
                "It's too vague: it doesn't say which effects or what should happen",
                "It's too specific",
                "It's a question",
                "It names too many reasons",
              ],
              answer: 0,
              hint: "After reading it, what exactly would the essay prove?",
              explain: "Almost anything has good and bad effects. Naming the effects, the people affected and what should change would make it specific enough to argue.",
            },
            {
              id: "q3",
              prompt: "Which revision best narrows “Pollution is a problem in the world”?",
              choices: [
                "Our city should ban idling cars outside schools, because exhaust at pickup time collects right where students wait.",
                "Pollution is a very big problem in the whole world.",
                "Pollution is bad.",
                "There are many kinds of pollution.",
              ],
              answer: 0,
              hint: "Look for a who, a where and a clear claim.",
              explain: "The first choice narrows the place, the cause and the action, so a short essay could prove it. The others stay vague, broad or factual.",
            },
            {
              id: "q4",
              prompt: "A thesis passes all three tests. What does that guarantee?",
              choices: [
                "That it can be argued and proved, if you find the evidence",
                "That everyone will agree with it",
                "That the essay is finished",
                "That no evidence is needed",
              ],
              answer: 0,
              hint: "The tests check the claim, not the proof.",
              explain: "The three tests make a thesis worth arguing. The essay still has to prove it with evidence, and some readers will still disagree. That's what makes it arguable.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Thesis makeover",
          brief: "Put one of your own theses through the three tests.",
          steps: [
            "Find a thesis you wrote for school, or write one about a rule you'd change.",
            "Run the three tests and write down which ones it fails.",
            "Revise it until it passes all three.",
            "Read the old and new versions to someone at home. Ask which one tells them more clearly what you'll prove.",
          ],
        },
      ],
    },
    {
      id: "reasons-evidence",
      title: "Reasons and evidence",
      summary: "A strong thesis points to its reasons, and every reason needs evidence. When the evidence disagrees, the thesis changes.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "A thesis with a road map",
          blocks: [
            {
              type: "text",
              text: "Many theses name the reasons the essay will develop. Readers then know what each body paragraph will prove.",
            },
            {
              type: "points",
              items: [
                "Claim only: “Our school should start at 8:30 a.m.”",
                "Claim with reasons: “Our school should start at 8:30 a.m. because students would sleep more, arrive on time more often and do better in first-period classes.”",
              ],
            },
            { type: "text", text: "Each reason becomes a body paragraph, and each one needs its own evidence." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Make room for the other side",
          blocks: [
            {
              type: "text",
              text: "Starting a thesis with “although” or “while” shows you know the strongest objection and still hold your position.",
            },
            {
              type: "points",
              items: [
                "“Although a later start would push sports practices later, our school should start at 8:30 a.m. because students need more sleep to learn well.”",
                "The first part admits a real cost. The second part says why the claim still wins.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "A working thesis",
          blocks: [
            {
              type: "text",
              text: "Your first thesis is a working thesis: a best guess you test against the evidence. If research shows something you didn't expect, change the thesis instead of ignoring the evidence.",
            },
            {
              type: "points",
              items: [
                "Working thesis: “Our town should build a skate park because teenagers have nowhere to go after school.”",
                "Then you find out the community center already runs free after-school programs, but it has no outdoor space.",
                "Revised: “Our town should build a skate park next to the community center, so its after-school programs gain the outdoor space they lack.”",
              ],
            },
            { type: "text", text: "Changing a thesis to fit the evidence isn't losing. It's how a thesis comes to hold up." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Does it support the thesis?",
          prompt:
            "Thesis: “Our school should add a water fountain on the third floor, because students there have to walk down two floors to get a drink.” Sort each piece of evidence.",
          widget: {
            kind: "sorter",
            categories: ["Supports the thesis", "Doesn't support it"],
            items: [
              { id: "first-floor", text: "The school's only water fountains are on the first floor, and the third floor has eight classrooms.", answer: 0 },
              { id: "teachers", text: "Third-floor teachers say students often ask to leave class to get water.", answer: 0 },
              { id: "survey", text: "In a hallway survey, 40 of 50 third-floor students said they skip drinking water during the school day.", answer: 0 },
              { id: "gym", text: "The school gym was painted last summer.", answer: 1 },
              { id: "juice", text: "Some students prefer juice to water.", answer: 1 },
              { id: "bottled", text: "The cafeteria sells bottled water at lunch.", answer: 1 },
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
                "Thesis: “Our town should keep the public pool open until 9 p.m. in summer, because many families can't get there before evening.” Which evidence supports it best?",
              choices: [
                "In a survey of pool members, most of the parents who answered said they work until 6 p.m. or later.",
                "The pool was built in 1985.",
                "Swimming is good exercise.",
                "The pool has a blue slide.",
              ],
              answer: 0,
              hint: "Which detail explains why families can't come earlier?",
              explain: "The survey speaks directly to the reason in the thesis: families can't come until evening. The other details are true-sounding but don't touch that reason.",
            },
            {
              id: "q2",
              prompt: "What does a thesis that begins with “Although” do?",
              choices: ["It admits an objection, then states the claim anyway", "It avoids taking a side", "It asks a question", "It lists every reason"],
              answer: 0,
              hint: "Read the two halves of an “although” thesis separately.",
              explain: "The “although” part names the strongest objection. The main part still takes a clear side, which shows the writer has weighed both.",
            },
            {
              id: "q3",
              prompt: "Halfway through your research, you find strong evidence against your working thesis. What should you do?",
              choices: [
                "Revise the thesis so it fits the evidence",
                "Leave the evidence out of the essay",
                "Keep the thesis and hope no one notices",
                "Give up on the topic",
              ],
              answer: 0,
              hint: "A working thesis is a guess you test.",
              explain: "The thesis should follow the evidence. Revising it, or narrowing it, keeps your argument honest and makes it stronger.",
            },
            {
              id: "q4",
              prompt: "A thesis names three reasons. How many body paragraphs does that usually suggest?",
              choices: ["Three, one for each reason", "One", "Ten", "None"],
              answer: 0,
              hint: "Each reason needs its own evidence.",
              explain: "A common plan gives each reason its own body paragraph with its own evidence. Longer essays may spend more than one paragraph on a reason.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Evidence check",
          brief: "Check that every reason in your thesis has evidence behind it.",
          steps: [
            "Take the thesis you revised in the last lesson.",
            "List the reasons it gives, or add two or three if it has none.",
            "For each reason, write one piece of evidence you have or could find: a fact, a number, an example or an expert.",
            "Mark any reason with no evidence. Cut it or find support for it.",
            "Write an “although” version of your thesis that admits the strongest objection.",
            "Explain your thesis and its reasons out loud to someone at home in under a minute.",
          ],
        },
      ],
    },
    {
      id: "test-revise",
      title: "Test it, then tighten it",
      summary: "Stress-test a thesis with hard questions, then cut the words that weaken it.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Three hard questions",
          blocks: [
            {
              type: "points",
              items: [
                "So what? Why should a reader care? If you can't answer, add what's at stake and for whom.",
                "How do you know? Can you name evidence for each reason?",
                "Who disagrees, and why? If nobody would, the thesis isn't arguable yet.",
              ],
            },
            { type: "text", text: "Ask them about your own thesis before a reader does." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Cut the cushioning",
          blocks: [
            { type: "text", text: "Wordy phrases make a thesis sound unsure and bury the claim." },
            {
              type: "points",
              items: [
                "“In my opinion, I think that…” The thesis is already your opinion. Cut both.",
                "“In this essay, I will prove that…” Make the claim instead.",
                "“Due to the fact that” becomes “because.”",
                "“It could possibly be argued that maybe…” Commit to a claim, then limit it where the evidence requires.",
              ],
            },
            {
              type: "text",
              text: "Before: “In my opinion, I think that our school should possibly consider starting later due to the fact that students are tired.” After: “Our school should start later because tired students learn less.”",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "A thesis about a text",
          blocks: [
            {
              type: "text",
              text: "Essays about literature need a thesis too. It makes an arguable claim about what a text means or how the writer creates an effect.",
            },
            {
              type: "points",
              items: [
                "Summary, not a thesis: “In Romeo and Juliet, two young people from feuding families fall in love and die.”",
                "Thesis: “Although the prologue calls them ‘star-crossed,’ Romeo and Juliet's own haste does more to cause the tragedy than fate does.”",
              ],
            },
            { type: "text", text: "Readers do argue about this, and you would prove it with details from the play." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Wordy or tight?",
          prompt: "Sort each thesis. Is it wordy, or tight and clear?",
          widget: {
            kind: "sorter",
            categories: ["Wordy", "Tight and clear"],
            items: [
              { id: "dog-wordy", text: "In my opinion, I personally believe that our town should maybe build a dog park.", answer: 0 },
              { id: "dog-tight", text: "Our town should build a dog park so dog owners stop using the school field.", answer: 1 },
              { id: "recess-wordy", text: "In this essay, I will be proving the point that recess should be longer.", answer: 0 },
              { id: "recess-tight", text: "Middle school recess should last 30 minutes because students focus better after a real break.", answer: 1 },
              { id: "bus-wordy", text: "Due to the fact that buses are often late, it is possibly the case that school could start later.", answer: 0 },
              { id: "bus-tight", text: "Because buses arrive late most mornings, our school should move first period to 8:15.", answer: 1 },
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
              prompt: "Which is the tightest version of “In my opinion, I think that our school should, in some ways, maybe have more art classes”?",
              choices: [
                "Our school should offer an art class every semester.",
                "I think, in my opinion, art classes should maybe be offered more.",
                "Art.",
                "In this essay, I will discuss art classes.",
              ],
              answer: 0,
              hint: "Cut the cushioning, keep the claim, and make “more” exact.",
              explain: "The first choice drops “in my opinion,” “I think” and “maybe,” and turns “more” into something exact: every semester. The others keep the padding or lose the claim.",
            },
            {
              id: "q2",
              prompt: "You ask “So what?” about your thesis and can't answer. What should you add?",
              choices: ["Why the claim matters: who is affected and how", "More adjectives", "A question at the end", "The word “definitely”"],
              answer: 0,
              hint: "“So what?” asks about stakes.",
              explain: "Readers care when they see who is affected and how. Adjectives and words like “definitely” add force without adding a reason.",
            },
            {
              id: "q3",
              prompt: "Which is a thesis about a text, rather than a fact or a summary?",
              choices: [
                "In Romeo and Juliet, the lovers' haste does more to cause the tragedy than fate does.",
                "Romeo and Juliet is a play by William Shakespeare.",
                "Romeo and Juliet meet at a party.",
                "Romeo and Juliet is set in Verona.",
              ],
              answer: 0,
              hint: "Which one could a reader argue against using the play itself?",
              explain: "The first makes an interpretive claim that readers debate and that details from the play can support. The others are facts about the play.",
            },
            {
              id: "q4",
              prompt: "Why cut “In this essay, I will prove that” from a thesis?",
              choices: [
                "The claim is stronger without it, and the reader already knows it's your essay",
                "It's grammatically wrong",
                "Teachers never allow the word “essay”",
                "It makes the thesis too specific",
              ],
              answer: 0,
              hint: "What does the phrase add to the claim itself?",
              explain: "The phrase is correct grammar, but it delays the claim and adds nothing to it. Starting with the claim sounds more confident and saves the reader time.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Your thesis, tested",
          brief: "Build a thesis for a real essay and put it through everything in this course.",
          steps: [
            "Choose an essay you have coming up, or a question you care about.",
            "Write a working thesis with your main reasons.",
            "Run the three tests: arguable, specific, focused.",
            "Ask the three hard questions: So what? How do you know? Who disagrees?",
            "Cut any cushioning words.",
            "Read the final thesis to someone at home and ask them to argue against it. Note what they say: that's your counterargument paragraph.",
          ],
        },
      ],
    },
  ],
};

export default thesis;
