# Roadmap

Each phase swaps what's behind the screens, not the screens. Status lives in [STATUS.md](STATUS.md).

## Done — foundation and learning fabric (2026-10-07)

- Frontend foundation: landing, family account + learner profiles, grown-up gate, lesson stage with
  K–9 catalogue, Growth, EN/ES. Spec: [specs/2026-10-07-foundation-design.md](specs/2026-10-07-foundation-design.md).
- Learning fabric: practice engine (134 skills), learning engine (mastery law), Today plan, calendar and
  school import, tutor with tools and voice, AI lesson writer with quality gates, resources, family
  dashboard, homeschool records. Spec: [specs/2026-10-07-learning-fabric-design.md](specs/2026-10-07-learning-fabric-design.md).

## Next — make it real for families (launch blockers)

The plan for 1.0: [plans/2026-10-07-kaizenedu-1.0-plan.md](plans/2026-10-07-kaizenedu-1.0-plan.md) (gap review in [plans/2026-10-07-real-product-plan.md](plans/2026-10-07-real-product-plan.md)).
The order of work is STATUS Queue 4. Codex's review of 2026-10-07 is an input to it, not a new order:
its [system audit](reviews/2026-10-07-system-audit.md) added repair steps (course-route safety screen,
durable help and check evidence, account authority, the M5 accounts and consent step); its
[workspace](specs/2026-10-07-one-learning-workspace.md) and [models, voice and Jev](specs/2026-10-07-models-voice-and-jev.md)
specs and [plan](plans/2026-10-07-integrated-learning-release.md) are proposals mapped into the queue.

1. **Accounts and a database.** Replace the bodies of `apps/web/src/lib/*.ts` with server calls;
   Postgres. Port trellis's invariants (append-only answers, assistance latch, 48 h clock) from
   `modules/trellis/db`, not its role model. Sync across a parent's phone and a child's tablet.
2. **Children's privacy (COPPA) before any real child.** Verifiable parental consent before
   collection, consent receipts, retention policy, export/delete, provider terms for minors in
   writing (Anthropic: disclosure, age assurance, moderation). Drafts: `modules/kaizenedu-tutor/compliance`,
   `modules/trellis/docs/research/03-minors-launch-gates.md`. Needs counsel.
3. **Connect the AI** for the preview and production: an Anthropic API key (preferred) or AI Gateway;
   spend caps per learner; an eval set run on every prompt change (start from `modules/kaizen-ai/evals/tutor`).
4. **Content review.** A teacher reviews every *draft* English and science bank (`content: "draft"`);
   a native speaker reviews all Spanish. Fix what they flag; mark reviewed.
5. **Move kaizenedu.net** to this repo (Vercel project `kaizenedu`, Root Directory `apps/web`) after 1–2.

## Then — better than the earlier attempts

- **Voice that feels natural:** streaming speech recognition and speech output (research in
  `modules/kaizenedu-tutor/docs/research/2026-09-30-natural-turn-taking.md`), barge-in, children's ASR.
  For minors the path stays recognizer → safety screen → name scrub → model → speech unless the owner
  decides otherwise.
- **Model and voice evaluation** on synthetic data, benchmark-led (owner: "use benchmarks to pick
  models"), ending in a recommendation to the owner. Anthropic only in production until the owner
  approves another vendor in writing.
- **OpenMAIC stage parity, then beyond:** whiteboard actions, narrated slides, sandboxed generated interactives
  (`modules/openmaic-classroom`), behind the same quality gates.
- **School systems:** Google Classroom / Canvas APIs (read-only) beyond calendar feeds; teacher
  share links.
- **More practice:** word problems from interests, handwriting input, more science computed skills,
  reading passages with audio.
- **Weekly email to parents** from the computed facts; no email for an empty week.

## Later

Adults (profiles already support it; Codex proposed an adult acceptance story now, which awaits the
owner, STATUS decision 16), a future tutor face and optional gaze help (camera off until separately
evaluated and permissioned), website ornamentation, more subjects, curated open curriculum with per-item rights checks
(`docs/history/discovery/delivery/fullstack/research/oer-20261003/`), human tutors as an add-on.
