'use client';

// The tutor directory itself. It renders ONLY when the marketplace switch is on
// (app/tutors/page.js holds that gate), so everything below assumes a business
// that publishes a bench — which Kaizen does not today.
//
// It lives in components/ rather than beside its page because test/claims.test.mjs
// scans components/ plus app/**/page.js: the safety line below ("interviewed and
// approved by our team") is the exact string the background-check ban exists to
// protect, and an island co-located under app/ would carry it outside the guard.
// test/crawlSurface.test.mjs additionally pins that no rate or booking action
// grows back here while the gate is shut.
//
// Data comes from the public /api/tutoring/directory route (no auth), which
// carries its own fail-closed gate on club_enabled and answers with no tutors
// at all while selling is held. So "no tutors" is also the held state, and it
// is the one place on this page that carries an email capture.
//
// One system (spec: docs/superpowers/specs/2026-08-22-one-system-rebuild.md):
// paper top to bottom, sizes and radii from the scale. Three sections, three
// different layout families: a text hero, then the filter row over a card grid,
// then a single hairline row out to the application. The eyebrow budget is
// spent once, in the hero.
//
// A tutor is a person, so the card leads with a face and a name at title size
// rather than with a row of fields. What the card no longer carries is a rate:
// it used to end on the entry price for private 1:1, a product Kaizen cut, and
// a price is an offer even when it is set in 12px grey. The offer a family can
// actually accept lives on /tutoring and /schedule.

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Stars } from '@/components/ui/Stars';
import Reveal, { RevealGroup } from '@/components/dn/Reveal';
import InterestForm from '@/components/InterestForm';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Section from '@/components/ui/Section';
import Eyebrow from '@/components/ui/Eyebrow';
import { IconChevronRight } from '@/components/Icons';

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
}

