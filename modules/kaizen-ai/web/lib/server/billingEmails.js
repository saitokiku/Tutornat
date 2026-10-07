// Subscription lifecycle emails (audit: the app sent none — a payer got no
// confirmation from Kaizen). Stripe's own dashboard emails still handle payment
// receipts, renewal notices, and dunning; these are the relationship touches
// Stripe can't send: a warm welcome when a plan starts and a graceful goodbye
// when it ends. Best-effort — callers .catch() them.
//
// THE SEAT GETS ITS OWN LETTER (docs/superpowers/specs/2026-09-02-wave2-audit.md).
// Every plan used to receive the same three lines — "Everything the plan
// includes is available now — pick up where you left off" over one button to
// /dashboard. For a family that has just committed to a standing seat that is
// wrong twice: nothing about a seat is available the moment the card clears,
// because a person places each student by hand, and the one message they get
// pointed at the AI, which the strategy says is not the product. Between paying
// and being placed a seat holder had no day, no room, no tutor and no
// acknowledgement that any of those were coming. So the seat case says what
// actually happens next, and it promises only what a person can do: get in
// touch and arrange the evenings.

import { sendEmail, esc } from '@/lib/server/email';
import { SEAT_PLAN } from '@/lib/server/clubPricing';

const PLAN_NAME = {
  seat: 'Standing Seat',
  ai_solo: 'Max AI', ai_hall: 'AI + Hall',
  club: 'Club', plus: 'Plus', max: 'Max',       // retired from sale 2026-09-02
  student: 'AI Student', family: 'Study Circle', // legacy tiers
};

// The shape of a seat, from the one price file, so a change to the product
// cannot leave this letter describing the old one.
const SEAT = SEAT_PLAN.seat;

function appUrl() { return (process.env.APP_URL || '').replace(/\/$/, ''); }

// A link is only worth sending when we know where the product lives. With
// APP_URL unset (rule 6) the letter keeps every sentence and drops the button,
// rather than mailing a href that resolves to nothing.
function link(path, label) {
  const base = appUrl();
  if (!base) return '';
  return `<p style="margin-top:16px"><a href="${base}${path}">${label} →</a></p>`;
}

export async function sendSubscriptionStarted(to, plan, { trialing = false } = {}) {
  if (!to) return;
  const name = PLAN_NAME[plan] || 'your plan';
  // EVERY BRANCH TAKES `trialing`. This dispatch used to sit ABOVE the trial
  // line, so the one plan whose letter was rewritten was also the one plan
  // that silently dropped the disclosure: a trialing seat would have been told
  // "your seat renews monthly at the price shown when you signed up" with no
  // mention that nothing is charged yet. TRIAL_PLANS is empty today, but
  // app/api/billing/checkout keeps the machinery ("put a plan key back in
  // TRIAL_PLANS to re-enable") and a trial can also be configured on the
  // Stripe Price outside this file — the webhook reads the status off the
  // subscription, not off our list. Latent wrong copy is still wrong copy.
  if (plan === 'seat') return sendSeatWelcome(to, name, { trialing });

  const trialLine = trialing
    ? '<p>Your first 8 weeks are on us — you won’t be charged until the trial ends, and you can cancel anytime before then and pay nothing.</p>'
    : '';
  await sendEmail({
    to,
    subject: `You're on Kaizen ${name} 🌸`,
    kind: 'essential',
    html: `
      <p>Your <strong>Kaizen ${esc(name)}</strong> plan is active.</p>
      ${trialLine}
      <p>Everything the plan includes is available now — pick up where you left off.</p>
      ${link('/dashboard', 'Open Kaizen')}
    `,
  });
}

// The seat: a reserved place in a room, sold before the room is chosen. The
// only promise here that a person has to keep is the second paragraph, and it
// is deliberately the plainest sentence in the letter — no date, no room and no
// tutor, because none of the three is decided when this sends.
//
// THE BUTTON IS LABELLED FOR WHAT THE PAGE SAYS AT THIS MOMENT. It used to
// read "See your seat", and at the instant this letter sends there is no seat
// to see: the payer has just cleared checkout with no linked teen, so /family
// renders its "Add your first teen" empty state, and even once a teen exists
// SeatBlock renders "No standing seat yet" until the Director places them —
// which this letter has just finished explaining has not happened. A button
// that promises the one thing its destination will explicitly deny is the same
// defect as the /dashboard button it replaced. So it points at the useful
// thing the family CAN do unaided, and the sentence above it survives APP_URL
// being unset, when link() drops the button and keeps the prose (rule 6).
async function sendSeatWelcome(to, name, { trialing = false } = {}) {
  // The billing paragraph is the one line that changes with the subscription's
  // status, so it is built from it rather than assumed.
  const billing = trialing
    ? `You won’t be charged while your trial runs; when it ends your seat renews monthly at the
       price shown when you signed up, until you cancel from your billing page. You can cancel
       before it ends and pay nothing. Sessions count by calendar month and don’t roll over.`
    : `Your seat renews monthly at the price shown when you signed up, until you cancel from your
       billing page. Sessions count by calendar month and don’t roll over.`;
  await sendEmail({
    to,
    subject: `Your Kaizen ${name} is held 🌸`,
    kind: 'essential',
    html: `
      <p>Thank you — your <strong>Kaizen ${esc(name)}</strong> is held.</p>
      <p>A seat is ${SEAT.sessionsPerWeek} sessions a week, ${SEAT.minutes} minutes each, with up to
         ${SEAT.ratio} students to one tutor, in person.</p>
      <p><strong>What happens next.</strong> Our Program Director will be in touch to arrange the
         evenings that fit your week, tell you where the room is, and introduce the tutor who will
         lead it. Nothing goes on your calendar until you have agreed those evenings — we place
         every student by hand, which is the point of a reserved seat.</p>
      <p>While you wait, add your student on your family page. They get their own login, and the
         evenings, the tutor and the record all attach to that profile once the placement is
         made.</p>
      <p>The AI study companion is open to them between sessions in the meantime. It works from
         the same record the tutor will read, and it never confirms what your student knows: that
         takes work done without help, checked again days later.</p>
      <p style="font-size:12px;color:#756E67">${billing}</p>
      ${link('/family', 'Open your family page')}
    `,
  });
}

export async function sendSubscriptionCancelled(to) {
  if (!to) return;
  await sendEmail({
    to,
    subject: 'Your Kaizen plan has ended',
    kind: 'essential',
    html: `
      <p>Your Kaizen subscription has ended and your account is back on the free plan.</p>
      <p>Your data is safe and still here. You can resubscribe anytime from your billing page.</p>
      ${link('/billing', 'Manage billing')}
    `,
  });
}
