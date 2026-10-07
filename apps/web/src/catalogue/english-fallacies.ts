import type { CatalogueEntry } from "./types";

// Practice skills this course teaches toward: e.fallacies (all eight it covers), e.claim.evidence.

const fallacies: CatalogueEntry = {
  id: "english-fallacies",
  title: "Spot the fallacy",
  summary: "Recognize eight common mistakes in reasoning, from personal attacks to false choices, and answer each one with a fair question.",
  subject: "english",
  grade: "8",
  locale: "en",
  lessons: [
    {
      id: "attacks",
      title: "Attacking the person, twisting the point",
      summary: "A fallacy is a broken link in reasoning. Two common ones aim at the wrong target: the person, or a fake version of their idea.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "A broken link in reasoning",
          blocks: [
            {
              type: "text",
              text: "An argument gives reasons for a claim. A fallacy is a mistake in that reasoning: the reasons don't actually support the claim, even when they sound convincing.",
            },
            {
              type: "points",
              items: [
                "A fallacy can make a weak argument feel strong.",
                "Spotting one doesn't prove the claim is false. It means this argument hasn't proved it.",
                "Fallacies turn up in ads, speeches, comment sections and our own arguments.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Ad hominem: attacking the person",
          blocks: [
            {
              type: "text",
              text: "Ad hominem is Latin for “to the person.” It attacks the person making an argument instead of the argument itself.",
            },
            {
              type: "text",
              text: "“Ms. Ruiz says the crosswalk by our school needs a traffic light, but she failed her driving test twice, so ignore her.”",
            },
            {
              type: "text",
              text: "Her driving test has nothing to do with whether the crosswalk is dangerous. To answer her, you'd have to talk about the crosswalk.",
            },
            {
              type: "text",
              text: "Not every comment about a person is a fallacy. When you weigh evidence someone gives you, it's fair to ask whether they know the subject or gain something if you believe them. It becomes a fallacy when the attack replaces an answer to their reasons.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Straw man: fighting a fake version",
          blocks: [
            {
              type: "text",
              text: "A straw man twists someone's argument into a weaker or more extreme version, then attacks that version. A figure made of straw is easy to knock down; the real argument is still standing.",
            },
            {
              type: "points",
              items: [
                "Real argument: “Our cafeteria should serve one meat-free lunch a week.”",
                "Straw man reply: “So you want to ban meat and force everyone to be vegetarian? That's ridiculous.”",
                "Nobody suggested a ban. The reply attacks a claim that wasn't made.",
              ],
            },
            {
              type: "text",
              text: "To avoid it, restate the other side fairly before you answer. If they'd agree with your summary, you're arguing with the real thing.",
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Which move is it?",
          prompt: "Sort each reply. Is it an ad hominem, a straw man or a fair point?",
          widget: {
            kind: "sorter",
            categories: ["Ad hominem", "Straw man", "Fair point"],
            items: [
              { id: "hoodie", text: "Don't listen to Kai's idea for the science fair. He wears the same hoodie every day.", answer: 0 },
              { id: "halls", text: "Dana wants five minutes between classes instead of three. So she thinks we should wander the halls all day?", answer: 1 },
              { id: "budget", text: "Kai's plan costs $200, and the club has $80, so we can't afford it this year.", answer: 2 },
              { id: "twelve", text: "My brother says we should recycle more, but he's only twelve, so what does he know?", answer: 0 },
              {
                id: "stone-age",
                text: "Mr. Lee suggests putting phones away during class. He wants to take away all our technology and send us back to the Stone Age.",
                answer: 1,
              },
              { id: "old-study", text: "The study Dana cites is from 1995, so we should check whether its findings still hold today.", answer: 2 },
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
              prompt: "“You can't trust Ben's plan for the class trip. He can't even tie his shoes right.” Which fallacy is this?",
              choices: ["Ad hominem", "Straw man", "No fallacy"],
              answer: 0,
              hint: "What is the reply about: the trip plan, or Ben?",
              explain: "The reply attacks Ben's shoelaces instead of his plan. That's ad hominem.",
            },
            {
              id: "q2",
              prompt: "Ana: “Our school should start 30 minutes later.” Ben: “Ana wants us to sleep all day and never learn anything.” What did Ben do?",
              choices: [
                "He replaced Ana's idea with an extreme version and attacked that",
                "He gave evidence against a later start",
                "He agreed with Ana",
                "He attacked Ana's character",
              ],
              answer: 0,
              hint: "Compare what Ana said with what Ben says she wants.",
              explain: "Ana asked for 30 minutes. Ben pretends she wants students to sleep all day, a version that's easy to attack. That's a straw man.",
            },
            {
              id: "q3",
              prompt: "You spot a fallacy in someone's argument. What does that tell you?",
              choices: [
                "This argument doesn't prove its claim, but the claim could still be true",
                "The claim is definitely false",
                "The person is lying",
                "You've won the argument",
              ],
              answer: 0,
              hint: "A broken link in reasoning is about the argument, not the conclusion.",
              explain:
                "A fallacy shows the reasons don't support the claim. The claim might still be true for other reasons, so the fair next step is to look for better evidence.",
            },
            {
              id: "q4",
              prompt: "Mr. Ortiz argues that the library should open on Sundays. Which reply answers his argument instead of attacking him?",
              choices: [
                "“He just wants more hours for himself.”",
                "“Sunday hours would need two more staff shifts, and the library's budget was just cut, so we'd need to find the money first.”",
                "“He's never been good with money.”",
                "“Nobody likes Mr. Ortiz anyway.”",
              ],
              answer: 1,
              hint: "Look for the reply that talks about the library, not about Mr. Ortiz.",
              explain: "The second reply deals with the plan itself: what it costs and what the budget allows. The others are about Mr. Ortiz, so they never touch his reasons.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Fallacy log",
          brief: "Keep a short log of personal attacks and straw men you notice this week.",
          steps: [
            "Watch for arguments in ads, online comments, TV debates or family discussions.",
            "Each time you notice an attack on a person or a twisted version of someone's idea, write down what was said.",
            "Next to it, write the fair version: what the real argument was, or what a real answer would be.",
            "Notice whether you did it yourself. Everyone does sometimes.",
            "Share one entry with someone at home and ask whether they agree it's a fallacy.",
          ],
        },
      ],
    },
    {
      id: "crowds-experts",
      title: "Crowds and celebrities",
      summary: "Popularity and fame can feel like proof. Learn when they count as evidence and when they don't.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Bandwagon: everyone's doing it",
          blocks: [
            {
              type: "text",
              text: "The bandwagon fallacy says a claim is true, or a choice is right, because many people believe it or do it.",
            },
            { type: "text", text: "“Over a million people downloaded this app, so it must be safe.”" },
            { type: "text", text: "A million downloads show the app is popular. They don't show whether it protects your information." },
            {
              type: "text",
              text: "Popularity is fair evidence when the claim is about popularity: “This was the most-borrowed book at our library this year.”",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Appeal to authority: the wrong expert",
          blocks: [
            {
              type: "text",
              text: "An appeal to authority becomes a fallacy when we trust someone because they're famous or important, on a topic outside what they know.",
            },
            {
              type: "points",
              items: [
                "Fallacy: “A famous basketball player says this cereal is the healthiest breakfast, so it is.” A basketball star isn't a nutrition expert, and is probably paid to say it.",
                "Fair: “Sleep researchers recommend that teenagers get 8 to 10 hours of sleep a night.” They're experts in their field, and their findings agree.",
              ],
            },
            {
              type: "text",
              text: "Ask three questions. Is this person an expert on this exact topic? Do other experts agree? Do they gain something if I believe them?",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Why these work on us",
          blocks: [
            {
              type: "text",
              text: "People pay attention to what others are doing and to familiar faces. That habit is useful most of the time, which is why ads lean on it.",
            },
            {
              type: "points",
              items: [
                "“Join millions of happy customers.” Bandwagon.",
                "“The best-selling phone in the country.” Bandwagon, unless the only claim is about sales.",
                "A celebrity holding a product they have no special knowledge of. False authority.",
              ],
            },
            { type: "text", text: "Noticing the move doesn't mean the product is bad. It means the ad hasn't given you a real reason yet." },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Crowd, celebrity or fair?",
          prompt: "Sort each statement. Is it a bandwagon fallacy, a false appeal to authority or a fair use of evidence?",
          widget: {
            kind: "sorter",
            categories: ["Bandwagon", "False authority", "Fair evidence"],
            items: [
              { id: "watch", text: "Everybody in my class is getting a smartwatch, so I need one too.", answer: 0 },
              { id: "vitamin", text: "A pop star says this vitamin cures colds, so I'm taking it.", answer: 1 },
              { id: "dentists", text: "Dentists recommend brushing twice a day, so I brush twice a day.", answer: 2 },
              { id: "views", text: "This video has 50 million views, so what it says about history must be true.", answer: 0 },
              { id: "gamer", text: "A famous gamer says this sunscreen works best, so it must.", answer: 1 },
              { id: "hurricane", text: "Weather forecasters issued a hurricane warning for our coast, so we're getting ready to leave.", answer: 2 },
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
              prompt: "“Four out of five kids at our school play this game, so it's the best game ever made.” Which fallacy is this?",
              choices: ["Bandwagon", "False authority", "Straw man", "Ad hominem"],
              answer: 0,
              hint: "What reason is given for calling it the best?",
              explain: "The only reason is how many kids play it. Popularity doesn't prove a game is the best. That's bandwagon.",
            },
            {
              id: "q2",
              prompt: "Which is a fair appeal to authority?",
              choices: [
                "A volcano scientist explains how a volcano formed",
                "A movie star explains which medicine works best",
                "A famous singer explains how to fix your car",
                "A football coach explains which phone has the best camera",
              ],
              answer: 0,
              hint: "Look for the person speaking about their own field.",
              explain: "A volcano scientist is an expert on volcanoes. The others are speaking outside what they know, so their fame isn't evidence.",
            },
            {
              id: "q3",
              prompt: "A soccer star appears in an ad for a bank. What should you ask first?",
              choices: [
                "Does the soccer star know anything special about banking, and are they being paid?",
                "How many goals has the soccer star scored?",
                "Is the soccer star popular?",
                "Which team does the soccer star play for?",
              ],
              answer: 0,
              hint: "Which question tests whether their opinion counts as evidence?",
              explain:
                "Skill at soccer doesn't make someone a banking expert, and stars are usually paid to appear in ads. The ad needs other reasons, like its fees or interest rates.",
            },
            {
              id: "q4",
              prompt: "When is popularity good evidence?",
              choices: [
                "When the claim is about popularity, like which book sold the most copies",
                "Whenever more than half of people agree",
                "When a celebrity says it",
                "Never, in any situation",
              ],
              answer: 0,
              hint: "Popularity can prove one kind of claim.",
              explain: "Sales numbers are fair evidence that a book is popular. They aren't evidence that the book is accurate, wise or good for you.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Ad detective",
          brief: "Look at real ads and find what each one leans on: the crowd, a famous face or a real reason.",
          steps: [
            "Find three ads: online, on TV, on a cereal box or on a billboard.",
            "For each one, write who is speaking and whether they're an expert on the product.",
            "Note any words that lean on the crowd, like “everyone,” “millions” or “best-selling.”",
            "Write down any real reason the ad gives, such as price, ingredients or test results.",
            "Rewrite one ad so it gives a real reason instead of a crowd or a celebrity. Show it to someone at home.",
          ],
        },
      ],
    },
    {
      id: "choices-leaps",
      title: "Too few choices, too big a leap",
      summary: "Three fallacies that squeeze or stretch the facts: false dilemma, slippery slope and hasty generalization.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "False dilemma: only two doors",
          blocks: [
            { type: "text", text: "A false dilemma offers only two choices when there are more." },
            { type: "text", text: "“Either we ban phones at school, or students will never pay attention.”" },
            {
              type: "text",
              text: "There are other options: phones in lockers during class, phone-free zones, or clear rules about when phones can come out.",
            },
            {
              type: "points",
              items: [
                "Watch for “either… or,” “if you don't… then” and “you're with us or against us.”",
                "Some choices really do have only two options. It's a fallacy when other options are hidden.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Slippery slope: one step, then disaster",
          blocks: [
            {
              type: "text",
              text: "A slippery slope claims that one small step will set off a chain of events ending in disaster, without showing that each step will really happen.",
            },
            {
              type: "text",
              text: "“If we let students listen to music during study hall, next they'll want music during tests, then nobody will study, and the whole school will fail.”",
            },
            {
              type: "text",
              text: "Each link in the chain needs its own evidence. Some chains are real: skipping practice really can lead to playing worse. Ask whether there's a reason to believe each step.",
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Hasty generalization: too few examples",
          blocks: [
            {
              type: "text",
              text: "A hasty generalization draws a big conclusion from too few examples, or from examples that don't represent the whole group.",
            },
            {
              type: "visual",
              visual: { kind: "fraction", parts: 30, shaded: 3 },
              alt: "A bar split into 30 equal parts, one for each student in a class. Only 3 parts are shaded: the 3 friends who were asked.",
            },
            { type: "text", text: "“I asked three friends in my class of 30, and all three hate the new lunch menu, so the whole class hates it.”" },
            {
              type: "text",
              text: "Three friends can't speak for 30 students, especially friends who may think alike. Ask: how many were checked, and how were they chosen?",
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Squeeze or stretch?",
          prompt: "Sort each statement by the fallacy it uses.",
          widget: {
            kind: "sorter",
            categories: ["False dilemma", "Slippery slope", "Hasty generalization"],
            items: [
              { id: "team", text: "Either you join the soccer team, or you don't care about our school.", answer: 0 },
              {
                id: "chore",
                text: "If we skip one chore today, we'll skip them all week, the house will be a mess, and we'll never find anything again.",
                answer: 1,
              },
              { id: "series", text: "The first two books I read in this series were boring, so every book by this author must be boring.", answer: 2 },
              { id: "trip", text: "We can either cancel the field trip or let everyone get soaked in the rain.", answer: 0 },
              { id: "hats", text: "If the school lets us wear hats, soon we'll be wearing pajamas, and then nobody will take school seriously.", answer: 1 },
              { id: "taco", text: "I tried one taco from that food truck and it was cold, so their food is always bad.", answer: 2 },
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
              prompt: "“You either support the new stadium, or you don't care about our town.” Which fallacy is this?",
              choices: ["False dilemma", "Slippery slope", "Hasty generalization", "Bandwagon"],
              answer: 0,
              hint: "How many options does it offer? Are there more?",
              explain:
                "Someone could care about the town and still oppose the stadium, or want a smaller one. The statement hides those options, so it's a false dilemma.",
            },
            {
              id: "q2",
              prompt: "What's the best way to answer a slippery slope argument?",
              choices: [
                "Ask for evidence that each step really leads to the next",
                "Agree, since the last step sounds scary",
                "Attack the person who said it",
                "Change the subject",
              ],
              answer: 0,
              hint: "Where is the weak point in a chain?",
              explain: "A chain is only as strong as its weakest link. Asking for evidence at each step shows whether the disaster is likely or only imagined.",
            },
            {
              id: "q3",
              prompt: "Mia read two online reviews of a phone, and both were negative. She decides the phone is bad. What would make her conclusion stronger?",
              choices: [
                "Reading many reviews from different kinds of buyers",
                "Reading the same two reviews again",
                "Asking one friend who has never used it",
                "Looking at the phone's color options",
              ],
              answer: 0,
              hint: "Hasty generalizations come from too few examples.",
              explain: "Two reviews are too few to judge a phone that thousands of people use. Many reviews from different buyers give a fairer picture.",
            },
            {
              id: "q4",
              prompt: "Which statement is NOT a false dilemma?",
              choices: [
                "We can take the bus, walk or ask for a ride.",
                "Either you're with us, or you're against us.",
                "Either we buy new uniforms, or the team will look terrible forever.",
                "You either love math, or you're bad at it.",
              ],
              answer: 0,
              hint: "Which one leaves room for more than two options?",
              explain: "The first lists three real options. The others squeeze a choice into two sides when there are more.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Find the third door",
          brief: "Practice spotting hidden options and missing evidence in everyday arguments.",
          steps: [
            "Write down three either-or statements you hear this week, or make some up.",
            "For each one, list at least two options it leaves out.",
            "Write down one slippery slope you've heard. Under each step, note whether there's evidence it would really happen.",
            "Ask someone at home about a decision they made that had more than two options. What options did they consider?",
          ],
        },
      ],
    },
    {
      id: "red-herring-review",
      title: "Red herrings and the full set",
      summary: "Spot an argument that changes the subject, then practice naming and answering all eight fallacies.",
      minutes: 14,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Red herring: changing the subject",
          blocks: [
            { type: "text", text: "A red herring brings up a different topic to pull attention away from the real issue." },
            {
              type: "points",
              items: [
                "Parent: “Why is your room still messy?” Kid: “Well, Dad's garage is way messier.” The garage is a different issue.",
                "Reporter: “Will the new mall add traffic near the school?” Developer: “This mall will have the best food court in the state.” The food court doesn't answer the traffic question.",
              ],
            },
            { type: "text", text: "The new topic may even be true. It's still a red herring if it doesn't answer what was asked." },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Name it, then answer it",
          blocks: [
            {
              type: "text",
              text: "Spotting a fallacy is half the job. The other half is answering it in a way that keeps the discussion fair.",
            },
            {
              type: "points",
              items: [
                "Describe it in plain words: “That's a different question,” or “That's not what she said.” You don't need the Latin name.",
                "Bring back the real issue: “Back to the traffic: how many more cars will drive past the school each day?”",
                "Ask for the missing reason: “What evidence shows that step would really happen?”",
                "Check your own arguments the same way before you share them.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "The eight at a glance",
          blocks: [
            {
              type: "points",
              items: [
                "Ad hominem: attacks the person instead of the idea.",
                "Straw man: twists the other side's idea into a weaker one, then attacks that.",
                "Bandwagon: says something is right because many people do it or believe it.",
                "Appeal to authority: trusts someone who isn't an expert on the topic.",
                "False dilemma: offers only two choices when there are more.",
                "Slippery slope: claims one small step will set off a chain of disasters.",
                "Hasty generalization: draws a big conclusion from too few examples.",
                "Red herring: changes the subject to distract from the real issue.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Mixed review",
          prompt: "Sort each statement. Watch for the ones with no fallacy at all.",
          widget: {
            kind: "sorter",
            categories: ["Red herring", "Ad hominem", "Slippery slope", "No fallacy"],
            items: [
              { id: "dog", text: "Sure, I forgot to feed the dog, but did you see my math test score?", answer: 0 },
              {
                id: "bridge",
                text: "Reporter: “Why did the bridge repair cost twice what was planned?” Mayor: “Our city has the best parks in the region.”",
                answer: 0,
              },
              { id: "jamal", text: "Why should we listen to Jamal's ideas about the budget? He's always late to class.", answer: 1 },
              { id: "plastic", text: "That scientist's study on plastic must be wrong; she's so boring to listen to.", answer: 1 },
              { id: "zoo", text: "If we let one student bring a pet to class, soon every classroom will be a zoo.", answer: 2 },
              { id: "grade-b", text: "If you get one B, you'll never get into college, and you'll never get a good job.", answer: 2 },
              { id: "picnic", text: "The forecast shows heavy rain all Saturday, so we should move the picnic to Sunday.", answer: 3 },
              {
                id: "survey",
                text: "Our survey of all 120 eighth graders found that 90 want a later start, so most eighth graders want a later start.",
                answer: 3,
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
              prompt: "Teacher: “Your essay is two days late.” Student: “The cafeteria food here is terrible.” Which fallacy is this?",
              choices: ["Red herring", "Straw man", "Hasty generalization", "False dilemma"],
              answer: 0,
              hint: "Does the student's reply have anything to do with the essay?",
              explain: "The cafeteria has nothing to do with the late essay. The student changed the subject, which is a red herring.",
            },
            {
              id: "q2",
              prompt: "“Everyone's buying the new game console, so it must be worth the money.” Which fallacy is this?",
              choices: ["Bandwagon", "Appeal to authority", "Slippery slope", "Red herring"],
              answer: 0,
              hint: "What's the only reason given?",
              explain: "The only reason is that everyone is buying it. Popularity doesn't show the console is worth its price.",
            },
            {
              id: "q3",
              prompt: "“A famous chef says this car is the safest on the road.” Which fallacy is this?",
              choices: ["Appeal to authority", "Bandwagon", "Ad hominem", "False dilemma"],
              answer: 0,
              hint: "Is a chef an expert on car safety?",
              explain: "A chef knows food, not crash tests. Trusting a famous person outside their field is a false appeal to authority. Crash-test results would be real evidence.",
            },
            {
              id: "q4",
              prompt: "In a class discussion, someone uses a straw man against your idea. What's the best response?",
              choices: [
                "Calmly restate what you actually said, then ask them to respond to that",
                "Shout the name of the fallacy",
                "Attack their character back",
                "Drop your idea",
              ],
              answer: 0,
              hint: "Which response keeps the discussion on the real idea?",
              explain: "Restating your real position brings the discussion back to it. Shouting a fallacy's name or attacking back turns a discussion into a fight.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Fix a fallacy",
          brief: "Take an argument with a fallacy and rebuild it with real reasons.",
          steps: [
            "Pick a fallacy from your log, from an ad or from this course.",
            "Write the argument as you found it, and describe the fallacy in plain words.",
            "Rewrite the argument so it gives real evidence: facts, numbers or an expert in the right field.",
            "If you can't find real evidence, write down what you would need to check.",
            "Read both versions to someone at home. Ask which convinces them more, and why.",
          ],
        },
      ],
    },
  ],
};

export default fallacies;
