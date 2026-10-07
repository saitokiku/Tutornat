'use client';

// /tutors/apply — the tutor job application. Public marketing copy + a form
// that requires sign-in to submit. Resume uploads go straight to the private
// `applications` storage bucket (folder-per-user RLS); the row is created via
// POST /api/tutoring/applications, which emails the admin. Applicants see
// their live status on this same page.
//
// One system (spec: docs/superpowers/specs/2026-08-22-one-system-rebuild.md):
// paper top to bottom, sizes and radii from the scale, the pay band rendered
// from TUTOR_PAY (claims-guarded, never retyped). The three reasons to teach
// here are a hairline list rather than three equal cards, so the pay figure
// reads as a figure and the section does not repeat the hero's shape. One
// column, one gutter: every band on this page starts where the h1 starts, and
// the held gate speaks the product's one held sentence (ui/HeldState) rather
// than a wording invented here.
//
// Behavior is unchanged: the five-status map, the locked fieldset while an
// application is in review, the required adult attestation (the API refuses
// without it), the direct-to-Supabase resume upload, and the re-apply path for
// a rejected application all work exactly as before. The form is built out of
// ui/Field so label association and the error channel come from the primitive.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Shell from '@/components/dn/Shell';
import Reveal, { RevealGroup } from '@/components/dn/Reveal';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Section from '@/components/ui/Section';
import Eyebrow from '@/components/ui/Eyebrow';
import Field from '@/components/ui/Field';
import Notice from '@/components/ui/Notice';
import HeldState from '@/components/ui/HeldState';
import { IconChevronRight } from '@/components/Icons';
import { supabase, cloudConfigured, authedFetch } from '@/lib/supabaseClient';
import { TUTOR_PAY, formatPrice as dollars } from '@/lib/server/clubPricing';

// Why teach here. The pay band is the lead, and it is the only figure on the
// page, so it is the only thing set in mono.
const PERKS = [
  {
    title: 'Flat hourly pay',
    figure: `${dollars(TUTOR_PAY.minCents)} to ${dollars(TUTOR_PAY.maxCents)} / hr`,
    body: 'Your rate is agreed at hiring and paid for every session you teach: Homework Hall, Subject Clinics, private sessions, and the weekly free community hour alike. Your hour is paid even when a family’s membership covered their seat. Fair pay is the policy, because cheap education should not require underpaid tutors.',
  },
  {
    title: 'Students arrive prepared',
    body: 'Every student brings their AI study history: weak spots and goals summarized before you meet, and Homework Hall students state what they’re stuck on when they book.',
  },
  {
    title: 'We handle the busywork',
    body: 'Scheduling, pricing, payments, video rooms, and reminders are built in. You teach; the schedule fills.',
  },
];

const STATUS_UI = {
  submitted: { tint: 'bg-accent/10 border-accent/25', label: 'Application received', note: 'Our team is reviewing it. We’ll email you with next steps.' },
  reviewing: { tint: 'bg-accent/10 border-accent/25', label: 'Under review', note: 'A Kaizen reviewer is looking at your application now.' },
  interview: { tint: 'bg-accent/10 border-accent/25', label: 'Interview stage', note: 'Nice, we’d like to talk. Watch your inbox for a scheduling link.' },
  approved: { tint: 'bg-good/10 border-good/30', label: 'Approved', note: 'Welcome aboard. Set your availability in your tutor workspace to start taking sessions.' },
  rejected: { tint: 'bg-panel2 border-border', label: 'Not moving forward right now', note: 'Thank you for applying. We keep applications on file and welcome you to try again as we grow.' },
};

