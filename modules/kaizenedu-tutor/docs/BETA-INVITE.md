# The first twenty invites

The email Manny sends by hand to the first twenty beta families (release checklist, Gate 1). Plain text, from Manny's own address, one family at a time, so a reply is a conversation. Every sentence below is a claim the code enforces (`docs/CLAIMS.md`); change a sentence only with its row. No exclamation points, no urgency, no number that is not in `kaizen.config.ts` or `docs/metrics/`.

Fill in the two brackets. `PLAN` figures: $29 a month, 3 learner profiles, 8 pooled hours, 30 free minutes for ages 13 and up.

---

Subject: Would [learner's name] try an AI maths tutor for 30 minutes?

Hi [parent's name],

I'm building a voice tutor for fractions: a learner talks to it, it draws on a whiteboard while it explains, and it never gives the final answer until they have tried a step. It is an AI, it says so on screen, and there is no person on the other end.

I'd like [learner's name] to try it and tell me where it falls short.

What it is: https://www.kaizenedu.net/welcome

- The first 30 minutes are free and need no card. Ages 13 and up sign up for themselves; a parent finishes the account and owns it. A 9 to 12 profile can be created but stays locked until the consent flow has been reviewed by counsel, so for now it is for teens and adults.
- After the trial it is $29 a month for up to 3 learners and 8 hours of tutoring, cancelled from the billing page any time. You do not need to pay to take part in this.
- Voice is transcribed to respond and is never stored as audio. Nothing from a camera leaves the browser, and the camera is off for teens and adults. You can read every transcript and delete everything from the dashboard.
- Every question in the practice bank was written for this product and reviewed by a person; during a lesson the tutor also writes quick checks of its own.

What I need from you: after one or two sessions, five minutes on what was confusing, what was slow, and what you would not pay for. Reply to this email, or use the form at https://www.kaizenedu.net/support, which a person reads.

If a session ever says something that worries you, press "Report" in the session; it tells me directly.

Thank you,
Manny

---

Before sending: `RESEND_API_KEY`, `EMAIL_FROM`, `SAFETY_ALERT_EMAILS`, `SUPPORT_EMAIL` and `CRON_SECRET` set (operator item 2), `/api/tutor/health` all `configured: true`, one spoken session completed on production by a staff account, and the Stripe walk done (item 8) if the invite mentions paying.
