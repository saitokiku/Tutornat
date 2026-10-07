### 2.10 The learning loop and what keeps a learner coming back

> Replaces the previous 2.10 and extends §3. Three designs went to a panel of three judges, and each design won one judge. This synthesis takes the **learning engine** from *Edge and Wonder*: placement, accommodations, the proof moment and loop-stage tags. It takes the **sitting script and the week** from *Kaizen Rhythm*. It takes the **people layer, the legal discipline and the code baselines** from *The Circle and the Week*. Where the three disagreed, the decision and the reason are in the "Decisions" table below.

**The idea in one paragraph.** Software supplies the dose, the timing and an honest record. People supply the relationship and the accountability. The thing that makes a child better at something is the loop inside each sitting:
1. an example first;
2. guided practice that mostly succeeds;
3. recall on later days, mixed with skills that are easy to confuse;
4. a delayed check done alone on new problems;
5. spaced reviews.

The weekly rhythm is only there to make that loop happen on most days, and a person who notices is what makes it matter. Children come back for what makes them feel capable, then for choices that are theirs, then for someone who notices. That order is competence, then autonomy, then relatedness (Howard 2021; Bureau 2022). The honest aim is +0.15 to 0.30 SD on an outside measure over a semester, never "2 sigma" (Nickow 2020; Kraft 2024; von Hippel 2024). Habit effects are judged at week 8 or later (Lally 2010, median 66 days; Rodrigues 2022 on novelty).

| The owner asked for | Ships in 1.0 | Later |
|---|---|---|
| "super robust learning workflow" | The sitting loop and the proof (A, B) | Step-by-step entry for multi-step math, 1.1. Step-checked tutors reach d ≈ .76 vs .31 for answer-only checking (VanLehn 2011), about 0.2 SD at scale (Pane 2014) |
| "human … parent or teacher" | Friday note, teach-back, "Our week", teacher share link | Teacher seat; human-tutor add-on |
| "extra sensors" | Task signals, ink, read-aloud, paper photos; voice answers in M6 | K–3 listening to children read aloud; handwriting recognition in answer fields |
| "streaks with your friends" | Weekly rhythm and a family circle | Friends circle (pooled, gated); study buddy for ages 13–15. **Never a friend streak** (see E) |
| "engaged without being forced" | Close goals, choices, the proof moment, the Wonder list | — |
| "minimal expectations" of parents | About 2 minutes a week required | — |

**§0 principle changes.**
- **Rewrite 7: Rhythm, not tricks.** A forgiving weekly record the family chose, with rest days built in. A child can't lose, buy or break anything. There are no points, no leaderboards and no messages to children. A mechanic ships only in its smallest form, only toward a goal the family set, and stays only while the improvement loop shows it moves showing up or retention.
- **Add 13:** People give relationship and accountability; software gives dosage, timing and honesty.

---

#### A. One sitting

A sitting is one run of `planFor()`, capped by the band's minutes. The step order is the same every time.

| Step | What happens | Band differences | Evidence |
|---|---|---|---|
| **0. Arrive** (Today) | <ul><li>The anchor line ("After snack · kitchen table") and this week's strip.</li><li>The Next card states one close goal from `skillStatus`, e.g. "2 more right on your own and your check opens Thursday". It never shows a course or grade-level percentage.</li><li>At most 3 things can be started, and the child picks the order.</li><li>**Tiny sitting (3 min)** is always offered.</li><li>After 3 or more idle days, the main skill starts one level lower and nothing mentions the gap.</li></ul> | K–2: 2–3 picture tiles. 3–5: also picks the word-problem theme. 6–9: sees their own if-then line | Bandura & Schunk 1981; Patall 2008 (2–4 options); Villar 2013; Milkman 2021 (rewarding the return +27%) |
| **1. From before** (1–2 min) | <ul><li>Slot 0 (K–2) or slots 0–1. They draw, in this order, on: yesterday's check misses (the item with its explanation, then a fresh twin) → yesterday's sure-but-wrong answers (grade 3+) → `reviewsDue()` → skills practised in the last 14 days.</li><li>Scored as review, never toward the main skill's readiness.</li><li>Finishing it fills today's dot.</li></ul> | K–2: 1 item | Adesope 2017 g = .61 (grades 1–6 .64); Yang 2021 g = .50; Metcalfe, Kornell & Finn 2009; Metcalfe & Finn 2012 |
| **2. Teach at a new level** | <ul><li>Level 1 of a new skill: worked example, then matched problem, twice.</li><li>Level 2: a completion problem with the last step blank, then full problems.</li><li>Level 3 and up: no example unless asked.</li><li>Symbols always sit beside the picture. Pictures fade by level (picture, sketch, symbols), so the top level and the check are symbolic.</li></ul> | 6–9 concept lessons open with one "try it first" problem. K–5 and all procedures: show first | Barbieri 2023 (about +18 percentile points); Leite 2025; IES Rec 2; Sinha & Kapur 2021 (struggle-first helps older students; the grades 2–5 trend reverses); Fyfe 2014; WWC 2021 Recs 3–4 |
| **3. Guided practice** | <ul><li>`levelInSet` as today: +1 after 5 right on own, −1 after 2 misses. Aim for 80–90% right on own.</li><li>One real attempt before the first hint (pre-readers exempt). The ladder runs nudge → strategy → first step, and the last rung means assisted.</li><li>Spotlight lights the exact part. Feedback is "right" or "not yet" plus one pointer that names the strategy.</li><li>A rapid wrong answer never steps the level down. Three in a row bring "Change it up?": another picture, a worked example, or "Stop here — today already counts". The two buttons are equal.</li></ul> | K–2: tutor speaks first, vetted lines | Wisniewski 2020 (rich information d = .99 vs reward-only .24); Wise & Kong 2005; Baker 2004/2006 |
| **4. Mix** (top level or ready) | About half the main block comes from `Skill.confusers`, plus "which method?" items, built with `buildMixedSlots`. Levels 1–2 stay on one skill | Grade 3 and up only | Rohrer 2020 (delayed test 38% → 61%, d = .83, meets WWC standards); Brunmair & Richter 2019 (math g = .34) |
| **5. Why does this work?** | Once per set, after the first right-on-own answer at a new level. Never scored into the record | K–5: tap 1 of 2–3 reasons (read aloud for K–2); code checks it; the wrong reasons come from misconception tags. 6–9: one typed or spoken line; any AI comment is practice only | Bisra 2018 g = .55; Aleven & Koedinger 2002 |
| **6. Landing** | The last slot is a review from a secure skill at its level. It is the review that sits at slot 7 today, moved to the end. It is scored as review and never counts toward the main skill | — | Spacing (Latimier 2021) |
| **7. Finish** | <ul><li>At most 3 lines: "5 of 6 on your own · the number line helped on #4 · your check opens Thursday".</li><li>**Done for today** and **One more** have equal weight. Nothing starts by itself, pausing never loses progress, and there is no animation.</li><li>At most twice a week, after a passed check or a finished lesson: "Show your grown-up how you did #4".</li></ul> | — | ICO Standards 5 and 13; Radesky 2022 (80% of preschool apps manipulative); Rittle-Johnson, Saylor & Swygert 2008 |

