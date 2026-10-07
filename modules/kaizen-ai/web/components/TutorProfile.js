'use client';

// One tutor's public profile. It renders ONLY when the marketplace switch is on
// (app/tutors/[slug]/page.js holds that gate), so nothing below has to reason
// about it. It lives in components/ rather than beside that page so the copy
// guard reads it: test/claims.test.mjs scans components/ plus app/**/page.js,
// and the "interviewed and approved by our team" line is the string the
// background-check ban exists to protect. test/crawlSurface.test.mjs pins that
// the deleted rates, the "Book a session" action and the free-first-session
// trial do not grow back here.
//
// What this page is for is saying who a person is: photo, headline, bio,
// subjects, and the reviews students left after real sessions. What it is no
// longer for is selling an hour of them. It used to print two private 1:1
// rates, lead on "Book a session", and tell a signed-in visitor "Your first
// session is free" — three offers for products Kaizen cut, on the page most
// likely to be the first thing a parent ever reads about a teacher. A profile
// that cannot be booked is not a broken profile; it is a person, described.
//
// One system (spec: docs/superpowers/specs/2026-08-22-one-system-rebuild.md):
// paper top to bottom, sizes and radii from the scale. The identity block is
// set open on the page rather than boxed in a card — a person is not a database
// row. Three sections, three layout families: identity, prose, a hairline list.
// No eyebrow: the tutor's name is the headline.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Stars } from '@/components/ui/Stars';
import Reveal from '@/components/dn/Reveal';
import Button from '@/components/ui/Button';
import Section from '@/components/ui/Section';
import { IconArrowLeft, IconCheck } from '@/components/Icons';

function ago(iso) { return new Date(iso).toLocaleDateString([], { month: 'short', year: 'numeric' }); }
function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
}

export default function TutorProfile({ slug }) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/tutoring/directory?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => setState({ loading: false, ...d }))
      .catch(() => setState({ loading: false, error: 'Could not load this profile.' }));
  }, [slug]);

  const { loading, tutor, reviews = [], error } = state;

  if (loading) {
    return (
      <Section width="prose" lead>
        <p className="text-sm text-muted">Loading…</p>
      </Section>
    );
  }

  // The directory route answers with no tutor both when the slug is unknown and
  // while its own club gate is closed, so this state has to cover both without
  // guessing which one it is.
  if (error || !tutor) {
    return (
      <Section width="prose" lead>
        <h1 className="font-brand font-semibold text-ink text-d3">Tutor not found.</h1>
        <p className="mt-3 text-body text-muted">This profile may have been taken down.</p>
        <div className="mt-8">
          <Button href="/tutors" variant="secondary">
            <IconArrowLeft size={15} />
            All tutors
          </Button>
        </div>
      </Section>
    );
  }

  return (
    <>
      {/* 1 · Who this is. */}
      <Section width="prose" lead>
        <Reveal>
          <Link
            href="/tutors"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <IconArrowLeft size={15} />
            All tutors
          </Link>

          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            {tutor.photo_url
              ? <img src={tutor.photo_url} alt="" className="h-24 w-24 shrink-0 rounded-md object-cover" />
              : <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-md bg-accent/10 font-brand font-semibold text-d3 text-accent">{initials(tutor.display_name)}</span>}

            <div className="min-w-0 flex-1">
              <h1 className="font-brand font-semibold text-ink text-d3">{tutor.display_name}</h1>
              {tutor.headline && <p className="mt-2 text-t3 text-muted">{tutor.headline}</p>}

              <div className="mt-4">
                <Stars rating={tutor.rating} count={tutor.reviewCount} size={14} />
              </div>

              {/* The hue codes the kind; the letters stay on ink so the line
                  clears AA at this size, the same trade k-badge makes. The
                  wording is the one the claims matrix permits: our team
                  interviews and approves, and we run no third-party check. */}
              <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink">
                <IconCheck size={14} className="text-good" />
                Interviewed and approved by our team
              </p>

              {(tutor.subjects || []).length > 0 && (
                <p className="mt-4 text-sm text-muted">{(tutor.subjects || []).join(' · ')}</p>
              )}
            </div>
          </div>
        </Reveal>
      </Section>

      {/* 2 · The bio, as prose. No card: it is one column of text. */}
      {tutor.bio && (
        <Section width="prose" space="tight">
          <Reveal>
            <h2 className="font-brand font-semibold text-ink text-t1">About</h2>
            <p className="mt-4 whitespace-pre-line text-body text-ink/80">{tutor.bio}</p>
          </Reveal>
        </Section>
      )}

      {/* 3 · Reviews: a hairline list, not a stack of cards. */}
      <Section width="prose" space="tight">
        <Reveal>
          <h2 className="font-brand font-semibold text-ink text-t1">
            Reviews{tutor.reviewCount ? <span className="font-opmono text-t2 text-muted tabular-nums"> {tutor.reviewCount}</span> : ''}
          </h2>
          <p className="mt-2 text-xs text-muted">
            Only students can review, and only after a completed session.
          </p>

          {reviews.length === 0 ? (
            <p className="mt-6 border-t border-border pt-6 text-sm text-muted">
              No reviews yet.
            </p>
          ) : (
            <ul className="mt-6">
              {reviews.map((r, i) => (
                <li key={i} className="border-t border-border py-5">
                  <div className="flex items-center justify-between gap-4">
                    <Stars rating={r.rating} size={13} />
                    <span className="font-opmono text-xs text-muted tabular-nums">{ago(r.created_at)}</span>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-ink/80">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      </Section>
    </>
  );
}
