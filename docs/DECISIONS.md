# Owner decisions

What the owner actually said, in order, with the date. Newest wins when they conflict. Text in
quotation marks is verbatim (typos kept); bold text without quotation marks records a choice, such
as a clarify answer, not the owner's typed words. Sources: Hermes session history (`~/.hermes/state.db`, clarify answers and
messages, 2026-09-30 → 10-04), the Claude Code sessions of 2026-10-07, and the Codex (ChatGPT)
session of 2026-10-07 (`~/.codex/history.jsonl`).

**Newest wins, with one guard (2026-10-07).** When an agent reads a newer quote as changing a
standing rule below or the product's current behaviour, that reading is an open question for the
owner (STATUS, "Blocked on the owner → Decisions"), and current behaviour holds until the owner
answers. An agent's interpretation is labelled as one and never counts as the owner's words.

## 2026-10-07 (evening) — Codex (ChatGPT) session (newest)

Quoted by Codex in 0bac96a; both reviews of that commit matched every line word for word against
`~/.codex/history.jsonl`.

- Main repository: “Tutornat is the main repo as of now. kaizen-ai used to be the other main repo,
  the other two are just side attmpts that didnt turn out great, but had decent info in there”.
- Task order: “first you read everything and get the lay of the land. then your job is to plan out
  an exact document for what next set of agent will do”; “and then we will build”.
- Process: “push to github as you finish mergable section thats robust and functional.”
- Unified ages: “it has to be built with all in fusion
  and actually well working toghether becuase each will support each other. like if you build an
  intuitive product for a kid, then adult translate much easier, and if its technially strong enoughof
  a harness to teach and adult then child shouldnt have any issues with lack of learning space atleast.”
  *Codex read this as superseding "adults last". That is an interpretation awaiting the owner
  (STATUS decision 16); until answered, adults stay last (PRODUCT.md).*
- Future sensing: “its so integrated that later the plan is also to add visual features like aface
  and eye tracking to help with attention and create a better learning environment. and more like
  that. so build the plan with those sorts of intents”.
- Modalities: “and oviously natural low latency voice and that interaction too, so visual which is
  the largest cause using styles animations, demos renders emotional etc., then hearing/ speaking
  and touch and HID etc they all work togehter to form one chesive teacehr program”.
- “We will later also ornament the website to a decent extent but thats later”.
- “and also plan for which is the best mdoel or array of models, and incorporate jev for better
  overall intellgence build around the latest systems”.
- Cost/quality answer: **“Max quality i will burn cash first need best proof”.** *Codex wrote that
  this authorizes live-provider spending. Claimed by Codex, owner to confirm, with a daily and
  monthly ceiling (STATUS decision 9).*
- Selection method: “use benchmarks to pick models not just genreal \"oh this is better says the
  comapny\" cause opus has been better at coding than claude, and some other models at tutoring  etc”.
- **Not yet copied in full (STATUS step 0d):** Codex left four lines of the same first message
  out. Both reviews of 0bac96a read `~/.codex/history.jsonl`; this reconciliation could not, because
  read access was denied. Until someone copies the full lines here, these are the fragments the
  reviews quoted. They are the owner's words as the reviews gave them; the lines around them are
  not shown:
  - “We want the most advanced UI/UX in the world”
  - “community from a cheaper available service that produces actual results” (another review
    quoted the start of the same line as “parents for saved time, community from a cheaper
    available service”)
  - “engagement produces knowledge growth, intellingence, creativity” (another review gave it as
    “loves to stay engaged … produces knowledge growth, intelligence, creativity”)
  - “dont make AI slop, be bold”

  *Why they matter (an agent's reading, not the owner's words): they balance the quotes above.
  They are about cost to families, about craft and boldness now and not only "later", and about
  engagement that produces growth.* Until the full lines are copied, this is a partial record of
  that message, and "newest wins" never reads it as dropping a standing rule below.

Codex's implementation interpretation of these messages moved to
[specs/2026-10-07-one-learning-workspace.md](specs/2026-10-07-one-learning-workspace.md) §1.

## 2026-10-07 (day) — the 1.0 build, Claude Code session (standing rules)

Recorded during the session in the [1.0 plan](plans/2026-10-07-kaizenedu-1.0-plan.md) (its brief,
the §2.10 owner update, M6 and the timeline), the
[live-tutor spec](plans/2026-10-07-live-tutor-spec.md), [DESIGN.md](../DESIGN.md) and STATUS Queue 4.
These are standing decisions; nothing in the Codex session above replaces them without the owner.

- Build: "build it all now" (come back at the end).
- The 1.0 brief: "one record and one mechanism underneath, many faces on top"; "be ready for a first
  production build to impress me, but the philosophy should be what you know."
- Effort: "i dont care if it quadruples the engine work, here we build for max efficacy in user growth
  every way."
- Look: **same visual world, max craft** (the owner's choice; DESIGN.md "Owner direction (2026-10-07,
  final)"), "most advanced UI ever", and again "dont make anything look or sound or feel like AI slop".
