# Research: Competitors and UX (2026-09-30)

Produced by a research agent on 2026-09-30 for `docs/REPLAN.md`. Vendor pages were egress-blocked from the sandbox; every price and latency figure that is not measured in this repo is a secondary-source number and is marked unverified in the text. Nothing here is public copy.

## Summary

Verdict in one paragraph: KaizenEdu today is an honest, well-engineered parent-facing web form attached to a batch voice pipeline. Nothing in it is designed for the ten-year-old who is supposed to use it, and the latency budget on paper (1.5 s p50) has never been measured on the pipeline that actually ships (docs/SPIKE-latency.md: "TTS and ASR are not [measured]"). The market moved in 2026: OpenAI (GPT-Live, July 8), Google (Gemini 3.8 Live, Sept 15) and Sesame ship full-duplex speech-to-speech; the voice tutors that parents actually rate (Synthesis, Aristotle, COSMIQ) open by talking, not with a form; and the biggest cautionary tale (Khanmigo, Chalkbeat Aug 2026: 96% tried it, median student used it on a third of days and in 17% of error sessions) says engagement, not access, is the binding constraint. The ten changes below are ordered by how much perceived quality they buy: (1) one press and the tutor speaks first, (2) a pre-synthesized first greeting under ~1.5 s, (3) live captions and a spoken backchannel to fill the wait, (4) a streaming ASR + websocket-TTS pipeline with a shorter end-of-turn (or speech-to-speech for the conversational layer, text model for checks), (5) a board that is readable on a 390 px phone (today its 18 px sheet text renders at ~6 px), (6) a named tutor with a voice-reactive identity instead of the teal pebble, (7) a session screen with one AI label, no permanent camera-off row, no countdown clock, a one-row dock, (8) a guest Learn page that is one "continue" card instead of five empty panels, (9) photo-of-homework as a front-door action, (10) a parent trust page with measured numbers and a live-turn model whose terms permit under-18 use (Gemini API terms forbid services likely to be accessed by under-18s; kaizen.config.ts:243 routes the fast role to google:gemini-3-flash-preview). Every product claim below cites a URL; several vendor latency figures come from vendor or third-party blogs and are marked unverified where I could not reach the primary page (many primary domains are egress-blocked from this sandbox).

## Findings

### Competitor read 1 — Khanmigo: the safety benchmark and the engagement warning

Effort: n/a (research)

Interaction model: text chat with speech-to-text input and read-aloud TTS; no real-time conversational voice (Khan Academy help center describes STT and TTS as separate features). Opens with a grade/subject onboarding and an activity picker; sits beside Khan Academy exercises. Kids and safety: parent plan covers up to 10 kids, parents see chat history and get safety alerts; Common Sense Media scored it high on transparency, safety, learning and privacy. Price: about $4/month for families. What reviewers praise: writing feedback, patience, the Socratic rule. What the field learned in 2026: a two-year school experiment (EdWorkingPaper 26-1551, reported by Chalkbeat 2026-08-25) found 96% of students tried Khanmigo but the median student messaged it on a third of practice days and in only 17% of sessions where they made a mistake; messages were mostly bare answers or clicks on suggested prompts; gains resembled plain Khan practice. Khan Academy responded by making Khanmigo always-on rather than opt-in. Implication for us: a tutor the child must seek out and type to will not be used; the opening has to be the tutor speaking.

Recommendation: Copy the parent surface (chat history, alerts, one price), not the interaction model. Treat the Chalkbeat numbers as the null hypothesis for KaizenEdu and instrument turns-per-session and return visits from day one.

Evidence: https://support.khanacademy.org/hc/en-us/articles/37785606729101-How-to-Use-Speech-to-Text-with-Khanmigo ; https://www.khanmigo.ai/parents ; https://www.kidsaitools.com/en/articles/khanmigo-review-parents-complete-2026 ; https://www.chalkbeat.org/2026/08/25/ai-tutoring-students-khanmigo-khan-academy-engagement-study/ ; https://edworkingpapers.com/ai26-1551 ; https://www.chalkbeat.org/2026/04/09/sal-khan-reflects-on-ai-in-schools-and-khanmigo/

### Competitor read 2 — Synthesis Tutor: the closest voice-first product for kids, and what parents complain about

Effort: n/a (research)

Ages 5-11, K-5 math only. A named voice tutor ('Oliver') talks the child through on-screen manipulatives; the child works by touch and speech. There is no placement form: the tutor finds the level over the first few sessions. Sessions are 15-20 minutes on a tablet. Pricing: $45/month individual, $29/month family (up to 7 kids), $300/year, lifetime tiers; 7-day trial without a card. Reception: 4.6/5 aggregate, Trustpilot ~87% five-star with parents reporting kids asking for 'Synthesis time'. Complaints are almost all technical: 'microphone input by the child rarely gets recognized', blank screens, a child stuck in the division assessment, hard-to-reach support; some Reddit criticism of AI-only teaching. Lesson: with a kid, voice reliability is the product; a mic failure is a session lost, and a placement gate is a wall.

Recommendation: Adopt the 'named tutor speaks first, no placement wall' opening. Build a mic self-test with a visible level meter into the first screen and log ASR empty-result rate per device class.

Evidence: https://www.synthesis.com/tutor (egress-blocked; described via) https://homeschooltools.net/offering/synthesis-tutor ; https://brighterly.com/blog/synthesis-tutor-cost/ ; https://www.trustpilot.com/review/www.synthesis.is ; https://www.aitoolsforkids.com/blog/synthesis-tutor-review-ai-math-tutor-for-kids ; https://homeschoolclarity.com/synthesis-tutor-review/