export default function TutorApply() {
  const [authed, setAuthed] = useState(null);
  const [existing, setExisting] = useState(null);
  const [form, setForm] = useState({
    full_name: '', phone: '', subjects: '', education: '', experience_years: '',
    cover_note: '', availability_note: '',
  });
  const [resume, setResume] = useState(null);
  // Required. The API rejects a submission without it, so the form must ask
  // rather than let someone fill in eight fields and be refused at the end.
  const [adultAttested, setAdultAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      if (!cloudConfigured) { setAuthed(false); return; }
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.user) { setAuthed(false); return; }
      setAuthed(true);
      const res = await authedFetch('/api/tutoring/applications');
      if (res.ok) {
        const d = await res.json();
        if (d.application) {
          setExisting(d.application);
          setForm((f) => ({
            ...f,
            full_name: d.application.full_name || '',
            phone: d.application.phone || '',
            subjects: (d.application.subjects || []).join(', '),
            education: d.application.education || '',
            experience_years: d.application.experience_years ?? '',
            cover_note: d.application.cover_note || '',
            availability_note: d.application.availability_note || '',
          }));
        }
      }
    })();
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setMsg('');
    if (!form.full_name.trim()) { setMsg('Please add your name.'); return; }
    const subjects = form.subjects.split(',').map((s) => s.trim()).filter(Boolean);
    if (subjects.length === 0) { setMsg('List at least one subject you can teach.'); return; }
    setBusy(true);
    try {
      let resume_path = existing?.resume_path || null;
      if (resume) {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess?.session?.user?.id;
        const safe = resume.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
        const path = `${uid}/${Date.now()}_${safe}`;
        const up = await supabase.storage.from('applications').upload(path, resume, { upsert: true });
        if (up.error) { setMsg(`Resume upload failed: ${up.error.message}`); setBusy(false); return; }
        resume_path = path;
      }
      const res = await authedFetch('/api/tutoring/applications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          subjects,
          education: form.education.trim(),
          experience_years: form.experience_years === '' ? null : Number(form.experience_years),
          cover_note: form.cover_note.trim(),
          availability_note: form.availability_note.trim(),
          resume_path,
          adultAttested,
        }),
      });
      const d = await res.json().catch(() => ({}));
      setBusy(false);
      if (!res.ok) { setMsg(d.error || 'Could not submit. Try again.'); return; }
      setExisting(d.application);
      setResume(null);
      setMsg('');
    } catch (e) {
      setBusy(false);
      setMsg(e.message || 'Something went wrong.');
    }
  }

  const status = existing ? STATUS_UI[existing.status] : null;
  const canEditForm = !existing || ['submitted', 'reviewing'].includes(existing.status);

  return (
    <Shell active="" tone="day">
      {/* 1 · Hero. */}
      <Section width="wide" lead>
        <RevealGroup className="max-w-prose">
          <Eyebrow>Join the team</Eyebrow>
          <h1 className="mt-4 font-brand font-semibold text-ink text-d3 sm:text-d2">
            Teach with Kaizen.
          </h1>
          <p className="mt-6 text-t3 text-muted max-w-[46ch]">
            We’re hiring a small bench of tutors who love teaching. A person on our team reads
            every application.
          </p>
          {/* One solid primary per page, and it belongs to the form itself,
              not to a link that scrolls to it. /tutors makes the same trade. */}
          <div className="mt-9">
            <a
              href="#apply"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-ink transition-colors"
            >
              Start your application
              <IconChevronRight size={15} />
            </a>
          </div>
        </RevealGroup>
      </Section>

      {/* 2 · Three reasons, as a list a person reads down. */}
      <Section width="wide" space="tight">
        <Reveal>
          <ul>
            {PERKS.map((p) => (
              <li key={p.title} className="grid grid-cols-1 gap-3 border-t border-border py-7 md:grid-cols-12 md:gap-8">
                <div className="md:col-span-5">
                  <h2 className="font-brand font-semibold text-ink text-t2">{p.title}</h2>
                  {p.figure && (
                    <p className="mt-2 font-opmono text-t3 text-ink tabular-nums">{p.figure}</p>
                  )}
                </div>
                <p className="text-sm text-muted md:col-span-7">{p.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      {/* 3 · Where you stand, when there is something to stand on. The measure
          is the same reading column as everywhere else, but it is set inside the
          wide grid rather than centered in its own, so the application starts at
          the page gutter the eyebrow, the h1 and the perks list already share
          instead of floating out of the page's own column. */}
      <Section width="wide" space="tight" id="apply" className="scroll-mt-20">
        <div className="max-w-prose">
          {status && (
            <Reveal className="mb-8">
              <div className={`rounded-md border px-5 py-4 ${status.tint}`}>
                <p className="text-t3 font-semibold text-ink">{status.label}</p>
                <p className="mt-1 text-sm text-muted">{status.note}</p>
                {existing.status === 'approved' && (
                  <Link
                    href="/tutor"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline"
                  >
                    Go to your tutor workspace
                    <IconChevronRight size={15} />
                  </Link>
                )}
              </div>
            </Reveal>
          )}

          {/* 4 · The application itself. */}
          {authed === false ? (
            <Reveal>
              <Card variant="raised" pad="lg">
                <h2 className="font-brand font-semibold text-ink text-t1">Sign in to apply</h2>
                {/* Two different reasons the form is not here, and only one of
                    them is the held condition. When accounts are held this says
                    it in the product's one sentence, the same one /billing,
                    /settings, /family and the sign-in screen use, instead of
                    inventing a fourth wording for the same fact. When accounts
                    work, the reader just needs the way in. */}
                {cloudConfigured ? (
                  <p className="mt-2 text-sm text-muted max-w-[52ch]">
                    Create a free Kaizen account (or sign in) on the dashboard, then come back here
                    to submit your application.
                  </p>
                ) : (
                  <HeldState kind="accounts" className="mt-4" />
                )}
                {/* Same rule as /settings: when accounts are held, the note
                    above says so, and a solid pill under it would promise a
                    door that is shut. */}
                {cloudConfigured ? (
                  <Button href="/dashboard" className="mt-6">
                    Sign in or sign up
                    <IconChevronRight size={15} />
                  </Button>
                ) : (
                  <p className="mt-4 text-sm text-muted">
                    We will open applications with the club. Nothing you write here is lost.
                  </p>
                )}
              </Card>
            </Reveal>
          ) : authed === null ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            <Reveal>
              <Card variant="raised" pad="lg">
                <h2 className="font-brand font-semibold text-ink text-t1">
                  {existing ? 'Update your application' : 'Your application'}
                </h2>
                {!canEditForm && existing.status !== 'rejected' && (
                  <p className="mt-2 text-sm text-muted">
                    Your application is being processed. Details are locked while we review.
                  </p>
                )}

                <fieldset disabled={!canEditForm} className="mt-6 space-y-4 disabled:opacity-60">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Full name (required)" value={form.full_name} onChange={set('full_name')} placeholder="Jamie Rivera" />
                    <Field label="Phone" value={form.phone} onChange={set('phone')} placeholder="Optional" />
                  </div>

                  <Field
                    label="Subjects you teach (required)"
                    hint="Comma-separated, for example: Algebra II, AP Biology, SAT Math"
                    value={form.subjects}
                    onChange={set('subjects')}
                    placeholder="Algebra II, Calculus, Physics"
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Education" value={form.education} onChange={set('education')} placeholder="B.S. Mathematics, UCLA" />
                    <Field label="Years tutoring" type="number" min="0" value={form.experience_years} onChange={set('experience_years')} placeholder="3" />
                  </div>

                  <Field
                    label="Why do you want to tutor with Kaizen?"
                    as="textarea"
                    rows={4}
                    value={form.cover_note}
                    onChange={set('cover_note')}
                    placeholder="Tell us about your teaching style and what you love about it."
                    className="[&_textarea]:resize-none"
                  />

                  <Field
                    label="General availability"
                    value={form.availability_note}
                    onChange={set('availability_note')}
                    placeholder="Weekday evenings, weekend mornings"
                  />

                  <Field
                    label="Resume or CV"
                    hint={existing?.resume_path ? 'A resume is already on file. Upload a new one to replace it.' : 'PDF or Word, up to 10MB (optional).'}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf"
                    onChange={(e) => setResume(e.target.files?.[0] || null)}
                    controlClassName="cursor-pointer text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-panel2 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
                  />
                </fieldset>

                {/* Tutors work unsupervised on video with minors. This is a
                    minors-facing-role requirement, not a payments one, which is why it
                    sits with the application rather than with payout onboarding. */}
                <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-sm border border-border bg-panel2 p-4">
                  <input
                    type="checkbox"
                    checked={adultAttested}
                    onChange={(e) => setAdultAttested(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-accent"
                  />
                  <span className="text-sm text-ink">
                    I confirm I am <strong className="font-semibold">18 years or older</strong>.
                    <span className="mt-1 block text-xs text-muted">
                      Kaizen students include minors, so every tutor works with under-18s. We verify
                      this during review.
                    </span>
                  </span>
                </label>

                {msg && <Notice kind="bad" className="mt-4">{msg}</Notice>}

                {(canEditForm || existing?.status === 'rejected') && (
                  <Button onClick={submit} disabled={busy || !adultAttested} size="lg" block className="mt-6">
                    {busy ? 'Submitting…' : existing ? 'Update application' : 'Submit application'}
                  </Button>
                )}
              </Card>
            </Reveal>
          )}
        </div>
      </Section>
    </Shell>
  );
}