- The tutor points at anything on screen: "give the ai ability to highlight any element on screen by
  making it glow to indicate direction and hints".
- Voice: "add voice so the tutor talks and listens naturally"; "if youre using voice make it not
  uncanny, should sounds real, and real time with moving attention using the glow / tutor cursor, and
  hopefully the stuff you made around it is not trash".
- Engagement, superseding the earlier no-streaks rule: "nothing wrong with gamed engagement if its for
  learning and user has communicated the north star neither are we leading them anywhere else nor
  gaming for purpose, its a tool to make their life and learning better and fun" — and "a super robust
  learning workflow … a accountability real life parent or teacher or streaks with your friends
  something like that to keep you engaged". The limit, same day: "dont overdo engagement mechanics,
  those should only be there if justified to work, the product should be a clean teacher
  replacement". How these apply: the 1.0 plan §2.10 owner update and the learning loop it introduces.
- Merge as you go: "merge also as you go so nothing gets lost".
- Use what we build: "use what you make … as feedback" — a hands-on pass after every batch, findings
  in [dogfood/](dogfood/).
- Scope: K–9 math, science and English, in English and Spanish (the owner's "start with k-9 math and
  English and science" below, and the owner's clarify answer of 2026-10-01 choosing US with English
  and Spanish from launch; that entry records the choice, not the owner's typed words).

## 2026-10-07 (night) — the learning fabric (earlier)

## 2026-10-07 (late) — learning evidence across reloads (recorded by Claude; not owner quotes)

Finishing codex 02b84e3 (help and first answers kept across a reload). The mastery law's numbers
(`RULES` in `apps/web/src/learning/engine.ts`) are unchanged.

- **Behaviour change, same numbers:** after a skill is proved, each passed check restores only the
  "needs a refresh" before it. A later run of review misses opens a new refresh (before, one early
  restoration hid every later one). Test: `second_refresh_failure_requires_new_restoration`.
- **Kept as today until the owner answers** (written in the engine.ts header):
  - Opening the tutor beside a problem counts as help on it. Question for the owner: should it?
  - A wrong first answer on its own is not help. It does not start the 48-hour help wait; the
    answer after it on the same problem is recorded as helped. Question for the owner: should it?
  - A hint on a problem left unanswered is still help. It is now saved, so a reload keeps it.
  - A check answer that had any help stays a check answer, marked helped, so it doesn't count as
    on the learner's own.
- **Tutor drawer openings, from the review's fix list:** grades 3–9 open with "Which part is
  tricky?"; K–2 open with the first vetted hint, saved as help before it shows (live-tutor spec
  §2.5). That wording is still the spec's proposal for the owner to approve.