### Competitor read 3 — Aristotle and COSMIQ: the two 2026 voice-first launches with a whiteboard, i.e. our direct shape

Effort: n/a (research)

Aristotle (heyaristotle.com, JSV AI): voice-first, student talks through problems aloud, a live whiteboard draws steps and diagrams, photo/PDF/textbook upload, memory across sessions and per-skill mistake tracking, 65 subjects for grades 6-12, parent dashboard with email summaries. Raised a $5M seed announced 2026-09-16 with a 'nationwide' launch for grades 6-12. Pricing: 3 free sessions, $49/month for 8 sessions, $199/month unlimited. App Store reviews praise the photo recognition for word problems and call it 'a little finicky'. K12SafeList (April 2026) found no published privacy policy or terms, so districts cannot approve it; a Sept 2026 critique says it logged 1,500 tutoring hours without publishing a learning outcome (page egress-blocked; unverified beyond the title/snippet). COSMIQ (getcosmiq.app, launched 2026-08-03): free forever for K-12, eight teacher personas, spoken lessons in English and Spanish, a smart board with diagrams, number lines, graphs and step-by-step solving rendered live, homework upload; funded by adult exam prep and schools. No independent reviews found. Lesson: 'voice + board + photo of homework + memory' is now table stakes; our differentiator has to be latency, the mastery record, and a privacy posture these two lack.

Recommendation: Position against both on the things they cannot say: a published privacy policy today, no account, a measured first-audio number, and a mastery record that never scores helped work. Ship photo-of-homework at the front door (finding 19).

Evidence: https://pulse2.com/aristotle-raises-5-million-seed-funding/ ; https://runtimewire.com/article/aristotle-raises-5m-voice-ai-tutor ; https://www.heyaristotle.com/ai-tutor-for-kids (egress-blocked; summarized from search snippets) ; https://apps.apple.com/us/app/aristotle-tutor/id6472252066 ; https://k12safelist.com/tool-aristotle ; https://digidai.github.io/2026/09/17/aristotle-ai-tutoring-hours-learning-outcomes/ (unverified) ; https://www.pr.com/press-release/975467 ; https://getcosmiq.app/

### Competitor read 4 — Language tutors (Speak, Duolingo Video Call, Praktika): what a good voice opening feels like and where avatars go wrong

Effort: n/a (research)