export default function TutorDirectory() {
  const [tutors, setTutors] = useState(null);
  const [failed, setFailed] = useState(false);
  const [subject, setSubject] = useState('');

  // A FAILED READ IS NOT AN EMPTY BENCH. This used to end `.catch(() =>
  // setTutors([]))`, so a 500, a rate-limit, an offline phone or a 200 carrying
  // an error body all arrived at the same place as a genuinely empty directory
  // — and that place tells a visitor "our first tutors are being onboarded" and
  // asks for their email. An outage would have made a false statement about the
  // business and collected a lead on the strength of it.
  //
  // Same rule the server side of wave 2 had to learn three times: publicSchedule
  // answers `failed`, publicCohorts publishes no count it could not read, and
  // mySeat says "we could not look" rather than "you have no seat".
  const load = useCallback(() => {
    setFailed(false);
    setTutors(null);
    fetch('/api/tutoring/directory')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => {
        // A 200 with no array is not an empty directory either.
        if (!Array.isArray(d?.tutors)) throw new Error('shape');
        setTutors(d.tutors);
      })
      .catch(() => { setFailed(true); setTutors([]); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const subjects = useMemo(() => {
    const set = new Set();
    (tutors || []).forEach((t) => (t.subjects || []).forEach((s) => set.add(s)));
    return [...set].sort((a, b) => a.localeCompare(b)).slice(0, 24);
  }, [tutors]);

  const shown = useMemo(() => {
    if (!subject) return tutors || [];
    return (tutors || []).filter((t) => (t.subjects || []).some((s) => s.toLowerCase() === subject.toLowerCase()));
  }, [tutors, subject]);

  // Selected chip is the ink pill; k-chip carries the resting look. Utilities
  // beat the component layer, so the selected state wins without an override.
  const chip = (on) =>
    `k-chip ${on ? 'border-ink bg-ink text-paper hover:text-paper hover:border-ink' : ''}`;

  // The hero action can only be as real as the bench behind it. FOUR states,
  // same source of truth the grid reads: we have not asked yet, we asked and
  // could not hear, we asked and there is a bench, we asked and there is not.
  // Only the last of those is the held storefront.
  const bench = failed ? 'failed' : tutors === null ? 'loading' : tutors.length > 0 ? 'live' : 'empty';
  // The directory ANSWERED, and the answer was empty: the section heading
  // changes job. `failed` must never reach this, which is why it is not
  // `tutors.length === 0`.
  const noBench = bench === 'empty';

  return (
    <>
      {/* 1 · Hero: four elements, nothing else. The bench itself is the page. */}
      <Section width="wide" lead>
        <RevealGroup className="max-w-prose">
          <Eyebrow>The people who teach</Eyebrow>
          <h1 className="mt-4 font-brand font-semibold text-ink text-d3 sm:text-d2">
            Who teaches at Kaizen.
          </h1>
          <p className="mt-6 text-t3 text-muted max-w-[46ch]">
            Every Kaizen tutor is interviewed and approved by our team.
          </p>
          {/* One solid action per page, and it belongs to the control that
              actually collects something. While the bench is empty that is the
              email field below, so the hero stops competing with it: it becomes
              a quiet link named for where it lands. (The reverse - lifting the
              field up here - would put the form above the sentence that explains
              why the form exists, and would swing the hero height on fetch.) The
              slot holds its height across the fetch so nothing jumps, and while
              the answer is unknown it offers nothing rather than something
              untrue. */}
          <div className="mt-9 min-h-[3.25rem]">
            {bench === 'live' && <Button href="#directory" size="lg">See who teaches</Button>}
            {bench === 'empty' && (
              <Link
                href="#first-pick"
                className="inline-flex items-center gap-1.5 text-t3 font-semibold text-accent underline-offset-4 hover:underline"
              >
                Join the first-pick list
                <IconChevronRight size={16} />
              </Link>
            )}
          </div>
        </RevealGroup>
      </Section>

      {/* 2 · The bench: filter row over the grid. All three empty states live
          here, and the one with no tutors at all is the held storefront, so it
          is the only place a capture appears on this page. */}
      <Section width="wide" space="tight" id="directory" className="scroll-mt-20">
        <Reveal>
          {/* One heading owns the section. When there is no bench the section
              IS the onboarding notice, so the notice is the heading rather than
              a second, competing one below a rule; nobody should read an empty
              band before its reason. */}
          <h2 className="font-brand font-semibold text-ink text-d3 max-w-[22ch]">
            {bench === 'failed'
              ? 'We couldn’t load the tutor list.'
              : noBench ? 'Our first tutors are being onboarded.' : 'The bench.'}
          </h2>

          {subjects.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              <button type="button" onClick={() => setSubject('')} className={chip(!subject)}>
                All subjects
              </button>
              {subjects.map((s) => (
                <button key={s} type="button" onClick={() => setSubject(s)} className={chip(subject === s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {tutors && tutors.length > 0 && (
            <p className="mt-6 font-opmono text-xs text-muted tabular-nums">
              {shown.length} {shown.length === 1 ? 'tutor' : 'tutors'}{subject ? ` in ${subject}` : ''}
            </p>
          )}
        </Reveal>

        {bench === 'failed' ? (
          /* No capture here. The email field below belongs to a real held
             state; offering it after a failed read would be collecting a lead
             on the strength of a sentence we have not established is true. */
          <Reveal className="mt-8">
            <p className="text-body text-muted max-w-prose">
              This is a problem on our side, not an empty bench. Nothing has changed about who
              teaches at Kaizen — we just couldn’t reach the list.
            </p>
            <div className="mt-6">
              <Button onClick={load} variant="secondary">Try again</Button>
            </div>
          </Reveal>
        ) : tutors === null ? (
          <p className="mt-10 text-sm text-muted">Loading tutors…</p>
        ) : shown.length === 0 ? (
          <Reveal className="mt-8">
            {tutors.length === 0 ? (
              /* No rule and no second heading: the h2 above already said this,
                 so what follows it is only the two things a reader can do. */
              <div>
                <p className="text-body text-muted max-w-prose">
                  Know someone great?{' '}
                  <Link href="/tutors/apply" className="font-medium text-accent underline underline-offset-4">
                    Invite them to apply.
                  </Link>
                </p>
                {/* The one capture on the page, and the target the hero link
                    points at while the bench is empty. */}
                <div id="first-pick" className="mt-8 max-w-narrow scroll-mt-24">
                  <InterestForm kind={null} source="/tutors" buttonLabel="Get first pick" inline tone="day" />
                </div>
              </div>
            ) : (
              <div className="border-t border-border pt-10">
                <p className="font-brand font-semibold text-ink text-t2">No tutors for that subject yet.</p>
                <p className="mt-2 text-sm text-muted">Try another subject or clear the filter.</p>
              </div>
            )}
          </Reveal>
        ) : (
          <Reveal delay={0.06} className="mt-10">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((t) => (
                <Card
                  key={t.id}
                  as={Link}
                  href={`/tutors/${t.slug}`}
                  variant="raised"
                  pad="md"
                  className="block transition-colors hover:border-ink/25"
                >
                  <div className="flex items-start gap-4">
                    {t.photo_url
                      ? <img src={t.photo_url} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                      : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/10 font-brand font-semibold text-t2 text-accent">{initials(t.display_name)}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="font-brand font-semibold text-ink text-t2 truncate">{t.display_name}</p>
                      <span className="mt-1 block"><Stars rating={t.rating} count={t.reviewCount} /></span>
                    </div>
                  </div>

                  {t.headline && <p className="mt-5 text-sm font-medium text-ink">{t.headline}</p>}
                  {t.bio && <p className="mt-1.5 text-sm text-muted line-clamp-2">{t.bio}</p>}

                  {(t.subjects || []).length > 0 && (
                    <p className="mt-4 text-xs text-muted">
                      {(t.subjects || []).slice(0, 3).join(' · ')}
                    </p>
                  )}

                  <span className="mt-5 flex items-center gap-1 border-t border-border pt-4 text-xs font-semibold text-accent">
                    View profile
                    <IconChevronRight size={14} />
                  </span>
                </Card>
              ))}
            </div>
          </Reveal>
        )}
      </Section>

      {/* 3 · One line out to the other side of the bench. */}
      <Section width="wide" space="tight">
        <Reveal>
          <div className="flex flex-col gap-5 border-t border-border pt-10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-t2 font-brand font-semibold text-ink">Want to teach with Kaizen?</p>
            <Button href="/tutors/apply" variant="secondary">
              Become a tutor
              <IconChevronRight size={15} />
            </Button>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
