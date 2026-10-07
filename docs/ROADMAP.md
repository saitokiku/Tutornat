# Roadmap

Each phase swaps what's behind the screens, not the screens. Status lives in [STATUS.md](STATUS.md).

## Done — foundation and learning fabric (2026-10-07)

- Frontend foundation: landing, family account + learner profiles, grown-up gate, lesson stage with
  K–9 catalogue, Growth, EN/ES. Spec: [specs/2026-10-07-foundation-design.md](specs/2026-10-07-foundation-design.md).
- Learning fabric: practice engine (134 skills), learning engine (mastery law), Today plan, calendar and
  school import, tutor with tools and voice, AI lesson writer with quality gates, resources, family
  dashboard, homeschool records. Spec: [specs/2026-10-07-learning-fabric-design.md](specs/2026-10-07-learning-fabric-design.md).

## Next — make it real for families (launch blockers)

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
- **OpenMAIC stage parity:** whiteboard actions, narrated slides, sandboxed generated interactives
  (`modules/openmaic-classroom`), behind the same quality gates.
- **School systems:** Google Classroom / Canvas APIs (read-only) beyond calendar feeds; teacher
  share links.
- **More practice:** word problems from interests, handwriting input, more science computed skills,
  reading passages with audio.
- **Weekly email to parents** from the computed facts; no email for an empty week.

## Later

Adults (profiles already support it), more subjects, curated open curriculum with per-item rights checks
(`docs/history/discovery/delivery/fullstack/research/oer-20261003/`), human tutors as an add-on.
