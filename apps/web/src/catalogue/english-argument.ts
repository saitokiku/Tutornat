import type { CatalogueEntry } from "./types";

const argument: CatalogueEntry = {
  id: "english-argument",
  title: "Claim, evidence, reasoning",
  summary: "Build an argument from a clear claim, evidence a reader can check, and reasoning that connects the two.",
  subject: "english",
  grade: "7",
  locale: "en",
  lessons: [
    {
      id: "three-parts",
      title: "The three parts of an argument",
      summary: "A claim takes a position, evidence supports it, and reasoning explains why the evidence matters.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Claim, evidence, reasoning",
          blocks: [
            { type: "text", text: "In writing, an argument is a position backed up with support, so a reader can judge it. It has three parts." },
            {
              type: "points",
              items: [
                "Claim: a statement that answers the question and takes a side someone could disagree with.",
                "Evidence: facts, numbers, examples or quotes that support the claim. A reader can check them.",
                "Reasoning: the explanation of how the evidence supports the claim.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "A short example",
          blocks: [
            { type: "text", text: "Question: Is a bike helmet worth wearing?" },
            { type: "text", text: "Claim: You should wear a helmet every time you ride a bike." },
            {
              type: "text",
              text: "Evidence: A large review of bike crash studies found that riders wearing helmets were much less likely to have a serious head injury — roughly two-thirds less likely.",
            },
            {
              type: "text",
              text: "Reasoning: A serious head injury can affect the rest of your life, and a helmet takes seconds to put on. That small effort is worth the protection.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Read an argument",
          blocks: [
            {
              type: "text",
              text: "A student wrote this for the school newspaper. The question: should our school start at 8:30 a.m. instead of 7:30?",
            },
            { type: "text", text: "Our school should start at 8:30 a.m." },
            {
              type: "text",
              text: "The American Academy of Pediatrics, a national group of children's doctors, recommends that middle and high schools start at 8:30 or later. These doctors study children's health for a living, so their advice should carry weight.",
            },
            {
              type: "text",
              text: "Sleep experts say teens need 8 to 10 hours of sleep a night. In a survey at our school, 7 out of 10 students said they feel sleepy in first period.",
            },
            { type: "text", text: "Well-rested students pay attention better, so a later start would help us learn." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Take it apart",
          prompt: "Sort each sentence from the student's argument: is it the claim, evidence, or reasoning?",
          widget: {
            kind: "sorter",
            categories: ["Claim", "Evidence", "Reasoning"],
            items: [
              { id: "aap", text: "Children's doctors recommend that middle and high schools start at 8:30 or later.", answer: 1 },
              { id: "claim", text: "Our school should start at 8:30 a.m.", answer: 0 },
              { id: "focus", text: "Well-rested students pay attention better, so a later start would help us learn.", answer: 2 },
              { id: "sleep", text: "Sleep experts say teens need 8 to 10 hours of sleep a night.", answer: 1 },
              { id: "weight", text: "These doctors study children's health for a living, so their advice should carry weight.", answer: 2 },
              { id: "survey", text: "In our survey, 7 out of 10 students said they feel sleepy in first period.", answer: 1 },
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
              prompt: "Which sentence is a claim?",
              choices: [
                "Our town's library is open 40 hours a week.",
                "Our town's library should stay open on Sundays.",
                "Many families work on weekdays.",
              ],
              answer: 1,
              hint: "A claim takes a side that someone could argue against.",
              explain:
                "“Should stay open on Sundays” takes a position someone could disagree with. The other two are facts that could be used as evidence.",
            },
            {
              id: "q2",
              prompt:
                "Claim: Our class should plant a vegetable garden behind the school. Evidence: The empty lot behind the school gets full sun most of the day. Which is the best reasoning?",
              choices: [
                "Most vegetables need at least six hours of sun a day, so the lot is a good place for a garden.",
                "Gardens are fun to have.",
                "The lot is behind the school.",
              ],
              answer: 0,
              hint: "Good reasoning doesn't just repeat the evidence or give an opinion. It explains why the evidence matters for the claim.",
              explain:
                "The first choice connects the evidence (full sun) to the claim (plant a garden) with a reason: vegetables need sun. The second is an opinion, and the third only repeats the evidence.",
            },
            {
              id: "q3",
              prompt: "A student claims, “Our school should ban phones in class,” and gives this evidence: “I don't like phones.” What is the problem?",
              choices: [
                "It's a personal feeling, not evidence a reader can check.",
                "The claim is too short.",
                "Nothing. It's strong evidence.",
              ],
              answer: 0,
              hint: "Evidence is something a reader can check, like a fact, a number or an example.",
              explain:
                "“I don't like phones” is a feeling, and a reader can't check it. Evidence should be facts, data or examples that support the claim.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Argue a question at home",
          brief: "Pick a real question your family could decide, such as “Should we eat dinner without screens?” or “Should I get a later bedtime on Fridays?”, and argue it in one paragraph.",
          steps: [
            "Write your claim in one sentence that clearly takes a side.",
            "Gather two pieces of evidence someone could check: a fact, a number, or something that actually happened.",
            "For each piece of evidence, write a sentence of reasoning that explains how it supports your claim.",
            "Read the paragraph to someone at home. Ask them to point to your claim, your evidence and your reasoning.",
            "Ask them for one reason on the other side. Decide whether your claim still holds, and why.",
          ],
        },
      ],
    },
    {
      id: "strong-evidence",
      title: "Strong and weak evidence",
      summary: "Choose evidence that is relevant, checkable and from a source you can trust.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Three tests for evidence",
          blocks: [
            {
              type: "points",
              items: [
                "Relevant: it supports this claim, not just the general topic.",
                "Checkable: a reader could look it up or see it for themselves.",
                "Trustworthy: it comes from a source that knows the subject and has no strong reason to mislead.",
              ],
            },
            { type: "text", text: "Evidence that passes all three tests is strong. Evidence that fails one is weak, even if it sounds impressive." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Weighing sources",
          blocks: [
            {
              type: "text",
              text: "A source is where a piece of evidence comes from. Ask who made it, how they know, and what they gain if you believe it.",
            },
            {
              type: "points",
              items: [
                "Usually stronger: a report from a government health agency, a study published by researchers, a careful survey of many people.",
                "Usually weaker: an ad from a company selling the product, a post from an anonymous account, one friend's story.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "One claim, three kinds of evidence",
          blocks: [
            { type: "text", text: "Claim: Our town should add bike lanes on Main Street." },
            {
              type: "points",
              items: [
                "Weak, not checkable: “Everyone I know wants bike lanes.”",
                "Weak, not relevant: “Biking is a fun hobby.”",
                "Strong: “The town's traffic count found an average of 120 cyclists on Main Street each weekday.”",
              ],
            },
            {
              type: "text",
              text: "The traffic count is about this street, a reader can request it, and it comes from the people whose job is to count traffic.",
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Strong or weak?",
          prompt: "Claim: Our school should make the lunch period longer. Sort each piece of evidence.",
          widget: {
            kind: "sorter",
            categories: ["Strong evidence", "Weak evidence"],
            items: [
              { id: "records", text: "The cafeteria's records show students wait in line about 12 minutes of a 25-minute lunch.", answer: 0 },
              { id: "hungry", text: "I'm always hungry after lunch.", answer: 1 },
              { id: "best", text: "Lunch is the best part of the day.", answer: 1 },
              { id: "survey", text: "In a survey of 300 students at our school, 64% said they often can't finish eating before the bell.", answer: 0 },
              { id: "ad", text: "A snack company's ad says kids need more time to eat.", answer: 1 },
              { id: "cousin", text: "My cousin's school has a long lunch.", answer: 1 },
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
              prompt: "Claim: Students should be allowed to keep water bottles at their desks. Which evidence is most relevant?",
              choices: [
                "Water covers most of Earth's surface.",
                "Studies have found that even mild dehydration can make it harder to concentrate.",
                "Our school's water fountains are painted blue.",
              ],
              answer: 1,
              hint: "Relevant evidence supports the claim, not just the topic of water.",
              explain:
                "Only the studies connect drinking water to how well students can focus in class. The other two are about water, but they don't support the claim.",
            },
            {
              id: "q2",
              prompt: "Which source is most trustworthy for evidence about how much sleep teens need?",
              choices: ["A mattress company's ad", "A report from a national group of sleep doctors", "A post from an anonymous account"],
              answer: 1,
              hint: "Ask who knows the subject, and who gains if you believe them.",
              explain: "Sleep doctors study the subject. A mattress company profits if you buy, and an anonymous post can't be checked.",
            },
            {
              id: "q3",
              prompt: "Claim: Our park needs more trash cans. Evidence: “It's really messy.” How could you make this evidence stronger?",
              choices: [
                "Say it louder, with an exclamation point.",
                "Count the litter along one path on three different days and report the numbers.",
                "Add that parks are important.",
              ],
              answer: 1,
              hint: "Strong evidence is something a reader can check.",
              explain: "Counting the litter turns a vague impression into numbers a reader could check. The other choices add feeling, not evidence.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Evidence check",
          brief: "Grade the evidence in a real piece of persuasion.",
          steps: [
            "Find an opinion piece, a product review or an ad that makes a claim.",
            "Underline every piece of evidence it uses.",
            "Test each piece: is it relevant, checkable and from a trustworthy source? Write R, C and T next to it for each test it passes.",
            "Choose the weakest piece. Write a stronger replacement, and say where you would find it.",
            "Explain your ratings to someone at home. Ask whether they agree with each one.",
          ],
        },
      ],
    },
    {
      id: "reasoning",
      title: "Reasoning that connects",
      summary: "Explain why your evidence matters, using a rule or idea your reader already accepts.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "The bridge",
          blocks: [
            { type: "text", text: "Reasoning explains why the evidence supports the claim. It is the bridge between them." },
            {
              type: "text",
              text: "Strong reasoning often rests on a general rule or idea the reader already accepts. Some writers call this rule a warrant.",
            },
            {
              type: "points",
              items: [
                "Claim: You should bring an umbrella today.",
                "Evidence: The forecast shows a 90% chance of rain this afternoon.",
                "Reasoning: When rain is that likely, it makes sense to be ready for it, and an umbrella keeps you dry.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Repeating isn't reasoning",
          blocks: [
            { type: "text", text: "Weak reasoning repeats the evidence or the claim in different words. It doesn't explain anything new." },
            {
              type: "points",
              items: [
                "Repeats: “The forecast says rain, so it's going to rain.”",
                "Connects: “Rain is very likely, and my walk home takes 20 minutes, so an umbrella will keep me and my books dry.”",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Know your reader",
          blocks: [
            { type: "text", text: "A rule only works if your reader accepts it. Choose one that matters to them." },
            {
              type: "text",
              text: "To a teacher: our class should visit the science museum, because it has a hands-on chemistry lab.",
            },
            {
              type: "points",
              items: [
                "Weak for this reader: “Field trips get us out of class.”",
                "Strong for this reader: “We're studying chemical changes this month, and doing experiments helps students remember what they learn.”",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Connect or repeat?",
          prompt:
            "Claim: The library should stay open until 5 p.m. Evidence: 40 students a day wait in the hallway for rides after school ends at 3:15. Sort each line of reasoning.",
          widget: {
            kind: "sorter",
            categories: ["Strong reasoning", "Weak reasoning"],
            items: [
              { id: "safe", text: "Those students would have a quiet, supervised place to do homework while they wait.", answer: 0 },
              { id: "wait", text: "Lots of students wait after school.", answer: 1 },
              { id: "open", text: "The library should be open later.", answer: 1 },
              { id: "behind", text: "Students who start homework at school are less likely to fall behind, and these students already have the time.", answer: 0 },
              { id: "nice", text: "Libraries are nice.", answer: 1 },
              { id: "hallway", text: "A supervised room is safer than an empty hallway, and the library already has the space.", answer: 0 },
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
                "Claim: The cafeteria should offer a vegetarian main dish every day. Evidence: In a survey, 1 in 5 students said they don't eat meat. Which is the strongest reasoning?",
              choices: [
                "Every student should be able to eat a school lunch, and right now 1 in 5 can't eat the main dish.",
                "1 in 5 students don't eat meat.",
                "Vegetables are colorful.",
              ],
              answer: 0,
              hint: "Look for the choice that explains why the number matters.",
              explain:
                "The first choice uses a rule most readers accept, that every student should be able to eat lunch, and links it to the survey. The second only repeats the evidence.",
            },
            {
              id: "q2",
              prompt: "In an argument, what is a warrant?",
              choices: ["A piece of evidence with numbers", "The rule or idea that links the evidence to the claim", "The other side's argument"],
              answer: 1,
              hint: "It's part of the reasoning, not part of the evidence.",
              explain:
                "A warrant is the general rule that explains why the evidence supports the claim, such as “every student should be able to eat lunch.”",
            },
            {
              id: "q3",
              prompt: "A student writes to the principal: “Recess is fun, so it should be longer.” Why might this reasoning fail?",
              choices: [
                "The principal may not accept “fun” as a reason to change the schedule.",
                "It is too long.",
                "It uses evidence.",
              ],
              answer: 0,
              hint: "Who is the reader, and what do they care about?",
              explain:
                "Reasoning works only if the reader accepts the rule behind it. A principal cares about learning and health, so a reason about how breaks help students focus would land better.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Build the bridge",
          brief: "Write reasoning for a real request, aimed at the person who decides.",
          steps: [
            "Pick something you'd like changed at home or at school, and the person who decides.",
            "Write your claim and one piece of evidence for it.",
            "Write the rule that connects them. Ask yourself: would this person accept this rule?",
            "Write your reasoning in one or two sentences that link the evidence to the claim.",
            "Read it to that person. If they don't accept your rule, find one they do accept and rewrite it.",
          ],
        },
      ],
    },
    {
      id: "counterclaims",
      title: "Answering the other side",
      summary: "Name the opposing view, called a counterclaim, and respond to it with evidence.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "The other side",
          blocks: [
            { type: "text", text: "A counterclaim is an argument against your claim. Strong writers name it, then answer it." },
            {
              type: "points",
              items: [
                "Name it fairly: describe the other side the way someone who believes it would.",
                "Answer it with evidence: show why your claim still holds, or admit where the other side has a point.",
                "Your answer to a counterclaim is called a rebuttal.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "An example",
          blocks: [
            { type: "text", text: "Claim: Our school should start at 8:30 a.m." },
            {
              type: "text",
              text: "Counterclaim: Some parents say a later start would make it hard for them to get to work on time.",
            },
            {
              type: "text",
              text: "Rebuttal: That's a real concern. The school already opens the gym at 7:30 for sports practice, so it could open it for any student who needs to arrive early.",
            },
            {
              type: "points",
              items: [
                "To name a counterclaim: “Some people argue that…”",
                "To admit a fair point: “It's true that…, but…”",
                "To answer with evidence: “However, the evidence shows…”",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Answer, don't dodge",
          blocks: [
            {
              type: "text",
              text: "A weak rebuttal attacks the people on the other side or ignores their point. A strong one deals with their actual reason.",
            },
            { type: "text", text: "Counterclaim: A later start time would make bus service cost more." },
            {
              type: "points",
              items: [
                "Weak rebuttal: “People who say that just don't care about students.”",
                "Strong rebuttal: “Bus costs might rise, but the district's own estimate puts the change at under 1% of its transportation budget.”",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Claim, counterclaim or rebuttal?",
          prompt: "These sentences come from one student's argument about a skate park. Sort each one.",
          widget: {
            kind: "sorter",
            categories: ["Claim", "Counterclaim", "Rebuttal"],
            items: [
              { id: "claim", text: "Our town should build a skate park in Riverside Park.", answer: 0 },
              { id: "noise", text: "Some neighbors worry that a skate park would be noisy.", answer: 1 },
              {
                id: "distance",
                text: "The planned spot is 300 feet from the nearest house, behind the ball fields, where games are already loud.",
                answer: 2,
              },
              { id: "cost", text: "Others argue that the town can't afford it.", answer: 1 },
              { id: "grant", text: "A state grant would pay for half, and local businesses have pledged $20,000 more.", answer: 2 },
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
              prompt: "A student argues that her class should get a classroom pet. Which sentence states a counterclaim?",
              choices: [
                "Our class should get a classroom pet.",
                "Some students say a pet would be distracting during lessons.",
                "Caring for a pet teaches responsibility.",
              ],
              answer: 1,
              hint: "A counterclaim argues against the writer's claim.",
              explain: "“A pet would be distracting” is the opposing view. The first sentence is the claim, and the third supports it.",
            },
            {
              id: "q2",
              prompt:
                "Counterclaim: “Homework helps students practice what they learned.” Which is the strongest rebuttal for a writer who wants less homework?",
              choices: [
                "Homework is boring.",
                "Practice does help, but our survey found most students spend over two hours a night, more than twice the school's own one-hour guideline.",
                "People who like homework are wrong.",
              ],
              answer: 1,
              hint: "A strong rebuttal deals with the other side's reason and uses evidence.",
              explain: "The second choice admits the other side's point, then answers it with evidence. The other two dodge the point or attack people.",
            },
            {
              id: "q3",
              prompt: "Why include a counterclaim at all?",
              choices: [
                "It shows you've considered other views, which makes your argument more convincing.",
                "It makes the essay longer.",
                "It proves the other side is right.",
              ],
              answer: 0,
              hint: "Think about a reader who disagrees with you. What would they want to see?",
              explain: "Readers who disagree trust an argument more when it takes their concern seriously and answers it.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Argue with the other side in mind",
          brief: "Write a paragraph that names and answers the strongest reason against you.",
          steps: [
            "Choose a question your family disagrees about, such as a chore or a weekend plan.",
            "Write your claim and one piece of evidence for it.",
            "Ask someone at home for the strongest reason against your claim. Write it down fairly, in words they would agree with.",
            "Write a rebuttal: admit what's fair in their point, then answer it with evidence.",
            "Read the whole paragraph to them. Ask whether you described their view fairly.",
          ],
        },
      ],
    },
  ],
};

export default argument;
