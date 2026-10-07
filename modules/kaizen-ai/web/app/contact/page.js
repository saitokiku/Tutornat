'use client';
// /contact : the support desk. One form, four states (idle, sending, sent,
// error), and a failure path that still gets the visitor to a human.
//
// One theme, locked (spec: docs/superpowers/specs/2026-08-22-one-system-rebuild.md):
// paper top to bottom, sizes and radii from the scale, inputs from ui/Field and
// every state from ui/Notice.
//
// Measure. This is a document page, and a visitor almost always arrives from
// one: /privacy routes deletion requests through this form and /safety points
// reports at the same desk. It used to sit on the wide grid while all five of
// its siblings read on LegalShell's prose column, so the hop from /privacy to
// /contact threw the text 207px to the left and made it 400px wider, and the
// half of the grid the form did not use went out as one empty page-height
// column. It is on `width="prose"` now: the same measure and the same origin as
// the documents that send people here, so the form reads as the last section of
// the page the visitor was already in.
//
// The send button, and the product's one submit rule. It was `block`, so a
// four-character label wore a 537px pill wider than the h1 above it; it is
// sized to its label now. The round after that also made it wait for the
// message field, which left the product holding two opposite affordances for
// the same situation: every capture form (InterestForm on /, /pricing,
// /schedule, /tutors, /ai) shows a live solid submit beside an equally empty
// required field, while this one page withheld its action. One rule now, and it
// is the majority one: **a submit is always live and validates on press.**
// Live, because a control the visitor can press and be answered by is more
// honest than one that silently withholds itself, and because the same button
// then means the same thing on every page. On press, because the platform
// already does it: `required minLength` on Message refuses the submit and names
// the reason in the field, with no JS and no new state. Disabled is left to
// mean one thing only, in flight (`sending`), where ui/Button renders it as the
// quiet panel2/muted pair at 4.9:1 rather than a 40% fade.
//
// The gate itself is untouched: the handler still refuses anything under five
// characters, and so does the route.
//
// The submit path is untouched: authedFetch to /api/support, the same body keys,
// the same five-character gate on the client and on the route.
//
// The failure branch is the load-bearing part. /privacy routes CCPA deletion
// requests through this form and /safety points reports at the same desk, so a
// request the server could not store must not simply disappear: the error offers
// a mailto carrying the chosen topic as the subject and the visitor's own typed
// message as the body (audit H11).
import { useId, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/dn/Shell';
import Reveal from '@/components/dn/Reveal';
import Section from '@/components/ui/Section';
import Field from '@/components/ui/Field';
import Notice from '@/components/ui/Notice';
import Button from '@/components/ui/Button';
import { IconChevronRight } from '@/components/Icons';
import { authedFetch } from '@/lib/supabaseClient';

// The desk this form writes to. Kept here (not only in the select) because the
// failure path reuses the labels for a mailto subject line.
const SUPPORT_EMAIL = 'hello@kaizenedu.net';
const TOPICS = [
  ['general', 'General question'],
  ['bug', 'Something broke'],
  ['billing', 'Billing'],
  ['deletion', 'Delete my data'],
  ['schools', 'School / district plans'],
  ['tutoring', 'Human tutoring'],
];

// The two pages that send people here on purpose. Stated on the page so a
// visitor arriving from either one can see that they landed in the right place.
const ROUTES = [
  {
    title: 'Deletion requests',
    body: 'Choose “Delete my data” in the topic list and send the form. It reaches the same desk.',
    href: '/privacy',
    cta: 'Read the privacy notice',
  },
  {
    title: 'Safety reports',
    body: 'Anything that felt wrong about a session or a person comes through this form too.',
    href: '/safety',
    cta: 'Read the safety page',
  },
];

export default function Contact() {
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('general');
  const [message, setMessage] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');
  // Field mints its own id for the controls it renders, but the topic control is
  // passed in as a child (a select needs its options), so the label association
  // is made explicitly here rather than left to chance.
  const topicId = useId();
  // The form's one requirement, said out loud beside the action instead of
  // being enforced by withholding it, and pointed at from the button.
  const gateId = useId();

  // Only ever shown after a failed submit: if the request didn't land, the
  // message must not vanish with it. /privacy sends CCPA deletion requests
  // through this form and /safety points reports at it, so the fallback has to
  // carry the visitor's own words to a person, not just apologise (audit H11).
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    (TOPICS.find(([v]) => v === topic)?.[1] || 'Support') + ' · Kaizen'
  )}&body=${encodeURIComponent(message)}`;

  async function submit(e) {
    e.preventDefault();
    if (message.trim().length < 5) return;
    setState('sending');
    setError('');
    try {
      const res = await authedFetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, topic, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Something went wrong.');
        setState('error');
        return;
      }
      setState('sent');
    } catch {
      setError('We couldn’t reach the server.');
      setState('error');
    }
  }

  return (
    <Shell active="" tone="day">
      {/* 1 · Title, one line of scope, then the form: the same top-down reading
          order the policy pages use, on the same column they use. */}
      <Section width="prose" lead>
        <Reveal>
          <h1 className="font-brand font-semibold text-ink text-d3 sm:text-d2">
            Contact us
          </h1>
          <p className="mt-5 text-t3 text-muted max-w-[46ch]">
            Support, deletion requests, school plans, anything. We read everything.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-10 border-t border-border pt-10">
          {state === 'sent' ? (
            <Notice kind="ok">
              <p className="text-t3 font-semibold text-ink">Got it. We’ll get back to you.</p>
            </Notice>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              {/* Two short answers share a row so neither one stretches to the
                  full reading measure; the message keeps the column to itself. */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field
                  label="Your email"
                  hint="Optional, though we can’t write back without it."
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Field>
                  <label htmlFor={topicId} className="text-sm font-medium text-ink">
                    Topic
                  </label>
                  <div className="relative mt-auto">
                    <select
                      id={topicId}
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="k-input appearance-none pr-11"
                    >
                      {TOPICS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    {/* The native caret is suppressed so the control matches
                        the other two inputs, so the icon set draws one back
                        rather than leaving a select with no affordance. */}
                    <IconChevronRight
                      size={16}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-muted"
                    />
                  </div>
                </Field>
              </div>

              {/* required + minLength are the validation, and they run on
                  press: the browser refuses the submit and says which field is
                  short, in the field, with no JS. Same five characters the
                  handler and the route already require. */}
              <Field
                label="Message"
                as="textarea"
                rows={6}
                required
                minLength={5}
                placeholder="What’s up?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                controlClassName="resize-none"
              />

              {state === 'error' && (
                <Notice kind="bad">
                  {/* The failure headline carries the whole message: your words
                      did not reach us. Terracotta on its own tint measures ~3.8:1
                      at this size, under AA, on the one line nobody can afford to
                      skim past, so the sentence is set in ink and the panel does
                      the signalling (bad border + bad wash). Deepening the tint
                      instead would drag the muted paragraph below 4.5:1 too. */}
                  <p className="text-t3 font-semibold text-ink">{error}</p>
                  <p className="mt-2 text-sm text-muted">
                    Your message wasn’t saved.{' '}
                    <a href={mailto} className="font-medium text-ink underline underline-offset-2">
                      Email {SUPPORT_EMAIL}
                    </a>{' '}
                    instead. What you typed above comes with you, and deletion
                    requests and safety reports reach the same desk.
                  </p>
                </Notice>
              )}

              {/* The action, sized to its label, live, with the one thing it
                  asks for stated beside it rather than enforced by absence.
                  Disabled here means in flight and nothing else. */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
                <Button
                  type="submit"
                  size="lg"
                  aria-describedby={gateId}
                  disabled={state === 'sending'}
                >
                  {state === 'sending' ? 'Sending' : 'Send'}
                </Button>
                <p id={gateId} className="text-sm text-muted">
                  Message needs a few words. Everything else is optional.
                </p>
              </div>
            </form>
          )}
        </Reveal>
      </Section>

      {/* 2 · Where the two pages that point here end up. A hairline pair, so it
          reads as a footnote to the form rather than a second offer. */}
      <Section width="prose" space="tight">
        <Reveal>
          <div className="grid grid-cols-1 divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
            {ROUTES.map((r) => (
              <div key={r.title} className="py-6 sm:px-8 sm:first:pl-0 sm:last:pr-0">
                <h2 className="font-brand font-semibold text-ink text-t3">{r.title}</h2>
                <p className="mt-2 text-sm text-muted max-w-[42ch]">{r.body}</p>
                <Link
                  href={r.href}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline"
                >
                  {r.cta}
                  <IconChevronRight size={15} />
                </Link>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>
    </Shell>
  );
}
