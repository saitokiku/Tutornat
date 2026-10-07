# Go-live report — what actually stands between here and a paying customer

Written 2026-07-26, after building the group marketplace. Grounded in the code
and the database, not in the roadmap.

**Short version: you cannot go live this week, and the reason is not code.**
The software is in good shape. Four of the five blockers are accounts, money and
a lawyer. One of them is a sentence on your website that isn't true.

---

## 1. The five things that block a real customer

### 🔴 B1 — You are telling parents something that isn't true

Your landing page, your pricing page and the guardian-consent email all say
Kaizen tutors are **background-checked**. In the database, `vetting_status` is a
text column an admin sets by clicking a button. There is no Checkr, no Sterling,
no vendor of any kind. `docs/ROADMAP.md` says so itself.

This is the one item on this list that is not a gap — it is an **active false
statement**, made to parents, about strangers who will be alone on video with
their child. Everything else here can wait a quarter. This can't.

**Two honest options, today:**
- Remove the claim from every surface until a vendor is integrated, or
- Integrate Checkr and let the callback — not a human click — write that column.

Until one of those happens, the group product makes it worse rather than better:
a group room puts a minor with an adult **and three other minors**.

### 🔴 B2 — You cannot take money

There is no Stripe key in the Vercel environment. Every payment path returns
`501`, and both booking flows deliberately **fail closed** — a seat that can't be
charged is never booked, so you don't accrue a payout liability against nothing
collected. That's correct behaviour, and it also means **the marketplace has
never taken a cent.**

Needs: Stripe account, business verification, two recurring Prices, a webhook
endpoint, five env vars. Half a day, mostly waiting on verification.

### 🔴 B3 — The site does not resolve

`kaizenedu.net` is on `clientHold` at the registrar. Created July 9, suspended
July 24 — the 15-day mark, which is the signature of an unverified ICANN
registrant email. Vercel is serving a correct deployment that nothing can reach.

One click, if you find the Name.com verification email. Otherwise a support
ticket.

### 🔴 B4 — The database is seven migrations behind

`0011`–`0017` have never run. Consequences, in order of severity:
- The **RLS self-promotion hole is still open**: any signed-in user can run
  `update profiles set role='admin'` from the browser console.
- Uploads fail ("Bucket not found").
- The entire engine and the entire group marketplace are inert.

Ten minutes in the Supabase SQL editor. All 19 files verified against
PostgreSQL's own parser and idempotent.

### 🔴 B5 — Paying tutors is money transmission with a spreadsheet

`tutor_earnings` accrues; you pay by hand. You collect student money into your
own Stripe balance and later send it on. That is a regulated activity in most
US states, and it also means no W-9s, no 1099-NEC at $600/yr, and no audit trail
a tutor can dispute against.

**Stripe Connect Express with destination charges** fixes all of it at once, and
the KYC friction is a *feature* given B1.

---

## 2. What's genuinely built and working

| | Status |
|---|---|
| Evidence engine (two-tier mastery, unassisted-only confirmation) | ✅ 187 tests |
| Placement, hint ladder, independent blocks, isomorph retries | ✅ |
| Server-side checks — no answer key ever reaches a browser | ✅ |
| Calibration / aligned-test-mirage detector | ✅ |
| Inference cost governor + prompt caching + real token accounting | ✅ |
| 1:1 marketplace: booking, payment, refunds, video, reviews | ✅ code-complete |
| **Group drop-in: rooms, seats, race-free claiming, min-fill, revenue share** | ✅ new |
| Harmony bus: AI→tutor brief, tutor→AI observations, post-session checks | ✅ |
| Group roster brief — the AI finding the room's shared weak spot | ✅ new |
| Safety: guardian consent, vetting gate, crisis prompt, report queue | ⚠️ see §4 |

---

## 3. The group product changes the business, and it's worth being precise

Modelled before it was built:

| | Student pays | Tutor earns | Stripe | **Platform net** |
|---|---|---|---|---|
| 1:1 @ $40 | $40.00 | $35.60 | $1.46 | **$2.94** (7.4%) |
| Group 4 × $15 | $15.00 | $45.00 | $2.94 | **$12.06** (20.1%) |

**4.1× the margin per tutor-hour. The student pays 62% less. The tutor earns 26%
more.** To fund one $6k salary: 2,041 private sessions a month, or 498 group
sessions.

Two things this forced, which are now in the schema:

- **Revenue share, not a flat fee.** A fixed $45 payment loses money at every
  fill below capacity — at one seat you're down $30.73.
- **A minimum fill of 2, or the room cancels and refunds.** At 75% share, a
  one-seat hour pays the tutor $11.25. They would rationally never host again.

**The number that decides whether this works is fill rate**, and nothing else
comes close. At full capacity the tutor beats a 1:1 hour; at three seats they
don't. Track it from session one.

---