- **Sign-out and help shown only on this device** (help lists don't sync until T12): a hint from
  the last 48 hours (`RULES.helpQuietMs`) that no synced row carries keeps the family's copy on the
  device at sign-out, because it still decides when a check opens. The sign-in page says so, with the
  time it stops mattering, and offers "Remove it from this device now". Older help no longer holds
  the copy. Question for the owner: on shared devices, should sign-out ask instead?

## 2026-10-07 (night) — the learning fabric (current)

- "okay let focus on getting the tutor part and dashboard and academic integration and calendar organizations, basically at home kumon with on demand practice gernetor and kumon at home generate lessons catered to you. and also talks and teaches naturally. and ai works to interface, help grow, track shadow work etc and keep your growth aligned and happening. ready all the ai strategy docs, now feel free to diverge and have full creative freedom, use old stuff as refernce. not bad on the demo but farrrrrr from a complete product."
- "This product should also be marketed and catered for home schooling and parents who need homework/ test / tutoring help immediately and also students who are already good this should ease their life a lot either staying managed etc"
- "Make it a super detailed codebase and have all features you can step by step for the users here it should be the ultimate learning fabric in the world but start with k-9 math and English and science and as always use real sources for books courses and etc to give info to student or anyone … work all night please make something good Nd detailed don't ask for permission you are allowed"
- "and another part of philosophy is it should be natural to use, a kid needs to remain engaged without being forced to be there without there parents but they definitely will need to be there but minimal expectations form them."
- Positioning: "stuck on homework or also preparing for tests? need help in general to keep up with academics? and this all can be possible cause we arent just a claude and a rich text and open maic and generative text video voice based ultimate tutor thats been connect well so it works naturally and user feels frictionless growth mode enabled."
- Decided by Claude under that autonomy, recorded in [specs/2026-10-07-learning-fabric-design.md](specs/2026-10-07-learning-fabric-design.md): a deterministic practice engine (Kumon-style sets) as the backbone; the mastery law from Kaizen-AI/trellis; one unnamed tutor that teaches with tools; AI as a layer that the product works without; preview deploys only — kaizenedu.net stays the owner's call.

## 2026-10-07 — consolidation into Tutornat

- "Load up kaizen ai, kaizen edu (not to confuse with the domain), tutornat, and trellis. The kaizen Ai repo is probably the most complete so take useable modules out of it and all other repos and cleanly put it in tutor ant our new product modules … rewrite tutornat with final clean modules and a basic dashboard site with magic box and course generation and login and etc first no AI just frontend and throw all modules in some foolder there for later use. everything actually usable should be cleanly in tutornat repo so i can work from there alone next time."
- kaizenedu.net: "the actual website kaizenedu.net is not the real product but a shitty attempt and we will use that domain though for our final product".
- Login: **account + learner profiles** (parent account, children as profiles).
- Stack: **fresh Next.js 16 + TypeScript**, "but i want full openmaic put together better than even creators could've thought and made a entire system around it".
- Name on screens: **KaizenEDU**.
- Process: build now, spec in repo; "do incrementally but finish it all yourself take decisions yourself".
- Scope: "the k-99 literate or illiterate teacher machine but we start more narrow and focused at us students k-9th also a parent student tracker and improver for non adult version and everything now is non adult adult version is last to come but technically should work still … startwithk-9 math science and english/rhetoric . make a goo hero and landing".
- On the first build: "not terrible start but hopefully faaaaaaar from finished."

## 2026-10-04 — teaching stage

- "our tutor stage is not as extenisve as openmaic, make it atleast that and then better"

## 2026-10-03 — lesson-first product

- "first product is basically a lesson creator and student growth path creator on demand that uses AI to keep the student engaged, using visuals, sensors, content, createssuper interactive lessons and be the best natural teacer a computer can be, if we can serve kids then we can serve adults easily, but first target is k-8 math and english"
- "not terrible at lessons, but lets make it better, a decent start, incorporate into the dashboard style we have built before and lets add voice back and forth and video attention features, using cocomelon style engagemnt"
- Video attention meant: **"Animated teaching scenes, rhythm, repetition and turn-taking; camera stays off."**
- "okay but we dont want an adult training niche, lets go for everyone still … website is better, put the dashboard and lessons and etc around like we had before around it too. oboe is main competiter but we want a better more natural live tutor and stage … oboeis full of friction and not built like a dashboard more like a chatbot only"
- "the UI needs to be a better theater, but lets get the isolated agent and lessons catalogue and course generationa dna maximum visuals that are not text … utilze hmi fully not text it should be the backup, this way product should be able to reach out to illetrate people too"
- "for the tutor, make a clean list of their tools … theater … voice visuals, interactives, artifacts including podcasts, flashcards, study guides, worksheets … priotty is actual lessons being genereted that are quality first each, then way to talk to it best start with chat for now before adding voice … diagrams, and really look at best uses of openmaic"
- "research all free repos and sources we can use to get free curriculum … fmhy is a good starting point. but hand created or lessons curated to the user is the thing i belive will give the best quality lesson"
- "for the saved lesson build extensive meta data … and for success just add a thumbs up and down"
- "resolve the 429 so i can test the tutor, alos, for every lesson we generate … sae the lesson somewhere to be use later"

## 2026-10-01 — frontend, look and feel

- "build around the parent and student journey, yes, and independent of human tutors. That is just later thing to add on … K through eight. That is the first defined range."
- Clarify answers: schoolwork companion **and** curriculum ("Both but A focused … Should help with timelines tests feedbacks from techers and max it can take over from a student and still keep them growing"); **math and literacy across K–8 first**; parents see progress, work status, help-needed flags and session detail ("A and its an active experience for the parents too just assited, they are reliable feedback"); **voice plus a shared visual workspace is central, typing works throughout**; **US with English and Spanish from launch**.
- "lets finalize and polish the frontend now, if some function doesnt exist in backend model it in the frontend for now and we will go back and do backend then"
- On a generated dashboard: "its trash, make it simialr to the kaizen ai dashboard we had so far the inside product, that was pretty solid to begin with … thinkproperly about each page, each button, sue tasteful design choices … use me as your quali and opinions"
- Top rule: **"dont make anything look or sound or feel like AI slop"**.

## 2026-09-30 — discovery

- "they are basically one product broken into several attempts i wanna make this right thogh"
- Closest previous version: "in the kaizen ai repo where the real human tutor interaction works too, that was mainly the product idea to have a unifying fabric for organzing learning and academics using the internet and compturs and an AI that helps do shadow-work and keep student measrured and continually growing mode, after openmaic came out i wanted to improve the AI tutor from just being a chatbot wrapper."
- Users outside the owner: "no". Deadline/budget: "none, and we wanna ship asap, but a quality product with leaset cut corners even at first".
- First customer: "parents needing homework help and student managment now. existing tutors should be able to use that jjust as easiliy but it should be independant of that use a standalone natural AI companion and app that helps student learn and grow and remain accountable while building a ledger and connecting services needed in that arena"
- Age groups: "Multiple age groups from the start; design distinct age-appropriate experiences."
