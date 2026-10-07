<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0033-kaizen-is-the-active-product.md -->

---
id: ADR-0033
title: Kaizen becomes the active product program; Explorer One is staged
status: accepted
decided_by: manny
date: 2026-09-11
project: kaizenai-saas
tags: [decision, kaizen, portfolio, manny-said]
sources: ["Act console message 2026-09-11 18:47:30 CDT, intake 2026-09-11T23-47-30-337Z-19298e88", "iMessage 2026-09-11 18:49 CDT"]
---

# Kaizen is the product we build next, on Manny's word

Manny, Act console, 18:47 CDT: "A lot of these are done. Clean up the board. Get ready for explorer and kaizen on the board. For kaizen I need you to efficiently index both the repos and intents and designs attempted, do final market research and legal and etc everything a startup needs and then let's create a final product for it. I wanna be the private education guy going forward in UsA and we will do it with an intelligent new genius mechanics not old playbooks that force us to compete. We will make winning sauce our own way efficiently. I'm your resource if you need to experiment with a human and I am also a experienced teacher who understands learning at the core that's why I wanna build this"

Decision: Kaizen (both repos: Kaizen-AI and KaizenEdu/Natural Tutor) leaves Paused and enters Now as one program. It pushes nothing out: the Now lane held "Make memory saves reliable", which closed at 15:32 today. Explorer One moves to the top of Next, staged with its SPEC v0.1, and starts on Manny's word or once Kaizen's SPEC is set. This supersedes the "other product work stays parked until PM acceptance" clause of ADR-0025 for Kaizen only; Manny closed the acceptance cards himself the same minute (ADR-0031, ADR-0032).

Sequence the PM runs: (1) index both repos, intents and designs attempted (Opus worker, read-only, secret values never read); (2) grill Manny one question at a time so the research aims at what he means; (3) market, legal and company-formation research against primary sources; (4) SPEC v0.1 and DIRECTION written with him; (5) first build dispatch. Manny offered himself as the human subject for experiments and as a teacher who understands learning; that is a resource the SPEC should use.

Related: [202609112347-manny-kaizen-private-education-new-mechanics](../history/notes/202609112347-manny-kaizen-private-education-new-mechanics.md), kaizenai-saas *(PM vault: `40-projects/kaizenai-saas/kaizenai-saas`)*, [kaizenedu](../research/inherited-kaizenedu.md), PORTFOLIO *(PM vault: `PORTFOLIO`)*.