## 4. Legally serviceable? Not yet — and these are not code

1. **Background checks** (B1). Also: FCRA authorisation and adverse-action
   letters if you run them yourself.
2. **Insurance**, including **abuse & molestation** cover. Non-negotiable before
   a single paid session with a minor. Talk to a broker this week.
3. **Counsel review** of Terms, Privacy and Safety, plus your governing state.
   The pages exist and have never been read by a lawyer.
4. **Session recording policy.** Rooms are unrecorded and in-room chat is
   **enabled and unlogged** — an invisible channel between an adult and a minor.
   Either log it or turn it off. Recording needs two-party consent in some
   states, so this needs a written policy, not a toggle.
5. **A safety-report SLA.** `safety_events` queues reports and emails you.
   Decide who reads it, how fast, and write it down.
6. **W-9 / 1099-NEC** for tutors over $600/yr (B5).
7. **COPPA posture.** Under-13 is blocked at signup. Age is self-declared, so
   the gate is a checkbox — normal for the industry, but know that it is.

**No automated content moderation exists on chat.** `docs/SAFETY.md` says so.
The AI has crisis-response copy in its prompt, but nothing classifies input,
nothing logs it, and nobody is paged. For a product whose users are mostly
minors, that is the largest remaining safety gap after B1.

---

## 5. Does it fill the gaps a public school leaves?

Honestly assessed against your goal.

**Yes, structurally:**
- **Placement by demonstrated level, never by grade.** A student three grades
  behind is the default path, not an exception. This is the single biggest thing
  school cannot do and you now do by default.
- **Mastery that means something.** Confirmed status requires unassisted,
  verified, delayed, repeated performance. Nothing else in this market reports a
  number that strict.
- **Spaced retrieval**, scheduled at the edge of forgetting.
- **Group drop-in at $15** is the piece a busy parent can actually say yes to
  without arranging anything.

**Not yet:**
- **No parent surface.** You have `/api/family/summary` and no dashboard. For
  "parents are busy", the product currently asks the *student* to report
  progress. A monthly plain-language email showing confirmed mastery is probably
  the highest-leverage unbuilt feature you have.
- **Adherence is untested.** The research is unambiguous that showing up, not
  instruction, is the bottleneck. Your answer is the booked appointment plus
  parent visibility — and the parent half doesn't exist yet.
- **No recurring group schedule.** Drop-in works best as "Tuesdays at 5, always
  there". Today every room is a one-off a tutor must create by hand.

---

## 6. Retention and engagement, without the dark patterns

You kept the full anti-engagement list, so the levers available are the honest
ones:

- **The appointment.** A booked session with a person waiting is real
  accountability, and it's the mechanism the research credits. It is also why
  the marketplace is strategically load-bearing rather than a side business.
- **Confirmed mastery as the progress metric** — the streak is demoted to a
  neutral, pausable history.
- **Checks due**, the one notification with a learning mechanism behind it.
- **The parent email** (unbuilt) — the strongest retention lever you have that
  doesn't manipulate a child.

**One measurement is worth more than any feature right now:** do students who
book a session churn later than those who don't? You have `session_effect` to
answer it, and ~40 paired students is enough. If yes, price sessions as customer
acquisition — possibly at a loss. If no, the marketplace is a low-margin services
business bolted to a software business, and you'd want to know that before
recruiting tutors.

---

## 7. The order I'd actually do this in

**This week — unblock**
1. Fix the domain (B3). One click.
2. Run migrations 0011–0017 + both seeds (B4). Ten minutes. Closes the RLS hole.
3. Set `APP_URL` and `CRON_SECRET`. Emails are currently sending broken links and
   the hourly cron has never run — which now also means group rooms never resolve
   their min-fill.
4. **Remove the background-check claim** (B1), or start the Checkr integration.

**Next two weeks — make money possible**
5. Stripe account + Prices + webhook (B2).
6. Stripe Connect Express (B5).
7. Insurance conversation.
8. Counsel on Terms/Privacy/Safety.

**Before real students**
9. Group session UI — the routes and engine are done, the browse/book screen is not.
10. Parent summary email.
11. Inbound content moderation.
12. Uptime monitoring. Nobody noticed the domain was down for 16 days.

**Then, and only then**
13. Recruit 3–5 tutors, seed a weekly drop-in schedule, and measure fill rate and
    the retention question in §6.

---

## 8. Two things I want to be straight about

**The adversarial review has failed twice.** Both runs crashed with all four
agents stalling. I have been reviewing my own work, which is not the same thing.
The claim I'd most want independent eyes on is whether the mastery law is
genuinely unbypassable.

**The group session UI does not exist.** The schema, economics, booking route,
webhook fulfilment, cron resolution, roster brief and observation path are all
built and tested. A student cannot yet *see* a drop-in room in the product. That
is the next build, and it is maybe a day.
