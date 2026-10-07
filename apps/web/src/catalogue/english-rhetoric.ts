import type { CatalogueEntry } from "./types";

const rhetoric: CatalogueEntry = {
  id: "english-rhetoric",
  title: "Ethos, pathos, logos",
  summary: "Recognize and use the three classic appeals: credibility (ethos), emotion (pathos) and logic (logos).",
  subject: "english",
  grade: "9",
  locale: "en",
  lessons: [
    {
      id: "three-appeals",
      title: "Three ways to persuade",
      summary: "Speakers and writers persuade through trust, feeling and reason. Learn to name each appeal.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Three appeals",
          blocks: [
            {
              type: "text",
              text: "More than 2,300 years ago, the Greek philosopher Aristotle described three ways a speaker can persuade an audience. We still use his terms.",
            },
            {
              type: "points",
              items: [
                "Ethos: an appeal based on the speaker's credibility, meaning their knowledge, experience or character.",
                "Pathos: an appeal to the audience's emotions, such as hope, fear, pride or sympathy.",
                "Logos: an appeal to logic, using evidence, numbers and reasoning.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Ethos: the coach",
          blocks: [
            {
              type: "text",
              text: "Coach Rivera, before a cross-country meet: “I've raced and coached on this course for fifteen years. I know where people lose this race: on the first hill. Hold back there.”",
            },
            {
              type: "text",
              text: "Rivera persuades by reminding the team how well she knows the course. That is ethos: the audience trusts the speaker because of who she is and what she has done.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Pathos: the shelter ad",
          blocks: [
            {
              type: "text",
              text: "An animal shelter's ad: “Biscuit waited by the gate for three weeks after his family moved away. He's still waiting. Twenty dollars gives him a warm bed tonight.”",
            },
            {
              type: "text",
              text: "The ad gives no statistics. It makes you feel for one dog. That is pathos: persuasion through emotion.",
            },
            {
              type: "text",
              text: "Pathos isn't a trick by itself. It becomes manipulation when the feeling is meant to replace the facts.",
            },
          ],
        },
        {
          id: "s4",
          kind: "slide",
          title: "Logos: the phone review",
          blocks: [
            {
              type: "text",
              text: "A phone review: “In our tests, the battery lasted 26 hours of video playback, 5 hours more than last year's model, and the price dropped by $50. For most buyers, that makes it the better deal.”",
            },
            {
              type: "text",
              text: "The review persuades with measurable facts and a conclusion that follows from them. That is logos.",
            },
          ],
        },
        {
          id: "s5",
          kind: "interactive",
          title: "Name the appeal",
          prompt: "Sort each line by the appeal it relies on most.",
          widget: {
            kind: "sorter",
            categories: ["Ethos", "Pathos", "Logos"],
            items: [
              { id: "nurse", text: "“As a nurse for 20 years, I know what keeps patients safe.”", answer: 0 },
              { id: "brother", text: "“Picture your little brother, alone and scared on his first day.”", answer: 1 },
              { id: "bus", text: "“A bus pass costs $40 a month. Driving the same route costs about $180 in gas and parking.”", answer: 2 },
              { id: "mechanic", text: "“I've fixed cars for 25 years, and this is the tire I put on my own car.”", answer: 0 },
              { id: "cold", text: "“Don't let your family be the one left out in the cold this winter.”", answer: 1 },
              { id: "bottle", text: "“This bottle holds 20 ounces and costs the same as a 16-ounce bottle.”", answer: 2 },
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
              prompt:
                "A candidate for county commissioner says, “I grew up on a farm in this county and worked it for twenty years before I ran for office.” Which appeal is she using?",
              choices: ["Ethos", "Pathos", "Logos"],
              answer: 0,
              hint: "Is she pointing to a feeling, to data, or to her own background?",
              explain: "She builds trust by showing she knows farm life firsthand. That is ethos.",
            },
            {
              id: "q2",
              prompt: "Which line relies most on logos?",
              choices: [
                "“You deserve to feel safe walking home at night.”",
                "“After streetlights were added on Elm Street, reported thefts there fell from 40 to 22 a year.”",
                "“As your police chief, I give you my word.”",
              ],
              answer: 1,
              hint: "Logos relies on evidence a listener could check and reason from.",
              explain:
                "The Elm Street line gives numbers and links a cause to an effect. The first line is pathos, and the third is ethos.",
            },
            {
              id: "q3",
              prompt:
                "In his first inaugural address in 1933, during the Great Depression, President Franklin D. Roosevelt said, “the only thing we have to fear is fear itself.” Which appeal does this line rely on most?",
              choices: ["Ethos", "Pathos", "Logos"],
              answer: 1,
              hint: "Think about how Americans felt in 1933, and what this line tries to do to that feeling.",
              explain:
                "Roosevelt speaks to a frightened country and tries to replace panic with courage. Working on the audience's feelings is pathos.",
            },
          ],
        },
        {
          id: "s7",
          kind: "project",
          title: "Appeals in the wild",
          brief: "Find one persuasive message in the real world and explain how it works.",
          steps: [
            "Find a real ad, commercial, speech or opinion piece. A billboard, a cereal box or a video ad all count.",
            "Copy down the exact words of one line that tries to persuade you.",
            "Name the main appeal it uses: ethos, pathos or logos.",
            "In two or three sentences, explain how it works: what does it want you to trust, feel or conclude?",
            "Decide whether the appeal is fair. Does it give you a real reason, or only a feeling? Discuss your answer with someone at home.",
          ],
        },
      ],
    },
    {
      id: "appeals-together",
      title: "Appeals working together",
      summary: "Strong arguments often combine all three. Trace how one speech moves between them.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Mixing the appeals",
          blocks: [
            {
              type: "text",
              text: "Few strong arguments rely on a single appeal. Ethos makes an audience willing to listen, logos gives them reasons, and pathos makes them care enough to act.",
            },
            {
              type: "points",
              items: [
                "Ask of each sentence: is it asking me to trust, to feel, or to reason?",
                "One sentence can use more than one appeal at once.",
                "Notice the order, too. Where a speaker places each appeal is a choice.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Read: Keep the late bus, part 1",
          blocks: [
            {
              type: "text",
              text: "Dana, a ninth grader, spoke at a school board meeting about a plan to cut the 5:00 p.m. late bus.",
            },
            {
              type: "text",
              text: "“My name is Dana Ortiz. I've ridden the late bus for three years, and I've helped run the robotics club for two.”",
            },
            {
              type: "text",
              text: "“Last year, 140 students rode the late bus at least once a week. In our club's survey, 9 of our 22 members said they would have to quit without it.”",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Read: Keep the late bus, part 2",
          blocks: [
            {
              type: "text",
              text: "“One of them is Malik, a ninth grader who taught himself to code on a library computer. Robotics is the first place he's felt like he belongs.”",
            },
            {
              type: "text",
              text: "“He shouldn't lose that because of a bus schedule. The late bus costs the district about $18,000 a year, roughly $130 per rider.”",
            },
            {
              type: "text",
              text: "“I'm asking you, as someone who has seen what these clubs do, to keep the late bus. It's a small cost for keeping 140 students connected to their school.”",
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Trace the appeals",
          prompt: "Sort each line from Dana's speech by the appeal it relies on most.",
          widget: {
            kind: "sorter",
            categories: ["Ethos", "Pathos", "Logos"],
            items: [
              { id: "ridden", text: "“I've ridden the late bus for three years, and I've helped run the robotics club for two.”", answer: 0 },
              { id: "survey", text: "“In our club's survey, 9 of our 22 members said they would have to quit without it.”", answer: 2 },
              { id: "belongs", text: "“Robotics is the first place he's felt like he belongs.”", answer: 1 },
              { id: "cost", text: "“The late bus costs the district about $18,000 a year, roughly $130 per rider.”", answer: 2 },
              { id: "schedule", text: "“He shouldn't lose that because of a bus schedule.”", answer: 1 },
              { id: "seen", text: "“I'm asking you, as someone who has seen what these clubs do, to keep the late bus.”", answer: 0 },
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
              prompt: "Why does Dana introduce herself before giving any numbers?",
              choices: [
                "To make the board feel sorry for her",
                "Because numbers are always weak evidence",
                "To establish ethos, so the board trusts what follows",
              ],
              answer: 2,
              hint: "What does her introduction tell the board about her?",
              explain:
                "By showing that she rides the bus and helps run a club, Dana shows she knows the issue firsthand. That makes the board more likely to trust her facts.",
            },
            {
              id: "q2",
              prompt: "Dana ends: “It's a small cost for keeping 140 students connected to their school.” Which appeals does this sentence combine?",
              choices: ["Ethos only", "Logos and pathos", "Pathos only"],
              answer: 1,
              hint: "Look for a number, and for words meant to make the board care.",
              explain:
                "The number 140 and the idea of a small cost are logos. “Connected to their school” asks the board to care about those students, which is pathos.",
            },
            {
              id: "q3",
              prompt: "Why might Dana tell Malik's story right after the survey numbers?",
              choices: [
                "The story puts a face on the numbers, so the board feels what the statistic means.",
                "The story replaces the numbers, since stories are always more accurate.",
                "Pathos must always come second in a speech.",
              ],
              answer: 0,
              hint: "What can a story do that a statistic can't?",
              explain:
                "The survey shows how big the problem is, and Malik's story makes one of those students real. Together they persuade more than either would alone.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Trace a real speech",
          brief: "Map the appeals in a real speech, from a printed transcript or a recording.",
          steps: [
            "Choose a short speech: a graduation address, a comment at a town meeting, or a well-known speech from history.",
            "Read or listen to it once, just for the main point.",
            "Go through it again and mark each sentence or passage E, P or L. Some will get two letters.",
            "Look at the pattern. Where does the speaker build trust? Where do the strongest feelings come?",
            "Write a paragraph explaining how the appeals work together, and why the speaker might have put them in that order.",
          ],
        },
      ],
    },
    {
      id: "misused-appeals",
      title: "When appeals mislead",
      summary: "Spot fallacies, or flawed reasoning, such as false authority, scare tactics and statistics without context.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Fallacies",
          blocks: [
            {
              type: "text",
              text: "A fallacy is a flaw in reasoning that makes an argument seem stronger than it is. Each appeal has a common way of being misused.",
            },
            {
              type: "points",
              items: [
                "False authority, a misused ethos: trusting someone on a subject outside their expertise.",
                "Scare tactics, a misused pathos: using fear to push a choice the facts don't support.",
                "Statistics without context, a misused logos: numbers that sound impressive but leave out what you'd need to judge them.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "False authority and scare tactics",
          blocks: [
            {
              type: "text",
              text: "An ad shows a famous swimmer saying, “This is the toothpaste I trust.” She knows a lot about swimming, but her fame isn't evidence about teeth.",
            },
            { type: "text", text: "Compare a dentist explaining that fluoride helps prevent cavities. That is real expertise on the subject." },
            {
              type: "text",
              text: "A flyer warns, “If the town adds bike lanes, our streets will become chaos, and no one will be safe.” It offers fear but no evidence.",
            },
            { type: "text", text: "Fear is a fair appeal only when the danger is real and the facts back it up. Ask: what is the actual risk?" },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Statistics without context",
          blocks: [
            { type: "text", text: "An ad says, “Sales of our cereal doubled this year!”" },
            { type: "text", text: "Doubled from what? Going from 10 boxes to 20 is doubling too." },
            {
              type: "text",
              text: "Another says, “4 out of 5 people prefer our brand.” How many people were asked, how were they chosen, and what did they compare it to?",
            },
            {
              type: "points",
              items: [
                "Ask for the actual numbers behind a percent or a ratio.",
                "Ask who was counted, and how they were chosen.",
                "Ask what the number is being compared to.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Name the fallacy",
          prompt: "Sort each line by the fallacy it uses.",
          widget: {
            kind: "sorter",
            categories: ["False authority", "Scare tactics", "Statistics without context"],
            items: [
              { id: "actor", text: "“A famous actor says this cold medicine works best.”", answer: 0 },
              { id: "alarm", text: "“If you don't buy this alarm system tonight, your family could be next.”", answer: 1 },
              { id: "app", text: "“Our app's users grew 300% this month!”", answer: 2 },
              { id: "bank", text: "“A movie star tells you which bank to trust with your savings.”", answer: 0 },
              { id: "ruined", text: "“Vote no, or our town will be ruined forever.”", answer: 1 },
              { id: "crime", text: "“Crime in the neighborhood rose 50%.”", answer: 2 },
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
              prompt: "An ad says, “A famous chef says this mattress gives the best sleep.” What's the flaw?",
              choices: [
                "Scare tactics: it uses fear.",
                "False authority: a chef isn't an expert on sleep or mattresses.",
                "Nothing. Chefs are experts.",
              ],
              answer: 1,
              hint: "Ask what the speaker actually knows about.",
              explain: "A chef's expertise is cooking. On mattresses, the chef's opinion is worth no more than anyone else's, so citing it is false authority.",
            },
            {
              id: "q2",
              prompt: "A headline reads, “Shark sightings doubled at Sandy Beach this year!” Which question best tests this statistic?",
              choices: [
                "Are sharks dangerous?",
                "Is the beach popular?",
                "How many sightings were there last year, and how many this year?",
              ],
              answer: 2,
              hint: "“Doubled” compares two numbers. What do you need to know about them?",
              explain: "Doubling from 1 to 2 is very different from doubling from 50 to 100. Without the actual numbers, “doubled” tells you very little.",
            },
            {
              id: "q3",
              prompt: "Is every emotional appeal a scare tactic?",
              choices: [
                "No. An emotional appeal is fair when the feeling fits the facts.",
                "Yes. Any appeal to emotion is a fallacy.",
                "Only when it mentions money.",
              ],
              answer: 0,
              hint: "Think back to the shelter ad in the first lesson. Was the feeling based on something true?",
              explain:
                "Pathos becomes a scare tactic when fear replaces evidence. A true story that makes you care, backed by facts, is a fair appeal.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Fallacy hunt",
          brief: "Check real ads and messages for misused appeals.",
          steps: [
            "Collect three persuasive messages: commercials, junk mail, packaging or posts.",
            "For each one, write down its main claim and the appeal it relies on.",
            "Check for a fallacy. Is the authority an expert on this subject? Does fear replace facts? Are numbers missing context?",
            "For each fallacy you find, write the question a careful reader should ask.",
            "Rewrite one message so it persuades fairly, and show both versions to someone at home.",
          ],
        },
      ],
    },
    {
      id: "your-turn",
      title: "Using the appeals yourself",
      summary: "Choose the mix of ethos, pathos and logos that fits your audience and purpose.",
      minutes: 15,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Audience and purpose",
          blocks: [
            { type: "text", text: "Before you write, answer two questions: who is my audience, and what do I want them to do or believe?" },
            {
              type: "points",
              items: [
                "Audience: the people you're trying to persuade, including what they already know and care about.",
                "Purpose: the action or belief you want from them.",
                "Choose the appeals that fit both.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "One goal, two audiences",
          blocks: [
            { type: "text", text: "Purpose: get support for a neighborhood food bank." },
            {
              type: "text",
              text: "To classmates: “Last month I spent two hours sorting cans, and we packed food for 60 families. It was the most useful Saturday I've had.”",
            },
            { type: "text", text: "That's mostly ethos and pathos from a peer: someone like them, who was there, and how it felt." },
            {
              type: "text",
              text: "To a grocery store manager: “The food bank served 300 families in March and ran out of rice twice. Fifty bags would cover a month, and we'd list your store as a sponsor.”",
            },
            { type: "text", text: "That's mostly logos, with a reason that matters to a business." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Plan your appeals",
          blocks: [
            {
              type: "points",
              items: [
                "Ethos: what gives you credibility with this audience? Experience, research or shared values.",
                "Pathos: what does this audience care about? Use a true, specific example.",
                "Logos: what evidence would convince them? Use numbers they can check.",
                "One strong appeal of each kind beats five weak ones.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Fit the audience",
          prompt:
            "Purpose: convince the principal to allow a student-run recycling program. Does each line fit this audience, or miss it?",
          widget: {
            kind: "sorter",
            categories: ["Fits the audience", "Misses the audience"],
            items: [
              { id: "pilot", text: "“Our test week collected 85 pounds of recyclables from just three classrooms.”", answer: 0 },
              { id: "cool", text: "“Recycling is cool, and everyone's doing it.”", answer: 1 },
              { id: "officer", text: "“As the student council's environment officer, I've already signed up 30 volunteers.”", answer: 0 },
              { id: "doomed", text: "“If you say no, the planet is doomed.”", answer: 1 },
              { id: "custodians", text: "“Students would empty the bins themselves, so it adds no work for the custodians.”", answer: 0 },
              { id: "boring", text: "“School is boring, and this would make it more fun.”", answer: 1 },
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
              prompt: "You're asking the city council for a crosswalk near your school. Which opening builds the most ethos?",
              choices: [
                "“Everyone knows this street is dangerous.”",
                "“You'll regret it if someone gets hurt.”",
                "“I walk this street every school day, and last week I counted 40 cars in the five minutes before the bell.”",
              ],
              answer: 2,
              hint: "Ethos comes from the speaker's own knowledge or experience.",
              explain:
                "Walking the street daily and counting the cars shows firsthand knowledge. That makes the council more likely to trust the rest of your argument.",
            },
            {
              id: "q2",
              prompt: "Your audience is second graders, and your purpose is to get them to wear bike helmets. Which approach fits best?",
              choices: [
                "A detailed table of injury statistics by age group",
                "A short, true story about an older kid whose helmet cracked in a fall, instead of their head",
                "A quote from a medical journal full of technical terms",
              ],
              answer: 1,
              hint: "What will young children understand and remember?",
              explain: "Young children connect with a simple, vivid story more than with tables or technical language. The story is pathos, and it's still true.",
            },
            {
              id: "q3",
              prompt: "Why should an emotional appeal use specific, true details?",
              choices: [
                "Vague or exaggerated feelings make audiences suspicious and can cross into manipulation.",
                "Specific details turn pathos into ethos.",
                "Emotion doesn't matter in persuasion.",
              ],
              answer: 0,
              hint: "Think about the difference between the shelter ad and a scare tactic.",
              explain: "A true, specific example earns the feeling it creates. Exaggeration may work once, but audiences who notice it stop trusting you.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Write it twice",
          brief: "Pitch the same goal to two different audiences.",
          steps: [
            "Pick a real goal, like starting a club at school, planning a family trip or changing a house rule.",
            "Write a one-paragraph pitch to one audience, such as a friend.",
            "Rewrite it for a different audience, such as a parent or a teacher. Change the appeals to fit what they care about.",
            "Label each sentence E, P or L in both versions.",
            "Give the pitch that fits someone at home. Ask which sentence persuaded them most, and why.",
          ],
        },
      ],
    },
  ],
};

export default rhetoric;