Speak: voice is required from the first session ('users must use their voice to answer questions in short, real-life scenarios'); Live Roleplays run on the OpenAI Realtime API; $120-180/year; complaints: brief, shallow feedback, no text shown in speaking mode, 2-3 s latency spikes on EU servers in one test. Duolingo Video Call with Lily (Max tier, GPT-4o + a memory system): the reviewer describes the first call as 'jarring with no on-screen prompts or safety nets — just Lily staring into her phone waiting for your reply'; she slows down or speeds up with you; 'very helpful, even with the glitches'. Praktika: photoreal avatars, $8/month with a minimum 3-month commitment, praised for polish, criticized for a rigid path and thin feedback. Lessons: (a) voice-from-the-first-second works when the tutor carries the conversation; (b) a face that waits silently is worse than no face; (c) always show text alongside speech (Speak's biggest complaint) — our transcript rail is right, our board-first phone layout hides it.

Recommendation: Design the first ten seconds so the tutor is never silently waiting: it greets, asks one question, and shows a live caption of what it heard.

Evidence: https://learn.kotoenglish.com/blog/speak-app-review/ ; https://www.speak.com/blog/live-roleplays ; https://www.lingualive.ai/blog/best-ai-language-tutor-2026 ; https://theowlandme.blog/2026/01/10/review-duolingo-max-video-calls/ (egress-blocked; quoted from search snippet) ; https://duoplanet.com/duolingo-video-call/ ; https://blog.duolingo.com/ai-and-video-call/ ; https://languatalk.com/blog/praktika-review/

### Competitor read 5 — Platform learning modes (Google Guided Learning/LearnLM, OpenAI study mode + GPT-Live, Anthropic learning mode) and what they mean for a free tutor

Effort: n/a (research)

Google: Guided Learning in Gemini is free, Socratic, adds curated videos, and is wired into Classroom; DeepMind's Sierra Leone RCT reports ~12 hours over 8 weeks moved students from the 50th to the 64th percentile in math — the only RCT-grade outcome in this list. Voice: Gemini 3.8 Live (2026-09-15) is native speech-to-speech with async function calling and streaming video input at $3/$12 per 1M audio tokens (~$0.005 in / $0.018 out per minute) — the cheapest full-duplex option by a wide margin (figures from third-party summaries; ai.google.dev egress-blocked, so unverified against the primary page). OpenAI: study mode is free on all plans but voice is dictation only; GPT-Live (2026-07-08) replaced Advanced Voice with a full-duplex model that 'delegates complex tasks to GPT-5.5 in the background while keeping you talking' — that two-layer design (fast voice layer, slower reasoning layer) is the architecture a math tutor needs, because Realtime-class models are documented as weaker on number sequences and run at a minimum temperature of 0.6. Anthropic: learning mode is a Socratic text style (Aug 2025); Claude for Teachers (2026-07-14) is explicitly not for students; there is no Anthropic speech API — the Anthropic key is useful only for the text reasoning/grading layer. Implication: 'free Socratic chat' is now a commodity from all three labs; a free web tutor competes on voice quality, latency, the board, and the record — not on the model.

Recommendation: Adopt the two-layer pattern: a speech-native or streaming-voice layer for the conversation, a text model (Anthropic or Gemini text) for checks, grading, board actions and the WRAP. Cite Google's RCT as the benchmark we must eventually match, not a claim we can make.

Evidence: https://blog.google/products/gemini/guided-learning-google-gemini/ ; https://deepmind.google/blog/measuring-the-impact-of-learning-with-ai-in-sierra-leone-and-beyond/ ; https://blog.google/innovation-and-ai/technology/developers-tools/build-real-time-voice-applications-gemini-audio/ ; https://www.datacamp.com/blog/gemini-3-8-live (pricing, unverified) ; https://openai.com/index/chatgpt-study-mode/ ; https://help.openai.com/en/articles/11780217-using-study-mode-in-chatgpt ; https://openai.com/index/introducing-gpt-live/ ; https://techcrunch.com/2026/07/08/openai-releases-new-voice-models-for-more-natural-live-conversations/ ; https://community.openai.com/t/why-is-realtime-model-so-bad-at-understanding-sequences-of-numbers/995062 ; https://www.engadget.com/ai/anthropic-brings-claudes-learning-mode-to-regular-users-and-devs-170018471.html ; https://www.anthropic.com/news/claude-for-teachers

### Competitor read 6 — Sesame, ElevenLabs, MagicSchool/Brisk, Common Sense Media: presence, voice vendors, and the safety bar

Effort: S (1 day for the level cut)

Sesame: four named agents (Maya, Miles, Simone, Charlie) in a free iOS app in 39 countries (2026-05-28); glasses expected 2027; the open-source CSM-1B (Apache 2.0) is a Llama-backbone speech model with reported ~380 ms end-to-end latency. Its lesson is that presence comes from voice, timing and memory with almost no visual — a name and a waveform. ElevenLabs: Eleven v3 Conversational is GA for real-time with audio tags (Aug 2026); Flash v2.5 is the recommended agent model (~75 ms model latency claimed; a third-party TTFA benchmark measured 288 ms p50 over HTTP streaming vs Cartesia Sonic-3 188 ms and Deepgram Aura-2 313 ms); Agents platform ~$0.08/min all-in, Flash TTS via API ~$0.045/min. No education case study found. MagicSchool (Raina student tutor, free tier, $8.33/mo Plus) and Brisk (teacher Chrome extension) are teacher-procured, text-first tools — not competitors for a consumer voice tutor, but MagicSchool's district footprint is where 'national' distribution lives. Common Sense Media (Jan 2026): avoid voice AI toys for ages 5 and under, 'extreme caution' for 6-12; testing found voice-recognition failures, inappropriate activations and inaccurate responses. Our landing page today offers a 'Before kindergarten' level — that is exactly the group Common Sense says to keep away from voice AI.

Recommendation: Drop the 'Before kindergarten' and probably 'K-3' guest levels from the public front door until there is a supervised mode; keep grades 4-9 as the shipped promise the landing already states.

Evidence: https://techcrunch.com/2026/05/28/sesame-the-conversational-ai-startup-from-oculus-founders-launches-its-ios-app/ ; https://github.com/SesameAILabs/csm ; https://huggingface.co/sesame/csm-1b ; https://i10x.ai/tools/sesame-conversational-speech-model (380 ms figure, unverified) ; https://alternativeto.net/news/2026/8/elevenlabs-makes-eleven-v3-conversational-speech-model-widely-available/ ; https://elevenlabs.io/docs/overview/models (egress-blocked) ; https://gradium.ai/content/tts-latency-benchmark-2026 (third-party benchmark) ; https://elevenlabs.io/pricing/agents ; https://www.edusageai.com/blogs/magicschool-pricing-for-teachers-and-districts-in-2026 ; https://www.commonsensemedia.org/press-releases/common-sense-media-warns-against-ai-toy-companions-after-research-reveals-safety-risks ; /home/user/KaizenEdu/kaizen.config.ts (GUEST_LEVELS 'early' and 'k-3')

### Pipeline finding — the shipped turn path cannot hit 1.5 s p50 as built, and nobody has measured it

Effort: S (half a day to measure)

What ships: browser VAD with a 600 ms end-of-speech hangover (lib/tutor/voice/vad.ts:71) → whole-utterance WAV upload to POST /api/tutor/asr (app/(learner)/api/tutor/asr/route.ts) → OpenAI transcription via the AI SDK (lib/audio/asr-providers.ts:407) → SSE turn on google:gemini-3-flash-preview (kaizen.config.ts:243) with a prompt rule asking for a <10-word opener (lib/tutor/prompts/build.ts:223) → one POST /api/tutor/tts per sentence, explicitly non-streaming (app/(learner)/api/tutor/tts/route.ts:5; lib/audio/tts-providers.ts:289 gpt-4o-mini-tts, stream:false at :492) → decode → Web Audio. Serial floor = 600 ms hangover + upload + ASR round trip + LLM first sentence (measured 774-781 ms to first sentence on 2026-09-05, build.ts:215) + a full non-streamed TTS clip + decode. docs/SPIKE-latency.md states the TTS and ASR hops have never been run from a keyed machine; the mock proof (first_audio 1,183 ms) uses invented 250/300 ms delays. Third-party 2026 benchmarks put OpenAI's non-streaming TTS at >1 s p50 (tts-1-hd 2,295 ms; gpt-4o-mini-tts not in that table — unverified) and streaming vendors at 155-313 ms TTFA. Also: the Google key is a free-tier key (owner says 5 RPM; third-party guides say 10 RPM for Gemini 3 Flash — either way not a production quota), and the Gemini API terms say you 'will not use the Services as part of a website, application, or other service that is directed towards or is likely to be accessed by individuals under the age of 18' — the code already anticipates this (kaizen.config.ts:276-281 comment).

Recommendation: Before any redesign, run `pnpm latency` and ten real voice turns on a phone with `?metrics=1` and paste the p50/p90 into docs/SPIKE-latency.md. Then choose one of the two architectures in the next finding.

Evidence: /home/user/KaizenEdu/lib/tutor/voice/vad.ts:71 ; /home/user/KaizenEdu/app/(learner)/api/tutor/tts/route.ts:2-9 ; /home/user/KaizenEdu/lib/audio/tts-providers.ts:281-289,492 ; /home/user/KaizenEdu/lib/audio/asr-providers.ts:407 ; /home/user/KaizenEdu/kaizen.config.ts:168-176,239-249 ; /home/user/KaizenEdu/docs/SPIKE-latency.md ; /home/user/KaizenEdu/lib/tutor/prompts/build.ts:206-223 ; https://gradium.ai/content/tts-latency-benchmark-2026 ; https://deepgram.com/learn/deepgram-vs-openai-vs-google-stt-accuracy-latency-price-compared ; https://ai.google.dev/gemini-api/terms (egress-blocked; quoted via https://github.com/AI-X-16-1/BOOKIT/issues/54 and https://discuss.google.dev/t/question-regarding-age-restrictions-for-the-gemini-api/188060) ; https://pecollective.com/tools/gemini-free-tier-guide/

### Pipeline recommendation — two viable architectures for 'low latency at national scale', with 2026 prices

Effort: L (2-3 weeks for A; 1 week spike for B)

Option A, streaming cascade (keeps the text model in the loop, best for math and the board): (1) stream mic audio over a websocket to a streaming ASR with semantic end-of-turn (Deepgram Nova-3 ~sub-300 ms; OpenAI gpt-live-transcribe ~$0.017/min; Gemini 3.5 Transcribe) so the transcript is final ~200-300 ms after the last word instead of 600 ms hangover + upload + batch; (2) keep the SSE text model but start TTS on the first clause; (3) websocket TTS (ElevenLabs Flash v2.5 or Cartesia Sonic-3) returning PCM/µ-law chunks played as they arrive, ~$0.045/min; (4) cut VAD hangover to ~300 ms with a turn-detector model (LiveKit/Pipecat-style; their production numbers are 700-950 ms end-to-end on this shape). Expected first audio: roughly 800-1,200 ms p50 (my estimate from the vendor figures, unverified until measured). Option B, speech-to-speech for the conversation + text model for pedagogy (the GPT-Live pattern): Gemini 3.8 Live at ~$0.023/min or gpt-realtime-mini at ~$0.02-0.05/min, with function calls to a text model for checks, grading, board actions and the WRAP. Sub-600 ms, natural barge-in and backchannels for free, but three costs: the Realtime-class models are documented as weaker on digits, the minimum temperature is 0.6, and the Gemini under-18 terms issue applies to the Live API too. At $0.05/min, 120 free minutes/day/guest is $6/guest/day — 'free with no account' cannot survive national scale on either option without a cap far below 120 minutes (kaizen.config.ts:338) or a paid tier. Either way, move the 9-12 and 13-17 bands off Gemini or obtain written clearance; TUTOR_BAND_MODEL_ROUTES already exists for this (kaizen.config.ts:286).

Recommendation: Ship Option A first (it reuses turn-controller.ts, playback-queue.ts, the sentence splitter and the board reducer unchanged) and prototype Option B behind a flag for the 13+ bands. Files: lib/tutor/voice/asr-client.ts → websocket client; app/(learner)/api/tutor/asr → token-minting route; app/(learner)/api/tutor/tts → streaming proxy; lib/audio/tts-providers.ts ElevenLabs branch → /stream websocket; lib/tutor/voice/vad.ts hangover.

Evidence: https://www.retellai.com/blog/best-speech-to-text-models ; https://www.coval.ai/blog/best-speech-to-text-providers-in-2026-independent-benchmarks-and-how-to-choose/ ; https://www.forasoft.com/blog/article/openai-realtime-api-pricing ; https://www.eesel.ai/blog/gpt-realtime-mini-pricing ; https://hackernoon.com/openai-realtime-api-pricing-in-2026-real-world-data-from-4000-measured-sessions ; https://www.datacamp.com/blog/gemini-3-8-live ; https://www.futureagi.com/blog/elevenlabs-vs-cartesia-tts-2026/ ; https://www.forasoft.com/blog/article/pipecat-vs-livekit-agents ; https://www.evalgent.com/blog/pipecat-vs-livekit ; /home/user/KaizenEdu/kaizen.config.ts:286-320,338 ; /home/user/KaizenEdu/lib/tutor/voice/turn-controller.ts (barge-in and marks already exist)

### UX verdict — the front door is a parent's form, not a ten-year-old's

Effort: n/a (judgment)

The landing hero (components/tutor/marketing/landing.tsx:36-52) puts a 320-word page of plain prose beside a form (components/tutor/learn/guest-start.tsx) with: eight level cards in two columns ('Before kindergarten — A grown-up reads along', 'Kindergarten to 3rd grade — Short sessions, lots of drawing'…), nine subject chips (components/tutor/learn/topic-fields.tsx; 'History and social studies', 'Test prep', 'Something else'), a text box ('What do you want to work on?'), a Voice/Text toggle, and Start. Pressing Start does not start: it navigates to a second screen, 'Ready when you are', with a bullet list and a second 'Start the session' button (components/tutor/session/session-screen.tsx:88-112), and only then the mic prompt, then a model call for the greeting (LATENCY.firstAudioAfterStartMs allows 10 s, kaizen.config.ts:175). A ten-year-old reads none of the level hints (they are written to the parent), does not know which of nine subjects 'the thing my teacher said' is, and has to type a topic before hearing a voice. Compare Synthesis (no placement form, the tutor talks first), Speak (voice from the first prompt), Duolingo (the character is already on the call). The form is defensible as a parent's settings panel; it is the wrong first screen.

Recommendation: See change 1 (one press, tutor speaks first) and change 2 (greeting in under ~1.5 s).

Evidence: /home/user/KaizenEdu/components/tutor/marketing/landing.tsx ; /home/user/KaizenEdu/components/tutor/learn/guest-start.tsx ; /home/user/KaizenEdu/components/tutor/learn/topic-fields.tsx ; /home/user/KaizenEdu/components/tutor/session/session-screen.tsx:88-112 ; /home/user/KaizenEdu/kaizen.config.ts:175,349-395 ; https://homeschooltools.net/offering/synthesis-tutor ; https://learn.kotoenglish.com/blog/speak-app-review/

### UX verdict — the session screen: what the learner looks at while waiting, the board on a phone, the presence blob

Effort: n/a (judgment)

Waiting: after end of speech the learner sees the teal form contract, a dashed ring and one dot (the README calls the dot's 74°/620 ms motion 'a beat, not a hang'; frozen, it is a dashed circle with a dot — a loading spinner), plus a 13 px grey 'Thinking' label (session.css .nt-phase) and a '…' in the transcript. Nothing shows what was heard, so a mis-transcription is discovered only when the tutor answers the wrong thing. Board on phone: the whiteboard is a fixed 1000×562 logical sheet (components/tutor/board/reducer.ts:32-34) scaled into a ~358 px-wide tile; default board text is 18 px sheet units (reducer.ts:135), i.e. ~6.4 px rendered — the 390 px screenshot (docs/evidence/step-3/session-pointing-m-light.png) shows 'one whole, and the shaded half' as an unreadable red-underlined smear. On desktop (session-pointing-d-dark.png) the 16:9 sheet floats in the middle of a tall dark tile with most of the tile empty. Chrome: the 'AI tutor' pill appears three times (header, tile, transcript label), the tile carries a permanent 'Your camera is off. This tutor works with voice and the board.' row with a dashed slot (tutor-tile.tsx:87-93), a '5:01 / 25:00' countdown in the tile bar, and on phones a three-row dock (talk / type / end+report) fixed at the bottom reserving 9.5 rem (session.css:66,375-383) — roughly a quarter of an iPhone viewport. The presence: the pebble is not creepy, which was its only brief (avatar/README.md), and it is not convincing either — it has no name, no eyes-toward-you, no idle personality; it reads as a Siri-era orb in teal. The kept SVG character is a generic clip-art boy. Neither is a brand asset; the product's identity today is 'warm neutral + teal + Geist', which is competent SaaS and forgettable.

Recommendation: See changes 3 (live captions + spoken backchannel), 5 (responsive board), 6 (named voice identity), 7 (chrome diet).

Evidence: /home/user/KaizenEdu/components/tutor/session/session.css:66,120-160,375-383 ; /home/user/KaizenEdu/components/tutor/session/tutor-tile.tsx:60-96 ; /home/user/KaizenEdu/components/tutor/board/reducer.ts:32-34,135 ; /home/user/KaizenEdu/components/tutor/board/board-pane.tsx ; /home/user/KaizenEdu/docs/evidence/step-3/session-pointing-m-light.png ; /home/user/KaizenEdu/docs/evidence/step-3/session-pointing-d-dark.png ; /home/user/KaizenEdu/docs/evidence/presence-comparison-light.png ; /home/user/KaizenEdu/components/tutor/avatar/README.md ; /home/user/KaizenEdu/components/tutor/brand/tokens.css

### UX verdict — the Learn page and the copy

Effort: n/a (judgment)

A first-visit guest lands on a page titled literally 'Hi.' (lib/tutor/client/copy.ts:57) with 'Say what you want to work on and start.', a 'Level: 4th to 5th grade — Change' line, then the same start form again, then Planner (empty), Your homework (empty), Recent sessions (empty), How it is going ('Nothing checked yet'), and a minutes banner (docs/evidence/step-2/learn-m-light.png shows the equivalent signed-in stack at ~2,000 px tall). Five empty panels is a dashboard for a product manager, not a next step for a kid. Copy: the prose is disciplined (no exclamation points, no 'unlock'), and the honesty sections ('What it will not do') are genuinely good for parents; but there is no sentence anywhere written to the learner in the second person at a ten-year-old's reading level, and the tutor has no name — every label says 'AI tutor' (kaizen.config.ts:441), which is a compliance label, not a character. 'Natural Tutor' is a placeholder working name by decision D13. The WRAP screen (wrap-screen.tsx) is good: recap, practice, one thumbs question, no streaks.

Recommendation: See change 8 (one 'continue' card) and change 6 (a name).

Evidence: /home/user/KaizenEdu/lib/tutor/client/copy.ts:55-60 ; /home/user/KaizenEdu/app/(learner)/learn/page.tsx ; /home/user/KaizenEdu/components/tutor/learn/workspace.tsx ; /home/user/KaizenEdu/docs/evidence/step-2/learn-m-light.png ; /home/user/KaizenEdu/kaizen.config.ts:441 ; /home/user/KaizenEdu/components/tutor/session/wrap-screen.tsx

### Change 1 — One press, and the tutor speaks first

Effort: M (3-4 days)

Screen: the landing hero becomes a single 64 px button, 'Talk to the tutor', above one line: 'Free. No account. Say what you are stuck on.' Beneath it, small: 'Grown-ups: set the level and read the rules' (opens today's form as a disclosure). Pressing the button does three things inside the one user gesture: unlocks the AudioContext (iOS), requests the mic, and POSTs /api/tutor/guest with a default level (grades 4-5) and no topic — the guest route already accepts a level with no topic (guest-level.tsx re-levels this way). Navigation lands directly in the live session; the 'Ready when you are' interstitial is removed. First ten seconds: the tile shows the tutor's name and a waveform that starts moving as it says 'Hi, I'm [name]. What are you working on today — math, reading, something else?' The subject and level come from the answer (the prompt's greet/intake phase already asks this; build.ts:239). Mic denied: the same screen shows the keyboard with 'Type it instead' and the tutor's greeting as text.

Recommendation: Files: landing.tsx (hero), guest-start.tsx (collapse to button + disclosure), session-screen.tsx (delete the pre-start branch, start on mount when a `?go=1` flag is set from the landing press), use-tutor-session.ts (start() invoked with the gesture-created AudioContext handed through sessionStorage or a module singleton).

Evidence: /home/user/KaizenEdu/components/tutor/marketing/landing.tsx:36-52 ; /home/user/KaizenEdu/components/tutor/learn/guest-start.tsx:57-79 ; /home/user/KaizenEdu/components/tutor/learn/guest-level.tsx:35-45 ; /home/user/KaizenEdu/components/tutor/session/session-screen.tsx:38-46,88-112 ; /home/user/KaizenEdu/lib/tutor/prompts/build.ts:237-241 ; /home/user/KaizenEdu/lib/tutor/voice/audio-context.ts

### Change 2 — The first greeting plays in under ~1.5 s, pre-synthesized

Effort: S (2 days)

Today the greeting is a full model turn (use-tutor-session.ts:446 'the first voice turn is exactly the greeting request') and the budget allows 10 s (kaizen.config.ts:175). Replace it with a per-band, per-hour-of-day bank of 6-10 recorded greeting clips generated offline with the production voice ('Hi, I'm [name]. What are you working on today?'), served from static storage, and played the instant the session mounts while the real intake turn streams behind it. The transcript shows the greeting text as it plays. For a returning guest the clip is 'Welcome back. Last time we did [skill] — same thing, or something new?' with the skill name spoken by a short TTS call that starts in parallel. Measure `firstAudioAfterStartMs` and set the budget to 1,500.

Recommendation: Files: a `public/voice/greetings/<band>/<n>.mp3` bank plus a build script; use-tutor-session.ts start() enqueues the clip before the greet turn; playback-queue.ts gains a `prime(bytes)`; docs/CLAIMS.md row for any stated number.

Evidence: /home/user/KaizenEdu/components/tutor/session/use-tutor-session.ts:440-450 ; /home/user/KaizenEdu/kaizen.config.ts:174-175 ; /home/user/KaizenEdu/lib/tutor/voice/playback-queue.ts ; /home/user/KaizenEdu/lib/tutor/prompts/build.ts:237-241

### Change 3 — Fill the wait with what was heard and a spoken backchannel

Effort: M (3 days)

Screen during 'thinking': the tile's phase word goes away. In its place, at 24 px, the learner's own words appear as they are recognized (streaming partials from change 4; until then, the final transcript the moment ASR returns), in a quieter color, then the tutor's first words replace them at full color as the first sentence streams. A wrong transcription is visible and correctable ('Not that? Say it again'). Sound: at end of speech, before the model has answered, play one of ~8 short recorded backchannels in the tutor's voice ('Mm-hm.', 'Okay.', 'Let me think.') chosen by the presence rules that already produce display-only cues (lib/tutor/presence/rules.ts:103-134) — spoken, not printed, so the 600-1,500 ms gap sounds like a person pausing. Cancel it on barge-in like any clip. Rule: at most one per turn and never on turns under two seconds, or it becomes a tic.

Recommendation: Files: tutor-tile.tsx (caption slot replaces phase word), session.css (.nt-caption at 1.5rem), presence/rules.ts (cue → clip id), playback-queue.ts (enqueue static clip), turn-controller.ts (emit `asr-partial` events).

Evidence: /home/user/KaizenEdu/components/tutor/session/tutor-tile.tsx:16-22,79-84 ; /home/user/KaizenEdu/components/tutor/session/session.css:120-160 ; /home/user/KaizenEdu/lib/tutor/presence/rules.ts:103-134 ; /home/user/KaizenEdu/lib/tutor/voice/turn-controller.ts (phase machine, MARKS) ; https://openai.com/index/introducing-gpt-live/ (full-duplex models do this natively)

### Change 4 — Streaming ASR, websocket TTS, shorter end-of-turn (the latency change)

Effort: L (2-3 weeks)

This is finding 8's Option A made concrete. Client: replace whole-utterance upload with a websocket that streams 16 kHz PCM from the existing VAD worklet; end-of-turn from the ASR's endpointing plus a 250-300 ms hangover instead of 600 ms. Server: a short-lived token route for the ASR vendor (keys stay server-side, invariant e), and a TTS proxy that opens a vendor websocket per turn and forwards audio chunks over a ReadableStream so the first ~200 ms of audio plays before the sentence has finished synthesizing. Keep the sentence splitter (it decides where to *start* TTS, not where to *stop*), the playback queue's fade/hold barge-in, and the board reducer untouched. Vendor picks with the keys on hand: OpenAI gpt-live-transcribe (~$0.017/min) for ASR now, Deepgram later if cost matters; ElevenLabs Flash v2.5 over websocket for TTS (the ElevenLabs key is already in .env.local; the upstream provider file has a non-streaming ElevenLabs branch at tts-providers.ts:932 with eleven_multilingual_v2 — switch to eleven_flash_v2_5 and the /stream-input websocket). Target: first audio ≤ 1,000 ms p50 measured on a phone.

Recommendation: Sequence: (1) measure baseline with pnpm latency; (2) websocket TTS first (largest single win, no client protocol change beyond chunked decode); (3) streaming ASR; (4) hangover to 300 ms with the ASR's endpoint signal; re-measure after each. Load the voice-pipeline skill before touching these files.

Evidence: /home/user/KaizenEdu/lib/tutor/voice/vad.ts:71,112,310 ; /home/user/KaizenEdu/lib/tutor/voice/asr-client.ts ; /home/user/KaizenEdu/lib/tutor/voice/tts-client.ts ; /home/user/KaizenEdu/app/(learner)/api/tutor/tts/route.ts ; /home/user/KaizenEdu/lib/audio/tts-providers.ts:281-289,932 ; /home/user/KaizenEdu/docs/SPIKE-latency.md ('ElevenLabs has /stream and /with-timestamps endpoints upstream does not call') ; https://www.waboom.ai/blog/elevenlabs-v3-vs-flash-voice-agents ; https://gradium.ai/content/tts-latency-benchmark-2026 ; https://www.eesel.ai/blog/gpt-realtime-mini-pricing (transcription price)

### Change 5 — A board a phone can read; board-first on phones

Effort: M (4-5 days)

Screen on a 390 px phone: the board is the main pane (full width, ~55% of viewport height), the tutor is a 72 px round presence in the top-right corner over the board (picture-in-picture, as every video-call app does), the live caption runs under the board, and the dock is one row. Board rendering: stop scaling a 1000×562 sheet; lay elements out on a responsive sheet whose logical width equals the tile's CSS width, and set text in CSS px with a floor of 18 px rendered on phones and 22 px on the kids surface (tokens.css already scales body text per surface; the board should read `--nt-text-body`). Bars, number lines and tables get a minimum stroke of 2 px rendered. Keep the KaTeX path. Desktop: the sheet fills the tile height rather than floating in the middle of it (session-pointing-d-dark.png).

Recommendation: Files: reducer.ts (BOARD_WIDTH from a prop, fontSize floor), board-pane.tsx (pass measured width via ResizeObserver), session.css (phone grid: board first, tutor PiP, .nt-avatar-host 4.5rem on phones), tutor-tile.tsx (compact variant). Load the openmaic-internals skill before touching WhiteboardCanvas.

Evidence: /home/user/KaizenEdu/components/tutor/board/reducer.ts:32-34,135-140 ; /home/user/KaizenEdu/components/tutor/board/board-pane.tsx ; /home/user/KaizenEdu/components/tutor/session/session.css:55-77,205-232 ; /home/user/KaizenEdu/components/tutor/brand/tokens.css:66-95 ; /home/user/KaizenEdu/docs/evidence/step-3/session-pointing-m-light.png ; https://www.pr.com/press-release/975467 (COSMIQ's board is the headline feature)

### Change 6 — Give the tutor a name and a voice-reactive identity mark; retire the pebble as the face

Effort: M (3-4 days)

Screen: the tile shows a name ('Kai' or whatever the brand decides — D13 says the brand is unsettled, so pick a tutor name that is not the company name), a simple ring that breathes on idle, fills toward the learner while listening (driven by mic level — the README notes the level channel already exists), pulses with the voice envelope while speaking, and tilts toward the board while drawing. No dashed spinner in thinking: the ring holds still and the spoken backchannel (change 3) carries the beat. This is Sesame's move — presence from voice, timing and a name; almost no visual — and it is what the abstract presence was already trying to be without committing. Keep the 'AI tutor' label once, next to the name ('Kai · AI tutor'). Keep the Rive seam so a commissioned character can replace the ring after the five-kid test the design skill already requires; do not ship the SVG boy.

Recommendation: Files: kaizen.config.ts PRODUCT (add tutorName; aiLabel stays), avatar/presence-rig.ts (simplify to ring + level), avatar/README.md, tutor-tile.tsx, transcript.tsx (speaker label = name), docs/CLAIMS.md (the disclosure row must still hold: it says it is an AI when asked).

Evidence: /home/user/KaizenEdu/components/tutor/avatar/README.md ('What the presence does', 'The level channel') ; /home/user/KaizenEdu/components/tutor/avatar/presence-rig.ts ; /home/user/KaizenEdu/components/tutor/avatar/config.ts:82-112 ; /home/user/KaizenEdu/docs/evidence/presence-comparison-light.png ; /home/user/KaizenEdu/kaizen.config.ts:441 ; /home/user/KaizenEdu/.claude/skills/design-system/SKILL.md ('The rig… Five kids test it before Gate 2') ; https://techcrunch.com/2026/05/28/sesame-the-conversational-ai-startup-from-oculus-founders-launches-its-ios-app/

### Change 7 — Chrome diet on the session screen

Effort: S (2 days)

Remove: the permanent camera-off row and dashed slot (tutor-tile.tsx:87-93) — say it once in the pre-session copy or the privacy page; two of the three 'AI tutor' pills (keep the one beside the name); the 'Transcript' tile header. Change: the '5:01 / 25:00' countdown becomes a thin progress arc around the presence ring, and only turns into digits in the last two minutes (a clock in a kid's face is pressure, and the WRAP already ends on time). Dock: one row on phones — a 64 px round mic (hold or tap-to-toggle), a keyboard button that expands the text field in place, and an overflow for End / Report / Hands-free / Mute; the 'Hands-free — just talk' static readout goes (it is a status, not a control, and it occupies the primary slot). Reserve 5 rem, not 9.5 rem.

Recommendation: Files: tutor-tile.tsx, dock.tsx, session.css, session-screen.tsx, transcript.tsx. Verify at 390 px and 1280 px, light and dark, per the design skill.

Evidence: /home/user/KaizenEdu/components/tutor/session/tutor-tile.tsx:60-96 ; /home/user/KaizenEdu/components/tutor/session/session-screen.tsx:116-131 ; /home/user/KaizenEdu/components/tutor/session/dock.tsx:88-176 ; /home/user/KaizenEdu/components/tutor/session/session.css:66,375-470 ; /home/user/KaizenEdu/components/tutor/session/transcript.tsx:43-48

### Change 8 — The guest Learn page becomes one 'continue' card

Effort: S (2 days)

Screen for a guest: the greeting is the tutor's, not 'Hi.' — 'Last time: comparing 3/4 and 2/3. Two checks right.' (from the last session's summary, which RecentSessions already renders), one 64 px button 'Continue with [name]', a second 'Something new' that opens the mic straight into intake, and a 'Photo of homework' button (change 9). Planner, homework list, progress and recent sessions move under a 'More' disclosure for guests and stay expanded for parents. First-ever visit never shows this page: the landing button goes straight to a session (change 1).

Recommendation: Files: copy.ts (guestGreeting from summary), learn/page.tsx, workspace.tsx (guest layout branch), start-session.tsx (StartCard compact variant).

Evidence: /home/user/KaizenEdu/lib/tutor/client/copy.ts:55-60 ; /home/user/KaizenEdu/app/(learner)/learn/page.tsx:96-140 ; /home/user/KaizenEdu/components/tutor/learn/workspace.tsx ; /home/user/KaizenEdu/components/tutor/learn/start-session.tsx:75-200 ; /home/user/KaizenEdu/components/tutor/learn/recent-sessions.tsx ; /home/user/KaizenEdu/docs/evidence/step-2/learn-m-light.png

### Change 9 — Photo of the homework at the front door

Effort: M (3 days)

Every voice tutor that parents rate offers 'point the camera at the problem' (Aristotle's App Store reviews single out photo recognition of word problems; COSMIQ and Khanmigo both upload homework). KaizenEdu has the pipeline (POST /api/tutor/problem-extract, the coursework manager with 'Add a photo or PDF') but it is buried under 'Or pick up where you left off' and the homework section. Screen: on the landing and on the guest Learn card, a second button 'Photo of the problem' opens the camera, and the session starts with the tutor reading the problem aloud ('I see: 3/4 + 1/6. Where are you stuck?') — the coursework source path already exists (start-session.tsx onStartCoursework). Sequence: capture → extract (show the extracted text at 20 px for the learner to confirm with one tap) → start.

Recommendation: Files: landing.tsx / guest-start.tsx (button), a new components/tutor/learn/photo-start.tsx wrapping the coursework upload + extract + start, guest route (accept a coursework id at creation, or create then start).

Evidence: /home/user/KaizenEdu/app/(learner)/api/tutor/problem-extract/route.ts ; /home/user/KaizenEdu/components/tutor/learn/coursework.tsx ; /home/user/KaizenEdu/components/tutor/learn/start-session.tsx:213-270 ; /home/user/KaizenEdu/components/tutor/learn/workspace.tsx:38-48 ; https://apps.apple.com/us/app/aristotle-tutor/id6472252066 ; https://www.pr.com/press-release/975467

### Change 10 — A parent trust page with measured numbers, and a live-turn model whose terms allow minors

Effort: S (2 days) + a provider decision

The 'What it will not do' and 'Privacy in plain words' sections are the best copy in the product and the strongest differentiator against Aristotle (no privacy policy per K12SafeList) and COSMIQ (no independent review). Make them a page a parent can find in one tap from the landing footer and from the session ('For grown-ups'), and add three measured facts once they exist: first-audio p50/p90 on a phone, the daily minute cap, and the retention window — each with a docs/CLAIMS.md row. Do not add outcome claims; the only RCT-grade result in this market is Google's Sierra Leone study and it is not ours. Separately and before 'national': the Gemini API terms bar services 'likely to be accessed by individuals under the age of 18'; the fast role runs on google:gemini-3-flash-preview for every band. Either obtain written clearance or route the 4-8, 9-12 and 13-17 bands to another provider with the existing TUTOR_BAND_MODEL_ROUTES variable, and document it in docs/DECISIONS.md. Load the claims-discipline and minors-privacy skills before editing any of this.

Recommendation: Files: a new app/(learner)/for-grown-ups/page.tsx built from the existing landing sections, landing.tsx footer link, docs/CLAIMS.md rows, kaizen.config.ts / Vercel env TUTOR_BAND_MODEL_ROUTES, docs/DECISIONS.md.

Evidence: /home/user/KaizenEdu/components/tutor/marketing/landing.tsx:143-215 ; /home/user/KaizenEdu/docs/CLAIMS.md ; /home/user/KaizenEdu/kaizen.config.ts:239-249,276-320 ; https://k12safelist.com/tool-aristotle ; https://ai.google.dev/gemini-api/terms (egress-blocked; text quoted via https://discuss.google.dev/t/question-regarding-age-restrictions-for-the-gemini-api/188060) ; https://deepmind.google/blog/measuring-the-impact-of-learning-with-ai-in-sierra-leone-and-beyond/ ; https://www.commonsensemedia.org/ai-ratings/ai-risk-assessments