| Set and time | K–2 | 3–5 | 6–9 |
|---|---|---|---|
| Set | 6 = 1 warm-up + 4 main + 1 landing | 10 = 2 + 7 + 1 | 10 = 2 + 7 + 1 |
| Review share (today: 1/6 and 2/10) | 2/6 | 3/10 | 3/10 |
| Daily budget, `lib/practice.ts` `BAND_MINUTES` (today 10 / 15 / 20 via the `?? 20` fallback) | 10 | **20** | **25** |
| Homeschool override, `lib/family.ts` ~l.114 (today 20 / 30 / 30) | 2 × 10 | 2 × 15 | 2 × 20 |
| Stretch-break offer (replaces the §2.4 three-hour reminder; Watson 2017) | 20 min | 20 min | 45 min |

#### B. Proof: the mastery law, numbers unchanged

- **Check days are short days.** A check day is the warm-up (2 items; 1 for K–2), the check, and the finish.
- **The check:** 5 fresh top-level items, at least one in a new context.
  - No tutor, photo help, Spotlight or worked steps (`guardSpots`), and no feedback per item.
  - Misses are reviewed at the end and again in tomorrow's warm-up.
  - Optional "sure / not sure" for grade 3 and up. Hiding the tab pauses timing.
- **Void:** 2 or more rapid answers make the check void: neither a pass nor a fail. It reopens tomorrow. A grown-up switch turns voiding off.
- **After a fail:** readiness counts again only after a *different* teaching act on that skill: a worked example, another representation, the tutor on the tagged misconception, or a teach-back. When a skill has no alternative representation, a tutor turn or a teach-back counts (Kulik 1990 vs Slavin 1987).
- **Stuck** (3 sets under 60% right on own, as today): the teaching act changes first and the grown-up gets a nudge. After 2 more stuck sets the skill is **"coming back to it"**: parked for 10 days, while `nextSkill` moves to a later skill whose prerequisites are secure. Then it resurfaces (Beck & Gong 2013).
- **The proof moment** (second pass, at least 6 days later, on a different day):
  - One still screen: "Proved: 2-digit subtraction. On your own, on two days a week apart, on problems you hadn't seen."
  - A **then-and-now** line from the record: "Sept 12: needed the first step on 6 of 10. Today: 5 of 5 alone."
  - No confetti, sound or badge. The grown-up gets one line and a printable proof page.
- **Proof book** (Growth): dated, "still strong" after each passed review, and "needs a refresh" when that is true ("even strong skills fade; a quick refresh brings it back"). Proved skills are the only achievement marker anywhere (Deci, Koestner & Ryan 1999; Soderstrom & Bjork 2015).

#### C. The week

| Mechanic | Rule | Evidence |
|---|---|---|
| **What counts as a day** | A finished warm-up (the tiny sitting) or any finished set, check, lesson, review or wonder lesson. One dot per local day: a second sitting is recorded but adds no dot. A set made only of rapid answers adds nothing | Latimier 2021 (spacing g = .74); Loh 2017 (learners who binge quit) |
| **Weekly target** | K–2: 2, 3 or 4, default 3, chosen by the grown-up. Grades 3–9: 3, 4 or 5, default 4; the child chooses from age 9 and the grown-up confirms. **Never 6 or 7**, so two rest days always exist and need no excuse | Sharif & Shu 2017 (slack: 55% vs 37% rebound); Bandura & Schunk 1981 |
| **Strip** | Monday-to-Sunday dots on Today and the Family card. Past empty days are plain grey. A flag marks the day a check opens, a loop mark a review, a school icon a test. Meeting the target gets one quiet line: "That's your week." Days past the target are shown, not celebrated | Harkin 2016 (monitoring d = .40, stronger when recorded and reported) |
| **Fresh start** | Resets every Monday. No count can fall | Dai, Milkman & Riis 2014 |
| **Rest weeks** | The grown-up marks illness or a holiday, or the imported calendar shows no school. Striped; they count neither way | — |
| **Term view** | Grade 3 and up: one cell per week, either filled, plain or striped. The child sees **no number**, no denominator and no "in a row". The grown-up sees "target met 7 of 9 weeks". K–2 children see this week only | Silverman & Barasch 2023 (broken streaks cut engagement) |
| **Tiny sitting** | Warm-up only, about 3 minutes. It fills the child's dot. The grown-up's note says "4 of 4 days (2 tiny)". If tiny sittings exceed 50% of days for 2 weeks, the grown-up is offered a smaller target, not more minutes | Yu 2020, Duolingo (+3.3% D14; company data) |
| **Hide the strip** | A per-child setting for the grown-up | — |
| **Never** | Loss copy, freezes, repairs, wagers, currency, confetti, notifications to a child | EU DSA Art. 28 minors guidelines 2025; ICO Std 5 |
| **Kill rule** (written now) | Cut the rhythm if returns without prompting rise by less than 5 points by week 8, or if parent friction rises. **Enforced at a few hundred learners**; the 10-family pilot judges harms only | Aulagnon 2025, NBER 34173 (60,000 Peruvian grades 4–6: weekly-streak messages +9.4 points weeks connected, no discouragement after breaks detected) |

