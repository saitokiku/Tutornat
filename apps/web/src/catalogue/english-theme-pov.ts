import type { CatalogueEntry } from "./types";

// Practice skills: no practice skill covers theme or point of view yet. The nearest is e.main.idea
// (a passage's central idea), which lesson 1 contrasts with a story's theme.

const themePov: CatalogueEntry = {
  id: "english-theme-pov",
  title: "Theme and point of view",
  summary: "Find the message a story carries about life, and see how the narrator's point of view controls what readers know and feel.",
  subject: "english",
  grade: "8",
  locale: "en",
  lessons: [
    {
      id: "topic-theme",
      title: "Topic or theme?",
      summary: "A topic is what a story is about. A theme is what the story says about that topic.",
      minutes: 12,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "A short story",
          blocks: [
            {
              type: "text",
              text: "“Lena wanted tomatoes by July. She planted the seeds in May, and every morning she dug one up to see whether it had grown. Each seed she checked dried out on the windowsill. By June, the pot was empty. Her grandmother handed her a new packet. ‘Plant them, water them and leave them alone,’ she said. Lena hated waiting. She put the pot where she couldn't see it from the kitchen. Ten days later, two small green leaves had pushed up through the soil.”",
            },
            { type: "text", text: "Ask two questions about it. What is this story about? And what does it say about that?" },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "What a story says",
          blocks: [
            {
              type: "text",
              text: "Every story is about something: friendship, courage, growing up. That's the topic, and it fits in a word or two. The theme is what the story says about that topic: a message about life or people that the story shows through what happens.",
            },
            {
              type: "points",
              items: [
                "Lena's story: the topic is patience. The theme is what the story shows about patience: some things grow only when we give them time.",
                "Another story might have the topic friendship and the theme “A real friend tells you a hard truth even when staying quiet would be easier.”",
                "A theme is a full sentence. It's an idea a reader could argue for, not a single word.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Theme isn't plot",
          blocks: [
            {
              type: "points",
              items: [
                "Plot summary: “Lena digs up her seeds, and they die.” That's what happens, not what it means.",
                "Too narrow: “Lena should leave her seeds alone.” A theme reaches beyond one character.",
                "Theme: “Some things grow only when we give them time.” It's about people in general, and the story shows it.",
              ],
            },
            {
              type: "text",
              text: "A strong theme statement doesn't name the characters and isn't a command to the reader, like “Be patient.” It says something about people or life that the story shows.",
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Topic or theme?",
          prompt: "Sort each one. Is it a topic, or a theme statement?",
          widget: {
            kind: "sorter",
            categories: ["Topic", "Theme statement"],
            items: [
              { id: "brave", text: "Being brave means acting even when you're afraid.", answer: 1 },
              { id: "courage", text: "Courage", answer: 0 },
              { id: "family", text: "Family", answer: 0 },
              { id: "annoy", text: "The people who annoy us most are often the ones who know us best.", answer: 1 },
              { id: "dream", text: "Growing up can mean letting go of a dream that no longer fits.", answer: 1 },
              { id: "growing", text: "Growing up", answer: 0 },
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
              prompt: "Which is a theme statement, not a topic?",
              choices: [
                "Loyalty",
                "Friendship, trust and keeping promises",
                "A story about two friends who stop speaking for a summer",
                "Loyalty can cost a person something they care about.",
              ],
              answer: 3,
              hint: "A theme is a full sentence that says something about the topic.",
              explain: "“Loyalty can cost a person something they care about” makes a claim about loyalty. The others name a topic or describe the story without saying what it means.",
            },
            {
              id: "q2",
              prompt: "In the story, Lena hides the pot so she won't check on it. Why does that detail matter to the theme?",
              choices: [
                "It tells us exactly where the kitchen window is",
                "It shows that Lena is angry with her grandmother",
                "It proves that tomatoes need lots of sunlight",
                "It shows Lena finally giving the seeds time",
              ],
              answer: 3,
              hint: "Themes often show up in how a character changes.",
              explain: "Lena goes from checking every day to giving the seeds time, and only then do they sprout. That change is how the story shows its theme.",
            },
            {
              id: "q3",
              prompt: "What's wrong with the theme statement “Lena learns her lesson”?",
              choices: [
                "It's too long and detailed to be a theme statement",
                "It's a question, not a statement",
                "It's about one character and skips the lesson",
                "Nothing; it's a strong theme statement",
              ],
              answer: 2,
              hint: "Could a reader who never met Lena learn something from this sentence?",
              explain: "It's tied to one character and never states the lesson. “Some things grow only when we give them time” says what she learned in a way that applies to anyone.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Theme hunt at home",
          brief: "Find the theme of a story you already know well.",
          steps: [
            "Pick a movie, show or book you know well, or a fable like “The Tortoise and the Hare.”",
            "Write its topic in one or two words.",
            "Write its theme as a full sentence that doesn't name any character.",
            "Write down two events from the story that show the theme.",
            "Ask someone at home to state the theme in their own words. Did you find the same message?",
          ],
        },
      ],
    },
    {
      id: "finding-theme",
      title: "Finding the theme",
      summary: "Themes are usually shown, not stated. Follow the character's conflict, change and ending to find one.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Where themes hide",
          blocks: [
            {
              type: "text",
              text: "Most stories don't announce their theme. You work it out from clues, the way a detective works out who did it.",
            },
            {
              type: "points",
              items: [
                "The conflict: what does the main character want, and what stands in the way?",
                "The change: how is the character different at the end?",
                "The ending: what happens because of the character's choices?",
                "The title and repeated details: what does the writer keep coming back to?",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Try it on a story",
          blocks: [
            {
              type: "text",
              text: "“Marco was the fastest runner on the relay team, and he knew it. At practice, he skipped the baton drills. ‘I'll just outrun everyone,’ he said. At the district meet, Marco reached back for the baton too early. It hit the track and rolled into the next lane. The team finished last. The next Monday, Marco was the first one at practice, holding a baton and waiting for the others.”",
            },
            {
              type: "points",
              items: [
                "Conflict: Marco wants to win on speed alone.",
                "Change: he goes from skipping the drills to arriving first to practice them.",
                "Ending: the team loses because of the skill he ignored.",
              ],
            },
            { type: "text", text: "One theme: talent alone isn't enough; it takes practice and the people around you." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "More than one theme",
          blocks: [
            {
              type: "text",
              text: "A story can carry more than one theme, and readers can disagree. A theme statement holds up when you can point to details in the story that support it.",
            },
            {
              type: "points",
              items: [
                "Supported: “Pride can keep people from preparing for what matters.” Marco skips the drills because he thinks he's too fast to need them.",
                "Not supported: “Running is dangerous.” Nothing in the story shows anyone getting hurt.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Strong or weak?",
          prompt: "These are theme statements for the relay story. Sort each one.",
          widget: {
            kind: "sorter",
            categories: ["Strong theme statement", "Weak theme statement"],
            items: [
              { id: "talent", text: "Talent without practice can let a whole team down.", answer: 0 },
              { id: "drops", text: "Marco drops the baton.", answer: 1 },
              { id: "teamwork", text: "Teamwork", answer: 1 },
              { id: "failure", text: "A failure can push a person to change their habits.", answer: 0 },
              { id: "command", text: "Always practice your baton drills.", answer: 1 },
              { id: "pride", text: "Pride can keep people from preparing for what matters.", answer: 0 },
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
              prompt: "Which clue usually tells you the most about a story's theme?",
              choices: [
                "The color of the clothes the characters wear in each scene",
                "How many pages the story has from start to finish",
                "The day of the week it happens",
                "How the main character changes by the end",
              ],
              answer: 3,
              hint: "Think about the clues from the first slide of this lesson.",
              explain: "A character's change shows what they learned or lost, which is usually where the theme lives. Small details like clothes matter only if the writer keeps returning to them.",
            },
            {
              id: "q2",
              prompt: "A classmate says the relay story's theme is “Running is dangerous.” What's the best response?",
              choices: [
                "Ask which details in the story back it up",
                "Agree, since every reader's theme is equally right",
                "Say that themes can't be about sports at all",
                "Say the relay story has no theme to find",
              ],
              answer: 0,
              hint: "What would you need to find in the story before you believed that theme?",
              explain: "Readers can find different themes, but each one needs support from the text. No one gets hurt in the story, so this theme doesn't hold up.",
            },
            {
              id: "q3",
              prompt: "In “The Tortoise and the Hare,” the hare naps during the race because he's sure he'll win, and the slow tortoise passes him. Which is the best theme statement?",
              choices: [
                "Steady effort can beat overconfident talent.",
                "Tortoises are slow animals, and hares are fast ones.",
                "The hare takes a nap in the middle of the race.",
                "Racing, resting and winning",
              ],
              answer: 0,
              hint: "Look for a full sentence about people, not a plot event, a fact or a topic.",
              explain:
                "It's a full sentence about effort and overconfidence that the fable shows. The others are a plot event, a fact about tortoises and hares, and a list of topics.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Story clue chart",
          brief: "Use the conflict, the change and the ending to find a theme on your own.",
          steps: [
            "Choose a short story, a picture book or an episode of a show.",
            "Make three columns: conflict, change and ending.",
            "Fill in each column with what happens.",
            "Write one theme statement that all three columns support.",
            "Read your theme to someone at home and point to one detail that supports it.",
          ],
        },
      ],
    },
    {
      id: "point-of-view",
      title: "Who is telling the story?",
      summary: "First person, third person limited and third person omniscient each let the reader see different things.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "The narrator's seat",
          blocks: [
            {
              type: "text",
              text: "Point of view is the position the narrator tells the story from. It decides whose thoughts the reader can hear.",
            },
            {
              type: "points",
              items: [
                "First person: the narrator is a character and says “I” or “we.” You know only what that character knows, thinks and notices.",
                "Third person limited: the narrator is outside the story and says “he,” “she” or “they,” but follows one character's thoughts.",
                "Third person omniscient: the narrator is outside the story and can share any character's thoughts. Omniscient means all-knowing.",
                "Second person, using “you,” is rare in stories. You'll see it more often in instructions and some poems.",
              ],
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "One moment, three ways",
          blocks: [
            {
              type: "points",
              items: [
                "First person: “I reached back too early. The baton hit the track, and I couldn't look at my teammates.”",
                "Third person limited: “Marco reached back too early. The baton hit the track, and he couldn't look at his teammates.”",
                "Third person omniscient: “Marco reached back too early. The baton hit the track. Marco couldn't look at his teammates, and Dana, who had just run her best time, felt her chest tighten.”",
              ],
            },
            { type: "text", text: "Only the omniscient version lets you inside two characters' heads." },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "Clues to the point of view",
          blocks: [
            {
              type: "points",
              items: [
                "Look at the pronouns in the narration. “I” or “we” outside of quotation marks points to first person.",
                "Then ask whose thoughts and feelings you can see. One character's only: limited. Several characters': omniscient.",
                "Watch out: characters say “I” in their dialogue in every point of view. Check the narration, not the quotations.",
              ],
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Name the point of view",
          prompt: "Sort each passage by its point of view.",
          widget: {
            kind: "sorter",
            categories: ["First person", "Third person limited", "Third person omniscient"],
            items: [
              {
                id: "ava-mom",
                text: "Ava stared at the empty house, worried about her new school. Her mother, watching her from the truck, wondered whether the move had been a mistake.",
                answer: 2,
              },
              { id: "move", text: "I didn't want to move, and I told my mom so every day until the truck came.", answer: 0 },
              { id: "jun", text: "Jun read the note twice. He couldn't tell whether Kim was joking, and he was afraid to ask.", answer: 1 },
              { id: "sister", text: "We ran the last mile together, and I could hear my sister breathing hard beside me.", answer: 0 },
              { id: "ava", text: "Ava stared at the empty house. She wondered whether anyone at her new school would talk to her.", answer: 1 },
              { id: "jun-kim", text: "Jun read the note twice, confused. Across the room, Kim bit her lip, sure she had made him angry.", answer: 2 },
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
              prompt: "“‘I'll be there by noon,’ said Mr. Patel. He hung up and checked the clock, worried about the traffic.” What is the point of view of the narration?",
              choices: ["First person", "Third person omniscient", "Second person", "Third person limited"],
              answer: 3,
              hint: "The “I” is inside quotation marks. Look at the narration around it.",
              explain: "“I” appears only in Mr. Patel's dialogue. The narrator says “he” and shares only Mr. Patel's worry, so the narration is third person limited.",
            },
            {
              id: "q2",
              prompt: "Which point of view lets the reader hear several characters' thoughts?",
              choices: ["Third person limited", "Third person omniscient", "Every point of view equally", "First person"],
              answer: 1,
              hint: "Which narrator is all-knowing?",
              explain: "An omniscient narrator can move into any character's mind. A limited narrator follows one character, and a first-person narrator knows only their own thoughts.",
            },
            {
              id: "q3",
              prompt: "A story has a first-person narrator. What's one limit on what the reader learns?",
              choices: [
                "The reader can't learn anything at all about the other characters",
                "The narrator must be telling the truth about every event",
                "The reader learns only what the narrator notices or shares",
                "The story can't include any dialogue between characters",
              ],
              answer: 2,
              hint: "Whose eyes and mind is the reader inside?",
              explain:
                "A first-person narrator filters everything. You can still learn about other characters through what the narrator sees and hears, but not their private thoughts, and the narrator may be mistaken.",
            },
            {
              id: "q4",
              prompt: "Why might a writer choose third person limited for a mystery?",
              choices: [
                "It lets the reader see the culprit's thoughts from the start",
                "The reader finds clues along with one character",
                "It's the only point of view allowed in mysteries",
                "It makes the story shorter and quicker to read",
              ],
              answer: 1,
              hint: "What would happen to the mystery if the reader could read every character's mind?",
              explain: "Following one character keeps the reader as puzzled as that character. An omniscient narrator could reveal the culprit's thoughts and spoil the mystery.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Switch the seat",
          brief: "Tell one moment three ways and notice what each point of view shows.",
          steps: [
            "Pick a short scene from a book you're reading, or a moment from your own day.",
            "Write it in first person, as one character.",
            "Rewrite it in third person limited, following the same character.",
            "Rewrite it once more in third person omniscient, adding what another character thinks.",
            "Read all three to someone at home. Ask which version made them feel closest to the character, and why.",
          ],
        },
      ],
    },
    {
      id: "reader-knows",
      title: "What the reader knows",
      summary: "When readers know something a character doesn't, a writer can build suspense or humor. Point of view controls it.",
      minutes: 13,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Dramatic irony",
          blocks: [
            { type: "text", text: "Dramatic irony happens when the reader or audience knows something a character doesn't." },
            {
              type: "points",
              items: [
                "In Romeo and Juliet, the audience knows Juliet has taken a potion that only makes her seem dead. Romeo doesn't know, and he believes she has died.",
                "In many versions of Little Red Riding Hood, readers know the wolf is waiting in Grandmother's bed before Red Riding Hood does.",
              ],
            },
            {
              type: "text",
              text: "Writers use it to build suspense, when readers want to warn a character, or humor, when a character confidently gets wrong something the reader understands.",
            },
          ],
        },
        {
          id: "s2",
          kind: "slide",
          title: "Point of view sets it up",
          blocks: [
            { type: "text", text: "To give readers knowledge a character lacks, a writer has to show it to them somehow." },
            {
              type: "points",
              items: [
                "An omniscient narrator can show what one character is planning while another has no idea.",
                "Chapters that switch between characters can show the reader both sides.",
                "A first-person narrator can miss what readers notice: a narrator who says everyone loves his jokes while the people around him roll their eyes.",
              ],
            },
          ],
        },
        {
          id: "s3",
          kind: "slide",
          title: "A narrator you can't fully trust",
          blocks: [
            {
              type: "text",
              text: "A first-person narrator reports only what they see and believe. Some are mistaken, biased or hiding something. Readers call this an unreliable narrator.",
            },
            {
              type: "text",
              text: "In Edgar Allan Poe's “The Tell-Tale Heart,” the narrator keeps insisting he is not mad while he describes a careful plan to kill an old man. Readers can follow what he does, but they don't accept his claim that he is sane, or every sound he says he hears.",
            },
          ],
        },
        {
          id: "s4",
          kind: "interactive",
          title: "Who knows more?",
          prompt: "Sort each scene. Does the reader know more than the character, or are they finding out together?",
          widget: {
            kind: "sorter",
            categories: ["Reader knows more", "Finding out together"],
            items: [
              { id: "attic", text: "Told by Sam in first person: Sam hears a noise in the attic and climbs the stairs, not knowing what's up there.", answer: 1 },
              { id: "clue", text: "The detective and the reader see the last clue at the same moment, in the final chapter.", answer: 1 },
              {
                id: "party",
                text: "The reader has watched Mia's friends hide behind the couch for a surprise party. Mia walks in, grumbling that everyone forgot her birthday.",
                answer: 0,
              },
              { id: "letter", text: "Told in third person limited: Lea opens the letter from the school and starts to read the first line.", answer: 1 },
              { id: "bridge", text: "The reader knows the bridge ahead has washed out. The driver, singing along to the radio, speeds toward it.", answer: 0 },
              { id: "cake", text: "The reader saw the dog eat the cake. The parents blame the twins, who look at each other in confusion.", answer: 0 },
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
              prompt: "In Romeo and Juliet, the audience knows Juliet is not really dead, but Romeo believes she is. What is this called?",
              choices: ["Dramatic irony", "Foreshadowing", "First-person point of view", "A flashback"],
              answer: 0,
              hint: "Who knows more here: the audience or the character?",
              explain: "The audience knows something Romeo doesn't, which is dramatic irony. It's why the scene is so painful to watch.",
            },
            {
              id: "q2",
              prompt: "A writer wants readers to feel nervous as a character walks toward a danger she can't see. Which choice helps most?",
              choices: [
                "Leave the danger out of the story entirely",
                "Tell the story only in her voice and reveal the danger when she finds it",
                "Show readers the danger first, in a scene she isn't part of",
                "Describe the weather around her in detail",
              ],
              answer: 2,
              hint: "Suspense grows when readers know what's coming.",
              explain:
                "Showing the danger first gives readers knowledge the character lacks, so they worry with every step she takes. Revealing it only when she finds it creates a surprise instead.",
            },
            {
              id: "q3",
              prompt: "A first-person narrator says, “Everyone loves my singing,” while the other characters cover their ears. What does the reader understand?",
              choices: [
                "The narrator may not be reliable about this",
                "The other characters can't hear very well",
                "The story is told in third person",
                "Everyone in the story really does love the singing",
              ],
              answer: 0,
              hint: "Compare what the narrator says with what the characters do.",
              explain: "The characters' actions contradict the narrator's claim, so readers see what the narrator doesn't. That gap makes the narrator unreliable on this point, and it's funny.",
            },
            {
              id: "q4",
              prompt: "Why does dramatic irony often make a scene funny?",
              choices: [
                "The reader knows what the character gets wrong",
                "Characters always tell jokes to each other in those scenes",
                "The narrator laughs out loud at the character",
                "It only works in plays, where people watch together",
              ],
              answer: 0,
              hint: "Think of the surprise party, from the reader's side.",
              explain: "The humor comes from the gap between what the reader knows and what the character believes. Dramatic irony works in stories, plays and films alike.",
            },
          ],
        },
        {
          id: "s6",
          kind: "project",
          title: "Write a scene with dramatic irony",
          brief: "Give your reader a secret your character doesn't know.",
          steps: [
            "Think of a situation where one person is missing a secret: a surprise party, a hidden gift or a mix-up.",
            "Write a short opening that shows the reader the secret.",
            "Write the scene from the point of view of a character who doesn't know it.",
            "Read it to someone at home. Ask where they felt suspense or wanted to laugh.",
            "Write one theme statement your scene could support.",
          ],
        },
      ],
    },
  ],
};

export default themePov;