**Anchor and if-then plan** (a new "Your time" step in Setup §2.9):
- It records after what, where, which days, and bedtime.
  - K–2: the grown-up picks, and it is phrased to them ("After snack, open KaizenEDU with Maya").
  - Grades 3–6: the child picks one of 3 cues.
  - Grades 7–9: the learner writes their own plan plus one obstacle plan ("If I'm wiped out, I do the tiny sitting").
- It shows on Today and replaces reminders. A sitting at any time of day still counts. It is revisited in "Our week" and offered for re-setup at each term start.
- Evidence: Breitwieser & Reinelt 2026 g = .31, stronger in younger children and ADHD; Patall, Cooper & Robinson 2008 (rules and routines are the strongest form of homework involvement); Beshears 2021 (flexible timing beats a fixed slot). Expect a small effect: Kizilcec 2020 found about 10× smaller effects at scale.

**Quiet hours** (under-13s):
- Bedtime defaults to 20:30 for K–5 and 21:30 for grades 6–9. The grown-up can move it, for example for shift work.
- No new sitting is offered in the hour before bedtime.
- No message goes to a grown-up between 21:00 and 07:00.
- The "best time" fact never falls within 2 hours of bedtime.
- Guardrail: child use after 21:00 = 0.
- Evidence: Carter 2016; Mazza 2016; Peiffer 2020.

**Test prep** (`planner/plan.ts`):
- A test known 7 or more days out gets at least 3 prep sittings on separate days, starting 7–10 days before, with nights in between. The day before is a short mixed recall set, never a cram.
- Under 7 days: every rhythm day left, at most one prep sitting a day.
- `PLAN_RULES.prepDays: 3` becomes `prepWindow: 10, prepSessions: 3`. `NUDGE_RULES.prepDays` stays at 3, decoupled from the plan.
- Evidence: Cepeda 2008; Latimier 2021.

| When | What happens |
|---|---|
| Monday | Fresh week. `planForWeek` places the real events on days: check openings, second checks (about the same weekday next week), reviews due (days 7, 21, 60 and 120 fall in weeks 1, 3, about 9 and about 17), school dates and prep |
| Mid-week | At most 2 touches to the grown-up: a nudge only when action is needed (check waiting 14 days, stuck, test with no prep, idle 5 days), plus the K–2 dinner card. **No "you're behind" message** |
| Friday (or the family's day) | The weekly note to every guardian |
| Weekend (optional) | "Our week", 5 minutes or less, led by the child |
| Term start or new month | A 2-minute re-setup offer to the grown-up |

#### D. What brings them back, by age band

| Lever | K–2 (5–8) | 3–5 (8–11) | 6–9 (11–15) |
|---|---|---|---|
| Who owns the habit | The grown-up | The child picks; the grown-up confirms | The learner |
| What they see | Picture dots, no numbers, this week only | "3 of 4 days", term cells | The same, plus the mastery law explained ("your check waits two days so it measures what stuck") |
| Competence | Comfortable start, 6-item sets, level dots, a spoken finish and proof line | The Proof book fills; then-and-now on Growth; private pace for fact fluency only (timer setting on) | Proof book; private calibration mirror for grades 5–9 ("you said sure 10 times, right 9") |
| Autonomy | 2–3 picture tiles; word-problem theme or character | Order of the day; theme; one open Wonder; optional sure / not sure | Edits "How we teach me"; try-it-first; one "where would you use this?" per course; Wonder courses |
| Relatedness, from people | Teach-back; dinner card; "do one together" with a sibling; printable 1–100 number board game for K (Siegler & Ramani 2008) | Teach-back; **Fix my mistake** with the tutor; family ring if a grown-up turns it on | Teach-back; study buddy for ages 13–15 (1.1); teacher co-sign (later) |
| Tutor register | Speaks first, vetted lines, the model only rephrases | Names the strategy | Adult visual and voice register, no character |
| Not at this age | Timers, sure / not sure, typed explanations, mixing | Friend features (1.0) | Friend features under 13 (1.0) |
| Grown-up's view | Full | Full | Ages 13–15: summaries and safety flags by default, transcripts on request (opt-in until counsel signs off) |

**The tutor is continuity, not affection.**
- It opens with the child's own plan and one concrete fact from the record ("Last time the number line helped with 3/4").
- It names the strategy that worked instead of praising.
- It never claims to miss or need the child.
- It hands emotional moments to the grown-up (`note_for_grownup`) and points the child toward people ("Show your grown-up #4").
- All of this is covered by evals.

**Fix my mistake** (grades 3–8): the tutor shows a worked problem that contains the child's most frequent tagged misconception, and the child finds the wrong step. K–5 tap the step; 6–8 say why. It is scripted from the tags, so it works without AI, and it counts as practice only (Chase 2009; Kobayashi 2019 g = .56).

**Wonder list:**
- Non-homework questions the child asks in Talk or the magic box are saved. One tap builds a **source-built** course.
- Every under-13 wonder needs a grown-up's approval before it becomes a course, and the safety screen runs first.
- AI-built wonder courses wait for M5 consent. Unbuilt wonders are deleted after 90 days.
- The tile shows only when nothing time-bound is waiting. A wonder lesson fills a dot but never proves anything.
- Voluntary sittings are the free-choice motivation measure (Deci 1999; Walkington 2013).

**Never, for any child** (this list becomes an e2e and eval suite):
- daily counters that reset;
- points, coins, XP, gems, or levels shown as status;
- leaderboards or comparison with anyone, siblings included;
- loot or random rewards;
- notifications, reminders, emails or badges to a child, and no notification-permission request in a child session;
- countdowns;
- a character that is sad, misses the child or needs them;
- auto-start, or a done button styled weaker than continue;
- "streak", "missed" or "lose" copy;
- celebration animations;
- engagement badges ("7-day learner").

#### E. People: accountability reaches the child through an adult

| Parent time | What | Minutes | Required? |
|---|---|---|---|
| Once, and each term | Setup: goals, learners, "Your time" (anchor, target, bedtime) | About 5, then 2 per term | Once |
| Weekly | Read the Friday note and tap its one decision, if there is one | 1–2 | **The only weekly ask** |
| Weekly, optional | "Our week" (5) · one teach-back (2) · K–2 dinner card (2) | 5–9 | No. Talk, not teaching (Hill & Tyson 2009; Maloney 2015) |
| When it matters | Act on a nudge | About 1 each; most weeks 0–1 | When it arrives |

Parents are never asked to check answers, re-teach, proctor, sit through sets or enforce the rhythm. The plan redirects time families already spend (ATUS 2025: about 40 minutes a week) toward routines and listening.

**The Friday note.**
- Sent to every guardian, in that guardian's language, EN/ES at parity, on a day and time they pick. SMS is the first 1.1 channel.
- Built only from numbers and templates; **the AI never writes a fact**.
- Seven lines:
  1. Rhythm: "4 of 4 days (Mon, Tue, Thu, Sat; 1 tiny) · after snack worked 3 of 4 times." After a gap, said plainly: "came back Thursday after 6 days".
  2. One win, described as what she did: "Proved 2-digit subtraction on her own, on Oct 3 and Oct 9."
  3. One thing being worked on, and what the tutor is doing: "Borrowing across zero; the tutor is leading with worked examples."
  4. One question to ask: "Ask Ana how she found 3/4 on the fraction bar." Grades 6–9 add one line on why the topic matters.
  5. A mistake worth talking about, with a line to say: "She used the whole-number rule on fractions. That's what learning looks like."
  6. Coming up in the next 14 days: check openings, reviews, school dates and prep days.
  7. One decision, if one is needed ("Keep 4 days?"), and the friction question: none / some / a lot.
- An empty week is still sent, without shame: "No sittings this week. Monday's plan is ready: 10 minutes of fractions."
- The first three notes each carry one help-without-taking-over script: ask what they tried · offer the tutor's hint, not the answer · name the feeling.
- When mixed sets start, one line: "Mixed sets feel harder and score lower that day; that is how they work."
- At most 3 touches a week in total.
- Evidence: Bergman 2021 (+0.23 GPA); Bergman & Chan 2021 (course failures −27%); Kraft & Rogers 2015 (−41%; what-to-improve messages beat praise-only); Cortes 2021 (3 a week beat 1; 5 added nothing); Vasquez 2016.

**Rituals, each logged as a teaching act with an intent.**
- **Teach-back:** at most twice a week, after a passed check or finished lesson. The grown-up gets two template questions and "You don't need to know the answer — just listen and ask", then taps "They showed me". The tap is never proof, and it is dropped if it doesn't move first-review survival (Rittle-Johnson, Saylor & Swygert 2008; Kobayashi 2019).
- **K–2 dinner card:** weekly, with the answer and the exact words printed on it (Berkowitz 2015: largest gains for children of math-anxious parents).
- **"Our week":** opened from the Family card through `Handover`. Three screens, led by the child:
  1. **Show** one proof, replayed on the stage.
  2. **Next week**: target, anchor and rest days. Grades 6–9 write wish, obstacle and if-then, one line each.
  3. **Coming up** over the next 14 days.

  If it is skipped, last week's plan carries over silently. No achievement claim is made on the landing page (PACT, Mayer 2019; Duckworth 2011; Musick & Meier 2012).
- **Rewards paragraph for parents:** if you reward, reward practice days, keep it small, occasional and unexpected, and never reward scores. Never through the app; the proof record can't be bought (Deci 1999 d = −.40; Fryer 2011).

**When no grown-up shows up.** The child's product is complete with zero adult action after setup, and nothing on the child's screen shows that an adult is missing. Weekly-review rates are tracked by language and household type.

**Guardians.** The account owner controls the guardian list, and removing someone takes effect immediately. A guardian who must not see the record never gets a note. Talk always shows the child **"Your grown-up can read these chats"** (ICO Std 11; Stattin & Kerr 2000).

| Circle | When | Shares | Rules | Evidence |
|---|---|---|---|---|
| **Family** | 1.0, inside one account | "Do one together": counts as a sitting for each child who answered; when an older sibling reads or listens, it is logged as a teach-back for them. Optional **family ring** (one pooled total) | Ring **off by default**; when on, it shows the total only. In 2-child homes, the switch warns that the pool minus your own days reveals your sibling's. One card per child; no ranking anywhere | Roseth 2008; EEF peer tutoring (+5–6 months); Hanus & Fox 2015; Azmat 2019 |
| **Friends** | 1.1, after M5 consent and the pilot | One **pooled** weekly goal ("our circle: 12 days"). No per-child yes/no, names, school, skills, scores or times | <ul><li>3–5 children (minimum 3, so no one can subtract); invited parent to parent; every family consented.</li><li>Preset reactions only; nicknames and avatars.</li><li>The approval check runs on every path, including group views, with a red-team test.</li><li>Data deleted each term; any family can leave and wipe.</li><li>No friend streaks</li></ul> | FTC COPPA FAQ (sharing counts as collection); FTC v. Epic 2022; Messenger Kids 2023; DSA 2025 (communication streaks); Duolingo Friend Streak +22% is correlational only |
| **Study buddy** | 1.1, ages 13–15 | Shared weekly target; "we both did it"; "sit together" (in a sitting / done) | Opt-in; both families approve; preset messages only at first; nothing can break | Roseth 2008; Bursztyn & Jensen 2015 |
| **Teacher** | 1.0 share link after counsel; 1.1 seat | <ul><li>Link: verified education and the record, no transcripts.</li><li>Seat: sets marked "from Ms. Lee"; a "seen by Ms. Lee" co-sign on proofs; a one-tap weekly check-in drafted from the record that the teacher edits and sends under their own name</li></ul> | <ul><li>Link: revocable, one recipient, email-confirmed, 14-day expiry, each view logged, openers listed on the parent view.</li><li>Never AI text posing as a teacher</li></ul> | Bureau 2022 (teacher autonomy support outweighs parents'); Kraft & Rogers 2015; Roorda 2011 |
| **Human tutor** | 1.1 add-on | One consistent tutor, 3+ short sessions a week; reads the record and "How we teach {name}" first; KaizenEDU's AI suggests the next question in the tutor's ear, never the answer | Vetted (background check); sessions recorded and visible to the grown-up; no off-platform contact | Nickow 2020 (+.37 SD); Kraft 2024 (3+ sessions hold up at scale); Wang 2024, Tutor CoPilot |

#### F. Sensors: the task and a person, nothing that watches the child

| Signal | What it does | What it never does | When |
|---|---|---|---|
| **Response time** (`Attempt.seconds` vs the skill's `seconds`) | `rapid` = a **wrong** answer faster than max(1.5 s, ⅓ of standard time); fast right answers are fluency. Rapid answers are not evidence: no step down, no dot, no profile fact. 3 in a row bring a calm change; 2 or more in a check void it. K–2 is flag-only for the first 2 pilot weeks; thresholds are tuned per band | Labels like "bored" or "distracted". Grown-ups see "4 answers in under 2 seconds" | P1/P2 |
| **Hint pattern** | An attempt before the first hint. Two rungs within 5 s with no attempt between: the tutor asks its first question instead of revealing more | — | P1 |
| **Misconception tags** (`why`) | Name the mistake; feed Fix my mistake, the retry gate and line 5 of the note | — | Exists; M4.0 |
| **Wheel-spinning** (`stuck`) | Change the act, then park the skill | More of the same | P2 |
| **Sitting shape** | Finished vs abandoned, Done taps, minutes, time vs the anchor → profile facts → suggestions to the grown-up | Pulling the child back | P6 |
| **Page Visibility / idle** | A hidden tab pauses check timing. Idle 90 s (K–2) or 3 min (older): re-read the problem and pause | Any penalty | P5 |
| **Input mode** (`Attempt.input`: keypad, choices, tap, ink, voice, photo, paper) | Profile fact; a skill's checks stay in the mode it was practised in | — | P1 (Backes & Cowan 2019: mode moved scores 0.10–0.25 SD) |
| **Ink scratchpad** (Pointer Events) | Strokes saved as vectors with the attempt; shown on the child page and in Records. Moved from 1.1 to M1/M3 | Graded in 1.0 | P5 (Anthony 2012; Oviatt 2012) |
| **Speaker** (read-aloud everywhere; K–2 automatic) | An accommodation, not help: doesn't set `assisted` or restart `helpQuietMs`, except on skills where reading is what is measured | — | P5 (Wood 2018 g = .35; Buzick & Stone 2014: math +0.13 SD only) |
| **Microphone** (tap to talk, consent) | Small-vocabulary answers parsed by `practice/spoken.ts`, echoed back ("I heard three fourths — right?"). In a check, a confirm tap too. K–3 read-aloud listening in 1.1, practice only | Logging a mishearing as a miss; storing audio; voiceprints | M6 (Attia 2024: about 25% word errors on child speech) |
| **Camera** (still photo through the OS picker only) | The vision model transcribes only; a person confirms; code checks; labelled "checked from a photo". Cropped, EXIF stripped, "photograph the page, not yourself". "Add to portfolio" files a dated work sample | A live camera; a model grading; "proved" | P5 (Caraeni 2025: 42–47% agreement with human graders) |
| **People** | "They showed me"; optional "a grown-up was nearby" on a check; the friction question; sure / not sure | Counting as proof | P4 |
| **Clock** | Bedtime drives quiet hours | — | P3 |

**Refused:**
- live camera, webcam proctoring and room scans;
- face or eye tracking;
- EEG, wearables and heart rate;
- emotion, attention or mood inference, including from voice;
- voiceprint or face login to tell siblings apart (the profile picker does that);
- AR in 1.0;
- open hands-free chat as the K–2 floor.

The reasons:
- the signals are invalid (Barrett 2019; Hutt 2019: gaze mind-wandering F1 ≈ .59);
- emotion recognition is banned in EU education (AI Act Art. 5(1)(f));
- these are biometric data under COPPA 2025;
- proctoring is biased (Yoder-Himes 2022).

PRODUCT.md "Camera off" is clarified to: *no live camera; a still photo of paper work only when the user starts it.*

#### G. Rules that keep it honest and legal

**Honest:**
1. Practice is never proof, and the law's numbers are unchanged. Only proved skills are achievements.
2. Rapid answers are evidence in neither direction: no step down, no dot, no failed check, only a void.
3. Every number a grown-up sees comes from code. In-session accuracy and same-day mixed-set scores never become a parent-facing label.
4. Dots log days without scoring them, and tiny days are shown as tiny to the grown-up.
5. "They showed me", "a grown-up was nearby", sure / not sure and photo-checked work are stored as exactly that, never as proof.
6. Profile facts are labelled "trying" until decided. There are no learning-style labels (Pashler 2008).
7. The landing page claims no effect until the pilot's outside benchmark shows one. The rhythm is never sold as the efficacy engine.
8. `i18n/en.ts:1681` ("There are no streaks, points or reminders for your child") and its ES twin are rewritten to describe the rhythm honestly. Suggested: "No points or reminders for your child — a weekly record of practice days with rest days built in, that never resets to zero."

**Legal:**
1. Under 13: no child-to-child sharing of any kind in 1.0. Circles follow the spec in E only after M5 verifiable consent.
2. Nothing is sent to children. To grown-ups: one-tap off, at most 3 touches a week, nothing between 21:00 and 07:00.
3. **Ship opt-in until counsel signs off:** the default-on note (as a service message), the 13+ summaries-only view, and the teacher share link.
4. A written retention schedule covers attempts, ink, photos (portfolio is opt-in, 2 years), wonders (unbuilt 90 days), circle data (term) and transcripts. Also required: a written infosec program, and separate consent for any non-integral third-party use. Vendor terms forbid retention and training.
5. Voice is streamed, transcribed and deleted; only the transcript is kept; no voiceprints.
6. The teaching profile is used only to teach (FTC 2022 edtech statement; Edmodo 2023). The Nebraska (2026) and Vermont (2027) design codes are added to the §5 counsel list.

#### H. Decisions where the panel disagreed

| Question | Positions | Decision | Why |
|---|---|---|---|
| Rhythm default | KR and CW on; EW opt-in plus A/B | **On**, with a low preselected target; per-child "hide the strip"; one tap off | The owner asked for accountability; defaults drive take-up (Bergman & Rogers 2017); a weekly streak with grades 4–6 showed no discouragement (Aulagnon 2025) |
| Kill rule and A/B | EW: A/B in the pilot | Write the rule now; enforce it at a few hundred learners; 10 families judge harms only | 10 families can't power a 5-point test |
| Target sizes | KR 3–6; CW K–2 2/3/4 and 3–9 3/4/5 | CW | A cap of 5 guarantees 2 rest days |
| Term view | KR squares; CW a count that only rises; EW "7 of 9" | Cells, no number for the child; the plain count for the grown-up | A denominator reads as loss to a child; a rising count reads as a streak; parents get honest numbers |
| Tiny sitting | KR counts; judges: honesty | Counts for the dot; "(2 tiny)" in the note; >50% guardrail | Rewarding the return (Milkman 2021) without hiding effort |
| Landing item | KR yes; judge: steers mood | Kept as a scored review in the last slot | It is today's slot-7 review, moved |
| Stuck | KR parks at 3; CW/EW change the act, park after 2 more | CW/EW | Change the approach before the exit (Beck & Gong 2013) |
| Gap length | 3 vs 5 days | 3 days to start one level lower; the idle nudge stays at 5 | Silent and kind; the nudge number is unchanged |
| Rapid rule | 30% / ⅓ / max(1.5 s, ⅓); KR also flagged fast streaks | Wrong and under max(1.5 s, ⅓) | A fast right answer is fluency |
| Void reopens | Next rhythm day vs tomorrow | Tomorrow | Simpler |
| Friday note | KR default-on; CW opt-in until counsel | Build default-on; ship opt-in; switch on at counsel sign-off | Legal call |
| Weekly review | CW required; others optional | Optional; the plan carries over | Parent load |
| Thursday "behind" nudge | CW | **Dropped** | It adds pressure and spends a touch |
| Family ring | KR on with 2+ children; CW off | Off by default, total only | Subtraction leak |
| Friends sharing | KR/EW per-child yes/no; CW pooled | Pooled only, minimum 3, 1.1 | Discloses less |
| Teach Kai vs Fix my mistake | Character vs tutor mode | One mode: Fix my mistake, no character | Same mechanism; no parasocial risk; works without AI |
| Wonder list | EW 1.0; judge: gate it | 1.0 source-built only, grown-up approval for every under-13 wonder, 90-day deletion | The only intrinsic hook; new child text needs limits |
| Minutes baseline | KR "K–2 20 → 12" | The real code: `BAND_MINUTES` 10/15/20 and the homeschool override 20/30 (see A) | KR misread the code |

#### I. Departures from the plan as written

1. The streak ban in §0.7 and §2.10 becomes the forgiving weekly rhythm. Daily counters, loss copy and child notifications stay banned.
2. §2.8: the weekly email goes to every guardian, every week including empty ones, and is default-on after counsel.
3. Test prep moves from the 3 days before to 7–10 days with at least 3 sittings.
4. The §2.4 three-hour break reminder becomes 20 minutes (K–5) or 45 minutes (6–9).
5. Minutes and the homeschool override change as in A.
6. §2.3: worked steps after two tries stays as the remedial path; examples now lead at level 1.
7. Placement may walk down 3 grades.
8. Ink moves to M1/M3, and print-at-home moves earlier for K–2.
9. The §6 tutor eval rule "no praise words" becomes "no empty praise; name the strategy".
10. "Camera off" is clarified as in F.

---

### 3.4 The loop in the engine: changes to the mastery law, 3.2 and 3.3

**Mastery-law changes: owner sign-off required (AGENTS rule 9).** The RULES numbers stay the same. The new rules:
- `rapidShare: 1/3`, `rapidFloorS: 1.5` and `rapidVoid: 2`: rapid answers are excluded from step-down, and checks are voided as in B.
- `retryNeedsNewAct`.
- `parkAfter: 2` more stuck sets and `parkDays: 10`, with a new `SkillState "parked"`.
- A planned worked example counts as help for `helpQuietMs`. It costs nothing, because examples sit far below the top level.
- `Attempt.accommodations` don't set `assisted`, except on skills flagged as measuring reading.
- `placementNext` may walk down to 3 grades below the enrolled grade until two right answers in a row. Today it ends after two misses near one grade below (Muralidharan 2019, +0.37 SD).
- After 3 idle days, start one level lower.
- `readyOwn 9/10` and `checkPass 4/5` are **measured, not changed**: against a first-review survival band of 75–90%, with any change only with the owner (Rohrer 2005; Wilson 2019).

**3.2 Learner model.**
- `PROFILE_RULES.leadEach` goes from 3 to 12 and `reprEach` from 5 to 12.
- While a fact is undecided, the options alternate at random for that child (never in checks). The fact shows as "trying" and is re-checked monthly.
- New facts: anchor fit (share of sittings within 90 minutes of the anchor, by weekday), tiny-sitting share, finished vs abandoned by length, and right-on-own by input mode.
- All of these are suggestions to the grown-up only, and best time never falls within 2 hours of bedtime (Pashler 2008).

**3.3 Improvement loop.**
- Every teaching act is tagged with its **loop stage**: example, guided, retrieval, explain, check, review, wonder, teachback, weekreview. "Is it working?" then names the failing stage ("Recall is holding: 8 of 9 reviews passed. Guided practice is the weak spot; the tutor leads with examples this week").
- New `ActKind` / `Intent` pairs: `teachback` / `retained` (the next review on that skill is right on own); `weekreview` / `week-meets-target`; `card` / `parent-acts`; `why` (practice only); `return` (the first set after a gap finishes).
- Metrics:
  - days a week vs target;
  - returns without prompting;
  - **voluntary sittings** (nothing assigned);
  - Done taps vs abandonment;
  - **first-review survival** at 7 and 21 days, target band 75–90%.
- Guardrails:
  - child use after 21:00 = 0;
  - sittings over budget;
  - friction "a lot" in under 10% of weeks;
  - tiny share.
- Pilot method:
  - write expected effects before the first family, since experts overestimate by 30× or more (Zearn megastudy 2025);
  - 10 families show direction and harms only;
  - an outside benchmark;
  - a follow-up in weeks 8–12.

**§6 additions.**
- Tutor evals: no empty praise; acknowledgements name a strategy; zero pining, guilt or "don't lose" lines.
- Natural use: required parent time ≤ 2 minutes a week.
- e2e: no loss copy in child views, and no notification-permission request in child sessions.

---

### Build packages

**Order.** P1, P3, P5 (read-aloud, ink, visibility) and P6 can start now; they need no vendor and no counsel. P2 waits on the owner's sign-off, which should be asked for now. P4 builds on M5.8 and ships opt-in until counsel signs off. P7 comes after the pilot.

**P1 · The sitting**
- **Builds:**
  - `buildPracticeSlots`:
    - warm-up at slot 0 (K–2) or slots 0–1, drawn in the order from A;
    - landing review in the last slot;
    - new Slot roles `example` and `completion`;
    - `Skill.confusers` with grade 3+ mixing after ready;
    - the "why" prompt (reason choices from tags).
  - Hint attempt gate.
  - Finish screen: 3 lines, equal buttons, the teach-back card hook.
  - `Attempt.input`, `sure` and `rapid` (flag only).
  - Fix my mistake (`show_mistake` in the AI and demo tutors).
  - Tutor eval rule changes and anti-manipulation evals.
- **Files:** `learning/engine.ts`, `learning/types.ts`, `practice/types.ts`, `components/practice/Runner.tsx`, `tutor-dock.tsx`, `lib/practice.ts`, `lib/ai/tools.ts`, `lib/ai/prompts.ts`, `lib/tutor-demo.ts`, `evals/`.
- **Checks:**
  - unit: a 10-slot set for a learner with yesterday's check miss has that skill at slot 0, a secure-skill review at slot 9, and 3 of 10 review slots (2 of 6 for K–2);
  - unit: a level-1 set for a new skill runs example, problem, example, problem;
  - unit: a ready grade-4 skill with confusers yields 3–4 of its 7 main slots from confusers, and a K–2 skill yields none;
  - component: hints are disabled until one attempt (enabled for a pre-reader);
  - e2e: equal computed button sizes, nothing auto-starts, no animation on the finish;
  - evals: 0 pining or guilt lines; acknowledgements name a strategy.
- **Depends on:** M1.9 (sitting design), M1.11 (acts), M4.0 (misconception tags), M2.4 (eval harness).

**P2 · Mastery-law recovery and fairness** (owner sign-off)
- **Builds:** the rules in 3.4: void checks, rapid excluded from step-down, the retry gate (a tutor turn or teach-back counts when no alternative representation exists), `parked`, accommodations not counted as help (with a reading-skill flag), planned example as help, placement walk-down, gap start, short check days.
- **Files:** `learning/engine.ts` and its test, `learning/types.ts`, `practice/types.ts`, `planner/plan.ts`.
- **Checks:**
  - a check with 2 rapid answers is neither passed nor failed, and opens again tomorrow;
  - after a failed check, `checkOpensAt` stays closed until a different act is logged;
  - a skill stuck for 3 + 2 sets parks, `nextSkill` moves to a later secure-prerequisite skill, and the parked skill returns on day 10;
  - a read-aloud right answer on a math skill does not restart the 48-hour clock, but on a decoding skill it does;
  - a grade-5 placement answering at grade-2 level ends at grade 2;
  - every existing engine test still passes.
- **Depends on:** the owner's decision; P1's Attempt fields.

**P3 · The rhythm and the week**
- **Builds:**
  - pure `planner/rhythm.ts` with `weekOf`, `dayCounts` and `termWeeks`;
  - `LearnerSettings` gains `weeklyTarget`, `anchor`, `ifThen`, `bedtime` and `showStrip`; new `WeekPlan` and `RestWeek` records;
  - the Setup "Your time" step;
  - the Today top card (anchor, strip with event marks, close goal, at most 3 tiles, tiny sitting);
  - quiet hours;
  - prep spacing (`prepWindow`, `prepSessions`) with the nudge decoupled;
  - `BAND_MINUTES` and the homeschool override;
  - the stretch-break offer;
  - the Wonder list (`lib/wonder.ts`): last in the package, and can be cut;
  - the landing copy rewrite in EN and ES.
- **Files:** `planner/rhythm.ts` (new), `planner/plan.ts`, `planner/week.ts`, `lib/types.ts`, `lib/practice.ts`, `lib/family.ts`, `lib/nudges.ts`, `components/today/*`, setup screens, `components/magic-box/*`, `i18n/en.ts`, `i18n/es.ts`.
- **Checks:**
  - two sets on one day give 1 dot; an all-rapid set gives 0; a tiny sitting gives 1;
  - the week resets Monday;
  - a property test: no term count ever falls;
  - a test 10 days out produces ≥ 3 prep sittings on separate days, starting 7–10 days before, with the last day mixed;
  - a test 4 days out produces one prep sitting per remaining rhythm day;
  - with bedtime 20:30, no sitting is offered at 19:45;
  - e2e: the anchor set in Setup shows on Today in EN and ES; K–2 Today shows ≤ 3 tiles; child views contain no "streak", "missed" or "lose" text; a missed week renders as plain cells.
- **Depends on:** M1.3 (`planForWeek`), M1.5 (status strip), M1.9, M1 intake; P1 for the warm-up.

**P4 · The people loop and the proof**
- **Builds:**
  - the Friday note builder (7 lines, numbers only, EN/ES, empty-week and gap variants, friction question);
  - `Account.guardians[]`, with removal effective immediately;
  - touch cap and send window;
  - Family card (strip, term cells with the plain count, "Our week", teach-back with "They showed me", dinner card);
  - "Our week" through `Handover`;
  - help scripts, the reward paragraph and the mixed-practice line;
  - the proof screen with then-and-now, the printable proof page and the Proof book;
  - "do one together";
  - the family ring, off by default;
  - "Your grown-up can read these chats";
  - the 13+ summary view behind a flag.
- **Files:** `lib/family.ts`, `lib/nudges.ts`, the M5.8 email job, `components/family/*` (`FamilyCard`, `Handover`, `IsItWorking`, new `TeachBack`, `OurWeek`), `components/growth/*`, `Runner.tsx` finish, `components/tutor/*`, `learning/types.ts` (ActKind/Intent).
- **Checks:**
  - unit: a scripted week produces 7 lines with no model call (EN and ES snapshots), "4 of 4 days (2 tiny)", and the empty-week note;
  - unit: ≤ 3 touches per guardian per week, none between 21:00 and 07:00 local;
  - unit: a removed guardian gets nothing after the removal time;
  - e2e: a passed check shows the teach-back card, and the tap writes a `teachback` act;
  - e2e: "Our week" completes in 3 screens and saves the target; skipping leaves the plan unchanged;
  - e2e: the ring is hidden by default, and no child view shows another child's data.
- **Depends on:** M5.8, M5.5 (guardians and consent), M1.7, M1.11, P3. Counsel decides when default-on and the 13+ view are switched on.

**P5 · Inputs and signals**
- **Builds:**
  - read-aloud on every prompt, choice and hint as an accommodation;
  - the ink scratchpad (`Attempt.work` as vectors), replayed on the child page and in Records;
  - Page Visibility pause and idle pause;
  - the hint-mash response;
  - the paper loop (print, OS-picker photo, crop and EXIF strip, transcription, person confirms, code checks, "checked from a photo", portfolio);
  - "a grown-up was nearby";
  - in M6, `practice/spoken.ts` with echo-confirm.
- **Files:** `components/practice/*` (new `Scratchpad.tsx`), `learning/types.ts`, `lib/voice/*`, `practice/spoken.ts` (new), `lib/intake.ts`, `lib/blobs.ts`, Records.
- **Checks:**
  - the scratchpad works with mouse, touch and pen, keyboard flow is unchanged, and strokes replay with the attempt;
  - a GPS-tagged fixture photo is saved with no EXIF;
  - a hidden tab pauses check timing and leaves the result unchanged;
  - `spoken.ts` maps 50 EN/ES phrasings correctly, and unknown input → null, never a miss;
  - a grep test finds no `video: true` and no live-camera code.
- **Depends on:** M3 (stage), M2.3 (photo), M6 (voice vendor), M5 (consent and retention).

**P6 · Measurement**
- **Builds:**
  - the `PROFILE_RULES` changes, randomized alternation while undecided, the "trying" label and monthly re-checks;
  - the rhythm and input-mode facts;
  - loop-stage tags on every act, and new acts and intents;
  - first-review survival, voluntary sittings and the guardrails;
  - "Is it working?" naming the failing stage;
  - the internal page;
  - the pilot protocol (expected effects, kill rule, week 8–12 follow-up, outside benchmark).
- **Files:** `learning/profile.ts`, `learning/outcomes.ts`, `lib/acts.ts`, `components/family/HowWeTeach.tsx`, `IsItWorking.tsx`, the M5.4b internal page, `docs/plans/` (pilot protocol).
- **Checks:**
  - 5 cases per option leave a fact at "trying", and 12 + 12 with a 15% gap decides it; options alternate under a fixed seed;
  - survival is computed from scripted histories and flagged outside 75–90%;
  - a `weekreview` act resolves met or missed on Sunday;
  - the protocol is committed before the first pilot family.
- **Depends on:** M1.10, M1.11, M5.4b, M7.

**P7 · Circles beyond the family** (1.1, gated)
- **Builds:**
  - the friends circle (pooled, minimum 3, presets, term deletion, leave and wipe);
  - the 13–15 study buddy;
  - the teacher share link (revocable, one recipient, email-confirmed, 14 days, view log) and the teacher seat (co-sign, "from Ms. Lee" sets, drafted check-in);
  - the human-tutor add-on (vetting, recorded sessions, no off-platform contact, AI next-question in the tutor's ear).
- **Files:** `lib/circles.ts` (new), server routes, `components/family/Circle*`, teacher routes.
- **Checks:**
  - an enforcement test: no group path reaches an unapproved child;
  - circle rows are gone after the term job;
  - leave and wipe removes every row;
  - a revoked link returns 404, and each open is listed for the parent;
  - a pilot comparison against family-only when the numbers allow.
- **Depends on:** M5 (accounts, consent, server), counsel, and pilot results.

**Blocked on a decision (needed now):**
1. The owner signs off on the P2 mastery-law changes (AGENTS rule 9).
2. The owner accepts the "streaks with friends" → weekly rhythm plus 1.1 pooled circle trade-off.
3. Counsel rules on four things: the default-on note as a service message, the 13+ summary view, the teacher share link, and whether speech-to-text and wonder queries count as integral service providers.

**Not started, buildable now:** P1, P3, P5 (read-aloud, ink, visibility), P6.

Grounded in:
- `/Users/man/Documents/GitHub/Tutornat/apps/web/src/learning/engine.ts` (RULES; review slots at [3,7] and [3]; `placementNext`)
- `/Users/man/Documents/GitHub/Tutornat/apps/web/src/lib/practice.ts:24` (`BAND_MINUTES` 10/15, fallback 20)
- `/Users/man/Documents/GitHub/Tutornat/apps/web/src/lib/family.ts:~114` (homeschool 20/30)
- `/Users/man/Documents/GitHub/Tutornat/apps/web/src/planner/plan.ts:53` (`PLAN_RULES.prepDays: 3`)
- `/Users/man/Documents/GitHub/Tutornat/apps/web/src/lib/nudges.ts` (`NUDGE_RULES`)
- `/Users/man/Documents/GitHub/Tutornat/apps/web/src/learning/profile.ts` (`leadEach` 3, `reprEach` 5)
- `/Users/man/Documents/GitHub/Tutornat/apps/web/src/learning/types.ts` (ActKind and Intent; Slot roles)
- `/Users/man/Documents/GitHub/Tutornat/apps/web/src/i18n/en.ts:1681` (landing streak copy)
- `/Users/man/Documents/GitHub/Tutornat/docs/plans/2026-10-07-kaizenedu-1.0-plan.md` (§0, §2.8–2.10, §3.2–3.3, §6, M1–M7)